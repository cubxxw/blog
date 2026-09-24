// Optional model interpretation boundary (issue #392 / batch B2).
//
// The model is a read-only, tool-free, bounded EXPLAINER. Verified action pin:
// anthropics/claude-code-action v1.0.231 → SDK 0.3.278 → CLI 2.1.278 (see
// docs/seo-model-boundary-proof.json). One small --json-schema with a single
// bounded `explanation` string is appended to the verified argv; the action's
// `structured_output` OUTPUT is consumed here through trusted code — never
// interpolated into shell source, never a source of metrics, status, markers
// or gate decisions.
//
// Persistence is allowlisted and sanitized ONLY: action outcome, a recognized
// error classification (pattern → constant enum, never raw text), the
// result/init message's subtype / is_error / turn count / model when present,
// and the run URL. Diagnostics values are revalidated against FIXED enums at
// this builder boundary (a syntactically bounded slug is not an allowlist) and
// every persisted reason is a FIXED constant — untrusted key names, statuses,
// subtypes, models or error text are never copied. Raw execution files,
// transcripts, prompts, tool messages, tokens and environment are never
// persisted or uploaded. Missing/invalid/failed interpretation still publishes
// deterministic evidence with an honest failed interpretation state and
// withheld text.
//
// The trusted preparation prompt is byte-bounded and allowlisted (identity,
// as-of, status and public-safe aggregates whose VALUES are validated: owned
// HTTPS URLs without query/fragment, strict dates, finite numbers, controlled
// enums). Raw GSC query strings, credentials and environment never enter it —
// and because the action logs the prompt unconditionally, a URL that carries a
// query payload is dropped entirely, never trimmed into the log.

import { isValidCalendarDate, isValidUtcTimestamp } from './gsc-dates.mjs';
import { validateOwnedUrl } from './seo-page-map.mjs';

export const INTERPRETATION_SCHEMA = 'seo-interpretation/1';
export const EXPLANATION_MAX_CHARS = 600;

// The exact --json-schema payload (boundary review: one bounded explanation
// string, additionalProperties:false; minLength aligns the schema with the
// trusted trim validation — a blank explanation is never a successful
// interpretation).
export const EXPLANATION_JSON_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    explanation: { type: 'string', minLength: 1, maxLength: EXPLANATION_MAX_CHARS },
  },
  required: ['explanation'],
  additionalProperties: false,
});

export const ACTION_OUTCOMES = ['success', 'failure', 'cancelled', 'skipped'];
export const ACTION_CONCLUSIONS = ['success', 'failure'];
// SDKResult subtype enum (claude-agent-sdk 0.3.278); anything else is unknown.
export const RESULT_SUBTYPES = [
  'success',
  'error_during_execution',
  'error_max_turns',
  'error_max_budget_usd',
  'error_max_structured_output_retries',
];
export const ERROR_RESULT_SUBTYPES = RESULT_SUBTYPES.filter((s) => s !== 'success');
export const ERROR_CLASSES = [
  'none',
  'action-failed',
  'missing-output',
  'malformed-output',
  'invalid-type',
  'extra-keys',
  'blank-output',
  'overlong-output',
  'auth',
  'quota',
  'rate-limit',
  'model',
  'network',
  'timeout',
  'unknown',
];

// FIXED problem constants: persisted reasons never carry untrusted content.
export const PROBLEMS = Object.freeze({
  missing: 'structured-output-missing',
  malformed: 'structured-output-malformed',
  notObject: 'structured-output-not-object',
  keysMismatch: 'structured-output-keys-mismatch',
  explanationType: 'explanation-not-string',
  explanationBlank: 'explanation-blank',
  explanationOverlong: 'explanation-overlong',
  actionOutcomeUnknown: 'action-outcome-unknown',
  actionFailed: 'action-failed',
  actionErrorResult: 'action-result-error-subtype',
  actionIsError: 'action-result-is-error',
});

