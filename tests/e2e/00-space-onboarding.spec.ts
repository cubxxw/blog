import {test,expect} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';
import {clickStaticRoomControl} from '../helpers/static-room-control';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({channel:'chromium',launchOptions:{args:process.env.SPACE_SOFTWARE_QA==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(({page})=>reserveWorldJourney(page));
const root='[data-bear-workspace]';
const room=async(page:import('@playwright/test').Page)=>{
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-rendered-mode','roam');
};

for(const language of ['zh','en'])test(`the default personal room boots visibly in ${language}`,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('space:cafe:theme:v2','jiangnan'));
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-jiangnan.*.js',async route=>{await gate;await route.continue();});
  const evidence=process.env.SPACE_BOOT_EVIDENCE_DIR;
  await page.goto(language==='zh'?'/zh/projects/':'/projects/');
  try{
    await expect(page.locator('.space-boot__body')).toBeVisible();
    const panel=(await page.locator('[data-space-boot]').boundingBox())!,body=(await page.locator('.space-boot__body').boundingBox())!;
    expect(Math.abs(body.x+body.width/2-panel.x-panel.width/2)).toBeLessThan(1);
    expect(Math.abs(body.y+body.height/2-panel.y-panel.height/2)).toBeLessThan(1);
    await expect(page.locator('[data-boot-skip]')).toBeHidden();
    expect(await page.locator('[data-space-boot]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    if(evidence){await fs.mkdir(evidence,{recursive:true});await page.screenshot({path:path.join(evidence,`${test.info().project.name}-${language}-terminal.png`)});}
  }finally{release();}
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-renderer','jiangnan');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  if(evidence)await page.screenshot({path:path.join(evidence,`${test.info().project.name}-${language}-room.png`)});
  expect(errors).toEqual([]);
});

test('the centered loader stays visible until a real scene frame',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-cafe.*.js',async route=>{await gate;await route.continue();});
  await page.goto('/zh/projects/');
  try {
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await expect(page.locator('[data-boot-skip]')).toBeHidden();
    await expect(page.locator('[data-boot-step]').first()).toHaveAttribute('data-state','current');
    await expect(page.locator(root)).not.toHaveAttribute('data-world-ready','true');
    expect(await page.locator('[data-space-boot]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }finally{release();}
  await room(page);await expect(page.locator(root)).toHaveAttribute('data-world-ready','true');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator('[data-cafe-read]')).toBeVisible();
});

test('changing renderer keeps the terminal visible until the replacement room paints',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await room(page);
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-jiangnan.*.js',async route=>{await gate;await route.continue();});
  await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
  await page.locator('button[data-cafe-theme="jiangnan"]').click();
  try{
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await expect(page.locator('[data-boot-skip]')).toBeHidden();
    await expect(page.locator('[data-boot-step]').first()).toHaveAttribute('data-state','current');
  }finally{release();}
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-renderer','jiangnan');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator('.space-world__canvas')).toBeFocused();
});

test('a stalled replacement renderer times out to a usable workspace',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await room(page);
  await page.clock.install();
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-jiangnan.*.js',async route=>{await gate;await route.continue();});
  try{
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await page.locator('button[data-cafe-theme="jiangnan"]').click();
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await page.clock.fastForward(30005);
    await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
    await expect(page.locator('[data-boot-skip]')).toBeVisible();
    await page.locator('[data-boot-skip]').click();
    await expect(page.locator('[data-space-boot]')).toBeHidden();
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
    await expect(page.locator('.space-world__canvas')).toHaveCount(0);
  }finally{release();await page.clock.resume();}
});

test('opening a seat or terrace from the workspace preserves notes and allows returning',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await enterWorkspace(page);
  await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(n:string,a:object)=>void}}).BearSpace.execute('open',{app:'notes'}));
  await page.locator('[data-note-editor]').fill('The same private draft.');
  await page.locator('[data-note-editor]').evaluate(el=>(el as HTMLElement).dataset.instance='resident');
  for(const place of ['outside','start']){
    await page.locator('.space-world-hud__workspace [data-cafe-picker]').click();
    await page.locator(`[data-cafe-${place}]`).click();await room(page);
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','cafe');
    await page.locator('[data-cafe-enter]').click();
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
    await expect(page.locator(root)).toHaveAttribute('data-world-mode','workspace');
    await expect(page.locator('[data-note-editor]')).toHaveAttribute('data-instance','resident');
    await expect(page.locator('[data-note-editor]')).toHaveValue('The same private draft.');
  }
});

