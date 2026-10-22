import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

const helper=new URL('../assets/js/space/jiangnan-vista-coverage.mjs',import.meta.url);

test('a missing bottom-water ray samples the measured registered continuation',async()=>{
  assert.ok(existsSync(helper),'The bottom-water continuation projection is not implemented.');
  const {jiangnanVistaWaterSample}=await import(helper.href);
  const sample=jiangnanVistaWaterSample(.5,-.2);
  assert.ok(sample,'The captured lower-centre ray has real continuation image data.');
  assert.ok(Math.abs(sample.uv[0]-.5436448214065048)<1e-9);
  assert.ok(Math.abs(sample.uv[1]-.11512134587322749)<1e-9);
  assert.equal(sample.blend,1);
});

test('the original image, sky and side-bank rays never use the water extension',async()=>{
  const {jiangnanVistaWaterSample}=await import(helper.href);
  for(let x=0;x<=10;x++)for(let y=0;y<=10;y++)assert.equal(jiangnanVistaWaterSample(x/10,y/10),null);
  for(const [u,v]of [[.5,1.1],[-.1,.5],[1.06,.5]])assert.equal(jiangnanVistaWaterSample(u,v),null);
});

test('missing continuation pixels retain the original fallback',async()=>{
  const {jiangnanVistaWaterSample}=await import(helper.href);
  for(const [u,v]of [[1.06,-.1],[-.25,-.1],[.5,-.5]])assert.equal(jiangnanVistaWaterSample(u,v),null);
});

test('the bottom join and the continuation-image edge both fade without a step',async()=>{
  const {jiangnanVistaWaterSample}=await import(helper.href);
  const near=jiangnanVistaWaterSample(.5,-.0001),middle=jiangnanVistaWaterSample(.5,-.01),full=jiangnanVistaWaterSample(.5,-.02),edge=jiangnanVistaWaterSample(-.19,-.1);
  assert.ok(near&&near.blend>0&&near.blend<.001);
  assert.ok(middle&&middle.blend>near.blend&&middle.blend<1);
  assert.equal(full.blend,1);
  assert.ok(edge&&edge.blend>0&&edge.blend<1);
});

test('nonfinite or behind-projection coordinates are never sampled',async()=>{
  const {registeredJiangnanVistaUV,jiangnanVistaWaterSample}=await import(helper.href);
  for(const [u,v]of [[NaN,0],[Infinity,-.1],[.5,-Infinity],[20,-.1]]){
    assert.equal(registeredJiangnanVistaUV(u,v),null);
    assert.equal(jiangnanVistaWaterSample(u,v),null);
  }
});

test('registration follows measured bridge, quay and roof correspondences',async()=>{
  const {registeredJiangnanVistaUV}=await import(helper.href);
  const landmarks=[
    {source:[852.8981323242188,372.00762939453125],target:[842.6239013671875,382.9809875488281],tolerance:3},
    {source:[208.72625732421875,477.2979736328125],target:[391.1965637207031,458.9669189453125],tolerance:2.5},
    {source:[1606.3885498046875,282.5488586425781],target:[1423.5267333984375,317.5585021972656],tolerance:2.5}
  ];
  for(const point of landmarks){
    const uv=registeredJiangnanVistaUV(point.source[0]/2032,1-point.source[1]/774);
    assert.ok(Math.hypot(uv[0]*1774-point.target[0],(1-uv[1])*887-point.target[1])<point.tolerance);
  }
});

test('every offered sample stays inside real image data and the observed pure-water band',async()=>{
  const {jiangnanVistaWaterSample}=await import(helper.href);let offered=0;
  for(let x=-30;x<=130;x+=2)for(let y=1;y<=45;y++){
    const sample=jiangnanVistaWaterSample(x/100,-y/100);
    if(!sample)continue;offered++;
    assert.ok(sample.uv[0]>0&&sample.uv[0]<1&&sample.uv[1]>0&&sample.uv[1]<.30);
    assert.ok(sample.blend>0&&sample.blend<=1);
  }
  assert.ok(offered>500,'The measured lower-water extension remains useful.');
});
