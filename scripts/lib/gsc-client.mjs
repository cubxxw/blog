// Search Analytics transport: service-account auth, bounded timeout/retry and
// one-date-at-a-time pagination with explicit completeness evidence.
//
// Everything is injectable (fetch, sleep, timers) so tests never touch Google
// and never wait in real time. One attempt deadline covers response headers
// AND body for both OAuth and Search Analytics; a body timeout is a transport
// failure with the same bounded retry budget, never "malformed JSON".
//
// Error hygiene at this trust boundary: raw exception messages, response
// bodies, tokens and request endpoint query strings never reach a log. Unknown
// transport exceptions are reported as a fixed category plus an allowlisted
// error code only; already-safe GscError kind/status/retryable are preserved.

import { createSign } from 'node:crypto';

import { GscError, safeErrorMessage } from './gsc-errors.mjs';
import {
  buildSearchAnalyticsBody,
  responseAggregationConflict,
  validateContext,
  API_ROW_LIMIT,
  MAX_PAGES_PER_DAY,
  SEARCH_TYPE,
} from './gsc-snapshot.mjs';
import { isValidCalendarDate } from './gsc-dates.mjs';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ANALYTICS_URL = (siteUrl) =>
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const TRANSPORT_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
]);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Fixed classification only — never an interpolated exception message.
function transportFailureMessage(label, attempt, retries, err, timedOut, timeoutMs) {
  const category = timedOut ? 'timeout' : 'network-error';
  const code = TRANSPORT_CODES.has(err?.code) ? err.code : 'unspecified';
  return `${label}: transport failure (category: ${category}, code: ${code}, deadline: ${timeoutMs}ms) — attempt ${attempt + 1}/${retries + 1}.`;
}

function parseServiceAccount(raw) {
  if (!raw) {
    throw new GscError('Missing env GSC_SERVICE_ACCOUNT_JSON (service-account JSON blob).', { kind: 'auth' });
  }
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new GscError('GSC_SERVICE_ACCOUNT_JSON is not valid JSON (contents never logged).', { kind: 'auth' });
  }
  if (!sa || typeof sa.client_email !== 'string' || typeof sa.private_key !== 'string') {
    throw new GscError('GSC_SERVICE_ACCOUNT_JSON must contain client_email and private_key (values never logged).', { kind: 'auth' });
  }
  return sa;
}

// POST with one bounded deadline per attempt covering headers AND body, and
// bounded retries on transient failures (total attempts = retries + 1, backoff
// 1s/2s/... via the injected sleep — never unbounded). Returns {status, ok,
// text}; body text is read inside the deadline and never logged.
export async function httpPost({
  url,
  headers,
  body,
  label = 'request',
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000,
  retries = 2,
  sleep = defaultSleep,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new GscError(`${label}: no fetch implementation available.`, { kind: 'transport' });
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    let timer = null;
    try {
      timer = setTimer(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const res = await fetchImpl(url, { method: 'POST', headers, body, signal: controller.signal });
      const text = await res.text(); // still within the attempt deadline
      const status = res.status;
      const ok = res.ok ?? (status >= 200 && status < 300);
      if (TRANSIENT_STATUSES.has(status)) {
        lastError = new GscError(`${label}: transient HTTP ${status} (attempt ${attempt + 1}/${retries + 1}).`, {
          kind: 'transport',
          status,
          retryable: true,
        });
        if (attempt < retries) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        throw lastError; // keeps kind/status/retryable — never "network status null"
      }
      return { status, ok, text };
    } catch (err) {
      if (err instanceof GscError) {
        lastError = err;
        if (!err.retryable) throw err;
      } else {
        const timedOutNow = timedOut || err?.name === 'AbortError' || err?.name === 'TimeoutError';
        lastError = new GscError(transportFailureMessage(label, attempt, retries, err, timedOutNow, timeoutMs), {
          kind: 'transport',
          retryable: true,
        });
      }
      if (attempt < retries) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw lastError;
    } finally {
      if (timer !== null) clearTimer(timer);
    }
  }
  throw lastError ?? new GscError(`${label}: exhausted retry budget.`, { kind: 'transport' });
}

// Parse + shape validation at the trust boundary. Bodies are never logged.
function parseJsonText(text, label) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GscError(`${label}: response was not valid JSON (body never logged).`, { kind: 'parse' });
  }
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new GscError(`${label}: malformed response object (body never logged).`, { kind: 'parse' });
  }
  return json;
}

// Omitted `rows` is a legal successful empty response and normalizes to [].
// Explicit null / strings / bad rows are malformed and rejected.
function normalizeRows(json, label) {
  if (json.rows === undefined) return [];
  if (!Array.isArray(json.rows)) {
    throw new GscError(`${label}: malformed rows field (body never logged).`, { kind: 'parse' });
  }
  for (const row of json.rows) {
    if (!row || typeof row !== 'object' || !Array.isArray(row.keys) || !Number.isFinite(row.clicks) || !Number.isFinite(row.impressions)) {
      throw new GscError(`${label}: malformed row (body never logged).`, { kind: 'parse' });
    }
  }
  return json.rows;
}

