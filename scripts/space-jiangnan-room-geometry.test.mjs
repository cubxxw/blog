import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/js/vendor/three.module.min.js';
import {JIANGNAN_WINDOW,JIANGNAN_DESK,JIANGNAN_WORKSTATION} from '../assets/js/space/jiangnan-layout.mjs';

// A canvas data surface is enough for geometry tests; browser rendering owns
// the visual checks. The real Three meshes, matrices, lights and raycaster run.
function canvas() {
  const canvas = {width:0, height:0};
  let pixels;
  const context = new Proxy({
    createImageData(w,h) {return {data:new Uint8ClampedArray(w*h*4), width:w,height:h};},
    getImageData(x,y,w,h) {return pixels || this.createImageData(w,h);},
    putImageData(value) {pixels=value;},
    createLinearGradient() {return {addColorStop(){}};},
    createRadialGradient() {return {addColorStop(){}};}
  }, {get(target,key) {return key in target ? target[key] : () => {};}});
  canvas.getContext = () => context;
  return canvas;
}

const roomSource = (await readFile(new URL('../assets/js/space/jiangnan-room.js', import.meta.url),'utf8'))
  .replace("from 'three'", `from '${new URL('../assets/js/vendor/three.module.min.js',import.meta.url).href}'`)
  .replace("from './jiangnan-state.mjs'", `from '${new URL('../assets/js/space/jiangnan-state.mjs',import.meta.url).href}'`)
  .replace("from './jiangnan-layout.mjs'", `from '${new URL('../assets/js/space/jiangnan-layout.mjs',import.meta.url).href}'`)
  .replace("from './jiangnan-floor.mjs'", `from '${new URL('../assets/js/space/jiangnan-floor.mjs',import.meta.url).href}'`)
  .replace("from './jiangnan-cat-grounding.mjs'", `from '${new URL('../assets/js/space/jiangnan-cat-grounding.mjs',import.meta.url).href}'`)
  .replace("from './jiangnan-timber-finish.mjs'", `from '${new URL('../assets/js/space/jiangnan-timber-finish.mjs',import.meta.url).href}'`)
  .replace("from './jiangnan-lighting.mjs'", `from '${new URL('../assets/js/space/jiangnan-lighting.mjs',import.meta.url).href}'`)
  .replace("from './jiangnan-furnishings-state.mjs'", `from '${new URL('../assets/js/space/jiangnan-furnishings-state.mjs',import.meta.url).href}'`);
const {buildJiangnanRoom} = await import('data:text/javascript;base64,'+Buffer.from(roomSource).toString('base64'));
const pendingImages = [];
globalThis.document = {createElement:canvas};
const originalLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function(url,onLoad) {pendingImages.push({url,onLoad}); return new THREE.Texture();};
const resources = new Set(), textures = new Set();
let disposed = false;
const records = [{id:'night-jazz',title:'夜雨爵士',cover:'/images/local-jazz.webp'}, {id:'quiet-piano',title:'Piano after rain'}, {id:'blue-hour',title:'Blue hour'}];
const room = buildJiangnanRoom({scene:new THREE.Scene(), pbr:{bind(){}}, resources, textures, wake(){},
  books:[{id:'real-book',title:'一本真实的书'}], records, isDisposed:()=>disposed});
room.group.updateMatrixWorld(true);
const action = object => {for (let n=object;n;n=n.parent) if(n.userData.action) return n.userData.action;return null;};
function rayHit(from,to) {
  const origin = new THREE.Vector3(...from), direction = new THREE.Vector3(...to).sub(origin).normalize();
  return new THREE.Raycaster(origin,direction).intersectObject(room.group,true).find(hit => {
    const m=hit.object.material;
    return hit.object.visible && (hit.object.userData.action || !m?.transparent || m.opacity > .5);
  });
}

test('the working screen and photo keep their exact physical positions', () => {
  assert.deepEqual(room.screen, {position:[.8,1.16,-2.05],width:.8,height:.5});
  assert.equal(action(rayHit([.8,1.16,-1],room.screen.position).object),'computer');
  assert.deepEqual(room.targets.photo,[1.59,.98,-1.76]);
  const display=room.group.getObjectByName('physical-computer').children.find(o=>o.geometry?.type==='PlaneGeometry'&&o.geometry.parameters.width===.8);
  assert.ok(display);
  assert.ok(display.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(.8,1.16,-2.052))<1e-6);
});

