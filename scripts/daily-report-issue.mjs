#!/usr/bin/env node
// Shared helper for the one-issue-per-day site report on GitHub.
//
// Before this existed, every reporter owned its own rolling tracking issue and
// appended a comment per run — Lighthouse fires on every push, so a single day
// could bury the issue under five comments and the SEO notes lived somewhere
// else entirely. Nobody reads a 43-comment thread.
//
// The model here: ONE issue per day titled `站点日报 — YYYY-MM-DD`, carrying one
// section per reporter. A reporter re-running the same day OVERWRITES its own
// section instead of appending, so the issue always shows the latest state
// rather than a history. Yesterday's issue is closed when today's opens, which
// keeps `is:open label:daily-report` down to exactly one live issue.
//
// Sections are delimited by HTML comment markers so writers never collide:
// each one only ever touches the text between its own marker pair.
//
// Env (provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo
//
// Usage as a module:
//   import { ensureDailyIssue, upsertSection, closeStaleDailyIssues } from './daily-report-issue.mjs';
//
// B2: every writer accepts a FROZEN UTC report date (dailyTitle(date)) so a run
// crossing midnight never splits one day across two issues. Closing is
// date-aware: a delayed older-day run never closes a NEWER daily issue. Every
// helper takes an injectable `gh` (argv arrays only) so tests mock it instead
// of performing live external writes.

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DAILY_LABEL = 'daily-report';
const DAILY_TITLE_RE = /^站点日报 — (\d{4}-\d{2}-\d{2})$/;

// Every gh invocation goes through here with an ARGV array — never a shell
// string. Report bodies are Markdown full of backticks, `$`, and newlines;
// handing them to a shell would be both a correctness and an injection hazard.
//
// stdin is 'pipe' whenever `input` is supplied and 'ignore' otherwise. This is
// load-bearing, not tidiness: with stdin hardcoded to 'ignore', execFileSync
// silently DISCARDS `input`, so `gh issue edit --body-file -` reads nothing and
// cheerfully writes an EMPTY body — wiping the issue with no error anywhere.
export const defaultGh = (args, opts = {}) => {
  const stdin = opts.input === undefined ? 'ignore' : 'pipe';
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: [stdin, 'pipe', 'inherit'],
    ...opts,
  });
};

/**
 * Title of today's report issue.
 *
 * UTC deliberately: the workflows that call this are driven by GitHub's cron,
 * which is UTC-only. Using local time would make the runner's timezone decide
 * which day a report lands on, and a runner crossing midnight mid-job could
 * open a second issue for "the same" day. B2 callers pass the run's FROZEN UTC
 * date string (YYYY-MM-DD) so a run crossing midnight keeps one identity.
 */
export function dailyTitle(date = new Date()) {
  if (typeof date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`dailyTitle: invalid frozen UTC date ${JSON.stringify(date)} (expected YYYY-MM-DD)`);
    }
    return `站点日报 — ${date}`;
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `站点日报 — ${y}-${m}-${d}`;
}

// The UTC date a daily-report title belongs to; null for anything else (a
// human issue is never adopted or reaped by title shape alone).
export function dailyTitleDate(title) {
  const m = DAILY_TITLE_RE.exec(String(title ?? ''));
  return m ? m[1] : null;
}

function findIssueByTitle(repo, title, gh = defaultGh) {
  // Deliberately NOT using `--search`: GitHub's issue search is backed by an
  // eventually-consistent index, so an issue created seconds ago is routinely
  // absent from it. This helper's whole job is "create today's issue exactly
  // once" — a search-backed lookup demonstrably created a duplicate for the
  // same day when called twice in quick succession.
  //
  // Listing hits the issues API directly, which is read-your-writes consistent,
  // so a just-created issue is always visible. ALL states are read: a delayed
  // rerun of an already-CLOSED frozen date must adopt and update that issue
  // instead of creating a duplicate title that splits the day's sections (the
  // closed issue is edited in place, never reopened).
  //
  // The label filter is applied client-side rather than via `--label`: on a repo
  // where the label does not exist yet, `gh issue list --label` errors out, and
  // that error would be indistinguishable from "no issue yet" — which is
  // precisely when we must not get it wrong. Matching on the exact title is what
  // identifies the issue; the label check is a guard so we never adopt a
  // same-titled issue a human opened by hand.
  const raw = gh([
    'issue',
    'list',
    '--repo', repo,
    '--state', 'all',
    '--json', 'number,title,labels,state',
    '--limit', '100',
  ]);
  const list = JSON.parse(raw || '[]');
  const hits = list.filter(
    (i) => i.title === title && (i.labels || []).some((l) => l.name === DAILY_LABEL),
  );
  if (hits.length === 0) return null;
  // Deterministic adoption: prefer an OPEN issue, else the newest closed one.
  const open = hits.filter((i) => i.state === 'OPEN');
  const pick = (open.length > 0 ? open : hits).reduce((a, b) => (b.number > a.number ? b : a));
  return pick.number;
}

