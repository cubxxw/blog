#!/usr/bin/env node
// Read-only production observation. This never builds, deploys, publishes an
// issue, or invokes the site's model/subscription endpoints.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const SITE = 'https://cubxxw.com';
export function auditRequestPolicy(value, method) {
  const url = new URL(value);
  if (url.origin !== SITE) return 'block-external';
  if (!['GET', 'HEAD'].includes(method)) return 'block-method';
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return 'block-api'; }
  if (path.startsWith('/.netlify/functions/') || path.startsWith('/api/')) return 'block-api';
  return 'allow';
}
export function summarizePublicAudit({ before, after, pages }) {
  const known = (marker) => marker && /^[0-9a-f]{40}$/.test(marker.sourceSha) && typeof marker.releaseId === 'string' && marker.releaseId;
  const versionStatus = !known(before) || !known(after) ? 'unversioned'
    : before.sourceSha === after.sourceSha && before.releaseId === after.releaseId ? 'consistent' : 'changed-during-audit';
  return { schema: 'blog-public-audit/1', versionStatus, before, after, pages, ok: pages.length > 0 && pages.every((page) => page.ok) && versionStatus !== 'changed-during-audit' };
}

export async function auditPublicSite({ outDir = 'reports/public', fetchImpl = fetch } = {}) {
  const { chromium } = await import('@playwright/test');
  mkdirSync(outDir, { recursive: true });
  const marker = async () => {
    try {
      const response = await fetchImpl(`${SITE}/__release.json`, { redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return null;
      const value = await response.json();
      return { sourceSha: value.sourceSha, releaseId: value.releaseId };
    } catch { return null; }
  };
  const before = await marker();
  const paths = new Set(['/', '/zh/', '/projects/', '/zh/projects/', '/engineering/posts/go-release-tools/', '/zh/engineering/posts/go-release-tools/']);
  let samplingWarning = null;
  try {
    const response = await fetchImpl(`${SITE}/sitemap.xml`, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`sitemap ${response.status}`);
    const week = Math.floor(Date.now() / (7 * 86_400_000));
    const candidates = [...(await response.text()).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)]
      .map((match) => new URL(match[1].trim().replaceAll('&amp;', '&')))
      .filter((url) => url.origin === SITE && url.pathname.includes('/posts/'))
      .map((url) => ({ path: url.pathname, rank: createHash('sha256').update(`${week}:${url.pathname}`).digest('hex') }))
      .sort((a, b) => a.rank.localeCompare(b.rank));
    for (const candidate of candidates.slice(0, 8)) paths.add(candidate.path);
  } catch (error) { samplingWarning = error.message; }
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    for (const width of [375, 1280]) for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('**/*', (route) => {
        const decision = auditRequestPolicy(route.request().url(), route.request().method());
        if (decision === 'allow') return route.continue();
        if (decision === 'block-api') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"read-only public audit"}' });
        return route.abort();
      });
      for (const path of paths) {
        const page = await context.newPage();
        const failures = [];
        const key = createHash('sha256').update(`${path}:${width}:${colorScheme}`).digest('hex').slice(0, 16);
        try {
          await page.addInitScript((theme) => localStorage.setItem('pref-theme', theme), colorScheme);
          const response = await page.goto(`${SITE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          if (response?.status() !== 200) failures.push(`HTTP ${response?.status()}`);
          if (!await page.locator('body').isVisible()) failures.push('Missing visible body');
          if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) failures.push('Horizontal page overflow');
          if (path.includes('/go-release-tools/')) {
            const table = page.locator('table').filter({ hasText: '.ProjectName' }).first();
            if (await table.locator('tbody tr').count() !== 40) failures.push('GoReleaser table does not have 40 rows');
          }
          if (width === 375 && colorScheme === 'light') writeFileSync(join(outDir, `${key}.html`), await page.content());
          if (failures.length) await page.screenshot({ path: join(outDir, `${key}.png`), fullPage: false });
        } catch (error) { failures.push(error.message); }
        pages.push({ path, width, colorScheme, failures, ok: failures.length === 0 });
        await page.close();
      }
      await context.close();
    }
  } finally { await browser.close(); }
  const report = { ...summarizePublicAudit({ before, after: await marker(), pages }), samplingWarning };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--out-dir')) {
    console.error('Usage: audit-public-site.mjs [--out-dir reports/public]'); process.exitCode = 2;
  } else auditPublicSite({ outDir: args[1] }).then((report) => {
    console.log(`Public audit: ${report.pages.length} measurements; version ${report.versionStatus}.`);
    if (!report.ok) process.exitCode = 1;
  }).catch((error) => { console.error(error.message); process.exitCode = 2; });
}
