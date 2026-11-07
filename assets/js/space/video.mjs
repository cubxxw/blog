// Pure YouTube reference helpers for the BEAR OS video modules.
// This module has no DOM, network or state dependency: it only parses, validates
// and canonicalises references. Every accepted reference is an exact HTTPS
// YouTube watch reference with a strict 11 character video ID and an optional
// start time in 0..21600 seconds. Caller parameters such as autoplay, list,
// origin or referrer are never carried into the returned canonical URLs.

export const MAX_VIDEO_START_SECONDS = 21600;
export const MAX_VIDEO_TITLE_CHARS = 120;
export const MAX_VIDEO_CHAPTERS = 12;
export const MIN_VIDEO_SIZE = Object.freeze({ width: 200, height: 200 });
export const MAX_VIDEO_SIZE = Object.freeze({ width: 3840, height: 2160 });

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const WATCH_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);
const SHORT_HOST = 'youtu.be';
const TIME_KEYS = ['t', 'start'];
// The real known video for the AI English learning article. Titles and posters
// stay authoritative: they come from the caller's references, never invented here.
export const KNOWN_VIDEO_REFERENCES = Object.freeze([
  Object.freeze({
    id: 'BsWxPI9UM4c',
    article: '/zh/growth/posts/ai-english-learning/',
    poster: '/images/posts/ai-english-learning/youtube-evals-english-transcript.png'
  })
]);

function parseStart(raw) {
  if (typeof raw !== 'string' || !raw.length || raw.length > 16) return null;
  let seconds = null;
  if (/^\d{1,5}$/.test(raw)) seconds = Number(raw);
  else if (/^\d{1,5}s$/i.test(raw)) seconds = Number(raw.slice(0, -1));
  else {
    const hms = /^(?:(\d{1,3})h)?(?:(\d{1,3})m)?(?:(\d{1,3})s)?$/i.exec(raw);
    if (hms && (hms[1] || hms[2] || hms[3])) seconds = Number(hms[1] || 0) * 3600 + Number(hms[2] || 0) * 60 + Number(hms[3] || 0);
    else {
      const clock = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})$/.exec(raw);
      if (clock && Number(clock[3]) <= 59) seconds = Number(clock[1] || 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
    }
  }
  if (seconds === null || !Number.isInteger(seconds) || seconds < 0 || seconds > MAX_VIDEO_START_SECONDS) return null;
  return seconds;
}

function watchURLFor(id, start) {
  return `https://www.youtube.com/watch?v=${id}${start > 0 ? `&t=${start}s` : ''}`;
}

