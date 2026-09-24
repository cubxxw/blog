// Trusted stage classification for the SEO pipeline (issue #392 / batch B2).
//
// Stage status uses BOTH the process outcome and the exact new artifact of
// this run attempt (planned and bound in seo-run-context.mjs). The frozen
// stage-semantics matrix (docs/seo-observation-pipeline.md):
//
//   * CrUX `notEligible` rows are successful queries with no field sample —
//     collection success / no-sample (unknown field data, never zero).
//   * CrUX `results[].error` rows and HTTP-200 missing/invalid records are
//     failed/invalid collection EVEN when the raw collector exited 0. A
//     required stage and the final aggregate stay nonzero.
//   * The exact new artifact is the only proof of this attempt's collection.
//     No artifact at the planned path = unverified/failed; an older file is
//     never borrowed.
//   * Report generation (0/2 with all required valid artifacts and the
//     expected identity/cutoff) is recorded separately from evidence quality
//     (fresh vs degraded). Exit 1/unknown or missing/invalid artifacts is a
//     failed report stage even if a partial JSON exists.
//   * The optional model interpretation is non-blocking for the REQUIRED
//     flow, but its own state stays explicitly failed and its text withheld.
//   * Required persistence/trusted publication failure always fails the flow.
//
// Pure functions over parsed JSON + explicit exit codes. No collectors are
// rewritten here; CrUX content is classified through B1's existing normalizer.

import {
  normalizeCruxSnapshot,
  normalizePsiSnapshot,
  validateCruxSnapshot,
} from './seo-observations.mjs';

export const STAGE_SCHEMA = 'seo-stage/1';
export const PIPELINE_STATUS_SCHEMA = 'seo-pipeline-status/1';

const GSC_SNAPSHOT_SCHEMA = 'gsc-snapshot/2';
const SEO_REPORT_SCHEMA = 'seo-report/1';

function baseStage({ runId, attempt, reportDate, stage, kind, required, startedAt, endedAt, exitCode }) {
  return {
    schema: STAGE_SCHEMA,
    runId,
    attempt,
    reportDate,
    stage,
    kind,
    required: required !== false,
    startedAt: startedAt ?? null,
    endedAt: endedAt ?? null,
    process: { exitCode },
  };
}

