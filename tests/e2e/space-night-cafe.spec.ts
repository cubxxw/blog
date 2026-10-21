import {test,expect,type Page} from '../helpers/frozen-site';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(async({page})=>{
  test.setTimeout(90_000);
  await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});
});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
async function openRoom(page:Page){await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-world-renderer','cinematic');await expect(root(page)).toHaveAttribute('data-boot-state','complete');await page.screenshot({path:`.netlify/space-night-${test.info().project.name}.png`});}
async function returnToRoom(page:Page){await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();}

test('the room has no external action strip; scene and music controls remain reachable',async({page})=>{
  for(const {width,height,lang} of [
    {width:320,height:844,lang:'zh'},{width:390,height:844,lang:'zh'},
    {width:320,height:844,lang:'en'},{width:390,height:844,lang:'en'},
    {width:568,height:320,lang:'zh'},{width:568,height:320,lang:'en'}
  ]){
    await page.setViewportSize({width,height});await page.goto(lang==='zh'?'/zh/projects/':'/projects/');
    await expect(root(page)).toHaveAttribute('data-boot-state','complete');
    await expect(page.locator('.space-world-hud__roam')).toBeHidden();
    for(const control of await page.locator('.space-cafe__place,.rain-room__credits summary').all()){
      const box=(await control.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);
      expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    }
    await page.locator('.rain-room__credits summary').click();await expect(page.locator('.rain-room__credits')).toHaveAttribute('open','');
  }
});

test('the monitor contains the actual workspace home before it is expanded; the same live nodes return into its screen',async({page})=>{
  await openRoom(page);const plane=page.locator('.rain-room__workspace'),screen=page.locator('[data-room-computer]');
  await expect(plane.locator('[data-space-window="welcome"]')).toBeVisible();
  await expect(plane.locator('[data-space-profile]')).not.toHaveAttribute('open','');
  expect(await plane.evaluate(el=>(el as HTMLElement).inert)).toBe(true);
  const small=(await plane.boundingBox())!,target=(await screen.boundingBox())!;
  for(const edge of ['x','y','width','height'] as const)expect(Math.abs(small[edge]-target[edge])).toBeLessThan(3);
  const home=await plane.locator('[data-space-window="welcome"]').elementHandle();
  await screen.click();await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  expect((await plane.boundingBox())!.width).toBeGreaterThan(small.width*2);
  expect(await plane.locator('[data-space-window="welcome"]').evaluate((el,old)=>el===old,home)).toBe(true);
  await returnToRoom(page);await expect(root(page)).toHaveAttribute('data-world-mode','roam');
  expect(await plane.locator('[data-space-window="welcome"]').evaluate((el,old)=>el===old,home)).toBe(true);
  const returned=(await plane.boundingBox())!;expect(Math.abs(returned.width-small.width)).toBeLessThan(3);
});

test('a fresh visit puts the home page on the monitor without discarding the saved notebook',async({page})=>{
  await openRoom(page);await page.locator('[data-room-computer]').click();
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));await page.locator('[data-note-editor]').fill('Kept when the Mac opens its home page.');
  await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-boot-state','complete');
  expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().active)).toBe('welcome');
  await page.locator('[data-room-computer]').click();await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  await expect(page.locator('[data-note-editor]')).toHaveValue('Kept when the Mac opens its home page.');
  await returnToRoom(page);await page.reload();await expect(root(page)).toHaveAttribute('data-boot-state','complete');
  expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().active)).toBe('welcome');
  await page.locator('[data-room-computer]').click();await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  await expect(page.locator('[data-note-editor]')).toHaveValue('Kept when the Mac opens its home page.');
});

test('the boat travels gently along the river and stays still in quiet mode',async({page})=>{
  await openRoom(page);await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(root(page)).toHaveAttribute('data-room-boat','ready');
  const before=await root(page).getAttribute('data-room-boat-pose');await page.waitForTimeout(750);
  expect(await root(page).getAttribute('data-room-boat-pose')).not.toBe(before);
  await page.locator('[data-cafe-quiet]').click();const paused=await root(page).getAttribute('data-room-boat-pose');
  await page.waitForTimeout(220);expect(await root(page).getAttribute('data-room-boat-pose')).toBe(paused);
});

