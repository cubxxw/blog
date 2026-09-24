import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  RUN_PLAN_SCHEMA,
  freezeUtc,
  frozenReportDate,
  inspectPlannedArtifact,
  planRun,
  reportWindow,
} from './lib/seo-run-context.mjs';
import {
  aggregateStages,
  classifyCruxContent,
  classifyGscContent,
  classifyPsiContent,
  collectorStage,
  interpretationStage,
  publishStage,
  reportStage,
} from './lib/seo-stages.mjs';
import {
  ERROR_CLASSES,
  EXPLANATION_JSON_SCHEMA,
  EXPLANATION_MAX_CHARS,
  PROBLEMS,
  RESULT_SUBTYPES,
  buildInterpretationPrompt,
  buildInterpretationRecord,
  classifyModelError,
  defangMarkers,
  extractResultFields,
  sanitizeRunUrl,
  validateStructuredOutput,
} from './lib/seo-model-output.mjs';
import { REVIEW_LIMITS, collectReviewState, readChangedFiles } from './lib/seo-github-review.mjs';
import { composeAutofixSection, composeFailureSection, composeSeoSection } from './lib/seo-compose.mjs';
import { buildSnapshot as buildGscSnapshot } from './gsc-fetch.mjs';
import { buildSnapshot as buildPsiSnapshot } from './psi-fetch.mjs';
import { planMeasurements } from './lib/psi-measure.mjs';
import { main as seoReportMain } from './seo-report.mjs';

const RUN = { runId: '35989281749-1', attempt: 1, reportDate: '2026-09-24' };
const PLAN_CREATED = '2026-09-24T06:00:10.000Z';
const REAL_DATA_DIR = fileURLToPath(new URL('../data/seo/', import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures (contract shapes; no network, no clock, no credentials)
// ---------------------------------------------------------------------------

const fsMap = (files) => ({
  readFileSync(path) {
    if (!(path in files)) throw new Error(`ENOENT: ${path}`);
    return files[path];
  },
  existsSync(path) {
    return path in files;
  },
});

function cruxSnapshot({ fetchedAt = '2026-09-24T06:05:00.000Z', results }) {
  return {
    meta: {
      fetchedAt,
      runDate: '2026-09-24',
      origin: 'https://cubxxw.com',
      formFactors: ['PHONE', 'DESKTOP'],
      metrics: ['largest_contentful_paint'],
      warnings: [],
    },
    results,
  };
}

const cruxNoSampleRow = (formFactor) => ({ formFactor, notEligible: true });
const cruxErrorRow = (formFactor) => ({ formFactor, error: `CrUX ${formFactor} \u2192 500: boom with token=SECRET` });
const cruxNullRow = (formFactor) => ({ formFactor, record: null });
const cruxSampledRow = (formFactor) => ({
  formFactor,
  record: {
    key: { origin: 'https://cubxxw.com', formFactor },
    collectionPeriods: [
      { firstDate: { year: 2026, month: 8, day: 17 }, lastDate: { year: 2026, month: 9, day: 13 } },
    ],
    metrics: {
      largest_contentful_paint: { percentilesTimeseries: { p75s: [1800] } },
      cumulative_layout_shift: { percentilesTimeseries: { p75s: ['0.04'] } },
    },
  },
});

// PSI fixtures go through B1's own plan/summary builders so planned slots and
// counts always agree (a summary over deleted rows is the counterexample below).
function psiEntry(url, strategy, finalStatus = 'success', usable = true) {
  return {
    url,
    strategy,
    finalStatus,
    usable,
    reasonCategory: null,
    reasonBasis: null,
    attempts: 1,
    attemptLog: [],
    psiHttpStatus: 200,
    originHttpStatus: null,
    lighthouseRuntimeError: null,
    error: null,
    provenance: {
      fetchTime: '2026-09-24T06:08:00.000Z',
      lighthouseVersion: '12.8.0',
      configSettings: null,
      requestedUrl: url,
      finalUrl: url,
    },
    metrics: { LCP: { unit: 'ms', numericValue: 1900, precision: 'raw' }, CLS: { unit: 'unitless', numericValue: 0.05, precision: 'raw' } },
    seoAudits: { 'meta-description': { score: 1 } },
  };
}

function psiFixture({ urls = ['https://cubxxw.com/', 'https://cubxxw.com/a/'], strategies = ['mobile'], entries }) {
  const plan = planMeasurements({ urls, strategies });
  const rows = entries ?? plan.planned.map((p) => psiEntry(p.url, p.strategy));
  return buildPsiSnapshot({
    plan,
    entries: rows,
    meta: {
      runDate: '2026-09-24',
      startedAt: '2026-09-24T06:01:00.000Z',
      endedAt: '2026-09-24T06:10:00.000Z',
      endpoint: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
      apiKeyProvided: true,
      urlConfig: 'lighthouserc.json',
      categories: ['performance'],
      timeoutMs: 120000,
      maxAttempts: 3,
    },
  });
}

// GSC fixtures use A's actual snapshot builder and slice shape.
function gscSlice({ name, required, status }) {
  return {
    name,
    scope: 'fixture',
    purpose: 'fixture slice',
    required,
    dimensions: required ? ['date', 'page'] : ['date', 'page', 'device'],
    filterGroups: [],
    requestAggregationType: 'byPage',
    days: {
      '2026-09-20': {
        status,
        rows: [],
        response: { responseAggregationType: 'byPage' },
        truncated: false,
        conflict: null,
        warnings: [],
        error: status === 'complete' ? null : { kind: 'http', status: 403 },
      },
    },
  };
}

function gscFixture(runStatus, { optionalFails = false, requiredFails = false } = {}) {
  return buildGscSnapshot({
    property: 'sc-domain:cubxxw.com',
    host: 'cubxxw.com',
    window: { start: '2026-09-20', end: '2026-09-20' },
    runDate: '2026-09-24',
    fetchedAt: '2026-09-24T06:03:00.000Z',
    runStatus,
    availability: { status: 'observed', availableThrough: '2026-09-21' },
    slices: [
      gscSlice({ name: 'date_page', required: true, status: requiredFails ? 'failed' : 'complete' }),
      gscSlice({ name: 'date_page_device', required: false, status: optionalFails ? 'failed' : 'complete' }),
    ],
    error: null,
    config: { rowLimit: 25000, maxPages: 40 },
  });
}

const plannedFor = (kind, artifact, createdAt = PLAN_CREATED) => ({ kind, artifact, createdAt });

const bound = (json, { detail = 'ok', observedAt = json?.meta?.fetchedAt ?? null, path = 'data/seo/x.json' } = {}) => ({
  path,
  present: true,
  boundToRun: detail === 'ok',
  observedAt,
  detail,
  json,
});

const stage = (kind, json, exitCode = 0, extra = {}) => collectorStage({
  kind,
  planned: plannedFor(kind, `data/seo/${kind}-2026-09-24.json`),
  artifactInfo: bound(json),
  ...RUN,
  exitCode,
  ...extra,
});

// ---------------------------------------------------------------------------
// Run planning + artifact binding
// ---------------------------------------------------------------------------

test('planRun freezes the report date and plans exact unique collector artifacts', () => {
  const taken = new Set(['data/seo/gsc-2026-09-24.json']);
  const plan = planRun({
    repository: 'cubxxw/blog',
    runId: RUN.runId,
    attempt: RUN.attempt,
    reportDate: RUN.reportDate,
    createdAt: PLAN_CREATED,
    exists: (p) => taken.has(p),
    random: { gsc: () => 'abc123', psi: () => 'abc123', crux: () => 'abc123' },
  });
  assert.equal(plan.schema, RUN_PLAN_SCHEMA);
  assert.equal(plan.reportDate, '2026-09-24');
  assert.equal(plan.collectors.gsc.artifact, 'data/seo/gsc-2026-09-24-060010000Z-abc123.json');
  assert.equal(plan.collectors.psi.artifact, 'data/seo/psi-2026-09-24.json');
  assert.match(plan.collectors.crux.artifact, /^data\/seo\/crux-2026-09-24(-\d{9}Z-[0-9a-f]+)?\.json$/);
  for (const kind of ['gsc', 'psi', 'crux']) {
    assert.equal(plan.collectors[kind].createdAt, PLAN_CREATED);
  }
});

test('planRun refuses unsafe run ids and unfrozen dates', () => {
  for (const bad of [{ runId: '../evil' }, { runId: '' }, { reportDate: '2026-9-4' }, { reportDate: null }, { createdAt: 'not-a-time' }]) {
    assert.throws(() => planRun({
      repository: 'cubxxw/blog',
      runId: '1-1',
      attempt: 1,
      reportDate: '2026-09-24',
      createdAt: PLAN_CREATED,
      exists: () => false,
      ...bad,
    }), /planRun:/);
  }
});

test('frozen UTC helpers and the 56-day inclusive report window are deterministic', () => {
  const now = new Date('2026-09-24T08:30:05.123Z');
  assert.equal(freezeUtc(now), '2026-09-24T08:30:05.123Z');
  assert.equal(frozenReportDate(now), '2026-09-24');
  const w = reportWindow({ asOf: '2026-09-24T00:00:00Z' });
  assert.deepEqual(w, { start: '2026-07-27', end: '2026-09-20' }); // 56 days inclusive
  assert.deepEqual(reportWindow({ asOf: '2026-09-24T07:00:00Z' }), { start: '2026-07-28', end: '2026-09-21' });
  assert.throws(() => reportWindow({ asOf: '2026-02-30T00:00:00Z' }));
});

test('inspectPlannedArtifact binds only this run attempt\u2019s exact new artifact', () => {
  const planned = plannedFor('crux', 'data/seo/crux-2026-09-24.json');
  const missing = inspectPlannedArtifact({ planned, fs: fsMap({}) });
  assert.equal(missing.detail, 'missing');
  assert.equal(missing.present, false);

  const invalid = inspectPlannedArtifact({ planned, fs: fsMap({ 'data/seo/crux-2026-09-24.json': '{oops' }) });
  assert.equal(invalid.detail, 'invalid');

  const old = cruxSnapshot({ fetchedAt: '2026-09-24T05:00:00.000Z' });
  const notThisRun = inspectPlannedArtifact({
    planned,
    fs: fsMap({ 'data/seo/crux-2026-09-24.json': JSON.stringify(old) }),
  });
  assert.equal(notThisRun.detail, 'not-this-run');
  assert.equal(notThisRun.boundToRun, false);

  const fresh = inspectPlannedArtifact({
    planned,
    fs: fsMap({ 'data/seo/crux-2026-09-24.json': JSON.stringify(cruxSnapshot({})) }),
  });
  assert.equal(fresh.detail, 'ok');
  assert.equal(fresh.boundToRun, true);
  assert.equal(fresh.observedAt, '2026-09-24T06:05:00.000Z');
});

// ---------------------------------------------------------------------------
// Matrix case 1: certified CrUX notEligible is success / no-sample
// ---------------------------------------------------------------------------

test('case 1: two certified notEligible rows \u2192 collector success/no-sample', () => {
  const crux = stage('crux', cruxSnapshot({ results: [cruxNoSampleRow('PHONE'), cruxNoSampleRow('DESKTOP')] }));
  assert.equal(crux.result.status, 'succeeded');
  assert.equal(crux.result.outcome, 'no-sample');
});

// ---------------------------------------------------------------------------
// Matrix cases 2/3: raw CLI 0 never masks failed/invalid collection; no
// borrowing old files for a failed stage
// ---------------------------------------------------------------------------

test('case 2a: results[].error rows with raw exit 0 \u2192 failed/partial stage, aggregate nonzero', () => {
  const crux = stage('crux', cruxSnapshot({ results: [cruxErrorRow('PHONE'), cruxSampledRow('DESKTOP')] }));
  assert.equal(crux.result.status, 'failed');
  assert.equal(crux.result.outcome, 'partial');
  assert.match(crux.reasons.join('\n'), /crux-query-failed/);
  assert.equal(aggregateStages({ stages: [crux], ...RUN }).ok, false);
});

test('case 2b: HTTP-200 record:null rows \u2192 failed/invalid collection (never Google HTTP failure)', () => {
  const allNull = stage('crux', cruxSnapshot({ results: [cruxNullRow('PHONE'), cruxNullRow('DESKTOP')] }));
  assert.equal(allNull.result.status, 'failed');
  assert.equal(allNull.result.outcome, 'invalid');
  assert.match(allNull.reasons.join('\n'), /crux-record-invalid/);
});

test('case 3: a failed stage with no new artifact never borrows the older daily file', () => {
  const missingStage = collectorStage({
    kind: 'crux',
    planned: plannedFor('crux', 'data/seo/crux-2026-09-24-060500000Z-aaaaaa.json'),
    artifactInfo: { path: 'data/seo/crux-2026-09-24-060500000Z-aaaaaa.json', present: false, boundToRun: false, observedAt: null, detail: 'missing' },
    ...RUN,
    exitCode: 0, // raw collector exit 0 with nothing written still fails the stage
  });
  assert.equal(missingStage.result.status, 'failed');
  assert.equal(missingStage.result.outcome, 'unverified');
  assert.match(missingStage.reasons.join('\n'), /no-current-artifact/);

  const notBound = collectorStage({
    kind: 'crux',
    planned: plannedFor('crux', 'data/seo/crux-2026-09-24.json'),
    artifactInfo: bound(cruxSnapshot({ results: [cruxSampledRow('PHONE'), cruxSampledRow('DESKTOP')] }), { detail: 'not-this-run', observedAt: '2026-09-23T00:00:00.000Z' }),
    ...RUN,
    exitCode: 0,
  });
  assert.equal(notBound.result.status, 'failed');
  assert.equal(notBound.result.outcome, 'unverified');
  assert.match(notBound.reasons.join('\n'), /artifact-not-bound-to-run/);
});

// ---------------------------------------------------------------------------
// GSC stages through A's actual snapshot contract (runStatus ok/degraded/
// partial/failed; required vs optional slice failures stay distinct)
// ---------------------------------------------------------------------------

test('A GSC success \u2192 ok; optional-slice degraded is success with a distinct outcome', () => {
  const ok = stage('gsc', gscFixture('ok'));
  assert.equal(ok.result.status, 'succeeded');
  assert.equal(ok.result.outcome, 'ok');

  const degraded = stage('gsc', gscFixture('degraded', { optionalFails: true }));
  assert.equal(degraded.result.status, 'succeeded');
  assert.equal(degraded.result.outcome, 'degraded'); // never invalid, never plain ok
  assert.match(degraded.reasons.join('\n'), /gsc-optional-slices-degraded: 1/);
  const status = aggregateStages({ stages: [degraded], ...RUN });
  assert.equal(status.ok, true);
  assert.equal(status.stages[0].outcome, 'degraded'); // aggregate preserves the distinction
});

test('A GSC required failure and auth failure stay failed; inconsistent artifacts are invalid', () => {
  const partial = stage('gsc', gscFixture('partial', { requiredFails: true }), 1);
  assert.equal(partial.result.status, 'failed');
  assert.equal(partial.result.outcome, 'partial');

  const failed = stage('gsc', gscFixture('failed'), 1);
  assert.equal(failed.result.status, 'failed');
  assert.equal(failed.result.outcome, 'failed');

  // runStatus ok while slice days carry failures is an inconsistent artifact
  const inconsistent = stage('gsc', gscFixture('ok', { optionalFails: true }));
  assert.equal(inconsistent.result.status, 'failed');
  assert.equal(inconsistent.result.outcome, 'invalid');

  // degraded exit disagreement (nonzero exit over degraded content) is not success
  const disagree = stage('gsc', gscFixture('degraded', { optionalFails: true }), 1);
  assert.equal(disagree.result.status, 'failed');
});

// ---------------------------------------------------------------------------
// PSI stages through B1's plan/normalizer semantics (never counts-only)
// ---------------------------------------------------------------------------

test('PSI complete plan \u2192 ok; 22 partial-usable + 4 failed is partial evidence, never green', () => {
  const clean = stage('psi', psiFixture({}));
  assert.equal(clean.result.status, 'succeeded');
  assert.equal(clean.result.outcome, 'ok');

  const urls = Array.from({ length: 26 }, (_, i) => `https://cubxxw.com/p${i}/`);
  const plan = planMeasurements({ urls, strategies: ['mobile'] });
  const rows = plan.planned.map((p, i) => psiEntry(p.url, p.strategy, i < 22 ? 'partial' : 'failed', i < 22));
  const heavy = stage('psi', psiFixture({ urls, entries: rows }));
  assert.equal(heavy.result.status, 'failed');
  assert.equal(heavy.result.outcome, 'partial');
  assert.match(heavy.reasons.join('\n'), /psi-slot-failed: 4/);
  assert.match(heavy.reasons.join('\n'), /psi-slot-partial-usable: 22/);
});

test('PSI counterexample: measurements deleted under unchanged summary counts are rejected', () => {
  const snapshot = psiFixture({});
  assert.equal(classifyPsiContent(snapshot).ok, true); // real control passes

  const stripped = structuredClone(snapshot);
  stripped.measurements = []; // summary counts unchanged, rows gone
  const verdict = classifyPsiContent(stripped);
  assert.equal(verdict.ok, false);
  const asStage = stage('psi', stripped);
  assert.equal(asStage.result.status, 'failed');
  assert.match(asStage.reasons.join('\n'), /psi-artifact-inconsistent/);
});

test('PSI exit/content disagreement and uncertified plans are never success', () => {
  const disagree = stage('psi', psiFixture({}), 2);
  assert.equal(disagree.result.status, 'failed');

  const noPlan = psiFixture({});
  delete noPlan.meta.planned; // plan missing: completeness uncertifiable
  const verdict = classifyPsiContent(noPlan);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.outcome, 'unverified');
});

// ---------------------------------------------------------------------------
// Report adapter over the ACTUAL B1 CLI + real repository evidence
// ---------------------------------------------------------------------------

const reportExpected = { asOf: '2026-09-24T13:00:00Z', runDate: '2026-09-24', start: '2026-07-27', end: '2026-09-20' };

async function realReportArtifacts() {
  const dir = mkdtempSync(join(tmpdir(), 'b2-report-'));
  const jsonPath = join(dir, 'report.json');
  const mdPath = join(dir, 'section.md');
  const errors = [];
  const exitCode = await seoReportMain(
    ['--dir', REAL_DATA_DIR, '--start', reportExpected.start, '--end', reportExpected.end,
      '--as-of', reportExpected.asOf, '--run-date', reportExpected.runDate,
      '--out', jsonPath, '--markdown-out', mdPath],
    { now: () => new Date(reportExpected.asOf), log: () => {}, errorLog: (e) => errors.push(e) },
  );
  return { dir, jsonPath, mdPath, exitCode, errors };
}

test('actual B1 CLI over real data: exit 2 report is generated/degraded with matching markdown', async () => {
  const { jsonPath, mdPath, exitCode, errors } = await realReportArtifacts();
  assert.equal(exitCode, 2, 'real history at this cutoff is degraded evidence, generation succeeds');
  assert.deepEqual(errors, []);
  const st = reportStage({
    ...RUN,
    exitCode,
    reportPath: jsonPath,
    markdownPath: mdPath,
    expected: reportExpected,
    fs: { readFileSync },
  });
  assert.equal(st.result.status, 'succeeded');
  assert.equal(st.result.generated, true);
  assert.equal(st.result.evidence, 'degraded');
});

test('report counterexample: schema+params shell is never generated', async () => {
  const { jsonPath, mdPath, exitCode } = await realReportArtifacts();
  const real = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'b2-report-shell-'));
  const shellPath = join(dir, 'report.json');
  writeFileSync(shellPath, JSON.stringify({ schema: real.schema, params: real.params }));
  const st = reportStage({
    ...RUN,
    exitCode,
    reportPath: shellPath,
    markdownPath: mdPath,
    expected: reportExpected,
    fs: { readFileSync },
  });
  assert.equal(st.result.generated, false);
  assert.match(st.reasons.join('\n'), /report-shape-invalid/);
});

