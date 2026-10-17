import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const out='docs/ux-audit/2026-10-16/evidence', batch=process.env.UX_BATCH||'e10', observations=[];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function settleBackground(page) {
  await page.evaluate(()=>document.fonts.ready);await frames(page);
  await page.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getComputedTiming().iterations!==Infinity&&!a.effect?.target?.closest?.('#tw-qr')));
}
async function center(page,control) {
  await control.scrollIntoViewIfNeeded();
  await settleBackground(page);
  const box=await control.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  assert(box.hit&&box.width>=43.9&&box.height>=43.9,JSON.stringify(box));
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);return box;
}
async function opened(page) {
  await page.waitForFunction(()=>{
    const d=document.querySelector('#tw-qr'),s=d&&getComputedStyle(d),i=d?.querySelector('.tw-qr__img');
    return d?.open&&d.matches(':modal')&&s.opacity==='1'&&i?.complete&&i.naturalWidth>0;
  });
  await settleBackground(page);
}
try {
  for(const cfg of [
    {width:390,height:844,theme:'light',motion:'no-preference'},
    {width:568,height:256,theme:'dark',motion:'reduce'},
    {width:320,height:740,theme:'light',motion:'reduce'},
    {width:1440,height:900,theme:'dark',motion:'no-preference'},
  ]) {
    const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},reducedMotion:cfg.motion,colorScheme:cfg.theme,hasTouch:cfg.width<1000,isMobile:cfg.width<1000,serviceWorkers:'block'});
    await context.addInitScript(theme=>localStorage.setItem('pref-theme',theme),cfg.theme);
    await context.route('**/.netlify/functions/**',route=>route.fulfill({status:503,body:'{}'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
    await page.goto('http://127.0.0.1:1317/zh/travel/');
    const dialog=page.locator('#tw-qr'),close=dialog.locator('.tw-qr__x'),channels=[];
    assert.equal(await page.locator('.tw-social--qr').count(),2);
    for(const name of ['小红书 / RedNote','微信 / WeChat']) {
      const trigger=page.getByRole('button',{name,exact:true});
      const before=await page.evaluate(()=>({html:document.documentElement.style.overflow,body:document.body.style.overflow}));
      const triggerBox=await center(page,trigger);await opened(page);
      const scrollY=await page.evaluate(()=>window.scrollY);
      assert(await close.evaluate(e=>e===document.activeElement));
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      const geometry=await dialog.evaluate(e=>{
        const img=e.querySelector('.tw-qr__img'),card=e.querySelector('.tw-qr__card'),x=e.querySelector('.tw-qr__x');
        const b=img.getBoundingClientRect(),c=card.getBoundingClientRect(),r=x.getBoundingClientRect(),s=getComputedStyle(img);
        const scale=Math.min(b.width/img.naturalWidth,b.height/img.naturalHeight),paint={width:img.naturalWidth*scale,height:img.naturalHeight*scale};
        paint.x=b.x+(b.width-paint.width)/2;paint.y=b.y+(b.height-paint.height)/2;
        return {card:{x:c.x,y:c.y,width:c.width,height:c.height},image:{x:b.x,y:b.y,width:b.width,height:b.height,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,objectFit:s.objectFit,paint},close:{x:r.x,y:r.y,width:r.width,height:r.height,hit:x.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))},label:e.querySelector('.tw-qr__label').textContent,id:e.querySelector('.tw-qr__id').textContent};
      });
      assert.equal(geometry.label,name);assert(['contain','scale-down'].includes(geometry.image.objectFit)||Math.abs(geometry.image.width/geometry.image.height-geometry.image.naturalWidth/geometry.image.naturalHeight)<.001);
      const c=geometry.card,p=geometry.image.paint,x=geometry.close;
      assert(c.x>=15.9&&c.y>=15.9&&c.x+c.width<=cfg.width-15.9&&c.y+c.height<=cfg.height-15.9,JSON.stringify(geometry));
      assert(p.x>=c.x&&p.y>=c.y&&p.x+p.width<=c.x+c.width+.1&&p.y+p.height<=c.y+c.height+.1);
      assert(!(p.x<x.x+x.width&&p.x+p.width>x.x&&p.y<x.y+x.height&&p.y+p.height>x.y),'Close overlaps poster');
      assert(x.hit&&x.width>=43.9&&x.height>=43.9);
      const focusPath=[];
      for(const key of ['Tab','Tab','Shift+Tab','Shift+Tab']) {await page.keyboard.press(key);assert(await dialog.evaluate(e=>e.contains(document.activeElement)));focusPath.push(await page.evaluate(()=>document.activeElement.className));}
      await page.screenshot({path:`${out}/batch-${batch}-${cfg.width}x${cfg.height}-${cfg.theme}-${name.startsWith('微信')?'wechat':'rednote'}.png`});
      await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(e=>e.open),false);assert(await trigger.evaluate(e=>e===document.activeElement));
      // Immediate native keyboard reopen must survive the previous close event.
      await page.keyboard.press('Enter');await opened(page);assert(await close.evaluate(e=>e===document.activeElement));
      await center(page,close);assert.equal(await dialog.evaluate(e=>e.open),false);assert(await trigger.evaluate(e=>e===document.activeElement));
      assert.deepEqual(await page.evaluate(()=>({html:document.documentElement.style.overflow,body:document.body.style.overflow})),before);
      assert.equal(await page.evaluate(()=>window.scrollY),scrollY);
      channels.push({name,triggerBox,geometry,focusPath,escapeReturn:true,immediateReopen:true,closeReturn:true,overflowRestored:true,scrollPreserved:true});
    }
    const trigger=page.locator('.tw-social--qr').first();await center(page,trigger);await opened(page);
    await page.emulateMedia({reducedMotion:'reduce'});await frames(page);
    const runtime=await dialog.evaluate(e=>({opacity:getComputedStyle(e).opacity,transition:getComputedStyle(e).transitionDuration,transitionProperty:getComputedStyle(e).transitionProperty,cardTransition:getComputedStyle(e.querySelector('.tw-qr__card')).transitionDuration,cardTransitionProperty:getComputedStyle(e.querySelector('.tw-qr__card')).transitionProperty,runningAnimations:e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length,focusInside:e.contains(document.activeElement)}));
    // The existing site-wide reduced-motion rule leaves duration=1e-6s.
    // With transition-property:none it cannot animate; test that semantic.
    assert.equal(runtime.opacity,'1');assert.equal(runtime.transitionProperty,'none');assert.equal(runtime.cardTransitionProperty,'none');assert.equal(runtime.runningAnimations,0);assert(runtime.focusInside);
    await page.mouse.click(4,4);assert.equal(await dialog.evaluate(e=>e.open),false);assert(await trigger.evaluate(e=>e===document.activeElement));
    assert.equal(errors.length,0);observations.push({...cfg,channels,runtimeReduce:runtime,backdropReturn:true,errors});await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
  await page.goto('http://127.0.0.1:1317/travel/');assert.equal(await page.locator('.tw-social--qr').count(),0);
  const englishChannels=await page.locator('.tw-party__links a').evaluateAll(es=>es.map(e=>({label:e.textContent.trim(),href:e.getAttribute('href')})));
  assert.equal(englishChannels.length,4);assert.equal(await page.locator('#tw-qr').evaluate(e=>e.open),false);await context.close();
  await fs.writeFile(`${out}/batch-${batch}-actions.json`,JSON.stringify({source:`batch-${batch}-source.json`,observations,englishActualRoute:{qrTriggers:0,channels:englishChannels},limits:'Actual Chinese Travel coordinate/keyboard journeys in four Chromium viewports. English actual route preserves its four original non-QR channels and is not an English QR journey. Full original posters are displayed; no physical QR scan, real contact, model request, Safari, virtual keyboard or all-state certification.'},null,2)+'\n');
  console.log('E10 four actual Chinese contexts/eight original poster journeys: focus, keyboard loop, immediate reopen, full poster geometry and restored opener/scroll; original English channels retained.');
} finally {await browser.close();}
