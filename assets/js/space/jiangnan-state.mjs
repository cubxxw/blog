import {JIANGNAN_DESK,JIANGNAN_WORK_CHAIR,JIANGNAN_CAT_BED,JIANGNAN_WORKSTATION,JIANGNAN_PHOTO_WALL} from './jiangnan-layout.mjs';
export const JIANGNAN_BOUNDS=Object.freeze({minX:-2.98,maxX:2.98,minZ:-2.34,maxZ:1.82});
export const JIANGNAN_COLLIDERS=Object.freeze([
  {id:'desk',minX:JIANGNAN_DESK.centerX-JIANGNAN_DESK.width/2,maxX:JIANGNAN_DESK.centerX+JIANGNAN_DESK.width/2,minZ:JIANGNAN_DESK.backZ,maxZ:JIANGNAN_DESK.frontZ},
  {id:'cabinet',minX:-3.19,maxX:-2.45,minZ:-2.46,maxZ:.05},
  {id:'cat-bed',minX:JIANGNAN_CAT_BED.x-.46,maxX:JIANGNAN_CAT_BED.x+.46,minZ:JIANGNAN_CAT_BED.z-.30,maxZ:JIANGNAN_CAT_BED.z+.30},
  {id:'desk-chair',minX:JIANGNAN_WORK_CHAIR.minX,maxX:JIANGNAN_WORK_CHAIR.maxX,minZ:JIANGNAN_WORK_CHAIR.minZ,maxZ:JIANGNAN_WORK_CHAIR.maxZ},
  {id:'fan',minX:2.55,maxX:3.05,minZ:-.8,maxZ:-.3},
  {id:'speaker',minX:-3.06,maxX:-2.60,minZ:.08,maxZ:.55}
]);
export const JIANGNAN_TARGETS=Object.freeze({computer:JIANGNAN_WORKSTATION.computer,photo:JIANGNAN_PHOTO_WALL[0].position,coffee:JIANGNAN_WORKSTATION.coffee,books:[-2.48,.59,-.80]});
export function jiangnanLook(position,target,fov=58){const [x,y,z]=position,dx=target[0]-x,dy=target[1]-y,dz=target[2]-z;return {x,y,z,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),fov};}
export const JIANGNAN_ENTRY=Object.freeze(jiangnanLook([-1.7,1.55,1.7],[1.0,1.17,-1.6],58));
export function canJiangnanNavigate({mode,visible,blocked=false}){return mode==='roam'&&visible&&!blocked;}
export function jiangnanWalk(pose,{forward=0,right=0},seconds){
  const norm=Math.hypot(forward,right);if(!norm||seconds<=0)return {...pose};
  const step=Math.min(.04,seconds)*1.55,dx=(-Math.sin(pose.yaw)*forward+Math.cos(pose.yaw)*right)/norm*step,dz=(-Math.cos(pose.yaw)*forward-Math.sin(pose.yaw)*right)/norm*step;
  const clear=(x,z)=>!JIANGNAN_COLLIDERS.some(b=>x>b.minX-.18&&x<b.maxX+.18&&z>b.minZ-.18&&z<b.maxZ+.18);
  let x=Math.max(JIANGNAN_BOUNDS.minX,Math.min(JIANGNAN_BOUNDS.maxX,pose.x+dx)),z=pose.z;
  if(!clear(x,z))x=pose.x;
  const nextZ=Math.max(JIANGNAN_BOUNDS.minZ,Math.min(JIANGNAN_BOUNDS.maxZ,pose.z+dz));if(clear(x,nextZ))z=nextZ;
  return {...pose,x,z};
}
// A floor tap uses the same collision steps as walking, then eases along that
// clear segment. It cannot jump to the far side of a desk or through a wall.
export function jiangnanDestination(pose,point){
  if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return {...pose};
  const dx=point.x-pose.x,dz=point.z-pose.z,length=Math.hypot(dx,dz),distance=Math.min(3.5,length);
  if(distance<.03)return {...pose};
  const input={forward:-Math.sin(pose.yaw)*dx-Math.cos(pose.yaw)*dz,right:Math.cos(pose.yaw)*dx-Math.sin(pose.yaw)*dz};
  let next={...pose};
  for(let left=distance;left>.001;left-=.062){
    const step=Math.min(.062,left),walk=jiangnanWalk(next,input,step/1.55);
    // Ordinary walking may slide along furniture. The camera transition is a
    // straight segment, so stop before either axis deviates from that segment.
    if(Math.abs(walk.x-next.x-step*dx/length)>1e-7||Math.abs(walk.z-next.z-step*dz/length)>1e-7)break;
    // X/Z walking steps can both be legal while their diagonal clips a corner.
    // Reserve the tiny step's entire box so the eased camera has that clearance.
    if(JIANGNAN_COLLIDERS.some(b=>Math.max(next.x,walk.x)>b.minX-.18&&Math.min(next.x,walk.x)<b.maxX+.18&&Math.max(next.z,walk.z)>b.minZ-.18&&Math.min(next.z,walk.z)<b.maxZ+.18))break;
    next=walk;
  }
  return next;
}
// Incommensurate currents make a bounded, non-repeating wander. A visit keeps
// one seed; neither a render frame nor a clock adjustment selects a new goal.
export function jiangnanBoat(seconds,seed=79){
 const t=Number.isFinite(seconds)?Math.max(0,seconds):0,phase=(Math.imul((seed>>>0)^79,2654435761)>>>0)/4294967296*Math.PI*2;
 const a=t*.027+2.03+phase,b=t*.0141+.5+phase*.73,c=t*.0207+.4+phase*.61,d=t*.0093+1.2+phase*.37;
 const x=3.65*Math.sin(a)+.68*Math.sin(b),z=-17.3+3.1*Math.sin(c)+.62*Math.sin(d);
 const vx=3.65*.027*Math.cos(a)+.68*.0141*Math.cos(b),vz=3.1*.0207*Math.cos(c)+.62*.0093*Math.cos(d),speed=Math.hypot(vx,vz);
 return {x,y:-.46+Math.sin(t*.7)*.014,z,yaw:Math.atan2(vz,-vx),speed,roll:Math.sin(t*.6)*.007,stroke:Math.sin(t*.85)*.16};
}
