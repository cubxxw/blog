/**
 * effect-recovery-model.mjs — pure model and executable validator for the
 * `effect-recovery` kind (one logical external write, a crash window and a
 * recovery discipline).
 *
 * No DOM, no timers, no network and NO import of spec-schema.mjs (the schema
 * module imports THIS validator and passes its own list/ref helpers in — see
 * `validateSpec`). Everything here is deterministic: the figures are authored
 * educational traces, never real execution. See docs/interactive/effects.md
 * for the field vocabulary, the arithmetic and the factual limits.
 *
 * Core question of the kind: after a crash, what does the local side actually
 * know about one external write (confirmed success / confirmed failure /
 * unknown), how many times did the write really happen, and which recovery
 * action is safe next? The three-state knowledge is the article's point:
 * folding `unknown` into failure is what produces duplicate side effects.
 */

export const FLOWS = ['queue-retry', 'node-replay'];
export const CRASHES = ['before-send', 'after-commit-before-receipt', 'after-recorded-receipt'];
export const STRATEGIES = ['retry', 'query-receipt', 'idempotency-key'];
export const PLACEMENTS = ['plain', 'before-approval', 'after-approval'];
export const KNOWLEDGE = ['confirmed-success', 'confirmed-failure', 'unknown'];
export const NEXT_ACTIONS = ['return-recorded', 'retry-safe', 'protected-retry', 'reconcile'];
export const EXPLAIN_KEYS = ['empty', 'clean', 'duplicate', 'ambiguous'];

const LIMITS = {
  label: 80,
  figureLabel: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  notice: 200,
};

/** Where the crash point lands on the finite step timeline (uniform for
 * every flow/placement — see docs/interactive/effects.md). */
export const CRASH_STEP = {
  'before-send': 'send',
  'after-commit-before-receipt': 'receipt',
  'after-recorded-receipt': 'finish',
};

const PAYMENT_SEGMENT = [
  { key: 'send', lane: 'worker', hazard: true },
  { key: 'commit', lane: 'external', hazard: true },
  { key: 'receipt', lane: 'worker', hazard: false },
];
const GATE_SEGMENT = [
  { key: 'interrupt', lane: 'worker', hazard: false },
  { key: 'resume', lane: 'worker', hazard: false },
];

/**
 * The finite step timeline for one scenario: worker / local record / external
 * service lanes. For `node-replay` the payment segment sits either before the
 * `interrupt()` gate (replayed on resume — the hazard) or after it (safe
 * placement). Fixed semantic steps only: this is not an arbitrary event
 * machine.
 */
export function timelineSteps(model, scenario) {
  const head = [
    { key: 'start', lane: 'worker', hazard: false },
    { key: 'intent', lane: 'local', hazard: false },
  ];
  const tail = [
    { key: 'record', lane: 'local', hazard: false },
    { key: 'finish', lane: 'worker', hazard: false },
  ];
  if (model.flow === 'queue-retry') {
    return [
      ...head,
      { key: 'send', lane: 'worker', hazard: false },
      { key: 'commit', lane: 'external', hazard: false },
      { key: 'receipt', lane: 'worker', hazard: false },
      ...tail,
    ];
  }
  const middle =
    scenario.effectPlacement === 'before-approval'
      ? [...PAYMENT_SEGMENT, ...GATE_SEGMENT]
      : [...GATE_SEGMENT, ...PAYMENT_SEGMENT];
  // The replayed region re-executes the pre-approval side effect on resume.
  const hazard = scenario.effectPlacement === 'before-approval';
  return [...head, ...middle, ...tail].map((s) =>
    s.key === 'send' || s.key === 'commit' ? { ...s, hazard } : s
  );
}

/** Copy key set for `copy.<lang>.steps` — exactly the steps the flow uses. */
export function stepKeys(flow) {
  return flow === 'queue-retry'
    ? ['start', 'intent', 'send', 'commit', 'receipt', 'record', 'finish']
    : ['start', 'intent', 'send', 'commit', 'receipt', 'interrupt', 'resume', 'record', 'finish'];
}

