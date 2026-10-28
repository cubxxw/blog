// Presentation is temporary: compact screens must not rewrite a desktop layout.
export const usesSingleWindow = width => Number.isFinite(width) && width <= 1000;

export function readingURLMap(documents = []) {
  const urls = new Map();
  for (const article of documents) {
    urls.set(article.url,article.url);
    for (const alias of article.aliases || []) urls.set(alias,article.url);
  }
  return urls;
}
export function restoreReadingURLs(state,urls) {
  return {...state,windows:state.windows.map(win=>win.app === 'reader' ? {...win,payload:urls.get(win.payload) || win.payload} : win),favorites:[...new Set(state.favorites.map(url=>urls.get(url) || url))]};
}

export function selectLibrary({ articles = [], documents = articles, favorites = [], filter = 'all', query = '' } = {}) {
  const saved = new Set(favorites);
  const source = filter === 'favorites' ? documents.filter(article => saved.has(article.url)) : articles;
  const section = filter === 'all' || filter === 'favorites' ? source : source.filter(article => filter === 'lab-notes' ? article.labNotes : article.section === filter);
  const needle = String(query).trim().toLocaleLowerCase();
  const matches = section.filter(article => `${article.title || ''} ${article.description || ''} ${(article.tags || []).join(' ')}`.toLocaleLowerCase().includes(needle));
  return { matches, total: section.length, searching: Boolean(needle) };
}
