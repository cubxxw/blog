import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CATEGORIES,
  FAILURE_CATEGORIES,
  MAX_ATTEMPTS,
  METRIC_UNITS,
  buildRequestEndpoint,
  classifyHttpStatus,
  classifyTransportError,
  extractFailure,
  extractMeasurement,
  measureOne,
  parseSuccessPayload,
  pickCosts,
  pickLcpElement,
  planMeasurements,
  provenanceSignature,
  summarizeEntries,
  validateLighthouseResult,
} from './lib/psi-measure.mjs';
import { atomicWriteJson, pickObservationPath } from './lib/psi-persist.mjs';
import { buildSnapshot, main, parseCliArgs, readConfiguredUrls } from './psi-fetch.mjs';

const SCRIPT = fileURLToPath(new URL('./psi-fetch.mjs', import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures (complete, realistic Lighthouse provenance by default)
// ---------------------------------------------------------------------------

function makeSettings({
  formFactor = 'mobile',
  throttlingMethod = 'simulate',
  rttMs = 150,
  cpuSlowdownMultiplier = 4,
  deviceScaleFactor = 1.75,
  locale = 'en-US',
} = {}) {
  return {
    formFactor,
    throttlingMethod,
    throttling: {
      rttMs,
      throughputKbps: 1638.4,
      requestLatencyMs: rttMs,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier,
    },
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor, disabled: false },
    locale,
    emulatedUserAgent: 'Mozilla/5.0 (Linux; Android 11; moto g) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  };
}

function auditMetric({ numericValue, numericUnit = 'millisecond', displayValue = null, score = 0.9, details = undefined }) {
  const a = { numericValue, numericUnit, displayValue, score };
  if (details !== undefined) a.details = details;
  return a;
}

function makeLhr({
  performance = 0.89,
  lcpMs = 2123.45,
  cls = 0.212,
  version = '12.8.0',
  fetchTime = '2026-09-24T10:00:00.000Z',
  settings = makeSettings(),
  audits: auditOverrides = {},
  runtimeError = undefined,
} = {}) {
  const audits = {
    'largest-contentful-paint': auditMetric({ numericValue: lcpMs, displayValue: '2.1 s', score: 0.8 }),
    'first-contentful-paint': auditMetric({ numericValue: 1200.5, displayValue: '1.2 s' }),
    'cumulative-layout-shift': auditMetric({ numericValue: cls, numericUnit: 'unitless', displayValue: String(cls), score: 1 }),
    'total-blocking-time': auditMetric({ numericValue: 40, displayValue: '40 ms' }),
    'speed-index': auditMetric({ numericValue: 2200, displayValue: '2.2 s' }),
    interactive: auditMetric({ numericValue: 2400, displayValue: '2.4 s' }),
    'meta-description': { score: 1, displayValue: null, title: 'Meta description' },
    ...auditOverrides,
  };
  const lhr = {
    requestedUrl: 'https://cubxxw.com/',
    finalDisplayedUrl: 'https://cubxxw.com/',
    fetchTime,
    lighthouseVersion: version,
    configSettings: settings,
    categories: { performance: { score: performance } },
    audits,
  };
  if (runtimeError !== undefined) lhr.runtimeError = runtimeError;
  return lhr;
}

function jsonResponse(json, status = 200) {
  return { ok: status === 200, status, text: async () => JSON.stringify(json) };
}

function errorResponse(status, body = '') {
  return { ok: false, status, text: async () => body };
}

function makeEntry(url, strategy, finalStatus) {
  return finalStatus === 'failed'
    ? extractFailure({
        url,
        strategy,
        reasonCategory: 'psi-api-failure',
        reasonBasis: 'test fixture failure',
        errorKind: 'http',
        errorMeta: { status: 500 },
        psiHttpStatus: 500,
      })
    : { url, strategy, finalStatus, usable: true };
}

// In-memory FS standing in for config reads + observation persistence.
function makeMockFs(initial = {}) {
  const files = new Map(Object.entries(initial));
  return {
    files,
    readFileSync: (p) => {
      if (files.has(p)) return files.get(p);
      const e = new Error('missing'); e.code = 'ENOENT'; throw e;
    },
    mkdirSync: () => {},
    writeFileSync: (p, data, opts) => {
      if (opts?.flag === 'wx' && files.has(p)) { const e = new Error('exists'); e.code = 'EEXIST'; throw e; }
      files.set(p, String(data));
    },
    linkSync: (p, q) => {
      if (files.has(q)) { const e = new Error('exists'); e.code = 'EEXIST'; throw e; }
      files.set(q, files.get(p));
    },
    unlinkSync: (p) => { files.delete(p); },
    existsSync: (p) => files.has(p),
  };
}

// ---------------------------------------------------------------------------
// Planning: actual configured URL count, URL×strategy de-duplication
// ---------------------------------------------------------------------------

test('planMeasurements uses the actual configured URL count and de-duplicates URL×strategy', () => {
  const plan = planMeasurements({
    urls: ['https://cubxxw.com/', 'https://cubxxw.com/zh/', 'https://cubxxw.com/', 'https://cubxxw.com/zh/'],
    strategies: ['mobile', 'desktop', 'mobile'],
  });
  assert.equal(plan.configuredUrlCount, 4);
  assert.equal(plan.urlCount, 2);
  assert.equal(plan.duplicatesRemoved, 2);
  assert.equal(plan.planned.length, 4); // 2 URLs × 2 strategies — the denominator
  assert.deepEqual(plan.planned[0], { url: 'https://cubxxw.com/', strategy: 'mobile' });
});

test('planMeasurements rejects empty URL lists and unknown strategies', () => {
  assert.throws(() => planMeasurements({ urls: [] }), /non-empty/);
  assert.throws(() => planMeasurements({ urls: ['x'], strategies: ['tablet'] }), /unknown strategy/);
  assert.throws(() => planMeasurements({ urls: ['x', ''] }), /invalid URL/);
});

// ---------------------------------------------------------------------------
// Metric precision and units
// ---------------------------------------------------------------------------

test('CLS stays fractional (0.212 remains 0.212) with an explicit unitless unit', () => {
  const entry = extractMeasurement({ url: 'u', strategy: 'mobile', json: { lighthouseResult: makeLhr({ cls: 0.212 }) } });
  assert.equal(entry.metrics.CLS.numericValue, 0.212);
  assert.equal(entry.metrics.CLS.unit, 'unitless');
  assert.equal(entry.metrics.CLS.precision, 'raw');
  assert.equal(METRIC_UNITS.LCP, 'ms');
  assert.equal(entry.metrics.LCP.unit, 'ms');
  assert.equal(entry.metrics.LCP.numericValue, 2123.45); // no rounding
});

test('null stays unknown: absent audits, empty field data and missing settings are never zero', () => {
  const lhr = makeLhr({ settings: undefined, audits: { 'total-blocking-time': undefined } });
  delete lhr.configSettings;
  const entry = extractMeasurement({ url: 'u', strategy: 'desktop', json: { lighthouseResult: lhr, loadingExperience: { overall_category: 'NONE', metrics: {} } } });
  assert.equal(entry.metrics.TBT, null); // absent audit -> null, not 0
  assert.equal(entry.fieldData.status, 'no-sample');
  assert.equal(entry.fieldData.metrics, null); // no sample -> unknown, not zeros
  assert.equal(entry.originFieldData.status, 'unknown');
  assert.equal(entry.provenance.configSettings, null);
  assert.equal(entry.originHttpStatus, null); // origin status is never observed via PSI
  assert.equal(entry.finalStatus, 'partial');
  assert.ok(entry.caveats.some((c) => /configSettings/.test(c)));
});

test('field data with samples records percentiles; success requires full provenance', () => {
  const json = {
    lighthouseResult: makeLhr(),
    loadingExperience: {
      overall_category: 'AVERAGE',
      metrics: { largest_contentful_paint: { percentile: 2400, category: 'AVERAGE' } },
    },
  };
  const entry = extractMeasurement({ url: 'u', strategy: 'mobile', json });
  assert.equal(entry.finalStatus, 'success');
  assert.deepEqual(entry.caveats, []);
  assert.equal(entry.fieldData.status, 'sampled');
  assert.equal(entry.fieldData.metrics.largest_contentful_paint.percentile, 2400);
  assert.equal(entry.provenance.lighthouseVersion, '12.8.0');
  assert.equal(entry.provenance.configSettings.throttlingMethod, 'simulate');
});

// ---------------------------------------------------------------------------
// Costs: numericUnit/explicit savings values, zero-ms/nonzero-byte, totals
// ---------------------------------------------------------------------------

test('costs: zero-ms/nonzero-byte survives; numericValue is read via its own numericUnit; totals are never labelled waste', () => {
  const audits = {
    // actual Lighthouse 12.6.1 shape recovered in review: zero ms, 69,140 bytes
    'unused-css-rules': { numericValue: 0, numericUnit: 'millisecond', title: 'Reduce unused CSS', displayValue: 'Est savings of 67 KiB', score: 0.5, details: { overallSavingsMs: 0, overallSavingsBytes: 69140 } },
    // review fixture: explicit byte savings with a millisecond numericValue
    'unused-javascript': { numericValue: 120, numericUnit: 'millisecond', title: 'Reduce unused JS', score: 0.5, details: { overallSavingsBytes: 4096 } },
    // total transfer is distinct from removable waste
    'total-byte-weight': { numericValue: 2785295, numericUnit: 'byte', title: 'Total byte weight', displayValue: 'Total size was 2,720 KiB', score: 0.5 },
    // no savings fields and no numericUnit -> unknown, never invented
    'render-blocking-resources': { numericValue: 340, title: 'Render blocking', score: 0.5 },
  };
  const costs = pickCosts(audits);

  const css = costs.savingsBytes.find((r) => r.id === 'unused-css-rules');
  assert.ok(css, 'zero-ms/nonzero-byte audit must survive');
  assert.equal(css.wastedBytes, 69140); // regression: dropped by numericValue <= 0 before
  assert.equal(css.wastedMs, 0); // explicit zero preserved
  assert.equal(css.provenance.wastedBytes, 'lighthouse-audit:unused-css-rules.details.overallSavingsBytes');
  assert.equal(css.provenance.wastedMs, 'lighthouse-audit:unused-css-rules.details.overallSavingsMs');

  const jsRow = costs.savingsBytes.find((r) => r.id === 'unused-javascript');
  assert.equal(jsRow.wastedBytes, 4096); // explicit savings field — never 120
  assert.equal(jsRow.wastedMs, 120); // numericValue interpreted via numericUnit=millisecond
  assert.equal(jsRow.provenance.wastedMs, 'lighthouse-audit:unused-javascript.numericValue (numericUnit=millisecond)');
  assert.ok(costs.savingsMs.some((r) => r.id === 'unused-javascript' && r.wastedMs === 120));

  const total = costs.transferBytes.find((r) => r.id === 'total-byte-weight');
  assert.equal(total.totalBytes, 2785295);
  assert.equal(total.wastedMs, null);
  assert.equal(total.wastedBytes, null); // total transfer is not removable waste
  assert.match(total.provenance.totalBytes, /not removable waste/);

  assert.equal(costs.savingsMs.find((r) => r.id === 'render-blocking-resources'), undefined); // unknown stays null
  for (const r of costs.transferBytes) {
    assert.equal(r.wastedMs, null);
    assert.equal(r.wastedBytes, null);
  }
});

test('costs: byte and millisecond values never share a field', () => {
  const costs = pickCosts({
    'render-blocking-resources': { numericValue: 340, numericUnit: 'millisecond', score: 0.5, title: 'Render blocking', details: { overallSavingsMs: 340, overallSavingsBytes: 50000 } },
  });
  const row = costs.savingsMs[0];
  assert.equal(row.wastedMs, 340);
  assert.equal(row.wastedBytes, 50000);
  assert.equal(costs.savingsBytes[0], row); // same explicit row, per-field provenance
  assert.equal(row.provenance.wastedMs, 'lighthouse-audit:render-blocking-resources.details.overallSavingsMs');
  assert.equal(row.provenance.wastedBytes, 'lighthouse-audit:render-blocking-resources.details.overallSavingsBytes');
});

// ---------------------------------------------------------------------------
// Measurement provenance: allowlisted settings, distinguishable, fail closed
// ---------------------------------------------------------------------------

test('provenance preserves allowlisted settings; CPU/RTT/DPR/locale differences stay distinguishable', () => {
  const entry = extractMeasurement({ url: 'u', strategy: 'mobile', json: { lighthouseResult: makeLhr() } });
  assert.equal(entry.finalStatus, 'success');
  assert.equal(entry.provenance.configSettings.throttling.cpuSlowdownMultiplier, 4);
  assert.equal(entry.provenance.configSettings.throttling.rttMs, 150);
  assert.equal(entry.provenance.configSettings.screenEmulation.deviceScaleFactor, 1.75);
  assert.equal(entry.provenance.configSettings.screenEmulation.disabled, false);
  assert.equal(entry.provenance.configSettings.locale, 'en-US');
  assert.match(entry.provenance.configSettings.emulatedUserAgent, /Chrome\/120/);
  assert.equal(provenanceSignature(entry.provenance).complete, true);

  const sig = (lhr) => provenanceSignature(extractMeasurement({ url: 'u', strategy: 'mobile', json: { lighthouseResult: lhr } }).provenance).signature;
  const base = sig(makeLhr());
  assert.equal(sig(makeLhr()), base); // identical settings stay comparable
  for (const tweak of [
    { cpuSlowdownMultiplier: 8 },
    { rttMs: 300 },
    { deviceScaleFactor: 3 },
    { locale: 'zh-CN' },
  ]) {
    assert.notEqual(sig(makeLhr({ settings: makeSettings(tweak) })), base, `settings ${JSON.stringify(tweak)} must be distinguishable`);
  }
});

test('arbitrary config keys (extraHeaders etc.) are never retained in provenance', () => {
  const dirty = makeLhr();
  dirty.configSettings.extraHeaders = { Authorization: 'Bearer sk-synthetic-keepout' };
  dirty.configSettings.debugNote = 'internal-note-xyz';
  const entry = extractMeasurement({ url: 'u', strategy: 'mobile', json: { lighthouseResult: dirty } });
  const text = JSON.stringify(entry);
  assert.doesNotMatch(text, /sk-synthetic-keepout/);
  assert.doesNotMatch(text, /extraHeaders/);
  assert.doesNotMatch(text, /internal-note-xyz/);
  assert.equal(entry.finalStatus, 'success'); // allowlisted fields are all present
});

test('missing/invalid fetchTime is partial, not retained, and blocks compatibility claims', () => {
  const bad = extractMeasurement({ url: 'u', strategy: 'mobile', json: { lighthouseResult: makeLhr({ fetchTime: 'not-a-date' }) } });
  assert.equal(bad.finalStatus, 'partial'); // regression: was success with empty caveats
  assert.ok(bad.caveats.some((c) => /fetchTime/.test(c)));
  assert.equal(bad.provenance.fetchTime, null); // invalid timestamp never retained
  const good = extractMeasurement({ url: 'u', strategy: 'mobile', json: { lighthouseResult: makeLhr() } });
  assert.equal(provenanceSignature(bad.provenance).complete, false);
});

// ---------------------------------------------------------------------------
// LCP node layouts: legacy audit (flat + nested) and current lcp-phases-insight
// ---------------------------------------------------------------------------

test('LCP node: legacy flat/nested, insight-only direct node, deterministic precedence, never fabricated', () => {
  const legacyFlat = { 'largest-contentful-paint-element': { details: { items: [{ node: { selector: 'h1', nodeLabel: 'Title', snippet: '<h1>' } }] } } };
  const legacyNested = { 'largest-contentful-paint-element': { details: { items: [{ items: [{ node: { selector: 'img.hero', snippet: '<img>' } }, { phases: [] }] }, { phases: [] }] } } };
  const insightOnly = { 'lcp-phases-insight': { details: { items: [{ type: 'phase', id: 'TTFB' }, { type: 'node', selector: 'div.lede', snippet: '<div class="lede">' }] } } };

  assert.equal(pickLcpElement(legacyFlat).selector, 'h1');
  assert.equal(pickLcpElement(legacyFlat).provenance, 'lighthouse-audit:largest-contentful-paint-element');
  assert.equal(pickLcpElement(legacyNested).selector, 'img.hero');

  // regression: insight-only payloads used to lose their real node
  assert.equal(pickLcpElement(insightOnly).selector, 'div.lede');
  assert.equal(pickLcpElement(insightOnly).provenance, 'lighthouse-audit:lcp-phases-insight');

  // both present: the dedicated element audit wins (defined precedence)
  assert.equal(pickLcpElement({ ...legacyFlat, ...insightOnly }).selector, 'h1');

  // absent -> null; nodes are never invented
  assert.equal(pickLcpElement({ 'largest-contentful-paint-element': { details: { items: [] } }, 'lcp-phases-insight': { details: { items: [{ type: 'phase' }] } } }), null);
  assert.equal(pickLcpElement({}), null);
});

// ---------------------------------------------------------------------------
// Strict payload validation and failure classification
// ---------------------------------------------------------------------------

test('HTTP 200 with an empty payload is malformed-measurement, never success', () => {
  const parsed = parseSuccessPayload('{}');
  assert.equal(parsed.ok, true); // valid JSON…
  const validated = validateLighthouseResult(parsed.json);
  assert.equal(validated.ok, false); // …but no measurement
  assert.equal(validated.reasonCategory, 'malformed-measurement');
  assert.equal(parseSuccessPayload('not json').reasonCategory, 'malformed-measurement');
});

test('HTTP 200 with lighthouseResult.runtimeError is a Lighthouse navigation failure (allowlisted code only)', () => {
  const json = { lighthouseResult: makeLhr({ runtimeError: { code: 'ERRORED_DOCUMENT_REQUEST', message: 'Lighthouse was unable to reliably load the page' } }) };
  const validated = validateLighthouseResult(json);
  assert.equal(validated.ok, false);
  assert.equal(validated.reasonCategory, 'lighthouse-navigation-failure');
  assert.equal(validated.runtimeErrorCode, 'ERRORED_DOCUMENT_REQUEST');
  assert.doesNotMatch(JSON.stringify(validated), /unable to reliably load/); // message never retained
  assert.ok(FAILURE_CATEGORIES.includes(validated.reasonCategory));
});

test('missing required performance/LCP/CLS measurements is an incomplete measurement', () => {
  const lhr = makeLhr();
  delete lhr.audits['cumulative-layout-shift'];
  const validated = validateLighthouseResult({ lighthouseResult: lhr });
  assert.equal(validated.reasonCategory, 'malformed-measurement');
  assert.match(validated.detail, /CLS/);
});

// ---------------------------------------------------------------------------
// Bounded retry / one per-attempt deadline (headers AND body)
// ---------------------------------------------------------------------------

test('PSI API 500 retries are bounded at 3 attempts and the run still fails', async () => {
  let calls = 0;
  const sleeps = [];
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    fetchImpl: async () => { calls += 1; return errorResponse(500, 'raw provider body'); },
    sleep: async (ms) => { sleeps.push(ms); },
  });
  assert.equal(calls, 3);
  assert.equal(calls <= MAX_ATTEMPTS, true);
  assert.equal(entry.finalStatus, 'failed');
  assert.equal(entry.reasonCategory, 'psi-api-failure');
  assert.equal(entry.attempts, 3);
  assert.equal(entry.attemptLog.length, 3);
  assert.equal(sleeps.length, 2); // backoff between attempts only
  assert.equal(entry.usable, false);
  assert.doesNotMatch(JSON.stringify(entry), /raw provider body/); // body discarded
});

