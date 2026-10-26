import type {Page} from '@playwright/test';
import {readRoomObservation} from './room-observation';
import type {RoomPointer} from './room-pointer';

type Point={x:number;y:number};
type RoomPointerOptions={cdpDrag?:boolean;pointer?:RoomPointer};
type RoomDrag=(from:Point,to:Point)=>Promise<void>;
type PointerState={pending?:Point};
async function bounded<T>(operation:Promise<T>,label:string){
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Room mouse '+label+' exceeded 30000ms')),30000);})]);}
 finally{if(timer)clearTimeout(timer);}
}
function firstError(errors:unknown[]){if(errors.length){if(errors.length>1)console.warn('Room mouse cleanup errors',errors.slice(1));throw errors[0];}}
// Chromium camera gestures only. Public single drags synchronize immediately;
// a scoped camera sequence lets its final real PW click synchronize once.
async function performRoomDrag(page:Page,from:Point,to:Point,state:PointerState,syncSuccess:boolean){
 if(page.context().browser()?.browserType().name()!=='chromium')throw new Error('Room protocol drag requires Chromium');
 const attaching=page.context().newCDPSession(page);let session:Awaited<typeof attaching>;
 try{session=await bounded(attaching,'attach');}
 catch(error){void attaching.then(late=>bounded(late.detach(),'late attach detach')).catch(cleanup=>console.warn('Room late attach cleanup error',cleanup));throw error;}
 const send=(type:'mouseMoved'|'mousePressed'|'mouseReleased',at:Point,buttons:number)=>bounded(session.send('Input.dispatchMouseEvent',{
  type,x:at.x,y:at.y,button:type==='mouseMoved'&&buttons===0?'none':'left',buttons,modifiers:0,
  ...(type==='mouseMoved'?{}:{clickCount:1}),...(type==='mouseReleased'?{}:{force:buttons?0.5:0}),
 }),type);
 let pressed=false,at=from;const errors:unknown[]=[];
 try{
  state.pending=at;await send('mouseMoved',at,0);pressed=true;await send('mousePressed',at,1);
  at=to;state.pending=at;await send('mouseMoved',at,1);await send('mouseReleased',at,0);pressed=false;
 }catch(error){errors.push(error);}
 finally{
  if(pressed)try{await send('mouseReleased',at,0);}catch(error){errors.push(error);}
  try{await bounded(session.detach(),'detach');}catch(error){errors.push(error);}
  if(syncSuccess||errors.length)try{await bounded(page.mouse.move(at.x,at.y),'position sync');state.pending=undefined;}catch(error){errors.push(error);}
 }
 firstError(errors);
}
export async function dragRoomMouse(page:Page,from:Point,to:Point){await performRoomDrag(page,from,to,{},true);}
// PW Mouse.click moves to its explicit point before down/up. Keep deferred
// position ownership inside this scope; failures restore the last real point.
// https://playwright.dev/docs/api/class-mouse#mouse-click
export async function clickAfterRoomDrags(page:Page,locate:(drag:RoomDrag)=>Promise<Point>){
 const state:PointerState={},errors:unknown[]=[];
 try{
  const point=await locate((from,to)=>performRoomDrag(page,from,to,state,false));
  await bounded(page.mouse.click(point.x,point.y),'final click');state.pending=undefined;
 }catch(error){errors.push(error);}
 finally{if(state.pending)try{await bounded(page.mouse.move(state.pending.x,state.pending.y),'position sync');state.pending=undefined;}catch(error){errors.push(error);}}
 firstError(errors);
}