// Row-level consistency with the request: key count matches the ordered
// dimensions and, when a date dimension is requested, every row carries the
// requested day. Wrong-day rows are rejected, never counted as a complete day.
function validateRowKeys(rows, dimensions, day, label) {
  const dateIdx = dimensions.indexOf('date');
  for (const row of rows) {
    if (row.keys.length !== dimensions.length) {
      throw new GscError(`${label}: malformed row key count (expected ${dimensions.length} keys per row, body never logged).`, { kind: 'parse' });
    }
    if (dateIdx !== -1 && day !== null && row.keys[dateIdx] !== day) {
      throw new GscError(`${label}: row date does not match the requested day ${day} (body never logged).`, { kind: 'parse' });
    }
  }
}

// Service-account JWT exchange. Auth failures are explicit and never echo the
// assertion, key material or the raw token response.
export async function getAccessToken({ serviceAccountJson, serviceAccount, deps = {} } = {}) {
  const sa = serviceAccount ?? parseServiceAccount(serviceAccountJson);
  const nowMs = deps.nowMs ?? Date.now();
  const now = Math.floor(nowMs / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, exp: now + 3600, iat: now }),
  )}`;
  let signature;
  try {
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    signature = signer.sign(sa.private_key);
  } catch {
    throw new GscError('Failed to sign the service-account JWT (private_key rejected; material never logged).', { kind: 'auth' });
  }
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${unsigned}.${base64url(signature)}`,
  }).toString();

  const res = await httpPost({
    url: TOKEN_URL,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    label: 'OAuth token exchange',
    ...deps,
  });
  if (!res.ok) {
    throw new GscError(
      `Authentication failed: OAuth token exchange returned HTTP ${res.status}. ` +
        'Check GSC_SERVICE_ACCOUNT_JSON and API access (credentials and response bodies are never logged).',
      { kind: 'auth', status: res.status },
    );
  }
  const json = parseJsonText(res.text, 'OAuth token exchange');
  if (typeof json.access_token !== 'string' || json.access_token.length === 0) {
    throw new GscError('Authentication failed: token exchange response had no access_token (body never logged).', { kind: 'auth' });
  }
  return json.access_token;
}

// One Search Analytics request page. The endpoint and its query string are
// never logged; error text carries status + scope only.
export async function postSearchAnalytics({ token, siteUrl, body, deps = {} } = {}) {
  const label = `Search Analytics query (${(body.dimensions ?? []).join('×')}, ${body.startDate})`;
  const res = await httpPost({
    url: SEARCH_ANALYTICS_URL(siteUrl),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    label,
    ...deps,
  });
  if (res.status === 401 || res.status === 403) {
    throw new GscError(
      `Authentication failed: Search Analytics returned HTTP ${res.status} for ${siteUrl}. ` +
        'Check that the service account is a user on the property (token and response bodies are never logged).',
      { kind: 'auth', status: res.status },
    );
  }
  if (!res.ok) {
    throw new GscError(`Search Analytics query failed with HTTP ${res.status} for ${siteUrl} (${label}).`, {
      kind: 'transport',
      status: res.status,
      retryable: TRANSIENT_STATUSES.has(res.status),
    });
  }
  return parseJsonText(res.text, label);
}

