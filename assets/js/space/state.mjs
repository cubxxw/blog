// The durable workspace contains values, never DOM nodes, credentials or executable code.
export const APPS = ['welcome', 'browser', 'products', 'reader', 'photos', 'map', 'books', 'notes', 'contact', 'terminal', 'agent', 'settings'];
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function fitRect(rect = {}, viewport = {}) {
  const availableWidth = Math.max(280, finite(viewport.width, 1280));
  const availableHeight = Math.max(240, finite(viewport.height, 800) - 100);
  const width = clamp(finite(rect.width, 620), Math.min(320, availableWidth), availableWidth);
  const height = clamp(finite(rect.height, 470), Math.min(260, availableHeight), availableHeight);
  return { x: clamp(finite(rect.x, 150), 0, availableWidth - width), y: clamp(finite(rect.y, 70), 0, availableHeight - height), width, height };
}
// Plan against the real desktop, before fitRect can enlarge undersized cells.
// The 100px lower chrome reserve matches fitRect's usable workspace height.
export function planWindowArrangement(state, viewport = {}) {
  // Focus changes z-order, not the visitor's spatial arrangement. Sort only
  // this copy so arranging again cannot shuffle windows after editing one.
  const visible = state.windows.filter(win => !win.minimized).sort((a,b) =>
    a.rect.y - b.rect.y || a.rect.x - b.rect.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const width = finite(viewport.width, 1280), height = finite(viewport.height, 800);
  if (!visible.length || width <= 640) return { mode: 'overview', rectangles: [] };
  const preferred = Math.min(2, visible.length);
  const candidates = [...new Set([preferred, ...visible.map((_, i) => i + 1)])];
  for (const columns of candidates) {
    const rows = Math.ceil(visible.length / columns);
    const cellWidth = (width - 16 - (columns - 1) * 4) / columns;
    const cellHeight = (height - 100 - 20 - (rows - 1) * 4) / rows;
    if (cellWidth < 320 || cellHeight < 260) continue;
    return {
      mode: 'tile',
      rectangles: visible.map((win, i) => ({
        id: win.id,
        rect: { x: 8 + (i % columns) * (cellWidth + 4), y: 12 + Math.floor(i / columns) * (cellHeight + 4), width: cellWidth, height: cellHeight },
      })),
    };
  }
  return { mode: 'overview', rectangles: [] };
}
function seed() {
  return { version: 1, windows: [], active: null, note: '', draft: '', favorites: [], theme: 'light', wallpaper: 'dawn', initialized: false };
}
export function createWorkspace(saved, viewport) {
  let raw = saved;
  try { if (typeof saved === 'string') raw = saved.length < 200000 ? JSON.parse(saved) : null; } catch { raw = null; }
  const result = seed();
  if (!raw || raw.version !== 1) return result;
  const used = new Set();
  for (const w of (Array.isArray(raw.windows) ? raw.windows : []).slice(0, 16)) {
    if (!w || !APPS.includes(w.app)) continue;
    const id = typeof w.id === 'string' && /^[\w:/.-]{1,300}$/.test(w.id) ? w.id : w.app;
    if (used.has(id)) continue;
    used.add(id);
    result.windows.push({ id, app: w.app, payload: typeof w.payload === 'string' ? w.payload.slice(0, 1000) : '', rect: fitRect(w.rect, viewport), minimized: !!w.minimized, maximized: !!w.maximized });
  }
  result.active = result.windows.some(w => w.id === raw.active && !w.minimized) ? raw.active : result.windows.filter(w => !w.minimized).at(-1)?.id || null;
  result.note = typeof raw.note === 'string' ? raw.note.slice(0, 40000) : '';
  result.draft = typeof raw.draft === 'string' ? raw.draft.slice(0, 6000) : '';
  result.favorites = Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(v => typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')).map(v => v.slice(0, 500)))].slice(0, 200) : [];
  result.theme = raw.theme === 'dark' ? 'dark' : 'light';
  result.wallpaper = ['dawn', 'dusk', 'forest'].includes(raw.wallpaper) ? raw.wallpaper : 'dawn';
  result.initialized = !!raw.initialized;
  return result;
}
export function reduceWorkspace(state, action, viewport) {
  const next = { ...state, windows: state.windows.map(w => ({ ...w, rect: { ...w.rect } })) };
  const id = action.id || action.app;
  let w = next.windows.find(win => win.id === id);
  if (action.type === 'open') {
    if (!APPS.includes(action.app)) return state;
    if (!w) {
      if (next.windows.length >= 16) return state;
      const n = next.windows.length;
      w = { id, app: action.app, payload: action.payload || '', rect: fitRect(action.rect || { x: 140 + n * 34, y: 50 + n * 24, width: 640, height: 480 }, viewport), minimized: false, maximized: false };
      next.windows.push(w);
    }
    if (action.payload !== undefined) w.payload = action.payload;
    w.minimized = false;
    next.active = id;
    next.windows = next.windows.filter(win => win.id !== id).concat(w);
  } else if (action.type === 'close') {
    next.windows = next.windows.filter(win => win.id !== id);
  } else if (action.type === 'minimize' && w) {
    w.minimized = true;
  } else if (action.type === 'focus' && w && !w.minimized) {
    next.active = id;
    next.windows = next.windows.filter(win => win.id !== id).concat(w);
  } else if (action.type === 'maximize' && w) {
    w.maximized = !w.maximized;
  } else if (action.type === 'geometry' && w) {
    w.rect = fitRect(action.rect, viewport);
    w.maximized = false;
  } else if (action.type === 'arrange') {
    const plan = planWindowArrangement(state, viewport);
    if (plan.mode !== 'tile') return state;
    plan.rectangles.forEach(({ id, rect }) => {
      const win = next.windows.find(win => win.id === id);
      win.rect = rect;
      win.maximized = false;
    });
  } else if (action.type === 'viewport') {
    next.windows.forEach(win => { win.rect = fitRect(win.rect, viewport); });
  } else if (action.type === 'note') next.note = String(action.text).slice(0, 40000);
  else if (action.type === 'draft') next.draft = String(action.text).slice(0, 6000);
  else if (action.type === 'favorite' && typeof action.url === 'string' && action.url.startsWith('/') && !action.url.startsWith('//')) {
    next.favorites = next.favorites.includes(action.url) ? next.favorites.filter(v => v !== action.url) : [...next.favorites, action.url].slice(-200);
  } else if (action.type === 'theme') next.theme = action.value === 'dark' ? 'dark' : 'light';
  else if (action.type === 'wallpaper') next.wallpaper = ['dawn', 'dusk', 'forest'].includes(action.value) ? action.value : 'dawn';
  else if (action.type === 'initialized') next.initialized = true;
  if (!next.windows.some(win => win.id === next.active && !win.minimized)) next.active = next.windows.filter(win => !win.minimized).at(-1)?.id || null;
  return next;
}
export function serializeWorkspace(state) { return JSON.stringify(createWorkspace(state, { width: 10000, height: 10000 })); }
export function safeURL(value, origin) {
  if (typeof value !== 'string' || value.startsWith('//') || /[\u0000-\u001f\\]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === new URL(origin).origin)) return url.href;
  } catch { /* Invalid links remain inert. */ }
  return null;
}
