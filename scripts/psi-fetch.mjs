#!/usr/bin/env node
// PageSpeed Insights observation collector (schema psi-snapshot/2).
//
// Runs PSI v5 against the URLs Lighthouse CI checks (lighthouserc.json), once
// per strategy (mobile + desktop), and writes an immutable JSON observation to
// data/seo/psi-YYYY-MM-DD.json (a same-day rerun appends a uniquely named
// file; nothing is ever overwritten). PSI's field data (loadingExperience) is
// real-user CrUX from actual visitors; the laboratory scores are synthetic and
// kept separate from it.
//
// Honesty rules (issue #392):
//   * metric precision preserved (CLS 0.212 stays 0.212), units explicit,
//     byte costs separate from millisecond costs, null means unknown;
//   * planned denominator is the actual configured URL count (URL×strategy,
//     de-duplicated); every slot reports success/partial/failed explicitly;
//   * bounded timeout and retry (max 3 attempts) for 429/selected 5xx/network
//     failures only; non-retryable errors never loop;
//   * a PSI API HTTP status is never described as the origin's status; CrUX
//     no-sample stays unknown and independent from laboratory success.
//
// Env:
//   GOOGLE_API_KEY  — API key with PSI API enabled (optional but avoids throttling)
//
// Usage:
//   node scripts/psi-fetch.mjs                # write today's observation
//   node scripts/psi-fetch.mjs --dry-run      # log summary, don't write
//   node scripts/psi-fetch.mjs --out path.json # explicit output (never overwritten)
//   node scripts/psi-fetch.mjs --dir data/seo  # output directory
//   node scripts/psi-fetch.mjs --config lighthouserc.json
//   node scripts/psi-fetch.mjs --timeout-ms 120000 --max-attempts 3
//
// Exit semantics (stable for B2):
//   0 = run ok        — every planned measurement succeeded with full provenance
//   2 = run partial   — evidence written, but some slots are partial/failed
//   1 = run failed    — no usable measurement, or usage/config/IO error
//                       (a failed run still writes its evidence file when it
//                       can; exit 1 with no file means config/usage/IO error)

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { GscError, safeErrorMessage } from './lib/gsc-errors.mjs';
import {
  CATEGORIES,
  MAX_ATTEMPTS,
  PSI_SNAPSHOT_SCHEMA,
  STRATEGIES,
  DEFAULT_TIMEOUT_MS,
  measureOne,
  planMeasurements,
  summarizeEntries,
} from './lib/psi-measure.mjs';
import { atomicWriteJson, pickObservationPath } from './lib/psi-persist.mjs';

const RATE_LIMIT_MS = 400;

export function parseCliArgs(argv) {
  const opts = {
    dryRun: false,
    out: null,
    dir: 'data/seo',
    config: 'lighthouserc.json',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxAttempts: MAX_ATTEMPTS,
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
      case '--out': opts.out = valueOf(arg, i); i += 1; break;
      case '--dir': opts.dir = valueOf(arg, i); i += 1; break;
      case '--config': opts.config = valueOf(arg, i); i += 1; break;
      case '--timeout-ms': {
        const v = Number(valueOf(arg, i));
        if (!Number.isInteger(v) || v <= 0) throw new GscError(`Invalid --timeout-ms: ${valueOf(arg, i)}`, { kind: 'cli' });
        opts.timeoutMs = v;
        i += 1;
        break;
      }
      case '--max-attempts': {
        const v = Number(valueOf(arg, i));
        if (!Number.isInteger(v) || v < 1 || v > MAX_ATTEMPTS) {
          throw new GscError(`Invalid --max-attempts: expected integer 1..${MAX_ATTEMPTS}, received ${valueOf(arg, i)}`, { kind: 'cli' });
        }
        opts.maxAttempts = v;
        i += 1;
        break;
      }
      case '--help': case '-h': opts.help = true; break;
      default:
        throw new GscError(`Unknown argument: ${arg} (see --help).`, { kind: 'cli' });
    }
  }
  return opts;
}

// The configured URL list is read from the LHCI config so there is one source
// of truth. The planned denominator is the actual configured count after
// URL×strategy de-duplication — never a hard-coded number.
export function readConfiguredUrls(configPath, { fs } = {}) {
  const read = fs?.readFileSync ?? readFileSync;
  let json;
  try {
    json = JSON.parse(read(configPath, 'utf8'));
  } catch (err) {
    throw new GscError(`Cannot read URL config ${configPath}: ${safeErrorMessage(err)}`, { kind: 'config' });
  }
  const urls = json?.ci?.collect?.url;
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new GscError(`URL config ${configPath} has no ci.collect.url list; refusing to guess an empty denominator.`, { kind: 'config' });
  }
  return urls;
}

