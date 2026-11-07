// Real, scoped YouTube playback for BEAR OS. Nothing remote loads until the
// user explicitly activates a video: before that there is no script, no iframe
// and no remote image. Playback uses the official YouTube iframe API against
// the fixed privacy-mode embed host; the original YouTube link always stays
// usable as the source fallback. All reference text is assigned with
// textContent, never as raw HTML.

import { buildYouTubeEmbedURL, canonicalWatchURL, formatVideoTime, inertTitle, normalizeVideoReference, parseYouTubeURL } from './video.mjs';
import { createVideoPositionStore } from './video-position.mjs';

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';
const API_TIMEOUT_MS = 12000;
const noop = () => {};
const t = language => {
  const zh = String(language || '').toLowerCase().startsWith('zh');
  return (cn, en) => (zh ? cn : en);
};

function statusMessage(label, status) {
  return ({
    idle: label('点击播放视频。', 'Click play to start the video.'),
    loading: label('正在准备 YouTube 播放器…', 'Preparing the YouTube player…'),
    ready: label('播放器已就绪。', 'Player ready.'),
    playing: label('正在播放。', 'Playing.'),
    paused: label('已暂停。', 'Paused.'),
    buffering: label('正在缓冲…', 'Buffering…'),
    ended: label('已播放完毕。', 'Playback finished.')
  })[status] || '';
}

// Factual error copy. 153 is an identification problem (missing HTTP Referer /
// client identification), never a missing video.
function errorMessage(label, code) {
  if (code === 100) return label('这个视频目前无法播放，可能已被移除或设为私密。可以在 YouTube 打开原链接确认，或重试。', 'This video cannot be played right now; it may have been removed or made private. Open the original YouTube link to check, or retry.');
  if (code === 101 || code === 150) return label('视频作者不允许在站外播放这个视频。可以在 YouTube 打开原链接观看，或重试。', 'The video owner does not allow playback outside YouTube. Watch it on the original YouTube link, or retry.');
  if (code === 153) return label('YouTube 需要有效的 HTTP Referer／客户端标识才能播放；这不是视频缺失。可以重试，或打开原链接确认。', 'YouTube needs a valid HTTP Referer / client identification to play; this is not a missing video. Retry, or open the original link to confirm.');
  if (code === 'timeout') return label('YouTube 播放器在限定时间内未就绪。仍可打开原链接观看，或重试。', 'The YouTube player did not become ready in time. You can still watch on the original link, or retry.');
  if (code === 'seek') return label('播放器暂时无法跳转到所选片段。可以重试，或在 YouTube 打开这个片段。', 'The player could not seek to the selected moment. Retry, or open this moment on YouTube.');
  return label('未能加载 YouTube 官方播放器，可能是网络或拦截扩展造成的。仍可打开原链接观看，或重试。', 'The official YouTube player could not load; a blocked network request or extension may be responsible. You can still watch on the original link, or retry.');
}

// Only one module media stream may be active: an explicit play — or a
// legitimate native PLAYING resume — claims the stream and pauses every other
// widget first.
const mediaCoordinator = {
  instances: new Set(),
  active: null,
  register(widget) { this.instances.add(widget); },
  unregister(widget) { this.instances.delete(widget); if (this.active === widget) this.active = null; },
  claim(widget) { this.active = widget; for (const other of this.instances) if (other !== widget) other.pauseForCoordinator(); },
  // True when a newer explicit intent on another widget owns the stream.
  heldByOther(widget) { return !!this.active && this.active !== widget && this.active.hasExplicitIntent(); }
};

