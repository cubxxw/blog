#!/usr/bin/env node
// Bounded read-only Google indexed-version inspection. No live URL fetch,
// indexing submission, property changes or write-capable OAuth scope.
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getAccessToken, httpPost } from './lib/gsc-client.mjs';
import { isValidUtcTimestamp } from './lib/gsc-dates.mjs';
import { GscError } from './lib/gsc-errors.mjs';
import { atomicWriteJson } from './lib/gsc-persist.mjs';

export const INSPECTION_SCHEMA = 'gsc-inspection/1';
export const INSPECTION_PROPERTY = 'sc-domain:cubxxw.com';
export const CANARY_URL = 'https://cubxxw.com/engineering/posts/go-release-tools/';
const INSPECTION_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const MAX_URLS = 25;
const MAX_RETRIES = 1;
const INDEX_FIELDS = ['verdict', 'coverageState', 'robotsTxtState', 'indexingState', 'pageFetchState', 'googleCanonical', 'userCanonical', 'lastCrawlTime'];
const VERDICTS = new Set(['PASS', 'PARTIAL', 'FAIL', 'NEUTRAL']);

export function validateInspectionUrls(urls) {
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > MAX_URLS) {
    throw new GscError('Inspection URL count must be between 1 and 25.', { kind: 'cli' });
  }
  const seen = new Set();
  for (const value of urls) {
    if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('https://cubxxw.com/') || /[\u0000-\u0020\u007f\\]/u.test(value)) {
      throw new GscError('Invalid inspection URL: only explicit HTTPS cubxxw.com pages are allowed (input omitted).', { kind: 'cli' });
    }
    let url;
    try { url = new URL(value); } catch { throw new GscError('Invalid inspection URL (input omitted).', { kind: 'cli' }); }
    if (url.protocol !== 'https:' || url.hostname !== 'cubxxw.com' || url.username || url.password || url.port || url.hash) {
      throw new GscError('Invalid inspection URL scope or fragment (input omitted).', { kind: 'cli' });
    }
    if (seen.has(value)) throw new GscError('Duplicate inspection URL (input omitted).', { kind: 'cli' });
    seen.add(value);
  }
  return [...urls];
}

function validateProvenance(sourceSha, fetchedAt) {
  if (typeof sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new GscError('A full lowercase source SHA is required.', { kind: 'cli' });
  if (!isValidUtcTimestamp(fetchedAt)) throw new GscError('A strict UTC fetchedAt timestamp is required.', { kind: 'cli' });
}

function diagnostic(kind, status = null) {
  return { kind, status, message: 'Observation unavailable; raw response bodies, exceptions and credentials are omitted.' };
}

function indexStatusFrom(text) {
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  const source = value?.inspectionResult?.indexStatusResult;
  if (!source || typeof source !== 'object' || Array.isArray(source) || !VERDICTS.has(source.verdict)) return null;
  const out = {};
  for (const field of INDEX_FIELDS) {
    const v = source[field];
    if (v !== undefined && v !== null && (typeof v !== 'string' || v.length > 2048)) return null;
    out[field] = v === undefined || v === '' ? null : v;
  }
  return out;
}

export async function collectInspection({ urls = [CANARY_URL], sourceSha, fetchedAt, serviceAccountJson, deps = {} } = {}) {
  const planned = validateInspectionUrls(urls);
  validateProvenance(sourceSha, fetchedAt);
  // One attempt deadline covers headers and response body. The dependency
  // seam permits offline tests, never changes endpoints, scope or retry cap.
  const transport = {
    fetchImpl: deps.fetchImpl ?? globalThis.fetch,
    sleep: deps.sleep ?? ((ms) => new Promise(resolve => setTimeout(resolve, ms))),
    timeoutMs: deps.timeoutMs ?? 30000,
    retries: MAX_RETRIES,
    ...(deps.setTimer ? { setTimer: deps.setTimer } : {}),
    ...(deps.clearTimer ? { clearTimer: deps.clearTimer } : {}),
  };
  const report = {
    schema: INSPECTION_SCHEMA,
    meta: {
      sourceSha, fetchedAt, property: INSPECTION_PROPERTY, languageCode: 'en-US',
      basis: 'Google indexed version only; separate from current HTTP/HTML, not a live test or indexing request',
      maxUrls: MAX_URLS, maxAttemptsPerRequest: MAX_RETRIES + 1, timeoutMs: transport.timeoutMs,
      canaryUrl: planned[0], runStatus: 'failed', processError: null,
    },
    counts: { planned: planned.length, inspected: 0, unknown: 0, blocked: 0 },
    results: [],
    pending: ['11-class Page indexing exports, migration settings and T+14/T+28 remain separate evidence gates'],
  };
  let token = null;
  let blockedBy = null;
  try {
    token = await getAccessToken({ serviceAccountJson, deps: { ...transport, nowMs: Date.parse(fetchedAt) } });
  } catch (error) {
    report.meta.processError = diagnostic('auth', error instanceof GscError ? error.status : null);
    blockedBy = 'OAuth authentication failed; no URL inspection was attempted';
  }
  for (let i = 0; i < planned.length; i++) {
    const url = planned[i];
    if (blockedBy) {
      report.results.push({ url, status: 'blocked', httpStatus: null, indexStatus: null, error: diagnostic('blocked'), blockedBy });
      continue;
    }
    let httpStatus = null;
    let indexStatus = null;
    let error = null;
    try {
      const response = await httpPost({
        url: INSPECTION_ENDPOINT,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: INSPECTION_PROPERTY, languageCode: 'en-US' }),
        label: 'URL Inspection', ...transport,
      });
      httpStatus = response.status;
      if (response.status === 200) {
        indexStatus = indexStatusFrom(response.text);
        if (!indexStatus) error = diagnostic('invalid-index-status', httpStatus);
      } else {
        error = diagnostic([401, 403].includes(httpStatus) ? 'permission-or-auth' : httpStatus === 429 ? 'quota' : 'http', httpStatus);
      }
    } catch (failure) {
      httpStatus = failure instanceof GscError ? failure.status : null;
      error = diagnostic(httpStatus === 429 ? 'quota' : 'transport', httpStatus);
    }
    report.results.push({ url, status: indexStatus ? 'inspected' : 'unknown', httpStatus, indexStatus, error, blockedBy: null });
    // Every invocation starts with a canary. No valid indexed-version
    // observation means no batch; later auth/quota failures also stop safely.
    if ((i === 0 && !indexStatus) || [401, 403, 429].includes(httpStatus)) {
      blockedBy = i === 0 ? 'First-URL canary failed; remaining URLs were not requested' : 'Inspection authentication/permission/quota failed; remaining URLs were not requested';
    }
  }
  for (const item of report.results) report.counts[item.status] += 1;
  report.meta.runStatus = report.counts.inspected === planned.length ? 'complete' : report.counts.inspected > 0 ? 'partial' : 'failed';
  return report;
}

