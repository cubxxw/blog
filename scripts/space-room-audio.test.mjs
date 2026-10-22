import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRoomAudio} from '../assets/js/space/room-audio.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});return {promise,resolve,reject};}
function blocked(){return Object.assign(new Error('A gesture is required'),{name:'NotAllowedError'});}

// Only the browser-owned DOM and media boundary are replaced. A delayed play
// can become audible after pause(), exposing stale-completion leaks in the real
// audio controller rather than merely checking how often its methods are called.
function fixture(options={}) {
  const originals=new Map(),tracks=[],observers=[],states=[],contexts=[],requests=[],stored=new Map(),storageWrites=[];
  const replace=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  class Element extends EventTarget {
    constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.dataset={};this.hidden=false;this.children=[];this.attributes=new Map();this.parentNode=null;}
    append(...nodes){for(const node of nodes){node.remove?.();node.parentNode=this;this.children.push(node);}}
    prepend(node){node.remove?.();node.parentNode=this;this.children.unshift(node);}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}
    setAttribute(key,value){this.attributes.set(key,String(value));}
    getAttribute(key){return this.attributes.get(key)??null;}
    removeAttribute(key){this.attributes.delete(key);}
    closest(selector){
      const matches=selector.split(',').some(part=>{
        const match=part.trim().match(/^([a-z]+)?\[data-([a-z-]+)(?:="([^"]*)")?\]$/);
        if(!match)return false;
        const [,tag,attribute,value]=match,key=attribute.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
        return (!tag||this.tagName===tag.toUpperCase())&&Object.hasOwn(this.dataset,key)&&(value===undefined||this.dataset[key]===value);
      });
      return matches?this:this.parentNode?.closest(selector)??null;
    }
  }
  const root=new Element(),utilities=new Element(),footer=new Element();root.append(utilities,footer);
  root.querySelector=selector=>selector==='.space-cafe__utilities'?utilities:selector==='.space-cafe__footer'?footer:null;
  const document=new EventTarget();document.hidden=Boolean(options.hidden);document.createElement=tag=>new Element(tag);
  class Media extends Element {
    constructor(){super('audio');this.paused=true;this.playCalls=0;this.loadCalls=0;this.results=[...(options.results?.[tracks.length]||[])];tracks.push(this);}
    play(){this.playCalls++;const next=this.results.shift();return Promise.resolve(next?.promise??next).then(()=>{this.paused=false;});}
    pause(){this.paused=true;}
    load(){this.loadCalls++;}
  }
  replace('document',document);replace('Audio',Media);
  if(options.savedVolume!==undefined)stored.set('space:cafe:music-volume:v1',String(options.savedVolume));
  replace('localStorage',{getItem:key=>stored.get(key)??null,setItem(key,value){stored.set(key,value);storageWrites.push({key,value});}});
  if(options.independentAmbience){
    replace('navigator',{userActivation:{hasBeenActive:!options.blocked,isActive:!options.blocked}});
    class Buffer {
      constructor(channels,length,sampleRate){this.numberOfChannels=channels;this.length=length;this.sampleRate=sampleRate;this.duration=length/sampleRate;this.channels=Array.from({length:channels},()=>new Float32Array(length).fill(.1));}
      getChannelData(channel){return this.channels[channel];}
    }
    replace('AudioContext',class {
      constructor(){this.state=options.blocked?'suspended':'running';this.currentTime=0;this.sources=[];this.resumeCalls=0;contexts.push(this);}
      resume(){this.resumeCalls++;if(globalThis.navigator.userActivation.isActive){if(options.resumeDelay)return options.resumeDelay.promise.then(()=>{this.state='running';});this.state='running';}return this.state==='running'?Promise.resolve():(options.initialResume?.promise??new Promise(()=>{}));}
      createBuffer(channels,length,rate){return new Buffer(channels,length,rate);}
      async decodeAudioData(bytes){if(options.decodeGate)await options.decodeGate.promise;return new Buffer(2,bytes.byteLength===1?1740:1200,10);}
      createGain(){
        const ctx=this,events=[];let intrinsic=1;
        const param={events,calls:[],get nominal(){return intrinsic;},get value(){return this.valueAt(ctx.currentTime);},set value(value){intrinsic=value;},
          valueAt(time){let previous={time:0,value:intrinsic};for(const event of events){if(event.time>time){if(event.type==='ramp'&&event.time>previous.time)return previous.value+(event.value-previous.value)*(time-previous.time)/(event.time-previous.time);return previous.value;}previous=event;}return previous.value;},
          setValueAtTime(value,time){events.push({type:'set',value,time});this.calls.push({type:'set',value,time});return this;},
          linearRampToValueAtTime(value,time){events.push({type:'ramp',value,time});this.calls.push({type:'ramp',value,time});return this;},
          cancelScheduledValues(time){for(let i=events.length-1;i>=0;i--)if(events[i].time>=time)events.splice(i,1);this.calls.push({type:'cancel',time});return this;}
        };
        return {gain:param,disconnected:false,connect(){},disconnect(){this.disconnected=true;}};
      }
      createBufferSource(){const ctx=this,source={active:false,stopAt:Infinity,disconnected:false,connect(gain){this.gain=gain;},disconnect(){this.disconnected=true;},start(when,offset){this.active=true;this.offset=offset;this.when=when;},stop(when=ctx.currentTime){this.stopAt=when;if(when<=ctx.currentTime)this.finish();},finish(){if(!this.active)return;this.active=false;this.onended?.();}};this.sources.push(source);return source;}
      close(){this.state='closed';return Promise.resolve();}
    });
    replace('fetch',async(url,{signal}={})=>{requests.push({url,signal});const next=options.fetchResults?.[url];if(next)await next.promise;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(url.includes('music')?1:2)};});
  }
  replace('MutationObserver',class {constructor(callback){this.callback=callback;this.active=true;observers.push(this);}observe(){}disconnect(){this.active=false;}});
  const controller=mountRoomAudio({root,assets:{music:'/music.mp3',ambience:'/rain.ogg'},zh:true,defaultEnabled:true,embedded:true,onStateChange:state=>states.push(state),...options});
  return {root,utilities,footer,tracks,states,controller,contexts,requests,stored,storageWrites,
    lane(volume){return contexts.flatMap(context=>context.sources).filter(source=>source.gain.gain.nominal===volume);},
    advance(seconds){for(const context of contexts){context.currentTime+=seconds;for(const source of context.sources)if(source.active&&source.stopAt<=context.currentTime)source.finish();}},
    unlock(){globalThis.navigator.userActivation.hasBeenActive=true;globalThis.navigator.userActivation.isActive=true;},
    click(trusted=true,target=root){const event=new Event('click');Object.defineProperty(event,'isTrusted',{value:trusted});Object.defineProperty(event,'target',{value:target});root.dispatchEvent(event);},
    key(trusted=true,target=root){const event=new Event('keydown');Object.defineProperty(event,'isTrusted',{value:trusted});Object.defineProperty(event,'target',{value:target});root.dispatchEvent(event);},
    objectControl(kind){const button=new Element('button');button.dataset.roomObject=kind;root.append(button);return button;},
    hide(value){document.hidden=value;document.dispatchEvent(new Event('visibilitychange'));},
    hideRoot(value){root.hidden=value;for(const observer of observers)if(observer.active)observer.callback();},
    restore(){controller.dispose();for(const [key,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];},
  };
}