test('the centred desk physically supports the complete workstation at its lower height', () => {
  const top=room.group.getObjectByName('aged-elm-desk-top');assert.ok(top);
  const bounds=new THREE.Box3().setFromObject(top);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).x-JIANGNAN_DESK.centerX)<.005);
  assert.ok(Math.abs(bounds.max.y-JIANGNAN_DESK.topY)<.001);
  assert.ok(bounds.max.z<=JIANGNAN_DESK.frontZ+.015&&bounds.min.z>=JIANGNAN_DESK.backZ-.015);
  for(const key of ['lamp','coffee','vase','keyboard','mouse','notebook','pencilPot','postcards']) {
    const [x,,z]=JIANGNAN_WORKSTATION[key];
    const hit=new THREE.Raycaster(new THREE.Vector3(x,.79,z),new THREE.Vector3(0,-1,0),0,.12).intersectObject(top)[0];
    assert.ok(hit, key+' has no desk beneath it');assert.ok(Math.abs(hit.point.y-.76)<.001);
  }
  for(const name of ['mac-foot-support','coffee-saucer','lamp-foot-support','handscooped-elm-seat'])assert.ok(room.group.getObjectByName(name),name);
  for(const name of ['mac-foot-support','coffee-saucer','lamp-foot-support','photo-stand-support']) {
    const base=new THREE.Box3().setFromObject(room.group.getObjectByName(name));
    assert.ok(base.min.y>=.757&&base.min.y<=.767,name+' must rest on the desk');
  }
});

test('a front-sided seat catches the near outer rim, and its entry target hits physical chair wood',()=>{
  const seat=room.group.getObjectByName('handscooped-elm-seat');
  assert.equal(seat.material.side,THREE.FrontSide);
  const hit=new THREE.Raycaster(new THREE.Vector3(1.3,.45,-.95),new THREE.Vector3(-1,0,0)).intersectObject(seat)[0];
  assert.ok(hit);assert.ok(hit.point.x>1.04&&hit.distance<.27,`the near rim was culled: x=${hit.point.x}, distance=${hit.distance}`);
  const entryHit=rayHit([1,1.42,1.6],room.targets.seat);
  assert.equal(action(entryHit?.object),'seat');
});

function assertChairFeetSupported(chair) {
  const feet=new Map(['front-left','front-right','rear-left','rear-right'].map(name=>[name,[]]));
  chair.traverse(object=>{
    if(!object.isMesh)return;
    const vertices=object.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const local=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld);
      const relative=chair.worldToLocal(local.clone());
      if(relative.y>.07||Math.abs(relative.x)<.20||Math.abs(relative.z)<.15)continue;
      feet.get(`${relative.z<0?'front':'rear'}-${relative.x<0?'left':'right'}`).push(local);
    }
  });
  const measured=[];
  for(const [name,vertices] of feet){
    assert.ok(vertices.length>=8,`${name} needs a solid foot, not a contact marker`);
    const lowest=vertices.reduce((a,b)=>a.y<b.y?a:b);
    // Intersect the room's real supporting meshes, including floor instances.
    const hits=new THREE.Raycaster(new THREE.Vector3(lowest.x,.065,lowest.z),new THREE.Vector3(0,-1,0),0,.08)
      .intersectObject(room.group,true).filter(hit=>{for(let node=hit.object;node;node=node.parent)if(node===chair)return false;return true;});
    assert.ok(hits.length,`${name} has no actual supporting surface`);
    const supportY=hits[0].point.y,expectedY=name.startsWith('front')?.0055:.023;
    assert.ok(Math.abs(supportY-expectedY)<.00001,`${name} is on the wrong surface: ${supportY}`);
    measured.push({foot:name,bottomY:lowest.y,supportY,gapMm:(lowest.y-supportY)*1000});
    assert.ok(Math.abs(lowest.y-supportY)<=.001,`${name} floats or penetrates by ${(lowest.y-supportY)*1000} mm`);
    const sole=vertices.filter(vertex=>Math.abs(vertex.y-supportY)<=.0001);
    assert.ok(sole.length>=8,`${name} must have a flat cut supporting face`);
    const soleCenter=sole.reduce((sum,vertex)=>sum.add(vertex),new THREE.Vector3()).divideScalar(sole.length);
    const underHit=new THREE.Raycaster(soleCenter.clone().add(new THREE.Vector3(0,-.002,0)),new THREE.Vector3(0,1,0),0,.004)
      .intersectObject(chair,true)[0];
    assert.ok(underHit&&Math.abs(underHit.point.y-supportY)<.0001,`${name} has an open bottom`);
  }
  return measured;
}

