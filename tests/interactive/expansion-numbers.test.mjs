/**
 * expansion-numbers.test.mjs — pure-model edge, invariant and corrupt-spec
 * tests for the three numerical explainer groups (reliability-chain,
 * task-cost, notification-threshold). No DOM, no Hugo, no network: the same
 * functions the runtime calls are pinned here, including the integer-scaled
 * exactness rules and the strict data contract each kind's validator
 * enforces through spec-schema.validateSpec.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clampPermille as clampChainPermille,
  computeChain,
  curvePoints,
  curveSamples,
  explainKey,
  formatExpression,
  formatFraction,
  formatNumber,
  formatP,
  formatPermille as formatChainPermille,
  formatPlan,
  formatRate,
  onePass,
  segmentPlan,
  segmentSuccess,
  validateReliabilityChain,
} from '../../assets/js/components/reliability-chain-model.mjs';
import {
  ROUTES,
  barScale,
  barWidths,
  compareRoutes,
  computeRoute,
  formatAmount,
  formatPerAccepted,
  validateTaskCost,
} from '../../assets/js/components/task-cost-model.mjs';
import {
  SAMPLED_PROBS,
  clampPermille as clampDecisionPermille,
  computeDecision,
  expectedMilli,
  formatE,
  formatPermille as formatDecisionPermille,
  formatThreshold,
  formatThresholdExpression,
  validateNotificationThreshold,
} from '../../assets/js/components/notification-threshold-model.mjs';
import { formatErrors, validateSpec } from '../../assets/js/components/spec-schema.mjs';

/* ── shared spec factories (minimal valid specs, mutated per test) ─────── */

const SHARED_COPY = {
  figureLabel: 'Interactive figure',
  title: 'Title',
  question: 'Question?',
  assumption: 'Assumption.',
  observe: 'Observe.',
  footerNote: 'Note.',
  referenceTitle: 'Reference',
};

function reliabilitySpec(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'reliability-chain',
    id: 'reliability-chain-v1',
    defaultScenario: 'twenty-steps',
    model: { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 },
    scenarios: [
      { id: 'twenty-steps', stepPermille: 950, steps: 20, recallPermille: 1000 },
      { id: 'partial-recall', stepPermille: 950, steps: 20, recallPermille: 500 },
    ],
    copy: {
      zh: reliabilityCopy(['twenty-steps', 'partial-recall']),
      en: reliabilityCopy(['twenty-steps', 'partial-recall']),
    },
    sourceRefs: [{ url: 'https://example.com/a', title: 'Source A' }],
    ...overrides,
  };
}

function reliabilityCopy(ids) {
  return {
    ...SHARED_COPY,
    scenarioLabels: Object.fromEntries(ids.map((id) => [id, `Label ${id}`])),
    stepLabel: 'Per-step success',
    stepsLabel: 'Required steps',
    recallLabel: 'Checkpoint recall r',
    resultLabels: {
      plain: 'Clean-run rate p^n',
      checkpoint: 'Checkpoint total',
      segment: 'Segment rate',
      attempts: 'Expected attempts',
      segments: 'Segments',
    },
    curveLabels: { x: 'Steps', y: 'Rate', alt: 'Curve alt text.' },
    table: { scenario: 'Scenario', stepRate: 'Per step', steps: 'Steps', plain: 'p^n', checkpoint: 'Checkpoints' },
    curveTable: { steps: 'Steps', result: 'Rate' },
    checkpoint: { summary: 'Checkpoint mode', note: 'Assumptions.' },
    explanations: { steep: 'Steep.', moderate: 'Moderate.', mild: 'Mild.' },
  };
}

function taskCostSpec(overrides = {}) {
  const ids = ['cheap-raw', 'zero-accepted'];
  return {
    schemaVersion: 1,
    kind: 'task-cost',
    id: 'task-cost-v1',
    defaultScenario: 'cheap-raw',
    model: { batchSize: 50 },
    scenarios: [
      {
        id: 'cheap-raw',
        a: { modelToolCost: 240, retryCost: 30, reviewMinutes: 300, hourlyRate: 60, accepted: 45 },
        b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 35 },
      },
      {
        id: 'zero-accepted',
        a: { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 },
        b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 0 },
      },
    ],
    copy: {
      zh: taskCostCopy(ids),
      en: taskCostCopy(ids),
    },
    sourceRefs: [{ url: 'https://example.com/b', title: 'Source B' }],
    ...overrides,
  };
}

function taskCostCopy(ids) {
  return {
    ...SHARED_COPY,
    scenarioLabels: Object.fromEntries(ids.map((id) => [id, `Label ${id}`])),
    unitLabel: '$ (illustrative)',
    batchLabel: 'Tasks per batch (fixed)',
    scaleLabel: 'Shared scale.',
    routes: { a: 'Route A', b: 'Route B' },
    inputLabels: {
      modelToolCost: 'Model/tool cost',
      retryCost: 'Retry cost',
      reviewMinutes: 'Review minutes',
      hourlyRate: 'Hourly cost',
      accepted: 'Accepted tasks',
    },
    costLabels: { modelTool: 'Model/tool', retry: 'Retry', review: 'Review', total: 'Total', perAccepted: 'Per accepted' },
    table: { scenario: 'Scenario', route: 'Route', breakdown: 'Breakdown', total: 'Total', perAccepted: 'Per accepted' },
    explanations: {
      'a-lower': 'A lower.',
      'b-lower': 'B lower.',
      equal: 'Equal.',
      undefined: 'Undefined.',
    },
  };
}

