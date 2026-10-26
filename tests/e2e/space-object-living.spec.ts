import {test,expect,type Page} from '../helpers/frozen-site';
import {observeRoomAudio,rainSource,roomAudioSources} from '../helpers/room-audio';
import {lookAtRoomObject,dragRoomTouch} from '../helpers/room-interaction';
test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root=(p:Page)=>p.locator('[data-bear-workspace]');
const objects=async(p:Page)=>JSON.parse((await root(p).getAttribute('data-room-objects'))||'{}');
async function object(p:Page,name:string){const b=p.locator(`[data-room-object="${name}"]`);await expect(b).toHaveCount(1);await b.focus();await b.press('Enter');}
async function ready(p:Page){await p.goto('/zh/projects/?vista=image');await expect(root(p)).toHaveAttribute('data-boot-state','complete',{timeout:30000});}
async function point(p:Page,name:string){return p.evaluate(async name=>{const specifier='three',T=await import(specifier),r=document.querySelector<HTMLElement>('[data-bear-workspace]')!,pose=JSON.parse(r.dataset.worldPose!),target=JSON.parse(r.dataset.worldTargets!)[name],c=new T.PerspectiveCamera(pose.fov,r.clientWidth/r.clientHeight,.04,160);c.position.set(pose.x,pose.y,pose.z);c.rotation.set(pose.pitch,pose.yaw,0,'YXZ');c.updateMatrixWorld();const v=new T.Vector3(...target).project(c),b=r.getBoundingClientRect();return{x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2};},name);}
async function face(p:Page,name:string){return lookAtRoomObject(p,name);}
test.beforeEach(async({page})=>{test.setTimeout(90000);await observeRoomAudio(page);await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});});

test('the physical lamp and fan change their actual light and mechanism',async({page})=>{
 await ready(page);const before=await objects(page);expect(before.tablePool).toBeGreaterThan(0);expect(before.tablePoolVisible).toBe(true);await object(page,'lamp');await expect.poll(async()=>(await objects(page)).lamp).toBe(false);expect((await objects(page)).tableLight).toBe(0);expect((await objects(page)).shadeEmissive).toBe(0);expect((await objects(page)).tablePool).toBe(0);expect((await objects(page)).tablePoolVisible).toBe(false);
 await object(page,'lamp');await expect.poll(async()=>(await objects(page)).tableLight).toBeGreaterThan(0);expect((await objects(page)).tablePool).toBe(before.tablePool);expect((await objects(page)).tablePoolVisible).toBe(true);await object(page,'fan');await expect.poll(async()=>(await objects(page)).fan).toBe(false);await object(page,'fan');await expect.poll(async()=>(await objects(page)).fan).toBe(true);expect(before.lamp).toBe(true);
});

test('real lamp and fan surfaces respond to canvas hits',async({page})=>{
 await ready(page);for(const name of ['lamp','fan']){const p=await face(page,name);await page.mouse.click(p.x,p.y);await expect.poll(async()=>(await objects(page))[name],`${name} physical hit`).toBe(false);}await expect(root(page)).toHaveAttribute('data-world-mode','roam');
});

test('the top photo light control owns the real wash and stays in sync with the physical fitting',async({page})=>{
 await ready(page);const control=page.getByRole('button',{name:'照片墙照明',exact:true}),before=await objects(page);
 await expect(control).toBeVisible();await expect(control).toHaveAttribute('aria-pressed','true');expect(before.photoLight).toBeGreaterThan(0);
 await control.focus();await control.press('Space');await expect(control).toHaveAttribute('aria-pressed','false');
 await expect.poll(async()=>(await objects(page)).photoLight).toBe(0);expect((await objects(page)).photoEmitter).toBe(0);
 expect((await objects(page)).tableLight).toBe(before.tableLight);expect((await objects(page)).shelfLight).toBe(before.shelfLight);
 await object(page,'photo-light');await expect(control).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>(await objects(page)).photoLight).toBe(before.photoLight);
 await page.setViewportSize({width:390,height:844});const bounds=(await control.boundingBox())!;
 expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
 await control.click();await expect.poll(async()=>(await objects(page)).photoLight).toBe(0);
 await control.click();await expect.poll(async()=>(await objects(page)).photoLight).toBe(before.photoLight);
});