test('weather fades only rain, pauses it in daylight and resumes it without replacing indoor music',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();const music=f.lane(.6)[0],rain=f.lane(1.5)[0];assert.ok(music&&rain);
    f.advance(2);f.controller.setRainLevel(.4);f.advance(.6);
    assert.ok(Math.abs(rain.gain.gain.value-.6)<1e-8);assert.equal(music.active,true);
    const musicTime=f.controller.snapshot().musicTime;
    f.controller.setRainLevel(0);await settle();
    assert.equal(f.controller.snapshot().ambientWanted,false);assert.equal(f.controller.snapshot().ambientPlaying,false);assert.equal(music.active,true);
    f.advance(3);f.controller.setRainLevel(1);await settle();
    assert.equal(f.controller.snapshot().ambientPlaying,true);assert.equal(music.active,true);
    assert.ok(f.controller.snapshot().musicTime>musicTime);assert.equal(f.lane(.6).length,1);
  }finally{f.restore();}
});

test('a ready embedded room starts both tracks by default without adding floating controls',async()=>{
  const f=fixture();try{
    await settle();
    assert.deepEqual(f.tracks.map(track=>track.paused),[false,false]);
    assert.equal(f.root.dataset.roomSound,'playing');assert.equal(f.controller.snapshot().wanted,true);
    assert.equal(f.utilities.children.length,0);assert.equal(f.footer.children.length,0);
    assert.equal(f.controller.credits.tagName,'DETAILS');assert.equal(f.controller.credits.parentNode,null);
    assert.equal(f.states.at(-1).playing,true);
  }finally{f.restore();}
});

test('legacy callers stay silent until their sound control is selected',async()=>{
  const f=fixture({defaultEnabled:undefined,embedded:false});try{
    await settle();assert.deepEqual(f.tracks.map(track=>track.playCalls),[0,0]);
    assert.equal(f.root.dataset.roomSound,'paused');assert.equal(f.utilities.children.length,1);assert.equal(f.footer.children.length,1);
    f.utilities.children[0].dispatchEvent(new Event('click'));await settle();
    assert.deepEqual(f.tracks.map(track=>track.paused),[false,false]);
  }finally{f.restore();}
});

