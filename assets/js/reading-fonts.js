/* A reading font is an enhancement, never a prerequisite for first paint.
 * Apply a cached/fast manifest before the first frame. A late manifest stays
 * cached for another visit without changing an established reading position.
 * The faces themselves retain font-display:optional for slow font files. */
(function () {
  'use strict';
  if (typeof window.requestAnimationFrame !== 'function') return;
  window.__readingFontsBeforeFrame = true;
  window.requestAnimationFrame(function () {
    // A preload can finish while an earlier stylesheet blocks this script.
    // Its load event may run AFTER this frame callback. Reuse only a fully
    // received manifest here, without waiting for any network response.
    var link = document.getElementById('zh-prose-fonts');
    var timing = window.performance;
    if (link && link.rel === 'preload' && timing && typeof timing.getEntriesByName === 'function') {
      var entries = timing.getEntriesByName(link.href);
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].responseStatus === 200 && entries[i].responseEnd > 0 && entries[i].decodedBodySize > 0) {
          link.onload = null;
          link.rel = 'stylesheet';
          link.removeAttribute('as');
          break;
        }
      }
    }
    window.__readingFontsBeforeFrame = false;
  });
})();
