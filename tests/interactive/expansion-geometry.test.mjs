/**
 * expansion-geometry.test.mjs — pure-model and data-contract tests for the
 * geometry expansion kinds (`vector-cosine`, `flow-bottleneck`).
 *
 * Covers the group's meaningful edges and invariants: geometry identities,
 * zero-vector semantics, rounding robustness, pointer-facing math, queue
 * conservation (incl. initial in-flight jobs), saturation/bottleneck
 * movement, the hard tick bound, independent instances, and corrupt spec
 * rejection through the ONE executable schema (never weakened, never
 * throwing on hostile input).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ARC_RADIUS,
  angleArcPath,
  arrowHead,
  clampCoord,
  clampPoint,
  explainKey as vectorExplain,
  formatNum,
  pointerToPlane,
  quantize,
  rotateVector,
  scaleLength,
  setCoord,
  setVector,
  vectorMath,
} from '../../assets/js/components/vector-cosine-model.mjs';
import {
  bottleneckKey,
  canTick,
  chartScale,
  checkConservation,
  clampCapacity,
  explainKey as flowExplain,
  initialState,
  simulate,
  step,
  wip,
} from '../../assets/js/components/flow-bottleneck-model.mjs';
import { validateSpec, formatErrors } from '../../assets/js/components/spec-schema.mjs';

const MODEL = { bound: 6, gridStep: 0.25, angleStep: 15 };
const FLOW_MODEL = { demand: 6, capacityMax: 12, maxTicks: 16 };

const realSpec = (name) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../data/interactive/${name}`, import.meta.url)),
      'utf8'
    )
  );

const OBLIQUE = { ax: 3, ay: 1, bx: 1, by: 2 };

function vectorSpec(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'vector-cosine',
    id: 'vector-cosine-v1',
    defaultScenario: 'oblique',
    model: { bound: 6, gridStep: 0.25, angleStep: 15 },
    scenarios: [
      { id: 'oblique', ax: 3, ay: 1, bx: 1, by: 2 },
      { id: 'parallel', ax: 2, ay: 1, bx: 4, by: 2 },
      { id: 'orthogonal', ax: 2, ay: 1, bx: -1, by: 2 },
      { id: 'opposite', ax: 2, ay: 1, bx: -2, by: -1 },
      { id: 'zero', ax: 2, ay: 1, bx: 0, by: 0 },
    ],
    copy: vectorCopy(['oblique', 'parallel', 'orthogonal', 'opposite', 'zero']),
    sourceRefs: [{ url: 'https://en.wikipedia.org/wiki/Cosine_similarity', title: 'Cosine similarity' }],
    ...overrides,
  };
}

function vectorCopy(ids) {
  const labels = Object.fromEntries(ids.map((id) => [id, `label-${id}`]));
  const fill = {
    figureLabel: 'figure',
    title: 'title',
    question: 'question',
    assumption: 'assumption',
    observe: 'observe',
    footerNote: 'footer',
    referenceTitle: 'reference',
    scenarioLabels: labels,
    illustrationNotice: 'notice',
    unitLabel: 'units',
    undefinedText: 'undefined',
    diagramNote: 'diagram',
    vectorLabels: { a: 'A', b: 'B' },
    inputs: { ax: 'ax', ay: 'ay', bx: 'bx', by: 'by' },
    metrics: { dot: 'dot', magA: 'magA', magB: 'magB', angle: 'angle', cosine: 'cosine' },
    actions: { scale: 'scale', rotateLeft: 'left', rotateRight: 'right' },
    explanations: {
      parallel: 'p',
      similar: 's',
      orthogonal: 'o',
      opposite: 'x',
      zero: 'z',
    },
  };
  return { zh: { ...fill, scenarioLabels: { ...labels } }, en: { ...fill, scenarioLabels: { ...labels } } };
}

function flowSpec(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'flow-bottleneck',
    id: 'flow-bottleneck-v1',
    defaultScenario: 'review-bound',
    model: { demand: 6, capacityMax: 12, maxTicks: 16 },
    scenarios: [
      {
        id: 'review-bound',
        capacity: { generate: 6, review: 3, delivery: 5 },
        initial: { generate: 8, review: 0, delivery: 0 },
      },
      {
        id: 'balanced',
        capacity: { generate: 6, review: 6, delivery: 6 },
        initial: { generate: 0, review: 0, delivery: 0 },
      },
    ],
    copy: flowCopy(['review-bound', 'balanced']),
    sourceRefs: [{ url: 'https://en.wikipedia.org/wiki/Theory_of_constraints', title: 'Theory of constraints' }],
    ...overrides,
  };
}

function flowCopy(ids) {
  const labels = Object.fromEntries(ids.map((id) => [id, `label-${id}`]));
  const fill = {
    figureLabel: 'figure',
    title: 'title',
    question: 'question',
    assumption: 'assumption',
    observe: 'observe',
    footerNote: 'footer',
    referenceTitle: 'reference',
    scenarioLabels: labels,
    illustrationNotice: 'notice',
    unitLabel: 'units',
    diagramNote: 'diagram',
    tickLabel: 'tick',
    tickRule: 'rule',
    capacityLabel: 'capacity',
    demandLabel: 'demand',
    stages: { generate: 'g', review: 'r', delivery: 'd' },
    metrics: {
      tick: 'tick',
      queue: 'queue',
      wip: 'wip',
      delivered: 'delivered',
      throughput: 'throughput',
      admitted: 'admitted',
    },
    explanations: { generate: 'g', review: 'r', delivery: 'd', balanced: 'b', 'demand-limited': 'dl' },
  };
  return { zh: { ...fill, scenarioLabels: { ...labels } }, en: { ...fill, scenarioLabels: { ...labels } } };
}

function errorsOf(spec) {
  const { ok, errors } = validateSpec(spec, { file: 'test' });
  assert.equal(ok, false, 'spec should fail');
  assert.ok(errors.length > 0);
  return errors.map((e) => `${e.field}: ${e.message}`).join('\n');
}

/* ══════════════════ vector-cosine: geometry invariants ═════════════════ */

