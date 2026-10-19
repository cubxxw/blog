const $ = (id) => document.getElementById(id),
  recordings = new Map();
let articles = [],
  current = null,
  articleVersion = null,
  draftVersion = null,
  drafting = false,
  scopeKey = null,
  scriptDrafts = new Map(),
  timer,
  recordingActive = false;
const notice = (text) => {
  $("notice").textContent = text;
};
async function api(route, data) {
  const r = await fetch(
    "/api/" + route,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const value = await r.json();
  if (!r.ok) throw Error(value.error || "本机工具暂时无法连接。");
  return value;
}
function base64(bytes) {
  let s = "";
  const array = new Uint8Array(bytes);
  for (let at = 0; at < array.length; at += 16384)
    s += String.fromCharCode(...array.subarray(at, at + 16384));
  return btoa(s);
}
async function normalize(blob, maxSeconds) {
  if (blob.size > 64 * 1024 * 1024)
    throw Error("文件过大，请先选取需要的片段。");
  const context = new AudioContext();
  let source;
  try {
    source = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    await context.close();
  }
  if (source.duration > maxSeconds)
    throw Error("这份录音太长，请控制在 " + maxSeconds + " 秒内。");
  const offline = new OfflineAudioContext(
      1,
      Math.ceil(source.duration * 24000),
      24000,
    ),
    node = offline.createBufferSource();
  node.buffer = source;
  node.connect(offline.destination);
  node.start();
  const audio = await offline.startRendering(),
    samples = audio.getChannelData(0),
    buffer = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(buffer);
  const ascii = (at, text) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(at + i, text.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, buffer.byteLength - 44, true);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      44 + i * 2,
      sample < 0 ? sample * 32768 : sample * 32767,
      true,
    );
  }
  return {
    data: base64(buffer),
    duration: source.duration,
    blob: new Blob([buffer], { type: "audio/wav" }),
  };
}
for (const box of document.querySelectorAll("[data-slot]")) {
  const slot = box.dataset.slot,
    start = box.querySelector("[data-record]"),
    stop = box.querySelector("[data-stop]"),
    status = box.querySelector("[data-record-status]"),
    audio = box.querySelector("audio"),
    limit = slot === "reference" ? 30 : slot === "consent" ? 60 : 900;
  let recorder, stream, limitTimer, elapsedTimer, started;
  async function accept(blob) {
    status.textContent = "正在本机转换录音…";
    const result = await normalize(blob, limit);
    const old = recordings.get(slot);
    if (old?.url) URL.revokeObjectURL(old.url);
    result.url = URL.createObjectURL(result.blob);
    recordings.set(slot, result);
    audio.src = result.url;
    audio.hidden = false;
    status.textContent =
      "已准备 " + result.duration.toFixed(1) + " 秒，尚未上传。";
  }
  start.onclick = async () => {
    if (recordingActive) {
      notice("请先结束正在进行的录音。");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingActive = true;
      recorder = new MediaRecorder(stream);
      const parts = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      recorder.onstop = async () => {
        clearTimeout(limitTimer);
        clearInterval(elapsedTimer);
        stream.getTracks().forEach((t) => t.stop());
        recordingActive = false;
        start.hidden = false;
        stop.hidden = true;
        try {
          await accept(new Blob(parts, { type: recorder.mimeType }));
        } catch (e) {
          status.textContent = e.message;
        }
      };
      recorder.start();
      start.hidden = true;
      stop.hidden = false;
      started = Date.now();
      elapsedTimer = setInterval(
        () =>
          (status.textContent =
            "正在录音 · " + Math.floor((Date.now() - started) / 1000) + " 秒"),
        250,
      );
      limitTimer = setTimeout(() => stop.click(), (limit - 1) * 1000);
    } catch {
      recordingActive = false;
      stream?.getTracks().forEach((t) => t.stop());
      status.textContent = "麦克风未开启。可以允许录音，或直接选择录音文件。";
    }
  };
  stop.onclick = () => {
    if (recorder?.state === "recording") recorder.stop();
  };
  box.querySelector("input[type=file]").onchange = async (e) => {
    if (!e.target.files[0]) return;
    try {
      await accept(e.target.files[0]);
    } catch (error) {
      status.textContent = error.message;
    }
  };
  window.addEventListener("pagehide", () => {
    clearTimeout(limitTimer);
    clearInterval(elapsedTimer);
    if (recorder?.state === "recording") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
  });
}
function showArticles(load = true) {
  const search = $("article-search").value.toLowerCase(),
    before = $("article").value;
  $("article").replaceChildren();
  for (const a of articles.filter((a) =>
    a.title.toLowerCase().includes(search),
  )) {
    const option = document.createElement("option");
    option.value = a.file;
    option.textContent = a.title + (a.hasAudio ? "（已有声音）" : "");
    $("article").append(option);
  }
  if ([...$("article").options].some((o) => o.value === before))
    $("article").value = before;
  if (load) loadArticle();
}
async function loadArticle() {
  const file = $("article").value;
  $("questions").replaceChildren();

  articleVersion = null;
  $("section").replaceChildren();
  if (!file) return;
  try {
    const a = await api("article?file=" + encodeURIComponent(file));
    if (file !== $("article").value) return;
    articleVersion = a.sourceHash;
    for (const section of a.sections || []) {
      const option = document.createElement("option");
      option.value = section.key;
      option.textContent = section.title;
      $("section").append(option);
    }
    switchScriptScope();
    for (const q of a.questions) {
      const li = document.createElement("li");
      li.textContent = q;
      $("questions").append(li);
    }
  } catch (error) {
    notice(error.message);
  }
}
function renderJob(job) {
  current = job;
  $("cancel").hidden = job.status !== "preparing";
  $("result").hidden = false;
  $("result-article").textContent = job.title || "";
  $("result-text").textContent = job.text || "";
  $("job-state").textContent =
    job.status === "preparing"
      ? "正在准备声音 · " + job.completed + " / " + job.total + " 部分"
      : job.status === "ready"
        ? "声音已准备好，请试听并核对文字。"
        : job.error || "这次操作已停止。";
  const ready = job.status === "ready" && job.type === "audio";
  $("preview").hidden = !ready;
  $("review").hidden = !ready;
  $("reviewed").checked = false;
  $("publish").disabled = !!job.published;
  $("publish").textContent = job.published
    ? "已加入本地文章"
    : "确认并加入文章";
  if (ready && $("preview").getAttribute("src") !== job.audio)
    $("preview").src = job.audio;
}
async function refresh() {
  clearTimeout(timer);
  const state = await api("state");
  $("connection").textContent = state.configured
    ? "Google 官方 Gemini · 已读取本机配置"
    : "尚未配置 Gemini";
  $("voice-state").textContent = state.voice.ready
    ? state.voice.type === "prebuilt"
      ? "当前旁白：" + state.voice.name + " · 通用 AI 音色，清晰、平静地讲解文章。"
      : "你的个人声音已保存，之后的文章会复用它。"
    : "保存的声音配置无效，请检查配置，或使用你亲口录制的原声。";
  $("generate").disabled = !state.configured || !state.voice.ready || state.busy || drafting;
  $("draft-script").disabled =
    state.busy ||
    drafting ||
    !state.configured ||
    !["summary", "section", "dialogue"].includes($("kind").value);
  $("create-voice").disabled = state.busy;
  $("use-recording").disabled = state.busy;
  $("history").replaceChildren();
  for (const j of state.jobs.filter(
    (j) => j.type === "audio" || j.type === "script",
  )) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent =
      (j.type === "script" ? "讲解稿 · " : "声音 · ") +
      (j.title || "文章") +
      " · " +
      ({
        ready: j.type === "script" ? "可编辑" : "可试听",
        preparing: "正在准备",
        failed: "未完成",
        interrupted: "已中断",
      }[j.status] || j.status);
    button.onclick = async () => {
      if (j.type !== "script") {
        renderJob(j);
        return;
      }
      if (j.status !== "ready") {
        notice(j.error || "稿件未准备好。");
        return;
      }
      $("article-search").value = "";
      showArticles(false);
      $("article").value = j.article;
      await loadArticle();
      $("kind").value = j.kind;
      $("section").value = j.sectionKey || "";
      const section = j.kind === "section";
      $("section").hidden = !section;
      $("section-label").hidden = !section;
      switchScriptScope();
      $("script").value = j.text;
      draftVersion = j.sourceHash;
      $("script").dispatchEvent(new Event("input"));
      notice(
        articleVersion === j.sourceHash
          ? "已恢复讲解稿，请核对后生成声音。"
          : "正文已变化，这份旧稿仅供参考，请重新整理。",
      );
      await refresh();
    };
    $("history").append(button);
  }
  if (current) {
    const updated = state.jobs.find((j) => j.id === current.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(current))
      renderJob(updated);
  }
  if (state.busy)
    timer = setTimeout(() => refresh().catch((e) => notice(e.message)), 1200);
}
async function action(button, run) {
  button.disabled = true;
  notice("");
  try {
    await run();
  } catch (error) {
    notice(error.message);
  } finally {
    await refresh()
      .then(() => {
        if (button.id === "publish") {
          button.disabled = !!current?.published;
          button.textContent = current?.published
            ? "已加入本地文章"
            : "确认并加入文章";
        } else if (button.id === "cancel") button.disabled = false;
      })
      .catch((e) => {
        notice(e.message);
        button.disabled = false;
      });
  }
}
$("create-voice").onclick = () =>
  action($("create-voice"), async () => {
    if (!recordings.has("reference") || !recordings.has("consent"))
      throw Error("请先准备参考录音和授权录音。");
    if (!$("consent-confirmed").checked)
      throw Error("请确认两份录音属于你本人，并同意创建声音。");
    notice("正在由 Google 核验并创建个人声音，请稍候…");
    await api("voice", {
      requestId: crypto.randomUUID(),
      reference: recordings.get("reference").data,
      consent: recordings.get("consent").data,
      confirmed: true,
    });
    notice("个人声音已保存，可以开始准备第一篇音频。");
  });
