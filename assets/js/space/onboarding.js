import {createBoot,advanceBoot} from './onboarding.mjs';

export function mountOnboarding({root,enabled,onReveal}) {
  const panel=root.querySelector('[data-space-boot]');
  const status=panel.querySelector('[data-boot-status]'),skip=panel.querySelector('[data-boot-skip]');
  const zh=document.documentElement.lang.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new AbortController();let timer,disposed=false;
  let state=createBoot(performance.now(),{reduced:reduced.matches});
  function hide(){panel.hidden=true;root.dataset.bootState='complete';}
  function reveal(){
    if(disposed||panel.hidden||root.dataset.bootState==='revealing')return;
    const focused=panel.contains(document.activeElement);
    root.dataset.bootState='revealing';
    if(reduced.matches){hide();onReveal?.();}
    else{timer=setTimeout(()=>{hide();onReveal?.();},160);}
    if(focused)root.querySelector(root.dataset.cafeMode==='desktop'?'[data-space-menu-trigger]':'.space-world__canvas')?.focus({preventScroll:true});
  }
  function paint(){
    root.dataset.bootStage=String(state.stage);
    panel.querySelectorAll('[data-boot-step]').forEach((line,i)=>{
      const value=i<state.stage?'done':i===state.stage?(state.failed?'failed':'current'):'waiting';
      line.dataset.state=value;
      const mark=line.querySelector('[data-boot-mark]');
      if(mark)mark.textContent={done:' OK ',current:' .. ',waiting:'WAIT',failed:'FAIL'}[value];
      const time=line.querySelector('[data-boot-time]');
      if(time&&value==='done'&&!time.textContent)time.textContent=((performance.now()-state.startedAt)/1000).toFixed(3)+'s';
    });
    skip.hidden=!state.failed;
    skip.disabled=!state.failed;
    skip.textContent=t('打开工作区','Open workspace');
    const messages=[t('正在载入场景引擎…','Loading the scene engine…'),t('正在初始化房间与个人工作区…','Initializing the room and personal workspace…'),t('正在提交第一帧画面…','Painting the first scene frame…'),t('画面已就绪，正在进入。','First frame ready. Entering your space.')];
    const message=state.failed?t('场景暂时无法启动，可以直接打开工作区。','The room is unavailable. You can open the workspace.'):messages[state.stage];
    if(status.textContent!==message)status.textContent=message;
    if(state.finished)reveal();
  }
  function event(name){
    if(disposed)return;
    if(name==='failure'){
      clearTimeout(timer);
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
  function dismiss(){clearTimeout(timer);hide();}
  function begin(){
    if(disposed)return;
    clearTimeout(timer);state=createBoot(performance.now(),{reduced:reduced.matches});
    panel.querySelectorAll('[data-boot-time]').forEach(time=>{time.textContent='';});
    panel.hidden=false;root.dataset.bootState='loading';
    paint();panel.focus({preventScroll:true});
  }
  function replay(){
    if(disposed)return;
    begin();
    // Replays describe an already painted room; they must not manufacture work.
    event('frame');
  }
  if(!enabled)dismiss();else{root.dataset.bootState='loading';paint();}
  function dispose(){disposed=true;clearTimeout(timer);controller.abort();}
  window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();},{signal:controller.signal});
  return {event,dismiss,begin,replay,get active(){return !panel.hidden;},dispose};
}
