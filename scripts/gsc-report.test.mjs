import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { aggregateRows, buildReport, loadAvailability, loadEvidence, selectDays, AS_OF_AFTER_CUTOFF_REASON, AS_OF_UNPROVABLE_REASON } from './lib/gsc-report-core.mjs';
import { classifyQuery, QUERY_LABELS } from './lib/gsc-queries.mjs';
import { main, parseCliArgs, writeReport } from './gsc-report.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TMP_ROOT = join(REPO_ROOT, '.tmp-gsc-tests');
const REAL_DATA_DIR = fileURLToPath(new URL('../data/seo/', import.meta.url));

// ---------------------------------------------------------------------------
// Fixture builders (in-memory / temp dirs; no network, no clock in results)
// ---------------------------------------------------------------------------

function row(day, rest, clicks, impressions, position) {
  return { keys: [day, ...rest], clicks, impressions, ctr: impressions ? clicks / impressions : 0, position };
}

function legacySnapshot({ siteUrl = 'sc-domain:cubxxw.com', window, fetchedAt, runDate, ...slices }) {
  return { meta: { siteUrl, window, fetchedAt, runDate }, ...slices };
}

function daySlice({ status = 'complete', availability = 'available', rows, responseAggregationType = 'byPage', conflict = null, error = null, rowLimit = 25000 }) {
  return {
    status,
    availability,
    rows,
    request: { rowLimit, maxPages: 40, startRows: [0] },
    response: {
      pageRowCounts: [rows.length],
      responseAggregationType,
      aggregationTypesSeen: responseAggregationType ? [responseAggregationType] : [],
      terminator: rows.length < rowLimit ? 'short-page' : 'empty-page',
      pages: 1,
    },
    truncated: false,
    conflict,
    warnings: [],
    error,
  };
}

function newSnapshot({ fetchedAt, runDate, requestWindow, runStatus = 'ok', meta: metaOverride = {}, slices }) {
  return {
    schema: 'gsc-snapshot/2',
    meta: {
      property: 'sc-domain:cubxxw.com',
      hostnameScope: { host: 'cubxxw.com', filterPattern: '^https?://cubxxw\\.com/', filterGroups: [] },
      searchType: 'web',
      dataState: 'final',
      dataTimezone: 'America/Los_Angeles',
      fetchedAt,
      runDate,
      requestWindow,
      runStatus,
      availability: {
        status: 'observed',
        probeWindow: { start: '2026-02-24', end: '2026-03-05' },
        observedDates: [],
        availableThrough: '2026-03-05',
        rejectedRowCount: 0,
        warnings: [],
        error: null,
      },
      config: { rowLimit: 25000, maxPages: 40 },
      error: null,
      ...metaOverride,
    },
    slices,
  };
}

function sliceSpec(name, { dimensions, filterGroups = [], requestAggregationType = 'auto', meta: sliceMeta = {}, days }) {
  return {
    name,
    scope: 'test',
    purpose: 'test fixture',
    required: true,
    dimensions,
    filterGroups,
    requestAggregationType,
    ...sliceMeta,
    days,
  };
}

function reportFrom(files, { start = '2026-03-02', end = '2026-03-05', host = 'cubxxw.com', includeQueryRows = false, order = null, asOf = null, pairsLimit = 500 } = {}) {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'report-'));
  try {
    const names = Object.keys(files);
    const writeOrder = order ?? names;
    for (const name of writeOrder) {
      writeFileSync(join(dir, name), `${JSON.stringify(files[name], null, 2)}\n`);
    }
    return buildReport({ dir, start, end, host, includeQueryRows, asOf, pairsLimit });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// params.dir varies with the temp dir; logical inputs are what must match.
const norm = (r) => JSON.stringify({ ...r, params: { ...r.params, dir: '<dir>' } });

const datePageSlice = (days, responseAggregationType = 'byPage') =>
  sliceSpec('date_page', { dimensions: ['date', 'page'], days });

// ---------------------------------------------------------------------------
// Weighted metrics
// ---------------------------------------------------------------------------

test('weighted metrics: CTR from sums, position impression-weighted, zero-impression position null', () => {
  const m = aggregateRows([
    row('2026-03-02', ['https://cubxxw.com/a'], 1, 100, 5),
    row('2026-03-02', ['https://cubxxw.com/b'], 0, 300, 11),
    row('2026-03-02', ['https://cubxxw.com/c'], 0, 0, 42), // zero impressions: weight 0
  ]);
  assert.equal(m.clicks, 1);
  assert.equal(m.impressions, 400);
  assert.equal(m.ctr, 1 / 400);
  assert.ok(Math.abs(m.position - (5 * 100 + 11 * 300 + 42 * 0) / 400) < 1e-12);
  const zero = aggregateRows([row('2026-03-02', ['https://cubxxw.com/z'], 0, 0, 7)]);
  assert.equal(zero.ctr, null, 'zero denominator -> null CTR');
  assert.equal(zero.position, null, 'zero impressions -> null position');
});

test('query labels: transparent rule order site: > brand > anomaly > nonbrand', () => {
  assert.equal(classifyQuery('site:cubxxw.com/zh'), 'site-maintenance');
  assert.equal(classifyQuery('cubxxw blog'), 'brand');
  assert.equal(classifyQuery('nsddd.top archive'), 'brand');
  assert.equal(classifyQuery('goreleaser action'), 'nonbrand');
  assert.equal(classifyQuery('go kubernetes hugo release deploy test ci cd pipeline extra tokens beyond limit here'), 'ambiguous-anomalous-heuristic');
  assert.equal(classifyQuery('see https://example.com now'), 'ambiguous-anomalous-heuristic');
  assert.equal(classifyQuery('abc abc abc'), 'ambiguous-anomalous-heuristic');
  assert.equal(classifyQuery(''), 'ambiguous-anomalous-heuristic');
  assert.deepEqual([...QUERY_LABELS].sort(), ['ambiguous-anomalous-heuristic', 'brand', 'nonbrand', 'site-maintenance']);
});

// ---------------------------------------------------------------------------
// Deterministic selection and aggregation (synthetic)
// ---------------------------------------------------------------------------

test('same-day whole-slice replacement removes obsolete rows; shuffled input order is identical', () => {
  const older = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_page: [
      row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5),
      row('2026-03-02', ['https://cubxxw.com/b'], 1, 20, 9),
    ],
  });
  const newer = legacySnapshot({
    window: { start: '2026-03-01', end: '2026-03-03' },
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    date_page: [row('2026-03-02', ['https://cubxxw.com/a'], 2, 30, 7)], // /b removed
  });
  const files = { 'gsc-2026-03-05.json': older, 'gsc-2026-03-06.json': newer };
  const r = reportFrom(files, { start: '2026-03-02', end: '2026-03-05' });
  const g = r.sections.domainPageRows.variants[0].groups[0];
  const day = g.days['2026-03-02'];
  assert.equal(day.state, 'legacy-unknown');
  assert.equal(day.rows, 1, 'obsolete rows removed by whole-day replacement, not merged');
  assert.equal(day.metrics.clicks, 2);
  assert.equal(day.metrics.impressions, 30);
  assert.equal(day.provenance.file, 'gsc-2026-03-06.json');

  const shuffled = reportFrom(files, { start: '2026-03-02', end: '2026-03-05', order: ['gsc-2026-03-06.json', 'gsc-2026-03-05.json'] });
  assert.equal(norm(shuffled), norm(r), 'input order must not matter');
});

test('duplicate snapshots are counted once and recorded', () => {
  const snap = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_page: [row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5)],
  });
  const r = reportFrom({ 'gsc-2026-03-05.json': snap, 'gsc-2026-03-05-010203004Z-aa11bb.json': snap }, { start: '2026-03-02', end: '2026-03-05' });
  assert.equal(r.inputs.counts.duplicateFiles, 1);
  assert.equal(r.inputs.duplicates.length, 1);
  const g = r.sections.domainPageRows.variants[0].groups[0];
  assert.equal(g.windows.current.metrics, null, 'unknown coverage is never success zero');
  assert.deepEqual(g.windows.current.gapDates, ['2026-03-04', '2026-03-05']);
  assert.equal(g.days['2026-03-02'].metrics.impressions, 10, 'duplicates never double count');
});

