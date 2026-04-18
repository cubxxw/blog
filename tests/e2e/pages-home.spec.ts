import { test, expect } from '@playwright/test';

test.describe('Home Page Visual Regression', () => {
  test('desktop - homepage full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('home-desktop-full.png', {
      fullPage: true,
    });
  });

  test('desktop - homepage above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('home-desktop-fold.png');
  });

  test('mobile - homepage full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('home-mobile-full.png', {
      fullPage: true,
    });
  });

  test('mobile - homepage above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('home-mobile-fold.png');
  });
});
