/* ============================================================
 * micro-interactions.js
 * Subtle, performant motion for mobile & desktop.
 *  1. Reveal-on-scroll for cards / list rows (staggered)
 *  2. Article images fade in once loaded
 *  3. Swipe left / right to navigate prev / next article (touch)
 *  4. Tap / click ripple feedback (mobile + desktop)
 *  5. Copy-code button success pop
 *  6. Homepage "scroll for more" cue (bobbing chevron)
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
    '.reveal-item',
    // Related-post cards at the foot of an article — fade/rise into the
    // same cascade as everything else so the read unfolds all the way to
    // the "continue reading" grid. Hidden state lives in
    // micro-interactions.css; they stagger by their shared grid parent.
    '.rpc',
    // Homepage day-page: the sections below the hero (latest posts,
    // category tiles, field notebooks, projects, repos) used to pop in
    // instantly. Reveal each section header and card as it scrolls into
    // view so the page unfolds on the way down — felt on mobile + desktop.
    // Hidden initial state + neutralisation live in zzz-homepage-reveal.css.
    '.hp-section-head',
    '.hp-post-card',
    '.hp-posts-list-row',
    '.hp-book',
    '.hp-project-featured',
    '.hp-repo'
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
        // Purely decorative gesture cue — keep it out of the a11y tree.
        hint.setAttribute('aria-hidden', 'true');
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
   * 5. Copy-code button: success feedback (mobile + desktop)
   *    The theme's copy button only swaps its label to "copied!".
   *    Add a quick tactile "pop + accent flash" by toggling a
   *    transient `.is-copied` class the CSS animates. Delegated so
   *    it covers buttons the theme injects after load. Pure feedback
   *    — the copy itself is handled by the theme; we never touch it.
   * ------------------------------------------------------- */
  function initCopyFeedback() {
    document.addEventListener(
      'click',
      function (e) {
        var btn = e.target.closest && e.target.closest('.copy-code');
        if (!btn) return;
        // Restart the animation cleanly on rapid re-clicks.
        btn.classList.remove('is-copied');
        // Force reflow so re-adding the class replays the keyframes.
        void btn.offsetWidth;
        btn.classList.add('is-copied');
        // Matches the theme's 2s label-reset window.
        window.clearTimeout(btn.__copiedTimer);
        btn.__copiedTimer = window.setTimeout(function () {
          btn.classList.remove('is-copied');
        }, 2000);
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------
   * 6. Homepage scroll cue (mobile + desktop)
   *    The day-page hero fills most of the first screen, so the
   *    posts / books / projects below were easy to miss. Inject a
   *    quiet bobbing chevron pinned bottom-centre that invites a
   *    downward scroll and fades away for good the moment the
   *    reader moves. Tapping it smooth-scrolls to the first
   *    section. Homepage-only, motion-only (this whole file bails
   *    early under reduced motion), and self-removing — never a
   *    persistent nag. Styled in zzz-hero-scroll-cue.css.
   * ------------------------------------------------------- */
  function initScrollCue() {
    var hero = document.querySelector('.hp-hero');
    if (!hero) return; // homepage only

    // Nothing to scroll to → no cue. (Guards short pages / wide screens.)
    var target = document.getElementById('hp-posts');
    var docH = document.documentElement.scrollHeight;
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    if (docH - viewH < 120) return;

    // If the visitor already landed scrolled down (anchor / restored
    // position), don't bother showing it.
    if ((window.scrollY || window.pageYOffset) > 60) return;

    var cue = document.createElement('button');
    cue.type = 'button';
    cue.className = 'hero-scroll-cue';
    var isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    cue.setAttribute('aria-label', isZh ? '向下滚动查看更多' : 'Scroll down for more');
    cue.innerHTML =
      '<span class="hero-scroll-cue__label" aria-hidden="true">' +
      (isZh ? '向下' : 'Scroll') +
      '</span>' +
      '<svg class="hero-scroll-cue__chevron" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M6 9l6 6 6-6"/></svg>';
    document.body.appendChild(cue);

    // Ease it in on the next frame.
    requestAnimationFrame(function () {
      cue.classList.add('is-in');
    });

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      cue.classList.add('is-hidden');
      window.removeEventListener('scroll', onScroll);
      // Remove from the DOM after the fade completes.
      window.setTimeout(function () {
        if (cue.parentNode) cue.parentNode.removeChild(cue);
      }, 600);
    }

    function onScroll() {
      if ((window.scrollY || window.pageYOffset) > 40) dismiss();
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    cue.addEventListener('click', function () {
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: viewH * 0.9, behavior: 'smooth' });
      }
      dismiss();
    });
  }

  /* ---------------------------------------------------------
   * 7. Mobile back-to-top: direction-aware reveal
   *    Desktop already gets the springy #top-link past 800px
   *    (footer.html). On phones the button is hidden by default
   *    (custom.css) to avoid a control parked over the read. Bring
   *    it back as a *gesture response*: reveal it only when the
   *    reader scrolls UP (an intent to head back) while deep in the
   *    page, and tuck it away again on the next downward scroll or
   *    near the top. Also fills its progress ring on mobile, which
   *    the desktop-gated footer script skips. Styling + the reduced-
   *    motion fade live in zzz-mobile-back-to-top.css; this runs even
   *    under reduced motion because it's a navigation affordance, not
   *    decoration (the CSS neutralises the travel either way).
   * ------------------------------------------------------- */
  function initMobileBackToTop() {
    var btn = document.getElementById('top-link');
    if (!btn) return;

    var mq = window.matchMedia('(max-width: 1023px)');
    var ring = btn.querySelector('.top-link-ring-progress');
    var RING_CIRC = 125.66; // 2 * PI * r(20), matches the SVG + footer script

    var REVEAL_AFTER = 600; // px from top before the control may appear
    var DIR_THRESHOLD = 6;  // px of travel needed to count as a direction
    var lastY = window.scrollY || window.pageYOffset || 0;
    var shown = false;
    var ticking = false;

    function setShown(next) {
      if (next === shown) return;
      shown = next;
      btn.classList.toggle('is-visible-mobile', next);
    }

    function evaluate() {
      // Only governs the phone layout; on desktop the footer script owns
      // the button and we leave its `.is-visible` class untouched.
      if (!mq.matches) {
        if (shown) setShown(false);
        return;
      }
      var y = window.scrollY || window.pageYOffset || 0;
      var dy = y - lastY;

      if (y < REVEAL_AFTER) {
        // Near the top there's nowhere to go back to — always tuck away.
        setShown(false);
      } else if (dy < -DIR_THRESHOLD) {
        setShown(true);   // scrolling up → offer the shortcut
      } else if (dy > DIR_THRESHOLD) {
        setShown(false);  // scrolling down → get out of the way
      }
      // Tiny jitters below the threshold leave the state as-is.

      if (Math.abs(dy) > 0) lastY = y;

      // Keep the read-progress ring in sync on mobile too.
      if (ring) {
        var trackable =
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
        var p = trackable > 0 ? Math.min(y / trackable, 1) : 0;
        ring.style.strokeDashoffset = (RING_CIRC * (1 - p)).toFixed(1);
      }
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            evaluate();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );

    // Leaving the phone layout (rotate / resize to desktop): drop our class
    // so the desktop footer script has a clean slate.
    var onMqChange = function () {
      if (!mq.matches) setShown(false);
      lastY = window.scrollY || window.pageYOffset || 0;
    };
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange); // older Safari
  }

  /* ---------------------------------------------------------
   * Boot
   * ------------------------------------------------------- */
  function init() {
    // A navigation affordance, not decoration — wire it up regardless of
    // the motion preference (its travel is neutralised in CSS).
    initMobileBackToTop();
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
    initCopyFeedback();
    initScrollCue();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
