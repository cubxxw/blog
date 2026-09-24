// Immutable PSI/CrUX observation discovery and selection (frozen at the B1
// handoff; issue #392).
//
// Scope: read-only normalization of the observation files collectors persist
// in data/seo — legacy daily `psi-YYYY-MM-DD.json` / `crux-YYYY-MM-DD.json`
// and new uniquely named `psi|crux-YYYY-MM-DD-HHMMSSmmmZ-<hex>.json` files
// (the exact shape `scripts/lib/psi-persist.mjs` produces; B2 supplies unique
// safe --out paths of this shape to the existing CrUX CLI and ties produced
// paths to run ID/attempt — a failed stage with no new file can never be
// substituted with an old daily file here: selection reports actual timestamps
// so staleness is always visible).
//
// Selection rules:
//   * ordering and as-of eligibility use the actual fetched/measurement
//     timestamp (meta.fetchedAt, strict UTC) plus an explicit cutoff;
//     observations with missing/invalid timestamps cannot prove eligibility and
//     are excluded with a visible constant reason (mirroring A's fail-closed
//     as-of semantics);
//   * per URL×strategy (PSI) / form factor (CrUX) the *current* sample is the
//     latest eligible observation and the *last good* sample is kept as a
//     separately labelled supplement — a current failure is never masked by an
//     older success, and the last-good sample is never presented as current;
//   * persistence is append-only: repeated same-day persistence never replaces
//     the first observation (both files stay in the evidence set).
//
// Legacy precision honesty: legacy CLS values were Math.round'ed by the old
// collector and are marked precision 'unknown-rounded'; a parseable
// displayValue can be recovered only with explicit derived provenance
// ('derived:displayValue'). Raw numeric precision is never fabricated.

import * as nodeFs from 'node:fs';

import { AS_OF_AFTER_CUTOFF_REASON, AS_OF_UNPROVABLE_REASON } from './gsc-report-core.mjs';
import { isValidCalendarDate, isValidUtcTimestamp, timestampMs } from './gsc-dates.mjs';
import {
  LEGACY_COST_AUDIT_UNITS,
  METRIC_UNITS,
  PSI_SNAPSHOT_SCHEMA,
  extractFailure,
  provenanceSignature,
  summarizeEntries,
} from './psi-measure.mjs';

// Frozen filename discovery (must match psi-persist.mjs exactly).
export const PSI_FILE_RE = /^psi-(\d{4}-\d{2}-\d{2})(?:-(\d{9}Z)-([0-9a-f]+))?\.json$/;
export const CRUX_FILE_RE = /^crux-(\d{4}-\d{2}-\d{2})(?:-(\d{9}Z)-([0-9a-f]+))?\.json$/;

export const LEGACY_PSI_SCHEMA = 'psi-legacy-v1';
export const LEGACY_CRUX_SCHEMA = 'crux-legacy-v1';

// Fixed classification for local I/O/parse problems: raw exception text
// (which may echo file or provider content) is never republished.
const BOUND_METRICS = 6;
function problemKind(err) {
  const id = String(err?.code ?? err?.name ?? 'Error').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  return id || 'Error';
}

function eligibilityOf(observedAt, asOfMs) {
  if (asOfMs === null) return { eligible: true, reason: null };
  if (!isValidUtcTimestamp(observedAt)) return { eligible: false, reason: AS_OF_UNPROVABLE_REASON };
  if (timestampMs(observedAt) > asOfMs) return { eligible: false, reason: AS_OF_AFTER_CUTOFF_REASON };
  return { eligible: true, reason: null };
}

function asOfMs(asOf) {
  if (asOf === null || asOf === undefined) return null;
  if (!isValidUtcTimestamp(asOf)) {
    throw new Error(`Invalid asOf: expected a strict UTC timestamp YYYY-MM-DDTHH:MM:SS[.mmm]Z, received ${JSON.stringify(asOf)}`);
  }
  return timestampMs(asOf);
}

// ---------------------------------------------------------------------------
// Discovery: filename -> { kind, runDate, uniqueSuffix }
// ---------------------------------------------------------------------------

export function discoverObservationFiles({ dir, fs = nodeFs, kind = 'psi' } = {}) {
  const re = kind === 'crux' ? CRUX_FILE_RE : PSI_FILE_RE;
  const names = fs.readdirSync(dir).filter((f) => re.test(f)).sort();
  return names.map((file) => {
    const m = re.exec(file);
    return { file, kind, runDate: m[1], uniqueSuffix: m[2] ? `${m[2]}-${m[3]}` : null };
  });
}

// ---------------------------------------------------------------------------
// Legacy precision helpers
// ---------------------------------------------------------------------------

