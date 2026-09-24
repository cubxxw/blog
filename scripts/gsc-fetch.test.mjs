import assert from 'node:assert/strict';
import test from 'node:test';

import { GscError, redactSecrets, safeErrorMessage } from './lib/gsc-errors.mjs';
import {
  addDays,
  countDays,
  defaultWindow,
  enumerateDates,
  isValidCalendarDate,
  parseDateArg,
  parseLookback,
  splitWindow,
  todayInTimezone,
  validateRequestRange,
} from './lib/gsc-dates.mjs';
import {
  buildSearchAnalyticsBody,
  escapeRe2,
  hasPageFilter,
  hostFilterPattern,
  normalizeFilterGroups,
  requestContext,
  selectionKey,
  slicePlan,
  validateAggregationRequest,
} from './lib/gsc-snapshot.mjs';

// ---------------------------------------------------------------------------
// CLI date/lookback validation
// ---------------------------------------------------------------------------

test('parseDateArg accepts exactly YYYY-MM-DD real dates', () => {
  assert.equal(parseDateArg('2026-09-20', '--end'), '2026-09-20');
  assert.ok(isValidCalendarDate('2024-02-29')); // leap day
});

test('parseDateArg rejects trailing garbage and loose forms', () => {
  for (const bad of ['2026-09-20x', '2026-09-20 ', ' 2026-09-20', '2026-9-2', '2026/09/20', '20-09-2026']) {
    assert.throws(() => parseDateArg(bad, '--end'), GscError, `expected rejection for ${JSON.stringify(bad)}`);
  }
});

test('parseDateArg rejects impossible calendar dates', () => {
  for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '2025-02-29', '2026-04-31']) {
    assert.throws(() => parseDateArg(bad, '--start'), /not a real calendar date/, `expected rejection for ${bad}`);
  }
});

test('parseDateArg rejects NaN, empty and non-string values', () => {
  for (const bad of ['NaN', '', null, undefined, 20260920, 'Infinity']) {
    assert.throws(() => parseDateArg(bad, '--start'), GscError);
  }
});

test('parseLookback: 27 -> 28 days, 55 -> 56 days', () => {
  assert.equal(parseLookback('27'), 27);
  assert.equal(parseLookback('55'), 55);
  const now = new Date('2026-09-24T12:00:00Z');
  for (const [lookback, expectedDays] of [[27, 28], [55, 56], [2, 3], [0, 1]]) {
    const { start, end } = defaultWindow({ now, lookback });
    assert.equal(countDays(start, end), expectedDays, `lookback ${lookback}`);
  }
});

test('parseLookback rejects negative, NaN and trailing characters', () => {
  for (const bad of ['-1', 'NaN', '27x', '1e3', '0x10', '2.5', '', null]) {
    assert.throws(() => parseLookback(bad), /Invalid --lookback/, `expected rejection for ${JSON.stringify(bad)}`);
  }
});

// ---------------------------------------------------------------------------
// Search Console calendar dates (America/Los_Angeles), DST-safe
// ---------------------------------------------------------------------------

test('defaults use Search Console calendar dates, not UTC traffic dates', () => {
  // 2026-03-08 is the US spring-forward date; 2026-11-01 the fall-back date.
  assert.equal(todayInTimezone(new Date('2026-03-08T06:30:00Z')), '2026-03-07'); // LA 2026-03-07 22:30 PST
  assert.equal(todayInTimezone(new Date('2026-03-08T09:30:00Z')), '2026-03-08'); // LA 2026-03-08 01:30 PST
  assert.equal(todayInTimezone(new Date('2026-11-01T05:30:00Z')), '2026-10-31'); // LA 2026-10-31 22:30 PDT
  assert.equal(todayInTimezone(new Date('2026-11-01T09:30:00Z')), '2026-11-01'); // LA 2026-11-01 01:30 PST
});

test('default windows stay calendar-correct across DST transitions', () => {
  for (const iso of ['2026-03-10T01:00:00Z', '2026-11-03T01:00:00Z']) {
    const { start, end } = defaultWindow({ now: new Date(iso), lookback: 27 });
    assert.equal(countDays(start, end), 28);
    assert.equal(end, addDays(start, 27));
  }
  const { start, end } = defaultWindow({ now: new Date('2026-09-24T00:30:00Z'), lookback: 2 });
  // 2026-09-24T00:30Z is still 2026-09-23 in Los Angeles -> end = today-3.
  assert.deepEqual({ start, end }, { start: '2026-09-18', end: '2026-09-20' });
});

test('validateRequestRange rejects inverted ranges and future end dates', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  assert.deepEqual(
    validateRequestRange({ start: '2026-07-27', end: '2026-09-20', now }),
    { start: '2026-07-27', end: '2026-09-20' },
  );
  assert.throws(() => validateRequestRange({ start: '2026-09-21', end: '2026-09-20', now }), /Inverted range/);
  assert.throws(() => validateRequestRange({ start: '2026-09-20', end: '2026-09-25', now }), /Future --end/);
  assert.throws(() => validateRequestRange({ start: '2026-09-20x', end: '2026-09-20', now }), /Invalid --start/);
  assert.throws(() => validateRequestRange({ start: '2026-09-20', end: '2027-02-30', now }), /not a real calendar date/);
});

test('splitWindow yields two non-overlapping halves (28+28 for 56 days)', () => {
  const windows = splitWindow({ start: '2026-07-27', end: '2026-09-20' });
  assert.deepEqual(windows, {
    previous: { start: '2026-07-27', end: '2026-08-23', days: 28 },
    current: { start: '2026-08-24', end: '2026-09-20', days: 28 },
  });
  assert.throws(() => splitWindow({ start: '2026-07-27', end: '2026-09-19' }), /even day count/);
  assert.equal(enumerateDates('2026-08-24', '2026-09-20').length, 28);
});

// ---------------------------------------------------------------------------
// Secret redaction
// ---------------------------------------------------------------------------

