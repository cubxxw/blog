import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {hitRoomObject} from '../helpers/room-interaction';
import {observeRoomAudio,rainSource,roomAudioSources} from '../helpers/room-audio';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.env.SPACE_SOFTWARE_QA==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
const pointerEvidence=new WeakMap<Page,unknown[]>();
async function app(page:Page,name:string){await page.locator('[data-mac-menu="file"]').click();await page.locator(`[data-mac-panel="file"] [data-open="${name}"]`).click();}
async function desk(page:Page){
 await page.goto('/zh/projects/?vista=image&room-hour=21');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
 const speaker=page.locator('[data-room-object="speaker"]');await speaker.press('Enter');await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});
 await page.locator('.space-world__canvas').focus();
 await hitRoomObject(page,'computer');await expect(root(page)).toHaveAttribute('data-computer-view','expanded');
 if(page.viewportSize()!.width>640){await page.locator('[data-mac-menu="view"]').click();await page.locator('[data-computer-display="framed"]').click();await expect(root(page)).toHaveAttribute('data-computer-view','framed');}
}
async function capture(page:Page,name:string){if(!process.env.BROWSER_CRAFT_AUDIT_DIR)return;await fs.mkdir(process.env.BROWSER_CRAFT_AUDIT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.BROWSER_CRAFT_AUDIT_DIR,`${test.info().project.name}-${name}.png`)});}
async function clickInWebPage(page:Page,control:Locator){
 // Chromium 153's frame locator omits the monitor's scale in boundingBox().
 // Map the child CSS rect to the actual iframe, then use a genuine mouse click.
 // The child can be stable while its outer monitor is still resizing.
 const frame=page.locator('.space-browser__page');await frame.scrollIntoViewIfNeeded();await control.scrollIntoViewIfNeeded();
 const local=await control.evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
 const geometry=await frame.evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,contentWidth:el.clientWidth,contentHeight:el.clientHeight};});
 expect(geometry.contentWidth).toBeGreaterThan(0);expect(geometry.contentHeight).toBeGreaterThan(0);
 await page.mouse.click(geometry.x+local.x*geometry.width/geometry.contentWidth,geometry.y+local.y*geometry.height/geometry.contentHeight);
}
test.beforeEach(async({page})=>{
 test.setTimeout(90000);await observeRoomAudio(page);
 const records:unknown[]=[];pointerEvidence.set(page,records);
 page.on('console',message=>{const text=message.text(),prefix='__room_native_pointer__';if(!text.startsWith(prefix)||records.length>=80)return;try{records.push(JSON.parse(text.slice(prefix.length)));}catch{records.push({diagnosticError:'invalid pointer observation'});}});
 await page.addInitScript(()=>{
  localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');
  for(const type of ['pointerdown','pointerup'])document.addEventListener(type,event=>{
   const pointer=event as PointerEvent,room=document.querySelector<HTMLElement>('[data-bear-workspace]');if(!pointer.isTrusted||!room)return;
   const target=pointer.target instanceof Element?pointer.target:null;
   // Capture native dispatch identity without extra layout reads or input/state
   // changes. Pointer-up may be retargeted by ordinary pointer capture.
   console.debug('__room_native_pointer__'+JSON.stringify({type,trusted:pointer.isTrusted,x:pointer.clientX,y:pointer.clientY,
    atEpochMs:performance.timeOrigin+performance.now(),target:{tag:target?.tagName,id:target?.id,class:target?.getAttribute('class')},canvasTarget:target===room.querySelector('.space-world__canvas'),
    pose:room.dataset.worldPose,targets:room.dataset.worldTargets,objects:room.dataset.roomObjects,worldMode:room.dataset.worldMode,frames:room.dataset.worldFrames}));
  },{capture:true,passive:true});
 });
});
test.afterEach(async({page},info)=>{await info.attach('native-room-pointer-evidence',{contentType:'application/json',body:JSON.stringify({events:pointerEvidence.get(page)??[],limits:'passive native dispatch observations, not a raycast or proof that a later pointer-up was not captured'})});pointerEvidence.delete(page);});

