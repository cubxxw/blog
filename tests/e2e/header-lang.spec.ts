import { test, expect } from '@playwright/test';

test.describe('Header Language Switch', () => {
  test('desktop - switch from EN to ZH changes URL to /zh/', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get ZH link href and navigate directly (element is in sticky header, outside viewport on profile page)
    const langHref = await page.locator('.lang-switch a').first().getAttribute('href');
    expect(langHref).toBeTruthy();
    await page.goto(langHref!);
    await page.waitForLoadState('networkidle');

    // After navigating to ZH, URL should start with /zh/
    expect(page.url()).toContain('/zh/');
  });

  test('desktop - switch from ZH to EN changes URL to /', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/zh/');
    await page.waitForLoadState('networkidle');

    // Get EN link href and navigate directly
    const langHref = await page.locator('.lang-switch a').first().getAttribute('href');
    expect(langHref).toBeTruthy();
    await page.goto(langHref!);
    await page.waitForLoadState('networkidle');

    // After navigating to EN, URL should NOT contain /zh/
    expect(page.url()).not.toContain('/zh/');
  });

  test('mobile - switch from EN to ZH changes URL to /zh/', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get ZH link href and navigate directly
    const langHref = await page.locator('.lang-switch a').first().getAttribute('href');
    expect(langHref).toBeTruthy();
    await page.goto(langHref!);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/zh/');
  });
});
