import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/js/vendor/three.module.min.js';
import {createPracticalLightRamp} from '../assets/js/space/jiangnan-practical-light.mjs';

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
  const group=new THREE.Group(), resources=new Set(); let still=false, disposed=false;
  const door=buildJiangnanDoor({group,resources,still:()=>still,isDisposed:()=>disposed});
  return {group,door,setStill:value=>{still=value;},dispose(){disposed=true; for(const r of resources)r.dispose?.();}};
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

test('the real room keeps shadow refreshes for an immediate still toggle and door snap', () => {
  const f=roomFixture(); try {
    f.room.update(0); f.setStill(true); f.room.toggleObject('shelf-light');
    assert.equal(f.room.snapshotObjects().shelfLight,0); assert.equal(f.room.shadowRefresh(),true); assert.equal(f.room.shadowRefresh(),false);
    f.room.door.open(); f.room.update(0); assert.equal(f.room.door.openAmount,1);
    assert.equal(f.room.shadowRefresh(),true); assert.equal(f.room.shadowRefresh(),false);
    f.room.toggleObject('lamp'); assert.equal(f.room.snapshotObjects().tableLight,0); assert.equal(f.room.shadowRefresh(),true);
  } finally {f.dispose();}
});