test('outside click and a real two-finger pinch both restore the prior room view',async({page})=>{
 await ready(page);const before=await root(page).getAttribute('data-world-pose');await object(page,'coffee');await page.mouse.click(12,12);await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await root(page).getAttribute('data-world-pose')).toBe(before);
 await object(page,'clock');const size=page.viewportSize()!,cx=size.width*.5,cy=size.height*.35,span=Math.min(100,size.width*.24),session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-span,y:cy},{x:cx+span,y:cy}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-span*.55,y:cy},{x:cx+span*.55,y:cy}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await root(page).getAttribute('data-world-pose')).toBe(before);
});

test('the magic clock owns its gestures, persists borrowed dawn and returns to the live present',async({page})=>{
 await ready(page);const before=await root(page).getAttribute('data-world-pose');await object(page,'clock');
 const clock=page.locator('[data-magic-clock]'),dial=clock.getByRole('slider');await expect(clock).toBeVisible();
 await expect(dial).toBeFocused();await dial.press('Home');
 const box=(await dial.boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2,r=box.width*.40;
 if(page.viewportSize()!.width<700)await dragRoomTouch(page,{x:cx,y:cy-r},{x:cx+r,y:cy});
 else {await page.mouse.move(cx,cy-r);await page.mouse.down();await page.mouse.move(cx+r,cy,{steps:16});await page.mouse.up();}
 const state=()=>root(page).evaluate(r=>JSON.parse((r as HTMLElement).dataset.roomTime!));
 await expect.poll(async()=>(await state()).hour).toBeGreaterThanOrEqual(5.9);expect((await state()).hour).toBeLessThan(6.2);
 await expect(root(page)).toHaveAttribute('data-world-inspect','clock');
 await page.mouse.move(cx+r,cy);await page.mouse.wheel(0,100);await expect(clock).toBeVisible();await expect(root(page)).toHaveAttribute('data-world-inspect','clock');
 await page.reload();await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});expect((await state()).borrowed).toBe(true);expect((await state()).hour).toBeLessThan(7);
 await object(page,'clock');await page.locator('[data-clock-present]').click();await expect.poll(async()=>(await state()).borrowed).toBe(false);
 await page.mouse.click(12,12);await expect(clock).toBeHidden();await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await root(page).getAttribute('data-world-pose')).toBe(before);
});

test('returning to the present can be interrupted by a new clock gesture',async({page})=>{
 await ready(page);await object(page,'clock');const dial=page.locator('[data-magic-clock]').getByRole('slider');
 await dial.press('Home');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-clock-present]').click();
 await page.waitForTimeout(120);const box=(await dial.boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2,r=box.width*.4;
 await page.mouse.move(cx,cy-r);await page.mouse.down();const state=()=>root(page).evaluate(r=>JSON.parse((r as HTMLElement).dataset.roomTime!));
 const held=(await state()).unwrapped;await page.waitForTimeout(1600);expect(Math.abs((await state()).unwrapped-held)).toBeLessThan(.1);
 await page.mouse.move(cx+r,cy,{steps:8});await page.mouse.up();
 const sample=()=>root(page).evaluate(r=>{const snapshot=JSON.parse((r as HTMLElement).dataset.roomTime!);return {time:snapshot.unwrapped,at:snapshot.sampledAt,readAt:Date.now()};});
 const chosen=await sample();await page.waitForTimeout(1600);const resumed=await sample();
 expect((await state()).borrowed).toBe(true);
 for(const snapshot of [chosen,resumed]){expect(Number.isFinite(snapshot.at)).toBe(true);expect(snapshot.at).toBeLessThanOrEqual(snapshot.readAt);}
 expect(resumed.at).toBeGreaterThan(chosen.at);expect(resumed.time).toBeGreaterThan(chosen.time);
 // Compare the two published samples, rather than assigning a later protocol
 // read's wall time to an older frame/weather record. Keep the original rate
 // tolerance and actual hold/resume windows; publish read age as evidence.
 expect(Math.abs(resumed.time-chosen.time-(resumed.at-chosen.at)/100)).toBeLessThan(3);
 await test.info().attach('room-clock-coherent-samples',{contentType:'application/json',body:JSON.stringify({chosen,resumed,readAgeMs:[chosen.readAt-chosen.at,resumed.readAt-resumed.at]})});
 await page.locator('[data-clock-present]').click();await expect.poll(async()=>(await state()).borrowed).toBe(false);
});