test('each working-chair foot meets its actual floor or rug without moving the seat', t => {
  const chair=room.group.getObjectByName('curved-wood-desk-chair');
  const measured=assertChairFeetSupported(chair);
  const seat=room.group.getObjectByName('handscooped-elm-seat');
  const seatCenter=new THREE.Raycaster(new THREE.Vector3(.8,.5,-.95),new THREE.Vector3(0,-1,0),0,.1).intersectObject(seat)[0];
  assert.ok(seatCenter&&Math.abs(seatCenter.point.y-.455)<.00001,'the carved seat must stay at its canonical height');
  assert.ok(chair.position.distanceTo(new THREE.Vector3(.8,0,-.95))<.00001);
  t.diagnostic(JSON.stringify(measured));
});

test('the warm cat nook fits beneath the paper window and supports its cushion', () => {
  const bed=room.group.getObjectByName('walnut-cat-nest');assert.ok(bed);
  const bounds=new THREE.Box3().setFromObject(bed,true);
  assert.ok(bounds.max.x<-.5&&bounds.min.x>-2.35&&bounds.max.z< -1.5);
  assert.ok(bounds.min.y>=0&&bounds.min.y<.02);
  assert.equal(action(rayHit([1.2,1.34,1.65],room.targets['cat-bed'])?.object),'cat-bed');
  assert.ok(room.catSupport.sample(-1.45,-1.93)>.1,'the resident must rest on its cushion, not hover above the floor');
  const floor=room.catSupport.sample(-.75,-.85);assert.ok(floor<.04,'the old chair position must be walkable');
});

test('the pendulum dial displays the shared room time while physical animation keeps its real speed',()=>{
  room.update(100,{seconds:36000});const a=room.snapshotObjects();
  assert.ok(Math.abs(a.hourHand+5*Math.PI/3)<1e-9);assert.ok(Math.abs(a.minuteHand+20*Math.PI)<1e-9);
  room.update(101,{seconds:39600});const b=room.snapshotObjects();
  assert.ok(Math.abs(b.hourHand-a.hourHand+Math.PI/6)<1e-9);
  assert.ok(Math.abs(b.minuteHand-a.minuteHand+2*Math.PI)<1e-9);
});

