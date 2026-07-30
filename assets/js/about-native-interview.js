const roots = document.querySelectorAll("[data-telepace-native]");

roots.forEach((root) => {
  const stages = new Map(
    Array.from(root.querySelectorAll("[data-interview-stage]")).map((stage) => [
      stage.dataset.interviewStage,
      stage,
    ]),
  );
  const topics = Array.from(root.querySelectorAll("[data-telepace-open]"));
  const status = root.querySelector("[data-telepace-status]");
  const skeleton = root.querySelector("[data-interview-skeleton]");
  const consentContent = root.querySelector("[data-interview-consent-content]");
  const welcome = root.querySelector("[data-interview-welcome]");
  const consentWrap = root.querySelector("[data-interview-consent-wrap]");
  const consentCopy = root.querySelector("[data-interview-consent-copy]");
  const consentInput = root.querySelector("[data-interview-consent]");
  const startButton = root.querySelector("[data-interview-start]");
  const progress = root.querySelector("[data-interview-progress]");
  const messages = root.querySelector("[data-interview-messages]");
  const thinking = root.querySelector("[data-interview-thinking]");
  const form = root.querySelector("[data-interview-form]");
  const answer = root.querySelector("[data-interview-answer]");
  const send = root.querySelector("[data-interview-send]");
  const completeCopy = root.querySelector("[data-interview-complete-copy]");
  const errorTitle = root.querySelector("[data-interview-error-title]");
  const errorCopy = root.querySelector("[data-interview-error-copy]");
  const fallback = root.querySelector("[data-interview-fallback]");
  const locale = root.dataset.locale === "zh" ? "zh" : "en";

  let sdkPromise = null;
  let sdkLoadAttempt = 0;
  let operationGeneration = 0;
  let client = null;
  let unsubscribe = null;
  let activeTopic = "";
  let previousPhase = "idle";

  function setStage(name) {
    stages.forEach((stage, stageName) => {
      stage.hidden = stageName !== name;
    });
  }

  function setStatus(value) {
    status.textContent = value || "";
  }

  function cleanupClient() {
    unsubscribe?.();
    unsubscribe = null;
    client?.destroy();
    client = null;
  }

  function resetLaunch() {
    operationGeneration += 1;
    cleanupClient();
    root.dataset.state = "idle";
    previousPhase = "idle";
    activeTopic = "";
    topics.forEach((topic) => {
      topic.disabled = false;
      topic.removeAttribute("aria-pressed");
    });
    consentInput.checked = false;
    answer.value = "";
    messages.replaceChildren();
    setStatus("");
    setStage("launch");
  }

  function renderMessages(items) {
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const row = document.createElement("li");
      row.dataset.role = item.role;
      const role = document.createElement("span");
      role.textContent =
        item.role === "respondent"
          ? locale === "zh"
            ? "我"
            : "ME"
          : locale === "zh"
            ? "访谈员"
            : "INTERVIEWER";
      const body = document.createElement("p");
      body.textContent = item.text;
      row.append(role, body);
      fragment.append(row);
    });
    messages.replaceChildren(fragment);
    messages.scrollTop = messages.scrollHeight;
  }

  function render(state) {
    root.dataset.state = state.phase;

    if (state.phase === "loading") {
      setStage("consent");
      skeleton.hidden = false;
      consentContent.hidden = true;
      setStatus(root.dataset.copyLoading);
    } else if (state.phase === "consent") {
      setStage("consent");
      skeleton.hidden = true;
      consentContent.hidden = false;
      welcome.textContent =
        state.campaign?.welcome_message || root.dataset.copyDefaultWelcome;
      const requiresConsent = Boolean(state.campaign?.consent_text);
      consentWrap.hidden = !requiresConsent;
      consentCopy.textContent = state.campaign?.consent_text || "";
      consentInput.checked = false;
      startButton.disabled = requiresConsent;
      startButton.dataset.busy = "false";
      setStatus("");
    } else if (state.phase === "authorizing" || state.phase === "connecting") {
      setStage("consent");
      skeleton.hidden = true;
      consentContent.hidden = false;
      startButton.disabled = true;
      startButton.dataset.busy = "true";
      setStatus(root.dataset.copyConnecting);
    } else if (state.phase === "asking" || state.phase === "thinking") {
      setStage("chat");
      renderMessages(state.messages);
      const hasProgress = state.progress.total > 0;
      progress.textContent = hasProgress
        ? `${root.dataset.copyQuestion} ${state.progress.current || 1} / ${state.progress.total}`
        : root.dataset.copyQuestion;
      const isThinking = state.phase === "thinking";
      thinking.hidden = !isThinking;
      thinking.textContent = isThinking ? root.dataset.copyThinking : "";
      answer.disabled = isThinking;
      send.disabled = isThinking;
      send.textContent = isThinking
        ? root.dataset.copySending
        : root.dataset.copySend;
      setStatus(isThinking ? root.dataset.copyThinking : "");
      if (state.phase === "asking" && previousPhase !== "asking") {
        requestAnimationFrame(() => answer.focus({ preventScroll: true }));
      }
    } else if (state.phase === "complete") {
      setStage("complete");
      completeCopy.textContent =
        state.completion?.endMessage ||
        (locale === "zh"
          ? "你的回答会成为下一次改进的证据。"
          : "Your answer becomes evidence for the next iteration.");
      setStatus("");
      root.dispatchEvent(
        new CustomEvent("telepace-complete", {
          detail: {
            source: state.source,
            answerCount: state.answerCount,
          },
        }),
      );
    } else if (state.phase === "error") {
      setStage("error");
      errorTitle.textContent = root.dataset.copyErrorTitle;
      errorCopy.textContent = root.dataset.copyErrorBody;
      fallback.hidden = false;
      setStatus(state.error?.message || root.dataset.copyErrorBody);
      root.dispatchEvent(
        new CustomEvent("telepace-error", {
          detail: state.error || { code: "unknown_error" },
        }),
      );
    } else if (state.phase === "closed") {
      resetLaunch();
      return;
    }

    if (state.phase === "asking" && previousPhase !== "asking") {
      root.dispatchEvent(
        new CustomEvent("telepace-started", {
          detail: { source: state.source },
        }),
      );
    }
    previousPhase = state.phase;
  }

  function loadSdk() {
    if (!sdkPromise) {
      const moduleUrl = new URL(root.dataset.sdkSrc, document.baseURI);
      if (sdkLoadAttempt > 0) {
        moduleUrl.searchParams.set("retry", String(sdkLoadAttempt));
      }
      sdkLoadAttempt += 1;
      sdkPromise = import(moduleUrl.href).catch((error) => {
        sdkPromise = null;
        throw error;
      });
    }
    return sdkPromise;
  }

  async function beginTopic(topic) {
    const operation = ++operationGeneration;
    cleanupClient();
    activeTopic = topic;
    topics.forEach((button) => {
      const active = button.dataset.telepaceTopic === topic;
      button.disabled = true;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    setStage("consent");
    skeleton.hidden = false;
    consentContent.hidden = true;
    setStatus(root.dataset.copyLoading);

    if (!root.dataset.campaignId) {
      render({
        phase: "error",
        source: `about-me-${topic}`,
        error: {
          code: "campaign_not_configured",
          message:
            locale === "zh"
              ? "正式访谈还没有发布。"
              : "The live interview has not been published yet.",
        },
      });
      return;
    }

    try {
      const sdk = await loadSdk();
      if (operation !== operationGeneration) return;

      const nextClient = sdk.createTelepaceInterview({
        campaignId: root.dataset.campaignId,
        apiUrl: root.dataset.apiUrl,
        wsUrl: root.dataset.wsUrl,
        locale,
        source: `about-me-${topic}`,
      });
      client = nextClient;
      unsubscribe = nextClient.subscribe((state) => {
        if (operation === operationGeneration) render(state);
      });
      await nextClient.load();
      if (operation !== operationGeneration) {
        nextClient.destroy();
      }
    } catch (error) {
      if (operation !== operationGeneration) return;
      render({
        phase: "error",
        source: `about-me-${topic}`,
        error: {
          code: "sdk_unavailable",
          message: error instanceof Error ? error.message : "SDK unavailable",
        },
      });
    }
  }

  topics.forEach((topic) => {
    topic.addEventListener("click", () => {
      void beginTopic(topic.dataset.telepaceTopic);
    });
  });

  root.querySelectorAll("[data-interview-back], [data-interview-close]").forEach((button) => {
    button.addEventListener("click", resetLaunch);
  });

  consentInput.addEventListener("change", () => {
    startButton.disabled = !consentInput.checked;
  });

  startButton.addEventListener("click", () => {
    if (!client) return;
    void client.start({ consent: consentWrap.hidden || consentInput.checked });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!client) return;
    if (client.reply(answer.value)) answer.value = "";
  });

  answer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    form.requestSubmit();
  });

  root.querySelector("[data-interview-restart]").addEventListener("click", () => {
    if (client) {
      void client.restart({ consent: true });
    } else if (activeTopic) {
      void beginTopic(activeTopic);
    }
  });

  root.querySelector("[data-interview-retry]").addEventListener("click", () => {
    if (client?.retry?.()) return;
    void beginTopic(activeTopic || "first-impression");
  });

  window.addEventListener("pagehide", cleanupClient, { once: true });
});
