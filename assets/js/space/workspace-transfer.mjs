import { createWorkspace, normalizeRecoveryCopies } from './state.mjs';
import { MAX_EXCERPT_LENGTH, normalizeExcerpts } from './excerpts.mjs';

// The same UTF-8 budget applies to backup input/output and browser storage.
// 2 MiB accommodates all bounded private text, recovery copies and CJK sources.
export const MAX_WORKSPACE_BYTES = 2 * 1024 * 1024;
const fullViewport = { width: 10000, height: 10000 };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';

// Storage and import must validate before calling the forgiving restoration model.
export function validateWorkspaceData(raw) {
  if (!object(raw) || raw.version !== 1 || 'format' in raw) throw new Error('Unsupported workspace format or version.');
  if (!Array.isArray(raw.windows) || typeof raw.note !== 'string' || typeof raw.draft !== 'string' || !Array.isArray(raw.favorites)) throw new Error('Invalid workspace data.');
  if (raw.note.length > 40000 || raw.draft.length > 6000) throw new Error('Private text exceeds the supported field limits. Original data must be exported separately.');
  for (const key of ['excerpts', 'recoveries']) if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error(`Invalid workspace ${key}.`);
  if ((raw.excerpts || []).some(item => typeof item?.text === 'string' && item.text.length > MAX_EXCERPT_LENGTH)) throw new Error('Private excerpt text exceeds the supported field limit.');
  if ((raw.recoveries || []).some(item => typeof item?.note === 'string' && item.note.length > 40000 || typeof item?.draft === 'string' && item.draft.length > 6000)) throw new Error('Private recovery text exceeds the supported field limits.');
  if (new TextEncoder().encode(JSON.stringify(raw)).byteLength > MAX_WORKSPACE_BYTES) throw new Error('Workspace exceeds 2 MiB.');
  return raw;
}

function safePath(value) {
  if (typeof value !== 'string' || value.length > 800 || /[\u0000-\u0020\\]/.test(value) || value.startsWith('//')) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\u0000-\u0020\\]/.test(decoded) || /%(?:2f|5c|2e)/i.test(decoded) || /\/(?:\.|\.\.)(?:\/|$)/.test(decoded)) return null;
    const url = new URL(value, 'https://cubxxw.com');
    if (url.origin !== 'https://cubxxw.com' || url.username || url.password || url.search || url.hash) return null;
    return url.pathname;
  } catch { return null; }
}

export function normalizeWorkspaceData(raw, { viewport = fullViewport } = {}) {
  validateWorkspaceData(raw);
  const state = createWorkspace(raw, viewport);
  // Keep the current window schema, including browser payloads and distinct
  // validated identities. The old one-window-per-app rewrite loses them.
  state.excerpts = normalizeExcerpts(raw.excerpts);
  state.recoveries = normalizeRecoveryCopies(raw.recoveries);
  return state;
}

export function createBackup(state, { now = new Date().toISOString() } = {}) {
  const exportedAt = now instanceof Date ? now.toISOString() : iso(now);
  if (!exportedAt) throw new Error('Invalid backup date.');
  const backup = { format: 'bear-workspace', version: 1, exportedAt, workspace: normalizeWorkspaceData(state) };
  if (new TextEncoder().encode(JSON.stringify(backup)).byteLength > MAX_WORKSPACE_BYTES) throw new Error('Backup exceeds 2 MiB.');
  return backup;
}

export function parseBackup(text, { viewport = fullViewport, catalog = {} } = {}) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_WORKSPACE_BYTES) throw new Error('Backup size must be at most 2 MiB.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('The backup is not valid JSON.'); }
  const warnings = [];
  let raw;
  if (object(parsed) && 'format' in parsed) {
    if (parsed.format !== 'bear-workspace' || parsed.version !== 1 || !iso(parsed.exportedAt)) throw new Error('Unsupported backup format, version or date.');
    raw = parsed.workspace;
  } else {
    raw = parsed;
    warnings.push('legacy');
  }
  validateWorkspaceData(raw);
  const records = [...(Array.isArray(catalog.articles) ? catalog.articles : []), ...(Array.isArray(catalog.readingDocuments) ? catalog.readingDocuments : [])];
  const articles = new Map(records.map(a => [safePath(a.url), a]).filter(([path]) => path));
  const approvedRecord = value => articles.get(safePath(value));
  const approvedPath = value => { const record = approvedRecord(value); return record ? record.url.startsWith('/') ? record.url : safePath(record.url) : null; };
  // Source availability changes; private quoted text must survive that change.
  // The shared model validates inert shape. A consumer gates live backlinks
  // against its current catalog, while known titles come from that catalog.
  const excerpts = (raw.excerpts || []).map(e => {
    if (!object(e)) return e;
    const record = approvedRecord(e.url);
    if (record) return { ...e, url: approvedPath(e.url), title: cleanText(record.title, 500) };
    return { ...e, url: typeof e.url === 'string' && e.url.startsWith('https://') ? safePath(e.url) || e.url : e.url };
  });
  const state = normalizeWorkspaceData({ ...raw, excerpts }, { viewport });
  const originals = raw.favorites.length;
  state.favorites = [...new Set(raw.favorites.map(approvedPath).filter(Boolean))].slice(0, 200);
  if (state.favorites.length !== originals) warnings.push('favorites-filtered');
  const excerptCount = (raw.excerpts || []).length;
  if (state.excerpts.length !== excerptCount) warnings.push('excerpts-filtered');
  if (state.excerpts.some(e => !approvedRecord(e.url))) warnings.push('excerpt-sources-unavailable');
  let invalidReaders = 0;
  state.windows = state.windows.map(w => {
    if (w.app !== 'reader' || !w.payload || ['all', 'ai-agent', 'engineering', 'growth', 'favorites'].includes(w.payload)) return w;
    const path = approvedPath(w.payload);
    if (!path) invalidReaders++;
    return { ...w, payload: path || '' };
  });
  if (invalidReaders) warnings.push('reader-filtered');
  if (raw.windows.length !== state.windows.length) warnings.push('windows-filtered');
  if (raw.note.length > state.note.length || raw.draft.length > state.draft.length || (raw.recoveries || []).length > state.recoveries.length || (raw.excerpts || []).some(e => typeof e?.text === 'string' && e.text.length > 1200)) warnings.push('limits-applied');
  return { state, summary: { windows: state.windows.length, favorites: state.favorites.length, excerpts: state.excerpts.length, recoveries: state.recoveries.length, noteCharacters: state.note.length, draftCharacters: state.draft.length }, warnings };
}
