// Deterministic GSC report core: import versioned + legacy snapshots, select
// whole-day evidence per exact semantic selection key, and aggregate honest
// 28+28 window metrics. No clock is used anywhere in the produced report —
// identical inputs always produce identical bytes.
//
// Selection key = full normalized request context (property, ordered
// dimensions, normalized filter groups, search type, dataState, request
// aggregation semantics) + slice + day. Fetch window, fetchedAt, filenames,
// rowLimit and startRow are provenance only. The observed response
// aggregation semantics are part of successful evidence identity: same-day
// evidence with different response aggregation is kept apart and reported,
// never silently overwritten. Failed refreshes (no response aggregation)
// attach to the matching request-context success diagnostics and never
// erase them.
//
// States distinguish observed rows from proven completeness:
//   complete / empty                  proven whole day (pagination + status)
//   legacy-unknown                    legacy rows observed; completeness unknown
//   legacy-empty-unknown              legacy request window had no rows; unknown gap
//   unavailable-unknown               successful empty without established availability
//   partial / conflict / failed / truncated / missing
// Only complete|empty|legacy-unknown feed metrics; only complete|empty count
// as proven, so legacy evidence never claims metricsComplete.
//
// Optional asOf (UTC observation cutoff, distinct from traffic start/end)
// excludes observations fetched after the cutoff; missing/invalid fetchedAt
// cannot prove eligibility and is excluded with a visible constant reason.

import * as nodeFs from 'node:fs';
import { createHash } from 'node:crypto';

import { GscError } from './gsc-errors.mjs';
import {
  enumerateDates,
  isValidCalendarDate,
  isValidUtcTimestamp,
  parseUtcTimestamp,
  splitWindow,
  timestampMs,
  validateCalendarRange,
} from './gsc-dates.mjs';
import { hostFilterGroup, hostnameOf, normalizeFilterGroups, SNAPSHOT_SCHEMA } from './gsc-snapshot.mjs';
import { classifyQuery, QUERY_LABEL_RULES } from './gsc-queries.mjs';

export const REPORT_SCHEMA = 'gsc-report/1';
export const AS_OF_UNPROVABLE_REASON = 'as-of cutoff: missing or invalid fetchedAt cannot prove observation eligibility';
export const AS_OF_AFTER_CUTOFF_REASON = 'as-of cutoff: fetchedAt is after the supplied observation cutoff';

const LEGACY_RESPONSE_AGGREGATION = 'unrecorded-legacy';
const UNRECORDED_RESPONSE_AGGREGATION = 'unrecorded';

const COUNTED_STATES = new Set(['complete', 'empty', 'legacy-unknown']);
const PROVEN_STATES = new Set(['complete', 'empty']);
const STATE_ORDER = ['complete', 'empty', 'legacy-unknown', 'unavailable-unknown', 'legacy-empty-unknown', 'partial', 'conflict', 'failed', 'truncated', 'missing'];

const LEGACY_SLICE_DEFS = {
  date_query: { dimensions: ['date', 'query'], dated: true },
  date_page: { dimensions: ['date', 'page'], dated: true },
  query_device: { dimensions: ['query', 'device'], dated: false },
  query_country: { dimensions: ['query', 'country'], dated: false },
};

const SECTION_BASIS = {
  propertyTotals: 'slice date_totals — independent property/date totals (unfiltered, byProperty semantics)',
  blogDateTotals: 'slice blog_date_totals — hostname-filtered blog date totals; the page filter forces byPage semantics — NOT property totals',
  domainPageRows:
    'slice date_page — sum of returned page-dimension rows (byPage returned-row totals), NOT property chart totals; unfiltered domain data so other hosts stay separable',
  blogQueryPage:
    'slice blog_date_query_page — hostname-filtered date×query×page evidence; query rows are incomplete (anonymous queries and internal row limits) and never imply landing pages outside the returned page dimension',
  legacyDateQuery:
    'legacy slice date_query — date×query rows without a page dimension (legacy assumption-labeled); query rows are incomplete and never imply landing pages',
  pageDeviceCut: 'slice blog_date_page_device — optional page-based device cut (never joined with country)',
  pageCountryCut: 'slice blog_date_page_country — optional page-based country cut (never joined with device)',
  legacyUndated:
    'legacy undated slices query_device/query_country — whole-request rows without a date dimension; they cannot be attributed to a day or window and are never blended with dated evidence',
};

const LEGACY_ASSUMPTIONS = [
  'searchType=web inferred from the known legacy collector (legacy request omitted type; API default is web)',
  'requestAggregationType=auto inferred from the known legacy collector (legacy request omitted aggregationType)',
  'responseAggregationType=unrecorded-legacy (legacy snapshots did not record the response aggregation)',
  'day completeness unknown (legacy collector had no pagination/status evidence; observed rows are not proof of completeness)',
  'a legacy request window day without rows is an unknown gap — never a proven zero day',
  'dataState=final is a recorded fact (the legacy collector sent dataState=final), not an assumption',
];

export function aggregateRows(rows) {
  let clicks = 0;
  let impressions = 0;
  let positionSum = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    positionSum += (r.position ?? 0) * r.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : null,
    position: impressions > 0 ? positionSum / impressions : null, // zero impressions -> null
  };
}

function contextOfLegacy(property, sliceName) {
  return {
    property,
    searchType: 'web',
    dataState: 'final',
    dimensions: [...LEGACY_SLICE_DEFS[sliceName].dimensions],
    filters: [],
    requestAggregationType: 'auto',
    slice: sliceName,
  };
}

function contextKey(context) {
  return JSON.stringify({
    property: context.property,
    searchType: context.searchType,
    dataState: context.dataState,
    dimensions: context.dimensions,
    filters: normalizeFilterGroups(context.filters ?? []),
    requestAggregationType: context.requestAggregationType,
    slice: context.slice,
  });
}

function dayKeyOf(context, day) {
  return `${contextKey(context)}|${day}`;
}

function identityOf(context) {
  return { property: context.property, searchType: context.searchType, dataState: context.dataState };
}

function identitiesMatch(a, b) {
  return a && b && a.property === b.property && a.searchType === b.searchType && a.dataState === b.dataState;
}

// Effective host scope of a request context. Only the exact escaped host
// expression emitted by the known collector builder (hostFilterGroup) is
// recognized as a host scope — arbitrary regex is never reverse-engineered,
// and every remaining normalized filter semantic must match the builder
// output exactly (extra country/device/… filters make the scope 'unproven'
// and such contexts never enter comparisons).
export function scopeOfContext(context, host = null) {
  const normalized = normalizeFilterGroups(context.filters ?? []);
  if (normalized.length === 0) return { kind: 'domain-wide', host: null };
  if (host && JSON.stringify(normalized) === JSON.stringify(normalizeFilterGroups([hostFilterGroup(host)]))) {
    return { kind: 'host', host };
  }
  return { kind: 'unproven', host: null };
}

