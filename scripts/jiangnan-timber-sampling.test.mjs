import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTimberSampler} from '../assets/js/space/jiangnan-timber-sampling.mjs';
import {createReferenceTimberSampler} from '../tests/fixtures/jiangnan-timber-reference.mjs';

function pixels(sample,width,height,reference){
 const bytes=new Uint8ClampedArray(width*height*8),channel=n=>Math.round(Math.max(0,Math.min(255,n)));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const {tone,oil}=sample(x,y),p=(y*width+x)*8;
  if(reference){
   const expected=reference(x,y);
   if(!Object.is(tone,expected.tone)||!Object.is(oil,expected.oil))assert.fail(`sample differs at ${x},${y}`);
  }
  bytes[p]=channel(81+tone);bytes[p+1]=channel(71+tone*.83);bytes[p+2]=channel(55+tone*.62);bytes[p+3]=255;
  bytes[p+4]=bytes[p+5]=bytes[p+6]=channel(oil*255);bytes[p+7]=255;
 }
 return bytes;
}
// All five authored textures, plus a negative-seed boundary. Exact floating
// samples also protect every authored pigment, beyond the byte projection.
for(const [seed,worn]of [[8.4,true],[6.3,false],[9.4,false],[13.2,false],[4.7,false],[-.75,true]]){
 test(`all1024x512 color and roughness bytes preserve the original seed=${seed}, worn=${worn}`,()=>{
  const width=1024,height=512;
  assert.deepEqual(pixels(createTimberSampler(width,height,seed,worn),width,height,createReferenceTimberSampler(width,height,seed,worn)),pixels(createReferenceTimberSampler(width,height,seed,worn),width,height));
 });
}

for(const worn of [false,true])test(`column-only trig/exp work is bounded by width, worn=${worn}`,()=>{
 const calls={sin:0,exp:0},math=Object.create(Math);
 for(const name of Object.keys(calls))math[name]=value=>{calls[name]++;return Math[name](value);};
 const source=fs.readFileSync(new URL('../assets/js/space/jiangnan-timber-sampling.mjs',import.meta.url),'utf8');
 const create=vm.runInNewContext(source.replace('export function createTimberSampler','function createTimberSampler')+'\ncreateTimberSampler',{Math:math});
 const width=32,height=16,sample=create(width,height,8.4,worn);
 pixels(sample,width,height);
 assert.ok(calls.sin<=width*(worn?8:7)+width*height*(worn?12:8),`sin calls ${calls.sin}: column terms must not run for every row`);
 assert.ok(calls.exp<=width*2+width*height*(worn?6:2),`exp calls ${calls.exp}: the edge join is column-only`);
});
