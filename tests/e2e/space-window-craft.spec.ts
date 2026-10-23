import {test,expect} from '../helpers/frozen-site';
import {lookAtRoomObject} from '../helpers/room-interaction';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
for(const [name,hour]of [['rain',21],['sunset',17.2]] as const)test(`the ${name} window has an unobstructed inside-glass view and bounded head movement`,async({page},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});
 await page.goto(`/zh/projects/?vista=image&room-hour=${hour}`);
 const root=page.locator('[data-bear-workspace]');await expect(root).toHaveAttribute('data-boot-state','complete',{timeout:30000});
 const point=await lookAtRoomObject(page,'window'),before=await root.getAttribute('data-world-pose');await page.mouse.click(point.x,point.y);
 await expect(root).toHaveAttribute('data-world-inspect','window');
 const capture=async(suffix:string)=>{if(!process.env.WINDOW_VIEW_AUDIT_DIR)return;const dir=process.env.WINDOW_VIEW_AUDIT_DIR;await fs.mkdir(dir,{recursive:true});await page.screenshot({path:path.join(dir,`${info.project.name}-${name}-${suffix}.png`)});};
 await capture('entry');
 const pose=async()=>JSON.parse((await root.getAttribute('data-world-pose'))!);
 const at=await pose();expect(Math.abs(at.z+2.606)).toBeLessThan(.9);
 const props=await page.evaluate(async()=>{
  const specifier='three',T=await import(specifier),root=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(root.dataset.worldPose!),c=new T.PerspectiveCamera(p.fov,root.clientWidth/root.clientHeight,.04,160);
  c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();
  const targets=JSON.parse(root.dataset.worldTargets!);
  return ['computer','lamp','photo'].map(key=>{const v=new T.Vector3(...targets[key]).project(c);return {key,inside:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};});
 });
 expect(props.filter(p=>p.inside)).toEqual([]);
 const size=page.viewportSize()!;
 if(name==='sunset'&&info.project.name==='mobile'){
  await page.mouse.move(size.width*.4,size.height*.4);await page.mouse.down();await page.mouse.move(size.width*.4+130,size.height*.4,{steps:8});await page.mouse.up();
  const sun=await page.evaluate(async()=>{
   const specifier='three',T=await import(specifier),r=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(r.dataset.worldPose!),day=JSON.parse(r.dataset.roomTime!),c=new T.PerspectiveCamera(p.fov,r.clientWidth/r.clientHeight,.04,160);
   c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();
   const v=new T.Vector3(...day.sunDirection).multiplyScalar(120).add(new T.Vector3(0,1.3,0)).project(c);return {x:v.x,y:v.y,z:v.z};
  });
  expect(Math.abs(sun.x)).toBeLessThan(.94);expect(Math.abs(sun.y)).toBeLessThan(.94);expect(sun.z).toBeLessThan(1);await capture('sun');
 }
 for(const [dx,dy,label]of [[1100,-900,'left-up'],[-2100,1800,'right-down']] as const){
  await page.mouse.move(size.width*.5,size.height*.4);await page.mouse.down();await page.mouse.move(size.width*.5+dx,size.height*.4+dy,{steps:12});await page.mouse.up();
  const look=await pose();expect(look.x).toBe(at.x);expect(look.z).toBe(at.z);expect(Math.cos(look.yaw)).toBeGreaterThan(.5);expect(look.pitch).toBeLessThan(.25);expect(look.pitch).toBeGreaterThan(-.3);await capture(label);
 }
 await page.keyboard.press('Escape');await expect(root).toHaveAttribute('data-world-mode','roam');expect(await root.getAttribute('data-world-pose')).toBe(before);
 expect(errors).toEqual([]);
});

test('the window survives a resize and a drag during its approach, then retreats with a touch pinch',async({page})=>{
 test.setTimeout(90000);
 await page.clock.install();
 try{
 await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');localStorage.setItem('space:cafe:quiet:v1','no');});
 await page.goto('/zh/projects/?vista=image&room-hour=21');const root=page.locator('[data-bear-workspace]');await expect(root).toHaveAttribute('data-boot-state','complete',{timeout:30000});
 const at=await lookAtRoomObject(page,'window');await page.emulateMedia({reducedMotion:'no-preference'});
 expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);await expect(root).toHaveAttribute('data-environment-paused','false');
 // Observe the real intermediate flight independently of slow WebGL/CDP reply
 // timing, using the same clock bridge as the camera-motion contracts.
 const stamp=Date.now();await page.clock.setFixedTime(stamp);await page.clock.pauseAt(stamp);await page.clock.setSystemTime(stamp);
 await page.mouse.click(at.x,at.y);
 await expect(root).toHaveAttribute('data-world-travel','true');
 for(let i=0;i<36;i++){
  await page.clock.fastForward(50);
  const sample=await root.evaluate((r:HTMLElement)=>({z:JSON.parse(r.dataset.worldPose!).z,travelling:r.dataset.worldTravel==='true'}));
  if(sample.travelling&&Math.abs(sample.z+2.606)<.85)break;
 }
 await expect(root).toHaveAttribute('data-world-travel','true');
 expect(Math.abs(JSON.parse((await root.getAttribute('data-world-pose'))!).z+2.606)).toBeLessThan(.85);
 const beforeDrag=JSON.parse((await root.getAttribute('data-world-pose'))!);
 const size=page.viewportSize()!;await page.mouse.move(size.width*.5,size.height*.4);await page.mouse.down();await page.mouse.move(size.width*.7,size.height*.5,{steps:3});await page.mouse.up();
 await page.clock.fastForward(16);
 await expect(root).toHaveAttribute('data-world-travel','false');
 const eye=JSON.parse((await root.getAttribute('data-world-pose'))!);expect(eye.z+2.606).toBeLessThan(.9);expect(eye.yaw).not.toBe(beforeDrag.yaw);
 await page.setViewportSize({width:size.height,height:size.width});
 await expect.poll(async()=>{await page.clock.fastForward(16);return JSON.parse((await root.getAttribute('data-world-pose'))!).fov;}).not.toBe(eye.fov);
 expect(JSON.parse((await root.getAttribute('data-world-pose'))!).z).toBe(eye.z);
 // Dispatch real touch input through the browser so the two-finger ownership
 // and canvas pointer capture run as they do on a phone or touch screen.
 const s=await page.context().newCDPSession(page),x=size.height*.5,y=size.width*.5;
 try{
  await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:x-80,y},{id:2,x:x+80,y}]});
  await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x-35,y},{id:2,x:x+35,y}]});
  await s.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{await s.detach();}
 await expect(root).toHaveAttribute('data-world-mode','roam');await page.clock.fastForward(2000);await expect(root).toHaveAttribute('data-world-travel','false');
 }finally{await page.clock.resume();}
});
