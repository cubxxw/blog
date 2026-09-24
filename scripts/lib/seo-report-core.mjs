// Deterministic SEO report core (schema seo-report/1) — issue #392 / batch B1.
//
// Consumes A's public report API output (gsc-report/1 from buildReport) plus
// the normalized PSI/CrUX observations (seo-observations.mjs) and produces a
// deterministic evidence product: identical inputs (including the as-of
// cutoff) always produce identical bytes. No build clock enters the results
// unless it is captured as an explicit recorded input (--as-of default is one
// frozen run-clock value, recorded with its basis). A report generated later
// never refreshes old inputs.
//
// Honesty rules:
//   * data dates stay separate from the UTC report date; scopes (property,
//     host, search type, origin, strategy) are labelled on every source;
//   * freshness/completeness is classified PER TARGET/GROUP against explicit
//     thresholds with visible reasons and aggregated conservatively — one
//     fresh page never masks a stale/undated target and one sampled CrUX
//     factor never hides a failed factor;
//   * GSC freshness uses the SELECTED counted evidence behind the report's
//     numbers (never a newer failed or unrelated input file); GSC data-date
//     lag uses the Search Console (Pacific) calendar while the UTC report
//     identity stays separate;
//   * CrUX freshness reflects the weekly rolling-28-day release cadence (see
//     CRUX_CADENCE_NOTE) and never borrows one origin/factor's period for
//     another;
//   * current/prior 28-day windows are compared only with adequate coverage;
//     otherwise the report shows gaps, not a false trend;
//   * GSC query×page associations stay bound to their exact request context
//     (property/searchType/dataState/filters/aggregation/window coverage/
//     truncation): contexts are never blended and landing pages are never
//     inferred;
//   * PSI comparisons happen only between compatible samples on the same
//     URL×strategy; historical-only evidence is labelled non-actionable and
//     never presented as a current regression;
//   * low CTR alone NEVER authorizes a copy change — it is informational;
//   * optional model interpretation is a separate untrusted input appended by
//     the trusted publisher (B2), never a source of any number here.

import { GSC_DATA_TIMEZONE, isValidUtcTimestamp, timestampMs, todayInTimezone } from './gsc-dates.mjs';
import { scopeOfContext } from './gsc-report-core.mjs';
import { compareCompatibleSamples } from './seo-observations.mjs';

export const SEO_REPORT_SCHEMA = 'seo-report/1';

// Explicit freshness thresholds with reasons (recorded in every report).
export const FRESHNESS_THRESHOLDS = {
  gsc: {
    maxFetchAgeHours: 72,
    maxDataLagDays: 6, // collector end lag (3 Pacific days) + publishing lag slack
  },
  psi: {
    maxMeasurementAgeDays: 3,
  },
  crux: {
    // CrUX History publishes rolling 28-day windows on a WEEKLY release
    // cadence. Freshness tolerance is 14 days (two release intervals) between
    // the as-of date and the newest window END date. The 28-day window length
    // itself is never a freshness allowance.
    maxCollectionEndLagDays: 14,
  },
};

export const CRUX_CADENCE_NOTE = 'CrUX History releases rolling 28-day windows weekly; the newest window end may trail the as-of date by at most 14 days (two release intervals). The 28-day window length is never a freshness allowance and rolling windows are never summed into disjoint traffic totals.';

// Deterministic actionable thresholds (documented, recorded with evidence).
export const REGRESSION_THRESHOLDS = {
  lcp: { ratio: 1.2, absMs: 500 }, // +20% and +500 ms
  cls: { abs: 0.05 },
};
export const LAB_TARGETS = { lcpMs: 2500, cls: 0.1 };
export const MIN_QUERY_PAGE_PAIRS = 3;
export const MIN_QUERY_PAGE_IMPRESSIONS = 50;

const MARKDOWN_LIMIT = 6000;

const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const COUNTED_STATES = ['complete', 'empty', 'legacy-unknown'];

// ---------------------------------------------------------------------------
// Source freshness (explicit thresholds, per-target/group, conservative)
// ---------------------------------------------------------------------------

