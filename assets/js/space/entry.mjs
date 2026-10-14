export function languageDestination(language, routes, currentURL) {
  if (!['zh', 'en'].includes(language)) return null;
  const path = routes?.[language];
  try {
    const current = new URL(currentURL);
    const prefix = current.pathname.match(/^(\/(?:[^/]+\/)*?)(?:(?:zh|en)\/)?projects\/$/)?.[1];
    if (!prefix) return null;
    const allowed = language === 'en' ? [`${prefix}projects/`, `${prefix}en/projects/`] : [`${prefix}zh/projects/`];
    if (!allowed.includes(path)) return null;
    const target = new URL(path, current.origin);
    if (target.origin !== current.origin || target.pathname !== path) return null;
    target.search = current.search;
    target.hash = current.hash;
    return target.href;
  } catch { return null; }
}

export function canAnimateEntry({ reducedMotion, coarsePointer, saveData, width, visible }) {
  return !reducedMotion && !coarsePointer && !saveData && width > 640 && visible === true;
}
