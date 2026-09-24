// Frozen run identity, dates and exact artifact planning for the trusted SEO
// pipeline (issue #392 / batch B2).
//
// Boundaries:
//   * The UTC report date is frozen ONCE per run (avoids a midnight split of
//     the daily issue identity) and is separate from all evidence dates (GSC
//     Pacific calendar, PSI measurement dates, CrUX collection periods) and
//     from computed artifact timestamps.
//   * decisionAt is frozen only AFTER Google collection and the read-only
//     GitHub review-state read. It is the ONE decision instant passed as Hugo
//     --clock, seo-report --as-of and the gate --decision-at. generatedAt of a
//     computed artifact may exceed it; source observations may not.
//   * Every collector run attempt gets EXACT, unique, safe --out paths planned
//     up front and bound to runId+attempt. The exact new artifact is the only
//     proof of this attempt's collection — an older file at another path (for
//     example yesterday's daily file) is never borrowed.
//
// Pure planning helpers plus tiny fs probes; no network, no collectors.

import * as nodeFs from 'node:fs';

import { GscError } from './gsc-errors.mjs';
import { isValidUtcTimestamp, parseUtcTimestamp, defaultWindow, todayInTimezone } from './gsc-dates.mjs';
import { pickSnapshotPath } from './gsc-persist.mjs';
import { pickObservationPath } from './psi-persist.mjs';

export const RUN_PLAN_SCHEMA = 'seo-run-plan/1';
export const RUN_CONTEXT_SCHEMA = 'seo-run-context/1';
export const REPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const COLLECTOR_KINDS = ['gsc', 'psi', 'crux'];

// 56 days inclusive (lookback 55) with the shared end lag: enough for the
// current 28 + prior non-overlapping 28 day comparison the report exposes.
export const REPORT_WINDOW_LOOKBACK = 55;
export const REPORT_WINDOW_END_LAG_DAYS = 3;

export function freezeUtc(now = new Date()) {
  return now.toISOString();
}

export function frozenReportDate(now = new Date()) {
  return todayInTimezone(now, 'UTC');
}

// Deterministic report window for a frozen decision/as-of instant: reuses A's
// defaultWindow so the collector and report agree on the data-date boundary.
export function reportWindow({ asOf }) {
  if (!isValidUtcTimestamp(asOf)) {
    throw new GscError('reportWindow: asOf must be a strict UTC timestamp.', { kind: 'config' });
  }
  return defaultWindow({
    now: new Date(asOf),
    lookback: REPORT_WINDOW_LOOKBACK,
    endLagDays: REPORT_WINDOW_END_LAG_DAYS,
  });
}

// Exact immutable observation/snapshot path per collector for THIS run
// attempt. Unique: the daily name is kept when free, otherwise the shared
// collision-safe suffix shape both discoveries accept. Never overwrites —
// an existing path is a refusal, exactly like the collectors' --out semantics.
function planArtifactPath(kind, { reportDate, dataDir, now, exists, random }) {
  const opts = { runDate: reportDate, dir: dataDir, now, exists };
  if (typeof random === 'function') opts.random = random;
  if (kind === 'gsc') return pickSnapshotPath(opts);
  return pickObservationPath({ prefix: kind, ...opts });
}

export function planRun({
  repository,
  runId,
  attempt = 1,
  reportDate,
  dataDir = 'data/seo',
  createdAt = freezeUtc(),
  now = new Date(createdAt),
  exists = nodeFs.existsSync,
  random,
} = {}) {
  if (typeof repository !== 'string' || repository === '') {
    throw new GscError('planRun: repository identity is required.', { kind: 'config' });
  }
  if (!RUN_ID_RE.test(String(runId ?? ''))) {
    throw new GscError('planRun: runId must be a safe bounded identifier (run id + attempt).', { kind: 'config' });
  }
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new GscError('planRun: attempt must be a positive integer.', { kind: 'config' });
  }
  if (!REPORT_DATE_RE.test(String(reportDate ?? ''))) {
    throw new GscError('planRun: reportDate must be a frozen UTC calendar date (YYYY-MM-DD).', { kind: 'config' });
  }
  if (!isValidUtcTimestamp(createdAt)) {
    throw new GscError('planRun: createdAt must be a strict UTC timestamp.', { kind: 'config' });
  }
  const collectors = {};
  for (const kind of COLLECTOR_KINDS) {
    const artifact = planArtifactPath(kind, { reportDate, dataDir, now, exists, random: random?.[kind] ?? random });
    collectors[kind] = { kind, artifact, createdAt };
  }  return {
    schema: RUN_PLAN_SCHEMA,
    repository,
    runId: String(runId),
    attempt,
    reportDate,
    createdAt,
    dataDir,
    collectors,
  };
}

// The exact produced artifact of one collector stage: present at the planned
// path, parseable, and BOUND to this run attempt (its own meta.fetchedAt may
// not predate the plan). Anything else is unverified — never a borrowed file.
export function inspectPlannedArtifact({ planned, fs = nodeFs }) {
  const path = planned?.artifact ?? null;
  const base = { path, present: false, boundToRun: false, observedAt: null, detail: 'missing' };
  if (!path) return { ...base, detail: 'unplanned' };
  let raw;
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch {
    return { ...base, detail: 'missing' };
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ...base, present: true, detail: 'invalid' };
  }
  const observedAt = json?.meta?.fetchedAt ?? null;
  const base2 = { path, present: true, boundToRun: false, observedAt: isValidUtcTimestamp(observedAt) ? observedAt : null, detail: 'invalid', json };
  if (!isValidUtcTimestamp(observedAt)) return base2;
  // Bound to THIS attempt: the plan predates the collector's own fetch time.
  const plannedMs = Date.parse(planned.createdAt);
  if (!(Date.parse(observedAt) >= plannedMs)) {
    return { ...base2, detail: 'not-this-run' };
  }
  return { ...base2, boundToRun: true, detail: 'ok' };
}

export { parseUtcTimestamp };