function notificationSpec(overrides = {}) {
  const ids = ['deep-work', 'zero-zero'];
  return {
    schemaVersion: 1,
    kind: 'notification-threshold',
    id: 'notification-threshold-v1',
    defaultScenario: 'deep-work',
    model: { probStep: 5, gainMax: 100, costMax: 100 },
    scenarios: [
      { id: 'deep-work', gain: 20, cost: 40, probPermille: 500 },
      { id: 'zero-zero', gain: 0, cost: 0, probPermille: 500 },
    ],
    copy: {
      zh: notificationCopy(ids),
      en: notificationCopy(ids),
    },
    sourceRefs: [{ url: 'https://example.com/c', title: 'Source C' }],
    ...overrides,
  };
}

function notificationCopy(ids) {
  return {
    ...SHARED_COPY,
    scenarioLabels: Object.fromEntries(ids.map((id) => [id, `Label ${id}`])),
    gainLabel: 'Gain G',
    costLabel: 'Cost C',
    probLabel: 'Usefulness p',
    resultLabels: { threshold: 'Threshold', expected: 'E', verdict: 'Advice', undefined: 'Undefined' },
    axisLabels: { threshold: 'Threshold', current: 'Current p', alt: 'Axis alt text.' },
    table: { scenario: 'Scenario', gain: 'G', cost: 'C', threshold: 'Threshold', prob: 'p', expected: 'E', verdict: 'Advice' },
    sampleTitle: 'Sampled values',
    verdicts: { notify: 'Speak up', silent: 'Stay quiet', equal: 'Break-even', 'no-preference': 'No preference' },
    explanations: {
      notify: 'Notify.',
      silent: 'Silent.',
      equal: 'Equal.',
      'no-preference': 'No preference.',
    },
  };
}

function assertValid(spec, label) {
  const { ok, errors } = validateSpec(spec, { file: label });
  assert.equal(ok, true, formatErrors(errors));
}

function assertInvalid(spec, pattern, label) {
  const { ok, errors } = validateSpec(spec, { file: label });
  assert.equal(ok, false, `${label}: expected invalid spec`);
  assert.ok(
    errors.some((e) => pattern.test(`${e.field}: ${e.message}`)),
    `${label}: expected an error matching ${pattern}, got:\n${formatErrors(errors)}`
  );
}

/* ── reliability-chain: formulas and edge cases ────────────────────────── */

test('reliability-chain: exact default is 0.95^20', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  const r = computeChain(model, { stepPermille: 950, steps: 20, recallPermille: 1000 });
  assert.equal(r.plain, Math.pow(0.95, 20));
  assert.equal(formatExpression(950, 20, r.plain), '0.95^20 = 0.3585 (35.85%)');
  assert.equal(formatRate(r.plain), '35.85%');
});

test('reliability-chain: p = 0 and p = 1 extremes are finite', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  for (const steps of [1, 5, 100]) {
    const zero = computeChain(model, { stepPermille: 0, steps, recallPermille: 1000 });
    assert.equal(zero.plain, 0);
    assert.equal(zero.checkpoint, 0);
    const full = computeChain(model, { stepPermille: 1000, steps, recallPermille: 1000 });
    assert.equal(full.plain, 1);
    assert.equal(full.checkpoint, 1);
    assert.equal(full.attempts, full.plan.length);
    for (const r of [zero, full]) {
      assert.ok(Number.isFinite(r.checkpoint) && Number.isFinite(r.attempts));
    }
  }
});

test('reliability-chain: n bounds clamp and never divide by zero', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  assert.equal(computeChain(model, { stepPermille: 950, steps: -5, recallPermille: 1000 }).steps, 1);
  assert.equal(computeChain(model, { stepPermille: 950, steps: 0, recallPermille: 1000 }).steps, 1);
  assert.equal(computeChain(model, { stepPermille: 950, steps: 100, recallPermille: 1000 }).steps, 100);
  assert.equal(computeChain(model, { stepPermille: 950, steps: 1000, recallPermille: 1000 }).steps, 100);
  assert.equal(computeChain(model, { stepPermille: 950, steps: Number.NaN, recallPermille: 1000 }).steps, 1);
  // Degenerate k = 1 segment plan: one segment per step.
  assert.deepEqual(segmentPlan(3, 1), [1, 1, 1]);
  assert.deepEqual(segmentPlan(3, 10), [3]);
});

test('reliability-chain: segment plan includes the short final segment', () => {
  assert.deepEqual(segmentPlan(20, 5), [5, 5, 5, 5]);
  assert.deepEqual(segmentPlan(12, 5), [5, 5, 2]);
  assert.deepEqual(segmentPlan(1, 5), [1]);
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  const r = computeChain(model, { stepPermille: 950, steps: 12, recallPermille: 1000 });
  assert.deepEqual(r.plan, [5, 5, 2]);
  // Full product over ALL segments including the short final one.
  const expected =
    segmentSuccess(onePass(5, 950), 1000) *
    segmentSuccess(onePass(5, 950), 1000) *
    segmentSuccess(onePass(2, 950), 1000);
  assert.ok(Math.abs(r.checkpoint - expected) < 1e-12);
});

