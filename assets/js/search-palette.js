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

  if (!palette) return;

  let fuse, searchData;
  let isOpen = false;
  let isAiThinking = false;
  let conversationHistory = []; // Store conversation history
  let currentQuery = ''; // Store current query for follow-up

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
    return `
      <div class="search-palette__followup">
        <input
          class="search-palette__followup-input"
          type="text"
          placeholder="继续追问... (按 Enter 发送)"
          data-followup-query="${lastQuery}"
        />
        <button class="search-palette__followup-send">发送</button>
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
          context: conversationHistory, // Pass conversation history
          searchContext: context // Pass current search results as context
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

      const data = await response.json();
      const answer = data.answer || 'Sorry, I couldn\'t find an answer.';

      // Add AI response to history
      addToHistory('assistant', answer);

      // Render full conversation with follow-up input
      aiContent.innerHTML = renderConversation() + renderFollowUpInput(query);

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

      aiContent.innerHTML = `<div style="color: #ef4444; font-size: 0.9rem; line-height: 1.5;">${errorMsg}</div>`;
    } finally {
      isAiThinking = false;
    }
  }

  // Attach event listeners to follow-up input and button
  function attachFollowUpListeners() {
    const followUpInput = aiContent.querySelector('.search-palette__followup-input');
    const followUpBtn = aiContent.querySelector('.search-palette__followup-send');

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

    // Focus the input
    setTimeout(() => followUpInput.focus(), 10);
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

  // Execute search
  function doSearch(query) {
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
    resultsList.innerHTML = results.map((r, i) => `
      <li class="search-palette__result" role="option">
        <a class="search-palette__result-link" href="${r.item.permalink}">
          <span class="search-palette__result-title">${r.item.title}</span>
          <span class="search-palette__result-preview">${r.item.summary || ''}</span>
        </a>
      </li>`).join('');

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

  // Input search event with debounce
  let debounceTimeout;
  input?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => doSearch(e.target.value), 150);
  });
})();
