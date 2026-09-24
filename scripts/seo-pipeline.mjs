#!/usr/bin/env node
// Trusted SEO pipeline adapter CLI (issue #392 / batch B2).
//
// Orchestrates the frozen run semantics around the ACCEPTED A/B1 interfaces
// (collectors/report/gate are reused unchanged):
//
//   plan           freeze the UTC report date and plan EXACT unique artifact
//                  paths per collector/run attempt (bound to runId+attempt)
//   stage          validate one collector stage: process outcome AND the exact
//                  new artifact (B1 normalizers; old files are never borrowed)
//   report         report adapter: exit 0/2 + complete valid artifacts + the
//                  expected identity/cutoff => generated (fresh|degraded);
//                  anything else is a failed report stage
//   interpretation validate the optional model structured output and persist
//                  ONLY allowlisted sanitized diagnostics (never raw text)
//   prompt         build the byte-bounded public-safe interpretation prompt
//   compose        trusted section composition (deterministic evidence first;
//                  model text literal/withheld; honest failure sections)
//   review-state   B2's bounded read-only GitHub adapter (seo-review-state/1)
//   freeze         freeze decisionAt AFTER collection + review-state read
//                  (Hugo clock / report as-of / gate decision-at share it)
//   aggregate      required-stage status: nonzero when any required stage
//                  failed; optional interpretation is reported, never blocking
//
// Boundaries: no collector/report/gate API changes, no model calls, no issue
// writes here (the publisher wrappers own those), no raw execution files or
// transcripts persisted or uploaded. Every command has explicit usage/error
// exits and no import side effects.
//
// Exit semantics:
//   0 = command succeeded (interpretation records a FAILED interpretation as a
//       successful record write; zero candidates is a safe compose outcome)
//   1 = invalid usage/config/IO, or a required stage/aggregate that is failed

import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { GscError, safeErrorMessage } from './lib/gsc-errors.mjs';
import { isValidCalendarDate, isValidUtcTimestamp, parseUtcTimestamp } from './lib/gsc-dates.mjs';
import {
  RUN_CONTEXT_SCHEMA,
  RUN_PLAN_SCHEMA,
  freezeUtc,
  frozenReportDate,
  inspectPlannedArtifact,
  planRun,
  reportWindow,
} from './lib/seo-run-context.mjs';
import {
  PIPELINE_STATUS_SCHEMA,
  aggregateStages,
  collectorStage,
  interpretationStage,
  publishStage,
  reportStage,
} from './lib/seo-stages.mjs';
import {
  INTERPRETATION_SCHEMA,
  buildInterpretationPrompt,
  buildInterpretationRecord,
  extractResultFields,
} from './lib/seo-model-output.mjs';import { REVIEW_STATE_SCHEMA, collectReviewState } from './lib/seo-github-review.mjs';
import { composeAutofixSection, composeFailureSection, composeSeoSection } from './lib/seo-compose.mjs';
import { GATE_SCHEMA } from './lib/seo-candidates.mjs';

export const COMMANDS = ['plan', 'stage', 'report', 'interpretation', 'prompt', 'compose', 'review-state', 'freeze', 'aggregate'];
const USAGE = 'Usage: node scripts/seo-pipeline.mjs <plan|stage|report|interpretation|prompt|compose|review-state|freeze|aggregate> [options] (see --help)';

function parseFlags(argv) {
  const opts = { _: [] };
  // Repeatable options accumulate; every other option is strictly scalar and
  // a duplicate is rejected instead of silently overwriting the earlier value.
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      opts._.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    let key;
    let val;
    if (eq !== -1) {
      key = arg.slice(2, eq);
      val = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        val = true; // boolean flag
      } else {
        val = next;
        i += 1;
      }
    }
    if (REPEATABLE.has(key)) {
      opts[key] = [...(Array.isArray(opts[key]) ? opts[key] : []), val];
      continue;
    }
    if (seen.has(key)) {
      throw new GscError(`Duplicate option --${key}: scalar options accept exactly one value (--stage may repeat).`, { kind: 'cli' });
    }
    seen.add(key);
    opts[key] = val;
  }
  return opts;
}