test('429 is retryable; 400 is not and never loops', async () => {
  let calls = 429;
  const retryable = await measureOne({ url: 'u', strategy: 'mobile' }, {
    fetchImpl: async () => { calls += 1; return errorResponse(429, 'rate limited'); },
    sleep: async () => {},
    maxAttempts: 2,
  });
  assert.equal(retryable.attempts, 2);

  calls = 0;
  const fatal = await measureOne({ url: 'u', strategy: 'mobile' }, {
    fetchImpl: async () => { calls += 1; return errorResponse(400, 'bad request'); },
    sleep: async () => {},
  });
  assert.equal(calls, 1); // non-retryable errors do not loop
  assert.equal(fatal.attempts, 1);
  assert.equal(fatal.reasonCategory, 'psi-api-failure');
  assert.equal(fatal.attemptLog[0].outcome, 'final');
});

test('network timeout is classified as timeout and retried within the bound', async () => {
  let calls = 0;
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    fetchImpl: async () => {
      calls += 1;
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    },
    sleep: async () => {},
  });
  assert.equal(calls, 3);
  assert.equal(entry.reasonCategory, 'timeout');
  assert.equal(entry.finalStatus, 'failed');
});

test('a stalled 200 body is bounded by the per-attempt deadline (never success)', async () => {
  let aborted = false;
  let settleBody;
  const slowBody = new Promise((r) => { settleBody = r; });
  const started = Date.now();
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    timeoutMs: 20,
    maxAttempts: 1,
    fetchImpl: async (url, { signal }) => {
      signal.addEventListener('abort', () => { aborted = true; });
      return { ok: true, status: 200, text: () => slowBody };
    },
    sleep: async () => {},
  });
  const elapsed = Date.now() - started;
  assert.equal(entry.reasonCategory, 'timeout'); // regression: used to await the body and report success
  assert.equal(entry.finalStatus, 'failed');
  assert.ok(elapsed < 200, `bounded, took ${elapsed}ms`);
  assert.equal(aborted, true); // cooperative readers see the abort too
  settleBody(JSON.stringify({ lighthouseResult: makeLhr() })); // late body: no unhandled effects
});