test('reliability-chain: r = 0 collapses the checkpoint mode to plain p^n', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  for (const stepPermille of [0, 335, 950, 1000]) {
    for (const steps of [1, 7, 20, 33]) {
      const r = computeChain(model, { stepPermille, steps, recallPermille: 0 });
      assert.ok(
        Math.abs(r.checkpoint - r.plain) < 1e-12,
        `p=${stepPermille} n=${steps}: ${r.checkpoint} vs ${r.plain}`
      );
      assert.equal(r.attempts, r.plan.length);
    }
  }
});

test('reliability-chain: r = 1 gives one-retry segment success 1-(1-q)^2', () => {
  const q = onePass(5, 950);
  assert.ok(Math.abs(segmentSuccess(q, 1000) - (1 - (1 - q) * (1 - q))) < 1e-15);
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  const r = computeChain(model, { stepPermille: 950, steps: 20, recallPermille: 1000 });
  // The documented default checkpoint result for 0.95^20 in four segments.
  assert.equal(formatRate(r.checkpoint), '81.05%');
  assert.equal(formatRate(r.segments[0].success), '94.88%');
  assert.equal(formatPlan(r.plan), '5 / 5 / 5 / 5');
});

test('reliability-chain: attempts stay within [segments, 2×segments]', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  for (const recallPermille of [0, 250, 500, 1000]) {
    for (const steps of [1, 9, 20, 51]) {
      const r = computeChain(model, { stepPermille: 815, steps, recallPermille });
      assert.ok(r.attempts >= r.plan.length && r.attempts <= 2 * r.plan.length, JSON.stringify(r));
    }
  }
});

test('reliability-chain: monotone in n and p; checkpoint never below plain', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  let prev = Infinity;
  for (const steps of [1, 2, 5, 10, 20, 50, 100]) {
    const r = computeChain(model, { stepPermille: 950, steps, recallPermille: 500 });
    assert.ok(r.plain <= prev, `plain must not grow with n (n=${steps})`);
    assert.ok(r.checkpoint >= r.plain - 1e-15, 'retries never reduce the success rate');
    assert.ok(r.checkpoint <= 1 && r.plain >= 0);
    prev = r.plain;
  }
  let prevP = -1;
  for (const stepPermille of [0, 250, 500, 750, 950, 1000]) {
    const r = computeChain(model, { stepPermille, steps: 20, recallPermille: 500 });
    assert.ok(r.plain >= prevP, `plain must not fall with p (p=${stepPermille})`);
    prevP = r.plain;
  }
});

test('reliability-chain: permille snapping and formatters', () => {
  assert.equal(clampChainPermille(667, 5), 665);
  assert.equal(clampChainPermille(-10, 5), 0);
  assert.equal(clampChainPermille(5000, 5), 1000);
  assert.equal(clampChainPermille(Number.NaN, 5), 0);
  assert.equal(clampChainPermille(333, 0), 333); // degenerate step → identity clamp
  assert.equal(formatChainPermille(950), '95%');
  assert.equal(formatChainPermille(995), '99.5%');
  assert.equal(formatChainPermille(0), '0%');
  assert.equal(formatChainPermille(1000), '100%');
  assert.equal(formatP(950), '0.95');
  assert.equal(formatP(995), '0.995');
  assert.equal(formatP(0), '0');
  assert.equal(formatP(1000), '1');
  assert.equal(formatFraction(Math.pow(0.95, 20)), '0.3585');
  assert.equal(formatFraction(1), '1.0000');
  assert.equal(formatRate(0.95), '95%'); // trailing zeros trimmed
  assert.equal(formatRate(1), '100%');
  assert.equal(formatRate(0), '0%');
  assert.equal(formatRate(Number.NaN), '—');
  assert.equal(formatNumber(4.9, 2), '4.9');
  assert.equal(formatNumber(0.125, 2), '0.13'); // exact half → round half up in every runtime
});

test('reliability-chain: non-divisor step grids clamp to the aligned maximum', () => {
  // A step that does not divide 1000 must never snap ABOVE the range and
  // then fall back onto an off-grid 1000.
  assert.equal(clampChainPermille(1000, 600), 600); // floor(1000/600)*600
  assert.equal(clampChainPermille(1000, 7), 994); // floor(1000/7)*7
  assert.equal(clampChainPermille(1000, 3), 999); // floor(1000/3)*3
  assert.equal(clampChainPermille(1001, 600), 600);
  assert.equal(clampChainPermille(900, 600), 600); // nearest grid point
  assert.equal(clampChainPermille(299, 600), 0);
  for (const step of [1, 3, 7, 600, 999, 1000]) {
    const maxAligned = Math.floor(1000 / step) * step;
    for (const value of [0, 1, 299, 333, 667, 900, 994, 999, 1000, 1001]) {
      const out = clampChainPermille(value, step);
      assert.equal(out % step, 0, `off-grid: step ${step} value ${value} → ${out}`);
      assert.ok(out >= 0 && out <= maxAligned, `out of range: step ${step} value ${value} → ${out}`);
    }
  }
  // computeChain snaps both probabilities through the same grid.
  const r = computeChain(
    { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 600 },
    { stepPermille: 1000, steps: 20, recallPermille: 1000 }
  );
  assert.equal(r.stepPermille, 600);
  assert.equal(r.recallPermille, 600);
});

