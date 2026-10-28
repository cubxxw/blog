import { enterWorkspace } from './space-browser-entry.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createOutputServer } from './serve-site-output.mjs';

const directory = path.resolve(process.env.BEAR_EVIDENCE_DIR || 'output/playwright/space-classic-workspace');
await fs.mkdir(directory, { recursive: true });
const server = createOutputServer({ publicDir: path.resolve(process.env.SITE_PUBLIC_DIR || 'public') });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.BEAR_DEV_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Keep acceptance independent of third-party analytics/font availability.
await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [];
async function check(name, fn) {
  try { await fn(); checks.push(name); console.log('PASS', name); }
  catch (error) {
    await fs.writeFile(path.join(directory,'failure.json'), JSON.stringify({name,error:error.message,errors,body:(await page.locator('body').innerText()).slice(-10000)},null,2));
    await page.screenshot({path:path.join(directory,'failure.png')});
    throw error;
  }
}
async function openApp(app) {
  const dock = page.locator(`[data-space-dock] [data-open="${app}"]`);
  if (await dock.isVisible()) await dock.click();
  else { await page.locator('[data-space-menu-trigger]').click(); await page.locator('.space-menu [data-space-launchpad-trigger]').click(); await page.locator(`[data-launchpad-app="${app}"]`).click(); }
}
try {
  await page.goto(`${base}/zh/projects/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('[data-bear-workspace]').count(), 1, 'BEAR must provide an interactive desktop');
  await page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
  await check('café opens the real desktop and its Dock apps', async () => {
    await enterWorkspace(page);
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    assert.equal(await page.locator('[data-space-window]').count(), 1);
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    await page.locator('[data-space-window="notes"]').waitFor();
    assert.equal(await page.locator('[data-space-window="notes"]').count(), 1);
  });
  await check('private writing survives a page reload', async () => {
    await page.locator('[data-note-editor]').fill('测试笔记：明天继续探索 Agent。');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
    assert.equal(await page.locator('[data-note-editor]').inputValue(), '测试笔记：明天继续探索 Agent。');
  });
  await check('minimize and dock restore the same window', async () => {
    await page.locator('[data-space-window="notes"] [data-window-action="minimize"]').click();
    assert.equal(await page.locator('[data-space-window="notes"]').isVisible(), false);
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    assert.equal(await page.locator('[data-space-window="notes"]').isVisible(), true);
  });
  await check('CLI calls the same workspace open operation', async () => {
    await openApp('terminal');
    await page.locator('[data-terminal-input]').fill('open books');
    await page.locator('[data-terminal-input]').press('Enter');
    assert.equal(await page.locator('[data-space-window="books"]').isVisible(), true);
  });
  await check('window drag and resize alter real geometry', async () => {
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    const win = page.locator('[data-space-window="notes"]');
    const before = await win.boundingBox();
    const bar = await win.locator('[data-window-drag]').boundingBox();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + 20);
    await page.mouse.down(); await page.mouse.move(bar.x + bar.width / 2 + 80, bar.y + 50, { steps: 10 }); await page.mouse.up();
    const moved = await win.boundingBox();
    assert.ok(Math.abs(moved.x - before.x) > 20);
    const handle = await win.locator('[data-window-resize="se"]').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down(); await page.mouse.move(handle.x + 65, handle.y + 45, { steps: 8 }); await page.mouse.up();
    assert.ok((await win.boundingBox()).width > moved.width + 20);
  });
  await check('keyboard focus activates the window it enters', async () => {
    await page.locator('[data-space-dock] [data-open="photos"]').click();
    await page.locator('[data-note-export]').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('[data-note-editor]').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>window.BearSpace.snapshot().active),'notes');
  });
  await check('search opens a real article inside the reader', async () => {
    await page.locator('[data-space-menu-trigger]').click(); await page.locator('.space-menu [data-space-search-trigger]').click();
    await page.locator('[data-space-search-input]').fill('Agent');
    const article = page.locator('[data-search-kind="article"]').first();
    assert.ok(await article.count()); await article.click();
    await page.locator('[data-reader-body] .post-content').waitFor({ timeout: 15000 });
    assert.ok((await page.locator('[data-reader-body]').innerText()).length > 100);
    const links=await page.locator('[data-reader-body] a[href]').count();
    assert.ok(links>3,'article reader must keep internal article links');
  });
  await check('leaving a pending article does not overwrite its library', async () => {
    await page.locator('[data-space-window="reader"] [data-open="reader"]').click();
    const first = page.locator('[data-library-list] [data-open="reader"]').first();
    const url = await first.getAttribute('data-payload');
    const matcher = `${base}${url}`;
    let requested;
    const requestSeen = new Promise(resolve => { requested = resolve; });
    await page.route(matcher, async route => {
      requested();
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.fulfill({ contentType:'text/html', body:'<div class="post-content">Delayed test article</div>' }).catch(()=>{});
    });
    await first.click(); await requestSeen;
    await page.locator('[data-space-window="reader"] [data-open="reader"]').click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-library-list]').isVisible(), true);
    await page.unroute(matcher);
    assert.deepEqual(errors, [], 'a cancelled reader must not mutate a later screen');
  });
  await check('Product Lab switches back to the OS', async () => {
    if (await page.locator('[data-bear-workspace]').isVisible()) await page.locator('[data-space-menu-trigger]').click();
    await page.locator('[data-product-view-button="lab"]:visible').click();
    assert.equal(await page.locator('[data-product-panel="lab"]').isVisible(), true);
    await page.locator('[data-product-view-button="bear"]').click();
    assert.equal(await page.locator('[data-bear-workspace]').isVisible(), true);
  });
  await check('Product Lab control exits its knowledge graph to the product catalog', async () => {
    if (await page.locator('[data-bear-workspace]').isVisible()) await page.locator('[data-space-menu-trigger]').click();
    await page.locator('[data-product-view-button="lab"]:visible').click();
    await page.locator('[data-bks-enter]').click();
    assert.equal(await page.locator('.builds-main').isVisible(),false);
    if (await page.locator('[data-bear-workspace]').isVisible()) await page.locator('[data-space-menu-trigger]').click();
    await page.locator('[data-product-view-button="lab"]:visible').click();
    assert.equal(await page.locator('.builds-main').isVisible(),true);
    await page.locator('[data-product-view-button="bear"]').click();
  });
  await check('a real travel photo opens its matching map region', async () => {
    await page.locator('[data-space-dock] [data-open="photos"]').click();
    if (await page.locator('[data-photo-back]').isVisible()) await page.locator('[data-photo-back]').click();
    await page.locator('[data-photo-select]').first().click();
    const mapLink=page.locator('.sp-photo-detail figcaption [data-media-open="map"]');
    const region=await mapLink.getAttribute('data-media-payload');
    await mapLink.click();
    assert.equal(await page.evaluate(()=>window.BearSpace.snapshot().windows.find(w=>w.app==='map').payload),region);
    assert.ok(await page.locator('.sp-place-photos img').count());
  });
  await check('private notes export their real text', async () => {
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    const download=page.waitForEvent('download');
    await page.locator('[data-note-export]').click();
    const file=await download;
    assert.equal(await fs.readFile(await file.path(),'utf8'),'测试笔记：明天继续探索 Agent。');
  });
  await check('geographic map zoom, keyboard pan and reset update its real view', async () => {
    await openApp('map');
    const map=page.locator('[data-media-map]');
    const before=await map.getAttribute('viewBox');
    await page.locator('[data-map-zoom="in"]').click();
    assert.notEqual(await map.getAttribute('viewBox'),before);
    const zoomed=await map.getAttribute('viewBox');
    await page.locator('[data-map-viewport]').focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await map.getAttribute('viewBox'),zoomed);
    await page.locator('[data-map-reset]').click();
    assert.equal(await map.getAttribute('viewBox'),'0 0 720 360');
  });
  await check('dark appearance and reduced motion keep controls readable', async () => {
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('#space-menu [data-open="settings"]').click();
    await page.locator('[data-set-theme="dark"]').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-theme'),'dark');
    const ink=await page.locator('.space-settings h2').evaluate(el=>getComputedStyle(el).color);
    assert.ok(!['rgb(0, 0, 0)','rgb(29, 36, 30)'].includes(ink),'dark headings must not inherit the blog’s light-theme ink');
    const duration=await page.locator('[data-space-window="settings"]').evaluate(el=>getComputedStyle(el).transitionDuration);
    assert.ok(duration.split(',').every(value=>parseFloat(value)<=0.001));
    await page.screenshot({path:path.join(directory,'desktop-dark.png')});
    await page.locator('[data-set-theme="light"]').click();
    await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await page.locator('[data-space-menu-trigger]').click();
  await page.locator('[data-space-home]').click();
  await page.screenshot({ path: path.join(directory, 'desktop-light.png') });
  await check('mobile applications remain usable with no horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp('notes');
    const box = await page.locator('[data-space-window="notes"]').boundingBox();
    assert.ok(box.x >= 0 && box.width <= 390);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(directory, 'mobile-notes.png') });
    await page.setViewportSize({width:320,height:700});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok((await page.locator('[data-note-editor]').boundingBox()).width<=320);
    await page.locator('[data-space-menu-trigger]').click(); await page.locator('.space-menu [data-space-launchpad-trigger]').click();
    assert.equal(await page.locator('[data-launchpad-app]').count(),11);
    await page.locator('[data-launchpad-app="settings"]').click();
    await page.locator('[data-space-window="settings"]').waitFor();
  });
  await check('English workspace has localized labels and true products', async () => {
    await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
    await enterWorkspace(page);
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]').dataset.cafeMode==='desktop');
    await page.locator('[data-space-dock] [data-open="products"]').click();
    assert.ok((await page.locator('[data-space-window="products"]').innerText()).includes('capri'));
  });
  await check('an unavailable AI service reports failure while the workspace stays usable',async()=>{
    const matcher=`${base}/.netlify/functions/bear-agent`;
    await page.route(matcher,route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"acceptance fixture"}'}));
    await page.keyboard.press('Control+j');
    await page.locator('[data-space-window="agent"] textarea').fill('Tell me about your writing.');
    await page.locator('[data-agent-send]').click();
    await page.waitForFunction(()=>document.querySelector('[data-agent-status]')?.textContent==='DeepSeek could not answer. Please try again.');
    assert.ok((await page.locator('[data-chat-log]').innerText()).includes('DeepSeek could not answer'));
    assert.equal(await page.locator('[data-agent-send]').isEnabled(),true);
    await page.unroute(matcher);
  });
  await check('a visitor can stop a pending AI request',async()=>{
    const matcher=`${base}/.netlify/functions/bear-agent`;
    let seen,release;
    const requestSeen=new Promise(resolve=>{seen=resolve;});
    const released=new Promise(resolve=>{release=resolve;});
    await page.route(matcher,async route=>{seen();await released;await route.abort().catch(()=>{});});
    await page.locator('[data-space-window="agent"] textarea').fill('A pending acceptance question.');
    await page.locator('[data-agent-send]').click();await requestSeen;
    await page.locator('[data-agent-stop]').click();release();
    await page.waitForFunction(()=>document.querySelector('[data-agent-status]')?.textContent==='Stopped or timed out.');
    assert.equal(await page.locator('[data-agent-send]').isEnabled(),true);
    await page.unroute(matcher);
  });
  await page.setViewportSize({width:1440,height:900});
  await check('agent executes real catalog search and app tools before answering',async()=>{
    const matcher=`${base}/.netlify/functions/bear-agent`;
    const requests=[];
    await page.route(matcher,async route=>{
      requests.push(route.request().postDataJSON());
      const body=requests.length===1?{message:'',toolCalls:[
        {id:'search_fixture',name:'search_writing',args:{query:'Agent'}},
        {id:'open_fixture',name:'open_app',args:{app:'notes'}}
      ]}:{message:'CATALOG_TOOLS_COMPLETE',toolCalls:[]};
      await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
    });
    await openApp('agent');
    await page.locator('[data-agent-input]').fill('Search the public writing and open my notes.');
    await page.locator('[data-agent-send]').click();
    await page.locator('[data-agent-answer]').filter({hasText:'CATALOG_TOOLS_COMPLETE'}).waitFor();
    assert.equal(requests.length,2);
    const tools=requests[1].messages.filter(m=>m.role==='tool');
    assert.equal(tools.length,2);
    assert.ok(tools[0].content.includes('Agent'));
    assert.equal(await page.locator('[data-space-window="notes"]').isVisible(),true);
    assert.equal(await page.locator('[data-agent-task]').last().locator('[data-agent-step="tool"][data-status="ok"]').count(),2);
    await page.unroute(matcher);
  });
  await check('approved note text changes the actual editor exactly once',async()=>{
    const matcher=`${base}/.netlify/functions/bear-agent`;
    const prior=await page.locator('[data-note-editor]').inputValue();
    let turn=0;
    await page.route(matcher,route=>route.fulfill({contentType:'application/json',body:JSON.stringify(++turn===1?
      {message:'',toolCalls:[{id:'note_fixture',name:'append_note',args:{text:'APPROVED_BROWSER_NOTE'}}]}:
      {message:'APPROVED_NOTE_COMPLETE',toolCalls:[]})}));
    await openApp('agent');
    await page.locator('[data-agent-input]').fill('Append the proposed note after approval.');
    await page.locator('[data-agent-send]').click();
    await page.locator('[data-agent-approve]').waitFor();
    assert.equal(await page.locator('[data-note-editor]').inputValue(),prior);
    const approvalStyle=await page.locator('[data-agent-approve]').evaluate(el=>({background:getComputedStyle(el).backgroundColor,height:el.getBoundingClientRect().height,border:getComputedStyle(el).borderTopWidth}));
    assert.notEqual(approvalStyle.background,'rgba(0, 0, 0, 0)','approval must keep its visible primary action styling');
    assert.ok(approvalStyle.height>=34);
    assert.equal(approvalStyle.border,'1px');
    await page.locator('[data-agent-approve]').click();
    await page.locator('[data-agent-answer]').filter({hasText:'APPROVED_NOTE_COMPLETE'}).waitFor();
    const note=await page.locator('[data-note-editor]').inputValue();
    assert.ok(note.startsWith(prior));
    assert.equal(note.split('APPROVED_BROWSER_NOTE').length,2);
    await page.unroute(matcher);
  });
  await check('stopping approval leaves no write or replay after reload',async()=>{
    const matcher=`${base}/.netlify/functions/bear-agent`;
    const prior=await page.locator('[data-note-editor]').inputValue();
    let calls=0;
    await page.route(matcher,route=>{calls++;return route.fulfill({contentType:'application/json',body:JSON.stringify({message:'',toolCalls:[{id:'cancel_fixture',name:'append_note',args:{text:'MUST_NOT_WRITE'}}]})});});
    await openApp('agent');
    await page.locator('[data-agent-input]').fill('A note approval to cancel.');
    await page.locator('[data-agent-send]').click();
    await page.locator('[data-agent-approve]').waitFor();
    await page.locator('[data-agent-stop]').click();
    await page.locator('[data-agent-task]').last().locator('[data-agent-badge][data-status="interrupted"]').waitFor();
    assert.equal(await page.locator('[data-agent-approve]').count(),0);
    assert.equal(await page.locator('[data-note-editor]').inputValue(),prior);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.ready==='true');
    assert.equal(await page.locator('[data-agent-task]').last().locator('[data-agent-badge]').getAttribute('data-status'),'interrupted');
    assert.equal(await page.locator('[data-note-editor]').inputValue(),prior);
    assert.equal(calls,1);
    await page.unroute(matcher);
  });
  if(process.env.BEAR_RUNTIME_TEST==='1'){
    await check('notes saved to the sandbox remain separate from later browser edits',async()=>{
      await page.locator('[data-space-dock] [data-open="notes"]').click();
      await page.locator('[data-note-editor]').fill('SANDBOX_NOTE_OK');
      await page.locator('.space-note-advanced > summary').click();
      await page.locator('[data-note-sandbox]').waitFor({state:'visible'});
      await page.waitForFunction(()=>!document.querySelector('[data-note-sandbox]')?.disabled);
      await page.locator('[data-note-sandbox]').click();
      await page.waitForFunction(()=>document.querySelector('[data-note-runtime]')?.textContent.includes('副本已保存'),{},{timeout:25000});
      await page.locator('[data-note-editor]').fill('ONLY_IN_BROWSER');
      assert.ok((await page.locator('[data-note-runtime]').innerText()).includes('未同步'));
      assert.ok(!(await page.locator('[data-note-save]').innerText()).includes('沙盒'));
    });
    await check('browser terminal executes inside the real connected sandbox',async()=>{
      await page.setViewportSize({width:1280,height:850});
      await openApp('terminal');
      await page.locator('[data-terminal-input]').fill("run printf 'BROWSER_SANDBOX_OK' > /workspace/browser-acceptance.txt; cat /workspace/browser-acceptance.txt");
      await page.locator('[data-terminal-input]').press('Enter');
      await page.waitForFunction(()=>document.querySelector('[data-terminal-output]')?.textContent.includes('BROWSER_SANDBOX_OK\n[exit 0'),{},{timeout:25000});
      await page.screenshot({path:path.join(directory,'real-sandbox.png')});
    });
    await check('AI guide and terminal share the same sandbox operation',async()=>{
      const matcher=`${base}/.netlify/functions/bear-agent`;
      const requests=[];
      await page.route(matcher,route=>{
        requests.push(route.request().postDataJSON());
        return route.fulfill({contentType:'application/json',body:JSON.stringify(requests.length===1?
          {message:'',toolCalls:[{id:'sandbox_fixture',name:'sandbox_run',args:{command:'cat /workspace/browser-acceptance.txt'}}]}:
          {message:'Sandbox tool returned.',toolCalls:[]})});
      });
      await page.keyboard.press('Control+j');
      await page.locator('[data-space-window="agent"] textarea').fill('run cat /workspace/browser-acceptance.txt');
      await page.locator('[data-agent-send]').click();
      await page.locator('[data-agent-approve]').waitFor();
      await page.locator('[data-agent-approve]').click();
      await page.locator('[data-agent-answer]').filter({hasText:'Sandbox tool returned.'}).waitFor({timeout:25000});
      const result=requests[1]?.messages.find(message=>message.role==='tool');
      assert.ok(result?.content.includes('BROWSER_SANDBOX_OK'));
      assert.equal(await page.locator('[data-agent-task]').last().locator('[data-agent-step="tool"][data-status="ok"]').count(),1);
      await page.unroute(matcher);
    });
  }
  assert.deepEqual(errors, [], 'the workspace must have no browser exceptions');
  await fs.writeFile(path.join(directory, 'acceptance.json'), JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
