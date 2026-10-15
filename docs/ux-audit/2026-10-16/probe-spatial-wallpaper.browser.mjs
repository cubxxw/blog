import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence',observations=[];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
 await page.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.goto('http://127.0.0.1:1317/zh/projects/?profile=about');
 await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.cafeMode==='desktop'&&Number(d.worldFrames)>0&&d.bootState==='complete';});
 const welcome=page.locator('[data-space-window="welcome"]');if(await welcome.count())await welcome.locator('[data-window-action="close"]').click();
 await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();await page.locator('[data-launchpad-app="settings"]').click();
 const settings=page.locator('[data-space-window="settings"]');
 for(const wallpaper of ['dawn','dusk','forest']) {
   const choice=settings.locator(`[data-set-wallpaper="${wallpaper}"]`);await choice.scrollIntoViewIfNeeded();await choice.click();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const selected=await choice.getAttribute('aria-pressed');
   await settings.locator('[data-window-action="minimize"]').click();await page.mouse.move(0,0);
   const screen=page.locator('.space-spatial-screen');const screenshot=await screen.screenshot({path:`${out}/spatial-wallpaper-baseline-${wallpaper}.png`});
   const computed=await page.evaluate(()=>{const root=document.querySelector('[data-bear-workspace]'),screen=document.querySelector('.space-spatial-screen'),land=document.querySelector('.space-landscape'),layer=document.querySelector('.space-window-layer');return {stored:window.BearSpace.snapshot().wallpaper,dataset:root.dataset.wallpaper,worldFrames:root.dataset.worldFrames,screenBackground:getComputedStyle(screen).backgroundColor,landscapeDisplay:getComputedStyle(land).display,landscapeBackground:getComputedStyle(land).backgroundColor,layerBackground:getComputedStyle(layer).backgroundColor};});
   observations.push({choice:wallpaper,selected,computed,monitorPngSHA256:createHash('sha256').update(screenshot).digest('hex')});
   await page.locator('[data-space-dock] [data-open="settings"]').click();
 }
 const sources={};for(const file of ['assets/css/space.css','assets/css/space-classic.css','assets/css/space-cafe.css','assets/js/space/apps.js','assets/js/space/desktop.js'])sources[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
 await fs.writeFile(`${out}/spatial-wallpaper-baseline.json`,JSON.stringify({kind:'Exploratory actual wallpaper choices and monitor pixels; not a pass/failure classification',previewSource:'batch-e9b-source.json',viewport:{width:1440,height:900},lang:'zh',theme:'light',motion:'reduce',sources,observations,limits:'One true Metal spatial desktop, settings real click then minimize to expose monitor. PNG equality concerns this monitor screenshot only, not all rendering/fallback/device states. No contact or model action.'},null,2)+'\n');
 console.log(JSON.stringify(observations));
} finally {await browser.close();}
