import test from 'node:test';
import assert from 'node:assert/strict';
import {CAT_PLACES,CAT_COLLIDERS,catPositionClear,createCatState,stepCat} from '../assets/js/space/cat-state.mjs';

test('every route clears café furniture and chair legs with the resident radius',()=>{
  for(const a of CAT_PLACES) {
    assert.ok(catPositionClear(a.x,a.z),a.name);
    for(const i of a.links) {
      const b=CAT_PLACES[i];
      for(let step=0;step<=100;step++) {
        const t=step/100;
        assert.ok(catPositionClear(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),`${a.name} → ${b.name} at ${t}`);
      }
    }
  }
});
test('the resident walks and rests without leaving the floor or crossing furniture',()=>{
  for(const seed of [1,79,314]) {
    let state=createCatState(seed),walked=false,rested=false;
    const places=new Set();
    for(let i=0;i<18000;i++) {
      const next=stepCat(state,1/30);
      assert.ok(catPositionClear(next.x,next.z));
      assert.ok(Math.hypot(next.x-state.x,next.z-state.z)<=.42/30+.001);
      assert.ok(Math.abs(next.yaw-state.yaw)<=2.4/30+.001);
      walked ||= next.speed>0;rested ||= next.phase==='rest';places.add(next.place);state=next;
    }
    assert.ok(walked&&rested);assert.ok(places.size>=4);
  }
});
test('quiet, reading and background pauses preserve the exact state and elapsed dwell',()=>{
  let state=createCatState();for(let i=0;i<200;i++)state=stepCat(state,.04);
  for(let i=0;i<100;i++)assert.equal(stepCat(state,60,{paused:true}),state);
  assert.equal(stepCat(state,NaN),state);assert.equal(stepCat(state,Infinity),state);
  const resumed=stepCat(state,3600);
  assert.ok(Math.hypot(resumed.x-state.x,resumed.z-state.z)<=.42*.04+.001);
});
test('a newly blocked route stops safely instead of teleporting through the obstacle',()=>{
  const state={...createCatState(),phase:'walk',goal:1,yaw:0};
  const obstacle={minX:state.x-.2,maxX:state.x+.2,minZ:state.z+.17,maxZ:state.z+.5};
  const next=stepCat(state,.04,{colliders:[...CAT_COLLIDERS,obstacle]});
  assert.equal(next.x,state.x);assert.equal(next.z,state.z);assert.equal(next.phase,'look');
});
