import { test, expect } from '../helpers/frozen-site';

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
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');
    const workspace = page.locator('[data-bear-workspace]');
    await expect(workspace).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(workspace.locator('[data-space-dock] [data-mobile-destination]:visible')).toHaveCount(5);

    const allApps = workspace.locator('.space-menu [data-space-launchpad-trigger]');
    const launchpad = workspace.locator('[data-space-launchpad]');
    await workspace.locator('[data-space-menu-trigger]').click();
    await allApps.click();
    await expect(launchpad.locator('[data-launchpad-app]')).toHaveCount(11);
    await launchpad.locator('[data-launchpad-app="settings"]').click();
    const settings = workspace.locator('[data-space-window="settings"]');
    await expect(settings).toBeVisible();
    const nextTheme = await workspace.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    await settings.locator(`[data-set-theme="${nextTheme}"]`).click();
    await expect(workspace).toHaveAttribute('data-theme', nextTheme);
    await expect(settings.locator(`[data-set-theme="${nextTheme}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => (
      window as unknown as { BearSpace: { snapshot: () => { theme: string } } }
    ).BearSpace.snapshot().theme)).toBe(nextTheme);

    for (const action of ['close', 'minimize', 'maximize', 'arrange']) {
      const control = settings.locator(`[data-window-action="${action}"]`);
      await expect(control).toBeVisible();
      await expect.poll(async () => (await control.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
      await expect.poll(async () => (await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    for (const app of ['welcome', 'products', 'reader', 'photos', 'map', 'books', 'notes', 'contact', 'terminal', 'agent', 'settings']) {
      await workspace.locator('[data-space-menu-trigger]').click();
    await allApps.click();
      await expect(launchpad).toBeVisible();
      await launchpad.locator(`[data-launchpad-app="${app}"]`).click();
      await expect(launchpad).toBeHidden();
      await expect(workspace.locator(`[data-space-window="${app}"]`)).toBeVisible();
      if(app === 'contact') {
        await page.locator('[data-message-draft]').fill('A private contact draft.');
        await expect(page.locator('[data-contact-email]')).toHaveAttribute('href',/A%20private%20contact%20draft/);
      }
    }
    await settings.locator('[data-window-action="close"]').click();
    await expect(settings).toHaveCount(0);
    await expect(workspace.locator('[data-space-window][data-active="true"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(errors).toEqual([]);
  });

  test('space defaults to CUBXXW OS and switches to Product Lab and back', async ({ page }) => {
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');

    const space = page.locator('[data-product-space]');
    const bearButton = page.locator('.product-view-switch [data-product-view-button="bear"]');
    const labButton = page.locator('.space-menu [data-product-view-button="lab"]');
    const bearPanel = page.locator('[data-product-panel="bear"]');

    await expect(space).toHaveAttribute('data-product-view', 'bear');
    await expect(bearButton).toHaveAttribute('aria-pressed', 'true');
    await expect(bearPanel).toBeVisible();
    await expect(page.locator('[data-product-panel="lab"]')).toHaveCount(0);

    await page.locator('[data-space-menu-trigger]').click();
    await labButton.click();
    const labPanel = page.locator('[data-product-panel="lab"]');
    await expect(space).toHaveAttribute('data-product-view', 'lab');
    await expect(labButton).toHaveAttribute('aria-pressed', 'true');
    await expect(bearPanel).toBeHidden();
    await expect(labPanel).toBeVisible();
    await expect(page.locator('.product-view-switch [data-product-view-button="lab"]')).toBeFocused();
    await expect(page).toHaveURL(/#product-lab$/);

    await bearButton.click();
    await expect(space).toHaveAttribute('data-product-view', 'bear');
    await expect(bearButton).toHaveAttribute('aria-pressed', 'true');
    await expect(bearPanel).toBeVisible();
    await expect(labPanel).toBeHidden();
    await expect(page).not.toHaveURL(/#product-lab$/);
    await expect(page.locator('[data-space-menu-trigger]')).toBeFocused();
  });

  test('BEAR OS product search uses workspace search and restores the selected product', async ({ page }) => {
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');
    const workspace = page.locator('[data-bear-workspace]');
    await expect(workspace).toHaveAttribute('data-ready', 'true');
    const searchTrigger = workspace.locator('[data-space-menu-trigger]');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.focus();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
    const dialog = page.getByRole('dialog', { name: '搜索工作区' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-space-search-input]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(searchTrigger).toBeFocused();
    await expect(workspace.locator('[data-space-window="welcome"]')).toBeVisible();

    await searchTrigger.click();
    await workspace.locator('.space-menu [data-space-search-trigger]').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-space-search-input]').fill('solo');
    const result = dialog.locator('[data-search-kind="product"][data-search-payload="solo-compass"]');
    await expect(result).toHaveCount(1);
    await expect(result).toContainText('Solo Compass');
    await page.keyboard.press('ArrowDown');
    await expect(result).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    const product = workspace.locator('[data-space-window="products"]');
    await expect(product).toBeVisible();
    await expect(product.locator('.space-product h2')).toHaveText('Solo Compass');
    await expect(product.locator('[data-select-product="solo-compass"]')).toHaveAttribute('aria-pressed', 'true');
    const productState = () => page.evaluate(() => {
      const state = (window as unknown as {
        BearSpace: { snapshot: () => { windows: Array<{ app: string; payload: string; minimized: boolean }> } };
      }).BearSpace.snapshot().windows.find((win) => win.app === 'products');
      return { payload: state?.payload, minimized: state?.minimized };
    });
    await expect.poll(productState).toEqual({ payload: 'solo-compass', minimized: false });
    await page.keyboard.press('Escape');
    await expect(product).toBeHidden();
    await expect.poll(productState).toEqual({ payload: 'solo-compass', minimized: true });
    await workspace.locator('[data-space-dock] [data-open="products"]').click();
    await expect(product).toBeVisible();
    await expect(product.locator('.space-product h2')).toHaveText('Solo Compass');
    await expect.poll(productState).toEqual({ payload: 'solo-compass', minimized: false });
  });

  test('Space language changes preserve private work and the open article', async ({ page }) => {
    await page.goto('/zh/projects/?profile=about#identity');
    const workspace = page.locator('[data-bear-workspace]');
    await expect(workspace).toHaveAttribute('data-ready', 'true');
    const openApp = async (app: string) => {
      const dock = workspace.locator(`[data-space-dock] [data-open="${app}"]`);
      if (await dock.isVisible()) await dock.click();
      else {
        await workspace.locator('[data-space-menu-trigger]').click();
        await workspace.locator('.space-menu [data-space-launchpad-trigger]').click();
        await workspace.locator(`[data-launchpad-app="${app}"]`).click();
      }
    };
    await openApp('reader');
    await page.locator('[data-library-list] [data-open="reader"]').first().click();
    const article = page.locator('[data-reader-body] .post-content');
    await expect(article).toBeVisible();
    const original = await article.innerText();
    await openApp('notes');
    await page.locator('[data-note-editor]').fill('Private note stays here.');
    await openApp('contact');
    await page.locator('[data-message-draft]').fill('A draft, not sent.');
    await openApp('settings');
    const snapshot = () => page.evaluate(() => (window as unknown as { BearSpace: { snapshot: () => unknown } }).BearSpace.snapshot());
    const before = await snapshot();
    await page.locator('[data-set-language="en"]').click();
    await expect(page).toHaveURL(/\/projects\/\?profile=about#identity$/);
    await expect(workspace).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('[data-set-language="en"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await snapshot()).toEqual(before);
    await openApp('reader');
    await expect.poll(() => article.innerText()).toBe(original);
    await openApp('notes');
    await expect(page.locator('[data-note-editor]')).toHaveValue('Private note stays here.');
    await openApp('contact');
    await expect(page.locator('[data-message-draft]')).toHaveValue('A draft, not sent.');
  });

  for (const blocked of ['local', 'session'] as const) {
    test(`Space preserves work when ${blocked} storage fails during a language change`, async ({ page }) => {
      await page.addInitScript((blocked) => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if ((blocked === 'local' && this === localStorage && key === 'bear-space:v1') || (blocked === 'session' && this === sessionStorage)) {
            throw new DOMException('Storage is unavailable', 'QuotaExceededError');
          }
          return original.call(this, key, value);
        };
      }, blocked);
      await page.goto('/zh/projects/?profile=about#identity');
      const workspace = page.locator('[data-bear-workspace]');
      await expect(workspace).toHaveAttribute('data-ready', 'true');
      await page.evaluate(() => (window as unknown as { BearSpace: { execute: (name: string, args: object) => unknown } }).BearSpace.execute('note', { text: 'Keep this private note.' }));
      await workspace.locator('[data-space-dock] [data-open="settings"]').click();
      const snapshot = () => page.evaluate(() => (window as unknown as { BearSpace: { snapshot: () => unknown } }).BearSpace.snapshot());
      const before = await snapshot();
      await page.locator('[data-set-language="en"]').click();
      if (blocked === 'local') {
        await expect(page).toHaveURL(/\/zh\/projects\/\?profile=about#identity$/);
        await expect(workspace.locator('[data-space-toast]')).toContainText('导出');
      } else {
        await expect(page).toHaveURL(/\/projects\/\?profile=about#identity$/);
        await expect(page.locator('[data-set-language="en"]')).toHaveAttribute('aria-pressed', 'true');
      }
      expect(await snapshot()).toEqual(before);
      await expect(workspace.locator('[data-space-window="settings"]')).toBeVisible();
    });
  }

  test('Product Lab can enter BEAR knowledge space and return without leaving lab', async ({ page }) => {
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');

    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-product-view-button="lab"]').click();
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

  test('an already open global search owns shortcuts above the BEAR workspace', async ({ page }) => {
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');
    const globalSearch=page.locator('#search-command-palette');
    const workspaceSearch=page.locator('[data-space-search]');
    for(const key of [process.platform==='darwin'?'Meta+k':'Control+k','Escape']) {
      if (await page.locator('[data-bear-workspace]').isVisible()) { await page.locator('[data-space-menu-trigger]').click(); await page.locator('.space-menu [data-product-view-button="lab"]').click(); }
      await page.locator('[data-search-trigger="nav"]').click();
      await expect(globalSearch).toBeVisible();
      await page.evaluate(()=>{location.hash='';});
      await expect(page.locator('[data-bear-workspace]')).toBeVisible();
      await globalSearch.locator('.search-palette__close').focus();
      await page.keyboard.press(key);
      await expect(globalSearch).toBeHidden();
      await expect(workspaceSearch).toBeHidden();
      await expect(page.locator('[data-space-window="welcome"]')).toBeVisible();
    }
  });

  test('knowledge space stays closed when the reader exits before its module loads', async ({ page }) => {
    await page.route('**/bear-knowledge-space*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fallback();
    });
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-product-view-button="lab"]').click();
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#product-lab$/);
    await page.waitForTimeout(700);
    await expect(page.locator('[data-bks-host]')).toBeHidden();
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await expect(page.locator('[data-bks-host] .bks__chip').first()).toBeVisible();
  });

  test('a pending knowledge mount cannot clear an immediate reopen or a later BEAR view', async ({ page }) => {
    await page.route('**/bear-knowledge-space*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fallback();
    });
    await page.goto('/zh/projects/');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode', 'desktop');
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-product-view-button="lab"]').click();
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#product-lab$/);
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await expect(page.locator('[data-bks-host] .bks__chip').first()).toBeVisible();
    await expect(page.locator('[data-bks-host]')).toHaveCount(1);
    await page.locator('.bks__back').click();
    await expect(page).toHaveURL(/#product-lab$/);
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await expect(page.locator('[data-bks-host] .bks__chip').first()).toBeVisible();
    await page.getByRole('button', { name: 'CUBXXW OS', exact: true }).click();
    await expect(page.locator('[data-bear-workspace]')).toBeVisible();
    await expect(page.locator('[data-bks-host]')).toBeHidden();
    await expect(page).not.toHaveURL(/#knowledge$/);
  });
});
