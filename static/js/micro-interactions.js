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
   * 1b. In-article block reveal
   *     Structural prose blocks (headings, blockquotes, code,
   *     tables, figures) gently fade up as they scroll into
   *     view, giving long reads a sense of unfolding rhythm.
   *     Paragraphs are intentionally excluded so body text never
   *     flickers while reading. Gated behind .motion-reveal, so
   *     no-JS / reduced-motion visitors see everything statically.
   * ------------------------------------------------------- */
  var PROSE_REVEAL_SELECTOR = [
    '.post-content > h2',
    '.post-content > h3',
    '.post-content > h4',
    '.post-content > blockquote',
    '.post-content > figure',
    '.post-content > .highlight',
    '.post-content > pre',
    '.post-content > table',
    '.post-content > hr',
    '.post-content > .reading-companion'
  ].join(',');

  function initProseReveal() {
    var blocks = Array.prototype.slice.call(
      document.querySelectorAll(PROSE_REVEAL_SELECTOR)
    );
    if (!blocks.length) return;

    function revealAll() {
      blocks.forEach(function (el) {
        el.classList.add('is-revealed');
      });
    }

    blocks.forEach(function (el) {
      el.classList.add('reveal-block');
    });

    if (!('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
    );

    var vh = window.innerHeight || document.documentElement.clientHeight;
    blocks.forEach(function (el) {
      // Anything already on the first screen is shown at once so the
      // article never paints with a half-empty viewport.
      if (el.getBoundingClientRect().top < vh) {
        el.classList.add('is-revealed');
      } else {
        observer.observe(el);
      }
    });

    // If we land on an in-page anchor, reveal the target (and anything
    // above it) immediately so deep links never point at hidden content.
    if (window.location.hash) {
      try {
        var target = document.getElementById(
          decodeURIComponent(window.location.hash.slice(1))
        );
        if (target) {
          var top = target.getBoundingClientRect().top + window.scrollY;
          blocks.forEach(function (el) {
            if (el.getBoundingClientRect().top + window.scrollY <= top + 4) {
              el.classList.add('is-revealed');
            }
          });
        }
      } catch (e) {}
    }

    // Safety net: never leave prose hidden.
    setTimeout(revealAll, 2500);
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
    var hintDir = null;
    function ensureHint() {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'swipe-hint';
        document.body.appendChild(hint);
      }
      return hint;
    }
    // progress: 0..1 of the way to triggering. The hint slides in from the
    // edge and "arms" (filled state) once the threshold is reached so the
    // gesture has a clear, tactile commit point.
    function showHint(dir, progress) {
      ensureHint();
      if (dir !== hintDir) {
        hintDir = dir;
        hint.classList.remove('left', 'right');
        hint.classList.add(dir);
        hint.innerHTML =
          dir === 'left'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
      }
      var p = Math.max(0, Math.min(1, progress));
      // Slide the puck in from its edge as the finger travels.
      var travel = 6 + p * 10; // px it eases inward
      hint.style.setProperty('--swipe-shift', (dir === 'left' ? -travel : travel) + 'px');
      hint.style.setProperty('--swipe-scale', (0.82 + p * 0.18).toFixed(3));
      hint.classList.add('is-active');
      hint.classList.toggle('is-armed', p >= 1);
    }
    function hideHint() {
      if (hint) {
        hint.classList.remove('is-active', 'is-armed');
        hintDir = null;
      }
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
        if (Math.abs(dx) > 24) {
          var progress = Math.abs(dx) / THRESH;
          if (dx < 0 && nextLink) showHint('left', progress);
          else if (dx > 0 && prevLink) showHint('right', progress);
        } else {
          hideHint();
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
   * 4. Tap / click ripple (mobile + desktop)
   *    A material-style ripple that originates at the pointer
   *    for buttons, tags, pagination and CTAs. Pure feedback —
   *    it never blocks the click and is delegated so it covers
   *    dynamically-added elements too.
   * ------------------------------------------------------- */
  var RIPPLE_SELECTOR = [
    'button',
    '.button',
    'input[type="submit"]',
    '.post-tag',
    '.post-category',
    '.top-link',
    '.paginav a',
    '.share-button',
    '.hp-subscribe-btn',
    '.share-buttons a'
  ].join(',');

  function spawnRipple(host, clientX, clientY) {
    // Pill/button hosts need a clip + stacking context for the ripple.
    if (!host.classList.contains('has-ripple')) {
      host.classList.add('has-ripple');
    }
    // `overflow:hidden` only clips block/inline-block/flex boxes. Skip
    // pure-inline hosts so the ink can never bleed past a rounded edge.
    if (window.getComputedStyle(host).display === 'inline') return;
    var rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Center the ripple on the pointer; fall back to element center
    // for keyboard / synthetic clicks where coordinates are 0.
    var x = clientX ? clientX - rect.left : rect.width / 2;
    var y = clientY ? clientY - rect.top : rect.height / 2;
    // Diameter large enough to always cover the element from the tap point.
    var dx = Math.max(x, rect.width - x);
    var dy = Math.max(y, rect.height - y);
    var diameter = 2 * Math.sqrt(dx * dx + dy * dy);

    var ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.width = ink.style.height = diameter + 'px';
    ink.style.left = x - diameter / 2 + 'px';
    ink.style.top = y - diameter / 2 + 'px';
    host.appendChild(ink);

    var done = false;
    function cleanup() {
      if (done) return;
      done = true;
      if (ink.parentNode) ink.parentNode.removeChild(ink);
    }
    ink.addEventListener('animationend', cleanup);
    // Safety net in case the animation event never fires.
    setTimeout(cleanup, 700);
  }

  function initRipple() {
    document.addEventListener(
      'pointerdown',
      function (e) {
        // Primary button / touch / pen only — ignore right & middle clicks.
        if (e.button != null && e.button !== 0) return;
        var host = e.target.closest && e.target.closest(RIPPLE_SELECTOR);
        if (!host) return;
        // Skip disabled controls.
        if (host.disabled || host.getAttribute('aria-disabled') === 'true') return;
        spawnRipple(host, e.clientX, e.clientY);
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
      document.querySelectorAll(PROSE_REVEAL_SELECTOR).forEach(function (el) {
        el.classList.add('reveal-block', 'is-revealed');
      });
      document.querySelectorAll('.post-content img').forEach(function (img) {
        img.classList.add('img-loaded');
      });
      return;
    }
    initReveal();
    initProseReveal();
    initImageFade();
    initSwipeNav();
    initRipple();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
