/**
 * reliability-chain-model.mjs — pure model + data validator for
 * <blog-reliability-chain> (numerical explainer: compounding error).
 *
 * No DOM, no timers, no network. Integer-scaled inputs keep the arithmetic
 * finite and exact where it matters: `stepPermille` and `recallPermille` are
 * per-mille integers (950 = 95%), `steps` is an integer count.
 *
 * Plain chain (independent, all mandatory steps):
 *
 *   plain = p^n                      p = stepPermille / 1000
 *
 * Checkpoint mode (fixed stepsPerSegment; exactly ONE retry per segment;
 * independence, no false positives, perfect rollback — the assumptions are
 * carried beside the result, never implied):
 *
 *   q_i = p^k_i                      k_i = steps of segment i (short final)
 *   s_i = q_i + (1 - q_i) * r * q_i  r = recallPermille / 1000
 *   checkpoint = product of s_i (all segments, incl. short final)
 *   expectedAttempts = sum of 1 + (1 - q_i) * r   (planning/cost proxy that
 *   schedules ALL segments — a run plan, not a fail-fast runtime cost and
 *   never a production success rate; see docs/interactive/numbers.md)
 *
 * Nothing here simulates correlated errors, false positives, partial
 * rollbacks or production reliability; see docs/interactive/numbers.md.
 */

const MAX_STEPS = 200;
const MAX_PERMILLE = 1000;
const PROB_STEP_MAX = 1000;

/* ── pure math ──────────────────────────────────────────────────────────── */

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Snap a per-mille value onto the slider step grid (0…1000). The aligned
 * maximum is floor(1000/step)*step: for a step that does not divide 1000
 * (e.g. 600, 7) rounding can overshoot the range, and the naive upper
 * clamp would land OFF the grid — snap-then-clamp to the aligned maximum.
 */
export function clampPermille(value, step) {
  if (!Number.isFinite(value)) return 0;
  const s = Number.isFinite(step) && step >= 1 ? Math.trunc(step) : 1;
  const maxAligned = Math.floor(MAX_PERMILLE / s) * s;
  const snapped = Math.round(Math.min(MAX_PERMILLE, Math.max(0, value)) / s) * s;
  return Math.min(maxAligned, Math.max(0, snapped));
}

/** Segment step counts for n steps of k each; the final segment may be short. */
export function segmentPlan(steps, stepsPerSegment) {
  const n = Math.max(1, Math.trunc(steps));
  const k = Math.max(1, Math.trunc(stepsPerSegment));
  const plan = [];
  let left = n;
  while (left > 0) {
    const take = Math.min(k, left);
    plan.push(take);
    left -= take;
  }
  return plan;
}

/** One-pass success of a segment of `segSteps` mandatory steps. */
export function onePass(segSteps, stepPermille) {
  return Math.pow(stepPermille / 1000, Math.max(1, Math.trunc(segSteps)));
}

/** Segment success after AT MOST one retry of a detected failure. */
export function segmentSuccess(q, recallPermille) {
  const r = Math.min(1, Math.max(0, recallPermille / 1000));
  return q + (1 - q) * r * q;
}

/**
 * Full readout for one state. Every output is finite: p in [0,1], n ≥ 1.
 */
export function computeChain(model, values) {
  const stepPermille = clampPermille(values.stepPermille, model.probStep);
  const steps = clampInt(values.steps, model.stepsMin, model.stepsMax);
  const recallPermille = clampPermille(values.recallPermille, model.probStep);
  const plan = segmentPlan(steps, model.stepsPerSegment);
  const p = stepPermille / 1000;
  const plain = Math.pow(p, steps);
  let checkpoint = 1;
  let attempts = 0;
  const segments = plan.map((segSteps) => {
    const q = onePass(segSteps, stepPermille);
    const s = segmentSuccess(q, recallPermille);
    checkpoint *= s;
    attempts += 1 + (1 - q) * (recallPermille / 1000);
    return { steps: segSteps, onePass: q, success: s };
  });
  return {
    stepPermille,
    steps,
    recallPermille,
    plan,
    plain,
    checkpoint,
    attempts,
    segments,
  };
}

