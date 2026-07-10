#!/usr/bin/env node
// PageSpeed Insights daily snapshot.
//
// Runs PSI v5 against the same 12 key URLs Lighthouse CI checks, once per
// strategy (mobile + desktop), and writes a slim JSON to
// data/seo/psi-YYYY-MM-DD.json. The point isn't to duplicate LHCI — LHCI
// tells us how the artifact renders on a synthetic runner; PSI's field data
// (loadingExperience) is real-user CrUX from actual visitors, which is what
// Google Search actually ranks on.
//
// PSI free quota is 25,000 requests/day. 12 URLs × 2 strategies = 24
// requests/day — trivial.
//
// URLs come from lighthouserc.json so we have one source of truth.
//
// Env:
//   GOOGLE_API_KEY  — API key with PSI API enabled (optional but avoids throttling)
//
// Usage:
//   node scripts/psi-fetch.mjs                # write today's snapshot
//   node scripts/psi-fetch.mjs --dry-run      # log summary, don't write
//   node scripts/psi-fetch.mjs --out path.json # override output path

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT_DIR = 'data/seo';
const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const STRATEGIES = ['mobile', 'desktop'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const RATE_LIMIT_MS = 400;

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : fallback;
};

const DRY_RUN = hasFlag('--dry-run');
const API_KEY = process.env.GOOGLE_API_KEY || '';

const runDate = new Date().toISOString().slice(0, 10);
const OUT_PATH = flagValue('--out', `${OUT_DIR}/psi-${runDate}.json`);

const URLS = JSON.parse(readFileSync('lighthouserc.json', 'utf8')).ci.collect.url;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUrl(url, strategy) {
  const params = new URLSearchParams();
  params.set('url', url);
  params.set('strategy', strategy);
  for (const c of CATEGORIES) params.append('category', c);
  if (API_KEY) params.set('key', API_KEY);
  return `${ENDPOINT}?${params.toString()}`;
}

function pickMetric(audits, id) {
  const a = audits?.[id];
  if (!a) return null;
  return {
    displayValue: a.displayValue ?? null,
    numericValue: typeof a.numericValue === 'number' ? Math.round(a.numericValue) : null,
    score: typeof a.score === 'number' ? a.score : null,
  };
}

function pickFieldData(le) {
  if (!le || !le.metrics) return null;
  const out = {};
  for (const [k, v] of Object.entries(le.metrics)) {
    out[k] = {
      percentile: v.percentile ?? null,
      category: v.category ?? null,
    };
  }
  return {
    overall_category: le.overall_category ?? null,
    metrics: out,
  };
}

// Pull the actual LCP element (selector + short snippet) out of the
// `largest-contentful-paint-element` audit. Without this, all we get is a
// number like "16.4 s" with no idea which element is late. Structure varies
// slightly between Lighthouse versions — we defensively walk both shapes.
function pickLcpElement(audits) {
  const a = audits?.['largest-contentful-paint-element'];
  if (!a) return null;
  const items = a.details?.items || [];
  // v11: [{ items: [ { node: { selector, nodeLabel, snippet } } ] }, { phases }]
  // fall back: direct { node: {...} } items on the top level.
  let node = null;
  for (const it of items) {
    if (it?.node?.selector) { node = it.node; break; }
    if (Array.isArray(it?.items)) {
      const sub = it.items.find((x) => x?.node?.selector);
      if (sub) { node = sub.node; break; }
    }
  }
  if (!node) return null;
  return {
    selector: node.selector || null,
    nodeLabel: node.nodeLabel || null,
    snippet: typeof node.snippet === 'string' ? node.snippet.slice(0, 240) : null,
  };
}

// Top opportunities by wasted-ms. Lighthouse groups these under
// `opportunity` details type. We rank by numericValue (ms) so the
// biggest LCP/FCP wins bubble up first.
function pickOpportunities(audits, limit = 3) {
  const ids = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'unminified-css',
    'unminified-javascript',
    'uses-text-compression',
    'uses-optimized-images',
    'uses-responsive-images',
    'offscreen-images',
    'modern-image-formats',
    'efficient-animated-content',
    'total-byte-weight',
    'server-response-time',
    'redirects',
  ];
  const out = [];
  for (const id of ids) {
    const a = audits?.[id];
    if (!a) continue;
    const wasted = typeof a.numericValue === 'number' ? Math.round(a.numericValue) : null;
    if (!wasted || wasted <= 0) continue;
    if (typeof a.score === 'number' && a.score >= 0.9) continue;
    out.push({
      id,
      title: a.title || null,
      wastedMs: wasted,
      displayValue: a.displayValue || null,
    });
  }
  return out.sort((x, y) => y.wastedMs - x.wastedMs).slice(0, limit);
}

async function runOne(url, strategy) {
  const endpoint = buildUrl(url, strategy);
  const res = await fetch(endpoint);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PSI ${strategy} ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const lhr = json.lighthouseResult || {};
  const cats = lhr.categories || {};
  const audits = lhr.audits || {};
  return {
    url,
    strategy,
    finalUrl: lhr.finalDisplayedUrl || lhr.finalUrl || url,
    fetchTime: lhr.fetchTime || null,
    categories: {
      performance:      cats.performance?.score ?? null,
      accessibility:    cats.accessibility?.score ?? null,
      'best-practices': cats['best-practices']?.score ?? null,
      seo:              cats.seo?.score ?? null,
    },
    metrics: {
      LCP: pickMetric(audits, 'largest-contentful-paint'),
      FCP: pickMetric(audits, 'first-contentful-paint'),
      CLS: pickMetric(audits, 'cumulative-layout-shift'),
      TBT: pickMetric(audits, 'total-blocking-time'),
      SI:  pickMetric(audits, 'speed-index'),
      TTI: pickMetric(audits, 'interactive'),
    },
    // loadingExperience = real-user CrUX data; the whole reason to hit PSI
    // instead of just running Lighthouse in CI.
    fieldData: pickFieldData(json.loadingExperience),
    originFieldData: pickFieldData(json.originLoadingExperience),
    // Which element is the LCP + which audits leak the most wasted-ms.
    // Cheap to store, saves a manual round of guessing when a page regresses.
    diagnostics: {
      lcpElement: pickLcpElement(audits),
      opportunities: pickOpportunities(audits),
    },
  };
}

async function main() {
  const results = [];
  const failures = [];
  for (const url of URLS) {
    for (const strategy of STRATEGIES) {
      try {
        const row = await runOne(url, strategy);
        const perf = row.categories.performance;
        console.log(`  ${strategy.padEnd(7)} ${perf == null ? '  —' : Math.round(perf * 100).toString().padStart(3)}  ${url}`);
        results.push(row);
      } catch (err) {
        console.warn(`  ${strategy.padEnd(7)} FAIL ${url}: ${err.message}`);
        failures.push({ url, strategy, error: err.message });
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  const snapshot = {
    meta: {
      fetchedAt: new Date().toISOString(),
      runDate,
      strategies: STRATEGIES,
      categories: CATEGORIES,
      urls: URLS.length,
      failures: failures.length,
    },
    failures,
    results,
  };

  if (DRY_RUN) {
    console.log(`--dry-run: would write ${OUT_PATH} (${results.length} results, ${failures.length} failures)`);
    return;
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Wrote ${OUT_PATH} (${results.length} results, ${failures.length} failures)`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