test('blocked autoplay keeps intent, rejects synthetic retries and starts on the first trusted gesture',async()=>{
  const blockedMusic=deferred(),blockedRain=deferred();
  const f=fixture({results:[[blockedMusic],[blockedRain]]});try{
    blockedMusic.reject(blocked());blockedRain.reject(blocked());await settle();
    assert.equal(f.controller.state.status,'blocked');assert.equal(f.controller.state.wanted,true);
    assert.equal(f.root.dataset.roomSound,'blocked');assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
    f.click(false);await settle();assert.equal(f.controller.state.status,'blocked');
    f.click();await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('the first speaker toggle retries blocked sound and a following click cannot duplicate the attempt',async()=>{
  const first=deferred(),retryMusic=deferred(),retryRain=deferred();
  const f=fixture({results:[[first,retryMusic],[undefined,retryRain]]});try{
    first.reject(blocked());await settle();assert.equal(f.controller.state.status,'blocked');
    f.controller.toggle();f.click();
    assert.equal(f.controller.state.wanted,true);assert.deepEqual(f.tracks.map(track=>track.playCalls),[2,2]);
    retryMusic.resolve();retryRain.resolve();await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('a trusted keyboard gesture can retry blocked autoplay',async()=>{
  const first=deferred(),f=fixture({results:[[first],[]]});try{
    first.reject(blocked());await settle();f.key();await settle();
    assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('keyboard activation of the room speaker starts blocked audio once without cancelling itself',async()=>{
  const first=deferred(),music=deferred(),rain=deferred(),f=fixture({results:[[first,music],[undefined,rain]]});try{
    first.reject(blocked());await settle();
    const speaker=f.objectControl('speaker');
    f.key(true,speaker);f.controller.toggle();f.click(true,speaker);
    music.resolve();rain.resolve();await settle();
    assert.equal(f.controller.state.wanted,true);assert.equal(f.controller.state.status,'playing');
    assert.deepEqual(f.tracks.map(track=>track.playCalls),[2,2]);assert.deepEqual(f.tracks.map(track=>track.paused),[false,false]);
  }finally{f.restore();}
});

test('keyboard activation of the legacy sound button leaves playback to its own click handler',async()=>{
  const first=deferred(),music=deferred(),rain=deferred(),f=fixture({embedded:false,results:[[first,music],[undefined,rain]]});try{
    first.reject(blocked());await settle();
    const button=f.utilities.children[0];
    f.key(true,button);button.dispatchEvent(new Event('click'));f.click(true,button);
    music.resolve();rain.resolve();await settle();
    assert.equal(f.controller.state.status,'playing');assert.deepEqual(f.tracks.map(track=>track.playCalls),[2,2]);
  }finally{f.restore();}
});

test('manual speaker mute survives visibility changes, quiet mode and later gestures',async()=>{
  const f=fixture();try{
    await settle();f.controller.toggle();
    assert.equal(f.controller.state.wanted,false);assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
    f.hide(true);f.hide(false);f.controller.setQuiet(true);f.controller.setQuiet(false);f.click();f.key();await settle();
    assert.equal(f.controller.state.status,'paused');assert.deepEqual(f.tracks.map(track=>track.playCalls),[1,1]);
    f.controller.toggle();await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('a speaker click cancels pending playback and late starts stay silent until an explicit retry',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({results:[[music],[rain]]});try{
    await Promise.resolve();
    assert.equal(f.controller.state.status,'wanted');assert.deepEqual(f.tracks.map(track=>track.playCalls),[1,1]);
    f.controller.toggle();f.click();
    assert.equal(f.controller.state.wanted,false);assert.equal(f.root.dataset.roomSound,'paused');
    assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
    music.resolve();rain.resolve();await settle();
    assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);assert.equal(f.controller.state.status,'paused');
    assert.deepEqual(f.tracks.map(track=>track.playCalls),[1,1]);
    f.controller.toggle();await settle();assert.equal(f.controller.state.status,'playing');
    assert.deepEqual(f.tracks.map(track=>track.paused),[false,false]);
  }finally{f.restore();}
});

test('initial quiet mode prevents autoplay and resumes the default intent only after quiet ends',async()=>{
  const f=fixture({initialQuiet:true});try{
    await settle();assert.deepEqual(f.tracks.map(track=>track.playCalls),[0,0]);assert.equal(f.controller.state.status,'paused');
    assert.equal(f.controller.state.wanted,true);f.click();f.controller.toggle();await settle();
    assert.deepEqual(f.tracks.map(track=>track.playCalls),[0,0]);
    f.controller.setQuiet(false);await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('quiet applied immediately after mount prevents even a brief default start',async()=>{
  const f=fixture();try{
    f.controller.setQuiet(true);await settle();assert.deepEqual(f.tracks.map(track=>track.playCalls),[0,0]);
    f.controller.setQuiet(false);await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('a hidden tab or hidden room pauses both tracks and resumes only while still wanted',async()=>{
  const f=fixture();try{
    await settle();f.hide(true);await settle();assert.equal(f.controller.state.status,'paused');assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
    f.hideRoot(true);f.hide(false);await settle();assert.equal(f.controller.state.status,'paused');
    f.hideRoot(false);await settle();assert.equal(f.controller.state.status,'playing');
    f.controller.setQuiet(true);f.hide(true);f.hide(false);await settle();assert.equal(f.controller.state.status,'paused');
  }finally{f.restore();}
});

test('temporary quiet mode pauses a playing room without discarding its playback intent',async()=>{
  const f=fixture();try{
    await settle();f.controller.setQuiet(true);await settle();
    assert.equal(f.controller.state.wanted,true);assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
    f.controller.setQuiet(false);await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('hidden initial rooms wait for visibility before trying default audio',async()=>{
  const f=fixture({hidden:true});try{
    await settle();assert.deepEqual(f.tracks.map(track=>track.playCalls),[0,0]);
    f.hide(false);await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('one failed track pauses its partner including a play that completes late',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({results:[[music],[rain]]});try{
    music.reject(new Error('missing audio'));await settle();
    assert.equal(f.controller.state.status,'error');assert.equal(f.controller.state.playing,false);
    rain.resolve();await settle();assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
    f.click();await settle();assert.equal(f.controller.state.status,'error','ordinary clicks retry only browser-policy blocks');
    f.controller.toggle();await settle();assert.equal(f.controller.state.status,'playing');
  }finally{f.restore();}
});

test('a media failure after playback starts pauses the other track and reports the error',async()=>{
  const f=fixture();try{
    await settle();f.tracks[1].dispatchEvent(new Event('error'));await settle();
    assert.equal(f.controller.state.status,'error');assert.equal(f.states.at(-1).playing,false);
    assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);
  }finally{f.restore();}
});

test('late play completions cannot restart music after quiet mode pauses it',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({results:[[music],[rain]]});try{
    await Promise.resolve();f.controller.setQuiet(true);music.resolve();rain.resolve();await settle();
    assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);assert.equal(f.controller.state.status,'paused');
  }finally{f.restore();}
});

test('a stale failure cannot cancel a newer successful visible-room attempt',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({results:[[music],[rain]]});try{
    await Promise.resolve();f.hide(true);f.hide(false);await settle();
    assert.equal(f.controller.state.status,'playing');music.reject(blocked());rain.resolve();await settle();
    assert.equal(f.controller.state.status,'playing');assert.deepEqual(f.tracks.map(track=>track.paused),[false,false]);
  }finally{f.restore();}
});

test('disposing removes owned UI and listeners and prevents late playback',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({results:[[music],[rain]],embedded:false});try{
    await Promise.resolve();f.controller.dispose();music.resolve();rain.resolve();await settle();f.click();f.key();f.hide(true);f.hide(false);f.controller.toggle();f.controller.setQuiet(false);await settle();
    assert.deepEqual(f.tracks.map(track=>track.paused),[true,true]);assert.deepEqual(f.tracks.map(track=>track.playCalls),[1,1]);
    assert.deepEqual(f.tracks.map(track=>track.loadCalls),[1,1]);assert.equal(f.controller.state.status,'disposed');
    assert.equal(f.root.children.length,2);assert.equal(f.utilities.children.length,0);assert.equal(f.footer.children.length,0);
    assert.equal(f.root.dataset.roomSound,undefined);
  }finally{f.restore();}
});

test('disposing before the initial playback task starts makes no media request',async()=>{
  const f=fixture();try{
    f.controller.dispose();await settle();assert.deepEqual(f.tracks.map(track=>track.playCalls),[0,0]);
  }finally{f.restore();}
});


test('independent room keeps outdoor rain running and its clock advancing when music is muted',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.playing,true);
    f.advance(12);const rain=f.lane(1.5).at(-1),before=f.controller.state.ambientTime;
    f.controller.toggle();f.advance(5);await settle();
    assert.equal(f.controller.state.wanted,false);assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.ambientWanted,true);
    assert.equal(f.controller.state.ambientPlaying,true);assert.ok(f.controller.state.ambientTime>=before+5);
    assert.equal(rain.active,true);assert.equal(f.lane(1.5).length,1);assert.equal(f.lane(.6).at(-1).active,false);
    f.controller.toggle();await settle();assert.equal(f.controller.state.playing,true);assert.equal(f.lane(1.5).length,1);
    assert.equal(f.lane(.6).at(-1).offset,12);assert.equal(f.root.dataset.roomAmbient,'playing');
  }finally{f.restore();}
});

test('independent ambience defaults on even when the music intent defaults off',async()=>{
  const f=fixture({independentAmbience:true,defaultEnabled:false});try{
    await settle();assert.equal(f.controller.state.wanted,false);assert.equal(f.controller.state.ambientPlaying,true);
    assert.equal(f.lane(.6).length,0);assert.equal(f.lane(1.5).length,1);
  }finally{f.restore();}
});

test('a failed independent music request cannot stop outdoor rain',async()=>{
  const failure=deferred(),f=fixture({independentAmbience:true,fetchResults:{'/music.mp3':failure}});try{
    await settle();failure.reject(new Error('missing music'));await settle();
    assert.equal(f.controller.state.status,'error');assert.equal(f.controller.state.ambientStatus,'playing');assert.equal(f.lane(1.5).at(-1).active,true);
    f.controller.toggle();await settle();assert.equal(f.controller.state.ambientPlaying,true);
  }finally{f.restore();}
});

test('a failed independent rain request leaves the music playing',async()=>{
  const failure=deferred(),f=fixture({independentAmbience:true,fetchResults:{'/rain.ogg':failure}});try{
    await settle();failure.reject(new Error('missing rain'));await settle();
    assert.equal(f.controller.state.status,'playing');assert.equal(f.controller.state.ambientStatus,'error');assert.equal(f.lane(.6).at(-1).active,true);
  }finally{f.restore();}
});

test('a trusted speaker gesture unlocks blocked rain while music intent stays off',async()=>{
  const f=fixture({independentAmbience:true,defaultEnabled:false,blocked:true});try{
    await settle();assert.equal(f.controller.state.ambientStatus,'blocked');assert.equal(f.controller.state.status,'paused');
    f.click(false);await settle();assert.equal(f.controller.state.ambientStatus,'blocked');
    f.unlock();f.key(true,f.objectControl('speaker'));await settle();
    assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.wanted,false);assert.equal(f.lane(.6).length,0);
  }finally{f.restore();}
});

test('speaker keyboard activation retries blocked music once without cancelling the rain unlock',async()=>{
  const f=fixture({independentAmbience:true,blocked:true});try{
    await settle();assert.equal(f.controller.state.status,'blocked');
    const speaker=f.objectControl('speaker');f.unlock();f.key(true,speaker);f.controller.toggle();f.click(true,speaker);await settle();
    assert.equal(f.controller.state.wanted,true);assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.ambientPlaying,true);
    assert.equal(f.lane(.6).length,1);assert.equal(f.lane(1.5).length,1);
  }finally{f.restore();}
});

test('muting pending music does not cancel rain loading and late music stays silent',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({independentAmbience:true,fetchResults:{'/music.mp3':music,'/rain.ogg':rain}});try{
    await Promise.resolve();f.controller.toggle();f.click();rain.resolve();await settle();
    assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.wanted,false);
    music.resolve();await settle();assert.equal(f.controller.state.playing,false);assert.equal(f.lane(.6).length,0);
    assert.equal(f.controller.state.ambientPlaying,true);
  }finally{f.restore();}
});

test('quiet and hidden pause independent loops at their own retained positions without restoring muted music',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(7);f.controller.toggle();f.controller.setQuiet(true);f.advance(20);await settle();
    assert.equal(f.controller.state.ambientPlaying,false);assert.equal(f.controller.state.ambientWanted,true);assert.equal(f.controller.state.ambientTime,7);
    f.controller.setQuiet(false);await settle();assert.equal(f.lane(1.5).at(-1).offset,7);assert.equal(f.controller.state.playing,false);
    f.advance(4);f.hideRoot(true);f.hide(true);f.hideRoot(false);await settle();assert.equal(f.controller.state.ambientPlaying,false);
    f.hide(false);await settle();assert.equal(f.lane(1.5).at(-1).offset,11);assert.equal(f.controller.state.wanted,false);
  }finally{f.restore();}
});

test('rapid independent music toggles never duplicate or restart the rain source',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();for(let i=0;i<20;i++){f.controller.toggle();await settle();f.advance(.1);}
    assert.equal(f.controller.state.playing,true);assert.equal(f.lane(1.5).length,1);assert.equal(f.lane(1.5)[0].active,true);
    assert.equal(f.lane(.6).filter(source=>source.active).length,1);assert.ok(f.controller.state.ambientTime>=2);
  }finally{f.restore();}
});

test('a disposed independent room aborts pending loads and can never start late loops',async()=>{
  const music=deferred(),rain=deferred(),f=fixture({independentAmbience:true,fetchResults:{'/music.mp3':music,'/rain.ogg':rain}});try{
    await Promise.resolve();f.controller.dispose();music.resolve();rain.resolve();await settle();
    assert.equal(f.controller.state.status,'disposed');assert.equal(f.controller.state.ambientStatus,'disposed');
    assert.equal(f.contexts[0].state,'closed');assert.ok(f.requests.every(request=>request.signal.aborted));
    assert.equal(f.lane(.6).length+f.lane(1.5).length,0);assert.equal(f.root.dataset.roomAmbient,undefined);
  }finally{f.restore();}
});


test('both independent lanes share one trusted AudioContext resume while a suspended browser is unlocking',async()=>{
  const resumeDelay=deferred(),f=fixture({independentAmbience:true,blocked:true,resumeDelay});try{
    await settle();const before=f.contexts[0].resumeCalls;f.unlock();f.click();
    assert.equal(f.contexts[0].resumeCalls-before,1,'one user gesture must resume the shared context only once');
    resumeDelay.resolve();await settle();assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.ambientPlaying,true);
  }finally{f.restore();}
});


test('a stale autoplay resume rejection cannot stop newer independently playing loops',async()=>{
  const initialResume=deferred(),f=fixture({independentAmbience:true,blocked:true,initialResume});try{
    await settle();f.unlock();f.click();await settle();assert.equal(f.controller.state.ambientPlaying,true);
    initialResume.reject(blocked());await settle();
    assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.ambientPlaying,true);
    assert.equal(f.lane(.6).filter(source=>source.active).length,1);assert.equal(f.lane(1.5).filter(source=>source.active).length,1);
  }finally{f.restore();}
});

test('quiet cancels in-flight decoding without letting either independent loop start late',async()=>{
  const decodeGate=deferred(),f=fixture({independentAmbience:true,decodeGate});try{
    await settle();f.controller.setQuiet(true);decodeGate.resolve();await settle();
    assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.ambientPlaying,false);
    assert.equal(f.lane(.6).length+f.lane(1.5).length,0);
    f.controller.setQuiet(false);await settle();assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.ambientPlaying,true);
    assert.equal(f.requests.length,2,'resuming reuses already decoded loops');
  }finally{f.restore();}
});

