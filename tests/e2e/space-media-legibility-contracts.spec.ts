import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
async function captureReview(page:Page,name:string){
  const path=test.info().outputPath(`${name}.png`);
  await page.locator('[data-bear-workspace]').screenshot({path,animations:'disabled'});
  await test.info().attach(name,{path,contentType:'image/png'});
}

type Photo={id:string;image:string;thumb:string;title:string;place:string;region:string};
const win=(page:Page,app='photos')=>page.locator(`[data-space-window="${app}"]`);
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
async function setup(page:Page,lang='zh',theme='light'){
  await page.goto(`${lang==='zh'?'/zh':''}/projects/`);await enterWorkspace(page);
  await page.evaluate(value=>(window as any).BearSpace.execute('theme',{value}),theme);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-theme',theme);
  return page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as Promise<{photos:Photo[];labels:Record<string,string>}>;
}
async function openApp(page:Page,app:string){
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else{
    const label=await page.locator('[data-space-catalog]').evaluate((el,app)=>JSON.parse(el.textContent||'{}').labels[app],app);
    await page.keyboard.press('Meta+k');const search=page.locator('[data-space-search-input]');await expect(search).toBeVisible();await search.fill(label);
    await search.press('ArrowDown');const result=page.locator(`[data-search-kind="app"][data-search-app="${app}"]`);await expect(result).toBeFocused();await result.press('Enter');
  }
  await expect(win(page,app)).toBeVisible();return win(page,app);
}
async function projectedFontCSS(control:Locator){
  return control.evaluate((el:HTMLElement)=>{const font=parseFloat(getComputedStyle(el).fontSize);if(!el.closest('.space-spatial-screen'))return font;for(let box:HTMLElement|null=el;box;box=box.parentElement){const style=getComputedStyle(box);let width=parseFloat(style.width);if(!Number.isFinite(width)||!width)continue;if(style.boxSizing!=='border-box')width+=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);return font*box.getBoundingClientRect().width/width;}throw Error('No measurable layout box for projected text');});
}
async function hit(control:Locator,min=44,scroll=true){
  if(scroll)await control.scrollIntoViewIfNeeded();await expect(control).toBeVisible();const box=(await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(min);expect(box.height).toBeGreaterThanOrEqual(min);expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);return box;
}
async function visibleText(control:Locator,min:number){expect(await projectedFontCSS(control)).toBeGreaterThanOrEqual(min);}
const preview=(page:Page)=>win(page).locator('.sp-photo-detail__image');
const retry=(page:Page)=>preview(page).locator('[data-image-retry]');
const status=(page:Page)=>preview(page).locator('[data-image-feedback]');
const image=(page:Page)=>preview(page).locator('[data-media-image]');
function originalPhoto(photo:Photo){const path=new URL(photo.image,'http://local.test').pathname;expect(path.startsWith('/images/about/journey/')).toBe(true);return readFileSync(resolve('static','.'+path));}
async function galleryTypography(page:Page,photo:Photo){
  const photos=win(page),card=photos.locator(`[data-photo-select="${photo.id}"]`);await expect(card.locator('strong')).toHaveText(photo.title);await expect(card.locator('.sp-photo-card__place')).toHaveText(photo.place);
  await visibleText(card.locator('strong'),16);await visibleText(card.locator('.sp-photo-card__place'),12);await visibleText(photos.locator('.sp-media-kicker'),(page.viewportSize()?.width||0)<=640?11:12);await hit(photos.locator('[data-photo-filter="all"]'));await visibleText(photos.locator('[data-photo-filter="all"]'),14);
  await expect(photos.locator('.sp-photo-card [role="status"]')).toHaveCount(0);
  await visibleText(photos.locator('.sp-media-source p'),14);await hit(photos.locator('[data-media-load]'));await visibleText(photos.locator('.sp-media-footer'),12);
  expect(await photos.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
}

for(const view of [{width:1440,height:900,lang:'zh',theme:'light',owned:true},{width:390,height:844,lang:'en',theme:'dark',owned:false}])test.describe(`${view.width}px ${view.lang} image recovery`,()=>{
  test.use({viewport:{width:view.width,height:view.height},isMobile:view.width<640,hasTouch:view.width<640,reducedMotion:view.owned?'reduce':'no-preference'});
  test('404 recovery keeps one stable reachable Retry; only its remaining focus owner receives decoded success',async({page})=>{
    const catalog=await setup(page,view.lang,view.theme);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');const photo=catalog.photos[0],bytes=originalPhoto(photo),requests:string[]=[];let release=()=>{};const gate=new Promise<void>(done=>{release=done;});
    await page.route(new URL(photo.image,page.url()).href,async route=>{requests.push(route.request().url());if(requests.length===1)return route.fulfill({status:404,body:''});await gate;await route.fulfill({status:200,contentType:'image/webp',body:bytes});});
    try{
      await openApp(page,'photos');await galleryTypography(page,photo);await win(page).locator(`[data-photo-select="${photo.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','error');
      await expect(status(page)).toHaveAttribute('role','status');await expect(status(page)).toHaveAttribute('aria-live','polite');await expect(status(page)).toHaveAttribute('aria-atomic','true');await visibleText(status(page),14);
      const original=await retry(page).elementHandle(),before=await hit(retry(page),44,false);await visibleText(retry(page),14);await retry(page).click();await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect(retry(page)).toBeFocused();await expect(retry(page)).toHaveAttribute('aria-disabled','true');expect(await retry(page).evaluate((el:HTMLButtonElement)=>({disabled:el.disabled,hasDisabled:el.hasAttribute('disabled')}))).toEqual({disabled:false,hasDisabled:false});
      const pending=await hit(retry(page),44,false);expect(Math.abs(pending.x-before.x)).toBeLessThanOrEqual(.1);expect(Math.abs(pending.y-before.y)).toBeLessThanOrEqual(.1);expect(pending.width).toBe(before.width);expect(pending.height).toBe(before.height);expect(await retry(page).evaluate((el,old)=>el===old,original)).toBe(true);
      await page.keyboard.press('Enter');await page.keyboard.press('Enter');await frames(page);expect(requests).toHaveLength(2);await expect(retry(page)).toBeFocused();
      let away:Awaited<ReturnType<Page['evaluateHandle']>>|undefined;
      if(!view.owned){await page.keyboard.press('Tab');away=await page.evaluateHandle(()=>document.activeElement);expect(await page.evaluate(()=>!!document.activeElement?.closest('[data-space-window="photos"]'))).toBe(true);expect(await retry(page).evaluate(el=>el===document.activeElement)).toBe(false);}
      release();await expect(preview(page)).toHaveAttribute('data-image-state','ready');await expect(retry(page)).toBeHidden();expect(await image(page).evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);expect(await image(page).evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');await expect(image(page)).toHaveAttribute('alt',photo.place||photo.title);
      if(view.owned)await expect(image(page)).toBeFocused();else expect(await page.evaluate(old=>document.activeElement===old,away!)).toBe(true);
      await expect(win(page).locator('figcaption strong')).toHaveText(photo.title);await visibleText(win(page).locator('figcaption strong'),16);await visibleText(win(page).locator('figcaption p'),12);
      for(const control of await win(page).locator('.sp-photo-detail__nav button,figcaption button,.sp-media-link:visible').all()){await hit(control);await visibleText(control,14);}expect(requests).toHaveLength(2);
    }finally{release();await page.unrouteAll({behavior:'wait'});}
  });
});

test('completed 404 retry and detached events cannot overwrite another reopened photo; synthetic complete/error is a separate branch',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  // This separate controlled complete getter models only the late-listener
  // branch. It is not an observed HTTP warm-cache or browser cache result.
  await page.addInitScript(()=>{const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'complete')!;(window as any).__completeErrorURL='';Object.defineProperty(HTMLImageElement.prototype,'complete',{...descriptor,get(){if(this.dataset.mediaSrc&&(window as any).__completeErrorURL===this.dataset.mediaSrc)return true;return descriptor.get!.call(this);}});});
  const catalog=await setup(page,'en','dark'),[photo,reopened,synthetic]=catalog.photos,bytes=originalPhoto(photo),reopenedBytes=originalPhoto(reopened),requests:string[]=[],reopenedRequests:string[]=[],syntheticRequests:string[]=[];
  const originalURL=new URL(photo.image,page.url()).href,reopenedURL=new URL(reopened.image,page.url()).href,syntheticURL=new URL(synthetic.image,page.url()).href;
  expect(new Set([originalURL,reopenedURL,syntheticURL]).size).toBe(3);let release=()=>{},releaseSynthetic=()=>{};const gate=new Promise<void>(done=>{release=done;}),syntheticGate=new Promise<void>(done=>{releaseSynthetic=done;});
  await page.route(originalURL,async route=>{requests.push(route.request().url());if(requests.length===1)return route.fulfill({status:404,body:''});await gate;await route.fulfill({status:200,contentType:'image/webp',body:bytes});});
  await page.route(reopenedURL,async route=>{reopenedRequests.push(route.request().url());await route.fulfill({status:200,contentType:'image/webp',body:reopenedBytes});});
  await page.route(syntheticURL,async route=>{syntheticRequests.push(route.request().url());await syntheticGate;await route.fulfill({status:404,body:''});});
  try{
    await openApp(page,'photos');await win(page).locator(`[data-photo-select="${photo.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','error');await expect(retry(page)).toBeVisible();expect(requests).toHaveLength(1);const first=await image(page).elementHandle();
    await retry(page).click();await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect.poll(()=>requests.length).toBe(2);const second=await image(page).elementHandle();expect(await first!.getAttribute('src')).toBe(null);
    await first!.evaluate(el=>{el.dispatchEvent(new Event('load'));el.dispatchEvent(new Event('error'));});await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect(retry(page)).toBeFocused();
    await win(page).locator('[data-window-action="close"]').click();await expect(win(page)).toHaveCount(0);expect(await second!.getAttribute('src')).toBe(null);
    await openApp(page,'photos');await win(page).locator(`[data-photo-select="${reopened.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','ready');await expect(win(page).locator('.sp-media-header h2')).toHaveText(reopened.title);const current=await image(page).elementHandle();await win(page).locator('[data-photo-next]').focus();const focused=await page.evaluateHandle(()=>document.activeElement);
    release();await first!.evaluate(el=>el.dispatchEvent(new Event('load')));await second!.evaluate(el=>el.dispatchEvent(new Event('error')));await frames(page);await expect(preview(page)).toHaveAttribute('data-image-state','ready');expect(await image(page).evaluate((el,old)=>el===old,current)).toBe(true);expect(await page.evaluate(old=>document.activeElement===old,focused)).toBe(true);await expect(retry(page)).toBeHidden();expect(requests).toHaveLength(2);expect(reopenedRequests).toHaveLength(1);
    await win(page).locator('[data-photo-back]').click();await page.evaluate(value=>(window as any).__completeErrorURL=value,syntheticURL);await win(page).locator(`[data-photo-select="${synthetic.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','error');await expect(retry(page)).toBeVisible();await expect.poll(()=>syntheticRequests.length).toBe(1);expect(await image(page).evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth===0)).toBe(true);await expect(image(page)).toHaveAttribute('alt',synthetic.place||synthetic.title);const syntheticNode=await image(page).elementHandle();await win(page).locator('[data-window-action="close"]').click();expect(await syntheticNode!.getAttribute('src')).toBe(null);releaseSynthetic();
  }finally{release();releaseSynthetic();await page.unrouteAll({behavior:'wait'});}
});

test.describe('phone native photo navigation',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('Next Enter then ArrowRight and Escape retain the existing window keyboard route and Notes node',async({page})=>{
    const catalog=await setup(page,'en','dark'),notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]'),draft='Read photographs, then continue this exact note.';await editor.fill(draft);const original=await editor.elementHandle();
    await openApp(page,'photos');await galleryTypography(page,catalog.photos[0]);await win(page).locator(`[data-photo-select="${catalog.photos[0].id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','ready');const next=win(page).locator('[data-photo-next]');await hit(next);await next.focus();await next.press('Enter');await expect(win(page).locator('.sp-media-header h2')).toHaveText(catalog.photos[1].title);expect(await win(page).evaluate(el=>el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('ArrowRight');await expect(win(page).locator('.sp-media-header h2')).toHaveText(catalog.photos[2].title);await expect(preview(page)).toHaveAttribute('data-image-state','ready');await hit(win(page).locator('[data-photo-prev]'));await hit(win(page).locator('[data-photo-next]'));await hit(win(page).locator('[data-photo-back]'));
    await page.keyboard.press('Escape');await expect(win(page).locator('.sp-photo-grid')).toBeVisible();await expect(win(page).locator('[data-photo-filter="all"]')).toHaveAttribute('aria-pressed','true');await openApp(page,'notes');expect(await editor.evaluate((el,old)=>el===old,original)).toBe(true);await expect(editor).toHaveValue(draft);
  });
});

test.describe('short phone photograph layout',()=>{
  test.use({viewport:{width:390,height:568},isMobile:true,hasTouch:true});
  test('all region choices fit the window and the complete photo, caption and navigation remain reachable',async({page})=>{
    const catalog=await setup(page,'en','light');await openApp(page,'photos');
    const filters=win(page).locator('[data-photo-filter]');expect(await filters.count()).toBe(4);
    const body=win(page).locator('[data-window-body]');
    const firstGrid=(await win(page).locator('.sp-photo-grid').boundingBox())!,bodyBox=(await body.boundingBox())!;
    expect(bodyBox.y+bodyBox.height-firstGrid.y).toBeGreaterThanOrEqual(150);
    expect(await win(page).locator('.sp-media-kicker').evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight))).toBeLessThanOrEqual(1.1);
    for(const filter of await filters.all()){
      const box=await hit(filter),bounds=(await body.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);
    }
    await captureReview(page,'photo-gallery-short');await filters.last().click();await expect(win(page).locator('[data-photo-filter]').last()).toHaveAttribute('aria-pressed','true');
    await win(page).locator('[data-photo-filter="all"]').click();await win(page).locator(`[data-photo-select="${catalog.photos[0].id}"]`).click();
    await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBe(0);
    await expect(win(page).locator('.sp-media-header')).toBeHidden();
    const navigation=(await win(page).locator('.sp-photo-detail__nav').boundingBox())!,detailBounds=(await body.boundingBox())!;expect(navigation.y).toBeGreaterThanOrEqual(detailBounds.y);
    await expect(preview(page)).toHaveAttribute('data-image-state','ready');expect(await image(page).evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');
    await expect.poll(()=>image(page).evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(180);
    await win(page).locator('figcaption').scrollIntoViewIfNeeded();await expect(win(page).locator('figcaption strong')).toBeVisible();
    for(const control of await win(page).locator('.sp-photo-detail__nav button,figcaption button').all())await hit(control);
    for(const control of await win(page).locator('.sp-photo-detail__nav button').all())expect((await control.boundingBox())!.height).toBe(44);
    expect(await body.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await expect(win(page).locator('.sp-media-hint')).toBeHidden();await expect(win(page).locator('.sp-media-hint__keyboard')).toBeHidden();await body.evaluate(el=>{el.scrollTop=0;});await captureReview(page,'photo-detail-short');
  });
  test('opening a scrolled gallery photo resets detail and returning restores the same gallery position',async({page})=>{
    const catalog=await setup(page,'zh','light');await openApp(page,'photos');
    const body=win(page).locator('[data-window-body]'),last=win(page).locator('[data-photo-select]').last();await last.scrollIntoViewIfNeeded();
    const selected=await last.getAttribute('data-photo-select'),savedTop=await body.evaluate(el=>el.scrollTop);expect(savedTop).toBeGreaterThan(0);await last.click();
    await expect(preview(page)).toHaveAttribute('data-image-state','ready');await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBe(0);
    await win(page).locator('[data-photo-next]').click();await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBe(0);
    await win(page).locator('[data-photo-back]').click();await expect(win(page).locator('[data-photo-filter="all"]')).toHaveAttribute('aria-pressed','true');
    await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBe(savedTop);
    await expect(win(page).locator(`[data-photo-select="${selected}"]`)).toHaveCount(1);expect(catalog.photos.length).toBeGreaterThan(1);
  });
  test('selected map region is visible before scrolling and its controls leave the geography uncovered',async({page})=>{
    await setup(page,'zh','light');await openApp(page,'map');const map=win(page,'map'),body=map.locator('[data-window-body]');
    await map.locator('[data-place-select="japan"]').click();const current=map.locator('[data-place-current="japan"]');await expect(current).toBeVisible();
    await captureReview(page,'map-selected-short');const selected=(await current.locator('strong').boundingBox())!,bounds=(await body.boundingBox())!;expect(selected.y).toBeGreaterThanOrEqual(bounds.y);expect(selected.y+selected.height).toBeLessThanOrEqual(bounds.y+bounds.height);
    const viewport=map.locator('[data-map-viewport]');await viewport.scrollIntoViewIfNeeded();const geography=(await viewport.boundingBox())!,toolbar=(await map.locator('.sp-map-controls').boundingBox())!;expect(toolbar.y).toBeGreaterThanOrEqual(geography.y+geography.height-1);
    for(const control of await map.locator('.sp-map-controls button').all()){await hit(control);expect((await control.boundingBox())!.height).toBe(44);await expect(control).toHaveCSS('font-size','14px');}
    const original=await map.locator('[data-media-map]').getAttribute('viewBox');await map.locator('[data-map-zoom="in"]').click();expect(await map.locator('[data-media-map]').getAttribute('viewBox')).not.toBe(original);
    await viewport.focus();await viewport.press('ArrowRight');await map.locator('[data-map-reset]').click();await expect(map.locator('[data-media-map]')).toHaveAttribute('viewBox','0 0 720 360');
    await current.locator('[data-place-story]').click();await expect(map.locator('.sp-place-detail h3')).toBeFocused();await expect(map.locator('.sp-place-detail__intro')).toContainText('日本');
    await hit(map.locator('.sp-place-photos button').first());expect(await body.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  });
});

test('the classic fallback keeps 14px actions and 44px targets; shared map reading and original zoom still work',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','zen');const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return Reflect.apply(original,this,[type,...args]);} as typeof original;});
  const catalog=await setup(page,'zh','light');await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-failed','true');await expect(page.locator('.space-spatial-screen')).toHaveCount(0);
  await openApp(page,'photos');await galleryTypography(page,catalog.photos[0]);await win(page).locator(`[data-photo-select="${catalog.photos[0].id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','ready');for(const control of await win(page).locator('.sp-photo-detail__nav button,figcaption button,.sp-media-link:visible').all()){await hit(control);await visibleText(control,14);}
  await win(page).locator('.sp-media-link').click();const map=win(page,'map');await expect(map).toBeVisible();await visibleText(map.locator('.sp-media-header .sp-media-kicker'),12);await hit(map.locator('.sp-media-link'));await visibleText(map.locator('.sp-media-link'),14);await visibleText(map.locator('.sp-media-footer'),12);
  const viewport=map.locator('[data-map-viewport] svg'),before=await viewport.getAttribute('viewBox');await map.locator('[data-map-zoom="in"]').click();expect(await viewport.getAttribute('viewBox')).not.toBe(before);expect(await map.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
