import { test, expect, Page } from '@playwright/test';
import { instrumentation } from '../interactive/test-support';

/**
 * Focused article-level checks for the interactive components integrated
 * into the four pilot article pages (issue #389). Runs inside the repository
 * Playwright config (CI, Chromium) and inside playwright.interactive.config.ts
 * (production output, Chromium/Firefox/WebKit) — paths are relative to the
 * configured baseURL. English routes have NO /en prefix.
 */

const PAGES = {
  contextZh: '/zh/ai-agent/posts/context-engineering-the-new-foundation/',
  contextEn: '/ai-agent/posts/context-engineering-the-new-foundation/',
  harnessZh: '/zh/ai-agent/posts/agent-engineering-the-98-percent-harness/',
  harnessEn: '/ai-agent/posts/agent-engineering-the-98-percent-harness/',
} as const;

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    // One documented preexisting site-embed quirk (utterances comments
    // widget cross-origin postMessage noise); nothing else is filtered.
    if (msg.type() === 'error' && !/utteranc/i.test(msg.text())) {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

for (const [name, url] of Object.entries(PAGES)) {
  test(`${name}: component integrates cleanly with no new console errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const isContext = name.startsWith('context');
    await page.goto(url);
    const root = page.locator(isContext ? 'blog-context-budget' : 'blog-agent-loop').first();
    await root.waitFor({ state: 'attached' });
    await expect(root).toHaveAttribute('data-enhanced', /.*/, { timeout: 15_000 });
    // Exactly one instance per pilot page; the replaced agent demo is gone.
    await expect(page.locator(isContext ? 'blog-context-budget' : 'blog-agent-loop')).toHaveCount(1);
    if (!isContext) {
      await expect(page.locator('[data-demo-trace]')).toHaveCount(0);
    }
    // Article argument and metadata survive integration.
    await expect(page.locator('h1.post-title')).toBeVisible();
    await expect(page.locator('.post-content p').first()).toBeVisible();
    await expect(page.locator('details.ib-reference > summary')).toBeVisible();
    await page.waitForTimeout(400);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('pilot article: offline interaction stays local (zh context article)', async ({ page, context }) => {
  // Component isolation routes — the TWO known preexisting third-party
  // embeds (Google Analytics bootstrap, utterances comments widget),
  // matching the component suite. Every storage-class write is instrumented
  // so unknown ambient writes fail instead of being excused.
  const ambientEmbed = /(googletagmanager\.com|google-analytics\.com|utteranc)/;
  await context.route(ambientEmbed, (route) => route.abort());
  await page.addInitScript(instrumentation);
  await page.goto(PAGES.contextZh);
  await expect(page.locator('blog-context-budget[data-enhanced]').first()).toBeAttached({ timeout: 15_000 });
  // Issue protocol: freeze the network only AFTER the page's and the
  // components' static resources have loaded (the site's webfont slices load
  // lazily in unicode-range batches).
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    Promise.race([Promise.resolve(document.fonts.ready).then(() => undefined), new Promise((r) => setTimeout(r, 8000))])
  );
  // Full-content baseline BEFORE any interaction (site startup state is
  // baseline — never claimed as component writes).
  const before = await page.evaluate(() => {
    (window as any).__writes = [];
    return {
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
      cookie: document.cookie,
    };
  });
  await context.setOffline(true);
  const requests: string[] = [];
  page.on('request', (r) => {
    // Fetch attempts at the explicitly disabled ambient routes are
    // excluded; everything else must stay at zero.
    if (!ambientEmbed.test(r.url())) requests.push(r.url());
  });
  const root = page.locator('blog-context-budget').first();
  await root.locator('[data-ib-scenario="compact"]').click();
  await root.locator('[data-ib-panel="compact"] [data-ib-range]').evaluate((el: HTMLInputElement) => {
    el.value = '20';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await root.locator('[data-ib-reset]').click();
  expect(requests, requests.join(', ')).toEqual([]);
  const after = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage)),
    cookie: document.cookie,
    writes: (window as any).__writes as string[],
  }));
  expect(after.writes, after.writes.join(', ')).toEqual([]);
  expect({ local: after.local, session: after.session, cookie: after.cookie }).toEqual(before);
  await context.setOffline(false);
});

test('articles without the shortcode load no component assets', async ({ page }) => {
  const html = await (await page.goto('/ai-agent/posts/from-chatbot-to-agent-to-skill/'))!.text();
  expect(html).not.toMatch(/components\/(context-budget|agent-loop)/);
});
