import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chromium',args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),page=await context.newPage();
const base=process.env.WORLD_BASE_URL||'http://localhost:8888',errors=[];
page.on('pageerror',error=>errors.push(error.message));let failed=0;
async function check(name,fn){try{await fn();console.log('PASS',name);}catch(error){failed++;console.log('FAIL',name,error.message);}}
try {
  await check('a hidden Product Lab retains attached app DOM through resize and return',async()=>{
    await page.goto(base+'/zh/projects/#product-lab');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.worldReady==='true');
    assert.equal(await page.locator('[data-bear-workspace] [data-active-label]').count(),1);
    await page.setViewportSize({width:1180,height:820});await page.waitForTimeout(300);
    await page.locator('.product-view-switch [data-product-view-button="bear"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldRenderedMode==='workspace');
    assert.equal(await page.locator('[data-space-menu-trigger]').evaluate(el=>el===document.activeElement),true);
    await page.locator('[data-space-menu-trigger]').click();assert.equal(await page.locator('.space-menu').isVisible(),true);
    assert.deepEqual(errors,[]);
  });
  await check('the companion shortcut accepts actual typing after the camera arrives',async()=>{
    await page.goto(base+'/zh/projects/');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.worldReady==='true');
    await page.locator('[data-cafe-start]').click();await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.worldRenderedMode==='roam');
    await page.keyboard.press('Control+j');await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    await page.keyboard.type('A question that has not been sent.');
    assert.equal(await page.locator('[data-agent-input]').inputValue(),'A question that has not been sent.');
  });
}finally{await browser.close();}
if(failed)process.exitCode=1;
