/* share-conversation.js — Canvas card generator + share modal
   Used by reading-companion and search-palette to share AI conversations. */
(function (global) {
  'use strict';

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
        'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);',
      '}',
      '.conv-share-overlay--visible{opacity:1;}',
      '.conv-share-overlay--visible .conv-share-sheet{transform:translateY(0);}',
      '.conv-share-sheet{',
        'background:var(--color-paper,#f9f9f7);',
        'border-radius:18px 18px 0 0;',
        'padding:20px 20px 28px;',
        'width:100%;max-width:540px;',
        'max-height:90vh;overflow-y:auto;',
        'transform:translateY(24px);',
        'transition:transform 220ms cubic-bezier(.22,1,.36,1);',
        'box-shadow:0 -4px 40px rgba(0,0,0,0.18);',
        'box-sizing:border-box;',
      '}',
      'body.dark .conv-share-sheet{background:#252825;}',
      '.conv-share-handle{',
        'width:36px;height:4px;border-radius:2px;',
        'background:rgba(30,35,30,0.15);',
        'margin:0 auto 18px;',
      '}',
      'body.dark .conv-share-handle{background:rgba(226,227,225,0.18);}',
      '.conv-share-header{',
        'display:flex;align-items:center;justify-content:space-between;',
        'margin-bottom:16px;',
      '}',
      '.conv-share-title{',
        'font-family:var(--font-body,system-ui,sans-serif);',
        'font-size:.9rem;font-weight:600;letter-spacing:.01em;',
        'color:var(--color-ink,#1a1c1b);',
      '}',
      'body.dark .conv-share-title{color:var(--color-paper,#e2e3e1);}',
      '.conv-share-close{',
        'width:28px;height:28px;border-radius:50%;border:none;',
        'background:rgba(30,35,30,0.06);',
        'color:var(--color-ink-muted,#5e5e63);',
        'cursor:pointer;display:flex;align-items:center;justify-content:center;',
        'padding:0;',
      '}',
      'body.dark .conv-share-close{background:rgba(226,227,225,0.1);color:rgba(226,227,225,.6);}',
      '.conv-share-preview{',
        'border-radius:12px;overflow:hidden;',
        'margin-bottom:18px;',
        'background:rgba(30,35,30,0.04);',
        'min-height:72px;display:flex;align-items:center;justify-content:center;',
      '}',
      'body.dark .conv-share-preview{background:rgba(226,227,225,0.04);}',
      '.conv-share-preview canvas{width:100%;height:auto;display:block;border-radius:10px;}',
      '.conv-share-actions{display:flex;gap:10px;}',
      '.conv-share-btn{',
        'flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;',
        'padding:12px 8px;',
        'border:1px solid rgba(30,35,30,0.1);border-radius:11px;',
        'background:transparent;cursor:pointer;',
        'font-size:.7rem;font-weight:500;',
        'font-family:var(--font-body,system-ui,sans-serif);',
        'color:var(--color-ink,#1a1c1b);',
        'transition:background 140ms ease,border-color 140ms ease;',
        'line-height:1.2;',
      '}',
      '.conv-share-btn:hover{background:rgba(30,35,30,0.04);border-color:rgba(30,35,30,0.18);}',
      'body.dark .conv-share-btn{border-color:rgba(226,227,225,0.12);color:var(--color-paper,#e2e3e1);}',
      'body.dark .conv-share-btn:hover{background:rgba(226,227,225,0.06);border-color:rgba(226,227,225,0.22);}',
      '.conv-share-btn svg{flex-shrink:0;opacity:.8;}',
      '.conv-share-btn--done svg{stroke:#22c55e;}',
      '.conv-share-btn--done span{color:#22c55e;}',
      '.conv-share-modes{',
        'display:flex;gap:4px;padding:3px;margin-bottom:12px;',
        'background:rgba(30,35,30,0.05);border-radius:9px;',
      '}',
      'body.dark .conv-share-modes{background:rgba(226,227,225,0.06);}',
      '.conv-share-mode{',
        'flex:1;padding:7px 10px;border:none;border-radius:6px;',
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
    ].join('');
    document.head.appendChild(s);
  })();

  // ── Canvas card generator ───────────────────────────────────────────────────
  function generateCard(messages, options) {
    options = options || {};
    var title   = options.title   || document.title || '';
    var url     = options.url     || window.location.href;
    var siteName = (window.location.hostname || 'AI').replace(/^www\./, '');
    var dark    = document.body.classList.contains('dark');

    var W = 1080, H = 680;
    // High-DPI rendering so the exported PNG stays crisp on retina screens.
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    // No inline CSS size — the .conv-share-preview canvas rule (width:100%)
    // scales it to fit the sheet; an inline 1080px would overflow and clip.
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.textBaseline = 'alphabetic';

    var FONT = '-apple-system,"Inter","Helvetica Neue","PingFang SC","Hiragino Sans GB",sans-serif';

    // Background gradient
    var bg = ctx.createLinearGradient(0, 0, W, H);
    if (dark) {
      bg.addColorStop(0, '#1e211e');
      bg.addColorStop(1, '#272b27');
    } else {
      bg.addColorStop(0, '#f6f6f3');
      bg.addColorStop(1, '#eceae3');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    var accent = dark ? '#7fa07f' : '#862122';
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 6);

    var ink    = dark ? '#e3e6e2' : '#1a1c1b';
    var muted  = dark ? 'rgba(210,215,210,0.50)' : 'rgba(30,35,30,0.44)';
    var subtle = dark ? 'rgba(210,215,210,0.12)' : 'rgba(30,35,30,0.08)';
    var PAD = 72;
    var IND = PAD + 34; // text indent past the Q/A badge

    // Rounded badge helper for the Q / A markers
    function badge(letter, cx, cy) {
      var r = 13;
      ctx.beginPath();
      ctx.arc(cx + r, cy - 5, r, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillStyle = dark ? '#1e211e' : '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(letter, cx + r, cy);
      ctx.textAlign = 'left';
    }

    var isZh = options.lang === 'zh' ||
               (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;

    // Header row
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillStyle = accent;
    ctx.fillText('AI Conversation', PAD, 62);

    ctx.font = '15px ' + FONT;
    ctx.fillStyle = muted;
    ctx.fillText(siteName, PAD, 86);

    // When the thread has more than one exchange, note the round count on the
    // right of the header so a shared card carries its context (the card shows
    // only the latest Q&A, but the reader knows it's an excerpt).
    var rounds = messages.filter(function (m) { return m.role === 'assistant'; }).length;
    if (rounds > 1) {
      ctx.textAlign = 'right';
      ctx.font = '500 14px ' + FONT;
      ctx.fillStyle = muted;
      var roundsLabel = isZh ? (rounds + ' 轮对话 · 最新一组') : (rounds + ' exchanges · latest shown');
      ctx.fillText(roundsLabel, W - PAD, 72);
      ctx.textAlign = 'left';
    }

    // Divider
    ctx.fillStyle = subtle;
    ctx.fillRect(PAD, 106, W - PAD * 2, 1);

    // Find last Q&A pair
    var userMsg = null, aiMsg = null;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (!aiMsg   && messages[i].role === 'assistant') aiMsg   = messages[i];
      if (!userMsg && messages[i].role === 'user')      userMsg = messages[i];
      if (userMsg && aiMsg) break;
    }

    var y = 150;

    // Question block
    if (userMsg) {
      var qRaw = userMsg.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      var qText = qRaw.length > 140 ? qRaw.slice(0, 137) + '…' : qRaw;

      badge('Q', PAD, y);

      ctx.font = '600 23px ' + FONT;
      ctx.fillStyle = ink;
      var qLines = wrapText(ctx, qText, W - IND - PAD, 23);
      qLines.slice(0, 3).forEach(function (line) {
        ctx.fillText(line, IND, y);
        y += 36;
      });
      y += 22;
    }

    // Divider between Q and A
    ctx.fillStyle = subtle;
    ctx.fillRect(PAD, y - 6, W - PAD * 2, 1);
    y += 28;

    // Answer block
    if (aiMsg) {
      var aRaw = aiMsg.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      var aText = aRaw.length > 360 ? aRaw.slice(0, 357) + '…' : aRaw;

      badge('A', PAD, y);

      ctx.font = '18px ' + FONT;
      ctx.fillStyle = dark ? 'rgba(214,219,214,0.86)' : 'rgba(30,35,30,0.74)';
      var aLines = wrapText(ctx, aText, W - IND - PAD, 18);
      var maxLines = Math.min(aLines.length, 8);
      aLines.slice(0, maxLines).forEach(function (line, idx) {
        ctx.fillText(line, IND, y + idx * 31);
      });
      if (aLines.length > maxLines) {
        ctx.fillStyle = muted;
        ctx.fillText('…', IND, y + maxLines * 31);
      }
    }

    // Footer
    ctx.fillStyle = subtle;
    ctx.fillRect(PAD, H - 76, W - PAD * 2, 1);

    // Brand dot + url
    ctx.beginPath();
    ctx.arc(PAD + 4, H - 49, 4, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();

    ctx.font = '13px ' + FONT;
    ctx.fillStyle = muted;
    var shortUrl = url.length > 60 ? url.slice(0, 57) + '…' : url;
    ctx.fillText(shortUrl, PAD + 18, H - 44);

    if (title) {
      ctx.font = '500 13px ' + FONT;
      ctx.fillStyle = ink;
      ctx.textAlign = 'right';
      var shortTitle = title.length > 46 ? title.slice(0, 43) + '…' : title;
      ctx.fillText(shortTitle, W - PAD, H - 44);
      ctx.textAlign = 'left';
    }

    return canvas;
  }

  // Full-thread card: every Q&A in the conversation, compactly. Height grows
  // with the number of rounds (capped) so the whole exchange can be saved as
  // one image, not just the latest pair.
  function generateThreadCard(messages, options) {
    options = options || {};
    var title = options.title || document.title || '';
    var url   = options.url   || window.location.href;
    var siteName = (window.location.hostname || 'AI').replace(/^www\./, '');
    var dark = document.body.classList.contains('dark');
    var isZh = options.lang === 'zh' ||
               (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;

    var FONT = '-apple-system,"Inter","Helvetica Neue","PingFang SC","Hiragino Sans GB",sans-serif';
    var accent = dark ? '#7fa07f' : '#862122';
    var ink    = dark ? '#e3e6e2' : '#1a1c1b';
    var muted  = dark ? 'rgba(210,215,210,0.50)' : 'rgba(30,35,30,0.44)';
    var subtle = dark ? 'rgba(210,215,210,0.12)' : 'rgba(30,35,30,0.08)';
    var W = 1080, PAD = 72, IND = PAD + 32;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    // Pair up the conversation into {q, a} rounds.
    var rounds = [], pendingQ = null;
    messages.forEach(function (m) {
      var txt = (m.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (m.role === 'user') { pendingQ = txt; }
      else if (m.role === 'assistant') { rounds.push({ q: pendingQ || '', a: txt }); pendingQ = null; }
    });
    var MAX_ROUNDS = 6;
    var clipped = rounds.length > MAX_ROUNDS;
    if (clipped) rounds = rounds.slice(-MAX_ROUNDS);

    // First pass on an off-screen ctx to measure wrapped line counts → height.
    var measure = document.createElement('canvas').getContext('2d');
    var qFont = '600 20px ' + FONT, aFont = '16px ' + FONT;
    var lineH = 26, maxAlines = 4;
    var blocks = rounds.map(function (r) {
      measure.font = qFont;
      var qLines = wrapText(measure, r.q || (isZh ? '（提问）' : '(question)'), W - IND - PAD).slice(0, 2);
      measure.font = aFont;
      var aLines = wrapText(measure, r.a, W - IND - PAD);
      var aClip = aLines.length > maxAlines;
      aLines = aLines.slice(0, maxAlines);
      return { qLines: qLines, aLines: aLines, aClip: aClip };
    });

    var headH = 116, footH = 76, roundGap = 22;
    var bodyH = blocks.reduce(function (sum, b) {
      return sum + b.qLines.length * lineH + 8 + b.aLines.length * (lineH - 2) + roundGap;
    }, 0);
    var H = headH + bodyH + footH + (clipped ? 24 : 0);

    var canvas = document.createElement('canvas');
    canvas.width = W * DPR; canvas.height = H * DPR;
    // No inline CSS size — let the preview rule (width:100%) scale it to fit.
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // Background + accent bar
    var bg = ctx.createLinearGradient(0, 0, W, H);
    if (dark) { bg.addColorStop(0, '#1e211e'); bg.addColorStop(1, '#272b27'); }
    else      { bg.addColorStop(0, '#f6f6f3'); bg.addColorStop(1, '#eceae3'); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 6);

    // Header
    ctx.font = 'bold 19px ' + FONT; ctx.fillStyle = accent;
    ctx.fillText('AI Conversation', PAD, 60);
    ctx.font = '15px ' + FONT; ctx.fillStyle = muted;
    ctx.fillText(siteName, PAD, 84);
    ctx.textAlign = 'right';
    ctx.fillText((isZh ? '整段对话 · ' : 'Full thread · ') + rounds.length + (isZh ? ' 轮' : ''), W - PAD, 72);
    ctx.textAlign = 'left';
    ctx.fillStyle = subtle; ctx.fillRect(PAD, 100, W - PAD * 2, 1);

    // Rounds
    var y = headH;
    blocks.forEach(function (b) {
      ctx.font = qFont; ctx.fillStyle = ink;
      // Q dot
      ctx.beginPath(); ctx.arc(PAD + 6, y - 6, 5, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
      ctx.fillStyle = ink;
      b.qLines.forEach(function (l) { ctx.fillText(l, IND, y); y += lineH; });
      y += 8;
      ctx.font = aFont; ctx.fillStyle = dark ? 'rgba(214,219,214,0.82)' : 'rgba(30,35,30,0.72)';
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

    // Footer
    ctx.fillStyle = subtle; ctx.fillRect(PAD, H - footH, W - PAD * 2, 1);
    ctx.beginPath(); ctx.arc(PAD + 4, H - 49, 4, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
    ctx.font = '13px ' + FONT; ctx.fillStyle = muted;
    var shortUrl = url.length > 60 ? url.slice(0, 57) + '…' : url;
    ctx.fillText(shortUrl, PAD + 18, H - 44);
    if (title) {
      ctx.font = '500 13px ' + FONT; ctx.fillStyle = ink; ctx.textAlign = 'right';
      ctx.fillText(title.length > 46 ? title.slice(0, 43) + '…' : title, W - PAD, H - 44);
      ctx.textAlign = 'left';
    }
    return canvas;
  }

  function wrapText(ctx, text, maxWidth) {
    // Word-aware wrapping that also handles CJK (no spaces between chars)
    var lines = [], line = '';
    // Try character-level for CJK, word-level otherwise
    var hasCJK = /[\u4e00-\u9fff\u3040-\u30ff]/.test(text);
    if (hasCJK) {
      for (var i = 0; i < text.length; i++) {
        var test = line + text[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = text[i];
        } else {
          line = test;
        }
      }
    } else {
      var words = text.split(' ');
      for (var w = 0; w < words.length; w++) {
        var test2 = line ? line + ' ' + words[w] : words[w];
        if (ctx.measureText(test2).width > maxWidth && line) {
          lines.push(line);
          line = words[w];
        } else {
          line = test2;
        }
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function formatAsText(messages, options) {
    options = options || {};
    var title = options.title || document.title || '';
    var url   = options.url   || window.location.href;
    var out   = [];
    if (title) { out.push(title); out.push(''); }
    messages.forEach(function (msg) {
      var prefix  = msg.role === 'user' ? 'Q: ' : 'A: ';
      var content = msg.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      out.push(prefix + content);
      out.push('');
    });
    out.push(url);
    return out.join('\n');
  }

  // ── Share modal ─────────────────────────────────────────────────────────────
  function show(messages, options) {
    options = options || {};
    if (!messages || !messages.length) return;
    var isZh = options.lang === 'zh' ||
               (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;

    var existing = document.getElementById('conv-share-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'conv-share-modal';
    overlay.className = 'conv-share-overlay';

    var webShareBtn = navigator.share
      ? '<button class="conv-share-btn" id="csb-web-share" aria-label="Share">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
          '<span>' + (isZh ? '分享' : 'Share') + '</span></button>'
      : '';

    overlay.innerHTML =
      '<div class="conv-share-sheet">' +
        '<div class="conv-share-handle"></div>' +
        '<div class="conv-share-header">' +
          '<span class="conv-share-title">' + (isZh ? '分享对话' : 'Share Conversation') + '</span>' +
          '<button class="conv-share-close" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="conv-share-preview" id="csp-preview"></div>' +
        '<div class="conv-share-actions">' +
          '<button class="conv-share-btn" id="csb-copy-text" aria-label="Copy text">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
            '<span>' + (isZh ? '复制文本' : 'Copy text') + '</span>' +
          '</button>' +
          '<button class="conv-share-btn" id="csb-save-img" aria-label="Save image">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            '<span>' + (isZh ? '保存图片' : 'Save image') + '</span>' +
          '</button>' +
          webShareBtn +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Generate and insert canvas preview. `canvas` is mutable so the
    // latest/full toggle can swap it and save/share stay in sync.
    var previewArea = document.getElementById('csp-preview');
    var roundCount = messages.filter(function (m) { return m.role === 'assistant'; }).length;
    var canvas = generateCard(messages, options);
    previewArea.appendChild(canvas);

    // Latest-pair vs full-thread toggle — only when there's more than one round
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
        var next = b.dataset.mode === 'full'
          ? generateThreadCard(messages, options)
          : generateCard(messages, options);
        previewArea.replaceChild(next, canvas);
        canvas = next;
      });
    }

    function closeModal() {
      overlay.classList.remove('conv-share-overlay--visible');
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 220);
    }

    function btnDone(id, label) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.add('conv-share-btn--done');
      var sp = btn.querySelector('span');
      var orig = sp.textContent;
      sp.textContent = label;
      setTimeout(function () {
        btn.classList.remove('conv-share-btn--done');
        sp.textContent = orig;
      }, 2200);
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('.conv-share-close').addEventListener('click', closeModal);

    document.getElementById('csb-copy-text').addEventListener('click', function () {
      var text = formatAsText(messages, options);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          btnDone('csb-copy-text', isZh ? '已复制 ✓' : 'Copied ✓');
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btnDone('csb-copy-text', isZh ? '已复制 ✓' : 'Copied ✓');
      }
    });

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
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
          navigator.share(shareData).catch(function () {});
        });
      });
    }

    // Animate in
    requestAnimationFrame(function () {
      overlay.classList.add('conv-share-overlay--visible');
    });
  }

  global.ShareConversation = { show: show };

}(window));
