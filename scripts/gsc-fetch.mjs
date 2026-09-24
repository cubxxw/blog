#!/usr/bin/env node
// Google Search Console snapshot collector (schema gsc-snapshot/2).
//
// Collects Search Analytics data one calendar date at a time with pagination
// (rowLimit up to 25,000 + startRow) and writes versioned, append-only,
// atomically-written snapshots. Required slices:
//
//   date_totals           ['date']                  property/date totals (byProperty)
//   blog_date_totals      ['date']                  host-filtered, byPage semantics —
//                                                   NOT property totals
//   date_page             ['date','page']           domain page rows (keeps other hosts)
//   blog_date_query_page  ['date','query','page']   host-filtered query×page evidence
//
// Optional page-based cuts (never a device×country join, never inferred query
// landing pages): blog_date_page_device, blog_date_page_country.
//
// Every slice/day records request scope, pagination evidence, observed
// response aggregation and an explicit status: complete | empty | partial |
// failed | truncated. Empty is an observed successful empty response, not
// proof of zero traffic. A bounded recent-date availability probe (past 10
// days) records the observed availability cutoff independently of transport
// success. Required slice/day failures still persist a status artifact and
// exit non-zero.
//
// Search dates are inclusive calendar dates in the data timezone
// (America/Los_Angeles), never UTC traffic dates. --lookback is an inclusive
// offset: --lookback 27 -> 28 days, --lookback 55 -> 56 days. GSC lags ~2-3
// days, so the default window ends 3 days before "today".
//
// Auth is a service-account JWT signed with node's built-in crypto — no
// googleapis SDK. Tokens, key material and credential-bearing responses are
// never logged.
//
// Env:
//   GSC_SERVICE_ACCOUNT_JSON — the full service-account JSON blob
//   GSC_SITE_URL             — override property; defaults to sc-domain:cubxxw.com
//
// Usage:
//   node scripts/gsc-fetch.mjs                  # 3-day window ending today-3 (GSC dates)
//   node scripts/gsc-fetch.mjs --lookback 27    # 28-day backfill
//   node scripts/gsc-fetch.mjs --lookback 55    # 56-day backfill
//   node scripts/gsc-fetch.mjs --start 2026-07-27 --end 2026-09-20  # fixed range
//   node scripts/gsc-fetch.mjs --dry-run        # fetch + log summary, don't write
//   node scripts/gsc-fetch.mjs --out path.json  # explicit output (never overwritten)
//   node scripts/gsc-fetch.mjs --dir data/seo   # output directory (default data/seo)
//   node scripts/gsc-fetch.mjs --with-device --with-country  # optional page-based cuts
//
// Snapshot naming: the conventional `data/seo/gsc-YYYY-MM-DD.json` is kept for
// the first write of a day; a same-day rerun appends
// `gsc-YYYY-MM-DD-<UTCtime-and-collision-safe-suffix>.json` instead of
// overwriting (behavior change vs. the legacy collector).
//
// Setup checklist:
//   1. Enable Search Console API in Google Cloud
//   2. Create a service account, download the JSON key
//   3. In Search Console → Settings → Users and permissions, add the service
//      account email as a Restricted user on the property

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { GscError, safeErrorMessage } from './lib/gsc-errors.mjs';
import {
  addDays,
  defaultWindow,
  enumerateDates,
  parseDateArg,
  parseLookback,
  todayInTimezone,
  validateRequestRange,
} from './lib/gsc-dates.mjs';
import {
  AVAILABILITY_PROBE_DAYS,
  DATA_STATE,
  DATA_TIMEZONE,
  GSC_HOST_DEFAULT,
  MAX_PAGES_PER_DAY,
  API_ROW_LIMIT,
  SEARCH_TYPE,
  SNAPSHOT_SCHEMA,
  hostFilterGroup,
  hostFilterPattern,
  requestContext,
  slicePlan,
} from './lib/gsc-snapshot.mjs';
import { fetchSliceDay, getAccessToken, probeAvailability } from './lib/gsc-client.mjs';
import { atomicWriteJson, pickSnapshotPath, DEFAULT_OUT_DIR } from './lib/gsc-persist.mjs';

const DEFAULT_SITE = 'sc-domain:cubxxw.com';