/** How many external sends one COMPLETED run performs (the node-replay flow
 * re-executes the interrupted node from its top on resume, so a pre-approval
 * side effect runs once per node execution — twice per completion). */
export function completionSends(model, scenario) {
  return model.flow === 'node-replay' && scenario.effectPlacement === 'before-approval' ? 2 : 1;
}

/**
 * The deterministic educational model (see docs/interactive/effects.md):
 *
 *   phase — the crashed attempt's external write, by crash window:
 *     before-send                  → 0 writes, provable (the request never left)
 *     after-commit-before-receipt  → 1 write, unproven ∈ {0,1} (receipt lost)
 *     after-recorded-receipt       → the writes of the run so far, provable
 *       (1 — or 2 for the before-approval placement, whose completed run
 *       already re-executed the side effect before recording)
 *
 *   recovery — exactly one discipline:
 *     retry / idempotency-key without provider support → a plain re-run that
 *       adds `completionSends` provable writes but no evidence about the
 *       interrupted one;
 *     idempotency-key with provider support → every send of the operation
 *       carries the stable key, so the provider collapses the key scope to
 *       exactly one write and the response is proof;
 *     query-receipt → probe only (no write): with provider support it resolves
 *       the interrupted write authoritatively; without support it proves
 *       nothing and hands over to a human.
 *
 * `knowledge` is the three-state verdict about "exactly one external write"
 * (the evidence INTERVAL, not the exact count, decides it):
 *   confirmed-success — the interval is exactly {1}: provable exactly once;
 *   confirmed-failure — the interval EXCLUDES 1: provable NOT exactly once
 *                       (never happened, or provably more than once even
 *                       when the exact duplicate count is unknown);
 *   unknown           — the interval still contains 1: unprovable either
 *                       way. Never folded into failure.
 *
 * `next` is the next safe action:
 *   return-recorded  — exactly once is proven: record and return, no resend;
 *   retry-safe       — provably zero AND one plain re-run performs exactly
 *                      one write (no replay hazard);
 *   protected-retry  — provably zero BUT a plain re-run would repeat the
 *                      side effect (the before-approval replay): retry only
 *                      once the write is safely replayable (stable
 *                      idempotency key);
 *   reconcile        — anything unproven or already duplicated.
 *
 * `actions` is the authored ground truth of how often the external side
 * effect happened — shown next to `knowledge` so readers see the gap between
 * reality and what the local record can prove.
 */
export function computeEffect(model, scenario, crash, strategy) {
  const provider = scenario.provider || {};
  const beforeApproval =
    model.flow === 'node-replay' && scenario.effectPlacement === 'before-approval';
  // The crashed run's external writes (authored truth) and provable bounds.
  const doublePhase = beforeApproval && crash === 'after-recorded-receipt';
  const phase = crash === 'before-send' ? 0 : doublePhase ? 2 : 1;
  let lo;
  let hi;
  if (crash === 'before-send') {
    lo = 0;
    hi = 0;
  } else if (crash === 'after-commit-before-receipt') {
    lo = 0;
    hi = 1;
  } else {
    lo = phase;
    hi = phase;
  }
  let actions = phase;

  const keyed = strategy === 'idempotency-key' && provider.idempotencyKey === true;
  const probed = strategy === 'query-receipt' && provider.receiptQuery === true;
  const cs = completionSends(model, scenario);

  if (keyed) {
    // Stable provider-supported idempotency key: at-most-once per key plus a
    // completed recovery → provably exactly one write, wherever it crashed.
    actions = 1;
    lo = 1;
    hi = 1;
  } else if (strategy === 'query-receipt') {
    if (probed) {
      lo = phase;
      hi = phase;
    }
    // Without query support nothing changes: the probe proves nothing.
  } else {
    // `retry`, and `idempotency-key` when the provider does not support keys
    // (the key is then decoration — dedupe happens only under stated support).
    actions += cs;
    lo += cs;
    hi += cs;
  }

  // The verdict is about the exactly-once proposition, so the evidence
  // interval decides it: {1} is proven success, an interval that EXCLUDES 1
  // is proven failure (even when the exact count inside [2,3] is unknown),
  // and only an interval that still contains 1 is genuinely unknown.
  const knowledge =
    lo === 1 && hi === 1
      ? 'confirmed-success'
      : hi < 1 || lo > 1
        ? 'confirmed-failure'
        : 'unknown';
  // The next safe action: proven zero is only "retry safely" when one plain
  // re-run performs exactly one write. The before-approval node replay makes
  // an unprotected re-run repeat the side effect, so there the zero evidence
  // requires protected replay (a stable idempotency key) before retrying —
  // knowing the first attempt never sent does not protect the replay.
  const next =
    knowledge === 'confirmed-success'
      ? 'return-recorded'
      : lo === 0 && hi === 0
        ? completionSends(model, scenario) === 1
          ? 'retry-safe'
          : 'protected-retry'
        : 'reconcile';
  const explain =
    actions === 0 ? 'empty' : knowledge === 'confirmed-success' ? 'clean' : actions > 1 ? 'duplicate' : 'ambiguous';
  return { actions, lo, hi, knowledge, next, explain };
}