test('disposing during decode releases the independent context and prevents late source creation',async()=>{
  const decodeGate=deferred(),f=fixture({independentAmbience:true,decodeGate});try{
    await settle();f.controller.dispose();decodeGate.resolve();await settle();
    assert.equal(f.contexts[0].state,'closed');assert.equal(f.lane(.6).length+f.lane(1.5).length,0);
    assert.equal(f.controller.state.ambientStatus,'disposed');
  }finally{f.restore();}
});

test('a trusted quiet-mode exit can unlock blocked independent loops on that same gesture',async()=>{
  const f=fixture({independentAmbience:true,blocked:true});try{
    await settle();f.controller.setQuiet(true);f.unlock();f.click();f.controller.setQuiet(false);await settle();
    assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.ambientPlaying,true);
    assert.equal(f.lane(1.5).filter(source=>source.active).length,1);
  }finally{f.restore();}
});


test('music fades in and out on the sample clock while the retained cursor and rain source stay unchanged',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();const music=f.lane(.6).at(-1),rain=f.lane(1.5).at(-1),gain=music.gain.gain;
    assert.equal(gain.value,0,'a new source must start at zero gain');
    f.advance(.03);assert.ok(Math.abs(gain.value-.3)<1e-9);f.advance(.03);assert.ok(Math.abs(gain.value-.6)<1e-9);
    f.advance(2);const before=f.controller.state.musicTime;f.controller.toggle();
    assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.musicTime,before);
    assert.equal(music.active,true,'the audio clock owns the short fade tail');assert.equal(gain.value,.6);
    f.advance(.03);assert.ok(Math.abs(gain.value-.3)<1e-8);assert.equal(f.controller.state.musicTime,before);
    f.advance(.031);assert.equal(music.active,false);assert.equal(music.disconnected,true);assert.equal(music.gain.disconnected,true);
    assert.equal(rain.active,true);assert.equal(rain.gain.gain.value,1.5);assert.equal(f.lane(1.5).length,1);
    f.controller.toggle();await settle();assert.equal(f.lane(.6).at(-1).offset,before);assert.equal(f.lane(.6).at(-1).gain.gain.value,0);
  }finally{f.restore();}
});