test('a return to the present completes offscreen and Escape from its center restores room focus',async({page})=>{
 await ready(page);await object(page,'clock');const clock=page.locator('[data-magic-clock]'),dial=clock.getByRole('slider');
 await dial.press('Home');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-clock-present]').click();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const state=()=>root(page).evaluate(r=>JSON.parse((r as HTMLElement).dataset.roomTime!));
 await expect.poll(async()=>(await state()).borrowed).toBe(false);
 const frames=await root(page).getAttribute('data-world-frames');await page.waitForTimeout(1500);expect(await root(page).getAttribute('data-world-frames')).toBe(frames);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.locator('[data-clock-present]').focus();await page.locator('[data-clock-present]').press('Escape');
 await expect(clock).toBeHidden();await expect(page.locator('.space-world__canvas')).toBeFocused();
});

test('the cat sleeps by default and a real nest click wakes it before it comes over',async({page})=>{
 await ready(page);await expect(root(page)).toHaveAttribute('data-cat-loaded','true',{timeout:30000});
 const initial=await page.evaluate(()=>({home:JSON.parse(document.querySelector<HTMLElement>('[data-bear-workspace]')!.dataset.roomCat!),controls:document.querySelectorAll('[data-room-object="cat"]').length,action:document.querySelector<HTMLElement>('[data-room-object="cat"]')?.dataset.roomCatAction,label:document.querySelector('[data-room-object="cat"]')?.textContent}));
 const home=initial.home;expect(home.phase).toBe('sleep');expect(initial.controls).toBe(1);expect(initial.action).toBe('call');expect(initial.label).toContain('叫醒');
 const catButton=page.locator('[data-room-object="cat"]');
 await page.emulateMedia({reducedMotion:'no-preference'});const at=await face(page,'cat-bed');
 // Keep the first presented wake frame: a later CDP read can arrive after walking starts.
 const wakeObservation=await page.evaluateHandle(()=>{
  const room=document.querySelector<HTMLElement>('[data-bear-workspace]')!,before=room.dataset.worldPose;
  let firstWake:{x:number;z:number;phase:string;stage:string;state:string|undefined}|null=null;
  let firstPetting:{stage:string;kind:string;state:string|undefined}|null=null;
  const observer=new MutationObserver(()=>{
   const snapshot=JSON.parse(room.dataset.roomCat||'null');
   if(!firstWake&&snapshot?.phase==='wake')firstWake={x:snapshot.x,z:snapshot.z,phase:snapshot.phase,stage:snapshot.interaction?.stage,state:room.dataset.catState};
   if(!firstPetting&&snapshot?.interaction?.stage==='respond')firstPetting={stage:snapshot.interaction.stage,kind:snapshot.interaction.kind,state:room.dataset.catState};
  });
  observer.observe(room,{attributes:true,attributeFilter:['data-room-cat']});
  return {snapshot:()=>firstWake,petting:()=>firstPetting,disconnect:()=>observer.disconnect(),arrival:()=>{
   const cat=JSON.parse(room.dataset.roomCat!);
   return {x:cat.x,z:cat.z,mode:room.dataset.worldMode,pose:room.dataset.worldPose,before,connected:room.isConnected,focused:document.activeElement===room.querySelector('[data-room-object="cat"]'),action:room.querySelector<HTMLElement>('[data-room-object="cat"]')?.dataset.roomCatAction,label:room.querySelector('[data-room-object="cat"]')?.textContent};
  }};
 });
 try{
  await page.mouse.click(at.x,at.y);
  // Prepare the real keyboard control during the approach, before its finite nearby rest.
  await catButton.focus();
  await expect.poll(()=>wakeObservation.evaluate(observation=>observation.snapshot())).toEqual({phase:'wake',stage:'wake',state:'waking',x:home.x,z:home.z});
  await expect(root(page)).toHaveAttribute('data-cat-state','arrived',{timeout:45000});
  const arrival=await wakeObservation.evaluate(observation=>observation.arrival());
  expect(arrival.connected).toBe(true);
  expect(arrival.focused).toBe(true);expect(arrival.action).toBe('pet');expect(arrival.label).toContain('抚摸');await page.keyboard.press('Enter');
  expect(Math.hypot(arrival.x-home.x,arrival.z-home.z)).toBeGreaterThan(.3);
  expect(arrival.mode).toBe('roam');expect(arrival.pose).toBe(arrival.before);
  // Native input can finish its brief response before a slow protocol read returns.
  await expect.poll(()=>wakeObservation.evaluate(observation=>observation.petting())).toEqual({stage:'respond',kind:'pet',state:'petting'});
  await expect(page.locator('[data-room-inspection]')).toBeHidden();
 }finally{
  try{if(!page.isClosed())await wakeObservation.evaluate(observation=>observation.disconnect());}
  catch(error){
   const targetClosed=error instanceof Error&&(error.name==='TargetClosedError'||error.message.includes('Target page, context or browser has been closed'));
   if(!page.isClosed()||!targetClosed)throw error;
  }finally{await wakeObservation.dispose();}
 }
});

