(function () {
  const endpoint = "/.netlify/functions/subscribe-email";

  function initSubscribeCards() {
    document.querySelectorAll("[data-subscribe-card]").forEach((card) => {
      const teaser = card.querySelector("[data-subscribe-teaser]");
      const panels = card.querySelectorAll("[data-subscribe-panel]");

      function showPanel(kind) {
        if (teaser) {
          teaser.hidden = true;
        }

        panels.forEach((panel) => {
          const active = panel.getAttribute("data-subscribe-panel") === kind;
          panel.hidden = !active;
          if (active && kind === "email") {
            const input = panel.querySelector('input[name="email"]');
            if (input) {
              window.setTimeout(() => input.focus(), 50);
            }
          }
        });
      }

      function showTeaser() {
        if (teaser) {
          teaser.hidden = false;
        }
        panels.forEach((panel) => {
          panel.hidden = true;
        });
      }

      card.querySelectorAll("[data-subscribe-open]").forEach((button) => {
        button.addEventListener("click", function () {
          showPanel(this.getAttribute("data-subscribe-open"));
        });
      });

      card.querySelectorAll("[data-subscribe-back]").forEach((button) => {
        button.addEventListener("click", showTeaser);
      });

      showTeaser();
    });
  }

  function inferLanguage(form) {
    const formLanguage = form.getAttribute("data-language") || "";
    if (formLanguage) {
      return formLanguage;
    }

    const htmlLanguage = document.documentElement.getAttribute("lang") || "";
    if (htmlLanguage.startsWith("zh")) return "zh";
    return "en";
  }

  function t(language, key) {
    const dict = {
      zh: {
        idle: "输入邮箱后即可订阅。",
        submitting: "正在提交，请稍候...",
        success: "提交成功，请去邮箱完成确认。",
        duplicate: "这个邮箱已经订阅过，或正在等待确认。",
        consent: "请先勾选同意接收邮件。",
        invalid: "请输入有效邮箱。",
        error: "订阅失败，请稍后重试。",
      },
      en: {
        idle: "Enter your email to subscribe.",
        submitting: "Submitting...",
        success: "Success. Please check your inbox to confirm.",
        duplicate: "This address is already subscribed or pending confirmation.",
        consent: "Please agree to receive email updates first.",
        invalid: "Please enter a valid email address.",
        error: "Subscription failed. Please try again later.",
      },
    };

    const pack = dict[language] || dict.en;
    return pack[key] || dict.en[key] || key;
  }

  function setStatus(form, message, state) {
    const status = form.querySelector("[data-newsletter-status]");
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.state = state || "idle";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function onSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const language = inferLanguage(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const email = String(form.elements.email?.value || "").trim();
    const topic = String(form.elements.topic?.value || "general").trim();
    const consent = Boolean(form.elements.consent?.checked);
    const company = String(form.elements.company?.value || "").trim();

    if (!isValidEmail(email)) {
      setStatus(form, t(language, "invalid"), "error");
      return;
    }

    if (!consent) {
      setStatus(form, t(language, "consent"), "error");
      return;
    }

    setStatus(form, t(language, "submitting"), "loading");
    submitButton.disabled = true;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          language,
          topic,
          sourcePath: window.location.pathname,
          sourceType: form.getAttribute("data-source-type") || "page",
          userAgent: navigator.userAgent,
          company,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        form.reset();
        setStatus(form, data.message || t(language, "success"), "success");
        return;
      }

      if (response.status === 409) {
        setStatus(form, data.error || t(language, "duplicate"), "warning");
        return;
      }

      setStatus(form, data.error || t(language, "error"), "error");
    } catch (_) {
      setStatus(form, t(language, "error"), "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  function init() {
    initSubscribeCards();
    document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
      const language = inferLanguage(form);
      setStatus(form, t(language, "idle"), "idle");
      form.addEventListener("submit", onSubmit);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