test('reliability-chain: attempts proxy schedules ALL segments (not fail-fast)', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 1, probStep: 5 };
  const r = computeChain(model, { stepPermille: 500, steps: 2, recallPermille: 1000 });
  // Planning proxy: BOTH segments are always scheduled →
  // 2 × (1 + (1−0.5)×1) = 3, even when the first segment already failed.
  assert.equal(r.attempts, 3);
  // Fail-fast execution would expect 1.5 + 0.75×1.5 = 2.625 attempts — the
  // proxy deliberately is not that (stated in label, assumption and docs).
  const failFast = 1 + (1 - 0.5) * 1 + 0.75 * (1 + (1 - 0.5) * 1);
  assert.ok(Math.abs(failFast - 2.625) < 1e-12);
  assert.ok(r.attempts > failFast);
});

test('reliability-chain: explanation bands are pure result ranges at p=0/1 and any n', () => {
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  // p = 1 over a long chain stays "mild" (nothing deteriorates later);
  // a SINGLE step at p = 0 is "steep"; the bands never compare the result
  // to the step accuracy or to future step counts.
  assert.equal(explainKey(computeChain(model, { stepPermille: 1000, steps: 100, recallPermille: 1000 }).plain), 'mild');
  assert.equal(explainKey(computeChain(model, { stepPermille: 0, steps: 1, recallPermille: 1000 }).plain), 'steep');
  assert.equal(explainKey(computeChain(model, { stepPermille: 500, steps: 1, recallPermille: 1000 }).plain), 'moderate');
  assert.equal(explainKey(computeChain(model, { stepPermille: 950, steps: 1, recallPermille: 1000 }).plain), 'mild');
});

test('reliability-chain: curve samples are integer step counts for a non-divisible span', () => {
  // span 99 is not divisible by 4 — sample indices must floor like Hugo's
  // integer division so SSR and JS agree on whole step counts.
  const model = { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5 };
  const ns = curveSamples(model, 950).map((s) => s.steps);
  assert.deepEqual(ns, [1, 25, 50, 75, 100]);
  assert.ok(ns.every((n) => Number.isInteger(n)));
  for (const spanMax of [2, 5, 33, 77, 130, 200]) {
    const samples = curveSamples({ ...model, stepsMax: spanMax }, 950).map((s) => s.steps);
    assert.ok(samples.every((n) => Number.isInteger(n)), `fractional sample for span ${spanMax}`);
    assert.equal(samples[0], 1);
    assert.equal(samples[4], spanMax);
  }
});

test('reliability-chain: explainKey bands and curve samples/points', () => {
  assert.equal(explainKey(0.49), 'steep');
  assert.equal(explainKey(0.5), 'moderate');
  assert.equal(explainKey(0.89), 'moderate');
  assert.equal(explainKey(0.9), 'mild');
  assert.equal(explainKey(Number.NaN), 'steep');
  const model = { stepsMin: 4, stepsMax: 40, stepsPerSegment: 5, probStep: 5 };
  const samples = curveSamples(model, 950);
  assert.equal(samples.length, 5);
  assert.deepEqual(samples.map((s) => s.steps), [4, 13, 22, 31, 40]);
  for (const s of samples) {
    assert.ok(Math.abs(s.value - Math.pow(0.95, s.steps)) < 1e-15);
  }
  const points = curvePoints(950, 4, 40, 16);
  assert.equal(points.length, 16);
  assert.equal(points[0].steps, 4);
  assert.equal(points[points.length - 1].steps, 40);
});

/* ── reliability-chain: strict schema ──────────────────────────────────── */

test('reliability-chain: the minimal spec is schema-valid', () => {
  assertValid(reliabilitySpec(), 'reliability-ok');
});

