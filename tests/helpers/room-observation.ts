import type {Page,CDPSession} from '@playwright/test';

type ObservationScope={session?:CDPSession;busy:boolean;invalid:boolean;closing:boolean;error?:unknown};
const scopes=new WeakMap<Page,ObservationScope>();
const cleanups=new WeakMap<CDPSession,Promise<void>>();
function cleanupSession(session:CDPSession){
  const existing=cleanups.get(session);if(existing)return existing;
  const cleanup=(async()=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([session.detach(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Room observation cleanup exceeded5000ms')),5000);})]);}
    finally{if(timer)clearTimeout(timer);}
  })();cleanups.set(session,cleanup);return cleanup;
}
// Reuse one owned connection during an explicit journey. Observation deadlines
// retain their caller budgets; final detach is bounded5s and stays INSIDE the original case budget.
export async function withRoomObservationSession<T>(page:Page,journey:()=>Promise<T>):Promise<T>{
  if(scopes.has(page))throw new Error('Room observation session scope already active');
  const scope:ObservationScope={busy:false,invalid:false,closing:false};scopes.set(page,scope);let failed=false;
  try{const result=await journey();if(scope.busy&&!scope.invalid){scope.invalid=true;scope.error=new Error('Room journey ended with a pending observation');}if(scope.invalid)throw scope.error;return result;}
  catch(error){failed=true;if(!scope.invalid){scope.invalid=true;scope.error=error;}throw scope.error;}
  finally{
    scope.closing=true;
    try{if(scope.session)try{await cleanupSession(scope.session);}catch(error){if(!failed)throw error;console.warn('Room scoped observation cleanup error',error);}}
    finally{scopes.delete(page);}
  }
}

// Read actual room DOM without the trace snapshots surrounding ordinary frame
// calls. The one Node deadline includes attach, execution, transport, schema
// validation and unscoped successful detach. Explicit journey scopes reuse the
// owned connection and detach in their finally, inside the original case budget.
// All input remains outside this helper and uses the original native actions.
export async function readRoomObservation<T,A>(page:Page,observation:(arg:A)=>T|Promise<T>,arg:A,options:{timeout:5000|6000|12000|30000;label:string;validate:(value:unknown)=>value is T}):Promise<T>{
  if(page.context().browser()?.browserType().name()!=='chromium')throw new Error('Room protocol observation requires Chromium');
  const scope=scopes.get(page);
  const invalidate=(error:unknown)=>{if(scope&&!scope.invalid){scope.invalid=true;scope.error=error;}};
  if(scope?.invalid)throw scope.error;
  if(scope?.closing)throw new Error('Room observation scope closing');
  if(scope?.busy){const error=new Error('Concurrent room observations are not allowed');invalidate(error);throw error;}
  if(scope)scope.busy=true;
  const deadline=performance.now()+options.timeout,error=()=>new Error(options.label+' exceeded'+options.timeout+'ms');
  const within=async<R>(operation:()=>Promise<R>)=>{
    const remaining=deadline-performance.now();if(remaining<=0)throw error();
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([operation(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(error()),remaining);})]);}
    finally{if(timer)clearTimeout(timer);}
  };
  const attaching=Promise.resolve().then(()=>scope?.session??page.context().newCDPSession(page));let session:CDPSession;
  try{session=await within(()=>attaching);}
  catch(cause){invalidate(cause);if(scope)scope.busy=false;void attaching.then(cleanupSession).catch(error=>console.warn('Room observation late attach cleanup error',error));throw cause;}
  let failed=false,detached=false,retained=false;
  try{
    if(scope?.closing)throw scope.error??new Error('Room observation scope closing');
    if(scope)scope.session=session;
    const expression='('+observation.toString()+')('+(JSON.stringify(arg)??'undefined')+')';
    const result=await within(()=>session.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}));
    if(result.exceptionDetails)throw new Error(options.label+' failed: '+(result.exceptionDetails.exception?.description||result.exceptionDetails.text));
    const value:unknown=result.result.value;if(!options.validate(value))throw new Error(options.label+' returned an invalid value');
    if(scope?.invalid)throw scope.error;
    if(!scope){await within(()=>cleanupSession(session));detached=true;}
    if(performance.now()>deadline)throw error();
    if(scope){if(scope.closing)throw scope.error??new Error('Room observation scope closing');retained=true;}
    return value;
  }catch(cause){failed=true;invalidate(cause);throw scope?.invalid?scope.error:cause;}
  finally{
    if(scope){scope.busy=false;if(!retained)scope.session=undefined;}
    if(!detached&&!retained)try{await cleanupSession(session);}catch(error){if(!failed)throw error;console.warn('Room observation cleanup error',error);}
  }
}

