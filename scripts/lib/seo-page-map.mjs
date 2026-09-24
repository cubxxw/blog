// seo-page-map/1 — pure validator/consumer for the trusted Hugo page map
// (issue #392 / batch B1 repair4, frozen B1/B2 architecture).
//
// B2's trusted preparation runs the pinned Hugo (`hugo list published` under
// the production config with an explicit clock) and converts the CSV to this
// JSON. B1 ONLY validates and consumes it. B2 owns invoking Hugo, CSV
// conversion and actual tracked-file/realpath proof; this module performs no
// filesystem access and claims none — it is a strict structural validator.
//
// Boundaries (frozen architecture review):
//   * URL and source are one VERIFIED identity pair. Only the owned HTTPS
//     production origin is accepted — no credentials, non-default port, query
//     or fragment. Paths are never lower-cased and aliases/old redirects are
//     never merged: lookup is exact-match on Hugo's canonical permalink.
//   * Conflicts are isolated, never first-row-picked: one URL with different
//     sourcePaths (or one sourcePath with different URLs) isolates ALL
//     involved associations as ambiguous, checked BEFORE kind filtering so
//     section/page conflicts stay visible. Exactly identical duplicate rows
//     are at most deduplicated and recorded. Unrelated valid targets are
//     preserved.
//   * Only rows with a physical source file (kind=page, including index.md
//     bundles) can propose. section/term/taxonomy rows keep explicit skip
//     reasons — nothing is mapped to a nearest directory or guessed _index.md.
//   * Future publishDate cannot propose; null is Hugo's no-date sentinel and
//     is allowed. generatedAt is calculation time and may exceed clock.
//   * read.status/completeness and bounded rows: an empty, failed, incomplete
//     or over-cap map visibly skips — never a silent empty list.

import { isValidUtcTimestamp, timestampMs } from './gsc-dates.mjs';

export const PAGE_MAP_SCHEMA = 'seo-page-map/1';

// The pinned production producer identity (netlify.toml pins Hugo 0.145.0).
export const PAGE_MAP_PRODUCER = Object.freeze({
  name: 'hugo-list-published',
  version: '0.145.0',
  environment: 'production',
  baseURL: 'https://cubxxw.com/',
});

export const PRODUCTION_ORIGIN = 'https://cubxxw.com';
export const PAGE_MAP_MAX_ROWS = 5000;
export const KNOWN_KINDS = ['page', 'section', 'term', 'taxonomy'];
export const PROPOSABLE_KIND = 'page';

const BOUND_URL = 2048;
const BOUND_PATH = 512;
const BOUND_KIND = 32;

// Owned canonical URL: HTTPS production origin only — no credentials, no
// non-default port, no query, no fragment, no normalization tricks (the raw
// string must already be canonical; paths keep their exact case and slash).
export function validateOwnedUrl(value) {
  if (typeof value !== 'string' || value === '' || value.length > BOUND_URL) {
    return { ok: false, reason: 'url-invalid: not a bounded string' };
  }
  let u;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: 'url-invalid: not parseable as an absolute URL' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'url-not-https: only the HTTPS production origin is owned' };
  if (u.username !== '' || u.password !== '') return { ok: false, reason: 'url-has-credentials: rejected' };
  if (u.port !== '') return { ok: false, reason: 'url-has-port: only the default port is owned' };
  if (u.host !== 'cubxxw.com') return { ok: false, reason: 'url-not-owned-origin: only cubxxw.com production URLs are owned' };
  if (u.search !== '' || u.hash !== '') return { ok: false, reason: 'url-has-query-or-fragment: rejected' };
  // Canonical-form discipline: no dot segments, no percent-encoding rewrite,
  // no host/path case folding, no implicit trailing slash.
  if (u.href !== value) {
    return { ok: false, reason: 'url-not-canonical: raw form differs from its parsed canonical permalink' };
  }
  return { ok: true, reason: null };
}

// Relative POSIX Markdown path under content/en or content/zh. No absolute
// paths, no backslashes, no '..' / '.' / empty segments. B1 does not open the
// filesystem (B2 proves tracked-file/realpath).
export function validateSourcePath(value) {
  if (typeof value !== 'string' || value === '' || value.length > BOUND_PATH) {
    return { ok: false, reason: 'source-path-invalid: not a bounded string' };
  }
  if (value.includes('\\')) return { ok: false, reason: 'source-path-not-posix: backslashes rejected' };
  if (value.startsWith('/')) return { ok: false, reason: 'source-path-absolute: only relative paths accepted' };
  const segments = value.split('/');
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    return { ok: false, reason: 'source-path-not-normalized: empty/dot segments rejected' };
  }
  if (segments.length < 3 || segments[0] !== 'content' || (segments[1] !== 'en' && segments[1] !== 'zh')) {
    return { ok: false, reason: 'source-path-outside-content: expected content/en/... or content/zh/...' };
  }
  if (!value.endsWith('.md')) return { ok: false, reason: 'source-path-not-markdown: expected a .md source' };
  return { ok: true, reason: null };
}

