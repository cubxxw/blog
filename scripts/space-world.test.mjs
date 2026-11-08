import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import { stepWalk, travelPose, screenFit, WORLD_COLLIDERS } from '../assets/js/space/world-state.mjs';
test('walking follows the view direction and diagonal walking has the same speed', () => {
  const start={x:0,z:4};
  const straight=stepWalk(start,0,{forward:1,right:0},.04,[]);
  const diagonal=stepWalk(start,0,{forward:1,right:1},.04,[]);
  assert.ok(straight.z<start.z);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z-4)-Math.abs(straight.z-4))<1e-8);
  assert.ok(stepWalk(start,-Math.PI/2,{forward:1},.04,[]).x>0);
});
test('walking stops at furniture and slides along it without entering the table', () => {
  const table=[{minX:1,maxX:3,minZ:1,maxZ:3}];
  const p=stepWalk({x:.7,z:2},0,{right:1,forward:1},1,table);
  assert.ok(p.x<=.78); assert.ok(p.z<2);
});
test('a resumed frame cannot teleport the visitor through a wall', () => {
  const start={x:0,z:4};
  const next=stepWalk(start,0,{forward:1},100,[]);
  assert.ok(Math.hypot(next.x,next.z-4)<.2);
  assert.ok(WORLD_COLLIDERS.length>3);
});
test('camera travel reaches its exact destination with no invalid positions', () => {
  const a={x:0,y:1.6,z:8,yaw:Math.PI-.1,pitch:0,fov:54};
  const b={x:3,y:2,z:4,yaw:-Math.PI+.1,pitch:.1,fov:38};
  assert.deepEqual(travelPose(a,b,0),a); assert.deepEqual(travelPose(a,b,1),b);
  const midway=travelPose(a,b,.5);
  assert.ok(Math.abs(midway.yaw-a.yaw)<.2,'travel uses the short rotation around the room');
  assert.ok(Object.values(midway).every(Number.isFinite));
});
test('the floating workspace fits narrow and wide cameras without changing private window coordinates', () => {
  for(const size of [{width:1440,height:900},{width:390,height:844}]) {
    const fit=screenFit(size);
    assert.ok(fit.distance>0 && fit.scale>0);
    assert.ok(fit.visibleFraction>.55 && fit.visibleFraction<.9);
  }
});

test('only an explicitly identified software WebGL renderer receives the bounded raster budget',async()=>{
  const {worldRenderBudget}=await import('../assets/js/space/world-render-budget.mjs');
  const gl=name=>({getExtension:()=>({UNMASKED_RENDERER_WEBGL:0x9246}),getParameter:()=>name});
  for(const name of ['ANGLE (Google, Vulkan SwiftShader Device)','llvmpipe (LLVM 18.1.8, 256 bits)','softpipe','Mesa swrast'])assert.deepEqual(worldRenderBudget(gl(name)),{maxPixels:384000,maxPixelRatio:1.5,shadowSize:512});
  for(const context of [undefined,{getExtension:()=>null},{getExtension(){throw new Error('privacy blocked');}},gl('ANGLE (NVIDIA GeForce RTX 4060)'),gl('Apple M3'),gl('')])assert.deepEqual(worldRenderBudget(context),{maxPixels:Infinity,maxPixelRatio:1.5,shadowSize:1536});
});

test('software resize and DPR changes never exceed the pixel limit while hardware retains the native capped drawing buffer',async()=>{
  const {worldRenderBudget,worldPixelRatio}=await import('../assets/js/space/world-render-budget.mjs'),soft=worldRenderBudget({getExtension:()=>({UNMASKED_RENDERER_WEBGL:1}),getParameter:()=> 'SwiftShader'}),normal=worldRenderBudget();
  for(const [width,height] of [[320,740],[390,844],[844,390],[1280,800],[1440,900],[3840,2160]])for(const dpr of [1,1.25,1.5,2,3]){
    const ratio=worldPixelRatio(width,height,dpr,soft);assert.ok(ratio>0&&ratio<=Math.min(dpr,1.5));assert.ok(Math.floor(width*ratio)*Math.floor(height*ratio)<=384000);assert.equal(worldPixelRatio(width,height,dpr,normal),Math.min(dpr,1.5));
  }
  assert.equal(worldPixelRatio(320,740,1,soft),1,'a small native viewport does not lose detail unnecessarily');
});