function finish(record, { status, outcome, generated = null, evidence = null }, artifact, reasons) {
  return {
    ...record,
    artifact,
    result: { status, outcome, generated, evidence },
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Collector stages (gsc | psi | crux): exact new artifact first, content second
// ---------------------------------------------------------------------------

const CRUX_SUCCESS = new Set(['sampled', 'no-sample']);

export function classifyCruxContent(json) {
  if (!json || !validateCruxSnapshot(json).ok) {
    return { ok: false, outcome: 'invalid', detail: [], reasons: ['crux-artifact-invalid: snapshot failed B1 validation (fetchedAt/results)'] };
  }
  const normalized = normalizeCruxSnapshot(json, 'crux-stage-artifact.json');
  if (!normalized) {
    return { ok: false, outcome: 'invalid', detail: [], reasons: ['crux-artifact-invalid: snapshot not normalizable'] };
  }
  const rows = normalized.formFactors ?? [];
  const successful = rows.filter((r) => CRUX_SUCCESS.has(r.status));
  const failedRows = rows.filter((r) => r.status === 'failed').length;
  const invalidRows = rows.filter((r) => r.status === 'invalid' || r.status === 'identity-unproven').length;
  const missingRows = rows.filter((r) => r.status === 'missing').length;
  const noSampleOnly = successful.length > 0 && successful.every((r) => r.status === 'no-sample');
  const reasons = [];
  if (failedRows > 0) reasons.push(`crux-query-failed: ${failedRows} result row(s) carry results[].error (collection failure, never success)`);
  if (invalidRows > 0) reasons.push(`crux-record-invalid: ${invalidRows} result row(s) carry a missing/invalid/unproven record`);
  if (missingRows > 0) reasons.push(`crux-row-missing: ${missingRows} planned form factor(s) recorded nothing (unknown outcome, never zero)`);
  for (const p of (normalized.problems ?? []).slice(0, 6)) reasons.push(`crux-observation: ${p}`);

  if (successful.length === 0) {
    return { ok: false, outcome: invalidRows > 0 && failedRows === 0 ? 'invalid' : 'failed', detail: rows.map((r) => `${r.formFactor}:${r.status}`), reasons };
  }
  if (failedRows > 0 || invalidRows > 0 || missingRows > 0 || normalized.runStatus !== 'ok') {
    return { ok: false, outcome: 'partial', detail: rows.map((r) => `${r.formFactor}:${r.status}`), reasons };
  }
  return {
    ok: true,
    outcome: noSampleOnly ? 'no-sample' : 'ok',
    detail: rows.map((r) => `${r.formFactor}:${r.status}`),
    reasons: noSampleOnly
      ? ['certified notEligible rows: successful queries with no field sample (no-sample; unknown, never zero)']
      : [],
  };
}

export function classifyPsiContent(json) {
  // Accepted B1 normalizer + actual planned-slot semantics (never counts-only):
  // a summary claiming successes over deleted rows is rejected.
  const normalized = normalizePsiSnapshot(json, 'psi-stage-artifact.json');
  if (!normalized || normalized.kind !== 'psi') {
    return { ok: false, outcome: 'invalid', reasons: ['psi-artifact-invalid: not a recognizable PSI observation'] };
  }
  const recomputed = normalized.counts;
  const counts = json?.meta?.counts;
  if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
    for (const k of ['planned', 'succeeded', 'partial', 'failed', 'missing', 'usable']) {
      if (Number.isInteger(counts[k]) && Number.isInteger(recomputed[k]) && counts[k] !== recomputed[k]) {
        return { ok: false, outcome: 'invalid', reasons: ['psi-artifact-inconsistent: meta.counts disagree with the actual planned-slot rows (summary-only evidence is never trusted)'] };
      }
    }
  }
  if (normalized.planCertified === false) {
    return { ok: false, outcome: 'unverified', reasons: ['psi-plan-uncertified: recorded plan missing; collection completeness cannot be certified'] };
  }
  const reasons = [];
  if (recomputed.failed > 0) reasons.push(`psi-slot-failed: ${recomputed.failed} planned slot(s) failed measurement`);
  if (recomputed.missing > 0) reasons.push(`psi-slot-missing: ${recomputed.missing} planned slot(s) recorded nothing`);
  if (recomputed.partial > 0) reasons.push(`psi-slot-partial-usable: ${recomputed.partial} slot(s) usable with incomplete provenance`);
  if (recomputed.duplicate > 0) reasons.push(`psi-slot-duplicate: ${recomputed.duplicate} duplicate row(s) excluded`);
  if (recomputed.unplanned > 0) reasons.push(`psi-slot-unplanned: ${recomputed.unplanned} unplanned row(s) excluded`);
  if (normalized.runStatus === 'ok') {
    return { ok: true, outcome: 'ok', reasons };
  }
  return { ok: false, outcome: recomputed.usable > 0 ? 'partial' : 'failed', reasons };
}

export function classifyGscContent(json) {
  const meta = json?.meta;
  if (json?.schema !== GSC_SNAPSHOT_SCHEMA || !meta || typeof meta.runStatus !== 'string') {
    return { ok: false, outcome: 'invalid', reasons: ['gsc-artifact-invalid: not a gsc-snapshot/2 artifact with a runStatus'] };
  }
  // A's frozen contract: required slice/day failures => 'partial' (exit 1);
  // optional cuts (device/country) failing => 'degraded' (exit 0, required
  // slices complete). Optional degradation is collection success, distinctly
  // labelled — never invalid, never plain ok.
  let requiredBad = 0;
  let optionalBad = 0;
  for (const slice of Array.isArray(json.slices) ? json.slices : []) {
    for (const day of Object.values(slice?.days ?? {})) {
      if (!['complete', 'empty'].includes(day?.status)) {
        if (slice?.required === true) requiredBad += 1;
        else optionalBad += 1;
      }
    }
  }
  const inconsistent = (why) => ({ ok: false, outcome: 'invalid', reasons: [`gsc-artifact-inconsistent: ${why}`] });
  switch (meta.runStatus) {
    case 'ok':
      if (requiredBad > 0 || optionalBad > 0) return inconsistent('runStatus ok but slice/day failures are recorded');
      return { ok: true, outcome: 'ok', reasons: [] };
    case 'degraded':
      if (requiredBad > 0) return inconsistent('runStatus degraded but REQUIRED slice/day failures are recorded');
      return {
        ok: true,
        outcome: 'degraded',
        reasons: [`gsc-optional-slices-degraded: ${optionalBad} optional slice/day failure(s) recorded (required slices complete; optional cuts are never silently dropped)`],
      };
    case 'partial':
      return { ok: false, outcome: 'partial', reasons: [`gsc-run-partial: ${requiredBad} required slice/day failure(s); the artifact must not be treated as full coverage`] };
    case 'failed':
      return { ok: false, outcome: 'failed', reasons: ['gsc-run-failed: collection failed before a complete snapshot existed'] };
    default:
      return { ok: false, outcome: 'invalid', reasons: ['gsc-artifact-invalid: unknown runStatus'] };
  }
}

const CONTENT_CLASSIFIERS = { gsc: classifyGscContent, psi: classifyPsiContent, crux: classifyCruxContent };

export function collectorStage({ kind, planned, artifactInfo, runId, attempt, reportDate, exitCode, startedAt = null, endedAt = null }) {
  const record = baseStage({ runId, attempt, reportDate, stage: `collect-${kind}`, kind: 'collector', required: true, startedAt, endedAt, exitCode });
  const classify = CONTENT_CLASSIFIERS[kind];
  if (!classify) throw new Error(`collectorStage: unknown collector kind ${kind}`);
  if (!artifactInfo) throw new Error('collectorStage: artifactInfo (inspectPlannedArtifact result) is required');

  const artifact = {
    path: artifactInfo.path ?? planned?.artifact ?? null,
    present: Boolean(artifactInfo.present),
    boundToRun: Boolean(artifactInfo.boundToRun),
    observedAt: artifactInfo.observedAt ?? null,
    detail: artifactInfo.detail ?? 'missing',
  };

  if (!artifact.present) {
    return finish(record, { status: 'failed', outcome: 'unverified' }, artifact, [
      `no-current-artifact: this run attempt produced nothing at ${artifact.path ?? '(unplanned path)'}; older files are never borrowed for a failed stage`,
    ]);
  }
  if (artifact.detail === 'invalid') {
    return finish(record, { status: 'failed', outcome: 'invalid' }, artifact, [
      'artifact-invalid: the exact produced file is not valid JSON with meta.fetchedAt',
    ]);
  }
  if (!artifact.boundToRun) {
    return finish(record, { status: 'failed', outcome: 'unverified' }, artifact, [
      `artifact-not-bound-to-run: ${artifact.path} was not fetched during this run attempt (fetchedAt ${artifact.observedAt} vs plan ${planned?.createdAt}); an older artifact never proves this collection`,
    ]);
  }

  const verdict = classify(artifactInfo.json);
  const reasons = [...verdict.reasons];
  if (exitCode !== 0) {
    reasons.unshift(`collector-exit-nonzero: process exit ${exitCode} (stage success needs outcome AND artifact to agree)`);
  }
  const ok = verdict.ok && exitCode === 0;
  return finish(record, ok ? { status: 'succeeded', outcome: verdict.outcome } : { status: 'failed', outcome: verdict.ok ? 'partial' : verdict.outcome }, artifact, reasons);
}

// ---------------------------------------------------------------------------
// Report adapter: exit 0/2 ONLY together with all required valid artifacts and
// the expected identity/cutoff. Generated vs failed is separate from the
// fresh/degraded evidence quality of a generated report.
// ---------------------------------------------------------------------------

export function reportStage({
  runId,
  attempt,
  reportDate,
  exitCode,
  reportPath,
  markdownPath,
  expected = {},
  startedAt = null,
  endedAt = null,
  fs,
}) {
  const record = baseStage({ runId, attempt, reportDate, stage: 'report', kind: 'report', required: true, startedAt, endedAt, exitCode });
  const artifact = { path: reportPath, present: false, boundToRun: false, observedAt: null, detail: 'missing' };
  const reasons = [];
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    artifact.present = true;
  } catch {
    reasons.push(`report-json-missing: ${reportPath} is absent or unparseable (a partial or stale JSON never counts)`);
  }
  let markdown = null;
  try {
    markdown = fs.readFileSync(markdownPath, 'utf8');
  } catch {
    reasons.push(`report-markdown-missing: ${markdownPath} is absent (Markdown is written after JSON; a JSON-only run is not a generated report)`);
  }
  if (markdown !== null && markdown.trim() === '') {
    reasons.push('report-markdown-empty: required Markdown artifact is empty');
    markdown = null;
  }

  let identityOk = true;
  const fail = (why) => { reasons.push(why); identityOk = false; };
  if (report) {
    if (report.schema !== SEO_REPORT_SCHEMA) {
      fail(`report-schema-invalid: expected ${SEO_REPORT_SCHEMA}`);
    }
    if (expected.asOf !== undefined && report.params?.asOf !== expected.asOf) {
      fail('report-cutoff-mismatch: the report selection cutoff does not match the expected cutoff');
    }
    if (expected.runDate !== undefined && report.params?.runDate !== expected.runDate) {
      fail('report-identity-mismatch: the report run date does not match the frozen report date');
    }
    if (expected.start !== undefined && report.params?.start !== expected.start) {
      fail('report-window-mismatch: the report window start does not match the expected window');
    }
    if (expected.end !== undefined && report.params?.end !== expected.end) {
      fail('report-window-mismatch: the report window end does not match the expected window');
    }

    // Minimum evidence shape ACTUALLY consumed by the trusted publisher. A
    // schema+params shell is never a generated report.
    const needObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
    if (typeof report.params?.start !== 'string' || typeof report.params?.end !== 'string') {
      fail('report-shape-invalid: params.start/end window identity missing');
    }
    if (!needObj(report.inputs)) fail('report-shape-invalid: inputs provenance missing');
    if (!needObj(report.sources)) {
      fail('report-shape-invalid: sources missing');
    } else {
      for (const name of ['gsc', 'psi', 'crux']) {
        const f = report.sources[name]?.freshness;
        if (!needObj(report.sources[name]) || !needObj(f) || typeof f.status !== 'string' || typeof f.fresh !== 'boolean') {
          fail(`report-shape-invalid: sources.${name}.freshness (status/fresh) missing`);
        }
      }
    }
    if (!needObj(report.trend) || typeof report.trend.status !== 'string') fail('report-shape-invalid: trend missing');
    if (!Array.isArray(report.observations)) fail('report-shape-invalid: observations missing');
    if (!needObj(report.queryEvidence) || typeof report.queryEvidence.status !== 'string') fail('report-shape-invalid: queryEvidence status missing');
    if (!needObj(report.gscWindows)) fail('report-shape-invalid: gscWindows missing');
    if (typeof report.markdown !== 'string' || report.markdown.trim() === '') fail('report-shape-invalid: deterministic markdown missing from the report');

    // JSON/Markdown correspondence: the Markdown artifact must BE this exact
    // report's deterministic markdown, not any other run's body.
    if (markdown !== null && typeof report.markdown === 'string' && report.markdown !== markdown) {
      fail('report-markdown-mismatch: the Markdown artifact is not this report\u2019s deterministic markdown');
    }

    // Exit code vs source freshness consistency (B1: exit 0 iff all fresh).
    const freshness = report.sources?.gsc?.freshness;
    const allFresh = Boolean(freshness)
      && report.sources.gsc.freshness.fresh === true
      && report.sources.psi.freshness.fresh === true
      && report.sources.crux.freshness.fresh === true;
    if (exitCode === 0 && !allFresh) {
      fail('report-exit-freshness-mismatch: exit 0 claims every source fresh but the report records degraded evidence');
    }
    if (exitCode === 2 && allFresh) {
      fail('report-exit-freshness-mismatch: exit 2 claims degraded evidence but the report records every source fresh');
    }
  } else {
    identityOk = false;
  }

  if (exitCode !== 0 && exitCode !== 2) {
    reasons.unshift(`report-exit-invalid: generation exit ${exitCode} (only 0 or 2 mean "generated"; exit 1/unknown is a failed stage)`);
  }

  const generated = (exitCode === 0 || exitCode === 2) && report !== null && markdown !== null && identityOk;
  artifact.detail = generated ? 'ok' : (artifact.present ? 'invalid' : 'missing');
  artifact.boundToRun = generated;
  if (generated) {
    return finish(record, { status: 'succeeded', generated: true, evidence: exitCode === 0 ? 'fresh' : 'degraded' }, artifact, exitCode === 2
      ? ['report-generated-degraded: evidence is stale/missing/partial at the cutoff (in-band gaps, generation succeeded)']
      : []);
  }
  return finish(record, { status: 'failed', generated: false, evidence: 'unknown' }, artifact, reasons);
}