export function parseCliArgs(argv) {
  const opts = {
    lookback: 2,
    explicitRange: false,
    lookbackExplicit: false,
    start: null,
    end: null,
    dryRun: false,
    out: null,
    dir: DEFAULT_OUT_DIR,
    host: GSC_HOST_DEFAULT,
    site: null,
    withDevice: false,
    withCountry: false,
    help: false,
  };
  const valueOf = (flag, i) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) {
      throw new GscError(`Missing value for ${flag}.`, { kind: 'cli' });
    }
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--dry-run': opts.dryRun = true; break;
      case '--with-device': opts.withDevice = true; break;
      case '--with-country': opts.withCountry = true; break;
      case '--help': case '-h': opts.help = true; break;
      case '--lookback':
        opts.lookback = parseLookback(valueOf(arg, i));
        opts.lookbackExplicit = true;
        i += 1;
        break;
      case '--start': opts.start = parseDateArg(valueOf(arg, i), '--start'); opts.explicitRange = true; i += 1; break;
      case '--end': opts.end = parseDateArg(valueOf(arg, i), '--end'); opts.explicitRange = true; i += 1; break;
      case '--out': opts.out = valueOf(arg, i); i += 1; break;
      case '--dir': opts.dir = valueOf(arg, i); i += 1; break;
      case '--host': opts.host = valueOf(arg, i); i += 1; break;
      case '--site': opts.site = valueOf(arg, i); i += 1; break;
      default:
        throw new GscError(`Unknown argument: ${arg} (see --help).`, { kind: 'cli' });
    }
  }
  if (opts.explicitRange && opts.lookbackExplicit) {
    throw new GscError('--lookback cannot be combined with --start/--end (pick one date strategy).', { kind: 'cli' });
  }
  if (opts.explicitRange && (!opts.start || !opts.end)) {
    throw new GscError('--start and --end must be used together for a reproducible fixed backfill.', { kind: 'cli' });
  }
  return opts;
}

// Per-day date availability from the bounded probe. Dates past the observed
// available cutoff are "unavailable-unknown" — never complete-zero.
export function dayAvailability(availability, day) {
  if (!availability || availability.status !== 'observed') return 'unknown';
  if (!availability.availableThrough) return 'unavailable-unknown';
  return day <= availability.availableThrough ? 'available' : 'unavailable-unknown';
}

export function buildSnapshot({ property, host, window, runDate, fetchedAt, runStatus, availability, slices, error = null, config }) {
  return {
    schema: SNAPSHOT_SCHEMA,
    meta: {
      property,
      hostnameScope: { host, filterPattern: hostFilterPattern(host), filterGroups: [hostFilterGroup(host)] },
      searchType: SEARCH_TYPE,
      dataState: DATA_STATE,
      dataTimezone: DATA_TIMEZONE,
      fetchedAt,
      runDate,
      requestWindow: window,
      runStatus,
      availability,
      config,
      error,
    },
    slices,
  };
}

function summarizeSlice(sliceDays) {
  const counts = { complete: 0, empty: 0, partial: 0, failed: 0, truncated: 0 };
  let rows = 0;
  for (const d of Object.values(sliceDays)) {
    counts[d.status] = (counts[d.status] ?? 0) + 1;
    rows += d.rows.length;
  }
  return { counts, rows };
}

