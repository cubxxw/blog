export function createBoot(startedAt,{seen=false,reduced=false}={}) {
  return {startedAt,quick:seen||reduced,stage:0,ready:false,skip:false,failed:false,finished:false};
}
export function bootRemaining(state,now) {
  return state.ready ? Math.max(0,(state.quick||state.skip?0:1400)-(now-state.startedAt)) : null;
}
export function advanceBoot(state,event,now) {
  if(state.finished||state.failed)return state;
  const next={...state};
  if(event==='failure'){next.failed=true;return next;}
  if(event==='module')next.stage=Math.max(next.stage,1);
  if(event==='room')next.stage=Math.max(next.stage,2);
  if(event==='frame'){next.stage=3;next.ready=true;}
  if(event==='skip')next.skip=true;
  next.finished=next.ready&&bootRemaining(next,now)===0;
  return next;
}