// Fail-closed as-of validation for every exported core entry point: a non-null
// cutoff must be a strict UTC timestamp and can never degrade into "no cutoff".
function parseAsOfValue(asOf) {
  if (asOf === null || asOf === undefined) return null;
  return parseUtcTimestamp(asOf, 'asOf');
}

// ---------------------------------------------------------------------------
// Evidence import (legacy + gsc-snapshot/2), append-only inputs, as-of cutoff
// ---------------------------------------------------------------------------

function legacyEntries(json, file) {
  const meta = json.meta ?? {};
  const entries = [];
  const problems = [];
  for (const [sliceName, def] of Object.entries(LEGACY_SLICE_DEFS)) {
    const rows = json[sliceName];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) {
      problems.push({ file, problem: `legacy slice ${sliceName} is not an array; ignored` });
      continue;
    }
    const context = contextOfLegacy(meta.siteUrl ?? 'unknown', sliceName);
    const provenance = {
      file,
      schema: 'legacy-v1',
      legacy: true,
      fetchedAt: meta.fetchedAt ?? '',
      runDate: meta.runDate ?? null,
      requestWindow: meta.window ?? null,
    };
    if (def.dated) {
      const byDay = new Map();
      for (const row of rows) {
        const day = row?.keys?.[0];
        if (!isValidCalendarDate(day)) {
          problems.push({ file, problem: `legacy ${sliceName} row without a valid date key; ignored` });
          continue;
        }
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(row);
      }
      // Whole-request days: a day in the request window with no rows is an
      // unknown gap (legacy-empty), never a proven empty day.
      const windowDays = meta.window?.start && meta.window?.end
        ? enumerateDates(meta.window.start, meta.window.end)
        : [];
      for (const day of new Set([...windowDays, ...byDay.keys()])) {
        entries.push({
          context,
          slice: sliceName,
          day,
          rows: byDay.get(day) ?? [],
          status: 'legacy',
          availability: 'unknown',
          responseAggregationType: LEGACY_RESPONSE_AGGREGATION,
          provenance,
        });
      }
    } else {
      entries.push({
        context,
        slice: sliceName,
        day: null,
        rows,
        status: 'legacy',
        availability: 'unknown',
        responseAggregationType: LEGACY_RESPONSE_AGGREGATION,
        provenance,
      });
    }
  }
  return { entries, problems };
}

function snapshotEntries(json, file) {
  const meta = json.meta ?? {};
  const entries = [];
  const problems = [];
  const provenanceBase = {
    file,
    schema: SNAPSHOT_SCHEMA,
    legacy: false,
    fetchedAt: meta.fetchedAt ?? '',
    runDate: meta.runDate ?? null,
    requestWindow: meta.requestWindow ?? null,
    runStatus: meta.runStatus ?? null,
    runError: meta.error ?? null,
  };
  for (const slice of json.slices ?? []) {
    const context = {
      property: meta.property ?? 'unknown',
      searchType: meta.searchType ?? 'web',
      dataState: meta.dataState ?? 'final',
      dimensions: [...(slice.dimensions ?? [])],
      filters: normalizeFilterGroups(slice.filterGroups ?? []),
      requestAggregationType: slice.requestAggregationType ?? 'auto',
      slice: slice.name,
    };
    for (const [day, d] of Object.entries(slice.days ?? {})) {
      if (!isValidCalendarDate(day)) {
        problems.push({ file, problem: `snapshot slice ${slice.name} has invalid day key ${JSON.stringify(day)}; ignored` });
        continue;
      }
      entries.push({
        context,
        slice: slice.name,
        day,
        rows: Array.isArray(d.rows) ? d.rows : [],
        status: d.status,
        availability: d.availability ?? 'unknown',
        responseAggregationType: d.response?.responseAggregationType ?? null,
        provenance: {
          ...provenanceBase,
          request: d.request ?? null,
          response: d.response ?? null,
          truncated: d.truncated ?? false,
          conflict: d.conflict ?? null,
          warnings: d.warnings ?? [],
          error: d.error ?? null,
          availability: d.availability ?? 'unknown',
        },
      });
    }
  }
  return { entries, problems };
}

function eligibilityOf(fetchedAt, asOfMs) {
  if (asOfMs === null) return { eligible: true, reason: null }; // no cutoff: all inputs
  if (!isValidUtcTimestamp(fetchedAt)) return { eligible: false, reason: AS_OF_UNPROVABLE_REASON };
  if (timestampMs(fetchedAt) > asOfMs) return { eligible: false, reason: AS_OF_AFTER_CUTOFF_REASON };
  return { eligible: true, reason: null };
}

export function loadEvidence({ dir, fs = nodeFs, asOf = null } = {}) {
  const asOfMs = parseAsOfValue(asOf) === null ? null : timestampMs(parseAsOfValue(asOf));
  const names = fs.readdirSync(dir).filter((f) => /^gsc-.*\.json$/.test(f)).sort();
  const entries = [];
  const problems = [];
  const files = [];
  const excluded = [];
  const seenContent = new Map(); // sha256 -> { file, raw }
  const duplicates = [];
  for (const name of names) {
    let json;
    let raw;
    try {
      raw = fs.readFileSync(`${dir}/${name}`, 'utf8');
      json = JSON.parse(raw);
    } catch (err) {
      problems.push({ file: name, problem: `unreadable snapshot: ${err?.name ?? 'Error'}` });
      continue;
    }

    const isSnapshot = json?.schema === SNAPSHOT_SCHEMA;
    const isLegacy = json?.meta && (json.date_query || json.date_page || json.query_device || json.query_country);
    if (!isSnapshot && !isLegacy) {
      problems.push({ file: name, problem: 'unrecognized snapshot format; ignored' });
      continue;
    }

    // as-of: observation eligibility is proven by strict fetchedAt only
    const fetchedAt = json.meta?.fetchedAt ?? '';
    const eligibility = eligibilityOf(fetchedAt, asOfMs);
    if (!eligibility.eligible) {
      excluded.push({ file: name, fetchedAt, reason: eligibility.reason });
      continue;
    }

    // SHA-256 + full byte comparison: distinct contents are never merged,
    // even on a hash collision; identical bytes count exactly once.
    const hash = createHash('sha256').update(raw).digest('hex');
    const prior = seenContent.get(hash);
    if (prior) {
      if (prior.raw === raw) {
        duplicates.push({ file: name, duplicateOf: prior.file });
        continue;
      }
      problems.push({ file: name, problem: 'sha256 collision with different content; kept as a distinct snapshot' });
    }
    seenContent.set(hash, { file: name, raw });

    const parsed = isSnapshot ? snapshotEntries(json, name) : legacyEntries(json, name);
    entries.push(...parsed.entries);
    problems.push(...parsed.problems);
    files.push({
      file: name,
      schema: isSnapshot ? SNAPSHOT_SCHEMA : 'legacy-v1',
      fetchedAt,
      runDate: json.meta?.runDate ?? null,
      runStatus: json.meta?.runStatus ?? (isSnapshot ? null : 'legacy'),
    });
  }
  files.sort((a, b) => a.file.localeCompare(b.file));
  return { files, entries, problems, duplicates, excluded };
}