test('geometry identity: dot = |A||B|cosθ and |A×B|² + dot² = (|A||B|)²', () => {
  const states = [
    OBLIQUE,
    { ax: 2, ay: 1, bx: 4, by: 2 },
    { ax: -3, ay: 2, bx: 1, by: -4 },
    { ax: 6, ay: 0, bx: 0, by: -6 },
  ];
  for (const s of states) {
    const r = vectorMath(s);
    const cross = s.ax * s.by - s.ay * s.bx;
    assert.ok(Math.abs(r.dot - r.magA * r.magB * r.cos) < 1e-9, `dot identity ${JSON.stringify(s)}`);
    assert.ok(
      Math.abs(cross * cross + r.dot * r.dot - (r.magA * r.magB) ** 2) < 1e-9,
      `Pythagorean identity ${JSON.stringify(s)}`
    );
  }
});

test('preset invariants: parallel/orthogonal/opposite angles and explain keys', () => {
  const parallel = vectorMath({ ax: 2, ay: 1, bx: 4, by: 2 });
  assert.ok(Math.abs(parallel.cos - 1) < 1e-9);
  assert.ok(Math.abs(parallel.angleDeg) < 1e-6);
  assert.equal(vectorExplain(parallel), 'parallel');

  const orthogonal = vectorMath({ ax: 2, ay: 1, bx: -1, by: 2 });
  assert.ok(Math.abs(orthogonal.cos) < 1e-9);
  assert.ok(Math.abs(orthogonal.angleDeg - 90) < 1e-6);
  assert.equal(vectorExplain(orthogonal), 'orthogonal');

  const opposite = vectorMath({ ax: 2, ay: 1, bx: -2, by: -1 });
  assert.ok(Math.abs(opposite.cos + 1) < 1e-9);
  assert.ok(Math.abs(opposite.angleDeg - 180) < 1e-6);
  assert.equal(vectorExplain(opposite), 'opposite');

  assert.equal(vectorExplain(vectorMath(OBLIQUE)), 'similar');
});

test('zero vector: angle and cosine are undefined (null), never NaN', () => {
  for (const s of [
    { ax: 0, ay: 0, bx: 3, by: 1 },
    { ax: 2, ay: 1, bx: 0, by: 0 },
    { ax: 0, ay: 0, bx: 0, by: 0 },
  ]) {
    const r = vectorMath(s);
    assert.equal(r.cos, null, JSON.stringify(s));
    assert.equal(r.angleDeg, null, JSON.stringify(s));
    assert.ok(Number.isFinite(r.dot));
    assert.ok(Number.isFinite(r.magA) && Number.isFinite(r.magB));
    assert.equal(vectorExplain(r), 'zero');
  }
});

test('zero vector has no direction: scaling and rotating keep it zero', () => {
  const zeroState = { ax: 2, ay: 1, bx: 0, by: 0 };
  assert.deepEqual(scaleLength(zeroState, 5, MODEL), zeroState);
  assert.deepEqual(rotateVector(zeroState, 45, MODEL), zeroState);
  assert.equal(arrowHead(0, 0), null);
  assert.equal(angleArcPath(2, 1, 0, 0), null);
});

