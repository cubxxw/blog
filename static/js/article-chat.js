/* Shared controller for the existing desktop companion and compact sheet. */
(function (global) {
  'use strict';
  var controllers = new WeakMap();
  var guide = null;
  var isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
  var T = isZh ? {
    greeting: '从文章出发，聊聊你在意的细节。', question: '你的问题', insight: '一起读懂',
    context: '关于这段文字', clear: '结束这段解读', reading: '正在读这段文字', articleReading: '正在梳理文章',
    stop: '停止生成', stopped: '已停止。', retry: '重试', error: '暂时没有得到回复，请再试一次。',
    timeout: '等待有些久了，可以重新试一次。', share: '生成分享卡', followup: '继续聊聊', related: '相关阅读'
  } : {
    greeting: 'Start with the article, and ask about a detail that matters to you.', question: 'Your question', insight: 'Reading together',
    context: 'About this passage', clear: 'Finish this passage', reading: 'Reading this passage', articleReading: 'Reading the article',
    stop: 'Stop generating', stopped: 'Stopped.', retry: 'Retry', error: 'No reply just yet. Please try again.',
    timeout: 'This is taking a while. You can try again.', share: 'Share insight', followup: 'Keep asking', related: 'Related reading'
  };
  var prompts = isZh ? [
    ['核心摘要', '用几句话聊聊这篇文章最值得记住的想法。'],
    ['精彩金句', '从文中挑几句值得重读的原话，聊聊它们为什么值得再想一想。'],
    ['关键概念', '这篇文章里有哪些容易被忽略的想法？帮我说清楚它们之间的联系。'],
    ['反方视角', '帮我挑出这篇文章里最值得质疑或反驳的观点，并给出反方视角。'],
    ['小白讲解', '如果我是第一次接触这个主题的读者，请用最简单的比喻帮我理解这篇文章。'],
    ['延伸阅读', '基于这篇文章的主题和内容，推荐 3 个延伸阅读方向或相关话题。']
  ] : [
    ['Summary', 'Talk me through the ideas in this article worth remembering.'],
    ['Highlights', 'Pick a few exact lines worth rereading and explain why.'],
    ['Key concepts', 'Which ideas are easy to miss, and how do they connect?'],
    ['Counter-argument', 'Which claims are most worth challenging?'],
    ['ELI5', 'Explain this article to a beginner using a simple analogy.'],
    ['Further reading', 'Suggest 3 directions for further reading based on this article.']
  ];
  function element(tag, cls, text) {
    var node = document.createElement(tag); node.className = cls || '';
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function sourceUrl() {
    var canonical = document.querySelector('link[rel="canonical"]');
    return canonical ? canonical.href : location.href;
  }
  function title() { var h = document.querySelector('.post-title'); return h ? h.textContent.trim() : document.title; }
  function articleText() {
    var prose = document.querySelector('.post-content');
    if (!prose) return '';
    var clone = prose.cloneNode(true);
    clone.querySelectorAll('script,style,nav,aside').forEach(function (n) { n.remove(); });
    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length > 5500 ? text.slice(0, 3300) + '\n…\n' + text.slice(-2100) : text;
  }
  function renderAiText(text) {
    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    var inCode = false;
    var plain = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (line) {
      if (/^\s*(?:```|~~~)/.test(line)) { inCode = !inCode; return ''; }
      if (inCode) return line;
      return line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s{0,3}>\s?/, '')
        .replace(/^\s{0,3}(?:[-*+]\s+|\d{1,3}[.)]\s+)/, '')
        .replace(/(^|[^A-Za-z0-9_*])\*\*([^*\n]+)\*\*(?![A-Za-z0-9_*])/g, '$1$2')
        .replace(/(^|[^A-Za-z0-9_])__([^_\n]+)__(?![A-Za-z0-9_])/g, '$1$2')
        .replace(/(^|[^A-Za-z0-9_*])\*(\S(?:[^*\n]*?\S)?)\*(?![A-Za-z0-9_*])/g, '$1$2')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '$1 ($2)');
    }).join('\n');
    return plain.split(/\n\s*\n/).filter(function (paragraph) { return paragraph.trim(); }).map(function (paragraph) {
      return '<p>' + escapeHtml(paragraph.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function clearGuide() {
    if (guide) { guide.cancel(); guide = null; }
  }
  function guidePassage(rect, target) {
    clearGuide();
    if (!rect || !target || matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 1200) return;
    var end = target.getBoundingClientRect();
    var startX = rect.right + 8, startY = (rect.top + rect.bottom) / 2;
    var endX = end.left - 6, endY = end.top + Math.min(end.height / 2, 40);
    if (![startX, startY, endX, endY].every(Number.isFinite) || startY < 60 || startY > innerHeight || endY < 60 || endY > innerHeight || end.width === 0) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.classList.add('article-selection-guide'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
    var path = document.createElementNS(ns, 'path');
    var bend = Math.max(55, Math.abs(endX - startX) * .55);
    path.setAttribute('d', 'M' + startX + ',' + startY + ' C' + (startX + bend) + ',' + (startY - 25) + ' ' + (endX - bend) + ',' + (endY - 25) + ' ' + endX + ',' + endY);
    svg.appendChild(path);
    var dot = document.createElementNS(ns, 'circle'); dot.setAttribute('r', '3'); svg.appendChild(dot);
    document.body.appendChild(svg);
    var length = path.getTotalLength(), begun = performance.now(), raf;
    path.style.strokeDasharray = String(length); path.style.strokeDashoffset = String(length);
    var local = { cancel: function () { cancelAnimationFrame(raf); svg.remove(); } };
    guide = local;
    function frame(now) {
      var progress = Math.min(1, (now - begun) / 650);
      var eased = 1 - Math.pow(1 - progress, 3);
      path.style.strokeDashoffset = String(length * (1 - eased));
      var point = path.getPointAtLength(length * eased);
      dot.setAttribute('cx', String(point.x)); dot.setAttribute('cy', String(point.y));
      svg.style.opacity = String(progress < .72 ? 1 : Math.max(0, (1 - progress) / .28));
      if (progress < 1) raf = requestAnimationFrame(frame);
      else { local.cancel(); if (guide === local) guide = null; }
    }
    raf = requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', clearGuide, { passive: true });
  window.addEventListener('resize', clearGuide);

  function init(panel, options) {
    if (!panel || controllers.has(panel)) return;
    var prefix = options.prefix, compact = prefix === 'abs';
    var select = function (suffix) { return panel.querySelector('.' + prefix + '-ai-' + suffix); };
    var messages = select('messages'), textarea = select('textarea'), sendButton = select('send');
    if (!messages || !textarea || !sendButton) return;
    var surface = select('panel') || panel;
    var scopes = Object.create(null), scopeOrder = [], general = [];
    var context = null, history = general, serial = 0, controller = null, busy = false, streamNode = null;
    var lastQuestion = '', quotedKey = '', recentError = null, lastUser = null;
    var loading = select('loading');
    if (!loading) { loading = element('div', prefix + '-ai-loading'); loading.setAttribute('role', 'status'); surface.insertBefore(loading, messages); }
    loading.hidden = true;
    if (compact && !select('chip')) {
      var quick = element('div', 'abs-ai-quick');
      prompts.forEach(function (pair) {
        var chip = element('button', 'abs-ai-chip', pair[0]); chip.type = 'button'; chip.dataset.prompt = pair[1]; quick.appendChild(chip);
      });
      surface.insertBefore(quick, messages);
    }
    if (!messages.children.length) messages.appendChild(element('div', prefix + '-ai-msg ' + prefix + '-ai-msg--ai ' + prefix + '-ai-greeting', T.greeting));
    var inputArea = select('input-area') || textarea.parentElement;
    var reference = element('div', 'article-chat-reference'); reference.hidden = true;
    reference.appendChild(element('span', 'article-chat-reference-label', T.context));
    var referenceText = element('p', 'article-chat-reference-text'); reference.appendChild(referenceText);
    var clear = element('button', 'article-chat-reference-clear', '×'); clear.type = 'button'; clear.setAttribute('aria-label', T.clear);
    reference.appendChild(clear); inputArea.insertBefore(reference, textarea);
    var stop = element('button', 'article-chat-stop', isZh ? '停止' : 'Stop');
    stop.type = 'button'; stop.setAttribute('aria-label', T.stop); stop.hidden = true; inputArea.appendChild(stop);
    function nearBottom() { return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 90; }
    function bottom() { messages.scrollTop = messages.scrollHeight; }
    function activeKey() { return context ? context.blockId + '\u0000' + context.selectedText : ''; }
    function updateBusy(on) {
      busy = on; panel.setAttribute('aria-busy', String(on)); sendButton.disabled = on; stop.hidden = !on;
      sendButton.classList.toggle(prefix + '-ai-send--empty', on || !textarea.value.trim());
      if (!on) loading.hidden = true;
    }
    function cancel() {
      serial++;
      if (controller) controller.abort(); controller = null;
      if (streamNode) { streamNode.classList.add('article-chat-stopped'); streamNode.querySelector('.' + prefix + '-ai-answer-body').textContent = T.stopped; streamNode = null; }
      updateBusy(false);
    }
    function clearContext() {
      cancel(); context = null; history = general; quotedKey = ''; reference.hidden = true;
      var intro = select('intro'), quick = select('quick'); if (intro) intro.hidden = false; if (quick) quick.hidden = false;
    }
    clear.addEventListener('click', function () { clearContext(); textarea.focus({ preventScroll: true }); });
    stop.addEventListener('click', cancel);
    function appendMessage(text, role, quote) {
      var div = element('div', prefix + '-ai-msg ' + prefix + '-ai-msg--' + role);
      if (role === 'ai') {
        var head = element('div', prefix + '-ai-answer-head');
        head.appendChild(element('span', prefix + '-ai-answer-mark', 'AI'));
        head.appendChild(element('span', prefix + '-ai-answer-title', T.insight));
        div.appendChild(head); div.appendChild(element('div', prefix + '-ai-answer-body'));
        paintReply(div, text);
      } else {
        div.appendChild(element('span', prefix + '-ai-user-label', quote ? T.context : T.question));
        if (quote) div.appendChild(element('blockquote', 'article-chat-quote', quote));
        div.appendChild(element('p', prefix + '-ai-user-text', text));
      }
      messages.appendChild(div); if (role === 'user' || nearBottom()) bottom();
      return div;
    }
    function paintReply(node, text) {
      var body = node.querySelector('.' + prefix + '-ai-answer-body');
      if (options.render) body.innerHTML = options.render(text);
      else body.innerHTML = renderAiText(text);
    }
    function shareAnswer(node, savedHistory) {
      var share = element('button', prefix + '-ai-share-btn', T.share); share.type = 'button'; share.setAttribute('aria-label', T.share);
      share.addEventListener('click', function () {
        function open() { if (global.ShareConversation) global.ShareConversation.show(savedHistory, { lang: isZh ? 'zh' : 'en', title: title(), url: sourceUrl() }); }
        if (global.ShareConversation) open(); else if (global.loadShareScripts) global.loadShareScripts(open);
      });
      node.querySelector('.' + prefix + '-ai-answer-head').appendChild(share);
    }
    function suggestions() {
      var old = messages.querySelector('.article-chat-followups'); if (old) old.remove();
      var wrap = element('div', 'article-chat-followups');
      wrap.appendChild(element('span', 'article-chat-followups-label', T.followup));
      var list = isZh ? ['能举一个具体例子吗？','有没有相反的观点？','在现实里怎么应用？'] : ['Can you give an example?','What is the counter-argument?','How does this apply in practice?'];
      list.forEach(function (question) { var btn = element('button', 'article-chat-followup', question); btn.type = 'button'; btn.addEventListener('click', function () { send(question); }); wrap.appendChild(btn); });
      messages.appendChild(wrap); if (nearBottom()) bottom();
    }
    function addSources(candidates) {
      var section = element('div', 'ai-sources');
      section.appendChild(element('span', 'ai-sources-label', T.related));
      var count = 0;
      (candidates || []).slice(0, 20).forEach(function (candidate) {
        if (!candidate || !candidate.title || !candidate.permalink || count >= 3) return;
        try {
          var url = new URL(String(candidate.permalink), sourceUrl());
          if (!/^https?:$/.test(url.protocol) || url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) return;
          var link = element('a', 'ai-source-link', String(candidate.title)); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; section.appendChild(link); count++;
        } catch (_) { /* malformed reference */ }
      });
      if (count) messages.appendChild(section);
    }
    async function send(question, keepDraft, retrying) {
      var q = typeof question === 'string' ? question.trim() : textarea.value.trim();
      if (!q || busy) return;
      q = q.slice(0, parseInt(textarea.getAttribute('maxlength'), 10) || 500);
      lastQuestion = q;
      if (recentError) { recentError.remove(); recentError = null; }
      var followups = messages.querySelector('.article-chat-followups'); if (followups) followups.remove();
      var greeting = select('greeting'); if (greeting) greeting.remove();
      var intro = select('intro'), quick = select('quick'); if (intro) intro.hidden = !!context; if (quick) quick.hidden = !!context;
      panel.classList.add(prefix + '-ai-panel--engaged');
      var selected = context, requestHistory = history, key = activeKey();
      var user = retrying && lastUser ? lastUser : appendMessage(q, 'user', selected && quotedKey !== key ? selected.selectedText : '');
      lastUser = user; quotedKey = key;
      if (!keepDraft) { textarea.value = ''; textarea.style.height = 'auto'; }
      var id = ++serial, requestController = new AbortController(); controller = requestController;
      updateBusy(true); loading.textContent = selected ? T.reading : T.articleReading; loading.hidden = false;
      var payload = { question: q, language: isZh ? 'zh' : 'en', articleTitle: title(), articleContent: articleText(), pagePath: location.pathname, context: requestHistory.slice(-10), stream: true };
      if (selected) { payload.selectedText = selected.selectedText; payload.selectionContext = selected.selectionContext; }
      function current() { return id === serial && !requestController.signal.aborted; }
      try {
        if (!global.ArticleAIClient) throw new Error('AI client unavailable');
        var result = await global.ArticleAIClient.request(payload, { signal: requestController.signal, onDelta: function (text) {
          if (!current()) return;
          loading.hidden = true;
          var follow = nearBottom();
          if (!streamNode) streamNode = appendMessage('', 'ai');
          paintReply(streamNode, text); if (follow) bottom();
        } });
        if (!current()) return;
        var answer = streamNode || appendMessage(result.answer, 'ai');
        paintReply(answer, result.answer); streamNode = null;
        requestHistory.push({ role: 'user', content: q }, { role: 'assistant', content: result.answer });
        if (requestHistory.length > 10) requestHistory.splice(0, requestHistory.length - 10);
        shareAnswer(answer, requestHistory.slice()); addSources(result.candidates); suggestions();
      } catch (err) {
        if (id !== serial || requestController.signal.aborted && (!err || err.name !== 'TimeoutError')) return;
        if (streamNode) { streamNode.remove(); streamNode = null; }
        var error = appendMessage(err && err.name === 'TimeoutError' ? T.timeout : T.error, 'ai');
        error.classList.add(prefix + '-ai-msg--error'); recentError = error;
        var retry = element('button', 'ai-retry-btn', T.retry); retry.type = 'button';
        retry.addEventListener('click', function () { if (!busy) send(lastQuestion, true, true); });
        error.appendChild(retry);
      } finally {
        if (id === serial) { controller = null; updateBusy(false); }
      }
      return user;
    }
    textarea.addEventListener('input', function () { textarea.style.height = 'auto'; textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; updateBusy(busy); });
    textarea.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); send(); }
    });
    sendButton.addEventListener('click', function () { send(); });
    panel.querySelectorAll('[data-prompt]').forEach(function (chip) {
      chip.addEventListener('click', function () { if (busy || chip.disabled) return; clearContext(); chip.disabled = true; chip.classList.add(prefix + '-ai-chip--used'); send(chip.dataset.prompt, true); });
    });
    updateBusy(false);
    function analyze(detail) {
      cancel();
      context = { selectedText: String(detail.selectedText || ''), selectionContext: String(detail.selectionContext || '').slice(0, 5600), blockId: String(detail.blockId || '') };
      if (!context.selectedText || context.selectedText.length > 6000) { clearContext(); return; }
      var key = activeKey();
      if (!scopes[key]) { scopes[key] = []; scopeOrder.push(key); if (scopeOrder.length > 24) delete scopes[scopeOrder.shift()]; }
      history = scopes[key];
      referenceText.textContent = context.selectedText; reference.hidden = false;
      if (compact) {
        var fab = document.getElementById('article-fab'); var sheet = document.getElementById('article-bottom-sheet');
        if (fab && sheet && !sheet.classList.contains('abs--open')) fab.click();
        var tab = document.getElementById('abs-tab-ai') || document.querySelector('.abs-tab[data-tab="ai"]'); if (tab) tab.click();
      } else {
        var tab = document.getElementById('rc-tab-ai'); if (tab) tab.click();
      }
      var pending = send(detail.question || (isZh ? '结合这篇文章，帮我理解这段话。' : 'Explain this passage in the context of the article.'), true);
      var quotes = messages.querySelectorAll('.article-chat-quote');
      var quote = quotes.length ? quotes[quotes.length - 1] : reference;
      requestAnimationFrame(function () {
        var bounds = quote.getBoundingClientRect();
        guidePassage(detail.sourceRect, bounds.bottom > 60 && bounds.top < innerHeight ? quote : reference);
      });
      return pending;
    }
    document.addEventListener('article:selection-analyze', function (event) {
      if ((innerWidth < 1200) !== compact) return;
      analyze(event.detail || {});
    });
    window.addEventListener('resize', function () {
      if (busy && (innerWidth < 1200) !== compact) cancel();
    });
    if (compact) {
      var sheet = document.getElementById('article-bottom-sheet');
      if (sheet) new MutationObserver(function () { if (!sheet.classList.contains('abs--open') && busy) cancel(); }).observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
    controllers.set(panel, { cancel: cancel });
  }
  global.ArticleChat = { init: init };
})(window);
