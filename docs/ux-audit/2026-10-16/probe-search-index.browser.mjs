import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const out='docs/ux-audit/2026-10-16/evidence',files=['assets/js/search-palette.js','layouts/partials/search-palette.html','themes/PaperMod/assets/css/common/header.css'];
const sources=Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const browser=await chromium.launch({channel:'chromium'}),observations=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  let requests=0;await context.route('**/zh/index.json',()=>{requests++;});
  await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
  const page=await context.newPage();await page.goto('http://127.0.0.1:1317/zh/articles/');
  await page.clock.install();await page.locator('[data-search-trigger="nav"]:visible').click();
  const input=page.locator('.search-palette__input');await input.fill('Kubernetes');
  await page.waitForFunction(()=>document.querySelector('.search-palette__input')?.getAttribute('aria-busy')==='true');
  const snapshot=()=>page.locator('#search-command-palette').evaluate(e=>({hidden:e.hidden,busy:e.querySelector('input').getAttribute('aria-busy'),value:e.querySelector('input').value,emptyVisible:!e.querySelector('#search-empty').hidden,emptyText:e.querySelector('#search-empty').textContent.trim(),count:e.querySelector('#search-result-count').textContent,fullHref:e.querySelector('#search-full-link').getAttribute('href'),focusInside:e.contains(document.activeElement),text:e.innerText.slice(0,700)}));
  const initial=await snapshot();await page.clock.fastForward(60000);const afterVirtual60s=await snapshot();
  await page.screenshot({path:`${out}/search-index-pending-390-zh.png`});
  await page.keyboard.press('Escape');const closeReturned=await page.locator('[data-search-trigger="nav"]:visible').evaluate(e=>e===document.activeElement);
  await page.keyboard.press('Enter');await input.fill('AI Agent');await page.clock.fastForward(60000);const reopened=await snapshot();
  observations.push({kind:'controlled indefinitely pending search-index request',viewport:{width:390,height:844},lang:'zh',motion:'reduce',initial,afterVirtual60s,closeReturned,reopened,indexRequests:requests,virtualClockMs:120000});
  await context.close();
  const normal=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  await normal.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));const p=await normal.newPage();await p.goto('http://127.0.0.1:1317/zh/articles/');await p.locator('[data-search-trigger="nav"]:visible').click();
  const q=p.locator('.search-palette__input');await q.fill('Kubernetes');await p.locator('.search-palette__result').first().waitFor();
  await q.press('ArrowLeft');const state=()=>q.evaluate(e=>({value:e.value,start:e.selectionStart,end:e.selectionEnd,active:e.getAttribute('aria-activedescendant')}));
  const beforeHome=await state();await q.press('Home');const afterHome=await state();await q.press('End');const afterEnd=await state();
  await p.screenshot({path:`${out}/search-index-available-1440-zh.png`});
  observations.push({kind:'actual available index, Home/End observation only; editable combobox APG allows optional popup variants, no automatic violation classification',viewport:{width:1440,height:900},lang:'zh',results:await p.locator('.search-palette__result').count(),beforeHome,afterHome,afterEnd});await normal.close();
  await fs.writeFile(`${out}/search-index-baseline.json`,JSON.stringify({sources,previewCheckpoint:'b5b6fa34; E10 Travel source WIP never built and disjoint from these frozen global search files',observations,limits:'Exploratory observations, not passing acceptance. Sixty-second intervals are browser virtual-clock advances with an intentionally pending intercepted local index. No real outage, backend/model request, physical phone or full keyboard certification.'},null,2)+'\n');
  console.log(JSON.stringify(observations));
} finally {await browser.close();}
