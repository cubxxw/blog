#!/usr/bin/env node
/**
 * 把脱敏清单应用到「已经发布的」月度笔记上。
 *
 * 为什么需要它：`build-notes.mjs` 只管新生成的正文。上一批手工整理进
 * content/ 的文章不在它的管辖范围里，但那些文章同样可能带着
 * 不该公开的内容（例如按 memo key 判定的 drop 条目、第三方手机号）。
 * 这里按「时间戳」定位条目，所以中英文都能命中同一处。
 *
 * 用法：
 *   node scripts/flomo/scrub.mjs           # 只报告
 *   node scripts/flomo/scrub.mjs --write   # 落盘
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const WRITE = process.argv.includes('--write');

const { memos } = JSON.parse(readFileSync(join(ROOT, '.flomo/memos.json'), 'utf8'));
const redactions = JSON.parse(readFileSync(join(ROOT, 'scripts/flomo/redactions.json'), 'utf8'));
const byKey = new Map(memos.map((m) => [m.key, m]));

// flomo 站内私有链接对外没有意义，顺手一起清掉
const LINK_RULES = [[/https?:\/\/v\.flomoapp\.com\/\S+/g, '']];

/**
 * 找到某条 memo 在文章里的行区间 [start, end)。
 * 起点是它自己的 `### 标题`，终点是下一个条目或下一个「真正的章节标题」——
 * memo 正文里可能自带 `## 小节`（比如个人档案、报告），不能把它当边界。
 */
const SECTION_HEADING = (lines, i) => {
  if (!/^##\s/.test(lines[i])) return false;
  for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
    const l = lines[j].trim();
    if (!l) continue;
    return /^(\*\d+ (entries|条记录)\*|\d{4}-\d{2}-\d{2}|[一二三四五六七八九十]+、|\d+\.\s)/.test(l);
  }
  return false;
};

const fingerprintOf = (memo) =>
  (memo.text.split('\n').map((l) => l.trim()).find((l) => l.length >= 12) ?? '')
    .replace(/[`*>#\s]+/g, ' ')
    .trim()
    .slice(0, 24);

function findBlock(lines, stamp, fingerprint) {
  let at = lines.findIndex((l) => l.includes(stamp));
  // 时间戳对不上（旧导出里同一条 memo 的时间被改过）时，用正文首句兜底定位
  if (at < 0 && fingerprint) at = lines.findIndex((l) => l.includes(fingerprint));
  if (at < 0) return null;
  let start = at;
  while (start > 0 && !/^###\s/.test(lines[start])) start -= 1;
  if (!/^###\s/.test(lines[start])) return null;
  let end = at + 1;
  while (end < lines.length && !/^###\s/.test(lines[end]) && !SECTION_HEADING(lines, end)) end += 1;
  return { start, end };
}

const stampOf = (memo) => `> ${memo.date} ${memo.time}`;

const report = { dropped: 0, redacted: 0, links: 0, files: new Set() };

for (const file of globSync('content/{zh,en}/growth/posts/*-thought-notes.md', { cwd: ROOT }).sort()) {
  const path = join(ROOT, file);
  const original = readFileSync(path, 'utf8');
  let work = original;

  // 1) 整条删除（按时间戳定位，中英文章共用同一入口）
  for (const drop of redactions.drops) {
    const memo = byKey.get(drop.key);
    if (!memo) continue;
    const lines = work.split('\n');
    const block = findBlock(lines, stampOf(memo), fingerprintOf(memo));
    if (!block) continue;
    const removed = lines.slice(block.start, block.end).join('\n');
    if (!removed.includes('memo:') && removed.length < 40) continue;
    work = [...lines.slice(0, block.start), ...lines.slice(block.end)].join('\n');
    report.dropped += 1;
    report.files.add(file);
    console.log(`drop   ${file}: ${memo.date} ${memo.time} (${drop.reason.slice(0, 40)}…)`);
  }

  // 2) 局部替换（只在该条 memo 自己的段落里动手，避免误伤别的数字）
  for (const red of redactions.redactions) {
    const memo = byKey.get(red.key);
    if (!memo) continue;
    const lines = work.split('\n');
    const block = findBlock(lines, stampOf(memo), fingerprintOf(memo));
    // 只在「能定位到那一条」时动手。定位不到就不改：对整篇套用手机号之类的
    // 宽松正则，会把不相干的年份、数量也一起吃掉。
    if (!block) continue;
    let changed = false;
    // 跳过 `> 时间戳` 那一行：宽正则不该有机会改到它
    const stampLine = lines.findIndex((l, i) => i >= block.start && i < block.end && /^>\s*\d{4}-/.test(l));
    const bodyStart = stampLine >= 0 ? stampLine + 1 : block.start;
    for (const [start, end] of [[bodyStart, block.end]]) {
      if (start >= end) continue;
      const body = lines.slice(start, end).join('\n');
      let next = body;
      for (const p of red.patterns) next = next.replace(new RegExp(p.find, 'gm'), p.replace);
      if (next !== body) {
        lines.splice(start, end - start, ...next.split('\n'));
        changed = true;
      }
    }
    if (changed) {
      work = lines.join('\n');
      report.redacted += 1;
      report.files.add(file);
      console.log(`redact ${file}: ${memo.date} ${memo.time}`);
    }
  }

  // 3) flomo 私有链接
  const before = work;
  for (const [re, to] of LINK_RULES) work = work.replace(re, to);
  if (work !== before) {
    report.links += 1;
    report.files.add(file);
    console.log(`links  ${file}`);
  }
  // 链接被拿掉后只剩「Linked from:」这种空壳标题，收一下
  work = work.replace(/^### Linked from:\s*$/gm, '### 一条 flomo 记录');
  work = work.replace(/^Linked from:\s*$/gm, '');

  if (work !== original) {
    work = work.replace(/\n{4,}/g, '\n\n\n');
    if (WRITE) writeFileSync(path, work);
  }
}

console.log(
  `\n${WRITE ? 'applied' : 'dry-run'}: ${report.dropped} entries dropped, ${report.redacted} entries redacted, ` +
    `${report.links} files had private links; ${report.files.size} file(s) touched`,
);
