import { test, expect } from '../helpers/frozen-site';

for (const route of ['/', '/zh/']) {
  test(`${route} product thumbnails load responsive WebP without changing the card geometry`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const shots = page.locator('.hp-product__shot');
    expect(await shots.count()).toBeGreaterThan(0);
    for (const shot of await shots.all()) {
      await shot.scrollIntoViewIfNeeded();
      const image = shot.locator('img');
      await expect.poll(() => image.evaluate(img => {
        const element = img as HTMLImageElement;
        return element.complete && element.naturalWidth > 0;
      })).toBe(true);
      const geometry = await image.evaluate(img => {
        const element = img as HTMLImageElement;
        const parent = element.closest('.hp-product__shot')!;
        const box = element.getBoundingClientRect();
        const frame = parent.getBoundingClientRect();
        return { src: element.currentSrc, width: box.width, height: box.height,
          frameWidth: frame.width, frameHeight: frame.height,
          sourceWidth: Number(element.getAttribute('width')),
          naturalWidth: element.naturalWidth, loading: element.loading, dpr: window.devicePixelRatio };
      });
      expect(geometry.src).toMatch(/\/images\/products\/.+\.webp$/);
      expect(geometry.loading).toBe('lazy');
      expect(geometry.naturalWidth).toBeLessThanOrEqual(geometry.sourceWidth);
      expect(Math.abs(geometry.width - geometry.frameWidth)).toBeLessThan(2);
      expect(Math.abs(geometry.height - geometry.frameHeight)).toBeLessThan(2);
      const srcset = await shot.locator('source').getAttribute('srcset');
      const widths = srcset!.split(',').map(candidate => Number(candidate.trim().split(/\s+/).pop()!.replace('w', '')));
      expect(new Set(widths).size).toBe(widths.length);
      const selected = srcset!.split(',').find(candidate => new URL(candidate.trim().split(/\s+/)[0], geometry.src).href === geometry.src)!;
      const selectedWidth = Number(selected.trim().split(/\s+/).pop()!.replace('w', ''));
      expect(selectedWidth).toBeGreaterThanOrEqual(Math.min(geometry.width * geometry.dpr, Math.max(...widths)));
    }
  });
}