/**
 * Five meaningful curve samples (steps, p^steps) spanning the slider range:
 * min, min+d/4, min+d/2, min+3d/4, max — the static numeric equivalent of
 * the curve. Hugo renders the same points for SSR.
 */
export function curveSamples(model, stepPermille) {
  const min = model.stepsMin;
  const max = model.stepsMax;
  const d = max - min;
  const ns = [min, min + Math.floor(d / 4), min + Math.floor(d / 2), min + Math.floor((3 * d) / 4), max];
  const p = clampPermille(stepPermille, model.probStep) / 1000;
  return ns.map((n) => ({ steps: n, value: Math.pow(p, n) }));
}

/** Polyline points for the p^n curve (x = steps, y = result). */
export function curvePoints(stepPermille, stepsMin, stepsMax, count = 48) {
  const p = clampPermille(stepPermille, 1) / 1000;
  const min = Math.max(1, Math.trunc(stepsMin));
  const max = Math.max(min + 1, Math.trunc(stepsMax));
  const n = Math.max(2, Math.trunc(count));
  const points = [];
  for (let i = 0; i < n; i += 1) {
    const x = min + Math.round((i * (max - min)) / (n - 1));
    points.push({ steps: x, value: Math.pow(p, x) });
  }
  return points;
}

/**
 * Rule-based reading key for the plain result (wording pre-written in the
 * spec copy): steep (< 50%), moderate (50–90%), mild (≥ 90%).
 */
export function explainKey(plain) {
  if (!Number.isFinite(plain) || plain < 0.5) return 'steep';
  if (plain < 0.9) return 'moderate';
  return 'mild';
}

/* ── display formatting (non-negative values only; round half up) ───────── */

function trimFixed(x, dp) {
  if (!Number.isFinite(x)) return '—';
  const factor = Math.pow(10, dp);
  const fixed = (Math.round(x * factor) / factor).toFixed(dp);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}

/** Per-mille integer → compact percent ("950" → "95%", "995" → "99.5%"). */
export function formatPermille(permille) {
  return `${trimFixed(clampInt(permille, 0, MAX_PERMILLE) / 10, 1)}%`;
}

/** Fraction → percent with 2 decimals ("35.85%"). */
export function formatRate(fraction) {
  if (!Number.isFinite(fraction)) return '—';
  return `${trimFixed(fraction * 100, 2)}%`;
}

/** Fraction → fixed 4-decimal form ("0.3585"). */
export function formatFraction(fraction) {
  if (!Number.isFinite(fraction)) return '—';
  return (Math.round(fraction * 10000) / 10000).toFixed(4);
}

/** Per-mille integer → plain decimal ("950" → "0.95"). */
export function formatP(permille) {
  return trimFixed(clampInt(permille, 0, MAX_PERMILLE) / 1000, 3);
}

/** Generic trimmed decimal ("4.52", "4", "35.85"). */
export function formatNumber(value, dp = 2) {
  return trimFixed(value, dp);
}

/** `0.95^20 = 0.3585 (35.85%)` — locale-neutral math notation. */
export function formatExpression(stepPermille, steps, result) {
  return `${formatP(stepPermille)}^${Math.trunc(steps)} = ${formatFraction(result)} (${formatRate(result)})`;
}

/** Segment plan as `5 / 5 / 5 / 5`. */
export function formatPlan(plan) {
  return plan.map((k) => String(Math.trunc(k))).join(' / ');
}

/* ── data contract validator (called from spec-schema.validateSpec) ─────── */

const MODEL_KEYS = ['stepsMin', 'stepsMax', 'stepsPerSegment', 'probStep'];
const SCENARIO_KEYS = ['id', 'stepPermille', 'steps', 'recallPermille'];
const KIND_COPY_FIELDS = [
  'stepLabel',
  'stepsLabel',
  'recallLabel',
  'resultLabels',
  'curveLabels',
  'table',
  'curveTable',
  'checkpoint',
  'explanations',
];

/**
 * Validate a `kind: "reliability-chain"` spec. Receives the schema's error
 * context and the shared helpers (no reverse import of spec-schema).
 */
