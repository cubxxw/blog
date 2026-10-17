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

  function isCoarse() {
    return window.matchMedia && window.matchMedia('(pointer: coarse), (hover: none)').matches;
  }

  var isZh =
    (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;

  /* --- One shared, non-modal preview ------------------------------- */
  var pop = null;
  var popBody = null;
  var popMore = null;
  var popHint = null;
  var currentRef = null; // marker the popover is bound to right now
  var showTimer = 0;
  var hideTimer = 0;
  var popId = 'fn-preview-popover';
  var helpId = 'fn-preview-keyboard-help';
  var ownedExpanded = new WeakSet();
  var generation = 0;
  var hoveredRef = null;
  var hoveringPop = false;
  var suppressFocusRef = null;

  function addToken(ref, name, token) {
    var values = (ref.getAttribute(name) || '').split(/\s+/).filter(Boolean);
    if (values.indexOf(token) === -1) values.push(token);
    ref.setAttribute(name, values.join(' '));
  }

  function expanded(ref, value) {
    if (ref && ownedExpanded.has(ref)) ref.setAttribute('aria-expanded', String(value));
  }

  function buildPop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'fn-popover';
    pop.id = popId;
    pop.style.left = '0px';
    pop.style.top = '0px';
    pop.setAttribute('role', 'region');
    pop.setAttribute('aria-label', isZh ? '脚注预览' : 'Footnote preview');
    pop.setAttribute('aria-hidden', 'true');
    pop.inert = true;

    popHint = document.createElement('span');
    popHint.className = 'fn-popover__keyboard-hint';
    popHint.textContent = isZh ? '在标记上按 ↓ 进入预览' : 'At the marker, press ↓ to enter.';
    popHint.setAttribute('aria-hidden', 'true');
    popHint.hidden = true;
    pop.appendChild(popHint);

    popBody = document.createElement('div');
    popBody.className = 'fn-popover__body';
    popBody.tabIndex = 0;
    popBody.setAttribute('role', 'group');
    popBody.setAttribute('aria-label', isZh ? '脚注内容' : 'Note content');
    pop.appendChild(popBody);

    popMore = document.createElement('a');
    popMore.className = 'fn-popover__more';
    popMore.textContent = isZh ? '查看脚注 ↓' : 'Go to note ↓';
    pop.appendChild(popMore);

    // Keep the card open while the pointer is inside it (desktop), so
    // links/citations within the note can be clicked.
    pop.addEventListener('mouseenter', function () {
      hoveringPop = true;
      window.clearTimeout(hideTimer);
    });
    pop.addEventListener('mouseleave', function () {
      hoveringPop = false;
      if (!isCoarse()) scheduleHide();
    });
    pop.addEventListener('focusin', function () {
      window.clearTimeout(hideTimer);
    });
    pop.addEventListener('focusout', function (event) {
      if (!pop.contains(event.relatedTarget) && event.relatedTarget !== currentRef) scheduleHide();
    });

    document.body.appendChild(pop);
    var help = document.createElement('span');
    help.id = helpId;
    help.className = 'fn-preview-keyboard-help';
    help.textContent = isZh ? '按向下方向键进入脚注预览，按回车跳到脚注。' : 'Press Arrow Down to enter the preview, or Enter to go to the note.';
    document.body.appendChild(help);
    return pop;
  }

  /* --- Extract a note's text from its <li id="fn:N"> ----------------- */
  function noteHtmlFor(ref) {
    var id;
    try { id = decodeURIComponent((ref.getAttribute('href') || '').slice(1)); }
    catch (_) { return null; }
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
    var bounds = pop.getBoundingClientRect();
    var pw = bounds.width;
    var ph = bounds.height;

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

    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  /* --- Show / hide --------------------------------------------------- */
  function show(ref, keyboard) {
    var html = noteHtmlFor(ref);
    if (!html) return false; // nothing to preview → leave the link alone
    buildPop();
    generation++;
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    // Refocusing the same marker must not recreate a citation being read.
    if (currentRef !== ref) {
      expanded(currentRef, false);
      popBody.innerHTML = html;
      popBody.scrollTop = 0;
      popHint.hidden = !keyboard;
    } else if (keyboard) {
      popHint.hidden = false;
    }
    popMore.setAttribute('href', ref.getAttribute('href'));
    currentRef = ref;
    expanded(ref, true);

    placePop(ref);
    pop.inert = false;
    pop.setAttribute('aria-hidden', 'false');
    // Reflow so the entrance transition replays from the hidden state.
    void pop.offsetWidth;
    pop.classList.add('is-visible');
    return true;
  }

  function hide(returnFocus) {
    generation++;
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    if (!pop) return;
    var ref = currentRef;
    expanded(ref, false);
    currentRef = null;
    pop.classList.remove('is-visible');
    pop.inert = true;
    pop.setAttribute('aria-hidden', 'true');
    hoveringPop = false;
    if (returnFocus && ref && ref.isConnected) {
      suppressFocusRef = ref;
      try { ref.focus({preventScroll: true}); }
      finally { suppressFocusRef = null; }
    }
  }

  function scheduleShow(ref) {
    if (pop && pop.contains(document.activeElement)) return;
    window.clearTimeout(showTimer);
    var owner = ++generation;
    showTimer = window.setTimeout(function () {
      if (owner === generation && hoveredRef === ref) show(ref);
    }, 120);
  }
  function scheduleHide() {
    window.clearTimeout(hideTimer);
    var owner = generation, ref = currentRef;
    hideTimer = window.setTimeout(function () {
      if (owner !== generation || currentRef !== ref || !ref) return;
      if (document.activeElement === ref || pop.contains(document.activeElement) || hoveringPop || hoveredRef === ref) return;
      hide();
    }, 180);
  }

  /* --- Wiring -------------------------------------------------------- */
  refs.forEach(function (ref) {
    if (noteHtmlFor(ref)) {
      buildPop();
      addToken(ref, 'aria-controls', popId);
      addToken(ref, 'aria-describedby', helpId);
      addToken(ref, 'aria-keyshortcuts', 'ArrowDown');
      if (!ref.hasAttribute('aria-expanded')) {
        ownedExpanded.add(ref);
        expanded(ref, false);
      }
    }
    ref.addEventListener('click', function (event) {
      // Keyboard/AT activation (detail 0), modifier clicks and non-primary
      // buttons keep the original anchor's browser behaviour.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || ref.hasAttribute('download') || ref.target && ref.target !== '_self') return;
      if (!isCoarse() || event.detail === 0) { hide(); return; }
      if (currentRef === ref && pop && pop.classList.contains('is-visible')) { hide(); return; }
      if (show(ref)) event.preventDefault();
      else hide();
    });
    ref.addEventListener('mouseenter', function () {
      if (isCoarse()) return;
      hoveredRef = ref;
      scheduleShow(ref);
    });
    ref.addEventListener('mouseleave', function () {
      if (hoveredRef === ref) hoveredRef = null;
      window.clearTimeout(showTimer);
      if (!isCoarse()) scheduleHide();
    });
    ref.addEventListener('focus', function () {
      if (suppressFocusRef !== ref && !isCoarse()) show(ref, ref.matches(':focus-visible'));
    });
    ref.addEventListener('blur', scheduleHide);
    ref.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowDown' || event.isComposing || event.keyCode === 229 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (show(ref, true)) { event.preventDefault(); popBody.focus({preventScroll: true}); }
    });
  });

  document.addEventListener('click', function (event) {
    if (!currentRef || !pop || pop.contains(event.target)) return;
    var marker = event.target.closest && event.target.closest('a.footnote-ref');
    if (marker && content.contains(marker)) return;
    hide();
  }, true);

  window.addEventListener('scroll', function () {
    if (!currentRef) return;
    if (isCoarse() && !pop.contains(document.activeElement)) hide();
    else placePop(currentRef);
  }, {passive: true});

  document.addEventListener('keydown', function (e) {
    if (!currentRef || e.isComposing || e.keyCode === 229) return;
    if (e.key !== 'Escape' && e.keyCode !== 27) return;
    var inside = pop.contains(document.activeElement);
    if (inside || document.activeElement === currentRef) {
      e.preventDefault();
      hide(inside);
    }
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

  window.addEventListener('pagehide', function () { hide(); });
  // Native anchors finish their own navigation before the preview closes.
  window.addEventListener('hashchange', function () { hide(); });
})();
