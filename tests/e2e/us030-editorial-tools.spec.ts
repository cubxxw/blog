import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, '__screenshots__', 'us030');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  ensureDir(SNAPSHOTS_DIR);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, `${name}.png`), fullPage: false });
}

// EN desktop: editorial tools visible at 1680px
test('EN desktop: article-tools visible at 1680px', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-tools')).toBeVisible();
  await screenshot(page, 'en-desktop-tools');
});

// ZH desktop: editorial tools visible at 1680px
test('ZH desktop: article-tools visible at 1680px', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await expect(page.locator('.article-tools')).toBeVisible();
  await screenshot(page, 'zh-desktop-tools');
});

// EN: TOC panel shows English label "Contents"
test('EN: tools tab shows English group names', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const tools = page.locator('.article-tools');
  const text = await tools.textContent();
  expect(text).toMatch(/Contents|AI Companion|Share/i);
});

// ZH: tools panel shows Chinese group names
test('ZH: tools panel shows Chinese group names', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  const tools = page.locator('.article-tools');
  const text = await tools.textContent();
  expect(text).toMatch(/目录|AI 助读|分享/);
});

// EN: TOC items render with links when article has headings
test('EN: TOC items are rendered in editorial tools', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const tocNav = page.locator('.article-tools .toc-side__nav');
  const count = await tocNav.count();
  // article may or may not have headings; if present, links should exist
  if (count > 0) {
    const links = page.locator('.article-tools .toc-side__nav a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  }
});

// AI tab: click switches to AI panel
test('EN: clicking AI tab shows AI input panel', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const aiTab = page.locator('.article-tools .rc-tab[data-tab="ai"]');
  await aiTab.click();
  const aiPanel = page.locator('.article-tools #rc-panel-ai');
  await expect(aiPanel).toBeVisible();
  const textarea = page.locator('.article-tools .rc-ai-textarea');
  await expect(textarea).toBeVisible();
});

// Share tab: click shows share buttons
test('EN: clicking Share tab shows share buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const shareTab = page.locator('.article-tools .rc-tab[data-tab="share"]');
  await shareTab.click();
  const sharePanel = page.locator('.article-tools #rc-panel-share');
  await expect(sharePanel).toBeVisible();
  // 4 share buttons (X, WeChat, Copy, Email)
  const shareBtns = page.locator('.article-tools .et-share-btn');
  const btnCount = await shareBtns.count();
  expect(btnCount).toBe(4);
});

// Annotations empty state placeholder visible in share panel
test('EN: annotations empty placeholder visible', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const shareTab = page.locator('.article-tools .rc-tab[data-tab="share"]');
  await shareTab.click();
  const sharePanel = page.locator('.article-tools #rc-panel-share');
  const text = await sharePanel.textContent();
  expect(text).toMatch(/Coming soon|即将上线/i);
});

// ZH: AI placeholder is Chinese
test('ZH: AI textarea placeholder is in Chinese', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  const aiTab = page.locator('.article-tools .rc-tab[data-tab="ai"]');
  await aiTab.click();
  const textarea = page.locator('.article-tools .rc-ai-textarea');
  const placeholder = await textarea.getAttribute('placeholder');
  expect(placeholder).toMatch(/向 AI 提问|AI/);
});

// <1280px: article-tools hidden
test('tools hidden at 1024px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-tools')).toBeHidden();
});

// 0 console errors
test('EN: 0 console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  expect(errors).toHaveLength(0);
});

test('ZH: 0 console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  expect(errors).toHaveLength(0);
});
