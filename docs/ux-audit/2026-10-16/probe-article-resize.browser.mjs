import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence';
const files=['static/js/article-bottom-sheet.js','static/js/article-chat.js','static/js/article-tabs.js','layouts/_default/single.html','layouts/partials/article/editorial-tools.html','assets/css/extended/article-bottom-sheet.css','assets/css/extended/editorial-tools.css'];
const sources={};
for(const f of files){const sha=b=>createHash('sha256').update(b).digest('hex');sources[f]=sha(await fs.readFile(f));assert.equal(sources[f],sha(execFileSync('git',['show',`e5fafdc2:${f}`])));}
const browser=await chromium.launch({channel:'chromium'});
try{
const context=await browser.newContext({viewport:{width:1199,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
const denied=[];await context.route('**/.netlify/functions/**',r=>{denied.push({method:r.request().method(),url:r.request().url()});return r.fulfill({status:503,body:'{}'});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:1317/zh/engineering/posts/use-go-tools-dlv/');await page.evaluate(()=>window.scrollTo(0,500));
await page.locator('#article-fab').click();await page.locator('#abs-tab-ai').click();
const input=page.locator('.abs-ai-textarea');await input.fill('resize continuity synthetic draft / 尚未发送');
await input.evaluate(e=>window.__resizeOriginalInput=e);
const snapshot=()=>page.evaluate(()=>{const a=document.activeElement;const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';return{width:innerWidth,scrollY,overflow:document.body.style.overflow,sheetOpen:document.querySelector('#article-bottom-sheet').classList.contains('abs--open'),sheetInert:document.querySelector('#article-bottom-sheet').inert,compactValue:document.querySelector('.abs-ai-textarea').value,desktopValue:document.querySelector('.rc-ai-textarea').value,desktopAiSelected:document.querySelector('#rc-tab-ai').getAttribute('aria-selected'),compactSameNode:window.__resizeOriginalInput===document.querySelector('.abs-ai-textarea'),active:{tag:a.tagName,id:a.id,className:a.className,visible:visible(a),inInert:!!a.closest('[inert]'),hiddenPanel:!!a.closest('[hidden]')}};});
const before=await snapshot();await page.screenshot({path:`${out}/article-resize-before-1199-zh.png`});
await page.setViewportSize({width:1200,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const afterDesktop=await snapshot();await page.screenshot({path:`${out}/article-resize-after-1200-zh.png`});
await page.keyboard.press('Tab');const afterTab=await snapshot();
await page.locator('#rc-tab-ai').click();const desktopAfterOpen=await snapshot();await page.screenshot({path:`${out}/article-resize-desktop-ai-1200-zh.png`});
await page.setViewportSize({width:1199,height:900});await page.evaluate(()=>window.scrollTo(0,500));await page.locator('#article-fab:not(.article-fab--hidden)').waitFor();await page.locator('#article-fab').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.waitForTimeout(300);const reopened=await snapshot();await page.screenshot({path:`${out}/article-resize-return-1199-zh.png`});
const result={sources,previewCheckpoint:'e5fafdc2; article sources matched accepted Git blobs; E11 search WIP not built',motion:'reduce',before,afterDesktop,afterTab,desktopAfterOpen,reopened,errors,denied,limits:'One Chromium emulated desktop resize around1200 breakpoint; unsent synthetic draft; no model or submit; focus/continuity exploratory baseline, not complete certification.'};
await fs.writeFile(`${out}/article-resize-baseline.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await context.close();
}finally{await browser.close();}