test('report markdown correspondence and exit/freshness consistency are enforced', async () => {
  const { jsonPath, mdPath, exitCode } = await realReportArtifacts();
  const dir = mkdtempSync(join(tmpdir(), 'b2-report-md-'));
  const otherMd = join(dir, 'other.md');
  writeFileSync(otherMd, `${readFileSync(mdPath, 'utf8')}\n\nstale tail from another run\n`);
  const mismatch = reportStage({
    ...RUN,
    exitCode,
    reportPath: jsonPath,
    markdownPath: otherMd,
    expected: reportExpected,
    fs: { readFileSync },
  });
  assert.equal(mismatch.result.generated, false);
  assert.match(mismatch.reasons.join('\n'), /report-markdown-mismatch/);

  // exit 0 claims all sources fresh; this real report is degraded evidence
  const lying = reportStage({
    ...RUN,
    exitCode: 0,
    reportPath: jsonPath,
    markdownPath: mdPath,
    expected: reportExpected,
    fs: { readFileSync },
  });
  assert.equal(lying.result.generated, false);
  assert.match(lying.reasons.join('\n'), /report-exit-freshness-mismatch/);

  // exit 1 always fails, even with both artifacts present
  const exit1 = reportStage({
    ...RUN,
    exitCode: 1,
    reportPath: jsonPath,
    markdownPath: mdPath,
    expected: reportExpected,
    fs: { readFileSync },
  });
  assert.equal(exit1.result.status, 'failed');
  assert.equal(exit1.result.generated, false);

  // identity/window mismatches fail closed
  const wrongCutoff = reportStage({
    ...RUN,
    exitCode,
    reportPath: jsonPath,
    markdownPath: mdPath,
    expected: { ...reportExpected, asOf: '2026-09-25T00:00:00Z' },
    fs: { readFileSync },
  });
  assert.equal(wrongCutoff.result.generated, false);
  const wrongWindow = reportStage({
    ...RUN,
    exitCode,
    reportPath: jsonPath,
    markdownPath: mdPath,
    expected: { ...reportExpected, start: '2026-07-28' },
    fs: { readFileSync },
  });
  assert.equal(wrongWindow.result.generated, false);
  assert.match(wrongWindow.reasons.join('\n'), /report-window-mismatch/);
});

// ---------------------------------------------------------------------------
// Model boundary: real action execution-file format, strict output, constant
// diagnostics, builder-boundary revalidation
// ---------------------------------------------------------------------------

test('actual action execution-file format is a pretty JSON messages array (NDJSON still compatible)', () => {
  const raw = JSON.stringify([
    { type: 'system', subtype: 'init', model: 'claude-sonnet-4-5', apiKey: 'sk-SECRET', transcript: 'private' },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'draft text' }] } },
    { type: 'result', subtype: 'success', is_error: false, num_turns: 1 },
  ], null, 2);
  const fields = extractResultFields(raw);
  assert.deepEqual(fields, { subtype: 'success', isError: false, turns: 1, model: 'claude-sonnet-4-5', errorClass: 'none' });
  assert.ok(!JSON.stringify(fields).includes('SECRET'));
  assert.ok(!JSON.stringify(fields).includes('draft text'));

  // optional NDJSON compatibility shape
  const ndjson = [
    '{"type":"system","subtype":"init","model":"claude-sonnet-4-5"}',
    '{"type":"result","subtype":"error_max_turns","is_error":true,"num_turns":2}',
  ].join('\n');
  assert.deepEqual(extractResultFields(ndjson), { subtype: 'error_max_turns', isError: true, turns: 2, model: 'claude-sonnet-4-5', errorClass: 'none' });

  // unrecognized subtype/model degrade to unknown metadata, never raw text
  const weird = JSON.stringify([{ type: 'result', subtype: 'WEIRD RAW TEXT', is_error: 'yes', num_turns: -3, model: 'MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST' }]);
  assert.deepEqual(extractResultFields(weird), { subtype: null, isError: null, turns: null, model: null, errorClass: 'none' });
  assert.deepEqual(extractResultFields('garbage'), { subtype: null, isError: null, turns: null, model: null, errorClass: 'none' });
});

