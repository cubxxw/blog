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
      genericError: '请求失败，请稍后重试。'
    },
    en: {
      notFound: 'AI function not found. Make sure netlify dev is running.',
      nonJsonPrefix: 'AI service returned a non-JSON response',
      requestFailed: 'Request failed',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.'
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
      if (activeSection) activeSection.link.classList.add('toc-active');
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

    // Auto-resize textarea
    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 96) + 'px';
    });

    // Quick chip → send
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (busy) return;
        textarea.value = chip.dataset.prompt;
        quickRow.style.display = 'none';
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

        // Render source link if candidates available
        if (rcCandidates.length > 0) {
          var srcDiv = document.createElement('div');
          srcDiv.className = 'ai-sources';
          var srcLinks = rcCandidates.slice(0, 3).map(function(c) {
            var href = c.permalink || window.location.pathname;
            return '<a href="' + href + '" class="ai-source-link" target="_blank">' + c.title + '</a>';
          }).join('');
          srcDiv.innerHTML = '<span class="ai-sources-label">参考 / Source: </span>' + srcLinks;
          messagesEl.appendChild(srcDiv);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer });
        if (history.length > 20) history = history.slice(-20);

      } catch (err) {
        request.cancel();
        var errMsg = addMessage('', 'ai');
        var message = err && err.name === 'AbortError' ? t('timeout') : ((err && err.message) || t('genericError'));
        errMsg.innerHTML = '<span style="color:#ef4444">⚠ ' +
          message.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>';
        var retryBtn = document.createElement('button');
        retryBtn.className = 'ai-retry-btn';
        retryBtn.textContent = '↺ 重试';
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
