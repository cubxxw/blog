import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

const palettes={
  light:{dawn:'rgb(111, 166, 157)',dusk:'rgb(113, 140, 155)',forest:'rgb(151, 170, 143)'},
  dark:{dawn:'rgb(41, 76, 71)',dusk:'rgb(48, 67, 79)',forest:'rgb(60, 76, 57)'},
};
async function openApp(page:Page,app:string) {
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else {
    await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();
    await page.locator(`[data-launchpad-app="${app}"]`).click();
  }
  const win=page.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
}
const nextFrame=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
async function hit(control:Locator,minimum=44) {
  await control.scrollIntoViewIfNeeded();const box=(await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(minimum);expect(box.height).toBeGreaterThanOrEqual(minimum);
  expect(await control.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  return box;
}
async function showDesktop(page:Page) {
  await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-show-desktop]').click();
  await expect(page.locator('[data-space-window]:visible')).toHaveCount(0);
}
async function appearance(notes:Locator,contact:Locator,settings:Locator) {
  return {
    paper:await notes.locator('[data-note-editor]').evaluate(el=>getComputedStyle(el).backgroundColor),
    draft:await contact.locator('[data-message-draft]').evaluate(el=>getComputedStyle(el).backgroundColor),
    window:await settings.evaluate(el=>getComputedStyle(el).backgroundColor),
    chrome:await settings.locator('.space-window__bar').evaluate(el=>getComputedStyle(el).backgroundColor),
  };
}

for(const view of [{width:1440,height:900,locale:'zh',coarse:false},{width:390,height:844,locale:'en',coarse:true}])test.describe(`${view.width}×${view.height} ${view.locale} live monitor wallpaper`,()=>{
  test.use({viewport:{width:view.width,height:view.height},hasTouch:view.coarse,isMobile:view.coarse});
  test('all six existing colors reach the monitor without recoloring documents or replacing editors',async({page})=>{
    await page.route('**/.netlify/functions/bear-runtime',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
    await page.goto(view.locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');
    const screen=page.locator('.space-spatial-screen');await expect(screen).toBeVisible();
    const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');await editor.fill('颜色变化时，笔记还在这里。');const originalNote=await editor.elementHandle();
    const contact=await openApp(page,'contact'),draft=contact.locator('[data-message-draft]');await draft.fill('A draft survives each desktop color.');const originalDraft=await draft.elementHandle();
    await showDesktop(page);const settings=await openApp(page,'settings'),firstButton=await settings.locator('[data-set-wallpaper="dawn"]').elementHandle();
    for(const theme of ['light','dark'] as const) {
      const themeChoice=settings.locator(`[data-set-theme="${theme}"]`);await hit(themeChoice);await themeChoice.focus();await themeChoice.press('Space');
      await nextFrame(page);await expect(themeChoice).toBeFocused();await expect(themeChoice).toHaveAttribute('aria-pressed','true');
      const documents=await appearance(notes,contact,settings),colors:string[]=[];
      for(const wallpaper of ['dawn','dusk','forest'] as const) {
        const choice=settings.locator(`[data-set-wallpaper="${wallpaper}"]`),originalChoice=await choice.elementHandle(),box=await hit(choice);
        await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await nextFrame(page);
        await expect(choice).toBeFocused();await expect(choice).toHaveAttribute('aria-pressed','true');
        expect(await choice.evaluate((el,original)=>el===original,originalChoice)).toBe(true);
        expect(await settings.locator('[data-set-wallpaper="dawn"]').evaluate((el,original)=>el===original,firstButton)).toBe(true);
        expect(await appearance(notes,contact,settings)).toEqual(documents);
        expect(await page.evaluate(()=>({state:(window as any).BearSpace.snapshot().wallpaper,stored:JSON.parse(localStorage.getItem('bear-space:v1')||'{}').wallpaper}))).toEqual({state:wallpaper,stored:wallpaper});
        const minimize=settings.locator('[data-window-action="minimize"]'),minBox=await hit(minimize,view.coarse?44:24);
        await page.mouse.click(minBox.x+minBox.width/2,minBox.y+minBox.height/2);await expect(settings).toBeHidden();
        await expect(page.locator('[data-space-window]:visible')).toHaveCount(0);
        const exposed=await screen.evaluate(el=>{const rect=el.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height*.3);return Boolean(hit&&el.contains(hit)&&!hit.closest('[data-space-window]'));});
        expect(exposed).toBe(true);
        const color=await screen.evaluate(el=>getComputedStyle(el).backgroundColor);expect(color).toBe(palettes[theme][wallpaper]);colors.push(color);
        expect(await screen.evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
        await openApp(page,'settings');
      }
      expect(new Set(colors).size).toBe(3);
    }
    await openApp(page,'contact');expect(await draft.evaluate((el,original)=>el===original,originalDraft)).toBe(true);await expect(draft).toHaveValue('A draft survives each desktop color.');
    await draft.press('End');await draft.pressSequentially(' Still here.');await expect(draft).toHaveValue('A draft survives each desktop color. Still here.');
    await openApp(page,'notes');expect(await editor.evaluate((el,original)=>el===original,originalNote)).toBe(true);await expect(editor).toHaveValue('颜色变化时，笔记还在这里。');
    await editor.press('End');await editor.pressSequentially('继续。');await expect(editor).toHaveValue('颜色变化时，笔记还在这里。继续。');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
  });
});

test.describe('graphics recovery desktop',()=>{
  test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  test('forced WebGL failure keeps the original visible six-color landscape palette',async({page})=>{
    await page.addInitScript(()=>{
      localStorage.setItem('space:cafe:theme:v2','zen');
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]) {
        if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;
        return Reflect.apply(original,this,[type,...args]);
      } as typeof original;
    });
    await page.route('**/.netlify/functions/bear-runtime',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
    await page.goto('/zh/projects/');await enterWorkspace(page);
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-failed','true');await expect(page.locator('.space-spatial-screen')).toHaveCount(0);
    const landscape=page.locator('.space-landscape');await expect(landscape).toBeVisible();
    await showDesktop(page);const settings=await openApp(page,'settings');
    for(const theme of ['light','dark'] as const) {
      const themeChoice=settings.locator(`[data-set-theme="${theme}"]`);await hit(themeChoice);await themeChoice.focus();await themeChoice.press('Space');await nextFrame(page);await expect(themeChoice).toBeFocused();
      const colors:string[]=[];
      for(const wallpaper of ['dawn','dusk','forest'] as const) {
        const choice=settings.locator(`[data-set-wallpaper="${wallpaper}"]`);await hit(choice);await choice.click();await nextFrame(page);await expect(choice).toBeFocused();
        await settings.locator('[data-window-action="minimize"]').click();await expect(settings).toBeHidden();
        await expect(landscape).toBeVisible();const color=await landscape.evaluate(el=>getComputedStyle(el).backgroundColor);expect(color).toBe(palettes[theme][wallpaper]);colors.push(color);
        await openApp(page,'settings');
      }
      expect(new Set(colors).size).toBe(3);
    }
  });
});
