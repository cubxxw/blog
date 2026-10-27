import test from 'node:test';
import assert from 'node:assert/strict';
import {JIANGNAN_WINDOW,JIANGNAN_WORKSTATION} from '../assets/js/space/jiangnan-layout.mjs';
import {JIANGNAN_COLLIDERS} from '../assets/js/space/jiangnan-state.mjs';
import * as THREE from '../assets/js/vendor/three.module.min.js';
const view=await import('../assets/js/space/jiangnan-window-view.mjs').catch(()=>null);
const inside=(p,b,padding=.18)=>p.x>b.minX-padding&&p.x<b.maxX+padding&&p.z>b.minZ-padding&&p.z<b.maxZ+padding;

test('the window eye stands in the clear aisle, close to the physical glass',()=>{
 assert.ok(view?.jiangnanWindowView,'a dedicated window camera is required');
 const p=view.jiangnanWindowView(1.6);
 assert.ok(p.z-JIANGNAN_WINDOW.glassZ>.45&&p.z-JIANGNAN_WINDOW.glassZ<.9);
 assert.ok(p.y>1.5&&p.y<1.7);
 assert.ok(!JIANGNAN_COLLIDERS.some(b=>inside(p,b)),'the visitor must stand beside the desk and cat bed');
 for(const key of ['computer','lampTarget']){
  const [x,y,z]=JIANGNAN_WORKSTATION[key],dx=x-p.x,dy=y-p.y,dz=z-p.z;
  const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
  const halfV=p.fov*Math.PI/360,halfH=Math.atan(Math.tan(halfV)*1.6);
  assert.ok(Math.abs(yaw-p.yaw)>halfH||Math.abs(pitch-p.pitch)>halfV,`${key} must leave the window composition`);
 }
});

test('portrait, landscape and resized window looks stay inside the photographed sky and real sash',()=>{
 assert.ok(view?.clampJiangnanWindowLook);
 for(const aspect of [.42,.462,.75,1,1.6,1.778,2.4,3.5]){
  const p=view.jiangnanWindowView(aspect),halfV=p.fov*Math.PI/360,halfH=Math.atan(Math.tan(halfV)*aspect);
  assert.ok(p.fov<=52&&p.fov>10);
  for(const yaw of [-99,99])for(const pitch of [-99,99]){
   const q=view.clampJiangnanWindowLook({...p,yaw,pitch},aspect);
   assert.equal(q.x,p.x);assert.equal(q.z,p.z);
   assert.ok(-q.yaw-halfH>-.945+.015,'left edge must not sample the clamped panorama');
   assert.ok(-q.yaw+halfH<1.005-.015,'right edge must not sample the clamped panorama');
   assert.ok(q.pitch+halfV<=.50,'top edge must not repeat the last sky row');
   assert.ok(q.pitch-halfV>=-.58,'bottom edge must stay in the river continuation');
   const sashAngle=Math.atan2(p.x-JIANGNAN_WINDOW.minX,p.z-JIANGNAN_WINDOW.glassZ);
   assert.ok(q.yaw+halfH<=sashAngle+.06,'only a narrow edge of the actual left sash may enter');
  }
  const resized=view.clampJiangnanWindowLook({...p,yaw:-99,pitch:99,fov:110},aspect);
  assert.equal(resized.fov,p.fov);
 }
});

test('approaching and retreating from the window follow the aisle rather than passing through furniture',()=>{
 assert.ok(view?.jiangnanWindowRoute&&view?.jiangnanWindowTravelPose);
 const eye=view.jiangnanWindowView(1.6);
 for(const start of [{x:1.2,y:1.34,z:1.65,yaw:0,pitch:0,fov:48},{x:-.9,y:1.18,z:-.05,yaw:0,pitch:0,fov:56},{x:-1.8,y:1.5,z:.5,yaw:0,pitch:0,fov:48}]){
  for(const [a,b]of [[start,eye],[eye,start]]){
   const route=view.jiangnanWindowRoute(a,b);
   assert.ok(route.length>=2);
   assert.deepEqual(view.jiangnanWindowTravelPose(a,b,0,route),a);
   assert.deepEqual(view.jiangnanWindowTravelPose(a,b,1,route),b);
   for(let i=1;i<200;i++){
    const p=view.jiangnanWindowTravelPose(a,b,i/200,route);
    assert.ok(!JIANGNAN_COLLIDERS.some(c=>inside(p,c)),`camera intersects furniture at ${JSON.stringify(p)}`);
   }
  }
 }
});

test('pitched corner rays stay inside the actual 120 metre photographic dome on ultrawide displays',()=>{
 assert.ok(view?.clampJiangnanWindowLook);
 for(const aspect of [.42,.75,1,1.6,1.778,2.4,3.5]){
  const eye=view.jiangnanWindowView(aspect);
  for(const yaw of [-99,99])for(const pitch of [-99,99]){
   const p=view.clampJiangnanWindowLook({...eye,yaw,pitch},aspect),v=Math.tan(p.fov*Math.PI/360),rotation=new THREE.Euler(p.pitch,p.yaw,0,'YXZ');
   const origin=new THREE.Vector3(p.x,p.y,p.z),dome=new THREE.Sphere(new THREE.Vector3(0,1.3,0),120);
   for(const x of [-1,1])for(const y of [-1,1]){
    const direction=new THREE.Vector3(x*v*aspect,y*v,-1).normalize().applyEuler(rotation);
    const hit=new THREE.Ray(origin,direction).intersectSphere(dome,new THREE.Vector3()).sub(dome.center).normalize();
    const u=.5+(Math.atan2(hit.x,-hit.z)-.03)/1.95,rawV=.38+Math.asin(hit.y)/.82;
    assert.ok(u>.003&&u<.997,`corner u ${u} at aspect ${aspect}, pitch ${p.pitch}`);
    assert.ok(rawV<.999,`sky v ${rawV} at aspect ${aspect}`);
   }
  }
 }
});