test('newer successful empty replaces obsolete rows only with established availability', () => {
  const oldRows = newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: [row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5)] }) } })],
  });
  const established = reportFrom(
    {
      'gsc-a.json': oldRows,
      'gsc-b.json': newSnapshot({
        fetchedAt: '2026-03-06T00:00:00.000Z',
        runDate: '2026-03-06',
        requestWindow: { start: '2026-03-02', end: '2026-03-02' },
        slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ status: 'empty', availability: 'available', rows: [] }) } })],
      }),
    },
    { start: '2026-03-02', end: '2026-03-05' },
  );
  const day = established.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'];
  assert.equal(day.state, 'empty');
  assert.equal(day.rows, 0, 'established empty replaces obsolete rows');
  assert.equal(day.metrics.impressions, 0);

  const uncertain = reportFrom(
    {
      'gsc-a.json': oldRows,
      'gsc-b.json': newSnapshot({
        fetchedAt: '2026-03-06T00:00:00.000Z',
        runDate: '2026-03-06',
        requestWindow: { start: '2026-03-02', end: '2026-03-02' },
        slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ status: 'empty', availability: 'unavailable-unknown', rows: [] }) } })],
      }),
    },
    { start: '2026-03-02', end: '2026-03-05' },
  );
  const day2 = uncertain.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'];
  assert.equal(day2.state, 'complete', 'previous row-bearing evidence retained');
  assert.equal(day2.metrics.impressions, 10);
  assert.ok(day2.provenance.uncertainRefresh, 'uncertain refresh visible');
  assert.match(day2.provenance.uncertainRefresh.note, /without proven availability\/completeness/);
});

test('later partial/failure never replaces a success but stays visible; missing day is not zero', () => {
  const ok = newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-03' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: {
        '2026-03-02': daySlice({ rows: [row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5)] }),
        '2026-03-03': daySlice({ rows: [row('2026-03-03', ['https://cubxxw.com/a'], 1, 20, 5)] }),
      },
    })],
  });
  const bad = newSnapshot({
    fetchedAt: '2026-03-07T00:00:00.000Z',
    runDate: '2026-03-07',
    runStatus: 'partial',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: {
        '2026-03-02': daySlice({ status: 'partial', rows: [row('2026-03-02', ['https://cubxxw.com/a'], 9, 9, 9)], error: { kind: 'transport', status: 500, message: 'boom' } }),
      },
    })],
  });
  const onlyBad = newSnapshot({
    fetchedAt: '2026-03-08T00:00:00.000Z',
    runDate: '2026-03-08',
    runStatus: 'failed',
    requestWindow: { start: '2026-03-04', end: '2026-03-04' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-04': daySlice({ status: 'failed', rows: [], error: { kind: 'transport', status: 503, message: 'down' } }) },
    })],
  });
  const r = reportFrom({ 'gsc-ok.json': ok, 'gsc-bad.json': bad, 'gsc-only-bad.json': onlyBad }, { start: '2026-03-02', end: '2026-03-05' });
  const g = r.sections.domainPageRows.variants[0].groups[0];

  const day2 = g.days['2026-03-02'];
  assert.equal(day2.state, 'complete', 'later partial does not replace the success');
  assert.equal(day2.metrics.impressions, 10);
  assert.ok(day2.provenance.laterFailure, 'later failure reported');
  assert.equal(day2.provenance.laterFailure.status, 'partial');

  const day4 = g.days['2026-03-04'];
  assert.equal(day4.state, 'failed', 'failure-only day is failed, never zero');
  assert.equal(day4.metrics, null);

  assert.ok(g.coverage.missingDates.includes('2026-03-05'), 'missing day is missing, not zero');
  assert.equal(g.coverage.states.missing, 1);
  assert.equal(g.windows.current.metricsComplete, false, 'gaps are never silent');
  assert.ok(g.windows.current.gapDates.includes('2026-03-05'));
});

test('day evidence from a 3-day and a 56-day request with different page sizes replaces by recency only', () => {
  const threeDay = newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-04' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-02': daySlice({ rows: [row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5)], rowLimit: 5000 }) },
    })],
  });
  const fiftySixDay = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-01-10', end: '2026-03-06' }, // 56-day outer window
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-02': daySlice({ rows: [row('2026-03-02', ['https://cubxxw.com/a'], 3, 33, 2)], rowLimit: 25000 }) },
    })],
  });
  const r = reportFrom({ 'gsc-3day.json': threeDay, 'gsc-56day.json': fiftySixDay }, { start: '2026-03-02', end: '2026-03-05' });
  const g = r.sections.domainPageRows.variants[0].groups[0];
  const day = g.days['2026-03-02'];
  assert.equal(day.metrics.impressions, 33, 'window size and rowLimit are provenance, not selection keys');
  assert.equal(day.provenance.file, 'gsc-56day.json');
  assert.equal(day.provenance.candidateCount, 2, 'both candidates visible, exactly one day counted');
  assert.equal(g.coverage.countedDays, 1);
});

test('context partition: property/filter/dimensions/type/aggregation mismatch is never blended', () => {
  const base = (extra, agg, responseAgg) => newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: extra.meta ?? {},
    slices: [sliceSpec('date_page', {
      dimensions: extra.dimensions ?? ['date', 'page'],
      filterGroups: extra.filterGroups ?? [],
      requestAggregationType: agg,
      days: { '2026-03-02': daySlice({ rows: [row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5)], responseAggregationType: responseAgg }) },
    })],
  });
  const files = {
    'gsc-1.json': base({}, 'auto', 'byPage'),
    'gsc-2.json': base({ meta: { property: 'sc-domain:example.com' } }, 'auto', 'byPage'),
    'gsc-3.json': base({ filterGroups: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https?://x/' }] }] }, 'byPage', 'byPage'),
    'gsc-4.json': base({ dimensions: ['date'] }, 'byProperty', 'byProperty'),
    'gsc-5.json': base({ meta: { searchType: 'image' } }, 'auto', 'byPage'),
  };
  const r = reportFrom(files, { start: '2026-03-02', end: '2026-03-05' });
  const section = r.sections.domainPageRows;
  assert.equal(section.variants.length, 5, 'property/filter/dimensions/type mismatches partition');
  assert.ok(r.incompatibilities.some((x) => /never blended/.test(x)));
  assert.equal(r.summary.mainHostPages.previous.status, 'not-summarized', 'no fake continuous baseline');
  for (const v of section.variants) {
    assert.equal(v.groups.length, 1);
  }
});

test('response aggregation mismatch partitions blend groups and surfaces incompatibilities', () => {
  const mk = (responseAgg, day) => newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { [day]: daySlice({ rows: [row(day, ['https://cubxxw.com/a'], 1, 10, 5)], responseAggregationType: responseAgg }) },
    })],
  });
  const r = reportFrom(
    { 'gsc-1.json': mk('byPage', '2026-03-02'), 'gsc-2.json': mk('byProperty', '2026-03-03') },
    { start: '2026-03-02', end: '2026-03-05' },
  );
  const v = r.sections.domainPageRows.variants[0];
  assert.equal(v.groups.length, 2, 'differing response aggregation semantics never blend');
  assert.ok(r.incompatibilities.some((x) => /response aggregation semantics/.test(x)));
  const aggs = v.groups.map((g) => g.responseAggregationType).sort();
  assert.deepEqual(aggs, ['byPage', 'byProperty']);
});

test('main-host table is strict hostname equality; other hosts stay separate', () => {
  const snap = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_page: [
      row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5),
      row('2026-03-02', ['https://www.cubxxw.com/a'], 0, 7, 3),
      row('2026-03-02', ['https://telepace.cubxxw.com/x'], 0, 3, 8),
    ],
  });
  const r = reportFrom({ 'gsc-fixture.json': snap }, { start: '2026-03-02', end: '2026-03-05' });
  const t = r.sections.domainPageRows.variants[0].groups[0].tables;
  assert.equal(t.mainHost.windows.previous.metrics.impressions, 10);
  assert.equal(t.otherHosts.windows.previous.metrics.impressions, 10, 'www + subdomain are other hosts (strict equality)');
  const hosts = t.otherHosts.windows.previous.hosts.map((h) => h.host).sort();
  assert.deepEqual(hosts, ['telepace.cubxxw.com', 'www.cubxxw.com']);
});