test('result.errors causes classify transiently to a constant enum (raw text never persists)', () => {
  const raw = JSON.stringify([{ type: 'result', subtype: 'error_during_execution', is_error: true, num_turns: 1, errors: ['OAuth token expired MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST'] }], null, 2);
  const fields = extractResultFields(raw);
  assert.equal(fields.errorClass, 'auth');
  assert.ok(!JSON.stringify(fields).includes('MOCK'));
  const unknown = JSON.stringify([{ type: 'result', subtype: 'error_during_execution', is_error: true, errors: ['weird unrecognized MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST'] }]);
  assert.equal(extractResultFields(unknown).errorClass, 'unknown');
  assert.equal(extractResultFields(JSON.stringify([{ type: 'result', subtype: 'success', errors: [] }])).errorClass, 'none');
});

test('validated explanation accepts exactly the schema instance with a non-blank string', () => {
  const ok = validateStructuredOutput(JSON.stringify({ explanation: 'CLS regressed on one URL.' }));
  assert.equal(ok.ok, true);
  assert.equal(ok.value.explanation, 'CLS regressed on one URL.');
  assert.equal(EXPLANATION_JSON_SCHEMA.properties.explanation.maxLength, EXPLANATION_MAX_CHARS);
  assert.equal(EXPLANATION_JSON_SCHEMA.properties.explanation.minLength, 1);
});

test('malformed / extra-key / wrong-type / blank / overlong / missing output each fail with a constant class', () => {
  const cases = [
    ['', 'missing-output', PROBLEMS.missing],
    [null, 'missing-output', PROBLEMS.missing],
    ['{oops', 'malformed-output', PROBLEMS.malformed],
    ['[]', 'invalid-type', PROBLEMS.notObject],
    ['"text"', 'invalid-type', PROBLEMS.notObject],
    [JSON.stringify({ explanation: 5 }), 'invalid-type', PROBLEMS.explanationType],
    [JSON.stringify({ explanation: '   ' }), 'blank-output', PROBLEMS.explanationBlank],
    [JSON.stringify({ explanation: '\n\t' }), 'blank-output', PROBLEMS.explanationBlank],
    [JSON.stringify({ explanation: 'ok', extra: 1 }), 'extra-keys', PROBLEMS.keysMismatch],
    [JSON.stringify({ explanation: 'x'.repeat(EXPLANATION_MAX_CHARS + 1) }), 'overlong-output', PROBLEMS.explanationOverlong],
    [JSON.stringify({ Explanation: 'case' }), 'extra-keys', PROBLEMS.keysMismatch],
  ];
  for (const [raw, errorClass, problem] of cases) {
    const res = validateStructuredOutput(raw);
    assert.equal(res.ok, false, `expected failure for ${JSON.stringify(raw)}`);
    assert.equal(res.errorClass, errorClass);
    assert.deepEqual(res.problems, [problem]);
    assert.ok(ERROR_CLASSES.includes(res.errorClass));
  }
  const boundary = validateStructuredOutput(JSON.stringify({ explanation: 'x'.repeat(EXPLANATION_MAX_CHARS) }));
  assert.equal(boundary.ok, true);
});