export function parseCliArgs(argv, env = process.env) {
  const opts = { urls: [], urlsEnv: null, sourceSha: null, out: null, help: false };
  const valueOf = (flag, i) => {
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new GscError(`Missing value for ${flag}.`, { kind: 'cli' });
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--url': opts.urls.push(valueOf('--url', i)); i += 1; break;
      case '--urls-env': opts.urlsEnv = valueOf('--urls-env', i); i += 1; break;
      case '--source-sha': opts.sourceSha = valueOf('--source-sha', i); i += 1; break;
      case '--out': opts.out = valueOf('--out', i); i += 1; break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new GscError('Unknown CLI argument (see --help; input omitted).', { kind: 'cli' });
    }
  }
  if (opts.help) return opts;
  if (!opts.out) throw new GscError('--out is required (append-only evidence).', { kind: 'cli' });
  if (opts.urlsEnv !== null) {
    if (opts.urls.length || !/^[A-Z][A-Z0-9_]*$/.test(opts.urlsEnv)) throw new GscError('--urls-env requires a valid env name and cannot combine with --url.', { kind: 'cli' });
    const text = env[opts.urlsEnv];
    if (typeof text !== 'string' || text.length > 25 * 2050) throw new GscError('Inspection URL environment input is missing or too large.', { kind: 'cli' });
    opts.urls = text.split(/\r?\n/).filter(line => line !== '');
  } else if (!opts.urls.length) {
    opts.urls = [CANARY_URL];
  }
  opts.urls = validateInspectionUrls(opts.urls);
  if (typeof opts.sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(opts.sourceSha)) throw new GscError('--source-sha requires a full lowercase SHA.', { kind: 'cli' });
  return opts;
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? console.log;
  const errorLog = deps.errorLog ?? console.error;
  try {
    const env = deps.env ?? process.env;
    const opts = parseCliArgs(argv, env);
    if (opts.help) {
      log('Usage: node scripts/gsc-inspect.mjs --out PATH --source-sha SHA [--url HTTPS_URL ... | --urls-env INPUT_URLS] (default: one GoReleaser canary; maximum 25 URLs)');
      return 0;
    }
    if (existsSync(opts.out)) throw new GscError('Existing --out cannot be overwritten.', { kind: 'cli' });
    const fetchedAt = (deps.now ?? (() => new Date()))().toISOString();
    const report = await collectInspection({ urls: opts.urls, sourceSha: opts.sourceSha, fetchedAt, serviceAccountJson: env.GSC_SERVICE_ACCOUNT_JSON, deps: deps.transport ?? {} });
    atomicWriteJson(opts.out, report);
    log(`Inspection ${report.meta.runStatus}: planned ${report.counts.planned}, inspected ${report.counts.inspected}, unknown ${report.counts.unknown}, blocked ${report.counts.blocked}.`);
    return report.meta.runStatus === 'complete' ? 0 : 1;
  } catch {
    // Errors at this entry point may include user input/IO paths. Fixed text
    // ensures no arbitrary exception, environment value or raw body is logged.
    errorLog('Inspection generation failed: check URL scope, source SHA, input/output and evidence permissions; details omitted.');
    return 1;
  }
}

try {
  if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    process.exitCode = await main();
  }
} catch { /* imported module or nonexistent entry path */ }
