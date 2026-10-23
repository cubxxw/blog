import test from 'node:test';
import assert from 'node:assert/strict';
import {JIANGNAN_COLLIDERS,JIANGNAN_TARGETS,jiangnanLook,jiangnanWalk} from '../assets/js/space/jiangnan-state.mjs';

test('the writing desk and working screen are centred beneath the main window',()=>{
 const desk=JIANGNAN_COLLIDERS.find(item=>item.id==='desk');
 assert.equal(JIANGNAN_TARGETS.computer[0],.8,'the live screen shares the window axis');
 assert.ok(Math.abs((desk.minX+desk.maxX)/2-.8)<1e-8,'the actual desk footprint shares that axis');
});
test('the working chair is close enough to the front edge, aligned and does not overlap it',()=>{
 const desk=JIANGNAN_COLLIDERS.find(item=>item.id==='desk'),chair=JIANGNAN_COLLIDERS.find(item=>item.id==='desk-chair');
 assert.ok(Math.abs((chair.minX+chair.maxX)/2-JIANGNAN_TARGETS.computer[0])<.02);
 const clearance=chair.minZ-desk.maxZ;
 assert.ok(clearance>.08&&clearance<.3,`chair-to-apron clearance ${clearance}`);
});
test('the old reading-chair position is walkable, while the cat bed remains protected',()=>{
 let pose=jiangnanLook([-.75,1.4,.3],[-.75,1.4,-2]);
 for(let i=0;i<80;i++)pose=jiangnanWalk(pose,{forward:1},.04);
 assert.ok(pose.z<-.8,'removing the reading chair must open its circulation space');
 pose=jiangnanLook([-1.45,1.4,.3],[-1.45,1.4,-2]);
 for(let i=0;i<80;i++)pose=jiangnanWalk(pose,{forward:1},.04);
 assert.ok(pose.z> -1.49,'the visitor must not walk through the cat bed');
});