test('redactSecrets strips tokens, keys, JWTs and endpoint query strings', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki\n-----END PRIVATE KEY-----';
  const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJzYSJ9.abcdefghij-klmnop_qrst';
  const saJson = `{"client_email":"sa@example.iam.gserviceaccount.com","private_key":"${pem.replace(/\n/g, '\\n')}"}`;
  const raw = [
    `Token request failed (400): {"error":"invalid_grant"} assertion=${jwt}`,
    `Authorization: Bearer ${jwt}`,
    `body: ${saJson}`,
    pem,
    `{"access_token":"ya29.super-secret","refresh_token":"1//0secret","id_token":"${jwt}","client_secret":"s3cr3t"}`,
    `POST https://oauth2.googleapis.com/token?assertion=${jwt}&scope=x`,
  ].join('\n');
  const clean = redactSecrets(raw);
  for (const secret of ['ya29.super-secret', '1//0secret', 's3cr3t', 'MIIEvQIBADANBgkqhki', 'abcdefghij-klmnop_qrst', 'eyJhbGciOiJSUzI1NiJ9']) {
    assert.ok(!clean.includes(secret), `leaked ${secret} in:\n${clean}`);
  }
  assert.ok(clean.includes('[redacted'));
  assert.ok(!/\?[^\s"'`)\]]*(assertion|token)/.test(clean), 'endpoint query not redacted');
});

test('GscError and safeErrorMessage never echo credential-bearing detail', () => {
  const raw = new Error('403 {"access_token":"tok-1234567890"} private_key":"ABCD1234"');
  const err = new GscError(raw.message, { kind: 'auth', status: 403 });
  assert.ok(!err.message.includes('tok-1234567890'));
  const safe = safeErrorMessage(raw);
  assert.ok(!safe.includes('tok-1234567890'));
});

// ---------------------------------------------------------------------------
// Slice plan, host filter boundary, aggregation constraints, selection key
// ---------------------------------------------------------------------------

test('escapeRe2 escapes regex metacharacters', () => {
  assert.equal(escapeRe2('cubxxw.com'), 'cubxxw\\.com');
  assert.equal(escapeRe2('a.b+c(d)[e]{f}|g^h$i*j?k\\l'), 'a\\.b\\+c\\(d\\)\\[e\\]\\{f\\}\\|g\\^h\\$i\\*j\\?k\\\\l');
});

test('host filter matches only exact cubxxw.com with a path boundary', () => {
  const pattern = new RegExp(hostFilterPattern('cubxxw.com'));
  assert.equal(hostFilterPattern('cubxxw.com'), '^https?://cubxxw\\.com/');
  for (const good of [
    'https://cubxxw.com/',
    'https://cubxxw.com/engineering/posts/go-release-tools/',
    'https://cubxxw.com/zh',
    'http://cubxxw.com/x',            // hostname scope includes HTTP origins
  ]) {
    assert.ok(pattern.test(good), `should match ${good}`);
  }
  for (const bad of [
    'https://www.cubxxw.com/x',        // subdomain-ish alias
    'https://sub.cubxxw.com/x',        // subdomain
    'https://cubxxw.com.evil.com/x',   // lookalike suffix
    'https://cubxxw.computer/x',       // lookalike TLD/host
    'https://cubxxwcom/x',             // unescaped-dot failure mode
    'https://evil-cubxxw.com/x',
    'https://cubxxw.com',              // no path boundary (documented caveat)
  ]) {
    assert.ok(!pattern.test(bad), `should not match ${bad}`);
  }
});

test('aggregation constraints: byProperty is refused with a page filter', () => {
  const pageFilter = [hostFilterPattern('cubxxw.com') && {
    groupType: 'and',
    filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https://cubxxw\\.com/' }],
  }];
  assert.ok(hasPageFilter(pageFilter));
  assert.throws(
    () => validateAggregationRequest({ aggregationType: 'byProperty', filterGroups: pageFilter, slice: 'blog_date_totals' }),
    /byPage semantics and cannot be called property totals/,
  );
  validateAggregationRequest({ aggregationType: 'byPage', filterGroups: pageFilter, slice: 'blog_date_totals' });
  validateAggregationRequest({ aggregationType: 'byProperty', filterGroups: [], slice: 'date_totals' });
});

test('slice plan: property totals unfiltered; blog slices host-filtered byPage', () => {
  const plan = slicePlan({ host: 'cubxxw.com' });
  const byName = Object.fromEntries(plan.map((s) => [s.name, s]));
  assert.deepEqual(Object.keys(byName).sort(), ['blog_date_query_page', 'blog_date_totals', 'date_page', 'date_totals']);

  // Independent property/date totals: no filters, property aggregation.
  assert.deepEqual(byName.date_totals.filterGroups, []);
  assert.equal(byName.date_totals.requestAggregationType, 'byProperty');

  // Hostname-filtered blog date totals use byPage — never labeled property totals.
  assert.equal(byName.blog_date_totals.requestAggregationType, 'byPage');
  assert.ok(!/property totals/.test(byName.blog_date_totals.purpose) || /NOT property totals/.test(byName.blog_date_totals.purpose));
  const blogFilters = byName.blog_date_totals.filterGroups;
  assert.equal(blogFilters[0].filters[0].operator, 'includingRegex');
  assert.equal(blogFilters[0].filters[0].expression, '^https?://cubxxw\\.com/');

  // Domain date×page keeps other hosts; request aggregation stays legacy-compatible.
  assert.deepEqual(byName.date_page.dimensions, ['date', 'page']);
  assert.equal(byName.date_page.requestAggregationType, 'auto');

  // blog date×query×page is a distinct filtered slice (no inferred landing pages).
  assert.deepEqual(byName.blog_date_query_page.dimensions, ['date', 'query', 'page']);
  assert.equal(byName.blog_date_query_page.requestAggregationType, 'byPage');

  // No synthetic device×country join anywhere in the plan.
  for (const s of plan) {
    assert.ok(!(s.dimensions.includes('device') && s.dimensions.includes('country')), `${s.name} joins device×country`);
  }
});

test('device and country cuts are explicit optional separate page-based slices', () => {
  const base = slicePlan({ host: 'cubxxw.com' });
  assert.ok(!base.some((s) => s.dimensions.includes('device') || s.dimensions.includes('country')));

  const full = slicePlan({ host: 'cubxxw.com', withDevice: true, withCountry: true });
  const device = full.find((s) => s.name === 'blog_date_page_device');
  const country = full.find((s) => s.name === 'blog_date_page_country');
  assert.ok(device && country);
  for (const s of [device, country]) {
    assert.equal(s.required, false);
    assert.ok(s.dimensions.includes('page'), `${s.name} must be page-based`);
    assert.equal(s.requestAggregationType, 'byPage');
    assert.ok(hasPageFilter(s.filterGroups));
  }
  assert.deepEqual(device.dimensions, ['date', 'page', 'device']);
  assert.deepEqual(country.dimensions, ['date', 'page', 'country']);
});

test('semantic selection key covers request context + slice + day only', () => {
  const spec = slicePlan({ host: 'cubxxw.com' }).find((s) => s.name === 'date_page');
  const ctxA = requestContext({ property: 'sc-domain:cubxxw.com', sliceSpec: spec });
  // Key stability under object key order.
  const ctxB = {
    slice: 'date_page',
    requestAggregationType: 'auto',
    filters: [],
    dimensions: ['date', 'page'],
    dataState: 'final',
    searchType: 'web',
    property: 'sc-domain:cubxxw.com',
  };
  const keyA = selectionKey(ctxA, '2026-08-24');
  assert.equal(keyA, selectionKey(ctxB, '2026-08-24'));
  assert.notEqual(keyA, selectionKey(ctxA, '2026-08-25'), 'day must partition');
  assert.notEqual(keyA, selectionKey({ ...ctxA, slice: 'blog_date_totals' }, '2026-08-24'), 'slice must partition');
  assert.notEqual(keyA, selectionKey({ ...ctxA, property: 'sc-domain:example.com' }, '2026-08-24'), 'property must partition');
  assert.notEqual(keyA, selectionKey({ ...ctxA, requestAggregationType: 'byPage' }, '2026-08-24'), 'aggregation must partition');
  assert.notEqual(keyA, selectionKey({ ...ctxA, searchType: 'image' }, '2026-08-24'), 'search type must partition');
  assert.notEqual(keyA, selectionKey({ ...ctxA, dimensions: ['date'] }, '2026-08-24'), 'dimensions must partition');
  assert.notEqual(
    keyA,
    selectionKey({ ...ctxA, filters: normalizeFilterGroups([{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^x' }] }]) }, '2026-08-24'),
    'filters must partition',
  );
  // Window/rowLimit/startRow are provenance, not keys: body differences do not change identity.
  const body1 = buildSearchAnalyticsBody({ context: ctxA, day: '2026-08-24', startRow: 0, rowLimit: 5000 });
  const body2 = buildSearchAnalyticsBody({ context: ctxA, day: '2026-08-24', startRow: 25000, rowLimit: 25000 });
  assert.equal(selectionKey(ctxA, '2026-08-24'), selectionKey(ctxA, '2026-08-24'));
  assert.equal(body1.startDate, body2.startDate);
  assert.equal(body1.endDate, body2.endDate);
  assert.equal(body2.startRow, 25000);
});

test('buildSearchAnalyticsBody enforces rowLimit bounds and body shape', () => {
  const spec = slicePlan({ host: 'cubxxw.com' }).find((s) => s.name === 'blog_date_query_page');
  const ctx = requestContext({ property: 'sc-domain:cubxxw.com', sliceSpec: spec });
  const body = buildSearchAnalyticsBody({ context: ctx, day: '2026-09-18', startRow: 25000 });
  assert.deepEqual(body.dimensions, ['date', 'query', 'page']);
  assert.equal(body.rowLimit, 25000);
  assert.equal(body.dataState, 'final');
  assert.equal(body.aggregationType, 'byPage');
  assert.equal(body.dimensionFilterGroups[0].filters[0].expression, '^https?://cubxxw\\.com/');
  assert.equal(body.type, 'web'); // explicit search type matches the recorded contract
  assert.throws(() => buildSearchAnalyticsBody({ context: ctx, day: '2026-09-18', rowLimit: 25001 }), /rowLimit/);
  assert.throws(() => buildSearchAnalyticsBody({ context: ctx, day: '2026-09-18', startRow: -1 }), /startRow/);
});

// ---------------------------------------------------------------------------
// Pagination, completeness and failure evidence (mock transport — never Google)
// ---------------------------------------------------------------------------

import {
  fetchSliceDay,
  getAccessToken,
  httpPost,
  postSearchAnalytics,
  probeAvailability,
} from './lib/gsc-client.mjs';
import { generateKeyPairSync } from 'node:crypto';

const noopSleep = async () => {};

function fakeResponse(status, jsonBody) {
  const bad = jsonBody instanceof Error;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (bad) throw jsonBody;
      return jsonBody;
    },
    text: async () => (bad ? 'not-json<<<' : JSON.stringify(jsonBody)),
  };
}

function row(day, extraKeys, clicks, impressions, position) {
  return { keys: [day, ...extraKeys], clicks, impressions, ctr: impressions ? clicks / impressions : 0, position };
}

function scriptedFetch(pages) {
  const calls = [];
  let i = 0;
  const fetchImpl = async (url, init) => {
    let body = init.body;
    try { body = JSON.parse(init.body); } catch { /* form-encoded bodies stay as text */ }
    calls.push({ url, init, body });
    const step = pages[Math.min(i, pages.length - 1)];
    i += 1;
    if (typeof step === 'function') return step(init, calls.length);
    return fakeResponse(step.status ?? 200, step.body ?? step);
  };
  return { fetchImpl, calls };
}

const datePageContext = {
  property: 'sc-domain:cubxxw.com',
  searchType: 'web',
  dataState: 'final',
  dimensions: ['date', 'page'],
  filters: [],
  requestAggregationType: 'auto',
  slice: 'date_page',
};

test('pagination: full first page + next rows + terminal short page', async () => {
  const { fetchImpl, calls } = scriptedFetch([
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/a'], 1, 10, 5), row('2026-09-18', ['https://cubxxw.com/b'], 0, 4, 9)], responseAggregationType: 'byPage' } },
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/c'], 2, 7, 3)], responseAggregationType: 'byPage' } },
  ]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    siteUrl: 'sc-domain:cubxxw.com',
    rowLimit: 2,
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.rows.length, 3);
  assert.equal(result.response.pages, 2);
  assert.deepEqual(result.request.startRows, [0, 2]);
  assert.deepEqual(result.response.pageRowCounts, [2, 1]);
  assert.equal(result.response.terminator, 'short-page');
  assert.equal(result.response.responseAggregationType, 'byPage');
  assert.equal(result.truncated, false);
  assert.equal(result.conflict, null);
  // one date at a time
  assert.equal(calls[0].body.startDate, '2026-09-18');
  assert.equal(calls[0].body.endDate, '2026-09-18');
  assert.equal(calls[0].body.startRow, 0);
  assert.equal(calls[1].body.startRow, 2);
});

test('pagination: exact multiple ends on terminal empty page', async () => {
  const { fetchImpl, calls } = scriptedFetch([
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/a'], 1, 2, 3)], responseAggregationType: 'byPage' } },
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/b'], 1, 2, 3)], responseAggregationType: 'byPage' } },
    { body: { rows: [], responseAggregationType: 'byPage' } },
  ]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.rows.length, 2);
  assert.equal(result.response.pages, 3);
  assert.equal(result.response.terminator, 'empty-page');
  assert.deepEqual(result.response.pageRowCounts, [1, 1, 0]);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].body.startRow, 2);
});

test('pagination at the API row limit (25,000) pages via startRow', async () => {
  const page = Array.from({ length: 25000 }, (_, i) => row('2026-09-18', [`https://cubxxw.com/p${i}`], 0, 1, 7));
  const { fetchImpl, calls } = scriptedFetch([
    { body: { rows: page, responseAggregationType: 'byPage' } },
    { body: { rows: [], responseAggregationType: 'byPage' } },
  ]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.rows.length, 25000);
  assert.equal(result.response.terminator, 'empty-page');
  assert.deepEqual(result.request.startRows, [0, 25000]);
  assert.equal(calls[1].body.startRow, 25000);
  assert.equal(calls[1].body.rowLimit, 25000);
  assert.ok(result.warnings.some((w) => w.startsWith('possible-internal-row-cap')));
});

test('pagination: malformed responses fail the slice with parse evidence', async () => {
  for (const step of [
    { status: 200, body: { rows: null } }, // explicit null rows are malformed
    { status: 200, body: { rows: 'nope' } },
    { status: 200, body: { rows: [{ clicks: 1, impressions: 2 }] } },
    { status: 200, body: new SyntaxError('Unexpected token < in JSON') },
  ]) {
    const { fetchImpl } = scriptedFetch([step]);
    const result = await fetchSliceDay({
      context: datePageContext,
      day: '2026-09-18',
      token: 't',
      deps: { fetchImpl, sleep: noopSleep },
    });
    assert.equal(result.status, 'failed', JSON.stringify(step).slice(0, 60));
    assert.equal(result.error.kind, 'parse');
    assert.equal(result.rows.length, 0);
  }
});

test('pagination: safety cap marks truncation, never a full day', async () => {
  const makeFetch = () => {
    let n = 0;
    return async () => {
      n += 1;
      return fakeResponse(200, { rows: [row('2026-09-18', [`https://cubxxw.com/page-${n}`], 1, 1, 1)], responseAggregationType: 'byPage' });
    };
  };
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    maxPages: 2,
    deps: { fetchImpl: makeFetch(), sleep: noopSleep },
  });
  assert.equal(result.status, 'truncated');
  assert.equal(result.truncated, true);
  assert.equal(result.response.terminator, 'safety-cap');
  assert.equal(result.response.pages, 2);
  assert.ok(result.warnings.some((w) => w.startsWith('row-cap-reached')));
});