test('a stalled non-200 body keeps the known PSI status and stays timeout-classified', async () => {
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    timeoutMs: 15,
    maxAttempts: 2,
    fetchImpl: async () => ({ ok: false, status: 503, text: () => new Promise(() => {}) }),
    sleep: async () => {},
  });
  assert.equal(entry.reasonCategory, 'timeout');
  assert.equal(entry.psiHttpStatus, 503); // known status preserved through body failure
  assert.equal(entry.originHttpStatus, null);
  assert.equal(entry.attempts, 2); // timeout is retryable within the bound
  assert.equal(entry.attemptLog.every((l) => l.psiHttpStatus === 503), true);
});

test('a body transport reset is retried and recovers — never degraded into empty malformed JSON', async () => {
  let calls = 0;
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    maxAttempts: 3,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          status: 200,
          text: async () => { throw Object.assign(new Error('socket reset synthetic-zz9'), { code: 'ECONNRESET' }); },
        };
      }
      return jsonResponse({ lighthouseResult: makeLhr() });
    },
    sleep: async () => {},
  });
  assert.equal(entry.finalStatus, 'success'); // recovered on attempt 2
  assert.equal(entry.attempts, 2);
  assert.equal(entry.attemptLog[0].outcome, 'retryable'); // regression: was 'malformed-measurement' after 1 attempt
  assert.equal(entry.attemptLog[0].reasonCategory, 'psi-api-failure');
});

test('persistent body resets exhaust the bounded budget as transport failures (no raw text)', async () => {
  let calls = 0;
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => { throw Object.assign(new Error('synthetic-zz9 raw text'), { code: 'ECONNRESET' }); },
      };
    },
    sleep: async () => {},
  });
  assert.equal(calls, 3);
  assert.equal(entry.reasonCategory, 'psi-api-failure');
  assert.equal(entry.errorKind, 'transport');
  assert.equal(entry.errorMeta.networkCode, 'ECONNRESET');
  assert.equal(entry.error, 'psi-api-failure: transport failure (ECONNRESET)'); // fixed classification only
  assert.doesNotMatch(JSON.stringify(entry), /synthetic-zz9/);
});

test('genuine malformed HTTP 200 is non-retryable even with attempts remaining', async () => {
  let calls = 0;
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    maxAttempts: 3,
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, text: async () => 'definitely not json' };
    },
    sleep: async () => {},
  });
  assert.equal(calls, 1);
  assert.equal(entry.reasonCategory, 'malformed-measurement');
  assert.equal(entry.error, 'malformed-measurement: body is not valid JSON');
});

test('runtimeError and malformed 200 payloads are final, not retried', async () => {
  let calls = 0;
  const entry = await measureOne({ url: 'u', strategy: 'mobile' }, {
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ lighthouseResult: makeLhr({ runtimeError: { code: 'ERRORED_DOCUMENT_REQUEST', message: 'page load failed' } }) });
    },
    sleep: async () => {},
  });
  assert.equal(calls, 1);
  assert.equal(entry.reasonCategory, 'lighthouse-navigation-failure');
  assert.deepEqual(entry.lighthouseRuntimeError, { code: 'ERRORED_DOCUMENT_REQUEST' });
});

test('classifyHttpStatus/TransportError keep API status and origin status apart', () => {
  assert.equal(classifyHttpStatus(503).retryable, true);
  assert.equal(classifyHttpStatus(404).retryable, false);
  assert.equal(classifyTransportError(Object.assign(new Error('x'), { name: 'AbortError' })).reasonCategory, 'timeout');
  assert.equal(classifyTransportError(new Error('ECONNREFUSED')).reasonCategory, 'psi-api-failure');
});

test('PSI HTTP status is recorded as the API status and never as the origin status', async () => {
  const entry = await measureOne({ url: 'https://cubxxw.com/', strategy: 'mobile' }, {
    fetchImpl: async () => errorResponse(500, 'upstream'),
    sleep: async () => {},
  });
  assert.equal(entry.psiHttpStatus, 500);
  assert.equal(entry.originHttpStatus, null);
  assert.match(entry.error, /PSI API HTTP 500/);
  assert.doesNotMatch(entry.error, /origin.{0,5}500/i);
});

// ---------------------------------------------------------------------------
// Safe error boundary: fixed classifications + allowlisted metadata only
// ---------------------------------------------------------------------------

const SYNTH_KEY = 'sk-synthetic-9f8e7d6c5b4a'; // arbitrary, noncredential

const FAILURE_FETCHERS = {
  http: async () => errorResponse(403, JSON.stringify({ api_key: SYNTH_KEY, message: 'fixture failure body', refresh_token: SYNTH_KEY })),
  transport: async () => { throw new Error(`synthetic transport failure ${SYNTH_KEY}`); },
  'runtime-error': async () => jsonResponse({ lighthouseResult: makeLhr({ runtimeError: { code: `CODE-${SYNTH_KEY}`, message: `provider said ${SYNTH_KEY}` } }) }),
};

test('entries never retain provider bodies, exception text or runtimeError messages', async () => {
  const http = await measureOne({ url: 'u', strategy: 'mobile' }, { apiKey: SYNTH_KEY, fetchImpl: FAILURE_FETCHERS.http, sleep: async () => {}, maxAttempts: 1 });
  const httpText = JSON.stringify(http);
  assert.doesNotMatch(httpText, new RegExp(SYNTH_KEY));
  assert.doesNotMatch(httpText, /fixture failure body/);
  assert.doesNotMatch(httpText, /api_key|refresh_token/); // unrelated credential-like fields absent
  assert.equal(http.error, 'psi-api-failure: PSI API HTTP 403'); // fixed classification kept
  assert.equal(http.psiHttpStatus, 403);
  assert.equal(http.attempts, 1); // useful metadata kept

  const transport = await measureOne({ url: 'u', strategy: 'mobile' }, { apiKey: SYNTH_KEY, fetchImpl: FAILURE_FETCHERS.transport, sleep: async () => {}, maxAttempts: 1 });
  const transportText = JSON.stringify(transport);
  assert.doesNotMatch(transportText, new RegExp(SYNTH_KEY));
  assert.doesNotMatch(transportText, /synthetic transport failure/);
  assert.equal(transport.reasonCategory, 'psi-api-failure');

  const runtime = await measureOne({ url: 'u', strategy: 'mobile' }, { apiKey: SYNTH_KEY, fetchImpl: FAILURE_FETCHERS['runtime-error'], sleep: async () => {}, maxAttempts: 1 });
  const runtimeText = JSON.stringify(runtime);
  assert.doesNotMatch(runtimeText, new RegExp(SYNTH_KEY));
  assert.doesNotMatch(runtimeText, /provider said/);
  assert.deepEqual(runtime.lighthouseRuntimeError, { code: 'unknown' }); // non-allowlisted code -> unknown
  assert.equal(runtime.reasonCategory, 'lighthouse-navigation-failure');
});

