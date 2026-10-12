import { test, expect } from '../helpers/frozen-site';

test('mobile AI enhancement occupies its reserved space without moving the article rail', async ({ page }) => {
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
      return { y: r.y, width: r.width, height: r.height, overflow: el.scrollWidth > el.clientWidth };
    }));
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.overflow).toBe(false);
    }
    if (width > 360) expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(1);
    else expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
    await expect(links.first()).toHaveAttribute('href', '#hp-posts');
    await expect(links.last()).toHaveAttribute('href', /\/projects\/$/);
  }
});

test('Chinese long prose fonts activate when readable prose enters the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 823 });
  await page.goto('/zh/growth/posts/2025-annual-review/');
  const fonts = page.locator('#zh-prose-fonts');
  await expect(fonts).toHaveAttribute('rel', 'preload');
  await expect(page.locator('.post-content')).toContainText('在悬崖边');
  await page.locator('.post-content').scrollIntoViewIfNeeded();
  await expect(fonts).toHaveAttribute('rel', 'stylesheet');
  await expect(page.locator('.post-content')).toBeInViewport();
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
