import {test,expect} from '@playwright/test';
import {waitQualityFonts,localImageFailures,hasHorizontalOverflow} from '../helpers/content-quality';
import {withRoomObservationSession} from '../helpers/room-observation';

test('quality font observation waits for the actual pending font and preserves body visibility',async({page})=>{
 let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('https://quality.test/**',async route=>{
  if(new URL(route.request().url()).pathname==='/slow.woff2'){
   await held;return route.fulfill({status:404,body:''});
  }
  return route.fulfill({contentType:'text/html',body:'<style>@font-face{font-family:pending;src:url(/slow.woff2)}body{font-family:pending}</style><body>Real font fallback</body>'});
 });
 try{
  await page.goto('https://quality.test/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>document.fonts.status)).toBe('loading');
  let finished=false;
  await withRoomObservationSession(page,async()=>{
   const waiting=waitQualityFonts(page).then(()=>{finished=true;});
   try{await new Promise(resolve=>setTimeout(resolve,75));expect(finished).toBe(false);}
   finally{release();await waiting;}
   expect(await page.evaluate(()=>document.fonts.status)).toBe('loaded');
   await expect(page.locator('body')).toBeVisible();
  });
 }finally{release();}
});

test('quality image observation decodes real local images, retains failures and checks overflow',async({page})=>{
 await page.route('https://quality.test/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/good.svg')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="blue"/></svg>'});
  if(path==='/broken.png')return route.fulfill({contentType:'image/png',body:'invalid image bytes'});
  return route.fulfill({contentType:'text/html',body:'<img loading="lazy" src="/good.svg"><img loading="lazy" src="/broken.png"><img src="https://outside.test/ignored.png"><div style="width:3000px">wide</div>'});
 });
 await page.route('https://outside.test/**',route=>route.abort('blockedbyclient'));
 await page.goto('https://quality.test/',{waitUntil:'domcontentloaded'});
 await withRoomObservationSession(page,async()=>{
  expect(await localImageFailures(page)).toEqual(['/broken.png']);
  expect(await page.locator('img').evaluateAll(images=>images.slice(0,2).every(image=>(image as HTMLImageElement).loading==='eager'))).toBe(true);
  expect(await hasHorizontalOverflow(page)).toBe(true);
  await page.locator('div').evaluate(el=>el.remove());
  expect(await hasHorizontalOverflow(page)).toBe(false);
 });
});

test('quality observations reject a real script error and invalid protocol values',async({page,context})=>{
 await page.setContent('<body>Visible</body>');
 await page.evaluate(()=>Object.defineProperty(document.fonts,'ready',{get(){throw new Error('font observation fault');}}));
 await expect(waitQualityFonts(page)).rejects.toThrow('font observation fault');
 const create=context.newCDPSession.bind(context);
 context.newCDPSession=async target=>{
  const session=await create(target),send=session.send.bind(session);
  session.send=(async(method:string,params:any)=>method==='Runtime.evaluate'?{result:{type:'string',value:'invalid'}}:send(method as any,params)) as typeof session.send;
  return session;
 };
 try{
  await expect(localImageFailures(page)).rejects.toThrow('invalid value');
  await expect(hasHorizontalOverflow(page)).rejects.toThrow('invalid value');
 }finally{context.newCDPSession=create;}
});
