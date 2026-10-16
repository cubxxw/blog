import { WORLD_COLLIDERS } from './world-state.mjs';

// Floor-level routes leave space around chairs as well as table tops. The cat
// has its own radius; a route safe for the visitor need not be safe for a cat.
export const CAT_RADIUS = .16;
export const CAT_COLLIDERS = Object.freeze([...WORLD_COLLIDERS,
  ...[[-3.1,.35],[-3.1,2.2],[-.2,.5],[-.2,2.35],[3.65,-1.17]]
    .map(([x,z]) => ({minX:x-.32,maxX:x+.32,minZ:z-.34,maxZ:z+.34})),
]);
export const CAT_PLACES = Object.freeze([
  {name:'sunlight',x:1.25,z:1.5,links:[1,2]},
  {name:'aisle',x:1.25,z:3.4,links:[0,6,7]},
  {name:'desk-side',x:1.4,z:-.3,links:[0,3,4]},
  {name:'window',x:.3,z:-3.7,links:[2]},
  {name:'books',x:-1.8,z:-.3,links:[2,5]},
  {name:'reading-corner',x:-4.5,z:-.3,links:[4,6]},
  {name:'quiet-corner',x:-4.5,z:3.4,links:[5,1]},
  {name:'entrance',x:1.25,z:4.5,links:[1]},
]);
export function catPositionClear(x,z,colliders=CAT_COLLIDERS) {
  return x>=-6.4 && x<=6.4 && z>=-4.2 && z<=5 &&
    !colliders.some(b=>x>b.minX-CAT_RADIUS&&x<b.maxX+CAT_RADIUS&&z>b.minZ-CAT_RADIUS&&z<b.maxZ+CAT_RADIUS);
}
function sample(seed) {
  const next=(Math.imul(seed,1664525)+1013904223)>>>0;
  return [next,next/4294967296];
}
export function createCatState(seed=79) {
  return {x:CAT_PLACES[0].x,z:CAT_PLACES[0].z,yaw:0,place:0,previous:-1,
    goal:0,phase:'look',remaining:3,seed:seed>>>0,gait:0,speed:0};
}
export function catSegmentClear(a,b,colliders=CAT_COLLIDERS) {
  if(!catPositionClear(a.x,a.z,colliders)||!catPositionClear(b.x,b.z,colliders))return false;
  return !colliders.some(box=>{
    let low=0,high=1;
    for(const [key,min,max] of [['x',box.minX-CAT_RADIUS,box.maxX+CAT_RADIUS],['z',box.minZ-CAT_RADIUS,box.maxZ+CAT_RADIUS]]){
      const d=b[key]-a[key];if(Math.abs(d)<1e-9){if(a[key]<=min||a[key]>=max)return false;continue;}
      const p=(min-a[key])/d,q=(max-a[key])/d;low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>=high)return false;
    }
    return low<high;
  });
}
function routeTo(state,target,colliders) {
  if(catSegmentClear(state,target,colliders))return [{...target}];
  const costs=CAT_PLACES.map(p=>catSegmentClear(state,p,colliders)?Math.hypot(p.x-state.x,p.z-state.z):Infinity),previous=CAT_PLACES.map(()=>-1),visited=new Set();
  for(let pass=0;pass<CAT_PLACES.length;pass++){
    let at=-1;costs.forEach((cost,i)=>{if(!visited.has(i)&&(at<0||cost<costs[at]))at=i;});if(at<0||!Number.isFinite(costs[at]))break;visited.add(at);
    for(const next of CAT_PLACES[at].links)if(catSegmentClear(CAT_PLACES[at],CAT_PLACES[next],colliders)){
      const cost=costs[at]+Math.hypot(CAT_PLACES[at].x-CAT_PLACES[next].x,CAT_PLACES[at].z-CAT_PLACES[next].z);if(cost<costs[next]){costs[next]=cost;previous[next]=at;}
    }
  }
  let end=-1,best=Infinity;CAT_PLACES.forEach((p,i)=>{const cost=costs[i]+Math.hypot(p.x-target.x,p.z-target.z);if(cost<best&&catSegmentClear(p,target,colliders)){best=cost;end=i;}});if(end<0)return null;
  const path=[{...target}];for(let at=end;at>=0;at=previous[at])path.unshift({x:CAT_PLACES[at].x,z:CAT_PLACES[at].z});return path;
}
function returnPlace(state,colliders) {
  let index=state.place,distance=Infinity;CAT_PLACES.forEach((p,i)=>{const d=Math.hypot(state.x-p.x,state.z-p.z);if(d<distance&&catSegmentClear(state,p,colliders)){index=i;distance=d;}});return index;
}
export function requestCat(state,kind,visitor,{instant=false,nearby=false,now=0,colliders=CAT_COLLIDERS}={}) {
  if(!['call','pet'].includes(kind)||!Number.isFinite(visitor?.x)||!Number.isFinite(visitor?.z))return {state,result:'unavailable'};
  if(state.interaction?.stage==='approach')return {state,result:'approaching'};
  if(now<(state.cooldownUntil||0))return {state,result:'cooldown'};
  const yaw=Math.atan2(visitor.x-state.x,visitor.z-state.z),home=returnPlace(state,colliders),base={...state,speed:0,phase:'look',remaining:6,cooldownUntil:now+3};
  const notice=result=>({state:{...base,yaw,interaction:{kind,stage:'notice',remaining:0,instant:true,home,visitor:{...visitor}}},result});
  if(kind==='pet'&&!nearby&&Math.hypot(visitor.x-state.x,visitor.z-state.z)>1.2)return notice('distant');
  if(instant)return notice(kind==='pet'?'petted-still':'noticed');
  if(kind==='pet')return {state:{...base,yaw,interaction:{kind,stage:'respond',remaining:2.4,total:2.4,home,visitor:{...visitor}}},result:'petting'};
  let best=null,score=Infinity;
  for(const distance of [.75,1.05,1.35])for(const offset of [0,-.5,.5,-1,1,-1.55,1.55,Math.PI]){
    const angle=(visitor.yaw||0)+offset,target={x:visitor.x-Math.sin(angle)*distance,z:visitor.z-Math.cos(angle)*distance},path=routeTo(state,target,colliders);if(!path)continue;
    let length=0,from=state;for(const to of path){length+=Math.hypot(to.x-from.x,to.z-from.z);from=to;}
    const cost=length+distance*3+Math.abs(offset)*.15;if(cost<score){score=cost;best=path;}
  }
  if(!best)return notice('unreachable');
  return {state:{...base,interaction:{kind,stage:'approach',path:best,index:0,remaining:0,home,visitor:{...visitor}}},result:'approaching'};
}
export function settleCatInteraction(state) {
  if(!state.interaction)return state;
  const visitor=state.interaction.visitor;return {...state,speed:0,phase:'look',remaining:6,yaw:Math.atan2(visitor.x-state.x,visitor.z-state.z),interaction:{...state.interaction,stage:'notice',remaining:0,instant:true}};
}
function stepInteraction(state,dt,colliders) {
  const interaction={...state.interaction},next={...state,interaction};
  if(interaction.stage!=='approach'){
    interaction.remaining=Math.max(0,interaction.remaining-dt);
    if(!interaction.remaining)return {...next,interaction:null,phase:'walk',place:interaction.home,goal:interaction.home,previous:-1,speed:0};
    return next;
  }
  const target=interaction.path[interaction.index],dx=target.x-state.x,dz=target.z-state.z,distance=Math.hypot(dx,dz);
  if(distance<.025){interaction.index++;if(interaction.index>=interaction.path.length){interaction.stage='near';interaction.remaining=2.4;next.phase='look';next.speed=0;next.yaw=Math.atan2(interaction.visitor.x-next.x,interaction.visitor.z-next.z);interaction.home=returnPlace(next,colliders);}return next;}
  const wanted=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(wanted-state.yaw),Math.cos(wanted-state.yaw));next.yaw=state.yaw+Math.max(-dt*2.4,Math.min(dt*2.4,angle));
  const travel=Math.min(distance,.42*Math.min(1,distance/.22)*Math.max(0,Math.cos(angle))*dt),to={x:state.x+dx/distance*travel,z:state.z+dz/distance*travel};
  if(!catSegmentClear(state,to,colliders))return settleCatInteraction(next);
  next.x=to.x;next.z=to.z;next.speed=travel/dt;next.gait+=travel*12;next.phase='walk';return next;
}
export function stepCat(state,seconds,{paused=false,colliders=CAT_COLLIDERS}={}) {
  if(paused||!Number.isFinite(seconds)||seconds<=0)return state;
  const dt=Math.min(seconds,.04),next={...state};
  if(state.interaction)return stepInteraction(state,dt,colliders);
  if(state.phase!=='walk') {
    next.remaining=Math.max(0,state.remaining-dt);
    if(next.remaining)return next;
    let options=CAT_PLACES[state.place].links.filter(i=>i!==state.previous);
    if(!options.length)options=CAT_PLACES[state.place].links;
    const [seed,value]=sample(state.seed);next.seed=seed;
    next.goal=options[Math.floor(value*options.length)];next.phase='walk';
    return next;
  }
  const target=CAT_PLACES[state.goal],dx=target.x-state.x,dz=target.z-state.z;
  const distance=Math.hypot(dx,dz);
  if(distance<.035) {
    const [seed,value]=sample(state.seed);next.seed=seed;
    next.previous=state.place;next.place=state.goal;
    next.phase=value<.45?'rest':'look';next.remaining=next.phase==='rest'?12+value*24:4+value*7;
    next.speed=0;return next;
  }
  const wanted=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(wanted-state.yaw),Math.cos(wanted-state.yaw));
  next.yaw=state.yaw+Math.max(-dt*2.4,Math.min(dt*2.4,angle));
  const speed=.42*Math.min(1,distance/.25)*Math.max(0,Math.cos(angle));
  const travel=Math.min(distance,speed*dt),x=state.x+dx/distance*travel,z=state.z+dz/distance*travel;
  if(catPositionClear(x,z,colliders)) {
    next.x=x;next.z=z;next.speed=travel/dt;next.gait+=travel*12;
  } else {
    // Stay safe if room furniture changes. Rest, then select another route;
    // never force the resident through a newly added obstacle.
    next.phase='look';next.remaining=5;next.speed=0;next.goal=state.place;
  }
  return next;
}
