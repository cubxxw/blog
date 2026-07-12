/* US-031: Mobile bottom sheet for article tools (<1024px) */
(function () {
  'use strict';

  var FAB_HIDE_SCROLL = 80;    // px from top — hide fab
  var FAB_HIDE_BOTTOM = 80;    // px from bottom — hide fab near footer
  var SWIPE_CLOSE = 80;        // px downward swipe to close

  var fab, sheet, overlay, tabs, panels;
  var lastFocused = null;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    fab     = document.getElementById('article-fab');
    sheet   = document.getElementById('article-bottom-sheet');
    overlay = document.getElementById('article-sheet-overlay');
    if (!fab || !sheet || !overlay) return;

    tabs   = sheet.querySelectorAll('.abs-tab');
    panels = sheet.querySelectorAll('.abs-panel');

    fab.addEventListener('click', openSheet);
    overlay.addEventListener('click', closeSheet);

    // Tab switching — keep aria-selected in sync so assistive tech reports
    // the active tab correctly (previously only the visual class changed).
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;
        tabs.forEach(function (t) {
          var on = t.dataset.tab === target;
          t.classList.toggle('abs-tab--active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(function (p) { p.hidden = p.id !== 'abs-panel-' + target; });
      });
    });

    initDragToClose();

    // Keyboard: Escape closes the sheet; Tab is trapped inside it while open
    // (the sheet is aria-modal) so focus can't wander to the page behind.
    sheet.addEventListener('keydown', onSheetKeydown);

    // FAB auto-fade via scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // FAB auto-fade once the reader reaches the end-of-article zone.
    // Past the article body — the comments, related posts and footer —
    // the Contents / AI tools no longer serve the read, so the FAB
    // should get out of the way rather than sit over the discussion.
    initEndZoneFade();

    initMobileAi();
  }

  /* ── Hide the FAB in the end-of-article zone ──────────────────
     `fromBottom < 80` alone kept the FAB visible all through a tall
     comments iframe (utterances) because real page-bottom was still
     far below. Watch the first end-zone block instead — comments, or
     failing that related-posts / post-footer — and fade the FAB the
     moment it scrolls into view. Purely additive: `endZoneVisible`
     only ever forces the hide; onScroll still owns the top/bottom
     fades. No IntersectionObserver (very old browser) → no-op, and the
     scroll-based fade still applies. */
  var endZoneVisible = false;

  function initEndZoneFade() {
    if (!('IntersectionObserver' in window)) return;
    var target =
      document.querySelector('.post-comments') ||
      document.querySelector('.related-posts') ||
      document.querySelector('.post-footer');
    if (!target) return;

    var io = new IntersectionObserver(function (entries) {
      endZoneVisible = entries[0].isIntersecting;
      onScroll();
    }, {
      // Fade as soon as the end zone's top edge crosses into the lower
      // viewport — the moment the reader is done with the body and the
      // comments start coming up, the FAB clears out. No negative
      // bottom margin (that delayed the trigger until the block was
      // well up the screen); intersecting-at-all is the signal.
      threshold: 0,
    });
    io.observe(target);
  }

  /* ── Finger-following drag-to-close ───────────────────────────
     The grab handle and the tab bar form the drag zone. Dragging
     downward there pulls the whole sheet with the finger and dims
     the overlay in proportion; releasing past a threshold (or with a
     quick flick) dismisses it, otherwise it springs back. The panels
     below stay independently scrollable because the drag only starts
     on the non-scrolling header strip. Under reduced motion we skip
     the live transform and just honour the release threshold. */
  function initDragToClose() {
    var grabZone = sheet.querySelector('.abs-handle');
    var tabBar   = sheet.querySelector('.abs-tabs');
    var startY = 0, startT = 0, delta = 0, dragging = false;

    function fromGrabZone(node) {
      while (node && node !== document.body) {
        if (node === grabZone || node === tabBar) return true;
        node = node.parentNode;
      }
      return false;
    }

    sheet.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || !fromGrabZone(e.target)) { dragging = false; return; }
      startY = e.touches[0].clientY;
      startT = Date.now();
      delta = 0;
      dragging = true;
    }, { passive: true });

    sheet.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      delta = e.touches[0].clientY - startY;
      if (delta <= 0) { delta = 0; return; }
      if (prefersReduced) return;
      sheet.classList.add('abs--dragging');
      sheet.style.transform = 'translateY(' + delta + 'px)';
      var h = sheet.offsetHeight || 1;
      overlay.style.opacity = String(Math.max(0, 1 - (delta / h) * 1.1));
    }, { passive: true });

    sheet.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      var dt = Date.now() - startT;
      var flick = delta > 28 && dt < 240; // quick downward flick
      sheet.classList.remove('abs--dragging');
      sheet.style.transform = '';
      overlay.style.opacity = '';
      if (delta > SWIPE_CLOSE || flick) closeSheet();
    }, { passive: true });
  }

  function onSheetKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeSheet();
      return;
    }
    if (e.key !== 'Tab') return;
    // Focus trap: keep Tab cycling within the sheet's focusable controls.
    // Skip anything inside a hidden panel — those can't take focus, and
    // landing the trap on one would drop focus out of the dialog.
    var focusables = Array.prototype.filter.call(
      sheet.querySelectorAll(
        'button:not([disabled]), a[href], textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ─── Mobile AI companion ──────────────────────────────────────────────────
  // The bottom-sheet AI panel previously had no behaviour wired up at all —
  // typing and tapping send did nothing. This connects it to the same
  // /article-ai function the desktop companion uses, with streaming.
  function initMobileAi() {
    var panel = document.getElementById('abs-panel-ai');
    if (!panel) return;
    var messagesEl = panel.querySelector('.abs-ai-messages');
    var textarea   = panel.querySelector('.abs-ai-textarea');
    var sendBtn    = panel.querySelector('.abs-ai-send');
    if (!messagesEl || !textarea || !sendBtn) return;

    var language = ((document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en';
    var T = {
      zh: { greeting: '我已读完这篇文章，问我任何关于它的问题吧。', timeout: '请求超时，请稍后重试。', error: '请求失败，请稍后重试。', empty: '（未收到回复）' },
      en: { greeting: "I've read this article — ask me anything about it.", timeout: 'Request timed out. Please try again.', error: 'Request failed. Please try again.', empty: '(No answer received)' }
    }[language];

    var endpoint = '/.netlify/functions/article-ai';
    var history = [], busy = false;

    // Share-conversation button — mirrors desktop. Injected into the input
    // area, revealed after the first reply, reuses the shared ShareConversation
    // module so mobile readers can share AI chats too.
    var shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'abs-ai-share-btn';
    var shareLbl = language === 'zh' ? '分享对话' : 'Share conversation';
    shareBtn.setAttribute('aria-label', shareLbl);
    shareBtn.setAttribute('title', shareLbl);
    shareBtn.hidden = true;
    shareBtn.style.cssText = 'flex-shrink:0;width:34px;height:34px;border-radius:8px;' +
      'border:1px solid rgba(30,35,30,0.14);background:transparent;color:inherit;' +
      'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;opacity:0.72;';
    shareBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    var inputArea = panel.querySelector('.abs-ai-input-area');
    if (inputArea) inputArea.appendChild(shareBtn);
    shareBtn.addEventListener('click', function () {
      if (typeof ShareConversation === 'undefined' || !history.length) return;
      ShareConversation.show(history, { lang: language, title: document.title, url: window.location.href });
    });

    if (!messagesEl.children.length) {
      var greet = document.createElement('div');
      greet.className = 'abs-ai-msg abs-ai-msg--ai abs-ai-greeting';
      greet.style.opacity = '0.62';
      greet.style.fontStyle = 'italic';
      greet.textContent = T.greeting;
      messagesEl.appendChild(greet);
    }

    // Quick-start chips, mirroring the desktop companion so mobile readers
    // get the same one-tap entry points. Injected (no HTML template change).
    var QUICK = language === 'zh'
      ? [['📝', '一句话总结', '用 3-5 句话精炼地概括这篇文章的核心观点。'],
         ['✨', '精彩金句', '从这篇文章中挑出 3 句最有穿透力的话，并简要说明它们为什么值得记住。'],
         ['💡', '关键概念', '这篇文章里有哪些容易被忽略但重要的概念？请列出并解释。'],
         ['🤔', '反方视角', '帮我挑出这篇文章里最值得质疑或反驳的观点，并给出反方视角。']]
      : [['📝', 'Summary', 'Summarize the key points of this article in 3–5 sentences.'],
         ['✨', 'Highlights', 'List the 3 most memorable sentences from this article, and briefly explain why they stand out.'],
         ['💡', 'Key concepts', 'What are the overlooked but important concepts in this article? List and explain.'],
         ['🤔', 'Counter-argument', 'Which claims in this article are most worth challenging? Give me a counter-argument.']];
    var quickWrap = document.createElement('div');
    quickWrap.className = 'abs-ai-quick';
    quickWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;';
    QUICK.forEach(function (item) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'abs-ai-chip';
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:7px 11px;' +
        'border:1px solid rgba(30,35,30,0.12);border-radius:15px;background:transparent;' +
        'font:inherit;font-size:13px;cursor:pointer;color:inherit;';
      chip.innerHTML = '<span aria-hidden="true">' + item[0] + '</span>' + item[1];
      chip.addEventListener('click', function () {
        if (busy) return;
        chip.disabled = true;
        chip.style.opacity = '0.4';
        textarea.value = item[2];
        send();
        var allUsed = Array.prototype.every.call(quickWrap.children, function (c) { return c.disabled; });
        if (allUsed) quickWrap.style.display = 'none';
      });
      quickWrap.appendChild(chip);
    });
    messagesEl.parentNode.insertBefore(quickWrap, messagesEl.nextSibling);

    function articleText() {
      var el = document.querySelector('.post-content');
      if (!el) return '';
      var clone = el.cloneNode(true);
      ['script', 'style', 'nav', 'aside'].forEach(function (s) {
        clone.querySelectorAll(s).forEach(function (n) { n.remove(); });
      });
      var t = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length <= 5500) return t;
      return t.slice(0, 3850) + ' […] ' + t.slice(t.length - 1650);
    }
    function articleTitle() {
      var el = document.querySelector('.post-single .post-title, h1.post-title');
      return el ? el.innerText.trim() : document.title;
    }
    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    // Escaped text → HTML with Markdown [label](url) links rendered as safe
    // anchors (http(s)/site-relative only) so AI-recommended articles are
    // tappable on mobile too.
    function renderAiText(text) {
      return escapeHtml(text)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
          if (!/^https?:\/\//i.test(url) && !/^\//.test(url)) return label;
          var ext = /^https?:\/\//i.test(url) && url.indexOf(window.location.origin) !== 0;
          return '<a href="' + url + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' style="color:inherit;text-decoration:underline;text-underline-offset:2px;">' + label + '</a>';
        })
        .replace(/\n/g, '<br>');
    }
    function addMsg(text, role) {
      var g = messagesEl.querySelector('.abs-ai-greeting');
      if (g) g.remove();
      var d = document.createElement('div');
      d.className = 'abs-ai-msg abs-ai-msg--' + role;
      if (role === 'ai') { d.innerHTML = renderAiText(text); }
      else { d.textContent = text; }
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return d;
    }

    // Section-grounded follow-up chips, mirroring the desktop companion:
    // 1–2 questions built from the article's TOC headings (rotated by turn)
    // plus generic deep-dive prompts.
    var topics = (function () {
      var seen = {}, out = [];
      document.querySelectorAll('.abs-toc-nav a, .toc-side__nav a').forEach(function (a) {
        var h = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (h.length < 2 || h.length > 24 || /^[\d.\s]+$/.test(h) || seen[h]) return;
        seen[h] = 1; out.push(h);
      });
      return out;
    })();
    var GENERIC = language === 'zh'
      ? ['能再具体展开一下吗？', '有没有相反的观点或例外？', '能举一个具体例子吗？']
      : ['Can you expand on that?', 'Any counter-arguments or exceptions?', 'Can you give a concrete example?'];
    var followLabel = language === 'zh' ? '继续追问' : 'Keep asking';

    function buildFollowups(turn) {
      var list = [];
      if (topics.length) {
        var n = Math.min(2, topics.length);
        for (var k = 0; k < n; k++) {
          var t = topics[(turn + k) % topics.length];
          list.push(language === 'zh' ? '「' + t + '」这部分能展开讲讲吗？' : 'Can you expand on the "' + t + '" part?');
        }
      }
      for (var g = 0; g < GENERIC.length && list.length < 4; g++) {
        if (list.indexOf(GENERIC[g]) === -1) list.push(GENERIC[g]);
      }
      return list;
    }

    function renderFollowups() {
      var stale = messagesEl.querySelector('.abs-ai-followups');
      if (stale) stale.remove();
      var turn = history.filter(function (m) { return m.role === 'assistant'; }).length;
      var items = buildFollowups(turn);
      if (!items.length) return;
      var wrap = document.createElement('div');
      wrap.className = 'abs-ai-followups';
      wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px;padding-top:8px;border-top:1px dashed rgba(30,35,30,0.12);';
      var label = document.createElement('span');
      label.textContent = followLabel;
      label.style.cssText = 'width:100%;font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em;';
      wrap.appendChild(label);
      items.forEach(function (text) {
        var b = document.createElement('button');
        b.type = 'button';
        b.style.cssText = 'padding:5px 11px;border:1px solid rgba(30,35,30,0.14);border-radius:14px;background:transparent;font:inherit;font-size:12.5px;cursor:pointer;color:inherit;text-align:left;';
        b.textContent = text;
        b.addEventListener('click', function () {
          if (busy) return;
          textarea.value = text;
          send();
        });
        wrap.appendChild(b);
      });
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function send() {
      var q = textarea.value.trim();
      if (!q || busy) return;
      busy = true;
      sendBtn.disabled = true;
      var oldFollow = messagesEl.querySelector('.abs-ai-followups');
      if (oldFollow) oldFollow.remove();
      addMsg(q, 'user');
      textarea.value = '';
      var replyEl = addMsg('…', 'ai');

      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, 25000);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language: language, articleTitle: articleTitle(), articleContent: articleText(), pagePath: window.location.pathname, context: history }),
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var ct = res.headers.get('content-type') || '';
        if (ct.indexOf('text/event-stream') !== -1 && res.body && res.body.getReader) {
          return streamRead(res, replyEl);
        }
        return res.json().then(function (data) {
          var answer = (data && data.answer) || T.empty;
          replyEl.innerHTML = renderAiText(answer);
          return answer;
        });
      }).then(function (answer) {
        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer || replyEl.textContent });
        if (history.length > 20) history = history.slice(-20);
        renderFollowups();
        shareBtn.hidden = false;
      }).catch(function (err) {
        clearTimeout(timer);
        var msg = (err && err.name === 'AbortError') ? T.timeout : T.error;
        replyEl.innerHTML = '<span style="color:#ef4444">⚠ ' + escapeHtml(msg) + '</span>';
      }).then(function () {
        busy = false;
        sendBtn.disabled = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }

    function streamRead(res, replyEl) {
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '', answer = '';
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) return answer;
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('data: ') !== 0) continue;
            var raw = lines[i].slice(6).trim();
            if (raw === '[DONE]') return answer;
            try {
              var j = JSON.parse(raw);
              if (j.delta) {
                answer += j.delta;
                replyEl.innerHTML = renderAiText(answer);
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            } catch (e) {}
          }
          return pump();
        });
      }
      return pump().then(function (a) {
        if (!a) replyEl.textContent = T.empty;
        return a;
      });
    }

    sendBtn.addEventListener('click', send);
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  function openSheet() {
    lastFocused = document.activeElement;
    fab.classList.add('article-fab--hidden');
    sheet.classList.add('abs--open');
    overlay.classList.add('abs-overlay--visible');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog so keyboard / screen-reader users land
    // inside it; the active tab is the natural entry point.
    var activeTab = sheet.querySelector('.abs-tab--active') || tabs[0];
    if (activeTab) {
      try { activeTab.focus({ preventScroll: true }); } catch (e) { activeTab.focus(); }
    }
  }

  function closeSheet() {
    sheet.classList.remove('abs--open', 'abs--dragging');
    sheet.style.transform = '';
    overlay.style.opacity = '';
    overlay.classList.remove('abs-overlay--visible');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(onScroll, 260);
    // Return focus to the control that opened the sheet.
    if (lastFocused && lastFocused.focus) {
      try { lastFocused.focus({ preventScroll: true }); } catch (e) { lastFocused.focus(); }
    } else {
      fab.focus();
    }
    lastFocused = null;
  }

  function onScroll() {
    if (!fab) return;
    var scrollY   = window.scrollY || window.pageYOffset;
    var docH      = document.documentElement.scrollHeight;
    var viewH     = window.innerHeight;
    var fromBottom = docH - scrollY - viewH;
    var hide =
      scrollY < FAB_HIDE_SCROLL ||
      fromBottom < FAB_HIDE_BOTTOM ||
      endZoneVisible;            // reached comments / related / footer
    fab.classList.toggle('article-fab--hidden', hide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