test('renderer capabilities are queried once per context without changing budgets',async()=>{
 const {worldRenderBudget}=await import('../assets/js/space/world-render-budget.mjs');let calls=0;
 const gl={getExtension:()=>({UNMASKED_RENDERER_WEBGL:1}),getParameter:()=>{calls++;return 'SwiftShader';}};
 const budget=worldRenderBudget(gl);assert.equal(worldRenderBudget(gl),budget);assert.equal(calls,1);
 assert.equal(worldRenderBudget({getExtension:()=>null}).maxPixels,Infinity);
 let first=true;const recovering={getExtension(){if(first){first=false;throw Error('temporary');}return {UNMASKED_RENDERER_WEBGL:1};},getParameter:()=> 'SwiftShader'};
 assert.equal(worldRenderBudget(recovering).maxPixels,Infinity);assert.equal(worldRenderBudget(recovering).maxPixels,384000);
});

// Execute the real Jiangnan tick: only geometry/GPU calls are narrow stubs.
// Loading assets must not spend whole-room renders that cannot satisfy boot.
function firstPaintScenario({maps=0,vista='image',pending=true,renderFails=false}={}){
 const source=readFileSync(new URL('../assets/js/space/world-jiangnan.js',import.meta.url),'utf8');
 const start=source.indexOf('  function tick(stamp){'),end=source.indexOf('\n  function visibility()',start);
 assert.ok(start>=0&&end>start);
 let now=0,renders=0,wakes=0;const settled=[],failures=[];
 const context=vm.createContext({
  frame:1,disposed:false,visible:()=>true,mode:'workspace',workspace:{dataset:{surface:'desktop'}},
  quiet:true,reduced:{matches:true},isBlocked:()=>true,moving:null,keys:new Set(),touchKeys:new Set(),last:0,
  clockReturn:null,environmentTime:0,frames:0,reflectionDone:false,firstPending:pending,startTime:0,
  root:{dataset:{worldPbrMaps:String(maps)}},performance:{now:()=>now},
  room:{update(){}},roomTime:{at:()=>({rain:0,catRoutine:'rest'})},roomLights:{update(){}},magicClock:null,standbyClock:null,resident:null,
  doorFade:{update(){},pending:false},objectControls:{querySelector:()=>({textContent:'Watch the scenery'})},t:(_cn,en)=>en,
  exterior:{vistaMode:vista,update(){},boat:{position:{x:0,y:0,z:0},rotation:{y:0}}},
  publishObjects(){},navigate:()=>false,roomView:()=>false,reflectRoom(){},screenVisibility(){},scene:{},camera:{},css:{render(){}},
  renderer:{setRenderTarget(){}},renderRoom(){renders++;if(renderFails)throw Error('Synthetic render failure');return {triangles:1,calls:1};},
  onFailure:error=>failures.push(error.code),settleFirst:value=>{settled.push(value);context.firstPending=false;},
  requestAnimationFrame(){throw Error('A blocked, stationary fixture must not spin');},wake(){wakes++;},
 });
 vm.runInContext(source.slice(start,end),context);
 return {context,settled,failures,get renders(){return renders;},get wakes(){return wakes;},tick(at){now=at;context.tick(at);}};
}

test('first paint waits for existing material readiness without submitting unusable full-room GPU frames',()=>{
 const f=firstPaintScenario();f.tick(100);
 assert.equal(f.renders,0);assert.deepEqual(f.settled,[]);assert.equal(f.context.root.dataset.worldReady,undefined);
 f.context.root.dataset.worldPbrMaps='5';f.context.wake();f.tick(200);
 assert.equal(f.wakes,1);assert.equal(f.renders,1);assert.deepEqual(f.settled,[true]);assert.equal(f.context.root.dataset.worldReady,'true');
});

test('first paint waits for the selected photographic vista and accepts the unchanged timed material fallback',()=>{
 const f=firstPaintScenario({maps:5,vista:'loading'});f.tick(100);
 assert.equal(f.renders,0);assert.deepEqual(f.settled,[]);
 f.context.exterior.vistaMode='image-preview';f.context.wake();f.tick(200);
 assert.equal(f.renders,1);assert.deepEqual(f.settled,[true]);
 const fallback=firstPaintScenario();fallback.tick(2300);
 assert.equal(fallback.renders,1);assert.deepEqual(fallback.settled,[true]);
});

test('asset-ready render failure cannot publish a ready frame and completed boot keeps normal rendering',()=>{
 const failure=firstPaintScenario({maps:5,renderFails:true});failure.tick(100);
 assert.equal(failure.renders,1);assert.deepEqual(failure.failures,['render']);assert.deepEqual(failure.settled,[false]);
 assert.equal(failure.context.root.dataset.worldReady,undefined);assert.equal(failure.context.root.dataset.worldRenderedMode,undefined);
 const running=firstPaintScenario({pending:false,vista:'loading'});running.tick(100);
 assert.equal(running.renders,1);assert.equal(running.context.root.dataset.worldRenderedMode,'workspace');assert.deepEqual(running.settled,[]);
});
