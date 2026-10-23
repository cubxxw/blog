import type {Page} from '@playwright/test';

export async function projectRoomObject(page:Page,name:string){return page.evaluate(async name=>{
 const specifier='three',T=await import(specifier),root=document.querySelector<HTMLElement>('[data-bear-workspace]')!,pose=JSON.parse(root.dataset.worldPose!),target=JSON.parse(root.dataset.worldTargets!)[name],camera=new T.PerspectiveCamera(pose.fov,root.clientWidth/root.clientHeight,.04,160);
 camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld();const v=new T.Vector3(...target).project(camera),b=root.getBoundingClientRect();
 const dx=target[0]-pose.x,dy=target[1]-pose.y,dz=target[2]-pose.z,yaw=Math.atan2(-dx,-dz),pitch=Math.max(-.9,Math.min(.85,Math.atan2(dy,Math.hypot(dx,dz))));
 return{x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2,inFront:v.z>-1&&v.z<1,yawDelta:Math.atan2(Math.sin(yaw-pose.yaw),Math.cos(yaw-pose.yaw)),pitchDelta:pitch-pose.pitch};
},name);}

// Turn with the actual room gesture before clicking an object outside the view.
export async function lookAtRoomObject(page:Page,name:string){
 for(let i=0;i<10;i++){
  const p=await projectRoomObject(page,name),size=page.viewportSize()!;
  if(p.inFront&&p.x>8&&p.x<size.width-8&&p.y>8&&p.y<size.height-8)return p;
  // Projected x reverses behind the camera; turn by the actual shorter angle.
  // Use the available canvas width for a large turn instead of repeatedly
  // releasing and grabbing after 100px. Keep every real pointer step inside
  // the viewport; software rendering pays for each of those six steps.
  const reach=size.width-32,dx=Math.max(-reach,Math.min(reach,-p.yawDelta/.0035));
  const dy=Math.max(-100,Math.min(100,-p.pitchDelta/.003));
  const x=size.width/2-dx/2,y=size.height*.4;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:6});await page.mouse.up();
 }
 throw new Error(`Room object ${name} could not be brought into view`);
}

export async function hitRoomObject(page:Page,name:string){
 const p=await lookAtRoomObject(page,name);await page.mouse.click(p.x,p.y);
}

export async function dragRoomTouch(page:Page,from:{x:number;y:number},to:{x:number;y:number}){
 const session=await page.context().newCDPSession(page);
 try {
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
  for(let step=1;step<=6;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*step/6,y:from.y+(to.y-from.y)*step/6,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 } finally {await session.detach();}
}
