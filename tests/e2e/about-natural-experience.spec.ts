import { newFrozenContext, test, expect, type Locator, type Page } from '../helpers/frozen-site';

const rails = [
  { region: '[data-hero-carousel]', track: '.studio-hero__viewport', items: '[data-hero-slide]', counter: '[data-hero-current]' },
  { region: '#workbench', track: '[data-card-track]', items: '[data-card]', counter: '[data-card-current]' },
  { region: '#studio-products', track: '[data-card-track]', items: '[data-card]', counter: '[data-card-current]' },
  { region: '#studio-road', track: '.studio-road__viewport', items: '[data-road-slide]', counter: '[data-road-current]' },
];

async function nativeSwipe(page: Page, track: Locator, vertical = false) {
  const box = await track.boundingBox();
  if (!box) throw new Error('Missing native rail');
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width * .78;
  const y = box.y + Math.min(box.height * .4, 160);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 12; step++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - (vertical ? 0 : box.width * .64) * step / 12, y: y - (vertical ? 170 : 0) * step / 12 }],
    });
    await page.waitForTimeout(25);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

test.describe('About natural albums', () => {
  for (const route of ['/about/', '/zh/about/']) {
    test(`${route} starts with the person, real photos and optional detail`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('[data-about-studio]')).toHaveAttribute('data-deck-ready', 'true');
      await expect(page.locator('.studio-hero h1')).toHaveText(route.startsWith('/zh') ? '熊鑫伟' : 'Xinwei Xiong');
      await expect(page.locator('[data-autoplay-toggle],.studio-deck-play')).toHaveCount(0);
      const actions = page.locator('.studio-hero__actions a');
      await expect(actions.first()).toHaveAttribute('href', '#story');
      await expect(actions.last()).toHaveAttribute('href', route.startsWith('/zh') ? '/zh/articles/' : '/articles/');
      await expect(page.locator('[data-hero-slide]')).toHaveCount(3);
      await expect(page.locator('[data-road-slide]')).toHaveCount(11);
      await expect(page.locator('.studio-road__picker')).toHaveCount(0);
      await expect(page.locator('.studio-identity__archive')).not.toHaveAttribute('open');
      await expect(page.locator('.studio-interview-disclosure')).not.toHaveAttribute('open');
      expect((await page.locator('#tell-me').boundingBox())!.height).toBeLessThan(160);
      expect((await page.locator('.studio-coda').boundingBox())!.height).toBeLessThan(300);
      await expect(page.locator('#tell-me .studio-interview__native')).toBeHidden();
      const caption = page.locator('[data-hero-slide]').first().locator('figcaption');
      const image = page.locator('[data-hero-slide]').first().locator('img');
      expect((await caption.boundingBox())!.y).toBeGreaterThanOrEqual((await image.boundingBox())!.y + (await image.boundingBox())!.height - 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });

    test(`${route} supports track-local keys, choices and focus without inaccessible cards`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      for (const rail of rails) {
        const region = page.locator(rail.region);
        const track = region.locator(rail.track);
        const count = await region.locator(rail.items).count();
        await region.focus();
        await region.press('ArrowRight');
        await expect(region.locator(rail.counter)).toHaveText('02');
        await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        await region.press('End');
        await expect(region.locator(rail.counter)).toHaveText(String(count).padStart(2, '0'));
        await region.press('Home');
        await expect(region.locator(rail.counter)).toHaveText('01');
        await region.press('ArrowLeft');
        await expect(region.locator(rail.counter)).toHaveText(String(count).padStart(2, '0'));
        await expect(region.locator(`${rail.items}[inert],${rail.items}[aria-hidden="true"]`)).toHaveCount(0);
        const choices = region.locator('[data-deck-choice]');
        if (await choices.count()) {
          const before = await page.evaluate(() => scrollY);
          await choices.first().evaluate((el: HTMLElement) => el.click());
          await expect(region.locator(rail.counter)).toHaveText('01');
          expect(await page.evaluate(() => scrollY)).toBe(before);
          await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
        }
      }
      const products = page.locator('#studio-products');
      const summary = products.locator('[data-card]').nth(3).locator('summary');
      await summary.focus();
      await expect(summary).toBeFocused();
      await expect(products.locator('[data-card-current]')).toHaveText('04');
      await summary.press('Enter');
      await expect(products.locator('[data-card]').nth(3).locator('details')).toHaveAttribute('open', '');
      await products.evaluate(el => {
        const input = document.createElement('input');
        input.setAttribute('data-test-editor', '');
        el.append(input);
      });
      const editor = products.locator('[data-test-editor]');
      await editor.fill('abc');
      await editor.press('Home');
      await editor.press('ArrowRight');
      await expect(editor).toBeFocused();
      await expect(products.locator('[data-card-current]')).toHaveText('04');
    });

    test(`${route} real phone gestures browse every rail and retain vertical scrolling`, async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Touch acceptance uses the phone viewport');
      await page.goto(route);
      for (const rail of rails) {
        const region = page.locator(rail.region);
        await region.scrollIntoViewIfNeeded();
        const track = region.locator(rail.track);
        const before = await page.evaluate(() => scrollY);
        await nativeSwipe(page, track);
        await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(10);
        await expect(region.locator(rail.counter)).not.toHaveText('01');
        expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(5);
      }
      const track = page.locator('#studio-road .studio-road__viewport');
      await track.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => scrollY);
      await nativeSwipe(page, track, true);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 40);
    });

    test(`${route} does not rotate over time or after a motion preference change`, async ({ page }) => {
      await page.clock.install();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(route);
      await expect(page.locator('[data-deck-ready]')).toHaveAttribute('data-deck-ready', 'true');
      await page.clock.fastForward(20_000);
      for (const rail of rails) await expect(page.locator(rail.region).locator(rail.counter)).toHaveText('01');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const hero = page.locator('[data-hero-carousel]');
      await hero.locator('[data-deck-choice]').nth(1).click();
      await expect(hero.locator('[data-hero-current]')).toHaveText('02');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.clock.fastForward(20_000);
      await expect(hero.locator('[data-hero-current]')).toHaveText('02');
    });

    test(`${route} public story and identity remain complete behind short summaries`, async ({ page }) => {
      await page.goto(route);
      const chapters = page.locator('[data-story-chapter]');
      await expect(chapters).toHaveCount(5);
      for (const chapter of await chapters.all()) {
        const details = chapter.locator('details');
        await details.locator('summary').click();
        await expect(details).toHaveAttribute('open', '');
        await expect(details.locator('.story-chapter__detail')).toBeVisible();
        const link = chapter.locator('a.story-chapter__link');
        expect((await page.request.get((await link.getAttribute('href'))!)).ok()).toBe(true);
      }
      await page.locator('.studio-identity__archive > summary').click();
      await expect(page.locator('.studio-identity__timeline')).toBeVisible();
      await expect(page.locator('.studio-identity__machine')).toBeVisible();
      expect((await page.request.get('/data/identity.json')).ok()).toBe(true);
      expect((await page.request.get('/data/personal-timeline-2019-2026.md')).ok()).toBe(true);
    });

    for (const fallback of ['no JavaScript', 'blocked module']) {
      test(`${route} ${fallback} keeps every card in readable document flow`, async ({ browser, baseURL, viewport }) => {
        const context = await newFrozenContext(browser, { baseURL, viewport, javaScriptEnabled: fallback !== 'no JavaScript' });
        if (fallback === 'blocked module') await context.route('**/js/about-natural-experience*', request => request.abort());
        const page = await context.newPage();
        try {
          await page.goto(route);
          if (fallback === 'blocked module') await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
          for (const rail of rails) {
            const items = page.locator(rail.region).locator(rail.items);
            let previousBottom = 0;
            for (const item of await items.all()) {
              const box = await item.boundingBox();
              expect(box!.height).toBeGreaterThan(100);
              expect(box!.y).toBeGreaterThanOrEqual(previousBottom - 1);
              previousBottom = box!.y + box!.height;
            }
          }
          const details = page.locator('#studio-products [data-card]').nth(1).locator('details');
          await details.locator('summary').click();
          await expect(details).toHaveAttribute('open', '');
          await expect(details.locator('a.studio-product__visit')).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        } finally { await context.unrouteAll({ behavior: 'wait' }); await context.close(); }
      });
    }
  }
});
