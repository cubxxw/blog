import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.BEAR_DEV_URL || 'http://127.0.0.1:8888';
const directory='output/playwright/space-companion';await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
try {
  await page.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
  await page.goto(`${base}/zh/projects/`);await page.waitForFunction(()=>window.BearSpace);
  await check('keyboard opens one compact nonmodal companion and preserves workspace',async()=>{
    await page.keyboard.press('Control+j');await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-space-window="agent"]')).opacity==='1');
    assert.equal(await page.locator('[data-companion-mode="compact"]').count(),1);
    assert.equal(await page.locator('[data-agent-input]').evaluate(el=>document.activeElement===el),true);
    await page.keyboard.press('Control+j');assert.equal(await page.locator('[data-agent-root]').count(),1);
    await page.screenshot({path:`${directory}/desktop-compact.png`});
  });
  await check('voice fallback keeps text input available',async()=>{
    await page.locator('[data-agent-voice]').click();assert.match(await page.locator('[data-agent-status]').textContent(),/不支持语音/);assert.equal(await page.locator('[data-agent-input]').isEditable(),true);
  });
  let requests=[];const endpoint=`${base}/.netlify/functions/bear-agent`;
  await page.route(endpoint,route=>{requests.push(route.request().postDataJSON());return route.fulfill({contentType:'application/json',body:JSON.stringify({message:'CONTEXT_ANSWER：这是根据**公开文章**给出的回答。<img src=x onerror="window.MODEL_HTML_EXECUTED=true">',toolCalls:[]})});});
  await check('public article action pins its source and expands the sidecar',async()=>{
    await page.locator('[data-space-window="agent"] [data-window-action="close"]').click();
    await page.locator('[data-space-dock] [data-open="reader"]').click();await page.locator('[data-library-list] [data-open="reader"]').first().click();
    await page.locator('[data-reader-body] .post-content').waitFor();
    await page.locator('.space-reader-tools > summary').click();await page.locator('[data-reader-ask]').click();assert.match(await page.locator('[data-agent-input]').inputValue(),/总结/);assert.equal(await page.locator('[data-agent-context]').isVisible(),true);
    assert.equal(requests.length,0,'context action prefills and never auto-sends');
    await page.locator('[data-agent-send]').click();await page.locator('[data-agent-answer]').filter({hasText:'CONTEXT_ANSWER'}).waitFor();
    assert.equal(await page.locator('[data-companion-mode="expanded"]').count(),1);assert.ok(requests[0].messages[0].content.includes('Reference:'));
    assert.equal(await page.locator('[data-agent-activity]').last().getAttribute('open'),null);
    await page.screenshot({path:`${directory}/desktop-sidecar.png`});
  });
  await check('answer emphasis renders without executing model HTML',async()=>{
    const answer=page.locator('[data-agent-answer]').filter({hasText:'CONTEXT_ANSWER'});
    assert.equal(await answer.locator('strong').textContent(),'公开文章');
    assert.ok(!(await answer.textContent()).includes('**公开文章**'));
    assert.equal(await answer.locator('img').count(),0);
    assert.equal(await page.evaluate(()=>window.MODEL_HTML_EXECUTED),undefined);
  });
  await check('explicit selection is copied from the public reader only',async()=>{
    await page.locator('[data-space-window="agent"] [data-window-action="close"]').click();
    await page.locator('[data-reader-body]').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.querySelector('p') || el);const selected=window.getSelection();selected.removeAllRanges();selected.addRange(range);});
    await page.locator('.space-reader-tools > summary').click();await page.locator('[data-reader-explain]').waitFor();await page.locator('[data-reader-explain]').click();assert.match(await page.locator('[data-agent-context]').textContent(),/选中文字/);
  });
  await check('removing context also removes the reference and selection from the actual request',async()=>{
    await page.locator('[data-agent-context]').click();await page.locator('[data-agent-send]').click();await page.locator('[data-agent-task]').last().locator('[data-agent-badge][data-status="completed"]').waitFor();
    const latest=requests.at(-1).messages.findLast(message=>message.role==='user');
    assert.ok(!latest.content.includes('Reference:'));assert.ok(!latest.content.includes('Selected text:'));
  });
  await check('private editor is never read as ambient context',async()=>{
    await page.locator('[data-space-window="agent"] [data-window-action="close"]').click();await page.locator('[data-space-dock] [data-open="notes"]').click();await page.locator('[data-note-editor]').fill('PRIVATE_WORKSPACE_SENTINEL');
    await page.keyboard.press('Control+j');assert.equal(await page.locator('[data-agent-context]').isVisible(),false);
    await page.locator('[data-agent-input]').fill('你好');await page.locator('[data-agent-send]').click();await page.locator('[data-agent-badge][data-status="completed"]').last().waitFor();
    assert.ok(!JSON.stringify(requests.at(-1)).includes('PRIVATE_WORKSPACE_SENTINEL'));
  });
  await check('compact and expanded mobile layouts fit at 320 pixels with visible controls',async()=>{
    await page.setViewportSize({width:320,height:700});assert.ok((await page.locator('[data-agent-input]').boundingBox()).width>100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`${directory}/mobile-sidecar.png`});
    await page.locator('[data-space-window="agent"] [data-window-action="close"]').click();await page.locator('[data-space-dock] [data-open="agent"]').click();assert.equal(await page.locator('[data-agent-send]').isVisible(),true);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-space-window="agent"]')).opacity==='1');
    await page.screenshot({path:`${directory}/mobile-compact.png`});
  });
  await page.unroute(endpoint);
  if(process.env.BEAR_LIVE_AI==='1')await check('real DeepSeek tool turn opens the local notes app before answering',async()=>{
    await page.setViewportSize({width:1440,height:900});await page.locator('[data-agent-input]').fill('请打开笔记应用，只做这一件事。完成后简短告诉我。');await page.locator('[data-agent-send]').click();
    await page.locator('[data-agent-task]').last().locator('[data-agent-badge][data-status="completed"]').waitFor({timeout:60000});
    assert.equal(await page.locator('[data-space-window="notes"]').isVisible(),true);assert.ok(await page.locator('[data-agent-task]').last().locator('[data-agent-step="tool"][data-status="ok"]').count());
    await page.screenshot({path:`${directory}/real-deepseek-tool.png`});
  });
  assert.deepEqual(errors,[]);await fs.writeFile(`${directory}/acceptance.json`,JSON.stringify({checks,errors},null,2));
} catch(error) {await page.screenshot({path:`${directory}/failure.png`});await fs.writeFile(`${directory}/failure.json`,JSON.stringify({error:error.message,errors,body:(await page.locator('[data-space-window="agent"]').textContent()).slice(-12000)},null,2));throw error;} finally {await browser.close();}