// Availability probes grouped by property and collection semantics. The
// report-level summary covers only the explicitly selected report context;
// the newest probe of another property can never redefine it. A newer failed
// probe (unknown) coexists visibly with the previous observation. Ties on
// fetchedAt resolve by filename (deterministic and recorded).
export function loadAvailability({ dir, fs = nodeFs, asOf = null, identity = null } = {}) {
  const asOfMs = parseAsOfValue(asOf) === null ? null : timestampMs(parseAsOfValue(asOf));
  const byProperty = new Map();
  const excluded = [];
  for (const name of fs.readdirSync(dir).filter((f) => /^gsc-.*\.json$/.test(f)).sort()) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(`${dir}/${name}`, 'utf8'));
    } catch {
      continue;
    }
    const probe = json?.meta?.availability;
    if (!probe || json?.schema !== SNAPSHOT_SCHEMA) continue;
    const fetchedAt = json.meta.fetchedAt ?? '';
    const eligibility = eligibilityOf(fetchedAt, asOfMs);
    if (!eligibility.eligible) {
      excluded.push({ file: name, reason: eligibility.reason });
      continue;
    }
    const probeProperty = json.meta.property ?? 'unknown';
    const semantics = { searchType: json.meta.searchType ?? 'web', dataState: json.meta.dataState ?? 'final' };
    const key = `${probeProperty}|${semantics.searchType}|${semantics.dataState}`;
    const record = {
      property: probeProperty,
      ...semantics,
      fetchedAt,
      file: name,
      status: probe.status ?? 'unknown',
      availableThrough: probe.availableThrough ?? null,
      probeWindow: probe.probeWindow ?? null,
      error: probe.error ?? null,
    };
    const list = byProperty.get(key) ?? [];
    list.push(record);
    byProperty.set(key, list);
  }

  const pick = (records) => {
    const sorted = [...records].sort((a, b) => {
      const ta = timestampMs(a.fetchedAt);
      const tb = timestampMs(b.fetchedAt);
      if (ta !== tb) return (ta ?? Number.NEGATIVE_INFINITY) - (tb ?? Number.NEGATIVE_INFINITY);
      return a.file.localeCompare(b.file); // deterministic tie-break, recorded
    });
    const latest = sorted[sorted.length - 1] ?? null;
    const lastObserved = [...sorted].reverse().find((r) => r.status === 'observed') ?? null;
    return { latest, lastObserved };
  };

  const grouped = {};
  for (const key of [...byProperty.keys()].sort()) {
    const { latest, lastObserved } = pick(byProperty.get(key));
    grouped[key] = { latest, lastObserved };
  }

  let summary;
  const identityKey = identity ? `${identity.property}|${identity.searchType}|${identity.dataState}` : null;
  if (identityKey === null) {
    summary = {
      status: 'unknown',
      identity: null,
      property: null,
      availableThrough: null,
      probeWindow: null,
      sourceFile: null,
      fetchedAt: null,
      latest: null,
      lastObserved: null,
      note: 'report context is ambiguous or not selected; per-semantic-context probe evidence is kept in availabilityByContext and nothing is inferred',
    };
  } else {
    const group = grouped[identityKey] ?? null; // exact property|searchType|dataState match
    if (!group) {
      summary = {
        status: 'unknown',
        identity,
        property: identity.property,
        availableThrough: null,
        probeWindow: null,
        sourceFile: null,
        fetchedAt: null,
        latest: null,
        lastObserved: null,
        note: 'no availability probe for the exact report context (property+searchType+dataState) — other semantic groups never substitute; empty days stay unknown, never complete-zero',
      };
    } else {
      const observed = group.latest.status === 'observed' ? group.latest : group.lastObserved;
      summary = {
        status: group.latest.status === 'observed' ? 'observed' : 'unknown',
        identity,
        property: identity.property,
        availableThrough: observed?.availableThrough ?? null,
        probeWindow: observed?.probeWindow ?? null,
        sourceFile: observed?.file ?? null,
        fetchedAt: observed?.fetchedAt ?? null,
        stale: group.latest.status !== 'observed' && group.lastObserved !== null,
        latest: group.latest
          ? { status: group.latest.status, fetchedAt: group.latest.fetchedAt, file: group.latest.file, error: group.latest.error }
          : null,
        lastObserved: group.lastObserved
          ? { availableThrough: group.lastObserved.availableThrough, probeWindow: group.lastObserved.probeWindow, fetchedAt: group.lastObserved.fetchedAt, file: group.lastObserved.file }
          : null,
        note: 'availability is an analytical state from the bounded recent-date probe; independent of transport success; ties resolve by filename',
      };
    }
  }
  return { summary, byContext: grouped, excluded };
}

// ---------------------------------------------------------------------------
// Whole-day selection (exact selection key + response-aggregation identity)
// ---------------------------------------------------------------------------

function candidateClass(e) {
  if (e.status === 'legacy') return e.rows.length > 0 ? 'legacyRows' : 'legacyEmpty';
  if (e.status === 'complete') return 'proven';
  if (e.status === 'empty') return e.availability === 'available' ? 'proven' : 'uncertainEmpty';
  return 'unsuccessful'; // partial | failed | truncated
}

function dayState(e) {
  if (e.status === 'legacy') return e.rows.length > 0 ? 'legacy-unknown' : 'legacy-empty-unknown';
  if (e.status === 'complete') return 'complete';
  if (e.status === 'empty') return e.availability === 'available' ? 'empty' : 'unavailable-unknown';
  if (e.status === 'truncated') return 'truncated';
  if (e.status === 'failed') return 'failed';
  if (e.status === 'partial') return e.provenance?.conflict ? 'conflict' : 'partial';
  return 'missing';
}

