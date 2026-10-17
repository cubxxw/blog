import fs from 'node:fs/promises';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{chromium}from'playwright';
const out='docs/ux-audit/2026-10-16/evidence',observations=[];
const palettes={light:{dawn:[111,166,157],dusk:[113,140,155],forest:[151,170,143]},dark:{dawn:[41,76,71],dusk:[48,67,79],forest:[60,76,57]}};
const browser=await chromium.launch({channel:'chromium',args:['--enable-gpu','--use-angle=metal']});
async function center(page,control,min=44){await control.scrollIntoViewIfNeeded();const b=await control.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert(b.hit&&b.width>=min-.1&&b.height>=min-.1);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);return b;}
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try {for(const cfg of[{width:1440,height:900,lang:'zh',coarse:false},{width:390,height:844,lang:'en',coarse:true}]){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.coarse,isMobile:cfg.coarse,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);await context.route('**/.netlify/functions/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.goto(`http://127.0.0.1:1317${cfg.lang==='zh'?'/zh':''}/projects/?profile=about`);await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.cafeMode==='desktop'&&Number(d.worldFrames)>0&&!d.worldLoading&&d.bootState==='complete';});
 async function open(app){await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();await page.locator(`[data-launchpad-app="${app}"]`).click();return page.locator(`[data-space-window="${app}"]`);}
 const notes=await open('notes'),note=notes.locator('[data-note-editor]'),noteNode=await note.elementHandle(),noteText='E9c isolated note — 原节点';await note.fill(noteText);
 const contact=await open('contact'),draft=contact.locator('[data-message-draft]'),draftNode=await draft.elementHandle(),draftText='E9c synthetic draft stays put.';await draft.fill(draftText);
 await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-show-desktop]').click();assert.equal(await page.locator('[data-space-window]:visible').count(),0);
 const settings=await open('settings'),screen=page.locator('.space-spatial-screen'),originalButton=await settings.locator('[data-set-wallpaper="dawn"]').elementHandle(),colors=[];
 async function appearance(){return page.evaluate(()=>({paper:getComputedStyle(document.querySelector('[data-note-editor]')).backgroundColor,draft:getComputedStyle(document.querySelector('[data-message-draft]')).backgroundColor,window:getComputedStyle(document.querySelector('[data-space-window="settings"]')).backgroundColor,chrome:getComputedStyle(document.querySelector('[data-space-window="settings"] .space-window__bar')).backgroundColor}));}
 for(const theme of ['light','dark']){
  await center(page,settings.locator(`[data-set-theme="${theme}"]`));await frames(page);const before=await appearance();
  for(const wallpaper of ['dawn','dusk','forest']){
   const choice=settings.locator(`[data-set-wallpaper="${wallpaper}"]`),target=await center(page,choice);await frames(page);
   assert(await choice.evaluate(e=>e===document.activeElement));assert.equal(await choice.getAttribute('aria-pressed'),'true');assert(await settings.locator('[data-set-wallpaper="dawn"]').evaluate((e,n)=>e===n,originalButton));assert.deepEqual(await appearance(),before);
   const stored=await page.evaluate(()=>({state:window.BearSpace.snapshot().wallpaper,stored:JSON.parse(localStorage.getItem('bear-space:v1')).wallpaper}));assert.deepEqual(stored,{state:wallpaper,stored:wallpaper});
   await center(page,settings.locator('[data-window-action="minimize"]'),cfg.coarse?44:24);assert.equal(await page.locator('[data-space-window]:visible').count(),0);await page.mouse.move(0,0);
   const exposed=await screen.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height*.3)===e;});assert(exposed);
   const computed=await screen.evaluate(e=>({background:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage,opacity:getComputedStyle(e).opacity}));assert.equal(computed.background,`rgb(${palettes[theme][wallpaper].join(', ')})`);assert.equal(computed.image,'none');assert.equal(computed.opacity,'1');
   const name=`batch-e9c-${cfg.width}-${cfg.lang}-${theme}-${wallpaper}`,png=await screen.screenshot({path:`${out}/${name}-monitor.png`});
   const sample=await page.evaluate(async base64=>{const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const x=Math.floor(canvas.width/2),y=Math.floor(canvas.height*.3);return{x,y,width:canvas.width,height:canvas.height,rgba:[...ctx.getImageData(x,y,1,1).data]};},png.toString('base64'));
   assert.deepEqual(sample.rgba,[...palettes[theme][wallpaper],255]);
   if(wallpaper==='forest')await page.screenshot({path:`${out}/${name}-scene.png`});
   colors.push({theme,wallpaper,target,stored,exposed,computed,appearance:before,sample,pngSHA256:createHash('sha256').update(png).digest('hex'),monitorImage:`${name}-monitor.png`});await open('settings');
  }
 }
 assert.equal(new Set(colors.map(c=>c.computed.background)).size,6);
 await open('contact');assert(await draft.evaluate((e,n)=>e===n,draftNode));assert.equal(await draft.inputValue(),draftText);await draft.press('End');await draft.pressSequentially(' Continued.');assert.equal(await draft.inputValue(),draftText+' Continued.');await contact.locator('[data-window-body]').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`${out}/batch-e9c-${cfg.width}-${cfg.lang}-neutral-document.png`});
 assert(await note.evaluate((e,n)=>e===n,noteNode));assert.equal(await note.inputValue(),noteText);assert.equal(errors.length,0);
 observations.push({...cfg,source:'batch-e9c-source.json',motion:'reduce',colors,notes:{sameDOM:true,valuePreserved:true},contact:{sameDOM:true,valuePreserved:true,continued:true},errors});await context.close();
}await fs.writeFile(`${out}/batch-e9c-actions.json`,JSON.stringify({observations,limits:'Two actual Chromium Metal contexts, reduced animation, simulated phone. Each selected palette is sampled at one unobstructed background pixel in the lossless screenshot decoded through Canvas2D; this is not whole-page contrast, display calibration, physical-device, FPS, Safari, or all-state certification. No paid AI/contact/backend calls.'},null,2)+'\n');console.log('E9c two actual contexts, twelve wallpaper selections: visible screenshot pixels exactly match all six existing palettes; original controls/documents and drafts retained.');}finally{await browser.close();}
