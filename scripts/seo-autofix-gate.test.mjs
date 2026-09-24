import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  GATE_SCHEMA,
  REVIEW_STATE_SCHEMA,
  REVIEW_THRESHOLDS,
  deriveCandidates,
  evaluateReviewState,
  gateCandidates,
  normalizeReviewState,
} from './lib/seo-candidates.mjs';
import { PAGE_MAP_PRODUCER, PAGE_MAP_SCHEMA, normalizePageMap, resolveTargetPage, validateOwnedUrl, validateSourcePath } from './lib/seo-page-map.mjs';
import { main, parseCliArgs } from './seo-autofix-gate.mjs';

const SCRIPT = fileURLToPath(new URL('./seo-autofix-gate.mjs', import.meta.url));
const AS_OF = '2026-09-24T12:00:00Z';
const AS_OF_MS = Date.parse(AS_OF);
const SOURCE_COMMIT = 'c5fa8860c1643683eeb474d11e6ce06fef3d336d';

// Real repository identities (frontmatter `url` overrides included):
// Mem0/LangGraph live under ai-agent/posts/*.md but publish under /projects/…;
// UFO.md keeps its uppercase filename against a lowercase URL; a plain article
// and an index.md bundle round out the fixture.
const MEM0_ZH = { url: 'https://cubxxw.com/zh/projects/mem0/', sourcePath: 'content/zh/ai-agent/posts/mem0.md', kind: 'page', publishDate: '2025-05-09T13:33:46Z' };
const MEM0_EN = { url: 'https://cubxxw.com/projects/mem0/', sourcePath: 'content/en/ai-agent/posts/mem0.md', kind: 'page', publishDate: '2025-05-09T13:33:46Z' };
const LANGGRAPH_ZH = { url: 'https://cubxxw.com/zh/projects/langgraph/', sourcePath: 'content/zh/ai-agent/posts/langgraph.md', kind: 'page', publishDate: null };
const LANGGRAPH_EN = { url: 'https://cubxxw.com/projects/langgraph/', sourcePath: 'content/en/ai-agent/posts/langgraph.md', kind: 'page', publishDate: null };
const UFO = { url: 'https://cubxxw.com/projects/ufo/', sourcePath: 'content/en/ai-agent/posts/UFO.md', kind: 'page', publishDate: null }; // uppercase file, lowercase URL
const ARTICLE = { url: 'https://cubxxw.com/zh/growth/posts/foo/', sourcePath: 'content/zh/growth/posts/foo.md', kind: 'page', publishDate: null };
const BUNDLE = { url: 'https://cubxxw.com/engineering/posts/bundle/', sourcePath: 'content/en/engineering/posts/bundle/index.md', kind: 'page', publishDate: null };
const SECTION = { url: 'https://cubxxw.com/ai-agent/', sourcePath: 'content/en/ai-agent/_index.md', kind: 'section', publishDate: null };

function makePageMap({ pages = [MEM0_ZH, MEM0_EN, LANGGRAPH_ZH, LANGGRAPH_EN, UFO, ARTICLE, BUNDLE, SECTION], sourceCommit = SOURCE_COMMIT, clock = AS_OF, generatedAt = '2026-09-24T12:01:00Z', read = { status: 'ok', completeness: 'complete' }, repository = 'cubxxw/blog' } = {}) {
  return { schema: PAGE_MAP_SCHEMA, repository, sourceCommit, clock, generatedAt, producer: { ...PAGE_MAP_PRODUCER }, read, pages };
}

function makeGateReport({ psiFresh = true, psiCurrent = 'success', gscFresh = true, queryPairs = null, queryCoverageComplete = true, observations = [], comparisons = [], extraTargets = [], asOf = AS_OF } = {}) {
  const freshness = (fresh, reason) => ({ status: fresh ? 'fresh' : 'stale', fresh, reasons: fresh ? [] : [reason], thresholds: {} });
  const urls = [...new Set([MEM0_ZH.url, ...observations.map((o) => o.targetUrl).filter(Boolean), ...extraTargets])];
  const targets = urls.map((url) => ({
    url,
    strategy: 'mobile',
    currentOutcome: psiCurrent,
    currentCertified: true,
    currentLabel: null,
    current: { finalStatus: psiCurrent, fetchTime: psiFresh ? '2026-09-24T10:00:00.000Z' : '2026-09-01T10:00:00.000Z', metaDescriptionScore: 0 },
    lastGood: null,
  }));
  return {
    schema: 'seo-report/1',
    params: { asOf, start: '2026-07-27', end: '2026-09-20', host: 'cubxxw.com' },
    sources: {
      gsc: { freshness: freshness(gscFresh, 'gsc-fetch-stale: latest fetch is 96h old') },
      psi: {
        freshness: freshness(psiFresh, 'psi-stale: latest measurement is 9 days old'),
        targets,
        comparisons,
        latestObservation: { planCertified: true },
      },
      crux: { freshness: { status: 'unknown', fresh: false, reasons: ['crux-no-sample: successful query with no field sample (unknown field data)'], thresholds: {} }, groups: [] },
    },
    queryEvidence: queryPairs === null
      ? { status: 'absent', groups: [], basis: 'no rows' }
      : {
          status: 'present',
          basis: 'context-bound real query×page rows',
          groups: [{
            id: 'query-1',
            context: { property: 'sc-domain:cubxxw.com', searchType: 'web', dataState: 'final', dimensions: ['date', 'query', 'page'], filters: [], requestAggregationType: 'byPage', slice: 'blog_date_query_page' },
            responseAggregationType: 'byPage',
            windows: {
              current: {
                window: { start: '2026-08-24', end: '2026-09-20', days: 28 },
                coverage: { daysCounted: 28, provenCompleteDays: 28, expectedDays: 28, metricsComplete: queryCoverageComplete, partial: !queryCoverageComplete },
                provenance: { countedDates: ['2026-09-20'], fetchedAtLatest: '2026-09-24T10:00:00.000Z', fetchedAtEarliest: '2026-08-24T10:00:00.000Z' },
                queryPagePairs: {
                  totalPairs: queryPairs.length,
                  limit: 500,
                  truncated: false,
                  basis: 'real query×page rows as returned by the page dimension',
                  pairs: queryPairs.map(([query, page, impressions]) => ({ query, page, label: 'nonbrand', clicks: 1, impressions, ctr: 1 / impressions, position: 8 })),
                },
              },
            },
          }],
        },
    observations,
  };
}

