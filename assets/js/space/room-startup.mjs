const codes=new Set(['module-load','scene-build','first-frame-timeout','render','context-lost','vista-load','vista-timeout','preview-load','workspace-selected','unknown']);
export function roomStartupError(code,cause){
  const error=new Error('Room startup interrupted',{cause});error.code=codes.has(code)?code:'unknown';return error;
}

// A bounded local record, intentionally excluding exception text, URLs and any
// workspace content. These are observations, not remote telemetry.
export function createRoomDiagnostics(root){
  const started=performance.now(),records=[];
  const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>=0?Math.min(1e9,Math.round(n)):0;};
  return {record(error){
    const requested=typeof error==='string'?error:error?.code;
    records.push({code:codes.has(requested)?requested:'unknown',stage:['engine','workspace','display'][Number(root.dataset.bootStage)]||'runtime',ms:count(performance.now()-started),frames:count(root.dataset.worldFrames),maps:count(root.dataset.worldPbrMaps)});
    if(records.length>12)records.shift();root.dataset.roomDiagnostics=JSON.stringify(records);
  }};
}

// Visibility-aware and cancellable: a pending dynamic import can finish later,
// but it no longer owns the visitor's workspace or deadline listeners.
export function waitForRoomWork(promise,{root,signal,timeout=10000}){
  return new Promise((resolve,reject)=>{
    const doc=root.ownerDocument,Observer=doc.defaultView.MutationObserver;
    let remaining=timeout,last=0,timer,settled=false;
    const observer=new Observer(visibility);
    function cleanup(){clearTimeout(timer);observer.disconnect();doc.removeEventListener('visibilitychange',visibility);signal?.removeEventListener('abort',cancel);}
    function finish(fn,value){if(settled)return;settled=true;cleanup();fn(value);}
    function cancel(){const error=new Error('Room startup cancelled');error.name='AbortError';finish(reject,error);}
    function visibility(){
      clearTimeout(timer);if(last)remaining-=performance.now()-last;last=0;
      if(!doc.hidden&&!root.hidden){last=performance.now();timer=setTimeout(()=>finish(reject,roomStartupError('first-frame-timeout')),Math.max(0,remaining));}
    }
    observer.observe(root,{attributes:true,attributeFilter:['hidden']});doc.addEventListener('visibilitychange',visibility);
    signal?.addEventListener('abort',cancel,{once:true});
    Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
    if(signal?.aborted)cancel();else visibility();
  });
}
