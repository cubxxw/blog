import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticalLightRamp} from '../assets/js/space/jiangnan-practical-light.mjs';

test('the first off toggle starts from the registered real light and reaches zero smoothly', () => {
  const ramp=createPracticalLightRamp(); ramp.seed('table',2.3);
  assert.equal(ramp.set('table',0),2.3); assert.equal(ramp.pending,true);
  ramp.update(.06); const a=ramp.value('table'); assert.ok(a>0&&a<2.3);
  ramp.update(.06); assert.ok(ramp.value('table')<a&&ramp.value('table')>0);
  assert.equal(ramp.update(.12),true); assert.equal(ramp.value('table'),0); assert.equal(ramp.pending,false);
  assert.equal(ramp.update(.12),false);
});

test('rapid reversal continues from the displayed value, and repeating a target does not restart its clock', () => {
  const ramp=createPracticalLightRamp(); ramp.seed('shade',.47); ramp.set('shade',0); ramp.update(.1);
  const at=ramp.value('shade'); assert.equal(ramp.set('shade',.47),at);
  ramp.update(.08); const rising=ramp.value('shade'); assert.ok(rising>at&&rising<.47);
  ramp.set('shade',.47); ramp.update(.16); assert.equal(ramp.value('shade'),.47); assert.equal(ramp.pending,false);
});

test('quiet or reduced motion mid-ramp snaps every channel, including a zero-delta frame', () => {
  let still=false; const ramp=createPracticalLightRamp({still:()=>still});
  ramp.seed('pool',3); ramp.seed('shelf',.4); ramp.set('pool',0); ramp.set('shelf',0); ramp.update(.06);
  still=true; assert.equal(ramp.update(0),true); assert.equal(ramp.value('pool'),0); assert.equal(ramp.value('shelf'),0); assert.equal(ramp.pending,false);
  assert.equal(ramp.set('pool',3),3); assert.equal(ramp.pending,false);
});

test('a seed never replaces a displayed channel or accepts a non-finite intensity', () => {
  const ramp=createPracticalLightRamp(); ramp.seed('table',1); ramp.set('table',0); ramp.update(.06);
  const at=ramp.value('table'); ramp.seed('table',8); assert.equal(ramp.value('table'),at);
  ramp.set('table',NaN); assert.equal(ramp.value('table'),at); assert.equal(ramp.update(NaN),false);
  ramp.seed('invalid',Infinity); assert.equal(ramp.value('invalid'),0);
});
