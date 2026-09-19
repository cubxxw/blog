#!/usr/bin/env node
/**
 * 从「已经发布的英文正文」里回收翻译，重建 chunk 级的 `.en.md` 文件。
 *
 * 用途：既有月份原本是别的格式（按日期归档、旧 dump、成稿长文），现在要按大类
 * 重新归档。正文重排不需要重新翻译——中英文共享同一批时间戳，所以按时间戳把
 * 英文条目取回来，挂到新的 chunk 分组上即可。
 *
 * 用法：
 *   node scripts/flomo/import-en-chunks.mjs [--months 2025-12,2026-01]
 *   node scripts/flomo/import-en-chunks.mjs --report   # 只报缺口
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const REPORT = process.argv.includes('--report');
const monthsFlag = process.argv.indexOf('--months');
const only = monthsFlag >= 0 ? process.argv[monthsFlag + 1].split(',') : null;

const plan = JSON.parse(readFileSync(join(ROOT, '.flomo/out/plan.json'), 'utf8'));

/** 把一篇英文正文切成 (时间戳 -> 条目 markdown)。 */
function indexEntries(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');
  const byStamp = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    // 两种写法都要认：新归档是 ISO，旧 dump 是「2026 年 04 月 30 日 - 14:46:26」
    const m =
      lines[i].match(/^>\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/) ??
      lines[i].match(/^>\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*[-·|]?\s*(\d{1,2}):(\d{2}):(\d{2})/);
    if (!m) continue;
    // 往回找到这一条的 ### 标题
    let start = i;
    while (start > 0 && !/^###\s/.test(lines[start])) start -= 1;
    if (!/^###\s/.test(lines[start])) continue;
    // 往前找到下一个条目或下一个真正的章节标题
    let end = i + 1;
    while (end < lines.length && !/^###\s/.test(lines[end]) && !/^##\s[^#]*$/.test(lines[end])) end += 1;
    const stamp = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}:${m[6]}`;
    const block = lines
    .slice(start, end)
    .filter((l) => !/^<!--memo:[0-9a-f]{6,}-->$/.test(l.trim()))
    .join('\n')
    .replace(/\n+$/, '');
    // 同一时间戳可能同时出现在「精选」和「归档」里：后出现的那个才是归档条目
    byStamp.set(stamp, { block, used: false, date: stamp.slice(0, 10) });
  }
  return byStamp;
}

const shiftStamp = (stamp, minutes) => {
  const [d, t] = stamp.split(' ');
  const secs = Number(t.slice(0, 2)) * 3600 + Number(t.slice(3, 5)) * 60 + Number(t.slice(6, 8)) + minutes * 60;
  const wrapped = ((secs % 86400) + 86400) % 86400;
  const hh = String(Math.floor(wrapped / 3600)).padStart(2, '0');
  const mm = String(Math.floor((wrapped % 3600) / 60)).padStart(2, '0');
  const ss = String(wrapped % 60).padStart(2, '0');
  return `${d} ${hh}:${mm}:${ss}`;
};

/**
 * 老英文版有两种历史包袱：个别条目时间被改过，整月时间整体差 1 小时。
 * 所以按「整点偏移 → 同一天唯一未用条目」的顺序兜底，并且每条只能用一次。
 */
function takeEntry(byStamp, stamp) {
  for (const minutes of [0, 60, -60, 120, -120]) {
    const key = minutes === 0 ? stamp : shiftStamp(stamp, minutes);
    const hit = byStamp.get(key);
    if (hit && !hit.used) {
      hit.used = true;
      return hit.block;
    }
  }
  const date = stamp.slice(0, 10);
  const sameDay = [...byStamp.entries()].filter(([k, v]) => k.startsWith(date) && !v.used);
  if (sameDay.length === 1) {
    sameDay[0][1].used = true;
    return sameDay[0][1].block;
  }
  return null;
}

const report = [];
for (const [month, info] of Object.entries(plan)) {
  if (info.enMode !== 'full') continue;
  if (only && !only.includes(month)) continue;
  const dir = join(ROOT, '.flomo/out/en', month);
  if (!existsSync(dir)) continue;
  const chunks = readdirSync(dir).filter((f) => f.endsWith('.zh.md')).sort();
  if (!chunks.length) continue;
  const enPath = join(ROOT, `content/en/growth/posts/${month}-thought-notes.md`);
  if (!existsSync(enPath)) continue;
  const byStamp = indexEntries(readFileSync(enPath, 'utf8'));

  let imported = 0;
  let missing = 0;
  const missingKeys = [];
  for (const chunk of chunks) {
    if (chunk === 'essay.zh.md') continue;
    const source = readFileSync(join(dir, chunk), 'utf8');
    const parts = source.split(/<!--memo:([0-9a-f]{6,})-->\n/).slice(1);
    const out = [];
    for (let i = 0; i < parts.length; i += 2) {
      const key = parts[i];
      const zhBlock = parts[i + 1];
      const stamp = (zhBlock.match(/>\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/) ?? []).slice(1, 3).join(' ');
      const en = takeEntry(byStamp, stamp);
      if (!en) {
        missing += 1;
        missingKeys.push(key);
        continue;
      }
      // 老英文版里个别月份的时间戳比现导出早一小时，直接用中文侧的 `> 时间戳 · 标签`
      // 那一行，省得两条语言版本对不上。
      const zhQuote = zhBlock.split('\n').find((l) => /^>\s*\d{4}-/.test(l)) ?? '';
      const enLines = en.split('\n');
      const titleAt = enLines.findIndex((l) => /^###\s/.test(l));
      const quoteAt = enLines.findIndex((l, i) => i > titleAt && /^>/.test(l));
      const enTitle = titleAt >= 0 ? enLines[titleAt] : '### (untitled)';
      const enBody = (quoteAt >= 0 ? enLines.slice(quoteAt + 1) : enLines.slice(titleAt + 1))
        .join('\n')
        // 分块边界会把下一条的 `<!--memo:KEY-->` 一起带进来，必须去掉，
        // 否则解析时会被当成一条空条目
        .replace(/<!--memo:[0-9a-f]{6,}-->/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      out.push(`<!--memo:${key}-->\n${enTitle}\n\n${zhQuote}\n\n${enBody}\n`);
      imported += 1;
    }
    if (out.length && !REPORT) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, chunk.replace(/\.zh\.md$/, '.en.md')), out.join('\n'));
    }
  }
  report.push({ month, imported, missing, missingKeys });
}

console.log('month     imported  missing');
let totalMissing = 0;
for (const r of report) {
  totalMissing += r.missing;
  console.log(`${r.month}  ${String(r.imported).padStart(8)}  ${String(r.missing).padStart(7)}`);
}
if (totalMissing) {
  const detail = report.filter((r) => r.missing).map((r) => `${r.month}: ${r.missingKeys.slice(0, 8).join(' ')}${r.missingKeys.length > 8 ? ' …' : ''}`);
  console.log('\n需要补翻的条目：');
  for (const line of detail) console.log(`  ${line}`);
}
console.log(`\n${REPORT ? 'dry-run' : 'imported'}: ${report.reduce((a, r) => a + r.imported, 0)} entries, ${totalMissing} still missing`);
