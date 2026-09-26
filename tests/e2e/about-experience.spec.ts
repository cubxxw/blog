import { test, expect, type Locator, type Page } from '@playwright/test';

async function swipeLeft(page: Page, surface: Locator) {
  await surface.scrollIntoViewIfNeeded();
  const bounds = await surface.boundingBox();
  if (!bounds) throw new Error('Carousel surface has no layout box');
  const x = bounds.x + bounds.width * 0.72;
  const y = bounds.y + Math.min(bounds.height / 2, 160);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - Math.min(180, bounds.width * 0.5), y + 2, { steps: 8 });
  await page.mouse.up();
}

test.describe('About carousel interaction', () => {
  for (const route of ['/about/', '/zh/about/']) {
    test(`${route} keeps real product links and distinguishes clicks from drags`, async ({ page, context }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const products = page.locator('[data-card-carousel].studio-products');
      const active = products.locator('[data-card-position="active"]');
      const link = active.locator('a');
      const destination = await link.evaluate((element: HTMLAnchorElement) => element.href);
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
      await swipeLeft(page, active.locator('img').first());
      await expect(products.locator('[data-card-current]')).toHaveText('02');
      expect(unexpectedPopup).toBe(false);
      await expect(products.locator('[data-card-position="active"]')).not.toHaveAttribute('inert');
      const inactive = products.locator('[data-card]:not([data-card-position="active"])');
      for (const card of await inactive.all()) await expect(card).toHaveAttribute('inert', '');
    });

    test(`${route} provides scoped keyboard navigation and excludes hidden content from focus`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const decks = [
        { region: '[data-hero-carousel]', card: '[data-hero-slide]', counter: '[data-hero-current]' },
        { region: '#workbench', card: '[data-card]', counter: '[data-card-current]' },
        { region: '#studio-products', card: '[data-card]', counter: '[data-card-current]' },
        { region: '#studio-road', card: '[data-road-slide]', counter: '[data-road-current]' },
      ];
      for (const deck of decks) {
        const region = page.locator(deck.region);
        const count = await region.locator(deck.card).count();
        await region.focus();
        await region.press('ArrowRight');
        await expect(region.locator(deck.counter)).toHaveText('02');
        await region.press('End');
        await expect(region.locator(deck.counter)).toHaveText(String(count).padStart(2, '0'));
        await region.press('Home');
        await expect(region.locator(deck.counter)).toHaveText('01');
        await region.press('ArrowLeft');
        await expect(region.locator(deck.counter)).toHaveText(String(count).padStart(2, '0'));
        await expect(region.locator(`${deck.card}[inert]`)).toHaveCount(count - 1);
      }
      const products = page.locator('#studio-products');
      await products.press('Home');
      const firstLink = products.locator('[data-card-position="active"] a');
      await firstLink.focus();
      await expect(firstLink).toBeFocused();
      await firstLink.press('ArrowRight');
      await expect(products).toBeFocused();
      await expect(products.locator('[data-card-current]')).toHaveText('02');
      await products.locator('[data-card][inert] a').first().evaluate((element: HTMLAnchorElement) => element.focus());
      await expect(products).toBeFocused();
      await products.press('Tab');
      // Controls remain reachable and inactive product links do not enter the tab order.
      expect(await page.evaluate(() => !!document.activeElement?.closest('[inert]'))).toBe(false);

      // Guard editing semantics even when a future card contains an input or editable text.
      await products.evaluate((element) => {
        const input = document.createElement('input');
        input.setAttribute('data-test-editor', '');
        element.append(input);
      });
      const input = products.locator('[data-test-editor]');
      await input.fill('abc');
      await input.press('Home');
      await input.press('ArrowRight');
      await expect(products.locator('[data-card-current]')).toHaveText('02');
      await expect(input).toBeFocused();
    });

    test(`${route} starts paused and only explicit play enables automatic rotation`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.clock.install();
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const carousel = page.locator('[data-hero-carousel]');
      const counter = carousel.locator('[data-hero-current]');
      const toggle = carousel.locator('[data-hero-toggle]');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.clock.fastForward(8000);
      await expect(counter).toHaveText('01');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await page.clock.fastForward(4000);
      await expect(counter).toHaveText('02');
      await carousel.locator('[data-hero-next]').click();
      await expect(counter).toHaveText('03');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.mouse.move(0, 0);
      await page.locator('h1').click();
      await page.clock.fastForward(8000);
      await expect(counter).toHaveText('03');
      await toggle.click();
      await swipeLeft(page, carousel.locator('[data-hero-position="active"] img'));
      await expect(counter).toHaveText('01');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.clock.fastForward(8000);
      await expect(counter).toHaveText('01');
    });
  }

  test('reduced motion disables autoplay and changing the preference never resumes it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const carousel = page.locator('[data-hero-carousel]');
    const toggle = carousel.locator('[data-hero-toggle]');
    const counter = carousel.locator('[data-hero-current]');
    await expect(toggle).toBeDisabled();
    await page.clock.fastForward(8000);
    await expect(counter).toHaveText('01');
    await carousel.locator('[data-hero-next]').click();
    await expect(counter).toHaveText('02');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(toggle).toBeEnabled();
    await page.clock.fastForward(8000);
    await expect(counter).toHaveText('02');
    await toggle.click();
    await page.clock.fastForward(4000);
    await expect(counter).toHaveText('03');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(toggle).toBeDisabled();
    await page.clock.fastForward(8000);
    await expect(counter).toHaveText('03');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.clock.fastForward(8000);
    await expect(counter).toHaveText('03');
  });
});
