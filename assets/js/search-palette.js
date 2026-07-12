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

  let fuse, searchData;
  let isOpen = false;
  let isAiThinking = false;
  let conversationHistory = []; // Store conversation history
  let currentQuery = ''; // Store current query for follow-up
  let lastAiQuery = ''; // Store last query for retry

  // Open palette
  function openPalette() {
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
    input.value = '';
    resultsList.innerHTML = '';
    resultCount.textContent = '0';
    emptyMsg.hidden = true;
    hideAiBox();
  }

  function hideAiBox() {
    aiBox.hidden = true;
    aiContent.innerHTML = '';
    isAiThinking = false;
    conversationHistory = []; // Clear conversation history when closing
    currentQuery = '';
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
          <div class="search-palette__conversation-sender">${isUser ? '🧑 You' : '🤖 AI'}</div>
          <div class="search-palette__conversation-content">${formatAiAnswer(msg.content)}</div>
        </div>
      `;
    }).join('');
  }

  // Add follow-up input field
  function renderFollowUpInput(lastQuery) {
    const isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    return `
      <div class="search-palette__followup">
        <input
          class="search-palette__followup-input"
          type="text"
          placeholder="${isZh ? '继续追问… (Enter 发送)' : 'Ask a follow-up… (Enter to send)'}"
          data-followup-query="${lastQuery}"
        />
        <button class="search-palette__followup-send">${isZh ? '发送' : 'Send'}</button>
        <button class="search-palette__share-btn" title="${isZh ? '分享对话' : 'Share conversation'}" aria-label="${isZh ? '分享对话' : 'Share conversation'}">
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
    const lang = document.documentElement.lang || 'en';
    // Load language-specific search index based on current page URL
    const currentPath = window.location.pathname;
    const langMatch = currentPath.match(/^\/(zh|en)/);
    const searchLang = langMatch ? langMatch[1] : 'en';
    const indexPath = searchLang !== 'en' ? `/${searchLang}/index.json` : '/index.json';
    
    fetch(indexPath)
      .then(response => response.json())
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
      })
      .catch(err => console.error('Failed to load search index:', err));
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
    lastAiQuery = query;

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
            <div class="search-palette__conversation-sender">🤖 AI</div>
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
        if (!answer) answer = 'Sorry, I couldn\'t find an answer.';
      } else {
        // Non-streaming JSON response (fallback)
        const data = await response.json();
        answer = data.answer || 'Sorry, I couldn\'t find an answer.';
        candidates = data.candidates || [];
      }

      // Add AI response to history
      addToHistory('assistant', answer);

      // A conversation is underway — retire the starter suggestion chips so
      // the answer gets their vertical space.
      const suggestionsRow = document.getElementById('search-ai-suggestions');
      if (suggestionsRow) suggestionsRow.style.display = 'none';

      // Render full conversation with follow-up input and sources
      aiContent.innerHTML = renderConversation() + renderSources(candidates) + renderFollowUpInput(query);

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
      let errorMsg = 'Sorry, failed to get AI answer. Please try again later.';

      if (err.name === 'AbortError') {
        errorMsg = 'Request timed out. Please try again.';
      } else if (err.message === 'LOCAL_DEV_404') {
        errorMsg = `<strong>Local Dev Mode Detected</strong><br>Hugo server does not host AI functions. Please run <code>netlify dev</code> to test AI features locally.`;
      } else if (err.message.includes('Missing DASHSCOPE_API_KEY')) {
        errorMsg = `<strong>Configuration Error</strong><br>The AI service is missing an API key. Please check your Netlify environment variables.`;
      } else if (err.message) {
        errorMsg = `<strong>Error</strong>: ${err.message}`;
      }

      aiContent.innerHTML = `<div class="search-palette__ai-error" style="color: #ef4444; font-size: 0.9rem; line-height: 1.5;">${errorMsg}</div>`;
      const retryBtn = document.createElement('button');
      retryBtn.className = 'ai-retry-btn';
      retryBtn.textContent = '↺ 重试';
      retryBtn.addEventListener('click', () => {
        if (lastAiQuery) {
          input.value = lastAiQuery;
          askAI(lastAiQuery);
        }
      });
      aiContent.querySelector('.search-palette__ai-error').appendChild(retryBtn);
    } finally {
      isAiThinking = false;
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
      `<a href="${c.permalink}" class="ai-source-link" target="_blank">${c.title}</a>`
    ).join('');
    return `<div class="ai-sources"><span class="ai-sources-label">参考 / Sources: </span>${links}</div>`;
  }

  // When an AI answer is about WeChat / contact, append a one-tap button that
  // opens the site-wide WeChat card (QR + copy). No-op if the WeChat helper or
  // trigger isn't on the page.
  function maybeAddWechatCTA(answer) {
    if (typeof window.openWechatContact !== 'function') return;
    const trigger = document.querySelector('[data-wechat-id][data-wechat-qr]');
    if (!trigger || !aiContent) return;
    if (!/(wechat|微信|cubxxw_com)/i.test(String(answer || ''))) return;
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
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
  }

  // Update Full Search link with current query
  function updateFullSearchLink(query) {
    if (!fullLink) return;
    const baseHref = fullLink.getAttribute('href').split('?')[0];
    fullLink.href = query.trim() ? `${baseHref}?q=${encodeURIComponent(query.trim())}` : baseHref;
  }

  // Execute search
  function doSearch(query) {
    updateFullSearchLink(query);
    if (!fuse || !query.trim()) {
      resultsList.innerHTML = '';
      resultCount.textContent = '0';
      emptyMsg.hidden = true;
      return;
    }
    const results = searchWithFallback(query, 10);
    resultCount.textContent = results.length;
    if (results.length === 0) {
      resultsList.innerHTML = '';
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;
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
        ? `<span class="search-palette__result-meta">${tags.map(t => `<span class="search-palette__result-tag">${t}</span>`).join('')}</span>`
        : '';
      const dateHtml = date
        ? `<span class="search-palette__result-date">${date}</span>`
        : '';
      const metaRow = (tagsHtml || dateHtml)
        ? `<span class="search-palette__result-footer">${tagsHtml}${dateHtml}</span>`
        : '';
      return `
      <li class="search-palette__result" role="option">
        <a class="search-palette__result-link" href="${item.permalink}">
          <span class="search-palette__result-title">${item.title}</span>
          ${preview ? `<span class="search-palette__result-preview">${preview}</span>` : ''}
          ${metaRow}
        </a>
      </li>`;
    }).join('');

    // Auto-trigger AI for questions
    const isQuestion = query.trim().endsWith('?') || 
                       /^(what|how|why|who|where|when|什么是|如何|为什么)/i.test(query.trim());
    if (isQuestion && !aiBox.hidden && !isAiThinking) {
      // If AI box is already open, refresh it? Or maybe just let the user click.
      // For now, let's only trigger via button or explicit intent.
    }
  }

  // Keyboard shortcuts: Cmd/Ctrl + K to open, Esc to close
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      isOpen ? closePalette() : openPalette();
    }
    if (e.key === 'Escape' && isOpen) {
      closePalette();
    }
    if (e.key === 'Enter' && isOpen && input.value.trim() && !isAiThinking) {
      askAI(input.value);
    }
  });

  // Events
  triggers.forEach(t => t.addEventListener('click', (e) => {
    e.preventDefault();
    openPalette();
  }));

  closeBtn?.addEventListener('click', closePalette);
  backdrop?.addEventListener('click', closePalette);
  aiClose?.addEventListener('click', hideAiBox);
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
    debounceTimeout = setTimeout(() => doSearch(e.target.value), 150);
  });
})();
