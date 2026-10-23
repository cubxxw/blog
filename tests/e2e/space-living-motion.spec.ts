import {test,expect,type Page} from '../helpers/frozen-site';
import {writeFile} from 'node:fs/promises';
test.use({channel:'chromium',reducedMotion:'no-preference',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
const pose=async(page:Page)=>JSON.parse((await root(page).getAttribute('data-world-pose'))!);
async function object(page:Page,kind:string){const button=page.locator(`[data-room-object="${kind}"]`);await button.focus();await button.press('Enter');}
async function open(page:Page){
 await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');localStorage.setItem('space:cafe:quiet:v1','no');});
 await page.goto('/zh/projects/?vista=image&room-hour=14');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});await expect(root(page)).toHaveAttribute('data-cat-loaded','true',{timeout:30000});
}
// A trusted key press can take >3s to return on software WebGL while the
// camera correctly finishes in <=1.8s. These two mid-flight contracts own the
// official frame clock, so protocol latency cannot skip the very state under
// test. The real renderer, input handlers, movement and hit targets still run.
async function openControlled(page:Page){
 await page.clock.install({time:new Date('2026-10-23T00:00:00Z')});
 await open(page);await page.clock.pauseAt(new Date('2026-10-23T00:05:00Z'));
}
async function advanceFrames(page:Page,milliseconds:number){
 // A fixed 10Hz presentation still exercises every real render and safe
 // physics step, without demanding 60 software-WebGL paints per test second.
 for(let left=milliseconds;left>0;left-=100)await page.clock.fastForward(Math.min(100,left));
}
async function changed(page:Page,a:Buffer,b:Buffer,box:{x:number;y:number;width:number;height:number}){
 return page.evaluate(async({a,b,box})=>{
  const decode=async(source:string)=>{const image=new Image();image.src='data:image/png;base64,'+source;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);return ctx.getImageData(0,0,image.width,image.height);};
  const left=await decode(a),right=await decode(b);let changed=0,count=0,total=0;
  for(let y=Math.floor(box.y);y<Math.min(left.height,box.y+box.height);y++)for(let x=Math.floor(box.x);x<Math.min(left.width,box.x+box.width);x++){
   const i=(y*left.width+x)*4,delta=Math.abs(left.data[i]-right.data[i])+Math.abs(left.data[i+1]-right.data[i+1])+Math.abs(left.data[i+2]-right.data[i+2]);count++;total+=delta;if(delta>6)changed++;
  }return {fraction:changed/count,mean:total/count};
 },{a:a.toString('base64'),b:b.toString('base64'),box});
}

test('daylight water and clouds move in the actual window while the boat keeps its depth',async({page},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|VALIDATE_STATUS|shader error/i.test(m.text()))errors.push(m.text());});
 await open(page);await object(page,'window');await expect(root(page)).toHaveAttribute('data-world-travel','false');
 const start=Number(await root(page).getAttribute('data-world-environment-time')),boat=JSON.parse((await root(page).getAttribute('data-room-boat-pose'))!),camera=await pose(page),size=page.viewportSize()!;
 const before=await page.screenshot({path:info.outputPath('window-before.png'),scale:'css'});
 await expect.poll(async()=>Number(await root(page).getAttribute('data-world-environment-time')),{timeout:15000}).toBeGreaterThan(start+4);
 const after=await page.screenshot({path:info.outputPath('window-after.png'),scale:'css'}),next=JSON.parse((await root(page).getAttribute('data-room-boat-pose'))!);
 const water=await changed(page,before,after,{x:size.width*.15,y:size.height*.78,width:size.width*.70,height:size.height*.20});
 const clouds=await changed(page,before,after,{x:size.width*.26,y:size.height*.01,width:size.width*.45,height:size.height*.09});
 expect(water.fraction).toBeGreaterThan(.08);expect(clouds.fraction).toBeGreaterThan(.015);
 expect(Math.hypot(next[0]-boat[0],next[2]-boat[2])).toBeGreaterThan(.005);expect(await pose(page)).toEqual(camera);
 await info.attach('motion-measurement',{body:JSON.stringify({water,clouds,boat,next,camera},null,2),contentType:'application/json'});
 expect(errors).toEqual([]);
});

