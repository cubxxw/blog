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
 * The overlay is built lazily on first use so there is zero cost
 * on pages whose images are never opened.
 * ========================================================== */
(function () {
  'use strict';

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
        if (e.target === overlayImg) return;
        close();
      });
      closeBtn.addEventListener('click', close);
    }

    function open(img) {
      if (!overlay) build();
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
