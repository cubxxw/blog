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
const nextFrame=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
const projectedFontCSS=(node:Locator)=>node.evaluate((el:HTMLElement)=>parseFloat(getComputedStyle(el).fontSize)*el.getBoundingClientRect().width/el.offsetWidth);
const fitsHorizontally=(node:Locator)=>node.evaluate(el=>el.scrollWidth<=el.clientWidth+1);
async function hit(control:Locator) {
  await control.scrollIntoViewIfNeeded();const box=(await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await control.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  return box;
}
async function isolatedLinkClick(page:Page,control:Locator,expected:string) {
  await expect(control).toHaveAttribute('href',expected);
  const box=await hit(control),before=await page.evaluate(()=>(window as any).__contactClicks.length);
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  const clicks=await page.evaluate(()=>(window as any).__contactClicks as string[]);
  expect(clicks).toHaveLength(before+1);expect(clicks[clicks.length-1]).toBe(expected);
}
async function preference(page:Page,type:'theme'|'wallpaper') {
  return page.evaluate(key=>({state:(window as any).BearSpace.snapshot()[key],stored:JSON.parse(localStorage.getItem('bear-space:v1')||'{}')[key]}),type);
}

const cases=[
  {width:320,height:844,locale:'zh',theme:'light',coarse:true},
  {width:390,height:844,locale:'en',theme:'light',coarse:true},
  {width:620,height:844,locale:'zh',theme:'dark',coarse:true},
  {width:844,height:390,locale:'en',theme:'dark',coarse:true},
  {width:1440,height:900,locale:'zh',theme:'light',coarse:false},
  {width:1440,height:900,locale:'en',theme:'dark',coarse:false},
];
for(const view of cases)test.describe(`${view.width}×${view.height} ${view.locale} ${view.theme} preferences and contact`,()=>{
  test.use({viewport:{width:view.width,height:view.height},hasTouch:view.coarse,isMobile:view.coarse});
  test('preferences update in place while drafts, status and real channel destinations survive',async({page})=>{
    let runtimeCalls=0,releaseRuntime!:()=>void;
    const runtimeGate=new Promise<void>(resolve=>{releaseRuntime=resolve;});
    const runtimeJobs:Promise<void>[]=[];
    await page.route('**/.netlify/functions/bear-runtime',route=>{
      const call=++runtimeCalls;
      const job=(async()=>{if(call===1)await runtimeGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:call===1})});})();
      runtimeJobs.push(job);return job;
    });
    try {
      await reserveWorldJourney(page);
      await page.goto(view.locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);
      await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');
      expect(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)).toBe(view.coarse);
      await page.evaluate(theme=>(window as any).BearSpace.execute('theme',{value:theme}),view.theme);
      const catalog=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as {links:Record<string,string>};
      const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');await editor.fill('笔记也留在原来的节点。');const originalNote=await editor.elementHandle();
      const contact=await openApp(page,'contact'),draft=contact.locator('[data-message-draft]');
      const draftText='产品与写作 & field notes?\n继续聊 #一段故事';await draft.fill(draftText);const originalDraft=await draft.elementHandle();
      expect(await projectedFontCSS(draft)).toBeGreaterThanOrEqual(16);expect(await projectedFontCSS(contact.locator('.space-contact__intro'))).toBeGreaterThanOrEqual(16);
      const settings=await openApp(page,'settings'),runtime=settings.locator('[data-runtime-status]'),originalSettings=await settings.locator('.space-settings').elementHandle(),originalRuntime=await runtime.elementHandle();
      await expect.poll(()=>runtimeCalls).toBe(1);await expect(runtime).toHaveText(view.locale==='zh'?'正在检查本地连接':'Checking local connection');
      for(const [type,values] of [['theme',['dark','light']],['wallpaper',['forest','dusk','dawn']]] as const) {
        for(const value of values) {
          const choice=settings.locator(`[data-set-${type}="${value}"]`),originalChoice=await choice.elementHandle(),box=await hit(choice);
          if(type==='theme'){await choice.focus();await choice.press('Space');}else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
          await nextFrame(page);await expect(choice).toBeFocused();await expect(choice).toHaveAttribute('aria-pressed','true');
          await expect(settings.locator(`[data-set-${type}][aria-pressed="true"]`)).toHaveCount(1);
          expect(await choice.evaluate((el,original)=>el===original,originalChoice)).toBe(true);
          expect(await settings.locator('.space-settings').evaluate((el,original)=>el===original,originalSettings)).toBe(true);
          expect(await runtime.evaluate((el,original)=>el===original,originalRuntime)).toBe(true);
          expect(await preference(page,type)).toEqual({state:value,stored:value});expect(runtimeCalls).toBe(1);
          expect(await projectedFontCSS(choice)).toBeGreaterThanOrEqual(13);
        }
      }
      for(const control of await settings.locator('.space-settings button').all())await hit(control);
      expect(await projectedFontCSS(settings.locator('.space-capability > span').first())).toBeGreaterThanOrEqual(16);
      expect(await projectedFontCSS(settings.locator('.space-capability small').first())).toBeGreaterThanOrEqual(13);
      expect(await projectedFontCSS(settings.locator('.space-settings > p:not(.space-language__hint)'))).toBeGreaterThanOrEqual(16);
      expect(await fitsHorizontally(settings.locator('[data-window-body]'))).toBe(true);
      await openApp(page,'contact');await draft.focus();
      // A tool may change appearance while a different App owns typing.
      // The mounted Settings nodes must reflect it without claiming focus.
      await page.evaluate(()=>{(window as any).BearSpace.execute('theme',{value:'dark'});(window as any).BearSpace.execute('wallpaper',{value:'forest'});});
      await nextFrame(page);await expect(draft).toBeFocused();await expect(settings.locator('[data-set-theme="dark"]')).toHaveAttribute('aria-pressed','true');
      await expect(settings.locator('[data-set-wallpaper="forest"]')).toHaveAttribute('aria-pressed','true');
      expect(await runtime.evaluate((el,original)=>el===original,originalRuntime)).toBe(true);expect(runtimeCalls).toBe(1);
      expect(await preference(page,'theme')).toEqual({state:'dark',stored:'dark'});expect(await preference(page,'wallpaper')).toEqual({state:'forest',stored:'forest'});
      releaseRuntime();await expect(runtime).toHaveText(view.locale==='zh'?'已连接本地 Docker':'Local Docker connected');
      await expect(draft).toBeFocused();expect(runtimeCalls).toBe(1);
      expect(await draft.evaluate((el,original)=>el===original,originalDraft)).toBe(true);await expect(draft).toHaveValue(draftText);
      await contact.locator('[data-window-action="minimize"]').click();await expect(contact).toBeHidden();await openApp(page,'contact');
      expect(await draft.evaluate((el,original)=>el===original,originalDraft)).toBe(true);await expect(draft).toHaveValue(draftText);
      await draft.press('End');await draft.pressSequentially('继续。');const finalDraft=draftText+'继续。';await expect(draft).toHaveValue(finalDraft);
      expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-space:v1')||'{}').draft)).toBe(finalDraft);
      // Capture native contact clicks before default navigation. No email,
      // public issue, WhatsApp message, or social navigation is sent here.
      await page.evaluate(()=>{
        (window as any).__contactClicks=[];
        document.addEventListener('click',event=>{const anchor=(event.target as Element).closest<HTMLAnchorElement>('.space-contact a');if(anchor){event.preventDefault();(window as any).__contactClicks.push(anchor.href);}},true);
      });
      const channels=contact.locator('.space-contact-links a'),keys=['github','x','zhihu','linkedin','bilibili','youtube','instagram','polarsteps'];await expect(channels).toHaveCount(8);
      for(let i=0;i<keys.length;i++) {
        await expect(channels.nth(i)).toHaveAttribute('target','_blank');await expect(channels.nth(i)).toHaveAttribute('rel',/noopener/);
        expect(await projectedFontCSS(channels.nth(i))).toBeGreaterThanOrEqual(13);await isolatedLinkClick(page,channels.nth(i),new URL(catalog.links[keys[i]]).href);
      }
      const email=contact.locator('[data-contact-email]'),github=contact.locator('[data-contact-github]'),whatsapp=contact.locator('.space-contact__actions a').last();
      const mailURL=`mailto:${catalog.links.email}?subject=${encodeURIComponent('Hello from BEAR Space')}&body=${encodeURIComponent(finalDraft)}`;
      const issueURL=`https://github.com/cubxxw/blog/issues/new?title=${encodeURIComponent('Hello from BEAR Space')}&body=${encodeURIComponent(finalDraft)}`;
      await isolatedLinkClick(page,email,mailURL);await isolatedLinkClick(page,github,issueURL);await isolatedLinkClick(page,whatsapp,new URL(catalog.links.whatsapp).href);
      expect(new URL((await email.getAttribute('href'))!).searchParams.get('body')).toBe(finalDraft);expect(new URL((await github.getAttribute('href'))!).searchParams.get('body')).toBe(finalDraft);
      await hit(contact.locator('[data-open="agent"]'));expect(await projectedFontCSS(contact.locator('.space-contact__hint'))).toBeGreaterThanOrEqual(13);
      expect(await fitsHorizontally(contact.locator('[data-window-body]'))).toBe(true);
      await openApp(page,'notes');expect(await editor.evaluate((el,original)=>el===original,originalNote)).toBe(true);await expect(editor).toHaveValue('笔记也留在原来的节点。');
      await editor.press('End');await editor.pressSequentially('继续。');await expect(editor).toHaveValue('笔记也留在原来的节点。继续。');
      if(view.width===1440) {
        // Closing removes the original workspace-change listener. A new
        // mount gets its own status request and controls, without reviving it.
        await openApp(page,'settings');const oldChoice=await settings.locator('[data-set-theme="dark"]').elementHandle();
        await settings.locator('[data-window-action="close"]').click();await expect(settings).toHaveCount(0);
        await page.evaluate(()=>(window as any).BearSpace.execute('theme',{value:'light'}));
        expect(await oldChoice!.getAttribute('aria-pressed')).toBe('true');
        const reopened=await openApp(page,'settings');await expect(reopened.locator('[data-set-theme="light"]')).toHaveAttribute('aria-pressed','true');
        await expect.poll(()=>runtimeCalls).toBe(2);await expect(reopened.locator('[data-runtime-status]')).toHaveText(view.locale==='zh'?'未连接（仅本地开发可用）':'Disconnected (local development only)');
        expect(await reopened.locator('[data-runtime-status]').evaluate((el,original)=>el===original,originalRuntime)).toBe(false);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    } finally {releaseRuntime();await Promise.allSettled(runtimeJobs);}
  });
});

