(function () {
  'use strict';

  var language = ((document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en';
  var messages = {
    zh: {
      notFound: 'AI 函数未找到，请确认 netlify dev 正在运行',
      nonJsonPrefix: 'AI 服务返回非 JSON 响应',
      requestFailed: '请求失败',
      noAnswer: '（未收到回复）',
      timeout: '请求超时，请稍后重试。',
      genericError: '请求失败，请稍后重试。',
      retry: '↺ 重试',
      sourcesLabel: '相关阅读',
      followupLabel: '继续追问',
      followups: [
        '能再具体展开一下吗？',
        '有没有相反的观点或例外？',
        '在现实里怎么应用这个？',
        '能举一个具体例子吗？'
      ]
    },
    en: {
      notFound: 'AI function not found. Make sure netlify dev is running.',
      nonJsonPrefix: 'AI service returned a non-JSON response',
      requestFailed: 'Request failed',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.',
      retry: '↺ Retry',
      sourcesLabel: 'Related reading',
      followupLabel: 'Keep asking',
      followups: [
        'Can you expand on that?',
        'Any counter-arguments or exceptions?',
        'How do I apply this in practice?',
        'Can you give a concrete example?'
      ]
    }
  };

  function t(key) {
    return (messages[language] && messages[language][key]) || messages.en[key] || key;
  }

  // ─── 1. Tab Switching ──────────────────────────────────────────────────────
  function initTabs() {
    var tabs = document.querySelectorAll('.reading-companion .rc-tab');
    var panels = document.querySelectorAll('.reading-companion .rc-panel');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;
        tabs.forEach(function (t) {
          var active = t.dataset.tab === target;
          t.classList.toggle('rc-tab--active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach(function (p) {
          var isTarget = p.id === 'rc-panel-' + target;
          p.classList.toggle('rc-panel--active', isTarget);
          if (isTarget) { p.removeAttribute('hidden'); }
          else { p.setAttribute('hidden', ''); }
        });
      });
    });
  }

  // ─── 2. TOC Scroll Highlighting ───────────────────────────────────────────
  function initTocHighlight() {
    var tocLinks = document.querySelectorAll('.toc-side__nav a');
    if (!tocLinks.length) return;

    var sections = [];
    tocLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var raw = href.slice(1);
      var heading = null;
      try {
        heading = document.getElementById(decodeURIComponent(raw));
      } catch (e) {
        heading = null;
      }
      if (!heading) heading = document.getElementById(raw);
      if (heading) sections.push({ heading: heading, link: link });
    });
    if (!sections.length) return;

    var currentActive = null;
    var OFFSET = 140;
    var rafPending = false;

    // Scroll the active TOC item into view within the sticky panel container
    function scrollTocItemIntoView(link) {
      // The scrollable container is .editorial-tools-panel (overflow-y: auto)
      var container = link.closest('.editorial-tools-panel') || link.closest('.toc-side__nav');
      if (!container) return;
      var containerRect = container.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      var padding = 40;
      if (linkRect.top < containerRect.top + padding || linkRect.bottom > containerRect.bottom - padding) {
        var targetScrollTop = container.scrollTop + (linkRect.top - containerRect.top) - (containerRect.height / 2) + (linkRect.height / 2);
        container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }

    function updateActive() {
      rafPending = false;
      var scrollY = window.scrollY || window.pageYOffset;
      var activeSection = null;
      for (var i = sections.length - 1; i >= 0; i--) {
        var top = sections[i].heading.getBoundingClientRect().top + scrollY;
        if (scrollY >= top - OFFSET) {
          activeSection = sections[i];
          break;
        }
      }
      if (activeSection === currentActive) return;
      if (currentActive) currentActive.link.classList.remove('toc-active');
      if (activeSection) {
        activeSection.link.classList.add('toc-active');
        scrollTocItemIntoView(activeSection.link);
      }
      currentActive = activeSection;
    }

    function onScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(updateActive);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateActive();
  }

  // ─── 3. Article Content Extractor ─────────────────────────────────────────
  function getArticleText() {
    var el = document.querySelector('.post-content');
    if (!el) return '';
    var clone = el.cloneNode(true);
    ['script', 'style', 'nav', 'aside', '.reading-companion'].forEach(function (sel) {
      clone.querySelectorAll(sel).forEach(function (n) { n.remove(); });
    });
    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length > 5500 ? text.slice(0, 5500) + '…' : text;
  }

  function getArticleTitle() {
    var el = document.querySelector('.post-single .post-title, h1.post-title');
    return el ? el.innerText.trim() : document.title;
  }

  // ─── 4. Minimal Markdown → HTML ───────────────────────────────────────────
  function parseMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
      .replace(/^[-*]\s+(.+)$/gm, '• $1')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>');
  }

  // ─── 5. AI Panel ──────────────────────────────────────────────────────────
  function initAiPanel() {
    var panel = document.getElementById('rc-panel-ai');
    if (!panel) return;

    var messagesEl = panel.querySelector('.rc-ai-messages');
    var loadingEl  = panel.querySelector('.rc-ai-loading');
    var textarea   = panel.querySelector('.rc-ai-textarea');
    var sendBtn    = panel.querySelector('.rc-ai-send');
    var chips      = panel.querySelectorAll('.rc-ai-chip');
    var quickRow   = panel.querySelector('.rc-ai-quick');

    var endpoint = '/.netlify/functions/article-ai';
    var history  = [];
    var busy     = false;
    var lastQuestion = '';

    // Share button — injected into input area, shown after first AI reply
    var shareBtn = document.createElement('button');
    shareBtn.className = 'rc-ai-share-btn';
    shareBtn.setAttribute('aria-label', language === 'zh' ? '分享对话' : 'Share conversation');
    shareBtn.setAttribute('hidden', '');
    shareBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
        '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
      '</svg>';
    var inputArea = panel.querySelector('.rc-ai-input-area');
    if (inputArea) inputArea.appendChild(shareBtn);

    shareBtn.addEventListener('click', function () {
      if (typeof ShareConversation === 'undefined') return;
      ShareConversation.show(history, {
        lang:  language,
        title: document.title,
        url:   window.location.href,
      });
    });

    // Auto-resize textarea
    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 96) + 'px';
    });

    // Quick chip → send (clicked chip disabled, others stay clickable)
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (busy || chip.disabled) return;
        chip.disabled = true;
        chip.classList.add('rc-ai-chip--used');
        textarea.value = chip.dataset.prompt;
        send();
      });
    });

    // Enter to send (Shift+Enter = newline)
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    sendBtn.addEventListener('click', send);

    function createAbortSignal(ms) {
      if (typeof AbortController === 'undefined') return { signal: undefined, cancel: function () {} };
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, ms);
      return {
        signal: controller.signal,
        cancel: function () { clearTimeout(timeoutId); }
      };
    }

    function addMessage(text, role) {
      var div = document.createElement('div');
      div.className = 'rc-ai-msg rc-ai-msg--' + role;
      if (role === 'ai') {
        div.innerHTML = parseMarkdown(text);
      } else {
        div.textContent = text;
      }
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    // Follow-up suggestion chips — rendered after each AI reply so the
    // reader can keep the conversation going with one tap (chat-agent feel).
    function renderFollowups() {
      // Remove any previous follow-up row — only the latest reply offers them.
      var stale = messagesEl.querySelector('.rc-ai-followups');
      if (stale) stale.remove();

      var suggestions = (messages[language] && messages[language].followups) || [];
      if (!suggestions.length) return;

      var wrap = document.createElement('div');
      wrap.className = 'rc-ai-followups';

      var label = document.createElement('span');
      label.className = 'rc-ai-followups__label';
      label.textContent = t('followupLabel');
      wrap.appendChild(label);

      suggestions.forEach(function (text) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rc-ai-followup';
        btn.textContent = text;
        btn.addEventListener('click', function () {
          if (busy) return;
          textarea.value = text;
          send();
        });
        wrap.appendChild(btn);
      });

      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setLoading(on) {
      if (on) { loadingEl.removeAttribute('hidden'); }
      else    { loadingEl.setAttribute('hidden', ''); }
      sendBtn.disabled = on;
      busy = on;
    }

    async function send() {
      var q = textarea.value.trim();
      if (!q || busy) return;
      lastQuestion = q;

      // Clear any follow-up chips from the prior reply before the new turn.
      var prevFollowups = messagesEl.querySelector('.rc-ai-followups');
      if (prevFollowups) prevFollowups.remove();

      addMessage(q, 'user');
      textarea.value = '';
      textarea.style.height = 'auto';
      setLoading(true);
      var request = createAbortSignal(25000);

      try {
        var res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            language: language,
            articleTitle: getArticleTitle(),
            articleContent: getArticleText(),
            context: history,
          }),
          signal: request.signal,
        });
        request.cancel();

        if (!res.ok) {
          if (res.status === 404) throw new Error(t('notFound'));
          var errData;
          try { errData = await res.json(); } catch (_) { errData = {}; }
          throw new Error(errData.error || (t('requestFailed') + ' (' + res.status + ')'));
        }

        var contentType = res.headers.get('content-type') || '';
        var answer = '';

        var rcCandidates = [];

        if (contentType.indexOf('text/event-stream') !== -1) {
          // Streaming SSE response — true progressive rendering
          setLoading(false);
          var streamDiv = addMessage('', 'ai');
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var sseBuffer = '';

          sseouter: while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            sseBuffer += decoder.decode(chunk.value, { stream: true });
            var sseLines = sseBuffer.split('\n');
            sseBuffer = sseLines.pop();
            for (var li = 0; li < sseLines.length; li++) {
              var sseLine = sseLines[li];
              if (sseLine.indexOf('data: ') === 0) {
                var sseData = sseLine.slice(6).trim();
                if (sseData === '[DONE]') break sseouter;
                try {
                  var sseJson = JSON.parse(sseData);
                  if (sseJson.meta && sseJson.meta.candidates) {
                    rcCandidates = sseJson.meta.candidates;
                  } else {
                    var delta = sseJson.delta || '';
                    if (delta) {
                      answer += delta;
                      streamDiv.innerHTML = parseMarkdown(answer);
                      messagesEl.scrollTop = messagesEl.scrollHeight;
                    }
                  }
                } catch (_e) {}
              }
            }
          }

          if (!answer) answer = t('noAnswer');
        } else {
          // Non-streaming JSON fallback
          var data;
          try {
            data = await res.json();
          } catch (_) {
            var rawText = '';
            try { rawText = await res.text(); } catch (_2) {}
            throw new Error(t('nonJsonPrefix') + ' (HTTP ' + res.status + ')' + (rawText ? ': ' + rawText.slice(0, 120) : ''));
          }
          setLoading(false);

          answer = data.answer || t('noAnswer');
          rcCandidates = data.candidates || [];
          addMessage(answer, 'ai');
        }

        // Render "related reading" only for candidates that point to a
        // *different* article — a permalink that's empty or equals the
        // current page is self-referential noise, so we drop it.
        var here = window.location.pathname.replace(/\/$/, '');
        var related = rcCandidates.filter(function (c) {
          if (!c || !c.permalink || !c.title) return false;
          var p = String(c.permalink).replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
          return p && p !== here;
        });
        if (related.length > 0) {
          var srcDiv = document.createElement('div');
          srcDiv.className = 'ai-sources';
          var srcLinks = related.slice(0, 3).map(function (c) {
            var safeTitle = String(c.title).replace(/&/g, '&amp;').replace(/</g, '&lt;');
            return '<a href="' + c.permalink + '" class="ai-source-link" target="_blank" rel="noopener">' + safeTitle + '</a>';
          }).join('');
          srcDiv.innerHTML = '<span class="ai-sources-label">' + t('sourcesLabel') + '</span>' + srcLinks;
          messagesEl.appendChild(srcDiv);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer });
        if (history.length > 20) history = history.slice(-20);
        shareBtn.removeAttribute('hidden');
        renderFollowups();

      } catch (err) {
        request.cancel();
        var errMsg = addMessage('', 'ai');
        var message = err && err.name === 'AbortError' ? t('timeout') : ((err && err.message) || t('genericError'));
        errMsg.innerHTML = '<span style="color:#ef4444">⚠ ' +
          message.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>';
        var retryBtn = document.createElement('button');
        retryBtn.className = 'ai-retry-btn';
        retryBtn.textContent = t('retry');
        retryBtn.addEventListener('click', function() {
          if (lastQuestion) {
            textarea.value = lastQuestion;
            send();
          }
        });
        errMsg.appendChild(retryBtn);
      } finally {
        setLoading(false);
        textarea.focus();
      }
    }
  }

  // ─── 6. Bootstrap ─────────────────────────────────────────────────────────
  function init() {
    if (!document.querySelector('.reading-companion')) return;
    initTabs();
    initTocHighlight();
    initAiPanel();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
