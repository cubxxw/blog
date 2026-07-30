import { test, expect } from '@playwright/test';

test.describe('About Page Visual Regression', () => {
  test('about keeps one clear narrative in both languages', async ({ page }) => {
    await page.goto('/zh/about/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('把走过的路');
    await expect(page.getByRole('link', { name: '进入我的工作台' })).toHaveAttribute('href', '#workbench');
    await expect(page.getByRole('link', { name: '查看全部产品' })).toHaveAttribute('href', '/zh/projects/');
    await expect(page.getByText('AI 创业者', { exact: true })).toHaveCount(0);

    await page.goto('/about/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Turning the road I travel');
    await expect(page.getByRole('link', { name: 'Enter my workbench' })).toHaveAttribute('href', '#workbench');
    await expect(page.getByRole('link', { name: 'View all products' })).toHaveAttribute('href', '/projects/');
  });

  test('about interview stays native when a live campaign is not configured', async ({ page }) => {
    await page.goto('/zh/about/#tell-me');

    const interview = page.locator('#tell-me');
    const originalURL = page.url();

    await expect(interview.locator('iframe')).toHaveCount(0);
    await expect(interview.getByRole('button', { name: '哪里让我不相信' })).toBeVisible();

    await interview.getByRole('button', { name: '哪里让我不相信' }).click();

    await expect(interview.getByRole('heading', { name: '这次对话暂时没有接通。' })).toBeVisible();
    await expect(interview.getByRole('link', { name: '在 Telepace 中打开' })).toBeVisible();
    await expect(interview.locator('iframe')).toHaveCount(0);
    await expect(page).toHaveURL(originalURL);
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
