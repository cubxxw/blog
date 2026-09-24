// PSI v5 measurement core: planning, transport with bounded retry, strict
// payload validation, failure classification and precise metric extraction.
//
// Design rules (issue #392 / batch B, PSI early-review repairs):
//   * Metric precision is preserved exactly (CLS 0.212 stays 0.212); units are
//     explicit and byte costs are never conflated with millisecond costs.
//   * null always means unknown — never zero.
//   * A PSI API HTTP status is the *API's* status, never the origin's. The
//     origin's HTTP status is not observed through PSI and stays null.
//   * Failure categories are explicit and separate from success:
//       - 'psi-api-failure'               transport/HTTP failure of the PSI call
//       - 'lighthouse-navigation-failure' Lighthouse could not load the page
//       - 'timeout'                       bounded request timeout
//       - 'malformed-measurement'         HTTP 2xx but unusable payload
//   * Attempts, reason category and final status are tracked separately;
//     retry is bounded (max 3 attempts) and only for 429/selected 5xx/network
//     failures. Non-retryable errors (including genuinely malformed HTTP 2xx
//     bodies) never loop.
//   * ONE per-attempt deadline covers response headers AND body consumption,
//     aborting on expiry even for non-cooperative body readers. A transport
//     failure while reading the body stays a transport failure (with any known
//     PSI HTTP status preserved) and is retried under the same bounded policy —
//     it is never degraded into an empty "malformed JSON" measurement.
//   * Published entries, logs and snapshots carry FIXED classifications and
//     allowlisted metadata only: no raw provider bodies, no arbitrary exception
//     messages, no runtimeError message text. Pattern redaction and truncation
//     are not treated as a security boundary. Runtime error codes are kept only
//     from a small allowlist; everything else becomes 'unknown'.
//   * Measurement provenance preserves an allowlisted, stable representation of
//     the settings that affect results (tool version, throttling parameters,
//     full screen emulation, locale, emulated UA, validated timestamp, URLs).
//     Arbitrary config keys (e.g. extraHeaders) are never retained.
//   * CrUX field data (loadingExperience) is independent from the laboratory
//     measurement: no sample stays unknown and never blocks lab success.
//
// Everything here is importable and pure except measureOne(), which takes an
// injectable fetch/sleep. There are no import side effects.

import { isValidUtcTimestamp } from './gsc-dates.mjs';

export const PSI_SNAPSHOT_SCHEMA = 'psi-snapshot/2';
export const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
export const STRATEGIES = ['mobile', 'desktop'];
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
export const MAX_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT_MS = 120000;
export const DEFAULT_BACKOFF_MS = 1000;

export const FAILURE_CATEGORIES = [
  'psi-api-failure',
  'lighthouse-navigation-failure',
  'timeout',
  'malformed-measurement',
];

export const FINAL_STATUSES = ['success', 'partial', 'failed', 'missing'];

// Units are part of the value contract: CLS is unitless and fractional,
// paint/timing metrics are milliseconds, costs are explicitly ms or bytes.
export const METRIC_UNITS = {
  LCP: 'ms',
  FCP: 'ms',
  CLS: 'unitless',
  TBT: 'ms',
  SI: 'ms',
  TTI: 'ms',
};

const METRIC_AUDITS = {
  LCP: 'largest-contentful-paint',
  FCP: 'first-contentful-paint',
  CLS: 'cumulative-layout-shift',
  TBT: 'total-blocking-time',
  SI: 'speed-index',
  TTI: 'interactive',
};

// ---------------------------------------------------------------------------
// Cost extraction semantics (not unit assumptions):
//   * savings come from the audit's explicit `details.overallSavingsMs` /
//     `details.overallSavingsBytes` fields when present;
//   * otherwise an audit's `numericValue` is interpreted ONLY with its own
//     `numericUnit` (`millisecond` / `byte`) and only for known opportunity
//     audits;
//   * `total-byte-weight` measures TOTAL transfer size — it is never labelled
//     removable waste.
// Legacy-v1 rows predate numericUnit and are reinterpreted separately in
// seo-observations.mjs against the legacy map below (verified against real
// historical displayValue strings).
// ---------------------------------------------------------------------------

export const TOTAL_TRANSFER_AUDITS = new Set(['total-byte-weight']);

export const OPPORTUNITY_AUDITS = new Set([
  'render-blocking-resources',
  'server-response-time',
  'redirects',
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
]);

