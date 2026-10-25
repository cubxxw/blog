import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createJiangnanDoorFade, JIANGNAN_DOOR_FADE_SECONDS} from '../assets/js/space/jiangnan-door-fade.mjs';
import {createJiangnanDoorExcursion} from '../assets/js/space/jiangnan-door-state.mjs';

test('the water preserves the original CSS ease and exact 480ms endpoints', () => {
  const writes=[];const fade=createJiangnanDoorFade({onChange:value=>writes.push(value)});
  assert.equal(JIANGNAN_DOOR_FADE_SECONDS,.48);fade.setPhase('submerged');
  assert.equal(fade.value,0);assert.equal(fade.pending,true);
  fade.update(.12);const first=fade.value;assert.ok(first>.4&&first<.42);
  fade.update(.12);assert.ok(Math.abs(fade.value-.8024033876)<1e-8);
  fade.update(.12);assert.ok(fade.value> .96&&fade.value<1);
  fade.update(.12);assert.equal(fade.value,1);assert.equal(fade.pending,false);
  const count=writes.length;assert.equal(fade.update(10),false);fade.setPhase('submerged');assert.equal(writes.length,count);
  fade.setPhase('returning');fade.update(.48);assert.equal(fade.value,0);assert.equal(fade.pending,false);
});

test('a reversal starts continuously from the displayed value and the same target does not restart it', () => {
  const fade=createJiangnanDoorFade();fade.setPhase('submerged');fade.update(.24);
  const at=fade.value;fade.setPhase('returning');assert.equal(fade.value,at);
  fade.update(.12);assert.ok(fade.value>0&&fade.value<at);
  fade.setPhase('indoor');fade.update(.36);assert.equal(fade.value,0);assert.equal(fade.pending,false);
  fade.setPhase('submerged');fade.update(.12);fade.setPhase('submerged');fade.update(.36);
  assert.equal(fade.value,1);assert.equal(fade.pending,false);
});

test('invalid or inactive deltas do not advance; one slow visible frame still reaches the target', () => {
  const fade=createJiangnanDoorFade();fade.setPhase('submerged');
  for(const delta of [NaN,Infinity,-1,0])assert.equal(fade.update(delta),false);
  assert.equal(fade.update(80,{active:false}),false);assert.equal(fade.value,0);
  fade.update(.24);assert.ok(fade.value>0&&fade.value<1);
  const at=fade.value;fade.update(100,{active:false});assert.equal(fade.value,at);
  fade.update(.24);assert.equal(fade.value,1);
  fade.setPhase('returning');fade.update(4);assert.equal(fade.value,0);assert.equal(fade.pending,false);
});

test('the first frame only charges time after the phase target actually changed', () => {
  const fade=createJiangnanDoorFade();fade.setPhase('submerged',{at:9.9});
  fade.update(4,{at:10});assert.ok(fade.value>0&&fade.value<.5);
  fade.update(.38,{at:10.38});assert.equal(fade.value,1);
  fade.setPhase('returning',{at:11});fade.update(.5,{at:10.9});assert.equal(fade.value,1);
  fade.update(.1,{at:11});assert.equal(fade.value,1);
  fade.update(.48,{at:11.48});assert.equal(fade.value,0);
});

test('resume only charges post-event time and repeated active notifications do not restart it', () => {
  const fade=createJiangnanDoorFade();fade.setPhase('submerged');fade.update(.12);const before=fade.value;
  fade.setActive(false,{at:1});assert.equal(fade.update(20,{at:21}),false);assert.equal(fade.value,before);
  fade.setActive(true,{at:21});fade.update(20,{at:21.01});assert.ok(fade.value>before&&fade.value<.5);
  fade.setActive(true,{at:21.2});fade.update(.35,{at:21.36});assert.equal(fade.value,1);assert.equal(fade.pending,false);
});

test('quiet, reduced motion, explicit abandonment and disposal settle without another frame', () => {
  let still=false;const writes=[];const fade=createJiangnanDoorFade({still:()=>still,onChange:value=>writes.push(value)});
  fade.setPhase('submerged');fade.update(.12);still=true;
  assert.equal(fade.update(0),true);assert.equal(fade.value,1);assert.equal(fade.pending,false);
  fade.setPhase('returning');assert.equal(fade.value,0);assert.equal(fade.pending,false);
  still=false;fade.setPhase('submerged');fade.update(.12);fade.setPhase('indoor',{instant:true});
  assert.equal(fade.value,0);assert.equal(fade.pending,false);
  fade.setPhase('submerged');fade.update(.12);fade.dispose();assert.equal(fade.value,0);assert.equal(fade.pending,false);
  const count=writes.length;fade.setPhase('submerged');assert.equal(fade.update(10),false);fade.dispose();assert.equal(writes.length,count);
});

