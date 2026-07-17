/* ============================================================
 * link-preview.js
 * Hover cards for internal article links — a floating marginalia
 * note that answers "is this worth the jump?" without leaving
 * the page.
 *
 *  • Data comes from build time: the render-link hook stamps
 *    data-lp-{eyebrow,title,desc,meta} onto internal article
 *    links, so showing a card costs zero network requests.
 *  • Desktop-only (hover + fine pointer). Touch keeps plain
 *    links; the card is redundant with the target page, so
 *    screen readers never see it (aria-hidden).
 *  • Long open delay (~550ms, after Wikipedia's Page Previews
 *    research) so readers who "hover-read" text aren't nagged;
 *    the pointer may travel into the card to keep it open.
 *  • While a card is up the target URL is prefetched once, so
 *    the click that follows lands on a warm cache.
 *
 * One shared card element is reused for every link. Progressive
 * enhancement: without JS (or attributes) links behave exactly
 * as before. Styling lives in zzz-link-preview.css.
 * ========================================================== */
(function () {
  'use strict';

  if (
    !(
      window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    )
  )
    return;

  var content = document.querySelector('.post-content');
  if (!content) return;

  var links = content.querySelectorAll('a[data-lp-title]');
  if (!links.length) return;

  var OPEN_DELAY = 550; // long enough to ignore "hover-readers"
  var CLOSE_DELAY = 250; // grace period to travel into the card

  /* --- One shared card, lazily built -------------------------------- */
  var card = null;
  var elEyebrow = null;
  var elTitle = null;
  var elDesc = null;
  var elMeta = null;
  var current = null; // link the card is bound to right now
  var showTimer = 0;
  var hideTimer = 0;
  var prefetched = Object.create(null);

  function buildCard() {
    if (card) return card;
    card = document.createElement('div');
    card.className = 'lp-card';
    card.setAttribute('aria-hidden', 'true');

    elEyebrow = document.createElement('div');
    elEyebrow.className = 'lp-card__eyebrow';
    elTitle = document.createElement('div');
    elTitle.className = 'lp-card__title';
    elDesc = document.createElement('div');
    elDesc.className = 'lp-card__desc';
    elMeta = document.createElement('div');
    elMeta.className = 'lp-card__meta';
    card.appendChild(elEyebrow);
    card.appendChild(elTitle);
    card.appendChild(elDesc);
    card.appendChild(elMeta);

    // Pointer inside the card keeps it open; leaving schedules a close.
    card.addEventListener('mouseenter', function () {
      window.clearTimeout(hideTimer);
    });
    card.addEventListener('mouseleave', scheduleHide);
    // The card is a proxy for the link under it — clicking follows through.
    card.addEventListener('click', function () {
      if (current) window.location.href = current.href;
    });

    document.body.appendChild(card);
    return card;
  }

  /* --- Prefetch: make the follow-up click land on a warm cache ------- */
  function prefetch(href) {
    if (prefetched[href]) return;
    prefetched[href] = true;
    if (navigator.connection && navigator.connection.saveData) return;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    l.as = 'document';
    document.head.appendChild(l);
  }

  /* --- Positioning: prefer below the link, flip above if clipped ----- */
  function placeCard(link) {
    var margin = 12;
    var gap = 8;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;

    // Let the card size to its content first (CSS caps the width).
    card.style.left = '0px';
    card.style.top = '0px';
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;

    var r = link.getBoundingClientRect();
    var cx = r.left + r.width / 2;

    var left = Math.round(cx - cw / 2);
    left = Math.max(margin, Math.min(left, vw - cw - margin));

    var placeAbove = r.bottom + gap + ch > vh - margin;
    var top = placeAbove ? r.top - ch - gap : r.bottom + gap;
    top = Math.max(margin, Math.min(top, vh - ch - margin));

    card.classList.toggle('is-above', placeAbove);
    card.style.left = left + window.scrollX + 'px';
    card.style.top = top + window.scrollY + 'px';
  }

  /* --- Show / hide --------------------------------------------------- */
  function show(link) {
    buildCard();
    window.clearTimeout(hideTimer);

    elEyebrow.textContent = link.getAttribute('data-lp-eyebrow') || '';
    elEyebrow.hidden = !elEyebrow.textContent;
    elTitle.textContent = link.getAttribute('data-lp-title') || '';
    elDesc.textContent = link.getAttribute('data-lp-desc') || '';
    elDesc.hidden = !elDesc.textContent;
    elMeta.textContent = link.getAttribute('data-lp-meta') || '';
    elMeta.hidden = !elMeta.textContent;

    current = link;
    placeCard(link);
    // Reflow so the entrance transition replays from the hidden state.
    void card.offsetWidth;
    card.classList.add('is-visible');
    prefetch(link.href);
  }

  function hide() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    if (!card) return;
    card.classList.remove('is-visible');
    current = null;
  }

  function scheduleShow(link) {
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(function () {
      show(link);
    }, OPEN_DELAY);
  }
  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, CLOSE_DELAY);
  }

  /* --- Wiring -------------------------------------------------------- */
  links.forEach(function (link) {
    link.addEventListener('mouseenter', function () {
      window.clearTimeout(hideTimer);
      scheduleShow(link);
    });
    link.addEventListener('mouseleave', function () {
      window.clearTimeout(showTimer);
      scheduleHide();
    });
    // Keyboard: focus previews after a shorter beat, blur dismisses.
    link.addEventListener('focus', function () {
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(function () {
        show(link);
      }, 150);
    });
    link.addEventListener('blur', function () {
      window.clearTimeout(showTimer);
      scheduleHide();
    });
    // Clicking through should never leave a stale card behind.
    link.addEventListener('click', hide);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });
  window.addEventListener(
    'scroll',
    function () {
      if (current && card && card.classList.contains('is-visible')) {
        placeCard(current);
      }
    },
    { passive: true }
  );
  window.addEventListener(
    'resize',
    function () {
      if (current && card && card.classList.contains('is-visible')) {
        placeCard(current);
      }
    },
    { passive: true }
  );
})();
