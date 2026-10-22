import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

async function captureReview(page:Page,name:string){
  const path=test.info().outputPath(`${name}.png`);
  await page.locator('[data-bear-workspace]').screenshot({path,animations:'disabled'});
  await test.info().attach(name,{path,contentType:'image/png'});
}

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

for(const size of [{width:320,height:568},{width:320,height:844},{width:390,height:844},{width:568,height:320},{width:768,height:1024},{width:1440,height:900}]) {
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

for(const size of [{width:320,height:568},{width:768,height:1024},{width:1440,height:900}]) {
  test(`reading focus is reversible, counts agree and the companion remains reachable at ${size.width}×${size.height}`,async({page})=>{
    await page.setViewportSize(size);await page.addInitScript(()=>localStorage.setItem('space:cafe:onboarding:v1','seen'));
    await page.goto('/zh/projects/');await enterWorkspace(page);
    const workspace=page.locator('[data-bear-workspace]'),reader=await openApp(page,'reader');
    await reader.locator('[data-library-query]').fill('dlv');
    const results=reader.locator('.space-list-item');expect(await results.count()).toBeGreaterThan(0);
    await expect(reader.locator('[data-library-count]')).toContainText(`${await results.count()} / `);
    await results.first().click();const article=reader.locator('[data-reader-body] .post-content');await expect(article).toBeVisible();
    const original=await article.elementHandle(),snapshot=await page.evaluate(()=>(window as any).BearSpace.snapshot().windows.find((win:any)=>win.app==='reader'));
    const focus=reader.locator('[data-reader-focus]');await focus.click();await expect(workspace).toHaveAttribute('data-reading-focus','true');await expect(focus).toHaveAttribute('aria-pressed','true');
    expect(await article.evaluate((el,old)=>el===old,original)).toBe(true);
    if(size.width===320&&size.height===568){
      await expect(page.locator('[data-mac-menubar]')).toBeHidden();await expect(page.locator('[data-space-dock]')).toBeHidden();await expect(reader.locator('.space-window__bar')).toBeHidden();
      const visible=await article.locator('p').first().evaluate(el=>{const box=el.getBoundingClientRect(),style=getComputedStyle(el);return{top:box.top,lines:(innerHeight-box.top)/parseFloat(style.lineHeight)};});
      expect(visible.top).toBeGreaterThan(48);expect(visible.lines).toBeGreaterThanOrEqual(6);await expect(focus).toBeInViewport();
      for(const control of await reader.locator('.space-reader-toolbar > button,.space-reader-toolbar__source > button,.space-reader-tools > summary').all()){const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
    }
    await captureReview(page,`reader-focus-${size.width}x${size.height}`);await page.keyboard.press('Escape');await expect(workspace).toHaveAttribute('data-reading-focus','false');await expect(workspace).toHaveAttribute('data-cafe-mode','desktop');await expect(focus).toBeFocused();
    if(size.width<=640){await expect(page.locator('[data-mac-menubar]')).toBeVisible();await expect(page.locator('[data-space-dock]')).toBeVisible();await expect(reader.locator('.space-window__bar')).toBeVisible();}
    expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().windows.find((win:any)=>win.app==='reader'))).toEqual(snapshot);
    if(size.height===568){
      const text=article.locator('p').first(),paragraph=(await text.boundingBox())!,dock=(await page.locator('[data-space-dock]').boundingBox())!;
      expect(paragraph.y).toBeGreaterThan(0);expect(paragraph.y).toBeLessThan(dock.y-20);
      expect(await reader.locator('[data-window-body]').evaluate(el=>el.scrollTop)).toBe(0);
    }
    await focus.click();await reader.locator('.space-reader-tools > summary').click();await reader.locator('[data-reader-ask]').click();
    const companion=page.locator('[data-space-window="agent"]');await expect(companion).toBeVisible();await expect(companion.locator('[data-agent-input]')).toBeEditable();
    if(size.width<=1000)await expect(reader).toBeHidden();
    await companion.locator('[data-window-action="close"]').click();await expect(reader).toBeVisible();await expect(workspace).toHaveAttribute('data-reading-focus','true');
    await focus.click();await expect(workspace).toHaveAttribute('data-reading-focus','false');
    expect(await article.evaluate((el,old)=>el===old,original)).toBe(true);expect(await fitsHorizontally(reader.locator('[data-window-body]'))).toBe(true);
  });
}

