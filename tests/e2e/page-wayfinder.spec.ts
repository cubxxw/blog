import { test, expect } from '@playwright/test';

test.describe('Home and About reading navigation', () => {
  for (const prefix of ['', '/zh']) {
    for (const suffix of ['/', '/about/']) {
      test(`${prefix || 'en'}${suffix} native index, focus, and scroll position`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`${prefix}${suffix}`);
        const nav = page.locator('[data-page-wayfinder]');
        await expect(nav).toBeVisible();
        if (suffix === '/') {
          await page.locator('.hp-entry-actions a[href="#hp-posts"]').click();
          await expect(page.locator('#hp-posts')).toBeFocused();
        }
        const destination = suffix === '/' ? '#hp-projects' : '#studio-products';
        const link = nav.locator(`a[href="${destination}"]`);
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${destination}$`));
        await expect(page.locator(destination)).toBeFocused();
        await expect(link).toHaveAttribute('aria-current', 'location');
        const layout = await page.evaluate((selector) => {
          const index = document.querySelector('[data-page-wayfinder]')!.getBoundingClientRect();
          const section = document.querySelector(selector)!.getBoundingClientRect();
          return { indexBottom: index.bottom, sectionTop: section.top, overflow: document.documentElement.scrollWidth > innerWidth };
        }, destination);
        expect(layout.overflow).toBe(false);
        expect(layout.sectionTop).toBeGreaterThanOrEqual(layout.indexBottom - 2);
        // Returning through browser history retains the native anchor semantics.
        await page.goBack();
        await expect(page).not.toHaveURL(new RegExp(`${destination}$`));
        // Natural scrolling, not only clicks, moves the reading indicator.
        await page.evaluate((selector) => {
          const target = document.querySelector(selector)!;
          const index = document.querySelector('[data-page-wayfinder]')!;
          const header = document.querySelector('.header-wrapper')!;
          window.scrollTo(0, scrollY + target.getBoundingClientRect().top
            - header.getBoundingClientRect().height - index.getBoundingClientRect().height);
        }, destination);
        await expect(link).toHaveAttribute('aria-current', 'location');
      });
    }
  }

  test('homepage primary routes and navigation remain usable without JavaScript', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
    const page = await context.newPage();
    await page.goto('/zh/');
    await expect(page.locator('.hp-entry-actions a').first()).toHaveAttribute('href', '#hp-posts');
    await expect(page.locator('.hp-entry-actions a').nth(1)).toHaveAttribute('href', '/zh/projects/');
    await page.locator('[data-page-wayfinder] a[href="#hp-books"]').click();
    await expect(page).toHaveURL(/#hp-books$/);
    await expect(page.locator('#hp-books')).toBeVisible();
    await context.close();
  });
});
