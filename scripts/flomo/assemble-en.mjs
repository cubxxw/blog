#!/usr/bin/env node
/**
 * 用翻译好的 chunk 文件拼出英文月度笔记。
 *
 * 用法：
 *   node scripts/flomo/assemble-en.mjs                # 校验 + 生成到 .flomo/out/en-out/
 *   node scripts/flomo/assemble-en.mjs --write        # 写入 content/en/growth/posts/
 *   node scripts/flomo/assemble-en.mjs --months 2026-08
 *   node scripts/flomo/assemble-en.mjs --check        # 只做覆盖校验，不写文件
 *
 * 输入：
 *   .flomo/out/plan.json        中文归档的结构（分几个主题、每个主题放哪些 memo）
 *   .flomo/out/zh/{month}.md    中文正文，用来镜像章节结构
 *   .flomo/out/en/{month}/*.en.md  翻译结果，必须保留 `<!--memo:KEY-->` 标记
 *   scripts/flomo/en-meta.json  英文 front matter（人工翻译，避免机翻腔）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { renderEnNav, enSectionName, normalizeBody } from './nav.mjs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const WRITE = process.argv.includes('--write');
const CHECK_ONLY = process.argv.includes('--check');
const monthsFlag = process.argv.indexOf('--months');
const onlyMonths = monthsFlag >= 0 ? process.argv[monthsFlag + 1].split(',') : null;

const plan = JSON.parse(readFileSync(join(ROOT, '.flomo/out/plan.json'), 'utf8'));
const keysIndex = JSON.parse(readFileSync(join(ROOT, '.flomo/out/keys.json'), 'utf8'));
const meta = JSON.parse(readFileSync(join(ROOT, 'scripts/flomo/en-meta.json'), 'utf8'));
const OUT = join(ROOT, '.flomo/out/en-out');

const HEADING_EN = {
  '## 附录：本月原始记录': '## Appendix: raw notes from this month',
  '## 补录：本月其他记录': '## Addendum: other notes from this month',
};

// ---------------------------------------------------------------- 解析翻译结果

const MARKER = /<!--memo:([0-9a-f]{6,})-->/g;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (n) => MONTH_NAMES[n - 1];

/** 把一份翻译好的 chunk 拆成 key -> { title, quote, body }。 */
function parseTranslated(text, file) {
  const cards = new Map();
  const parts = text.split(/<!--memo:([0-9a-f]{6,})-->/);
  // parts = [before, key1, body1, key2, body2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i];
    const chunk = parts[i + 1] ?? '';
    const lines = chunk.split('\n');
    let title = '';
    let quote = '';
    const body = [];
    let stage = 0;
    for (const line of lines) {
      if (stage === 0) {
        const h = line.match(/^###\s+(.*)$/);
        if (h) {
          title = h[1].trim();
          stage = 1;
        }
        continue;
      }
      if (stage === 1) {
        if (/^>\s/.test(line)) {
          quote = line.trim();
          stage = 2;
        }
        continue;
      }
      body.push(line);
    }
    if (!title) throw new Error(`${file}: memo ${key} has no ### title`);
    if (!quote) throw new Error(`${file}: memo ${key} has no > timestamp line`);
    cards.set(key, { title, quote, body: body.join('\n').trim() });
  }
  return cards;
}

function readTranslations(month) {
  const dir = join(ROOT, '.flomo/out/en', month);
  if (!existsSync(dir)) return { cards: new Map(), files: [] };
  const files = readdirSync(dir).filter((f) => f.endsWith('.en.md')).sort();
  const cards = new Map();
  for (const f of files) {
    const parsed = parseTranslated(readFileSync(join(dir, f), 'utf8'), `${month}/${f}`);
    for (const [k, v] of parsed) cards.set(k, v);
  }
  return { cards, files };
}

// ---------------------------------------------------------------- 结构镜像