// ---------------------------------------------------------------------------
// Optional interpretation + required publication
// ---------------------------------------------------------------------------

export function interpretationStage({ record: interpretation, runId, attempt, reportDate, startedAt = null, endedAt = null }) {
  const ok = interpretation?.status === 'ok';
  const stage = baseStage({ runId, attempt, reportDate, stage: 'interpretation', kind: 'interpretation', required: false, startedAt, endedAt, exitCode: 0 });
  return finish(
    stage,
    ok ? { status: 'succeeded', outcome: 'ok' } : { status: 'failed', outcome: 'failed' },
    { path: null, present: Boolean(interpretation), boundToRun: Boolean(interpretation), observedAt: interpretation?.observedAt ?? null, detail: interpretation ? 'ok' : 'missing' },
    ok ? [] : [`interpretation-failed: ${interpretation?.diagnostics?.errorClass ?? 'missing'} (optional and non-blocking for the required flow, never called a successful interpretation; model text withheld)`],
  );
}

export function publishStage({ runId, attempt, reportDate, exitCode, startedAt = null, endedAt = null, target = 'daily-issue' }) {
  const record = baseStage({ runId, attempt, reportDate, stage: 'publish', kind: 'publish', required: true, startedAt, endedAt, exitCode });
  return finish(
    record,
    exitCode === 0 ? { status: 'succeeded', outcome: 'ok' } : { status: 'failed', outcome: 'failed' },
    { path: target, present: true, boundToRun: true, observedAt: null, detail: exitCode === 0 ? 'ok' : 'missing' },
    exitCode === 0 ? [] : [`publish-failed: trusted publication exit ${exitCode} (publication failure is never green)`],
  );
}

