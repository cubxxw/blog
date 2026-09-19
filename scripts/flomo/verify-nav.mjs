#!/usr/bin/env node
/**
 * 校验月度笔记开头的「大类导航」链接都点得动。
 *
 * 生成器算锚点时是照着 Goldmark 的规则手写了一份实现，规则一旦对不上，
 * 读者点目录就会原地不动。所以这里在构建产物上做一次真实验证：
 * 把每一页导航里的 `#锚点` 抓出来，逐个对照页面里真实存在的 `id=`。
 *
 * 用法：
 *   hugo --gc --minify --baseURL http://localhost/   # 先构建
 *   node scripts/flomo/verify-nav.mjs [--dir public]
 */
import { readFileSync, existsSync, globSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const dirFlag = process.argv.indexOf('--dir');
const dir = resolve(ROOT, dirFlag >= 0 ? process.argv[dirFlag + 1] : 'public');

if (!existsSync(dir)) {
  console.error(`build output not found: ${dir} (run hugo first)`);
  process.exit(1);
}

// 标题里还嵌着 PaperMod 的锚点链接：`<h2 id=x>标题<a class=anchor href=#x>#</a></h2>`
const NAV_HEADING = /<h2 id=[^>]*>(?:本月导航|Quick Navigation)(?:<a [^>]*>[^<]*<\/a>)?<\/h2>/;
const files = globSync('{zh/,}growth/posts/*-thought-notes/index.html', { cwd: dir });

let checked = 0;
let broken = 0;
const report = [];

for (const rel of files) {
  const html = readFileSync(join(dir, rel), 'utf8');
  if (!NAV_HEADING.test(html)) {
    report.push(`${rel}: nav block missing`);
    broken += 1;
    continue;
  }
  // 导航块 = 从导航标题到它后面第一条分隔线/章节标题之前
  const navStart = html.search(NAV_HEADING);
  const navEnd = html.indexOf('</ul>', navStart);
  const nav = html.slice(navStart, navEnd > 0 ? navEnd : navStart + 4000);
  const ids = new Set([...html.matchAll(/\sid=([^\s>]+)/g)].map((m) => m[1].replace(/^"|"$/g, '')));
  const links = [...nav.matchAll(/href=#([^\s>]+)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  const missing = links.filter((l) => !ids.has(decodeURIComponent(l)));
  checked += 1;
  if (missing.length) {
    broken += 1;
    report.push(`${rel}: ${missing.length} dead nav link(s): ${missing.slice(0, 3).join(', ')}`);
  }
}

console.log(`checked ${checked} page(s) in ${dir.replace(`${ROOT}/`, '')}`);
if (report.length) {
  console.error('\nproblems:');
  for (const line of report) console.error(`  - ${line}`);
  process.exitCode = 1;
} else {
  console.log('every nav link resolves to a heading on the same page');
}
