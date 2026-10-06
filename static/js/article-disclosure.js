/* ============================================================
 * article-disclosure.js — progressive enhancement for native
 * <details> disclosures in article prose.
 *
 * Companion to zzz-details-disclosure.css (see DESIGN.md → Article
 * Disclosure). Two additive behaviours:
 *
 *  1. Tag every classless .post-content <details> as
 *     .article-disclosure so the CSS scope keeps matching after
 *     enhancement (idempotent — re-running adds nothing).
 *  2. For long blocks, append a small bottom 收起 ↑ / Collapse ↑
 *     button that collapses the owning <details> and returns focus
 *     to its summary — scrolling only when the summary is off
 *     screen, so there is no jump when it is already visible.
 *
 * Constraints honoured here: no existing content is reparented, no
 * listener touches <summary> (native click/keyboard semantics are
 * never hijacked), and the native expanded state is not managed —
 * the disclosure stays polished and fully usable with JS disabled.
 * ========================================================== */
(function () {
  'use strict';

  var ZH = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
  var SELECTOR = '.post-content details:not([class]), .post-content details.article-disclosure';
  /* Content height is unmeasurable while the disclosure is closed, so
     "long block" is approximated from text volume; the code-heavy blocks
     this button exists for pass comfortably. */
  var LONG_BLOCK_CHARS = 600;
  var T = {
    collapse: ZH ? '收起' : 'Collapse',
    arrow: ' ↑',
    labelPrefix: ZH ? '收起：' : 'Collapse: '
  };

  function summaryOf(details) {
    return details.querySelector(':scope > summary');
  }

  function titleOf(details) {
    var summary = summaryOf(details);
    return ((summary && summary.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function isLong(details) {
    return (details.textContent || '').replace(/\s+/g, ' ').trim().length >= LONG_BLOCK_CHARS;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* Collapse the owning details and hand focus back to its summary.
     scrollIntoView runs only when the summary is not on screen after the
     collapse, so an already-visible summary never causes a scroll jump
     and an off-screen one always comes back into reach. */
  function collapse(details) {
    var summary = summaryOf(details);
    if (!summary) return;
    var before = summary.getBoundingClientRect();
    var previousScroll = window.scrollY;
    var viewport = window.innerHeight || document.documentElement.clientHeight || 0;
    var visibleTop = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    var wasVisible = before.top >= visibleTop && before.bottom <= viewport;
    details.open = false;
    try {
      summary.focus({ preventScroll: true });
    } catch (err) {
      summary.focus();
    }
    var rect = summary.getBoundingClientRect();
    if (wasVisible) {
      window.scrollTo({ top: previousScroll, behavior: 'instant' });
    } else if (rect.top < visibleTop || rect.bottom > viewport) {
      summary.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
    }
  }

  function appendCollapseButton(details) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-disclosure__collapse';
    button.appendChild(document.createTextNode(T.collapse));
    /* Decorative arrow — kept out of the accessible name. The name may
       carry the summary title so sibling buttons stay distinguishable. */
    var arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = T.arrow;
    button.appendChild(arrow);
    var title = titleOf(details);
    if (title) button.setAttribute('aria-label', T.labelPrefix + title);
    button.addEventListener('click', function () {
      collapse(details);
    });
    details.appendChild(button);
  }

  function enhance() {
    var list = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < list.length; i++) {
      var details = list[i];
      if (details.getAttribute('data-article-disclosure') === '1') continue;
      details.classList.add('article-disclosure');
      details.setAttribute('data-article-disclosure', '1');
      if (isLong(details)) appendCollapseButton(details);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
