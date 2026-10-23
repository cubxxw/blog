import test from 'node:test';
import assert from 'node:assert/strict';
import {CAT_PLACES,CAT_COLLIDERS,createCatState,stepCat,requestCat,settleCatInteraction,catPositionClear,catSegmentClear} from '../assets/js/space/cat-state.mjs';

test('an explicit still interaction responds immediately without moving or advancing the autonomous random route',()=>{
  const cat=createCatState(),visitor={x:3,z:2,yaw:0};
  for(const kind of ['call','pet']){
    const reply=requestCat(cat,kind,visitor,{instant:true,nearby:true,now:10});
    assert.equal(reply.result,kind==='pet'?'petted-still':'noticed');assert.equal(reply.state.x,cat.x);assert.equal(reply.state.z,cat.z);assert.equal(reply.state.seed,cat.seed);assert.equal(reply.state.speed,0);assert.equal(reply.state.interaction.instant,true);assert.equal(reply.state.interaction.remaining,0);assert.ok(Math.abs(reply.state.yaw-Math.atan2(visitor.x-cat.x,visitor.z-cat.z))<1e-9);
    assert.equal(stepCat(reply.state,60,{paused:true}),reply.state);
    const repeat=requestCat(reply.state,kind,visitor,{instant:true,nearby:true,now:12.99});assert.equal(repeat.result,'cooldown');assert.equal(repeat.state,reply.state);
    assert.notEqual(requestCat(reply.state,kind,visitor,{instant:true,nearby:true,now:13}).result,'cooldown');
  }
});

test('summoning from each existing route reaches a nearby safe stop without crossing furniture or exceeding walking speed',()=>{
  const visitors=[{x:.85,z:2.45,yaw:Math.PI/4},{x:4,z:3.5,yaw:1},{x:-4.5,z:3.4,yaw:0},{x:1.4,z:-.3,yaw:0}];
  for(const [place,start] of CAT_PLACES.entries())for(const visitor of visitors){
    let state={...createCatState(),x:start.x,z:start.z,place,goal:place},reply=requestCat(state,'call',visitor,{now:10});assert.equal(reply.result,'approaching',`${start.name} to ${visitor.x},${visitor.z}`);state=reply.state;
    const originalSeed=state.seed;let steps=0;
    for(;steps<4000&&state.interaction?.stage==='approach';steps++){
      const next=stepCat(state,.04);assert.ok(catPositionClear(next.x,next.z));assert.ok(catSegmentClear(state,next));assert.ok(Math.hypot(next.x-state.x,next.z-state.z)<=.42*.04+1e-9);state=next;
    }
    assert.ok(steps<4000);assert.equal(state.interaction?.stage,'near');assert.equal(state.seed,originalSeed);const distance=Math.hypot(state.x-visitor.x,state.z-visitor.z);assert.ok(distance>=.70&&distance<=1.40,`${distance}`);
    // Resume through a connected route after the finite response, never through
    // the table that the visitor may have been standing beside.
    for(let i=0;i<500;i++){state=stepCat(state,.04);assert.ok(catPositionClear(state.x,state.z));}
  }
});

test('petting requires either physical proximity or the explicit cat encounter, and cannot stack repeated gestures',()=>{
  const cat=createCatState(),far={x:-4.5,z:3.4};assert.equal(requestCat(cat,'pet',far,{now:10}).result,'distant');
  const reply=requestCat(cat,'pet',far,{nearby:true,now:10});assert.equal(reply.result,'petting');assert.equal(reply.state.interaction.stage,'respond');assert.equal(requestCat(reply.state,'pet',far,{nearby:true,now:11}).result,'cooldown');
  let state=reply.state;for(let i=0;i<61;i++)state=stepCat(state,.04);assert.equal(state.interaction,null);assert.equal(state.x,cat.x);assert.equal(state.z,cat.z);
});

test('a preference change or reading pause settles the owned action at its current safe position',()=>{
  let state=requestCat(createCatState(),'call',{x:-4.5,z:3.4},{now:10}).state;for(let i=0;i<200;i++)state=stepCat(state,.04);assert.equal(state.interaction.stage,'approach');
  const still=settleCatInteraction(state);assert.equal(still.x,state.x);assert.equal(still.z,state.z);assert.equal(still.speed,0);assert.equal(still.interaction.instant,true);assert.equal(still.interaction.remaining,0);
  for(let i=0;i<100;i++)assert.equal(stepCat(still,.04,{paused:true}),still);
});

