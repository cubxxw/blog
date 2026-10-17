import {createBoot,advanceBoot,bootRemaining} from './onboarding.mjs';

export function mountOnboarding({root,enabled,onReveal}) {
  const panel=root.querySelector('[data-space-boot]');
  const status=panel.querySelector('[data-boot-status]'),skip=panel.querySelector('[data-boot-skip]');
  const zh=document.documentElement.lang.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new AbortController();let timer,disposed=false,version=0;
  let seen=false;try{seen=localStorage.getItem('space:cafe:onboarding:v1')==='seen';}catch{}
  let state=createBoot(performance.now(),{seen,reduced:reduced.matches});
  function hide(){panel.hidden=true;root.dataset.bootState='complete';}
  function reveal(){
    if(disposed||panel.hidden||root.dataset.bootState==='revealing')return;
    const focused=panel.contains(document.activeElement);
    root.dataset.bootState='revealing';
    try{localStorage.setItem('space:cafe:onboarding:v1','seen');}catch{}
    if(reduced.matches){hide();onReveal?.();}
    else{timer=setTimeout(()=>{hide();onReveal?.();},550);}
    if(focused)root.querySelector('[data-cafe-read]')?.focus({preventScroll:true});
  }
  function paint(){
    root.dataset.bootStage=String(state.stage);
    panel.querySelectorAll('[data-boot-step]').forEach((line,i)=>{line.dataset.state=i<state.stage?'done':i===state.stage?'current':'waiting';});
    skip.disabled=!state.ready&&!state.failed;
    skip.textContent=state.failed?t('打开工作区','Open workspace'):state.ready?t('直接入座','Take a seat'):t('正在准备…','Preparing…');
    const messages=[t('正在连接你的空间。','Connecting to your space.'),t('正在布置房间。','Preparing the room.'),t('正在绘制第一束光。','Rendering the first light.'),t('一切就绪。请坐。','Everything is ready. Make yourself at home.')];
    const message=state.failed?t('场景暂时无法启动，仍可阅读或打开工作区。','The room is unavailable. You can still read or open the workspace.'):messages[state.stage];
    if(status.textContent!==message)status.textContent=message;
    if(state.finished)reveal();
    else if(state.ready&&!state.failed){clearTimeout(timer);const current=version;timer=setTimeout(()=>{if(current===version)event('tick');},bootRemaining(state,performance.now())+5);}
  }
  function event(name){
    if(disposed)return;
    if(name==='failure'){
      ++version;clearTimeout(timer);
      // Once a frame has already started the reveal, failure recovery owns the
      // workspace. Do not leave a transparent, permanently active boot panel.
      if(state.finished){dismiss();return;}
    }
    state=advanceBoot(state,name,performance.now());
    if(!panel.hidden)paint();
  }
  skip.addEventListener('click',()=>{
    if(state.failed){dismiss();onReveal?.({failed:true});}
    else event('skip');
  },{signal:controller.signal});
  reduced.addEventListener('change',()=>{
    if(reduced.matches&&!panel.hidden){state={...state,quick:true};event('tick');}
  },{signal:controller.signal});
  function dismiss(){++version;clearTimeout(timer);hide();}
  function replay(){
    if(disposed)return;
    ++version;clearTimeout(timer);state=createBoot(performance.now(),{reduced:reduced.matches});
    panel.hidden=false;root.dataset.bootState='loading';
    event('frame');skip.focus({preventScroll:true});
  }
  if(!enabled)dismiss();else{root.dataset.bootState='loading';paint();}
  function dispose(){disposed=true;++version;clearTimeout(timer);controller.abort();}
  window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();},{signal:controller.signal});
  return {event,dismiss,replay,get active(){return !panel.hidden;},dispose};
}
