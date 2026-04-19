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
    // Delay longer than the 0.18s palette-in animation so focus lands reliably
    setTimeout(() => input && input.focus(), 100);
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
            { name: 'categories', weight: 0.02 }
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
    const results = fuse ? fuse.search(query, { limit: 5 }) : [];
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
                  }
                }
              } catch(e) {}
            }
          }
        }

        if (!answer) answer = 'Sorry, I couldn\'t find an answer.';
      } else {
        // Non-streaming JSON response (fallback)
        const data = await response.json();
        answer = data.answer || 'Sorry, I couldn\'t find an answer.';
        candidates = data.candidates || [];
      }

      // Add AI response to history
      addToHistory('assistant', answer);

      // Render full conversation with follow-up input and sources
      aiContent.innerHTML = renderConversation() + renderSources(candidates) + renderFollowUpInput(query);

      // Attach event listeners to follow-up elements
      attachFollowUpListeners();
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

    // Focus the input
    setTimeout(() => followUpInput.focus(), 10);
  }

  function renderSources(candidates) {
    if (!candidates || candidates.length === 0) return '';
    const links = candidates.slice(0, 3).map(c =>
      `<a href="${c.permalink}" class="ai-source-link" target="_blank">${c.title}</a>`
    ).join('');
    return `<div class="ai-sources"><span class="ai-sources-label">参考 / Sources: </span>${links}</div>`;
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
    const results = fuse.search(query, { limit: 10 });
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
