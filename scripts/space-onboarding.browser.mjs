import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

// Run against one existing Hugo/frozen production server. Evidence is durable;
// this script neither builds the site nor sends a model/backend request.
const base=process.env.WORLD_BASE_URL||'http://127.0.0.1:1317';
const evidence=path.resolve(process.env.WORLD_EVIDENCE_DIR||'output/playwright/space-onboarding');
await fs.mkdir(evidence,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']});
const checks=[],errors=[];
try{
  for(const [name,width,height,mobile] of [['desktop',1440,900,false],['mobile',390,844,true],['narrow',320,740,true],['landscape',568,320,true]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:name==='desktop'?'no-preference':'reduce',...(name==='desktop'&&process.env.SPACE_RECORD_VIDEO==='1'?{recordVideo:{dir:path.join(evidence,'video'),size:{width,height}}}:{})});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/world-cafe.*.js',async route=>{await gate;await route.continue();});
    try{
      await page.goto(base+'/zh/projects/');await page.locator('[data-space-boot]').waitFor();
      assert.equal(await page.locator('[data-boot-skip]').isDisabled(),true);
      await page.screenshot({path:path.join(evidence,`terminal-${name}.png`)});
    }finally{release();}
    await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.bootState==='complete'&&d.catLoaded==='true';});
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-world-rendered-mode'),'roam');
    await page.screenshot({path:path.join(evidence,`room-${name}.png`)});
    const controls=await page.locator('[data-cafe-read],[data-cafe-enter]').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height,hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};}));
    for(const control of controls){assert.ok(control.hit);assert.ok(control.width>=44&&control.height>=44);}
    assert.equal(await page.locator('[data-space-boot]').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    const data=await page.locator('[data-bear-workspace]').evaluate(el=>({...el.dataset}));
    checks.push({name,width,height,controls,data});
    if(name==='desktop'){
      const start=Number(data.worldFrames);await page.waitForTimeout(1800);
      const end=Number(await page.locator('[data-bear-workspace]').getAttribute('data-world-frames'));
      checks[checks.length-1].observedAmbientFps=(end-start)/1.8;
      if(process.env.SPACE_RECORD_VIDEO==='1'){
        await page.waitForTimeout(5200);await page.locator('[data-cafe-read]').click();
        await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.cafeMode==='desktop');
        await page.waitForTimeout(600);await page.locator('.space-world-hud__workspace [data-cafe-visit]').click();
        await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.worldTravel==='false');
        await page.waitForTimeout(500);
      }
    }
    await context.close();console.log('PASS',name,width,height);
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(evidence,'rendered-checks.json'),JSON.stringify({base,checks,errors,note:'Local Chromium observations. Phone emulation is not a physical-device performance measurement.'},null,2));
}finally{await browser.close();}
