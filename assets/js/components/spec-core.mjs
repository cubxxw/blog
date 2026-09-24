/**
 * spec-core.mjs — shared validation primitives and pilot data contracts for data/interactive/*.json.
 *
 * Pure JavaScript, no DOM and no Node built-ins: the same module backs
 *   1. scripts/check-interactive-specs.mjs (build-time validation, CI gate), and
 *   2. the custom elements (defensive re-validation before enhancement).
 *
 * One field vocabulary: docs/interactive-articles.md documents exactly these
 * fields. Anything unknown fails validation — no silent extras.
 */

export const SCHEMA_VERSION = 1;
export const KINDS = ['context-budget', 'agent-loop'];
export const LOCALES = ['zh', 'en'];

export const LIMITS = {
  id: 64,
  label: 80,
  figureLabel: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  presetNotice: 200,
  unitLabel: 40,
  eventText: 600,
  args: 200,
  tool: 40,
  sourceTitle: 200,
  sourceUrl: 400,
  scenarios: 8,
  events: 24,
  sourceRefs: 8,
};

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TOOL_RE = /^[A-Za-z0-9_.-]{1,40}$/;
const CONTROL_RE = /[\u0000-\u0009\u000b-\u001f\u007f]/;

const CONTEXT_MODEL_KEYS = ['capacity', 'system', 'toolMin', 'toolMax', 'toolStep'];
const AGENT_MODEL_KEYS = ['maxSteps'];

/** Error-path builder keeping field paths stable and testable. */
class PathCtx {
  constructor(errors, file, path) {
    this.errors = errors;
    this.file = file;
    this.path = path;
  }

  child(key) {
    return new PathCtx(this.errors, this.file, `${this.path}.${key}`);
  }

  index(i) {
    return new PathCtx(this.errors, this.file, `${this.path}[${i}]`);
  }

  fail(message) {
    this.errors.push({ file: this.file, field: this.path, message });
  }

  /** Exact key set: missing and unknown keys both fail. */
  keys(value, allowed) {
    return this.fields(value, allowed, allowed);
  }