export function buildSnapshot({ plan, entries, meta }) {
  const { counts, runStatus } = summarizeEntries({ planned: plan.planned, entries });
  return {
    schema: PSI_SNAPSHOT_SCHEMA,
    meta: {
      runDate: meta.runDate,
      startedAt: meta.startedAt,
      endedAt: meta.endedAt,
      // Observation timestamp for as-of eligibility (actual fetch completion).
      fetchedAt: meta.endedAt,
      endpoint: meta.endpoint,
      apiKeyProvided: meta.apiKeyProvided,
      urlConfig: meta.urlConfig,
      configuredUrlCount: plan.configuredUrlCount,
      urlCount: plan.urlCount,
      duplicatesRemoved: plan.duplicatesRemoved,
      strategies: plan.strategies,
      categories: meta.categories,
      timeoutMs: meta.timeoutMs,
      maxAttempts: meta.maxAttempts,
      planned: plan.planned,
      counts,
      runStatus,
      error: meta.error ?? null,
    },
    measurements: entries,
  };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? console.log;
  const warn = deps.warn ?? console.warn;
  const errorLog = deps.errorLog ?? console.error;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  try {
    const opts = parseCliArgs(argv);
    if (opts.help) {
      log('Usage: node scripts/psi-fetch.mjs [--dry-run] [--out path] [--dir data/seo] [--config lighthouserc.json] [--timeout-ms ms] [--max-attempts 1..3]');
      log('Exit: 0 = all planned measurements succeeded; 2 = partial (evidence written); 1 = failed run or usage/config/IO error.');
      return 0;
    }
    // One callable clock default (P1-1: `new Date` alone is not callable).
    const now = deps.now ?? (() => new Date());
    const startedAt = now().toISOString();
    const runDate = startedAt.slice(0, 10); // frozen once per run
    const urls = readConfiguredUrls(opts.config, { fs: deps.fs });
    const plan = planMeasurements({ urls, strategies: STRATEGIES });

    const entries = [];
    for (const slot of plan.planned) {
      const entry = await measureOne(slot, {
        fetchImpl: deps.fetchImpl,
        sleep,
        timeoutMs: opts.timeoutMs,
        maxAttempts: opts.maxAttempts,
        apiKey: deps.apiKey ?? process.env.GOOGLE_API_KEY ?? '',
        categories: CATEGORIES,
        backoffMs: deps.backoffMs,
      });
      const perf = entry.scores?.performance;
      const label = perf == null ? (entry.finalStatus === 'failed' ? `FAIL(${entry.reasonCategory})` : entry.finalStatus) : Math.round(perf * 100).toString().padStart(3);
      log(`  ${slot.strategy.padEnd(7)} ${label}  ${slot.url}`);
      if (entry.error) warn(`    ${entry.error}`); // fixed classification text only
      entries.push(entry);
      if (deps.rateLimitMs !== 0) await sleep(deps.rateLimitMs ?? RATE_LIMIT_MS);
    }

    const endedAt = now().toISOString();
    const snapshot = buildSnapshot({
      plan,
      entries,
      meta: {
        runDate,
        startedAt,
        endedAt,
        endpoint: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
        apiKeyProvided: Boolean(deps.apiKey ?? process.env.GOOGLE_API_KEY ?? ''),
        urlConfig: opts.config,
        categories: CATEGORIES,
        timeoutMs: opts.timeoutMs,
        maxAttempts: opts.maxAttempts,
      },
    });

    const c = snapshot.meta.counts;
    const summary = `${c.succeeded} succeeded, ${c.partial} partial, ${c.failed} failed of ${c.planned} planned (${snapshot.meta.runStatus})`;
    if (opts.dryRun) {
      log(`--dry-run: would write observation (${summary})`);
      return snapshot.meta.runStatus === 'ok' ? 0 : (snapshot.meta.runStatus === 'partial' ? 2 : 1);
    }

    const outPath = pickObservationPath({
      prefix: 'psi',
      runDate,
      out: opts.out,
      dir: opts.dir,
      now: new Date(startedAt),
      exists: deps.exists,
      random: deps.random,
    });
    atomicWriteJson(outPath, snapshot, { fs: deps.fs, random: deps.random });
    log(`Wrote ${outPath} (${summary})`);
    return snapshot.meta.runStatus === 'ok' ? 0 : (snapshot.meta.runStatus === 'partial' ? 2 : 1);
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
