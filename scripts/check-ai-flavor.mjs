#!/usr/bin/env node
// Detect AI-flavored Chinese phrasing patterns in articles — most notably the
// "不是 X，而是 Y" contrast template that LLMs overuse, plus a set of filler
// phrases ("本质上", "不仅仅是", ...). Reports per-file density and flags the
// worst offenses (title/description/blockquote usage, clustered repeats).
//
// Rules (zh content only; en content is skipped):
//   error  E1  「不是…而是」/「而是」 in front-matter title or description
//   error  E2  「不是…而是」 inside a heading line (# ...)
//   error  E3  「不是…而是」 inside a blockquote line (> ...)
//   error  E4  cluster: >=2 occurrences of 「而是」 within any 3-line window
//   warn   W1  「不是…而是」 density > 0.5 per 1000 chars (body text)
//   warn   W2  filler phrase count over per-file threshold (本质上>3, 不仅仅是>3, 这意味着>3)
//
// Usage:
//   node scripts/check-ai-flavor.mjs                     # scan all zh posts, report
//   node scripts/check-ai-flavor.mjs <file...>           # scan specific files
//   node scripts/check-ai-flavor.mjs --check             # CI: exit 1 on any error
//   node scripts/check-ai-flavor.mjs --changed           # only files changed vs HEAD (staged+unstaged+untracked)
//   node scripts/check-ai-flavor.mjs --top 20            # show top N worst files (default 15)

import { readFileSync, globSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const CHANGED = argv.includes('--changed');
const topIdx = argv.indexOf('--top');
const TOP = topIdx >= 0 ? Number(argv[topIdx + 1]) || 15 : 15;
const fileArgs = argv.filter((a) => !a.startsWith('--') && !(topIdx >= 0 && a === argv[topIdx + 1]));

// ---- patterns -------------------------------------------------------------

// The core contrast template. Allow up to ~25 chars between 不是 and 而是 so we
// match the sentence-level pattern, not two unrelated words far apart.
const RE_CONTRAST = /不是[^。！？\n]{0,25}而是/g;
// Bare 而是 (used for clustering — the template is recognizable even when the
// 不是 half sits in a previous clause).
const RE_ERSHI = /而是/g;

const FILLERS = [
  { phrase: '本质上', max: 3 },
  { phrase: '不仅仅是', max: 3 },
  { phrase: '这意味着', max: 3 },
];

const DENSITY_LIMIT = 0.5; // contrast matches per 1000 chars of body text

// ---- helpers --------------------------------------------------------------

function splitFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: '', body: text };
  return { fm: m[1], body: text.slice(m[0].length) };
}