test('CLI logs and written snapshots never contain provider text (HTTP, transport, runtime-error) with the default clock', async () => {
  for (const [kind, fetchImpl] of Object.entries(FAILURE_FETCHERS)) {
    const mockFs = makeMockFs({
      'cfg.json': JSON.stringify({ ci: { collect: { url: ['https://cubxxw.com/'] } } }),
    });
    const logs = [];
    const code = await main(['--config', 'cfg.json', '--dir', 'obs'], {
      // NO injected now: this exercises the real default-clock code path
      fetchImpl,
      sleep: async () => {},
      rateLimitMs: 0,
      apiKey: SYNTH_KEY,
      fs: mockFs,
      exists: (p) => mockFs.existsSync(p),
      random: () => 'f1x',
      log: (m) => logs.push(String(m)),
      warn: (m) => logs.push(String(m)),
      errorLog: (m) => logs.push(String(m)),
    });
    const outPath = [...mockFs.files.keys()].find((k) => k.startsWith('obs/psi-'));
    assert.ok(outPath, `${kind}: snapshot persisted via the default clock path`);
    const raw = mockFs.files.get(outPath);
    assert.equal(code, 1, `${kind}: all-failed run is never green`);
    assert.match(raw, /"fetchedAt": "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z"/); // real default clock
    const everything = raw + logs.join('\n');
    assert.doesNotMatch(everything, new RegExp(SYNTH_KEY), `${kind}: key absent from entries, logs and snapshot`);
    assert.doesNotMatch(everything, /fixture failure body|synthetic transport failure|provider said/);
    const snap = JSON.parse(raw);
    assert.equal(snap.measurements[0].errorKind, kind === 'runtime-error' ? 'runtime-error' : kind === 'http' ? 'http' : 'transport');
    assert.equal(snap.meta.runStatus, 'failed');
    assert.equal(snap.measurements[0].originHttpStatus, null);
  }
});

// ---------------------------------------------------------------------------
// Denominators: planned vs succeeded/partial/failed (15/26 and 22/26 shapes)
// ---------------------------------------------------------------------------

test('denominators: a 15/26 run is partial and never green', () => {
  const urls = Array.from({ length: 13 }, (_, i) => `https://cubxxw.com/p${i}/`);
  const plan = planMeasurements({ urls });
  const entries = plan.planned.map(({ url, strategy }, i) => makeEntry(url, strategy, i < 15 ? 'partial' : 'failed'));
  const { counts, runStatus } = summarizeEntries({ planned: plan.planned, entries });
  assert.equal(counts.planned, 26);
  assert.equal(counts.partial, 15);
  assert.equal(counts.failed, 11);
  assert.equal(counts.usable, 15);
  assert.equal(counts.byStrategy.mobile.planned, 13);
  assert.equal(runStatus, 'partial');
});

test('denominators: 22/26 fresh shape is partial; all failures can never be a green run', () => {
  const urls = Array.from({ length: 13 }, (_, i) => `https://cubxxw.com/p${i}/`);
  const plan = planMeasurements({ urls });
  const entries = plan.planned.map(({ url, strategy }, i) => makeEntry(url, strategy, i < 22 ? 'success' : 'failed'));
  const partialRun = summarizeEntries({ planned: plan.planned, entries });
  assert.deepEqual([partialRun.counts.succeeded, partialRun.counts.failed, partialRun.runStatus], [22, 4, 'partial']);

  const allFailed = plan.planned.map(({ url, strategy }) => makeEntry(url, strategy, 'failed'));
  const failedRun = summarizeEntries({ planned: plan.planned, entries: allFailed });
  assert.equal(failedRun.runStatus, 'failed');
  assert.notEqual(failedRun.runStatus, 'ok');
  assert.equal(failedRun.counts.usable, 0);

  const cleanRun = summarizeEntries({
    planned: plan.planned,
    entries: plan.planned.map(({ url, strategy }) => makeEntry(url, strategy, 'success')),
  });
  assert.equal(cleanRun.runStatus, 'ok');
});

// ---------------------------------------------------------------------------
// Snapshot shape and CLI behavior (guarded main, clear exits, no side effects)
// ---------------------------------------------------------------------------

test('buildSnapshot freezes the planned denominator and separates statuses', () => {
  const plan = planMeasurements({ urls: ['https://cubxxw.com/', 'https://cubxxw.com/zh/'] });
  const entries = [
    makeEntry('https://cubxxw.com/', 'mobile', 'success'),
    makeEntry('https://cubxxw.com/', 'desktop', 'failed'),
    makeEntry('https://cubxxw.com/zh/', 'mobile', 'partial'),
    makeEntry('https://cubxxw.com/zh/', 'desktop', 'failed'),
  ];
  const snap = buildSnapshot({
    plan,
    entries,
    meta: {
      runDate: '2026-09-24',
      startedAt: '2026-09-24T10:00:00.000Z',
      endedAt: '2026-09-24T10:05:00.000Z',
      endpoint: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
      apiKeyProvided: true,
      urlConfig: 'lighthouserc.json',
      categories: CATEGORIES,
      timeoutMs: 120000,
      maxAttempts: 3,
    },
  });
  assert.equal(snap.schema, 'psi-snapshot/2');
  assert.equal(snap.meta.fetchedAt, '2026-09-24T10:05:00.000Z');
  assert.deepEqual(snap.meta.planned, plan.planned);
  assert.equal(snap.meta.counts.planned, 4);
  assert.equal(snap.meta.runStatus, 'partial');
  assert.equal(snap.measurements.length, 4);
});

test('CLI: unknown arguments exit 1 with usage, --help exits 0 (guarded main, no import side effects)', () => {
  const bad = spawnSync(process.execPath, [SCRIPT, '--bogus'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown argument/);
  const help = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Exit: 0 = all planned measurements succeeded/);
});

test('CLI arg validation: bad --timeout-ms / --max-attempts / missing values fail clearly', () => {
  assert.throws(() => parseCliArgs(['--timeout-ms', '0']), /Invalid --timeout-ms/);
  assert.throws(() => parseCliArgs(['--max-attempts', '9']), /Invalid --max-attempts/);
  assert.throws(() => parseCliArgs(['--out']), /Missing value for --out/);
});