test('legacy query evidence: labels without page dimension, never inferred landing pages', () => {
  const snap = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_query: [row('2026-03-02', ['goreleaser action'], 1, 4, 9)],
    query_device: [{ keys: ['goreleaser action', 'DESKTOP'], clicks: 1, impressions: 4, ctr: 0.25, position: 9 }],
    query_country: [{ keys: ['goreleaser action', 'usa'], clicks: 1, impressions: 4, ctr: 0.25, position: 9 }],
  });
  const r = reportFrom({ 'gsc-fixture.json': snap }, { start: '2026-03-02', end: '2026-03-05' });
  const q = r.sections.legacyDateQuery.variants[0].groups[0];
  assert.equal(q.pageDimensionEvidence, 'none: this query slice has no page dimension; landing pages are never inferred');
  assert.deepEqual(q.queries.windows.previous.labels.nonbrand, { queries: 1, clicks: 1, impressions: 4 });
  const raw = JSON.stringify(r);
  assert.ok(!/"topQueries"/.test(raw), 'query strings excluded by default');
  assert.ok(!raw.includes('goreleaser action'), 'raw query strings never copied into the default report');
  assert.equal(r.sections.legacyUndated.status, 'present');
  assert.deepEqual(r.sections.legacyUndated.slices.map((s) => s.slice), ['query_country', 'query_device']);
  assert.ok(r.sections.legacyUndated.slices.every((s) => s.inputCount === 1 && s.sourceFiles.length === 1));
  assert.match(r.sections.legacyUndated.note, /never summed into a traffic total/);
  assert.ok(!('byDimension' in r.sections.legacyUndated.slices[0]), 'default output carries no per-snapshot distributions');
  assert.ok(!('metrics' in r.sections.legacyUndated.slices[0]), 'overlapping undated metrics are never summed');
});

test('deterministic report: no build clock, repeated builds byte-identical', () => {
  const snap = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_page: [row('2026-03-02', ['https://cubxxw.com/a'], 1, 10, 5)],
  });
  const files = { 'gsc-fixture.json': snap };
  const a = reportFrom(files);
  const b = reportFrom(files);
  assert.equal(norm(a), norm(b));
});

// ---------------------------------------------------------------------------
// Real-history reproduction (read-only data/seo) — separate from synthetic tests
// ---------------------------------------------------------------------------

test('real history: 28+28 windows reproduce 141/93,015 and 119/61,892 (read-only, frozen cutoff)', () => {
  // Observation cutoff freezes the historical input set: later backfills in
  // data/seo (e.g. snapshots fetched after this instant) can never change
  // these numbers. Last included original snapshot fetchedAt is
  // 2026-09-23T10:52:13.815Z.
  const asOf = '2026-09-24T00:00:00Z';
  const r = buildReport({ dir: REAL_DATA_DIR, start: '2026-07-27', end: '2026-09-20', host: 'cubxxw.com', asOf });
  assert.equal(r.inputs.counts.files, 78, 'the frozen historical input set');
  for (const f of r.inputs.files) {
    assert.ok(f.fetchedAt <= asOf, `${f.file} must be within the frozen cutoff`);
  }

  const cur = r.summary.mainHostPages.current.metrics;
  assert.equal(cur.clicks, 141);
  assert.equal(cur.impressions, 93015);
  assert.ok(Math.abs(cur.ctr - 0.0015158845347524592) < 1e-12);
  assert.ok(Math.abs(cur.position - 10.6474) < 5e-5);

  const prev = r.summary.mainHostPages.previous.metrics;
  assert.equal(prev.clicks, 119);
  assert.equal(prev.impressions, 61892);
  assert.ok(Math.abs(prev.ctr - 0.0019227040651457377) < 1e-12);
  assert.ok(Math.abs(prev.position - 14.2253) < 5e-5);

  const g = r.sections.domainPageRows.variants[0].groups[0];
  assert.equal(g.responseAggregationType, 'unrecorded-legacy');
  assert.equal(g.windows.previous.daysCounted, 28);
  assert.equal(g.windows.current.daysCounted, 28);
  // legacy rows are usable returned-row evidence but never prove completeness
  assert.equal(g.windows.previous.metricsComplete, false);
  assert.equal(g.windows.current.metricsComplete, false);
  assert.equal(g.windows.previous.unprovenDates.length, 28);
  assert.equal(g.windows.current.unprovenDates.length, 28);
  assert.equal(g.coverage.states['legacy-unknown'], 56, 'legacy days are completeness-unknown, not fabricated zeros');
  assert.equal(g.coverage.states.missing, 0);

  // query rows are incomplete: 4,943 impressions / 21 clicks vs 93,015 page
  // impressions — but legacy date_query is domain-wide without a page
  // dimension, so no main-host coverage comparison is drawn (R3).
  const qc = r.summary.queryCoverage.current;
  assert.equal(qc.comparable, false);
  assert.match(qc.reason, /domain-wide legacy date×query/);
  assert.equal(qc.querySource.metrics.impressions, 4943);
  assert.equal(qc.querySource.metrics.clicks, 21);
  assert.equal(qc.pageSource.metrics.impressions, 93015);
  assert.match(qc.querySource.basis, /never comparable with main-host page rows/);

  // deterministic over the real corpus too
  const again = buildReport({ dir: REAL_DATA_DIR, start: '2026-07-27', end: '2026-09-20', host: 'cubxxw.com', asOf });
  assert.equal(JSON.stringify(again), JSON.stringify(r));
});

// ---------------------------------------------------------------------------
// Report CLI
// ---------------------------------------------------------------------------

test('report CLI args are strict', () => {
  assert.throws(() => parseCliArgs(['--start', '2026-07-27', '--end', '2026-09-20']), /Missing required --dir/);
  assert.throws(() => parseCliArgs(['--dir', 'x']), /--start and --end are required/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-02-30', '--end', '2026-03-01']), /not a real calendar date/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-07-27x', '--end', '2026-09-20']), /Invalid --start/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-07-27', '--end', '2026-09-20', '--bogus']), /Unknown argument/);
  const ok = parseCliArgs(['--dir', 'x', '--start', '2026-07-27', '--end', '2026-09-20', '--include-query-rows']);
  assert.equal(ok.includeQueryRows, true);
});