/** 从中文归档里读出「章节 -> memo key」的骨架，英文版照抄这个顺序。 */
function readStructure(month) {
  const info = plan[month];
  const outFile = join(ROOT, '.flomo/out/zh', `${month}.md`);
  const contentFile = join(ROOT, `content/zh/growth/posts/${month}-thought-notes.md`);
  let text;
  let appendix = false;
  // 追加型的月份以线上正文为准：只有尾部那段补录/附录是需要新翻的
  if (existsSync(contentFile)) {
    const full = readFileSync(contentFile, 'utf8');
    const cut = full.search(/\n## (?:补录|附录)：/);
    if (cut >= 0) {
      text = full.slice(cut);
      appendix = true;
    } else {
      text = existsSync(outFile) ? readFileSync(outFile, 'utf8') : full;
    }
  } else {
    text = readFileSync(outFile, 'utf8');
  }
  const lines = text.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      current = { heading: h2[1].trim(), keys: [], count: null };
      sections.push(current);
      continue;
    }
    const count = line.match(/^\*(\d+) 条记录\*$/);
    if (count && current && current.count === null) {
      current.count = Number(count[1]);
      continue;
    }
    for (const m of line.matchAll(MARKER)) if (current) current.keys.push(m[1]);
  }
  return { sections: sections.filter((s) => s.keys.length), appendix };
}

const zhFront = (month) => {
  const draft = join(ROOT, '.flomo/out/zh', `${month}.md`);
  const content = join(ROOT, `content/zh/growth/posts/${month}-thought-notes.md`);
  let raw = existsSync(draft) ? readFileSync(draft, 'utf8') : '';
  if (!raw.startsWith('---') && existsSync(content)) raw = readFileSync(content, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  const tags = [];
  const tagBlock = fm ? fm[1].match(/^tags:\n((?:\s*-\s*.*\n?)+)/m) : null;
  if (tagBlock) for (const l of tagBlock[1].split('\n')) {
    const t = l.replace(/^\s*-\s*/, '').trim();
    if (t) tags.push(t);
  }
  const title = fm ? (fm[1].match(/^title:\s*(.*)$/m) ?? [])[1] : '';
  const date = fm ? (fm[1].match(/^date:\s*(.*)$/m) ?? [])[1] : '';
  return { tags, title, date };
};

function renderEnCard(card) {
  return `### ${card.title}\n\n${card.quote}\n\n${normalizeBody(card.body)}\n`;
}

function buildEnBody(month, cards) {
  const { sections, appendix } = readStructure(month);
  const out = [];
  for (const [i, s] of sections.entries()) {
    const name = enSectionName(s.heading);
    // 补录段不编号：长文自身已经有编号，再排一次会撞号
    out.push(appendix ? `## ${name}` : `## ${i + 1}. ${name}`, '', `*${s.keys.length} entries*`, '');
    for (const key of s.keys) {
      const card = cards.get(key);
      if (!card) throw new Error(`${month}: missing translation for ${key}`);
      out.push(`<!--memo:${key}-->`, renderEnCard(card), '');
    }
  }
  return out.join('\n').trimEnd();
}

/** 英文 front matter：标题/描述/tldr 来自人工翻译，其余字段沿用中文版的规范值。 */
function renderEnFrontMatter(month, metaEntry, zh, cover = '') {
  const tags = zh.tags.length ? zh.tags : ['Blog', 'Monthly Notes', 'Personal Reflection'];
  const date = zh.date || `${month}-28T23:59:59+08:00`;
  // 日期必须是可解析的上海时间：写成 undefinedTundefined 之类时 Hugo 会直接构建失败
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(date)) {
    throw new Error(`${month}: unparsable date inherited from the Chinese article: ${date}`);
  }
  const lines = [
    '---',
    `title: '${metaEntry.title.replace(/'/g, '’')}'`,
    'ShowRssButtonInSectionTermList: true',
    `date: ${date}`,
    'showtoc: false',
    'weight: 1',
    'tocopen: false',
    'type: posts',
    'author: ["Xinwei Xiong", "Me"]',
    ...(cover ? [cover] : []),
    'keywords: []',
    'tags:',
    ...tags.map((t) => `  - ${t}`),
    'description: >',
    `  ${metaEntry.description.replace(/'/g, '’')}`,
  ];
  if (metaEntry.tldr?.length) {
    lines.push('tldr:');
    for (const t of metaEntry.tldr) lines.push(`  - "${String(t).replace(/"/g, '”')}"`);
  }
  lines.push('maturity: budding', '---', '');
  return lines.join('\n');
}

