/* ============================================================
 * wide-content-scroll.js
 * Horizontal-scroll affordance for wide code blocks & tables.
 *
 * Wide <pre> and <table> blocks scroll sideways on phones (and on
 * narrow desktop columns), but nothing told the reader there was
 * more content just off the edge — so people missed it. This adds a
 * soft fade on whichever side still has content to reveal: a clear
 * "swipe me" cue that answers the brief's 滑动 / left-right gesture.
 *
 * Design notes:
 *  - No DOM wrapping. The fade is a `mask-image` applied to the
 *    scroller itself, so it (a) never clobbers the code/table
 *    background, works on any theme, and (b) keeps these elements as
 *    direct children of `.post-content`, so the existing
 *    prose-reveal `.post-content > pre|table` selectors still match.
 *  - The fade width per side is driven by CSS custom properties
 *    (--x-fade-l / --x-fade-r) toggled here from the live scroll
 *    position; the CSS in zzz-wide-content-scroll.css renders them.
 *  - Purely informational wayfinding (not decoration), so it runs
 *    even under reduced motion — the CSS there just drops the
 *    transition so the fade snaps instead of easing.
 * ========================================================== */
(function () {
  'use strict';

  var SEL = '.post-content pre, .post-content table';
  var FADE = 28; // px of edge fade when there is more to scroll
  var EPS = 2;   // tolerance so sub-pixel rounding never flickers the cue

  function scrollers() {
    return Array.prototype.slice.call(document.querySelectorAll(SEL));
  }

  /* The <pre> and <table> are themselves the horizontal scrollers
     (zzz-code-mobile.css §0 moved the code scroll from the inner
     <code> onto the <pre> so trailing padding survives to the scroll
     end), so measure and listen on the element itself. */
  function scrollerOf(el) {
    return el;
  }

  function update(el) {
    var sc = scrollerOf(el);
    var max = sc.scrollWidth - sc.clientWidth;
    if (max <= EPS * 2) {
      // Not (or no longer) overflowing — remove the cue entirely.
      if (el.classList.contains('x-scroll')) {
        el.classList.remove('x-scroll');
        el.style.removeProperty('--x-fade-l');
        el.style.removeProperty('--x-fade-r');
      }
      return;
    }
    el.classList.add('x-scroll');
    var left = sc.scrollLeft;
    el.style.setProperty('--x-fade-l', (left > EPS ? FADE : 0) + 'px');
    el.style.setProperty('--x-fade-r', (left < max - EPS ? FADE : 0) + 'px');
  }

  function bind(el) {
    if (el.__xScrollBound) return;
    el.__xScrollBound = true;
    var ticking = false;
    scrollerOf(el).addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          update(el);
        });
      },
      { passive: true }
    );
  }

  function refreshAll() {
    scrollers().forEach(function (el) {
      bind(el);
      update(el);
    });
  }

  function init() {
    refreshAll();

    var resizeTimer = 0;
    window.addEventListener(
      'resize',
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refreshAll, 150);
      },
      { passive: true }
    );

    // Widths can change after late layout work: web fonts, lazy images,
    // or full asset load. Re-measure on each so the cue stays accurate.
    window.addEventListener('load', refreshAll);
    if (
      document.fonts &&
      document.fonts.ready &&
      typeof document.fonts.ready.then === 'function'
    ) {
      document.fonts.ready.then(refreshAll).catch(function () {});
    }
    document.querySelectorAll('.post-content img').forEach(function (img) {
      if (!img.complete) {
        img.addEventListener('load', refreshAll, { once: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
