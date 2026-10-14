import test from 'node:test';
import assert from 'node:assert/strict';
import { stepWalk, travelPose, screenFit, WORLD_COLLIDERS } from '../assets/js/space/world-state.mjs';
test('walking follows the view direction and diagonal walking has the same speed', () => {
  const start={x:0,z:4};
  const straight=stepWalk(start,0,{forward:1,right:0},.04,[]);
  const diagonal=stepWalk(start,0,{forward:1,right:1},.04,[]);
  assert.ok(straight.z<start.z);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z-4)-Math.abs(straight.z-4))<1e-8);
  assert.ok(stepWalk(start,-Math.PI/2,{forward:1},.04,[]).x>0);
});
test('walking stops at furniture and slides along it without entering the table', () => {
  const table=[{minX:1,maxX:3,minZ:1,maxZ:3}];
  const p=stepWalk({x:.7,z:2},0,{right:1,forward:1},1,table);
  assert.ok(p.x<=.78); assert.ok(p.z<2);
});
test('a resumed frame cannot teleport the visitor through a wall', () => {
  const start={x:0,z:4};
  const next=stepWalk(start,0,{forward:1},100,[]);
  assert.ok(Math.hypot(next.x,next.z-4)<.2);
  assert.ok(WORLD_COLLIDERS.length>3);
});
test('camera travel reaches its exact destination with no invalid positions', () => {
  const a={x:0,y:1.6,z:8,yaw:Math.PI-.1,pitch:0,fov:54};
  const b={x:3,y:2,z:4,yaw:-Math.PI+.1,pitch:.1,fov:38};
  assert.deepEqual(travelPose(a,b,0),a); assert.deepEqual(travelPose(a,b,1),b);
  const midway=travelPose(a,b,.5);
  assert.ok(Math.abs(midway.yaw-a.yaw)<.2,'travel uses the short rotation around the room');
  assert.ok(Object.values(midway).every(Number.isFinite));
});
test('the floating workspace fits narrow and wide cameras without changing private window coordinates', () => {
  for(const size of [{width:1440,height:900},{width:390,height:844}]) {
    const fit=screenFit(size);
    assert.ok(fit.distance>0 && fit.scale>0);
    assert.ok(fit.visibleFraction>.55 && fit.visibleFraction<.9);
  }
});
