import {test,expect,type Page} from '../helpers/frozen-site';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(async({page})=>{
  test.setTimeout(90_000);
  await page.addInitScript(()=>{
    localStorage.setItem('space:cafe:theme:v2','jiangnan');
    localStorage.setItem('space:cafe:onboarding:v1','seen');
  });
});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
const roomControl=(page:Page)=>page.locator('.space-fullscreen[data-space-fullscreen]');
async function openRoom(page:Page,lang='zh'){
  await page.goto(lang==='zh'?'/zh/projects/':'/projects/');
  await expect(root(page)).toHaveAttribute('data-boot-state','complete');
}
async function computerMenu(page:Page){
  await page.keyboard.press('Control+k');await page.locator('[data-space-search-close]').click();
  if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();
  await page.locator('[data-space-menu-trigger]').click();
}
async function speaker(page:Page){const p=await page.evaluate(async()=>{const specifier='three',T=await import(specifier),r=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(r.dataset.worldPose!),c=new T.PerspectiveCamera(p.fov,r.clientWidth/r.clientHeight,.04,160);c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();const v=new T.Vector3(...JSON.parse(r.dataset.worldTargets!).speaker).project(c);return{x:(v.x+1)*r.clientWidth/2,y:(1-v.y)*r.clientHeight/2};});await page.mouse.click(p.x,p.y);}

test('native fullscreen and OS-menu exit retain the original note and selection',async({page})=>{
  await openRoom(page);
  await page.keyboard.press('f');
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.matches('[data-bear-workspace]')||false)).toBe(true);
  await expect(roomControl(page)).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(roomControl(page)).toBeHidden();
  const note=page.locator('[data-note-editor]');
  await note.fill('The same notebook, in a larger room.');
  await note.evaluate(el=>(el as HTMLTextAreaElement).setSelectionRange(4,17));
  const original=await note.elementHandle();
  await page.locator('[data-space-menu-trigger]').click();
  const exit=page.locator('.space-menu [data-space-fullscreen]');
  await expect(exit).toHaveAttribute('aria-pressed','true');
  await exit.click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
  expect(await note.evaluate((el,old)=>el===old,original)).toBe(true);
  await expect(note).toHaveValue('The same notebook, in a larger room.');
  expect(await note.evaluate(el=>[(el as HTMLTextAreaElement).selectionStart,(el as HTMLTextAreaElement).selectionEnd])).toEqual([4,17]);
});

test('browser-driven fullscreen exit updates both controls without rebuilding the room',async({page})=>{
  await openRoom(page,'en');
  const canvas=await page.locator('.space-world__canvas').elementHandle();
  await expect(roomControl(page)).toBeHidden();
  await page.keyboard.press('f');
  await expect(roomControl(page)).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>document.exitFullscreen());
  await expect(roomControl(page)).toHaveAttribute('aria-pressed','false');
  await expect(roomControl(page)).toHaveAttribute('aria-label','Enter fullscreen');
  await expect(page.locator('.space-menu [data-space-fullscreen]')).toHaveAttribute('aria-pressed','false');
  await computerMenu(page);await expect(page.locator('.space-menu [data-space-fullscreen]')).toHaveAccessibleName('Enter fullscreen');
  expect(await page.locator('.space-world__canvas').evaluate((el,old)=>el===old,canvas)).toBe(true);
});

test('switching from a fullscreen room to Product Lab releases the hidden fullscreen owner',async({page})=>{
  await openRoom(page);await page.keyboard.press('f');
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement!==null)).toBe(true);
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  const note=page.locator('[data-note-editor]');await note.fill('This note crosses both views.');const original=await note.elementHandle();
  await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-product-view-button="lab"]').click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
  const back=page.locator('[data-product-space] [data-product-view-button="bear"]');await expect(back).toBeVisible();await back.click();
  await expect(root(page)).toBeVisible();await expect(note).toHaveValue('This note crosses both views.');expect(await note.evaluate((el,old)=>el===old,original)).toBe(true);
});

test('unsupported system fullscreen leaves a viewport-filling usable workspace',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:undefined}));
  await openRoom(page);
  await expect(roomControl(page)).toBeDisabled();
  await expect(roomControl(page)).toHaveAttribute('aria-label','浏览器不支持系统全屏');
  await computerMenu(page);await expect(page.locator('.space-menu [data-space-fullscreen]')).toBeDisabled();await expect(page.locator('.space-menu [data-space-fullscreen]')).toHaveAccessibleName('浏览器不支持系统全屏');await page.keyboard.press('Escape');
  const dimensions=await root(page).evaluate(el=>({width:el.clientWidth,height:el.clientHeight,viewportWidth:innerWidth,viewportHeight:innerHeight}));
  expect(dimensions.width).toBe(dimensions.viewportWidth);expect(dimensions.height).toBe(dimensions.viewportHeight);
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  await expect(page.locator('[data-note-editor]')).toBeVisible();
});

test('a rejected fullscreen request keeps the current room usable and allows retry',async({page})=>{
  await page.addInitScript(()=>{
    Element.prototype.requestFullscreen=function(){return Promise.reject(new DOMException('Fullscreen denied','NotAllowedError'));};
  });
  await openRoom(page);
  await page.keyboard.press('f');
  await expect(roomControl(page)).toBeEnabled();
  await expect(roomControl(page)).toHaveAttribute('aria-pressed','false');
  await expect(page.getByRole('status').filter({hasText:'未能切换系统全屏'})).toBeVisible();
  await computerMenu(page);await page.locator('.space-menu [data-cafe-picker]').click();
  await expect(page.locator('[data-cafe-dialog]')).toBeVisible();
});

test('a 320 pixel room hides external chrome and keeps scene and fullscreen actions in the computer',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  for(const lang of ['zh','en']){
    await openRoom(page,lang);
    await expect(page.locator('.space-cafe__header')).toBeHidden();await expect(roomControl(page)).toBeHidden();
    await computerMenu(page);
    for(const control of await page.locator('.space-menu [data-cafe-picker],.space-menu [data-space-fullscreen]').all()){
      const box=await control.boundingBox();expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);
      expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    }
  }
});

test('default room audio survives workspace use and stops when hidden or quiet',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('space:cafe:theme:v2','jiangnan'));
  await openRoom(page);
  const audio=page.locator('.space-room-audio audio');
  await expect(audio).toHaveCount(2);
  await expect.poll(()=>root(page).getAttribute('data-room-sound')).toMatch(/playing|blocked/);
  if(await root(page).getAttribute('data-room-sound')==='blocked')await speaker(page);
  await expect.poll(()=>audio.evaluateAll(nodes=>nodes.every(node=>!(node as HTMLAudioElement).paused))).toBe(true);
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  expect(await audio.evaluateAll(nodes=>nodes.every(node=>!(node as HTMLAudioElement).paused))).toBe(true);
  await root(page).evaluate(el=>(el as HTMLElement).hidden=true);
  await expect.poll(()=>audio.evaluateAll(nodes=>nodes.every(node=>(node as HTMLAudioElement).paused))).toBe(true);
  await root(page).evaluate(el=>(el as HTMLElement).hidden=false);
  await expect.poll(()=>audio.evaluateAll(nodes=>nodes.every(node=>!(node as HTMLAudioElement).paused))).toBe(true);
  await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-quiet]').click();
  await expect.poll(()=>audio.evaluateAll(nodes=>nodes.every(node=>(node as HTMLAudioElement).paused))).toBe(true);
  await expect(root(page)).toHaveAttribute('data-room-sound','paused');
});
