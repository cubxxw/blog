import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:1317',out='docs/ux-audit/2026-10-16/evidence',checks=[],errors=[];
const batch=process.env.UX_BATCH || 'batch-d1';
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
const article='/zh/engineering/posts/kubernetes-an-article-to-get-started-quickly/';
async function context(width=1440){
 const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
 await c.addInitScript(()=>{
  window.__qaRequests=[];
  const original=window.fetch;
  window.fetch=(url,init)=>{
   if(!String(url).includes('/.netlify/functions/'))return original(url,init);
   if(!String(url).match(/\/(article-ai|blog-ai)$/))return Promise.resolve(new Response('{}',{status:503,headers:{'content-type':'application/json'}}));
   const request={url:String(url),body:JSON.parse(init.body),aborted:false,canceled:false,controller:null};
   window.__qaRequests.push(request);
   return Promise.resolve(new Response(new ReadableStream({start(controller){request.controller=controller;init.signal.addEventListener('abort',()=>{request.aborted=true;try{controller.error(new DOMException('Controlled abort','AbortError'));}catch(_){}});},cancel(){request.canceled=true;}}),{headers:{'content-type':'text/event-stream'}}));
  };
  window.__qaDelta=(i,text,done=false)=>{const r=window.__qaRequests[i];try{r.controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({delta:text})+'\n\n'+(done?'data: [DONE]\n\n':'')));}catch(_){}};
 });
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return{c,p};
}
function pass(id,p,details={}){checks.push({id,passed:true,route:p.url(),viewport:p.viewportSize(),locale:'zh',theme:'light',zoom:1,reducedMotion:'reduce',source:batch+'-source.json',...details});console.log('PASS',id);}
try{
 // A delayed clipboard refusal must not reopen a dismissed reading sheet.
 {const {c,p}=await context(390);await c.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>new Promise((_,reject)=>window.__rejectCopy=reject)}});document.execCommand=()=>false;});
 await p.goto(base+article);await p.evaluate(()=>scrollTo(0,300));await p.locator('#article-fab').click();await p.locator('#abs-tab-share').click();await p.locator('.abs-share-copy').click();await p.keyboard.press('Escape');await p.evaluate(()=>window.__rejectCopy(new Error('Late controlled refusal')));await p.waitForTimeout(100);
 assert.equal(await p.locator('.article-copy-fallback[open]').count(),0);assert.equal(await p.locator('.abs-share-copy').isDisabled(),false);assert.equal(await p.locator('#article-fab').evaluate(e=>e===document.activeElement),true);pass('D1.share-late-refusal-no-modal',p);await c.close();}
 // Travel: stop keeps the question, while closing cancels the old book.
 {const {c,p}=await context();await p.goto(base+'/zh/travel/');const buttons=p.locator('.tw-tome__ask');assert.ok(await buttons.count()>1);await buttons.first().click();const modal=p.locator('#tw-book-ai'),input=modal.locator('.tw-book-ai__input'),send=modal.locator('.tw-book-ai__send');
 await input.fill('独立验收问题A');await send.click();await p.waitForFunction(()=>window.__qaRequests.length===1);await p.evaluate(()=>window.__qaDelta(0,'部分回答'));await modal.getByText('部分回答',{exact:true}).waitFor();await send.click();assert.equal(await input.inputValue(),'独立验收问题A');assert.equal(await p.evaluate(()=>window.__qaRequests[0].aborted),true);pass('D1.travel-stop-preserves-question',p);
 await input.fill('独立验收问题B');await send.click();await p.waitForFunction(()=>window.__qaRequests.length===2);await p.keyboard.press('Escape');await buttons.nth(1).click();await p.evaluate(()=>window.__qaDelta(1,'不应出现在另一本书的迟到回答',true));assert.equal(await p.evaluate(()=>window.__qaRequests[1].aborted),true);assert.equal(await modal.locator('.tw-book-ai__thread').textContent(),'');assert.equal(await modal.getAttribute('aria-busy'),'false');pass('D1.travel-close-switch-isolates-request',p);await p.screenshot({path:out+'/'+batch+'-travel-second-book.png'});await c.close();}
 // FAQ: stop after real streamed output releases the composer and cancels transport.
 {const {c,p}=await context(390);await p.goto(base+article);const item=p.locator('.article-faq__item').first();if(await item.getAttribute('open')===null)await item.locator('summary').click();const toggle=item.locator('.article-faq__ai-toggle');await toggle.click();const input=item.locator('.article-faq__ai-input'),send=item.locator('.article-faq__ai-send');await input.fill('FAQ独立验收');await send.click();await p.waitForFunction(()=>window.__qaRequests.length===1);await p.evaluate(()=>window.__qaDelta(0,'FAQ部分回答'));await item.getByText('FAQ部分回答',{exact:true}).waitFor();await send.click();assert.equal(await input.inputValue(),'FAQ独立验收');assert.equal(await input.isDisabled(),false);assert.equal(await p.evaluate(()=>window.__qaRequests[0].aborted),true);pass('D1.faq-stream-stop-restores-input',p);await c.close();}
 // Search: closing an active stream cancels; late data cannot repopulate it.
 {const {c,p}=await context();await p.goto(base+'/zh/');await p.locator('.nav-search-trigger').first().click();const input=p.locator('.search-palette__input');await input.fill('Agent独立验收');await p.locator('#search-ai-btn').click();await p.waitForFunction(()=>window.__qaRequests.length===1);await p.evaluate(()=>window.__qaDelta(0,'搜索部分回答'));await p.locator('#ai-streaming-target').getByText('搜索部分回答',{exact:true}).waitFor();await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>window.__qaRequests[0].aborted),true);await p.evaluate(()=>window.__qaDelta(0,'迟到搜索内容',true));await p.locator('.nav-search-trigger').first().click();assert.equal(await p.locator('#search-ai-box').isVisible(),false);assert.equal(await p.locator('#search-ai-stop').isVisible(),false);pass('D1.search-close-cancels-and-clears',p);await c.close();}
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/'+batch+'-request-checks.json',JSON.stringify({checks,errors,limits:'Controlled isolated AI streams and Clipboard; no real API, subscription or clipboard mutation. Frozen D1 only; FAQ outer collapse and success focus are reserved for D2.'},null,2)+'\n');
}finally{await browser.close();}
