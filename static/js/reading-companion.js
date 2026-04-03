(function () {
  'use strict';

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
      if (href && href.charAt(0) === '#') {
        var id = decodeURIComponent(href.slice(1));
        var heading = document.getElementById(id);
        if (heading) {
          sections.push({ heading: heading, link: link });
        }
      }
    });
    if (!sections.length) return;

    var currentActive = null;
    var OFFSET = 120;

    function updateActive() {
      var scrollY = window.scrollY || window.pageYOffset;
      var activeSection = null;
      for (var i = sections.length - 1; i >= 0; i--) {
        var top = sections[i].heading.getBoundingClientRect().top + scrollY;
        if (scrollY >= top - OFFSET) {
          activeSection = sections[i];
          break;
        }
      }
      if (activeSection !== currentActive) {
        if (currentActive) currentActive.link.classList.remove('toc-active');
        if (activeSection) {
          activeSection.link.classList.add('toc-active');
          // 自动将激活项滚动到侧栏可视范围内
          var panel = document.getElementById('rc-panel-toc');
          if (panel) {
            var linkTop = activeSection.link.offsetTop;
            var panelScroll = panel.scrollTop;
            var panelHeight = panel.clientHeight;
            if (linkTop < panelScroll + 40 || linkTop > panelScroll + panelHeight - 60) {
              panel.scrollTo({ top: linkTop - panelHeight / 3, behavior: 'smooth' });
            }
          }
        }
        currentActive = activeSection;
      }
    }

    window.addEventListener('scroll', updateActive, { passive: true });
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
        quickRow.style.display = 'none'; // 用完后折叠
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

      addMessage(q, 'user');
      textarea.value = '';
      textarea.style.height = 'auto';
      setLoading(true);

      try {
        var res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            language: 'zh',
            articleTitle: getArticleTitle(),
            articleContent: getArticleText(),
            context: history,
          }),
        });

        var data;
        try {
          data = await res.json();
        } catch (_) {
          var rawText = '';
          try { rawText = await res.text(); } catch (_2) {}
          if (res.status === 404) {
            throw new Error('AI 函数未找到，请确认 netlify dev 正在运行');
          }
          throw new Error('AI 服务返回非 JSON 响应 (HTTP ' + res.status + ')' + (rawText ? '：' + rawText.slice(0, 120) : ''));
        }
        setLoading(false);

        if (!res.ok) throw new Error(data.error || '请求失败 (' + res.status + ')');

        var answer = data.answer || '（未收到回复）';
        addMessage(answer, 'ai');

        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer });
        if (history.length > 20) history = history.slice(-20);

      } catch (err) {
        var errMsg = addMessage('', 'ai');
        errMsg.innerHTML = '<span style="color:#ef4444">⚠ ' +
          err.message.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>';
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