// Strip fenced code blocks and inline code — code legitimately contains anything.
function stripCode(body) {
  return body
    .replace(/```[\s\S]*?```/g, (b) => '\n'.repeat(b.split('\n').length - 1))
    .replace(/`[^`\n]*`/g, '');
}

function fmField(fm, key) {
  // matches `key: value` and the first line of block scalars; good enough for lint
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1] : '';
}

function count(re, s) {
  return (s.match(re) || []).length;
}

// ---- analyze one file -----------------------------------------------------

function analyze(file) {
  const text = readFileSync(file, 'utf8');
  const { fm, body } = splitFrontMatter(text);
  const clean = stripCode(body);
  const lines = clean.split('\n');
  const errors = [];
  const warns = [];

  // Body starts after the front-matter block; offset makes reported line
  // numbers match the actual file, not the body-relative index.
  const fmMatch = text.match(/^---\n[\s\S]*?\n---\n?/);
  const lineOffset = fmMatch ? fmMatch[0].split('\n').length - 1 : 0;
  const L = (i) => i + 1 + lineOffset;

  // E1: front-matter title / description
  for (const key of ['title', 'description', 'summary']) {
    const val = fmField(fm, key);
    if (val && (RE_CONTRAST.test(val) || /而是/.test(val))) {
      errors.push(`E1 front-matter ${key} 使用「不是…而是」句式: ${val.slice(0, 60)}…`);
    }
    RE_CONTRAST.lastIndex = 0;
  }

  // E2 headings / E3 blockquotes — line-scoped
  lines.forEach((line, i) => {
    const n = L(i);
    if (/^#{1,6}\s/.test(line) && RE_CONTRAST.test(line)) {
      errors.push(`E2 标题行使用「不是…而是」 (L${n}): ${line.trim().slice(0, 60)}`);
    }
    RE_CONTRAST.lastIndex = 0;
    // Skip quotes of external material (引用/原文/摘录 markers) — those are
    // someone else's words, not our writing.
    if (/^\s*>/.test(line) && !/引用|原文|摘录|来源/.test(line) && RE_CONTRAST.test(line)) {
      errors.push(`E3 blockquote 使用「不是…而是」 (L${n}): ${line.trim().slice(0, 60)}`);
    }
    RE_CONTRAST.lastIndex = 0;
  });

  // E4 clusters: the CONTRAST template repeated within a short window. We count
  // only real 「不是…而是」 matches (not bare 而是, which fires on 排比 and
  // incidental 而+是), and only flag when a paragraph stacks the template so
  // densely the reader notices the mold: >=2 matches within a 3-line window.
  const hitLines = [];
  lines.forEach((line, i) => {
    const c = count(RE_CONTRAST, line);
    for (let k = 0; k < c; k++) hitLines.push(L(i));
    RE_CONTRAST.lastIndex = 0;
  });
  const clusters = [];
  const seen = new Set();
  for (let i = 1; i < hitLines.length; i++) {
    const a = hitLines[i - 1];
    const b = hitLines[i];
    if (b - a > 2) continue;
    const key = a === b ? `${b}x` : `${a}-${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clusters.push(a === b ? `L${b}(同行x2)` : `L${a}~L${b}`);
  }
  if (clusters.length) {
    errors.push(`E4 「不是…而是」3 行内连发 ${clusters.length} 组: ${clusters.slice(0, 5).join(', ')}${clusters.length > 5 ? ' …' : ''}`);
  }

  // W1 density
  const chars = clean.replace(/\s/g, '').length;
  const contrastCount = count(RE_CONTRAST, clean);
  const density = chars > 0 ? (contrastCount * 1000) / chars : 0;
  if (density > DENSITY_LIMIT && contrastCount >= 2) {
    warns.push(`W1 「不是…而是」密度 ${density.toFixed(2)}/千字 (${contrastCount} 次 / ${chars} 字)，上限 ${DENSITY_LIMIT}`);
  }

  // W2 fillers
  for (const { phrase, max } of FILLERS) {
    const c = count(new RegExp(phrase, 'g'), clean);
    if (c > max) warns.push(`W2 「${phrase}」出现 ${c} 次（>${max}），多数可直接删除`);
  }

  return { file, errors, warns, contrastCount, density, chars };
}

// ---- collect files --------------------------------------------------------

let files;
if (fileArgs.length) {
  files = fileArgs.map((f) => join(process.cwd(), f)).map((f) => relative(ROOT, f)).map((f) => join(ROOT, f));
} else if (CHANGED) {
  // Files changed vs HEAD (staged + unstaged) plus untracked — the "what am I
  // about to commit" view, so pre-existing debt in old posts doesn't block CI.
  const out = execSync('git diff --name-only HEAD -- content/zh && git ls-files --others --exclude-standard content/zh', {
    cwd: ROOT,
    encoding: 'utf8',
  });
  files = [...new Set(out.split('\n').filter(Boolean))].map((f) => join(ROOT, f)).filter((f) => existsSync(f));
} else {
  files = globSync(join(ROOT, 'content/zh/**/*.md'));
}
files = files.filter((f) => f.endsWith('.md'));

// ---- run ------------------------------------------------------------------

const results = files.map(analyze).filter((r) => r.errors.length || r.warns.length);
results.sort((a, b) => b.errors.length - a.errors.length || b.density - a.density);

let totalErr = 0;
let totalWarn = 0;
for (const r of results.slice(0, fileArgs.length ? results.length : TOP)) {
  console.log(`\n📄 ${relative(ROOT, r.file)}  (「不是…而是」${r.contrastCount} 次, ${r.density.toFixed(2)}/千字)`);
  for (const e of r.errors) console.log(`  ❌ ${e}`);
  for (const w of r.warns) console.log(`  ⚠️  ${w}`);
}
for (const r of results) {
  totalErr += r.errors.length;
  totalWarn += r.warns.length;
}

const shown = Math.min(results.length, fileArgs.length ? results.length : TOP);
console.log(`\n📊 汇总: 扫描 ${files.length} 篇 / ${results.length} 篇有问题（显示前 ${shown}）: ${totalErr} 错误, ${totalWarn} 警告`);
if (results.length > shown) console.log(`   (其余 ${results.length - shown} 篇用 --top ${results.length} 查看)`);

if (CHECK && totalErr > 0) process.exit(1);
