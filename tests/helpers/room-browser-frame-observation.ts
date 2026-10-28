import type {Page,Frame,CDPSession} from '@playwright/test';

export type RoomBrowserFrameSnapshot={textareaValue:string;buttonText:string};
export type RoomBrowserFrameObservation={bind:()=>Promise<void>;observe:()=>Promise<RoomBrowserFrameSnapshot>;close:()=>Promise<void>};
const owners=new WeakMap<Page,object>();
const detachments=new WeakMap<CDPSession,Promise<void>>();
let sequence=0;
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object';
function remoteResult(reply:unknown){
  if(!record(reply)||reply.exceptionDetails||!record(reply.result))throw new Error('Frame observation protocol exception or invalid result');
  return reply.result;
}
function remoteObject(reply:unknown,node=false){
  const result=remoteResult(reply);
  if(result.type!=='object'||typeof result.objectId!=='string'||!result.objectId||(node&&result.subtype!=='node'))throw new Error('Frame observation remote object missing');
  return result.objectId;
}
function ownerFrameId(reply:unknown){
  const node=record(reply)?reply.node:undefined;
  if(!record(node)||node.nodeType!==1||node.nodeName!=='IFRAME'||!Number.isSafeInteger(node.backendNodeId)||Number(node.backendNodeId)<=0||typeof node.frameId!=='string'||!node.frameId)throw new Error('Frame observation iframe owner identity missing');
  return node.frameId;
}
function targetFrameId(reply:unknown){
  const tree=record(reply)?reply.frameTree:undefined,frame=record(tree)?tree.frame:undefined;
  if(!record(frame)||typeof frame.id!=='string'||!frame.id)throw new Error('Frame observation target identity missing');
  return frame.id;
}

// These callbacks only read DOM. Remote objects retain node identity, never
// expected values. Reparenting is allowed; replacement or navigation is not.
function captureIframe(){
  const matches=document.querySelectorAll('.space-browser__page');
  if(matches.length!==1||!(matches[0] instanceof HTMLIFrameElement)||!matches[0].isConnected)throw new Error('Frame observation iframe missing or ambiguous');
  return matches[0];
}
function sameIframe(this:HTMLIFrameElement){
  const matches=document.querySelectorAll('.space-browser__page');
  if(matches.length!==1||matches[0]!==this||!this.isConnected||this.ownerDocument!==document)throw new Error('Frame observation iframe replaced, detached or ambiguous');
  return true;
}
function captureFields(){
  const notes=document.querySelectorAll('textarea[aria-label="A thought to return to"]'),buttons=document.querySelectorAll('button');
  if(notes.length!==1||buttons.length!==1||!(notes[0] instanceof HTMLTextAreaElement)||!(buttons[0] instanceof HTMLButtonElement)||!notes[0].isConnected||!buttons[0].isConnected)throw new Error('Frame observation fields missing or ambiguous');
  return {document,textarea:notes[0],button:buttons[0]};
}
function readFields(this:ReturnType<typeof captureFields>):RoomBrowserFrameSnapshot{
  const notes=document.querySelectorAll('textarea[aria-label="A thought to return to"]'),buttons=document.querySelectorAll('button');
  if(this.document!==document||notes.length!==1||buttons.length!==1||notes[0]!==this.textarea||buttons[0]!==this.button||!this.textarea.isConnected||!this.button.isConnected)throw new Error('Frame observation fields replaced, detached or ambiguous');
  return {textareaValue:this.textarea.value,buttonText:this.button.textContent!};
}

