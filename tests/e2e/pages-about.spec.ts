import { test, expect, type Page } from '../helpers/frozen-site';

async function prepareFullPage(page: Page) {
  // Real reading reveals lazy images; a full-page capture must not accept empty
  // offscreen placeholders as the visual baseline.
  for (const selector of ['#workbench', '#studio-products', '#studio-road']) {
    const section = page.locator(selector);
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('img').first()).toHaveJSProperty('complete', true);
    await expect.poll(() => section.locator('img').first().evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
}

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
    await prepareFullPage(page);
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
    await prepareFullPage(page);
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
