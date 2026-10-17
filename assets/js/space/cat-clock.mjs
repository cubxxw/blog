// Only the resident owns this elapsed time. Short frames retain their original
// step; a slow visible frame uses safe <=40ms substeps. Limit one paint to two
// seconds / 50 steps and discard excess, rather than banking future catch-up.
export function createCatClock() {
  let running=false;
  function reset(){running=false;}
  function advance(seconds,enabled,step){
    if(!enabled||!Number.isFinite(seconds)||seconds<0){reset();return 0;}
    if(!running){running=true;return 0;}
    let remaining=Math.min(seconds,2),advanced=0;
    for(let count=0;count<50&&remaining>0;count++){
      const dt=Math.min(remaining,.04);step(dt);advanced+=dt;remaining=Math.max(0,remaining-dt);
    }
    return advanced;
  }
  return {advance,reset};
}
