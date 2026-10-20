import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

async function openApp(page:Page,app:string) {
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else {
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-space-launchpad-trigger]').click();
    await page.locator(`[data-launchpad-app="${app}"]`).click();
  }
  const win=page.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
}
const physicalType=(node:Locator)=>node.evaluate((el:HTMLElement)=>parseFloat(getComputedStyle(el).fontSize)*el.getBoundingClientRect().width/el.offsetWidth);
const fitsHorizontally=(node:Locator)=>node.evaluate(el=>el.scrollWidth<=el.clientWidth+1);

for(const size of [{width:320,height:844},{width:390,height:844},{width:568,height:320},{width:1440,height:900}]) {
  test(`Space reading, controls and private input remain usable at ${size.width}×${size.height}`,async({page})=>{
    await page.setViewportSize(size);await page.goto('/zh/projects/');await enterWorkspace(page);
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');
    const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');
    await editor.fill('这段笔记留在同一个输入框。');const original=await editor.elementHandle();
    expect(await physicalType(editor)).toBeGreaterThanOrEqual(16);
    const title=notes.locator('.space-window__bar strong'),titleBox=(await title.boundingBox())!;
    const controls=notes.locator('[data-window-action]');
    for(const button of await controls.all()) {
      const box=(await button.boundingBox())!,minimum=size.width<=640?44:24;
      expect(box.width).toBeGreaterThanOrEqual(minimum);expect(box.height).toBeGreaterThanOrEqual(minimum);
    }
    const groupBox=(await notes.locator('.space-window-controls').boundingBox())!;
    expect(groupBox.x+groupBox.width).toBeLessThanOrEqual(titleBox.x+1);
    for(const button of await notes.locator('.space-window-controls button').all()) {
      const offset=await button.evaluate((el:HTMLElement)=>{
        const css=getComputedStyle(el,'::before');
        return {x:parseFloat(css.left)+parseFloat(css.marginLeft)+parseFloat(css.width)/2-el.clientWidth/2,y:parseFloat(css.top)+parseFloat(css.marginTop)+parseFloat(css.height)/2-el.clientHeight/2};
      });
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(1);expect(Math.abs(offset.y)).toBeLessThanOrEqual(1);
    }
    const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');
    await reader.locator('[data-open="reader"][data-payload="/zh/engineering/posts/use-go-tools-dlv/"]').click();
    const paragraph=reader.locator('[data-reader-body] .post-content p').first();await expect(paragraph).toBeVisible();
    expect(await physicalType(paragraph)).toBeGreaterThanOrEqual(16);expect(await fitsHorizontally(reader.locator('[data-window-body]'))).toBe(true);
    const terminal=await openApp(page,'terminal');expect(await physicalType(terminal.locator('.space-terminal'))).toBeGreaterThanOrEqual(14.5);
    await terminal.locator('[data-terminal-input]').fill('help');await terminal.locator('[data-terminal-input]').press('Enter');
    await expect(terminal.locator('[data-terminal-output]')).not.toBeEmpty();expect(await fitsHorizontally(terminal.locator('[data-window-body]'))).toBe(true);
    const map=await openApp(page,'map'),frame=map.locator('.sp-map-frame');
    for(const button of await map.locator('.sp-map-controls button').all()) {
      await button.scrollIntoViewIfNeeded();const box=(await button.boundingBox())!,frameBox=(await frame.boundingBox())!,minimum=size.width<=640?44:24;
      expect(box.width).toBeGreaterThanOrEqual(minimum);expect(box.height).toBeGreaterThanOrEqual(minimum);
      expect(box.x).toBeGreaterThanOrEqual(frameBox.x);expect(box.x+box.width).toBeLessThanOrEqual(frameBox.x+frameBox.width);
      expect(await button.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
      await button.click();
    }
    expect(await fitsHorizontally(map.locator('[data-window-body]'))).toBe(true);
    const plane=page.locator('.space-spatial-screen');const light=await plane.evaluate(el=>getComputedStyle(el).backgroundColor);
    expect(light).toMatch(/^rgb\(/);expect(await plane.evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
    if(size.width===1440) {
      const settings=await openApp(page,'settings');await settings.locator('[data-set-theme="dark"]').click();
      const dark=await plane.evaluate(el=>getComputedStyle(el).backgroundColor);expect(dark).toMatch(/^rgb\(/);expect(dark).not.toBe(light);
    }
    await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();
    await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','cafe');
    await enterWorkspace(page);await openApp(page,'notes');
    expect(await editor.evaluate((el,previous)=>el===previous,original)).toBe(true);await expect(editor).toHaveValue('这段笔记留在同一个输入框。');
    await editor.press('End');await editor.press('Enter');await editor.pressSequentially('继续写。');await expect(editor).toHaveValue('这段笔记留在同一个输入框。\n继续写。');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
  });
}

test('the unscaled graphics fallback retains its reading type sizes',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.addInitScript(()=>{
    localStorage.setItem('space:cafe:theme:v2','zen');
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]) {
      if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;
      return Reflect.apply(original,this,[type,...args]);
    } as typeof original;
  });
  await page.goto('/zh/projects/');await enterWorkspace(page);
  await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-failed','true');await expect(page.locator('.space-spatial-screen')).toHaveCount(0);
  const notes=await openApp(page,'notes');expect(await physicalType(notes.locator('[data-note-editor]'))).toBe(16);
  const terminal=await openApp(page,'terminal');expect(await physicalType(terminal.locator('.space-terminal'))).toBe(12);
});