const REPEATABLE = new Set(['stage']);

function value(opts, key, { required = true } = {}) {
  const v = opts[key];
  if (v === undefined || v === true) {
    if (required) throw new GscError(`Missing required --${key}.`, { kind: 'cli' });
    return null;
  }
  return v;
}

function intOf(opts, key, { required = true } = {}) {
  const v = value(opts, key, { required });
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new GscError(`--${key} must be an integer.`, { kind: 'cli' });
  return n;
}

function writeJson(path, obj) {
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
}

function appendGithubOutput(path, entries) {
  const lines = Object.entries(entries).map(([k, v]) => `${k}=${v}`);
  writeFileSync(path, `${lines.join('\n')}\n`, { flag: 'a' });
}

function readJsonFile(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new GscError(`Cannot read ${label} file ${path}.`, { kind: 'cli' });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new GscError(`${label} file ${path} is not valid JSON.`, { kind: 'cli' });
  }
}

function readOptionalInterpretation(path) {
  try {
    const record = readJsonFile(path, 'interpretation');
    if (record?.schema === INTERPRETATION_SCHEMA) return record;
  } catch {
    // Missing or malformed optional evidence must not fail required stages.
  }
  return buildInterpretationRecord({
    actionOutcome: 'skipped',
    structuredOutputRaw: '{malformed-optional-interpretation',
    observedAt: freezeUtc(),
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdPlan(opts, { env, log }) {
  const repository = value(opts, 'repository', { required: false }) ?? env.GITHUB_REPOSITORY ?? null;
  const createdAt = freezeUtc();
  const reportDate = value(opts, 'report-date', { required: false }) ?? frozenReportDate(new Date(createdAt));
  const plan = planRun({
    repository,
    runId: value(opts, 'run-id'),
    attempt: intOf(opts, 'attempt', { required: false }) ?? 1,
    reportDate,
    dataDir: value(opts, 'data-dir', { required: false }) ?? 'data/seo',
    createdAt,
  });
  const out = value(opts, 'out');
  writeJson(out, plan);
  log(`${out}: planned run ${plan.runId} (report date ${plan.reportDate}, artifacts bound per collector)`);
  const ghOut = value(opts, 'github-output', { required: false });
  if (ghOut) {
    appendGithubOutput(ghOut, {
      report_date: plan.reportDate,
      created_at: plan.createdAt,
      gsc_out: plan.collectors.gsc.artifact,
      psi_out: plan.collectors.psi.artifact,
      crux_out: plan.collectors.crux.artifact,
    });
  }
  return 0;
}

function cmdStage(opts, { log }) {
  const kind = value(opts, 'kind');
  const exitCode = intOf(opts, 'exit-code');
  const out = value(opts, 'out');
  const common = {
    runId: value(opts, 'run-id', { required: false }) ?? 'unbound',
    attempt: intOf(opts, 'attempt', { required: false }) ?? 1,
    reportDate: value(opts, 'report-date', { required: false }) ?? 'unknown',
  };
  if (kind === 'publish') {
    const record = publishStage({ ...common, exitCode, target: value(opts, 'target', { required: false }) ?? 'daily-issue' });
    writeJson(out, record);
    log(`${out}: publish stage ${record.result.status}`);
    return record.result.status === 'succeeded' ? 0 : 1;
  }
  if (!['gsc', 'psi', 'crux'].includes(kind)) {
    throw new GscError(`--kind must be gsc|psi|crux|publish (received ${JSON.stringify(kind)}).`, { kind: 'cli' });
  }
  const plan = readJsonFile(value(opts, 'plan'), 'plan');
  if (plan?.schema !== RUN_PLAN_SCHEMA) throw new GscError(`--plan must be ${RUN_PLAN_SCHEMA}.`, { kind: 'cli' });
  const planned = plan.collectors?.[kind];
  if (!planned) throw new GscError(`--plan has no ${kind} collector entry.`, { kind: 'cli' });
  const artifactInfo = inspectPlannedArtifact({ planned });
  const record = collectorStage({
    kind,
    planned,
    artifactInfo,
    ...common,
    runId: plan.runId ?? common.runId,
    attempt: plan.attempt ?? common.attempt,
    reportDate: plan.reportDate ?? common.reportDate,
    exitCode,
  });
  writeJson(out, record);
  log(`${out}: collect-${kind} ${record.result.status}/${record.result.outcome}${record.reasons.length ? ` (${record.reasons[0]})` : ''}`);
  return record.result.status === 'succeeded' ? 0 : 1;
}

function cmdReport(opts, { log }) {
  const exitCode = intOf(opts, 'exit-code');
  const out = value(opts, 'out');
  const record = reportStage({
    runId: value(opts, 'run-id', { required: false }) ?? 'unbound',
    attempt: intOf(opts, 'attempt', { required: false }) ?? 1,
    reportDate: value(opts, 'report-date', { required: false }) ?? 'unknown',
    exitCode,
    reportPath: value(opts, 'report'),
    markdownPath: value(opts, 'markdown'),
    // actual dependency wiring: the adapter reads the real artifacts
    fs: { readFileSync },
    expected: {
      asOf: value(opts, 'expect-as-of', { required: false }) ?? undefined,
      runDate: value(opts, 'expect-run-date', { required: false }) ?? undefined,
      start: value(opts, 'expect-start', { required: false }) ?? undefined,
      end: value(opts, 'expect-end', { required: false }) ?? undefined,
    },
  });
  writeJson(out, record);
  log(`${out}: report stage ${record.result.status} (generated=${record.result.generated}, evidence=${record.result.evidence})`);
  return record.result.status === 'succeeded' ? 0 : 1;
}

function cmdInterpretation(opts, { env, log }) {
  const structuredRaw = opts['structured-output-env'] ? env[opts['structured-output-env']] ?? null : null;
  const errorText = opts['error-env'] ? env[opts['error-env']] ?? null : null;
  // Transient, bounded execution-file read: allowlisted metadata only; the raw
  // file is never persisted or uploaded.
  let executionRaw = null;
  const execPath = value(opts, 'execution-file', { required: false });
  if (execPath) {
    try {
      const stat = readFileSync(execPath, 'utf8');
      executionRaw = stat.length <= 2_000_000 ? stat : null; // oversized => metadata stays unknown
    } catch {
      executionRaw = null;
    }
  }
  const record = buildInterpretationRecord({
    actionOutcome: value(opts, 'action-outcome', { required: false }),
    conclusion: value(opts, 'conclusion', { required: false }),
    structuredOutputRaw: structuredRaw,
    resultFields: extractResultFields(executionRaw ?? ''),
    errorText,
    runUrl: value(opts, 'run-url', { required: false }),
    repository: value(opts, 'repository', { required: false }) ?? env.GITHUB_REPOSITORY ?? null,
    observedAt: freezeUtc(),
  });
  const out = value(opts, 'out');
  writeJson(out, record);
  log(`${out}: interpretation ${record.status} (errorClass ${record.diagnostics.errorClass}; text ${record.interpretation.withheld ? 'withheld' : 'accepted'})`);
  // Recording a FAILED interpretation is a successful record write (optional,
  // non-blocking); its state is explicit in the record and aggregate.
  return 0;
}

function cmdPrompt(opts, { log }) {
  const report = readJsonFile(value(opts, 'report'), 'report');
  const prompt = buildInterpretationPrompt({
    report,
    repository: value(opts, 'repository'),
    runDate: value(opts, 'run-date'),
    asOf: parseUtcTimestamp(value(opts, 'as-of'), '--as-of'),
  });
  const out = value(opts, 'out');
  writeFileSync(out, `${prompt}\n`);
  log(`${out}: bounded public-safe prompt (${Buffer.byteLength(prompt, 'utf8')} bytes)`);
  return 0;
}

function cmdCompose(opts, { log }) {
  const kind = value(opts, 'kind');
  const out = value(opts, 'out');
  const runDate = value(opts, 'run-date');
  // Optional inputs never block composition: a missing/unparseable optional
  // report degrades to the minimal failure block and a malformed optional
  // interpretation becomes a recorded failed/withheld interpretation.
  const optionalJson = (path, label) => {
    if (!path) return null;
    try {
      return readJsonFile(path, label);
    } catch {
      return null;
    }
  };
  const optionalInterpretation = (path) => {
    if (!path) return null;
    return readOptionalInterpretation(path);
  };
  let body;
  if (kind === 'seo') {
    const status = optionalJson(opts.status, 'status');
    let report = optionalJson(opts.report, 'report');
    // An existing-but-REJECTED report (failed stage) is never presented as
    // validated success; a missing/invalid report publishes the minimal block.
    const reportStageBrief = (status?.stages ?? []).find((s) => s.stage === 'report');
    if (report && reportStageBrief && reportStageBrief.generated !== true) report = null;
    body = composeSeoSection({
      report,
      interpretation: optionalInterpretation(opts.interpretation),
      status,
      runDate,
      asOf: parseUtcTimestamp(value(opts, 'as-of'), '--as-of'),
    });
  } else if (kind === 'autofix') {
    const gate = readJsonFile(value(opts, 'gate'), 'gate');
    const decisionAt = parseUtcTimestamp(value(opts, 'decision-at'), '--decision-at');
    if (gate?.schema !== GATE_SCHEMA || gate.mode !== 'proposal-only' || gate.apply?.available !== false ||
        !Array.isArray(gate.candidates) || !Array.isArray(gate.skipped) ||
        !isValidUtcTimestamp(gate.params?.decisionAt) || Date.parse(gate.params.decisionAt) !== Date.parse(decisionAt)) {
      throw new GscError('Invalid proposal gate or mismatched decision time.', { kind: 'cli' });
    }
    body = composeAutofixSection({ gate, runDate, decisionAt });
  } else if (kind === 'failure') {
    body = composeFailureSection({
      kind: 'failure-kind' in opts ? opts['failure-kind'] : 'seo',
      runDate,
      reasons: opts.reason ? [String(opts.reason)] : [],
      status: optionalJson(opts.status, 'status'),
    });
  } else {
    throw new GscError(`--kind must be seo|autofix|failure (received ${JSON.stringify(kind)}).`, { kind: 'cli' });
  }
  writeFileSync(out, `${body}\n`);
  log(`${out}: composed ${kind} section`);
  return 0;
}

async function cmdReviewState(opts, { env, log }) {
  const repository = value(opts, 'repository', { required: false }) ?? env.GITHUB_REPOSITORY ?? null;
  const state = await collectReviewState({
    repository,
    observedAt: freezeUtc(),
  });
  const out = value(opts, 'out');
  writeJson(out, state);
  log(`${out}: review state ${state.read.status}/${state.read.completeness} (proposals ${state.proposals.length}, backlog ${state.backlog?.relevantOpenCount ?? 'unknown'})`);
  // A failed read is a VALID record (B1 turns it into a visible safe skip).
  return 0;
}

function cmdFreeze(opts, { env, log }) {
  const decisionAt = value(opts, 'now', { required: false }) ?? freezeUtc();
  parseUtcTimestamp(decisionAt, '--now');
  const reportDate = value(opts, 'report-date', { required: false }) ?? frozenReportDate(new Date(decisionAt));
  if (!isValidCalendarDate(reportDate)) throw new GscError('--report-date must be a UTC calendar date.', { kind: 'cli' });
  const reviewState = opts['review-state'] ? readJsonFile(opts['review-state'], 'review-state') : null;
  if (reviewState) {
    const observed = reviewState.observedAt;
    if (!isValidUtcTimestamp(observed) || Date.parse(observed) > Date.parse(decisionAt)) {
      throw new GscError('freeze: review state must be observed at or before the decision time (collection + review read happen FIRST).', { kind: 'cli' });
    }
  }
  const sourceCommit = value(opts, 'source-commit', { required: false }) ?? null;
  if (sourceCommit !== null && !/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new GscError('--source-commit must be a 40-hex frozen SHA.', { kind: 'cli' });
  }
  const window = reportWindow({ asOf: decisionAt });
  const context = {
    schema: RUN_CONTEXT_SCHEMA,
    repository: value(opts, 'repository', { required: false }) ?? env.GITHUB_REPOSITORY ?? null,
    sourceCommit,
    reportDate,
    decisionAt,
    reviewObservedAt: reviewState?.observedAt ?? null,
    window,
    notes: [
      'decisionAt is frozen after Google collection and the read-only review-state read',
      'the same instant is Hugo --clock, seo-report --as-of and the gate --decision-at',
    ],
  };
  const out = value(opts, 'out');
  writeJson(out, context);
  log(`${out}: frozen decisionAt ${decisionAt} (report date ${reportDate}, window ${window.start}..${window.end})`);
  const ghOut = value(opts, 'github-output', { required: false });
  if (ghOut) {
    appendGithubOutput(ghOut, {
      report_date: context.reportDate,
      decision_at: context.decisionAt,
      window_start: window.start,
      window_end: window.end,
    });
  }
  return 0;
}

function cmdAggregate(opts, { log }) {
  const stagePaths = [].concat(opts.stage ?? []).filter((p) => typeof p === 'string');
  const interpPath = value(opts, 'interpretation', { required: false });
  if (stagePaths.length === 0 && !interpPath) throw new GscError('aggregate needs at least one --stage <file> (or --interpretation).', { kind: 'cli' });
  const stages = stagePaths.map((p) => readJsonFile(p, 'stage'));
  if (interpPath) {
    const record = readOptionalInterpretation(interpPath);
    stages.push(interpretationStage({ record, runId: value(opts, 'run-id', { required: false }) ?? 'unbound', attempt: intOf(opts, 'attempt', { required: false }) ?? 1, reportDate: value(opts, 'report-date', { required: false }) ?? 'unknown' }));
  }
  const status = aggregateStages({
    stages,
    runId: value(opts, 'run-id', { required: false }),
    attempt: intOf(opts, 'attempt', { required: false }),
    reportDate: value(opts, 'report-date', { required: false }),
  });
  const out = value(opts, 'out');
  writeJson(out, status);
  log(`${out}: aggregate ok=${status.ok} (required ${status.required.stages.length} stage(s), interpretation ${status.optional.interpretation})`);
  return status.ok ? 0 : 1;
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? console.log;
  const errorLog = deps.errorLog ?? console.error;
  try {
    const [command, ...rest] = argv;
    if (!command || command === '--help' || command === '-h' || command === 'help') {
      log(USAGE);
      log('Exit: 0 = command succeeded (zero candidates / recorded failed interpretation included); 1 = invalid usage or failed required stage/aggregate. Proposal-only; apply unavailable.');
      return 0;
    }
    if (!COMMANDS.includes(command)) {
      throw new GscError(`Unknown command: ${command}. ${USAGE}`, { kind: 'cli' });
    }
    const opts = parseFlags(rest);
    const ctx = { env: deps.env ?? process.env, log };
    switch (command) {
      case 'plan': return cmdPlan(opts, ctx);
      case 'stage': return cmdStage(opts, ctx);
      case 'report': return cmdReport(opts, ctx);
      case 'interpretation': return cmdInterpretation(opts, ctx);
      case 'prompt': return cmdPrompt(opts, ctx);
      case 'compose': return cmdCompose(opts, ctx);
      case 'review-state': return cmdReviewState(opts, ctx);
      case 'freeze': return cmdFreeze(opts, ctx);
      case 'aggregate': return cmdAggregate(opts, ctx);
      default: throw new GscError(`Unhandled command ${command}.`, { kind: 'cli' });
    }
  } catch (err) {
    errorLog(safeErrorMessage(err));
    return 1;
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().then((code) => {
    process.exitCode = code;
  });
}

export { PIPELINE_STATUS_SCHEMA, RUN_CONTEXT_SCHEMA, RUN_PLAN_SCHEMA, INTERPRETATION_SCHEMA, REVIEW_STATE_SCHEMA };