test('scale keeps direction exactly: cosine unchanged, length = target', () => {
  const r0 = vectorMath(OBLIQUE);
  for (const len of [0.5, 1, 2.25, 5.75, 6]) {
    const scaled = scaleLength(OBLIQUE, len, MODEL);
    const r = vectorMath(scaled);
    assert.ok(Math.abs(r.magB - len) < 1e-9, `length ${len}`);
    assert.ok(Math.abs(r.cos - r0.cos) < 1e-9, `cosine stable at ${len}`);
    // B keeps its unit direction exactly (cross of the unit vectors ≈ 0)
    const ux = scaled.bx / r.magB;
    const uy = scaled.by / r.magB;
    const crossUnit = (OBLIQUE.bx / r0.magB) * uy - (OBLIQUE.by / r0.magB) * ux;
    assert.ok(Math.abs(crossUnit) < 1e-9, `direction stable at ${len}`);
  }
  // length is finite-clamped: no NaN/Infinity may ever enter the state
  const clamped = scaleLength(OBLIQUE, Number.NaN, MODEL);
  assert.ok(clamped.bx === OBLIQUE.bx && clamped.by === OBLIQUE.by, 'NaN length is ignored');
  const capped = scaleLength({ ax: 3, ay: 1, bx: 3, by: 1 }, 99, MODEL);
  const rCap = vectorMath({ ...capped });
  assert.ok(rCap.magB <= MODEL.bound + 1e-9, 'length clamps to the finite bound');
  // scaling to zero documents the zero-vector case
  assert.deepEqual(scaleLength(OBLIQUE, 0, MODEL), { ...OBLIQUE, bx: 0, by: 0 });
});

test('rotate keeps magnitude and shifts the angle by exactly angleStep·n', () => {
  const r0 = vectorMath(OBLIQUE);
  let state = { ...OBLIQUE };
  for (let i = 1; i <= 8; i += 1) {
    state = rotateVector(state, 15, MODEL);
    const r = vectorMath(state);
    assert.ok(Math.abs(r.magB - r0.magB) < 1e-9, `magnitude stable at step ${i}`);
    const expected = Math.cos(((r0.angleDeg + 15 * i) * Math.PI) / 180);
    assert.ok(Math.abs(r.cos - expected) < 1e-9, `angle ${i}×15°`);
    assert.ok(r.magB <= MODEL.bound + 1e-9, 'rotation stays in the finite bound');
  }
});

/* ── angle-arc geometry: centred on the ORIGIN, both sweep signs ──────── */

/**
 * SVG endpoint→center parameterization (SVG spec F.6.5) plus the actual arc
 * midpoint — evaluates the GEOMETRY behind `M … A …` so the tests verify the
 * rendered circle instead of snapshotting the path string.
 */
function svgArcGeometry(sx, sy, ex, ey, r, large, sweep) {
  const dx2 = (sx - ex) / 2;
  const dy2 = (sy - ey) / 2;
  const num = r * r * r * r - r * r * dy2 * dy2 - r * r * dx2 * dx2;
  const den = r * r * dy2 * dy2 + r * r * dx2 * dx2;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cx = co * (r * dy2) / r + (sx + ex) / 2;
  const cy = co * -(r * dx2) / r + (sy + ey) / 2;
  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const t1 = ang(1, 0, (sx - cx) / r, (sy - cy) / r);
  const t2 = ang(1, 0, (ex - cx) / r, (ey - cy) / r);
  let dt = t2 - t1;
  if (sweep === 1 && dt < 0) dt += 2 * Math.PI;
  if (sweep === 0 && dt > 0) dt -= 2 * Math.PI;
  const tm = t1 + dt / 2;
  return {
    center: { x: cx, y: cy },
    mid: { x: cx + r * Math.cos(tm), y: cy + r * Math.sin(tm) },
  };
}

