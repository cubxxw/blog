import { test, expect, type Locator, type Page } from '../helpers/frozen-site';

async function swipeLeft(page: Page, surface: Locator) {
  await surface.scrollIntoViewIfNeeded();
  const bounds = await surface.boundingBox();
  if (!bounds) throw new Error('Carousel surface has no layout box');
  const x = bounds.x + bounds.width * 0.72;
  const y = bounds.y + Math.min(bounds.height / 2, 160);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - bounds.width * 0.7, y + 2, { steps: 8 });
  await page.mouse.up();
}

test.describe('About deck interaction', () => {
  for (const route of ['/about/', '/zh/about/']) {
    test(`${route} closed mobile navigation cannot intercept page content or focus`, async ({ page, isMobile }) => {
      test.skip(!isMobile, 'The mobile menu has an inline submenu');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const toggle = page.locator('.hamburger-menu');
      const brand = await page.locator('.header .logo').boundingBox();
      const menuButton = await toggle.boundingBox();
      expect(Math.abs(menuButton!.y + menuButton!.height / 2 - brand!.y - brand!.height / 2)).toBeLessThan(4);
      const submenuLink = page.locator('#menu .nav-sub a').first();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(submenuLink).toBeHidden();
      await page.locator('h1').click();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(submenuLink).toBeVisible();
      await submenuLink.focus();
      await expect(submenuLink).toBeFocused();
      // Close through the real menu controller while the child retains focus:
      // clicking the hamburger first would mask a competing :focus-within rule.
      await page.evaluate(() => (window as unknown as { toggleMenu: () => void }).toggleMenu());
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(submenuLink).toHaveCSS('visibility', 'hidden');
      await expect(submenuLink).toBeHidden();
      await expect(submenuLink).not.toBeFocused();
      await submenuLink.evaluate((element: HTMLAnchorElement) => element.focus());
      await expect(submenuLink).not.toBeFocused();
      await page.locator('h1').click();
      const destination = await submenuLink.evaluate((element: HTMLAnchorElement) => element.href);
      await toggle.click();
      await submenuLink.click();
      await expect(page).toHaveURL(destination);
      await expect(page.locator('main')).toBeVisible();
    });

    test(`${route} keeps real product links and distinguishes clicks from drags`, async ({ page, context }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const products = page.locator('#studio-products');
      const firstCard = products.locator('[data-card]').first();
      // Exploration expands in place; the visit link is the one real exit.
      await firstCard.locator('[data-product-expand] summary').click();
      const link = firstCard.locator('a.studio-product__visit');
      await expect(link).toBeVisible();
      const destination = await link.evaluate((element: HTMLAnchorElement) => element.href);
      expect(destination).toMatch(/^https:\/\//);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
      // A real popup is required; its destination is mocked to avoid external services.
      await context.route(`${destination}**`, (request) => request.fulfill({ contentType: 'text/html', body: '<title>Product destination</title>' }));
      const popupReady = page.waitForEvent('popup');
      await link.click();
      const popup = await popupReady;
      await expect(popup).toHaveURL(destination);
      await popup.close();
      await expect(products.locator('[data-card-current]')).toHaveText('01');

      let unexpectedPopup = false;
      page.on('popup', () => { unexpectedPopup = true; });
      await swipeLeft(page, firstCard.locator('img').first());
      await expect(products.locator('[data-card-current]')).toHaveText('02');
      expect(unexpectedPopup).toBe(false);
      // Browsing a rail does not discard a detail the reader explicitly opened.
      await expect(firstCard.locator('[data-product-expand]')).toHaveAttribute('open', '');
      await expect(products.locator('[inert]')).toHaveCount(0);
      await products.locator('[data-deck-choice]').nth(2).click();
      await expect(products.locator('[data-card-current]')).toHaveText('03');
      await expect(firstCard.locator('[data-product-expand]')).not.toHaveAttribute('open', '');
    });

  }
});
