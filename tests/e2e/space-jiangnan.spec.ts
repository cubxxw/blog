import {test,expect,type Page} from '../helpers/frozen-site';
import {hitRoomObject,lookAtRoomObject,dragRoomTouch} from '../helpers/room-interaction';
import {waitForRoomBoatMove,withRoomObservationSession} from '../helpers/room-observation';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'&&process.env.SPACE_SOFTWARE_QA!=='1'?['--enable-gpu','--use-angle=metal']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
const pageErrors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{test.setTimeout(90_000);const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});});
test.afterEach(async({page})=>{expect(pageErrors.get(page)).toEqual([]);});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
const pose=async(page:Page)=>JSON.parse((await root(page).getAttribute('data-world-pose'))!);
async function ready(page:Page,lang='zh'){
  await page.goto(lang==='zh'?'/zh/projects/':'/projects/');
  await expect(root(page)).toHaveAttribute('data-world-renderer','jiangnan',{timeout:30_000});
  await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30_000});
  await expect(root(page)).toHaveAttribute('data-world-travel','false');
}
async function point(page:Page,name:string){return page.evaluate(async name=>{
  const specifier='three',THREE=await import(specifier),el=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(el.dataset.worldPose!),target=JSON.parse(el.dataset.worldTargets!)[name];
  const camera=new THREE.PerspectiveCamera(p.fov,el.clientWidth/el.clientHeight,.04,160);camera.position.set(p.x,p.y,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');camera.updateMatrixWorld();
  const v=new THREE.Vector3(...target).project(camera),b=el.getBoundingClientRect();return {x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2};
},name);}
async function hit(page:Page,name:string){await hitRoomObject(page,name);}
async function back(page:Page){await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();await expect(root(page)).toHaveAttribute('data-world-mode','roam');await expect(root(page)).toHaveAttribute('data-world-travel','false');}
async function menu(page:Page){await page.keyboard.press('Control+k');await page.locator('[data-space-search-close]').click();if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();await page.locator('[data-space-menu-trigger]').click();}

test('the full-viewport explorable room renders its distant environment inside the 3D scene',async({page})=>{
  const plates:string[]=[],errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error'&&/THREE.WebGLProgram|Shader Error/.test(msg.text()))errors.push(msg.text());});page.on('request',r=>{if(/jiangnan-night|jiangnan-boat-v2/.test(r.url()))plates.push(r.url());});await ready(page);
  const canvas=page.locator('.space-world__canvas');expect(await canvas.evaluate(el=>!!(el as HTMLCanvasElement).getContext('webgl2'))).toBe(true);
  expect(Number(await root(page).getAttribute('data-world-triangles'))).toBeGreaterThan(20_000);await expect(page.locator('.rain-room,.rain-room__image')).toHaveCount(0);expect(plates).toEqual([]);
  await expect(root(page)).toHaveAttribute('data-world-vista','image',{timeout:30_000});
  const a=(await root(page).boundingBox())!,b=(await canvas.boundingBox())!;expect(Math.abs(a.width-b.width)).toBeLessThan(1);expect(Math.abs(a.height-b.height)).toBeLessThan(1);
  // The accepted room uses its physical Mac; external entry cards stay hidden.
  const roam=page.locator('.space-world-hud__roam');await expect(roam).toBeHidden();
  await expect(page.locator('.space-cafe__header')).toBeVisible();
  for(const name of ['language','photo-light','quiet','picker'])await expect(page.locator(`.space-cafe__utilities [data-cafe-${name}]`)).toBeVisible();
  await expect(page.locator('.space-world-hud__workspace')).toBeHidden();
  const windows=page.locator('[data-space-windows]'),original=await windows.elementHandle();expect(original).not.toBeNull();
  await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
  if(await page.locator('.jiangnan-computer-expand').isVisible())await page.locator('.jiangnan-computer-expand').click();
  await back(page);await expect(page.locator('.space-cafe__header')).toBeVisible();
  expect(await windows.evaluate((element,before)=>element===before,original)).toBe(true);
  expect(errors).toEqual([]);await page.screenshot({path:`.netlify/space-3d-${test.info().project.name}.png`});
});

test('a failed distant environment falls back to geometry and remains explorable',async({page})=>{
  await page.route(/jiangnan-vista-study-v\d+.*\.webp/,route=>route.fulfill({status:404,body:''}));await ready(page);
  await expect(root(page)).toHaveAttribute('data-world-vista','geometry-fallback');const before=await pose(page);await page.keyboard.down('KeyW');try{await expect.poll(async()=>{const p=await pose(page);return Math.hypot(p.x-before.x,p.z-before.z);}).toBeGreaterThan(.15);}finally{await page.keyboard.up('KeyW');}
  await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
});

test('cold entry keeps the room covered until its current photographic window is painted',async({page})=>{
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  const requested=page.waitForRequest(/jiangnan-vista-study-v\d+.*\.webp/);
  await page.route(/jiangnan-vista-study-v\d+.*\.webp/,async route=>{await pending;await route.continue();});
  try{
    await page.goto('/projects/',{waitUntil:'domcontentloaded'});await requested;
    await expect(root(page)).toHaveAttribute('data-world-frames',/^[1-9]\d*$/,{timeout:30_000});
    await expect.poll(async()=>Number(await root(page).getAttribute('data-world-pbr-maps'))).toBeGreaterThanOrEqual(5);
    await expect(root(page)).toHaveAttribute('data-boot-state','loading');
    await expect(root(page)).toHaveAttribute('data-world-vista','loading');
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    release();
    await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30_000});
    await expect(root(page)).toHaveAttribute('data-world-vista','image');
    await expect(page.locator('[data-space-boot]')).toBeHidden();
    await page.screenshot({path:test.info().outputPath('photographic-first-frame.png')});
  }finally{release();}
});

