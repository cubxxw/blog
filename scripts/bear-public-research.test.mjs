import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../assets/js/space/agent-loop.mjs';
import {createSessionStore,sessionMessages} from '../assets/js/space/agent-sessions.mjs';

const origin='https://blog.example.test';
const catalog={language:'en',articles:[{title:'Public memory article',url:'/en/posts/memory/',description:'Memory research',tags:['memory']}]};
const response=(overrides={})=>{
 const result={ok:true,status:200,url:origin+'/en/posts/memory/',headers:new Headers({'content-type':'text/html'}),text:async()=>'<p>Verified original passage.</p>',...overrides};
 if(!Object.hasOwn(overrides,'body'))result.body=new ReadableStream({async pull(controller){controller.enqueue(new TextEncoder().encode(await result.text()));controller.close();}});
 return result;
};
function setup(fetchImpl=async()=>response(),sourceCatalog=catalog){
 const calls=[],events=[];
 const execute=()=>assert.fail('research must not change the workspace');
 const tool=api.createToolExecutor({catalog:sourceCatalog,origin,execute,getState:execute,fetchImpl:(...args)=>{calls.push(args);return fetchImpl(...args);},policy:'public-research'});
 return {calls,events,tool,run:options=>{assert.equal(typeof api.runPublicResearchTask,'function');return api.runPublicResearchTask({question:'memory',catalog:sourceCatalog,origin,language:sourceCatalog.language,executeTool:tool,onEvent:e=>events.push(e),...options});}};
}
test('an explicit public task uses exactly search plus one verified read, without a model or workspace mutation',async()=>{
 const f=setup(),record=await f.run({requestTurn:()=>assert.fail('no model')});
 assert.equal(record.status,'completed');assert.equal(record.mode,'public-research');assert.equal(f.calls.length,1);
 assert.deepEqual(record.steps.map(s=>s.name),['search_writing','read_writing']);assert.ok(record.steps.every(s=>s.type==='tool'&&s.status==='ok'));
 assert.equal(f.events.some(e=>e.type==='model-request'),false);assert.match(record.answer,/original (?:text )?excerpt/i);assert.match(record.answer,/Verified original passage/);assert.match(record.answer,/\/en\/posts\/memory\//);
 assert.equal(f.calls[0][1].credentials,'omit');assert.equal(f.calls[0][1].redirect,'error');
});
test('no match is reported truthfully and executes no article read',async()=>{const f=setup(),record=await f.run({question:'not-in-catalog'});assert.equal(record.status,'completed');assert.equal(record.steps.length,1);assert.equal(f.calls.length,0);assert.match(record.answer,/no matching/i);});
test('read-only executor rejects mutations and every noncatalog, credential, query, fragment or disguised URL before fetch',async()=>{
 const f=setup();for(const name of ['append_note','open_app','sandbox_run','list_photos'])await assert.rejects(()=>f.tool(name,{text:'x',app:'notes',command:'x'}),/public|research|read.only/i);
 for(const url of ['/api/private/','//evil.test/en/posts/memory/','https://user:pass@blog.example.test/en/posts/memory/','https://blog.example.test:443/en/posts/memory/','https://evil.test/en/posts/memory/','/en/posts/memory/?token=x','/en/posts/memory/#part','/en/posts/%2e%2e/posts/memory/'])await assert.rejects(()=>f.tool('read_writing',{url}),/refused/i);
 assert.equal(f.calls.length,0);
});
test('failed reads retain partial catalog evidence without marking the task successful',async()=>{const f=setup(async()=>response({ok:false,status:404})),record=await f.run();assert.equal(record.status,'failed');assert.equal(record.steps.findLast(s=>s.type==='tool').status,'error');assert.match(record.answer,/Public memory article/);assert.doesNotMatch(record.answer,/Verified original passage/);});
test('a response without a readable byte stream fails before consuming an unbounded text body',async()=>{
 let unboundedReads=0;
 const f=setup(async()=>response({body:null,text:async()=>{unboundedReads++;return '<p>Unbounded body.</p>';}}));
 assert.equal((await f.run()).status,'failed');assert.equal(unboundedReads,0);
});
test('redirects, non-HTML and oversized public bodies cannot become successful source excerpts',async()=>{
 for(const bad of [response({redirected:true}),response({url:'https://evil.test/'}),response({headers:new Headers({'content-type':'application/json'})}),response({headers:new Headers({'content-length':'9999999'})}),response({text:async()=>'a'.repeat(524289)})]){
  const f=setup(async()=>bad),r=await f.run();assert.equal(r.status,'failed');assert.equal(r.steps.findLast(s=>s.type==='tool').status,'error');
 }
});
test('streaming reads stop and cancel at the byte cap instead of retaining an unbounded response',async()=>{
 let reads=0,cancels=0;const f=setup(async()=>response({body:{getReader:()=>({async read(){reads++;return {done:false,value:new Uint8Array(300000)};},async cancel(){cancels++;},releaseLock(){}})}}));
 const r=await f.run();assert.equal(r.status,'failed');assert.equal(reads,2);assert.equal(cancels,1);
});
test('abort and deadline fence ignored late network results and emit one terminal receipt',async()=>{
 for(const stop of ['abort','timeout']){
  let release;const f=setup(()=>new Promise(r=>{release=r;})),controller=new AbortController();
  const pending=f.run({signal:controller.signal,limits:{timeoutMs:200}});
  while(!release)await new Promise(r=>setImmediate(r));if(stop==='abort')controller.abort();
  const r=await pending;assert.equal(r.status,'interrupted');assert.equal(r.stopReason,stop==='abort'?'aborted':'timeout');const count=f.events.length;release(response());await new Promise(r=>setImmediate(r));assert.equal(f.events.length,count);assert.equal(f.events.filter(e=>e.type==='end').length,1);assert.equal(r.steps.at(-1).status,'interrupted');
 }
});
test('pre-abort, a one-tool budget and overlong questions cannot trigger an extra read',async()=>{
 const controller=new AbortController();controller.abort();let f=setup();assert.equal((await f.run({signal:controller.signal})).status,'interrupted');assert.equal(f.calls.length,0);
 f=setup();assert.equal((await f.run({limits:{maxToolCalls:1}})).status,'interrupted');assert.equal(f.calls.length,0);
 await assert.rejects(()=>f.run({question:'x'.repeat(201)}),/200/);
});
function storage(){const rows=new Map();return {get length(){return rows.size;},key:i=>[...rows.keys()][i]??null,getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};}
test('durable history preserves public mode and source result, never replays, and stays out of model continuation',async()=>{
 const f=setup(),record=await f.run(),data=storage(),sessions=createSessionStore({storage:data});assert.equal(sessions.saveTask(sessions.active().id,record),true);
 const restored=createSessionStore({storage:data}).active();assert.equal(restored.tasks[0].mode,'public-research');assert.equal(restored.tasks[0].answer,record.answer);assert.deepEqual(sessionMessages(restored),[]);assert.equal(f.calls.length,1);
});
test('silent storage refusal cannot be advertised as durable public history',async()=>{
 const data=storage(),sessions=createSessionStore({storage:data}),id=sessions.active().id;data.setItem=()=>{};
 const record=await setup().run();assert.equal(sessions.saveTask(id,record),false);assert.equal(sessions.persisted,false);
});
test('a source withdrawn while its read was pending cannot be quoted as a verified result',async()=>{
 const source=structuredClone(catalog);let release;const f=setup(()=>new Promise(r=>{release=r;}),source);const pending=f.run();while(!release)await new Promise(r=>setImmediate(r));source.articles=[];release(response());const r=await pending;assert.equal(r.status,'failed');assert.match(r.steps.findLast(s=>s.type==='error').message,/withdrawn/);assert.doesNotMatch(r.answer,/Verified original passage/);
});
test('the catalog and UTF-8 response budgets are hard limits',async()=>{
 const source={articles:[...Array.from({length:500},(_,i)=>({title:'Unrelated '+i,url:'/en/posts/item-'+i+'/',tags:[]})),catalog.articles[0]]};
 const f=setup(async()=>response(),source),r=await f.run();assert.equal(r.status,'completed');assert.equal(r.stopReason,'no-matches');assert.equal(f.calls.length,0);
 const oversized=setup(async()=>response({text:async()=>'字'.repeat(180000)}));assert.equal((await oversized.run()).status,'failed');
});
