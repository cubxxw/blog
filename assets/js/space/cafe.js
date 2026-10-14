import { cafeTheme, cafeEntryMode } from './cafe.mjs';

export function mountCafe({root,route,navigation,localeResume,execute,onEnter,beforeVisit,focusDesktop}) {
  const surface=root.querySelector('[data-space-cafe]'),dialog=root.querySelector('[data-cafe-dialog]');
  const themes=JSON.parse(root.querySelector('[data-cafe-catalog]').textContent).themes;
  const zh=JSON.parse(root.querySelector('[data-space-catalog]').textContent).language==='zh';
  const t=(cn,en)=>zh?cn:en,choices=root.querySelector('[data-cafe-choices]');
  const status=root.querySelector('[data-cafe-status]'),pickerStatus=root.querySelector('[data-cafe-picker-status]');
  const startButton=root.querySelector('[data-cafe-start]');
  const desktop=[root.querySelector('[data-space-windows]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')];
  let theme='zen',savedMode,mode,world,failed=false,trigger,revision=0;
  try{theme=cafeTheme(localStorage.getItem('space:cafe:theme:v1'));}catch{}
  try{savedMode=sessionStorage.getItem('space:cafe:mode');}catch{}
  const url=new URL(location.href);
  if(localeResume&&url.searchParams.has('space-cafe'))savedMode=url.searchParams.get('space-cafe');
  if(url.searchParams.has('space-cafe')){url.searchParams.delete('space-cafe');history.replaceState(null,'',url.pathname+url.search+url.hash);}
  function announce(message){status.textContent=message;pickerStatus.textContent=message;}
  function setMode(value) {
    mode=value;root.dataset.cafeMode=value;
    surface.inert=value!=='cafe';desktop.forEach(el=>{el.inert=value==='cafe';});
    try{sessionStorage.setItem('space:cafe:mode',value);}catch{}
  }
  function commit(id) {
    theme=id;root.dataset.cafeTheme=id;const scene=themes.find(scene=>scene.id===id);
    root.querySelector('[data-cafe-name]').textContent=scene.name;
    root.querySelector('[data-cafe-note]').textContent=scene.note;
    choices.querySelectorAll('[data-cafe-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cafeTheme===id)));
    try{localStorage.setItem('space:cafe:theme:v1',id);}catch{}
  }
  commit(theme);setMode(cafeEntryMode({route,navigation,saved:savedMode,localeResume}));
  root.dataset.worldLoading='true';desktop.forEach(el=>{el.inert=true;});
  if(mode==='cafe'&&navigation==='navigate'&&!localeResume){try{sessionStorage.removeItem('space:world:started');}catch{}}
  function failWorld(message) {
    world?.dispose();world=null;failed=true;root.dataset.worldFailed='true';
    for(const key of ['worldReady','worldMode','worldTravel','worldLoading'])delete root.dataset[key];
    setMode(mode);
    root.querySelectorAll('[data-cafe-enter],[data-cafe-start],[data-cafe-outside],[data-cafe-visit]').forEach(button=>{button.disabled=false;});
    startButton.querySelector('span').textContent=t('打开工作区','Open workspace');announce(message);
    if(mode==='desktop'){const toast=root.querySelector('[data-space-toast]');toast.textContent=message;toast.hidden=false;}
  }
  const ready=(async()=>{
    try {
      const config=JSON.parse(document.querySelector('[data-space-world-module]').textContent);
      let timer;
      const module=await Promise.race([import(config.module),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('3D module timed out')),15000);})]).finally(()=>clearTimeout(timer));
      world=module.createCafeWorld({root,theme,onComputer:()=>enterDesktop(true),onFailure:()=>failWorld(t('三维渲染已暂停。你的工作区仍可使用，刷新后可重新进入房间。','3D rendering paused. Your workspace is available; reload to re-enter the room.')),
        isBlocked:()=>dialog.open||Boolean(root.querySelector('dialog[open]'))||root.hidden,
        onTravel:busy=>{root.querySelectorAll('[data-cafe-enter],[data-cafe-start],[data-cafe-outside],[data-cafe-visit]').forEach(button=>{button.disabled=busy;});}
      });
      if(mode==='desktop')world.focus(false);
      else if((navigation==='reload'||localeResume)&&readStarted())await world.start();
      delete root.dataset.worldLoading;setMode(mode);startButton.disabled=false;announce('');return world;
    } catch(error) {
      failWorld(t('三维场景未能启动，可以直接打开工作区。','The 3D room could not start. You can still open the workspace.'));
      console.warn('Space world unavailable',error.message);return null;
    }
  })();
  function readStarted(){try{return sessionStorage.getItem('space:world:started')==='yes';}catch{return false;}}
  function closePicker(){dialog.close();}
  dialog.addEventListener('close',()=>{
    const target=trigger?.isConnected&&!trigger.closest('[inert]')?trigger:mode==='cafe'?startButton:root.querySelector('[data-cafe-visit]');
    target?.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closePicker();}});
  function openPicker(source){
    if(dialog.open)return;trigger=source;
    if(!choices.children.length)for(const scene of themes){
      const button=document.createElement('button');button.type='button';button.dataset.cafeTheme=scene.id;
      const art=document.createElement('span');art.className='space-cafe-swatch';art.dataset.scene=scene.id;art.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=scene.name;
      const note=document.createElement('span');note.textContent=scene.note;button.append(art,name,note);choices.append(button);
    }
    choices.querySelectorAll('[data-cafe-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cafeTheme===theme)));
    pickerStatus.textContent='';dialog.showModal();choices.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  }
  async function start(){
    const current=++revision;await ready;if(current!==revision)return;
    if(failed){enterDesktop(true);return;}
    try{sessionStorage.setItem('space:world:started','yes');}catch{}
    await world.start();
  }
  async function enterDesktop(focus=false){
    if(mode==='desktop'){if(focus)focusDesktop()?.focus({preventScroll:true});return;}
    const current=++revision;if(dialog.open)closePicker();
    onEnter();await ready;if(current!==revision)return;
    if(world)await world.focus();if(current!==revision)return;
    setMode('desktop');if(focus)focusDesktop()?.focus({preventScroll:true});
  }
  async function visit(){
    const current=++revision;beforeVisit();if(dialog.open)closePicker();
    try{sessionStorage.setItem('space:world:started','yes');}catch{}
    setMode('cafe');await ready;if(current!==revision)return;
    if(world)await world.leave();else startButton.focus({preventScroll:true});
  }
  root.addEventListener('click',async event=>{
    const target=event.target;
    if(target.closest('[data-cafe-start]'))start();
    if(target.closest('[data-cafe-enter]'))enterDesktop(true);
    if(target.closest('[data-cafe-visit]'))visit();
    if(target.closest('[data-cafe-picker]'))openPicker(target.closest('[data-cafe-picker]'));
    if(target.closest('[data-cafe-picker-close]'))closePicker();
    if(target.closest('[data-cafe-language]'))execute('language',{value:zh?'en':'zh'});
    if(target.closest('[data-cafe-outside]')){try{sessionStorage.setItem('space:world:started','yes');}catch{}await ready;if(world)world.outside();}
    if(target.closest('[data-cafe-guide]')){await enterDesktop();execute('ask',{question:t('带我逛逛这个空间，先推荐一个值得读的内容。','Show me around this space and suggest something worth reading.')});}
    const choice=target.closest('button[data-cafe-theme]');
    if(choice){await ready;const id=choice.dataset.cafeTheme;if(world)world.setTheme(id);commit(id);pickerStatus.textContent=t(`已来到${themes.find(scene=>scene.id===id).name}。`,`Now in ${themes.find(scene=>scene.id===id).name}.`);closePicker();}
  });
  return {get active(){return mode==='cafe';},get modalOpen(){return dialog.open;},get mode(){return mode;},get spatial(){return Boolean(world);},enterDesktop,visit,openPicker,escape(){if(world?.mode==='roam')world.start();}};
}
