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

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });
});