test('readConfiguredUrls reads the actual configured list and refuses to guess an empty one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-cfg-'));
  try {
    writeFileSync(join(dir, 'cfg.json'), JSON.stringify({ ci: { collect: { url: ['a', 'b'] } } }));
    assert.deepEqual(readConfiguredUrls(join(dir, 'cfg.json')), ['a', 'b']);
    writeFileSync(join(dir, 'empty.json'), JSON.stringify({ ci: { collect: {} } }));
    assert.throws(() => readConfiguredUrls(join(dir, 'empty.json')), /refusing to guess/);
    assert.throws(() => readConfiguredUrls(join(dir, 'missing.json')), /Cannot read URL config/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('main() dry-run reports the run status without writing (injected clock)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-main-'));
  try {
    writeFileSync(join(dir, 'cfg.json'), JSON.stringify({ ci: { collect: { url: ['https://cubxxw.com/'] } } }));
    let call = 0;
    const logs = [];
    const code = await main(['--dry-run', '--config', join(dir, 'cfg.json'), '--dir', dir], {
      fetchImpl: async () => {
        call += 1;
        return call === 1 ? jsonResponse({ lighthouseResult: makeLhr() }) : errorResponse(500, 'boom');
      },
      sleep: async () => {},
      apiKey: 'k',
      rateLimitMs: 0,
      now: () => new Date('2026-09-24T10:00:00.000Z'),
      log: (m) => logs.push(m),
      warn: () => {},
    });
    assert.equal(code, 2); // partial: 1 success + 1 failed
    assert.ok(logs.some((l) => /1 succeeded, 0 partial, 1 failed of 2 planned \(partial\)/.test(l)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Immutable persistence: same-day rerun appends, never replaces
// ---------------------------------------------------------------------------

test('same-day rerun appends a unique observation name and never replaces the first', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-persist-'));
  try {
    const first = pickObservationPath({ prefix: 'psi', runDate: '2026-09-24', dir, random: () => 'aaa' });
    assert.equal(first, `${dir}/psi-2026-09-24.json`);
    atomicWriteJson(first, { schema: 'psi-snapshot/2', meta: { fetchedAt: '2026-09-24T10:00:00.000Z' } });
    const second = pickObservationPath({
      prefix: 'psi',
      runDate: '2026-09-24',
      dir,
      now: new Date('2026-09-24T10:30:00.123Z'),
      random: () => 'bbb',
    });
    assert.match(second, /psi-2026-09-24-103000123Z-bbb\.json$/);
    atomicWriteJson(second, { schema: 'psi-snapshot/2', meta: { fetchedAt: '2026-09-24T10:30:00.123Z' } });
    // first file untouched
    assert.equal(JSON.parse(readFileSync(first, 'utf8')).meta.fetchedAt, '2026-09-24T10:00:00.000Z');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('explicit --out that exists is refused; atomic writes never clobber', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-clobber-'));
  try {
    const path = join(dir, 'out.json');
    writeFileSync(path, 'existing');
    assert.throws(() => pickObservationPath({ prefix: 'psi', runDate: '2026-09-24', out: path }), /Refusing to overwrite/);
    assert.throws(() => pickObservationPath({ prefix: 'psi', runDate: 'bad' }), /invalid runDate/);
    assert.throws(() => pickObservationPath({ prefix: 'gsc', runDate: '2026-09-24' }), /unsupported prefix/);

    const target = join(dir, 'new.json');
    atomicWriteJson(target, { a: 1 }, { random: () => 'zz' });
    assert.throws(() => atomicWriteJson(target, { a: 2 }, { random: () => 'zz' }), (err) => err.code === 'EEXIST');
    assert.deepEqual(JSON.parse(readFileSync(target, 'utf8')), { a: 1 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildRequestEndpoint carries the key only on the request URL (never stored in entries)', () => {
  const url = buildRequestEndpoint({ url: 'https://cubxxw.com/', strategy: 'mobile', categories: CATEGORIES, apiKey: 'SECRET' });
  assert.match(url, /key=SECRET/);
  assert.equal(buildRequestEndpoint({ url: 'u', strategy: 'mobile' }).includes('key='), false);
});

// ---------------------------------------------------------------------------
// Immutable PSI/CrUX observation discovery and selection (frozen at B1 handoff)
// ---------------------------------------------------------------------------

import {
  AS_OF_AFTER_CUTOFF_REASON,
  AS_OF_UNPROVABLE_REASON,
} from './lib/gsc-report-core.mjs';
import {
  compareCompatibleSamples,
  discoverObservationFiles,
  normalizeCruxSnapshot,
  normalizePsiSnapshot,
  parseDisplayNumber,
  selectCruxObservations,
  selectPsiObservations,
  validateCruxSnapshot,
} from './lib/seo-observations.mjs';
import { LEGACY_PSI_SCHEMA } from './lib/seo-observations.mjs';

const REAL_DATA_DIR = fileURLToPath(new URL('../data/seo/', import.meta.url));

function v2Entry(url, strategy, { finalStatus = 'success', version = '12.8.0', settings = makeSettings(), lcp = 2100, cls = 0.05, fetchTime = '2026-09-24T09:59:00.000Z' } = {}) {
  if (finalStatus === 'failed') return makeEntry(url, strategy, 'failed');
  const entry = extractMeasurement({
    url,
    strategy,
    json: { lighthouseResult: makeLhr({ lcpMs: lcp, cls, version, settings, fetchTime }) },
  });
  return { ...entry, finalStatus };
}

function v2Snapshot({ fetchedAt, entries }) {
  return {
    schema: 'psi-snapshot/2',
    meta: { runDate: fetchedAt.slice(0, 10), fetchedAt, planned: entries.map((e) => ({ url: e.url, strategy: e.strategy })) },
    measurements: entries,
  };
}

function legacyPsiSnapshot({ fetchedAt, urls = 1, results = [], failures = [] }) {
  return {
    meta: { fetchedAt, runDate: fetchedAt.slice(0, 10), strategies: ['mobile', 'desktop'], urls, failures: failures.length },
    results,
    failures,
  };
}

test('discovery matches frozen legacy daily and unique PSI/CrUX filenames only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-discovery-'));
  try {
    for (const name of [
      'psi-2026-09-24.json',
      'psi-2026-09-24-103000123Z-abc123.json',
      'crux-2026-09-24.json',
      'crux-2026-09-24-110000000Z-deadbeef.json',
      'gsc-2026-09-24.json',
      'psi-not-a-date.json',
      'indexable_tags.yml',
    ]) writeFileSync(join(dir, name), '{}');
    assert.deepEqual(discoverObservationFiles({ dir, kind: 'psi' }).map((f) => f.file), [
      'psi-2026-09-24-103000123Z-abc123.json',
      'psi-2026-09-24.json',
    ]);
    const crux = discoverObservationFiles({ dir, kind: 'crux' });
    assert.deepEqual(crux.map((f) => f.file), ['crux-2026-09-24-110000000Z-deadbeef.json', 'crux-2026-09-24.json']);
    assert.equal(crux[0].uniqueSuffix, '110000000Z-deadbeef');
    assert.equal(crux[1].uniqueSuffix, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('legacy CLS is precision-unknown with displayValue recovery only as explicit derived provenance', () => {
  const snap = legacyPsiSnapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    results: [
      {
        url: 'https://cubxxw.com/', strategy: 'mobile', finalUrl: 'https://cubxxw.com/', fetchTime: '2026-09-24T09:59:00.000Z',
        categories: { performance: 0.9 },
        metrics: {
          CLS: { numericValue: 0, displayValue: '0.104', score: 1 },
          LCP: { numericValue: 3382, displayValue: '3.4 s', score: 0.67 },
        },
        fieldData: null, originFieldData: null,
        diagnostics: { lcpElement: null, opportunities: [{ id: 'total-byte-weight', title: 'Total byte weight', wastedMs: 2785295, displayValue: 'Total size was 2,720 KiB' }, { id: 'unused-css-rules', wastedMs: 30, displayValue: 'Est savings of 118 KiB' }] },
      },
    ],
  });
  const norm = normalizePsiSnapshot(snap, 'psi-2026-09-24.json');
  assert.equal(norm.schema, LEGACY_PSI_SCHEMA);
  const cls = norm.entries[0].metrics.CLS;
  assert.equal(cls.numericValue, 0); // rounded value never pretends to be raw
  assert.equal(cls.precision, 'unknown-rounded');
  assert.deepEqual(cls.displayDerivedValue, {
    value: 0.104,
    provenance: 'derived:displayValue',
    note: 'Lighthouse display precision only; not raw numeric precision',
  });
  const lcp = norm.entries[0].metrics.LCP;
  assert.equal(lcp.precision, 'legacy-rounded');
  // byte vs ms cost reinterpretation with per-field provenance
  const { savingsMs, savingsBytes, transferBytes } = norm.entries[0].diagnostics.costs;
  assert.deepEqual(transferBytes.map((c) => [c.id, c.totalBytes, c.wastedMs, c.wastedBytes]), [['total-byte-weight', 2785295, null, null]]);
  assert.match(transferBytes[0].provenance.totalBytes, /legacy-reinterpreted/);
  assert.deepEqual(savingsMs.map((c) => [c.id, c.wastedMs]), [['unused-css-rules', 30]]);
  assert.deepEqual(savingsBytes, []); // legacy byte savings unrecoverable -> null, never fabricated
  assert.equal(norm.entries[0].finalStatus, 'partial'); // legacy provenance incomplete
  assert.equal(norm.entries[0].usable, true);
  assert.equal(parseDisplayNumber('0.212'), 0.212);
  assert.equal(parseDisplayNumber('3.4 s'), null);

  // no displayValue -> nothing is fabricated
  const bare = legacyPsiSnapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    results: [{ url: 'u', strategy: 'mobile', metrics: { CLS: { numericValue: 0, displayValue: null } }, diagnostics: {} }],
  });
  const bareCls = normalizePsiSnapshot(bare, 'x.json').entries[0].metrics.CLS;
  assert.equal(bareCls.displayDerivedValue, null);
  assert.equal(bareCls.precision, 'unknown-rounded');
});

test('legacy failure rows republish only fixed classification, never raw collector text', () => {
  const snap = legacyPsiSnapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    failures: [{ url: 'https://cubxxw.com/', strategy: 'mobile', error: 'PSI mobile https://cubxxw.com/ → 500: {"error":{"message":"key=sk-synthetic-legacy1"}}' }],
  });
  const entry = normalizePsiSnapshot(snap, 'psi-2026-09-24.json').entries[0];
  const text = JSON.stringify(entry);
  assert.doesNotMatch(text, /sk-synthetic-legacy1/);
  assert.doesNotMatch(text, /Lighthouse returned error/);
  assert.equal(entry.error, 'psi-api-failure: PSI API HTTP 500');
  assert.equal(entry.psiHttpStatus, 500);
});

test('real history: psi-2026-09-23.json reads as 15 usable / 11 failed of 26 planned', () => {
  const json = JSON.parse(readFileSync(join(REAL_DATA_DIR, 'psi-2026-09-23.json'), 'utf8'));
  const norm = normalizePsiSnapshot(json, 'psi-2026-09-23.json');
  assert.equal(norm.entries.length, 26);
  const usable = norm.entries.filter((e) => e.usable).length;
  const failed = norm.entries.filter((e) => e.finalStatus === 'failed').length;
  assert.equal(usable, 15);
  assert.equal(failed, 11);
  assert.equal(norm.plannedCount, 26); // 13 configured URLs × 2 strategies
  for (const e of norm.entries.filter((x) => x.finalStatus === 'failed')) {
    assert.equal(e.reasonCategory, 'psi-api-failure'); // PSI API 500s, never "origin 500"
    assert.equal(e.psiHttpStatus, 500);
    assert.equal(e.originHttpStatus, null);
    assert.doesNotMatch(e.error ?? '', /origin/);
    assert.doesNotMatch(e.error ?? '', /Lighthouse returned error/); // raw body not republished
  }
});

test('real history: psi-2026-09-24.json reads as 22 usable / 4 failed of 26 planned', () => {
  const json = JSON.parse(readFileSync(join(REAL_DATA_DIR, 'psi-2026-09-24.json'), 'utf8'));
  const norm = normalizePsiSnapshot(json, 'psi-2026-09-24.json');
  assert.equal(norm.plannedCount, 26);
  assert.equal(norm.entries.filter((e) => e.usable).length, 22);
  assert.equal(norm.entries.filter((e) => e.finalStatus === 'failed').length, 4);
  assert.equal(norm.counts.planned, 26);
  assert.equal(norm.counts.missing, 0);
  assert.equal(norm.counts.duplicate, 0);
  assert.equal(norm.counts.unplanned, 0);
  assert.equal(norm.runStatus, 'partial'); // never green on partial coverage
});

test('same-day observations: cutoff between them replays the first, later cutoff exposes the failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-cutoff-'));
  try {
    const first = v2Snapshot({
      fetchedAt: '2026-09-24T10:00:00.000Z',
      entries: [v2Entry('https://cubxxw.com/', 'mobile')],
    });
    const second = v2Snapshot({
      fetchedAt: '2026-09-24T10:30:00.000Z',
      entries: [v2Entry('https://cubxxw.com/', 'mobile', { finalStatus: 'failed' })],
    });
    // Repeated persistence never replaces the first: both files persist.
    writeFileSync(join(dir, 'psi-2026-09-24.json'), JSON.stringify(first));
    writeFileSync(join(dir, 'psi-2026-09-24-103000000Z-abc123.json'), JSON.stringify(second));

    const early = selectPsiObservations({ dir, asOf: '2026-09-24T10:15:00.000Z' });
    assert.equal(early.observations.length, 1); // second is after the cutoff
    assert.equal(early.excluded[0].reason, AS_OF_AFTER_CUTOFF_REASON);
    const earlyTarget = early.byTarget.find((t) => t.url === 'https://cubxxw.com/');
    assert.equal(earlyTarget.current.entry.finalStatus, 'success');
    assert.equal(earlyTarget.lastGood.label, 'current');

    const late = selectPsiObservations({ dir, asOf: '2026-09-24T11:00:00.000Z' });
    assert.equal(late.observations.length, 2);
    const t = late.byTarget.find((x) => x.url === 'https://cubxxw.com/');
    assert.equal(t.sampleCount, 2); // nothing replaced
    assert.equal(t.currentOutcome, 'failed'); // current failure stays visible
    assert.equal(t.current.observation.file, 'psi-2026-09-24-103000000Z-abc123.json');
    assert.equal(t.lastGood.label.startsWith('labelled-last-good'), true); // older success, labelled
    assert.equal(t.lastGood.observation.file, 'psi-2026-09-24.json');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a failed stage with no new file cannot be substituted by an old daily observation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-nofile-'));
  try {
    writeFileSync(join(dir, 'psi-2026-09-20.json'), JSON.stringify(v2Snapshot({
      fetchedAt: '2026-09-20T10:00:00.000Z',
      entries: [v2Entry('https://cubxxw.com/', 'mobile')],
    })));
    // A later failed stage produced no artifact; selection reports the old
    // file as current WITH its actual timestamp — never as fresh evidence.
    const sel = selectPsiObservations({ dir, asOf: '2026-09-24T12:00:00.000Z' });
    assert.equal(sel.observations.length, 1);
    const t = sel.byTarget[0];
    assert.equal(t.current.observation.observedAt, '2026-09-20T10:00:00.000Z');
    assert.equal(t.sampleCount, 1);
    assert.equal(sel.observations[0].observedAtBasis, 'meta.fetchedAt');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('missing/invalid fetchedAt cannot prove eligibility and is excluded fail-closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-unprovable-'));
  try {
    const snap = v2Snapshot({ fetchedAt: '2026-09-24T10:00:00.000Z', entries: [v2Entry('u', 'mobile')] });
    snap.meta.fetchedAt = 'not-a-timestamp';
    writeFileSync(join(dir, 'psi-2026-09-24.json'), JSON.stringify(snap));
    const sel = selectPsiObservations({ dir, asOf: '2026-09-24T11:00:00.000Z' });
    assert.equal(sel.observations.length, 0);
    assert.equal(sel.excluded[0].reason, AS_OF_UNPROVABLE_REASON);
    assert.equal(sel.unprovable[0].reason, AS_OF_UNPROVABLE_REASON);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CrUX validator: notEligible is a successful query with no sample; error/invalid records are not success', () => {
  const base = { meta: { fetchedAt: '2026-09-24T10:00:00.000Z', runDate: '2026-09-24', origin: 'https://cubxxw.com', formFactors: ['PHONE', 'DESKTOP'] } };
  assert.deepEqual(validateCruxSnapshot({ ...base, results: [] }).problems, []);
  assert.equal(validateCruxSnapshot({ meta: {}, results: 'x' }).ok, false);

  const norm = normalizeCruxSnapshot({
    ...base,
    results: [
      { formFactor: 'PHONE', notEligible: true },
      { formFactor: 'DESKTOP', error: 'CrUX DESKTOP -> 500: boom sk-synthetic-crux1' },
    ],
  }, 'crux-2026-09-24.json');
  const byFactor = Object.fromEntries(norm.formFactors.map((f) => [f.formFactor, f]));
  assert.equal(norm.runStatus, 'partial');
  assert.equal(byFactor.PHONE.status, 'no-sample'); // successful query, field data unknown (never zero)
  assert.equal(byFactor.DESKTOP.status, 'failed');
  assert.doesNotMatch(JSON.stringify(byFactor.DESKTOP), /sk-synthetic-crux1/); // raw error text not retained

  // HTTP 200 missing/invalid record is not success
  const invalid = normalizeCruxSnapshot({ ...base, results: [{ formFactor: 'PHONE', record: null }] }, 'crux-2026-09-24.json');
  assert.equal(invalid.formFactors.find((f) => f.formFactor === 'PHONE').status, 'invalid');
  assert.equal(invalid.runStatus, 'failed');

  // a missing plan or identity can never certify completeness
  const noPlan = normalizeCruxSnapshot({ meta: { fetchedAt: '2026-09-24T10:00:00.000Z', origin: 'https://cubxxw.com' }, results: [{ formFactor: 'PHONE', notEligible: true }] }, 'crux-2026-09-24.json');
  assert.equal(noPlan.runStatus, 'uncertified');
  assert.equal(noPlan.planCertified, false);
});

test('CrUX History shape: period-aligned values, numeric-string CLS, latest period for freshness', () => {
  const periods = [
    { firstDate: { year: 2026, month: 7, day: 1 }, lastDate: { year: 2026, month: 7, day: 31 } },
    { firstDate: { year: 2026, month: 8, day: 1 }, lastDate: { year: 2026, month: 8, day: 31 } },
  ];
  const record = {
    key: { origin: 'https://cubxxw.com', formFactor: 'PHONE' },
    collectionPeriods: periods,
    metrics: {
      largest_contentful_paint: {
        histogramTimeseries: [
          { start: 0, end: 2500, densities: [0.8, 'NaN'] },
          { start: 2500, end: 4000, densities: [0.1, null] },
          { start: 4000, densities: [0.1, null] },
        ],
        percentilesTimeseries: { p75s: [2300, null] },
      },
      cumulative_layout_shift: { percentilesTimeseries: { p75s: ['0.21', 'NaN'] } },
    },
  };
  const norm = normalizeCruxSnapshot({
    meta: { fetchedAt: '2026-09-24T12:00:00Z', runDate: '2026-09-24', origin: 'https://cubxxw.com', formFactors: ['PHONE'] },
    results: [{ formFactor: 'PHONE', record }],
  }, 'crux-2026-09-24.json');
  assert.equal(norm.runStatus, 'ok'); // valid history whose latest period has no sample
  const phone = norm.formFactors[0];
  assert.equal(phone.status, 'no-sample'); // latest period unknown — never zero
  assert.equal(phone.latestPeriodStatus, 'no-sample');
  assert.equal(phone.sampledPeriods, 1);
  assert.deepEqual(phone.latestPeriod, { firstDate: '2026-08-01', lastDate: '2026-08-31' }); // actual latest period date for freshness
  const lcp = phone.metrics.largest_contentful_paint;
  assert.equal(lcp.unit, 'ms');
  assert.equal(lcp.periods[0].p75, 2300);
  assert.equal(lcp.periods[0].sample, 'sampled');
  assert.equal(lcp.periods[0].histogram.length, 3);
  assert.equal(lcp.periods[1].p75, null); // null percentiles: no sample, never zero
  assert.ok(lcp.periods[1].histogram.every((h) => h.density === null)); // string "NaN" densities -> no sample
  const cls = phone.metrics.cumulative_layout_shift;
  assert.equal(cls.unit, 'unitless'); // CLS is never milliseconds
  assert.equal(cls.periods[0].p75, 0.21); // numeric string parsed
  assert.equal(cls.periods[1].sample, 'no-sample');
});

test('CrUX strict validation: overlapping rolling windows are labelled; reversed/duplicate/unordered and mismatched lengths are never sampled success', () => {
  const meta = { fetchedAt: '2026-09-24T12:00:00Z', origin: 'https://cubxxw.com', formFactors: ['PHONE'] };
  const rec = (periods, p75s = [2300], densities = [0.5]) => ({
    key: { origin: 'https://cubxxw.com', formFactor: 'PHONE' },
    collectionPeriods: periods,
    metrics: { largest_contentful_paint: { histogramTimeseries: [{ start: 0, densities }], percentilesTimeseries: { p75s } } },
  });
  const one = [{ firstDate: { year: 2026, month: 8, day: 1 }, lastDate: { year: 2026, month: 8, day: 31 } }];

  // POSITIVE: normal weekly rolling 28-day windows overlap by design
  const rolling = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: rec([
    { firstDate: { year: 2026, month: 8, day: 17 }, lastDate: { year: 2026, month: 9, day: 13 } },
    { firstDate: { year: 2026, month: 8, day: 24 }, lastDate: { year: 2026, month: 9, day: 20 } },
  ], [2300, 2200], [0.5, 0.4]) }] }, 'crux-2026-09-24.json');
  const phone = rolling.formFactors[0];
  assert.equal(phone.status, 'sampled');
  assert.equal(phone.error, null);
  assert.equal(phone.overlappingWindows, true); // overlap labelled, never summed
  assert.deepEqual(phone.metrics.largest_contentful_paint.periods.map((p) => p.p75), [2300, 2200]);
  assert.deepEqual(phone.latestPeriod, { firstDate: '2026-08-24', lastDate: '2026-09-20' });
  assert.equal(rolling.runStatus, 'ok');

  const badDate = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: rec([{ firstDate: { year: 2026, month: 13, day: 99 }, lastDate: { year: 2026, month: 13, day: 99 } }]) }] }, 'crux-2026-09-24.json');
  assert.equal(badDate.formFactors[0].status, 'invalid');
  assert.equal(badDate.runStatus, 'failed');

  const reversed = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: rec([{ firstDate: { year: 2026, month: 9, day: 21 }, lastDate: { year: 2026, month: 9, day: 20 } }]) }] }, 'crux-2026-09-24.json');
  assert.equal(reversed.formFactors[0].status, 'invalid');

  const unordered = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: rec([
    { firstDate: { year: 2026, month: 8, day: 15 }, lastDate: { year: 2026, month: 9, day: 15 } },
    one[0],
  ], [2300, 2400], [0.5, 0.5]) }] }, 'crux-2026-09-24.json');
  assert.equal(unordered.formFactors[0].status, 'invalid');
  assert.ok(unordered.problems.some((p) => /unordered or duplicate/.test(p)));

  const duplicate = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: rec([...one, ...one], [2300, 2300], [0.5, 0.5]) }] }, 'crux-2026-09-24.json');
  assert.equal(duplicate.formFactors[0].status, 'invalid');

  const mismatched = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: rec(one, [2300, 2400]) }] }, 'crux-2026-09-24.json');
  assert.equal(mismatched.formFactors[0].status, 'invalid');
  assert.ok(mismatched.problems.some((p) => /mismatched time-series length/.test(p)));
});