function rowProblem(row, index, reason, problems) {
  problems.push(`page row ${index}${row?.url ? ` (${String(row.url).slice(0, 120)})` : ''}: ${reason}`);
}

function normalizeRow(raw, index, problems) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    rowProblem(raw, index, 'not an object', problems);
    return null;
  }
  const urlCheck = validateOwnedUrl(raw.url);
  if (!urlCheck.ok) {
    rowProblem(raw, index, urlCheck.reason, problems);
    return null;
  }
  const pathCheck = validateSourcePath(raw.sourcePath);
  if (!pathCheck.ok) {
    rowProblem(raw, index, pathCheck.reason, problems);
    return null;
  }
  const kind = typeof raw.kind === 'string' && raw.kind.length <= BOUND_KIND ? raw.kind : null;
  if (kind === null || !KNOWN_KINDS.includes(kind)) {
    rowProblem(raw, index, `kind must be one of ${KNOWN_KINDS.join('/')} (unknown pages never propose)`, problems);
    return null;
  }
  const publishDate = raw.publishDate === null || raw.publishDate === undefined ? null : raw.publishDate;
  if (publishDate !== null && !isValidUtcTimestamp(publishDate)) {
    rowProblem(raw, index, 'publishDate must be null (no-date sentinel) or a strict UTC timestamp', problems);
    return null;
  }
  return { url: raw.url, sourcePath: raw.sourcePath, kind, publishDate };
}

