import {JIANGNAN_WINDOW} from './jiangnan-layout.mjs';
import {JIANGNAN_COLLIDERS} from './jiangnan-state.mjs';
import {travelPose} from './world-state.mjs';

const EYE=Object.freeze({x:-.79,y:1.58,z:-1.90});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function lens(aspect){
 const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
 const verticalCap=52-9*clamp((ratio-.8)/.4,0,1);
 const halfV=Math.min(verticalCap*Math.PI/360,Math.atan(Math.tan(35*Math.PI/180)/ratio));
 return {halfV,halfH:Math.atan(Math.tan(halfV)*ratio),fov:Math.min(52,halfV*360/Math.PI)};
}
export function clampJiangnanWindowLook(pose,aspect){
 const {halfV,halfH,fov}=lens(aspect),gap=pose.z-JIANGNAN_WINDOW.glassZ;
 const pitch=clamp(pose.pitch,-.58+halfV+.025,.50-halfV-.025);
 // Pitch spreads the two lower/upper corner azimuths beyond the center row.
 // Include those rays, particularly on ultrawide screens, before clamping yaw.
 const cornerH=Math.atan2(Math.tan(halfH),Math.cos(pitch)-Math.tan(halfV)*Math.abs(Math.sin(pitch)));
 // The distant photograph covers 112 degrees. Stay inside that registration;
 // the small left allowance reveals the real timber, never an invented border.
 const minYaw=-1.005+cornerH+.035;
 const maxYaw=Math.min(.945-cornerH-.035,Math.atan2(pose.x-JIANGNAN_WINDOW.minX,gap)-cornerH+.045);
 return {...pose,fov,yaw:clamp(pose.yaw,minYaw,maxYaw),pitch};
}
export function jiangnanWindowView(aspect){
 return clampJiangnanWindowLook({...EYE,yaw:-.055,pitch:.105},aspect);
}

// Only window travel needs an aisle route. The same furniture bounds used by
// walking keep both the approach and the return from cutting through the desk.
const padding=.18;
const obstacles=JIANGNAN_COLLIDERS.map(b=>({minX:b.minX-padding,maxX:b.maxX+padding,minZ:b.minZ-padding,maxZ:b.maxZ+padding}));
const inside=(p,b)=>p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ;
function intersects(a,b,box){
 let lo=0,hi=1;
 for(const axis of ['X','Z']){
  const key=axis.toLowerCase(),d=b[key]-a[key],min=box['min'+axis],max=box['max'+axis];
  if(Math.abs(d)<1e-9){if(a[key]<=min||a[key]>=max)return false;continue;}
  const t1=(min-a[key])/d,t2=(max-a[key])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
  if(lo>=hi)return false;
 }
 return hi>1e-8&&lo<1-1e-8;
}
export function jiangnanWindowRoute(from,to){
 // Extra clearance reserves room for a rounded camera turn at each corner.
 const corners=obstacles.flatMap(b=>[b.minX-.14,b.maxX+.14].flatMap(x=>[b.minZ-.14,b.maxZ+.14].map(z=>({x,z}))));
 const nodes=[from,to,...corners.filter(p=>p.x>-2.98&&p.x<2.98&&p.z>-2.34&&p.z<1.82&&!obstacles.some(b=>inside(p,b)))];
 const distance=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();distance[0]=0;
 for(let step=0;step<nodes.length;step++){
  let at=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(at<0||distance[i]<distance[at]))at=i;
  if(at<0||!Number.isFinite(distance[at])||at===1)break;
  visited.add(at);
  for(let next=0;next<nodes.length;next++){
   if(next===at||visited.has(next))continue;
   // A seated origin may already be within a chair; allow that first escape.
   if(obstacles.some(b=>!(at===0&&inside(from,b))&&intersects(nodes[at],nodes[next],b)))continue;
   const cost=distance[at]+Math.hypot(nodes[next].x-nodes[at].x,nodes[next].z-nodes[at].z);
   if(cost<distance[next]){distance[next]=cost;previous[next]=at;}
  }
 }
 if(!Number.isFinite(distance[1]))return [from,to];
 const route=[];for(let at=1;at>=0;at=previous[at])route.unshift(nodes[at]);
 return roundRoute(route);
}
function roundRoute(route){
 const points=[route[0]],mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
 for(let i=1;i<route.length-1;i++){
  const a=route[i-1],b=route[i],c=route[i+1],ab=Math.hypot(b.x-a.x,b.z-a.z),bc=Math.hypot(c.x-b.x,c.z-b.z);
  let radius=Math.min(.32,ab*.38,bc*.38),curve;
  for(let trial=0;trial<6;trial++,radius*=.5){
   const enter=mix(b,a,radius/ab),exit=mix(b,c,radius/bc);
   curve=Array.from({length:25},(_,j)=>{const t=j/24;return mix(mix(enter,b,t),mix(b,exit,t),t);});
   if(!obstacles.some(box=>curve.some((p,j)=>inside(p,box)||j&&intersects(curve[j-1],p,box))))break;
   curve=null;
  }
  points.push(...(curve||[b]));
 }
 points.push(route.at(-1));return points;
}
export function jiangnanWindowTravelPose(from,to,progress,route){
 const p=travelPose(from,to,progress);if(progress<=0||progress>=1||!route?.length)return p;
 const lengths=route.slice(1).map((b,i)=>Math.hypot(b.x-route[i].x,b.z-route[i].z)),total=lengths.reduce((a,b)=>a+b,0);
 let distance=total*progress*progress*(3-2*progress);
 for(let i=0;i<lengths.length;i++){
  if(distance>lengths[i]&&i<lengths.length-1){distance-=lengths[i];continue;}
  const t=lengths[i]?clamp(distance/lengths[i],0,1):1,a=route[i],b=route[i+1];
  return {...p,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
 }
 return p;
}
