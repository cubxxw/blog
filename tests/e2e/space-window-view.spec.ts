import {test,expect,type Page} from '../helpers/frozen-site';
import {lookAtRoomObject} from '../helpers/room-interaction';
import {observeRoomAudio,rainSource,roomAudioSources} from '../helpers/room-audio';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
const pose=(page:Page)=>root(page).getAttribute('data-world-pose');
async function glassPoint(page:Page,point:[number,number,number]=[.35,1.95,-2.606]){return page.evaluate(async point=>{
 const specifier='three',T=await import(specifier),r=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(r.dataset.worldPose!),c=new T.PerspectiveCamera(p.fov,r.clientWidth/r.clientHeight,.04,160);
 c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();const v=new T.Vector3(point[0],point[1],point[2]).project(c),b=r.getBoundingClientRect();
 return{x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2};
},point);}

test('the actual window retreats naturally, preserves audio and keeps Mac controls inside the screen',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await observeRoomAudio(page);
 await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});
 await page.goto('/zh/projects/?vista=image');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
 const speaker=page.locator('[data-room-object="speaker"]');await speaker.focus();await speaker.press('Enter');
 await expect(root(page)).toHaveAttribute('data-room-sound','playing',{timeout:30000});await expect(root(page)).toHaveAttribute('data-room-ambient','playing');
 const rain=(await rainSource(page))!,music=(await roomAudioSources(page)).find(s=>!s.stopped&&Math.abs(s.duration-100)>.05)!,before=await pose(page);
 const meeting=await glassPoint(page,[.791,1.95,-2.555]);await page.mouse.click(meeting.x,meeting.y);await expect(root(page)).toHaveAttribute('data-world-inspect','window');await page.keyboard.press('Escape');await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await pose(page)).toBe(before);
 const glass=await glassPoint(page);expect(glass.x).toBeGreaterThan(8);expect(glass.x).toBeLessThan(page.viewportSize()!.width-8);await page.mouse.click(glass.x,glass.y);
 await expect(root(page)).toHaveAttribute('data-world-inspect','window');await expect(root(page)).toHaveAttribute('data-world-mode','inspect');
 await expect(page.locator('[data-room-inspection]')).toBeHidden();await expect(page.locator('[data-cafe-inspect-exit]')).toBeHidden();
 const station=JSON.parse((await pose(page))!);expect(station.z+2.606).toBeGreaterThan(.45);expect(station.z+2.606).toBeLessThan(.9);expect(station.y).toBeGreaterThan(1.5);
 const size=page.viewportSize()!;await page.mouse.move(size.width*.5,size.height*.35);await page.mouse.down();await page.mouse.move(size.width*.5+45,size.height*.35+25,{steps:4});await page.mouse.up();
 const looking=JSON.parse((await pose(page))!);expect(looking.x).toBe(station.x);expect(looking.z).toBe(station.z);expect(looking.yaw).not.toBe(station.yaw);expect(looking.pitch).not.toBe(station.pitch);
 // The close window composition deliberately excludes the desk. Step back
 // with the actual outside gesture before turning to the physical computer.
 await page.mouse.click(8,8);await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await pose(page)).toBe(before);
 const at=await lookAtRoomObject(page,'computer'),deskPose=await pose(page);await page.mouse.click(at.x,at.y);await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
 await page.locator('[data-mac-menu="file"]').click();await page.locator('[data-mac-panel="file"] [data-open="notes"]').click();const editor=page.locator('[data-note-editor]');await editor.fill('Rain outside the same quiet working room.');
 await page.locator('[data-space-window="notes"] [data-window-action="close"]').click();await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
 await page.locator('[data-mac-menu="file"]').click();await page.locator('[data-mac-panel="file"] [data-open="notes"]').click();await expect(editor).toHaveValue('Rain outside the same quiet working room.');
 await page.mouse.click(8,8);await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await pose(page)).toBe(deskPose);
 expect((await rainSource(page))!.id).toBe(rain.id);expect((await roomAudioSources(page)).some(s=>s.id===music.id&&!s.stopped)).toBe(true);
 await expect(editor).toHaveValue('Rain outside the same quiet working room.');
 for(const retreat of ['wheel','escape']){
  const point=await lookAtRoomObject(page,'window'),returnPose=await pose(page);await page.mouse.click(point.x,point.y);await expect(root(page)).toHaveAttribute('data-world-inspect','window');
  if(retreat==='wheel'){await page.mouse.move(8,8);await page.mouse.wheel(0,180);}else await page.keyboard.press('Escape');
  await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await pose(page)).toBe(returnPose);
 }
 expect(errors).toEqual([]);
});
