import { test, expect } from '../helpers/frozen-site';

test.describe('Space café', () => {
  test('landscape assistant remains independently clickable above the scene controls', async ({ page }) => {
    await page.setViewportSize({ width: 568, height: 320 });
    for (const lang of ['zh', 'en']) {
      await page.goto(`${lang === 'zh' ? '/zh' : ''}/projects/`);
      const space = page.locator('[data-bear-workspace]');
      await expect(space).toHaveAttribute('data-ready', 'true');
      const guide = page.locator('[data-cafe-guide]');
      expect(await guide.evaluate(el => { const box = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); })).toBe(true);
      await guide.click();
      await expect(space).toHaveAttribute('data-cafe-mode', 'desktop');
      await expect(page.locator('[data-agent-input]')).toBeVisible();
      await expect(page.locator('[data-cafe-dialog]')).toBeHidden();
    }
  });

  test('a fresh visit offers six cafés, then opens real workspace search', async ({ page }) => {
    await page.goto('/zh/projects/');
    const space = page.locator('[data-bear-workspace]');
    await expect(space).toHaveAttribute('data-ready', 'true');
    await expect(space).toHaveAttribute('data-cafe-mode', 'cafe');
    await expect(page.locator('[data-space-dock]')).toBeHidden();
    expect(await page.locator('[data-space-windows]').evaluate(el => (el as HTMLElement).inert)).toBe(true);
    await expect.poll(() => page.locator('[data-cafe-image]').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await expect(page.locator('button[data-cafe-theme]')).toHaveCount(6);
    await page.locator('button[data-cafe-theme="coast"]').click();
    await expect(space).toHaveAttribute('data-cafe-theme', 'coast');
    await page.keyboard.press('Escape');
    await expect(page.locator('.space-cafe__utilities [data-cafe-picker]')).toBeFocused();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
    await expect(space).toHaveAttribute('data-cafe-mode', 'desktop');
    await expect(page.locator('[data-space-search]')).toBeVisible();
  });

  test('an old About URL can return to the café and keep its place across language and reload', async ({ page }) => {
    await page.goto('/zh/projects/?profile=about#identity');
    const space = page.locator('[data-bear-workspace]');
    await expect(space).toHaveAttribute('data-ready', 'true');
    await expect(space).toHaveAttribute('data-cafe-mode', 'desktop');
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-cafe-visit]').click();
    await page.locator('[data-cafe-outside]').click();
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await expect(space).toHaveAttribute('data-cafe-view', 'outside');
    await page.locator('button[data-cafe-theme="garden"]').click();
    await expect(space).toHaveAttribute('data-cafe-theme', 'garden');
    await page.keyboard.press('Escape');
    await page.locator('[data-cafe-language]').click();
    await expect(page).toHaveURL(/\/projects\/\?profile=about#identity$/);
    await expect(space).toHaveAttribute('data-cafe-mode', 'cafe');
    await expect(page.locator('[data-cafe-name]')).toHaveText('Scholar’s Garden');
    await page.reload();
    await expect(space).toHaveAttribute('data-cafe-mode', 'cafe');
    await expect(space).toHaveAttribute('data-cafe-theme', 'garden');
  });

  test('a café visit preserves the existing note editor and private workspace', async ({ page }) => {
    await page.goto('/zh/projects/');
    const space = page.locator('[data-bear-workspace]');
    await expect(space).toHaveAttribute('data-ready', 'true');
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(space).toHaveAttribute('data-cafe-mode', 'desktop');
    // Notes remain reachable from the same OS API on both narrow and wide screens.
    await page.evaluate(() => (window as unknown as { BearSpace: { execute: (name: string, args: object) => unknown } }).BearSpace.execute('open', { app: 'notes' }));
    await page.locator('[data-note-editor]').fill('A private note beside the window.');
    await page.locator('[data-note-editor]').evaluate(el => (el as HTMLElement).dataset.instance = 'original');
    const snapshot = () => page.evaluate(() => (window as unknown as { BearSpace: { snapshot: () => unknown } }).BearSpace.snapshot());
    const before = await snapshot();
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-cafe-visit]').click();
    await page.keyboard.press('Escape');
    expect(await snapshot()).toEqual(before);
    await page.locator('.space-cafe__welcome [data-cafe-enter]').click();
    await expect(space).toHaveAttribute('data-cafe-mode', 'desktop');
    await expect(page.locator('[data-note-editor]')).toHaveAttribute('data-instance', 'original');
    expect(await snapshot()).toEqual(before);
    await page.reload();
    await expect(space).toHaveAttribute('data-cafe-mode', 'desktop');
    await expect(page.locator('[data-note-editor]')).toHaveValue('A private note beside the window.');
  });
});
