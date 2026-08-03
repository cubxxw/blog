(function() {
  const palette = document.getElementById('search-command-palette');
  const input = palette?.querySelector('.search-palette__input');
  const resultsList = document.getElementById('search-results-list');
  const resultCount = document.getElementById('search-result-count');
  const emptyMsg = document.getElementById('search-empty');
  const aiBtn = document.getElementById('search-ai-btn');
  const aiBox = document.getElementById('search-ai-box');
  const aiContent = document.getElementById('search-ai-content');
  const aiClose = document.getElementById('search-ai-close');
  const triggers = document.querySelectorAll('[data-search-trigger], .nav-search-trigger');
  const closeBtn = palette?.querySelector('.search-palette__close');
  const backdrop = palette?.querySelector('.search-palette__backdrop');
  const fullLink = document.getElementById('search-full-link');

  if (!palette) return;
  window.__searchPaletteReady = true;

  const isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
  const labels = isZh ? {
    you: '你',
    ai: 'AI',
    aiFallback: '暂时没有找到答案。',
    aiError: 'AI 回答失败，请稍后重试。',
    aiTimeout: '请求超时，请再试一次。',
    localDev: '<strong>本地开发模式</strong><br>Hugo 服务不包含 AI Functions，请使用 <code>netlify dev</code> 测试。',
    configError: '<strong>配置错误</strong><br>AI 服务缺少 API 密钥，请检查 Netlify 环境变量。',
    errorPrefix: '<strong>错误</strong>：',
    retry: '重试',
    sources: '参考来源：',
    noResults: '没有找到匹配结果',
    indexError: '搜索索引暂时无法载入，请稍后重试。'
  } : {
    you: 'You',
    ai: 'AI',
    aiFallback: 'Sorry, I could not find an answer.',
    aiError: 'The AI answer failed. Please try again later.',
    aiTimeout: 'The request timed out. Please try again.',
    localDev: '<strong>Local development mode</strong><br>Hugo does not host AI Functions. Run <code>netlify dev</code> to test them.',
    configError: '<strong>Configuration error</strong><br>The AI service is missing an API key. Check the Netlify environment variables.',
    errorPrefix: '<strong>Error</strong>: ',
    retry: 'Retry',
    sources: 'Sources: ',
    noResults: 'No matching results',
    indexError: 'The search index could not be loaded. Please try again later.'
  };

  let fuse, searchData;
  let isOpen = false;
  let isAiThinking = false;
  let conversationHistory = []; // Store conversation history
  let currentQuery = ''; // Store current query for follow-up
  let lastAiQuery = ''; // Store last query for retry
  let activeIndex = -1;
  let lastFocusedElement = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function safeHref(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '#';
      return url.origin === window.location.origin
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href;
    } catch (error) {
      return '#';
    }
  }

  function updateAiTrigger() {
    if (aiBtn) aiBtn.disabled = !input?.value.trim() || isAiThinking;
  }

  // Open palette
  function openPalette() {
    if (!isOpen && document.activeElement && !palette.contains(document.activeElement)) {
      lastFocusedElement = document.activeElement;
    }
    palette.removeAttribute('hidden');
    document.body.classList.add('search-palette-open');
    isOpen = true;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'true'));
    // Focus synchronously — a Cmd+K palette is a 100+/day action and must have
    // zero added latency. If the browser drops focus mid-animation, retry once
    // on the next frame (a single rAF, never a timer).
    if (input) {
      input.focus();
      if (document.activeElement !== input) {
        requestAnimationFrame(() => input.focus());
      }
    }
    // Lazy load search data
    if (!fuse) loadSearchData();
  }

  // Close palette
  function closePalette() {
    palette.setAttribute('hidden', '');
    document.body.classList.remove('search-palette-open');
    isOpen = false;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    if (input) {
      input.value = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    resultsList.innerHTML = '';
    resultCount.textContent = '0';
    emptyMsg.hidden = true;
    activeIndex = -1;
    updateAiTrigger();
    hideAiBox();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      try { lastFocusedElement.focus({ preventScroll: true }); } catch (error) {}
    }
    lastFocusedElement = null;
  }

  function hideAiBox() {
    aiBox.hidden = true;
    aiContent.innerHTML = '';
    aiContent.removeAttribute('aria-busy');
    isAiThinking = false;
    conversationHistory = []; // Clear conversation history when closing
    currentQuery = '';
    updateAiTrigger();
    // Bring the suggestion chips back for the next conversation
    const suggestions = document.getElementById('search-ai-suggestions');
    if (suggestions) suggestions.style.display = '';
  }

  // Add message to conversation history
  function addToHistory(role, content) {
    conversationHistory.push({ role, content });
    // Limit history to prevent token overflow
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
  }

  // Render conversation history
  function renderConversation() {
    if (conversationHistory.length === 0) return '';

    return conversationHistory.map(msg => {
      const isUser = msg.role === 'user';
      return `
        <div class="search-palette__conversation-message ${isUser ? 'user' : 'assistant'}">
          <div class="search-palette__conversation-sender">${isUser ? labels.you : labels.ai}</div>
          <div class="search-palette__conversation-content">${formatAiAnswer(msg.content)}</div>
        </div>
      `;
    }).join('');
  }

  // Add follow-up input field
  function renderFollowUpInput() {
    return `
      <div class="search-palette__followup">
        <input
          class="search-palette__followup-input"
          type="text"
          placeholder="${isZh ? '继续追问… (Enter 发送)' : 'Ask a follow-up… (Enter to send)'}"
          aria-label="${isZh ? '继续追问' : 'Ask a follow-up'}"
        />
        <button type="button" class="search-palette__followup-send">${isZh ? '发送' : 'Send'}</button>
        <button type="button" class="search-palette__share-btn" title="${isZh ? '分享对话' : 'Share conversation'}" aria-label="${isZh ? '分享对话' : 'Share conversation'}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    `;
  }

  // Load index.json and initialize Fuse.js
  function loadSearchData() {
    // Load language-specific search index based on current page URL
    const currentPath = window.location.pathname;
    const langMatch = currentPath.match(/^\/(zh|en)/);
    const searchLang = langMatch ? langMatch[1] : 'en';
    const indexPath = searchLang !== 'en' ? `/${searchLang}/index.json` : '/index.json';
    input?.setAttribute('aria-busy', 'true');

    fetch(indexPath)
      .then(response => {
        if (!response.ok) throw new Error(`Search index error (${response.status})`);
        return response.json();
      })
      .then(data => {
        searchData = data;
        fuse = new Fuse(searchData, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'content', weight: 0.3 },
            { name: 'summary', weight: 0.15 },
            { name: 'tags', weight: 0.03 },
            { name: 'section', weight: 0.02 }
          ],
          threshold: 0.3,
          includeMatches: true,
          minMatchCharLength: 1,
          ignoreLocation: true,
          findAllMatches: true,
          tokenize: true,
          matchAllTokens: false
        });
        input?.setAttribute('aria-busy', 'false');
        if (input?.value.trim()) doSearch(input.value);
      })
      .catch(err => {
        input?.setAttribute('aria-busy', 'false');
        resultsList.innerHTML = '';
        resultCount.textContent = '0';
        emptyMsg.textContent = labels.indexError;
        emptyMsg.hidden = false;
        console.error('Failed to load search index:', err);
      });
  }

  // Tokenize a query for fallback search: latin/number words plus CJK
  // bigrams (CJK runs have no word boundaries, so 心流状态 → 心流/流状/状态).
  function fallbackTokens(query) {
    const tokens = [];
    // Strip question/politeness filler so its bigrams (请详/详细/细介…) don't
    // reward unrelated articles that merely say "详细介绍" somewhere.
    const cleaned = String(query).toLowerCase()
      .replace(/请问|请|详细|介绍|什么是|什么|怎么样|怎么|如何|为什么|哪些|一下|关于|文章|讲讲|说说|解释|谢谢/g, ' ');
    const words = cleaned.match(/[\p{L}\p{N}_-]+/gu) || [];
    for (const w of words) {
      if (/[一-鿿]/.test(w)) {
        if (w.length <= 2) tokens.push(w);
        else for (let i = 0; i < w.length - 1 && tokens.length < 12; i++) tokens.push(w.slice(i, i + 2));
      } else if (w.length >= 2) {
        tokens.push(w);
      }
    }
    return [...new Set(tokens)].slice(0, 12);
  }

  // Fuse treats the whole query as one fuzzy pattern, which fails on long
  // natural-language questions (especially Chinese). If the direct search
  // misses, retry per-token and rank by how many tokens each doc hits.
  function searchWithFallback(query, limit) {
    if (!fuse) return [];
    const direct = fuse.search(query, { limit });
    if (direct.length > 0) return direct;
    const tokens = fallbackTokens(query);
    if (tokens.length < 2) return direct;
    const byRef = new Map();
    for (const token of tokens) {
      // Latin words (product names, tech terms) identify intent far better
      // than generic CJK bigrams like 架构/原理 — weight them heavier.
      const weight = /[一-鿿]/.test(token) ? 1 : 3;
      for (const r of fuse.search(token, { limit })) {
        const key = r.item.permalink || r.item.title;
        const prev = byRef.get(key);
        if (prev) { prev.hits += weight; prev.score = Math.min(prev.score, r.score ?? 1); }
        else byRef.set(key, { item: r.item, score: r.score ?? 1, hits: weight });
      }
    }
    return [...byRef.values()]
      .sort((a, b) => b.hits - a.hits || a.score - b.score)
      .slice(0, limit);
  }

  // AI Integration
  async function askAI(query, isFollowUp = false) {
    if (isAiThinking || !query.trim()) return;

    isAiThinking = true;
    aiBox.hidden = false;
    aiContent.setAttribute('aria-busy', 'true');
    lastAiQuery = query;
    updateAiTrigger();

    // If this is a new conversation (not a follow-up), clear history
    if (!isFollowUp) {
      conversationHistory = [];
      currentQuery = query;
    }

    // Show loading state
    if (conversationHistory.length === 0) {
      aiContent.innerHTML = `
        <div class="search-palette__ai-loading">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      `;
    } else {
      // Show existing conversation + loading
      aiContent.innerHTML = renderConversation() + `
        <div class="search-palette__ai-loading">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      `;
    }

    // Get context from search results
    const results = searchWithFallback(query, 5);
    const context = results.map(r => ({
      title: r.item.title,
      summary: r.item.summary,
      content: r.item.content?.substring(0, 500) // Limit content for API
    }));

    // Add user question to history
    addToHistory('user', query);

    const aiController = new AbortController();
    const aiTimeoutId = setTimeout(() => aiController.abort(), 25000);

    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const lang = document.documentElement.lang || 'en';
      const response = await fetch('/.netlify/functions/blog-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          language: lang,
          context: conversationHistory,
          searchContext: context
        }),
        signal: aiController.signal,
      });

      clearTimeout(aiTimeoutId);

      if (!response.ok) {
        if (response.status === 404 && isLocalhost) {
          throw new Error('LOCAL_DEV_404');
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `AI service error (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';
      let answer = '';
      let candidates = [];
      let keepAtBottom = true; // false if the user scrolled up mid-stream

      if (contentType.includes('text/event-stream')) {
        // Streaming SSE response
        const prevHtml = conversationHistory.length > 1 ? renderConversation().replace(/<\/div>\s*$/, '') : '';
        // Show conversation so far + a streaming message container
        aiContent.innerHTML = renderConversation() +
          `<div class="search-palette__conversation-message assistant">
            <div class="search-palette__conversation-sender">${labels.ai}</div>
            <div class="search-palette__conversation-content" id="ai-streaming-target"></div>
          </div>`;
        const streamTarget = document.getElementById('ai-streaming-target');

        // Follow the streaming answer, but stop pinning as soon as the user
        // scrolls up to read something — resume when they return to bottom.
        let pinToBottom = true;
        const onAiScroll = () => {
          pinToBottom = aiContent.scrollHeight - aiContent.scrollTop - aiContent.clientHeight < 40;
        };
        aiContent.addEventListener('scroll', onAiScroll, { passive: true });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);
                if (json.meta) {
                  candidates = json.meta.candidates || [];
                } else {
                  const delta = json.delta || '';
                  if (delta) {
                    answer += delta;
                    streamTarget.innerHTML = formatAiAnswer(answer);
                    if (pinToBottom) aiContent.scrollTop = aiContent.scrollHeight;
                  }
                }
              } catch(e) {}
            }
          }
        }

        aiContent.removeEventListener('scroll', onAiScroll);
        keepAtBottom = pinToBottom;
        if (!answer) answer = labels.aiFallback;
      } else {
        // Non-streaming JSON response (fallback)
        const data = await response.json();
        answer = data.answer || labels.aiFallback;
        candidates = data.candidates || [];
      }

      // Add AI response to history
      addToHistory('assistant', answer);

      // A conversation is underway — retire the starter suggestion chips so
      // the answer gets their vertical space.
      const suggestionsRow = document.getElementById('search-ai-suggestions');
      if (suggestionsRow) suggestionsRow.style.display = 'none';

      // Render full conversation with follow-up input and sources
      aiContent.innerHTML = renderConversation() + renderSources(candidates) + renderFollowUpInput();

      // Land at the end of the answer so sources + follow-up input are
      // visible — unless the user deliberately scrolled up to read.
      if (keepAtBottom) aiContent.scrollTop = aiContent.scrollHeight;

      // Attach event listeners to follow-up elements
      attachFollowUpListeners();

      // Contact-aware quick action: if the answer is about WeChat/contact,
      // surface a one-tap button that opens the site-wide WeChat card.
      maybeAddWechatCTA(answer);
    } catch (err) {
      clearTimeout(aiTimeoutId);
      console.error('AI Error:', err);
      let errorMsg = labels.aiError;

      if (err.name === 'AbortError') {
        errorMsg = labels.aiTimeout;
      } else if (err.message === 'LOCAL_DEV_404') {
        errorMsg = labels.localDev;
      } else if (err.message.includes('Missing DASHSCOPE_API_KEY')) {
        errorMsg = labels.configError;
      } else if (err.message) {
        errorMsg = labels.errorPrefix + escapeHtml(err.message);
      }

      aiContent.innerHTML = `<div class="search-palette__ai-error">${errorMsg}</div>`;
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'ai-retry-btn';
      retryBtn.textContent = labels.retry;
      retryBtn.addEventListener('click', () => {
        if (lastAiQuery) {
          input.value = lastAiQuery;
          askAI(lastAiQuery);
        }
      });
      aiContent.querySelector('.search-palette__ai-error').appendChild(retryBtn);
    } finally {
      isAiThinking = false;
      aiContent.removeAttribute('aria-busy');
      updateAiTrigger();
    }
  }

  // Attach event listeners to follow-up input and button
  function attachFollowUpListeners() {
    const followUpInput = aiContent.querySelector('.search-palette__followup-input');
    const followUpBtn = aiContent.querySelector('.search-palette__followup-send');
    const shareBtn = aiContent.querySelector('.search-palette__share-btn');

    if (!followUpInput || !followUpBtn) return;

    // Send on button click
    followUpBtn.addEventListener('click', () => {
      const query = followUpInput.value.trim();
      if (query) {
        askAI(query, true); // true = this is a follow-up
      }
    });

    // Send on Enter key
    followUpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = followUpInput.value.trim();
        if (query) {
          askAI(query, true);
        }
      }
    });

    // Share conversation
    if (shareBtn && typeof ShareConversation !== 'undefined') {
      shareBtn.addEventListener('click', () => {
        ShareConversation.show(conversationHistory, {
          lang:  document.documentElement.lang || 'en',
          title: document.title,
          url:   window.location.href,
        });
      });
    }

    // Focus the input without yanking the scroll position (we position the
    // scroll explicitly after rendering)
    setTimeout(() => followUpInput.focus({ preventScroll: true }), 10);
  }

  function renderSources(candidates) {
    if (!candidates || candidates.length === 0) return '';
    const links = candidates.slice(0, 3).map(c =>
      `<a href="${escapeHtml(safeHref(c.permalink))}" class="ai-source-link" target="_blank" rel="noopener noreferrer">${escapeHtml(c.title)}</a>`
    ).join('');
    return `<div class="ai-sources"><span class="ai-sources-label">${labels.sources}</span>${links}</div>`;
  }

  // When an AI answer is about WeChat / contact, append a one-tap button that
  // opens the site-wide WeChat card (QR + copy). No-op if the WeChat helper or
  // trigger isn't on the page.
  function maybeAddWechatCTA(answer) {
    if (typeof window.openWechatContact !== 'function') return;
    const trigger = document.querySelector('[data-wechat-id][data-wechat-qr]');
    if (!trigger || !aiContent) return;
    if (!/(wechat|微信|cubxxwai|cubxxw_com)/i.test(String(answer || ''))) return;
    if (aiContent.querySelector('.ai-wechat-cta')) return; // avoid dupes on follow-ups

    const isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    const wrap = document.createElement('div');
    wrap.className = 'ai-wechat-cta';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-wechat-cta-btn';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M8.5 3C4.36 3 1 5.9 1 9.5c0 2.04 1.04 3.86 2.67 5.07L3 17l2.7-1.35A8.9 8.9 0 0 0 8.5 16c.17 0 .34 0 .51-.01A5.96 5.96 0 0 1 9 14.5c0-3.31 2.91-6 6.5-6 .17 0 .33.01.5.02C15.27 5.6 12.2 3 8.5 3zm-2 4.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5.5 4C12.91 11.5 11 13.32 11 15.5s1.91 4 5 4c.64 0 1.25-.1 1.82-.28L20 20.5l-.5-2.14A3.97 3.97 0 0 0 21 15.5c0-2.18-1.91-4-5-4zm-1.5 2.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm3 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z"/></svg>' +
      '<span>' + (isZh ? '打开微信名片' : 'Open WeChat card') + '</span>';
    btn.addEventListener('click', function () {
      try { window.openWechatContact(trigger); } catch (e) {}
    });
    wrap.appendChild(btn);
    // Insert right after the last assistant turn, before the follow-up input.
    const followUp = aiContent.querySelector('.search-palette__followup');
    if (followUp) aiContent.insertBefore(wrap, followUp);
    else aiContent.appendChild(wrap);
  }

  function formatAiAnswer(text) {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
  }

  // Update Full Search link with current query
  function updateFullSearchLink(query) {
    if (!fullLink) return;
    const baseHref = fullLink.getAttribute('href').split('?')[0];
    fullLink.href = query.trim() ? `${baseHref}?q=${encodeURIComponent(query.trim())}` : baseHref;
  }

  function resultOptions() {
    return Array.from(resultsList.querySelectorAll('[role="option"]'));
  }

  function setActiveResult(index, shouldScroll = true) {
    const options = resultOptions();
    if (!options.length || index < 0) {
      activeIndex = -1;
      options.forEach(option => option.setAttribute('aria-selected', 'false'));
      input?.removeAttribute('aria-activedescendant');
      return;
    }

    activeIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      option.setAttribute('aria-selected', optionIndex === activeIndex ? 'true' : 'false');
    });
    const activeOption = options[activeIndex];
    input?.setAttribute('aria-activedescendant', activeOption.id);
    if (shouldScroll) activeOption.scrollIntoView({ block: 'nearest' });
  }

  function openSelectedResult() {
    const options = resultOptions();
    if (options.length) {
      const target = options[activeIndex >= 0 ? activeIndex : 0];
      window.location.assign(target.href);
      return;
    }
    if (input?.value.trim() && fuse && fullLink) {
      window.location.assign(fullLink.href);
    }
  }

  // Execute search
  function doSearch(query) {
    updateFullSearchLink(query);
    setActiveResult(-1, false);
    if (!query.trim()) {
      resultsList.innerHTML = '';
      resultCount.textContent = '0';
      emptyMsg.hidden = true;
      input?.setAttribute('aria-expanded', 'false');
      return;
    }
    if (!fuse) {
      return;
    }
    const results = searchWithFallback(query, 10);
    resultCount.textContent = results.length;
    if (results.length === 0) {
      resultsList.innerHTML = '';
      emptyMsg.textContent = labels.noResults;
      emptyMsg.hidden = false;
      input?.setAttribute('aria-expanded', 'false');
      return;
    }
    emptyMsg.hidden = true;
    input?.setAttribute('aria-expanded', 'true');
    const stripHtml = (html) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
    };
    resultsList.innerHTML = results.map((r, i) => {
      const item = r.item;
      const date = item.date || '';
      const rawPreview = item.summary ? stripHtml(item.summary) : '';
      const preview = rawPreview.length > 80 ? rawPreview.substring(0, 80) + '…' : rawPreview;
      const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
      const tagsHtml = tags.length
        ? `<span class="search-palette__result-meta">${tags.map(t => `<span class="search-palette__result-tag">${escapeHtml(t)}</span>`).join('')}</span>`
        : '';
      const dateHtml = date
        ? `<span class="search-palette__result-date">${escapeHtml(date)}</span>`
        : '';
      const metaRow = (tagsHtml || dateHtml)
        ? `<span class="search-palette__result-footer">${tagsHtml}${dateHtml}</span>`
        : '';
      const optionId = `search-result-option-${i}`;
      return `
      <li class="search-palette__result" role="presentation">
        <a class="search-palette__result-link" id="${optionId}" role="option"
           aria-selected="false" tabindex="-1" href="${escapeHtml(safeHref(item.permalink))}">
          <span class="search-palette__result-title">${escapeHtml(item.title)}</span>
          ${preview ? `<span class="search-palette__result-preview">${escapeHtml(preview)}</span>` : ''}
          ${metaRow}
        </a>
      </li>`;
    }).join('');

    resultOptions().forEach((option, optionIndex) => {
      option.addEventListener('mouseenter', () => setActiveResult(optionIndex, false));
      option.addEventListener('focus', () => setActiveResult(optionIndex, false));
    });
  }

  function focusableElements() {
    return Array.from(palette.querySelectorAll(
      'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getClientRects().length > 0);
  }

  // Keyboard shortcuts and dialog focus management.
  document.addEventListener('keydown', function(e) {
    const key = e.key.toLowerCase();
    const targetIsField = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && key === 'k') {
      e.preventDefault();
      isOpen ? closePalette() : openPalette();
      return;
    }
    if (e.key === '/' && !isOpen && !targetIsField) {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closePalette();
      return;
    }
    if (e.key === 'Tab' && isOpen) {
      const focusable = focusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  input?.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const options = resultOptions();
      if (options.length) setActiveResult(activeIndex < 0 ? 0 : activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const options = resultOptions();
      if (options.length) setActiveResult(activeIndex < 0 ? options.length - 1 : activeIndex - 1);
      return;
    }
    if (event.key === 'Home' && resultOptions().length) {
      event.preventDefault();
      setActiveResult(0);
      return;
    }
    if (event.key === 'End' && resultOptions().length) {
      event.preventDefault();
      setActiveResult(resultOptions().length - 1);
      return;
    }
    if (event.key === 'Enter' && input.value.trim()) {
      event.preventDefault();
      if ((event.metaKey || event.ctrlKey) && !isAiThinking) {
        askAI(input.value);
      } else if (!event.metaKey && !event.ctrlKey) {
        openSelectedResult();
      }
    }
  });

  // Events
  triggers.forEach(t => t.addEventListener('click', (e) => {
    e.preventDefault();
    openPalette();
  }));

  closeBtn?.addEventListener('click', closePalette);
  backdrop?.addEventListener('click', closePalette);
  aiClose?.addEventListener('click', () => {
    hideAiBox();
    input?.focus();
  });
  aiBtn?.addEventListener('click', () => askAI(input.value));

  // Suggested questions
  document.querySelectorAll('.search-palette__ai-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      input.value = q;
      askAI(q);
      const suggestions = document.getElementById('search-ai-suggestions');
      if (suggestions) suggestions.style.display = 'none';
    });
  });

  // Input search event with debounce
  let debounceTimeout;
  input?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    setActiveResult(-1, false);
    updateAiTrigger();
    debounceTimeout = setTimeout(() => doSearch(e.target.value), 150);
  });

  updateAiTrigger();
})();