test('article selection survives opening tools and changing focus, and explanation revalidates the current body',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/zh/projects/');await enterWorkspace(page);
  const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');await reader.locator('.space-list-item').first().click();
  const paragraph=reader.locator('[data-reader-body] .post-content p').first();await expect(paragraph).toBeVisible();
  const selected=await paragraph.evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);return selection.toString().trim().slice(0,1200);
  });expect(selected.length).toBeGreaterThan(0);
  const tools=reader.locator('.space-reader-tools > summary'),explain=reader.locator('[data-reader-explain]');
  await tools.click();await expect(explain).toBeVisible();expect(await page.evaluate(()=>window.getSelection()!.toString().trim().slice(0,1200))).toBe(selected);
  await tools.click();await reader.locator('[data-reader-focus]').click();
  expect(await page.evaluate(()=>window.getSelection()!.toString().trim().slice(0,1200))).toBe(selected);
  await tools.click();await expect(explain).toBeVisible();
  await page.evaluate(()=>{document.querySelector('[data-bear-workspace]')!.addEventListener('bear:agent-prefill',event=>{(window as any).__readerExplainedSelection=(event as CustomEvent).detail.selection;});});
  await explain.click();expect(await page.evaluate(()=>(window as any).__readerExplainedSelection)).toBe(selected);await captureReview(page,'assistant-with-source');
  await page.locator('[data-space-window="agent"] [data-window-action="close"]').click();await expect(reader).toBeVisible();
  await tools.click();await page.evaluate(()=>window.getSelection()!.removeAllRanges());await expect(explain).toBeHidden();
  await reader.locator('.space-reader-toolbar [data-open="reader"]').click();await reader.locator('[data-library-query]').fill('Go');await reader.locator('.space-list-item').first().click();
  await expect(reader.locator('[data-reader-body] .post-content')).toBeVisible();await tools.click();await expect(explain).toBeHidden();
});

test('mobile Finder offers three real recent articles and a visible path to every app',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto('/zh/projects/');await enterWorkspace(page);const home=await openApp(page,'welcome');
  const recent=home.locator('.space-finder-recent [data-payload]');await expect(recent).toHaveCount(3);
  const actual=await recent.evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.payload));
  const expected=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent!).articles.slice(0,3).map((article:any)=>article.url));expect(actual).toEqual(expected);
  await captureReview(page,'finder-home-320');const apps=home.locator('[data-space-launchpad-trigger]');await expect(apps).toBeInViewport();await apps.click();await expect(page.locator('[data-space-launchpad]')).toBeVisible();await expect(page.locator('[data-launchpad-app]')).toHaveCount(12);
  await page.locator('[data-space-launchpad-close]').click();await expect(apps).toBeFocused();await recent.first().click();await expect(page.locator('[data-reader-body] .post-content')).toBeVisible();
});

test('Notes exports its actual browser draft and an unavailable secondary sandbox cannot execute',async({page})=>{
  await page.setViewportSize({width:320,height:568});let checks=0,commands=0;
  await page.route('**/.netlify/functions/bear-runtime',route=>{if(route.request().method()==='POST')commands++;else checks++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:false})});});
  await page.goto('/zh/projects/');await enterWorkspace(page);const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');
  await captureReview(page,'notes-empty-320');await editor.fill('此浏览器里的真实笔记。');await expect(notes.locator('[data-note-save]')).toHaveAttribute('data-saved','true');expect(checks).toBe(0);
  const downloading=page.waitForEvent('download');await notes.locator('[data-note-export]').click();const download=await downloading;expect(download.suggestedFilename()).toBe('bear-space-note.md');
  const stream=await download.createReadStream();expect(stream).not.toBeNull();const parts:Buffer[]=[];for await(const part of stream!)parts.push(Buffer.from(part));expect(Buffer.concat(parts).toString('utf8')).toBe('此浏览器里的真实笔记。');
  await notes.locator('.space-note-advanced > summary').click();await expect(notes.locator('[data-note-runtime]')).toContainText('未连接');await expect(notes.locator('[data-note-sandbox]')).toBeDisabled();expect(checks).toBe(1);expect(commands).toBe(0);await expect(editor).toHaveValue('此浏览器里的真实笔记。');
});

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
