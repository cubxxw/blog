import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium}from'playwright';
const dir='docs/ux-audit/2026-10-16/evidence',data={sources:JSON.parse(await fs.readFile(dir+'/batch-e15b-source.json','utf8')).files,steps:[],images:[],errors:[]};
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>data.errors.push(e.message));
 await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));await context.route('**/*',r=>/(^|\.)(googletagmanager|google-analytics)\.com$/.test(new URL(r.request().url()).hostname)?r.fulfill({status:200,body:''}):r.fallback());
 await context.addInitScript(()=>{
  window.__libraryTrace=[];const seen=new WeakSet();
  const snapshot=tag=>{const e=document.querySelector('[data-library-list]'),r=document.querySelector('[data-bear-workspace]');window.__libraryTrace.push({tag,t:performance.now(),saved:localStorage.getItem('bear-library:v1'),list:e?{connected:e.isConnected,height:e.clientHeight,scrollHeight:e.scrollHeight,top:e.scrollTop,box:e.getBoundingClientRect().toJSON()}:null,world:r?{...r.dataset}:null});};
  snapshot('init-before-product');const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){const result=original.apply(this,arguments);if(key==='bear-library:v1')snapshot('setItem');return result;};
  document.addEventListener('scroll',event=>{if(event.target?.matches?.('[data-library-list]'))snapshot('list-scroll');},true);
  new MutationObserver(()=>{const e=document.querySelector('[data-library-list]');if(e&&!seen.has(e)){seen.add(e);snapshot('new-list');requestAnimationFrame(()=>{snapshot('next-frame');requestAnimationFrame(()=>snapshot('second-frame'));});}}).observe(document,{subtree:true,childList:true});
 });
 async function enter(){await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.ready==='true'&&(Number(d.worldFrames)>0&&!d.worldLoading&&d.bootState==='complete');});if(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode')!=='desktop'){await page.keyboard.press('Control+k');await page.locator('[data-space-search-close]').click();}}
 async function snapshot(tag){data.steps.push(await page.evaluate(tag=>({tag,saved:localStorage.getItem('bear-library:v1'),top:document.querySelector('[data-library-list]').scrollTop,trace:window.__libraryTrace}),tag));const path=`${dir}/probe-e15b-reload-${tag}.png`;await page.screenshot({path,animations:'allow'});data.images.push(path);}
 await page.goto('http://127.0.0.1:1317/zh/projects/');await enter();await page.locator('.space-bottom [data-open="reader"]').click();const reader=page.locator('[data-space-window="reader"]'),list=reader.locator('[data-library-list]');await reader.locator('[data-library-filter="engineering"]').click();await reader.locator('[data-library-query]').fill('Go');await list.hover();await page.mouse.wheel(0,850);await page.waitForFunction(()=>document.querySelector('[data-library-list]').scrollTop===850);await snapshot('before-reload');await page.reload();await enter();await page.locator('.space-bottom [data-open="reader"]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await snapshot('after-reload');
 assert.equal(data.steps[0].top,850);assert.equal(data.steps[1].top,0);assert.deepEqual(data.errors,[]);data.observed=true;
}finally{await fs.writeFile(dir+'/probe-e15b-reload.json',JSON.stringify(data,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({observed:data.observed,images:data.images.length}));
