import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/js/vendor/three.module.min.js';
import {createPracticalLightRamp} from '../assets/js/space/jiangnan-practical-light.mjs';
import {jiangnanDoorPoses, JIANGNAN_DOOR} from '../assets/js/space/jiangnan-door-state.mjs';

async function browserModule(path) {
  const url = new URL(path,import.meta.url);
  const source=(await readFile(url,'utf8')).replace(/from (['"])([^'"]+)\1/g,(all,quote,specifier)=>{
    const target=specifier==='three'?new URL('../assets/js/vendor/three.module.min.js',import.meta.url):specifier.startsWith('.')?new URL(specifier,url):null;
    return target?`from '${target.href}'`:all;
  });
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const {buildJiangnanDoor}=await browserModule('../assets/js/space/jiangnan-door.js');
const {buildJiangnanRoom}=await browserModule('../assets/js/space/jiangnan-room.js');
function doorFixture() {
  const group=new THREE.Group(), resources=new Set(); let still=false, disposed=false, wakes=0;
  const door=buildJiangnanDoor({group,resources,still:()=>still,isDisposed:()=>disposed,wake:()=>{wakes++;}});
  return {group,door,resources,get wakes(){return wakes;},setStill:value=>{still=value;},dispose(){disposed=true; for(const r of resources)r.dispose?.();}};
}
function ray(group,x,y) {
  group.updateMatrixWorld(true);
  return new THREE.Raycaster(new THREE.Vector3(x,y,1.8),new THREE.Vector3(0,0,1),0,.8).intersectObject(group,true)
    .find(hit=>hit.object.visible&&!hit.object.material.transparent);
}

test('the rear wall and skirting contain a physical opening behind the hinged leaf', () => {
  const f=doorFixture(); try {
    assert.ok(ray(f.group,1.8,1.3),'the closed leaf seals the opening');
    assert.ok(ray(f.group,.8,1.3),'plaster remains beside the door');
    assert.ok(ray(f.group,.8,.10),'the skirting remains beside the door');
    f.setStill(true); f.door.open();
    assert.equal(ray(f.group,1.8,1.3),undefined,'opening cannot hide an intact wall');
    assert.equal(ray(f.group,1.8,.10),undefined,'skirting cannot trip across the opening');
    assert.ok(ray(f.group,1.8,2.5),'the lintel remains above the opening');
    assert.ok(f.group.getObjectByName('quiet-blue-water'));
  } finally {f.dispose();}
});

test('door motion retains its hinge, reverses without a position jump, and refreshes its final shadow frame', () => {
  const f=doorFixture(); try {
    const pivot=f.door.group.position.clone(); f.door.update(0); f.door.open();
    f.door.update(.1); f.door.update(.2); const mid=f.door.openAmount; assert.ok(mid>0&&mid<1);
    f.door.close(); assert.equal(f.door.openAmount,mid); f.door.update(.3); assert.ok(f.door.openAmount<mid);
    for(let i=4;i<=8;i++) {f.door.update(i/10); f.door.shadowRefresh();}
    assert.ok(f.door.openAmount>0); f.door.update(.9);
    assert.equal(f.door.openAmount,0); assert.equal(f.door.moving,false);
    assert.equal(f.door.shadowRefresh(),true,'final settled angle is still dirty');
    assert.equal(f.door.shadowRefresh(),false); assert.deepEqual(f.door.group.position,pivot);
  } finally {f.dispose();}
});

test('an explicit story abort settles the leaf and splash without an ambient clock or ongoing wake', () => {
  const f=doorFixture(); try {
    f.door.update(0); f.door.open();
    for(let i=1;i<=8;i++)f.door.update(i/10);
    assert.equal(f.door.openAmount,1);f.door.splash();f.door.update(.9);
    assert.equal(f.group.getObjectByName('door-step-ripples').visible,true);
    f.door.close();assert.equal(f.door.openAmount,1);assert.equal(f.door.moving,true,'the ordinary return still closes with motion');
    f.door.shadowRefresh();const wakes=f.wakes;
    f.door.close({immediate:true});assert.equal(f.door.openAmount,0);assert.equal(Math.abs(f.door.group.rotation.y),0);
    assert.equal(f.door.moving,false);assert.equal(f.group.getObjectByName('door-step-ripples').visible,false);
    assert.equal(f.door.shadowRefresh(),true);assert.equal(f.door.shadowRefresh(),false);
    for(let i=0;i<4;i++)f.door.update(.9);
    assert.equal(f.door.moving,false);assert.equal(f.wakes,wakes+1);
  } finally {f.dispose();}
});

test('still changes settle the leaf and splash without losing instantaneous shadow dirtiness', () => {
  const f=doorFixture(); try {
    f.door.update(0); f.door.open(); f.door.update(.1); f.door.shadowRefresh();
    f.setStill(true); f.door.update(.2); assert.equal(f.door.openAmount,1); assert.equal(f.door.moving,false);
    assert.equal(f.door.shadowRefresh(),true); assert.equal(f.door.shadowRefresh(),false);
    f.door.close(); assert.equal(f.door.openAmount,0); assert.equal(f.door.shadowRefresh(),true);
    f.door.splash(); assert.equal(f.door.moving,false);
    assert.equal(f.group.getObjectByName('door-step-ripples').visible,false);
  } finally {f.dispose();}
});

function canvas() {
  const element={width:0,height:0}; let pixels;
  element.getContext=()=>new Proxy({
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},
    getImageData(x,y,w,h){return pixels||this.createImageData(w,h);},putImageData(value){pixels=value;},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}
  },{get(target,key){return key in target?target[key]:()=>{};}});
  return element;
}
function roomFixture() {
  const originalDocument=globalThis.document, originalLoad=THREE.TextureLoader.prototype.load;
  globalThis.document={createElement:canvas}; THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
  const resources=new Set(),textures=new Set(); let still=false,disposed=false;
  const room=buildJiangnanRoom({scene:new THREE.Scene(),pbr:{bind(){}},resources,textures,wake(){},isDisposed:()=>disposed,
    buildDoor:buildJiangnanDoor,createLightRamp:createPracticalLightRamp,isStill:()=>still});
  return {room,setStill:value=>{still=value;},dispose(){disposed=true;for(const r of [...resources,...textures])r.dispose?.();
    THREE.TextureLoader.prototype.load=originalLoad; if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}};
}

