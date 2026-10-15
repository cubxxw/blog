import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chromium',args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),page=await context.newPage();
const base=process.env.WORLD_BASE_URL||'http://localhost:8888',errors=[];
page.on('pageerror',error=>errors.push(error.message));let failed=0;
async function check(name,fn){try{await fn();console.log('PASS',name);}catch(error){failed++;console.log('FAIL',name,error.message);}}
try {
  await check('a hidden Product Lab retains attached app DOM through resize and return',async()=>{
    await page.goto(base+'/zh/projects/#product-lab');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.ready==='true');
    assert.equal(await page.locator('[data-bear-workspace] [data-active-label]').count(),1);
    await page.setViewportSize({width:1180,height:820});await page.waitForTimeout(300);
    await page.locator('.product-view-switch [data-product-view-button="bear"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldRenderedMode==='workspace');
    assert.equal(await page.locator('[data-space-menu-trigger]').evaluate(el=>el===document.activeElement),true);
    await page.locator('[data-space-menu-trigger]').click();assert.equal(await page.locator('.space-menu').isVisible(),true);
    assert.deepEqual(errors,[]);
  });
  await check('the companion shortcut accepts actual typing after the camera arrives',async()=>{
    await page.goto(base+'/zh/projects/');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.bootState==='complete');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldRenderedMode==='roam');
    await page.keyboard.press('Control+j');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    await page.keyboard.type('A question that has not been sent.');
    assert.equal(await page.locator('[data-agent-input]').inputValue(),'A question that has not been sent.');
  });
  await check('an idle computer stops GPU drawing and resumes for a scene change or walking',async()=>{
    const root=page.locator('[data-bear-workspace]');
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldTravel==='false');
    await page.waitForTimeout(100);const frames=Number(await root.getAttribute('data-world-frames'));
    await page.waitForTimeout(350);assert.equal(Number(await root.getAttribute('data-world-frames')),frames);
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForTimeout(150);
    assert.equal(Number(await root.getAttribute('data-world-frames')),frames+1,'one resume queues only one paint');
    await page.locator('.space-world-hud [data-cafe-picker]').click();await page.locator('[data-cafe-theme="lake"]').click();
    await page.waitForFunction(frames=>Number(document.querySelector('[data-bear-workspace]').dataset.worldFrames)>frames,frames+1);
    await page.locator('.space-world-hud [data-cafe-visit]').click();await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldRenderedMode==='roam');
    const before=await root.getAttribute('data-world-pose');await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
    assert.notEqual(await root.getAttribute('data-world-pose'),before);
  });
  await check('focus and article scrolling cannot move the camera viewport',async()=>{
    await page.goto(base+'/zh/projects/?profile=about#identity');
    await page.waitForFunction(()=>Number(document.querySelector('[data-bear-workspace]').dataset.worldFrames)>0);
    await page.locator('[data-space-dock] [data-open="reader"]').click();
    const positions=()=>page.locator('.space-world,.space-world__css,.space-spatial-screen').evaluateAll(nodes=>nodes.map(node=>[node.scrollLeft,node.scrollTop]));
    assert.deepEqual(await positions(),[[0,0],[0,0],[0,0]]);
    await page.locator('[data-library-list] [data-open="reader"]').first().click();
    await page.locator('[data-reader-body] .post-content').waitFor();
    const body=page.locator('[data-space-window="reader"] .space-window__body'),before=await body.evaluate(node=>node.scrollTop);
    await body.hover();await page.mouse.wheel(0,600);
    await page.waitForFunction(before=>document.querySelector('[data-space-window="reader"] .space-window__body').scrollTop>before,before);
    assert.deepEqual(await positions(),[[0,0],[0,0],[0,0]]);
  });
}finally{await browser.close();}
if(failed)process.exitCode=1;