test('pagination: second-page failure keeps partial rows and never claims a full day', async () => {
  const { fetchImpl } = scriptedFetch([
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/a'], 1, 5, 4)], responseAggregationType: 'byPage' } },
    { status: 500, body: { error: 'boom' } },
  ]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    deps: { fetchImpl, sleep: noopSleep, retries: 1 },
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.rows.length, 1); // first page preserved…
  assert.ok(result.error); // …but the day is incomplete and must not replace a complete day
  assert.equal(result.response.terminator, 'failed-page');
  assert.equal(result.response.pages, 1);
});

test('pagination: duplicate dimension keys across pages mark conflict, not a falsely complete sum', async () => {
  const dup = row('2026-09-18', ['https://cubxxw.com/a'], 1, 5, 4);
  const { fetchImpl } = scriptedFetch([
    { body: { rows: [dup], responseAggregationType: 'byPage' } },
    { body: { rows: [{ ...dup, clicks: 9 }], responseAggregationType: 'byPage' } },
  ]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.conflict.kind, 'duplicate-dimension-keys-across-pages');
  assert.equal(result.rows.length, 1); // duplicate row not summed in
  assert.equal(result.response.terminator, 'conflict');
});

test('pagination: changing responseAggregationType across pages marks conflict/incomplete', async () => {
  const { fetchImpl } = scriptedFetch([
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/a'], 1, 5, 4)], responseAggregationType: 'byProperty' } },
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/b'], 1, 5, 4)], responseAggregationType: 'byPage' } },
  ]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.conflict.kind, 'response-aggregation-type-changed');
  assert.deepEqual(result.response.aggregationTypesSeen, ['byProperty', 'byPage']);
});

test('successful empty is a distinct observed state, not failure', async () => {
  const { fetchImpl } = scriptedFetch([{ body: { rows: [], responseAggregationType: 'byPage' } }]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(result.status, 'empty');
  assert.equal(result.response.terminator, 'empty-page');
  assert.equal(result.error, null);
});

// ---------------------------------------------------------------------------
// Retry budgets and timeouts — bounded, injected timers/sleep, no real waiting
// ---------------------------------------------------------------------------

test('transient 5xx responses retry within budget and then succeed', async () => {
  const delays = [];
  const { fetchImpl, calls } = scriptedFetch([
    { status: 503, body: { error: 'backend' } },
    { status: 429, body: { error: 'rate' } },
    { status: 200, body: { ok: 1 } },
  ]);
  const res = await httpPost({
    url: 'https://example.invalid/x',
    body: '{}',
    fetchImpl,
    sleep: async (ms) => { delays.push(ms); },
    retries: 2,
  });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 3);
  assert.deepEqual(delays, [1000, 2000]); // bounded backoff, no real waiting
});

