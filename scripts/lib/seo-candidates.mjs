// Proposal-only candidate gate core (schema seo-autofix-gate/1) — issue #392
// / batch B1. Pure decisions over the deterministic SEO report (seo-report/1),
// an EXPLICIT normalized reviewState (seo-review-state/1) and the trusted
// Hugo page map (seo-page-map/1).
//
// Hard boundaries (independent review decisions + frozen page-map review):
//   * proposal mode only: no content writes, branches, PRs, issue writes,
//     model calls or generic auto-edit policy engine. Apply is explicitly
//     unavailable until independently authorized implementation.
//   * REAL TARGET IDENTITY: a candidate resolves through the trusted page map
//     (targetUrl -> one sourcePath) and NOTHING else. No contentPathToUrl
//     guessing, no alias merging, no path case folding, no model targetPaths
//     borrowing another page's evidence. Overlap compares the resolved
//     sourcePath directly against ACTUAL changed-files (B2 includes old+new
//     rename paths).
//   * explicit decision time: asOfMs is the decision instant. reviewState
//     observedAt may never exceed it (even by 1 second); the map clock must
//     equal it; the report selection cutoff must not exceed it. Stored
//     fresh:true flags are never trusted — freshness is re-evaluated from the
//     original measuredAt / data dates / window ends at the decision time and
//     the report cutoff is preserved separately. New maps/wrappers can never
//     freshen old data.
//   * fail closed on review state: missing, stale, failed, truncated or
//     incomplete review state (including unknown close/merge recency) is a
//     VISIBLE safe skip — never zero/empty backlog by default.
//   * skill rules stay visible: backlog >= 3 blocks; an overlapping OPEN
//     proposal blocks; a proposal closed WITHOUT merge within 14 days blocks;
//     merged or unrelated proposals never block.
//   * candidate requirements depend on kind and target: title/content intent
//     changes need THAT page's real query×page coverage in ONE eligible
//     current context/window with its own freshness and full provenance
//     (evidence on another page/context never borrows). LOW CTR ALONE NEVER
//     AUTHORIZES A COPY CHANGE. CrUX no-sample never blocks a sufficiently
//     evidenced GSC proposal.
//   * intent text is untrusted input: bounded text only, never a source of
//     numeric truth and never a substitute for the target's own current
//     certified fresh measurement.

import { GSC_DATA_TIMEZONE, isValidCalendarDate, isValidUtcTimestamp, timestampMs, todayInTimezone } from './gsc-dates.mjs';
import {
  FRESHNESS_THRESHOLDS,
  MIN_QUERY_PAGE_IMPRESSIONS,
  MIN_QUERY_PAGE_PAIRS,
  regressionHits,
} from './seo-report-core.mjs';
import { normalizePageMap, resolveTargetPage, validateOwnedUrl } from './seo-page-map.mjs';

export const REVIEW_STATE_SCHEMA = 'seo-review-state/1';
export const INTENTS_SCHEMA = 'seo-autofix-intents/1';
export const GATE_SCHEMA = 'seo-autofix-gate/1';

export const CANDIDATE_KINDS = ['meta-description', 'title-intent', 'content-intent', 'internal-link', 'performance-regression'];
const KIND_PRIORITY = ['meta-description', 'title-intent', 'content-intent', 'internal-link', 'performance-regression'];

// Required evidence per kind (visible in every decision).
export const KIND_REQUIREMENTS = {
  'meta-description': { sources: ['psi'], ownAudit: 'meta-description:0', queryPage: false, compatibleComparison: false },
  'title-intent': { sources: ['gsc'], ownAudit: null, queryPage: true, compatibleComparison: false },
  'content-intent': { sources: ['gsc'], ownAudit: null, queryPage: true, compatibleComparison: false },
  'internal-link': { sources: ['gsc'], ownAudit: null, queryPage: true, compatibleComparison: false },
  'performance-regression': { sources: ['psi'], ownAudit: null, queryPage: false, compatibleComparison: true },
};

export const REVIEW_THRESHOLDS = {
  maxAgeHours: 24, // review state older than this is stale (visible safe skip)
  rejectionLookbackDays: 14, // closed-without-merge overlap blocks within this window
  backlogBlockAt: 3, // 3+ relevant open proposals block (review bottleneck)
  defaultBudget: 2, // finite candidate budget (skill MAX_PRS default)
  maxBudget: 5,
};

const REJECTION_LOOKBACK_MS = REVIEW_THRESHOLDS.rejectionLookbackDays * 86400000;
const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const BOUND_TEXT = 300;
const HEX40 = /^[0-9a-f]{40}$/;

function boundText(value) {
  const cleaned = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '');
  return cleaned.length > BOUND_TEXT ? `${cleaned.slice(0, BOUND_TEXT)}…` : cleaned;
}

