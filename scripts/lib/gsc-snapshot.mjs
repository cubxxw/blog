// Versioned snapshot schema, slice plan and semantic selection context for
// Google Search Console Search Analytics collection.
//
// Semantic selection identity (partition key) is the *request* context plus
// slice: property, ordered dimensions, normalized filter groups, search type,
// dataState and request aggregation semantics. Outer fetch window, fetchedAt,
// filenames, rowLimit and startRow are provenance only — never partition keys.
// Observed responseAggregationType is evidence recorded per slice/day; paging
// conflicts and per-day aggregation changes are surfaced, never silently mixed.

import { GscError } from './gsc-errors.mjs';

export const SNAPSHOT_SCHEMA = 'gsc-snapshot/2';
export const GSC_HOST_DEFAULT = 'cubxxw.com';
export const ALLOWED_DIMENSIONS = ['date', 'query', 'page', 'device', 'country'];
export const SEARCH_TYPE = 'web';
export const DATA_STATE = 'final';
export const DATA_TIMEZONE = 'America/Los_Angeles';
export const API_ROW_LIMIT = 25000; // Search Analytics hard maximum per page
export const MAX_PAGES_PER_DAY = 40; // safety bound: 40 * 25k = 1M rows/day/slice
export const AVAILABILITY_PROBE_DAYS = 10; // official guidance: past 10 days

