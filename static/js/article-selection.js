/**
 * article-selection.js — bounded article selection interaction.
 *
 * Scope: default single-article layout, `.post-content` only. One quiet line
 * toolbar (分享 / AI 分析 / 评论 / 更多) floats as a BODY-LEVEL fixed overlay;
 * prose geometry (margins, padding, borders, widths, scrollHeight) is never
 * touched — the paragraph feedback is a zero-layout fixed marker painted at
 * 7% stroke / 1% background with a short left mark.
 *
 * Behaviour contract (see docs/article-selection.md):
 *  - Plain paragraph click → subtle paragraph marker + toolbar anchored above
 *    the full block (falls below the FULL block when blocked by the rendered
 *    fixed/sticky top chrome or the viewport top).
 *  - Drag / keyboard text selection → toolbar anchored to the actual selected
 *    line rects (Range.getClientRects), never the whole paragraph. Selection
 *    survives control activation; ranges reaching outside the article are
 *    rejected.
 *  - More menu is an independent fixed popup (never a second row), dismisses
 *    on outside click / Esc and restores focus.
 *  - Share opens a native dialog with a quote card (complete quote + title +
 *    author + source) and a canvas PNG export that draws the COMPLETE quote.
 *    Oversized selections are refused with a clear limit notice — never
 *    silently truncated.
 *  - AI analysis reuses /.netlify/functions/article-ai (JSON + SSE) with
 *    selectedText + selectionContext as reference data, per-selection history,
 *    retry/cancel/error states and abort on close.
 *  - Comment reveals the quote preview before Utterances. Cross-origin
 *    Utterances has no prefill — nothing is fabricated or auto-posted.
 *  - Mobile keeps native long-press selection and drag handles: we never
 *    cancel touchstart/contextmenu/article pointer defaults; the toolbar
 *    waits for the selection to settle and clears the system menu zone
 *    (>= 56px below the selection; OS menu rect is not exposed, see docs).
 *
 * Everything is mounted on document.body; nothing is inserted into prose.
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
  var CARD_MAX_CHARS = 2400;    // clear export cap — never silent truncation
  var CARD_MAX_LINES = 80;
  var TEXTFRAG_MAX = 300;
  var AI_IDLE_TIMEOUT_MS = 45000;
  var AI_HISTORY_MAX = 10;

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
  var historyMap = Object.create(null); // quote text is untrusted, not object keys
  var currentGradient = 'moss';

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

  // Share dialog
  var shareDialog = el('dialog', 'asel-dialog asel-dialog-share');
  shareDialog.setAttribute('aria-label', T.shareTitle);
  var shareBody = el('div', 'asel-dialog-body');
  var shareHead = el('div', 'asel-dialog-head');
  shareHead.appendChild(el('h2', 'asel-dialog-title', T.shareTitle));
  var shareClose = el('button', 'asel-dialog-close', '\u00d7');
  shareClose.type = 'button';
  shareClose.setAttribute('aria-label', T.close);
  shareHead.appendChild(shareClose);
  shareBody.appendChild(shareHead);

  var choiceGroup = el('div', 'asel-card-choices');
  choiceGroup.setAttribute('role', 'group');
  choiceGroup.setAttribute('aria-label', T.cardStyle);
  var choiceButtons = {};
  [['moss', T.cardMoss], ['paper', T.cardPaper], ['dusk', T.cardDusk]].forEach(function (pair) {
    var btn = el('button', 'asel-card-choice', pair[1]);
    btn.type = 'button';
    btn.setAttribute('data-asel-card', pair[0]);
    btn.setAttribute('aria-pressed', pair[0] === currentGradient ? 'true' : 'false');
    choiceGroup.appendChild(btn);
    choiceButtons[pair[0]] = btn;
  });
  shareBody.appendChild(choiceGroup);

  var card = el('div', 'asel-card asel-card--moss');
  var cardQuote = el('p', 'asel-card-quote');
  var cardMeta = el('div', 'asel-card-meta');
  card.appendChild(cardQuote);
  card.appendChild(cardMeta);
  shareBody.appendChild(card);

  var canvasWrap = el('div', 'asel-canvas-wrap');
  var canvas = el('canvas');
  canvas.setAttribute('aria-label', T.shareTitle);
  canvasWrap.appendChild(canvas);
  shareBody.appendChild(canvasWrap);

  var limitNote = el('p', 'asel-limit-note');
  limitNote.hidden = true;
  shareBody.appendChild(limitNote);

  var sourceLine = el('p', 'asel-source-line');
  shareBody.appendChild(sourceLine);

  var shareActions = el('div', 'asel-actions');
  function makeAction(parent, action, label, primary) {
    var btn = el('button', 'asel-action' + (primary ? ' asel-action--primary' : ''), label);
    btn.type = 'button';
    btn.setAttribute('data-asel-action', action);
    parent.appendChild(btn);
    return btn;
  }
  var downloadBtn = makeAction(shareActions, 'download', T.download, true);
  var copyQuoteBtn = makeAction(shareActions, 'copy-quote-card', T.quoteCopy);
  var nativeShareBtn = makeAction(shareActions, 'native-share', T.nativeShare);
  nativeShareBtn.hidden = true;
  makeAction(shareActions, 'close-share', T.close);
  shareBody.appendChild(shareActions);
  var shareStatus = el('p', 'asel-ai-status');
  shareStatus.hidden = true;
  shareBody.appendChild(shareStatus);
  shareDialog.appendChild(shareBody);

  // AI dialog
  var aiDialog = el('dialog', 'asel-dialog asel-dialog-ai');
  aiDialog.setAttribute('aria-label', T.aiTitle);
  var aiBody = el('div', 'asel-dialog-body');
  var aiHead = el('div', 'asel-dialog-head');
  aiHead.appendChild(el('h2', 'asel-dialog-title', T.aiTitle));
  var aiCloseBtn = el('button', 'asel-dialog-close', '\u00d7');
  aiCloseBtn.type = 'button';
  aiCloseBtn.setAttribute('aria-label', T.close);
  aiHead.appendChild(aiCloseBtn);
  aiBody.appendChild(aiHead);

  var aiQuote = el('blockquote', 'asel-quote-text');
  aiBody.appendChild(aiQuote);
  var aiStatus = el('p', 'asel-ai-status');
  aiStatus.hidden = true;
  aiBody.appendChild(aiStatus);
  var aiAnswer = el('div', 'asel-ai-answer');
  aiAnswer.setAttribute('aria-live', 'polite');
  aiBody.appendChild(aiAnswer);
  var aiInput = el('textarea', 'asel-ai-input');
  aiInput.setAttribute('aria-label', T.aiPlaceholder);
  aiInput.placeholder = T.aiPlaceholder;
  aiBody.appendChild(aiInput);
  var aiActions = el('div', 'asel-actions');
  var aiSendBtn = makeAction(aiActions, 'ai-send', T.send, true);
  var aiRetryBtn = makeAction(aiActions, 'ai-retry', T.retry);
  aiRetryBtn.hidden = true;
  var aiCancelBtn = makeAction(aiActions, 'ai-cancel', T.cancel);
  aiCancelBtn.hidden = true;
  makeAction(aiActions, 'ai-close', T.close);
  aiBody.appendChild(aiActions);
  aiDialog.appendChild(aiBody);

  root.appendChild(marker);
  root.appendChild(toolbar);
  root.appendChild(menu);
  root.appendChild(shareDialog);
  root.appendChild(aiDialog);
  document.body.appendChild(toast);
  root.appendChild(manual);
  document.body.appendChild(root);

  // ── Copy helpers (clipboard refusal → visible selectable field) ───────
  var toastTimer = 0;
  function showToast(message) {
    if (shareDialog.open) setShareStatus(message);
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

    // Marker paints the full block extent in block mode (zero layout).
    if (mode === 'block') {
      marker.hidden = false;
      marker.style.left = Math.round(fullLeft - 4) + 'px';
      marker.style.top = Math.round(fullTop - 2) + 'px';
      marker.style.width = Math.round(Math.max(0, (function () {
        var maxRight = -Infinity;
        for (var k = 0; k < rects.length; k += 1) {
          if (rects[k].right > maxRight) maxRight = rects[k].right;
        }
        return maxRight - fullLeft + 8;
      })())) + 'px';
      marker.style.height = Math.round(fullBottom - fullTop + 4) + 'px';
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

  function captureBlockSelection(block) {
    anchorBlock = block;
    anchorRange = null;
    anchorQuote = (block.innerText || block.textContent || '').trim();
    mode = 'block';
    dismissed = false;
    scheduleReposition();
  }

  function handleSelectionChange() {
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
    if (Date.now() - lastTouchAt < 900) {
      // Touch: wait until the native selection settles before showing.
      clearTimeout(settleTimer);
      setFaded(true);
      settleTimer = setTimeout(function () {
        if (captureRangeSelection()) scheduleReposition();
        else discardAnchor();
      }, SETTLE_MS);
      return;
    }
    if (!captureRangeSelection()) discardAnchor();
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
    var block = blockFor(event.target);
    if (block) {
      captureBlockSelection(block);
    } else {
      clearSelection();
    }
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
    if (menuOpen && !menu.contains(event.target) && event.target !== moreBtn) {
      closeMenu(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
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

  // ── Comment quote preview ─────────────────────────────────────────────
  function openCommentPreview() {
    if (!commentsSection) return;
    var box = document.getElementById('post-comments-quote');
    if (!box) return;
    var link = passageLink();
    var payload = quoteWithSource(); // immutable even after the floating selection is cleared
    document.getElementById('post-comments-quote-label').textContent = T.commentTitle;
    var textEl = document.getElementById('post-comments-quote-text');
    textEl.textContent = anchorQuote; // exact quote, escaped by textContent
    document.getElementById('post-comments-quote-title').textContent =
      String(config.title || '') + ' \u00b7 ' + T.sourceLabel + ': ';
    var linkEl = document.getElementById('post-comments-quote-link');
    linkEl.href = link;
    linkEl.textContent = link;
    var copyBtn = document.getElementById('post-comments-quote-copy');
    copyBtn.textContent = T.quoteCopy;
    var note = document.getElementById('post-comments-quote-note');
    note.textContent = T.commentNote;
    note.hidden = false;
    var manualField = document.getElementById('post-comments-quote-manual');
    manualField.hidden = true;
    manualField.value = payload;
    manualField.setAttribute('aria-label', T.manualHint);
    box.hidden = false;
    commentsSection.scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
    copyBtn.onclick = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () {
          showToast(T.copied);
        }).catch(function () {
          note.textContent = T.copyFailed;
          manualField.hidden = false;
          try {
            manualField.focus();
            manualField.select();
          } catch (err) { /* best effort */ }
        });
      } else {
        note.textContent = T.copyFailed;
        manualField.hidden = false;
        try {
          manualField.focus();
          manualField.select();
        } catch (err) { /* best effort */ }
      }
    };
  }

  // ── Share dialog + canvas quote card ──────────────────────────────────
  function displayFont() {
    return window.getComputedStyle(document.body).fontFamily ||
      "'Inter', system-ui, sans-serif";
  }

  function headingFont() {
    var h = document.querySelector('.post-title') || document.querySelector('h1');
    return (h && window.getComputedStyle(h).fontFamily) || displayFont();
  }

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var paragraphs = String(text || '').split('\n');
    for (var p = 0; p < paragraphs.length; p += 1) {
      var para = paragraphs[p];
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      var tokens = para.split(/(\s+)/);
      var line = '';
      for (var i = 0; i < tokens.length; i += 1) {
        var token = tokens[i];
        var candidate = line + token;
        if (ctx.measureText(candidate).width > maxWidth && line) {
          lines.push(line.replace(/\s+$/, ''));
          line = token.replace(/^\s+/, '');
        } else {
          line = candidate;
        }
        while (ctx.measureText(line).width > maxWidth && line.length > 1) {
          // Hard-break a single oversized token (long URLs, CJK runs) —
          // estimate the cut point first so this stays linear, not quadratic.
          var measured = ctx.measureText(line).width;
          var cut = Math.max(1, Math.floor((line.length * maxWidth) / measured));
          while (cut < line.length && ctx.measureText(line.slice(0, cut + 1)).width <= maxWidth) cut += 1;
          while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut -= 1;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
      if (line.trim() || !lines.length) lines.push(line.replace(/\s+$/, ''));
    }
    return lines;
  }

  var cardDrawPromise = Promise.resolve();
  var cardGeneration = 0;
  var cardOverLimit = false;

  function drawCard(generation) {
    var quote = anchorQuote;
    var palette = currentGradient;
    var width = 1080;
    var padX = 84;
    var padY = 88;
    var maxWidth = width - padX * 2;
    var ctx = canvas.getContext('2d');
    var quoteSize = 36;
    var quoteLine = 58;
    var metaSize = 24;
    var metaLine = 38;

    var fontsReady = document.fonts ? Promise.all([
      document.fonts.load(quoteSize + 'px ' + headingFont(), quote),
      document.fonts.load('600 ' + metaSize + 'px ' + displayFont(), String(config.title || '')),
      document.fonts.ready
    ]) : Promise.resolve();
    return fontsReady.catch(function () { return null; }).then(function () {
      if (generation !== cardGeneration || !shareDialog.open) return;
      ctx.font = quoteSize + 'px ' + headingFont();
      var quoteLines = wrapText(ctx, quote, maxWidth);
      ctx.font = '600 ' + metaSize + 'px ' + displayFont();
      var titleLines = wrapText(ctx, String(config.title || ''), maxWidth);
      ctx.font = metaSize + 'px ' + displayFont();
      var authorLines = wrapText(ctx, String(config.author || ''), maxWidth);
      var urlLines = wrapText(ctx, String(config.url || ''), maxWidth);

      var height = padY + quoteLines.length * quoteLine + 56 +
        (titleLines.length + authorLines.length + urlLines.length) * metaLine + padY;
      canvas.width = width;
      canvas.height = Math.max(320, Math.round(height));

      var gradient = ctx.createLinearGradient(0, 0, width, canvas.height);
      if (palette === 'paper') {
        gradient.addColorStop(0, '#fbf9f4');
        gradient.addColorStop(1, '#f1ece2');
      } else if (palette === 'dusk') {
        gradient.addColorStop(0, '#2b2d3a');
        gradient.addColorStop(0.6, '#4a4360');
        gradient.addColorStop(1, '#7c6a8a');
      } else {
        gradient.addColorStop(0, '#1f2a24');
        gradient.addColorStop(0.55, '#2f4a3a');
        gradient.addColorStop(1, '#56715c');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = palette === 'paper' ? '#1a1c1b' : '#f2f5f1';

      var y = padY;
      ctx.font = quoteSize + 'px ' + headingFont();
      for (var i = 0; i < quoteLines.length; i += 1) {
        ctx.fillText(quoteLines[i], padX, y);
        y += quoteLine;
      }
      y += 56 - quoteLine + metaLine;
      ctx.font = '600 ' + metaSize + 'px ' + displayFont();
      for (var t = 0; t < titleLines.length; t += 1) {
        ctx.fillText(titleLines[t], padX, y);
        y += metaLine;
      }
      ctx.font = metaSize + 'px ' + displayFont();
      for (var a = 0; a < authorLines.length; a += 1) {
        ctx.fillText(authorLines[a], padX, y);
        y += metaLine;
      }
      for (var u = 0; u < urlLines.length; u += 1) {
        ctx.fillText(urlLines[u], padX, y);
        y += metaLine;
      }

    });
  }

  function setShareStatus(message) {
    shareStatus.textContent = message || '';
    shareStatus.hidden = !message;
  }

  function queueCardDraw() {
    var generation = ++cardGeneration;
    downloadBtn.disabled = true;
    nativeShareBtn.disabled = true;
    if (cardOverLimit) {
      canvasWrap.hidden = true;
      canvas.width = 0;
      canvas.height = 0;
      cardDrawPromise = Promise.resolve();
      return;
    }
    canvasWrap.hidden = false;
    cardDrawPromise = drawCard(generation).then(function () {
      if (generation !== cardGeneration || !shareDialog.open) return;
      downloadBtn.disabled = false;
      nativeShareBtn.disabled = false;
    }).catch(function () {
      if (generation === cardGeneration) setShareStatus(T.copyFailed);
    });
  }

  function openShare() {
    if (!anchorQuote) return;
    var quote = anchorQuote;
    cardQuote.textContent = quote;
    card.className = 'asel-card asel-card--' + currentGradient;
    cardMeta.innerHTML = '';
    var strong = el('strong', '', String(config.title || ''));
    cardMeta.appendChild(strong);
    cardMeta.appendChild(el('br'));
    cardMeta.appendChild(document.createTextNode(String(config.author || '')));
    cardMeta.appendChild(el('br'));
    cardMeta.appendChild(document.createTextNode(String(config.url || '')));
    sourceLine.textContent = '';
    var sourceLink = el('a', '', isZh ? '返回原文' : 'Read the original passage');
    sourceLink.href = passageLink();
    sourceLine.appendChild(sourceLink);

    var lineCount = quote.split('\n').length;
    var overLimit = quote.length > CARD_MAX_CHARS || lineCount > CARD_MAX_LINES;
    cardOverLimit = overLimit;
    limitNote.hidden = !overLimit;
    if (overLimit) {
      limitNote.textContent = fill(T.limitNote, { n: quote.length, max: CARD_MAX_CHARS });
    }
    downloadBtn.disabled = overLimit;
    nativeShareBtn.disabled = overLimit;
    setShareStatus('');
    nativeShareBtn.hidden = !(navigator.canShare && navigator.share && window.File);
    openDialog(shareDialog);
    queueCardDraw();
  }

  function exportCardBlob() {
    return cardDrawPromise.then(function () {
      if (cardOverLimit || !canvas.width) return null;
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob); }, 'image/png');
      });
    });
  }

  function downloadCard() {
    exportCardBlob().then(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = el('a');
      a.href = url;
      a.download = 'quote-card.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 8000);
    });
  }

  function nativeShareCard() {
    exportCardBlob().then(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'quote-card.png', { type: 'image/png' });
      if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
        setShareStatus(T.shareFailed);
        return;
      }
      navigator.share({
        files: [file],
        title: String(config.title || ''),
        text: anchorQuote
      }).then(function () {
        showToast(T.shared);
      }).catch(function (err) {
        // Quiet on user cancellation; the download path stays functional.
        if (err && err.name === 'AbortError') {
          setShareStatus(T.shareCancelled);
        } else {
          setShareStatus(T.shareFailed);
        }
      });
    });
  }

  // ── AI dialog (SSE via /.netlify/functions/article-ai) ────────────────
  var aiController = null;
  var aiIdleTimer = 0;
  var aiLastQuestion = '';
  var aiBusy = false;
  var aiRequestSerial = 0;

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

  function aiHistory() {
    var key = historyKey();
    if (!historyMap[key]) historyMap[key] = [];
    return historyMap[key];
  }

  function historyKey() {
    var block = anchorBlock || (anchorRange && startBlockForRange(anchorRange));
    return (block ? block.id : '') + '\n' + anchorQuote;
  }

  function setAiStatus(message, isError) {
    aiStatus.textContent = message || '';
    aiStatus.hidden = !message;
    aiStatus.classList.toggle('asel-ai-error', !!isError);
  }

  function aiTurn(question, answer) {
    var turn = el('div', 'asel-ai-turn');
    turn.appendChild(el('p', 'asel-ai-q', (isZh ? '问：' : 'Q: ') + question));
    turn.appendChild(el('p', 'asel-ai-a', answer));
    aiAnswer.appendChild(turn);
    return turn.querySelector('.asel-ai-a');
  }

  function abortAi() {
    aiRequestSerial += 1;
    clearTimeout(aiIdleTimer);
    if (aiController) {
      try { aiController.abort(); } catch (err) { /* already aborted */ }
      aiController = null;
    }
    aiBusy = false;
    aiCancelBtn.hidden = true;
    aiSendBtn.disabled = false;
  }

  function streamAnswer(question) {
    abortAi();
    if (anchorQuote.length > AI_MAX_SELECTED) {
      setAiStatus(fill(T.aiLimit, { n: anchorQuote.length, max: AI_MAX_SELECTED }), true);
      aiRetryBtn.hidden = true;
      return;
    }
    var requestId = aiRequestSerial;
    var key = historyKey();
    var history = aiHistory();
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    aiController = controller;
    aiLastQuestion = question;
    aiBusy = true;
    aiSendBtn.disabled = true;
    aiCancelBtn.hidden = false;
    aiRetryBtn.hidden = true;
    setAiStatus(T.thinking, false);
    var payload = {
      question: question,
      articleTitle: String(config.title || ''),
      articleContent: articleTextForRequest(),
      pagePath: String(config.pagePath || ''),
      language: isZh ? 'zh' : 'en',
      selectedText: anchorQuote,
      selectionContext: buildSelectionContext(),
      context: history.slice(-AI_HISTORY_MAX),
      stream: true
    };
    var answerEl = aiTurn(question, '');
    var full = '';
    var settled = false;
    function active() { return requestId === aiRequestSerial && aiDialog.open; }
    function fail(message) {
      if (settled || !active()) return;
      settled = true;
      clearTimeout(aiIdleTimer);
      aiBusy = false;
      aiController = null;
      aiSendBtn.disabled = false;
      aiCancelBtn.hidden = true;
      aiRetryBtn.hidden = false;
      setAiStatus(message, true);
    }
    function finish() {
      if (settled || !active()) return;
      if (!full.trim()) { fail(T.aiEmpty); return; }
      settled = true;
      clearTimeout(aiIdleTimer);
      aiBusy = false;
      aiController = null;
      aiSendBtn.disabled = false;
      aiCancelBtn.hidden = true;
      setAiStatus('', false);
      answerEl.textContent = full;
      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: full });
      historyMap[key] = history.slice(-AI_HISTORY_MAX);
    }
    function refreshTimeout() {
      if (!active() || settled) return;
      clearTimeout(aiIdleTimer);
      aiIdleTimer = setTimeout(function () {
        if (!active() || settled) return;
        if (controller) controller.abort();
        fail(T.aiTimeout);
      }, AI_IDLE_TIMEOUT_MS);
    }
    refreshTimeout(); // Includes waiting for response headers and every stream read.
    fetch('/.netlify/functions/article-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(async function (res) {
      if (!active() || settled) return;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var type = res.headers.get('content-type') || '';
      if (type.indexOf('text/event-stream') === -1) {
        var data = await res.json();
        if (!active() || settled) return;
        full = typeof data.answer === 'string' ? data.answer : '';
        finish();
        return;
      }
      if (!res.body || !res.body.getReader) throw new Error('Missing response stream');
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      function consume(final) {
        var lines = buffer.split(/\r?\n/);
        buffer = final ? '' : lines.pop();
        for (var i = 0; i < lines.length; i += 1) {
          if (lines[i].indexOf('data:') !== 0) continue;
          var raw = lines[i].slice(5).trim();
          if (raw === '[DONE]') return true;
          if (!raw) continue;
          try {
            var chunk = JSON.parse(raw);
            if (chunk && typeof chunk.delta === 'string') {
              full += chunk.delta;
              answerEl.textContent = full;
            }
          } catch (err) { /* malformed events never become HTML */ }
        }
        return false;
      }
      while (active() && !settled) {
        refreshTimeout();
        var step = await reader.read();
        if (!active() || settled) break;
        buffer += step.done ? decoder.decode() : decoder.decode(step.value, { stream: true });
        if (consume(step.done) || step.done) {
          finish();
          try { await reader.cancel(); } catch (err) { /* stream already ended */ }
          return;
        }
      }
      try { await reader.cancel(); } catch (err) { /* closed or aborted */ }
    }).catch(function (err) {
      if (!active() || settled || (err && err.name === 'AbortError')) return;
      fail(T.aiError);
    });
  }
  function openAi() {
    aiQuote.textContent = anchorQuote;
    aiAnswer.innerHTML = '';
    aiInput.value = '';
    aiRetryBtn.hidden = true;
    aiSendBtn.disabled = false;
    if (anchorQuote.length > AI_MAX_SELECTED) {
      abortAi();
      setAiStatus(fill(T.aiLimit, { n: anchorQuote.length, max: AI_MAX_SELECTED }), true);
    } else {
      setAiStatus('', false);
    }
    openDialog(aiDialog);
    if (anchorQuote.length <= AI_MAX_SELECTED) {
      streamAnswer(T.aiQuestion); // asks for explanation relative to the article
    }
  }

  function closeAi() {
    abortAi();
    closeDialog(aiDialog);
  }

  // ── Dialog helpers ────────────────────────────────────────────────────
  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
    window.requestAnimationFrame(function () {
      dialog.classList.add('asel-dialog--in');
    });
  }

  function closeDialog(dialog) {
    dialog.classList.remove('asel-dialog--in');
    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  shareClose.addEventListener('click', function () { closeDialog(shareDialog); });
  aiCloseBtn.addEventListener('click', closeAi);
  shareDialog.addEventListener('close', function () {
    shareDialog.classList.remove('asel-dialog--in');
  });
  aiDialog.addEventListener('close', function () {
    abortAi(); // abort any in-flight stream on close
    aiDialog.classList.remove('asel-dialog--in');
  });

  // ── Control activation ────────────────────────────────────────────────
  // Preserve the reader's selection when clicking our own chrome.
  root.addEventListener('mousedown', function (event) {
    if ((toolbar.contains(event.target) || menu.contains(event.target)) &&
        event.target.closest && event.target.closest('button, a')) {
      event.preventDefault();
    }
  });

  document.addEventListener('click', function (event) {
    var target = event.target.closest ? event.target.closest('[data-asel-action]') : null;
    if (!target || !root.contains(target)) return;
    var action = target.getAttribute('data-asel-action');
    if (action === 'share') {
      openShare();
    } else if (action === 'ai') {
      openAi();
    } else if (action === 'comment') {
      openCommentPreview();
    } else if (action === 'more') {
      if (menuOpen) closeMenu(true); else openMenu();
    } else if (action === 'copy-quote') {
      copyText(quoteWithSource());
      closeMenu(true);
    } else if (action === 'copy-link') {
      copyText(passageLink());
      closeMenu(true);
    } else if (action === 'clear') {
      closeMenu(false);
      clearSelection();
    } else if (action === 'download') {
      downloadCard();
    } else if (action === 'copy-quote-card') {
      copyText(quoteWithSource());
    } else if (action === 'native-share') {
      nativeShareCard();
    } else if (action === 'close-share') {
      closeDialog(shareDialog);
    } else if (action === 'ai-send') {
      var question = aiInput.value.trim() || T.aiQuestion;
      if (!aiBusy) streamAnswer(question);
    } else if (action === 'ai-retry') {
      if (!aiBusy && aiLastQuestion) streamAnswer(aiLastQuestion);
    } else if (action === 'ai-cancel') {
      abortAi();
      setAiStatus(T.aiCancelled, false);
    } else if (action === 'ai-close') {
      closeAi();
    }
  });

  choiceGroup.addEventListener('click', function (event) {
    var btn = event.target.closest ? event.target.closest('[data-asel-card]') : null;
    if (!btn) return;
    currentGradient = btn.getAttribute('data-asel-card');
    for (var key in choiceButtons) {
      if (Object.prototype.hasOwnProperty.call(choiceButtons, key)) {
        choiceButtons[key].setAttribute('aria-pressed', key === currentGradient ? 'true' : 'false');
      }
    }
    card.className = 'asel-card asel-card--' + currentGradient;
    queueCardDraw();
  });

  aiInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!aiBusy) streamAnswer(aiInput.value.trim() || T.aiQuestion);
    }
  });

  toolbar.addEventListener('keydown', function (event) {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) === -1) return;
    var controls = Array.from(toolbar.querySelectorAll('button'));
    var index = controls.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = controls.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : controls.length - 1)) % controls.length;
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