function makeReviewState({ backlog = 2, proposals = [], read = { status: 'ok', completeness: 'complete' }, observedAt = AS_OF, repository = 'cubxxw/blog' } = {}) {
  return { schema: REVIEW_STATE_SCHEMA, repository, observedAt, read: { error: null, ...read }, backlog: { relevantOpenCount: backlog }, proposals };
}

function proposal(number, state, changedFiles, extra = {}) {
  return { number, state, changedFiles, closedAt: null, mergedAt: null, ...extra };
}

function descSeed(targetUrl = MEM0_ZH.url, strategy = 'mobile') {
  return { kind: 'missing-description', targetUrl, strategy, actionable: true, note: 'PSI meta-description audit 0', evidence: { source: 'psi-seo-audit', audit: 'meta-description', score: 0, measurementDate: '2026-09-24T10:00:00.000Z', sampleLabel: 'current' } };
}

function titleIntent({ queries = ['go 教程'], targetUrl = MEM0_ZH.url, targetPaths = [], rationale = '为该页改写标题，对齐真实查询' } = {}) {
  return {
    schema: 'seo-autofix-intents/1',
    intents: [{ kind: 'title-intent', targetUrl, targetPaths, rationale, evidenceBasis: { queries } }],
  };
}

const THREE_PAIRS = [
  ['go 教程', MEM0_ZH.url, 60],
  ['hugo 构建', MEM0_ZH.url, 40],
  ['ci 实践', MEM0_ZH.url, 10],
];

function runGate({ report = makeGateReport(), reviewState = makeReviewState(), intents = null, candidates = null, budget = 2, pageMap = makePageMap(), expectedSourceCommit = SOURCE_COMMIT, asOfMs = AS_OF_MS, expectedRepository = 'cubxxw/blog' } = {}) {
  const derived = candidates ?? deriveCandidates({ report, intents }).candidates;
  return gateCandidates({ report, reviewState, candidates: derived, asOfMs, budget, expectedRepository, expectedSourceCommit, pageMap });
}

// ---------------------------------------------------------------------------
// Page-map validator: URL/path identity boundaries
// ---------------------------------------------------------------------------

test('owned URL validation: HTTPS production origin only, no creds/port/query/fragment, no case folding', () => {
  assert.equal(validateOwnedUrl(MEM0_ZH.url).ok, true);
  assert.equal(validateOwnedUrl('https://cubxxw.com/projects/UFO/').ok, true); // case preserved, matched exactly
  for (const bad of [
    'https://example.invalid/unrelated', // external
    'http://cubxxw.com/zh/projects/mem0/', // not https
    'https://user:pass@cubxxw.com/x/', // credentials
    'https://cubxxw.com:8443/x/', // non-default port
    'https://cubxxw.com/x/?a=1', // query
    'https://cubxxw.com/x/#frag', // fragment
    'https://cubxxw.com', // not canonical (no trailing slash form)
    'https://cubxxw.com/a/../b/', // dot segments normalized away
    'ftp://cubxxw.com/x/',
  ]) {
    assert.equal(validateOwnedUrl(bad).ok, false, bad);
  }
});

test('source path validation: relative POSIX Markdown under content/en|zh only', () => {
  assert.equal(validateSourcePath('content/en/ai-agent/posts/UFO.md').ok, true);
  assert.equal(validateSourcePath('content/en/engineering/posts/bundle/index.md').ok, true);
  for (const bad of [
    '/content/en/a.md', // absolute
    'content\\en\\a.md', // backslashes
    'content/en/../../etc/passwd.md', // traversal
    'content/en/./a.md', // dot segment
    'content/fr/a.md', // wrong language root
    'other/en/a.md', // outside content
    'content/en/a.txt', // not markdown
    'content/en/', // not a file
  ]) {
    assert.equal(validateSourcePath(bad).ok, false, bad);
  }
});

