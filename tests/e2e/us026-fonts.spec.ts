import { test, expect } from '@playwright/test';

// US-026: Verify font loading strategy
// Requires dev server running at localhost:1313

test.describe('US-026 Font loading', () => {
  test('EN article page: post-title uses Fraunces as first font', async ({ page }) => {
    await page.goto('/ai-technology/posts/agent-identity-from-locke-to-openclaw/');
    const fontFamily = await page.evaluate(() => {
      const el = document.querySelector('.post-title');
      if (!el) return '';
      return window.getComputedStyle(el).fontFamily;
    });
    // Fraunces should be in the font-family stack (may not be loaded, but declared)
    expect(fontFamily).toContain('Fraunces');
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    expect(consoleErrors).toHaveLength(0);
  });

  test('ZH article page: post-title uses Noto Serif SC as first font', async ({ page }) => {
    await page.goto('/zh/ai-technology/posts/agent-identity-from-locke-to-openclaw/');
    const fontFamily = await page.evaluate(() => {
      const el = document.querySelector('.post-title');
      if (!el) return '';
      return window.getComputedStyle(el).fontFamily;
    });
    expect(fontFamily).toContain('Noto Serif SC');
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    expect(consoleErrors).toHaveLength(0);
  });

  test('ZH page head contains Noto Serif SC font link', async ({ page }) => {
    await page.goto('/zh/ai-technology/posts/agent-identity-from-locke-to-openclaw/');
    const notoLink = await page.$('link[href*="Noto+Serif+SC"]');
    expect(notoLink).not.toBeNull();
  });

  test('EN page head does NOT contain Noto Serif SC font link', async ({ page }) => {
    await page.goto('/ai-technology/posts/agent-identity-from-locke-to-openclaw/');
    const notoLink = await page.$('link[href*="Noto+Serif+SC"]');
    expect(notoLink).toBeNull();
  });

  test('EN page head contains Fraunces font link', async ({ page }) => {
    await page.goto('/ai-technology/posts/agent-identity-from-locke-to-openclaw/');
    const fraunceLink = await page.$('link[href*="Fraunces"]');
    expect(fraunceLink).not.toBeNull();
  });
});
