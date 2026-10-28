import {listeningPageURL,listeningLinkURL,isListeningRoomURL,isPlainListeningClick,hasNativeListeningTarget} from './listening-pages.mjs';

// Keep the original document (and its AudioContext) alive while opening actual
// public pages in a child browsing context. No audio state is reconstructed.
// History: https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-history-interface
// Child replace: https://developer.mozilla.org/en-US/docs/Web/API/Location/replace
export function mountListeningPages({root,zh=false,returnFocus,onStateChange,loadTimeout=20000}){
  const document=root.ownerDocument,window=document.defaultView,history=window.history;
  if(window.parent!==window)return {open:()=>false,close:()=>false,snapshot:()=>Object.freeze({active:false,loading:false,url:null}),dispose(){}};
  const abort=new window.AbortController(),session=`cafe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const homeURL=window.location.href,homeTitle=document.title;
  const layer=document.createElement('section');layer.className='space-listening-page';layer.hidden=true;
  layer.setAttribute('aria-label',zh?'博客阅读':'Blog reading');
  const style=document.createElement('style');style.dataset.spaceListeningStyle='';
  style.textContent='.space-listening-page{position:fixed;inset:0;z-index:2147483000;background:var(--theme,#faf8f3)}.space-listening-page[hidden]{display:none}.space-listening-page>iframe{display:block;border:0;width:100%;height:100%;background:var(--theme,#faf8f3)}.space-listening-page__status{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}';
  const frame=document.createElement('iframe');frame.title=zh?'博客阅读，按 Esc 回到咖啡馆':'Blog reading. Press Escape to return to the café';frame.referrerPolicy='same-origin';
  const status=document.createElement('p');status.className='space-listening-page__status';status.setAttribute('role','status');
  // Leave the unused child disconnected. After its first public page, retain
  // the navigable while the room is visible so native child history survives.
  layer.append(status);document.body.append(style,layer);
  let active=false,loading=false,disposed=false,initialized=false,generation=0,timer,url=null,trigger,pending,boundDocument,documentAbort;
  const background=new Map(),scrolls=new Map(),childEntries=new Map();let entryCounter=0,displayedEntry=null;
  const owned=state=>state?.spaceListening?.session===session;
  const mark=(kind,scroll,entry=history.state?.spaceListening?.entry??0)=>({...history.state,spaceListening:{session,kind,entry,...(scroll?{scroll}:{})}});
  const snapshot=()=>Object.freeze({active,loading,url:active?url:null});
  function notify(){
    if(disposed)delete root.dataset.roomPageOpen;else root.dataset.roomPageOpen=String(active);
    const state=snapshot();root.dispatchEvent(new window.CustomEvent('space:readingpage',{detail:state}));onStateChange?.(state);
  }
  function holdBackground(){
    for(const element of document.body.children){if(element===layer||element===style||['SCRIPT','STYLE','LINK'].includes(element.tagName))continue;if(!background.has(element))background.set(element,Boolean(element.inert));element.inert=true;}
  }
  function releaseBackground(){for(const [element,inert]of background)element.inert=inert;background.clear();}
  function cancelPending(){++generation;clearTimeout(timer);timer=null;pending=null;}
  function rememberScroll(){
    if(!active||loading)return;
    try{
      if(frame.contentDocument!==boundDocument)return;
      const scroll={x:frame.contentWindow.scrollX,y:frame.contentWindow.scrollY};scrolls.set(displayedEntry,scroll);
      if(owned(history.state)&&history.state.spaceListening.entry===displayedEntry)history.replaceState({...history.state,spaceListening:{...history.state.spaceListening,scroll}},'',window.location.href);
    }catch{}
  }
  function ensureHome(){if(initialized)return;initialized=true;history.replaceState(mark('room'),'',homeURL);}
  function restoreFocus(){
    const target=typeof returnFocus==='function'?returnFocus():returnFocus||trigger;
    if(target?.isConnected&&!target.closest?.('[inert],[hidden]'))target.focus?.({preventScroll:true});
  }
  function close({push=true,replace=false,focus=true}={}){
    if(disposed||!active)return false;
    rememberScroll();cancelPending();active=false;loading=false;url=null;layer.hidden=true;releaseBackground();document.title=homeTitle;
    displayedEntry=null;if(push)history[replace?'replaceState':'pushState'](mark('room',null,++entryCounter),'',homeURL);
    notify();if(focus)restoreFocus();return true;
  }
  function fallback(expected,current){
    if(disposed||!active||current!==generation)return;
    clearTimeout(timer);window.location.assign(expected);
  }
  function handleLink(event,childDocument){
    const anchor=event.target?.closest?.('a[href]');if(!anchor||anchor.closest('[data-space-browser]'))return;
    const base=childDocument?childDocument.location.href:window.location.href;
    const next=listeningLinkURL(anchor,event,base);
    if(next){event.preventDefault();event.stopPropagation();open(next.href);return;}
    // A same-tab external page/file leaves the listening session just as it
    // would in the top document. Modifiers, downloads, hashes and named targets
    // retain the browser's native behavior.
    if(!childDocument||!isPlainListeningClick(event)||hasNativeListeningTarget(anchor))return;
    const href=anchor.getAttribute('href');if(!href||href.startsWith('#'))return;
    let target;try{target=new URL(anchor.href,base);}catch{return;}
    const current=new URL(base);
    if(target.pathname===current.pathname&&target.search===current.search&&target.hash)return;
    if(!['http:','https:'].includes(target.protocol))return;
    event.preventDefault();event.stopPropagation();window.location.assign(target.href);
  }
  function childHasVisibleDialog(childDocument){
    if(!childDocument)return false;
    for(const dialog of childDocument.querySelectorAll('dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"]')){
      if(dialog.closest('[hidden],[aria-hidden="true"],[inert]'))continue;
      let visible=true;
      for(let element=dialog;element;element=element.parentElement){
        const style=childDocument.defaultView.getComputedStyle(element);
        if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'){visible=false;break;}
      }
      if(visible)return true;
    }
    return false;
  }
  function escape(event,childDocument){
    if(!active||event.defaultPrevented||event.key!=='Escape'||event.isComposing)return;
    // Child widgets can register their keyboard handlers lazily after ours.
    // Leave Escape untouched while their visible dialog owns the interaction;
    // the next Escape, after that widget closes, can return to the café.
    if(childHasVisibleDialog(childDocument))return;
    event.preventDefault();event.stopPropagation();close();
  }
  function bindDocument(childDocument){
    if(childDocument===boundDocument&&!documentAbort?.signal.aborted)return;
    documentAbort?.abort();boundDocument=childDocument;documentAbort=new window.AbortController();const signal=documentAbort.signal,child=childDocument.defaultView;
    childDocument.addEventListener('click',event=>handleLink(event,childDocument),{capture:true,signal});
    childDocument.addEventListener('keydown',event=>escape(event,childDocument),{signal});
    child.addEventListener('pageshow',()=>reconcileFrame('traverse'),{signal});
    child.addEventListener('popstate',()=>{const current=generation;setTimeout(()=>{if(current===generation)reconcileFrame('traverse');},0);},{signal});
    child.addEventListener('hashchange',()=>reconcileFrame('load'),{signal});
    child.addEventListener('scroll',()=>{if(active&&!loading&&frame.contentDocument===childDocument)scrolls.set(displayedEntry,{x:child.scrollX,y:child.scrollY});},{passive:true,signal});
    // Scope address synchronization to this owned child, preserving its native
    // History API state and joint-history steps. Filters use replaceState;
    // child routers can use pushState without adding another parent step.
    for(const method of ['pushState','replaceState']){
      const original=child.history[method];
      const wrapped=function(...args){
        if(method==='pushState')rememberScroll();
        const result=original.apply(this,args);
        if(!disposed&&active&&frame.contentDocument===childDocument)reconcileFrame(method==='pushState'?'push':'replace');
        return result;
      };
      child.history[method]=wrapped;
      signal.addEventListener('abort',()=>{if(child.history[method]===wrapped)child.history[method]=original;},{once:true});
    }
  }
  function reconcileFrame(kind='load'){
    if(disposed||!active)return;
    let childDocument,actual,loadedHref;
    try{childDocument=frame.contentDocument;loadedHref=frame.contentWindow.location.href;actual=listeningPageURL(loadedHref,homeURL);}catch{fallback(pending?.url||url,generation);return;}
    if(loadedHref==='about:blank')return;
    if(!childDocument||!actual){fallback(pending?.url||url,generation);return;}
    // A late document from a superseded replace/traversal owns no newer route.
    if(pending&&actual.href!==pending.url)return;
    if(isListeningRoomURL(actual.href,homeURL)){close({replace:true});return;}
    const request=pending,wasLoading=loading;
    const nativeStep=!request&&(kind==='push'||(kind==='load'&&actual.href!==window.location.href));
    // Native child-only steps can share their parent's history entry. Keep a
    // stable cursor owner using the browser's child slot key where available.
    // https://developer.mozilla.org/en-US/docs/Web/API/NavigationHistoryEntry/key
    const slot=childDocument.defaultView.navigation?.currentEntry?.key,key=slot?`${slot} ${actual.href}`:null;
    const explicit=request?.kind==='replace'||kind==='push'||kind==='replace';
    const entry=!explicit&&key&&childEntries.has(key)?childEntries.get(key):nativeStep?++entryCounter:owned(history.state)?history.state.spaceListening.entry:++entryCounter;
    if(key)childEntries.set(key,entry);
    clearTimeout(timer);timer=null;pending=null;loading=false;url=actual.href;displayedEntry=entry;
    document.title=childDocument.title||homeTitle;frame.title=`${document.title} — ${zh?'按 Esc 回到咖啡馆':'Escape returns to the café'}`;status.textContent='';
    // A native child navigation has already created its tab history step.
    // Change only that step's parent address and ownership marker.
    history.replaceState(mark('page',request?.scroll,entry),'',actual.href);
    bindDocument(childDocument);
    if(wasLoading&&request?.focus)frame.contentWindow.focus();
    if(request?.scroll)frame.contentWindow.scrollTo(request.scroll.x||0,request.scroll.y||0);
    notify();
  }
  function beginPage(next,{kind,scroll,focus=true}){
    cancelPending();active=true;loading=true;url=next.href;holdBackground();layer.hidden=false;
    displayedEntry=history.state?.spaceListening?.entry;
    pending={kind,url:next.href,scroll:scrolls.get(displayedEntry)||scroll,focus};
    status.textContent=zh?'正在打开文章。按 Esc 回到咖啡馆。':'Opening the page. Press Escape to return to the café.';
    const current=generation;timer=setTimeout(()=>fallback(next.href,current),loadTimeout);notify();
  }
  function open(value,{push=true,scroll}={}){
    if(disposed)return false;
    const next=listeningPageURL(value,homeURL);if(!next)return false;
    if(isListeningRoomURL(next.href,homeURL)){close({push});return true;}
    if(!initialized)layer.prepend(frame);
    ensureHome();rememberScroll();if(!active)trigger=document.activeElement;
    if(push)history.pushState(mark('page',null,++entryCounter),'',next.href);
    if(document.fullscreenElement&&!document.fullscreenElement.contains(layer))Promise.resolve(document.exitFullscreen?.()).catch(()=>{});
    beginPage(next,{kind:'replace',scroll});
    // The context persists, while an explicit shell navigation replaces only
    // its child document and adds exactly one owned parent history step.
    try{frame.contentWindow.location.replace(next.href);}catch{fallback(next.href,generation);}
    return true;
  }
  frame.addEventListener('load',()=>reconcileFrame(),{signal:abort.signal});
  frame.addEventListener('error',()=>fallback(pending?.url||url,generation),{signal:abort.signal});
  document.addEventListener('click',event=>{if(!disposed)handleLink(event);},{capture:true,signal:abort.signal});
  document.addEventListener('keydown',event=>escape(event),{signal:abort.signal});
  window.addEventListener('popstate',event=>{
    if(disposed||!initialized)return;
    if(owned(event.state)&&event.state.spaceListening.kind==='page'){
      rememberScroll();const next=listeningPageURL(window.location.href,homeURL);if(!next)return;
      beginPage(next,{kind:'traverse',scroll:event.state.spaceListening.scroll});
      const current=generation;
      // Native traversal also restores this persistent child. Do not replace it
      // here: doing so can destroy the browser's remaining forward entries.
      setTimeout(()=>{if(current===generation)reconcileFrame('traverse');},0);
    }else if(isListeningRoomURL(window.location.href,homeURL))close({push:false});
  },{signal:abort.signal});
  return {open,close,snapshot,dispose(){
    if(disposed)return;disposed=true;cancelPending();documentAbort?.abort();abort.abort();active=false;loading=false;url=null;releaseBackground();layer.remove();style.remove();notify();
  }};
}
