import {test,expect} from '@playwright/test';
import {clickStaticRoomControl} from '../helpers/static-room-control';

async function fixture(page:import('@playwright/test').Page,markup:string){
  await page.setContent(`<style>button{width:44px;height:44px;padding:0}</style>${markup}<script>window.received=[];document.addEventListener('click',event=>window.received.push({trusted:event.isTrusted,target:event.target.id}));</script>`);
}
const received=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as unknown as {received:{trusted:boolean,target:string}[]}).received);

test('stationary room control uses a trusted pointer after the real hit guards',async({page})=>{
  await fixture(page,'<button id="tool">Tool</button>');
  await clickStaticRoomControl(page,'#tool');
  expect(await received(page)).toEqual([{trusted:true,target:'tool'}]);
});

test('stationary room control does not click hidden or disabled targets',async({page})=>{
  await fixture(page,'<button id="hidden" hidden>Hidden</button><button id="disabled" disabled>Disabled</button>');
  await expect(clickStaticRoomControl(page,'#hidden')).rejects.toThrow();
  await expect(clickStaticRoomControl(page,'#disabled')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control respects inherited aria-disabled',async({page})=>{
  await fixture(page,'<div aria-disabled="true"><button id="tool">Tool</button></div>');
  await expect(clickStaticRoomControl(page,'#tool')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control rejects small and covered targets',async({page})=>{
  await fixture(page,'<button id="small" style="width:43px">Small</button>');
  await expect(clickStaticRoomControl(page,'#small')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
  await fixture(page,'<button id="covered">Covered</button><div style="position:fixed;inset:0;z-index:2"></div>');
  await expect(clickStaticRoomControl(page,'#covered')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control rejects ambiguous selectors',async({page})=>{
  await fixture(page,'<button class="tool">One</button><button class="tool">Two</button>');
  await expect(clickStaticRoomControl(page,'.tool')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control waits for a hidden disabled tool to recover',async({page})=>{
  await fixture(page,'<button id="tool" hidden disabled>Tool</button>');
  await page.evaluate(()=>{setTimeout(()=>document.querySelector<HTMLButtonElement>('#tool')!.hidden=false,120);setTimeout(()=>document.querySelector<HTMLButtonElement>('#tool')!.disabled=false,240);});
  await clickStaticRoomControl(page,'#tool');expect(await received(page)).toEqual([{trusted:true,target:'tool'}]);
});
test('stationary room control recovery does not depend on animation frames',async({page})=>{
  await fixture(page,'<button id="tool" hidden>Tool</button>');
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0;setTimeout(()=>document.querySelector<HTMLButtonElement>('#tool')!.hidden=false,120);});
  await clickStaticRoomControl(page,'#tool');expect(await received(page)).toEqual([{trusted:true,target:'tool'}]);
});

for(const stage of ['attach','send'] as const)test(`stationary room control rejects a real5s ${stage} delay and cleans its late session`,async({page})=>{
  await fixture(page,'<button id="tool">Tool</button>');
  const context=page.context(),original=context.newCDPSession.bind(context);let detached=0,late=false;
  const pause=()=>new Promise(resolve=>setTimeout(resolve,5150));
  context.newCDPSession=async target=>{
    const session=await original(target),proxy=new Proxy(session,{get(object,key){
      if(key==='detach')return async()=>{detached++;return object.detach();};
      if(key==='send'&&stage==='send')return async()=>{await pause();late=true;return {result:{value:{count:1,x:30,y:30,width:44,height:44,visible:true,enabled:true,inside:true,hit:true}}};};
      const value=Reflect.get(object,key);return typeof value==='function'?value.bind(object):value;
    }});
    if(stage==='attach'){await pause();late=true;}
    return proxy;
  };
  try{
    await expect(clickStaticRoomControl(page,'#tool')).rejects.toThrow('exceeded5000ms');
    await expect.poll(()=>detached).toBe(1);await expect.poll(()=>late).toBe(true);
    expect(await received(page)).toEqual([]);
  }finally{context.newCDPSession=original;}
});

test('stationary room control rejects protocol exceptions and invalid values before input',async({page})=>{
  await fixture(page,'<button id="tool">Tool</button>');
  const context=page.context(),original=context.newCDPSession.bind(context);let detached=0;
  try{
    for(const result of [{result:{},exceptionDetails:{text:'controlled script error'}},{result:{value:{count:1}}}]){
      context.newCDPSession=async target=>{const session=await original(target);return new Proxy(session,{get(object,key){
        if(key==='send')return async()=>result;
        if(key==='detach')return async()=>{detached++;return object.detach();};
        const value=Reflect.get(object,key);return typeof value==='function'?value.bind(object):value;
      }});};
      await expect(clickStaticRoomControl(page,'#tool')).rejects.toThrow();
    }
    expect(detached).toBe(2);expect(await received(page)).toEqual([]);
  }finally{context.newCDPSession=original;}
});
