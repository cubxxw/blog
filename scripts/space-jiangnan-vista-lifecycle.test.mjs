import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import test from 'node:test';
const root=fileURLToPath(new URL('../',import.meta.url)),threeURL=pathToFileURL(path.join(root,'assets/js/vendor/three.module.min.js')).href,THREE=await import(threeURL),sourcePath=path.join(root,'assets/js/space/jiangnan-exterior.js');
globalThis.document={createElement(){return{width:0,height:0,getContext(){return new Proxy({createRadialGradient(){return{addColorStop(){}};}},{get:(o,k)=>o[k]||(()=>{})});}};}};
const source=fs.readFileSync(sourcePath,'utf8').replace("from 'three'",`from '${threeURL}'`).replace("from './jiangnan-state.mjs'",`from '${pathToFileURL(path.join(root,'assets/js/space/jiangnan-state.mjs')).href}'`).replace("from './jiangnan-vista-coverage.mjs'",`from '${pathToFileURL(path.join(root,'assets/js/space/jiangnan-vista-coverage.mjs')).href}'`);
const {buildJiangnanExterior}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function make(continuationAsset,synchronous,software=false,dayVistaAsset=null){let dead=false,wakes=0;const requests=[],resources=new Set(),textures=new Set(),original=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=function(url,load,p,error){const texture=new THREE.Texture(),r={url,load,error,texture,releases:0};texture.addEventListener('dispose',()=>r.releases++);requests.push(r);if(requests.length===2&&synchronous)r[synchronous](texture);return texture;};let result;try{result=buildJiangnanExterior({scene:new THREE.Scene(),pbr:{bind(){}},resources,textures,vistaAsset:'/original.webp',dayVistaAsset,continuationAsset,vistaMode:'image',software,wake(){wakes++;},isDisposed:()=>dead});}finally{THREE.TextureLoader.prototype.load=original;}return{result,resources,textures,requests,photo:requests[0],extra:requests[1],material:result.group.getObjectByName('photographic environment study').material,get wakes(){return wakes;},dispose(){dead=true;for(const r of resources)r.dispose?.();for(const t of textures)t.dispose();}};}
const original=make(null);original.photo.load(original.photo.texture);const primaryOwnership={resources:original.resources.size,textures:original.textures.size};original.dispose();
test('absent or blank optional URL adds no request or ownership',()=>{for(const value of [undefined,null,'','   ']){const b=make(value);try{assert.equal(b.requests.length,1);b.photo.load(b.photo.texture);assert.equal(b.result.vistaMode,'image');assert.equal(b.resources.size,primaryOwnership.resources);assert.equal(b.textures.size,primaryOwnership.textures);}finally{b.dispose();}}});
test('original photo establishes image mode before the optional request completes',()=>{const b=make(' /water.webp ');try{assert.equal(b.requests.length,2,'A supplied continuation URL must be requested independently.');assert.equal(b.extra.url,'/water.webp');b.photo.load(b.photo.texture);assert.equal(b.result.vistaMode,'image');assert.equal(b.material.uniforms.continuationReady.value,0);}finally{b.dispose();}});
test('failure retains original photo and releases the unfinished texture once',()=>{const b=make('/water.webp');try{assert.ok(b.extra,'The optional request is required for this failure case.');b.photo.load(b.photo.texture);b.extra.error();assert.equal(b.result.vistaMode,'image');assert.equal(b.material.uniforms.continuationReady.value,0);assert.equal(b.resources.size,primaryOwnership.resources);assert.equal(b.textures.size,primaryOwnership.textures);assert.equal(b.extra.releases,1);}finally{b.dispose();}assert.equal(b.extra.releases,1);});
test('success transfers one SRGB texture without making the unfinished primary ready',()=>{const b=make('/water.webp');try{assert.ok(b.extra,'The optional request is required for this success case.');b.extra.load(b.extra.texture);assert.equal(b.result.vistaMode,'loading');assert.equal(b.result.group.getObjectByName('photographic environment study').visible,false);b.photo.load(b.photo.texture);assert.equal(b.material.uniforms.continuationReady.value,1);assert.equal(b.material.uniforms.continuation.value,b.extra.texture);assert.equal(b.extra.texture.colorSpace,THREE.SRGBColorSpace);assert.equal(b.resources.size,primaryOwnership.resources);assert.equal(b.textures.size,primaryOwnership.textures+1);}finally{b.dispose();}assert.equal(b.extra.releases,1);});
for(const late of ['load','error'])test('early disposal and late '+late+' do not mutate or wake',()=>{const b=make('/water.webp');assert.ok(b.extra,'The optional request is required for this late callback case.');b.photo.load(b.photo.texture);b.dispose();assert.equal(b.extra.releases,1);const before=[b.resources.size,b.textures.size,b.wakes];b.extra[late](b.extra.texture);assert.deepEqual([b.resources.size,b.textures.size,b.wakes],before);assert.equal(b.material.uniforms.continuationReady.value,0);assert.equal(b.extra.releases,1);});
test('optional success does not overrule a failed primary photograph',()=>{const b=make('/water.webp');try{assert.ok(b.extra,'The optional request is required for this primary failure case.');b.photo.error();b.extra.load(b.extra.texture);assert.equal(b.result.vistaMode,'geometry-fallback');assert.equal(b.result.group.getObjectByName('photographic environment study').visible,false);}finally{b.dispose();}});
test('every successfully registered resource releases exactly once',()=>{const b=make('/water.webp');assert.ok(b.extra,'The optional request is required for ownership verification.');b.photo.load(b.photo.texture);b.extra.load(b.extra.texture);const counts=new Map();for(const o of [...b.resources,...b.textures]){counts.set(o,0);o.addEventListener('dispose',()=>counts.set(o,counts.get(o)+1));}b.dispose();assert.ok([...counts.values()].every(n=>n===1));});

