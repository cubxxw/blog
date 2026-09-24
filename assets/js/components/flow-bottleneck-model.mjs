/**
 * flow-bottleneck-model.mjs — pure model + data contract validator for the
 * "flow-bottleneck" interactive kind (geometry expansion).
 *
 * Two responsibilities, one module (per the expansion architecture):
 *
 *   1. Pure deterministic serial-pipeline simulation for
 *      <blog-flow-bottleneck>. No DOM, no timers, no network: the element is
 *      a thin adapter and the server-rendered figure
 *      (layouts/partials/interactive/flow-bottleneck.html) samples the same
 *      ticks with the same formulas.
 *   2. `validateFlowBottleneck(p, raw, helpers)` — the strict field validator
 *      called by validateSpec after the common top-level checks. It receives
 *      the spec-schema PathCtx `p` and the shared scenario/source helpers as
 *      the third argument; this module never imports spec-schema (no cycles).
 *
 * Deterministic synchronous tick semantics (documented; see
 * docs/interactive/geometry.md). Three serial stages — generation → review →
 * delivery — each serve ONCE per tick in DOWNSTREAM ORDER (delivery, then
 * review, then generation). Within one tick:
 *
 *   1. the fixed incoming demand is admitted to the generation queue
 *      (never dropped — admitted jobs are conserved forever);
 *   2. delivery serves min(capacity, its queue); served jobs LEAVE the system
 *      and count towards `delivered`;
 *   3. review serves min(capacity, its queue); served jobs join the delivery
 *      queue — but delivery already served this tick, so they are served next
 *      tick at the earliest ("jobs newly completed enter the next stage next
 *      tick");
 *   4. generation serves min(capacity, its queue) into the review queue the
 *      same way.
 *
 * Conservation invariant (holds after every tick, including initial
 * in-flight jobs):
 *
 *   admitted === queue.generate + queue.review + queue.delivery + delivered
 *
 * Integer math only: no negative queues, no dropped jobs, no infinite
 * playback — the run stops at `model.maxTicks` and resets on demand. Input
 * and capacities are fixed illustrative numbers, not a business forecast.
 */

/* ── stage vocabulary ─────────────────────────────────────────────────── */

export const STAGES = ['generate', 'review', 'delivery'];
export const EXPLAIN_KEYS = ['generate', 'review', 'delivery', 'balanced', 'demand-limited'];
const INITIAL_MAX = 20;

/* ── pure simulation ──────────────────────────────────────────────────── */

/** Clamp one per-tick capacity into [0, capacityMax] as a whole number. */
export function clampCapacity(value, model) {
  if (!Number.isFinite(value)) return 0;
  const v = Math.trunc(value);
  return Math.min(model.capacityMax, Math.max(0, v));
}

/** Tick 0 state of a scenario: initial in-flight jobs are already admitted. */
export function initialState(scenario) {
  const queue = {
    generate: Math.max(0, Math.trunc(scenario.initial.generate)),
    review: Math.max(0, Math.trunc(scenario.initial.review)),
    delivery: Math.max(0, Math.trunc(scenario.initial.delivery)),
  };
  const admitted = queue.generate + queue.review + queue.delivery;
  return {
    tick: 0,
    queue,
    delivered: 0,
    admitted,
    last: { generate: 0, review: 0, delivery: 0 },
    history: [{ tick: 0, wip: admitted, delivered: 0, throughput: 0 }],
  };
}

/** Total work in progress (all three queues). */
export function wip(state) {
  return state.queue.generate + state.queue.review + state.queue.delivery;
}

/** Conservation of every admitted job (including initial in-flight). */
export function checkConservation(state) {
  return state.admitted === wip(state) + state.delivered;
}

/** Whether another tick is allowed (hard bound — no unbounded runs). */
export function canTick(state, model) {
  return state.tick < model.maxTicks;
}

/**
 * Advance exactly one tick. Pure: returns a new state, never mutates the
 * input. `capacities` is {generate, review, delivery} (clamped first).
 */
export function step(state, capacities, model) {
  const caps = {
    generate: clampCapacity(capabilitiesGuard(capacities, 'generate'), model),
    review: clampCapacity(capabilitiesGuard(capacities, 'review'), model),
    delivery: clampCapacity(capabilitiesGuard(capacities, 'delivery'), model),
  };
  const queue = { ...state.queue };

  // 1. explicit incoming demand is admitted (never dropped)
  queue.generate += model.demand;

  // 2. delivery serves first and leaves the system (cumulative delivered)
  const doneDelivery = Math.min(caps.delivery, queue.delivery);
  queue.delivery -= doneDelivery;

  // 3. review serves into the delivery queue (served there next tick)
  const doneReview = Math.min(caps.review, queue.review);
  queue.review -= doneReview;
  queue.delivery += doneReview;

  // 4. generation serves into the review queue (served there next tick)
  const doneGenerate = Math.min(caps.generate, queue.generate);
  queue.generate -= doneGenerate;
  queue.review += doneGenerate;

  const delivered = state.delivered + doneDelivery;
  const admitted = state.admitted + model.demand;
  const next = {
    tick: state.tick + 1,
    queue,
    delivered,
    admitted,
    last: { generate: doneGenerate, review: doneReview, delivery: doneDelivery },
    history: [
      ...state.history,
      {
        tick: state.tick + 1,
        wip: queue.generate + queue.review + queue.delivery,
        delivered,
        throughput: doneDelivery,
      },
    ],
  };
  return next;
}

