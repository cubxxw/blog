import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence',source='assets/js/search-palette.js',sourceSHA256=createHash('sha256').update(await fs.readFile(source)).digest('hex');
const browser=await chromium.launch({channel:'chromium'});
try {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));const page=await context.newPage();
 await page.goto('http://127.0.0.1:1317/zh/articles/');await page.locator('[data-search-trigger="nav"]:visible').click();const input=page.locator('.search-palette__input');await input.fill('Kubernetes');await page.locator('.search-palette__result').first().waitFor();
 const oldFirst=await page.locator('.search-palette__result-link').first().evaluate(e=>({href:e.href,title:e.textContent.trim().slice(0,160)}));
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 const newQuery='zz_no_matching_topic_981254';await input.fill(newQuery);
 const beforeEnter=await page.locator('#search-command-palette').evaluate(e=>({query:e.querySelector('input').value,results:e.querySelectorAll('.search-palette__result').length,firstHref:e.querySelector('.search-palette__result-link')?.href,active:e.querySelector('input').getAttribute('aria-activedescendant'),fullHref:e.querySelector('#search-full-link').href}));
 await page.screenshot({path:`${out}/search-intent-old-results-1440-zh.png`});let navigationURL;let observed;const navigation=new Promise(r=>observed=r);
 await page.route('**/*',route=>{if(route.request().isNavigationRequest()&&route.request().frame()===page.mainFrame()){navigationURL=route.request().url();observed();return route.abort();}return route.continue();});
 await input.press('Enter');await navigation;
 await fs.writeFile(`${out}/search-intent-baseline.json`,JSON.stringify({source,sourceSHA256,previewCheckpoint:'b5b6fa34 global file; E10 source WIP not built',viewport:{width:1440,height:900},lang:'zh',motion:'reduce',clock:'paused only after actual index results; intended debounce 150ms has not fired',oldFirst,newQuery,beforeEnter,navigationURL,navigatedToOldFirst:navigationURL===oldFirst.href,limits:'Exploratory actual local-index query change/Enter with clock held inside150ms. Navigation intercepted and aborted locally, no public-site request. Not a passing test or physical-device/full-keyboard certification.'},null,2)+'\n');
 console.log(JSON.stringify({newQuery,beforeEnter,navigationURL,navigatedToOldFirst:navigationURL===oldFirst.href}));await context.close();
}finally{await browser.close();}