test('the rug has one bounded batch of fine fringe rooted in its real edge', t => {
  const meshes=[];
  room.group.traverse(object=>{if(object.isMesh)meshes.push({object,bounds:new THREE.Box3().setFromObject(object)});});
  const fringeMeshes=meshes.filter(({bounds:b})=>b.max.y<.03&&b.max.y>.008&&b.min.z<-.84&&b.max.z>1.68&&b.max.x-b.min.x>4.3);
  assert.equal(fringeMeshes.length,1,'all cotton threads should share one draw');
  const fringe=fringeMeshes[0].object,g=fringe.geometry,vertices=g.attributes.position,index=g.index;
  const threads=new Map();
  if(fringe.isInstancedMesh){
    for(let instance=0;instance<fringe.count;instance++){
      const matrix=new THREE.Matrix4();fringe.getMatrixAt(instance,matrix);matrix.premultiply(fringe.matrixWorld);
      threads.set(instance,Array.from({length:vertices.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix)));
    }
  }else{
    const parents=Array.from({length:vertices.count},(_,i)=>i);
    const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
    for(let i=0;i<index.count;i+=3)for(const j of [1,2])parents[root(index.getX(i+j))]=root(index.getX(i));
    for(let i=0;i<vertices.count;i++){
      const key=root(i);if(!threads.has(key))threads.set(key,[]);
      threads.get(key).push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(fringe.matrixWorld));
    }
  }
  assert.ok(threads.size>=600&&threads.size<=1200,`coarse separated marks: ${threads.size} threads`);
  const triangles=index.count/3*(fringe.isInstancedMesh?fringe.count:1);
  assert.ok(triangles<=18000,`fringe exceeds its triangle budget: ${triangles}`);
  const rug=meshes.find(({bounds:b})=>Math.abs(b.min.z+.83)<.00001&&Math.abs(b.max.z-1.67)<.00001&&Math.abs(b.max.y-.023)<.00001)?.object;
  assert.ok(rug,'there must be one real rug body');
  const lengths=[];
  for(const points of threads.values()){
    const bounds=new THREE.Box3().setFromPoints(points),front=bounds.getCenter(new THREE.Vector3()).z<.42;
    const edge=front?-.83:1.67;
    const anchor=points.reduce((a,b)=>front?(a.z>b.z?a:b):(a.z<b.z?a:b));
    const support=new THREE.Raycaster(new THREE.Vector3(anchor.x,.04,anchor.z),new THREE.Vector3(0,-1,0),0,.04).intersectObject(rug)[0];
    assert.ok(support&&support.point.y>=anchor.y,'thread root must enter actual rug fabric');
    assert.ok(Math.abs(anchor.z-edge)<.009,'thread root must be at the hem');
    assert.ok(bounds.max.x-bounds.min.x<.005,'thread must stay fine rather than become a thick stripe');
    assert.ok(bounds.min.y>=.0054&&bounds.min.y<.008,'thread tip must settle near the real wood floor');
    const length=front?edge-bounds.min.z:bounds.max.z-edge;
    assert.ok(length>.017&&length<.035,`unrestrained fringe length ${length}`);
    lengths.push(length);
  }
  assert.ok(Math.max(...lengths)-Math.min(...lengths)>.009,'cotton ends need natural length variation');
  assert.equal(fringe.castShadow,false);
  t.diagnostic(JSON.stringify({threads:threads.size,triangles,draws:fringeMeshes.length,minLength:Math.min(...lengths),maxLength:Math.max(...lengths)}));
});

test('the paper leaf has an actual wall opening and the main glass remains clear between its meeting frames',()=>{
  const paperHits=new THREE.Raycaster(new THREE.Vector3(-1.72,1.5,-3),new THREE.Vector3(0,0,1),0,.6).intersectObject(room.group,true);
  assert.ok(paperHits.length);assert.equal(paperHits[0].object.material.name,'warm-ivory-paper');
  const panoramaHits=new THREE.Raycaster(new THREE.Vector3(1.87,1.67,-2.40),new THREE.Vector3(0,0,-1),0,.3).intersectObject(room.group,true);
  assert.ok(panoramaHits.length);assert.equal(panoramaHits[0].object.material.transparent,true);
  const chair=room.group.getObjectByName('curved-wood-desk-chair');
  assert.ok(Math.abs(chair.position.x-.8)<.001&&Math.abs(chair.position.z+.95)<.001);
  const seat=new THREE.Box3().setFromObject(room.group.getObjectByName('handscooped-elm-seat'));
  assert.ok(seat.max.y>=.455&&seat.max.y<.48);
});

test('the actual meeting wood and clear glass share the window action',()=>{
  const frame=room.group.getObjectByName('paired-wood-window-sashes');assert.ok(frame,'missing the physical meeting frame');
  for(const x of [JIANGNAN_WINDOW.centerX-.009,JIANGNAN_WINDOW.centerX+.009]){
    const hit=rayHit([x,2,JIANGNAN_WINDOW.glassZ+.4],[x,2,JIANGNAN_WINDOW.glassZ-.1]);
    assert.equal(hit?.object,frame,'a ray at the meeting stile must hit actual wood');assert.equal(action(hit.object),'window','wood must not become an interaction dead point');
  }
  for(const x of [JIANGNAN_WINDOW.centerX,.3]){
    const hit=rayHit([x,2,JIANGNAN_WINDOW.glassZ+.4],[x,2,JIANGNAN_WINDOW.glassZ-.1]);
    assert.equal(hit?.object.name,'rain-window-glass');assert.equal(action(hit.object),'window');
  }
});