test('the real room first-toggle glides every lamp component and refreshes the final light shadow', () => {
  const f=roomFixture(); try {
    const before=f.room.snapshotObjects(); f.room.update(0); f.room.toggleObject('lamp');
    const clicked=f.room.snapshotObjects(); assert.equal(clicked.tableLight,before.tableLight); assert.equal(clicked.shadeEmissive,before.shadeEmissive);
    f.room.update(.12); const half=f.room.snapshotObjects(); assert.ok(half.tableLight>0&&half.tableLight<before.tableLight);
    assert.ok(half.tablePool>0&&half.shadeEmissive>0); f.room.shadowRefresh();
    f.room.update(.24); const off=f.room.snapshotObjects(); assert.equal(off.tableLight,0); assert.equal(off.tablePoolVisible,false); assert.equal(off.shadeEmissive,0);
    assert.equal(f.room.shadowRefresh(),true,'the final zero-intensity frame must render its shadow'); assert.equal(f.room.shadowRefresh(),false);
    assert.equal(off.shelfLight,before.shelfLight,'the independent shelves keep their setting');
  } finally {f.dispose();}
});

test('the photo wash and its physical diffuser glide together and snap in reduced motion', () => {
  const f=roomFixture();try{
    f.room.update(0);const before=f.room.snapshotObjects();
    f.room.toggleObject('photo-light');assert.equal(f.room.snapshotObjects()['photo-light'],false);
    assert.equal(f.room.snapshotObjects().photoLight,before.photoLight);
    f.room.update(.12);const half=f.room.snapshotObjects();
    assert.ok(half.photoLight>0&&half.photoLight<before.photoLight);
    assert.ok(half.photoEmitter>0&&half.photoEmitter<before.photoEmitter);
    assert.equal(half.tableLight,before.tableLight);assert.equal(half.shelfLight,before.shelfLight);
    f.room.update(.24);assert.equal(f.room.snapshotObjects().photoLight,0);assert.equal(f.room.snapshotObjects().photoEmitter,0);
    f.setStill(true);f.room.toggleObject('photo-light');
    assert.equal(f.room.snapshotObjects().photoLight,before.photoLight);assert.equal(f.room.snapshotObjects().photoEmitter,before.photoEmitter);
  }finally{f.dispose();}
});

