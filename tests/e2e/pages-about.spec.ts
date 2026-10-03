import { test, expect } from '../helpers/frozen-site';

test.describe('About Page Visual Regression', () => {
  test('about keeps one clear narrative in both languages', async ({ page }) => {
    await page.goto('/zh/about/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('熊鑫伟');
    await expect(page.locator('.studio-hero__actions').getByRole('link', { name: '经历', exact: true })).toHaveAttribute('href', '#story');
    await expect(page.locator('.studio-hero__actions').getByRole('link', { name: '文章', exact: true })).toHaveAttribute('href', '/zh/articles/');
    await expect(page.getByText('AI 创业者', { exact: true })).toHaveCount(0);

    await page.goto('/about/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Xinwei Xiong');
    await expect(page.locator('.studio-hero__actions').getByRole('link', { name: 'My story', exact: true })).toHaveAttribute('href', '#story');
    await expect(page.locator('.studio-hero__actions').getByRole('link', { name: 'Writing', exact: true })).toHaveAttribute('href', '/articles/');
  });

  test('about interview stays native when a live campaign is not configured', async ({ page }) => {
    await page.goto('/zh/about/#tell-me');

    const interview = page.locator('#tell-me');
    const originalURL = page.url();
    await interview.locator('.studio-interview-disclosure > summary').click();

    await expect(interview.locator('iframe')).toHaveCount(0);
    await expect(interview.getByRole('button', { name: '哪里让我不相信' })).toBeVisible();

    await interview.getByRole('button', { name: '哪里让我不相信' }).click();

    await expect(interview.getByRole('heading', { name: '正式访谈还没有发布。' })).toBeVisible();
    await expect(interview.getByRole('status')).not.toContainText('campaign_not_configured');
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
