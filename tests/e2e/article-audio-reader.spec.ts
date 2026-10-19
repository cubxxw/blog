import { test, expect } from '../helpers/frozen-site';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';

const article = '/zh/ai-agent/posts/give-ai-tasks-not-directions/';
const current = '[data-audio-track]:not([hidden])';

test('opening the explanation reveals selectable text without requesting or playing audio', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', r => { if (r.url().endsWith('.mp3')) requests.push(r.url()); });
  await page.goto(article);
  await page.locator('[data-author-audio] > summary').click();
  await expect(page.locator('[data-audio-track-button]')).toHaveCount(3);
  await expect(page.locator(`${current} [data-audio-transcript-text]`)).toBeVisible();
  expect(await page.locator(`${current} [data-audio-transcript-text] p`).count()).toBeGreaterThan(2);
  expect(await page.locator(`${current} audio`).evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await expect(page.locator(`${current} [data-audio-clock]`)).toContainText('1:47');
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: '问答讲解', exact: true }).click();
  await expect(page.locator(`${current} [data-audio-transcript-text]`)).toContainText('给 AI 的任务，为什么不能只有一个方向');
  expect(requests).toEqual([]);
});

test('copy returns the complete selected transcript with paragraph breaks', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are verified in Chromium');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(article);
  await page.locator('[data-author-audio] > summary').click();
  const text = await page.locator(`${current} [data-audio-transcript-text] p`).allTextContents();
  await page.locator(`${current} [data-audio-copy]`).click();
  await expect(page.locator(`${current} [data-audio-status]`)).toContainText('已复制');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text.join('\n\n'));
});

test('the real audio advances, pauses, seeks, and stops when switching tracks or collapsing', async ({ page }) => {
  await page.goto(article);
  await page.locator('[data-author-audio] > summary').click();
  const audio = page.locator(`${current} audio`);
  await page.locator(`${current} [data-audio-toggle]`).click();
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime), { timeout: 15000 }).toBeGreaterThan(0.1);
  await page.locator(`${current} [data-audio-toggle]`).click();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page.locator(`${current} [data-audio-seek]`).fill('20');
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThanOrEqual(19.9);
  await page.locator(`${current} [data-audio-speed]`).selectOption('1.5');
  expect(await audio.evaluate((a: HTMLAudioElement) => a.playbackRate)).toBe(1.5);
  await page.locator(`${current} [data-audio-toggle]`).click();
  await page.getByRole('button', { name: '问答讲解', exact: true }).click();
  expect(await page.locator('audio').evaluateAll(list => list.every(a => (a as HTMLAudioElement).paused))).toBe(true);
  await page.locator(`${current} [data-audio-toggle]`).click();
  await expect.poll(() => page.locator(`${current} audio`).evaluate((a: HTMLAudioElement) => a.currentTime), { timeout: 15000 }).toBeGreaterThan(0.1);
  await page.locator('[data-author-audio] > summary').click();
  expect(await page.locator('audio').evaluateAll(list => list.every(a => (a as HTMLAudioElement).paused))).toBe(true);
});

test('audio failure leaves the full transcript available and offers retry', async ({ browser, baseURL }) => {
  // A genuine HTTP failure preserves WebKit's native media request path.
  // route.fulfill(404) can leave its loader buffering without an error event.
  let failAudio = true;
  const server = createServer((req, res) => {
    if (failAudio && new URL(req.url || '/', baseURL).pathname.endsWith('.mp3')) {
      res.writeHead(404, { 'content-type': 'audio/mpeg', 'content-length': '0', 'cache-control': 'no-store' });
      res.end();
      return;
    }
    const upstream = request(new URL(req.url || '/', baseURL), { method: req.method }, response => {
      res.writeHead(response.statusCode || 502, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); });
    upstream.end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const context = await browser.newContext({
    baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    await page.goto(article, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-author-audio] > summary').click();
    await page.locator(`${current} [data-audio-toggle]`).click();
    await expect(page.locator(`${current} [data-audio-status]`)).toContainText('无法加载', { timeout: 15000 });
    await expect(page.locator(`${current} [data-audio-transcript-text]`)).toBeVisible();
    await expect(page.locator(`${current} [data-audio-toggle]`)).toHaveAccessibleName('重试播放');
    failAudio = false;
    await page.locator(`${current} [data-audio-toggle]`).click();
    await expect.poll(() => page.locator(`${current} audio`).evaluate((a: HTMLAudioElement) => a.currentTime), { timeout: 15000 }).toBeGreaterThan(0.1);
  } finally {
    await context.close();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('a position chosen before loading is honored even near the end', async ({ page }) => {
  await page.goto(article);
  await page.locator('[data-author-audio] > summary').click();
  await page.locator(`${current} [data-audio-seek]`).fill('106');
  await expect(page.locator(`${current} [data-audio-clock]`)).toHaveText('1:46 / 1:47');
  await page.locator(`${current} [data-audio-toggle]`).click();
  await expect.poll(() => page.locator(`${current} audio`).evaluate((a: HTMLAudioElement) => a.currentTime), { timeout: 15000 }).toBeGreaterThanOrEqual(106);
});

test('loading shows the known length and can be cancelled before audio arrives', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(done => { release = done; });
  await page.route('**/audio/author/*.mp3', async route => { await gate; await route.continue(); });
  try {
    await page.goto(article);
    await page.locator('[data-author-audio] > summary').click();
    await page.locator(`${current} [data-audio-toggle]`).click();
    await expect(page.locator(`${current} [data-audio-toggle]`)).toHaveAccessibleName('取消加载');
    await expect(page.locator(`${current} [data-audio-clock]`)).toHaveText('0:00 / 1:47');
    await page.locator(`${current} [data-audio-toggle]`).click();
    release();
    expect(await page.locator('audio').evaluateAll(list => list.every(a => (a as HTMLAudioElement).paused))).toBe(true);
    await expect(page.locator(`${current} [data-audio-toggle]`)).toHaveAccessibleName('播放讲解');
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test.describe('native fallback', () => {
  test.use({ javaScriptEnabled: false });
  test('all transcripts and native audio controls remain readable without scripts', async ({ page }) => {
    await page.goto(article);
    await page.locator('[data-author-audio] > summary').click();
    await expect(page.locator('[data-audio-transcript-text]')).toHaveCount(3);
    for (const text of await page.locator('[data-audio-transcript-text]').all()) await expect(text).toBeVisible();
    for (const audio of await page.locator('[data-author-audio] audio').all()) {
      await expect(audio).toBeVisible();
      await expect(audio).toHaveAttribute('controls', '');
    }
  });
});
