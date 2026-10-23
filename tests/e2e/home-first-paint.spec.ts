import { test, expect } from '../helpers/frozen-site';

test('mobile AI enhancement occupies its reserved space without moving the writing below it', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 823 });
  let releaseModule!: () => void;
  const paused = new Promise<void>(resolve => { releaseModule = resolve; });
  await page.route('**/home-chat-utils*.js', async route => {
    await paused;
    await route.fallback();
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    const layer = page.locator('#hp-bear-layer');
    await expect(layer).toHaveCSS('min-height', '80px');
    await expect(layer.locator('#hp-orbit')).toHaveCount(0);
    await expect(page.locator('.hp-posts-grid .hp-featured').first()).toBeVisible();
    const before = await page.locator('#hp-posts').boundingBox();
    releaseModule();
    await expect(layer.locator('#hp-avatar-btn')).toBeVisible();
    const after = await page.locator('#hp-posts').boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
    await layer.locator('#hp-avatar-btn').click();
    await expect(page.locator('#hp-bear-ai')).toHaveClass(/is-chat-open/);
  } finally {
    releaseModule();
  }
});

test('mobile primary links remain readable within stable columns', async ({ page }) => {
  for (const width of [320, 375, 412]) {
    await page.setViewportSize({ width, height: 823 });
    await page.goto('/');
    const actions = page.locator('.hp-entry-actions');
    const links = actions.locator('a');
    await expect(links).toHaveCount(2);
    const boxes = await links.evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right:r.right, bottom:r.bottom, width: r.width, height: r.height, overflow: el.scrollWidth > el.clientWidth };
    }));
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.overflow).toBe(false);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);
    }
    const overlapX=Math.min(boxes[0].right,boxes[1].right)-Math.max(boxes[0].x,boxes[1].x);
    const overlapY=Math.min(boxes[0].bottom,boxes[1].bottom)-Math.max(boxes[0].y,boxes[1].y);
    expect(overlapX>1&&overlapY>1).toBe(false);
    await expect(links.first()).toHaveAttribute('href', '#hp-posts');
    await expect(links.last()).toHaveAttribute('href', /\/projects\/#studio-products$/);
  }
});

test.describe('Chinese fonts without JavaScript', () => {
test.use({ javaScriptEnabled: false });
test('Chinese first-screen text retains the original complete self-hosted font coverage', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 823 });
  await page.goto('/zh/growth/posts/2025-annual-review/');
  const fontCSS = await page.locator('#zh-prose-fonts').getAttribute('href');
  await expect(page.locator(`noscript link[href="${fontCSS}"]`)).toHaveAttribute('rel', 'stylesheet');
  const title = page.locator('.post-title');
  const summary = page.locator('.article-tldr');
  await expect(title).toBeVisible();
  const text = [(await title.textContent())!, (await summary.textContent())!];
  const coverage = await page.evaluate(async ([titleText, summaryText]) => {
    const bold = await document.fonts.load('700 16px "Noto Serif SC"', titleText);
    const regular = await document.fonts.load('400 16px "Noto Serif SC"', summaryText);
    return [bold, regular].map(faces => ({ count: faces.length, loaded: faces.every(face => face.status === 'loaded') }));
  }, text);
  for (const result of coverage) { expect(result.count).toBeGreaterThan(0); expect(result.loaded).toBe(true); }
  expect(await title.evaluate(el => getComputedStyle(el).fontFamily)).toContain('Noto Serif SC');
  expect(await summary.evaluate(el => getComputedStyle(el).fontFamily)).toContain('Noto Serif SC');
});
});

test('slow Chinese font CSS cannot delay visible text or move an established read point', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 823 });
  let releaseCSS!: () => void;
  const paused = new Promise<void>(resolve => { releaseCSS = resolve; });
  await page.route('**/noto-serif-sc-reading*.css', async route => {
    await paused;
    await route.fallback();
  });
  try {
    await page.goto('/zh/growth/posts/2025-annual-review/', { waitUntil: 'commit' });
    const title = page.locator('.post-title');
    await expect(title).toBeVisible();
    const marker = page.locator('.post-content > p').first();
    await marker.scrollIntoViewIfNeeded();
    const position = () => marker.evaluate(el => ({ top: el.getBoundingClientRect().top, scroll: scrollY, text: el.textContent }));
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const before = await position();
    const response = page.waitForResponse(response => /noto-serif-sc-reading.*\.css/.test(response.url()));
    releaseCSS();
    expect((await response).ok()).toBe(true);
    await page.waitForLoadState('load');
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await position()).toEqual(before);
    await expect(page.locator('#zh-prose-fonts')).toHaveAttribute('rel', 'preload');
    expect(await page.evaluate(() => Array.from(document.fonts).some(face => face.family.replace(/["']/g, '').toLowerCase() === 'noto serif sc'))).toBe(false);
  } finally {
    releaseCSS();
  }
});

test('cold navigation does not synchronously write an absent menu scroll position', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft')!;
    const state = window as typeof window & { menuRestoreWrites: number };
    state.menuRestoreWrites = 0;
    Object.defineProperty(Element.prototype, 'scrollLeft', {
      ...original,
      set(value: number) {
        if ((this as Element).id === 'menu') state.menuRestoreWrites++;
        original.set!.call(this, value);
      },
    });
  });
  for (const route of ['/', '/zh/growth/', '/zh/ai-agent/']) {
    await page.goto(route);
    expect(await page.evaluate(() => (window as typeof window & { menuRestoreWrites: number }).menuRestoreWrites)).toBe(0);
  }
});