for(const mode of ['load','error'])test('synchronous optional '+mode+' preserves primary readiness and exact ownership',()=>{const b=make('/water.webp',mode);try{assert.ok(b.extra);assert.equal(b.result.vistaMode,'loading');assert.equal(b.material.uniforms.continuationReady.value,mode==='load'?1:0);b.photo.load(b.photo.texture);assert.equal(b.result.vistaMode,'image');assert.equal(b.resources.size,primaryOwnership.resources);assert.equal(b.textures.size,primaryOwnership.textures+(mode==='load'?1:0));}finally{b.dispose();}assert.equal(b.extra.releases,1);});

test('the software budget retains the original single-texture vista without optional image work',()=>{const b=make('/water.webp',undefined,true);try{assert.equal(b.requests.length,1,'Software mode must not request the optional continuation.');b.photo.load(b.photo.texture);assert.equal(b.result.vistaMode,'image');assert.equal(b.textures.size,primaryOwnership.textures);assert.equal(b.material.fragmentShader.includes('jiangnanVistaWaterContinuation'),false,'Software must retain the lightweight primary shader.');}finally{b.dispose();}});

test('daylight removes physical rain and glass runnels, then nighttime restores them',()=>{
 const b=make(null,undefined,false,'/day.webp');try{
  b.photo.load(b.photo.texture);b.extra.load(b.extra.texture);
  b.result.update(0,{daylight:1,rain:0});
  assert.equal(b.material.uniforms.daylight.value,1);assert.equal(b.material.uniforms.dayReady.value,1);
  assert.equal(b.result.group.getObjectByName('outside heavy rainfall').visible,false);
  assert.equal(b.result.group.getObjectByName('rain beads and runnels on window').visible,false);
  b.result.update(1,{daylight:0,rain:1});
  assert.equal(b.result.group.getObjectByName('outside heavy rainfall').visible,true);
  assert.equal(b.result.group.getObjectByName('rain beads and runnels on window').visible,true);
 }finally{b.dispose();}
 assert.equal(b.extra.releases,1);
});
test('a late daytime texture releases after disposal without reviving the room',()=>{
 const b=make(null,undefined,false,'/day.webp');b.dispose();const wakes=b.wakes;b.extra.load(b.extra.texture);
 assert.equal(b.wakes,wakes);assert.equal(b.extra.releases,1);assert.equal(b.material.uniforms.dayReady.value,0);
});