test('a reduced-motion call acknowledges the visitor without moving the cat or camera',async({page})=>{
 await ready(page);await expect(root(page)).toHaveAttribute('data-cat-loaded','true',{timeout:30000});const before=JSON.parse((await root(page).getAttribute('data-room-cat'))!),view=await root(page).getAttribute('data-world-pose');
 await object(page,'cat');await expect(root(page)).toHaveAttribute('data-cat-state','noticed');const after=JSON.parse((await root(page).getAttribute('data-room-cat'))!);
 expect(after.x).toBe(before.x);expect(after.z).toBe(before.z);expect(await root(page).getAttribute('data-world-pose')).toBe(view);
});

test('a sunny daytime view is silent outdoors while the same indoor record can play',async({page})=>{
 await page.goto('/zh/projects/?vista=image&room-hour=10');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
 const time=JSON.parse((await root(page).getAttribute('data-room-time'))!);expect(time.daylight).toBe(1);expect(time.rain).toBe(0);expect(time.rate).toBe(10);
 await expect(root(page)).toHaveAttribute('data-room-ambient','paused');await object(page,'speaker');
 await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-ambient','paused');expect(await rainSource(page)).toBeUndefined();
});

test('changing motion preference during waking settles the old call and accepts a new one',async({page})=>{
 await ready(page);await expect(root(page)).toHaveAttribute('data-cat-loaded','true',{timeout:30000});
 await page.emulateMedia({reducedMotion:'no-preference'});await object(page,'cat');await expect(root(page)).toHaveAttribute('data-cat-state','waking');
 const action=await page.evaluateHandle(()=>{
  const room=document.querySelector<HTMLElement>('[data-bear-workspace]')!,button=room.querySelector<HTMLElement>('[data-room-object="cat"]')!;
  let selected:{kind:string|undefined;trusted:boolean;stateWrites:number}|null=null;
  const capture=(event:KeyboardEvent)=>{if(event.key==='Enter')selected={kind:button.dataset.roomCatAction,trusted:event.isTrusted,stateWrites:0};};
  const observer=new MutationObserver(records=>{if(selected)selected.stateWrites+=records.filter(record=>record.attributeName==='data-cat-state').length;});
  observer.observe(room,{attributes:true,attributeFilter:['data-cat-state']});button.addEventListener('keydown',capture,{capture:true});
  return {read:()=>selected,dispose(){observer.disconnect();button.removeEventListener('keydown',capture,{capture:true});}};
 });
 try{
  await page.emulateMedia({reducedMotion:'reduce'});await object(page,'cat');
  const selected=await action.evaluate(value=>value.read());expect(selected).not.toBeNull();expect(selected!.trusted).toBe(true);expect(['call','pet']).toContain(selected!.kind);expect(selected!.stateWrites).toBeGreaterThan(0);
  await expect(root(page)).toHaveAttribute('data-cat-state',selected!.kind==='pet'?'petted-still':'noticed');
  const state=JSON.parse((await root(page).getAttribute('data-room-cat'))!);expect(state.interaction.kind).toBe(selected!.kind);expect(state.interaction.stage).toBe('notice');expect(state.interaction.instant).toBe(true);expect(state.speed).toBe(0);
  await test.info().attach('resident-selected-action',{contentType:'application/json',body:JSON.stringify({selected,interaction:state.interaction})});
 }finally{try{await action.evaluate(value=>value.dispose());}finally{await action.dispose();}}
});

