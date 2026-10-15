import {test,expect} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';

test.use({channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root='[data-bear-workspace]';
const room=async(page:import('@playwright/test').Page)=>{
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-rendered-mode','roam');
};

test('the terminal stays visible until a real scene frame, with a direct writing escape',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-cafe.*.js',async route=>{await gate;await route.continue();});
  await page.goto('/zh/projects/');
  try {
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await expect(page.locator('[data-boot-skip]')).toBeDisabled();
    await expect(page.locator('[data-space-boot] a').last()).toHaveAttribute('href','/zh/articles/');
    await expect(page.locator(root)).not.toHaveAttribute('data-world-ready','true');
    expect(await page.locator('[data-space-boot]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }finally{release();}
  await room(page);await expect(page.locator(root)).toHaveAttribute('data-world-ready','true');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator('[data-cafe-read]')).toBeVisible();
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
  await page.goto('/zh/projects/');await room(page);
  await page.locator('[data-cafe-read]').click();
  await expect(page.locator(root)).toHaveAttribute('data-world-travel','true');
  await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
  await page.locator('[data-cafe-replay]').click();await room(page);
  await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','cafe');
  const snapshot=await page.evaluate(()=>(window as unknown as {BearSpace:{snapshot:()=>{active:string;windows:{id:string}[]}}}).BearSpace.snapshot());
  expect(snapshot.active).not.toBe('reader');
  await expect(page.locator('[data-space-window="reader"]')).toHaveCount(0);
  await page.locator('[data-cafe-enter]').click();await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
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

test('module failure offers an ordinary workspace and reading link',async({page})=>{
  await page.route('**/world-cafe.*.js',route=>route.abort());
  await page.goto('/zh/projects/');await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator('[data-boot-status]')).toContainText('仍可阅读');
  await page.locator('[data-boot-skip]').click();await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-menu-trigger]')).toBeVisible();
});

test('the optional resident can fail without blocking the room or workspace',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/models/space/cat.glb',route=>route.abort());
  await page.goto('/zh/projects/');await room(page);await expect(page.locator(root)).toHaveAttribute('data-cat-loaded','false');
  await page.locator('[data-cafe-read]').click();await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-window="reader"]')).toBeVisible();
});

test('the resident wanders but pauses in quiet mode, dialogs, reduced motion and the workspace',async({page})=>{
  test.setTimeout(45000);await page.goto('/zh/projects/');await room(page);
  await expect(page.locator(root)).toHaveAttribute('data-cat-loaded','true');
  const pose=()=>page.locator(root).getAttribute('data-cat-pose');const initial=await pose();
  await expect.poll(pose,{timeout:12000}).not.toBe(initial);
  await page.locator('[data-cafe-quiet]').click();await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');
  const quiet=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(quiet);
  const frames=await page.locator(root).getAttribute('data-world-frames');await page.waitForTimeout(200);expect(await page.locator(root).getAttribute('data-world-frames')).toBe(frames);
  await page.locator('[data-cafe-quiet]').click();
  await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
  await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');const modal=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(modal);
  await page.locator('[data-cafe-picker-close]').click();
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');
  const reduced=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(reduced);
  await page.locator('[data-cafe-enter]').click();await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  const desk=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(desk);
});

test('a graphics failure during the reveal cannot leave an invisible modal behind',async({page})=>{
  await page.goto('/zh/projects/');
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','revealing');
  await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await page.keyboard.press('Control+k');await expect(page.locator('[data-space-search]')).toBeVisible();
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
