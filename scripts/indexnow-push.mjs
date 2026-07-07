#!/usr/bin/env node
// IndexNow push — https://www.indexnow.org/ (shared by Bing + Yandex + others).
//
// One POST to api.indexnow.org notifies every participating engine, so this
// supersedes the older bing.com/ping used in sitemap-ping.yml (Bing deprecated
// that endpoint in 2023). Yandex also picks these up automatically.
//
// Reads the live sitemap by default (source of truth), extracts <loc> + <lastmod>,
// filters by --recent N (days), and POSTs a JSON payload per the spec:
//   { host, key, keyLocation, urlList: [...] }
//
// Key & keyLocation are read from env (INDEXNOW_KEY, INDEXNOW_KEY_LOCATION) so
// nothing sensitive lives in git. The key .txt file itself is at static/<key>.txt
// with a matching _redirects rule to bypass Netlify Pretty URLs.
//
// Usage:
//   INDEXNOW_KEY=xxx node scripts/indexnow-push.mjs                       # recent 7 days
//   INDEXNOW_KEY=xxx node scripts/indexnow-push.mjs --recent 30
//   INDEXNOW_KEY=xxx node scripts/indexnow-push.mjs --all
//   INDEXNOW_KEY=xxx node scripts/indexnow-push.mjs --file urls.txt
//   INDEXNOW_KEY=xxx node scripts/indexnow-push.mjs --changed <base>..<head>   # git diff
//   INDEXNOW_KEY=xxx node scripts/indexnow-push.mjs --dry-run
//
// The --changed mode inspects `git diff --name-only <range>` for
// content/**/*.md paths and derives the exact URLs that were added/modified.
// Falls back gracefully to no-op if the diff has no content changes.
//
// Response codes (per spec):
//   200 = accepted   202 = accepted (async validation)
//   400 = bad request   403 = key file missing or wrong content
//   422 = URL not on host / key mismatch   429 = rate-limited

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { contentPathsToUrls } from './lib/content-to-url.mjs';

const SITE = 'https://cubxxw.com';
const HOST = 'cubxxw.com';
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
// Per-language sitemaps hold every published URL and use our custom
// template (canonical trailing-slash + hreflang). Reading them directly
// skips the sitemapindex round-trip on the root /sitemap.xml.
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
const CHANGED = val('--changed', null); // e.g. "HEAD~1..HEAD" or "abc..def"
const KEY = process.env.INDEXNOW_KEY;
const KEY_LOCATION = process.env.INDEXNOW_KEY_LOCATION || (KEY && `${SITE}/${KEY}.txt`);

if (!KEY && !DRY_RUN) {
  console.error('❌ INDEXNOW_KEY env var is required. See https://www.indexnow.org/');
  process.exit(1);
}

// Filter URLs unlikely to help ranking (waste requests, may trigger 422).
const SKIP_PATTERNS = [
  /\/404\/?$/,
  /\/baidu_verify_/,
  /\/google[0-9a-f]+\.html$/,
  /\.txt$/, // the key file itself
];

function shouldSkip(url) {
  return SKIP_PATTERNS.some((re) => re.test(url));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'blog-indexnow-push/1.0' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

function extractUrls(xml) {
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

// Only "added" (A) and "modified" (M) files — skip deletions/renames-from.
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
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls.map((u) => u.loc),
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 400) };
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
    console.log(`🚫 skipped ${beforeSkip - urls.length} URL(s) matching 404/verify/txt patterns`);
  }

  // --recent applies to sitemap mode only; --changed/--file already yield an explicit list
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

  const BATCH = parseInt(val('--batch', '1000'), 10);
  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH) batches.push(urls.slice(i, i + BATCH));

  if (DRY_RUN) {
    console.log(`\n🧪 dry-run — would POST ${urls.length} URLs in ${batches.length} batch(es) to ${ENDPOINT}:`);
    console.log(`   host: ${HOST}`);
    console.log(`   keyLocation: ${KEY_LOCATION ?? '(unset; set INDEXNOW_KEY)'}`);
    urls.slice(0, 10).forEach((u) => console.log(`   • ${u.loc}`));
    if (urls.length > 10) console.log(`   … +${urls.length - 10} more`);
    return;
  }

  let accepted = 0;
  for (const [i, batch] of batches.entries()) {
    process.stdout.write(`📤 batch ${i + 1}/${batches.length} (${batch.length} URLs) … `);
    const { status, body } = await pushBatch(batch);
    if (status === 200 || status === 202) {
      console.log(`${status} ✅`);
      accepted += batch.length;
    } else if (status === 429) {
      console.log(`429 rate-limited — stopping.`);
      break;
    } else {
      console.log(`${status} ⚠️  ${body}`);
      if (status === 403 || status === 422) break;
    }
  }
  console.log(`\n✅ IndexNow accepted ${accepted}/${urls.length} URLs (Bing + Yandex notified)`);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