test('the actual dome shader preserves every original front-window projection exactly',()=>{
 const b=make(null);try{
  const body=b.material.fragmentShader.match(/float jiangnanPhotographicU\(vec3 d\)\{([^}]+)\}/)?.[1];
  assert.ok(body,'the photographic shader owns the projection branch');
  const project=new Function('d','vec3','atan',body),vec3=(x,y,z)=>({x,y,z});
  for(let i=-150;i<=150;i++)for(const y of [-.6,0,.6]){
   const angle=i/100,d={x:Math.sin(angle),y,z:-Math.cos(angle)};
   assert.equal(project(d,vec3,Math.atan2),.5+(Math.atan2(d.x,-d.z)-.03)/1.95,'front-window registration must not move');
  }
  assert.match(b.material.fragmentShader,/float u=jiangnanPhotographicU\(d\)/,'the tested function feeds the texture lookup');
 }finally{b.dispose();}
});

test('rear-door sky rays use a continuous interior part of the same texture without added ownership',()=>{
 for(const software of [false,true]){
  const b=make(null,undefined,software);try{
   const body=b.material.fragmentShader.match(/float jiangnanPhotographicU\(vec3 d\)\{([^}]+)\}/)?.[1];
   const project=new Function('d','vec3','atan',body),vec3=(x,y,z)=>({x,y,z}),samples=[];
   for(let i=-65;i<=65;i++){
    const angle=i/100,d={x:Math.sin(angle),y:.2,z:Math.cos(angle)},u=project(d,vec3,Math.atan2);
    assert.ok(u>.1&&u<.9,'the visible rear cone must not clamp into an image-edge stripe');
    assert.equal(u,.5+(Math.atan2(-d.x,d.z)-.03)/1.95);samples.push(u);
   }
   for(let i=1;i<samples.length;i++)assert.ok(samples[i]<samples[i-1],'rear UVs vary continuously instead of repeating the edge pixel');
   assert.equal(b.requests.length,1,'reusing the plate adds no texture request');
   b.photo.load(b.photo.texture);assert.equal(b.resources.size,primaryOwnership.resources);assert.equal(b.textures.size,primaryOwnership.textures);
  }finally{b.dispose();}
 }
});


test('views beyond the photographic plate dissolve before its repeated edge reaches the dome pole',()=>{
 const b=make(null);try{
  const smoothstep=(a,c,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(c-a)));return t*t*(3-2*t);};
  const skyBody=b.material.fragmentShader.match(/float jiangnanPlateSkyFade\(float v\)\{([^}]+)\}/)?.[1];
  const sideBody=b.material.fragmentShader.match(/float jiangnanPlateEdgeFade\(float u\)\{([^}]+)\}/)?.[1];
  assert.ok(skyBody&&sideBody);
  const sky=new Function('v','smoothstep',skyBody),side=new Function('u','smoothstep','abs',sideBody);
  for(const v of [0,.38,.75,.99])assert.equal(sky(v,smoothstep),0,'in-plate image remains unchanged');
  for(const v of [1.12,1.5,2.3])assert.equal(sky(v,smoothstep),1,'high-angle rays have no repeated photographic row');
  for(const u of [.01,.2,.5,.8,.99])assert.equal(side(u,smoothstep,Math.abs),0);
  for(const u of [-.06,1.06])assert.equal(side(u,smoothstep,Math.abs),1);
  assert.match(b.material.fragmentShader,/max\(jiangnanPlateSkyFade\(v\),jiangnanPlateEdgeFade\(u\)\)/,'both edge guards feed the final sky blend');
 }finally{b.dispose();}
});
