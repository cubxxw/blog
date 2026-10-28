import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {JIANGNAN_BOUNDS,JIANGNAN_COLLIDERS,jiangnanWalk,jiangnanLook,JIANGNAN_TARGETS,jiangnanBoat,canJiangnanNavigate,jiangnanDestination} from '../assets/js/space/jiangnan-state.mjs';

// Run the real nav listener with the browser focus boundary controlled. The
// browser regression separately checks :focus-within and physical hit testing.
function objectMenuEscape(options={}){
 const source=readFileSync(new URL('../assets/js/space/world-jiangnan.js',import.meta.url),'utf8');
 const {parse}=createRequire(import.meta.url)('acorn');
 let listener;
 const visit=node=>{
  if(!node||typeof node!=='object')return;
  if(node.type==='CallExpression'&&node.callee.name==='listen'&&node.arguments[0]?.name==='objectControls'&&node.arguments[1]?.value==='keydown')listener=node.arguments[2];
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
 };
 visit(parse(source,{ecmaVersion:'latest',sourceType:'module'}));assert.ok(listener,'object menu owns an Escape listener');
 const actions=[],state={mode:'roam',visible:true,blocked:false,phase:'indoor',...options};
 const handler=runInNewContext('('+source.slice(listener.start,listener.end)+')',{
  navigate:()=>canJiangnanNavigate(state),excursion:{phase:state.phase},
  renderer:{domElement:{focus:options=>actions.push(['focus',options.preventScroll])}},
 });
 return {actions,press(overrides={}){handler({key:'Escape',defaultPrevented:false,isComposing:false,keyCode:27,preventDefault(){actions.push('prevent');},stopPropagation(){actions.push('stop');},...overrides});}};
}

test('object-menu Escape consumes the key and returns focus to the existing canvas',()=>{
 const f=objectMenuEscape();f.press();assert.deepEqual(f.actions,['prevent','stop',['focus',true]]);
});
test('object-menu dismissal leaves composition and already-handled keys alone',()=>{
 for(const event of [{isComposing:true},{keyCode:229},{defaultPrevented:true},{key:'Enter'}]){
  const f=objectMenuEscape();f.press(event);assert.deepEqual(f.actions,[]);
 }
});
test('object-menu dismissal respects the real world navigation and door guards',()=>{
 for(const state of [{mode:'workspace'},{mode:'inspect'},{visible:false},{blocked:true},{phase:'threshold'},{phase:'opening'}]){
  const f=objectMenuEscape(state);f.press();assert.deepEqual(f.actions,[]);
 }
});

test('a touch floor destination follows the same bounded walk without crossing furniture',()=>{
 const p={x:0,y:1.43,z:1.5,yaw:.2,pitch:-.05,fov:57};
 const clear=jiangnanDestination({...p,x:2.2},{x:2.2,z:-1.5});assert.ok(clear.z<-1);assert.equal(clear.y,p.y);assert.equal(clear.yaw,p.yaw);
 const blocked=jiangnanDestination({...p,x:1.9},{x:1.9,z:-2});assert.ok(blocked.z>=JIANGNAN_COLLIDERS.find(b=>b.id==='desk').maxZ+.17);
 const outside=jiangnanDestination(p,{x:1e6,z:1e6});assert.ok(outside.x<=JIANGNAN_BOUNDS.maxX&&outside.z<=JIANGNAN_BOUNDS.maxZ);
 assert.deepEqual(jiangnanDestination(p,{x:NaN,z:0}),p);
});
test('the entire eased floor-tap segment retains furniture clearance on a grazing diagonal',()=>{
 const start={x:1.9,y:1.43,z:-.7,yaw:0,pitch:0,fov:60},end=jiangnanDestination(start,{x:-2.1,z:-1.4});
 for(let i=1;i<=200;i++){
  const x=start.x+(end.x-start.x)*i/200,z=start.z+(end.z-start.z)*i/200;
  assert.equal(JIANGNAN_COLLIDERS.some(b=>x>b.minX-.18&&x<b.maxX+.18&&z>b.minZ-.18&&z<b.maxZ+.18),false,`segment enters furniture at ${i}/200`);
 }
});
test('a floor-tap segment cannot cut the corner between valid axis steps',()=>{
 const start={x:-1.45,y:1.43,z:1.37,yaw:0,pitch:0,fov:60},end=jiangnanDestination(start,{x:.25,z:-.74});
 for(let i=1;i<=200;i++){
  const x=start.x+(end.x-start.x)*i/200,z=start.z+(end.z-start.z)*i/200;
  assert.equal(JIANGNAN_COLLIDERS.some(b=>x>b.minX-.18&&x<b.maxX+.18&&z>b.minZ-.18&&z<b.maxZ+.18),false);
 }
});

test('walking changes actual position, normalizes diagonal speed and stops at room walls',()=>{
  const start={x:0,y:1.55,z:1.7,yaw:0,pitch:0,fov:58};
  const a=jiangnanWalk(start,{forward:1},.04),b=jiangnanWalk(start,{forward:1,right:1},.04);
  assert.ok(a.z<start.z);assert.ok(Math.abs(Math.hypot(b.x-start.x,b.z-start.z)-Math.hypot(a.x-start.x,a.z-start.z))<1e-6);
  let p={...start,x:2.2};for(let i=0;i<300;i++)p=jiangnanWalk(p,{forward:1},.04);
  assert.ok(p.z>=JIANGNAN_BOUNDS.minZ);assert.ok(p.z<-1.6);assert.equal(p.y,1.55);
});
test('a visitor cannot walk through the desk or cabinetry and a long frame cannot tunnel',()=>{
  const box=JIANGNAN_COLLIDERS.find(b=>b.id==='desk');
  let p={x:1.9,y:1.55,z:.75,yaw:0,pitch:0,fov:58};
  for(let i=0;i<500;i++)p=jiangnanWalk(p,{forward:1},4);
  assert.ok(p.z>=box.maxZ+.17);assert.ok(p.x<JIANGNAN_BOUNDS.maxX);
  const out=jiangnanWalk({x:0,z:1.8,yaw:0},{forward:1},-1);assert.equal(out.z,1.8);
});
test('look poses point at physical screen/photo targets and the boat has continuous 3D motion',()=>{
  const p=jiangnanLook([-1.7,1.55,1.7],JIANGNAN_TARGETS.computer);
  assert.ok(p.yaw<0);assert.ok(p.pitch<0);assert.ok(Number.isFinite(p.fov));
  const a=jiangnanBoat(0),b=jiangnanBoat(1);assert.ok(b.x<a.x);assert.ok(Math.abs(b.y-a.y)<.08);assert.ok(a.z<-5);
});
test('quiet and reduced motion retain intentional navigation while dialogs and work pause input',()=>{
  assert.equal(canJiangnanNavigate({mode:'roam',visible:true,blocked:false,quiet:true,reduced:true}),true);
  for(const options of [{mode:'workspace',visible:true},{mode:'roam',visible:false},{mode:'roam',visible:true,blocked:true}])assert.equal(canJiangnanNavigate(options),false);
});