// Validate and index a seo-page-map/1 object. Pure: no fs, no clock.
export function normalizePageMap(raw) {
  const problems = [];
  const rowProblems = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, usable: false, problems: ['page map is not a JSON object'], rowProblems: [], pages: [], index: new Map(), ambiguous: new Map(), counts: null };
  }
  if (raw.schema !== PAGE_MAP_SCHEMA) problems.push(`unexpected page map schema (expected ${PAGE_MAP_SCHEMA})`);
  if (typeof raw.repository !== 'string' || raw.repository === '') problems.push('repository identity missing');
  if (typeof raw.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/.test(raw.sourceCommit)) {
    problems.push('sourceCommit must be a 40-hex frozen checkout SHA');
  }
  if (!isValidUtcTimestamp(raw.clock ?? null)) problems.push('clock is missing or not a strict UTC timestamp');
  if (!isValidUtcTimestamp(raw.generatedAt ?? null)) {
    problems.push('generatedAt is missing or not a strict UTC timestamp (calculation time; may exceed clock)');
  }
  const producer = raw.producer && typeof raw.producer === 'object' ? raw.producer : null;
  if (!producer
    || producer.name !== PAGE_MAP_PRODUCER.name
    || producer.version !== PAGE_MAP_PRODUCER.version
    || producer.environment !== PAGE_MAP_PRODUCER.environment
    || producer.baseURL !== PAGE_MAP_PRODUCER.baseURL) {
    problems.push(`producer identity must be exactly ${JSON.stringify(PAGE_MAP_PRODUCER)} (pinned production Hugo listing)`);
  }
  const read = raw.read && typeof raw.read === 'object' ? raw.read : null;
  if (!read || typeof read.status !== 'string' || typeof read.completeness !== 'string') {
    problems.push('read.status and read.completeness are required');
  }
  if (!Array.isArray(raw.pages)) {
    problems.push('pages must be an array (an unreadable map is never a complete empty list)');
  } else if (raw.pages.length === 0) {
    problems.push('page map is empty (an empty map visibly skips; it never certifies an empty site)');
  } else if (raw.pages.length > PAGE_MAP_MAX_ROWS) {
    // Bounded rows: over cap marks the map incomplete — never silent truncation.
    problems.push(`page map has ${raw.pages.length} rows (cap ${PAGE_MAP_MAX_ROWS}); over-cap input is incomplete, not truncated`);
  }
  const readOk = Boolean(read) && read.status === 'ok' && read.completeness === 'complete';
  if (read && (read.status !== 'ok' || read.completeness !== 'complete')) {
    problems.push(`page map read is not ok/complete (status=${read.status}, completeness=${read.completeness}); a failed or incomplete listing never certifies`);
  }

  const pages = [];
  for (const [i, rawRow] of (Array.isArray(raw.pages) ? raw.pages : []).entries()) {
    const row = normalizeRow(rawRow, i, rowProblems);
    if (row) pages.push(row);
  }

  // Exactly identical duplicate rows: deduplicate and record (not a conflict).
  const seenRows = new Map();
  const deduped = [];
  for (const row of pages) {
    const key = JSON.stringify(row);
    if (seenRows.has(key)) {
      rowProblems.push(`page row duplicate of an earlier identical row (${row.url} -> ${row.sourcePath}); counted once`);
      continue;
    }
    seenRows.set(key, true);
    deduped.push(row);
  }

  // Conflict isolation BEFORE kind filtering (section/page conflicts stay
  // visible): a URL with multiple sourcePaths or a sourcePath with multiple
  // URLs isolates every involved association. Unrelated rows are untouched.
  const urlToPaths = new Map();
  const pathToUrls = new Map();
  for (const row of deduped) {
    if (!urlToPaths.has(row.url)) urlToPaths.set(row.url, new Set());
    urlToPaths.get(row.url).add(row.sourcePath);
    if (!pathToUrls.has(row.sourcePath)) pathToUrls.set(row.sourcePath, new Set());
    pathToUrls.get(row.sourcePath).add(row.url);
  }
  const ambiguous = new Map(); // url -> { sourcePaths, reason }
  for (const [url, paths] of urlToPaths) {
    if (paths.size > 1) {
      ambiguous.set(url, { sourcePaths: [...paths].sort(), reason: 'ambiguous-mapping: one URL maps to multiple source paths' });
    }
  }
  for (const [path, urls] of pathToUrls) {
    if (urls.size > 1) {
      for (const url of urls) {
        if (!ambiguous.has(url)) {
          ambiguous.set(url, { sourcePaths: [...(urlToPaths.get(url) ?? [])].sort(), reason: 'ambiguous-mapping: one source path maps to multiple URLs' });
        }
      }
    }
  }
  for (const [url, info] of ambiguous) {
    rowProblems.push(`ambiguous association isolated for ${url} (${info.reason}; paths: ${info.sourcePaths.join(', ')})`);
  }

  // Resolvable index: unambiguous rows only (all kinds; kind is enforced at
  // propose time so a non-page target gets an explicit skip, not a guess).
  const index = new Map();
  for (const row of deduped) {
    if (ambiguous.has(row.url)) continue;
    index.set(row.url, row);
  }

  const ok = problems.length === 0;
  return {
    ok,
    usable: ok && readOk && pages.length > 0 && pages.length <= PAGE_MAP_MAX_ROWS,
    problems,
    rowProblems,
    pages: deduped,
    index,
    ambiguous,
    counts: {
      rows: Array.isArray(raw.pages) ? raw.pages.length : 0,
      valid: deduped.length,
      ambiguous: ambiguous.size,
      invalid: pages.length === 0 && Array.isArray(raw.pages) ? raw.pages.length : (Array.isArray(raw.pages) ? raw.pages.length - pages.length : 0),
    },
    repository: typeof raw.repository === 'string' ? raw.repository : null,
    sourceCommit: typeof raw.sourceCommit === 'string' ? raw.sourceCommit : null,
    clock: raw.clock ?? null,
    generatedAt: raw.generatedAt ?? null,
    read: read ? { status: read.status, completeness: read.completeness } : null,
  };
}

// Resolve a candidate targetUrl to ONE trusted sourcePath. Exact-match only:
// no lower-casing, no alias/redirect merging, no nearest-directory guessing.
export function resolveTargetPage(map, targetUrl, { decisionMs = null } = {}) {
  const urlCheck = validateOwnedUrl(targetUrl);
  if (!urlCheck.ok) return { ok: false, reason: `target-url-invalid: ${urlCheck.reason}`, page: null };
  if (!map || !map.usable) {
    return { ok: false, reason: 'page-map-unusable: no validated page map (missing/failed/incomplete); targets never resolve by guessing', page: null };
  }
  if (map.ambiguous.has(targetUrl)) {
    const info = map.ambiguous.get(targetUrl);
    return { ok: false, reason: `target-mapping-ambiguous: ${info.reason} — all associations isolated, no first-row pick`, page: null };
  }
  const page = map.index.get(targetUrl);
  if (!page) {
    return { ok: false, reason: 'target-not-in-page-map: no exact published mapping for this URL (unlisted pages conservatively skip; aliases are never merged)', page: null };
  }
  if (page.kind !== PROPOSABLE_KIND) {
    return { ok: false, reason: `target-not-editable-page: kind=${page.kind} has no physical source page to propose (only kind=page does)`, page };
  }
  if (page.publishDate !== null && decisionMs !== null) {
    const publishedMs = timestampMs(page.publishDate);
    if (publishedMs !== null && publishedMs > decisionMs) {
      return { ok: false, reason: `future-publish-date: page publishes at ${page.publishDate}, after the decision time (a today-published map never enters yesterday's decision)`, page };
    }
  }
  return { ok: true, reason: null, page };
}
