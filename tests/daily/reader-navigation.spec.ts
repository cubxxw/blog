import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    return !['GET', 'HEAD'].includes(request.method()) || /^\/(?:\.netlify\/functions|api)\//.test(url.pathname)
      ? route.abort('blockedbyclient') : route.continue();
  });
});

for (const prefix of ['', '/zh']) {
  test(`live search opens a real article readable in both themes: ${prefix || '/en'}`, async ({ page, baseURL }) => {
    await page.goto(`${prefix}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-search-trigger="nav"]').click();
    const panel = page.locator('#search-command-palette');
    await expect(panel).toBeVisible();
    await panel.locator('.search-palette__input').fill('AI');
    const result = page.locator('#search-results-list [role="option"]').first();
    await expect(result).toBeVisible({ timeout: 15_000 });
    const destination = new URL((await result.getAttribute('href'))!, baseURL);
    expect(destination.origin).toBe(new URL(baseURL!).origin);
    const [documentResponse] = await Promise.all([
      page.waitForResponse(response => response.request().isNavigationRequest()
        && response.request().frame() === page.mainFrame() && response.url() === destination.href),
      result.click(),
    ]);
    expect(documentResponse.status(), 'the indexed article must exist, not a styled 404').toBe(200);
    await expect(page).toHaveURL(destination.href);
    await expect(page.locator('article.post-single .post-content')).toBeVisible();
    for (const dark of [true, false]) {
      const body = page.locator('body');
      if ((await body.evaluate(element => element.classList.contains('dark'))) !== dark) {
        await page.locator('#theme-toggle').click();
      }
      await expect.poll(() => body.evaluate(element => element.classList.contains('dark'))).toBe(dark);
      await expect(page.locator('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    }
  });

  test(`live Products defaults to BEAR OS and switches both ways: ${prefix || '/en'}`, async ({ page }, testInfo) => {
    // Follow the existing multi-step world journey budget; each operation is
    // still capped at 30s. The separate 45s performance navigation gate is unchanged.
    test.setTimeout(90_000);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(30_000);
    await page.goto(`${prefix}/projects/`, { waitUntil: 'domcontentloaded' });
    const root = page.locator('[data-product-space]');
    await expect(root).toHaveAttribute('data-product-view', 'bear');
    const workspace = page.locator('[data-bear-workspace]');
    await expect(workspace).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    let readinessError = '';
    await page.waitForFunction(() => {
      const state = document.querySelector<HTMLElement>('[data-bear-workspace]')?.dataset;
      return state?.worldFailed === 'true' || (Number(state?.worldFrames) > 0 && !state?.worldLoading && state?.bootState === 'complete');
    }, undefined, { timeout: 30_000 }).catch(error => { readinessError = String(error.message); });
    await testInfo.attach('world-readiness', { contentType: 'application/json', body: JSON.stringify({
      readinessError, state: await workspace.evaluate(element => ({ ...((element as HTMLElement).dataset) })),
    }) });
    expect(readinessError, 'a real first frame or supported desktop fallback must be ready within 30s').toBe('');
    if (await workspace.getAttribute('data-world-failed') === 'true' && await page.locator('[data-boot-skip]').isVisible()) {
      await page.locator('[data-boot-skip]').click();
    }
    // The Jiangnan room hides the legacy floating entry. Use its supported
    // keyboard journey, then operate the real native menu. Other rooms retain
    // the visible entry; keep the same readiness and per-operation deadlines.
    if (await workspace.getAttribute('data-cafe-mode') !== 'desktop') {
      if (await workspace.getAttribute('data-world-renderer') === 'jiangnan') {
        await page.keyboard.press('Control+k');
        await expect(page.locator('[data-space-search]')).toBeVisible();
        await page.locator('[data-space-search-close]').click();
      } else await page.locator('[data-cafe-enter]').click();
    }
    await expect(workspace).toHaveAttribute('data-cafe-mode', 'desktop', { timeout: 30_000 });
    const expand = page.locator('.jiangnan-computer-expand');
    if (await expand.isVisible()) await expand.click();
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-product-view-button="lab"]').click();
    await expect(root).toHaveAttribute('data-product-view', 'lab');
    await expect(root.locator('[data-product-panel="lab"]')).toBeVisible();
    await root.locator('.product-view-switch [data-product-view-button="bear"]').click();
    await expect(root).toHaveAttribute('data-product-view', 'bear');
    await expect(page.locator('[data-bear-workspace]')).toBeVisible();
  });
}