/**
 * Per-step visual state for the lane timeline at one selection — two visual
 * axes (docs/interactive/effects.md):
 *
 *   state — `done` (ran exactly once, in the crashed run) · `repeated` (ran
 *     more than once: the visible cause of repeated external effects —
 *     recovery re-execution and/or the interrupt replay) · `recovered` (ran
 *     only in the recovery) · `skipped` (never ran);
 *   crash — separate flag marking the crash window, so the window stays
 *     identifiable on top of the execution state.
 *
 * The authored finite trace is the crashed run (cut at the crash step, which
 * itself never completes) plus — for write-completing strategies (retry,
 * idempotency-key) — one full completed re-run. `send`/`commit` counts follow
 * the write arithmetic: the node-replay flow re-executes the pre-approval
 * side effect when a run crosses `resume`, and a provider-supported
 * idempotency key collapses every send of the operation (including the
 * original attempt) to one commit. A bounded teaching model — not a LangGraph
 * SDK simulation.
 */
export function timelineStates(model, scenario, crash, strategy) {
  const steps = timelineSteps(model, scenario);
  const crashIdx = steps.findIndex((s) => s.key === CRASH_STEP[crash]);
  const sendIdx = steps.findIndex((s) => s.key === 'send');
  const resumeIdx = steps.findIndex((s) => s.key === 'resume');
  const beforeApproval =
    model.flow === 'node-replay' && scenario.effectPlacement === 'before-approval';
  const keyed = strategy === 'idempotency-key' && scenario.provider.idempotencyKey === true;
  const recoveryRan = strategy !== 'query-receipt';

  // Crashed run: every step before the crash ran once; the node-replay flow
  // additionally re-executes the pre-approval side effect when the run
  // crossed `resume` (the replayed send/commit — the hazard made visible).
  const replayInCrashed = beforeApproval && resumeIdx > -1 && resumeIdx < crashIdx;
  const sends1 =
    (sendIdx > -1 && sendIdx < crashIdx ? 1 : 0) + (replayInCrashed ? 1 : 0);
  const commits1 = keyed ? (sends1 > 0 ? 1 : 0) : sends1;

  // The recovery's completed re-run (one full run of the flow).
  const cs = recoveryRan ? completionSends(model, scenario) : 0;
  const sends2 = cs;
  const commits2 = keyed ? (commits1 === 0 && cs > 0 ? 1 : 0) : cs;

  return steps.map((s, i) => {
    let r1;
    let r2;
    if (s.key === 'send') {
      r1 = sends1;
      r2 = sends2;
    } else if (s.key === 'commit') {
      r1 = commits1;
      r2 = commits2;
    } else {
      r1 = i < crashIdx ? 1 : 0;
      r2 = recoveryRan ? 1 : 0;
    }
    const runs = r1 + r2;
    const state =
      runs === 0 ? 'skipped' : runs > 1 ? 'repeated' : r1 === 1 ? 'done' : 'recovered';
    return { ...s, state, crash: i === crashIdx, runs };
  });
}

