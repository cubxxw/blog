import {test,expect,type Page} from '../helpers/frozen-site';
import {readFileSync} from 'node:fs';
import {basename,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'parse5';

test.use({channel:'chromium',viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
const article='/ai-agent/posts/context-engineering-the-new-foundation/';
const formalPath=resolve('docs/ux-audit/2026-10-16/evidence/boundary-font-bundle-fixture-manifest.json');
const bundlePath=process.env.ARTICLE_FONT_BUNDLE_MANIFEST;
const hash=(body:string|Buffer)=>createHash('sha256').update(body).digest('hex');
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
const signature=(address:string)=>{const url=new URL(address);return JSON.stringify({origin:url.origin,path:url.pathname,families:url.searchParams.getAll('family'),display:url.searchParams.get('display')});};

function headLinks(html:string){
  const links:{href:string;rel:string;as:string;onload:string;noscript:boolean;id:string}[]=[];
  const walk=(node:any,noscript=false)=>{
    const inside=noscript||node.tagName==='noscript';
    if(node.tagName==='link'){const attrs=Object.fromEntries(node.attrs.map((attr:any)=>[attr.name,attr.value]));links.push({href:attrs.href||'',rel:attrs.rel||'',as:attrs.as||'',onload:attrs.onload||'',noscript:inside,id:attrs.id||''});}
    for(const child of node.childNodes||[])walk(child,inside);
  };walk(parse(html,{scriptingEnabled:false}));return links;
}

test('font policy keeps optional English fonts and Chinese fonts that cannot block first paint',async({page})=>{
  const fullFamilies=['Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,700','Inter:wght@400;500;600;700','Noto Serif:ital,wght@0,400;0,700;1,400','JetBrains Mono:wght@400;500;700','Space Grotesk:wght@500;600;700'];
  const homeFamilies=['Inter:wght@400;500;600;700','JetBrains Mono:wght@400;500;700','Space Grotesk:wght@500;600;700'];
  for(const row of [
    {path:article,display:'optional',families:fullFamilies,zh:false},
    {path:'/engineering/posts/use-go-tools-dlv/',display:'optional',families:fullFamilies,zh:false},
    {path:'/zh'+article,display:null,families:[],zh:true},
    {path:'/travel/',display:'swap',families:fullFamilies,zh:false},
    {path:'/projects/imstage/',display:'optional',families:fullFamilies,zh:false},
    {path:'/ai-agent/',display:'swap',families:fullFamilies,zh:false},
    {path:'/',display:'optional',families:homeFamilies,zh:false},
    {path:'/zh/',display:'optional',families:homeFamilies,zh:false},
    {path:'/articles/',display:null,families:[],zh:false}
  ]){
    const response=await page.request.get(row.path);expect(response.status(),row.path).toBe(200);expect(new URL(response.url()).pathname).toBe(row.path);
    const links=headLinks(await response.text()),google=links.filter(link=>link.href.startsWith('https://fonts.googleapis.com/css2?'));
    expect(google,row.path).toHaveLength(row.display?2:0);
    if(row.display){
      const preload=google.find(link=>!link.noscript)!,noscript=google.find(link=>link.noscript)!;
      expect(preload.rel).toBe('preload');expect(preload.as).toBe('style');
      // Hugo minifies the same handler into different JavaScript spellings.
      // Execute the actual served handler on an unmounted, URL-less link.
      const behavior=await page.evaluate(handler=>{
        const link=document.createElement('link');link.rel='preload';link.as='style';link.setAttribute('onload',handler);
        link.dispatchEvent(new Event('load'));
        return{rel:link.rel,as:link.as,cleared:link.onload===null,connected:link.isConnected,href:link.getAttribute('href')};
      },preload.onload);
      expect(behavior).toEqual({rel:'stylesheet',as:'style',cleared:true,connected:false,href:null});
      expect(noscript.rel).toBe('stylesheet');expect(noscript.onload).toBe('');expect(noscript.href).toBe(preload.href);
      const url=new URL(preload.href);expect(url.searchParams.get('display')).toBe(row.display);expect(url.searchParams.getAll('family')).toEqual(row.families);
    }
    const chinese=links.filter(link=>link.id==='zh-prose-fonts');expect(chinese).toHaveLength(row.zh?1:0);
    if(row.zh){
      expect(chinese[0].rel).toBe('preload');expect(chinese[0].as).toBe('style');expect(chinese[0].noscript).toBe(false);
      const fallback=links.filter(link=>link.noscript&&link.href===chinese[0].href);
      expect(fallback).toHaveLength(1);expect(fallback[0].rel).toBe('stylesheet');
      expect(chinese[0].href).toMatch(/^\/assets\/fonts\/noto-serif-sc-reading\.min\.[a-f0-9]+\.css$/);
      const manifest=await page.request.get(chinese[0].href);expect(manifest.ok()).toBe(true);
      const css=await manifest.text();expect(css).toContain('font-display:optional');expect(css).not.toContain('font-display:swap');
      expect(css).toContain('/fonts/noto-serif-sc/v5.2.8/files/');expect(css).not.toContain('url(./');
    }
  }
});

function approvedBundle(){
  if(!bundlePath)throw new Error('ARTICLE_FONT_BUNDLE_MANIFEST is required for the offline font cases');
  const formal=JSON.parse(readFileSync(formalPath,'utf8')),manifest=JSON.parse(readFileSync(bundlePath,'utf8'));
  expect(manifest.path).toBe(article);expect(formal.fonts).toHaveLength(7);expect(manifest.fonts.map((font:any)=>[font.url,font.sha256])).toEqual(formal.fonts.map((font:any)=>[font.url,font.sha256]));
  const directory=dirname(resolve(bundlePath)),css=readFileSync(resolve(directory,basename(manifest.styles[0].file)),'utf8');
  expect(hash(css)).toBe(formal.styles[0].sha256);expect(manifest.styles[0].url).toBe(formal.styles[0].url);
  const optional=css.replace(/font-display:\s*swap/g,'font-display: optional');
  expect(optional).not.toBe(css);expect(optional.replace(/font-display:\s*optional/g,'font-display: DISPLAY')).toBe(css.replace(/font-display:\s*swap/g,'font-display: DISPLAY'));
  const fonts=new Map<string,Buffer>();for(const entry of manifest.fonts){const body=readFileSync(resolve(directory,basename(entry.file)));expect(hash(body)).toBe(entry.sha256);fonts.set(entry.url,body);}
  return{css:optional,url:manifest.styles[0].url.replace('display=swap','display=optional'),fonts,manifestSHA256:hash(readFileSync(bundlePath)),cssSHA256:hash(optional)};
}

for(const stimulus of ['late CSS with approved fonts','late fonts held 1200ms then 404','CSS 404'] as const){
  test(`${stimulus}: the original article marker, document/viewport read point, hash and focus stay stable`,async({page})=>{
    test.skip(!bundlePath,'Provide the approved offline 7-file bundle via ARTICLE_FONT_BUNDLE_MANIFEST; no external font fetch fallback.');
    const bundle=approvedBundle(),requests:{url:string;status:number;settled:boolean}[]=[],unknown:string[]=[],applicationRequests:string[]=[],errors:string[]=[],stages:any[]=[];
    let releaseCSS=()=>{},releaseFonts=()=>{},cssSettled=false;
    const cssGate=new Promise<void>(done=>{releaseCSS=done;}),fontGate=new Promise<void>(done=>{releaseFonts=done;});
    if(stimulus!=='late fonts held 1200ms then 404')releaseFonts();
    await page.addInitScript(()=>localStorage.setItem('pref-theme','dark'));
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/.netlify/functions/')||url.pathname.startsWith('/api/'))applicationRequests.push(`${request.method()} ${url.pathname}`);});
    await page.route('https://fonts.googleapis.com/**',async route=>{
      if(signature(route.request().url())!==signature(bundle.url)){unknown.push(route.request().url());await route.fulfill({status:404,body:''});return;}
      await cssGate;await route.fulfill({status:stimulus==='CSS 404'?404:200,contentType:'text/css',body:stimulus==='CSS 404'?'':bundle.css});cssSettled=true;
    });
    await page.route('https://fonts.gstatic.com/**',async route=>{
      const address=route.request().url(),font=bundle.fonts.get(address),entry={url:address,status:stimulus==='late fonts held 1200ms then 404'||!font?404:200,settled:false};requests.push(entry);
      if(!font)unknown.push(address);await fontGate;
      await route.fulfill({status:entry.status,contentType:'font/woff2',body:entry.status===200?font!:Buffer.alloc(0),headers:{'access-control-allow-origin':'*'}});entry.settled=true;
    });
    try{
      await page.goto(article,{waitUntil:'domcontentloaded'});const marker=page.locator('.post-content a.footnote-ref').first();await expect(marker).toBeAttached();
      const original=await marker.elementHandle(),focus=await page.locator('#theme-toggle').elementHandle();
      await marker.evaluate(el=>{const rect=el.getBoundingClientRect();scrollTo({top:scrollY+rect.y+rect.height/2-innerHeight/2,behavior:'instant'});});
      await page.locator('#theme-toggle').evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));await frames(page);await expect(marker).toBeInViewport();
      const capture=async(name:string)=>{
        await frames(page);const state=await marker.evaluate((el,focus)=>{const rect=el.getBoundingClientRect();return{y:rect.y,documentY:rect.y+scrollY,rootY:scrollY,hash:location.hash,history:history.length,text:el.textContent,id:el.id,sameFocus:document.activeElement===focus,connected:el.isConnected,fontStatus:document.fonts.status,faces:Array.from(document.fonts).map(font=>({family:font.family,display:font.display,status:font.status}))};},focus);
        expect(await marker.evaluate((el,old)=>el===old,original)).toBe(true);expect(state.connected).toBe(true);expect(state.sameFocus).toBe(true);stages.push({name,...state});return state;
      };
      const before=await capture('reading before release');expect(cssSettled).toBe(false);releaseCSS();await expect.poll(()=>cssSettled).toBe(true);
      if(stimulus!=='CSS 404'){
        await expect.poll(()=>page.locator('link[as="style"][href^="https://fonts.googleapis.com/css2"]').getAttribute('rel')).toBe('stylesheet');
        await expect.poll(()=>requests.length).toBeGreaterThan(0);
        if(stimulus==='late fonts held 1200ms then 404'){
          // This is the named network stimulus, not a wait used to conceal a layout failure.
          await page.waitForTimeout(1200);await capture('registered fonts still held');expect(requests.some(request=>!request.settled)).toBe(true);releaseFonts();
        }
        await expect.poll(()=>requests.length>0&&requests.every(request=>request.settled)).toBe(true);
      }else expect(requests).toHaveLength(0);
      await frames(page);await page.evaluate(()=>document.fonts.ready);const after=await capture('terminal');
      for(const stage of stages){expect(stage.rootY).toBe(before.rootY);expect(Math.abs(stage.documentY-before.documentY)).toBeLessThanOrEqual(.5);expect(Math.abs(stage.y-before.y)).toBeLessThanOrEqual(.5);expect(stage.hash).toBe(before.hash);expect(stage.history).toBe(before.history);expect(stage.text).toBe(before.text);}
      if(stimulus!=='CSS 404'){expect(after.faces.length).toBeGreaterThan(0);expect(after.faces.every(face=>face.display==='optional')).toBe(true);}
      expect(unknown,'Unknown font/CSS URLs are rejected, never fetched externally').toEqual([]);expect(applicationRequests).toEqual([]);expect(errors).toEqual([]);
    }finally{
      releaseCSS();releaseFonts();await page.unrouteAll({behavior:'wait'});
      await test.info().attach('font-stability-evidence',{contentType:'application/json',body:JSON.stringify({stimulus,manifestSHA256:bundle.manifestSHA256,cssSHA256:bundle.cssSHA256,stages,requests,unknown,applicationRequests,errors,limits:'Cold Chromium controlled response only. No warm-cache, actual platform glyph-family, continuous FOIT, other-browser or production-network claim.'},null,2)});
    }
  });
}
