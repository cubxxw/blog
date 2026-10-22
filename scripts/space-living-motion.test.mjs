import test from 'node:test';
import assert from 'node:assert/strict';
import {jiangnanBoat} from '../assets/js/space/jiangnan-state.mjs';
import {jiangnanWindowRoute,jiangnanWindowTravelPose,jiangnanWindowView} from '../assets/js/space/jiangnan-window-view.mjs';

test('the sampan wanders in both lake axes without wrapping or a sideways heading',()=>{
 const signs={left:false,right:false,near:false,far:false};let previous=jiangnanBoat(0,79);
 for(let time=.25;time<1800;time+=.25){
  const p=jiangnanBoat(time,79),dx=p.x-previous.x,dz=p.z-previous.z;
  assert.ok(Math.abs(p.x)<5.5&&p.z>-24&&p.z<-11,'the entire journey stays on open water');
  assert.ok(Math.hypot(dx,dz)<.075,'no teleport at a route boundary');
  if(dx<-.001)signs.left=true;if(dx>.001)signs.right=true;if(dz>.001)signs.near=true;if(dz<-.001)signs.far=true;
  assert.ok(Number.isFinite(p.yaw)&&Number.isFinite(p.speed));
  if(p.speed>.015){const along=(-Math.cos(p.yaw)*dx+Math.sin(p.yaw)*dz)/Math.hypot(dx,dz);assert.ok(along>.97,'the bow follows its direction of travel');}
  previous=p;
 }
 assert.deepEqual(signs,{left:true,right:true,near:true,far:true});
 assert.notDeepEqual(jiangnanBoat(40,79),jiangnanBoat(40,218),'each visit can have its own stable route');
 assert.deepEqual(jiangnanBoat(40,79),jiangnanBoat(40,79),'render cadence does not change a journey');
});

test('window aisle corners change direction gently rather than hitting a hard elbow',()=>{
 const from={x:2.4,y:1.34,z:-.8,yaw:0,pitch:0,fov:48},to=jiangnanWindowView(1.6),route=jiangnanWindowRoute(from,to);
 let previous=from,velocity=null;
 for(let i=1;i<1000;i++){
  const p=jiangnanWindowTravelPose(from,to,i/1000,route),v=[p.x-previous.x,p.z-previous.z],speed=Math.hypot(...v);
  if(velocity&&speed>.0004&&Math.hypot(...velocity)>.0004){const angle=Math.acos(Math.max(-1,Math.min(1,(v[0]*velocity[0]+v[1]*velocity[1])/(speed*Math.hypot(...velocity)))));assert.ok(angle<.14,`camera corner turns ${angle} radians in one frame`);}
  previous=p;velocity=v;
 }
});

test('camera moves inherit the current presentation and decelerate at each destination',async()=>{
 const motion=await import('../assets/js/space/jiangnan-camera-motion.mjs').catch(()=>null);assert.ok(motion?.createJiangnanCameraMove);
 const from={x:1.2,y:1.34,z:1.65,yaw:3.11,pitch:0,fov:48},to={x:-1.48,y:1.15,z:-.6,yaw:-3.10,pitch:-.1,fov:49};
 const move=motion.createJiangnanCameraMove(from,to,{route:jiangnanWindowRoute(from,to)});
 assert.deepEqual(move.at(0),from);assert.deepEqual(move.at(move.duration),to);
 const rest=move.at(move.duration-1);assert.ok(Math.hypot(rest.x-to.x,rest.z-to.z)<.00002,'no visible end snap');
 const mid=move.at(move.duration*.42),reverse=motion.createJiangnanCameraMove(mid,from,{route:jiangnanWindowRoute(mid,from),velocity:move.velocityAt(move.duration*.42)});
 assert.deepEqual(reverse.at(0),mid,'an interrupted move starts at its actual visible pose');
 const incoming=move.velocityAt(move.duration*.42),outgoing=reverse.velocityAt(.05);
 assert.ok(Math.hypot(outgoing.x-incoming.x,outgoing.z-incoming.z)<.02,'retargeting preserves displacement velocity rather than braking to zero');
 const continuing=motion.createJiangnanCameraMove(mid,to,{route:jiangnanWindowRoute(mid,to),velocity:incoming});
 const continuedVelocity=continuing.velocityAt(.05);
 for(const key of ['yaw','pitch'])assert.ok(Math.abs(continuedVelocity[key]-incoming[key])<.002,`forward retarget must preserve ${key} velocity without counting it twice`);
 assert.deepEqual(reverse.at(reverse.duration),from);
 assert.ok(Math.abs(move.at(move.duration*.5).yaw-from.yaw)<.1,'rotation takes the short arc');
 assert.ok(move.duration>=650&&move.duration<=1800,'distance-aware travel has a bounded lifetime');
});

test('a return beside furniture dissipates momentum without discrete collision clamps',async()=>{
 const {createJiangnanCameraMove}=await import('../assets/js/space/jiangnan-camera-motion.mjs');
 const from={x:-1.1,y:1.4,z:-1,yaw:0,pitch:0,fov:48},to=jiangnanWindowView(1.6),flight=createJiangnanCameraMove(from,to,{route:jiangnanWindowRoute(from,to)}),at=flight.duration*.6,mid=flight.at(at);
 const back=createJiangnanCameraMove(mid,from,{route:jiangnanWindowRoute(mid,from),velocity:flight.velocityAt(at)});
 let previous=back.at(0);
 for(let time=.5;time<back.duration;time+=.5){const next=back.at(time);assert.ok(Math.hypot(next.x-previous.x,next.z-previous.z)<.004,'a wall must not create a position step');previous=next;}
});
