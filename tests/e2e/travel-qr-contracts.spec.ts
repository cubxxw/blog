import {test,expect,type Page,type Locator} from '../helpers/frozen-site';

test.use({channel:'chromium'});
const nextFrame=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
const overflow=(page:Page)=>page.evaluate(()=>({value:document.body.style.getPropertyValue('overflow'),priority:document.body.style.getPropertyPriority('overflow')}));
async function prepare(page:Page) {
  await page.goto('/zh/travel/');await expect(page.locator('.tw-social--qr')).toHaveCount(2);
  const modal=page.locator('#tw-qr');await expect(modal).toBeHidden();expect(await modal.evaluate(el=>el.tagName)).toBe('DIALOG');
  await modal.evaluate(el=>{(window as any).__qrCancels=0;el.addEventListener('cancel',()=>{(window as any).__qrCancels++;});});
  return modal;
}
async function settle(modal:Locator) {
  await expect(modal).toHaveAttribute('open','');await expect(modal).toHaveClass(/is-open/);
  await expect.poll(()=>modal.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
}
async function metadata(modal:Locator,trigger:Locator) {
  await expect(modal.locator('.tw-qr__img')).toHaveAttribute('src',(await trigger.getAttribute('data-qr'))!);
  await expect(modal.locator('.tw-qr__img')).toHaveAttribute('alt',(await trigger.getAttribute('data-qr-label'))!);
  await expect(modal.locator('.tw-qr__label')).toHaveText((await trigger.getAttribute('data-qr-label'))!);
  await expect(modal.locator('.tw-qr__id')).toHaveText((await trigger.getAttribute('data-qr-id'))!);
  await expect(trigger).toHaveAttribute('aria-expanded','true');
}
async function closeHit(page:Page,modal:Locator) {
  const close=modal.locator('.tw-qr__x'),box=(await close.boundingBox())!,card=(await modal.locator('.tw-qr__card').boundingBox())!,size=page.viewportSize()!;
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(card.x).toBeGreaterThanOrEqual(16);expect(card.y).toBeGreaterThanOrEqual(16);
  expect(card.x+card.width).toBeLessThanOrEqual(size.width-16);expect(card.y+card.height).toBeLessThanOrEqual(size.height-16);
  expect(box.x).toBeGreaterThanOrEqual(card.x);expect(box.y).toBeGreaterThanOrEqual(card.y);
  expect(box.x+box.width).toBeLessThanOrEqual(card.x+card.width);expect(box.y+box.height).toBeLessThanOrEqual(card.y+card.height);
  expect(await close.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  return box;
}
async function wholePoster(page:Page,modal:Locator) {
  const image=modal.locator('.tw-qr__img');await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  const geometry=await image.evaluate((el:HTMLImageElement)=>{
    const image=el.getBoundingClientRect(),poster=el.parentElement!.getBoundingClientRect(),card=el.closest('.tw-qr__card')!.getBoundingClientRect(),close=el.closest('.tw-qr__card')!.querySelector('.tw-qr__x')!.getBoundingClientRect();
    return {ratio:image.width/image.height,natural:el.naturalWidth/el.naturalHeight,width:image.width,height:image.height,fit:getComputedStyle(el).objectFit,radius:getComputedStyle(el).borderRadius,inside:image.left>=poster.left-1&&image.right<=poster.right+1&&image.top>=card.top&&image.bottom<=card.bottom,noOverlap:image.right<=close.left||image.left>=close.right||image.bottom<=close.top||image.top>=close.bottom};
  });
  expect(geometry.natural).toBeLessThan(1);expect(Math.abs(geometry.ratio-geometry.natural)).toBeLessThan(.005);
  expect(geometry.fit).toBe('contain');expect(geometry.radius).toBe('0px');expect(geometry.inside).toBe(true);expect(geometry.noOverlap).toBe(true);
  expect(geometry.width).toBeGreaterThan(40);expect(geometry.height).toBeGreaterThan(80);await closeHit(page,modal);
}
async function tabLoop(page:Page,modal:Locator) {
  const close=modal.locator('.tw-qr__x'),details=modal.locator('.tw-qr__details');await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(details).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();
  await page.keyboard.press('Tab');await expect(details).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();
  expect(await modal.evaluate(el=>el.matches(':modal'))).toBe(true);
  await page.locator('.tw-social--qr').last().evaluate((el:HTMLElement)=>el.focus());await expect(close).toBeFocused();
}

for(const reducedMotion of ['reduce','no-preference'] as const)test.describe(`actual Chinese QR channels at 390px / ${reducedMotion}`,()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion});
  test('both full portraits contain focus, restore the opener and survive immediate reopen',async({page})=>{
    const modal=await prepare(page),triggers=page.locator('.tw-social--qr');
    for(const trigger of await triggers.all()) {
      await trigger.scrollIntoViewIfNeeded();await page.evaluate(()=>document.body.style.setProperty('overflow','auto','important'));
      await trigger.click();await settle(modal);await metadata(modal,trigger);await wholePoster(page,modal);await tabLoop(page,modal);
      expect(await overflow(page)).toEqual({value:'hidden',priority:''});
      const before=await page.evaluate(()=>(window as any).__qrCancels);await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');
      expect(await page.evaluate(()=>(window as any).__qrCancels)).toBe(before+1);expect(await overflow(page)).toEqual({value:'auto',priority:'important'});
      await page.keyboard.press('Enter');await settle(modal);await metadata(modal,trigger);await expect(modal.locator('.tw-qr__x')).toBeFocused();
      await page.mouse.click(8,8);await expect(modal).toBeHidden();await expect(trigger).toBeFocused();
      await trigger.press('Enter');await settle(modal);const close=await closeHit(page,modal);await page.mouse.click(close.x+close.width/2,close.y+close.height/2);
      await expect(modal).toBeHidden();await expect(trigger).toBeFocused();expect(await overflow(page)).toEqual({value:'auto',priority:'important'});
    }
    // Same-task component boundary: the prior native close event is still
    // queued when the next real channel's existing click handler opens it.
    await triggers.first().click();await settle(modal);
    await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('#tw-qr .tw-qr__x')!.click();document.querySelectorAll<HTMLButtonElement>('.tw-social--qr')[1].click();});
    await nextFrame(page);await settle(modal);await metadata(modal,triggers.last());await expect(modal.locator('.tw-qr__x')).toBeFocused();
    await page.keyboard.press('Escape');await expect(triggers.last()).toBeFocused();
  });
});

