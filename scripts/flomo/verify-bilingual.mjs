#!/usr/bin/env node
/**
 * 双语一致性校验：同一个月的中英文文章必须覆盖同一组 memo。
 *
 * 用法：
 *   node scripts/flomo/verify-bilingual.mjs            # 报告差异，有差异则非零退出
 *   node scripts/flomo/verify-bilingual.mjs --sample   # 额外抽样打印英文条目
 *
 * 判定依据是每篇文章里的 `<!--memo:KEY-->` 来源标记，所以既不需要读原文，
 * 也不受翻译写法影响：key 集合相同 == 条目数、顺序、身份都相同。
 */
import { readFileSync, existsSync, globSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const SAMPLE = process.argv.includes('--sample');
const MARKER = /<!--memo:([0-9a-f]{6,})-->/g;

const keysOf = (file) => {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(MARKER)].map((m) => m[1]);
};

const zhFiles = globSync('content/zh/growth/posts/*-thought-notes.md', { cwd: ROOT }).sort();
const problems = [];
const rows = [];

for (const rel of zhFiles) {
  const month = rel.match(/(\d{4}-\d{2})-thought-notes\.md$/)[1];
  const zhFile = join(ROOT, rel);
  const enFile = join(ROOT, 'content/en/growth/posts', `${month}-thought-notes.md`);
  const zhKeys = keysOf(zhFile);
  if (!existsSync(enFile)) {
    // 2025-12 / 2026-01 / 2026-02 用的是旧版归档，没有来源标记，另行处理
    if (zhKeys.length) problems.push(`${month}: no English counterpart`);
    rows.push({ month, zh: zhKeys.length, en: 0, status: zhKeys.length ? 'MISSING EN' : 'legacy (no markers)' });
    continue;
  }
  const enKeys = keysOf(enFile);
  const z = new Set(zhKeys);
  const e = new Set(enKeys);
  const onlyZh = [...z].filter((k) => !e.has(k));
  const onlyEn = [...e].filter((k) => !z.has(k));
  const ordered = zhKeys.length === enKeys.length && zhKeys.every((k, i) => k === enKeys[i]);
  // 英文版不该大段留中文（旧英文文件曾有整段未翻译的情况）
  const cjk = (readFileSync(enFile, 'utf8').match(/[\u4e00-\u9fa5]/g) ?? []).length;
  if (cjk > 1500) problems.push(`${month}: English article contains ${cjk} Chinese characters — likely untranslated`);
  if (onlyZh.length || onlyEn.length) {
    problems.push(
      `${month}: marker mismatch — zh ${zhKeys.length} vs en ${enKeys.length}` +
        (onlyZh.length ? `; only in zh: ${onlyZh.slice(0, 3).join(', ')}` : '') +
        (onlyEn.length ? `; only in en: ${onlyEn.slice(0, 3).join(', ')}` : ''),
    );
  } else if (!ordered) {
    problems.push(`${month}: same keys but different order`);
  }
  rows.push({
    month,
    zh: zhKeys.length,
    en: enKeys.length,
    status: onlyZh.length || onlyEn.length ? 'MISMATCH' : ordered ? 'ok' : 'order',
  });
  if (SAMPLE) {
    const body = readFileSync(enFile, 'utf8');
    const first = body.split(/<!--memo:[0-9a-f]+-->/)[1] ?? '';
    console.log(`\n--- ${month} first English entry ---${first.split('\n').slice(0, 6).join('\n')}`);
  }
}

console.log('month     zh  en  status');
for (const r of rows) console.log(`${r.month}  ${String(r.zh).padStart(3)} ${String(r.en).padStart(3)}  ${r.status}`);

const withMarkers = rows.filter((r) => r.status !== 'legacy (no markers)');
console.log(
  `\n${withMarkers.length} months compared; ${problems.length ? `${problems.length} blocked` : 'bilingual parity holds'}`,
);

if (problems.length) {
  console.error('\nproblems:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
}
