export function createBoot(startedAt,{seen=false,reduced=false}={}) {
  return {startedAt,quick:seen||reduced,stage:0,ready:false,skip:false,failed:false,finished:false};
}
export function bootRemaining(state,now) {
  // Presentation must never hold a painted room behind an artificial deadline.
  return state.ready ? 0 : null;
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