for(const height of [256,224])for(const reducedMotion of ['reduce','no-preference'] as const)test.describe(`short landscape 568×${height} / ${reducedMotion}`,()=>{
  test.use({viewport:{width:568,height},hasTouch:true,isMobile:true,reducedMotion});
  test('both complete portrait posters and the real close target fit the bounded card',async({page})=>{
    const modal=await prepare(page);
    for(const trigger of await page.locator('.tw-social--qr').all()) {
      await trigger.click();await settle(modal);await metadata(modal,trigger);await wholePoster(page,modal);await tabLoop(page,modal);
      const close=await closeHit(page,modal);await page.mouse.click(close.x+close.width/2,close.y+close.height/2);
      await expect(modal).toBeHidden();await expect(trigger).toBeFocused();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(568);
  });
});

test.describe('runtime preference and page lifecycle',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
  test('runtime reduce completes entrance, immediate close cancels its frame, and pagehide restores overflow',async({page})=>{
    const modal=await prepare(page),trigger=page.locator('.tw-social--qr').first();
    await trigger.scrollIntoViewIfNeeded();await page.evaluate(()=>document.body.style.setProperty('overflow','scroll','important'));
    await trigger.click();await page.emulateMedia({reducedMotion:'reduce'});await settle(modal);
    expect(await modal.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);await expect(modal.locator('.tw-qr__x')).toBeFocused();
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();expect(await overflow(page)).toEqual({value:'scroll',priority:'important'});
    await page.emulateMedia({reducedMotion:'no-preference'});
    // Open and close before the scheduled entrance frame can run.
    await trigger.evaluate((el:HTMLElement)=>{el.click();document.querySelector<HTMLButtonElement>('#tw-qr .tw-qr__x')!.click();});
    await nextFrame(page);await expect(modal).toBeHidden();await expect(modal).not.toHaveClass(/is-open/);
    await trigger.click();await settle(modal);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(modal).toBeHidden();await expect(trigger).toHaveAttribute('aria-expanded','false');expect(await overflow(page)).toEqual({value:'scroll',priority:'important'});
    await nextFrame(page);await expect(modal).not.toHaveClass(/is-open/);
  });
});