// Allowlisted pattern → constant enum. Input is transient; only the constant
// is ever persisted. Unknown shapes stay 'unknown' (never raw text, never an
// invented live cause).
const ERROR_PATTERNS = [
  ['auth', /\b(oauth|unauthorized|unauthenticated|401|invalid.?api.?key|token (is )?(invalid|expired)|credential)/i],
  ['quota', /\b(quota|credit|billing|exceeded your current|usage limit)/i],
  ['rate-limit', /\b(429|rate ?limit|too many requests)/i],
  ['timeout', /\b(timed? ?out|deadline exceeded|etimedout)/i],
  ['network', /\b(econnrefused|econnreset|enotfound|network|socket hang up|dns)/i],
  ['model', /\b(model (is )?(overloaded|unavailable|not found)|api error|internal server error|500|502|503|529)/i],
];

export function classifyModelError(errorText) {
  if (errorText === null || errorText === undefined || String(errorText).trim() === '') return 'unknown';
  const text = String(errorText).slice(0, 4000);
  for (const [label, pattern] of ERROR_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return 'unknown';
}

// Semantic revalidation at the builder boundary: enum membership, not just a
// syntactic shape. Unknown values degrade to null (missing metadata stays
// unknown) — they are never persisted as arbitrary text.
const asSubtype = (v) => (RESULT_SUBTYPES.includes(v) ? v : null);
const asConclusion = (v) => (ACTION_CONCLUSIONS.includes(v) ? v : null);
const asModel = (v) => (typeof v === 'string' && /^claude-[a-z0-9][a-z0-9._-]{0,62}$/i.test(v) ? v : null);
const asBool = (v) => (typeof v === 'boolean' ? v : null);
const asTurns = (v) => (Number.isInteger(v) && v >= 0 && v <= 10000 ? v : null);

// Strict structured-output validation. Exactly one key, exactly the schema
// instance the CLI was given (with a non-blank explanation): any malformed /
// extra-key / wrong-type / blank / overlong output fails with a distinct
// class. Raw input is never persisted — problems are FIXED constants.
export function validateStructuredOutput(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ok: false, errorClass: 'missing-output', value: null, problems: [PROBLEMS.missing] };
  }
  let parsed;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return { ok: false, errorClass: 'malformed-output', value: null, problems: [PROBLEMS.malformed] };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, errorClass: 'invalid-type', value: null, problems: [PROBLEMS.notObject] };
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== 'explanation') {
    // Constant reason only: untrusted key names are never persisted.
    return { ok: false, errorClass: 'extra-keys', value: null, problems: [PROBLEMS.keysMismatch] };
  }
  const explanation = parsed.explanation;
  if (typeof explanation !== 'string') {
    return { ok: false, errorClass: 'invalid-type', value: null, problems: [PROBLEMS.explanationType] };
  }
  if (explanation.trim() === '') {
    return { ok: false, errorClass: 'blank-output', value: null, problems: [PROBLEMS.explanationBlank] };
  }
  if (explanation.length > EXPLANATION_MAX_CHARS) {
    return { ok: false, errorClass: 'overlong-output', value: null, problems: [PROBLEMS.explanationOverlong] };
  }
  return { ok: true, errorClass: 'none', value: { explanation }, problems: [] };
}