test('dawn stops rain while reading without interrupting the record or drawing hidden room frames',async({page})=>{
 await ready(page);await object(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-ambient','playing');
 const music=(await roomAudioSources(page)).find(s=>!s.stopped&&Math.abs(s.duration-100)>.05)!;
 await object(page,'records');await page.locator('.room-records__footer a').click();await expect(page.frameLocator('.space-listening-page iframe').locator('main')).toBeVisible({timeout:30000});
 await expect(root(page)).toHaveAttribute('data-room-page-open','true');const frames=await root(page).getAttribute('data-world-frames');
 await page.clock.setFixedTime(await page.evaluate(()=>Date.now())+3600000);
 await expect(root(page)).toHaveAttribute('data-room-ambient','paused',{timeout:5000});await expect(root(page)).toHaveAttribute('data-room-sound','playing');
 expect(await root(page).getAttribute('data-world-frames')).toBe(frames);expect((await roomAudioSources(page)).some(s=>s.id===music.id&&!s.stopped)).toBe(true);
 await page.goBack();await expect(root(page)).toHaveAttribute('data-room-page-open','false');
 expect(JSON.parse((await root(page).getAttribute('data-room-time'))!).rain).toBe(0);
});

test('the cat advances at the room clock rate during normal motion',async({page})=>{
 await ready(page);await expect(root(page)).toHaveAttribute('data-cat-loaded','true',{timeout:30000});await page.emulateMedia({reducedMotion:'no-preference'});const sample=()=>root(page).evaluate(r=>({cat:JSON.parse((r as HTMLElement).dataset.roomCat!).elapsed,world:Number((r as HTMLElement).dataset.worldEnvironmentTime)}));const a=await sample();await page.waitForTimeout(250);const b=await sample();expect(b.cat-a.cat).toBeLessThanOrEqual(b.world-a.world+.01);
});

test('book details and the computer retreat naturally without a room Back button',async({page})=>{
 await ready(page);const before=await root(page).getAttribute('data-world-pose');await object(page,'books');await expect(root(page)).toHaveAttribute('data-world-mode','inspect');await expect(page.locator('[data-cafe-inspect-exit]')).toBeHidden();await page.locator('[data-room-book]').first().click();await expect(page.locator('[data-room-book-detail]')).toBeVisible();
 await page.mouse.move(12,12);await page.mouse.wheel(0,160);await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await root(page).getAttribute('data-world-pose')).toBe(before);
 await object(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(root(page)).toHaveAttribute('data-computer-view','expanded');
 await page.locator('[data-mac-menu="view"]').click();await page.locator('[data-mac-panel="view"] [data-computer-display="framed"]').click();await expect(root(page)).toHaveAttribute('data-computer-view','framed');
 await page.mouse.click(12,12);await expect(root(page)).toHaveAttribute('data-cafe-mode','cafe');await expect(root(page)).toHaveAttribute('data-world-mode','roam');
});

test('choosing real records keeps the outdoor source and drives the platter',async({page})=>{
 await ready(page);await object(page,'records');await expect(page.locator('[data-room-record]')).toHaveCount(3);await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30000});const first=(await rainSource(page))!;expect(first).toBeTruthy();
 for(const id of ['night-on-the-docks-sax','long-stroll','almost-new']){await page.locator(`[data-room-record="${id}"]`).click();await expect(root(page)).toHaveAttribute('data-room-track',id);await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});expect((await objects(page)).recordId).toBe(id);}expect((await rainSource(page))!.id).toBe(first.id);expect((await rainSource(page))!.time).toBeGreaterThan(first.time);expect((await roomAudioSources(page)).filter(s=>!s.stopped&&Math.abs(s.duration-100)<.05)).toHaveLength(1);
 await page.emulateMedia({reducedMotion:'no-preference'});const angle=(await objects(page)).platterAngle;await expect.poll(async()=>(await objects(page)).platterAngle).toBeGreaterThan(angle);await page.locator('[data-room-playback]').click();await expect(root(page)).toHaveAttribute('data-room-sound','paused');const stopped=(await objects(page)).platterAngle;await page.waitForTimeout(180);expect((await objects(page)).platterAngle).toBe(stopped);expect((await rainSource(page))!.id).toBe(first.id);
});

