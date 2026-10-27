import type {Page} from '@playwright/test';
import {readRoomObservation} from './room-observation';

// Reuse the bounded read-only transport; the original whole-case30s budget,
// native font/image promises and separate Playwright body visibility stay intact.
export async function waitQualityFonts(page:Page):Promise<void>{
 await readRoomObservation(page,async()=>{await document.fonts.ready;return true;},undefined,
  {timeout:30000,label:'Quality font readiness',validate:(value):value is boolean=>value===true});
}
export async function localImageFailures(page:Page):Promise<string[]>{
 return readRoomObservation(page,async()=>{
  const failures:string[]=[];
  for(const image of document.querySelectorAll<HTMLImageElement>('img')){
   if(!image.currentSrc&&!image.src)continue;
   const url=new URL(image.currentSrc||image.src,location.href);
   if(!['cubxxw.com','www.cubxxw.com',location.hostname].includes(url.hostname))continue;
   image.loading='eager';
   try{await image.decode();}catch{failures.push(url.pathname);}
  }
  return failures;
 },undefined,{timeout:30000,label:'Quality image decoding',validate:(value):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string'&&item.length>0)});
}
export async function hasHorizontalOverflow(page:Page):Promise<boolean>{
 return readRoomObservation(page,()=>document.documentElement.scrollWidth>innerWidth+1,undefined,
  {timeout:5000,label:'Quality horizontal overflow',validate:(value):value is boolean=>typeof value==='boolean'});
}