const input = () => ({
  requestId: crypto.randomUUID(),
  article: $("article").value,
  text: $("script").value,
  kind: $("kind").value,
  sectionKey: $("section").value,
  sourceHash: draftVersion || articleVersion,
});
$("draft-script").onclick = () =>
  action($("draft-script"), async () => {
    if ($("script").value.trim()) {
      notice("请先保留或清空当前稿件，再重新整理。");
      return;
    }
    drafting = true;
    $("generate").disabled = true;
    notice("正在依据原文整理讲解稿…");
    try {
      const request = input();
      const draft = await api("draft", request);
      if (
        request.article !== $("article").value ||
        request.kind !== $("kind").value ||
        request.sectionKey !== $("section").value
      )
        throw Error("文章或章节已切换，未覆盖当前稿件。原稿保存在本机任务中。");
      if (draft.status !== "ready")
        throw Error(draft.error || "稿件尚未准备好。");
      $("script").value = draft.text;
      draftVersion = draft.sourceHash;
      $("script").dispatchEvent(new Event("input"));
      notice("讲解稿已整理，请核对原文并修改，再用你的声音生成。");
    } finally {
      drafting = false;
    }
  });
function switchScriptScope() {
  if (scopeKey)
    scriptDrafts.set(scopeKey, {
      text: $("script").value,
      version: draftVersion,
    });
  scopeKey = JSON.stringify([
    $("article").value,
    $("kind").value,
    $("kind").value === "section" ? $("section").value : "",
  ]);
  const saved = scriptDrafts.get(scopeKey);
  $("script").value = saved?.text || "";
  draftVersion = saved?.version || null;
  $("script").dispatchEvent(new Event("input"));
}
$("section").onchange = switchScriptScope;
$("kind").onchange = () => {
  const isSection = $("kind").value === "section";
  $("section").hidden = !isSection;
  $("section-label").hidden = !isSection;
  switchScriptScope();
  refresh().catch((e) => notice(e.message));
};
$("generate").onclick = () =>
  action($("generate"), async () => {
    renderJob(await api("generate", input()));
  });
