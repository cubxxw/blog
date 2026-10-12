/**
 * Native article text selection, anchored actions and noninterrupting responses.
 * Plain reading clicks stay quiet. Shared cards and existing chat own their UI.
 * Comment provider stays in its original DOM so iframe drafts survive.
 * See docs/article-selection.md for selection, mobile and transport contracts.
 */
(function () {
  'use strict';

  // ── Configuration ─────────────────────────────────────────────────────
  var configEl = document.getElementById('asel-config');
  if (!configEl) return;
  var config = {};
  try {
    config = JSON.parse(configEl.textContent || '{}');
  } catch (err) {
    return;
  }
  var content = document.querySelector('.post-content');
  if (!content) return; // default single-article layout only

  var isZh = String(config.language || '').toLowerCase().indexOf('zh') === 0;

  var T = isZh ? {
    toolbar: '文章选区工具',
    share: '分享',
    ai: 'AI 分析',
    comment: '评论',
    more: '更多',
    copyQuote: '复制引用（含来源）',
    copyLink: '复制段落链接',
    clear: '清除选择',
    copied: '已复制',
    copyFailed: '自动复制被拒绝，请手动复制下面的文本。',
    manualHint: '手动复制（全选后复制）：',
    manualClose: '关闭',
    shareTitle: '分享引用',
    aiTitle: 'AI 分析选文',
    commentTitle: '引用选文',
    quoteCopy: '复制引用',
    commentNote: '复制引用，在下方评论框粘贴后发表。',
    cardMoss: '墨 / 苔',
    cardPaper: '纸',
    cardDusk: '暮',
    cardStyle: '卡片样式',
    download: '下载 PNG',
    nativeShare: '分享图片',
    close: '关闭',
    send: '发送',
    retry: '重试',
    cancel: '取消',
    thinking: '正在解释…',
    aiError: '分析失败，请重试。',
    aiTimeout: '请求超时，请重试。',
    aiCancelled: '已取消。',
    aiEmpty: '（未收到回复）',
    aiQuestion: '请解释这段选文在这篇文章语境中的含义。',
    aiPlaceholder: '想继续追问什么？',
    limitNote: '选文过长（{n} 字符，上限 {max}），请缩短选择后再导出图片。引用文本仍可完整复制。',
    aiLimit: '选文过长（{n} 字符，上限 {max}）。请缩短选择后再运行 AI 分析。',
    sourceLabel: '来源',
    shared: '已分享',
    shareCancelled: '已取消分享',
    shareFailed: '系统分享不可用，可下载 PNG 后分享。'
  } : {
    toolbar: 'Article selection tools',
    share: 'Share',
    ai: 'AI analysis',
    comment: 'Comment',
    more: 'More',
    copyQuote: 'Copy quote (with source)',
    copyLink: 'Copy passage link',
    clear: 'Clear',
    copied: 'Copied',
    copyFailed: 'Automatic copy was refused. Copy the text below manually.',
    manualHint: 'Copy manually (select all, then copy):',
    manualClose: 'Close',
    shareTitle: 'Share quote',
    aiTitle: 'AI analysis of the selection',
    commentTitle: 'Quoted passage',
    quoteCopy: 'Copy quote',
    commentNote: 'Copy the quote, paste it into the comment box below, then post.',
    cardMoss: 'ink / moss',
    cardPaper: 'paper',
    cardDusk: 'dusk',
    cardStyle: 'Card style',
    download: 'Download PNG',
    nativeShare: 'Share image',
    close: 'Close',
    send: 'Send',
    retry: 'Retry',
    cancel: 'Cancel',
    thinking: 'Explaining…',
    aiError: 'Analysis failed. Please retry.',
    aiTimeout: 'Request timed out. Please retry.',
    aiCancelled: 'Cancelled.',
    aiEmpty: '(No answer received)',
    aiQuestion: 'Explain this passage in the context of this article.',
    aiPlaceholder: 'Ask a follow-up question…',
    limitNote: 'Selection too long ({n} characters, limit {max}). Shorten it before exporting the image. The quote text itself can still be copied in full.',
    aiLimit: 'Selection too long ({n} characters, limit {max}). Shorten the selection before running AI analysis.',
    sourceLabel: 'Source',
    shared: 'Shared',
    shareCancelled: 'Share cancelled',
    shareFailed: 'System sharing is unavailable. Download the PNG to share it.'
  };

  // ── Constants (documented in docs/article-selection.md) ───────────────
  var PAD = 12;                 // viewport edge padding for clamping
  var HEADER_GAP = 8;           // clearance under detected fixed/sticky chrome
  var GAP = 10;                 // desktop gap above/below the chosen rect
  var TOUCH_CLEARANCE = 56;     // keep clear of the native selection menu
  var SETTLE_MS = 350;          // wait for touch selection to settle
  var AI_MAX_SELECTED = 6000;   // mirror of the backend bound
  var AI_MAX_CONTEXT = 5600;    // mirror of the backend bound
  var TEXTFRAG_MAX = 300;

  var BLOCK_SELECTOR = 'p, li, blockquote';
  var WIDGET_SELECTOR = 'figure, table, [data-ib-root], [data-asel-ignore]';
  var DENY_SELECTOR = 'a, button, input, textarea, select, summary, details, ' +
    'code, pre, kbd, samp, img, picture, video, audio, iframe, canvas, svg, ' +
    'table, figure, [data-ib-root], [data-asel-ignore], [contenteditable="true"]';

  // ── Tiny DOM helpers ──────────────────────────────────────────────────
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fill(str, map) {
    return String(str).replace(/\{(\w+)\}/g, function (m, key) {
      return map[key] != null ? String(map[key]) : m;
    });
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function coarsePointer() {
    return window.matchMedia && window.matchMedia('(hover: none)').matches;
  }

  // ── Deterministic paragraph ids (stable passage links) ────────────────
  // Every selectable block needs a fallback anchor, including list items
  // with nested lists. Preserve authored IDs and avoid collisions.
  function assignBlockIds() {
    var blocks = content.querySelectorAll(BLOCK_SELECTOR);
    var n = 0;
    for (var j = 0; j < blocks.length; j += 1) {
      var block = blocks[j];
      if (block.closest(WIDGET_SELECTOR)) continue;
      if (!block.id) {
        do { n += 1; } while (document.getElementById('asel-p' + n));
        block.id = 'asel-p' + n;
      }
    }
  }

  function blockFor(node) {
    if (!node) return null;
    var elem = node.nodeType === 1 ? node : node.parentElement;
    if (!elem || !content.contains(elem)) return null;
    var block = elem.closest(BLOCK_SELECTOR);
    if (!block || !content.contains(block)) return null;
    if (block.closest(WIDGET_SELECTOR)) return null;
    if (!(block.innerText || block.textContent || '').trim()) return null;
    return block;
  }

  function textFragmentsSupported() {
    return config.textFragment !== false && 'fragmentDirective' in document;
  }

  function textFragmentPart(quote) {
    var text = String(quote || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    function encode(value) { return encodeURIComponent(value).replace(/-/g, '%2D'); }
    if (text.length <= 160) return encode(text);
    return encode(text.slice(0, 80)) + ',' + encode(text.slice(-80));
  }

  function startBlockForRange(range) {
    return blockFor(range.startContainer) || blockFor(range.endContainer);
  }

  function passageLink() {
    var url = String(config.url || '').split('#')[0];
    if (!url) {
      // Config carries the canonical production permalink (with the real
      // language path). location.href is only a last resort and never used
      // for exported quote cards.
      url = location.origin + location.pathname;
    }
    var block = mode === 'block' ? anchorBlock : (anchorRange ? startBlockForRange(anchorRange) : null);
    if (block && block.id) url += '#' + block.id;
    if (textFragmentsSupported() && anchorQuote.trim()) {
      var frag = textFragmentPart(anchorQuote);
      if (frag) url += (url.indexOf('#') === -1 ? '#' : '') + ':~:text=' + frag;
    }
    return url;
  }

  // ── State ─────────────────────────────────────────────────────────────
  var mode = null;        // 'block' | 'range'
  var dismissed = false;  // Esc dismiss — stays hidden until a new selection
  var anchorBlock = null; // block mode anchor element
  var anchorRange = null; // range mode anchor range
  var anchorQuote = '';   // exact selected text
  var faded = false;
  var menuOpen = false;
  var lastTouchAt = 0;
  var settleTimer = 0;
  var pointerSelecting = false;

  // ── UI construction (mounted on body, outside prose) ──────────────────
  var root = el('div', 'asel-root');
  root.setAttribute('aria-hidden', 'false');

  var marker = el('div', 'asel-marker');
  marker.hidden = true;

  var toolbar = el('div', 'asel-toolbar');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', T.toolbar);

  var buttons = {};
  function makeButton(action, label) {
    var btn = el('button', 'asel-btn', label);
    btn.type = 'button';
    btn.setAttribute('data-asel-action', action);
    buttons[action] = btn;
    return btn;
  }

  var aiEnabled = config.ai === true;
  var commentsSection = document.querySelector('.post-comments');
  var commentsEnabled = config.comments !== false && !!commentsSection;

  toolbar.appendChild(makeButton('share', T.share));
  if (aiEnabled) toolbar.appendChild(makeButton('ai', T.ai));
  if (commentsEnabled) toolbar.appendChild(makeButton('comment', T.comment));
  if (aiEnabled || commentsEnabled) {
    var sep = el('span', 'asel-btn-sep');
    sep.setAttribute('aria-hidden', 'true');
    toolbar.appendChild(sep);
  }
  var moreBtn = makeButton('more', T.more);
  moreBtn.setAttribute('aria-haspopup', 'menu');
  moreBtn.setAttribute('aria-expanded', 'false');
  toolbar.appendChild(moreBtn);

  var menu = el('div', 'asel-menu');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', T.more);
  menu.hidden = true;
  var menuItems = [];
  function makeMenuItem(action, label) {
    var item = el('button', 'asel-menu-item', label);
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.setAttribute('data-asel-action', action);
    item.tabIndex = -1;
    menu.appendChild(item);
    menuItems.push(item);
    return item;
  }
  makeMenuItem('copy-quote', T.copyQuote);
  makeMenuItem('copy-link', T.copyLink);
  makeMenuItem('clear', T.clear);

  var toast = el('div', 'asel-toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  var manual = el('div', 'asel-manual');
  manual.hidden = true;
  var manualHint = el('p', 'asel-manual-hint', T.manualHint);
  var manualArea = el('textarea');
  manualArea.setAttribute('readonly', 'readonly');
  manualArea.setAttribute('aria-label', T.manualHint);
  var manualClose = el('button', 'asel-manual-close', T.manualClose);
  manualClose.type = 'button';
  manual.appendChild(manualHint);
  manual.appendChild(manualArea);
  manual.appendChild(manualClose);

  root.appendChild(marker);
  root.appendChild(toolbar);
  root.appendChild(menu);
  document.body.appendChild(toast);
  root.appendChild(manual);
  document.body.appendChild(root);

  // ── Copy helpers (clipboard refusal → visible selectable field) ───────
  var toastTimer = 0;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('asel-toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('asel-toast--visible');
    }, 2200);
  }

  function showManual(text) {
    var activeDialog = document.querySelector('.asel-dialog[open]');
    (activeDialog ? activeDialog.querySelector('.asel-dialog-body') : root).appendChild(manual);
    manual.classList.toggle('asel-manual--modal', !!activeDialog);
    manualArea.value = text;
    manual.hidden = false;
    manualHint.textContent = T.copyFailed;
    try {
      manualArea.focus();
      manualArea.select();
    } catch (err) { /* focus is best-effort */ }
  }

  manualClose.addEventListener('click', function () {
    manual.hidden = true;
  });

  function copyText(text, manualFallback) {
    function legacyCopy() {
      try {
        var ta = el('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        (document.querySelector('.asel-dialog[open]') || document.body).appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (err) {
        return false;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(T.copied);
      }).catch(function () {
        if (!legacyCopy()) {
          showToast(T.copyFailed);
          showManual(text);
        } else {
          showToast(T.copied);
        }
      });
      return;
    }
    if (legacyCopy()) {
      showToast(T.copied);
      return;
    }
    showToast(T.copyFailed);
    if (manualFallback !== false) showManual(text);
  }

  function quoteWithSource() {
    var url = passageLink();
    return anchorQuote.split('\n').map(function (line) { return '> ' + line; }).join('\n') +
      '\n\n\u2014 ' + String(config.title || '') + '\n' + url;
  }

  // ── Visibility + placement ────────────────────────────────────────────
  function setFaded(next) {
    if (faded === next) return;
    faded = next;
    root.classList.toggle('asel-faded', next);
    toolbar.inert = next;
    toolbar.setAttribute('aria-hidden', next ? 'true' : 'false');
    if (next && menuOpen) closeMenu(false);
  }

  function hideAll() {
    setFaded(true);
    marker.hidden = true;
    toolbar.style.visibility = 'hidden';
    menu.hidden = true;
    menuOpen = false;
    moreBtn.setAttribute('aria-expanded', 'false');
  }

  function currentRects() {
    try {
      if (mode === 'block') {
        if (!anchorBlock || !content.contains(anchorBlock)) return [];
        var rect = anchorBlock.getBoundingClientRect();
        return rect.height > 0 && rect.width > 0 ? [rect] : [];
      }
      if (mode === 'range' && anchorRange) {
        var raw = anchorRange.getClientRects();
        var rects = [];
        for (var i = 0; i < raw.length; i += 1) {
          if (raw[i].width > 0 && raw[i].height > 0) rects.push(raw[i]);
        }
        return rects;
      }
    } catch (err) {
      return [];
    }
    return [];
  }

  // Current rendered fixed/sticky visible chrome pinned to the top edge —
  // sampled through elementsFromPoint so hidden or scrolled-away chrome is
  // never counted.
  function fixedChromeBottom() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var ys = [2, 10, 24, 48, 80];
    var best = 0;
    if (!document.elementsFromPoint) return best;
    for (var i = 0; i < ys.length; i += 1) {
      var y = ys[i];
      if (y >= vh) continue;
      var stack = document.elementsFromPoint(Math.round(vw / 2), y);
      for (var j = 0; j < stack.length; j += 1) {
        var node = stack[j];
        if (!node || node === document.documentElement || node === document.body) continue;
        if (root.contains(node)) continue;
        var style = window.getComputedStyle(node);
        if (style.position !== 'fixed' && style.position !== 'sticky') continue;
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
        var rect = node.getBoundingClientRect();
        if (rect.height <= 0 || rect.top > y || rect.bottom <= 0) continue;
        if (rect.bottom > best) best = rect.bottom;
      }
    }
    return best;
  }

  function positionMenu() {
    if (!menuOpen) return;
    var tRect = toolbar.getBoundingClientRect();
    var mRect = menu.getBoundingClientRect();
    var x = clamp(tRect.left, PAD, window.innerWidth - mRect.width - PAD);
    var below = tRect.bottom + 6;
    var y = below + mRect.height <= window.innerHeight - PAD
      ? below
      : Math.max(PAD, tRect.top - mRect.height - 6);
    menu.style.left = Math.round(x) + 'px';
    menu.style.top = Math.round(y) + 'px';
  }

  function reposition() {
    if (!mode || dismissed) return;
    var rects = currentRects();
    if (!rects.length) {
      hideAll();
      return;
    }

    var fullTop = Infinity;
    var fullBottom = -Infinity;
    var fullLeft = Infinity;
    var visTop = Infinity;
    var visBottom = -Infinity;
    var anyVisible = false;
    var vh = window.innerHeight;
    for (var i = 0; i < rects.length; i += 1) {
      var r = rects[i];
      if (r.top < fullTop) fullTop = r.top;
      if (r.bottom > fullBottom) fullBottom = r.bottom;
      if (r.left < fullLeft) fullLeft = r.left;
      var top = Math.max(r.top, PAD);
      var bottom = Math.min(r.bottom, vh - PAD);
      if (bottom > top) {
        anyVisible = true;
        if (top < visTop) visTop = top;
        if (bottom > visBottom) visBottom = bottom;
      }
    }

    if (!anyVisible) {
      // Anchor left the viewport: fade toolbar + menu + marker, never leave
      // an orphan toolbar behind.
      setFaded(true);
      return;
    }

    // A roomy contour around the selected prose; range placement stays exact.
    var marked = selectionBlocks();
    if (marked.length) {
      var mLeft = Infinity, mTop = Infinity, mRight = -Infinity, mBottom = -Infinity;
      marked.forEach(function (block) {
        var b = block.getBoundingClientRect();
        mLeft = Math.min(mLeft, b.left); mTop = Math.min(mTop, b.top);
        mRight = Math.max(mRight, b.right); mBottom = Math.max(mBottom, b.bottom);
      });
      var markerLeft = Math.max(PAD, mLeft - 8);
      marker.hidden = false;
      marker.style.left = Math.round(markerLeft) + 'px';
      marker.style.top = Math.round(mTop - 6) + 'px';
      marker.style.width = Math.round(Math.max(0, Math.min(window.innerWidth - PAD, mRight + 8) - markerLeft)) + 'px';
      marker.style.height = Math.round(mBottom - mTop + 12) + 'px';
    } else {
      marker.hidden = true;
    }

    var tRect = toolbar.getBoundingClientRect();
    var h = tRect.height || 32;
    var w = tRect.width || 240;
    var chromeBottom = fixedChromeBottom();
    var allowedTop = Math.max(PAD, chromeBottom + HEADER_GAP);
    // Mobile touch selection keeps >=56px below the selection (native menu /
    // drag handles); ordinary taps use the calm 10px desktop gap.
    var gap = (coarsePointer() && mode === 'range') ? TOUCH_CLEARANCE : GAP;

    var y = null;
    if (gap === TOUCH_CLEARANCE) {
      // Touch: below the selection first (>=56px), keeping clear of the
      // common system menu / drag-handle zone. The OS menu rect is not
      // exposed to pages — this clearance is a documented heuristic.
      var touchBelow = fullBottom + TOUCH_CLEARANCE;
      if (touchBelow + h <= vh - PAD) {
        y = touchBelow;
      } else {
        var touchAbove = fullTop - h - TOUCH_CLEARANCE;
        if (touchAbove >= allowedTop) y = touchAbove;
      }
    } else {
      var above = visTop - h - gap;            // tracks visible selected text
      if (above >= allowedTop) {
        y = above;
      } else {
        var below = fullBottom + gap;          // falls below the FULL block/range
        if (below + h <= vh - PAD) {
          y = below;
        }
      }
    }

    if (y == null) {
      // Neither side fits: hide until the anchor fits again.
      setFaded(true);
      return;
    }

    var x = clamp(fullLeft, PAD, window.innerWidth - w - PAD);
    toolbar.style.visibility = 'visible';
    toolbar.style.left = Math.round(x) + 'px';
    toolbar.style.top = Math.round(Math.max(allowedTop, y)) + 'px';
    setFaded(false);
    positionMenu();
  }

  var rafPending = false;
  function scheduleReposition() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(function () {
      rafPending = false;
      reposition();
    });
  }

  window.addEventListener('scroll', scheduleReposition, { passive: true, capture: true });
  window.addEventListener('resize', scheduleReposition);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleReposition);
    window.visualViewport.addEventListener('scroll', scheduleReposition);
  }

  // ── Selection flow ────────────────────────────────────────────────────
  function captureRangeSelection() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    var range = sel.getRangeAt(0);
    // Ranges reaching outside the article are rejected wholesale.
    if (!content.contains(range.commonAncestorContainer)) return false;
    if (!content.contains(range.startContainer) || !content.contains(range.endContainer)) return false;
    if (!blockFor(range.startContainer) || !blockFor(range.endContainer)) return false;
    var quote = sel.toString();
    if (!quote || !quote.trim()) return false;
    anchorRange = range.cloneRange();
    anchorBlock = null;
    anchorQuote = quote;
    mode = 'range';
    dismissed = false;
    scheduleReposition();
    return true;
  }

  function handleSelectionChange() {
    if (pointerSelecting) return;
    if (menuOpen) return;
    if (root.contains(document.activeElement)) return;
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (mode === 'range') {
        discardAnchor();
      }
      return;
    }
    if (!content.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      discardAnchor();
      return;
    }
    clearTimeout(settleTimer);
    setFaded(true);
    settleTimer = setTimeout(function () {
      if (pointerSelecting) return;
      if (captureRangeSelection()) scheduleReposition();
      else discardAnchor();
    }, Date.now() - lastTouchAt < 900 ? SETTLE_MS : 150);
  }

  function discardAnchor() {
    mode = null;
    anchorRange = null;
    anchorBlock = null;
    anchorQuote = '';
    hideAll();
  }

  var selRaf = 0;
  document.addEventListener('selectionchange', function () {
    if (selRaf) return;
    selRaf = window.requestAnimationFrame(function () {
      selRaf = 0;
      handleSelectionChange();
    });
  });

  document.addEventListener('touchstart', function () {
    lastTouchAt = Date.now();
  }, { passive: true });

  document.addEventListener('click', function (event) {
    if (root.contains(event.target)) return;
    if (!content.contains(event.target)) {
      // Clicks far outside the article dismiss; nothing else is touched.
      if (mode) clearSelection();
      return;
    }
    // Never interfere with links, buttons, inputs, code, images, details,
    // shortcodes or any other interactive widget.
    if (event.target.closest && event.target.closest(DENY_SELECTOR)) return;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0 &&
        content.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      // End of a drag: keep the range selection and its exact anchor.
      handleSelectionChange();
      return;
    }
    // Ordinary reading clicks are deliberately quiet.
    discardAnchor();
  });

  document.addEventListener('touchend', function () {
    lastTouchAt = Date.now();
  }, { passive: true });

  function clearSelection() {
    clearTimeout(settleTimer);
    var sel = window.getSelection();
    if (sel && sel.removeAllRanges) sel.removeAllRanges();
    mode = null;
    anchorBlock = null;
    anchorRange = null;
    anchorQuote = '';
    hideAll();
    marker.hidden = true;
    toolbar.style.visibility = 'hidden';
  }

  // ── More menu ─────────────────────────────────────────────────────────
  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    moreBtn.setAttribute('aria-expanded', 'true');
    positionMenu();
    if (menuItems[0]) menuItems[0].focus();
  }

  function closeMenu(restoreFocus) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.hidden = true;
    moreBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) moreBtn.focus();
  }

  menu.addEventListener('keydown', function (event) {
    var idx = menuItems.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      menuItems[(idx + 1 + menuItems.length) % menuItems.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      menuItems[(idx - 1 + menuItems.length) % menuItems.length].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      menuItems[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      menuItems[menuItems.length - 1].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === 'Tab') {
      closeMenu(false);
    }
  });

  document.addEventListener('pointerdown', function (event) {
    if (content.contains(event.target)) {
      pointerSelecting = true;
      clearTimeout(settleTimer);
      hideAll();
    }
    if (menuOpen && !menu.contains(event.target) && event.target !== moreBtn) {
      closeMenu(false);
    }
  });
  document.addEventListener('pointerup', function () {
    if (!pointerSelecting) return;
    pointerSelecting = false;
    handleSelectionChange();
  });
  document.addEventListener('pointercancel', function () {
    pointerSelecting = false;
    handleSelectionChange();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById('conv-share-modal')) return;
    if (commentOpen) { closeComments(); return; }
    if (document.querySelector('dialog[open]')) return; // native dialogs own Esc
    if (menuOpen) {
      closeMenu(true);
      return;
    }
    if (mode) {
      // Dismiss the floating UI only; the reader's selection stays intact
      // and stays dismissed until the next selection happens.
      dismissed = true;
      hideAll();
    }
  });

  function articleTextForRequest() {
    var text = (content.innerText || content.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length <= 5500) return text;
    return text.slice(0, 3850) + ' [\u2026] ' + text.slice(text.length - 1650);
  }

  function selectionBlocks() {
    var found = [];
    if (mode === 'block' && anchorBlock) {
      found.push(anchorBlock);
    } else if (anchorRange) {
      var all = content.querySelectorAll(BLOCK_SELECTOR);
      for (var i = 0; i < all.length; i += 1) {
        var block = all[i];
        var inner = false;
        for (var j = 0; j < found.length; j += 1) {
          if (found[j].contains(block)) { inner = true; break; }
        }
        if (inner) continue;
        try {
          if (anchorRange.intersectsNode(block)) {
            for (var k = found.length - 1; k >= 0; k -= 1) {
              if (block.contains(found[k])) found.splice(k, 1);
            }
            found.push(block);
          }
        } catch (err) { /* stale range */ }
      }
      found.sort(function (a, b) {
        return (a.compareDocumentPosition(b) & 4) ? -1 : 1;
      });
    }
    return found;
  }

  // Local context around the actual DOM selection (nearest paragraph and
  // neighbours) PLUS the article opening excerpt — so a late-article
  // selection is never lost to articleContent.slice(0, 5600).
  function buildSelectionContext() {
    var opening = articleTextForRequest().slice(0, 1600);
    var blocks = selectionBlocks();
    var prev = '';
    var here = [];
    var next = '';
    if (blocks.length) {
      var first = blocks[0];
      var last = blocks[blocks.length - 1];
      var prevEl = first.previousElementSibling;
      while (prevEl && BLOCK_SELECTOR.split(', ').indexOf(prevEl.tagName.toLowerCase()) === -1) {
        prevEl = prevEl.previousElementSibling;
      }
      if (prevEl) prev = (prevEl.innerText || prevEl.textContent || '').replace(/\s+/g, ' ').trim();
      var nextEl = last.nextElementSibling;
      while (nextEl && BLOCK_SELECTOR.split(', ').indexOf(nextEl.tagName.toLowerCase()) === -1) {
        nextEl = nextEl.nextElementSibling;
      }
      if (nextEl) next = (nextEl.innerText || nextEl.textContent || '').replace(/\s+/g, ' ').trim();
      for (var i = 0; i < blocks.length; i += 1) {
        here.push((blocks[i].innerText || blocks[i].textContent || '').replace(/\s+/g, ' ').trim());
      }
    }

    var labelOpen = isZh ? '[文章开头节选]' : '[Article opening excerpt]';
    var labelLocal = isZh ? '[选文上下文]' : '[Selection context]';
    var labelSel = isZh ? '选文：' : 'Selected: ';
    var localParts = [];
    if (prev) localParts.push(prev);
    localParts.push(labelSel + anchorQuote.replace(/\s+/g, ' ').trim());
    if (here.length) localParts.push(here.join(' '));
    if (next) localParts.push(next);
    var local = localParts.join('\n');

    var budget = AI_MAX_CONTEXT;
    var head = labelOpen + '\n' + opening;
    var tail = labelLocal + '\n' + local;
    if (head.length + tail.length + 2 > budget) {
      var room = budget - head.length - 2;
      if (room > 200) {
        tail = labelLocal + '\n' + local.slice(0, room);
      } else {
        head = labelOpen + '\n' + opening.slice(0, Math.max(0, budget - tail.length - 2));
      }
    }
    return (head + '\n\n' + tail).slice(0, AI_MAX_CONTEXT);
  }

  // A noninterrupting responses surface. Keep the provider in its original DOM
  // position: removing/reinserting an iframe would destroy an unsent draft.
  var commentDrawer = null, commentOpen = false, commentPlaceholder = null;
  var commentHost = document.getElementById('post-comments-body');
  var commentHostStyle = null, commentOverflow = '', commentFocus = null;
  var commentInert = [], commentResize = null, commentQuote = null, commentGeneration = 0;

  function commentIsModal() { return window.innerWidth < 900; }

  function setCommentInert(on) {
    commentInert.forEach(function (item) { item.node.inert = item.value; });
    commentInert = [];
    if (!on) return;
    var branch = commentHost;
    while (branch && branch.parentElement) {
      Array.prototype.forEach.call(branch.parentElement.children, function (sibling) {
        if (sibling === branch || sibling === commentDrawer || sibling.contains(commentDrawer)) return;
        commentInert.push({ node: sibling, value: sibling.inert });
        sibling.inert = true;
      });
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
  }

  function positionComments() {
    if (!commentOpen || !commentDrawer || !commentHost) return;
    var modal = commentIsModal();
    commentDrawer.setAttribute('aria-modal', modal ? 'true' : 'false');
    commentDrawer.classList.toggle('asel-comments--modal', modal);
    setCommentInert(modal);
    document.body.style.overflow = modal ? 'hidden' : commentOverflow;
    var slot = commentDrawer.querySelector('.asel-comments-provider');
    var r = slot.getBoundingClientRect();
    commentHost.style.cssText = 'position:fixed;z-index:6502;box-sizing:border-box;margin:0;' +
      'left:' + Math.round(r.left) + 'px;top:' + Math.round(r.top) + 'px;' +
      'width:' + Math.round(r.width) + 'px;height:' + Math.max(40, Math.round(r.height)) + 'px;' +
      'overflow:auto;overscroll-behavior:contain;padding:0 2px 12px;background:var(--asel-surface);';
  }

  function closeComments() {
    if (!commentOpen) return;
    commentGeneration++;
    commentOpen = false;
    commentDrawer.hidden = true;
    if (commentHostStyle === null) commentHost.removeAttribute('style');
    else commentHost.setAttribute('style', commentHostStyle);
    if (commentPlaceholder) commentPlaceholder.remove();
    commentPlaceholder = null;
    document.body.style.overflow = commentOverflow;
    setCommentInert(false);
    if (commentResize) commentResize.disconnect();
    if (commentFocus && commentFocus.isConnected && typeof commentFocus.focus === 'function') {
      commentFocus.focus({ preventScroll: true });
    }
  }

  function createComments() {
    commentDrawer = el('section', 'asel-comments');
    commentDrawer.setAttribute('role', 'dialog');
    commentDrawer.setAttribute('aria-label', isZh ? '关于这段文字的评论' : 'Responses to this passage');
    commentDrawer.setAttribute('aria-owns', 'post-comments-body');
    commentDrawer.hidden = true;
    var head = el('header', 'asel-comments-head');
    head.appendChild(el('span', 'asel-comments-kicker', isZh ? '读者回响' : 'RESPONSES'));
    var close = el('button', 'asel-comments-close', '\u00d7');
    close.type = 'button'; close.setAttribute('aria-label', isZh ? '关闭评论' : 'Close responses');
    close.addEventListener('click', closeComments); head.appendChild(close);
    commentDrawer.appendChild(head);
    var quoteWrap = el('div', 'asel-comments-context');
    quoteWrap.appendChild(el('span', 'asel-comments-context-label', isZh ? '关于这段文字' : 'ABOUT THIS PASSAGE'));
    commentQuote = el('blockquote', 'asel-comments-quote'); quoteWrap.appendChild(commentQuote);
    var copy = el('button', 'asel-comments-copy', T.quoteCopy); copy.type = 'button';
    quoteWrap.appendChild(copy);
    quoteWrap.appendChild(el('p', 'asel-comments-hint', isZh ? '复制引用，在下方写下你的想法。' : 'Copy the passage, then add your thoughts below.'));
    commentDrawer.appendChild(quoteWrap);
    var slot = el('div', 'asel-comments-provider');
    commentDrawer.appendChild(slot);
    var bottom = el('footer', 'asel-comments-bottom');
    var resume = el('button', 'asel-comments-resume', isZh ? '继续阅读' : 'Continue reading');
    resume.type = 'button'; resume.addEventListener('click', closeComments); bottom.appendChild(resume);
    commentDrawer.appendChild(bottom); document.body.appendChild(commentDrawer);
    window.addEventListener('resize', positionComments);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', positionComments);
    commentDrawer.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || !commentIsModal()) return;
      var controls = Array.prototype.filter.call(commentDrawer.querySelectorAll('button,textarea'), function (node) { return !node.hidden && node.offsetParent !== null; });
      var frame = commentHost.querySelector('iframe');
      if (frame) controls.push(frame);
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function openCommentPreview() {
    if (!commentsSection || !commentHost || !anchorQuote) return;
    var quote = anchorQuote, payload = quoteWithSource();
    var generation = ++commentGeneration;
    function current() { return commentOpen && generation === commentGeneration; }
    if (!commentDrawer) createComments();
    var oldManual = commentDrawer.querySelector('.asel-comments-manual');
    if (oldManual) oldManual.remove();
    commentQuote.textContent = quote;
    commentDrawer.querySelector('.asel-comments-copy').onclick = function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload).then(function () { if (current()) showToast(T.copied); }, function () { if (current()) showCommentManual(payload); });
        } else if (current()) showCommentManual(payload);
      } catch (_) { if (current()) showCommentManual(payload); }
    };
    if (!commentOpen) {
      commentHostStyle = commentHost.getAttribute('style');
      commentOverflow = document.body.style.overflow;
      commentFocus = document.activeElement;
      commentPlaceholder = el('div', 'asel-comments-placeholder');
      commentPlaceholder.style.height = commentHost.getBoundingClientRect().height + 'px';
      commentPlaceholder.setAttribute('aria-hidden', 'true');
      commentHost.parentNode.insertBefore(commentPlaceholder, commentHost);
    }
    commentOpen = true; commentDrawer.hidden = false;
    dismissed = true; hideAll();
    positionComments();
    if ('ResizeObserver' in window) {
      if (commentResize) commentResize.disconnect();
      commentResize = new ResizeObserver(positionComments);
      commentResize.observe(commentDrawer.querySelector('.asel-comments-context'));
    }
    commentDrawer.querySelector('.asel-comments-close').focus({ preventScroll: true });
  }

  function showCommentManual(payload) {
    var field = commentDrawer.querySelector('.asel-comments-manual');
    if (!field) {
      field = el('textarea', 'asel-comments-manual');
      field.readOnly = true; field.setAttribute('aria-label', T.manualHint);
      commentDrawer.querySelector('.asel-comments-context').appendChild(field);
    }
    field.value = payload; field.focus({ preventScroll: true }); field.select(); positionComments();
  }

  function openShare() {
    var quote = anchorQuote;
    if (!quote) return;
    var options = { lang: isZh ? 'zh' : 'en', title: config.title, author: config.author,
      url: config.url, sourceUrl: passageLink(), kind: 'excerpt' };
    function open() {
      if (window.ShareConversation && window.ShareConversation.showExcerpt) window.ShareConversation.showExcerpt(quote, options);
      else showToast(isZh ? '分享暂时无法打开，请再试一次。' : 'Sharing is unavailable. Please try again.');
    }
    if (window.ShareConversation) open();
    else if (typeof window.loadShareScripts === 'function') window.loadShareScripts(open);
    else open();
  }

  function openAi() {
    if (!aiEnabled || !anchorQuote) return;
    if (anchorQuote.length > AI_MAX_SELECTED) { showToast(T.aiLimit.replace('{n}', anchorQuote.length).replace('{max}', AI_MAX_SELECTED)); return; }
    var block = anchorRange && startBlockForRange(anchorRange);
    var bounds = anchorRange && anchorRange.getBoundingClientRect();
    var detail = { selectedText: anchorQuote, selectionContext: buildSelectionContext(),
      sourceUrl: passageLink(), blockId: block ? block.id : '',
      sourceRect: bounds ? { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom } : null,
      question: isZh ? '结合这篇文章，帮我理解这段话。' : 'Help me understand this passage in the context of the article.' };
    dismissed = true; hideAll();
    document.dispatchEvent(new CustomEvent('article:selection-analyze', { detail: detail }));
  }

  root.addEventListener('mousedown', function (event) {
    if (event.target.closest('.asel-toolbar button,.asel-menu button')) event.preventDefault();
  });
  root.addEventListener('click', function (event) {
    var actionEl = event.target.closest('[data-asel-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-asel-action');
    if (action === 'more') { if (menuOpen) closeMenu(true); else openMenu(); }
    else if (action === 'share') { closeMenu(false); openShare(); }
    else if (action === 'ai') { closeMenu(false); openAi(); }
    else if (action === 'comment') { closeMenu(false); openCommentPreview(); }
    else if (action === 'copy-quote') { copyText(quoteWithSource()); closeMenu(false); }
    else if (action === 'copy-link') { copyText(passageLink()); closeMenu(false); }
    else if (action === 'clear') clearSelection();
  });
  toolbar.addEventListener('keydown', function (event) {
    if (['ArrowLeft','ArrowRight','Home','End'].indexOf(event.key) < 0) return;
    var controls = Array.prototype.slice.call(toolbar.querySelectorAll('button:not([hidden])'));
    var index = controls.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    index = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : controls.length - 1)) % controls.length;
    controls[index].focus({ preventScroll: true });
  });

  // ── Init ──────────────────────────────────────────────────────────────
  assignBlockIds();
  hideAll();
  var initialAnchor = location.hash.split(':~:')[0].slice(1);
  if (/^asel-p\d+$/.test(initialAnchor)) {
    var linkedBlock = document.getElementById(initialAnchor);
    if (linkedBlock) linkedBlock.scrollIntoView({ block: 'center' });
  }
})();
