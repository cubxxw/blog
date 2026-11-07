import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace} from '../assets/js/space/state.mjs';
const api=await import('../assets/js/space/workspace-storage.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} must be available`);return api[name](...args);};
const workspace=patch=>({...createWorkspace(null,{width:1280,height:800}),excerpts:[],recoveries:[],...patch});const memory=initial=>{let raw=initial;return {getItem:()=>raw,setItem:(_k,v)=>{raw=v;},raw:()=>raw,put:v=>{raw=v;}};};
const excerpt=(id,text)=>({id,text,url:'/zh/a/',title:'Public source',anchor:'',createdAt:''});
test('three-way merge keeps independent favorites and excerpts and does not resurrect a removed record',()=>{
 const base=workspace({favorites:['/a/'],excerpts:[excerpt('e','old')]});const local=workspace({favorites:['/a/','/b/'],excerpts:[]});const remote=workspace({favorites:['/a/','/c/'],excerpts:[excerpt('e','old'),excerpt('r','remote')]});
 const result=call('mergeWorkspaceChanges',{base,local,remote});assert.deepEqual(result.state.favorites,['/a/','/c/','/b/']);assert.deepEqual(result.state.excerpts.map(e=>e.text),['remote']);assert.deepEqual(result.conflicts,[]);
});
test('simultaneous private text edits retain both versions in bounded recovery records',()=>{
 const result=call('mergeWorkspaceChanges',{base:workspace({note:'before'}),local:workspace({note:'local note',draft:'local draft'}),remote:workspace({note:'remote note',draft:'remote draft'})});assert.equal(result.state.note,'local note');assert.ok(result.conflicts.includes('note'));assert.deepEqual(new Set(result.state.recoveries.map(r=>r.note)),new Set(['local note','remote note']));
});
test('independent excerpts with colliding imported IDs retain both selected texts',()=>{
 const result=call('mergeWorkspaceChanges',{base:workspace(),local:workspace({excerpts:[excerpt('same','local')]}),remote:workspace({excerpts:[excerpt('same','remote')]})});assert.deepEqual(new Set(result.state.excerpts.map(e=>e.text)),new Set(['local','remote']));assert.equal(new Set(result.state.excerpts.map(e=>e.id)).size,2);
});
test('store preserves malformed disk bytes and never reports a failed write as saved',()=>{
 const broken=memory('{broken');const store=call('createWorkspaceStore',{storage:broken});const state=store.load();const result=store.save({...state,note:'new'});assert.equal(result.saved,false);assert.equal(broken.raw(),'{broken');assert.equal(store.getStatus().state,'blocked');
 const silent={getItem:()=>null,setItem:()=>{}};const other=call('createWorkspaceStore',{storage:silent});other.load();assert.equal(other.save(workspace({note:'kept in memory'})).saved,false);
});
test('two loaded stores merge before writing and expose a truthful readback receipt',()=>{
 const storage=memory(null),a=call('createWorkspaceStore',{storage}),b=call('createWorkspaceStore',{storage});const av=a.load(),bv=b.load();assert.equal(a.save({...av,note:'first'}).saved,true);const result=b.save({...bv,draft:'second'});assert.equal(result.saved,true);assert.equal(result.state.note,'first');assert.equal(result.state.draft,'second');assert.equal(JSON.parse(storage.raw()).note,'first');
});
test('capacity conflicts refuse disk writes instead of dropping another tab data',()=>{
 const storage=memory(null),store=call('createWorkspaceStore',{storage});store.load();storage.put(JSON.stringify(workspace({favorites:Array.from({length:200},(_,i)=>'/r'+i+'/')})));const original=storage.raw();const result=store.save(workspace({favorites:Array.from({length:200},(_,i)=>'/l'+i+'/')}));assert.equal(result.saved,false);assert.ok(result.conflicts.includes('favorites-limit'));assert.equal(storage.raw(),original);
});
test('a fourth recovery refuses repeated saves and retains every older disk copy',()=>{
 const recoveries=Array.from({length:3},(_,i)=>({id:'older-'+i,note:'Unique older copy '+i,draft:'',at:'2026-11-07T00:00:00Z',reason:'conflict-remote'}));
 const storage=memory(JSON.stringify(workspace({note:'base',recoveries}))),store=call('createWorkspaceStore',{storage});
 const base=store.load(),local={...base,note:'This tab edit'};
 storage.put(JSON.stringify({...base,note:'Other tab edit'}));const original=storage.raw();
 for(let i=0;i<2;i++){
  const result=store.save(local);assert.equal(result.saved,false);assert.ok(result.conflicts.includes('recoveries-limit'));
  assert.equal(storage.raw(),original);assert.equal(result.state.note,'This tab edit');
  assert.deepEqual(result.state.recoveries.map(r=>r.id),recoveries.map(r=>r.id));
 }
});
test('an older over-capacity stored payload is preserved raw instead of normalized and overwritten',()=>{
 const recoveries=Array.from({length:4},(_,i)=>({id:'older-'+i,note:'Unique older copy '+i,draft:'',at:'2026-11-07T00:00:00Z',reason:'before-restore'}));
 const storage=memory(JSON.stringify(workspace({note:'Original',recoveries}))),original=storage.raw(),store=call('createWorkspaceStore',{storage});
 const state=store.load();assert.equal(store.getStatus().state,'blocked');
 assert.equal(store.getStatus().raw,original);assert.equal(store.save({...state,note:'New writing'}).saved,false);
 assert.equal(storage.raw(),original);
});