// ---------------------------------------------------------------------------
// Aggregate: required stages decide the flow; the optional interpretation is
// reported honestly and never blocks nor is ever claimed successful.
// ---------------------------------------------------------------------------

export function aggregateStages({ stages = [], runId = null, attempt = null, reportDate = null } = {}) {
  const briefs = stages.map((s) => ({
    stage: s.stage,
    kind: s.kind,
    required: s.required !== false,
    status: s.result?.status ?? 'failed',
    outcome: s.result?.outcome ?? null,
    generated: s.result?.generated ?? null,
    evidence: s.result?.evidence ?? null,
  }));
  const required = briefs.filter((b) => b.required);
  const interpretationBriefs = briefs.filter((b) => b.kind === 'interpretation');
  const requiredOk = required.length > 0 && required.every((b) => b.status === 'succeeded');
  const interpretationStatus = interpretationBriefs.length === 0
    ? 'absent'
    : interpretationBriefs.every((b) => b.status === 'succeeded') ? 'ok' : 'failed';
  return {
    schema: PIPELINE_STATUS_SCHEMA,
    runId,
    attempt,
    reportDate,
    required: { ok: requiredOk, stages: required },
    optional: { interpretation: interpretationStatus },
    // Optional model failure may leave the REQUIRED flow green, but this
    // status is never read as "successful interpretation".
    ok: requiredOk,
    stages: briefs,
    notes: [
      'required collector/report/publication failures are always nonzero',
      'certified CrUX notEligible is successful collection/no-sample (unknown field data, never zero)',
      'an optional failed interpretation keeps its failed state and withholds model text',
    ],
  };
}
