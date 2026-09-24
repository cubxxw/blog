import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampToolValue,
  computeBudget,
  findScenario,
  defaultScenario,
  explainKey,
  stepCount,
  clampIndex,
  canStepPrev,
  canStepNext,
  isFinished,
  nodeForKind,
} from '../../assets/js/components/model.mjs';

// The pilot spec values from issue #389 §6A (illustrative units).
const MODEL = { capacity: 64, system: 4, toolMin: 0, toolMax: 48, toolStep: 1 };
const SCENARIOS = {
  compact: { history: 8, tools: 4 },
  'long-history': { history: 36, tools: 16 },
  'tool-heavy': { history: 20, tools: 32 },
};

test('exact issue arithmetic: three default scenarios used/remaining/overflow', () => {
  const expected = {
    compact: [16, 48, 0],
    'long-history': [56, 8, 0],
    'tool-heavy': [56, 8, 0],
  };
  for (const [id, [used, remaining, overflow]] of Object.entries(expected)) {
    const b = computeBudget(MODEL, SCENARIOS[id]);
    assert.deepEqual(
      [b.used, b.remaining, b.overflow],
      [used, remaining, overflow],
      `scenario ${id}`
    );
  }
});

test('exact issue arithmetic: tool-heavy slider points 0/32/40/48', () => {
  const expected = {
    0: [40, 0],
    32: [8, 0],
    40: [0, 0],
    48: [0, 8],
  };
  for (const [tools, [remaining, overflow]] of Object.entries(expected)) {
    const b = computeBudget(MODEL, { history: SCENARIOS['tool-heavy'].history, tools: Number(tools) });
    assert.deepEqual(
      [b.remaining, b.overflow],
      [remaining, overflow],
      `tool-heavy tools=${tools}`
    );
  }
});

test('boundary values: 0, exact capacity, one over', () => {
  assert.deepEqual(computeBudget(MODEL, { history: 0, tools: 0 }), {
    system: 4,
    history: 0,
    tools: 0,
    used: 4,
    remaining: 60,
    overflow: 0,
    bar: {
      system: (4 / 64) * 100,
      history: 0,
      tools: 0,
      overflow: 0,
    },
  });
  const exact = computeBudget(MODEL, { history: 20, tools: 40 }); // used = 64
  assert.deepEqual([exact.remaining, exact.overflow], [0, 0]);
  const over = computeBudget(MODEL, { history: 20, tools: 41 }); // used = 65
  assert.deepEqual([over.remaining, over.overflow], [0, 1]);
  // The bar never renormalises to hide overflow: overflow gets its own band.
  assert.equal(over.bar.overflow, (1 / 64) * 100);
  assert.ok(over.bar.system + over.bar.history + over.bar.tools > 100 - 1e-9);
});

test('clampToolValue clamps and snaps to step', () => {
  assert.equal(clampToolValue(-5, MODEL), 0);
  assert.equal(clampToolValue(999, MODEL), 48);
  assert.equal(clampToolValue(NaN, MODEL), 0);
  assert.equal(clampToolValue(3.7, MODEL), 4);
  const coarse = { ...MODEL, toolMin: 2, toolMax: 32, toolStep: 4 };
  assert.equal(clampToolValue(5, coarse), 6);
  assert.equal(clampToolValue(3, coarse), 2);
  assert.equal(clampToolValue(31, coarse), 30);
});

test('clampToolValue resolves non-aligned upper bounds to the greatest legal step', () => {
  // min 2 / max 32 / step 4: legal values are 2, 6, …, 30. A native range
  // input normalises 32 to 30 — the clamp must agree with it exactly.
  const coarse = { ...MODEL, toolMin: 2, toolMax: 32, toolStep: 4 };
  for (const [input, expected] of [
    [32, 30],
    [34, 30],
    [31, 30],
    [30, 30],
    [29, 30],
    [2, 2],
    [0, 2],
  ]) {
    assert.equal(clampToolValue(input, coarse), expected, `input ${input}`);
    const out = clampToolValue(input, coarse);
    assert.ok(out >= coarse.toolMin && out <= coarse.toolMax, `in range: ${input}`);
    assert.equal((out - coarse.toolMin) % coarse.toolStep, 0, `aligned: ${input}`);
  }
});

test('history is never allowed to go negative (no hidden compression)', () => {
  const b = computeBudget(MODEL, { history: -10, tools: 48 });
  assert.equal(b.history, 0);
  assert.equal(b.used, 52);
});

test('explanation keys follow the documented rules', () => {
  assert.equal(explainKey(computeBudget(MODEL, { history: 8, tools: 4 })), 'plenty');
  assert.equal(explainKey(computeBudget(MODEL, { history: 36, tools: 16 })), 'tight');
  assert.equal(explainKey(computeBudget(MODEL, { history: 20, tools: 48 })), 'overflow');
});

/* ── sequence helpers ──────────────────────────────────────────────────── */

const SCENARIO = {
  id: 'demo',
  events: [{ kind: 'decision' }, { kind: 'tool_call' }, { kind: 'stop', reason: 'answered' }],
};

test('finite sequence stepping boundaries', () => {
  assert.equal(stepCount(SCENARIO), 3);
  assert.equal(clampIndex(-5, SCENARIO), 0);
  assert.equal(clampIndex(99, SCENARIO), 2);
  assert.equal(clampIndex(1.9, SCENARIO), 1);
  assert.equal(canStepPrev(0, SCENARIO), false);
  assert.equal(canStepNext(0, SCENARIO), true);
  assert.equal(canStepNext(2, SCENARIO), false);
  assert.equal(isFinished(2, SCENARIO), true);
  assert.equal(isFinished(1, SCENARIO), false);
});

test('nodeForKind maps events to diagram nodes', () => {
  assert.equal(nodeForKind('decision'), 'decision');
  assert.equal(nodeForKind('tool_call'), 'tool');
  assert.equal(nodeForKind('tool_result'), 'result');
  assert.equal(nodeForKind('stop'), 'stop');
});

test('findScenario / defaultScenario resolve ids', () => {
  const spec = { defaultScenario: 'demo', scenarios: [SCENARIO] };
  assert.equal(findScenario(spec, 'demo'), SCENARIO);
  assert.equal(findScenario(spec, 'missing'), null);
  assert.equal(defaultScenario(spec), SCENARIO);
});
