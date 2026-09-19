#!/usr/bin/env node
/**
 * 生成「整片 chunk 重新翻译」的子代理派发脚本（用于旧英文版其实是中文的情况）。
 * 用法：node scripts/flomo/dispatch-whole.mjs 2025-12 2026-01 2026-02 2026-04
 * 产出：.flomo/out/dispatch-whole.workflow.js
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const months = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}$/.test(a));
if (!months.length) {
  console.error('usage: node scripts/flomo/dispatch-whole.mjs 2025-12 [2026-01 ...]');
  process.exit(1);
}

const jobs = [];
for (const month of months) {
  const dir = join(ROOT, '.flomo/out/en', month);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.zh.md') && x !== 'essay.zh.md').sort()) {
    const bytes = readFileSync(join(dir, f), 'utf8').length;
    jobs.push({ month, file: `.flomo/out/en/${month}/${f}`, bytes });
  }
}

const TARGET = 38_000; // 约 10-12 个 chunk 一组，单个子代理写得完
const bins = [];
for (const job of jobs) {
  let bin = bins.find((b) => b.bytes + job.bytes <= TARGET);
  if (!bin) {
    bin = { bytes: 0, jobs: [] };
    bins.push(bin);
  }
  bin.jobs.push(job);
  bin.bytes += job.bytes;
}

const RULES = [
  'Translate a personal Chinese blog archive into English. Work only inside /Users/cubxxw/data/blog (cwd).',
  '',
  'For EACH source file listed below, write the sibling file with the same name but `.en.md`',
  '(e.g. `.flomo/out/en/2025-12/03.zh.md` → `.flomo/out/en/2025-12/03.en.md`).',
  '',
  'Rules:',
  '1. Each source file starts with an instruction header ending at the first `---` line. Do NOT copy that header into the output; the output starts directly with the first `<!--memo:KEY-->` marker.',
  '2. Keep every `<!--memo:KEY-->` marker exactly as it is, in the same order, one per memo. Never invent, drop or reorder a marker.',
  '3. Translate the `### ` title and all body paragraphs into natural, faithful English. Keep the author\'s spoken, personal register; do not turn it into marketing or academic prose.',
  '4. If a title looks like a truncated clause, render it as a concise English heading carrying the same opening meaning, and drop trailing incomplete words. Keep headings under ~90 characters.',
  '5. Keep the `> ` line byte-identical: same timestamp, same backticked `#tag` codes.',
  '6. Keep paragraph breaks (blank line between paragraphs). Do not merge paragraphs.',
  '7. Do not summarise, shorten, omit, reorder or add anything. Every memo must appear with its full translation.',
  '8. Proper nouns: pinyin/English for places and people (Siem Reap, Angkor, Phnom Penh, S-21, Lhasa, Yingxian, Kumano Kodo). Keep product names as-is (Claude, Codex, DayPage, flomo). Keep book and film titles as their standard English titles when one exists, otherwise romanise.',
  '9. Write only file content — no commentary, no code fences.',
  '',
  'Files:',
];

const build = (bin) => {
  const lines = [...RULES];
  for (const job of bin.jobs) lines.push(`- ${job.file}`);
  lines.push('', 'When finished, reply with one line per file: `<file>: <memo count> memos, <bytes>`. Nothing else.');
  return lines.join('\n');
};

const specs = bins.map((b, i) => ({ key: `w${String(i + 1).padStart(2, '0')}`, agent: 'delegate', task: build(b) }));
const script = [
  `const SPECS = ${JSON.stringify(specs)};`,
  'const out = await runs.all(SPECS);',
  'return out.map((r, i) => ({ key: SPECS[i].key, output: String(r.output ?? "").slice(0, 200), error: r.error ? String(r.error.message ?? r.error).slice(0, 200) : null }));',
].join('\n');

writeFileSync(join(ROOT, '.flomo/out/dispatch-whole.workflow.js'), script);
console.log(`chunks: ${jobs.length}, children: ${specs.length}`);
for (const [i, b] of bins.entries()) {
  console.log(`w${String(i + 1).padStart(2, '0')}  ${b.jobs.length} chunks  ${[...new Set(b.jobs.map((j) => j.month))].join(', ')}`);
}
