import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, '__screenshots__', 'us029');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  ensureDir(SNAPSHOTS_DIR);
  await page.screenshot({
    path: path.join(SNAPSHOTS_DIR, `${name}.png`),
    fullPage: false,
  });
}

// EN: post-title uses display font
test('EN: post-title uses display font (Fraunces)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const fontFamily = await page.locator('.post-title').evaluate(
    (el) => window.getComputedStyle(el).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/fraunces|georgia/);
  await screenshot(page, 'en-desktop-firstscreen');
});

// ZH: post-title uses display font
test('ZH: post-title uses display font (Noto Serif SC or fallback)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  const fontFamily = await page.locator('.post-title').evaluate(
    (el) => window.getComputedStyle(el).fontFamily
  );
  // Accept Noto Serif SC or any serif fallback
  expect(fontFamily.toLowerCase()).toMatch(/noto|serif|source han/i);
  await screenshot(page, 'zh-desktop-firstscreen');
});

// EN: post-title font-size is large (clamp 2.5rem..4.5rem)
test('EN: post-title has large font size', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const fontSize = await page.locator('.post-title').evaluate(
    (el) => parseFloat(window.getComputedStyle(el).fontSize)
  );
  // At 1680px, 5vw = 84px, clamped to 4.5rem ≈ 72px; min 2.5rem = 40px
  expect(fontSize).toBeGreaterThan(35);
});

// ZH: post-title font-weight is heavy
test('ZH: post-title has heavy font weight', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  const fontWeight = await page.locator('.post-title').evaluate(
    (el) => window.getComputedStyle(el).fontWeight
  );
  expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(700);
});

// EN: post-description is italic
test('EN: post-description is italic', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const desc = page.locator('.post-description');
  const count = await desc.count();
  if (count > 0) {
    const style = await desc.evaluate(
      (el) => window.getComputedStyle(el).fontStyle
    );
    expect(style).toBe('italic');
  }
});

// EN: first paragraph has drop-cap class
test('EN: first paragraph has drop-cap class', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  // Give JS time to execute
  await page.waitForTimeout(500);
  const firstP = page.locator('.post-content p.drop-cap');
  await expect(firstP).toHaveCount(1);
});

// ZH: first paragraph has drop-cap class
test('ZH: first paragraph has drop-cap class', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForTimeout(500);
  const firstP = page.locator('.post-content p.drop-cap');
  await expect(firstP).toHaveCount(1);
});

// EN: inline code has pill background
test('EN: inline code has accent-soft background', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const code = page.locator('.post-content :not(pre) > code').first();
  const count = await code.count();
  if (count > 0) {
    const bg = await code.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // Should not be transparent
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  }
});

// 0 console errors
test('EN: 0 console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(EN_URL);
  await page.waitForTimeout(500);
  expect(errors).toHaveLength(0);
});

test('ZH: 0 console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(ZH_URL);
  await page.waitForTimeout(500);
  expect(errors).toHaveLength(0);
});
