#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ARTICLE_ROOTS = [
  'ai-agent/posts',
  'engineering/posts',
  'growth/posts',
  'projects',
];

function walkMarkdown(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdown(absolute);
    if (extname(entry.name) !== '.md' || entry.name === '_index.md') return [];
    return [absolute];
  });
}

function frontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match?.[1] ?? '';
}

function coverImage(fm) {
  const lines = fm.split(/\r?\n/);
  const coverIndex = lines.findIndex((line) => /^cover:\s*(?:#.*)?$/.test(line));
  if (coverIndex === -1) return null;

  for (let index = coverIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || /^\s+#/.test(line)) continue;
    if (!/^\s+/.test(line)) break;

    const match = line.match(/^\s+image:\s*['"]?([^'"]+?)['"]?\s*(?:#.*)?$/);
    if (match) return match[1].trim();
  }

  return null;
}

function pairingKey(file) {
  return file
    .replace(/^content\/(?:en|zh)\//, '')
    .replace(/\/index\.md$/, '.md');
}

function diskPathForCover(publicPath) {
  if (!publicPath?.startsWith('/')) return null;
  return join(ROOT, 'static', publicPath.slice(1));
}

const byLanguage = Object.fromEntries(
  ['en', 'zh'].map((language) => {
    const files = ARTICLE_ROOTS.flatMap((articleRoot) =>
      walkMarkdown(join(ROOT, 'content', language, articleRoot)),
    )
      .map((absolute) => relative(ROOT, absolute))
      .sort();
    return [language, files];
  }),
);

const pairMaps = Object.fromEntries(
  Object.entries(byLanguage).map(([language, files]) => [
    language,
    new Map(files.map((file) => [pairingKey(file), file])),
  ]),
);

const missingEnglish = [...pairMaps.zh]
  .filter(([key]) => !pairMaps.en.has(key))
  .map(([, file]) => file);
const missingChinese = [...pairMaps.en]
  .filter(([key]) => !pairMaps.zh.has(key))
  .map(([, file]) => file);

const missingCover = [];
const brokenCover = [];
const coverByFile = new Map();
for (const file of [...byLanguage.en, ...byLanguage.zh]) {
  const fm = frontMatter(readFileSync(join(ROOT, file), 'utf8'));
  const image = coverImage(fm);
  coverByFile.set(file, image);
  if (!image) {
    missingCover.push(file);
    continue;
  }

  const diskPath = diskPathForCover(image);
  if (!diskPath || !existsSync(diskPath)) {
    brokenCover.push({ article: file, image });
  }
}

const shareableCover = missingCover.flatMap((article) => {
  const language = article.startsWith('content/en/') ? 'en' : 'zh';
  const counterpartLanguage = language === 'en' ? 'zh' : 'en';
  const counterpart = pairMaps[counterpartLanguage].get(pairingKey(article));
  if (!counterpart) return [];

  const image = coverByFile.get(counterpart);
  const diskPath = diskPathForCover(image);
  if (!image || !diskPath || !existsSync(diskPath)) return [];
  return [{ article, counterpart, image }];
});
const generationNeededKeys = new Set(
  missingCover
    .filter((article) => !shareableCover.some((item) => item.article === article))
    .map(pairingKey),
);

const auditPath = join(ROOT, 'docs/article-quality-audit.md');
const audit = existsSync(auditPath) ? readFileSync(auditPath, 'utf8') : '';
const audited = new Set(
  [...audit.matchAll(/`(content\/(?:en|zh)\/[^`]+\.md)`/g)].map(
    (match) => match[1],
  ),
);
const formalFiles = new Set([...byLanguage.en, ...byLanguage.zh]);
const auditedFormal = [...audited].filter((file) => formalFiles.has(file));
const unaudited = [...formalFiles].filter((file) => !audited.has(file)).sort();

const report = {
  articles: {
    en: byLanguage.en.length,
    zh: byLanguage.zh.length,
    total: formalFiles.size,
  },
  bilingual: {
    missingEnglish,
    missingChinese,
  },
  covers: {
    missingCount: missingCover.length,
    missing: missingCover,
    shareableCount: shareableCover.length,
    shareable: shareableCover,
    generationNeededArticleCount: missingCover.length - shareableCover.length,
    generationNeededVisualCount: generationNeededKeys.size,
    brokenCount: brokenCover.length,
    broken: brokenCover,
  },
  scoring: {
    auditedCount: auditedFormal.length,
    unauditedCount: unaudited.length,
    unaudited,
  },
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Articles: ${report.articles.total} (${report.articles.en} en, ${report.articles.zh} zh)`);
  console.log(`Missing English counterparts: ${missingEnglish.length}`);
  console.log(`Missing Chinese counterparts: ${missingChinese.length}`);
  console.log(`Missing cover.image: ${missingCover.length}`);
  console.log(`Shareable from counterpart: ${shareableCover.length}`);
  console.log(`Articles needing new cover generation: ${missingCover.length - shareableCover.length}`);
  console.log(`Unique new visuals needed: ${generationNeededKeys.size}`);
  console.log(`Broken cover.image: ${brokenCover.length}`);
  console.log(`Audited: ${auditedFormal.length}`);
  console.log(`Unaudited: ${unaudited.length}`);
}
