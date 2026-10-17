import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence';
const browser=await chromium.launch({channel:'chromium'});
try {
 const page=await browser.newPage({viewport:{width:568,height:320},reducedMotion:'reduce',serviceWorkers:'block'});
 await page.addInitScript(()=>{const original=window.fetch;window.fetch=(input,options)=>String(input).includes('/.netlify/functions/blog-ai')?new Promise(resolve=>{window.__finishWheelProbe=()=>resolve(new Response(JSON.stringify({answer:'Isolated reply completed after the reader scrolled away.'}),{headers:{'content-type':'application/json'}}));}):original(input,options);});
 await page.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.goto('http://127.0.0.1:1317/');
 await page.locator('#hp-avatar-btn').click();
 await page.locator('#hp-chat-input').fill('Check reader scroll intent');
 await page.locator('#hp-chat-input').press('Enter');
 await page.waitForFunction(()=>window.__finishWheelProbe);
 const snapshot=()=>page.evaluate(()=>({scrollY,focused:document.activeElement?.className,chat:document.querySelector('.hp-bear-chat')?.getBoundingClientRect().toJSON(),books:document.querySelector('#hp-books')?.getBoundingClientRect().toJSON()}));
 const afterSend=await snapshot();
 await page.mouse.move(5,310);
 await page.mouse.wheel(0,620);
 await page.waitForTimeout(350);
 const afterWheel=await snapshot();
 await page.screenshot({path:out+'/home-wheel-before-complete.png'});
 await page.evaluate(()=>window.__finishWheelProbe());
 await page.waitForFunction(()=>document.querySelector('#hp-chat-body')?.getAttribute('aria-busy')==='false');
 await page.waitForTimeout(100);
 const afterComplete=await snapshot();
 await page.screenshot({path:out+'/home-wheel-after-complete.png'});
 await fs.writeFile(out+'/home-wheel-intent-probe.json',JSON.stringify({source:'batch-e61-source.json',viewport:{width:568,height:320},lang:'en',motion:'reduce',kind:'Exploratory scroll-intent probe, not a passing contract. Actual wheel + isolated delayed JSON, no paid backend.',afterSend,afterWheel,afterComplete,completionScrollDelta:afterComplete.scrollY-afterWheel.scrollY,limits:'One Chromium simulated short viewport; no OS keyboard/physical phone claim.'},null,2)+'\n');
 console.log(JSON.stringify({afterSend,afterWheel,afterComplete,completionScrollDelta:afterComplete.scrollY-afterWheel.scrollY}));
} finally {await browser.close();}
