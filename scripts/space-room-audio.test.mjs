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
  const originals=new Map(),tracks=[],observers=[],states=[];
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
  replace('MutationObserver',class {constructor(callback){this.callback=callback;this.active=true;observers.push(this);}observe(){}disconnect(){this.active=false;}});
  const controller=mountRoomAudio({root,assets:{music:'/music.mp3',ambience:'/rain.ogg'},zh:true,defaultEnabled:true,embedded:true,onStateChange:state=>states.push(state),...options});
  return {root,utilities,footer,tracks,states,controller,
    click(trusted=true,target=root){const event=new Event('click');Object.defineProperty(event,'isTrusted',{value:trusted});Object.defineProperty(event,'target',{value:target});root.dispatchEvent(event);},
    key(trusted=true,target=root){const event=new Event('keydown');Object.defineProperty(event,'isTrusted',{value:trusted});Object.defineProperty(event,'target',{value:target});root.dispatchEvent(event);},
    objectControl(kind){const button=new Element('button');button.dataset.roomObject=kind;root.append(button);return button;},
    hide(value){document.hidden=value;document.dispatchEvent(new Event('visibilitychange'));},
    hideRoot(value){root.hidden=value;for(const observer of observers)if(observer.active)observer.callback();},
    restore(){controller.dispose();for(const [key,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];},
  };
}

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
