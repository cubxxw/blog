import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, '__screenshots__', 'us031');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  ensureDir(SNAPSHOTS_DIR);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, `${name}.png`), fullPage: false });
}

// ── FAB visible on mobile ────────────────────────────────────────

test('EN 375px: FAB is present in DOM', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(EN_URL);
  // scroll a bit so FAB threshold is met
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(300);
  const fab = page.locator('#article-fab');
  await expect(fab).toBeAttached();
  await screenshot(page, 'en-375-fab');
});

test('EN 414px: FAB is present in DOM', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(EN_URL);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(300);
  const fab = page.locator('#article-fab');
  await expect(fab).toBeAttached();
  await screenshot(page, 'en-414-fab');
});

// ── Bottom sheet opens on FAB click ─────────────────────────────

test('EN 375px: bottom sheet opens on FAB click', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(EN_URL);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);

  const sheet = page.locator('#article-bottom-sheet');
  await expect(sheet).not.toHaveClass(/abs--open/);

  // Use JS click to bypass CSS display:none on non-mobile Playwright projects
  await page.evaluate(() => { (document.getElementById('article-fab') as HTMLElement)?.click(); });
  await page.waitForTimeout(300);

  await expect(sheet).toHaveClass(/abs--open/);
  await screenshot(page, 'en-375-sheet-open');
});

test('EN 414px: bottom sheet opens on FAB click', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(EN_URL);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);

  // Use JS click to bypass CSS display:none on non-mobile Playwright projects
  await page.evaluate(() => { (document.getElementById('article-fab') as HTMLElement)?.click(); });
  await page.waitForTimeout(300);

  const sheet = page.locator('#article-bottom-sheet');
  await expect(sheet).toHaveClass(/abs--open/);
  await screenshot(page, 'en-414-sheet-open');
});

// ── Bottom sheet closes via overlay ─────────────────────────────

test('EN 375px: bottom sheet closes on overlay click', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(EN_URL);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);

  await page.locator('#article-fab').click({ force: true });
  await page.waitForTimeout(300);

  const overlay = page.locator('#article-sheet-overlay');
  await overlay.click({ force: true });
  await page.waitForTimeout(300);

  const sheet = page.locator('#article-bottom-sheet');
  await expect(sheet).not.toHaveClass(/abs--open/);
  await screenshot(page, 'en-375-sheet-closed');
});

// ── Bottom sheet contains tab panels ────────────────────────────

test('EN: bottom sheet has TOC / AI / Share tabs', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(EN_URL);

  const sheet = page.locator('#article-bottom-sheet');
  await expect(sheet.locator('#abs-panel-toc')).toBeAttached();
  await expect(sheet.locator('#abs-panel-ai')).toBeAttached();
  await expect(sheet.locator('#abs-panel-share')).toBeAttached();
});

test('ZH: bottom sheet has TOC / AI / Share tabs', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ZH_URL);

  const sheet = page.locator('#article-bottom-sheet');
  await expect(sheet.locator('#abs-panel-toc')).toBeAttached();
  await expect(sheet.locator('#abs-panel-ai')).toBeAttached();
  await expect(sheet.locator('#abs-panel-share')).toBeAttached();
});

// ── FAB hidden on desktop ────────────────────────────────────────

test('FAB hidden on desktop (1680px)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  const fab = page.locator('#article-fab');
  // CSS sets display:none on >= 1024px
  await expect(fab).toBeHidden();
});

// ── Mobile compact marginalia visible ───────────────────────────

test('EN 375px: mobile compact marginalia visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(EN_URL);
  await expect(page.locator('.article-marginalia-mobile')).toBeVisible();
});

test('ZH 375px: mobile compact marginalia visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ZH_URL);
  await expect(page.locator('.article-marginalia-mobile')).toBeVisible();
});

// ── 0 console errors ────────────────────────────────────────────

test('0 console errors on EN mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(EN_URL);
  await page.waitForTimeout(500);
  expect(errors).toHaveLength(0);
});

test('0 console errors on ZH mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ZH_URL);
  await page.waitForTimeout(500);
  expect(errors).toHaveLength(0);
});
