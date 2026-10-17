(() => {
  for (const panel of document.querySelectorAll("[data-author-audio]")) {
    if (panel.dataset.audioBound) continue;
    panel.dataset.audioBound = "true";
    const audio = panel.querySelector("audio");
    const summary = panel.querySelector("summary");
    const status = panel.querySelector("[data-audio-status]");
    const zh = document.documentElement.lang.startsWith("zh");
    summary.addEventListener("click", () => {
      if (panel.open) audio.pause();
      else if (audio.paused) {
        audio.play().catch(() => {
          status.textContent = zh
            ? "点击下方播放按钮继续。"
            : "Use the play button below to continue.";
        });
      }
    });
    audio.addEventListener("play", () => {
      for (const other of document.querySelectorAll(
        "[data-author-audio] audio",
      )) {
        if (other !== audio) other.pause();
      }
      status.textContent = "";
    });
    const failed = () => {
      status.textContent = zh
        ? "这段声音暂时无法加载，可以阅读文字稿或下载音频。"
        : "Audio could not load. You can read the transcript or download the file.";
    };
    audio.addEventListener("error", failed);
    audio.querySelector("source")?.addEventListener("error", failed);
    panel
      .querySelector("[data-audio-speed]")
      .addEventListener("change", (event) => {
        audio.playbackRate = Number(event.target.value);
      });
    window.addEventListener("pagehide", () => audio.pause());
  }
})();
