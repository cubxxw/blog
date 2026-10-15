import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const out=path.resolve('docs/ux-audit/2026-10-16/evidence'),base='http://127.0.0.1:1317';
const checks=[],errors=[];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
async function context(options={}){
 const c=await browser.newContext({reducedMotion:'reduce',...options});
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/functions/')||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{"error":"isolated QA: no backend request"}'});if(u.origin===base)return r.continue();if(u.hostname==='cubxxw.com'){const response=await r.fetch({url:base+u.pathname+u.search});return r.fulfill({response});}return r.fulfill({status:200,body:'',contentType:'application/javascript'});});
 return c;
}
function record(id,detail){checks.push({id,passed:true,...detail});console.log('PASS',id);}
try{
 for(const [name,lang,mobile,dark,mode] of [['zh-desktop','zh',false,false,'pending'],['zh-mobile','zh',true,true,'failure'],['en-desktop','en',false,true,'failure'],['en-mobile','en',true,false,'legacy']]){
  const c=await context({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  await c.addInitScript(({mode,dark})=>{if(dark)localStorage.setItem('pref-theme','dark');window.__copy={calls:0};Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='legacy'?undefined:{writeText:()=>{window.__copy.calls++;if(mode==='failure')return Promise.reject(new DOMException('Denied for QA','NotAllowedError'));return new Promise(resolve=>window.__copy.resolve=resolve);}}});document.execCommand=()=>mode==='legacy';},{mode,dark});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+(lang==='zh'?'/zh':'')+'/ai-agent/posts/nango-user-defined-mcp-integration/');
  const button=p.locator('.copy-code').first();await button.scrollIntoViewIfNeeded();await button.click();
  if(mode==='pending'){
   assert.equal(await button.getAttribute('aria-busy'),'true');assert.equal(await button.isDisabled(),true);assert.equal(await button.evaluate(e=>e.classList.contains('is-copied')),false);
   await p.screenshot({path:path.join(out,'after-code-pending.png')});
   await p.evaluate(()=>window.__copy.resolve());await p.waitForFunction(()=>document.querySelector('.copy-code')?.classList.contains('is-copied'));
   assert.equal(await button.getAttribute('aria-busy'),null);record('A.CODECOPY.pending-success',{name,selector:'.copy-code',calls:await p.evaluate(()=>window.__copy.calls)});
  }else if(mode==='failure'){
   await p.waitForFunction(()=>document.querySelector('.code-copy-status')?.textContent.length>0);
   assert.equal(await button.evaluate(e=>e.classList.contains('is-copied')),false);assert.equal(await button.isDisabled(),false);
   assert.ok((await p.evaluate(()=>window.getSelection().toString())).length>10);
   const message=await p.locator('.code-copy-status').first().textContent();assert.match(message,lang==='zh'?/不可用|复制/:/unavailable|copy/);
   await p.screenshot({path:path.join(out,`after-code-failure-${name}.png`)});record('A.CODECOPY.failure-recovery',{name,selector:'.copy-code',message});
  }else{
   await p.waitForFunction(()=>document.querySelector('.copy-code')?.classList.contains('is-copied'));
   record('A.CODECOPY.legacy-true',{name,selector:'.copy-code'});
  }
  const box=await button.boundingBox();if(mobile)assert.ok(box.width>=44&&box.height>=44,JSON.stringify(box));
  record('A.CODECOPY.target',{name,selector:'.copy-code',box});
  const input=p.locator('input[type="email"]').last();
  if(await input.count()){
   await input.scrollIntoViewIfNeeded();const unfocused=await input.evaluate(e=>{const s=getComputedStyle(e);return {border:s.borderColor,shadow:s.boxShadow};});await p.keyboard.press('Tab');await input.focus();
   const focus=await input.evaluate(e=>{const s=getComputedStyle(e);return {focused:e===document.activeElement,visible:e.matches(':focus-visible'),outline:s.outline,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,border:s.borderColor,shadow:s.boxShadow};});
   assert.equal(focus.focused,true);assert.ok((focus.outlineStyle!=='none'&&parseFloat(focus.outlineWidth)>=2)||focus.border!==unfocused.border||focus.shadow!==unfocused.shadow,JSON.stringify({unfocused,focus}));
   record('A.FOCUS.email',{name,selector:'input[type=email]',unfocused,focus});
  }
  await c.close();
 }
 for(const width of [390,320,568]){
  const height=width===568?320:844,c=await context({viewport:{width,height},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/zh/projects/');await p.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.bootState==='complete');
  const picker=p.locator('.space-cafe__utilities [data-cafe-picker]');assert.equal(await picker.getAttribute('aria-label'),'换个地方');
  const b=await picker.boundingBox();assert.ok(b.width>=44&&b.height>=44);await picker.click();assert.equal(await p.locator('[data-cafe-dialog]').isVisible(),true);assert.equal(await p.locator('button[data-cafe-theme]').count(),6);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('[data-cafe-dialog]').open);assert.equal(await picker.evaluate(e=>e===document.activeElement),true);
  record('A.CAFE.picker-name-and-return',{width,height,selector:'.space-cafe__utilities [data-cafe-picker]',box:b});
  const quiet=p.locator('[data-cafe-quiet]'),before=await quiet.evaluate(e=>getComputedStyle(e).backgroundColor);await quiet.click();assert.equal(await quiet.getAttribute('aria-pressed'),'true');const after=await quiet.evaluate(e=>getComputedStyle(e).backgroundColor);assert.notEqual(after,before);await p.screenshot({path:path.join(out,`after-cafe-quiet-${width}.png`)});record('A.CAFE.quiet-visible',{width,height,selector:'[data-cafe-quiet]',before,after,title:await quiet.getAttribute('title')});
  if(width===390){
   await p.locator('[data-cafe-enter]').click();await p.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.cafeMode==='desktop');
   await p.locator('[data-space-menu-trigger]').click();await p.locator('.space-menu [data-space-launchpad-trigger]').click();await p.locator('[data-launchpad-app="map"]').click();
   const control=p.locator('[data-space-window="map"] [data-window-action="minimize"]');const rect=await control.boundingBox();await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();await p.waitForTimeout(150);const pressed=await control.boundingBox();assert.ok(Math.abs(pressed.width-rect.width)<.5&&Math.abs(pressed.height-rect.height)<.5,JSON.stringify({rect,pressed}));await p.mouse.move(0,0);await p.mouse.up();
   record('A.PRESS.window-control-stable',{selector:'[data-window-action=minimize]',rect,pressed});
   const pin=p.locator('[data-map-pin]').first();const prior=await pin.boundingBox();await p.mouse.move(prior.x+prior.width/2,prior.y+prior.height/2);await p.mouse.down();const held=await pin.boundingBox();assert.ok(Math.abs(held.x-prior.x)<.5&&Math.abs(held.y-prior.y)<.5);await p.mouse.move(0,0);await p.mouse.up();await p.screenshot({path:path.join(out,'after-space-map-mobile.png')});record('A.PRESS.map-position-stable',{selector:'[data-map-pin]',prior,held});
  }
  await c.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'batch-a-checks.json'),JSON.stringify({base,stage:'batch A frozen production files',source:'batch-a-source.json',checks,errors,note:'Isolated Clipboard success/rejection/legacy results; no real clipboard data, subscription or backend writes.'},null,2));
}finally{await browser.close();}