// Strict numeric display-value parse ("0.212" -> 0.212; "3.4 s" -> null).
export function parseDisplayNumber(displayValue) {
  if (typeof displayValue !== 'string') return null;
  const cleaned = displayValue.replace(/[\s\u00a0]/g, '');
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function normalizeLegacyMetric(id, raw) {
  const unit = METRIC_UNITS[id] ?? 'unitless';
  if (!raw || typeof raw !== 'object') return null;
  const numericValue = typeof raw.numericValue === 'number' && Number.isFinite(raw.numericValue) ? raw.numericValue : null;
  const base = {
    unit,
    numericValue,
    displayValue: typeof raw.displayValue === 'string' ? raw.displayValue : null,
    score: typeof raw.score === 'number' ? raw.score : null,
  };
  if (id === 'CLS') {
    // The legacy collector Math.round'ed every metric; for fractional CLS that
    // destroyed the raw precision. The stored number is marked precision-
    // unknown; a parseable displayValue is recoverable only as derived.
    const derived = parseDisplayNumber(base.displayValue);
    return {
      ...base,
      precision: 'unknown-rounded',
      provenance: 'legacy:psi-legacy-v1 numericValue (rounded by the legacy collector)',
      displayDerivedValue: derived === null
        ? null
        : { value: derived, provenance: 'derived:displayValue', note: "Lighthouse display precision only; not raw numeric precision" },
    };
  }
  return {
    ...base,
    precision: 'legacy-rounded',
    provenance: 'legacy:psi-legacy-v1 numericValue (rounded by the legacy collector)',
    displayDerivedValue: null,
  };
}

// Legacy opportunity rows recorded every audit's numericValue under
// `wastedMs`. That is correct for opportunity audits (their numericValue is
// wasted ms) but wrong for `total-byte-weight`, whose numericValue is total
// transfer bytes. Reinterpret with the verified legacy unit map and label the
// provenance. Legacy files never stored details.overallSavings*, so legacy
// byte savings are unrecoverable (null — unknown, never fabricated) and total
// transfer is never labelled removable waste.
function normalizeLegacyCosts(opportunities) {
  const out = { savingsMs: [], savingsBytes: [], transferBytes: [] };
  for (const o of Array.isArray(opportunities) ? opportunities : []) {
    const unit = LEGACY_COST_AUDIT_UNITS[o?.id];
    const value = typeof o?.wastedMs === 'number' ? o.wastedMs : null;
    if (!unit || value === null) continue;
    const row = {
      id: o.id,
      title: typeof o.title === 'string' ? o.title : null,
      displayValue: typeof o.displayValue === 'string' ? o.displayValue : null,
      wastedMs: null,
      wastedBytes: null,
      totalBytes: null,
      provenance: { wastedMs: null, wastedBytes: null, totalBytes: null },
    };
    if (unit === 'bytes') {
      row.totalBytes = value;
      row.provenance.totalBytes = 'legacy-reinterpreted: total-byte-weight numericValue is total transfer bytes (recorded as wastedMs by the legacy collector; not removable waste)';
      out.transferBytes.push(row);
    } else {
      row.wastedMs = value;
      row.provenance.wastedMs = 'legacy:psi-legacy-v1 opportunities.wastedMs (audit numericValue, wasted ms)';
      out.savingsMs.push(row);
    }
  }
  out.savingsMs.sort((x, y) => y.wastedMs - x.wastedMs || x.id.localeCompare(y.id));
  out.transferBytes.sort((x, y) => y.totalBytes - x.totalBytes || x.id.localeCompare(y.id));
  return out;
}

// Legacy error strings only recorded transport failures
// (`PSI <strategy> <url> → <status>: <body>`). The status is the PSI API's,
// never the origin's. The raw text is historical free-form content and is NOT
// republished: fixed classification + allowlisted numeric status only.
function classifyLegacyFailure(error) {
  const text = typeof error === 'string' ? error : '';
  const m = /→\s*(\d{3}):/.exec(text);
  if (m) {
    const status = Number(m[1]);
    return {
      reasonCategory: 'psi-api-failure',
      reasonBasis: `legacy error string records PSI API HTTP ${status}; this is the PSI endpoint's status, never the origin's status`,
      errorKind: 'http',
      errorMeta: { status },
      psiHttpStatus: status,
    };
  }
  return {
    reasonCategory: null,
    reasonBasis: 'legacy error string does not match a known failure signature (raw text not retained)',
    errorKind: 'legacy',
    errorMeta: {},
    psiHttpStatus: null,
  };
}

function normalizeLegacyFieldData(raw) {
  // The legacy collector stored null both for "no sample" and "not collected";
  // the distinction is unrecoverable and stays unknown (never zero).
  if (!raw || typeof raw !== 'object' || !raw.metrics) return { status: 'unknown', overallCategory: null, metrics: null };
  const metrics = {};
  for (const k of Object.keys(raw.metrics).sort().slice(0, BOUND_METRICS)) {
    const v = raw.metrics[k] ?? {};
    metrics[k] = {
      percentile: typeof v.percentile === 'number' ? v.percentile : null,
      category: typeof v.category === 'string' ? v.category : null,
    };
  }
  return { status: 'sampled', overallCategory: raw.overall_category ?? null, metrics };
}

const LEGACY_CAVEATS = [
  'legacy-v1 evidence: tool version and emulation/throttling settings were not recorded (comparisons against versioned samples are withheld)',
  'legacy-v1 metrics were rounded by the legacy collector',
];

// ---------------------------------------------------------------------------
// PSI snapshot normalization (psi-snapshot/2 and legacy-v1 side by side)
// ---------------------------------------------------------------------------

// Slot accounting: the RECORDED PLAN is the denominator. Rows are matched to
// planned URL×strategy slots; a planned slot without a row stays an explicit
// unknown/missing slot (never a measured zero and never backfilled from an
// older observation), duplicate rows never double-count, and unplanned rows
// never inflate the denominator.
function assignSlots(planned, entries, problems, file) {
  const plannedKeys = new Map();
  planned.forEach((p, i) => {
    const key = p.unrecorded ? `#unrecorded-${i}` : `${p.url}\u0000${p.strategy}`;
    if (!plannedKeys.has(key)) plannedKeys.set(key, []);
    plannedKeys.get(key).push(i);
  });
  const filledAt = new Map();
  for (const e of entries) {
    const key = `${e.url}\u0000${e.strategy}`;
    const candidates = plannedKeys.get(key);
    if (!candidates) {
      e.unplanned = true;
      problems.push({ file, problem: 'unplanned measurement row (not in the recorded plan); excluded from the denominator' });
      continue;
    }
    const idx = candidates.find((i) => !filledAt.has(i));
    if (idx === undefined) {
      e.duplicate = true;
      problems.push({ file, problem: 'duplicate measurement row for a planned slot; counted once, never inflating the denominator' });
      continue;
    }
    filledAt.set(idx, e);
  }
  return planned.map((p, i) => ({
    url: p.url ?? null,
    strategy: p.strategy ?? null,
    unrecorded: Boolean(p.unrecorded),
    entry: filledAt.get(i) ?? null,
    status: p.unrecorded ? 'unrecorded' : (filledAt.has(i) ? 'measured' : 'missing'),
  }));
}

function distinctPlan(entries) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    const key = `${e.url}\u0000${e.strategy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url: e.url, strategy: e.strategy });
  }
  return out;
}

export function normalizePsiSnapshot(json, file) {
  const problems = [];
  const meta = json?.meta ?? {};
  const observedAt = typeof meta.fetchedAt === 'string' ? meta.fetchedAt : null;
  const base = {
    file,
    kind: 'psi',
    runDate: meta.runDate ?? (PSI_FILE_RE.exec(file)?.[1] ?? null),
    observedAt,
    observedAtBasis: isValidUtcTimestamp(observedAt) ? 'meta.fetchedAt' : 'unprovable',
  };

  if (json?.schema === PSI_SNAPSHOT_SCHEMA) {
    const rows = Array.isArray(json.measurements) ? json.measurements : [];
    const entries = rows.map((e) => ({
      ...e,
      sourceFile: file,
      sourceSchema: PSI_SNAPSHOT_SCHEMA,
    }));
    const hasPlan = Array.isArray(meta.planned) && meta.planned.length > 0;
    const planned = hasPlan ? meta.planned : distinctPlan(entries);
    if (!hasPlan) {
      problems.push({ file, problem: 'recorded plan missing; denominator reconstructed from returned rows and NOT certified complete' });
    } else if (meta.planned.length !== entries.length) {
      problems.push({ file, problem: `measurement count ${entries.length} differs from planned ${meta.planned.length}; the recorded plan remains the denominator` });
    }
    const slots = assignSlots(planned, entries, problems, file);
    const { counts, runStatus } = summarizeEntries({ planned, entries });
    // A missing recorded plan can never certify a complete observation: rows
    // stay usable, but completeness is visibly withheld ('uncertified').
    return {
      ...base,
      schema: PSI_SNAPSHOT_SCHEMA,
      entries,
      planned,
      planCertified: hasPlan,
      slots,
      counts,
      runStatus: hasPlan ? runStatus : 'uncertified',
      problems,
      legacy: false,
    };
  }

  // Legacy daily shape: { meta: { fetchedAt, runDate, urls, strategies }, results, failures }
  const results = Array.isArray(json?.results) ? json.results : [];
  const failures = Array.isArray(json?.failures) ? json.failures : [];
  if (!json?.meta || (results.length === 0 && failures.length === 0)) {
    return null; // not a recognizable PSI observation; caller records the problem
  }
  const strategies = Array.isArray(meta.strategies) ? meta.strategies : [];
  const plannedCount = Number.isInteger(meta.urls) && strategies.length > 0 ? meta.urls * strategies.length : null;
  const entries = [];
  for (const r of results) {
    if (!r || typeof r !== 'object' || typeof r.url !== 'string' || typeof r.strategy !== 'string') {
      problems.push({ file, problem: 'legacy result row without url/strategy; ignored' });
      continue;
    }
    const metrics = {};
    for (const id of Object.keys(METRIC_UNITS)) metrics[id] = normalizeLegacyMetric(id, r.metrics?.[id]);
    entries.push({
      url: r.url,
      strategy: r.strategy,
      finalStatus: 'partial', // usable measurement, but legacy provenance is incomplete
      usable: true,
      reasonCategory: null,
      reasonBasis: null,
      attempts: null,
      attemptLog: [],
      psiHttpStatus: 200,
      originHttpStatus: null,
      lighthouseRuntimeError: null,
      error: null,
      provenance: {
        fetchTime: isValidUtcTimestamp(r.fetchTime ?? null) ? r.fetchTime : null,
        lighthouseVersion: null,
        configSettings: null,
        requestedUrl: typeof r.url === 'string' ? r.url : null,
        finalUrl: typeof r.finalUrl === 'string' ? r.finalUrl : null,
      },
      caveats: [...LEGACY_CAVEATS],
      scores: r.categories && typeof r.categories === 'object' ? { ...r.categories } : null,
      metrics,
      fieldData: normalizeLegacyFieldData(r.fieldData),
      originFieldData: normalizeLegacyFieldData(r.originFieldData),
      seoAudits: null, // legacy collector did not capture SEO audits
      diagnostics: {
        lcpElement: r.diagnostics?.lcpElement ?? null,
        costs: normalizeLegacyCosts(r.diagnostics?.opportunities),
      },
      sourceFile: file,
      sourceSchema: LEGACY_PSI_SCHEMA,
    });
  }
  for (const f of failures) {
    if (!f || typeof f !== 'object' || typeof f.url !== 'string' || typeof f.strategy !== 'string') {
      problems.push({ file, problem: 'legacy failure row without url/strategy; ignored' });
      continue;
    }
    const cls = classifyLegacyFailure(f.error);
    const failure = extractFailure({
      url: f.url,
      strategy: f.strategy,
      reasonCategory: cls.reasonCategory,
      reasonBasis: cls.reasonBasis,
      errorKind: cls.errorKind,
      errorMeta: cls.errorMeta,
      psiHttpStatus: cls.psiHttpStatus,
      attemptLog: [],
      attempts: null,
    });
    entries.push({ ...failure, sourceFile: file, sourceSchema: LEGACY_PSI_SCHEMA });
  }
  const planned = [];
  const seen = new Set();
  for (const e of entries) {
    const key = `${e.url}\u0000${e.strategy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    planned.push({ url: e.url, strategy: e.strategy });
  }
  if (plannedCount !== null && plannedCount !== entries.length) {
    problems.push({
      file,
      problem: `legacy meta implies ${plannedCount} planned slots (urls=${meta.urls} × strategies=${strategies.length}) but ${entries.length} rows are recorded; both counts are kept visible`,
    });
  }
  const plannedFinal = plannedCount !== null
    ? [...planned, ...Array.from({ length: Math.max(plannedCount - planned.length, 0) }, () => ({ url: null, strategy: null, unrecorded: true }))]
    : planned;
  const slots = assignSlots(plannedFinal, entries, problems, file);
  const { counts, runStatus } = summarizeEntries({ planned: plannedFinal, entries });
  return {
    ...base,
    schema: LEGACY_PSI_SCHEMA,
    entries,
    planned: plannedFinal,
    planCertified: plannedCount !== null,
    slots,
    counts,
    runStatus: plannedCount === null ? 'uncertified' : runStatus,
    plannedCount,
    problems,
    legacy: true,
  };
}

