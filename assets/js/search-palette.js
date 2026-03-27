(function() {
  const palette = document.getElementById('search-command-palette');
  const input = palette?.querySelector('.search-palette__input');
  const resultsList = document.getElementById('search-results-list');
  const resultCount = document.getElementById('search-result-count');
  const emptyMsg = document.getElementById('search-empty');
  const triggers = document.querySelectorAll('[data-search-trigger], .nav-search-trigger');
  const closeBtn = palette?.querySelector('.search-palette__close');
  const backdrop = palette?.querySelector('.search-palette__backdrop');

  if (!palette) return;

  let fuse, searchData;
  let isOpen = false;

  // Open palette
  function openPalette() {
    palette.removeAttribute('hidden');
    document.body.classList.add('search-palette-open');
    isOpen = true;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'true'));
    setTimeout(() => input.focus(), 10);
    // Lazy load search data
    if (!fuse) loadSearchData();
  }

  // Close palette
  function closePalette() {
    palette.setAttribute('hidden', '');
    document.body.classList.remove('search-palette-open');
    isOpen = false;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    input.value = '';
    resultsList.innerHTML = '';
    resultCount.textContent = '0';
    emptyMsg.hidden = true;
  }

  // Load index.json and initialize Fuse.js
  function loadSearchData() {
    const lang = document.documentElement.lang || 'en';
    const baseUrl = document.querySelector('base')?.href || '/';
    // Remove trailing slash and append index.json
    const indexPath = (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + 'index.json';
    
    fetch(indexPath)
      .then(response => response.json())
      .then(data => {
        searchData = data;
        fuse = new Fuse(searchData, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'content', weight: 0.3 },
            { name: 'summary', weight: 0.15 },
            { name: 'tags', weight: 0.03 },
            { name: 'categories', weight: 0.02 }
          ],
          threshold: 0.3,
          includeMatches: true,
          minMatchCharLength: 1,
          // 中文搜索支持：使用字符级别匹配
          ignoreLocation: true,
          findAllMatches: true,
          // 为中文内容启用 tokenization
          tokenize: true,
          matchAllTokens: false
        });
      })
      .catch(err => console.error('Failed to load search index:', err));
  }

  // Execute search
  function doSearch(query) {
    if (!fuse || !query.trim()) {
      resultsList.innerHTML = '';
      resultCount.textContent = '0';
      emptyMsg.hidden = true;
      return;
    }
    const results = fuse.search(query, { limit: 10 });
    resultCount.textContent = results.length;
    if (results.length === 0) {
      resultsList.innerHTML = '';
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;
    resultsList.innerHTML = results.map((r, i) => `
      <li class="search-palette__result" role="option">
        <a class="search-palette__result-link" href="${r.item.permalink}">
          <span class="search-palette__result-title">${r.item.title}</span>
          <span class="search-palette__result-preview">${r.item.summary || ''}</span>
        </a>
      </li>`).join('');
  }

  // Keyboard shortcuts: Cmd/Ctrl + K to open, Esc to close
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      isOpen ? closePalette() : openPalette();
    }
    if (e.key === 'Escape' && isOpen) {
      closePalette();
    }
  });

  // Click trigger buttons
  triggers.forEach(t => t.addEventListener('click', (e) => {
    e.preventDefault();
    openPalette();
  }));

  // Click to close
  closeBtn?.addEventListener('click', closePalette);
  backdrop?.addEventListener('click', closePalette);

  // Input search event with debounce
  let debounceTimeout;
  input?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => doSearch(e.target.value), 150);
  });
})();