// Fetch one slice/day with pagination (rowLimit up to 25,000 + startRow) and
// full completeness evidence. A failed page keeps the collected rows as a
// partial slice — never a full day. Successful empty (including omitted rows)
// is distinct from absence/failure/partial/unknown.
export async function fetchSliceDay({
  context,
  day,
  token,
  siteUrl,
  rowLimit = API_ROW_LIMIT,
  maxPages = MAX_PAGES_PER_DAY,
  deps = {},
  requestDeps = {},
} = {}) {
  validateContext(context);
  const label = `slice ${context.slice}, day ${day}`;
  const rows = [];
  const startRows = [];
  const pageRowCounts = [];
  const aggregationTypesSeen = [];
  const warnings = [];
  const seenKeys = new Set();
  let terminator = null;
  let conflict = null;
  let error = null;

  try {
    for (let page = 0; page < maxPages; page++) {
      const startRow = rows.length;
      const body = buildSearchAnalyticsBody({ context, day, startRow, rowLimit });
      const json = await postSearchAnalytics({ token, siteUrl: siteUrl ?? context.property, body, deps: { ...requestDeps, ...deps } });
      const labelPage = `${label}, page ${page + 1}`;
      const pageRows = normalizeRows(json, labelPage);
      validateRowKeys(pageRows, context.dimensions, day, labelPage);

      const responseAggregationType = json.responseAggregationType ?? null;
      const incompatible = responseAggregationConflict(context, responseAggregationType);
      if (incompatible) {
        // Segregate: never accepted as a complete day, even if stable across pages.
        conflict = { kind: 'incompatible-response-aggregation', detail: { responseAggregationType, pages: pageRowCounts.length } };
        terminator = 'conflict';
        break;
      }
      if (responseAggregationType !== null && !aggregationTypesSeen.includes(responseAggregationType)) {
        aggregationTypesSeen.push(responseAggregationType);
      }
      if (aggregationTypesSeen.length > 1) {
        // Changing response aggregation across pages: conflict, incomplete.
        conflict = {
          kind: 'response-aggregation-type-changed',
          detail: { aggregationTypesSeen: [...aggregationTypesSeen], pages: pageRowCounts.length },
        };
        terminator = 'conflict';
        break;
      }

      let duplicate = false;
      for (const row of pageRows) {
        const key = JSON.stringify(row.keys);
        if (seenKeys.has(key)) {
          duplicate = true;
          break;
        }
        seenKeys.add(key);
      }
      if (duplicate) {
        // Duplicate dimension keys across pagination pages: never summed into
        // a falsely complete result.
        conflict = { kind: 'duplicate-dimension-keys-across-pages', detail: { pages: pageRowCounts.length, startRow } };
        terminator = 'conflict';
        break;
      }

      rows.push(...pageRows);
      startRows.push(startRow);
      pageRowCounts.push(pageRows.length);

      if (pageRows.length === 0) {
        terminator = 'empty-page';
        break;
      }
      if (pageRows.length < rowLimit) {
        terminator = 'short-page';
        break;
      }
      if (page === maxPages - 1) {
        terminator = 'safety-cap';
      }
    }
  } catch (err) {
    error = err instanceof GscError
      ? { kind: err.kind, status: err.status ?? null, message: safeErrorMessage(err) }
      : { kind: 'transport', status: null, message: 'transport failure (category: unknown)' };
    terminator = terminator ?? (rows.length > 0 ? 'failed-page' : 'failed-first-page');
  }

  const truncated = terminator === 'safety-cap';
  if (truncated) {
    warnings.push('row-cap-reached: pagination stopped at the safety cap; the day is incomplete and must not be summed as a full day');
  }
  if (rows.length >= rowLimit) {
    warnings.push('possible-internal-row-cap: paging cannot prove Google returned every row (internal limits and anonymous-query omission apply)');
  }

  let status;
  if (error && rows.length > 0) status = 'partial';
  else if (error) status = 'failed';
  else if (conflict) status = 'partial';
  else if (truncated) status = 'truncated';
  else if (rows.length === 0) status = 'empty';
  else status = 'complete';

  return {
    slice: context.slice,
    day,
    status, // 'complete' | 'empty' | 'partial' | 'failed' | 'truncated'
    rows,
    request: { rowLimit, maxPages, startRows },
    response: {
      pageRowCounts,
      responseAggregationType: aggregationTypesSeen[0] ?? null,
      aggregationTypesSeen,
      terminator,
      pages: pageRowCounts.length,
    },
    truncated,
    conflict,
    warnings,
    error,
  };
}

// Bounded recent-date availability probe (official guidance: past 10 days).
// Availability is an analytical state, independent of transport success: if
// the probe fails the snapshot records `unknown`, never a fake cutoff. Dates
// that are invalid or outside the probe window are segregated before the
// cutoff is computed, so malformed rows can never move availableThrough.
export async function probeAvailability({ siteUrl, dates, token, deps = {}, requestDeps = {} } = {}) {
  const probeWindow = { start: dates[0], end: dates[dates.length - 1] };
  try {
    const body = {
      startDate: probeWindow.start,
      endDate: probeWindow.end,
      dimensions: ['date'],
      type: SEARCH_TYPE,
      dataState: 'final',
      rowLimit: 25000,
      startRow: 0,
    };
    const json = await postSearchAnalytics({ token, siteUrl, body, deps: { ...requestDeps, ...deps } });
    const rows = normalizeRows(json, 'availability probe');
    validateRowKeys(rows, ['date'], null, 'availability probe');
    const inWindow = (d) => isValidCalendarDate(d) && d >= probeWindow.start && d <= probeWindow.end;
    const observedDates = new Set();
    let rejectedRowCount = 0;
    for (const row of rows) {
      const d = row.keys[0];
      if (inWindow(d)) observedDates.add(d);
      else rejectedRowCount += 1; // segregated: never influences the cutoff
    }
    const sorted = [...observedDates].sort();
    return {
      status: 'observed',
      probeWindow,
      observedDates: sorted,
      availableThrough: sorted.length > 0 ? sorted[sorted.length - 1] : null,
      rejectedRowCount,
      warnings: rejectedRowCount > 0
        ? [`probe rejected ${rejectedRowCount} row(s) with invalid or out-of-window dates`]
        : [],
      error: null,
    };
  } catch (err) {
    return {
      status: 'unknown',
      probeWindow,
      observedDates: [],
      availableThrough: null,
      rejectedRowCount: 0,
      warnings: [],
      error: err instanceof GscError
        ? { kind: err.kind, status: err.status ?? null, message: safeErrorMessage(err) }
        : { kind: 'transport', status: null, message: 'transport failure (category: unknown)' },
    };
  }
}
