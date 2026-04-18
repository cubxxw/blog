import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, '__screenshots__', 'us032');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  ensureDir(SNAPSHOTS_DIR);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, `${name}.png`), fullPage: true });
}

// Enable dark mode by adding .dark to body
async function enableDark(page: Page) {
  await page.evaluate(() => {
    document.body.classList.add('dark');
    localStorage.setItem('pref-theme', 'dark');
  });
  await page.waitForTimeout(200);
}

// ── US-032-01: EN Light — tokens resolve correctly ───────────────

test('EN light: --color-accent is dark olive (not dark override)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');

  const accent = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  // EN light accent should be ~#2e352e
  expect(accent).not.toBe('');
  expect(accent).not.toContain('ff3b3b'); // not ZH dark red
  await screenshot(page, 'en-light-desktop');
});

// ── US-032-02: EN Dark — tokens switch to dark palette ───────────

test('EN dark: --color-paper is dark (#121413)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const paper = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-paper').trim()
  );
  expect(paper).toMatch(/#?121413|18,20,19/i);
});

test('EN dark: --color-ink is light (#e2e3e1)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const ink = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-ink').trim()
  );
  expect(ink).toMatch(/#?e2e3e1|226,227,225/i);
});

test('EN dark: --color-accent is muted sage (#b4bcb2)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const accent = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  expect(accent).toMatch(/#?b4bcb2|180,188,178/i);
});

test('EN dark: drop-cap uses var(--color-accent) — color changes with dark', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');

  const accentLight = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  await enableDark(page);

  const accentDark = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  // accent should differ between light and dark
  expect(accentLight).not.toBe(accentDark);
});

test('EN dark: full page screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);
  await screenshot(page, 'en-dark-desktop');
});

// ── US-032-03: ZH Light — tokens resolve correctly ───────────────

test('ZH light: --color-accent is crimson (#862122)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');

  const accent = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  expect(accent).toMatch(/#?862122|134,33,34/i);
});

// ── US-032-04: ZH Dark — tokens switch to dark palette ───────────

test('ZH dark: --color-paper is warm dark (#1c1917)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const paper = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-paper').trim()
  );
  expect(paper).toMatch(/#?1c1917|28,25,23/i);
});

test('ZH dark: --color-ink is warm white (#f5f3ee)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const ink = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-ink').trim()
  );
  expect(ink).toMatch(/#?f5f3ee|245,243,238/i);
});

test('ZH dark: --color-accent is vivid red (#ff3b3b)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const accent = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  expect(accent).toMatch(/#?ff3b3b|255,59,59/i);
});

test('ZH dark: full page screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);
  await screenshot(page, 'zh-dark-desktop');
});

// ── US-032-05: Toggle toggle — EN light/dark stays distinct ──────

test('EN: dark class toggle changes --color-paper token', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');

  const paperLight = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-paper').trim()
  );
  await enableDark(page);
  const paperDark = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-paper').trim()
  );
  // remove dark again
  await page.evaluate(() => document.body.classList.remove('dark'));
  await page.waitForTimeout(200);
  const paperBack = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-paper').trim()
  );

  expect(paperLight).not.toBe(paperDark);
  expect(paperBack).toBe(paperLight); // toggle back = original
});

// ── US-032-06: ZH dark — accent for h2/drop-cap reflects token ───

test('ZH dark: h2 border-left color reflects --color-accent (#ff3b3b)', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const h2Color = await page.evaluate(() => {
    const h2 = document.querySelector('.post-content h2');
    if (!h2) return '';
    return getComputedStyle(h2).borderLeftColor;
  });
  // rgb(255,59,59) = #ff3b3b
  expect(h2Color).toMatch(/255,\s*59,\s*59/);
});

// ── US-032-07: 0 console errors ──────────────────────────────────

test('EN dark: 0 console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);
  await page.waitForTimeout(300);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});

test('ZH dark: 0 console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);
  await page.waitForTimeout(300);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
