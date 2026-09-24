#!/usr/bin/env node
// Deterministic Search Console report CLI (schema gsc-report/1).
//
// Reads a directory of versioned `gsc-snapshot/2` and legacy `gsc-*.json`
// snapshots and produces an honest 28+28 window report: expected vs covered
// days, per-day provenance and states (missing/empty/failed/partial/
// legacy-unknown/truncation/…), main-host vs other-host page tables, property
// totals vs byPage returned-row totals, and query coverage with transparent
// rule-based labels. The output embeds no build clock: identical inputs always
// produce identical bytes.
//
// Usage:
//   node scripts/gsc-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20
//   node scripts/gsc-report.mjs --dir data/seo --start ... --end ... --out docs/seo-390-baseline.json
//   node scripts/gsc-report.mjs --dir data/seo --start ... --end ... --host cubxxw.com
//   node scripts/gsc-report.mjs ... --include-query-rows   # per-query rows (off by default)
//
// The window range must have an even day count and splits into two
// non-overlapping halves (56 days -> 28+28). --as-of is an optional UTC
// observation cutoff (fetchedAt), distinct from the traffic start/end: later
// observations are excluded consistently from selection, availability,
// undated sections, inputs and summaries; missing/invalid fetchedAt cannot
// prove eligibility and is excluded with a visible constant reason. No build
// clock ever enters the results; without --as-of all inputs are used.
// --out is never overwritten with different content (snapshots and reports are
// evidence): a byte-identical regeneration is an idempotent no-op, differing
// content fails clearly.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { GscError, safeErrorMessage } from './lib/gsc-errors.mjs';
import { parseDateArg, parseUtcTimestamp, validateRequestRange } from './lib/gsc-dates.mjs';
import { atomicWriteJson, pickSnapshotPath } from './lib/gsc-persist.mjs';
import { GSC_HOST_DEFAULT } from './lib/gsc-snapshot.mjs';
import { buildReport } from './lib/gsc-report-core.mjs';

export function parseCliArgs(argv) {
  const opts = {
    dir: null,
    start: null,
    end: null,
    host: GSC_HOST_DEFAULT,
    out: null,
    includeQueryRows: false,
    asOf: null,
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
      case '--dir': opts.dir = valueOf(arg, i); i += 1; break;
      case '--start': opts.start = parseDateArg(valueOf(arg, i), '--start'); i += 1; break;
      case '--end': opts.end = parseDateArg(valueOf(arg, i), '--end'); i += 1; break;
      case '--host': opts.host = valueOf(arg, i); i += 1; break;
      case '--out': opts.out = valueOf(arg, i); i += 1; break;
      case '--as-of': opts.asOf = parseUtcTimestamp(valueOf(arg, i), '--as-of'); i += 1; break;
      case '--include-query-rows': opts.includeQueryRows = true; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        throw new GscError(`Unknown argument: ${arg} (see --help).`, { kind: 'cli' });
    }
  }
  if (!opts.help) {
    if (!opts.dir) throw new GscError('Missing required --dir (directory of gsc-*.json snapshots).', { kind: 'cli' });
    if (!opts.start || !opts.end) throw new GscError('--start and --end are required for a reproducible window.', { kind: 'cli' });
  }
  return opts;
}

export function writeReport(path, report, { fs } = {}) {
  const f = fs ?? { existsSync, readFileSync };
  const data = `${JSON.stringify(report, null, 2)}\n`;
  if (f.existsSync(path)) {
    const existing = f.readFileSync(path, 'utf8');
    if (existing === data) {
      return 'unchanged'; // deterministic regeneration: idempotent no-op, no overwrite
    }
    throw new GscError(
      `Refusing to overwrite existing --out ${path}: content differs (reports are evidence; remove the old file deliberately first).`,
      { kind: 'cli' },
    );
  }
  try {
    atomicWriteJson(path, JSON.parse(data), fs ? { fs } : {});
  } catch (err) {
    if (err?.code === 'EEXIST') {
      // raced with another writer; if the winner wrote identical bytes, fine
      const existing = f.readFileSync(path, 'utf8');
      if (existing === data) return 'unchanged';
    }
    throw err;
  }
  return 'written';
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? console.log;
  try {
    const opts = parseCliArgs(argv);
    if (opts.help) {
      log('Usage: node scripts/gsc-report.mjs --dir DIR --start YYYY-MM-DD --end YYYY-MM-DD [--host host] [--out path] [--include-query-rows] [--as-of YYYY-MM-DDTHH:MM:SSZ]');
      return 0;
    }
    const range = validateRequestRange({ start: opts.start, end: opts.end, now: deps.now ?? new Date() });
    const report = buildReport({ dir: opts.dir, start: range.start, end: range.end, host: opts.host, includeQueryRows: opts.includeQueryRows, asOf: opts.asOf });
    const data = `${JSON.stringify(report, null, 2)}\n`;
    if (!opts.out) {
      log(data);
      return 0;
    }
    const outcome = writeReport(opts.out, report, { fs: deps.fs });
    log(`${opts.out}: ${outcome} (schema ${report.schema}, ${report.inputs.counts.files} snapshot files)`);
    return 0;
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