// ---------------------------------------------------------------------------
// reviewState normalization (strict; never defaulted)
// ---------------------------------------------------------------------------

const isNullOrAbsent = (v) => v === undefined || v === null;

export function normalizeReviewState(raw) {
  const problems = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, problems: ['review state is not a JSON object'], state: null };
  }
  if (raw.schema !== REVIEW_STATE_SCHEMA) problems.push(`unexpected review state schema (expected ${REVIEW_STATE_SCHEMA})`);
  if (typeof raw.repository !== 'string' || raw.repository === '') problems.push('repository identity missing');
  if (!isValidUtcTimestamp(raw.observedAt ?? null)) problems.push('observedAt is missing or not a strict UTC timestamp');
  const observedMs = timestampMs(raw.observedAt ?? null);
  const read = raw.read && typeof raw.read === 'object' ? raw.read : null;
  if (!read || !['ok', 'failed', 'partial', 'truncated'].includes(read.status)) {
    problems.push('read.status missing or unknown');
  }
  if (!read || !['complete', 'partial', 'truncated'].includes(read.completeness)) {
    problems.push('read.completeness missing or unknown');
  }
  const backlogCount = raw.backlog?.relevantOpenCount;
  if (!Number.isInteger(backlogCount) || backlogCount < 0) {
    problems.push('backlog.relevantOpenCount missing or invalid (never defaulted to zero)');
  }
  const proposals = [];
  if (!Array.isArray(raw.proposals)) {
    problems.push('proposals missing or not an array');
  } else {
    for (const [i, p] of raw.proposals.entries()) {
      if (!p || typeof p !== 'object') { problems.push(`proposal ${i} is not an object`); continue; }
      if (!Number.isInteger(p.number)) { problems.push(`proposal ${i} has no number`); continue; }
      if (!['open', 'closed-merged', 'closed-unmerged'].includes(p.state)) { problems.push(`proposal ${p.number} has unknown state`); continue; }
      if (!Array.isArray(p.changedFiles) || p.changedFiles.some((f) => typeof f !== 'string' || f === '')) {
        // overlap claims require actual changed-file evidence — never body/title
        problems.push(`proposal ${p.number} has no valid changedFiles list (incomplete changed-file read)`);
        continue;
      }
      // Consistent state/closed/merged timestamps are REQUIRED. Unknown
      // recency (e.g. closed-unmerged without closedAt) is incomplete — it can
      // never authorize and never silently "treat as ok".
      const closedOk = isValidUtcTimestamp(p.closedAt ?? null);
      const mergedOk = isValidUtcTimestamp(p.mergedAt ?? null);
      let consistent = true;
      if (p.state === 'open') {
        if (!isNullOrAbsent(p.closedAt) || !isNullOrAbsent(p.mergedAt)) {
          problems.push(`proposal ${p.number} is open but carries closed/merged timestamps (inconsistent state)`);
          consistent = false;
        }
      } else if (p.state === 'closed-unmerged') {
        if (!closedOk) {
          problems.push(`proposal ${p.number} is closed-unmerged without a valid closedAt (unknown recency is incomplete)`);
          consistent = false;
        }
        if (!isNullOrAbsent(p.mergedAt)) {
          problems.push(`proposal ${p.number} is closed-unmerged but carries mergedAt (inconsistent state)`);
          consistent = false;
        }
      } else if (p.state === 'closed-merged') {
        if (!mergedOk) {
          problems.push(`proposal ${p.number} is closed-merged without a valid mergedAt (unknown recency is incomplete)`);
          consistent = false;
        }
        if (!isNullOrAbsent(p.closedAt) && !closedOk) {
          problems.push(`proposal ${p.number} has an invalid closedAt`);
          consistent = false;
        }
      }
      // Closed/merged timestamps can never exceed the observed review time.
      for (const [field, value] of [['closedAt', p.closedAt], ['mergedAt', p.mergedAt]]) {
        if (isNullOrAbsent(value)) continue;
        const ms = timestampMs(value);
        if (ms === null || (observedMs !== null && ms > observedMs)) {
          problems.push(`proposal ${p.number} ${field} exceeds the observed review time or is invalid`);
          consistent = false;
        }
      }
      if (!consistent) continue;
      proposals.push({
        number: p.number,
        state: p.state,
        closedAt: closedOk ? p.closedAt : null,
        mergedAt: mergedOk ? p.mergedAt : null,
        changedFiles: p.changedFiles,
      });
    }
  }
  return { ok: problems.length === 0, problems, state: problems.length === 0 ? { ...raw, proposals } : null };
}

