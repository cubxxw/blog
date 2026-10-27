import {JIANGNAN_ARTWORK} from './jiangnan-artwork.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const localImage=value=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')?value:'';
const bookAddress=value=>{if(!value)return '';try{const url=new URL(value,location.origin);return /^https?:$/.test(url.protocol)?url.href:'';}catch{return '';}};

// A light caption stays beside the physical object. The surrounding room owns
// retreat gestures; there is deliberately no second navigation bar in a close view.
export function mountRoomInspection({root,books=[],records=[],zh=true,onInspect,onSelectRecord,onPlayback,onToggleObject}){
 const t=(cn,en)=>zh?cn:en,abort=new AbortController();let current=null;
 const host=document.createElement('section');host.className='space-object-detail';host.dataset.roomInspection='';host.hidden=true;host.setAttribute('aria-label',t('物品近景','Object detail'));
 root.append(host);
 const audio=()=>({trackId:root.dataset.roomTrack,playing:root.dataset.roomSound==='playing',volume:Number(root.dataset.roomVolume??.6)});
 const kind=action=>String(action||'').split(':')[0];
 function title(text){return `<h2 tabindex="-1" data-room-detail-title>${escape(text)}</h2>`;}
 function bookCard(book){return `<button type="button" class="room-book" data-room-book="${escape(book.id)}"><strong>${escape(book.title)}</strong><span>${escape(book.author)}</span></button>`;}
 function render(){
  if(!current){host.hidden=true;host.replaceChildren();return;}
  const family=kind(current);host.hidden=false;host.dataset.kind=family;
  if(family==='clock'){host.hidden=true;return;}
  if(['records','record','vinyl','speaker'].includes(family)){
   host.innerHTML=`<div class="room-records">${title(t('选一张，慢慢听。','Choose a record. Stay a while.'))}<div class="room-records__sleeves">${records.map(record=>`<button type="button" class="room-record" data-room-record="${escape(record.id)}" aria-pressed="false"><span class="room-record__cover" style="--record-tint:${escape(record.color||'#58665b')}">${localImage(record.cover)?`<img src="${escape(record.cover)}" alt="" decoding="async">`:''}<span>${escape(record.title)}</span></span><strong>${escape(record.title)}</strong><small>${escape(record.artist)}</small></button>`).join('')}</div><label class="room-records__volume"><span>${t('音箱音量','Speaker volume')}<output data-room-volume-value aria-live="off"></output></span><input type="range" min="0" max="100" step="1" value="60" data-room-volume aria-label="${t('音箱音量','Speaker volume')}"></label><div class="room-records__footer"><button type="button" data-room-playback></button><a href="${zh?'/zh/articles/':'/articles/'}">${t('听着音乐，读一篇','Read with the music')} ↗</a></div></div>`;refreshAudio();
  }else if(['books','spines','book'].includes(family)){
   const id=current.includes(':')?current.slice(current.indexOf(':')+1):null,selected=books.find(book=>book.id===id);
   if(selected){const url=bookAddress(selected.url);host.innerHTML=`<article class="room-book-detail" data-room-book-detail>${title(selected.title)}<p class="room-book-detail__author">${escape(selected.author)}</p>${selected.note?`<p>${escape(selected.note)}</p>`:''}${url?`<a href="${escape(url)}" target="_blank" rel="noopener">${t('打开这本书','Open this book')} ↗</a>`:''}<div class="room-book-detail__others">${books.filter(book=>book.id!==id).slice(0,4).map(bookCard).join('')}</div></article>`;}
   else host.innerHTML=`<div class="room-booklist">${title(t('书架','The bookshelf'))}<div class="room-booklist__volumes">${books.map(bookCard).join('')}</div></div>`;
  }else if(family==='painting'){
   const art=JIANGNAN_ARTWORK;
   host.innerHTML=`<div class="room-object-caption">${title(t(art.title,art.englishTitle))}<p>${escape(art.artist)} · ${art.year}</p><p>${t('我有想去的地方，也愿意认真走过那些支路。','I have somewhere to go, and I am willing to explore the paths along the way.')}<br><small>${t('个人寄语','A personal reflection')}</small></p><a href="${escape(art.source)}" target="_blank" rel="noopener noreferrer">${t('作品资料','About the artwork')} ↗</a></div>`;
  }else{
   const captions={coffee:[t('一杯咖啡','A coffee'),t('慢慢喝，雨还会下一会儿。','Take your time. The rain will stay a while.')],espresso:[t('咖啡角','The coffee corner'),t('按一下咖啡机，看一杯浓缩慢慢落下。','Touch the machine and watch the espresso pour.')],clock:[t('木壳摆钟','The walnut clock'),t('摆锤轻轻摇着。','The pendulum moves quietly.')],vase:[t('窗边的一枝','A branch by the window'),''],cat:[t('小猫','The cat'),t('靠近一点，再轻轻摸摸它。','Come closer and give it a gentle touch.')]};
   const caption=captions[family];if(!caption){host.hidden=true;host.replaceChildren();return;}
   host.innerHTML=`<div class="room-object-caption">${title(caption[0])}${caption[1]?`<p>${escape(caption[1])}</p>`:''}${family==='espresso'?`<button type="button" data-room-brew>${t('按一下咖啡机','Use the espresso machine')}</button>`:''}</div>`;
  }
 }
 function refreshAudio(){
  const state=audio();host.querySelectorAll('[data-room-record]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.roomRecord===state.trackId));button.dataset.playing=String(button.dataset.roomRecord===state.trackId&&state.playing);});
  const playback=host.querySelector('[data-room-playback]');if(playback){
   const phase=root.dataset.roomSound,quiet=root.dataset.environmentPaused==='true',loading=phase==='wanted'&&!quiet;
   playback.textContent=state.playing?t('暂停音乐','Pause music'):loading?t('取消载入','Cancel loading'):phase==='error'?t('重试播放','Retry playback'):t('播放音乐','Play music');
   playback.setAttribute('aria-pressed',String(state.playing));playback.setAttribute('aria-busy',String(loading));playback.disabled=quiet;
   let status=host.querySelector('[data-room-playback-status]');
   if(!status){status=document.createElement('p');status.dataset.roomPlaybackStatus='';status.className='room-records__status';status.setAttribute('role','status');playback.parentElement.after(status);}
   status.textContent=quiet?t('安静模式已开启，关闭后可播放。','Turn off quiet mode to play music.'):loading?t('正在载入音乐…','Loading music…'):phase==='error'?t('音乐未能载入，请重试。','Music could not load. Please retry.'):phase==='blocked'?t('点按播放，开启声音。','Press play to enable sound.'):state.playing&&state.volume===0?t('音箱已静音，可调高音量。','The speaker is muted. Raise the volume to listen.'):'';
   status.hidden=!status.textContent;
  }
  // Update the existing range in place: playback completion and gain changes
  // can arrive during a drag, when replacing its DOM would lose pointer/focus.
  const slider=host.querySelector('[data-room-volume]'),output=host.querySelector('[data-room-volume-value]');
  if(slider){const percent=String(Math.round(state.volume*100));if(slider.value!==percent)slider.value=percent;slider.setAttribute('aria-valuetext',percent+'%');if(output)output.value=percent+'%';}
 }
 host.addEventListener('input',event=>{const slider=event.target.closest('[data-room-volume]');if(slider)root.dispatchEvent(new CustomEvent('space:roomvolume',{detail:{volume:slider.valueAsNumber/100}}));},{signal:abort.signal});
 host.addEventListener('click',event=>{const book=event.target.closest('[data-room-book]'),record=event.target.closest('[data-room-record]');if(book)onInspect?.('book:'+book.dataset.roomBook,book);if(record)onSelectRecord?.(record.dataset.roomRecord);if(event.target.closest('[data-room-playback]'))onPlayback?.();if(event.target.closest('[data-room-brew]'))onToggleObject?.('espresso');},{signal:abort.signal});
 root.addEventListener('space:roomaudio',refreshAudio,{signal:abort.signal});
 return {show(action){current=action;render();},focus(){host.querySelector('[data-room-detail-title]')?.focus({preventScroll:true});},contains(node){return host.contains(node);},get element(){return host;},dispose(){abort.abort();host.remove();}};
}