test('switching to reduced motion during the screen zoom immediately settles the real desktop',async({page})=>{
  await openRoom(page);await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-room-computer]').click();await expect(root(page)).toHaveAttribute('data-world-travel','true');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(root(page)).toHaveAttribute('data-world-travel','false');
  expect((await page.locator('.rain-room__workspace').boundingBox())!.width).toBeCloseTo((await root(page).boundingBox())!.width,0);
});

test('closing search during the zoom returns keyboard focus to the reachable OS menu',async({page})=>{
  await openRoom(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-room-computer]').focus();
  await page.keyboard.press('Control+k');await expect(page.locator('[data-space-search]')).toBeVisible();
  await page.keyboard.press('Escape');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-menu-trigger]')).toBeFocused();
});

test('a repeated search shortcut during zoom retains the latest focus handoff',async({page})=>{
  await openRoom(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-room-computer]').focus();
  await page.keyboard.press('Control+k');await page.waitForTimeout(100);await page.keyboard.press('Control+k');await page.waitForTimeout(100);
  await page.keyboard.press('Escape');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-menu-trigger]')).toBeFocused();
});

test('reversing a screen zoom starts from the current visible plane instead of jumping between endpoints',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openRoom(page);await page.emulateMedia({reducedMotion:'no-preference'});
  const plane=page.locator('.rain-room__workspace');await page.locator('[data-room-computer]').click();await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await returnToRoom(page);await page.waitForTimeout(120);
  // Send the observed pointer hit directly: locator.click's automatic scrolling
  // can intentionally settle the ongoing room motion before this comparison.
  const hit=(await page.locator('[data-room-computer]').boundingBox())!,leaving=(await plane.boundingBox())!;
  await page.mouse.click(hit.x+hit.width/2,hit.y+hit.height/2);const returning=(await plane.boundingBox())!;
  expect(Math.abs(returning.width-leaving.width)).toBeLessThan(45);
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
});

test('quiet, pan and resize settle the room camera and its live screen together during a close-up',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openRoom(page);await page.emulateMedia({reducedMotion:'no-preference'});
  for(const interruption of ['quiet','pan','resize']){
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await page.locator('[data-cafe-outside]').click();
    await page.waitForTimeout(80);
    if(interruption==='quiet')await page.locator('[data-cafe-quiet]').click();
    else if(interruption==='pan'){await page.locator('[data-rain-viewport]').evaluate(el=>{el.scrollLeft+=30;});await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
    else{await page.setViewportSize({width:430,height:880});await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
    const screen=(await page.locator('[data-room-computer]').boundingBox())!,plane=(await page.locator('.rain-room__workspace').boundingBox())!;
    for(const edge of ['x','y','width','height'] as const)expect(Math.abs(screen[edge]-plane[edge])).toBeLessThan(3);
    if(interruption==='quiet')await page.locator('[data-cafe-quiet]').click();
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await page.locator('[data-cafe-start]').click();
  }
});

test('the actual tablet photograph opens its matching photo and returns to the same room',async({page})=>{
  await openRoom(page);const photo=page.locator('[data-room-photo]'),id=await photo.getAttribute('data-photo-id');
  expect(id).toBeTruthy();await expect(photo.locator('img')).toBeVisible();await photo.click();
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('.space-world-hud__roam')).toBeHidden();
  await expect(page.locator('.sp-photo-detail')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().windows.find((w:any)=>w.app==='photos')?.payload)).toBe(id);
  const before=await page.locator('.sp-photo-detail img').getAttribute('data-media-src');
  await page.locator('[data-photo-next]').click();expect(await page.locator('.sp-photo-detail img').getAttribute('data-media-src')).not.toBe(before);
  await returnToRoom(page);
  await expect(root(page)).toHaveAttribute('data-cafe-mode','cafe');await expect(photo).toBeVisible();
});

