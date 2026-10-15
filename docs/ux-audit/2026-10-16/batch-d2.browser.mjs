import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {chromium} from 'playwright';
const base='http://127.0.0.1:1317',out='docs/ux-audit/2026-10-16/evidence',checks=[],errors=[];
const article='/zh/engineering/posts/kubernetes-an-article-to-get-started-quickly/';
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
async function context(width=390,motion='reduce'){
 const c=await browser.newContext({viewport:{width,height:844},reducedMotion:motion,serviceWorkers:'block'});
 await c.addInitScript(()=>{window.__qaRequests=[];const original=window.fetch;window.fetch=(url,init)=>{
 if(!String(url).match(/\/(article-ai|blog-ai)$/))return original(url,init);
 const r={aborted:false,canceled:false,controller:null};window.__qaRequests.push(r);
 return Promise.resolve(new Response(new ReadableStream({start(controller){r.controller=controller;init.signal.addEventListener('abort',()=>{r.aborted=true;try{controller.error(new DOMException('Controlled abort','AbortError'));}catch(_){}});},cancel(){r.canceled=true;}}),{headers:{'content-type':'text/event-stream'}}));};
 window.__qaDelta=(i,text,done=false)=>{try{window.__qaRequests[i].controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({delta:text})+'\n\n'+(done?'data: [DONE]\n\n':'')));}catch(_){}};});
 const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));return{c,p};
}
function pass(id,p,details={}){checks.push({id,passed:true,route:p.url(),viewport:p.viewportSize(),locale:'zh',theme:'light',zoom:1,source:'batch-d2b-source.json',...details});console.log('PASS',id);}
try{
 {const{c,p}=await context();await p.goto(base+article);const item=p.locator('.article-faq__item').first();if(await item.getAttribute('open')===null)await item.locator('summary').click();await item.locator('.article-faq__ai-toggle').click();const input=item.locator('.article-faq__ai-input');await input.fill('外层收起取消');await item.locator('.article-faq__ai-send').click();await p.waitForFunction(()=>window.__qaRequests.length===1);await item.locator('summary').click();await p.waitForFunction(()=>window.__qaRequests[0].aborted);await p.evaluate(()=>window.__qaDelta(0,'不允许出现的迟到回答',true));await item.locator('summary').click();assert.equal(await input.inputValue(),'外层收起取消');assert.equal(await input.isDisabled(),false);assert.equal((await item.locator('.article-faq__ai-thread').textContent()).includes('不允许出现'),false);pass('D2.faq-outer-collapse-cancels',p,{reducedMotion:'reduce'});await c.close();}
 {const{c,p}=await context(1440);await p.goto(base+'/zh/');await p.locator('.nav-search-trigger').first().click();const input=p.locator('.search-palette__input');await input.fill('旧问题Q1');await p.locator('#search-ai-btn').click();await p.waitForFunction(()=>window.__qaRequests.length===1);await input.fill('正在编辑新问题Q2');await p.evaluate(()=>window.__qaDelta(0,'旧问题完成回答',true));await p.locator('.search-palette__followup-input').waitFor();await p.waitForTimeout(80);assert.equal(await input.evaluate(e=>document.activeElement===e),true);assert.equal(await input.inputValue(),'正在编辑新问题Q2');pass('D2.search-completion-keeps-current-focus',p,{reducedMotion:'reduce'});await c.close();}
 for(const motion of ['reduce','no-preference']){
 const{c,p}=await context(390,motion);await p.goto(base+'/zh/travel/');const trigger=p.locator('.tw-tome__ask').first();await trigger.click();const dialog=p.locator('#tw-book-ai');
 await p.keyboard.press('Shift+Tab');assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);
 for(let i=0;i<10;i++){await p.keyboard.press('Tab');assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);}
 await p.screenshot({path:out+`/batch-d2b-book-dialog-${motion}.png`});
 await p.keyboard.press('Escape');await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);pass('D2.travel-dialog-double-escape',p,{reducedMotion:motion});
 await trigger.click();await p.keyboard.press('Escape');await trigger.click();await p.waitForTimeout(260);assert.equal(await dialog.isVisible(),true);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);pass('D2.travel-quick-reopen',p,{reducedMotion:motion});await c.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/batch-d2b-checks.json',JSON.stringify({checks,errors,limits:'Isolated browser transport. Exact routes, dimensions and motion as recorded. Native dialog containment also checked in contracts suite.'},null,2)+'\n');
}finally{await browser.close();}