test('actual public pages keep the same rain and music through history and Space return',async({page})=>{
 await ready(page);await object(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-ambient','playing');const rain=(await rainSource(page))!,music=(await roomAudioSources(page)).find(s=>!s.stopped&&Math.abs(s.duration-100)>.05)!;
 await object(page,'records');await page.locator('.room-records__footer a').click();await expect(page).toHaveURL(/\/zh\/articles\/$/);const frame=page.frameLocator('.space-listening-page iframe');await expect(frame.locator('main')).toBeVisible({timeout:30000});await expect(root(page)).toHaveAttribute('data-room-page-open','true');
 const frames=await root(page).getAttribute('data-world-frames');await page.waitForTimeout(180);expect(await root(page).getAttribute('data-world-frames')).toBe(frames);expect((await rainSource(page))!.id).toBe(rain.id);expect((await rainSource(page))!.time).toBeGreaterThan(rain.time);expect((await roomAudioSources(page)).find(s=>!s.stopped&&s.id===music.id)).toBeTruthy();
 const article=frame.locator('article a[href]').first();await expect(article).toBeVisible();await article.click();await expect(page).not.toHaveURL(/\/zh\/articles\/$/);await expect(page.frameLocator('.space-listening-page iframe').locator('main')).toBeVisible();await page.goBack();await expect(page).toHaveURL(/\/zh\/articles\/$/);await page.goBack();await expect(page).toHaveURL(/\/zh\/projects\//);await expect(root(page)).toHaveAttribute('data-room-page-open','false');
 expect((await rainSource(page))!.id).toBe(rain.id);expect((await roomAudioSources(page)).find(s=>!s.stopped&&s.id===music.id)).toBeTruthy();await expect(page.locator('.space-world')).toHaveCount(1);
});

test('article search owns Escape and its keyboard destination survives native forward history',async({page})=>{
 await ready(page);await object(page,'records');await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30000});const rain=(await rainSource(page))!;await page.locator('.room-records__footer a').click();const frame=page.frameLocator('.space-listening-page iframe');await expect(frame.locator('main')).toBeVisible({timeout:30000});await frame.locator('[data-search-trigger="nav"]').click();const input=frame.locator('#search-command-palette input').first();await expect(input).toBeVisible();await input.fill('Kubernetes');await input.press('Escape');await expect(frame.locator('#search-command-palette')).toBeHidden();await expect(root(page)).toHaveAttribute('data-room-page-open','true');
 await frame.locator('[data-search-trigger="nav"]').click();await input.fill('Kubernetes');await expect(frame.locator('.search-palette__results [role="option"]').first()).toBeVisible({timeout:30000});await input.press('Enter');await expect(page).not.toHaveURL(/\/zh\/articles\/$/);const destination=page.url();await expect(page.frameLocator('.space-listening-page iframe').locator('main')).toBeVisible();await page.goBack();await expect(page).toHaveURL(/\/zh\/articles\/$/);await page.goBack();await expect(page).toHaveURL(/\/zh\/projects\//);await page.goForward();await expect(page).toHaveURL(/\/zh\/articles\/$/);await page.goForward();await expect(page).toHaveURL(destination);expect((await rainSource(page))!.id).toBe(rain.id);
});

test('a background visibility notice preserves native sound sources while pausing room rendering',async({page})=>{
 await page.addInitScript(()=>{let hidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});(window as any).__setRoomHidden=(value:boolean)=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'));};});
 await ready(page);await object(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-ambient','playing');const rain=(await rainSource(page))!,music=(await roomAudioSources(page)).find(s=>!s.stopped&&Math.abs(s.duration-100)>.05)!;await page.evaluate(()=>(window as any).__setRoomHidden(true));await page.waitForTimeout(160);await expect(root(page)).toHaveAttribute('data-room-sound','playing');await expect(root(page)).toHaveAttribute('data-room-ambient','playing');expect((await rainSource(page))!.id).toBe(rain.id);expect((await rainSource(page))!.time).toBeGreaterThan(rain.time);expect((await roomAudioSources(page)).find(s=>!s.stopped&&s.id===music.id)).toBeTruthy();await page.evaluate(()=>(window as any).__setRoomHidden(false));
});
