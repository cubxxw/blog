import {test,expect,type Page} from '../helpers/frozen-site';
import {hitRoomObject,lookAtRoomObject} from '../helpers/room-interaction';
import {observeRoomAudio,rainSource,blockRoomAudioUntilGesture} from '../helpers/room-audio';
const errors=new WeakMap<Page,string[]>();
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'&&process.env.SPACE_SOFTWARE_QA!=='1'?['--enable-gpu','--use-angle=metal','--autoplay-policy=user-gesture-required']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=user-gesture-required']}});
test.beforeEach(async({page})=>{test.setTimeout(90_000);const failures:string[]=[];errors.set(page,failures);page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|Shader Error|GL_INVALID/.test(m.text()))failures.push(m.text());});await observeRoomAudio(page);await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');localStorage.setItem('space:cafe:music-enabled:v1','no');});});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
const root=(page:Page)=>page.locator('[data-bear-workspace]');
async function ready(page:Page){await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-world-ready','true',{timeout:30_000});await expect(root(page)).toHaveAttribute('data-boot-state','complete');}
async function point(page:Page,name:string){return page.evaluate(async name=>{const specifier='three',THREE=await import(specifier),el=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(el.dataset.worldPose!),target=JSON.parse(el.dataset.worldTargets!)[name];const c=new THREE.PerspectiveCamera(p.fov,el.clientWidth/el.clientHeight,.04,160);c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();const v=new THREE.Vector3(...target).project(c),b=el.getBoundingClientRect();return{x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2};},name);}
async function hit(page:Page,name:string){await hitRoomObject(page,name);}

test('the room opens without floating entry actions and keeps quiet scene utilities',async({page})=>{
 await ready(page);
 for(const selector of ['.space-cafe__footer','.space-fullscreen','.jiangnan-guidance','.space-world-touch','.space-world-hud__workspace'])await expect(page.locator(selector)).toBeHidden();
 await expect(page.locator('.space-cafe__header')).toBeVisible();await expect(page.locator('.space-cafe__brand')).toBeHidden();
 const utilities=page.locator('.space-cafe__utilities');
 for(const action of ['language','quiet','picker'])await expect(utilities.locator(`[data-cafe-${action}]`)).toBeVisible();
 const roam=page.locator('.space-world-hud__roam');await expect(roam).toBeHidden();
 for(const action of ['read','enter'])await expect(roam.locator(`[data-cafe-${action}]`)).toBeHidden();
 await expect(page.locator('.jiangnan-explore')).toHaveCount(0);
 await expect(roam.locator('[data-cafe-photos]')).toBeHidden();await expect(roam.locator('p')).toBeHidden();
  await expect(page.locator('.space-room-audio')).toHaveCount(1);await expect(page.locator('button[data-room-sound]')).toHaveCount(0);
 await expect(root(page)).toHaveAttribute('data-room-sound','paused');
 await expect(root(page)).toHaveAttribute('data-room-ambient',/blocked|playing|wanted/);
 await page.screenshot({path:test.info().outputPath('room-photo-wall.png')});
});

test('small wall photographs open their own journey from the physical frame',async({page})=>{
 await ready(page);
 for(const [id,title] of [['kumano','熊野古道'],['fuji','富士山']]){
  const point=await lookAtRoomObject(page,'photo:'+id);
  await page.screenshot({path:test.info().outputPath('photo-wall-'+id+'.png')});
  await page.mouse.click(point.x,point.y);
  await expect(page.locator('.sp-photos--detail > .sp-media-header h2')).toHaveText(title);
  if(id==='kumano'){
   if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();
   await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();
   await expect(root(page)).toHaveAttribute('data-world-travel','false');
  }
 }
});

test('the physical speaker starts blocked music on the first click and pauses on the next',async({page})=>{
 await blockRoomAudioUntilGesture(page);
 await ready(page);await expect.poll(async()=>JSON.parse((await root(page).getAttribute('data-world-targets'))!).speaker).toBeTruthy();
 await expect(root(page)).toHaveAttribute('data-room-ambient','blocked');await expect(root(page)).toHaveAttribute('data-room-sound','paused');
 await hit(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-ambient','playing',{timeout:15000});await expect(root(page)).toHaveAttribute('data-room-sound','playing');const rain=(await rainSource(page))!;
 await hit(page,'speaker');await expect(root(page)).toHaveAttribute('data-room-sound','paused');expect((await rainSource(page))!.id).toBe(rain.id);
 await page.keyboard.press('Control+k');await page.locator('[data-space-search-close]').click();if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();await expect(root(page)).toHaveAttribute('data-room-sound','paused');expect((await rainSource(page))!.id).toBe(rain.id);
});

test('a keyboard speaker activation owns its first blocked start and can pause again',async({page})=>{
 await blockRoomAudioUntilGesture(page);await ready(page);await expect(root(page)).toHaveAttribute('data-room-ambient','blocked');const speaker=page.locator('[data-room-object="speaker"]');await speaker.focus();await speaker.press('Enter');await expect(root(page)).toHaveAttribute('data-room-sound','playing');await expect(root(page)).toHaveAttribute('data-room-ambient','playing');const rain=(await rainSource(page))!;await speaker.press('Space');await expect(root(page)).toHaveAttribute('data-room-sound','paused');expect((await rainSource(page))!.id).toBe(rain.id);
});

test('the real computer and photograph remain reachable without room buttons',async({page})=>{
 await ready(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
 for(const selector of ['.space-cafe__header','.space-world-hud__roam','.space-world-hud__workspace'])await expect(page.locator(selector)).toBeHidden();
 if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();
 await page.locator('[data-mac-menu="file"]').click();await page.locator('[data-mac-panel="file"] [data-open="notes"]').click();const editor=page.locator('[data-note-editor]'),original=await editor.elementHandle();await editor.fill('留在这间房里的笔记。');await editor.evaluate((e:HTMLTextAreaElement)=>e.setSelectionRange(1,6,'backward'));
 await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();await expect(root(page)).toHaveAttribute('data-world-travel','false');await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');expect(await editor.evaluate((e,old)=>e===old,original)).toBe(true);await expect(editor).toHaveValue('留在这间房里的笔记。');expect(await editor.evaluate((e:HTMLTextAreaElement)=>[e.selectionStart,e.selectionEnd,e.selectionDirection])).toEqual([1,6,'backward']);
 if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();await expect(root(page)).toHaveAttribute('data-world-travel','false');await hit(page,'photo');await expect(page.locator('.sp-photo-detail')).toBeVisible();
});

test('music credits remain reachable by keyboard inside the computer Help menu',async({page})=>{
 await ready(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
 for(const width of [320,390]){
 await page.setViewportSize({width,height:700});if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();
 const help=page.locator('[data-mac-menu="help"]');await help.focus();await help.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
 const credits=page.locator('[data-mac-panel="help"] .space-room-credits');await expect(credits.locator('summary')).toBeFocused();if(await credits.getAttribute('open')===null)await page.keyboard.press('Enter');await expect(credits).toHaveAttribute('open');await page.keyboard.press('ArrowDown');await expect(credits.locator('a').first()).toBeFocused();await expect(credits.locator('a').first()).toHaveAttribute('href',/incompetech\.com/);await page.keyboard.press('Escape');await expect(help).toBeFocused();
 expect(await help.evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
});
