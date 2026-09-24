// Search Console calendar-date helpers.
//
// Search Analytics dates are inclusive calendar dates in the property's data
// timezone (America/Los_Angeles for cubxxw.com), never UTC traffic dates.
// All date arithmetic here is pure calendar math on 'YYYY-MM-DD' strings.

import { GscError } from './gsc-errors.mjs';

export const GSC_DATA_TIMEZONE = 'America/Los_Angeles';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

export function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Strict parser: rejects trailing garbage ("2026-09-20x"), loose forms
// ("2026-9-2"), and impossible dates ("2026-02-30").
export function parseDateArg(value, name = 'date') {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new GscError(
      `Invalid ${name}: expected exactly YYYY-MM-DD, received ${JSON.stringify(value ?? null)} (trailing characters are rejected).`,
      { kind: 'cli' },
    );
  }
  if (!isValidCalendarDate(value)) {
    throw new GscError(`Invalid ${name}: ${value} is not a real calendar date.`, { kind: 'cli' });
  }
  return value;
}

// --lookback is an inclusive offset: 27 -> 28 days, 55 -> 56 days.
// Strict integer text only: rejects "-1", "NaN", "27x", "1e3".
export function parseLookback(value, name = '--lookback') {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new GscError(
      `Invalid ${name}: expected a non-negative integer, received ${JSON.stringify(value ?? null)}. ` +
        `${name} is an inclusive offset (27 -> 28 days, 55 -> 56 days).`,
      { kind: 'cli' },
    );
  }
  return Number(value);
}

// Strict UTC timestamp ('YYYY-MM-DDTHH:MM:SS[.mmm]Z') for observation cutoffs
// (--as-of) and fetchedAt eligibility. Strict validation only: no JS date
// normalization of impossible components.
const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?Z$/;

export function isValidUtcTimestamp(value) {
  if (typeof value !== 'string') return false;
  const m = TIMESTAMP_RE.exec(value);
  if (!m) return false;
  const [, date, hh, mm, ss] = m;
  if (!isValidCalendarDate(date)) return false;
  if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) return false;
  return Number.isFinite(Date.parse(value));
}

export function parseUtcTimestamp(value, name = '--as-of') {
  if (!isValidUtcTimestamp(value)) {
    throw new GscError(
      `Invalid ${name}: expected a strict UTC timestamp YYYY-MM-DDTHH:MM:SS[.mmm]Z, received ${JSON.stringify(value ?? null)}.`,
      { kind: 'cli' },
    );
  }
  return value;
}

// Chronological comparison helper: epoch milliseconds for strict timestamps.
export function timestampMs(value) {
  return isValidUtcTimestamp(value) ? Date.parse(value) : null;
}

export function todayInTimezone(now = new Date(), timeZone = GSC_DATA_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

export function enumerateDates(start, end) {
  const out = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

export function countDays(start, end) {
  return enumerateDates(start, end).length;
}

// Default request window: ends `endLagDays` before "today" (Search Console
// calendar) so dataState=final data is settled. Window length = lookback + 1.
export function defaultWindow({ now = new Date(), lookback, endLagDays = 3, timeZone = GSC_DATA_TIMEZONE } = {}) {
  if (!Number.isInteger(lookback) || lookback < 0) {
    throw new GscError(`Invalid --lookback: expected a non-negative integer, received ${JSON.stringify(lookback)}.`, { kind: 'cli' });
  }
  const end = addDays(todayInTimezone(now, timeZone), -endLagDays);
  const start = addDays(end, -lookback);
  return { start, end };
}

// Strict fixed range for reproducible backfills (pure: no clock).
export function validateCalendarRange({ start, end } = {}) {
  const s = parseDateArg(start, '--start');
  const e = parseDateArg(end, '--end');
  if (s > e) {
    throw new GscError(`Inverted range: --start ${s} is after --end ${e}.`, { kind: 'cli' });
  }
  return { start: s, end: e };
}

// CLI range validation: pure calendar checks plus a future-end guard.
export function validateRequestRange({ start, end, now = new Date(), timeZone = GSC_DATA_TIMEZONE } = {}) {
  const range = validateCalendarRange({ start, end });
  const today = todayInTimezone(now, timeZone);
  if (range.end > today) {
    throw new GscError(`Future --end ${range.end}: Search Console has no data after the current calendar date ${today} (${timeZone}).`, { kind: 'cli' });
  }
  return range;
}

// Split into two non-overlapping equal windows (28+28 for the standard
// 56-day range). Deterministic; no clock involved.
export function splitWindow({ start, end } = {}) {
  const total = countDays(start, end);
  if (total % 2 !== 0) {
    throw new GscError(
      `Window ${start}..${end} spans ${total} days; expected an even day count so it splits into two non-overlapping windows.`,
      { kind: 'cli' },
    );
  }
  const half = total / 2;
  return {
    previous: { start, end: addDays(start, half - 1), days: half },
    current: { start: addDays(start, half), end, days: half },
  };
}
