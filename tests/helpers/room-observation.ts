import type {Page,CDPSession} from '@playwright/test';

// Read actual room DOM without the trace snapshots surrounding ordinary frame
// calls. The one Node deadline includes attach, execution, transport, schema
// validation and successful detach; it never extends a5s/30s observation gate.
// All input remains outside this helper and uses the original native actions.
export async function readRoomObservation<T,A>(page:Page,observation:(arg:A)=>T|Promise<T>,arg:A,options:{timeout:5000|30000;label:string;validate:(value:unknown)=>value is T}):Promise<T>{
  if(page.context().browser()?.browserType().name()!=='chromium')throw new Error('Room protocol observation requires Chromium');
  const deadline=performance.now()+options.timeout,error=()=>new Error(options.label+' exceeded'+options.timeout+'ms');
  const within=async<R>(operation:()=>Promise<R>)=>{
    const remaining=deadline-performance.now();if(remaining<=0)throw error();
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([operation(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(error()),remaining);})]);}
    finally{if(timer)clearTimeout(timer);}
  };
  const cleanup=async(session:CDPSession)=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([session.detach(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Room observation cleanup exceeded5000ms')),5000);})]);}
    finally{if(timer)clearTimeout(timer);}
  };
  const attaching=page.context().newCDPSession(page);let session:CDPSession;
  try{session=await within(()=>attaching);}
  catch(cause){void attaching.then(cleanup).catch(error=>console.warn('Room observation late attach cleanup error',error));throw cause;}
  let failed=false,detached=false;
  try{
    const expression='('+observation.toString()+')('+(JSON.stringify(arg)??'undefined')+')';
    const result=await within(()=>session.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}));
    if(result.exceptionDetails)throw new Error(options.label+' failed: '+(result.exceptionDetails.exception?.description||result.exceptionDetails.text));
    const value:unknown=result.result.value;if(!options.validate(value))throw new Error(options.label+' returned an invalid value');
    await within(()=>session.detach());detached=true;
    if(performance.now()>deadline)throw error();
    return value;
  }catch(cause){failed=true;throw cause;}
  finally{if(!detached)try{await cleanup(session);}catch(error){if(!failed)throw error;console.warn('Room observation cleanup error',error);}}
}