export function classifyGscFreshness({ gsc, asOfMs, thresholds = FRESHNESS_THRESHOLDS.gsc }) {
  const reasons = [];
  const files = gsc?.inputs?.files ?? [];
  // Fetch recency comes from the SELECTED counted evidence behind the report
  // numbers — read ONLY the unique actual selected compatible domain-wide
  // variant/response group (A's own summary selection semantics via
  // scopeOfContext). A newer successful fetch in ANOTHER filter/property/
  // aggregation context never refreshes the selected summary, and an
  // ambiguous selection stays unknown instead of borrowing dates.
  const host = gsc?.params?.host ?? null;
  const domainVariants = (gsc?.sections?.domainPageRows?.variants ?? [])
    .filter((v) => scopeOfContext(v.context ?? {}, host).kind === 'domain-wide');
  let selectedGroup = null;
  let selectionNote = null;
  if (domainVariants.length === 1 && domainVariants[0].groups.length === 1) {
    selectedGroup = domainVariants[0].groups[0];
  } else if (domainVariants.length === 0) {
    selectionNote = 'gsc-counted-evidence-unknown: no domain-wide date_page context backs the selected summary (input files alone prove nothing)';
  } else {
    selectionNote = 'gsc-counted-evidence-ambiguous: multiple domain-wide variants/groups; dates are never borrowed from another filter/aggregation context';
  }
  const dayEvidence = [];
  if (selectedGroup) {
    for (const [day, rec] of Object.entries(selectedGroup.days ?? {})) {
      if (!COUNTED_STATES.includes(rec?.state)) continue;
      dayEvidence.push({ day, fetchedAt: rec?.provenance?.fetchedAt ?? null });
    }
  }
  const fetched = dayEvidence.map((d) => timestampMs(d.fetchedAt ?? null)).filter((t) => t !== null);
  const latestFetchedAtMs = fetched.length > 0 ? Math.max(...fetched) : null;
  // Latest counted data date across the reported windows (Pacific calendar).
  const counted = [
    ...(gsc?.summary?.mainHostPages?.current?.coverage?.countedDates ?? []),
    ...(gsc?.summary?.mainHostPages?.previous?.coverage?.countedDates ?? []),
  ];
  const latestDataDate = counted.length > 0 ? [...counted].sort().at(-1) : null;
  const asOfDay = todayInTimezone(new Date(asOfMs), GSC_DATA_TIMEZONE); // GSC calendar (Pacific)

  if (files.length === 0) {
    return { status: 'missing', fresh: false, reasons: ['gsc-missing: no GSC snapshot files in the observation set'], thresholds, latestFetchedAt: null, latestDataDate: null };
  }
  let dateUnknown = false;
  let dateStale = false;
  let coverageGap = false;
  if (dayEvidence.length === 0) {
    reasons.push(selectionNote ?? 'gsc-counted-evidence-unknown: no selected counted days behind the report numbers (input files alone prove nothing)');
    dateUnknown = true;
  } else if (latestFetchedAtMs === null) {
    reasons.push('gsc-fetch-unprovable: counted evidence has no provable fetchedAt');
    dateUnknown = true;
  } else {
    const ageH = (asOfMs - latestFetchedAtMs) / HOUR_MS;
    if (ageH > thresholds.maxFetchAgeHours) {
      reasons.push(`gsc-fetch-stale: latest counted evidence fetch is ${ageH.toFixed(1)}h old (threshold ${thresholds.maxFetchAgeHours}h)`);
      dateStale = true;
    }
    if (ageH < 0) reasons.push('gsc-fetch-after-as-of: inputs cannot be refreshed by a later run');
  }
  if (latestDataDate === null) {
    reasons.push('gsc-data-dates-unknown: no counted data dates in the reported windows');
    dateUnknown = true;
  } else {
    const lag = (timestampMs(`${asOfDay}T00:00:00Z`) - timestampMs(`${latestDataDate}T00:00:00Z`)) / DAY_MS;
    if (lag > thresholds.maxDataLagDays) {
      reasons.push(`gsc-data-lag: latest data date ${latestDataDate} (Search Console calendar) is ${lag} days before as-of (threshold ${thresholds.maxDataLagDays}, normal publishing lag included)`);
      dateStale = true;
    }
  }
  const currentCoverage = gsc?.summary?.mainHostPages?.current?.coverage ?? null;
  if (currentCoverage && (currentCoverage.partial || !currentCoverage.metricsComplete)) {
    reasons.push(`gsc-partial-coverage: current window has ${currentCoverage.daysCounted}/${currentCoverage.expectedDays} counted days (completeness unproven or gaps present)`);
    coverageGap = true;
  }
  return {
    status: reasons.length === 0 ? 'fresh' : (dateStale ? 'stale' : dateUnknown ? 'unknown' : coverageGap ? 'partial' : 'stale'),
    fresh: reasons.length === 0,
    reasons,
    thresholds,
    latestFetchedAt: latestFetchedAtMs === null ? null : new Date(latestFetchedAtMs).toISOString(),
    latestDataDate,
  };
}

// Per URL×strategy freshness of the CURRENT sample only (a labelled last-good
// sample never refreshes a target). Aggregation is conservative: one fresh
// page never masks a stale or undated target.
export function classifyPsiFreshness({ psi, asOfMs, thresholds = FRESHNESS_THRESHOLDS.psi }) {
  const reasons = [];
  const targets = psi?.byTarget ?? [];
  if (targets.length === 0) {
    return { status: 'missing', fresh: false, reasons: ['psi-missing: no PSI observations in the set'], thresholds, latestMeasurementAt: null, byTarget: {} };
  }
  const byTarget = {};
  let latestMs = null;
  let anyStale = false;
  let anyUnknown = false;
  let anyGap = false;
  for (const t of targets) {
    const key = `${t.url}\u0000${t.strategy}`;
    const tReasons = [];
    let status = 'fresh';
    let measuredAt = null;
    const cur = t.current?.entry ?? null;
    if (!cur || !cur.usable) {
      tReasons.push(`psi-target-no-usable-current: ${t.url} [${t.strategy}] current outcome is ${t.currentOutcome ?? 'unknown'} (older samples never substitute)`);
      status = 'no-usable-current';
      anyGap = true;
    } else if (!isValidUtcTimestamp(cur.provenance?.fetchTime ?? null)) {
      tReasons.push(`psi-target-date-unknown: ${t.url} [${t.strategy}] current measurement has no validated date`);
      status = 'unknown';
      anyUnknown = true;
    } else {
      measuredAt = cur.provenance.fetchTime;
      const ms = timestampMs(measuredAt);
      if (ms !== null && (latestMs === null || ms > latestMs)) latestMs = ms;
      const age = (asOfMs - ms) / DAY_MS;
      if (age > thresholds.maxMeasurementAgeDays) {
        tReasons.push(`psi-stale: ${t.url} [${t.strategy}] current measurement is ${age.toFixed(1)} days old (threshold ${thresholds.maxMeasurementAgeDays}; actual PSI measurement date)`);
        status = 'stale';
        anyStale = true;
      } else if (age < 0) {
        tReasons.push(`psi-target-after-as-of: ${t.url} [${t.strategy}] measurement date is after the cutoff`);
        status = 'unknown';
        anyUnknown = true;
      }
    }
    if (t.currentCertified === false || t.current?.observation?.planCertified === false) {
      tReasons.push(`psi-target-uncertified-stage: ${t.url} [${t.strategy}] the latest stage has no certified plan/denominator`);
      if (status === 'fresh') status = 'uncertified';
      anyGap = true;
    }
    reasons.push(...tReasons);
    byTarget[key] = { url: t.url, strategy: t.strategy, status, measuredAt, reasons: tReasons };
  }
  const fresh = reasons.length === 0;
  const status = fresh ? 'fresh' : (anyStale ? 'stale' : anyGap ? 'partial' : anyUnknown ? 'unknown' : 'stale');
  return { status, fresh, reasons, thresholds, latestMeasurementAt: latestMs === null ? null : new Date(latestMs).toISOString(), byTarget };
}