export function evaluateReviewState({ reviewState, asOfMs, thresholds = REVIEW_THRESHOLDS }) {
  const reasons = [];
  if (!reviewState) {
    return { ok: false, status: 'unavailable', reasons: ['review-state-unavailable: no normalized review state (missing/invalid input); safe skip — never zero backlog by default'] };
  }
  const read = reviewState.read;
  if (read.status !== 'ok') reasons.push(`review-state-failed: read status ${read.status}`);
  if (read.completeness !== 'complete') reasons.push(`review-state-incomplete: read completeness ${read.completeness}`);
  const observedMs = timestampMs(reviewState.observedAt);
  const ageH = (asOfMs - observedMs) / HOUR_MS;
  if (ageH > thresholds.maxAgeHours) {
    reasons.push(`review-state-stale: observed ${ageH.toFixed(1)}h before the decision time (threshold ${thresholds.maxAgeHours}h)`);
  }
  // Strict: the decision time is explicit — even ONE SECOND after it is
  // excluded. No tolerance window.
  if (ageH < 0) {
    reasons.push('review-state-from-the-future: observedAt is after the decision time (excluded even by one second)');
  }
  let status = 'ok';
  if (reasons.length > 0) {
    if (reasons.some((r) => /stale|future/.test(r))) status = 'stale';
    else if (read.status === 'failed') status = 'failed';
    else if (read.status === 'truncated' || read.completeness === 'truncated') status = 'truncated';
    else status = 'incomplete';
  }
  return { ok: reasons.length === 0, status, reasons };
}

// ---------------------------------------------------------------------------
// Candidate derivation (deterministic seeds + untrusted bounded intents)
// URL×strategy identity is preserved through derivation — never dropped.
// ---------------------------------------------------------------------------

function normalizeIntents(raw) {
  const problems = [];
  const intents = [];
  if (raw === null || raw === undefined) return { problems, intents };
  if (!raw || typeof raw !== 'object' || raw.schema !== INTENTS_SCHEMA) {
    return { problems: [`intent input must be ${INTENTS_SCHEMA} (untrusted input)`], intents: [] };
  }
  for (const [i, it] of (Array.isArray(raw.intents) ? raw.intents : []).entries()) {
    if (!it || typeof it !== 'object') { problems.push(`intent ${i} is not an object`); continue; }
    if (!CANDIDATE_KINDS.includes(it.kind)) { problems.push(`intent ${i} has unsupported kind`); continue; }
    if (typeof it.targetUrl !== 'string' || it.targetUrl === '') { problems.push(`intent ${i} has no targetUrl`); continue; }
    intents.push({
      kind: it.kind,
      targetUrl: it.targetUrl,
      // Optional identity field — never a guessed mandatory model field. When
      // absent, a candidate qualifies only if a real own current fresh
      // measurement actually supports the kind.
      strategy: typeof it.strategy === 'string' && it.strategy !== '' ? it.strategy : null,
      targetPaths: Array.isArray(it.targetPaths) ? it.targetPaths.filter((p) => typeof p === 'string') : [],
      rationale: boundText(it.rationale), // untrusted text, bounded
      evidenceBasis: {
        queries: Array.isArray(it.evidenceBasis?.queries) ? it.evidenceBasis.queries.filter((q) => typeof q === 'string').slice(0, 20) : [],
        note: boundText(it.evidenceBasis?.note),
      },
      source: 'intent-input', // untrusted; never a source of numeric truth
    });
  }
  return { problems, intents };
}

