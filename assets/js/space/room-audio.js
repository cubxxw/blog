export function mountRoomAudio({root,assets,zh}) {
  const t = (cn,en) => zh ? cn : en;
  const abort = new AbortController();
  const host = document.createElement('div');host.className = 'space-room-audio';host.hidden = true;host.setAttribute('aria-hidden','true');
  const sound = document.createElement('button');sound.type = 'button';sound.dataset.roomSound = '';
  const credits = document.createElement('details');credits.className = 'space-room-credits';
  credits.innerHTML = `<summary>${t('配乐','Music')}</summary><div><a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&amp;isrc=USUAN1100137" target="_blank" rel="noopener">Night on the Docks - Sax · Kevin MacLeod</a><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · ${t('音量调整，循环播放','Level adjusted and looped')}</p><p><a href="https://commons.wikimedia.org/wiki/File:Rain.ogg" target="_blank" rel="noopener">${t('雨声：ジダネ · 公有领域','Rain: ジダネ · public domain')}</a></p></div>`;
  root.querySelector('.space-cafe__utilities')?.prepend(sound);
  root.querySelector('.space-cafe__footer')?.append(credits);root.append(host);
  const music = new Audio(), ambience = new Audio(), tracks = [music,ambience];
  for (const track of tracks) {track.preload = 'none';track.loop = true;host.append(track);}
  music.src = assets.music;music.volume = .3;ambience.src = assets.ambience;ambience.volume = .8;
  let wanted = false, quiet = false, disposed = false, generation = 0;
  const canPlay = () => wanted && !quiet && !disposed && !document.hidden && !root.hidden;
  function sync() {
    sound.setAttribute('aria-pressed',String(wanted));sound.disabled = quiet;
    sound.textContent = wanted ? t('静音','Mute') : t('声音','Sound');
    sound.setAttribute('aria-label',wanted ? t('关闭爵士和雨声','Mute jazz and rain') : t('播放爵士和雨声','Play jazz and rain'));
    sound.title = quiet ? t('关闭安静模式后可以播放声音','Turn off quiet mode to play sound') : sound.getAttribute('aria-label');
  }
  function pause() {generation++;for (const track of tracks) track.pause();}
  function play() {
    if (!canPlay()) return;
    const current = ++generation;
    Promise.all(tracks.map(track=>track.play())).then(()=>{
      if (!canPlay()) for (const track of tracks) track.pause();
    }).catch(()=>{
      if (disposed || current !== generation) return;
      wanted = false;pause();sync();
      sound.title = t('声音未能播放，请再点一次。','Sound could not start. Click to try again.');
    });
  }
  function visibility() {if (canPlay()) play();else pause();}
  sound.addEventListener('click',()=>{
    if (quiet || disposed) return;
    wanted = !wanted;sync();if (wanted) play();else pause();
  },{signal:abort.signal});
  document.addEventListener('visibilitychange',visibility,{signal:abort.signal});
  const observer = new MutationObserver(visibility);observer.observe(root,{attributes:true,attributeFilter:['hidden']});
  sync();
  return {
    setQuiet(value) {quiet = Boolean(value);if (quiet) {wanted = false;pause();}sync();},
    dispose() {
      if (disposed) return;
      disposed = true;wanted = false;pause();abort.abort();observer.disconnect();
      for (const track of tracks) {track.removeAttribute('src');track.load();}
      host.remove();sound.remove();credits.remove();
    }
  };
}