// ---------------------------------------------------------------------------
// CrUX snapshot validation and normalization (small explicit normalizer for
// the EXISTING collector, which calls records:queryHistoryRecord and persists
// `record.collectionPeriods[]` with histogramTimeseries / percentilesTimeseries
// / fractionTimeseries — see the CrUX History API schema). `notEligible` is a
// SUCCESSFUL query with no field sample; `results[].error`, HTTP-200
// missing/invalid records, and stale or absent artifacts are never success.
//
// Rules:
//   * metric values are aligned to each collection period by index; the actual
//     latest period and its date are reported for freshness;
//   * null percentiles / string "NaN" densities are NO SAMPLE — never zero;
//   * CLS is unitless (p75 may be a numeric string), never milliseconds;
//   * real calendar dates and non-overlapping ascending period order are
//     validated (A's date helpers); invalid/unordered periods, mismatched
//     time-series lengths and unproven record identity stay visible and are
//     never sampled success;
//   * the expected form-factor plan (meta.formFactors) is the denominator:
//     missing, duplicate, unexpected or malformed rows cannot certify a
//     complete collection; two explicit notEligible rows ARE valid successful
//     no-sample results;
//   * record.key origin/formFactor are checked against the observation
//     identity — another origin is never blended in.
// ---------------------------------------------------------------------------

