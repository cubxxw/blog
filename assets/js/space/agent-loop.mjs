// BEAR OS bounded agent task loop and its pure task-domain helpers.
//
// This module is DOM-free on purpose so the exact shipped code can run under
// `node --test`. It owns:
//   1. runAgentTask — a bounded, truthful, serializable model/tool task loop.
//   2. Tool registry + argument validation shared with the task UI.
//   3. Task record persistence (versioned, bounded, interrupted-safe).
//   4. Deterministic catalog tool helpers and safe answer link planning.
//
// The loop emits public operational events only (task start / model request /
// tool start / tool result / approval / end). Hidden chain of thought is never
// recorded: only assistant content text and operational tool data leave this
// module.

import { APPS, safeURL } from './state.mjs';

// ─── Hard bounds ─────────────────────────────────────────────────────────────
// A caller may request smaller limits; no caller can grow them past these.

export const HARD_LIMITS = Object.freeze({
  maxRounds: 6,
  maxToolCalls: 12,
  timeoutMs: 120000,
});

export const RESULT_MAX_CHARS = 6000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const toInt = (value, fallback) => (Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback);

export function normalizeLimits(limits = {}) {
  const source = limits && typeof limits === 'object' ? limits : {};
  return {
    maxRounds: clamp(toInt(source.maxRounds, HARD_LIMITS.maxRounds), 1, HARD_LIMITS.maxRounds),
    maxToolCalls: clamp(toInt(source.maxToolCalls, HARD_LIMITS.maxToolCalls), 1, HARD_LIMITS.maxToolCalls),
    timeoutMs: clamp(toInt(source.timeoutMs, HARD_LIMITS.timeoutMs), 200, HARD_LIMITS.timeoutMs),
  };
}

// ─── Tool registry ───────────────────────────────────────────────────────────
// Fixed tools. Only these names can ever reach executeTool; anything else is
// rejected before execution no matter what a model or caller claims.

export const TOOL_NAMES = Object.freeze([
  'search_writing',
  'read_writing',
  'open_app',
  'list_photos',
  'show_place',
  'append_note',
  'sandbox_run',
]);

// Mutating / side-effecting tools. They run only after explicit user approval.
export const REQUIRES_APPROVAL = Object.freeze(new Set(['append_note', 'sandbox_run']));

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function validateToolArgs(name, args) {
  if (typeof name !== 'string' || !TOOL_NAMES.includes(name)) {
    return { ok: false, error: `Unknown tool "${String(name).slice(0, 64)}". Only these tools exist: ${TOOL_NAMES.join(', ')}.` };
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, error: 'Tool arguments must be a JSON object.' };
  }
  switch (name) {
    case 'search_writing': {
      const query = str(args.query, 200);
      if (!query) return { ok: false, error: 'search_writing needs a non-empty "query" string.' };
      return { ok: true, args: { query } };
    }
    case 'read_writing': {
      const url = str(args.url, 500);
      if (!url || /[\u0000-\u001f\\]/.test(url) || !(url.startsWith('/') || /^https?:\/\//i.test(url))) {
        return { ok: false, error: 'read_writing needs a site path or http(s) "url" without control characters.' };
      }
      return { ok: true, args: { url } };
    }
    case 'open_app': {
      const app = str(args.app, 40);
      if (!APPS.includes(app)) return { ok: false, error: `open_app needs a registered app id (${APPS.join(', ')}).` };
      const payload = str(args.payload, 500);
      return { ok: true, args: payload ? { app, payload } : { app } };
    }
    case 'list_photos': {
      return { ok: true, args: { region: str(args.region, 100) } };
    }
    case 'show_place': {
      const id = str(args.id, 160);
      if (!id) return { ok: false, error: 'show_place needs a non-empty "id" string.' };
      return { ok: true, args: { id } };
    }
    case 'append_note': {
      const text = typeof args.text === 'string' ? args.text.trim().slice(0, 4000) : '';
      if (!text) return { ok: false, error: 'append_note needs a non-empty "text" string.' };
      return { ok: true, args: { text } };
    }
    case 'sandbox_run': {
      const command = typeof args.command === 'string' ? args.command.trim().slice(0, 4000) : '';
      if (!command || command.includes('\u0000')) return { ok: false, error: 'sandbox_run needs a non-empty "command" string without NUL bytes.' };
      return { ok: true, args: { command } };
    }
    default:
      return { ok: false, error: `Unknown tool "${name}".` };
  }
}

