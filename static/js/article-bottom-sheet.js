/* US-031: Mobile bottom sheet for article tools (<1024px) */
(function () {
  'use strict';

  var FAB_HIDE_SCROLL = 80;    // px from top — hide fab
  var FAB_HIDE_BOTTOM = 80;    // px from bottom — hide fab near footer
  var SWIPE_CLOSE = 80;        // px downward swipe to close

  var fab, sheet, overlay, tabs, panels;
  var startY = 0;

  function init() {
    fab     = document.getElementById('article-fab');
    sheet   = document.getElementById('article-bottom-sheet');
    overlay = document.getElementById('article-sheet-overlay');
    if (!fab || !sheet || !overlay) return;

    tabs   = sheet.querySelectorAll('.abs-tab');
    panels = sheet.querySelectorAll('.abs-panel');

    fab.addEventListener('click', openSheet);
    overlay.addEventListener('click', closeSheet);

    // Tab switching
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;
        tabs.forEach(function (t) { t.classList.toggle('abs-tab--active', t.dataset.tab === target); });
        panels.forEach(function (p) { p.hidden = p.id !== 'abs-panel-' + target; });
      });
    });

    // Swipe-to-close
    sheet.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (e.changedTouches[0].clientY - startY > SWIPE_CLOSE) closeSheet();
    }, { passive: true });

    // FAB auto-fade via scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    initMobileAi();
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

    if (!messagesEl.children.length) {
      var greet = document.createElement('div');
      greet.className = 'abs-ai-msg abs-ai-msg--ai abs-ai-greeting';
      greet.style.opacity = '0.62';
      greet.style.fontStyle = 'italic';
      greet.textContent = T.greeting;
      messagesEl.appendChild(greet);
    }

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
    function addMsg(text, role) {
      var g = messagesEl.querySelector('.abs-ai-greeting');
      if (g) g.remove();
      var d = document.createElement('div');
      d.className = 'abs-ai-msg abs-ai-msg--' + role;
      if (role === 'ai') { d.innerHTML = escapeHtml(text).replace(/\n/g, '<br>'); }
      else { d.textContent = text; }
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return d;
    }

    function send() {
      var q = textarea.value.trim();
      if (!q || busy) return;
      busy = true;
      sendBtn.disabled = true;
      addMsg(q, 'user');
      textarea.value = '';
      var replyEl = addMsg('…', 'ai');

      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, 25000);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language: language, articleTitle: articleTitle(), articleContent: articleText(), context: history }),
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
          replyEl.innerHTML = escapeHtml(answer).replace(/\n/g, '<br>');
          return answer;
        });
      }).then(function (answer) {
        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer || replyEl.textContent });
        if (history.length > 20) history = history.slice(-20);
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
                replyEl.innerHTML = escapeHtml(answer).replace(/\n/g, '<br>');
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
    fab.classList.add('article-fab--hidden');
    sheet.classList.add('abs--open');
    overlay.classList.add('abs-overlay--visible');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheet.classList.remove('abs--open');
    overlay.classList.remove('abs-overlay--visible');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(onScroll, 260);
  }

  function onScroll() {
    if (!fab) return;
    var scrollY   = window.scrollY || window.pageYOffset;
    var docH      = document.documentElement.scrollHeight;
    var viewH     = window.innerHeight;
    var fromBottom = docH - scrollY - viewH;
    var hide = scrollY < FAB_HIDE_SCROLL || fromBottom < FAB_HIDE_BOTTOM;
    fab.classList.toggle('article-fab--hidden', hide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
