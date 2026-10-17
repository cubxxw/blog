import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const out='docs/ux-audit/2026-10-16/evidence',observations=[];
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
async function clickCenter(page,control,min=44) {
  await control.scrollIntoViewIfNeeded();
  const box=await control.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  assert(box.hit && box.width>=min-.1 && box.height>=min-.1,JSON.stringify(box));
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  return box;
}
const twoFrames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try {
  for(const cfg of [{width:320,height:740,lang:'zh',coarse:true},{width:390,height:844,lang:'en',coarse:true},{width:844,height:390,lang:'en',coarse:true},{width:1440,height:900,lang:'zh',coarse:false}]) {
    const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.coarse,isMobile:cfg.coarse,reducedMotion:'reduce',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],clicks=[],preferenceTargets=[];let runtimeRequests=0,release;
    const runtimeGate=new Promise(resolve=>{release=resolve;});
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/.netlify/functions/bear-runtime'&&route.request().method()==='GET') {runtimeRequests++;await runtimeGate;return route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'});}
      if(url.pathname.startsWith('/.netlify/functions/'))return route.fulfill({status:503,body:'{}'});
      if(url.origin!=='http://127.0.0.1:1317')return route.fulfill({status:200,body:''});
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:1317${cfg.lang==='zh'?'/zh':''}/projects/?profile=about`);
    await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.cafeMode==='desktop'&&Number(d.worldFrames)>0&&d.bootState==='complete';});
    async function open(app) {await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();await page.locator(`[data-launchpad-app="${app}"]`).click();return page.locator(`[data-space-window="${app}"]`);}
    const tag=`${cfg.width}-${cfg.lang}`,catalog=await page.locator('[data-space-catalog]').evaluate(e=>JSON.parse(e.textContent));
    const notes=await open('notes'),note=notes.locator('[data-note-editor]'),noteNode=await note.elementHandle();await note.fill('E9b isolated note — keep this node');
    const contact=await open('contact');await contact.locator('[data-window-action="maximize"]').click();
    const draft=contact.locator('[data-message-draft]'),draftNode=await draft.elementHandle(),draftText='E9b synthetic draft — 邮件 & GitHub? #one\nsecond line';await draft.fill(draftText);
    const settings=await open('settings');await settings.locator('[data-window-action="maximize"]').click();
    const status=settings.locator('[data-runtime-status]'),statusNode=await status.elementHandle();
    await page.waitForFunction(()=>document.querySelector('[data-runtime-status]')?.textContent.match(/检查|Checking/));
    const originalDark=await settings.locator('[data-set-theme="dark"]').elementHandle();
    for(const [kind,value] of [['theme','dark'],['wallpaper','forest'],['theme','light'],['wallpaper','dusk'],['theme','dark']]) {
      const choice=settings.locator(`[data-set-${kind}="${value}"]`);preferenceTargets.push({kind,value,...await clickCenter(page,choice)});
      await twoFrames(page);assert(await choice.evaluate(e=>e===document.activeElement));
      assert.equal(await choice.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(k=>window.BearSpace.snapshot()[k],kind),value);
      assert(await status.evaluate((e,n)=>e===n,statusNode));assert.equal(runtimeRequests,1);
    }
    assert(await settings.locator('[data-set-theme="dark"]').evaluate((e,n)=>e===n,originalDark));
    await status.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/batch-e9b-settings-${tag}-pending.png`});
    release();await page.waitForFunction(()=>document.querySelector('[data-runtime-status]')?.textContent.match(/未连接|Disconnected/));
    assert(await status.evaluate((e,n)=>e===n,statusNode));assert.equal(runtimeRequests,1);
    const runtimeStatus=await status.textContent();
    const settingsBody=settings.locator('[data-window-body]');await settingsBody.evaluate(e=>e.scrollTop=0);
    await page.mouse.move(0,0);await page.screenshot({path:`${out}/batch-e9b-settings-${tag}-top.png`});
    await settingsBody.evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:`${out}/batch-e9b-settings-${tag}-bottom.png`});
    await open('contact');assert(await draft.evaluate((e,n)=>e===n,draftNode));assert.equal(await draft.inputValue(),draftText);
    await draft.focus();await page.evaluate(()=>{window.BearSpace.execute('theme',{value:'light'});window.BearSpace.execute('wallpaper',{value:'dawn'});});await twoFrames(page);
    assert(await draft.evaluate(e=>e===document.activeElement));assert.equal(await settings.locator('[data-set-theme="light"]').getAttribute('aria-pressed'),'true');assert.equal(await settings.locator('[data-set-wallpaper="dawn"]').getAttribute('aria-pressed'),'true');
    assert.equal(runtimeRequests,1);assert(await status.evaluate((e,n)=>e===n,statusNode));
    await draft.press('End');await draft.press('ControlOrMeta+End');await draft.pressSequentially(' continued');const finalDraft=await draft.inputValue();assert.equal(finalDraft,draftText+' continued');
    await page.evaluate(()=>{window.__e9ContactClicks=[];document.addEventListener('click',event=>{const a=event.target.closest('.space-contact a');if(a){event.preventDefault();window.__e9ContactClicks.push({href:a.href,label:a.textContent.trim()});}},true);});
    const channels=contact.locator('.space-contact-links a'),channelKeys=['github','x','zhihu','linkedin','bilibili','youtube','instagram','polarsteps'];assert.equal(await channels.count(),8);
    for(let i=0;i<8;i++) {assert.equal(await channels.nth(i).getAttribute('href'),new URL(catalog.links[channelKeys[i]],page.url()).href);await clickCenter(page,channels.nth(i));}
    const mail=contact.locator('[data-contact-email]'),github=contact.locator('[data-contact-github]'),whatsapp=contact.locator('.space-contact__actions a').last();
    const mailURL=new URL(await mail.getAttribute('href')),githubURL=new URL(await github.getAttribute('href'));
    assert.equal(mailURL.pathname,catalog.links.email);assert.equal(mailURL.searchParams.get('body'),finalDraft);assert.equal(githubURL.searchParams.get('body'),finalDraft);assert.equal(await whatsapp.getAttribute('href'),new URL(catalog.links.whatsapp,page.url()).href);
    for(const target of [mail,github,whatsapp])await clickCenter(page,target);
    clicks.push(...await page.evaluate(()=>window.__e9ContactClicks));assert.equal(clicks.length,11);
    const contactBody=contact.locator('[data-window-body]');await contactBody.evaluate(e=>e.scrollTop=0);await page.mouse.move(0,0);await page.screenshot({path:`${out}/batch-e9b-contact-${tag}-top.png`});
    await contactBody.evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:`${out}/batch-e9b-contact-${tag}-bottom.png`});
    const type=await draft.evaluate(e=>({computed:getComputedStyle(e).fontSize,viewportCSSpx:parseFloat(getComputedStyle(e).fontSize)*e.getBoundingClientRect().width/e.offsetWidth}));assert(type.viewportCSSpx>=16);
    const fits=await contactBody.evaluate(e=>e.scrollWidth<=e.clientWidth+1);assert(fits);
    await clickCenter(page,contact.locator('[data-window-action="minimize"]'),cfg.coarse?44:24);await open('contact');assert(await draft.evaluate((e,n)=>e===n,draftNode));assert.equal(await draft.inputValue(),finalDraft);
    assert(await note.evaluate((e,n)=>e===n,noteNode));assert.equal(await note.inputValue(),'E9b isolated note — keep this node');assert.equal(errors.length,0);
    observations.push({...cfg,source:'batch-e9b-source.json',motion:'reduce',preferenceTargets,runtime:{requests:runtimeRequests,status:runtimeStatus,sameLabel:true},preferences:{sameButton:true,clickFocusRetained:true,toolSyncWhileDraftFocused:true},contact:{channels:8,interceptedActualClicks:clicks,textarea:type,sameDOM:true,draftPreserved:true,minimizeReopen:true,horizontalFit:fits},notes:{sameDOM:true,valuePreserved:true},errors});
    await context.close();
  }
  await fs.writeFile(`${out}/batch-e9b-actions.json`,JSON.stringify({observations,limits:'Four isolated Chromium Metal contexts, reduced animation, simulated touch viewports. Programmatic public tool updates explicitly separated from actual coordinate choices. Eleven real contact anchor clicks/context prevented at capture; no mail/contact/share/model submission. Runtime GET is a delayed local stub, not a real backend connection. No full Tab/OSIME/Safari/zoom/physical-device/FPS certification.'},null,2)+'\n');
  console.log('E9b four contexts: same-node preferences/focus/pending runtime, external tool aria without draft focus theft, eleven intercepted channel actions, encoded draft/notes and minimize continuity.');
} finally {await browser.close();}