test('reliability-chain: corrupt specs fail with field errors', () => {
  assertInvalid(
    reliabilitySpec({ model: { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 0 } }),
    /probStep/,
    'probStep zero'
  );
  assertInvalid(
    reliabilitySpec({ model: { stepsMin: 1, stepsMax: 100, stepsPerSegment: 5, probStep: 5, extra: 1 } }),
    /unknown field/,
    'unknown model key'
  );
  assertInvalid(
    reliabilitySpec({ model: { stepsMin: 50, stepsMax: 10, stepsPerSegment: 5, probStep: 5 } }),
    /stepsMax/,
    'stepsMax <= stepsMin'
  );
  assertInvalid(
    reliabilitySpec({
      defaultScenario: 'missing',
      scenarios: [{ id: 'twenty-steps', stepPermille: 950, steps: 20, recallPermille: 1000 }],
      copy: { zh: reliabilityCopy(['twenty-steps']), en: reliabilityCopy(['twenty-steps']) },
    }),
    /defaultScenario/,
    'defaultScenario cross-reference'
  );
  assertInvalid(
    reliabilitySpec({
      scenarios: [
        { id: 'twenty-steps', stepPermille: 952, steps: 20, recallPermille: 1000 },
        { id: 'partial-recall', stepPermille: 950, steps: 20, recallPermille: 500 },
      ],
    }),
    /probStep/,
    'misaligned stepPermille'
  );
  assertInvalid(
    reliabilitySpec({
      scenarios: [
        { id: 'twenty-steps', stepPermille: 950, steps: 20, recallPermille: 1001 },
        { id: 'partial-recall', stepPermille: 950, steps: 20, recallPermille: 500 },
      ],
    }),
    /recallPermille/,
    'recall above 1000'
  );
  assertInvalid(
    reliabilitySpec({
      scenarios: [
        { id: 'twenty-steps', stepPermille: 950, steps: 250, recallPermille: 1000 },
        { id: 'partial-recall', stepPermille: 950, steps: 20, recallPermille: 500 },
      ],
    }),
    /steps/,
    'steps above model bound'
  );
  assertInvalid(
    reliabilitySpec({
      scenarios: [
        { id: 'twenty-steps', stepPermille: 95.5, steps: 20, recallPermille: 1000 },
        { id: 'partial-recall', stepPermille: 950, steps: 20, recallPermille: 500 },
      ],
    }),
    /finite integer/,
    'decimal permille'
  );
  assertInvalid(
    reliabilitySpec({
      scenarios: [
        { id: 'twenty-steps', stepPermille: 950, steps: 20, recallPermille: 1000 },
        { id: 'twenty-steps', stepPermille: 950, steps: 10, recallPermille: 500 },
      ],
    }),
    /duplicate scenario id/,
    'duplicate scenario id'
  );
  assertInvalid(
    reliabilitySpec({
      copy: { zh: reliabilityCopy(['twenty-steps']), en: reliabilityCopy(['twenty-steps']) },
    }),
    /scenarioLabels/,
    'scenarioLabels must cover exactly the scenario ids'
  );
  assertInvalid(
    reliabilitySpec({
      copy: {
        zh: { ...reliabilityCopy(['twenty-steps', 'partial-recall']), extra: 'x' },
        en: reliabilityCopy(['twenty-steps', 'partial-recall']),
      },
    }),
    /unknown field/,
    'unknown copy field'
  );
  assertInvalid(
    reliabilitySpec({ sourceRefs: [{ url: 'javascript:alert(1)', title: 'Bad' }] }),
    /URL/,
    'javascript: source URL'
  );
  assertInvalid(reliabilitySpec({ sourceRefs: [] }), /sourceRefs/, 'empty sourceRefs');
});

/* ── task-cost: formulas and edge cases ────────────────────────────────── */

test('task-cost: review cost is derived and total never double counts retry', () => {
  const batchSize = 50;
  const r = computeRoute(batchSize, {
    modelToolCost: 240,
    retryCost: 30,
    reviewMinutes: 300,
    hourlyRate: 60,
    accepted: 45,
  });
  assert.equal(r.reviewCost, 300); // 300 min * 60/h / 60
  assert.equal(r.total, 570); // 240 + 30 + 300 — retry counted exactly once
  assert.ok(Math.abs(r.perAccepted - 570 / 45) < 1e-12);
  assert.equal(formatAmount(r.reviewCost), '300');
  assert.equal(formatPerAccepted(r), '12.67'); // 12.6666… → 12.67
});

test('task-cost: zero accepted is undefined — not zero and not infinity', () => {
  const r = computeRoute(50, {
    modelToolCost: 40,
    retryCost: 120,
    reviewMinutes: 900,
    hourlyRate: 60,
    accepted: 0,
  });
  assert.equal(r.perAccepted, null);
  assert.equal(formatPerAccepted(r), null);
  assert.ok(Number.isFinite(r.total));
});

test('task-cost: a low raw-call cost loses after human review costs', () => {
  const batchSize = 50;
  const cheapRaw = computeRoute(batchSize, {
    modelToolCost: 40,
    retryCost: 120,
    reviewMinutes: 900,
    hourlyRate: 60,
    accepted: 35,
  });
  const pricier = computeRoute(batchSize, {
    modelToolCost: 240,
    retryCost: 30,
    reviewMinutes: 300,
    hourlyRate: 60,
    accepted: 45,
  });
  assert.ok(cheapRaw.modelToolCost < pricier.modelToolCost);
  assert.ok(cheapRaw.perAccepted > pricier.perAccepted, 'review cost flips the verdict');
  assert.equal(compareRoutes(pricier, cheapRaw), 'a-lower');
  assert.equal(compareRoutes(cheapRaw, pricier), 'b-lower');
  // Remove review: the cheap route wins — same functions, honest flip.
  const cheapNoReview = computeRoute(batchSize, {
    modelToolCost: 40,
    retryCost: 120,
    reviewMinutes: 0,
    hourlyRate: 60,
    accepted: 35,
  });
  const pricierNoReview = computeRoute(batchSize, {
    modelToolCost: 240,
    retryCost: 30,
    reviewMinutes: 0,
    hourlyRate: 60,
    accepted: 45,
  });
  assert.equal(compareRoutes(pricierNoReview, cheapNoReview), 'b-lower');
});