test('the real room keeps shadow refreshes for an immediate still toggle and door snap', () => {
  const f=roomFixture(); try {
    f.room.update(0); f.setStill(true); f.room.toggleObject('shelf-light');
    assert.equal(f.room.snapshotObjects().shelfLight,0); assert.equal(f.room.shadowRefresh(),true); assert.equal(f.room.shadowRefresh(),false);
    f.room.door.open(); f.room.update(0); assert.equal(f.room.door.openAmount,1);
    assert.equal(f.room.shadowRefresh(),true); assert.equal(f.room.shadowRefresh(),false);
    f.room.toggleObject('lamp'); assert.equal(f.room.snapshotObjects().tableLight,0); assert.equal(f.room.shadowRefresh(),true);
  } finally {f.dispose();}
});


test('C paper fish has real folds at human scale and leaves the threshold route open', () => {
  const f=doorFixture(); try {
    const fish=f.group.getObjectByName('rear-door-paper-fish'), body=f.group.getObjectByName('rear-door-folded-paper');
    assert.ok(fish&&body,'the sculpture is real geometry in the room');
    f.group.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(fish), size=box.getSize(new THREE.Vector3());
    assert.ok(size.x>.40&&size.x<.48, 'a small suspended paper object, not a room-size prop');
    body.geometry.computeBoundingBox();
    const foldDepth=body.geometry.boundingBox.getSize(new THREE.Vector3()).z;
    assert.ok(foldDepth>.05&&foldDepth<.10, 'the visible paper has actual folded depth');
    assert.ok(box.min.y>1.45&&box.max.y<1.80, 'the sculpture stays clear of the step and sightline');
    assert.equal(body.material.map,null); assert.equal(body.material.metalness,0);
    const vertices=body.geometry.attributes.position;
    for(let i=0;i<vertices.count;i+=3) {
      const a=new THREE.Vector3().fromBufferAttribute(vertices,i), b=new THREE.Vector3().fromBufferAttribute(vertices,i+1), c=new THREE.Vector3().fromBufferAttribute(vertices,i+2);
      assert.ok(new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).length()>1e-7,'fold triangles have real area');
    }
    f.setStill(true); f.door.open();
    for(const y of [.1,.6,1.1,1.4]) assert.equal(ray(f.group,1.8,y),undefined,`no sculpture or line blocks the door at ${y} m`);
    const line=f.group.getObjectByName('rear-door-fish-suspension'); assert.ok(line.isLine);
    const lineBox=new THREE.Box3().setFromObject(line); assert.ok(lineBox.max.y<JIANGNAN_DOOR.opening.top);
  } finally {f.dispose();}
});

test('C moon and fish fit the real threshold camera on desktop and narrow mobile', () => {
  const f=doorFixture(); try {
    f.setStill(true); f.door.open(); f.group.updateMatrixWorld(true);
    for(const aspect of [1440/900,390/844]) {
      const p=jiangnanDoorPoses(aspect).threshold, camera=new THREE.PerspectiveCamera(p.fov,aspect,.04,160);
      camera.position.set(p.x,p.y,p.z); camera.rotation.order='YXZ'; camera.rotation.set(p.pitch,p.yaw,0); camera.updateMatrixWorld(true);
      for(const name of ['rear-door-paper-fish','rear-door-distant-moon']) {
        const object=f.group.getObjectByName(name), position=object.getWorldPosition(new THREE.Vector3());
        const projected=position.clone().project(camera);
        assert.ok(Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94&&projected.z>0&&projected.z<1, `${name} stays in the threshold frame at ${aspect}`);
        const direction=position.clone().sub(camera.position), distance=direction.length();
        const blocked=new THREE.Raycaster(camera.position,direction.normalize(),.04,distance-.3).intersectObject(f.group,true)
          .find(hit=>hit.object.visible&&!hit.object.material.transparent);
        assert.equal(blocked,undefined,`${name} is visible through the real open frame`);
      }
    }
  } finally {f.dispose();}
});

