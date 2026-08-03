import { test, expect } from '@playwright/test';

test.describe('Header Search Interaction', () => {
  test('desktop - search panel opens, accepts input, closes with Esc', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Search panel should be hidden initially
    const panel = page.locator('#search-command-palette');
    await expect(panel).toBeHidden();

    // Click search trigger
    await page.click('[data-search-trigger="nav"]');
    await expect(panel).toBeVisible();

    // Type search query
    const input = page.locator('.search-palette__input');
    await input.fill('AI');
    await expect(input).toHaveValue('AI');

    // Close with Esc
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('mobile - search panel opens and closes with Esc', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const panel = page.locator('#search-command-palette');
    await expect(panel).toBeHidden();

    await page.click('[data-search-trigger="nav"]');
    await expect(panel).toBeVisible();

    const close = panel.locator('.search-palette__close');
    const closeBox = await close.boundingBox();
    expect(closeBox?.width).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('desktop - arrow keys select results and Enter opens the selected article', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    let aiRequests = 0;
    await page.route('**/.netlify/functions/blog-ai', async route => {
      aiRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ answer: 'Mock answer', candidates: [] }),
      });
    });

    await page.goto('/');
    await page.click('[data-search-trigger="nav"]');

    const input = page.locator('.search-palette__input');
    await input.fill('AI');
    const options = page.locator('#search-results-list [role="option"]');
    await expect(options.first()).toBeVisible();

    await input.press('ArrowDown');
    const selectedId = await input.getAttribute('aria-activedescendant');
    expect(selectedId).toBeTruthy();
    await expect(page.locator(`#${selectedId}`)).toHaveAttribute('aria-selected', 'true');

    const selectedHref = await page.locator(`#${selectedId}`).getAttribute('href');
    await input.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${selectedHref?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    expect(aiRequests).toBe(0);
  });

  test('desktop - Control+Enter asks AI without opening a result', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.route('**/.netlify/functions/blog-ai', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ answer: 'A grounded mock answer.', candidates: [] }),
      });
    });

    await page.goto('/');
    await page.click('[data-search-trigger="nav"]');
    const input = page.locator('.search-palette__input');
    await input.fill('AI agents');
    await input.press('Control+Enter');

    await expect(page.locator('#search-ai-box')).toBeVisible();
    await expect(page.locator('#search-ai-content')).toContainText('A grounded mock answer.');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Chinese palette exposes localized names and combobox semantics', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/zh/');
    await page.click('[data-search-trigger="nav"]');

    await expect(page.getByRole('dialog', { name: '搜索文章、笔记与关键词' })).toBeVisible();
    const input = page.getByRole('combobox', { name: '搜索文章' });
    await expect(input).toHaveAttribute('aria-controls', 'search-results-list');
    await expect(page.getByRole('button', { name: '问小熊 AI' })).toBeDisabled();
    await expect(page.locator('#search-result-summary')).toContainText('找到');
    await expect(page.locator('#search-full-link')).toContainText('完整搜索');
  });
});
