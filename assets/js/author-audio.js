(() => {
  const zh = document.documentElement.lang.startsWith("zh");
  const say = (cn, en) => (zh ? cn : en);
  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      value === null
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  const all = () => document.querySelectorAll("[data-author-audio] audio");
  for (const panel of document.querySelectorAll("[data-author-audio]")) {
    if (panel.dataset.audioBound) continue;
    panel.dataset.audioBound = "true";
    const tracks = [...panel.querySelectorAll("[data-audio-track]")],
      select = panel.querySelector("[data-audio-track-select]");
    let current = tracks[0];
    function choose(id) {
      const next = tracks.find((t) => t.dataset.audioTrack === id) || tracks[0];
      for (const track of tracks) {
        track.hidden = track !== next;
        if (track !== next) track.querySelector("audio").pause();
      }
      current = next;
      const preferredSpeed = read("author-audio:speed");
      if ([1, 1.25, 1.5, 2].includes(preferredSpeed)) {
        next.querySelector("audio").playbackRate = preferredSpeed;
        next.querySelector("[data-audio-speed]").value = String(preferredSpeed);
      }
      if (select) select.value = next.dataset.audioTrack;
      panel.querySelector("[data-audio-label]").textContent =
        next.dataset.audioTitle;
      panel.querySelector("[data-audio-duration]").textContent =
        next.dataset.audioLength;
    }
    function play(track) {
      const status = track.querySelector("[data-audio-status]");
      track
        .querySelector("audio")
        .play()
        .catch(() => {
          if (!status.textContent)
            status.textContent = say(
              "点击下方播放按钮继续。",
              "Use the play button below to continue.",
            );
        });
    }
    choose(current.dataset.audioTrack);
    panel.querySelector(":scope > summary").addEventListener("click", () => {
      if (panel.open) tracks.forEach((t) => t.querySelector("audio").pause());
      else play(current);
    });
    panel.addEventListener("toggle", () => {
      if (!panel.open) tracks.forEach((t) => t.querySelector("audio").pause());
    });
    select?.addEventListener("change", () => {
      const playing = !current.querySelector("audio").paused;
      choose(select.value);
      if (playing) play(current);
    });
    for (const track of tracks) {
      const audio = track.querySelector("audio"),
        status = track.querySelector("[data-audio-status]"),
        speed = track.querySelector("[data-audio-speed]");
      const key = "author-audio:" + track.dataset.audioTrack;
      const saved = read(key);
      if (Number.isFinite(saved?.time) && saved.time >= 5)
        status.textContent = say(
          "播放时会从上次停下的位置继续。",
          "Playback resumes where you left off.",
        );
      const savedSpeed = read("author-audio:speed");
      if ([1, 1.25, 1.5, 2].includes(savedSpeed)) {
        audio.playbackRate = savedSpeed;
        speed.value = String(savedSpeed);
      }
      let lastSaved = 0;
      const remember = () => {
        if (audio.currentTime >= 5 && !audio.ended)
          write(key, { time: audio.currentTime });
      };
      audio.addEventListener(
        "loadedmetadata",
        () => {
          if (
            Number.isFinite(saved?.time) &&
            saved.time >= 5 &&
            saved.time < audio.duration - 2
          )
            audio.currentTime = saved.time;
        },
        { once: true },
      );
      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime - lastSaved >= 5) {
          remember();
          lastSaved = audio.currentTime;
        }
      });
      audio.addEventListener("pause", remember);
      audio.addEventListener("ended", () => write(key, null));
      audio.addEventListener("play", () => {
        for (const other of all()) if (other !== audio) other.pause();
        status.textContent = "";
        if ("mediaSession" in navigator && "MediaMetadata" in window)
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.dataset.audioTitle,
            artist: "Xinwei Xiong",
            album: document.title,
          });
      });
      const failed = () => {
        status.textContent = say(
          "这段声音暂时无法加载，可以先阅读文字稿。",
          "Audio could not load. You can read the transcript instead.",
        );
      };
      audio.addEventListener("error", failed);
      audio.querySelector("source")?.addEventListener("error", failed);
      speed.addEventListener("change", () => {
        const value = Number(speed.value);
        audio.playbackRate = value;
        write("author-audio:speed", value);
      });
      const heading =
        track.dataset.audioAnchor &&
        document.getElementById(track.dataset.audioAnchor);
      if (heading && /^H[23]$/.test(heading.tagName)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "author-audio-section";
        const sync = () => {
          const active = !audio.paused && !audio.ended;
          button.textContent = active
            ? say("暂停讲解", "Pause explanation")
            : say("听这一节", "Hear this section");
          button.setAttribute("aria-pressed", String(active));
        };
        sync();
        button.addEventListener("click", () => {
          if (!audio.paused) audio.pause();
          else {
            choose(track.dataset.audioTrack);
            panel.open = true;
            play(track);
          }
        });
        for (const event of ["play", "pause", "ended"])
          audio.addEventListener(event, sync);
        heading.insertAdjacentElement("afterend", button);
      }
      window.addEventListener("pagehide", () => {
        remember();
        audio.pause();
      });
    }
  }
})();