test('CrUX official nested fractionTimeseries: aligned values preserved, NaN is no sample', () => {
  const meta = { fetchedAt: '2026-09-24T12:00:00Z', origin: 'https://cubxxw.com', formFactors: ['PHONE'] };
  const one = [{ firstDate: { year: 2026, month: 8, day: 24 }, lastDate: { year: 2026, month: 9, day: 20 } }];
  const record = (nav) => ({
    key: { origin: 'https://cubxxw.com', formFactor: 'PHONE' },
    collectionPeriods: one,
    metrics: {
      largest_contentful_paint: { percentilesTimeseries: { p75s: [2200] } },
      cumulative_layout_shift: { percentilesTimeseries: { p75s: ['0.21'] } },
      navigation_types: { fractionTimeseries: nav },
    },
  });
  const norm = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: record({ navigate: { fractions: [0.6] }, reload: { fractions: [0.4] } }) }] }, 'crux-2026-09-24.json');
  const nav = norm.formFactors[0].metrics.navigation_types;
  assert.equal(norm.formFactors[0].status, 'sampled'); // valid navigation_types never invalidates the record
  assert.deepEqual(nav.periods[0].fractions, { navigate: 0.6, reload: 0.4 }); // named fractions kept per period
  assert.equal(nav.unit, 'categorical');
  assert.equal(norm.formFactors[0].metrics.cumulative_layout_shift.periods[0].p75, 0.21); // CLS numeric string, unitless

  const unknown = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: record({ navigate: { fractions: ['NaN'] }, reload: { fractions: [null] } }) }] }, 'crux-2026-09-24.json');
  // LCP/CLS still sample the period, but the fraction metric itself is no sample
  assert.equal(unknown.formFactors[0].metrics.navigation_types.periods[0].sample, 'no-sample');
  assert.deepEqual(unknown.formFactors[0].metrics.navigation_types.periods[0].fractions, { navigate: null, reload: null });
  // a record whose only metric is all-unknown fractions is no sample overall
  const navOnly = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: { key: { origin: 'https://cubxxw.com', formFactor: 'PHONE' }, collectionPeriods: one, metrics: { navigation_types: { fractionTimeseries: { navigate: { fractions: ['NaN'] }, reload: { fractions: [null] } } } } } }] }, 'crux-2026-09-24.json');
  assert.equal(navOnly.formFactors[0].status, 'no-sample'); // never zero, never invalid

  const badLength = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', record: record({ navigate: { fractions: [0.6, 0.5] } }) }] }, 'crux-2026-09-24.json');
  assert.equal(badLength.formFactors[0].status, 'invalid'); // genuine length mismatch stays visible
});

