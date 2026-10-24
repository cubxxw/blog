import { cafeTheme, cafeEntryMode } from './cafe.mjs';
import { mountOnboarding } from './onboarding.js';
import {mountRoomInspection} from './room-inspection.js';
import {createRecordCatalog} from './record-catalog.js';
import {mountListeningPages} from './listening-pages.js';

export function mountCafe({root,route,navigation,localeResume,execute,onEnter,beforeVisit,focusDesktop,entryFocusManaged=false}) {
  const surface=root.querySelector('[data-space-cafe]'),dialog=root.querySelector('[data-cafe-dialog]');
  const catalog=JSON.parse(root.querySelector('[data-cafe-catalog]').textContent),themes=catalog.themes;
  const zh=JSON.parse(root.querySelector('[data-space-catalog]').textContent).language==='zh';
  const t=(cn,en)=>zh?cn:en,choices=root.querySelector('[data-cafe-choices]');
  const pickerStatus=root.querySelector('[data-cafe-picker-status]');
  const desktop=[root.querySelector('[data-space-windows]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')];
  const abort=new AbortController();let disposed=false,initializing=true,failureFocusManaged=false;
  let theme='jiangnan',savedMode,mode,desiredMode,world,failed=false,trigger,revision=0,quiet=false,inspectTrigger,catCode='loading',catTravel=false;
  const inspectPanel=root.querySelector('[data-cafe-inspect-panel]');
  const roomInspection=mountRoomInspection({root,books:catalog.books,records:createRecordCatalog(),zh,
    onInspect:(kind,source)=>inspect(kind,source),onSelectRecord:id=>world?.selectRecord(id),onPlayback:()=>world?.toggleMusic(),onToggleObject:kind=>world?.toggleObject(kind)});
  const listeningPages=mountListeningPages({root,zh,returnFocus:()=>root.querySelector('.space-world__canvas')});
  root.addEventListener('space:readingpage',()=>world?.wake(),{signal:abort.signal});
  function syncInspect(kind){
    if(kind==='reading-seat'||kind==='window')kind=null;
    if(root.dataset.worldRenderer==='jiangnan')roomInspection.show(kind);else roomInspection.show(null);
    const shelf=kind==='books'||kind==='spines',zoom=root.querySelector('[data-cafe-bookzoom]');
    root.querySelector('[data-cafe-booklist-toggle]').setAttribute('aria-expanded','false');root.querySelector('#space-cafe-booklist').hidden=true;
    inspectPanel.hidden=!kind;root.querySelector('[data-cafe-inspect-coffee]').hidden=kind!=='coffee';root.querySelector('[data-cafe-inspect-books]').hidden=!shelf;root.querySelector('[data-cafe-inspect-cat]').hidden=kind!=='cat';
    zoom.setAttribute('aria-pressed',String(kind==='spines'));zoom.textContent=kind==='spines'?t('看整个书架','Whole shelf'):t('走近书脊','See spines');
    root.querySelectorAll('[data-cafe-inspect]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cafeInspect===kind||(button.dataset.cafeInspect==='books'&&shelf))));
  }
  function syncCat(code=catCode){
    catCode=code;
    const messages={loading:t('小猫还在找座位。','The cat is finding its spot.'),ready:t('小猫在这里。','The cat is here.'),watching:t('它抬头望着你。','You have its attention.'),approaching:t('它正沿过道走过来。','It is coming along the aisle.'),arrived:t('它在你身边停了下来。','It has stopped nearby.'),petting:t('它眯起眼睛，轻轻摆着尾巴。','It narrows its eyes and gently sways its tail.'),petted:t('它眯了眯眼，安静地陪着你。','It blinked slowly. It is staying with you.'),'petted-still':t('它眯起眼睛，抬头看着你。','It narrows its eyes and looks up at you.'),noticed:t('它停下来，望着你。','It pauses and looks at you.'),distant:t('先走近它，或点“看看小猫”。','Come closer, or choose “Meet the cat”.'),unreachable:t('它留在店里。回咖啡馆再叫它吧。','It is staying inside. Call again from the café.'),cooldown:t('它刚回应过，稍等片刻。','Give it a moment before asking again.'),unavailable:t('小猫暂时没出现，咖啡馆仍可继续逛。','The cat is not here right now. You can still explore the café.')};
    root.querySelector('[data-cafe-cat-status]').textContent=messages[code]||messages.ready;
    const unavailable=code==='loading'||code==='unavailable',busy=code==='approaching'||code==='waking';
    root.querySelector('[data-cafe-inspect="cat"]').setAttribute('aria-disabled',String(unavailable));
    root.querySelectorAll('[data-cafe-cat-action]').forEach(button=>{button.setAttribute('aria-disabled',String(unavailable||busy||catTravel));button.setAttribute('aria-busy',String(busy||catTravel));});
  }

  try{theme=cafeTheme(localStorage.getItem('space:cafe:theme:v2'));quiet=localStorage.getItem('space:cafe:quiet:v1')==='yes';}catch{}
  try{savedMode=sessionStorage.getItem('space:cafe:mode');}catch{}
  const url=new URL(location.href);
  if(localeResume&&url.searchParams.has('space-cafe'))savedMode=url.searchParams.get('space-cafe');
  if(url.searchParams.has('space-cafe')){url.searchParams.delete('space-cafe');history.replaceState(null,'',url.pathname+url.search+url.hash);}
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
    try{localStorage.setItem('space:cafe:theme:v2',id);}catch{}
  }
  function setQuiet(value) {
    quiet=value;root.dataset.environmentPaused=String(value);
    root.querySelectorAll('[data-cafe-quiet]').forEach(button=>{
      button.setAttribute('aria-pressed',String(value));
      button.title=value?t('安静模式已开启，点击恢复环境动效','Quiet mode is on. Resume environment motion'):t('暂停小猫、水面和雨水的动效','Pause the cat, water and rain motion');
    });
    world?.setQuiet(value);
    try{localStorage.setItem('space:cafe:quiet:v1',value?'yes':'no');}catch{}
  }
  commit(theme);setQuiet(quiet);desiredMode=cafeEntryMode({route,navigation,saved:savedMode,localeResume});setMode(desiredMode);
  const boot=mountOnboarding({root,enabled:true,onReveal:result=>{
    if(result?.failed){desiredMode='desktop';setMode('desktop');onEnter();if(!failureFocusManaged)focusDesktop()?.focus({preventScroll:true});}
    world?.wake();
  }});
  root.dataset.worldLoading='true';desktop.forEach(el=>{el.inert=true;});
  function failWorld(message) {
    if(disposed||failed)return;
    const focused=document.activeElement;
    const selection=typeof focused?.selectionStart==='number'?[focused.selectionStart,focused.selectionEnd,focused.selectionDirection]:null;
    failureFocusManaged=initializing&&entryFocusManaged&&!boot.active;
    failed=true;++revision;world?.dispose();world=null;root.dataset.worldFailed='true';root.dataset.computerView='expanded';syncCat('unavailable');
    for(const key of ['worldReady','worldMode','worldTravel','worldLoading'])delete root.dataset[key];
    // A completed onboarding cannot display a second failure state. Restore the
    // ordinary DOM workspace immediately, including after context loss.
    desiredMode='desktop';setMode('desktop');onEnter();
    if(boot.active)boot.event('failure');
    pickerStatus.textContent=message;
    root.querySelectorAll('[data-cafe-enter],[data-cafe-start],[data-cafe-outside],[data-cafe-visit]').forEach(button=>{button.disabled=false;});
    const toast=root.querySelector('[data-space-toast]');toast.textContent=message;toast.hidden=false;
    if(!boot.active&&!failureFocusManaged){
      const target=focused?.isConnected&&root.contains(focused)&&!focused.closest('[inert]')&&focused.getClientRects().length&&getComputedStyle(focused).visibility==='visible'?focused:focusDesktop();
      target?.focus({preventScroll:true});
      if(selection&&target===focused)focused.setSelectionRange(...selection);
    }
  }
  // Background tabs do not spend the first-frame deadline while rendering is
  // intentionally suspended. All listeners/timers settle with the frame.
  function firstVisibleFrame(promise) {
    return new Promise((resolve,reject)=>{
      let remaining=30000,last=0,timer;
      const cleanup=()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);observer.disconnect();};
      function visibility(){
        clearTimeout(timer);if(last)remaining-=performance.now()-last;last=0;
        if(!document.hidden&&!root.hidden){last=performance.now();timer=setTimeout(()=>{cleanup();reject(new Error('First frame timed out'));},Math.max(0,remaining));}
      }
      const observer=new MutationObserver(visibility);observer.observe(root,{attributes:true,attributeFilter:['hidden']});
      document.addEventListener('visibilitychange',visibility);visibility();
      promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
    });
  }
  const ready=(async()=>{
    try {
      const config=JSON.parse(document.querySelector('[data-space-world-module]').textContent);let timer;
      const module=await Promise.race([import(config.module),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('3D module timed out')),15000);})]).finally(()=>clearTimeout(timer));
      if(disposed)return null;
      world=module.createCafeWorld({root,theme,catAsset:catalog.catAsset,photoAsset:catalog.photoAsset,latteAsset:catalog.latteAsset,mapleAsset:catalog.mapleAsset,materialBase:catalog.materialBase,books:catalog.books,onDetail:(kind,source)=>inspect(kind,source),onInspect:syncInspect,onCat:syncCat,onComputer:()=>enterDesktop(true),onReturn:()=>visit(),onNotebook:async()=>{if(await enterDesktop())execute('open',{app:'notes'});},onPhoto:async id=>{if(await enterDesktop())execute('open',{app:'photos',payload:id});},onFailure:()=>failWorld(t('场景已暂停，工作区仍可使用。','The room has paused. Your workspace is available.')),
        onBootStage:stage=>{if(!disposed&&!failed)boot.event(stage);},
        isBlocked:()=>boot.active||dialog.open||Boolean(root.querySelector('dialog[open]'))||root.hidden||root.dataset.roomPageOpen==='true',
        onTravel:busy=>{catTravel=busy;syncCat();root.querySelectorAll('[data-cafe-enter],[data-cafe-start],[data-cafe-outside],[data-cafe-visit]').forEach(button=>{button.disabled=busy;});}
      });
      world.setQuiet(quiet);
      const startup=desiredMode==='desktop'?world.focus(false):world.start({animate:false,focus:false});
      if(!await firstVisibleFrame(Promise.all([Promise.resolve(startup),world.firstFrame]).then(([,painted])=>painted)))throw new Error('Rendering stopped');
      if(disposed||failed)return null;
      delete root.dataset.worldLoading;setMode(desiredMode);boot.event('frame');return world;
    } catch(error) {
      failWorld(t('场景暂时无法启动，可以直接阅读或打开工作区。','The room could not start. You can read or open the workspace.'));
      return null;
    } finally {initializing=false;}
  })();
  function closePicker(){dialog.close();}
  dialog.addEventListener('close',()=>{
    const target=trigger?.isConnected&&!trigger.closest('[inert]')?trigger:mode==='cafe'?root.querySelector('[data-cafe-read]'):root.querySelector('.space-world-hud [data-cafe-visit]');
    target?.focus({preventScroll:true});world?.wake();
  },{signal:abort.signal});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closePicker();}},{signal:abort.signal});
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
  async function inspect(kind,source){
    if((!['coffee','books','spines','cat','records','vinyl','clock','vase','espresso','reading-seat','window','painting'].includes(kind)&&!kind.startsWith('book:'))||mode!=='cafe'||failed||boot.active)return false;
    if(kind==='cat'&&root.dataset.catLoaded!=='true')return false;
    const current=++revision;inspectTrigger=source;await ready;if(current!==revision||disposed||!world)return false;
    const ownsFocus=document.activeElement===source,pending=world.inspect(kind);
    if(ownsFocus&&world.mode==='inspect'){if(kind==='reading-seat'||kind==='window')root.querySelector('.space-world__canvas').focus({preventScroll:true});else if(root.dataset.worldRenderer==='jiangnan')roomInspection.focus();else root.querySelector('[data-cafe-inspect-exit]').focus({preventScroll:true});}return pending;
  }
  async function restoreInspect(){
    if(!world||world.mode!=='inspect')return false;++revision;const source=inspectTrigger,ownsFocus=inspectPanel.contains(document.activeElement)||roomInspection.contains(document.activeElement);inspectTrigger=null;const pending=world.restoreInspection();
    if(ownsFocus){const target=source?.isConnected&&source.getClientRects().length&&!source.closest('[inert]')?source:root.querySelector('.space-world__canvas');target?.focus({preventScroll:true});}return pending;
  }
  async function enterDesktop(focus=false){
    const current=++revision;desiredMode='desktop';boot.dismiss();
    if(dialog.open)closePicker();
    if(mode==='desktop'&&!root.dataset.worldLoading&&(!world||world.mode==='workspace')){
      if(focus)focusDesktop()?.focus({preventScroll:true});return true;
    }
    onEnter();await ready;if(current!==revision||disposed)return false;
    if(world)await world.focus();if(current!==revision||disposed)return false;
    setMode('desktop');if(focus)focusDesktop()?.focus({preventScroll:true});return true;
  }
  async function visit(place='return'){
    desiredMode='cafe';boot.dismiss();const current=++revision;beforeVisit();if(dialog.open)closePicker();
    const address=new URL(location.href);address.hash='';address.searchParams.delete('profile');history.replaceState(null,'',address.pathname+address.search);
    setMode('cafe');await ready;if(current!==revision||disposed)return false;
    if(world){
      if(place==='seat')await world.start();
      else if(place==='outside')await world.outside();
      else await world.leave();
      return current===revision&&!disposed;
    }
    setMode('desktop');onEnter();return false;
  }
  root.addEventListener('click',async event=>{
    const target=event.target;
    const detail=target.closest('[data-cafe-inspect]');if(detail)inspect(detail.dataset.cafeInspect,detail);
    const catAction=target.closest('[data-cafe-cat-action]');if(catAction&&catAction.getAttribute('aria-disabled')!=='true')world?.interactCat(catAction.dataset.cafeCatAction);
    if(target.closest('[data-cafe-inspect-exit]'))restoreInspect();
    if(target.closest('[data-cafe-bookzoom]')&&world?.mode==='inspect'){++revision;world.inspect(root.dataset.worldInspect==='spines'?'books':'spines');}
    const booklistToggle=target.closest('[data-cafe-booklist-toggle]');if(booklistToggle){const expanded=booklistToggle.getAttribute('aria-expanded')==='true';booklistToggle.setAttribute('aria-expanded',String(!expanded));root.querySelector('#space-cafe-booklist').hidden=expanded;}
    if(target.closest('[data-cafe-start]'))visit('seat');
    if(target.closest('[data-cafe-enter]'))enterDesktop(true);
    if(target.closest('[data-cafe-read]')){if(await enterDesktop())execute('open',{app:'reader'});}
    if(target.closest('[data-cafe-photos]')){if(await enterDesktop())execute('open',{app:'photos'});}
    if(target.closest('[data-cafe-visit]'))visit();
    if(target.closest('[data-cafe-picker]'))openPicker(target.closest('[data-cafe-picker]'));
    if(target.closest('[data-cafe-picker-close]'))closePicker();
    if(target.closest('[data-cafe-language]'))execute('language',{value:zh?'en':'zh'});
    if(target.closest('[data-cafe-quiet]'))setQuiet(!quiet);
    if(target.closest('[data-cafe-replay]')){if(await visit('seat'))boot.replay();}
    if(target.closest('[data-cafe-outside]'))visit('outside');
    const choice=target.closest('button[data-cafe-theme]');
    if(choice){
      await ready;if(disposed)return;
      const id=choice.dataset.cafeTheme,current=++revision;
      // A change of renderer replaces the old canvas. Keep the terminal visible
      // throughout the real download/build/first-frame handoff.
      const replacing=world&&(id==='jiangnan')!==(theme==='jiangnan');
      if(replacing){closePicker();boot.begin();}
      try{
        if(world&&await firstVisibleFrame(world.setTheme(id))===false)return;
      }catch{
        if(!disposed&&current===revision)failWorld(t('场景切换未能完成，仍可阅读或打开工作区。','The scene could not finish loading. You can still read or open the workspace.'));
        return;
      }
      if(disposed||current!==revision)return;
      commit(id);if(replacing)boot.event('frame');
      pickerStatus.textContent=t(`已来到${themes.find(scene=>scene.id===id).name}。`,`Now in ${themes.find(scene=>scene.id===id).name}.`);
      if(dialog.open)closePicker();
    }
  },{signal:abort.signal});
  window.addEventListener('pagehide',event=>{if(!event.persisted){disposed=true;abort.abort();boot.dispose();roomInspection.dispose();listeningPages.dispose();world?.dispose();}},{signal:abort.signal});
  return {ready,get active(){return mode==='cafe';},get modalOpen(){return dialog.open||boot.active;},get mode(){return mode;},get spatial(){return Boolean(world);},enterDesktop,visit,openPicker,escape(){if(world?.mode==='inspect')restoreInspect();else if(world?.mode==='roam')world.start();}};
}