test('an old fading source cannot change the gain or cleanup of a rapidly restarted music source',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(.02);const old=f.lane(.6).at(-1);f.controller.toggle();f.controller.toggle();await settle();
    const current=f.lane(.6).at(-1);assert.notEqual(current,old);assert.notEqual(current.gain,old.gain);
    assert.equal(current.offset,.02);assert.equal(current.gain.gain.value,0);
    f.advance(.03);assert.ok(Math.abs(old.gain.gain.value-.1)<1e-8);assert.ok(Math.abs(current.gain.gain.value-.3)<1e-8);
    f.advance(.031);assert.equal(old.active,false);assert.equal(old.buffer,null);assert.equal(current.active,true);assert.equal(current.gain.disconnected,false);
    assert.ok(Math.abs(current.gain.gain.value-.6)<1e-8);assert.equal(f.controller.state.playing,true);
    assert.equal(f.lane(1.5).length,1);assert.equal(f.lane(1.5)[0].active,true);
  }finally{f.restore();}
});

test('disposing releases buffers and every source gain including an unfinished music fade',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(.1);f.controller.toggle();f.controller.toggle();await settle();
    const owned=[...f.contexts[0].sources];assert.ok(owned.some(source=>source.active));
    f.controller.dispose();
    assert.ok(owned.every(source=>!source.active&&source.disconnected&&source.gain.disconnected));
    assert.ok(owned.every(source=>source.buffer===null&&source.onended===null));
    assert.equal(f.contexts[0].state,'closed');assert.equal(f.controller.state.status,'disposed');
  }finally{f.restore();}
});