export function validateReliabilityChain(p, raw, helpers) {
  const { validateScenariosList, validateSourceRefs, validateSharedCopy, SHARED_COPY_KEYS, LIMITS, LOCALES } = helpers;
  let ok = true;

  const mp = p.child('model');
  const model = raw.model;
  if (!mp.keys(model, MODEL_KEYS)) {
    ok = false;
  } else {
    const minOk = mp.child('stepsMin').integer(model.stepsMin, 1, MAX_STEPS);
    const maxOk = mp.child('stepsMax').integer(model.stepsMax, 1, MAX_STEPS);
    if (!mp.child('stepsPerSegment').integer(model.stepsPerSegment, 1, MAX_STEPS)) ok = false;
    if (!mp.child('probStep').integer(model.probStep, 1, PROB_STEP_MAX)) ok = false;
    if (!minOk || !maxOk) {
      ok = false;
    } else if (model.stepsMax <= model.stepsMin) {
      mp.child('stepsMax').fail(`stepsMax (${model.stepsMax}) must be greater than stepsMin (${model.stepsMin})`);
      ok = false;
    }
  }
  const m = raw.model && typeof raw.model === 'object' ? raw.model : {};

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, SCENARIO_KEYS);
    if (!ip.child('stepPermille').integer(scenario.stepPermille, 0, MAX_PERMILLE)) sok = false;
    if (!ip.child('recallPermille').integer(scenario.recallPermille, 0, MAX_PERMILLE)) sok = false;
    const stepsOk = ip.child('steps').integer(scenario.steps, 1, MAX_STEPS);
    if (!stepsOk) sok = false;
    if (Number.isInteger(m.probStep)) {
      for (const key of ['stepPermille', 'recallPermille']) {
        if (Number.isInteger(scenario[key]) && scenario[key] % m.probStep !== 0) {
          ip.child(key).fail(`${key} (${scenario[key]}) must align to probStep ${m.probStep}`);
          sok = false;
        }
      }
    }
    if (stepsOk && Number.isInteger(m.stepsMin) && Number.isInteger(m.stepsMax) &&
        (scenario.steps < m.stepsMin || scenario.steps > m.stepsMax)) {
      ip.child('steps').fail(
        `steps (${scenario.steps}) must be within [stepsMin, stepsMax] = [${m.stepsMin}, ${m.stepsMax}]`
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
      if (!lp.keys(copy, [...SHARED_COPY_KEYS, ...KIND_COPY_FIELDS])) {
        ok = false;
        continue;
      }
      if (!validateSharedCopy(lp, copy, scenarioIds || undefined)) ok = false;
      for (const key of ['stepLabel', 'stepsLabel', 'recallLabel']) {
        if (!lp.child(key).text(copy[key], LIMITS.label)) ok = false;
      }
      if (
        !lp.child('resultLabels').textMap(copy.resultLabels, ['plain', 'checkpoint', 'segment', 'attempts', 'segments'], LIMITS.label)
      ) {
        ok = false;
      }
      const cl = lp.child('curveLabels');
      if (!cl.keys(copy.curveLabels, ['x', 'y', 'alt'])) {
        ok = false;
      } else {
        if (!cl.child('x').text(copy.curveLabels.x, LIMITS.label)) ok = false;
        if (!cl.child('y').text(copy.curveLabels.y, LIMITS.label)) ok = false;
        if (!cl.child('alt').text(copy.curveLabels.alt, LIMITS.note)) ok = false;
      }
      if (
        !lp.child('table').textMap(copy.table, ['scenario', 'stepRate', 'steps', 'plain', 'checkpoint'], LIMITS.label)
      ) {
        ok = false;
      }
      if (!lp.child('curveTable').textMap(copy.curveTable, ['steps', 'result'], LIMITS.label)) {
        ok = false;
      }
      if (!lp.child('checkpoint').keys(copy.checkpoint, ['summary', 'note'])) {
        ok = false;
      } else {
        if (!lp.child('checkpoint').child('summary').text(copy.checkpoint.summary, LIMITS.presetNotice)) ok = false;
        if (!lp.child('checkpoint').child('note').text(copy.checkpoint.note, LIMITS.note)) ok = false;
      }
      if (!lp.child('explanations').textMap(copy.explanations, ['steep', 'moderate', 'mild'], LIMITS.note)) {
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
