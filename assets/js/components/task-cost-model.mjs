/**
 * task-cost-model.mjs — pure model + data validator for <blog-task-cost>
 * (numerical explainer: cost per successful/accepted task).
 *
 * No DOM, no timers, no network. All INPUT amounts are integers in ONE
 * currency (the spec's unitLabel names it; values are hypothetical and
 * editable — never real vendor prices). Review cost is derived:
 *
 *   reviewCost = reviewMinutes * hourlyRate / 60      (minutes are the
 *               TOTAL human review time for the whole batch)
 *   total      = modelToolCost + retryCost + reviewCost
 *   perAccepted = total / accepted     (null when accepted === 0 — the ratio
 *               is not economically meaningful, never Infinity and never 0)
 *
 * `modelToolCost` and `retryCost` are entered SEPARATELY and only summed
 * once, so retry cost can never be double counted. Accepted counts are
 * empirical measurements of a finished batch — not predicted model success.
 */

const MAX_AMOUNT = 10000000; // currency units per batch (whole, integer)
const MAX_MINUTES = 1000000;
const MAX_RATE = 1000000;
const MAX_BATCH = 10000;

export const ROUTES = ['a', 'b'];
export const ROUTE_FIELDS = ['modelToolCost', 'retryCost', 'reviewMinutes', 'hourlyRate', 'accepted'];

/* ── pure math ──────────────────────────────────────────────────────────── */

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Cost breakdown of one batch/route. All values are finite; perAccepted may be null. */
export function computeRoute(batchSize, route) {
  const modelToolCost = clampInt(route.modelToolCost, 0, MAX_AMOUNT);
  const retryCost = clampInt(route.retryCost, 0, MAX_AMOUNT);
  const reviewMinutes = clampInt(route.reviewMinutes, 0, MAX_MINUTES);
  const hourlyRate = clampInt(route.hourlyRate, 0, MAX_RATE);
  const accepted = clampInt(route.accepted, 0, Math.max(1, Math.trunc(batchSize)));
  const reviewCost = (reviewMinutes * hourlyRate) / 60;
  const total = modelToolCost + retryCost + reviewCost;
  const perAccepted = accepted > 0 ? total / accepted : null;
  return { modelToolCost, retryCost, reviewMinutes, hourlyRate, accepted, reviewCost, total, perAccepted };
}

/**
 * Rule-based reading key for a compared pair (wording pre-written in copy):
 * one side is cheaper per accepted task, they tie, or at least one side has
 * zero accepted tasks (undefined — not zero, not infinity).
 */
export function compareRoutes(a, b) {
  if (a.perAccepted === null || b.perAccepted === null) return 'undefined';
  if (Math.abs(a.perAccepted - b.perAccepted) < 1e-9) return 'equal';
  return a.perAccepted < b.perAccepted ? 'a-lower' : 'b-lower';
}

/**
 * Shared bar scale: both stacked bars use the larger total as their full
 * width (0 total → scale 0 and all widths 0 — never division by zero).
 */
export function barScale(a, b) {
  return Math.max(a.total, b.total, 0);
}

/** Percentage widths of one route's stacked segments on the shared scale. */
export function barWidths(routeResult, scale) {
  const pct = (value) => (scale > 0 ? Math.min(100, (value / scale) * 100) : 0);
  return {
    modelTool: pct(routeResult.modelToolCost),
    retry: pct(routeResult.retryCost),
    review: pct(routeResult.reviewCost),
  };
}

/* ── display formatting (non-negative values only; round half up) ───────── */

function trimFixed(x, dp) {
  if (!Number.isFinite(x)) return '—';
  const factor = Math.pow(10, dp);
  const fixed = (Math.round(x * factor) / factor).toFixed(dp);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}

/** Money/derived amounts: 2 decimals, trailing zeros trimmed. */
export function formatAmount(value) {
  return trimFixed(value, 2);
}

/** Per-accepted cost, or the explicit placeholder for zero accepted. */
export function formatPerAccepted(routeResult) {
  return routeResult.perAccepted === null ? null : trimFixed(routeResult.perAccepted, 2);
}

/* ── data contract validator (called from spec-schema.validateSpec) ─────── */