test.describe('unavailable image transport',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  test('pending and 404 images keep real metadata and close usable without reopening later',async({page})=>{
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let pending=false,job:Promise<void>|undefined;
    await page.route('**/xiaohongshu.jpg',route=>{pending=true;job=(async()=>{await gate;await route.fulfill({status:404,body:''});})();return job;});
    await page.route('**/wechat.jpg',route=>route.fulfill({status:404,body:''}));
    try {
      const modal=await prepare(page),triggers=page.locator('.tw-social--qr');await triggers.first().click();await settle(modal);await expect.poll(()=>pending).toBe(true);
      await metadata(modal,triggers.first());const close=await closeHit(page,modal);await page.mouse.click(close.x+close.width/2,close.y+close.height/2);await expect(modal).toBeHidden();
      release();await job;await nextFrame(page);await expect(modal).toBeHidden();await expect(triggers.first()).toBeFocused();
      await triggers.last().click();await settle(modal);await metadata(modal,triggers.last());
      await expect.poll(()=>modal.locator('.tw-qr__img').evaluate((el:HTMLImageElement)=>el.complete)).toBe(true);
      expect(await modal.locator('.tw-qr__img').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(0);
      await closeHit(page,modal);await page.keyboard.press('Escape');await expect(modal).toBeHidden();await expect(triggers.last()).toBeFocused();
    } finally {release();await job;}
  });
});

test('the actual English Travel page keeps its four non-QR channels',async({page})=>{
  await page.goto('/travel/');await expect(page.locator('.tw-social--qr')).toHaveCount(0);
  const links=page.locator('.tw-party__links a');await expect(links).toHaveCount(4);
  expect((await links.allTextContents()).map(text=>text.trim())).toEqual(['Instagram','Facebook','Email','GitHub']);
  expect(await links.evaluateAll(nodes=>nodes.map(n=>(n as HTMLAnchorElement).getAttribute('href')))).toEqual([
    'https://www.instagram.com/cubxxw/','https://www.facebook.com/cubxxw/','https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=3293172751nss@gmail.com','https://github.com/cubxxw',
  ]);
  await expect(page.locator('#tw-qr')).toBeHidden();
});