export const CRUX_FORM_FACTORS = ['PHONE', 'TABLET', 'DESKTOP'];

export const CRUX_METRIC_UNITS = {
  largest_contentful_paint: 'ms',
  first_contentful_paint: 'ms',
  interaction_to_next_paint: 'ms',
  experimental_time_to_first_byte: 'ms',
  round_trip_time: 'ms',
  cumulative_layout_shift: 'unitless',
  navigation_types: 'categorical',
};

// CrUX values may be numbers or numeric strings (CLS is a numeric string);
// 'NaN'/null/undefined/garbage are no sample — never zero.
export function cruxValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[\s\u00a0]/g, '');
    if (cleaned === '' || cleaned === 'NaN' || cleaned === 'null' || cleaned === 'undefined') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Real calendar dates only (accepted A helpers — 2026-13-99 fails here).
export function cruxDate(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const { year, month, day } = obj;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const s = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidCalendarDate(s) ? s : null;
}

export function validateCruxSnapshot(json) {
  const problems = [];
  if (!json || typeof json !== 'object') return { ok: false, problems: ['snapshot is not a JSON object'] };
  const meta = json.meta ?? {};
  if (!isValidUtcTimestamp(meta.fetchedAt)) problems.push('meta.fetchedAt is missing or not a strict UTC timestamp');
  const results = Array.isArray(json.results) ? json.results : null;
  if (!results) problems.push('results is missing or not an array');
  return { ok: problems.length === 0, problems };
}

