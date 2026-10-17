import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root='docs/ux-audit/2026-10-16',out=root+'/evidence',prefix='batch-e11';
const manifest=JSON.parse(await fs.readFile(out+'/'+prefix+'-source.json','utf8'));
for(const [file,sha] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),sha,file);
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
const contexts=[],images=[];
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function screenshot(page,name){const file=`${out}/${prefix}-${name}.png`;await page.screenshot({path:file,animations:'disabled'});images.push(file);return file;}
async function setup(view){
 const context=await browser.newContext({viewport:{width:view.width,height:view.height},hasTouch:view.width===390,isMobile:view.width===390,colorScheme:view.dark?'dark':'light',reducedMotion:view.motion,serviceWorkers:'block'});
 await context.addInitScript(dark=>{if(location.origin==='http://127.0.0.1:1317')localStorage.setItem('pref-theme',dark?'dark':'light');},view.dark);
 const denied=[],errors=[];await context.route('**/.netlify/functions/**',r=>{denied.push(r.request().url());return r.fulfill({status:503,contentType:'application/json',body:'{}'});});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:1317/${view.locale==='zh'?'zh/':''}articles/`,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
 return{context,page,denied,errors,input:page.locator('.search-palette__input'),trigger:page.locator('[data-search-trigger="nav"]:visible').first(),view};
}
async function snapshot(page){return page.locator('#search-command-palette').evaluate(p=>{const q=s=>p.querySelector(s),e=q('#search-empty'),input=q('input'),retry=q('#search-index-retry'),box=retry.getBoundingClientRect(),active=document.activeElement;return{query:input.value,busy:input.getAttribute('aria-busy'),expanded:input.getAttribute('aria-expanded'),activeDescendant:input.getAttribute('aria-activedescendant'),results:q('#search-results-list').children.length,count:q('#search-result-count').textContent,summaryVisible:!q('#search-result-summary').hidden,statusVisible:!e.hidden,status:e.textContent.trim(),fullHref:q('#search-full-link').href,retry:{hidden:retry.hidden,disabled:retry.getAttribute('aria-disabled'),x:box.x,y:box.y,width:box.width,height:box.height,fontSize:getComputedStyle(retry).fontSize,color:getComputedStyle(retry).color},focus:{id:active.id,className:active.className,inside:p.contains(active)},heading:q('h2').textContent,eyebrows:p.querySelectorAll('.search-palette__eyebrow').length,overflowX:document.documentElement.scrollWidth>innerWidth};});}
async function waitResults(page){await page.locator('.search-palette__result').first().waitFor();}
async function captureNavigation(page,action){let resolve;const promise=new Promise(r=>resolve=r);await page.route('**/*',route=>{if(route.request().isNavigationRequest()&&route.request().frame()===page.mainFrame()){resolve(route.request().url());return route.abort();}return route.fallback();});await action();return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('No navigation intent captured')),5000))]);}
try{
 for(const view of [
  {width:390,height:844,locale:'zh',dark:false,motion:'no-preference'},
  {width:390,height:844,locale:'en',dark:true,motion:'reduce'},
  {width:1440,height:900,locale:'zh',dark:true,motion:'reduce'},
  {width:1440,height:900,locale:'en',dark:false,motion:'no-preference'}
 ]){
  const s=await setup(view),{page,context,input,trigger}=s;let gets=0;await context.route('**/index.json',r=>{gets++;return r.continue();});
  await trigger.click();await input.fill('Kubernetes');await waitResults(page);await frame(page);const loaded=await snapshot(page);assert(loaded.results>0);assert.equal(loaded.eyebrows,0);assert(!loaded.overflowX);
  await screenshot(page,`results-${view.width}-${view.locale}`);
  const oldFirst=await page.locator('.search-palette__result-link').first().getAttribute('href');
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  const query='zz_no_matching_topic_981254';await input.fill(query);const immediate=await snapshot(page);assert.equal(immediate.results,0);assert.equal(immediate.summaryVisible,false);assert.equal(new URL(immediate.fullHref).searchParams.get('q'),query);assert.equal(immediate.activeDescendant,null);
  await screenshot(page,`fresh-intent-${view.width}-${view.locale}`);
  const navigationURL=await captureNavigation(page,()=>input.press('Enter'));const target=new URL(navigationURL);assert.equal(target.pathname,view.locale==='zh'?'/zh/search/':'/search/');assert.equal(target.searchParams.get('q'),query);assert.notEqual(navigationURL,new URL(oldFirst,'http://127.0.0.1:1317').href);
  contexts.push({kind:'actual-local-index-and-current-enter',view,gets,loaded,immediate,navigationURL,oldFirst,errors:s.errors,denied:s.denied,clock:'Only paused inside150ms debounce after actual local index success. Navigation captured/aborted before any canonical-host request.'});assert.deepEqual(s.errors,[]);assert.deepEqual(s.denied,[]);await context.close();
 }
 for(const view of [{width:390,height:844,locale:'zh',dark:false,motion:'reduce'},{width:1440,height:900,locale:'en',dark:true,motion:'reduce'}]){
  const s=await setup(view),{page,context,input,trigger}=s;let gets=0,release;await context.route('**/index.json',r=>{gets++;if(gets===1)return r.fulfill({status:503,contentType:'application/json',body:'[]'});release=r;});
  await trigger.click();await input.fill('Kubernetes');const retry=page.locator('#search-index-retry');await retry.waitFor();const failed=await snapshot(page);assert(!failed.summaryVisible);assert(!failed.busy||failed.busy==='false');assert.equal(failed.query,'Kubernetes');assert.equal(failed.results,0);
  assert(failed.retry.width>=44&&failed.retry.height>=44);assert.equal(failed.retry.fontSize,'14px');assert(failed.retry.x>=0&&failed.retry.y>=0&&failed.retry.x+failed.retry.width<=view.width&&failed.retry.y+failed.retry.height<=view.height);
  await screenshot(page,`error-${view.width}-${view.locale}`);const b=await retry.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.waitForFunction(()=>document.querySelector('#search-index-retry').getAttribute('aria-disabled')==='true');assert.equal(gets,2);const pending=await snapshot(page);assert.equal(pending.busy,'true');assert(!pending.summaryVisible);assert.equal(pending.focus.id,'search-index-retry');
  await screenshot(page,`retrying-${view.width}-${view.locale}`);
  if(view.width===1440){await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#search-full-link').evaluate(e=>e===document.activeElement),true);}
  await release.continue();await waitResults(page);const success=await snapshot(page);assert(success.results>0);assert(success.retry.hidden);assert.equal(success.focus.id,view.width===1440?'search-full-link':'');if(view.width===390)assert.equal(success.focus.className,'search-palette__input');
  await screenshot(page,`recovered-${view.width}-${view.locale}`);await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(gets,2);await input.fill('Kubernetes');await waitResults(page);const cached=await snapshot(page);assert.equal(gets,2);
  contexts.push({kind:'actual-route503-local-retry-success-cache',view,gets,failed,pending,success,cached,errors:s.errors,denied:s.denied,focus:'390 retry retained until success then input;1440 real Shift+Tab to full link retained after success'});assert.deepEqual(s.errors,[]);assert.deepEqual(s.denied,[]);await context.close();
 }
 {
  const view={width:390,height:844,locale:'en',dark:true,motion:'reduce'},s=await setup(view),{page,context,input,trigger}=s;let gets=0;const held=[];await context.route('**/index.json',r=>{gets++;held.push(r);});
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await trigger.click();await input.fill('Kubernetes');const startedAt=await page.evaluate(()=>Date.now());
  await page.clock.fastForward(14999);const at14999=await snapshot(page);assert.equal(await page.evaluate(()=>Date.now())-startedAt,14999);assert.equal(at14999.busy,'true');assert(!at14999.summaryVisible);assert(at14999.retry.hidden);
  await page.clock.fastForward(1);const at15000=await snapshot(page);assert.equal(await page.evaluate(()=>Date.now())-startedAt,15000);assert.equal(at15000.busy,'false');assert(!at15000.retry.hidden);assert.equal(at15000.query,'Kubernetes');assert(/timed out/.test(at15000.status));assert(!at15000.summaryVisible);
  await screenshot(page,'timeout-390-en');await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);const closed=await page.locator('#search-command-palette').isHidden();
  contexts.push({kind:'actual-index-route-pending-with-virtual-deadline',view,gets,at14999,at15000,closed,errors:s.errors,denied:s.denied,clock:'Exact14999/15000ms virtual timer boundary, not15s wall latency; noncooperating headers+JSON and lateowners handled separately by deterministic contracts.'});assert.deepEqual(s.errors,[]);assert.deepEqual(s.denied,[]);await context.close();
 }
 const result={at:new Date().toISOString(),batch:'E11',sourceManifest:'batch-e11-source.json',contexts,images,limits:'Seven Chromium contexts, two languages/two sizes and namedthemes/motion; actual local index/coordinates/keys with controlled route outages. No AI/model/share/contact calls or public navigation. Clock-only intent/deadline fragments labeled. Not full family/site96, physical device, Safari or AT certification.'};await fs.writeFile(out+'/'+prefix+'-actions.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({contexts:contexts.length,images:images.length,pass:true}));
}finally{await browser.close();}