// One shared official-API load promise per document. The fixed script URL is
// loaded at most once, any previous global callback is preserved and invoked,
// and startup is bounded (12s by default) including the "no callback" case. A
// failed load removes its stale script handle so a later retry can start clean.
let sharedAPILoad = null;
export function loadYouTubeIframeAPI({ timeoutMs = API_TIMEOUT_MS, doc, win } = {}) {
  doc = doc || globalThis.document;
  win = win || globalThis.window || globalThis;
  if (!doc) return Promise.reject(new Error('youtube-iframe-api-no-document'));
  if (win.YT && typeof win.YT.Player === 'function') return Promise.resolve(win.YT);
  if (sharedAPILoad && sharedAPILoad.doc === doc) return sharedAPILoad.promise;
  const promise = new Promise((resolve, reject) => {
    let settled = false, timer = null, script = null;
    const priorCallback = win.onYouTubeIframeAPIReady;
    const finish = () => {
      settled = true;
      if (timer) clearTimeout(timer);
      timer = null;
      win.onYouTubeIframeAPIReady = priorCallback;
      if (sharedAPILoad && sharedAPILoad.doc === doc) sharedAPILoad = null;
    };
    const fail = error => {
      if (settled) return;
      finish();
      if (script) {
        if (typeof script.remove === 'function') script.remove();
        else if (script.parentNode) script.parentNode.removeChild(script);
      }
      reject(error);
    };
    timer = setTimeout(() => fail(new Error('youtube-iframe-api-timeout')), Math.max(1, Number(timeoutMs) || API_TIMEOUT_MS));
    win.onYouTubeIframeAPIReady = function ready() {
      if (settled) return;
      const api = win.YT;
      if (!api || typeof api.Player !== 'function') { fail(new Error('youtube-iframe-api-unavailable')); return; }
      finish();
      resolve(api);
      if (typeof priorCallback === 'function') priorCallback.call(win);
    };
    script = doc.createElement('script');
    script.src = IFRAME_API_SRC;
    script.async = true;
    if (typeof script.addEventListener === 'function') script.addEventListener('error', () => fail(new Error('youtube-iframe-api-blocked')));
    (doc.head || doc.documentElement).appendChild(script);
  });
  sharedAPILoad = { doc, promise };
  return promise;
}

