import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:1317',out='docs/ux-audit/2026-10-16/evidence',observations=[];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
try {
 for(const [width,height] of [[1440,900],[390,900],[320,844],[568,320]]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
  const page=await context.newPage();page.setDefaultTimeout(10000);await page.goto(base+'/zh/projects/?profile=about');
  await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.cafeMode==='desktop');
  async function open(app) {
   await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();
   await page.locator(`[data-launchpad-app="${app}"]`).click();return page.locator(`[data-space-window="${app}"]`);
  }
  const notes=await open('notes');await notes.locator('[data-note-editor]').fill('只在隔离浏览器内的笔记\n第二行用于连续性验证');await notes.locator('header[data-window-drag]').click();await page.mouse.move(0,0);
  await page.screenshot({path:out+`/batch-e5-notes-${width}.png`});
  observations.push(await notes.evaluate((win,viewport)=>{const e=win.querySelector('[data-note-editor]'),p=win.closest('.space-spatial-screen'),b=e.getBoundingClientRect();return {app:'notes',viewport,source:'batch-e5-source.json',route:location.href,locale:document.documentElement.lang,theme:'light',reducedMotion:'reduce',zoom:1,fontCSS:getComputedStyle(e).fontSize,fontPhysical:parseFloat(getComputedStyle(e).fontSize)*b.width/e.offsetWidth,plane:getComputedStyle(p).backgroundColor,controls:[...win.querySelectorAll('[data-window-action]')].map(e=>{const b=e.getBoundingClientRect();return {action:e.dataset.windowAction,width:b.width,height:b.height};})};},{width,height}));
  const map=await open('map');await page.waitForFunction(()=>[...document.querySelectorAll('[data-space-window="map"] img')].every(e=>{const b=e.getBoundingClientRect();return b.bottom<=0||b.top>=innerHeight||(e.complete&&e.naturalWidth);}));await page.mouse.move(0,0);await page.screenshot({path:out+`/batch-e5-map-${width}.png`});
  observations.push(await map.evaluate((win,viewport)=>({app:'map',viewport,source:'batch-e5-source.json',route:location.href,locale:document.documentElement.lang,theme:'light',reducedMotion:'reduce',zoom:1,controls:[...win.querySelectorAll('.sp-map-controls button')].map(e=>{const b=e.getBoundingClientRect();return{label:e.getAttribute('aria-label')||e.textContent,width:b.width,height:b.height};})}),{width,height}));
  if(width===1440){const reader=await open('reader');await reader.locator('[data-library-query]').fill('dlv');await reader.locator('[data-open="reader"][data-payload="/zh/engineering/posts/use-go-tools-dlv/"]').click();await reader.locator('[data-reader-body] .post-content p').first().waitFor();await page.screenshot({path:out+'/batch-e5-reader-1440.png'});await open('settings');await page.locator('[data-set-theme="dark"]').click();await open('notes');await page.screenshot({path:out+'/batch-e5-notes-dark-1440.png'});}
  await context.close();
 }
 await fs.writeFile(out+'/batch-e5-visual.json',JSON.stringify({observations,kind:'Actual frozen E5 browser captures; observations are scoped, not full-family scores.'},null,2)+'\n');
} finally {await browser.close();}