async function imageProbe(page:Page) {
  await page.addInitScript(()=>{
    const listeners=new WeakMap<EventTarget,Map<string,Set<unknown>>>(),starts:{at:number,url:string,node:HTMLImageElement}[]=[];
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    (EventTarget.prototype as any).addEventListener=function(type:string,listener:unknown,options:unknown) {
      if(this instanceof HTMLImageElement&&this.classList.contains('tw-qr__img')&&['load','error'].includes(type)) {
        let byType=listeners.get(this);if(!byType){byType=new Map();listeners.set(this,byType);}
        let set=byType.get(type);if(!set){set=new Set();byType.set(type,set);}set.add(listener);
      }
      return Reflect.apply(add,this,[type,listener,options]);
    };
    (EventTarget.prototype as any).removeEventListener=function(type:string,listener:unknown,options:unknown) {
      listeners.get(this)?.get(type)?.delete(listener);return Reflect.apply(remove,this,[type,listener,options]);
    };
    const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src')!;
    Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,set(value:string){
      if(this.classList.contains('tw-qr__img'))starts.push({at:Date.now(),url:new URL(value,location.href).href,node:this});
      descriptor.set!.call(this,value);
    }});
    (window as any).__qrImages={starts,listenerCount:(node:EventTarget)=>[...(listeners.get(node)?.values()||[])].reduce((sum,set)=>sum+set.size,0)};
  });
}
async function retryHit(modal:Locator) {
  const retry=modal.locator('.tw-qr__retry'),box=(await retry.boundingBox())!,poster=(await modal.locator('.tw-qr__poster').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(poster.x);expect(box.y).toBeGreaterThanOrEqual(poster.y);
  expect(box.x+box.width).toBeLessThanOrEqual(poster.x+poster.width);expect(box.y+box.height).toBeLessThanOrEqual(poster.y+poster.height);
  expect(await retry.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  const message=(await modal.locator('.tw-qr__status').boundingBox())!;
  expect(message.y).toBeGreaterThanOrEqual(poster.y);expect(message.y+message.height).toBeLessThanOrEqual(box.y);
  expect(await modal.locator('.tw-qr__status').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await modal.locator('.tw-qr__id').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await modal.locator('.tw-qr__label').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  return box;
}

test.describe('local image recovery',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  for(const focus of ['retry','details'])test(`404 retries keep a stable portrait region and respect ${focus} focus on success`,async({page})=>{
    await imageProbe(page);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});const jobs:Promise<void>[]=[],urls:string[]=[];
    await page.route('**/xiaohongshu.jpg*',route=>{
      const url=new URL(route.request().url());urls.push(url.href);
      const job=(async()=>{
        if(urls.length===1){await route.fulfill({status:404,body:''});return;}
        await gate;const response=await route.fetch({url:url.origin+url.pathname});await route.fulfill({response});
      })();jobs.push(job);return job;
    });
    try {
      const modal=await prepare(page),trigger=page.locator('.tw-social--qr').first();await trigger.click();await settle(modal);
      await expect(modal.locator('.tw-qr__status')).toHaveText('图片暂时无法加载。请重试，或使用账号搜索。');await expect(modal.locator('.tw-qr__img')).toBeHidden();
      const errorBox=(await modal.locator('.tw-qr__poster').boundingBox())!,retry=modal.locator('.tw-qr__retry'),box=await retryHit(modal);
      await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(retry).toBeFocused();await expect(retry).toHaveAttribute('aria-disabled','true');
      await expect(modal.locator('.tw-qr__status')).toHaveText('正在重新加载图片…');
      // An aria-disabled button retains focus. Its owned pending attempt
      // must reject repeated activation without issuing more requests.
      await retry.evaluate((el:HTMLButtonElement)=>{el.click();el.click();});await expect.poll(()=>urls.length).toBe(2);
      if(focus==='details')await modal.locator('.tw-qr__details').focus();
      release();await wholePoster(page,modal);await expect(modal.locator('.tw-qr__feedback')).toBeHidden();
      await expect(focus==='retry'?modal.locator('.tw-qr__x'):modal.locator('.tw-qr__details')).toBeFocused();
      expect(Math.abs((await modal.locator('.tw-qr__poster').boundingBox())!.height-errorBox.height)).toBeLessThan(1);
      expect(urls).toHaveLength(2);const original=new URL((await trigger.getAttribute('data-qr'))!,page.url());
      for(const address of urls){const url=new URL(address);expect(url.origin).toBe(new URL(page.url()).origin);expect(url.pathname).toBe(original.pathname);}
      expect(new URL(urls[0]).searchParams.has('qr_retry')).toBe(false);expect(new URL(urls[1]).searchParams.get('qr_retry')).toMatch(/^\d+$/);
      await expect(trigger).toHaveAttribute('data-qr',original.pathname);await page.keyboard.press('Escape');
    } finally {release();await Promise.allSettled(jobs);}
  });

  test('the 15-second deadline clears each old node and cannot overwrite a later attempt',async({page})=>{
    await imageProbe(page);await page.clock.install();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});const jobs:Promise<void>[]=[];
    await page.route('**/xiaohongshu.jpg*',route=>{const job=(async()=>{await gate;await route.fulfill({status:404,body:''});})();jobs.push(job);return job;});
    try {
      const modal=await prepare(page),trigger=page.locator('.tw-social--qr').first();await trigger.scrollIntoViewIfNeeded();
      await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await trigger.click();await settle(modal);
      const old=await modal.locator('.tw-qr__img').elementHandle(),status=modal.locator('.tw-qr__status');
      const startedAt=await page.evaluate(()=>(window as any).__qrImages.starts[0].at);
      await page.clock.fastForward(14999);expect(await page.evaluate(()=>Date.now())-startedAt).toBe(14999);
      await expect(status).toHaveText('正在加载图片…');await expect(modal.locator('.tw-qr__poster')).toHaveAttribute('aria-busy','true');
      await page.clock.fastForward(1);expect(await page.evaluate(()=>Date.now())-startedAt).toBe(15000);await expect(status).toHaveText('图片加载超时。请重试，或使用账号搜索。');
      expect(await old!.getAttribute('src')).toBeNull();expect(await old!.evaluate(el=>(window as any).__qrImages.listenerCount(el))).toBe(0);
      const retry=modal.locator('.tw-qr__retry');await retry.click();await expect(retry).toBeFocused();await expect(status).toHaveText('正在重新加载图片…');
      const current=await modal.locator('.tw-qr__img').elementHandle(),retryStartedAt=await page.evaluate(()=>(window as any).__qrImages.starts[1].at);
      expect(await current!.evaluate((el,old)=>el===old,old)).toBe(false);
      await old!.evaluate(el=>{el.dispatchEvent(new Event('load'));el.dispatchEvent(new Event('error'));});
      await expect(status).toHaveText('正在重新加载图片…');await expect(retry).toBeFocused();
      await page.clock.fastForward(14999);expect(await page.evaluate(()=>Date.now())-retryStartedAt).toBe(14999);await expect(status).toHaveText('正在重新加载图片…');
      await page.clock.fastForward(1);await expect(status).toHaveText('图片加载超时。请重试，或使用账号搜索。');await expect(retry).toBeFocused();
      expect(await current!.getAttribute('src')).toBeNull();expect(await current!.evaluate(el=>(window as any).__qrImages.listenerCount(el))).toBe(0);
      await page.keyboard.press('Escape');await expect(modal).toBeHidden();await page.clock.fastForward(60000);await expect(modal).toBeHidden();
    } finally {release();await Promise.allSettled(jobs);}
  });

  test('closing a pending image clears its owned listeners and a late old event cannot replace the next channel',async({page})=>{
    await imageProbe(page);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let job:Promise<void>|undefined;
    await page.route('**/xiaohongshu.jpg',route=>{job=(async()=>{await gate;await route.fulfill({status:404,body:''});})();return job;});
    try {
      const modal=await prepare(page),triggers=page.locator('.tw-social--qr');await triggers.first().click();await settle(modal);
      const old=await modal.locator('.tw-qr__img').elementHandle();await expect(modal.locator('.tw-qr__status')).toHaveText('正在加载图片…');
      await page.keyboard.press('Escape');expect(await old!.getAttribute('src')).toBeNull();expect(await old!.evaluate(el=>(window as any).__qrImages.listenerCount(el))).toBe(0);
      await triggers.last().click();await settle(modal);await wholePoster(page,modal);await metadata(modal,triggers.last());
      const current=await modal.locator('.tw-qr__img').elementHandle();await old!.evaluate(el=>{el.dispatchEvent(new Event('error'));el.dispatchEvent(new Event('load'));});
      release();await job;await nextFrame(page);await expect(modal.locator('.tw-qr__feedback')).toBeHidden();await metadata(modal,triggers.last());
      expect(await modal.locator('.tw-qr__img').evaluate((el,current)=>el===current,current)).toBe(true);await expect(modal.locator('.tw-qr__x')).toBeFocused();await page.keyboard.press('Escape');
    } finally {release();await job;}
  });
});

