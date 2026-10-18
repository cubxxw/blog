(() => {
  const say = (cn, en) => document.documentElement.lang.startsWith("zh") ? cn : en;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => {
    try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const validSpeed = value => Number.isFinite(value) && value >= 0.25 && value <= 3;
  const clock = value => {
    const seconds = Math.max(0, Math.round(Number(value) || 0));
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  };
  const allAudio = () => document.querySelectorAll("[data-author-audio] audio");
  for (const panel of document.querySelectorAll("[data-author-audio]")) {
    if (panel.dataset.audioBound) continue;
    const tracks = [...panel.querySelectorAll("[data-audio-track]")];
    const buttons = [...panel.querySelectorAll("[data-audio-track-button]")];
    const controls = new Map();
    let current = tracks[0];
    function choose(id) {
      const next = tracks.find(track => track.dataset.audioTrack === id) || tracks[0];
      for (const track of tracks) {
        if (track !== next) controls.get(track).pause();
        track.hidden = track !== next;
      }
      current = next;
      controls.get(next).preferredSpeed();
      for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.audioTrackButton === id));
    }
    for (const track of tracks) {
      const audio = track.querySelector("audio");
      const player = track.querySelector("[data-audio-player]");
      const toggle = track.querySelector("[data-audio-toggle]");
      const seek = track.querySelector("[data-audio-seek]");
      const speed = track.querySelector("[data-audio-speed]");
      const status = track.querySelector("[data-audio-status]");
      const copy = track.querySelector("[data-audio-copy]");
      const key = "author-audio:" + track.dataset.audioTrack;
      const fallbackDuration = Number(track.dataset.audioSeconds) || 0;
      const saved = read(key);
      let target = Number.isFinite(saved?.time) && saved.time >= 5 && saved.time < fallbackDuration - 2 ? saved.time : 0;
      let lastSaved = 0, requested = false, attempt = 0;
      const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : fallbackDuration;
      function renderTime() {
        const time = audio.readyState > 0 ? audio.currentTime : target;
        seek.max = String(duration());
        seek.value = String(time);
        seek.setAttribute("aria-valuetext", clock(time) + " / " + clock(duration()));
        track.querySelector("[data-audio-clock]").textContent = clock(time) + " / " + clock(duration());
      }
      function state(value) {
        player.dataset.state = value;
        player.setAttribute("aria-busy", String(value === "loading"));
        toggle.setAttribute("aria-pressed", String(value === "playing" || value === "loading"));
        toggle.setAttribute("aria-label", value === "error" ? say("重试播放", "Retry playback") : value === "loading" ? say("取消加载", "Cancel loading") : value === "playing" ? say("暂停讲解", "Pause explanation") : say("播放讲解", "Play explanation"));
      }
      function syncSpeed(value) {
        if (![...speed.options].some(option => Number(option.value) === value)) {
          const option = document.createElement("option");
          option.value = String(value); option.textContent = value + "×"; speed.append(option);
        }
        speed.value = String(value);
      }
      function preferredSpeed() {
        const value = read("author-audio:speed");
        if (validSpeed(value)) { audio.playbackRate = value; syncSpeed(value); }
      }
      function remember() {
        if (audio.readyState > 0) target = audio.currentTime;
        if (target >= 5 && !audio.ended) write(key, { time: target });
      }
      function pause() {
        requested = false; attempt++;
        audio.pause();
        if (player.dataset.state === "loading") status.textContent = "";
        if (player.dataset.state !== "error") state("paused");
      }
      const failed = () => {
        requested = false;
        state("error");
        status.textContent = say("这段声音暂时无法加载，可以先阅读文字稿，或重试播放。", "Audio could not load. Read the transcript or retry playback.");
      };
      function play() {
        for (const other of allAudio()) if (other !== audio) other.pause();
        if (audio.error || player.dataset.state === "error") audio.load();
        requested = true;
        const token = ++attempt;
        state("loading");
        status.textContent = say("正在加载音频…", "Loading audio…");
        preferredSpeed();
        audio.play().catch(error => {
          if (token !== attempt || !requested || error.name === "AbortError") return;
          requested = false;
          if (error.name === "NotAllowedError") {
            state("paused");
            status.textContent = say("浏览器暂停了播放，请再点一次播放按钮。", "Playback was blocked. Press play to continue.");
          } else failed();
        });
      }
      controls.set(track, { pause, play, preferredSpeed });
      toggle.addEventListener("click", () => {
        if (player.dataset.state === "error") play();
        else if (requested || !audio.paused) pause();
        else play();
      });
      seek.addEventListener("input", () => {
        target = Math.min(Number(seek.value), duration());
        if (audio.readyState > 0) audio.currentTime = target;
        renderTime();
        if (!audio.ended) write(key, { time: target });
      });
      audio.addEventListener("loadedmetadata", () => {
        if (target > 0) audio.currentTime = Math.min(target, duration());
        renderTime();
      });
      audio.addEventListener("durationchange", renderTime);
      audio.addEventListener("timeupdate", () => {
        renderTime();
        if (audio.currentTime - lastSaved >= 5) { remember(); lastSaved = audio.currentTime; }
      });
      audio.addEventListener("pause", () => {
        requested = false; remember();
        if (player.dataset.state === "loading") status.textContent = "";
        if (player.dataset.state !== "error") state("paused");
      });
      audio.addEventListener("ended", () => {
        requested = false; write(key, null); state("paused"); renderTime();
      });
      audio.addEventListener("waiting", () => {
        if (requested || !audio.paused) { state("loading"); status.textContent = say("正在缓冲…", "Buffering…"); }
      });
      audio.addEventListener("playing", () => { requested = true; state("playing"); status.textContent = ""; });
      audio.addEventListener("play", () => {
        for (const other of allAudio()) if (other !== audio) other.pause();
        if ("mediaSession" in navigator && "MediaMetadata" in window)
          navigator.mediaSession.metadata = new MediaMetadata({ title: track.dataset.audioTitle, artist: "Xinwei Xiong", album: document.title });
      });
      audio.addEventListener("ratechange", () => {
        if (validSpeed(audio.playbackRate)) { syncSpeed(audio.playbackRate); write("author-audio:speed", audio.playbackRate); }
      });
      audio.addEventListener("error", failed);
      audio.querySelector("source")?.addEventListener("error", failed);
      speed.addEventListener("change", () => {
        const value = Number(speed.value);
        if (validSpeed(value)) { audio.playbackRate = value; write("author-audio:speed", value); }
      });
      copy.addEventListener("click", async () => {
        const text = [...track.querySelectorAll("[data-audio-transcript-text] p")].map(p => p.textContent).join("\n\n");
        try {
          await navigator.clipboard.writeText(text);
          status.textContent = say("文字稿已复制。", "Transcript copied.");
        } catch {
          const range = document.createRange();
          range.selectNodeContents(track.querySelector("[data-audio-transcript-text]"));
          const selection = window.getSelection();
          selection.removeAllRanges(); selection.addRange(range);
          status.textContent = say("已选中文字稿，可使用系统复制。", "Transcript selected. Use your device's Copy command.");
        }
      });
      const heading = track.dataset.audioAnchor && document.getElementById(track.dataset.audioAnchor);
      if (heading && /^H[23]$/.test(heading.tagName)) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "author-audio-section";
        const sync = () => {
          const active = !audio.paused && !audio.ended;
          button.textContent = active ? say("暂停讲解", "Pause explanation") : say("听这一节", "Hear this section");
          button.setAttribute("aria-pressed", String(active));
        };
        sync();
        button.addEventListener("click", () => {
          if (!audio.paused || (current === track && requested)) pause();
          else { choose(track.dataset.audioTrack); panel.open = true; play(); }
        });
        for (const event of ["play", "pause", "ended"]) audio.addEventListener(event, sync);
        heading.insertAdjacentElement("afterend", button);
      }
      preferredSpeed(); renderTime(); state("paused");
      if (target >= 5) status.textContent = say("播放时会从上次停下的位置继续。", "Playback resumes where you left off.");
      player.hidden = false; copy.hidden = false;
      window.addEventListener("pagehide", () => { remember(); pause(); });
    }
    for (const button of buttons) button.addEventListener("click", () => choose(button.dataset.audioTrackButton));
    panel.querySelector("[data-audio-choices]")?.removeAttribute("hidden");
    // Disclosure only opens the reader; playback always needs its own gesture.
    panel.querySelector(":scope > summary").addEventListener("click", () => {
      if (panel.open) for (const control of controls.values()) control.pause();
    });
    panel.addEventListener("toggle", () => {
      if (!panel.open) for (const control of controls.values()) control.pause();
    });
    choose(current.dataset.audioTrack);
    panel.dataset.audioBound = "true";
  }
})();
