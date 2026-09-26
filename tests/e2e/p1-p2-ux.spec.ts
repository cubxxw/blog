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

  test('mobile product workspace exposes 44px actions and a close target', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
    await page.addInitScript(() => sessionStorage.setItem('osx-booted', '1'));
    await page.goto('/zh/projects/');
    await expect(page.locator('body')).toHaveCSS('overflow', 'auto');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

    const beforeTheme = await page.locator('body').evaluate((body) => body.classList.contains('dark'));
    await page.locator('[data-osx-theme]').click();
    await expect.poll(() => page.locator('body').evaluate((body) => body.classList.contains('dark'))).toBe(!beforeTheme);

    await page.locator('.osx-widget--proc [data-osx-select]').first().click();
    const primary = page.locator('[data-osx-case="talent-signal"] [data-osx-open]');
    await expect.poll(async () => (await primary.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await primary.click();
    const close = page.locator('.osx-window--open .osx-window__close');
    await expect(close).toBeVisible();
    // Opening scales the window briefly; measure the settled hit targets.
    await expect.poll(async () => (await close.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
    await expect.poll(async () => (await close.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    await close.click();
    await expect(page.locator('[data-osx-case="talent-signal"]')).toBeVisible();
  });

  test('products defaults to BEAR OS and switches to Product Lab and back', async ({ page }) => {
    await page.goto('/zh/projects/');

    const space = page.locator('[data-product-space]');
    const bearButton = page.getByRole('button', { name: 'BEAR OS', exact: true });
    const labButton = page.getByRole('button', { name: 'Product Lab', exact: true });
    const bearPanel = page.locator('[data-product-panel="bear"]');

    await expect(space).toHaveAttribute('data-product-view', 'bear');
    await expect(bearButton).toHaveAttribute('aria-pressed', 'true');
    await expect(bearPanel).toBeVisible();
    await expect(page.locator('[data-product-panel="lab"]')).toHaveCount(0);

    await labButton.click();
    const labPanel = page.locator('[data-product-panel="lab"]');
    await expect(space).toHaveAttribute('data-product-view', 'lab');
    await expect(labButton).toHaveAttribute('aria-pressed', 'true');
    await expect(bearPanel).toBeHidden();
    await expect(labPanel).toBeVisible();
    await expect(page).toHaveURL(/#product-lab$/);

    await bearButton.click();
    await expect(space).toHaveAttribute('data-product-view', 'bear');
    await expect(bearButton).toHaveAttribute('aria-pressed', 'true');
    await expect(bearPanel).toBeVisible();
    await expect(labPanel).toBeHidden();
    await expect(page).not.toHaveURL(/#product-lab$/);
  });

  test('BEAR OS product search keeps the global search shortcut separate', async ({ page }) => {
    await page.goto('/zh/projects/');
    await page.keyboard.press('p');
    const dialog = page.getByRole('dialog', { name: '搜索产品' });
    await expect(dialog).toBeVisible();

    await page.locator('[data-osx-command-input]').fill('solo');
    await expect(page.locator('[data-osx-command-item]:visible')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-osx-case="solo-compass"]')).toBeVisible();
    await expect(page.locator('[data-osx-select="solo-compass"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#focus-solo-compass$/);
    await page.locator('[data-osx-case="solo-compass"] [data-osx-open]').click();
    await expect(page.locator('[data-osx-window="solo-compass"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-osx-window="solo-compass"]')).toBeHidden();
    await expect(page.locator('[data-osx-case="solo-compass"]')).toBeVisible();
  });

  test('Product Lab can enter BEAR knowledge space and return without leaving lab', async ({ page }) => {
    await page.goto('/zh/projects/');

    await page.getByRole('button', { name: 'Product Lab' }).click();
    await page.getByRole('button', { name: '进入知识空间' }).click();

    const host = page.locator('[data-bks-host]');
    await expect(page).toHaveURL(/#knowledge$/);
    await expect(host).toBeVisible();
    await expect(host.locator('.bks__chip').first()).toBeVisible();
    await expect(host.locator('.bks__title')).toHaveText('产品与写作如何连成一条线');
    await expect(host.getByText('BEAR 知识空间', { exact: true })).toBeVisible();
    // Ordinary page scroll stays available (no overflow lock).
    await expect(page.locator('body')).not.toHaveClass(/overflow-hidden|scroll-locked/);

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#product-lab$/);
    await expect(host).toBeHidden();
    await expect(page.locator('[data-product-panel="lab"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '进入知识空间' })).toBeVisible();
  });

  test('knowledge space stays closed when the reader exits before its module loads', async ({ page }) => {
    await page.route('**/bear-knowledge-space*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.goto('/zh/projects/');
    await page.getByRole('button', { name: 'Product Lab' }).click();
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#product-lab$/);
    await page.waitForTimeout(700);
    await expect(page.locator('[data-bks-host]')).toBeHidden();
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await expect(page.locator('[data-bks-host] .bks__chip').first()).toBeVisible();
  });
});