// Per origin×form-factor freshness. A sampled factor never hides a failed or
// missing factor and one origin/factor's period never refreshes another. A
// current no-sample successful query is a DISTINCT collection status: not a
// failure and never fresh field metrics. Collection CERTIFICATION (recorded
// plan, unexpected/duplicate identity) is consumed too: an uncertified or
// incomplete collection can never certify the source fresh, while metric
// dates stay visible and other certified groups are not polluted.
export function cruxGroupCertified(sample) {
  if (!sample) return false;
  if (sample.unexpected === true || sample.duplicate === true) return false;
  const obs = sample.observation ?? null;
  if (obs && obs.planCertified === false) return false;
  if (obs && obs.runStatus !== 'ok') return false; // uncertified/incomplete collection
  return true;
}

export function classifyCruxFreshness({ crux, asOfMs, thresholds = FRESHNESS_THRESHOLDS.crux }) {
  const groups = crux?.byFormFactor ?? [];
  if (groups.length === 0) {
    return { status: 'missing', fresh: false, reasons: ['crux-missing: no CrUX observations in the set'], thresholds, latestCollectionDate: null, byGroup: {} };
  }
  const reasons = [];
  const byGroup = {};
  let latestDate = null;
  let anyStale = false;
  let anyUnknown = false;
  let anyBroken = false;
  let anyUncertified = false;
  for (const g of groups) {
    const key = `${g.origin ?? 'unknown'}\u0000${g.formFactor}`;
    const tReasons = [];
    let status = 'fresh';
    const entry = g.current?.entry ?? null;
    const st = entry?.status ?? g.currentOutcome ?? 'missing';
    const certified = cruxGroupCertified(g.current);
    if (g.originProven === false) {
      tReasons.push(`crux-identity-unproven: ${key} lacks a proven observation origin; never certified and never blended`);
      status = 'unproven';
      anyBroken = true;
    } else if (st === 'failed') {
      tReasons.push(`crux-query-failed: ${key} current query failed`);
      status = 'failed';
      anyBroken = true;
    } else if (st === 'invalid' || st === 'identity-unproven') {
      tReasons.push(`crux-record-invalid: ${key} current record is invalid/identity-unproven`);
      status = 'invalid';
      anyBroken = true;
    } else if (st === 'missing') {
      tReasons.push(`crux-factor-missing: ${key} has no current result row (unknown outcome, never zero)`);
      status = 'missing';
      anyBroken = true;
    } else if (st === 'no-sample') {
      tReasons.push(`crux-no-sample: ${key} is a successful query with no field sample (unknown field data, never zero and never fresh field metrics)`);
      status = 'no-sample';
      anyUnknown = true;
    } else if (st === 'sampled') {
      const last = entry?.latestPeriod?.lastDate ?? null;
      if (typeof last !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(last)) {
        tReasons.push(`crux-collection-date-unknown: ${key} has no dated collection period`);
        status = 'unknown';
        anyUnknown = true;
      } else {
        const asOfDay = todayInTimezone(new Date(asOfMs), 'UTC');
        const lag = (timestampMs(`${asOfDay}T00:00:00Z`) - timestampMs(`${last}T00:00:00Z`)) / DAY_MS;
        if (lag < 0) {
          // A window cannot have ended after the evidence cutoff: unproven.
          tReasons.push(`crux-collection-date-after-as-of: ${key} newest window ends ${last}, after the as-of date (cannot be fresh at the cutoff)`);
          status = 'unknown';
          anyUnknown = true;
        } else if (lag > thresholds.maxCollectionEndLagDays) {
          tReasons.push(`crux-stale: ${key} newest collection window ended ${last} (${lag} days before as-of; threshold ${thresholds.maxCollectionEndLagDays} per weekly release cadence)`);
          status = 'stale';
          anyStale = true;
        }
        if (latestDate === null || last > latestDate) latestDate = last; // only from this group's own period
      }
    } else {
      tReasons.push(`crux-status-unknown: ${key} has unrecognized status ${st}`);
      status = 'unknown';
      anyUnknown = true;
    }
    if (!certified) {
      // Metric dates stay visible, but an uncertified/incomplete collection
      // (no recorded plan, unexpected/duplicate rows, partial read) never
      // certifies fresh. Only this group's OWN current observation is
      // consulted — other origins' or older observations' status never
      // pollutes this group.
      const runStatus = g.current?.observation?.runStatus ?? null;
      const detail = g.current?.unexpected ? 'unexpected factor row'
        : g.current?.duplicate ? 'duplicate factor row'
        : g.current?.observation?.planCertified === false ? 'no certified plan/identity for the current collection'
        : `incomplete collection (runStatus ${runStatus ?? 'unknown'})`;
      tReasons.unshift(`crux-collection-uncertified: ${key} current collection is uncertified/incomplete (${detail})`);
      status = 'uncertified';
      anyUncertified = true;
    }
    reasons.push(...tReasons);
    byGroup[key] = { origin: g.origin ?? null, formFactor: g.formFactor, status, certified, latestPeriodEnd: entry?.latestPeriod?.lastDate ?? null, reasons: tReasons };
  }
  const fresh = reasons.length === 0;
  const status = fresh ? 'fresh' : (anyStale ? 'stale' : (anyBroken || anyUncertified) ? 'partial' : 'unknown');
  return { status, fresh, reasons, thresholds, latestCollectionDate: latestDate, byGroup };
}