test('page map: conflicting associations are isolated, duplicates deduped, unrelated targets preserved', () => {
  const map = normalizePageMap(makePageMap({
    pages: [
      MEM0_ZH,
      { ...MEM0_ZH }, // identical duplicate -> deduped, recorded
      { ...MEM0_ZH, sourcePath: 'content/zh/projects/another.md' }, // one URL, two paths -> ambiguous
      UFO,
    ],
  }));
  assert.equal(map.usable, true);
  assert.equal(map.ambiguous.has(MEM0_ZH.url), true);
  assert.equal(resolveTargetPage(map, MEM0_ZH.url).ok, false); // ambiguous: no first-row pick
  assert.match(resolveTargetPage(map, MEM0_ZH.url).reason, /ambiguous/);
  assert.equal(resolveTargetPage(map, UFO.url).page.sourcePath, UFO.sourcePath); // unrelated preserved
  assert.ok(map.rowProblems.some((p) => /duplicate of an earlier identical row/.test(p)));

  const pathConflict = normalizePageMap(makePageMap({ pages: [MEM0_ZH, MEM0_EN, { ...LANGGRAPH_ZH, sourcePath: MEM0_ZH.sourcePath }] }));
  assert.equal(pathConflict.ambiguous.has(LANGGRAPH_ZH.url), true); // one path, two URLs
  assert.equal(resolveTargetPage(pathConflict, MEM0_EN.url).page.sourcePath, MEM0_EN.sourcePath); // unrelated kept
});

test('page map: empty/failed/incomplete/over-cap maps are unusable and visible', () => {
  assert.equal(normalizePageMap(makePageMap({ pages: [] })).usable, false);
  assert.equal(normalizePageMap(makePageMap({ read: { status: 'failed', completeness: 'partial' } })).usable, false);
  assert.equal(normalizePageMap(makePageMap({ read: { status: 'ok', completeness: 'partial' } })).usable, false);
  assert.equal(normalizePageMap(null).usable, false);
  assert.equal(normalizePageMap(makePageMap({ generatedAt: 'garbage' })).usable, false);
});

// ---------------------------------------------------------------------------
// Positive mapped proposals (not all-skips)
// ---------------------------------------------------------------------------

test('POSITIVE: mapped meta-description proposal resolves the real override sourcePath', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  const gate = runGate({ report });
  assert.equal(gate.schema, GATE_SCHEMA);
  assert.equal(gate.candidates.length, 1);
  const c = gate.candidates[0];
  assert.equal(c.outcome, 'proposal');
  // /zh/projects/mem0/ maps to content/zh/ai-agent/posts/mem0.md (override),
  // NOT to a guessed content/zh/projects/mem0.md.
  assert.deepEqual(c.targetPaths, ['content/zh/ai-agent/posts/mem0.md']);
  assert.deepEqual(c.proposal.files, ['content/zh/ai-agent/posts/mem0.md']);
  assert.equal(c.evidence.map.url, MEM0_ZH.url);
  assert.equal(gate.apply.available, false);
  assert.equal(gate.params.decisionAt, new Date(AS_OF).toISOString());
  assert.equal(gate.params.reportAsOf, AS_OF); // report cutoff preserved separately
  assert.match(gate.pageMap.sourceCommit, /^[0-9a-f]{40}$/);
});

test('POSITIVE: bilingual overrides, uppercase UFO.md/lowercase URL, ordinary article and bundle all resolve exactly', () => {
  for (const page of [MEM0_EN, LANGGRAPH_ZH, LANGGRAPH_EN, UFO, ARTICLE, BUNDLE]) {
    const report = makeGateReport({ observations: [descSeed(page.url)] });
    const gate = runGate({ report });
    assert.equal(gate.candidates.length, 1, page.url);
    assert.deepEqual(gate.candidates[0].targetPaths, [page.sourcePath], page.url);
  }
  // exact-match discipline: the uppercase URL form is NOT the mapped target
  const upper = makeGateReport({ observations: [descSeed('https://cubxxw.com/projects/UFO/')] });
  assert.equal(runGate({ report: upper }).candidates.length, 0);
});

test('POSITIVE: grounded title intent with real query×page evidence yields a mapped proposal despite CrUX no-sample', () => {
  const report = makeGateReport({ queryPairs: THREE_PAIRS });
  const gate = runGate({ report, intents: titleIntent() });
  assert.equal(gate.candidates.length, 1);
  const c = gate.candidates[0];
  assert.equal(c.kind, 'title-intent');
  assert.equal(c.evidence.queryPage.groupId, 'query-1');
  assert.equal(c.evidence.queryPage.responseAggregationType, 'byPage');
  assert.equal(c.evidence.intentGrounding.grounded, 1);
  assert.deepEqual(c.targetPaths, [MEM0_ZH.sourcePath]);
  assert.equal(report.sources.crux.freshness.fresh, false); // CrUX no-sample never blocks GSC evidence
});