test('walking and dragging change position and angle with different near/far parallax',async({page})=>{
  await ready(page);const a=await pose(page),near=await point(page,'computer'),far=await point(page,'bridge');
  await page.keyboard.down('KeyW');try{await expect.poll(async()=>{const p=await pose(page);return Math.hypot(p.x-a.x,p.z-a.z);},{timeout:10_000}).toBeGreaterThan(.15);}finally{await page.keyboard.up('KeyW');}const b=await pose(page);
  expect(Math.hypot(b.x-a.x,b.z-a.z)).toBeGreaterThan(.15);
  const n2=await point(page,'computer'),f2=await point(page,'bridge');expect(Math.abs((n2.x-near.x)-(f2.x-far.x))).toBeGreaterThan(1);
  const box=(await page.locator('.space-world__canvas').boundingBox())!;await page.mouse.move(box.x+box.width*.4,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.4+110,box.y+box.height*.45+25,{steps:5});await page.mouse.up();
  expect(Math.abs((await pose(page)).yaw-b.yaw)).toBeGreaterThan(.2);
});

test('the physical Mac opens the same real desktop and returning retains the editor and selection',async({page})=>{
  await ready(page);await expect(page.locator('.jiangnan-workspace[data-surface="monitor"]')).toBeVisible();
  await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));const note=page.locator('[data-note-editor]');await note.fill('A real room around the same notebook.');const original=await note.elementHandle();await note.evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(2,9,'backward'));
  await back(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  expect(await note.evaluate((el,old)=>el===old,original)).toBe(true);await expect(note).toHaveValue('A real room around the same notebook.');expect(await note.evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd])).toEqual([2,9]);
});

test('the close wooden working chair opens the same physical Mac and retreats naturally',async({page})=>{
  await ready(page);const chair=await lookAtRoomObject(page,'seat'),before=await pose(page);await page.mouse.click(chair.x,chair.y);
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(root(page)).toHaveAttribute('data-computer-view','expanded');
  await page.locator('[data-mac-menu="view"]').click();await page.locator('[data-mac-panel="view"] [data-computer-display="framed"]').click();await expect(root(page)).toHaveAttribute('data-computer-view','framed');
  const seated=await pose(page);expect(seated.x).toBeCloseTo(.8,3);expect(seated.z).toBeGreaterThan(-1.10);expect(seated.z).toBeLessThan(-.90);
  await page.mouse.click(12,12);await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await pose(page)).toEqual(before);
});

