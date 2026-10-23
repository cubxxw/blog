import test from 'node:test';
import assert from 'node:assert/strict';
import {crossfadeLoopBuffer} from '../assets/js/space/room-audio-loop.js';

function audio(channels,sampleRate=1){return {numberOfChannels:channels.length,length:channels[0].length,sampleRate,duration:channels[0].length/sampleRate,getChannelData:channel=>channels[channel]};}
const context={createBuffer(channels,length,sampleRate){return audio(Array.from({length:channels},()=>new Float32Array(length)),sampleRate);}};

test('the blended tail ends at the head sample immediately before the loop restart',()=>{
  const left=Float32Array.from({length:20},(_,i)=>i/20),right=Float32Array.from(left,value=>-value);
  const loop=crossfadeLoopBuffer(context,audio([left,right]),4);
  assert.equal(loop.length,16);assert.equal(loop.duration,16);
  assert.equal(loop.getChannelData(0)[0],left[4]);assert.equal(loop.getChannelData(0)[15],left[3]);
  assert.equal(loop.getChannelData(1)[0],right[4]);assert.equal(loop.getChannelData(1)[15],right[3]);
  assert.ok(Math.abs(loop.getChannelData(0)[0]-loop.getChannelData(0)[15])<.051);
});

test('music removes only edge silence before blending so decoder padding cannot create a silent seam',()=>{
  const input=Float32Array.from([0,0,0,.2,.2,.2,.2,0,0,.2,.2,.2,.2,.2,.2,.2,0,0,0,0]);
  const loop=crossfadeLoopBuffer(context,audio([input]),2,{trimSilence:true});
  assert.equal(loop.length,11);assert.ok(loop.getChannelData(0)[0]>.19);assert.ok(loop.getChannelData(0).at(-1)>.19);
  assert.equal(loop.getChannelData(0)[2],0,'deliberate interior musical rests must remain');
  assert.equal(loop.getChannelData(0)[3],0);
});

test('an entirely quiet or very short buffer stays finite and playable',()=>{
  const silent=crossfadeLoopBuffer(context,audio([new Float32Array(4)]),8,{trimSilence:true});
  assert.ok(silent.length>=1);assert.ok([...silent.getChannelData(0)].every(Number.isFinite));
  const short=audio([Float32Array.from([.1])]);assert.equal(crossfadeLoopBuffer(context,short,8),short);
});