test('POSITIVE: valid unrelated and merged proposals never block; backlog 2 stays under the limit', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  const state = makeReviewState({
    backlog: 2,
    proposals: [
      proposal(11, 'open', ['content/zh/engineering/posts/other.md']),
      proposal(12, 'closed-merged', [MEM0_ZH.sourcePath], { closedAt: '2026-09-10T10:00:00Z', mergedAt: '2026-09-11T10:00:00Z' }),
    ],
  });
  const gate = runGate({ report, reviewState: state });
  assert.equal(gate.candidates.length, 1);
  assert.equal(gate.reviewState.ok, true);
});

test('POSITIVE: performance regression with a matching current comparison and actual regressing delta', () => {
  const seed = { kind: 'metric-regression', actionable: true, targetUrl: MEM0_ZH.url, strategy: 'mobile', note: 'LCP regression', evidence: { source: 'psi-compatible-samples' } };
  const report = makeGateReport({
    observations: [seed],
    comparisons: [{ url: MEM0_ZH.url, strategy: 'mobile', compared: true, historical: false, deltas: { LCP: { from: 2000, to: 2700, delta: 700, unit: 'ms' } } }],
  });
  const gate = runGate({ report });
  assert.equal(gate.candidates.length, 1);
  assert.equal(gate.candidates[0].evidence.compatibleComparison.regressionHits[0].metric, 'LCP');
});

// ---------------------------------------------------------------------------
// Map identity failures: missing/ambiguous/wrongSHA/external/nonpage/maptime
// ---------------------------------------------------------------------------

test('missing page map, wrong SHA, foreign clock and foreign repository all visibly skip', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  const missing = gateCandidates({ report, reviewState: makeReviewState(), candidates: deriveCandidates({ report }).candidates, asOfMs: AS_OF_MS, expectedRepository: 'cubxxw/blog', expectedSourceCommit: SOURCE_COMMIT, pageMap: null });
  assert.equal(missing.candidates.length, 0);
  assert.match(missing.skipped[0].reasons.join(' '), /page-map-missing/);

  for (const [pageMap, pattern] of [
    [makePageMap({ sourceCommit: '0'.repeat(40) }), /page-map-source-commit-mismatch/],
    [makePageMap({ clock: '2026-09-25T12:00:00Z' }), /page-map-clock-mismatch/],
    [makePageMap({ repository: 'other/repo' }), /page-map-repository-mismatch/],
  ]) {
    const gate = runGate({ report, pageMap });
    assert.equal(gate.candidates.length, 0);
    assert.match(gate.skipped[0].reasons.join(' '), pattern);
  }
});

test('external URL, non-page kind and future publishDate skip with explicit reasons', () => {
  const external = makeGateReport({ observations: [descSeed('https://example.invalid/unrelated')], extraTargets: ['https://example.invalid/unrelated'] });
  assert.match(runGate({ report: external }).skipped[0].reasons.join(' '), /target-url-invalid/);

  const nonpage = makeGateReport({ observations: [descSeed(SECTION.url)], extraTargets: [SECTION.url] });
  assert.match(runGate({ report: nonpage }).skipped[0].reasons.join(' '), /target-not-editable-page/);

  const futurePage = { ...ARTICLE, publishDate: '2027-01-01T00:00:00Z' };
  const future = makeGateReport({ observations: [descSeed(ARTICLE.url)], extraTargets: [ARTICLE.url] });
  assert.match(runGate({ report: future, pageMap: makePageMap({ pages: [futurePage] }) }).skipped[0].reasons.join(' '), /future-publish-date/);

  // ambiguous mapping never guesses a source
  const ambiguous = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  const dup = makePageMap({ pages: [MEM0_ZH, { ...MEM0_ZH, sourcePath: 'content/zh/projects/another.md' }] });
  assert.match(runGate({ report: ambiguous, pageMap: dup }).skipped[0].reasons.join(' '), /ambiguous/);
});

// ---------------------------------------------------------------------------
// Overlap via actual changed-file evidence (real override paths)
// ---------------------------------------------------------------------------

test('open or recently-rejected overlap on the REAL sourcePath blocks; old rejection does not', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });

  // open PR touching content/zh/ai-agent/posts/mem0.md blocks /zh/projects/mem0/
  const open = runGate({ report, reviewState: makeReviewState({ backlog: 1, proposals: [proposal(99, 'open', [MEM0_ZH.sourcePath])] }) });
  assert.equal(open.candidates.length, 0);
  assert.match(open.skipped[0].reasons.join(' '), /overlapping-open-proposal/);

  const rejected = runGate({ report, reviewState: makeReviewState({ proposals: [proposal(2, 'closed-unmerged', [MEM0_ZH.sourcePath], { closedAt: '2026-09-20T10:00:00Z' })] }) });
  assert.equal(rejected.candidates.length, 0);
  assert.match(rejected.skipped[0].reasons.join(' '), /recently-rejected-overlap/);

  const old = runGate({ report, reviewState: makeReviewState({ proposals: [proposal(3, 'closed-unmerged', [MEM0_ZH.sourcePath], { closedAt: '2026-09-01T10:00:00Z' })] }) });
  assert.equal(old.candidates.length, 1); // older than 14 days

  // rename evidence: B2 includes old+new paths; either blocks
  const rename = runGate({ report, reviewState: makeReviewState({ proposals: [proposal(4, 'open', ['content/zh/ai-agent/posts/mem0-old.md', MEM0_ZH.sourcePath])] }) });
  assert.equal(rename.candidates.length, 0);
});

