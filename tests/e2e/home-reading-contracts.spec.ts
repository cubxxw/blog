import { test, expect } from '../helpers/frozen-site';
test.use({ reducedMotion: 'reduce' });

const home = (locale: string) => locale === 'zh' ? '/zh/' : '/';

test.describe('a server-rendered reading entrance', () => {
  test.use({ javaScriptEnabled: false });
  for (const locale of ['zh', 'en']) test(`${locale} featured writing is a real article link without scripts`, async ({ page }) => {
    await page.goto(home(locale));
    const start = page.locator('.hp-channel-panel[data-channel="latest"] .hp-featured');
    const title = (await start.locator('h3').textContent())!.trim();
    const href = (await start.getAttribute('href'))!;
    expect(href).toMatch(/\/(ai-agent|engineering|growth)\/posts\//);
    await expect(start.locator('.hp-post-meta')).not.toBeEmpty();
    await expect(start.locator('.hp-post-excerpt')).not.toBeEmpty();
    await expect(page.locator('.hp-reading-start, #hp-conversation')).toHaveCount(0);
    await start.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('.post-title')).toHaveText(title);
  });
});

for (const width of [320, 390]) for (const locale of ['zh', 'en']) {
  test(`${locale} compact hero keeps every contact reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(home(locale));
    const intro = (await page.locator('.hp-hero-intro').boundingBox())!;
    const social = page.locator('.hp-hero-socials');
    const socialBox = (await social.boundingBox())!;
    const bear = (await page.locator('#hp-about #hp-bear-ai').boundingBox())!;
    expect(socialBox.y).toBeGreaterThanOrEqual(intro.y + intro.height - 1);
    expect(bear.y).toBeGreaterThanOrEqual(socialBox.y + socialBox.height - 1);
    const controls = social.locator('a,button');
    await expect(controls).toHaveCount(10);
    const boxes = await controls.evaluateAll(nodes => nodes.map(el => {
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height };
    }));
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      if (i && Math.abs(box.y - boxes[i - 1].y) < 1) expect(box.x - boxes[i - 1].x - boxes[i - 1].width).toBeGreaterThanOrEqual(8);
      else if (i) expect(box.y - boxes[i - 1].y - boxes[i - 1].height).toBeGreaterThanOrEqual(8);
    }
    for (const anchor of await social.locator('a').all()) expect(await anchor.getAttribute('href')).toMatch(/^https:\/\//);
    for (const platform of ['wechat', 'xhs']) {
      const trigger = social.locator(`[data-contact-platform="${platform}"]`);
      await expect(trigger).toHaveAttribute('data-contact-qr', /.+/);
      await trigger.click(); await expect(page.locator('#wechat-contact-backdrop .wxc-card')).toBeVisible();
      await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    }
    if (locale === 'zh') {
      const word = page.locator('.hp-keep-word');
      await expect(word).toHaveText('项目');
      expect(await word.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return range.getClientRects().length; })).toBe(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const latest = page.locator('.hp-channel-panel[data-channel="latest"]');
    await expect(latest.locator('.hp-featured')).toHaveCount(1);
    await expect(latest.locator('.hp-post-card:not(.hp-featured)')).toHaveCount(2);
    for (const excerpt of await latest.locator('.hp-post-excerpt').all()) await expect(excerpt).toBeVisible();
    await expect(latest.locator('.hp-posts-list-row')).toHaveCount(4);
    // Older entries can fold into a column; the newest essay stays featured.
    const newestHref = await page.locator('.hp-recent-post-link').first().getAttribute('href');
    await expect(latest.locator('.hp-featured')).toHaveAttribute('href', newestHref!);
  });
}

for (const locale of ['zh', 'en']) for (const theme of ['light', 'dark']) {
  test(`${locale} ${theme} hero and writing retain their hierarchy across breakpoints`, async ({ page }) => {
    await page.addInitScript(mode => localStorage.setItem('pref-theme', mode), theme);
    await page.goto(home(locale));
    for (const width of [320, 390, 768, 769, 900, 901, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const hero = page.locator('#hp-about');
      await expect(hero.locator('#hp-bear-ai')).toHaveCount(1);
      await expect(page.locator('#hp-bear-ai')).toHaveCount(1);
      await expect(page.locator('.hp-reading-start, #hp-conversation')).toHaveCount(0);
      const intro = (await hero.locator('.hp-hero-intro').boundingBox())!;
      const bear = (await hero.locator('#hp-bear-ai').boundingBox())!;
      const social = (await hero.locator('.hp-hero-socials').boundingBox())!;
      if (width > 768) {
        expect(bear.x).toBeGreaterThanOrEqual(intro.x + intro.width - 1);
        expect(bear.x).toBeGreaterThanOrEqual(social.x + social.width - 1);
        // Every real prompt must fit every slot; random sampling alone can
        // miss a long English label at the narrowest two-column width.
        const collisions = await hero.locator('#hp-orbit').evaluate(orbit => {
          const root = orbit.closest<HTMLElement>('#hp-bear-ai')!;
          const pool: string[] = JSON.parse(root.dataset.lang === 'zh' ? root.dataset.bubblesZh! : root.dataset.bubblesEn!);
          const avatar = orbit.querySelector('#hp-avatar-btn')!.getBoundingClientRect();
          const failures: { slot: string | undefined; question: string }[] = [];
          for (const button of Array.from(orbit.querySelectorAll<HTMLButtonElement>('.hp-bear-bubble'))) {
            const original = button.textContent;
            for (const question of pool) {
              button.textContent = question;
              const box = button.getBoundingClientRect();
              const overlapX = Math.min(box.right, avatar.right) - Math.max(box.left, avatar.left);
              const overlapY = Math.min(box.bottom, avatar.bottom) - Math.max(box.top, avatar.top);
              if (overlapX > 1 && overlapY > 1) failures.push({ slot: button.dataset.slot, question });
            }
            button.textContent = original;
          }
          return failures;
        });
        expect(collisions, `${locale} questions overlap the portrait at ${width}px`).toEqual([]);
      } else expect(bear.y).toBeGreaterThanOrEqual(social.y + social.height - 1);
      const heroBox = (await hero.boundingBox())!, postsBox = (await page.locator('#hp-posts').boundingBox())!;
      expect(postsBox.y).toBeGreaterThanOrEqual(heroBox.y + heroBox.height - 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const cards = page.locator('.hp-channel-panel.is-active .hp-post-card');
      await expect(cards).toHaveCount(3);
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS('border-top-width', '1px');
        await expect(card.locator('.hp-post-excerpt')).toBeVisible();
      }
      const featured = await cards.first().evaluate(el => getComputedStyle(el).backgroundColor);
      const secondary = await cards.nth(1).evaluate(el => getComputedStyle(el).backgroundColor);
      expect(featured).not.toBe(secondary);
    }
  });
}

test('hero Bear retains its question, reply and focus across chat reopening', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/.netlify/functions/blog-ai', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: '这是一条用于验证原会话的受控回复。' }) }));
  await page.goto('/zh/');
  expect(await page.evaluate(() => {
    const posts = document.getElementById('hp-posts')!, bear = document.getElementById('hp-bear-ai')!;
    return !!(bear.compareDocumentPosition(posts) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  const root = page.locator('#hp-bear-ai'), original = await root.elementHandle();
  await expect(root.locator('.hp-bear-avatar-status')).toHaveText('AI 分身');
  await expect(root.locator('.hp-bear-hud')).toHaveCount(0);
  const question = (await root.locator('.hp-bear-bubble').first().textContent())!;
  await root.getByRole('button', { name: question, exact: true }).click();
  await expect(root.locator('#hp-chat-body')).toContainText('这是一条用于验证原会话的受控回复。');
  await root.locator('#hp-chat-close').click();
  await expect(root.getByRole('button', { name: question, exact: true })).toBeFocused();
  await root.locator('#hp-avatar-btn').click();
  await expect(root.locator('#hp-chat-body')).toContainText(question);
  await expect(root.locator('#hp-chat-body')).toContainText('这是一条用于验证原会话的受控回复。');
  expect(await root.evaluate((el, previous) => el === previous, original)).toBe(true);
  await expect(root.locator('.hp-bear-chat-meta')).toContainText('AI 分身');
  await root.locator('#hp-chat-close').click(); await expect(root.locator('#hp-avatar-btn')).toBeFocused();
});
