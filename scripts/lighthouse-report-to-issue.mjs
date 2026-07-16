#!/usr/bin/env node
// Sync a Lighthouse CI run into the shared daily site-report issue.
//
// Reads .lighthouseci/manifest.json (produced by `lhci autorun`), keeps only
// representative runs, formats a Markdown table with the five category scores
// per URL, and writes it into the `lighthouse` section of today's report issue
// (see scripts/daily-report-issue.mjs).
//
// This used to append a comment per run to a dedicated rolling issue. Because
// Lighthouse runs on every push, that buried the issue — five comments in one
// day was normal, and nobody reads a 43-comment thread. Now the section is
// OVERWRITTEN in place, so the issue shows the latest scores for the day and
// the day-over-day trend lives in the sequence of daily issues instead.
//
// Env (all provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo
//   GITHUB_RUN_ID       — link back to the workflow run
//   GITHUB_SHA          — the commit that triggered the run

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import {
  ensureDailyIssue,
  upsertSection,
  closeStaleDailyIssues,
} from './daily-report-issue.mjs';

const SECTION_MARKER = 'lighthouse';
const MANIFEST = '.lighthouseci/manifest.json';
const LHCI_DIR = '.lighthouseci';

const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const sha = process.env.GITHUB_SHA || '';

if (!repo) {
  console.error('GITHUB_REPOSITORY missing; skip issue sync.');
  process.exit(0);
}

if (!existsSync(MANIFEST)) {
  console.error(`${MANIFEST} not found; lhci probably failed before writing results. Skip.`);
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const runs = manifest.filter((r) => r.isRepresentativeRun);
if (runs.length === 0) {
  console.error('No representative runs in manifest; skip.');
  process.exit(0);
}

const fmt = (n) => (typeof n === 'number' ? Math.round(n * 100) : '—');
const short = sha.slice(0, 7);
const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
const commitUrl = sha ? `https://github.com/${repo}/commit/${sha}` : '';
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const rows = runs
  .map((r) => {
    const s = r.summary || {};
    return `| ${r.url} | ${fmt(s.performance)} | ${fmt(s.accessibility)} | ${fmt(s['best-practices'])} | ${fmt(s.seo)} | ${fmt(s.pwa)} |`;
  })
  .join('\n');

// lhci writes jsonPath as an absolute path inside the runner; resolve it
// robustly whether we get an absolute string or a name relative to LHCI_DIR.
function resolveReportPath(p) {
  if (!p) return null;
  if (isAbsolute(p)) return existsSync(p) ? p : null;
  const rel = join(LHCI_DIR, p);
  return existsSync(rel) ? rel : existsSync(p) ? p : null;
}

// Diagnostics per URL: Core Web Vitals + top 3 opportunities with meaningful
// savings. Fed by the lhr JSON that lhci dumps alongside manifest.json.
function readDetails(jsonPath) {
  const resolved = resolveReportPath(jsonPath);
  if (!resolved) return null;
  let lhr;
  try {
    lhr = JSON.parse(readFileSync(resolved, 'utf8'));
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

const detailSections = runs.map((r) => {
  const d = readDetails(r.jsonPath);
  if (!d) return `<details><summary>${r.url}</summary>\n\n(no detailed report)\n\n</details>`;
  const metricsTbl = [
    '| Metric | Value |',
    '| --- | --- |',
    ...d.metrics.map(([k, v]) => `| ${k} | ${v} |`),
  ].join('\n');
  const oppsBlock = d.opps.length ? ['', '**Top opportunities**', ...d.opps].join('\n') : '';
  return `<details><summary>${r.url}</summary>\n\n${metricsTbl}${oppsBlock}\n\n</details>`;
}).join('\n');

const body = [
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

const number = ensureDailyIssue({ repo });
upsertSection({ repo, issueNumber: number, marker: SECTION_MARKER, content: body });
console.log(`Wrote Lighthouse section into daily issue #${number}`);

// Reap yesterday's report once today's is known-good. Doing it here (rather
// than in a separate step) means we never close the old issue unless the new
// one actually received content.
closeStaleDailyIssues({ repo, keepNumber: number });