$("cancel").onclick = () =>
  action($("cancel"), async () => {
    if (current) renderJob(await api("cancel", { id: current.id }));
  });
$("use-recording").onclick = () =>
  action($("use-recording"), async () => {
    if (!recordings.has("original"))
      throw Error("请先录制或选择一份真人原声。");
    renderJob(
      await api("recording", {
        ...input(),
        audio: recordings.get("original").data,
      }),
    );
  });
$("publish").onclick = () =>
  action($("publish"), async () => {
    if (!$("reviewed").checked) throw Error("请先试听并勾选确认。");
    const result = await api("publish", { id: current.id, reviewed: true });
    current = result;
    notice("已加入本地文章。音频和文字稿会随博客原有流程发布。");
  });
$("article-search").oninput = showArticles;
$("article").onchange = loadArticle;
$("script").oninput = () => {
  const length = Array.from($("script").value).length;
  $("estimate").textContent = length
    ? length +
      " 字 · 预计约 " +
      Math.max(1, Math.ceil(length / 240)) +
      " 分钟，实际时长取决于表达。"
    : "建议先准备 150–600 字。长稿会自动分段，不丢内容。";
};
try {
  const token = location.hash.slice(1);
  if (token) {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "x-author-token": token, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok)
      throw Error("启动链接已失效，请使用本机工具新显示的链接。");
    history.replaceState(null, "", location.pathname);
  }
  articles = await api("articles");
  showArticles();
  await refresh();
} catch (error) {
  notice(error.message);
  $("connection").textContent = "连接未完成";
}
