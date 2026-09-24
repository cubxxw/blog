#!/usr/bin/env node
// Deterministic SEO report CLI (schema seo-report/1) — issue #392 / batch B1.
//
// Composes A's public report API (buildReport → gsc-report/1) with the
// immutable PSI/CrUX observation selection and emits a reproducible evidence
// report: JSON for machines plus prepared Markdown for the existing `seo`
// daily-report section. No network, no model, no build clock in the results —
// `--as-of` is a recorded input cutoff (default: one frozen run-clock value,
// recorded with its basis). A report generated later never refreshes old
// inputs; freshness is classified, never assumed.
//
// Usage:
//   node scripts/seo-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20
//   node scripts/seo-report.mjs --dir data/seo --start ... --end ... --as-of 2026-09-24T12:00:00Z
//   node scripts/seo-report.mjs ... --run-date 2026-09-24 --out report.json --markdown-out section.md
//   node scripts/seo-report.mjs ... --include-query-rows   # real query×page rows (off by default)
//
// Exit semantics (stable for B2):
//   0 = report generated; every source present and fresh at the as-of cutoff
//   2 = report generated, but evidence is degraded (stale/missing source or
//       unproven freshness) — the artifact is valid and the gaps are in-band
//   1 = generation failed (usage/config/IO); no artifact is claimed
//
// --out/--markdown-out are never overwritten with different content
// (byte-identical regeneration is an idempotent no-op).

import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { GscError, safeErrorMessage } from './lib/gsc-errors.mjs';
import { parseDateArg, parseUtcTimestamp, todayInTimezone, validateRequestRange } from './lib/gsc-dates.mjs';
import { GSC_HOST_DEFAULT } from './lib/gsc-snapshot.mjs';
import { buildReport } from './lib/gsc-report-core.mjs';
import { selectCruxObservations, selectPsiObservations } from './lib/seo-observations.mjs';
import { SEO_REPORT_SCHEMA, buildSeoReport } from './lib/seo-report-core.mjs';
import { writeReport } from './gsc-report.mjs';

export function parseCliArgs(argv) {
  const opts = {
    dir: null,
    start: null,
    end: null,
    host: GSC_HOST_DEFAULT,
    asOf: null,
    runDate: null,
    includeQueryRows: false,
    out: null,
    markdownOut: null,
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
      case '--as-of': opts.asOf = parseUtcTimestamp(valueOf(arg, i), '--as-of'); i += 1; break;
      case '--run-date': opts.runDate = parseDateArg(valueOf(arg, i), '--run-date'); i += 1; break;
      case '--include-query-rows': opts.includeQueryRows = true; break;
      case '--out': opts.out = valueOf(arg, i); i += 1; break;
      case '--markdown-out': opts.markdownOut = valueOf(arg, i); i += 1; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        throw new GscError(`Unknown argument: ${arg} (see --help).`, { kind: 'cli' });
    }
  }
  if (!opts.help) {
    if (!opts.dir) throw new GscError('Missing required --dir (directory of gsc-*/psi-*/crux-*.json observations).', { kind: 'cli' });
    if (!opts.start || !opts.end) throw new GscError('--start and --end are required for a reproducible window.', { kind: 'cli' });
  }
  return opts;
}

// Markdown is daily-report section content: never overwrite existing content
// that differs (same evidence semantics as writeReport).
export function writeMarkdown(path, text, { fs } = {}) {
  const write = fs?.writeFileSync ?? writeFileSync;
  const read = fs?.readFileSync ?? readFileSync;
  const exists = fs?.existsSync ?? ((p) => {
    try { read(p); return true; } catch { return false; }
  });
  if (exists(path)) {
    const existing = read(path, 'utf8');
    if (existing === text) return 'unchanged';
    throw new GscError(`Refusing to overwrite existing --markdown-out ${path}: content differs.`, { kind: 'cli' });
  }
  write(path, text);
  return 'written';
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? console.log;
  const errorLog = deps.errorLog ?? console.error;
  try {
    const opts = parseCliArgs(argv);
    if (opts.help) {
      log('Usage: node scripts/seo-report.mjs --dir DIR --start YYYY-MM-DD --end YYYY-MM-DD [--as-of TS] [--run-date YYYY-MM-DD] [--host host] [--include-query-rows] [--out path] [--markdown-out path]');
      log('Exit: 0 = report generated, sources fresh; 2 = report generated with stale/missing evidence (in-band); 1 = generation failed.');
      return 0;
    }
    const range = validateRequestRange({ start: opts.start, end: opts.end, now: deps.now ? deps.now() : new Date() });
    // ONE frozen clock: the as-of cutoff is a recorded input (explicit when
    // given, otherwise one frozen run-clock value) and the EXACT same cutoff
    // is passed to every consumer (GSC + PSI + CrUX) — a default run can never
    // include inputs newer than the cutoff it is labelled with.
    const now = deps.now ?? (() => new Date());
    const asOf = opts.asOf ?? now().toISOString();
    const asOfBasis = opts.asOf ? 'explicit' : 'run-clock';

    const gsc = buildReport({
      dir: opts.dir,
      start: range.start,
      end: range.end,
      host: opts.host,
      includeQueryRows: opts.includeQueryRows,
      asOf,
      fs: deps.fs,
    });
    const psi = selectPsiObservations({ dir: opts.dir, asOf, fs: deps.fs });
    const crux = selectCruxObservations({ dir: opts.dir, asOf, fs: deps.fs });

    const report = buildSeoReport({
      gsc,
      psi,
      crux,
      params: {
        dir: opts.dir,
        asOf,
        asOfBasis,
        runDate: opts.runDate ?? todayInTimezone(new Date(asOf), 'UTC'),
        runDateBasis: opts.runDate ? 'explicit' : 'as-of-date',
        includeQueryRows: opts.includeQueryRows,
      },
    });

    const data = `${JSON.stringify(report, null, 2)}\n`;
    if (opts.out) {
      const outcome = writeReport(opts.out, report, { fs: deps.fs });
      log(`${opts.out}: ${outcome} (schema ${report.schema}, as-of ${asOf} [${asOfBasis}])`);
    } else {
      log(data);
    }
    if (opts.markdownOut) {
      const outcome = writeMarkdown(opts.markdownOut, report.markdown, { fs: deps.fs });
      log(`${opts.markdownOut}: ${outcome} (seo section body)`);
    }
    const sourcesFresh = report.sources.gsc.freshness.fresh && report.sources.psi.freshness.fresh && report.sources.crux.freshness.fresh;
    return sourcesFresh ? 0 : 2;
  } catch (err) {
    errorLog(safeErrorMessage(err));
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

export { SEO_REPORT_SCHEMA };
