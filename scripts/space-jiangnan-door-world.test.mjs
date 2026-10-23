import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createJiangnanDoorExcursion, jiangnanDoorPoses} from '../assets/js/space/jiangnan-door-state.mjs';
import {jiangnanLook} from '../assets/js/space/jiangnan-state.mjs';
import {jiangnanWindowRoute} from '../assets/js/space/jiangnan-window-view.mjs';

// Exercise the actual world's async narrative. GPU travel, DOM and audio are
// boundaries; the production functions and state controller run unchanged.
const {parse}=createRequire(import.meta.url)('acorn');
const source=readFileSync(new URL('../assets/js/space/world-jiangnan.js',import.meta.url),'utf8');
const syntax=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const body=syntax.body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createCafeWorld').declaration.body.body;
const fn=name=>{const node=body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);assert.ok(node,name);return source.slice(node.start,node.end);};
const functions=['syncMode','resetInspection','syncDoorStill','hideDoorPanel','showDoorPanel','restoreRoomFromDoor','travelOrRecover','resumeCafe',
  'returnFromDoor','escapeDoorExcursion','abandonDoorExcursion','beginDoorExcursion','approachDoor','stepOutOfDoor','focus','leave','restoreInspection'];
const originalPose={x:.5,y:1.34,z:1.25,yaw:.8,pitch:.1,fov:48};

function fixture({inspectionKind=null,viewPose=originalPose,inspectionPose=originalPose}={}) {
  let now=0,id=0; const timers=new Map(), mixes=[], doorActions=[], nodes=[];
  const document={};
  class Element extends EventTarget {
    constructor(tag='div') {super();this.tagName=tag;this.children=[];this.dataset={};this.classList={add(){},toggle(){}};this.isConnected=true;nodes.push(this);}
    append(...nodes){this.children.push(...nodes);}
    setAttribute(){} closest(){return null;} getClientRects(){return [{}];}
    remove(){this.isConnected=false;}
    querySelector(selector){return this.children.flatMap(node=>[node,...node.children]).find(node=>node.tagName===selector)||null;}
    focus(){document.activeElement=this;}
  }
  document.body=new Element('body');document.createElement=tag=>new Element(tag);document.activeElement=new Element('button');
  const originalFocus=document.activeElement,root=new Element(),canvas=new Element('canvas'),workspace=new Element(); root.hidden=false;workspace.dataset.surface='monitor';
  const schedule=(callback,delay)=>{const key=++id;timers.set(key,{at:now+delay,callback});return key;};
  const runtime=`
    let pose={...initialPose},mode=initialInspection?'inspect':'roam',inspection=initialInspection?{kind:initialInspection,pose:{...inspectionPose}}:null;
    let doorReturn=null,doorPanel=null,quiet=false,drag=null,moving=null,disposed=false;
    let returnPose={x:1.2,y:1.34,z:1.65,yaw:0,pitch:0,fov:48},returnInspection=null;
    const keys=new Set(),touchKeys=new Set();
    const excursion=makeMachine({onPhase:phase=>{root.dataset.roomDoorState=phase;},still:()=>quiet||reduced.matches});
    async function travel(to,duration,finish){await Promise.resolve();pose={...to};finish?.();return true;}
    const roomView=()=>inspection?.kind==='window';
    ${functions.map(fn).join('\n')}
    ({begin:beginDoorExcursion,step:stepOutOfDoor,back:returnFromDoor,escape:escapeDoorExcursion,abort:abandonDoorExcursion,
      focus,leave,inspectBack:restoreInspection,
      pause(value){excursion.setPaused(value);},
      setStill(value){quiet=value;syncDoorStill();},
      get phase(){return excursion.phase;},get mode(){return mode;},get pose(){return pose;},get panel(){return doorPanel;},get inspection(){return inspection;},
      dispose(){disposed=true;excursion.dispose();hideDoorPanel();doorReturn=null;}
    });`;
  const camera={aspect:1.6};
  const world=runInNewContext(runtime,{initialPose:viewPose,inspectionPose,initialInspection:inspectionKind,root,document,Element,workspace,
    makeMachine:options=>createJiangnanDoorExcursion({...options,now:()=>now,setTimer:schedule,clearTimer:key=>timers.delete(key)}),
    jiangnanDoorPoses,jiangnanLook,jiangnanWindowRoute,camera,renderer:{domElement:canvas},reduced:{matches:false},objectControls:{inert:false},magicClock:null,
    computerView:()=> 'expanded',showComputer(){workspace.dataset.surface='desktop';},attachMonitor(){workspace.dataset.surface='monitor';},
    visible:()=>true,isBlocked:()=>false,onInspect(){},listen:(node,event,callback)=>node.addEventListener(event,callback),t:cn=>cn,
    audio:{setPerspective:mix=>mixes.push(mix)},room:{screen:{position:[.8,1.16,-2.05]},door:{open:()=>doorActions.push('open'),close:()=>doorActions.push('close'),splash:()=>doorActions.push('splash')}}});
  async function pump(ms=0) {
    const target=now+ms;
    // Every zero-delay visibility gate and Promise continuation is allowed its
    // own microtask turn, exactly as with successive browser task boundaries.
    for(let pass=0;pass<20;pass++) {
      await Promise.resolve();
      for(const [key,timer] of [...timers]) if(timer.at<=target){now=Math.max(now,timer.at);timers.delete(key);timer.callback();}
    }
    now=target;
  }
  return {world,document,originalFocus,workspace,canvas,camera,timers,mixes,doorActions,pump};
}