export function deriveCandidates({ report, intents: intentsRaw = null }) {
  const problems = [];
  const candidates = [];
  const { problems: intentProblems, intents } = normalizeIntents(intentsRaw);
  problems.push(...intentProblems);

  for (const o of report.observations ?? []) {
    if (!o.actionable) continue;
    if (o.kind === 'missing-description') {
      candidates.push({
        kind: 'meta-description',
        targetUrl: o.targetUrl,
        strategy: typeof o.strategy === 'string' ? o.strategy : null,
        targetPaths: [],
        rationale: boundText(o.note),
        evidence: o.evidence,
        source: 'deterministic-report',
      });
    } else if (o.kind === 'metric-regression') {
      candidates.push({
        kind: 'performance-regression',
        targetUrl: o.targetUrl,
        strategy: typeof o.strategy === 'string' ? o.strategy : null,
        targetPaths: [],
        rationale: boundText(o.note),
        evidence: o.evidence,
        source: 'deterministic-report',
      });
    }
  }
  for (const it of intents) candidates.push(it);

  // Dedupe by kind×targetUrl×strategy (identity preserved; deterministic
  // seeds win over untrusted intents).
  const seen = new Set();
  const deduped = [];
  for (const c of candidates) {
    const key = `${c.kind}\u0000${c.targetUrl}\u0000${c.strategy ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  return { problems, candidates: deduped };
}

// ---------------------------------------------------------------------------
// Freshness re-evaluation at the decision time (stored flags are never
// trusted). Reuses the report's shared freshness thresholds.
// ---------------------------------------------------------------------------

function measurementFresh({ measuredAt, decisionMs, reportAsOfMs, maxAgeDays, label }) {
  if (!isValidUtcTimestamp(measuredAt ?? null)) {
    return { ok: false, reason: `${label}-date-unknown: no validated measurement date (unknown never counts as fresh)` };
  }
  const ms = timestampMs(measuredAt);
  if (reportAsOfMs !== null && ms > reportAsOfMs) {
    return { ok: false, reason: `${label}-after-report-cutoff: source observation ${measuredAt} exceeds the report selection cutoff (new data never freshens old reports)` };
  }
  const ageD = (decisionMs - ms) / DAY_MS;
  if (ageD < 0) {
    return { ok: false, reason: `${label}-after-decision: measurement ${measuredAt} is after the decision time` };
  }
  if (ageD > maxAgeDays) {
    return { ok: false, reason: `${label}-stale-at-decision: measurement is ${ageD.toFixed(1)} days old at the decision time (threshold ${maxAgeDays})` };
  }
  return { ok: true, reason: null };
}

function queryGroupFresh({ provenance, window, decisionMs, reportAsOfMs, thresholds = FRESHNESS_THRESHOLDS.gsc }) {
  const fetchedAt = provenance?.fetchedAtLatest ?? null;
  const fetch = measurementFresh({
    measuredAt: fetchedAt,
    decisionMs,
    reportAsOfMs,
    maxAgeDays: thresholds.maxFetchAgeHours / 24,
    label: 'query-group-fetch',
  });
  if (!fetch.ok) return fetch;
  const end = window?.end ?? null;
  if (!isValidCalendarDate(end)) {
    return { ok: false, reason: 'query-group-window-unknown: no window end date to re-evaluate' };
  }
  const endMs = timestampMs(`${end}T00:00:00Z`);
  const decisionDay = todayInTimezone(new Date(decisionMs), GSC_DATA_TIMEZONE);
  const lagD = (timestampMs(`${decisionDay}T00:00:00Z`) - endMs) / DAY_MS;
  if (lagD < 0) {
    return { ok: false, reason: 'query-group-window-after-decision: window end exceeds the Search Console calendar date at decision time' };
  }
  if (lagD > thresholds.maxDataLagDays) {
    return { ok: false, reason: `query-group-data-lag: window ends ${end}, ${lagD.toFixed(1)} days before the decision time (threshold ${thresholds.maxDataLagDays})` };
  }
  return { ok: true, reason: null };
}

// ---------------------------------------------------------------------------
// Per-kind evidence (fresh at decision time; own target only)
// ---------------------------------------------------------------------------

// THIS target's own current certified fresh measurement (URL×strategy exact;
// a strategy-less candidate qualifies only via a measurement that actually
// supports the kind). Another page's/strategy's freshness never substitutes.
function ownMeasurement(report, candidate, { decisionMs, reportAsOfMs, requireAuditZero }) {
  const targets = (report.sources?.psi?.targets ?? []).filter((t) => t.url === candidate.targetUrl);
  if (targets.length === 0) {
    return { ok: false, reason: 'target-evidence-missing: no PSI measurement for this exact target (another page\'s evidence never substitutes)', target: null };
  }
  const matching = candidate.strategy == null
    ? targets
    : targets.filter((t) => t.strategy === candidate.strategy);
  if (matching.length === 0) {
    return { ok: false, reason: `target-evidence-strategy-mismatch: no measurement for ${candidate.targetUrl} [${candidate.strategy}] (URL×strategy identity is preserved end to end)`, target: null };
  }
  const detail = [];
  for (const t of matching) {
    const currentUsable = t.currentOutcome === 'success' || t.currentOutcome === 'partial';
    const certified = t.currentCertified !== false;
    const score = t.current?.metaDescriptionScore ?? null;
    const auditOk = !requireAuditZero || (typeof score === 'number' && score < 1);
    const fresh = measurementFresh({
      measuredAt: t.current?.fetchTime ?? null,
      decisionMs,
      reportAsOfMs,
      maxAgeDays: FRESHNESS_THRESHOLDS.psi.maxMeasurementAgeDays,
      label: 'psi-target',
    });
    if (currentUsable && certified && auditOk && fresh.ok) {
      return { ok: true, reason: null, target: t, measuredAt: t.current.fetchTime ?? null, metaDescriptionScore: score };
    }
    detail.push(`${t.strategy}: outcome=${t.currentOutcome ?? 'unknown'}/certified=${certified}/audit=${requireAuditZero ? score : '-'}/${fresh.ok ? 'fresh' : fresh.reason.split(':')[0]}`);
  }
  const stale = detail.some((d) => /stale/.test(d));
  return {
    ok: false,
    reason: `${stale ? 'target-evidence-stale' : 'target-evidence-not-current'}: this target's own current certified fresh measurement does not support the kind (${detail.join('; ')})`,
    target: matching[0],
    measuredAt: null,
    metaDescriptionScore: null,
  };
}