// Legacy-only reinterpretation of what the old collector stored as `wastedMs`
// (audit numericValue): millisecond for opportunity audits, total bytes for
// total-byte-weight. Evidence: real 2026-09 historical rows (e.g.
// unused-css-rules wastedMs 10..150 with KiB displayValues, total-byte-weight
// 2,785,295 with "2,720 KiB" display).
export const LEGACY_COST_AUDIT_UNITS = {
  ...Object.fromEntries([...OPPORTUNITY_AUDITS, 'render-blocking-resources'].map((id) => [id, 'ms'])),
  'total-byte-weight': 'bytes',
};

const NUMERIC_UNIT_MAP = { millisecond: 'ms', byte: 'byte' };

// Allowlisted metadata vocabularies (fixed classification boundary).
const KNOWN_REQUIRED_FIELDS = new Set([
  'categories.performance.score',
  'audits.largest-contentful-paint.numericValue (LCP)',
  'audits.cumulative-layout-shift.numericValue (CLS)',
]);
const KNOWN_RUNTIME_ERROR_CODES = new Set([
  'ERRORED_DOCUMENT_REQUEST',
  'FAILED_DOCUMENT_REQUEST',
  'ERRORED_PAGE',
  'NO_FCP',
  'PAGE_HUNG',
  'PROTOCOL_TIMEOUT',
]);
const KNOWN_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_ABORTED',
]);
const THROTTLING_KEYS = [
  'rttMs',
  'throughputKbps',
  'requestLatencyMs',
  'downloadThroughputKbps',
  'uploadThroughputKbps',
  'cpuSlowdownMultiplier',
];
const SCREEN_EMULATION_KEYS = ['mobile', 'width', 'height', 'deviceScaleFactor', 'disabled'];

const BOUND_UA = 300;

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boundedIdentifier(value, allowlist) {
  return typeof value === 'string' && allowlist.has(value) ? value : 'unknown';
}

function boundedString(value, limit) {
  if (typeof value !== 'string' || value === '') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '');
  return cleaned.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Input planning: the planned denominator is the actual configured URL count
// after de-duplication, crossed with strategies. Every planned URL×strategy is
// one measurement slot; nothing else inflates or shrinks the denominator.
// ---------------------------------------------------------------------------

export function planMeasurements({ urls, strategies = STRATEGIES } = {}) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('planMeasurements: urls must be a non-empty array of URL strings');
  }
  const seen = new Set();
  const deduped = [];
  for (const u of urls) {
    if (typeof u !== 'string' || u.trim() === '') {
      throw new Error('planMeasurements: invalid URL entry'); // never echo untrusted input
    }
    if (seen.has(u)) continue;
    seen.add(u);
    deduped.push(u);
  }
  const cleanStrategies = [];
  for (const s of strategies) {
    if (!STRATEGIES.includes(s)) {
      throw new Error('planMeasurements: unknown strategy');
    }
    if (!cleanStrategies.includes(s)) cleanStrategies.push(s);
  }
  if (cleanStrategies.length === 0) throw new Error('planMeasurements: at least one strategy required');
  const planned = [];
  for (const url of deduped) {
    for (const strategy of cleanStrategies) planned.push({ url, strategy });
  }
  return {
    planned,
    urlCount: deduped.length,
    configuredUrlCount: urls.length,
    duplicatesRemoved: urls.length - deduped.length,
    strategies: cleanStrategies,
  };
}