test('angle arc is origin-centred for BOTH cross signs (midpoint distance = radius)', () => {
  // [name, ax, ay, bx, by] — cross = ax*by - ay*bx (math plane)
  const cases = [
    ['quarter cross>0', 1, 0, 0, 1],
    ['quarter cross<0', 0, 1, 1, 0],
    ['orthogonal cross>0', 2, 1, -1, 2],
    ['oblique cross<0', 3, 1, 1, -2],
    ['reflex-side cross<0', -1, 2, 2, 1],
    ['straight angle', 2, 1, -2, -1],
  ];
  for (const [name, ax, ay, bx, by] of cases) {
    const d = angleArcPath(ax, ay, bx, by);
    assert.ok(d, `${name} draws an arc`);
    const m = d.match(/^M (\S+) (\S+) A (\S+) (\S+) 0 0 (\d) (\S+) (\S+)$/);
    assert.ok(m, `${name} path shape`);
    // groups: sx sy rx ry sweep ex ey (rotation and large-arc are literal 0)
    const [, sx, sy, rx, ry, sweep, ex, ey] = m;
    assert.equal(Number(rx), ARC_RADIUS);
    assert.equal(Number(ry), ARC_RADIUS);
    const geom = svgArcGeometry(
      Number(sx), Number(sy), Number(ex), Number(ey), ARC_RADIUS, 0, Number(sweep)
    );
    assert.ok(
      Math.hypot(geom.center.x, geom.center.y) < 1e-9,
      `${name}: arc centre is the origin (got ${JSON.stringify(geom.center)})`
    );
    assert.ok(
      Math.abs(Math.hypot(geom.mid.x, geom.mid.y) - ARC_RADIUS) < 1e-9,
      `${name}: arc midpoint is ${ARC_RADIUS} from the origin (got ${Math.hypot(geom.mid.x, geom.mid.y).toFixed(4)})`
    );
    // the minor arc bulges along the angle bisector (never around the far circle)
    const cross = ax * by - ay * bx;
    if (cross !== 0) {
      const ux = ax / Math.sqrt(ax * ax + ay * ay) + bx / Math.sqrt(bx * bx + by * by);
      const uy = ay / Math.sqrt(ax * ax + ay * ay) + by / Math.sqrt(bx * bx + by * by);
      const ul = Math.sqrt(ux * ux + uy * uy);
      assert.ok(
        Math.hypot(geom.mid.x - (ARC_RADIUS * ux) / ul, geom.mid.y + (ARC_RADIUS * uy) / ul) < 1e-9,
        `${name}: midpoint on the bisector of the angle itself (y-flip applied)`
      );
    }
  }
  // 0° has no arc; zero vectors have no direction
  assert.equal(angleArcPath(2, 1, 4, 2), null);
  assert.equal(angleArcPath(0, 0, 1, 1), null);
  assert.equal(angleArcPath(1, 1, 0, 0), null);
});

test('formatNum is robust: ties, negative zero, tiny values, non-finite', () => {
  assert.equal(formatNum(0, 2), '0.00');
  assert.equal(formatNum(-0, 2), '0.00');
  assert.equal(formatNum(-0.0001, 2), '0.00'); // never "-0.00"
  assert.equal(formatNum(3.14159, 2), '3.14');
  assert.equal(formatNum(0.7071067811865476, 3), '0.707');
  assert.equal(formatNum(45.00000000000001, 1), '45.0');
  assert.equal(formatNum(180, 1), '180.0');
  assert.equal(formatNum(Number.NaN, 2), '—');
  assert.equal(formatNum(Number.POSITIVE_INFINITY, 2), '—');
  for (const digits of [0, 1, 2, 3]) {
    for (const v of [-1e9, -1, -0.05, 0.05, 1, 1e9]) {
      assert.ok(!formatNum(v, digits).includes('NaN'), 'never NaN');
    }
  }
});

test('pointer-facing math: responsive mapping and finite clamping', () => {
  const rect = { left: 100, top: 50, width: 400, height: 400 };
  const extent = MODEL.bound + 1; // 7
  // rect centre → origin
  assert.deepEqual(pointerToPlane(300, 250, rect, MODEL, extent), { x: 0, y: 0 });
  // corners map to ±extent and clamp into the disk (direction preserved)
  const corner = pointerToPlane(500, 50, rect, MODEL, extent);
  assert.ok(Math.abs(Math.sqrt(corner.x ** 2 + corner.y ** 2) - MODEL.bound) < MODEL.gridStep);
  assert.ok(corner.x > 0 && corner.y > 0, 'direction preserved toward top-right');
  // any pointer position stays finite and inside the disk
  for (const [x, y] of [[-9999, 9999], [300, -9999], [1e9, 1e9], [Number.NaN, 10]]) {
    const p = pointerToPlane(x, y, rect, MODEL, extent);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(Math.sqrt(p.x ** 2 + p.y ** 2) <= MODEL.bound + 1e-9);
  }
  // responsive: a different rect size maps proportionally (grid-snapped)
  const wide = pointerToPlane(150, 250, { left: 0, top: 0, width: 800, height: 400 }, MODEL, extent);
  assert.deepEqual(wide, { x: -4.25, y: -1.75 }, 'linear map at width 800 snaps to the grid');
  // degenerate rects never divide by zero
  assert.deepEqual(pointerToPlane(10, 10, { left: 0, top: 0, width: 0, height: 0 }, MODEL, extent), { x: 0, y: 0 });
});

