import {test,expect,type Page} from '../helpers/frozen-site';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'&&process.env.SPACE_SOFTWARE_QA!=='1'?['--enable-gpu','--use-angle=metal']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
const failures=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{test.setTimeout(90_000);const errors:string[]=[];failures.set(page,errors);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});});
test.afterEach(async({page})=>expect(failures.get(page)).toEqual([]));
const root=(page:Page)=>page.locator('[data-bear-workspace]');
async function desk(page:Page,lang='zh'){
  await page.goto(lang==='zh'?'/zh/projects/':'/projects/');await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30_000});await expect(root(page)).toHaveAttribute('data-world-ready','true',{timeout:30_000});
  await page.keyboard.press('Control+k');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await page.locator('[data-space-search-close]').click();
  if(page.viewportSize()!.width<=640)await page.locator('.jiangnan-computer-expand').click();
}
async function home(page:Page){await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'welcome',payload:''}));}

test('the first desktop is a familiar Finder with a complete menu and labelled Dock',async({page})=>{
  await page.setViewportSize({width:1440,height:960});await desk(page);
  await expect(page.locator('[data-mac-menubar]')).toBeVisible();await expect(page.locator('[data-finder-home]')).toBeVisible();
  expect(await page.locator('.space-finder-home__files').evaluate(el=>getComputedStyle(el).display)).toBe('grid');
  await expect(page.locator('[data-enter-space],[data-space-entry-art]')).toHaveCount(0);
  await expect(page.locator('.space-finder-home__overview .space-finder-home__item')).toHaveCount(6);
  for(const app of ['products','reader','photos','books','notes'])await expect(page.locator(`.space-finder-home__overview .space-finder-home__item[data-open="${app}"]`)).toBeVisible();
  await page.screenshot({path:`.netlify/classic-mac-${test.info().project.name}.png`});
});

test('Edit belongs to the current app and never copies or selects a hidden notebook',async({page})=>{
  await page.setViewportSize({width:1440,height:960});await desk(page);await page.evaluate(()=>{(window as any).copied=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copied.push(text);}}});(window as any).BearSpace.execute('open',{app:'notes'});});
  const note=page.locator('[data-note-editor]');await note.fill('private note belonging to Notes');await note.evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(0,7));
  await page.locator('[data-mac-menu="edit"]').click();await expect(page.locator('[data-mac-edit="copy"]')).toBeEnabled();await page.locator('[data-mac-edit="copy"]').click();expect(await page.evaluate(()=>(window as any).copied)).toEqual(['private']);
  await expect(note).toBeFocused();await page.keyboard.press('ArrowRight');await page.keyboard.type('XYZ');await expect(note).toHaveValue('privateXYZ note belonging to Notes');await note.evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(0,7));
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'map'}));await page.locator('[data-mac-menu="edit"]').click();await expect(page.locator('[data-mac-edit="copy"]')).toBeDisabled();await page.locator('[data-mac-edit="all"]').click();
  expect(await page.evaluate(()=>(window as any).copied)).toEqual(['private']);expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().active)).toBe('map');expect(await note.evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd])).toEqual([0,7]);
  // Start the minimized-editor check without the legitimate visible Map text
  // selected by Select All in the preceding check.
  await page.evaluate(()=>{window.getSelection()?.removeAllRanges();(window as any).BearSpace.execute('open',{app:'notes'});});await page.locator('[data-space-window="notes"] [data-window-action="minimize"]').click();await page.locator('[data-mac-menu="edit"]').click();await expect(page.locator('[data-mac-edit="copy"]')).toBeDisabled();await page.keyboard.press('Escape');
});

test('classic menus support keyboard, appearance and exact app actions',async({page})=>{
  await desk(page);const file=page.locator('[data-mac-menu="file"]');await file.focus();await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-mac-panel="file"]')).toBeVisible();await expect(page.locator('[data-mac-panel="file"] button').first()).toBeFocused();
  const next=page.viewportSize()!.width<=640?'view':'edit';await page.keyboard.press('ArrowRight');await expect(page.locator(`[data-mac-panel="${next}"]`)).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator(`[data-mac-menu="${next}"]`)).toBeFocused();
  await page.locator('[data-mac-menu="view"]').click();await page.locator('[data-mac-theme="dark"]').click();await expect(root(page)).toHaveAttribute('data-theme','dark');
  await file.click();await page.locator('[data-mac-panel="file"] [data-open="notes"]').click();await expect(page.locator('[data-note-editor]')).toBeVisible();
});

