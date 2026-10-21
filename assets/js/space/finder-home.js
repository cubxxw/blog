export function mountFinderHome({ root, host, catalog, execute, getState, escapeHTML, icon, payload }) {
  const html = escapeHTML;
  const t = (cn, en) => catalog.language === 'zh' ? cn : en;
  const folders = [
    ['products', t('作品', 'Projects'), ''],
    ['reader', t('文章与思考', 'Writing'), ''],
    ['photos', t('旅途相册', 'Photographs'), ''],
    ['books', t('书架', 'Books'), ''],
    ['notes', t('笔记', 'Notes'), ''],
    ['welcome', t('关于我', 'About me'), 'identity'],
  ];
  const route = (app, label, value = '', className = '', current = false) => `<button type="button"${className ? ` class="${className}"` : ''} data-open="${html(app)}" data-payload="${html(value)}"${current ? ' aria-current="page"' : ''}>${icon(app)}<span>${html(label)}</span></button>`;
  host.innerHTML = `<article class="space-welcome space-finder-home" data-finder-home data-finder-view="home"><div class="space-finder-home__overview"><header class="space-finder-toolbar"><strong>${t('我的空间', 'My Space')}</strong><button type="button" data-space-search-trigger aria-haspopup="dialog">${t('搜索', 'Search')} <span aria-hidden="true">⌕</span></button></header><div class="space-finder-home__body"><aside class="space-finder-home__sidebar"><p>${t('个人收藏', 'Favorites')}</p><nav aria-label="${t('个人收藏', 'Favorites')}">${route('welcome', t('我的空间', 'My Space'), '', '', true)}${folders.map(([app, label, value]) => route(app, label, value)).join('')}</nav></aside><div class="space-finder-home__files" aria-label="${t('我的空间文件夹', 'My Space folders')}">${folders.map(([app, label, value]) => `<button type="button" class="space-finder-home__item" data-open="${html(app)}" data-payload="${html(value)}"><span class="finder-folder" aria-hidden="true">${icon(app)}</span><strong>${html(label)}</strong></button>`).join('')}</div></div><footer class="space-finder-status space-welcome__foot"><span>${t(`${folders.length} 个项目`, `${folders.length} items`)}</span><button type="button" data-open="welcome" data-payload="identity">${t('关于我', 'About me')}</button></footer></div></article>`;

  const article = host.querySelector('[data-finder-home]');
  const overview = host.querySelector('.space-finder-home__overview');
  const template = root.querySelector('[data-space-profile-template]');
  const windowElement = host.closest('[data-space-window]');
  const windowID = windowElement?.dataset.spaceWindow || 'welcome';
  const controller = new AbortController();
  let disposed = false;
  let focusFrame = 0;

  if (template) {
    const fragment = template.content.cloneNode(true);
    // Route sections retain their identity without colliding with the page's
    // native anchors when the language or a saved window is restored.
    const ids = new Map();
    fragment.querySelectorAll('[data-profile-section]').forEach(section => {
      const id = section.id || section.dataset.profileSection;
      ids.set(id, `space-profile-${id}`);
      section.id = ids.get(id);
    });
    fragment.querySelectorAll('a[href^="#"]').forEach(link => {
      const target = ids.get(link.hash.slice(1));
      if (target) link.setAttribute('href', `#${target}`);
    });
    const profileView = document.createElement('div');
    profileView.className = 'space-finder-profile';
    profileView.hidden = true;
    profileView.innerHTML = `<header class="space-finder-toolbar"><button type="button" data-finder-return>← ${t('我的空间', 'My Space')}</button><strong>${t('关于我', 'About me')}</strong></header>`;
    profileView.append(fragment);
    article.append(profileView);
    const profile = profileView.querySelector('[data-space-profile]');
    const reveal = value => {
      const target = [...profileView.querySelectorAll('[data-profile-section]')]
        .find(section => section.dataset.profileSection === value);
      if (!profile || !target || disposed) return;
      cancelAnimationFrame(focusFrame);
      const focused = document.activeElement;
      overview.hidden = true;
      profileView.hidden = false;
      article.dataset.finderView = 'profile';
      profile.open = true;
      if (value === 'start-here') target.querySelector('details')?.setAttribute('open', '');
      target.tabIndex = -1;
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        const state = getState();
        const win = state.windows?.find(win => win.id === windowID);
        if (disposed || !host.isConnected || state.active !== windowID || win?.minimized) return;
        // A dialog or a newer deliberate focus choice keeps keyboard ownership.
        if (![focused, windowElement, document.body, target].includes(document.activeElement)) return;
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
        target.focus({ preventScroll: true });
      });
    };
    profileView.querySelectorAll('[data-profile-target]').forEach(control => {
      control.addEventListener('click', () => reveal(control.dataset.profileTarget), { signal: controller.signal });
    });
    profileView.querySelector('[data-finder-return]').addEventListener('click', () => {
      cancelAnimationFrame(focusFrame);
      execute('open', { app: 'welcome', payload: '' });
    }, { signal: controller.signal });
    if (payload) reveal(payload);
  }

  return () => {
    disposed = true;
    cancelAnimationFrame(focusFrame);
    controller.abort();
  };
}
