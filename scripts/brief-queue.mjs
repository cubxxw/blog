#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BRIEFS_DIR = resolve(process.env.BLOG_BRIEFS_DIR || join(ROOT, '_briefs'));
const CONTENT_DIR = resolve(process.env.BLOG_CONTENT_DIR || join(ROOT, 'content'));
const ACTIONABLE = new Set(['ready']);
const ACTIVE = new Set(['claimed', 'drafting', 'review']);
const EXECUTABLE = new Set([
  'ready',
  'claimed',
  'drafting',
  'review',
  'ready-to-publish',
]);
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
const VALID_BRIEF_TYPES = new Set(['thinking', 'research', 'maintenance']);
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
  const match = fm.match(
    new RegExp(`^${key}:\\s*['"]?([^\\n'"]+)['"]?\\s*$`, 'm'),
  );
  return match?.[1]?.trim() ?? '';
}

function listValues(fm, key) {
  const lines = fm.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) return [];

  const values = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (item) {
      values.push(item[1].replace(/^['"]|['"]$/g, ''));
      continue;
    }
    if (/^\S/.test(line)) break;
  }
  return values;
}

function sectionBody(text, headings) {
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(
      new RegExp(
        `^##\\s+${escaped}\\s*$\\r?\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
        'm',
      ),
    );
    const body = match?.[1]
      ?.replace(/<!--[\s\S]*?-->/g, '')
      .trim();
    if (body) return body;
  }
  return '';
}

function receiptValue(text, key) {
  const match = text.match(
    new RegExp(`^-\\s+${key}:\\s*[\`'"]?([^\\n\`'"]*)[\`'"]?\\s*$`, 'm'),
  );
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
    filename,
    text,
    fm,
    schema: scalar(fm, 'schema'),
    id: scalar(fm, 'id') || filename.replace(/\.md$/, ''),
    title: scalar(fm, 'title') || filename,
    status: scalar(fm, 'status') || 'unknown',
    priority: scalar(fm, 'priority') || 'normal',
    language: scalar(fm, 'language'),
    section: scalar(fm, 'section'),
    briefType: scalar(fm, 'brief_type'),
    sourceRefs: listValues(fm, 'source_refs'),
    dispatchedAt:
      scalar(fm, 'dispatched_at') ||
      scalar(fm, 'created_at') ||
      legacyDate,
    article: receiptValue(text, 'article'),
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

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}

function duplicateArticles(brief) {
  if (!EXECUTABLE.has(brief.status) || brief.briefType === 'maintenance') {
    return [];
  }

  const duplicates = [];
  if (brief.article) {
    const article = resolve(ROOT, brief.article);
    if (article.startsWith(`${ROOT}${sep}`) && existsSync(article)) {
      duplicates.push(relative(ROOT, article));
    }
  }

  const slug = brief.id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const expected = `${slug}.md`;
  for (const file of markdownFiles(CONTENT_DIR)) {
    if (basename(file) === expected) duplicates.push(relative(ROOT, file));
  }
  return [...new Set(duplicates)];
}

function validateV1(brief) {
  const errors = [];
  if (brief.schema !== 'blog-brief/v1') {
    errors.push('missing or unsupported schema; expected blog-brief/v1');
    return errors;
  }

  for (const [field, value] of [
    ['id', brief.id],
    ['title', brief.title],
    ['status', brief.status],
    ['priority', brief.priority],
    ['language', brief.language],
    ['section', brief.section],
    ['brief_type', brief.briefType],
    ['dispatched_at', brief.dispatchedAt],
  ]) {
    if (!value) errors.push(`missing ${field}`);
  }

  if (brief.id !== brief.filename.replace(/\.md$/, '')) {
    errors.push(`id "${brief.id}" must match filename`);
  }
  if (!VALID_V1_STATUSES.has(brief.status)) {
    errors.push(`invalid status "${brief.status}"`);
  }
  if (!PRIORITY_RANK.has(brief.priority)) {
    errors.push(`invalid priority "${brief.priority}"`);
  }
  if (!VALID_BRIEF_TYPES.has(brief.briefType)) {
    errors.push(`invalid brief_type "${brief.briefType}"`);
  }
  if (brief.dispatchedAt && Number.isNaN(Date.parse(brief.dispatchedAt))) {
    errors.push(`invalid dispatched_at "${brief.dispatchedAt}"`);
  }

  for (const ref of brief.sourceRefs) {
    if (!ref.startsWith('brain://')) {
      errors.push(`source_ref must use brain://: "${ref}"`);
    }
  }
  if (/file:\/\/|\/Users\/|\/home\/|[A-Za-z]:\\/.test(brief.fm)) {
    errors.push('front matter contains a machine-local path');
  }

  if (EXECUTABLE.has(brief.status)) {
    const requiredSections = [
      ['唯一命题', ['唯一命题']],
      ['为什么值得由我写', ['为什么值得由我写']],
      ['目标读者与阅读场景', ['目标读者与阅读场景']],
      ['已批准素材包', ['已批准素材包']],
      ['证据与隐私边界', ['证据与隐私边界']],
      ['验收标准', ['验收标准']],
    ];
    for (const [label, headings] of requiredSections) {
      if (!sectionBody(brief.text, headings)) {
        errors.push(`missing or empty section "## ${label}"`);
      }
    }

    const privacy = sectionBody(brief.text, ['证据与隐私边界']);
    for (const label of ['可以公开', '必须匿名', '禁止使用', '发布前仍需作者确认']) {
      if (!privacy.includes(label)) {
        errors.push(`privacy section missing "${label}" boundary`);
      }
    }

    for (const duplicate of duplicateArticles(brief)) {
      errors.push(`possible duplicate article already exists: ${duplicate}`);
    }
  }

  return errors;
}

function resolveBriefPath(input) {
  const file = resolve(ROOT, input);
  if (!file.startsWith(`${BRIEFS_DIR}${sep}`)) {
    throw new Error(`brief must be inside ${relative(ROOT, BRIEFS_DIR)}/`);
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    throw new Error(`brief not found: ${input}`);
  }
  return file;
}

function replaceStatus(file, from, to) {
  const text = readFileSync(file, 'utf8');
  const current = scalar(frontMatter(text), 'status');
  if (current !== from) {
    throw new Error(`expected status "${from}", found "${current}"`);
  }
  const next = text.replace(
    /^status:\s*['"]?[^'"\n]+['"]?\s*$/m,
    `status: ${to}`,
  );
  if (next === text) throw new Error('status field was not updated');
  const temporary = join(
    dirname(file),
    `.${basename(file)}.${process.pid}.tmp`,
  );
  writeFileSync(temporary, next);
  renameSync(temporary, file);
}

function printErrors(brief, errors) {
  for (const error of errors) {
    console.error(`ERROR ${brief.path}: ${error}`);
  }
}

function printBrief(brief) {
  const marker = ACTIONABLE.has(brief.status) ? '○' : '◐';
  console.log(
    `${marker} [${brief.priority}] ${brief.status.padEnd(16)} ${brief.path}`,
  );
  console.log(`  ${brief.title}`);
}

function argumentValue(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return '';
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function main() {
  const args = process.argv.slice(2);
  const briefs = collectBriefs().sort(compareBriefs);
  const checkFile = argumentValue(args, '--file');
  const claimFile = argumentValue(args, '--claim');
  const releaseFile = argumentValue(args, '--release');

  if (args.includes('--check')) {
    const selected = checkFile
      ? [readBrief(resolveBriefPath(checkFile))]
      : briefs;
    let errorCount = 0;
    let legacyCount = 0;
    for (const brief of selected) {
      const errors = validateV1(brief);
      if (brief.schema !== 'blog-brief/v1') legacyCount += 1;
      errorCount += errors.length;
      printErrors(brief, errors);
    }
    console.log(
      `Checked ${selected.length} brief(s): ${errorCount} error(s), ${legacyCount} legacy.`,
    );
    process.exit(errorCount > 0 ? 1 : 0);
  }

  if (claimFile) {
    const brief = readBrief(resolveBriefPath(claimFile));
    const errors = validateV1(brief);
    if (brief.status !== 'ready') {
      errors.push(`cannot claim status "${brief.status}"`);
    }
    const otherActive = briefs.filter(
      (candidate) =>
        ACTIVE.has(candidate.status) && candidate.file !== brief.file,
    );
    for (const active of otherActive) {
      errors.push(`another brief is active: ${active.path} (${active.status})`);
    }
    if (errors.length > 0) {
      printErrors(brief, errors);
      process.exit(1);
    }
    replaceStatus(brief.file, 'ready', 'claimed');
    console.log(`Claimed ${brief.path}`);
    process.exit(0);
  }

  if (releaseFile) {
    const brief = readBrief(resolveBriefPath(releaseFile));
    replaceStatus(brief.file, 'claimed', 'ready');
    console.log(`Released ${brief.path}`);
    process.exit(0);
  }

  const actionableProblems = briefs
    .filter((brief) => ACTIONABLE.has(brief.status))
    .map((brief) => [brief, validateV1(brief)])
    .filter(([, errors]) => errors.length > 0);
  if (actionableProblems.length > 0) {
    for (const [brief, errors] of actionableProblems) {
      printErrors(brief, errors);
    }
    process.exit(1);
  }

  const actionable = briefs.filter(
    (brief) =>
      brief.schema === 'blog-brief/v1' && ACTIONABLE.has(brief.status),
  );
  const active = briefs.filter((brief) => ACTIVE.has(brief.status));

  if (args.includes('--json')) {
    console.log(JSON.stringify({ actionable, active, all: briefs }, null, 2));
    process.exit(0);
  }

  if (args.includes('--next')) {
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
}

try {
  main();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
}
