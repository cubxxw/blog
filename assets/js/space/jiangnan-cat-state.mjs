import {JIANGNAN_BOUNDS,JIANGNAN_COLLIDERS} from './jiangnan-state.mjs';
import {JIANGNAN_CAT_BED} from './jiangnan-layout.mjs';
const floorObstacles=JIANGNAN_COLLIDERS.filter(o=>o.id!=='cat-bed');

// A circumscribed turning footprint includes the .59m posed animal, rather than only
// its torso. Keep this graph local to the small room; the other café is larger.
export const JIANGNAN_CAT_RADIUS=.34;
export const JIANGNAN_CAT_PLACES=Object.freeze([
  {name:'warm-floor',x:-.48,z:.68,links:[1,2,3]},
  {name:'entrance',x:.25,z:1.40,links:[0,4]},
  {name:'chair-side',x:-1.18,z:.48,links:[0,3]},
  {name:'left-aisle',x:-1.84,z:.20,links:[0,2,5,6]},
  {name:'east-floor',x:2.08,z:1.35,links:[1,7]},
  {name:'cabinet-side',x:-1.80,z:-.78,links:[3,6]},
  {name:'nest',x:JIANGNAN_CAT_BED.x,z:JIANGNAN_CAT_BED.z,links:[3,5]},
  {name:'desk-side',x:2.12,z:.40,links:[4]},
]);
const radius=JIANGNAN_CAT_RADIUS,places=JIANGNAN_CAT_PLACES;
export function jiangnanCatPositionClear(x,z,colliders=floorObstacles){
  return Number.isFinite(x)&&Number.isFinite(z)&&x>=JIANGNAN_BOUNDS.minX+radius&&x<=JIANGNAN_BOUNDS.maxX-radius&&z>=JIANGNAN_BOUNDS.minZ+radius&&z<=JIANGNAN_BOUNDS.maxZ-radius&&
    !colliders.some(b=>b.id!=='cat-bed'&&x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius);
}
export function jiangnanCatSegmentClear(a,b,colliders=floorObstacles){
  if(!jiangnanCatPositionClear(a.x,a.z,colliders)||!jiangnanCatPositionClear(b.x,b.z,colliders))return false;
  return !colliders.some(box=>{
    if(box.id==='cat-bed')return false;
    let low=0,high=1;
    for(const [key,min,max]of [['x',box.minX-radius,box.maxX+radius],['z',box.minZ-radius,box.maxZ+radius]]){
      const d=b[key]-a[key];if(Math.abs(d)<1e-9){if(a[key]<=min||a[key]>=max)return false;continue;}
      const p=(min-a[key])/d,q=(max-a[key])/d;low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>=high)return false;
    }
    return low<high;
  });
}
function sample(seed){const next=(Math.imul(seed,1664525)+1013904223)>>>0;return [next,next/4294967296];}
export function createJiangnanCatState(seed=79){const home=6;return {x:places[home].x,z:places[home].z,yaw:1.65,place:home,previous:-1,goal:home,phase:'sleep',remaining:360,seed:seed>>>0,gait:0,speed:0,elapsed:0,routine:'nap'};}
function nearestPlace(state,colliders){
  let best=state.place,distance=Infinity;places.forEach((p,i)=>{const d=Math.hypot(p.x-state.x,p.z-state.z);if(d<distance&&jiangnanCatSegmentClear(state,p,colliders)){best=i;distance=d;}});return best;
}
function routeTo(state,target,colliders){
  if(jiangnanCatSegmentClear(state,target,colliders))return [{...target}];
  const costs=places.map(p=>jiangnanCatSegmentClear(state,p,colliders)?Math.hypot(p.x-state.x,p.z-state.z):Infinity),previous=places.map(()=>-1),visited=new Set();
  for(let pass=0;pass<places.length;pass++){
    let at=-1;costs.forEach((cost,i)=>{if(!visited.has(i)&&(at<0||cost<costs[at]))at=i;});if(at<0||!Number.isFinite(costs[at]))break;visited.add(at);
    for(const next of places[at].links)if(jiangnanCatSegmentClear(places[at],places[next],colliders)){
      const cost=costs[at]+Math.hypot(places[at].x-places[next].x,places[at].z-places[next].z);if(cost<costs[next]){costs[next]=cost;previous[next]=at;}
    }
  }
  let end=-1,best=Infinity;places.forEach((p,i)=>{const cost=costs[i]+Math.hypot(p.x-target.x,p.z-target.z);if(cost<best&&jiangnanCatSegmentClear(p,target,colliders)){best=cost;end=i;}});if(end<0)return null;
  const path=[{...target}];for(let at=end;at>=0;at=previous[at])path.unshift({x:places[at].x,z:places[at].z});return path;
}
export function requestJiangnanCat(state,kind,visitor,{instant=false,nearby=false,now=0,colliders=JIANGNAN_COLLIDERS}={}){
  if(!['call','pet'].includes(kind)||!Number.isFinite(visitor?.x)||!Number.isFinite(visitor?.z))return {state,result:'unavailable'};
  if(!instant&&['approach','wake'].includes(state.interaction?.stage))return {state,result:state.interaction.stage==='wake'?'waking':'approaching'};
  if(!instant&&now<(state.cooldownUntil||0))return {state,result:'cooldown'};
  const yaw=Math.atan2(visitor.x-state.x,visitor.z-state.z),home=nearestPlace(state,colliders),base={...state,speed:0,phase:'look',remaining:5.5,cooldownUntil:now+3,returnHome:false,homePath:null,outing:0};
  const notice=result=>({state:{...base,yaw,interaction:{kind,stage:'notice',remaining:0,instant:true,home,visitor:{...visitor}}},result});
  if(kind==='pet'&&!nearby&&Math.hypot(visitor.x-state.x,visitor.z-state.z)>1.1)return notice('distant');
  if(instant)return notice(kind==='pet'?'petted-still':'noticed');
  if(kind==='pet')return {state:{...base,yaw,interaction:{kind,stage:'respond',remaining:2.4,total:2.4,home,visitor:{...visitor}}},result:'petting'};
  let best=null,score=Infinity;
  for(const distance of [.68,.9,1.2])for(const offset of [0,-.5,.5,-1,1,-1.55,1.55,Math.PI]){
    const angle=(visitor.yaw||0)+offset,target={x:visitor.x-Math.sin(angle)*distance,z:visitor.z-Math.cos(angle)*distance},path=routeTo(state,target,colliders);if(!path)continue;
    let length=0,from=state;for(const to of path){length+=Math.hypot(to.x-from.x,to.z-from.z);from=to;}
    const cost=length+distance*2+Math.abs(offset)*.12;if(cost<score){score=cost;best=path;}
  }
  if(!best)return notice('unreachable');
  const sleeping=state.phase==='sleep';
  return {state:{...base,phase:sleeping?'wake':'look',interaction:{kind,stage:sleeping?'wake':'approach',path:best,index:0,remaining:sleeping?2.6:0,home,visitor:{...visitor}}},result:sleeping?'waking':'approaching'};
}
export function settleJiangnanCat(state){
  if(!state.interaction)return state;
  const {visitor}=state.interaction;return {...state,speed:0,phase:'look',remaining:5.5,yaw:Math.atan2(visitor.x-state.x,visitor.z-state.z),interaction:{...state.interaction,stage:'notice',remaining:0,instant:true}};
}
export function attendJiangnanCat(state,visitor){
  return {...state,yaw:Math.atan2(visitor.x-state.x,visitor.z-state.z),speed:0,phase:'look',remaining:5.5,interaction:null};
}
function move(state,target,dt,colliders){
  const dx=target.x-state.x,dz=target.z-state.z,distance=Math.hypot(dx,dz);
  if(distance<.026)return {...state,speed:0,arrived:true};
  const wanted=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(wanted-state.yaw),Math.cos(wanted-state.yaw)),yaw=state.yaw+Math.max(-dt*1.9,Math.min(dt*1.9,angle));
  // Walk more slowly while turning or arriving; travel drives the foot cycle.
  const wantedSpeed=.32*Math.min(1,distance/.18)*Math.max(0,Math.cos(angle)),speed=state.speed+(wantedSpeed-state.speed)*Math.min(1,dt*4.5),travel=Math.min(distance,speed*dt),next={...state,x:state.x+dx/distance*travel,z:state.z+dz/distance*travel,yaw,speed:travel/dt,gait:state.gait+travel*30,phase:'walk'};
  return jiangnanCatSegmentClear(state,next,colliders)?next:{...state,speed:0,blocked:true};
}
export function stepJiangnanCat(state,seconds,{paused=false,colliders=floorObstacles}={}){
  if(paused||!Number.isFinite(seconds)||seconds<=0)return state;
  const dt=Math.min(seconds,.04),next={...state,elapsed:state.elapsed+dt};
  if(state.interaction){
    const interaction={...state.interaction};next.interaction=interaction;
    if(interaction.stage==='wake'){
      interaction.remaining=Math.max(0,interaction.remaining-dt);
      if(!interaction.remaining){interaction.stage='approach';next.phase='look';}
      return next;
    }
    if(interaction.stage!=='approach'){
      interaction.remaining=Math.max(0,interaction.remaining-dt);
      if(!interaction.remaining)return {...next,interaction:null,phase:'look',remaining:state.routine==='explore'?18:9,place:nearestPlace(next,colliders),goal:6,previous:-1,speed:0,returnHome:true};
      return next;
    }
    const moved=move(next,interaction.path[interaction.index],dt,colliders);
    if(moved.blocked){delete moved.blocked;return settleJiangnanCat(moved);}
    if(moved.arrived){delete moved.arrived;interaction.index++;if(interaction.index>=interaction.path.length){interaction.stage='near';interaction.remaining=3.2;moved.phase='look';moved.yaw=Math.atan2(interaction.visitor.x-moved.x,interaction.visitor.z-moved.z);interaction.home=nearestPlace(moved,colliders);}}
    return moved;
  }
  if(state.phase==='sleep'){
    next.remaining=Math.max(0,state.remaining-dt);
    if(!next.remaining)return {...next,phase:'look',remaining:2.6,returnHome:false,outing:1};
    return next;
  }
  if(state.returnHome){
    if(state.phase!=='walk'&&state.remaining>0)return {...next,remaining:Math.max(0,state.remaining-dt)};
    const path=state.homePath||routeTo(state,places[6],colliders);
    if(!path?.length)return {...next,phase:'look',remaining:5,returnHome:false};
    const moved=move(next,path[0],dt,colliders);moved.homePath=path;
    if(moved.blocked){delete moved.blocked;return {...moved,phase:'look',remaining:4,homePath:null,speed:0};}
    if(moved.arrived){delete moved.arrived;moved.homePath=path.slice(1);if(!moved.homePath.length)return {...moved,phase:'settle',remaining:2.6,returnHome:false,homePath:null,place:6,goal:6,speed:0};}
    return moved;
  }
  if(state.phase==='settle')return {...next,remaining:Math.max(0,state.remaining-dt),...(state.remaining<=dt?{phase:'sleep',remaining:state.routine==='explore'?180:420}:{})};
  if(state.phase!=='walk'){
    next.remaining=Math.max(0,state.remaining-dt);if(next.remaining)return next;
    let options=places[state.place].links.filter(i=>i!==state.previous&&jiangnanCatSegmentClear(state,places[i],colliders));
    if(!options.length)options=places[state.place].links.filter(i=>jiangnanCatSegmentClear(state,places[i],colliders));
    if(!options.length)return {...next,remaining:4,speed:0};
    const [seed,value]=sample(state.seed);next.seed=seed;next.goal=options[Math.floor(value*options.length)];next.phase='walk';return next;
  }
  const moved=move(next,places[state.goal],dt,colliders);
  if(moved.blocked){delete moved.blocked;return {...moved,phase:'look',remaining:4,goal:state.place};}
  if(moved.arrived){delete moved.arrived;const [seed,value]=sample(state.seed);return {...moved,seed,previous:state.place,place:state.goal,phase:value<.5?'rest':'look',remaining:value<.5?9+value*22:3.5+value*6,returnHome:state.outing===1,outing:0};}
  return moved;
}
export const JIANGNAN_CAT_ADAPTER=Object.freeze({create:createJiangnanCatState,step:stepJiangnanCat,request:requestJiangnanCat,settle:settleJiangnanCat,attend:attendJiangnanCat});

// One action decision owns both the keyboard label and the physical response.
// Sleeping/waking cats are called; the existing nearby/inspection pet remains.
export function jiangnanCatAction(state,visitor,{inspecting=false}={}){
  const near=state&&!['sleep','wake'].includes(state.phase)&&Math.hypot(state.x-visitor.x,state.z-visitor.z)<1.1;
  return inspecting||near?'pet':'call';
}
