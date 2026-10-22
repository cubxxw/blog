import {createRoomLoopAudio} from './room-audio-loop.js';

export function mountRoomAudio(options) {
  return options.independentAmbience ? mountIndependentRoomAudio(options) : mountLegacyRoomAudio(options);
}

function mountIndependentRoomAudio({root,assets,zh,defaultEnabled=false,embedded=false,initialQuiet=false,onStateChange,tracks:recordTracks,backgroundPlayback=false}) {
  const tracks=Object.freeze((recordTracks?.length?recordTracks:[{id:"night-on-the-docks-sax",title:"Night on the Docks - Sax",titleEn:"Night on the Docks - Sax",artist:"Kevin MacLeod",src:assets.music}]).map(track=>Object.freeze({...track})));
  let selected=tracks[0];
  const t=(cn,en)=>zh?cn:en,abort=new AbortController(),engine=createRoomLoopAudio();
  const host=document.createElement('div');host.className='space-room-audio';host.hidden=true;host.setAttribute('aria-hidden','true');root.append(host);
  const sound=document.createElement('button');sound.type='button';sound.dataset.roomSound='';
  const credits=document.createElement('details');credits.className='space-room-credits';
  const escape=value=>String(value).replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const musicCredits=tracks.map(track=>`<p><a href="${escape(track.source||'https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100137')}" target="_blank" rel="noopener">${escape(track.titleEn||track.title)} · ${escape(track.artist||'Kevin MacLeod')}</a> · <a href="${escape(track.licenseUrl||'https://creativecommons.org/licenses/by/4.0/')}" target="_blank" rel="noopener">${escape(track.license||'CC BY 4.0')}</a></p>`).join('');
  credits.innerHTML=`<summary>${t('声音来源','Sound credits')}</summary><div>${musicCredits}<p>${t('音乐：压缩编码、音量调整，移除首尾静音，首尾交叠循环。唱片封面使用作者的旅行照片。','Music: re-encoded, level adjusted, edge silence trimmed, overlapping loop boundary. Record sleeves use the author’s travel photographs.')}</p><p><a href="https://commons.wikimedia.org/wiki/File:Distant_storm_in_the_city_(5).flac" target="_blank" rel="noopener">${t('雨声：Matucha · Distant storm in the city (5)','Rain: Matucha · Distant storm in the city (5)')}</a></p><p><a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a> · ${t('截取，首尾交叠循环','Excerpted; overlapping loop boundary')}</p></div>`;
  if(!embedded){root.querySelector('.space-cafe__utilities')?.prepend(sound);root.querySelector('.space-cafe__footer')?.append(credits);}
  const volumeKey='space:cafe:music-volume:v1';let volume=.6;
  try{const saved=localStorage.getItem(volumeKey),value=Number(saved);if(saved!==null&&saved.trim()!==''&&Number.isFinite(value)&&value>=0&&value<=1)volume=value;}catch{}
  let perspective=Object.freeze({music:1,rain:1});
  const musicLoop=track=>engine.createLoop({src:track.src,volume:volume*perspective.music,crossfade:2,trimSilence:true,fadeSeconds:.06});
  const music={audio:musicLoop(selected),wanted:Boolean(defaultEnabled),failure:null,attempt:null,generation:0};
  const rain={audio:engine.createLoop({src:assets.ambience,volume:1.5,crossfade:8}),wanted:true,failure:null,attempt:null,generation:0};
  const lanes=[music,rain];let quiet=Boolean(initialQuiet),disposed=false,lastState='',rainLevel=1;
  const available=()=>!quiet&&!disposed&&(backgroundPlayback||!document.hidden)&&!root.hidden;
  const canPlay=lane=>lane.wanted&&available();
  const status=lane=>disposed?'disposed':!canPlay(lane)?'paused':!lane.audio.paused?'playing':lane.failure||'wanted';
  function snapshot(){return Object.freeze({wanted:music.wanted,playing:status(music)==='playing',status:status(music),trackId:selected.id,volume,perspective,quiet,ambientWanted:rain.wanted,ambientPlaying:status(rain)==='playing',ambientStatus:status(rain),musicTime:music.audio.currentTime,ambientTime:rain.audio.currentTime});}
  function sync(){
    const state=snapshot();
    if(!disposed){root.dataset.roomSound=state.status;root.dataset.roomSoundWanted=String(music.wanted);root.dataset.roomTrack=selected.id;root.dataset.roomVolume=String(volume);root.dataset.roomAmbient=state.ambientStatus;root.dataset.roomAmbientWanted=String(rain.wanted);}
    sound.setAttribute('aria-pressed',String(music.wanted));sound.disabled=quiet;sound.textContent=state.playing?t('关闭音乐','Pause music'):t('播放音乐','Play music');
    sound.setAttribute('aria-label',state.playing?t('关闭室内音乐','Pause indoor music'):t('播放室内音乐','Play indoor music'));
    sound.title=quiet?t('关闭安静模式后可以播放音乐','Turn off quiet mode to play music'):sound.getAttribute('aria-label');
    if(music.failure&&!quiet)sound.title=t('音乐未能播放，请再点一次。','Music could not start. Click to try again.');
    // Time is read live by snapshot(); frame-by-frame clock updates must not
    // turn onStateChange into an animation loop or recreate either audio lane.
    const key=JSON.stringify({...state,musicTime:0,ambientTime:0});if(key!==lastState){lastState=key;onStateChange?.(state);}
  }
  function pause(lane){lane.generation++;lane.attempt=null;lane.audio.pause();}
  function play(lane){
    if(!canPlay(lane)||lane.attempt||!lane.audio.paused)return;
    const current=++lane.generation;lane.attempt=current;lane.failure=null;sync();
    let result;try{result=lane.audio.play();}catch(error){result=Promise.reject(error);}
    Promise.resolve(result).then(()=>{
      if(disposed||current!==lane.generation)return;
      lane.attempt=null;
      if(!canPlay(lane))pause(lane);else if(lane.audio.paused)lane.failure='error';
      sync();
    }).catch(error=>{
      if(disposed||current!==lane.generation)return;
      lane.failure=error?.name==='NotAllowedError'?'blocked':'error';pause(lane);sync();
    });
  }
  function visibility(){for(const lane of lanes){if(!canPlay(lane))pause(lane);else if(!lane.failure||(lane.failure==='blocked'&&globalThis.navigator?.userActivation?.isActive))play(lane);}sync();}
  function toggle(){
    if(quiet||disposed)return snapshot();
    if(!music.audio.paused||(music.wanted&&music.attempt)){music.wanted=false;music.failure=null;pause(music);}
    else{music.wanted=true;music.failure=null;play(music);}
    // A speaker action is also a trusted opportunity to unlock outdoor rain;
    // it never changes the rain's intent or touches an already playing source.
    if(rain.failure==='blocked'&&canPlay(rain))play(rain);
    sync();return snapshot();
  }
  function selectTrack(id){
    const next=tracks.find(track=>track.id===id);
    if(disposed||!next)return snapshot();
    if(next.id!==selected.id){
      ++music.generation;music.attempt=null;music.audio.dispose({fade:true});
      selected=next;music.audio=musicLoop(next);
    }
    music.wanted=true;music.failure=null;play(music);
    if(rain.failure==='blocked'&&canPlay(rain))play(rain);
    sync();return snapshot();
  }
  function setVolume(value){
    if(disposed||!Number.isFinite(value))return snapshot();
    const next=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;
    if(next===volume)return snapshot();
    volume=next;music.audio.setVolume(volume*perspective.music,.08);
    try{localStorage.setItem(volumeKey,String(volume));}catch{}
    sync();return snapshot();
  }
  function setPerspective(value={}){
    if(disposed)return snapshot();
    // A bad lane must never partially alter the other one. Read data properties
    // only: perspective is a small value object, not an executable options bag.
    let descriptors;
    try{
      if(value===null||typeof value!=='object')return snapshot();
      const prototype=Object.getPrototypeOf(value);
      if(prototype!==Object.prototype&&prototype!==null)return snapshot();
      descriptors=Object.getOwnPropertyDescriptors(value);
    }catch{return snapshot();}
    const next={};
    for(const lane of ['music','rain']){
      const property=descriptors[lane];
      if(property&&!Object.hasOwn(property,'value'))return snapshot();
      const level=property?.value===undefined?1:property.value;
      if(!Number.isFinite(level))return snapshot();
      next[lane]=Math.round(Math.max(0,Math.min(1,level))*1000)/1000;
    }
    if(next.music===perspective.music&&next.rain===perspective.rain)return snapshot();
    perspective=Object.freeze(next);
    music.audio.setVolume(volume*perspective.music,.55);
    rain.audio.setVolume(1.5*rainLevel*perspective.rain,.65);
    sync();return snapshot();
  }
  function gesture(event){
    if(!event.isTrusted)return;
    if((rain.failure==='blocked'||rain.failure==='error')&&canPlay(rain))play(rain);
    if(event.target?.closest?.('button[data-room-sound], [data-room-object="speaker"]'))return;
    if(music.failure==='blocked'&&canPlay(music))play(music);
  }
  sound.addEventListener('click',toggle,{signal:abort.signal});root.addEventListener('click',gesture,{signal:abort.signal,capture:true});root.addEventListener('keydown',gesture,{signal:abort.signal,capture:true});
  root.addEventListener('space:roomvolume',event=>setVolume(event.detail?.volume),{signal:abort.signal});
  document.addEventListener('visibilitychange',visibility,{signal:abort.signal});
  const observer=new MutationObserver(visibility);observer.observe(root,{attributes:true,attributeFilter:['hidden']});
  sync();queueMicrotask(()=>{if(!disposed)visibility();});
  return {toggle,selectTrack,setVolume,setPerspective,tracks,snapshot,credits,get state(){return snapshot();},
    setRainLevel(value){
      if(disposed||!Number.isFinite(value))return;
      const next=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;if(next===rainLevel)return;
      rainLevel=next;rain.audio.setVolume(1.5*next*perspective.rain,.6);
      const wanted=next>.001;if(rain.wanted!==wanted){rain.wanted=wanted;visibility();}
    },
    setQuiet(value){if(disposed)return;quiet=Boolean(value);visibility();},
    dispose(){if(disposed)return;disposed=true;for(const lane of lanes){lane.wanted=false;pause(lane);}abort.abort();observer.disconnect();engine.dispose();host.remove();sound.remove();credits.remove();delete root.dataset.roomSound;delete root.dataset.roomSoundWanted;delete root.dataset.roomTrack;delete root.dataset.roomVolume;delete root.dataset.roomAmbient;delete root.dataset.roomAmbientWanted;sync();}
  };
}

function mountLegacyRoomAudio({root,assets,zh,defaultEnabled=false,embedded=false,initialQuiet=false,onStateChange}) {
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