test('a cancelled read transition cannot steal a replayed café visit',async({page})=>{
  await page.clock.install({time:new Date('2026-10-17T00:00:00Z')});
  try{
    await page.goto('/zh/projects/');await room(page);
    await page.clock.pauseAt(new Date('2026-10-17T01:00:00Z'));
    await clickStaticRoomControl(page,'[data-cafe-read]');
    await expect(page.locator(root)).toHaveAttribute('data-world-travel','true');
    await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-picker]');
    await clickStaticRoomControl(page,'[data-cafe-replay]');
    // A replay uses the already rendered room and must not add a boot delay.
    await page.clock.fastForward(2000);
    await expect(page.locator(root)).toHaveAttribute('data-boot-state','revealing');
    await page.clock.runFor(160);await room(page);
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','cafe');
    const snapshot=await page.evaluate(()=>(window as unknown as {BearSpace:{snapshot:()=>{active:string;windows:{id:string}[]}}}).BearSpace.snapshot());
    expect(snapshot.active).not.toBe('reader');
    await expect(page.locator('[data-space-window="reader"]')).toHaveCount(0);
    await clickStaticRoomControl(page,'[data-cafe-enter]');await page.clock.fastForward(2000);await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  }finally{await page.clock.resume();}
});

test('a completed onboarding recovers immediately after graphics context loss',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await room(page);
  await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('.space-world')).toHaveCount(0);
  await expect(page.locator('[data-space-toast]')).toBeVisible();
  await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(n:string,a:object)=>void}}).BearSpace.execute('open',{app:'notes'}));
  await page.locator('[data-note-editor]').fill('Still usable after losing the GPU.');
});

test('module failure offers an ordinary workspace from the centered loader',async({page})=>{
  await page.route('**/world-cafe.*.js',route=>route.abort());
  await page.goto('/zh/projects/');await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator('[data-boot-status]')).toContainText('打开工作区');
  await page.locator('[data-boot-skip]').click();await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-menu-trigger]')).toBeVisible();
});

test('a failed deep link restores focus to its document after explicit recovery',async({page})=>{
  await page.route('**/world-cafe.*.js',route=>route.abort());
  await page.goto('/zh/projects/#identity');
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await page.locator('[data-boot-skip]').click();
  await expect(page.locator('[data-space-window="welcome"]')).toBeVisible();
  await expect(page.locator('[data-space-window="welcome"]')).toBeFocused();
});

test('the optional resident can fail without blocking the room or workspace',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/models/space/cat.glb',route=>route.abort());
  await page.goto('/zh/projects/');await room(page);await expect(page.locator(root)).toHaveAttribute('data-cat-loaded','false');
  await page.locator('[data-cafe-read]').click();await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-window="reader"]')).toBeVisible();
});

test('a graphics failure during the reveal cannot leave an invisible modal behind',async({page})=>{
  await page.clock.install({time:new Date('2026-10-17T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-17T01:00:00Z'));
  try{
    await page.goto('/zh/projects/');
    await expect(page.locator(root)).toHaveAttribute('data-boot-stage','2',{timeout:30000});
    // The router now loads the spatial engine lazily after this stage.
    // Wait for its actual canvas before advancing the paused animation clock.
    await expect(page.locator('.space-world__canvas')).toBeAttached();
    await page.clock.runFor(16);await expect(page.locator(root)).toHaveAttribute('data-boot-stage','3');
    // Hold the actual short reveal window immediately after the ready frame.
    await expect(page.locator(root)).toHaveAttribute('data-boot-state','revealing');
    await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
    await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
    await expect(page.locator('[data-space-boot]')).toBeHidden();
    await page.keyboard.press('Control+k');await expect(page.locator('[data-space-search]')).toBeVisible();
  }finally{await page.clock.resume();}
});

test('graphics recovery preserves the original editor, focus and selection',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await enterWorkspace(page);
  await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(n:string,a:object)=>void}}).BearSpace.execute('open',{app:'notes'}));
  const editor=page.locator('[data-note-editor]');await editor.click();await page.keyboard.type('A quiet draft.');
  await expect(editor).toBeFocused();
  await editor.evaluate(el=>{(el as HTMLTextAreaElement).setSelectionRange(2,7);(el as HTMLElement).dataset.instance='same';});
  await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(editor).toBeFocused();await expect(editor).toHaveAttribute('data-instance','same');
  expect(await editor.evaluate(el=>[(el as HTMLTextAreaElement).selectionStart,(el as HTMLTextAreaElement).selectionEnd])).toEqual([2,7]);
  await page.keyboard.type('calm');await expect(editor).toHaveValue('A calm draft.');
});

test('returning from a hidden Product Lab waits for readiness and restores keyboard entry',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/#product-lab');
  await expect(page.locator(root)).toHaveAttribute('data-ready','true');
  await expect(page.locator(root)).toBeHidden();
  await page.setViewportSize({width:568,height:320});
  await page.locator('.product-view-switch [data-product-view-button="bear"]').click();
  await expect(page.locator(root)).toHaveAttribute('data-world-rendered-mode','workspace');
  await expect(page.locator('[data-space-menu-trigger]')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('.space-menu')).toBeVisible();
});
