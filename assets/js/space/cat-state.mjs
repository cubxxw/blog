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
export function stepCat(state,seconds,{paused=false,colliders=CAT_COLLIDERS}={}) {
  if(paused||!Number.isFinite(seconds)||seconds<=0)return state;
  const dt=Math.min(seconds,.04),next={...state};
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