export function buildRequestEndpoint({ url, strategy, categories = CATEGORIES, apiKey = '' } = {}) {
  const params = new URLSearchParams();
  params.set('url', url);
  params.set('strategy', strategy);
  for (const c of categories) params.append('category', c);
  if (apiKey) params.set('key', apiKey);
  return `${PSI_ENDPOINT}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Failure classification (fixed categories; retry bounded)
// ---------------------------------------------------------------------------

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]); // 429 + selected 5xx

export function classifyHttpStatus(status) {
  const numeric = Number(status);
  if (!Number.isInteger(numeric) || numeric < 100) {
    return { reasonCategory: 'psi-api-failure', retryable: false };
  }
  return {
    reasonCategory: 'psi-api-failure',
    retryable: RETRYABLE_STATUSES.has(numeric),
  };
}

export function classifyTransportError(err) {
  const name = err?.name ?? '';
  const message = String(err?.message ?? '');
  if (name === 'AbortError' || name === 'TimeoutError' || /timed?\s*out|ETIMEDOUT/i.test(message)) {
    return { reasonCategory: 'timeout', retryable: true };
  }
  // Other network-level failures (including body-read resets) are transport
  // failures of the PSI call — retryable within the bounded budget, and never
  // an origin status claim.
  return { reasonCategory: 'psi-api-failure', retryable: true };
}

// ---------------------------------------------------------------------------
// Strict payload validation (HTTP 2xx is not success by itself)
// ---------------------------------------------------------------------------

export function parseSuccessPayload(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reasonCategory: 'malformed-measurement', detail: 'body is not valid JSON' };
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, reasonCategory: 'malformed-measurement', detail: 'response JSON is not an object' };
  }
  return { ok: true, json };
}

// Success requires: a lighthouseResult without runtimeError and the required
// performance/LCP/CLS measurements. Anything less is classified explicitly —
// never silently treated as a measurement.
export function validateLighthouseResult(json) {
  const lhr = json?.lighthouseResult;
  if (!lhr || typeof lhr !== 'object' || Array.isArray(lhr)) {
    return { ok: false, reasonCategory: 'malformed-measurement', detail: 'missing lighthouseResult object', missingFields: ['lighthouseResult'] };
  }
  if (lhr.runtimeError && typeof lhr.runtimeError === 'object') {
    // Fixed classification + allowlisted code only: the runtimeError message
    // is free provider text and is never retained or logged.
    const code = boundedIdentifier(lhr.runtimeError.code, KNOWN_RUNTIME_ERROR_CODES);
    return {
      ok: false,
      reasonCategory: 'lighthouse-navigation-failure',
      detail: `runtimeError code ${code}`,
      runtimeErrorCode: code,
    };
  }
  const audits = lhr.audits ?? {};
  const missing = [];
  if (typeof lhr.categories?.performance?.score !== 'number') missing.push('categories.performance.score');
  for (const [metric, auditId] of [['LCP', METRIC_AUDITS.LCP], ['CLS', METRIC_AUDITS.CLS]]) {
    const v = audits?.[auditId]?.numericValue;
    if (typeof v !== 'number' || !Number.isFinite(v)) missing.push(`audits.${auditId}.numericValue (${metric})`);
  }
  if (missing.length > 0) {
    const fields = missing.filter((f) => KNOWN_REQUIRED_FIELDS.has(f));
    return {
      ok: false,
      reasonCategory: 'malformed-measurement',
      detail: `incomplete measurement: missing ${fields.join(', ')}`,
      missingFields: fields,
    };
  }
  return { ok: true, lhr };
}

// ---------------------------------------------------------------------------
// Measurement extraction (precision-preserving)
// ---------------------------------------------------------------------------

export function extractMetric(audits, id, unit) {
  const a = audits?.[id];
  if (!a) return null;
  return {
    unit,
    numericValue: finiteOrNull(a.numericValue),
    displayValue: typeof a.displayValue === 'string' ? a.displayValue : null,
    score: typeof a.score === 'number' ? a.score : null,
    precision: 'raw',
    provenance: `lighthouse-audit:${id}.numericValue`,
  };
}

// ---------------------------------------------------------------------------
// LCP node extraction: the dedicated legacy audit first, then the current
// `lcp-phases-insight` direct node entries (both layouts of the legacy audit:
// nested `{ items: [{ node }] }` and flat `{ node }`). Deterministic
// precedence, the exact source audit is retained as provenance, and nodes are
// never fabricated when absent.
// ---------------------------------------------------------------------------

function findNodeInAudit(audit, depth = 3) {
  if (!audit || typeof audit !== 'object') return null;
  const walk = (items, level) => {
    if (!Array.isArray(items) || level > depth) return null;
    for (const it of items) {
      if (!it || typeof it !== 'object') continue;
      if (it.node && typeof it.node.selector === 'string') return it.node;
      // lcp-phases-insight direct entries: { type: 'node', selector, snippet, ... }
      if (typeof it.selector === 'string' && (it.type === 'node' || it.type === undefined)) return it;
      if (Array.isArray(it.items)) {
        const found = walk(it.items, level + 1);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(audit.details?.items, 0);
}

export function pickLcpElement(audits) {
  const sources = [
    ['largest-contentful-paint-element', 'lighthouse-audit:largest-contentful-paint-element'],
    ['lcp-phases-insight', 'lighthouse-audit:lcp-phases-insight'],
  ];
  for (const [auditId, provenance] of sources) {
    const node = findNodeInAudit(audits?.[auditId]);
    if (node) {
      return {
        selector: boundedString(node.selector, 240),
        nodeLabel: boundedString(node.nodeLabel, 240),
        snippet: boundedString(node.snippet, 240),
        provenance,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Diagnostic costs: explicit savings values with per-field provenance; total
// transfer is distinct from removable waste; unknown/missing savings stay null.
// A zero-ms / nonzero-byte audit survives on its bytes.
// ---------------------------------------------------------------------------

function costRow(audits, id) {
  const a = audits?.[id];
  if (!a || typeof a !== 'object') return null;
  const isTotalTransfer = TOTAL_TRANSFER_AUDITS.has(id);
  const isOpportunity = OPPORTUNITY_AUDITS.has(id);
  const prov = { wastedMs: null, wastedBytes: null, totalBytes: null };
  let wastedMs = null;
  let wastedBytes = null;
  let totalBytes = null;

  // Explicit savings fields are the primary evidence.
  if (a.details && typeof a.details === 'object') {
    if ('overallSavingsMs' in a.details) {
      wastedMs = finiteOrNull(a.details.overallSavingsMs);
      if (wastedMs !== null) {
        if (wastedMs < 0) wastedMs = null;
        else prov.wastedMs = `lighthouse-audit:${id}.details.overallSavingsMs`;
      }
    }
    if ('overallSavingsBytes' in a.details) {
      wastedBytes = finiteOrNull(a.details.overallSavingsBytes);
      if (wastedBytes !== null) {
        if (wastedBytes < 0) wastedBytes = null;
        else prov.wastedBytes = `lighthouse-audit:${id}.details.overallSavingsBytes`;
      }
    }
  }

  const numeric = finiteOrNull(a.numericValue);
  const numericUnit = NUMERIC_UNIT_MAP[a.numericUnit] ?? null;
  if (isTotalTransfer) {
    // total-byte-weight measures TOTAL transfer size — never removable waste.
    if (numeric !== null && numeric > 0 && numericUnit === 'byte') {
      totalBytes = numeric;
      prov.totalBytes = `lighthouse-audit:${id}.numericValue (numericUnit=byte; total transfer, not removable waste)`;
    }
  } else if (isOpportunity && numeric !== null && numeric > 0 && numericUnit !== null) {
    // Fallback only when explicit savings are absent: numericValue is read
    // with the audit's OWN numericUnit — never assumed from the audit ID.
    if (wastedMs === null && prov.wastedMs === null && numericUnit === 'ms') {
      wastedMs = numeric;
      prov.wastedMs = `lighthouse-audit:${id}.numericValue (numericUnit=millisecond)`;
    }
    if (wastedBytes === null && prov.wastedBytes === null && numericUnit === 'byte') {
      wastedBytes = numeric;
      prov.wastedBytes = `lighthouse-audit:${id}.numericValue (numericUnit=byte)`;
    }
  }

  if (!isTotalTransfer && !isOpportunity && prov.wastedMs === null && prov.wastedBytes === null) {
    return null; // unknown audit without explicit savings evidence: no cost claim
  }
  const anyPositive = (wastedMs ?? 0) > 0 || (wastedBytes ?? 0) > 0 || (totalBytes ?? 0) > 0;
  if (!anyPositive) return null; // no observed cost (explicit zeros without waste)
  return {
    id,
    title: typeof a.title === 'string' ? a.title : null,
    displayValue: typeof a.displayValue === 'string' ? a.displayValue : null,
    wastedMs,
    wastedBytes,
    totalBytes,
    provenance: prov,
  };
}

export function pickCosts(audits, { limit = 3 } = {}) {
  const rows = [];
  const seen = new Set();
  for (const id of [...OPPORTUNITY_AUDITS, ...TOTAL_TRANSFER_AUDITS]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = costRow(audits, id);
    if (row) rows.push(row);
  }
  // Explicit savings fields also qualify unknown opportunity audits.
  for (const [id, a] of Object.entries(audits ?? {})) {
    if (seen.has(id) || !a || typeof a !== 'object') continue;
    const hasSavings = ('overallSavingsMs' in (a.details ?? {})) || ('overallSavingsBytes' in (a.details ?? {}));
    if (!hasSavings) continue;
    const row = costRow(audits, id);
    if (row) rows.push(row);
  }
  const savingsMs = rows.filter((r) => r.wastedMs !== null && r.wastedMs > 0)
    .sort((x, y) => y.wastedMs - x.wastedMs || x.id.localeCompare(y.id))
    .slice(0, limit);
  const savingsBytes = rows.filter((r) => (r.wastedBytes ?? 0) > 0)
    .sort((x, y) => y.wastedBytes - x.wastedBytes || x.id.localeCompare(y.id))
    .slice(0, limit);
  const transferBytes = rows.filter((r) => (r.totalBytes ?? 0) > 0)
    .sort((x, y) => y.totalBytes - x.totalBytes || x.id.localeCompare(y.id))
    .slice(0, limit);
  return { savingsMs, savingsBytes, transferBytes };
}

function pickFieldData(le) {
  if (!le || typeof le !== 'object') {
    return { status: 'unknown', overallCategory: null, metrics: null };
  }
  const metrics = le.metrics && typeof le.metrics === 'object' ? le.metrics : {};
  const keys = Object.keys(metrics);
  if (keys.length === 0) {
    // Explicitly observed with no field sample: unknown values, never zeros.
    return { status: 'no-sample', overallCategory: typeof le.overall_category === 'string' ? le.overall_category : null, metrics: null };
  }
  const out = {};
  for (const k of keys.sort()) {
    const v = metrics[k] ?? {};
    out[k] = {
      percentile: finiteOrNull(v.percentile),
      category: typeof v.category === 'string' ? v.category : null,
    };
  }
  return { status: 'sampled', overallCategory: typeof le.overall_category === 'string' ? le.overall_category : null, metrics: out };
}

// ---------------------------------------------------------------------------
// Measurement provenance: stable, allowlisted, completeness-checked.
// Only keys that affect measurement semantics are retained (throttling
// parameters, full screen emulation, locale, emulated UA, tool version, URLs,
// validated timestamp). Arbitrary config keys (extraHeaders, custom flags) are
// dropped — they can carry credentials and never justify a comparison claim.
// ---------------------------------------------------------------------------

export function pickProvenance(lhr) {
  const settings = lhr.configSettings && typeof lhr.configSettings === 'object' && !Array.isArray(lhr.configSettings)
    ? lhr.configSettings
    : null;
  const rawThrottling = settings?.throttling && typeof settings.throttling === 'object' ? settings.throttling : null;
  const rawScreen = settings?.screenEmulation && typeof settings.screenEmulation === 'object' ? settings.screenEmulation : null;
  const throttling = {};
  for (const key of THROTTLING_KEYS) throttling[key] = rawThrottling ? finiteOrNull(rawThrottling[key]) : null;
  const screenEmulation = {
    mobile: typeof rawScreen?.mobile === 'boolean' ? rawScreen.mobile : null,
    width: finiteOrNull(rawScreen?.width),
    height: finiteOrNull(rawScreen?.height),
    deviceScaleFactor: finiteOrNull(rawScreen?.deviceScaleFactor),
    disabled: typeof rawScreen?.disabled === 'boolean' ? rawScreen.disabled : null,
  };
  const fetchTimeRaw = typeof lhr.fetchTime === 'string' ? lhr.fetchTime : null;
  return {
    fetchTime: fetchTimeRaw !== null && isValidUtcTimestamp(fetchTimeRaw) ? fetchTimeRaw : null,
    lighthouseVersion: boundedString(lhr.lighthouseVersion, 64),
    configSettings: settings
      ? {
          formFactor: boundedString(settings.formFactor, 32),
          throttlingMethod: boundedString(settings.throttlingMethod, 32),
          throttling,
          screenEmulation,
          locale: boundedString(settings.locale, 32),
          emulatedUserAgent: boundedString(settings.emulatedUserAgent, BOUND_UA),
        }
      : null,
    requestedUrl: boundedString(lhr.requestedUrl, 2048),
    finalUrl: boundedString(lhr.finalDisplayedUrl ?? lhr.finalUrl, 2048),
  };
}

// Completeness of the supported provenance: every measurement-affecting field
// must be present and valid, or compatibility is unprovable (fail closed).
export function provenanceSignature(provenance) {
  const missing = [];
  const p = provenance ?? {};
  if (!isValidUtcTimestamp(p.fetchTime ?? null)) missing.push('fetchTime');
  if (!p.lighthouseVersion) missing.push('lighthouseVersion');
  const s = p.configSettings;
  if (!s) {
    missing.push('configSettings');
  } else {
    if (!s.formFactor) missing.push('configSettings.formFactor');
    if (!s.throttlingMethod) missing.push('configSettings.throttlingMethod');
    if (!s.locale) missing.push('configSettings.locale');
    if (!s.emulatedUserAgent) missing.push('configSettings.emulatedUserAgent');
    for (const key of THROTTLING_KEYS) {
      if (!s.throttling || s.throttling[key] === null) missing.push(`configSettings.throttling.${key}`);
    }
    for (const key of SCREEN_EMULATION_KEYS) {
      if (!s.screenEmulation || s.screenEmulation[key] === null) missing.push(`configSettings.screenEmulation.${key}`);
    }
  }
  const complete = missing.length === 0;
  return {
    complete,
    missing,
    signature: complete
      ? JSON.stringify([p.lighthouseVersion, s.formFactor, s.throttlingMethod, THROTTLING_KEYS.map((k) => s.throttling[k]), SCREEN_EMULATION_KEYS.map((k) => s.screenEmulation[k]), s.locale, s.emulatedUserAgent])
      : null,
  };
}

function provenanceCaveats(provenance) {
  const { missing } = provenanceSignature(provenance);
  return missing.map((field) => `measurement provenance incomplete: ${field} missing or invalid (comparisons against versioned samples are withheld)`);
}

export function pickSeoAudits(audits) {
  const out = {};
  for (const id of ['meta-description', 'document-title']) {
    const a = audits?.[id];
    out[id] = a
      ? {
          score: typeof a.score === 'number' ? a.score : null,
          displayValue: typeof a.displayValue === 'string' ? a.displayValue : null,
          title: typeof a.title === 'string' ? a.title : null,
        }
      : null;
  }
  return out;
}

export function extractMeasurement({ url, strategy, json, attemptLog = [], attempts = 1 }) {
  const lhr = json.lighthouseResult;
  const audits = lhr.audits ?? {};
  const cats = lhr.categories ?? {};
  const provenance = pickProvenance(lhr);
  const caveats = provenanceCaveats(provenance);
  const metrics = {};
  for (const [name, unit] of Object.entries(METRIC_UNITS)) {
    metrics[name] = extractMetric(audits, METRIC_AUDITS[name], unit);
  }
  return {
    url,
    strategy,
    finalStatus: caveats.length === 0 ? 'success' : 'partial',
    usable: true,
    reasonCategory: null,
    reasonBasis: null,
    attempts,
    attemptLog,
    psiHttpStatus: 200,
    // PSI HTTP status is the API's status. The origin's status is not observed
    // through PSI and is always null here.
    originHttpStatus: null,
    lighthouseRuntimeError: null,
    error: null,
    provenance,
    caveats,
    scores: {
      performance: typeof cats.performance?.score === 'number' ? cats.performance.score : null,
      accessibility: typeof cats.accessibility?.score === 'number' ? cats.accessibility.score : null,
      'best-practices': typeof cats['best-practices']?.score === 'number' ? cats['best-practices'].score : null,
      seo: typeof cats.seo?.score === 'number' ? cats.seo.score : null,
    },
    metrics,
    fieldData: pickFieldData(json.loadingExperience),
    originFieldData: pickFieldData(json.originLoadingExperience),
    seoAudits: pickSeoAudits(audits),
    diagnostics: {
      lcpElement: pickLcpElement(audits),
      costs: pickCosts(audits),
    },
  };
}

// ---------------------------------------------------------------------------
// Fixed failure classification text. Only these templates plus allowlisted
// metadata (numeric HTTP status, attempt counts, allowlisted codes and fixed
// field names) ever reach entries, logs or snapshots. Raw provider bodies and
// arbitrary exception messages are never retained — pattern redaction and
// truncation are not a security boundary.
// ---------------------------------------------------------------------------

const ERROR_TEMPLATES = {
  http: (m) => `psi-api-failure: PSI API HTTP ${m.status ?? 'unknown'}`,
  transport: (m) => `psi-api-failure: transport failure (${m.networkCode ?? 'network-error'})`,
  timeout: (m) => `timeout: per-attempt deadline exceeded (${m.timeoutMs ?? 'unknown'} ms)`,
  payload: (m) => `malformed-measurement: ${m.payloadDetail ?? 'unusable payload'}`,
  'runtime-error': (m) => `lighthouse-navigation-failure: runtimeError code ${m.runtimeErrorCode ?? 'unknown'}`,
  legacy: () => 'psi-api-failure: legacy failure (raw collector text not retained)',
};

const PAYLOAD_DETAILS = new Set([
  'body is not valid JSON',
  'response JSON is not an object',
  'missing lighthouseResult object',
]);

export function extractFailure({
  url,
  strategy,
  reasonCategory,
  reasonBasis,
  errorKind,
  errorMeta = {},
  psiHttpStatus = null,
  runtimeErrorCode = null,
  attemptLog = [],
  attempts = 1,
}) {
  const kind = Object.hasOwn(ERROR_TEMPLATES, errorKind) ? errorKind : 'transport';
  const meta = {
    status: Number.isInteger(errorMeta.status) ? errorMeta.status : psiHttpStatus,
    networkCode: boundedIdentifier(errorMeta.networkCode, KNOWN_NETWORK_CODES),
    timeoutMs: Number.isInteger(errorMeta.timeoutMs) ? errorMeta.timeoutMs : null,
    runtimeErrorCode: boundedIdentifier(errorMeta.runtimeErrorCode ?? runtimeErrorCode, KNOWN_RUNTIME_ERROR_CODES),
    payloadDetail: PAYLOAD_DETAILS.has(errorMeta.payloadDetail) ? errorMeta.payloadDetail : 'unusable payload',
  };
  if (Array.isArray(errorMeta.missingFields) && errorMeta.missingFields.length > 0) {
    const fields = errorMeta.missingFields.filter((f) => KNOWN_REQUIRED_FIELDS.has(f));
    if (fields.length > 0) meta.payloadDetail = `incomplete measurement: missing ${fields.join(', ')}`;
  }
  return {
    url,
    strategy,
    finalStatus: 'failed',
    usable: false,
    reasonCategory,
    reasonBasis: reasonBasis ?? null,
    attempts,
    attemptLog,
    psiHttpStatus,
    originHttpStatus: null,
    lighthouseRuntimeError: kind === 'runtime-error' ? { code: meta.runtimeErrorCode } : null,
    error: ERROR_TEMPLATES[kind](meta),
    errorKind: kind,
    errorMeta: meta,
    provenance: null,
    caveats: [],
    scores: null,
    metrics: null,
    fieldData: null,
    originFieldData: null,
    seoAudits: null,
    diagnostics: null,
  };
}

// ---------------------------------------------------------------------------
// Bounded transport: ONE per-attempt deadline covers headers AND body. On
// expiry the request aborts (cooperative readers) and the pending read rejects
// (non-cooperative readers). Any known PSI HTTP status is preserved on
// transport failures of the body.
// ---------------------------------------------------------------------------

async function requestOnce(endpoint, { fetchImpl, timeoutMs }) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let rejectDeadline;
  const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => {
    const err = new Error('per-attempt deadline exceeded');
    err.name = 'AbortError';
    controller?.abort();
    rejectDeadline(err);
  }, timeoutMs);
  let status = null;
  try {
    const response = await Promise.race([fetchImpl(endpoint, controller ? { signal: controller.signal } : {}), deadline]);
    const parsedStatus = Number(response?.status);
    status = Number.isInteger(parsedStatus) ? parsedStatus : null;
    const text = await Promise.race([response.text(), deadline]);
    return { status, ok: Boolean(response?.ok), text: typeof text === 'string' ? text : '' };
  } catch (err) {
    // Body/transport errors propagate as transport failures — never as an
    // empty "malformed" body. Preserve any known PSI HTTP status.
    if (status !== null && typeof err === 'object') err.psiHttpStatus = status;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function measureOne({ url, strategy }, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.min(Math.max(Number(deps.maxAttempts ?? MAX_ATTEMPTS), 1), MAX_ATTEMPTS);
  const backoffMs = deps.backoffMs ?? DEFAULT_BACKOFF_MS;
  const categories = deps.categories ?? CATEGORIES;
  const apiKey = deps.apiKey ?? '';
  const endpoint = buildRequestEndpoint({ url, strategy, categories, apiKey });
  const attemptLog = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const last = attempt === maxAttempts;
    const finish = (entry) => ({ ...entry, attempts: attempt, attemptLog });

    let response;
    try {
      response = await requestOnce(endpoint, { fetchImpl, timeoutMs });
    } catch (err) {
      const cls = classifyTransportError(err);
      const knownStatus = Number.isInteger(err?.psiHttpStatus) ? err.psiHttpStatus : null;
      attemptLog.push({
        attempt,
        outcome: last || !cls.retryable ? 'final' : 'retryable',
        reasonCategory: cls.reasonCategory,
        psiHttpStatus: knownStatus,
      });
      if (last || !cls.retryable) {
        return finish(extractFailure({
          url,
          strategy,
          reasonCategory: cls.reasonCategory,
          reasonBasis: cls.reasonCategory === 'timeout'
            ? 'request exceeded the single per-attempt deadline (headers and body)'
            : 'transport failure of the PSI call (never an origin status)',
          errorKind: cls.reasonCategory === 'timeout' ? 'timeout' : 'transport',
          errorMeta: {
            status: knownStatus,
            networkCode: err?.code,
            timeoutMs,
          },
          psiHttpStatus: knownStatus,
          attemptLog,
          attempts: attempt,
        }));
      }
      await sleep(backoffMs * 2 ** (attempt - 1));
      continue;
    }

    const psiHttpStatus = response.status;
    if (!(response.status >= 200 && response.status < 300)) {
      const cls = classifyHttpStatus(psiHttpStatus);
      // The response body is deliberately discarded: raw provider text is not
      // a safe log or snapshot payload.
      attemptLog.push({
        attempt,
        outcome: last || !cls.retryable ? 'final' : 'retryable',
        reasonCategory: cls.reasonCategory,
        psiHttpStatus,
      });
      if (last || !cls.retryable) {
        return finish(extractFailure({
          url,
          strategy,
          reasonCategory: 'psi-api-failure',
          reasonBasis: `PSI API returned HTTP ${psiHttpStatus}; this is the PSI endpoint's status, never the origin's status`,
          errorKind: 'http',
          errorMeta: { status: psiHttpStatus },
          psiHttpStatus,
          attemptLog,
          attempts: attempt,
        }));
      }
      await sleep(backoffMs * 2 ** (attempt - 1));
      continue;
    }

    // Genuine malformed HTTP 2xx bodies are non-retryable: the request
    // succeeded and retrying would not fix a payload shape problem.
    const parsed = parseSuccessPayload(response.text);
    if (!parsed.ok) {
      attemptLog.push({ attempt, outcome: 'final', reasonCategory: parsed.reasonCategory, psiHttpStatus });
      return finish(extractFailure({
        url,
        strategy,
        reasonCategory: parsed.reasonCategory,
        reasonBasis: parsed.detail,
        errorKind: 'payload',
        errorMeta: { payloadDetail: parsed.detail, status: psiHttpStatus },
        psiHttpStatus,
        attemptLog,
        attempts: attempt,
      }));
    }
    const validated = validateLighthouseResult(parsed.json);
    if (!validated.ok) {
      attemptLog.push({ attempt, outcome: 'final', reasonCategory: validated.reasonCategory, psiHttpStatus });
      return finish(extractFailure({
        url,
        strategy,
        reasonCategory: validated.reasonCategory,
        reasonBasis: validated.detail,
        errorKind: validated.reasonCategory === 'lighthouse-navigation-failure' ? 'runtime-error' : 'payload',
        errorMeta: {
          status: psiHttpStatus,
          runtimeErrorCode: validated.runtimeErrorCode,
          payloadDetail: validated.detail,
          missingFields: validated.missingFields,
        },
        psiHttpStatus,
        attemptLog,
        attempts: attempt,
      }));
    }
    attemptLog.push({ attempt, outcome: 'success', reasonCategory: null, psiHttpStatus });
    return finish(extractMeasurement({ url, strategy, json: parsed.json, attemptLog, attempts: attempt }));
  }
  /* istanbul ignore next: loop always returns */
  throw new Error('measureOne: unreachable');
}

// ---------------------------------------------------------------------------
// Run summary: planned denominator vs succeeded/partial/failed/missing, per
// strategy. The denominator is the recorded plan, never the returned rows:
// missing planned slots stay visible (unknown outcome, never a measured zero),
// and duplicate or unplanned rows never inflate the denominator or certify a
// complete run. All failures — or incomplete coverage — can never produce a
// green run.
// ---------------------------------------------------------------------------

export function summarizeEntries({ planned, entries }) {
  const byStrategy = {};
  const counts = {
    planned: planned.length,
    succeeded: 0,
    partial: 0,
    failed: 0,
    missing: 0,
    usable: 0,
    duplicate: 0,
    unplanned: 0,
  };
  const plannedKeys = new Set();
  planned.forEach((p, i) => {
    const key = p.unrecorded ? `\u0000unrecorded-${i}` : `${p.url}\u0000${p.strategy}`;
    plannedKeys.add(key);
    if (!byStrategy[p.strategy]) byStrategy[p.strategy] = { planned: 0, succeeded: 0, partial: 0, failed: 0, missing: 0, usable: 0 };
    byStrategy[p.strategy].planned += 1;
  });
  const filled = new Set();
  const countStatus = (slot, e) => {
    if (e.finalStatus === 'success') { counts.succeeded += 1; if (slot) slot.succeeded += 1; }
    else if (e.finalStatus === 'partial') { counts.partial += 1; if (slot) slot.partial += 1; }
    else if (e.finalStatus === 'missing') { counts.missing += 1; if (slot) slot.missing += 1; }
    else { counts.failed += 1; if (slot) slot.failed += 1; }
    if (e.usable) { counts.usable += 1; if (slot) slot.usable += 1; }
  };
  for (const e of entries) {
    const key = `${e.url}\u0000${e.strategy}`;
    const slot = byStrategy[e.strategy];
    if (!plannedKeys.has(key)) {
      counts.unplanned += 1; // visible, never counted in the denominator
      continue;
    }
    if (filled.has(key)) {
      counts.duplicate += 1; // visible, never double-counted
      continue;
    }
    filled.add(key);
    countStatus(slot, e);
  }
  counts.missing += planned.length - filled.size; // planned slots with no recorded row
  for (const slot of Object.values(byStrategy)) {
    slot.missing = slot.planned - (slot.succeeded + slot.partial + slot.failed);
  }
  const complete = counts.missing === 0 && counts.duplicate === 0 && counts.unplanned === 0;
  const runStatus = complete && counts.failed === 0 && counts.partial === 0 && counts.succeeded === counts.planned
    ? 'ok'
    : (counts.usable === 0 ? 'failed' : 'partial');
  return { counts: { ...counts, byStrategy }, runStatus };
}