test('writeReport: never overwrites differing content; identical regeneration is a no-op', () => {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'out-'));
  try {
    const out = join(dir, 'baseline.json');
    const report = { schema: 'gsc-report/1', value: 1 };
    assert.equal(writeReport(out, report), 'written');
    const bytes = readFileSync(out, 'utf8');
    assert.equal(writeReport(out, report), 'unchanged', 'deterministic regeneration is idempotent');
    assert.equal(readFileSync(out, 'utf8'), bytes, 'no rewrite on identical content');
    assert.throws(() => writeReport(out, { schema: 'gsc-report/1', value: 2 }), /Refusing to overwrite existing --out/);
    assert.equal(readFileSync(out, 'utf8'), bytes, 'differing content never clobbers evidence');

    // real CLI end-to-end: writes once, then idempotent second run
    const cliOut = join(dir, 'cli-baseline.json');
    const run1 = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts', 'gsc-report.mjs'), '--dir', REAL_DATA_DIR, '--start', '2026-07-27', '--end', '2026-09-20', '--out', cliOut], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(run1.status, 0, run1.stderr);
    const generated = readFileSync(cliOut, 'utf8');
    assert.equal(JSON.parse(generated).schema, 'gsc-report/1');
    const run2 = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts', 'gsc-report.mjs'), '--dir', REAL_DATA_DIR, '--start', '2026-07-27', '--end', '2026-09-20', '--out', cliOut], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(run2.status, 0, run2.stderr);
    assert.match(run2.stdout, /: unchanged/);
    assert.equal(readFileSync(cliOut, 'utf8'), generated, 'byte-identical regeneration');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Consolidated reporter review regressions (R1-R7) and the as-of observation
// cutoff (A/B interface). Fixtures assert corrected semantics — never current
// wrong output.
// ---------------------------------------------------------------------------

const legacyDayRows = (day, page, clicks, impressions, position) => [row(day, [page], clicks, impressions, position)];

test('R1: newer legacy empty window never erases rows and never claims complete zeros', () => {
  // (a) old legacy rows -> new legacy []
  const oldLegacy = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-05' },
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    date_page: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 7, 77, 5),
  });
  const newLegacy = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-05' },
    fetchedAt: '2026-03-07T00:00:00.000Z',
    runDate: '2026-03-07',
    date_page: [],
  });
  const r = reportFrom({ 'gsc-old.json': oldLegacy, 'gsc-new.json': newLegacy });
  const g = r.sections.domainPageRows.variants[0].groups[0];
  const day = g.days['2026-03-02'];
  assert.equal(day.state, 'legacy-unknown', 'rows retained');
  assert.equal(day.metrics.impressions, 77, 'unknown empty refresh never zeroes rows');
  assert.ok(day.provenance.uncertainRefresh, 'uncertain refresh visible');
  assert.equal(g.windows.previous.metrics.impressions, 77);
  assert.equal(g.windows.previous.metricsComplete, false, 'legacy evidence never claims completeness');
  assert.deepEqual(g.windows.previous.gapDates, ['2026-03-03'], 'legacy-empty days are unknown gaps');

  // (b) old versioned complete -> newer legacy missing-day (cross-schema)
  const oldVersioned = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5) }) } })],
  });
  const newerLegacyEmpty = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-05' },
    fetchedAt: '2026-03-07T00:00:00.000Z',
    runDate: '2026-03-07',
    date_page: [],
  });
  const r2 = reportFrom({ 'gsc-ver.json': oldVersioned, 'gsc-leg.json': newerLegacyEmpty });
  const groups = r2.sections.domainPageRows.variants.flatMap((v) => v.groups);
  const completeDay = groups.flatMap((gr) => Object.values(gr.days)).find((d) => d.state === 'complete');
  assert.equal(completeDay.metrics.impressions, 10, 'versioned success retained');
  assert.ok(completeDay.provenance.uncertainRefresh, 'cross-aggregation uncertain refresh visible');

  // (c) all-empty legacy must never claim 28+28-style complete zero flow
  const emptyLegacy = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-05' },
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    date_page: [],
  });
  const r3 = reportFrom({ 'gsc-empty.json': emptyLegacy });
  const g3 = r3.sections.domainPageRows.variants[0].groups[0];
  assert.equal(g3.windows.previous.metrics, null, 'unknown gaps are not zero traffic');
  assert.equal(g3.windows.current.metrics, null);
  assert.equal(g3.windows.previous.metricsComplete, false);
  assert.equal(g3.windows.current.metricsComplete, false);
  assert.deepEqual(g3.windows.previous.gapDates, ['2026-03-02', '2026-03-03']);
  assert.ok(g3.coverage.states['legacy-empty-unknown'] > 0);

  // (d) legacy rows remain a computable returned-row baseline with unknown completeness
  assert.equal(g3.coverage.expectedDays, 4);
  const r4 = reportFrom({ 'gsc-old.json': oldLegacy });
  const g4 = r4.sections.domainPageRows.variants[0].groups[0];
  assert.equal(g4.windows.previous.metrics.clicks, 7);
  assert.equal(g4.windows.previous.provenCompleteDays, 0);
  assert.deepEqual(g4.windows.previous.unprovenDates, ['2026-03-02']);
});

test('R2: failures and missing days never produce success zeros in tables or summary', () => {
  const failedOnly = newSnapshot({
    fetchedAt: '2026-03-08T00:00:00.000Z',
    runDate: '2026-03-08',
    runStatus: 'failed',
    requestWindow: { start: '2026-03-04', end: '2026-03-05' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: {
        '2026-03-04': daySlice({ status: 'failed', rows: [], error: { kind: 'transport', status: 503, message: 'down' } }),
        '2026-03-05': daySlice({ status: 'failed', rows: [], error: { kind: 'transport', status: 503, message: 'down' } }),
      },
    })],
  });

  // all failed
  const rAll = reportFrom({ 'gsc-f.json': failedOnly }, { start: '2026-03-02', end: '2026-03-05' });
  assert.equal(rAll.summary.mainHostPages.current.metrics, null, 'no success evidence -> null, not zero');
  assert.equal(rAll.summary.mainHostPages.current.coverage.daysCounted, 0);
  assert.equal(rAll.summary.otherHosts.current.metrics, null);
  assert.equal(rAll.summary.queryCoverage.current.pageSource.metrics, null);

  // only partial
  const partialOnly = newSnapshot({
    fetchedAt: '2026-03-08T00:00:00.000Z',
    runDate: '2026-03-08',
    runStatus: 'partial',
    requestWindow: { start: '2026-03-04', end: '2026-03-05' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: {
        '2026-03-04': daySlice({ status: 'partial', rows: [], error: { kind: 'transport', status: 500, message: 'x' } }),
        '2026-03-05': daySlice({ status: 'partial', rows: [], error: { kind: 'transport', status: 500, message: 'x' } }),
      },
    })],
  });
  const rPart = reportFrom({ 'gsc-p.json': partialOnly }, { start: '2026-03-02', end: '2026-03-05' });
  assert.equal(rPart.summary.mainHostPages.current.metrics, null);

  // current window without any success while previous succeeded
  const okPrev = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-03' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: {
        '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5) }),
        '2026-03-03': daySlice({ rows: legacyDayRows('2026-03-03', 'https://cubxxw.com/a', 1, 20, 5) }),
      },
    })],
  });
  const rMixed = reportFrom({ 'gsc-ok.json': okPrev, 'gsc-f.json': failedOnly }, { start: '2026-03-02', end: '2026-03-05' });
  assert.equal(rMixed.summary.mainHostPages.previous.metrics.impressions, 30);
  assert.equal(rMixed.summary.mainHostPages.previous.coverage.metricsComplete, true);
  assert.equal(rMixed.summary.mainHostPages.current.metrics, null, 'success in previous never zeros current');
  assert.equal(rMixed.summary.mainHostPages.current.coverage.daysCounted, 0);

  // confirmed successful empty supports real zeros
  const emptyOk = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-05' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: Object.fromEntries(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'].map((d) => [d, daySlice({ status: 'empty', rows: [] })])),
    })],
  });
  const rEmpty = reportFrom({ 'gsc-e.json': emptyOk }, { start: '2026-03-02', end: '2026-03-05' });
  assert.deepEqual(rEmpty.summary.mainHostPages.previous.metrics, { clicks: 0, impressions: 0, ctr: null, position: null });
  assert.equal(rEmpty.summary.mainHostPages.previous.coverage.metricsComplete, true, 'proven empties support zero');

  // mixed success + failure: observed subset with explicit partial status
  const rMixed2 = reportFrom({
    'gsc-ok.json': okPrev,
    'gsc-p.json': partialOnly,
  }, { start: '2026-03-02', end: '2026-03-05' });
  assert.equal(rMixed2.summary.mainHostPages.previous.coverage.metricsComplete, true);
  assert.equal(rMixed2.summary.mainHostPages.current.metrics, null);
  const day4 = Object.values(rMixed2.sections.domainPageRows.variants[0].groups[0].days).find((d) => d.provenance.file === 'gsc-p.json');
  assert.equal(day4.state, 'partial');
});

