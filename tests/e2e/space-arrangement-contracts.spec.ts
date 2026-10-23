import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';

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
async function rectangles(page:Page) {
  return page.evaluate(()=>Object.fromEntries((window as any).BearSpace.snapshot().windows.map((win:any)=>[win.id,win.rect])));
}
async function hit(control:Locator,minimum=44) {
  const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(minimum);expect(box.height).toBeGreaterThanOrEqual(minimum);
  expect(await control.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  return box;
}
async function setup(page:Page,count:number,locale='zh') {
  await reserveWorldJourney(page);
  await page.goto(locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);
  await expect(page.locator('[data-space-window="welcome"]')).toHaveCount(1);
  const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');await editor.fill('这份笔记和窗口一起保留。');
  const original=await editor.elementHandle();
  if(count>=3)await openApp(page,'map');if(count===4)await openApp(page,'terminal');
  await expect(page.locator('[data-space-window]')).toHaveCount(count);
  return {editor,original};
}

test.describe('limited landscape workspace',()=>{
  test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  for(const count of [3,4])for(const locale of ['zh','en'])test(`${locale} ${count} windows use overview without rewriting their documents or geometry`,async({page})=>{
    const {editor,original}=await setup(page,count,locale),before=await rectangles(page);
    expect(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)).toBe(true);
    const active=page.locator('[data-space-window][data-active="true"]'),arrange=active.locator('[data-window-action="arrange"]');
    await expect(arrange).toHaveAttribute('aria-label',locale==='zh'?'窗口概览':'Window overview');
    await expect(arrange).toHaveAttribute('title',locale==='zh'?'窗口概览':'Window overview');await expect(arrange).toHaveAttribute('aria-haspopup','dialog');
    const box=await hit(arrange);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    const overview=page.locator('[data-space-overview]');await expect(overview).toBeVisible();expect(await rectangles(page)).toEqual(before);
    await page.keyboard.press('Escape');await expect(arrange).toBeFocused();
    await arrange.click();const items=overview.locator('[data-overview-id]');await expect(items).toHaveCount(count);
    for(const item of await items.all()) {await item.scrollIntoViewIfNeeded();await hit(item);}
    // The fourth item scrolls inside the list; it must not carry the real
    // return control offscreen. Click coordinates without auto-scrolling it.
    const back=overview.locator('[data-space-overview-close]'),backBox=await hit(back),overviewBox=(await overview.boundingBox())!;
    expect(backBox.y).toBeGreaterThanOrEqual(overviewBox.y);expect(backBox.y+backBox.height).toBeLessThanOrEqual(overviewBox.y+overviewBox.height);
    if(count===4)expect(await overview.locator('[data-space-overview-list]').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    await page.mouse.click(backBox.x+backBox.width/2,backBox.y+backBox.height/2);await expect(overview).toBeHidden();await expect(arrange).toBeFocused();
    await arrange.click();
    await overview.locator('[data-overview-id="notes"]').click();await expect(overview).toBeHidden();
    expect(await rectangles(page)).toEqual(before);expect(await editor.evaluate((el,previous)=>el===previous,original)).toBe(true);
    await expect(editor).toHaveValue('这份笔记和窗口一起保留。');await editor.press('End');await editor.pressSequentially('继续写。');
    await expect(editor).toHaveValue('这份笔记和窗口一起保留。继续写。');
    await page.locator('[data-space-menu-trigger]').click();
    const overviewMenu=page.locator('.space-menu [data-space-overview-trigger]');await expect(overviewMenu).toBeVisible();
    await expect(page.locator('.space-menu [data-space-arrange]')).toBeHidden();
    await overviewMenu.focus();await page.keyboard.press('ArrowDown');await expect(page.locator('.space-menu [data-space-show-desktop]')).toBeFocused();
    await page.keyboard.press('Escape');
    if(count===4) {
      const terminal=await openApp(page,'terminal');await terminal.locator('[data-terminal-input]').fill('arrange');await terminal.locator('[data-terminal-input]').press('Enter');
      await expect(overview).toBeVisible();await expect(terminal.locator('[data-terminal-output]')).toContainText(locale==='zh'?'已打开窗口概览。':'Window overview opened.');
      await expect(terminal.locator('[data-terminal-output]')).not.toContainText(locale==='zh'?'窗口已并排。':'Windows arranged.');
      expect(await page.evaluate(()=>document.querySelector('[data-space-overview]')!.contains(document.activeElement))).toBe(true);
      expect(await rectangles(page)).toEqual(before);await page.keyboard.press('Escape');
    }
    expect(await page.evaluate(()=>(window as any).BearSpace.execute('arrange'))).toBe(true);await expect(overview).toBeVisible();
    expect(await rectangles(page)).toEqual(before);await page.keyboard.press('Escape');
    expect(await editor.evaluate((el,previous)=>el===previous,original)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
  });
});

for(const count of [2,4])test(`a 1440×900 desktop tiles ${count} windows with reachable controls and the original note`,async({page})=>{
  await page.setViewportSize({width:1440,height:900});const {editor,original}=await setup(page,count);
  const active=page.locator('[data-space-window][data-active="true"]'),arrange=active.locator('[data-window-action="arrange"]');
  await expect(arrange).toHaveAttribute('aria-label','窗口并排');await expect(arrange).not.toHaveAttribute('aria-haspopup','dialog');
  await hit(arrange,24);await arrange.click();await expect(page.locator('[data-space-overview]')).toBeHidden();
  const rects=Object.values(await rectangles(page)) as {x:number,y:number,width:number,height:number}[];
  for(const rect of rects) {
    expect(rect.x).toBeGreaterThanOrEqual(8);expect(rect.y).toBeGreaterThanOrEqual(12);
    expect(rect.width).toBeGreaterThanOrEqual(320);expect(rect.height).toBeGreaterThanOrEqual(260);
    expect(rect.x+rect.width).toBeLessThanOrEqual(1432.001);expect(rect.y+rect.height).toBeLessThanOrEqual(792.001);
  }
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++) {
    const a=rects[i],b=rects[j];expect(a.x+a.width+4<=b.x+.001||b.x+b.width+4<=a.x+.001||a.y+a.height+4<=b.y+.001||b.y+b.height+4<=a.y+.001).toBe(true);
  }
  for(const win of await page.locator('[data-space-window]').all())for(const button of await win.locator('[data-window-action]').all())await hit(button,24);
  expect(await editor.evaluate((el,previous)=>el===previous,original)).toBe(true);await editor.press('End');await editor.pressSequentially('继续写。');
  await expect(editor).toHaveValue('这份笔记和窗口一起保留。继续写。');
  await page.locator('[data-space-menu-trigger]').click();await expect(page.locator('.space-menu [data-space-arrange]')).toBeVisible();
  await expect(page.locator('.space-menu [data-space-arrange]')).toHaveText('窗口并排');await page.keyboard.press('Escape');
  const before=await rectangles(page);expect(await page.evaluate(()=>(window as any).BearSpace.execute('arrange'))).toBe(true);expect(await rectangles(page)).toEqual(before);
});