// ---------------------------------------------------------------------------
// Trend: current/prior non-overlapping windows only with adequate coverage
// ---------------------------------------------------------------------------

export function buildTrend({ gsc }) {
  const basis = "A's gsc-report/1 non-overlapping current/prior windows over returned page-dimension rows (not property chart totals)";
  const win = gsc?.summary?.mainHostPages;
  const w = gsc?.params?.windows;
  if (!win?.current || !win?.previous) {
    return { status: 'not-comparable', reason: 'window evidence missing on one side', basis, windows: w ?? null };
  }
  for (const name of ['current', 'previous']) {
    const t = win[name];
    if (t.metrics === null) {
      return { status: 'not-comparable', reason: `no counted evidence in the ${name} window`, basis, windows: w };
    }
    const c = t.coverage ?? {};
    if (!c.metricsComplete || c.partial) {
      return {
        status: 'not-comparable',
        reason: `${name} window coverage is incomplete (${c.daysCounted}/${c.expectedDays} counted days) — reporting gaps, not a trend`,
        basis,
        windows: w,
      };
    }
  }
  return {
    status: 'comparable',
    reason: null,
    basis,
    windows: w,
    note: 'windows are non-overlapping; overlapping snapshots are never called a trend',
  };
}

// ---------------------------------------------------------------------------
// Query evidence: real query×page associations bound to their exact request
// context and response aggregation. Contexts are never blended into one flat
// pool and landing pages are never inferred.
// ---------------------------------------------------------------------------

export function buildQueryEvidence({ gsc, includeQueryRows }) {
  if (!includeQueryRows) {
    return { status: 'not-requested', groups: null, basis: 'query rows are opt-in (--include-query-rows); the default report contains no raw query strings' };
  }
  const variants = gsc?.sections?.blogQueryPage?.variants ?? [];
  const groups = [];
  let gi = 0;
  for (const v of variants) {
    for (const g of v.groups ?? []) {
      gi += 1;
      const windows = {};
      let any = false;
      for (const name of ['current', 'previous']) {
        const w = g.queries?.windows?.[name] ?? null;
        const qpp = w?.queryPagePairs ?? null;
        if (!qpp) {
          windows[name] = { window: g.windows?.[name]?.window ?? null, coverage: w?.coverage ?? null, queryPagePairs: null };
          continue;
        }
        any = true;
        // Own counted provenance for THIS context/window: the gate re-evaluates
        // freshness from these original dates at decision time (a fresh page
        // summary in another context never refreshes this group).
        const countedDates = [...(w?.coverage?.countedDates ?? [])];
        const fetched = countedDates
          .map((d) => g.days?.[d]?.provenance?.fetchedAt ?? null)
          .filter((t) => isValidUtcTimestamp(t ?? null))
          .sort();
        windows[name] = {
          window: g.windows?.[name]?.window ?? null,
          coverage: w?.coverage ?? null,
          provenance: {
            countedDates,
            fetchedAtLatest: fetched.at(-1) ?? null,
            fetchedAtEarliest: fetched[0] ?? null,
          },
          queryPagePairs: {
            totalPairs: qpp.totalPairs ?? (qpp.pairs ?? []).length,
            limit: qpp.limit ?? null,
            truncated: Boolean(qpp.truncated),
            basis: qpp.basis ?? null,
            pairs: (qpp.pairs ?? []).map((p) => ({
              query: p.query, page: p.page, label: p.label, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position,
            })),
          },
        };
      }
      if (!any) continue;
      groups.push({
        id: `query-${gi}`,
        context: {
          property: v.context?.property ?? null,
          searchType: v.context?.searchType ?? null,
          dataState: v.context?.dataState ?? null,
          dimensions: Array.isArray(v.context?.dimensions) ? [...v.context.dimensions] : null,
          filters: v.context?.filters ?? null,
          requestAggregationType: v.context?.requestAggregationType ?? null,
          slice: v.context?.slice ?? null,
        },
        responseAggregationType: g.responseAggregationType ?? null,
        windows,
      });
    }
  }
  if (groups.length === 0) {
    return { status: 'absent', groups: [], basis: 'no query×page rows returned; absence is a coverage/limit fact (anonymous queries, row caps), never zero demand and never an inferred landing page' };
  }
  return {
    status: 'present',
    groups,
    basis: 'each group is bound to its exact request context, response aggregation and window coverage; query×page rows are real returned pairs only — contexts are never blended and landing pages are never inferred',
  };
}

