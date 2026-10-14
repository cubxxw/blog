import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createOutputServer } from './serve-site-output.mjs';

const evidence = path.resolve(process.env.FOOTER_EVIDENCE_DIR || 'output/playwright/home-footer');
await mkdir(evidence, { recursive: true });
const server = createOutputServer({ publicDir: process.env.SITE_PUBLIC_DIR || 'public' });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const checks = [], errors = [], measurements = [];
async function localResources(route) {
  const url = new URL(route.request().url());
  if (url.origin === 'https://cubxxw.com') return route.fulfill({ response: await route.fetch({ url: `${base}${url.pathname}${url.search}` }) });
  if (url.origin === base) return route.continue();
  return route.fulfill({ status: 200, contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'application/javascript', body: '' });
}
try {
  for (const [language, prefix] of [['en', ''], ['zh', '/zh']]) {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push({ message: error.message, url: page.url() }));
    await page.route('**/*', localResources);
    await page.goto(`${base}${prefix}/`, { waitUntil: 'load' });
    const footer = page.locator('.hp-footer');
    assert.equal(await page.locator('footer.footer').count(), 0, 'the homepage must have one copyright owner');
    assert.match(await footer.locator('.hp-footer-brand').innerText(), /CUBXXW/);
    for (const width of [1440, 1920, 768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.body.classList.toggle('dark', theme === 'dark'), theme);
        await footer.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
          const root = document.querySelector('.hp-footer');
          return !document.getAnimations().some(animation => root.contains(animation.effect?.target) && animation.effect.getComputedTiming().iterations !== Infinity && animation.playState === 'running');
        });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const geometry = await footer.evaluate(root => {
          const rect = root.getBoundingClientRect();
          const columns = [...root.querySelector('.hp-footer-grid').children].map(element => {
            const bounds = element.getBoundingClientRect();
            return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
          });
          return { width: rect.width, height: rect.height, columns };
        });
        await footer.screenshot({ path: path.join(evidence, `${language}-${width}-${theme}.png`) });
        const contrast = await footer.evaluate(root => {
          const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126,.7152,.0722][index], 0);
          const background = luminance(getComputedStyle(root.closest('.homepage-root')).backgroundColor);
          return Math.min(...[...root.querySelectorAll('.hp-footer-bio, h4, a, button, summary, small, .hp-footer-bottom span')].filter(element => element.checkVisibility()).map(element => {
            const foreground = luminance(getComputedStyle(element).color);
            return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
          }));
        });
        assert.ok(contrast >= 4.5, `footer text contrast is too low: ${contrast}`);
        if (width >= 1440) assert.ok(geometry.height < 430, `desktop footer is too tall: ${geometry.height}`);
        if (width === 390) {
          for (const element of await footer.locator('a:visible, button:visible, summary:visible').all()) {
            const rect = await element.boundingBox();
            assert.ok(rect.height >= 43.5, `mobile target is too short: ${await element.innerText()}`);
          }
        }
        measurements.push({ language, theme, viewport: width, contrast, ...geometry });
      }
    }
    for (const platform of ['wechat', 'xhs']) {
      const button = footer.locator(`[data-contact-platform="${platform}"]`);
      await button.click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible' });
      await dialog.locator('img').evaluate(image => image.decode());
      assert.ok(await dialog.locator('img').evaluate(image => image.naturalWidth > 0));
      await page.keyboard.press('Escape');
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      await page.waitForFunction(platform => document.activeElement?.dataset.contactPlatform === platform, platform);
      assert.equal(await button.evaluate(element => element === document.activeElement), true);
    }
    for (const disclosure of await footer.locator('.hp-footer-more').all()) {
      await disclosure.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.notEqual(await disclosure.getAttribute('open'), null);
    }
    for (const link of await footer.locator('.hp-footer-feeds a').all()) {
      const url = new URL(await link.getAttribute('href'), base);
      const response = await page.request.get(`${base}${url.pathname}`);
      assert.equal(response.ok(), true, `${url.pathname} must resolve`);
    }
    await footer.locator('.hp-footer-space').click();
    await page.waitForLoadState('load');
    await page.waitForFunction(() => document.querySelector('[data-bear-workspace]')?.dataset.ready === 'true');
    await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.pseudoElement?.startsWith('::view-transition')).map(animation => animation.finished)));
    checks.push(`${language}: 4 viewports, both themes, touch targets, disclosures, QR dialogs, feeds, Space navigation`);
    await page.close();
  }
  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticPage.route('**/*', localResources);
  await staticPage.goto(`${base}/zh/`, { waitUntil: 'load' });
  const staticFooter = staticPage.locator('.hp-footer');
  assert.equal(await staticFooter.locator('button:visible').count(), 0);
  assert.equal(await staticFooter.locator('noscript a:visible').count(), 2);
  for (const qr of await staticFooter.locator('noscript a').all()) {
    const response = await staticPage.request.get(new URL(await qr.getAttribute('href'), base).href);
    assert.equal(response.ok(), true, 'QR fallback asset must resolve');
  }
  await staticFooter.locator('.hp-footer-more--builds summary').click();
  assert.notEqual(await staticFooter.locator('.hp-footer-more--builds').getAttribute('open'), null);
  checks.push('without JavaScript: working QR links and native product disclosure');
  await staticPage.close();
  assert.deepEqual(errors, []);
  await writeFile(path.join(evidence, 'acceptance.json'), JSON.stringify({ checks, errors, measurements }, null, 2));
  console.log(JSON.stringify({ checks, errors, screenshots: measurements.length }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