test.describe('pending settings status lifecycle',()=>{
  test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  test('closing aborts the owned check and a late result cannot update a new mount',async({page})=>{
    await page.addInitScript(()=>{
      const originalFetch=window.fetch.bind(window);
      (window as any).__runtimeChecks=[];
      window.fetch=(input,init)=>{
        const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
        const method=init?.method||(input instanceof Request?input.method:'GET');
        if(new URL(address,location.href).pathname!=='/.netlify/functions/bear-runtime'||method.toUpperCase()!=='GET')return originalFetch(input,init);
        // Deliberately record abort without settling this synthetic request.
        // This models a late transport that does not cooperate with abort.
        return new Promise<Response>(resolve=>{
          const signal=init?.signal,check={aborted:Boolean(signal?.aborted),finish:(available:boolean)=>resolve(new Response(JSON.stringify({available}),{status:200,headers:{'Content-Type':'application/json'}}))};
          signal?.addEventListener('abort',()=>{check.aborted=true;},{once:true});
          (window as any).__runtimeChecks.push(check);
        });
      };
    });
    await reserveWorldJourney(page);
    await page.goto('/zh/projects/');await enterWorkspace(page);
    const settings=await openApp(page,'settings'),status=settings.locator('[data-runtime-status]');
    await expect.poll(()=>page.evaluate(()=>(window as any).__runtimeChecks.length)).toBe(1);
    await expect(status).toHaveText('正在检查本地连接');
    const oldStatus=await status.elementHandle(),oldChoice=await settings.locator('[data-set-theme="light"]').elementHandle();
    await settings.locator('[data-window-action="close"]').click();await expect(settings).toHaveCount(0);
    expect(await page.evaluate(()=>(window as any).__runtimeChecks[0].aborted)).toBe(true);
    await page.evaluate(()=>(window as any).BearSpace.execute('theme',{value:'dark'}));
    expect(await oldChoice!.getAttribute('aria-pressed')).toBe('true');expect(await oldStatus!.textContent()).toBe('正在检查本地连接');
    const reopened=await openApp(page,'settings'),current=reopened.locator('[data-runtime-status]'),currentNode=await current.elementHandle();
    await expect.poll(()=>page.evaluate(()=>(window as any).__runtimeChecks.length)).toBe(2);
    await expect(reopened.locator('[data-set-theme="dark"]')).toHaveAttribute('aria-pressed','true');
    expect(await current.evaluate((el,original)=>el===original,oldStatus)).toBe(false);
    await page.evaluate(()=>(window as any).__runtimeChecks[1].finish(false));
    await expect(current).toHaveText('未连接（仅本地开发可用）');
    await page.evaluate(()=>(window as any).__runtimeChecks[0].finish(true));await nextFrame(page);
    await expect(current).toHaveText('未连接（仅本地开发可用）');expect(await current.evaluate((el,original)=>el===original,currentNode)).toBe(true);
    expect(await oldStatus!.textContent()).toBe('正在检查本地连接');expect(await oldChoice!.getAttribute('aria-pressed')).toBe('true');
    expect(await page.evaluate(()=>(window as any).__runtimeChecks.map((check:any)=>check.aborted))).toEqual([true,false]);
  });
});
