import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const dir='docs/ux-audit/2026-10-16/evidence';
const manifest=JSON.parse(await fs.readFile(`${dir}/batch-e15c-source.json`,'utf8'));
for(const [file,sha] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),sha,file);
const rows=[],images=[],metrics=[];
const views=[
 {id:'390-en',width:390,height:844,lang:'en',theme:'light',motion:'no-preference',coarse:true},
 {id:'320-zh',width:320,height:844,lang:'zh',theme:'dark',motion:'reduce',coarse:true},
 {id:'844-en',width:844,height:390,lang:'en',theme:'light',motion:'no-preference',coarse:true},
 {id:'1440-zh',width:1440,height:900,lang:'zh',theme:'dark',motion:'no-preference',coarse:false},
 {id:'1440-en',width:1440,height:900,lang:'en',theme:'light',motion:'reduce',coarse:false},
];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
async function frames(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function hit(locator){const box=await locator.boundingBox();assert(box&&box.width>=44&&box.height>=44,JSON.stringify(box));assert(await locator.evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}));return box;}
async function measure(locator,label){return locator.evaluate((e,label)=>{const s=getComputedStyle(e),b=e.getBoundingClientRect(),scale=b.width/e.offsetWidth;return{label,text:e.textContent.trim().slice(0,160),font:s.font,fontSize:s.fontSize,projectedFontCSSpx:parseFloat(s.fontSize)*scale,scale,box:b.toJSON(),color:s.color,background:s.backgroundColor,opacity:s.opacity,overflowX:e.scrollWidth>e.clientWidth+1,focus:e===document.activeElement,pressed:e.getAttribute('aria-pressed')};},label);}
async function choose(page,reader,value,width){
 const target=width<=640?reader.locator('[data-library-select]'):reader.locator(`[data-library-filter="${value}"]`);
 await hit(target);
 if(width<=640){await target.focus();await target.press('Home');for(let n=0;n<['all','ai-agent','engineering','growth','favorites'].indexOf(value);n++)await target.press('ArrowDown');assert.equal(await target.inputValue(),value);}
 else await target.click();
 await frames(page);assert(await target.evaluate(e=>e===document.activeElement));
 assert.equal(await reader.locator(`[data-library-filter="${value}"]`).getAttribute('aria-pressed'),'true');
}
async function saveReceipt(){await fs.writeFile(`${dir}/batch-e15-actual.json`,JSON.stringify({at:new Date().toISOString(),manifest:'batch-e15c-source.json',sources:manifest.files,rows,metrics,images,limits:'Five isolated Chromium emulated layouts, named real pointer/wheel/keyboard actions and original public favorite API; no native hardware, screen reader, OS picker presentation, all11apps, full theme/motion matrix, paid AI, real sharing/subscription/contact or overall96 certification. Projected type is planar bounding-box scale, not raster glyph measurement. No external links actually followed.'},null,2)+'\n');}
try{
 for(const view of views){
  const row={view,steps:[],errors:[],denied:[]};rows.push(row);
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},hasTouch:view.coarse,isMobile:view.coarse,reducedMotion:view.motion,serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
  await context.route('**/.netlify/functions/**',r=>{row.denied.push(r.request().url());return r.fulfill({status:503,body:'{}'});});
  await context.route('**/*',r=>/(^|\.)(googletagmanager|google-analytics)\.com$/.test(new URL(r.request().url()).hostname)?r.fulfill({status:200,body:''}):r.fallback());
  async function shot(name){await frames(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const path=`${dir}/batch-e15-${view.id}-${name}.png`;await page.screenshot({path,animations:'allow'});images.push(path);row.steps.push({name});await saveReceipt();}
  async function app(name){const dock=page.locator(`.space-bottom [data-open="${name}"]`);if(await dock.isVisible())await dock.click();else{await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();await page.locator(`[data-launchpad-app="${name}"]`).click();}const win=page.locator(`[data-space-window="${name}"]`);await win.waitFor({state:'visible'});return win;}
  await page.goto(`http://127.0.0.1:1317${view.lang==='zh'?'/zh':''}/projects/?profile=about`);
  await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.cafeMode==='desktop'&&d.worldMode==='workspace'&&d.bootState==='complete'&&Number(d.worldFrames)>0&&!d.worldLoading;});
  await page.evaluate(theme=>window.BearSpace.execute('theme',{value:theme}),view.theme);await page.evaluate(()=>document.fonts.ready);
  const welcome=page.locator('[data-space-window="welcome"]'),profile=welcome.locator('[data-space-profile]');
  if(view.id==='320-zh'||view.id==='1440-zh'){
   await profile.locator(':scope > summary').click();metrics.push({view:view.id,...await measure(welcome.locator('.space-welcome__intro'),'welcome-intro')});await shot('welcome');
   await welcome.locator('.space-welcome__foot button').click();
  }
  if(view.id==='390-en'||view.id==='320-zh'){
   const prose=profile.locator('[data-profile-section="identity"] > p').nth(1);metrics.push({view:view.id,...await measure(prose,'identity-prose')});
   const action=profile.locator('.space-profile__identity > .space-profile__links a').first();await action.scrollIntoViewIfNeeded();await hit(action);metrics.push({view:view.id,...await measure(action,'identity-link')});await shot('identity');
  }
  if(view.id==='1440-zh'){await profile.locator('[data-profile-target="story"]').click();await profile.locator('.space-profile__chapters p').first().scrollIntoViewIfNeeded();await shot('story');}
  if(view.id==='1440-en'){await profile.locator('[data-profile-target="start-here"]').click();await profile.locator('.space-profile__reading .post-content').scrollIntoViewIfNeeded();await shot('start-here');}
  const reader=await app('reader'),list=reader.locator('[data-library-list]'),query=reader.locator('[data-library-query]');await list.locator('.space-list-item').first().waitFor();
  if(view.id==='390-en'){
   await choose(page,reader,'engineering',view.width);await query.fill('Go');await list.hover();await page.mouse.wheel(0,850);await page.waitForFunction(()=>document.querySelector('[data-library-list]').scrollTop>500);await frames(page);
   const saved=await list.evaluate(e=>e.scrollTop);assert.equal(await reader.locator('[data-window-body]').evaluate(e=>e.scrollTop),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')).scroll),saved);row.steps.push({name:'real-wheel-owned-scroll',saved});await shot('scrolled-library');
   const url=await list.evaluate(e=>{const r=e.getBoundingClientRect();return[...e.querySelectorAll('[data-payload]')].find(n=>{const b=n.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;}).dataset.payload;});await list.locator(`[data-payload="${url}"]`).click();await reader.locator('[data-reader-body] .post-content').waitFor();
   const favorite=reader.locator('[data-reader-favorite]');await hit(favorite);const button=await favorite.elementHandle();await favorite.click();assert.equal(await favorite.getAttribute('aria-pressed'),'true');assert((await favorite.innerText()).includes('Saved'));await shot('saved-article');
   for(const pressed of ['false','true']){await page.evaluate(url=>window.BearSpace.execute('favorite',{url}),url);assert.equal(await favorite.getAttribute('aria-pressed'),pressed);assert(await favorite.evaluate((e,b)=>e===b,button));assert(await favorite.evaluate(e=>e===document.activeElement));}row.steps.push({name:'original-public-execute-off-on-same-button-focus'});
   await reader.locator('.space-reader-toolbar [data-open="reader"]').click();await page.waitForFunction(expected=>Math.abs(document.querySelector('[data-library-list]').scrollTop-expected)<=1,saved);await shot('returned-library');
   await page.reload();await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.cafeMode==='desktop'&&d.worldMode==='workspace'&&d.bootState==='complete'&&Number(d.worldFrames)>0&&!d.worldLoading;});await page.locator('.space-bottom [data-open="reader"]').click();await page.waitForFunction(expected=>Math.abs(document.querySelector('[data-library-list]').scrollTop-expected)<=1,saved);await shot('reloaded-library');
   await query.fill('');await choose(page,reader,'favorites',view.width);assert.equal(await list.locator('.space-list-item').count(),1);await list.locator('.space-list-item').click();await reader.locator('[data-reader-body] .post-content').waitFor();await favorite.click();await reader.locator('.space-reader-toolbar [data-open="reader"]').click();assert.equal(await reader.locator('.space-library-empty h3').innerText(),'No bookmarks yet');await hit(reader.locator('[data-library-recover]'));await shot('empty-bookmarks');await reader.locator('[data-library-recover]').click();assert.equal(await reader.locator('[data-library-select]').inputValue(),'all');assert(await query.evaluate(e=>e===document.activeElement));
  }else if(view.id==='320-zh'||view.id==='1440-en'){
   const catalog=await page.locator('[data-space-catalog]').evaluate(e=>JSON.parse(e.textContent));const longest=catalog.articles.reduce((a,b)=>a.title.length>b.title.length?a:b);await query.fill(longest.title);assert.equal(await list.locator('.space-list-item').count(),1);const item=list.locator('.space-list-item');assert.equal(await item.locator('strong').innerText(),longest.title);assert(await item.locator('strong').evaluate(e=>e.scrollHeight<=e.clientHeight+1));
   for(const [selector,label]of[['strong','library-title'],['span','library-summary'],['small','library-meta']])metrics.push({view:view.id,...await measure(item.locator(selector),label)});await shot('complete-title');
   if(view.id==='1440-en'){await query.fill('zzzz-nothing-20261016');await hit(reader.locator('[data-library-recover]'));await shot('no-matches');await reader.locator('[data-library-recover]').click();assert.equal(await query.inputValue(),'');assert(await query.evaluate(e=>e===document.activeElement));}
  }else if(view.id==='844-en'){
   await shot('short-directory');const growth=reader.locator('[data-library-filter="growth"]');await growth.scrollIntoViewIfNeeded();await choose(page,reader,'growth',view.width);const notes=reader.locator('.space-library-actions [data-open="notes"]');await notes.scrollIntoViewIfNeeded();await hit(notes);await shot('short-choices');await notes.click();assert(await page.locator('[data-space-window="notes"]').isVisible());
  }else{
   await choose(page,reader,'engineering',view.width);await query.fill('Go');const before=await list.evaluate(e=>e.scrollTop);await list.focus();await list.press('PageDown');await page.waitForFunction(before=>document.querySelector('[data-library-list]').scrollTop>before,before);assert(await list.evaluate(e=>e===document.activeElement));await shot('keyboard-list');
   const notes=await app('notes'),editor=notes.locator('[data-note-editor]');await editor.fill('E15独立验收：同一份笔记。');const original=await editor.elementHandle();await app('reader');await reader.locator('.space-library-actions [data-open="notes"]').click();assert(await editor.evaluate((e,old)=>e===old,original));assert.equal(await editor.inputValue(),'E15独立验收：同一份笔记。');await app('reader');await reader.locator('.space-library-actions [data-open="books"]').click();assert.equal(await page.locator('.space-book').count(),4);row.steps.push({name:'actual-notes-books-entry-and-same-editor'});
  }
  assert.deepEqual(row.errors,[]);assert.deepEqual(row.denied,[]);row.pass=true;await saveReceipt();await context.close();console.log(JSON.stringify({view:view.id,pass:true,images:images.length}));
 }
}catch(error){rows.at(-1).failure=String(error.stack||error);await saveReceipt();throw error;}finally{await browser.close();}
console.log(JSON.stringify({contexts:rows.length,images:images.length,pass:true}));
