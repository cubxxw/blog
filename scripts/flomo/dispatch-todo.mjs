#!/usr/bin/env node
/**
 * 生成「补齐英文翻译」的子代理派发脚本。
 * 用法：node scripts/flomo/dispatch-todo.mjs
 * 产出：.flomo/out/dispatch-todo.workflow.js（供 subagent({workflowScriptPath}) 使用）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const bins = JSON.parse(readFileSync(join(ROOT, '.flomo/out/en/_todo.json'), 'utf8'));

const RULES = [
  'You are completing an English translation that was left half-done. Work only inside /Users/cubxxw/data/blog (cwd).',
  '',
  'For each unit below, the Chinese source file lists every memo of that chunk. Some memos already have English translations in the sibling `.en.md` file; the ones listed under MISSING do not.',
  '',
  'Your job per unit:',
  '- If the unit says WRITE WHOLE FILE: translate EVERY memo in the source file and write them all to the sibling `.en.md` (same name, `.zh.md` → `.en.md`).',
  '- If the unit lists MISSING KEYS: translate ONLY those memos and APPEND them to the existing `.en.md`. Never rewrite, reorder or duplicate what is already there.',
  '',
  'Every translated memo card must have exactly this shape:',
  '',
  '    <!--memo:KEY-->',
  '    ### English title',
  '    (blank line)',
  '    > 2026-03-15 22:43:27 · `#tag`',
  '    (blank line)',
  '    English body paragraphs',
  '',
  'Rules:',
  '1. Copy the `<!--memo:KEY-->` marker exactly; every MISSING key must appear exactly once.',
  '2. Keep the `> ` timestamp line byte-identical to the Chinese file, including the backticked tag codes.',
  '3. Translate the `### ` title and all body paragraphs into natural, faithful English. Keep the author\'s spoken, personal register; do not turn it into marketing or academic prose.',
  '4. If a title looks like a truncated clause, render it as a concise English heading with the same opening meaning.',
  '5. Keep paragraph breaks. Do not summarise, merge, shorten or skip.',
  '6. Proper nouns: pinyin/English for places and people (Siem Reap, Angkor, Phnom Penh, S-21, Lhasa, Yingxian). Keep product names as-is (Claude, Codex, DayPage, flomo).',
  '7. Write only file content — no commentary, no code fences.',
  '',
  'Units:',
];

const build = (bin) => {
  const lines = [...RULES];
  for (const u of bin.units) {
    lines.push('', `- SOURCE: ${u.file}`, u.whole ? '  WRITE WHOLE FILE' : `  MISSING KEYS: ${u.missing.join(' ')}`);
  }
  lines.push('', 'When finished, reply with one line per file: `<file>: <keys written>`. Nothing else.');
  return lines.join('\n');
};

const specs = bins.map((b) => ({ key: b.child, agent: 'delegate', task: build(b) }));
const script = [
  `const SPECS = ${JSON.stringify(specs)};`,
  'const out = await runs.all(SPECS);',
  'return out.map((r, i) => ({ key: SPECS[i].key, output: String(r.output ?? "").slice(0, 300), error: r.error ? String(r.error.message ?? r.error).slice(0, 200) : null }));',
].join('\n');

writeFileSync(join(ROOT, '.flomo/out/dispatch-todo.workflow.js'), script);
console.log(`wrote dispatch script for ${specs.length} children`);
for (const b of bins) console.log(`${b.child}  ${b.count} entries  ${b.units.length} units  ${[...new Set(b.units.map((u) => u.month))].join(', ')}`);
