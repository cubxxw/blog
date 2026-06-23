/* share-conversation.js — Canvas card generator + share modal
   Used by reading-companion, article-bottom-sheet and search-palette to share
   AI conversations as beautiful, themed images with a scannable QR code.

   Highlights:
   • 4 themes (classic / midnight-glass / warm-dusk / minimal-ink)
   • Latest-pair vs full-thread layouts
   • A locally-generated QR code baked into the card (scans straight to the
     article) — generated in-JS so the canvas never gets tainted and the PNG
     stays exportable & copyable.
   • Copy-image to clipboard on desktop, native share-sheet on mobile. */
(function (global) {
  'use strict';

  // ── Theme registry ──────────────────────────────────────────────────────────
  // Each theme is a flat palette consumed by the canvas painters. The default is
  // picked from the site's light/dark state; the rest are explicit UI picks.
  var THEMES = {
    classic: {
      labelZh: '经典', labelEn: 'Classic',
      bgFrom: '#f6f6f3', bgTo: '#eceae3',
      accent: '#862122', ink: '#1a1c1b',
      muted: 'rgba(30,35,30,0.46)', subtle: 'rgba(30,35,30,0.08)',
      answer: 'rgba(30,35,30,0.74)', badgeInk: '#ffffff',
      qrFg: '#1a1c1b', qrBg: '#ffffff',
    },
    midnight: {
      labelZh: '暗夜玻璃', labelEn: 'Midnight',
      bgFrom: '#10131a', bgTo: '#1b2030',
      accent: '#7aa2ff', ink: '#eef1f7',
      muted: 'rgba(220,228,245,0.52)', subtle: 'rgba(220,228,245,0.12)',
      answer: 'rgba(220,228,245,0.80)', badgeInk: '#10131a',
      qrFg: '#10131a', qrBg: '#eef1f7', glass: true,
    },
    dusk: {
      labelZh: '暖阳', labelEn: 'Warm dusk',
      bgFrom: '#ffe9d4', bgTo: '#f7b69c',
      accent: '#c2410c', ink: '#3a1d12',
      muted: 'rgba(80,40,25,0.52)', subtle: 'rgba(80,40,25,0.12)',
      answer: 'rgba(70,35,22,0.80)', badgeInk: '#fff4ec',
      qrFg: '#3a1d12', qrBg: '#fff4ec',
    },
    ink: {
      labelZh: '墨白', labelEn: 'Minimal ink',
      bgFrom: '#ffffff', bgTo: '#f4f4f4',
      accent: '#111111', ink: '#111111',
      muted: 'rgba(0,0,0,0.46)', subtle: 'rgba(0,0,0,0.10)',
      answer: 'rgba(0,0,0,0.78)', badgeInk: '#ffffff',
      qrFg: '#111111', qrBg: '#ffffff',
    },
  };
  var THEME_ORDER = ['classic', 'midnight', 'dusk', 'ink'];

  // Default theme mirrors the site's current mode for a native first render.
  function defaultTheme() {
    return document.body.classList.contains('dark') ? 'midnight' : 'classic';
  }

  var FONT = '-apple-system,"Inter","Helvetica Neue","PingFang SC","Hiragino Sans GB",sans-serif';

  // ── Inject styles once ──────────────────────────────────────────────────────
  (function injectStyles() {
    if (document.getElementById('conv-share-styles')) return;
    var s = document.createElement('style');
    s.id = 'conv-share-styles';
    s.textContent = [
      '.conv-share-overlay{',
        'position:fixed;inset:0;',
        'background:rgba(0,0,0,0.52);',
        'z-index:10000;',
        'display:flex;align-items:flex-end;justify-content:center;',
        'opacity:0;transition:opacity 200ms ease;',
        'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
      '}',
      '@media (min-width:600px){.conv-share-overlay{align-items:center;}}',
      '.conv-share-overlay--visible{opacity:1;}',
      '.conv-share-overlay--visible .conv-share-sheet{transform:translateY(0) scale(1);}',
      '.conv-share-sheet{',
        'background:var(--color-paper,#f9f9f7);',
        'border-radius:20px 20px 0 0;',
        'padding:18px 20px 26px;',
        'width:100%;max-width:540px;',
        'max-height:92vh;overflow-y:auto;',
        'transform:translateY(28px) scale(.98);',
        'transition:transform 260ms cubic-bezier(.22,1,.36,1);',
        'box-shadow:0 -4px 50px rgba(0,0,0,0.22);',
        'box-sizing:border-box;',
      '}',
      '@media (min-width:600px){.conv-share-sheet{border-radius:22px;}}',
      'body.dark .conv-share-sheet{background:#23261f;}',
      '.conv-share-handle{',
        'width:38px;height:4px;border-radius:2px;',
        'background:rgba(30,35,30,0.15);',
        'margin:0 auto 16px;',
      '}',
      '@media (min-width:600px){.conv-share-handle{display:none;}}',
      'body.dark .conv-share-handle{background:rgba(226,227,225,0.18);}',
      '.conv-share-header{',
        'display:flex;align-items:center;justify-content:space-between;',
        'margin-bottom:14px;',
      '}',
      '.conv-share-title{',
        'font-family:var(--font-body,system-ui,sans-serif);',
        'font-size:.95rem;font-weight:600;letter-spacing:.01em;',
        'color:var(--color-ink,#1a1c1b);',
      '}',
      'body.dark .conv-share-title{color:var(--color-paper,#e2e3e1);}',
      '.conv-share-close{',
        'width:30px;height:30px;border-radius:50%;border:none;',
        'background:rgba(30,35,30,0.06);',
        'color:var(--color-ink-muted,#5e5e63);',
        'cursor:pointer;display:flex;align-items:center;justify-content:center;',
        'padding:0;transition:background 140ms ease;',
      '}',
      '.conv-share-close:hover{background:rgba(30,35,30,0.12);}',
      'body.dark .conv-share-close{background:rgba(226,227,225,0.1);color:rgba(226,227,225,.6);}',
      '.conv-share-themes{',
        'display:flex;gap:9px;justify-content:center;',
        'margin:2px 0 14px;',
      '}',
      '.conv-share-swatch{',
        'width:30px;height:30px;border-radius:50%;cursor:pointer;',
        'border:2px solid transparent;padding:0;position:relative;',
        'transition:transform 140ms ease;outline:none;',
        'box-shadow:0 1px 3px rgba(0,0,0,0.18);',
      '}',
      '.conv-share-swatch:hover{transform:scale(1.08);}',
      '.conv-share-swatch--on{border-color:var(--color-accent,#862122);transform:scale(1.06);}',
      'body.dark .conv-share-swatch--on{border-color:#7fa07f;}',
      '.conv-share-swatch--on::after{',
        'content:"";position:absolute;inset:0;border-radius:50%;',
        'box-shadow:0 0 0 2px var(--color-paper,#f9f9f7);',
      '}',
      'body.dark .conv-share-swatch--on::after{box-shadow:0 0 0 2px #23261f;}',
      '.conv-share-preview{',
        'border-radius:14px;overflow:hidden;',
        'margin-bottom:16px;',
        'background:rgba(30,35,30,0.04);',
        'min-height:72px;display:flex;align-items:center;justify-content:center;',
      '}',
      'body.dark .conv-share-preview{background:rgba(226,227,225,0.04);}',
      '.conv-share-preview canvas{width:100%;height:auto;display:block;border-radius:12px;}',
      '.conv-share-modes{',
        'display:flex;gap:4px;padding:3px;margin-bottom:12px;',
        'background:rgba(30,35,30,0.05);border-radius:10px;',
      '}',
      'body.dark .conv-share-modes{background:rgba(226,227,225,0.06);}',
      '.conv-share-mode{',
        'flex:1;padding:7px 10px;border:none;border-radius:7px;',
        'background:transparent;cursor:pointer;',
        'font-family:var(--font-body,system-ui,sans-serif);',
        'font-size:.78rem;font-weight:500;',
        'color:var(--color-ink-muted,#5e5e63);',
        'transition:background 140ms ease,color 140ms ease;',
      '}',
      '.conv-share-mode--on{',
        'background:var(--color-paper,#f9f9f7);',
        'color:var(--color-ink,#1a1c1b);',
        'box-shadow:0 1px 2px rgba(30,35,30,0.06);',
      '}',
      'body.dark .conv-share-mode--on{background:rgba(226,227,225,0.15);color:var(--color-paper,#e2e3e1);}',
      '.conv-share-actions{display:flex;gap:10px;}',
      '.conv-share-btn{',
        'flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;',
        'padding:12px 6px;',
        'border:1px solid rgba(30,35,30,0.1);border-radius:12px;',
        'background:transparent;cursor:pointer;',
        'font-size:.7rem;font-weight:500;',
        'font-family:var(--font-body,system-ui,sans-serif);',
        'color:var(--color-ink,#1a1c1b);',
        'transition:background 140ms ease,border-color 140ms ease,transform 100ms ease;',
        'line-height:1.2;',
      '}',
      '.conv-share-btn:hover{background:rgba(30,35,30,0.04);border-color:rgba(30,35,30,0.18);}',
      '.conv-share-btn:active{transform:scale(.96);}',
      'body.dark .conv-share-btn{border-color:rgba(226,227,225,0.12);color:var(--color-paper,#e2e3e1);}',
      'body.dark .conv-share-btn:hover{background:rgba(226,227,225,0.06);border-color:rgba(226,227,225,0.22);}',
      '.conv-share-btn svg{flex-shrink:0;opacity:.82;}',
      '.conv-share-btn--done{border-color:#22c55e !important;}',
      '.conv-share-btn--done svg{stroke:#22c55e;opacity:1;}',
      '.conv-share-btn--done span{color:#22c55e;}',
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

  // Paint a QR onto ctx at (x,y) with a rounded background plate and quiet zone.
  function drawQR(ctx, text, x, y, size, fg, bg) {
    var qr = encodeQR(text);
    if (!qr) { return false; }
    var quiet = 4;
    var dim = qr.size + quiet * 2;
    var cell = size / dim;
    roundRect(ctx, x, y, size, size, Math.max(6, size * 0.06));
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg;
    for (var r = 0; r < qr.size; r++) for (var c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        ctx.fillRect(
          Math.floor(x + (c + quiet) * cell),
          Math.floor(y + (r + quiet) * cell),
          Math.ceil(cell), Math.ceil(cell)
        );
      }
    }
    return true;
  }

  function qrTarget(options) { return options.url || window.location.href; }

  // ── Canvas card generator (latest Q&A) ──────────────────────────────────────
  function generateCard(messages, options) {
    options = options || {};
    var theme = THEMES[options.theme] || THEMES[defaultTheme()];
    var title    = options.title || document.title || '';
    var url      = qrTarget(options);
    var siteName = (window.location.hostname || 'AI').replace(/^www\./, '');

    var W = 1080, H = 720;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    canvas.width = W * DPR; canvas.height = H * DPR;
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.textBaseline = 'alphabetic';

    paintBackground(ctx, theme, W, H);

    var accent = theme.accent, ink = theme.ink, muted = theme.muted, subtle = theme.subtle;
    var PAD = 72, IND = PAD + 34;
    var isZh = isZhLang(options);

    function badge(letter, cx, cy) {
      var r = 13;
      ctx.beginPath(); ctx.arc(cx + r, cy - 5, r, 0, Math.PI * 2);
      ctx.fillStyle = accent; ctx.fill();
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillStyle = theme.badgeInk; ctx.textAlign = 'center';
      ctx.fillText(letter, cx + r, cy);
      ctx.textAlign = 'left';
    }

    ctx.font = 'bold 19px ' + FONT; ctx.fillStyle = accent;
    ctx.fillText('AI Conversation', PAD, 62);
    ctx.font = '15px ' + FONT; ctx.fillStyle = muted;
    ctx.fillText(siteName, PAD, 86);

    var rounds = messages.filter(function (m) { return m.role === 'assistant'; }).length;
    if (rounds > 1) {
      ctx.textAlign = 'right'; ctx.font = '500 14px ' + FONT; ctx.fillStyle = muted;
      ctx.fillText(isZh ? (rounds + ' 轮对话 · 最新一组') : (rounds + ' exchanges · latest shown'), W - PAD, 72);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = subtle; ctx.fillRect(PAD, 106, W - PAD * 2, 1);

    var userMsg = null, aiMsg = null;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (!aiMsg   && messages[i].role === 'assistant') aiMsg   = messages[i];
      if (!userMsg && messages[i].role === 'user')      userMsg = messages[i];
      if (userMsg && aiMsg) break;
    }

    var y = 150;
    if (userMsg) {
      var qRaw = cleanText(userMsg.content);
      var qText = qRaw.length > 140 ? qRaw.slice(0, 137) + '…' : qRaw;
      badge('Q', PAD, y);
      ctx.font = '600 23px ' + FONT; ctx.fillStyle = ink;
      wrapText(ctx, qText, W - IND - PAD).slice(0, 3).forEach(function (line) { ctx.fillText(line, IND, y); y += 36; });
      y += 22;
    }

    ctx.fillStyle = subtle; ctx.fillRect(PAD, y - 6, W - PAD * 2, 1);
    y += 28;

    if (aiMsg) {
      var aRaw = cleanText(aiMsg.content);
      var aText = aRaw.length > 360 ? aRaw.slice(0, 357) + '…' : aRaw;
      badge('A', PAD, y);
      ctx.font = '18px ' + FONT; ctx.fillStyle = theme.answer;
      var aLines = wrapText(ctx, aText, W - IND - PAD);
      var maxLines = Math.min(aLines.length, 8);
      aLines.slice(0, maxLines).forEach(function (line, idx) { ctx.fillText(line, IND, y + idx * 31); });
      if (aLines.length > maxLines) { ctx.fillStyle = muted; ctx.fillText('…', IND, y + maxLines * 31); }
    }

    paintFooter(ctx, theme, { W: W, H: H, PAD: PAD, title: title, url: url, isZh: isZh, qrSize: 150 });
    return canvas;
  }

  // ── Full-thread card ────────────────────────────────────────────────────────
  function generateThreadCard(messages, options) {
    options = options || {};
    var theme = THEMES[options.theme] || THEMES[defaultTheme()];
    var title = options.title || document.title || '';
    var url   = qrTarget(options);
    var siteName = (window.location.hostname || 'AI').replace(/^www\./, '');
    var isZh = isZhLang(options);

    var accent = theme.accent, ink = theme.ink, muted = theme.muted, subtle = theme.subtle;
    var W = 1080, PAD = 72, IND = PAD + 32;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    var rounds = [], pendingQ = null;
    messages.forEach(function (m) {
      var txt = cleanText(m.content || '');
      if (m.role === 'user') pendingQ = txt;
      else if (m.role === 'assistant') { rounds.push({ q: pendingQ || '', a: txt }); pendingQ = null; }
    });
    var MAX_ROUNDS = 6;
    var clipped = rounds.length > MAX_ROUNDS;
    if (clipped) rounds = rounds.slice(-MAX_ROUNDS);

    var measure = document.createElement('canvas').getContext('2d');
    var qFont = '600 20px ' + FONT, aFont = '16px ' + FONT;
    var lineH = 26, maxAlines = 4;
    var blocks = rounds.map(function (r) {
      measure.font = qFont;
      var qLines = wrapText(measure, r.q || (isZh ? '（提问）' : '(question)'), W - IND - PAD).slice(0, 2);
      measure.font = aFont;
      var aLines = wrapText(measure, r.a, W - IND - PAD);
      var aClip = aLines.length > maxAlines;
      return { qLines: qLines, aLines: aLines.slice(0, maxAlines), aClip: aClip };
    });

    var headH = 116, footH = 100, roundGap = 22;
    var bodyH = blocks.reduce(function (sum, b) {
      return sum + b.qLines.length * lineH + 8 + b.aLines.length * (lineH - 2) + roundGap;
    }, 0);
    var H = headH + bodyH + footH + (clipped ? 24 : 0);

    var canvas = document.createElement('canvas');
    canvas.width = W * DPR; canvas.height = H * DPR;
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    paintBackground(ctx, theme, W, H);

    ctx.font = 'bold 19px ' + FONT; ctx.fillStyle = accent;
    ctx.fillText('AI Conversation', PAD, 60);
    ctx.font = '15px ' + FONT; ctx.fillStyle = muted;
    ctx.fillText(siteName, PAD, 84);
    ctx.textAlign = 'right';
    ctx.fillText((isZh ? '整段对话 · ' : 'Full thread · ') + rounds.length + (isZh ? ' 轮' : ''), W - PAD, 72);
    ctx.textAlign = 'left';
    ctx.fillStyle = subtle; ctx.fillRect(PAD, 100, W - PAD * 2, 1);

    var y = headH;
    blocks.forEach(function (b) {
      ctx.beginPath(); ctx.arc(PAD + 6, y - 6, 5, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
      ctx.font = qFont; ctx.fillStyle = ink;
      b.qLines.forEach(function (l) { ctx.fillText(l, IND, y); y += lineH; });
      y += 8;
      ctx.font = aFont; ctx.fillStyle = theme.answer;
      b.aLines.forEach(function (l, i) {
        ctx.fillText(l + (b.aClip && i === b.aLines.length - 1 ? ' …' : ''), IND, y);
        y += lineH - 2;
      });
      y += roundGap;
    });

    if (clipped) {
      ctx.font = 'italic 13px ' + FONT; ctx.fillStyle = muted;
      ctx.fillText(isZh ? '（仅显示最近 ' + MAX_ROUNDS + ' 轮）' : '(showing last ' + MAX_ROUNDS + ' rounds)', IND, y);
    }

    paintFooter(ctx, theme, { W: W, H: H, PAD: PAD, title: title, url: url, isZh: isZh, qrSize: 110 });
    return canvas;
  }

  // Shared background — gradient + accent bar + optional glass glow.
  function paintBackground(ctx, theme, W, H) {
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, theme.bgFrom); bg.addColorStop(1, theme.bgTo);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (theme.glass) {
      var glow = ctx.createRadialGradient(W * 0.78, H * 0.18, 20, W * 0.78, H * 0.18, W * 0.6);
      glow.addColorStop(0, 'rgba(122,162,255,0.22)');
      glow.addColorStop(1, 'rgba(122,162,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = theme.accent; ctx.fillRect(0, 0, W, 6);
  }

  // Shared footer — divider, brand dot, url, title, and the bottom-right QR
  // plate whose scan opens the article.
  function paintFooter(ctx, theme, o) {
    var W = o.W, H = o.H, PAD = o.PAD, qrSize = o.qrSize || 140;
    var qrX = W - PAD - qrSize;
    var qrY = H - 40 - qrSize;
    var footLineY = qrY - 22;

    ctx.fillStyle = theme.subtle; ctx.fillRect(PAD, footLineY, W - PAD * 2, 1);

    var textY = footLineY + 34;
    ctx.beginPath(); ctx.arc(PAD + 4, textY - 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent; ctx.fill();
    ctx.font = '13px ' + FONT; ctx.fillStyle = theme.muted;
    var shortUrl = o.url.length > 52 ? o.url.slice(0, 49) + '…' : o.url;
    ctx.fillText(shortUrl, PAD + 18, textY);

    if (o.title) {
      ctx.font = '600 15px ' + FONT; ctx.fillStyle = theme.ink;
      var maxTitleW = qrX - PAD - 24;
      wrapText(ctx, o.title, maxTitleW).slice(0, 2).forEach(function (l, i) {
        ctx.fillText(l, PAD, textY + 30 + i * 22);
      });
    }

    // Only label the QR once we know it actually rendered — if the encoder is
    // unavailable, the card degrades gracefully to title + url with no orphan hint.
    var hasQR = drawQR(ctx, o.url, qrX, qrY, qrSize, theme.qrFg, theme.qrBg);
    if (hasQR) {
      ctx.font = '500 12px ' + FONT; ctx.fillStyle = theme.muted; ctx.textAlign = 'right';
      ctx.fillText(o.isZh ? '扫码读原文' : 'Scan to read', W - PAD, qrY - 8);
      ctx.textAlign = 'left';
    }
  }

  // ── Text helpers ────────────────────────────────────────────────────────────
  function cleanText(s) { return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function isZhLang(options) {
    return options.lang === 'zh' ||
      (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;
  }
  function wrapText(ctx, text, maxWidth) {
    var lines = [], line = '';
    var hasCJK = /[一-鿿぀-ヿ]/.test(text);
    if (hasCJK) {
      for (var i = 0; i < text.length; i++) {
        var test = line + text[i];
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = text[i]; }
        else line = test;
      }
    } else {
      var words = text.split(' ');
      for (var w = 0; w < words.length; w++) {
        var test2 = line ? line + ' ' + words[w] : words[w];
        if (ctx.measureText(test2).width > maxWidth && line) { lines.push(line); line = words[w]; }
        else line = test2;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function formatAsText(messages, options) {
    options = options || {};
    var title = options.title || document.title || '';
    var url   = options.url   || window.location.href;
    var out = [];
    if (title) { out.push(title); out.push(''); }
    messages.forEach(function (msg) { out.push((msg.role === 'user' ? 'Q: ' : 'A: ') + cleanText(msg.content)); out.push(''); });
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

    var overlay = document.createElement('div');
    overlay.id = 'conv-share-modal';
    overlay.className = 'conv-share-overlay';

    var supportsCopyImg = !!(navigator.clipboard && window.ClipboardItem);
    var copyImgBtn = supportsCopyImg
      ? '<button class="conv-share-btn" id="csb-copy-img" aria-label="Copy image">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
          '<span>' + (isZh ? '复制图片' : 'Copy image') + '</span></button>'
      : '';

    var webShareBtn = navigator.share
      ? '<button class="conv-share-btn" id="csb-web-share" aria-label="Share">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
          '<span>' + (isZh ? '分享' : 'Share') + '</span></button>'
      : '';

    var swatches = THEME_ORDER.map(function (key) {
      var t = THEMES[key];
      var on = key === options.theme ? ' conv-share-swatch--on' : '';
      var grad = 'linear-gradient(135deg,' + t.bgFrom + ',' + t.bgTo + ')';
      return '<button class="conv-share-swatch' + on + '" data-theme="' + key + '" ' +
        'title="' + (isZh ? t.labelZh : t.labelEn) + '" aria-label="' + (isZh ? t.labelZh : t.labelEn) + '" ' +
        'style="background:' + grad + ';"></button>';
    }).join('');

    overlay.innerHTML =
      '<div class="conv-share-sheet">' +
        '<div class="conv-share-handle"></div>' +
        '<div class="conv-share-header">' +
          '<span class="conv-share-title">' + (isZh ? '分享对话' : 'Share Conversation') + '</span>' +
          '<button class="conv-share-close" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="conv-share-themes" id="csp-themes">' + swatches + '</div>' +
        '<div class="conv-share-preview" id="csp-preview"></div>' +
        '<div class="conv-share-actions">' +
          '<button class="conv-share-btn" id="csb-copy-text" aria-label="Copy text">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
            '<span>' + (isZh ? '复制文本' : 'Copy text') + '</span>' +
          '</button>' +
          copyImgBtn +
          '<button class="conv-share-btn" id="csb-save-img" aria-label="Save image">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            '<span>' + (isZh ? '保存图片' : 'Save image') + '</span>' +
          '</button>' +
          webShareBtn +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var previewArea = document.getElementById('csp-preview');
    var roundCount = messages.filter(function (m) { return m.role === 'assistant'; }).length;
    var mode = 'latest';
    var canvas = render();
    previewArea.appendChild(canvas);

    function render() {
      return mode === 'full' ? generateThreadCard(messages, options) : generateCard(messages, options);
    }
    function rerender() {
      var next = render();
      previewArea.replaceChild(next, canvas);
      canvas = next;
    }

    document.getElementById('csp-themes').addEventListener('click', function (e) {
      var b = e.target.closest('.conv-share-swatch');
      if (!b) return;
      options.theme = b.dataset.theme;
      this.querySelectorAll('.conv-share-swatch').forEach(function (x) {
        x.classList.toggle('conv-share-swatch--on', x === b);
      });
      rerender();
    });

    if (roundCount > 1) {
      var toggle = document.createElement('div');
      toggle.className = 'conv-share-modes';
      toggle.innerHTML =
        '<button class="conv-share-mode conv-share-mode--on" data-mode="latest">' + (isZh ? '最近一组' : 'Latest') + '</button>' +
        '<button class="conv-share-mode" data-mode="full">' + (isZh ? '整段对话' : 'Full thread') + '</button>';
      previewArea.parentNode.insertBefore(toggle, previewArea);
      toggle.addEventListener('click', function (e) {
        var b = e.target.closest('.conv-share-mode');
        if (!b) return;
        toggle.querySelectorAll('.conv-share-mode').forEach(function (x) {
          x.classList.toggle('conv-share-mode--on', x === b);
        });
        mode = b.dataset.mode;
        rerender();
      });
    }

    function closeModal() {
      overlay.classList.remove('conv-share-overlay--visible');
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 240);
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
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    document.getElementById('csb-copy-text').addEventListener('click', function () {
      var text = formatAsText(messages, options);
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
      a.download = 'ai-conversation.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      btnDone('csb-save-img', isZh ? '已保存 ✓' : 'Saved ✓');
    });

    var wsBtn = document.getElementById('csb-web-share');
    if (wsBtn) {
      wsBtn.addEventListener('click', function () {
        canvas.toBlob(function (blob) {
          var file = new File([blob], 'ai-conversation.png', { type: 'image/png' });
          var shareData = {
            title: options.title || (isZh ? 'AI 对话' : 'AI Conversation'),
            text:  formatAsText(messages, options).slice(0, 300),
            url:   options.url || window.location.href,
          };
          if (navigator.canShare && navigator.canShare({ files: [file] })) shareData.files = [file];
          navigator.share(shareData).catch(function () {});
        });
      });
    }

    requestAnimationFrame(function () { overlay.classList.add('conv-share-overlay--visible'); });
  }

  global.ShareConversation = { show: show };

}(window));