test('R3: cross-source comparisons require identity and host-scope compatibility', () => {
  const mainPages = newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 100, 5) }) },
    })],
  });
  const hostQuery = (property, hostExpr, page) => newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: { property },
    slices: [sliceSpec('blog_date_query_page', {
      dimensions: ['date', 'query', 'page'],
      filterGroups: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: hostExpr }] }],
      requestAggregationType: 'byPage',
      days: { '2026-03-02': daySlice({ rows: [row('2026-03-02', ['some query', page], 1, 700, 5)] }) },
    })],
  });

  // A: different property and host filter scope
  const rA = reportFrom({
    'gsc-main.json': mainPages,
    'gsc-other.json': hostQuery('sc-domain:other.example', '^https?://other\\.example/', 'https://other.example/b'),
  });
  assert.equal(rA.summary.queryCoverage.current.comparable, false);
  assert.notEqual(rA.summary.queryCoverage.current.querySource.identity.property, rA.summary.queryCoverage.current.pageSource.identity.property);
  assert.ok(rA.incompatibilities.some((x) => /queryCoverage\.current: not comparable/.test(x)));

  // B: domain-wide legacy query rows without page dimension
  const legacyQueries = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_query: [row('2026-03-02', ['some query'], 1, 900, 5)],
  });
  const rB = reportFrom({ 'gsc-main.json': mainPages, 'gsc-q.json': legacyQueries });
  assert.equal(rB.summary.queryCoverage.previous.comparable, false);
  assert.match(rB.summary.queryCoverage.previous.reason, /domain-wide legacy date×query/);
  assert.equal(rB.summary.queryCoverage.previous.querySource.metrics.impressions, 900, 'domain query metrics still reported independently');
  assert.equal(rB.summary.queryCoverage.previous.pageSource.metrics.impressions, 100);

  // C: same property, different host filter
  const rC = reportFrom({
    'gsc-main.json': mainPages,
    'gsc-q.json': hostQuery('sc-domain:cubxxw.com', '^https?://other\\.example/', 'https://other.example/b'),
  });
  assert.equal(rC.summary.queryCoverage.current.comparable, false);
  assert.match(rC.summary.queryCoverage.current.reason, /identity\/scope does not match/);

  // D: same host scope, different searchType
  const imageQuery = hostQuery('sc-domain:cubxxw.com', '^https?://cubxxw\\.com/', 'https://cubxxw.com/a');
  imageQuery.meta.searchType = 'image';
  const rD = reportFrom({ 'gsc-main.json': mainPages, 'gsc-q.json': imageQuery });
  assert.equal(rD.summary.queryCoverage.current.comparable, false);

  // E: same property + main-host query×page IS comparable when both sides have
  // full proven window coverage over identical counted date sets
  const allDays = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'];
  const pagesFull = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-05' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: Object.fromEntries(allDays.map((d) => [d, daySlice({ rows: legacyDayRows(d, 'https://cubxxw.com/a', 1, 100, 5) })])),
    })],
  });
  const queryFull = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-05' },
    slices: [sliceSpec('blog_date_query_page', {
      dimensions: ['date', 'query', 'page'],
      filterGroups: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https?://cubxxw\\.com/' }] }],
      requestAggregationType: 'byPage',
      days: Object.fromEntries(allDays.map((d) => [d, daySlice({ rows: [row(d, ['some query', 'https://cubxxw.com/a'], 1, 700, 5)] })])),
    })],
  });
  const rE = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': queryFull });
  assert.equal(rE.summary.queryCoverage.previous.comparable, true);
  assert.equal(rE.summary.queryCoverage.current.comparable, true);
  assert.equal(rE.summary.queryCoverage.previous.querySource.metrics.impressions, 1400);
  assert.equal(rE.summary.queryCoverage.previous.pageSource.metrics.impressions, 200);
  assert.match(rE.summary.queryCoverage.previous.note, /NOT a measured coverage loss/);
});

test('R4: availability is scoped to the report property and keeps probe identity', () => {
  const mainSnap = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      availability: { status: 'observed', probeWindow: { start: '2026-02-24', end: '2026-03-05' }, observedDates: [], availableThrough: '2026-03-05', rejectedRowCount: 0, warnings: [], error: null },
    },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5) }) },
    })],
  });
  const otherProbe = newSnapshot({
    fetchedAt: '2026-03-09T00:00:00.000Z', // newer
    runDate: '2026-03-09',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      property: 'sc-domain:other.example',
      availability: { status: 'observed', probeWindow: { start: '2026-02-24', end: '2026-03-08' }, observedDates: [], availableThrough: '2026-03-08', rejectedRowCount: 0, warnings: [], error: null },
    },
    slices: [],
  });
  const r = reportFrom({ 'gsc-main.json': mainSnap, 'gsc-other-property.json': otherProbe });
  assert.equal(r.availability.property, 'sc-domain:cubxxw.com');
  assert.equal(r.availability.availableThrough, '2026-03-05', "another property's newer probe never redefines the report availability");
  assert.equal(r.availability.sourceFile, 'gsc-main.json');
  assert.ok(r.availabilityByContext['sc-domain:other.example|web|final'], 'other-property probe kept with its own identity');

  // same property: a newer FAILED probe coexists visibly with the previous observation
  const failedProbe = newSnapshot({
    fetchedAt: '2026-03-10T00:00:00.000Z',
    runDate: '2026-03-10',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      availability: { status: 'unknown', probeWindow: null, observedDates: [], availableThrough: null, rejectedRowCount: 0, warnings: [], error: { kind: 'transport', status: 503, message: 'down' } },
    },
    slices: [],
  });
  const r2 = reportFrom({ 'gsc-main.json': mainSnap, 'gsc-failed-probe.json': failedProbe });
  assert.equal(r2.availability.status, 'unknown', 'latest probe state wins for freshness');
  assert.equal(r2.availability.stale, true);
  assert.equal(r2.availability.latest.status, 'unknown');
  assert.equal(r2.availability.lastObserved.availableThrough, '2026-03-05', 'previous observation retained alongside');
  assert.equal(r2.availability.availableThrough, '2026-03-05');

  // same fetchedAt: deterministic and explainable tie-break (filename order)
  const tieProbe = JSON.parse(JSON.stringify(mainSnap));
  tieProbe.meta.availability.availableThrough = '2026-03-07';
  const r3 = reportFrom({ 'gsc-a.json': mainSnap, 'gsc-b.json': tieProbe });
  assert.equal(r3.availability.sourceFile, 'gsc-b.json', 'ties resolve by filename and the rule is documented');
  assert.match(r3.availability.note, /ties resolve by filename/);
});

test('R5: opt-in query×page pairs keep real URLs; default baseline leaks no raw queries', () => {
  const snap = newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('blog_date_query_page', {
      dimensions: ['date', 'query', 'page'],
      filterGroups: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https?://cubxxw\\.com/' }] }],
      requestAggregationType: 'byPage',
      days: {
        '2026-03-02': daySlice({
          rows: [
            row('2026-03-02', ['target query', 'https://cubxxw.com/REAL-LANDING-PAGE'], 1, 10, 5),
            row('2026-03-02', ['target query', 'https://cubxxw.com/SECOND-LANDING-PAGE'], 0, 5, 9),
            row('2026-03-02', ['other query', 'https://cubxxw.com/REAL-LANDING-PAGE'], 0, 3, 4),
          ],
        }),
      },
    })],
  });
  const r = reportFrom({ 'gsc-qp.json': snap }, { includeQueryRows: true });
  const q = r.sections.blogQueryPage.variants[0].groups[0];
  const pairsOut = q.queries.windows.previous.queryPagePairs;
  assert.equal(pairsOut.totalPairs, 3);
  assert.equal(pairsOut.truncated, false);
  const pairs = pairsOut.pairs;
  const pagesForTarget = pairs.filter((p) => p.query === 'target query').map((p) => p.page).sort();
  assert.deepEqual(pagesForTarget, ['https://cubxxw.com/REAL-LANDING-PAGE', 'https://cubxxw.com/SECOND-LANDING-PAGE'], 'both real landing pages traceable');
  const queriesForPage = pairs.filter((p) => p.page === 'https://cubxxw.com/REAL-LANDING-PAGE').map((p) => p.query).sort();
  assert.deepEqual(queriesForPage, ['other query', 'target query'], 'same page with multiple queries traceable');
  assert.ok(pairs.every((p) => typeof p.page === 'string' && typeof p.query === 'string' && p.label));

  // limit marks truncation explicitly
  const rLimit = reportFrom({ 'gsc-qp.json': snap }, { includeQueryRows: true, pairsLimit: 1 });
  const limited = rLimit.sections.blogQueryPage.variants[0].groups[0].queries.windows.previous.queryPagePairs;
  assert.equal(limited.truncated, true);
  assert.equal(limited.totalPairs, 3);
  assert.equal(limited.pairs.length, 1, 'missing pairs are a limit fact, never an inferred absence');

  // default baseline: no raw query strings, no pairs
  const rDefault = reportFrom({ 'gsc-qp.json': snap });
  const raw = JSON.stringify(rDefault);
  assert.ok(!raw.includes('target query'));
  assert.ok(!raw.includes('REAL-LANDING-PAGE'));
  assert.ok(!/"queryPagePairs"/.test(raw));

  // legacy date_query keeps explicit "no page evidence"
  const legacyQ = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_query: [row('2026-03-02', ['target query'], 1, 4, 9)],
  });
  const rLegacy = reportFrom({ 'gsc-q.json': legacyQ }, { includeQueryRows: true });
  const ql = rLegacy.sections.legacyDateQuery.variants[0].groups[0];
  assert.equal(ql.queries.windows.previous.queryPagePairs, null);
  assert.match(ql.pageDimensionEvidence, /no page dimension/);
});

