import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoot,advanceBoot,bootRemaining} from '../assets/js/space/onboarding.mjs';

test('skip and elapsed presentation cannot declare an unrendered room ready',()=>{
  let s=createBoot(100);
  s=advanceBoot(s,'skip',1000);s=advanceBoot(s,'tick',6000);
  assert.equal(s.finished,false);assert.equal(s.ready,false);
  s=advanceBoot(s,'module',6001);s=advanceBoot(s,'room',6002);
  assert.equal(s.finished,false);s=advanceBoot(s,'frame',6003);
  assert.equal(s.finished,true);assert.equal(s.ready,true);
});
test('fresh presentation finishes only after real readiness and a short optional duration',()=>{
  let s=createBoot(0);s=advanceBoot(s,'module',50);s=advanceBoot(s,'room',100);s=advanceBoot(s,'frame',200);
  assert.equal(s.finished,false);assert.equal(bootRemaining(s,200),1200);
  s=advanceBoot(s,'tick',1400);assert.equal(s.finished,true);
  assert.equal(advanceBoot(s,'room',1500),s);
});
test('revisit and reduced motion have no artificial presentation delay',()=>{
  for(const options of [{seen:true},{reduced:true}]){
    let s=createBoot(0,options);s=advanceBoot(s,'frame',100);
    assert.equal(s.finished,true);assert.equal(bootRemaining(s,100),0);
  }
});
test('failure stays distinct from readiness and cannot be overwritten by late success',()=>{
  const failed=advanceBoot(createBoot(0),'failure',500);
  assert.equal(failed.failed,true);assert.equal(failed.ready,false);
  assert.equal(advanceBoot(failed,'frame',1000),failed);
});
