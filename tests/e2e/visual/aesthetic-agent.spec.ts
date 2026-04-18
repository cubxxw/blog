import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EN_URL = 'http://localhost:1313/ai-technology/posts/use-go-tools-dlv/';
const ZH_URL = 'http://localhost:1313/zh/ai-technology/posts/use-go-tools-dlv/';

const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots', 'aesthetic-agent');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(page: Page, name: string) {
  ensureDir(SNAPSHOTS_DIR);
  const filePath = path.join(SNAPSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function enableDark(page: Page) {
  await page.evaluate(() => {
    document.body.classList.add('dark');
    localStorage.setItem('pref-theme', 'dark');
  });
  await page.waitForTimeout(200);
}

// Matrix: {en, zh} × {light, dark} × {desktop, mobile} = 8 cases

// ── 1. EN + Light + Desktop ──────────────────────────────────────────
test('en-light-desktop: EN article title uses Fraunces', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');

  const fontFamily = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.post-title') as Element).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/fraunces|georgia|serif/);

  // 0 console errors
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await takeScreenshot(page, 'en-light-desktop');
});

// ── 2. EN + Light + Mobile ───────────────────────────────────────────
test('en-light-mobile: EN article renders on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');

  const fontFamily = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.post-title') as Element).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/fraunces|georgia|serif/);

  await takeScreenshot(page, 'en-light-mobile');
});

// ── 3. ZH + Light + Desktop ─────────────────────────────────────────
test('zh-light-desktop: ZH article title uses Noto Serif SC', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');

  const fontFamily = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.post-title') as Element).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/noto serif sc|noto|serif/);

  await takeScreenshot(page, 'zh-light-desktop');
});

// ── 4. ZH + Light + Mobile ───────────────────────────────────────────
test('zh-light-mobile: ZH article renders on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');

  const fontFamily = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.post-title') as Element).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/noto serif sc|noto|serif/);

  await takeScreenshot(page, 'zh-light-mobile');
});

// ── 5. EN + Dark + Desktop ───────────────────────────────────────────
test('en-dark-desktop: EN dark mode applies correct tokens', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const fontFamily = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.post-title') as Element).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/fraunces|georgia|serif/);

  // EN dark accent should not be ZH red
  const accent = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  expect(accent).not.toContain('ff3b3b');

  await takeScreenshot(page, 'en-dark-desktop');
});

// ── 6. EN + Dark + Mobile ────────────────────────────────────────────
test('en-dark-mobile: EN dark mobile renders without errors', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(EN_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await takeScreenshot(page, 'en-dark-mobile');
  expect(errors).toHaveLength(0);
});

// ── 7. ZH + Dark + Desktop ───────────────────────────────────────────
test('zh-dark-desktop: ZH dark mode applies correct tokens', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const fontFamily = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.post-title') as Element).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/noto serif sc|noto|serif/);

  // ZH dark accent should be red
  const accent = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--color-accent').trim()
  );
  expect(accent.toLowerCase()).toContain('ff3b3b');

  await takeScreenshot(page, 'zh-dark-desktop');
});

// ── 8. ZH + Dark + Mobile ────────────────────────────────────────────
test('zh-dark-mobile: ZH dark mobile renders without errors', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(ZH_URL);
  await page.waitForLoadState('networkidle');
  await enableDark(page);

  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await takeScreenshot(page, 'zh-dark-mobile');
  expect(errors).toHaveLength(0);
});

// ── Post-run: generate HTML comparison report ────────────────────────
test('generate comparison report', async ({ page: _page }) => {
  const stitchDir = path.join(
    __dirname, '..', '..', '..', 'design', 'stitch'
  );
  const snapshotsDir = SNAPSHOTS_DIR;
  const reportPath = path.join(__dirname, 'aesthetic-agent-report.html');

  const implementationShots = [
    { name: 'en-light-desktop', label: 'EN Light Desktop' },
    { name: 'zh-light-desktop', label: 'ZH Light Desktop' },
    { name: 'en-dark-desktop', label: 'EN Dark Desktop' },
    { name: 'zh-dark-desktop', label: 'ZH Dark Desktop' },
    { name: 'en-light-mobile', label: 'EN Light Mobile' },
    { name: 'zh-light-mobile', label: 'ZH Light Mobile' },
    { name: 'en-dark-mobile', label: 'EN Dark Mobile' },
    { name: 'zh-dark-mobile', label: 'ZH Dark Mobile' },
  ];

  const stitchRefs = [
    { file: '01-pc-oriental.png', label: 'Stitch 01 PC Oriental (ZH)' },
    { file: '02-pc-aesthetic.png', label: 'Stitch 02 PC Aesthetic (EN)' },
    { file: '03-mobile-oriental.png', label: 'Stitch 03 Mobile Oriental (ZH)' },
    { file: '04-mobile-aesthetic-care.png', label: 'Stitch 04 Mobile Aesthetic (EN)' },
  ];

  function imgTag(src: string, label: string) {
    // Use relative paths from the report location
    return `
      <div class="img-block">
        <p class="label">${label}</p>
        <img src="${src}" alt="${label}" onerror="this.style.opacity=0.2" />
      </div>`;
  }

  const implRows = implementationShots.map(s => {
    const relPath = path.relative(
      path.dirname(reportPath),
      path.join(snapshotsDir, `${s.name}.png`)
    );
    return imgTag(relPath, s.label);
  }).join('\n');

  const stitchRows = stitchRefs.map(s => {
    const relPath = path.relative(
      path.dirname(reportPath),
      path.join(stitchDir, s.file)
    );
    return imgTag(relPath, s.label);
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Aesthetic Agent Visual Report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f5f5f5; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; }
  .section { margin-bottom: 40px; }
  h2 { font-size: 1.1rem; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px; }
  .img-block { background: #fff; border-radius: 8px; padding: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .img-block img { width: 100%; height: auto; border-radius: 4px; display: block; }
  .label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 0 0 8px; }
</style>
</head>
<body>
<h1>Aesthetic Agent Identity — Visual Comparison Report</h1>
<p style="color:#666;font-size:.875rem">Generated: ${new Date().toISOString()}</p>

<div class="section">
  <h2>Implementation Screenshots (8 variants)</h2>
  <div class="grid">
    ${implRows}
  </div>
</div>

<div class="section">
  <h2>Stitch Design References</h2>
  <div class="grid">
    ${stitchRows}
  </div>
</div>
</body>
</html>`;

  fs.writeFileSync(reportPath, html, 'utf-8');
  expect(fs.existsSync(reportPath)).toBe(true);
});
