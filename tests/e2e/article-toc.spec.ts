import { test, expect } from '@playwright/test';

const ARTICLE_URL = '/ai-technology/posts/agent-identity-from-locke-to-openclaw/';

test.describe('Article TOC Navigation', () => {
  test('desktop - clicking TOC item scrolls to heading and highlights TOC link', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');

    await page.goto(ARTICLE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // allow toc-highlight.js to initialize

    // Find TOC links (works with both sidebar and inline TOC layouts)
    const tocLinks = page.locator('#TableOfContents a');
    const count = await tocLinks.count();
    // Need at least 2 TOC items to click the second one
    expect(count).toBeGreaterThanOrEqual(2);

    // Get the second TOC link's href
    const secondLink = tocLinks.nth(1);
    const href = await secondLink.getAttribute('href');
    expect(href).toBeTruthy();

    const headingId = href!.slice(1); // strip '#'

    // Click the second TOC item via JS
    await page.evaluate((selector) => {
      const link = document.querySelector(selector) as HTMLElement;
      if (link) link.click();
    }, `#TableOfContents a[href="${href}"]`);

    await page.waitForTimeout(800); // allow smooth scroll + IntersectionObserver

    // Assert the heading is in view (or near top of viewport)
    const headingRect = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }, headingId);

    expect(headingRect).not.toBeNull();
    // Heading should be scrolled into view (top within viewport height)
    expect(headingRect!.top).toBeLessThan(page.viewportSize()!.height);

    // Assert URL hash updated
    expect(page.url()).toContain(`#${headingId}`);

    // Assert TOC link is highlighted (any active class convention)
    const isActive = await secondLink.evaluate((el) =>
      el.classList.contains('toc-sidebar-active') ||
      el.classList.contains('toc-active') ||
      el.classList.contains('active') ||
      el.closest('li')?.classList.contains('active') || false
    );
    expect(isActive).toBe(true);
  });
});
