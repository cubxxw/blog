(function () {
  'use strict';

  var grid = document.getElementById('posts-grid');
  var countEl = document.getElementById('posts-visible-count');
  var clearBtn = document.getElementById('filter-clear');
  var sortSelect = document.getElementById('filter-sort');
  var panel = document.getElementById('posts-filter');
  var toggleBtn = document.getElementById('filter-toggle');
  var badgeEl = document.getElementById('filter-active-count');
  var sentinel = document.querySelector('.posts-filter-sentinel');
  var header = document.querySelector('.header-wrapper');
  if (!grid || !panel) return;

  var articles = Array.prototype.slice.call(grid.querySelectorAll('.post-entry'));
  var categoryBtns = Array.prototype.slice.call(
    document.querySelectorAll('#filter-categories .posts-filter__chip')
  );
  var tagBtns = Array.prototype.slice.call(
    document.querySelectorAll('#filter-tags .posts-filter__chip--tag')
  );

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = {
    category: 'all',
    tags: [],
    sort: 'newest'
  };

  /* ── Filtering & sorting ─────────────────────────────────── */

  function applyFilters() {
    var visible = 0;

    articles.forEach(function (el) {
      var section = el.getAttribute('data-section');
      var tagsStr = el.getAttribute('data-tags') || '';
      var articleTags = tagsStr ? tagsStr.split(',') : [];

      var catMatch = state.category === 'all' || section === state.category;

      var tagMatch = true;
      for (var i = 0; i < state.tags.length; i++) {
        if (articleTags.indexOf(state.tags[i]) === -1) {
          tagMatch = false;
          break;
        }
      }

      var show = catMatch && tagMatch;
      el.classList.toggle('posts-entry--hidden', !show);
      if (show) visible++;
    });

    if (countEl) countEl.textContent = visible;

    grid.classList.toggle('posts-grid--empty', visible === 0);

    var activeCount = (state.category !== 'all' ? 1 : 0) + state.tags.length;
    if (clearBtn) clearBtn.style.display = activeCount > 0 ? '' : 'none';
    if (badgeEl) {
      badgeEl.textContent = activeCount;
      badgeEl.hidden = activeCount === 0;
    }
  }

  function applySorting() {
    var sorted = articles.slice().sort(function (a, b) {
      var da = a.getAttribute('data-date');
      var db = b.getAttribute('data-date');
      return state.sort === 'newest' ? (db > da ? 1 : db < da ? -1 : 0) : (da > db ? 1 : da < db ? -1 : 0);
    });

    sorted.forEach(function (el) {
      grid.appendChild(el);
    });
  }

  /* ── URL state (shareable filters) ───────────────────────── */

  function syncURL() {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams(window.location.search);
    if (state.category === 'all') params.delete('cat');
    else params.set('cat', state.category);
    if (state.tags.length) params.set('tags', state.tags.join(','));
    else params.delete('tags');
    if (state.sort === 'newest') params.delete('sort');
    else params.set('sort', state.sort);
    var q = params.toString();
    history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
  }

  function initFromURL() {
    var params = new URLSearchParams(window.location.search);

    var cat = params.get('cat');
    if (cat) {
      categoryBtns.forEach(function (b) {
        if (b.getAttribute('data-category') === cat) state.category = cat;
      });
    }

    var tags = (params.get('tags') || '').split(',').filter(Boolean);
    tagBtns.forEach(function (b) {
      if (tags.indexOf(b.getAttribute('data-tag')) !== -1) {
        state.tags.push(b.getAttribute('data-tag'));
      }
    });

    if (params.get('sort') === 'oldest') state.sort = 'oldest';

    // Reflect state onto the controls
    categoryBtns.forEach(function (b) {
      var isActive = b.getAttribute('data-category') === state.category;
      b.classList.toggle('posts-filter__chip--active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    tagBtns.forEach(function (b) {
      var isActive = state.tags.indexOf(b.getAttribute('data-tag')) !== -1;
      b.classList.toggle('posts-filter__chip--active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (sortSelect) sortSelect.value = state.sort;
  }

  /* ── Sticky "stuck" behaviour ────────────────────────────── */

  function isSticky() {
    return window.getComputedStyle(panel).position === 'sticky';
  }

  function setStuck(stuck) {
    panel.classList.toggle('posts-filter--stuck', stuck);
    if (toggleBtn) toggleBtn.hidden = !stuck;
    if (!stuck) setOpen(false);
  }

  function setOpen(open) {
    panel.classList.toggle('posts-filter--open', open);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      // Stuck = sentinel has scrolled above the sticky line (not merely off-screen below)
      var stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0 && isSticky();
      setStuck(stuck);
    }, { rootMargin: '-90px 0px 0px 0px', threshold: 0 }).observe(sentinel);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      setOpen(!panel.classList.contains('posts-filter--open'));
    });
  }

  // Track the auto-hiding site header: when it slides away, raise the stuck
  // bar to the top so cards never scroll through a gap above the filter.
  if (header) {
    var rafPending = false;
    window.addEventListener('scroll', function () {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        panel.classList.toggle('posts-filter--raised',
          header.classList.contains('nav-scroll-hidden'));
      });
    }, { passive: true });
  }

  // After changing filters from the stuck bar, bring the result list back
  // into view — otherwise the user may be stranded past the shortened grid.
  function scrollToResultsIfStuck() {
    if (!panel.classList.contains('posts-filter--stuck')) return;
    var top = grid.getBoundingClientRect().top + window.pageYOffset - panel.offsetHeight - 96;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  /* ── Event wiring ────────────────────────────────────────── */

  categoryBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-category');
      state.category = cat;

      categoryBtns.forEach(function (b) {
        var isActive = b.getAttribute('data-category') === cat;
        b.classList.toggle('posts-filter__chip--active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      applyFilters();
      syncURL();
      scrollToResultsIfStuck();
    });
  });

  tagBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tag = btn.getAttribute('data-tag');
      var idx = state.tags.indexOf(tag);

      if (idx === -1) {
        state.tags.push(tag);
        btn.classList.add('posts-filter__chip--active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        state.tags.splice(idx, 1);
        btn.classList.remove('posts-filter__chip--active');
        btn.setAttribute('aria-pressed', 'false');
      }

      applyFilters();
      syncURL();
      scrollToResultsIfStuck();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      state.sort = sortSelect.value;
      applySorting();
      syncURL();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      state.category = 'all';
      state.tags = [];
      if (sortSelect) sortSelect.value = 'newest';
      state.sort = 'newest';

      categoryBtns.forEach(function (b) {
        var isAll = b.getAttribute('data-category') === 'all';
        b.classList.toggle('posts-filter__chip--active', isAll);
        b.setAttribute('aria-pressed', isAll ? 'true' : 'false');
      });

      tagBtns.forEach(function (b) {
        b.classList.remove('posts-filter__chip--active');
        b.setAttribute('aria-pressed', 'false');
      });

      applySorting();
      applyFilters();
      syncURL();
    });
  }

  /* ── Init ────────────────────────────────────────────────── */

  initFromURL();
  if (state.sort !== 'newest') applySorting();
  applyFilters();
})();
