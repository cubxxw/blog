/* Article FAQ enhancements (pairs with partials/article/faq.html)
 *
 * 1. Eased open/close animation for the native <details> items — WAAPI
 *    height animation with a content fade, degrading to the browser's
 *    instant toggle when reduced motion is requested or WAAPI is missing.
 * 2. An inline "keep asking" AI thread per FAQ item. The thread is seeded
 *    with that item's Q&A so the model answers in context, and streams from
 *    the same /article-ai function the reading companion uses.
 */
(function () {
  'use strict';

  var language = ((document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en';

  var STR = {
    zh: {
      askToggle: '对这个问题继续追问 AI',
      placeholder: '针对这个问题继续追问…',
      send: '发送',
      thinking: '思考中',
      noAnswer: '（未收到回复）',
      timeout: '请求超时，请稍后重试。',
      genericError: '请求失败，请稍后重试。',
      notFound: 'AI 函数未找到，请确认 netlify dev 正在运行',
      retry: '重试',
      you: '你',
      ai: 'AI',
      chips: [
        '能举一个具体的例子吗？',
        '展开讲讲背后的原理？',
        '有没有例外或相反的情况？'
      ]
    },
    en: {
      askToggle: 'Keep asking the AI about this',
      placeholder: 'Ask a follow-up on this question…',
      send: 'Send',
      thinking: 'Thinking',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.',
      notFound: 'AI function not found. Make sure netlify dev is running.',
      retry: 'Retry',
      you: 'You',
      ai: 'AI',
      chips: [
        'Can you give a concrete example?',
        'What is the underlying principle?',
        'Any exceptions or counter-cases?'
      ]
    }
  };

  function t(key) {
    return (STR[language] && STR[language][key]) || STR.en[key] || key;
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ENDPOINT = '/.netlify/functions/article-ai';
  var MAX_INPUT = 400;
  var ARTICLE_MAX = 5500;

  /* ── Article context (same extraction the reading companion performs) ── */
  var articleTextCache = null;
  function getArticleText() {
    if (articleTextCache !== null) return articleTextCache;
    var el = document.querySelector('.post-content');
    if (!el) { articleTextCache = ''; return ''; }
    var clone = el.cloneNode(true);
    ['script', 'style', 'nav', 'aside', '.reading-companion'].forEach(function (sel) {
      clone.querySelectorAll(sel).forEach(function (n) { n.remove(); });
    });
    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > ARTICLE_MAX) {
      var head = Math.round(ARTICLE_MAX * 0.7);
      var tail = ARTICLE_MAX - head;
      text = text.slice(0, head) + ' […] ' + text.slice(text.length - tail);
    }
    articleTextCache = text;
    return text;
  }

  function getArticleTitle() {
    var el = document.querySelector('.post-single .post-title, h1.post-title');
    return el ? el.innerText.trim() : document.title;
  }

  /* ── Minimal Markdown → HTML (subset shared with reading-companion) ─── */
  function parseMarkdown(text) {
    function safeHref(url) {
      if (/^https?:\/\//i.test(url) || /^\//.test(url)) return url;
      return null;
    }
    function inline(s) {
      return s
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
          var href = safeHref(url);
          if (!href) return label;
          var ext = /^https?:\/\//i.test(href) && href.indexOf(window.location.origin) !== 0;
          return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
        })
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
    }
    var lines = text.split('\n');
    var html = '', i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var ulMatch = /^\s*[-*]\s+(.+)$/.exec(line);
      var olMatch = /^\s*\d+[.)]\s+(.+)$/.exec(line);
      if (ulMatch || olMatch) {
        var ordered = !!olMatch;
        var tag = ordered ? 'ol' : 'ul';
        html += '<' + tag + '>';
        while (i < lines.length) {
          var m = ordered ? /^\s*\d+[.)]\s+(.+)$/.exec(lines[i]) : /^\s*[-*]\s+(.+)$/.exec(lines[i]);
          if (!m) break;
          html += '<li>' + inline(m[1]) + '</li>';
          i++;
        }
        html += '</' + tag + '>';
        continue;
      }
      var h = /^#{1,3}\s+(.+)$/.exec(line);
      if (h) { html += '<p><strong>' + inline(h[1]) + '</strong></p>'; i++; continue; }
      if (line.trim() === '') { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() !== ''
             && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])
             && !/^#{1,3}\s+/.test(lines[i])) {
        para.push(inline(lines[i]));
        i++;
      }
      html += '<p>' + para.join('<br>') + '</p>';
    }
    return html;
  }

  /* ── 1. Eased <details> animation ─────────────────────────────────────
     Interception pattern: summary clicks are cancelled and the element's
     height is animated between its closed (summary-only) and open heights,
     with [open] kept in place during the close animation so content stays
     visible while it collapses. */
  function Accordion(details) {
    this.details = details;
    this.summary = details.querySelector('summary');
    this.body = details.querySelector('.article-faq__body');
    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
    var self = this;
    this.summary.addEventListener('click', function (e) { self.onClick(e); });
  }

  Accordion.prototype.onClick = function (e) {
    if (e.target.closest('a')) return;
    e.preventDefault();
    if (reduceMotion || !this.details.animate) {
      // Instant toggle keeps semantics without motion.
      var willOpen = !(this.details.open && !this.isClosing);
      this.details.open = willOpen;
      this.details.classList.toggle('article-faq__item--open', willOpen);
      return;
    }
    this.details.style.overflow = 'hidden';
    if (this.isClosing || !this.details.open) {
      this.open();
    } else if (this.isExpanding || this.details.open) {
      this.shrink();
    }
  };

  Accordion.prototype.shrink = function () {
    this.isClosing = true;
    this.details.classList.remove('article-faq__item--open');
    var startHeight = this.details.offsetHeight;
    var endHeight = this.summary.offsetHeight;
    if (this.animation) this.animation.cancel();
    this.animation = this.details.animate(
      { height: [startHeight + 'px', endHeight + 'px'] },
      { duration: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
    );
    var self = this;
    this.animation.onfinish = function () { self.onAnimationFinish(false); };
    this.animation.oncancel = function () { self.isClosing = false; };
  };

  Accordion.prototype.open = function () {
    var self = this;
    this.details.style.height = this.details.offsetHeight + 'px';
    this.details.open = true;
    window.requestAnimationFrame(function () { self.expand(); });
  };

  Accordion.prototype.expand = function () {
    this.isExpanding = true;
    var startHeight = this.details.offsetHeight;
    var endHeight = this.summary.offsetHeight + this.body.offsetHeight;
    if (this.animation) this.animation.cancel();
    this.details.classList.add('article-faq__item--open');
    this.animation = this.details.animate(
      { height: [startHeight + 'px', endHeight + 'px'] },
      { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    var self = this;
    this.animation.onfinish = function () { self.onAnimationFinish(true); };
    this.animation.oncancel = function () { self.isExpanding = false; };
  };

  Accordion.prototype.onAnimationFinish = function (open) {
    this.details.open = open;
    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
    this.details.style.height = '';
    this.details.style.overflow = '';
    if (!open) this.details.classList.remove('article-faq__item--open');
  };

  /* ── 2. Inline AI follow-up thread ────────────────────────────────────── */
  function buildAiPanel(item) {
    var body = item.querySelector('.article-faq__body');
    var qText = (item.querySelector('.article-faq__q-text') || {}).textContent || '';
    var aText = (item.querySelector('.article-faq__a') || {}).textContent || '';
    qText = qText.trim();
    aText = aText.trim();

    var wrap = document.createElement('div');
    wrap.className = 'article-faq__ai';

    /* Toggle row — quiet affordance under the answer */
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'article-faq__ai-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML =
      '<svg class="article-faq__ai-spark" viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">' +
        '<path d="M8 0l1.8 4.6L14.5 6 9.8 7.9 8 12.5 6.2 7.9 1.5 6l4.7-1.4L8 0z"/>' +
        '<path d="M13.2 10.5l.9 2.3 2.3.7-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.7.9-2.3z" opacity="0.55"/>' +
      '</svg>' +
      '<span>' + t('askToggle') + '</span>' +
      '<span class="article-faq__ai-chev" aria-hidden="true"></span>';
    wrap.appendChild(toggle);

    /* Collapsible panel (grid-rows trick animates 0fr → 1fr) */
    var panel = document.createElement('div');
    panel.className = 'article-faq__ai-panel';
    panel.setAttribute('hidden', '');
    var panelInner = document.createElement('div');
    panelInner.className = 'article-faq__ai-panel-inner';
    panel.appendChild(panelInner);

    var thread = document.createElement('div');
    thread.className = 'article-faq__ai-thread';
    panelInner.appendChild(thread);

    /* State (declared before chips so their click handler can see it) */
    var opened = false;
    var busy = false;
    var lastQuestion = '';
    // Seed the conversation with this FAQ's Q&A so follow-ups land in context.
    var history = [
      { role: 'user', content: qText },
      { role: 'assistant', content: aText }
    ];

    /* Suggestion chips, shown until the reader sends something */
    var chipsRow = document.createElement('div');
    chipsRow.className = 'article-faq__ai-chips';
    t('chips').forEach(function (text) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'article-faq__ai-chip';
      chip.textContent = text;
      chip.addEventListener('click', function () {
        if (busy) return;
        input.value = text;
        send();
      });
      chipsRow.appendChild(chip);
    });
    panelInner.appendChild(chipsRow);

    /* Composer */
    var composer = document.createElement('div');
    composer.className = 'article-faq__ai-composer';
    var input = document.createElement('textarea');
    input.className = 'article-faq__ai-input';
    input.rows = 1;
    input.maxLength = MAX_INPUT;
    input.placeholder = t('placeholder');
    input.setAttribute('aria-label', t('placeholder'));
    var sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'article-faq__ai-send';
    sendBtn.setAttribute('aria-label', t('send'));
    sendBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' +
      '</svg>';
    composer.appendChild(input);
    composer.appendChild(sendBtn);
    panelInner.appendChild(composer);

    wrap.appendChild(panel);
    body.appendChild(wrap);

    toggle.addEventListener('click', function () {
      opened = !opened;
      toggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
      wrap.classList.toggle('article-faq__ai--open', opened);
      if (opened) {
        panel.removeAttribute('hidden');
        // Next frame so the 0fr → 1fr transition actually runs.
        window.requestAnimationFrame(function () {
          panel.classList.add('article-faq__ai-panel--open');
        });
        window.setTimeout(function () { input.focus({ preventScroll: true }); }, 320);
      } else {
        panel.classList.remove('article-faq__ai-panel--open');
        var onEnd = function (e) {
          if (e.target !== panel) return;
          panel.setAttribute('hidden', '');
          panel.removeEventListener('transitionend', onEnd);
        };
        if (reduceMotion) panel.setAttribute('hidden', '');
        else panel.addEventListener('transitionend', onEnd);
      }
    });

    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 88) + 'px';
      sendBtn.classList.toggle('article-faq__ai-send--ready', this.value.trim().length > 0 && !busy);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    sendBtn.addEventListener('click', send);

    function addBubble(role, text) {
      var row = document.createElement('div');
      row.className = 'article-faq__ai-msg article-faq__ai-msg--' + role;
      var tag = document.createElement('span');
      tag.className = 'article-faq__ai-tag';
      tag.textContent = role === 'user' ? t('you') : t('ai');
      var content = document.createElement('div');
      content.className = 'article-faq__ai-msg-body';
      if (role === 'user') content.textContent = text;
      else content.innerHTML = parseMarkdown(text);
      row.appendChild(tag);
      row.appendChild(content);
      thread.appendChild(row);
      return content;
    }

    function showThinking() {
      var el = document.createElement('div');
      el.className = 'article-faq__ai-thinking';
      el.innerHTML = '<span>' + t('thinking') + '</span><i></i><i></i><i></i>';
      thread.appendChild(el);
      return el;
    }

    function createAbort(ms) {
      if (typeof AbortController === 'undefined') return { signal: undefined, cancel: function () {} };
      var controller = new AbortController();
      var id = setTimeout(function () { controller.abort(); }, ms);
      return { signal: controller.signal, cancel: function () { clearTimeout(id); } };
    }

    function setBusy(on) {
      busy = on;
      sendBtn.disabled = on;
      input.disabled = on;
      wrap.classList.toggle('article-faq__ai--busy', on);
      if (!on) sendBtn.classList.toggle('article-faq__ai-send--ready', input.value.trim().length > 0);
    }

    async function send() {
      var q = input.value.trim();
      if (!q || busy) return;
      if (q.length > MAX_INPUT) q = q.slice(0, MAX_INPUT);
      lastQuestion = q;

      // Chips are a cold-start aid; retire the row once a real turn happens.
      if (chipsRow.parentNode) {
        chipsRow.classList.add('article-faq__ai-chips--gone');
        window.setTimeout(function () { chipsRow.remove(); }, 260);
      }
      var prevError = thread.querySelector('.article-faq__ai-error');
      if (prevError) prevError.remove();

      addBubble('user', q);
      input.value = '';
      input.style.height = 'auto';
      setBusy(true);
      var thinkingEl = showThinking();
      var request = createAbort(25000);

      try {
        var res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            language: language,
            articleTitle: getArticleTitle(),
            articleContent: getArticleText(),
            pagePath: window.location.pathname,
            context: history
          }),
          signal: request.signal
        });
        request.cancel();

        if (!res.ok) {
          if (res.status === 404) throw new Error(t('notFound'));
          var errData;
          try { errData = await res.json(); } catch (_) { errData = {}; }
          throw new Error(errData.error || (t('genericError') + ' (' + res.status + ')'));
        }

        var contentType = res.headers.get('content-type') || '';
        var answer = '';

        if (contentType.indexOf('text/event-stream') !== -1 && res.body && res.body.getReader) {
          thinkingEl.remove();
          var streamBody = addBubble('ai', '');
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var buffer = '';
          sse: while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split('\n');
            buffer = lines.pop();
            for (var li = 0; li < lines.length; li++) {
              var line = lines[li];
              if (line.indexOf('data: ') !== 0) continue;
              var data = line.slice(6).trim();
              if (data === '[DONE]') break sse;
              try {
                var json = JSON.parse(data);
                var delta = json.delta || '';
                if (delta) {
                  answer += delta;
                  streamBody.innerHTML = parseMarkdown(answer);
                }
              } catch (_e) {}
            }
          }
          if (!answer) {
            answer = t('noAnswer');
            streamBody.textContent = answer;
          }
        } else {
          var payload;
          try { payload = await res.json(); } catch (_) { throw new Error(t('genericError')); }
          thinkingEl.remove();
          answer = payload.answer || t('noAnswer');
          addBubble('ai', answer);
        }

        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer });
        // Keep the seed Q&A, trim the middle when the thread gets long.
        if (history.length > 14) history = history.slice(0, 2).concat(history.slice(-10));
      } catch (err) {
        if (thinkingEl.parentNode) thinkingEl.remove();
        var msg = err && err.name === 'AbortError' ? t('timeout') : ((err && err.message) || t('genericError'));
        var errEl = document.createElement('div');
        errEl.className = 'article-faq__ai-error';
        var errText = document.createElement('span');
        errText.textContent = '⚠ ' + msg;
        var retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'article-faq__ai-retry';
        retryBtn.textContent = t('retry');
        retryBtn.addEventListener('click', function () {
          if (busy || !lastQuestion) return;
          // Remove the failed user bubble + error so the retry reads clean.
          var failedUser = errEl.previousElementSibling;
          if (failedUser && failedUser.classList.contains('article-faq__ai-msg--user')) failedUser.remove();
          errEl.remove();
          input.value = lastQuestion;
          send();
        });
        errEl.appendChild(errText);
        errEl.appendChild(retryBtn);
        thread.appendChild(errEl);
      } finally {
        setBusy(false);
      }
    }
  }

  /* ── Bootstrap ─────────────────────────────────────────────────────────── */
  function init() {
    var items = document.querySelectorAll('.article-faq__item');
    if (!items.length) return;
    items.forEach(function (item) {
      var body = item.querySelector('.article-faq__body');
      if (!body) return;
      if (item.open) item.classList.add('article-faq__item--open');
      new Accordion(item);
      buildAiPanel(item);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