test('quantize/clampPoint/setCoord snap to the grid and clamp to the disk', () => {
  assert.equal(quantize(2.3, 0.25), 2.25);
  assert.equal(quantize(-2.3, 0.25), -2.25);
  assert.equal(quantize(Number.NaN, 0.25), 0);
  assert.equal(clampCoord(99, MODEL), MODEL.bound);
  assert.equal(clampCoord(-99, MODEL), -MODEL.bound);
  const p = clampPoint(6, 6, MODEL);
  assert.ok(Math.abs(Math.sqrt(p.x ** 2 + p.y ** 2) - MODEL.bound) < 1e-9);
  const state = setCoord({ ...OBLIQUE }, 'bx', 6, MODEL); // B=(6,2) would leave the disk
  const r = Math.sqrt(state.bx ** 2 + state.by ** 2);
  assert.ok(r <= MODEL.bound + 1e-9, 'setCoord clamps the whole vector');
  const moved = setVector({ ...OBLIQUE }, 'a', 2.3, -4.6, MODEL);
  assert.deepEqual(moved, { ...moved, ax: 2.25, ay: -4.5 });
});

/* ═══════════════ flow-bottleneck: deterministic tick semantics ═════════ */

const REVIEW_BOUND = {
  id: 'review-bound',
  capacity: { generate: 6, review: 3, delivery: 5 },
  initial: { generate: 8, review: 0, delivery: 0 },
};

test('documented tick semantics: exact review-bound run for ticks 1–4', () => {
  let s = initialState(REVIEW_BOUND);
  assert.deepEqual([s.queue, s.delivered, s.admitted], [
    { generate: 8, review: 0, delivery: 0 },
    0,
    8,
  ]);
  const expected = [
    [{ generate: 8, review: 6, delivery: 0 }, 0, 0],
    [{ generate: 8, review: 9, delivery: 3 }, 0, 0],
    [{ generate: 8, review: 12, delivery: 3 }, 3, 3],
    [{ generate: 8, review: 15, delivery: 3 }, 6, 3],
  ];
  for (const [queue, delivered, throughput] of expected) {
    s = step(s, REVIEW_BOUND.capacity, FLOW_MODEL);
    assert.deepEqual(s.queue, queue, `tick ${s.tick} queues`);
    assert.equal(s.delivered, delivered, `tick ${s.tick} delivered`);
    assert.equal(s.last.delivery, throughput, `tick ${s.tick} throughput`);
  }
});

test('conservation: admitted = Σqueues + delivered every tick, incl. initial in-flight', () => {
  const cases = [
    REVIEW_BOUND,
    { id: 'warm', capacity: { generate: 6, review: 3, delivery: 5 }, initial: { generate: 8, review: 4, delivery: 2 } },
    { id: 'blocked', capacity: { generate: 0, review: 0, delivery: 0 }, initial: { generate: 3, review: 2, delivery: 1 } },
    { id: 'wide', capacity: { generate: 12, review: 12, delivery: 12 }, initial: { generate: 0, review: 0, delivery: 0 } },
  ];
  for (const scenario of cases) {
    let s = initialState(scenario);
    assert.equal(s.admitted, wip(s) + s.delivered, 'tick 0 conserves initial in-flight');
    for (let i = 0; i < FLOW_MODEL.maxTicks; i += 1) {
      s = step(s, scenario.capacity, FLOW_MODEL);
      assert.ok(checkConservation(s), `${scenario.id} tick ${s.tick} conservation`);
      for (const stage of ['generate', 'review', 'delivery']) {
        assert.ok(Number.isInteger(s.queue[stage]) && s.queue[stage] >= 0, 'no negative/dropped jobs');
      }
    }
    // everything ever admitted is still accounted for at the hard bound
    assert.equal(s.admitted, scenario.initial.generate + scenario.initial.review + scenario.initial.delivery + FLOW_MODEL.demand * FLOW_MODEL.maxTicks);
    assert.equal(s.admitted, wip(s) + s.delivered);
  }
});

test('saturation: a downstream bottleneck bounds throughput; local speedup does not raise it', () => {
  const slow = simulate(initialState(REVIEW_BOUND), { generate: 6, review: 3, delivery: 5 }, FLOW_MODEL, 12);
  const surged = simulate(initialState(REVIEW_BOUND), { generate: 10, review: 3, delivery: 5 }, FLOW_MODEL, 12);
  // local speedup at generation: same delivered stream (the constraint is review)
  assert.equal(slow.delivered, surged.delivered, 'local speedup leaves delivered unchanged');
  assert.equal(slow.last.delivery, 3, 'throughput saturates at the narrowest capacity');
  assert.ok(slow.history.length === surged.history.length);
  slow.history.forEach((row, i) => {
    const other = surged.history[i];
    assert.equal(row.throughput, other.throughput, 'identical per-tick throughput');
    assert.equal(row.delivered, other.delivered, 'identical cumulative delivery');
  });
  // the surge is visible locally: it drains the generation queue faster
  const slowEarly = simulate(initialState(REVIEW_BOUND), { generate: 6, review: 3, delivery: 5 }, FLOW_MODEL, 3);
  const surgeEarly = simulate(initialState(REVIEW_BOUND), { generate: 10, review: 3, delivery: 5 }, FLOW_MODEL, 3);
  assert.ok(surgeEarly.queue.generate < slowEarly.queue.generate, 'local queue drains faster');
});

