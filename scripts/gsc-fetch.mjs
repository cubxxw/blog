#!/usr/bin/env node
// Google Search Console daily snapshot.
//
// Pulls Search Analytics rows for the last three days and writes them to
// data/seo/gsc-YYYY-MM-DD.json (YYYY-MM-DD = the UTC date the workflow ran).
// The file contains four dimension slices — [date,query], [date,page],
// [query,device], [query,country] — plus a `meta` block so we can diff
// snapshots later without guessing what was pulled.
//
// GSC data has a 2–3 day publishing lag. We ask for [today-5, today-3] to
// stay clear of that window; if the range is still empty (fresh property,
// no traffic yet) we log a warning and write empty arrays instead of failing.
//
// Auth is a service-account JWT signed with node's built-in crypto — no
// googleapis SDK, matching the style of the other scripts in this repo.
//
// Env:
//   GSC_SERVICE_ACCOUNT_JSON — the full service-account JSON blob
//   GSC_SITE_URL             — override property; defaults to sc-domain:cubxxw.com
//
// Usage:
//   node scripts/gsc-fetch.mjs                # 3-day window ending today-3d
//   node scripts/gsc-fetch.mjs --lookback 28  # 28-day window for backfill
//   node scripts/gsc-fetch.mjs --dry-run      # log summary, don't write
//   node scripts/gsc-fetch.mjs --out path.json # override output path
//
// Setup checklist:
//   1. Enable Search Console API in Google Cloud
//   2. Create a service account, download the JSON key
//   3. In Search Console → Settings → Users and permissions, add the service
//      account email as a Restricted user on the property

import { createSign } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_SITE = 'sc-domain:cubxxw.com';
const OUT_DIR = 'data/seo';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : fallback;
};

const DRY_RUN = hasFlag('--dry-run');
const SITE_URL = process.env.GSC_SITE_URL || DEFAULT_SITE;
// Default 2 → produces the same [today-5, today-3] 3-day window as before
// (window length = lookback + 1). Bump via --lookback for one-off backfills.
const LOOKBACK = Number.parseInt(flagValue('--lookback', '2'), 10);
if (!Number.isFinite(LOOKBACK) || LOOKBACK < 0) {
  console.error(`Invalid --lookback value; expected non-negative integer.`);
  process.exit(1);
}

const runDate = new Date().toISOString().slice(0, 10);
const OUT_PATH = flagValue('--out', `${OUT_DIR}/gsc-${runDate}.json`);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

// GSC lags 2–3 days. End 3 days ago is stable ("final") data; start is
// `lookback` days earlier than end. So --lookback 2 → 3-day window,
// --lookback 27 → 28-day backfill, etc.
function windowUTC() {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const end = new Date(now - 3 * dayMs).toISOString().slice(0, 10);
  const start = new Date(now - (3 + LOOKBACK) * dayMs).toISOString().slice(0, 10);
  return { start, end };
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const sig = signer.sign(sa.private_key);
  const jwt = `${unsigned}.${base64url(sig)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

async function querySearchAnalytics(token, body) {
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    const text = await res.text();
    throw new Error(
      `403 from Search Console. Did you add the service account email as a user on ${SITE_URL}? Raw: ${text}`,
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC query failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.rows || [];
}

async function main() {
  const sa = JSON.parse(requireEnv('GSC_SERVICE_ACCOUNT_JSON'));
  const token = await getAccessToken(sa);
  const { start, end } = windowUTC();

  const slices = [
    { name: 'date_query',   dimensions: ['date', 'query'] },
    { name: 'date_page',    dimensions: ['date', 'page'] },
    { name: 'query_device', dimensions: ['query', 'device'] },
    { name: 'query_country',dimensions: ['query', 'country'] },
  ];

  const results = {};
  for (const s of slices) {
    const rows = await querySearchAnalytics(token, {
      startDate: start,
      endDate: end,
      dimensions: s.dimensions,
      rowLimit: 5000,
      dataState: 'final',
    });
    results[s.name] = rows;
    console.log(`  ${s.name.padEnd(14)} ${rows.length} rows`);
  }

  const total = Object.values(results).reduce((n, r) => n + r.length, 0);
  if (total === 0) {
    console.warn(`No rows returned for ${SITE_URL} between ${start} and ${end}. Fresh property or no traffic yet.`);
  }

  const snapshot = {
    meta: {
      siteUrl: SITE_URL,
      window: { start, end },
      fetchedAt: new Date().toISOString(),
      runDate,
    },
    ...results,
  };

  if (DRY_RUN) {
    console.log(`--dry-run: would write ${OUT_PATH} (${total} rows total)`);
    return;
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Wrote ${OUT_PATH} (${total} rows total)`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
