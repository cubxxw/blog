import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../assets/js/space/media-state.mjs';
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} must be available`);return api[name](...args);};
const photos=[{id:'first',region:'japan'},{id:'other',region:'china'}];
test('photo return carries verified identity and the original region through a canonical inert payload',()=>{
 const payload=call('photoContextPayload',photos,{selectedID:'first',region:'all'});assert.equal(payload,'photo-context:first:all');assert.deepEqual(call('parsePhotoContext',payload),{selectedID:'first',region:'all'});assert.deepEqual(api.photoState(photos,payload),{selectedID:'first',region:'all'});
 assert.equal(call('photoContextPayload',photos,{selectedID:'first',region:'china'}),'');assert.equal(call('photoContextPayload',photos,{selectedID:'missing',region:'all'}),'');
});
test('malformed context cannot fall through to an unrelated selected photo',()=>{
 for(const value of ['photo-context:%66irst:all','photo-context:first:all:extra','photo-context:%252f:all','photo-context:first:../japan']){assert.equal(call('parsePhotoContext',value),null);assert.deepEqual(api.photoState(photos,value,{selectedID:'other',region:'china'}),{region:'all',selectedID:null,contextUnavailable:true});}
});
test('late public album identity is retained as unavailable until the verified photo arrives',()=>{
 const id='immich:public:00000000-0000-4000-8000-000000000001',payload='photo-context:'+encodeURIComponent(id)+':all';const before=api.photoState([],payload);assert.equal(before.selectedID,id);assert.equal(before.contextUnavailable,true);assert.deepEqual(api.photoState([{id,region:'japan'}],payload),{selectedID:id,region:'all'});
 assert.deepEqual(api.photoState(photos,'region:japan'),{region:'japan',selectedID:null});assert.deepEqual(api.photoState(photos,'other'),{region:'all',selectedID:'other'});
});