// Execute the production phase callback and shared tick unchanged. WebGL/DOM
// rendering is stubbed at its boundary; all fade, visibility and scheduler
// decisions below are the actual world functions, not copied implementations.
const source=readFileSync(new URL('../assets/js/space/world-jiangnan.js',import.meta.url),'utf8');
const {parse}=createRequire(import.meta.url)('acorn');
const syntax=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const body=syntax.body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createCafeWorld').declaration.body.body;
const declaration=name=>{
  const node=body.find(node=>node.type==='VariableDeclaration'&&node.declarations.some(item=>item.id.name===name));
  assert.ok(node,name);return source.slice(node.start,node.end);
};
const fn=name=>{const node=body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);assert.ok(node,name);return source.slice(node.start,node.end);};
const blockedAssignment=body.filter(node=>node.type==='TryStatement').flatMap(node=>node.block.body).find(node=>node.type==='ExpressionStatement'&&node.expression.type==='AssignmentExpression'&&node.expression.left.name==='blockedObserver');
const blockedHandler=blockedAssignment.expression.right.arguments[0];

function worldFixture() {
  let now=10,shown=true,blocked=false,scheduled=0,cancelled=0,writes=0,timerId=0;const timers=new Map();
  const style={};Object.defineProperty(style,'opacity',{get(){return this._opacity;},set(value){this._opacity=value;writes++;}});
  const root={dataset:{worldPbrMaps:'12'}},water={style};
  const world=runInNewContext(`
    let shaderWarmup={ready:true,resume(){}};
    let quiet=false,disposed=false,frame=0,last=0,environmentTime=0,frames=1,moving=null,clockReturn=null,standbyClock=null;
    let mode='workspace',doorWater=water,doorReturn=null,doorPanel=null,drag=null;
    const keys=new Set(),touchKeys=new Set(),reduced={matches:false};
    const workspace={dataset:{surface:'desktop'}},renderer={};
    const room={update(){},shadowRefresh(){return false;},door:{close(){}},setAudioState(){}};
    const exterior={update(){},boat:{position:{x:0,y:0,z:0},rotation:{y:0}}};
    const roomLights={update(){}},magicClock=null,resident=null,css={render(){}},scene={},camera={};
    const objectControls={querySelector:()=>({textContent:'Look out the window'})};
    const audio={setPerspective(){}},roomTime={at:()=>({label:'22:00',rain:0,catRoutine:'rest'})};
    const reflectionDone=true,startTime=0,roomView=()=>false,navigate=()=>false;
    const t=(cn,en)=>en,publishObjects=()=>{},screenVisibility=()=>{},renderRoom=()=>({triangles:0,calls:0}),settleFirst=()=>{};
    const clearGestureState=()=>{},applyPose=()=>{},finishTravel=()=>{moving=null;};
    ${declaration('doorFade')}
    ${declaration('excursion')}
    ${['wake','stop','tick','visibility','syncDoorStill','hideDoorPanel','abandonDoorExcursion'].map(fn).join('\n')}
    const blockedChange=${source.slice(blockedHandler.start,blockedHandler.end)};
    // The camera boundary keeps its return flight running under a dialog, as
    // production does; only its GPU pose application is replaced here.
    function escapeDoorExcursion(){excursion.recover();moving={started:performance.now(),elapsed:0,duration:900,motion:{at:()=>({})}};}
    ({
      get phase(){return excursion.phase;},get pending(){return doorFade.pending;},get opacity(){return doorFade.value;},
      get elapsed(){return environmentTime;},get last(){return last;},
      get cameraElapsed(){return moving?.elapsed;},
      begin(){const run=excursion.begin();for(const phase of ['opening','threshold','falling','submerged'])excursion.advance(run,phase);},
      back(){excursion.advance(excursion.activeRun,'returning');},
      setMode(value){mode=value;},
      tick,visibility,blockedChange,abandon:abandonDoorExcursion,
      quiet(value){quiet=value;syncDoorStill();},reduced(value){reduced.matches=value;syncDoorStill();}
    });
  `,{root,water,createJiangnanDoorFade,createJiangnanDoorExcursion,
    visible:()=>shown,isBlocked:()=>blocked,performance:{now:()=>now*1000},
    setTimeout:(callback,ms)=>{timers.set(++timerId,{at:now+ms/1000,callback});return timerId;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:()=>++scheduled,cancelAnimationFrame:()=>{cancelled++;}});
  return {world,root,style,setNow(value){now=value;},tick(value){now=value;world.tick(value*1000);},
    visible(value){shown=value;world.visibility();},blocked(value){blocked=value;world.blockedChange();},
    advanceTimers(value){now=value;for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.callback();}},
    get scheduled(){return scheduled;},get cancelled(){return cancelled;},get writes(){return writes;}};
}

