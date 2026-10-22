const TAU=Math.PI*2,DAY=86400;
const angle=(x,y,cx,cy)=>Math.atan2(x-cx,cy-y);
const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// The dial owns its pointer and keyboard gestures. Its outside belongs to the
// room, so the ordinary outside-click retreat needs no second Back button.
export function mountMagicClock({root,zh=true,getTime,onGrab,onTravel,onCommit,onPresent,onClose}){
 const abort=new AbortController(),t=(cn,en)=>zh?cn:en;
 const host=document.createElement('section');host.className='magic-clock';host.dataset.magicClock='';host.hidden=true;
 host.setAttribute('aria-label',t('魔法时钟','The magic clock'));
 const ticks=Array.from({length:48},(_,i)=>{const a=i/48*TAU,r=i%2?92:87;return `<line x1="${120+Math.sin(a)*r}" y1="${120-Math.cos(a)*r}" x2="${120+Math.sin(a)*98}" y2="${120-Math.cos(a)*98}" class="${i%2?'':'hour'}"/>`;}).join('');
 const labels=[['00',0],['06',Math.PI/2],['12',Math.PI],['18',Math.PI*1.5]].map(([label,a])=>`<text x="${120+Math.sin(a)*77}" y="${124-Math.cos(a)*77}">${label}</text>`).join('');
 host.innerHTML=`<p class="magic-clock__hint">${t('拨动时间，看看窗外。','Turn time. Watch the window.')}</p><div class="magic-clock__dial"><div class="magic-clock__track" role="slider" tabindex="0" aria-label="${t('小屋时间','Room time')}" aria-valuemin="0" aria-valuemax="1439" data-clock-dial><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="108" class="magic-clock__rim"/><circle cx="120" cy="120" r="101" class="magic-clock__inner"/>${ticks}${labels}<g class="magic-clock__hand" data-clock-hand><path d="M120 45 L123 111 L120 117 L117 111Z"/><circle cx="120" cy="40" r="2.5"/></g></svg></div><div class="magic-clock__center"><output data-clock-readout></output><span data-clock-phase></span><button type="button" data-clock-present>${t('此刻','Present')}</button></div></div><p class="magic-clock__foot" data-clock-mode></p>`;
 root.append(host);
 const dial=host.querySelector('[data-clock-dial]'),hand=host.querySelector('[data-clock-hand]'),readout=host.querySelector('[data-clock-readout]'),phase=host.querySelector('[data-clock-phase]'),mode=host.querySelector('[data-clock-mode]');
 let drag=null,disposed=false;
 const phases={night:t('夜雨','Night rain'),dawn:t('晨光','Dawn'),day:t('日光','Daylight'),sunset:t('落日','Sunset'),twilight:t('暮色','Twilight')};
 function update(state=getTime()){
  if(disposed||host.hidden)return;
  hand.style.transform=`rotate(${state.seconds/DAY*360}deg)`;
  readout.textContent=state.label;phase.textContent=phases[state.phase]||'';
  dial.setAttribute('aria-valuenow',String(Math.floor(state.seconds/60)));dial.setAttribute('aria-valuetext',state.label);
  mode.textContent=state.borrowed?t('借来的一刻 · 轻点「此刻」回去','Borrowed time · touch Present to return'):t('此刻正缓缓流动','The present, flowing quietly');
  host.dataset.phase=state.phase;host.dataset.borrowed=String(state.borrowed);
 }
 function finish(){if(!drag)return;const id=drag.id;drag=null;host.removeAttribute('data-dragging');if(dial.hasPointerCapture(id))dial.releasePointerCapture(id);onCommit?.();}
 dial.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('button'))return;
  const b=dial.getBoundingClientRect(),cx=b.x+b.width/2,cy=b.y+b.height/2;
  if(Math.hypot(event.clientX-cx,event.clientY-cy)<b.width*.26)return;
  event.preventDefault();event.stopPropagation();finish();
  onGrab?.();
  drag={id:event.pointerId,cx,cy,last:angle(event.clientX,event.clientY,cx,cy),seconds:getTime().unwrapped};
  host.dataset.dragging='true';dial.setPointerCapture(event.pointerId);dial.focus({preventScroll:true});
 },{signal:abort.signal});
 dial.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  event.preventDefault();const a=angle(event.clientX,event.clientY,drag.cx,drag.cy);
  drag.seconds+=difference(a,drag.last)/TAU*DAY;drag.last=a;
  onTravel(drag.seconds);update();
 },{signal:abort.signal});
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])dial.addEventListener(kind,finish,{signal:abort.signal});
 dial.addEventListener('keydown',event=>{
  if(event.target.closest('button')||event.metaKey||event.ctrlKey||event.altKey)return;
  const state=getTime(),step=event.shiftKey?3600:300;
  const shifts={ArrowRight:step,ArrowUp:step,ArrowLeft:-step,ArrowDown:-step,PageUp:3600,PageDown:-3600};
  let target;
  if(event.key in shifts)target=state.unwrapped+shifts[event.key];
  else if(event.key==='Home')target=state.unwrapped-state.seconds;
  else if(event.key==='End')target=state.unwrapped-state.seconds+DAY-60;
  else return;
  event.preventDefault();event.stopPropagation();onTravel(target);onCommit?.();update();
 },{signal:abort.signal});
 host.addEventListener('wheel',event=>{if(event.ctrlKey||Math.abs(event.deltaY)<1)return;event.preventDefault();event.stopPropagation();onTravel(getTime().unwrapped+Math.sign(event.deltaY)*300);onCommit?.();update();},{signal:abort.signal,passive:false});
 host.querySelector('[data-clock-present]').addEventListener('click',event=>{event.stopPropagation();finish();onPresent?.();update();},{signal:abort.signal});
 host.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose?.();}},{signal:abort.signal});
 window.addEventListener('blur',finish,{signal:abort.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},{signal:abort.signal});
 return {element:host,contains:node=>host.contains(node),update,
  show(){host.hidden=false;update();dial.focus({preventScroll:true});},hide(){finish();host.hidden=true;},settle:finish,
  dispose(){if(disposed)return;finish();disposed=true;abort.abort();host.remove();}
 };
}