// These reads run at the original after-input checkpoints. They never send
// input or alter room state, and a replacement root cannot satisfy a wait.
export async function expectRoomAttributes(page:Page,attributes:Record<string,string>,timeout:5000|30000=5000){
  await readRoomObservation(page,async({attributes,timeout})=>{
    const deadline=performance.now()+timeout;let root:Element|undefined;
    const diagnostic={timeOrigin:performance.timeOrigin,startedAt:performance.now(),deadline,
      lastSampleAt:null as number|null,matchedAt:null as number|null,finishedAt:null as number|null,
      initialMatch:null as boolean|null,samples:0,rootCount:0,status:'waiting'};
    (window as unknown as {__roomAttributeObservation:typeof diagnostic}).__roomAttributeObservation=diagnostic;
    return new Promise<boolean>((resolve,reject)=>{
      let settled=false,timer:ReturnType<typeof setTimeout>|undefined;
      const finish=(ok:boolean,cause?:unknown,status=ok?'matched':'error')=>{
        if(settled)return;settled=true;diagnostic.status=status;diagnostic.finishedAt=performance.now();
        observer.disconnect();if(timer)clearTimeout(timer);if(ok)resolve(true);else reject(cause);
      };
      const sample=()=>{
        if(settled)return;
        try{
          const now=performance.now();diagnostic.lastSampleAt=now;diagnostic.samples=Math.min(1024,diagnostic.samples+1);
          if(now>deadline){finish(false,new Error('Room attributes exceeded'+timeout+'ms'),'timeout');return;}
          const roots=document.querySelectorAll('[data-bear-workspace]');diagnostic.rootCount=Math.min(2,roots.length);
          if(roots.length>1)throw new Error('Room attribute root ambiguous');
          if(root&&roots[0]!==root)throw new Error('Room attribute root replaced');
          root??=roots[0];
          const matches=Boolean(root&&Object.entries(attributes).every(([name,value])=>root!.getAttribute(name)===value));
          const checkedAt=performance.now();diagnostic.lastSampleAt=checkedAt;
          if(checkedAt>deadline){finish(false,new Error('Room attributes exceeded'+timeout+'ms'),'timeout');return;}
          if(diagnostic.initialMatch===null)diagnostic.initialMatch=matches;
          if(matches){diagnostic.matchedAt=checkedAt;finish(true);}
        }catch(cause){finish(false,cause);}
      };
      const observer=new MutationObserver(sample);
      try{
        // Observe only real DOM changes. The original Node gate still includes
        // setup, dispatch and reply; a timely mutation cannot excuse a late reply.
        observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:Object.keys(attributes)});
        timer=setTimeout(()=>finish(false,new Error('Room attributes exceeded'+timeout+'ms'),'timeout'),Math.max(0,deadline-performance.now()));
        sample();
      }catch(cause){finish(false,cause);}
    });
  },{attributes,timeout},{timeout,label:'Room attributes',validate:(value):value is boolean=>value===true});
}

