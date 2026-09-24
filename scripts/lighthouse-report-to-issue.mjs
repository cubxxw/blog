#!/usr/bin/env node
// Sync a Lighthouse CI run into the shared daily site-report issue.
//
// Reads .lighthouseci/manifest.json (produced by `lhci autorun`), keeps only
// representative runs, formats a Markdown table with the five category scores
// per URL, and writes it into the `lighthouse` section of today's report issue
// (see scripts/daily-report-issue.mjs).
//
// The section is OVERWRITTEN in place: the issue shows the latest scores for
// the day and the trend lives in the sequence of daily issues.
//
// B2 minimal publication integration:
//   * the run's FROZEN UTC report date (--date) is propagated to the shared
//     daily-issue identity and the date-aware close (a delayed older-day run
//     never closes a newer daily issue);
//   * a missing manifest / no representative runs publishes an HONEST missing-
//     measurement section and exits nonzero — it never silently keeps stale
//     content or exits 0 as if publication covered real measurements;
//   * manifest `jsonPath` is resolved ONLY artifact-locally (basename within
//     the downloaded artifact directory) with path-boundary validation: an
//     absolute measurement-runner path never reads arbitrary local files, and
//     moving publication does not silently lose the diagnostic details.
//
// Env (all provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo
//   GITHUB_RUN_ID       — link back to the workflow run
//   GITHUB_SHA          — the commit that triggered the run

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  closeStaleDailyIssues,
  ensureDailyIssue,
  upsertSection,
} from './daily-report-issue.mjs';

export const SECTION_MARKER = 'lighthouse';
export const MANIFEST = '.lighthouseci/manifest.json';
export const LHCI_DIR = '.lighthouseci';

const fmt = (n) => (typeof n === 'number' ? Math.round(n * 100) : '—');

// Artifact-local report resolution with path-boundary validation. lhci writes
// jsonPath as an absolute path inside the MEASUREMENT runner, but publication
// may run in a fresh job where the reports live in the downloaded artifact
// directory. Only the basename (or a normalized .lighthouseci/ prefix) inside
// that directory is ever opened; `..`, other directories and absolute escapes
// resolve to null instead of reading arbitrary local paths.
export function resolveReportPath(jsonPath, { dir = LHCI_DIR, exists = existsSync } = {}) {
  if (typeof jsonPath !== 'string' || jsonPath === '') return null;
  const cleaned = jsonPath.replace(/\\/g, '/');
  const segments = cleaned.split('/').filter((s) => s !== '');
  // Explicit traversal attempts are rejected outright; ordinary absolute or
  // prefixed paths resolve to their basename INSIDE the artifact directory.
  if (segments.some((s) => s === '.' || s === '..' || s.includes('\0'))) return null;
  const base = segments[segments.length - 1] ?? null;
  if (!base) return null;
  const candidate = join(dir, base);
  const rel = relative(resolve(dir), resolve(candidate));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null; // boundary
  return exists(candidate) ? candidate : null;
}

// Diagnostics per URL: Core Web Vitals + top 3 opportunities with meaningful
// savings. Fed by the lhr JSON that lhci dumps alongside manifest.json.
export function readDetails(jsonPath, { dir = LHCI_DIR, fs = { readFileSync, existsSync } } = {}) {
  const resolved = resolveReportPath(jsonPath, { dir, exists: fs.existsSync });
  if (!resolved) return null;
  let lhr;
  try {
    lhr = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    return null;
  }
  const a = lhr.audits || {};
  const pick = (id) => {
    const audit = a[id];
    if (!audit) return '—';
    if (audit.displayValue) return audit.displayValue;
    if (typeof audit.numericValue === 'number') return `${Math.round(audit.numericValue)}`;
    return '—';
  };
  const metrics = [
    ['LCP', pick('largest-contentful-paint')],
    ['FCP', pick('first-contentful-paint')],
    ['CLS', pick('cumulative-layout-shift')],
    ['TBT', pick('total-blocking-time')],
    ['SI',  pick('speed-index')],
    ['TTI', pick('interactive')],
  ];
  const opps = Object.values(a)
    .filter((audit) => audit && typeof audit.numericValue === 'number' && audit.details && audit.details.type === 'opportunity' && audit.numericValue >= 100)
    .sort((x, y) => y.numericValue - x.numericValue)
    .slice(0, 3)
    .map((audit) => `- **${audit.title}** — potential savings ${Math.round(audit.numericValue)} ms`);
  return { metrics, opps };
}

