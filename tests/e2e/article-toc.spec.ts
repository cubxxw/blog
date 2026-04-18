import { test, expect } from '@playwright/test';

const ARTICLE_URL = '/ai-technology/posts/agent-identity-from-locke-to-openclaw/';

test.describe('Article TOC Navigation', () => {
  test('desktop - clicking TOC item scrolls to heading', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');

    await page.goto(ARTICLE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Support both inline TOC (.toc-inline) and sidebar TOC (.toc-side__nav)
    const tocLinks = page.locator('.toc-inline a, .toc-side__nav a');
    const count = await tocLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const secondLink = tocLinks.nth(1);
    const href = await secondLink.getAttribute('href');
    expect(href).toBeTruthy();

    const headingId = href!.slice(1); // strip '#'

    // Click via JS to handle any overflow/visibility constraints
    await page.evaluate((h) => {
      const link = document.querySelector(`.toc-inline a[href="${h}"], .toc-side__nav a[href="${h}"]`) as HTMLElement;
      if (link) link.click();
    }, href);

    await page.waitForTimeout(800);

    // Assert heading is scrolled into view
    const headingRect = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }, headingId);

    expect(headingRect).not.toBeNull();
    expect(headingRect!.top).toBeLessThan(page.viewportSize()!.height);

    // Assert URL hash updated
    expect(page.url()).toContain(`#${headingId}`);
  });
});
