import {JIANGNAN_COLLIDERS} from './jiangnan-state.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>t*t*t*(10+t*(-15+6*t));
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

// One flight owns its geometry and elapsed time. Re-targeting starts from the
// current presented pose; rounded, distance-parameterized paths never pause at
// an aisle corner. End position, velocity and acceleration settle together.
export function createJiangnanCameraMove(from,to,{route=[from,to],duration=850,velocity={}}={}){
 const path=route.length>1?route:[from,to],lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.z-path[i].z)),length=lengths.reduce((sum,n)=>sum+n,0);
 const yaw=angle(from.yaw,to.yaw),durationMs=clamp(Math.max(duration*.72,540+length*230+Math.abs(yaw)*120),650,1800);
 const first=lengths.findIndex(n=>n>.00001),direction=first<0?{x:0,z:0}:{x:(path[first+1].x-path[first].x)/lengths[first],z:(path[first+1].z-path[first].z)/lengths[first]};
 const rate=length?clamp(((velocity.x||0)*direction.x+(velocity.z||0)*direction.z)*durationMs/1000/length,0,3):0;
 const residual={x:(velocity.x||0)-direction.x*rate*length*1000/durationMs,y:(velocity.y||0)-(to.y-from.y)*rate*1000/durationMs,z:(velocity.z||0)-direction.z*rate*length*1000/durationMs};
 // A reverse keeps its incoming momentum, then dissipates it within a small
 // physical footprint. Positive along-route momentum stays on the clear path.
 let decay=Math.min(.13,.35/Math.max(.01,Math.hypot(residual.x,residual.z)));
 const inside=(p,b)=>p.x>b.minX-.18&&p.x<b.maxX+.18&&p.z>b.minZ-.18&&p.z<b.maxZ+.18;
 const obstacles=JIANGNAN_COLLIDERS.filter(b=>!inside(from,b)&&!inside(to,b));
 function at(milliseconds){
  if(milliseconds<=0)return {...from};if(milliseconds>=durationMs)return {...to};
  const t=milliseconds/durationMs,seconds=milliseconds/1000,eased=ease(t),progress=eased+rate*t*(1-t)**3,result={};
  for(const key of ['y','pitch','fov','yaw']){
   const delta=key==='yaw'?yaw:to[key]-from[key];
   // Rotation and lens have their own momentum. The along-path rate belongs
   // to position only; applying it here would count angular velocity twice.
   const initial=key==='y'?0:velocity[key]||0,tau=Math.min(.16,(key==='fov'?4:.35)/Math.max(.01,Math.abs(initial)));
   result[key]=from[key]+delta*(key==='y'?progress:eased)+initial*seconds*Math.exp(-seconds/tau)*(1-t)**3;
  }
  let remaining=length*progress;
  for(let i=0;i<lengths.length;i++){
   if(remaining>lengths[i]&&i<lengths.length-1){remaining-=lengths[i];continue;}
   const k=lengths[i]?clamp(remaining/lengths[i],0,1):1;
   result.x=path[i].x+(path[i+1].x-path[i].x)*k;result.z=path[i].z+(path[i+1].z-path[i].z)*k;break;
  }
  const carry=seconds*Math.exp(-seconds/decay)*(1-t)**3;
  result.x+=residual.x*carry;result.z+=residual.z*carry;result.y+=residual.y*carry;
  return result;
 }
 function velocityAt(milliseconds){
  if(milliseconds<=0)return {...velocity};if(milliseconds>=durationMs)return {};
  const a=at(Math.max(0,milliseconds-.01)),b=at(Math.min(durationMs,milliseconds+.01)),seconds=(Math.min(durationMs,milliseconds+.01)-Math.max(0,milliseconds-.01))/1000;
  return Object.fromEntries(Object.keys(from).map(key=>[key,(key==='yaw'?angle(a[key],b[key]):b[key]-a[key])/seconds]));
 }
 // Choose one safe decay before the flight begins. Per-frame collision clamps
 // introduce visible steps; shortening decay keeps the incoming derivative
 // while spending less distance on momentum near a piece of furniture.
 if(Math.hypot(residual.x,residual.z)>.0001)for(let trial=0;trial<12;trial++){
  let blocked=false;
  for(let time=1;time<durationMs;time+=2){const point=at(time);if(obstacles.some(b=>inside(point,b))){blocked=true;break;}}
  if(!blocked)break;decay*=.5;
 }
 return {at,velocityAt,duration:durationMs};
}