export async function observePausedResident(page:Page,checkFrames=false){
  await readRoomObservation(page,async(checkFrames)=>{
    const deadline=performance.now()+5000;
    const roots=document.querySelectorAll<HTMLElement>('[data-bear-workspace]');
    if(roots.length!==1)throw new Error('Resident pause root missing or ambiguous');
    const el=roots[0];
    const sameRoot=()=>{const current=document.querySelectorAll('[data-bear-workspace]');if(current.length!==1||current[0]!==el)throw new Error('Resident pause root replaced');};
    for(;;){
      sameRoot();const remaining=deadline-performance.now();if(remaining<0)throw new Error('Resident pause exceeded5000ms');
      if(el.dataset.catActive==='false')break;
      if(remaining===0)throw new Error('Resident pause exceeded5000ms');
      await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
    }
    sameRoot();const pose=el.dataset.catPose;if(!pose)throw new Error('Resident pause pose missing');
    await new Promise(resolve=>setTimeout(resolve,400));sameRoot();
    if(el.dataset.catActive!=='false'||el.dataset.catPose!==pose)throw new Error('Resident moved during400ms pause observation');
    if(checkFrames){
      const frames=el.dataset.worldFrames;if(!frames)throw new Error('Resident pause frame counter missing');
      await new Promise(resolve=>setTimeout(resolve,200));sameRoot();
      if(el.dataset.catActive!=='false'||el.dataset.catPose!==pose||el.dataset.worldFrames!==frames)throw new Error('Quiet room rendered during200ms idle observation');
    }
    return true;
  // The state has its own5s deadline. Keep the subsequent400ms pose and
  // optional200ms idle windows complete, with bounded transport/cleanup room.
  // This combined read remains inside the unchanged90s journey deadline.
  },checkFrames,{timeout:6000,label:'Resident pause',validate:(value):value is boolean=>value===true});
}