test('the complete physical screen, native expansion and view menus preserve the same note and selection',async({page})=>{
  await page.setViewportSize({width:1440,height:960});await desk(page);await expect(root(page)).toHaveAttribute('data-computer-view','framed');await expect(root(page)).toHaveAttribute('data-computer-depth-blur','true');
  const bounds=JSON.parse((await root(page).getAttribute('data-computer-screen-bounds'))!);
  expect(bounds.x-bounds.width*.07).toBeGreaterThan(0);expect(bounds.x+bounds.width*1.07).toBeLessThan(1440);expect(bounds.y-bounds.height*.10).toBeGreaterThan(0);expect(bounds.y+bounds.height*1.28).toBeLessThan(960);
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));const note=page.locator('[data-note-editor]'),original=await note.elementHandle();await note.fill('The same notebook inside the whole Mac.');await note.evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(2,11,'backward'));
  for(const view of ['expanded','framed']){await page.locator('[data-mac-menu="view"]').click();await page.locator(`[data-mac-panel="view"] [data-computer-display="${view}"]`).click();await expect(root(page)).toHaveAttribute('data-computer-view',view);expect(await note.evaluate((el,old)=>el===old,original)).toBe(true);await expect(note).toHaveValue('The same notebook inside the whole Mac.');expect(await note.evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual([2,11,'backward']);}
  expect(await note.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
});

test('Finder folders open the real product directory, writing, photos and original profile',async({page})=>{
  await desk(page);await page.locator('.space-finder-home__item[data-open="products"]').click();await expect(page.locator('[data-product-home] [data-select-product]')).toHaveCount(8);
  await page.locator('[data-product-home] [data-select-product="leafhour"]').click();await expect(page.locator('.space-product h2')).toHaveText('Leafhour');await page.locator('[data-product-back]').click();await expect(page.locator('[data-product-home]')).toBeVisible();
  await home(page);await page.locator('.space-finder-home__overview .space-finder-home__item[data-open="reader"]').click();await expect(page.locator('[data-library-query]')).toBeVisible();
  await home(page);await page.locator('.space-finder-home__overview .space-finder-home__item[data-open="photos"]').click();await expect(page.locator('.sp-photo-grid')).toBeVisible();
  await home(page);await page.locator('.space-finder-home__overview .space-finder-home__item[data-payload="identity"]').click();await expect(page.locator('[data-space-profile]')).toHaveAttribute('open');await page.locator('[data-finder-return]').click();await expect(page.locator('[data-finder-home]')).toHaveAttribute('data-finder-view','home');
});

test('a framed computer keeps the real rainy scenery moving and quiet mode pauses it',async({page})=>{
  await page.setViewportSize({width:1440,height:960});await desk(page);await page.emulateMedia({reducedMotion:'no-preference'});const before=await root(page).getAttribute('data-room-boat-pose');await expect.poll(()=>root(page).getAttribute('data-room-boat-pose')).not.toBe(before);
  await page.emulateMedia({reducedMotion:'reduce'});const frozen=await root(page).getAttribute('data-room-boat-pose');await page.waitForTimeout(180);expect(await root(page).getAttribute('data-room-boat-pose')).toBe(frozen);
});

test('graphics recovery and an ordinary scene change release framed dialog coordinates',async({page})=>{
  await page.setViewportSize({width:1440,height:960});await desk(page);
  await page.locator('.space-world__canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(root(page)).toHaveAttribute('data-world-failed','true');await page.keyboard.press('Control+k');const box=(await page.locator('[data-space-search]').boundingBox())!;expect(box.width).toBeGreaterThan(600);expect(box.x).toBeGreaterThan(100);await page.locator('[data-space-search-close]').click();
  await desk(page);await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-picker]').click();await page.locator('[data-cafe-theme="zen"]').click();await expect(root(page)).toHaveAttribute('data-cafe-theme','zen',{timeout:30_000});await page.keyboard.press('Control+k');const legacy=(await page.locator('[data-space-search]').boundingBox())!;expect(legacy.width).toBeGreaterThan(600);expect(legacy.x).toBeGreaterThan(100);
});
