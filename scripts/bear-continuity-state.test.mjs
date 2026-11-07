import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace,reduceWorkspace,serializeWorkspace,APPS} from '../assets/js/space/state.mjs';
const screen={width:1280,height:800};
const quote={id:'e1',text:'Saved source',url:'/zh/a/',title:'Source title',anchor:'part',createdAt:'2026-11-07T00:00:00Z'};
test('state snapshots and reload preserve structured quotes and private recovery copies',()=>{
 const input={version:1,windows:[{id:'browser:one',app:'browser',payload:'https://example.org/'}],active:'browser:one',note:'current',draft:'',favorites:[],excerpts:[quote],recoveries:[{id:'r1',note:'previous',draft:'draft',at:'2026-11-07T00:00:00Z',reason:'before-restore'}]};
 const state=createWorkspace(input,screen);assert.equal(state.excerpts?.[0]?.text,'Saved source');assert.equal(state.recoveries?.[0]?.note,'previous');const restored=createWorkspace(serializeWorkspace(state),screen);assert.equal(restored.excerpts[0].anchor,'part');assert.equal(restored.recoveries[0].draft,'draft');assert.equal(restored.windows[0].payload,'https://example.org/');
});
test('a valid bounded workspace above the former character cutoff reloads without data loss',()=>{
 const input={...createWorkspace(null,screen),note:'n'.repeat(40000),excerpts:Array.from({length:80},(_,i)=>({...quote,id:'e'+i,text:String(i).padStart(3,'0')+'q'.repeat(1197)})),recoveries:Array.from({length:3},(_,i)=>({id:'r'+i,note:'r'.repeat(40000),draft:'',at:'2026-11-07T00:00:00Z',reason:'before-restore'}))};
 const raw=JSON.stringify(input);assert.ok(raw.length>200000);const restored=createWorkspace(raw,screen);assert.equal(restored.note.length,40000);assert.equal(restored.excerpts?.length,80);assert.equal(restored.recoveries?.length,3);
});
test('excerpt commands preserve the original note and never mutate prior state',()=>{
 const original={...createWorkspace(null,screen),note:'Private original'};const next=reduceWorkspace(original,{type:'excerpts',items:[quote]},screen);assert.equal(next.excerpts?.[0]?.text,'Saved source');assert.equal(next.note,'Private original');assert.deepEqual(original.excerpts,[]);
 const removed=reduceWorkspace(next,{type:'excerpts',items:[]},screen);assert.deepEqual(removed.excerpts,[]);assert.equal(removed.note,'Private original');
});
test('explicit Video is registered without changing the existing browser payload model',()=>{
 assert.ok(APPS.includes('video'));const state=reduceWorkspace(createWorkspace(null,screen),{type:'open',app:'video',payload:'https://www.youtube.com/watch?v=abcdefghijk'},screen);assert.equal(state.windows[0].app,'video');assert.equal(state.windows[0].payload,'https://www.youtube.com/watch?v=abcdefghijk');
});