test('task-cost: equal and undefined comparison verdicts', () => {
  const a = computeRoute(50, { modelToolCost: 100, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 10 });
  const b = computeRoute(50, { modelToolCost: 50, retryCost: 50, reviewMinutes: 0, hourlyRate: 60, accepted: 10 });
  assert.equal(compareRoutes(a, b), 'equal');
  const zero = computeRoute(50, { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 });
  assert.equal(compareRoutes(a, zero), 'undefined');
  assert.equal(compareRoutes(zero, zero), 'undefined');
});

test('task-cost: shared bar scale is division-safe', () => {
  const empty = computeRoute(50, { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 0, accepted: 0 });
  assert.equal(barScale(empty, empty), 0);
  const widths = barWidths(empty, 0);
  assert.deepEqual(Object.values(widths), [0, 0, 0]);
  const a = computeRoute(50, { modelToolCost: 100, retryCost: 50, reviewMinutes: 60, hourlyRate: 60, accepted: 5 });
  const b = computeRoute(50, { modelToolCost: 30, retryCost: 10, reviewMinutes: 0, hourlyRate: 60, accepted: 5 });
  const scale = barScale(a, b);
  assert.equal(scale, a.total);
  const wa = barWidths(a, scale);
  assert.ok(Math.abs(wa.modelTool + wa.retry + wa.review - 100) < 1e-9);
  assert.ok(barWidths(b, scale).modelTool < 100);
});

test('task-cost: non-finite and out-of-range inputs clamp to finite results', () => {
  const r = computeRoute(50, {
    modelToolCost: Number.NaN,
    retryCost: Number.POSITIVE_INFINITY,
    reviewMinutes: -10,
    hourlyRate: 60,
    accepted: 500, // clamped to batchSize
  });
  for (const key of ['modelToolCost', 'retryCost', 'reviewCost', 'total', 'perAccepted', 'accepted']) {
    assert.ok(Number.isFinite(r[key]), `${key} must stay finite`);
  }
  assert.equal(r.accepted, 50);
  assert.equal(r.modelToolCost, 0);
  assert.equal(r.retryCost, 0);
  assert.equal(r.reviewMinutes, 0);
});

test('task-cost: amount formatting rounds half up on exact halves and trims', () => {
  assert.equal(formatAmount(570), '570');
  assert.equal(formatAmount(6), '6');
  assert.equal(formatAmount(12.6666), '12.67');
  assert.equal(formatAmount(4.571428), '4.57');
  // Rounding follows IEEE-754 double semantics identically in every
  // runtime: an EXACT half rounds up (never banker's rounding), while a
  // binary-inexact decimal like 1.005 rounds from its double value.
  assert.equal(formatAmount(0.125), '0.13');
  assert.equal(formatAmount(0.005), '0.01');
  assert.equal(formatAmount(Number.NaN), '—');
  assert.equal(ROUTES.join(','), 'a,b');
});

/* ── task-cost: strict schema ──────────────────────────────────────────── */

test('task-cost: the minimal spec is schema-valid', () => {
  assertValid(taskCostSpec(), 'task-cost-ok');
});

test('task-cost: corrupt specs fail with field errors', () => {
  assertInvalid(
    taskCostSpec({ model: { batchSize: 0 } }),
    /batchSize/,
    'zero batch'
  );
  assertInvalid(
    taskCostSpec({
      scenarios: [
        {
          id: 'cheap-raw',
          a: { modelToolCost: 240, retryCost: 30, reviewMinutes: 300, hourlyRate: 60, accepted: 45 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 51 },
        },
        {
          id: 'zero-accepted',
          a: { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 0 },
        },
      ],
    }),
    /accepted/,
    'accepted above the fixed batch size'
  );
  assertInvalid(
    taskCostSpec({
      scenarios: [
        {
          id: 'cheap-raw',
          a: { modelToolCost: -1, retryCost: 30, reviewMinutes: 300, hourlyRate: 60, accepted: 45 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 35 },
        },
        {
          id: 'zero-accepted',
          a: { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 0 },
        },
      ],
    }),
    /modelToolCost/,
    'negative cost'
  );
  assertInvalid(
    taskCostSpec({
      scenarios: [
        {
          id: 'cheap-raw',
          a: { modelToolCost: 12.5, retryCost: 30, reviewMinutes: 300, hourlyRate: 60, accepted: 45 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 35 },
        },
        {
          id: 'zero-accepted',
          a: { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 0 },
        },
      ],
    }),
    /finite integer/,
    'decimal cost'
  );
  assertInvalid(
    taskCostSpec({
      scenarios: [
        {
          id: 'cheap-raw',
          a: { modelToolCost: 240, retryCost: 30, reviewMinutes: 300, hourlyRate: 60, accepted: 45 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 35, tokenVolume: 5000 },
        },
        {
          id: 'zero-accepted',
          a: { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 0 },
        },
      ],
    }),
    /unknown field/,
    'unknown route field (raw volume is not a cost input)'
  );
  assertInvalid(
    taskCostSpec({
      scenarios: [
        {
          id: 'cheap-raw',
          a: { modelToolCost: 240, retryCost: 30, reviewMinutes: 300, hourlyRate: 60, accepted: 45 },
          b: null,
        },
        {
          id: 'zero-accepted',
          a: { modelToolCost: 0, retryCost: 0, reviewMinutes: 0, hourlyRate: 60, accepted: 0 },
          b: { modelToolCost: 40, retryCost: 120, reviewMinutes: 900, hourlyRate: 60, accepted: 0 },
        },
      ],
    }),
    /route object/,
    'null route'
  );
  assertInvalid(
    taskCostSpec({
      copy: {
        zh: { ...taskCostCopy(['cheap-raw', 'zero-accepted']), costLabels: { modelTool: 'x' } },
        en: taskCostCopy(['cheap-raw', 'zero-accepted']),
      },
    }),
    /costLabels/,
    'incomplete costLabels'
  );
});

