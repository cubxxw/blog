import { test, expect, type Page, type Locator } from '../helpers/frozen-site';

test.use({ reducedMotion: 'reduce' });

const home = (locale: string) => locale === 'zh' ? '/zh/' : '/';
const copy = {
  zh: {
    bio: '这里公开我的 AI 工作流、真实项目与工程方法，也记录关于个人成长、哲学与人生的长期思考。',
    reading: '开始阅读', about: '了解这个博客', channels: '文章频道',
    next: '下一个频道', previous: '上一个频道', chat: '与 Bear 对话',
  },
  en: {
    bio: 'I openly document AI workflows, real projects, and engineering judgment, alongside long-term writing on growth, philosophy, and life.',
    reading: 'Start reading', about: 'About this blog', channels: 'Writing channels',
    next: 'Next channel', previous: 'Previous channel', chat: 'Talk to Bear',
  },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/livereload.js*', route => route.abort());
});

async function expectActiveChannelVisible(rail: Locator) {
  const active = rail.locator('a[aria-current="true"]');
  await expect(active).toHaveCount(1);
  await expect.poll(() => active.evaluate(el => {
    const label = el.querySelector('.hp-rail-tab-name')!.getBoundingClientRect();
    const track = el.parentElement!.getBoundingClientRect();
    return label.left >= track.left - 1 && label.right <= track.right + 1;
  })).toBe(true);
  const href = await active.evaluate((el: HTMLAnchorElement) => el.href);
  await expect.poll(() => rail.page().locator('#hp-posts-action').evaluate((el: HTMLAnchorElement) => el.href)).toBe(href);
  await expect(rail.page().locator('#hp-channel-panels > :not([hidden])')).toHaveCount(1);
}

async function swipeChannels(page: Page, rail: Locator) {
  const track = rail.locator('#hp-rail-track');
  const box = (await track.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  try {
    for (let swipe = 0; swipe < 2; swipe++) {
      const y = box.y + box.height / 2;
      const start = box.x + box.width - 10;
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
      for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start - (box.width - 20) * step / 8, y }] });
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  } finally {
    await session.detach();
  }
}

