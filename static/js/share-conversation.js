/* share-conversation.js — Editorial insight card generator + share modal
   Used by reading-companion, article-bottom-sheet and search-palette to share
   AI-assisted reading notes as themed images with a scannable QR code.

   Highlights:
   • 4 restrained themes
   • Latest insight vs multi-turn insight collection
   • The answer remains primary; the initiating question is quiet context
   • A locally-generated QR code baked into the card (scans straight to the
     article), generated locally so the canvas never gets tainted and the PNG
     stays exportable & copyable.
   • Copy-image to clipboard on desktop, native share-sheet on mobile. */
(function (global) {
  'use strict';

  // ── Theme registry ──────────────────────────────────────────────────────────
  // Each theme is a flat palette consumed by the canvas painters. The default is
  // picked from the site's light/dark state; the rest are explicit UI picks.
  var THEMES = {
    classic: {
      labelZh: '纸白', labelEn: 'Paper',
      bgFrom: '#e9e9e6', bgTo: '#dedfdb', card: '#fbfbf9',
      accent: '#8d2d2e', ink: '#242624',
      muted: 'rgba(36,38,36,0.56)', subtle: 'rgba(36,38,36,0.105)',
      border: 'rgba(36,38,36,0.13)', context: 'rgba(36,38,36,0.04)',
      answer: 'rgba(36,38,36,0.84)',
      qrFg: '#242624', qrBg: '#fbfbf9',
    },
    midnight: {
      labelZh: '石墨', labelEn: 'Graphite',
      bgFrom: '#141715', bgTo: '#222622', card: '#1d201e',
      accent: '#a7c9b8', ink: '#f0f2ef',
      muted: 'rgba(232,237,233,0.58)', subtle: 'rgba(232,237,233,0.12)',
      border: 'rgba(232,237,233,0.15)', context: 'rgba(232,237,233,0.055)',
      answer: 'rgba(232,237,233,0.86)',
      qrFg: '#1d201e', qrBg: '#f0f2ef',
    },
    dusk: {
      labelZh: '晨雾', labelEn: 'Mist',
      bgFrom: '#dde7eb', bgTo: '#ced9dd', card: '#f7f9f9',
      accent: '#416778', ink: '#1c2a30',
      muted: 'rgba(28,42,48,0.55)', subtle: 'rgba(28,42,48,0.105)',
      border: 'rgba(28,42,48,0.13)', context: 'rgba(65,103,120,0.055)',
      answer: 'rgba(28,42,48,0.84)',
      qrFg: '#1c2a30', qrBg: '#f7f9f9',
    },
    ink: {
      labelZh: '墨白', labelEn: 'Minimal ink',
      bgFrom: '#efefed', bgTo: '#e2e3df', card: '#fdfdfb',
      accent: '#343735', ink: '#202321',
      muted: 'rgba(32,35,33,0.52)', subtle: 'rgba(32,35,33,0.105)',
      border: 'rgba(32,35,33,0.13)', context: 'rgba(32,35,33,0.035)',
      answer: 'rgba(32,35,33,0.84)',
      qrFg: '#202321', qrBg: '#fdfdfb',
    },
  };
  var THEME_ORDER = ['classic', 'midnight', 'dusk', 'ink'];

  // Default theme mirrors the site's current mode for a native first render.
  function defaultTheme() {
    return document.body.classList.contains('dark') ? 'midnight' : 'classic';
  }

  // Canvas text does not inherit CSS font variables. Keep language-specific
  // stacks here so exported cards match the reading surface: PingFang first for
  // Chinese rhythm, Inter / SF Pro first for Latin metrics.
  var FONT_ZH = '"PingFang SC","Noto Sans SC","Source Han Sans SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif';
  var FONT_EN = '"Inter","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",sans-serif';

  function cardFont(isZh) {
    return isZh ? FONT_ZH : FONT_EN;
  }

  // ── Inject styles once ──────────────────────────────────────────────────────
  (function injectStyles() {
    if (document.getElementById('conv-share-styles')) return;
    var s = document.createElement('style');
    s.id = 'conv-share-styles';
    s.textContent = [
      '.conv-share-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:0;background:rgba(18,20,19,.54);opacity:0;backdrop-filter:blur(10px) saturate(105%);-webkit-backdrop-filter:blur(10px) saturate(105%);transition:opacity 180ms ease;}',
      '.conv-share-overlay--visible{opacity:1;}',
      '.conv-share-overlay--visible .conv-share-sheet{transform:translateY(0) scale(1);}',
      '.conv-share-sheet{box-sizing:border-box;display:flex;flex-direction:column;width:100%;max-width:960px;max-height:94dvh;overflow:hidden;border:1px solid rgba(30,35,30,.12);border-radius:20px 20px 0 0;background:var(--color-paper,#f9f9f7);box-shadow:0 34px 100px rgba(24,27,25,.28);transform:translateY(28px) scale(.99);transition:transform 260ms cubic-bezier(.23,1,.32,1);}',
      'body.dark .conv-share-sheet{border-color:rgba(226,227,225,.12);background:var(--color-paper,#121413);box-shadow:0 34px 110px rgba(0,0,0,.52);}',
      '.conv-share-handle{flex:none;width:34px;height:4px;margin:10px auto 0;border-radius:4px;background:rgba(30,35,30,.14);}',
      'body.dark .conv-share-handle{background:rgba(226,227,225,.18);}',
      '.conv-share-header{display:grid;grid-template-columns:1fr auto;gap:3px 18px;align-items:center;flex:none;padding:18px 22px 17px;border-bottom:1px solid var(--color-rule,rgba(30,35,30,.1));}',
      '.conv-share-title{color:var(--color-ink,#1a1c1b);font-family:var(--font-body,system-ui,sans-serif);font-size:1.08rem;font-weight:680;letter-spacing:-.018em;}',
      '.conv-share-subtitle{grid-column:1;color:var(--color-ink-muted,#5e5e63);font-family:var(--font-body,system-ui,sans-serif);font-size:.74rem;line-height:1.45;}',
      'body.dark .conv-share-title{color:var(--color-ink,#e2e3e1);}',
      '.conv-share-close{grid-column:2;grid-row:1 / span 2;display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:0;border-radius:10px;background:transparent;color:var(--color-ink-muted,#5e5e63);cursor:pointer;transition:background 150ms ease,color 150ms ease,transform 120ms ease;}',
      '.conv-share-close:hover{background:rgba(30,35,30,.065);color:var(--color-ink,#1a1c1b);}',
      '.conv-share-close:active{transform:scale(.96);}',
      'body.dark .conv-share-close{color:var(--color-ink-muted,#b4bcb2);}',
      'body.dark .conv-share-close:hover{background:rgba(226,227,225,.07);color:var(--color-ink,#e2e3e1);}',
      '.conv-share-workspace{display:grid;grid-template-columns:172px minmax(0,1fr);min-height:0;overflow:hidden;}',
      '.conv-share-rail{display:flex;flex-direction:column;gap:24px;padding:22px 18px;border-right:1px solid var(--color-rule,rgba(30,35,30,.1));}',
      '.conv-share-control-group{display:grid;gap:9px;}',
      '.conv-share-control-label{color:var(--color-ink-muted,#5e5e63);font-family:var(--font-body,system-ui,sans-serif);font-size:.66rem;font-weight:650;letter-spacing:.07em;text-transform:uppercase;}',
      '.conv-share-themes,.conv-share-modes{display:grid;gap:5px;}',
      '.conv-share-swatch,.conv-share-mode{box-sizing:border-box;display:flex;align-items:center;width:100%;min-height:44px;padding:6px 8px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--color-ink-muted,#5e5e63);cursor:pointer;font-family:var(--font-body,system-ui,sans-serif);font-size:.74rem;font-weight:540;text-align:left;transition:background 150ms ease,border-color 150ms ease,color 150ms ease,transform 120ms ease;}',
      '.conv-share-swatch{gap:9px;}',
      '.conv-share-swatch-chip{flex:none;width:26px;height:26px;border:1px solid rgba(30,35,30,.12);border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.55);}',
      '.conv-share-swatch:hover,.conv-share-mode:hover{background:rgba(30,35,30,.045);color:var(--color-ink,#1a1c1b);}',
      '.conv-share-swatch:active,.conv-share-mode:active{transform:scale(.98);}',
      '.conv-share-swatch--on,.conv-share-mode--on{border-color:var(--color-rule,rgba(30,35,30,.12));background:rgba(30,35,30,.055);color:var(--color-ink,#1a1c1b);}',
      'body.dark .conv-share-swatch,body.dark .conv-share-mode{color:var(--color-ink-muted,#b4bcb2);}',
      'body.dark .conv-share-swatch-chip{border-color:rgba(226,227,225,.16);}',
      'body.dark .conv-share-swatch:hover,body.dark .conv-share-mode:hover,body.dark .conv-share-swatch--on,body.dark .conv-share-mode--on{background:rgba(226,227,225,.065);color:var(--color-ink,#e2e3e1);}',
      '.conv-share-output-meta{display:grid;gap:4px;margin-top:auto;color:var(--color-ink-muted,#5e5e63);font-family:var(--font-meta,var(--font-body,system-ui,sans-serif));font-size:.64rem;line-height:1.4;}',
      '.conv-share-output-meta strong{color:var(--color-ink,#1a1c1b);font-weight:600;}',
      'body.dark .conv-share-output-meta strong{color:var(--color-ink,#e2e3e1);}',
      '.conv-share-stage{display:flex;min-width:0;min-height:0;height:min(60dvh,650px);padding:22px;background:rgba(30,35,30,.03);background:color-mix(in srgb,var(--color-ink,#1a1c1b) 3%,var(--color-paper,#f9f9f7));}',
      '.conv-share-preview{display:block;width:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-bottom:4px;scrollbar-width:thin;}',
      '.conv-share-preview canvas{display:block;width:100%;max-width:620px;height:auto;margin-inline:auto;border-radius:2px;box-shadow:0 10px 30px rgba(35,39,36,.10);}',
      'body.dark .conv-share-preview canvas{box-shadow:0 20px 56px rgba(0,0,0,.42);}',
      '.conv-share-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:none;padding:14px 18px;border-top:1px solid var(--color-rule,rgba(30,35,30,.1));}',
      '.conv-share-format{flex:none;color:var(--color-ink-muted,#5e5e63);font-family:var(--font-meta,var(--font-body,system-ui,sans-serif));font-size:.66rem;}',
      '.conv-share-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:0;}',
      '.conv-share-btn{display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:8px 12px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--color-ink-muted,#5e5e63);cursor:pointer;font-family:var(--font-body,system-ui,sans-serif);font-size:.72rem;font-weight:590;line-height:1.2;white-space:nowrap;transition:background 150ms ease,border-color 150ms ease,color 150ms ease,transform 120ms ease;}',
      '.conv-share-btn:hover{background:rgba(30,35,30,.05);color:var(--color-ink,#1a1c1b);}',
      '.conv-share-btn:active{transform:scale(.98);}',
      '.conv-share-btn svg{flex:none;width:17px;height:17px;opacity:.75;}',
      '.conv-share-btn--primary{min-width:118px;border-color:var(--color-ink,#1a1c1b);background:var(--color-ink,#1a1c1b);color:var(--color-paper,#f9f9f7);}',
      '.conv-share-btn--primary:hover{border-color:var(--color-ink,#1a1c1b);background:color-mix(in srgb,var(--color-ink,#1a1c1b) 88%,transparent);color:var(--color-paper,#f9f9f7);}',
      'body.dark .conv-share-btn{color:var(--color-ink-muted,#b4bcb2);}',
      'body.dark .conv-share-btn:hover{background:rgba(226,227,225,.07);color:var(--color-ink,#e2e3e1);}',
      'body.dark .conv-share-btn--primary{border-color:var(--color-ink,#e2e3e1);background:var(--color-ink,#e2e3e1);color:var(--color-paper,#121413);}',
      'body.dark .conv-share-btn--primary:hover{background:color-mix(in srgb,var(--color-ink,#e2e3e1) 88%,transparent);color:var(--color-paper,#121413);}',
      '.conv-share-btn--done{border-color:#4c8c64!important;background:rgba(76,140,100,.08)!important;color:#34744d!important;}',
      'body.dark .conv-share-btn--done{border-color:#82b998!important;background:rgba(130,185,152,.1)!important;color:#a7d2b8!important;}',
      '.conv-share-btn--done svg{opacity:1;}',
      '.conv-share-close:focus-visible,.conv-share-swatch:focus-visible,.conv-share-mode:focus-visible,.conv-share-btn:focus-visible{outline:2px solid var(--color-accent,#862122);outline-offset:2px;}',
      '@media (hover:hover) and (pointer:fine){.conv-share-btn:hover,.conv-share-close:hover,.conv-share-swatch:hover,.conv-share-mode:hover{will-change:transform}}',
      '@media (min-width:700px){.conv-share-overlay{align-items:center;padding:24px}.conv-share-sheet{border-radius:20px}.conv-share-handle{display:none}}',
      '@media (max-width:699px){.conv-share-sheet{max-height:96dvh}.conv-share-header{padding:14px 16px 13px}.conv-share-workspace{display:block;overflow-y:auto}.conv-share-rail{gap:14px;padding:14px 16px;border-right:0;border-bottom:1px solid var(--color-rule,rgba(30,35,30,.1))}.conv-share-control-group{grid-template-columns:82px minmax(0,1fr);align-items:center;gap:10px}.conv-share-themes,.conv-share-modes{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.conv-share-themes::-webkit-scrollbar,.conv-share-modes::-webkit-scrollbar{display:none}.conv-share-swatch,.conv-share-mode{flex:0 0 auto;width:auto;padding-inline:9px}.conv-share-output-meta{display:none}.conv-share-stage{height:min(48dvh,460px);padding:14px 16px}.conv-share-preview{min-height:0}.conv-share-footer{align-items:stretch;flex-direction:column;padding:12px 16px max(14px,env(safe-area-inset-bottom))}.conv-share-format{display:none}.conv-share-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.conv-share-actions--four{grid-template-columns:repeat(3,minmax(0,1fr))}.conv-share-btn{width:100%}.conv-share-btn--primary{grid-column:1 / -1;grid-row:1;min-width:0}}',
      '@media (max-width:420px){.conv-share-subtitle{max-width:32ch}.conv-share-swatch-label{display:none}.conv-share-swatch{padding-inline:7px}.conv-share-swatch-chip{width:28px;height:28px}.conv-share-stage{padding-inline:10px}}',
      '@media (prefers-reduced-motion:reduce){.conv-share-overlay,.conv-share-sheet,.conv-share-close,.conv-share-swatch,.conv-share-mode,.conv-share-btn{transition:none!important}}',
      '@media (prefers-reduced-transparency:reduce){.conv-share-overlay{backdrop-filter:none;-webkit-backdrop-filter:none}.conv-share-sheet{background:var(--color-paper,#f9f9f7)}body.dark .conv-share-sheet{background:#1d201d}}',
    ].join('');
    document.head.appendChild(s);
  })();

  // ── QR module-matrix provider ───────────────────────────────────────────────
  // Delegates to the bundled `qrcode-generator` library (loaded via a separate
  // <script> in extend_footer.html). A locally-generated matrix lets us paint
  // the QR straight onto the share canvas — an external image would taint it and
  // break PNG export/copy. `qrcode(0,'M')` auto-sizes and picks the best mask.
  function encodeQR(str) {
    if (typeof window.qrcode !== 'function') return null;
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(str);
      qr.make();
      var n = qr.getModuleCount();
      var modules = [];
      for (var r = 0; r < n; r++) {
        var row = [];
        for (var c = 0; c < n; c++) row.push(qr.isDark(r, c) ? 1 : 0);
        modules.push(row);
      }
      return { size: n, modules: modules };
    } catch (e) { return null; }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Paint an integer module grid with a four-cell white quiet zone.
  function drawQR(ctx, text, x, y, size, fg, bg) {
    var qr = encodeQR(text);
    if (!qr) { return false; }
    var quiet = 4;
    var dim = qr.size + quiet * 2;
    if (dim > size) return false;
    var cell = Math.floor(size / dim);
    var inset = Math.floor((size - dim * cell) / 2);
    ctx.fillStyle = bg; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = fg;
    for (var r = 0; r < qr.size; r++) for (var c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        ctx.fillRect(
          x + inset + (c + quiet) * cell,
          y + inset + (r + quiet) * cell,
          cell, cell
        );
      }
    }
    return true;
  }

  function qrTarget(options) { return options.url || window.location.href; }

  function shareSiteName(options) {
    if (options.siteName) return options.siteName;
    var canonical = document.querySelector('link[rel="canonical"]');
    var candidates = [options.url, canonical && canonical.href, window.location.href];
    for (var i = 0; i < candidates.length; i++) {
      if (!candidates[i]) continue;
      try {
        var host = new URL(candidates[i], window.location.origin).hostname.replace(/^www\./, '');
        if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
      } catch (err) {}
    }
    var meta = document.querySelector('meta[property="og:site_name"],meta[name="application-name"]');
    if (meta && meta.content && meta.content.length <= 32) return meta.content;
    return 'cubxxw';
  }

  function conversationPairs(messages) {
    var rounds = [], pendingQuestion = '';
    messages.forEach(function (message) {
      if (message.role === 'user') {
        pendingQuestion = message.content || '';
      } else if (message.role === 'assistant') {
        rounds.push({ question: pendingQuestion, answer: message.content || '' });
        pendingQuestion = '';
      }
    });
    return rounds;
  }

  // A fixed export width keeps body text readable. Height follows the content;
  // the limit bounds browser memory without quietly discarding normal replies.
  var CARD_WIDTH = 1080, CARD_MAX_HEIGHT = 14000, CARD_PAD = 86;
  var MAX_INPUT_CHARS = 120000;

  function generateCard(messages, options) {
    var rounds = conversationPairs(messages);
    return generateNoteCard(rounds.slice(-1), options);
  }

  function generateThreadCard(messages, options) {
    return generateNoteCard(conversationPairs(messages), options);
  }

  function generateNoteCard(rounds, options) {
    options = options || {};
    var theme = THEMES[options.theme] || THEMES[defaultTheme()];
    var isZh = isZhLang(options), font = cardFont(isZh);
    var W = CARD_WIDTH, PAD = CARD_PAD, contentWidth = W - PAD * 2;
    var measure = document.createElement('canvas').getContext('2d');
    var y = 174, layouts = [], clipped = false, inputLeft = MAX_INPUT_CHARS;
    // Footer, excerpt notice and a short question always remain inside the image.
    var bodyBottom = CARD_MAX_HEIGHT - 520;
    for (var i = 0; i < rounds.length; i++) {
      var round = rounds[i];
      if (y > bodyBottom - 180 || inputLeft <= 0) { clipped = true; break; }
      var answer = String(round.answer || '');
      var inputClipped = answer.length > inputLeft;
      if (inputClipped) answer = answer.slice(0, inputLeft);
      inputLeft -= answer.length;
      var question = String(round.question || '');
      var questionBudget = Math.min(question.length, 12000, Math.max(0, inputLeft));
      var questionClipped = questionBudget < question.length;
      question = question.slice(0, questionBudget);
      inputLeft -= question.length;
      var questionReserve = question ? 170 : 0;
      var answerLayout = layoutRichAnswer(measure, answer, {
        x: PAD, y: y, maxWidth: contentWidth,
        baseFont: '400 38px ' + font, boldFont: '600 38px ' + font,
        listFont: '400 38px ' + font, listBoldFont: '600 38px ' + font,
        markerFont: '500 28px ' + font,
        headingFont: '600 40px ' + font, quoteFont: '400 38px ' + font,
        codeFont: '400 34px ui-monospace,SFMono-Regular,Consolas,monospace',
        lineH: 60, listLineH: 60, headingLineH: 62, quoteLineH: 60,
        paraGap: 28, listGap: 18, listBodyIndent: 48,
        color: theme.ink, muted: theme.muted, accent: theme.muted,
        maxY: bodyBottom - questionReserve,
      });
      layouts.push({ type: 'answer', layout: answerLayout });
      y = answerLayout.endY;
      if (question.trim()) {
        var questionTop = y + 40;
        var questionLayout = layoutRichAnswer(measure, question, {
          x: PAD + 28, y: questionTop + 66, maxWidth: contentWidth - 28,
          baseFont: '400 28px ' + font, boldFont: '550 28px ' + font,
          listFont: '400 28px ' + font, listBoldFont: '550 28px ' + font,
          markerFont: '400 23px ' + font, headingFont: '550 28px ' + font,
          quoteFont: '400 28px ' + font,
          codeFont: '400 26px ui-monospace,SFMono-Regular,Consolas,monospace',
          lineH: 43, listLineH: 43, headingLineH: 43, quoteLineH: 43,
          paraGap: 15, listGap: 12, listBodyIndent: 34,
          color: theme.muted, accent: theme.muted, maxY: bodyBottom,
        });
        layouts.push({ type: 'question', top: questionTop, layout: questionLayout });
        y = questionLayout.endY;
        questionClipped = questionClipped || questionLayout.clipped;
      }
      if (answerLayout.clipped || inputClipped || questionClipped) { clipped = true; break; }
      if (i < rounds.length - 1) {
        layouts.push({ type: 'separator', y: y + 46 });
        y += 118;
      }
    }
    if (!rounds.length) y = 190;
    if (clipped) y += 72;
    var footerTop = y + 62;
    var title = options.title || document.title || '';
    var url = qrTarget(options);
    measure.font = '500 27px ' + font;
    var sourceLines = wrapText(measure, title, contentWidth - 196).slice(0, 3);
    var date = sourceDate(options);
    var footerHeight = Math.max(196, sourceLines.length * 38 + 124 + (date ? 30 : 0));
    var H = Math.min(CARD_MAX_HEIGHT, Math.max(710, footerTop + footerHeight + PAD));
    // Short notes keep the same breathing room above the footer as long notes.
    footerTop = H - PAD - footerHeight;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    paintBackground(ctx, theme, W, H);
    ctx.font = '500 25px ' + font; ctx.fillStyle = theme.muted;
    ctx.fillText(isZh ? 'AI 阅读札记' : 'AI reading note', PAD, 96);
    layouts.forEach(function (item) {
      if (item.type === 'separator') {
        ctx.fillStyle = theme.subtle; ctx.fillRect(PAD, item.y, contentWidth, 1);
      } else if (item.type === 'question') {
        ctx.font = '500 23px ' + font; ctx.fillStyle = theme.muted;
        ctx.fillText(isZh ? '提问' : 'Question', PAD + 28, item.top + 24);
        ctx.fillStyle = theme.border;
        ctx.fillRect(PAD, item.top + 6, 2, Math.max(70, item.layout.endY - item.top - 4));
        paintRichAnswer(ctx, item.layout);
      } else paintRichAnswer(ctx, item.layout);
    });
    if (clipped) {
      ctx.font = '400 23px ' + font; ctx.fillStyle = theme.muted;
      ctx.fillText(isZh ? 'AI 对话节选' : 'AI conversation excerpt', PAD, y - 18);
    }
    paintFooter(ctx, theme, {
      W: W, H: H, PAD: PAD, top: footerTop, url: url, title: title,
      sourceLines: sourceLines, siteName: shareSiteName(options), date: date,
      isZh: isZh, qrSize: 140, font: font,
    });
    return canvas;
  }

  function sourceDate(options) {
    var node = document.querySelector('article time[datetime],.post-meta time[datetime]');
    var value = options.date || (node && node.getAttribute('datetime')) || '';
    // Do not invent a creation date for a saved AI reply.
    var match = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(String(value));
    return match ? match[1] : '';
  }

  // Lay out semantic Markdown blocks into positioned text and rule operations.
  function layoutRichAnswer(ctx, md, o) {
    var blocks = parseMarkdownBlocks(md);
    var ops = [], lineCount = 0, y = o.y, clipped = false;
    for (var bi = 0; bi < blocks.length && !clipped; bi++) {
      var block = blocks[bi];
      var isLi = block.type === 'li';
      var isHeading = block.type === 'heading';
      var isQuote = block.type === 'quote';
      var isCode = block.type === 'code';
      var followsList = block.type === 'p' && bi > 0 && blocks[bi - 1].type === 'li';
      var indent = isLi || followsList ? o.listBodyIndent : (isQuote ? 24 : 0);
      var textX = o.x + indent;
      var baseFont = isCode ? o.codeFont : (isHeading ? o.headingFont : (isQuote ? o.quoteFont : (isLi ? o.listFont : o.baseFont)));
      var boldFont = isCode ? o.codeFont : (isHeading ? o.headingFont : (isLi ? o.listBoldFont : o.boldFont));
      var lineH = isHeading ? o.headingLineH : (isQuote ? o.quoteLineH : (isLi ? o.listLineH : o.lineH));
      var lines = wrapRuns(ctx, block.runs, o.maxWidth - indent, baseFont, boldFont);
      var quoteStartY = y;
      if (isQuote) {
        ops.push({
          type: 'rule', x: o.x, y: quoteStartY - 24, width: 3,
          height: Math.max(30, Math.min(lines.length * lineH + 12, o.maxY - quoteStartY)), color: o.accent || o.color,
        });
      }
      for (var li = 0; li < lines.length; li++) {
        if (lineCount >= o.maxLines || (o.maxY && y + lineH > o.maxY)) {
          appendEllipsis(ops);
          clipped = true;
          break;
        }
        if (isLi && li === 0) {
          ops.push({
            x: o.x, y: y - 2, text: block.marker,
            font: o.markerFont, color: o.accent || o.color,
          });
        }
        var cx = textX;
        lines[li].forEach(function (seg) {
          var font = seg.bold ? boldFont : baseFont;
          ops.push({ x: cx, y: y, text: seg.text, font: font, color: o.color });
          ctx.font = font;
          cx += ctx.measureText(seg.text).width;
        });
        y += lineH;
        lineCount++;
      }
      if (!clipped && bi < blocks.length - 1) {
        var next = blocks[bi + 1];
        y += isCode && next.type === 'code' ? 0 : (isLi && next.type === 'p' ? o.listGap : o.paraGap);
      }
    }
    return { ops: ops, endY: y, clipped: clipped };
  }

  function appendEllipsis(ops) {
    for (var i = ops.length - 1; i >= 0; i--) {
      if (ops[i].type === 'rule') continue;
      ops[i].text = String(ops[i].text || '').replace(/\s+$/, '') + '…';
      return;
    }
  }

  function paintRichAnswer(ctx, layout) {
    layout.ops.forEach(function (op) {
      if (op.type === 'rule') {
        ctx.fillStyle = op.color;
        roundRect(ctx, op.x, op.y, op.width, op.height, 2);
        ctx.fill();
        return;
      }
      ctx.font = op.font; ctx.fillStyle = op.color;
      ctx.fillText(op.text, op.x, op.y);
    });
  }

  function paintBackground(ctx, theme, W, H) {
    ctx.fillStyle = theme.card;
    ctx.fillRect(0, 0, W, H);
  }

  // Article attribution stays in the source footer, away from the AI answer.
  function paintFooter(ctx, theme, o) {
    var qrX = o.W - o.PAD - o.qrSize, qrY = o.top + 28;
    ctx.fillStyle = theme.subtle;
    ctx.fillRect(o.PAD, o.top, o.W - o.PAD * 2, 1);
    ctx.font = '400 22px ' + o.font; ctx.fillStyle = theme.muted;
    ctx.fillText(o.isZh ? '阅读原文' : 'Source article', o.PAD, o.top + 47);
    ctx.font = '500 27px ' + o.font; ctx.fillStyle = theme.ink;
    o.sourceLines.forEach(function (line, index) {
      ctx.fillText(line, o.PAD, o.top + 91 + index * 38);
    });
    var metaY = o.top + 91 + o.sourceLines.length * 38;
    ctx.font = '400 21px ' + o.font; ctx.fillStyle = theme.muted;
    ctx.fillText(o.siteName + (o.date ? ' · ' + o.date : ''), o.PAD, metaY);
    ctx.font = '400 19px ' + o.font;
    paintTextLines(ctx, compactUrl(o.url, 100), o.PAD, metaY + 32,
      o.W - o.PAD * 2 - 196, 1, 28);
    var hasQR = drawQR(ctx, o.url, qrX, qrY, o.qrSize, '#111111', '#ffffff');
    if (hasQR) {
      ctx.font = '400 19px ' + o.font; ctx.fillStyle = theme.muted;
      ctx.textAlign = 'center';
      ctx.fillText(o.isZh ? '扫码读原文' : 'Read article', qrX + o.qrSize / 2, qrY + o.qrSize + 29);
      ctx.textAlign = 'left';
    }
  }

  function paintTextLines(ctx, text, x, y, maxWidth, maxLines, lineHeight) {
    var lines = wrapText(ctx, text, maxWidth);
    var shown = lines.slice(0, maxLines);
    if (lines.length > maxLines && shown.length) {
      shown[shown.length - 1] = fitTextWithEllipsis(ctx, shown[shown.length - 1], maxWidth);
    }
    shown.forEach(function (line, index) {
      ctx.fillText(line, x, y + index * lineHeight);
    });
  }

  function fitTextWithEllipsis(ctx, text, maxWidth) {
    var value = String(text || '').replace(/\s+$/, '');
    while (value && ctx.measureText(value + '…').width > maxWidth) value = value.slice(0, -1);
    return value + '…';
  }

  function compactUrl(value, limit) {
    var display = String(value || '');
    try {
      var parsed = new URL(display, window.location.origin);
      display = parsed.hostname.replace(/^www\./, '') + parsed.pathname;
    } catch (err) {}
    if (display.length > limit) display = display.slice(0, limit - 1) + '…';
    return display;
  }

  // ── Markdown → rich blocks (for the answer body) ────────────────────────────
  // The conversation history stores raw Markdown (the web panel renders it with
  // its own parser). On the share card we mirror a small subset so bold, lists
  // and paragraph breaks survive instead of leaking ** and 1. as literal text.
  //
  // A "block" is { type:'p'|'li', marker?:string, runs:[{text,bold}] }. Runs let
  // a single line mix normal and bold spans; the painter switches fonts per run.
  function stripInlineMd(s) {
    // Drop emphasis/code/link syntax we don't style, keep the visible text.
    return s
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]*)\)/g, function (_, label, target) {
        return label === target ? label : label + ' (' + target + ')';
      });
  }
  function parseRuns(line) {
    // Split a line into bold / non-bold runs on **...** (and __...__).
    var runs = [], re = /(\*\*|__)(.+?)\1/g, last = 0, m;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) runs.push({ text: stripInlineMd(line.slice(last, m.index)), bold: false });
      runs.push({ text: stripInlineMd(m[2]), bold: true });
      last = re.lastIndex;
    }
    if (last < line.length) runs.push({ text: stripInlineMd(line.slice(last)), bold: false });
    // Drop *single-star* emphasis markers inside the remaining plain runs.
    runs.forEach(function (r) { if (!r.bold) r.text = r.text.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,!?:;)])/g, '$1$2'); });
    return runs.filter(function (r) { return r.text.length; });
  }
  function parseMarkdownBlocks(md) {
    var text = String(md || '');
    var lines = text.split(/\r?\n/);
    var blocks = [], i = 0;
    while (i < lines.length) {
      var raw = lines[i];
      var line = raw.replace(/\s+$/, '');
      if (line.trim() === '') { i++; continue; }
      var fence = /^\s*(```+|~~~+)(.*)$/.exec(line);
      if (fence) {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
          blocks.push({ type: 'code', runs: [{ text: lines[i] || ' ', bold: false }] });
          i++;
        }
        if (i < lines.length) i++;
        continue;
      }
      var ul = /^\s*[-*]\s+(.+)$/.exec(line);
      var ol = /^\s*(\d+)[.)]\s+(.+)$/.exec(line);
      var hd = /^#{1,6}\s+(.+)$/.exec(line);
      var quote = /^\s*>\s?(.+)$/.exec(line);
      if (quote) {
        var quoteRuns = parseRuns(quote[1]);
        i++;
        while (i < lines.length) {
          var nextQuote = /^\s*>\s?(.+)$/.exec(lines[i]);
          if (!nextQuote) break;
          quoteRuns.push({ text: ' ', bold: false });
          quoteRuns = quoteRuns.concat(parseRuns(nextQuote[1]));
          i++;
        }
        blocks.push({ type: 'quote', runs: quoteRuns });
        continue;
      } else if (ol) {
        blocks.push({ type: 'li', marker: ol[1] + '.', runs: parseRuns(ol[2]) });
      } else if (ul) {
        blocks.push({ type: 'li', marker: '•', runs: parseRuns(ul[1]) });
      } else if (hd) {
        blocks.push({ type: 'heading', runs: parseRuns(hd[1]).map(function (r) {
          return { text: r.text, bold: true };
        }) });
      } else {
        // Merge consecutive plain lines into one paragraph's runs (space-joined).
        var runs = parseRuns(line);
        i++;
        while (i < lines.length && lines[i].trim() !== ''
               && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])
               && !/^#{1,6}\s+/.test(lines[i]) && !/^\s*>\s?/.test(lines[i])
               && !/^\s*(```+|~~~+)/.test(lines[i])) {
          runs.push({ text: ' ', bold: false });
          runs = runs.concat(parseRuns(lines[i].replace(/\s+$/, '')));
          i++;
        }
        blocks.push({ type: 'p', runs: runs });
        continue;
      }
      i++;
    }
    return blocks;
  }

  // Wrap a block's runs into lines that fit maxWidth, tracking bold per segment.
  // Returns [[{text,bold}, …], …] — one inner array per visual line.
  var graphemeSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function graphemes(text) {
    return graphemeSegmenter
      ? Array.from(graphemeSegmenter.segment(text), function (part) { return part.segment; })
      : Array.from(text);
  }

  // Keep Latin words together when possible, but split URLs and long code tokens.
  // Graphemes prevent splitting emoji families or combining marks at line ends.
  function wrapRuns(ctx, runs, maxWidth, baseFont, boldFont) {
    var lines = [], cur = [], curW = 0;
    function pushLine() { if (cur.length) { lines.push(cur); cur = []; curW = 0; } }
    function append(value, bold, width) {
      var last = cur[cur.length - 1];
      if (last && last.bold === bold) last.text += value;
      else cur.push({ text: value, bold: bold });
      curW += width;
    }
    runs.forEach(function (run) {
      var font = run.bold ? boldFont : baseFont;
      ctx.font = font;
      var tokens = run.text.match(/[\u3400-\u9fff\u3040-\u30ff]|[^\u3400-\u9fff\u3040-\u30ff\s]+|\s+/gu) || [];
      tokens.forEach(function (token) {
        ctx.font = font;
        var width = ctx.measureText(token).width;
        if (width <= maxWidth) {
          if (curW + width > maxWidth && curW > 0) pushLine();
          append(token, run.bold, width);
        } else {
          graphemes(token).forEach(function (character) {
            ctx.font = font;
            var charWidth = ctx.measureText(character).width;
            if (curW + charWidth > maxWidth && curW > 0) pushLine();
            append(character, run.bold, charWidth);
          });
        }
      });
    });
    pushLine();
    return lines;
  }

  // Copied text keeps the card's paragraphs, list markers and literal code.
  function mdToPlainText(md) {
    // The same blocks back the image and copied text, so code and paragraphs
    // retain their meaning instead of collapsing into one line.
    var blocks = parseMarkdownBlocks(String(md || ''));
    var out = [];
    blocks.forEach(function (block, index) {
      var value = block.runs.map(function (run) { return run.text; }).join('');
      if (block.type === 'li') value = block.marker + ' ' + value;
      if (block.type === 'quote') value = '> ' + value;
      if (index) out.push(block.type === 'code' && blocks[index - 1].type === 'code' ? '\n' : '\n\n');
      out.push(value);
    });
    return out.join('').trim();
  }

  // ── Text helpers ────────────────────────────────────────────────────────────
  function isZhLang(options) {
    var lang = options.lang || document.documentElement.getAttribute('lang') || '';
    return lang.toLowerCase().indexOf('zh') === 0;
  }
  function wrapText(ctx, text, maxWidth) {
    return wrapRuns(ctx, [{ text: String(text || ''), bold: false }], maxWidth, ctx.font, ctx.font)
      .map(function (line) { return line.map(function (run) { return run.text; }).join(''); });
  }
  function formatAsText(messages, options, mode) {
    options = options || {};
    var title = options.title || document.title || '';
    var url = options.url || window.location.href;
    var isZh = isZhLang(options);
    var rounds = conversationPairs(messages);
    var out = [];
    if (title) { out.push(title); out.push(''); }
    out.push(isZh ? 'AI 阅读札记' : 'AI reading note');
    out.push('');
    if (mode === 'collection') {
      rounds.forEach(function (round, index) {
        out.push((isZh ? '对话 ' : 'Conversation ') + (index + 1));
        out.push(mdToPlainText(round.answer));
        if (round.question) out.push((isZh ? '提问：' : 'Question: ') + mdToPlainText(round.question));
        out.push('');
      });
    } else {
      var latest = rounds[rounds.length - 1] || { question: '', answer: '' };
      out.push(mdToPlainText(latest.answer));
      out.push('');
      if (latest.question) {
        out.push((isZh ? '提问：' : 'Question: ') + mdToPlainText(latest.question));
        out.push('');
      }
    }
    out.push(url);
    return out.join('\n');
  }

  // ── Share modal ─────────────────────────────────────────────────────────────
  function show(messages, options) {
    options = options || {};
    if (!messages || !messages.length) return;
    var isZh = isZhLang(options);
    options.theme = options.theme || defaultTheme();

    var existing = document.getElementById('conv-share-modal');
    if (existing) existing.remove();
    var previousActive = document.activeElement;
    var previousOverflow = document.body.style.overflow;

    var overlay = document.createElement('div');
    overlay.id = 'conv-share-modal';
    overlay.className = 'conv-share-overlay';

    var roundCount = messages.filter(function (m) { return m.role === 'assistant'; }).length;
    var collectionCount = roundCount;
    var supportsCopyImg = !!(navigator.clipboard && window.ClipboardItem);
    var supportsWebShare = !!navigator.share;
    var copyImgBtn = supportsCopyImg
      ? '<button class="conv-share-btn' + (supportsWebShare ? '' : ' conv-share-btn--primary') + '" id="csb-copy-img" aria-label="' + (isZh ? '复制图片' : 'Copy image') + '">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
          '<span>' + (isZh ? '复制图片' : 'Copy image') + '</span></button>'
      : '';

    var saveImgBtn =
      '<button class="conv-share-btn' + (!supportsWebShare && !supportsCopyImg ? ' conv-share-btn--primary' : '') + '" id="csb-save-img" aria-label="' + (isZh ? '下载图片' : 'Download image') + '">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        '<span>' + (isZh ? '下载' : 'Download') + '</span>' +
      '</button>';

    var webShareBtn = supportsWebShare
      ? '<button class="conv-share-btn conv-share-btn--primary" id="csb-web-share" aria-label="' + (isZh ? '分享卡片' : 'Share card') + '">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
          '<span>' + (isZh ? '分享卡片' : 'Share card') + '</span></button>'
      : '';

    var swatches = THEME_ORDER.map(function (key) {
      var t = THEMES[key];
      var on = key === options.theme ? ' conv-share-swatch--on' : '';
      var grad = 'linear-gradient(135deg,' + t.bgFrom + ',' + t.bgTo + ')';
      return '<button class="conv-share-swatch' + on + '" data-theme="' + key + '" ' +
        'title="' + (isZh ? t.labelZh : t.labelEn) + '" aria-label="' + (isZh ? t.labelZh : t.labelEn) + '" ' +
        'aria-pressed="' + (key === options.theme ? 'true' : 'false') + '">' +
          '<span class="conv-share-swatch-chip" aria-hidden="true" style="background:' + grad + ';"></span>' +
          '<span class="conv-share-swatch-label">' + (isZh ? t.labelZh : t.labelEn) + '</span>' +
        '</button>';
    }).join('');

    var modeControls = roundCount > 1
      ? '<div class="conv-share-control-group">' +
          '<span class="conv-share-control-label">' + (isZh ? '内容' : 'Content') + '</span>' +
          '<div class="conv-share-modes" id="csp-modes">' +
            '<button class="conv-share-mode conv-share-mode--on" data-mode="latest" aria-pressed="true">' + (isZh ? '当前回答' : 'Current answer') + '</button>' +
            '<button class="conv-share-mode" data-mode="collection" aria-pressed="false">' + (isZh ? '全部 ' + collectionCount + ' 条' : 'All ' + collectionCount) + '</button>' +
          '</div>' +
        '</div>'
      : '';

    overlay.innerHTML =
      '<div class="conv-share-sheet" role="dialog" aria-modal="true" aria-labelledby="conv-share-heading" aria-describedby="conv-share-description">' +
        '<div class="conv-share-handle"></div>' +
        '<div class="conv-share-header">' +
          '<span class="conv-share-title" id="conv-share-heading">' + (isZh ? '分享阅读札记' : 'Share reading note') + '</span>' +
          '<span class="conv-share-subtitle" id="conv-share-description">' +
            (isZh ? '选择内容与样式，然后导出卡片。' : 'Choose what to include, then export the card.') +
          '</span>' +
          '<button class="conv-share-close" aria-label="' + (isZh ? '关闭' : 'Close') + '">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="conv-share-workspace">' +
          '<aside class="conv-share-rail">' +
            modeControls +
            '<div class="conv-share-control-group">' +
              '<span class="conv-share-control-label">' + (isZh ? '样式' : 'Appearance') + '</span>' +
              '<div class="conv-share-themes" id="csp-themes">' + swatches + '</div>' +
            '</div>' +
            '<div class="conv-share-output-meta" aria-hidden="true">' +
              '<strong>' + (isZh ? '阅读札记' : 'Reading note') + '</strong>' +
              '<span id="csp-size">PNG</span>' +
            '</div>' +
          '</aside>' +
          '<div class="conv-share-stage">' +
            '<div class="conv-share-preview" id="csp-preview"></div>' +
          '</div>' +
        '</div>' +
        '<div class="conv-share-footer">' +
          '<span class="conv-share-format" aria-hidden="true">PNG</span>' +
          '<div class="conv-share-actions' + (supportsWebShare && supportsCopyImg ? ' conv-share-actions--four' : '') + '">' +
            '<button class="conv-share-btn" id="csb-copy-text" aria-label="' + (isZh ? '复制文本' : 'Copy text') + '">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
              '<span>' + (isZh ? '复制文本' : 'Copy text') + '</span>' +
            '</button>' +
            saveImgBtn +
            copyImgBtn +
            webShareBtn +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    var previewArea = document.getElementById('csp-preview');
    var mode = 'latest';
    var canvas = render();
    previewArea.appendChild(canvas);
    updateDimensions();

    function updateDimensions() {
      var label = document.getElementById('csp-size');
      if (label) label.textContent = canvas.width + ' × ' + canvas.height + ' px';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', isZh ? '阅读札记图片，下方可复制文本' : 'Reading note image. Copy text below for an accessible version.');
    }

    function render() {
      return mode === 'collection' ? generateThreadCard(messages, options) : generateCard(messages, options);
    }
    function rerender() {
      var next = render();
      previewArea.replaceChild(next, canvas);
      canvas = next;
      previewArea.scrollTop = 0;
      updateDimensions();
    }

    document.getElementById('csp-themes').addEventListener('click', function (e) {
      var b = e.target.closest('.conv-share-swatch');
      if (!b) return;
      options.theme = b.dataset.theme;
      this.querySelectorAll('.conv-share-swatch').forEach(function (x) {
        x.classList.toggle('conv-share-swatch--on', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      rerender();
    });

    var toggle = document.getElementById('csp-modes');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        var b = e.target.closest('.conv-share-mode');
        if (!b) return;
        toggle.querySelectorAll('.conv-share-mode').forEach(function (x) {
          x.classList.toggle('conv-share-mode--on', x === b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        mode = b.dataset.mode;
        rerender();
      });
    }

    var closing = false;
    function closeModal() {
      if (closing) return;
      closing = true;
      overlay.classList.remove('conv-share-overlay--visible');
      document.removeEventListener('keydown', handleKeydown);
      setTimeout(function () {
        if (overlay.parentNode) overlay.remove();
        document.body.style.overflow = previousOverflow;
        if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
      }, 240);
    }
    function btnDone(id, label) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.add('conv-share-btn--done');
      var sp = btn.querySelector('span');
      var orig = sp.textContent;
      sp.textContent = label;
      setTimeout(function () { btn.classList.remove('conv-share-btn--done'); sp.textContent = orig; }, 2200);
    }

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    overlay.querySelector('.conv-share-close').addEventListener('click', closeModal);
    function handleKeydown(e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusable = overlay.querySelectorAll('button:not([disabled])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeydown);

    document.getElementById('csb-copy-text').addEventListener('click', function () {
      var text = formatAsText(messages, options, mode);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { btnDone('csb-copy-text', isZh ? '已复制 ✓' : 'Copied ✓'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        btnDone('csb-copy-text', isZh ? '已复制 ✓' : 'Copied ✓');
      }
    });

    var copyImg = document.getElementById('csb-copy-img');
    if (copyImg) {
      copyImg.addEventListener('click', function () {
        canvas.toBlob(function (blob) {
          if (!blob) return;
          try {
            navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]).then(function () {
              btnDone('csb-copy-img', isZh ? '已复制 ✓' : 'Copied ✓');
            }).catch(function () { btnDone('csb-copy-img', isZh ? '复制失败' : 'Failed'); });
          } catch (err) { btnDone('csb-copy-img', isZh ? '复制失败' : 'Failed'); }
        }, 'image/png');
      });
    }

    document.getElementById('csb-save-img').addEventListener('click', function () {
      var a = document.createElement('a');
      a.download = 'article-insight.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      btnDone('csb-save-img', isZh ? '已保存 ✓' : 'Saved ✓');
    });

    var wsBtn = document.getElementById('csb-web-share');
    if (wsBtn) {
      wsBtn.addEventListener('click', function () {
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var file = new File([blob], 'article-insight.png', { type: 'image/png' });
          var shareTitle = (isZh ? '阅读札记｜' : 'Reading note | ') + (options.title || document.title || '');
          var shareData = {
            title: shareTitle,
            text: formatAsText(messages, options, mode).slice(0, 300),
            url: options.url || window.location.href,
          };
          if (navigator.canShare && navigator.canShare({ files: [file] })) shareData.files = [file];
          navigator.share(shareData).catch(function () {});
        });
      });
    }

    requestAnimationFrame(function () {
      overlay.classList.add('conv-share-overlay--visible');
      var initialFocus = overlay.querySelector('.conv-share-btn--primary') || overlay.querySelector('.conv-share-close');
      initialFocus.focus({ preventScroll: true });
    });
  }

  global.ShareConversation = { show: show };

}(window));
