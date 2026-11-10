import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { collectScopeProbe, validateScopeReport } from './gsc-scope-check.mjs';

const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const opts = { day: '2026-11-06', sourceSha: 'a'.repeat(40), runId: '42', attempt: 1,
  fetchedAt: '2026-11-10T20:00:00.000Z', serviceAccountJson: JSON.stringify({ client_email: 'fixture@example.invalid', private_key: key }) };
const target = 'https://cubxxw.com/engineering/posts/go-release-tools/';
function transport(change = (_, value) => value) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    if (url === 'https://oauth2.googleapis.com/token') return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'fixture-access-token' }) };
    assert.equal(url, 'https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Acubxxw.com/searchAnalytics/query');
    const body = JSON.parse(init.body); requests.push(body);
    const filtered = Boolean(body.dimensionFilterGroups);
    const keys = [body.startDate, target, ...(body.dimensions.length === 3 ? [body.dimensions[2] === 'device' ? 'DESKTOP' : 'usa'] : [])];
    const value = change(body, { responseAggregationType: 'byPage', rows: [{ keys, clicks: 0, impressions: filtered ? 2 : 45, ctr: 0, position: 7 }] });
    return { ok: true, status: 200, text: async () => JSON.stringify(value) };
  };
  return { requests, deps: { fetchImpl, sleep: async () => {} } };
}

test('real transport separates filter and aggregation while retaining each denominator', async () => {
  const fake = transport(); const report = await collectScopeProbe({ ...opts, deps: fake.deps });
  assert.equal(report.meta.runStatus, 'complete');
  assert.deepEqual(report.results.map(r => r.metrics?.impressions), [45, 45, 2, 2, 45, 2, 45, 2]);
  assert.deepEqual(fake.requests.map(r => [r.dimensions.join(','), Boolean(r.dimensionFilterGroups), r.aggregationType ?? 'auto']), [
    ['date,page', false, 'auto'], ['date,page', false, 'byPage'], ['date,page', true, 'auto'], ['date,page', true, 'byPage'],
    ['date,page,device', false, 'auto'], ['date,page,device', true, 'auto'], ['date,page,country', false, 'auto'], ['date,page,country', true, 'auto'],
  ]);
  assert.ok(fake.requests.every(r => r.type === 'web' && r.dataState === 'final' && r.startDate === r.endDate && r.rowLimit === 25000));
  assert.equal(validateScopeReport(report, opts), true);
});

test('invalid date or source/run identity prevents authentication and collection', async () => {
  for (const bad of [{ day: '2026-02-30' }, { day: '2026-11-10' }, { sourceSha: 'bad' }, { runId: '../42' }, { attempt: 0 }]) {
    const fake = transport(); await assert.rejects(collectScopeProbe({ ...opts, ...bad, deps: fake.deps })); assert.equal(fake.requests.length, 0);
  }
});

test('failed canary closes the remaining plan and never exposes raw errors or tokens', async () => {
  let calls = 0;
  const report = await collectScopeProbe({ ...opts, deps: { sleep: async () => {}, fetchImpl: async url => {
    if (url.includes('oauth2')) return { ok: true, status: 200, text: async () => '{"access_token":"fixture-access-token"}' };
    calls++; throw new Error('raw secret must stay private');
  } } });
  assert.equal(calls, 3, 'original transport permits three attempts, not an unbounded retry');
  assert.deepEqual(report.counts, { planned: 8, observed: 0, unknown: 1, blocked: 7 });
  assert.equal(validateScopeReport(report, opts), false);
  assert.ok(!JSON.stringify(report).includes('raw secret'));
  assert.ok(!JSON.stringify(report).includes('fixture-access-token'));
});

test('successful filtered absence stays unknown for that target instead of inventing zero traffic', async () => {
  const fake = transport((body, value) => body.dimensionFilterGroups ? { responseAggregationType: 'byPage', rows: [] } : value);
  const report = await collectScopeProbe({ ...opts, deps: fake.deps });
  assert.equal(report.meta.runStatus, 'complete');
  assert.equal(report.results[2].metrics, null); assert.equal(report.results[2].targetStatus, 'not-returned');
  assert.equal(validateScopeReport(report, opts), true);
});

test('wrong-day, incompatible aggregation and invalid metrics cannot certify a complete case', async () => {
  for (const mutate of [v => { v.rows[0].keys[0] = '2026-11-05'; }, v => { v.responseAggregationType = 'byProperty'; }, v => { v.rows[0].impressions = -1; }]) {
    const fake = transport((body, value) => { if (body.aggregationType === 'byPage') mutate(value); return value; });
    const report = await collectScopeProbe({ ...opts, deps: fake.deps });
    assert.equal(report.meta.runStatus, 'incomplete'); assert.equal(validateScopeReport(report, opts), false);
  }
});

test('artifact validation recomputes raw metrics and rejects mixed source, duplicate cases and changed scope', async () => {
  const fake = transport(); const report = await collectScopeProbe({ ...opts, deps: fake.deps });
  for (const mutate of [r => { r.meta.sourceSha = 'b'.repeat(40); }, r => { r.results[1] = r.results[0]; },
    r => { r.results[0].metrics.impressions = 1000; }, r => { r.results[0].context.filters = [{ groupType: 'and', filters: [] }]; },
    r => { r.counts.observed = 7; }, r => { r.results[0].observation.truncated = true; }]) {
    const changed = structuredClone(report); mutate(changed); assert.equal(validateScopeReport(changed, opts), false);
  }
});

test('missing pagination, duplicate raw rows and wrong raw slice cannot masquerade as complete evidence', async () => {
  const fake = transport(); const report = await collectScopeProbe({ ...opts, deps: fake.deps });
  for (const mutate of [r => { r.results[0].observation.request.startRows = [25000]; },
    r => { r.results[0].observation.slice = 'another-case'; },
    r => { r.results[0].observation.response.pageRowCounts = []; },
    r => { r.results[0].observation.rows.push(r.results[0].observation.rows[0]); }]) {
    const changed = structuredClone(report); mutate(changed); assert.equal(validateScopeReport(changed, opts), false);
  }
});