// ---------------------------------------------------------------------------
// PSI section: denominators by strategy, current vs labelled last-good,
// compatible-sample comparisons with a preserved missing set
// ---------------------------------------------------------------------------

const cmpResult = (target, from, to, cmp, currentComparison) => ({
  url: target.url,
  strategy: target.strategy,
  compared: cmp.compatible,
  reason: cmp.reason,
  precisionLimited: cmp.precisionLimited ?? false,
  deltas: cmp.deltas ?? null,
  missingMetrics: cmp.missingMetrics ?? [],
  current: currentComparison, // is the 'to' sample the CURRENT outcome?
  historical: !currentComparison,
  from: from ? { file: from.observation?.file, observedAt: from.observation?.observedAt, label: from.label ?? null } : null,
  to: to ? { file: to.observation?.file, observedAt: to.observation?.observedAt, label: to.label ?? null } : null,
});

export function buildPsiSection({ psi }) {
  const targets = [];
  const comparisons = [];
  const missingSet = [];
  for (const t of psi?.byTarget ?? []) {
    const cur = t.current;
    const sampleSummary = (s) => (s ? {
      file: s.observation?.file ?? null,
      observedAt: s.observation?.observedAt ?? null,
      slotStatus: s.slotStatus ?? null,
      finalStatus: s.entry?.finalStatus ?? null,
      label: s.label ?? null,
      fetchTime: s.entry?.provenance?.fetchTime ?? null,
      lcpMs: s.entry?.metrics?.LCP?.numericValue ?? null,
      cls: s.entry?.metrics?.CLS?.numericValue ?? null,
      clsPrecision: s.entry?.metrics?.CLS?.precision ?? null,
      metaDescriptionScore: s.entry?.seoAudits?.['meta-description']?.score ?? null,
    } : null);
    targets.push({
      url: t.url,
      strategy: t.strategy,
      currentOutcome: t.currentOutcome,
      currentCertified: t.currentCertified !== false,
      currentLabel: t.currentLabel ?? null,
      current: sampleSummary(cur),
      lastGood: sampleSummary(t.lastGood),
      lastGoodLabel: t.lastGood?.label ?? null,
      sampleCount: t.sampleCount,
    });
    // Regression check: current usable sample vs the previous usable sample.
    // Historical-only comparisons (after a current failure/missing OR under an
    // uncertified/historical-supplement current stage) stay visible but can
    // never present as current regressions.
    const usable = t.samples.filter((s) => s.entry?.usable);
    if (usable.length >= 2) {
      const to = usable[usable.length - 1];
      const from = usable[usable.length - 2];
      const cmp = compareCompatibleSamples(to, from);
      const currentComparison = to.entry === cur?.entry && t.currentCertified !== false;
      comparisons.push({ ...cmpResult(t, from, to, cmp, currentComparison), fromStatus: from.entry.finalStatus, toStatus: to.entry.finalStatus });
      if (!cmp.compatible) missingSet.push({ url: t.url, strategy: t.strategy, reason: cmp.reason });
    } else {
      missingSet.push({ url: t.url, strategy: t.strategy, reason: 'fewer than two usable samples; no comparison possible' });
    }
  }
  const denominators = {};
  const observations = psi?.observations ?? [];
  const latest = observations.at(-1) ?? null;
  if (latest?.counts) {
    for (const [strategy, c] of Object.entries(latest.counts.byStrategy ?? {})) {
      denominators[strategy] = { planned: c.planned, succeeded: c.succeeded, partial: c.partial, failed: c.failed, missing: c.missing, usable: c.usable };
    }
  }
  return {
    scope: {
      basis: 'PSI v5 laboratory measurements (Lighthouse) per URL×strategy; field data (CrUX) is reported separately',
      strategies: ['mobile', 'desktop'],
    },
    latestObservation: latest ? {
      file: latest.file,
      observedAt: latest.observedAt,
      runStatus: latest.runStatus,
      planCertified: latest.planCertified !== false,
      counts: latest.counts,
    } : null,
    denominators, // planned / succeeded / partial / failed / missing BY STRATEGY
    targets,
    comparisons, // compatible-sample comparisons only (current or historical)
    missingSet, // preserved set of targets without a valid comparison
    note: 'no sample-mix means: comparisons are pairwise per URL×strategy with compatible tool version and emulation/throttling settings; a labelled last-good sample never substitutes for the current outcome; historical-only comparisons are labelled non-actionable',
  };
}

// ---------------------------------------------------------------------------
// CrUX section: latest collection period per origin×form factor
// ---------------------------------------------------------------------------

