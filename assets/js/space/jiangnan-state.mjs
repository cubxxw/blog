export const JIANGNAN_BOUNDS=Object.freeze({minX:-2.98,maxX:2.98,minZ:-2.34,maxZ:1.82});
export const JIANGNAN_COLLIDERS=Object.freeze([
  {id:'desk',minX:.25,maxX:2.68,minZ:-2.24,maxZ:-.92},
  {id:'cabinet',minX:-3.2,maxX:-2.56,minZ:-2.4,maxZ:-.2},
  {id:'reading-chair',minX:-2.48,maxX:-1.6,minZ:.2,maxZ:1.18},
  {id:'desk-chair',minX:.7,maxX:1.58,minZ:-.4,maxZ:.4},
  {id:'fan',minX:2.55,maxX:3.05,minZ:-.8,maxZ:-.3},
  {id:'speaker',minX:-.90,maxX:-.58,minZ:-2.265,maxZ:-1.955}
]);
export const JIANGNAN_TARGETS=Object.freeze({computer:[1.45,1.22,-1.815],photo:[2.31,1.045,-1.28],coffee:[.55,.91,-1.28],books:[-2.56,1.2,-1.1]});
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
export function jiangnanBoat(seconds){const phase=((seconds/135+.42)%1+1)%1;return {x:21-phase*43,y:-.46+Math.sin(seconds*.7)*.018,z:-10.8+Math.sin(phase*Math.PI)*.7,roll:Math.sin(seconds*.6)*.009,stroke:Math.sin(seconds*.85)*.16};}
