(function () {
  'use strict';

  var feed = document.getElementById('posts-grid');
  var panel = document.getElementById('library-filter');
  var pagination = document.getElementById('library-pagination');
  if (!feed || !panel || !pagination) return;

  var countEl = document.getElementById('posts-result-count');
  var countGroup = countEl && countEl.parentElement;
  var progressEl = document.getElementById('library-load-progress');
  var loadingEl = document.getElementById('library-loading');
  var statusEl = document.getElementById('library-filter-status');
  var clearBtn = document.getElementById('filter-clear');
  var sortSelect = document.getElementById('filter-sort');
  var toggleBtn = document.getElementById('filter-toggle');
  var collapsible = document.getElementById('filter-collapsible');
  var badgeEl = document.getElementById('filter-active-count');
  var loadSentinel = document.getElementById('library-load-sentinel');
  var nextLink = pagination.querySelector('[data-posts-next]');
  var lanes = {
    ai: feed.querySelector('[data-library-lane="ai"]'),
    life: feed.querySelector('[data-library-lane="life"]')
  };
  var laneFeeds = {
    ai: feed.querySelector('[data-lane-feed="ai"]'),
    life: feed.querySelector('[data-lane-feed="life"]')
  };
  var total = Number(feed.getAttribute('data-total')) || 0;
  var pageNumber = Number(feed.getAttribute('data-page-number')) || 1;
  var pageURLs = decodeURIComponent(feed.getAttribute('data-page-urls') || '').split('|').filter(Boolean);
  var forwardURLs = pageURLs.slice(pageNumber);
  var loadedURLs = Object.create(null);
  var loadingPromise = null;
  var bulkPromise = null;

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = {
    category: 'all',
    tags: [],
    sort: 'newest'
  };

  var cards = [];
  var categoryBtns = Array.prototype.slice.call(
    document.querySelectorAll('#filter-categories .library-filter__chip')
  );
  var tagBtns = Array.prototype.slice.call(
    document.querySelectorAll('#filter-tags .library-filter__chip--tag')
  );
  var scrollShells = Array.prototype.slice.call(
    panel.querySelectorAll('[data-filter-scroll]')
  );

  function syncScrollAffordance(shell) {
    var track = shell.querySelector('[data-filter-scroll-track]');
    var hint = shell.querySelector('[data-filter-scroll-hint]');
    if (!track || !hint) return;
    var overflowing = track.scrollWidth > track.clientWidth + 2;
    var atEnd = !overflowing ||
      track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    shell.classList.toggle('is-overflowing', overflowing);
    shell.classList.toggle('is-at-end', atEnd);
    hint.hidden = !overflowing || atEnd;
  }

  function syncAllScrollAffordances() {
    scrollShells.forEach(syncScrollAffordance);
  }

  scrollShells.forEach(function (shell) {
    var track = shell.querySelector('[data-filter-scroll-track]');
    if (!track) return;
    track.addEventListener('scroll', function () {
      syncScrollAffordance(shell);
    }, { passive: true });
    track.addEventListener('keydown', function (event) {
      if (event.target !== track ||
          (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
      event.preventDefault();
      track.scrollBy({
        left: (event.key === 'ArrowRight' ? 1 : -1) * Math.max(120, track.clientWidth * 0.6),
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
  });

  if ('ResizeObserver' in window) {
    var filterResizeObserver = new ResizeObserver(syncAllScrollAffordances);
    scrollShells.forEach(function (shell) {
      var track = shell.querySelector('[data-filter-scroll-track]');
      if (track) filterResizeObserver.observe(track);
    });
  } else {
    window.addEventListener('resize', syncAllScrollAffordances, { passive: true });
  }

  function normalizedPath(url) {
    return new URL(url, window.location.href).pathname.replace(/\/+$/, '/');
  }

  loadedURLs[normalizedPath(window.location.href)] = true;

  function refreshCards() {
    cards = Array.prototype.slice.call(feed.querySelectorAll('[data-library-card]'));
  }

  function activeFilterCount() {
    return (state.category === 'all' ? 0 : 1) + state.tags.length;
  }

  function cardLane(card) {
    return card.getAttribute('data-section') === 'growth' ? 'life' : 'ai';
  }

  function distributeCards(items) {
    var fragments = {
      ai: document.createDocumentFragment(),
      life: document.createDocumentFragment()
    };
    items.forEach(function (card) {
      fragments[cardLane(card)].appendChild(card);
    });
    if (laneFeeds.ai) laneFeeds.ai.appendChild(fragments.ai);
    if (laneFeeds.life) laneFeeds.life.appendChild(fragments.life);
  }

  function syncControls() {
    categoryBtns.forEach(function (button) {
      var active = button.getAttribute('data-category') === state.category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    tagBtns.forEach(function (button) {
      var active = state.tags.indexOf(button.getAttribute('data-tag')) !== -1;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (sortSelect) sortSelect.value = state.sort;
    var activeCount = activeFilterCount();
    if (clearBtn) clearBtn.hidden = activeCount === 0 && state.sort === 'newest';
    if (badgeEl) {
      badgeEl.textContent = activeCount;
      badgeEl.hidden = activeCount === 0;
    }
  }

  function syncURL() {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams(window.location.search);
    if (state.category === 'all') params.delete('cat');
    else params.set('cat', state.category);
    if (state.tags.length) params.set('tags', state.tags.join(','));
    else params.delete('tags');
    if (state.sort === 'newest') params.delete('sort');
    else params.set('sort', state.sort);
    var query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
  }

  function initFromURL() {
    var params = new URLSearchParams(window.location.search);
    var category = params.get('cat');
    if (category) {
      categoryBtns.some(function (button) {
        if (button.getAttribute('data-category') !== category) return false;
        state.category = category;
        return true;
      });
    }

    var requestedTags = (params.get('tags') || '').split(',').filter(Boolean);
    tagBtns.forEach(function (button) {
      var tag = button.getAttribute('data-tag');
      if (requestedTags.indexOf(tag) !== -1) state.tags.push(tag);
    });

    if (params.get('sort') === 'oldest') state.sort = 'oldest';
    syncControls();
  }

  function cardMatches(card) {
    if (state.category !== 'all' && card.getAttribute('data-section') !== state.category) {
      return false;
    }
    var cardTags = (card.getAttribute('data-tags') || '').split(',');
    return state.tags.every(function (tag) {
      return cardTags.indexOf(tag) !== -1;
    });
  }

  function applyFilters() {
    var visible = 0;
    var visibleByLane = { ai: 0, life: 0 };
    var featuredByLane = { ai: null, life: null };
    cards.forEach(function (card) {
      var show = cardMatches(card);
      var laneName = cardLane(card);
      card.hidden = !show;
      card.classList.remove('library-card--featured');
      if (show) {
        visible += 1;
        visibleByLane[laneName] += 1;
        if (!featuredByLane[laneName]) featuredByLane[laneName] = card;
      }
    });

    Object.keys(lanes).forEach(function (laneName) {
      var lane = lanes[laneName];
      if (!lane) return;
      lane.hidden = visibleByLane[laneName] === 0;
      var laneCount = lane.querySelector('[data-lane-result]');
      if (laneCount) {
        laneCount.textContent = activeFilterCount()
          ? visibleByLane[laneName]
          : (Number(lane.getAttribute('data-lane-total')) || visibleByLane[laneName]);
      }
      if (featuredByLane[laneName]) {
        featuredByLane[laneName].classList.add('library-card--featured');
      }
    });

    var visibleLaneCount = Object.keys(lanes).filter(function (laneName) {
      return visibleByLane[laneName] > 0;
    }).length;
    feed.classList.toggle('is-empty', visible === 0);
    feed.classList.toggle('is-single-lane', visibleLaneCount === 1);
    if (countEl) {
      var resultCount = activeFilterCount() ? visible : total;
      countEl.textContent = resultCount;
      if (countGroup) {
        countGroup.setAttribute(
          'aria-label',
          resultCount + ' ' + (countGroup.getAttribute('data-articles-label') || '')
        );
      }
    }
    return visible;
  }

  function sortCards() {
    cards.sort(function (a, b) {
      var aDate = a.getAttribute('data-date') || '';
      var bDate = b.getAttribute('data-date') || '';
      if (aDate === bDate) return 0;
      if (state.sort === 'oldest') return aDate < bDate ? -1 : 1;
      return aDate > bDate ? -1 : 1;
    });
    distributeCards(cards);
  }

  function setProgress() {
    if (!progressEl) return;
    var complete = cards.length >= total;
    var isZh = document.documentElement.lang === 'zh';
    progressEl.innerHTML = complete
      ? (isZh ? '已显示全部 <strong>' + total + '</strong> 篇文章' : 'Showing all <strong>' + total + '</strong> articles')
      : (isZh ? '已显示 <strong>' + cards.length + '</strong> / ' + total : 'Showing <strong>' + cards.length + '</strong> / ' + total);
  }

  function syncNextLink() {
    while (forwardURLs.length && loadedURLs[normalizedPath(forwardURLs[0])]) {
      forwardURLs.shift();
    }
    if (!forwardURLs.length) {
      if (nextLink) nextLink.hidden = true;
      return;
    }
    if (nextLink) {
      nextLink.href = forwardURLs[0];
      nextLink.hidden = false;
    }
  }

  function setLoading(loading, bulk) {
    if (loadingEl) loadingEl.hidden = !loading;
    if (nextLink) {
      if (loading) nextLink.setAttribute('aria-busy', 'true');
      else nextLink.removeAttribute('aria-busy');
    }
    if (bulk && statusEl) {
      statusEl.textContent = loading ? feed.getAttribute('data-loading-all') : '';
    }
    panel.setAttribute('aria-busy', loading && bulk ? 'true' : 'false');
  }

  function appendDocument(doc, animate) {
    var incomingFeed = doc.getElementById('posts-grid');
    if (!incomingFeed) throw new Error('Article feed missing');
    var knownLinks = Object.create(null);
    cards.forEach(function (card) {
      var link = card.querySelector('.library-card__link');
      if (link) knownLinks[normalizedPath(link.href)] = true;
    });

    var incoming = Array.prototype.slice.call(
      incomingFeed.querySelectorAll('[data-library-card]')
    ).filter(function (card) {
      var link = card.querySelector('.library-card__link');
      return link && !knownLinks[normalizedPath(link.href)];
    });

    incoming.forEach(function (card, index) {
      if (animate && !prefersReducedMotion) {
        card.classList.add('is-entering');
        card.style.setProperty('--entry-index', String(Math.min(index, 4)));
      }
    });
    distributeCards(incoming);
    refreshCards();
    setProgress();

    if (animate && !prefersReducedMotion) {
      window.setTimeout(function () {
        incoming.forEach(function (card) {
          card.classList.remove('is-entering');
          card.style.removeProperty('--entry-index');
        });
      }, 900);
    }
  }

  function fetchPage(url, options) {
    options = options || {};
    var path = normalizedPath(url);
    if (loadedURLs[path]) return Promise.resolve(false);
    var requestURL = window.location.origin + path;

    return fetch(requestURL, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      loadedURLs[path] = true;
      appendDocument(doc, options.animate !== false);
      return true;
    });
  }

  function loadNext() {
    syncNextLink();
    if (!forwardURLs.length) return Promise.resolve(false);
    if (loadingPromise) return loadingPromise;
    var url = forwardURLs[0];
    setLoading(true, false);
    loadingPromise = fetchPage(url, { animate: true }).then(function (loaded) {
      if (loaded) forwardURLs.shift();
      syncNextLink();
      applyFilters();
      return loaded;
    }).catch(function () {
      if (statusEl) {
        statusEl.textContent = document.documentElement.lang === 'zh'
          ? '加载失败，请点击“加载下一组”重试。'
          : 'Loading failed. Use “Load the next set” to retry.';
      }
      return false;
    }).then(function (result) {
      setLoading(false, false);
      loadingPromise = null;
      return result;
    });
    return loadingPromise;
  }

  function loadCompleteIndex() {
    if (cards.length >= total) return Promise.resolve();
    if (bulkPromise) return bulkPromise;
    var missing = pageURLs.filter(function (url) {
      return !loadedURLs[normalizedPath(url)];
    });
    setLoading(true, true);

    var cursor = 0;
    function worker() {
      if (cursor >= missing.length) return Promise.resolve();
      var url = missing[cursor];
      cursor += 1;
      return fetchPage(url, { animate: false }).then(worker);
    }
    var workers = [];
    for (var index = 0; index < Math.min(3, missing.length); index += 1) {
      workers.push(worker());
    }

    bulkPromise = Promise.all(workers).then(function () {
      refreshCards();
      sortCards();
      applyFilters();
      setProgress();
      syncNextLink();
      setLoading(false, true);
      bulkPromise = null;
    }).catch(function () {
      setLoading(false, true);
      if (statusEl) {
        statusEl.textContent = document.documentElement.lang === 'zh'
          ? '完整索引暂时没有载入，请稍后重试。'
          : 'The full index could not be loaded. Please try again.';
      }
      bulkPromise = null;
    });
    return bulkPromise;
  }

  function runAccurateFilter() {
    applyFilters();
    if (cards.length < total) return loadCompleteIndex();
    sortCards();
    applyFilters();
    return Promise.resolve();
  }

  function togglePanel(force) {
    var open = typeof force === 'boolean' ? force : !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (collapsible) {
      collapsible.setAttribute('aria-hidden', open ? 'false' : 'true');
      collapsible.inert = !open;
    }
    window.requestAnimationFrame(syncAllScrollAffordances);
    window.setTimeout(syncAllScrollAffordances, 280);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () { togglePanel(); });
  }

  categoryBtns.forEach(function (button) {
    button.addEventListener('click', function () {
      state.category = button.getAttribute('data-category');
      syncControls();
      syncURL();
      runAccurateFilter();
    });
  });

  tagBtns.forEach(function (button) {
    button.addEventListener('click', function () {
      var tag = button.getAttribute('data-tag');
      var index = state.tags.indexOf(tag);
      if (index === -1) state.tags.push(tag);
      else state.tags.splice(index, 1);
      syncControls();
      syncURL();
      runAccurateFilter();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      state.sort = sortSelect.value;
      syncControls();
      syncURL();
      if (state.sort === 'oldest') loadCompleteIndex();
      else {
        sortCards();
        applyFilters();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      state.category = 'all';
      state.tags = [];
      state.sort = 'newest';
      syncControls();
      syncURL();
      sortCards();
      applyFilters();
      if (statusEl) statusEl.textContent = '';
    });
  }

  if (nextLink) {
    nextLink.addEventListener('click', function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      loadNext();
    });
  }

  if ('IntersectionObserver' in window && loadSentinel) {
    var loadObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && activeFilterCount() === 0 && state.sort === 'newest') {
        loadNext();
      }
    }, { rootMargin: '900px 0px', threshold: 0 });
    loadObserver.observe(loadSentinel);
  }

  refreshCards();
  initFromURL();
  applyFilters();
  setProgress();
  syncNextLink();
  syncAllScrollAffordances();

  if (activeFilterCount() > 0 || state.sort === 'oldest') {
    loadCompleteIndex();
  }
})();