export async function projectRoomObject(page:Page,name:string,focusBeforeTurn=false,options:RoomPointerOptions={}){
 const size=page.viewportSize()!;
 const observe=async({name,focusBeforeTurn,size}:{name:string;focusBeforeTurn:boolean;size:{width:number;height:number}})=>{
 const specifier='three',T=await import(specifier),root=document.querySelector<HTMLElement>('[data-bear-workspace]')!,pose=JSON.parse(root.dataset.worldPose!),target=JSON.parse(root.dataset.worldTargets!)[name],camera=new T.PerspectiveCamera(pose.fov,root.clientWidth/root.clientHeight,.04,160);
 camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld();const v=new T.Vector3(...target).project(camera),b=root.getBoundingClientRect();
 const dx=target[0]-pose.x,dy=target[1]-pose.y,dz=target[2]-pose.z,yaw=Math.atan2(-dx,-dz),pitch=Math.max(-.9,Math.min(.85,Math.atan2(dy,Math.hypot(dx,dz))));
 const point={x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2,inFront:v.z>-1&&v.z<1,yawDelta:Math.atan2(Math.sin(yaw-pose.yaw),Math.cos(yaw-pose.yaw)),pitchDelta:pitch-pose.pitch};
 if(focusBeforeTurn&&!(point.inFront&&point.x>8&&point.x<size.width-8&&point.y>8&&point.y<size.height-8)){
  const canvas=root.querySelector<HTMLElement>('.space-world__canvas');if(!canvas)throw new Error('Room canvas missing');canvas.focus();
 }
 return point;
 };
 const args={name,focusBeforeTurn,size};
 if(!options.cdpDrag&&!options.pointer)return page.evaluate(observe,args);
 // Same real Three projection for explicit CDP journeys. Keep the original
 // canvas focus outside this read; no pose/target is fabricated. The hard30s
 // read cap is additional to the original whole-case budget.
 const point=await readRoomObservation(page,observe,{...args,focusBeforeTurn:false},{timeout:30000,label:'Room camera projection',validate:(value):value is Awaited<ReturnType<typeof observe>>=>{
  if(!value||typeof value!=='object')return false;const point=value as Record<string,unknown>;
  return ['x','y','yawDelta','pitchDelta'].every(key=>typeof point[key]==='number'&&Number.isFinite(point[key]))&&typeof point.inFront==='boolean';
 }});
 if(focusBeforeTurn&&!(point.inFront&&point.x>8&&point.x<size.width-8&&point.y>8&&point.y<size.height-8)){
  if(options.pointer)await options.pointer.focusCanvas();else await page.locator('.space-world__canvas').focus();
 }
 return point;
}

// Turn with the actual room gesture before clicking an object outside the view.
async function locateRoomObject(page:Page,name:string,drag:RoomDrag,options:RoomPointerOptions={}){
 for(let i=0;i<10;i++){
  const p=await projectRoomObject(page,name,i===0,options),size=page.viewportSize()!;
  if(p.inFront&&p.x>8&&p.x<size.width-8&&p.y>8&&p.y<size.height-8)return p;
  const marginX=Math.min(24,size.width/4),maxDx=size.width-2*marginX,dx=Math.max(-maxDx,Math.min(maxDx,-p.yawDelta/.0035));
  const x=dx>=0?marginX:size.width-marginX,y=size.height*.4,marginY=Math.min(24,size.height/4);
  const dy=Math.max(-Math.min(100,y-marginY),Math.min(Math.min(100,size.height-marginY-y),-p.pitchDelta/.003));
  await drag({x,y},{x:x+dx,y:y+dy});
 }
 throw new Error(`Room object ${name} could not be brought into view`);
}
const nativeDrag=(page:Page):RoomDrag=>async(from,to)=>{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y);await page.mouse.up();};
export async function lookAtRoomObject(page:Page,name:string,options:RoomPointerOptions={}){
 return locateRoomObject(page,name,options.pointer?options.pointer.drag:options.cdpDrag?(from,to)=>dragRoomMouse(page,from,to):nativeDrag(page),options.pointer?{...options,cdpDrag:true}:options);
}
export async function hitRoomObject(page:Page,name:string,options:RoomPointerOptions={}){
 if(options.pointer){const point=await locateRoomObject(page,name,options.pointer.drag,{...options,cdpDrag:true});await options.pointer.click(point);}
 else if(options.cdpDrag)await clickAfterRoomDrags(page,drag=>locateRoomObject(page,name,drag,options));
 else{const p=await lookAtRoomObject(page,name);await page.mouse.click(p.x,p.y);}
}

export async function dragRoomTouch(page:Page,from:{x:number;y:number},to:{x:number;y:number}){
 const session=await page.context().newCDPSession(page);
 try {
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
  for(let step=1;step<=6;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*step/6,y:from.y+(to.y-from.y)*step/6,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 } finally {await session.detach();}
}
