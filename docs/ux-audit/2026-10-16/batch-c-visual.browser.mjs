import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';
const out=path.resolve('docs/ux-audit/2026-10-16/evidence'),base='http://127.0.0.1:1317',checks=[],errors=[];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
try{for(const [width,locale,theme] of [[320,'zh','dark'],[390,'zh','light'],[320,'en','light'],[390,'en','dark']]){
 const c=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await c.addInitScript(theme=>{localStorage.setItem('pref-theme',theme);Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new DOMException('Isolated denial','NotAllowedError'))}});document.execCommand=()=>false;},theme);
 await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/functions/'))return r.fulfill({status:503,contentType:'application/json',body:'{"error":"isolated QA"}'});if(u.origin===base)return r.continue();if(u.hostname==='cubxxw.com'){const response=await r.fetch({url:base+u.pathname+u.search});return r.fulfill({response});}return r.fulfill({status:200,body:'',contentType:'application/javascript'});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));const route=(locale==='zh'?'/zh':'')+'/ai-agent/posts/nango-user-defined-mcp-integration/';await p.goto(base+route);
 const copy=p.locator('.copy-code').first();await copy.scrollIntoViewIfNeeded();await copy.click();await p.waitForFunction(()=>document.querySelector('.code-copy-status')?.textContent.length>0);
 const geometry=await p.locator('.code-copy-status').first().evaluate(status=>{const host=status.parentElement,button=host.querySelector('.code-tool-expand');const b=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(status);const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});return {button:rect(b),lines:[...range.getClientRects()].map(rect),hit:button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),message:status.textContent};});
 assert.ok(geometry.button.width>=44&&geometry.button.height>=44);assert.equal(geometry.hit,true);
 for(const line of geometry.lines)assert.ok(line.right<=geometry.button.x||line.x>=geometry.button.right||line.bottom<=geometry.button.y||line.y>=geometry.button.bottom,JSON.stringify(geometry));
 const file=`batch-c-code-${locale}-${theme}-${width}.png`;await p.screenshot({path:path.join(out,file)});
 checks.push({id:'C.CODECOPY.error-tool-separation',route,viewport:{width,height:844},locale,theme,zoom:1,reducedMotion:'reduce',source:'batch-c-source.json',selector:'.code-copy-status/.code-tool-expand',passed:true,geometry,screenshot:file});
 // Native code fullscreen action remains reachable and contains no duplicate
 // copy feedback from the article underneath.
 await p.locator('.code-tool-expand').first().click();await p.locator('.code-fs-stage').waitFor();assert.equal(await p.locator('.code-fs-content .code-copy-status').count(),0);await p.keyboard.press('Escape');
 checks.push({id:'C.CODECOPY.fullscreen-after-error',route,viewport:{width,height:844},locale,theme,zoom:1,reducedMotion:'reduce',source:'batch-c-source.json',passed:true});
 await c.close();console.log('PASS',locale,theme,width);
}assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'batch-c-visual-checks.json'),JSON.stringify({checks,errors,source:'batch-c-source.json'},null,2));}finally{await browser.close();}