test('the Mac browser has real project bookmarks, address navigation and site history while sound continues',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://leafhour.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Leafhour controlled test</title></head><body><h1>Controlled Leafhour fixture</h1><button onclick="this.textContent=\'Reading\'">Read a book</button></body></html>'}));
 await desk(page);const rain=(await rainSource(page))!,music=(await roomAudioSources(page)).find(s=>!s.stopped&&Math.abs(s.duration-100)>.05)!;
 await app(page,'browser');const browser=page.locator('[data-space-browser]');await expect(browser).toHaveAttribute('data-browser-view','home');
 await expect(browser.locator('[data-browser-bookmark]')).toHaveCount(8);await expect(browser.locator('[data-browser-bookmark="leafhour"]')).toHaveAttribute('href','https://leafhour.com/');await capture(page,'browser-home');
 if(page.viewportSize()!.width>640){const last=(await browser.locator('[data-browser-bookmark]').last().boundingBox())!,content=(await browser.locator('[data-browser-content]').boundingBox())!;expect(last.y+last.height).toBeLessThanOrEqual(content.y+content.height+1);}
 await browser.locator('[data-browser-bookmark="leafhour"]').click();await expect(browser).toHaveAttribute('data-browser-view','page');await expect(browser.locator('iframe')).toHaveAttribute('src','https://leafhour.com/');
 const frame=page.frameLocator('.space-browser__page');await expect(frame.getByRole('heading')).toHaveText('Controlled Leafhour fixture');await clickInWebPage(page,frame.getByRole('button',{name:'Read a book'}));await expect(frame.getByRole('button')).toHaveText('Reading');
 if(page.viewportSize()!.width>640){
  for(const view of ['expanded','framed']){await page.locator('[data-mac-menu="view"]').click();await page.locator(`[data-mac-panel="view"] [data-computer-display="${view}"]`).click();await expect(frame.getByRole('button')).toHaveText('Reading');}
 }
 await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
 const address=browser.locator('[data-browser-address]');await address.fill('javascript:alert(1)');await address.press('Enter');await expect(address).toHaveAttribute('aria-invalid','true');await expect(browser.locator('iframe')).toHaveAttribute('src','https://leafhour.com/');
 await browser.locator('[data-browser-back]').click();await expect(browser).toHaveAttribute('data-browser-view','home');await browser.locator('[data-browser-forward]').click();await expect(browser).toHaveAttribute('data-browser-view','page');
 await browser.locator('[data-browser-home]').click();const popupPromise=page.waitForEvent('popup');await browser.locator('[data-browser-bookmark="talent-signal"]').click();const popup=await popupPromise;await expect(popup).toHaveURL('https://gettalentsignal.com/');await popup.close();
 await expect(browser).toHaveAttribute('data-browser-view','home');await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
 await browser.getByRole('link',{name:'博客首页',exact:true}).click();await expect(browser).toHaveAttribute('data-browser-view','page');
 await clickInWebPage(page,page.frameLocator('.space-browser__page').getByRole('link',{name:'探索产品',exact:false}));await expect(browser).toHaveAttribute('data-browser-view','external');await expect(browser.locator('iframe')).toHaveCount(0);await expect(page.locator('.space-world__canvas')).toHaveCount(1);
 expect((await rainSource(page))!.id).toBe(rain.id);expect((await roomAudioSources(page)).some(s=>s.id===music.id&&!s.stopped)).toBe(true);expect(errors).toEqual([]);
});

test('the project directory exposes previews and direct website actions before opening details',async({page})=>{
 await desk(page);await app(page,'products');const gallery=page.locator('[data-product-home]');await expect(gallery.locator('[data-project-card]')).toHaveCount(8);await expect(gallery.locator('img')).toHaveCount(7);await expect(gallery.locator('.space-project-card__picture>span')).toHaveCount(1);await capture(page,'project-gallery');
 const card=gallery.locator('[data-project-card="leafhour"]');await card.locator('[data-select-product]').click();await expect(page.locator('.space-product h2')).toHaveText('Leafhour');await page.locator('[data-product-back]').click();await expect(card.locator('[data-select-product]')).toBeFocused();
 await card.locator('[data-open="browser"]').click();await expect(page.locator('[data-space-browser]')).toHaveAttribute('data-browser-view','page');await expect(page.locator('.space-browser__page')).toHaveAttribute('src','https://leafhour.com/');
 await page.locator('[data-browser-home]').click();await app(page,'products');await card.locator('[data-open="browser"]').click();await expect(page.locator('[data-space-browser]')).toHaveAttribute('data-browser-view','page');
 await app(page,'products');const popupPromise=page.waitForEvent('popup');await gallery.locator('[data-project-card="talent-signal"] .space-project-card__actions a').first().click();const popup=await popupPromise;await expect(popup).toHaveURL('https://gettalentsignal.com/');await popup.close();await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
});

