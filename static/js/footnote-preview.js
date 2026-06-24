/* ============================================================
 * footnote-preview.js
 * Inline footnote previews — see a citation without losing your
 * place in the read.
 *
 *  • Desktop / mouse + keyboard: hovering or focusing a footnote
 *    reference [n] floats a small card with the note's text,
 *    anchored to the marker. Move away (or press Esc) to dismiss.
 *  • Mobile / touch: the first tap on a reference opens the card
 *    instead of jumping to the endnotes (you keep your spot); a
 *    "go to note" link inside still takes you down if you want the
 *    full context. Tapping the marker again or anywhere else closes
 *    it. A second tap on the same marker follows the link.
 *
 * Progressive enhancement: with no JS the references are ordinary
 * in-page anchors and behave exactly as before. One shared popover
 * element is reused for every marker. Motion (the small rise/scale)
 * only runs when the visitor allows it; the card itself still works
 * under reduced-motion because it carries information, not flourish.
 * Styling lives in zzz-footnote-preview.css.
 * ========================================================== */
(function () {
  'use strict';

  var content = document.querySelector('.post-content');
  if (!content) return;

  var refs = content.querySelectorAll('a.footnote-ref[href^="#"]');
  if (!refs.length) return;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Coarse pointer (phones / tablets) → tap-to-open; otherwise hover.
  var isTouch =
    (window.matchMedia && window.matchMedia('(hover: none)').matches) ||
    'ontouchstart' in window;

  var isZh =
    (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;

  /* --- One shared popover, lazily built ----------------------------- */
  var pop = null;
  var popBody = null;
  var popMore = null;
  var currentRef = null; // marker the popover is bound to right now
  var showTimer = 0;
  var hideTimer = 0;
  var popId = 'fn-preview-popover';

  function buildPop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'fn-popover';
    pop.id = popId;
    pop.setAttribute('role', 'tooltip');
    pop.setAttribute('aria-hidden', 'true');

    popBody = document.createElement('div');
    popBody.className = 'fn-popover__body';
    pop.appendChild(popBody);

    popMore = document.createElement('a');
    popMore.className = 'fn-popover__more';
    popMore.textContent = isZh ? '查看脚注 ↓' : 'Go to note ↓';
    pop.appendChild(popMore);

    // Keep the card open while the pointer is inside it (desktop), so
    // links/citations within the note can be clicked.
    pop.addEventListener('mouseenter', function () {
      window.clearTimeout(hideTimer);
    });
    pop.addEventListener('mouseleave', function () {
      if (!isTouch) scheduleHide();
    });

    document.body.appendChild(pop);
    return pop;
  }

  /* --- Extract a note's text from its <li id="fn:N"> ----------------- */
  function noteHtmlFor(ref) {
    var id = decodeURIComponent((ref.getAttribute('href') || '').slice(1));
    if (!id) return null;
    var def = document.getElementById(id);
    if (!def) return null;
    var clone = def.cloneNode(true);
    // Drop the "return to text" back-references — they make no sense in
    // a floating preview and would point the reader away.
    clone.querySelectorAll('.footnote-backref').forEach(function (a) {
      a.parentNode && a.parentNode.removeChild(a);
    });
    var html = clone.innerHTML.trim();
    return html || null;
  }

  /* --- Positioning --------------------------------------------------- */
  function placePop(ref) {
    var margin = 12;
    var gap = 10;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;

    // Let the card size to its content first (CSS caps the max width).
    pop.style.left = '0px';
    pop.style.top = '0px';
    var pw = pop.offsetWidth;
    var ph = pop.offsetHeight;

    var r = ref.getBoundingClientRect();
    var refCx = r.left + r.width / 2;

    // Horizontal: centre on the marker, clamped to the viewport.
    var left = Math.round(refCx - pw / 2);
    left = Math.max(margin, Math.min(left, vw - pw - margin));

    // Vertical: prefer above the marker; flip below if it would clip.
    var placeBelow = r.top - ph - gap < margin;
    var top = placeBelow ? r.bottom + gap : r.top - ph - gap;
    top = Math.max(margin, Math.min(top, vh - ph - margin));

    pop.classList.toggle('is-below', placeBelow);
    // Point the little arrow at the marker (clamped within the card).
    var arrowX = Math.max(14, Math.min(refCx - left, pw - 14));
    pop.style.setProperty('--fn-arrow-x', arrowX + 'px');

    pop.style.left = left + window.scrollX + 'px';
    pop.style.top = top + window.scrollY + 'px';
  }

  /* --- Show / hide --------------------------------------------------- */
  function show(ref) {
    var html = noteHtmlFor(ref);
    if (!html) return; // nothing to preview → leave the link alone
    buildPop();
    window.clearTimeout(hideTimer);

    popBody.innerHTML = html;
    popMore.setAttribute('href', ref.getAttribute('href'));
    currentRef = ref;
    ref.setAttribute('aria-describedby', popId);

    placePop(ref);
    pop.setAttribute('aria-hidden', 'false');
    // Reflow so the entrance transition replays from the hidden state.
    void pop.offsetWidth;
    pop.classList.add('is-visible');
  }

  function hide() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    if (!pop) return;
    pop.classList.remove('is-visible');
    pop.setAttribute('aria-hidden', 'true');
    if (currentRef) {
      currentRef.removeAttribute('aria-describedby');
      currentRef = null;
    }
  }

  function scheduleShow(ref) {
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(function () {
      show(ref);
    }, 120);
  }
  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 180);
  }

  /* --- Wiring -------------------------------------------------------- */
  if (isTouch) {
    // Tap to open (keeping the reader's place). A second tap on the same
    // marker, or tapping the "go to note" link, follows through.
    refs.forEach(function (ref) {
      ref.addEventListener('click', function (e) {
        if (currentRef === ref && pop && pop.classList.contains('is-visible')) {
          // Second tap → let the native jump happen.
          hide();
          return;
        }
        e.preventDefault();
        show(ref);
      });
    });
    // Tap outside the card (and not on a marker) closes it.
    document.addEventListener(
      'click',
      function (e) {
        if (!pop || !pop.classList.contains('is-visible')) return;
        if (pop.contains(e.target)) return;
        if (e.target.closest && e.target.closest('a.footnote-ref')) return;
        hide();
      },
      true
    );
    // Reposition / dismiss on scroll so the card never strands mid-page.
    window.addEventListener(
      'scroll',
      function () {
        if (pop && pop.classList.contains('is-visible')) hide();
      },
      { passive: true }
    );
  } else {
    // Desktop: hover + keyboard focus.
    refs.forEach(function (ref) {
      ref.addEventListener('mouseenter', function () {
        scheduleShow(ref);
      });
      ref.addEventListener('mouseleave', function () {
        window.clearTimeout(showTimer);
        scheduleHide();
      });
      ref.addEventListener('focus', function () {
        show(ref);
      });
      ref.addEventListener('blur', function () {
        scheduleHide();
      });
    });
    window.addEventListener(
      'scroll',
      function () {
        if (currentRef) placePop(currentRef);
      },
      { passive: true }
    );
  }

  // Esc always closes; resizing re-anchors a live card.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) hide();
  });
  window.addEventListener(
    'resize',
    function () {
      if (currentRef && pop && pop.classList.contains('is-visible')) {
        placePop(currentRef);
      }
    },
    { passive: true }
  );

  // Expose the motion preference to CSS via a hook class on the popover
  // host. (CSS also re-checks the media query — this is just belt-and-
  // braces for engines that mis-handle the query at load.)
  if (prefersReduced && pop) pop.classList.add('fn-popover--no-motion');
})();