test('CrUX plan/identity: missing factors cannot certify ok; record key must match the observation identity', () => {
  const meta = { fetchedAt: '2026-09-24T12:00:00Z', origin: 'https://cubxxw.com', formFactors: ['PHONE', 'DESKTOP'] };
  // both explicit notEligible rows are valid successful no-sample
  const both = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', notEligible: true }, { formFactor: 'DESKTOP', notEligible: true }] }, 'crux-2026-09-24.json');
  assert.equal(both.runStatus, 'ok');
  assert.ok(both.formFactors.every((f) => f.status === 'no-sample'));

  // one notEligible row leaves DESKTOP missing — never successful no-sample
  const one = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', notEligible: true }] }, 'crux-2026-09-24.json');
  assert.notEqual(one.runStatus, 'ok');
  assert.equal(one.formFactors.find((f) => f.formFactor === 'DESKTOP').status, 'missing');

  // empty results against a 2-factor plan cannot certify ok either
  const none = normalizeCruxSnapshot({ meta, results: [] }, 'crux-2026-09-24.json');
  assert.notEqual(none.runStatus, 'ok');
  assert.equal(none.formFactors.filter((f) => f.status === 'missing').length, 2);

  // duplicate + unexpected rows cannot certify complete collection
  const messy = normalizeCruxSnapshot({ meta, results: [{ formFactor: 'PHONE', notEligible: true }, { formFactor: 'PHONE', notEligible: true }, { formFactor: 'TABLET', notEligible: true }] }, 'crux-2026-09-24.json');
  assert.notEqual(messy.runStatus, 'ok');
  assert.ok(messy.formFactors.some((f) => f.duplicate));
  assert.ok(messy.formFactors.some((f) => f.unexpected));

  // a record of another origin is never blended in
  const foreign = normalizeCruxSnapshot({
    meta,
    results: [{ formFactor: 'PHONE', record: { key: { origin: 'https://evil.example', formFactor: 'PHONE' }, collectionPeriods: [{ firstDate: { year: 2026, month: 8, day: 1 }, lastDate: { year: 2026, month: 8, day: 31 } }], metrics: { largest_contentful_paint: { percentilesTimeseries: { p75s: [2300] } } } } }],
  }, 'crux-2026-09-24.json');
  assert.equal(foreign.formFactors.find((f) => f.formFactor === 'PHONE').status, 'invalid');
  assert.ok(foreign.problems.some((p) => /origin does not match/.test(p)));
});

test('CrUX selection groups by origin; different origins are never blended', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crux-origin-'));
  try {
    const snap = (fetchedAt, origin, formFactor) => ({ meta: { fetchedAt, origin, formFactors: [formFactor] }, results: [{ formFactor, notEligible: true }] });
    writeFileSync(join(dir, 'crux-2026-09-23.json'), JSON.stringify(snap('2026-09-23T10:00:00.000Z', 'https://cubxxw.com', 'PHONE')));
    writeFileSync(join(dir, 'crux-2026-09-24.json'), JSON.stringify(snap('2026-09-24T10:00:00.000Z', 'https://other.example', 'PHONE')));
    const sel = selectCruxObservations({ dir, asOf: '2026-09-24T11:00:00.000Z' });
    assert.equal(sel.byFormFactor.length, 2); // separate origin×factor groups
    assert.deepEqual(sel.byFormFactor.map((g) => g.origin), ['https://cubxxw.com', 'https://other.example']);
    for (const g of sel.byFormFactor) assert.equal(g.sampleCount, 1); // no cross-origin substitution
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PSI planned slots: 1 of 2 cannot certify ok; duplicates/unplanned rows never inflate the denominator', () => {
  const plan = planMeasurements({ urls: ['https://cubxxw.com/'] });
  const partial = summarizeEntries({ planned: plan.planned, entries: [makeEntry('https://cubxxw.com/', 'mobile', 'success')] });
  assert.equal(partial.runStatus, 'partial'); // regression: used to report ok
  assert.equal(partial.counts.missing, 1);
  assert.equal(partial.counts.planned, 2);

  const dup = summarizeEntries({
    planned: plan.planned,
    entries: [
      makeEntry('https://cubxxw.com/', 'mobile', 'success'),
      makeEntry('https://cubxxw.com/', 'mobile', 'success'), // duplicate row
      makeEntry('https://cubxxw.com/', 'desktop', 'success'),
      makeEntry('https://cubxxw.com/extra/', 'mobile', 'success'), // unplanned row
    ],
  });
  assert.equal(dup.counts.planned, 2);
  assert.equal(dup.counts.duplicate, 1);
  assert.equal(dup.counts.unplanned, 1);
  assert.notEqual(dup.runStatus, 'ok'); // noisy observation cannot certify complete

  const complete = summarizeEntries({ planned: plan.planned, entries: [makeEntry('https://cubxxw.com/', 'mobile', 'success'), makeEntry('https://cubxxw.com/', 'desktop', 'success')] });
  assert.equal(complete.runStatus, 'ok');

  const twoOfTwentySix = summarizeEntries({
    planned: planMeasurements({ urls: Array.from({ length: 13 }, (_, i) => `https://cubxxw.com/p${i}/`) }).planned,
    entries: Array.from({ length: 13 * 2 }, (_, i) => makeEntry(`https://cubxxw.com/p${Math.floor(i / 2)}/`, i % 2 ? 'desktop' : 'mobile', i < 22 ? 'success' : 'failed')),
  });
  assert.equal(twoOfTwentySix.counts.missing, 0);
  assert.deepEqual([twoOfTwentySix.counts.succeeded, twoOfTwentySix.counts.failed], [22, 4]);
});

