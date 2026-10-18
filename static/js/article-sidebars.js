/* Reading intent changes visibility, never the article's grid or line width. */
(function () {
  'use strict';

  function createSidebarState(options) {
    options = options || {};
    var enabled = false, reading = false, blocked = false;
    var pinned = options.pinned === true, hidden = false;
    var lastY = 0, direction = 0, distance = 0, signature = '';

    function publish() {
      var next = [enabled, pinned, hidden].join(':');
      if (next === signature) return;
      signature = next;
      if (options.onChange) options.onChange({enabled: enabled, pinned: pinned, hidden: hidden});
    }
    function restart(y) {
      lastY = Math.max(0, y || 0);
      direction = 0; distance = 0;
    }
    function reveal(y) {
      hidden = false; restart(y); publish();
    }
    publish();
    return {
      configure: function (context, y) {
        var changed = false;
        if ('enabled' in context && enabled !== context.enabled) { enabled = context.enabled; changed = true; }
        if ('reading' in context && reading !== context.reading) { reading = context.reading; changed = true; }
        if ('blocked' in context && blocked !== context.blocked) { blocked = context.blocked; changed = true; }
        if (changed) restart(y);
        if (!enabled || !reading || blocked || pinned) hidden = false;
        publish();
      },
      scroll: function (y) {
        y = Math.max(0, y || 0);
        var delta = y - lastY;
        lastY = y;
        if (!enabled || !reading || blocked || pinned || y === 0) { reveal(y); return; }
        if (!delta) return;
        var nextDirection = delta > 0 ? 1 : -1;
        if (nextDirection !== direction) { direction = nextDirection; distance = 0; }
        distance += Math.abs(delta);
        if (direction > 0 && distance >= 120) hidden = true;
        if (direction < 0 && distance >= 64) hidden = false;
        publish();
      },
      togglePin: function (y) { pinned = !pinned; reveal(y); return pinned; },
      reset: reveal
    };
  }

  if (typeof module === 'object' && module.exports) module.exports = {createSidebarState: createSidebarState};
  if (typeof document === 'undefined') return;

  var layout = document.querySelector('.article-layout');
  var content = layout && layout.querySelector('.post-content');
  var controls = layout && layout.querySelector('[data-sidebar-controls]');
  var button = controls && controls.querySelector('button');
  var tools = layout && layout.querySelector('.article-tools-content');
  var metadata = layout && layout.querySelector('.article-marginalia');
  // Without observation or inert support, retain the ordinary reading desk.
  if (!content || !button || !tools || !metadata || !window.IntersectionObserver || !('inert' in tools)) return;

  var wide = window.matchMedia('(min-width: 1200px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hover = window.matchMedia('(hover: hover)');
  var sidebars = [metadata, tools];
  var storageKey = 'cubxxw.article-sidebars.pinned';
  var pinned = false, reading = false, navigating = false;
  var observer, settleTimer, scrollFrame = 0;
  var isZh = (document.documentElement.lang || '').indexOf('zh') === 0;
  var labels = isZh ? {
    pin: '固定侧栏', show: '显示侧栏', unpin: '取消固定',
    pinHint: '保持侧栏展开', showHint: '显示并固定侧栏', unpinHint: '恢复随阅读自动收起'
  } : {
    pin: 'Pin sidebars', show: 'Show sidebars', unpin: 'Unpin sidebars',
    pinHint: 'Keep sidebars open', showHint: 'Show and pin sidebars', unpinHint: 'Resume automatic hiding while reading'
  };
  try { pinned = window.localStorage.getItem(storageKey) === 'true'; } catch (_) {}

  function y() { return window.scrollY || 0; }
  var state = createSidebarState({pinned: pinned, onChange: function (view) {
    controls.hidden = !view.enabled;
    layout.toggleAttribute('data-sidebar-enhanced', view.enabled);
    layout.toggleAttribute('data-sidebars-hidden', view.hidden);
    sidebars.forEach(function (sidebar) { sidebar.inert = view.hidden; });
    button.setAttribute('aria-expanded', String(!view.hidden));
    button.setAttribute('aria-pressed', String(view.pinned));
    button.textContent = view.pinned ? labels.unpin : view.hidden ? labels.show : labels.pin;
    button.title = view.pinned ? labels.unpinHint : view.hidden ? labels.showHint : labels.pinHint;
  }});

  function blocked() {
    var selection = window.getSelection();
    return navigating || document.hidden || !!(selection && !selection.isCollapsed) ||
      sidebars.some(function (sidebar) {
        return sidebar.contains(document.activeElement) || hover.matches && sidebar.matches(':hover');
      }) ||
      !!tools.querySelector('[data-tab="ai"][aria-selected="true"], [data-article-chat][aria-busy="true"]');
  }
  function sync() {
    state.configure({enabled: wide.matches && !reduced.matches, reading: reading, blocked: blocked()}, y());
  }
  function settled() {
    window.clearTimeout(settleTimer);
    navigating = false; state.reset(y()); sync();
  }
  function scheduleSettle() {
    window.clearTimeout(settleTimer);
    // Also covers engines without scrollend and anchors that need no scroll.
    settleTimer = window.setTimeout(settled, 220);
  }
  function pauseForNavigation() {
    navigating = true; state.reset(y()); sync(); scheduleSettle();
  }
  function resumeReading() {
    if (!navigating) return;
    window.clearTimeout(settleTimer);
    navigating = false; state.reset(y()); sync();
  }
  function observeProse() {
    if (observer) observer.disconnect();
    reading = false;
    if (wide.matches && !reduced.matches) {
      // Only the top third of the viewport counts as having entered the prose.
      // Pixel margins avoid IntersectionObserver's width-based percentages.
      var top = Math.min(96, Math.round(window.innerHeight * .15));
      var bottom = Math.round(window.innerHeight * .65);
      observer = new IntersectionObserver(function (entries) {
        reading = entries[0].isIntersecting;
        sync();
      }, {rootMargin: '-' + top + 'px 0px -' + bottom + 'px 0px'});
      observer.observe(content);
    }
    pauseForNavigation();
  }

  button.addEventListener('click', function () {
    pinned = state.togglePin(y());
    try { window.localStorage.setItem(storageKey, String(pinned)); } catch (_) {}
  });
  sidebars.forEach(function (sidebar) {
    sidebar.addEventListener('pointerenter', sync);
    sidebar.addEventListener('pointerleave', sync);
  });
  document.addEventListener('focusin', sync);
  document.addEventListener('focusout', function () { queueMicrotask(sync); });
  document.addEventListener('selectionchange', sync);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Tab' || (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') pauseForNavigation();
    else if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(event.key) !== -1) resumeReading();
  }, true);
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.hasAttribute('download') || anchor.target === '_blank') return;
    var destination = new URL(anchor.href, location.href);
    if (destination.origin === location.origin && destination.pathname === location.pathname && destination.hash) pauseForNavigation();
  }, true);
  // Capture runs before the existing chat controller tries to focus its input.
  document.addEventListener('article:selection-analyze', pauseForNavigation, true);
  new MutationObserver(sync).observe(tools, {subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-busy']});

  window.addEventListener('scroll', function () {
    if (navigating) scheduleSettle();
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = 0;
      sync(); state.scroll(y());
    });
  }, {passive: true});
  window.addEventListener('scrollend', function () { if (navigating) settled(); });
  window.addEventListener('wheel', resumeReading, {passive: true});
  window.addEventListener('touchstart', resumeReading, {passive: true});
  window.addEventListener('hashchange', pauseForNavigation);
  window.addEventListener('popstate', pauseForNavigation);
  window.addEventListener('pageshow', pauseForNavigation);
  window.addEventListener('resize', observeProse);
  document.addEventListener('visibilitychange', pauseForNavigation);
  wide.addEventListener('change', observeProse);
  reduced.addEventListener('change', observeProse);
  observeProse();
})();
