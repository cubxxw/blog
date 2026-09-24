/**
 * vector-cosine-model.mjs — pure model + data contract validator for the
 * "vector-cosine" interactive kind (geometry expansion).
 *
 * Two responsibilities, one module (per the expansion architecture):
 *
 *   1. Pure deterministic 2-D vector geometry for <blog-vector-cosine>.
 *      No DOM, no timers, no network: the element is a thin adapter and the
 *      server-rendered figure (layouts/partials/interactive/vector-cosine.html)
 *      computes the same values with the same formulas.
 *   2. `validateVectorCosine(p, raw, helpers)` — the strict field validator
 *      called by validateSpec after the common top-level checks. It receives
 *      the spec-schema PathCtx `p` and the shared scenario/source helpers as
 *      the third argument; this module never imports spec-schema (no cycles).
 *
 * Geometry state is four decimal grid coordinates (grid units), each vector
 * living inside the finite disk of radius `model.bound`:
 *
 *   dot      = ax*bx + ay*by
 *   |A|, |B| = sqrt(x*x + y*y)          (exactly the template's formula)
 *   cos      = dot / (|A| * |B|), clamped to [-1, 1] before acos
 *   angle    = acos(cos) in degrees
 *
 * When either vector is the zero vector the angle/cosine are UNDEFINED —
 * the model returns `null` (never NaN) and callers show the spec's
 * `undefinedText`. Units are illustrative grid units of a 2-D mathematical
 * illustration; this kind never predicts embedding semantics.
 */

/* ── preset vocabulary (the four required teaching presets) ───────────── */

export const PRESETS = ['parallel', 'orthogonal', 'opposite', 'zero'];

/** Radius of the drawn angle arc (grid units); mirrored by the SSR partial. */
export const ARC_RADIUS = 1.25;

/* ── pure geometry ────────────────────────────────────────────────────── */

/** Round to the nearest multiple of gridStep (robust against NaN/Infinity). */
export function quantize(value, gridStep) {
  if (!Number.isFinite(value) || !Number.isFinite(gridStep) || gridStep <= 0) return 0;
  const q = Math.round(value / gridStep) * gridStep;
  return q === 0 ? 0 : q; // never -0
}

/** Clamp one coordinate into [-bound, bound], snapped to the grid. */
export function clampCoord(value, model) {
  const v = quantize(Number.isFinite(value) ? value : 0, model.gridStep);
  return Math.min(model.bound, Math.max(-model.bound, v));
}

/**
 * Clamp a 2-D point into the finite disk of radius `bound`, snapped to the
 * grid. Points outside are projected onto the boundary along their direction
 * (direction preserved, length capped) — this is the pointer-facing clamp.
 */
export function clampPoint(x, y, model) {
  let px = quantize(Number.isFinite(x) ? x : 0, model.gridStep);
  let py = quantize(Number.isFinite(y) ? y : 0, model.gridStep);
  const r = Math.sqrt(px * px + py * py);
  if (r > model.bound && r > 0) {
    const k = model.bound / r;
    px *= k;
    py *= k;
  }
  return { x: px, y: py };
}

/**
 * Map pointer client coordinates onto the plane. `rect` is the SVG element's
 * bounding rect; `extent` is the half width of the square viewBox (bound +
 * padding). The mapping is linear and responsive — it works at any element
 * size — and the result is clamped into the finite disk.
 */
export function pointerToPlane(clientX, clientY, rect, model, extent) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0) || !(extent > 0)) {
    return { x: 0, y: 0 };
  }
  const x = ((clientX - rect.left) / rect.width) * 2 * extent - extent;
  const y = -(((clientY - rect.top) / rect.height) * 2 * extent - extent);
  return clampPoint(x, y, model);
}

/**
 * All displayed quantities for one state. `cos` and `angleDeg` are `null`
 * (undefined — never NaN) when either vector is the zero vector. `cos` is
 * clamped into [-1, 1] so `angleDeg` is always finite.
 */
export function vectorMath(state) {
  const { ax, ay, bx, by } = state;
  const dot = ax * bx + ay * by;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  let cos = null;
  let angleDeg = null;
  if (magA > 0 && magB > 0) {
    cos = Math.min(1, Math.max(-1, dot / (magA * magB)));
    // acos amplifies float noise near ±1 (parallel vectors would read as a
    // 1e-6° phantom angle). Snap values within float noise of ±1 exactly.
    if (Math.abs(cos - 1) < 1e-12) cos = 1;
    else if (Math.abs(cos + 1) < 1e-12) cos = -1;
    angleDeg = (Math.acos(cos) * 180) / Math.PI;
  }
  return { ax, ay, bx, by, dot, magA, magB, cos, angleDeg };
}

