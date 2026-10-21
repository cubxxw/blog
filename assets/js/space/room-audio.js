export function mountRoomAudio({root,assets,zh,defaultEnabled=false,embedded=false,initialQuiet=false,onStateChange}) {
  const t = (cn,en) => zh ? cn : en;
  const abort = new AbortController();
  const host = document.createElement('div');host.className = 'space-room-audio';host.hidden = true;host.setAttribute('aria-hidden','true');
  const sound = document.createElement('button');sound.type = 'button';sound.dataset.roomSound = '';
  const credits = document.createElement('details');credits.className = 'space-room-credits';
  credits.innerHTML = `<summary>${t('配乐','Music')}</summary><div><a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&amp;isrc=USUAN1100137" target="_blank" rel="noopener">Night on the Docks - Sax · Kevin MacLeod</a><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · ${t('音量调整，循环播放','Level adjusted and looped')}</p><p><a href="https://commons.wikimedia.org/wiki/File:Rain.ogg" target="_blank" rel="noopener">${t('雨声：ジダネ · 公有领域','Rain: ジダネ · public domain')}</a></p></div>`;
  if (!embedded) {
    root.querySelector('.space-cafe__utilities')?.prepend(sound);
    root.querySelector('.space-cafe__footer')?.append(credits);
  }
  root.append(host);
  const music = new Audio(), ambience = new Audio(), tracks = [music,ambience];
  for (const track of tracks) {track.preload = 'none';track.loop = true;host.append(track);}
  music.src = assets.music;music.volume = .3;ambience.src = assets.ambience;ambience.volume = .8;
  let wanted = Boolean(defaultEnabled), quiet = Boolean(initialQuiet), disposed = false, generation = 0;
  let playing = false, failure = null, attempt = null, lastState = '';
  const canPlay = () => wanted && !quiet && !disposed && !document.hidden && !root.hidden;
  function snapshot() {
    const audible = playing && canPlay();
    const status = disposed ? 'disposed' : !canPlay() ? 'paused' : audible ? 'playing' : failure || 'wanted';
    return Object.freeze({wanted,playing:audible,status,quiet});
  }
  function sync() {
    const state = snapshot();
    if (!disposed) {
      root.dataset.roomSound = state.status;
      root.dataset.roomSoundWanted = String(wanted);
    }
    sound.setAttribute('aria-pressed',String(wanted));sound.disabled = quiet;
    sound.textContent = state.playing ? t('静音','Mute') : t('声音','Sound');
    sound.setAttribute('aria-label',state.playing ? t('关闭爵士和雨声','Mute jazz and rain') : t('播放爵士和雨声','Play jazz and rain'));
    sound.title = quiet ? t('关闭安静模式后可以播放声音','Turn off quiet mode to play sound') : sound.getAttribute('aria-label');
    if (failure && !quiet) sound.title = t('声音未能播放，请再点一次。','Sound could not start. Click to try again.');
    const key = JSON.stringify(state);
    if (lastState !== key) {lastState = key;onStateChange?.(state);}
  }
  function pause() {generation++;attempt = null;playing = false;for (const track of tracks) track.pause();}
  function play() {
    if (!canPlay() || attempt || playing) return;
    const current = ++generation;
    attempt = current;failure = null;sync();
    const starts = tracks.map(track=>{
      let result;
      try {result = track.play();} catch(error) {result = Promise.reject(error);}
      return Promise.resolve(result).then(()=>{
        // A partner may already have failed, or this attempt may have been
        // paused while media was loading. Never let its late completion leak.
        // A newer live attempt owns the same elements and must stay untouched.
        if (!canPlay() || (current !== generation && !attempt && !playing)) track.pause();
      });
    });
    Promise.all(starts).then(()=>{
      if (disposed || current !== generation) return;
      attempt = null;
      if (!canPlay()) pause();
      else {
        playing = tracks.every(track=>!track.paused);
        if (!playing) {pause();failure = 'error';}
      }
      sync();
    }).catch(error=>{
      if (disposed || current !== generation) return;
      failure = error?.name === 'NotAllowedError' ? 'blocked' : 'error';
      pause();sync();
    });
  }
  function visibility() {
    if (!canPlay()) pause();
    else if (!failure) play();
    sync();
  }
  function toggle() {
    if (quiet || disposed) return snapshot();
    if (playing || (wanted && attempt)) {wanted = false;failure = null;pause();sync();}
    else {wanted = true;failure = null;play();sync();}
    return snapshot();
  }
  function gesture(event) {
    if (event.target?.closest?.('button[data-room-sound], [data-room-object="speaker"]')) return;
    if (event.isTrusted && failure === 'blocked' && canPlay()) play();
  }
  sound.addEventListener('click',toggle,{signal:abort.signal});
  root.addEventListener('click',gesture,{signal:abort.signal});
  root.addEventListener('keydown',gesture,{signal:abort.signal});
  for (const track of tracks) track.addEventListener('error',()=>{
    if (disposed || !wanted) return;
    failure = 'error';pause();sync();
  },{signal:abort.signal});
  document.addEventListener('visibilitychange',visibility,{signal:abort.signal});
  const observer = new MutationObserver(visibility);observer.observe(root,{attributes:true,attributeFilter:['hidden']});
  sync();
  // Callers mount after the room's first frame. The microtask also gives them
  // a chance to apply an already active quiet preference before any audio starts.
  if (wanted) queueMicrotask(()=>{if (!failure) play();});
  return {
    toggle,snapshot,credits,get state() {return snapshot();},
    setQuiet(value) {
      if (disposed) return;
      quiet = Boolean(value);visibility();
    },
    dispose() {
      if (disposed) return;
      disposed = true;wanted = false;pause();abort.abort();observer.disconnect();
      for (const track of tracks) {track.removeAttribute('src');track.load();}
      host.remove();sound.remove();credits.remove();
      delete root.dataset.roomSound;delete root.dataset.roomSoundWanted;sync();
    }
  };
}