  /**
   * Required/allowed key sets: missing `required` and unknown (not in
   * `allowed`) keys both fail. `allowed` must include `required`.
   */
  fields(value, required, allowed) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      this.fail('expected an object');
      return false;
    }
    let ok = true;
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        this.child(key).fail('missing required field');
        ok = false;
      }
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) {
        this.child(key).fail(`unknown field (allowed: ${allowed.join(', ')})`);
        ok = false;
      }
    }
    return ok;
  }

  integer(value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      this.fail(`expected a finite integer, got ${describe(value)}`);
      return false;
    }
    if (value < min || value > max) {
      this.fail(`expected an integer in [${min}, ${max}], got ${value}`);
      return false;
    }
    return true;
  }

  enum(value, allowed) {
    if (typeof value !== 'string' || !allowed.includes(value)) {
      this.fail(`expected one of ${allowed.join(' | ')}, got ${describe(value)}`);
      return false;
    }
    return true;
  }

  id(value) {
    if (typeof value !== 'string' || !ID_RE.test(value) || value.length > LIMITS.id) {
      this.fail(`expected a lowercase slug matching ${ID_RE}, got ${describe(value)}`);
      return false;
    }
    return true;
  }

  /** Non-empty display text; HTML is inert text here (never interpreted). */
  text(value, maxLen) {
    if (typeof value !== 'string') {
      this.fail(`expected a string, got ${describe(value)}`);
      return false;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      this.fail('expected a non-empty string');
      return false;
    }
    if (CONTROL_RE.test(value)) {
      this.fail('text contains control characters (only "\\n" is allowed)');
      return false;
    }
    if (value.length > maxLen) {
      this.fail(`text longer than ${maxLen} characters`);
      return false;
    }
    return true;
  }

  /**
   * Strict link policy: parseable https:// URLs with a host (no embedded
   * credentials, no backslashes), or controlled internal paths starting with
   * a single "/" that survive traversal checks (no ".." segments, no
   * protocol-relative "//"). `javascript:`, `data:` and friends fail.
   */
  url(value) {
    if (typeof value !== 'string' || !value || value.length > LIMITS.sourceUrl) {
      this.fail(`expected a non-empty URL string, got ${describe(value)}`);
      return false;
    }
    if (CONTROL_RE.test(value) || /\s/.test(value) || value.includes('\\')) {
      this.fail('URL contains whitespace, control characters or backslashes');
      return false;
    }
    if (/^https:\/\//i.test(value)) {
      let parsed;
      try {
        parsed = new URL(value);
      } catch {
        this.fail(`URL is not a parseable absolute https URL, got ${describe(value)}`);
        return false;
      }
      if (parsed.protocol !== 'https:' || !parsed.hostname) {
        this.fail(`URL must be an absolute https URL with a host, got ${describe(value)}`);
        return false;
      }
      if (parsed.username || parsed.password) {
        this.fail('URL must not embed credentials');
        return false;
      }
      return true;
    }
    const internal = value.match(/^\/(?!\/)[A-Za-z0-9/._#-]*$/);
    if (internal && !value.split('/').includes('..')) {
      return true;
    }
    this.fail(
      `URL must be https:// or a controlled internal path starting with "/", got ${describe(value)}`
    );
    return false;
  }

  textMap(value, allowedKeys, maxLen) {
    if (!this.keys(value, allowedKeys)) return false;
    let ok = true;
    for (const key of allowedKeys) {
      if (!this.child(key).text(value[key], maxLen)) ok = false;
    }
    return ok;
  }
}

function describe(value) {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 40));
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  return String(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateCommon(p, raw, kinds = KINDS) {
  let ok = p.keys(raw, [
    'schemaVersion',
    'kind',
    'id',
    'defaultScenario',
    'model',
    'scenarios',
    'copy',
    'sourceRefs',
  ]);
  if (!isPlainObject(raw)) return false;

  if (
    !p
      .child('schemaVersion')
      .integer(raw.schemaVersion, SCHEMA_VERSION, SCHEMA_VERSION)
  ) {
    if (typeof raw.schemaVersion === 'number' && Number.isInteger(raw.schemaVersion)) {
      p.child('schemaVersion').fail(`unknown schemaVersion (supported: ${SCHEMA_VERSION})`);
    }
    ok = false;
  }
  if (!p.child('kind').enum(raw.kind, kinds)) ok = false;
  if (!p.child('id').id(raw.id)) ok = false;
  return ok;
}

function validateScenariosList(p, raw, scenarioCtx) {
  const sp = p.child('scenarios');
  if (!Array.isArray(raw.scenarios) || raw.scenarios.length < 1 || raw.scenarios.length > LIMITS.scenarios) {
    sp.fail(`expected 1..${LIMITS.scenarios} scenarios`);
    return null;
  }
  const seen = new Set();
  let ok = true;
  raw.scenarios.forEach((scenario, i) => {
    const ip = sp.index(i);
    if (scenario === null || typeof scenario !== 'object' || Array.isArray(scenario)) {
      ip.fail(`expected a scenario object, got ${describe(scenario)}`);
      ok = false;
      return;
    }
    if (!ip.child('id').id(scenario.id)) {
      ok = false;
      return;
    }
    if (seen.has(scenario.id)) {
      ip.child('id').fail(`duplicate scenario id "${scenario.id}"`);
      ok = false;
    }
    seen.add(scenario.id);
    if (!scenarioCtx(ip, scenario)) ok = false;
  });
  if (!p.child('defaultScenario').id(raw.defaultScenario)) {
    ok = false;
  } else if (!seen.has(raw.defaultScenario)) {
    p.child('defaultScenario').fail(
      `defaultScenario "${raw.defaultScenario}" does not match any scenario id`
    );
    ok = false;
  }
  return ok ? seen : null;
}

function validateSourceRefs(p, raw) {
  const sp = p.child('sourceRefs');
  if (!Array.isArray(raw.sourceRefs) || raw.sourceRefs.length < 1 || raw.sourceRefs.length > LIMITS.sourceRefs) {
    sp.fail(`expected 1..${LIMITS.sourceRefs} sourceRefs`);
    return false;
  }
  let ok = true;
  raw.sourceRefs.forEach((ref, i) => {
    const ip = sp.index(i);
    if (ref === null || typeof ref !== 'object' || Array.isArray(ref)) {
      ip.fail(`expected a sourceRef object, got ${describe(ref)}`);
      ok = false;
      return;
    }
    if (!ip.keys(ref, ['url', 'title'])) {
      ok = false;
      return;
    }
    if (!ip.child('url').url(ref.url)) ok = false;
    if (!ip.child('title').text(ref.title, LIMITS.sourceTitle)) ok = false;
  });
  return ok;
}

function validateLocaleCopies(p, raw, kind, scenarioIds) {
  const cp = p.child('copy');
  if (!isPlainObject(raw.copy)) {
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
    const shared = ['figureLabel', 'title', 'question', 'assumption', 'observe', 'footerNote', 'referenceTitle', 'scenarioLabels'];
    const kindFields =
      kind === 'context-budget'
        ? ['unitLabel', 'capacityLabel', 'sliderLabel', 'segments', 'metrics', 'table', 'explanations']
        : ['presetNotice', 'stepKinds', 'nodes', 'table', 'io'];
    if (!lp.keys(copy, [...shared, ...kindFields])) {
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

    const labels = lp.child('scenarioLabels');
    if (scenarioIds && !labels.keys(copy.scenarioLabels, [...scenarioIds])) {
      ok = false;
    } else if (scenarioIds) {
      for (const id of scenarioIds) {
        if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
      }
    }

    if (kind === 'context-budget') {
      if (!lp.child('unitLabel').text(copy.unitLabel, LIMITS.unitLabel)) ok = false;
      if (!lp.child('capacityLabel').text(copy.capacityLabel, LIMITS.label)) ok = false;
      if (!lp.child('sliderLabel').text(copy.sliderLabel, LIMITS.label)) ok = false;
      if (
        !lp.child('segments').textMap(copy.segments, ['system', 'history', 'tools', 'remaining'], LIMITS.label)
      ) {
        ok = false;
      }
      if (!lp.child('metrics').textMap(copy.metrics, ['used', 'remaining', 'overflow'], LIMITS.label)) {
        ok = false;
      }
      if (!lp.child('table').textMap(copy.table, ['scenario', 'used', 'remaining', 'overflow'], LIMITS.label)) {
        ok = false;
      }
      if (!lp.child('explanations').textMap(copy.explanations, ['plenty', 'tight', 'overflow'], LIMITS.note)) {
        ok = false;
      }
    } else {
      if (!lp.child('presetNotice').text(copy.presetNotice, LIMITS.presetNotice)) ok = false;
      if (
        !lp.child('stepKinds').textMap(copy.stepKinds, ['decision', 'tool_call', 'tool_result', 'stop'], LIMITS.label)
      ) {
        ok = false;
      }
      if (!lp.child('nodes').textMap(copy.nodes, ['decision', 'tool', 'result', 'stop'], LIMITS.label)) {
        ok = false;
      }
      if (!lp.child('table').textMap(copy.table, ['step', 'kind', 'detail'], LIMITS.label)) ok = false;
      if (!lp.child('io').textMap(copy.io, ['input', 'output'], LIMITS.label)) ok = false;
    }
  }
  return ok;
}

function validateContextBudget(p, raw) {
  let ok = true;
  const mp = p.child('model');
  if (!mp.keys(raw.model, CONTEXT_MODEL_KEYS)) {
    ok = false;
  } else {
    const m = raw.model;
    const capOk = mp.child('capacity').integer(m.capacity, 1, 1000000);
    if (!mp.child('system').integer(m.system, 0, 1000000)) ok = false;
    if (!mp.child('toolMin').integer(m.toolMin, 0, 1000000)) ok = false;
    if (!mp.child('toolMax').integer(m.toolMax, 0, 1000000)) ok = false;
    if (!mp.child('toolStep').integer(m.toolStep, 1, 1000000)) ok = false;
    if (!capOk) ok = false;
    if (capOk && m.toolMax <= m.toolMin) {
      mp.child('toolMax').fail(`toolMax (${m.toolMax}) must be greater than toolMin (${m.toolMin})`);
      ok = false;
    }
    if (capOk && m.system > m.capacity) {
      mp.child('system').fail(`system (${m.system}) must not exceed capacity (${m.capacity})`);
      ok = false;
    }
    if (Number.isInteger(m.toolStep) && Number.isInteger(m.toolMax) && Number.isInteger(m.toolMin) &&
        m.toolStep > m.toolMax - m.toolMin) {
      mp.child('toolStep').fail('toolStep must not exceed toolMax - toolMin');
      ok = false;
    }
  }

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, ['id', 'history', 'tools']);
    const m = isPlainObject(raw.model) ? raw.model : {};
    if (!ip.child('history').integer(scenario.history, 0, 1000000)) sok = false;
    if (!ip.child('tools').integer(scenario.tools, 0, 1000000)) sok = false;
    if (sok && Number.isInteger(m.toolMin) && Number.isInteger(m.toolMax)) {
      if (scenario.tools < m.toolMin || scenario.tools > m.toolMax) {
        ip.child('tools').fail(
          `tools (${scenario.tools}) must be within [toolMin, toolMax] = [${m.toolMin}, ${m.toolMax}]`
        );
        sok = false;
      }
    }
    if (sok && Number.isInteger(m.toolStep) && Number.isInteger(m.toolMin) &&
        (scenario.tools - m.toolMin) % m.toolStep !== 0) {
      ip.child('tools').fail(`tools (${scenario.tools}) must align to toolStep ${m.toolStep} from toolMin`);
      sok = false;
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  if (!validateLocaleCopies(p, raw, 'context-budget', scenarioIds || undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}

function validateAgentEvent(ip, event, index, total) {
  if (event === null || typeof event !== 'object' || Array.isArray(event)) {
    ip.fail(`expected an event object, got ${describe(event)}`);
    return false;
  }
  let ok = ip.fields(
    event,
    ['kind', 'copy'],
    ['kind', 'tool', 'args', 'status', 'reason', 'copy']
  );
  const kp = ip.child('kind');
  if (!kp.enum(event.kind, ['decision', 'tool_call', 'tool_result', 'stop'])) return false;

  const optional = (key) => Object.prototype.hasOwnProperty.call(event, key);
  if (event.kind === 'decision') {
    for (const key of ['tool', 'args', 'status', 'reason']) {
      if (optional(key)) {
        ip.child(key).fail(`${key} is not allowed on a decision event`);
        ok = false;
      }
    }
  } else if (event.kind === 'tool_call') {
    if (!optional('tool')) {
      ip.child('tool').fail('tool_call requires a tool name');
      ok = false;
    }
    for (const key of ['status', 'reason']) {
      if (optional(key)) {
        ip.child(key).fail(`${key} is not allowed on a tool_call event`);
        ok = false;
      }
    }
    if (optional('args') && !ip.child('args').text(event.args, LIMITS.args)) ok = false;
  } else if (event.kind === 'tool_result') {
    if (!optional('tool')) {
      ip.child('tool').fail('tool_result requires a tool name');
      ok = false;
    }
    for (const key of ['args', 'reason']) {
      if (optional(key)) {
        ip.child(key).fail(`${key} is not allowed on a tool_result event`);
        ok = false;
      }
    }
    if (!ip.child('status').enum(event.status, ['ok', 'error'])) ok = false;
  } else {
    for (const key of ['tool', 'args', 'status']) {
      if (optional(key)) {
        ip.child(key).fail(`${key} is not allowed on a stop event`);
        ok = false;
      }
    }
    if (!ip.child('reason').enum(event.reason, ['answered', 'budget-exhausted'])) ok = false;
    if (index !== total - 1) {
      kp.fail('the stop event must be the last event of the sequence');
      ok = false;
    }
  }
  if (optional('tool') && !ip.child('tool').text(event.tool, LIMITS.tool)) {
    ok = false;
  } else if (optional('tool') && !TOOL_RE.test(event.tool)) {
    ip.child('tool').fail(`tool name must match ${TOOL_RE}`);
    ok = false;
  }

  const cp = ip.child('copy');
  if (!cp.keys(event.copy, LOCALES)) {
    ok = false;
  } else {
    for (const lang of LOCALES) {
      const lp = cp.child(lang);
      if (!lp.keys(event.copy[lang], ['text'])) {
        ok = false;
      } else if (!lp.child('text').text(event.copy[lang].text, LIMITS.eventText)) {
        ok = false;
      }
    }
  }
  return ok;
}

function validateAgentLoop(p, raw) {
  let ok = true;
  const mp = p.child('model');
  if (!mp.keys(raw.model, AGENT_MODEL_KEYS)) {
    ok = false;
  } else if (!mp.child('maxSteps').integer(raw.model.maxSteps, 2, LIMITS.events)) {
    ok = false;
  }

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, ['id', 'outcome', 'events']);
    if (!ip.child('outcome').enum(scenario.outcome, ['success', 'recovery', 'budget-exhausted'])) {
      sok = false;
    }
    const ep = ip.child('events');
    if (!Array.isArray(scenario.events) || scenario.events.length < 2 || scenario.events.length > LIMITS.events) {
      ep.fail(`expected 2..${LIMITS.events} events (finite author-written sequence)`);
      return false;
    }
    const maxSteps =
      isPlainObject(raw.model) && Number.isInteger(raw.model.maxSteps)
        ? raw.model.maxSteps
        : LIMITS.events;
    if (scenario.events.length > maxSteps) {
      ep.fail(`sequence of ${scenario.events.length} events exceeds model.maxSteps (${maxSteps})`);
      sok = false;
    }
    scenario.events.forEach((event, i) => {
      if (!validateAgentEvent(ep.index(i), event, i, scenario.events.length)) sok = false;
    });

    const stops = scenario.events.filter((e) => e && typeof e === 'object' && e.kind === 'stop');
    if (stops.length !== 1) {
      ep.fail(`expected exactly one stop event, found ${stops.length}`);
      sok = false;
    }
    const last = scenario.events[scenario.events.length - 1];
    const lastStop = last && typeof last === 'object' && last.kind === 'stop' ? last : null;
    if (scenario.outcome === 'success') {
      if (!lastStop || lastStop.reason !== 'answered') {
        ep.fail('success sequences must end with a stop event with reason "answered"');
        sok = false;
      }
    } else if (scenario.outcome === 'recovery') {
      const errIdx = scenario.events.findIndex(
        (e) => e && typeof e === 'object' && e.kind === 'tool_result' && e.status === 'error'
      );
      const recoveryIdx = scenario.events.findIndex(
        (e, i) => i > errIdx && e && typeof e === 'object' && e.kind === 'decision'
      );
      if (errIdx === -1) {
        ep.fail('recovery sequences must include a tool_result with status "error"');
        sok = false;
      } else if (recoveryIdx === -1) {
        ep.fail(
          'recovery sequences must show an explicit recovery decision after the failure'
        );
        sok = false;
      }
      if (!lastStop || lastStop.reason !== 'answered') {
        ep.fail('recovery sequences must end with a stop event with reason "answered"');
        sok = false;
      }
    } else if (scenario.outcome === 'budget-exhausted') {
      if (!lastStop || lastStop.reason !== 'budget-exhausted') {
        ep.fail('budget sequences must end with a stop event with reason "budget-exhausted"');
        sok = false;
      }
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  if (!validateLocaleCopies(p, raw, 'agent-loop', scenarioIds || undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}

/**
 * Validate one spec object. Returns { ok, errors } with stable
 * `{ file, field, message }` error records (field paths use dotted/indexed
 * notation, e.g. `scenarios[1].tools`).
 */
export function validateSpec(raw, { file = '<inline>' } = {}) {
  const errors = [];
  const p = new PathCtx(errors, file, '$');
  if (!isPlainObject(raw)) {
    p.fail('spec must be a JSON object');
    return { ok: false, errors };
  }
  if (!validateCommon(p, raw)) return { ok: false, errors };
  const ok =
    raw.kind === 'context-budget'
      ? validateContextBudget(p, raw)
      : validateAgentLoop(p, raw);
  return { ok: ok && errors.length === 0, errors };
}

/** Format errors for CLI output: `file: field: message`. */
export function formatErrors(errors) {
  return errors.map((e) => `${e.file}: ${e.field}: ${e.message}`).join('\n');
}

/** Validate one registered teaching kind without importing unrelated kinds.
 * The registry and each custom element supply the SAME pure validator. */
export function validateWith(raw, kinds, validator, { file = '<inline>' } = {}) {
  const errors = [];
  const p = new PathCtx(errors, file, '$');
  if (!isPlainObject(raw)) {
    p.fail('spec must be a JSON object');
    return { ok: false, errors };
  }
  if (!validateCommon(p, raw, kinds)) return { ok: false, errors };
  const ok = validator(p, raw, {
    validateScenariosList,
    validateSourceRefs,
    validateSharedCopy,
    SHARED_COPY_KEYS,
    LIMITS,
    LOCALES,
  });
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export { validateContextBudget, validateAgentLoop, validateScenariosList, validateSourceRefs };

export const SHARED_COPY_KEYS = [
  'figureLabel', 'title', 'question', 'assumption', 'observe',
  'footerNote', 'referenceTitle', 'scenarioLabels',
];

/** Shared localized prose contract, independent of any teaching model. */
export function validateSharedCopy(lp, copy, scenarioIds) {
  let ok = true;
  for (const [field, limit] of Object.entries({
    figureLabel: LIMITS.figureLabel, title: LIMITS.title,
    question: LIMITS.question, assumption: LIMITS.note, observe: LIMITS.note,
    footerNote: LIMITS.footerNote, referenceTitle: LIMITS.label,
  })) {
    if (!lp.child(field).text(copy[field], limit)) ok = false;
  }
  if (scenarioIds) {
    const labels = lp.child('scenarioLabels');
    if (!labels.keys(copy.scenarioLabels, [...scenarioIds])) {
      ok = false;
    } else {
      for (const id of scenarioIds) {
        if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
      }
    }
  }
  return ok;
}
