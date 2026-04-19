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
    var canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    // Background gradient
    var bg = ctx.createLinearGradient(0, 0, W, H);
    if (dark) {
      bg.addColorStop(0, '#1e211e');
      bg.addColorStop(1, '#272b27');
    } else {
      bg.addColorStop(0, '#f4f5f2');
      bg.addColorStop(1, '#eaeae4');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    var accent = dark ? '#4d6a4d' : '#862122';
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 5);

    var ink    = dark ? '#dde0dc' : '#1a1c1b';
    var muted  = dark ? 'rgba(210,215,210,0.48)' : 'rgba(30,35,30,0.42)';
    var subtle = dark ? 'rgba(210,215,210,0.12)' : 'rgba(30,35,30,0.08)';
    var PAD = 68;

    // Header row
    ctx.font = 'bold 18px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText('AI Conversation', PAD, 58);

    ctx.font = '15px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(siteName, PAD, 82);

    // Divider
    ctx.fillStyle = subtle;
    ctx.fillRect(PAD, 100, W - PAD * 2, 1);

    // Find last Q&A pair
    var userMsg = null, aiMsg = null;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (!aiMsg   && messages[i].role === 'assistant') aiMsg   = messages[i];
      if (!userMsg && messages[i].role === 'user')      userMsg = messages[i];
      if (userMsg && aiMsg) break;
    }

    var y = 136;

    // Question block
    if (userMsg) {
      var qRaw = userMsg.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      var qText = qRaw.length > 140 ? qRaw.slice(0, 137) + '…' : qRaw;

      ctx.font = '500 13px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText('Q', PAD, y);

      ctx.font = '600 22px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
      ctx.fillStyle = ink;
      var qLines = wrapText(ctx, qText, W - PAD * 2 - 36, 22);
      qLines.slice(0, 3).forEach(function (line) {
        ctx.fillText(line, PAD + 28, y);
        y += 34;
      });
      y += 18;
    }

    // Divider between Q and A
    ctx.fillStyle = subtle;
    ctx.fillRect(PAD, y - 4, W - PAD * 2, 1);
    y += 20;

    // Answer block
    if (aiMsg) {
      var aRaw = aiMsg.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      var aText = aRaw.length > 340 ? aRaw.slice(0, 337) + '…' : aRaw;

      ctx.font = '500 13px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText('A', PAD, y);

      ctx.font = '18px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
      ctx.fillStyle = dark ? 'rgba(210,215,210,0.82)' : 'rgba(30,35,30,0.72)';
      var aLines = wrapText(ctx, aText, W - PAD * 2 - 36, 18);
      var maxLines = Math.min(aLines.length, 7);
      aLines.slice(0, maxLines).forEach(function (line, idx) {
        ctx.fillText(line, PAD + 28, y + idx * 30);
      });
      if (aLines.length > maxLines) {
        ctx.fillStyle = muted;
        ctx.fillText('…', PAD + 28, y + maxLines * 30);
      }
    }

    // Footer
    ctx.fillStyle = subtle;
    ctx.fillRect(PAD, H - 72, W - PAD * 2, 1);

    ctx.font = '13px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
    ctx.fillStyle = muted;
    var shortUrl = url.length > 64 ? url.slice(0, 61) + '…' : url;
    ctx.fillText(shortUrl, PAD, H - 44);

    if (title) {
      ctx.font = '500 13px -apple-system,"Inter","Helvetica Neue","PingFang SC",sans-serif';
      ctx.fillStyle = ink;
      ctx.textAlign = 'right';
      var shortTitle = title.length > 48 ? title.slice(0, 45) + '…' : title;
      ctx.fillText(shortTitle, W - PAD, H - 44);
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

    // Generate and insert canvas preview
    var canvas = generateCard(messages, options);
    var previewArea = document.getElementById('csp-preview');
    previewArea.appendChild(canvas);

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
