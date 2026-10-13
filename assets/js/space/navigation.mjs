// Shell navigation is independent of durable window geometry and app rendering.
export const MOBILE_APPS = Object.freeze(['welcome', 'reader', 'products', 'photos', 'agent']);

const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();

export function findApplications(apps, labels, query = '') {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return apps.filter(app => {
    const text = normalize(`${app} ${labels[app] || ''}`);
    return words.every(word => text.includes(word));
  });
}

export function searchWorkspace(catalog, apps, query = '') {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const matches = text => words.every(word => normalize(text).includes(word));
  const appItems = findApplications(apps, catalog.labels || {}, query).map(app => ({ kind: 'app', app, title: catalog.labels?.[app] || app }));
  const products = (catalog.products || []).filter(p => matches(`${p.name} ${p.description}`)).map(p => ({ kind: 'product', app: 'products', payload: p.id, title: p.name, desc: p.stage }));
  const articles = words.length ? (catalog.articles || []).filter(a => matches(`${a.title} ${a.description || ''} ${(a.tags || []).join(' ')}`)).slice(0, 18).map(a => ({ kind: 'article', app: 'reader', payload: a.url, title: a.title, desc: a.date })) : [];
  return [...appItems, ...products, ...articles].slice(0, 24);
}

export function resultIndex(current, direction, count) {
  if (count <= 0) return -1;
  return Math.max(0, Math.min(count - 1, current + direction));
}

export function isEditableTarget(target) {
  return Boolean(target?.isContentEditable || target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
}

export function escapeAction({ searchOpen, launchpadOpen, overviewOpen, menuOpen, editing, hasActive }) {
  if (searchOpen) return 'search';
  if (launchpadOpen) return 'launchpad';
  if (overviewOpen) return 'overview';
  if (menuOpen) return 'menu';
  return !editing && hasActive ? 'minimize' : null;
}
