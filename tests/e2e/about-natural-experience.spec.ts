import { newFrozenContext, test, expect } from '../helpers/frozen-site';

const arrowGlyphs = /[→←↗↓➜»▸›]/;

test.describe('About natural experience', () => {
  for (const route of ['/about/', '/zh/about/']) {
    test(`${route} hero names its identity, CTAs and photo choices without arrow glyphs`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const heading = page.getByRole('heading', { level: 1 });
      if (route.startsWith('/zh')) {
        await expect(heading).toContainText('构建系统');
        await expect(heading).toContainText('也理解自己');
      } else {
        await expect(heading).toContainText('Building systems');
        await expect(heading).toContainText('Staying curious');
      }
      // Identity lead grounded in the canonical person data.
      if (route.startsWith('/zh')) await expect(page.locator('.studio-hero__lead')).toContainText('熊鑫伟');
      else await expect(page.locator('.studio-hero__lead')).toContainText('Xinwei');
      await expect(page.locator('.studio-signature__portrait')).toBeVisible();

      // Primary CTA anchors the story; secondary keeps the writing route.
      const actions = page.locator('.studio-hero__actions a');
      await expect(actions).toHaveCount(2);
      await expect(actions.nth(0)).toHaveAttribute('href', '#story');
      await expect(actions.nth(1)).toHaveAttribute('href', route.startsWith('/zh') ? '/zh/articles/' : '/articles/');

      // Three named photo choices with a coherent selected state and 44px targets.
      const choices = page.locator('[data-hero-carousel] [data-deck-choice]');
      await expect(choices).toHaveCount(3);
      await expect(choices.nth(0)).toHaveAttribute('aria-pressed', 'true');
      for (const choice of await choices.all()) {
        const box = await choice.boundingBox();
        expect(box && box.height).toBeGreaterThanOrEqual(44);
      }
      await choices.nth(1).click();
      await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(choices.nth(0)).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('[data-hero-current]')).toHaveText('02');
      await expect(page.locator('[data-hero-slide][data-hero-position="active"]')).toHaveCount(1);
      // Captions sit outside the photograph, not over it.
      const caption = page.locator('[data-hero-slide][data-hero-position="active"] figcaption');
      await expect(caption).toBeVisible();
      await expect(page.locator('[data-hero-slide][data-hero-position="active"] img')).toBeVisible();
    });

    test(`${route} travel photos get a named picker instead of arrow buttons`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const road = page.locator('#studio-road');
      const thumbs = road.locator('.studio-road__picker [data-deck-choice]');
      await expect(thumbs).toHaveCount(11);
      await expect(thumbs.nth(0)).toHaveAttribute('aria-pressed', 'true');
      const firstBox = await thumbs.nth(0).boundingBox();
      expect(firstBox && firstBox.height).toBeGreaterThanOrEqual(44);
      await thumbs.nth(2).click();
      await expect(road.locator('[data-road-current]')).toHaveText('03');
      await expect(thumbs.nth(2)).toHaveAttribute('aria-pressed', 'true');
      await expect(road.locator('[data-road-slide][data-road-position="active"] figcaption')).toBeVisible();
      // Swiping the photograph itself still moves the selection.
      const photo = road.locator('[data-road-slide][data-road-position="active"] img');
      const bounds = await photo.boundingBox();
      if (!bounds) throw new Error('Travel photo has no layout box');
      const x = bounds.x + bounds.width * 0.7;
      const y = bounds.y + bounds.height * 0.5;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 120, y + 2, { steps: 8 });
      await page.mouse.up();
      await expect(road.locator('[data-road-current]')).toHaveText('04');
    });
  }

  test('the human story leads the page and expands in place from real posts', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/about/', { waitUntil: 'domcontentloaded' });
    const story = page.locator('#story');
    await expect(story).toBeVisible();
    await expect(page.locator('[data-page-wayfinder] a').first()).toHaveAttribute('href', '#story');
    await page.locator('.studio-hero__actions a[href="#story"]').click();
    await expect(story).toBeFocused();
    await expect(page).toHaveURL(/#story$/);
    const storyBeforeMap = await page.evaluate(() => {
      const storyEl = document.querySelector('#story');
      const map = document.querySelector('#blog-definition');
      return Boolean(storyEl && map && storyEl.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(storyBeforeMap).toBe(true);

    const chapters = story.locator('[data-story-chapter]');
    await expect(chapters).toHaveCount(5);
    await expect(story).toContainText('2021');
    await expect(story).toContainText('OpenIM');
    await expect(story).toContainText('尼泊尔');
    await expect(story).toContainText('8 月 10 日');
    // Historical tense, not promises.
    await expect(chapters.first()).toContainText('注册了');

    const details = chapters.first().locator('details');
    await expect(details).not.toHaveAttribute('open');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details.locator('.story-chapter__detail')).toBeVisible();
    await details.locator('summary').click();
    await expect(details).not.toHaveAttribute('open');

    const hrefs = await story.locator('a.story-chapter__link').evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href')));
    expect(hrefs).toEqual([
      '/zh/growth/posts/my-first-blog/',
      '/zh/growth/posts/2023-annual-summary-reflections-and-aspirations/',
      '/zh/growth/posts/2024-annual-review/',
      '/zh/growth/posts/2025-annual-review/',
      '/zh/growth/posts/2026-08-10-fear-does-not-decide-for-me/',
    ]);
    for (const href of hrefs) {
      const response = await page.request.get(href!);
      expect(response.ok(), `${href} should exist locally`).toBe(true);
    }
  });

  test('English story chapters stay bilingual and grounded', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const story = page.locator('#story');
    await expect(story.locator('[data-story-chapter]')).toHaveCount(5);
    await expect(story).toContainText('How I got here');
    await expect(story).toContainText('My First Blog');
    await expect(story).toContainText('OpenIM');
    const hrefs = await story.locator('a.story-chapter__link').evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href')));
    for (const href of hrefs) {
      const response = await page.request.get(href!);
      expect(response.ok(), `${href} should exist locally`).toBe(true);
    }
  });

  test('product exploration pauses rotation and closes cleanly when the selection changes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const products = page.locator('#studio-products');
    await products.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const toggle = products.locator('[data-autoplay-toggle]');
    await toggle.click();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.mouse.move(0, 0);
    await expect(products).toHaveAttribute('data-autoplay', 'running');

    const firstCard = products.locator('[data-card]').first();
    const details = firstCard.locator('[data-product-expand]');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(products).toHaveAttribute('data-expansion', 'open');
    await expect(products).toHaveAttribute('data-autoplay', 'paused');
    await expect(details.locator('.studio-product__desc')).toBeVisible();
    // The expansion shows real product fields and a separate visit link.
    await expect(details.locator('dl')).toBeVisible();
    await expect(firstCard.locator('a.studio-product__visit')).toHaveAttribute('href', /^https:\/\//);
    // Expanded state stays stable instead of rotating away.
    await page.clock.fastForward(12000);
    await expect(products.locator('[data-card-current]')).toHaveText('01');
    // The collapsed control stays reachable.
    await expect(details.locator('summary')).toBeVisible();

    // Changing selection closes the previous expansion and never strands focus.
    await firstCard.locator('a.studio-product__visit').focus();
    await page.keyboard.press('ArrowRight');
    await expect(details).not.toHaveAttribute('open');
    await expect(products).toHaveAttribute('data-expansion', 'closed');
    await expect(products).toBeFocused();
    await expect(products.locator('[data-card-current]')).toHaveText('02');
  });

  test('named choices drive every deck with a coherent selected state', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/about/', { waitUntil: 'domcontentloaded' });

    const workbench = page.locator('#workbench');
    const threadChoices = workbench.locator('[data-deck-choice]');
    await expect(threadChoices).toHaveCount(3);
    await threadChoices.nth(2).click();
    await expect(workbench.locator('[data-card-current]')).toHaveText('03');
    await expect(threadChoices.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(workbench.locator('[data-card-position="active"]')).toHaveCount(1);

    const products = page.locator('#studio-products');
    const productChoices = products.locator('[data-deck-choice]');
    const productCount = await products.locator('[data-card]').count();
    await expect(productChoices).toHaveCount(productCount);
    await productChoices.nth(4).click();
    await expect(products.locator('[data-card-current]')).toHaveText('05');
    await expect(productChoices.nth(4)).toHaveAttribute('aria-pressed', 'true');
    await expect(products.locator('[data-card][inert]')).toHaveCount(productCount - 1);
  });

  test('a stale View Transition callback cannot reopen a card after a fast selection change', async ({ page }) => {
    // Deferred View Transition stub: the update callback is captured and only
    // flushed later, so the race is deterministic instead of timing-dependent.
    await page.addInitScript(() => {
      const queue: Array<() => void> = [];
      (window as unknown as { __vtQueue: Array<() => void> }).__vtQueue = queue;
      (document as unknown as { startViewTransition?: unknown }).startViewTransition =
        function (updateCallback?: () => void) {
          if (updateCallback) queue.push(updateCallback);
          return {
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            finished: Promise.resolve(),
            skipTransition() { /* deferred stub: nothing to skip */ },
          };
        };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const products = page.locator('#studio-products');
    await products.scrollIntoViewIfNeeded();
    const firstCard = products.locator('[data-card]').first();
    const details = firstCard.locator('[data-product-expand]');

    // Click starts the transition, but its update callback is still pending.
    await details.locator('summary').click();
    await expect(products.locator('[data-card-current]')).toHaveText('01');
    // ArrowRight before the callback runs: selection change must win.
    await products.press('ArrowRight');
    await expect(products.locator('[data-card-current]')).toHaveText('02');
    // Flush every deferred update callback now.
    await page.evaluate(() => {
      const queue = (window as unknown as { __vtQueue: Array<() => void> }).__vtQueue;
      while (queue.length) (queue.shift() as () => void)();
    });
    // The stale callback must not reopen the now-inactive card.
    await expect(products.locator('[data-product-expand][open]')).toHaveCount(0);
    await expect(details).not.toHaveAttribute('open');
    await expect(products).toHaveAttribute('data-expansion', 'closed');
    await expect(products).toBeFocused();
    await expect(products.locator('[data-card-position="active"] [data-product-expand][open]')).toHaveCount(0);
  });

  test('real View Transitions keep focus and the collapse control reachable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const products = page.locator('#studio-products');
    await products.scrollIntoViewIfNeeded();
    const firstCard = products.locator('[data-card]').first();
    const summary = firstCard.locator('[data-product-expand] summary');
    const details = firstCard.locator('[data-product-expand]');
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(products).toHaveAttribute('data-expansion', 'open');
    await expect(summary).toBeFocused();
    await expect(firstCard.locator('.studio-product__visit')).toBeVisible();
    // Collapse stays a plain in-place action.
    await summary.click();
    await expect(details).not.toHaveAttribute('open');
    await expect(products).toHaveAttribute('data-expansion', 'closed');
    await expect(summary).toBeFocused();
  });

  test('normal motion carries the bounded scroll treatments and reduced motion disables them', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('[data-hero-carousel]');
    const chapter = page.locator('[data-story-chapter]').nth(3);
    const supportsTimeline = await page.evaluate(() => CSS.supports('animation-timeline', 'view()'));
    if (supportsTimeline) {
      await expect(hero).toHaveCSS('animation-timeline', 'view()');
      await expect(chapter).toHaveCSS('animation-timeline', 'view()');
    }
    // Scrolling a chapter into view reveals it fully: nothing waits forever.
    await chapter.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await expect.poll(async () => chapter.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(hero).toHaveCSS('animation-name', 'none');
    await expect(chapter).toHaveCSS('animation-name', 'none');
  });

  test('the About page shows no decorative arrows while arrow keys keep working', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/about/', { waitUntil: 'domcontentloaded' });
    // The global floating back-to-top arrow is hidden on About only.
    await expect(page.locator('#top-link')).toBeHidden();
    const visibleText = await page.locator('.about-page').innerText();
    expect(visibleText).not.toMatch(arrowGlyphs);
    const pseudoArrows = await page.evaluate((pattern) => {
      const bad: string[] = [];
      const arrow = new RegExp(pattern);
      document.querySelectorAll('.about-page a, .about-page button, .about-page summary').forEach((element) => {
        for (const pseudo of ['::before', '::after']) {
          const content = getComputedStyle(element, pseudo).content;
          if (arrow.test(content)) bad.push(`${element.className || element.tagName} ${pseudo} ${content}`);
        }
      });
      return bad;
    }, arrowGlyphs.source);
    expect(pseudoArrows).toEqual([]);
    // Keyboard arrows remain the deck navigation.
    const hero = page.locator('[data-hero-carousel]');
    await hero.focus();
    await hero.press('ArrowRight');
    await expect(hero.locator('[data-hero-current]')).toHaveText('02');
    await hero.press('End');
    await expect(hero.locator('[data-hero-current]')).toHaveText('03');
    await hero.press('Home');
    await expect(hero.locator('[data-hero-current]')).toHaveText('01');
  });

  test('the identity archive keeps machine endpoints and folds the long raw timeline', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const identity = page.locator('#identity');
    await expect(identity).toHaveAttribute('data-identity-json', '/data/identity.json');
    await expect(identity).toHaveAttribute('data-timeline-md', '/data/personal-timeline-2019-2026.md');
    await expect(identity.locator('a[href="/data/identity.json"]').first()).toBeVisible();
    await expect(identity.locator('.studio-identity__machine-links')).toBeVisible();
    const archive = identity.locator('[data-identity-timeline]');
    await expect(archive).not.toHaveAttribute('open');
    await archive.locator('summary').click();
    await expect(archive).toHaveAttribute('open', '');
    const milestones = identity.locator('.studio-identity__timeline li');
    expect(await milestones.count()).toBeGreaterThan(10);
  });

  test('small screens scroll the named choices without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/about/', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const strip = page.locator('.studio-choice-strip--products');
    await expect(strip).toHaveCSS('overflow-x', 'auto');
    const choiceBox = await strip.locator('[data-deck-choice]').first().boundingBox();
    expect(choiceBox && choiceBox.height).toBeGreaterThanOrEqual(44);
    // Expanded product content must not be clipped away on phones either.
    const firstCard = page.locator('#studio-products [data-card]').first();
    await firstCard.locator('[data-product-expand] summary').click();
    const visit = firstCard.locator('a.studio-product__visit');
    await expect(visit).toBeVisible();
    const visitBox = await visit.boundingBox();
    const viewport = page.viewportSize();
    expect(visitBox && viewport ? visitBox.x + visitBox.width <= viewport.width + 1 : false).toBe(true);
    const overflowAfter = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowAfter).toBeLessThanOrEqual(1);
  });

  test('without JavaScript the page degrades into a readable static archive', async ({ browser, baseURL }) => {
    const context = await newFrozenContext(browser, { baseURL, javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto('/about/');
    // Every photo, panel and product card is in normal flow and readable.
    await expect(page.locator('[data-hero-slide]')).toHaveCount(3);
    for (const figure of await page.locator('[data-hero-slide]').all()) await expect(figure).toBeVisible();
    const products = page.locator('#studio-products [data-card]');
    await expect(products).toHaveCount(7);
    for (const card of await products.all()) await expect(card).toBeVisible();
    // Native details still expands in place and keeps the real visit link.
    const firstCard = products.first();
    const details = firstCard.locator('[data-product-expand]');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    const link = firstCard.locator('a.studio-product__visit');
    await expect(link).toHaveAttribute('href', /^https:\/\//);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // The human story and the travel photographs are all present.
    await expect(page.locator('#story')).toBeVisible();
    for (const chapter of await page.locator('[data-story-chapter]').all()) await expect(chapter).toBeVisible();
    await expect(page.locator('#studio-road [data-road-slide]')).toHaveCount(11);
    // No inert traps and no script-only controls without scripts.
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0);
    await expect(page.locator('.studio-choice-strip').first()).toBeHidden();
    await expect(page.locator('.studio-road__picker')).toBeHidden();
    await context.close();
  });

  test('a blocked deck module falls back to all readable cards and native details', async ({ page }) => {
    await page.route('**/js/about-natural-experience*.js', (route) => route.abort());
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
    for (const card of await page.locator('#studio-products [data-card]').all()) {
      await expect(card).toBeVisible();
    }
    await expect(page.locator('.studio-choice-strip').first()).toBeHidden();
    const firstCard = page.locator('#studio-products [data-card]').first();
    await firstCard.locator('summary').click();
    await expect(firstCard.locator('.studio-product__visit')).toBeVisible();
    await expect(firstCard.locator('.studio-product__visit')).toHaveAttribute('href', /^https:\/\//);
  });

  test('the product visit action has readable contrast in both languages and themes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ['/about/', '/zh/about/']) {
      for (const theme of ['light', 'dark']) {
        await page.addInitScript((value) => localStorage.setItem('pref-theme', value), theme);
        await page.goto(route);
        const card = page.locator('#studio-products [data-card]').first();
        await card.locator('summary').click();
        const link = card.locator('.studio-product__visit');
        await expect(link).toBeVisible();
        const ratio = await link.evaluate((element) => {
          const style = getComputedStyle(element);
          function luminance(color: string) {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          }
          const foreground = luminance(style.color);
          const background = luminance(style.backgroundColor);
          return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        });
        expect(ratio, `${route} ${theme} visit link contrast`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
