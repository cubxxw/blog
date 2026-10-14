import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {deepseekChat}=require('../netlify/lib/deepseek.js');
test('official DSH transport sends Messages blocks, streams text and tool calls, and strips reasoning',async t=>{
  let request;
  const server=http.createServer(async(req,res)=>{
    let body='';for await(const part of req)body+=part;
    request={url:req.url,body:JSON.parse(body)};
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    const events=[
      {type:'message_start',message:{id:'msg_test',type:'message',role:'assistant',model:'deepseek-flash',content:[],usage:{input_tokens:4,output_tokens:0}}},
      {type:'content_block_start',index:0,content_block:{type:'thinking',thinking:''}},
      {type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'PRIVATE_REASONING'}},
      {type:'content_block_stop',index:0},
      {type:'content_block_start',index:1,content_block:{type:'text',text:''}},
      {type:'content_block_delta',index:1,delta:{type:'text_delta',text:'Hello'}},
      {type:'content_block_stop',index:1},
      {type:'content_block_start',index:2,content_block:{type:'tool_use',id:'call_test',name:'search_writing',input:{}}},
      {type:'content_block_delta',index:2,delta:{type:'input_json_delta',partial_json:'{"query":"AI"}'}},
      {type:'content_block_stop',index:2},
      {type:'message_delta',delta:{stop_reason:'tool_use'},usage:{output_tokens:7}},
      {type:'message_stop'},
    ];
    for(const event of events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const env={DEEPSEEK_API_KEY:'test-only',DEEPSEEK_BASE_URL:`http://127.0.0.1:${server.address().port}`,DEEPSEEK_MODEL:'deepseek-flash'};
  const response=await deepseekChat({messages:[{role:'system',content:'Server authority'},{role:'user',content:'Find AI'}],tools:[{type:'function',function:{name:'search_writing',description:'Search',parameters:{type:'object',properties:{query:{type:'string'}}}}}],stream:true,max_tokens:100},{env});
  assert.equal(response.status,200);
  const wire=await response.text();
  assert.ok(wire.includes('Hello'));assert.ok(wire.includes('search_writing'));assert.ok(!wire.includes('PRIVATE_REASONING'));
  assert.match(request.url,/\/v1\/messages$/);assert.equal(request.body.model,'deepseek-flash');
  assert.equal(request.body.thinking.type,'disabled');assert.ok(JSON.stringify(request.body.system).includes('Server authority'));
  assert.equal(request.body.tools[0].name,'search_writing');
});
test('missing configuration reports a safe actionable cause',async()=>{
  const result=await deepseekChat({messages:[]},{env:{}});assert.equal(result.status,503);assert.equal((await result.json()).error,'ai-not-configured');
});
test('DSH provider errors retain rate, credit and credential causes without exposing details',async t=>{
  let status=429;
  const server=http.createServer((_req,res)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({type:'error',error:{type:'api_error',message:'SECRET_PROVIDER_DETAIL'}}));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const env={DEEPSEEK_API_KEY:'test-only',DEEPSEEK_BASE_URL:`http://127.0.0.1:${server.address().port}`};
  for(const [code,expected] of [[429,'ai-rate-limited'],[402,'ai-credit-exhausted'],[401,'ai-auth-failed']]){
    status=code;const response=await deepseekChat({messages:[{role:'user',content:'hi'}]},{env});
    const payload=await response.json();assert.equal(payload.error,expected);assert.ok(!JSON.stringify(payload).includes('SECRET'));
  }
});
test('native max_tokens termination is never reported as a successful answer',async t=>{
  const server=http.createServer((_req,res)=>{
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    for(const event of [
      {type:'message_start',message:{id:'truncated',type:'message',role:'assistant',model:'deepseek-flash',content:[],usage:{input_tokens:1,output_tokens:0}}},
      {type:'content_block_start',index:0,content_block:{type:'text',text:''}},
      {type:'content_block_delta',index:0,delta:{type:'text_delta',text:'Incomplete sentence'}},
      {type:'content_block_stop',index:0},
      {type:'message_delta',delta:{stop_reason:'max_tokens'},usage:{output_tokens:10}},
      {type:'message_stop'},
    ])res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const env={DEEPSEEK_API_KEY:'test-only',DEEPSEEK_BASE_URL:`http://127.0.0.1:${server.address().port}`};
  const input={messages:[{role:'user',content:'hi'}]};
  const response=await deepseekChat(input,{env});assert.equal(response.status,502);assert.equal((await response.json()).error,'ai-output-truncated');
  const streamed=await deepseekChat({...input,stream:true},{env});await assert.rejects(streamed.text(),/ai-output-truncated/);
});