// Chronological recency (epoch); unparseable fetchedAt sorts oldest and ties
// resolve by filename — deterministic, never lexical-offset dependent.
const cmpRecency = (a, b) => {
  const ta = timestampMs(a.provenance?.fetchedAt ?? '');
  const tb = timestampMs(b.provenance?.fetchedAt ?? '');
  const va = ta ?? Number.NEGATIVE_INFINITY;
  const vb = tb ?? Number.NEGATIVE_INFINITY;
  if (va !== vb) return va - vb;
  const na = a.provenance?.file ?? '';
  const nb = b.provenance?.file ?? '';
  return na < nb ? -1 : na > nb ? 1 : 0;
};

export function selectDays(entries) {
  const byDayKey = new Map();
  for (const e of entries) {
    if (e.day === null) continue; // undated legacy evidence handled separately
    const id = dayKeyOf(e.context, e.day);
    if (!byDayKey.has(id)) byDayKey.set(id, []);
    byDayKey.get(id).push(e);
  }

  const selected = [];
  for (const id of [...byDayKey.keys()].sort()) {
    const candidates = [...byDayKey.get(id)].sort(cmpRecency);
    const unsuccessful = candidates.filter((e) => candidateClass(e) === 'unsuccessful');

    // Successful evidence identity includes the observed response aggregation
    // semantics: same-day evidence with different semantics is never
    // overwritten across groups (legacy unrecorded vs new-schema included).
    const byAgg = new Map();
    for (const e of candidates) {
      if (candidateClass(e) === 'unsuccessful') continue;
      const aggKey = e.responseAggregationType ?? UNRECORDED_RESPONSE_AGGREGATION;
      if (!byAgg.has(aggKey)) byAgg.set(aggKey, []);
      byAgg.get(aggKey).push(e);
    }

    const daySelected = [];
    for (const [aggKey, pool] of [...byAgg.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const reliable = pool.filter((e) => ['proven', 'legacyRows'].includes(candidateClass(e)));
      const uncertain = pool.filter((e) => candidateClass(e) === 'uncertainEmpty' || candidateClass(e) === 'legacyEmpty');
      const notes = { tieBreak: false, uncertainRefresh: null, laterFailure: null };
      let chosen = reliable[reliable.length - 1] ?? null;

      if (chosen) {
        const newerUncertain = uncertain.filter((e) => cmpRecency(e, chosen) > 0);
        const latest = newerUncertain[newerUncertain.length - 1] ?? null;
        if (latest) {
          notes.uncertainRefresh = {
            file: latest.provenance.file,
            fetchedAt: latest.provenance.fetchedAt,
            status: latest.status,
            availability: latest.availability,
            note: 'newer empty refresh without proven availability/completeness; previous row-bearing evidence retained',
          };
        }
      } else if (uncertain.length > 0) {
        chosen = uncertain[uncertain.length - 1];
      }

      if (reliable.length >= 2) {
        const top = reliable[reliable.length - 1];
        const runner = reliable[reliable.length - 2];
        if ((top.provenance?.fetchedAt ?? '') === (runner.provenance?.fetchedAt ?? '')) {
          notes.tieBreak = true; // deterministic: filename order decided it
        }
      }
      if (chosen) daySelected.push({ entry: chosen, aggKey, state: dayState(chosen), notes, candidateCount: candidates.length });
    }

    // Failed refreshes attach to the matching request-context success
    // diagnostics (they carry no response aggregation) and never erase them.
    for (const s of daySelected) {
      const matching = unsuccessful.filter(
        (e) => (e.responseAggregationType ?? null) === null || (e.responseAggregationType ?? s.aggKey) === s.aggKey,
      );
      const later = matching.filter((e) => cmpRecency(e, s.entry) > 0);
      const latestBad = later[later.length - 1] ?? null;
      if (latestBad) {
        s.notes.laterFailure = {
          file: latestBad.provenance.file,
          fetchedAt: latestBad.provenance.fetchedAt,
          status: latestBad.status,
          error: latestBad.provenance.error ?? null,
          note: 'later non-successful refresh; last success retained and not treated as fresh',
        };
      }
    }

    if (daySelected.length > 0) {
      // Cross-semantics visibility: a newer uncertain/legacy-empty refresh in
      // ANY aggregation group must surface on retained row-bearing evidence,
      // even when it lands in a different response-aggregation identity.
      const allUncertain = candidates.filter((e) => ['uncertainEmpty', 'legacyEmpty'].includes(candidateClass(e)));
      for (const s of daySelected) {
        if (s.notes.uncertainRefresh) continue;
        const newer = allUncertain.filter((e) => cmpRecency(e, s.entry) > 0);
        const latest = newer[newer.length - 1] ?? null;
        if (latest) {
          s.notes.uncertainRefresh = {
            file: latest.provenance.file,
            fetchedAt: latest.provenance.fetchedAt,
            status: latest.status,
            availability: latest.availability,
            note: 'newer empty refresh without proven availability/completeness (different response aggregation identity); previous row-bearing evidence retained',
          };
        }
      }
      selected.push(...daySelected);
    } else if (unsuccessful.length > 0) {
      // Failure-only day: visible as failure, never zero.
      const chosen = unsuccessful[unsuccessful.length - 1];
      selected.push({
        entry: chosen,
        aggKey: chosen.responseAggregationType ?? UNRECORDED_RESPONSE_AGGREGATION,
        state: dayState(chosen),
        notes: { tieBreak: false, uncertainRefresh: null, laterFailure: null },
        candidateCount: candidates.length,
      });
    }
  }
  return selected;
}

// ---------------------------------------------------------------------------
// Aggregation and report assembly
// ---------------------------------------------------------------------------

function coverageOf(selected, allDays) {
  const states = Object.fromEntries(STATE_ORDER.map((s) => [s, 0]));
  const missingDates = [];
  for (const s of selected) states[s.state] = (states[s.state] ?? 0) + 1;
  for (const day of allDays) {
    if (!selected.some((s) => s.entry.day === day)) {
      states.missing += 1;
      missingDates.push(day);
    }
  }
  return {
    expectedDays: allDays.length,
    daysWithEvidence: selected.length,
    countedDays: selected.filter((s) => COUNTED_STATES.has(s.state)).length,
    provenDays: selected.filter((s) => PROVEN_STATES.has(s.state)).length,
    states,
    missingDates,
    gapDates: selected.filter((s) => !COUNTED_STATES.has(s.state)).map((s) => s.entry.day).concat(missingDates).sort(),
    unprovenDates: selected.filter((s) => s.state === 'legacy-unknown').map((s) => s.entry.day).sort(),
  };
}

// Zeros are only output where a proven successful empty response (or observed
// rows) supports them; no counted evidence -> null, never a fake zero.
function metricsForCounted(countedDays, rows) {
  if (countedDays.length === 0) return null;
  const allProven = countedDays.every((s) => PROVEN_STATES.has(s.state));
  if (rows.length === 0 && !allProven) return null;
  return aggregateRows(rows);
}

function windowMetrics(selected, windows, allDays) {
  const out = {};
  for (const [name, w] of Object.entries(windows)) {
    const inWin = (s) => s.entry.day >= w.start && s.entry.day <= w.end;
    const counted = selected.filter((s) => COUNTED_STATES.has(s.state) && inWin(s));
    const proven = selected.filter((s) => PROVEN_STATES.has(s.state) && inWin(s));
    const rows = counted.flatMap((s) => s.entry.rows);
    const windowDays = allDays.filter((d) => d >= w.start && d <= w.end);
    const countedDaySet = new Set(counted.map((s) => s.entry.day));
    const gapDates = windowDays.filter((d) => !countedDaySet.has(d));
    out[name] = {
      window: w,
      metrics: metricsForCounted(counted, rows),
      daysCounted: countedDaySet.size,
      countedDates: [...countedDaySet].sort(),
      provenCompleteDays: proven.length,
      metricsComplete: proven.length === w.days && gapDates.length === 0,
      partial: countedDaySet.size > 0 && !(proven.length === w.days && gapDates.length === 0),
      gapDates,
      unprovenDates: [...counted.filter((s) => s.state === 'legacy-unknown').map((s) => s.entry.day)].sort(),
    };
  }
  return out;
}

function dayTable(selected) {
  const days = {};
  for (const s of [...selected].sort((a, b) => (a.entry.day < b.entry.day ? -1 : 1))) {
    const e = s.entry;
    days[e.day] = {
      state: s.state,
      rows: e.rows.length,
      metrics: COUNTED_STATES.has(s.state) ? aggregateRows(e.rows) : null,
      responseAggregationType: e.responseAggregationType,
      provenance: {
        file: e.provenance.file,
        schema: e.provenance.schema,
        fetchedAt: e.provenance.fetchedAt,
        runDate: e.provenance.runDate,
        requestWindow: e.provenance.requestWindow,
        status: e.status,
        availability: e.availability,
        truncated: e.provenance.truncated ?? false,
        conflict: e.provenance.conflict ?? null,
        warnings: e.provenance.warnings ?? [],
        error: e.provenance.error ?? null,
        runStatus: e.provenance.runStatus ?? null,
        tieBreak: s.notes.tieBreak,
        uncertainRefresh: s.notes.uncertainRefresh,
        laterFailure: s.notes.laterFailure,
        candidateCount: s.candidateCount,
      },
    };
  }
  return days;
}

function accumulateBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function pageTables(selected, host, windows, includeQueryRows, pagesLimit, windowCoverage) {
  const tables = { mainHost: { host, windows: {} }, otherHosts: { windows: {} } };
  for (const [name, w] of Object.entries(windows)) {
    const inWin = (s) => s.entry.day >= w.start && s.entry.day <= w.end;
    const counted = selected.filter((s) => COUNTED_STATES.has(s.state) && inWin(s));
    const rows = counted.flatMap((s) => s.entry.rows);
    const wc = windowCoverage[name];
    const coverage = {
      daysCounted: wc.daysCounted,
      countedDates: wc.countedDates,
      provenCompleteDays: wc.provenCompleteDays,
      expectedDays: w.days,
      metricsComplete: wc.metricsComplete,
      partial: wc.partial,
    };
    const mainWin = rows.filter((r) => hostnameOf(r.keys[1]) === host);
    const otherWin = rows.filter((r) => hostnameOf(r.keys[1]) !== host);

    const byPage = [...accumulateBy(mainWin, (r) => r.keys[1]).entries()]
      .map(([page, rs]) => ({ page, ...aggregateRows(rs) }))
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.page.localeCompare(b.page));
    const top = byPage.slice(0, pagesLimit);
    const rest = byPage.slice(pagesLimit);
    const pages = [...top];
    if (rest.length > 0) {
      pages.push({ page: `<other ${rest.length} pages>`, ...aggregateRows(rest.flatMap((rs) => rs)), omittedPages: rest.length });
    }
    tables.mainHost.windows[name] = {
      metrics: metricsForCounted(counted, mainWin),
      coverage,
      basis: 'sum of returned page-dimension rows for the main host (strict hostname equality); not property chart totals',
      pageCount: byPage.length,
      pages,
    };

    const byHost = [...accumulateBy(otherWin, (r) => hostnameOf(r.keys[1]) ?? 'unparseable-url').entries()]
      .map(([h, rs]) => ({ host: h, ...aggregateRows(rs) }))
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.host.localeCompare(b.host));
    tables.otherHosts.windows[name] = {
      metrics: metricsForCounted(counted, otherWin),
      coverage,
      basis: 'sum of returned page-dimension rows NOT matching the main host; kept separate so domain totals are never conflated with blog totals',
      hostCount: byHost.length,
      hosts: byHost,
    };
  }
  if (includeQueryRows) {
    tables.note = 'query rows are not part of this table; see query sections (landing pages are never inferred)';
  }
  return tables;
}

