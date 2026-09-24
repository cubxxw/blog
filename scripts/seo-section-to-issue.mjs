#!/usr/bin/env node
// Write a prepared SEO summary into the `seo` section of today's daily report
// issue (see scripts/daily-report-issue.mjs).
//
// This exists so the SEO workflow's Claude agent never has to touch `gh issue
// create` / `gh issue comment` itself. Handing an LLM the issue-management
// commands is how you end up with duplicate trackers and inconsistent titles;
// here it only has to produce Markdown and hand over a path. That also lets the
// workflow's allowedTools drop the gh write verbs entirely.
//
// Usage:
//   node scripts/seo-section-to-issue.mjs <path-to-markdown> [--date YYYY-MM-DD]
//
// Env (provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo
//
// `--date` is the run's FROZEN UTC report date (B2): the daily issue identity
// is fixed once per run, so a run crossing midnight never splits in two.

import { existsSync, readFileSync } from 'node:fs';
import { ensureDailyIssue, upsertSection } from './daily-report-issue.mjs';

const SECTION_MARKER = 'seo';

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  // Fail clearly (nonzero): a silent skip is how sections go missing without
  // anyone noticing.
  console.error('GITHUB_REPOSITORY missing; cannot write the SEO section.');
  process.exit(1);
}

const args = process.argv.slice(2);
let path = null;
let date = new Date();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--date' && /^\d{4}-\d{2}-\d{2}$/.test(args[i + 1] ?? '')) {
    date = args[i + 1];
    i += 1;
  } else if (!path && !args[i].startsWith('--')) {
    path = args[i];
  } else {
    console.error(`Unknown or invalid argument: ${args[i]}`);
    console.error('Usage: node scripts/seo-section-to-issue.mjs <path-to-markdown> [--date YYYY-MM-DD]');
    process.exit(1);
  }
}
if (!path) {
  console.error('Usage: node scripts/seo-section-to-issue.mjs <path-to-markdown> [--date YYYY-MM-DD]');
  process.exit(1);
}

if (!existsSync(path)) {
  console.error(`No such file: ${path}`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8').trim();
if (!content) {
  // An empty section would silently blank out yesterday's note in place, which
  // reads as "SEO ran and found nothing" rather than "SEO produced nothing".
  console.error(`${path} is empty; refusing to write a blank SEO section.`);
  process.exit(1);
}

const number = ensureDailyIssue({ repo, date });
upsertSection({ repo, issueNumber: number, marker: SECTION_MARKER, content });
console.log(`Wrote SEO section into daily issue #${number}`);
// Intentionally NOT closing stale issues here: the Lighthouse reporter owns
// that, and doing it from both would just double the API calls.
console.log(number);
