#!/usr/bin/env node
// GEO (Generative Engine Optimization) content audit.
//
// Flags articles whose structure makes them hard for AI engines to cite,
// based on verified findings (KDD 2024 arXiv:2311.09735; Kevin Indig's
// 1.2M-response ChatGPT citation study): the opening of a page carries most
// of the citation weight, so each post should lead with a direct answer and
// be worth surfacing a TL;DR for.
//
// Heuristics (all advisory — this ranks where to spend editing effort):
//   - no `tldr` front matter            → can't show an answer-first block
//   - no `description`                  → no summary signal at all
//   - long lead-in before first heading → answer is buried
//   - very short body                   → likely a stub
//
// Usage:
//   node scripts/geo-audit.mjs            # full report
//   node scripts/geo-audit.mjs --top 20   # worst N only

import { readFileSync, globSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const topArg = process.argv.indexOf('--top');
const TOP = topArg !== -1 ? parseInt(process.argv[topArg + 1], 10) : Infinity;

const LEAD_IN_WORD_LIMIT = 80; // words allowed before the first heading

function analyze(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const front = fm[1];
  const body = text.slice(fm[0].length).trim();

  const hasTldr = /^tldr:/m.test(front);
  const hasDesc = /^\s*description:/m.test(front);
  const isDraft = /^draft:\s*true/m.test(front);

  // Lead-in: text before the first markdown heading in the body.
  const firstHeading = body.search(/^#{1,6}\s/m);
  const leadIn = firstHeading === -1 ? body : body.slice(0, firstHeading);
  const leadWords = leadIn.replace(/[#>*`\-\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  const bodyWords = body.split(/\s+/).filter(Boolean).length;

  const issues = [];
  if (!hasTldr) issues.push('no tldr');
  if (!hasDesc) issues.push('no description');
  if (leadWords > LEAD_IN_WORD_LIMIT) issues.push(`long lead-in (${leadWords}w before 1st heading)`);
  if (bodyWords < 120) issues.push(`stub (${bodyWords}w)`);

  // Score: weight a missing answer-first signal highest.
  const score = (hasTldr ? 0 : 3) + (hasDesc ? 0 : 2) + (leadWords > LEAD_IN_WORD_LIMIT ? 2 : 0);
  return { issues, score, isDraft, bodyWords };
}

const files = globSync('content/**/*.md', { cwd: ROOT }).map((f) => join(ROOT, f));
const rows = [];
for (const f of files) {
  const r = analyze(readFileSync(f, 'utf8'));
  if (r && r.score > 0 && !r.isDraft) rows.push({ f: f.replace(ROOT + '/', ''), ...r });
}
rows.sort((a, b) => b.score - a.score);

const total = rows.length;
const shown = rows.slice(0, TOP);
console.log(`GEO audit — ${total} published article(s) with room to improve (score-ranked):\n`);
for (const r of shown) {
  console.log(`[${r.score}] ${r.f}`);
  console.log(`     ${r.issues.join(', ')}`);
}
const noTldr = rows.filter((r) => r.issues.includes('no tldr')).length;
console.log(`\nSummary: ${noTldr}/${total} lack a TL;DR. Add \`tldr:\` front matter to lead with the answer.`);
