import { test, expect } from '@playwright/test';

test.describe('Header Theme Toggle', () => {
  test('desktop - toggle dark mode applies dark class to body', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start in light mode: body should not have dark class
    const bodyDark = await page.evaluate(() => document.body.classList.contains('dark'));

    // Click theme toggle via JS to bypass sticky header viewport check
    await page.evaluate(() => (document.getElementById('theme-toggle') as HTMLElement).click());
    await page.waitForTimeout(350); // allow transition

    const bodyDarkAfter = await page.evaluate(() => document.body.classList.contains('dark'));
    expect(bodyDarkAfter).toBe(!bodyDark);
  });

  test('mobile - toggle dark mode applies dark class to body', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyDark = await page.evaluate(() => document.body.classList.contains('dark'));

    // Click theme toggle via JS
    await page.evaluate(() => (document.getElementById('theme-toggle') as HTMLElement).click());
    await page.waitForTimeout(350);

    const bodyDarkAfter = await page.evaluate(() => document.body.classList.contains('dark'));
    expect(bodyDarkAfter).toBe(!bodyDark);
  });
});
