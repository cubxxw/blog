/**
 * notification-threshold-model.mjs — pure model + data validator for
 * <blog-notification-threshold> (numerical explainer: when should a
 * proactive agent speak up).
 *
 * No DOM, no timers, no network. G (gain of one useful prompt), C (cost of
 * one wrong interruption) and p (calibrated probability that the prompt is
 * useful) are integer-scaled: G and C in subjective value units, p in
 * per-mille integers (500 = 50%). Expected value and threshold:
 *
 *   E        = p*G - (1-p)*C          (exactly eMilli/1000, eMilli integer)
 *   threshold = C / (G + C)           (null when G = C = 0)
 *
 * G = 20, C = 40 → threshold 2/3; p above it favours "notify", below it
 * favours "silent", exactly at it breaks even ("equal"). G = C = 0 → E = 0
 * for every p: no preference, and the threshold is explicitly UNDEFINED
 * (never NaN, never Infinity).
 *
 * p is a calibrated past-usefulness rate (what the agent thought worth
 * saying, how often it proved useful) — NOT the model's self-confidence.
 * G and C are subjective illustrative values, never a universal deployment
 * policy.
 */

const MAX_VALUE = 10000;
const MAX_PERMILLE = 1000;
const PROB_STEP_MAX = 1000;

export const VERDICT_KEYS = ['notify', 'silent', 'equal', 'no-preference'];
/** Sampled p values for the static numeric equivalent of the axis. */
export const SAMPLED_PROBS = [0, 250, 500, 750, 1000];

/* ── pure math ──────────────────────────────────────────────────────────── */

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Snap a per-mille probability onto the slider step grid (0…1000). The
 * aligned maximum is floor(1000/step)*step: for a step that does not divide
 * 1000 (e.g. 600, 7) rounding can overshoot the range, and the naive upper
 * clamp would land OFF the grid — snap-then-clamp to the aligned maximum.
 */
export function clampPermille(value, step) {
  if (!Number.isFinite(value)) return 0;
  const s = Number.isFinite(step) && step >= 1 ? Math.trunc(step) : 1;
  const maxAligned = Math.floor(MAX_PERMILLE / s) * s;
  const snapped = Math.round(Math.min(MAX_PERMILLE, Math.max(0, value)) / s) * s;
  return Math.min(maxAligned, Math.max(0, snapped));
}

/**
 * Full decision readout for one state. `eMilli` is exact integer math
 * (E = eMilli/1000); `threshold` is a fraction in [0,1] or null; `verdict`
 * is one of VERDICT_KEYS.
 */
export function computeDecision(model, values) {
  const gain = clampInt(values.gain, 0, model.gainMax);
  const cost = clampInt(values.cost, 0, model.costMax);
  const probPermille = clampPermille(values.probPermille, model.probStep);
  const eMilli = probPermille * gain - (MAX_PERMILLE - probPermille) * cost;
  const threshold = gain + cost > 0 ? cost / (gain + cost) : null;
  let verdict;
  if (gain === 0 && cost === 0) verdict = 'no-preference';
  else if (eMilli > 0) verdict = 'notify';
  else if (eMilli < 0) verdict = 'silent';
  else verdict = 'equal';
  return { gain, cost, probPermille, eMilli, threshold, verdict };
}

/** E for an arbitrary probability (integer per-mille) at fixed G/C. */
export function expectedMilli(gain, cost, probPermille) {
  return probPermille * gain - (MAX_PERMILLE - probPermille) * cost;
}

/* ── display formatting ─────────────────────────────────────────────────── */

function trimFixed(x, dp) {
  if (!Number.isFinite(x)) return '—';
  const factor = Math.pow(10, dp);
  const fixed = (Math.round(x * factor) / factor).toFixed(dp);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}

/** Per-mille integer → compact percent ("500" → "50%", "665" → "66.5%"). */
export function formatPermille(permille) {
  return `${trimFixed(clampInt(permille, 0, MAX_PERMILLE) / 10, 1)}%`;
}

/**
 * E formatted EXACTLY from integer milli-units (never rounded): values with
 * three decimals are reproduced verbatim in every runtime.
 */
export function formatE(eMilli) {
  if (!Number.isFinite(eMilli)) return '—';
  const milli = Math.trunc(eMilli);
  const sign = milli < 0 ? '-' : '';
  const abs = Math.abs(milli);
  const fixed = `${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, '0')}`;
  return sign + fixed.replace(/0+$/, '').replace(/\.$/, '');
}

