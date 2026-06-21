/* ============================================================
 * micro-interactions.js
 * Subtle, performant motion for mobile & desktop.
 *  1. Reveal-on-scroll for cards / list rows (staggered)
 *  2. Article images fade in once loaded
 *  3. Swipe left / right to navigate prev / next article (touch)
 *
 * Everything is a progressive enhancement and fully disabled
 * when the visitor prefers reduced motion.
 * ========================================================== */
(function () {
  'use strict';

  // Signals to the inline <head> failsafe that the enhancement loaded.
  window.__microInteractionsReady = true;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var REVEAL_SELECTOR = [
    '.post-entry',
    '.ai-tech-card',
    '.growth-card',
    '.ai-tech-list-item',
    '.growth-list-item',
    '.reveal-item'
  ].join(',');

  /* ---------------------------------------------------------
   * 1. Reveal-on-scroll
   * ------------------------------------------------------- */
  function revealAllImmediately() {
    document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
      el.classList.add('is-revealed');
    });
  }

  function initReveal() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll(REVEAL_SELECTOR)
    );
    if (!items.length) return;

    // No IntersectionObserver support → just show everything.
    if (!('IntersectionObserver' in window)) {
      revealAllImmediately();
      return;
    }

    // Stagger items that share the same parent for a pleasant cascade.
    var counters = new WeakMap();
    items.forEach(function (el) {
      var parent = el.parentElement || document.body;
      var n = counters.get(parent) || 0;
      // Cap the stagger so long lists don't wait too long.
      el.style.setProperty('--reveal-delay', Math.min(n, 6) * 70 + 'ms');
      counters.set(parent, n + 1);
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    items.forEach(function (el) {
      // Anything already in view on load is revealed on the next frame
      // (keeps above-the-fold content from flashing).
      observer.observe(el);
    });

    // Safety net: reveal anything still hidden after 2.5s.
    setTimeout(revealAllImmediately, 2500);
  }

  /* ---------------------------------------------------------
   * 2. Article images fade-in
   * ------------------------------------------------------- */
  function initImageFade() {
    var imgs = document.querySelectorAll('.post-content img');
    imgs.forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('img-loaded');
      } else {
        img.addEventListener('load', function () {
          img.classList.add('img-loaded');
        });
        img.addEventListener('error', function () {
          // Never leave a broken image invisible.
          img.classList.add('img-loaded');
        });
      }
    });
  }

  /* ---------------------------------------------------------
   * 3. Swipe navigation (mobile article pages only)
   *    swipe left  → next post  (.paginav .next)
   *    swipe right → prev post  (.paginav .prev)
   * ------------------------------------------------------- */
  function initSwipeNav() {
    var paginav = document.querySelector('.paginav');
    if (!paginav) return;
    if (!('ontouchstart' in window)) return;

    var nextLink = paginav.querySelector('a.next');
    var prevLink = paginav.querySelector('a.prev');
    if (!nextLink && !prevLink) return;

    var startX = 0,
      startY = 0,
      startT = 0,
      tracking = false;

    var THRESH = 90; // px horizontal needed to trigger
    var MAX_OFF_AXIS = 50; // px vertical tolerance
    var MAX_TIME = 800; // ms — must be a deliberate flick

    // Don't hijack swipes that start on horizontally scrollable content.
    function inNoSwipeZone(node) {
      while (node && node !== document.body) {
        if (
          node.nodeType === 1 &&
          (node.matches('pre, table, .highlight, .katex-display, [data-no-swipe]') ||
            node.scrollWidth > node.clientWidth + 4)
        ) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    }

    var hint = null;
    function showHint(dir) {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'swipe-hint';
        document.body.appendChild(hint);
      }
      hint.classList.remove('left', 'right');
      hint.classList.add(dir);
      hint.innerHTML =
        dir === 'left'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
      hint.classList.add('is-active');
    }
    function hideHint() {
      if (hint) hint.classList.remove('is-active');
    }

    document.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1) {
          tracking = false;
          return;
        }
        var t = e.touches[0];
        if (inNoSwipeZone(e.target)) {
          tracking = false;
          return;
        }
        startX = t.clientX;
        startY = t.clientY;
        startT = Date.now();
        tracking = true;
      },
      { passive: true }
    );

    document.addEventListener(
      'touchmove',
      function (e) {
        if (!tracking) return;
        var t = e.touches[0];
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;
        if (Math.abs(dy) > MAX_OFF_AXIS) {
          tracking = false;
          hideHint();
          return;
        }
        if (Math.abs(dx) > 40) {
          if (dx < 0 && nextLink) showHint('left');
          else if (dx > 0 && prevLink) showHint('right');
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'touchend',
      function (e) {
        if (!tracking) {
          hideHint();
          return;
        }
        tracking = false;
        var t = e.changedTouches[0];
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;
        var dt = Date.now() - startT;
        hideHint();

        if (
          dt <= MAX_TIME &&
          Math.abs(dx) >= THRESH &&
          Math.abs(dy) <= MAX_OFF_AXIS
        ) {
          if (dx < 0 && nextLink) {
            window.location.href = nextLink.href;
          } else if (dx > 0 && prevLink) {
            window.location.href = prevLink.href;
          }
        }
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------
   * Boot
   * ------------------------------------------------------- */
  function init() {
    if (prefersReduced) {
      // Honour the preference: show everything statically.
      revealAllImmediately();
      document.querySelectorAll('.post-content img').forEach(function (img) {
        img.classList.add('img-loaded');
      });
      return;
    }
    initReveal();
    initImageFade();
    initSwipeNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