test('a failed action is a failed interpretation even when structured output exists (text withheld)', () => {
  const record = buildInterpretationRecord({
    actionOutcome: 'failure',
    conclusion: 'failure',
    structuredOutputRaw: JSON.stringify({ explanation: 'plausible text' }),
    resultFields: { subtype: 'error_during_execution', isError: true, turns: 2, model: 'claude-sonnet-4-5' },
    errorText: 'Something broke with api_key=sk-SECRET and eyJhbGciOi.eyJzdWIiOi.sig',
    runUrl: 'https://github.com/cubxxw/blog/actions/runs/123',
    repository: 'cubxxw/blog',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.status, 'failed');
  assert.equal(record.interpretation.text, null);
  assert.equal(record.interpretation.withheld, true);
  assert.ok(ERROR_CLASSES.includes(record.diagnostics.errorClass));
  assert.deepEqual(Object.keys(record.diagnostics).sort(), ['errorClass', 'isError', 'model', 'runUrl', 'subtype', 'turns']);
  const persisted = JSON.stringify(record);
  assert.ok(!persisted.includes('SECRET'));
  assert.ok(!persisted.includes('eyJ'));
  assert.ok(!persisted.includes('Something broke'));
});

test('recognized auth cause survives the ordinary failed-action branch', () => {
  const record = buildInterpretationRecord({
    actionOutcome: 'failure',
    conclusion: 'failure',
    structuredOutputRaw: null,
    resultFields: { subtype: 'error_during_execution', isError: true, turns: 1 },
    errorText: 'OAuth token expired',
    runUrl: 'https://github.com/cubxxw/blog/actions/runs/7',
    repository: 'cubxxw/blog',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.status, 'failed');
  assert.equal(record.diagnostics.errorClass, 'auth');
  assert.deepEqual(record.interpretation.reasons, [PROBLEMS.missing]);
});

test('explicit unsuccessful result subtype cannot be called success even with valid output', () => {
  const record = buildInterpretationRecord({
    actionOutcome: 'success',
    conclusion: 'success',
    structuredOutputRaw: JSON.stringify({ explanation: 'looks fine' }),
    resultFields: { subtype: 'error_max_turns', isError: false, turns: 2 },
    repository: 'cubxxw/blog',
    runUrl: 'https://github.com/cubxxw/blog/actions/runs/7',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.status, 'failed');
  assert.equal(record.interpretation.text, null);
  assert.deepEqual(record.interpretation.reasons, [PROBLEMS.actionErrorResult]);
  assert.ok(RESULT_SUBTYPES.includes('error_max_turns'));
});

test('missing optional metadata does not reject otherwise proven successful output', () => {
  const record = buildInterpretationRecord({
    actionOutcome: 'success',
    structuredOutputRaw: JSON.stringify({ explanation: 'One URL regressed on LCP.' }),
    resultFields: {},
    repository: 'cubxxw/blog',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.status, 'ok');
  assert.equal(record.interpretation.text, 'One URL regressed on LCP.');
  assert.equal(record.diagnostics.subtype, null);
});

test('untrusted keys/values never persist; diagnostics are revalidated enums', () => {
  const marker = 'MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST';
  const record = buildInterpretationRecord({
    actionOutcome: 'success',
    conclusion: marker,
    structuredOutputRaw: JSON.stringify({ explanation: 'x', [marker]: 'ignored' }),
    resultFields: { subtype: marker, isError: 'yes', turns: 2.5, model: marker },
    runUrl: `https://evil.example/actions/runs/9?x=${marker}`,
    repository: 'cubxxw/blog',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.status, 'failed');
  const persisted = JSON.stringify(record);
  assert.ok(!persisted.includes(marker));
  assert.deepEqual(record.interpretation.reasons, [PROBLEMS.keysMismatch]);
  assert.equal(record.diagnostics.model, null);
  assert.equal(record.diagnostics.subtype, null);
  assert.equal(record.diagnostics.isError, null);
  assert.equal(record.diagnostics.turns, null);
  assert.equal(record.diagnostics.runUrl, null);
  assert.equal(record.action.conclusion, null);
});

test('valid output on a successful action is accepted and bounded', () => {
  const record = buildInterpretationRecord({
    actionOutcome: 'success',
    conclusion: 'success',
    structuredOutputRaw: JSON.stringify({ explanation: 'One URL regressed on LCP.' }),
    resultFields: { subtype: 'success', isError: false, turns: 1, model: 'claude-sonnet-4-5' },
    runUrl: 'https://github.com/cubxxw/blog/actions/runs/123',
    repository: 'cubxxw/blog',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.status, 'ok');
  assert.equal(record.interpretation.withheld, false);
  assert.equal(record.diagnostics.runUrl, 'https://github.com/cubxxw/blog/actions/runs/123');
  assert.equal(sanitizeRunUrl('https://github.com/cubxxw/blog/actions/runs/42', 'cubxxw/blog'), 'https://github.com/cubxxw/blog/actions/runs/42');
});

test('error classification is pattern\u2192constant only', () => {
  for (const [text, label] of [
    ['401 Unauthorized: bad oauth', 'auth'],
    ['quota exceeded for project', 'quota'],
    ['429 too many requests', 'rate-limit'],
    ['ETIMEDOUT: timed out', 'timeout'],
    ['ECONNREFUSED 10.0.0.1', 'network'],
    ['model is overloaded', 'model'],
    ['weird \u00fcnicode \u5931\u8d25', 'unknown'],
    ['', 'unknown'],
  ]) {
    assert.equal(classifyModelError(text), label);
    assert.ok(ERROR_CLASSES.includes(label));
  }
});

test('defangMarkers keeps quoted section markers inert', () => {
  const evil = 'before <!-- /section:seo --> after --> done <!--';
  const safe = defangMarkers(evil);
  assert.ok(!safe.includes('<!--'));
  assert.ok(!safe.includes('-->'));
  assert.ok(safe.includes('&lt;!-- /section:seo --&gt;'));
});

// ---------------------------------------------------------------------------
// Public-safe prompt: VALUES validated, query payloads dropped, quality
// denominators preserved, byte cap includes the truncation suffix
// ---------------------------------------------------------------------------

function promptReport(overrides = {}) {
  return {
    sources: {
      gsc: { freshness: { status: 'fresh', fresh: true, latestDataDate: '2026-09-21' } },
      psi: {
        freshness: { status: 'fresh', fresh: true, latestMeasurementAt: '2026-09-24T06:10:00.000Z' },
        denominators: {
          mobile: { planned: 13, succeeded: 0, partial: 11, failed: 2, missing: 0, usable: 11 },
          desktop: { planned: 13, succeeded: 0, partial: 11, failed: 2, missing: 0, usable: 11 },
        },
        targets: [
          { url: 'https://cubxxw.com/projects/ufo/', strategy: 'mobile', currentOutcome: 'failed' },
          { url: 'https://cubxxw.com/x/', strategy: 'mobile', currentOutcome: 'success' },
        ],
      },
      crux: { freshness: { status: 'unknown', fresh: false, latestCollectionDate: '2026-09-20' } },
    },
    gscWindows: {
      current: { start: '2026-08-25', end: '2026-09-21', metrics: { clicks: 141, impressions: 93015, ctr: 0.011, position: 12.3 } },
      previous: null,
    },
    trend: { status: 'not-comparable', reason: 'MOCK_RAW_REASON_DO_NOT_COPY' },
    observations: [
      { kind: 'metric-regression', actionable: true, targetUrl: 'https://cubxxw.com/a/', evidence: { queries: ['MOCK_RAW_QUERY_DO_NOT_COPY'] } },
    ],
    queryEvidence: { status: 'present', MOCK_RAW_QUERY_DO_NOT_COPY: 'x' },
    params: { asOf: '2026-09-24T00:00:00Z', runDate: '2026-09-24' },
    unexpected: 'GSC_SERVICE_ACCOUNT_JSON=credential-like junk',
    ...overrides,
  };
}

test('prompt is allowlisted and public-safe: validated identity/as-of/status values only', () => {
  const prompt = buildInterpretationPrompt({ report: promptReport(), repository: 'cubxxw/blog', runDate: '2026-09-24', asOf: '2026-09-24T00:00:00Z' });
  assert.ok(prompt.includes('REPO: cubxxw/blog'));
  assert.ok(prompt.includes('as-of 2026-09-24T00:00:00Z'));
  assert.ok(prompt.includes('141 clicks / 93015 impressions'));
  assert.ok(prompt.includes('https://cubxxw.com/projects/ufo/ [mobile]'));
  // quality distinction preserved: partial-usable and failed are not flattened
  assert.ok(prompt.includes('PSI plan mobile: 0 ok / 11 partial-usable / 2 failed / 0 missing (planned 13, usable 11)'));
  for (const secret of ['MOCK_RAW_QUERY_DO_NOT_COPY', 'MOCK_RAW_REASON_DO_NOT_COPY', 'SECRET', 'credential']) {
    assert.ok(!prompt.includes(secret), `prompt must not contain ${secret}`);
  }
  assert.ok(!prompt.toLowerCase().includes('credential'));
  assert.ok(Buffer.byteLength(prompt, 'utf8') + 34 <= 6000 || Buffer.byteLength(prompt, 'utf8') <= 6000);
});

test('prompt drops URLs with query payloads and unvalidated values entirely', () => {
  const report = promptReport();
  report.sources.psi.targets = [
    { url: 'https://cubxxw.com/?q=MOCK_RAW_QUERY_DO_NOT_COPY', strategy: 'mobile', currentOutcome: 'failed' },
    { url: 'https://evil.example/x/', strategy: 'mobile', currentOutcome: 'failed' },
    { url: 'https://user:pass@cubxxw.com/x/', strategy: 'mobile', currentOutcome: 'failed' },
    { url: 'https://cubxxw.com/ok/', strategy: 'tablet', currentOutcome: 'MADNESS' },
  ];
  report.observations = [{ kind: 'evil-kind-string', actionable: true, targetUrl: 'https://cubxxw.com/?q=MOCK_RAW_QUERY_DO_NOT_COPY' }];
  const prompt = buildInterpretationPrompt({ report, repository: 'cubxxw/blog??', runDate: '2026-9-4', asOf: 'not-a-time' });
  assert.ok(!prompt.includes('MOCK_RAW_QUERY_DO_NOT_COPY'));
  assert.ok(!prompt.includes('evil.example'));
  assert.ok(!prompt.includes('user:pass'));
  assert.ok(!prompt.includes('evil-kind-string'));
  assert.ok(!prompt.includes('MADNESS'));
  assert.ok(prompt.includes('REPO: unverified'));
  assert.ok(prompt.includes('RUN DATE (UTC identity): unknown · evidence as-of unknown'));
});

test('prompt hard byte limit includes truncation suffix and keeps complete UTF-8', () => {
  for (let n = 900; n < 1600; n += 37) {
    const report = promptReport();
    report.sources.psi.targets = [0, 1, 2, 3, 4, 5].map((i) => ({ url: `https://cubxxw.com/${String(i)}${'a'.repeat(n)}/`, strategy: 'mobile', currentOutcome: 'failed' }));
    const prompt = buildInterpretationPrompt({ report, repository: 'cubxxw/blog', runDate: '2026-09-24', asOf: '2026-09-24T00:00:00Z' });
    assert.ok(Buffer.byteLength(prompt, 'utf8') <= 6000, `n=${n}, actual bytes=${Buffer.byteLength(prompt, 'utf8')}`);
    assert.ok(prompt.includes('\u2026(prompt truncated to the byte bound)'));
    // complete UTF-8: Buffer round-trip is lossless exactly when no codepoint was cut
    assert.equal(Buffer.from(prompt, 'utf8').toString('utf8'), prompt);
  }
  // exact-boundary case from the review: six ~1000-char URLs must not exceed
  const report = promptReport();
  report.sources.psi.targets = [0, 1, 2, 3, 4, 5].map((i) => ({ url: `https://cubxxw.com/${String(i)}${'a'.repeat(1000)}/`, strategy: 'mobile', currentOutcome: 'failed' }));
  const prompt = buildInterpretationPrompt({ report, repository: 'cubxxw/blog', runDate: '2026-09-24', asOf: '2026-09-24T00:00:00Z' });
  assert.ok(Buffer.byteLength(prompt, 'utf8') <= 6000, `six-long-URL case: ${Buffer.byteLength(prompt, 'utf8')}`);
});

// ---------------------------------------------------------------------------
// Matrix case 4: optional interpretation failure is non-blocking but explicit
// ---------------------------------------------------------------------------

test('case 4: failed interpretation keeps deterministic evidence and stays explicitly failed', () => {
  const failed = buildInterpretationRecord({
    actionOutcome: 'failure',
    structuredOutputRaw: null,
    resultFields: { turns: 2 },
    errorText: 'is_error=true',
    repository: 'cubxxw/blog',
    runUrl: 'https://github.com/cubxxw/blog/actions/runs/7',
    observedAt: '2026-09-24T08:00:00.000Z',
  });
  const interp = interpretationStage({ record: failed, ...RUN });
  assert.equal(interp.required, false);
  assert.equal(interp.result.status, 'failed');

  const pub = publishStage({ ...RUN, exitCode: 0 });
  const status = aggregateStages({ stages: [interp, pub], ...RUN });
  assert.equal(status.ok, true, 'required flow may be green');
  assert.equal(status.optional.interpretation, 'failed', 'but the interpretation state is never claimed successful');
  assert.match(status.notes.join('\n'), /withholds model text/);
});

test('publish failure always fails the aggregate', () => {
  const pub = publishStage({ ...RUN, exitCode: 1 });
  const status = aggregateStages({ stages: [pub], ...RUN });
  assert.equal(status.ok, false);
  assert.equal(status.stages.find((s) => s.stage === 'publish').status, 'failed');
});

// ---------------------------------------------------------------------------
// B2 read-only review adapter: bounded sentinel list, actual changed-file
// evidence (renames old+new), fail-closed incomplete reads
// ---------------------------------------------------------------------------

function ghMock({ rows, filesByNumber = {}, failList = false }) {
  const calls = [];
  const execGh = (args) => {
    calls.push(args);
    if (args[0] === 'pr') {
      if (failList) throw new Error('gh: MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST boom');
      return JSON.stringify(rows);
    }
    const m = /pulls\/(\d+)\/files/.exec(args[1]);
    const files = filesByNumber[m[1]] ?? [];
    return JSON.stringify(files);
  };
  return { execGh, calls };
}

test('review adapter: a full bounded list is never silently complete (sentinel row)', async () => {
  const mkRow = (i) => ({ number: i, state: 'MERGED', closedAt: '2026-09-20T10:00:00Z', mergedAt: '2026-09-20T10:00:00Z' });
  // exactly 30 rows for a 30 bound WITH the 31 sentinel request: complete
  const complete = ghMock({ rows: Array.from({ length: REVIEW_LIMITS.proposals }, (_, i) => mkRow(i + 1)) });
  const okState = await collectReviewState({ repository: 'cubxxw/blog', execGh: complete.execGh, observedAt: '2026-09-24T12:00:00Z' });
  assert.equal(okState.read.status, 'ok');
  assert.equal(okState.backlog.relevantOpenCount, 0);
  // the request itself carries the sentinel: --limit 31 for a 30 bound
  const listCall = complete.calls.find((c) => c[0] === 'pr');
  const limitIdx = listCall.indexOf('--limit');
  assert.ok(limitIdx > 0);
  assert.equal(listCall[limitIdx + 1], String(REVIEW_LIMITS.proposals + 1));

  // 31 rows returned: visibly truncated (an older open proposal could be hidden)
  const truncated = ghMock({ rows: [...Array.from({ length: REVIEW_LIMITS.proposals }, (_, i) => mkRow(i + 1)), { number: 99, state: 'OPEN', closedAt: null, mergedAt: null }] });
  const truncState = await collectReviewState({ repository: 'cubxxw/blog', execGh: truncated.execGh, observedAt: '2026-09-24T12:00:00Z' });
  assert.equal(truncState.read.status, 'truncated');
  assert.equal(truncState.read.completeness, 'truncated');
  assert.equal(truncState.proposals.length, REVIEW_LIMITS.proposals);
});

test('review adapter: rename rows contribute old AND new paths (actual overlap evidence)', async () => {
  const { execGh } = ghMock({
    rows: [{ number: 12, state: 'OPEN', closedAt: null, mergedAt: null }],
    filesByNumber: { 12: [{ filename: 'content/zh/ai-agent/posts/new-name.md', previous_filename: 'content/zh/ai-agent/posts/mem0.md' }] },
  });
  const state = await collectReviewState({ repository: 'cubxxw/blog', execGh, observedAt: '2026-09-24T12:00:00Z' });
  assert.equal(state.read.status, 'ok');
  assert.equal(state.backlog.relevantOpenCount, 1);
  assert.deepEqual(state.proposals[0].changedFiles, ['content/zh/ai-agent/posts/new-name.md', 'content/zh/ai-agent/posts/mem0.md']);
});

test('review adapter: failed/malformed changed-file reads never become complete empty sets', async () => {
  const malformed = ghMock({
    rows: [{ number: 12, state: 'OPEN', closedAt: null, mergedAt: null }],
    filesByNumber: { 12: [{ bogus: true }] },
  });
  const state = await collectReviewState({ repository: 'cubxxw/blog', execGh: malformed.execGh, observedAt: '2026-09-24T12:00:00Z' });
  assert.notEqual(state.read.status, 'ok');
  assert.notEqual(state.read.completeness, 'complete');
  assert.deepEqual(state.proposals[0].changedFiles, []);
  assert.match(state.problems.join('\n'), /files read failed|changed-file read incomplete/);

  await assert.rejects(
    readChangedFiles({ repository: 'cubxxw/blog', number: 12, execGh: malformed.execGh }),
    /malformed/,
  );
});

test('review adapter: failed listing is fail-closed (no zero backlog, no empty proposals)', async () => {
  const { execGh } = ghMock({ rows: [], failList: true });
  const state = await collectReviewState({ repository: 'cubxxw/blog', execGh, observedAt: '2026-09-24T12:00:00Z' });
  assert.equal(state.read.status, 'failed');
  assert.equal(state.backlog, null);
  assert.deepEqual(state.proposals, []);
  assert.ok(!JSON.stringify(state).includes('MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST'));
});

// ---------------------------------------------------------------------------
// Trusted section composition
// ---------------------------------------------------------------------------

test('composeSeoSection keeps deterministic evidence primary and labels failed interpretation', () => {
  const ok = composeSeoSection({
    report: { markdown: '#### SEO \u89c2\u6d4b deterministic body' },
    status: { stages: [{ stage: 'report', status: 'succeeded', outcome: null, generated: true, evidence: 'degraded', required: true }], optional: { interpretation: 'failed' } },
    runDate: '2026-09-24',
    asOf: '2026-09-24T00:00:00Z',
  });
  assert.ok(ok.startsWith('### \ud83d\udd0d SEO'));
  assert.ok(ok.includes('deterministic body'));
  assert.ok(ok.includes('generated=true'));
  assert.ok(ok.includes('可选模型解读: failed'));

  const withText = composeSeoSection({
    report: { markdown: 'body' },
    interpretation: buildInterpretationRecord({
      actionOutcome: 'success',
      conclusion: 'success',
      structuredOutputRaw: JSON.stringify({ explanation: 'look <!-- /section:seo --> markers' }),
      resultFields: { subtype: 'success', isError: false },
      repository: 'cubxxw/blog',
      observedAt: '2026-09-24T08:00:00.000Z',
    }),
    runDate: '2026-09-24',
    asOf: '2026-09-24T00:00:00Z',
  });
  assert.ok(withText.includes('#### \ud83e\udd16 \u53ef\u9009\u89e3\u8bfb'));
  assert.ok(!withText.includes('<!--'));
  assert.ok(withText.includes('&lt;!-- /section:seo --&gt;'));

  const failedModel = composeSeoSection({
    report: { markdown: 'body' },
    interpretation: buildInterpretationRecord({ actionOutcome: 'failure', structuredOutputRaw: null, repository: 'cubxxw/blog', observedAt: '2026-09-24T08:00:00.000Z' }),
    runDate: '2026-09-24',
    asOf: '2026-09-24T00:00:00Z',
  });
  assert.ok(failedModel.includes('withheld'));
  assert.ok(!failedModel.includes('look <!--'));
});

test('composeAutofixSection is public-safe (no raw query strings) and proposal-only', () => {
  const gate = {
    reviewState: { ok: true, status: 'ok', backlog: { relevantOpenCount: 1 } },
    candidates: [{
      kind: 'meta-description',
      targetUrl: 'https://cubxxw.com/projects/mem0/',
      proposal: { summary: 'add description', files: ['content/zh/ai-agent/posts/mem0.md'] },
      evidence: { queryPage: { queries: ['MOCK_RAW_QUERY_DO_NOT_COPY'] } },
    }],
    skipped: [{ kind: 'title-intent', targetUrl: 'https://cubxxw.com/a/', reasons: ['low-ctr-alone-insufficient: copy-intent proposals must cite real queries'] }],
    budget: { used: 1, maxCandidates: 2 },
  };
  const body = composeAutofixSection({ gate, runDate: '2026-09-24', decisionAt: '2026-09-24T08:31:00Z' });
  assert.ok(body.includes('proposal-only'));
  assert.ok(body.includes('content/zh/ai-agent/posts/mem0.md'));
  assert.ok(body.includes('low-ctr-alone-insufficient'));
  assert.ok(!body.includes('MOCK_RAW_QUERY_DO_NOT_COPY'));
});

test('composeFailureSection publishes an honest minimal failure state', () => {
  const body = composeFailureSection({ kind: 'seo', runDate: '2026-09-24', reasons: ['report-exit-invalid: generation exit 1'] });
  assert.ok(body.startsWith('### \ud83d\udd0d SEO'));
  assert.ok(body.includes('**failed**'));
  assert.ok(body.includes('report-exit-invalid'));
});

// ===========================================================================
// Checkpoint 3: semantic workflow YAML contracts (bound to the verified model
// boundary), the trusted Python page-map producer and the pipeline CLI
// ===========================================================================

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync as mkdtemp2, symlinkSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { normalizePageMap, resolveTargetPage } from './lib/seo-page-map.mjs';
import { main as pipelineMain } from './seo-pipeline.mjs';
import { gateCandidates } from './lib/seo-candidates.mjs';

const WORKFLOWS = ['seo-snapshot.yml', 'seo-analyze.yml', 'seo-autofix.yml', 'lighthouse.yml', 'seo-contracts.yml'];
const PROOF = JSON.parse(readFileSync(fileURLToPath(new URL('../docs/seo-model-boundary-proof.json', import.meta.url)), 'utf8'));
const PY = fileURLToPath(new URL('./seo-page-map.py', import.meta.url));

function loadWorkflow(name) {
  return parseYaml(readFileSync(fileURLToPath(new URL(`../.github/workflows/${name}`, import.meta.url)), 'utf8'));
}
const stepsOf = (wf, job) => wf.jobs[job].steps;
const stepByName = (wf, job, name) => stepsOf(wf, job).find((s) => s.name === name);
const stepUsing = (wf, job, uses) => stepsOf(wf, job).find((s) => s.uses === uses);

// ---------------------------------------------------------------------------
// Workflow YAML parses under YAML 1.2 semantics and rejects duplicate keys
// ---------------------------------------------------------------------------

test('workflow YAML parses with YAML 1.2 (on: stays a string key) and unique keys', () => {
  for (const name of WORKFLOWS) {
    const wf = loadWorkflow(name);
    assert.ok(Object.prototype.hasOwnProperty.call(wf, 'on'), `${name}: the on: key survives as a plain key`);
    assert.ok(wf.jobs && typeof wf.jobs === 'object');
  }
  // the parser must reject duplicate keys (the preflight's unique-key rule)
  assert.throws(() => parseYaml('jobs:\n  a:\n    x: 1\n    x: 2\n'));
});

// ---------------------------------------------------------------------------
// Snapshot workflow: per-stage binding, partial evidence retained, explicit
// aggregate
// ---------------------------------------------------------------------------

test('snapshot workflow plans exact artifacts, validates each stage and aggregates explicitly', () => {
  const wf = loadWorkflow('seo-snapshot.yml');
  assert.deepEqual(wf.concurrency, { group: 'seo-snapshot', 'cancel-in-progress': false });
  assert.deepEqual(wf.permissions, { contents: 'write' });
  // manual lookback preserved and documented; opt-in device/country cuts exist
  assert.ok(wf.on.workflow_dispatch.inputs.lookback.description.includes('55 = 56-day inclusive backfill'));
  assert.equal(wf.on.workflow_dispatch.inputs.with_device.type, 'boolean');
  assert.equal(wf.on.workflow_dispatch.inputs.with_country.type, 'boolean');

  const steps = stepsOf(wf, 'snapshot');
  const names = steps.map((s) => s.name);
  const planIdx = names.findIndex((n) => n.includes('Plan run'));
  const gscIdx = names.findIndex((n) => n.includes('Fetch Google Search Console'));
  const psiIdx = names.findIndex((n) => n.includes('Fetch PageSpeed'));
  const cruxIdx = names.findIndex((n) => n.includes('Fetch CrUX'));
  const commitIdx = names.findIndex((n) => n.includes('Commit snapshot'));
  const aggIdx = names.findIndex((n) => n.includes('Aggregate'));
  assert.ok(planIdx >= 0 && planIdx < gscIdx && gscIdx < psiIdx && psiIdx < cruxIdx && cruxIdx < commitIdx && commitIdx < aggIdx, 'ordering: plan -> collectors -> stages -> commit -> aggregate');
  for (const [label, idx, outVar] of [['gsc', gscIdx, 'GSC_OUT'], ['psi', psiIdx, 'PSI_OUT'], ['crux', cruxIdx, 'CRUX_OUT']]) {
    assert.equal(steps[idx]['continue-on-error'], true, `${label} collector records its exit code instead of skipping the rest`);
    assert.ok(steps[idx].run.includes(`--out "$${outVar}"`), `${label} writes only the planned exact path`);
  }
  // every collector has its stage validation and everything after plan runs
  // even when an earlier step failed (partial evidence is never swallowed)
  for (const s of steps.slice(gscIdx)) assert.equal(s.if, 'always()', `${s.name} must run even after a failed stage`);
  assert.ok(steps.find((s) => s.name.includes('Validate GSC')).run.includes("--kind gsc"));
  assert.ok(steps.find((s) => s.name.includes('Validate GSC')).run.includes('steps.gsc.outputs.code'));
  assert.ok(steps.find((s) => s.name.includes('Validate CrUX')).run.includes("--kind crux"));
  // CrUX only ever gets the unique planned --out binding (collector unchanged)
  assert.equal(steps[cruxIdx].run.includes('--out "$CRUX_OUT"'), true);
  // frozen report date flows into the commit message
  assert.ok(steps[commitIdx].run.includes('steps.plan.outputs.report_date'));
  // persistence is a REQUIRED stage (captured exit) and part of the aggregate
  assert.equal(steps[commitIdx].id, 'persist');
  assert.ok(steps.find((s) => s.name.includes('Validate persistence stage')).run.includes('--kind publish --target snapshot-persist'));
  // final aggregate consumes the three exact collector records AND persistence
  const agg = steps[aggIdx];
  for (const kind of ['gsc', 'psi', 'crux']) assert.ok(agg.run.includes(`run/stage-${kind}.json`));
  assert.ok(agg.run.includes('run/stage-persist.json'));
  // durable upload covers per-run state AND the exact three planned new
  // observations (never the historical data/seo directory)
  const upload = steps.find((s) => s.name.includes('Upload run stage artifacts'));
  assert.ok(upload.with.path.includes('run/**'));
  for (const out of ['gsc_out', 'psi_out', 'crux_out']) assert.ok(upload.with.path.includes(`steps.plan.outputs.${out}`));
  assert.ok(!upload.with.path.includes('data/seo/'), 'the historical directory is never uploaded wholesale');
});

// ---------------------------------------------------------------------------
// Analyze workflow: verified model boundary + trusted publication
// ---------------------------------------------------------------------------

test('analyze workflow binds the verified action pin, boundary argv and prepared prompt', () => {
  const wf = loadWorkflow('seo-analyze.yml');
  assert.deepEqual(wf.permissions, { contents: 'read' });
  assert.deepEqual(Object.keys(wf.jobs), ['context', 'prepare', 'interpret', 'publish']);
  assert.equal(wf.jobs.prepare.needs, 'context', 'identity freezes in a minimal job before fragile preparation');
  assert.equal(wf.jobs.interpret.needs, 'prepare');
  assert.deepEqual(wf.jobs.publish.needs, ['context', 'prepare', 'interpret']);
  assert.equal(wf.jobs.publish.if, 'always()');
  assert.ok(wf.jobs.publish.steps.some((s) => s.run === 'mkdir -p run'), 'the publisher ensures run/ exists regardless of downloads');

  // read-only interpretation job: no issues/pull-requests/id-token write ever
  assert.deepEqual(wf.jobs.interpret.permissions, { contents: 'read' });
  const interpSteps = stepsOf(wf, 'interpret');
  const model = interpSteps.find((s) => typeof s.uses === 'string' && s.uses.startsWith('anthropics/claude-code-action@'));
  assert.ok(model, 'the only model step is the pinned claude-code-action');
  assert.equal(model.uses, `anthropics/claude-code-action@${PROOF.versions.action}`, 'changing the pin requires explicit re-verification of the proof');

  // checkout persist-credentials false in the model AND publisher jobs
  for (const job of ['interpret', 'publish']) {
    const co = stepUsing(wf, job, 'actions/checkout@v7');
    assert.equal(co.with['persist-credentials'], false, `${job}: no persisted git credentials`);
  }

  // boundary argv exactly as verified (plus the bounded schema + turn budget)
  assert.equal(model.with.github_token, '${{ github.token }}', 'the job\'s own read-only token is supplied explicitly');
  assert.ok(model.with.claude_code_oauth_token.includes('CLAUDE_CODE_OAUTH_TOKEN'));
  assert.equal(model.with.show_full_output, 'false');
  assert.equal(model.with.display_report, 'false');
  assert.equal(model.env.ACTIONS_STEP_DEBUG, 'false', 'debug logging is forced false AT action execution');
  assert.equal(model.with.use_commit_signing, undefined, 'no commit signing');
  const args = model.with.claude_args;
  assert.ok(args.includes(PROOF.boundary.flags), 'verified boundary flags verbatim');
  assert.ok(!args.includes('--tools ""'), 'the quoted empty tools form is forbidden');
  assert.ok(!args.includes('--bare'), '--bare skips OAuth and is forbidden');
  for (const banned of ['--allowedTools', 'Bash(', 'Bash', 'Write', 'Read', 'sudo', 'wget', 'gh pr', 'Skill']) {
    assert.ok(!args.includes(`--allowedTools`) && !/--allowedTools/.test(args), 'no operational tool allowlist');
  }
  assert.ok(!/--allowedTools/.test(args));
  assert.ok(!/plugins|plugin_marketplaces|use_commit_signing|ssh_signing_key/.test(JSON.stringify(model.with)));
  const schemaMatch = /--json-schema '([^']+)'/.exec(args);
  assert.ok(schemaMatch, '--json-schema is appended');
  assert.deepEqual(JSON.parse(schemaMatch[1]), JSON.parse(JSON.stringify(EXPLANATION_JSON_SCHEMA)));
  assert.ok(/--max-turns 2/.test(args), 'explicit finite turn budget');
  assert.ok(PROOF.boundary.jsonSchema.properties.explanation.maxLength === EXPLANATION_MAX_CHARS);

  // prepared input binding: the model only ever sees the bounded prepared prompt
  assert.equal(model.with.prompt, '${{ needs.prepare.outputs.prompt }}');

  // structured output crosses ONLY through the environment, never shell source
  const record = interpSteps.find((s) => (s.run ?? '').includes('seo-pipeline.mjs interpretation'));
  assert.ok(record);
  assert.ok(!record.run.includes('steps.model.outputs.structured_output'), 'untrusted output is never interpolated into shell source');
  assert.equal(record.env.STRUCTURED_OUTPUT, '${{ steps.model.outputs.structured_output }}');
  assert.equal(record.if, 'always()');
  const upload = interpSteps.find((s) => (s.with?.path ?? '') === 'run/interpretation.json');
  assert.ok(upload && upload.if === 'always()', 'only the sanitized record artifact crosses jobs');
  assert.ok(!interpSteps.some((s) => (s.with?.name ?? '').includes('execution')), 'raw execution files are never uploaded');

  // trusted publisher: shared serialization + frozen date + section writer
  const pub = wf.jobs.publish;
  assert.deepEqual(pub.concurrency, { group: 'daily-report-publish', 'cancel-in-progress': false });
  assert.deepEqual(pub.permissions, { contents: 'read', issues: 'write' });
  const publishStep = pub.steps.find((s) => (s.run ?? '').includes('seo-section-to-issue.mjs'));
  assert.ok(publishStep.run.includes('--date "$RUN_DATE"'));
  assert.equal(publishStep.if, 'always()');
  // deterministic evidence is regenerated before publication
  assert.ok(pub.steps.some((s) => (s.run ?? '').includes('seo-report.mjs --dir data/seo')));
});

// ---------------------------------------------------------------------------
// Autofix workflow: proposal-only, deterministic order, minimum permissions
// ---------------------------------------------------------------------------

test('autofix workflow is proposal-only with review-state first and one shared decision instant', () => {
  const wf = loadWorkflow('seo-autofix.yml');
  assert.deepEqual(wf.permissions, { contents: 'read' });
  const text = JSON.stringify(wf);
  assert.ok(!text.includes('anthropics/'), 'no model step exists in the proposal path');
  for (const banned of ['contents: write', 'pull-requests: write', 'id-token: write']) {
    assert.ok(!text.includes(banned.split(': ')[0] + '": "' + banned.split(': ')[1]) && !text.includes(banned), `no ${banned} anywhere`);
  }
  const steps = stepsOf(wf, 'propose');
  const names = steps.map((s) => s.name);
  const reviewIdx = names.findIndex((n) => n.includes('review state'));
  const freezeIdx = names.findIndex((n) => n.includes('Freeze decision'));
  const hugoIdx = names.findIndex((n) => n.includes('page map'));
  const reportIdx = names.findIndex((n) => n.includes('Generate deterministic report'));
  const gateIdx = names.findIndex((n) => n.includes('proposal gate'));
  assert.ok(reviewIdx < freezeIdx && freezeIdx < hugoIdx && hugoIdx < reportIdx && reportIdx < gateIdx,
    'order: review-state read -> freeze decisionAt -> Hugo map -> report -> gate');
  assert.ok(steps[reviewIdx].run.includes('seo-pipeline.mjs review-state'));
  assert.ok(steps[freezeIdx].run.includes('--review-state run/review.json'));

  // verified Hugo invocation (env, not unsupported flags) + stdlib converter
  const hugo = steps[hugoIdx];
  assert.equal(hugo.env.HUGO_BASEURL, 'https://cubxxw.com/');
  assert.equal(hugo.env.HUGO_ENABLEGITINFO, 'true');
  assert.ok(hugo.run.includes('hugo list published --environment production --config config.yml'));
  assert.ok(hugo.run.includes('--clock "$DECISION_AT"') && hugo.run.includes('--noBuildLock'));
  assert.ok(!hugo.run.includes('--baseURL') && !hugo.run.includes('--enableGitInfo'), 'those flags do not exist for list published');
  assert.ok(hugo.run.includes('python3 scripts/seo-page-map.py'));

  // the gate shares the ONE frozen decision instant and the trusted SHA
  const gate = steps[gateIdx].run;
  assert.ok(gate.includes('--expected-source-commit "$GITHUB_SHA"'));
  assert.ok(gate.includes('--decision-at "$DECISION_AT"'));
  assert.ok(gate.includes('--page-map run/page-map.json'));
  assert.ok(steps[reportIdx].run.includes('--include-query-rows'));

  // dedicated publisher with the shared serialization group and the immutable
  // original date (never recomputed after midnight)
  const pub = wf.jobs.publish;
  assert.deepEqual(pub.concurrency, { group: 'daily-report-publish', 'cancel-in-progress': false });
  assert.deepEqual(pub.permissions, { contents: 'read', issues: 'write' });
  assert.equal(pub.env.REPORT_DATE, '${{ needs.propose.outputs.report_date }}');
  assert.equal(wf.jobs.propose.outputs.report_date, '${{ steps.date.outputs.report_date }}', 'the date freezes once before fragile work and travels by job output');
  assert.ok(pub.steps.some((s) => s.run === 'mkdir -p run'), 'run/ exists even when the artifact download fails');
  for (const s of pub.steps) assert.ok(!(s.run ?? '').includes('date -u'), 'publication never recomputes the report day');
  const write = pub.steps.find((s) => (s.run ?? '').includes('report-section-to-issue.mjs autofix'));
  assert.ok(write.run.includes('--date'));
  assert.ok(write.run.includes('exit 1'), 'incomplete/invalid proposal evidence keeps the required pipeline failed after honest publication');
});

// ---------------------------------------------------------------------------
// Lighthouse + contracts workflows
// ---------------------------------------------------------------------------

test('lighthouse workflow keeps the per-push gate and serializes only publication', () => {
  const wf = loadWorkflow('lighthouse.yml');
  assert.deepEqual(wf.permissions, { contents: 'read' });
  assert.deepEqual(wf.concurrency, { group: 'lighthouse', 'cancel-in-progress': false });
  const measure = stepsOf(wf, 'lighthouse');
  assert.ok(measure.some((s) => s.run === 'lhci autorun'), 'existing quality gate preserved');
  assert.equal(wf.jobs.lighthouse.outputs.report_date, '${{ steps.date.outputs.report_date }}', 'UTC date frozen once per run');
  const pub = wf.jobs.publish;
  assert.deepEqual(pub.concurrency, { group: 'daily-report-publish', 'cancel-in-progress': false });
  assert.deepEqual(pub.permissions, { contents: 'read', issues: 'write' });
  assert.ok(pub.if.includes("github.event_name != 'push'") && pub.if.includes('always()'));
  const sync = pub.steps.find((s) => (s.run ?? '').includes('lighthouse-report-to-issue.mjs'));
  assert.ok(sync.run.includes('--date "${{ needs.lighthouse.outputs.report_date }}"'));
});

test('seo-contracts runs the targeted offline suites with no credentials', () => {
  const wf = loadWorkflow('seo-contracts.yml');
  assert.deepEqual(wf.permissions, { contents: 'read' });
  const text = JSON.stringify(wf);
  assert.ok(text.includes('npm ci --ignore-scripts --no-audit --no-fund'));
  for (const f of ['psi-fetch.test.mjs', 'seo-report.test.mjs', 'seo-pipeline.test.mjs', 'seo-autofix-gate.test.mjs', 'daily-report-issue.test.mjs', 'lighthouse-report-to-issue.test.mjs', 'gsc-fetch.test.mjs', 'gsc-report.test.mjs']) {
    assert.ok(text.includes(f), `${f} runs in the contract job`);
  }
  assert.ok(!/secrets\./.test(text), 'no model/Google credentials belong in this job');
});

// ---------------------------------------------------------------------------
// Trusted Python page-map producer (stdlib CSV -> seo-page-map/1)
// ---------------------------------------------------------------------------

function gitFixtureRepo(files, { symlink: symlinkSpec = null } = {}) {
  const dir = mkdtemp2(join(tmpdir(), 'b2-pagemap-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  execFileSync('git', ['init', '-q'], { cwd: dir });
  if (symlinkSpec) {
    mkdirSync(join(dir, symlinkSpec.link, '..'), { recursive: true });
    symlinkSync(symlinkSpec.target, join(dir, symlinkSpec.link));
  }
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'], { cwd: dir });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
  return { dir, head };
}

const CSV_HEADER = 'path,slug,title,date,expiryDate,publishDate,draft,permalink,kind,section';
const csvRow = (path, permalink, kind, publishDate, title = 'Fixture, "quoted"\nsecond line') =>
  // stdlib csv quoting: embedded comma, quote AND newline all quoted
  [path, '', `"${title.replaceAll('"', '""')}"`, publishDate, '0001-01-01T00:00:00Z', publishDate, 'false', permalink, kind, 's'].join(',');

function runPageMap({ dir, head, csv, out = 'map.json', args = [] }) {
  const csvPath = join(dir, 'page-map.csv');
  writeFileSync(csvPath, `${CSV_HEADER}\n${csv.join('\n')}\n`);
  const res = spawnSync('python3', [PY, '--csv', csvPath, '--out', join(dir, out), '--repository', 'cubxxw/blog', '--source-commit', head, '--clock', '2026-09-24T08:31:00Z', '--repo-root', dir, ...args], { encoding: 'utf8' });
  const map = JSON.parse(readFileSync(join(dir, out), 'utf8'));
  return { code: res.status, map, stderr: res.stderr };
}

const PAGE_FIXTURE_FILES = {
  'content/en/ai-agent/posts/mem0.md': '# mem0 en\n',
  'content/zh/ai-agent/posts/mem0.md': '# mem0 zh\n',
  'content/en/ai-agent/posts/UFO.md': '# ufo\n',
  'content/zh/ai-agent/posts/UFO.md': '# ufo zh\n',
  'content/en/engineering/posts/bundle/index.md': '# bundle\n',
  'content/zh/articles/_index.md': '# articles\n',
  'content/en/engineering/posts/argo-cd.md': '# argo\n',
};

test('page-map producer: overrides, uppercase UFO.md, bundle and CSV quoting convert correctly', () => {
  const { dir, head } = gitFixtureRepo(PAGE_FIXTURE_FILES);
  const { code, map } = runPageMap({
    dir,
    head,
    csv: [
      csvRow('content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/zh/ai-agent/posts/mem0.md', 'https://cubxxw.com/zh/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/en/ai-agent/posts/UFO.md', 'https://cubxxw.com/projects/ufo/', 'page', '2025-05-09T21:30:15+08:00'),
      csvRow('content/en/engineering/posts/bundle/index.md', 'https://cubxxw.com/engineering/posts/bundle/', 'page', '0001-01-01T00:00:00Z'),
      csvRow('content/zh/articles/_index.md', 'https://cubxxw.com/zh/articles/', 'section', '0001-01-01T00:00:00Z'),
    ],
  });
  assert.equal(code, 0);
  assert.equal(map.read.status, 'ok');
  assert.equal(map.read.completeness, 'complete');
  assert.equal(map.sourceCommit, head);
  assert.equal(map.producer.version, '0.145.0');
  const byPath = Object.fromEntries(map.pages.map((p) => [p.sourcePath, p]));
  assert.equal(byPath['content/en/ai-agent/posts/mem0.md'].url, 'https://cubxxw.com/projects/mem0/');
  assert.equal(byPath['content/en/ai-agent/posts/mem0.md'].publishDate, '2025-05-09T13:33:46Z'); // +08:00 -> UTC
  assert.equal(byPath['content/en/ai-agent/posts/UFO.md'].url, 'https://cubxxw.com/projects/ufo/'); // exact case kept
  assert.equal(byPath['content/en/engineering/posts/bundle/index.md'].publishDate, null); // no-date sentinel
  assert.equal(byPath['content/zh/articles/_index.md'].kind, 'section');

  // B1 consumes the produced map unchanged (hand-off positive)
  const norm = normalizePageMap(map);
  assert.equal(norm.usable, true);
  assert.equal(resolveTargetPage(norm, 'https://cubxxw.com/projects/mem0/').page.sourcePath, 'content/en/ai-agent/posts/mem0.md');
  assert.equal(resolveTargetPage(norm, 'https://cubxxw.com/zh/projects/mem0/').page.sourcePath, 'content/zh/ai-agent/posts/mem0.md');
  assert.equal(resolveTargetPage(norm, 'https://cubxxw.com/projects/ufo/').page.sourcePath, 'content/en/ai-agent/posts/UFO.md');
});

test('page-map producer: conflicts pass through for B1 isolation (never first-row picked)', () => {
  const { dir, head } = gitFixtureRepo(PAGE_FIXTURE_FILES);
  const { code, map } = runPageMap({
    dir,
    head,
    csv: [
      csvRow('content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/dup/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/en/engineering/posts/argo-cd.md', 'https://cubxxw.com/projects/dup/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/en/ai-agent/posts/UFO.md', 'https://cubxxw.com/projects/ufo/', 'page', '2025-05-09T21:30:15+08:00'),
    ],
  });
  assert.equal(code, 0);
  const norm = normalizePageMap(map);
  assert.ok(norm.usable);
  assert.ok(norm.ambiguous.has('https://cubxxw.com/projects/dup/'));
  assert.match(resolveTargetPage(norm, 'https://cubxxw.com/projects/dup/').reason, /ambiguous/);
  assert.equal(resolveTargetPage(norm, 'https://cubxxw.com/projects/ufo/').ok, true); // unrelated target preserved
});

test('page-map producer: untracked/wrong-case/symlink/escaping paths are excluded with recorded reasons', () => {
  const { dir, head } = gitFixtureRepo(PAGE_FIXTURE_FILES, { symlink: { link: 'content/en/engineering/posts/evil.md', target: 'argo-cd.md' } });
  const { code, map } = runPageMap({
    dir,
    head,
    csv: [
      csvRow('content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/en/ai-agent/posts/nope.md', 'https://cubxxw.com/projects/nope/', 'page', '2025-05-09T21:33:46+08:00'), // untracked
      csvRow('content/en/ai-agent/posts/ufo.md', 'https://cubxxw.com/projects/ufo-lower/', 'page', '2025-05-09T21:30:15+08:00'), // wrong case
      csvRow('content/en/engineering/posts/evil.md', 'https://cubxxw.com/projects/evil/', 'page', '2025-05-09T21:30:15+08:00'), // symlink
      csvRow('/content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/abs/', 'page', '2025-05-09T21:30:15+08:00'), // absolute
      csvRow('content/en/../en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/dotdot/', 'page', '2025-05-09T21:30:15+08:00'), // ..
    ],
  });
  assert.equal(code, 0);
  assert.deepEqual(map.pages.map((p) => p.sourcePath), ['content/en/ai-agent/posts/mem0.md']);
  const notes = map.read.notes.join('\n');
  assert.match(notes, /source-not-tracked-exact-case/);
  assert.match(notes, /source-symlink|source-not-ordinary-file/);
  assert.match(notes, /source path shape rejected/);
});

test('page-map producer: failed or partial reads never become complete empty maps', () => {
  const { dir, head } = gitFixtureRepo(PAGE_FIXTURE_FILES);

  // missing required CSV column -> failed read, nonzero
  const csvPath = join(dir, 'bad.csv');
  writeFileSync(csvPath, 'path,permalink\ncontent/en/ai-agent/posts/mem0.md,https://cubxxw.com/projects/mem0/\n');
  const outPath = join(dir, 'bad-map.json');
  const bad = spawnSync('python3', [PY, '--csv', csvPath, '--out', outPath, '--repository', 'cubxxw/blog', '--source-commit', head, '--clock', '2026-09-24T08:31:00Z', '--repo-root', dir], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  const badMap = JSON.parse(readFileSync(outPath, 'utf8'));
  assert.equal(badMap.read.status, 'failed');
  assert.deepEqual(badMap.pages, []);
  assert.notEqual(badMap.read.completeness, 'complete');

  // sourceCommit mismatch -> failed read
  const wrong = runPageMap({ dir, head: '0'.repeat(40), csv: [csvRow('content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00')] });
  assert.equal(wrong.code, 2);
  assert.match(wrong.map.read.notes.join('\n'), /source-commit-mismatch/);
  assert.notEqual(wrong.map.read.status, 'ok');

  // dirty checkout -> failed read
  writeFileSync(join(dir, 'content/en/ai-agent/posts/mem0.md'), '# dirty\n');
  const dirty = runPageMap({ dir, head, csv: [csvRow('content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00')] });
  assert.equal(dirty.code, 2);
  assert.match(dirty.map.read.notes.join('\n'), /checkout-not-clean/);
  assert.notEqual(dirty.map.read.completeness, 'complete');

  // row cap -> visibly truncated, never silent
  const { dir: dir2, head: head2 } = gitFixtureRepo(PAGE_FIXTURE_FILES);
  const capped = runPageMap({
    dir: dir2,
    head: head2,
    args: ['--max-rows', '2'],
    csv: [
      csvRow('content/en/ai-agent/posts/mem0.md', 'https://cubxxw.com/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/zh/ai-agent/posts/mem0.md', 'https://cubxxw.com/zh/projects/mem0/', 'page', '2025-05-09T21:33:46+08:00'),
      csvRow('content/en/ai-agent/posts/UFO.md', 'https://cubxxw.com/projects/ufo/', 'page', '2025-05-09T21:30:15+08:00'),
    ],
  });
  assert.equal(capped.code, 2);
  assert.equal(capped.map.read.completeness, 'truncated');
});

// ---------------------------------------------------------------------------
// Pipeline CLI smoke: plan/stage round trip, freeze ordering, interpretation
// env consumption, aggregate with the optional interpretation
// ---------------------------------------------------------------------------

test('CLI plan+stage round trip binds the exact produced artifact to the run attempt', async () => {
  const dir = mkdtemp2(join(tmpdir(), 'b2-cli-'));
  const ghOut = join(dir, 'gh-out.txt');
  const logs = [];
  let code = await pipelineMain(
    ['plan', '--repository', 'cubxxw/blog', '--run-id', 'cli-1', '--attempt', '2', '--report-date', '2026-09-24',
      '--data-dir', join(dir, 'data/seo'), '--out', join(dir, 'plan.json'), '--github-output', ghOut],
    { log: (m) => logs.push(m), errorLog: (m) => logs.push(m) },
  );
  assert.equal(code, 0);
  const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));
  assert.equal(plan.attempt, 2);
  assert.ok(readFileSync(ghOut, 'utf8').includes('crux_out='), 'safe exact paths flow to step outputs');

  // no artifact produced at the exact planned path -> unverified stage (exit 1)
  code = await pipelineMain(['stage', '--plan', join(dir, 'plan.json'), '--kind', 'crux', '--exit-code', '0', '--out', join(dir, 'stage.json')], { log: () => {}, errorLog: () => {} });
  assert.equal(code, 1);
  assert.equal(JSON.parse(readFileSync(join(dir, 'stage.json'), 'utf8')).result.outcome, 'unverified');
});

test('CLI freeze enforces collection/review ordering and shares one decision instant', async () => {
  const dir = mkdtemp2(join(tmpdir(), 'b2-cli-freeze-'));
  const errors = [];
  let code = await pipelineMain(
    ['freeze', '--repository', 'cubxxw/blog', '--source-commit', 'a'.repeat(40), '--now', '2026-09-24T08:31:00Z', '--out', join(dir, 'ctx.json'), '--github-output', join(dir, 'gh.txt')],
    { log: () => {}, errorLog: (e) => errors.push(e) },
  );
  assert.equal(code, 0);
  const ctx = JSON.parse(readFileSync(join(dir, 'ctx.json'), 'utf8'));
  assert.equal(ctx.decisionAt, '2026-09-24T08:31:00Z');
  assert.deepEqual(ctx.window, { start: '2026-07-28', end: '2026-09-21' }); // Pacific day at 08:31Z
  assert.ok(readFileSync(join(dir, 'gh.txt'), 'utf8').includes('decision_at=2026-09-24T08:31:00Z'));

  // review state observed AFTER the decision instant is refused (even 1s)
  writeFileSync(join(dir, 'review.json'), JSON.stringify({ observedAt: '2026-09-24T08:31:01.000Z' }));
  code = await pipelineMain(
    ['freeze', '--repository', 'cubxxw/blog', '--now', '2026-09-24T08:31:00Z', '--review-state', join(dir, 'review.json'), '--out', join(dir, 'ctx2.json')],
    { log: () => {}, errorLog: (e) => errors.push(e) },
  );
  assert.equal(code, 1);
  assert.match(errors.join('\n'), /at or before the decision time/);
});

test('CLI interpretation reads structured output from the environment only', async () => {
  const dir = mkdtemp2(join(tmpdir(), 'b2-cli-interp-'));
  const out = join(dir, 'interp.json');
  let code = await pipelineMain(
    ['interpretation', '--action-outcome', 'success', '--conclusion', 'success', '--structured-output-env', 'STRUCTURED_OUTPUT', '--repository', 'cubxxw/blog', '--run-url', 'https://github.com/cubxxw/blog/actions/runs/9', '--out', out],
    { env: { STRUCTURED_OUTPUT: JSON.stringify({ explanation: 'Bounded take.' }) }, log: () => {}, errorLog: () => {} },
  );
  assert.equal(code, 0, 'recording even a failed interpretation is a successful record write');
  const record = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(record.status, 'ok');
  assert.equal(record.interpretation.text, 'Bounded take.');

  code = await pipelineMain(
    ['interpretation', '--action-outcome', 'failure', '--structured-output-env', 'STRUCTURED_OUTPUT', '--repository', 'cubxxw/blog', '--out', out],
    { env: { STRUCTURED_OUTPUT: JSON.stringify({ explanation: 'x' }) }, log: () => {}, errorLog: () => {} },
  );
  assert.equal(code, 0);
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).status, 'failed');
});

test('CLI aggregate treats the optional interpretation as non-blocking but explicit', async () => {
  const dir = mkdtemp2(join(tmpdir(), 'b2-cli-agg-'));
  writeFileSync(join(dir, 'interp.json'), JSON.stringify(buildInterpretationRecord({ actionOutcome: 'failure', structuredOutputRaw: null, repository: 'cubxxw/blog', observedAt: '2026-09-24T08:00:00.000Z' })));
  writeFileSync(join(dir, 'stage-publish.json'), JSON.stringify(publishStage({ ...RUN, exitCode: 0 })));
  const logs = [];
  const code = await pipelineMain(
    ['aggregate', '--stage', join(dir, 'stage-publish.json'), '--interpretation', join(dir, 'interp.json'), '--out', join(dir, 'status.json')],
    { log: (m) => logs.push(m), errorLog: () => {} },
  );
  assert.equal(code, 0, 'required publish succeeded; the optional failure does not block');
  const status = JSON.parse(readFileSync(join(dir, 'status.json'), 'utf8'));
  assert.equal(status.optional.interpretation, 'failed');
  assert.equal(status.ok, true);
});

// ---------------------------------------------------------------------------
// Actual CLI integration (spawned process + real artifacts, per the parent's
// actual-CLI evidence requirements)
// ---------------------------------------------------------------------------

const CLI = fileURLToPath(new URL('./seo-pipeline.mjs', import.meta.url));
function invokeCli(args, { env } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
}

test('actual CLI report adapter: real B1 exit-2 report passes; identity drift fails', async () => {
  const { jsonPath, mdPath } = await realReportArtifacts();
  const dir = mkdtempSync(join(tmpdir(), 'b2-cli-realreport-'));
  const base = ['--report', jsonPath, '--markdown', mdPath,
    '--expect-run-date', reportExpected.runDate,
    '--expect-start', reportExpected.start, '--expect-end', reportExpected.end,
    '--run-id', 'cli-real', '--attempt', '1', '--report-date', reportExpected.runDate];

  const ok = invokeCli(['report', '--exit-code', '2', ...base,
    '--expect-as-of', reportExpected.asOf, '--out', join(dir, 'ok.json')]);
  assert.equal(ok.status, 0, ok.stderr);
  const record = JSON.parse(readFileSync(join(dir, 'ok.json'), 'utf8'));
  assert.equal(record.result.generated, true);
  assert.equal(record.result.evidence, 'degraded');

  const drift = invokeCli(['report', '--exit-code', '2', ...base,
    '--expect-as-of', '2026-09-25T00:00:00Z', '--out', join(dir, 'drift.json')]);
  assert.equal(drift.status, 1);
  assert.equal(JSON.parse(readFileSync(join(dir, 'drift.json'), 'utf8')).result.generated, false);

  const exit1 = invokeCli(['report', '--exit-code', '1', ...base,
    '--expect-as-of', reportExpected.asOf, '--out', join(dir, 'exit1.json')]);
  assert.equal(exit1.status, 1);
  assert.equal(JSON.parse(readFileSync(join(dir, 'exit1.json'), 'utf8')).result.generated, false);
});

test('actual CLI aggregate preserves repeated --stage files in both orders; any failure is nonzero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'b2-cli-agg2-'));
  writeFileSync(join(dir, 'failed.json'), JSON.stringify(publishStage({ ...RUN, exitCode: 1 })));
  writeFileSync(join(dir, 'success.json'), JSON.stringify(publishStage({ ...RUN, exitCode: 0 })));
  writeFileSync(join(dir, 'success2.json'), JSON.stringify(publishStage({ ...RUN, stage: undefined, exitCode: 0 })));
  const cases = [
    ['failure before success', ['failed', 'success'], 1, 2],
    ['success before failure', ['success', 'failed'], 1, 2],
    ['single success', ['success'], 0, 1],
    ['multiple success', ['success', 'success2'], 0, 2],
  ];
  for (const [name, files, code, count] of cases) {
    const out = join(dir, `agg-${files.join('-')}.json`);
    const args = files.flatMap((f) => ['--stage', join(dir, `${f}.json`)]);
    const actual = invokeCli(['aggregate', ...args, '--out', out]);
    assert.equal(actual.status, code, `${name}: ${actual.stderr}`);
    const data = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(data.required.stages.length, count, `${name} keeps ${count} stage(s)`);
    assert.equal(data.stages.length, count);
  }

  // scalar options reject accidental duplicates instead of silently overwriting
  const dup = invokeCli(['report', '--exit-code', '2', '--report', 'a', '--report', 'b',
    '--markdown', 'm', '--expect-as-of', reportExpected.asOf, '--out', join(dir, 'dup.json')]);
  assert.equal(dup.status, 1);
  assert.match(dup.stderr, /Duplicate option --report/);
});

test('actual CLI interpretation classifies result.errors from the real execution-file format', () => {
  const dir = mkdtempSync(join(tmpdir(), 'b2-cli-diag-'));
  const marker = 'MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST';

  // recognized provider cause via result.errors -> constant auth, raw never leaks
  writeFileSync(join(dir, 'exec-auth.json'), JSON.stringify([
    { type: 'system', subtype: 'init', model: 'claude-sonnet-4-5' },
    { type: 'result', subtype: 'error_during_execution', is_error: true, num_turns: 1, errors: [`OAuth token expired ${marker}`] },
  ], null, 2));
  const auth = invokeCli(['interpretation', '--action-outcome', 'success',
    '--execution-file', join(dir, 'exec-auth.json'), '--structured-output-env', 'STRUCTURED_OUTPUT',
    '--repository', 'cubxxw/blog', '--out', join(dir, 'auth.json')], { env: { STRUCTURED_OUTPUT: '' } });
  assert.equal(auth.status, 0, auth.stderr);
  const authRecord = JSON.parse(readFileSync(join(dir, 'auth.json'), 'utf8'));
  assert.equal(authRecord.status, 'failed');
  assert.equal(authRecord.diagnostics.errorClass, 'auth', 'known provider cause survives even with missing output');
  assert.ok(!readFileSync(join(dir, 'auth.json'), 'utf8').includes(marker), 'sentinel absent from persisted record');

  // missing structured output WITHOUT a known cause stays its own class
  writeFileSync(join(dir, 'exec-plain.json'), JSON.stringify([{ type: 'result', subtype: 'error_during_execution', is_error: true }]));
  const missing = invokeCli(['interpretation', '--action-outcome', 'success',
    '--execution-file', join(dir, 'exec-plain.json'), '--structured-output-env', 'STRUCTURED_OUTPUT',
    '--repository', 'cubxxw/blog', '--out', join(dir, 'missing.json')], { env: { STRUCTURED_OUTPUT: '' } });
  assert.equal(missing.status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, 'missing.json'), 'utf8')).diagnostics.errorClass, 'missing-output');

  // unknown cause with otherwise valid output -> 'unknown', never invented
  writeFileSync(join(dir, 'exec-unknown.json'), JSON.stringify([{ type: 'result', subtype: 'error_during_execution', is_error: true, errors: [`weird unrecognized ${marker}`] }]));
  const unknown = invokeCli(['interpretation', '--action-outcome', 'success',
    '--execution-file', join(dir, 'exec-unknown.json'), '--structured-output-env', 'STRUCTURED_OUTPUT',
    '--repository', 'cubxxw/blog', '--out', join(dir, 'unknown.json')], { env: { STRUCTURED_OUTPUT: JSON.stringify({ explanation: 'fine text' }) } });
  assert.equal(unknown.status, 0);
  const unknownRecord = JSON.parse(readFileSync(join(dir, 'unknown.json'), 'utf8'));
  assert.equal(unknownRecord.status, 'failed');
  assert.equal(unknownRecord.diagnostics.errorClass, 'unknown');
  assert.equal(unknownRecord.interpretation.text, null);
  assert.ok(!readFileSync(join(dir, 'unknown.json'), 'utf8').includes(marker));
});

