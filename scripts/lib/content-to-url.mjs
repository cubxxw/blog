// Reverse-engineer the URLs that Hugo will publish for a set of changed
// `content/**/*.md` file paths — used by push scripts that want to notify
// search engines about the exact files changed in a commit, rather than a
// blunt "everything from the last N days".
//
// Rules mirror this repo's Hugo config (defaultContentLanguageInSubdir: false):
//   content/en/growth/posts/foo.md     → https://cubxxw.com/growth/posts/foo/
//   content/zh/growth/posts/foo.md     → https://cubxxw.com/zh/growth/posts/foo/
//   content/en/ai-technology/_index.md → https://cubxxw.com/ai-technology/
//   content/zh/ai-technology/_index.md → https://cubxxw.com/zh/ai-technology/
//
// Anything outside `content/<lang>/` is ignored (layouts, static, config).

const SITE = 'https://cubxxw.com';
const DEFAULT_LANG = 'en'; // matches config.yml `defaultContentLanguage`

export function contentPathToUrl(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'content' || parts.length < 3) return null;
  const lang = parts[1];
  if (lang !== 'en' && lang !== 'zh') return null;

  let rest = parts.slice(2);

  const last = rest[rest.length - 1];
  if (!last.endsWith('.md')) return null;
  const stem = last.slice(0, -3);
  if (stem === '_index' || stem === 'index') {
    rest = rest.slice(0, -1);
  } else {
    rest[rest.length - 1] = stem;
  }

  const langPrefix = lang === DEFAULT_LANG ? '' : `${lang}/`;
  const tail = rest.join('/');
  const path_ = tail ? `${langPrefix}${tail}/` : langPrefix;
  return `${SITE}/${path_}`;
}

export function contentPathsToUrls(paths) {
  const seen = new Set();
  for (const p of paths) {
    const u = contentPathToUrl(p);
    if (u) seen.add(u);
  }
  return [...seen];
}