/** Set one coordinate (ax/ay/bx/by) with grid snapping + disk clamp. */
export function setCoord(state, key, value, model) {
  const next = { ...state, [key]: Number.isFinite(value) ? value : 0 };
  const prefix = key.slice(0, 1); // 'a' | 'b'
  const point = clampPoint(
    prefix === 'a' ? next.ax : next.bx,
    prefix === 'a' ? next.ay : next.by,
    model
  );
  if (prefix === 'a') {
    next.ax = point.x;
    next.ay = point.y;
  } else {
    next.bx = point.x;
    next.by = point.y;
  }
  return next;
}

/**
 * Scale vector B to `len` along its CURRENT direction (direction preserved,
 * cosine unchanged). `len` is clamped into [0, bound]. Scaling the zero
 * vector keeps it zero — a zero vector has no direction to preserve.
 */
export function scaleLength(state, len, model) {
  if (!Number.isFinite(len)) return { ...state }; // corrupt input: state untouched
  const target = Math.min(model.bound, Math.max(0, len));
  const magB = Math.sqrt(state.bx * state.bx + state.by * state.by);
  if (magB === 0) return { ...state };
  const k = target / magB;
  return { ...state, bx: state.bx * k, by: state.by * k };
}

/**
 * Rotate vector B by `deg` degrees around the origin (length preserved,
 * cosine changes). Rotating the zero vector keeps it zero.
 */
export function rotateVector(state, deg, model) {
  const magB = Math.sqrt(state.bx * state.bx + state.by * state.by);
  if (magB === 0) return { ...state };
  const delta = Number.isFinite(deg) ? deg : 0;
  const rad = (delta * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  let bx = state.bx * c - state.by * s;
  let by = state.bx * s + state.by * c;
  // Rotation preserves length up to float error; the disk clamp is a no-op
  // safety net (never quantized) so the state cannot leave the finite bound.
  const r = Math.sqrt(bx * bx + by * by);
  if (r > model.bound && r > 0) {
    const k = model.bound / r;
    bx *= k;
    by *= k;
  }
  return { ...state, bx, by };
}

/**
 * Replace vector A/B with a pointer/numeric point (grid-snapped, clamped).
 */
export function setVector(state, which, x, y, model) {
  const point = clampPoint(x, y, model);
  return which === 'a'
    ? { ...state, ax: point.x, ay: point.y }
    : { ...state, bx: point.x, by: point.y };
}

/**
 * SVG arrowhead triangle (math coordinates; callers flip y for SVG) for the
 * vector (x, y). Pure vector arithmetic — no trigonometry. `null` for the
 * zero vector.
 */
export function arrowHead(x, y, len = 0.45, wide = 0.28) {
  const mag = Math.sqrt(x * x + y * y);
  if (!(mag > 0)) return null;
  const ux = x / mag;
  const uy = y / mag;
  const bx = x - ux * len;
  const by = y - uy * len;
  return {
    tip: { x, y },
    left: { x: bx - uy * wide, y: by + ux * wide },
    right: { x: bx + uy * wide, y: by - ux * wide },
  };
}

/**
 * SVG path `d` (already y-flipped for SVG) for the angle arc between the two
 * vectors at `radius` grid units. `null` at angle 0 or when either vector is
 * zero (no arc can describe the angle). 180° uses an arbitrary facing.
 *
 * The arc must be centred on the ORIGIN (it marks the angle around it). The
 * y-flip lives only in the point mapping — the rendered path keeps the math
 * orientation — so math-CCW (cross > 0) is drawn counter-clockwise on screen:
 * SVG sweep flag 0. (Sweep 1 selects the second circle through the endpoints
 * and bends the arc around the wrong centre.)
 */
export function angleArcPath(ax, ay, bx, by, radius = ARC_RADIUS) {
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (!(magA > 0) || !(magB > 0)) return null;
  const dot = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  if (cross === 0 && dot > 0) return null; // 0°: no arc
  const sx = (ax / magA) * radius;
  const sy = (ay / magA) * radius;
  const ex = (bx / magB) * radius;
  const ey = (by / magB) * radius;
  const sweep = cross > 0 ? 0 : 1;
  return `M ${sx} ${-sy} A ${radius} ${radius} 0 0 ${sweep} ${ex} ${-ey}`;
}

/**
 * Rule-based explanation key for a state (wording pre-written in the spec
 * copy `explanations`, never generated):
 *   zero       — undefined cosine (a zero vector)
 *   parallel   — cos ≥ 0.999 (same direction)
 *   similar    — cos > 0.3
 *   orthogonal — -0.3 ≤ cos ≤ 0.3
 *   opposite   — cos < -0.3
 */
export function explainKey(result) {
  if (result.cos === null) return 'zero';
  if (result.cos >= 0.999) return 'parallel';
  if (result.cos > 0.3) return 'similar';
  if (result.cos >= -0.3) return 'orthogonal';
  return 'opposite';
}

/**
 * Fixed-precision formatting that matches the template's `printf "%.Nf"` for
 * every non-tie value (the specs avoid exact rounding ties). Robust: never
 * renders "-0.00"/"NaN"/"Infinity"; very small negatives print as "0.00".
 */
export function formatNum(value, digits) {
  if (!Number.isFinite(value)) return '—';
  let s = value.toFixed(digits);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
  return s;
}

/* ── data contract validator ──────────────────────────────────────────── */

const MODEL_KEYS = ['bound', 'gridStep', 'angleStep'];
const SCENARIO_KEYS = ['id', 'ax', 'ay', 'bx', 'by'];
const SHARED_COPY = [
  'figureLabel',
  'title',
  'question',
  'assumption',
  'observe',
  'footerNote',
  'referenceTitle',
  'scenarioLabels',
];
const KIND_COPY = [
  'illustrationNotice',
  'unitLabel',
  'undefinedText',
  'diagramNote',
  'vectorLabels',
  'inputs',
  'metrics',
  'actions',
  'explanations',
];

const LIMITS = {
  figureLabel: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  presetNotice: 200,
  unitLabel: 40,
  undefinedText: 80,
  label: 80,
  action: 60,
  coord: 0.001,
};

const LOCALES = ['zh', 'en'];

function describe(value) {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 40));
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  return String(value);
}