test('actual CLI compose: malformed optional interpretation is withheld and never blocks', async () => {
  const { jsonPath, mdPath } = await realReportArtifacts();
  const dir = mkdtempSync(join(tmpdir(), 'b2-cli-compose-'));
  writeFileSync(join(dir, 'bad-interp.json'), '{malformed MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST');
  const r = invokeCli(['compose', '--kind', 'seo', '--report', jsonPath,
    '--interpretation', join(dir, 'bad-interp.json'),
    '--run-date', '2026-09-24', '--as-of', reportExpected.asOf, '--out', join(dir, 'section.md')]);
  assert.equal(r.status, 0, r.stderr);
  const section = readFileSync(join(dir, 'section.md'), 'utf8');
  assert.ok(section.includes(readFileSync(mdPath, 'utf8').split('\n')[0]), 'deterministic evidence still published');
  assert.ok(section.includes('withheld'));
  assert.ok(!section.includes('MOCK_CREDENTIAL_VALUE_DO_NOT_PERSIST'));
});

test('actual CLI aggregate: corrupt optional records never decide required-stage success', () => {
  const dir = mkdtempSync(join(tmpdir(), 'b2-cli-optional-'));
  const good = join(dir, 'good.json');
  const failed = join(dir, 'failed.json');
  writeFileSync(good, JSON.stringify(publishStage({ ...RUN, exitCode: 0 })));
  writeFileSync(failed, JSON.stringify(publishStage({ ...RUN, exitCode: 1 })));
  for (const [name, body] of [['malformed', '{PRIVATE_SENTINEL'], ['schema', '{}'], ['missing', null]]) {
    const optional = join(dir, `${name}.json`);
    if (body !== null) writeFileSync(optional, body);
    for (const requiredFailed of [false, true]) {
      const out = join(dir, `${name}-${requiredFailed}.json`);
      const stages = requiredFailed ? ['--stage', failed, '--stage', good] : ['--stage', good];
      const result = invokeCli(['aggregate', ...stages, '--interpretation', optional, '--out', out]);
      assert.equal(result.status, requiredFailed ? 1 : 0, result.stderr);
      const raw = readFileSync(out, 'utf8');
      const status = JSON.parse(raw);
      assert.equal(status.optional.interpretation, 'failed');
      assert.equal(status.required.stages.length, requiredFailed ? 2 : 1);
      assert.equal(status.ok, !requiredFailed);
      assert.ok(!raw.includes('PRIVATE_SENTINEL'));
    }
  }
});