function detachOnce(session:CDPSession){
  let promise=detachments.get(session);
  if(!promise){
    promise=(async()=>{
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{await Promise.race([Promise.resolve().then(()=>session.detach()),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Frame observation detach exceeded5000ms')),5000);})]);}
      finally{if(timer)clearTimeout(timer);}
    })();detachments.set(session,promise);
  }
  return promise;
}

// Public APIs only: https://playwright.dev/docs/api/class-browsercontext#browser-context-new-cdp-session
// DOM.describeNode.frameId binds the actual iframe owner to Page.getFrameTree
// on the captured Frame's own CDP target. Same-process frames without a separate
// target are unsupported and fail closed; no URL or private-field fallback.
// https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-callFunctionOn
export function createRoomBrowserFrameObservation(page:Page):RoomBrowserFrameObservation{
  const token={},group='room-browser-frame-'+(++sequence),sessions=new Set<CDPSession>(),held=new Set<CDPSession>(),ended=new Set<CDPSession>(),attaches=new Set<Promise<CDPSession>>(),listeners=new Map<CDPSession,()=>void>();
  let main:Frame,frame:Frame,parent:CDPSession,child:CDPSession,iframeObject:string,fieldsObject:string,frameId:string;
  let bound=false,busy=false,closing=false,listening=false,failed=false,invalid:unknown,closePromise:Promise<void>|undefined;
  const fail=(cause:unknown)=>{if(!failed){failed=true;invalid=cause??new Error('Frame observation protocol rejected');}return invalid;};
  const changed=(candidate:Frame)=>{if(candidate===main||candidate===frame)fail(new Error('Frame observation window navigated or Frame detached'));};
  const pageClosed=()=>{fail(new Error('Frame observation parent closed'));};
  const sameFrame=()=>{
    const children=main.childFrames();
    if(page.isClosed()||page.mainFrame()!==main||main.isDetached()||frame.isDetached()||children.length!==1||children[0]!==frame||frame.parentFrame()!==main)throw new Error('Frame observation Frame missing, replaced, detached or ambiguous');
  };
  type Step=<T>(work:()=>Promise<T>)=>Promise<T>;
  async function budget<T>(label:string,deadline:number,work:(step:Step)=>Promise<T>,cleanup=false):Promise<T>{
    const check=()=>{if(performance.now()>=deadline)throw new Error('Frame observation '+label+' exceeded5000ms');if(!cleanup&&(failed||closing))throw invalid??new Error('Frame observation closed');};
    const step:Step=async operation=>{check();const value=await operation();check();return value;};
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      const result=await Promise.race([
        Promise.resolve().then(async()=>{check();const value=await work(step);check();return value;}),
        new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Frame observation '+label+' exceeded5000ms')),Math.max(0,deadline-performance.now()));}),
      ]);
      check();return result;
    }catch(cause){if(!cleanup)throw fail(cause);throw cause;}
    finally{if(timer)clearTimeout(timer);}
  }
  function operation<T>(label:string,work:(step:Step)=>Promise<T>){
    const deadline=performance.now()+5000;
    return budget(label,deadline,async step=>{
      if(busy)throw new Error('Concurrent frame observations are not allowed');busy=true;
      try{return await work(step);}finally{busy=false;}
    });
  }
  function attach(target:Page|Frame){
    const pending=Promise.resolve().then(()=>page.context().newCDPSession(target)).then(session=>{
      sessions.add(session);
      const closed=()=>{ended.add(session);if(!closing)fail(new Error('Frame observation protocol target closed'));};
      listeners.set(session,closed);session.once('close',closed);
      // The timed-out operation cannot adopt or use a late connection. Closing
      // still owns it; detach even if close's own deadline has already expired.
      if(closing)void detachOnce(session).catch(()=>{});
      return session;
    });attaches.add(pending);return pending;
  }
  async function parentIdentity(step:Step){
    sameFrame();
    const result=remoteResult(await step(()=>parent.send('Runtime.callFunctionOn',{objectId:iframeObject,functionDeclaration:sameIframe.toString(),returnByValue:true,throwOnSideEffect:true})));
    if(result.type!=='boolean'||result.value!==true)throw new Error('Frame observation iframe identity invalid');
    if(ownerFrameId(await step(()=>parent.send('DOM.describeNode',{objectId:iframeObject,depth:0})))!==frameId)throw new Error('Frame observation iframe target changed');
  }
  return {
    bind:()=>operation('bind',async step=>{
      if(bound||owners.has(page))throw new Error('Frame observation already bound or owned');
      owners.set(page,token);
      if(page.context().browser()?.browserType().name()!=='chromium')throw new Error('Frame observation requires Chromium');
      main=page.mainFrame();const children=main.childFrames();
      if(children.length!==1)throw new Error('Frame observation Frame missing or ambiguous');frame=children[0];sameFrame();
      page.on('framenavigated',changed);page.on('framedetached',changed);page.on('close',pageClosed);listening=true;
      parent=await step(()=>attach(page));held.add(parent);
      iframeObject=remoteObject(await step(()=>parent.send('Runtime.evaluate',{expression:'('+captureIframe.toString()+')()',objectGroup:group,throwOnSideEffect:true})),true);
      frameId=ownerFrameId(await step(()=>parent.send('DOM.describeNode',{objectId:iframeObject,depth:0})));
      child=await step(()=>attach(frame));
      if(targetFrameId(await step(()=>child.send('Page.getFrameTree')))!==frameId)throw new Error('Frame observation owner and target disagree');
      held.add(child);
      fieldsObject=remoteObject(await step(()=>child.send('Runtime.evaluate',{expression:'('+captureFields.toString()+')()',objectGroup:group,throwOnSideEffect:true})));
      await parentIdentity(step);bound=true;
    }),
    observe:()=>operation('observe',async step=>{
      if(!bound)throw new Error('Frame observation not bound');
      await parentIdentity(step);
      if(targetFrameId(await step(()=>child.send('Page.getFrameTree')))!==frameId)throw new Error('Frame observation target changed');
      const result=remoteResult(await step(()=>child.send('Runtime.callFunctionOn',{objectId:fieldsObject,functionDeclaration:readFields.toString(),returnByValue:true,throwOnSideEffect:true}))),value:unknown=result.value;
      if(result.type!=='object'||!record(value)||typeof value.textareaValue!=='string'||typeof value.buttonText!=='string'||Object.keys(value).length!==2)throw new Error('Frame observation snapshot schema invalid');
      await parentIdentity(step);sameFrame();
      return {textareaValue:value.textareaValue,buttonText:value.buttonText};
    }),
    close:()=>{
      if(closePromise)return closePromise;
      const deadline=performance.now()+5000;closing=true;
      closePromise=budget('close',deadline,async step=>{
        if(listening){page.off('framenavigated',changed);page.off('framedetached',changed);page.off('close',pageClosed);listening=false;}
        await step(()=>Promise.allSettled([...attaches]));
        const results=await step(()=>Promise.allSettled([...sessions].map(async session=>{
          if(ended.has(session))return;
          try{if(held.has(session))await session.send('Runtime.releaseObjectGroup',{objectGroup:group});}
          finally{await detachOnce(session);}
        })));
        for(const [session,listener]of listeners)session.off('close',listener);listeners.clear();
        for(const result of results)if(result.status==='rejected')throw result.reason;
        if(owners.get(page)===token)owners.delete(page);
      },true);
      // A stuck release cannot prevent a detach attempt. Late callbacks retain
      // no path to publish values, rebind, or turn a failed close into success.
      void closePromise.catch(()=>{for(const session of sessions)if(!ended.has(session))void detachOnce(session).catch(()=>{});});
      return closePromise;
    },
  };
}