export function buildCruxSection({ crux }) {
  const groups = (crux?.byFormFactor ?? []).map((g) => {
    const entry = g.current?.entry ?? null;
    return {
      origin: g.origin,
      originProven: g.originProven !== false,
      formFactor: g.formFactor,
      currentOutcome: g.currentOutcome,
      status: entry?.status ?? null, // sampled | no-sample | failed | invalid | missing | identity-unproven
      key: entry?.key ?? null,
      latestPeriod: entry?.latestPeriod ?? null, // actual latest rolling window + date
      overlappingWindows: entry?.overlappingWindows ?? null,
      latestPeriodStatus: entry?.latestPeriodStatus ?? null,
      sampledPeriods: entry?.sampledPeriods ?? null,
      lastGood: g.lastGood ? { observedAt: g.lastGood.observation?.observedAt, label: g.lastGood.label, status: g.lastGood.entry?.status, latestPeriod: g.lastGood.entry?.latestPeriod ?? null } : null,
      sampleCount: g.sampleCount,
    };
  });
  const origins = [...new Set(groups.map((g) => g.origin))];
  return {
    scope: {
      basis: 'CrUX History real-user field data per origin×form factor',
      origins,
    },
    groups,
    originsCompatible: origins.length <= 1,
    originConflict: origins.length > 1
      ? `multiple CrUX origins present (${origins.join(', ')}); field data of different origins is never blended — refuse cross-origin conclusions`
      : null,
    cadenceNote: CRUX_CADENCE_NOTE,
    note: 'notEligible is a successful query with no field sample (unknown, never zero); no-sample is a distinct collection status, not failure and not fresh field metrics',
  };
}

// ---------------------------------------------------------------------------
// Deterministic observations (actionable CURRENT seeds + historical signals)
// ---------------------------------------------------------------------------

// Regression hits under the shared thresholds (also consumed by the
// proposal-only gate so there is exactly one metrics rule set).
export function regressionHits(deltas) {
  const hits = [];
  const lcp = deltas?.LCP;
  if (lcp && lcp.delta > 0 && lcp.delta >= REGRESSION_THRESHOLDS.lcp.absMs && lcp.to >= lcp.from * REGRESSION_THRESHOLDS.lcp.ratio) {
    hits.push({ metric: 'LCP', unit: 'ms', from: lcp.from, to: lcp.to, delta: lcp.delta, threshold: REGRESSION_THRESHOLDS.lcp });
  }
  const cls = deltas?.CLS;
  if (cls && cls.delta >= REGRESSION_THRESHOLDS.cls.abs) {
    hits.push({ metric: 'CLS', unit: 'unitless', from: cls.from, to: cls.to, delta: cls.delta, threshold: REGRESSION_THRESHOLDS.cls });
  }
  return hits;
}

function metricRegression(url, strategy, cmp) {
  return regressionHits(cmp.deltas).map((h) => ({
    kind: 'metric-regression',
    actionable: true, // performance investigation proposal only — no copy change
    targetUrl: url,
    strategy,
    evidence: { source: 'psi-compatible-samples', comparison: { from: cmp.from ?? null, to: cmp.to ?? null }, metric: h, precisionLimited: Boolean(cmp.precisionLimited) },
    note: 'known metric regression between compatible samples; authorizes a performance investigation proposal only',
  }));
}

export function buildObservations({ gsc, psiSection, cruxSection }) {
  const out = [];
  for (const t of psiSection.targets ?? []) {
    const cur = t.current ?? null;
    const currentUsableDated = Boolean(
      cur
      && (cur.finalStatus === 'success' || cur.finalStatus === 'partial')
      && (typeof cur.fetchTime === 'string' || typeof cur.observedAt === 'string'),
    );
    // Certification is respected: a target the latest stage never certified
    // (historical-supplement) can never produce CURRENT actionable work even
    // when its older audit is real.
    const certifiedCurrent = t.currentCertified !== false && !t.currentLabel;
    const auditMissing = (s) => s && s.metaDescriptionScore !== null && s.metaDescriptionScore !== undefined && s.metaDescriptionScore < 1;
    if (certifiedCurrent && currentUsableDated && auditMissing(cur)) {
      // ONLY a current, target-specific, dated audit authorizes actionable
      // description work.
      out.push({
        kind: 'missing-description',
        actionable: true,
        targetUrl: t.url,
        strategy: t.strategy,
        evidence: { source: 'psi-seo-audit', audit: 'meta-description', score: cur.metaDescriptionScore, measurementDate: cur.fetchTime ?? cur.observedAt, sampleLabel: 'current' },
        note: 'missing/invalid meta description observed by the CURRENT PSI meta-description audit; a description fix is metadata work, not a copy-intent rewrite',
      });
    } else if (auditMissing(cur) || auditMissing(t.lastGood)) {
      // Old or uncertified-stage evidence stays explicitly historical and
      // non-actionable, with original values and source dates preserved.
      const sample = auditMissing(cur) ? cur : t.lastGood;
      out.push({
        kind: 'missing-description-historical',
        actionable: false,
        targetUrl: t.url,
        strategy: t.strategy,
        evidence: {
          source: 'psi-seo-audit',
          audit: 'meta-description',
          score: sample.metaDescriptionScore,
          measurementDate: sample.fetchTime ?? sample.observedAt,
          sampleLabel: sample.label ?? t.currentLabel ?? 'historical',
        },
        note: 'historical diagnostic only (older labelled sample or uncertified/historical-supplement current stage); a certified CURRENT dated audit is required before any actionable description work',
      });
    }
  }
  for (const c of psiSection.comparisons ?? []) {
    if (!c.compared) continue;
    const items = metricRegression(c.url, c.strategy, { ...c, from: c.from?.observedAt, to: c.to?.observedAt });
    if (c.historical) {
      out.push(...items.map((i) => ({
        ...i,
        kind: 'metric-regression-historical',
        actionable: false,
        note: 'historical-only comparison after a current failure/missing sample; NOT presented as a current regression',
      })));
    } else {
      out.push(...items);
    }
  }
  for (const t of psiSection.targets ?? []) {
    const probe = t.current?.lcpMs ?? null;
    const cls = t.current?.cls ?? null;
    const dated = t.current && (t.current.finalStatus === 'success' || t.current.finalStatus === 'partial');
    const certifiedCurrent = t.currentCertified !== false && !t.currentLabel;
    if (certifiedCurrent && dated && ((probe !== null && probe > LAB_TARGETS.lcpMs) || (cls !== null && cls > LAB_TARGETS.cls))) {
      out.push({
        kind: 'metric-over-target',
        actionable: false,
        targetUrl: t.url,
        strategy: t.strategy,
        evidence: { source: 'psi-lab', lcpMs: probe, cls, labTargets: LAB_TARGETS, measurementDate: t.current.fetchTime ?? t.current.observedAt },
        note: 'laboratory metric over the agreed lab target (LCP ≤ 2.5s, CLS ≤ 0.1); residual bottleneck is reported, single samples are never conclusions',
      });
    }
  }
  const cpc = gsc?.summary?.queryCoverage?.current;
  const main = gsc?.summary?.mainHostPages?.current?.metrics ?? null;
  if (cpc && main && main.impressions > 0 && main.ctr < 0.005) {
    out.push({
      kind: 'low-ctr-signal',
      actionable: false,
      targetUrl: null,
      evidence: { source: 'gsc-page-rows', ctr: main.ctr, clicks: main.clicks, impressions: main.impressions, window: gsc.params.windows.current },
      note: 'low CTR alone NEVER authorizes a copy change; it is an investigation signal requiring real query×page evidence per page',
    });
  }
  void cruxSection;
  return out;
}

