import test from 'node:test';
import assert from 'node:assert/strict';
import {createJiangnanCatState,requestJiangnanCat,stepJiangnanCat,jiangnanCatPositionClear} from '../assets/js/space/jiangnan-cat-state.mjs';

test('the resident starts asleep and remains in its warm nest',()=>{
  let state=createJiangnanCatState();assert.equal(state.phase,'sleep');
  const {x,z}=state;
  for(let i=0;i<1500;i++)state=stepJiangnanCat(state,.04);
  assert.equal(state.phase,'sleep');assert.equal(state.x,x);assert.equal(state.z,z);
});
test('a call wakes and stretches before approaching, then eventually returns to sleep',()=>{
  let state=createJiangnanCatState();const home={x:state.x,z:state.z};
  const reply=requestJiangnanCat(state,'call',{x:1.9,z:1.25,yaw:.5},{now:10});
  assert.equal(reply.result,'waking');state=reply.state;
  for(let i=0;i<20;i++)state=stepJiangnanCat(state,.04);
  assert.equal(state.x,home.x);assert.equal(state.z,home.z);
  let arrived=false;
  for(let i=0;i<13000;i++){
    state=stepJiangnanCat(state,.04);assert.ok(jiangnanCatPositionClear(state.x,state.z));
    arrived ||= state.interaction?.stage==='near';
    if(arrived&&state.phase==='sleep')break;
  }
  assert.ok(arrived);assert.equal(state.phase,'sleep');
  assert.ok(Math.hypot(state.x-home.x,state.z-home.z)<.04);
});

test('a new call during the trip home cannot reuse the old return path',()=>{
 let state=requestJiangnanCat(createJiangnanCatState(),'call',{x:-1,z:1.5,yaw:0},{now:10}).state;
 for(let i=0;i<10000&&!(state.returnHome&&state.homePath?.length);i++)state=stepJiangnanCat(state,.04);
 assert.ok(state.homePath?.length);
 for(let i=0;i<100;i++)state=stepJiangnanCat(state,.04);
 state=requestJiangnanCat(state,'call',{x:1.9,z:1.25,yaw:.5},{now:1000}).state;
 let arrived=false;
 for(let i=0;i<20000;i++){state=stepJiangnanCat(state,.04);arrived ||= state.interaction?.stage==='near';if(arrived&&state.phase==='sleep')break;}
 assert.ok(arrived);assert.equal(state.phase,'sleep');
 assert.ok(Math.hypot(state.x+1.45,state.z+1.93)<.04);
});

test('a still interaction interrupts a partially waking cat and responds to the new visitor',()=>{
 let state=requestJiangnanCat(createJiangnanCatState(),'call',{x:-1,z:1.5,yaw:0},{now:10}).state;
 const reply=requestJiangnanCat(state,'call',{x:1.9,z:1.25},{now:11,instant:true});
 assert.equal(reply.result,'noticed');assert.equal(reply.state.interaction.stage,'notice');
 assert.equal(reply.state.interaction.visitor.x,1.9);assert.equal(reply.state.speed,0);
});