test('C reflection adds bounded draw calls with no shadows or continuous wake', () => {
  const f=doorFixture(); try {
    const art=f.group.getObjectByName('rear-door-paper-moon');
    let draws=0, lights=0;
    const state=()=>{const result=[];art.traverse(o=>result.push([o.uuid,...o.position.toArray(),...o.rotation.toArray(),...o.scale.toArray(),o.visible,o.material?.opacity]));return result;};
    art.traverse(o=>{
      if(o.isMesh||o.isLine) {
        const materials=Array.isArray(o.material)?o.material:[o.material];
        // Three renders transparent DoubleSide materials twice unless the
        // planar artwork explicitly opts into a single pass. Count passes,
        // not scene objects, so the draw budget matches the renderer.
        for(const material of materials)draws+=material.transparent&&material.side===THREE.DoubleSide&&!material.forceSinglePass?2:1;
      }
      if(o.isLight) {lights++;assert.equal(o.castShadow,false);}
    });
    assert.ok(draws<=8); assert.equal(lights,1);
    for(const name of ['rear-door-moon-reflection','rear-door-warm-reflection']) {
      const reflection=art.getObjectByName(name), box=new THREE.Box3().setFromObject(reflection);
      assert.ok(box.min.y>JIANGNAN_DOOR.waterY&&box.max.y<JIANGNAN_DOOR.waterY+.01);
      assert.ok(box.min.z>JIANGNAN_DOOR.landing.z+JIANGNAN_DOOR.landing.depth);
      assert.equal(reflection.castShadow,false);assert.equal(reflection.material.depthWrite,false);assert.equal(reflection.material.forceSinglePass,true);
    }
    const before=state(), wakes=f.wakes;
    for(const still of [false,true,false]) {f.setStill(still);for(const t of [0,.1,1,100,10000])f.door.update(t);}
    assert.deepEqual(state(),before); assert.equal(f.wakes,wakes);assert.equal(f.door.moving,false);
    assert.equal(f.door.shadowRefresh(),false);
  } finally {f.dispose();}
});

test('every C geometry and material belongs to the world disposal set exactly once', () => {
  const f=doorFixture(), owned=new Set(), disposed=new Map();
  const art=f.group.getObjectByName('rear-door-paper-moon');
  art.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])owned.add(m);});
  for(const resource of owned) {
    assert.ok(f.resources.has(resource),'no detached GPU resource escapes the world owner');
    resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
  }
  const light=art.getObjectByName('rear-door-water-moonlight'), originalShadowDispose=light.shadow.dispose.bind(light.shadow);
  let shadowDisposals=0; assert.ok(f.resources.has(light),'the shadow-free practical light also has an owner');
  light.shadow.dispose=()=>{shadowDisposals++;originalShadowDispose();};
  f.dispose();
  for(const resource of owned)assert.equal(disposed.get(resource),1);
  assert.equal(shadowDisposals,1,'the light shadow holder is released once too');
  const after=new THREE.Box3().setFromObject(art);f.door.update(100);
  assert.ok(new THREE.Box3().setFromObject(art).equals(after),'disposed updates cannot move the artwork');
});

