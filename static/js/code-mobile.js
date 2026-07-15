/* ============================================================
 * code-mobile.js — mobile code-block reading kit
 *
 * Companion to zzz-code-mobile.css. Three behaviours:
 *
 *  1. Shell-ish blocks (bash/console/text…) soft-wrap by default:
 *     they carry no indentation semantics, and a command you must
 *     copy but cannot see in full is the worst mobile outcome.
 *  2. Every overflowing block grows a small tool cluster:
 *     ⏎ wrap-toggle (scroll ⇄ wrap) and ⛶ expand (phones/tablets).
 *  3. Expand opens a fullscreen reader. While the phone is held
 *     portrait the CSS rotates the panel 90° (simulated landscape —
 *     iOS Safari offers no element-fullscreen or orientation lock),
 *     and font size is adjustable via pinch or A−/A+ buttons.
 *     Zoom = font-size, not transform, so glyphs stay crisp.
 * ========================================================== */
(function () {
  'use strict';

  var WRAP_LANGS = ['bash', 'sh', 'shell', 'zsh', 'console', 'shell-session', 'text', 'plaintext', 'txt'];
  var ZH = (document.documentElement.lang || '').indexOf('zh') === 0;
  var T = {
    wrap: ZH ? '切换自动换行' : 'Toggle line wrap',
    expand: ZH ? '全屏阅读' : 'Read fullscreen',
    close: ZH ? '关闭' : 'Close',
    zoomIn: ZH ? '放大' : 'Zoom in',
    zoomOut: ZH ? '缩小' : 'Zoom out'
  };

  var ZOOM_MIN = 10, ZOOM_MAX = 26, ZOOM_STEP = 2, ZOOM_DEFAULT = 14;

  function langOf(code) {
    var lang = code.getAttribute('data-lang');
    if (!lang) {
      var m = (code.className || '').match(/language-([\w-]+)/);
      lang = m ? m[1] : '';
    }
    return lang.toLowerCase();
  }

  function blocks() {
    return Array.prototype.slice.call(
      document.querySelectorAll('.post-content pre:not(.mermaid) > code')
    );
  }

  /* ── Tool cluster ─────────────────────────────────────────── */

  var WRAP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M3 12h13a3 3 0 1 1 0 6h-3"/><path d="m15 16-2 2 2 2"/><path d="M3 18h6"/></svg>';
  var EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';

  function ensureTools(code) {
    var pre = code.parentNode;
    var container = pre.closest('.highlight') || pre;
    var tools = container.querySelector(':scope > .code-tools');
    if (tools) return tools;

    tools = document.createElement('div');
    tools.className = 'code-tools';

    var wrapBtn = document.createElement('button');
    wrapBtn.type = 'button';
    wrapBtn.className = 'code-tool-wrap';
    wrapBtn.setAttribute('aria-label', T.wrap);
    wrapBtn.setAttribute('aria-pressed', pre.classList.contains('code-wrap') ? 'true' : 'false');
    wrapBtn.innerHTML = WRAP_ICON;
    wrapBtn.addEventListener('click', function () {
      var wrapped = pre.classList.toggle('code-wrap');
      wrapBtn.setAttribute('aria-pressed', wrapped ? 'true' : 'false');
      refresh(code);
      /* Let the edge-fade affordance re-measure the block. */
      window.dispatchEvent(new Event('resize'));
    });

    var expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'code-tool-expand';
    expandBtn.setAttribute('aria-label', T.expand);
    expandBtn.innerHTML = EXPAND_ICON;
    expandBtn.addEventListener('click', function () {
      openReader(container, code);
    });

    tools.appendChild(wrapBtn);
    tools.appendChild(expandBtn);
    container.appendChild(tools);
    return tools;
  }

  function refresh(code) {
    var pre = code.parentNode;
    var container = pre.closest('.highlight') || pre;
    var wrapped = pre.classList.contains('code-wrap');
    var overflows = code.scrollWidth - code.clientWidth > 2;
    if (wrapped || overflows) {
      ensureTools(code).style.display = '';
    } else {
      var tools = container.querySelector(':scope > .code-tools');
      if (tools) tools.style.display = 'none';
    }
  }

  function refreshAll() {
    blocks().forEach(refresh);
  }

  /* ── Fullscreen reader ────────────────────────────────────── */

  var backdrop = null;
  var zoom = ZOOM_DEFAULT;
  var lastFocus = null;

  function buildReader() {
    backdrop = document.createElement('div');
    backdrop.className = 'code-fs-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = [
      '<div class="code-fs-stage" role="dialog" aria-modal="true" aria-label="', T.expand, '">',
        '<div class="code-fs-bar">',
          '<span class="code-fs-lang"></span>',
          '<button type="button" class="code-fs-zoom-out" aria-label="', T.zoomOut, '">A−</button>',
          '<span class="code-fs-zoom-val" aria-hidden="true"></span>',
          '<button type="button" class="code-fs-zoom-in" aria-label="', T.zoomIn, '">A+</button>',
          '<button type="button" class="code-fs-close" aria-label="', T.close, '">×</button>',
        '</div>',
        '<div class="code-fs-scroll"><div class="post-content code-fs-content"></div></div>',
      '</div>'
    ].join('');

    backdrop.querySelector('.code-fs-close').addEventListener('click', closeReader);
    backdrop.querySelector('.code-fs-zoom-in').addEventListener('click', function () { setZoom(zoom + ZOOM_STEP); });
    backdrop.querySelector('.code-fs-zoom-out').addEventListener('click', function () { setZoom(zoom - ZOOM_STEP); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeReader();
    });

    /* Pinch → font-size. Manual tracking: with two fingers down we
       take over (preventDefault) so the page never zooms; one-finger
       panning stays fully native. */
    var scroller = backdrop.querySelector('.code-fs-scroll');
    var pinchDist = 0, pinchZoom = zoom;
    function dist(t) {
      var dx = t[0].clientX - t[1].clientX;
      var dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    }
    scroller.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinchDist = dist(e.touches);
        pinchZoom = zoom;
      }
    }, { passive: true });
    scroller.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        setZoom(pinchZoom * (dist(e.touches) / pinchDist));
      }
    }, { passive: false });
    scroller.addEventListener('touchend', function () { pinchDist = 0; });

    /* iOS Safari fires proprietary gesture events for pinch; kill
       them inside the reader so the page itself never scales. */
    ['gesturestart', 'gesturechange'].forEach(function (ev) {
      backdrop.addEventListener(ev, function (e) { e.preventDefault(); });
    });

    document.body.appendChild(backdrop);
    return backdrop;
  }

  function setZoom(px) {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, px));
    backdrop.style.setProperty('--code-fs-size', zoom.toFixed(1) + 'px');
    backdrop.querySelector('.code-fs-zoom-val').textContent = Math.round(zoom);
  }

  function openReader(container, code) {
    var bd = backdrop || buildReader();

    /* Clone the whole highlight container: token spans + their
       theme classes come along, and the .post-content wrapper class
       inside the reader lets all four code themes resolve. */
    var clone = container.cloneNode(true);
    clone.querySelectorAll('.copy-code, .code-tools').forEach(function (n) { n.remove(); });
    clone.classList.remove('x-scroll');
    clone.querySelectorAll('.x-scroll').forEach(function (n) { n.classList.remove('x-scroll'); });
    clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    clone.querySelectorAll('pre').forEach(function (n) { n.classList.remove('code-wrap'); });

    var content = bd.querySelector('.code-fs-content');
    content.innerHTML = '';
    content.appendChild(clone);

    /* Match the reader chrome to the active code theme. */
    var cs = window.getComputedStyle(container);
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      bd.style.background = cs.backgroundColor;
    }
    bd.style.color = window.getComputedStyle(code).color;

    bd.querySelector('.code-fs-lang').textContent = langOf(code);
    setZoom(zoom);

    lastFocus = document.activeElement;
    bd.classList.add('is-open');
    bd.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    bd.querySelector('.code-fs-close').focus();
  }

  function closeReader() {
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ── Init ─────────────────────────────────────────────────── */

  function init() {
    blocks().forEach(function (code) {
      if (WRAP_LANGS.indexOf(langOf(code)) !== -1) {
        code.parentNode.classList.add('code-wrap');
      }
      refresh(code);
    });

    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(refreshAll, 150);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
