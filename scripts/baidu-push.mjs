#!/usr/bin/env node
// Baidu Search Resource push — feed URLs to data.zz.baidu.com/urls to speed up
// crawler discovery. Baidu is the only major CN search engine that does not
// crawl gh-based sitemaps quickly, so this API push is meaningful for CN reach.
//
// Reads the live sitemap by default (source of truth), extracts <loc> + <lastmod>,
// filters by --recent N (days) to save the daily push quota, and POSTs newline-
// separated URLs to Baidu. Token is read from env BAIDU_PUSH_TOKEN, never
// hardcoded.
//
// Usage:
//   BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.mjs                       # recent 7 days
//   BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.mjs --recent 30
//   BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.mjs --all
//   BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.mjs --file urls.txt
//   BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.mjs --changed <base>..<head>   # git diff
//   BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.mjs --dry-run

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { contentPathsToUrls } from './lib/content-to-url.mjs';

const SITE = 'https://cubxxw.com';
const ENDPOINT = `http://data.zz.baidu.com/urls?site=${SITE}&token=`;
// Skip root /sitemap.xml — see indexnow-push.mjs for rationale.
const SITEMAP_URLS = [
  `${SITE}/en/sitemap.xml`,
  `${SITE}/zh/sitemap.xml`,
];

const args = process.argv.slice(2);
const flag = (name) => args.indexOf(name);
const val = (name, fallback) => {
  const i = flag(name);
  return i !== -1 ? args[i + 1] : fallback;
};

const DRY_RUN = flag('--dry-run') !== -1;
const ALL = flag('--all') !== -1;
const RECENT_DAYS = ALL ? Infinity : parseInt(val('--recent', '7'), 10);
const FILE = val('--file', null);
const CHANGED = val('--changed', null);
const TOKEN = process.env.BAIDU_PUSH_TOKEN;

if (!TOKEN && !DRY_RUN) {
  console.error('❌ BAIDU_PUSH_TOKEN env var is required. See https://ziyuan.baidu.com/linksubmit/');
  process.exit(1);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'blog-baidu-push/1.0' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

function extractUrls(xml) {
  // Naive but sufficient for well-formed Hugo sitemaps.
  const urls = [];
  const re = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    urls.push({ loc: m[1].trim(), lastmod: new Date(m[2].trim()) });
  }
  return urls;
}