test('the production phase callback and tick present both fades and keep only a pending fade awake', () => {
  const f=worldFixture();f.world.begin();assert.equal(f.root.dataset.roomDoorState,'submerged');assert.equal(f.world.pending,true);
  f.tick(10);assert.equal(f.world.opacity,0);f.tick(10.24);assert.ok(f.world.opacity>0&&f.world.opacity<1);
  const afterMiddle=f.scheduled;f.tick(10.48);assert.equal(f.style.opacity,'1');assert.equal(f.world.pending,false);
  assert.equal(f.scheduled,afterMiddle,'an otherwise inactive room stops after the exact endpoint');
  f.world.back();assert.equal(f.world.opacity,1);f.tick(10.6);f.tick(10.84);assert.ok(f.world.opacity>0&&f.world.opacity<1);
  f.tick(11.08);assert.equal(f.style.opacity,'0');assert.equal(f.world.pending,false);
  assert.equal(f.world.elapsed,0,'the presentation does not depend on ambient scenery time');
});

test('production visibility removes hidden elapsed time, while quiet and reduced settle immediately', () => {
  for(const preference of ['quiet','reduced']){
    const f=worldFixture();f.world.begin();f.tick(10);f.tick(10.12);const before=f.world.opacity;
    f.visible(false);f.setNow(110);f.visible(true);f.tick(110);assert.equal(f.world.opacity,before);
    f.world[preference](true);assert.equal(f.style.opacity,'1');assert.equal(f.world.pending,false);
    f.world.back();assert.equal(f.style.opacity,'0');assert.equal(f.world.pending,false);
  }
});

test('the production target boundary excludes the old part of a slow world frame', () => {
  const f=worldFixture();f.world.setMode('roam');f.tick(5);f.setNow(5.9);f.world.begin();f.tick(6);
  assert.ok(f.world.opacity>0&&f.world.opacity<.5,'only the 100ms after submersion belongs to this fade');
  f.tick(6.38);assert.equal(f.style.opacity,'1');assert.equal(f.world.pending,false);
});

test('closing a dialog only spends post-unblock fade time while the return camera keeps its own clock', () => {
  const f=worldFixture();f.world.begin();f.tick(10);f.tick(10.48);assert.equal(f.world.opacity,1);
  f.setNow(10.49);f.blocked(true);assert.equal(f.world.phase,'returning');f.tick(10.5);
  assert.equal(f.world.opacity,1);assert.equal(f.world.last,10500);
  f.setNow(11.25);f.blocked(false);f.tick(11.26);
  assert.ok(f.world.opacity>.98&&f.world.opacity<1,'750ms behind the dialog must not complete the 480ms fade on the 10ms resume frame');
  assert.equal(f.world.pending,true);assert.ok(Math.abs(f.world.cameraElapsed-770)<1e-8,'the camera continues using its existing elapsed time');
  f.tick(11.5);assert.ok(f.world.opacity>0&&f.world.opacity<1);
  f.tick(11.73);assert.equal(f.style.opacity,'0');assert.equal(f.world.pending,false);
});

test('a production shortcut clears a partial water fade synchronously before expanded workspace can freeze the world', () => {
  const f=worldFixture();f.world.begin();f.tick(10);f.tick(10.24);assert.ok(f.world.opacity>0);
  assert.equal(f.world.abandon(),true);assert.equal(f.root.dataset.roomDoorState,'indoor');assert.equal(f.style.opacity,'0');assert.equal(f.world.pending,false);
  const writes=f.writes;assert.equal(f.world.abandon(),false);assert.equal(f.writes,writes);
  f.tick(20);assert.equal(f.style.opacity,'0');assert.equal(f.world.pending,false);
});

