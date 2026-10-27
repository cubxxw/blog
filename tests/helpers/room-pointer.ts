import type {Page,CDPSession} from '@playwright/test';
export type RoomPoint={x:number;y:number};
export type RoomPointer={click(point:RoomPoint):Promise<void>;drag(from:RoomPoint,to:RoomPoint):Promise<void>;focusCanvas():Promise<void>};
const owners=new WeakMap<Page,{fail:(error:unknown)=>void}>();
async function bounded<T>(operation:Promise<T>,label:string,onTimeout?:()=>void):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{onTimeout?.();reject(new Error('Room pointer '+label+' exceeded30000ms'));},30000);})]);}
 finally{if(timer)clearTimeout(timer);}
}
function point(value:RoomPoint):RoomPoint{
 if(!Number.isFinite(value?.x)||!Number.isFinite(value?.y))throw new Error('Room pointer coordinates invalid');
 return {x:value.x,y:value.y};
}

// Only consecutive helper-owned, modifier-free mouse input belongs here. Keep
// direct PW mouse/touch input outside. Native events remain real; only the
// redundant per-object PW position sync is deferred to this owner's finally.
export async function withRoomPointerBatch<T>(page:Page,journey:(pointer:RoomPointer)=>Promise<T>):Promise<T>{
 const prior=owners.get(page);
 if(prior){const error=new Error('Room pointer batch already active');prior.fail(error);throw error;}
 if(page.isClosed()||page.context().browser()?.browserType().name()!=='chromium')throw new Error('Room pointer batch requires an open Chromium page');
 const errors:unknown[]=[];
 const fail=(error:unknown)=>{if(!errors.includes(error))errors.push(error);};
 owners.set(page,{fail});
 let closing=false,busy=false,pressed=false,uncertain=false,cleanupFailed=false,quarantining=false;
 let last:RoomPoint|undefined,session:CDPSession|undefined,attaching:Promise<CDPSession>|undefined,active:Promise<void>|undefined,detaching:Promise<void>|undefined;
 const guard=()=>{
  if(errors.length)throw errors[0];
  if(closing||page.isClosed())throw new Error('Room pointer batch is closed');
 };
 const detach=(target:CDPSession)=>{
  if(!detaching){detaching=bounded(Promise.resolve().then(()=>target.detach()),'detach');void detaching.catch(()=>{});}
  return detaching;
 };
 const getSession=async()=>{
  guard();
  if(!attaching){
   attaching=page.context().newCDPSession(page);
   // A promise deadline cannot cancel attach. A late connection can only close.
   void attaching.then(target=>{if(closing)void detach(target).catch(async error=>{
    console.warn('Room pointer late attach cleanup error',error);
    if(!page.isClosed())try{await bounded(page.close({runBeforeUnload:false}),'late quarantine');}catch(closeError){console.warn('Room pointer late quarantine error',closeError);}
   });},()=>{});
  }
  session=await bounded(attaching,'attach');guard();return session;
 };
 const send=async(target:CDPSession,type:'mouseMoved'|'mousePressed'|'mouseReleased',at:RoomPoint,buttons:number)=>{
  guard();last=at;
  // Dispatch can have happened even when its reply fails. Mark before await.
  if(type==='mousePressed')pressed=true;
  try{
   await bounded(target.send('Input.dispatchMouseEvent',{type,x:at.x,y:at.y,button:type==='mouseMoved'&&buttons===0?'none':'left',buttons,modifiers:0,
    ...(type==='mouseMoved'?{}:{clickCount:1}),...(type==='mouseReleased'?{}:{force:buttons?0.5:0})}),type);
  }catch(error){uncertain=true;throw error;}
  if(type==='mouseReleased')pressed=false;
  guard();
 };
 const run=(operation:()=>Promise<void>):Promise<void>=>{
  if(closing||errors.length||busy){
   const error=errors[0]??new Error(busy?'Concurrent room pointer operations are not allowed':'Room pointer batch is closed');fail(error);
   const rejected=Promise.reject(error);void rejected.catch(()=>{});return rejected;
  }
  busy=true;
  const task=(async()=>{try{guard();await operation();}catch(error){fail(error);throw error;}finally{busy=false;}})();
  active=task;void task.catch(()=>{});return task;
 };
 const pointer:RoomPointer={
  click:value=>run(async()=>{const at=point(value),target=await getSession();await send(target,'mouseMoved',at,0);await send(target,'mousePressed',at,1);await send(target,'mouseReleased',at,0);}),
  drag:(from,to)=>run(async()=>{const a=point(from),b=point(to),target=await getSession();await send(target,'mouseMoved',a,0);await send(target,'mousePressed',a,1);await send(target,'mouseMoved',b,1);await send(target,'mouseReleased',b,0);}),
  focusCanvas:()=>run(async()=>{
   const target=await getSession();
   // Same real HTMLElement.focus({preventScroll:true}) used by PW for canvas.
   // This is an explicit input operation, never a read-only observation.
   guard();let result;
   try{result=await bounded(target.send('Runtime.evaluate',{expression:'(()=>{const nodes=document.querySelectorAll(".space-world__canvas");if(nodes.length!==1||!nodes[0].isConnected)throw new Error("Room canvas missing or ambiguous");nodes[0].focus({preventScroll:true});if(document.activeElement!==nodes[0])throw new Error("Room canvas did not focus");return true;})()',returnByValue:true}),'canvas focus');}
   catch(error){uncertain=true;throw error;}
   guard();if(result.exceptionDetails||result.result.value!==true)throw new Error('Room canvas focus failed');
  }),
 };
 const onClose=()=>{if(!quarantining){fail(new Error('Room pointer page closed'));closing=true;}};
 page.on('close',onClose);
 let result!:T;
 try{
  result=await journey(pointer);
  if(busy)fail(new Error('Room pointer batch ended with pending input'));
 }catch(error){fail(error);}
 finally{
  closing=true;
  const cleanup=async(operation:()=>Promise<unknown>)=>{try{await operation();}catch(error){cleanupFailed=true;fail(error);}};
  if(busy&&active){
   // An operation rejecting the already-recorded owner error is not itself a
   // cleanup failure. A drain deadline still means completion is uncertain.
   let drainTimedOut=false;
   try{await bounded(active,'drain',()=>{drainTimedOut=true;});}
   catch(error){if(drainTimedOut)cleanupFailed=true;fail(error);}
  }
  if(pressed&&session&&last)await cleanup(async()=>{
   await bounded(session!.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:last!.x,y:last!.y,button:'left',buttons:0,modifiers:0,clickCount:1}),'release');pressed=false;
  });
  if(session)await cleanup(()=>detach(session!));
  if(!uncertain&&!cleanupFailed&&!page.isClosed()&&last)await cleanup(()=>bounded(page.mouse.move(last!.x,last!.y),'position sync'));
  // Unknown dispatch completion cannot be made safe by pretending it did not
  // occur. Stop this isolated test page; do not allow a later step to reuse it.
  if((uncertain||cleanupFailed)&&!page.isClosed()){
   quarantining=true;await cleanup(()=>bounded(page.close({runBeforeUnload:false}),'quarantine'));
  }
  page.off('close',onClose);owners.delete(page);
 }
 if(errors.length){if(errors.length>1)console.warn('Room pointer batch additional errors',errors.slice(1));throw errors[0];}
 return result;
}