test('the Mac opens the real desktop and visiting the room keeps the same note editor',async({page})=>{
  await openRoom(page);await page.locator('[data-room-computer]').click();
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  const note=page.locator('[data-note-editor]');await note.fill('A note kept beside the night window.');await note.evaluate(el=>(el as HTMLElement).dataset.roomTest='same');
  await returnToRoom(page);await page.locator('[data-room-computer]').click();
  await expect(note).toHaveAttribute('data-room-test','same');await expect(note).toHaveValue('A note kept beside the night window.');
});

test('quiet and reduced motion stop weather and fan drawing; audio starts only from its button',async({page})=>{
  await openRoom(page);expect(await page.locator('.rain-room audio').evaluateAll(nodes=>nodes.every(a=>(a as HTMLAudioElement).paused))).toBe(true);
  await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>root(page).getAttribute('data-world-frames')).not.toBe('1');
  await page.locator('[data-cafe-quiet]').click();const before=await root(page).getAttribute('data-world-frames');await page.waitForTimeout(220);expect(await root(page).getAttribute('data-world-frames')).toBe(before);
  await page.locator('[data-room-sound]').click();await expect(page.locator('[data-room-sound]')).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.rain-room audio').evaluateAll(nodes=>nodes.every(a=>!(a as HTMLAudioElement).paused))).toBe(true);
  await page.locator('[data-room-sound]').click();expect(await page.locator('.rain-room audio').evaluateAll(nodes=>nodes.every(a=>(a as HTMLAudioElement).paused))).toBe(true);
});

test('switching between the night room and a spatial scene keeps one renderer and live photo controls',async({page})=>{
  await openRoom(page);
  await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await expect(page.locator('button[data-cafe-theme]')).toHaveCount(7);
  await page.locator('button[data-cafe-theme="coast"]').click();await expect(root(page)).toHaveAttribute('data-cafe-theme','coast',{timeout:30_000});
  await expect(page.locator('.space-world')).toHaveCount(1);await expect(page.locator('.rain-room')).toHaveCount(0);
  await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await page.locator('button[data-cafe-theme="jiangnan"]').click();
  await expect(root(page)).toHaveAttribute('data-world-renderer','cinematic');await expect(page.locator('.space-world')).toHaveCount(1);await expect(page.locator('[data-room-sound]')).toHaveCount(1);
  await page.locator('[data-room-photo]').click();await expect(page.locator('.sp-photo-detail')).toBeVisible();
});

test('a missing canvas context falls back to the usable desktop instead of keeping the loading screen',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:any[]){return type==='2d'?null:original.call(this,type as any,...args);} as typeof original;});
  await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-world-failed','true');
  if(await page.locator('[data-boot-skip]').isVisible())await page.locator('[data-boot-skip]').click();
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(page.locator('[data-space-dock]')).toBeVisible();
  await expect(page.locator('.rain-room__workspace')).toHaveCount(0);
});

test('a renderer that never resolves startup is covered by the first-frame deadline',async({page})=>{
  await page.clock.install();
  await page.route('**/cafe-scene.*.js',route=>route.fulfill({contentType:'application/javascript',body:'export function createCafeWorld(){return {firstFrame:new Promise(()=>{}),start:()=>new Promise(()=>{}),focus:()=>new Promise(()=>{}),setQuiet(){},dispose(){}}}'}));
  await page.goto('/zh/projects/');await expect(root(page)).toHaveAttribute('data-world-loading','true');
  await page.clock.fastForward(31_000);await expect(root(page)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator('[data-boot-skip]')).toBeEnabled();
});

test('spatial close-ups still hand focus to their exit and back to the original control',async({page})=>{
  await openRoom(page);await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await page.locator('button[data-cafe-theme="zen"]').click();
  await expect(root(page)).toHaveAttribute('data-cafe-theme','zen',{timeout:30_000});
  const coffee=page.locator('[data-cafe-inspect="coffee"]');await coffee.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-cafe-inspect-exit]')).toBeFocused();await page.keyboard.press('Enter');await expect(coffee).toBeFocused();
});
