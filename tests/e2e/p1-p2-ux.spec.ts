import { test, expect } from '@playwright/test';

test.describe('P1-P2 UX regression', () => {
  test('newsletter validation exposes and clears an accessible error', async ({ page }) => {
    await page.goto('/zh/');
    const form = page.locator('[data-fsub-form]').first();
    const input = form.locator('input[name="email"]');
    const status = page.locator(`#${await input.getAttribute('aria-describedby')}`);

    await input.fill('not-an-email');
    await form.locator('button[type="submit"]').click();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(status).toHaveAttribute('role', 'alert');
    await expect(status).toContainText('邮箱');

    await input.fill('reader@example.com');
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    await expect(status).toBeEmpty();
  });

  test('contact dialog preloads its QR, traps focus, and restores the trigger', async ({ page }) => {
    await page.goto('/zh/');
    const trigger = page.locator('.hp-hero-socials [data-contact-platform="wechat"]').first();
    await trigger.hover();
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: '加我的微信' });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.locator('.wxc-qr-frame')).toHaveAttribute('aria-busy', 'false');
    await expect(dialog.locator('.wxc-qr-frame')).toHaveClass(/is-loaded/);

    const close = dialog.getByRole('button', { name: '关闭' });
    const closeBox = await close.boundingBox();
    expect(closeBox?.width).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('Shift+Tab');
    await expect(dialog.locator(':focus')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile article library keeps filters discoverable and cards compact', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.goto('/zh/articles/');

    await expect(page.getByRole('button', { name: /^工程 / })).toBeVisible();
    await expect(page.getByRole('button', { name: /^成长与生活 / })).toBeAttached();
    await expect(page.locator('[data-filter-scroll-hint]').first()).toBeVisible();

    await page.getByRole('button', { name: '筛选' }).click();
    await expect(page.locator('.library-filter__scroll-shell--tags [data-filter-scroll-hint]')).toBeVisible();

    const firstCard = page.locator('[data-library-card]:visible').first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox?.height).toBeLessThan(400);
  });

  test('mobile product window exposes 44px close and dock targets', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.addInitScript(() => sessionStorage.setItem('osx-booted', '1'));
    await page.goto('/zh/projects/');

    await page.locator('.osx-widget--proc [data-osx-open]').first().click();
    const close = page.locator('.osx-window--open .osx-window__close');
    await expect(close).toBeVisible();
    const closeBox = await close.boundingBox();
    expect(closeBox?.width).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height).toBeGreaterThanOrEqual(44);

    const dockTarget = page.locator('.osx-dock__app').first();
    const dockBox = await dockTarget.boundingBox();
    expect(dockBox?.width).toBeGreaterThanOrEqual(44);
    expect(dockBox?.height).toBeGreaterThanOrEqual(44);
  });
});