for(const kind of ['canvas click','speaker key'])test(`a trusted ${kind} retries a failed rain load without changing music intent or polling`,async()=>{
  const failure=deferred(),fetchResults={'/rain.ogg':failure},f=fixture({independentAmbience:true,defaultEnabled:false,fetchResults});
  const activate=()=>kind==='canvas click'?f.click():f.key(true,f.objectControl('speaker'));
  try{
    failure.reject(new Error('temporary audio service failure'));await settle();
    assert.equal(f.controller.state.ambientStatus,'error');assert.equal(f.requests.length,1);
    f.hide(true);f.hide(false);f.controller.setQuiet(true);f.controller.setQuiet(false);f.click(false);f.key(false);await settle();
    assert.equal(f.requests.length,1,'visibility, quiet mode and synthetic events must not create an error retry loop');
    activate();await settle();await settle();
    assert.equal(f.requests.length,2,'one trusted gesture creates at most one failed retry');
    assert.equal(f.controller.state.ambientStatus,'error');assert.equal(f.controller.state.wanted,false);
    delete fetchResults['/rain.ogg'];activate();await settle();
    assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.wanted,false);assert.equal(f.lane(.6).length,0);
    assert.equal(f.requests.length,3);activate();await settle();assert.equal(f.requests.length,3,'an already playing rain loop must stay untouched');
    assert.equal(f.lane(1.5).length,1);
  }finally{f.restore();}
});

const recordTracks=Object.freeze([
  {id:'sax',title:'Night on the Docks - Sax',titleEn:'Night on the Docks - Sax',artist:'Kevin MacLeod',src:'/music.mp3'},
  {id:'stroll',title:'Long Stroll',titleEn:'Long Stroll',artist:'Kevin MacLeod',src:'/music-stroll.mp3'},
  {id:'piano',title:'Almost New',titleEn:'Almost New',artist:'Kevin MacLeod',src:'/music-piano.mp3'},
]);

test('selecting a real record changes only music and retains the original running rain source',async()=>{
  const f=fixture({independentAmbience:true,defaultEnabled:false,tracks:recordTracks});try{
    await settle();const rain=f.lane(1.5)[0];f.advance(13);
    assert.equal(f.controller.state.trackId,'sax');assert.deepEqual(f.controller.tracks.map(track=>track.id),['sax','stroll','piano']);
    f.controller.selectTrack('stroll');await settle();f.advance(4);
    assert.equal(f.controller.state.trackId,'stroll');assert.equal(f.controller.state.playing,true);
    assert.equal(f.controller.state.ambientTime,17);assert.equal(f.lane(1.5).length,1);assert.equal(rain.active,true);
    assert.ok(f.requests.some(request=>request.url==='/music-stroll.mp3'));
    const music=f.lane(.6)[0];f.controller.selectTrack('stroll');await settle();
    assert.equal(f.lane(.6).length,1);assert.equal(music.active,true);
  }finally{f.restore();}
});

test('replacing a playing record disconnects and releases its decoded source without affecting rain',async()=>{
  const f=fixture({independentAmbience:true,tracks:recordTracks});try{
    await settle();const retired=f.lane(.6)[0];f.advance(3);f.controller.selectTrack('piano');await settle();f.advance(.1);
    assert.equal(retired.active,false);assert.equal(retired.disconnected,true);assert.equal(retired.buffer,null);
    assert.equal(f.controller.state.trackId,'piano');assert.ok(Math.abs(f.controller.state.musicTime-.1)<1e-6);
    assert.equal(f.controller.state.ambientTime,3.1);assert.equal(f.lane(1.5).length,1);
  }finally{f.restore();}
});

test('a superseded pending record can neither start nor overwrite the newer selection after failure',async()=>{
  const old=deferred(),f=fixture({independentAmbience:true,defaultEnabled:false,tracks:recordTracks,fetchResults:{'/music-stroll.mp3':old}});try{
    await settle();f.controller.selectTrack('stroll');f.controller.selectTrack('piano');await settle();
    assert.equal(f.controller.state.playing,true);old.reject(new Error('retired request'));await settle();
    assert.equal(f.controller.state.trackId,'piano');assert.equal(f.controller.state.status,'playing');
    assert.equal(f.lane(.6).filter(source=>source.active).length,1);assert.equal(f.lane(1.5).length,1);
  }finally{f.restore();}
});

