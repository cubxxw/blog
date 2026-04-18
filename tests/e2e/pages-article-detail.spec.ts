import { test, expect } from '@playwright/test';

const ARTICLE_URL = '/ai-technology/posts/agent-identity-from-locke-to-openclaw/';

test.describe('Article Detail Page Visual Regression', () => {
  test('desktop - article detail full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto(ARTICLE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('article-detail-desktop-full.png', {
      fullPage: true,
    });
  });

  test('desktop - article detail above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto(ARTICLE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('article-detail-desktop-fold.png');
  });

  test('mobile - article detail full page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto(ARTICLE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('article-detail-mobile-full.png', {
      fullPage: true,
    });
  });

  test('mobile - article detail above fold', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto(ARTICLE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('article-detail-mobile-fold.png');
  });
});