// ─── Small pure primitives used by the task UI ───────────────────────────────

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Parse a sandbox run result by its trailing "[exit N …]" marker. Text without
// a confirmed exit marker is never reported as success.
export function interpretRunResult(value) {
  const text = typeof value === 'string' ? value : '';
  const match = /\[exit (\d{1,4})[^\]\n]*\]\s*$/.exec(text);
  if (!match) return { ok: false, exitCode: null, reason: 'unconfirmed', output: text.slice(0, RESULT_MAX_CHARS) };
  const exitCode = Number(match[1]);
  return {
    ok: exitCode === 0,
    exitCode,
    reason: exitCode === 0 ? 'exit-0' : 'exit-nonzero',
    output: text.slice(0, RESULT_MAX_CHARS),
  };
}

// Plan how an answer becomes DOM: plain text segments plus link segments whose
// hrefs already passed safeURL. The renderer uses textContent and <a> nodes, so
// raw HTML or markdown in the answer can never become markup.
export function planAnswerSegments(value, origin) {
  const text = String(value ?? '');
  const segments = [];
  const pattern = /\[([^\]\n]{1,200})\]\(([^()\s]{1,500})\)|(?:https?:\/\/)[^\s<>"'\\]{1,500}/gi;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index) });
    const label = match[1] !== undefined ? match[1] : match[0];
    const href = safeURL(match[2] !== undefined ? match[2] : match[0], origin);
    if (href) segments.push({ text: label, href });
    else segments.push({ text: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

// ─── Deterministic catalog helpers (public data only) ────────────────────────
// The workspace catalog is public page metadata. Private note and draft text
// never enter this context.

const CATALOG_CAPS = Object.freeze({ articles: 30, products: 12, photos: 12, books: 8, places: 12 });

function boundStrings(list, cap, pick) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, cap).map(pick).filter(Boolean);
}

export function buildPublicContext(catalog) {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  const context = {
    language: str(source.language, 10) || 'zh',
    labels: source.labels && typeof source.labels === 'object' ? source.labels : {},
    person: source.person && typeof source.person === 'object'
      ? { name: str(source.person.name, 80), jobTitle: str(source.person.jobTitle, 120) }
      : {},
    products: boundStrings(source.products, CATALOG_CAPS.products, (p) => p && {
      id: str(p.id, 160), name: str(p.name, 120), stage: str(p.stage, 80),
      description: str(p.description, 300), url: str(p.url, 300),
    }).filter((p) => p.id || p.name),
    articles: boundStrings(source.articles, CATALOG_CAPS.articles, (a) => a && {
      title: str(a.title, 200), url: str(a.url, 300), date: str(a.date, 20),
      section: str(a.section, 40), description: str(a.description, 240),
      tags: boundStrings(a.tags, 8, (tag) => str(tag, 40)),
    }).filter((a) => a.title),
    photos: boundStrings(source.photos, CATALOG_CAPS.photos, (p) => p && {
      id: str(p.id, 160), title: str(p.title, 120), place: str(p.place, 120), region: str(p.region, 60),
    }).filter((p) => p.id),
    books: boundStrings(source.books, CATALOG_CAPS.books, (b) => b && {
      title: str(b.title, 160), author: str(b.author, 80), description: str(b.description, 200), url: str(b.url, 300),
    }).filter((b) => b.title),
    places: boundStrings(source.places, CATALOG_CAPS.places, (p) => p && {
      id: str(p.id, 160), name: str(p.name, 120), description: str(p.description, 200),
    }).filter((p) => p.id),
  };
  // Total budget: the compact context never grows without bound even when the
  // catalog is large. Largest lists shrink first; private note and draft are
  // never read here at all.
  for (const field of ['articles', 'photos', 'products', 'books', 'places']) {
    while (JSON.stringify(context).length > 12000 && context[field].length) {
      context[field] = context[field].slice(0, Math.floor(context[field].length / 2));
    }
    if (JSON.stringify(context).length <= 12000) break;
  }
  return context;
}

export function searchWritingCatalog(catalog, query, limit = 6) {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  const articles = Array.isArray(source.articles) ? source.articles : [];
  const needle = str(query, 200).toLocaleLowerCase();
  const scored = articles
    .map((article, index) => {
      const haystack = `${article?.title ?? ''} ${article?.description ?? ''} ${(article?.tags ?? []).join(' ')}`.toLocaleLowerCase();
      const score = needle ? (haystack.includes(needle) ? 6 : 0) - index / 1000 : 3 - index / 1000;
      return { article, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, clamp(toInt(limit, 6), 1, 12));
  return scored.map(({ article }) => ({
    title: str(article.title, 200),
    url: str(article.url, 300),
    date: str(article.date, 20),
    section: str(article.section, 40),
    description: str(article.description, 200),
  }));
}

export function listPhotosCatalog(catalog, region, limit = 8) {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  const needle = str(region, 100).toLocaleLowerCase();
  const cap = clamp(toInt(limit, 8), 1, 24);
  const matches = (Array.isArray(source.photos) ? source.photos : []).filter((photo) => photo
    && str(photo.id, 160)
    && (!needle
      || str(photo.region, 60).toLocaleLowerCase() === needle
      || str(photo.place, 120).toLocaleLowerCase().includes(needle)));
  // Filter first, then limit: matching later entries (for example future
  // Immich imports) must not be crowded out by earlier non-matches.
  return matches.slice(0, cap).map((photo) => ({
    id: str(photo.id, 160),
    title: str(photo.title, 120),
    place: str(photo.place, 120),
    region: str(photo.region, 60),
  }));
}

export function findPlaceCatalog(catalog, id) {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  const needle = str(id, 160);
  const place = (Array.isArray(source.places) ? source.places : []).find((p) => str(p?.id, 160) === needle);
  if (!place) return null;
  return {
    id: str(place.id, 160),
    name: str(place.name, 120),
    description: str(place.description, 200),
    ...(Number.isFinite(Number(place.lat)) ? { lat: Number(place.lat) } : {}),
    ...(Number.isFinite(Number(place.lon)) ? { lon: Number(place.lon) } : {}),
  };
}

// ─── Workspace tool execution (browser side, approval enforced by the loop) ──

const ARTICLE_TEXT_MAX = 4000;
const NOTE_MAX_CHARS = 40000;

// read_writing fetches same-origin public articles only.
export function resolveArticleURL(value, origin) {
  const href = safeURL(value, origin);
  if (!href) return null;
  try {
    const url = new URL(href, origin);
    if (url.origin !== new URL(origin).origin) return null;
    return url.href;
  } catch {
    return null;
  }
}

function fallbackArticleText(html) {
  return String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// A tool failure is an actionable error for the model, never a silent success
// string. The loop converts it into a tool-error message the model can correct.
export class ToolFailure extends Error {
  constructor(message) {
    super(String(message));
    this.name = 'ToolFailure';
  }
}

// A single decision point for inline approvals. cancel() wins over any later
// resolution: after Stop or dispose, a late approver can never execute or touch
// UI state again.
export function createApprovalGate() {
  let settleFn = null;
  let done = false;
  const promise = new Promise((resolve) => { settleFn = resolve; });
  return {
    promise,
    get settled() { return done; },
    decide(approved) {
      if (done) return false;
      done = true;
      settleFn(approved === true || approved?.approved === true);
      return true;
    },
    cancel() {
      return this.decide(false);
    },
  };
}

// Build the executor the task loop calls after approval/argument validation.
// `parseArticleText` and `fetchImpl` are injected so the DOM stays out of this
// module; the panel supplies a DOMParser-based sanitizer that strips active
// content before any text is returned to the model.
//
// Truthfulness contract: every failure (refused URL, missing page or place,
// window capacity, note overflow, failed or unconfirmed run) throws
// ToolFailure. Only genuinely verified successes return normally, so the loop
// can never record a failed request as done.
export function createToolExecutor({ catalog, execute, getState, fetchImpl, parseArticleText, origin } = {}) {
  const doFetch = fetchImpl || fetch;
  const extract = typeof parseArticleText === 'function' ? parseArticleText : fallbackArticleText;
  const state = () => {
    try { return typeof getState === 'function' ? getState() : null; } catch { return null; }
  };
  return async function executeTool(name, args, meta = {}) {
    // A stopped task executes nothing, even if this callback was already queued.
    if (meta.signal?.aborted) throw makeAbortError();
    switch (name) {
      case 'search_writing':
        return JSON.stringify(searchWritingCatalog(catalog, args.query));
      case 'list_photos':
        return JSON.stringify(listPhotosCatalog(catalog, args.region));
      case 'show_place': {
        const place = findPlaceCatalog(catalog, args.id);
        if (!place) throw new ToolFailure(`No public place with id "${args.id}". Check list_photos or search_writing for real ids.`);
        return JSON.stringify(place);
      }
      case 'open_app': {
        const before = state();
        const windows = Array.isArray(before?.windows) ? before.windows : null;
        if (windows && windows.length >= 16 && !windows.some((w) => w.app === args.app)) {
          throw new ToolFailure('The desktop window limit is reached. Ask the visitor to close a window first.');
        }
        const feedback = await execute('open', { app: args.app, ...(args.payload ? { payload: args.payload } : {}) });
        const after = state();
        const opened = Array.isArray(after?.windows) ? after.windows.some((w) => w.app === args.app) : null;
        if (opened === false) {
          throw new ToolFailure(typeof feedback === 'string' && feedback ? feedback : `Could not open ${args.app}.`);
        }
        return typeof feedback === 'string' && feedback ? feedback : `Opened ${args.app}.`;
      }
      case 'read_writing': {
        const href = resolveArticleURL(args.url, origin);
        if (!href) throw new ToolFailure(`Refused: read_writing only reads same-origin public articles on this site. "${args.url}" is not one.`);
        if (meta.signal?.aborted) throw makeAbortError();
        try {
          const response = await doFetch(href, meta.signal ? { signal: meta.signal } : {});
          if (!response || !response.ok) throw new ToolFailure(`The article is unavailable (HTTP ${response ? response.status : 'error'}). Use search_writing to find a live article.`);
          const html = await response.text();
          const text = String(extract(html, href) ?? '').replace(/\s+/g, ' ').trim().slice(0, ARTICLE_TEXT_MAX);
          if (!text) throw new ToolFailure(`The article at ${href} had no readable public text.`);
          return JSON.stringify({ source: href, text });
        } catch (error) {
          // A cancelled fetch is an interruption, not a tool outcome.
          if (isAbortError(error) || error instanceof ToolFailure) throw error;
          throw new ToolFailure(`The article could not be read: ${String(error?.message || error).slice(0, 200)}`);
        }
      }
      case 'append_note': {
        // The only place private note text is read: append_note already passed
        // the explicit approval path. The existing note never leaves this scope.
        const before = state();
        const existing = typeof before?.note === 'string' ? before.note : '';
        const composed = existing ? `${existing}\n${args.text}` : args.text;
        if (composed.length > NOTE_MAX_CHARS) {
          throw new ToolFailure(`The note is full: appending this text would exceed ${NOTE_MAX_CHARS} characters. Nothing was changed; ask the visitor to shorten the text or export the note.`);
        }
        await execute('note', { text: composed });
        const after = state();
        if (after && typeof after.note === 'string' && after.note !== composed) {
          throw new ToolFailure('The note did not change in the workspace, so nothing can be claimed as appended.');
        }
        return 'Appended to the visitor note in this browser. The note stays private and local.';
      }
      case 'sandbox_run': {
        const output = await execute('run', { command: args.command });
        const run = interpretRunResult(output);
        if (run.ok) return `Command finished with exit code ${run.exitCode}.\n${run.output}`;
        throw new ToolFailure(run.exitCode === null
          ? `Command result is unconfirmed: the sandbox reported no exit status, so nothing may be claimed as done.\n${run.output}`
          : `Command failed with exit code ${run.exitCode}. Nothing may be claimed as done.\n${run.output}`);
      }
      default:
        throw new ToolFailure(`Unknown tool "${String(name).slice(0, 64)}"; nothing was executed.`);
    }
  };
}

// ─── Task record persistence ─────────────────────────────────────────────────
// Records are values, never DOM nodes or credentials. The store is versioned
// and separate from the workspace state, bounded in record count and bytes,
// and it never resurrects a persisted interrupted record as complete.

export const TASK_STORE_KEY = 'bear-agent-tasks:v1';
export const TASK_STORE_LIMITS = Object.freeze({ maxRecords: 12, maxBytes: 100000 });

const TASK_STATUSES = new Set(['running', 'awaiting-approval', 'completed', 'interrupted', 'failed']);
const STEP_TYPES = new Set(['model', 'tool', 'approval', 'error']);

function boundStep(raw) {
  if (!raw || typeof raw !== 'object' || !STEP_TYPES.has(raw.type)) return null;
  const step = { type: raw.type };
  if (typeof raw.id === 'string') step.id = raw.id.slice(0, 80);
  if (typeof raw.name === 'string') step.name = raw.name.slice(0, 64);
  if (raw.args && typeof raw.args === 'object' && !Array.isArray(raw.args)) step.args = boundArgs(raw.args);
  if (typeof raw.status === 'string') step.status = raw.status.slice(0, 20);
  if (typeof raw.result === 'string') step.result = raw.result.slice(0, 1200);
  if (typeof raw.message === 'string') step.message = raw.message.slice(0, 400);
  if (typeof raw.approved === 'boolean') step.approved = raw.approved;
  if (Number.isInteger(raw.round)) step.round = clamp(raw.round, 1, HARD_LIMITS.maxRounds);
  if (Array.isArray(raw.toolCalls)) step.toolCalls = raw.toolCalls.slice(0, 12).map((v) => String(v).slice(0, 80));
  return step;
}

function normalizeStoredRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : null;
  if (!id) return null;
  return {
    id,
    question: typeof raw.question === 'string' ? raw.question.slice(0, 2000) : '',
    status: TASK_STATUSES.has(raw.status) ? raw.status : 'interrupted',
    steps: (Array.isArray(raw.steps) ? raw.steps.slice(0, 60) : []).map(boundStep).filter(Boolean),
    answer: typeof raw.answer === 'string' ? raw.answer.slice(0, 8000) : '',
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt.slice(0, 40) : '',
    endedAt: typeof raw.endedAt === 'string' ? raw.endedAt.slice(0, 40) : '',
    stopReason: typeof raw.stopReason === 'string' ? raw.stopReason.slice(0, 40) : null,
  };
}

function markInterrupted(record) {
  if (record.status === 'running' || record.status === 'awaiting-approval') {
    return { ...record, status: 'interrupted', stopReason: 'restored-interrupted' };
  }
  return record;
}

export function createTaskStore({ storage, key = TASK_STORE_KEY, maxRecords = TASK_STORE_LIMITS.maxRecords, maxBytes = TASK_STORE_LIMITS.maxBytes } = {}) {
  const safe = storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' ? storage : null;
  const limitRecords = clamp(toInt(maxRecords, TASK_STORE_LIMITS.maxRecords), 1, 24);
  const limitBytes = clamp(toInt(maxBytes, TASK_STORE_LIMITS.maxBytes), 1000, 200000);

  function readRaw() {
    if (!safe) return [];
    let raw;
    try { raw = safe.getItem(key); } catch { return []; }
    if (typeof raw !== 'string' || !raw) return [];
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return []; }
    const tasks = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    return tasks.map(normalizeStoredRecord).filter(Boolean);
  }

  function writeRaw(tasks) {
    if (!safe) return false;
    try { safe.setItem(key, JSON.stringify({ version: 1, tasks })); return true; } catch { return false; }
  }

  return {
    key,
    load() {
      return readRaw().map(markInterrupted).slice(-limitRecords);
    },
    save(record) {
      const bounded = normalizeStoredRecord(record);
      if (!bounded) return false;
      const existing = readRaw().find((task) => task.id === bounded.id);
      // A persisted interrupted record is terminal truth; it is never re-marked
      // as complete by a late write, and interrupted tasks never auto-rerun.
      if (existing && existing.status === 'interrupted' && bounded.status !== 'interrupted') return false;
      let tasks = [...readRaw().filter((task) => task.id !== bounded.id), bounded].slice(-limitRecords);
      while (JSON.stringify({ version: 1, tasks }).length > limitBytes) {
        if (tasks.length > 1) tasks = tasks.slice(1);
        else {
          const only = tasks[0];
          if (only.steps.length) only.steps = only.steps.slice(0, Math.floor(only.steps.length / 2));
          else return writeRaw([{ ...only, answer: only.answer.slice(0, 1000) }]);
        }
      }
      return writeRaw(tasks);
    },
    clear() {
      if (!safe) return false;
      try { safe.removeItem(key); return true; } catch { return false; }
    },
  };
}

// ─── The bounded task loop ───────────────────────────────────────────────────

const MAX_QUESTION_CHARS = 4000;
const MAX_ANSWER_CHARS = 8000;

function createTaskId() {
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `task-${Date.now().toString(36)}-${random}`;
}

function makeAbortError() {
  const error = new Error('Task aborted');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error) {
  return !!error && (error.name === 'AbortError' || error.code === 'ABORT_ERR');
}

function withAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) {
    // The caller may have queued work on `promise`; swallow its late rejection
    // so an aborted task never surfaces as an unhandled rejection.
    Promise.resolve(promise).catch(() => {});
    return Promise.reject(makeAbortError());
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(makeAbortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function attemptKey(name, args) {
  return `${name}\u0000${canonical(args)}`;
}

function boundArgs(args) {
  const out = {};
  let count = 0;
  for (const [key, value] of Object.entries(args || {})) {
    if (count >= 8) break;
    count += 1;
    if (typeof value === 'string') out[String(key).slice(0, 60)] = value.slice(0, 800);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[String(key).slice(0, 60)] = value;
    else out[String(key).slice(0, 60)] = String(value).slice(0, 200);
  }
  return out;
}

function boundResult(value) {
  let text;
  if (typeof value === 'string') text = value;
  else if (value === undefined || value === null) text = '[no output]';
  else {
    try { text = JSON.stringify(value) ?? String(value); } catch { text = '[unserializable result]'; }
  }
  text = String(text);
  return text.length > RESULT_MAX_CHARS ? `${text.slice(0, RESULT_MAX_CHARS)}\n…[result truncated]` : text;
}

function turnText(message) {
  const content = typeof message === 'string' ? message : typeof message?.content === 'string' ? message.content : '';
  return content.slice(0, MAX_ANSWER_CHARS);
}

function normalizeToolCalls(list, round) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, HARD_LIMITS.maxToolCalls).map((call, index) => {
    const source = call && typeof call === 'object' ? call : {};
    const rawArguments = typeof source.args === 'string' ? source.args : typeof source.arguments === 'string' ? source.arguments : '';
    let args = null;
    if (source.args && typeof source.args === 'object' && !Array.isArray(source.args)) args = source.args;
    else if (rawArguments) { try { const parsed = JSON.parse(rawArguments); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) args = parsed; } catch { /* invalid arguments surface as tool errors */ } }
    const id = typeof source.id === 'string' && /^[\w:.-]{1,64}$/.test(source.id) ? source.id : `call_${round}_${index + 1}`;
    return {
      id,
      name: typeof source.name === 'string' ? source.name.slice(0, 64) : '',
      args,
      arguments: rawArguments.slice(0, 4000) || (args ? JSON.stringify(args).slice(0, 4000) : '{}'),
    };
  });
}