test('the physical photo frame opens its actual catalog photograph',async({page})=>{
  await ready(page);await hit(page,'photo');await expect(page.locator('.sp-photo-detail')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().windows.find((w:any)=>w.app==='photos')?.payload)).toBe('kumano');await back(page);await expect(root(page)).toHaveAttribute('data-world-renderer','jiangnan');
});

test('returning keeps the native workspace connected before the next frame and accepts an immediate search',async({page})=>{
  await ready(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await page.locator('[data-space-menu-trigger]').click();
  const connected=await page.evaluate(async()=>{
    document.querySelector<HTMLButtonElement>('.space-menu [data-cafe-visit]')!.click();await Promise.resolve();await Promise.resolve();
    const el=document.querySelector('[data-bear-workspace]')!;return Boolean(el.querySelector('[data-space-windows]')&&el.querySelector('[data-active-label]'));
  });
  expect(connected).toBe(true);await page.keyboard.press('Control+k');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(page.locator('[data-space-search]')).toBeVisible();
});

test('real coffee and bookshelf hits open a close view and return to the same camera',async({page})=>{
  await ready(page);const before=await pose(page);await hit(page,'coffee');await expect(root(page)).toHaveAttribute('data-world-inspect','coffee');
  await expect(page.locator('[data-room-inspection][data-kind="coffee"]')).toBeVisible();
  for(const selector of ['.space-cafe__header','.space-world-hud__roam','.space-world-hud__workspace'])await expect(page.locator(selector)).toBeHidden();
  await page.keyboard.press('Escape');expect(await pose(page)).toEqual(before);
  // Turn to the opposite wall; this is an actual camera rotation before the hit.
  const target=await point(page,'books');if(target.x<0||target.x>page.viewportSize()!.width){
    const p=await pose(page),yaw=Math.atan2(-(-2.56-p.x),-(-1.1-p.z)),b=(await root(page).boundingBox())!;
    await page.mouse.move(b.width/2,b.height/2);await page.mouse.down();await page.mouse.move(b.width/2-(yaw-p.yaw)/.0035,b.height/2,{steps:12});await page.mouse.up();
  }
  const atShelf=await pose(page);await hit(page,'books');await expect(root(page)).toHaveAttribute('data-world-inspect',/^book:/);
  await expect(page.locator('[data-room-book-detail]')).toBeVisible();
  await page.mouse.move(12,12);await page.mouse.wheel(0,150);await expect(root(page)).toHaveAttribute('data-world-mode','roam');expect(await pose(page)).toEqual(atShelf);
});

test('keyboard object controls appear only on focus and use the same real Mac',async({page})=>{
  await ready(page);const controls=page.locator('.jiangnan-object-controls'),computer=controls.locator('[data-room-object="computer"]');
  expect(await controls.evaluate(el=>getComputedStyle(el).clipPath)).toBe('inset(50%)');await computer.focus();expect(await controls.evaluate(el=>getComputedStyle(el).clipPath)).toBe('none');
  await computer.press('Enter');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(page.locator('[data-space-dock]')).toBeVisible();
});

test.describe('room touch navigation',()=>{test.use({hasTouch:true,isMobile:true});test('a touch floor tap moves through the real room without visible direction buttons',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);await expect(page.locator('.space-world-touch')).toBeHidden();const a=await pose(page);
  // Look down and turn toward the open aisle with actual finger gestures;
  // the close tabletop entry does not pretend a floor point is on screen.
  await dragRoomTouch(page,{x:180,y:290},{x:180,y:425});
  await dragRoomTouch(page,{x:60,y:290},{x:330,y:290});
  const looking=await pose(page);expect(looking.pitch).toBeLessThan(a.pitch-.25);expect(Math.abs(looking.yaw-a.yaw)).toBeGreaterThan(.5);
  expect(Math.hypot(looking.x-a.x,looking.z-a.z)).toBeLessThan(.001);
  const p=await page.evaluate(async()=>{const specifier='three',T=await import(specifier),r=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(r.dataset.worldPose!),c=new T.PerspectiveCamera(p.fov,r.clientWidth/r.clientHeight,.04,160);c.position.set(p.x,p.y,p.z);c.rotation.set(p.pitch,p.yaw,0,'YXZ');c.updateMatrixWorld();const v=new T.Vector3(1,.025,.20).project(c);return{x:(v.x+1)*r.clientWidth/2,y:(1-v.y)*r.clientHeight/2};});
  expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(390);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(844);await page.touchscreen.tap(p.x,p.y);
  const after=await pose(page);expect(Math.hypot(after.x-a.x,after.z-a.z)).toBeGreaterThan(.5);await page.waitForTimeout(150);expect(await pose(page)).toEqual(after);
});});