function ensureLabel(repo, gh = defaultGh) {
  try {
    gh(
      [
        'label', 'create', DAILY_LABEL,
        '--repo', repo,
        '--color', 'C5DEF5',
        '--description', 'Auto-maintained daily site report',
      ],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );
  } catch {
    // Label already exists; that is the steady state, not an error.
  }
}

function createDailyIssue(repo, title, gh = defaultGh) {
  const intro = [
    '这个 issue 由 `.github/workflows/` 下的定时任务自动维护，每天一条。',
    '',
    '- **Lighthouse**、**SEO** 与 **自动处置** 都写在这里，各自只覆盖自己的小节。',
    '- 每次运行是**覆盖**而不是追加，所以看到的永远是当天最新结果。',
    '- SEO 小节给出建议动作；自动处置小节记录当天的提案候选与安全跳过（proposal-only，apply 未开放，不自动开 PR）。',
    '- 次日的日报开出来时，这条会被自动关闭。',
  ].join('\n');
  const out = gh([
    'issue', 'create',
    '--repo', repo,
    '--title', title,
    '--label', DAILY_LABEL,
    '--body', intro,
  ]);
  const m = out.match(/\/issues\/(\d+)/);
  if (!m) throw new Error(`Cannot parse issue number from: ${out}`);
  return Number(m[1]);
}

/**
 * Return today's issue number, creating it if absent.
 *
 * Race note: Lighthouse and SEO can reach this concurrently, and GitHub has no
 * "create issue if not exists", so a true CAS is off the table. Two things keep
 * duplicates away in practice: the lookup reads the directly-consistent list
 * API (see findIssueByTitle — a search-index lookup here demonstrably created a
 * duplicate), and a lost create is recovered by re-checking once and adopting
 * the winner's issue instead of throwing. The residual window — both jobs look,
 * both miss, both create within the same instant — leaves a duplicate that
 * closeStaleDailyIssues reaps the next day. The two workflows are scheduled 30
 * minutes apart, so that window is not realistically reachable.
 *
 */