function normalizeCruxMetric(name, raw, periods) {
  const unit = CRUX_METRIC_UNITS[name] ?? null;
  const n = periods.length;
  const problems = [];
  const p75s = raw?.percentilesTimeseries && typeof raw.percentilesTimeseries === 'object' ? raw.percentilesTimeseries.p75s : undefined;
  const hist = Array.isArray(raw?.histogramTimeseries) ? raw.histogramTimeseries : undefined;
  const fractions = raw?.fractionTimeseries && typeof raw.fractionTimeseries === 'object' ? raw.fractionTimeseries : undefined;
  if (p75s === undefined && hist === undefined && fractions === undefined) {
    problems.push('unsupported metric structure (no percentilesTimeseries/histogramTimeseries/fractionTimeseries)');
    return { metric: { unit, structure: 'unsupported', periods: null }, problems };
  }
  if (p75s !== undefined && (!Array.isArray(p75s) || p75s.length !== n)) {
    problems.push('mismatched time-series length (percentilesTimeseries.p75s vs collectionPeriods)');
    return { metric: null, problems };
  }
  const bins = [];
  if (hist !== undefined) {
    for (const b of hist) {
      if (!b || typeof b !== 'object' || !Array.isArray(b.densities) || b.densities.length !== n) {
        problems.push('mismatched time-series length (histogramTimeseries densities vs collectionPeriods)');
        return { metric: null, problems };
      }
      bins.push(b);
    }
  }
  const fractionKeys = [];
  const fractionSeries = {};
  if (fractions !== undefined) {
    // Official History schema: each label maps to { fractions: [...] },
    // aligned to collectionPeriods by index (see the CrUX History API).
    for (const [k, v] of Object.entries(fractions)) {
      const arr = v && typeof v === 'object' && !Array.isArray(v) ? v.fractions : null;
      if (!Array.isArray(arr) || arr.length !== n) {
        problems.push('mismatched time-series length (fractionTimeseries vs collectionPeriods)');
        return { metric: null, problems };
      }
      fractionKeys.push(k);
      fractionSeries[k] = arr;
    }
  }
  const structure = `${p75s !== undefined ? 'percentiles' : ''}${hist !== undefined ? '+histogram' : ''}${fractions !== undefined ? '+fraction' : ''}`.replace(/^\+/, '') || 'none';
  const periodRows = periods.map((p, i) => {
    const p75 = p75s !== undefined ? cruxValue(p75s[i]) : null;
    const histogram = bins.map((b) => ({
      start: cruxValue(b.start),
      end: 'end' in b ? cruxValue(b.end) : null,
      density: cruxValue(b.densities[i]),
    }));
    const fractionsOut = {};
    for (const k of fractionKeys) fractionsOut[k] = cruxValue(fractionSeries[k][i]);
    // Named fraction values are preserved per period; presence is inferred
    // from an actual finite value, never from a nonempty array object.
    const fractionPresent = fractionKeys.some((k) => fractionsOut[k] !== null);
    const hasSample = p75 !== null || histogram.some((h) => h.density !== null) || fractionPresent;
    return {
      firstDate: p.firstDate,
      lastDate: p.lastDate,
      p75, // unit per metric (CLS is unitless; numeric strings parsed; never faked as ms)
      histogram: histogram.length > 0 ? histogram : null,
      fractions: fractionKeys.length > 0 ? fractionsOut : null,
      sample: hasSample ? 'sampled' : 'no-sample',
    };
  });
  return { metric: { unit, structure, periods: periodRows }, problems };
}

function normalizeCruxFormFactor(row, ctx) {
  const rowProblems = [];
  const identityProven = ctx.origin !== null; // explicit observation origin required
  const formFactor = typeof row?.formFactor === 'string' ? row.formFactor : 'unknown';
  const base = { formFactor, key: null, identityProven, collectionPeriods: null, overlappingWindows: null, latestPeriod: null, latestPeriodStatus: null, sampledPeriods: null, metrics: null, error: null, problems: rowProblems };
  if (!CRUX_FORM_FACTORS.includes(formFactor)) rowProblems.push('unexpected form factor identity');
  if (row?.notEligible === true && row?.record === undefined) {
    if (!identityProven) {
      rowProblems.push('observation origin (meta.origin) missing; request identity unproven and never certified');
      return { ...base, status: 'identity-unproven' };
    }
    return { ...base, status: 'no-sample' }; // successful query, no field sample — unknown, never zero
  }
  if (row?.error !== undefined && row?.error !== null) {
    // Raw provider error text is never republished: fixed classification only.
    return { ...base, status: 'failed', error: 'crux-query-failed (raw provider text not retained)' };
  }
  const record = row?.record;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ...base, status: 'invalid', error: 'missing or invalid CrUX record despite a successful query' };
  }
  // Record identity must match the observation/request identity exactly.
  const key = record.key && typeof record.key === 'object' ? record.key : null;
  if (!key || typeof key.origin !== 'string' || typeof key.formFactor !== 'string') {
    rowProblems.push('record key origin/formFactor missing; observation identity unproven');
    return { ...base, status: 'invalid', error: 'record identity unproven' };
  }
  if (ctx.origin !== null && key.origin !== ctx.origin) {
    rowProblems.push('record key origin does not match the observation origin; another origin is never blended in');
    return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, error: 'record origin mismatch' };
  }
  if (key.formFactor !== formFactor) {
    rowProblems.push('record key formFactor does not match the result row');
    return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, error: 'record formFactor mismatch' };
  }
  // Real calendar periods in ascending order (starts AND ends strictly
  // increasing; duplicate/reversed series rejected). Overlap is ALLOWED and
  // labelled: the History API publishes rolling 28-day windows advanced
  // weekly (e.g. 08-17..09-13 then 08-24..09-20). Rolling windows are never
  // summed into disjoint traffic totals.
  const rawPeriods = Array.isArray(record.collectionPeriods) ? record.collectionPeriods : null;
  if (!rawPeriods || rawPeriods.length === 0) {
    rowProblems.push('record.collectionPeriods missing or empty');
    return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, error: 'collection periods missing' };
  }
  const periods = [];
  for (const p of rawPeriods) {
    const firstDate = cruxDate(p?.firstDate);
    const lastDate = cruxDate(p?.lastDate);
    if (firstDate === null || lastDate === null || firstDate > lastDate) {
      rowProblems.push('invalid collection period dates');
      return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, error: 'invalid collection period dates' };
    }
    if (periods.length > 0) {
      const prev = periods[periods.length - 1];
      if (firstDate <= prev.firstDate || lastDate <= prev.lastDate) {
        rowProblems.push('unordered or duplicate collection periods');
        return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, error: 'unordered or duplicate collection periods' };
      }
    }
    periods.push({ firstDate, lastDate });
  }
  const overlappingWindows = periods.some((p, i) => i > 0 && p.firstDate <= periods[i - 1].lastDate);
  // Supported metric structures, values aligned to periods by index.
  const rawMetrics = record.metrics && typeof record.metrics === 'object' && !Array.isArray(record.metrics) ? record.metrics : {};
  const names = Object.keys(rawMetrics).sort();
  if (names.length === 0) {
    rowProblems.push('record has no metrics');
    return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, collectionPeriods: periods, error: 'record has no metrics' };
  }
  const metrics = {};
  let interpretable = 0;
  for (const name of names) {
    const { metric, problems: mp } = normalizeCruxMetric(name, rawMetrics[name], periods);
    for (const p of mp) rowProblems.push(`${name}: ${p}`);
    if (metric === null) {
      // structural problems (e.g. mismatched lengths) are visible and can
      // never certify sampled success
      return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, collectionPeriods: periods, error: 'metric time-series structure invalid' };
    }
    if (metric.periods !== null) interpretable += 1;
    metrics[name] = metric;
  }
  if (interpretable === 0) {
    return { ...base, status: 'invalid', key: { origin: key.origin, formFactor: key.formFactor }, collectionPeriods: periods, metrics, error: 'no supported metric structures' };
  }
  const periodStatus = periods.map((p, i) => (Object.values(metrics).some((m) => m.periods?.[i]?.sample === 'sampled') ? 'sampled' : 'no-sample'));
  const latestPeriodStatus = periodStatus[periodStatus.length - 1];
  const parsed = {
    ...base,
    status: latestPeriodStatus === 'sampled' ? 'sampled' : 'no-sample',
    key: { origin: key.origin, formFactor: key.formFactor },
    collectionPeriods: periods,
    overlappingWindows,
    latestPeriod: periods[periods.length - 1],
    latestPeriodStatus,
    sampledPeriods: periodStatus.filter((s) => s === 'sampled').length,
    metrics,
  };
  if (!identityProven) {
    // Parsed evidence stays visible, but without a usable explicit observation
    // origin the request/response identity is unproven: never sampled success,
    // never a certified current/last-good sample.
    rowProblems.push('observation origin (meta.origin) missing; request identity unproven and never certified');
    return { ...parsed, status: 'identity-unproven' };
  }
  return parsed;
}

