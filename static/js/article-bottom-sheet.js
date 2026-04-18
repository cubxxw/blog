/* US-031: Mobile bottom sheet for article tools (<1024px) */
(function () {
  'use strict';

  var FAB_HIDE_SCROLL = 200;   // px from top — hide fab
  var FAB_HIDE_BOTTOM = 300;   // px from bottom — hide fab near footer
  var SWIPE_CLOSE = 80;        // px downward swipe to close

  var fab, sheet, overlay, tabs, panels;
  var startY = 0;

  function init() {
    fab     = document.getElementById('article-fab');
    sheet   = document.getElementById('article-bottom-sheet');
    overlay = document.getElementById('article-sheet-overlay');
    if (!fab || !sheet || !overlay) return;

    tabs   = sheet.querySelectorAll('.abs-tab');
    panels = sheet.querySelectorAll('.abs-panel');

    fab.addEventListener('click', openSheet);
    overlay.addEventListener('click', closeSheet);

    // Tab switching
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;
        tabs.forEach(function (t) { t.classList.toggle('abs-tab--active', t.dataset.tab === target); });
        panels.forEach(function (p) { p.hidden = p.id !== 'abs-panel-' + target; });
      });
    });

    // Swipe-to-close
    sheet.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (e.changedTouches[0].clientY - startY > SWIPE_CLOSE) closeSheet();
    }, { passive: true });

    // FAB auto-fade via scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function openSheet() {
    sheet.classList.add('abs--open');
    overlay.classList.add('abs-overlay--visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheet.classList.remove('abs--open');
    overlay.classList.remove('abs-overlay--visible');
    document.body.style.overflow = '';
  }

  function onScroll() {
    if (!fab) return;
    var scrollY   = window.scrollY || window.pageYOffset;
    var docH      = document.documentElement.scrollHeight;
    var viewH     = window.innerHeight;
    var fromBottom = docH - scrollY - viewH;
    var hide = scrollY < FAB_HIDE_SCROLL || fromBottom < FAB_HIDE_BOTTOM;
    fab.classList.toggle('article-fab--hidden', hide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