// Real query×page evidence for the EXACT mapped target within ONE eligible
// current context/window carrying its own freshness and full provenance.
// Previous-window demand never authorizes a current change; unrelated fresh
// GSC never refreshes another group; contexts are never blended or
// first-picked.
function queryPageEvidence(report, candidate, { decisionMs, reportAsOfMs }) {
  const qe = report.queryEvidence ?? {};
  if (qe.status === 'not-requested') {
    return { ok: false, reason: 'query-page-evidence-unavailable: report was generated without --include-query-rows', best: null };
  }
  if (qe.status !== 'present') {
    return { ok: false, reason: 'query-page-evidence-unavailable: no real query×page rows in the report (absence is a coverage/limit fact, never zero demand)', best: null };
  }
  const failures = [];
  const qualifying = [];
  for (const grp of qe.groups ?? []) {
    const w = grp.windows?.current; // ONLY the current window authorizes
    const qpp = w?.queryPagePairs;
    const previousPairs = grp.windows?.previous?.queryPagePairs;
    const pairs = (qpp?.pairs ?? []).filter((p) => p.page === candidate.targetUrl); // exact mapped target only
    if (pairs.length === 0) {
      if ((previousPairs?.pairs ?? []).some((p) => p.page === candidate.targetUrl)) {
        failures.push(`previous-window-only: ${grp.id} carries demand for this page only in the PREVIOUS window; previous-window demand never authorizes a current change`);
      }
      continue;
    }
    const fresh = queryGroupFresh({ provenance: w.provenance, window: w.window, decisionMs, reportAsOfMs });
    if (!fresh.ok) { failures.push(`${grp.id}: ${fresh.reason}`); continue; }
    const cov = w.coverage ?? null;
    if (!(cov && cov.metricsComplete && !cov.partial)) {
      failures.push(`query-page-evidence-incomplete-context: ${grp.id} window coverage is unproven/partial; a complete source in another context never validates it`);
      continue;
    }
    const impressions = pairs.reduce((a, p) => a + (p.impressions ?? 0), 0);
    if (pairs.length < MIN_QUERY_PAGE_PAIRS || impressions < MIN_QUERY_PAGE_IMPRESSIONS) {
      failures.push(`query-page-evidence-thin: ${grp.id} has ${pairs.length} pairs / ${impressions} impressions for this page (need >= ${MIN_QUERY_PAGE_PAIRS} pairs and >= ${MIN_QUERY_PAGE_IMPRESSIONS} impressions within one eligible current context/window)`);
      continue;
    }
    qualifying.push({
      groupId: grp.id,
      window: 'current',
      context: grp.context,
      responseAggregationType: grp.responseAggregationType,
      coverage: cov,
      provenance: w.provenance,
      truncated: Boolean(qpp.truncated),
      pairs,
      queries: [...new Set(pairs.map((p) => p.query))],
    });
  }
  if (qualifying.length === 1) {
    return { ok: true, reason: null, best: qualifying[0] };
  }
  if (qualifying.length > 1) {
    return {
      ok: false,
      reason: `query-evidence-context-ambiguous: ${qualifying.length} eligible current contexts carry this page's evidence (${qualifying.map((q) => q.groupId).join(', ')}); contexts are never blended or first-picked`,
      best: null,
    };
  }
  return {
    ok: false,
    reason: failures[0] ?? 'no-target-query-evidence: real query×page rows exist, but none for THIS page in an eligible current window; evidence on another page never authorizes',
    best: null,
  };
}

