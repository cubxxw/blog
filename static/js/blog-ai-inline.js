(function () {
  // Detect environment and set endpoint accordingly
  const endpoint = window.BLOG_AI_ENDPOINT || "/.netlify/functions/blog-ai";
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // Debug mode - can be enabled via window.blogAiInlineDebug = true
  const DEBUG = window.blogAiInlineDebug || false;

  function log(...args) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[Blog AI Inline]', ...args);
    }
  }

  // Context storage key and max length
  const CONTEXT_STORAGE_KEY = "blog-ai-conversation-context";
  const MAX_CONTEXT_LENGTH = 10; // Max conversation pairs to keep
  const MAX_CONTEXT_TOKENS_ESTIMATE = 8000; // Rough token limit for context

  function inferLanguage() {
    const lang = document.documentElement.getAttribute("lang") || "";
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("fr")) return "fr";
    return "en";
  }

  function t(language, key) {
    const dict = {
      zh: {
        title: "AI 对话",
        subtitle: "基于博客内容回答问题",
        placeholder: "比如：帮我分析博客的 AI 相关文章...",
        ask: "发送",
        loading: "思考中...",
        empty: "请输入问题",
        error: "请求失败",
        errorNetlify: "无法连接到 AI 服务",
        errorNetlifyHint: "💡 本地开发请运行：netlify dev",
        errorProd: "请检查 Netlify 部署和 DASHSCOPE_API_KEY 配置",
        clear: "清空",
        welcome: "👋 你好！我可以回答关于博客内容的问题。",
        statusOffline: "离线",
        statusOnline: "在线",
        contextCleared: "对话历史已清空",
        contextLoaded: "已加载之前的对话上下文",
        suggestions: ["📚 推荐入门文章", "🤖 AI Agent 相关", "✨ 最新文章"],
        suggestionQueries: ["推荐几篇适合入门 AI 的文章", "有哪些关于 AI Agent 的文章", "最近更新了哪些新文章"],
      },
      en: {
        title: "AI Chat",
        subtitle: "Ask about blog content",
        placeholder: "Example: analyze AI-related posts...",
        ask: "Send",
        loading: "Thinking...",
        empty: "Please enter a question",
        error: "Request failed",
        errorNetlify: "Cannot connect to AI service",
        errorNetlifyHint: "💡 Run locally: netlify dev",
        errorProd: "Check Netlify deployment and DASHSCOPE_API_KEY",
        clear: "Clear",
        welcome: "👋 Hi! I can answer questions about blog content.",
        statusOffline: "Offline",
        statusOnline: "Online",
        contextCleared: "Conversation history cleared",
        contextLoaded: "Loaded previous conversation context",
        suggestions: ["📚 Getting Started", "🤖 AI Agents", "✨ Latest Posts"],
        suggestionQueries: ["Recommend beginner-friendly AI articles", "What articles are about AI Agents?", "What are the latest posts?"],
      },
    };
    const pack = dict[language] || dict.en;
    return pack[key] || dict.en[key] || key;
  }

  // Simple Markdown parser - safely escapes HTML first
  function parseMarkdown(text) {
    if (!text) return "";

    const escapeHtml = (str) => {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    };

    let html = escapeHtml(text)
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code class='language-$1'>$2</code></pre>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' style='color:inherit;text-decoration:underline'>$1</a>")
      .replace(/^\s*[-*+]\s+(.*$)/gim, "<li>$1</li>")
      .replace(/\n/gim, "<br>");

    html = html.replace(/(<li>.*<\/li>(<br>)?)+/g, function(match) {
      return "<ul>" + match.replace(/<\/li><br>/g, "</li>") + "</ul>";
    });

    return html;
  }

  // Context Management Functions
  function loadContext() {
    try {
      const stored = localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load context from localStorage:", e);
    }
    return [];
  }

  function saveContext(context) {
    try {
      localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch (e) {
      console.warn("Failed to save context to localStorage:", e);
      // If storage is full, try to compress and save
      if (e.name === "QuotaExceededError") {
        const compressed = compressContext(context);
        try {
          localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(compressed));
        } catch (e2) {
          console.error("Still failed after compression:", e2);
        }
      }
    }
  }

  function compressContext(context) {
    // Keep only the most recent conversations
    if (context.length <= MAX_CONTEXT_LENGTH) {
      return context;
    }
    // Keep the last MAX_CONTEXT_LENGTH pairs
    return context.slice(-MAX_CONTEXT_LENGTH);
  }

  function addToContext(context, question, answer) {
    const newContext = [...context, { role: "user", content: question, timestamp: Date.now() }];
    if (answer) {
      newContext.push({ role: "assistant", content: answer, timestamp: Date.now() });
    }
    return compressContext(newContext);
  }

  function clearContext() {
    try {
    localStorage.removeItem(CONTEXT_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear context:", e);
    }
  }

  function createWidget(container) {
    const language = inferLanguage();
    const root = document.createElement("div");
    root.className = "blog-ai-inline";
    root.innerHTML = `
      <div class="blog-ai-header">
        <div class="blog-ai-title">
          <span class="blog-ai-icon">🤖</span>
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h3>${t(language, "title")}</h3>
              <span class="blog-ai-status" title="${t(language, "statusOnline")}" style="display: none;">
                <span class="blog-ai-status__dot"></span>
                <span class="blog-ai-status__text">${t(language, "statusOnline")}</span>
              </span>
            </div>
            <p>${t(language, "subtitle")}</p>
          </div>
        </div>
      </div>
      <div class="blog-ai-messages" aria-live="polite">
        <div class="blog-ai-welcome">${t(language, "welcome")}</div>
        <div class="blog-ai-suggestions" id="blog-ai-suggestions">
          ${(t(language, "suggestions") || []).map((label, i) =>
            `<button class="blog-ai-suggestion" data-idx="${i}">${label}</button>`
          ).join("")}
        </div>
      </div>
      <form class="blog-ai-form">
        <textarea class="blog-ai-input" rows="3" placeholder="${t(language, "placeholder")}" aria-label="Question"></textarea>
        <div class="blog-ai-actions">
          <button type="button" class="blog-ai-clear">${t(language, "clear")}</button>
          <button type="submit" class="blog-ai-submit">${t(language, "ask")}</button>
        </div>
      </form>
    `;

    const form = root.querySelector(".blog-ai-form");
    const input = root.querySelector(".blog-ai-input");
    const submit = root.querySelector(".blog-ai-submit");
    const clear = root.querySelector(".blog-ai-clear");
    const messages = root.querySelector(".blog-ai-messages");
    const statusEl = root.querySelector(".blog-ai-status");

    // Suggestion buttons — hide after first use
    const suggestionsEl = root.querySelector("#blog-ai-suggestions");
    root.querySelectorAll(".blog-ai-suggestion").forEach((btn) => {
      btn.addEventListener("click", () => {
        const queries = t(language, "suggestionQueries") || [];
        const q = queries[parseInt(btn.dataset.idx, 10)] || btn.textContent;
        input.value = q;
        if (suggestionsEl) suggestionsEl.style.display = "none";
        form.dispatchEvent(new Event("submit"));
      });
    });

    // Load context from localStorage
    let conversationContext = loadContext();
    if (conversationContext.length > 0) {
      log("Loaded conversation context:", conversationContext.length, "messages");
      // Optionally show a subtle indicator that context was loaded
      const contextIndicator = document.createElement("div");
      contextIndicator.className = "blog-ai-context-indicator";
      contextIndicator.textContent = `${t(language, "contextLoaded")} (${conversationContext.length} ${t(language, "messages")})`;
      contextIndicator.style.cssText = "font-size: 0.75rem; color: #94a3b8; text-align: center; padding: 8px; background: rgba(148, 163, 184, 0.1); border-radius: 8px; margin: 8px 0;";
      messages.insertBefore(contextIndicator, messages.firstChild);
      setTimeout(() => contextIndicator.remove(), 3000);
    }

    // Check connection status
    async function checkConnection() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(endpoint, {
          method: "OPTIONS",
          signal: controller.signal,
        }).catch(() => ({ ok: false, status: 0 }));
        clearTimeout(timeout);

        if (response.ok || response.status === 405) {
          statusEl.style.display = "inline-flex";
          statusEl.className = "blog-ai-status blog-ai-status--online";
          statusEl.title = t(language, "statusOnline");
          statusEl.querySelector(".blog-ai-status__text").textContent = t(language, "statusOnline");
        } else {
          // Hide status indicator completely when offline
          statusEl.style.display = "none";
        }
      } catch (e) {
        // Hide status indicator on error
        statusEl.style.display = "none";
      }
    }

    setTimeout(checkConnection, 500);

    function addMessage(content, isUser) {
      const msg = document.createElement("div");
      msg.className = "blog-ai-message" + (isUser ? " blog-ai-message-user" : " blog-ai-message-ai");
      if (isUser) {
        msg.textContent = content;
      } else {
        const isError = content.includes("<br>") || content.includes("<code>") ||
                        content.includes("请求失败") || content.includes("Request failed") ||
                        content.includes("无法连接") || content.includes("Cannot connect");
        if (isError) {
          const errorDiv = document.createElement("div");
          errorDiv.className = "blog-ai-error";
          errorDiv.innerHTML = content;
          msg.innerHTML = "";
          msg.appendChild(errorDiv);
        } else {
          msg.innerHTML = parseMarkdown(content);
        }
      }
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    function showLoading() {
      const msg = document.createElement("div");
      msg.className = "blog-ai-message blog-ai-message-ai blog-ai-loading";
      msg.innerHTML = '<span class="blog-ai-dot"></span><span class="blog-ai-dot"></span><span class="blog-ai-dot"></span>';
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
      return msg;
    }

    function removeLoading() {
      const loading = messages.querySelector(".blog-ai-loading");
      if (loading) loading.remove();
    }

    let lastQuestion = '';

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;
      lastQuestion = question;

      addMessage(question, true);
      input.value = "";
      submit.disabled = true;
      showLoading();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            language,
            context: conversationContext // Send conversation context
          }),
        });

        if (!response.ok) {
          if (response.status === 404) throw new Error("NETLIFY_404");
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || t(language, "error"));
        }

        const contentType = response.headers.get("content-type") || "";
        let answer = "";
        let candidates = [];

        if (contentType.includes("text/event-stream")) {
          // Streaming SSE — typewriter effect
          removeLoading();
          const streamMsg = addMessage("", false);
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop();
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") break outer;
              try {
                const chunk = JSON.parse(raw);
                if (chunk.meta) {
                  candidates = chunk.meta.candidates || [];
                } else if (chunk.delta) {
                  answer += chunk.delta;
                  streamMsg.innerHTML = parseMarkdown(answer);
                  messages.scrollTop = messages.scrollHeight;
                }
              } catch (_) {}
            }
          }
        } else {
          const data = await response.json();
          removeLoading();
          answer = data.answer || "";
          candidates = data.candidates || [];
          addMessage(answer, false);
        }

        // Render reference sources if available
        if (candidates.length > 0) {
          const sourcesDiv = document.createElement("div");
          sourcesDiv.className = "ai-sources";
          const links = candidates.slice(0, 3).map(c =>
            `<a href="${c.permalink}" class="ai-source-link" target="_blank">${c.title}</a>`
          ).join("");
          sourcesDiv.innerHTML = `<span class="ai-sources-label">参考 / Sources: </span>${links}`;
          messages.appendChild(sourcesDiv);
          messages.scrollTop = messages.scrollHeight;
        }

        // Save to context
        conversationContext = addToContext(conversationContext, question, answer);
        saveContext(conversationContext);
      } catch (error) {
        removeLoading();
        if (error.message === "NETLIFY_404") {
          const errorMsg = isLocalhost
            ? `${t(language, "errorNetlify")}<br><br><code style="background:rgba(148,163,184,0.15);padding:8px 12px;border-radius:6px;display:block;margin:8px 0;">${t(language, "errorNetlifyHint")}</code>`
            : `${t(language, "errorNetlify")}<br><br><small>${t(language, "errorProd")}</small>`;
          addMessage(errorMsg, false);
        } else {
          addMessage(`${t(language, "error")}: ${error.message}`, false);
        }
        // Add retry button to the last error message
        const lastMsg = messages.querySelector(".blog-ai-message:last-child");
        if (lastMsg && lastQuestion) {
          const retryBtn = document.createElement("button");
          retryBtn.className = "ai-retry-btn";
          retryBtn.textContent = "↺ 重试";
          retryBtn.addEventListener("click", () => {
            input.value = lastQuestion;
            form.dispatchEvent(new Event("submit"));
          });
          lastMsg.appendChild(retryBtn);
        }
      } finally {
        submit.disabled = false;
        input.focus();
      }
    });

    clear.addEventListener("click", function () {
      clearContext();
      conversationContext = [];
      messages.innerHTML = "";
      input.value = "";

      // Show cleared indicator
      const clearedIndicator = document.createElement("div");
      clearedIndicator.className = "blog-ai-context-indicator";
      clearedIndicator.textContent = t(language, "contextCleared");
      clearedIndicator.style.cssText = "font-size: 0.75rem; color: #22c55e; text-align: center; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; margin: 8px 0;";
      messages.appendChild(clearedIndicator);
      setTimeout(() => clearedIndicator.remove(), 2000);

      input.focus();
    });

    // Auto-resize textarea
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = (this.scrollHeight) + "px";
    });

    container.appendChild(root);
  }

  function init() {
    const containers = document.querySelectorAll(".blog-ai-container");
    containers.forEach(function (container) {
      if (!container.querySelector(".blog-ai-inline")) {
        createWidget(container);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