// Accepts only exact HTTPS YouTube references:
//   https://(www.|m.)youtube.com/watch?v=ID[&t=…|&start=…]
//   https://(www.|m.)youtube.com/embed/ID[…]
//   https://(www.|m.)youtube.com/shorts/ID[…]
//   https://youtu.be/ID[…]
// Rejects credentials, explicit ports, protocol-relative or plain HTTP forms,
// backslashes, control characters, look-alike hosts, malformed IDs, extra path
// segments and ambiguous duplicate v/time parameters.
export function parseYouTubeURL(value) {
  if (typeof value !== 'string' || !value.length || value.length > 2048) return null;
  if (value.trim() !== value) return null;
  if (!/^https:\/\//i.test(value)) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (/\s/.test(value)) return null;
  const authority = value.slice(8).split(/[/?#]/)[0];
  if (!authority || authority.includes('@') || authority.includes(':')) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port !== '') return null;
  const host = url.hostname.toLowerCase();
  let id = '';
  if (host === SHORT_HOST) {
    const match = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname);
    if (!match) return null;
    id = match[1];
    if (url.searchParams.has('v')) return null;
  } else if (WATCH_HOSTS.has(host)) {
    const embed = /^\/(embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname);
    if (embed) {
      id = embed[2];
      if (url.searchParams.has('v')) return null;
    } else {
      if (!/^\/watch\/?$/.test(url.pathname)) return null;
      const versions = url.searchParams.getAll('v');
      if (versions.length !== 1 || !ID_PATTERN.test(versions[0])) return null;
      id = versions[0];
    }
  } else {
    return null;
  }
  if (!ID_PATTERN.test(id)) return null;
  const timeValues = [];
  for (const key of TIME_KEYS) for (const raw of url.searchParams.getAll(key)) timeValues.push(raw);
  if (timeValues.length > 1) return null; // ambiguous duplicate v/time
  let start = 0;
  if (timeValues.length === 1) {
    start = parseStart(timeValues[0]);
    if (start === null) return null;
  }
  return { id, start, watchURL: watchURLFor(id, start) };
}

function isSafeHTTPOrigin(value) {
  if (typeof value !== 'string' || !value.length || value.length > 2048) return false;
  if (value.startsWith('//') || /[\u0000-\u001f\u007f\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && !!url.hostname;
  } catch { return false; }
}

// Builds the fixed privacy-mode embed URL for a validated reference.
// Flags are fixed: controls=1, autoplay=0, playsinline=1, enablejsapi=1, rel=0.
// Only a parsed start time is added; caller parameters are never carried over.
// `origin` is included only when it is a safe current HTTP(S) origin.
export function buildYouTubeEmbedURL(reference, origin) {
  const normalized = normalizeReferenceObject(reference);
  if (!normalized) return null;
  const params = ['controls=1', 'autoplay=0', 'playsinline=1', 'enablejsapi=1', 'rel=0'];
  if (normalized.start > 0) params.push(`start=${normalized.start}`);
  if (isSafeHTTPOrigin(origin)) params.push(`origin=${encodeURIComponent(new URL(origin).origin)}`);
  return `https://www.youtube-nocookie.com/embed/${normalized.id}?${params.join('&')}`;
}

export function canonicalWatchURL(reference) {
  const normalized = normalizeReferenceObject(reference);
  return normalized ? normalized.watchURL : null;
}

function normalizeReferenceObject(reference) {
  if (typeof reference === 'string') return parseYouTubeURL(reference);
  if (!reference || typeof reference !== 'object') return null;
  const id = typeof reference.id === 'string' ? reference.id : '';
  if (!ID_PATTERN.test(id)) return null;
  let start = 0;
  if (reference.start !== undefined && reference.start !== null) {
    const parsed = parseStart(String(reference.start));
    if (parsed === null) return null;
    start = parsed;
  }
  return { id, start, watchURL: watchURLFor(id, start) };
}

// Reference titles are inert plain text: control characters removed, whitespace
// collapsed and length clamped. They are only ever assigned via textContent.
export function inertTitle(value, fallback = '') {
  const clean = text => String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_VIDEO_TITLE_CHARS).trim();
  return clean(value) || clean(fallback);
}

// Chapters come from public catalog metadata, never from arbitrary URL flags.
// Bound both the scan and the output; invalid seek targets and empty labels
// cannot produce a control. Keep the first label at a duplicated timestamp.
export function normalizeVideoChapters(chapters, language = 'zh') {
  if (!Array.isArray(chapters)) return [];
  const zh = String(language).toLowerCase().startsWith('zh');
  const seen = new Set(), result = [];
  for (const chapter of chapters.slice(0,256)) {
    if (!chapter || typeof chapter !== 'object' || Array.isArray(chapter)) continue;
    const {start} = chapter;
    if (!Number.isInteger(start) || start < 0 || start > MAX_VIDEO_START_SECONDS || seen.has(start)) continue;
    const raw = (zh ? chapter.title_zh : chapter.title_en) || chapter.title;
    const title = typeof raw === 'string' ? inertTitle(raw) : '';
    if (!title) continue;
    seen.add(start); result.push({start,title});
  }
  return result.sort((a,b)=>a.start-b.start).slice(0,MAX_VIDEO_CHAPTERS);
}

export function formatVideoTime(seconds) {
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_VIDEO_START_SECONDS) return '';
  const minutes = Math.floor(seconds / 60), remainder = String(seconds % 60).padStart(2,'0');
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2,'0')}:${remainder}` : `${minutes}:${remainder}`;
}

// Window and stage sizes stay inside the supported viewport bounds.
export function clampVideoSize(width, height) {
  const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Math.round(Number.isFinite(Number(value)) ? Number(value) : fallback)));
  return {
    width: clamp(width, MIN_VIDEO_SIZE.width, MAX_VIDEO_SIZE.width, 640),
    height: clamp(height, MIN_VIDEO_SIZE.height, MAX_VIDEO_SIZE.height, 360)
  };
}

function isLocalSitePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > 500 || /[\u0000-\u0020\u007f\\?#]/.test(value)) return false;
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  return !decoded.includes('//') && !/[\u0000-\u0020\u007f\\?#]/.test(decoded) && !/\/(?:\.|\.\.)(?:\/|$)/.test(decoded) && !/%(?:2f|5c|2e)/i.test(decoded);
}

function lookupReference(id, references) {
  if (!references) return null;
  if (Array.isArray(references)) return references.find(item => item && item.id === id) || null;
  if (typeof references === 'object' && Object.hasOwn(references,id) && references[id]) return references[id];
  return null;
}

// Resolves a caller reference (string URL or object) against the supplied
// references and the known registry. Returns { id, start, watchURL, title,
// poster, chapters } with inert labels and a local-site poster path only.
export function normalizeVideoReference(input, references, fallbackTitle = '', language = 'zh') {
  let base = null, extras = null;
  if (typeof input === 'string') base = parseYouTubeURL(input);
  else if (input && typeof input === 'object') {
    extras = input;
    // An explicit URL is authoritative; never repair a rejected host with a
    // different object identity supplied alongside it.
    base = input.url === undefined ? normalizeReferenceObject(input) : parseYouTubeURL(input.url);
  }
  if (!base) return null;
  const supplied = lookupReference(base.id, references);
  const known = KNOWN_VIDEO_REFERENCES.find(item => item.id === base.id) || null;
  const start = base.start;
  const title = inertTitle(extras?.title, '') || inertTitle(supplied?.title, '') || inertTitle(known?.title, '') || inertTitle(fallbackTitle, '');
  const posterCandidate = (extras && typeof extras.poster === 'string' && extras.poster) || (supplied && typeof supplied.poster === 'string' && supplied.poster) || (known && known.poster) || '';
  return {
    id: base.id,
    start,
    watchURL: watchURLFor(base.id, start),
    title,
    poster: isLocalSitePath(posterCandidate) ? posterCandidate : '',
    // Source-backed seek labels come from the supplied public catalog, not a
    // restored payload or input object's arbitrary chapter claims.
    chapters: normalizeVideoChapters(supplied?.chapters ?? known?.chapters, language)
  };
}