test('retry budget is bounded: exhausted transient failures stop clearly', async () => {
  const { fetchImpl, calls } = scriptedFetch([{ status: 503, body: {} }]);
  await assert.rejects(
    () => httpPost({ url: 'https://example.invalid/x', body: '{}', fetchImpl, sleep: noopSleep, retries: 2 }),
    (err) => err instanceof GscError && /attempt 3\/3/.test(err.message),
  );
  assert.equal(calls.length, 3); // never unbounded
});

test('timeouts abort via injected timers and never wait in real time', async () => {
  const hangingFetch = (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
  await assert.rejects(
    () => httpPost({
      url: 'https://example.invalid/x',
      body: '{}',
      fetchImpl: hangingFetch,
      sleep: noopSleep,
      retries: 1,
      timeoutMs: 1,
      setTimer: (cb) => { queueMicrotask(cb); return 1; },
      clearTimer: () => {},
    }),
    (err) => err instanceof GscError && /category: timeout/.test(err.message) && /deadline: 1ms/.test(err.message) && /attempt 2\/2/.test(err.message),
  );
});

// ---------------------------------------------------------------------------
// Safe failure logs (mock credentials — nothing real exists in tests)
// ---------------------------------------------------------------------------

test('auth failure is clear and never prints tokens, keys or endpoint queries', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const saJson = JSON.stringify({ client_email: 'sa@example.iam.gserviceaccount.com', private_key: privateKey });
  const mockToken = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJt-b3NrLXRva2Vu-pYXlsb2Fk.sigpart-abcdefghijklmnop';
  const { fetchImpl, calls } = scriptedFetch([
    { status: 400, body: { error: 'invalid_grant', assertion_echo: `assertion=${mockToken}`, detail: saJson } },
  ]);
  await assert.rejects(
    () => getAccessToken({ serviceAccountJson: saJson, deps: { fetchImpl, sleep: noopSleep } }),
    (err) => {
      assert.ok(err instanceof GscError);
      assert.equal(err.kind, 'auth');
      assert.match(err.message, /Authentication failed: OAuth token exchange returned HTTP 400/);
      for (const secret of ['b3NrLXRva2Vu', 'MIIE', 'BEGIN PRIVATE KEY', 'sa@example', '?grant_type', 'assertion=']) {
        assert.ok(!err.message.includes(secret), `leaked ${secret}: ${err.message}`);
      }
      return true;
    },
  );
  // The request itself carries the assertion, but logs/URLs never do.
  assert.ok(calls[0].init.body.includes('assertion='));
  assert.ok(!calls[0].url.includes('assertion='));
});

test('Search Analytics auth/transport errors are redacted and scoped', async () => {
  const { fetchImpl } = scriptedFetch([
    { status: 403, body: { error: { message: 'Bearer ya29.c2VjcmV0LXRva2Vu', status: 'PERMISSION_DENIED' } } },
  ]);
  await assert.rejects(
    () => postSearchAnalytics({ token: 'mock-token-value', siteUrl: 'sc-domain:cubxxw.com', body: { dimensions: ['date'], startDate: '2026-09-18' }, deps: { fetchImpl, sleep: noopSleep } }),
    (err) => {
      assert.equal(err.kind, 'auth');
      assert.ok(!err.message.includes('c2VjcmV0LXRva2Vu'));
      assert.ok(!err.message.includes('mock-token-value'));
      assert.ok(!err.message.includes('?'));
      return true;
    },
  );
});

test('service-account parsing rejects bad blobs without echoing them', async () => {
  for (const bad of ['', 'not-json{{', '{"client_email":"a@b"}', '{}']) {
    await assert.rejects(
      () => getAccessToken({ serviceAccountJson: bad, deps: { fetchImpl: async () => fakeResponse(200, {}) } }),
      (err) => err instanceof GscError && err.kind === 'auth' && !err.message.includes('not-json{{'),
    );
  }
});

// ---------------------------------------------------------------------------
// Availability probe (bounded recent-date window, independent of transport)
// ---------------------------------------------------------------------------

test('availability probe records observed cutoff over the bounded 10-day window', async () => {
  const dates = Array.from({ length: 10 }, (_, i) => `2026-09-${String(11 + i).padStart(2, '0')}`);
  const { fetchImpl, calls } = scriptedFetch([
    { body: { rows: dates.slice(0, 7).map((d) => ({ keys: [d], clicks: 1, impressions: 2, ctr: 0.5, position: 3 })), responseAggregationType: 'byProperty' } },
  ]);
  const probe = await probeAvailability({ siteUrl: 'sc-domain:cubxxw.com', dates, token: 't', deps: { fetchImpl, sleep: noopSleep } });
  assert.equal(probe.status, 'observed');
  assert.deepEqual(probe.probeWindow, { start: '2026-09-11', end: '2026-09-20' });
  assert.equal(probe.availableThrough, '2026-09-17');
  assert.equal(probe.observedDates.length, 7);
  assert.equal(calls[0].body.dimensions[0], 'date');
  assert.equal(calls[0].body.type, 'web'); // explicit search type in the probe too
});

test('availability probe failure yields unknown availability, not a fake cutoff', async () => {
  const { fetchImpl } = scriptedFetch([{ status: 500, body: {} }]);
  const probe = await probeAvailability({
    siteUrl: 'sc-domain:cubxxw.com',
    dates: ['2026-09-11', '2026-09-20'],
    token: 't',
    deps: { fetchImpl, sleep: noopSleep, retries: 0 },
  });
  assert.equal(probe.status, 'unknown');
  assert.equal(probe.availableThrough, null);
  assert.ok(probe.error);
});


// ---------------------------------------------------------------------------
// Collector CLI: args, persistence, run status (injected deps — no Google)
// ---------------------------------------------------------------------------

import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { main, parseCliArgs, runFetch } from './gsc-fetch.mjs';
import { atomicWriteJson, pickSnapshotPath } from './lib/gsc-persist.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TMP_ROOT = join(REPO_ROOT, '.tmp-gsc-tests');
const SA_JSON = JSON.stringify({
  client_email: 'mock-sa@example.iam.gserviceaccount.com',
  private_key: generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey,
});

test('parseCliArgs: strict lookback, ranges and flags', () => {
  assert.equal(parseCliArgs(['--lookback', '27']).lookback, 27);
  assert.equal(parseCliArgs(['--lookback', '55']).lookback, 55);
  assert.deepEqual(
    { ...parseCliArgs(['--start', '2026-07-27', '--end', '2026-09-20']) },
    { ...parseCliArgs(['--start', '2026-07-27', '--end', '2026-09-20']) },
  );
  const opts = parseCliArgs(['--start', '2026-07-27', '--end', '2026-09-20', '--with-device', '--with-country', '--dry-run']);
  assert.equal(opts.explicitRange, true);
  assert.equal(opts.withDevice, true);
  assert.equal(opts.withCountry, true);
  assert.equal(opts.dryRun, true);

  assert.throws(() => parseCliArgs(['--lookback', '-1']), /Invalid --lookback/);
  assert.throws(() => parseCliArgs(['--lookback', 'NaN']), /Invalid --lookback/);
  assert.throws(() => parseCliArgs(['--lookback', '27x']), /Invalid --lookback/);
  assert.throws(() => parseCliArgs(['--start', '2026-02-30', '--end', '2026-03-05']), /not a real calendar date/);
  assert.throws(() => parseCliArgs(['--start', '2026-09-20x', '--end', '2026-09-20']), /Invalid --start/);
  assert.throws(() => parseCliArgs(['--start', '2026-09-20']), /must be used together/);
  assert.throws(() => parseCliArgs(['--lookback', '2', '--start', '2026-09-18', '--end', '2026-09-20']), /cannot be combined/);
  assert.throws(() => parseCliArgs(['--nope']), /Unknown argument/);
  assert.throws(() => parseCliArgs(['--out']), /Missing value for --out/);
});

