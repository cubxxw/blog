import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence',files=['assets/js/search-palette.js','layouts/partials/search-palette.html','themes/PaperMod/assets/css/common/header.css'];
const sources=Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const browser=await chromium.launch({channel:'chromium'});
try {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});let indexRequests=0,firstRoute;
 await context.route('**/zh/index.json',route=>{if(++indexRequests===1)firstRoute=route;else return route.continue();});
 await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));const page=await context.newPage();
 await page.goto('http://127.0.0.1:1317/zh/articles/');const trigger=page.locator('[data-search-trigger="nav"]:visible'),input=page.locator('.search-palette__input');
 await trigger.click();await input.fill('old pending query');await page.waitForFunction(()=>document.querySelector('.search-palette__input')?.getAttribute('aria-busy')==='true');
 await page.keyboard.press('Escape');await page.keyboard.press('Enter');await input.fill('Kubernetes');await page.locator('.search-palette__result').first().waitFor();
 const snapshot=()=>page.locator('#search-command-palette').evaluate(e=>({busy:e.querySelector('input').getAttribute('aria-busy'),query:e.querySelector('input').value,results:e.querySelectorAll('.search-palette__result').length,count:e.querySelector('#search-result-count').textContent,emptyVisible:!e.querySelector('#search-empty').hidden,emptyText:e.querySelector('#search-empty').textContent.trim(),focusInside:e.contains(document.activeElement)}));
 const newerSuccess=await snapshot();await page.screenshot({path:`${out}/search-index-new-success-1440-zh.png`});
 await firstRoute.fulfill({status:503,body:'[]'});await page.waitForFunction(()=>!document.querySelector('#search-empty').hidden);const afterOldFailure=await snapshot();
 await page.screenshot({path:`${out}/search-index-old-failure-1440-zh.png`});await input.pressSequentially(' ');await page.waitForFunction(()=>document.querySelectorAll('.search-palette__result').length>0);const editedRecovery=await snapshot();
 await fs.writeFile(`${out}/search-index-race-baseline.json`,JSON.stringify({sources,previewCheckpoint:'b5b6fa34 global files, disjoint E10 Travel WIP not built',viewport:{width:1440,height:900},motion:'reduce',lang:'zh',indexRequests,newerSuccess,afterOldFailure,editedRecovery,limits:'Controlled old index503 after later real local-index success; actual click/Escape/Enter/type. Not real backend outage or whole-family pass. No AI/contact/external requests.'},null,2)+'\n');console.log(JSON.stringify({indexRequests,newerSuccess,afterOldFailure,editedRecovery}));await context.close();
}finally{await browser.close();}
