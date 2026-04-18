import { test, expect } from '@playwright/test';

test.describe('Travel Page Visual Regression', () => {
  test('desktop - travel full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/travel/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('travel-desktop-full.png', {
      fullPage: true,
    });
  });

  test('desktop - travel above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/travel/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('travel-desktop-fold.png');
  });

  test('mobile - travel full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/travel/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('travel-mobile-full.png', {
      fullPage: true,
    });
  });

  test('mobile - travel above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/travel/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('travel-mobile-fold.png');
  });
});
