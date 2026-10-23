import {test,expect,type Page} from '../helpers/frozen-site';
import {hitRoomObject} from '../helpers/room-interaction';
import {observeRoomAudio,rainSource,roomAudioSources,blockRoomAudioUntilGesture} from '../helpers/room-audio';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(async({page})=>{test.setTimeout(90_000);await observeRoomAudio(page);await page.addInitScript(()=>{localStorage.setItem('space:cafe:onboarding:v1','seen');localStorage.setItem('space:cafe:theme:v2','jiangnan');});});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
async function ready(page:Page){await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30_000});}
async function point(page:Page,name:string){return page.evaluate(async name=>{const specifier='three',T=await import(specifier),r=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(r.dataset.worldPose!),c=new T.PerspectiveCamera(p.fov,r.clientWidth/r.clientHeight,.04,160);c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();const v=new T.Vector3(...JSON.parse(r.dataset.worldTargets!)[name]).project(c);return{x:(v.x+1)*r.clientWidth/2,y:(1-v.y)*r.clientHeight/2};},name);}
async function hit(page:Page,name:string){await hitRoomObject(page,name);}

test('rain starts alone and the same native loop continues through music and the Mac',async({page})=>{
 await ready(page);if(await root(page).getAttribute('data-room-ambient')==='blocked')await page.locator('.space-world__canvas').click({position:{x:20,y:20}});
 await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-sound','paused');const first=(await rainSource(page))!;expect(first.loop).toBe(true);expect(first.context).toBe('running');
 await hit(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await hit(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','paused');
 await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();
 const later=(await rainSource(page))!;expect(later.id).toBe(first.id);expect(later.time).toBeGreaterThan(first.time);expect(later.offset).toBe(0);expect((await roomAudioSources(page)).filter(r=>Math.abs(r.duration-100)<.05)).toHaveLength(1);await expect(root(page)).toHaveAttribute('data-room-ambient','playing');
});
test('the first real speaker gesture unlocks both intended loops after autoplay is blocked',async({page})=>{
 await blockRoomAudioUntilGesture(page);await ready(page);await expect(root(page)).toHaveAttribute('data-room-ambient','blocked');await expect(root(page)).toHaveAttribute('data-room-sound','paused');
 const speaker=page.locator('[data-room-object="speaker"]');await speaker.focus();await speaker.press('Enter');await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});const first=(await rainSource(page))!;await speaker.press('Space');await expect(root(page)).toHaveAttribute('data-room-sound','paused');expect((await rainSource(page))!.id).toBe(first.id);
});
test('quiet and a hidden room pause sources then resume rain at its retained offset',async({page})=>{
 await ready(page);await page.keyboard.press('Control+k');await page.locator('[data-space-search-close]').click();if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30000});const before=(await rainSource(page))!;
 await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-quiet]').click();await expect(root(page)).toHaveAttribute('data-room-ambient','paused');expect(await rainSource(page)).toBeUndefined();await page.locator('.space-menu [data-cafe-quiet]').click();await expect(root(page)).toHaveAttribute('data-room-ambient','playing');const resumed=(await rainSource(page))!;expect(resumed.id).not.toBe(before.id);expect(resumed.offset).toBeGreaterThanOrEqual(before.time);await root(page).evaluate((r:HTMLElement)=>{r.hidden=true;});await expect(root(page)).toHaveAttribute('data-room-ambient','paused');await root(page).evaluate((r:HTMLElement)=>{r.hidden=false;});await expect(root(page)).toHaveAttribute('data-room-ambient','playing');expect((await rainSource(page))!.offset).toBeGreaterThanOrEqual(resumed.time);
});

test('a later real gesture recovers a transient rain failure without starting indoor music',async({page})=>{
 let requests=0,release!:()=>void,handled!:()=>void;
 const responseGate=new Promise<void>(resolve=>release=resolve),firstHandled=new Promise<void>(resolve=>handled=resolve);
 await page.route('**/rain-distant-storm-loop.flac',async route=>{
  if(++requests!==1){await route.continue();return;}
  try{await responseGate;await route.fulfill({status:503,body:'temporarily unavailable'});}finally{handled();}
 });
 try{
  await ready(page);await expect.poll(()=>requests).toBe(1);
  // Keep autoplay permission separate from the HTTP failure under test. A
  // trusted gesture unlocks the native context while the first response waits.
  await page.locator('.space-world__canvas').click({position:{x:20,y:20}});
  expect(await page.evaluate(()=>navigator.userActivation.hasBeenActive)).toBe(true);
  release();await expect(root(page)).toHaveAttribute('data-room-ambient','error');expect(requests).toBe(1);await expect(root(page)).toHaveAttribute('data-room-sound','paused');
  await page.locator('.space-world__canvas').click({position:{x:20,y:20}});await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:30_000});expect(requests).toBe(2);expect(await rainSource(page)).toBeTruthy();await expect(root(page)).toHaveAttribute('data-room-sound','paused');
 }finally{release();if(requests)await firstHandled;}
});
