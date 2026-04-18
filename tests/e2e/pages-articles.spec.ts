import { test, expect } from '@playwright/test';

test.describe('Articles Page Visual Regression', () => {
  test('desktop - articles list full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/ai-technology/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('articles-desktop-full.png', {
      fullPage: true,
    });
  });

  test('desktop - articles list above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/ai-technology/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('articles-desktop-fold.png');
  });

  test('mobile - articles list full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/ai-technology/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('articles-mobile-full.png', {
      fullPage: true,
    });
  });

  test('mobile - articles list above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/ai-technology/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('articles-mobile-fold.png');
  });
});