function capabilitiesGuard(capacities, key) {
  const value = capacities && typeof capacities === 'object' ? capacities[key] : NaN;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Advance up to `ticks` ticks (bounded by model.maxTicks). Pure helper used
 * by tests and documentation samples.
 */
export function simulate(state, capacities, model, ticks) {
  let current = state;
  const n = Math.max(0, Math.trunc(Number.isFinite(ticks) ? ticks : 0));
  for (let i = 0; i < n && canTick(current, model); i += 1) {
    current = step(current, capacities, model);
  }
  return current;
}

/**
 * Fixed-baseline chart scale: max(8, largest wip/throughput seen). Mirrored
 * by the SSR partial so the static chart and the runtime cannot drift.
 */
export function chartScale(history) {
  let scale = 8;
  for (const row of history) {
    if (row.wip > scale) scale = row.wip;
    if (row.throughput > scale) scale = row.throughput;
  }
  return scale;
}

/**
 * The strictly narrowest stage (unique minimum capacity) — the bottleneck
 * that limits the whole line. Ties read as "balanced".
 */
export function bottleneckKey(capacities) {
  const values = STAGES.map((stage) => capabilitiesGuard(capacities, stage));
  const min = Math.min(...values);
  const winners = values.filter((v) => v === min);
  return winners.length === 1 ? STAGES[values.indexOf(min)] : 'balanced';
}

/**
 * Rule-based explanation key (wording pre-written in the spec copy
 * `explanations`, never generated):
 *   demand-limited — every stage's capacity absorbs the incoming demand
 *                    (min capacity >= demand): queues stay short and delivery
 *                    follows demand, so the narrowest-stage queue-buildup
 *                    reading does not apply;
 *   generate / review / delivery — that stage is the unique narrowest while
 *                    demand exceeds it (queue buildup is really happening);
 *   balanced       — tied minimum below demand.
 */
export function explainKey(capacities, demand) {
  const values = STAGES.map((stage) => capabilitiesGuard(capacities, stage));
  if (Number.isFinite(demand) && Math.min(...values) >= demand) return 'demand-limited';
  return bottleneckKey(capacities);
}

/* ── data contract validator ──────────────────────────────────────────── */

const MODEL_KEYS = ['demand', 'capacityMax', 'maxTicks'];
const SCENARIO_KEYS = ['id', 'capacity', 'initial'];
const TRIO_KEYS = ['generate', 'review', 'delivery'];
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
  'diagramNote',
  'tickLabel',
  'tickRule',
  'capacityLabel',
  'demandLabel',
  'stages',
  'metrics',
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
  tick: 60,
  label: 80,
};

const LOCALES = ['zh', 'en'];

function describe(value) {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 40));
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  return String(value);
}

function validateTrio(p, trio, min, max, label) {
  if (trio === null || typeof trio !== 'object' || Array.isArray(trio)) {
    p.fail(`expected a ${label} object with generate/review/delivery, got ${describe(trio)}`);
    return false;
  }
  if (!p.keys(trio, TRIO_KEYS)) return false;
  let ok = true;
  for (const stage of TRIO_KEYS) {
    if (!p.child(stage).integer(trio[stage], min, max)) ok = false;
  }
  return ok;
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
    if (!lp.child('diagramNote').text(copy.diagramNote, LIMITS.note)) ok = false;
    if (!lp.child('tickLabel').text(copy.tickLabel, LIMITS.tick)) ok = false;
    if (!lp.child('tickRule').text(copy.tickRule, LIMITS.note)) ok = false;
    if (!lp.child('capacityLabel').text(copy.capacityLabel, LIMITS.label)) ok = false;
    if (!lp.child('demandLabel').text(copy.demandLabel, LIMITS.label)) ok = false;

    const labels = lp.child('scenarioLabels');
    if (scenarioIds && !labels.keys(copy.scenarioLabels, [...scenarioIds])) {
      ok = false;
    } else if (scenarioIds) {
      for (const id of scenarioIds) {
        if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
      }
    }

    if (!lp.child('stages').textMap(copy.stages, TRIO_KEYS, LIMITS.label)) ok = false;
    if (
      !lp.child('metrics').textMap(
        copy.metrics,
        ['tick', 'queue', 'wip', 'delivered', 'throughput', 'admitted'],
        LIMITS.label
      )
    ) {
      ok = false;
    }
    if (!lp.child('explanations').textMap(copy.explanations, EXPLAIN_KEYS, LIMITS.note)) {
      ok = false;
    }
  }
  return ok;
}

/**
 * Strict validator for `kind: "flow-bottleneck"` specs. Called by validateSpec
 * after the common top-level checks; records field errors through `p` and
 * never throws on corrupt input.
 */
export function validateFlowBottleneck(p, raw, { validateScenariosList, validateSourceRefs }) {
  let ok = true;

  /* model: fixed demand, capacity control range, hard tick bound */
  const mp = p.child('model');
  let capacityMax = null;
  if (!mp.keys(raw.model, MODEL_KEYS)) {
    ok = false;
  } else {
    const m = raw.model;
    if (!mp.child('demand').integer(m.demand, 0, 20)) ok = false;
    if (!mp.child('capacityMax').integer(m.capacityMax, 1, 20)) {
      ok = false;
    } else {
      capacityMax = m.capacityMax;
    }
    if (!mp.child('maxTicks').integer(m.maxTicks, 2, 40)) ok = false;
  }

  /* scenarios: capacity presets + initial in-flight jobs */
  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, SCENARIO_KEYS);
    const cap = capacityMax === null ? 20 : capacityMax;
    if (!validateTrio(ip.child('capacity'), scenario.capacity, 0, cap, 'capacity')) sok = false;
    if (!validateTrio(ip.child('initial'), scenario.initial, 0, INITIAL_MAX, 'initial')) sok = false;
    return sok;
  });
  if (!scenarioIds) ok = false;

  if (!validateCopies(p, raw, scenarioIds || undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}
