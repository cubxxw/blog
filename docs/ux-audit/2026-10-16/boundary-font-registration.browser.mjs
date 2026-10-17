import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const dir='docs/ux-audit/2026-10-16',out=dir+'/evidence',tmp='/private/tmp/ai-test-blog-ux-20261016.d8VJru';
const origin='http://127.0.0.1:1317',path='/ai-agent/posts/context-engineering-the-new-foundation/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const meta=JSON.parse(await fs.readFile(tmp+'/boundary-font-source.json','utf8')),font=await fs.readFile(tmp+'/boundary-font.woff2');assert.equal(sha(font),meta.fontSHA256);
const sources={};for(const p of ['layouts/partials/extend_head.html','assets/css/extended/tokens.css','assets/css/extended/article-typography.css'])sources[p]=sha(await fs.readFile(p));
const contract=JSON.parse(await fs.readFile(out+'/boundary-font-registration-contract.json','utf8'));
const rows=[],images=[],browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
const tick=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{for(const stimulus of contract.cases){for(const variant of ['A','B','C']){
  const trace=[],remote=[],denied=[],errors=[];let releaseStyle,releaseFont;const late=variant!=='C';
  const styleGate=new Promise(r=>releaseStyle=r),fontGate=new Promise(r=>releaseFont=r);
  if(stimulus.id==='normal-fast'){releaseStyle();releaseFont();}
  if(stimulus.id==='edge-cached-late-registration')releaseFont();
  const face=meta.block.replace(/font-display:\s*swap/,'font-display: '+(variant==='A'?'swap':'optional')).replace(meta.fontURL,origin+'/__boundary-font.woff2');
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{if(location.origin==='http://127.0.0.1:1317')localStorage.setItem('pref-theme','dark');window.__boundaryTrace=[];document.fonts.addEventListener('loadingdone',e=>window.__boundaryTrace.push({event:'fonts-loadingdone',time:performance.now(),scrollY,faces:e.fontfaces.map(f=>({family:f.family,status:f.status}))}));});
  await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());
    if(u.pathname.startsWith('/.netlify/functions/')){denied.push(request.method()+' '+u.pathname);return route.fulfill({status:503,body:'{}'});}
    if(u.origin!==origin){remote.push({host:u.hostname,path:u.pathname});return route.fulfill({status:200,contentType:request.resourceType()==='script'?'application/javascript':'text/css',body:''});}
    if(u.pathname==='/__boundary-font.css'){trace.push({event:'style-request',time:Date.now()});await styleGate;trace.push({event:'style-fulfill',time:Date.now()});return route.fulfill({status:200,contentType:'text/css',body:face});}
    if(u.pathname==='/__boundary-font.woff2'){trace.push({event:'font-request',time:Date.now()});await fontGate;trace.push({event:'font-fulfill',time:Date.now()});return route.fulfill({status:200,contentType:'font/woff2',body:font,headers:{'Access-Control-Allow-Origin':'*'}});}
    if(request.isNavigationRequest()&&u.pathname===path){const response=await route.fetch();let html=await response.text();html=html.replace(/<link\b[^>]*href=["']https:\/\/fonts\.googleapis\.com[^>]*>/g,'');const injected=late?'<link id="boundary-font-css" rel="preload" as="style" href="/__boundary-font.css" onload="this.onload=null;this.rel=\'stylesheet\'">':'<style id="boundary-font-inline">'+face+'</style>';html=html.replace('</head>',injected+'</head>');trace.push({event:'document-overlay',time:Date.now(),htmlSHA256:sha(html)});return route.fulfill({response,body:html});}
    return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(origin+path,{waitUntil:'domcontentloaded'});const ref=page.locator('.post-content a.footnote-ref').first();await ref.waitFor({state:'attached'});
  if(stimulus.id==='normal-fast'){await page.waitForFunction(()=>document.fonts.size>0);await page.evaluate(()=>document.fonts.ready);}
  else await page.waitForTimeout(250);
  await ref.evaluate(e=>{window.__boundaryOriginal=e;const r=e.getBoundingClientRect();scrollTo({top:scrollY+r.y+r.height/2-innerHeight/2,behavior:'instant'});});await tick(page);
  const sample=()=>page.evaluate(()=>{const e=window.__boundaryOriginal,p=e.closest('p')||e.parentElement,r=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(p);const lines=Array.from(range.getClientRects()).slice(0,12).map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}));return{time:performance.now(),rootY:scrollY,hash:location.hash,history:history.length,originalConnected:e.isConnected,sameNode:e===document.querySelector('.post-content a.footnote-ref'),markerDocY:r.y+scrollY,markerY:r.y,docH:document.documentElement.scrollHeight,markerText:e.textContent,proseFont:getComputedStyle(p).font,visibleText:p.textContent.trim().slice(0,150),lines,faces:Array.from(document.fonts).map(f=>({family:f.family,status:f.status,display:f.display})),fontStatus:document.fonts.status,events:window.__boundaryTrace};});
  const before=await sample();const beforeImage=`${out}/boundary-font-${stimulus.id}-${variant}-before.png`;await page.screenshot({path:beforeImage,animations:'disabled'});images.push(beforeImage);
  trace.push({event:'reader-centered-and-before-image',time:Date.now(),rootY:before.rootY});releaseStyle();
  if(stimulus.id==='failure-slow-font'){await page.waitForTimeout(1200);trace.push({event:'release-slow-font',time:Date.now()});releaseFont();}
  await page.waitForFunction(()=>Array.from(document.fonts).some(f=>f.family.includes('Noto Serif')&&f.status==='loaded'),{},{polling:100,timeout:10000});await tick(page);await page.waitForTimeout(150);
  const after=await sample(),afterImage=`${out}/boundary-font-${stimulus.id}-${variant}-after.png`;await page.screenshot({path:afterImage,animations:'disabled'});images.push(afterImage);
  assert(before.originalConnected&&after.originalConnected&&before.sameNode&&after.sameNode);assert.equal(denied.length,0);assert.equal(errors.length,0);assert.equal(before.hash,after.hash);assert.equal(before.history,after.history);
  const delta={root:after.rootY-before.rootY,document:after.markerDocY-before.markerDocY,viewport:after.markerY-before.markerY,docHeight:after.docH-before.docH};
  rows.push({case:stimulus,variant,split:'discovery',review:{status:'unreviewed'},humanChoice:'unreviewed',before,after,delta,automated:{measurementValid:true,stableReadingAnchor:Math.abs(delta.document)<=.5&&Math.abs(delta.viewport)<=.5,zeroApplicationEndpointCalls:denied.length===0},trace,remoteStubbed:remote,errors,images:[beforeImage,afterImage]});
  console.log(JSON.stringify({case:stimulus.id,variant,delta,loaded:after.faces}));await context.close();
}}
const result={at:new Date().toISOString(),question:contract.question,mode:'boundary',sources,previewCheckpoint:'9ec879f3 accepted; E13 WIP not built',fontSource:meta,rows,images,decision:'inconclusive until independent evidence review',humanChoice:'unreviewed',hypothesis:'Late registration starts a new optional timing opportunity; early optional may keep fallback under slow font fixtures. This is a hypothesis until measurements and independent review, not a production fix.',limits:contract.outOfScope};await fs.writeFile(out+'/boundary-font-registration.json',JSON.stringify(result,null,2)+'\n');
}finally{await browser.close();}
