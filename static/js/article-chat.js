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
    if (!panel) return;
    panel = panel.matches('[data-article-chat]') ? panel : panel.querySelector('[data-article-chat]');
    if (!panel) return;
    if (controllers.has(panel)) return controllers.get(panel);
    options = options || {};
    var prefix = 'rc';
    var desktopHost = document.getElementById('rc-panel-ai'), compactHost = document.getElementById('abs-panel-ai');
    var persistent = matchMedia('(min-width: 1200px)');
    function compact() { return panel.parentElement === compactHost; }
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
    if (!messages.children.length) messages.appendChild(element('div', prefix + '-ai-msg ' + prefix + '-ai-msg--ai ' + prefix + '-ai-greeting', T.greeting));
    var inputArea = select('input-area') || textarea.parentElement;
    var reference = element('div', 'article-chat-reference'); reference.hidden = true;
    reference.appendChild(element('span', 'article-chat-reference-label', T.context));
    var referenceText = element('p', 'article-chat-reference-text'); reference.appendChild(referenceText);
    var clear = element('button', 'article-chat-reference-clear', '×'); clear.type = 'button'; clear.setAttribute('aria-label', T.clear);
    reference.appendChild(clear); inputArea.insertBefore(reference, textarea);
    var stop = element('button', 'article-chat-stop', isZh ? '停止' : 'Stop');
    stop.type = 'button'; stop.setAttribute('aria-label', T.stop); stop.hidden = true; inputArea.appendChild(stop);
    var following = true, readingAnchor = null, moving = false, layoutSerial = 0, readingIntent = 0, anchorIntent = 0, ownedScrollTop = null;
    var focusOwned = false, lastOwnedControl = null, lastFocused = document.activeElement, focusIntent = 0;
    function nearBottom() { return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 90; }
    function scrollMessages(top) { messages.scrollTop = top; ownedScrollTop = messages.scrollTop; }
    function bottom() { following = true; readingAnchor = null; scrollMessages(messages.scrollHeight); }
    function captureReadingAnchor() {
      var view = messages.getBoundingClientRect();
      if (!view.height) return null;
      var paragraphs = messages.querySelectorAll('.rc-ai-answer-body p, .rc-ai-user-text');
      var preferred = Array.prototype.find.call(paragraphs, function (node) {
        var r = node.getBoundingClientRect(); return r.top >= view.top + 1 && r.bottom <= view.bottom - 1;
      });
      var walker = document.createTreeWalker(messages, NodeFilter.SHOW_TEXT), node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim() || preferred && !preferred.contains(node)) continue;
        var body = node.parentElement.closest('.rc-ai-answer-body, .rc-ai-user-text');
        if (!body) continue;
        var range = document.createRange(); range.selectNodeContents(node);
        var r = range.getBoundingClientRect();
        if (r.bottom <= view.top || r.top >= view.bottom) continue;
        var offset = 0;
        if (!preferred) {
          var lo = 0, hi = node.textContent.length - 1;
          while (lo < hi) {
            var mid = (lo + hi) >> 1; range.setStart(node, mid); range.setEnd(node, mid + 1);
            if (range.getBoundingClientRect().bottom <= view.top + 1) lo = mid + 1; else hi = mid;
          }
          offset = lo;
        }
        range.setStart(node, offset); range.setEnd(node, offset + 1);
        var prefixRange = document.createRange(); prefixRange.selectNodeContents(body); prefixRange.setEnd(node, offset);
        return {body:body, offset:prefixRange.toString().length, top:range.getBoundingClientRect().top - view.top};
      }
      return null;
    }
    function currentReadingAnchor() {
      if (readingAnchor && readingAnchor.body.isConnected && anchorIntent === readingIntent) return readingAnchor;
      var anchor = captureReadingAnchor();
      if (anchor) { readingAnchor = anchor; anchorIntent = readingIntent; }
      return anchor || readingAnchor;
    }
    function restoreReadingAnchor(anchor) {
      if (!anchor || !anchor.body.isConnected || !messages.getBoundingClientRect().height) return;
      var walker = document.createTreeWalker(anchor.body, NodeFilter.SHOW_TEXT), node, remaining = anchor.offset;
      while ((node = walker.nextNode())) {
        if (remaining >= node.textContent.length) { remaining -= node.textContent.length; continue; }
        var range = document.createRange(); range.setStart(node, remaining); range.setEnd(node, remaining + 1);
        scrollMessages(messages.scrollTop + range.getBoundingClientRect().top - messages.getBoundingClientRect().top - anchor.top);
        readingAnchor = anchor; anchorIntent = readingIntent; return;
      }
    }
    messages.addEventListener('scroll', function () {
      if (moving || !messages.getBoundingClientRect().height) return;
      // Layout restoration is not a new reading position, even when its scroll event arrives after the frame.
      if (ownedScrollTop !== null && Math.abs(messages.scrollTop - ownedScrollTop) < 1) return;
      ownedScrollTop = null; readingIntent++;
      following = nearBottom();
      readingAnchor = following ? null : captureReadingAnchor(); anchorIntent = readingIntent;
    }, {passive:true});
    function newReadingIntent() { readingIntent++; ownedScrollTop = null; }
    messages.addEventListener('wheel', function (event) {
      if (event.deltaY) newReadingIntent();
      if (event.deltaY < 0) following = false;
    }, {passive:true});
    messages.addEventListener('touchmove', newReadingIntent, {passive:true});
    messages.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,button,[contenteditable]')) return;
      if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].indexOf(event.key) !== -1) newReadingIntent();
    });
    function visible(node) {
      return node && node.isConnected && !node.disabled && node.getClientRects().length && !node.closest('[hidden],[inert]') && getComputedStyle(node).visibility !== 'hidden';
    }
    function beforeUnavailable(control) {
      if (focusOwned && control.contains(document.activeElement) && visible(textarea)) textarea.focus({preventScroll:true});
    }
    function showAi() {
      if (compact()) {
        if (global.ArticleSheet) global.ArticleSheet.open('ai', {focus:false, opener:document.getElementById('article-fab')});
      } else {
        var tab = document.getElementById('rc-tab-ai'); if (tab) tab.click();
      }
    }
    function restoreLayoutReading(anchor, readIntent, id) {
      if (following) bottom(); else restoreReadingAnchor(anchor);
      requestAnimationFrame(function () { if (id === layoutSerial) { moving = false; if (!following && readIntent === readingIntent) restoreReadingAnchor(anchor); } });
    }
    function routeLayout() {
      var destination = persistent.matches ? desktopHost : compactHost;
      if (!destination || !persistent.matches && !global.ArticleSheet) return;
      panel.dataset.chatReady = 'true';
      if (panel.parentElement === destination) {
        if (!messages.getBoundingClientRect().height) return;
        var reflowAnchor = following ? null : currentReadingAnchor();
        moving = true; restoreLayoutReading(reflowAnchor, readingIntent, ++layoutSerial);
        return;
      }
      var oldHost = panel.parentElement, active = document.activeElement;
      var wanted = focusOwned && panel.contains(lastOwnedControl) ? lastOwnedControl : null;
      var previous = active !== document.body ? active : lastFocused;
      var intent = focusIntent, id = ++layoutSerial;
      var selection = {start:textarea.selectionStart, end:textarea.selectionEnd, direction:textarea.selectionDirection, scroll:textarea.scrollTop};
      var scroll = messages.scrollTop, anchor = following ? null : currentReadingAnchor(), readIntent = readingIntent;
      moving = true;
      destination.appendChild(panel);
      if (wanted) showAi();
      if (persistent.matches && global.ArticleSheet) global.ArticleSheet.closeForLayout();
      if (wanted && !visible(wanted)) wanted = visible(textarea) ? textarea : visible(stop) ? stop : null;
      if (wanted && intent === focusIntent && visible(wanted)) {
        wanted.focus({preventScroll:true});
        if (wanted === textarea) { textarea.setSelectionRange(selection.start, selection.end, selection.direction); textarea.scrollTop = selection.scroll; }
      } else if (previous && oldHost && oldHost.closest('.article-tools, #article-bottom-sheet') && (oldHost.closest('.article-tools, #article-bottom-sheet').contains(previous) || previous.id === 'article-fab') && !visible(previous)) {
        var replacement;
        if (persistent.matches) {
          var oldTab = previous.closest('[data-tab]'), oldPanel = previous.closest('.abs-panel');
          var name = oldTab ? oldTab.dataset.tab : oldPanel ? oldPanel.id.replace('abs-panel-', '') : 'toc';
          replacement = document.getElementById('rc-tab-' + name) || document.getElementById('rc-tab-toc');
          if (name !== 'ai' && replacement) replacement.click();
        } else replacement = document.getElementById('article-fab');
        if (visible(replacement)) { replacement.focus({preventScroll:true}); lastFocused = replacement; }
      }
      if (!following) scrollMessages(scroll);
      restoreLayoutReading(anchor, readIntent, id);
    }
    panel.addEventListener('focusin', function (event) { lastOwnedControl = event.target; focusOwned = true; lastFocused = event.target; });
    panel.addEventListener('focusout', function (event) {
      if (moving || panel.contains(event.relatedTarget)) return;
      if (!event.relatedTarget && (panel.parentElement === desktopHost) !== persistent.matches) return;
      focusOwned = false;
    });
    document.addEventListener('focusin', function (event) {
      if (moving || panel.contains(event.target)) return;
      lastFocused = event.target; focusOwned = false; focusIntent++;
    });
    function interaction(event) {
      if (panel.contains(event.target)) { focusOwned = true; if (panel.contains(document.activeElement)) lastOwnedControl = document.activeElement; }
      else { focusOwned = false; focusIntent++; if (event.type === 'pointerdown') lastFocused = null; }
    }
    document.addEventListener('pointerdown', interaction, {passive:true});
    document.addEventListener('wheel', interaction, {passive:true});
    panel.addEventListener('keydown', interaction);
    document.addEventListener('article:tools-layout', routeLayout);
    document.addEventListener('article:sheet-ready', routeLayout);
    global.addEventListener('resize', routeLayout);
    document.addEventListener('article:sheet-close', function (event) {
      if (event.detail && event.detail.reason === 'user' && compact() && busy) cancel();
    });
    function activeKey() { return context ? context.blockId + '\u0000' + context.selectedText : ''; }
    function updateBusy(on) {
      beforeUnavailable(on ? sendButton : stop);
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
      messages.appendChild(div); if (role === 'user' || following) bottom();
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
      messages.appendChild(wrap); if (following) bottom();
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
          var anchor = following ? null : currentReadingAnchor();
          if (!streamNode) streamNode = appendMessage('', 'ai');
          paintReply(streamNode, text); if (following) bottom(); else restoreReadingAnchor(anchor);
        } });
        if (!current()) return;
        var anchor = following ? null : currentReadingAnchor();
        var answer = streamNode || appendMessage(result.answer, 'ai');
        paintReply(answer, result.answer); streamNode = null;
        requestHistory.push({ role: 'user', content: q }, { role: 'assistant', content: result.answer });
        if (requestHistory.length > 10) requestHistory.splice(0, requestHistory.length - 10);
        shareAnswer(answer, requestHistory.slice()); addSources(result.candidates); suggestions();
        if (!following) restoreReadingAnchor(anchor);
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
      chip.addEventListener('click', function () { if (busy || chip.disabled) return; clearContext(); beforeUnavailable(chip); chip.disabled = true; chip.classList.add(prefix + '-ai-chip--used'); send(chip.dataset.prompt, true); });
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
      routeLayout(); showAi();
      if (visible(textarea)) textarea.focus({preventScroll:true});
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
      analyze(event.detail || {});
    });
    var api = {cancel:cancel}; controllers.set(panel, api);
    routeLayout();
    return api;
  }
  global.ArticleChat = { init: init };
})(window);