export async function waitForRoomObjectAdvance(page:Page,key:string,before:number){
  if(!Number.isFinite(before))throw new Error('Room object baseline invalid');
  return readRoomObservation(page,async({key,before})=>{
    const deadline=performance.now()+5000,roots=document.querySelectorAll<HTMLElement>('[data-bear-workspace]');
    if(roots.length!==1)throw new Error('Room object root missing or ambiguous');
    const root=roots[0];
    for(;;){
      const current=document.querySelectorAll('[data-bear-workspace]');if(current.length!==1||current[0]!==root)throw new Error('Room object root replaced');
      const value=JSON.parse(root.dataset.roomObjects||'null')?.[key];
      if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Room object value invalid');
      if(value>before)return value;
      const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Room object advance exceeded5000ms');
      await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
    }
  },{key,before},{timeout:5000,label:'Room object advance',validate:(value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>before});
}

export async function waitForRoomBoatMove(page:Page,before:string|null):Promise<string>{
 let coordinates:unknown;
 try{coordinates=typeof before==='string'?JSON.parse(before):null;}catch{}
 const finitePose=(value:unknown):value is number[]=>Array.isArray(value)&&value.length===3&&value.every(n=>typeof n==='number'&&Number.isFinite(n));
 if(typeof before!=='string'||!finitePose(coordinates))throw new Error('Boat baseline invalid');
 return readRoomObservation(page,async({coordinates})=>{
  const deadline=performance.now()+5000,roots=document.querySelectorAll('[data-bear-workspace]');
  if(roots.length!==1)throw new Error('Boat root missing or ambiguous');
  const root=roots[0];
  for(;;){
   const current=document.querySelectorAll('[data-bear-workspace]');if(current.length!==1||current[0]!==root)throw new Error('Boat root replaced');
   const text=root.getAttribute('data-room-boat-pose');let pose;
   try{pose=JSON.parse(text??'null');}catch{throw new Error('invalid boat pose');}
   if(!Array.isArray(pose)||pose.length!==3||!pose.every(n=>typeof n==='number'&&Number.isFinite(n)))throw new Error('invalid boat pose');
   if(pose.some((n,i)=>n!==coordinates[i]))return text!;
   const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Boat movement exceeded5000ms');
   await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
  }
 },{coordinates},{timeout:5000,label:'Room boat motion',validate:(value):value is string=>{
  if(typeof value!=='string'||value===before)return false;
  try{const pose:unknown=JSON.parse(value);return finitePose(pose)&&pose.some((n,i)=>n!==(coordinates as number[])[i]);}catch{return false;}
 }});
}

export type ResidentStartupObservation={status:string;initialPose:string;initialTime:number;changedPose:string;changedTime:number;bootCompleteAt:number|null;renderedRoamAt:number|null;readinessError:string|null};
// Keep the original room boot, rendered-mode, asset and movement gates
// independent. The enclosing Playwright case still owns the total90s budget.
export async function observeResidentStartup(page:Page):Promise<ResidentStartupObservation>{
  const stages=[['boot',30000],['roam',5000],['cat',30000],['motion',12000]] as const;
  let movement:ResidentStartupObservation|undefined;
  for(const [phase,timeout]of stages){
    const value=await readRoomObservation(page,async({phase,timeout})=>{
      const deadline=performance.now()+timeout;
      for(;;){
        if(performance.now()>deadline)throw new Error('Resident '+phase+' exceeded'+timeout+'ms');
        const state=window as unknown as {__catMotionObservation:ResidentStartupObservation;__catMotionRoot:Element;__catReadinessRoot:Element},data=state.__catMotionObservation;
        if(!data)throw new Error('Resident startup observation missing');
        if(data.readinessError||['motion-timeout','startup-timeout','pagehide'].includes(data.status))throw new Error('Resident startup observation: '+(data.readinessError||data.status));
        const roots=document.querySelectorAll<HTMLElement>('[data-bear-workspace]'),el=roots[0];
        if(roots.length>1)throw new Error('Resident startup root ambiguous');
        if((state.__catMotionRoot&&el!==state.__catMotionRoot)||(state.__catReadinessRoot&&el!==state.__catReadinessRoot))throw new Error('Resident startup root replaced');
        if(data.bootCompleteAt!==null){
          if(data.renderedRoamAt===null&&performance.now()-data.bootCompleteAt>5000)throw new Error('Rendered roam exceeded5s after observed boot completion');
          if(data.renderedRoamAt!==null&&data.renderedRoamAt-data.bootCompleteAt>5000)throw new Error('Rendered roam arrived after5s');
        }
        const owned=roots.length===1&&el===state.__catMotionRoot&&el===state.__catReadinessRoot;
        const boot=owned&&el.dataset.bootState==='complete'&&Number.isFinite(data.bootCompleteAt);
        const roam=boot&&el.dataset.worldRenderedMode==='roam'&&Number.isFinite(data.renderedRoamAt);
        if(phase==='boot'&&boot)return true;
        if(phase==='roam'&&roam)return true;
        if(phase==='cat'&&roam&&el.dataset.catLoaded==='true')return true;
        if(phase==='motion'&&roam&&el.dataset.catLoaded==='true'&&data.status==='changed')return data;
        const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Resident '+phase+' exceeded'+timeout+'ms');
        await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
      }
    },{phase,timeout},{timeout,label:'Resident '+phase+' observation',validate:(value):value is true|ResidentStartupObservation=>{
      if(phase!=='motion')return value===true;
      if(!value||typeof value!=='object')return false;const data=value as Record<string,unknown>;
      if(data.status!=='changed'||typeof data.initialPose!=='string'||typeof data.changedPose!=='string'||data.initialPose===data.changedPose||data.readinessError!==null)return false;
      if(!['initialTime','changedTime','bootCompleteAt','renderedRoamAt'].every(key=>typeof data[key]==='number'&&Number.isFinite(data[key])))return false;
      const duration=Number(data.changedTime)-Number(data.initialTime),renderDelay=Number(data.renderedRoamAt)-Number(data.bootCompleteAt);
      return duration>0&&duration<=12000&&renderDelay>=0&&renderDelay<=5000;
    }});
    if(value!==true)movement=value;
  }
  if(!movement)throw new Error('Resident motion observation missing');
  return movement;
}
