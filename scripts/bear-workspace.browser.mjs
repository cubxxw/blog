import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createOutputServer } from './serve-site-output.mjs';

const directory = path.resolve('output/playwright/bear-workspace');
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
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS', name); }
try {
  await page.goto(`${base}/zh/projects/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('[data-bear-workspace]').count(), 1, 'BEAR must provide an interactive desktop');
  await page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
  await check('desktop opens multiple real apps immediately', async () => {
    assert.equal(await page.locator('[data-space-window]').count(), 2);
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    assert.equal(await page.locator('[data-space-window="notes"]').count(), 1);
  });
  await check('private writing survives a page reload', async () => {
    await page.locator('[data-note-editor]').fill('测试笔记：明天继续探索 Agent。');
    await page.reload();
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
    await page.locator('[data-space-dock] [data-open="terminal"]').click();
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
    await page.locator('[data-space-search-trigger]').click();
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
    await page.locator('[data-product-view-button="lab"]').click();
    assert.equal(await page.locator('[data-product-panel="lab"]').isVisible(), true);
    await page.locator('[data-product-view-button="bear"]').click();
    assert.equal(await page.locator('[data-bear-workspace]').isVisible(), true);
  });
  await check('Product Lab control exits its knowledge graph to the product catalog', async () => {
    await page.locator('[data-product-view-button="lab"]').click();
    await page.locator('[data-bks-enter]').click();
    assert.equal(await page.locator('.builds-main').isVisible(),false);
    await page.locator('[data-product-view-button="lab"]').click();
    assert.equal(await page.locator('.builds-main').isVisible(),true);
    await page.locator('[data-product-view-button="bear"]').click();
  });
  await check('a real travel photo opens its matching map region', async () => {
    await page.locator('[data-space-dock] [data-open="photos"]').click();
    await page.locator('[data-space-window="photos"] [data-open="photos"]').click();
    await page.locator('.space-gallery [data-open="photos"]').first().click();
    const region=await page.locator('.space-photo-caption [data-open="map"]').getAttribute('data-payload');
    await page.locator('.space-photo-caption [data-open="map"]').click();
    assert.equal(await page.evaluate(()=>window.BearSpace.snapshot().windows.find(w=>w.app==='map').payload),region);
    assert.ok(await page.locator('.space-map__photos img').count());
  });
  await check('private notes export their real text', async () => {
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    const download=page.waitForEvent('download');
    await page.locator('[data-note-export]').click();
    const file=await download;
    assert.equal(await fs.readFile(await file.path(),'utf8'),'测试笔记：明天继续探索 Agent。');
  });
  await check('dark appearance and reduced motion keep controls readable', async () => {
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('#space-menu [data-open="settings"]').click();
    await page.locator('[data-set-theme="dark"]').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-theme'),'dark');
    assert.equal(await page.locator('.space-settings h2').evaluate(el=>getComputedStyle(el).color),'rgb(226, 233, 226)','dark headings must not inherit the blog’s light-theme ink');
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
    await page.locator('[data-space-dock] [data-open="notes"]').click();
    const box = await page.locator('[data-space-window="notes"]').boundingBox();
    assert.ok(box.x >= 0 && box.width <= 390);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(directory, 'mobile-notes.png') });
    await page.setViewportSize({width:320,height:700});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok((await page.locator('[data-note-editor]').boundingBox()).width<=320);
  });
  await check('English workspace has localized labels and true products', async () => {
    await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
    await page.locator('[data-space-dock] [data-open="products"]').click();
    assert.ok((await page.locator('[data-space-window="products"]').innerText()).includes('Talent Signal'));
  });
  await check('an unavailable AI service reports failure while the workspace stays usable',async()=>{
    const matcher=`${base}/.netlify/functions/blog-ai`;
    await page.route(matcher,route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"acceptance fixture"}'}));
    await page.locator('[data-space-dock] [data-open="agent"]').click();
    await page.locator('[data-space-window="agent"] textarea').fill('Tell me about your writing.');
    await page.locator('[data-agent-send]').click();
    await page.waitForFunction(()=>document.querySelector('[data-agent-status]')?.textContent==='No valid answer received.');
    assert.ok((await page.locator('[data-chat-log]').innerText()).includes('unavailable'));
    assert.equal(await page.locator('[data-agent-send]').isEnabled(),true);
    await page.unroute(matcher);
  });
  await check('a visitor can stop a pending AI request',async()=>{
    const matcher=`${base}/.netlify/functions/blog-ai`;
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
  if(process.env.BEAR_DEV_URL){
    await check('notes saved to the sandbox remain separate from later browser edits',async()=>{
      await page.locator('[data-space-dock] [data-open="notes"]').click();
      await page.locator('[data-note-editor]').fill('SANDBOX_NOTE_OK');
      await page.locator('[data-note-sandbox]').click();
      await page.waitForFunction(()=>document.querySelector('[data-note-save]')?.textContent.includes('/workspace/note.md'),{},{timeout:25000});
      await page.locator('[data-note-editor]').fill('ONLY_IN_BROWSER');
      assert.ok(!(await page.locator('[data-note-save]').innerText()).includes('/workspace/note.md'));
    });
    await check('browser terminal executes inside the real connected sandbox',async()=>{
      await page.setViewportSize({width:1280,height:850});
      await page.locator('[data-space-dock] [data-open="terminal"]').click();
      await page.locator('[data-terminal-input]').fill("run printf 'BROWSER_SANDBOX_OK' > /workspace/browser-acceptance.txt; cat /workspace/browser-acceptance.txt");
      await page.locator('[data-terminal-input]').press('Enter');
      await page.waitForFunction(()=>document.querySelector('[data-terminal-output]')?.textContent.includes('BROWSER_SANDBOX_OK\n[exit 0'),{},{timeout:25000});
      await page.screenshot({path:path.join(directory,'real-sandbox.png')});
    });
    await check('AI guide and terminal share the same sandbox operation',async()=>{
      await page.locator('[data-space-dock] [data-open="agent"]').click();
      await page.locator('[data-space-window="agent"] textarea').fill('run cat /workspace/browser-acceptance.txt');
      await page.locator('[data-agent-send]').click();
      await page.waitForFunction(()=>document.querySelector('[data-chat-log]')?.textContent.includes('BROWSER_SANDBOX_OK\n[exit 0'),{},{timeout:25000});
    });
  }
  assert.deepEqual(errors, [], 'the workspace must have no browser exceptions');
  await fs.writeFile(path.join(directory, 'acceptance.json'), JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
