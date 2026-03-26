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
        errorNetlify: "无法连接到 AI 服务。本地开发请运行 'netlify dev'，或检查部署状态。",
        clear: "清空",
      },
      en: {
        title: "AI Chat",
        subtitle: "Ask about blog content",
        placeholder: "Example: analyze AI-related posts...",
        ask: "Send",
        loading: "Thinking...",
        empty: "Please enter a question",
        error: "Request failed",
        errorNetlify: "Cannot connect to AI service. Run 'netlify dev' locally or check deployment status.",
        clear: "Clear",
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
            <h3>${t(language, "title")}</h3>
            <p>${t(language, "subtitle")}</p>
          </div>
        </div>
      </div>
      <div class="blog-ai-messages" aria-live="polite"></div>
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

    function addMessage(content, isUser) {
      const msg = document.createElement("div");
      msg.className = "blog-ai-message" + (isUser ? " blog-ai-message-user" : " blog-ai-message-ai");
      if (isUser) {
        msg.textContent = content;
      } else {
        // Only parse as markdown for AI responses, escape errors properly
        const isError = content.includes("请求失败") || content.includes("Request failed") || content.includes("error");
        if (isError) {
          // For error messages, just escape HTML and show as plain text
          const errorDiv = document.createElement("div");
          errorDiv.className = "blog-ai-error";
          errorDiv.textContent = content;
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
          addMessage(t(language, "errorNetlify"), false);
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
