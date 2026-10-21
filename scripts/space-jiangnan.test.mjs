import test from 'node:test';
import assert from 'node:assert/strict';
import {JIANGNAN_BOUNDS,JIANGNAN_COLLIDERS,jiangnanWalk,jiangnanLook,JIANGNAN_TARGETS,jiangnanBoat,canJiangnanNavigate} from '../assets/js/space/jiangnan-state.mjs';

test('walking changes actual position, normalizes diagonal speed and stops at room walls',()=>{
  const start={x:0,y:1.55,z:1.7,yaw:0,pitch:0,fov:58};
  const a=jiangnanWalk(start,{forward:1},.04),b=jiangnanWalk(start,{forward:1,right:1},.04);
  assert.ok(a.z<start.z);assert.ok(Math.abs(Math.hypot(b.x-start.x,b.z-start.z)-Math.hypot(a.x-start.x,a.z-start.z))<1e-6);
  let p={...start,x:-.8};for(let i=0;i<300;i++)p=jiangnanWalk(p,{forward:1},.04);
  assert.ok(p.z>=JIANGNAN_BOUNDS.minZ);assert.ok(p.z<-1.6);assert.equal(p.y,1.55);
});
test('a visitor cannot walk through the desk or cabinetry and a long frame cannot tunnel',()=>{
  const box=JIANGNAN_COLLIDERS.find(b=>b.id==='desk');
  let p={x:1.9,y:1.55,z:.75,yaw:0,pitch:0,fov:58};
  for(let i=0;i<500;i++)p=jiangnanWalk(p,{forward:1},4);
  assert.ok(p.z>=box.maxZ+.17);assert.ok(p.x<JIANGNAN_BOUNDS.maxX);
  const out=jiangnanWalk({x:0,z:1.8,yaw:0},{forward:1},-1);assert.equal(out.z,1.8);
});
test('look poses point at physical screen/photo targets and the boat has continuous 3D motion',()=>{
  const p=jiangnanLook([-1.7,1.55,1.7],JIANGNAN_TARGETS.computer);
  assert.ok(p.yaw<0);assert.ok(p.pitch<0);assert.ok(Number.isFinite(p.fov));
  const a=jiangnanBoat(0),b=jiangnanBoat(1);assert.ok(b.x<a.x);assert.ok(Math.abs(b.y-a.y)<.08);assert.ok(a.z<-5);
});
test('quiet and reduced motion retain intentional navigation while dialogs and work pause input',()=>{
  assert.equal(canJiangnanNavigate({mode:'roam',visible:true,blocked:false,quiet:true,reduced:true}),true);
  for(const options of [{mode:'workspace',visible:true},{mode:'roam',visible:false},{mode:'roam',visible:true,blocked:true}])assert.equal(canJiangnanNavigate(options),false);
});
