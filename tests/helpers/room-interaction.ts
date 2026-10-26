import type {Page} from '@playwright/test';

type Point={x:number;y:number};
type RoomPointerOptions={cdpDrag?:boolean};
// Chromium room-camera input only: released buttons, no held modifiers, no
// HTML drag/drop. These are the same native events as Playwright's mouse;
// CDP avoids an extra DOM trace snapshot at every intermediate gesture step.
// https://playwright.dev/docs/api/class-cdpsession
// https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchMouseEvent
export async function dragRoomMouse(page:Page,from:Point,to:Point){
 if(page.context().browser()?.browserType().name()!=='chromium')throw new Error('Room protocol drag requires Chromium');
 const bounded=async<T>(operation:Promise<T>,label:string)=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Room mouse '+label+' exceeded 30000ms')),30000);})]);}
  finally{if(timer)clearTimeout(timer);}
 };
 const attaching=page.context().newCDPSession(page);
 let session:Awaited<typeof attaching>;
 try{session=await bounded(attaching,'attach');}
 catch(error){
  // Promise.race does not cancel Chromium's pending attach. Dispose only our
  // late session if it eventually arrives; never dispatch input after timeout.
  void attaching.then(late=>bounded(late.detach(),'late attach detach')).catch(cleanup=>console.warn('Room late attach cleanup error',cleanup));
  throw error;
 }
 const send=(type:'mouseMoved'|'mousePressed'|'mouseReleased',at:Point,buttons:number)=>bounded(session.send('Input.dispatchMouseEvent',{
  type,x:at.x,y:at.y,button:type==='mouseMoved'&&buttons===0?'none':'left',buttons,modifiers:0,
  ...(type==='mouseMoved'?{}:{clickCount:1}),...(type==='mouseReleased'?{}:{force:buttons?0.5:0}),
 }),type);
 let pressed=false,at=from;const errors:unknown[]=[];
 try{
  await send('mouseMoved',at,0);pressed=true;await send('mousePressed',at,1);
  at=to;await send('mouseMoved',at,1);await send('mouseReleased',at,0);pressed=false;
 }catch(error){errors.push(error);}
 finally{
  if(pressed)try{await send('mouseReleased',at,0);}catch(error){errors.push(error);}
  try{await bounded(session.detach(),'detach');}catch(error){errors.push(error);}
  // Keep public Playwright mouse state coherent for subsequent down/clicks,
  // including recovery from an input failure. This is a real pointer move.
  try{await bounded(page.mouse.move(at.x,at.y),'position sync');}catch(error){errors.push(error);}
 }
 if(errors.length){if(errors.length>1)console.warn('Room mouse cleanup errors',errors.slice(1));throw errors[0];}
}

export async function projectRoomObject(page:Page,name:string){return page.evaluate(async name=>{
 const specifier='three',T=await import(specifier),root=document.querySelector<HTMLElement>('[data-bear-workspace]')!,pose=JSON.parse(root.dataset.worldPose!),target=JSON.parse(root.dataset.worldTargets!)[name],camera=new T.PerspectiveCamera(pose.fov,root.clientWidth/root.clientHeight,.04,160);
 camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld();const v=new T.Vector3(...target).project(camera),b=root.getBoundingClientRect();
 const dx=target[0]-pose.x,dy=target[1]-pose.y,dz=target[2]-pose.z,yaw=Math.atan2(-dx,-dz),pitch=Math.max(-.9,Math.min(.85,Math.atan2(dy,Math.hypot(dx,dz))));
 return{x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2,inFront:v.z>-1&&v.z<1,yawDelta:Math.atan2(Math.sin(yaw-pose.yaw),Math.cos(yaw-pose.yaw)),pitchDelta:pitch-pose.pitch};
},name);}

// Turn with the actual room gesture before clicking an object outside the view.
export async function lookAtRoomObject(page:Page,name:string,options:RoomPointerOptions={}){
 for(let i=0;i<10;i++){
  const p=await projectRoomObject(page,name),size=page.viewportSize()!;
  if(p.inFront&&p.x>8&&p.x<size.width-8&&p.y>8&&p.y<size.height-8)return p;
  // Projected x reverses behind the camera; turn by the actual shorter angle.
  // Use the available width in one real gesture; interpolated software-WebGL
  // paints can take longer than the whole interaction's existing time budget.
  const marginX=Math.min(24,size.width/4),maxDx=size.width-2*marginX;
  const dx=Math.max(-maxDx,Math.min(maxDx,-p.yawDelta/.0035));
  const x=dx>=0?marginX:size.width-marginX,y=size.height*.4,marginY=Math.min(24,size.height/4);
  const dy=Math.max(-Math.min(100,y-marginY),Math.min(Math.min(100,size.height-marginY-y),-p.pitchDelta/.003));
  // A keyboard object's focus-within menu otherwise covers the left start.
  if(i===0)await page.locator('.space-world__canvas').focus();
  if(options.cdpDrag)await dragRoomMouse(page,{x,y},{x:x+dx,y:y+dy});
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy);await page.mouse.up();}
 }
 throw new Error(`Room object ${name} could not be brought into view`);
}

export async function hitRoomObject(page:Page,name:string,options:RoomPointerOptions={}){
 const p=await lookAtRoomObject(page,name,options);await page.mouse.click(p.x,p.y);
}

export async function dragRoomTouch(page:Page,from:{x:number;y:number},to:{x:number;y:number}){
 const session=await page.context().newCDPSession(page);
 try {
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
  for(let step=1;step<=6;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*step/6,y:from.y+(to.y-from.y)*step/6,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 } finally {await session.detach();}
}
