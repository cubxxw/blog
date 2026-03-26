(function () {
  // Detect environment and set endpoint accordingly
  const endpoint = window.BLOG_AI_ENDPOINT || "/.netlify/functions/blog-ai";
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

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
        errorProd: "请检查 Netlify 部署和 OPENAI_API_KEY 配置",
        clear: "清空",
        welcome: "👋 你好！我可以回答关于博客内容的问题。",
        statusOffline: "离线",
        statusOnline: "在线",
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
        errorProd: "Check Netlify deployment and OPENAI_API_KEY",
        clear: "Clear",
        welcome: "👋 Hi! I can answer questions about blog content.",
        statusOffline: "Offline",
        statusOnline: "Online",
      },
    };
    const pack = dict[language] || dict.en;
    return pack[key] || dict.en[key] || key;
  }

  // Simple Markdown parser - safely escapes HTML first
  function parseMarkdown(text) {
    if (!text) return "";

    // Create a temporary element to safely escape HTML
    const escapeHtml = (str) => {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    };

    let html = escapeHtml(text)
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code class='language-$1'>$2</code></pre>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener' style='color:inherit;text-decoration:underline'>$1</a>")
      // Unordered lists
      .replace(/^\s*[-*+]\s+(.*$)/gim, "<li>$1</li>")
      // Line breaks
      .replace(/\n/gim, "<br>");

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>(<br>)?)+/g, function(match) {
      return "<ul>" + match.replace(/<\/li><br>/g, "</li>") + "</ul>";
    });

    return html;
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
              <span class="blog-ai-status blog-ai-status--offline" title="${t(language, "statusOffline")}">
                <span class="blog-ai-status__dot"></span>
                <span class="blog-ai-status__text">${t(language, "statusOffline")}</span>
              </span>
            </div>
            <p>${t(language, "subtitle")}</p>
          </div>
        </div>
      </div>
      <div class="blog-ai-messages" aria-live="polite">
        <div class="blog-ai-welcome">${t(language, "welcome")}</div>
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
          // 405 is expected for OPTIONS on POST-only endpoint
          statusEl.className = "blog-ai-status blog-ai-status--online";
          statusEl.title = t(language, "statusOnline");
          statusEl.querySelector(".blog-ai-status__text").textContent = t(language, "statusOnline");
        }
      } catch (e) {
        // Keep offline status
      }
    }

    // Check connection after a short delay
    setTimeout(checkConnection, 500);

    function addMessage(content, isUser) {
      const msg = document.createElement("div");
      msg.className = "blog-ai-message" + (isUser ? " blog-ai-message-user" : " blog-ai-message-ai");
      if (isUser) {
        msg.textContent = content;
      } else {
        // Check if this is an error message (contains HTML or error keywords)
        const isError = content.includes("<br>") || content.includes("<code>") ||
                        content.includes("请求失败") || content.includes("Request failed") ||
                        content.includes("无法连接") || content.includes("Cannot connect");
        if (isError) {
          // For error messages, render HTML for formatting
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

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      addMessage(question, true);
      input.value = "";
      submit.disabled = true;
      showLoading();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, language }),
        });

        // Handle non-JSON responses
        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error("Invalid response: " + text.substring(0, 100));
        }

        removeLoading();

        if (!response.ok) {
          // Check for 404 - Netlify function not available
          if (response.status === 404) {
            throw new Error("NETLIFY_404");
          }
          throw new Error(data.error || t(language, "error"));
        }

        addMessage(data.answer || "", false);
      } catch (error) {
        removeLoading();
        // Show specific error message for 404
        if (error.message === "NETLIFY_404") {
          const errorMsg = isLocalhost
            ? `${t(language, "errorNetlify")}<br><br><code style="background:rgba(148,163,184,0.15);padding:8px 12px;border-radius:6px;display:block;margin:8px 0;">${t(language, "errorNetlifyHint")}</code>`
            : `${t(language, "errorNetlify")}<br><br><small>${t(language, "errorProd")}</small>`;
          addMessage(errorMsg, false);
        } else {
          addMessage(`${t(language, "error")}: ${error.message}`, false);
        }
      } finally {
        submit.disabled = false;
        input.focus();
      }
    });

    clear.addEventListener("click", function () {
      messages.innerHTML = "";
      input.value = "";
      input.focus();
    });

    // Auto-resize textarea
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = (this.scrollHeight) + "px";
    });

    container.appendChild(root);
  }

  // Initialize when DOM is ready
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