function evidenceCheck(report, candidate, ctx) {
  const req = KIND_REQUIREMENTS[candidate.kind];
  const reasons = [];
  const evidence = { requirements: req, sources: {} };
  // Freshness and regression must belong to the same URL×strategy pair.
  // A strategy-less intent can use any qualifying pair, but cannot combine
  // one device's fresh measurement with another device's old regression.
  const currentComparisons = req.compatibleComparison
    ? (report.sources?.psi?.comparisons ?? []).filter((c) => c.url === candidate.targetUrl
      && typeof c.strategy === 'string' && c.strategy !== ''
      && (candidate.strategy == null || c.strategy === candidate.strategy)
      && c.compared && !c.historical)
    : [];
  const performancePairs = currentComparisons.map((comparison) => ({
    comparison,
    hits: regressionHits(comparison.deltas),
    own: ownMeasurement(report, { ...candidate, strategy: comparison.strategy }, { ...ctx, requireAuditZero: false }),
  }));
  const performancePair = performancePairs.find((pair) => pair.own.ok && pair.hits.length > 0);

  if (req.ownAudit) {
    const own = ownMeasurement(report, candidate, { ...ctx, requireAuditZero: true });
    evidence.sources.psi = {
      ownMeasurement: {
        ok: own.ok,
        reason: own.reason,
        url: candidate.targetUrl,
        strategy: own.target?.strategy ?? null,
        measuredAt: own.measuredAt,
        metaDescriptionScore: own.metaDescriptionScore,
        currentCertified: own.target?.currentCertified ?? null,
      },
    };
    if (!own.ok) reasons.push(own.reason);
  } else if (req.sources.includes('psi')) {
    const own = performancePair?.own ?? ownMeasurement(report, candidate, { ...ctx, requireAuditZero: false });
    evidence.sources.psi = {
      ownMeasurement: {
        ok: own.ok,
        reason: own.reason,
        url: candidate.targetUrl,
        strategy: own.target?.strategy ?? null,
        measuredAt: own.measuredAt,
        currentCertified: own.target?.currentCertified ?? null,
      },
    };
    if (!own.ok) reasons.push(own.reason);
  }

  if (req.compatibleComparison) {
    const cmp = performancePair?.comparison ?? null;
    const hits = performancePair?.hits ?? [];
    evidence.compatibleComparison = hits.length > 0
      ? { ok: true, strategy: cmp.strategy, from: cmp.from, to: cmp.to, deltas: cmp.deltas, regressionHits: hits, current: true }
      : null;
    if (hits.length === 0) {
      reasons.push(currentComparisons.length === 0
        ? 'no-compatible-comparison: metric regression proposals need a matching CURRENT compatible-sample comparison for this URL×strategy with an actual regressing delta (historical-only or foreign comparisons never authorize)'
        : performancePairs.some((pair) => pair.hits.length > 0)
          ? 'no-fresh-regression-pair: no actual regression has its own current certified fresh measurement on the same URL×strategy'
          : 'no-regressing-delta: the current compatible comparisons show no actual regression under the shared thresholds');
    }
  }

  if (req.queryPage) {
    const q = queryPageEvidence(report, candidate, ctx);
    evidence.queryPage = q.best
      ? {
        ok: true,
        reason: null,
        groupId: q.best.groupId,
        window: q.best.window,
        context: q.best.context,
        responseAggregationType: q.best.responseAggregationType,
        coverage: q.best.coverage,
        provenance: q.best.provenance,
        truncated: q.best.truncated,
        pairs: q.best.pairs.length,
        queries: q.best.queries.slice(0, 10),
      }
      : { ok: false, reason: q.reason, groupId: null, window: null, context: null, responseAggregationType: null, coverage: null, provenance: null, truncated: null, pairs: 0, queries: [] };
    if (!q.ok) {
      reasons.push(q.reason);
    } else if (candidate.source === 'intent-input') {
      // Copy-intent changes must be grounded in the page's real queries —
      // CTR or metrics alone never authorize a rewrite.
      const basis = candidate.evidenceBasis?.queries ?? [];
      const grounded = basis.filter((query) => q.best.queries.includes(query));
      evidence.intentGrounding = { claimed: basis.length, grounded: grounded.length, groupId: q.best.groupId, window: q.best.window };
      if (basis.length === 0) {
        reasons.push('low-ctr-alone-insufficient: copy-intent proposals must cite the page\'s real queries; CTR/metrics alone never authorize a copy change');
      } else if (grounded.length === 0) {
        reasons.push('intent-queries-not-in-evidence: none of the claimed queries appear in this page\'s real query×page rows');
      }
    }
  }
  return { ok: reasons.length === 0, reasons, evidence };
}

// ---------------------------------------------------------------------------
// Gating (pure; proposal-only)
// ---------------------------------------------------------------------------

// Overlap compares the RESOLVED SOURCE PATH directly with ACTUAL changed-file
// evidence (B2 includes old+new rename paths). No URL<->path guessing, no
// body/title inference, no model path unions.
function reviewBlocks(sourcePath, reviewState, decisionMs, thresholds) {
  const blocks = [];
  const backlog = reviewState.backlog?.relevantOpenCount;
  if (backlog >= thresholds.backlogBlockAt) {
    blocks.push(`backlog-limit: ${backlog} relevant open proposals (>= ${thresholds.backlogBlockAt}); the bottleneck is review, not generation`);
  }
  for (const p of reviewState.proposals) {
    if (!p.changedFiles.includes(sourcePath)) continue; // unrelated proposals never block
    if (p.state === 'open') {
      blocks.push(`overlapping-open-proposal: #${p.number} already touches ${sourcePath} (actual changed-file evidence)`);
    } else if (p.state === 'closed-unmerged' && p.mergedAt === null) {
      const closedMs = timestampMs(p.closedAt);
      if (closedMs !== null && decisionMs - closedMs <= REJECTION_LOOKBACK_MS && decisionMs >= closedMs) {
        blocks.push(`recently-rejected-overlap: #${p.number} was closed without merge within ${thresholds.rejectionLookbackDays} days on ${sourcePath} (human rejection; do not re-litigate daily)`);
      }
    }
    // closed-merged proposals never block (delivered work)
  }
  return blocks;
}