test('a record load failure is recoverable and does not cancel the outdoor rain',async()=>{
  const failure=deferred(),fetchResults={'/music-stroll.mp3':failure};
  const f=fixture({independentAmbience:true,defaultEnabled:false,tracks:recordTracks,fetchResults});try{
    await settle();f.controller.selectTrack('stroll');failure.reject(new Error('unavailable'));await settle();
    assert.equal(f.controller.state.status,'error');assert.equal(f.controller.state.trackId,'stroll');assert.equal(f.controller.state.ambientPlaying,true);
    delete fetchResults['/music-stroll.mp3'];f.controller.selectTrack('stroll');await settle();
    assert.equal(f.controller.state.status,'playing');assert.equal(f.lane(1.5).length,1);
  }finally{f.restore();}
});

test('quiet mode holds record intent, unknown selections do nothing, and disposed selection stays silent',async()=>{
  const f=fixture({independentAmbience:true,defaultEnabled:false,tracks:recordTracks});try{
    await settle();f.controller.setQuiet(true);f.controller.selectTrack('piano');await settle();
    assert.equal(f.controller.state.trackId,'piano');assert.equal(f.controller.state.wanted,true);assert.equal(f.controller.state.playing,false);
    f.controller.selectTrack('unknown');assert.equal(f.controller.state.trackId,'piano');
    f.controller.setQuiet(false);await settle();assert.equal(f.controller.state.playing,true);
    f.controller.dispose();f.controller.selectTrack('stroll');await settle();
    assert.equal(f.controller.state.status,'disposed');assert.equal(f.controller.state.trackId,'piano');assert.equal(f.lane(.6).filter(source=>source.active).length,0);
  }finally{f.restore();}
});

test('opted-in background playback keeps the same rain and music sources advancing across tab visibility changes',async()=>{
  const f=fixture({independentAmbience:true,backgroundPlayback:true});try{
    await settle();f.advance(5);const music=f.lane(.6)[0],rain=f.lane(1.5)[0];
    f.hide(true);await settle();f.advance(7);
    assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.musicTime,12);assert.equal(f.controller.state.ambientTime,12);
    assert.equal(music.active,true);assert.equal(rain.active,true);assert.equal(f.lane(.6).length,1);assert.equal(f.lane(1.5).length,1);
    f.hide(false);await settle();f.advance(2);
    assert.equal(f.lane(.6)[0],music);assert.equal(f.lane(1.5)[0],rain);assert.equal(f.controller.state.musicTime,14);assert.equal(f.controller.state.ambientTime,14);
  }finally{f.restore();}
});

test('background playback still respects manual music intent, quiet mode, room visibility and disposal',async()=>{
  const f=fixture({independentAmbience:true,backgroundPlayback:true});try{
    await settle();f.hide(true);f.advance(3);f.controller.toggle();f.advance(.1);
    assert.equal(f.controller.state.wanted,false);assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.ambientPlaying,true);
    f.controller.setQuiet(true);const quietTime=f.controller.state.ambientTime;f.advance(4);assert.equal(f.controller.state.ambientPlaying,false);assert.equal(f.controller.state.ambientTime,quietTime);
    f.controller.setQuiet(false);await settle();assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.playing,false);
    f.hideRoot(true);const hiddenTime=f.controller.state.ambientTime;f.advance(2);assert.equal(f.controller.state.ambientPlaying,false);assert.equal(f.controller.state.ambientTime,hiddenTime);
    f.hideRoot(false);await settle();assert.equal(f.controller.state.ambientPlaying,true);assert.equal(f.controller.state.wanted,false);
    f.controller.dispose();f.hide(false);f.hide(true);await settle();assert.equal(f.controller.state.status,'disposed');assert.equal(f.controller.state.ambientStatus,'disposed');assert.equal(f.contexts[0].state,'closed');assert.equal(f.contexts[0].sources.filter(source=>source.active).length,0);
  }finally{f.restore();}
});

test('independent playback retains its default pause-on-hidden-tab policy without background opt-in',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(5);f.hide(true);f.advance(7);await settle();
    assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.ambientPlaying,false);assert.equal(f.controller.state.musicTime,5);assert.equal(f.controller.state.ambientTime,5);
    assert.equal(f.contexts[0].sources.filter(source=>source.active).length,0);
  }finally{f.restore();}
});

test('moving outside smooths the two real gains independently without replacing sources or resetting their clocks',async()=>{
  const f=fixture({independentAmbience:true,backgroundPlayback:true});try{
    await settle();f.advance(2);const [music,rain]=f.contexts[0].sources;
    const state=f.controller.setPerspective({music:.64,rain:1});
    assert.deepEqual(state.perspective,{music:.64,rain:1});assert.ok(Object.isFrozen(state));assert.ok(Object.isFrozen(state.perspective));
    f.advance(.275);assert.ok(Math.abs(music.gain.gain.value-.492)<1e-8,'music reaches half of its 550ms approach fade');
    f.advance(.275);assert.ok(Math.abs(music.gain.gain.value-.384)<1e-8);
    f.controller.setPerspective({music:.12,rain:.34});
    f.advance(.325);assert.ok(Math.abs(rain.gain.gain.value-1.005)<1e-8,'rain reaches half of its 650ms immersion fade');
    f.advance(.325);assert.ok(Math.abs(music.gain.gain.value-.072)<1e-8);assert.ok(Math.abs(rain.gain.gain.value-.51)<1e-8);
    f.hide(true);f.advance(4);f.hide(false);await settle();
    assert.deepEqual(f.contexts[0].sources,[music,rain]);assert.equal(music.active,true);assert.equal(rain.active,true);
    assert.ok(Math.abs(f.controller.state.musicTime-7.2)<1e-8);assert.ok(Math.abs(f.controller.state.ambientTime-7.2)<1e-8);
    assert.equal(f.controller.state.wanted,true);assert.equal(f.controller.state.ambientWanted,true);assert.equal(f.controller.state.volume,.6);
    assert.deepEqual(f.storageWrites,[],'a camera move never rewrites the listener’s chosen volume');
  }finally{f.restore();}
});

