#!/usr/bin/env node
// Chrome UX Report (CrUX) History snapshot.
//
// Pulls up to 25 weeks of real-user Core Web Vitals for the whole
// cubxxw.com origin, per form factor (phone + desktop), and writes them to
// data/seo/crux-YYYY-MM-DD.json. CrUX History is the same dataset that
// powers Google Search's Core Web Vitals report — this is the "real ranking
// signal", not the synthetic lab number LHCI/PSI reports.
//
// Quota: 150 QPM. We do 2 calls per run. Fine.
//
// If Google has no aggregate for our origin (small sites without enough
// samples), the API returns 404 — we log a warning and skip. Rank-and-file
// blogs typically hit the threshold once real traffic ramps up.
//
// Env:
//   GOOGLE_API_KEY — API key with CrUX API enabled
//   CRUX_ORIGIN    — override origin; defaults to https://cubxxw.com
//
// Usage:
//   node scripts/crux-fetch.mjs                # write today's snapshot
//   node scripts/crux-fetch.mjs --dry-run      # log summary, don't write
//   node scripts/crux-fetch.mjs --out path.json # override output path

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT_DIR = 'data/seo';
const ENDPOINT = 'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord';
const FORM_FACTORS = ['PHONE', 'DESKTOP'];
const METRICS = [
  'largest_contentful_paint',
  'interaction_to_next_paint',
  'cumulative_layout_shift',
  'first_contentful_paint',
  'experimental_time_to_first_byte',
  'round_trip_time',
  'navigation_types',
];

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : fallback;
};

const DRY_RUN = hasFlag('--dry-run');
const API_KEY = process.env.GOOGLE_API_KEY;
const ORIGIN = process.env.CRUX_ORIGIN || 'https://cubxxw.com';

if (!API_KEY) {
  console.error('Missing env: GOOGLE_API_KEY');
  process.exit(1);
}

const runDate = new Date().toISOString().slice(0, 10);
const OUT_PATH = flagValue('--out', `${OUT_DIR}/crux-${runDate}.json`);

async function queryFormFactor(formFactor) {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: ORIGIN,
      formFactor,
      metrics: METRICS,
    }),
  });
  if (res.status === 404) {
    // CrUX-not-eligible origin (too little traffic); not a script bug.
    return { formFactor, notEligible: true };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CrUX ${formFactor} → ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return { formFactor, record: json.record || null };
}

async function main() {
  const results = [];
  const warnings = [];
  for (const ff of FORM_FACTORS) {
    try {
      const row = await queryFormFactor(ff);
      if (row.notEligible) {
        warnings.push(`${ff}: origin not eligible (insufficient real-user samples)`);
        console.warn(`  ${ff.padEnd(7)} not eligible (no data)`);
      } else {
        console.log(`  ${ff.padEnd(7)} ok (metrics=${Object.keys(row.record?.metrics || {}).length})`);
      }
      results.push(row);
    } catch (err) {
      console.warn(`  ${ff.padEnd(7)} FAIL: ${err.message}`);
      results.push({ formFactor: ff, error: err.message });
    }
  }

  const snapshot = {
    meta: {
      fetchedAt: new Date().toISOString(),
      runDate,
      origin: ORIGIN,
      formFactors: FORM_FACTORS,
      metrics: METRICS,
      warnings,
    },
    results,
  };

  if (DRY_RUN) {
    console.log(`--dry-run: would write ${OUT_PATH}`);
    return;
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