export async function runFetch(options, deps = {}) {
  const {
    fetchImpl = globalThis.fetch,
    now = new Date(),
    random,
    fsImpl,
    env = process.env,
    log = console.log,
    warn = console.warn,
    errorLog = console.error,
    sleep,
    setTimer,
    clearTimer,
    rowLimit = API_ROW_LIMIT,
    maxPages = MAX_PAGES_PER_DAY,
  } = deps;

  const requestDeps = { fetchImpl, sleep, setTimer, clearTimer };
  const persistOpts = {};
  if (fsImpl) {
    persistOpts.fs = fsImpl;
    persistOpts.exists = fsImpl.existsSync;
  }
  if (random) persistOpts.random = random;
  const property = options.site ?? env.GSC_SITE_URL ?? DEFAULT_SITE;
  const host = options.host;
  const runDate = now.toISOString().slice(0, 10); // UTC run date (legacy-compatible filenames)
  const fetchedAt = now.toISOString();

  const window = options.explicitRange
    ? validateRequestRange({ start: options.start, end: options.end, now })
    : defaultWindow({ now, lookback: options.lookback });
  const days = enumerateDates(window.start, window.end);
  const plan = slicePlan({ host, withDevice: options.withDevice, withCountry: options.withCountry });

  log(`GSC fetch: property=${property} window=${window.start}..${window.end} (${days.length} days, ${plan.length} slices)`);

  // Resolve the output path up front: an existing explicit --out fails before
  // any request is made (snapshots are append-only, never overwritten).
  if (!options.dryRun) {
    pickSnapshotPath({ runDate, out: options.out, dir: options.dir, now, ...persistOpts }); // preflight only
  }
  const write = (snapshot) => {
    if (options.dryRun) {
      log(`--dry-run: would write snapshot (runStatus ${snapshot.meta.runStatus})`);
      return null;
    }
    // No-clobber publication. If a competing writer takes the chosen name
    // between selection and publication we retry with a fresh default name;
    // an explicit --out collision is a hard failure (non-zero exit).
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const path = pickSnapshotPath({ runDate, out: options.out, dir: options.dir, now, ...persistOpts });
      try {
        atomicWriteJson(path, snapshot, persistOpts);
        return path;
      } catch (err) {
        if (err?.code !== 'EEXIST' || options.out) throw err;
        lastErr = err;
      }
    }
    throw lastErr ?? new GscError('Could not publish the snapshot without clobbering.', { kind: 'io' });
  };

  let token;
  try {
    token = await getAccessToken({ serviceAccountJson: env.GSC_SERVICE_ACCOUNT_JSON, deps: requestDeps });
  } catch (err) {
    // Total failure: still leave evidence, never exit 0 because a file exists.
    const snapshot = buildSnapshot({
      property,
      host,
      window,
      runDate,
      fetchedAt,
      runStatus: 'failed',
      availability: { status: 'unknown', probeWindow: null, observedDates: [], availableThrough: null, error: null },
      slices: [],
      error: { kind: err instanceof GscError ? err.kind : 'transport', status: err?.status ?? null, message: safeErrorMessage(err) },
      config: { rowLimit, maxPages },
    });
    let path = null;
    try {
      path = write(snapshot);
    } catch (writeErr) {
      errorLog(safeErrorMessage(writeErr));
    }
    errorLog(`GSC fetch failed (runStatus failed): ${safeErrorMessage(err)}`);
    if (path) errorLog(`Status artifact: ${path}`);
    return { snapshot, path, exitCode: 1 };
  }

  const today = todayInTimezone(now);
  const probeDates = enumerateDates(addDays(today, -(AVAILABILITY_PROBE_DAYS - 1)), today);
  const availability = await probeAvailability({ siteUrl: property, dates: probeDates, token, deps: requestDeps });
  if (availability.status === 'observed') {
    log(`availability: observed ${availability.probeWindow.start}..${availability.probeWindow.end}, available through ${availability.availableThrough ?? '(no rows observed)'}`);
  } else {
    warn(`availability: unknown (probe failed: ${availability.error?.message ?? 'unknown error'}); empty days stay unknown, never complete-zero`);
  }

  const slices = [];
  let requiredBad = 0;
  let optionalBad = 0;
  for (const spec of plan) {
    const context = requestContext({ property, sliceSpec: spec });
    const sliceDays = {};
    for (const day of days) {
      const result = await fetchSliceDay({ context, day, token, siteUrl: property, rowLimit, maxPages, deps: requestDeps });
      const { slice, rows, ...evidence } = result;
      sliceDays[day] = {
        day,
        status: evidence.status,
        availability: dayAvailability(availability, day),
        rows,
        request: evidence.request,
        response: evidence.response,
        truncated: evidence.truncated,
        conflict: evidence.conflict,
        warnings: evidence.warnings,
        error: evidence.error,
      };
      if (evidence.status !== 'complete' && evidence.status !== 'empty') {
        if (spec.required) requiredBad += 1;
        else optionalBad += 1;
        warn(`  ${spec.name} ${day}: status ${evidence.status}${evidence.error ? ` (${evidence.error.message})` : ''}`);
      }
    }
    slices.push({
      name: spec.name,
      scope: spec.scope,
      purpose: spec.purpose,
      required: spec.required,
      dimensions: context.dimensions,
      filterGroups: context.filters,
      requestAggregationType: context.requestAggregationType,
      days: sliceDays,
    });
    const { counts, rows } = summarizeSlice(sliceDays);
    log(`  ${spec.name.padEnd(22)} ${rows} rows — ${counts.complete} complete, ${counts.empty} empty, ${counts.partial} partial, ${counts.failed} failed, ${counts.truncated} truncated`);
  }

  const runStatus = requiredBad > 0 ? 'partial' : optionalBad > 0 ? 'degraded' : 'ok';
  const snapshot = buildSnapshot({
    property,
    host,
    window,
    runDate,
    fetchedAt,
    runStatus,
    availability,
    slices,
    error: requiredBad > 0 || optionalBad > 0
      ? { kind: 'slice-failure', status: null, message: `${requiredBad} required and ${optionalBad} optional slice/day failures recorded in slices[].days[].error` }
      : null,
    config: { rowLimit, maxPages },
  });

  let path = null;
  try {
    path = write(snapshot);
    if (path) log(`Wrote ${path} (runStatus ${runStatus})`);
  } catch (writeErr) {
    errorLog(safeErrorMessage(writeErr));
    return { snapshot, path: null, exitCode: 1 };
  }
  if (runStatus === 'partial') {
    errorLog(`GSC fetch incomplete: ${requiredBad} required slice/day failure(s); the artifact must not be treated as full coverage.`);
  } else if (runStatus === 'degraded') {
    warn(`GSC fetch degraded: ${optionalBad} optional slice/day failure(s) (device/country cuts only).`);
  }
  return { snapshot, path, exitCode: runStatus === 'partial' ? 1 : 0 };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  try {
    const options = parseCliArgs(argv);
    if (options.help) {
      (deps.log ?? console.log)('Usage: node scripts/gsc-fetch.mjs [--lookback N | --start YYYY-MM-DD --end YYYY-MM-DD] [--dry-run] [--out path | --dir dir] [--host host] [--site property] [--with-device] [--with-country]');
      return 0;
    }
    const result = await runFetch(options, deps);
    return result.exitCode;
  } catch (err) {
    (deps.errorLog ?? console.error)(safeErrorMessage(err));
    return 1;
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().then((code) => {
    process.exitCode = code;
  });
}