export function gateCandidates({
  report,
  reviewState: rawReviewState,
  candidates,
  asOfMs,
  budget = REVIEW_THRESHOLDS.defaultBudget,
  expectedRepository = null,
  expectedSourceCommit = null,
  pageMap = null,
}) {
  const boundedBudget = Math.min(Math.max(Number.isInteger(budget) && budget > 0 ? budget : REVIEW_THRESHOLDS.defaultBudget), REVIEW_THRESHOLDS.maxBudget);
  const decisionMs = Number.isFinite(asOfMs) ? asOfMs : null;
  const reportAsOfMs = timestampMs(report?.params?.asOf ?? null);

  // Gate-level configuration: any failure is a VISIBLE skip-all, never a guess.
  const configReasons = [];
  if (decisionMs === null) {
    configReasons.push('decision-time-missing: an explicit decision time is required (the old report cutoff never doubles as "now")');
  }
  if (!expectedRepository) {
    configReasons.push('review-state-repository-unverified: no expected repository identity supplied (pass --repository or GITHUB_REPOSITORY)');
  }
  if (typeof expectedSourceCommit !== 'string' || !HEX40.test(expectedSourceCommit)) {
    configReasons.push('expected-source-commit-invalid: a trusted 40-hex frozen source commit is required (never model/self-reported)');
  }
  const map = pageMap ? normalizePageMap(pageMap) : null;
  if (!map || !map.usable) {
    configReasons.push(...(map ? map.problems : ['page-map-missing: no seo-page-map/1 supplied; targets never resolve by guessing a source']));
  } else {
    if (expectedRepository && map.repository !== expectedRepository) {
      configReasons.push(`page-map-repository-mismatch: map is for ${map.repository}, expected ${expectedRepository}`);
    }
    if (typeof expectedSourceCommit === 'string' && HEX40.test(expectedSourceCommit) && map.sourceCommit !== expectedSourceCommit) {
      configReasons.push(`page-map-source-commit-mismatch: map is for ${map.sourceCommit}, expected the frozen ${expectedSourceCommit}`);
    }
    if (decisionMs !== null && timestampMs(map.clock) !== decisionMs) {
      configReasons.push(`page-map-clock-mismatch: map.clock ${map.clock} is not the decision time (re-list, never derive publish-date changes)`);
    }
    // Row-level problems (isolated ambiguous associations, invalid rows) stay
    // VISIBLE in the pageMap output but never block unrelated valid targets.
  }
  if (reportAsOfMs === null) {
    configReasons.push('report-cutoff-invalid: report.params.asOf must be a strict UTC timestamp');
  } else if (decisionMs !== null && reportAsOfMs > decisionMs) {
    configReasons.push('report-cutoff-after-decision: the report selection cutoff exceeds the decision time (historical replay supplies its own time)');
  }

  const normalized = normalizeReviewState(rawReviewState);
  const reviewEval = evaluateReviewState({ reviewState: normalized.state, asOfMs: decisionMs ?? 0 });
  const reviewReasons = [
    ...normalized.problems.map((p) => `review-state-invalid: ${p}`),
    ...reviewEval.reasons,
    ...(normalized.state && expectedRepository && normalized.state.repository !== expectedRepository
      ? [`review-state-repository-mismatch: state is for ${normalized.state.repository}, expected ${expectedRepository}`]
      : []),
  ];
  const reviewOk = reviewEval.ok && normalized.problems.length === 0
    && (!expectedRepository || normalized.state?.repository === expectedRepository);

  const sorted = [...candidates].sort((a, b) => {
    const ka = KIND_PRIORITY.indexOf(a.kind);
    const kb = KIND_PRIORITY.indexOf(b.kind);
    return ka - kb || a.targetUrl.localeCompare(b.targetUrl) || String(a.strategy ?? '').localeCompare(String(b.strategy ?? ''));
  });

  const decisions = [];
  const proposalsOut = [];
  const skipped = [];
  for (const c of sorted) {
    const reasons = [];
    const evidence = { requirements: KIND_REQUIREMENTS[c.kind] ?? null, map: null };

    // 1. Real target identity through the trusted page map only.
    const urlCheck = validateOwnedUrl(c.targetUrl);
    let resolved = { ok: false, reason: 'target-unresolved', page: null };
    if (!urlCheck.ok) {
      resolved = { ok: false, reason: `target-url-invalid: ${urlCheck.reason}`, page: null };
      reasons.push(resolved.reason);
    } else if (map && map.usable) {
      resolved = resolveTargetPage(map, c.targetUrl, { decisionMs });
      if (!resolved.ok) reasons.push(resolved.reason);
    } else {
      resolved = { ok: false, reason: 'page-map-unusable: no validated page map; targets never resolve by guessing', page: null };
      reasons.push(resolved.reason);
    }
    evidence.map = resolved.page
      ? { url: resolved.page.url, sourcePath: resolved.page.sourcePath, kind: resolved.page.kind, publishDate: resolved.page.publishDate }
      : null;

    // 2. Model targetPaths can never borrow another page: a conflict is
    //    rejected outright; agreement is replaced by the map-derived path.
    const modelPaths = c.targetPaths ?? [];
    const sourcePath = resolved?.page?.sourcePath ?? null;
    if (sourcePath && modelPaths.length > 0 && !modelPaths.every((p) => p === sourcePath)) {
      reasons.push('model-target-paths-conflict: supplied targetPaths do not match the trusted map sourcePath (evidence is never lent across pages)');
    }

    // 3. Per-kind evidence, re-evaluated at the decision time.
    const ev = evidenceCheck(report, c, { decisionMs, reportAsOfMs });
    reasons.push(...ev.reasons);
    Object.assign(evidence, ev.evidence);

    // 4. Review-state gates (overlap via the resolved source path only).
    if (!reviewOk) reasons.push(...reviewReasons);
    else if (sourcePath) reasons.push(...reviewBlocks(sourcePath, normalized.state, decisionMs, REVIEW_THRESHOLDS));
    else reasons.push('overlap-unverifiable: no trusted sourcePath to compare against actual changed files');

    // 5. Gate-level configuration failures apply to every candidate.
    reasons.push(...configReasons);

    const budgetExhausted = proposalsOut.length >= boundedBudget;
    if (budgetExhausted && reasons.length === 0) {
      reasons.push(`budget-exhausted: finite candidate budget ${boundedBudget} already used (never invent work to fill a quota)`);
    }
    const outcome = reasons.length === 0 ? 'proposal' : 'skip';
    const decision = {
      id: `${c.kind}:${c.targetUrl}${c.strategy ? `:${c.strategy}` : ''}`,
      kind: c.kind,
      targetUrl: c.targetUrl,
      strategy: c.strategy ?? null,
      targetPaths: sourcePath ? [sourcePath] : [],
      source: c.source,
      outcome,
      reasons,
      requirements: KIND_REQUIREMENTS[c.kind] ?? null,
      evidence,
    };
    if (outcome === 'proposal') {
      decision.proposal = {
        mode: 'proposal-only',
        summary: boundText(c.rationale || `propose ${c.kind} for ${c.targetUrl}`),
        files: sourcePath ? [sourcePath] : [], // map-derived; never model paths
        note: 'proposal only: no content edits, branches, PRs or issue writes happen in this mode',
      };
      proposalsOut.push(decision);
    } else {
      skipped.push(decision);
    }
    decisions.push(decision);
  }

  return {
    schema: GATE_SCHEMA,
    mode: 'proposal-only',
    apply: { available: false, reason: 'apply is unavailable until an independently authorized future implementation passes its own gates and repository review rules' },
    params: {
      decisionAt: decisionMs === null ? null : new Date(decisionMs).toISOString(),
      reportAsOf: report?.params?.asOf ?? null, // preserved separately from the decision time
      budget: boundedBudget,
      expectedRepository,
      expectedSourceCommit: typeof expectedSourceCommit === 'string' ? expectedSourceCommit : null,
      reviewStateSchema: REVIEW_STATE_SCHEMA,
    },
    pageMap: map ? {
      ok: map.ok,
      usable: map.usable,
      repository: map.repository,
      sourceCommit: map.sourceCommit,
      clock: map.clock,
      generatedAt: map.generatedAt, // calculation time; may exceed clock
      read: map.read,
      counts: map.counts,
      rowProblems: map.rowProblems, // visible isolation/invalid-row record
    } : null,
    reviewState: {
      ok: reviewOk,
      status: reviewEval.status,
      reasons: reviewReasons,
      repository: normalized.state?.repository ?? null,
      observedAt: normalized.state?.observedAt ?? null,
      backlog: normalized.state?.backlog ?? null,
    },
    decisions,
    candidates: proposalsOut,
    skipped,
    budget: { maxCandidates: boundedBudget, used: proposalsOut.length, remaining: boundedBudget - proposalsOut.length },
    notes: [
      'low CTR alone never authorizes a copy change',
      'CrUX no-sample is unknown field data and never blocks a sufficiently evidenced GSC proposal',
      'intent text is untrusted input and never a source of numeric truth',
      'missing evidence is a visible safe skip with a reason, never a silent default',
      'targets resolve only through the trusted page map (one URL, one sourcePath); aliases and model paths never merge',
    ],
  };
}
