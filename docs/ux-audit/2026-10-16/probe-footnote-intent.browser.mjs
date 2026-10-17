import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence',files=['static/js/footnote-preview.js','layouts/partials/footer.html','assets/css/extended/zzz-footnote-preview.css'];
const sources=Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const browser=await chromium.launch({channel:'chromium'});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));const page=await context.newPage();
 await page.goto('http://127.0.0.1:1317/zh/ai-agent/posts/context-engineering-the-new-foundation/');const ref=page.locator('.post-content a.footnote-ref').first();await ref.scrollIntoViewIfNeeded();
 await ref.evaluate(e=>{const r=e.getBoundingClientRect();window.scrollBy(0,r.y+r.height/2-window.innerHeight/2);});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const snapshot=()=>page.evaluate(()=>{const p=document.querySelector('.fn-popover');return{scrollY:window.scrollY,hash:location.hash,popoverVisible:!!p?.classList.contains('is-visible'),popoverAria:p?.getAttribute('aria-hidden'),active:document.activeElement?.tagName};});
 const before=await snapshot();const box=await ref.boundingBox();const href=await ref.getAttribute('href');await page.screenshot({path:`${out}/footnote-first-tap-before-390-zh.png`});
 await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const afterTwoFrames=await snapshot();await page.waitForTimeout(300);const after300ms=await snapshot();
 await page.screenshot({path:`${out}/footnote-first-tap-after-390-zh.png`});await fs.writeFile(`${out}/footnote-first-tap-baseline.json`,JSON.stringify({sources,previewCheckpoint:'b5b6fa34 disjoint global files; E10Travel WIP not built',viewport:{width:390,height:844},pointer:'coarse/touchscreen.tap simulated',motion:'reduce',href,before,afterTwoFrames,after300ms,limits:'Exploratory first actual tap observation on one existing Chinese article. Not a physical device, not passing acceptance, no source changes/real AI or contact requests.'},null,2)+'\n');console.log(JSON.stringify({href,before,afterTwoFrames,after300ms}));await context.close();
}finally{await browser.close();}