test('model targetPaths never borrow another page and conflicts are rejected', () => {
  const report = makeGateReport({ queryPairs: THREE_PAIRS });
  const gate = runGate({ report, intents: titleIntent({ targetPaths: [LANGGRAPH_EN.sourcePath] }) });
  assert.equal(gate.candidates.length, 0);
  assert.match(gate.skipped[0].reasons.join(' '), /model-target-paths-conflict/);

  // matching map path is accepted and replaced by the map-derived list
  const ok = runGate({ report, intents: titleIntent({ targetPaths: [MEM0_ZH.sourcePath] }) });
  assert.equal(ok.candidates.length, 1);
  assert.deepEqual(ok.candidates[0].targetPaths, [MEM0_ZH.sourcePath]);
});

// ---------------------------------------------------------------------------
// reviewState fail-closed behavior (recency/completeness/freshness)
// ---------------------------------------------------------------------------

test('closed-unmerged overlap without closedAt is unknown recency: incomplete review state, visible skip', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  const gate = runGate({ report, reviewState: makeReviewState({ proposals: [{ number: 99, state: 'closed-unmerged', changedFiles: [MEM0_ZH.sourcePath] }] }) });
  assert.equal(gate.candidates.length, 0);
  assert.ok(gate.reviewState.reasons.some((r) => /unknown recency is incomplete/.test(r)));
});

test('missing/failed/truncated/incomplete review state is a visible safe skip, never a zero default', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });

  const noState = gateCandidates({ report, reviewState: null, candidates: deriveCandidates({ report }).candidates, asOfMs: AS_OF_MS, expectedRepository: 'cubxxw/blog', expectedSourceCommit: SOURCE_COMMIT, pageMap: makePageMap() });
  assert.equal(noState.candidates.length, 0);
  assert.match(noState.reviewState.reasons.join(' '), /review-state-unavailable/);

  for (const [read, pattern] of [
    [{ status: 'failed', completeness: 'partial' }, /review-state-failed/],
    [{ status: 'truncated', completeness: 'truncated' }, /review-state-incomplete|review-state-failed/],
    [{ status: 'ok', completeness: 'partial' }, /review-state-incomplete/],
  ]) {
    const gate = runGate({ report, reviewState: makeReviewState({ read }) });
    assert.equal(gate.candidates.length, 0, JSON.stringify(read));
    assert.match(gate.reviewState.reasons.join(' '), pattern);
  }

  const stale = runGate({ report, reviewState: makeReviewState({ observedAt: '2026-09-23T10:00:00Z' }) });
  assert.equal(stale.candidates.length, 0);
  assert.match(stale.reviewState.reasons.join(' '), /review-state-stale/);

  const bad = normalizeReviewState({ schema: REVIEW_STATE_SCHEMA, repository: 'cubxxw/blog', observedAt: AS_OF, read: { status: 'ok', completeness: 'complete' }, proposals: [] });
  assert.equal(bad.ok, false);
  assert.ok(bad.problems.some((p) => /never defaulted/.test(p)));
});

test('reviewState never exceeds the decision time — even by one second', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  for (const observedAt of ['2026-09-24T12:30:00Z', '2026-09-24T12:00:01Z']) {
    const gate = runGate({ report, reviewState: makeReviewState({ observedAt }) });
    assert.equal(gate.candidates.length, 0, observedAt);
    assert.match(gate.reviewState.reasons.join(' '), /review-state-from-the-future/);
  }
  const evalState = evaluateReviewState({ reviewState: makeReviewState({ observedAt: '2026-09-24T12:00:01Z' }), asOfMs: AS_OF_MS });
  assert.equal(evalState.ok, false);
});

test('close/merge timestamps must be consistent and never exceed the observed review time', () => {
  for (const p of [
    proposal(1, 'open', [MEM0_ZH.sourcePath], { closedAt: '2026-09-20T10:00:00Z' }), // open but closed
    proposal(2, 'closed-unmerged', [MEM0_ZH.sourcePath], { mergedAt: '2026-09-20T10:00:00Z' }), // unmerged but mergedAt
    proposal(3, 'closed-merged', [MEM0_ZH.sourcePath]), // merged without mergedAt
    proposal(4, 'closed-unmerged', [MEM0_ZH.sourcePath], { closedAt: '2026-09-30T10:00:00Z' }), // closedAt after observedAt
  ]) {
    const normalized = normalizeReviewState(makeReviewState({ proposals: [p] }));
    assert.equal(normalized.ok, false, p.number);
    assert.ok(normalized.problems.length > 0);
  }
  // valid merged/unrelated records stay consistent
  assert.equal(normalizeReviewState(makeReviewState({
    proposals: [
      proposal(5, 'closed-merged', [MEM0_ZH.sourcePath], { closedAt: '2026-09-10T10:00:00Z', mergedAt: '2026-09-11T10:00:00Z' }),
      proposal(6, 'open', ['content/zh/engineering/posts/other.md']),
    ],
  })).ok, true);
});