test('bottleneck movement: raising the narrowest stage moves the constraint', () => {
  assert.equal(bottleneckKey({ generate: 6, review: 3, delivery: 5 }), 'review');
  assert.equal(bottleneckKey({ generate: 6, review: 5, delivery: 4 }), 'delivery');
  assert.equal(bottleneckKey({ generate: 2, review: 5, delivery: 4 }), 'generate');
  assert.equal(bottleneckKey({ generate: 4, review: 4, delivery: 4 }), 'balanced');
  assert.equal(bottleneckKey({ generate: 4, review: 2, delivery: 2 }), 'balanced'); // tie reads as balanced

  // unblocking review raises throughput to the next constraint (delivery)
  const run = (caps) => simulate(initialState({ ...REVIEW_BOUND, initial: { generate: 0, review: 0, delivery: 0 } }), caps, FLOW_MODEL, 12);
  assert.equal(run({ generate: 6, review: 3, delivery: 5 }).last.delivery, 3);
  assert.equal(run({ generate: 6, review: 5, delivery: 5 }).last.delivery, 5);
  assert.equal(run({ generate: 6, review: 12, delivery: 5 }).last.delivery, 5, 'delivery becomes the constraint');
  assert.equal(run({ generate: 6, review: 12, delivery: 2 }).last.delivery, 2);
});

test('stop bound: the run is hard-limited by model.maxTicks (no infinite autoplay)', () => {
  let s = initialState(REVIEW_BOUND);
  for (let i = 0; i < FLOW_MODEL.maxTicks; i += 1) {
    assert.equal(canTick(s, FLOW_MODEL), true, `tick ${i} allowed`);
    s = step(s, REVIEW_BOUND.capacity, FLOW_MODEL);
  }
  assert.equal(canTick(s, FLOW_MODEL), false, 'no tick past the bound');
  const over = simulate(initialState(REVIEW_BOUND), REVIEW_BOUND.capacity, FLOW_MODEL, 10 * FLOW_MODEL.maxTicks);
  assert.equal(over.tick, FLOW_MODEL.maxTicks, 'simulate refuses to exceed the bound');
  assert.equal(over.history.length, FLOW_MODEL.maxTicks + 1);
});

test('independent instances: pure steps never mutate or share state', () => {
  const a0 = initialState(REVIEW_BOUND);
  const snapshot = JSON.stringify(a0);
  const b0 = initialState({
    id: 'balanced',
    capacity: { generate: 6, review: 6, delivery: 6 },
    initial: { generate: 0, review: 0, delivery: 0 },
  });
  const a1 = step(a0, REVIEW_BOUND.capacity, FLOW_MODEL);
  const b1 = step(b0, { generate: 6, review: 6, delivery: 6 }, FLOW_MODEL);
  assert.equal(JSON.stringify(a0), snapshot, 'step() is immutable');
  assert.notDeepEqual(a1.queue, b1.queue, 'two instances evolve independently');
  assert.ok(checkConservation(a1) && checkConservation(b1));
  // independent vector states likewise
  const v1 = rotateVector({ ...OBLIQUE }, 90, MODEL);
  const v2 = { ...OBLIQUE };
  assert.deepEqual(v2, OBLIQUE, 'rotateVector is immutable');
  assert.notEqual(v1.bx, v2.bx);
});

test('explanation state: demand-limited vs capacity-limited readings', () => {
  // queue-buildup readings only fire while demand really exceeds the narrowest
  assert.equal(flowExplain({ generate: 6, review: 3, delivery: 5 }, 6), 'review');
  assert.equal(flowExplain({ generate: 2, review: 5, delivery: 4 }, 6), 'generate');
  assert.equal(flowExplain({ generate: 6, review: 5, delivery: 4 }, 6), 'delivery');
  assert.equal(flowExplain({ generate: 4, review: 4, delivery: 4 }, 6), 'balanced');
  // spare capacity everywhere: no sustained buildup to describe
  assert.equal(flowExplain({ generate: 8, review: 10, delivery: 12 }, 6), 'demand-limited');
  assert.equal(flowExplain({ generate: 6, review: 6, delivery: 6 }, 6), 'demand-limited');
  assert.equal(flowExplain({ generate: 6, review: 3, delivery: 5 }, 3), 'demand-limited');
  assert.equal(flowExplain({ generate: 0, review: 0, delivery: 0 }, 0), 'demand-limited');
});