test('both lower sash guides have a real sill bed and physical side clearance around their tongues',t=>{
  const frame=room.group.getObjectByName('paired-wood-window-sashes');assert.ok(frame);
  const glass=room.group.getObjectByName('rain-window-glass'),glassBounds=new THREE.Box3().setFromObject(glass),bottom=glassBounds.min.y;
  const low=[],vertices=frame.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(frame.matrixWorld);
    // The lower, central solid vertices belong to the two guide tongues; the
    // long guide beads have their vertices at the ends of the full window.
    if(Math.abs(p.x-JIANGNAN_WINDOW.centerX)<.03&&p.y>=bottom-1e-6&&p.y<bottom+.003)low.push(p);
  }
  const down=z=>new THREE.Raycaster(new THREE.Vector3(glassBounds.max.x-.9,bottom+.025,z),new THREE.Vector3(0,-1,0),0,.05).intersectObject(room.group,true)[0];
  const sill=down(JIANGNAN_WINDOW.glassZ+.12);assert.ok(sill);const bed=sill.point.y;assert.ok(Math.abs(bed-bottom)<1e-6);
  const measured=[];
  for(const side of [-1,1]){
    const points=low.filter(p=>side*(p.x-JIANGNAN_WINDOW.centerX)>0);assert.ok(points.length>=8,'guide must be solid geometry');
    const tongue=new THREE.Box3().setFromPoints(points),z=tongue.getCenter(new THREE.Vector3()).z,inside=down(z);
    assert.ok(inside);assert.ok(Math.abs(inside.point.y-bed)<1e-6,'an old continuous stop must not fill the channel');assert.ok(Math.abs(tongue.min.y-bed)<1e-6,'the tongue must sit on the actual bed');
    const boundary=direction=>{for(let distance=.0001;distance<.025;distance+=.0001){const at=z+direction*distance,hit=down(at);if(hit&&hit.point.y>bed+.001)return at;}assert.fail('guide channel must have two actual raised sides');};
    const min=boundary(-1),max=boundary(1);assert.ok(tongue.min.z>min&&tongue.max.z<max,'guide tongue must fit between the real raised beads');
    measured.push({side,bedY:bed,clearanceMm:[(tongue.min.z-min)*1000,(max-tongue.max.z)*1000]});
  }
  t.diagnostic(JSON.stringify(measured));
});

test('the low sideboard, independent speaker and glazed clock are bounded solid constructions', () => {
  const sideboard = new THREE.Box3().setFromObject(room.group.getObjectByName('low-walnut-library-sideboard'));
  assert.ok(sideboard.max.y < 1.5, `sideboard top ${sideboard.max.y} should remain reachable`);
  assert.ok(sideboard.min.x >= -3.2 && sideboard.max.x < -2.4);
  const stand = new THREE.Box3().setFromObject(room.group.getObjectByName('independent-walnut-horn-speaker'));
  assert.ok(stand.max.y > 1.4 && stand.min.y > 0);
  assert.ok(stand.min.z > sideboard.max.z);
  const clock = room.group.getObjectByName('glazed-walnut-pendulum-clock');
  assert.ok(clock.children.some(o => o.material?.transparent));
  assert.ok(clock.getObjectByName('clock-pendulum-mechanism'));
});

test('real raycasts reach each sleeve, platter, speaker, lamp, fan and book action', () => {
  for (const album of records) {
    const target = room.targets['record:'+album.id];
    assert.equal(action(rayHit([-1.8,target[1],target[2]], target)?.object),'record:'+album.id);
  }
  const cases = [
    ['vinyl',[-1.8,1.55,-.50],room.targets.vinyl],
    ['vinyl',[2.25,1.14,1.25],room.targets.vinyl],
    ['speaker',[-1.6,1.31,.31],room.targets.speaker],
    ['lamp',[-.11,1.093,-1.05],room.targets.lamp],
    ['fan',[2.80,1.20,.4],room.targets.fan],
    ['clock',[-1.7,1.8,-.7],room.targets.clock],
    ['espresso',[-1.8,1.19,-2.095],room.targets.espresso],
    ['book:real-book',[-1.8,.68,-1.16],room.targets['book:real-book']]
  ];
  for(const [kind,from,target] of cases) assert.equal(action(rayHit(from,target)?.object),kind,kind);
});

