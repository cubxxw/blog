#!/usr/bin/env node
/**
 * 把脱敏清单应用到「已经发布的」月度笔记上。
 * 优先用 memo key 定位；旧稿无来源标记时才用时间戳或正文指纹。
 * languages 省略时兼容原有双语规则；显式语言范围只应用于对应文章。
 *
 *   node scripts/flomo/scrub.mjs           # 只报告
 *   node scripts/flomo/scrub.mjs --write   # 落盘（不修改私有导出）
 */
import { readFileSync, writeFileSync, globSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MARKER = /^\s*<!--\s*memo:([\w-]+)\s*-->\s*$/;
const TOPICS = new Set([
  'AI 与 Agent 系统', 'AI and Agent Systems',
  '产品、工程与开源', 'Product, Engineering and Open Source',
  '商业、投资与职业', 'Business, Investing and Career',
  '自我认知与心理', 'Self-Knowledge and Psychology',
  '阅读、思想与历史', 'Reading, Ideas and History',
  '旅行、地理与城市', 'Travel, Places and Cities',
  '身体、健康与日常', 'Body, Health and Daily Life',
  '内容、创作与记录', 'Content, Craft and Recording',
  '日常与其他', 'Daily Notes and Everything Else',
]);

// H2 也可能是 memo 内部小节。只把明确的文章章节当边界。
function sectionHeading(lines, i) {
  if (!/^##\s/.test(lines[i])) return false;
  const title = lines[i].replace(/^##\s+/, '').replace(/\s+#+\s*$/, '').trim()
    .replace(/^(?:[一二三四五六七八九十]+[、.]|\d+[.)])\s*/, '');
  if (/^(?:References|参考资料)$/i.test(title) || TOPICS.has(title)) return true;
  for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
    const line = lines[j].trim();
    if (!line) continue;
    return /^\*\d+ (?:entries|条记录)\*$/.test(line);
  }
  return false;
}

const fingerprintOf = (memo) =>
  ((memo.text ?? '').split('\n').map((line) => line.trim()).find((line) => line.length >= 12) ?? '')
    .replace(/[`*>#\s]+/g, ' ').trim().slice(0, 24);
const stampOf = (memo) => `> ${memo.date} ${memo.time}`;
const appliesTo = (entry, language) => entry.languages === undefined || entry.languages.includes(language);

function legacyEntryHeading(lines, i) {
  if (!/^###\s/.test(lines[i])) return false;
  let next = i + 1;
  while (next < lines.length && !lines[next].trim()) next += 1;
  return /^>\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(lines[next] ?? '');
}

function blockFromHeading(lines, heading, marker = -1) {
  let end = heading + 1;
  let ambiguous = false;
  while (end < lines.length) {
    if (MARKER.test(lines[end]) || sectionHeading(lines, end) || /^#\s/.test(lines[end])) break;
    if (legacyEntryHeading(lines, end)) break;
    if (marker < 0 && /^#{2,3}\s/.test(lines[end])) ambiguous = true;
    end += 1;
  }
  if (ambiguous) return { uncertain: 'legacy heading cannot be distinguished from an article section or entry' };
  return { start: marker >= 0 ? marker : heading, heading, end };
}

function findBlock(lines, memo) {
  const markers = lines.flatMap((line, index) => MARKER.exec(line)?.[1] === memo.key ? [index] : []);
  if (markers.length > 1) return { uncertain: 'duplicate memo key markers' };
  if (markers.length === 1) {
    const marker = markers[0];
    let heading = marker + 1;
    while (heading < lines.length && !lines[heading].trim()) heading += 1;
    if (!/^###\s/.test(lines[heading] ?? '')) return { uncertain: 'memo marker has no adjacent entry heading' };
    return blockFromHeading(lines, heading, marker);
  }

  // 旧无标记稿才允许回退，绝不借相同时间戳删掉另一个 key。
  function legacyCandidates(matches) {
    const candidates = new Map();
    for (let at = 0; at < lines.length; at += 1) {
      if (!matches(lines[at])) continue;
      let heading = at;
      while (heading >= 0 && !/^###\s/.test(lines[heading])) {
        if (MARKER.test(lines[heading]) || sectionHeading(lines, heading) || /^#\s/.test(lines[heading])) break;
        heading -= 1;
      }
      if (heading < 0 || !/^###\s/.test(lines[heading])) continue;
      if (!legacyEntryHeading(lines, heading)) continue;
      let previous = heading - 1;
      while (previous >= 0 && !lines[previous].trim()) previous -= 1;
      if (MARKER.test(lines[previous] ?? '')) continue;
      candidates.set(heading, blockFromHeading(lines, heading));
    }
    return [...candidates.values()];
  }
  let candidates = legacyCandidates((line) => line.startsWith(stampOf(memo)));
  if (!candidates.length) {
    const fingerprint = fingerprintOf(memo);
    if (fingerprint) candidates = legacyCandidates((line) => line.includes(fingerprint));
  }
  if (candidates.length > 1) return { uncertain: 'multiple legacy entries match the same timestamp or fingerprint' };
  return candidates[0] ?? null;
}

/** Pure article transformation; importing this module never reads the private export. */
export function scrubArticle(original, { language, memos, policy }) {
  const byKey = new Map(memos.map((memo) => [memo.key, memo]));
  const report = { dropped: 0, redacted: 0, links: 0, uncertain: 0 };
  const events = [];
  let work = original;

  for (const [kind, entries] of [['drop', policy.drops ?? []], ['redact', policy.redactions ?? []]]) {
    for (const entry of entries) {
      if (!appliesTo(entry, language)) continue;
      const memo = byKey.get(entry.key);
      if (!memo) continue;
      const lines = work.split('\n');
      const block = findBlock(lines, memo);
      if (!block) continue;
      if (block.uncertain) {
        report.uncertain += 1;
        events.push({ kind: 'uncertain', key: entry.key, detail: block.uncertain });
        continue;
      }
      if (kind === 'drop') {
        const removed = lines.slice(block.start, block.end).join('\n');
        if (!removed.includes('memo:') && removed.length < 40) continue;
        work = [...lines.slice(0, block.start), ...lines.slice(block.end)].join('\n');
        if (block.start > 0 && block.end === lines.length) work += '\n';
        report.dropped += 1;
        events.push({ kind, key: entry.key, stamp: `${memo.date} ${memo.time}` });
        continue;
      }

      // 来源标记、标题、时间戳与标签都是元数据，不参与正文正则。
      const stampLine = lines.findIndex((line, i) => i > block.heading && i < block.end && /^>\s*\d{4}-/.test(line));
      let start = stampLine >= 0 ? stampLine + 1 : block.heading + 1;
      let end = block.end;
      while (start < end && !lines[start].trim()) start += 1;
      while (end > start && !lines[end - 1].trim()) end -= 1;
      if (start >= end) continue;
      const body = lines.slice(start, end).join('\n');
      let next = body;
      for (const pattern of entry.patterns) next = next.replace(new RegExp(pattern.find, 'gm'), pattern.replace);
      if (next !== body) {
        lines.splice(start, end - start, ...next.split('\n'));
        work = lines.join('\n');
        report.redacted += 1;
        events.push({ kind, key: entry.key, stamp: `${memo.date} ${memo.time}` });
      }
    }
  }

  const beforeLinks = work;
  work = work.replace(/https?:\/\/v\.flomoapp\.com\/\S+/g, '');
  if (work !== beforeLinks) {
    report.links += 1;
    events.push({ kind: 'links' });
  }
  work = work.replace(/^### Linked from:\s*$/gm, '### 一条 flomo 记录');
  work = work.replace(/^Linked from:\s*$/gm, '');
  return { content: work, report, events };
}

export function main({ root = ROOT, write = process.argv.includes('--write'), log = console.log } = {}) {
  const { memos } = JSON.parse(readFileSync(join(root, '.flomo/memos.json'), 'utf8'));
  const policy = JSON.parse(readFileSync(join(root, 'scripts/flomo/redactions.json'), 'utf8'));
  const report = { dropped: 0, redacted: 0, links: 0, uncertain: 0, files: new Set() };
  for (const file of globSync('content/{zh,en}/growth/posts/*-thought-notes.md', { cwd: root }).sort()) {
    const path = join(root, file);
    const original = readFileSync(path, 'utf8');
    const language = file.split('/')[1];
    const result = scrubArticle(original, { language, memos, policy });
    for (const key of ['dropped', 'redacted', 'links', 'uncertain']) report[key] += result.report[key];
    for (const event of result.events) log(`${event.kind.padEnd(7)} ${file}${event.key ? `: ${event.key}` : ''}${event.detail ? ` (${event.detail})` : ''}`);
    if (result.content !== original) {
      report.files.add(file);
      if (write) writeFileSync(path, result.content);
    }
  }
  log(`\n${write ? 'applied' : 'dry-run'}: ${report.dropped} entries dropped, ${report.redacted} entries redacted, ` +
    `${report.links} files had private links; ${report.files.size} file(s) touched; ${report.uncertain} uncertain entries skipped`);
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) main();
