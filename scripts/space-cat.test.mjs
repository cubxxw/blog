import test from 'node:test';
import assert from 'node:assert/strict';
import {CAT_PLACES,CAT_COLLIDERS,catPositionClear,catSegmentClear,createCatState,stepCat} from '../assets/js/space/cat-state.mjs';
import {createCatClock} from '../assets/js/space/cat-clock.mjs';

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

test('visible elapsed time keeps the same safe route at 60, 30, 5 and 0.7 paints per second',()=>{
  const samples=[];
  for(const hz of [60,30,5,.7]){
    const clock=createCatClock();let state=createCatState(),time=0;clock.advance(0,true,()=>{});
    while(time<6){const elapsed=Math.min(1/hz,6-time);time+=elapsed;clock.advance(elapsed,true,dt=>{const before=state;state=stepCat(state,dt);assert.ok(dt>0&&dt<=.04);assert.ok(catPositionClear(state.x,state.z));assert.ok(catSegmentClear(before,state));assert.ok(Math.hypot(state.x-before.x,state.z-before.z)<=.42*dt+1e-9);});}
    assert.equal(state.phase,'walk');assert.ok(state.z>2.65&&state.z<2.8);samples.push(state);
  }
  for(const state of samples){assert.equal(state.seed,samples[1].seed);assert.ok(Math.hypot(state.x-samples[1].x,state.z-samples[1].z)<.04);assert.ok(Math.abs(Math.atan2(Math.sin(state.yaw-samples[1].yaw),Math.cos(state.yaw-samples[1].yaw)))<.1);}
  for(const hz of [30,60]){let legacy=createCatState();for(let frame=0;frame<6*hz;frame++)legacy=stepCat(legacy,1/hz);assert.ok(Math.hypot(legacy.x-samples[hz===60?0:1].x,legacy.z-samples[hz===60?0:1].z)<1e-9,'normal short frames retain their original integration');}
});

test('a long active stall has finite work and cannot leave a catch-up debt for the next frame',()=>{
  const clock=createCatClock();let calls=0,seconds=0;clock.advance(0,true,()=>{});
  clock.advance(3600,true,dt=>{calls++;seconds+=dt;assert.ok(dt<=.04);});assert.ok(calls<=50);assert.ok(Math.abs(seconds-2)<1e-9);
  let next=0;clock.advance(.02,true,dt=>next+=dt);assert.ok(Math.abs(next-.02)<1e-9,'discarded stall time is never replayed later');
});

test('loading, inactive intervals and explicit lifecycle resets establish a fresh first active baseline',()=>{
  const clock=createCatClock();let state=createCatState();const step=dt=>state=stepCat(state,dt);
  clock.advance(120,false,step);clock.advance(120,true,step);assert.equal(state.remaining,3);clock.advance(.02,true,step);assert.ok(Math.abs(state.remaining-2.98)<1e-9);
  for(const seconds of [300,NaN,Infinity,-1]){const before=state;clock.advance(seconds,false,step);clock.advance(600,true,step);assert.equal(state,before);}
  clock.reset();const before=state;clock.advance(600,true,step);assert.equal(state,before);clock.advance(.02,true,step);assert.ok(Math.abs(state.remaining-2.96)<1e-9);
  for(const invalid of [NaN,Infinity,-1]){const before=state;clock.advance(invalid,true,step);clock.advance(600,true,step);assert.equal(state,before);}
});
