#!/usr/bin/env node
/**
 * 解析 flomo HTML 导出文件，输出结构化 JSON。
 *
 * 用法：
 *   node scripts/flomo/parse-export.mjs <导出目录> [--out .flomo/memos.json]
 *
 * 导出目录需包含 `*.html` 与 `file/` 附件目录。
 * JSON 结构：{ memos: [{ id, key, date, time, month, day, text, tags, files, dupes }] }
 * text 为纯文本（段落以 \n\n 分隔），tags 为正文末尾的 #标签。
 * key 为 date+time+text 的稳定短哈希，用于在跨导出间引用同一条 memo
 * （脱敏清单、翻译清单都以 key 为准，不依赖会漂移的顺序 id）。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { globSync } from 'node:fs';

const args = process.argv.slice(2);
const srcDir = args.find((a) => !a.startsWith('--'));
const outFlag = args.indexOf('--out');
const outPath = outFlag >= 0 ? args[outFlag + 1] : '.flomo/memos.json';

if (!srcDir) {
  console.error('usage: node scripts/flomo/parse-export.mjs <flomo-export-dir> [--out path]');
  process.exit(1);
}

const dir = resolve(srcDir);
const htmlFiles = globSync(join(dir, '*.html'));
if (htmlFiles.length === 0) {
  console.error(`no .html export found in ${dir}`);
  process.exit(1);
}

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** 把 flomo 内容 HTML 片段转为本仓库文章的纯文本段落。 */
function blocksToText(html) {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  const parts = withBreaks.split(/<\/p>\s*|<p>/i);
  const out = [];
  for (const raw of parts) {
    const cleaned = decodeEntities(raw)
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' ');
    const text = cleaned.trim();
    if (text) out.push(text);
  }
  return out;
}

const memos = [];
let index = 0;
const stableKey = (date, time, text) =>
  createHash('sha1').update(`${date}T${time}|${text}`).digest('hex').slice(0, 12);

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const bodyStart = html.indexOf('<div class="memos">');
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html;
  const chunks = body.split(/<div class="memo">/).slice(1);
  for (const chunk of chunks) {
    const timeMatch = chunk.match(/<div class="time">([^<]*)<\/div>/);
    if (!timeMatch) continue;
    const timeRaw = timeMatch[1].trim();
    const contentMatch = chunk.match(/<div class="content">([\s\S]*?)<\/div>\s*<div class="files">/);
    const contentHtml = contentMatch ? contentMatch[1] : '';
    const filesMatch = chunk.match(/<div class="files">([\s\S]*?)\n\s*<\/div>/);
    const filesHtml = filesMatch ? filesMatch[1] : '';

    const blocks = blocksToText(contentHtml);
    const tags = [];
    const keep = [];
    for (const block of blocks) {
      const tagOnly = block.match(/^((?:#[^\s#]+[^\s]*\s*)+)$/);
      if (tagOnly) {
        for (const t of block.split(/\s+/)) {
          const tag = t.replace(/^#/, '').trim();
          if (tag) tags.push(tag);
        }
        continue;
      }
      keep.push(block);
    }

    const files = [...filesHtml.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);

    const [datePart, clock] = timeRaw.split(' ');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) continue;

    const text = keep.join('\n\n');
    memos.push({
      id: index++,
      key: stableKey(datePart, clock || '', text),
      date: datePart,
      time: clock || '',
      month: datePart.slice(0, 7),
      day: datePart,
      text,
      tags,
      files,
    });
  }
}

memos.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));

// 同一天同一秒且正文完全相同 = flomo 里的重复笔记，只保留一条，
// 但在 first 上记录 dupes，方便审计导出里到底有多少条原始 memo。
const unique = [];
const byKey = new Map();
for (const memo of memos) {
  const first = byKey.get(memo.key);
  if (first) {
    first.dupes = (first.dupes ?? 0) + 1;
    continue;
  }
  byKey.set(memo.key, memo);
  unique.push(memo);
}
for (const memo of unique) memo.dupes = memo.dupes ?? 0;

mkdirSync(dirname(resolve(outPath)), { recursive: true });
writeFileSync(resolve(outPath), `${JSON.stringify({ memos: unique }, null, 1)}\n`);

const byMonth = new Map();
for (const memo of unique) byMonth.set(memo.month, (byMonth.get(memo.month) ?? 0) + 1);
const empty = unique.filter((m) => m.text.length === 0).length;
const dupes = memos.length - unique.length;
console.log(`parsed ${memos.length} raw memos -> ${unique.length} unique (${dupes} duplicates) -> ${outPath}`);
console.log(`empty-text memos: ${empty}`);
console.log(
  [...byMonth.entries()]
    .sort()
    .map(([month, count]) => `${month}:${count}`)
    .join('  '),
);
if (!existsSync(resolve(outPath))) process.exit(1);