for(const [view,origin] of [
  ['hardware',[1.2,1.34,1.65]],
  ['software',[2.25,1.14,1.25]],
  ['mobile',[-.9,1.18,-.05]]
])test(`the published vinyl target reaches the player from the ${view} view without selecting a record`,()=>{
  assert.equal(action(rayHit(origin,room.targets.vinyl)?.object),'vinyl');
});

test('the table lamp owns the single local shadow and turns off its complete light pool', () => {
  const localShadows=[];
  room.group.traverse(object=>{if(object.isLight&&object.castShadow)localShadows.push(object);});
  assert.equal(localShadows.length,1,'one practical light should own local shadows');
  const light=localShadows[0];
  assert.equal(light.isSpotLight,true,'a point-light cube would require six shadow passes');
  assert.equal(action(light),'lamp','the light must move with the physical lamp');
  assert.ok(light.position.y>.28&&light.position.y<.314,'light must sit below the open opal rim');
  assert.ok(light.shadow.normalBias<=.004,'centimetre-scale offsets detach chair shadows');
  assert.ok(light.shadow.camera.near<=.04&&light.shadow.camera.far<=4,'bound the shadow frustum to the room');
  const origin=light.getWorldPosition(new THREE.Vector3()),target=light.target.getWorldPosition(new THREE.Vector3());
  const hit=rayHit(origin.toArray(),target.toArray());
  // The Mac's physical foot sits on this part of the desk. It may receive the
  // beam, but the lamp's own stem and shade must not block it near the bulb.
  assert.ok(hit&&action(hit.object)!=='lamp'&&hit.distance>.3&&hit.point.y>=.759&&hit.point.y<.80,
    `downward beam obstruction: ${JSON.stringify({name:hit?.object.name,action:action(hit?.object),point:hit?.point.toArray()})}`);
  const lit=room.snapshotObjects();
  try {
    room.toggleObject('lamp');
    const dark=room.snapshotObjects();
    assert.equal(light.intensity,0);assert.equal(light.visible,false);
    assert.equal(dark.tablePool,0);assert.equal(dark.tablePoolVisible,false);
    assert.equal(dark.tableLight,0);assert.equal(dark.shadeEmissive,0);
  } finally { if(!room.snapshotObjects().lamp)room.toggleObject('lamp'); }
  assert.deepEqual(room.snapshotObjects(),lit,'switching back must restore the same physical state');
});

test('light switches change the actual local lights and emitters, while mechanisms follow the passed clock', () => {
  const originalEmitters=room.snapshotObjects().shelfEmitters;
  room.toggleObject('lamp'); room.toggleObject('shelf-light');
  const dark = room.snapshotObjects();
  assert.equal(dark.tableLight,0); assert.equal(dark.shadeEmissive,0); assert.equal(dark.shelfLight,0);
  assert.ok(dark.shelfEmitters.every(value=>value===0));
  room.toggleObject('lamp'); room.toggleObject('shelf-light');
  assert.ok(room.snapshotObjects().tableLight>0 && room.snapshotObjects().shelfLight>0);
  assert.deepEqual(room.snapshotObjects().shelfEmitters,originalEmitters,'shelf lamps must retain their distinct brightness after switching');
  room.update(0); room.setAudioState({playing:false,wanted:true,trackId:'blue-hour'}); room.update(.1);
  assert.equal(room.snapshotObjects().platterRotation,0); assert.equal(room.snapshotObjects().labelId,'blue-hour');
  room.setAudioState({playing:true,trackId:'night-jazz'}); room.toggleObject('espresso'); room.update(.2);
  const moving=room.snapshotObjects();
  assert.ok(moving.platterRotation>0); assert.notEqual(moving.rotorAngle,0); assert.notEqual(moving.pendulumRotation,0);
  assert.equal(moving.brewVisible,true);
  room.update(.2); assert.deepEqual(room.snapshotObjects(),moving);
});

