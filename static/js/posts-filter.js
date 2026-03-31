(function () {
  'use strict';

  var grid = document.getElementById('posts-grid');
  var countEl = document.getElementById('posts-visible-count');
  var clearBtn = document.getElementById('filter-clear');
  var sortSelect = document.getElementById('filter-sort');
  if (!grid) return;

  var articles = Array.prototype.slice.call(grid.querySelectorAll('.post-entry'));
  var categoryBtns = Array.prototype.slice.call(
    document.querySelectorAll('#filter-categories .posts-filter__chip')
  );
  var tagBtns = Array.prototype.slice.call(
    document.querySelectorAll('#filter-tags .posts-filter__chip--tag')
  );

  // State
  var state = {
    category: 'all',
    tags: [],
    sort: 'newest'
  };

  // --- Core filter logic ---

  function applyFilters() {
    var visible = 0;

    articles.forEach(function (el) {
      var section = el.getAttribute('data-section');
      var tagsStr = el.getAttribute('data-tags') || '';
      var articleTags = tagsStr ? tagsStr.split(',') : [];

      // Category match
      var catMatch = state.category === 'all' || section === state.category;

      // Tag match (AND — article must have ALL selected tags)
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

    // Update count
    if (countEl) countEl.textContent = visible;

    // Toggle empty state
    grid.classList.toggle('posts-grid--empty', visible === 0);

    // Toggle clear button
    var hasFilters = state.category !== 'all' || state.tags.length > 0;
    if (clearBtn) clearBtn.style.display = hasFilters ? '' : 'none';
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

  // --- Category chips ---

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
    });
  });

  // --- Tag chips (multi-select toggle) ---

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
    });
  });

  // --- Sort ---

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      state.sort = sortSelect.value;
      applySorting();
    });
  }

  // --- Clear all filters ---

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
    });
  }
})();
