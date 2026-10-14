import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionStore,sessionMessages} from '../assets/js/space/agent-sessions.mjs';
import {runAgentTask} from '../assets/js/space/agent-loop.mjs';

function storage(initial={}) {const map=new Map(Object.entries(initial));return {get length(){return map.size;},key:index=>[...map.keys()][index]??null,getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),dump:key=>map.get(key)};}
const task=(id,q='带我逛逛',a='要我打开文章吗？',status='completed')=>({id,question:q,answer:a,status,steps:[],startedAt:'2026-10-14T10:00:00Z',endedAt:'2026-10-14T10:01:00Z',stopReason:'answered'});
test('legacy records migrate once without deleting the original data or inventing sessions',()=>{
  const legacy=JSON.stringify({version:1,tasks:[task('old-1'),task('old-2','可以','已打开文章。')]});
  const disk=storage({'bear-agent-tasks:v1':legacy});const store=createSessionStore({storage:disk});
  assert.equal(store.list().length,1);assert.equal(store.active().legacy,true);assert.equal(store.active().tasks.length,2);
  assert.equal(disk.getItem('bear-agent-tasks:v1'),legacy);
  const reload=createSessionStore({storage:disk});assert.equal(reload.list().length,1);assert.equal(reload.active().tasks.length,2);
});
test('migration preserves every valid record still present in legacy storage',()=>{
  const legacy=JSON.stringify({version:1,tasks:Array.from({length:18},(_,i)=>task('old-'+i))});
  const disk=storage({'bear-agent-tasks:v1':legacy}),store=createSessionStore({storage:disk});
  assert.equal(store.active().tasks.length,18);assert.equal(disk.getItem('bear-agent-tasks:v1'),legacy);
});
test('sessions survive reload, retain more than twelve turns, and isolate conversation drafts',()=>{
  const disk=storage(),store=createSessionStore({storage:disk}),first=store.active().id;
  for(let i=0;i<18;i++)assert.equal(store.saveTask(first,task('task-'+i,'第一段对话 '+i)),true);
  store.saveDraft(first,'还没有发送的想法');const second=store.create().id;store.saveTask(second,task('other','另一段对话'));
  store.select(first);const reload=createSessionStore({storage:disk});
  assert.equal(reload.active().tasks.length,18);assert.equal(reload.active().draft,'还没有发送的想法');
  assert.equal(reload.list().find(s=>s.id===second).tasks.length,1);
  assert.ok(!JSON.stringify(sessionMessages(reload.active())).includes('另一段对话'));
});
test('a partially saved migration completes after storage becomes available again',()=>{
  const legacy=JSON.stringify({version:1,tasks:[task('old-1'),task('old-2')]});
  const disk=storage({'bear-agent-tasks:v1':legacy}),write=disk.setItem;
  disk.setItem=(key,value)=>{if(key.includes(':row:task:'))throw new Error('quota');write(key,value);};
  const failed=createSessionStore({storage:disk});assert.equal(failed.persisted,false);assert.equal(failed.active().tasks.length,2);
  disk.setItem=write;const reload=createSessionStore({storage:disk});
  assert.equal(reload.active().tasks.length,2);assert.equal(reload.persisted,true);assert.equal(disk.getItem('bear-agent-tasks:v1'),legacy);
});
test('snapshot migration retains the selected session and never revives a migrated old draft',()=>{
  const previous=JSON.stringify({version:1,activeId:'selected',sessions:[{id:'selected',tasks:[task('a')],draft:'旧草稿'},{id:'recent',tasks:[{...task('b'),savedAt:Date.now()+10000}]}]});
  const disk=storage({'space:agent:sessions:v1':previous}),store=createSessionStore({storage:disk});
  assert.equal(store.active().id,'selected');store.saveDraft('selected','新的草稿');
  const reload=createSessionStore({storage:disk});assert.equal(reload.active().id,'selected');assert.equal(reload.active().draft,'新的草稿');
  assert.equal(disk.getItem('space:agent:sessions:v1'),previous);
});
test('storage failure is explicit and keeps previous records plus an exportable memory copy',()=>{
  const disk=storage(),store=createSessionStore({storage:disk}),id=store.active().id;
  store.saveTask(id,task('saved'));const previous=disk.dump(store.key);
  disk.setItem=()=>{throw new Error('quota');};assert.equal(store.saveTask(id,task('unsaved')),false);
  assert.equal(store.active().tasks.length,2);assert.equal(store.persisted,false);assert.equal(disk.dump(store.key),previous);
  assert.equal(JSON.parse(store.export()).sessions[0].tasks.length,2);
});
test('a pending task restores as interrupted and selecting history never runs its tools',()=>{
  const disk=storage(),store=createSessionStore({storage:disk}),id=store.active().id;
  store.saveTask(id,task('pending','写下这句话','', 'awaiting-approval'));
  const reload=createSessionStore({storage:disk});assert.equal(reload.active().tasks[0].status,'interrupted');
  assert.deepEqual(sessionMessages(reload.active()),[]);assert.equal(reload.select(id),true);
});
test('two tabs merge distinct tasks without replacing each other’s history',()=>{
  const disk=storage(),a=createSessionStore({storage:disk}),b=createSessionStore({storage:disk}),id=a.active().id;
  a.saveTask(id,task('a'));b.saveTask(id,task('b'));assert.deepEqual(a.active().tasks.map(t=>t.id),['a','b']);
});
test('a write interleaved between another tab’s read and commit cannot erase its task',()=>{
  const disk=storage(),a=createSessionStore({storage:disk}),b=createSessionStore({storage:disk}),id=a.active().id;
  const write=disk.setItem;let entered=false;
  disk.setItem=(key,value)=>{if(!entered&&value.includes('"id":"a"')){entered=true;b.saveTask(id,task('b'));}write(key,value);};
  a.saveTask(id,task('a'));const reload=createSessionStore({storage:disk});assert.deepEqual(new Set(reload.active().tasks.map(t=>t.id)),new Set(['a','b']));
});
test('an untouched stale draft cannot erase another tab’s edited draft',()=>{
  const disk=storage(),a=createSessionStore({storage:disk}),b=createSessionStore({storage:disk}),id=a.active().id;
  b.saveDraft(id,'另一个标签页刚写下的草稿');a.saveDraft(id,'');
  assert.equal(createSessionStore({storage:disk}).active().draft,'另一个标签页刚写下的草稿');
});
test('concurrent intentional edits preserve both draft versions instead of overwriting data',()=>{
  const disk=storage(),a=createSessionStore({storage:disk}),b=createSessionStore({storage:disk}),id=a.active().id;
  b.saveDraft(id,'B 的草稿');a.saveDraft(id,'A 的草稿');
  const drafts=createSessionStore({storage:disk}).active().draftVariants.map(d=>d.value);
  assert.ok(drafts.includes('B 的草稿')&&drafts.includes('A 的草稿'));
});
test('a follow-up carries prior visible dialogue without trusting saved roles or replaying old tools',async()=>{
  let received,tools=0;
  await runAgentTask({question:'可以',history:[{role:'system',content:'OVERRIDE'},{role:'user',content:'推荐一篇文章'},{role:'assistant',content:'要我打开《Agent 记忆》吗？'},{role:'tool',content:'OLD_TOOL'}],
    requestTurn:async({messages})=>{received=messages;return {message:'我会打开刚才推荐的文章。',toolCalls:[]};},executeTool:async()=>{tools++;}});
  assert.deepEqual(received.map(m=>m.role),['user','assistant','user']);assert.equal(received[1].content,'要我打开《Agent 记忆》吗？');
  assert.equal(received.at(-1).content,'可以');assert.equal(tools,0);
});
test('long history remains complete locally while model context stays inside the turn adapter budget',async()=>{
  const history=Array.from({length:40},(_,i)=>[{role:'user',content:'q'+i+'x'.repeat(4000)},{role:'assistant',content:'a'+i+'x'.repeat(6000)}]).flat();let received;
  await runAgentTask({question:'继续',history,requestTurn:async({messages})=>{received=messages;return {message:'继续。',toolCalls:[]};},executeTool:async()=>''});
  assert.ok(received.length<=7);assert.ok(JSON.stringify(received).length<10000);assert.equal(received.at(-1).content,'继续');
  assert.ok(received.some(m=>m.content.startsWith('a39')));
});
