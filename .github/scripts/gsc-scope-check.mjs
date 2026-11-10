// Manual, single-day Search Analytics control. No regular snapshot semantics change.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { getAccessToken, fetchSliceDay } from '../../scripts/lib/gsc-client.mjs';
import { hostFilterGroup, API_ROW_LIMIT, MAX_PAGES_PER_DAY } from '../../scripts/lib/gsc-snapshot.mjs';
import { addDays, isValidCalendarDate, isValidUtcTimestamp, todayInTimezone } from '../../scripts/lib/gsc-dates.mjs';

const PROPERTY = 'sc-domain:cubxxw.com';
const TARGET = 'https://cubxxw.com/engineering/posts/go-release-tools/';
const SCHEMA = 'gsc-scope-contrast/1';
function identity({ day, sourceSha, runId, attempt, fetchedAt }) {
  if (!isValidCalendarDate(day) || !isValidUtcTimestamp(fetchedAt) ||
      day > addDays(todayInTimezone(new Date(fetchedAt)), -3) ||
      !/^[a-f0-9]{40}$/.test(sourceSha ?? '') || !/^\d{1,20}$/.test(runId ?? '') ||
      !Number.isInteger(attempt) || attempt < 1) throw new Error('Invalid observation identity or final-data date.');
}
function plan() {
  return [
    ['page-unfiltered-auto', ['date', 'page'], false, 'auto'],
    ['page-unfiltered-byPage', ['date', 'page'], false, 'byPage'],
    ['page-filtered-auto', ['date', 'page'], true, 'auto'],
    ['page-filtered-byPage', ['date', 'page'], true, 'byPage'],
    ['device-unfiltered-auto', ['date', 'page', 'device'], false, 'auto'],
    ['device-filtered-auto', ['date', 'page', 'device'], true, 'auto'],
    ['country-unfiltered-auto', ['date', 'page', 'country'], false, 'auto'],
    ['country-filtered-auto', ['date', 'page', 'country'], true, 'auto'],
  ].map(([id, dimensions, filtered, requestAggregationType]) => ({ id, context: {
    property: PROPERTY, searchType: 'web', dataState: 'final', dimensions,
    filters: filtered ? [hostFilterGroup('cubxxw.com')] : [], requestAggregationType, slice: id,
  } }));
}
function paginationComplete(observation, context) {
  const req = observation?.request; const res = observation?.response;
  if (observation?.slice !== context.slice || req?.rowLimit !== API_ROW_LIMIT || req?.maxPages !== MAX_PAGES_PER_DAY ||
      !Array.isArray(req.startRows) || !Array.isArray(res?.pageRowCounts) || res.pages < 1 || res.pages > MAX_PAGES_PER_DAY ||
      req.startRows.length !== res.pages || res.pageRowCounts.length !== res.pages ||
      JSON.stringify(res.aggregationTypesSeen) !== '["byPage"]') return false;
  let total = 0;
  for (let i = 0; i < res.pages; i++) {
    const count = res.pageRowCounts[i];
    if (req.startRows[i] !== total || !Number.isInteger(count) || count < 0 || count > API_ROW_LIMIT ||
        (i < res.pages - 1 && count !== API_ROW_LIMIT)) return false;
    total += count;
  }
  const last = res.pageRowCounts.at(-1);
  return total === observation.rows?.length && new Set(observation.rows.map(r => JSON.stringify(r.keys))).size === total &&
    ((last === 0 && res.terminator === 'empty-page') || (last > 0 && last < API_ROW_LIMIT && res.terminator === 'short-page'));
}
function summarize(observation, context, day) {
  const rows = observation?.rows;
  const valid = ['complete', 'empty'].includes(observation?.status) && !observation.truncated &&
    !observation.error && !observation.conflict && observation.day === day &&
    observation.response?.responseAggregationType === 'byPage' && Array.isArray(rows) && paginationComplete(observation, context) &&
    rows.every(r => Array.isArray(r.keys) && r.keys.length === context.dimensions.length &&
      r.keys.every(k => typeof k === 'string') && r.keys[0] === day &&
      ['clicks', 'impressions', 'ctr', 'position'].every(k => Number.isFinite(r[k]) && r[k] >= 0));
  if (!valid) return { status: 'unknown', targetStatus: 'unknown', metrics: null };
  const selected = rows.filter(r => r.keys[1] === TARGET);
  if (!selected.length) return { status: 'observed', targetStatus: 'not-returned', metrics: null };
  const clicks = selected.reduce((n, r) => n + r.clicks, 0);
  const impressions = selected.reduce((n, r) => n + r.impressions, 0);
  const position = impressions > 0 ? selected.reduce((n, r) => n + r.position * r.impressions, 0) / impressions : null;
  return { status: 'observed', targetStatus: 'returned', metrics: { clicks, impressions, ctr: impressions > 0 ? clicks / impressions : null, position } };
}
function countsOf(results) {
  return { planned: 8, observed: results.filter(r => r.status === 'observed').length,
    unknown: results.filter(r => r.status === 'unknown').length, blocked: results.filter(r => r.status === 'blocked').length };
}
export async function collectScopeProbe({ serviceAccountJson, deps = {}, onCase = () => {}, ...meta }) {
  identity(meta);
  const report = { schema: SCHEMA, meta: { ...meta, property: PROPERTY, targetURL: TARGET,
    runStatus: 'incomplete', internalGoogleRowCoverage: 'unknown', error: null,
    basis: 'Separate same-day request contexts; no query×device×country join or inferred causal ranking effect.' }, results: [] };
  let token; let halted = false;
  try { token = await getAccessToken({ serviceAccountJson, deps: { ...deps, nowMs: Date.parse(meta.fetchedAt) } }); }
  catch { report.meta.error = { kind: 'auth', message: 'OAuth unavailable; raw details omitted.' }; halted = true; }
  for (const [index, item] of plan().entries()) {
    let result;
    if (halted) result = { ...item, status: index === 0 ? 'unknown' : 'blocked', targetStatus: 'unknown', metrics: null, observation: null };
    else {
      const observation = await fetchSliceDay({ context: item.context, day: meta.day, token,
        rowLimit: API_ROW_LIMIT, maxPages: MAX_PAGES_PER_DAY, deps });
      result = { ...item, observation, ...summarize(observation, item.context, meta.day) };
      if (index === 0 && (result.status !== 'observed' || !(result.metrics?.impressions > 0))) halted = true;
      if (observation.error?.kind === 'auth') halted = true;
    }
    report.results.push(result); onCase(result);
  }
  report.counts = countsOf(report.results);
  if (report.counts.observed === 8 && report.results[0].metrics?.impressions > 0) report.meta.runStatus = 'complete';
  return report;
}
export function validateScopeReport(report, expected) {
  try {
    identity(expected);
    if (report.schema !== SCHEMA || report.meta.property !== PROPERTY || report.meta.targetURL !== TARGET ||
        report.meta.runStatus !== 'complete' || report.meta.error !== null || report.meta.internalGoogleRowCoverage !== 'unknown' ||
        !['day', 'sourceSha', 'runId', 'attempt', 'fetchedAt'].every(k => report.meta[k] === expected[k]) ||
        report.results.length !== 8 || JSON.stringify(report.counts) !== JSON.stringify(countsOf(report.results))) return false;
    for (const [i, item] of plan().entries()) {
      const row = report.results[i]; const actual = summarize(row.observation, item.context, expected.day);
      if (row.id !== item.id || JSON.stringify(row.context) !== JSON.stringify(item.context) || actual.status !== 'observed' ||
          row.status !== actual.status || row.targetStatus !== actual.targetStatus || JSON.stringify(row.metrics) !== JSON.stringify(actual.metrics)) return false;
    }
    return report.results[0].metrics?.impressions > 0;
  } catch { return false; }
}
async function main() {
  const expected = { day: process.env.PROBE_DATE, sourceSha: process.env.SOURCE_SHA,
    runId: process.env.GITHUB_RUN_ID, attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    fetchedAt: process.env.OBSERVED_AT ?? new Date().toISOString() };
  if (process.argv.includes('--validate')) {
    const report = JSON.parse(readFileSync(process.env.REPORT_PATH, 'utf8'));
    process.exitCode = validateScopeReport(report, expected) ? 0 : 1;
    return;
  }
  writeFileSync(process.env.PROGRESS_PATH, '', { flag: 'wx' });
  const report = await collectScopeProbe({ ...expected, serviceAccountJson: process.env.GSC_SERVICE_ACCOUNT_JSON,
    onCase: row => appendFileSync(process.env.PROGRESS_PATH, JSON.stringify(row) + '\n') });
  writeFileSync(process.env.REPORT_PATH, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  process.exitCode = validateScopeReport(report, expected) ? 0 : 1;
  console.log(`Scope comparison: ${report.counts.observed}/8 cases observed; internal Google row coverage remains unknown.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Scope comparison unavailable; check input identity, output paths and provider access. Raw details omitted.'); process.exitCode = 1; });
}
