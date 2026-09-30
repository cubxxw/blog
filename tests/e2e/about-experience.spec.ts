import { test, expect, type Locator, type Page } from '../helpers/frozen-site';

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

const playPattern = /Play|播放/;
const pausePattern = /Pause|暂停/;

test.describe('About deck interaction', () => {
  for (const route of ['/about/', '/zh/about/']) {
    test(`${route} closed mobile navigation cannot intercept page content or focus`, async ({ page, isMobile }) => {
      test.skip(!isMobile, 'The mobile menu has an inline submenu');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const toggle = page.locator('.hamburger-menu');
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
      // Changing selection closes the previous expansion instead of stranding it.
      await expect(products.locator('[data-product-expand][open]')).toHaveCount(0);
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
      const activeSummary = products.locator('[data-card-position="active"] [data-product-expand] summary');
      await activeSummary.focus();
      await expect(activeSummary).toBeFocused();
      await activeSummary.press('ArrowRight');
      await expect(products).toBeFocused();
      await expect(products.locator('[data-card-current]')).toHaveText('02');
      await products.locator('[data-card][inert] summary').first().evaluate((element: HTMLElement) => element.focus());
      await expect(products).toBeFocused();
      await products.press('Tab');
      // Controls remain reachable and inactive product cards do not enter the tab order.
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

    test(`${route} autoplay is opt-in and follows the reader's explicit preference`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.clock.install();
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const carousel = page.locator('[data-hero-carousel]');
      const counter = carousel.locator('[data-hero-current]');
      const toggle = carousel.locator('[data-hero-toggle]');
      // Paused at load: rotation only starts when a reader asks for it.
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(toggle).toHaveText(playPattern);
      await expect(carousel).toHaveAttribute('data-autoplay', 'paused');
      await page.clock.fastForward(9000);
      await expect(counter).toHaveText('01');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(toggle).toHaveText(pausePattern);
      await page.mouse.move(0, 0);
      await page.locator('h1').click();
      await expect(carousel).toHaveAttribute('data-autoplay', 'running');
      await page.clock.fastForward(4000);
      await expect(counter).toHaveText('02');
      await carousel.locator('[data-deck-choice]').nth(2).click();
      await expect(counter).toHaveText('03');
      await page.mouse.move(0, 0);
      await page.locator('h1').click();
      await expect(carousel).toHaveAttribute('data-autoplay', 'running');
      await page.clock.fastForward(4000);
      await expect(counter).toHaveText('01');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.clock.fastForward(8000);
      await expect(counter).toHaveText('01');
    });
  }

  test('each visible deck rotates only after opt-in and pauses on demand', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const decks = [
      { region: '[data-hero-carousel]', counter: '[data-hero-current]' },
      { region: '#workbench', counter: '[data-card-current]' },
      { region: '#studio-products', counter: '[data-card-current]' },
      { region: '#studio-road', counter: '[data-road-current]' },
    ];
    await expect(page.locator('#studio-road [data-road-position="next"] img')).toHaveAttribute('loading', 'lazy');
    for (const deck of decks) {
      const region = page.locator(deck.region);
      await region.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await expect(region).toHaveAttribute('data-autoplay', 'paused');
      const toggle = region.locator('[data-autoplay-toggle]');
      await toggle.click();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.mouse.move(0, 0);
      await expect(region).toHaveAttribute('data-autoplay', 'running');
      if (deck.region === '#studio-road') {
        await expect(region.locator('[data-road-position="next"] img')).toHaveAttribute('loading', 'eager');
      }
      const before = await region.locator(deck.counter).textContent();
      // A real mouse pointer still pauses reading after touch compatibility
      // mouse events have been excluded by the controller.
      await region.hover();
      await expect(region).toHaveAttribute('data-autoplay', 'paused');
      await page.clock.fastForward(6200);
      await expect(region.locator(deck.counter)).toHaveText(before || '');
      await page.mouse.move(0, 0);
      await expect(region).toHaveAttribute('data-autoplay', 'running');
      await page.clock.fastForward(6200);
      await expect(region.locator(deck.counter)).not.toHaveText(before || '');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      const pausedAt = await region.locator(deck.counter).textContent();
      await page.clock.fastForward(12000);
      await expect(region.locator(deck.counter)).toHaveText(pausedAt || '');
    }
  });

  test('reduced motion disables every deck and preference changes never restart rotation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('[data-hero-carousel]');
    const toggle = hero.locator('[data-hero-toggle]');
    await toggle.click();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.mouse.move(0, 0);
    await expect(hero).toHaveAttribute('data-autoplay', 'running');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(toggle).toBeDisabled();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    // Visible label stays short; the reason lives in the accessible name.
    await expect(toggle).toHaveText(playPattern);
    await expect(toggle).toHaveAttribute('aria-label', /Reduced motion|减少动态效果/);
    await expect(hero).toHaveAttribute('data-autoplay', 'paused');
    for (const selector of ['[data-hero-carousel]', '#workbench', '#studio-products', '#studio-road']) {
      await expect(page.locator(selector).locator('[data-autoplay-toggle]')).toBeDisabled();
      await expect(page.locator(selector)).toHaveAttribute('data-autoplay', 'paused');
    }
    await page.clock.fastForward(16000);
    await expect(page.locator('[data-road-current]')).toHaveText('01');
    await expect(hero.locator('[data-hero-current]')).toHaveText('01');
    // Restoring the preference must not surprise the reader with new motion.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(hero).toHaveAttribute('data-autoplay', 'paused');
    await page.clock.fastForward(12000);
    await expect(hero.locator('[data-hero-current]')).toHaveText('01');
  });
});