test('a later planned slot with no row is current unknown — never backfilled from an older success', () => {
  const dir = mkdtempSync(join(tmpdir(), 'psi-miss-'));
  try {
    writeFileSync(join(dir, 'psi-2026-09-23.json'), JSON.stringify(v2Snapshot({
      fetchedAt: '2026-09-23T10:00:00.000Z',
      entries: [v2Entry('https://cubxxw.com/', 'mobile')],
    })));
    // later observation PLANS the slot but records nothing for it
    writeFileSync(join(dir, 'psi-2026-09-24.json'), JSON.stringify({
      schema: 'psi-snapshot/2',
      meta: { runDate: '2026-09-24', fetchedAt: '2026-09-24T10:00:00.000Z', planned: [{ url: 'https://cubxxw.com/', strategy: 'mobile' }] },
      measurements: [],
    }));
    const sel = selectPsiObservations({ dir, asOf: '2026-09-24T11:00:00.000Z' });
    const t = sel.byTarget[0];
    assert.equal(t.currentOutcome, 'missing'); // regression: older success used to show as current
    assert.equal(t.current.slotStatus, 'missing');
    assert.equal(t.lastGood.observation.file, 'psi-2026-09-23.json');
    assert.match(t.lastGood.label, /^labelled-last-good/);
    assert.equal(sel.observations[1].counts.missing, 1);
    assert.equal(sel.observations[1].runStatus, 'failed'); // no usable rows in the later observation

    // a cutoff between the observations replays the older success as current
    const early = selectPsiObservations({ dir, asOf: '2026-09-23T23:00:00.000Z' });
    assert.equal(early.byTarget[0].currentOutcome, 'success');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('normalizePsiSnapshot keeps the recorded plan and flags duplicate/unplanned rows', () => {
  const snap = v2Snapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    entries: [v2Entry('https://cubxxw.com/', 'mobile'), v2Entry('https://cubxxw.com/', 'mobile', { lcp: 999 })],
  });
  snap.meta.planned = [
    { url: 'https://cubxxw.com/', strategy: 'mobile' },
    { url: 'https://cubxxw.com/', strategy: 'desktop' },
    { url: 'https://cubxxw.com/zh/', strategy: 'mobile' },
  ];
  const norm = normalizePsiSnapshot(snap, 'psi-2026-09-24.json');
  assert.deepEqual(norm.slots.map((s) => s.status), ['measured', 'missing', 'missing']);
  assert.equal(norm.entries.filter((e) => e.duplicate).length, 1);
  assert.equal(norm.counts.planned, 3);
  assert.equal(norm.counts.missing, 2);
  assert.equal(norm.counts.duplicate, 1);
  assert.equal(norm.runStatus, 'partial');
  assert.ok(norm.problems.some((p) => /duplicate measurement row/.test(p.problem)));

  const unplannedSnap = v2Snapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    entries: [v2Entry('https://cubxxw.com/extra/', 'mobile')],
  });
  unplannedSnap.meta.planned = [{ url: 'https://cubxxw.com/', strategy: 'mobile' }]; // recorded plan excludes the row
  const unplanned = normalizePsiSnapshot(unplannedSnap, 'psi-2026-09-24.json');
  assert.equal(unplanned.entries[0].unplanned, true);
  assert.equal(unplanned.counts.unplanned, 1);
  assert.equal(unplanned.counts.planned, 1);
  assert.equal(unplanned.counts.missing, 1);
});

test('CrUX selection keeps current and labelled last-good per form factor', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crux-sel-'));
  try {
    const snap = (fetchedAt, phone) => ({
      meta: { fetchedAt, runDate: fetchedAt.slice(0, 10), origin: 'https://cubxxw.com' },
      results: [phone],
    });
    writeFileSync(join(dir, 'crux-2026-09-20.json'), JSON.stringify(snap('2026-09-20T10:00:00.000Z', { formFactor: 'PHONE', notEligible: true })));
    writeFileSync(join(dir, 'crux-2026-09-24-120000000Z-abc.json'), JSON.stringify(snap('2026-09-24T12:00:00.000Z', { formFactor: 'PHONE', error: 'boom' })));
    const sel = selectCruxObservations({ dir, asOf: '2026-09-24T13:00:00.000Z' });
    const phone = sel.byFormFactor[0];
    assert.equal(phone.currentOutcome, 'failed');
    assert.equal(phone.lastGood.entry.status, 'no-sample');
    assert.match(phone.lastGood.label, /^labelled-last-good/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('compatible-sample comparison: complete matching provenance compares, all mismatches withheld', () => {
  const good = v2Entry('u', 'mobile', { lcp: 2000, cls: 0.05 });
  const worse = v2Entry('u', 'mobile', { lcp: 2600, cls: 0.09 });
  const cmp = compareCompatibleSamples(worse, good);
  assert.equal(cmp.compatible, true);
  assert.equal(cmp.deltas.LCP.delta, 600);
  assert.equal(cmp.deltas.CLS.unit, 'unitless');

  const otherVersion = v2Entry('u', 'mobile', { lcp: 2600, version: '11.0.0' });
  assert.match(compareCompatibleSamples(otherVersion, good).reason, /tool version or emulation\/throttling settings differ/);

  const otherSettings = v2Entry('u', 'mobile', { lcp: 2600, settings: makeSettings({ throttlingMethod: 'provided' }) });
  assert.equal(compareCompatibleSamples(otherSettings, good).compatible, false);

  // differing CPU/RTT/DPR/locale are incompatible too
  for (const tweak of [{ cpuSlowdownMultiplier: 8 }, { rttMs: 300 }, { deviceScaleFactor: 3 }, { locale: 'zh-CN' }]) {
    const other = v2Entry('u', 'mobile', { lcp: 2600, settings: makeSettings(tweak) });
    assert.equal(compareCompatibleSamples(other, good).compatible, false, `must withhold for ${JSON.stringify(tweak)}`);
  }

  // missing/invalid settings or dates make compatibility unprovable
  const badDate = v2Entry('u', 'mobile', { lcp: 2600, fetchTime: 'not-a-date' });
  const badCmp = compareCompatibleSamples(badDate, good);
  assert.equal(badCmp.compatible, false);
  assert.match(badCmp.reason, /incomplete measurement provenance/);

  // Legacy evidence lacks version/settings entirely -> withheld, not guessed.
  const legacyEntry = normalizePsiSnapshot(legacyPsiSnapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    results: [{ url: 'u', strategy: 'mobile', metrics: { CLS: { numericValue: 0, displayValue: '0.05' }, LCP: { numericValue: 2000 } }, diagnostics: {} }],
  }), 'x.json').entries[0];
  const legacyCmp = compareCompatibleSamples(good, legacyEntry);
  assert.equal(legacyCmp.compatible, false);
  assert.match(legacyCmp.reason, /incomplete measurement provenance|final URL missing/);
});

test('comparisons refuse rounded CLS without display precision but allow labelled display-derived', () => {
  const legacyEntry = (displayValue) => normalizePsiSnapshot(legacyPsiSnapshot({
    fetchedAt: '2026-09-24T10:00:00.000Z',
    results: [{ url: 'u', strategy: 'mobile', metrics: { CLS: { numericValue: 0, displayValue }, LCP: { numericValue: 2000 } }, diagnostics: {} }],
  }), 'x.json').entries[0];
  // two legacy entries are mutually unproven -> withheld before precision
  assert.equal(compareCompatibleSamples(legacyEntry('0.05'), legacyEntry('0.1')).compatible, false);
  // precision handling in isolation: rounded CLS without display is missing
  const noDisplay = legacyEntry(null).metrics.CLS;
  const withDisplay = legacyEntry('0.104').metrics.CLS;
  assert.equal(noDisplay.displayDerivedValue, null);
  assert.equal(withDisplay.displayDerivedValue.value, 0.104);
  assert.equal(withDisplay.displayDerivedValue.provenance, 'derived:displayValue');
});