test('R6: distinct contents never merge (hash collision guard); identical bytes dedupe', () => {
  const a = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_page: legacyDayRows('2026-03-02', 'https://cubxxw.com/Aa', 1, 10, 5),
  });
  const rawA = `${JSON.stringify(a, null, 2)}\n`;
  const rawB = rawA.replace('/Aa', '/B@'); // classic DJB2-33 collision pair
  assert.notEqual(rawA, rawB);

  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'hash-'));
  try {
    writeFileSync(join(dir, 'gsc-a.json'), rawA);
    writeFileSync(join(dir, 'gsc-z.json'), rawB);
    const loaded = loadEvidence({ dir });
    assert.equal(loaded.files.length, 2, 'distinct contents are both accepted');
    assert.equal(loaded.duplicates.length, 0);
    const report = buildReport({ dir, start: '2026-03-02', end: '2026-03-05' });
    const g = report.sections.domainPageRows.variants[0].groups[0];
    assert.equal(g.days['2026-03-02'].metrics.impressions, 10, 'the retained slice is a full real row, never a merge');
    assert.equal(g.days['2026-03-02'].provenance.candidateCount, 2, 'both distinct files participated in selection');
    assert.equal(g.days['2026-03-02'].provenance.tieBreak, true, 'equal fetchedAt resolves deterministically and visibly');

    // identical bytes under two names still count once
    writeFileSync(join(dir, 'gsc-a-copy.json'), rawA);
    const loaded2 = loadEvidence({ dir });
    assert.equal(loaded2.files.length, 2);
    assert.deepEqual(loaded2.duplicates, [{ file: 'gsc-a.json', duplicateOf: 'gsc-a-copy.json' }]); // sorted names; first file wins
    const report2 = buildReport({ dir, start: '2026-03-02', end: '2026-03-05' });
    assert.equal(report2.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'].provenance.candidateCount, 2, 'byte-identical duplicate never adds a candidate');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('R7: same-day response aggregation semantics stay visible; failures attach without erasing', () => {
  const mk = (fetchedAt, responseAggregationType, rows) => newSnapshot({
    fetchedAt,
    runDate: fetchedAt.slice(0, 10),
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      requestAggregationType: 'auto',
      days: { '2026-03-02': daySlice({ rows, responseAggregationType }) },
    })],
  });
  // same day, different response semantics: nothing is silently overwritten
  const r = reportFrom({
    'gsc-1.json': mk('2026-03-05T00:00:00.000Z', 'byPage', legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5)),
    'gsc-2.json': mk('2026-03-06T00:00:00.000Z', 'byProperty', legacyDayRows('2026-03-02', 'https://cubxxw.com/b', 1, 20, 5)),
  });
  const groups = r.sections.domainPageRows.variants[0].groups;
  assert.equal(groups.length, 2, 'both aggregation identities visible');
  const byAgg = Object.fromEntries(groups.map((g) => [g.responseAggregationType, g]));
  assert.equal(byAgg.byPage.days['2026-03-02'].metrics.impressions, 10, 'older semantics preserved, not overwritten');
  assert.equal(byAgg.byProperty.days['2026-03-02'].metrics.impressions, 20);
  assert.ok(r.incompatibilities.some((x) => /response aggregation semantics/.test(x)));

  // same semantics: whole-day replacement still applies
  const r2 = reportFrom({
    'gsc-1.json': mk('2026-03-05T00:00:00.000Z', 'byPage', legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5)),
    'gsc-2.json': mk('2026-03-06T00:00:00.000Z', 'byPage', legacyDayRows('2026-03-02', 'https://cubxxw.com/b', 1, 20, 5)),
  });
  assert.equal(r2.sections.domainPageRows.variants[0].groups.length, 1);
  assert.equal(r2.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'].metrics.impressions, 20);

  // a later failure with no response aggregation attaches to the success diagnostics
  const failing = newSnapshot({
    fetchedAt: '2026-03-07T00:00:00.000Z',
    runDate: '2026-03-07',
    runStatus: 'failed',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-02': daySlice({ status: 'failed', rows: [], responseAggregationType: null, error: { kind: 'transport', status: 503, message: 'down' } }) },
    })],
  });
  const r3 = reportFrom({ 'gsc-1.json': mk('2026-03-05T00:00:00.000Z', 'byPage', legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5)), 'gsc-2.json': failing });
  const day3 = r3.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'];
  assert.equal(day3.state, 'complete', 'failure never erases the success');
  assert.ok(day3.provenance.laterFailure, 'failure visible on the success diagnostics');
  assert.equal(day3.provenance.laterFailure.status, 'failed');

  // legacy unrecorded vs new-schema semantics never mix silently
  const legacyRowsSnap = legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-04' },
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    date_page: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5),
  });
  const r4 = reportFrom({
    'gsc-leg.json': legacyRowsSnap,
    'gsc-new.json': mk('2026-03-06T00:00:00.000Z', 'byPage', legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 20, 5)),
  });
  const groups4 = r4.sections.domainPageRows.variants[0].groups;
  assert.equal(groups4.length, 2, 'unrecorded-legacy and byPage stay in separate groups');
  assert.ok(r4.incompatibilities.some((x) => /response aggregation semantics/.test(x)));
  const states = groups4.map((g) => g.days['2026-03-02'].state).sort();
  assert.deepEqual(states, ['complete', 'legacy-unknown']);
});