/* ── notification-threshold: formulas and edge cases ───────────────────── */

test('notification-threshold: G=20, C=40 gives threshold 2/3 and E=-10 at p=50%', () => {
  const model = { probStep: 5, gainMax: 100, costMax: 100 };
  const d = computeDecision(model, { gain: 20, cost: 40, probPermille: 500 });
  assert.ok(Math.abs(d.threshold - 2 / 3) < 1e-12);
  assert.equal(d.eMilli, -10000); // exact integer milli-units, no float drift
  assert.equal(formatE(d.eMilli), '-10');
  assert.equal(d.verdict, 'silent');
  assert.equal(formatThreshold(d.threshold), '66.67%');
  assert.equal(formatThresholdExpression(20, 40), '40/60 = 66.67%');
});

test('notification-threshold: crossing the threshold flips the advice', () => {
  const model = { probStep: 5, gainMax: 100, costMax: 100 };
  assert.equal(computeDecision(model, { gain: 20, cost: 40, probPermille: 665 }).verdict, 'silent');
  assert.equal(computeDecision(model, { gain: 20, cost: 40, probPermille: 670 }).verdict, 'notify');
  // The break-even p is exactly the threshold whenever it is reachable.
  const d = computeDecision(model, { gain: 10, cost: 15, probPermille: 600 });
  assert.equal(d.eMilli, 0);
  assert.equal(d.verdict, 'equal');
  assert.ok(Math.abs(d.threshold - 0.6) < 1e-12);
  const d2 = computeDecision(model, { gain: 30, cost: 20, probPermille: 400 });
  assert.equal(d2.eMilli, 0);
  assert.equal(d2.verdict, 'equal');
});

test('notification-threshold: both zero is no-preference with an undefined threshold', () => {
  const model = { probStep: 5, gainMax: 100, costMax: 100 };
  for (const probPermille of [0, 500, 1000]) {
    const d = computeDecision(model, { gain: 0, cost: 0, probPermille });
    assert.equal(d.eMilli, 0);
    assert.equal(d.threshold, null);
    assert.equal(d.verdict, 'no-preference');
    assert.equal(formatThreshold(d.threshold), null);
    assert.equal(formatThresholdExpression(0, 0), null);
  }
});

test('notification-threshold: single-zero G or C stays finite and sane', () => {
  const model = { probStep: 5, gainMax: 100, costMax: 100 };
  const gainZero = computeDecision(model, { gain: 0, cost: 40, probPermille: 500 });
  assert.equal(gainZero.threshold, 1);
  assert.equal(gainZero.verdict, 'silent');
  const costZero = computeDecision(model, { gain: 20, cost: 0, probPermille: 500 });
  assert.equal(costZero.threshold, 0);
  assert.equal(costZero.verdict, 'notify');
  // p = 1 with G = 0 breaks even (never worse to speak) — E = 0 exactly.
  assert.equal(computeDecision(model, { gain: 0, cost: 40, probPermille: 1000 }).verdict, 'equal');
  assert.equal(computeDecision(model, { gain: 20, cost: 40, probPermille: 0 }).eMilli, -40000);
  assert.equal(computeDecision(model, { gain: 20, cost: 40, probPermille: 1000 }).eMilli, 20000);
});

test('notification-threshold: E formatting is exact integer milli-units', () => {
  assert.equal(formatE(0), '0');
  assert.equal(formatE(-10000), '-10');
  assert.equal(formatE(25), '0.025');
  assert.equal(formatE(-25), '-0.025');
  assert.equal(formatE(123456), '123.456');
  assert.equal(formatE(-1), '-0.001');
  assert.equal(formatE(Number.NaN), '—');
  assert.equal(formatDecisionPermille(665), '66.5%');
  assert.equal(formatDecisionPermille(500), '50%');
});

