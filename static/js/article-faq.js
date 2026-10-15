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
      stop: '停止生成',
      stopped: '已停止生成，可以修改问题后重试。',
      thinking: '思考中',
      noAnswer: '（未收到回复）',
      timeout: '请求超时，请稍后重试。',
      genericError: '请求失败，请稍后重试。',
      notFound: 'AI 暂时无法使用，请稍后重试。',
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
      stop: 'Stop generating',
      stopped: 'Generation stopped. Edit your question to try again.',
      thinking: 'Thinking',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.',
      notFound: 'AI is unavailable. Please try again later.',
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

  var motionPreference = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var motionListeners = [];
  function prefersReducedMotion() { return Boolean(motionPreference && motionPreference.matches); }
  function onMotionPreferenceChange() {
    if (prefersReducedMotion()) motionListeners.forEach(function (settle) { settle(); });
  }
  if (motionPreference) {
    if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionPreferenceChange);
    else if (motionPreference.addListener) motionPreference.addListener(onMotionPreferenceChange);
  }
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
      if (!/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url)) return null;
      try { new URL(url, window.location.origin); return url; } catch (_) { return null; }
    }
    function inline(s) {
      return s
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
          var href = safeHref(url);
          if (!href) return label;
          var ext = /^https?:\/\//i.test(href) && new URL(href).origin !== window.location.origin;
          return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
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
    this.frame = 0;
    this.targetOpen = details.open;
    this.isClosing = false;
    this.isExpanding = false;
    var self = this;
    this.summary.addEventListener('click', function (e) { self.onClick(e); });
    motionListeners.push(function () {
      if (self.animation || self.frame) self.onAnimationFinish(self.targetOpen);
    });
  }

  Accordion.prototype.cancelAnimation = function () {
    if (this.frame) { window.cancelAnimationFrame(this.frame); this.frame = 0; }
    if (!this.animation) return;
    var animation = this.animation;
    this.animation = null;
    animation.onfinish = null;
    animation.oncancel = null;
    animation.cancel();
  };

  Accordion.prototype.onClick = function (e) {
    if (e.target.closest('a')) return;
    e.preventDefault();
    if (prefersReducedMotion() || !this.details.animate) {
      // Instant toggle keeps semantics without motion.
      var willOpen = !(this.details.open && !this.isClosing);
      this.onAnimationFinish(willOpen);
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
    var startHeight = this.details.offsetHeight;
    this.cancelAnimation();
    this.targetOpen = false;
    this.isClosing = true;
    this.isExpanding = false;
    this.details.classList.remove('article-faq__item--open');
    var endHeight = this.summary.offsetHeight;
    this.animation = this.details.animate(
      { height: [startHeight + 'px', endHeight + 'px'] },
      { duration: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
    );
    var self = this;
    this.animation.onfinish = function () { self.onAnimationFinish(false); };
  };

  Accordion.prototype.open = function () {
    var self = this;
    var startHeight = this.details.offsetHeight;
    this.cancelAnimation();
    this.targetOpen = true;
    this.isClosing = false;
    this.isExpanding = true;
    this.details.style.height = startHeight + 'px';
    this.details.open = true;
    this.frame = window.requestAnimationFrame(function () {
      self.frame = 0;
      if (prefersReducedMotion()) self.onAnimationFinish(true);
      else self.expand();
    });
  };

  Accordion.prototype.expand = function () {
    this.isExpanding = true;
    var startHeight = this.details.offsetHeight;
    var endHeight = this.summary.offsetHeight + this.body.offsetHeight;
    this.cancelAnimation();
    this.details.classList.add('article-faq__item--open');
    this.animation = this.details.animate(
      { height: [startHeight + 'px', endHeight + 'px'] },
      { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    var self = this;
    this.animation.onfinish = function () { self.onAnimationFinish(true); };
  };

  Accordion.prototype.onAnimationFinish = function (open) {
    this.cancelAnimation();
    this.targetOpen = open;
    this.details.open = open;
    this.isClosing = false;
    this.isExpanding = false;
    this.details.style.height = '';
    this.details.style.overflow = '';
    this.details.classList.toggle('article-faq__item--open', open);
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
    var requestSerial = 0, activeRequest = null, panelSerial = 0, hideTimer = 0, focusTimer = 0;
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
    var sendIcon = sendBtn.innerHTML;
    composer.appendChild(input);
    composer.appendChild(sendBtn);
    panelInner.appendChild(composer);

    wrap.appendChild(panel);
    body.appendChild(wrap);

    function focusInput(view) {
      if (opened && item.open && view === panelSerial && !document.hidden && document.activeElement === toggle && !input.disabled) input.focus({preventScroll: true});
    }
    motionListeners.push(function () {
      window.clearTimeout(hideTimer);
      if (!opened) panel.setAttribute('hidden', '');
      else panel.classList.add('article-faq__ai-panel--open');
      if (focusTimer) {
        window.clearTimeout(focusTimer); focusTimer = 0;
        focusInput(panelSerial);
      }
    });

    toggle.addEventListener('click', function () {
      opened = !opened;
      var view = ++panelSerial;
      window.clearTimeout(hideTimer);
      window.clearTimeout(focusTimer); focusTimer = 0;
      toggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
      wrap.classList.toggle('article-faq__ai--open', opened);
      if (opened) {
        panel.removeAttribute('hidden');
        window.requestAnimationFrame(function () {
          if (opened && view === panelSerial) panel.classList.add('article-faq__ai-panel--open');
        });
        focusTimer = window.setTimeout(function () {
          focusTimer = 0; focusInput(view);
        }, prefersReducedMotion() ? 0 : 320);
      } else {
        cancelRequest(true);
        panel.classList.remove('article-faq__ai-panel--open');
        var hide = function () {if (!opened && view === panelSerial) panel.setAttribute('hidden', '');};
        if (prefersReducedMotion()) hide(); else hideTimer = window.setTimeout(hide, 250);
      }
    });

    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 88) + 'px';
      sendBtn.classList.toggle('article-faq__ai-send--ready', this.value.trim().length > 0 && !busy);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        send();
      }
    });
    sendBtn.addEventListener('click', function () {if (busy) cancelRequest(true); else send();});

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

    function setBusy(on) {
      busy = on;
      sendBtn.disabled = false;
      sendBtn.setAttribute('aria-label', t(on ? 'stop' : 'send'));
      sendBtn.innerHTML = on ? '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/></svg>' : sendIcon;
      input.disabled = on;
      wrap.setAttribute('aria-busy', String(on));
      wrap.classList.toggle('article-faq__ai--busy', on);
      if (!on) sendBtn.classList.toggle('article-faq__ai-send--ready', input.value.trim().length > 0);
    }
    function cancelRequest(restore) {
      requestSerial++;
      var previous = activeRequest; activeRequest = null;
      if (previous) {
        previous.controller.abort(); previous.thinking.remove();
        if (restore && !input.value) input.value = previous.question;
        if (restore) {
          var note = document.createElement('p'); note.className = 'article-faq__ai-error';
          note.setAttribute('role', 'status'); note.textContent = t('stopped'); thread.appendChild(note);
        }
      }
      setBusy(false);
    }
    async function send() {
      var q = input.value.trim().slice(0, MAX_INPUT);
      if (!q || busy || !opened) return;
      lastQuestion = q;
      if (chipsRow.parentNode) chipsRow.remove();
      var prevError = thread.querySelector('.article-faq__ai-error'); if (prevError) prevError.remove();
      addBubble('user', q); input.value = ''; input.style.height = 'auto'; setBusy(true);
      var thinkingEl = showThinking(), streamBody = null;
      var controller = new AbortController(), serial = ++requestSerial;
      activeRequest = {controller: controller, question: q, thinking: thinkingEl};
      function valid() {return serial === requestSerial && !controller.signal.aborted && opened;}
      try {
        if (!window.ArticleAIClient) throw new Error(t('genericError'));
        var result = await window.ArticleAIClient.request({
          question: q, language: language, articleTitle: getArticleTitle(),
          articleContent: getArticleText(), pagePath: window.location.pathname, context: history
        }, {signal: controller.signal, timeoutMs: 25000, onDelta: function (answer) {
          if (!valid()) return;
          thinkingEl.remove(); if (!streamBody) streamBody = addBubble('ai', '');
          streamBody.innerHTML = parseMarkdown(answer);
        }});
        if (!valid()) return;
        thinkingEl.remove();
        if (streamBody) streamBody.innerHTML = parseMarkdown(result.answer); else addBubble('ai', result.answer);
        history.push({role: 'user', content: q}, {role: 'assistant', content: result.answer});
        if (history.length > 14) history = history.slice(0, 2).concat(history.slice(-10));
      } catch (err) {
        if (!valid()) return;
        thinkingEl.remove();
        if (!input.value) input.value = q;
        var errEl = document.createElement('div'); errEl.className = 'article-faq__ai-error'; errEl.setAttribute('role', 'status');
        var errText = document.createElement('span'); errText.textContent = err && err.name === 'TimeoutError' ? t('timeout') : t('genericError');
        var retryBtn = document.createElement('button'); retryBtn.type = 'button'; retryBtn.className = 'article-faq__ai-retry'; retryBtn.textContent = t('retry');
        retryBtn.addEventListener('click', function () {if (busy || !lastQuestion) return; errEl.remove(); input.value = lastQuestion; send();});
        errEl.appendChild(errText); errEl.appendChild(retryBtn); thread.appendChild(errEl);
      } finally {
        if (serial === requestSerial) {activeRequest = null; setBusy(false);}
      }
    }
    window.addEventListener('pagehide', function () {window.clearTimeout(focusTimer); focusTimer = 0; cancelRequest(false);});
    item.addEventListener('toggle', function () {if (!item.open) cancelRequest(true);});

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
