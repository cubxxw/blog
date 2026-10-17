import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

async function openApp(page:Page,app:string) {
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else {
    await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();
    await page.locator(`[data-launchpad-app="${app}"]`).click();
  }
  const win=page.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
}
async function touchTarget(button:Locator) {
  const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await button.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
}

for(const locale of ['zh','en'])test(`short-screen window close and compact café navigation have separate real hit targets in ${locale}`,async({page})=>{
  await page.setViewportSize({width:568,height:320});await page.goto(locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);
  const notes=await openApp(page,'notes');await notes.locator('[data-note-editor]').fill('关闭窗口之后仍保留的笔记');
  const close=notes.locator('[data-window-action="close"]');await touchTarget(close);await close.click();
  await expect(notes).toHaveCount(0);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','desktop');
  await openApp(page,'notes');const editor=notes.locator('[data-note-editor]'),original=await editor.elementHandle();
  await expect(editor).toHaveValue('关闭窗口之后仍保留的笔记');
  const hud=page.locator('.space-world-hud__workspace'),back=hud.getByRole('button',{name:locale==='zh'?'回到咖啡馆':'Back to the café',exact:true}),picker=hud.getByRole('button',{name:locale==='zh'?'换个风景':'Change the view',exact:true});
  for(const button of [back,picker]) {
    await touchTarget(button);await expect(button).toHaveAttribute('title',await button.getAttribute('aria-label')||'');
    await expect(button.locator('.space-world-hud__label')).toBeHidden();await expect(button.locator('svg')).toBeVisible();
  }
  await picker.click();await expect(page.locator('[data-cafe-dialog]')).toBeVisible();await page.keyboard.press('Escape');await expect(picker).toBeFocused();
  await back.click();await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','cafe');
  await enterWorkspace(page);await openApp(page,'notes');expect(await editor.evaluate((el,previous)=>el===previous,original)).toBe(true);
});

test('all map controls remain 44px and clickable in the 600–640px boundary',async({page})=>{
  await page.setViewportSize({width:620,height:844});await page.goto('/zh/projects/');await enterWorkspace(page);
  const map=await openApp(page,'map');
  for(const button of await map.locator('.sp-map-controls button').all()) {
    await button.scrollIntoViewIfNeeded();await touchTarget(button);await button.click();
  }
  expect(await map.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await expect(page.locator('.space-world-hud__workspace .space-world-hud__label').first()).toBeVisible();
});

test.describe('coarse landscape pointer',()=>{
  test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  test('window chrome and every map control provide an actual 44px touch target',async({page})=>{
    await page.goto('/zh/projects/');await enterWorkspace(page);expect(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)).toBe(true);
    const notes=await openApp(page,'notes');
    for(const control of await notes.locator('[data-window-action]').all())await touchTarget(control);
    const map=await openApp(page,'map');
    for(const button of await map.locator('.sp-map-controls button').all()) {
      await button.scrollIntoViewIfNeeded();await touchTarget(button);await button.click();
    }
    expect(await map.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  });
});