function queryAggregates(selected, windows, includeQueryRows, rowsLimit, pairsLimit, hasPageDimension, windowCoverage) {
  const out = { windows: {} };
  for (const [name, w] of Object.entries(windows)) {
    const inWin = (s) => s.entry.day >= w.start && s.entry.day <= w.end;
    const counted = selected.filter((s) => COUNTED_STATES.has(s.state) && inWin(s));
    const rows = counted.flatMap((s) => s.entry.rows);
    const wc = windowCoverage[name];
    const labels = {};
    const perQuery = new Map();
    for (const row of rows) {
      const q = row.keys[1] ?? '';
      const label = classifyQuery(q);
      if (!labels[label]) labels[label] = { queries: new Set(), clicks: 0, impressions: 0 };
      labels[label].queries.add(q);
      labels[label].clicks += row.clicks;
      labels[label].impressions += row.impressions;
      if (!perQuery.has(q)) perQuery.set(q, []);
      perQuery.get(q).push(row);
    }
    const labelOut = {};
    for (const label of Object.keys(labels).sort()) {
      labelOut[label] = {
        queries: labels[label].queries.size,
        clicks: labels[label].clicks,
        impressions: labels[label].impressions,
      };
    }
    const windowOut = {
      metrics: metricsForCounted(counted, rows),
      coverage: {
        daysCounted: wc.daysCounted,
        countedDates: wc.countedDates,
        provenCompleteDays: wc.provenCompleteDays,
        expectedDays: w.days,
        metricsComplete: wc.metricsComplete,
        partial: wc.partial,
      },
      queryRowCount: rows.length,
      uniqueQueries: perQuery.size,
      labels: labelOut,
    };
    if (includeQueryRows) {
      windowOut.topQueries = [...perQuery.entries()]
        .map(([query, rs]) => ({ query, label: classifyQuery(query), ...aggregateRows(rs) }))
        .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.query.localeCompare(b.query))
        .slice(0, rowsLimit);
      if (hasPageDimension) {
        // Real query×page pairs exactly as returned — no inference, with a
        // documented limit and an explicit truncation flag.
        const pairs = [...accumulateBy(rows, (r) => JSON.stringify([r.keys[1] ?? '', r.keys[2] ?? ''])).entries()]
          .map(([k, rs]) => {
            const [query, page] = JSON.parse(k);
            return { query, page, label: classifyQuery(query), ...aggregateRows(rs) };
          })
          .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.query.localeCompare(b.query) || a.page.localeCompare(b.page));
        windowOut.queryPagePairs = {
          totalPairs: pairs.length,
          limit: pairsLimit,
          truncated: pairs.length > pairsLimit,
          basis: 'real query×page rows as returned by the page dimension; missing pairs are a limit or coverage fact, never an inferred absence',
          pairs: pairs.slice(0, pairsLimit),
        };
      } else {
        windowOut.queryPagePairs = null;
      }
    }
    out.windows[name] = windowOut;
  }
  return out;
}