test('the action cannot cross newly blocked routes or summon the cat through the café wall to the terrace',()=>{
  const cat=createCatState(),outside=requestCat(cat,'call',{x:0,z:-8.8},{now:10});assert.equal(outside.result,'unreachable');assert.equal(outside.state.x,cat.x);assert.equal(outside.state.z,cat.z);
  const request=requestCat(cat,'call',{x:4,z:3.5},{now:10}),box={minX:cat.x-.2,maxX:cat.x+.2,minZ:cat.z-.2,maxZ:cat.z+.2},next=stepCat(request.state,.04,{colliders:[...CAT_COLLIDERS,box]});assert.equal(next.x,cat.x);assert.equal(next.z,cat.z);assert.equal(next.interaction.instant,true);assert.notEqual(next.interaction.stage,'approach');
});

test('the actual rig keeps attached eyes at centimetre scale and fits the full animal inside desktop, portrait and short views',async t=>{
  // Real local glTF geometry, skin, hierarchy and animation. Pixel decoding is
  // stubbed: this checks transform/frustum boundaries, not rendered appearance.
  const fs=await import('node:fs'),path=await import('node:path'),{createRequire}=await import('node:module'),THREE=await import('../assets/js/vendor/three.module.min.js'),{build}=createRequire(import.meta.url)('esbuild');
  const cwd=new URL('../',import.meta.url).pathname,{outputFiles}=await build({entryPoints:[path.join(cwd,'assets/js/space/world-cat.js')],alias:{three:path.join(cwd,'assets/js/vendor/three.module.min.js')},bundle:true,write:false,format:'esm',platform:'node'}),{createCafeResident}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].contents).toString('base64'));
  const saved=new Map(['self','ProgressEvent','createImageBitmap','document','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));t.after(()=>{for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,properties){Object.assign(this,properties);}};globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});globalThis.document={createElement(){return {getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
  const originalFetch=globalThis.fetch;globalThis.fetch=(input,options)=>{const url=typeof input==='string'?input:input.url;assert.match(url,/^(data|blob):/,'only embedded local asset reads');return originalFetch(input,options);};
  const bytes=fs.readFileSync(path.join(cwd,'static/models/space/cat.glb')),scene=new THREE.Scene(),events=[],cat=createCafeResident({scene,onChange:code=>events.push(code),asset:'data:model/gltf-binary;base64,'+bytes.toString('base64')});t.after(()=>cat.dispose());assert.equal(await cat.ready,true);cat.update(0);scene.updateMatrixWorld(true);
  const mesh=scene.getObjectByName('Cat'),eyes=['cat-eye-left','cat-eye-right'].map(name=>scene.getObjectByName(name));assert.ok(mesh?.isSkinnedMesh);assert.ok(eyes.every(Boolean));
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength)),primitive=json.meshes[0].primitives[0],binaryStart=28+jsonLength;
  for(const [semantic,key] of [['POSITION','position'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']]){const accessor=json.accessors[primitive.attributes[semantic]],view=json.bufferViews[accessor.bufferView],attribute=mesh.geometry.attributes[key],actual=Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength),start=binaryStart+(view.byteOffset||0)+(accessor.byteOffset||0);if(semantic==='WEIGHTS_0'){/* GLTFLoader normalizes the source float weights on load. */for(let i=0;i<attribute.array.length;i+=4){const values=Array.from({length:4},(_,j)=>bytes.readFloatLE(start+(i+j)*4)),sum=values.reduce((a,b)=>a+Math.abs(b),0);for(let j=0;j<4;j++)assert.ok(Math.abs(attribute.array[i+j]-(sum?values[j]/sum:Number(j===0)))<1e-7);}}else assert.deepEqual(actual,bytes.subarray(start,start+actual.byteLength),semantic+' is unchanged');}
  const nose=mesh.getVertexPosition(3673,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);for(const eye of eyes)assert.ok(eye.getWorldPosition(new THREE.Vector3()).y>nose.y+.015,'both eyes are above the actual pink nose tip');
  const body=new THREE.Box3().setFromObject(mesh);for(const eye of eyes){const scale=eye.getWorldScale(new THREE.Vector3()),size=new THREE.Box3().setFromObject(eye).getSize(new THREE.Vector3());assert.ok(Math.abs(scale.y-1)<1e-5);assert.ok(Math.max(size.x,size.y,size.z)<.065);}
  for(const [width,height] of [[1440,900],[390,844],[320,740],[568,224]]){const view=cat.view(width/height),camera=new THREE.PerspectiveCamera(view.fov,width/height,.08,220);camera.position.set(...view.position);camera.lookAt(new THREE.Vector3(...view.target));camera.updateMatrixWorld();for(const x of [body.min.x,body.max.x])for(const y of [body.min.y,body.max.y])for(const z of [body.min.z,body.max.z]){const point=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(point.x)<.8&&point.y>-.6&&point.y<.75,`${width}×${height}: ${point.toArray()}`);}}
  await t.test('a loaded active resident leaves its original three-second look under 1.4-second paints',()=>{
    cat.update(0,{active:true});const initial=cat.snapshot();
    for(let frame=0;frame<8;frame++)cat.update(1.4,{active:true});
    const after=cat.snapshot();assert.ok(Math.hypot(after.x-initial.x,after.z-initial.z)>.1,'11.2 visible seconds must advance the real resident beyond its initial look');assert.ok(catPositionClear(after.x,after.z));
  });
  await t.test('the actual world tick passes uncapped active time to the real resident without changing camera steps',async()=>{
    const {default:vm}=await import('node:vm'),{stepWalk}=await import('../assets/js/space/world-state.mjs'),other=createCafeResident({scene:new THREE.Scene(),asset:'data:model/gltf-binary;base64,'+bytes.toString('base64')});t.after(()=>other.dispose());assert.equal(await other.ready,true);
    const code=fs.readFileSync(path.join(cwd,'assets/js/space/world-cafe.js'),'utf8'),tick=code.slice(code.indexOf('  function tick(time)'),code.indexOf('  function visibility()')),dataset={},poses=[],context={disposed:false,frame:0,active:true,mode:'roam',quiet:false,reduced:{matches:false},isBlocked:()=>false,resident:other,moving:null,keys:new Set(),touchKeys:new Set(),drag:null,lastPaint:0,last:0,elapsed:0,drawing:false,water:null,rain:null,inspection:null,scene:{},camera:{},css:{render(){}},renderer:{render(){this.info.render.frame++;},info:{render:{frame:0,triangles:0,calls:0}}},root:{dataset},catStamp:0,firstPending:false,pose:{x:.85,y:1.52,z:2.45,yaw:0,pitch:0,fov:54},stepWalk:(...args)=>{poses.push(args[3]);return stepWalk(...args);},applyPose(){},requestAnimationFrame:()=>1};
    const run=vm.runInNewContext(tick+'\ntick;',context),initial=other.snapshot();for(let frame=0;frame<=8;frame++)run(1000+1400*frame);
    assert.ok(Math.hypot(other.snapshot().x-initial.x,other.snapshot().z-initial.z)>.1,'world must not discard the active elapsed time before the resident sees it');assert.ok(poses.every(dt=>dt<=.04),'visitor physics keeps its existing short step');
  });
  cat.interact('pet',{x:1.25,z:3},{instant:true,nearby:true,now:10});for(let i=0;i<100;i++)cat.update(0);scene.updateMatrixWorld(true);for(const eye of eyes){const scale=eye.getWorldScale(new THREE.Vector3());assert.ok(Math.abs(scale.y-.4475)<1e-5);assert.ok(Math.abs(scale.x-1)<1e-5);assert.ok(new THREE.Box3().setFromObject(eye).getSize(new THREE.Vector3()).y<.065);}
  cat.interact('pet',{x:1.25,z:3},{nearby:true,now:14});assert.equal(events.at(-1),'petting');cat.settle();assert.equal(events.at(-1),'petted-still');
  await t.test('the real resident never injects an inactive interval or pre-gesture time into a new call or pet',()=>{
    const before=cat.snapshot();cat.update(600,{active:false});assert.deepEqual(cat.snapshot(),before);cat.update(600,{active:true});assert.deepEqual(cat.snapshot(),before,'the first resumed frame establishes its baseline');
    cat.interact('pet',{x:.85,z:2.45},{nearby:true,now:100});const pet=cat.snapshot();assert.equal(pet.interaction.stage,'respond');cat.update(1.4,{interactive:true});assert.deepEqual(cat.snapshot(),pet,'the old paint interval predates the new gesture');cat.update(.04,{interactive:true});assert.ok(Math.abs(cat.snapshot().interaction.remaining-2.36)<1e-9);
    cat.resetClock();const paused=cat.snapshot();cat.update(600,{interactive:true});assert.deepEqual(cat.snapshot(),paused,'immediate lifecycle resets also cover pauses between two paints');
    cat.interact('call',{x:.85,z:2.45,yaw:0},{now:104});const call=cat.snapshot();assert.equal(call.interaction.stage,'approach');cat.update(1.4,{interactive:true});assert.deepEqual(cat.snapshot(),call,'a call cannot inherit the previous pet interval');cat.update(.04,{interactive:true});assert.ok(catSegmentClear(call,cat.snapshot()));assert.ok(Math.hypot(cat.snapshot().x-call.x,cat.snapshot().z-call.z)<=.42*.04+1e-9);
  });
  cat.dispose();assert.equal(scene.children.length,0);
});