/**
 * Finite decimal check with bounds (the strict numeric gate for this kind's
 * decimal fields — NaN/Infinity/strings all fail with a stable field path).
 */
function decimal(p, value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    p.fail(`expected a finite number, got ${describe(value)}`);
    return false;
  }
  if (value < min || value > max) {
    p.fail(`expected a number in [${min}, ${max}], got ${value}`);
    return false;
  }
  return true;
}

/** Cosine between two scenario vectors; null when either is zero. */
function scenarioCos(ax, ay, bx, by) {
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (!(magA > 0) || !(magB > 0)) return null;
  return Math.min(1, Math.max(-1, (ax * bx + ay * by) / (magA * magB)));
}

function validateCopies(p, raw, scenarioIds) {
  const cp = p.child('copy');
  if (raw.copy === null || typeof raw.copy !== 'object' || Array.isArray(raw.copy)) {
    cp.fail('expected an object with zh and en copies');
    return false;
  }
  if (!cp.keys(raw.copy, LOCALES)) return false;
  let ok = true;
  for (const lang of LOCALES) {
    const lp = cp.child(lang);
    const copy = raw.copy[lang];
    if (copy === null || typeof copy !== 'object' || Array.isArray(copy)) {
      lp.fail(`expected a copy object, got ${describe(copy)}`);
      ok = false;
      continue;
    }
    if (!lp.keys(copy, [...SHARED_COPY, ...KIND_COPY])) {
      ok = false;
      continue;
    }
    if (!lp.child('figureLabel').text(copy.figureLabel, LIMITS.figureLabel)) ok = false;
    if (!lp.child('title').text(copy.title, LIMITS.title)) ok = false;
    if (!lp.child('question').text(copy.question, LIMITS.question)) ok = false;
    if (!lp.child('assumption').text(copy.assumption, LIMITS.note)) ok = false;
    if (!lp.child('observe').text(copy.observe, LIMITS.note)) ok = false;
    if (!lp.child('footerNote').text(copy.footerNote, LIMITS.footerNote)) ok = false;
    if (!lp.child('referenceTitle').text(copy.referenceTitle, LIMITS.label)) ok = false;
    if (!lp.child('illustrationNotice').text(copy.illustrationNotice, LIMITS.presetNotice)) ok = false;
    if (!lp.child('unitLabel').text(copy.unitLabel, LIMITS.unitLabel)) ok = false;
    if (!lp.child('undefinedText').text(copy.undefinedText, LIMITS.undefinedText)) ok = false;
    if (!lp.child('diagramNote').text(copy.diagramNote, LIMITS.note)) ok = false;

    const labels = lp.child('scenarioLabels');
    if (scenarioIds && !labels.keys(copy.scenarioLabels, [...scenarioIds])) {
      ok = false;
    } else if (scenarioIds) {
      for (const id of scenarioIds) {
        if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
      }
    }

    if (
      !lp.child('vectorLabels').textMap(copy.vectorLabels, ['a', 'b'], LIMITS.label)
    ) {
      ok = false;
    }
    if (
      !lp.child('inputs').textMap(copy.inputs, ['ax', 'ay', 'bx', 'by'], LIMITS.label)
    ) {
      ok = false;
    }
    if (
      !lp.child('metrics').textMap(copy.metrics, ['dot', 'magA', 'magB', 'angle', 'cosine'], LIMITS.label)
    ) {
      ok = false;
    }
    if (
      !lp.child('actions').textMap(copy.actions, ['scale', 'rotateLeft', 'rotateRight'], LIMITS.action)
    ) {
      ok = false;
    }
    if (
      !lp.child('explanations').textMap(
        copy.explanations,
        ['parallel', 'similar', 'orthogonal', 'opposite', 'zero'],
        LIMITS.note
      )
    ) {
      ok = false;
    }
  }
  return ok;
}