export function buildSection({ runs, repo, runId, sha, stamp, dir = LHCI_DIR, fs }) {
  const short = sha.slice(0, 7);
  const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
  const commitUrl = sha ? `https://github.com/${repo}/commit/${sha}` : '';

  const rows = runs
    .map((r) => {
      const s = r.summary || {};
      return `| ${r.url} | ${fmt(s.performance)} | ${fmt(s.accessibility)} | ${fmt(s['best-practices'])} | ${fmt(s.seo)} | ${fmt(s.pwa)} |`;
    })
    .join('\n');

  const detailSections = runs.map((r) => {
    const d = readDetails(r.jsonPath, { dir, fs });
    if (!d) return `<details><summary>${r.url}</summary>\n\n(no detailed report at the artifact-local path)\n\n</details>`;
    const metricsTbl = [
      '| Metric | Value |',
      '| --- | --- |',
      ...d.metrics.map(([k, v]) => `| ${k} | ${v} |`),
    ].join('\n');
    const oppsBlock = d.opps.length ? ['', '**Top opportunities**', ...d.opps].join('\n') : '';
    return `<details><summary>${r.url}</summary>\n\n${metricsTbl}${oppsBlock}\n\n</details>`;
  }).join('\n');

  return [
    '### 🔦 Lighthouse',
    '',
    `更新于 ${stamp}`,
    '',
    commitUrl ? `Commit: [\`${short}\`](${commitUrl}) · [Workflow run](${runUrl})` : `[Workflow run](${runUrl})`,
    '',
    '| URL | Perf | A11y | Best-Practices | SEO | PWA |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    rows,
    '',
    '#### 每 URL 详细指标（点击展开）',
    detailSections,
  ].join('\n');
}

// Honest minimal section when measurement artifacts are missing: published so
// the daily issue shows the gap instead of stale scores.
export function buildMissingSection({ repo, runId, sha, stamp, reason }) {
  const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
  return [
    '### 🔦 Lighthouse',
    '',
    `更新于 ${stamp}`,
    '',
    `[Workflow run](${runUrl})${sha ? ` · Commit: \`${sha.slice(0, 7)}\`` : ''}`,
    '',
    `状态: **测量产物缺失**（${reason}）。本次没有可验证的 Lighthouse 结果；不以旧结果或空表冒充当前测量。`,
  ].join('\n');
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const env = deps.env ?? process.env;
  const fs = deps.fs ?? { readFileSync, existsSync };
  const errorLog = deps.errorLog ?? console.error;
  const log = deps.log ?? console.log;

  const repo = env.GITHUB_REPOSITORY;
  const runId = env.GITHUB_RUN_ID;
  const sha = env.GITHUB_SHA || '';
  if (!repo) {
    errorLog('GITHUB_REPOSITORY missing; cannot sync the Lighthouse section.');
    return 1;
  }

  let date = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && /^\d{4}-\d{2}-\d{2}$/.test(argv[i + 1] ?? '')) {
      date = argv[i + 1];
      i += 1;
    } else {
      errorLog(`Unknown or invalid argument: ${argv[i]}`);
      errorLog('Usage: node scripts/lighthouse-report-to-issue.mjs [--date YYYY-MM-DD]');
      return 1;
    }
  }
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  let runs = null;
  let reason = null;
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(join(LHCI_DIR, 'manifest.json'), 'utf8'));
  } catch {
    reason = `${MANIFEST} 不存在或不可解析（lhci 可能在写出结果前失败）`;
  }
  if (manifest && !Array.isArray(manifest)) {
    manifest = null;
    reason = `${MANIFEST} 不是 manifest 数组`;
  }
  if (manifest) {
    // Zero eligible representative rows IS missing evidence: an empty table is
    // never published as success (manifest=[] or all isRepresentativeRun:false
    // must publish the honest missing state and exit nonzero).
    const eligible = manifest.filter((r) => r && r.isRepresentativeRun === true && typeof r.url === 'string');
    if (eligible.length > 0) {
      runs = eligible;
    } else {
      reason = 'manifest 中没有可读取的 representative run（零可发布测量 = 缺失证据）';
    }
  }
  const haveEvidence = runs !== null && runs.length > 0;
  const body = haveEvidence
    ? buildSection({ runs, repo, runId, sha, stamp, dir: LHCI_DIR, fs })
    : buildMissingSection({ repo, runId, sha, stamp, reason });

  const ensureOpts = { repo };
  if (date) ensureOpts.date = date;
  if (deps.gh) ensureOpts.gh = deps.gh;
  const number = ensureDailyIssue(ensureOpts);
  const upsertOpts = { repo, issueNumber: number, marker: SECTION_MARKER, content: body };
  if (deps.gh) upsertOpts.gh = deps.gh;
  upsertSection(upsertOpts);
  log(`Wrote Lighthouse section into daily issue #${number}`);

  // Reap yesterday's report once today's is known-good (date-aware: only
  // strictly older days are ever closed).
  const closeOpts = { repo, keepNumber: number };
  if (date) closeOpts.date = date;
  if (deps.gh) closeOpts.gh = deps.gh;
  closeStaleDailyIssues(closeOpts);

  if (!haveEvidence) {
    // Publication succeeded (honest gap), but the measurement evidence is
    // missing/invalid: nonzero so the run is never silently green.
    errorLog(`No publishable measurement artifacts: ${reason}`);
    return 1;
  }
  return 0;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().then((code) => {
    process.exitCode = code;
  });
}