for (const locale of ['zh', 'en'] as const) {
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 375, 768, 1024, 1440]) {
      // Preserve the established introduction and two-column hero before the writing.
      test(`${locale} ${theme} ${width}px keeps the established author introduction before the article cards`, async ({ page }) => {
        await page.setViewportSize({ width, height: width <= 375 ? 812 : 1000 });
        await page.addInitScript(mode => localStorage.setItem('pref-theme', mode), theme);
        await page.goto(home(locale));
        await page.evaluate(() => document.fonts.ready);
        const intro = page.getByText(copy[locale].bio, { exact: true });
        const title = page.locator('#hp-posts').getByRole('heading', { level: 3 }).first();
        await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
        await expect(intro).toBeVisible();
        expect(await intro.evaluate(el => !!(el.compareDocumentPosition(document.getElementById('hp-posts')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
        await expect(title).toBeVisible();
        const hero = page.locator('#hp-about');
        await expect(hero.locator('#hp-bear-ai')).toHaveCount(1);
        await expect(hero.locator('.hp-hero-socials')).toHaveCount(1);
        await expect(page.locator('.hp-home-connections')).toHaveCount(0);
        const heroBox = (await hero.boundingBox())!;
        const writingBox = (await page.locator('#hp-posts').boundingBox())!;
        expect(writingBox.y).toBeGreaterThanOrEqual(heroBox.y + heroBox.height - 1);
        if (width > 768) {
          const cards = await page.locator('.hp-channel-panel.is-active .hp-post-card').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()));
          expect(cards[1].x).toBeGreaterThan(cards[0].x);
          if (width <= 1024) expect(cards[2].y).toBeGreaterThan(cards[1].y);
          else expect(Math.abs(cards[2].y - cards[1].y)).toBeLessThanOrEqual(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      });
    }
  }

  // Catches lost event bindings, clipped active categories, or hidden contacts after a fresh load.
  test(`${locale} reading, every channel and optional author controls work after initialization`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(home(locale));
    await page.getByRole('link', { name: new RegExp(`^${copy[locale].reading}`) }).click();
    await expect(page).toHaveURL(/#hp-posts$/);
    await expect(page.locator('#hp-posts')).toBeFocused();
    const rail = page.getByRole('navigation', { name: copy[locale].channels });
    const tabs = rail.getByRole('link');
    await tabs.first().focus();
    for (let index = 0; index < await tabs.count(); index++) {
      await page.keyboard.press('ArrowRight');
      await expectActiveChannelVisible(rail);
    }
    for (let index = 0; index < await tabs.count(); index++) {
      await rail.getByRole('button', { name: copy[locale].next }).click();
      await expectActiveChannelVisible(rail);
    }
    await rail.getByRole('button', { name: copy[locale].previous }).click();
    await expectActiveChannelVisible(rail);
    await rail.getByRole('button', { name: copy[locale].next }).click();
    await swipeChannels(page, rail);
    await tabs.last().click();
    await expectActiveChannelVisible(rail);

    const social = page.locator('.hp-hero-socials');
    await expect(social.locator('a,button')).toHaveCount(10);
    expect(await social.evaluate(el => !!(el.compareDocumentPosition(document.getElementById('hp-posts')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    for (const control of await social.locator('a,button').all()) {
      await expect(control).toBeVisible();
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const contacts = await social.locator('a,button').evaluateAll(elements => elements.map(el => {
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
    }));
    for (let index = 1; index < contacts.length; index++) {
      const current = contacts[index], previous = contacts[index - 1];
      expect(Math.abs(current.y - previous.y) < 1 ? current.x - previous.right : current.y - previous.bottom).toBeGreaterThanOrEqual(8);
    }
    await expect(page.getByRole('link', { name: copy[locale].about, exact: true })).toHaveAttribute('href', /\/projects\/\?profile=about$/);
    const wechat = social.locator('[data-contact-platform="wechat"]');
    await wechat.click();
    await expect(wechat).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#wechat-contact-backdrop .wxc-card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(wechat).toHaveAttribute('aria-expanded', 'false');
    await expect(wechat).toBeFocused();
    const chat = page.getByRole('button', { name: copy[locale].chat, exact: true });
    await chat.click();
    await expect(page.locator('#hp-chat-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#hp-chat-input')).toHaveCount(0);
    await expect(page.locator('#hp-avatar-btn')).toBeFocused();

    const article = page.locator('#hp-channel-panels > :not([hidden])').getByRole('link').first();
    const href = (await article.getAttribute('href'))!;
    const title = (await article.getByRole('heading', { level: 3 }).textContent())!.trim();
    await article.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('.post-title')).toHaveText(title);
  });
}

test.describe('native reading without scripts', () => {
  test.use({ javaScriptEnabled: false });
  for (const locale of ['zh', 'en'] as const) {
    // Catches a client-only reconstruction replacing the real published links.
    test(`${locale} keeps the author, reading and profile links usable without JavaScript`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(home(locale));
      await expect(page.getByText(copy[locale].bio, { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: copy[locale].about, exact: true })).toHaveAttribute('href', /\/projects\/\?profile=about$/);
      await expect(page.locator('.hp-hero-socials a[title="Github"]')).toHaveAttribute('href', /^https:\/\/github.com\//);
      await page.getByRole('link', { name: new RegExp(`^${copy[locale].reading}`) }).click();
      await expect(page).toHaveURL(/#hp-posts$/);
      const article = page.locator('#hp-channel-panels > :not([hidden])').getByRole('link').first();
      const href = (await article.getAttribute('href'))!;
      await article.click();
      await expect(page).toHaveURL(href);
      await expect(page.locator('.post-title')).toBeVisible();
    });
  }
});
