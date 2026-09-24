#!/usr/bin/env node
// Proposal-only SEO autofix candidate gate CLI (schema seo-autofix-gate/1) —
// issue #392 / batch B1.
//
// Consumes a deterministic seo-report/1, an EXPLICIT normalized review state
// (seo-review-state/1, from B2's small bounded read-only GitHub adapter) and
// the TRUSTED Hugo page map (seo-page-map/1, produced by B2's trusted
// preparation at the frozen SHA — B1 never invokes Hugo). Emits a
// conservative candidate decision: proposal-only candidates with evidence and
// visible safe skips with explicit reasons.
//
// Hard boundaries: NO content writes, branches, PRs, issue writes or model
// calls; no generic auto-edit policy engine. Apply is explicitly unavailable.
// Targets resolve only through the page map (one URL, one sourcePath) — no
// path guessing, alias merging or model-path evidence borrowing. Missing,
// stale, failed, truncated or incomplete review state (including unknown
// close/merge recency) is a visible safe skip — never zero/empty by default.
// Stored fresh:true flags are never trusted; freshness is re-evaluated at the
// explicit decision time. Low CTR alone never authorizes a copy change.
//
// Usage:
//   node scripts/seo-autofix-gate.mjs --report report.json --review-state review.json \
//     --page-map page-map.json --expected-source-commit <40-hex> --decision-at <UTC> \
//     [--intents intents.json] [--repository owner/repo] [--budget 2] [--out gate.json]
//
// Environment: GITHUB_REPOSITORY supplies the expected repository identity
// when --repository is omitted.
//
// Exit semantics (stable for B2):
//   0 = gate decision produced (candidates and/or safe skips — zero
//       candidates is a valid, safe outcome, not a failure)
//   1 = invalid inputs (bad usage/JSON/schema or unwritable --out)

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { GscError, safeErrorMessage } from './lib/gsc-errors.mjs';
import { parseUtcTimestamp } from './lib/gsc-dates.mjs';
import { GATE_SCHEMA, REVIEW_THRESHOLDS, deriveCandidates, gateCandidates } from './lib/seo-candidates.mjs';
import { PAGE_MAP_SCHEMA } from './lib/seo-page-map.mjs';
import { writeReport } from './gsc-report.mjs';

export function parseCliArgs(argv, env = process.env) {
  const opts = {
    report: null,
    reviewState: null,
    pageMap: null,
    expectedSourceCommit: null,
    decisionAt: null,
    intents: null,
    repository: env.GITHUB_REPOSITORY || null,
    budget: REVIEW_THRESHOLDS.defaultBudget,
    out: null,
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
      case '--report': opts.report = valueOf(arg, i); i += 1; break;
      case '--review-state': opts.reviewState = valueOf(arg, i); i += 1; break;
      case '--page-map': opts.pageMap = valueOf(arg, i); i += 1; break;
      case '--expected-source-commit': opts.expectedSourceCommit = valueOf(arg, i); i += 1; break;
      case '--decision-at': opts.decisionAt = parseUtcTimestamp(valueOf(arg, i), '--decision-at'); i += 1; break;
      case '--intents': opts.intents = valueOf(arg, i); i += 1; break;
      case '--repository': opts.repository = valueOf(arg, i); i += 1; break;
      case '--budget': {
        const v = Number(valueOf(arg, i));
        if (!Number.isInteger(v) || v < 1 || v > REVIEW_THRESHOLDS.maxBudget) {
          throw new GscError(`Invalid --budget: expected integer 1..${REVIEW_THRESHOLDS.maxBudget}`, { kind: 'cli' });
        }
        opts.budget = v;
        i += 1;
        break;
      }
      case '--out': opts.out = valueOf(arg, i); i += 1; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        throw new GscError(`Unknown argument: ${arg} (see --help).`, { kind: 'cli' });
    }
  }
  if (!opts.help) {
    if (!opts.report) throw new GscError('Missing required --report (seo-report/1 JSON).', { kind: 'cli' });
    if (!opts.reviewState) throw new GscError('Missing required --review-state (seo-review-state/1 JSON; never synthesized or defaulted).', { kind: 'cli' });
    if (!opts.pageMap) throw new GscError('Missing required --page-map (seo-page-map/1 JSON from trusted preparation; targets never resolve by guessing).', { kind: 'cli' });
    if (!opts.expectedSourceCommit) throw new GscError('Missing required --expected-source-commit (trusted 40-hex frozen SHA).', { kind: 'cli' });
    if (!opts.decisionAt) throw new GscError('Missing required --decision-at (strict UTC decision time; the report cutoff never doubles as "now").', { kind: 'cli' });
  }
  return opts;
}

export function readJson(path, label, { fs } = {}) {
  const read = fs?.readFileSync ?? readFileSync;
  let raw;
  try {
    raw = read(path, 'utf8');
  } catch {
    throw new GscError(`Cannot read ${label} file ${path}.`, { kind: 'cli' });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new GscError(`${label} file ${path} is not valid JSON.`, { kind: 'cli' });
  }
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? console.log;
  const errorLog = deps.errorLog ?? console.error;
  try {
    const opts = parseCliArgs(argv, deps.env ?? process.env);
    if (opts.help) {
      log('Usage: node scripts/seo-autofix-gate.mjs --report report.json --review-state review.json --page-map page-map.json --expected-source-commit <40-hex> --decision-at <UTC> [--intents intents.json] [--repository owner/repo] [--budget 1..5] [--out gate.json]');
      log('Exit: 0 = decision produced (zero candidates is safe); 1 = invalid inputs. Proposal-only: apply is unavailable.');
      return 0;
    }
    const report = readJson(opts.report, 'report', { fs: deps.fs });
    if (report?.schema !== 'seo-report/1') {
      throw new GscError(`--report must be seo-report/1 (received ${JSON.stringify(report?.schema ?? null)}).`, { kind: 'cli' });
    }
    const reviewState = readJson(opts.reviewState, 'review-state', { fs: deps.fs });
    const pageMap = readJson(opts.pageMap, 'page-map', { fs: deps.fs });
    if (pageMap?.schema !== PAGE_MAP_SCHEMA) {
      throw new GscError(`--page-map must be ${PAGE_MAP_SCHEMA} (received ${JSON.stringify(pageMap?.schema ?? null)}).`, { kind: 'cli' });
    }
    const intents = opts.intents ? readJson(opts.intents, 'intents', { fs: deps.fs }) : null;

    const { candidates } = deriveCandidates({ report, intents });
    const decision = gateCandidates({
      report,
      reviewState,
      candidates,
      asOfMs: Date.parse(opts.decisionAt),
      budget: opts.budget,
      expectedRepository: opts.repository,
      expectedSourceCommit: opts.expectedSourceCommit,
      pageMap,
    });

    if (opts.out) {
      const outcome = writeReport(opts.out, decision, { fs: deps.fs });
      log(`${opts.out}: ${outcome} (schema ${decision.schema}, ${decision.candidates.length} proposal(s), ${decision.skipped.length} skip(s))`);
    } else {
      log(`${JSON.stringify(decision, null, 2)}`);
    }
    if (!decision.reviewState.ok) {
      log(`review state not usable: ${decision.reviewState.reasons.join('; ')}`);
    }
    return 0;
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

export { GATE_SCHEMA };
