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

    initMobileAi();
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
    var hide = scrollY < FAB_HIDE_SCROLL || fromBottom < FAB_HIDE_BOTTOM;
    fab.classList.toggle('article-fab--hidden', hide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
