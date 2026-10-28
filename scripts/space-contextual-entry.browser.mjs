import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.BEAR_DEV_URL || 'http://127.0.0.1:8899';
const directory=process.env.EVIDENCE_DIR || 'output/playwright/space-contextual-entry';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:process.env.BEAR_BROWSER_CHANNEL || 'chromium',args:['--no-proxy-server',...(process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader'])]});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(45000);
const errors=[],requests=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
const check=async(name,run)=>{await run();checks.push(name);console.log('PASS',name);};
const close=()=>page.locator('[data-space-window="agent"] [data-window-action="close"]').click();
const open=(app,payload)=>page.evaluate(({app,payload})=>window.BearSpace.execute('open',{app,payload}),{app,payload});
const selectArticle=()=>page.locator('[data-reader-body] .post-content p').first().evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});
const send=async()=>{await page.locator('[data-agent-send]').click();await page.locator('[data-agent-task]').last().locator('[data-agent-badge][data-status="completed"]').waitFor();};
try{
  await page.route('**/.netlify/functions/bear-agent',route=>{requests.push(route.request().postDataJSON());return route.fulfill({contentType:'application/json',body:JSON.stringify({message:'已收到这次明确发送的问题。',toolCalls:[]})});});
  await page.goto(`${base}/zh/projects/?profile=about`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.BearSpace&&document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
  await check('Companion is absent from the Dock; Notes remains discoverable',async()=>{
    assert.equal(await page.locator('[data-space-dock] [data-open="agent"]').count(),0);
    assert.equal(await page.locator('[data-space-dock] [data-open="notes"]').count(),1);
  });
  await open('reader','/zh/projects/langgraph/');
  await page.locator('[data-reader-body] .post-content').waitFor();
  await check('legacy reader routes resolve and selection opens a quotation without sending',async()=>{
    assert.equal(await page.evaluate(()=>window.BearSpace.snapshot().windows.find(win=>win.app==='reader').payload),'/zh/lab-notes/langgraph/');
    await selectArticle();await page.locator('[data-reader-explain]').click();
    assert.equal(requests.length,0);assert.equal(await page.locator('[data-agent-context-bar]').isVisible(),true);
    assert.ok((await page.locator('[data-agent-context-quote]').textContent()).length>0);
    await send();assert.match(requests.at(-1).messages.at(-1).content,/Selected text:/);
  });
  await check('removing a quote removes its source and selection from the next request',async()=>{
    await page.locator('[data-agent-context]').click();
    await page.locator('[data-agent-input]').fill('只回答这个问题');await send();
    assert.doesNotMatch(requests.at(-1).messages.at(-1).content,/Reference:|Selected text:/);
  });
  await close();await page.locator('[data-space-dock] [data-open="notes"]').click();
  await page.locator('[data-note-editor]').fill('SECRET_BEFORE selected passage SECRET_AFTER');
  await check('the shortcut never reads a private note as ambient context',async()=>{
    await page.keyboard.press('Control+j');assert.equal(await page.locator('[data-agent-context-bar]').isVisible(),false);
    await page.locator('[data-agent-input]').fill('你好');await send();assert.doesNotMatch(JSON.stringify(requests.at(-1)),/SECRET_|selected passage/);
    await close();
  });
  await check('Notes previews only the chosen passage and waits for explicit send',async()=>{
    const count=requests.length;
    await page.locator('[data-note-editor]').evaluate(el=>{el.focus();el.setSelectionRange(14,30);el.dispatchEvent(new Event('select'));});
    await page.locator('[data-note-ask]').click();assert.equal(requests.length,count);
    assert.equal(await page.locator('[data-agent-context-quote]').textContent(),'selected passage');
    assert.match(await page.locator('[data-agent-context-preview]').textContent(),/发送时/);
    await send();assert.match(requests.at(-1).messages.at(-1).content,/Selected private note:/);
    assert.doesNotMatch(JSON.stringify(requests.at(-1)),/SECRET_/);
    await page.screenshot({path:`${directory}/desktop-note-context.png`});await close();
    assert.equal(await page.locator('[data-note-editor]').evaluate(el=>document.activeElement===el),true);
    await page.locator('[data-note-editor]').evaluate(el=>{el.setSelectionRange(0,0);el.dispatchEvent(new Event('select'));});
    assert.equal(await page.locator('[data-note-ask]').isDisabled(),true);
  });
  await check('focused reading lets the Dock sleep and restores the reading position',async()=>{
    await open('reader','/zh/lab-notes/langgraph/');await page.locator('[data-reader-body] .post-content').waitFor();
    const scroller=page.locator('[data-space-window="reader"] [data-window-body]');
    await scroller.evaluate(el=>{el.scrollTop=200;});const before=await scroller.evaluate(el=>el.scrollTop);
    await page.locator('[data-reader-focus]').click();assert.equal(await page.locator('[data-space-dock]').isVisible(),false);
    await page.screenshot({path:`${directory}/desktop-reading.png`});
    await page.locator('[data-reader-focus]').click();assert.equal(await page.locator('[data-space-dock]').isVisible(),true);
    assert.equal(await scroller.evaluate(el=>el.scrollTop),before);
  });
  await check('product details summon the companion with the selected product',async()=>{
    const product=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent).products[0]);
    await open('products',product.id);const count=requests.length;await page.locator('[data-product-ask]').click();
    assert.equal(requests.length,count);assert.match(await page.locator('[data-agent-context-title]').textContent(),new RegExp(product.name));await close();
    const quote=await page.locator('.space-product > p').nth(2).evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return selection.toString().trim().slice(0,1200);});
    await page.locator('[data-product-explain]').click();assert.equal(requests.length,count);
    assert.equal(await page.locator('[data-agent-context-quote]').textContent(),quote);await close();
  });
  await check('320px Notes and selected reading controls fit in both themes',async()=>{
    await page.setViewportSize({width:320,height:740});
    for(const theme of ['light','dark']){
      await page.evaluate(value=>window.BearSpace.execute('theme',{value}),theme);await open('notes');
      assert.equal(await page.locator('[data-space-dock] [data-open="notes"]').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      for(const selector of ['[data-note-ask]','[data-note-export]']){const box=await page.locator(selector).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=320);}
      await page.screenshot({path:`${directory}/mobile-notes-${theme}.png`});
      await open('reader','/zh/lab-notes/langgraph/');await page.locator('[data-reader-body] .post-content').waitFor();await selectArticle();
      const box=await page.locator('[data-reader-explain]').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=320);
      await page.locator('[data-reader-explain]').click();assert.equal(await page.locator('[data-agent-send]').isVisible(),true);
      for(const selector of ['[data-agent-input]','[data-agent-send]']){const box=await page.locator(selector).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=320,`${selector} fits the viewport: ${JSON.stringify(box)}`);}
      await page.screenshot({path:`${directory}/mobile-quote-${theme}.png`});await close();
    }
  });
  await check('both Lab notes indexes and canonical article routes render without product ambiguity',async()=>{
    for(const prefix of ['/zh','']){
      await page.goto(`${base}${prefix}/lab-notes/`,{waitUntil:'domcontentloaded'});assert.ok(await page.locator('.library-card').count()>0);
      await page.goto(`${base}${prefix}/projects/langgraph/`,{waitUntil:'domcontentloaded'});await page.waitForURL(`**${prefix}/lab-notes/langgraph/`,{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),`${base}${prefix}/lab-notes/langgraph/`);
      assert.match(await page.locator('.breadcrumbs').textContent(),prefix?/深读/:/Lab notes/);
    }
    await page.screenshot({path:`${directory}/lab-notes-article.png`});
  });
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${directory}/checks.json`,JSON.stringify({checks,errors,requests:requests.length},null,2));
}finally{await browser.close();}