for(const height of [256,224])for(const reducedMotion of ['reduce','no-preference'] as const)test.describe(`image failure at 568×${height} / ${reducedMotion}`,()=>{
  test.use({viewport:{width:568,height},hasTouch:true,isMobile:true,reducedMotion});
  test('failure, the account and a 44px retry remain readable and reachable for both channels',async({page})=>{
    await page.route(/\/(xiaohongshu|wechat)\.jpg(?:\?.*)?$/,route=>route.fulfill({status:404,body:''}));
    const modal=await prepare(page);
    for(const trigger of await page.locator('.tw-social--qr').all()) {
      await trigger.click();await settle(modal);await expect(modal.locator('.tw-qr__status')).toHaveText('图片暂时无法加载。请重试，或使用账号搜索。');
      await metadata(modal,trigger);await closeHit(page,modal);await retryHit(modal);await expect(modal.locator('.tw-qr__img')).toBeHidden();
      const retry=modal.locator('.tw-qr__retry');await page.keyboard.press('Tab');await expect(retry).toBeFocused();await page.keyboard.press('Space');
      await expect(modal.locator('.tw-qr__status')).toHaveText('图片暂时无法加载。请重试，或使用账号搜索。');await expect(retry).toBeFocused();await retryHit(modal);
      await page.keyboard.press('Tab');await expect(modal.locator('.tw-qr__details')).toBeFocused();await page.keyboard.press('Tab');await expect(modal.locator('.tw-qr__x')).toBeFocused();
      await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
    }
  });
});