test('the Jiangnan tick advances visible time and the resident through slow frames without enlarging physics steps',async()=>{
  const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
  const {createCatClock}=await import('../assets/js/space/cat-clock.mjs');
  const {createJiangnanCatState,requestJiangnanCat,stepJiangnanCat,jiangnanCatPositionClear,jiangnanCatSegmentClear}=await import('../assets/js/space/jiangnan-cat-state.mjs');
  const {jiangnanLook,jiangnanWalk}=await import('../assets/js/space/jiangnan-state.mjs');
  const source=readFileSync(new URL('../assets/js/space/world-jiangnan.js',import.meta.url),'utf8');
  const tick=source.slice(source.indexOf('  function tick(stamp)'),source.indexOf('  function visibility()'));
  for(const hz of [60,1,.7]){
    const clock=createCatClock(),visitor=jiangnanLook([2.25,1.14,1.25],[.20,1.15,-1.65],48),walkSteps=[];
    let state=requestJiangnanCat(createJiangnanCatState(),'call',visitor,{now:0}).state,wall=0,arrived=null,steps=0;
    const resident={setRoutine(){},update(seconds){steps=0;clock.advance(seconds,true,dt=>{
      steps++;assert.ok(dt>0&&dt<=.04);const before=state;state=stepJiangnanCat(state,dt);
      assert.ok(jiangnanCatPositionClear(state.x,state.z));assert.ok(jiangnanCatSegmentClear(before,state));
      if(arrived===null&&state.interaction?.stage==='near')arrived=wall;
    });assert.ok(steps<=50);},snapshot:()=>({...state,loaded:true,target:[state.x,.23,state.z]}),breathing:{}};
    const noop=()=>{},context={disposed:false,frame:0,visible:()=>true,mode:'roam',workspace:{dataset:{surface:'monitor'}},quiet:false,reduced:{matches:false},isBlocked:()=>false,moving:null,keys:new Set(['KeyW']),touchKeys:new Set(),last:0,environmentTime:0,navigate:()=>true,clockReturn:null,roomTime:{at:()=>({catRoutine:'nap',rain:0})},room:{update:noop},exterior:{update:noop,boat:{position:{x:0,y:0,z:0},rotation:{y:0}}},roomLights:{update:noop},magicClock:null,standbyClock:null,root:{dataset:{worldPbrMaps:12}},resident,targets:{},objectControls:{querySelector:()=>({textContent:'Watch the rain'})},t:(a,b)=>b,frames:0,publishObjects:noop,startTime:0,performance:{now:()=>0},reflectionDone:true,roomView:()=>false,screenVisibility:noop,renderRoom:()=>({triangles:0,calls:0}),css:{render:noop},scene:{},camera:{},settleFirst:noop,requestAnimationFrame:()=>1,pose:visitor,jiangnanWalk:(...args)=>{walkSteps.push(args[2]);return jiangnanWalk(...args);},applyPose:noop};
    const run=runInNewContext(tick+'\ntick;',context);run(1000);
    for(let frame=1;wall<24;frame++){wall=frame/hz;run(1000+wall*1000);}
    assert.ok(arrived!==null&&arrived<=20,`${hz}fps must complete the actual resident call in visible time; arrived=${arrived}`);
    assert.ok(Math.abs(context.environmentTime-wall)<1e-8,'analytical scenery uses visible elapsed time');
    assert.ok(walkSteps.length>0&&walkSteps.every(dt=>dt<=.04),'visitor collision physics retains its bounded steps');
  }
});