for(const mover of ['native','compatible'])test(`a visitor can leave a web draft, look out the window and resume the same page with continuous sound (${mover})`,async({page})=>{
 const hit=(name:string)=>hitRoomObject(page,name,{cdpDrag:true});
 if(mover==='compatible')await page.addInitScript(()=>Object.defineProperty(Element.prototype,'moveBefore',{configurable:true,value:undefined}));
 let requests=0;const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://leafhour.com/**',route=>{requests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><h1>Quiet reading check</h1><label>A thought to return to <textarea aria-label="A thought to return to"></textarea></label><button onclick="this.textContent=\'Kept open\'">Keep this page open</button></body></html>'});});
 await desk(page);await app(page,'browser');await page.locator('[data-browser-bookmark="leafhour"]').click();
 const frame=page.frameLocator('.space-browser__page'),note=frame.getByRole('textbox',{name:'A thought to return to'});
 await clickInWebPage(page,note);await page.keyboard.type('The same page, when I come back.');await clickInWebPage(page,frame.getByRole('button'));await expect(frame.getByRole('button')).toHaveText('Kept open');
 const sourcesBefore=await roomAudioSources(page),rain=sourcesBefore.find(s=>!s.stopped&&Math.abs(s.duration-100)<.05)!,music=sourcesBefore.find(s=>!s.stopped&&Math.abs(s.duration-100)>.05)!,before=requests;
 await capture(page,'visitor-before-standing');
 if(page.viewportSize()!.width<=640){await page.locator('[data-mac-menu="view"]').click();await page.locator('[data-mac-panel="view"] [data-computer-display="framed"]').click();}
 await page.mouse.click(8,8);
 await expect(root(page)).toHaveAttribute('data-world-mode','roam');
 await expect(root(page)).toHaveAttribute('data-world-screen-preview',mover==='compatible'?'standby':'live');
 if(mover==='compatible'){await expect(page.locator('[data-space-window="browser"]')).toBeHidden();await expect(page.locator('[data-space-dock]')).toBeHidden();await capture(page,'visitor-compatible-standby');}
 const objects=JSON.parse((await root(page).getAttribute('data-room-objects'))!);
 for(const name of ['lamp','fan']){
  expect(typeof objects[name]).toBe('boolean');await hit(name);
  const changed=await page.waitForFunction(({name,before})=>{
   const roots=document.querySelectorAll<HTMLElement>('[data-bear-workspace]');if(roots.length!==1)throw new Error('Room object root missing or ambiguous');
   const value=JSON.parse(roots[0].dataset.roomObjects||'null');
   return value&&typeof value[name]==='boolean'&&value[name]!==before;
  },{name,before:objects[name]},{timeout:5000,polling:50});await changed.dispose();
 }
 await hit('books');await expect(page.locator('[data-room-inspection]')).toBeVisible();await page.keyboard.press('Escape');
 await hit('window');await expect(root(page)).toHaveAttribute('data-world-inspect','window');await page.keyboard.press('Escape');
 await hit('computer');await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
 await capture(page,'visitor-returned-state');
 await expect(note).toHaveValue('The same page, when I come back.');await expect(frame.getByRole('button')).toHaveText('Kept open');expect(requests).toBe(before);
 const sourcesAfter=await roomAudioSources(page);expect(sourcesAfter.find(s=>!s.stopped&&Math.abs(s.duration-100)<.05)!.id).toBe(rain.id);expect(sourcesAfter.some(s=>s.id===music.id&&!s.stopped)).toBe(true);expect(errors).toEqual([]);await capture(page,'visitor-after-returning');
 if(mover==='native'){
  // Fault injection exercises the same anchored-node restoration as a lost GPU.
  await page.locator('.space-world__canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(root(page)).toHaveAttribute('data-world-failed','true');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(note).toHaveValue('The same page, when I come back.');await expect(frame.getByRole('button')).toHaveText('Kept open');expect(requests).toBe(before);expect(errors).toEqual([]);await capture(page,'visitor-graphics-recovery');
 }
});

test('opening a website gives quiet feedback and retry really reloads the page without duplicate site history',async({page})=>{
 let release=()=>{},requests=0;const first=new Promise<void>(resolve=>{release=resolve;});
 await page.route('https://leafhour.com/**',async route=>{requests++;if(requests===1)await first;await route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><h1>A page that can reload</h1><button onclick="this.textContent=\'Changed\'">Original</button></body></html>'});});
 try{
  await desk(page);await app(page,'browser');const browser=page.locator('[data-space-browser]');await browser.locator('[data-browser-bookmark="leafhour"]').click();
  await expect(browser).toHaveAttribute('data-browser-loading','true');await expect(browser.locator('[data-browser-status]')).toContainText('正在打开 Leafhour');await capture(page,'opening-website');
  release();const frame=page.frameLocator('.space-browser__page');await expect(frame.getByRole('heading')).toHaveText('A page that can reload');await expect(browser).toHaveAttribute('data-browser-loading','false');
  await clickInWebPage(page,frame.getByRole('button'));await expect(frame.getByRole('button')).toHaveText('Changed');await browser.locator('[data-browser-reload]').click();await expect.poll(()=>requests).toBe(2);await expect(frame.getByRole('button')).toHaveText('Original');
  await clickInWebPage(page,frame.getByRole('button'));const address=browser.locator('[data-browser-address]');await address.fill('https://leafhour.com/');await address.press('Enter');await expect.poll(()=>requests).toBe(3);await expect(frame.getByRole('button')).toHaveText('Original');
  await browser.locator('[data-browser-back]').click();await expect(browser).toHaveAttribute('data-browser-view','home');await expect(browser.locator('[data-browser-reload]')).toBeDisabled();
 }finally{release();}
});
