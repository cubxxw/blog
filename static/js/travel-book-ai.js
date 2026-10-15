/*
 * travel-book-ai.js — "Ask AI about this book" panel for the /travel/ bookshelf.
 *
 * A single reused modal (#tw-book-ai). Clicking a book's ".tw-tome__ask" button
 * loads that book's context (title / author / my note / seed prompts), resets the
 * conversation and opens the modal. Questions stream from the same
 * /.netlify/functions/article-ai function the article pages use, with
 * wantFollowups:true so the backend appends "go deeper into this book"
 * follow-up chips after each answer.
 *
 * Reuses the streaming + Markdown patterns from static/js/article-faq.js and the
 * open/close interaction from the QR popover in layouts/page/travel.html.
 */
(function () {
  'use strict';

  var modal = document.getElementById('tw-book-ai');
  if (!modal) return;

  var language = (modal.getAttribute('data-lang') || 'zh').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ENDPOINT = '/.netlify/functions/article-ai';
  var MAX_INPUT = 400;

  var STR = {
    zh: {
      placeholder: '追问这本书…',
      send: '发送',
      stop: '停止生成',
      stopped: '已停止生成，可以修改问题后重试。',
      thinking: '思考中',
      noAnswer: '（未收到回复）',
      timeout: '请求超时，请稍后重试。',
      genericError: '请求失败，请稍后重试。',
      notFound: 'AI 暂时无法使用，请稍后重试。',
      you: '你',
      ai: 'AI',
      retry: '重试',
      cardIntro: '这是一本书，读者正在问关于这本书的内容，请以熟悉本书的读者身份回答。',
      cardTitle: '书名',
      cardAuthor: '作者',
      cardNote: '我（博主）的读书笔记',
      cardGuard: '若书中细节你不确定，说明这是你的理解或书外背景，不要编造情节、引文或数据。'
    },
    en: {
      placeholder: 'Ask more about this book…',
      send: 'Send',
      stop: 'Stop generating',
      stopped: 'Generation stopped. Edit your question to try again.',
      thinking: 'Thinking',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.',
      notFound: 'AI is unavailable. Please try again later.',
      you: 'You',
      ai: 'AI',
      retry: 'Retry',
      cardIntro: 'This is a book. The reader is asking about its content — answer as someone who knows this book well.',
      cardTitle: 'Title',
      cardAuthor: 'Author',
      cardNote: "The blogger's reading note",
      cardGuard: "If you're unsure of a detail, say it's your interpretation or outside context — never invent plot, quotes or figures."
    }
  };
  function t(key) { return (STR[language] && STR[language][key]) || STR.en[key] || key; }

  /* ── Minimal Markdown → HTML (subset shared with article-faq.js) ── */
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

  /* ── DOM handles ── */
  var titleEl = modal.querySelector('.tw-book-ai__title');
  var authorEl = modal.querySelector('.tw-book-ai__author');
  var threadEl = modal.querySelector('.tw-book-ai__thread');
  var conversationEl = modal.querySelector('.tw-book-ai__conversation');
  var chipsEl = modal.querySelector('.tw-book-ai__chips');
  var inputEl = modal.querySelector('.tw-book-ai__input');
  var sendEl = modal.querySelector('.tw-book-ai__send');
  var card = modal.querySelector('.tw-book-ai__card');

  /* ── State ── */
  var current = null;   // { title, author, note, prompts:[], context }
  var history = [];     // [{role, content}]
  var busy = false;
  var lastTrigger = null;
  var requestSerial = 0, activeRequest = null, viewSerial = 0, hideTimer = 0, previousOverflow = '', closing = false, hideDone = null;
  var sendIcon = sendEl ? sendEl.innerHTML : '';
  if (inputEl) inputEl.setAttribute('aria-label', t('placeholder'));

  function buildBookContext(title, author, note) {
    var lines = [t('cardIntro'), t('cardTitle') + '：' + title];
    if (author) lines.push(t('cardAuthor') + '：' + author);
    if (note) lines.push(t('cardNote') + '：' + note);
    lines.push(t('cardGuard'));
    return lines.join('\n');
  }

  /* ── Bubbles ── */
  function addBubble(role, text) {
    var msg = document.createElement('div');
    msg.className = 'tw-book-ai__msg tw-book-ai__msg--' + role;
    var tag = document.createElement('span');
    tag.className = 'tw-book-ai__tag';
    tag.textContent = role === 'user' ? t('you') : t('ai');
    var body = document.createElement('div');
    body.className = 'tw-book-ai__msg-body';
    if (role === 'user') { body.textContent = text; } else { body.innerHTML = parseMarkdown(text || ''); }
    msg.appendChild(tag);
    msg.appendChild(body);
    threadEl.appendChild(msg);
    conversationEl.scrollTop = conversationEl.scrollHeight;
    return body;
  }

  function showThinking() {
    var el = document.createElement('div');
    el.className = 'tw-book-ai__thinking';
    el.innerHTML = '<span></span><span></span><span></span>';
    el.setAttribute('aria-label', t('thinking'));
    threadEl.appendChild(el);
    conversationEl.scrollTop = conversationEl.scrollHeight;
    return el;
  }

  function showError(text, retryFn) {
    var el = document.createElement('div');
    el.className = 'tw-book-ai__error';
    var span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (retryFn) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tw-book-ai__retry';
      btn.textContent = t('retry');
      btn.addEventListener('click', function () { el.remove(); retryFn(); });
      el.appendChild(btn);
    }
    threadEl.appendChild(el);
    conversationEl.scrollTop = conversationEl.scrollHeight;
  }

  /* ── Chips (seed prompts AND follow-ups share this — both {label,msg}) ── */
  function renderChips(list) {
    chipsEl.innerHTML = '';
    if (!list || !list.length) { chipsEl.hidden = true; return; }
    chipsEl.hidden = false;
    list.forEach(function (item) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tw-book-ai__chip';
      chip.textContent = item.label;
      chip.addEventListener('click', function () {
        if (busy) return;
        send(item.msg);
      });
      chipsEl.appendChild(chip);
    });
  }

  function clearChips() { chipsEl.innerHTML = ''; chipsEl.hidden = true; }

  function setBusy(v) {
    busy = v;
    modal.setAttribute('aria-busy', String(v));
    if (sendEl) {
      sendEl.disabled = false;
      sendEl.setAttribute('aria-label', t(v ? 'stop' : 'send'));
      sendEl.innerHTML = v ? '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/></svg>' : sendIcon;
    }
    if (inputEl) inputEl.disabled = v;
  }

  function cancelRequest(restore) {
    requestSerial++;
    var previous = activeRequest;
    activeRequest = null;
    if (previous) {
      previous.controller.abort();
      previous.thinking.remove();
      if (restore && inputEl && !inputEl.value) inputEl.value = previous.question;
      if (restore) {
        var note = document.createElement('p');
        note.className = 'tw-book-ai__error';
        note.setAttribute('role', 'status');
        note.textContent = t('stopped');
        threadEl.appendChild(note);
      }
    }
    setBusy(false);
  }

  /* Each book owns one request. Late chunks cannot enter a different book. */
  async function send(q) {
    q = String(q || '').trim().slice(0, MAX_INPUT);
    if (!q || busy || !current || closing) return;
    clearChips();
    addBubble('user', q);
    if (inputEl) inputEl.value = '';
    setBusy(true);
    var thinkingEl = showThinking();
    var controller = new AbortController(), serial = ++requestSerial;
    var streamBody = null;
    activeRequest = {controller: controller, question: q, thinking: thinkingEl};
    var book = current;
    function valid() {return serial === requestSerial && !controller.signal.aborted && !modal.hidden;}
    try {
      if (!window.ArticleAIClient) throw new Error(t('genericError'));
      var result = await window.ArticleAIClient.request({
        question: q, language: language, articleTitle: book.title,
        articleContent: book.context, pagePath: window.location.pathname,
        context: history.slice(-10), wantFollowups: true
      }, {signal: controller.signal, timeoutMs: 25000, onDelta: function (answer) {
        if (!valid()) return;
        thinkingEl.remove();
        if (!streamBody) streamBody = addBubble('ai', '');
        streamBody.innerHTML = parseMarkdown(answer);
        conversationEl.scrollTop = conversationEl.scrollHeight;
      }});
      if (!valid()) return;
      thinkingEl.remove();
      if (streamBody) streamBody.innerHTML = parseMarkdown(result.answer);
      else addBubble('ai', result.answer);
      history.push({role: 'user', content: q}, {role: 'assistant', content: result.answer});
      if (result.followups) renderChips(result.followups);
    } catch (err) {
      if (!valid()) return;
      thinkingEl.remove();
      showError(err && err.name === 'TimeoutError' ? t('timeout') : t('genericError'), function () {send(q);});
      if (inputEl && !inputEl.value) inputEl.value = q;
    } finally {
      if (serial === requestSerial) {activeRequest = null; setBusy(false);}
    }
  }

  /* ── Open / close (mirrors the QR popover in travel.html) ── */
  function openForBook(btn) {
    cancelRequest(false);
    closing = false;
    card.inert = false;
    var view = ++viewSerial;
    window.clearTimeout(hideTimer);
    if (hideDone) {modal.removeEventListener('transitionend', hideDone); hideDone = null;}
    modal.querySelector('.tw-book-ai__x').disabled = false;
    if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
    var d = btn.dataset;
    var prompts = [];
    try { prompts = JSON.parse(d.bookPrompts || '[]') || []; } catch (_e) { prompts = []; }
    current = {
      title: d.bookTitle || '',
      author: d.bookAuthor || '',
      note: d.bookNote || '',
      prompts: prompts,
      context: buildBookContext(d.bookTitle || '', d.bookAuthor || '', d.bookNote || '')
    };
    history = [];
    threadEl.innerHTML = '';
    if (titleEl) titleEl.textContent = current.title;
    if (authorEl) authorEl.textContent = current.author;
    renderChips(prompts.map(function (p) { return { label: p, msg: p }; }));
    if (inputEl) { inputEl.value = ''; inputEl.disabled = false; }
    if (sendEl) sendEl.disabled = false;
    busy = false;

    modal.hidden = false;
    if (!modal.open) {
      previousOverflow = document.body.style.overflow;
      modal.showModal();
    }
    conversationEl.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    if (reduceMotion) { modal.classList.add('is-open'); }
    else { requestAnimationFrame(function () { if (view === viewSerial && !modal.hidden) modal.classList.add('is-open'); }); }
    btn.setAttribute('aria-expanded', 'true');
    lastTrigger = btn;
    if (inputEl) { try { inputEl.focus(); } catch (_e) {} }
  }

  function close() {
    if (closing || modal.hidden) return;
    closing = true;
    cancelRequest(false);
    card.inert = true;
    modal.querySelector('.tw-book-ai__x').disabled = true;
    var view = ++viewSerial;
    modal.classList.remove('is-open');
    if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
    var returnTo = lastTrigger;
    lastTrigger = null;
    var done = function (event) {
      if (event && event.target !== modal) return;
      if (view !== viewSerial) return;
      modal.removeEventListener('transitionend', done);
      window.clearTimeout(hideTimer); hideDone = null;
      if (modal.open) modal.close();
      modal.hidden = true;
      closing = false;
      document.body.style.overflow = previousOverflow;
      if (returnTo && returnTo.isConnected) returnTo.focus({preventScroll: true});
    };
    window.clearTimeout(hideTimer);
    if (reduceMotion) done();
    else {hideDone = done; modal.addEventListener('transitionend', done); hideTimer = window.setTimeout(done, 220);}
  }

  window.addEventListener('pagehide', function () {cancelRequest(false);});

  /* ── Wire up ── */
  document.querySelectorAll('.tw-tome__ask').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () { openForBook(btn); });
  });
  modal.querySelectorAll('[data-bai-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && modal.open && !closing) {
      var stops = Array.prototype.filter.call(card.querySelectorAll('button, a[href], input, textarea, select, [tabindex]'), function (node) {
        return !node.disabled && node.tabIndex >= 0 && node.getClientRects().length && window.getComputedStyle(node).visibility === 'visible';
      });
      if (!stops.length) {e.preventDefault(); modal.tabIndex = -1; modal.focus(); return;}
      var first = stops[0], last = stops[stops.length - 1], active = document.activeElement;
      if (e.shiftKey && (active === first || active === modal || active === document.body)) {e.preventDefault(); last.focus();}
      else if (!e.shiftKey && (active === last || active === modal || active === document.body)) {e.preventDefault(); first.focus();}
    }
    if (e.key === 'Escape' && !e.isComposing && e.keyCode !== 229 && !modal.hidden) {e.preventDefault(); close();}
  });
  modal.addEventListener('cancel', function (e) {e.preventDefault(); close();});
  if (sendEl) sendEl.addEventListener('click', function () { if (busy) cancelRequest(true); else if (inputEl) send(inputEl.value); });
  if (inputEl) {
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(inputEl.value); }
    });
  }
})();
