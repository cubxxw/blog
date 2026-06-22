/* ============================================================
 * image-lightbox.js
 * Tap / click an article image to view it large in a centered
 * overlay. Click anywhere, press Esc, or use the close button to
 * dismiss. Pure progressive enhancement:
 *   - Only content images that are NOT links become zoomable.
 *   - Tiny inline icons / badges are skipped.
 *   - Keyboard accessible (Enter / Space to open, Esc to close,
 *     focus is restored on close).
 *   - Works on both desktop (click) and mobile (tap).
 *   - Mobile: swipe the image up or down to dismiss. The image
 *     tracks the finger and the backdrop fades with the drag; a
 *     flick or a long enough pull releases, otherwise it springs
 *     back. Disabled under prefers-reduced-motion.
 * The overlay is built lazily on first use so there is zero cost
 * on pages whose images are never opened.
 * ========================================================== */
(function () {
  'use strict';

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    var imgs = document.querySelectorAll('.post-content img');
    if (!imgs.length) return;

    var candidates = [];
    Array.prototype.forEach.call(imgs, function (img) {
      // Linked images keep their link behaviour — don't hijack them.
      if (img.closest('a')) return;
      // Skip small inline glyphs (emoji, badges, inline icons) once laid
      // out. Unmeasured images (width 0) are kept — they're usually real
      // figures that simply haven't finished loading yet.
      var w = img.getBoundingClientRect().width;
      if (w > 0 && w < 80) return;

      candidates.push(img);
      img.classList.add('zoomable');
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      var label = img.getAttribute('alt');
      img.setAttribute(
        'aria-label',
        (label ? label + ' — ' : '') + 'open full size'
      );
    });

    if (!candidates.length) return;

    var overlay, overlayImg, captionEl, closeBtn, lastFocused;
    var isOpen = false;

    function build() {
      overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-label', 'Image viewer');

      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'lightbox-close';
      closeBtn.setAttribute('aria-label', 'Close image viewer');
      closeBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 6 6 18M6 6l12 12"/></svg>';

      var fig = document.createElement('figure');
      fig.className = 'lightbox-figure';

      overlayImg = document.createElement('img');
      overlayImg.className = 'lightbox-img';
      overlayImg.alt = '';
      overlayImg.decoding = 'async';

      captionEl = document.createElement('figcaption');
      captionEl.className = 'lightbox-caption';

      fig.appendChild(overlayImg);
      fig.appendChild(captionEl);
      overlay.appendChild(closeBtn);
      overlay.appendChild(fig);
      document.body.appendChild(overlay);

      // Click on the backdrop (anywhere but the image) closes.
      overlay.addEventListener('click', function (e) {
        // A swipe gesture ends with a synthetic click; swallow it once so
        // a spring-back doesn't immediately dismiss the viewer.
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        if (e.target === overlayImg) return;
        close();
      });
      closeBtn.addEventListener('click', close);

      initSwipeDismiss();
    }

    /* --------------------------------------------------------
     * Swipe-to-dismiss (touch only).
     * The image follows the finger on the vertical axis while the
     * backdrop fades proportionally; releasing past a distance or
     * with enough velocity closes the viewer, otherwise it eases
     * back to centre. Listeners are passive — we set touch-action
     * on the overlay so the browser never pans/zooms underneath.
     * ------------------------------------------------------ */
    var suppressClick = false;

    function resetDragStyles() {
      overlayImg.style.transition = '';
      overlayImg.style.transform = '';
      overlayImg.style.opacity = '';
      overlay.style.transition = '';
      overlay.style.opacity = '';
    }

    function initSwipeDismiss() {
      if (prefersReduced) return;
      if (!('ontouchstart' in window)) return;

      overlay.style.touchAction = 'none';

      var startX = 0,
        startY = 0,
        startT = 0,
        dy = 0,
        tracking = false, // a finger is down
        engaged = false; // vertical drag has taken over

      var ENGAGE = 10; // px before we decide the gesture is a drag
      var DISMISS_DIST = 110; // px pull that always dismisses
      var FLICK_DIST = 36; // min px for a velocity-based flick
      var FLICK_VEL = 0.5; // px/ms

      overlay.addEventListener(
        'touchstart',
        function (e) {
          if (!isOpen || e.touches.length !== 1) {
            tracking = false;
            return;
          }
          // Don't start a drag from the close button.
          if (closeBtn && closeBtn.contains(e.target)) {
            tracking = false;
            return;
          }
          var t = e.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          startT = Date.now();
          dy = 0;
          tracking = true;
          engaged = false;
        },
        { passive: true }
      );

      overlay.addEventListener(
        'touchmove',
        function (e) {
          if (!tracking) return;
          var t = e.touches[0];
          dy = t.clientY - startY;
          var dx = t.clientX - startX;
          if (!engaged) {
            // Wait until the gesture is clearly vertical before taking over.
            if (Math.abs(dy) < ENGAGE) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              tracking = false; // mostly horizontal — leave it alone
              return;
            }
            engaged = true;
            overlayImg.style.transition = 'none';
            overlay.style.transition = 'none';
          }
          var ratio = Math.min(1, Math.abs(dy) / 520);
          var scale = (1 - ratio * 0.12).toFixed(3); // down to ~0.88
          overlayImg.style.transform =
            'translateY(' + dy.toFixed(1) + 'px) scale(' + scale + ')';
          overlay.style.opacity = (1 - ratio * 0.6).toFixed(3); // to ~0.4
        },
        { passive: true }
      );

      function onEnd() {
        if (!tracking) return;
        tracking = false;
        if (!engaged) return;
        engaged = false;
        suppressClick = true;

        var dt = Date.now() - startT;
        var vel = dt > 0 ? dy / dt : 0;
        var dismiss =
          Math.abs(dy) >= DISMISS_DIST ||
          (Math.abs(dy) >= FLICK_DIST && Math.abs(vel) >= FLICK_VEL);

        // Re-enable transitions so the release animates smoothly.
        overlayImg.style.transition =
          'transform 0.26s cubic-bezier(0.22,0.61,0.36,1), opacity 0.26s ease';
        overlay.style.transition = 'opacity 0.26s ease';

        if (dismiss) {
          var sign = dy < 0 ? -1 : 1;
          var off = (window.innerHeight || 800) * sign;
          overlayImg.style.transform =
            'translateY(' + off + 'px) scale(0.9)';
          overlayImg.style.opacity = '0';
          overlay.style.opacity = '0';
          setTimeout(function () {
            close();
            resetDragStyles();
          }, 200);
        } else {
          // Spring back to centre, then hand styling back to CSS.
          overlayImg.style.transform = '';
          overlayImg.style.opacity = '';
          overlay.style.opacity = '';
          setTimeout(resetDragStyles, 280);
        }
      }

      overlay.addEventListener('touchend', onEnd, { passive: true });
      overlay.addEventListener('touchcancel', onEnd, { passive: true });
    }

    function open(img) {
      if (!overlay) build();
      // Clear any inline styles left by a previous swipe so the entrance
      // transition always starts from a clean slate.
      resetDragStyles();
      lastFocused = document.activeElement;

      overlayImg.src = img.currentSrc || img.src;
      overlayImg.alt = img.getAttribute('alt') || '';

      // Prefer a real <figcaption> for the caption, fall back to alt text.
      var fig = img.closest('figure');
      var figcap = fig ? fig.querySelector('figcaption') : null;
      var cap = figcap ? figcap.textContent.trim() : (img.getAttribute('alt') || '');
      if (cap) {
        captionEl.textContent = cap;
        captionEl.hidden = false;
      } else {
        captionEl.textContent = '';
        captionEl.hidden = true;
      }

      overlay.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('lightbox-open');
      // Force a reflow so the entrance transition always plays.
      void overlay.offsetWidth;
      overlay.classList.add('is-open');
      isOpen = true;

      document.addEventListener('keydown', onKey, true);
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!isOpen) return;
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('lightbox-open');
      isOpen = false;
      document.removeEventListener('keydown', onKey, true);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        // Minimal focus trap: the dialog has a single control.
        e.preventDefault();
        if (closeBtn) closeBtn.focus();
      }
    }

    candidates.forEach(function (img) {
      img.addEventListener('click', function () {
        open(img);
      });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          open(img);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
