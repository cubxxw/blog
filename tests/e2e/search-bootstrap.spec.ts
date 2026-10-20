import { test, expect, type Page } from '../helpers/frozen-site';

// Exercise real fingerprinted search code; only network timing and the local
// index are controlled. The body-only marker catches accidental truncation.
const engine = /\/js\/(?:vendor\/fuse|search-palette|search-controller)[^/]*\.js(?:\?.*)?$/;
const marker = 'quasiharmonicidentifier';
async function indexFixture(page: Page, prefix: string) {
  let requests = 0;
  await page.route('**/index.json', route => {
    requests++;
    return route.fulfill({ json: [{
      title: 'Body search proof', summary: 'A short introduction.', tags: [],
      content: 'Unrelated opening. '.repeat(1500) + marker,
      permalink: `${prefix}/engineering/posts/body-proof/`,
    }] });
  });
  return () => requests;
}

for (const prefix of ['', '/zh']) {
  test(`cold search opens before its engine arrives and a closed dialog stays closed: ${prefix || 'en'}`, async ({ page }) => {
    const indexRequests = await indexFixture(page, prefix);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let engineRequests = 0;
    await page.route(engine, async route => { engineRequests++; await gate; await route.fallback(); });
    try {
      await page.goto(`${prefix}/`, { waitUntil: 'domcontentloaded' });
      expect(engineRequests).toBe(0);
      const trigger = page.locator('[data-search-trigger="nav"]:visible').first();
      await trigger.click();
      const panel = page.locator('#search-command-palette'), input = panel.locator('input[type="search"]');
      await expect(panel).toBeVisible({ timeout: 5_000 });
      await expect(input).toBeFocused();
      await input.fill(marker);
      const close = panel.locator('.search-palette__close');
      await input.press('Shift+Tab');
      await expect(close).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('#search-full-link')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await input.focus();
      await page.keyboard.press('Control+k');
      await expect(panel).toBeVisible();
      await expect.poll(() => engineRequests).toBe(1);
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      release();
      await page.waitForFunction(() => (window as any).__searchPaletteReady);
      await expect(panel).toBeHidden();
      await trigger.click();
      await input.fill(marker);
      await expect(page.locator('#search-results-list [role="option"]')).toHaveCount(1);
      await expect(page.locator('#search-results-list [role="option"]').first()).toContainText('Body search proof');
      expect(indexRequests()).toBe(1);
    } finally { release(); }
  });

  test(`failed search engine preserves the query and an explicit retry recovers: ${prefix || 'en'}`, async ({ page }) => {
    const indexRequests = await indexFixture(page, prefix);
    let engineRequests = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(engine, async route => {
      if (++engineRequests === 1) await route.abort('failed');
      else { await gate; await route.fallback(); }
    });
    try {
    await page.goto(`${prefix}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-search-trigger="nav"]:visible').first().click();
    const panel = page.locator('#search-command-palette'), input = panel.locator('input[type="search"]');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await input.fill(marker);
    const retry = page.locator('#search-index-retry');
    await expect(retry).toBeVisible();
    await expect(input).toHaveAttribute('aria-busy', 'false');
    await expect(input).toHaveValue(marker);
    await page.locator('#search-empty').evaluate(node => {
      (node as HTMLElement).style.fontSize = `${parseFloat(getComputedStyle(node).fontSize) * 2}px`;
    });
    const before = await retry.boundingBox();
    await retry.click();
    await expect(retry).toBeFocused();
    expect(await retry.boundingBox()).toEqual(before);
    await expect.poll(() => engineRequests).toBe(2);
    // A locator click waits for aria-disabled to clear. Use the physical
    // target to exercise an actual repeated tap while the retry is pending.
    const hit = (await retry.boundingBox())!;
    await page.mouse.click(hit.x + hit.width / 2, hit.y + hit.height / 2);
    expect(engineRequests).toBe(2);
    release();
    await expect(page.locator('#search-results-list [role="option"]')).toHaveCount(1);
    await expect(input).toHaveValue(marker);
    expect(indexRequests()).toBe(1);
    expect(engineRequests).toBe(2);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    } finally { release(); }
  });
}

test('a stalled engine has a bounded failure and can be retried without duplicate initialization', async ({ page }, testInfo) => {
  const indexRequests = await indexFixture(page, '');
  await page.clock.install();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route(engine, async route => { requests++; await gate; await route.fallback(); });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.locator('[data-search-trigger="nav"]:visible').first().click();
    const input = page.locator('.search-palette__input'), retry = page.locator('#search-index-retry');
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill(marker);
    await expect.poll(() => requests).toBe(1);
    await page.clock.fastForward(15_000);
    await expect(retry).toBeVisible();
    await expect(input).toHaveAttribute('aria-busy', 'false');
    await retry.click();
    await testInfo.attach('loader-retry-state', { contentType: 'application/json', body: JSON.stringify({
      requests, scripts: await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => (node as HTMLScriptElement).src)),
    }) });
    await expect.poll(() => requests).toBe(2);
    release();
    await expect(page.locator('#search-results-list [role="option"]')).toHaveCount(1);
    expect(indexRequests()).toBe(1);
    await expect(input).toHaveValue(marker);
  } finally { release(); }
});