test('actual Autofix publisher shell: invalid evidence publishes a failure on the frozen day', async () => {
  const { jsonPath } = await realReportArtifacts();
  const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const gate = gateCandidates({ report, reviewState: null, candidates: [],
    asOfMs: Date.parse(report.params.asOf), expectedRepository: 'cubxxw/blog',
    expectedSourceCommit: 'a'.repeat(40), pageMap: null });
  const context = { schema: 'seo-run-context/1', reportDate: '2026-09-24', decisionAt: report.params.asOf };
  const step = loadWorkflow('seo-autofix.yml').jobs.publish.steps.find(s => s.name.startsWith('Compose proposal'));
  for (const variant of ['valid', 'empty-gate', 'empty-context', 'missing', 'broken']) {
    const dir = mkdtempSync(join(tmpdir(), 'b2-autofix-shell-'));
    mkdirSync(join(dir, 'run'));
    symlinkSync(fileURLToPath(new URL('.', import.meta.url)), join(dir, 'scripts'));
    if (variant !== 'missing') {
      writeFileSync(join(dir, 'run/gate.json'), variant === 'broken' ? '{bad' : JSON.stringify(variant === 'empty-gate' ? {} : gate));
      writeFileSync(join(dir, 'run/run-context.json'), JSON.stringify(variant === 'empty-context' ? {} : context));
    }
    const output = join(dir, 'outputs');
    const result = spawnSync('/bin/bash', ['-e', '-o', 'pipefail', '-c', "date() { echo 2026-09-25; }\n" + step.run],
      { cwd: dir, encoding: 'utf8', env: { ...process.env, REPORT_DATE: '2026-09-24', GITHUB_OUTPUT: output } });
    assert.equal(result.status, 0, `${variant}: ${result.stderr}`);
    const outputs = readFileSync(output, 'utf8');
    assert.match(outputs, /report_date=2026-09-24/);
    assert.match(outputs, new RegExp(`complete=${variant === 'valid'}`));
    const section = readFileSync(join(dir, 'run/autofix-section.md'), 'utf8');
    assert.equal(section.includes('状态: **failed**'), variant !== 'valid');
  }
});