test('pickSnapshotPath: conventional name, append-only same-day rerun, never overwrite --out', () => {
  const now = new Date('2026-09-24T10:45:02.123Z');
  assert.equal(
    pickSnapshotPath({ runDate: '2026-09-24', dir: 'data/seo', now, exists: () => false, random: () => 'abc123' }),
    'data/seo/gsc-2026-09-24.json',
  );
  // same-day rerun gets a unique UTC-time + collision-safe suffix
  const existing = new Set(['data/seo/gsc-2026-09-24.json']);
  const suffixed = pickSnapshotPath({ runDate: '2026-09-24', dir: 'data/seo', now, exists: (p) => existing.has(p), random: () => 'abc123' });
  assert.match(suffixed, /^data\/seo\/gsc-2026-09-24-104502123Z-abc123\.json$/);
  // collision-safe: colliding suffixes are retried
  let n = 0;
  const seq = ['aaaa', 'aaaa', 'bbbb'];
  const colliding = pickSnapshotPath({
    runDate: '2026-09-24',
    dir: 'data/seo',
    now,
    exists: (p) => p === 'data/seo/gsc-2026-09-24.json' || p.endsWith('-aaaa.json'),
    random: () => seq[n++],
  });
  assert.match(colliding, /bbbb\.json$/);
  // explicit --out is never overwritten
  assert.throws(
    () => pickSnapshotPath({ runDate: '2026-09-24', out: 'out.json', now, exists: (p) => p === 'out.json' }),
    /Refusing to overwrite existing --out out\.json/,
  );
  assert.equal(
    pickSnapshotPath({ runDate: '2026-09-24', out: 'out.json', now, exists: () => false, random: () => 'abc123' }),
    'out.json',
  );
});

test('atomicWriteJson: full JSON, invisible interruption, no-clobber publication', () => {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'atomic-'));
  try {
    const target = join(dir, 'snap.json');
    atomicWriteJson(target, { a: 1 }, {});
    assert.equal(readFileSync(target, 'utf8'), '{\n  "a": 1\n}\n');

    // interruption between temp write and publish: destination untouched, our temp cleaned
    const interrupted = join(dir, 'interrupted.json');
    const written = [];
    const removed = [];
    const failingFs = {
      mkdirSync: () => {},
      writeFileSync: (p) => written.push(p),
      linkSync: () => {
        const err = new Error('simulated crash during link');
        err.code = 'EACCES';
        throw err;
      },
      unlinkSync: (p) => removed.push(p),
    };
    assert.throws(
      () => atomicWriteJson(interrupted, { b: 2 }, { fs: failingFs, random: () => 'ffff' }),
      (err) => /Failed to publish .*category io \(code EACCES\)/.test(err.message),
    );
    assert.ok(!existsSync(interrupted), 'destination must not exist after interrupted write');
    assert.equal(written.length, 1);
    assert.deepEqual(removed, written, 'our temp file cleaned up');

    // exclusive temp create failed: the tmp path was never ours — never cleaned up
    const removed2 = [];
    const failingWriteFs = {
      mkdirSync: () => {},
      writeFileSync: () => {
        const err = new Error('disk full');
        err.code = 'ENOSPC';
        throw err;
      },
      linkSync: () => {},
      unlinkSync: (p) => removed2.push(p),
    };
    assert.throws(
      () => atomicWriteJson(join(dir, 'never.json'), { c: 3 }, { fs: failingWriteFs, random: () => 'eeee' }),
      (err) => err.kind === 'io' && /Failed to write .*code ENOSPC/.test(err.message),
    );
    assert.deepEqual(removed2, [], 'a tmp path we failed to create exclusively is never cleaned up');
    assert.ok(!existsSync(join(dir, 'never.json')));

    // exclusive temp create collision: a foreign tmp file is left untouched
    const foreignTmp = join(dir, 'taken.json.tmp-abc');
    writeFileSync(foreignTmp, 'foreign\n');
    assert.throws(
      () => atomicWriteJson(join(dir, 'taken.json'), { d: 4 }, { random: () => 'abc' }),
      (err) => err.code === 'EEXIST' && /Temp path .*left untouched/.test(err.message),
    );
    assert.equal(readFileSync(foreignTmp, 'utf8'), 'foreign\n');
    rmSync(foreignTmp);

    // path-preexists / competing writers: prior evidence is never replaced
    const existing = join(dir, 'existing.json');
    writeFileSync(existing, 'prior evidence\n');
    assert.throws(
      () => atomicWriteJson(existing, { e: 5 }, { random: () => 'ab12' }),
      (err) => err.code === 'EEXIST' && /Refusing to overwrite existing/.test(err.message),
    );
    assert.equal(readFileSync(existing, 'utf8'), 'prior evidence\n');

    const race = join(dir, 'race.json');
    atomicWriteJson(race, { winner: 'A' }, { random: () => 'aa11' });
    assert.throws(() => atomicWriteJson(race, { winner: 'B' }, { random: () => 'bb22' }), (err) => err.code === 'EEXIST');
    assert.equal(JSON.parse(readFileSync(race, 'utf8')).winner, 'A');
    assert.deepEqual(readdirSync(dir).filter((f) => f.includes('.tmp-')), [], 'no orphan temp files after collisions');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function runFetchMock({ rowsFor, probeImpl, tokenImpl } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
    const u = String(url);
    if (u.includes('oauth2.googleapis.com')) {
      calls.push({ kind: 'token' });
      return tokenImpl ? tokenImpl(json) : json(200, { access_token: 'mock-access-token' });
    }
    const body = JSON.parse(init.body);
    const isProbe = body.dimensions.length === 1 && body.dimensions[0] === 'date' && body.startDate !== body.endDate;
    calls.push({ kind: isProbe ? 'probe' : 'query', body });
    if (isProbe && probeImpl) return probeImpl(body, json);
    const out = rowsFor ? rowsFor(body, isProbe, json) : [];
    if (out && out.errorStatus) return json(out.errorStatus, { error: 'mock failure' });
    return json(200, { rows: out, responseAggregationType: body.aggregationType === 'byProperty' ? 'byProperty' : 'byPage' });
  };
  return { fetchImpl, calls };
}

function mockRows(body) {
  return [
    {
      keys: [body.startDate, ...body.dimensions.slice(1).map((dim) => (dim === 'page' ? 'https://cubxxw.com/mock-page/' : dim === 'query' ? 'mock query' : 'MOCK'))],
      clicks: 1,
      impressions: 2,
      ctr: 0.5,
      position: 3,
    },
  ];
}

function probeRowsAllDays(body) {
  const rows = [];
  for (let d = new Date(`${body.startDate}T00:00:00Z`); d <= new Date(`${body.endDate}T00:00:00Z`); d = new Date(d.getTime() + 86400000)) {
    rows.push({ keys: [d.toISOString().slice(0, 10)], clicks: 1, impressions: 2, ctr: 0.5, position: 3 });
  }
  return rows;
}