test('as-of: observation cutoff excludes later and unprovable observations consistently', () => {
  const dayRows = legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5);
  const legacyAt = (fetchedAt, impressions) => legacySnapshot({
    window: { start: '2026-03-02', end: '2026-03-05' },
    fetchedAt,
    runDate: fetchedAt.slice(0, 10),
    date_page: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, impressions, 5),
  });
  const t1 = '2026-03-05T00:00:00.000Z';
  const t2 = '2026-03-06T00:00:00.000Z';
  const t3 = '2026-03-07T00:00:00.000Z';
  const files = {
    'gsc-1.json': legacyAt(t1, 10),
    'gsc-2.json': legacyAt(t2, 20),
    'gsc-3.json': legacyAt(t3, 30),
  };

  // cutoff before t1: nothing eligible
  const rNone = reportFrom(files, { asOf: '2026-03-04T23:59:59Z' });
  assert.equal(rNone.inputs.counts.files, 0);
  assert.equal(rNone.inputs.counts.excludedByAsOf, 3);
  assert.ok(rNone.inputs.excludedByAsOf.every((e) => e.reason === AS_OF_AFTER_CUTOFF_REASON));

  // equal cutoff is inclusive (t2 eligible, t3 excluded)
  const rEq = reportFrom(files, { asOf: t2 });
  assert.equal(rEq.inputs.counts.files, 2);
  assert.deepEqual(rEq.inputs.excludedByAsOf.map((e) => e.file), ['gsc-3.json']);
  assert.equal(rEq.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'].metrics.impressions, 20, 'selection uses only observations at/before the cutoff');

  // after cutoff all three eligible (before/equal/after behavior)
  const rAfter = reportFrom(files, { asOf: '2026-03-08T00:00:00Z' });
  assert.equal(rAfter.inputs.counts.files, 3);
  assert.equal(rAfter.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'].metrics.impressions, 30);

  // missing/invalid fetchedAt cannot prove eligibility when a cutoff is supplied
  const badA = legacySnapshot({ window: { start: '2026-03-02', end: '2026-03-05' }, runDate: '2026-03-05', date_page: dayRows });
  const badB = legacySnapshot({ window: { start: '2026-03-02', end: '2026-03-05' }, fetchedAt: '2026-03-05', runDate: '2026-03-05', date_page: dayRows });
  const rBad = reportFrom({ 'gsc-no-ts.json': badA, 'gsc-bad-ts.json': badB }, { asOf: '2026-03-10T00:00:00Z' });
  assert.equal(rBad.inputs.counts.files, 0);
  assert.equal(rBad.inputs.counts.excludedByAsOf, 2);
  assert.ok(rBad.inputs.excludedByAsOf.every((e) => e.reason === AS_OF_UNPROVABLE_REASON));
  // without a cutoff the current all-input behavior is retained
  const rNoCutoff = reportFrom({ 'gsc-no-ts.json': badA, 'gsc-bad-ts.json': badB });
  assert.equal(rNoCutoff.inputs.counts.files, 2);
  assert.equal(rNoCutoff.params.asOf, null);

  // probes: future (after cutoff) and unprovable probes are excluded consistently
  const probeSnap = (fetchedAt, availableThrough) => newSnapshot({
    fetchedAt,
    runDate: '2026-03-09',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      availability: { status: 'observed', probeWindow: { start: '2026-02-24', end: '2026-03-08' }, observedDates: [], availableThrough, rejectedRowCount: 0, warnings: [], error: null },
    },
    slices: [],
  });
  const mainSnap = newSnapshot({
    fetchedAt: '2026-03-05T00:00:00.000Z',
    runDate: '2026-03-05',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      availability: { status: 'observed', probeWindow: { start: '2026-02-24', end: '2026-03-04' }, observedDates: [], availableThrough: '2026-03-04', rejectedRowCount: 0, warnings: [], error: null },
    },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: dayRows }) } })],
  });
  const rProbe = reportFrom(
    {
      'gsc-main.json': mainSnap,
      'gsc-future-probe.json': probeSnap('2026-03-09T00:00:00.000Z', '2026-03-08'),
      'gsc-other-property.json': (() => { const s = probeSnap('2026-03-06T00:00:00.000Z', '2026-03-07'); s.meta.property = 'sc-domain:other.example'; return s; })(),
    },
    { asOf: '2026-03-05T12:00:00Z' },
  );
  assert.equal(rProbe.availability.availableThrough, '2026-03-04', 'future and other-property probes never redefine the report availability');
  assert.equal(rProbe.availability.sourceFile, 'gsc-main.json');
  assert.ok(!JSON.stringify(rProbe.availability).includes('2026-03-08'));
});

test('as-of: CLI validates strict UTC timestamps only', () => {
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-03-05']), /Invalid --as-of/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-03-05T25:00:00Z']), /Invalid --as-of/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-02-30T00:00:00Z']), /Invalid --as-of/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-03-05T00:00:00+00:00']), /Invalid --as-of/);
  assert.throws(() => parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-03-05T00:00:00']), /Invalid --as-of/);
  const ok = parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-03-05T00:00:00Z']);
  assert.equal(ok.asOf, '2026-03-05T00:00:00Z');
  const okFrac = parseCliArgs(['--dir', 'x', '--start', '2026-03-02', '--end', '2026-03-05', '--as-of', '2026-03-05T00:00:00.123Z']);
  assert.equal(okFrac.asOf, '2026-03-05T00:00:00.123Z');
});

// ---------------------------------------------------------------------------
// Follow-up boundary corrections (F1-F3)
// ---------------------------------------------------------------------------

test('F1: core as-of is fail-closed; preloaded evidence cannot bypass the cutoff', () => {
  const dayRows1 = legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5);
  const before = newSnapshot({
    fetchedAt: '2026-09-21T00:00:00.000Z',
    runDate: '2026-09-21',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: dayRows1 }) } })],
  });
  const after = newSnapshot({
    fetchedAt: '2026-09-22T00:00:00.000Z',
    runDate: '2026-09-22',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 9, 990, 5) }) } })],
  });
  const afterFail = newSnapshot({
    fetchedAt: '2026-09-22T12:00:00.000Z',
    runDate: '2026-09-22',
    runStatus: 'failed',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: { '2026-03-02': daySlice({ status: 'failed', rows: [], responseAggregationType: null, error: { kind: 'transport', status: 503, message: 'down' } }) },
    })],
  });

  // invalid asOf never degrades into "no cutoff" at any exported entry point
  assert.throws(() => reportFrom({ 'gsc-b.json': before, 'gsc-a.json': after }, { asOf: 'garbage' }), /Invalid asOf/);
  assert.throws(() => reportFrom({ 'gsc-b.json': before }, { asOf: '2026-09-21' }), /Invalid asOf/);

  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'f1-'));
  try {
    writeFileSync(join(dir, 'gsc-b.json'), `${JSON.stringify(before, null, 2)}\n`);
    assert.throws(() => loadEvidence({ dir, asOf: 'garbage' }), /Invalid asOf/);
    assert.throws(() => loadAvailability({ dir, asOf: 'garbage' }), /Invalid asOf/);

    // preloaded evidence cannot bypass cutoff/eligibility proofs
    assert.throws(
      () => buildReport({
        dir,
        start: '2026-03-02',
        end: '2026-03-05',
        asOf: '2026-09-21T00:00:00.000Z',
        evidence: { files: [], entries: [], problems: [], duplicates: [], excluded: [] },
      }),
      /Preloaded evidence is not supported/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // equal cutoff is kept; later failure cannot leak past the cutoff into laterFailure
  const r = reportFrom(
    { 'gsc-before.json': before, 'gsc-after.json': after, 'gsc-after-fail.json': afterFail },
    { asOf: '2026-09-21T00:00:00.000Z' },
  );
  assert.equal(r.inputs.counts.files, 1);
  assert.deepEqual(r.inputs.excludedByAsOf.map((e) => e.file).sort(), ['gsc-after-fail.json', 'gsc-after.json']);
  assert.ok(r.inputs.excludedByAsOf.every((e) => e.reason === AS_OF_AFTER_CUTOFF_REASON));
  const day = r.sections.domainPageRows.variants[0].groups[0].days['2026-03-02'];
  assert.equal(day.metrics.impressions, 10, 'equal-cutoff evidence kept, later evidence excluded');
  assert.equal(day.provenance.laterFailure, null, 'a failure beyond the cutoff can never attach');

  // pure buildReport boundary validates ranges without any clock
  assert.throws(() => buildReport({ dir: 'x', start: '2026-02-30', end: '2026-03-05' }), /not a real calendar date/);
  assert.throws(() => buildReport({ dir: 'x', start: '2026-03-06', end: '2026-03-05' }), /Inverted range/);
  assert.throws(() => buildReport({ dir: 'x', start: '2026-03-0x', end: '2026-03-05' }), /Invalid --start/);
});

