import {expect,type Page} from '@playwright/test';

type ControlPoint={count:number,x:number,y:number,width:number,height:number,visible:boolean,enabled:boolean,inside:boolean,hit:boolean};

// Only for Chromium room fixtures' stationary DOM tools, never 3D targets.
// A hard Node5s budget covers attach, real DOM observation and value transport.
// CDP avoids trace-hook/JSHandle round trips; the click remains native PW input.
// https://playwright.dev/docs/api/class-cdpsession
async function staticPoint(page:Page,selector:string):Promise<ControlPoint>{
  if(page.context().browser()?.browserType().name()!=='chromium')throw new Error('Static room protocol observation requires Chromium');
  const deadline=performance.now()+5000;
  const within=async<T>(operation:()=>Promise<T>)=>{
    const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Static control observation exceeded5000ms');
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([operation(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Static control observation exceeded5000ms')),remaining);})]);}
    finally{if(timer)clearTimeout(timer);}
  };
  const detach=async(session:Awaited<ReturnType<ReturnType<Page['context']>['newCDPSession']>>)=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([session.detach(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Static control session cleanup exceeded5000ms')),5000);})]);}
    finally{if(timer)clearTimeout(timer);}
  };
  const attaching=page.context().newCDPSession(page);let session:Awaited<typeof attaching>;
  try{session=await within(()=>attaching);}
  catch(error){void attaching.then(detach).catch(cleanup=>console.warn('Static control late attach cleanup error',cleanup));throw error;}
  async function observe(selector:string){
    const deadline=performance.now()+5000;
    for(;;){
      if(performance.now()>deadline)throw new Error('Static control visibility/enablement exceeded5000ms');
      const matches=document.querySelectorAll<HTMLElement>(selector),el=matches[0];
      if(matches.length>1)return {count:matches.length,x:0,y:0,width:0,height:0,visible:false,enabled:false,inside:false,hit:false};
      if(el){
        el.scrollIntoView({block:'nearest',behavior:'instant'});
        const r=el.getBoundingClientRect(),style=getComputedStyle(el),x=r.x+r.width/2,y=r.y+r.height/2;
        const visible=el.isConnected&&r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.display!=='none',enabled=!el.matches(':disabled')&&!el.closest('[aria-disabled="true" i]');
        if(visible&&enabled){
          const point={count:1,x,y,width:r.width,height:r.height,visible,enabled,inside:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,hit:el.contains(document.elementFromPoint(x,y))};
          if(performance.now()>deadline)throw new Error('Static control geometry exceeded5000ms');
          return point;
        }
      }
      const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Static control visibility/enablement exceeded5000ms');
      await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
    }
  }
  let failed=false,detached=false;
  try{
    const result=await within(()=>session.send('Runtime.evaluate',{expression:'('+observe.toString()+')('+JSON.stringify(selector)+')',awaitPromise:true,returnByValue:true}));
    if(result.exceptionDetails)throw new Error('Static control observation failed: '+(result.exceptionDetails.exception?.description||result.exceptionDetails.text));
    const point=result.result.value as ControlPoint|undefined;
    if(!point||!['count','x','y','width','height'].every(key=>typeof point[key as keyof ControlPoint]==='number'&&Number.isFinite(point[key as keyof ControlPoint]))||!['visible','enabled','inside','hit'].every(key=>typeof point[key as keyof ControlPoint]==='boolean'))throw new Error('Static control observation returned invalid geometry');
    await within(()=>session.detach());detached=true;
    if(performance.now()>deadline)throw new Error('Static control observation exceeded5000ms');
    return point;
  }catch(error){failed=true;throw error;}
  finally{if(!detached)try{await detach(session);}catch(error){if(!failed)throw error;console.warn('Static control session cleanup error',error);}}
}
export async function clickStaticRoomControl(page:Page,selector:string){
  const point=await staticPoint(page,selector);
  expect({count:point.count,visible:point.visible,enabled:point.enabled}).toEqual({count:1,visible:true,enabled:true});
  expect(point.width).toBeGreaterThanOrEqual(44);expect(point.height).toBeGreaterThanOrEqual(44);
  expect(point.inside).toBe(true);expect(point.hit).toBe(true);
  await page.mouse.click(point.x,point.y);
}
