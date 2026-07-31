#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BRIEFS_DIR = join(ROOT, '_briefs');
const ACTIONABLE = new Set(['ready', 'revision']);
const ACTIVE = new Set(['claimed', 'drafting', 'review']);
const VALID_V1_STATUSES = new Set([
  'ready',
  'claimed',
  'drafting',
  'review',
  'ready-to-publish',
  'published',
  'blocked',
  'cancelled',
]);
const PRIORITY_RANK = new Map([
  ['high', 0],
  ['normal', 1],
  ['low', 2],
]);

function frontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match?.[1] ?? '';
}

function scalar(fm, key) {
  const match = fm.match(new RegExp(`^${key}:\\s*['"]?([^\\n'"]+)['"]?\\s*$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function readBrief(file) {
  const text = readFileSync(file, 'utf8');
  const fm = frontMatter(text);
  const filename = basename(file);
  const legacyDate = filename.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1] ?? '';

  return {
    file,
    path: relative(ROOT, file),
    schema: scalar(fm, 'schema'),
    id: scalar(fm, 'id') || filename.replace(/\.md$/, ''),
    title: scalar(fm, 'title') || filename,
    status: scalar(fm, 'status') || 'unknown',
    priority: scalar(fm, 'priority') || 'normal',
    language: scalar(fm, 'language'),
    section: scalar(fm, 'section'),
    dispatchedAt:
      scalar(fm, 'dispatched_at') ||
      scalar(fm, 'created_at') ||
      legacyDate,
    fm,
  };
}

function collectBriefs() {
  if (!existsSync(BRIEFS_DIR)) return [];
  return readdirSync(BRIEFS_DIR, { withFileTypes: true })
    .filter((entry) =>
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('_') &&
      entry.name !== 'README.md')
    .map((entry) => readBrief(join(BRIEFS_DIR, entry.name)));
}

function compareBriefs(a, b) {
  const priority =
    (PRIORITY_RANK.get(a.priority) ?? 1) -
    (PRIORITY_RANK.get(b.priority) ?? 1);
  if (priority !== 0) return priority;
  return a.dispatchedAt.localeCompare(b.dispatchedAt) || a.id.localeCompare(b.id);
}

function validateV1(brief) {
  if (brief.schema !== 'blog-brief/v1') return [];

  const errors = [];
  for (const field of ['id', 'title', 'status', 'language', 'section', 'dispatchedAt']) {
    if (!brief[field]) errors.push(`missing ${field}`);
  }
  if (!VALID_V1_STATUSES.has(brief.status)) {
    errors.push(`invalid status "${brief.status}"`);
  }
  if (!PRIORITY_RANK.has(brief.priority)) {
    errors.push(`invalid priority "${brief.priority}"`);
  }
  return errors;
}

function printBrief(brief) {
  const marker = ACTIONABLE.has(brief.status) ? '○' : '◐';
  console.log(
    `${marker} [${brief.priority}] ${brief.status.padEnd(16)} ${brief.path}`,
  );
  console.log(`  ${brief.title}`);
}

const args = new Set(process.argv.slice(2));
const briefs = collectBriefs().sort(compareBriefs);
const actionable = briefs.filter((brief) => ACTIONABLE.has(brief.status));
const active = briefs.filter((brief) => ACTIVE.has(brief.status));

if (args.has('--json')) {
  console.log(JSON.stringify({ actionable, active, all: briefs }, null, 2));
  process.exit(0);
}

if (args.has('--check')) {
  let errorCount = 0;
  let legacyCount = 0;
  for (const brief of briefs) {
    if (!brief.schema) {
      legacyCount += 1;
      console.log(`WARN ${brief.path}: legacy brief without schema`);
      continue;
    }
    for (const error of validateV1(brief)) {
      errorCount += 1;
      console.error(`ERROR ${brief.path}: ${error}`);
    }
  }
  console.log(
    `Checked ${briefs.length} brief(s): ${errorCount} error(s), ${legacyCount} legacy.`,
  );
  process.exit(errorCount > 0 ? 1 : 0);
}

if (args.has('--next')) {
  const next = actionable[0];
  if (!next) {
    console.log('No actionable brief.');
    process.exit(0);
  }
  printBrief(next);
  process.exit(0);
}

console.log(
  `Brief queue: ${actionable.length} actionable, ${active.length} active, ${briefs.length} total.\n`,
);
for (const brief of [...actionable, ...active]) printBrief(brief);