test('CSS supplies static fallback opacity and no competing water transition', () => {
  const css=readFileSync(new URL('../assets/css/space-cafe.css',import.meta.url),'utf8');
  const waterRules=[...css.matchAll(/([^{}]*\.space-cafe-door-water[^{}]*)\{([^{}]*)\}/g)];
  assert.ok(waterRules.some(([,selector,rule])=>!selector.includes('::after')&&/opacity:0/.test(rule)));
  assert.ok(waterRules.some(([,selector,rule])=>selector.includes('submerged')&&/opacity:1/.test(rule)));
  for(const [,selector,rule]of waterRules)assert.doesNotMatch(rule,/\btransition\s*:/,selector);
});

function deadlineFixture(){
 let now=0,id=0;const timers=new Map(),writes=[];let still=false;
 const fade=createJiangnanDoorFade({now:()=>now,setTimer:(callback,ms)=>{timers.set(++id,{callback,at:now+ms/1000});return id;},clearTimer:key=>timers.delete(key),still:()=>still,onChange:value=>writes.push(value)});
 return {fade,timers,writes,setStill:value=>{still=value;},advance(at){now=at;for(const [key,timer]of [...timers])if(timer.at<=now){timers.delete(key);timer.callback();}}};
}
test('a stalled GPU frame source cannot prevent either exact fade endpoint',()=>{
 const f=deadlineFixture();f.fade.setPhase('submerged',{at:0});assert.equal(f.timers.size,1);f.advance(.479);assert.equal(f.fade.value,0);f.advance(.48);assert.equal(f.fade.value,1);assert.equal(f.timers.size,0);
 f.fade.setPhase('returning',{at:.48});f.advance(.96);assert.equal(f.fade.value,0);assert.equal(f.timers.size,0);
});
test('deadline pauses preserve remaining visible time without charging rAF time twice',()=>{
 const f=deadlineFixture();f.fade.setPhase('submerged',{at:0});f.advance(.12);f.fade.update(.12,{at:.12});const before=f.fade.value;f.fade.setActive(false,{at:.12});assert.equal(f.timers.size,0);f.advance(100);assert.equal(f.fade.value,before);
 f.fade.setActive(true,{at:100});f.fade.setActive(true,{at:100});assert.equal(f.timers.size,1);f.advance(100.35);assert.equal(f.fade.value,before);f.advance(100.37);assert.equal(f.fade.value,1);assert.equal(f.timers.size,0);
});
test('reversal and disposal invalidate already delivered old deadline callbacks',()=>{
 const f=deadlineFixture();f.fade.setPhase('submerged');const old=[...f.timers.values()][0].callback;f.advance(.12);f.fade.update(.12);const value=f.fade.value;f.fade.setPhase('returning');old();assert.equal(f.fade.value,value);assert.equal(f.timers.size,1);
 const pending=[...f.timers.values()][0].callback;f.fade.dispose();const count=f.writes.length;pending();f.advance(1);assert.equal(f.writes.length,count);assert.equal(f.fade.value,0);assert.equal(f.timers.size,0);
});
test('ordinary frames and reduced motion retire the deadline without late writes',()=>{
 for(const mode of ['frame','reduced']){const f=deadlineFixture();f.fade.setPhase('submerged');const stale=[...f.timers.values()][0].callback;if(mode==='reduced')f.setStill(true);f.fade.update(.48,{at:.48});assert.equal(f.fade.value,1);assert.equal(f.timers.size,0);const count=f.writes.length;stale();f.advance(1);assert.equal(f.writes.length,count);}
});


test('the production phase callback completes the water layer without another GPU frame',()=>{
 const f=worldFixture();f.world.begin();assert.equal(f.world.opacity,0);const frames=f.scheduled;
 f.advanceTimers(10.48);assert.equal(f.world.opacity,1);assert.equal(f.style.opacity,'1');assert.equal(f.scheduled,frames,'DOM deadline does not wake the renderer');
 f.world.back();const returning=f.scheduled;f.advanceTimers(10.96);assert.equal(f.style.opacity,'0');assert.equal(f.scheduled,returning);
});
