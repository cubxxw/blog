import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace,serializeWorkspace} from '../assets/js/space/state.mjs';
import {createWorkspaceStore} from '../assets/js/space/workspace-storage.mjs';
const api=await import('../assets/js/space/workspace-restore.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const screen={width:1280,height:800};
function fixture(){let raw=null,refuse=false;const storage={getItem:()=>raw,setItem:(_k,v)=>{if(refuse)throw Error('quota');raw=v;}};const store=createWorkspaceStore({storage,viewport:screen});let state=store.load();state={...state,note:'Current note',draft:'Current draft',windows:[{id:'settings',app:'settings',payload:'',rect:{x:0,y:0,width:640,height:480}}],active:'settings'};store.save(state);return {store,getState:()=>state,setState:value=>{state=value;},raw:()=>raw,refuse:()=>{refuse=true;}};}
const commit=(args)=>{assert.equal(typeof api.commitWorkspaceRestore,'function');return api.commitWorkspaceRestore(args);};
test('restore keeps a before-copy and Settings without exposing the imported state before saved',()=>{
 const f=fixture(),old=f.getState();const next={...createWorkspace(null,screen),note:'Imported',draft:'',windows:[]};const result=commit({...f,next,expected:serializeWorkspace(old),viewport:screen,now:'2026-11-07T00:00:00Z'});assert.equal(result.saved,true);assert.equal(result.state.note,'Imported');assert.equal(result.state.active,'settings');assert.equal(result.state.recoveries.at(-1).note,'Current note');assert.equal(f.getState(),old,'the UI applies only an explicitly saved result');assert.equal(JSON.parse(f.raw()).note,'Imported');
});
test('new typing or a cancelled preview prevents a late restore write',()=>{
 const f=fixture(),expected=serializeWorkspace(f.getState());f.setState({...f.getState(),note:'New typing'});let raw=f.raw();assert.equal(commit({...f,next:createWorkspace(null,screen),expected,viewport:screen}).reason,'stale-restore');assert.equal(f.raw(),raw);assert.equal(commit({...f,next:createWorkspace(null,screen),expected:serializeWorkspace(f.getState()),viewport:screen,isCurrent:()=>false}).reason,'cancelled');assert.equal(f.raw(),raw);assert.equal(f.getState().note,'New typing');
});
test('quota failure retains the prior UI state and original stored bytes',()=>{
 const f=fixture(),old=f.getState(),raw=f.raw();f.refuse();const result=commit({...f,next:{...createWorkspace(null,screen),note:'Import'},expected:serializeWorkspace(old),viewport:screen});assert.equal(result.saved,false);assert.equal(f.getState(),old);assert.equal(f.raw(),raw);
});
