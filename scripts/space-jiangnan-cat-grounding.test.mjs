import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

function canvas(){
  const surface={width:0,height:0};let pixels;
  const context=new Proxy({createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},getImageData(x,y,w,h){return pixels||this.createImageData(w,h);},putImageData(v){pixels=v;},createRadialGradient(){return{addColorStop(){}};},createLinearGradient(){return{addColorStop(){}};}},{get:(target,key)=>key in target?target[key]:()=>{}});
  surface.getContext=()=>context;return surface;
}

test('optional room grounding uses the actual cat skin and actual floor/rug, with the original clock and ownership',async t=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'blog-cat-ground-'));
  t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
  const saved=new Map(['self','ProgressEvent','createImageBitmap','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  t.after(()=>{for(const[k,v]of saved)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];});
  globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,p){Object.assign(this,p);}};globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});globalThis.document={createElement:canvas};
  const{build}=createRequire(import.meta.url)('esbuild'),result=await build({stdin:{contents:"export * as THREE from 'three';export {buildJiangnanRoom} from './jiangnan-room.js';export {createCafeResident} from './world-cat.js';export {JIANGNAN_CAT_ADAPTER} from './jiangnan-cat-state.mjs';",resolveDir:path.join(root,'assets/js/space')},bundle:true,write:false,format:'esm',platform:'node',alias:{three:path.join(root,'assets/js/vendor/three.module.min.js')}});
  const output=path.join(temporary,'bundle.mjs');fs.writeFileSync(output,result.outputFiles[0].contents);const m=await import(pathToFileURL(output).href),T=m.THREE;
  const roomScene=new T.Scene(),resources=new Set(),textures=new Set(),loadTexture=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=()=>new T.Texture();let room;
  try{room=m.buildJiangnanRoom({scene:roomScene,pbr:{bind(){}},resources,textures,wake(){},books:[],records:[],isDisposed:()=>false});}finally{T.TextureLoader.prototype.load=loadTexture;}
  t.after(()=>{for(const r of resources)r.dispose?.();for(const r of textures)r.dispose?.();});
  assert.equal(typeof room.catSupport?.sample,'function','the room must supply its real floor/rug support provider');
  roomScene.updateMatrixWorld(true);const floor=roomScene.getObjectByName('jiangnan-long-board-floor'),rug=room.group.children.find(o=>o.geometry?.parameters?.options?.depth>2.4&&o.position.x===-.05&&o.position.y===.014),floorTop=new T.Box3().setFromObject(floor).max.y;
  assert.ok(rug);const rugTop=new T.Box3().setFromObject(rug).max.y;
  assert.equal(room.catSupport.floorY,floorTop);assert.equal(room.catSupport.rugY,rugTop);
  const bytes=fs.readFileSync(path.join(root,'static/models/space/cat.glb')),asset='data:model/gltf-binary;base64,'+bytes.toString('base64');
  function actualPaws(scene){
    scene.updateMatrixWorld(true);const mesh=scene.getObjectByName('Cat');mesh.skeleton.update();const a=mesh.geometry.attributes,result={};
    for(const name of ['L_Foot','R_Foot','L_BFoot','R_BFoot']){let minimum=Infinity;const surfaces=new Set();
      for(let i=0;i<a.position.count;i++){let weight=0;for(let k=0;k<4;k++)if(mesh.skeleton.bones[a.skinIndex.array[i*4+k]].name===name)weight+=a.skinWeight.array[i*4+k];if(weight<=.25)continue;
        const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld),hit=new T.Raycaster(new T.Vector3(p.x,.5,p.z),new T.Vector3(0,-1,0),0,.6).intersectObject(rug,false)[0],height=Math.max(floorTop,hit?.point.y??-Infinity);
        minimum=Math.min(minimum,p.y-height);surfaces.add(height>floorTop+.001?'rug':'wood');
      }result[name]={gap:minimum,surfaces};
    }return result;
  }
  const create=(scene,grounding,at)=>m.createCafeResident({scene,asset,grounding,appearance:{natural:true,length:.56},routeAdapter:at?{...m.JIANGNAN_CAT_ADAPTER,create:()=>({...m.JIANGNAN_CAT_ADAPTER.create(),...at})}:m.JIANGNAN_CAT_ADAPTER});
  await t.test('real soles clear wood, rug and a mixed support inside one paw without translating foot bones',async()=>{
    for(const at of [{x:-1.8,z:-1.2,yaw:0},{x:-1.84,z:.2,yaw:0},{x:-1.8000047,z:-.80290168,yaw:0}]){
      const scene=new T.Scene(),cat=create(scene,room.catSupport,at);try{assert.equal(await cat.ready,true);const paws=actualPaws(scene);for(const p of Object.values(paws))assert.ok(p.gap>=-1e-5,`${p.gap} metres of penetration`);
        if(at.z===-.80290168)assert.ok(Object.values(paws).some(p=>p.surfaces.size===2),'exercise higher support within the same real foot');
        else {assert.ok(Math.abs(paws.L_BFoot.gap)<1e-5);assert.ok(paws.L_Foot.gap<.006,'whole-body correction retains its small front/rear mismatch');}
      }finally{cat.dispose();}
    }
  });
  await t.test('no provider preserves public state, gait, bone positions, quiet time and pet/settle ownership',async()=>{
    const aScene=new T.Scene(),bScene=new T.Scene(),plain=create(aScene),grounded=create(bScene,room.catSupport);try{
      assert.equal(await plain.ready,true);assert.equal(await grounded.ready,true);assert.deepEqual(grounded.snapshot(),plain.snapshot());
      assert.equal(aScene.getObjectByName('cat-soft-shadow-rug'),undefined,'the original café keeps its original shadow resources');
      plain.update(0,{active:true});grounded.update(0,{active:true});
      for(let i=0;i<400;i++){plain.update(.04,{active:true});grounded.update(.04,{active:true});assert.deepEqual(grounded.snapshot(),plain.snapshot());}
      for(const name of ['L_Foot','R_Foot','L_BFoot','R_BFoot'])assert.deepEqual(bScene.getObjectByName(name).position.toArray(),aScene.getObjectByName(name).position.toArray());
      grounded.update(.04,{active:false});const state=grounded.snapshot(),bounds=new T.Box3().setFromObject(bScene.getObjectByName('Cat'));
      grounded.update(3600,{active:false});assert.deepEqual(grounded.snapshot(),state);assert.deepEqual(new T.Box3().setFromObject(bScene.getObjectByName('Cat')),bounds);
      grounded.update(3600,{active:true});assert.deepEqual(grounded.snapshot(),state,'resume discards the long paused interval');
      assert.equal(grounded.interact('pet',{x:state.x+.5,z:state.z+.5},{nearby:true,now:1000}),'petting');grounded.update(0,{interactive:true});grounded.update(.04,{interactive:true});assert.equal(grounded.snapshot().interaction.stage,'respond');grounded.settle();for(const p of Object.values(actualPaws(bScene)))assert.ok(p.gap>=-1e-5);
    }finally{plain.dispose();grounded.dispose();}
  });
  await t.test('wood/rug shadow levels follow the actual supports and dispose shared resources once',async()=>{
    const scene=new T.Scene(),cat=create(scene,room.catSupport);assert.equal(await cat.ready,true);scene.updateMatrixWorld(true);
    const anchor=scene.getObjectByName('cafe-resident'),upper=scene.getObjectByName('cat-soft-shadow-rug'),lower=anchor.children.find(o=>o.isMesh&&o!==upper);
    assert.ok(Math.abs(lower.getWorldPosition(new T.Vector3()).y-floorTop-.0002)<1e-8);assert.ok(Math.abs(upper.getWorldPosition(new T.Vector3()).y-rugTop-.0002)<1e-8);
    assert.equal(upper.geometry,lower.geometry);assert.equal(upper.material.map,lower.material.map);let materials=0,geometry=0,texture=0;
    upper.material.addEventListener('dispose',()=>materials++);lower.geometry.addEventListener('dispose',()=>geometry++);lower.material.map.addEventListener('dispose',()=>texture++);
    cat.dispose();cat.dispose();assert.equal(materials,1);assert.equal(geometry,1);assert.equal(texture,1);assert.equal(scene.children.length,0);
  });
  await t.test('invalid callbacks cannot poison transforms and disposed/late-decoding cats never query support',async()=>{
    let calls=0,throws=false;const support={...room.catSupport,sample(){calls++;if(throws)throw new Error('Support unavailable');return NaN;}},scene=new T.Scene(),cat=create(scene,support);
    assert.equal(await cat.ready,true);cat.update(0,{active:true});cat.update(.04,{active:true});assert.ok(new T.Box3().setFromObject(scene.getObjectByName('Cat')).min.toArray().every(Number.isFinite));
    throws=true;cat.update(.04,{active:true});assert.equal(cat.loaded,true);assert.ok(new T.Box3().setFromObject(scene.getObjectByName('Cat')).min.toArray().every(Number.isFinite));
    cat.dispose();const count=calls;cat.update(100,{active:true});cat.attend({x:0,z:0});assert.equal(calls,count);assert.equal(cat.loaded,false);assert.equal(scene.children.length,0);
    let decode,closed=0;globalThis.createImageBitmap=()=>new Promise(resolve=>{decode=resolve;});calls=0;const delayed=create(scene,{...support,sample(){calls++;return room.catSupport.floorY;}});
    for(let i=0;i<30&&!decode;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(decode);delayed.dispose();decode({width:512,height:512,close(){closed++;}});assert.equal(await delayed.ready,false);assert.equal(calls,0);assert.equal(closed,1);
  });
});
