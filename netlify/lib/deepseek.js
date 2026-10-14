"use strict";

// Official DSH Messages adapter, projected onto the site's existing text/tool
// response protocol. No CLI profile, shell, file tools or private agent home.
const { randomUUID } = require('node:crypto');
let adapterModule;
const loadAdapter = () => adapterModule ||= import('@deepseek-ai/dsh-llm-deepseek');

function failure(error, signal) {
  const status = Number(error?.status || error?.failure?.status);
  const code = String(error?.code || '');
  if (code === 'MAX_TOKENS') return {status:502,error:'ai-output-truncated'};
  if (status === 429) return {status:429,error:'ai-rate-limited'};
  if (status === 402) return {status:402,error:'ai-credit-exhausted'};
  if (status === 401 || status === 403) return {status:503,error:'ai-auth-failed'};
  if (signal?.aborted || code === 'TIMEOUT' || code === 'ABORTED') return {status:504,error:'ai-timeout'};
  if (code === 'TRANSPORT') return {status:502,error:'ai-network-error'};
  return {status:502,error:'ai-unavailable'};
}

function messagesForDSH(messages) {
  return (messages || []).map((message,index)=>{
    const content=[];
    if (typeof message.content === 'string' && message.content) content.push({type:'text',text:message.content});
    for(const call of message.tool_calls || []) content.push({type:'tool-call',id:call.id,name:call.function?.name,arguments:call.function?.arguments || '{}'});
    const role=message.role;
    return {id:`web-${index}`,role,content,
      source:role==='system' ? {kind:'system-prompt'} : role==='tool' ? {kind:'tool',callId:message.tool_call_id} : role==='assistant' ? {kind:'model',provider:'deepseek',model:'deepseek-flash'} : {kind:'user'},
      ...(role==='tool' ? {toolCallId:message.tool_call_id} : {}),
    };
  });
}

async function deepseekChat(body, {env=process.env,signal}={}) {
  if (!env.DEEPSEEK_API_KEY) return Response.json({error:'ai-not-configured'},{status:503});
  const controller=new AbortController();
  const combined=signal ? AbortSignal.any([controller.signal,signal]) : controller.signal;
  const timer=setTimeout(()=>controller.abort(),60000);
  const clean=()=>{clearTimeout(timer);controller.abort();};
  let iterator;
  try {
    const {DeepSeekAdapter,resolveAdapterOptions}=await loadAdapter();
    const maxTokens=Math.max(1,Math.min(1800,Number(body.max_tokens || body.max_completion_tokens) || 1000));
    const connection=resolveAdapterOptions({baseURL:env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/anthropic',thinking:'disabled',reasoningEffort:'off',maxTokens,streamIdleTimeoutMs:20000});
    const requestId=randomUUID();
    const adapter=new DeepSeekAdapter({options:()=>connection,resolveAuth:async()=>({headers:{Authorization:`Bearer ${env.DEEPSEEK_API_KEY}`}}),resolveUserId:()=>requestId,prepareExtensions:async()=>({fields:{},accept:async()=>{}})});
    // The public service has one model. Browser input cannot choose a route.
    iterator=adapter.stream({provider:'deepseek',model:'deepseek-flash',reasoningEffort:'off',messages:messagesForDSH(body.messages),tools:(body.tools || []).map(tool=>tool.function || tool),maxTokens,signal:combined})[Symbol.asyncIterator]();
    const calls=new Map();let outputChars=0,finished=false;
    async function nextDelta() {
      while(true){
        const {done,value}=await iterator.next();
        if(done){if(!finished)throw Error('Incomplete model response');return null;}
        if(value.type==='finish'){
          if(value.reason?.kind==='max-tokens')throw Object.assign(new Error('Incomplete answer'),{code:'MAX_TOKENS'});
          finished=true;continue;
        }
        if(value.type==='text-delta'){
          outputChars+=value.text.length;if(outputChars>30000)throw Error('Output limit');
          return {content:value.text};
        }
        if(value.type==='tool-call-delta'){
          if(!calls.has(value.index)) {if(calls.size>=8)throw Error('Tool limit');calls.set(value.index,{index:calls.size,id:value.id,name:'',arguments:''});}
          const call=calls.get(value.index);if(value.name)call.name=value.name;
          call.arguments+=value.argumentsDelta || '';if(call.arguments.length>8000)throw Error('Arguments limit');
          return {tool_calls:[{index:call.index,id:call.id,type:'function',function:{...(value.name ? {name:value.name} : {}),arguments:value.argumentsDelta || ''}}]};
        }
        // Thinking/replay signatures never leave the server.
      }
    }
    if(!body.stream){
      let text='';while(true){const delta=await nextDelta();if(!delta)break;text+=delta.content || '';}
      clean();return Response.json({choices:[{message:{role:'assistant',content:text,...(calls.size ? {tool_calls:[...calls.values()].map(call=>({id:call.id,type:'function',function:{name:call.name,arguments:call.arguments}}))} : {})}}]});
    }
    // Await first visible chunk before sending headers so initial provider
    // failures retain their HTTP status and actionable public error code.
    let first=await nextDelta();const encoder=new TextEncoder();
    const stream=new ReadableStream({
      async pull(output){
        try {
          const delta=first===undefined ? await nextDelta() : first;first=undefined;
          if(delta)output.enqueue(encoder.encode(`data: ${JSON.stringify({choices:[{delta}]})}\n\n`));
          else {output.enqueue(encoder.encode('data: [DONE]\n\n'));output.close();clean();}
        }catch(error){const cause=failure(error,combined);output.error(Object.assign(new Error(cause.error),{statusCode:cause.status}));clean();await iterator.return?.();}
      },
      async cancel(){clean();await iterator.return?.();},
    });
    return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});
  }catch(error){const cause=failure(error,combined);clean();await iterator?.return?.();return Response.json({error:cause.error},{status:cause.status});}
}

module.exports={deepseekChat,messagesForDSH,failure};