/* ── scenario helpers ─────────────────────────────────────────────────── */

/** Scenario lookup by id (null when unknown). */
export function findScenario(spec, id) {
  return spec.scenarios.find((s) => s.id === id) || null;
}

/** The spec's default scenario (callers must validate the spec first). */
export function defaultScenario(spec) {
  return findScenario(spec, spec.defaultScenario);
}

/* ── validator (called by spec-schema.validateSpec after validateCommon) ── */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const SHARED_COPY = [
  ['figureLabel', LIMITS.figureLabel],
  ['title', LIMITS.title],
  ['question', LIMITS.question],
  ['assumption', LIMITS.note],
  ['observe', LIMITS.note],
  ['footerNote', LIMITS.footerNote],
  ['referenceTitle', LIMITS.label],
];

function validateSharedCopy(lp, copy) {
  let ok = true;
  for (const [key, maxLen] of SHARED_COPY) {
    if (!lp.child(key).text(copy[key], maxLen)) ok = false;
  }
  return ok;
}

/**
 * Strict `effect-recovery` data contract. `p` is the schema module's PathCtx
 * (error/field helpers); `helpers` carries { validateScenariosList,
 * validateSourceRefs } so list/id/default/source rules stay single-sourced.
 * Returns true when the spec is valid (errors land on `p`).
 */
