import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, '__screenshots__', 'us028');

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

// EN desktop: marginalia visible with English labels
test('EN desktop: marginalia visible with English labels', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-marginalia')).toBeVisible();
  const marginalia = page.locator('.article-marginalia');
  // Should contain English labels (case-insensitive)
  const text = await marginalia.textContent();
  expect(text).toMatch(/Principal|Chronicle|Dimensions|Dialect/i);
  await screenshot(page, 'en-desktop-marginalia');
});

// ZH desktop: marginalia visible with Chinese labels
test('ZH desktop: marginalia visible with Chinese labels', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await expect(page.locator('.article-marginalia')).toBeVisible();
  const marginalia = page.locator('.article-marginalia');
  const text = await marginalia.textContent();
  // Chinese labels
  expect(text).toMatch(/作者|日期|篇幅|语言/);
  await screenshot(page, 'zh-desktop-marginalia');
});

// EN mobile: compact marginalia visible, desktop aside hidden
test('EN mobile: compact marginalia visible, aside hidden', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-marginalia-mobile')).toBeVisible();
  // Desktop aside should be hidden (display:none via CSS)
  const desktopAside = page.locator('.article-marginalia');
  await expect(desktopAside).toBeHidden();
  await screenshot(page, 'en-mobile-marginalia');
});

// ZH mobile: compact marginalia visible
test('ZH mobile: compact marginalia visible', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(ZH_URL);
  await expect(page.locator('.article-marginalia-mobile')).toBeVisible();
  await screenshot(page, 'zh-mobile-marginalia');
});

// marginalia contains date value
test('EN: marginalia date formatted as English', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const marginalia = page.locator('.article-marginalia');
  const text = await marginalia.textContent();
  // EN date format: "Month DD, YYYY"
  expect(text).toMatch(/\w+ \d+, \d{4}/);
});

test('ZH: marginalia date formatted as Chinese', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  const marginalia = page.locator('.article-marginalia');
  const text = await marginalia.textContent();
  // ZH date format: "YYYY 年 M 月 D 日"
  expect(text).toMatch(/\d{4}\s*年/);
});

// No console errors
test('EN: no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(EN_URL);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});

test('ZH: no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(ZH_URL);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
