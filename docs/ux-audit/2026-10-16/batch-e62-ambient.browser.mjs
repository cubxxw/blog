import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence';
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
const observations=[];
try {
 for (const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',colorScheme:theme,serviceWorkers:'block'});
  await context.addInitScript(theme=>localStorage.setItem('pref-theme',theme),theme);
  await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
  const page=await context.newPage(),requests=[],errors=[];
  page.setDefaultTimeout(12000);
  page.on('request',r=>{if(/\/js\/three\/(hero-field|bear-orb)/.test(r.url()))requests.push(r.url());});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:1317/zh/');
  await page.locator('#hp-avatar-btn').waitFor();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(3000);
  assert.equal(requests.length,0);
  await page.locator('#hp-conversation').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-112));
  await page.waitForFunction(()=>document.querySelectorAll('#hp-conversation canvas').length===2);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(650);
  await page.mouse.move(0,0);
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('dark')?'dark':'light'),theme);
  const canvases=await page.locator('#hp-conversation canvas').evaluateAll(ns=>ns.map(e=>({width:e.width,height:e.height,display:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}})));
  for(const c of canvases)assert(c.width>0&&c.height>0);
  await page.screenshot({path:`${out}/batch-e62-conversation-${theme}-motion.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelectorAll('#hp-conversation canvas').length===0);
  await page.screenshot({path:`${out}/batch-e62-conversation-${theme}-reduce.png`});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelectorAll('#hp-conversation canvas').length===2);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelectorAll('#hp-conversation canvas').length===0);
  assert.equal(errors.length,0);
  observations.push({source:'batch-e62-source.json',viewport:{width:1440,height:900},lang:'zh',theme,kind:'real Chromium Metal WebGL, viewport CSSpx; simulated media changes',firstHeroAfterTrustedIntentAnd3s:{rendererRequests:0},afterBearVisible:{requests,canvases},runtimeReduce:'disposed both canvases',runtimeRestore:'mounted both again then disposed on final reduce',pageErrors:errors});
  await context.close();
 }
 await fs.writeFile(out+'/batch-e62-ambient.json',JSON.stringify({observations,limits:'Two real GPU theme scopes; canvas lifecycle and images do not certify FPS, INP, physical devices or a full functional score.'},null,2)+'\n');
 console.log('E62 light/dark real GPU visibility/load/reduce/restore passed');
} finally {await browser.close();}