test('notification-threshold: probability snapping aligns to probStep', () => {
  assert.equal(clampDecisionPermille(667, 5), 665);
  assert.equal(clampDecisionPermille(668, 5), 670);
  assert.equal(clampDecisionPermille(600, 5), 600);
  assert.equal(clampDecisionPermille(-1, 5), 0);
  assert.equal(clampDecisionPermille(1001, 5), 1000);
  // Non-divisor steps clamp to the aligned maximum floor(1000/step)*step,
  // never to an off-grid 1000.
  assert.equal(clampDecisionPermille(1000, 600), 600);
  assert.equal(clampDecisionPermille(1000, 7), 994);
  assert.equal(clampDecisionPermille(1000, 3), 999);
  for (const step of [1, 3, 7, 600, 999, 1000]) {
    const maxAligned = Math.floor(1000 / step) * step;
    for (const value of [0, 500, 999, 1000]) {
      const out = clampDecisionPermille(value, step);
      assert.equal(out % step, 0, `off-grid: step ${step} value ${value} → ${out}`);
      assert.ok(out >= 0 && out <= maxAligned);
    }
  }
  const model = { probStep: 5, gainMax: 100, costMax: 100 };
  const d = computeDecision(model, { gain: 20, cost: 40, probPermille: 667 });
  assert.equal(d.probPermille, 665);
  assert.ok(Number.isFinite(d.eMilli));
});

test('notification-threshold: sampled probabilities stay meaningful', () => {
  assert.deepEqual(SAMPLED_PROBS, [0, 250, 500, 750, 1000]);
  for (const p of SAMPLED_PROBS) {
    const e = expectedMilli(20, 40, p);
    assert.equal(typeof e, 'number');
    assert.ok(Number.isFinite(e));
  }
  assert.equal(expectedMilli(20, 40, 500), -10000);
  assert.equal(expectedMilli(20, 40, 1000), 20000);
  assert.equal(expectedMilli(20, 40, 0), -40000);
});

/* ── notification-threshold: strict schema ─────────────────────────────── */

test('notification-threshold: the minimal spec is schema-valid', () => {
  assertValid(notificationSpec(), 'notification-ok');
});

test('notification-threshold: corrupt specs fail with field fields', () => {
  assertInvalid(
    notificationSpec({ model: { probStep: 0, gainMax: 100, costMax: 100 } }),
    /probStep/,
    'probStep zero'
  );
  assertInvalid(
    notificationSpec({ model: { probStep: 5, gainMax: 0, costMax: 100 } }),
    /gainMax/,
    'gainMax zero'
  );
  assertInvalid(
    notificationSpec({
      scenarios: [
        { id: 'deep-work', gain: 20, cost: 40, probPermille: 503 },
        { id: 'zero-zero', gain: 0, cost: 0, probPermille: 500 },
      ],
    }),
    /probStep/,
    'misaligned probability'
  );
  assertInvalid(
    notificationSpec({
      scenarios: [
        { id: 'deep-work', gain: 200, cost: 40, probPermille: 500 },
        { id: 'zero-zero', gain: 0, cost: 0, probPermille: 500 },
      ],
    }),
    /gainMax/,
    'gain above model.gainMax'
  );
  assertInvalid(
    notificationSpec({
      scenarios: [
        { id: 'deep-work', gain: 20, cost: 40, probPermille: 500 },
        { id: 'zero-zero', gain: 0, cost: 0, probPermille: 500, confidence: 0.9 },
      ],
    }),
    /unknown field/,
    'model self-confidence is not a field'
  );
  assertInvalid(
    notificationSpec({
      copy: {
        zh: { ...notificationCopy(['deep-work', 'zero-zero']), verdicts: { notify: 'x' } },
        en: notificationCopy(['deep-work', 'zero-zero']),
      },
    }),
    /verdicts/,
    'incomplete verdicts'
  );
  assertInvalid(
    notificationSpec({
      copy: {
        zh: notificationCopy(['deep-work', 'zero-zero']),
        en: { ...notificationCopy(['deep-work', 'zero-zero']), resultLabels: undefined },
      },
    }),
    /resultLabels/,
    'missing resultLabels in one locale'
  );
  assertInvalid(
    notificationSpec({ schemaVersion: 2 }),
    /schemaVersion/,
    'unknown schemaVersion'
  );
  assertInvalid(
    notificationSpec({
      sourceRefs: [{ url: 'data:text/html,<script>', title: 'Bad' }],
    }),
    /URL/,
    'data: source URL'
  );
});

/* ── shared contract regressions for the new kinds ─────────────────────── */

test('new kinds reject non-finite numbers, unknown top-level keys and missing locales', () => {
  assertInvalid(
    reliabilitySpec({
      scenarios: [
        { id: 'twenty-steps', stepPermille: Number.POSITIVE_INFINITY, steps: 20, recallPermille: 1000 },
        { id: 'partial-recall', stepPermille: 950, steps: 20, recallPermille: 500 },
      ],
    }),
    /finite/,
    'Infinity permille'
  );
  assertInvalid(taskCostSpec({ extra: true }), /unknown field/, 'unknown top-level key');
  assertInvalid(notificationSpec({ copy: { zh: notificationCopy(['deep-work', 'zero-zero']) } }), /copy/, 'missing en locale');
  assertInvalid(
    reliabilitySpec({ kind: 'task-cost' }),
    /unknown field/,
    'a mismatched kind body fails the kind validator selected by dispatch'
  );
});
