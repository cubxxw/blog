import { test, expect } from '../helpers/frozen-site';

const article = '/zh/ai-agent/posts/give-ai-tasks-not-directions/';

test('the sole language control switches the same article in both directions', async ({ page }) => {
  await page.goto(article);
  await expect(page.locator('.lang-switch li')).toHaveText(['中文', 'EN']);
  await expect(page.locator('.lang-switch [aria-current]')).toHaveText('中文');
  await expect(page.locator('.marginalia-dialect, .marginalia-dialect-inline, .post-meta .i18n_list')).toHaveCount(0);
  await expect(page.locator('.post-meta')).not.toContainText(/, Me|SUGGEST CHANGES|语言:/);
  await page.locator('.lang-switch a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/ai-agent\/posts\/give-ai-tasks-not-directions\/$/);
  expect(new URL(page.url()).pathname).not.toContain('/zh/');
  await expect(page.locator('.lang-switch [aria-current]')).toHaveText('EN');
  await expect(page.locator('.lang-switch li')).toHaveText(['中文', 'EN']);
  const chinese = page.locator('.lang-switch a[hreflang="zh"]');
  await chinese.focus();
  expect(await chinese.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(article + '$'));
});

test('phone lists match the prose size and all header controls fit the viewport', async ({ page }) => {
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(article);
    const metrics = await page.evaluate(() => {
      const paragraph = document.querySelector('.post-content > p')!;
      const list = document.querySelector('.post-content li')!;
      const prose = getComputedStyle(paragraph), item = getComputedStyle(list);
      return {
        prose: prose.fontSize, item: item.fontSize, line: parseFloat(prose.lineHeight) / parseFloat(prose.fontSize),
        edge: paragraph.getBoundingClientRect().left,
        controls: [...document.querySelectorAll('.nav .logo a, .nav .logo-switches > button, .lang-switch a, .lang-switch span, .nav .hamburger-menu')].map(el => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        }),
      };
    });
    expect(metrics.prose, `${width}px prose`).toBe('16px');
    expect(metrics.item, `${width}px list`).toBe(metrics.prose);
    expect(metrics.line).toBeCloseTo(1.75);
    expect(metrics.edge).toBe(20);
    for (const rect of metrics.controls) {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right, `${width}px header`).toBeLessThanOrEqual(width);
    }
    for (const el of await page.locator('.lang-switch a, .lang-switch span').all()) {
      const rect = await el.boundingBox();
      expect(rect!.width).toBeGreaterThanOrEqual(44);
      expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test('desktop prose has a bounded measure and theme colors remain legible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(article);
  const paragraph = page.locator('.post-content > p').first();
  const metrics = await paragraph.evaluate(el => {
    const c = getComputedStyle(el);
    return { size: c.fontSize, width: el.getBoundingClientRect().width, line: c.lineHeight, gap: c.marginBottom, color: c.color };
  });
  expect(metrics.size).toBe('18px');
  expect(metrics.width).toBe(648);
  expect(parseFloat(metrics.line)).toBeCloseTo(32.4);
  // WebKit rounds layout lengths to a 1/64px grid.
  expect(parseFloat(metrics.gap)).toBeCloseTo(20.7, 1);
  expect(metrics.color).toBe('rgb(46, 35, 32)');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('body')).toHaveClass(/dark/);
  await expect(paragraph).toHaveCSS('color', 'rgb(245, 243, 238)');
});

test('a slow Chinese font cannot displace an established reading position', async ({ page }) => {
  let releaseFonts = () => {};
  const gate = new Promise<void>(done => { releaseFonts = done; });
  const pending: string[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/fonts/noto-serif-sc/**/*.woff2', async route => {
    pending.push(route.request().url());
    await gate;
    await route.continue();
  });
  try {
    await page.goto(article, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => pending.length).toBeGreaterThan(0);
    // Explicit network stimulus: the optional font's short block period expires.
    await page.waitForTimeout(1200);
    const marker = page.locator('.post-content > p').nth(2);
    await marker.scrollIntoViewIfNeeded();
    const before = await marker.evaluate(el => ({ top: el.getBoundingClientRect().top, scroll: scrollY }));
    releaseFonts();
    await page.evaluate(() => document.fonts.ready);
    const after = await marker.evaluate(el => ({ top: el.getBoundingClientRect().top, scroll: scrollY }));
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(0.5);
    expect(after.scroll).toBe(before.scroll);
  } finally {
    releaseFonts();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