/** 从既有英文正文的 front matter 里读出可直接沿用的标题/描述/tldr。 */
function legacyMeta(month) {
  const file = join(ROOT, `content/en/growth/posts/${month}-thought-notes.md`);
  if (!existsSync(file)) return null;
  const fm = (readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '';
  const title = (fm.match(/^title:\s*['"]?(.*?)['"]?\s*$/m) ?? [])[1];
  const descBlock = fm.match(/^description:\s*>\n([\s\S]*?)\n(?=[a-z_]+:|$)/m);
  const description = (descBlock?.[1] ?? fm.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, ' ')
    .trim();
  const tldr = [];
  const tldrBlock = fm.match(/^tldr:\n((?:\s*-\s*.*\n?)+)/m);
  if (tldrBlock) {
    for (const line of tldrBlock[1].split('\n')) {
      const item = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
      if (item) tldr.push(item);
    }
  }
  if (!title || !description) return null;
  return { title, description, tldr };
}

/** 旧英文版里人工挑的封面与「Selected Notes」段，重排时保留下来。 */
function readLegacy(text) {
  const fm = (text.match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '';
  const cover = (fm.match(/^cover:\n((?:[ \t]+.*\n?)+)/m) ?? [])[0]?.trimEnd() ?? '';
  const lines = text.replace(/^---\n[\s\S]*?\n---\n?/, '').split('\n');
  const kept = [];
  for (const [i, line] of lines.entries()) {
    if (!/^##\s*Selected Notes of the Month/.test(line)) continue;
    let end = i + 1;
    while (end < lines.length && !/^##\s/.test(lines[end])) end += 1;
    kept.push(lines.slice(i, end).join('\n').trimEnd());
  }
  return { cover, kept };
}

// ---------------------------------------------------------------- 校验

const CJK_LIMIT = 1500;
const problems = [];
const results = [];

const months = (onlyMonths ?? Object.keys(plan)).filter((m) => plan[m].enMode && plan[m].enMode !== 'none');

for (const month of months) {
  const info = plan[month];
  // 以线上正文实际的条目为准（追加型月份的正文才是最终状态），keys.json 只做兜底
  let structure = { sections: [], appendix: false };
  try {
    structure = readStructure(month);
  } catch {
    structure = { sections: [], appendix: false };
  }
  const expected = structure.sections.length
    ? structure.sections.flatMap((s) => s.keys)
    : (keysIndex[month] ?? []);
  const { cards, files } = readTranslations(month);
  const missing = expected.filter((k) => !cards.has(k));
  const empty = expected.filter((k) => cards.has(k) && !cards.get(k).body.trim() && !cards.get(k).title.trim());
  // 残留中文：正文里还有多少 CJK 字符（引号/书名/人名允许少量）
  let cjk = 0;
  let cjkLines = [];
  for (const k of expected) {
    const card = cards.get(k);
    if (!card) continue;
    const hits = (card.body.match(/[\u4e00-\u9fa5]/g) ?? []).length;
    cjk += hits;
    if (hits > 12) cjkLines.push(`${k}:${hits}`);
  }
  let quoteBroken = [];
  for (const k of expected) {
    const card = cards.get(k);
    if (card && !/^>\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(card.quote)) quoteBroken.push(k);
  }

  results.push({ month, expected: expected.length, translated: cards.size, files: files.length, missing, empty, cjk, cjkLines, quoteBroken });

  if (missing.length) problems.push(`${month}: ${missing.length} memos not translated yet (e.g. ${missing.slice(0, 3).join(', ')})`);
  // 英文版必须真的是英文。历史上这里踩过坑：旧「英文」文件其实整段是中文，
  // 只有精选部分翻译过。所以残留中文超过阈值就直接判阻塞。
  if (cjk > CJK_LIMIT) {
    problems.push(`${month}: English body still contains ${cjk} Chinese characters (limit ${CJK_LIMIT}) — it is not translated`);
  }
  if (quoteBroken.length) problems.push(`${month}: ${quoteBroken.length} entries lost the timestamp line`);

  if (CHECK_ONLY || missing.length) continue;

  // 用「正文尾部是否有补录段」来判断追加型，而不是用 plan.json 的 action：
  // 覆盖率达到 100% 的月份会被记成 skip，但它们的补录段仍然需要单独翻译。
  if (structure.appendix) {
    const headingZh = info.heading ?? '## 补录：本月其他记录';
    const headingEn = HEADING_EN[headingZh] ?? `## ${headingZh}`;
    const body = buildEnBody(month, cards);
    const intro = `*The ${expected.length} entries below are the raw notes from this month, filed by theme.*`;
    const tail = `\n\n---\n\n${headingEn}\n\n${intro}\n\n${body}\n`;
    const target = join(ROOT, 'content/en/growth/posts', `${month}-thought-notes.md`);
    if (existsSync(target)) {
      const existing = stripGeneratedTail(readFileSync(target, 'utf8')).trimEnd();
      if (WRITE) writeFileSync(target, existing + tail);
      results.at(-1).wrote = `${target} (append)`;
    } else {
      // 英文版还不存在（例：2026-07），需要整篇：front matter + 长文 + 附录
      const metaEntry = meta[month];
      if (!metaEntry) {
        problems.push(`${month}: English article is missing and there is no en front matter in scripts/flomo/en-meta.json`);
        continue;
      }
      const essayFile = join(ROOT, '.flomo/out/en', month, 'essay.en.md');
      const essay = existsSync(essayFile)
        ? readFileSync(essayFile, 'utf8').replace(/<!--memo:[0-9a-f]+-->/g, '').trim()
        : '';
      if (!essay) {
        problems.push(`${month}: English article does not exist and essay.en.md was not translated`);
        continue;
      }
      const zh = zhFront(month);
      const article = `${renderEnFrontMatter(month, metaEntry, zh)}\n${essay}\n${tail}`;
      if (WRITE) {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, article);
      }
      results.at(-1).wrote = `${target} (new)`;
    }
    continue;
  }

  const zh = zhFront(month);
  // 没有专门写过的英文 front matter 时，沿用既有英文版已有的 title/description/tldr
  const metaEntry = meta[month] ?? legacyMeta(month);
  if (!metaEntry) {
    problems.push(`${month}: no en front matter (neither scripts/flomo/en-meta.json nor an existing English article)`);
    continue;
  }
  const entries = expected.length;
  const counts = readStructure(month)
    .sections.map((s) => `${enSectionName(s.heading)} ${s.keys.length}`)
    .join(' · ');
  const first = cards.get(expected[0])?.quote.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  const last = cards.get(expected[expected.length - 1])?.quote.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  const [y, mm] = month.split('-');
  const intro = [
    `# ${y} ${monthName(Number(mm))} Thought Notes`,
    '',
    `> **${entries} notes this month** | recorded from ${first} to ${last}`,
    '>',
    `> **Themes**: ${counts}`,
    '>',
    '> Everything from the month is kept here, filed by theme, each entry carrying its original timestamp.',
    '',
  ].join('\n');
  const target = join(ROOT, 'content/en/growth/posts', `${month}-thought-notes.md`);
  const legacy = existsSync(target) ? readLegacy(readFileSync(target, 'utf8')) : { cover: '', kept: [] };

  // 英文导航：结构照抄中文，标题换成英文主题名
  const sections = readStructure(month).sections;
  const navCounts = sections.map((sec, i) => ({
    name: enSectionName(sec.heading),
    heading: `${i + 1}. ${enSectionName(sec.heading)}`,
    count: sec.keys.length,
  }));
  const navExtras = legacy.kept.map((block) => ({
    label: block.split('\n')[0].replace(/^##\s*/, '').trim(),
    heading: block.split('\n')[0].replace(/^##\s*/, '').trim(),
    count: (block.match(/^###\s/gm) ?? []).length,
  }));
  const nav = renderEnNav({ counts: navCounts, total: entries, extras: navExtras });

  const body = buildEnBody(month, cards);
  const kept = legacy.kept.join('\n\n');
  const article =
    renderEnFrontMatter(month, metaEntry, zh, legacy.cover) +
    `\n${intro}\n${nav}` +
    (kept ? `${kept}\n\n` : '') +
    `${body}\n`;
  const outPath = join(OUT, `${month}.md`);
  mkdirSync(OUT, { recursive: true });
  if (WRITE) writeFileSync(target, article);
  writeFileSync(outPath, article);
  results.at(-1).wrote = WRITE
    ? `content/en/growth/posts/${month}-thought-notes.md`
    : outPath.replace(`${ROOT}/`, '');
}

function stripGeneratedTail(text) {
  const cut = text.search(/\n---\n\n## (?:Appendix|Addendum):/);
  return cut >= 0 ? text.slice(0, cut) : text;
}

console.log('month     expected  translated  files  status');
for (const r of results) {
  const status = r.missing.length
    ? `MISSING ${r.missing.length}`
    : `${r.wrote ?? 'ok'}${r.cjk ? `  cjk=${r.cjk}` : ''}`;
  console.log(
    `${r.month}  ${String(r.expected).padStart(8)}  ${String(r.translated).padStart(10)}  ${String(r.files).padStart(5)}  ${status}`,
  );
}
if (problems.length) {
  console.error('\nblocking problems:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nall months assembled');
}