export function normalizeCruxSnapshot(json, file) {
  const validation = validateCruxSnapshot(json);
  if (!validation.ok) return null;
  const meta = json.meta ?? {};
  const observedAt = typeof meta.fetchedAt === 'string' ? meta.fetchedAt : null;
  const origin = typeof meta.origin === 'string' ? meta.origin : null;
  const problems = [];
  const ctx = { origin };
  if (origin === null) {
    problems.push('observation origin (meta.origin) missing; request identity unproven — rows are never certified or blended across record-key origins');
  }

  // Expected factor plan is the denominator — never the returned rows.
  const plan = Array.isArray(meta.formFactors) && meta.formFactors.length > 0
    ? meta.formFactors.filter((f) => typeof f === 'string')
    : null;
  if (plan === null) {
    problems.push('expected form factor plan (meta.formFactors) missing; collection completeness cannot be certified');
  } else {
    if (plan.length !== meta.formFactors.length) problems.push('non-string form factor in the plan');
    if (new Set(plan).size !== plan.length) problems.push('duplicate form factor in the plan');
    for (const f of plan) if (!CRUX_FORM_FACTORS.includes(f)) problems.push(`planned form factor ${f} is not a known CrUX form factor`);
  }

  const rows = Array.isArray(json.results) ? json.results : [];
  const seen = new Set();
  const formFactors = [];
  for (const row of rows) {
    const entry = normalizeCruxFormFactor(row, ctx);
    if (plan !== null && !plan.includes(entry.formFactor)) {
      entry.unexpected = true;
      problems.push('unexpected form factor row (not in the plan); cannot certify complete collection');
    } else if (seen.has(entry.formFactor)) {
      entry.duplicate = true;
      problems.push('duplicate form factor row; counted once, never certifying completeness');
    }
    seen.add(entry.formFactor);
    problems.push(...entry.problems);
    formFactors.push(entry);
  }
  for (const f of plan ?? []) {
    if (!seen.has(f)) {
      // A missing planned factor is NOT successful no-sample.
      formFactors.push({ formFactor: f, status: 'missing', key: null, collectionPeriods: null, latestPeriod: null, latestPeriodStatus: null, sampledPeriods: null, metrics: null, error: null, problems: ['planned form factor has no result row (unknown outcome, never zero)'] });
    }
  }
  formFactors.sort((a, b) => a.formFactor.localeCompare(b.formFactor));

  const primary = formFactors.filter((f) => !f.unexpected && !f.duplicate);
  const usable = primary.filter((f) => f.status === 'sampled' || f.status === 'no-sample').length; // successful queries
  const identityCertified = origin !== null;
  const clean = identityCertified
    && plan !== null
    && problems.length === 0
    && primary.length === plan.length
    && primary.every((f) => f.status === 'sampled' || f.status === 'no-sample');
  // Unknown identity or unknown plan can never certify a complete observation.
  const runStatus = !identityCertified ? 'uncertified' : (plan === null ? (usable === 0 ? 'failed' : 'uncertified') : (clean ? 'ok' : (usable === 0 ? 'failed' : 'partial')));
  return {
    file,
    kind: 'crux',
    schema: LEGACY_CRUX_SCHEMA,
    runDate: meta.runDate ?? (CRUX_FILE_RE.exec(file)?.[1] ?? null),
    observedAt,
    observedAtBasis: isValidUtcTimestamp(observedAt) ? 'meta.fetchedAt' : 'unprovable',
    origin,
    identityCertified,
    plan,
    planCertified: plan !== null,
    formFactors,
    runStatus,
    problems,
    legacy: true,
  };
}

// ---------------------------------------------------------------------------
// Load + as-of selection (append-only evidence, explicit cutoff)
// ---------------------------------------------------------------------------