test('rotating during approach or opening uses the current portrait framing at the threshold',async()=>{
  for(const during of ['approach','opening']){
    const f=fixture();f.world.begin();
    if(during==='opening'){await f.pump();assert.equal(f.world.phase,'opening');}
    f.camera.aspect=390/844;
    await f.pump();await f.pump(680);
    assert.equal(f.world.phase,'threshold');
    assert.deepEqual({...f.world.pose},jiangnanDoorPoses(390/844).threshold);
    f.world.back();await f.pump();assert.deepEqual({...f.world.pose},originalPose);
  }
});

test('the real world requires a second deliberate step before the splash, and returns pose, focus and audio', async () => {
  const f=fixture(); assert.equal(f.world.begin(),true); assert.equal(f.world.begin(),false);
  await f.pump(); assert.equal(f.world.phase,'opening'); assert.deepEqual(f.doorActions,['open']);
  await f.pump(680); assert.equal(f.world.phase,'threshold'); assert.ok(f.world.panel); assert.equal(f.world.mode,'excursion');
  assert.equal(f.doorActions.includes('splash'),false);
  f.world.step(); f.world.step(); await f.pump(); assert.equal(f.world.phase,'submerged');
  assert.deepEqual(f.doorActions,['open','splash']); assert.equal(f.world.panel.dataset.doorPanel,'submerged');
  f.world.back(); await f.pump(); assert.equal(f.world.phase,'indoor'); assert.equal(f.world.mode,'roam');
  assert.deepEqual({...f.world.pose},originalPose); assert.equal(f.document.activeElement,f.originalFocus); assert.equal(f.world.panel,null);
  assert.deepEqual(f.mixes.map(mix=>({...mix})),[{music:.64,rain:1},{music:.12,rain:.34},{music:1,rain:1}]);
  assert.equal(f.timers.size,0);
});

test('the world freezes its opening while hidden and remains escapable after quiet changes', async () => {
  const f=fixture({inspectionKind:'coffee'}); f.world.begin(); await f.pump(); assert.equal(f.world.phase,'opening');
  f.world.pause(true); await f.pump(5000); assert.equal(f.world.phase,'opening'); assert.equal(f.world.panel,null);
  f.world.setStill(true); await f.pump(2000); assert.equal(f.world.phase,'opening');
  f.world.pause(false); await f.pump(); assert.equal(f.world.phase,'threshold');
  f.world.escape(); await f.pump(); assert.equal(f.world.phase,'indoor'); assert.equal(f.world.mode,'inspect');
  assert.equal(f.world.inspection.kind,'coffee'); assert.deepEqual({...f.world.pose},originalPose); assert.equal(f.timers.size,0);
});

