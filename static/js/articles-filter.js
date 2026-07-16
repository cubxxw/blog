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

  /* ── Reveal-vs-filter reconciliation ─────────────────────────
   * The cards double as scroll-reveal targets (micro-interactions.js:
   * REVEAL_SELECTOR includes .post-entry). Its IntersectionObserver only
   * un-hides cards that have *entered the viewport*; everything further down
   * stays at the initial `opacity:0; translateY(16px)` state until scrolled
   * to. Filtering re-flows the grid with display:none, which yanks those
   * never-seen cards up into view — where they fire their entrance animation
   * one by one. That is the flicker: a filter (reorganising existing content)
   * masquerading as a first paint (content arriving).
   *
   * Fix: the moment the reader touches a filter control, promote every card
   * to its revealed state and flag the grid so the reveal transition can't
   * replay. From then on the grid is "settled" — re-flows are silent. */
  var revealNeutralized = false;
  function neutralizeReveal() {
    if (revealNeutralized) return;
    revealNeutralized = true;
    articles.forEach(function (el) {
      el.classList.add('is-revealed');
    });
    grid.classList.add('posts-grid--settled');
  }

  /* ── FLIP: smooth re-layout on filter / sort ─────────────────
   * apple-design §3: reorganising on-screen content should move continuously,
   * not jump. Capture each surviving card's box before the DOM mutates, then
   * play the delta back as a transform that eases to zero — the cards glide
   * to their new grid slots instead of teleporting. */
  function measure() {
    var rects = {};
    articles.forEach(function (el, i) {
      if (!el.classList.contains('posts-entry--hidden')) {
        rects[i] = el.getBoundingClientRect();
      }
    });
    return rects;
  }

  var FLIP_MS = 360; // must match the .posts-entry--flipping transition duration
  function playFlip(prevRects) {
    if (prefersReducedMotion) return;
    articles.forEach(function (el, i) {
      if (el.classList.contains('posts-entry--hidden')) return;
      var prev = prevRects[i];
      if (!prev) return; // newly shown card — let it cross-fade in, no slide
      var next = el.getBoundingClientRect();
      var dx = prev.left - next.left;
      var dy = prev.top - next.top;
      if (!dx && !dy) return;
      // Cancel any in-flight flip on this card so a rapid second filter doesn't
      // strand the previous cleanup timer (and its flipping class).
      if (el.__flipTimer) clearTimeout(el.__flipTimer);
      el.classList.add('posts-entry--flipping');
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      // Next frame: release to the identity transform so the card eases home.
      requestAnimationFrame(function () {
        el.style.transform = '';
      });
      // Timer-based cleanup, not transitionend: a zero-delta or coalesced frame
      // can swallow the event, permanently stranding the flipping class (which
      // would then suppress the card's hover transition). A timer always fires.
      el.__flipTimer = setTimeout(function () {
        // Removing the class drops both the transform transition and the
        // will-change (both declared on .posts-entry--flipping in CSS); we only
        // need to also clear the inline transform we set above.
        el.classList.remove('posts-entry--flipping');
        el.style.transform = '';
        el.__flipTimer = null;
      }, FLIP_MS + 60);
    });
  }

  /* ── Filtering & sorting ─────────────────────────────────── */

  function applyFilters(animate) {
    // Only freeze the reveal cascade when the user is actually driving a
    // filter (animate=true). The silent initial paint leaves the cascade
    // intact so a fresh visitor still gets the on-scroll entrance.
    if (animate) neutralizeReveal();
    var prevRects = animate ? measure() : null;
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
      // Cards that were hidden and now show simply appear in place: the grid is
      // already .settled (opacity pinned to 1), so there's no flicker, and the
      // surviving cards' FLIP glide carries the sense of motion. An extra
      // per-card entrance animation here proved fragile (stranded classes,
      // mid-flight cancellation) for little visible gain, so it's intentionally
      // omitted — reorganising content stays calm, not busy.
      if (show) visible++;
    });

    if (prevRects) playFlip(prevRects);

    if (countEl) {
      var changed = countEl.textContent !== String(visible);
      countEl.textContent = visible;
      // Tick the numeral when it actually changes and the user drove it —
      // status feedback that the count is responding (apple-design §16).
      if (changed && animate && !prefersReducedMotion) {
        countEl.classList.remove('is-counting');
        void countEl.offsetWidth; // restart the keyframes cleanly
        countEl.classList.add('is-counting');
      }
    }

    grid.classList.toggle('posts-grid--empty', visible === 0);

    var activeCount = (state.category !== 'all' ? 1 : 0) + state.tags.length;
    if (clearBtn) clearBtn.style.display = activeCount > 0 ? '' : 'none';
    if (badgeEl) {
      badgeEl.textContent = activeCount;
      badgeEl.hidden = activeCount === 0;
    }
  }

  function applySorting(animate) {
    if (animate) neutralizeReveal();
    var prevRects = animate ? measure() : null;
    var sorted = articles.slice().sort(function (a, b) {
      var da = a.getAttribute('data-date');
      var db = b.getAttribute('data-date');
      return state.sort === 'newest' ? (db > da ? 1 : db < da ? -1 : 0) : (da > db ? 1 : da < db ? -1 : 0);
    });

    sorted.forEach(function (el) {
      grid.appendChild(el);
    });

    if (prevRects) playFlip(prevRects);
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

  /* ── Sticky choreography ─────────────────────────────────── */
  // Stuck state is derived from geometry on every scroll frame. (The old
  // IntersectionObserver fired at the moment the sentinel crossed the
  // observation line, when its top was still ~90px above zero — so slow
  // scrolls never registered as stuck and the expanded panel floated over
  // the cards.) While reading downward the bar exits the viewport together
  // with the auto-hiding site header; the first upward scroll brings both back.

  function isSticky() {
    return window.getComputedStyle(panel).position === 'sticky';
  }

  function setStuck(stuck) {
    if (stuck === panel.classList.contains('posts-filter--stuck')) return;
    panel.classList.toggle('posts-filter--stuck', stuck);
    if (toggleBtn) toggleBtn.hidden = !stuck;
    if (!stuck) setOpen(false);
  }

  function setOpen(open) {
    panel.classList.toggle('posts-filter--open', open);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setExited(exited) {
    if (exited === panel.classList.contains('posts-filter--exit')) return;
    if (exited) setOpen(false);
    panel.classList.toggle('posts-filter--exit', exited);
  }

  var stickyRafPending = false;

  function updateStickyState() {
    stickyRafPending = false;
    if (!sentinel || !isSticky()) {
      setExited(false);
      setStuck(false);
      return;
    }
    var stickyTop = parseFloat(window.getComputedStyle(panel).top) || 0;
    var stuck = sentinel.getBoundingClientRect().top < stickyTop - 1;
    setStuck(stuck);
    setExited(stuck && !!header && header.classList.contains('nav-scroll-hidden'));
  }

  function requestStickyUpdate() {
    if (stickyRafPending) return;
    stickyRafPending = true;
    requestAnimationFrame(updateStickyState);
  }

  window.addEventListener('scroll', requestStickyUpdate, { passive: true });
  window.addEventListener('resize', requestStickyUpdate, { passive: true });
  updateStickyState();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      setOpen(!panel.classList.contains('posts-filter--open'));
    });
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

      applyFilters(true);
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

      applyFilters(true);
      syncURL();
      scrollToResultsIfStuck();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      state.sort = sortSelect.value;
      applySorting(true);
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

      applySorting(false);
      applyFilters(true);
      syncURL();
    });
  }

  /* ── Init ────────────────────────────────────────────────── */

  initFromURL();
  // Initial paint runs silently: no FLIP, and the reveal cascade is left
  // intact so a fresh visitor still gets the on-scroll entrance. The grid
  // only "settles" (reveal frozen) once a filter is actually touched.
  if (state.sort !== 'newest') applySorting(false);
  // If the URL restored a filter, we're already reorganising content on
  // load — neutralise reveal up front so restored results don't flicker.
  var hasInitialFilter = state.category !== 'all' || state.tags.length > 0;
  if (hasInitialFilter) neutralizeReveal();
  applyFilters(false);
})();
