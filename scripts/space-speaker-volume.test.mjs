import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRoomAudio} from '../assets/js/space/room-audio.js';

const key='space:cafe:music-volume:v1';
const settle=()=>new Promise(resolve=>setImmediate(resolve));

// The real controller and loop engine run against only browser-owned boundaries.
// Source identities expose accidental restarts; gain envelopes expose a slider
// that updates its label while leaving the actual speaker unchanged.
function fixture({saved=null,storageError=false}={}){
 const originals=new Map(),contexts=[],values=new Map(saved===null?[]:[[key,saved]]);
 const replace=(name,value)=>{originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});};
 class Element extends EventTarget{
  constructor(){super();this.dataset={};this.hidden=false;this.children=[];this.attributes=new Map();}
  append(child){this.children.push(child);}remove(){}querySelector(){return null;}
  setAttribute(name,value){this.attributes.set(name,String(value));}getAttribute(name){return this.attributes.get(name);}
 }
 const root=new Element(),document=new EventTarget();document.hidden=false;document.createElement=()=>new Element();
 replace('document',document);replace('navigator',{userActivation:{isActive:true,hasBeenActive:true}});
 replace('localStorage',{getItem(name){if(storageError)throw Error('denied');return values.get(name)??null;},setItem(name,value){if(storageError)throw Error('denied');values.set(name,value);}});
 replace('MutationObserver',class{observe(){}disconnect(){}});
 const buffer=(channels,length,rate)=>({numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData(){return new Float32Array(length).fill(.1);}});
 replace('AudioContext',class{
  constructor(){this.state='running';this.currentTime=0;this.sources=[];contexts.push(this);}
  createBuffer(channels,length,rate){return buffer(channels,length,rate);}
  async decodeAudioData(){return buffer(1,1000,10);}
  createGain(){const gain={value:1,setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},cancelScheduledValues(){},cancelAndHoldAtTime(){}};return {gain,connect(){},disconnect(){}};}
  createBufferSource(){const source={active:false,connect(gain){this.gain=gain;},disconnect(){},start(){this.active=true;},stop(){this.active=false;this.onended?.();}};this.sources.push(source);return source;}
  close(){this.state='closed';return Promise.resolve();}
 });
 replace('fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));
 const mount=()=>mountRoomAudio({root,assets:{music:'/first.mp3',ambience:'/rain.flac'},tracks:[{id:'first',src:'/first.mp3'},{id:'second',src:'/second.mp3'}],zh:true,embedded:true,defaultEnabled:true,independentAmbience:true});
 let controller=mount();
 return {root,values,contexts,get controller(){return controller;},get sources(){return contexts.flatMap(ctx=>ctx.sources);},advance(seconds){for(const ctx of contexts)ctx.currentTime+=seconds;},remount(){controller.dispose();controller=mount();},restore(){controller.dispose();for(const [name,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}};
}

test('a new speaker starts at 60 percent while outdoor rain keeps its own gain',async()=>{
 const f=fixture();try{await settle();assert.equal(f.controller.state.volume,.6);assert.equal(f.root.dataset.roomVolume,'0.6');assert.deepEqual(f.sources.map(s=>s.gain.gain.value),[.6,1.5]);}finally{f.restore();}
});

test('raising or muting the playing speaker changes gain without replacing either source or resetting its cursor',async()=>{
 const f=fixture();try{
  await settle();f.advance(7);const [music,rain]=f.sources;
  f.controller.setVolume(1);assert.equal(music.gain.gain.value,1);assert.equal(rain.gain.gain.value,1.5);assert.equal(f.controller.state.musicTime,7);
  f.controller.setVolume(0);f.advance(3);assert.equal(music.gain.gain.value,0);assert.equal(f.controller.state.playing,true);assert.equal(f.controller.state.musicTime,10);assert.equal(f.controller.state.ambientTime,10);
  assert.deepEqual(f.sources,[music,rain]);assert.equal(music.active,true);assert.equal(rain.active,true);
 }finally{f.restore();}
});

test('zero volume is remembered across records and the next room visit',async()=>{
 const f=fixture();try{
  await settle();f.controller.setVolume(0);const rain=f.sources[1];f.controller.selectTrack('second');await settle();
  assert.equal(f.controller.state.volume,0);assert.equal(f.sources.at(-1).gain.gain.value,0);assert.equal(rain.active,true);assert.equal(f.values.get(key),'0');
  f.remount();await settle();assert.equal(f.controller.state.volume,0);assert.equal(f.sources.at(-2).gain.gain.value,0);
 }finally{f.restore();}
});

test('the inspection volume event changes the real gain and clamps the public range',async()=>{
 const f=fixture({saved:'0.42'});try{
  await settle();assert.equal(f.controller.state.volume,.42);
  const event=new Event('space:roomvolume');Object.defineProperty(event,'detail',{value:{volume:.87}});f.root.dispatchEvent(event);
  assert.equal(f.controller.state.volume,.87);assert.equal(f.sources[0].gain.gain.value,.87);assert.equal(f.values.get(key),'0.87');
  f.controller.setVolume(4);assert.equal(f.controller.state.volume,1);f.controller.setVolume(-1);assert.equal(f.controller.state.volume,0);
  for(const invalid of [NaN,Infinity,undefined,null,''])f.controller.setVolume(invalid);assert.equal(f.controller.state.volume,0);
 }finally{f.restore();}
});

test('unavailable storage and malformed saved values leave the speaker usable',async()=>{
 for(const options of [{storageError:true},{saved:''},{saved:'NaN'},{saved:'4'}]){
  const f=fixture(options);try{await settle();assert.equal(f.controller.state.volume,.6);f.controller.setVolume(.8);assert.equal(f.sources[0].gain.gain.value,.8);}finally{f.restore();}
 }
});
