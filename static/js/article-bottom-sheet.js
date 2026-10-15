/* Compact-window bottom sheet for article tools (<1200px) */
(function () {
  'use strict';

  var FAB_HIDE_SCROLL = 80;    // px from top — hide fab
  var FAB_HIDE_BOTTOM = 80;    // px from bottom — hide fab near footer
  var SWIPE_CLOSE = 80;        // px downward swipe to close

  var fab, sheet, overlay, tabs, panels;
  var lastFocused = null;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    fab     = document.getElementById('article-fab');
    sheet   = document.getElementById('article-bottom-sheet');
    overlay = document.getElementById('article-sheet-overlay');
    if (!fab || !sheet || !overlay) return;

    tabs   = sheet.querySelectorAll('.abs-tab');
    panels = sheet.querySelectorAll('.abs-panel');

    fab.addEventListener('click', openSheet);
    overlay.addEventListener('click', closeSheet);

    if (window.ArticleTabs) window.ArticleTabs.mount({
      tabs: tabs, panels: panels, tabClass: 'abs-tab--active', panelPrefix: 'abs-panel-'
    });

    initDragToClose();

    // Keyboard: Escape closes the sheet; Tab is trapped inside it while open
    // (the sheet is aria-modal) so focus can't wander to the page behind.
    sheet.addEventListener('keydown', onSheetKeydown);

    // If the window grows into the persistent-sidebar layout while the sheet
    // is open, clear the modal state and its body scroll lock immediately.
    // CSS alone can hide the sheet, but it cannot restore document scrolling.
    var persistentTools = window.matchMedia('(min-width: 1200px)');
    var onLayoutChange = function (event) {
      if (!event.matches || !sheet.classList.contains('abs--open')) return;
      sheet.classList.remove('abs--open', 'abs--dragging');
      sheet.inert = true;
      sheet.setAttribute('aria-hidden', 'true');
      sheet.style.transform = '';
      overlay.style.opacity = '';
      overlay.classList.remove('abs-overlay--visible');
      fab.classList.remove('article-fab--hidden');
      fab.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      lastFocused = null;
    };
    if (persistentTools.addEventListener) {
      persistentTools.addEventListener('change', onLayoutChange);
    } else if (persistentTools.addListener) {
      persistentTools.addListener(onLayoutChange);
    }

    // FAB auto-fade via scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // FAB auto-fade once the reader reaches the end-of-article zone.
    // Past the article body — the comments, related posts and footer —
    // the Contents / AI tools no longer serve the read, so the FAB
    // should get out of the way rather than sit over the discussion.
    initEndZoneFade();

    initMobileAi();
  }

  /* ── Hide the FAB in the end-of-article zone ──────────────────
     `fromBottom < 80` alone kept the FAB visible all through a tall
     comments iframe (utterances) because real page-bottom was still
     far below. Watch the first end-zone block instead — comments, or
     failing that related-posts / post-footer — and fade the FAB the
     moment it scrolls into view. Purely additive: `endZoneVisible`
     only ever forces the hide; onScroll still owns the top/bottom
     fades. No IntersectionObserver (very old browser) → no-op, and the
     scroll-based fade still applies. */
  var endZoneVisible = false;

  function initEndZoneFade() {
    if (!('IntersectionObserver' in window)) return;
    var target =
      document.querySelector('.post-comments') ||
      document.querySelector('.related-posts') ||
      document.querySelector('.post-footer');
    if (!target) return;

    var io = new IntersectionObserver(function (entries) {
      endZoneVisible = entries[0].isIntersecting;
      onScroll();
    }, {
      // Fade as soon as the end zone's top edge crosses into the lower
      // viewport — the moment the reader is done with the body and the
      // comments start coming up, the FAB clears out. No negative
      // bottom margin (that delayed the trigger until the block was
      // well up the screen); intersecting-at-all is the signal.
      threshold: 0,
    });
    io.observe(target);
  }

  /* ── Finger-following drag-to-close ───────────────────────────
     The grab handle and the tab bar form the drag zone. Dragging
     downward there pulls the whole sheet with the finger and dims
     the overlay in proportion; releasing past a threshold (or with a
     quick flick) dismisses it, otherwise it springs back. The panels
     below stay independently scrollable because the drag only starts
     on the non-scrolling header strip. Under reduced motion we skip
     the live transform and just honour the release threshold. */
  function initDragToClose() {
    var grabZone = sheet.querySelector('.abs-handle');
    var tabBar   = sheet.querySelector('.abs-tabs');
    var startY = 0, startT = 0, delta = 0, dragging = false;

    function fromGrabZone(node) {
      while (node && node !== document.body) {
        if (node === grabZone || node === tabBar) return true;
        node = node.parentNode;
      }
      return false;
    }

    sheet.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || !fromGrabZone(e.target)) { dragging = false; return; }
      startY = e.touches[0].clientY;
      startT = Date.now();
      delta = 0;
      dragging = true;
    }, { passive: true });

    sheet.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      delta = e.touches[0].clientY - startY;
      if (delta <= 0) { delta = 0; return; }
      if (prefersReduced) return;
      sheet.classList.add('abs--dragging');
      sheet.style.transform = 'translateY(' + delta + 'px)';
      var h = sheet.offsetHeight || 1;
      overlay.style.opacity = String(Math.max(0, 1 - (delta / h) * 1.1));
    }, { passive: true });

    sheet.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      var dt = Date.now() - startT;
      var flick = delta > 28 && dt < 240; // quick downward flick
      sheet.classList.remove('abs--dragging');
      sheet.style.transform = '';
      overlay.style.opacity = '';
      if (delta > SWIPE_CLOSE || flick) closeSheet();
    }, { passive: true });
  }

  function onSheetKeydown(e) {
    if (!sheet.classList.contains('abs--open') || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeSheet();
      return;
    }
    if (e.key !== 'Tab') return;
    // Focus trap: keep Tab cycling within the sheet's focusable controls.
    // Skip anything inside a hidden panel — those can't take focus, and
    // landing the trap on one would drop focus out of the dialog.
    var focusables = Array.prototype.filter.call(
      sheet.querySelectorAll(
        'button:not([disabled]), a[href], textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
      function (el) { return el.tabIndex >= 0 && (el.offsetParent !== null || el === document.activeElement); }
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ─── Mobile AI companion ──────────────────────────────────────────────────
  // The bottom-sheet AI panel previously had no behaviour wired up at all —
  // typing and tapping send did nothing. This connects it to the same
  // /article-ai function the desktop companion uses, with streaming.
  function initMobileAi() {
    var panel = document.getElementById('abs-panel-ai');
    if (panel && window.ArticleChat) window.ArticleChat.init(panel, { prefix: 'abs' });
  }

  function openSheet() {
    lastFocused = document.activeElement;
    sheet.inert = false;
    sheet.setAttribute('aria-hidden', 'false');
    fab.classList.add('article-fab--hidden');
    sheet.classList.add('abs--open');
    overlay.classList.add('abs-overlay--visible');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog so keyboard / screen-reader users land
    // inside it; the active tab is the natural entry point.
    var activeTab = sheet.querySelector('.abs-tab--active') || tabs[0];
    if (activeTab) {
      try { activeTab.focus({ preventScroll: true }); } catch (e) { activeTab.focus(); }
    }
  }

  function closeSheet() {
    sheet.classList.remove('abs--open', 'abs--dragging');
    sheet.inert = true;
    sheet.setAttribute('aria-hidden', 'true');
    sheet.style.transform = '';
    overlay.style.opacity = '';
    overlay.classList.remove('abs-overlay--visible');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(onScroll, 260);
    // Return focus to the control that opened the sheet.
    if (lastFocused && lastFocused.focus) {
      try { lastFocused.focus({ preventScroll: true }); } catch (e) { lastFocused.focus(); }
    } else {
      fab.focus();
    }
    lastFocused = null;
  }

  function onScroll() {
    if (!fab) return;
    var scrollY   = window.scrollY || window.pageYOffset;
    var docH      = document.documentElement.scrollHeight;
    var viewH     = window.innerHeight;
    var fromBottom = docH - scrollY - viewH;
    var hide =
      scrollY < FAB_HIDE_SCROLL ||
      fromBottom < FAB_HIDE_BOTTOM ||
      endZoneVisible;            // reached comments / related / footer
    fab.classList.toggle('article-fab--hidden', hide);
  }

  if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