// Transient extraction from the raw execution file: the ACTUAL v1.0.231 format
// is JSON.stringify(messages, null, 2) — a pretty JSON ARRAY of messages
// (base-action/src/execution-file.ts). NDJSON is accepted as a compatibility
// shape. ONLY the allowlisted metadata of the LAST `type: "result"` message
// (subtype / is_error / num_turns / a CONSTANT error class derived from its
// `errors` field) plus the model from the `system`/`init` message is copied.
// Everything else (transcripts, prompts, tool output, result text, raw error
// strings) is dropped and the raw file is never persisted or uploaded.
export function extractResultFields(executionRaw) {
  const out = { subtype: null, isError: null, turns: null, model: null, errorClass: 'none' };
  if (typeof executionRaw !== 'string' || executionRaw.trim() === '') return out;
  const messages = [];
  // Actual format: one pretty JSON array.
  try {
    const parsed = JSON.parse(executionRaw);
    if (Array.isArray(parsed)) messages.push(...parsed);
    else if (parsed && typeof parsed === 'object') messages.push(parsed);
  } catch {
    // Compatibility shape: NDJSON, one message per line.
    for (const line of executionRaw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed[0] !== '{') continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object') messages.push(obj);
      } catch {
        // non-JSON log line: ignored, never persisted
      }
    }
  }
  let result = null;
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) continue;
    if (msg.type === 'system' && out.model === null) {
      out.model = asModel(msg.model); // init message may carry the model
    }
    if (msg.type === 'result') result = msg;
  }
  if (result) {
    out.subtype = asSubtype(result.subtype);
    out.isError = asBool(result.is_error);
    out.turns = asTurns(result.num_turns);
    if (out.model === null) out.model = asModel(result.model); // result may not
    // The action has no error-text OUTPUT: recognized causes come only from
    // the result message's bounded `errors` field, classified transiently to a
    // constant enum. The raw strings never leave this function.
    if (Array.isArray(result.errors)) {
      const text = result.errors.filter((e) => typeof e === 'string').join(' ').slice(0, 4000);
      if (text.trim() !== '') out.errorClass = classifyModelError(text);
    }
  }
  return out;
}

export function sanitizeRunUrl(runUrl, repository) {
  if (typeof runUrl !== 'string' || typeof repository !== 'string') return null;
  const re = new RegExp(`^https://github\\.com/${repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/actions/runs/\\d+$`);
  return re.test(runUrl) ? runUrl : null;
}

// Build the persisted interpretation record (the ONLY model-derived artifact
// that may cross to the trusted publisher). All diagnostic values are
// revalidated here; all problems are FIXED constants.
export function buildInterpretationRecord({
  actionOutcome,
  conclusion = null,
  structuredOutputRaw = null,
  resultFields = {},
  errorText = null,
  runUrl = null,
  repository = null,
  observedAt,
}) {
  const problems = [];
  const outcomeKnown = ACTION_OUTCOMES.includes(actionOutcome);
  const outcome = outcomeKnown ? actionOutcome : 'skipped';
  if (!outcomeKnown) problems.push(PROBLEMS.actionOutcomeUnknown);

  // Builder-boundary revalidation: enums and bounded values only.
  const fields = {
    subtype: asSubtype(resultFields.subtype),
    isError: asBool(resultFields.isError),
    turns: asTurns(resultFields.turns),
    model: asModel(resultFields.model),
    errorClass: ERROR_CLASSES.includes(resultFields.errorClass) ? resultFields.errorClass : 'unknown',
  };

  const validated = validateStructuredOutput(structuredOutputRaw);
  // Recognized causes: explicit errorText first, else the transient class
  // derived from the result message's errors field (both constant-only).
  const classifiedText = classifyModelError(errorText);
  const classified = classifiedText !== 'unknown'
    ? classifiedText
    : (fields.errorClass !== 'unknown' && fields.errorClass !== 'none' ? fields.errorClass : 'unknown');
  const errorSubtype = fields.subtype !== null && ERROR_RESULT_SUBTYPES.includes(fields.subtype);

  let status = 'ok';
  if (outcome !== 'success') {
    // A failed action is a failed interpretation even when output exists.
    status = 'failed';
    if (!validated.ok) problems.push(...validated.problems);
    else problems.push(PROBLEMS.actionFailed);
  } else if (fields.isError === true) {
    status = 'failed';
    problems.push(PROBLEMS.actionIsError);
  } else if (errorSubtype) {
    // An explicit unsuccessful result subtype cannot be called success even
    // when is_error=false and the structured output parses.
    status = 'failed';
    problems.push(PROBLEMS.actionErrorResult);
  } else if (!validated.ok) {
    status = 'failed';
    problems.push(...validated.problems);
  }

  // Recognized causes survive every failure branch; unknown never invents the
  // live cause (a generic action-failed for an unrecognized failed action).
  let errorClass = 'none';
  if (status === 'failed') {
    if (classified !== 'unknown') errorClass = classified;
    else if (!validated.ok) errorClass = validated.errorClass;
    else if (outcome !== 'success') errorClass = 'action-failed';
    else errorClass = 'unknown';
  }

  const accepted = status === 'ok';
  return {
    schema: INTERPRETATION_SCHEMA,
    status,
    action: {
      outcome,
      conclusion: asConclusion(conclusion),
    },
    diagnostics: {
      errorClass,
      subtype: fields.subtype,
      isError: fields.isError,
      turns: fields.turns,
      model: fields.model,
      runUrl: sanitizeRunUrl(runUrl, repository),
    },
    interpretation: {
      text: accepted ? validated.value.explanation : null,
      withheld: !accepted,
      reasons: accepted ? [] : (problems.length > 0 ? problems : [PROBLEMS.actionFailed]),
    },
    observedAt,
    notes: [
      'model text is optional untrusted interpretation; it never replaces metrics, status, markers or gate decisions',
      'only allowlisted sanitized diagnostics are persisted; raw execution files are never uploaded',
    ],
  };
}

