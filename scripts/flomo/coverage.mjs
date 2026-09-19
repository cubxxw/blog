#!/usr/bin/env node
/**
 * 覆盖率审计：找出 flomo 导出里哪些 memo 还没有出现在已发布的中文月度笔记中。
 *
 * 用法：
 *   node scripts/flomo/coverage.mjs [--memos .flomo/memos.json] [--json .flomo/coverage.json]
 *
 * 判定方式：把 memo 正文做 8 字 shingle，如果其中 ≥35% 能在文章正文里找到，
 * 视为已覆盖。shingle 判定可以容忍文章里的错别字修订和标点调整。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const memosPath = resolve(flag('--memos', '.flomo/memos.json'));
const jsonOut = resolve(flag('--json', '.flomo/coverage.json'));
const { memos } = JSON.parse(readFileSync(memosPath, 'utf8'));

const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '')
    .replace(/[a-z0-9]+/g, (m) => m);

const shingles = (text, size = 8) => {
  const n = normalize(text);
  const set = new Set();
  for (let i = 0; i + size <= n.length; i += 1) set.add(n.slice(i, i + size));
  return set;
};

const months = [...new Set(memos.map((m) => m.month))].sort();
const report = {};

for (const month of months) {
  const articlePath = resolve(`content/zh/growth/posts/${month}-thought-notes.md`);
  const articleExists = existsSync(articlePath);
  const monthMemos = memos.filter((m) => m.month === month);

  let articleShingles = new Set();
  let articleBody = '';
  if (articleExists) {
    articleBody = readFileSync(articlePath, 'utf8')
      .replace(/^---[\s\S]*?\n---/, '')
      // 标题行与正文之间隔着时间戳引用行，去掉后标题才能和正文连成一句话
      .replace(/^\s*>.*$/gm, '');
    articleShingles = shingles(articleBody);
  }

  const uncovered = [];
  const partial = [];
  const articleNorm = normalize(articleBody);
  for (const memo of monthMemos) {
    if (!memo.text.trim()) continue;
    const norm = normalize(memo.text);
    if (!norm) continue;
    // 短笔记（不足 8 字）没有 shingle，直接做子串命中
    if (norm.length < 8) {
      if (!articleNorm.includes(norm)) {
        uncovered.push({ id: memo.id, date: memo.date, time: memo.time, ratio: 0, text: memo.text });
      }
      continue;
    }
    const s = shingles(memo.text);
    if (s.size === 0) continue;
    let hit = 0;
    for (const g of s) if (articleShingles.has(g)) hit += 1;
    const ratio = hit / s.size;
    if (ratio < 0.35 && !articleNorm.includes(norm)) {
      uncovered.push({ id: memo.id, date: memo.date, time: memo.time, ratio: +ratio.toFixed(2), text: memo.text });
    } else if (ratio < 0.8 && !articleNorm.includes(norm)) {
      partial.push({ id: memo.id, date: memo.date, time: memo.time, ratio: +ratio.toFixed(2), text: memo.text });
    }
  }

  report[month] = {
    article: articleExists ? articlePath.replace(`${process.cwd()}/`, '') : null,
    memos: monthMemos.length,
    uncovered: uncovered.length,
    partial: partial.length,
    uncoveredItems: uncovered,
    partialItems: partial,
  };
}

mkdirSync(dirname(jsonOut), { recursive: true });
writeFileSync(jsonOut, `${JSON.stringify(report, null, 1)}\n`);

console.log('month    memos  article  uncovered  partial');
for (const [month, r] of Object.entries(report)) {
  console.log(
    `${month}  ${String(r.memos).padStart(5)}  ${(r.article ? 'yes' : ' NO').padStart(7)}  ${String(r.uncovered).padStart(9)}  ${String(r.partial).padStart(7)}`,
  );
}
const totalUncovered = Object.values(report).reduce((a, r) => a + r.uncovered, 0);
console.log(`\ntotal uncovered memos: ${totalUncovered}`);
console.log(`detail -> ${jsonOut}`);
