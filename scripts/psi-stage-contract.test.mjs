import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { extractMeasurement, summarizeEntries } from './lib/psi-measure.mjs';
import { compareCompatibleSamples } from './lib/seo-observations.mjs';
import { classifyPsiContent, collectorStage } from './lib/seo-stages.mjs';
import { buildPsiSection, buildObservations } from './lib/seo-report-core.mjs';

// Persisted real API shape: all 26 slots collected, API 13.5.0 lacks the
// Lighthouse CLI throttling/UA/screen config needed to certify comparisons.
const latest = () => JSON.parse(readFileSync(new URL('../data/seo/psi-2026-10-11.json', import.meta.url), 'utf8'));
function stage(json, exitCode = 2, artifactOverrides = {}) {
  return collectorStage({
    kind: 'psi', runId: '392', attempt: 1, reportDate: '2026-10-11', exitCode,
    planned: { artifact: 'data/seo/psi-current.json', createdAt: '2026-10-11T11:50:00.000Z' },
    artifactInfo: {
      path: 'data/seo/psi-current.json', present: true, boundToRun: true,
      observedAt: json.meta.fetchedAt, detail: 'ok', json, ...artifactOverrides,
    },
  });
}
function refreshCounts(json) {
  json.meta.counts = summarizeEntries({ planned: json.meta.planned, entries: json.measurements }).counts;
  return json;
}

test('real 26/26 provenance-only partial artifact succeeds with explicit comparison degradation', () => {
  const json = latest();
  const result = stage(json);
  assert.equal(result.result.status, 'succeeded');
  assert.equal(result.result.outcome, 'degraded');
  assert.match(result.reasons.join('\n'), /comparison.*withheld/);
  assert.equal(result.process.exitCode, 2); // preserves the actual old collector outcome
  assert.equal(json.meta.counts.partial, 26); // no historical artifact rewriting
  assert.equal(stage(json, 0).result.status, 'succeeded');
  assert.equal(stage(json, 1).result.status, 'failed');
  assert.equal(stage(json, 3).result.status, 'failed');
});

test('collection success never makes API settings unknowns comparable or creates regression work', () => {
  const json = latest();
  const current = json.measurements[0];
  const prior = structuredClone(current);
  prior.provenance.fetchTime = '2026-10-10T11:51:25.760Z';
  prior.metrics.LCP.numericValue = 1000;
  prior.metrics.CLS.numericValue = 0;
  const currentSample = { entry: current, observation: { file: 'current.json', observedAt: json.meta.fetchedAt } };
  const priorSample = { entry: prior, observation: { file: 'prior.json', observedAt: '2026-10-10T12:00:00.000Z' } };
  const compared = compareCompatibleSamples(current, prior);
  assert.equal(compared.compatible, false);
  assert.equal(compared.deltas, null);
  assert.match(compared.reason, /incomplete measurement provenance/);
  const section = buildPsiSection({ psi: {
    byTarget: [{ url: current.url, strategy: current.strategy, current: currentSample, currentOutcome: 'partial', currentCertified: true, samples: [priorSample, currentSample] }],
    observations: [],
  } });
  assert.equal(section.comparisons[0].compared, false);
  assert.equal(section.missingSet.length, 1);
  const observations = buildObservations({ gsc: {}, psiSection: section, cruxSection: { groups: [] } });
  assert.ok(!observations.some((o) => o.kind === 'metric-regression' && o.actionable));
});

test('complete newly collected API-shaped samples pass the stage at exit 0', () => {
  const json = latest();
  json.measurements = json.measurements.map((old) => extractMeasurement({
    url: old.url, strategy: old.strategy,
    json: { lighthouseResult: {
      requestedUrl: old.provenance.requestedUrl, finalDisplayedUrl: old.provenance.finalUrl,
      fetchTime: old.provenance.fetchTime, lighthouseVersion: '13.5.0',
      configSettings: { formFactor: old.strategy, locale: 'en-US', channel: 'lr', onlyCategories: ['performance'] },
      categories: { performance: { score: old.scores.performance } },
      audits: { 'largest-contentful-paint': { numericValue: old.metrics.LCP.numericValue }, 'cumulative-layout-shift': { numericValue: old.metrics.CLS.numericValue } },
    } },
  }));
  refreshCounts(json);
  assert.equal(json.meta.counts.succeeded, 26);
  assert.equal(classifyPsiContent(json).outcome, 'degraded');
  assert.equal(stage(json, 0).result.status, 'succeeded');
  assert.equal(stage(json, 2).result.status, 'failed'); // exit2 is only the recorded old partial contract
});

test('PSI degraded acceptance rejects invalid current metrics, URLs, timestamps and failure evidence', () => {
  const changes = [
    (e) => { e.metrics.LCP.numericValue = null; },
    (e) => { e.metrics.CLS.numericValue = -0.1; },
    (e) => { e.metrics.CLS.unit = 'ms'; },
    (e) => { e.scores.performance = 1.1; },
    (e) => { e.provenance.fetchTime = null; },
    (e) => { e.provenance.lighthouseVersion = null; },
    (e) => { e.provenance.requestedUrl = null; },
    (e) => { e.provenance.requestedUrl = 'https://other.example/'; },
    (e) => { e.provenance.finalUrl = null; },
    (e) => { e.provenance.finalUrl = 'not-a-url'; },
    (e) => { e.provenance.finalUrl = 'file:///private/page'; },
    (e) => { e.usable = false; },
    (e) => { e.lighthouseRuntimeError = { code: 'NO_FCP' }; },
    (e) => { e.reasonCategory = 'psi-api-failure'; },
    (e) => { e.error = 'failure'; },
    (e) => { e.finalStatus = 'failed'; },
  ];
  for (const change of changes) {
    const json = latest();
    change(json.measurements[0]);
    refreshCounts(json);
    assert.equal(stage(json, 0).result.status, 'failed', change.toString());
    assert.equal(stage(json, 2).result.status, 'failed', change.toString());
  }
});

test('a partial row with complete comparison provenance cannot claim provenance-only degradation', () => {
  const json = latest();
  json.measurements[0].provenance.configSettings = {
    formFactor: 'mobile', throttlingMethod: 'simulate', locale: 'en-US', emulatedUserAgent: 'test-browser',
    throttling: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 150, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 },
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  };
  assert.equal(stage(json, 2).result.status, 'failed');
  assert.match(stage(json, 2).reasons.join('\n'), /partial-unexplained/);
});

test('PSI degraded acceptance requires every planned slot exactly once and the exact new v2 artifact', () => {
  for (const change of [
    (j) => { j.measurements.pop(); },
    (j) => { j.measurements.push(structuredClone(j.measurements[0])); },
    (j) => { j.measurements[0].url = 'https://cubxxw.com/unplanned/'; },
  ]) {
    const json = latest(); change(json); refreshCounts(json);
    assert.equal(stage(json, 2).result.status, 'failed');
  }
  const noPlan = latest(); delete noPlan.meta.planned;
  assert.equal(stage(noPlan, 2).result.status, 'failed');
  assert.equal(stage(latest(), 2, { boundToRun: false }).result.status, 'failed');
  assert.equal(stage(latest(), 2, { present: false }).result.status, 'failed');
  const legacy = { meta: { fetchedAt: latest().meta.fetchedAt, urls: ['https://cubxxw.com/'], strategies: ['mobile'] }, results: [{ url: 'https://cubxxw.com/', strategy: 'mobile', metrics: { LCP: { numericValue: 2000 }, CLS: { numericValue: 0 } } }], failures: [] };
  assert.equal(stage(legacy, 2).result.status, 'failed');
});