test('the threshold view includes both door jambs and keeps the small paper fish below the top edge',()=>{
 const f=doorFixture();try{
  f.setStill(true);f.door.open();f.group.updateMatrixWorld(true);
  const paper=f.group.getObjectByName('rear-door-folded-paper'),positions=paper.geometry.attributes.position;
  for(const aspect of [1440/900,390/844,320/568]){
   const p=jiangnanDoorPoses(aspect).threshold,camera=new THREE.PerspectiveCamera(p.fov,aspect,.04,160);
   camera.position.set(p.x,p.y,p.z);camera.rotation.order='YXZ';camera.rotation.set(p.pitch,p.yaw,0);camera.updateMatrixWorld(true);
   const points=[];
   for(let i=0;i<positions.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(paper.matrixWorld).project(camera));
   const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
   assert.ok(Math.max(...xs)-Math.min(...xs)<.70,'the fish occupies less than 35 percent of the frame width');
   assert.ok(Math.max(...ys)<.75&&Math.min(...ys)>-.75,'all paper folds have space above and below');
   for(const x of [JIANGNAN_DOOR.opening.minX,JIANGNAN_DOOR.opening.maxX]){
    const projected=new THREE.Vector3(x,1.3,JIANGNAN_DOOR.wall.z-.09).project(camera);
    assert.ok(Math.abs(projected.x)<.98,`both jambs remain in frame at ${aspect}`);
   }
  }
 }finally{f.dispose();}
});

test('rear water dissolves into the photographic river before its finite far edge',()=>{
 const f=doorFixture();try{
  const water=f.group.getObjectByName('quiet-blue-water'),positions=water.geometry.attributes.position,colors=water.geometry.attributes.color,rows=new Map();
  assert.equal(colors.itemSize,4);assert.equal(colors.count,positions.count);assert.ok(positions.count<=64,'the haze is a small subdivided version of the original plane');
  assert.equal(water.material.vertexColors,true);assert.equal(water.material.transparent,true);assert.equal(water.material.depthWrite,false);
  assert.match(THREE.ShaderChunk.color_fragment,/USE_COLOR_ALPHA/,'the vendored renderer supports RGBA vertex alpha');
  for(let i=0;i<positions.count;i++){
   const z=water.position.z-positions.getY(i),alpha=colors.getW(i);rows.set(z,alpha);
   assert.ok(Number.isFinite(alpha)&&alpha>=0&&alpha<=1);
   if(z<5.8)assert.equal(alpha,1,'the landing and near water remain solid');
   if(z>15.6)assert.equal(alpha,0,'the far boundary cannot cut an opaque horizontal line');
  }
  const ordered=[...rows].sort((a,b)=>a[0]-b[0]);let fades=0;
  for(let i=1;i<ordered.length;i++){
   const difference=ordered[i-1][1]-ordered[i][1];assert.ok(difference>=0&&difference<=.10,'the haze converges gradually with no alpha step');
   if(ordered[i][1]>0&&ordered[i][1]<1)fades++;
  }
  assert.ok(fades>=12,'the photographic hand-off spans many shallow-perspective rows');
 }finally{f.dispose();}
});

test('the moon keeps a softly transparent limb and restrained fixed surface tones',()=>{
 const f=doorFixture();try{
  const moon=f.group.getObjectByName('rear-door-distant-moon'),colors=moon.geometry.attributes.color;
  assert.equal(colors.itemSize,4);assert.equal(moon.material.vertexColors,true);assert.equal(moon.material.transparent,true);
  assert.equal(moon.material.depthWrite,false);assert.equal(moon.material.side,THREE.FrontSide);assert.ok(moon.material.opacity<.9);
  const alphas=[],tones=[];
  for(let i=0;i<colors.count;i++){alphas.push(colors.getW(i));tones.push(colors.getX(i));}
  assert.ok(alphas.some(a=>a===0)&&alphas.some(a=>a>0&&a<1)&&alphas.some(a=>a===1),'the curved limb softens into the background');
  assert.ok(Math.max(...tones)<.95&&Math.max(...tones)-Math.min(...tones)>.10,'the small moon has quiet shading rather than a solid white disk');
  assert.equal(moon.material.map,null,'the mist and tonal grain need no new texture');
 }finally{f.dispose();}
});