test('F2: availability selects the exact property+searchType+dataState identity', () => {
  const mainPages = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      availability: { status: 'observed', probeWindow: { start: '2026-02-24', end: '2026-03-05' }, observedDates: [], availableThrough: '2026-03-05', rejectedRowCount: 0, warnings: [], error: null },
    },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5) }) } })],
  });
  const probeWith = (meta, fetchedAt) => newSnapshot({
    fetchedAt,
    runDate: fetchedAt.slice(0, 10),
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: {
      ...meta,
      availability: { status: 'observed', probeWindow: { start: '2026-02-24', end: '2026-03-05' }, observedDates: [], availableThrough: meta.availableThrough, rejectedRowCount: 0, warnings: [], error: null },
    },
    slices: meta.slices ?? [],
  });
  const imageProbe = probeWith({ searchType: 'image', availableThrough: '2026-03-04' }, '2026-03-07T00:00:00.000Z');
  const allStateProbe = probeWith({ dataState: 'all', availableThrough: '2026-03-08' }, '2026-03-08T00:00:00.000Z');

  // image/all groups never pollute the web/final report context — even when
  // their filenames sort first and their fetchedAt is newer
  const r = reportFrom({
    'gsc-a-image.json': imageProbe,
    'gsc-b-all.json': allStateProbe,
    'gsc-z-web.json': mainPages,
  });
  assert.equal(r.availability.availableThrough, '2026-03-05');
  assert.equal(r.availability.sourceFile, 'gsc-z-web.json');
  assert.deepEqual(r.availability.identity, { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final' });

  // filename swap does not change the selection
  const rSwap = reportFrom({
    'gsc-a-web.json': mainPages,
    'gsc-z-image.json': imageProbe,
    'gsc-y-all.json': allStateProbe,
  });
  assert.equal(rSwap.availability.availableThrough, '2026-03-05');
  assert.equal(rSwap.availability.sourceFile, 'gsc-a-web.json');
  assert.ok(r.availabilityByContext['sc-domain:cubxxw.com|image|final']);
  assert.ok(r.availabilityByContext['sc-domain:cubxxw.com|web|all']);

  // ambiguous report context: unknown summary, groups retained, no first pick
  const imageWithPages = probeWith(
    {
      searchType: 'image',
      availableThrough: '2026-03-04',
      slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 5, 5) }) } })],
    },
    '2026-03-07T00:00:00.000Z',
  );
  const rAmb = reportFrom({ 'gsc-web.json': mainPages, 'gsc-image.json': imageWithPages });
  assert.equal(rAmb.availability.status, 'unknown');
  assert.match(rAmb.availability.note, /ambiguous or not selected/);
  assert.equal(Object.keys(rAmb.availabilityByContext).length, 2, 'both semantic groups retained');

  // the exact selected group has no probe: explicit unknown, no substitution
  const noProbe = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    meta: { availability: null },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-02': daySlice({ rows: legacyDayRows('2026-03-02', 'https://cubxxw.com/a', 1, 10, 5) }) } })],
  });
  const rNone = reportFrom({ 'gsc-noprobe.json': noProbe, 'gsc-image.json': imageProbe });
  assert.equal(rNone.availability.status, 'unknown');
  assert.match(rNone.availability.note, /no availability probe for the exact report context/);
});

test('F3: comparison eligibility is conservative (exact filters, identity, window proof)', () => {
  const allDays = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'];
  const pagesFull = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-05' },
    slices: [sliceSpec('date_page', {
      dimensions: ['date', 'page'],
      days: Object.fromEntries(allDays.map((d) => [d, daySlice({ rows: legacyDayRows(d, 'https://cubxxw.com/a', 1, 100, 5) })])),
    })],
  });
  const queryFull = (filterGroups, days) => newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-05' },
    slices: [sliceSpec('blog_date_query_page', {
      dimensions: ['date', 'query', 'page'],
      filterGroups,
      requestAggregationType: 'byPage',
      days,
    })],
  });
  const knownHostFilter = [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https?://cubxxw\\.com/' }] }];
  const rowsFor = (specs) => Object.fromEntries(specs.map(([d, status, rows]) => [d, daySlice({ status, rows })]));
  const fullRows = rowsFor(allDays.map((d) => [d, 'complete', [row(d, ['some query', 'https://cubxxw.com/a'], 1, 10, 5)]]));

  // trigger 1: same host filter PLUS a country filter is not the same scope
  const withCountry = queryFull(
    [...knownHostFilter, { groupType: 'and', filters: [{ dimension: 'country', operator: 'equals', expression: 'usa' }] }],
    fullRows,
  );
  const r1 = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': withCountry });
  assert.equal(r1.summary.queryCoverage.current.comparable, false);
  assert.match(r1.summary.queryCoverage.current.reason, /identity\/scope does not match/);
  assert.ok(r1.summary.queryCoverage.current.querySource, 'independent metrics stay visible');

  // trigger 2: unescaped-dot expression is never treated as the known builder output
  const unescaped = queryFull(
    [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https?://cubxxw.com/' }] }],
    fullRows,
  );
  const r2 = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': unescaped });
  assert.equal(r2.summary.queryCoverage.current.comparable, false);
  assert.equal(r2.summary.queryCoverage.previous.comparable, false);

  // trigger 3: null query metrics in the current window can never be comparable
  const queryPrevOnly = queryFull(knownHostFilter, rowsFor([
    ['2026-03-02', 'complete', [row('2026-03-02', ['some query', 'https://cubxxw.com/a'], 1, 10, 5)]],
    ['2026-03-03', 'complete', [row('2026-03-03', ['some query', 'https://cubxxw.com/a'], 1, 10, 5)]],
    ['2026-03-04', 'empty', []],
    ['2026-03-05', 'empty', []],
  ]));
  const r3 = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': queryPrevOnly });
  assert.equal(r3.summary.queryCoverage.previous.comparable, true);
  assert.equal(r3.summary.queryCoverage.current.comparable, true, 'proven successful empties are successful coverage dates');
  // now with the current window lacking query evidence entirely
  const queryPrevOnly2 = queryFull(knownHostFilter, rowsFor([
    ['2026-03-02', 'complete', [row('2026-03-02', ['some query', 'https://cubxxw.com/a'], 1, 10, 5)]],
    ['2026-03-03', 'complete', [row('2026-03-03', ['some query', 'https://cubxxw.com/a'], 1, 10, 5)]],
  ]));
  const r3b = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': queryPrevOnly2 });
  assert.equal(r3b.summary.queryCoverage.current.comparable, false);
  assert.match(r3b.summary.queryCoverage.current.reason, /no counted evidence on one side/);

  // trigger 4: partial 1-of-N success days on both sides are not one observation basis
  const pagesPartial = newSnapshot({
    fetchedAt: '2026-03-06T00:00:00.000Z',
    runDate: '2026-03-06',
    requestWindow: { start: '2026-03-02', end: '2026-03-02' },
    slices: [sliceSpec('date_page', { dimensions: ['date', 'page'], days: { '2026-03-04': daySlice({ rows: legacyDayRows('2026-03-04', 'https://cubxxw.com/a', 1, 100, 5) }) } })],
  });
  const queryOtherDay = queryFull(knownHostFilter, rowsFor([
    ['2026-03-05', 'complete', [row('2026-03-05', ['some query', 'https://cubxxw.com/a'], 1, 10, 5)]],
  ]));
  const r4 = reportFrom({ 'gsc-main.json': pagesPartial, 'gsc-q.json': queryOtherDay });
  assert.equal(r4.summary.queryCoverage.current.comparable, false);
  assert.match(r4.summary.queryCoverage.current.reason, /(not proven|date sets differ)/);

  // multiple same-host non-page-filter variants: never pick the first one
  const withDevice = queryFull(
    [...knownHostFilter, { groupType: 'and', filters: [{ dimension: 'device', operator: 'equals', expression: 'mobile' }] }],
    fullRows,
  );
  const r6 = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': withCountry, 'gsc-q2.json': withDevice });
  assert.equal(r6.summary.queryCoverage.current.comparable, false);
  assert.match(r6.summary.queryCoverage.current.reason, /multiple query request contexts/);
  assert.equal(r6.summary.queryCoverage.current.querySource, null, 'no first-candidate selection');
  assert.equal(r6.summary.queryCoverage.current.queryContexts.length, 2);

  // positive control: exact known-builder host filter, same identity, proven
  // complete windows over identical date sets
  const r5 = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': queryFull(knownHostFilter, fullRows) });
  assert.equal(r5.summary.queryCoverage.current.comparable, true);
  assert.equal(r5.summary.queryCoverage.previous.comparable, true);

  // proven empty query window vs successful page dates is comparable coverage;
  // a null query window (r3b above) never is
  const emptyQuery = queryFull(knownHostFilter, rowsFor(allDays.map((d) => [d, 'empty', []])));
  const r7 = reportFrom({ 'gsc-main.json': pagesFull, 'gsc-q.json': emptyQuery });
  assert.equal(r7.summary.queryCoverage.current.comparable, true);
  assert.deepEqual(r7.summary.queryCoverage.current.querySource.metrics, { clicks: 0, impressions: 0, ctr: null, position: null });
});