const MODEL_KEYS = ['batchSize'];
const SCENARIO_KEYS = ['id', 'a', 'b'];

/**
 * Validate a `kind: "task-cost"` spec. Receives the schema's error context
 * and the shared helpers (no reverse import of spec-schema).
 */
export function validateTaskCost(p, raw, helpers) {
  const { validateScenariosList, validateSourceRefs, validateSharedCopy, SHARED_COPY_KEYS, LIMITS, LOCALES } = helpers;
  let ok = true;

  const mp = p.child('model');
  const m = isPlainObject(raw.model) ? raw.model : {};
  if (!mp.keys(m, MODEL_KEYS)) {
    ok = false;
  } else if (!mp.child('batchSize').integer(m.batchSize, 1, MAX_BATCH)) {
    ok = false;
  }

  const validateRoute = (rp, route, batchSize) => {
    let rok = rp.keys(route, ROUTE_FIELDS);
    if (!rp.child('modelToolCost').integer(route.modelToolCost, 0, MAX_AMOUNT)) rok = false;
    if (!rp.child('retryCost').integer(route.retryCost, 0, MAX_AMOUNT)) rok = false;
    if (!rp.child('reviewMinutes').integer(route.reviewMinutes, 0, MAX_MINUTES)) rok = false;
    if (!rp.child('hourlyRate').integer(route.hourlyRate, 0, MAX_RATE)) rok = false;
    const acceptedOk = rp.child('accepted').integer(route.accepted, 0, MAX_BATCH);
    if (!acceptedOk) rok = false;
    if (acceptedOk && Number.isInteger(batchSize) && route.accepted > batchSize) {
      rp.child('accepted').fail(
        `accepted (${route.accepted}) must not exceed the fixed batch size (${batchSize})`
      );
      rok = false;
    }
    return rok;
  };

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, SCENARIO_KEYS);
    for (const route of ROUTES) {
      const rp = ip.child(route);
      if (!isPlainObject(scenario[route])) {
        rp.fail('expected a route object');
        sok = false;
        continue;
      }
      if (!validateRoute(rp, scenario[route], m.batchSize)) sok = false;
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  const cp = p.child('copy');
  if (!isPlainObject(raw.copy)) {
    cp.fail('expected an object with zh and en copies');
    ok = false;
  } else if (!cp.keys(raw.copy, LOCALES)) {
    ok = false;
  } else {
    for (const lang of LOCALES) {
      const lp = cp.child(lang);
      const copy = raw.copy[lang];
      if (!isPlainObject(copy)) {
        lp.fail('expected a copy object');
        ok = false;
        continue;
      }
      const kindFields = [
        'unitLabel',
        'batchLabel',
        'scaleLabel',
        'routes',
        'inputLabels',
        'costLabels',
        'table',
        'explanations',
      ];
      if (!lp.keys(copy, [...SHARED_COPY_KEYS, ...kindFields])) {
        ok = false;
        continue;
      }
      if (!validateSharedCopy(lp, copy, scenarioIds || undefined)) ok = false;
      if (!lp.child('unitLabel').text(copy.unitLabel, LIMITS.unitLabel)) ok = false;
      for (const key of ['batchLabel', 'scaleLabel']) {
        if (!lp.child(key).text(copy[key], LIMITS.label)) ok = false;
      }
      if (!lp.child('routes').textMap(copy.routes, ROUTES, LIMITS.label)) ok = false;
      if (
        !lp.child('inputLabels').textMap(copy.inputLabels, ROUTE_FIELDS, LIMITS.label)
      ) {
        ok = false;
      }
      if (
        !lp.child('costLabels').textMap(copy.costLabels, ['modelTool', 'retry', 'review', 'total', 'perAccepted'], LIMITS.label)
      ) {
        ok = false;
      }
      if (
        !lp.child('table').textMap(copy.table, ['scenario', 'route', 'breakdown', 'total', 'perAccepted'], LIMITS.label)
      ) {
        ok = false;
      }
      if (
        !lp.child('explanations').textMap(copy.explanations, ['a-lower', 'b-lower', 'equal', 'undefined'], LIMITS.note)
      ) {
        ok = false;
      }
    }
  }

  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