/**
 * Strict validator for `kind: "vector-cosine"` specs. Called by validateSpec
 * after the common top-level checks; records field errors through `p` and
 * never throws on corrupt input.
 */
export function validateVectorCosine(p, raw, { validateScenariosList, validateSourceRefs }) {
  let ok = true;

  /* model: bound (integer radius), gridStep (decimal quantum), angleStep */
  const mp = p.child('model');
  let modelOk = true;
  let bound = null;
  let gridStep = null;
  if (!mp.keys(raw.model, MODEL_KEYS)) {
    modelOk = false;
    ok = false;
  } else {
    const m = raw.model;
    if (!mp.child('bound').integer(m.bound, 1, 24)) {
      modelOk = false;
      ok = false;
    } else {
      bound = m.bound;
    }
    if (!decimal(mp.child('gridStep'), m.gridStep, 0.05, 1)) {
      modelOk = false;
      ok = false;
    } else {
      gridStep = m.gridStep;
    }
    if (!mp.child('angleStep').integer(m.angleStep, 1, 90)) {
      modelOk = false;
      ok = false;
    }
    if (bound !== null && gridStep !== null) {
      const cells = bound / gridStep;
      if (Math.abs(cells - Math.round(cells)) > 1e-9) {
        mp.child('gridStep').fail(
          `gridStep (${gridStep}) must divide bound (${bound}) into whole cells`
        );
        modelOk = false;
        ok = false;
      }
    }
  }

  /* scenarios: preset vectors with strict bounds and preset semantics */
  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, SCENARIO_KEYS);
    const coords = ['ax', 'ay', 'bx', 'by'];
    for (const key of coords) {
      if (bound !== null) {
        if (!decimal(ip.child(key), scenario[key], -bound, bound)) sok = false;
      } else if (!decimal(ip.child(key), scenario[key], -24, 24)) {
        sok = false;
      }
    }
    if (sok && bound !== null) {
      const rA = Math.sqrt(scenario.ax * scenario.ax + scenario.ay * scenario.ay);
      const rB = Math.sqrt(scenario.bx * scenario.bx + scenario.by * scenario.by);
      const eps = LIMITS.coord;
      if (rA > bound + eps) {
        ip.fail(`vector A (${scenario.ax}, ${scenario.ay}) leaves the bound disk of radius ${bound}`);
        sok = false;
      }
      if (rB > bound + eps) {
        ip.fail(`vector B (${scenario.bx}, ${scenario.by}) leaves the bound disk of radius ${bound}`);
        sok = false;
      }
    }
    if (sok) {
      const cos = scenarioCos(scenario.ax, scenario.ay, scenario.bx, scenario.by);
      const zeroA = Math.sqrt(scenario.ax * scenario.ax + scenario.ay * scenario.ay) === 0;
      const zeroB = Math.sqrt(scenario.bx * scenario.bx + scenario.by * scenario.by) === 0;
      if (scenario.id === 'parallel') {
        if (cos === null || Math.abs(cos - 1) > 1e-6) {
          ip.fail('the "parallel" preset must use two non-zero vectors with cosine 1 (same direction)');
          sok = false;
        }
      } else if (scenario.id === 'orthogonal') {
        if (cos === null || Math.abs(cos) > 1e-6) {
          ip.fail('the "orthogonal" preset must use two non-zero vectors with cosine 0 (right angle)');
          sok = false;
        }
      } else if (scenario.id === 'opposite') {
        if (cos === null || Math.abs(cos + 1) > 1e-6) {
          ip.fail('the "opposite" preset must use two non-zero vectors with cosine -1 (opposite direction)');
          sok = false;
        }
      } else if (scenario.id === 'zero') {
        if (!zeroA && !zeroB) {
          ip.fail('the "zero" preset must contain the zero vector (undefined angle/cosine)');
          sok = false;
        }
      }
    }
    return sok;
  });
  if (!scenarioIds) {
    ok = false;
  } else {
    const sp = p.child('scenarios');
    for (const id of PRESETS) {
      if (!scenarioIds.has(id)) {
        sp.fail(`missing required preset scenario "${id}" (${PRESETS.join(', ')})`);
        ok = false;
      }
    }
  }

  if (!validateCopies(p, raw, scenarioIds || undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}