test('clampCapacity/chartScale are finite and bounded', () => {
  assert.equal(clampCapacity(Number.NaN, FLOW_MODEL), 0);
  assert.equal(clampCapacity(Number.POSITIVE_INFINITY, FLOW_MODEL), 0);
  assert.equal(clampCapacity(-5, FLOW_MODEL), 0);
  assert.equal(clampCapacity(99, FLOW_MODEL), FLOW_MODEL.capacityMax);
  assert.equal(clampCapacity(3.9, FLOW_MODEL), 3);
  assert.equal(chartScale([]), 8);
  assert.equal(chartScale([{ wip: 3, throughput: 2 }]), 8);
  assert.equal(chartScale([{ wip: 3, throughput: 20 }]), 20);
});

/* ═══════════════════ the real specs must pass the schema ═══════════════ */

test('the shipped vector-cosine-v1 and flow-bottleneck-v1 specs validate', () => {
  for (const name of ['vector-cosine-v1.json', 'flow-bottleneck-v1.json']) {
    const { ok, errors } = validateSpec(realSpec(name), { file: name });
    assert.equal(ok, true, `${name}: ${formatErrors(errors)}`);
  }
});

/* ═══════════════════════ corrupt specs are rejected ════════════════════ */

test('vector-cosine: corrupt numbers fail with field paths (NaN/Infinity/strings)', () => {
  for (const [field, value] of [
    ['ax', Number.NaN],
    ['ay', Number.POSITIVE_INFINITY],
    ['bx', '3'],
    ['by', null],
  ]) {
    const spec = vectorSpec();
    spec.scenarios[0] = { ...spec.scenarios[0], [field]: value };
    assert.match(errorsOf(spec), new RegExp(`scenarios\\[0\\]\\.${field}`), `${field}=${value}`);
  }
});

test('vector-cosine: out-of-bounds and off-disk vectors fail', () => {
  const far = vectorSpec();
  far.scenarios[0] = { id: 'oblique', ax: 6, ay: 6, bx: 1, by: 2 };
  assert.match(errorsOf(far), /leaves the bound disk/);
  const over = vectorSpec();
  over.scenarios[0] = { id: 'oblique', ax: 6.5, ay: 0, bx: 1, by: 2 };
  assert.match(errorsOf(over), /expected a number in \[-6, 6\]/);
});

test('vector-cosine: preset semantics are enforced, presets are required', () => {
  const wrongParallel = vectorSpec();
  wrongParallel.scenarios[1] = { id: 'parallel', ax: 2, ay: 1, bx: -1, by: 2 };
  assert.match(errorsOf(wrongParallel), /"parallel" preset must use two non-zero vectors/);

  const wrongZero = vectorSpec();
  wrongZero.scenarios[4] = { id: 'zero', ax: 2, ay: 1, bx: 3, by: 1 };
  assert.match(errorsOf(wrongZero), /"zero" preset must contain the zero vector/);

  const missing = vectorSpec();
  missing.scenarios = missing.scenarios.filter((s) => s.id !== 'opposite');
  delete missing.copy.zh.scenarioLabels.opposite;
  delete missing.copy.en.scenarioLabels.opposite;
  assert.match(errorsOf(missing), /missing required preset scenario "opposite"/);

  const zeroViaA = vectorSpec();
  zeroViaA.scenarios[4] = { id: 'zero', ax: 0, ay: 0, bx: 3, by: 1 };
  assert.equal(validateSpec(zeroViaA).ok, true, 'zero on either side counts');
});

test('vector-cosine: closed field vocabulary (unknown keys anywhere fail)', () => {
  const badModel = vectorSpec();
  badModel.model = { ...badModel.model, gravity: 10 };
  assert.match(errorsOf(badModel), /model\.gravity.*unknown field/);

  const badScenario = vectorSpec();
  badScenario.scenarios[0] = { ...badScenario.scenarios[0], z: 0 };
  assert.match(errorsOf(badScenario), /scenarios\[0\]\.z.*unknown field/);

  const badCopy = vectorSpec();
  badCopy.copy.zh = { ...badCopy.copy.zh, extra: 'x' };
  assert.match(errorsOf(badCopy), /copy\.zh\.extra.*unknown field/);

  const badTop = vectorSpec({ extra: 1 });
  assert.match(errorsOf(badTop), /\$\.extra.*unknown field/);

  const badRefs = vectorSpec();
  badRefs.sourceRefs[0] = { url: 'https://x.example/', title: 't', note: 'n' };
  assert.match(errorsOf(badRefs), /sourceRefs\[0\]\.note.*unknown field/);
});

