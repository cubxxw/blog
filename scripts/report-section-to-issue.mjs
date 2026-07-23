#!/usr/bin/env node
// Write a prepared Markdown fragment into an arbitrary section of today's
// daily report issue (see scripts/daily-report-issue.mjs).
//
// This is the generic sibling of seo-section-to-issue.mjs: same guarantees,
// but the section marker comes from argv instead of being hardcoded. Any new
// reporter (autofix, deps, whatever) can join the daily issue without another
// copy-pasted wrapper script — and, as with the SEO one, the workflow's LLM
// agent only ever produces Markdown and a path; issue management stays here.
//
// Usage:
//   node scripts/report-section-to-issue.mjs <marker> <path-to-markdown>
//
// Env (provided by GitHub Actions):
//   GH_TOKEN            — token with `issues: write`
//   GITHUB_REPOSITORY   — owner/repo

import { existsSync, readFileSync } from 'node:fs';
import { ensureDailyIssue, upsertSection } from './daily-report-issue.mjs';

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY missing; skip section sync.');
  process.exit(0);
}

const [marker, path] = process.argv.slice(2);
if (!marker || !path) {
  console.error('Usage: node scripts/report-section-to-issue.mjs <marker> <path-to-markdown>');
  process.exit(1);
}

// Markers become HTML comment delimiters inside the issue body; anything
// outside this shape risks colliding with the delimiter regex or reading as
// Markdown. Reject early rather than corrupting the issue.
if (!/^[a-z][a-z0-9-]{0,31}$/.test(marker)) {
  console.error(`Invalid marker "${marker}": expected lowercase slug like "autofix".`);
  process.exit(1);
}

if (!existsSync(path)) {
  console.error(`No such file: ${path}`);
  process.exit(1);
}

const content = readFileSync(path, 'utf8').trim();
if (!content) {
  // An empty section would silently blank out the previous run's note in
  // place, which reads as "ran and found nothing" rather than "produced
  // nothing". Same guard as the SEO wrapper.
  console.error(`${path} is empty; refusing to write a blank "${marker}" section.`);
  process.exit(1);
}

const number = ensureDailyIssue({ repo });
upsertSection({ repo, issueNumber: number, marker, content });
console.log(`Wrote "${marker}" section into daily issue #${number}`);
console.log(number);