// Escape a literal for RE2 so a hostname can never act as a regex.
export function escapeRe2(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Host filter: escaped RE2 URL prefix *including the path boundary* so only
// exact `http(s)://<host>/...` pages match — never subdomains
// (https://www.cubxxw.com/...) or lookalikes (https://cubxxw.computer/...,
// https://cubxxw.com.evil.com/...). Scope is the hostname, so both HTTP and
// HTTPS origins qualify.
export function hostFilterPattern(host) {
  return `^https?://${escapeRe2(host)}/`;
}

export function hostFilterGroup(host) {
  return {
    groupType: 'and',
    filters: [{ dimension: 'page', operator: 'includingRegex', expression: hostFilterPattern(host) }],
  };
}

export function hasPageFilter(filterGroups = []) {
  return filterGroups.some((g) => (g.filters ?? []).some((f) => f.dimension === 'page'));
}

// Canonical, order-stable representation of the filter groups actually sent.
export function normalizeFilterGroups(filterGroups = []) {
  const groups = filterGroups.map((g) => ({
    groupType: g.groupType ?? 'and',
    filters: [...(g.filters ?? [])]
      .map((f) => ({ dimension: f.dimension, operator: f.operator, expression: f.expression }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  }));
  groups.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return groups;
}

// Official constraint: page filtering disallows byProperty aggregation.
export function validateAggregationRequest({ aggregationType, filterGroups = [], slice = '?' }) {
  if (aggregationType === 'byProperty' && hasPageFilter(filterGroups)) {
    throw new GscError(
      `Invalid aggregation for slice ${slice}: aggregationType=byProperty is not allowed with a page filter. ` +
        'Page-filtered date totals use byPage semantics and cannot be called property totals.',
      { kind: 'config' },
    );
  }
}

// Per-day, per-slice request plan. Required slices must succeed or the run
// exits non-zero with a persisted status artifact; optional slices degrade
// explicitly. Device and country are separate page-based slices — there is
// deliberately no synthetic device×country join and no inferred query landing
// pages beyond the real page dimension.
export function slicePlan({ host, withDevice = false, withCountry = false } = {}) {
  if (!host) throw new GscError('slicePlan requires the main hostname.', { kind: 'config' });
  const hostGroup = hostFilterGroup(host);
  const plan = [
    {
      name: 'date_totals',
      required: true,
      scope: 'property',
      purpose: 'independent property/date totals',
      dimensions: ['date'],
      filterGroups: [],
      requestAggregationType: 'byProperty',
    },
    {
      name: 'blog_date_totals',
      required: true,
      scope: 'host-filtered',
      purpose:
        'hostname-filtered blog date totals; the page filter forces byPage semantics — these are NOT property totals',
      dimensions: ['date'],
      filterGroups: [hostGroup],
      requestAggregationType: 'byPage',
    },
    {
      name: 'date_page',
      required: true,
      scope: 'property',
      purpose: 'domain date×page rows; keeps other hosts separable',
      dimensions: ['date', 'page'],
      filterGroups: [],
      // Request aggregation stays `auto` so the selection context matches the
      // known legacy collector (legacy date_page snapshots remain usable).
      requestAggregationType: 'auto',
    },
    {
      name: 'blog_date_query_page',
      required: true,
      scope: 'host-filtered',
      purpose:
        'blog date×query×page evidence; query rows never imply landing pages outside the returned page dimension',
      dimensions: ['date', 'query', 'page'],
      filterGroups: [hostGroup],
      requestAggregationType: 'byPage',
    },
  ];
  if (withDevice) {
    plan.push({
      name: 'blog_date_page_device',
      required: false,
      scope: 'host-filtered',
      purpose: 'optional page-based device cut (never joined with country)',
      dimensions: ['date', 'page', 'device'],
      filterGroups: [hostGroup],
      requestAggregationType: 'byPage',
    });
  }
  if (withCountry) {
    plan.push({
      name: 'blog_date_page_country',
      required: false,
      scope: 'host-filtered',
      purpose: 'optional page-based country cut (never joined with device)',
      dimensions: ['date', 'page', 'country'],
      filterGroups: [hostGroup],
      requestAggregationType: 'byPage',
    });
  }
  for (const s of plan) validateAggregationRequest({ aggregationType: s.requestAggregationType, filterGroups: s.filterGroups, slice: s.name });
  return plan;
}

// Semantic selection context: full normalized request semantics of a slice.
export function requestContext({ property, sliceSpec }) {
  return {
    property,
    searchType: SEARCH_TYPE,
    dataState: DATA_STATE,
    dimensions: [...sliceSpec.dimensions],
    filters: normalizeFilterGroups(sliceSpec.filterGroups),
    requestAggregationType: sliceSpec.requestAggregationType,
    slice: sliceSpec.name,
  };
}

// Exact selection key = normalized request context + slice + day.
// Window, fetchedAt, filename, rowLimit and startRow are provenance and are
// intentionally excluded.
export function selectionKey(context, day) {
  return JSON.stringify({
    property: context.property,
    searchType: context.searchType,
    dataState: context.dataState,
    dimensions: context.dimensions,
    filters: context.filters,
    requestAggregationType: context.requestAggregationType,
    slice: context.slice,
    day,
  });
}

// Context validation at the transport boundary: dimensions, search type and
// dataState must match the recorded contract before any request is built.
export function validateContext(context) {
  if (!context || typeof context.property !== 'string' || context.property.length === 0) {
    throw new GscError('Invalid request context: property is required.', { kind: 'config' });
  }
  if (context.searchType !== SEARCH_TYPE) {
    throw new GscError(`Invalid request context: searchType must be ${SEARCH_TYPE}, received ${JSON.stringify(context.searchType)}.`, { kind: 'config' });
  }
  if (context.dataState !== DATA_STATE) {
    throw new GscError(`Invalid request context: dataState must be ${DATA_STATE}, received ${JSON.stringify(context.dataState)}.`, { kind: 'config' });
  }
  if (!Array.isArray(context.dimensions) || context.dimensions.length === 0) {
    throw new GscError('Invalid request context: ordered dimensions are required.', { kind: 'config' });
  }
  for (const d of context.dimensions) {
    if (!ALLOWED_DIMENSIONS.includes(d)) {
      throw new GscError(`Invalid request context: unknown dimension ${JSON.stringify(d)}.`, { kind: 'config' });
    }
  }
  if (new Set(context.dimensions).size !== context.dimensions.length) {
    throw new GscError(`Invalid request context: duplicate dimensions ${JSON.stringify(context.dimensions)}.`, { kind: 'config' });
  }
  validateAggregationRequest({ aggregationType: context.requestAggregationType, filterGroups: context.filters ?? [], slice: context.slice });
}

// Response aggregation is recorded evidence, but evidence incompatible with
// the request context is segregated as a conflict — never silently summed,
// even when stable across pagination pages.
export function responseAggregationConflict(context, responseAggregationType) {
  if (!responseAggregationType || responseAggregationType === 'auto') return null;
  const pageFiltered = hasPageFilter(context.filters ?? []);
  if (responseAggregationType === 'byProperty' && pageFiltered) {
    return 'incompatible-response-aggregation: byProperty returned for a page-filtered context';
  }
  if (responseAggregationType === 'byProperty' && context.requestAggregationType === 'byPage') {
    return 'incompatible-response-aggregation: byProperty returned for a byPage request';
  }
  if (responseAggregationType === 'byPage' && context.requestAggregationType === 'byProperty') {
    return 'incompatible-response-aggregation: byPage returned for a byProperty request';
  }
  return null;
}

// The Search Analytics request body for one slice/day page. One date at a
// time; callers page with startRow up to API_ROW_LIMIT. `type: web` is set
// explicitly so the request matches the recorded searchType contract.
export function buildSearchAnalyticsBody({ context, day, startRow = 0, rowLimit = API_ROW_LIMIT }) {
  validateContext(context);
  if (!Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > API_ROW_LIMIT) {
    throw new GscError(`Invalid rowLimit ${rowLimit}: must be 1..${API_ROW_LIMIT}.`, { kind: 'config' });
  }
  if (!Number.isInteger(startRow) || startRow < 0) {
    throw new GscError(`Invalid startRow ${startRow}: must be >= 0.`, { kind: 'config' });
  }
  const body = {
    startDate: day,
    endDate: day,
    dimensions: [...context.dimensions],
    type: SEARCH_TYPE,
    dataState: DATA_STATE,
    rowLimit,
    startRow,
  };
  const aggregationType = context.requestAggregationType;
  if (aggregationType && aggregationType !== 'auto') body.aggregationType = aggregationType;
  if (context.filters.length > 0) body.dimensionFilterGroups = context.filters;
  return body;
}

export function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
