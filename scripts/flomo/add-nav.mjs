#!/usr/bin/env node
/**
 * 给「成稿长文 + 附录」型的月份在开头补一个大类导航。
 *
 * 这些月份的正文是当年写好的长文，不适合重排；但读者仍然需要一个
 * 「这个月有哪些大类、各多少条」的入口，所以只插一段导航，正文不动。
 *
 * 用法：
 *   node scripts/flomo/add-nav.mjs           # 只报告
 *   node scripts/flomo/add-nav.mjs --write
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { renderZhNav, renderEnNav, enSectionName, anchorOf } from './nav.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const WRITE = process.argv.includes('--write');

// 正文是成稿长文、只补录过的月份
const MONTHS = ['2026-05', '2026-06', '2026-07'];

const splitFront = (text) => {
  const m = text.match(/^---\n[\s\S]*?\n---\n/);
  return m ? [m[0], text.slice(m[0].length)] : ['', text];
};

/** 从附录段里读出 `## 主题` 与它的条数。 */
function appendixSections(body) {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => /^##\s*(附录：|Appendix:)/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^##\s+(.*)$/);
    if (!m) continue;
    let count = 0;
    for (let j = i + 1; j < lines.length && !/^##\s/.test(lines[j]); j += 1) {
      if (/^###\s/.test(lines[j])) count += 1;
    }
    out.push({ heading: m[1].trim(), count });
  }
  return out;
}

const stripNav = (body) =>
  body
    .replace(/^#{1,2}\s*(本月导航|Quick Navigation)\n[\s\S]*?\n---\n\n?/m, '')
    .replace(/^\n+/, '\n');

let touched = 0;
for (const month of MONTHS) {
  const zhPath = join(ROOT, `content/zh/growth/posts/${month}-thought-notes.md`);
  const enPath = join(ROOT, `content/en/growth/posts/${month}-thought-notes.md`);
  if (!existsSync(zhPath) || !existsSync(enPath)) continue;

  const [zhFront, zhBodyRaw] = splitFront(readFileSync(zhPath, 'utf8'));
  const [enFront, enBodyRaw] = splitFront(readFileSync(enPath, 'utf8'));

  const sections = appendixSections(zhBodyRaw);
  if (!sections.length) {
    console.log(`${month}: no appendix sections found, skipped`);
    continue;
  }
  const essaySections = (zhBodyRaw.split(/^##\s*(?:附录：)/m)[0].match(/^##\s/gm) ?? []).length;

  const zhNav = renderZhNav({
    counts: sections.map((s) => ({ name: s.heading, heading: s.heading, count: s.count })),
    total: sections.reduce((a, s) => a + s.count, 0),
    essaySections,
  });
  const enSections = sections.map((s) => ({ name: enSectionName(s.heading), heading: enSectionName(s.heading), count: s.count }));
  const enNav = renderEnNav({
    counts: enSections,
    total: sections.reduce((a, s) => a + s.count, 0),
    essaySections,
  });

  const zhBody = `\n${zhNav}\n${stripNav(zhBodyRaw).replace(/^\n+/, '')}`;
  const enBody = `\n${enNav}\n${stripNav(enBodyRaw).replace(/^\n+/, '')}`;

  console.log(`${month}: zh nav with ${sections.length} categories, essay sections=${essaySections}`);
  if (WRITE) {
    writeFileSync(zhPath, zhFront + zhBody);
    writeFileSync(enPath, enFront + enBody);
  }
  touched += 1;
}
console.log(`\n${WRITE ? 'applied' : 'dry-run'}: ${touched} month(s)`);
void anchorOf;