/** Threshold fraction → percent with 2 decimals, or null when undefined. */
export function formatThreshold(threshold) {
  if (threshold === null || !Number.isFinite(threshold)) return null;
  return `${trimFixed(threshold * 100, 2)}%`;
}

/** `40/60 = 66.67%` — the threshold identity, locale-neutral notation. */
export function formatThresholdExpression(gain, cost) {
  const threshold = gain + cost > 0 ? cost / (gain + cost) : null;
  const pct = formatThreshold(threshold);
  return pct === null ? null : `${cost}/${gain + cost} = ${pct}`;
}

/* ── data contract validator (called from spec-schema.validateSpec) ─────── */

const MODEL_KEYS = ['probStep', 'gainMax', 'costMax'];
const SCENARIO_KEYS = ['id', 'gain', 'cost', 'probPermille'];

/**
 * Validate a `kind: "notification-threshold"` spec. Receives the schema's
 * error context and the shared helpers (no reverse import of spec-schema).
 */
export function validateNotificationThreshold(p, raw, helpers) {
  const { validateScenariosList, validateSourceRefs, validateSharedCopy, SHARED_COPY_KEYS, LIMITS, LOCALES } = helpers;
  let ok = true;

  const mp = p.child('model');
  const m = isPlainObject(raw.model) ? raw.model : {};
  if (!mp.keys(m, MODEL_KEYS)) {
    ok = false;
  } else {
    if (!mp.child('probStep').integer(m.probStep, 1, PROB_STEP_MAX)) ok = false;
    if (!mp.child('gainMax').integer(m.gainMax, 1, MAX_VALUE)) ok = false;
    if (!mp.child('costMax').integer(m.costMax, 1, MAX_VALUE)) ok = false;
  }

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, SCENARIO_KEYS);
    const gainOk = ip.child('gain').integer(scenario.gain, 0, MAX_VALUE);
    const costOk = ip.child('cost').integer(scenario.cost, 0, MAX_VALUE);
    const probOk = ip.child('probPermille').integer(scenario.probPermille, 0, MAX_PERMILLE);
    if (!gainOk || !costOk || !probOk) sok = false;
    if (gainOk && Number.isInteger(m.gainMax) && scenario.gain > m.gainMax) {
      ip.child('gain').fail(`gain (${scenario.gain}) must not exceed model.gainMax (${m.gainMax})`);
      sok = false;
    }
    if (costOk && Number.isInteger(m.costMax) && scenario.cost > m.costMax) {
      ip.child('cost').fail(`cost (${scenario.cost}) must not exceed model.costMax (${m.costMax})`);
      sok = false;
    }
    if (probOk && Number.isInteger(m.probStep) && scenario.probPermille % m.probStep !== 0) {
      ip.child('probPermille').fail(
        `probPermille (${scenario.probPermille}) must align to probStep ${m.probStep}`
      );
      sok = false;
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
        'gainLabel',
        'costLabel',
        'probLabel',
        'resultLabels',
        'axisLabels',
        'table',
        'sampleTitle',
        'verdicts',
        'explanations',
      ];
      if (!lp.keys(copy, [...SHARED_COPY_KEYS, ...kindFields])) {
        ok = false;
        continue;
      }
      if (!validateSharedCopy(lp, copy, scenarioIds || undefined)) ok = false;
      for (const key of ['gainLabel', 'costLabel', 'probLabel']) {
        if (!lp.child(key).text(copy[key], LIMITS.label)) ok = false;
      }
      if (
        !lp.child('resultLabels').textMap(copy.resultLabels, ['threshold', 'expected', 'verdict', 'undefined'], LIMITS.label)
      ) {
        ok = false;
      }
      const al = lp.child('axisLabels');
      if (!al.keys(copy.axisLabels, ['threshold', 'current', 'alt'])) {
        ok = false;
      } else {
        if (!al.child('threshold').text(copy.axisLabels.threshold, LIMITS.label)) ok = false;
        if (!al.child('current').text(copy.axisLabels.current, LIMITS.label)) ok = false;
        if (!al.child('alt').text(copy.axisLabels.alt, LIMITS.note)) ok = false;
      }
      if (
        !lp.child('table').textMap(copy.table, ['scenario', 'gain', 'cost', 'threshold', 'prob', 'expected', 'verdict'], LIMITS.label)
      ) {
        ok = false;
      }
      if (!lp.child('sampleTitle').text(copy.sampleTitle, LIMITS.label)) ok = false;
      if (!lp.child('verdicts').textMap(copy.verdicts, VERDICT_KEYS, LIMITS.label)) ok = false;
      if (!lp.child('explanations').textMap(copy.explanations, VERDICT_KEYS, LIMITS.note)) {
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
