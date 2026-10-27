import type {Page} from '@playwright/test';
import {readRoomObservation} from './room-observation';

// Observe native sample-clock sources without replacing playback or its codec.
export async function observeRoomAudio(page:Page){
 await page.addInitScript(()=>{
  const Context=window.AudioContext||(window as any).webkitAudioContext;if(!Context)return;
  const nodes:any[]=[];(window as any).__roomLoopSources=nodes;
  const create=Context.prototype.createBufferSource;
  Context.prototype.createBufferSource=function(){
   const node=create.call(this),record:any={id:nodes.length,context:this,node,gain:0,startTime:null,offset:0,stopTime:null};nodes.push(record);
   const connect=node.connect.bind(node),start=node.start.bind(node),stop=node.stop.bind(node);
   (node as any).connect=(target:any,...args:any[])=>{if(target.gain)record.gainNode=target;return (connect as any)(target,...args);};
   node.start=(when=0,offset=0,duration?:number)=>{record.duration=node.buffer?.duration||0;record.startTime=this.currentTime;record.offset=offset;return duration===undefined?start(when,offset):start(when,offset,duration);};
   node.stop=(when=0)=>{record.stopTime=this.currentTime;return stop(when);};return node;
  };
 });
}
export type RoomSource={id:number;duration:number;loop:boolean;gain:number;stopped:boolean;offset:number;time:number;context:string};
const snapshotRoomAudio=()=>((window as any).__roomLoopSources||[]).filter((r:any)=>r.startTime!==null).map((r:any)=>({id:r.id,duration:r.duration,loop:r.node.loop,gain:r.gainNode?.gain.value||0,stopped:r.stopTime!==null,offset:r.offset,time:r.offset+Math.max(0,(r.stopTime??r.context.currentTime)-r.startTime),context:r.context.state}));
export async function roomAudioSources(page:Page):Promise<RoomSource[]>{return page.evaluate(snapshotRoomAudio);}
export async function readRoomAudioSources(page:Page):Promise<RoomSource[]>{
 return readRoomObservation(page,snapshotRoomAudio,undefined,{timeout:30000,label:'Room native audio snapshot',validate:(value):value is RoomSource[]=>Array.isArray(value)&&value.every(source=>
  source&&typeof source==='object'&&['id','duration','gain','offset','time'].every(key=>typeof source[key]==='number'&&Number.isFinite(source[key]))&&typeof source.loop==='boolean'&&typeof source.stopped==='boolean'&&typeof source.context==='string')});
}

export async function rainSource(page:Page){return (await roomAudioSources(page)).find(r=>!r.stopped&&Math.abs(r.duration-100)<.05);}

export async function blockRoomAudioUntilGesture(page:Page){
 await page.addInitScript(()=>{
  let activated=false;for(const type of ['pointerdown','keydown'])window.addEventListener(type,event=>{if(event.isTrusted)activated=true;},{capture:true});
  const Native=window.AudioContext,state=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state')!.get!;
  class PolicyContext extends Native{
   constructor(options?:AudioContextOptions){super(options);if(!activated)void super.suspend();}
   get state(){return activated?state.call(this):'suspended';}
   resume(){return activated?super.resume():Promise.reject(new DOMException('A gesture is required','NotAllowedError'));}
  }
  window.AudioContext=PolicyContext;
 });
}