export function validateEffectRecovery(p, raw, helpers) {
  let ok = true;

  /* model: exact keys { flow, maxSteps } */
  const mp = p.child('model');
  let flow = null;
  let maxSteps = 24;
  if (!mp.keys(raw.model, ['flow', 'maxSteps'])) {
    ok = false;
  } else {
    if (!mp.child('flow').enum(raw.model.flow, FLOWS)) {
      ok = false;
    } else {
      flow = raw.model.flow;
    }
    if (!mp.child('maxSteps').integer(raw.model.maxSteps, 4, 24)) {
      ok = false;
    } else {
      maxSteps = raw.model.maxSteps;
    }
  }

  /* scenarios */
  const scenarioIds = helpers.validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.fields(
      scenario,
      ['id', 'effectPlacement', 'provider', 'defaultCrash', 'defaultStrategy'],
      ['id', 'effectPlacement', 'provider', 'defaultCrash', 'defaultStrategy']
    );
    if (!ip.child('effectPlacement').enum(scenario.effectPlacement, PLACEMENTS)) sok = false;
    if (!ip.child('defaultCrash').enum(scenario.defaultCrash, CRASHES)) sok = false;
    if (!ip.child('defaultStrategy').enum(scenario.defaultStrategy, STRATEGIES)) sok = false;
    const pp = ip.child('provider');
    if (!pp.keys(scenario.provider, ['receiptQuery', 'idempotencyKey'])) {
      sok = false;
    } else {
      for (const cap of ['receiptQuery', 'idempotencyKey']) {
        const value = scenario.provider[cap];
        if (value !== true && value !== false) {
          pp.child(cap).fail(`expected a boolean capability flag, got ${JSON.stringify(value)}`);
          sok = false;
        }
      }
    }
    // Scope: the flows describe the n8n queue/retry example and the LangGraph
    // interrupt/replay example — the placement vocabulary belongs to the
    // node-replay flow only.
    if (flow && ip.child('effectPlacement').enum(scenario.effectPlacement, PLACEMENTS)) {
      if (flow === 'queue-retry' && scenario.effectPlacement !== 'plain') {
        ip.child('effectPlacement').fail(
          'flow "queue-retry" only supports effectPlacement "plain" (no interrupt gate)'
        );
        sok = false;
      }
      if (flow === 'node-replay' && scenario.effectPlacement === 'plain') {
        ip.child('effectPlacement').fail(
          'flow "node-replay" requires effectPlacement "before-approval" or "after-approval"'
        );
        sok = false;
      }
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  /* the finite timeline must fit the declared hard bound */
  if (flow && Number.isInteger(maxSteps)) {
    const longest = stepKeys(flow).length;
    if (longest > maxSteps) {
      mp.child('maxSteps').fail(
        `maxSteps (${maxSteps}) must cover the ${flow} timeline (${longest} steps)`
      );
      ok = false;
    }
  }

  /* copy: exactly zh and en, both complete for this flow */
  const cp = p.child('copy');
  if (!cp.keys(raw.copy, ['zh', 'en'])) {
    ok = false;
  } else {
    for (const lang of ['zh', 'en']) {
      const lp = cp.child(lang);
      const copy = raw.copy[lang];
      if (!isPlainObject(copy)) {
        lp.fail('expected a copy object');
        ok = false;
        continue;
      }
      const stepField = flow === 'queue-retry'
        ? ['start', 'intent', 'send', 'commit', 'receipt', 'record', 'finish']
        : ['start', 'intent', 'send', 'commit', 'receipt', 'interrupt', 'resume', 'record', 'finish'];
      const allowed = [
        ...SHARED_COPY.map(([key]) => key),
        'scenarioLabels',
        'traceNotice',
        'lanes',
        'steps',
        'crashLabel',
        'strategyLabel',
        'crashOptions',
        'strategyOptions',
        'readout',
        'knowledge',
        'next',
        'table',
        'explanations',
      ];
      if (!lp.keys(copy, allowed)) {
        ok = false;
        continue;
      }
      if (!validateSharedCopy(lp, copy)) ok = false;
      if (!lp.child('traceNotice').text(copy.traceNotice, LIMITS.notice)) ok = false;
      if (!lp.child('lanes').textMap(copy.lanes, ['worker', 'local', 'external'], LIMITS.label)) ok = false;
      if (!lp.child('steps').textMap(copy.steps, stepField, LIMITS.note)) ok = false;
      if (!lp.child('crashLabel').text(copy.crashLabel, LIMITS.label)) ok = false;
      if (!lp.child('strategyLabel').text(copy.strategyLabel, LIMITS.label)) ok = false;
      if (
        !lp.child('crashOptions').textMap(
          copy.crashOptions,
          ['before-send', 'after-commit-before-receipt', 'after-recorded-receipt'],
          LIMITS.label
        )
      ) {
        ok = false;
      }
      if (
        !lp.child('strategyOptions').textMap(
          copy.strategyOptions,
          ['retry', 'query-receipt', 'idempotency-key'],
          LIMITS.label
        )
      ) {
        ok = false;
      }
      if (
        !lp.child('readout').textMap(copy.readout, ['actions', 'knowledge', 'next'], LIMITS.label)
      ) {
        ok = false;
      }
      if (!lp.child('knowledge').textMap(copy.knowledge, KNOWLEDGE, LIMITS.label)) ok = false;
      if (!lp.child('next').textMap(copy.next, NEXT_ACTIONS, LIMITS.note)) ok = false;
      if (
        !lp.child('table').textMap(
          copy.table,
          ['scenario', 'crash', 'strategy', 'actions', 'knowledge', 'next'],
          LIMITS.label
        )
      ) {
        ok = false;
      }
      if (!lp.child('explanations').textMap(copy.explanations, EXPLAIN_KEYS, LIMITS.note)) ok = false;

      const labels = lp.child('scenarioLabels');
      if (scenarioIds && !labels.keys(copy.scenarioLabels, [...scenarioIds])) {
        ok = false;
      } else if (scenarioIds) {
        for (const id of scenarioIds) {
          if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
        }
      }
    }
  }

  if (!helpers.validateSourceRefs(p, raw)) ok = false;
  return ok && p.errors.length === 0;
}