async function collect(args, mock, { now = new Date('2026-09-24T12:00:00Z'), env = {} } = {}) {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'run-'));
  const logs = [];
  const warns = [];
  const errors = [];
  const options = parseCliArgs([...args, '--dir', dir]);
  try {
    const result = await runFetch(options, {
      fetchImpl: mock.fetchImpl,
      now,
      sleep: noopSleep,
      env: { GSC_SERVICE_ACCOUNT_JSON: SA_JSON, GSC_SITE_URL: 'sc-domain:cubxxw.com', ...env },
      log: (m) => logs.push(String(m)),
      warn: (m) => warns.push(String(m)),
      errorLog: (m) => errors.push(String(m)),
    });
    return { result, logs, warns, errors, dir };
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

test('runFetch: explicit metadata and per-slice/per-day scope on success', async () => {
  const mock = runFetchMock({
    rowsFor: mockRows,
    probeImpl: (body, json) => json(200, { rows: probeRowsAllDays(body), responseAggregationType: 'byProperty' }),
  });
  const { result, dir } = await collect(['--start', '2026-09-18', '--end', '2026-09-20'], mock);
  try {
    assert.equal(result.exitCode, 0);
    const snapshot = JSON.parse(readFileSync(result.path, 'utf8'));
    const meta = snapshot.meta;
    assert.equal(snapshot.schema, 'gsc-snapshot/2');
    assert.equal(meta.property, 'sc-domain:cubxxw.com');
    assert.deepEqual(meta.hostnameScope.filterPattern, '^https?://cubxxw\\.com/');
    assert.equal(meta.searchType, 'web');
    assert.equal(meta.dataState, 'final');
    assert.equal(meta.dataTimezone, 'America/Los_Angeles');
    assert.match(meta.fetchedAt, /Z$/);
    assert.equal(meta.runDate, '2026-09-24');
    assert.deepEqual(meta.requestWindow, { start: '2026-09-18', end: '2026-09-20' });
    assert.equal(meta.runStatus, 'ok');

    const byName = Object.fromEntries(snapshot.slices.map((s) => [s.name, s]));
    assert.deepEqual(Object.keys(byName).sort(), ['blog_date_query_page', 'blog_date_totals', 'date_page', 'date_totals']);
    for (const s of snapshot.slices) {
      assert.ok(Array.isArray(s.dimensions) && s.dimensions.length > 0, 'ordered dimensions recorded');
      assert.ok(Array.isArray(s.filterGroups), 'actual filter groups recorded');
      assert.ok(['auto', 'byProperty', 'byPage'].includes(s.requestAggregationType), 'aggregationType recorded');
      assert.deepEqual(Object.keys(s.days).sort(), ['2026-09-18', '2026-09-19', '2026-09-20']);
    }
    assert.equal(byName.date_totals.requestAggregationType, 'byProperty');
    assert.deepEqual(byName.date_totals.filterGroups, []);
    assert.equal(byName.blog_date_totals.filterGroups[0].filters[0].expression, '^https?://cubxxw\\.com/');
    assert.equal(byName.blog_date_query_page.requestAggregationType, 'byPage');
    for (const s of snapshot.slices) {
      for (const d of Object.values(s.days)) {
        assert.equal(d.status, 'complete');
        assert.equal(d.availability, 'available');
        assert.ok(d.request.startRows.length >= 1);
        assert.ok(d.response.terminator);
      }
    }
    assert.equal(meta.availability.status, 'observed');
    assert.equal(meta.availability.availableThrough, '2026-09-24');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: empty days past the availability cutoff are unavailable-unknown, never complete-zero', async () => {
  // probe succeeds with rows only through 2026-09-17; slice days are all past the cutoff
  const mock2 = runFetchMock({
    rowsFor: () => [],
    probeImpl: (body, json) => {
      const rows = ['2026-09-15', '2026-09-16', '2026-09-17'].map((d) => ({ keys: [d], clicks: 1, impressions: 1, ctr: 1, position: 1 }));
      return json(200, { rows, responseAggregationType: 'byProperty' });
    },
  });
  const { result, dir } = await collect(['--start', '2026-09-18', '--end', '2026-09-20'], mock2);
  try {
    assert.equal(result.exitCode, 0);
    const snapshot = JSON.parse(readFileSync(result.path, 'utf8'));
    assert.equal(snapshot.meta.availability.availableThrough, '2026-09-17');
    for (const s of snapshot.slices) {
      for (const d of Object.values(s.days)) {
        assert.equal(d.status, 'empty'); // observed successful empty response
        assert.equal(d.availability, 'unavailable-unknown'); // past the observed cutoff
        assert.equal(d.rows.length, 0);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: available-day empty blog response is observed empty on an available date', async () => {
  const mock = runFetchMock({
    rowsFor: (body) => (body.dimensionFilterGroups ? [] : mockRows(body)), // blog slices empty, property slices have rows
    probeImpl: (body, json) => json(200, { rows: probeRowsAllDays(body), responseAggregationType: 'byProperty' }),
  });
  const { result, dir } = await collect(['--start', '2026-09-18', '--end', '2026-09-20'], mock);
  try {
    const snapshot = JSON.parse(readFileSync(result.path, 'utf8'));
    const blogQuery = snapshot.slices.find((s) => s.name === 'blog_date_query_page');
    for (const d of Object.values(blogQuery.days)) {
      assert.equal(d.status, 'empty');
      assert.equal(d.availability, 'available');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: required slice failure persists a status artifact and exits non-zero', async () => {
  const mock = runFetchMock({
    rowsFor: (body) => (body.dimensions.join() === 'date,query,page' ? { errorStatus: 500 } : mockRows(body)),
  });
  const { result, dir, errors } = await collect(['--start', '2026-09-18', '--end', '2026-09-20'], mock);
  try {
    assert.equal(result.exitCode, 1);
    assert.ok(result.path, 'status artifact persisted');
    const snapshot = JSON.parse(readFileSync(result.path, 'utf8'));
    assert.equal(snapshot.meta.runStatus, 'partial');
    const slice = snapshot.slices.find((s) => s.name === 'blog_date_query_page');
    for (const d of Object.values(slice.days)) {
      assert.equal(d.status, 'failed');
      assert.equal(d.error.kind, 'transport');
    }
    assert.ok(errors.some((e) => /incomplete/.test(e)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: optional slice failures are explicit degradation, not success silence', async () => {
  const mock = runFetchMock({
    rowsFor: (body) => (body.dimensions.includes('device') ? { errorStatus: 500 } : mockRows(body)),
  });
  const { result, dir, warns } = await collect(['--start', '2026-09-18', '--end', '2026-09-20', '--with-device'], mock);
  try {
    assert.equal(result.exitCode, 0);
    const snapshot = JSON.parse(readFileSync(result.path, 'utf8'));
    assert.equal(snapshot.meta.runStatus, 'degraded');
    const slice = snapshot.slices.find((s) => s.name === 'blog_date_page_device');
    assert.equal(slice.required, false);
    for (const d of Object.values(slice.days)) assert.equal(d.status, 'failed');
    assert.ok(warns.some((w) => /degraded/.test(w)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: total auth failure leaves evidence and exits non-zero without secrets', async () => {
  const mock = runFetchMock({
    tokenImpl: (json) => json(400, { error: 'invalid_grant', echo: 'assertion=eyJhbGciOiJSUzI1NiJ9.eyJmb28iOiJiYXIifQ.c2lnLXZhbA' }),
  });
  const { result, dir, errors } = await collect(['--start', '2026-09-18', '--end', '2026-09-20'], mock);
  try {
    assert.equal(result.exitCode, 1);
    assert.equal(result.snapshot.meta.runStatus, 'failed');
    assert.ok(result.path, 'status artifact persisted');
    const raw = readFileSync(result.path, 'utf8');
    assert.ok(!raw.includes('assertion='));
    assert.ok(!raw.includes('eyJhbGci'));
    assert.ok(!raw.includes('PRIVATE KEY'));
    assert.ok(errors.some((e) => /Authentication failed/.test(e) && !e.includes('eyJhbGci')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: availability probe failure is unknown availability, independent of transport success', async () => {
  const mock = runFetchMock({
    rowsFor: mockRows,
    probeImpl: (body, json) => json(500, { error: 'probe down' }),
  });
  const { result, dir, warns } = await collect(['--start', '2026-09-18', '--end', '2026-09-20'], mock);
  try {
    assert.equal(result.exitCode, 0, 'transport itself succeeded');
    const snapshot = JSON.parse(readFileSync(result.path, 'utf8'));
    assert.equal(snapshot.meta.availability.status, 'unknown');
    assert.equal(snapshot.meta.availability.availableThrough, null);
    for (const s of snapshot.slices) {
      for (const d of Object.values(s.days)) {
        assert.equal(d.status, 'complete');
        assert.equal(d.availability, 'unknown');
      }
    }
    assert.ok(warns.some((w) => /availability: unknown/.test(w)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runFetch: existing explicit --out fails before any request is made', async () => {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'out-'));
  try {
    const out = join(dir, 'existing.json');
    writeFileSync(out, 'sentinel\n');
    const mock = runFetchMock({ rowsFor: mockRows });
    const errors = [];
    const options = parseCliArgs(['--start', '2026-09-18', '--end', '2026-09-20', '--out', out]);
    const code = await main(['--start', '2026-09-18', '--end', '2026-09-20', '--out', out], {
      fetchImpl: mock.fetchImpl,
      now: new Date('2026-09-24T12:00:00Z'),
      sleep: noopSleep,
      env: { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      log: () => {},
      warn: () => {},
      errorLog: (m) => errors.push(String(m)),
    });
    assert.equal(code, 1);
    assert.ok(errors.some((e) => /Refusing to overwrite existing --out/.test(e)));
    assert.equal(readFileSync(out, 'utf8'), 'sentinel\n');
    assert.equal(mock.calls.length, 0, 'no network activity before the overwrite refusal');
    assert.equal(options.out, out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Real CLI writes (mock transport via --import): append-only persistence and
// success-evidence survival across a later failure run
// ---------------------------------------------------------------------------

const MOCK_PRELOAD_SOURCE = `
const mode = process.env.GSC_MOCK_MODE || 'ok';
const badBody = {
  error: 'invalid_grant',
  echo: 'assertion=eyJhbGciOiJSUzI1NiJ9.eyJmb28iOiJiYXIifQ.c2lnbmF0dXJlLXZhbHVl',
};
const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes('oauth2.googleapis.com')) {
    if (mode === 'auth-fail') return json(400, badBody);
    return json(200, { access_token: 'mock-access-token-value' });
  }
  const body = JSON.parse(init.body);
  const dims = body.dimensions;
  const rows = [];
  for (let d = new Date(body.startDate + 'T00:00:00Z'); d <= new Date(body.endDate + 'T00:00:00Z'); d = new Date(d.getTime() + 86400000)) {
    rows.push({
      keys: [d.toISOString().slice(0, 10), ...dims.slice(1).map((dim) => (dim === 'page' ? 'https://cubxxw.com/mocked-page/' : dim === 'query' ? 'mock query' : 'MOCK'))],
      clicks: 1,
      impressions: 2,
      ctr: 0.5,
      position: 3,
    });
  }
  return json(200, { rows, responseAggregationType: body.aggregationType === 'byProperty' ? 'byProperty' : 'byPage' });
};
`;

test('real CLI writes: two same-day runs append; later failure preserves success evidence', () => {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, 'cli-'));
  const snapDir = join(dir, 'snapshots');
  const preload = join(dir, 'mock-fetch.mjs');
  writeFileSync(preload, MOCK_PRELOAD_SOURCE);
  const baseArgs = ['--import', preload, join(REPO_ROOT, 'scripts', 'gsc-fetch.mjs'), '--start', '2026-09-18', '--end', '2026-09-20', '--dir', snapDir];
  const run = (mode, extra = []) => spawnSync(process.execPath, [...baseArgs, ...extra], {
    cwd: REPO_ROOT,
    env: { ...process.env, GSC_SERVICE_ACCOUNT_JSON: SA_JSON, GSC_MOCK_MODE: mode },
    encoding: 'utf8',
  });
  try {
    // write 1: conventional first daily filename
    const run1 = run('ok');
    assert.equal(run1.status, 0, run1.stderr);
    const files1 = readdirSync(snapDir).sort();
    assert.equal(files1.length, 1);
    assert.match(files1[0], /^gsc-\d{4}-\d{2}-\d{2}\.json$/);
    const firstBytes = readFileSync(join(snapDir, files1[0]), 'utf8');
    const first = JSON.parse(firstBytes);
    assert.equal(first.schema, 'gsc-snapshot/2');
    assert.equal(first.meta.runStatus, 'ok');

    // write 2: same-day rerun appends a unique UTC-time + collision-safe name
    const run2 = run('ok');
    assert.equal(run2.status, 0, run2.stderr);
    const files2 = readdirSync(snapDir).sort();
    assert.equal(files2.length, 2);
    const second = files2.find((f) => f !== files1[0]);
    assert.match(second, new RegExp(`^gsc-${first.meta.runDate}-\\d{9}Z-[0-9a-f]+\\.json$`));
    assert.equal(readFileSync(join(snapDir, files1[0]), 'utf8'), firstBytes, 'first snapshot untouched');

    // write 3: failure after success — non-zero exit, status artifact, evidence survives
    const run3 = run('auth-fail');
    assert.equal(run3.status, 1);
    assert.match(run3.stderr, /Authentication failed/);
    const files3 = readdirSync(snapDir).sort();
    assert.equal(files3.length, 3, 'failure still appends a status artifact');
    assert.equal(readFileSync(join(snapDir, files1[0]), 'utf8'), firstBytes, 'success evidence survives on disk');
    const failedName = files3.find((f) => !files2.includes(f));
    const failedRaw = readFileSync(join(snapDir, failedName), 'utf8');
    const failed = JSON.parse(failedRaw);
    assert.equal(failed.meta.runStatus, 'failed');
    for (const secret of ['assertion=', 'eyJhbGci', 'PRIVATE KEY', 'mock-access-token']) {
      assert.ok(!failedRaw.includes(secret), `artifact leaked ${secret}`);
      assert.ok(!(run3.stderr + run3.stdout).includes(secret), `logs leaked ${secret}`);
    }

    // explicit --out is never overwritten
    const outFile = join(dir, 'explicit.json');
    writeFileSync(outFile, 'sentinel\n');
    const run4 = run('ok', ['--out', outFile]);
    assert.equal(run4.status, 1);
    assert.match(run4.stderr, /Refusing to overwrite existing --out/);
    assert.equal(readFileSync(outFile, 'utf8'), 'sentinel\n');
    assert.equal(readdirSync(snapDir).length, 3, 'refused --out writes nothing');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Review regressions: omitted rows, whole-attempt deadlines, safe transport
// classification, boundary validation, no-clobber publishing
// ---------------------------------------------------------------------------

test('legal omitted rows normalize to successful empty (first page, terminal page, probe)', async () => {
  // first page with omitted rows -> observed successful empty
  const first = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    deps: { fetchImpl: scriptedFetch([{}]).fetchImpl, sleep: noopSleep },
  });
  assert.equal(first.status, 'empty');
  assert.equal(first.response.terminator, 'empty-page');
  assert.equal(first.error, null);

  // terminal page with omitted rows -> complete day
  const { fetchImpl } = scriptedFetch([
    { body: { rows: [row('2026-09-18', ['https://cubxxw.com/a'], 1, 1, 1)], responseAggregationType: 'byPage' } },
    {},
  ]);
  const full = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(full.status, 'complete');
  assert.equal(full.response.terminator, 'empty-page');

  // probe with omitted rows -> observed, no invented cutoff
  const probe = await probeAvailability({
    siteUrl: 'sc-domain:cubxxw.com',
    dates: ['2026-09-11', '2026-09-20'],
    token: 't',
    deps: { fetchImpl: scriptedFetch([{}]).fetchImpl, sleep: noopSleep },
  });
  assert.equal(probe.status, 'observed');
  assert.equal(probe.availableThrough, null);
  assert.deepEqual(probe.observedDates, []);
});

test('deadline covers the response body: hanging body is a transport timeout, not parse', async () => {
  let attempts = 0;
  const hangingBodyFetch = (url, init) => {
    attempts += 1;
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => new Promise((resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('body aborted'), { name: 'AbortError' }));
        if (init.signal.aborted) return abort();
        init.signal.addEventListener('abort', abort);
      }),
    });
  };
  await assert.rejects(
    () => httpPost({
      url: 'https://example.invalid/x',
      body: '{}',
      fetchImpl: hangingBodyFetch,
      sleep: noopSleep,
      retries: 1,
      timeoutMs: 5,
      setTimer: (cb) => { queueMicrotask(cb); return 1; },
      clearTimer: () => {},
    }),
    (err) => err instanceof GscError && err.kind === 'transport' && /category: timeout/.test(err.message) && !/JSON|parse/i.test(err.message),
  );
  assert.equal(attempts, 2, 'body timeout uses the same bounded retry budget');
});

test('unlabeled opaque tokens in transport exceptions are never interpolated', async () => {
  const codedThrower = () => {
    const e = new Error('connect reset with opaque-token-9f8e7d6c');
    e.code = 'ECONNRESET';
    throw e;
  };
  await assert.rejects(
    () => httpPost({ url: 'https://example.invalid/x', body: '{}', fetchImpl: codedThrower, sleep: noopSleep, retries: 0 }),
    (err) => {
      assert.ok(!err.message.includes('opaque-token-9f8e7d6c'));
      assert.match(err.message, /category: network-error/);
      assert.match(err.message, /code: ECONNRESET/);
      return true;
    },
  );
  const plainThrower = () => {
    throw new Error('opaque-token-9f8e7d6c');
  };
  await assert.rejects(
    () => httpPost({ url: 'https://example.invalid/x', body: '{}', fetchImpl: plainThrower, sleep: noopSleep, retries: 0 }),
    (err) => !err.message.includes('opaque-token-9f8e7d6c') && /code: unspecified/.test(err.message),
  );
});

test('exhausted transient HTTP failures keep their status and kind', async () => {
  const { fetchImpl } = scriptedFetch([{ status: 503, body: {} }]);
  const result = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    deps: { fetchImpl, sleep: noopSleep, retries: 0 },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.kind, 'transport');
  assert.equal(result.error.status, 503);
  assert.match(result.error.message, /transient HTTP 503/);
});

test('wrong-day rows and wrong key counts are rejected, never a complete day', async () => {
  let r = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    deps: {
      fetchImpl: scriptedFetch([{ body: { rows: [row('2026-09-17', ['https://cubxxw.com/a'], 1, 1, 1)], responseAggregationType: 'byPage' } }]).fetchImpl,
      sleep: noopSleep,
    },
  });
  assert.equal(r.status, 'failed');
  assert.equal(r.error.kind, 'parse');
  assert.match(r.error.message, /does not match the requested day 2026-09-18/);

  r = await fetchSliceDay({
    context: datePageContext,
    day: '2026-09-18',
    token: 't',
    deps: {
      fetchImpl: scriptedFetch([{ body: { rows: [{ keys: ['2026-09-18'], clicks: 1, impressions: 1, ctr: 1, position: 1 }], responseAggregationType: 'byPage' } }]).fetchImpl,
      sleep: noopSleep,
    },
  });
  assert.equal(r.status, 'failed');
  assert.equal(r.error.kind, 'parse');
  assert.match(r.error.message, /key count/);
});

test('availability probe segregates invalid and out-of-window dates before the cutoff', async () => {
  const rows = [
    { keys: ['2026-09-16'], clicks: 1, impressions: 1, ctr: 1, position: 1 },
    { keys: ['2999-01-01'], clicks: 9, impressions: 9, ctr: 9, position: 9 }, // synthetic future date
    { keys: ['2020-01-01'], clicks: 9, impressions: 9, ctr: 9, position: 9 }, // before the window
    { keys: ['2026-09-20'], clicks: 1, impressions: 1, ctr: 1, position: 1 },
    { keys: ['not-a-date'], clicks: 1, impressions: 1, ctr: 1, position: 1 },
  ];
  const probe = await probeAvailability({
    siteUrl: 'sc-domain:cubxxw.com',
    dates: ['2026-09-11', '2026-09-20'],
    token: 't',
    deps: { fetchImpl: scriptedFetch([{ body: { rows, responseAggregationType: 'byProperty' } }]).fetchImpl, sleep: noopSleep },
  });
  assert.equal(probe.status, 'observed');
  assert.equal(probe.availableThrough, '2026-09-20', 'synthetic 2999 date must not move the cutoff');
  assert.deepEqual(probe.observedDates, ['2026-09-16', '2026-09-20']);
  assert.equal(probe.rejectedRowCount, 3);
  assert.ok(probe.warnings.some((w) => /rejected 3 row/.test(w)));
});

test('response aggregation incompatible with the context is segregated even when stable across pages', async () => {
  const blogContext = {
    ...datePageContext,
    slice: 'blog_date_totals',
    dimensions: ['date'],
    requestAggregationType: 'byPage',
    filters: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: '^https?://cubxxw\\.com/' }] }],
  };
  const { fetchImpl, calls } = scriptedFetch([
    { body: { rows: [row('2026-09-18', [], 1, 2, 3)], responseAggregationType: 'byProperty' } },
    { body: { rows: [row('2026-09-18', [], 4, 5, 6)], responseAggregationType: 'byProperty' } },
  ]);
  const r = await fetchSliceDay({
    context: blogContext,
    day: '2026-09-18',
    token: 't',
    rowLimit: 1,
    deps: { fetchImpl, sleep: noopSleep },
  });
  assert.equal(r.status, 'partial');
  assert.equal(r.conflict.kind, 'incompatible-response-aggregation');
  assert.equal(calls.length, 1, 'segregated immediately; stability across pages is irrelevant');
});

function fakeFs({ collideDailyOnce = false, hideDestination = null } = {}) {
  const files = new Map();
  let collided = false;
  const eexist = () => Object.assign(new Error('exists'), { code: 'EEXIST' });
  return {
    files,
    existsSync: (p) => (p === hideDestination ? false : files.has(p)),
    mkdirSync: () => {},
    writeFileSync: (p, data) => {
      if (files.has(p)) throw eexist();
      files.set(p, data);
    },
    linkSync: (from, to) => {
      if (collideDailyOnce && !collided && to.endsWith('gsc-2026-09-24.json') && files.get(from) !== 'competitor evidence') {
        files.set(to, 'competitor evidence');
        collided = true;
        throw eexist();
      }
      if (files.has(to)) throw eexist();
      files.set(to, files.get(from));
    },
    unlinkSync: (p) => {
      files.delete(p);
    },
  };
}

test('no-clobber: competing writer on the daily name keeps prior evidence; run retries a fresh default name', async () => {
  const fsA = fakeFs({ collideDailyOnce: true });
  const mock = runFetchMock({ rowsFor: mockRows });
  const options = parseCliArgs(['--start', '2026-09-18', '--end', '2026-09-20', '--dir', 'data/seo']);
  const result = await runFetch(options, {
    fetchImpl: mock.fetchImpl,
    now: new Date('2026-09-24T12:00:00Z'),
    sleep: noopSleep,
    fsImpl: fsA,
    env: { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
    log: () => {},
    warn: () => {},
    errorLog: () => {},
  });
  assert.equal(result.exitCode, 0);
  assert.equal(fsA.files.get('data/seo/gsc-2026-09-24.json'), 'competitor evidence', 'prior evidence untouched');
  assert.match(result.path, /^data\/seo\/gsc-2026-09-24-\d{9}Z-[0-9a-f]+\.json$/);
  assert.equal(JSON.parse(fsA.files.get(result.path)).schema, 'gsc-snapshot/2');
  assert.deepEqual([...fsA.files.keys()].filter((f) => f.includes('.tmp-')), [], 'no orphan temp files');
});

test('no-clobber: explicit --out collision at publication exits non-zero and keeps prior evidence', async () => {
  const fsB = fakeFs({ hideDestination: 'out.json' });
  fsB.files.set('out.json', 'prior evidence'); // taken by a competing writer after preflight
  const mock = runFetchMock({ rowsFor: mockRows });
  const errors = [];
  const options = parseCliArgs(['--start', '2026-09-18', '--end', '2026-09-20', '--out', 'out.json']);
  const result = await runFetch(options, {
    fetchImpl: mock.fetchImpl,
    now: new Date('2026-09-24T12:00:00Z'),
    sleep: noopSleep,
    fsImpl: fsB,
    env: { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
    log: () => {},
    warn: () => {},
    errorLog: (m) => errors.push(String(m)),
  });
  assert.equal(result.exitCode, 1, 'explicit --out collision is a non-zero run');
  assert.equal(fsB.files.get('out.json'), 'prior evidence', 'prior evidence untouched');
  assert.ok(errors.some((e) => /Refusing to overwrite existing/.test(e)));
  assert.deepEqual([...fsB.files.keys()].filter((f) => f.includes('.tmp-')), [], 'no orphan temp files');
});
