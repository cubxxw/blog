import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from '../assets/js/vendor/three.module.min.js';
import {jiangnanCatPositionClear} from '../assets/js/space/jiangnan-cat-state.mjs';
const cwd=new URL('../',import.meta.url).pathname;

test('the actual resident loads its rig into the small room, owns its clock, and disposes async resources',async t=>{
  const entry=path.join(cwd,'assets/js/space/jiangnan-cat.js');assert.ok(fs.existsSync(entry),'missing Jiangnan rig wrapper');
  const {build}=createRequire(import.meta.url)('esbuild'),{outputFiles}=await build({entryPoints:[entry],alias:{three:path.join(cwd,'assets/js/vendor/three.module.min.js')},bundle:true,write:false,format:'esm',platform:'node'}),{createJiangnanResident}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].contents).toString('base64'));
  const saved=new Map(['self','ProgressEvent','createImageBitmap','document','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));t.after(()=>{for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,properties){Object.assign(this,properties);}};globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
  globalThis.document={createElement(){return {width:0,height:0,getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}};}};
  const bytes=fs.readFileSync(path.join(cwd,'static/models/space/cat.glb')),asset='data:model/gltf-binary;base64,'+bytes.toString('base64'),scene=new THREE.Scene(),events=[],resident=createJiangnanResident({scene,asset,onChange:code=>events.push(code)});t.after(()=>resident.dispose());
  assert.equal(await resident.ready,true);assert.equal(resident.loaded,true);assert.ok(jiangnanCatPositionClear(resident.snapshot().x,resident.snapshot().z));
  await t.test('a deliberate call keeps its visible pace when room paints are one second apart',async()=>{
    const events=[],own=createJiangnanResident({scene:new THREE.Scene(),asset,onChange:code=>events.push(code)});assert.equal(await own.ready,true);
    try{
      const home=own.snapshot(),visitor={x:2.25,z:1.25,yaw:.61534};
      assert.equal(own.interact('call',visitor,{now:100}),'waking');own.update(0,{active:true});
      const sleeping=own.snapshot();own.update(.12,{active:false,ambient:true,interactionSeconds:60});assert.deepEqual(own.snapshot(),sleeping,'an inactive room never banks an old interaction interval');
      own.update(0,{active:true});
      let paints=0;
      for(;paints<45&&!events.includes('arrived');paints++){
        const before=own.snapshot();own.update(.12,{active:true,interactionSeconds:1});
        const after=own.snapshot();assert.ok(jiangnanCatPositionClear(after.x,after.z));
        assert.ok(after.elapsed-before.elapsed<=1.000001,'safe substeps consume only the visible interval');
      }
      assert.ok(events.includes('arrived'),'the existing call arrives within 45 visible seconds on a slow renderer');
      assert.ok(Math.hypot(own.snapshot().x-home.x,own.snapshot().z-home.z)>.3);
      const before=own.snapshot();own.update(.12,{active:true,interactionSeconds:3600});assert.ok(own.snapshot().elapsed-before.elapsed<=2.000001,'even an interactive stall retains the two-second catch-up bound');
    }finally{own.dispose();}
  });
  await t.test('sleeping breath moves the real chest while an inspected animal stays in its bed',()=>{
    const before=resident.snapshot(),chest=scene.getObjectByName('chest'),belly=scene.getObjectByName('belly'),samples=[];
    for(let i=0;i<125;i++){resident.update(.04,{ambient:true});samples.push([chest.scale.z,belly.scale.z]);}
    assert.deepEqual(resident.snapshot(),before,'breathing alone does not advance the cat routine or wake it');
    assert.ok(Math.max(...samples.map(s=>s[0]))-Math.min(...samples.map(s=>s[0]))>.025,'a complete quiet breath is visible in the chest');
    assert.ok(Math.max(...samples.map(s=>s[1]))-Math.min(...samples.map(s=>s[1]))>.018,'the belly follows the breath');
    const still=chest.scale.clone();for(let i=0;i<20;i++)resident.update(.5,{active:false,ambient:false});assert.deepEqual(chest.scale.toArray(),still.toArray(),'paused motion does not breathe or accumulate scale');
  });
  await t.test('visible breathing keeps the same real chest and belly pose at 60, 1 and 0.7 paints per second',async()=>{
    const reference=[];
    for(const hz of [60,1,.7]){
      const ownScene=new THREE.Scene(),own=createJiangnanResident({scene:ownScene,asset});assert.equal(await own.ready,true);
      try{
        const before=own.snapshot(),chest=ownScene.getObjectByName('chest'),belly=ownScene.getObjectByName('belly');let elapsed=0;
        own.update(0,{ambient:true});
        for(const [index,until]of [1,2,4.6,5.2,9.2].entries()){
          while(elapsed<until){const dt=Math.min(1/hz,until-elapsed);own.update(Math.min(.12,dt),{ambient:true,breathingSeconds:dt});elapsed+=dt;}
          const breath=own.breathing;
          assert.ok(Math.abs(breath.time-until)<1e-9,`${hz}fps: ${until} visible seconds must remain ${until} breathing seconds; got ${breath.time}`);
          assert.equal(breath.chest,chest.scale.z);assert.equal(breath.belly,belly.scale.z);
          if(hz===60)reference.push(breath);
          else for(const key of ['chest','belly'])assert.ok(Math.abs(breath[key]-reference[index][key])<1e-9,`${hz}fps ${key} must match the real 60fps pose at ${until}s`);
          assert.deepEqual(own.snapshot(),before,'ambient breathing never advances the sleeping routine or position');
        }
      }finally{own.dispose();}
    }
  });
  await t.test('breathing excludes paused intervals and lifecycle resets without changing bounded routine motion',async()=>{
    const ownScene=new THREE.Scene(),own=createJiangnanResident({scene:ownScene,asset});assert.equal(await own.ready,true);
    try{
      const before=own.snapshot();own.update(0,{ambient:true});own.update(.04,{ambient:true});const paused=own.breathing;
      for(let i=0;i<3;i++)own.update(3600,{active:false,ambient:false});
      assert.deepEqual(own.breathing,paused,'paused frames do not advance time or deform the real breathing bones');
      own.update(3600,{ambient:true});assert.deepEqual(own.breathing,paused,'the first resumed frame excludes the hidden interval');
      own.update(1,{ambient:true});assert.ok(Math.abs(own.breathing.time-paused.time-1)<1e-9);
      own.resetClock();const hidden=own.breathing;
      own.update(3600,{ambient:true});assert.deepEqual(own.breathing,hidden,'a lifecycle reset excludes hidden time even without an inactive paint');
      own.update(.04,{ambient:true});assert.ok(Math.abs(own.breathing.time-hidden.time-.04)<1e-9);
      assert.deepEqual(own.snapshot(),before,'ambient respiration cannot advance or move the sleeping resident');
      own.update(0,{active:true});const active=own.snapshot();own.update(3600,{active:true});const after=own.snapshot();
      assert.ok(after.elapsed-active.elapsed<=2+1e-9,'an active stall retains the existing finite routine budget');
      assert.ok(jiangnanCatPositionClear(after.x,after.z));
      assert.ok(Math.hypot(after.x-active.x,after.z-active.z)<=.64+1e-9,'unclamped analytical breathing cannot enlarge the physics movement budget');
    }finally{own.dispose();}
  });
  await t.test('sleeping lowers the real body onto its support instead of leaving tucked paws suspended',()=>{
    scene.updateMatrixWorld(true);const body=scene.getObjectByName('Cat'),sleepBounds=new THREE.Box3().setFromObject(body,true);
    assert.equal(resident.snapshot().phase,'sleep');
    t.diagnostic(JSON.stringify({sleepHeight:sleepBounds.max.y-sleepBounds.min.y}));
    assert.ok(sleepBounds.max.y-sleepBounds.min.y<.28,'a sleeping resident must have a low resting silhouette');
  });
  scene.updateMatrixWorld(true);const body=new THREE.Box3().setFromObject(scene.getObjectByName('Cat')),size=body.getSize(new THREE.Vector3());assert.ok(size.x<.63&&size.z<.63&&size.y<.6,size.toArray().join(','));assert.ok(body.min.y>=.005&&body.min.y<.03);
  assert.ok(scene.getObjectByName('cat-whiskers'));assert.deepEqual(resident.snapshot().target,[resident.snapshot().x,.23,resident.snapshot().z]);
  const mesh=scene.getObjectByName('Cat');
  const skinPoints=Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)),triangle=new THREE.Triangle(),nearest=new THREE.Vector3(),skinIndices=mesh.geometry.index.array;
  const sleepingAt=resident.snapshot();assert.ok(skinPoints.every(point=>Math.hypot(point.x-sleepingAt.x,point.z-sleepingAt.z)<.34),'the complete curled mesh stays inside the existing reserved turning radius');
  for(const name of ['cat-eye-left','cat-eye-right']){const eye=scene.getObjectByName(name);assert.ok(eye);const eyeAt=eye.getWorldPosition(new THREE.Vector3());let distance=Infinity;for(let i=0;i<skinIndices.length;i+=3){triangle.set(skinPoints[skinIndices[i]],skinPoints[skinIndices[i+1]],skinPoints[skinIndices[i+2]]);triangle.closestPointToPoint(eyeAt,nearest);distance=Math.min(distance,eyeAt.distanceTo(nearest));}assert.ok(distance<.003,'the closed eye follows the actual curled face surface');}
  await t.test('the phone lamp ray passes above a cat visiting the warm floor without selecting its whiskers',()=>{
    const anchor=scene.getObjectByName('cafe-resident'),home=anchor.position.clone();anchor.position.set(-.48,0,.68);scene.updateMatrixWorld(true);
    try{
    const origin=new THREE.Vector3(-.25,1.42,1.65),lamp=new THREE.Vector3(.34,1.16,-1.75),ray=new THREE.Raycaster(origin,lamp.sub(origin).normalize());
    const raw=ray.intersectObject(scene.getObjectByName('cafe-resident'),true),meshes=raw.filter(hit=>hit.object.isMesh),lines=raw.filter(hit=>hit.object.isLine);
    assert.equal(meshes.length,0,'the lamp ray does not pass through visible cat mesh');
    // In the new low sleeping pose the whiskers may also clear this ray.
    // The actual user-facing contract is that the distant lamp remains free.
    const hit=resident.hit(ray);assert.ok(!hit,`${hit?.object.name} claimed the distant lamp ray at ${hit?.distance}m`);
    }finally{anchor.position.copy(home);scene.updateMatrixWorld(true);}
  });
  await t.test('a ray directed at the visible torso still selects the physical cat',()=>{
    const target=body.getCenter(new THREE.Vector3()),origin=target.clone().add(new THREE.Vector3(0,.15,1));
    const ray=new THREE.Raycaster(origin,target.sub(origin).normalize()),hit=resident.hit(ray);
    assert.ok(hit?.object.isMesh,'the torso is a physical ray target');
  });
  await t.test('the curled skin stays compact when idle and unfolds continuously into the same standing rig',async()=>{
    const ownScene=new THREE.Scene(),own=createJiangnanResident({scene:ownScene,asset});assert.equal(await own.ready,true);
    try{
      const anchor=ownScene.getObjectByName('cafe-resident'),skin=ownScene.getObjectByName('Cat'),sample=()=>{ownScene.updateMatrixWorld(true);skin.skeleton.update();const inverse=anchor.matrixWorld.clone().invert();return [100,900,1800,2800,3673].map(i=>skin.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(skin.matrixWorld).applyMatrix4(inverse));};
      const asleep=sample(),bounds=new THREE.Box3().setFromObject(skin,true),size=bounds.getSize(new THREE.Vector3());
      assert.ok(Math.max(size.x,size.z)<.43,'the sleeping silhouette closes into a compact curl');
      assert.ok(size.y<.21,'the head and folded legs lie at cushion height');
      for(let i=0;i<5;i++)own.update(600,{active:false});
      assert.deepEqual(sample().map(p=>p.toArray()),asleep.map(p=>p.toArray()),'a paused pose must not accumulate bone rotations or body offsets');
      const home=own.snapshot();assert.equal(own.interact('call',{x:home.x,z:home.z+2,yaw:0},{now:100}),'waking');
      let previous=sample();assert.ok(previous.every((p,i)=>p.distanceTo(asleep[i])<1e-5),'requesting a wake starts from the existing pose');
      own.update(0,{active:true});
      for(let i=0;i<65;i++){own.update(.04,{active:true});const next=sample();assert.ok(next.every((p,j)=>p.distanceTo(previous[j])<.025),`the real skin must unfold without a frame jump: frame ${i}, deltas ${next.map((p,j)=>p.distanceTo(previous[j])).join(',')}`);previous=next;}
      assert.equal(skin.morphTargetInfluences[0],0,'standing and walking release the sleep correction');
      const awake=new THREE.Box3().setFromObject(skin,true).getSize(new THREE.Vector3());assert.ok(awake.y>size.y+.1,'waking restores the tall standing anatomy');
      for(let i=0;i<2500&&own.snapshot().phase!=='settle';i++)own.update(.04,{active:true});
      assert.equal(own.snapshot().phase,'settle','the same moving rig comes home before curling up');previous=sample();
      for(let i=0;i<66;i++){own.update(.04,{active:true});const next=sample();assert.ok(next.every((p,j)=>p.distanceTo(previous[j])<.025),'settling uses the same continuous skin transition');previous=next;}
      assert.equal(own.snapshot().phase,'sleep');assert.equal(skin.morphTargetInfluences[0],1);
    }finally{own.dispose();}
  });
  resident.update(0,{active:true});for(let i=0;i<20;i++)resident.update(.5,{active:true});assert.ok(resident.snapshot().elapsed>9);const at=resident.snapshot();
  resident.update(3600,{active:false});assert.deepEqual(resident.snapshot(),at);resident.update(3600,{active:true});assert.deepEqual(resident.snapshot(),at);
  resident.interact('pet',{x:0,z:1},{nearby:true,now:50});const pet=resident.snapshot();resident.update(1.5,{interactive:true});assert.deepEqual(resident.snapshot(),pet);resident.update(.04,{interactive:true});assert.ok(resident.snapshot().interaction.remaining<2.4);assert.equal(events.at(-1),'petting');
  const head=scene.getObjectByName('Head');scene.updateMatrixWorld(true);const before=head.getWorldPosition(new THREE.Vector3());resident.update(.5,{interactive:true});scene.updateMatrixWorld(true);assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(before)<.1);
  for(const aspect of [1.6,.45,2.5]){const view=resident.view(aspect);assert.ok(view.position.every(Number.isFinite));assert.ok(view.target.every(Number.isFinite));}
  resident.dispose();assert.equal(scene.children.length,0);assert.equal(resident.hit(new THREE.Raycaster()),null);assert.equal(resident.loaded,false);
  const aborted=createJiangnanResident({scene,asset});aborted.dispose();assert.equal(await aborted.ready,false);assert.equal(scene.children.length,0);assert.equal(aborted.loaded,false);
  let finishDecode,closed=0;globalThis.createImageBitmap=()=>new Promise(resolve=>{finishDecode=resolve;});
  const decoding=createJiangnanResident({scene,asset});
  for(let i=0;i<30&&!finishDecode;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(finishDecode,'exercise a real load pending during embedded texture decode');decoding.dispose();finishDecode({width:512,height:512,close(){closed++;}});
  assert.equal(await decoding.ready,false);assert.equal(scene.children.length,0);assert.equal(closed,1,'the late bitmap is closed with its owned texture');
});
