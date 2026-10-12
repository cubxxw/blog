import { test, expect } from '../helpers/frozen-site';

for (const route of ['/ai-agent/', '/zh/ai-agent/', '/engineering/', '/zh/engineering/', '/columns/agent-engineering/', '/zh/columns/agent-engineering/']) {
  test(`${route} keeps responsive channel layout and theme after CSS scoping`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible();
    const container = page.locator('.aia-page, .eng-page, .column-page');
    await expect(container).toBeVisible();
    for (const dark of [false, true]) {
      if (dark) {
        await page.locator('#theme-toggle').click();
        await expect(page.locator('body')).toHaveClass(/dark/);
      }
      const size = await container.evaluate(element => ({
        width: element.getBoundingClientRect().width,
        viewport: window.innerWidth,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      }));
      expect(size.width).toBeGreaterThan(200);
      expect(size.width).toBeLessThanOrEqual(size.viewport);
      expect(size.overflow).toBeLessThanOrEqual(1);
    }
  });
}