function extractSitemapIndex(xml) {
  const locs = [];
  const re = /<sitemap>\s*<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

// Baidu quota-savers: filter URLs unlikely to help ranking.
const SKIP_PATTERNS = [
  /\/404\/?$/,           // 404 page
  /\/baidu_verify_/,     // Baidu site-verification file
  /\/google[0-9a-f]+\.html$/, // Google site-verification file
];

function shouldSkip(url) {
  return SKIP_PATTERNS.some((re) => re.test(url));
}

async function loadUrlsFromSitemaps() {
  const seen = new Map();
  for (const smUrl of SITEMAP_URLS) {
    let xml;
    try {
      xml = await fetchText(smUrl);
    } catch (e) {
      console.warn(`⚠️  skip ${smUrl}: ${e.message}`);
      continue;
    }
    if (xml.includes('<sitemapindex')) {
      for (const child of extractSitemapIndex(xml)) {
        try {
          const childXml = await fetchText(child);
          for (const u of extractUrls(childXml)) {
            const prev = seen.get(u.loc);
            if (!prev || u.lastmod > prev) seen.set(u.loc, u.lastmod);
          }
        } catch (e) {
          console.warn(`⚠️  skip ${child}: ${e.message}`);
        }
      }
    } else {
      for (const u of extractUrls(xml)) {
        const prev = seen.get(u.loc);
        if (!prev || u.lastmod > prev) seen.set(u.loc, u.lastmod);
      }
    }
  }
  return [...seen.entries()].map(([loc, lastmod]) => ({ loc, lastmod }));
}

function loadUrlsFromFile(path) {
  const now = new Date();
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
    .map((loc) => ({ loc, lastmod: now }));
}

function loadUrlsFromGitDiff(range) {
  const raw = execSync(`git diff --name-only --diff-filter=AM ${range} -- 'content/**/*.md'`, {
    encoding: 'utf8',
  });
  const paths = raw.split('\n').map((s) => s.trim()).filter(Boolean);
  const urls = contentPathsToUrls(paths);
  const now = new Date();
  return urls.map((loc) => ({ loc, lastmod: now }));
}

async function pushBatch(urls) {
  const body = urls.map((u) => u.loc).join('\n');
  const res = await fetch(ENDPOINT + TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Baidu returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.error) {
    throw new Error(`Baidu error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  let urls;
  if (CHANGED) {
    urls = loadUrlsFromGitDiff(CHANGED);
    console.log(`🔀 git diff ${CHANGED} yielded ${urls.length} content URL(s)`);
  } else if (FILE) {
    urls = loadUrlsFromFile(FILE);
    console.log(`📄 loaded ${urls.length} URLs from ${FILE}`);
  } else {
    urls = await loadUrlsFromSitemaps();
    console.log(`🗺  sitemap yielded ${urls.length} unique URLs`);
  }

  const beforeSkip = urls.length;
  urls = urls.filter((u) => !shouldSkip(u.loc));
  if (urls.length !== beforeSkip) {
    console.log(`🚫 skipped ${beforeSkip - urls.length} URL(s) matching 404/verify patterns`);
  }

  if (Number.isFinite(RECENT_DAYS) && !CHANGED && !FILE) {
    const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
    const before = urls.length;
    urls = urls.filter((u) => u.lastmod.getTime() >= cutoff);
    console.log(`⏱  --recent ${RECENT_DAYS}d filtered ${before} → ${urls.length}`);
  }

  if (urls.length === 0) {
    console.log('✅ nothing to push, done.');
    return;
  }

  // Baidu recommends ≤2000 URLs per request, but daily quota for a young site
  // can be as low as ~100. Small batches let us stop cleanly on 'over quota'
  // and know exactly how many landed today.
  const BATCH = parseInt(val('--batch', '100'), 10);
  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH) batches.push(urls.slice(i, i + BATCH));

  if (DRY_RUN) {
    console.log(`\n🧪 dry-run — would push ${urls.length} URLs in ${batches.length} batch(es):`);
    urls.slice(0, 10).forEach((u) => console.log(`  ${u.loc}`));
    if (urls.length > 10) console.log(`  … +${urls.length - 10} more`);
    return;
  }

  let totalSuccess = 0;
  let remain = null;
  const invalid = [];
  const foreign = [];

  for (const [i, batch] of batches.entries()) {
    process.stdout.write(`📤 batch ${i + 1}/${batches.length} (${batch.length} URLs) … `);
    let result;
    try {
      result = await pushBatch(batch);
    } catch (e) {
      // Quota exhaustion is the expected stop condition — report progress and exit clean.
      if (String(e.message).includes('over quota')) {
        console.log('over quota — stopping.');
        console.log(`\n📊 pushed ${totalSuccess} URLs before quota ran out; ${urls.length - totalSuccess} URL(s) not yet pushed.`);
        console.log('   Tip: run again tomorrow with --recent 7 to push the rest incrementally.');
        return;
      }
      throw e;
    }
    console.log(`success=${result.success} remain=${result.remain}`);
    totalSuccess += result.success ?? 0;
    remain = result.remain ?? remain;
    if (result.not_valid?.length) invalid.push(...result.not_valid);
    if (result.not_same_site?.length) foreign.push(...result.not_same_site);
    if (remain === 0) {
      console.log('🚦 remaining quota is 0 — stopping.');
      break;
    }
  }

  console.log(`\n✅ pushed ${totalSuccess} URLs, ${remain} left in today's quota`);
  if (invalid.length) console.log(`⚠️  ${invalid.length} invalid: ${invalid.slice(0, 3).join(', ')}…`);
  if (foreign.length) console.log(`⚠️  ${foreign.length} not-same-site: ${foreign.slice(0, 3).join(', ')}…`);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
