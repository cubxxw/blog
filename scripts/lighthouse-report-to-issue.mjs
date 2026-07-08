#!/usr/bin/env node
// Sync a Lighthouse CI run to a fixed tracking issue on GitHub.
//
// Reads .lighthouseci/manifest.json (produced by `lhci autorun`), keeps only
// representative runs, formats a Markdown table with the five category scores
// per URL, and posts it as a new comment on the issue titled TRACKING_TITLE.
// The issue is created on first run with the `lighthouse` label.
//
// Adding a comment per run (instead of overwriting the body) preserves the
// trend — you can eyeball whether scores drift over time.
//
// Env (all provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo
//   GITHUB_RUN_ID       — link back to the workflow run
//   GITHUB_SHA          — the commit that triggered the run

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isAbsolute, join } from 'node:path';

const TRACKING_TITLE = 'Lighthouse CI — 站点性能跟踪';
const TRACKING_LABEL = 'lighthouse';
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
  `### Lighthouse — ${stamp}`,
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

const gh = (args, opts = {}) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts });

function findTrackingIssue() {
  const raw = gh([
    'issue',
    'list',
    '--repo', repo,
    '--state', 'open',
    '--search', `${TRACKING_TITLE} in:title`,
    '--json', 'number,title',
    '--limit', '20',
  ]);
  const list = JSON.parse(raw || '[]');
  const hit = list.find((i) => i.title === TRACKING_TITLE);
  return hit ? hit.number : null;
}

function createTrackingIssue() {
  const intro = [
    '这个 issue 由 `.github/workflows/lighthouse.yml` 自动维护。',
    '每次 push 到 `main` 后会追加一条评论，记录该次构建的 Lighthouse 分数。',
    '',
    '- 触发：`push: main`、手动 `workflow_dispatch`',
    '- 配置：`lighthouserc.json`（URL 列表 + 阈值）',
    '- 报告：workflow 的 `lighthouse-results` artifact（保留 14 天）',
  ].join('\n');
  const out = gh([
    'issue',
    'create',
    '--repo', repo,
    '--title', TRACKING_TITLE,
    '--label', TRACKING_LABEL,
    '--body', intro,
  ]);
  const m = out.match(/\/issues\/(\d+)/);
  if (!m) throw new Error(`Cannot parse issue number from: ${out}`);
  return Number(m[1]);
}

function ensureLabel() {
  try {
    gh(
      ['label', 'create', TRACKING_LABEL, '--repo', repo, '--color', 'F9D0C4', '--description', 'Lighthouse CI tracker'],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );
  } catch {
    // label already exists; ignore
  }
}

ensureLabel();
let number = findTrackingIssue();
if (!number) {
  number = createTrackingIssue();
  console.log(`Created tracking issue #${number}`);
}

gh(['issue', 'comment', String(number), '--repo', repo, '--body', body]);
console.log(`Appended Lighthouse report to issue #${number}`);