test('quiet freezes rain, fan and boat while intentional movement still works',async({page})=>withRoomObservationSession(page,async()=>{
  await ready(page);await page.emulateMedia({reducedMotion:'no-preference'});const first=await root(page).getAttribute('data-room-boat-pose');await waitForRoomBoatMove(page,first);
  await menu(page);await page.locator('.space-menu [data-cafe-quiet]').click();await page.locator('.space-menu [data-cafe-visit]').click();await expect(root(page)).toHaveAttribute('data-world-travel','false');const frozen=await root(page).getAttribute('data-room-boat-pose');await page.waitForTimeout(250);expect(await root(page).getAttribute('data-room-boat-pose')).toBe(frozen);
  const a=await pose(page);await page.keyboard.down('KeyW');try{await expect.poll(async()=>{const p=await pose(page);return Math.hypot(p.x-a.x,p.z-a.z);},{timeout:10_000}).toBeGreaterThan(.1);}finally{await page.keyboard.up('KeyW');}
}));

test('keyboard motion pauses for a dialog and a native workspace',async({page})=>{
  await ready(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');const before=await pose(page);await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');expect(await pose(page)).toEqual(before);
  await back(page);await menu(page);await page.locator('.space-menu [data-cafe-picker]').click();const p=await pose(page);await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');expect(await pose(page)).toEqual(p);await page.keyboard.press('Escape');
});

test('scene switches keep one renderer and keep the same notebook',async({page})=>{
  await ready(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));const note=page.locator('[data-note-editor]');await note.fill('The same desk in seven places.');const original=await note.elementHandle();await back(page);
  await menu(page);await page.locator('.space-menu [data-cafe-picker]').click();await page.locator('[data-cafe-theme="zen"]').click();await expect(root(page)).toHaveAttribute('data-cafe-theme','zen',{timeout:30_000});
  await menu(page);await page.locator('.space-menu [data-cafe-picker]').click();await page.locator('[data-cafe-theme="jiangnan"]').click();await expect(root(page)).toHaveAttribute('data-cafe-theme','jiangnan',{timeout:30_000});await expect(page.locator('.space-world')).toHaveCount(1);
  await back(page);await hit(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');expect(await note.evaluate((el,old)=>el===old,original)).toBe(true);await expect(note).toHaveValue('The same desk in seven places.');
});

test('a failed WebGL context restores the ordinary usable workspace',async({page})=>{
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:any[]){return /webgl/.test(type)?null:Reflect.apply(get,this,[type,...args]);} as typeof get;});
  await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-world-failed','true');if(await page.locator('[data-boot-skip]').isVisible())await page.locator('[data-boot-skip]').click();await expect(page.locator('[data-space-dock]')).toBeVisible();await expect(page.locator('.jiangnan-workspace')).toHaveCount(0);
});
