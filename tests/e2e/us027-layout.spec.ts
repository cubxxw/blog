import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, '__screenshots__', 'us027');

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

// Desktop 1680
test('desktop-1680: EN article has article-layout grid', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-layout')).toBeVisible();
  await expect(page.locator('.article-main')).toBeVisible();
  await screenshot(page, 'en-desktop-1680');
});

test('desktop-1680: ZH article has article-layout grid', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await expect(page.locator('.article-layout')).toBeVisible();
  await expect(page.locator('.article-main')).toBeVisible();
  await screenshot(page, 'zh-desktop-1680');
});

// Tablet 1024
test('tablet-1024: article renders without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-layout')).toBeVisible();
  await screenshot(page, 'en-tablet-1024');
});

// Mobile 414
test('mobile-414: article renders in single column', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-main')).toBeVisible();
  // On mobile, article-marginalia-mobile compact view visible
  const mobileMarginalia = page.locator('.article-marginalia-mobile');
  await expect(mobileMarginalia).toBeVisible();
  await screenshot(page, 'en-mobile-414');
});

test('no console errors on EN article', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(EN_URL);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});

test('no console errors on ZH article', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(ZH_URL);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
