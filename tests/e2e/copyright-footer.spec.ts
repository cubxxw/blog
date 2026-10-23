import { test, expect } from '../helpers/frozen-site';

// Catch an unbreakable copyright line even when an ancestor clips overflow.
// The real footer, its complete text, and its author link must fit the viewport.
for (const language of ['en', 'zh']) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${language} ${width}px ${theme}: copyright remains readable without horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 768 ? 812 : 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
        await page.addInitScript(value => localStorage.setItem('pref-theme', value), theme);
        await page.goto(language === 'zh' ? '/zh/articles/' : '/articles/');
        await page.evaluate(() => document.fonts.ready);
        const footer = page.locator('footer.footer');
        const author = footer.locator('a');
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeVisible();
        await expect(author).toBeVisible();
        expect(new URL(await author.getAttribute('href') || '', page.url()).pathname).toBe(language === 'zh' ? '/zh/' : '/');

        const geometry = await footer.evaluate(root => {
          const lines: { text: string; left: number; right: number; top: number; bottom: number }[] = [];
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            if (!node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              lines.push({ text: node.textContent.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
            }
          }
          const rect = root.getBoundingClientRect();
          return {
            text: root.textContent?.trim(),
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            footer: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
            lines,
          };
        });
        await test.info().attach('copyright-geometry', { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) });
        expect(geometry.text).toMatch(/^© \d{4} .+/);
        expect(geometry.lines.length).toBeGreaterThan(0);
        expect.soft(geometry.documentWidth, 'the page must not need horizontal scrolling').toBeLessThanOrEqual(geometry.viewport);
        for (const line of geometry.lines) {
          expect.soft(line.left, `${line.text}: text must stay inside the left edge`).toBeGreaterThanOrEqual(-0.5);
          expect.soft(line.right, `${line.text}: complete text must stay inside the right edge`).toBeLessThanOrEqual(geometry.viewport + 0.5);
          expect.soft(line.top, `${line.text}: text must not be clipped above the footer`).toBeGreaterThanOrEqual(geometry.footer.top - 0.5);
          expect.soft(line.bottom, `${line.text}: text must not be clipped below the footer`).toBeLessThanOrEqual(geometry.footer.bottom + 0.5);
        }
      });
    }
  }
}