// ---------------------------------------------------------------------------
// Prepared Markdown for the existing `seo` daily section (deterministic part)
// ---------------------------------------------------------------------------

function escapeMarkers(text) {
  // Defense in depth: generated Markdown must never carry section marker
  // tokens that could confuse daily-report sectioning (applySection escapes
  // them too, but malformed Markdown must not even attempt it).
  return text.replaceAll('<!--', '&lt;!--').replaceAll('-->', '--&gt;');
}

export function buildMarkdown(report) {
  const lines = [];
  lines.push(`#### SEO 观测（确定性） ${report.params.runDate} · as-of ${report.params.asOf}`);
  lines.push('');
  const src = report.sources;
  lines.push(`- GSC: ${src.gsc.freshness.status}（${src.gsc.scope.property}; ${src.gsc.scope.host} 页面行; 数据截至 ${src.gsc.freshness.latestDataDate ?? 'unknown'}）`);
  lines.push(`- PSI: ${src.psi.freshness.status}（测量日期 ${src.psi.freshness.latestMeasurementAt ?? 'unknown'}）`);
  lines.push(`- CrUX: ${src.crux.freshness.status}（最近采集期止于 ${src.crux.freshness.latestCollectionDate ?? 'unknown'}，无样本=未知非零）`);
  for (const [name, f] of [['GSC', src.gsc.freshness], ['PSI', src.psi.freshness], ['CrUX', src.crux.freshness]]) {
    for (const r of f.reasons.slice(0, 4)) lines.push(`- ${name} 提示: ${r}`);
  }
  lines.push('');
  const t = report.trend;
  const cur = report.gscWindows?.current;
  const prev = report.gscWindows?.previous;
  if (cur) lines.push(`- 当前 28 天(${cur.start}..${cur.end})：${fmtMetrics(cur.metrics)}，覆盖 ${cur.coverageText}`);
  if (prev) lines.push(`- 前一 28 天(${prev.start}..${prev.end})：${fmtMetrics(prev.metrics)}，覆盖 ${prev.coverageText}`);
  lines.push(`- 趋势: ${t.status === 'comparable' ? '可比较（不重叠窗口）' : `不可比较 — ${t.reason}`}`);
  lines.push('');
  const den = src.psi.denominators;
  const denText = Object.entries(den).map(([s, c]) => `${s} ${c.succeeded}成功/${c.partial}部分/${c.failed}失败/${c.missing}缺失（计划 ${c.planned}）`).join('；');
  lines.push(`- PSI 分母: ${denText || '无观测'}`);
  for (const target of src.psi.targets.filter((x) => x.currentOutcome !== 'success').slice(0, 8)) {
    lines.push(`- PSI 当前状态: ${target.url} [${target.strategy}] → ${target.currentOutcome}${target.lastGoodLabel ? '（last-good 已标注，不替代当前状态）' : ''}`);
  }
  lines.push('');
  lines.push('建议动作（确定性；低 CTR 单独出现不授权任何文案修改）：');
  const actionable = report.observations.filter((o) => o.actionable);
  if (actionable.length === 0) {
    lines.push('- 无高质量候选，安全跳过（这不是失败）。');
  }
  for (const o of actionable.slice(0, 8)) {
    lines.push(`- **[${o.kind}]** ${o.targetUrl ?? '全站'} — ${o.note}`);
  }
  lines.push('');
  lines.push('本小节由确定性脚本生成；可选模型解读是独立的不可信输入，不构成任何数字来源。');
  const text = escapeMarkers(lines.join('\n'));
  return text.length > MARKDOWN_LIMIT ? `${text.slice(0, MARKDOWN_LIMIT)}\n…（截断）` : text;
}