test('Escape wins during the opening beat and a new visit has no stale threshold panel', async () => {
  const f=fixture(); f.world.begin(); await f.pump(); assert.equal(f.world.phase,'opening');
  f.world.escape(); await f.pump(); assert.equal(f.world.phase,'indoor');
  f.world.begin(); await f.pump(); assert.equal(f.world.phase,'opening');
  await f.pump(679); assert.equal(f.world.phase,'opening'); assert.equal(f.world.panel,null);
  await f.pump(1); assert.equal(f.world.phase,'threshold');
  f.world.back(); await f.pump(); assert.equal(f.timers.size,0);
});

test('disposing during the awaited opening removes timers and cannot recreate its panel', async () => {
  const f=fixture(); f.world.begin(); await f.pump(); f.world.dispose();
  assert.equal(f.timers.size,0); await f.pump(8000); assert.equal(f.world.panel,null); assert.equal(f.world.phase,'indoor');
});

test('a workspace shortcut during a door beat returns to the pre-door roam pose instead of a stale entry pose', async () => {
  const beforeDoor={x:-1,y:1.34,z:0,yaw:.5,pitch:.1,fov:48};
  const f=fixture({viewPose:beforeDoor});f.world.begin();await f.pump();assert.equal(f.world.phase,'opening');
  assert.notDeepEqual({...f.world.pose},beforeDoor);
  await f.world.focus();assert.equal(f.world.phase,'indoor');assert.equal(f.world.mode,'workspace');
  assert.equal(f.workspace.dataset.surface,'desktop');assert.equal(f.timers.size,0);assert.equal(f.world.panel,null);
  await f.world.leave();assert.equal(f.workspace.dataset.surface,'monitor');assert.equal(f.world.mode,'roam');
  assert.deepEqual({...f.world.pose},beforeDoor);assert.equal(f.document.activeElement,f.canvas);
  await f.pump(2000);assert.equal(f.world.panel,null);assert.deepEqual({...f.world.pose},beforeDoor);
});

test('a shortcut from the doorway restores the original window inspection and its own retreat pose', async () => {
  const windowView={x:.1,y:1.5,z:-1.9,yaw:-.05,pitch:.1,fov:58};
  const roomPose={x:1,y:1.34,z:.6,yaw:.2,pitch:0,fov:48};
  const f=fixture({inspectionKind:'window',viewPose:windowView,inspectionPose:roomPose});
  f.world.begin();await f.pump();await f.pump(680);assert.equal(f.world.phase,'threshold');
  await f.world.focus();assert.equal(f.world.mode,'workspace');assert.equal(f.world.phase,'indoor');
  await f.world.leave();assert.equal(f.world.mode,'inspect');assert.equal(f.world.inspection.kind,'window');
  assert.deepEqual({...f.world.pose},windowView);assert.deepEqual({...f.world.inspection.pose},roomPose);
  await f.world.inspectBack();assert.equal(f.world.mode,'roam');assert.deepEqual({...f.world.pose},roomPose);
  assert.equal(f.timers.size,0);
});

test('ordinary workspace entry retains existing roam and inspection return semantics', async () => {
  const roomPose={x:-.7,y:1.34,z:.5,yaw:.4,pitch:0,fov:48};
  for(const kind of [null,'coffee','window']) {
    const f=fixture({inspectionKind:kind,viewPose:originalPose,inspectionPose:roomPose});
    await f.world.focus();assert.equal(f.world.mode,'workspace');
    await f.world.leave();
    assert.equal(f.world.mode,kind==='window'?'inspect':'roam');
    assert.deepEqual({...f.world.pose},kind==='coffee'?roomPose:originalPose);
    assert.equal(f.world.inspection?.kind??null,kind==='window'?'window':null);
  }
});