test('weather and the speaker slider keep their own values under a temporary perspective and return restores their actual gains',async()=>{
  const f=fixture({independentAmbience:true,savedVolume:.43});try{
    await settle();f.advance(2);const [music,rain]=f.contexts[0].sources;
    f.controller.setPerspective({music:.12,rain:.34});f.advance(.65);
    f.controller.setRainLevel(.4);f.controller.setVolume(.8);f.advance(.6);
    assert.ok(Math.abs(music.gain.gain.value-.096)<1e-8);assert.ok(Math.abs(rain.gain.gain.value-.204)<1e-8);
    assert.deepEqual(f.controller.state.perspective,{music:.12,rain:.34});assert.equal(f.controller.state.volume,.8);
    assert.equal(f.stored.get('space:cafe:music-volume:v1'),'0.8');assert.equal(f.storageWrites.length,1);
    const before=f.controller.state;f.controller.setPerspective();f.advance(.65);
    assert.ok(Math.abs(music.gain.gain.value-.8)<1e-8);assert.ok(Math.abs(rain.gain.gain.value-.6)<1e-8);
    assert.deepEqual(f.controller.state.perspective,{music:1,rain:1});assert.deepEqual(before.perspective,{music:.12,rain:.34},'older frozen snapshots remain stable');
    assert.deepEqual(f.contexts[0].sources,[music,rain]);assert.equal(f.storageWrites.length,1);
  }finally{f.restore();}
});

test('invalid perspectives are atomic and cannot pollute gains, state or saved volume',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(1);f.controller.setPerspective({music:.64,rain:.7});f.advance(1);
    const before=f.controller.state,params=f.contexts[0].sources.map(source=>source.gain.gain),calls=params.map(param=>param.calls.length);
    const getter={music:.5,get rain(){throw Error('must not run');}};
    const invalid=[null,[],.5,'quiet',new Date(),Object.create({music:.4}),{music:NaN,rain:.2},{music:.5,rain:Infinity},{music:.5,rain:'0.4'},{music:false,rain:.5},getter,new Proxy({},{getPrototypeOf(){throw Error('unavailable');}})];
    for(const value of invalid){const state=f.controller.setPerspective(value);assert.deepEqual(state.perspective,before.perspective);}
    assert.deepEqual(params.map(param=>param.calls.length),calls);assert.deepEqual(f.storageWrites,[]);
    f.advance(1);assert.ok(Math.abs(params[0].value-.384)<1e-8);assert.ok(Math.abs(params[1].value-1.05)<1e-8);
  }finally{f.restore();}
});

test('plain perspective values clamp and round while omitted lanes recover their default multiplier',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(1);
    assert.deepEqual(f.controller.setPerspective({music:-.1,rain:1.7}).perspective,{music:0,rain:1});
    assert.deepEqual(f.controller.setPerspective(Object.assign(Object.create(null),{music:.12349,rain:.45671})).perspective,{music:.123,rain:.457});
    assert.deepEqual(f.controller.setPerspective({music:.64}).perspective,{music:.64,rain:1});
    assert.deepEqual(f.controller.setPerspective({music:undefined,rain:undefined}).perspective,{music:1,rain:1});
  }finally{f.restore();}
});

test('late decoding and a newly selected record inherit the current perspective without restarting the rain',async()=>{
  const decodeGate=deferred(),f=fixture({independentAmbience:true,tracks:recordTracks,decodeGate});try{
    await settle();assert.equal(f.contexts[0].sources.length,0);
    f.controller.setPerspective({music:.12,rain:.34});f.controller.setVolume(.8);f.controller.setRainLevel(.4);
    decodeGate.resolve();await settle();f.advance(.1);
    const [music,rain]=f.contexts[0].sources;assert.ok(Math.abs(music.gain.gain.value-.096)<1e-8);assert.ok(Math.abs(rain.gain.gain.value-.204)<1e-8);
    f.advance(3);f.controller.selectTrack('piano');await settle();f.advance(.1);
    const next=f.contexts[0].sources.at(-1);assert.notEqual(next,music);assert.equal(next.active,true);assert.ok(Math.abs(next.gain.gain.value-.096)<1e-8);
    assert.equal(rain.active,true);assert.equal(f.contexts[0].sources.filter(source=>source===rain).length,1);
    assert.ok(Math.abs(f.controller.state.ambientTime-3.2)<1e-8);assert.deepEqual(f.controller.state.perspective,{music:.12,rain:.34});
  }finally{f.restore();}
});

test('returning indoors cannot unmute the speaker or override quiet mode and zero user volume',async()=>{
  const f=fixture({independentAmbience:true});try{
    await settle();f.advance(1);f.controller.toggle();f.controller.setVolume(0);f.controller.setQuiet(true);f.advance(.1);
    const sources=[...f.contexts[0].sources],before=f.controller.state;
    f.controller.setPerspective({music:.12,rain:.34});f.controller.setPerspective();await settle();f.advance(1);
    assert.equal(f.controller.state.wanted,false);assert.equal(f.controller.state.quiet,true);assert.equal(f.controller.state.volume,0);
    assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.ambientPlaying,false);assert.deepEqual(f.contexts[0].sources,sources);
    assert.equal(f.controller.state.musicTime,before.musicTime);assert.equal(f.controller.state.ambientTime,before.ambientTime);
    f.controller.setQuiet(false);await settle();f.advance(1);
    assert.equal(f.controller.state.playing,false);assert.equal(f.controller.state.wanted,false);assert.equal(f.controller.state.ambientPlaying,true);
    f.controller.toggle();await settle();f.advance(.1);assert.equal(f.contexts[0].sources.at(-1).gain.gain.value,0);
  }finally{f.restore();}
});
