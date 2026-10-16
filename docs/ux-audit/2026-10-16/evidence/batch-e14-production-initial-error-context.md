# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: article-font-stability-contracts.spec.ts >> served font policy is optional only for English posts and the existing home bundle; async/noscript/families stay intact
- Location: tests/e2e/article-font-stability-contracts.spec.ts:24:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "this.onload=null;this.rel='stylesheet'"
Received: "this.onload=null,this.rel=\"stylesheet\""
```

# Test source

```ts
  1   | import {test,expect,type Page} from '../helpers/frozen-site';
  2   | import {readFileSync} from 'node:fs';
  3   | import {basename,dirname,resolve} from 'node:path';
  4   | import {createHash} from 'node:crypto';
  5   | import {parse} from 'parse5';
  6   | 
  7   | test.use({channel:'chromium',viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
  8   | const article='/ai-agent/posts/context-engineering-the-new-foundation/';
  9   | const formalPath=resolve('docs/ux-audit/2026-10-16/evidence/boundary-font-bundle-fixture-manifest.json');
  10  | const bundlePath=process.env.ARTICLE_FONT_BUNDLE_MANIFEST;
  11  | const hash=(body:string|Buffer)=>createHash('sha256').update(body).digest('hex');
  12  | const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
  13  | const signature=(address:string)=>{const url=new URL(address);return JSON.stringify({origin:url.origin,path:url.pathname,families:url.searchParams.getAll('family'),display:url.searchParams.get('display')});};
  14  | 
  15  | function headLinks(html:string){
  16  |   const links:{href:string;rel:string;as:string;onload:string;noscript:boolean;id:string}[]=[];
  17  |   const walk=(node:any,noscript=false)=>{
  18  |     const inside=noscript||node.tagName==='noscript';
  19  |     if(node.tagName==='link'){const attrs=Object.fromEntries(node.attrs.map((attr:any)=>[attr.name,attr.value]));links.push({href:attrs.href||'',rel:attrs.rel||'',as:attrs.as||'',onload:attrs.onload||'',noscript:inside,id:attrs.id||''});}
  20  |     for(const child of node.childNodes||[])walk(child,inside);
  21  |   };walk(parse(html,{scriptingEnabled:false}));return links;
  22  | }
  23  | 
  24  | test('served font policy is optional only for English posts and the existing home bundle; async/noscript/families stay intact',async({page})=>{
  25  |   const fullFamilies=['Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,700','Inter:wght@400;500;600;700','Noto Serif:ital,wght@0,400;0,700;1,400','JetBrains Mono:wght@400;500;700','Space Grotesk:wght@500;600;700'];
  26  |   const homeFamilies=['Inter:wght@400;500;600;700','JetBrains Mono:wght@400;500;700','Space Grotesk:wght@500;600;700'];
  27  |   for(const row of [
  28  |     {path:article,display:'optional',families:fullFamilies,zh:false},
  29  |     {path:'/engineering/posts/use-go-tools-dlv/',display:'optional',families:fullFamilies,zh:false},
  30  |     {path:'/zh'+article,display:'swap',families:fullFamilies,zh:true},
  31  |     {path:'/travel/',display:'swap',families:fullFamilies,zh:false},
  32  |     {path:'/projects/imstage/',display:'optional',families:fullFamilies,zh:false},
  33  |     {path:'/ai-agent/',display:'swap',families:fullFamilies,zh:false},
  34  |     {path:'/',display:'optional',families:homeFamilies,zh:false},
  35  |     {path:'/zh/',display:'optional',families:homeFamilies,zh:false},
  36  |     {path:'/articles/',display:null,families:[],zh:false}
  37  |   ]){
  38  |     const response=await page.request.get(row.path);expect(response.status(),row.path).toBe(200);expect(new URL(response.url()).pathname).toBe(row.path);
  39  |     const links=headLinks(await response.text()),google=links.filter(link=>link.href.startsWith('https://fonts.googleapis.com/css2?'));
  40  |     expect(google,row.path).toHaveLength(row.display?2:0);
  41  |     if(row.display){
  42  |       const preload=google.find(link=>!link.noscript)!,noscript=google.find(link=>link.noscript)!;
> 43  |       expect(preload.rel).toBe('preload');expect(preload.as).toBe('style');expect(preload.onload).toBe("this.onload=null;this.rel='stylesheet'");
      |                                                                                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  44  |       expect(noscript.rel).toBe('stylesheet');expect(noscript.onload).toBe('');expect(noscript.href).toBe(preload.href);
  45  |       const url=new URL(preload.href);expect(url.searchParams.get('display')).toBe(row.display);expect(url.searchParams.getAll('family')).toEqual(row.families);
  46  |     }
  47  |     const chinese=links.filter(link=>link.href==='/fonts/noto-serif-sc/v5.2.8/noto-serif-sc.css');expect(chinese).toHaveLength(row.zh?2:0);
  48  |     if(row.zh){expect(chinese.some(link=>link.id==='zh-prose-fonts'&&!link.noscript&&link.rel==='preload'&&link.as==='style')).toBe(true);expect(chinese.some(link=>link.noscript&&link.rel==='stylesheet')).toBe(true);}
  49  |   }
  50  | });
  51  | 
  52  | function approvedBundle(){
  53  |   if(!bundlePath)throw new Error('ARTICLE_FONT_BUNDLE_MANIFEST is required for the offline font cases');
  54  |   const formal=JSON.parse(readFileSync(formalPath,'utf8')),manifest=JSON.parse(readFileSync(bundlePath,'utf8'));
  55  |   expect(manifest.path).toBe(article);expect(formal.fonts).toHaveLength(7);expect(manifest.fonts.map((font:any)=>[font.url,font.sha256])).toEqual(formal.fonts.map((font:any)=>[font.url,font.sha256]));
  56  |   const directory=dirname(resolve(bundlePath)),css=readFileSync(resolve(directory,basename(manifest.styles[0].file)),'utf8');
  57  |   expect(hash(css)).toBe(formal.styles[0].sha256);expect(manifest.styles[0].url).toBe(formal.styles[0].url);
  58  |   const optional=css.replace(/font-display:\s*swap/g,'font-display: optional');
  59  |   expect(optional).not.toBe(css);expect(optional.replace(/font-display:\s*optional/g,'font-display: DISPLAY')).toBe(css.replace(/font-display:\s*swap/g,'font-display: DISPLAY'));
  60  |   const fonts=new Map<string,Buffer>();for(const entry of manifest.fonts){const body=readFileSync(resolve(directory,basename(entry.file)));expect(hash(body)).toBe(entry.sha256);fonts.set(entry.url,body);}
  61  |   return{css:optional,url:manifest.styles[0].url.replace('display=swap','display=optional'),fonts,manifestSHA256:hash(readFileSync(bundlePath)),cssSHA256:hash(optional)};
  62  | }
  63  | 
  64  | for(const stimulus of ['late CSS with approved fonts','late fonts held 1200ms then 404','CSS 404'] as const){
  65  |   test(`${stimulus}: the original article marker, document/viewport read point, hash and focus stay stable`,async({page})=>{
  66  |     test.skip(!bundlePath,'Provide the approved offline 7-file bundle via ARTICLE_FONT_BUNDLE_MANIFEST; no external font fetch fallback.');
  67  |     const bundle=approvedBundle(),requests:{url:string;status:number;settled:boolean}[]=[],unknown:string[]=[],applicationRequests:string[]=[],errors:string[]=[],stages:any[]=[];
  68  |     let releaseCSS=()=>{},releaseFonts=()=>{},cssSettled=false;
  69  |     const cssGate=new Promise<void>(done=>{releaseCSS=done;}),fontGate=new Promise<void>(done=>{releaseFonts=done;});
  70  |     if(stimulus!=='late fonts held 1200ms then 404')releaseFonts();
  71  |     await page.addInitScript(()=>localStorage.setItem('pref-theme','dark'));
  72  |     page.on('pageerror',error=>errors.push(error.message));
  73  |     page.on('request',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/.netlify/functions/')||url.pathname.startsWith('/api/'))applicationRequests.push(`${request.method()} ${url.pathname}`);});
  74  |     await page.route('https://fonts.googleapis.com/**',async route=>{
  75  |       if(signature(route.request().url())!==signature(bundle.url)){unknown.push(route.request().url());await route.fulfill({status:404,body:''});return;}
  76  |       await cssGate;await route.fulfill({status:stimulus==='CSS 404'?404:200,contentType:'text/css',body:stimulus==='CSS 404'?'':bundle.css});cssSettled=true;
  77  |     });
  78  |     await page.route('https://fonts.gstatic.com/**',async route=>{
  79  |       const address=route.request().url(),font=bundle.fonts.get(address),entry={url:address,status:stimulus==='late fonts held 1200ms then 404'||!font?404:200,settled:false};requests.push(entry);
  80  |       if(!font)unknown.push(address);await fontGate;
  81  |       await route.fulfill({status:entry.status,contentType:'font/woff2',body:entry.status===200?font!:Buffer.alloc(0),headers:{'access-control-allow-origin':'*'}});entry.settled=true;
  82  |     });
  83  |     try{
  84  |       await page.goto(article,{waitUntil:'domcontentloaded'});const marker=page.locator('.post-content a.footnote-ref').first();await expect(marker).toBeAttached();
  85  |       const original=await marker.elementHandle(),focus=await page.locator('#theme-toggle').elementHandle();
  86  |       await marker.evaluate(el=>{const rect=el.getBoundingClientRect();scrollTo({top:scrollY+rect.y+rect.height/2-innerHeight/2,behavior:'instant'});});
  87  |       await page.locator('#theme-toggle').evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));await frames(page);await expect(marker).toBeInViewport();
  88  |       const capture=async(name:string)=>{
  89  |         await frames(page);const state=await marker.evaluate((el,focus)=>{const rect=el.getBoundingClientRect();return{y:rect.y,documentY:rect.y+scrollY,rootY:scrollY,hash:location.hash,history:history.length,text:el.textContent,id:el.id,sameFocus:document.activeElement===focus,connected:el.isConnected,fontStatus:document.fonts.status,faces:Array.from(document.fonts).map(font=>({family:font.family,display:font.display,status:font.status}))};},focus);
  90  |         expect(await marker.evaluate((el,old)=>el===old,original)).toBe(true);expect(state.connected).toBe(true);expect(state.sameFocus).toBe(true);stages.push({name,...state});return state;
  91  |       };
  92  |       const before=await capture('reading before release');expect(cssSettled).toBe(false);releaseCSS();await expect.poll(()=>cssSettled).toBe(true);
  93  |       if(stimulus!=='CSS 404'){
  94  |         await expect.poll(()=>page.locator('link[as="style"][href^="https://fonts.googleapis.com/css2"]').getAttribute('rel')).toBe('stylesheet');
  95  |         await expect.poll(()=>requests.length).toBeGreaterThan(0);
  96  |         if(stimulus==='late fonts held 1200ms then 404'){
  97  |           // This is the named network stimulus, not a wait used to conceal a layout failure.
  98  |           await page.waitForTimeout(1200);await capture('registered fonts still held');expect(requests.some(request=>!request.settled)).toBe(true);releaseFonts();
  99  |         }
  100 |         await expect.poll(()=>requests.length>0&&requests.every(request=>request.settled)).toBe(true);
  101 |       }else expect(requests).toHaveLength(0);
  102 |       await frames(page);await page.evaluate(()=>document.fonts.ready);const after=await capture('terminal');
  103 |       for(const stage of stages){expect(stage.rootY).toBe(before.rootY);expect(Math.abs(stage.documentY-before.documentY)).toBeLessThanOrEqual(.5);expect(Math.abs(stage.y-before.y)).toBeLessThanOrEqual(.5);expect(stage.hash).toBe(before.hash);expect(stage.history).toBe(before.history);expect(stage.text).toBe(before.text);}
  104 |       if(stimulus!=='CSS 404'){expect(after.faces.length).toBeGreaterThan(0);expect(after.faces.every(face=>face.display==='optional')).toBe(true);}
  105 |       expect(unknown,'Unknown font/CSS URLs are rejected, never fetched externally').toEqual([]);expect(applicationRequests).toEqual([]);expect(errors).toEqual([]);
  106 |     }finally{
  107 |       releaseCSS();releaseFonts();await page.unrouteAll({behavior:'wait'});
  108 |       await test.info().attach('font-stability-evidence',{contentType:'application/json',body:JSON.stringify({stimulus,manifestSHA256:bundle.manifestSHA256,cssSHA256:bundle.cssSHA256,stages,requests,unknown,applicationRequests,errors,limits:'Cold Chromium controlled response only. No warm-cache, actual platform glyph-family, continuous FOIT, other-browser or production-network claim.'},null,2)});
  109 |     }
  110 |   });
  111 | }
  112 | 
```