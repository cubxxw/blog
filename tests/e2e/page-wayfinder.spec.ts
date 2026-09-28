import { test, expect } from '@playwright/test';

test.describe('Home and About reading navigation', () => {
  for (const route of ['/', '/about/']) {
    test(`${route} reading index leaves content unobstructed at every width`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const width of [375, 768, 1024, 1440, 1720]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const destination = route === '/' ? '#hp-posts' : '#blog-definition';
        await page.evaluate(selector => {
          window.scrollTo(0, scrollY + document.querySelector(selector)!.getBoundingClientRect().top + 160);
        }, destination);
        await expect.poll(() => page.evaluate(selector => {
          const nav = document.querySelector('[data-page-wayfinder]')!.getBoundingClientRect();
          const content = document.querySelector(selector)!.getBoundingClientRect();
          return nav.bottom <= 0 || nav.right <= content.left - 16;
        }, destination), { message: `The index must not cover reading content at ${width}px` }).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 1720) {
          await expect(page.locator('[data-page-wayfinder]')).toBeInViewport();
          expect(await page.locator('[data-page-wayfinder]').evaluate(nav => nav.getBoundingClientRect().left)).toBeGreaterThanOrEqual(16);
          const lastLink = page.locator('[data-page-wayfinder] a').last();
          await lastLink.click();
          await expect(lastLink).toHaveAttribute('aria-current', 'location');
          const target = page.locator((await lastLink.getAttribute('href'))!);
          await expect(target).toBeFocused();
          expect(await target.evaluate(section => section.getBoundingClientRect().top)).toBeLessThan(160);
        }
      }
    });
  }

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
          const header = document.querySelector('.header-wrapper')!.getBoundingClientRect();
          const section = document.querySelector(selector)!.getBoundingClientRect();
          return { headerBottom: header.bottom, sectionTop: section.top, overflow: document.documentElement.scrollWidth > innerWidth };
        }, destination);
        expect(layout.overflow).toBe(false);
        expect(layout.sectionTop).toBeGreaterThanOrEqual(layout.headerBottom - 2);
        expect(layout.sectionTop).toBeLessThan(layout.headerBottom + 80);
        // Returning through browser history retains the native anchor semantics.
        await page.goBack();
        await expect(page).not.toHaveURL(new RegExp(`${destination}$`));
        // Natural scrolling, not only clicks, moves the reading indicator.
        await page.evaluate((selector) => {
          const target = document.querySelector(selector)!;
          const header = document.querySelector('.header-wrapper')!;
          window.scrollTo(0, scrollY + target.getBoundingClientRect().top
            - header.getBoundingClientRect().height);
        }, destination);
        await expect(link).toHaveAttribute('aria-current', 'location');
      });
    }
  }

  test('About deep links and Enter navigation work with ordinary motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/about/#studio-products');
    const nav = page.locator('[data-page-wayfinder]');
    await expect(nav.locator('a[href="#studio-products"]')).toHaveAttribute('aria-current', 'location');
    const road = nav.locator('a[href="#studio-road"]');
    await road.focus();
    await road.press('Enter');
    await expect(page).toHaveURL(/#studio-road$/);
    await expect(page.locator('#studio-road')).toBeFocused();
    await expect(road).toHaveAttribute('aria-current', 'location');
    await expect.poll(() => page.evaluate(() => {
      const top = document.querySelector('#studio-road')!.getBoundingClientRect().top;
      const header = document.querySelector('.header-wrapper')!.getBoundingClientRect();
      // The site header hides during downward scrolling; reserve its expanded
      // height so it can return without covering the destination heading.
      return top >= header.bottom - 2 && top < header.height + 80;
    })).toBe(true);
  });

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