export function ensureDailyIssue({ repo, date = new Date(), gh = defaultGh } = {}) {
  if (!repo) throw new Error('ensureDailyIssue: repo is required');
  const title = dailyTitle(date);

  const existing = findIssueByTitle(repo, title, gh);
  if (existing) return existing;

  // Only needed on the create path; the lookup above does not depend on it.
  ensureLabel(repo, gh);
  try {
    return createDailyIssue(repo, title, gh);
  } catch (err) {
    const raced = findIssueByTitle(repo, title, gh);
    if (raced) return raced;
    throw err;
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const openTag = (marker) => `<!-- section:${marker} -->`;
const closeTag = (marker) => `<!-- /section:${marker} -->`;

/**
 * Pure string half of upsertSection, exported for testability.
 *
 * The match is non-greedy and anchored on the escaped marker pair, so updating
 * one section can never swallow a neighbouring one. Content is defanged first:
 * a report that happens to quote its own closing marker would otherwise end the
 * block early, and the next update would leave the tail behind as orphaned
 * text. Escaping the angle brackets keeps the text readable while making it
 * inert — deliberately plain ASCII, since zero-width characters wreck Goldmark
 * (see CLAUDE.md) and these bodies get read as Markdown.
 */
export function applySection(body, marker, content) {
  const safe = String(content).replaceAll('<!--', '&lt;!--').replaceAll('-->', '--&gt;');
  const block = [openTag(marker), safe, closeTag(marker)].join('\n');
  const re = new RegExp(
    `${escapeRe(openTag(marker))}[\\s\\S]*?${escapeRe(closeTag(marker))}`,
  );
  // Markdown can contain replacement tokens such as $&, $` and $'. A callback
  // keeps those literal instead of inserting old report sections into the body.
  if (re.test(body)) return body.replace(re, () => block);
  return `${body.replace(/\s+$/, '')}\n\n${block}\n`;
}

/**
 * Replace this writer's section in the issue body, appending it on first run.
 *
 * Writes with `--body-file -` and hands the body over stdin (execFileSync's
 * `input`): the body is Markdown with backticks and newlines, so it must never
 * pass through a shell or an argv length limit.
 */
export function upsertSection({ repo, issueNumber, marker, content, gh = defaultGh }) {
  if (!repo) throw new Error('upsertSection: repo is required');
  if (!issueNumber) throw new Error('upsertSection: issueNumber is required');
  if (!marker) throw new Error('upsertSection: marker is required');

  const body = gh([
    'issue', 'view', String(issueNumber),
    '--repo', repo,
    '--json', 'body',
    '--jq', '.body',
  ]);

  const next = applySection(body, marker, content);

  // An empty body is never a legitimate result — applySection always returns at
  // least the section block. If it happens anyway, something upstream is broken
  // and writing would silently blank the issue, so fail loudly instead. This
  // guard is here because exactly that (a swallowed stdin) once wiped the body
  // with no error surfaced anywhere.
  if (!next.trim()) {
    throw new Error(`upsertSection: refusing to write an empty body to #${issueNumber}`);
  }

  gh(
    ['issue', 'edit', String(issueNumber), '--repo', repo, '--body-file', '-'],
    { input: next },
  );
  return issueNumber;
}

/**
 * Close every OLDER open daily-report issue (strictly before the frozen date).
 *
 * Filtering by label (not by title shape) is the safety net: we only ever close
 * issues this script itself labelled, so a human issue can never be caught even
 * if it happens to be titled like a daily report. keepNumber is skipped
 * explicitly rather than relying on the query, in case a stale search index
 * returns it.
 *
 * Date-aware (B2): a delayed older-day run keeps today's and newer issues open —
 * only strictly older daily issues are reaped, so a late run can never close a
 * newer daily report. Unparseable titles are left alone.
 */
export function closeStaleDailyIssues({ repo, keepNumber, date = new Date(), gh = defaultGh }) {
  if (!repo) throw new Error('closeStaleDailyIssues: repo is required');
  if (!keepNumber) throw new Error('closeStaleDailyIssues: keepNumber is required');
  const keepDay = dailyTitleDate(dailyTitle(date));

  const raw = gh([
    'issue', 'list',
    '--repo', repo,
    '--state', 'open',
    '--label', DAILY_LABEL,
    '--json', 'number,title,labels',
    '--limit', '50',
  ]);
  const list = JSON.parse(raw || '[]');
  const stale = list.filter((i) => {
    if (i.number === Number(keepNumber)) return false;
    if (!(i.labels || []).some((l) => l.name === DAILY_LABEL)) return false;
    const day = dailyTitleDate(i.title);
    return day !== null && day < keepDay; // strictly older only — never a newer day
  });

  for (const issue of stale) {
    gh([
      'issue', 'close', String(issue.number),
      '--repo', repo,
      '--reason', 'completed',
      '--comment', `已由新的日报接替：#${keepNumber}`,
    ]);
    console.log(`Closed stale daily issue #${issue.number}`);
  }
  return stale.map((i) => i.number);
}

// Direct run: just make sure today's issue exists and print its number, so a
// workflow step can capture it without pulling in a reporter.
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const argv = process.argv.slice(2);
  let date = new Date();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && /^\d{4}-\d{2}-\d{2}$/.test(argv[i + 1] ?? '')) {
      date = argv[i + 1];
      i += 1;
    } else {
      console.error(`Unknown or invalid argument: ${argv[i]}`);
      console.error('Usage: node scripts/daily-report-issue.mjs [--date YYYY-MM-DD]');
      process.exit(1);
    }
  }
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    // Fail clearly: an unnoticed silent skip is how sections go missing.
    console.error('GITHUB_REPOSITORY missing; cannot resolve the daily issue.');
    process.exit(1);
  }
  console.log(ensureDailyIssue({ repo, date }));
}
