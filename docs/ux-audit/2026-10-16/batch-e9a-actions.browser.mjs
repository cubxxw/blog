import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const out = 'docs/ux-audit/2026-10-16/evidence';
const observations = [];
const browser = await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
async function center(page, control, min = 44) {
  await control.scrollIntoViewIfNeeded();
  const target = await control.evaluate(e => {
    const b = e.getBoundingClientRect();
    return {x:b.x,y:b.y,width:b.width,height:b.height,hit:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};
  });
  assert(target.hit, 'Control center must hit its own element');
  assert(target.width >= min-.1 && target.height >= min-.1, `Control below ${min}px: ${JSON.stringify(target)}`);
  await page.mouse.click(target.x+target.width/2,target.y+target.height/2);
  return target;
}
const rgb = s => s.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance = c => c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
try {
  for (const cfg of [
    {width:320,height:740,lang:'zh',theme:'light',coarse:true},
    {width:390,height:844,lang:'en',theme:'dark',coarse:true},
    {width:844,height:390,lang:'en',theme:'light',coarse:true},
    {width:1440,height:900,lang:'zh',theme:'light',coarse:false},
  ]) {
    const context = await browser.newContext({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.coarse,isMobile:cfg.coarse,reducedMotion:'reduce',serviceWorkers:'block'});
    const page = await context.newPage(), errors = [], external = [];
    page.setDefaultTimeout(12000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
    await page.goto(`http://127.0.0.1:1317${cfg.lang==='zh'?'/zh':''}/projects/?profile=about`);
    await page.waitForFunction(()=>{
      const d=document.querySelector('[data-bear-workspace]')?.dataset;
      return d?.cafeMode==='desktop' && Number(d.worldFrames)>0 && d.bootState==='complete';
    });
    if(cfg.theme==='dark') { await page.evaluate(()=>window.BearSpace.execute('theme',{value:'dark'})); assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-theme'),'dark'); }
    async function open(name) {
      await page.locator('[data-space-menu-trigger]').click();
      await page.locator('.space-menu [data-space-launchpad-trigger]').click();
      await page.locator(`[data-launchpad-app="${name}"]`).click();
      return page.locator(`[data-space-window="${name}"]`);
    }
    const note = await open('notes'), editor = note.locator('[data-note-editor]');
    const noteNode = await editor.elementHandle(), draft='E9a isolated note — keep original node';
    await editor.fill(draft);
    const win = await open('products');
    await win.locator('[data-window-action="maximize"]').click();
    const body=win.locator('[data-window-body]'), picker=win.locator('[data-product-select]');
    const options=await picker.locator('option').evaluateAll(ns=>ns.map(e=>({id:e.value,name:e.textContent.trim()})));
    assert.equal(options.length,7);
    const catalog=await page.locator('[data-space-catalog]').evaluate(e=>JSON.parse(e.textContent));
    const compact=await picker.isVisible(), selections=[];
    const tag=`${cfg.width}-${cfg.lang}-${cfg.theme}`;
    for(let i=0;i<options.length;i++) {
      const option=options[i];
      if(compact) {
        // selectOption isolates the native change contract; not a physical picker gesture claim.
        await picker.focus();
        await picker.selectOption(option.id);
      } else {
        await center(page,win.locator(`[data-select-product="${option.id}"]`));
      }
      await page.waitForFunction(id=>window.BearSpace.snapshot().windows.find(w=>w.id==='products')?.payload===id,option.id);
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      assert.equal(await win.locator('.space-product h2').textContent(),option.name);
      const shot=win.locator('.space-product__shot');
      if(await shot.count()) { await shot.scrollIntoViewIfNeeded(); await page.waitForFunction(()=>{const e=document.querySelector('[data-space-window="products"] .space-product__shot');return !e || e.complete&&e.naturalWidth>0;}); }
      assert(await win.locator(compact?'[data-product-select]':`[data-select-product="${option.id}"]`).evaluate(e=>e===document.activeElement));
      const product=catalog.products.find(p=>p.id===option.id);
      const expectedLinks=[product.url,product.demo,product.github].filter(v=>typeof v==='string'&&v.trim()).map(v=>new URL(v,page.url()).href);
      assert.deepEqual(await win.locator('.space-product__links a').evaluateAll(ns=>ns.map(e=>e.href)),expectedLinks);
      const target=win.locator('.space-product__links a').first();
      assert(await target.count());
      await target.scrollIntoViewIfNeeded();
      const link=await target.evaluate(e=>{
        const b=e.getBoundingClientRect();
        return {href:e.href,label:e.textContent.trim(),width:b.width,height:b.height,hit:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};
      });
      assert(link.hit && link.width>=44-.1 && link.height>=44-.1);
      assert(/^https?:/.test(link.href));
      const metrics=await body.evaluate(e=>{
        const f=e.getBoundingClientRect().width/e.offsetWidth,p=e.querySelector('.space-product>p:not(.space-product__stage)');
        return {bodyWidth:e.clientWidth,scrollWidth:e.scrollWidth,projectedBodyFont:parseFloat(getComputedStyle(p).fontSize)*f};
      });
      assert(metrics.scrollWidth<=metrics.bodyWidth+1);
      selections.push({option,link,metrics,focusAfterTwoFrames:true,method:compact?'focus + native select change contract':'actual coordinate directory choice'});
      if(i===0||i===options.length-1) {
        await body.evaluate(e=>e.scrollTop=0);
        await page.mouse.move(0,0);
        await page.screenshot({path:`${out}/batch-e9a-products-${tag}-${i===0?'first':'last'}.png`});
      }
    }
    // One real primary link action is intercepted locally, before any external request.
    await context.route('**/*',r=>{
      const u=new URL(r.request().url());
      if(r.request().isNavigationRequest() && u.host!=='127.0.0.1:1317') { external.push(u.href);return r.fulfill({status:200,contentType:'text/plain',body:'Local E9a external navigation interception'}); }
      return r.fallback();
    });
    const popupPromise=page.waitForEvent('popup');
    const externalTarget=await center(page,win.locator('.space-product__links a').first());
    const popup=await popupPromise;await popup.waitForLoadState();await popup.close();assert.equal(external.length,1);
    const explore=win.locator('.space-product-explore [data-open="books"]');
    const exploreTarget=await center(page,explore);
    const books=page.locator('[data-space-window="books"]');
    await books.locator('[data-window-action="maximize"]').click();
    const bookBody=books.locator('[data-window-body]'), covers=books.locator('.space-book__cover');
    assert.equal(await covers.count(),4);
    const coverData=await covers.evaluateAll(ns=>ns.map(e=>({background:getComputedStyle(e).backgroundColor,coverOpacity:Number(getComputedStyle(e).opacity),coverFilter:getComputedStyle(e).filter,text:[...e.querySelectorAll('small,strong')].map(t=>({text:t.textContent,fontSize:getComputedStyle(t).fontSize,color:getComputedStyle(t).color,opacity:Number(getComputedStyle(t).opacity)}))})));
    for(const cover of coverData) {
      assert.equal(cover.coverOpacity,1);assert.equal(cover.coverFilter,'none');const bg=rgb(cover.background);
      for(const t of cover.text) {const effective=rgb(t.color).map((v,i)=>v*t.opacity+bg[i]*(1-t.opacity)),a=luminance(effective),b=luminance(bg);t.contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(t.contrast>=4.5,`${t.text} contrast=${t.contrast}`);}
    }
    await page.screenshot({path:`${out}/batch-e9a-books-${tag}-top.png`});
    const bookLinks=[];
    for(const item of await books.locator('.space-book').all()) {
      const title=(await item.locator('strong').textContent()).trim(),link=item.locator('a');
      await link.scrollIntoViewIfNeeded();
      const data=await link.evaluate(e=>{const b=e.getBoundingClientRect();return{href:e.href,label:e.textContent.trim(),width:b.width,height:b.height,hit:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};});
      assert(data.label.includes(title));assert(data.hit&&data.width>=44-.1&&data.height>=44-.1);bookLinks.push({title,...data});
    }
    await page.screenshot({path:`${out}/batch-e9a-books-${tag}-bottom.png`});
    assert(await editor.evaluate((e,n)=>e===n,noteNode));assert.equal(await editor.inputValue(),draft);
    assert.equal(errors.length,0);
    observations.push({...cfg,source:'batch-e9a1-source.json',compact,selections,external:{count:external.length,href:external[0],target:externalTarget,network:'intercepted local response before external request'},exploreTarget,covers:coverData,bookLinks,notes:{sameDOM:true,valuePreserved:true},errors});
    await context.close();
  }
  await fs.writeFile(`${out}/batch-e9a-actions.json`,JSON.stringify({observations,limits:'Four isolated Chromium Metal contexts, reduced animation, simulated coarse viewports; picker change is selectOption, not physical OS picker/IME/Tab certification. No real backend/external service/contact/model request. Ratios use computed solid CSS RGB and text opacity; not full-page contrast certification. No browser zoom, Safari or physical phone claim.'},null,2)+'\n');
  console.log('E9a four actual contexts: all seven choices, stable delayed focus, primary link interception, book explore, twelve cover contrasts, four named reading targets, notes DOM/value retained.');
} finally {await browser.close();}
