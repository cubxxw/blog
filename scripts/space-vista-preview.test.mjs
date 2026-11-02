import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../assets/js/vendor/three.module.min.js';
globalThis.document={createElement(){return {width:0,height:0,getContext(){return new Proxy({createRadialGradient(){return {addColorStop(){}};}},{get:(o,k)=>o[k]||(()=>{})});}};}};
const file=new URL('../assets/js/space/jiangnan-exterior.js',import.meta.url);
const source=readFileSync(file,'utf8').replace("from 'three'",`from '${new URL('../assets/js/vendor/three.module.min.js',import.meta.url)}'`).replace("from './jiangnan-state.mjs'",`from '${new URL('../assets/js/space/jiangnan-state.mjs',import.meta.url)}'`).replace("from './jiangnan-vista-coverage.mjs'",`from '${new URL('../assets/js/space/jiangnan-vista-coverage.mjs',import.meta.url)}'`);
const {buildJiangnanExterior}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function fixture({optional=false}={}){
  const requests=[],resources=new Set(),textures=new Set(),events=[];let dead=false,wakes=0;
  const original=THREE.TextureLoader.prototype.load;
  const load=function(url,load,progress,error){const texture=new THREE.Texture(),request={url,texture,load,error,releases:0};texture.addEventListener('dispose',()=>request.releases++);requests.push(request);return texture;};
  THREE.TextureLoader.prototype.load=load;
  let result;
  try{result=buildJiangnanExterior({scene:new THREE.Scene(),pbr:{bind(){}},resources,textures,vistaMode:'image',vistaAsset:'/full.webp',vistaPreview:'data:image/webp;base64,inline',dayVistaAsset:optional?'/day.webp':null,continuationAsset:optional?'/water.webp':null,wake(){wakes++;},isDisposed:()=>dead,onDiagnostic:code=>events.push(code)});}finally{THREE.TextureLoader.prototype.load=original;}
  const primary=requests.find(r=>r.url==='/full.webp'),preview=requests.find(r=>r.url.startsWith('data:'));
  return {result,requests,resources,textures,events,primary,preview,activate(){THREE.TextureLoader.prototype.load=load;try{result.loadOptional();}finally{THREE.TextureLoader.prototype.load=original;}},get wakes(){return wakes;},get material(){return result.group.getObjectByName('photographic environment study').material;},dispose(){dead=true;for(const r of resources)r.dispose?.();for(const t of textures)t.dispose();}};
}

test('a held full vista can enter using the same inline photograph, then upgrade without another town',()=>{
  const f=fixture();try{
    assert.ok(f.preview,'the inline photograph must be decoded without a network request');f.preview.load(f.preview.texture);
    assert.equal(f.result.vistaMode,'image-preview');assert.equal(f.material.uniforms.vista.value,f.preview.texture);
    assert.equal(f.result.group.getObjectByName('photographic environment study').visible,true);
    assert.equal(f.result.group.getObjectByName('arched stone bridge'),undefined);
    f.primary.load(f.primary.texture);assert.equal(f.result.vistaMode,'image');assert.equal(f.material.uniforms.vista.value,f.primary.texture);
    assert.equal(f.preview.releases,1);assert.equal(f.textures.has(f.preview.texture),false);
  }finally{f.dispose();}
  assert.equal(f.primary.releases,1);assert.equal(f.preview.releases,1);
});

test('primary failure retains the current photograph and records a separate fixed code',()=>{
  const f=fixture();try{assert.ok(f.preview);f.preview.load(f.preview.texture);f.primary.error();assert.equal(f.result.vistaMode,'image-preview');assert.equal(f.result.group.getObjectByName('arched stone bridge'),undefined);assert.ok(f.events.includes('vista-load'));}finally{f.dispose();}
});

test('a hanging primary has a bounded diagnostic deadline without losing the photographic room',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const f=fixture();try{assert.ok(f.preview);f.preview.load(f.preview.texture);t.mock.timers.tick(8000);assert.ok(f.events.includes('vista-timeout'));assert.equal(f.result.vistaMode,'image-preview');f.primary.load(f.primary.texture);assert.equal(f.result.vistaMode,'image');}finally{f.dispose();}
});

test('disposed pending preview and primary release once without waking or changing the scene',()=>{
  const f=fixture();assert.ok(f.preview);f.dispose();const before=f.wakes;
  f.preview.load(f.preview.texture);f.primary.load(f.primary.texture);
  assert.equal(f.wakes,before);assert.equal(f.preview.releases,1);assert.equal(f.primary.releases,1);
});

test('a late preview cannot replace an already complete full-quality image',()=>{
  const f=fixture();try{assert.ok(f.preview);f.primary.load(f.primary.texture);f.preview.load(f.preview.texture);assert.equal(f.result.vistaMode,'image');assert.equal(f.material.uniforms.vista.value,f.primary.texture);assert.equal(f.preview.releases,1);}finally{f.dispose();}
});
test('daylight and water images start only after explicit first-frame activation and only once',()=>{
  const f=fixture({optional:true});try{
    assert.equal(f.requests.length,2,'only primary and inline preview belong to entry');
    f.preview.load(f.preview.texture);f.activate();f.activate();
    assert.deepEqual(f.requests.map(r=>r.url),['/full.webp','data:image/webp;base64,inline','/day.webp','/water.webp']);
  }finally{f.dispose();}
});
test('a disposed room cannot start optional network work',()=>{
  const f=fixture({optional:true});f.dispose();f.activate();assert.equal(f.requests.length,2);
});
