// Presentation is temporary: compact screens must not rewrite a desktop layout.
export const usesSingleWindow = width => Number.isFinite(width) && width <= 1000;

export function selectLibrary({ articles = [], documents = articles, favorites = [], filter = 'all', query = '' } = {}) {
  const saved = new Set(favorites);
  const source = filter === 'favorites' ? documents.filter(article => saved.has(article.url)) : articles;
  const section = filter === 'all' || filter === 'favorites' ? source : source.filter(article => article.section === filter);
  const needle = String(query).trim().toLocaleLowerCase();
  const matches = section.filter(article => `${article.title || ''} ${article.description || ''} ${(article.tags || []).join(' ')}`.toLocaleLowerCase().includes(needle));
  return { matches, total: section.length, searching: Boolean(needle) };
}
