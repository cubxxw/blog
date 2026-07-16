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
//   node scripts/seo-section-to-issue.mjs <path-to-markdown>
//
// Env (provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo

import { existsSync, readFileSync } from 'node:fs';
import { ensureDailyIssue, upsertSection } from './daily-report-issue.mjs';

const SECTION_MARKER = 'seo';

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY missing; skip SEO section sync.');
  process.exit(0);
}

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/seo-section-to-issue.mjs <path-to-markdown>');
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

const number = ensureDailyIssue({ repo });
upsertSection({ repo, issueNumber: number, marker: SECTION_MARKER, content });
console.log(`Wrote SEO section into daily issue #${number}`);
// Intentionally NOT closing stale issues here: the Lighthouse reporter owns
// that, and doing it from both would just double the API calls.
console.log(number);
