/**
 * model.mjs — pure, deterministic model functions for the interactive
 * components. No DOM, no timers, no network: the elements are thin adapters.
 *
 * The context arithmetic is exact integer math (see docs/interactive-articles.md):
 *
 *   used      = system + history + tools
 *   remaining = max(0, capacity - used)
 *   overflow  = max(0, used - capacity)
 *
 * Units are illustrative units. V1 does not simulate output reservation,
 * auto-compaction, tokenizers, answer quality or latency, and never silently
 * compresses history when the budget overflows.
 */

/**
 * Clamp a tool slider value into [toolMin, toolMax] and snap to the nearest
 * legal step. If the snapped value would exceed toolMax on a non-aligned
 * upper bound, fall back to the greatest legal step (matching how native
 * <input type="range"> normalises, e.g. min 2 / max 32 / step 4 → 30).
 */
export function clampToolValue(value, model) {
  const { toolMin, toolMax, toolStep } = model;
  if (!Number.isFinite(value)) return toolMin;
  const clamped = Math.min(toolMax, Math.max(toolMin, value));
  const snapped = toolMin + Math.round((clamped - toolMin) / toolStep) * toolStep;
  if (snapped > toolMax) {
    return toolMin + Math.floor((toolMax - toolMin) / toolStep) * toolStep;
  }
  return Math.max(toolMin, snapped);
}

/**
 * Compute the budget readout for one state.
 * @param {{capacity:number, system:number}} model
 * @param {{history:number, tools:number}} values
 */
export function computeBudget(model, values) {
  const system = model.system;
  const history = Math.max(0, Math.trunc(values.history));
  const tools = clampToolValue(values.tools, model);
  const used = system + history + tools;
  const remaining = Math.max(0, model.capacity - used);
  const overflow = Math.max(0, used - model.capacity);
  return {
    system,
    history,
    tools,
    used,
    remaining,
    overflow,
    // Bar segments against the fixed capacity reference (never renormalised
    // to 100%): overflow is shown separately, beside the bar.
    bar: {
      system: (system / model.capacity) * 100,
      history: (history / model.capacity) * 100,
      tools: (tools / model.capacity) * 100,
      overflow: (overflow / model.capacity) * 100,
    },
  };
}

/** Scenario lookup by id (null when unknown). */
export function findScenario(spec, id) {
  return spec.scenarios.find((s) => s.id === id) || null;
}

/** The spec's default scenario (callers must validate the spec first). */
export function defaultScenario(spec) {
  return findScenario(spec, spec.defaultScenario);
}

/**
 * Rule-based explanation key for a budget state — the wording itself is
 * pre-written in the spec copy (`explanations`), never generated.
 * - overflow: used exceeds capacity
 * - tight:    20% or less of the capacity is left
 * - plenty:   more than 20% left
 */
export function explainKey(budget) {
  if (budget.overflow > 0) return 'overflow';
  const capacityShareLeft = budget.remaining / (budget.used + budget.remaining);
  return capacityShareLeft <= 0.2 ? 'tight' : 'plenty';
}

/* ── agent-loop sequence helpers ─────────────────────────────────────────── */

/** Number of finite, author-written events in a scenario. */
export function stepCount(scenario) {
  return scenario.events.length;
}

/** Clamp a step index into [0, events.length - 1]. */
export function clampIndex(index, scenario) {
  const last = stepCount(scenario) - 1;
  return Math.min(last, Math.max(0, Math.trunc(index)));
}

/** First step index (0). */
export function firstIndex() {
  return 0;
}

/** Whether "previous"/"next" stepping is possible at this index. */
export function canStepPrev(index, scenario) {
  return clampIndex(index, scenario) > 0;
}

export function canStepNext(index, scenario) {
  return clampIndex(index, scenario) < stepCount(scenario) - 1;
}

/** Whether playback may advance (finite sequences always end). */
export function isFinished(index, scenario) {
  return !canStepNext(index, scenario);
}

/**
 * The node highlighted for an event kind (diagram strip):
 * decision → decision node, tool_call → tool node, tool_result → result node,
 * stop → stop node.
 */
export function nodeForKind(kind) {
  switch (kind) {
    case 'decision':
      return 'decision';
    case 'tool_call':
      return 'tool';
    case 'tool_result':
      return 'result';
    default:
      return 'stop';
  }
}