function makeSection({ sliceNames, selectedBySlice, allDays, windows, host, includeQueryRows, pagesLimit, rowsLimit, pairsLimit }) {
  const variants = [];
  for (const sliceName of sliceNames) {
    const groupsSel = selectedBySlice.get(sliceName);
    if (!groupsSel) continue;
    for (const [vKey, sel] of [...groupsSel.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const context = JSON.parse(vKey);
      const byAgg = new Map();
      for (const s of sel) {
        const agg = s.entry.responseAggregationType ?? UNRECORDED_RESPONSE_AGGREGATION;
        if (!byAgg.has(agg)) byAgg.set(agg, []);
        byAgg.get(agg).push(s);
      }
      const groups = [...byAgg.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([agg, groupSel]) => {
        const group = {
          responseAggregationType: agg,
          days: dayTable(groupSel),
          coverage: coverageOf(groupSel, allDays),
          windows: windowMetrics(groupSel, windows, allDays),
        };
        if (sliceName === 'date_page') group.tables = pageTables(groupSel, host, windows, includeQueryRows, pagesLimit, group.windows);
        if (sliceName === 'date_query' || sliceName === 'blog_date_query_page') {
          group.queries = queryAggregates(
            groupSel,
            windows,
            includeQueryRows,
            rowsLimit,
            pairsLimit,
            context.dimensions.includes('page'),
            group.windows,
          );
          group.pageDimensionEvidence = context.dimensions.includes('page')
            ? 'query×page rows observed (real page dimension); no query→page inference beyond returned rows'
            : 'none: this query slice has no page dimension; landing pages are never inferred';
        }
        return group;
      });
      variants.push({
        context,
        legacyAssumptions: sel.some((s) => s.entry.provenance.legacy) ? LEGACY_ASSUMPTIONS : [],
        groups,
      });
    }
  }
  return variants;
}

export function buildReport({
  dir,
  start,
  end,
  host = 'cubxxw.com',
  includeQueryRows = false,
  pagesLimit = 50,
  rowsLimit = 50,
  pairsLimit = 500,
  asOf = null,
  fs = nodeFs,
  evidence = undefined,
} = {}) {
  if (evidence !== undefined) {
    // Fail closed: preloaded evidence cannot prove as-of eligibility or
    // provenance filtering; callers must go through the loader ({dir, fs}).
    throw new GscError(
      'Preloaded evidence is not supported: as-of eligibility must be proven by the loader (pass {dir, fs} instead).',
      { kind: 'config' },
    );
  }
  const asOfValue = parseAsOfValue(asOf); // non-null asOf must be strict UTC
  const range = validateCalendarRange({ start, end }); // strict dates, ordered, nonempty; no clock
  const allDays = enumerateDates(range.start, range.end);
  const windows = splitWindow({ start: range.start, end: range.end });
  const loaded = loadEvidence({ dir, fs, asOf: asOfValue });

  const selectedAll = selectDays(loaded.entries).filter((s) => allDays.includes(s.entry.day));
  const selectedBySlice = new Map();
  for (const s of selectedAll) {
    const slice = s.entry.slice;
    const vKey = contextKey(s.entry.context);
    if (!selectedBySlice.has(slice)) selectedBySlice.set(slice, new Map());
    const m = selectedBySlice.get(slice);
    if (!m.has(vKey)) m.set(vKey, []);
    m.get(vKey).push(s);
  }

  // The summary is identity-consensus based: no arbitrary "primary" context.
  // The main-host analysis is built from the single compatible domain-wide
  // date_page variant; anything else is reported separately, never blended.
  const domainVariantsAll = [...(selectedBySlice.get('date_page')?.entries() ?? [])]
    .map(([vKey, sel]) => ({ context: JSON.parse(vKey), sel }))
    .sort((a, b) => (contextKey(a.context) < contextKey(b.context) ? -1 : 1));
  const uniqueIdentities = [...new Map(domainVariantsAll.map((v) => [JSON.stringify(identityOf(v.context)), identityOf(v.context)])).values()];
  const availabilityIdentity = (() => {
    // Exact availability identity: property + searchType + dataState of the
    // unique domain-wide report context; ambiguous context stays unknown.
    const domainWide = domainVariantsAll.filter((v) => scopeOfContext(v.context, host).kind === 'domain-wide');
    const ids = [...new Set(domainWide.map((v) => JSON.stringify(identityOf(v.context))))];
    return ids.length === 1 ? JSON.parse(ids[0]) : null;
  })();
  const availabilityLoad = loadAvailability({ dir, fs, asOf: asOfValue, identity: availabilityIdentity });

  // Legacy undated slices are source references only: their rows have no date
  // dimension, cannot be attributed to any window, and overlapping snapshots
  // are never summed into a traffic total (per-snapshot detail stays in the
  // original data/seo JSON).
  const undatedBySlice = new Map();
  for (const e of loaded.entries.filter((x) => x.day === null)) {
    const rec = undatedBySlice.get(e.slice) ?? { slice: e.slice, dimensions: e.context.dimensions, inputCount: 0, sourceFiles: [] };
    rec.inputCount += 1;
    if (!rec.sourceFiles.includes(e.provenance.file)) rec.sourceFiles.push(e.provenance.file);
    undatedBySlice.set(e.slice, rec);
  }
  const undatedSlices = [...undatedBySlice.values()]
    .map((r) => ({ ...r, sourceFiles: [...r.sourceFiles].sort() }))
    .sort((a, b) => a.slice.localeCompare(b.slice));

  const incompatibilities = [];
  const sections = {};
  for (const [sectionName, sliceNames] of [
    ['propertyTotals', ['date_totals']],
    ['blogDateTotals', ['blog_date_totals']],
    ['domainPageRows', ['date_page']],
    ['blogQueryPage', ['blog_date_query_page']],
    ['legacyDateQuery', ['date_query']],
    ['pageDeviceCut', ['blog_date_page_device']],
    ['pageCountryCut', ['blog_date_page_country']],
  ]) {
    const variants = makeSection({ sliceNames, selectedBySlice, allDays, windows, host, includeQueryRows, pagesLimit, rowsLimit, pairsLimit });
    if (variants.length > 1) {
      incompatibilities.push(
        `${sectionName}: ${variants.length} semantic request contexts present (property/filters/dimensions/type/aggregation mismatch) — reported separately, never blended`,
      );
    }
    for (const v of variants) {
      if (v.groups.length > 1) {
        incompatibilities.push(
          `${sectionName}: ${v.groups.length} response aggregation semantics present (${v.groups.map((g) => g.responseAggregationType).join(', ')}) — reported separately, never blended into one continuous baseline`,
        );
      }
    }
    sections[sectionName] = {
      basis: SECTION_BASIS[sectionName],
      status: variants.length > 0 ? 'present' : 'missing',
      variants,
    };
  }
  sections.legacyUndated = {
    basis: SECTION_BASIS.legacyUndated,
    status: undatedSlices.length > 0 ? 'present' : 'missing',
    note: 'undated legacy slices have no date dimension: they cannot be attributed to any 28-day window and overlapping snapshots are never summed into a traffic total; per-snapshot detail stays in the original data/seo JSON',
    slices: undatedSlices,
  };

  const summary = buildSummary({ sections, windows, host, uniqueIdentities, incompatibilities });

  return {
    schema: REPORT_SCHEMA,
    params: {
      dir,
      start: range.start,
      end: range.end,
      host,
      includeQueryRows,
      asOf: asOfValue,
      windows: {
        previous: windows.previous,
        current: windows.current,
      },
    },
    inputs: {
      files: loaded.files,
      counts: {
        files: loaded.files.length,
        legacyFiles: loaded.files.filter((f) => f.schema === 'legacy-v1').length,
        snapshotFiles: loaded.files.filter((f) => f.schema === SNAPSHOT_SCHEMA).length,
        duplicateFiles: loaded.duplicates.length,
        excludedByAsOf: loaded.excluded.length,
        problems: loaded.problems.length,
      },
      duplicates: loaded.duplicates,
      excludedByAsOf: loaded.excluded,
      problems: loaded.problems,
    },
    availability: availabilityLoad.summary,
    availabilityByContext: availabilityLoad.byContext,
    sections,
    summary,
    queryLabelRules: QUERY_LABEL_RULES,
    incompatibilities,
    pending: [
      'GSC UI verification on the same filter/date basis is pending (parent-owned live gate)',
      'fresh query×page collection is pending (parent-owned live run of this collector)',
    ],
  };
}

// ---------------------------------------------------------------------------
// Summary: only scope- and identity-compatible evidence is ever compared
// ---------------------------------------------------------------------------

function singleGroup(section) {
  if (section.status !== 'present') return null;
  if (section.variants.length !== 1 || section.variants[0].groups.length !== 1) return null;
  return section.variants[0].groups[0];
}

function compatibleVariants(section, host, wantedScope) {
  return (section?.variants ?? []).filter((v) => {
    const scope = scopeOfContext(v.context, host);
    if (wantedScope === 'host') return scope.kind === 'host' && scope.host === host;
    return scope.kind === 'domain-wide';
  });
}

function buildSummary({ sections, windows, host, uniqueIdentities, incompatibilities }) {
  const domainCandidates = compatibleVariants(sections.domainPageRows, host, 'domain-wide');
  const domainVariant = domainCandidates.length === 1 ? domainCandidates[0] : null;
  const domainGroup = domainVariant && domainVariant.groups.length === 1 ? domainVariant.groups[0] : null;
  const pageIdentity = domainVariant ? identityOf(domainVariant.context) : (uniqueIdentities.length === 1 ? uniqueIdentities[0] : null);

  const notSummarized = (reason) => ({ status: 'not-summarized', reason });

  const mainHostByWindow = (name) => {
    if (!domainGroup) return notSummarized('domainPageRows has multiple semantic contexts/aggregation groups or none matching the report identity; see sections.domainPageRows');
    const t = domainGroup.tables.mainHost.windows[name];
    return {
      metrics: t.metrics,
      pageCount: t.pageCount,
      coverage: t.coverage,
      basis: t.basis,
    };
  };
  const otherHostsByWindow = (name) => {
    if (!domainGroup) return notSummarized('see sections.domainPageRows');
    const t = domainGroup.tables.otherHosts.windows[name];
    return { metrics: t.metrics, hostCount: t.hostCount, coverage: t.coverage };
  };

  // Query-vs-page comparison eligibility (conservative, fail closed):
  //  * the query context must be the UNIQUE exact host-filter context emitted
  //    by the known collector builder (arbitrary regex is never
  //    reverse-engineered; extra non-page filters make a context unproven),
  //  * identity (property/searchType/dataState) must match the page rows,
  //  * BOTH windows' sources must have non-null metrics with proven complete
  //    window coverage over identical counted date sets.
  // Anything weaker is not comparable with a reason; independent metrics stay
  // visible. No first-candidate selection ever happens.
  const allQueryVariants = [
    ...(sections.blogQueryPage?.variants ?? []),
    ...(sections.legacyDateQuery?.variants ?? []),
  ].filter((v) => v.groups.length === 1);
  const exactHostVariants = allQueryVariants.filter((v) => {
    const s = scopeOfContext(v.context, host);
    return s.kind === 'host' && s.host === host;
  });
  const domainWideNoPageVariants = allQueryVariants.filter((v) => {
    const s = scopeOfContext(v.context, host);
    return s.kind === 'domain-wide' && !v.context.dimensions.includes('page');
  });
  const comparisonVariant = exactHostVariants.length === 1 ? exactHostVariants[0] : null;
  const comparisonRefusal = exactHostVariants.length > 1
    ? `multiple exact host-scoped query request contexts for ${host}; comparison refused (no first-candidate selection)`
    : null;
  const reportedVariant = comparisonVariant ?? (allQueryVariants.length === 1 ? allQueryVariants[0] : null);
  const reportedAmbiguous = allQueryVariants.length > 1 && !comparisonVariant;
  const queryCoverageByWindow = (name) => {
    // Main-host page rows are domain date_page rows explicitly filtered down to
    // strict hostname equality — their effective scope is the main host.
    const t = domainGroup ? domainGroup.tables.mainHost.windows[name] : null;
    const pageWindow = domainGroup ? domainGroup.windows[name] : null;
    const pageSource = t
      ? {
          identity: pageIdentity,
          scope: { kind: 'host', host },
          metrics: t.metrics,
          coverage: t.coverage,
          basis: t.basis,
        }
      : { identity: pageIdentity, scope: { kind: 'host', host }, metrics: null, coverage: null, basis: 'no compatible domainPageRows evidence' };

    const basisFor = (variant) => {
      const s = scopeOfContext(variant.context, host);
      if (s.kind === 'domain-wide' && !variant.context.dimensions.includes('page')) {
        return 'domain-wide legacy date×query rows without page dimension; includes other hosts; never comparable with main-host page rows';
      }
      if (s.kind === 'host') {
        return 'hostname-filtered query×page rows (page-filtered byPage semantics); returned query rows are incomplete (anonymous queries, internal row limits)';
      }
      return 'query rows from a request context whose filter semantics are unproven against the known collector builder; reported with its own identity only';
    };
    const queryWindowSource = (variant) => {
      if (!variant) return null;
      const g = variant.groups[0];
      const w = g.queries?.windows?.[name] ?? null;
      return {
        identity: identityOf(variant.context),
        scope: scopeOfContext(variant.context, host),
        metrics: w ? w.metrics : null,
        coverage: w ? w.coverage : null,
        basis: basisFor(variant),
      };
    };
    const reportedQuerySource = queryWindowSource(reportedVariant);

    // Window evidence compatibility: both metrics present, proven complete
    // window coverage on both sides, identical counted date sets. (Window
    // facts live at the top level for page windows and under `coverage` for
    // query windows; both shapes are normalized here.)
    const winStats = (w) => ({
      metrics: w ? w.metrics : null,
      metricsComplete: w ? (w.metricsComplete ?? w.coverage?.metricsComplete ?? false) : false,
      countedDates: w ? (w.countedDates ?? w.coverage?.countedDates ?? []) : [],
    });
    const windowCheck = (qWin, pWin) => {
      if (!qWin || !pWin) return 'window evidence missing on one side';
      const q = winStats(qWin);
      const p = winStats(pWin);
      if (q.metrics === null || p.metrics === null) return 'no counted evidence on one side for this window';
      if (!q.metricsComplete || !p.metricsComplete) return 'window success coverage is not proven on both sides';
      if (JSON.stringify([...q.countedDates].sort()) !== JSON.stringify([...p.countedDates].sort())) {
        return 'counted date sets differ between query and page evidence';
      }
      return null;
    };

    let reason;
    if (comparisonRefusal) {
      reason = comparisonRefusal;
    } else if (!comparisonVariant) {
      if (domainWideNoPageVariants.length === 1 && reportedVariant === domainWideNoPageVariants[0]) {
        reason = 'query source is domain-wide legacy date×query (no page dimension, includes other hosts) and cannot be compared with main-host page rows';
      } else if (reportedAmbiguous) {
        reason = 'multiple query request contexts; comparison refused (no first-candidate selection)';
      } else if (reportedVariant) {
        reason = 'query source identity/scope does not match the main-host page-row scope';
      } else {
        reason = 'no scope-compatible query evidence for the main host';
      }
    } else if (!identitiesMatch(identityOf(comparisonVariant.context), pageIdentity)) {
      reason = 'query source identity/scope does not match the main-host page-row scope';
    } else {
      const queryWindow = comparisonVariant.groups[0].queries?.windows?.[name] ?? null;
      reason = windowCheck(queryWindow, pageWindow);
    }
    const comparable = reason === null;

    const result = {
      comparable,
      reason,
      host: reportedQuerySource ? host : null,
      querySource: reportedQuerySource,
      pageSource,
      queryContexts: reportedAmbiguous
        ? allQueryVariants.map((v) => ({ identity: identityOf(v.context), scope: scopeOfContext(v.context, host), dimensions: v.context.dimensions, filters: v.context.filters }))
        : undefined,
      note: comparable
        ? 'the gap between query rows and page rows is NOT a measured coverage loss: returned query rows are incomplete (anonymous queries and internal row limits) and must not be treated as zero traffic or substituted for page totals'
        : 'sources keep independent identities; no cross-scope comparison is drawn',
    };
    if (!comparable && reportedQuerySource) {
      const key = `queryCoverage.${name}: not comparable — ${result.reason}`;
      if (!incompatibilities.includes(key)) incompatibilities.push(key);
    }
    return result;
  };

  const totalsFor = (section, wantedScope, basis) => {
    const vs = compatibleVariants(section, host, wantedScope);
    if (vs.length !== 1 || vs[0].groups.length !== 1) {
      const reason = vs.length === 0
        ? `no ${wantedScope === 'host' ? `host-filtered (${host}) ` : ''}evidence matching the report scope`
        : 'multiple semantic contexts/aggregation groups; not summarized into one baseline';
      return {
        previous: { notComparable: reason },
        current: { notComparable: reason },
        basis,
      };
    }
    const g = vs[0].groups[0];
    const out = { identity: identityOf(vs[0].context), basis };
    for (const name of ['previous', 'current']) {
      const w = g.windows[name];
      out[name] = {
        metrics: w.metrics,
        coverage: { daysCounted: w.daysCounted, provenCompleteDays: w.provenCompleteDays, expectedDays: w.window.days, metricsComplete: w.metricsComplete, partial: w.partial },
      };
    }
    return out;
  };

  return {
    windows: { previous: windows.previous, current: windows.current },
    identity: uniqueIdentities.length === 1
      ? { ...uniqueIdentities[0], host }
      : { ambiguous: true, identities: uniqueIdentities, host },
    mainHostPages: { previous: mainHostByWindow('previous'), current: mainHostByWindow('current'), host },
    otherHosts: { previous: otherHostsByWindow('previous'), current: otherHostsByWindow('current') },
    propertyTotals: totalsFor(sections.propertyTotals, 'domain-wide', SECTION_BASIS.propertyTotals),
    blogDateTotalsByPage: totalsFor(sections.blogDateTotals, 'host', SECTION_BASIS.blogDateTotals),
    queryCoverage: { previous: queryCoverageByWindow('previous'), current: queryCoverageByWindow('current') },
  };
}
