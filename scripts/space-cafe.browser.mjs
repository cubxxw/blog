import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createOutputServer } from './serve-site-output.mjs';

const evidence = path.resolve(process.env.CAFE_EVIDENCE_DIR || 'output/playwright/space-cafe');
await fs.mkdir(evidence, { recursive: true });
const server = createOutputServer({ publicDir: path.resolve(process.env.SITE_PUBLIC_DIR || 'public') });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.CAFE_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage(), errors = [], checks = [], requests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => requests.push(request.url()));
await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
const ready = async () => page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
const enter = async () => { await page.locator('.space-cafe__welcome [data-cafe-enter]').click(); await page.waitForFunction(() => document.querySelector('[data-bear-workspace]').dataset.cafeMode === 'desktop'); };
const visit = async () => { await page.locator('[data-space-menu-trigger]').click(); await page.locator('.space-menu [data-cafe-visit]').click(); };
const picker = async () => page.locator('.space-cafe__utilities [data-cafe-picker]').click();
const select = async id => { await page.locator(`button[data-cafe-theme="${id}"]`).click(); await page.waitForFunction(id => document.querySelector('[data-cafe-image]').dataset.theme === id, id); };
async function check(name, action) { await action(); checks.push(name); console.log('PASS', name); }
try {
  await page.goto(`${base}/zh/projects/`); await ready();
  await check('fresh entry loads only the active scene and hides the real desktop from focus', async () => {
    await page.waitForFunction(() => document.querySelector('[data-cafe-image]').naturalWidth > 0);
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-theme'), 'zen');
    assert.equal(await page.locator('[data-space-windows]').evaluate(el => el.inert), true);
    assert.equal(await page.locator('[data-space-dock]').isVisible(), false);
    assert.equal(requests.filter(url => /images\/space-cafe\//.test(url)).length, 1);
    assert.equal(requests.some(url => /three\.module|\/entrance\./.test(url)), false);
    await page.screenshot({ path: path.join(evidence, 'zen-desktop.png') });
  });
  const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const failurePage = await failureContext.newPage();
  await check('failed and out-of-order image loads preserve the last successful scene', async () => {
    await failurePage.goto(`${base}/zh/projects/`);
    await failurePage.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.ready==='true');
    const scenes = await failurePage.evaluate(() => JSON.parse(document.querySelector('[data-cafe-catalog]').textContent).themes);
    const coast = scenes.find(scene => scene.id === 'coast').image;
    const rain = scenes.find(scene => scene.id === 'rain').image;
    await failurePage.route(`${base}${coast}`, async route => { await new Promise(resolve => setTimeout(resolve, 650)); await route.continue(); });
    await failurePage.route(`${base}${rain}`, route => route.abort());
    await failurePage.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await failurePage.locator('button[data-cafe-theme="coast"]').click();
    await failurePage.locator('button[data-cafe-theme="garden"]').click();
    await failurePage.waitForFunction(()=>document.querySelector('[data-cafe-image]').dataset.theme==='garden');
    await failurePage.waitForTimeout(750);
    assert.equal(await failurePage.locator('[data-cafe-image]').getAttribute('data-theme'), 'garden');
    await failurePage.locator('button[data-cafe-theme="rain"]').click();
    await failurePage.waitForFunction(() => document.querySelector('[data-cafe-picker-status]').textContent.includes('未能载入'));
    assert.equal(await failurePage.locator('[data-cafe-image]').getAttribute('data-theme'), 'garden');
    assert.equal(await failurePage.evaluate(() => localStorage.getItem('space:cafe:theme:v1')), 'garden');
    const lake = scenes.find(scene => scene.id === 'lake').image;
    let release;
    const held = new Promise(resolve => release = resolve);
    await failurePage.route(`${base}${lake}`, async route => { await held; await route.continue(); });
    await failurePage.clock.install();
    await failurePage.locator('button[data-cafe-theme="lake"]').click();
    await failurePage.clock.fastForward(45001);
    await failurePage.waitForFunction(() => document.querySelector('[data-cafe-picker-status]').textContent.includes('未能载入'));
    release(); await failurePage.waitForTimeout(100);
    assert.equal(await failurePage.locator('[data-cafe-image]').getAttribute('data-theme'), 'garden', 'a late image cannot commit after its timeout');
    await failureContext.close();
  });
  await check('six complete cafés switch freely without changing workspace state', async () => {
    const before = await page.evaluate(() => window.BearSpace.snapshot());
    await picker(); assert.equal(await page.locator('button[data-cafe-theme]').count(), 6);
    for (const id of ['garden', 'coast', 'mountain', 'lake', 'rain', 'zen']) {
      await select(id);
      assert.equal(await page.locator(`button[data-cafe-theme="${id}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.evaluate(() => localStorage.getItem('space:cafe:theme:v1')), id);
    }
    await page.screenshot({ path: path.join(evidence, 'theme-gallery.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.space-cafe__utilities [data-cafe-picker]').evaluate(el => el === document.activeElement), true);
    assert.deepEqual(await page.evaluate(() => window.BearSpace.snapshot()), before);
  });
  await check('window view and language switch preserve the current café', async () => {
    await picker(); await select('garden'); await page.keyboard.press('Escape');
    await page.locator('[data-cafe-outside]').click();
    await picker();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-view'), 'outside');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-cafe-outside]').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-cafe-outside]').getAttribute('aria-pressed'), 'false');
    await page.locator('[data-cafe-language]').click(); await page.waitForURL(`${base}/projects/`); await ready();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'cafe');
    assert.equal(await page.locator('[data-cafe-name]').textContent(), 'Scholar’s Garden');
    await page.reload(); await ready(); assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-theme'), 'garden');
  });
  await check('the computer resumes private notes, drafts, favorites and the same mounted windows', async () => {
    await enter();
    await page.evaluate(() => { window.BearSpace.execute('open', { app: 'notes' }); window.BearSpace.execute('note', { text: 'My private café note.' }); window.BearSpace.execute('draft', { text: 'A draft that stays here.' }); });
    await page.locator('[data-note-editor]').evaluate(el => el.dataset.instance = 'original-editor');
    const before = await page.evaluate(() => window.BearSpace.snapshot());
    await visit(); await picker(); await select('coast'); await page.keyboard.press('Escape'); await enter();
    assert.deepEqual(await page.evaluate(() => window.BearSpace.snapshot()), before);
    assert.equal(await page.locator('[data-note-editor]').getAttribute('data-instance'), 'original-editor');
    await page.reload(); await ready();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'desktop');
    assert.equal(await page.locator('[data-note-editor]').inputValue(), 'My private café note.');
  });
  await check('a pending companion approval survives a café visit without being accepted', async () => {
    const endpoint = `${base}/.netlify/functions/bear-agent`;
    await page.route(endpoint, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: '', toolCalls: [{ id: 'cafe_private_write', name: 'append_note', args: { text: 'DO_NOT_AUTO_ACCEPT' } }] }) }));
    await page.keyboard.press('Control+j');
    await page.locator('[data-agent-input]').fill('Prepare a private note.'); await page.locator('[data-agent-send]').click();
    await page.locator('[data-agent-approve]').waitFor();
    const before = await page.evaluate(() => window.BearSpace.snapshot().note);
    await visit(); await picker(); await select('lake'); await page.keyboard.press('Escape'); await enter();
    assert.equal(await page.locator('[data-agent-approve]').count(), 1);
    assert.equal(await page.evaluate(() => window.BearSpace.snapshot().note), before);
    await page.locator('[data-agent-stop]').click(); await page.unroute(endpoint);
  });
  await check('fresh visits re-enter the café, while shortcuts open real apps and deep links bypass it', async () => {
    await page.goto(`${base}/zh/projects/`); await ready();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'cafe');
    await page.keyboard.press('Control+k'); assert.equal(await page.locator('[data-space-search]').isVisible(), true); await page.keyboard.press('Escape');
    await page.goto(`${base}/zh/projects/?profile=about#identity`); await ready();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'desktop');
    assert.equal(await page.locator('[data-space-window="welcome"]').isVisible(), true);
    await visit();
    const before = await page.evaluate(() => window.BearSpace.snapshot());
    await page.reload(); await ready();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'cafe');
    assert.deepEqual(await page.evaluate(() => window.BearSpace.snapshot()), before);
    await page.locator('[data-cafe-language]').click();
    await page.waitForURL(`${base}/projects/?profile=about#identity`); await ready();
    assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'cafe');
    assert.deepEqual(await page.evaluate(() => window.BearSpace.snapshot()), before);
    await page.goto(`${base}/zh/projects/#product-lab`); await ready();
    assert.equal(await page.locator('[data-product-panel="lab"]').isVisible(), true);
  });
  await check('mobile cafés, scene choices and both languages fit 320px with touch targets', async () => {
    for (const width of [320, 390]) for (const lang of ['zh', 'en']) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}${lang === 'zh' ? '/zh' : ''}/projects/`); await ready();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const button of await page.locator('[data-space-cafe] button:visible').all()) {
        const box = await button.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44, `${await button.innerText()} ${JSON.stringify(box)}`);
      }
      await page.waitForFunction(() => document.querySelector('[data-cafe-image]').naturalWidth > 0);
      await page.screenshot({ path: path.join(evidence, `${lang}-${width}-cafe.png`) });
      await picker();
      const dialog = await page.locator('[data-cafe-dialog]').boundingBox(); assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= width);
      await page.keyboard.press('Escape'); await enter();
    }
  });
  await check('landscape controls remain independently clickable at 568 by 320', async () => {
    for (const lang of ['zh', 'en']) {
      await page.setViewportSize({ width: 568, height: 320 });
      await page.goto(`${base}${lang === 'zh' ? '/zh' : ''}/projects/`); await ready();
      for (const selector of ['[data-cafe-guide]', '.space-cafe__welcome [data-cafe-enter]', '.space-cafe__place', '[data-cafe-outside]']) {
        assert.equal(await page.locator(selector).evaluate(el => { const b = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); }), true, selector);
      }
      await page.locator('[data-cafe-guide]').click();
      assert.equal(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode'), 'desktop');
      assert.equal(await page.locator('[data-agent-input]').isVisible(), true);
    }
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(evidence, 'results.json'), JSON.stringify({ base, checks, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(evidence, 'failure.png') });
  await fs.writeFile(path.join(evidence, 'failure.json'), JSON.stringify({ error: error.message, checks, errors }, null, 2)); throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