test('backlog 2 allows; backlog 3 blocks (review bottleneck)', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  assert.equal(runGate({ report, reviewState: makeReviewState({ backlog: 2 }) }).candidates.length, 1);
  const blocked = runGate({ report, reviewState: makeReviewState({ backlog: 3 }) });
  assert.equal(blocked.candidates.length, 0);
  assert.match(blocked.skipped[0].reasons.join(' '), /backlog-limit/);
});

// ---------------------------------------------------------------------------
// Decision-time replay: stored fresh flags never authorize, timestamps bounded
// ---------------------------------------------------------------------------

test('old report replay: fresh flags and new wrappers never freshen old data at a later decision', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] }); // measurement 2026-09-24
  const when = '2026-10-24T12:00:00Z';
  const gate = runGate({
    report,
    reviewState: makeReviewState({ observedAt: when }),
    pageMap: makePageMap({ clock: when, generatedAt: when }),
    asOfMs: Date.parse(when),
  });
  assert.equal(gate.candidates.length, 0);
  assert.match(gate.skipped[0].reasons.join(' '), /psi-target-stale-at-decision/);

  // source observation after the report cutoff is excluded too
  const fromFuture = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  fromFuture.sources.psi.targets[0].current.fetchTime = '2026-09-25T10:00:00.000Z';
  assert.match(runGate({ report: fromFuture }).skipped[0].reasons.join(' '), /after-report-cutoff/);
});

test('explicit historical decision time authorizes; a later-generated map is just calculation', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  const gate = runGate({ report, pageMap: makePageMap({ generatedAt: '2026-10-24T12:00:00Z' }) }); // clock still matches
  assert.equal(gate.candidates.length, 1);

  // missing decision time is invalid input for the pure function (visible skip)
  const none = gateCandidates({ report, reviewState: makeReviewState(), candidates: deriveCandidates({ report }).candidates, asOfMs: null, expectedRepository: 'cubxxw/blog', expectedSourceCommit: SOURCE_COMMIT, pageMap: makePageMap() });
  assert.equal(none.candidates.length, 0);
  assert.ok(none.decisions[0].reasons.some((r) => /decision-time-missing/.test(r)));
});

// ---------------------------------------------------------------------------
// Evidence identity: own audit, strategy, query context
// ---------------------------------------------------------------------------

test('own current certified fresh audit0 is required; healthy audit never proposes from intent text', () => {
  const report = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  report.sources.psi.targets[0].current.metaDescriptionScore = 1; // healthy
  const gate = runGate({ report, intents: { schema: 'seo-autofix-intents/1', intents: [{ kind: 'meta-description', targetUrl: MEM0_ZH.url, rationale: 'synthetic unsupported claim' }] } });
  assert.equal(gate.candidates.length, 0);
  assert.match(gate.skipped[0].reasons.join(' '), /target-evidence-not-current/);

  // uncertified current stage never authorizes either
  const uncertified = makeGateReport({ observations: [descSeed(MEM0_ZH.url)] });
  uncertified.sources.psi.targets[0].currentCertified = false;
  assert.equal(runGate({ report: uncertified }).candidates.length, 0);
});

test('URL×strategy identity is preserved: fresh mobile never authorizes a stale desktop target', () => {
  const report = makeGateReport({ observations: [] });
  report.sources.psi.targets = [
    { url: MEM0_ZH.url, strategy: 'mobile', currentOutcome: 'success', currentCertified: true, current: { metaDescriptionScore: 1, fetchTime: '2026-09-24T10:00:00.000Z' } },
    { url: MEM0_ZH.url, strategy: 'desktop', currentOutcome: 'success', currentCertified: true, current: { metaDescriptionScore: 0, fetchTime: '2026-09-01T10:00:00.000Z' } },
  ];
  const gate = runGate({ report, candidates: [{ kind: 'meta-description', targetUrl: MEM0_ZH.url, strategy: 'desktop', targetPaths: [], rationale: 'r', source: 'deterministic-report' }] });
  assert.equal(gate.candidates.length, 0);
  assert.match(gate.skipped[0].reasons.join(' '), /target-evidence-stale/);

  // a strategy-less intent qualifies only via a measurement that supports the kind
  const noStrategy = runGate({ report, intents: { schema: 'seo-autofix-intents/1', intents: [{ kind: 'meta-description', targetUrl: MEM0_ZH.url, rationale: 'r' }] } });
  assert.equal(noStrategy.candidates.length, 0); // mobile healthy, desktop stale

  const wrongStrategy = runGate({ report, candidates: [{ kind: 'meta-description', targetUrl: MEM0_ZH.url, strategy: 'tablet', targetPaths: [], rationale: 'r', source: 'deterministic-report' }] });
  assert.match(wrongStrategy.skipped[0].reasons.join(' '), /strategy-mismatch/);
});

