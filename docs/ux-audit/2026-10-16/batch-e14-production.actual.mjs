import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const out='docs/ux-audit/2026-10-16/evidence',tmp='/private/tmp/ai-test-blog-ux-20261016.d8VJru/font-bundle';
const origin='http://127.0.0.1:1317',sha=b=>createHash('sha256').update(b).digest('hex');
const contract=JSON.parse(await fs.readFile(out+'/batch-e14-production-contract.json','utf8'));
const fixture=JSON.parse(await fs.readFile(tmp+'/manifest.json','utf8'));
for(const[f,h]of Object.entries(contract.sources))assert.equal(sha(await fs.readFile(f)),h,f);
const css=await fs.readFile(out+'/boundary-font-bundle-google-optional.css','utf8');assert.equal(sha(css),'36132094a2a20705d708954f4f7e0ccceb55dcc2b65d2d82948893fb65b7ce03');
const fonts=new Map();for(const f of fixture.fonts){const body=await fs.readFile(f.file);assert.equal(sha(body),f.sha256);fonts.set(f.url,{...f,body});}
const rows=[],images=[],browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
const frames=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
let fatal=null;
try{
for(const stimulus of contract.cases){
 const variant='production';
  const trace=[],requests=[],errors=[],denied=[],unknown=[],stages=[];
  let releaseCSS;const cssGate=new Promise(r=>releaseCSS=r),fast=stimulus.id==='fast-before-reading';if(fast)releaseCSS();
  const replacement=css;
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{if(location.origin==='http://127.0.0.1:1317')localStorage.setItem('pref-theme','dark');window.__fontEvents=[];for(const type of ['loading','loadingdone','loadingerror'])document.fonts.addEventListener(type,e=>window.__fontEvents.push({type,time:performance.now(),scrollY,faces:Array.from(e.fontfaces||[]).map(f=>({family:f.family,weight:f.weight,status:f.status,display:f.display}))}));});
  await context.route('**/*',async r=>{
    const q=r.request(),u=new URL(q.url());
    if(u.pathname.startsWith('/.netlify/functions/')){denied.push(q.method()+' '+u.pathname);return r.fulfill({status:503,body:'{}'});}
    if(u.hostname==='fonts.googleapis.com'){assert.equal(q.url(),fixture.styles[0].url.replace('display=swap','display=optional'));trace.push({event:'css-request',at:Date.now(),url:q.url()});await cssGate;const fail=stimulus.id==='css-404';trace.push({event:'css-deliver',at:Date.now(),status:fail?404:200,sha256:sha(fail?'':replacement)});return r.fulfill({status:fail?404:200,contentType:'text/css',body:fail?'':replacement});}
    if(u.hostname==='fonts.gstatic.com'){
      const f=fonts.get(q.url()),entry={url:q.url(),requested:Date.now(),settled:false};requests.push(entry);
      if(!f){unknown.push(q.url());entry.status=404;await r.fulfill({status:404,body:''});entry.settled=true;return;}
      if(stimulus.id==='css-late-font-1200ms')await new Promise(done=>setTimeout(done,1200));
      entry.status=stimulus.id==='css-success-font-404'?404:200;entry.delivered=Date.now();entry.fixtureSHA256=f.sha256;entry.responseBodySHA256=entry.status===200?f.sha256:sha(Buffer.alloc(0));
      await r.fulfill({status:entry.status,contentType:'font/woff2',body:entry.status===200?f.body:Buffer.alloc(0),headers:{'Access-Control-Allow-Origin':'*'}});entry.settled=true;return;
    }
    if(u.origin!==origin)return r.fulfill({status:200,contentType:q.resourceType()==='script'?'application/javascript':'text/css',body:''});
    return r.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  const cdp=await context.newCDPSession(page);let cdpError=null;try{await cdp.send('DOM.enable');await cdp.send('CSS.enable');}catch(e){cdpError=String(e);}
  async function platformFonts(){if(cdpError)return{unverified:cdpError};try{const d=await cdp.send('DOM.getDocument'),result={};for(const name of ['heading','prose','code']){const q=await cdp.send('DOM.querySelector',{nodeId:d.root.nodeId,selector:'[data-font-proof="'+name+'"]'});result[name]=q.nodeId?(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:q.nodeId})).fonts:null;}return result;}catch(e){return{unverified:String(e)};}}
  async function capture(name){
    await frames(page);
    const geometry=await page.evaluate(()=>{const e=window.__fontMarker,b=e.getBoundingClientRect();const parts={};for(const key of ['heading','prose','code']){const n=document.querySelector('[data-font-proof="'+key+'"]');if(!n){parts[key]=null;continue;}const r=document.createRange();r.selectNodeContents(n);const s=getComputedStyle(n);parts[key]={text:n.textContent.trim().slice(0,200),font:s.font,visibility:s.visibility,opacity:s.opacity,box:n.getBoundingClientRect().toJSON(),lines:Array.from(r.getClientRects()).slice(0,12).map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))};}return{time:performance.now(),rootY:scrollY,markerDocY:b.y+scrollY,markerY:b.y,docH:document.documentElement.scrollHeight,sameNode:e===document.querySelector('.post-content a.footnote-ref'),connected:e.isConnected,sameFocus:document.activeElement===window.__fontFocus,hash:location.hash,history:history.length,parts,fontStatus:document.fonts.status,faces:Array.from(document.fonts).map(f=>({family:f.family,weight:f.weight,style:f.style,display:f.display,status:f.status})),events:window.__fontEvents};});
    const actualFonts=await platformFonts(),file=out+'/batch-e14-production-'+stimulus.id+'-'+name+'.png';
    await page.screenshot({path:file,animations:'allow'});images.push(file);const stage={name,geometry,actualFonts,image:file};stages.push(stage);return stage;
  }
  try{
    await page.goto(origin+fixture.path,{waitUntil:'domcontentloaded'});await page.locator('.post-content a.footnote-ref').first().waitFor({state:'attached'});
    if(fast){await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[as=style]')).every(l=>l.relList.contains('stylesheet')));await page.evaluate(()=>document.fonts.ready);}else await page.waitForTimeout(250);
    await page.evaluate(()=>{const e=document.querySelector('.post-content a.footnote-ref');window.__fontMarker=e;window.__fontFocus=document.activeElement;document.querySelector('.post-title').dataset.fontProof='heading';(e.closest('p')||e.parentElement).dataset.fontProof='prose';const code=document.querySelector('.post-content pre code')||document.querySelector('.post-content code');if(code)code.dataset.fontProof='code';const b=e.getBoundingClientRect();scrollTo({top:scrollY+b.y+b.height/2-innerHeight/2,behavior:'instant'});});
    const before=await capture('before');trace.push({event:'reader-centered-and-before-image',at:Date.now()});releaseCSS();
    if(stimulus.id==='css-late-font-1200ms'){
      await page.waitForFunction(()=>document.fonts.size>0);for(let i=0;i<40&&!requests.length;i++)await page.waitForTimeout(25);
      assert(requests.length>0);await page.waitForTimeout(160);assert(requests.some(r=>!r.settled),'Held-font stage invalid: no outstanding font request');await capture('registered-font-held');
    }
    if(stimulus.id!=='css-404')await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[as=style]')).every(l=>l.relList.contains('stylesheet')));
    else { for(let i=0;i<100&&!trace.some(e=>e.event==='css-deliver');i++)await page.waitForTimeout(20); assert(trace.some(e=>e.event==='css-deliver'&&e.status===404)); }
    for(let i=0;stimulus.id!=='css-404'&&i<160;i++){if(requests.length&&requests.every(r=>r.settled)){await page.waitForTimeout(120);if(requests.every(r=>r.settled))break;}await page.waitForTimeout(50);}
    if(stimulus.id==='css-404')assert.equal(requests.length,0);else assert(requests.length>0&&requests.every(r=>r.settled),'Font request settlements incomplete');assert.equal(unknown.length,0,'New naturally needed fixture URL');
    await page.waitForTimeout(150);const after=await capture('terminal');
    assert(before.geometry.sameNode&&after.geometry.sameNode&&after.geometry.connected);assert.equal(after.geometry.hash,before.geometry.hash);assert.equal(after.geometry.history,before.geometry.history);assert.deepEqual(errors,[]);assert.deepEqual(denied,[]);
    const delta={document:after.geometry.markerDocY-before.geometry.markerDocY,viewport:after.geometry.markerY-before.geometry.markerY,root:after.geometry.rootY-before.geometry.rootY,docHeight:after.geometry.docH-before.geometry.docH};
    const stable=Math.abs(delta.document)<=.5&&Math.abs(delta.viewport)<=.5&&delta.root===0&&before.geometry.sameFocus&&after.geometry.sameFocus;
    assert(stable,'Production reading point must remain within original0.5px/root0 gate');
    rows.push({stimulus,variant,scope:'production candidate named cold stimulus',cssSHA256:sha(replacement),stages,delta,automated:{measurementValid:true,stableReadingPoint:stable,expectedProductionStability:stable,zeroApplicationEndpointCalls:denied.length===0},trace,requests,errors,denied,unknown});
    console.log(JSON.stringify({case:stimulus.id,variant,delta,stable,stages:stages.length,fontRequests:requests.length,actualFonts:after.actualFonts}));
    if(fast){for(const [name,selector] of [['title-surface','.post-title'],['code-surface','.post-content pre code']]){await page.locator(selector).first().evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await frames(page);const file=out+'/batch-e14-production-'+stimulus.id+'-'+name+'.png';await page.screenshot({path:file,animations:'allow'});images.push(file);}}
  }catch(error){rows.push({stimulus,variant,scope:'production candidate named cold stimulus',invalid:String(error),stages,trace,requests,errors,denied,unknown});throw error;}
  finally{releaseCSS();await context.close();}
}
}catch(error){fatal=String(error);console.log(JSON.stringify({fatal}));}
finally{await browser.close();const result={at:new Date().toISOString(),mode:'production-candidate-verification',contractSHA256:sha(await fs.readFile(out+'/batch-e14-production-contract.json')),fixtureManifestSHA256:sha(await fs.readFile(tmp+'/manifest.json')),previewCheckpoint:contract.previewCheckpoint,sources:contract.sources,rows,images,fatal,decision:'Production candidate named cold EN reading measurements; independent review pending. Original discovery lifecycle not promoted; no human preference/full96 claimed.',hypothesis:'Generated EN optional URL should retain fallback on named cold article; actual platform glyphs explicit, no HTTPwarmcache claim.',limits:contract.outOfScope,phasePaintLimit:'Each natural image only verifies its named time; no continuousFOIT-free claim. PW_TEST_SCREENSHOT_NO_FONTS_READY=1 only this gated experiment.'};await fs.writeFile(out+'/batch-e14-production-actual.json',JSON.stringify(result,null,2)+'\n');if(fatal)process.exitCode=1;}
