export function languageDestination(language, routes, currentURL) {
  if (!['zh', 'en'].includes(language)) return null;
  const path = routes?.[language];
  try {
    const current = new URL(currentURL);
    const prefix = current.pathname.match(/^(\/(?:[^/]+\/)*?)(?:(?:zh|en)\/)?projects\/$/)?.[1];
    if (!prefix) return null;
    const allowed = language === 'en' ? [`${prefix}projects/`, `${prefix}en/projects/`] : [`${prefix}zh/projects/`];
    if (!allowed.includes(path)) return null;
    const target = new URL(path, current.origin);
    if (target.origin !== current.origin || target.pathname !== path) return null;
    target.search = current.search;
    target.hash = current.hash;
    return target.href;
  } catch { return null; }
}

export function canAnimateEntry({ reducedMotion, coarsePointer, saveData, width, visible }) {
  return !reducedMotion && !coarsePointer && !saveData && width > 640 && visible === true;
}

// Initial route focus is deferred while the same DOM workspace is inert.
// Any newer intent cancels this one-shot handoff, including failure recovery.
export function handoffEntryFocus({ready,target,origin,document,window,isCurrent,focus}) {
  if(!target||(origin!==document.body&&!target.contains(origin)))return Promise.resolve(false);
  let owned=true;const removers=[];
  const cleanup=()=>{for(const remove of removers.splice(0))remove();};
  const cancel=()=>{owned=false;cleanup();};
  const listen=(surface,type,handler)=>{surface.addEventListener(type,handler,true);removers.push(()=>surface.removeEventListener(type,handler,true));};
  listen(document,'focusin',event=>{if(event.target!==origin&&event.target!==document.body)cancel();});
  listen(document,'pointerdown',cancel);listen(document,'keydown',cancel);
  listen(window,'hashchange',cancel);listen(window,'pagehide',cancel);
  return Promise.resolve(ready).then(()=>{
    cleanup();
    if(!owned||!isCurrent()||!target.isConnected||target.closest('[inert]')||!target.getClientRects().length||![origin,document.body].includes(document.activeElement))return false;
    focus();return true;
  },()=>{cleanup();return false;});
}