test('query evidence: other-page, previous-window, stale group and multi-context ambiguity all skip', () => {
  const other = makeGateReport({ queryPairs: [['q', LANGGRAPH_EN.url, 500], ['q2', LANGGRAPH_EN.url, 500], ['q3', LANGGRAPH_EN.url, 500]] });
  assert.match(runGate({ report: other, intents: titleIntent() }).skipped[0].reasons.join(' '), /no-target-query-evidence/);

  const thin = makeGateReport({ queryPairs: [['q', MEM0_ZH.url, 5]] });
  assert.match(runGate({ report: thin, intents: titleIntent() }).skipped[0].reasons.join(' '), /query-page-evidence-thin/);

  const stale = makeGateReport({ queryPairs: THREE_PAIRS });
  stale.queryEvidence.groups[0].windows.current.provenance.fetchedAtLatest = '2026-09-01T10:00:00.000Z';
  assert.match(runGate({ report: stale, intents: titleIntent() }).skipped[0].reasons.join(' '), /query-group-fetch-stale-at-decision/);

  const incomplete = makeGateReport({ queryPairs: THREE_PAIRS, queryCoverageComplete: false });
  assert.match(runGate({ report: incomplete, intents: titleIntent() }).skipped[0].reasons.join(' '), /incomplete-context/);

  const ambiguous = makeGateReport({ queryPairs: THREE_PAIRS });
  ambiguous.queryEvidence.groups.push({ ...ambiguous.queryEvidence.groups[0], id: 'query-2' });
  assert.match(runGate({ report: ambiguous, intents: titleIntent() }).skipped[0].reasons.join(' '), /context-ambiguous/);
});

test('low CTR alone never authorizes a copy change', () => {
  const report = makeGateReport({ queryPairs: THREE_PAIRS });
  const gate = runGate({ report, intents: titleIntent({ queries: [] }) });
  assert.equal(gate.candidates.length, 0);
  assert.match(gate.skipped[0].reasons.join(' '), /low-ctr-alone-insufficient/);

  const ungrounded = runGate({ report, intents: titleIntent({ queries: ['不存在的查询'] }) });
  assert.match(ungrounded.skipped[0].reasons.join(' '), /intent-queries-not-in-evidence/);
});

test('query freshness uses Pacific calendar days at the six-day boundary', () => {
  for (const [end, expected] of [['2026-09-18', 1], ['2026-09-17', 0], ['2026-09-25', 0]]) {
    const report = makeGateReport({ queryPairs: THREE_PAIRS });
    const current = report.queryEvidence.groups[0].windows.current;
    current.window.end = end;
    current.window.start = new Date(Date.parse(`${end}T00:00:00Z`) - 27 * 86400000).toISOString().slice(0, 10);
    current.provenance.countedDates = [end];
    assert.equal(runGate({ report, intents: titleIntent() }).candidates.length, expected, end);
  }
});

test('performance regression needs an actual regressing delta, not intent plus any comparison', () => {
  const seed = { kind: 'metric-regression', actionable: true, targetUrl: MEM0_ZH.url, strategy: 'mobile', note: 'r', evidence: { source: 'psi-compatible-samples' } };
  const improved = makeGateReport({
    observations: [seed],
    comparisons: [{ url: MEM0_ZH.url, strategy: 'mobile', compared: true, historical: false, deltas: { LCP: { from: 2700, to: 2000, delta: -700, unit: 'ms' } } }],
  });
  assert.equal(runGate({ report: improved }).candidates.length, 0);
  assert.match(runGate({ report: improved }).skipped[0].reasons.join(' '), /no-regressing-delta/);

  const historical = makeGateReport({
    observations: [seed],
    comparisons: [{ url: MEM0_ZH.url, strategy: 'mobile', compared: true, historical: true, deltas: { LCP: { from: 2000, to: 2700, delta: 700, unit: 'ms' } } }],
  });
  assert.equal(runGate({ report: historical }).candidates.length, 0);
});