function loadAll({ dir, fs, kind, normalize }) {
  const observations = [];
  const problems = [];
  for (const { file } of discoverObservationFiles({ dir, fs, kind })) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
    } catch (err) {
      problems.push({ file, problem: `unreadable observation (${problemKind(err)})` });
      continue;
    }
    let normalized = null;
    try {
      normalized = normalize(json, file);
    } catch (err) {
      problems.push({ file, problem: `unnormalizable observation (${problemKind(err)})` });
    }
    if (!normalized) {
      problems.push({ file, problem: 'unrecognized observation format; ignored' });
      continue;
    }
    observations.push(normalized);
    problems.push(...(normalized.problems ?? []));
  }
  // Deterministic order: actual observation timestamp, then filename. An
  // observation whose timestamp cannot be proven is never selected.
  observations.sort((a, b) => {
    const ta = timestampMs(a.observedAt);
    const tb = timestampMs(b.observedAt);
    if (ta !== null && tb !== null && ta !== tb) return ta - tb;
    if (ta === null && tb !== null) return 1;
    if (ta !== null && tb === null) return -1;
    return a.file < b.file ? -1 : 1;
  });
  return { observations, problems };
}

function selectWithCutoff({ dir, fs, kind, normalize, asOf }) {
  const cutoffMs = asOfMs(asOf);
  const { observations, problems } = loadAll({ dir, fs, kind, normalize });
  const eligible = [];
  const excluded = [];
  const unprovable = [];
  for (const obs of observations) {
    if (!isValidUtcTimestamp(obs.observedAt)) {
      // Unprovable timestamps NEVER become authoritative current samples —
      // chronological order cannot be established even without a cutoff.
      // They stay visible in both lists.
      unprovable.push({ file: obs.file, observedAt: obs.observedAt, reason: AS_OF_UNPROVABLE_REASON });
      excluded.push({ file: obs.file, fetchedAt: obs.observedAt ?? null, reason: AS_OF_UNPROVABLE_REASON });
      continue;
    }
    const eligibility = eligibilityOf(obs.observedAt, cutoffMs);
    if (!eligibility.eligible) {
      excluded.push({ file: obs.file, fetchedAt: obs.observedAt, reason: eligibility.reason });
      continue;
    }
    eligible.push(obs);
  }
  return { eligible, excluded, unprovable, problems };
}