test('book-spine lights sit below the solid counter and share the actual shelf-light switch', () => {
  const lights=[];
  room.group.traverse(o=>{if(o.isSpotLight&&o.userData.practical==='book')lights.push(o);});
  assert.equal(lights.length,2);
  for(const light of lights) {
    assert.ok(light.position.y<.889 && light.position.y>.85);
    assert.ok(light.position.x>-2.58 && light.position.x<-2.50);
    const from=light.getWorldPosition(new THREE.Vector3()),to=light.target.getWorldPosition(new THREE.Vector3());
    const hits=new THREE.Raycaster(from,to.clone().sub(from).normalize(),0,from.distanceTo(to)).intersectObject(room.group,true);
    assert.equal(hits.some(hit=>hit.point.y>=.889),false,'the cabinet counter must not occlude its own book light');
    assert.ok(light.intensity>0);
  }
  room.toggleObject('shelf-light');assert.ok(lights.every(light=>light.intensity===0));
  room.toggleObject('shelf-light');assert.ok(lights.every(light=>light.intensity>0));
});

test('the espresso machine has one real grouphead and its stream lands inside the cup', () => {
  const espresso=room.group.getObjectByName('vintage-espresso-corner');
  const heads=[];espresso.traverse(o=>{if(o.name==='single-espresso-grouphead')heads.push(o);});
  assert.equal(heads.length,1);
  const cup=espresso.getObjectByName('espresso-cup'),stream=espresso.getObjectByName('espresso-brew-stream');
  assert.ok(cup&&stream);
  const cupBounds=new THREE.Box3().setFromObject(cup),streamBounds=new THREE.Box3().setFromObject(stream);
  const streamCenter=streamBounds.getCenter(new THREE.Vector3());
  assert.ok(streamCenter.x>cupBounds.min.x&&streamCenter.x<cupBounds.max.x);
  assert.ok(streamCenter.z>cupBounds.min.z&&streamCenter.z<cupBounds.max.z);
  assert.ok(streamBounds.min.y<cupBounds.max.y+.003);
  assert.ok(espresso.getObjectByName('espresso-pressure-gauge'));
  assert.ok(espresso.getObjectByName('espresso-steam-wand'));
  assert.ok(room.group.getObjectByName('coffee-grinder-beans')?.isInstancedMesh);
});

test('all attached geometry, materials and textures have ownership and release including late images', t => {
  let meshes=0, vertices=0;
  room.group.traverse(o=>{
    if(!o.isMesh)return; meshes++;
    assert.ok(resources.has(o.geometry), 'unowned geometry');
    for(const material of Array.isArray(o.material)?o.material:[o.material]) {
      assert.ok(resources.has(material),'unowned material');
      for(const key of ['map','bumpMap','roughnessMap']) if(material[key]) assert.ok(textures.has(material[key]),'unowned '+key);
    }
    const position=o.geometry.attributes.position;
    for(const value of position.array) assert.ok(Number.isFinite(value),'non-finite vertex');
    vertices+=position.count;
  });
  assert.ok(meshes>100 && vertices>10000);
  let owned=0,released=0,shadowReleased=false;
  const pool=room.group.getObjectByName('table-opal-downlight');
  const shadowTarget=new THREE.WebGLRenderTarget(16,16);
  shadowTarget.addEventListener('dispose',()=>{shadowReleased=true;});
  pool.shadow.map=shadowTarget;
  for(const resource of new Set([...resources,...textures])) if(resource.addEventListener && resource.dispose) {
    owned++; resource.addEventListener('dispose',()=>released++);
  }
  disposed=true;
  for(const resource of resources)resource.dispose?.();
  for(const texture of textures)texture.dispose();
  assert.equal(released,owned);
  assert.equal(shadowReleased,true,'the GPU shadow target must be released with room-owned resources');
  const lateTexture=new THREE.Texture();let lateReleased=false;
  lateTexture.addEventListener('dispose',()=>lateReleased=true);
  pendingImages.find(request=>request.url==='/images/local-jazz.webp').onLoad(lateTexture);
  assert.equal(lateReleased,true); assert.equal(textures.has(lateTexture),false);
  t.diagnostic(JSON.stringify({meshes,vertices,owned,released,resources:resources.size,textures:textures.size}));
  THREE.TextureLoader.prototype.load=originalLoad;
});