export async function runAgentTask({
  question,
  language = 'zh',
  publicContext = null,
  requestTurn,
  executeTool,
  approveTool,
  signal,
  onEvent,
  limits,
} = {}) {
  if (typeof requestTurn !== 'function' || typeof executeTool !== 'function') {
    throw new TypeError('runAgentTask requires requestTurn and executeTool functions');
  }
  const questionText = typeof question === 'string' ? question.trim().slice(0, MAX_QUESTION_CHARS) : '';
  if (!questionText) throw new TypeError('runAgentTask requires a question');

  const { maxRounds, maxToolCalls, timeoutMs } = normalizeLimits(limits);
  const id = createTaskId();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const steps = [];
  const emit = (event) => { try { onEvent?.(event); } catch { /* listeners never break the task */ } };

  emit({ type: 'task-start', taskId: id, question: questionText, language });

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const messages = [{ role: 'user', content: questionText }];
  const seenIds = new Set();
  const attempts = new Map();
  let status = 'failed';
  let stopReason = 'error';
  let answer = '';
  let toolCallsUsed = 0;

  const finish = () => {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onExternalAbort);
    const record = {
      id,
      question: questionText,
      status,
      steps,
      answer,
      startedAt,
      endedAt: new Date().toISOString(),
      stopReason,
    };
    emit({ type: 'end', taskId: id, status, stopReason, answer });
    return record;
  };

  const interrupt = (reason) => {
    status = 'interrupted';
    stopReason = reason;
    return finish();
  };

  async function runToolCall(call) {
    const step = { type: 'tool', id: call.id, name: call.name, args: boundArgs(call.args || {}), status: 'running', result: '' };
    steps.push(step);
    emit({ type: 'tool-start', taskId: id, step: { id: step.id, name: step.name, args: step.args } });

    const settle = (stepStatus, resultText) => {
      step.status = stepStatus;
      step.result = boundResult(resultText);
      emit({ type: 'tool-result', taskId: id, step: { id: step.id, name: step.name, status: stepStatus, result: step.result } });
      return { content: step.result };
    };

    if (seenIds.has(call.id)) return settle('error', `Duplicate tool_call id "${call.id}"; this call was not executed.`);
    seenIds.add(call.id);

    // Every exact call is attempted at most once per task: identical failures
    // are reported again but never blindly retried, and identical mutations
    // never execute twice.
    const rawKey = attemptKey(call.name, call.args ?? call.arguments ?? null);
    const previousRaw = attempts.get(rawKey);
    if (previousRaw) return settle('duplicate', `This exact call already ran with status "${previousRaw.status}" and is not repeated. Earlier result: ${previousRaw.result}`);

    const validation = validateToolArgs(call.name, call.args);
    if (!validation.ok) {
      attempts.set(rawKey, { status: 'error', result: validation.error });
      return settle('error', validation.error);
    }
    const args = validation.args;
    step.args = boundArgs(args);

    const key = attemptKey(call.name, args);
    const previous = key === rawKey ? null : attempts.get(key);
    if (previous) {
      if (previous.status === 'ok') return settle('duplicate', `[duplicate call] Reusing the earlier result:\n${previous.result}`);
      return settle('duplicate', `This exact call already ran with status "${previous.status}" and is not repeated. Earlier result: ${previous.result}`);
    }

    if (controller.signal.aborted) {
      step.status = 'interrupted';
      step.result = 'Interrupted before execution.';
      return { content: step.result, aborted: true };
    }

    if (REQUIRES_APPROVAL.has(call.name)) {
      let approved = false;
      if (typeof approveTool === 'function') {
        emit({ type: 'approval', taskId: id, step: { id: step.id, name: step.name, args: step.args, phase: 'requested' } });
        let verdict;
        try {
          verdict = await withAbort(Promise.resolve().then(() => {
            // Never build an approval prompt for a task that already stopped.
            if (controller.signal.aborted) throw makeAbortError();
            return approveTool({ taskId: id, name: call.name, args });
          }), controller.signal);
        } catch (error) {
          if (isAbortError(error)) {
            step.status = 'interrupted';
            step.result = 'Approval wait interrupted; nothing was executed.';
            return { content: step.result, aborted: true };
          }
          verdict = false;
        }
        approved = verdict === true || verdict?.approved === true;
        emit({ type: 'approval', taskId: id, step: { id: step.id, name: step.name, args: step.args, phase: 'decided', approved } });
      }
      steps.push({ type: 'approval', id: step.id, name: step.name, args: step.args, approved });
      if (!approved) {
        attempts.set(key, { status: 'declined', result: 'The user declined this action.' });
        attempts.set(rawKey, { status: 'declined', result: 'The user declined this action.' });
        return settle('declined', 'The user declined this action. Nothing was executed.');
      }
    }

    // The approval decision event (or any earlier stop) may have aborted the
    // task. A stopped task executes nothing, whatever the verdict was.
    if (controller.signal.aborted) {
      step.status = 'interrupted';
      step.result = 'Interrupted before execution; nothing was executed.';
      return { content: step.result, aborted: true };
    }

    try {
      const raw = await withAbort((async () => {
        // Checked inside the execution callback, immediately before any call.
        if (controller.signal.aborted) throw makeAbortError();
        return executeTool(call.name, args, { signal: controller.signal, taskId: id });
      })(), controller.signal);
      // A structured failure outcome is a tool error, never a green done step.
      if (raw && typeof raw === 'object' && raw.ok === false) {
        const result = `Tool reported failure: ${String(raw.error ?? raw.message ?? 'unknown error').slice(0, 400)}`;
        attempts.set(key, { status: 'error', result });
        attempts.set(rawKey, { status: 'error', result });
        return settle('error', result);
      }
      const result = boundResult(raw);
      attempts.set(key, { status: 'ok', result });
      attempts.set(rawKey, { status: 'ok', result });
      return settle('ok', result);
    } catch (error) {
      if (isAbortError(error)) {
        step.status = 'interrupted';
        step.result = 'Interrupted during execution.';
        return { content: step.result, aborted: true };
      }
      // ToolFailure messages are the actionable correction for the model.
      const result = error instanceof ToolFailure || error?.name === 'ToolFailure'
        ? String(error.message)
        : `Tool execution failed: ${String(error?.message || error).slice(0, 300)}`;
      attempts.set(key, { status: 'error', result });
      attempts.set(rawKey, { status: 'error', result });
      return settle('error', result);
    }
  }

  try {
    for (let round = 1; round <= maxRounds; round += 1) {
      if (controller.signal.aborted) break;
      if (Date.now() - startedMs >= timeoutMs) { timedOut = true; break; }

      emit({ type: 'model-request', taskId: id, round });
      const turn = await withAbort(
        Promise.resolve().then(() => requestTurn({ messages, language, context: publicContext, signal: controller.signal })),
        controller.signal,
      );
      const content = turnText(turn?.message);
      const calls = normalizeToolCalls(turn?.toolCalls, round);
      steps.push({ type: 'model', round, toolCalls: calls.map((call) => call.id) });

      if (!calls.length) {
        if (content) {
          answer = content;
          status = 'completed';
          stopReason = 'answered';
          return finish();
        }
        status = 'failed';
        stopReason = 'no-answer';
        return finish();
      }

      // Tools run only when another model round remains to interpret them, and
      // only when the whole round fits the remaining tool budget.
      if (round >= maxRounds) return interrupt('round-limit');
      if (calls.length > maxToolCalls - toolCallsUsed) return interrupt('tool-limit');

      messages.push({
        role: 'assistant',
        content: content || '',
        tool_calls: calls.map((call) => ({ id: call.id, type: 'function', function: { name: call.name, arguments: call.arguments } })),
      });

      for (const call of calls) {
        const outcome = await runToolCall(call);
        messages.push({ role: 'tool', tool_call_id: call.id, content: outcome.content });
        if (outcome.aborted) return interrupt(timedOut ? 'timeout' : 'aborted');
      }
      toolCallsUsed += calls.length;
    }

    if (controller.signal.aborted) return interrupt(timedOut ? 'timeout' : 'aborted');
    return interrupt('round-limit');
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) return interrupt(timedOut ? 'timeout' : 'aborted');
    status = 'failed';
    stopReason = 'error';
    steps.push({ type: 'error', message: String(error?.message || error).slice(0, 400) });
    return finish();
  }
}