test('approach can be reversed or grabbed mid-flight and sleeping breath continues at the bookshelf',async({page},info)=>{
 test.setTimeout(150000);await openControlled(page);const entry=await pose(page);
 await object(page,'window');await expect(root(page)).toHaveAttribute('data-world-travel','true');
 await advanceFrames(page,180);const approaching=await pose(page);
 await page.mouse.move(8,8);await page.mouse.down();await expect(root(page)).toHaveAttribute('data-world-travel','true');await page.mouse.up();await advanceFrames(page,2000);
 await expect(root(page)).toHaveAttribute('data-world-mode','roam');await expect(root(page)).toHaveAttribute('data-world-travel','false');expect(await pose(page)).toEqual(entry);
 expect(Math.hypot(approaching.x-entry.x,approaching.z-entry.z)).toBeGreaterThan(.001);
 const size=page.viewportSize()!;await page.mouse.move(size.width*.5,size.height*.4);
 await object(page,'window');await advanceFrames(page,120);await page.mouse.down();await page.mouse.move(size.width*.5+55,size.height*.4+12);await page.mouse.up();
 await expect(root(page)).toHaveAttribute('data-world-travel','false');const looking=await pose(page);await advanceFrames(page,200);const stopped=await pose(page);expect(stopped.x).toBe(looking.x);expect(stopped.z).toBe(looking.z);
 await page.keyboard.press('Escape');await advanceFrames(page,2000);await expect(root(page)).toHaveAttribute('data-world-travel','false');expect(await pose(page)).toEqual(entry);
 await object(page,'books');await advanceFrames(page,2000);await expect(root(page)).toHaveAttribute('data-world-travel','false');
 const before=JSON.parse((await root(page).getAttribute('data-room-cat'))!),samples:number[]=[];
 for(let i=0;i<12;i++){await advanceFrames(page,400);samples.push(JSON.parse((await root(page).getAttribute('data-room-cat-breath'))!).chest);}
 const cat=JSON.parse((await root(page).getAttribute('data-room-cat'))!);expect(cat.phase).toBe('sleep');expect(cat.x).toBe(before.x);expect(cat.z).toBe(before.z);expect(cat.elapsed).toBe(before.elapsed);
 expect(Math.max(...samples)-Math.min(...samples)).toBeGreaterThan(.025);
 await page.screenshot({path:info.outputPath('sleeping-at-bookshelf.png')});
 await page.mouse.move(8,8);await page.mouse.wheel(0,150);await advanceFrames(page,2000);await expect(root(page)).toHaveAttribute('data-world-travel','false');expect(await pose(page)).toEqual(entry);
});

test('reduced motion freezes environmental movement and retains immediate object navigation',async({page})=>{
 test.setTimeout(60000);await open(page);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
 const time=await root(page).getAttribute('data-world-environment-time'),boat=await root(page).getAttribute('data-room-boat-pose'),breath=await root(page).getAttribute('data-room-cat-breath');
 await page.waitForTimeout(600);expect(await root(page).getAttribute('data-world-environment-time')).toBe(time);expect(await root(page).getAttribute('data-room-boat-pose')).toBe(boat);expect(await root(page).getAttribute('data-room-cat-breath')).toBe(breath);
 await object(page,'window');await expect(root(page)).toHaveAttribute('data-world-inspect','window');await expect(root(page)).toHaveAttribute('data-world-travel','false');
 await page.keyboard.press('Escape');await expect(root(page)).toHaveAttribute('data-world-mode','roam');
});

test('resizing during a window or computer approach retargets the live camera without an arrival jump',async({page},info)=>{
 test.setTimeout(150000);await openControlled(page);const original=page.viewportSize()!,other=original.width>700?{width:420,height:800}:{width:1000,height:650};
 const beginSamples=()=>page.evaluate(()=>{
  const root=document.querySelector<HTMLElement>('[data-bear-workspace]')!,samples:{fov:number;at:number;frame:string|undefined}[]=[];
  (window as any).__resizeMotionSamples=samples;
  const sample=(stamp:number)=>{samples.push({fov:JSON.parse(root.dataset.worldPose!).fov,at:stamp,frame:root.dataset.worldFrames});if(root.dataset.worldTravel==='true')requestAnimationFrame(sample);};requestAnimationFrame(sample);
 });
 for(const kind of ['window','computer']){
  await object(page,kind);await expect(root(page)).toHaveAttribute('data-world-travel','true');await advanceFrames(page,170);await page.setViewportSize(kind==='window'?other:original);
  await expect(root(page)).toHaveAttribute('data-world-travel','true');await beginSamples();await advanceFrames(page,2000);
  await expect(root(page)).toHaveAttribute('data-world-travel','false');
  const samples=await page.evaluate(()=>(window as any).__resizeMotionSamples as {fov:number;at:number;frame:string|undefined}[]);expect(samples.length).toBeGreaterThan(1);
  await writeFile(info.outputPath(kind+'-resize-frames.json'),JSON.stringify(samples,null,2));
  const end=samples[samples.length-1],previous=samples[samples.length-2];
  expect(Math.abs(end.fov-previous.fov)/Math.max(.001,(end.at-previous.at)/1000)).toBeLessThan(8);
  if(kind==='window'){await page.keyboard.press('Escape');await advanceFrames(page,2000);await expect(root(page)).toHaveAttribute('data-world-travel','false');}
 }
});