// A planned slot with no recorded row in an observation: explicit unknown
// outcome, never backfilled from an older observation and never a measured
// zero. Older last-good samples stay separately labelled.
export function missingSlotEntry(url, strategy) {
  return {
    url,
    strategy,
    finalStatus: 'missing',
    usable: false,
    reasonCategory: null,
    reasonBasis: 'planned slot has no recorded measurement in this observation (unknown outcome, never a measured zero)',
    attempts: null,
    attemptLog: [],
    psiHttpStatus: null,
    originHttpStatus: null,
    lighthouseRuntimeError: null,
    error: null,
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

// PSI selection: per URL×strategy keep the current sample (the LATEST planned
// slot outcome — including explicit 'missing' when the latest observation
// recorded nothing for the slot) and a separately labelled last-good sample.
// A current failure or missing slot is visible as the current outcome; the
// last-good sample is a labelled supplement and never substitutes for the
// current stage result.
export function selectPsiObservations({ dir, fs = nodeFs, asOf = null } = {}) {
  const { eligible, excluded, unprovable, problems } = selectWithCutoff({ dir, fs, kind: 'psi', normalize: normalizePsiSnapshot, asOf });
  const pairs = new Map(); // url×strategy -> [{entry, observation, slotStatus}]
  for (const obs of eligible) {
    const observation = {
      file: obs.file,
      schema: obs.schema,
      observedAt: obs.observedAt,
      runDate: obs.runDate,
      legacy: obs.legacy,
      runStatus: obs.runStatus ?? null,
      planCertified: obs.planCertified !== false,
      counts: obs.counts ?? null,
    };
    for (const slot of obs.slots ?? []) {
      if (slot.unrecorded || slot.url === null) continue; // anonymous slots: counts only
      const key = `${slot.url}\u0000${slot.strategy}`;
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push({
        entry: slot.entry ?? missingSlotEntry(slot.url, slot.strategy),
        observation,
        slotStatus: slot.status,
      });
    }
    for (const entry of obs.entries ?? []) {
      if (!entry.unplanned) continue; // measured slots already covered above
      const key = `${entry.url}\u0000${entry.strategy}`;
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push({ entry, observation, slotStatus: 'unplanned' });
    }
  }
  const latestObs = eligible.at(-1) ?? null;
  const byTarget = [...pairs.entries()].map(([key, samples]) => {
    const [url, strategy] = key.split('\u0000');
    const current = samples[samples.length - 1];
    const lastGood = [...samples].reverse().find((s) => s.entry.usable) ?? null;
    // A target the latest stage never specified cannot be silently presented
    // as proof of that run: it stays dated historical evidence under the
    // uncertified/incomplete latest stage.
    const underUncertifiedStage = Boolean(latestObs) && latestObs.planCertified === false && current.observation.file !== latestObs.file;
    return {
      url,
      strategy,
      current,
      currentOutcome: current.entry.finalStatus,
      currentCertified: current.observation.planCertified !== false && !underUncertifiedStage,
      currentLabel: underUncertifiedStage
        ? 'historical-supplement (latest observation has no recorded plan; its denominator is uncertified)'
        : null,
      lastGood: lastGood === current
        ? { ...lastGood, label: 'current' }
        : (lastGood ? { ...lastGood, label: 'labelled-last-good (older than current; never substitutes for the current outcome)' } : null),
      sampleCount: samples.length,
      samples,
    };
  }).sort((a, b) => (a.url === b.url ? a.strategy.localeCompare(b.strategy) : a.url.localeCompare(b.url)));
  return { observations: eligible, excluded, unprovable, problems, byTarget };
}

// CrUX selection: grouped by ORIGIN × form factor so observations of
// different origins are never blended and the report must refuse mixing
// incompatible origins instead of taking the latest unrelated record. Same
// current/last-good semantics as PSI: a missing/failure current outcome stays
// visible and is never substituted by an older sample.
export function selectCruxObservations({ dir, fs = nodeFs, asOf = null } = {}) {
  const { eligible, excluded, unprovable, problems } = selectWithCutoff({ dir, fs, kind: 'crux', normalize: normalizeCruxSnapshot, asOf });
  const byKey = new Map(); // origin×formFactor -> samples
  for (const obs of eligible) {
    const observation = {
      file: obs.file,
      observedAt: obs.observedAt,
      runDate: obs.runDate,
      runStatus: obs.runStatus,
      planCertified: obs.planCertified !== false && obs.identityCertified !== false,
      origin: obs.origin,
      problems: obs.problems,
    };
    for (const ff of obs.formFactors ?? []) {
      // Identity: a proven observation origin, else the record-key origin kept
      // strictly separate (never blended across keys, never certified).
      const entryOrigin = ff.key?.origin ?? obs.origin ?? 'unknown';
      const key = `${entryOrigin}\u0000${ff.formFactor}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({
        entry: ff,
        observation,
        originProven: obs.origin !== null && obs.identityCertified !== false,
        unexpected: Boolean(ff.unexpected),
        duplicate: Boolean(ff.duplicate),
      });
    }
  }
  const byFormFactor = [...byKey.entries()].map(([key, samples]) => {
    const [origin, formFactor] = key.split('\u0000');
    const current = samples[samples.length - 1];
    const usable = (s) => (s.entry.status === 'sampled' || s.entry.status === 'no-sample') && s.originProven && !s.unexpected && !s.duplicate; // successful certified queries
    const lastGood = [...samples].reverse().find(usable) ?? null;
    return {
      origin: origin === 'unknown' ? null : origin,
      originProven: samples.every((s) => s.originProven),
      formFactor,
      current,
      currentOutcome: current.entry.status,
      lastGood: lastGood === current
        ? { ...lastGood, label: 'current' }
        : (lastGood ? { ...lastGood, label: 'labelled-last-good (older than current; never substitutes for the current outcome)' } : null),
      sampleCount: samples.length,
      samples,
    };
  }).sort((a, b) => ((a.origin ?? '') === (b.origin ?? '') ? a.formFactor.localeCompare(b.formFactor) : (a.origin ?? '').localeCompare(b.origin ?? '')));
  return { observations: eligible, excluded, unprovable, problems, byFormFactor };
}

// ---------------------------------------------------------------------------
// Compatible-sample comparison (PSI). Only common URL×strategy entries with
// COMPLETE supported provenance (validated timestamps, tool version,
// throttling parameters, full screen emulation, locale, emulated UA — the
// fields pickProvenance preserves) and matching signatures are ever compared;
// unknown or invalid fields make compatibility unprovable and the comparison
// is withheld with a reason. The missing set is preserved. No means across
// mixed samples — comparisons are pairwise and per target.
// ---------------------------------------------------------------------------

export function compareCompatibleSamples(currentSample, priorSample, { metrics = ['LCP', 'CLS'] } = {}) {
  const cur = currentSample?.entry ?? currentSample;
  const prior = priorSample?.entry ?? priorSample;
  if (!cur?.usable || !prior?.usable) {
    return { compatible: false, reason: 'one side has no usable measurement', deltas: null, precisionLimited: false };
  }
  // Same target, exactly: URL, strategy and final URL must match. An unknown
  // or changed final URL (redirect target) makes the comparison unprovable.
  if (cur.url !== prior.url || cur.strategy !== prior.strategy) {
    return { compatible: false, reason: 'different measurement targets (URL/strategy); comparison withheld', deltas: null, precisionLimited: false };
  }
  const finalA = cur.provenance?.finalUrl ?? null;
  const finalB = prior.provenance?.finalUrl ?? null;
  if (finalA === null || finalB === null || finalA !== finalB) {
    return { compatible: false, reason: 'final URL missing or differing between samples (measured page unproven); comparison withheld', deltas: null, precisionLimited: false };
  }
  const sigA = provenanceSignature(cur.provenance);
  const sigB = provenanceSignature(prior.provenance);
  if (!sigA.complete || !sigB.complete) {
    return {
      compatible: false,
      reason: 'incomplete measurement provenance (version/settings/timestamp unknown); compatibility unprovable, comparison withheld',
      missingFields: [...sigA.missing, ...sigB.missing],
      deltas: null,
      precisionLimited: false,
    };
  }
  if (sigA.signature !== sigB.signature) {
    return { compatible: false, reason: 'measurement tool version or emulation/throttling settings differ; comparison withheld', deltas: null, precisionLimited: false };
  }
  const deltas = {};
  const missing = [];
  let precisionLimited = false;
  for (const id of metrics) {
    const a = cur.metrics?.[id];
    const b = prior.metrics?.[id];
    const valueOf = (m) => {
      if (m?.numericValue === null || m?.numericValue === undefined) return null;
      if (m.precision === 'raw') return m.numericValue;
      if (m.displayDerivedValue) {
        precisionLimited = true;
        return m.displayDerivedValue.value;
      }
      return null; // rounded with no recoverable display precision: refuse
    };
    const to = valueOf(a);
    const from = valueOf(b);
    if (to === null || from === null) {
      missing.push(id);
      continue;
    }
    deltas[id] = { from, to, delta: to - from, unit: METRIC_UNITS[id] ?? a?.unit ?? null };
  }
  return {
    compatible: true,
    reason: null,
    deltas: Object.keys(deltas).length > 0 ? deltas : null,
    missingMetrics: missing,
    precisionLimited,
  };
}
