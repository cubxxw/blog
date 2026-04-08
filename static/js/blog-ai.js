(function () {
  const endpoint = "/.netlify/functions/blog-ai";

  function inferLanguage() {
    const lang = document.documentElement.getAttribute("lang") || "";
    if (lang.startsWith("zh")) {
      return "zh";
    }
    if (lang.startsWith("de")) {
      return "de";
    }
    if (lang.startsWith("es")) {
      return "es";
    }
    if (lang.startsWith("fr")) {
      return "fr";
    }
    return "en";
  }

  function t(language, key) {
    const dict = {
      zh: {
        title: "博客 AI 助手",
        subtitle: "基于 content 目录结构和文章内容回答问题",
        placeholder: "比如：帮我分析这个博客的 AI 相关文章结构，并先问我想做什么",
        ask: "提问",
        loading: "分析中...",
        empty: "请输入问题。",
        error: "请求失败，请检查 Netlify 环境变量和函数日志。",
      },
      en: {
        title: "Blog AI",
        subtitle: "Ask about the content structure and posts",
        placeholder: "Example: analyze the AI-related sections and ask what I want to build first",
        ask: "Ask",
        loading: "Thinking...",
        empty: "Please enter a question.",
        error: "Request failed. Check Netlify env vars and function logs.",
      },
    };

    const pack = dict[language] || dict.en;
    return pack[key] || dict.en[key] || key;
  }

  function createWidget() {
    const language = inferLanguage();
    const root = document.createElement("section");
    root.className = "blog-ai-widget";
    root.innerHTML = `
      <div class="blog-ai-card">
        <div class="blog-ai-head">
          <h3>${t(language, "title")}</h3>
          <p>${t(language, "subtitle")}</p>
        </div>
        <form class="blog-ai-form">
          <textarea class="blog-ai-input" rows="4" placeholder="${t(language, "placeholder")}"></textarea>
          <div class="blog-ai-actions">
            <button type="submit" class="blog-ai-submit">${t(language, "ask")}</button>
          </div>
          <div class="blog-ai-status" aria-live="polite"></div>
          <div class="blog-ai-answer"></div>
        </form>
      </div>
    `;

    const form = root.querySelector(".blog-ai-form");
    const input = root.querySelector(".blog-ai-input");
    const submit = root.querySelector(".blog-ai-submit");
    const status = root.querySelector(".blog-ai-status");
    const answer = root.querySelector(".blog-ai-answer");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) {
        status.textContent = t(language, "empty");
        return;
      }

      submit.disabled = true;
      status.textContent = t(language, "loading");
      answer.textContent = "";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question,
            language,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t(language, "error"));
        }

        answer.textContent = data.answer || "";
        status.textContent = data.model ? `Model: ${data.model}` : "";
      } catch (error) {
        clearTimeout(timeoutId);
        const msg = error.name === "AbortError"
          ? (language === "zh" ? "请求超时，请稍后重试。" : "Request timed out. Please try again.")
          : `${t(language, "error")} ${error.message}`;
        status.textContent = msg;
      } finally {
        submit.disabled = false;
      }
    });

    document.body.appendChild(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
