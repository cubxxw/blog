import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const base=process.env.WORLD_BASE_URL||'http://localhost:8888';
const evidence=path.resolve(process.env.WORLD_EVIDENCE_DIR||'output/playwright/space-world');await fs.mkdir(evidence,{recursive:true});
// Full Chromium uses the Mac GPU; its headless shell software fallback can
// spend tens of seconds compiling the same scene and distort input timing.
const browser=await chromium.launch({channel:'chromium',args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']});
// This standalone probe owns the six navigable 3D rooms. The new photographic
// default is exercised by space-night-cafe.spec.ts.
const spatialContext=async options=>{const context=await browser.newContext(options);await context.addInitScript(()=>{if(!localStorage.getItem('space:cafe:theme:v2'))localStorage.setItem('space:cafe:theme:v2','zen');});return context;};
const errors=[],checks=[];
const context=await spatialContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage();page.on('pageerror',error=>{errors.push(error.message);console.log('PAGE ERROR',error.message);});
page.on('console',message=>{if(message.type()==='error'||message.text().includes('Space world unavailable'))console.log('BROWSER',message.text());});
const root=page.locator('[data-bear-workspace]');
const ready=p=>p.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.worldReady==='true'&&d.bootState==='complete';});
const mode=(p,value)=>p.waitForFunction(value=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.worldMode===value&&d.worldRenderedMode===value&&d.worldTravel==='false';},value);
const pose=()=>root.getAttribute('data-world-pose').then(JSON.parse);
async function check(name,action){await action();checks.push(name);console.log('PASS',name);}
try {
  await page.goto(base+'/zh/projects/');await ready(page);
  await check('the game entry renders real geometry without a photographic backdrop',async()=>{
    await page.waitForFunction(()=>Number(document.querySelector('[data-bear-workspace]').dataset.worldTriangles)>10000);
    assert.equal(await page.locator('[data-cafe-image]').count(),0);
    assert.equal(await root.getAttribute('data-world-mode'),'roam');
    assert.equal(await page.locator('[data-space-windows]').evaluate(el=>el.inert),true);
    await page.screenshot({path:path.join(evidence,'01-entry.png')});
  });
  await check('entering the room, walking and looking change the actual camera',async()=>{
    await mode(page,'roam');
    const before=await pose();await page.keyboard.down('w');await page.waitForTimeout(600);await page.keyboard.up('w');const after=await pose();
    assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.05);
    await page.mouse.move(780,390);await page.mouse.down();await page.mouse.move(940,405,{steps:8});await page.mouse.up();
    assert.ok(Math.abs((await pose()).yaw-after.yaw)>.2);
    await page.screenshot({path:path.join(evidence,'02-walk.png')});
  });
  await check('six scenes replace actual landscape geometry while retaining the room',async()=>{
    const objectCounts=[];
    for(const id of ['garden','coast','mountain','lake','rain','zen']) {
      await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
      await page.locator(`button[data-cafe-theme="${id}"]`).click();
      await page.waitForFunction(id=>document.querySelector('[data-bear-workspace]').dataset.worldTheme===id,id);
      objectCounts.push(await root.getAttribute('data-world-objects'));
      assert.equal(await page.locator('.space-world__canvas').count(),1);
    }
    assert.ok(new Set(objectCounts).size>3);
  });
  await check('the live workspace is a three-dimensional plane inside the room',async()=>{
    await page.locator('.space-world-hud [data-cafe-enter]').click();await mode(page,'workspace');
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    const plane=page.locator('.space-spatial-screen');
    assert.match(await plane.getAttribute('style'),/matrix3d/);
    assert.equal(await plane.locator('[data-space-windows]').count(),1);
    const bounds=await plane.boundingBox();assert.ok(bounds.width>1000&&bounds.width<1440&&bounds.y>30,JSON.stringify(bounds));
    assert.ok((await pose()).z<2.2,'the visitor physically approaches the computer');
    await page.screenshot({path:path.join(evidence,'03-floating-workspace.png')});
  });
  let note;
  await check('leaving the computer and changing scenery preserve the exact live note editor',async()=>{
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    const editor=page.locator('[data-note-editor]');await editor.fill('LOCAL 3D café — a draft that stays with me.');note=await editor.elementHandle();
    await page.locator('.space-world-hud [data-cafe-visit]').click();await mode(page,'roam');
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await page.locator('[data-cafe-theme="coast"]').click();
    await page.locator('.space-world-hud [data-cafe-enter]').click();await mode(page,'workspace');
    assert.equal(await note.evaluate(el=>el.isConnected&&el===document.querySelector('[data-note-editor]')),true);
    assert.equal(await editor.inputValue(),'LOCAL 3D café — a draft that stays with me.');
    await editor.press('Escape');assert.equal(await root.getAttribute('data-world-mode'),'workspace','Escape during editing preserves focus');
    await page.screenshot({path:path.join(evidence,'04-floating-note.png')});
  });
  await check('language and reload restore the computer, theme and private draft',async()=>{
    await page.locator('[data-space-dock] [data-open="settings"]').click();
    await page.locator('[data-set-language="en"]').click();await page.waitForURL('**/projects/**');await ready(page);await mode(page,'workspace');
    assert.equal(await root.getAttribute('data-world-theme'),'coast');
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    assert.equal(await page.locator('[data-note-editor]').inputValue(),'LOCAL 3D café — a draft that stays with me.');
    await page.reload();await ready(page);await mode(page,'roam');await page.locator('[data-cafe-enter]').click();await mode(page,'workspace');
    assert.equal(await page.locator('[data-note-editor]').inputValue(),'LOCAL 3D café — a draft that stays with me.');
  });
  await check('touch movement and the floating workspace fit a phone',async()=>{
    const phone=await spatialContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const mobile=await phone.newPage();mobile.on('pageerror',error=>errors.push(error.message));
    await mobile.goto(base+'/zh/projects/');await ready(mobile);
    await mode(mobile,'roam');
    const initial=await mobile.locator('[data-bear-workspace]').getAttribute('data-world-pose');
    const control=await mobile.locator('[data-world-walk="forward"]').boundingBox();await mobile.mouse.move(control.x+control.width/2,control.y+control.height/2);await mobile.mouse.down();
    await mobile.waitForTimeout(500);await mobile.mouse.up();
    assert.notEqual(await mobile.locator('[data-bear-workspace]').getAttribute('data-world-pose'),initial);
    await mobile.screenshot({path:path.join(evidence,'05-phone-room.png')});
    await mobile.locator('.space-world-hud [data-cafe-enter]').click();await mode(mobile,'workspace');
    const b=await mobile.locator('.space-spatial-screen').boundingBox();assert.ok(b.x>=0&&b.width<390&&b.y>0&&b.y+b.height<844);
    await mobile.locator('[data-space-menu-trigger]').click();await mobile.locator('.space-menu [data-space-launchpad-trigger]').click();
    await mobile.locator('[data-space-launchpad] [data-launchpad-app="notes"]').click();await mobile.locator('[data-note-editor]').fill('Touch works.');
    await mobile.screenshot({path:path.join(evidence,'06-phone-computer.png')});await phone.close();
  });
  await check('module failure retains a usable ordinary workspace',async()=>{
    const fallback=await spatialContext({viewport:{width:1280,height:800}}),p=await fallback.newPage();
    await p.route('**/world-cafe.*.js',route=>route.abort());
    await p.goto(base+'/zh/projects/');await p.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.worldFailed==='true');
    await p.locator('[data-boot-skip]').click();await p.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    await p.locator('[data-space-dock] [data-open="notes"]').click();await p.locator('[data-note-editor]').fill('Fallback still works.');await fallback.close();
  });
  await check('camera travel is continuous and settles at the desk',async()=>{
    const cinematic=await spatialContext({viewport:{width:1280,height:800}}),p=await cinematic.newPage();
    await p.goto(base+'/zh/projects/');await ready(p);const initial=await p.locator('[data-bear-workspace]').getAttribute('data-world-pose');
    await p.locator('[data-cafe-enter]').click();await p.waitForTimeout(550);
    assert.notEqual(await p.locator('[data-bear-workspace]').getAttribute('data-world-pose'),initial);
    assert.equal(await p.locator('[data-bear-workspace]').getAttribute('data-world-travel'),'true');await mode(p,'workspace');await cinematic.close();
  });
  await check('a lost graphics context releases travel and preserves a usable workspace',async()=>{
    const loss=await spatialContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),p=await loss.newPage();
    await p.goto(base+'/zh/projects/');await ready(p);await mode(p,'roam');
    await p.locator('.space-world__canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await p.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldFailed==='true');
    await p.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    await p.locator('[data-space-dock] [data-open="notes"]').click();await p.locator('[data-note-editor]').fill('My work survives a graphics reset.');
    assert.equal(await p.locator('.space-world').count(),0);await loss.close();
  });
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(evidence,'checks.json'),JSON.stringify({base,checks,errors},null,2));
  console.log(`${checks.length} real browser checks passed.`);
} catch(error){console.log('STATE',await page.evaluate(()=>({url:location.href,data:{...document.querySelector('[data-bear-workspace]')?.dataset}})));await page.screenshot({path:path.join(evidence,'failure.png')});throw error;} finally {await browser.close();}
