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
      thinking: '思考中',
      noAnswer: '（未收到回复）',
      timeout: '请求超时，请稍后重试。',
      genericError: '请求失败，请稍后重试。',
      notFound: 'AI 函数未找到，请确认 netlify dev 正在运行',
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
      thinking: 'Thinking',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.',
      notFound: 'AI function not found. Make sure netlify dev is running.',
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

  /* ── DOM handles ── */
  var titleEl = modal.querySelector('.tw-book-ai__title');
  var authorEl = modal.querySelector('.tw-book-ai__author');
  var threadEl = modal.querySelector('.tw-book-ai__thread');
  var chipsEl = modal.querySelector('.tw-book-ai__chips');
  var inputEl = modal.querySelector('.tw-book-ai__input');
  var sendEl = modal.querySelector('.tw-book-ai__send');
  var card = modal.querySelector('.tw-book-ai__card');

  /* ── State ── */
  var current = null;   // { title, author, note, prompts:[], context }
  var history = [];     // [{role, content}]
  var busy = false;
  var lastTrigger = null;

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
    threadEl.scrollTop = threadEl.scrollHeight;
    return body;
  }

  function showThinking() {
    var el = document.createElement('div');
    el.className = 'tw-book-ai__thinking';
    el.innerHTML = '<span></span><span></span><span></span>';
    el.setAttribute('aria-label', t('thinking'));
    threadEl.appendChild(el);
    threadEl.scrollTop = threadEl.scrollHeight;
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
    threadEl.scrollTop = threadEl.scrollHeight;
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
    if (sendEl) sendEl.disabled = v;
    if (inputEl) inputEl.disabled = v;
  }

  /* ── Abort helper ── */
  function createAbort(ms) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, ms) : null;
    return { signal: ctrl ? ctrl.signal : undefined, done: function () { if (timer) window.clearTimeout(timer); } };
  }

  /* ── Send a question, stream the answer, render follow-ups ── */
  async function send(q) {
    q = String(q || '').trim().slice(0, MAX_INPUT);
    if (!q || busy || !current) return;
    clearChips();
    addBubble('user', q);
    if (inputEl) inputEl.value = '';
    setBusy(true);
    var thinkingEl = showThinking();
    var abort = createAbort(25000);
    var answer = '';
    var pendingFollowups = null;

    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          question: q,
          language: language,
          articleTitle: current.title,
          articleContent: current.context,
          pagePath: window.location.pathname,
          context: history.slice(-10),
          wantFollowups: true
        })
      });

      if (res.status === 404) { thinkingEl.remove(); showError(t('notFound')); setBusy(false); return; }
      if (!res.ok) {
        thinkingEl.remove();
        var errText = t('genericError');
        try { var ej = await res.json(); if (ej && ej.error) errText = ej.error; } catch (_e) {}
        showError(errText, function () { send(q); });
        setBusy(false);
        return;
      }

      var contentType = res.headers.get('content-type') || '';
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
          var lns = buffer.split('\n');
          buffer = lns.pop();
          for (var li = 0; li < lns.length; li++) {
            var line = lns[li];
            if (line.indexOf('data: ') !== 0) continue;
            var data = line.slice(6).trim();
            if (data === '[DONE]') break sse;
            try {
              var json = JSON.parse(data);
              if (json.followups) { pendingFollowups = json.followups; continue; }
              var delta = json.delta || '';
              if (delta) { answer += delta; streamBody.innerHTML = parseMarkdown(answer); threadEl.scrollTop = threadEl.scrollHeight; }
            } catch (_e2) {}
          }
        }
        if (!answer) streamBody.textContent = t('noAnswer');
      } else {
        // Non-streaming fallback
        thinkingEl.remove();
        var payload = await res.json();
        answer = (payload && payload.answer) || '';
        if (payload && payload.followups) pendingFollowups = payload.followups;
        addBubble('ai', answer || t('noAnswer'));
      }

      if (answer) {
        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: answer });
      }
      if (pendingFollowups && pendingFollowups.length) renderChips(pendingFollowups);
    } catch (err) {
      thinkingEl.remove();
      showError(err && err.name === 'AbortError' ? t('timeout') : t('genericError'), function () { send(q); });
    } finally {
      abort.done();
      setBusy(false);
    }
  }

  /* ── Open / close (mirrors the QR popover in travel.html) ── */
  function openForBook(btn) {
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
    if (reduceMotion) { modal.classList.add('is-open'); }
    else { requestAnimationFrame(function () { modal.classList.add('is-open'); }); }
    btn.setAttribute('aria-expanded', 'true');
    lastTrigger = btn;
    if (inputEl) { try { inputEl.focus(); } catch (_e) {} }
  }

  function close() {
    modal.classList.remove('is-open');
    if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
    var done = function () { modal.hidden = true; modal.removeEventListener('transitionend', done); };
    if (reduceMotion) done(); else modal.addEventListener('transitionend', done);
    if (lastTrigger) { try { lastTrigger.focus(); } catch (_e) {} lastTrigger = null; }
  }

  /* ── Wire up ── */
  document.querySelectorAll('.tw-tome__ask').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () { openForBook(btn); });
  });
  modal.querySelectorAll('[data-bai-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
  if (sendEl) sendEl.addEventListener('click', function () { if (inputEl) send(inputEl.value); });
  if (inputEl) {
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inputEl.value); }
    });
  }
})();
