import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../assets/js/space/video-position.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
function memory(){let raw=null;return {getItem:()=>raw,setItem:(_k,v)=>{raw=v;},raw:()=>raw,put:v=>{raw=v;}};}
const store=(storage)=>{assert.equal(typeof api.createVideoPositionStore,'function');return api.createVideoPositionStore({storage});};
test('only bounded observed positions for a strict video identity survive local readback',()=>{const data=memory(),s=store(data);assert.equal(s.get('abcdefghijk'),null);assert.equal(s.set('abcdefghijk',62.8),true);assert.equal(store(data).get('abcdefghijk'),62);assert.equal(s.set('bad',20),false);assert.equal(s.set('abcdefghijk',21601),false);assert.equal(s.set('abcdefghijk',-1),false);assert.equal(s.get('abcdefghijk'),62);});
test('malformed and refused position storage cannot claim progress was saved',()=>{const data=memory();data.put('{broken');const s=store(data);assert.equal(s.get('abcdefghijk'),null);const raw=data.raw();assert.equal(s.set('abcdefghijk',10),false);assert.equal(data.raw(),raw);const silent={getItem:()=>null,setItem:()=>{}};assert.equal(store(silent).set('abcdefghijk',30),false);});