// Shared widget engine behind both the dedicated video window and the reader
// facades. DOM is built with createElement/textContent only.
function createVideoWidget({ mountHost, reference, language, onStatus = noop, apiTimeoutMs = API_TIMEOUT_MS, execute, compact = false, contextTitle = '' }) {
  const label = t(language);
  const doc = mountHost.ownerDocument || globalThis.document;
  const win = globalThis.window || globalThis;
  let storage;try{storage=win.localStorage;}catch{}
  const positions=createVideoPositionStore({storage});
  const savedPosition=positions.get(reference.id);
  let progressTimer=null;
  const state = {
    disposed: false,
    generation: 0,
    phase: 'idle',
    playIntent: false,
    selectedStart: reference.start,
    pendingSeek: null,
    pausePending: false,
    activationLatched: false,
    visible: true,
    player: null,
    playerReady: false,
    readinessTimer: null,
    frame: null
  };
  const controller = typeof AbortController === 'function' ? new AbortController() : { abort() {}, signal: undefined };
  const on = (node, type, handler) => node && typeof node.addEventListener === 'function' && node.addEventListener(type, handler, controller.signal ? { signal: controller.signal } : undefined);
  const make = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const live = generation => !state.disposed && generation === state.generation;
  const selectedReference = () => ({ id: reference.id, start: state.selectedStart });
  const selectedWatchURL = () => canonicalWatchURL(selectedReference());
  const report = (status, message, code = null) => {
    state.phase = status;
    if (message !== undefined) statusNode.textContent = message;
    onStatus({ status, message: message || '', code, watchURL: selectedWatchURL() });
  };

  const root = make('section', compact ? 'sp-video sp-video--inline' : 'sp-video');
  root.setAttribute('data-video-widget', '');
  const stage = make('div', 'sp-video__stage');
  stage.setAttribute('data-video-stage', '');
  const facade = make('div', 'sp-video__facade');
  facade.setAttribute('data-video-facade', '');
  if (reference.poster) {
    const poster = make('img', 'sp-video__poster');
    poster.setAttribute('src', reference.poster);
    poster.setAttribute('alt', '');
    poster.setAttribute('loading', 'lazy');
    poster.setAttribute('decoding', 'async');
    poster.setAttribute('data-video-poster', '');
    facade.appendChild(poster);
  }
  const playButton = make('button', 'sp-video__play', label('播放视频', 'Play video'));
  playButton.setAttribute('type', 'button');
  playButton.setAttribute('data-video-play', '');
  facade.appendChild(playButton);
  if(reference.start===0&&savedPosition>0){
    const resume=make('button','sp-video__play sp-video__resume',label(`继续 ${formatVideoTime(savedPosition)}`,`Continue at ${formatVideoTime(savedPosition)}`));
    resume.setAttribute('type','button');resume.setAttribute('data-video-resume',String(savedPosition));on(resume,'click',()=>selectChapter(savedPosition));facade.appendChild(resume);
  }
  stage.appendChild(facade);
  root.appendChild(stage);

  const chapterButtons = [];
  if (Array.isArray(reference.chapters) && reference.chapters.length) {
    const chapters = make('div', 'sp-video__chapters');
    chapters.setAttribute('data-video-chapters', '');
    chapters.setAttribute('role', 'group');
    const heading = label('文章提到的片段', 'Referenced moments');
    chapters.setAttribute('aria-label', heading);
    chapters.appendChild(make('p', 'sp-video__chapters-title', heading));
    for (const chapter of reference.chapters) {
      const button = make('button', 'sp-video__chapter');
      button.setAttribute('type', 'button');
      button.setAttribute('data-video-chapter', String(chapter.start));
      // Pressed records the last choice, never a claim about the actual playhead.
      button.setAttribute('aria-pressed', String(chapter.start === state.selectedStart));
      button.appendChild(make('span', 'sp-video__chapter-time', `${formatVideoTime(chapter.start)} `));
      button.appendChild(make('span', 'sp-video__chapter-title', chapter.title));
      on(button, 'click', () => selectChapter(chapter.start));
      chapters.appendChild(button);
      chapterButtons.push({ button, start: chapter.start });
    }
    root.appendChild(chapters);
  }

  const meta = make('div', 'sp-video__meta');
  if (reference.title) {
    const title = make('strong', 'sp-video__title', reference.title);
    title.setAttribute('data-video-title', '');
    meta.appendChild(title);
  }
  const sourceLink = make('a', 'sp-video__source', label('在 YouTube 打开 ↗', 'Open on YouTube ↗'));
  sourceLink.setAttribute('href', selectedWatchURL());
  sourceLink.setAttribute('target', '_blank');
  sourceLink.setAttribute('rel', 'noopener noreferrer');
  sourceLink.setAttribute('data-video-source', '');
  meta.appendChild(sourceLink);
  if (compact) {
    const windowButton = make('button', 'sp-video__window', label('在视频窗口打开', 'Open in video window'));
    windowButton.setAttribute('type', 'button');
    windowButton.setAttribute('data-video-window', '');
    meta.appendChild(windowButton);
    on(windowButton, 'click', () => {
      if (state.disposed) return;
      if (typeof execute === 'function') execute('open', { app: 'video', payload: selectedWatchURL() });
      // Pause the inline widget right after opening the window: never two audio streams.
      pauseWidget(true);
    });
  }
  root.appendChild(meta);

  const notice = make('div', 'sp-video__notice');
  notice.setAttribute('data-video-notice', '');
  notice.hidden = true;
  const noticeText = make('p', 'sp-video__notice-text', '');
  noticeText.setAttribute('data-video-notice-text', '');
  const noticeActions = make('div', 'sp-video__notice-actions');
  const retryButton = make('button', 'sp-video__retry', label('重试', 'Retry'));
  retryButton.setAttribute('type', 'button');
  retryButton.setAttribute('data-video-retry', '');
  const noticeLink = make('a', 'sp-video__notice-source', label('在 YouTube 打开 ↗', 'Open on YouTube ↗'));
  noticeLink.setAttribute('href', selectedWatchURL());
  noticeLink.setAttribute('target', '_blank');
  noticeLink.setAttribute('rel', 'noopener noreferrer');
  noticeLink.setAttribute('data-video-notice-source', '');
  noticeActions.appendChild(retryButton);
  noticeActions.appendChild(noticeLink);
  notice.appendChild(noticeText);
  notice.appendChild(noticeActions);
  root.appendChild(notice);

  const statusNode = make('p', 'sp-video__status', statusMessage(label, 'idle'));
  statusNode.setAttribute('role', 'status');
  statusNode.setAttribute('aria-live', 'polite');
  statusNode.setAttribute('data-video-status', '');
  root.appendChild(statusNode);
  const positionStatus=make('p','sp-video__position-status','');positionStatus.hidden=true;positionStatus.setAttribute('data-video-position-status','');positionStatus.setAttribute('role','status');root.appendChild(positionStatus);

  function rememberProgress(){
    if(!state.playerReady||typeof state.player?.getCurrentTime!=='function')return;
    try{const seconds=state.player.getCurrentTime();if(!Number.isFinite(seconds)||seconds<0)return;
      const saved=positions.set(reference.id,seconds);positionStatus.hidden=saved;positionStatus.textContent=saved?'':label('播放进度未能保存在此浏览器。','Playback progress could not be saved in this browser.');
    }catch{}
  }
  function stopProgress(){if(progressTimer!==null){clearInterval(progressTimer);progressTimer=null;}}
  function startProgress(){stopProgress();progressTimer=setInterval(()=>{if(!isHidden()&&state.phase==='playing')rememberProgress();},5000);progressTimer.unref?.();}

  function pauseWidget(cancelIntent = false) {
    rememberProgress();stopProgress();
    if (cancelIntent) {
      if (state.playerReady && state.player && (state.playIntent || ['playing','buffering'].includes(state.phase))) state.pausePending = true;
      state.playIntent = false;
      state.pendingSeek = null;
    }
    const player = state.player;
    if (player && typeof player.pauseVideo === 'function') {
      try { player.pauseVideo(); } catch { /* the native controls stay usable */ }
    }
  }

  // document.hidden can be true before the visibilitychange event fires.
  const isHidden = () => !state.visible || (doc && doc.hidden === true);

  function clearReadinessWatchdog() {
    if (state.readinessTimer !== null) {
      clearTimeout(state.readinessTimer);
      state.readinessTimer = null;
    }
  }

  function safePlay() {
    if (isHidden()) {
      // Hidden widget or hidden document: cancel and pause, never play.
      state.playIntent = false;
      pauseWidget(true);
      return;
    }
    const player = state.player;
    if (!player || typeof player.playVideo !== 'function') return;
    if (state.pendingSeek !== null) {
      try {
        if (typeof player.seekTo !== 'function') throw new Error('youtube-seek-unavailable');
        player.seekTo(state.pendingSeek, true);
        state.pendingSeek = null;
      } catch {
        pauseWidget(true);
        showError('seek');
        return;
      }
    }
    try { player.playVideo(); } catch { /* the native controls stay usable */ }
  }

  function showError(code) {
    const message = errorMessage(label, code);
    clearReadinessWatchdog();
    state.playIntent = false;
    state.pendingSeek = null;
    state.activationLatched = false;
    noticeText.textContent = message;
    notice.hidden = false;
    report('error', message, Number.isInteger(code) ? code : null);
  }

  function teardownPlayer() {
    rememberProgress();stopProgress();
    // Replacement marks the generation first so late events cannot revive it.
    state.generation++;
    clearReadinessWatchdog();
    state.playerReady = false;
    const player = state.player;
    state.player = null;
    const frame = state.frame;
    state.frame = null;
    if (player && typeof player.destroy === 'function') {
      try { player.destroy(); } catch { /* already gone */ }
    }
    if (frame && typeof frame.remove === 'function') frame.remove();
    else if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
  }

  function createPlayer(api, generation) {
    const embedURL = buildYouTubeEmbedURL(selectedReference(), globalThis.location ? globalThis.location.origin : '');
    if (!embedURL) { showError(null); return; }
    const iframe = doc.createElement('iframe');
    iframe.setAttribute('src', embedURL);
    iframe.setAttribute('title', label('YouTube 视频播放器', 'YouTube video player') + (reference.title ? ` · ${reference.title}` : contextTitle ? ` · ${contextTitle}` : ''));
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    // The user explicitly asked for playback, so delegate the standard media
    // features across origins. The embed URL keeps autoplay=0 and the
    // generation/visibility guards still prohibit unsolicited playback.
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.tabIndex = 0;
    iframe.setAttribute('data-video-iframe', '');
    const frame = make('div', 'sp-video__frame');
    frame.setAttribute('data-video-frame', '');
    frame.appendChild(iframe);
    stage.replaceChildren(frame);
    state.frame = frame;
    // The cold iframe URL already carries the current choice. Later choices
    // queue a seek on this same player instead of replacing its native controls.
    state.pendingSeek = null;
    try {
      state.player = new api.Player(iframe, {
        events: {
          onReady: () => {
            if (!live(generation)) return;
            state.playerReady = true;
            clearReadinessWatchdog();
            // Ready comes from the official API event, never from an iframe load.
            report('ready', statusMessage(label, 'ready'));
            if (state.playIntent) safePlay();
          },
          onStateChange: event => {
            if (!live(generation)) return;
            const status = ({ 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering' })[event && event.data];
            if (!status) return;
            if (status === 'playing') {
              if (isHidden()) {
                // Late PLAYING while hidden: cancel, pause again, never report.
                // The event confirms playback even if the last reported phase
                // was ready. Wait for PAUSED before accepting a visible resume.
                state.pausePending = true;
                pauseWidget(true);
                return;
              }
              if (state.pausePending || mediaCoordinator.heldByOther(widget)) {
                // A newer explicit intent owns the stream: pause again instead
                // of reclaiming against it.
                pauseWidget(true);
                return;
              }
              // A legitimate native PLAYING (for example a resume through the
              // iframe controls) claims the module stream like an explicit play.
              mediaCoordinator.claim(widget);
              state.playIntent = false;
              startProgress();
            }
            if (status === 'paused' || status === 'ended') { rememberProgress();stopProgress();state.pausePending = false; state.playIntent = false; }
            report(status, statusMessage(label, status));
          },
          onError: event => {
            if (!live(generation)) return;
            showError(event && event.data);
          },
          onAutoplayBlocked: () => {
            if (!live(generation)) return;
            state.playIntent = false;
            state.pendingSeek = null;
            // Playback was blocked: tell the user to click the native play
            // control and never claim the video is playing.
            report(state.phase, label('自动播放被浏览器拦截。请点击播放器上的播放按钮开始观看。', 'The browser blocked autoplay. Click play on the player to start.'));
          }
        }
      });
    } catch {
      state.player = null;
      showError(null);
      return;
    }
    // Per-attempt readiness watchdog: a constructed player whose iframe never
    // reaches the ready event falls back honestly instead of loading forever.
    clearReadinessWatchdog();
    state.readinessTimer = setTimeout(() => {
      state.readinessTimer = null;
      if (!live(generation) || state.playerReady) return;
      teardownPlayer();
      showError('timeout');
    }, Math.max(1, Number(apiTimeoutMs) || API_TIMEOUT_MS));
  }

  function activate() {
    if (state.disposed || state.activationLatched) return;
    // Single-activation latch: fast repeated clicks never create a second
    // frame or player.
    state.activationLatched = true;
    const generation = state.generation;
    report('loading', statusMessage(label, 'loading'));
    Promise.resolve()
      .then(() => loadYouTubeIframeAPI({ timeoutMs: apiTimeoutMs, doc, win }))
      .then(api => {
        if (!live(generation)) return;
        if (!api || typeof api.Player !== 'function') { showError(null); return; }
        createPlayer(api, generation);
      })
      .catch(() => { if (live(generation)) showError(null); });
  }

  function revealStage() {
    if (state.disposed || isHidden()) return;
    const toolbarHeight = stage.closest?.('.space-window__body')?.querySelector('.space-toolbar')?.getBoundingClientRect?.()?.height;
    if (Number.isFinite(toolbarHeight) && stage.style) stage.style.scrollMarginTop = `${toolbarHeight + 8}px`;
    stage.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }

  function runRetry() {
    if (state.disposed || state.phase === 'loading') return;
    if (isHidden()) { pauseWidget(true); return; }
    // Retry is an explicit user action on the same reference. Every retry is a
    // fresh attempt: the latch is reset so a fast second retry can never leave
    // the widget stuck after tearing down the first attempt.
    state.playIntent = true;
    state.pausePending = false;
    mediaCoordinator.claim(widget);
    teardownPlayer();
    notice.hidden = true;
    state.activationLatched = false;
    activate();
    revealStage();
  }

  function handlePlayClick() {
    if (state.disposed) return;
    if (isHidden()) { pauseWidget(true); return; }
    state.playIntent = true;
    state.pausePending = false;
    mediaCoordinator.claim(widget);
    if (state.phase === 'error') { runRetry(); return; }
    if (state.player && state.playerReady) safePlay();
    else activate();
    revealStage();
  }

  function selectChapter(start) {
    if (state.disposed) return;
    state.selectedStart = start;
    state.pendingSeek = start;
    for (const chapter of chapterButtons) chapter.button.setAttribute('aria-pressed', String(chapter.start === start));
    const watchURL = selectedWatchURL();
    sourceLink.setAttribute('href', watchURL);
    noticeLink.setAttribute('href', watchURL);
    handlePlayClick();
  }

  function setVisible(visible) {
    const next = !!visible;
    state.visible = next;
    root.hidden = !next;
    if (!next) {
      // A hidden widget cancels any queued ready/play intent and pauses.
      pauseWidget(true);
    }
    // Becoming visible again never resumes playback on its own.
  }

  function dispose() {
    if (state.disposed) return;
    rememberProgress();stopProgress();
    // Closed widgets mark disposed and bump the generation before cleanup so
    // late script, API and player callbacks cannot recreate anything.
    state.disposed = true;
    state.generation++;
    state.playIntent = false;
    state.pendingSeek = null;
    mediaCoordinator.unregister(widget);
    clearReadinessWatchdog();
    controller.abort();
    const player = state.player;
    state.player = null;
    const frame = state.frame;
    state.frame = null;
    if (player && typeof player.destroy === 'function') {
      try { player.destroy(); } catch { /* already gone */ }
    }
    if (frame && typeof frame.remove === 'function') frame.remove();
    if (typeof root.remove === 'function') root.remove();
    else if (root.parentNode) root.parentNode.removeChild(root);
  }

  const widget = {
    root,
    setVisible,
    dispose,
    pause: () => pauseWidget(true),
    pauseForCoordinator: () => pauseWidget(true),
    hasExplicitIntent: () => state.playIntent
  };

  on(playButton, 'click', handlePlayClick);
  on(retryButton, 'click', runRetry);
  if (doc && typeof doc.addEventListener === 'function') {
    on(doc, 'visibilitychange', () => {
      if (state.disposed) return;
      if (doc.hidden) {
        pauseWidget(true);
      }
    });
  }
  mediaCoordinator.register(widget);
  mountHost.appendChild(root);
  return widget;
}

// The dedicated video window player. `reference` is a canonical watch URL or a
// validated reference object. It renders the local facade first and only loads
// the official API after an explicit activation.
export function mountVideoPlayer({ host, reference, language, references, onStatus = noop, apiTimeoutMs = API_TIMEOUT_MS } = {}) {
  const label = t(language);
  const doc = (host && host.ownerDocument) || globalThis.document;
  const normalized = normalizeVideoReference(reference, references, '', language);
  if (!host || !doc || !normalized) {
    const message = label('这个视频链接无法识别。', 'This video link could not be read.');
    if (host && doc) {
      const root = doc.createElement('section');
      root.className = 'sp-video';
      root.setAttribute('data-video-widget', '');
      const notice = doc.createElement('div');
      notice.className = 'sp-video__notice';
      notice.setAttribute('data-video-notice', '');
      const text = doc.createElement('p');
      text.className = 'sp-video__notice-text';
      text.textContent = message;
      notice.appendChild(text);
      root.appendChild(notice);
      host.appendChild(root);
    }
    onStatus({ status: 'error', message, code: null, watchURL: '' });
    return { setVisible() {}, dispose() {} };
  }
  return createVideoWidget({ mountHost: host, reference: normalized, language, onStatus, apiTimeoutMs });
}

const CITATION_HEADING = /^(参考资料?|资料来源|延伸阅读|references?|sources?)/i;

// Reader facades: scan the already-sanitised article content for YouTube
// anchors, keep at most one facade per video (max 8), prefer the first relevant
// non-citation link and never duplicate or rewrite citation links. The original
// anchors keep their external safe source href.
export function mountReaderVideos({ content, article, execute, language, references } = {}) {
  const doc = (content && content.ownerDocument) || globalThis.document;
  const widgets = [];
  const apiTimeoutMs = API_TIMEOUT_MS;
  if (!content || !doc || typeof content.querySelectorAll !== 'function') return { setVisible() {}, dispose() {} };
  // Citations are only the entries after the actual references heading in
  // document order; body list links before it stay first-class facade
  // candidates. Original anchors are never rewritten.
  let citationHeading = null;
  for (const heading of content.querySelectorAll('h2,h3,h4')) {
    if (CITATION_HEADING.test(inertTitle(heading.textContent, ''))) { citationHeading = heading; break; }
  }
  const citations = new Set();
  if (citationHeading) {
    let pastHeading = false;
    const walk = node => {
      for (const child of node.childNodes) {
        if (child.nodeType !== 1) continue;
        if (child === citationHeading) pastHeading = true;
        if (pastHeading && typeof child.matches === 'function' && child.matches('a[href]')) citations.add(child);
        walk(child);
      }
    };
    walk(content);
  }
  const isCitation = anchor => citations.has(anchor);
  const chosen = new Map();
  for (const anchor of content.querySelectorAll('a[href]')) {
    if (chosen.size >= 8) break;
    const parsed = parseYouTubeURL(anchor.getAttribute('href'));
    if (!parsed || chosen.has(parsed.id)) continue;
    if (isCitation(anchor)) continue;
    chosen.set(parsed.id, { anchor, parsed });
  }
  for (const { anchor, parsed } of chosen.values()) {
    const reference = normalizeVideoReference(parsed, references, anchor.textContent, language);
    if (!reference) continue;
    const widget = createVideoWidget({
      mountHost: content,
      reference,
      language,
      execute,
      compact: true,
      apiTimeoutMs,
      contextTitle: article && article.title ? inertTitle(article.title, '') : ''
    });
    // Move the facade next to the first relevant link without touching it.
    let block = anchor.closest('p,figure,li,blockquote') || anchor;
    if (block.tagName === 'LI') block = block.parentNode || block;
    const parent = block.parentNode;
    if (parent && typeof parent.insertBefore === 'function') {
      parent.insertBefore(widget.root, block);
    }
    widgets.push(widget);
  }
  return {
    setVisible(visible) { for (const widget of widgets) widget.setVisible(visible); },
    dispose() { for (const widget of widgets) widget.dispose(); widgets.length = 0; }
  };
}