test('vector-cosine: model constraints (gridStep divides bound, angleStep bounds)', () => {
  const badStep = vectorSpec({ model: { bound: 6, gridStep: 0.7, angleStep: 15 } });
  assert.match(errorsOf(badStep), /must divide bound/);
  const okStep = vectorSpec({ model: { bound: 6, gridStep: 0.3, angleStep: 15 } });
  assert.equal(validateSpec(okStep).ok, true, 'decimal steps that divide the bound are fine');
  const badAngle = vectorSpec({ model: { bound: 6, gridStep: 0.25, angleStep: 0 } });
  assert.match(errorsOf(badAngle), /angleStep.*integer in \[1, 90\]/);
  const badBound = vectorSpec({ model: { bound: 2.5, gridStep: 0.25, angleStep: 15 } });
  assert.match(errorsOf(badBound), /bound.*finite integer/);
});

test('flow-bottleneck: integer model fields reject decimals, negatives and overflow', () => {
  const badDemand = flowSpec({ model: { demand: 2.5, capacityMax: 12, maxTicks: 16 } });
  assert.match(errorsOf(badDemand), /demand.*finite integer/);
  const badTicks = flowSpec({ model: { demand: 6, capacityMax: 12, maxTicks: 1000 } });
  assert.match(errorsOf(badTicks), /maxTicks.*integer in \[2, 40\]/);
  const badCap = flowSpec();
  badCap.scenarios[0].capacity.generate = 13;
  assert.match(errorsOf(badCap), /scenarios\[0\]\.capacity\.generate/);
  const badInitial = flowSpec();
  badInitial.scenarios[0].initial.review = 21;
  assert.match(errorsOf(badInitial), /scenarios\[0\]\.initial\.review/);
  const badShape = flowSpec();
  badShape.scenarios[0].capacity = { generate: 1 };
  assert.match(errorsOf(badShape), /scenarios\[0\]\.capacity\.(review|delivery)|scenarios\[0\]\.capacity/);
});

test('both kinds: missing translations and incomplete copy maps fail', () => {
  const noEn = vectorSpec();
  delete noEn.copy.en;
  assert.match(errorsOf(noEn), /copy\.en/);
  const missingLabel = flowSpec();
  delete missingLabel.copy.zh.metrics.throughput;
  assert.match(errorsOf(missingLabel), /copy\.zh\.metrics\.throughput/);
  const missingScenarioLabel = flowSpec();
  delete missingScenarioLabel.copy.en.scenarioLabels.balanced;
  assert.match(errorsOf(missingScenarioLabel), /scenarioLabels\.balanced/);
  const missingExplanation = flowSpec();
  delete missingExplanation.copy.zh.explanations.delivery;
  assert.match(errorsOf(missingExplanation), /explanations\.delivery/);
});

test('both kinds: bad source URLs and hostile/empty text fail', () => {
  for (const kind of ['vector-cosine', 'flow-bottleneck']) {
    const spec = kind === 'vector-cosine' ? vectorSpec() : flowSpec();
    spec.sourceRefs = [{ url: 'javascript:alert(1)', title: 'x' }];
    assert.match(errorsOf(spec), /sourceRefs\[0\]\.url/);

    const slash = kind === 'vector-cosine' ? vectorSpec() : flowSpec();
    slash.sourceRefs = [{ url: '//evil.example/', title: 'x' }];
    assert.match(errorsOf(slash), /sourceRefs\[0\]\.url/);

    const empty = kind === 'vector-cosine' ? vectorSpec() : flowSpec();
    empty.copy.zh.title = '   ';
    assert.match(errorsOf(empty), /copy\.zh\.title/);

    const control = kind === 'vector-cosine' ? vectorSpec() : flowSpec();
    control.copy.en.question = 'bad\u0007text';
    assert.match(errorsOf(control), /control characters/);
  }
});

test('cross-references: defaultScenario must match a scenario id', () => {
  const missingDefault = vectorSpec({ defaultScenario: 'nope' });
  assert.match(errorsOf(missingDefault), /does not match any scenario id/);
  const duplicate = flowSpec();
  duplicate.scenarios[1] = { ...duplicate.scenarios[0], id: 'review-bound' };
  assert.match(errorsOf(duplicate), /duplicate scenario id/);
});

test('null / non-object members fail with field errors, never throw', () => {
  for (const spec of [
    { ...vectorSpec(), scenarios: null },
    { ...vectorSpec(), scenarios: [null] },
    { ...vectorSpec(), model: null },
    { ...vectorSpec(), copy: null },
    { ...vectorSpec(), copy: { zh: null, en: {} } },
    { ...flowSpec(), scenarios: [{ id: 'x', capacity: null, initial: null }] },
    { ...flowSpec(), sourceRefs: [null] },
    null,
    42,
    'string',
  ]) {
    const { ok, errors } = validateSpec(spec, { file: 'hostile' });
    assert.equal(ok, false);
    assert.ok(errors.length > 0);
    assert.ok(formatErrors(errors).length > 0);
  }
});
