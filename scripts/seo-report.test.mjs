import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  FRESHNESS_THRESHOLDS,
  SEO_REPORT_SCHEMA,
  buildCruxSection,
  buildMarkdown,
  buildObservations,
  buildPsiSection,
  buildQueryEvidence,
  buildSeoReport,
  buildTrend,
  classifyCruxFreshness,
  classifyGscFreshness,
  classifyPsiFreshness,
} from './lib/seo-report-core.mjs';
import { main, parseCliArgs, writeMarkdown } from './seo-report.mjs';

const SCRIPT = fileURLToPath(new URL('./seo-report.mjs', import.meta.url));
const REAL_DATA_DIR = fileURLToPath(new URL('../data/seo/', import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures (contract shapes; no clock, no network)
// ---------------------------------------------------------------------------

function makeSettings(cpu = 4) {
  return {
    formFactor: 'mobile',
    throttlingMethod: 'simulate',
    throttling: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 150, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: cpu },
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    locale: 'en-US',
    emulatedUserAgent: 'Mozilla/5.0 (Linux; Android 11) Chrome/120 Mobile Safari/537.36',
  };
}

function psiEntry({ url = 'https://cubxxw.com/', strategy = 'mobile', fetchTime = '2026-09-24T10:00:00.000Z', lcp = 2000, cls = 0.05, metaScore = 1, finalStatus = 'success', version = '12.8.0', settings = makeSettings(), finalUrl = url, usable = true } = {}) {
  return {
    url,
    strategy,
    finalStatus,
    usable,
    provenance: { fetchTime, lighthouseVersion: version, configSettings: settings, requestedUrl: url, finalUrl },
    metrics: {
      LCP: { unit: 'ms', numericValue: lcp, precision: 'raw' },
      CLS: { unit: 'unitless', numericValue: cls, precision: 'raw' },
    },
    seoAudits: { 'meta-description': { score: metaScore } },
  };
}

function psiSample(entry, { file = 'psi-2026-09-24.json', observedAt = '2026-09-24T10:05:00.000Z', slotStatus = 'measured', label = undefined } = {}) {
  const s = { entry, observation: { file, observedAt, runDate: observedAt.slice(0, 10), legacy: false }, slotStatus };
  if (label !== undefined) s.label = label;
  return s;
}

function makePsiSelection(samples) {
  // samples: [{url, strategy, samples: [psiSample...], current, currentOutcome, lastGood}]
  return {
    observations: samples.map((t, i) => ({
      file: t.samples[0]?.observation.file ?? `psi-${i}.json`,
      observedAt: t.samples[0]?.observation.observedAt ?? null,
      runStatus: 'ok',
      counts: { planned: 1, succeeded: 1, partial: 0, failed: 0, missing: 0, usable: 1, byStrategy: { [t.strategy]: { planned: 1, succeeded: 1, partial: 0, failed: 0, missing: 0, usable: 1 } } },
    })),
    excluded: [],
    problems: [],
    byTarget: samples.map((t) => {
      const current = t.current ?? t.samples.at(-1);
      const lastGood = t.samples.filter((s) => s.entry.usable).at(-1) ?? null;
      return {
        url: t.url,
        strategy: t.strategy,
        current,
        currentOutcome: current.entry.finalStatus,
        lastGood: lastGood === current ? { ...lastGood, label: 'current' } : (lastGood ? { ...lastGood, label: 'labelled-last-good (older than current; never substitutes for the current outcome)' } : null),
        sampleCount: t.samples.length,
        samples: t.samples,
      };
    }),
  };
}

function gscWindow({ metrics = { clicks: 10, impressions: 1000, ctr: 0.01, position: 10 }, complete = true, daysCounted = 28, countedDates = ['2026-09-20'] } = {}) {
  return {
    metrics,
    pageCount: 5,
    coverage: { daysCounted, countedDates, provenCompleteDays: complete ? 28 : 0, expectedDays: 28, metricsComplete: complete, partial: !complete },
    basis: 'sum of returned page-dimension rows for the main host (strict hostname equality); not property chart totals',
  };
}

function makeGscReport({ complete = true, queryPairs = null, ctr = 0.01, runDateFiles = ['gsc-2026-09-24.json'], fetchedAt = '2026-09-24T11:50:56.798Z', countedDates = ['2026-09-20'], windows = { previous: { start: '2026-07-27', end: '2026-08-23', days: 28 }, current: { start: '2026-08-24', end: '2026-09-20', days: 28 } } } = {}) {
  const group = queryPairs === null ? null : {
    responseAggregationType: 'byPage',
    queries: {
      windows: {
        current: {
          metrics: null,
          queryRowCount: queryPairs.length,
          queryPagePairs: queryPairs === 'absent' ? null : {
            totalPairs: queryPairs.length,
            limit: 500,
            truncated: queryPairs.length > 2,
            basis: 'real query×page rows as returned by the page dimension; missing pairs are a limit or coverage fact, never an inferred absence',
            pairs: queryPairs.slice(0, 2).map(([query, page, impressions]) => ({ query, page, label: 'nonbrand', clicks: 1, impressions, ctr: 1 / impressions, position: 8 })),
          },
        },
      },
    },
  };
  return {
    schema: 'gsc-report/1',
    params: {
      dir: 'data/seo', start: '2026-07-27', end: '2026-09-20', host: 'cubxxw.com', includeQueryRows: queryPairs !== null, asOf: null, windows,
    },
    inputs: {
      files: runDateFiles.map((file) => ({ file, schema: 'legacy-v1', fetchedAt, runDate: file.slice(4, 14), runStatus: 'legacy' })),
      counts: { files: runDateFiles.length, legacyFiles: runDateFiles.length, snapshotFiles: 0, duplicateFiles: 0, excludedByAsOf: 0, problems: 0 },
      duplicates: [], excludedByAsOf: [], problems: [],
    },
    availability: { status: 'unknown' },
    summary: {
      identity: { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final', host: 'cubxxw.com' },
      mainHostPages: {
        previous: gscWindow({ metrics: { clicks: 5, impressions: 500, ctr: 0.01, position: 12 }, complete, countedDates }),
        current: gscWindow({ metrics: { clicks: 10, impressions: 1000, ctr, position: 10 }, complete, countedDates }),
        host: 'cubxxw.com',
      },
      queryCoverage: {
        current: { comparable: false, reason: 'window evidence missing on one side', note: '' },
        previous: { comparable: false, reason: 'window evidence missing on one side', note: '' },
      },
    },
    sections: {
      domainPageRows: {
        basis: 'domain-wide date×page rows',
        status: 'present',
        variants: [{
          context: { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final', dimensions: ['date', 'page'], filters: [], requestAggregationType: 'auto', slice: 'date_page' },
          groups: [{
            responseAggregationType: 'auto',
            days: Object.fromEntries(countedDates.map((d) => [d, { state: 'legacy-unknown', provenance: { file: runDateFiles[0] ?? 'gsc.json', fetchedAt } }])),
          }],
        }],
      },
      blogQueryPage: {
        basis: 'hostname-filtered query×page rows',
        status: group ? 'present' : 'missing',
        variants: group ? [{ context: { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final', dimensions: ['date', 'query', 'page'], filters: [], requestAggregationType: 'auto', slice: 'blog_date_query_page' }, groups: [group] }] : [],
      },
    },
    queryLabelRules: {},
    incompatibilities: [],
    pending: ['gsc pending gate'],
  };
}

const AS_OF = '2026-09-24T12:00:00Z';
const baseParams = { dir: 'data/seo', asOf: AS_OF, asOfBasis: 'explicit', runDate: '2026-09-24', runDateBasis: 'explicit', includeQueryRows: false };

function buildFixture({ gsc = makeGscReport(), psi, crux, params = baseParams } = {}) {
  return buildSeoReport({
    gsc,
    psi: psi ?? makePsiSelection([{ url: 'https://cubxxw.com/', strategy: 'mobile', samples: [psiSample(psiEntry())] }]),
    crux: crux ?? { observations: [], excluded: [], problems: [], byFormFactor: [] },
    params,
  });
}

// ---------------------------------------------------------------------------
// Determinism and recorded as-of
// ---------------------------------------------------------------------------

test('buildSeoReport is deterministic: identical inputs produce identical bytes', () => {
  const a = JSON.stringify(buildFixture());
  const b = JSON.stringify(buildFixture());
  assert.equal(a, b);
});

test('as-of is a recorded input: explicit and default run-clock bases are visible', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-rep-'));
  try {
    writeFileSync(join(dir, 'gsc-2026-09-23.json'), JSON.stringify(makeGscReport().inputs.files && {}));
    // CLI with explicit --as-of
    const logs = [];
    const code = await main(['--dir', REAL_DATA_DIR, '--start', '2026-07-27', '--end', '2026-09-20', '--as-of', '2026-09-24T00:00:00Z', '--out', join(dir, 'report.json')], {
      log: (m) => logs.push(m), errorLog: (m) => logs.push(m),
    });
    assert.equal(code, 2); // legacy evidence is honestly degraded
    const explicit = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
    assert.equal(explicit.schema, SEO_REPORT_SCHEMA);
    assert.equal(explicit.params.asOf, '2026-09-24T00:00:00Z');
    assert.equal(explicit.params.asOfBasis, 'explicit');

    // CLI without --as-of: one frozen run-clock value, recorded as such
    const code2 = await main(['--dir', REAL_DATA_DIR, '--start', '2026-07-27', '--end', '2026-09-20', '--out', join(dir, 'report2.json')], {
      log: () => {}, errorLog: () => {},
      now: () => new Date('2026-09-24T12:00:00.000Z'),
    });
    assert.equal(code2, 2);
    const defaulted = JSON.parse(readFileSync(join(dir, 'report2.json'), 'utf8'));
    assert.equal(defaulted.params.asOf, '2026-09-24T12:00:00.000Z');
    assert.equal(defaulted.params.asOfBasis, 'run-clock');

    // complete input provenance: exactly which evidence entered the report
    for (const r of [explicit, defaulted]) {
      assert.ok(r.inputs.gsc.files.length >= 70);
      assert.ok(r.inputs.psi.observations.every((o) => typeof o.file === 'string' && o.observedAt !== undefined));
      assert.ok(r.inputs.crux.observations.every((o) => typeof o.file === 'string'));
      assert.equal(r.params.runDateBasis, 'as-of-date');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: unknown arguments exit 1, --help exits 0 (guarded main)', () => {
  const bad = spawnSync(process.execPath, [SCRIPT, '--bogus'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown argument/);
  const help = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Exit: 0 = report generated/);
  assert.throws(() => parseCliArgs(['--dir', 'd']), /--start and --end are required/);
});

// ---------------------------------------------------------------------------
// Freshness: explicit thresholds, visible reasons, honest statuses
// ---------------------------------------------------------------------------

test('freshness: fresh/stale/missing/unknown/partial are classified with thresholds and reasons', () => {
  const fresh = classifyGscFreshness({ gsc: makeGscReport({ complete: true }), asOfMs: Date.parse(AS_OF) });
  assert.equal(fresh.status, 'fresh');
  assert.equal(fresh.thresholds, FRESHNESS_THRESHOLDS.gsc);

  const stale = classifyGscFreshness({ gsc: makeGscReport({ fetchedAt: '2026-09-20T00:00:00.000Z', countedDates: ['2026-09-10'] }), asOfMs: Date.parse(AS_OF) });
  assert.equal(stale.status, 'stale');
  assert.ok(stale.reasons.some((r) => /gsc-fetch-stale/.test(r)));
  assert.ok(stale.reasons.some((r) => /gsc-data-lag/.test(r)));

  const missing = classifyGscFreshness({ gsc: makeGscReport({ runDateFiles: [] }), asOfMs: Date.parse(AS_OF) });
  assert.equal(missing.status, 'missing');

  const partial = classifyGscFreshness({ gsc: makeGscReport({ complete: false }), asOfMs: Date.parse(AS_OF) });
  assert.equal(partial.status, 'partial');
  assert.ok(partial.reasons.some((r) => /gsc-partial-coverage/.test(r)));

  // PSI staleness uses the actual measurement date
  const oldPsi = makePsiSelection([{ url: 'u', strategy: 'mobile', samples: [psiSample(psiEntry({ fetchTime: '2026-09-01T10:00:00.000Z' }))] }]);
  const psiStale = classifyPsiFreshness({ psi: oldPsi, asOfMs: Date.parse(AS_OF) });
  assert.equal(psiStale.status, 'stale');
  assert.ok(psiStale.reasons.some((r) => /psi-stale/.test(r)));

  // CrUX with no sampled period is UNKNOWN (never stale-by-default, never zero)
  const cruxNone = classifyCruxFreshness({
    crux: { byFormFactor: [{ origin: 'https://cubxxw.com', formFactor: 'PHONE', current: { entry: { status: 'no-sample', latestPeriod: null } }, lastGood: null }] },
    asOfMs: Date.parse(AS_OF),
  });
  assert.equal(cruxNone.status, 'unknown');
  assert.ok(cruxNone.reasons.some((r) => /unknown field data/.test(r)));

  const cruxFresh = classifyCruxFreshness({
    crux: { byFormFactor: [{ origin: 'https://cubxxw.com', formFactor: 'PHONE', current: { entry: { status: 'sampled', latestPeriod: { firstDate: '2026-08-23', lastDate: '2026-09-19' } } }, lastGood: null }] },
    asOfMs: Date.parse(AS_OF),
  });
  assert.equal(cruxFresh.status, 'fresh');
  assert.equal(cruxFresh.latestCollectionDate, '2026-09-19');
});

// ---------------------------------------------------------------------------
// Trend: comparable only with adequate coverage
// ---------------------------------------------------------------------------

test('trend: adequate coverage compares current/prior non-overlapping windows; gaps are not a false trend', () => {
  const ok = buildTrend({ gsc: makeGscReport({ complete: true }) });
  assert.equal(ok.status, 'comparable');
  assert.match(ok.basis, /non-overlapping/);

  const gap = buildTrend({ gsc: makeGscReport({ complete: false }) });
  assert.equal(gap.status, 'not-comparable');
  assert.match(gap.reason, /reporting gaps, not a trend/);
});

// ---------------------------------------------------------------------------
// Query evidence: real associations only
// ---------------------------------------------------------------------------

test('query evidence preserves real query×page associations bound to their exact context; nothing is ever inferred or blended', () => {
  const notRequested = buildQueryEvidence({ gsc: makeGscReport(), includeQueryRows: false });
  assert.equal(notRequested.status, 'not-requested');
  assert.equal(notRequested.groups, null);

  const present = buildQueryEvidence({
    gsc: makeGscReport({ queryPairs: [['go releaser tutorial', '/growth/posts/go-releaser/', 120], ['hugo 构建', '/zh/engineering/posts/hugo/', 80], ['third', '/x/', 10]] }),
    includeQueryRows: true,
  });
  assert.equal(present.status, 'present');
  assert.equal(Array.isArray(present.pairs), false); // no flat blended pool across contexts
  const grp = present.groups[0];
  // the group is bound to its exact request context and aggregation
  assert.equal(grp.context.property, 'sc-domain:cubxxw.com');
  assert.equal(grp.context.searchType, 'web');
  assert.equal(grp.context.dataState, 'final');
  assert.deepEqual(grp.context.dimensions, ['date', 'query', 'page']);
  assert.equal(grp.responseAggregationType, 'byPage');
  const qpp = grp.windows.current.queryPagePairs;
  assert.equal(qpp.truncated, true); // explicit truncation flag preserved per window
  // association is data, never a join: query AND page travel together
  assert.equal(qpp.pairs[0].query, 'go releaser tutorial');
  assert.equal(qpp.pairs[0].page, '/growth/posts/go-releaser/');
  assert.equal(qpp.pairs[0].label, 'nonbrand');

  const absent = buildQueryEvidence({ gsc: makeGscReport({ queryPairs: 'absent' }), includeQueryRows: true });
  assert.equal(absent.status, 'absent');
  assert.match(absent.basis, /never an inferred landing page/);
});

// ---------------------------------------------------------------------------
// PSI section: denominators, labelled last-good, compatible-only comparisons
// ---------------------------------------------------------------------------

test('PSI section reports denominators by strategy and keeps current failure separate from labelled last-good', () => {
  const good = psiEntry({ lcp: 2000 });
  const failed = psiEntry({ finalStatus: 'failed', usable: false });
  const psi = makePsiSelection([
    {
      url: 'https://cubxxw.com/',
      strategy: 'mobile',
      samples: [
        psiSample(good, { file: 'psi-2026-09-23.json', observedAt: '2026-09-23T10:00:00.000Z' }),
        psiSample(failed, { file: 'psi-2026-09-24.json', observedAt: '2026-09-24T10:00:00.000Z' }),
      ],
    },
  ]);
  const section = buildPsiSection({ psi });
  assert.equal(section.targets[0].currentOutcome, 'failed'); // current failure visible
  assert.match(section.targets[0].lastGoodLabel, /^labelled-last-good/); // old success never substituted
  assert.deepEqual(Object.keys(section.denominators), ['mobile']);
  assert.equal(section.denominators.mobile.planned, 1);
  assert.match(section.note, /never substitutes/);
});

test('PSI comparisons: compatible samples yield deltas; mismatches land in the preserved missing set', () => {
  const from = psiSample(psiEntry({ lcp: 2000 }), { file: 'a.json', observedAt: '2026-09-23T10:00:00.000Z' });
  const to = psiSample(psiEntry({ lcp: 2700, cls: 0.09 }), { file: 'b.json', observedAt: '2026-09-24T10:00:00.000Z' });
  const section = buildPsiSection({ psi: makePsiSelection([{ url: 'https://cubxxw.com/', strategy: 'mobile', samples: [from, to] }]) });
  assert.equal(section.comparisons[0].compared, true);
  assert.equal(section.comparisons[0].deltas.LCP.delta, 700);

  const mismatched = buildPsiSection({
    psi: makePsiSelection([{
      url: 'https://cubxxw.com/',
      strategy: 'mobile',
      samples: [from, psiSample(psiEntry({ lcp: 2700, version: '11.0.0' }), { file: 'c.json', observedAt: '2026-09-24T10:00:00.000Z' })],
    }]),
  });
  assert.equal(mismatched.comparisons[0].compared, false);
  assert.equal(mismatched.missingSet.length, 1); // missing set preserved, no mixing
  assert.match(mismatched.missingSet[0].reason, /tool version or emulation\/throttling settings differ/);

  const single = buildPsiSection({ psi: makePsiSelection([{ url: 'https://cubxxw.com/', strategy: 'mobile', samples: [from] }]) });
  assert.equal(single.missingSet.length, 1);
  assert.match(single.missingSet[0].reason, /fewer than two usable samples/);
});

// ---------------------------------------------------------------------------
// Observations: actionable seeds vs informational signals
// ---------------------------------------------------------------------------

test('observations: missing description and compatible-sample regression are actionable; low CTR alone is not', () => {
  const from = psiSample(psiEntry({ lcp: 2000, cls: 0.05, metaScore: 0 }), { file: 'a.json', observedAt: '2026-09-23T10:00:00.000Z' });
  const to = psiSample(psiEntry({ lcp: 2700, cls: 0.12, metaScore: 0 }), { file: 'b.json', observedAt: '2026-09-24T10:00:00.000Z' });
  const psiSection = buildPsiSection({ psi: makePsiSelection([{ url: 'https://cubxxw.com/post/', strategy: 'mobile', samples: [from, to] }]) });
  const gsc = makeGscReport({ complete: true, ctr: 0.001 });
  const observations = buildObservations({ gsc, psiSection, cruxSection: {} });

  const missingDescription = observations.find((o) => o.kind === 'missing-description');
  assert.equal(missingDescription.actionable, true);
  assert.equal(missingDescription.targetUrl, 'https://cubxxw.com/post/');
  assert.equal(missingDescription.evidence.audit, 'meta-description');

  const regression = observations.find((o) => o.kind === 'metric-regression');
  assert.equal(regression.actionable, true);
  assert.deepEqual(regression.evidence.metric && [regression.evidence.metric.metric, regression.evidence.metric.delta], ['LCP', 700]);

  const overTarget = observations.filter((o) => o.kind === 'metric-over-target');
  assert.ok(overTarget.every((o) => o.actionable === false));

  const lowCtr = observations.find((o) => o.kind === 'low-ctr-signal');
  assert.equal(lowCtr.actionable, false); // low CTR NEVER authorizes a copy change
  assert.match(lowCtr.note, /NEVER authorizes a copy change/);
});

// ---------------------------------------------------------------------------
// CrUX section: origin identity and latest collection period
// ---------------------------------------------------------------------------

test('CrUX section refuses mixed origins and reports the actual latest period', () => {
  const section = buildCruxSection({
    crux: {
      observations: [], excluded: [], problems: [],
      byFormFactor: [
        { origin: 'https://cubxxw.com', formFactor: 'PHONE', currentOutcome: 'sampled', sampleCount: 1, lastGood: null, current: { entry: { status: 'sampled', key: { origin: 'https://cubxxw.com', formFactor: 'PHONE' }, latestPeriod: { firstDate: '2026-08-23', lastDate: '2026-09-19' }, latestPeriodStatus: 'sampled', sampledPeriods: 3 } } },
        { origin: 'https://other.example', formFactor: 'PHONE', currentOutcome: 'no-sample', sampleCount: 1, lastGood: null, current: { entry: { status: 'no-sample', latestPeriod: null } } },
      ],
    },
  });
  assert.equal(section.originsCompatible, false);
  assert.match(section.originConflict, /never blended/);
  assert.equal(section.groups[0].latestPeriod.lastDate, '2026-09-19');
  assert.match(section.cadenceNote, /rolling 28-day windows weekly/); // weekly cadence, not a 28-day allowance
  assert.match(section.note, /never zero/);
});

// ---------------------------------------------------------------------------
// Markdown safety
// ---------------------------------------------------------------------------

test('prepared Markdown is deterministic, bounded and cannot break daily-report sections', () => {
  const report = buildFixture();
  const md = report.markdown;
  assert.ok(md.startsWith('#### SEO 观测（确定性）'));
  assert.equal(md.includes('<!--'), false); // marker tokens neutralized
  assert.equal(md.includes('-->'), false);
  assert.ok(md.length <= 6000 + 20);
  assert.match(md, /低 CTR 单独出现不授权任何文案修改/);

  // even a hostile observation note cannot inject markers
  const hostile = buildFixture();
  hostile.observations.push({ kind: 'x', actionable: true, targetUrl: '<!-- section:seo -->', note: '<!-- /section:seo -->' });
  const md2 = buildMarkdown(hostile);
  assert.equal(md2.includes('<!--'), false);
  assert.equal(md2.includes('-->'), false);
});

test('writeMarkdown refuses to overwrite differing section content (other sections stay safe)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-md-'));
  try {
    const path = join(dir, 'section.md');
    assert.equal(writeMarkdown(path, 'A'), 'written');
    assert.equal(writeMarkdown(path, 'A'), 'unchanged');
    assert.throws(() => writeMarkdown(path, 'B'), /Refusing to overwrite/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Full report + real-history regression with a fixed observation cutoff
// ---------------------------------------------------------------------------

test('full report assembles sources, windows and notes; degraded inputs stay in-band', () => {
  const report = buildFixture({ gsc: makeGscReport({ complete: false }) });
  assert.equal(report.schema, SEO_REPORT_SCHEMA);
  assert.equal(report.sources.gsc.freshness.status, 'partial');
  assert.equal(report.trend.status, 'not-comparable');
  assert.ok(report.notes.some((n) => /low CTR alone never authorizes/.test(n)));
  assert.ok(report.pending.some((p) => /parent-owned live gates/.test(p)));
  assert.ok(report.inputs.gsc.files.length > 0); // complete input provenance
});

test('real history regression at frozen cutoff 2026-09-24T00:00:00Z stays honest', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-real-'));
  try {
    const logs = [];
    const code = await main(['--dir', REAL_DATA_DIR, '--start', '2026-07-27', '--end', '2026-09-20', '--as-of', '2026-09-24T00:00:00Z', '--out', join(dir, 'report.json'), '--markdown-out', join(dir, 'section.md')], {
      log: (m) => logs.push(m), errorLog: (m) => logs.push(m),
    });
    assert.equal(code, 2); // degraded legacy evidence is never green
    const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
    // PSI: the latest observation before the cutoff is psi-2026-09-23.json (15+11 of 26)
    const den = Object.values(report.sources.psi.denominators).reduce((a, c) => ({
      planned: a.planned + c.planned, usable: a.usable + c.usable, failed: a.failed + c.failed,
    }), { planned: 0, usable: 0, failed: 0 });
    assert.deepEqual([den.planned, den.usable, den.failed], [26, 15, 11]);
    // CrUX: no-sample is unknown, never zero
    assert.ok(report.sources.crux.groups.every((g) => g.status === 'no-sample'));
    // legacy GSC coverage is unproven -> no false trend
    assert.equal(report.trend.status, 'not-comparable');
    // deterministic regeneration is byte-identical
    const before = readFileSync(join(dir, 'report.json'), 'utf8');
    await main(['--dir', REAL_DATA_DIR, '--start', '2026-07-27', '--end', '2026-09-20', '--as-of', '2026-09-24T00:00:00Z', '--out', join(dir, 'report.json')], { log: () => {}, errorLog: () => {} });
    assert.equal(readFileSync(join(dir, 'report.json'), 'utf8'), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Repair-3 regressions: selected-context GSC provenance, CrUX certification
// propagation, PSI certification-aware comparisons/observations
// ---------------------------------------------------------------------------

test('R1: a newer filtered context never refreshes the selected domain-wide summary', () => {
  const gsc = makeGscReport({ fetchedAt: '2026-09-21T00:00:00.000Z', countedDates: ['2026-09-20'] });
  // second valid variant: same slice with a country filter, fetched LATER
  gsc.sections.domainPageRows.variants.push({
    context: { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final', dimensions: ['date', 'page'], filters: [{ groupType: 'and', filters: [{ dimension: 'country', operator: 'equals', expression: 'usa' }] }], requestAggregationType: 'auto', slice: 'date_page' },
    groups: [{
      responseAggregationType: 'auto',
      days: { '2026-09-20': { state: 'legacy-unknown', provenance: { file: 'gsc-filtered.json', fetchedAt: '2026-09-24T10:00:00.000Z' } } },
    }],
  });
  const fresh = classifyGscFreshness({ gsc, asOfMs: Date.parse(AS_OF) });
  assert.equal(fresh.fresh, false); // the selected summary is 84h old, past 72h
  assert.equal(fresh.latestFetchedAt, '2026-09-21T00:00:00.000Z'); // never borrowed
  assert.ok(fresh.reasons.some((r) => /gsc-fetch-stale/.test(r)));

  // ambiguous selection stays unknown instead of borrowing dates
  const ambiguous = makeGscReport({ fetchedAt: '2026-09-24T11:00:00.000Z' });
  ambiguous.sections.domainPageRows.variants.push({
    context: { ...ambiguous.sections.domainPageRows.variants[0].context, requestAggregationType: 'byPage' },
    groups: ambiguous.sections.domainPageRows.variants[0].groups,
  });
  const amb = classifyGscFreshness({ gsc: ambiguous, asOfMs: Date.parse(AS_OF) });
  assert.equal(amb.fresh, false);
  assert.equal(amb.latestFetchedAt, null);
  assert.ok(amb.reasons.some((r) => /gsc-counted-evidence-ambiguous/.test(r)));
});

function cruxGroup({ origin = 'https://cubxxw.com', formFactor = 'PHONE', status = 'sampled', lastDate = '2026-09-20', planCertified = true, runStatus = 'ok', unexpected = false, duplicate = false } = {}) {
  return {
    origin,
    originProven: true,
    formFactor,
    currentOutcome: status,
    sampleCount: 1,
    lastGood: null,
    current: {
      entry: { status, latestPeriod: lastDate ? { firstDate: '2026-08-24', lastDate } : null, latestPeriodStatus: status === 'sampled' ? 'sampled' : null, sampledPeriods: status === 'sampled' ? 1 : 0, key: { origin, formFactor }, collectionPeriods: [], overlappingWindows: true, metrics: null, error: null, problems: [] },
      observation: { file: 'crux-2026-09-24.json', observedAt: '2026-09-24T11:00:00.000Z', runDate: '2026-09-24', runStatus, planCertified, origin },
      originProven: true,
      unexpected,
      duplicate,
    },
  };
}

test('R2: uncertified/incomplete CrUX collections never certify a fresh source; distinct statuses preserved', () => {
  // valid multi-period sampled collection stays fresh
  const ok = classifyCruxFreshness({ crux: { byFormFactor: [cruxGroup()] }, asOfMs: Date.parse(AS_OF) });
  assert.equal(ok.fresh, true);

  // no recorded plan -> uncertified -> never fresh (CLI must degrade)
  const noPlan = classifyCruxFreshness({ crux: { byFormFactor: [cruxGroup({ planCertified: false, runStatus: 'uncertified' })] }, asOfMs: Date.parse(AS_OF) });
  assert.equal(noPlan.fresh, false);
  assert.equal(noPlan.byGroup[`${'https://cubxxw.com'}\u0000PHONE`].status, 'uncertified');
  assert.ok(noPlan.reasons.some((r) => /crux-collection-uncertified/.test(r)));

  // unexpected/duplicate rows and partial reads stay visible, non-ok
  for (const flags of [{ unexpected: true }, { duplicate: true }, { runStatus: 'partial' }]) {
    const f = classifyCruxFreshness({ crux: { byFormFactor: [cruxGroup(flags)] }, asOfMs: Date.parse(AS_OF) });
    assert.equal(f.fresh, false, JSON.stringify(flags));
    assert.ok(f.reasons.some((r) => /crux-collection-uncertified/.test(r)));
  }

  // distinct semantics survive: no-sample is unknown-not-zero; failures stay failures;
  // metric dates remain readable and one fresh factor never hides a stale one
  const mixed = classifyCruxFreshness({
    crux: { byFormFactor: [cruxGroup(), cruxGroup({ formFactor: 'DESKTOP', status: 'failed', lastDate: null })] },
    asOfMs: Date.parse(AS_OF),
  });
  assert.equal(mixed.fresh, false);
  assert.equal(mixed.byGroup[`${'https://cubxxw.com'}\u0000PHONE`].status, 'fresh');
  assert.equal(mixed.byGroup[`${'https://cubxxw.com'}\u0000DESKTOP`].status, 'failed');
  assert.equal(mixed.latestCollectionDate, '2026-09-20');

  const noSample = classifyCruxFreshness({ crux: { byFormFactor: [cruxGroup({ status: 'no-sample', lastDate: null })] }, asOfMs: Date.parse(AS_OF) });
  assert.equal(noSample.fresh, false);
  assert.equal(noSample.byGroup[`${'https://cubxxw.com'}\u0000PHONE`].status, 'no-sample');
});

test('R2: buildSeoReport and the CLI propagate uncertified CrUX as degraded evidence', async () => {
  // full CLI chain over actual A loader inputs + uncertified CrUX observation
  const dates = Array.from({ length: 56 }, (_, i) => new Date(Date.parse('2026-07-27T00:00:00Z') + i * 86400000).toISOString().slice(0, 10));
  const slice = () => ({
    name: 'date_page',
    dimensions: ['date', 'page'],
    filterGroups: [],
    requestAggregationType: 'auto',
    days: Object.fromEntries(dates.map((day) => [day, {
      status: 'complete', availability: 'available',
      rows: [{ keys: [day, 'https://cubxxw.com/a/'], clicks: 1, impressions: 10, ctr: 0.1, position: 2 }],
      response: { responseAggregationType: 'byPage', pages: 1, pageRowCounts: [1], terminator: 'short-page' },
      truncated: false, warnings: [],
    }])),
  });
  const files = {
    'gsc-good.json': {
      schema: 'gsc-snapshot/2',
      meta: { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final', fetchedAt: '2026-09-24T10:00:00Z', requestWindow: { start: dates[0], end: dates.at(-1) }, runStatus: 'ok' },
      slices: [slice()],
    },
    'crux-2026-09-24.json': {
      meta: { origin: 'https://cubxxw.com', fetchedAt: '2026-09-24T11:00:00Z' }, // no formFactors plan
      results: [{
        formFactor: 'PHONE',
        record: {
          key: { origin: 'https://cubxxw.com', formFactor: 'PHONE' },
          collectionPeriods: [{ firstDate: { year: 2026, month: 8, day: 17 }, lastDate: { year: 2026, month: 9, day: 13 } }, { firstDate: { year: 2026, month: 8, day: 24 }, lastDate: { year: 2026, month: 9, day: 20 } }],
          metrics: { largest_contentful_paint: { percentilesTimeseries: { p75s: [2100, 2200] } } },
        },
      }],
    },
  };
  const memFs = { readdirSync: () => Object.keys(files), readFileSync: (p) => JSON.stringify(files[p.split('/').at(-1)]) };
  const out = [];
  const exit = await main(['--dir', '/synthetic', '--start', '2026-07-27', '--end', '2026-09-20', '--as-of', AS_OF], {
    fs: memFs,
    now: () => new Date(AS_OF),
    log: (x) => out.push(x),
    errorLog: () => {},
  });
  assert.equal(exit, 2); // degraded, never a green exit 0
  const report = JSON.parse(out[0]);
  assert.equal(report.inputs.crux.observations[0].planCertified, false); // stays visible
  assert.equal(report.sources.crux.freshness.fresh, false); // and propagates
});

test('R3: uncertified historical-supplement targets stay historical; certified current regressions stay actionable', () => {
  const from = psiSample(psiEntry({ lcp: 1000 }), { file: 'psi-2026-09-22.json', observedAt: '2026-09-22T10:05:00.000Z' });
  const to = psiSample(psiEntry({ lcp: 2000, metaScore: 0 }), { file: 'psi-2026-09-23.json', observedAt: '2026-09-23T10:05:00.000Z' });
  // latest stage is uncertified: the old desktop sample is a labelled historical supplement
  const uncertified = makePsiSelection([{ url: 'https://cubxxw.com/', strategy: 'desktop', samples: [from, to], current: to }]);
  const t = uncertified.byTarget[0];
  t.currentCertified = false;
  t.currentLabel = 'historical-supplement (latest observation has no recorded plan; its denominator is uncertified)';
  const section = buildPsiSection({ psi: uncertified });
  assert.equal(section.targets[0].currentCertified, false);
  assert.equal(section.comparisons[0].historical, true); // never presented as current
  const obs = buildObservations({ gsc: makeGscReport(), psiSection: section, cruxSection: {} });
  assert.equal(obs.some((o) => o.strategy === 'desktop' && o.actionable), false);
  assert.ok(obs.some((o) => o.kind === 'metric-regression-historical' && !o.actionable));
  assert.ok(obs.some((o) => o.kind === 'missing-description-historical' && !o.actionable && /uncertified/.test(o.note))); // original values kept as historical

  // certified current comparison is a positive actionable regression
  const certified = makePsiSelection([{ url: 'https://cubxxw.com/', strategy: 'mobile', samples: [from, to], current: to }]);
  const section2 = buildPsiSection({ psi: certified });
  assert.equal(section2.comparisons[0].historical, false);
  const obs2 = buildObservations({ gsc: makeGscReport(), psiSection: section2, cruxSection: {} });
  assert.ok(obs2.some((o) => o.kind === 'metric-regression' && o.actionable && o.strategy === 'mobile'));
});