// Marker safety for any untrusted text entering an issue body: the same
// defang applySection uses, so a quoted `<!-- /section:seo -->` stays inert.
export function defangMarkers(text) {
  return String(text ?? '').replaceAll('<!--', '&lt;!--').replaceAll('-->', '--&gt;');
}

const PROMPT_MAX_BYTES = 6000;
const TRUNCATION_SUFFIX = '\n…(prompt truncated to the byte bound)';

// ---------------------------------------------------------------------------
// Public-safe prompt assembly. VALUES are validated, not just field names:
//   * URLs must pass the owned HTTPS production shape (no userinfo, query or
//     fragment) or the line is dropped entirely;
//   * dates/timestamps are strict; aggregates must be finite numbers;
//   * status/outcome/kind strings come from FIXED enums (else 'unknown'/skip);
//   * repository identity is checked; queryEvidence is never read at all.
// ---------------------------------------------------------------------------

const FRESHNESS_STATUSES = ['fresh', 'stale', 'unknown', 'partial', 'missing', 'no-usable-current', 'uncertified'];
const TARGET_OUTCOMES = ['success', 'partial', 'failed', 'missing'];
const OBSERVATION_KINDS = ['missing-description', 'missing-description-historical', 'metric-regression', 'metric-regression-historical', 'metric-over-target', 'low-ctr-signal'];
const TREND_STATUSES = ['comparable', 'not-comparable'];
const STRATEGIES = ['mobile', 'desktop'];
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const safeUrl = (v) => (validateOwnedUrl(v).ok ? v : null);
const safeRepo = (v) => (typeof v === 'string' && REPO_RE.test(v) ? v : 'unverified');
const safeDate = (v) => (isValidCalendarDate(v) ? v : 'unknown');
const safeStamp = (v) => (isValidUtcTimestamp(v) ? v : 'unknown');
const safeEnum = (v, allowed) => (allowed.includes(v) ? v : 'unknown');
const safeInt = (v) => (Number.isInteger(v) && Number.isFinite(v) ? String(v) : '?');
const safeNum = (v, digits = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '?');