test('actual CLI compose: an existing-but-rejected report publishes the minimal failure block', async () => {
  const { jsonPath, mdPath } = await realReportArtifacts();
  const dir = mkdtempSync(join(tmpdir(), 'b2-cli-rejected-'));
  writeFileSync(join(dir, 'status.json'), JSON.stringify({
    schema: 'seo-pipeline-status/1',
    stages: [{ stage: 'report', kind: 'report', required: true, status: 'failed', outcome: 'failed', generated: false, evidence: 'unknown' }],
  }));
  const r = invokeCli(['compose', '--kind', 'seo', '--report', jsonPath, '--status', join(dir, 'status.json'),
    '--run-date', '2026-09-24', '--as-of', reportExpected.asOf, '--out', join(dir, 'section.md')]);
  assert.equal(r.status, 0, r.stderr);
  const section = readFileSync(join(dir, 'section.md'), 'utf8');
  assert.ok(section.includes('生成失败'));
  assert.ok(!section.includes(readFileSync(mdPath, 'utf8').split('\n')[0]), 'a rejected report is never presented as validated success');

  // unparseable required report degrades to the minimal block instead of throwing
  writeFileSync(join(dir, 'broken.json'), '{oops');
  const broken = invokeCli(['compose', '--kind', 'seo', '--report', join(dir, 'broken.json'),
    '--run-date', '2026-09-24', '--as-of', reportExpected.asOf, '--out', join(dir, 'section2.md')]);
  assert.equal(broken.status, 0, broken.stderr);
  assert.ok(readFileSync(join(dir, 'section2.md'), 'utf8').includes('生成失败'));
});
