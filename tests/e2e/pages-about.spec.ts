import { test, expect } from '@playwright/test';

test.describe('About Page Visual Regression', () => {
  test('about keeps one clear narrative in both languages', async ({ page }) => {
    await page.goto('/zh/about/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('理解世界');
    await expect(page.getByRole('link', { name: '走进我的故事' })).toHaveAttribute('href', '/zh/about/quest/');
    await expect(page.getByRole('link', { name: '看看我正在做的产品' })).toHaveAttribute('href', '/zh/projects/');
    await expect(page.getByText('AI 创业者', { exact: true })).toHaveCount(0);

    await page.goto('/about/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('learning the world');
    await expect(page.getByRole('link', { name: 'Walk into my story' })).toHaveAttribute('href', '/about/quest/');
    await expect(page.getByRole('link', { name: 'See what I am building' })).toHaveAttribute('href', '/projects/');
  });

  test('desktop - about full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/about/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('about-desktop-full.png', {
      fullPage: true,
    });
  });

  test('desktop - about above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/about/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('about-desktop-fold.png');
  });

  test('mobile - about full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/about/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('about-mobile-full.png', {
      fullPage: true,
    });
  });

  test('mobile - about above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/about/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('about-mobile-fold.png');
  });
});