export function buildInterpretationPrompt({ report, repository, runDate, asOf }) {
  const lines = [];
  lines.push(`REPO: ${safeRepo(repository)}`);
  lines.push(`RUN DATE (UTC identity): ${safeDate(runDate)} · evidence as-of ${safeStamp(asOf)}`);
  lines.push('You are the optional SEO interpreter for a Hugo blog. The deterministic');
  lines.push('evidence below is the source of truth. Reply with at most 600 characters');
  lines.push('of plain-text interpretation in the structured output; no tools, no files.');
  lines.push('');
  const src = report?.sources ?? {};
  const freshness = (f) => {
    if (!f || typeof f !== 'object') return 'unknown';
    const status = safeEnum(f.status, FRESHNESS_STATUSES);
    return `${status} (${f.fresh === true ? 'fresh' : f.fresh === false ? 'not fresh' : 'freshness unknown'})`;
  };
  const latest = (v) => (isValidCalendarDate(v) || isValidUtcTimestamp(v) ? v : 'unknown');
  lines.push(`STATUS GSC: ${freshness(src.gsc?.freshness)} · latest data date ${latest(src.gsc?.freshness?.latestDataDate)}`);
  lines.push(`STATUS PSI: ${freshness(src.psi?.freshness)} · latest measurement ${latest(src.psi?.freshness?.latestMeasurementAt)}`);
  lines.push(`STATUS CrUX: ${freshness(src.crux?.freshness)} · latest window end ${latest(src.crux?.freshness?.latestCollectionDate)} (no-sample = unknown, never zero)`);
  const win = (w) => {
    if (!w || typeof w !== 'object') return 'no counted evidence';
    const m = w.metrics ?? {};
    return `${safeDate(w.start)}..${safeDate(w.end)}: ${safeInt(m.clicks)} clicks / ${safeInt(m.impressions)} impressions / position ${safeNum(m.position)}`;
  };
  lines.push(`GSC current 28d ${win(report?.gscWindows?.current)}`);
  lines.push(`GSC previous 28d ${win(report?.gscWindows?.previous)}`);
  const trendStatus = safeEnum(report?.trend?.status, TREND_STATUSES);
  lines.push(`TREND: ${trendStatus === 'comparable' ? 'comparable (non-overlapping 28+28)' : 'not comparable'}`);
  // Quality distinction preserved: partial-usable and failed slots are shown
  // separately — 22 usable partial + 4 failed is never flattened to 0/26.
  for (const strategy of STRATEGIES) {
    const c = src.psi?.denominators?.[strategy];
    if (!c || typeof c !== 'object') continue;
    lines.push(`PSI plan ${strategy}: ${safeInt(c.succeeded)} ok / ${safeInt(c.partial)} partial-usable / ${safeInt(c.failed)} failed / ${safeInt(c.missing)} missing (planned ${safeInt(c.planned)}, usable ${safeInt(c.usable)})`);
  }
  for (const t of (src.psi?.targets ?? []).slice(0, 6)) {
    const url = safeUrl(t?.url);
    const strategy = STRATEGIES.includes(t?.strategy) ? t.strategy : 'unknown';
    const outcome = safeEnum(t?.currentOutcome, TARGET_OUTCOMES);
    if (url === null || outcome === 'unknown' || outcome === 'success') continue; // non-success only
    lines.push(`PSI non-success: ${url} [${strategy}] → ${outcome}`);
  }
  const actionable = (report?.observations ?? []).filter((o) => o && o.actionable === true).slice(0, 6);
  lines.push(`ACTIONABLE deterministic observations: ${actionable.length}`);
  for (const o of actionable) {
    const kind = OBSERVATION_KINDS.includes(o.kind) ? o.kind : null;
    const url = o.targetUrl === undefined || o.targetUrl === null ? 'site-wide' : safeUrl(o.targetUrl);
    if (kind === null || url === null) continue; // allowlisted kind + owned URL only
    lines.push(`- [${kind}] ${url}`);
  }
  lines.push('');
  lines.push('Boundaries: low CTR alone never authorizes a copy change; query strings are');
  lines.push('deliberately withheld from this prompt; do not invent pages, numbers or causes.');

  let text = lines.join('\n');
  const suffixBytes = Buffer.byteLength(TRUNCATION_SUFFIX, 'utf8');
  if (Buffer.byteLength(text, 'utf8') + suffixBytes <= PROMPT_MAX_BYTES) return text;
  // Bounded hard stop: the suffix counts AGAINST the cap and cuts happen on
  // line boundaries, so the result is complete UTF-8 inside the bound.
  while (text !== '' && Buffer.byteLength(text, 'utf8') + suffixBytes > PROMPT_MAX_BYTES) {
    const idx = text.lastIndexOf('\n');
    text = idx > 0 ? text.slice(0, idx) : '';
  }
  return `${text}${TRUNCATION_SUFFIX}`;
}