for (const mobileRegression of [false, true]) {
  test(`strategy-less performance intent pairs freshness with regression (mobileRegression=${mobileRegression})`, () => {
    for (const reverse of [false, true]) {
      const report = makeGateReport();
      report.sources.psi.targets.push({
        ...report.sources.psi.targets[0],
        strategy: 'desktop',
        current: { fetchTime: '2026-09-02T10:00:00Z', metaDescriptionScore: 1 },
      });
      report.sources.psi.comparisons = ['desktop', 'mobile'].map((strategy) => {
        const regresses = strategy === 'mobile' ? mobileRegression : !mobileRegression;
        return {
          url: MEM0_ZH.url, strategy, compared: true, historical: false,
          deltas: { LCP: { from: 1000, to: regresses ? 2000 : 1000, delta: regresses ? 1000 : 0, unit: 'ms' } },
        };
      });
      if (reverse) {
        report.sources.psi.targets.reverse();
        report.sources.psi.comparisons.reverse();
      }
      const intents = {
        schema: 'seo-autofix-intents/1',
        intents: [{ kind: 'performance-regression', targetUrl: MEM0_ZH.url, rationale: 'Investigate the measured regression' }],
      };
      const result = runGate({ report, intents });
      assert.equal(result.candidates.length, mobileRegression ? 1 : 0);
      if (mobileRegression) {
        const evidence = result.candidates[0].evidence;
        assert.equal(evidence.sources.psi.ownMeasurement.strategy, 'mobile');
        assert.equal(evidence.compatibleComparison.strategy, 'mobile');
      } else {
        assert.match(result.skipped[0].reasons.join(' '), /no-fresh-regression-pair/);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Budget, intents and CLI
// ---------------------------------------------------------------------------

test('finite candidate budget: overflow is a visible skip, zero candidates is safe', () => {
  const report = makeGateReport({
    observations: [descSeed(MEM0_ZH.url), descSeed(MEM0_EN.url), descSeed(ARTICLE.url)],
  });
  const gate = runGate({ report, budget: 2 });
  assert.equal(gate.candidates.length, 2);
  assert.equal(gate.budget.used, 2);
  assert.match(gate.skipped[0].reasons.join(' '), /budget-exhausted/);

  const none = runGate({ report: makeGateReport() });
  assert.equal(none.candidates.length, 0);
  assert.equal(none.mode, 'proposal-only');
});

test('intent input is untrusted: bounded text, strict schema, unknown kinds visible', () => {
  const { candidates } = deriveCandidates({ report: makeGateReport(), intents: titleIntent({ rationale: 'x'.repeat(1000) }) });
  assert.ok(candidates[0].rationale.length <= 301);

  const bad = deriveCandidates({ report: makeGateReport(), intents: { schema: 'evil/1', intents: [] } });
  assert.equal(bad.candidates.length, 0);
  assert.ok(bad.problems.some((p) => /untrusted/.test(p)));

  const unknownKind = deriveCandidates({ report: makeGateReport(), intents: { schema: 'seo-autofix-intents/1', intents: [{ kind: 'delete-everything', targetUrl: MEM0_ZH.url }] } });
  assert.ok(unknownKind.problems.some((p) => /unsupported kind/.test(p)));
});

test('CLI: new frozen inputs are required; valid run writes a proposal-only decision', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-gate-'));
  try {
    const reportPath = join(dir, 'report.json');
    const reviewPath = join(dir, 'review.json');
    const mapPath = join(dir, 'page-map.json');
    writeFileSync(reportPath, JSON.stringify(makeGateReport({ observations: [descSeed(MEM0_ZH.url)] })));
    writeFileSync(reviewPath, JSON.stringify(makeReviewState()));
    writeFileSync(mapPath, JSON.stringify(makePageMap()));

    const logs = [];
    const code = await main([
      '--report', reportPath,
      '--review-state', reviewPath,
      '--page-map', mapPath,
      '--expected-source-commit', SOURCE_COMMIT,
      '--decision-at', AS_OF,
      '--repository', 'cubxxw/blog',
      '--out', join(dir, 'gate.json'),
    ], { log: (m) => logs.push(m), errorLog: (m) => logs.push(m) });
    assert.equal(code, 0);
    const gate = JSON.parse(readFileSync(join(dir, 'gate.json'), 'utf8'));
    assert.equal(gate.candidates.length, 1);
    assert.deepEqual(gate.candidates[0].targetPaths, [MEM0_ZH.sourcePath]);
    assert.equal(gate.apply.available, false);

    // omission of any frozen input is invalid input, never a silent fallback
    for (const drop of [
      ['--page-map', mapPath],
      ['--expected-source-commit', SOURCE_COMMIT],
      ['--decision-at', AS_OF],
    ]) {
      const args = ['--report', reportPath, '--review-state', reviewPath, '--page-map', mapPath, '--expected-source-commit', SOURCE_COMMIT, '--decision-at', AS_OF];
      const cut = args.indexOf(drop[0]);
      args.splice(cut, 2);
      const res = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
      assert.equal(res.status, 1, drop[0]);
      assert.match(res.stderr, /Missing required/);
    }

    const badDecision = spawnSync(process.execPath, [SCRIPT, '--report', reportPath, '--review-state', reviewPath, '--page-map', mapPath, '--expected-source-commit', SOURCE_COMMIT, '--decision-at', 'garbage'], { encoding: 'utf8' });
    assert.equal(badDecision.status, 1);

    const badSchema = spawnSync(process.execPath, [SCRIPT, '--report', reportPath, '--review-state', reviewPath, '--page-map', reviewPath, '--expected-source-commit', SOURCE_COMMIT, '--decision-at', AS_OF], { encoding: 'utf8' });
    assert.equal(badSchema.status, 1);
    assert.match(badSchema.stderr, /seo-page-map\/1/);

    const help = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
    assert.equal(help.status, 0);
    assert.throws(() => parseCliArgs(['--report', 'x'], {}), /--review-state/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