function fmtMetrics(m) {
  if (!m) return '无计入证据';
  return `${m.clicks} 点击 / ${m.impressions} 曝光 / CTR ${(m.ctr * 100).toFixed(3)}% / 位置 ${m.position.toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Assembly (pure; no clock, no I/O)
// ---------------------------------------------------------------------------

export function buildSeoReport({ gsc, psi, crux, params }) {
  if (gsc?.schema !== 'gsc-report/1') {
    throw new Error("buildSeoReport: expected a gsc-report/1 report from A's public API (buildReport)");
  }
  const asOfMs = timestampMs(params.asOf);
  if (asOfMs === null) {
    throw new Error('buildSeoReport: params.asOf must be a strict UTC timestamp (recorded input, fail closed)');
  }
  const gscFreshness = classifyGscFreshness({ gsc, asOfMs });
  const psiFreshness = classifyPsiFreshness({ psi, asOfMs });
  const cruxFreshness = classifyCruxFreshness({ crux, asOfMs });
  const psiSection = buildPsiSection({ psi });
  const cruxSection = buildCruxSection({ crux });
  const trend = buildTrend({ gsc });
  const queryEvidence = buildQueryEvidence({ gsc, includeQueryRows: params.includeQueryRows });
  const observations = buildObservations({ gsc, psiSection, cruxSection });

  const windowView = (name) => {
    const t = gsc.summary?.mainHostPages?.[name];
    const w = gsc.params.windows[name];
    if (!t || !w) return null;
    return {
      start: w.start,
      end: w.end,
      metrics: t.metrics,
      coverage: t.coverage ?? null,
      coverageText: t.coverage ? `${t.coverage.daysCounted}/${t.coverage.expectedDays} 天计入${t.coverage.metricsComplete ? '（完整）' : '（不完整）'}` : 'unknown',
    };
  };

  const report = {
    schema: SEO_REPORT_SCHEMA,
    params: {
      dir: params.dir ?? null,
      start: gsc.params.start,
      end: gsc.params.end,
      host: gsc.params.host,
      asOf: params.asOf,
      asOfBasis: params.asOfBasis ?? 'explicit',
      runDate: params.runDate ?? params.asOf.slice(0, 10),
      runDateBasis: params.runDateBasis ?? (params.runDate ? 'explicit' : 'as-of-date'),
      includeQueryRows: Boolean(params.includeQueryRows),
    },
    inputs: {
      // complete input provenance: exactly which evidence entered this report
      gsc: { files: gsc.inputs.files, counts: gsc.inputs.counts, excludedByAsOf: gsc.inputs.excludedByAsOf, duplicates: gsc.inputs.duplicates, problems: gsc.inputs.problems },
      psi: { observations: (psi?.observations ?? []).map((o) => ({ file: o.file, schema: o.schema, observedAt: o.observedAt, runStatus: o.runStatus ?? null, planCertified: o.planCertified !== false, counts: o.counts ?? null })), excluded: psi?.excluded ?? [], problems: psi?.problems ?? [] },
      crux: { observations: (crux?.observations ?? []).map((o) => ({ file: o.file, observedAt: o.observedAt, runStatus: o.runStatus, identityCertified: o.identityCertified !== false, planCertified: o.planCertified !== false, problems: o.problems })), excluded: crux?.excluded ?? [], problems: crux?.problems ?? [] },
    },
    sources: {
      gsc: {
        scope: {
          property: gsc.summary?.identity?.property ?? null,
          searchType: gsc.summary?.identity?.searchType ?? null,
          dataState: gsc.summary?.identity?.dataState ?? null,
          host: gsc.params.host,
          basis: 'returned page-dimension rows for the strict main host; query rows are host-filtered and incomplete',
        },
        dataDates: { start: gsc.params.start, end: gsc.params.end, windows: gsc.params.windows, latestDataDate: gscFreshness.latestDataDate, dataTimezone: 'America/Los_Angeles' },
        freshness: gscFreshness,
        completeness: {
          current: gsc.summary?.mainHostPages?.current?.coverage ?? null,
          previous: gsc.summary?.mainHostPages?.previous?.coverage ?? null,
        },
        summary: gsc.summary,
      },
      psi: { freshness: psiFreshness, ...psiSection },
      crux: { freshness: cruxFreshness, ...cruxSection },
    },
    gscWindows: { current: windowView('current'), previous: windowView('previous') },
    trend,
    queryEvidence,
    observations,
    notes: [
      'data dates (GSC calendar / PSI measurement dates / CrUX collection periods) are separate from the UTC run date',
      'low CTR alone never authorizes a copy change',
      CRUX_CADENCE_NOTE,
      'optional model interpretation is a separate untrusted input, never a source of numeric truth',
    ],
    pending: [
      ...(gsc.pending ?? []),
      'live Analyze read-back and three scheduled runs are parent-owned live gates (not claimed here)',
    ],
  };
  report.markdown = buildMarkdown(report);
  return report;
}
