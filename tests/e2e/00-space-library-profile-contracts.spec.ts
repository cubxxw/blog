import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';
import {writeFile} from 'node:fs/promises';
import {runLibraryWheelBoundary} from '../../docs/merge-readiness/probes/library-wheel-boundary';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
type Article={url:string,title:string,description:string,date:string,section:string,tags:string[]};
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
const projectedFontCSS=(node:Locator)=>node.evaluate((el:HTMLElement)=>parseFloat(getComputedStyle(el).fontSize)*el.getBoundingClientRect().width/el.offsetWidth);
const noOverflow=(node:Locator)=>node.evaluate(el=>el.scrollWidth<=el.clientWidth+1);
async function openApp(page:Page,app:string){
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else {await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();await page.locator(`[data-launchpad-app="${app}"]`).click();}
  const win=page.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
}
async function setup(page:Page,locale='zh',theme='light'){
  await page.goto(locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');
  await page.evaluate(theme=>(window as any).BearSpace.execute('theme',{value:theme}),theme);
}
async function hit(control:Locator){
  await control.scrollIntoViewIfNeeded();const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);return box;
}
async function choose(page:Page,reader:Locator,value:string){
  if((page.viewportSize()?.width||0)<=640){const picker=reader.locator('[data-library-select]');await hit(picker);await picker.focus();const values=['all','ai-agent','engineering','growth','favorites'];await picker.press('Home');for(let n=0;n<values.indexOf(value);n++)await picker.press('ArrowDown');await expect(picker).toHaveValue(value);await frames(page);await expect(picker).toBeFocused();}
  else {const control=reader.locator(`[data-library-filter="${value}"]`);await hit(control);await control.click();await frames(page);await expect(control).toBeFocused();}
  await expect(reader.locator(`[data-library-filter="${value}"]`)).toHaveAttribute('aria-pressed','true');
}
async function wheelLibrary(page:Page,list:Locator,delta:number,minimum:number,options:{trial?:string,deadline?:number,record?:(value:any)=>void}={}){
  const box=(await list.boundingBox())!,point={x:box.x+box.width/2,y:box.y+box.height/2},handle=(await list.elementHandle())!;
  let outcome='failed',failed=false,failure:unknown,report:any,pollBudgetMs=5000;
  try{
    // Observe without waiting for a paint or replacing the native input. This
    // setup may itself affect timing, so a pass is not evidence of a fix.
    await handle.evaluate((el,{point,delta})=>{
      const node=el as HTMLElement & {__libraryWheelProbe?:any};
      const describe=(value:EventTarget|null)=>value instanceof Element?{tag:value.tagName,id:value.id,class:value.getAttribute('class'),app:value.getAttribute('data-space-window'),list:value.hasAttribute('data-library-list')}:String(value);
      const measure=()=>{
        const rect=node.getBoundingClientRect(),root=node.closest<HTMLElement>('[data-bear-workspace]'),body=node.closest<HTMLElement>('[data-window-body]');
        const ancestors=[];for(let current:HTMLElement|null=node;current&&ancestors.length<9;current=current.parentElement){const css=getComputedStyle(current);ancestors.push({node:describe(current),rect:current.getBoundingClientRect().toJSON(),clientWidth:current.clientWidth,clientHeight:current.clientHeight,scrollWidth:current.scrollWidth,scrollHeight:current.scrollHeight,scrollTop:current.scrollTop,overflowX:css.overflowX,overflowY:css.overflowY,height:css.height,minHeight:css.minHeight,pointerEvents:css.pointerEvents,transform:css.transform});}
        return {at:performance.now(),connected:node.isConnected,hidden:document.hidden,rect:rect.toJSON(),clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,bodyScrollTop:body?.scrollTop,windowScrollY:scrollY,viewport:{width:innerWidth,height:innerHeight},devicePixelRatio,visualViewportScale:visualViewport?.scale,items:node.querySelectorAll('.space-list-item').length,focus:describe(document.activeElement),world:root?{ready:root.dataset.worldReady,mode:root.dataset.worldMode,rendered:root.dataset.worldRenderedMode,loading:root.dataset.worldLoading,travel:root.dataset.worldTravel}:null,point,hit:document.elementsFromPoint(point.x,point.y).slice(0,8).map(describe),ancestors};
      };
      const data={delta,started:measure(),events:[] as any[],frames:[] as any[],dropped:0,stopped:null as null|{at:number,reason:string}};
      let frame=0,timer=0,stopped=false;
      const record=(event:Record<string,unknown>)=>{if(!stopped){if(data.events.length<80)data.events.push({at:performance.now(),...event});else data.dropped++;}};
      const wheel=(event:WheelEvent,phase:string)=>{
        record({type:'wheel',phase,target:describe(event.target),path:event.composedPath().slice(0,8).map(describe),trusted:event.isTrusted,deltaX:event.deltaX,deltaY:event.deltaY,deltaMode:event.deltaMode,ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey,altKey:event.altKey,cancelable:event.cancelable,defaultPrevented:event.defaultPrevented,timeStamp:event.timeStamp,scrollTop:node.scrollTop});
        queueMicrotask(()=>record({type:'wheel-microtask',phase,defaultPrevented:event.defaultPrevented,scrollTop:node.scrollTop}));
      };
      const capture=(event:WheelEvent)=>wheel(event,'document-capture'),bubble=(event:WheelEvent)=>wheel(event,'window-bubble');
      const scroll=(event:Event)=>record({type:event.type,target:describe(event.target),timeStamp:event.timeStamp,scrollTop:node.scrollTop,bodyScrollTop:node.closest<HTMLElement>('[data-window-body]')?.scrollTop,windowScrollY:scrollY});
      const stop=(reason='finally')=>{
        if(stopped)return;stopped=true;data.stopped={at:performance.now(),reason};cancelAnimationFrame(frame);clearTimeout(timer);
        document.removeEventListener('wheel',capture,true);window.removeEventListener('wheel',bubble);document.removeEventListener('scroll',scroll,true);document.removeEventListener('scrollend',scroll,true);
      };
      const tick=(time:number)=>{if(stopped)return;data.frames.push({time,observedAt:performance.now(),scrollTop:node.scrollTop});if(data.frames.length<16)frame=requestAnimationFrame(tick);};
      node.__libraryWheelProbe?.stop('replaced');node.__libraryWheelProbe={data,measure,stop};
      document.addEventListener('wheel',capture,{capture:true,passive:true});window.addEventListener('wheel',bubble,{passive:true});document.addEventListener('scroll',scroll,{capture:true,passive:true});document.addEventListener('scrollend',scroll,{capture:true,passive:true});
      frame=requestAnimationFrame(tick);timer=window.setTimeout(()=>stop('6000ms deadline'),6000);
    },{point,delta});
    await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,delta);
    pollBudgetMs=options.deadline===undefined?5000:Math.min(5000,options.deadline-Date.now());
    if(pollBudgetMs<=0)throw new Error('Boundary observation deadline exhausted before poll');
    await expect.poll(()=>list.evaluate(el=>el.scrollTop),{timeout:pollBudgetMs}).toBeGreaterThan(minimum);
    outcome='passed';
  }catch(error){failed=true;failure=error;
  }finally{
    let diagnostics:unknown;try{diagnostics=await handle.evaluate(el=>{const node=el as any,probe=node.__libraryWheelProbe;if(!probe)return null;let final;try{final=probe.measure();}finally{probe.stop();delete node.__libraryWheelProbe;}return {...probe.data,final};});}catch(captureError){diagnostics={captureError:String(captureError)};}
    try{await handle.dispose();}catch(error){if(!failed)throw error;console.log('LIBRARY_WHEEL_BOUNDARY',JSON.stringify({stage:'dispose-observer',outcome:'inconclusive',error:String(error)}));}
    report={outcome:failed&&options.trial&&pollBudgetMs<5000?'inconclusive':outcome,pollBudgetMs,minimum,point,limitation:'Passive listeners and synchronous setup reads may alter native input timing or compositor routing. A diagnostic pass does not establish a production fix; wheel-microtask is scoped to its listener, not final dispatch.',diagnostics};
    try{options.record?.(report);const name=options.trial?`library-wheel-boundary-${options.trial}`:`library-native-wheel-${delta}`,file=test.info().outputPath(`${name}.json`);await writeFile(file,JSON.stringify(report,null,2));await test.info().attach(name,{contentType:'application/json',path:file});}catch(error){if(!failed)throw error;console.log('LIBRARY_WHEEL_BOUNDARY',JSON.stringify({stage:'save-original-diagnostic',outcome:'inconclusive',error:String(error)}));}
  }
  if(failed){
    if(!options.trial&&delta===850&&test.info().retry===0&&test.info().title==='the real library scroller restores reading position while Notes and Books keep their own documents')try{
      await runLibraryWheelBoundary({page,list,trial:async(name,deadline)=>{let value:any;try{await wheelLibrary(page,list,850,100,{trial:name,deadline,record:record=>value=record});}catch(error){if(!value)value={outcome:'inconclusive',error:String(error)};}return value;},persist:async value=>{const file=test.info().outputPath('library-wheel-boundary.json');await writeFile(file,JSON.stringify(value,null,2));await test.info().attach('library-wheel-boundary',{contentType:'application/json',path:file});}});
    }catch(error){console.log('LIBRARY_WHEEL_BOUNDARY',JSON.stringify({stage:'counterfactual',outcome:'inconclusive',error:String(error)}));}
    throw failure;
  }
  return report;
}
const views=[
  {width:320,height:844,locale:'zh',theme:'light',coarse:true},
  {width:390,height:844,locale:'en',theme:'dark',coarse:true},
  {width:620,height:844,locale:'zh',theme:'dark',coarse:true},
  {width:844,height:390,locale:'en',theme:'light',coarse:true},
  {width:1440,height:900,locale:'zh',theme:'light',coarse:false},
  {width:1440,height:900,locale:'en',theme:'dark',coarse:false},
];
for(const view of views)test.describe(`${view.width}×${view.height} ${view.locale} ${view.theme} library/profile`,()=>{
  test.use({viewport:{width:view.width,height:view.height},hasTouch:view.coarse,isMobile:view.coarse});
  test('real writing and profile remain readable with reachable choices and complete titles',async({page})=>{
    await setup(page,view.locale,view.theme);const catalog=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as {articles:Article[]};const reader=await openApp(page,'reader'),query=reader.locator('[data-library-query]'),picker=reader.locator('[data-library-select]'),list=reader.locator('[data-library-list]');
    const originalQuery=await query.elementHandle(),originalPicker=await picker.elementHandle();await expect(list.locator('.space-list-item')).toHaveCount(catalog.articles.length);
    expect(await picker.locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value))).toEqual(['all','ai-agent','engineering','growth','favorites']);
    if(view.width<=640){await expect(picker).toBeVisible();await expect(reader.locator('.space-library-directory')).toBeHidden();await hit(picker);}else{await expect(picker).toBeHidden();for(const control of await reader.locator('[data-library-filter]').all()){await hit(control);expect(await projectedFontCSS(control)).toBeGreaterThanOrEqual(14);}}
    const longest=catalog.articles.reduce((best,item,i)=>item.title.length>catalog.articles[best].title.length?i:best,0),item=list.locator('.space-list-item').nth(longest);await item.scrollIntoViewIfNeeded();await expect(item.locator('strong')).toHaveText(catalog.articles[longest].title);await expect(item.locator('span')).toHaveText(catalog.articles[longest].description||'');
    expect(await projectedFontCSS(item.locator('strong'))).toBeGreaterThanOrEqual(15);expect(await projectedFontCSS(item.locator('span'))).toBeGreaterThanOrEqual(14);expect(await projectedFontCSS(item.locator('small'))).toBeGreaterThanOrEqual(12);expect(await item.locator('strong').evaluate(el=>getComputedStyle(el).whiteSpace==='normal'&&el.scrollHeight<=el.clientHeight+1)).toBe(true);
    const summary=await item.locator('span').evaluate((el:HTMLElement)=>({clamp:getComputedStyle(el).webkitLineClamp,height:el.offsetHeight,line:parseFloat(getComputedStyle(el).lineHeight)}));expect(summary.clamp).toBe('3');expect(summary.height).toBeLessThanOrEqual(summary.line*3+1);expect(await noOverflow(reader.locator('[data-window-body]'))).toBe(true);
    await choose(page,reader,'engineering');expect(await query.evaluate((el,old)=>el===old,originalQuery)).toBe(true);expect(await picker.evaluate((el,old)=>el===old,originalPicker)).toBe(true);await query.fill('dlv');await choose(page,reader,'all');await expect(query).toHaveValue('dlv');expect(await query.evaluate((el,old)=>el===old,originalQuery)).toBe(true);await expect(list.locator('.space-list-item')).not.toHaveCount(0);
    for(const app of ['notes','books'])await hit(reader.locator(`.space-library-actions [data-open="${app}"]`));
    const welcome=await openApp(page,'welcome'),profile=welcome.locator('[data-space-profile]');if(await profile.evaluate((el:HTMLDetailsElement)=>el.open))await profile.locator(':scope > summary').click();
    expect(await projectedFontCSS(welcome.locator('.space-welcome__intro'))).toBeGreaterThanOrEqual(15);for(const control of await welcome.locator('.space-welcome__routes button,.space-enter,.space-welcome__foot button').all()){await hit(control);expect(await projectedFontCSS(control)).toBeGreaterThanOrEqual(14);}
    await welcome.locator('.space-welcome__foot button').click();await expect(profile).toHaveAttribute('open','');const identity=profile.locator('[data-profile-section="identity"]');expect(await projectedFontCSS(identity.locator('p').nth(1))).toBeGreaterThanOrEqual(15);expect(await projectedFontCSS(identity.locator('.space-profile__mission'))).toBeGreaterThanOrEqual(15);
    const expectedLinks=await page.locator('[data-space-profile-template]').evaluate((el:HTMLTemplateElement)=>[...el.content.querySelectorAll<HTMLAnchorElement>('.space-profile__identity > .space-profile__links a')].map(a=>a.getAttribute('href')));const links=identity.locator(':scope > .space-profile__links a');await expect(links).toHaveCount(expectedLinks.length);
    for(let i=0;i<expectedLinks.length;i++){await expect(links.nth(i)).toHaveAttribute('href',expectedLinks[i]!);await expect(links.nth(i)).toHaveAttribute('rel',/noopener/);await hit(links.nth(i));expect(await projectedFontCSS(links.nth(i))).toBeGreaterThanOrEqual(14);}
    for(const control of await profile.locator('.space-profile__nav button').all())await hit(control);await profile.locator('[data-profile-target="story"]').click();expect(await projectedFontCSS(profile.locator('.space-profile__chapters p').first())).toBeGreaterThanOrEqual(15);await profile.locator('[data-profile-target="start-here"]').click();expect(await projectedFontCSS(profile.locator('.space-profile__reading .post-content'))).toBeGreaterThanOrEqual(15);expect(await noOverflow(welcome.locator('[data-window-body]'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
  });
});

test.describe('390 English bookmark semantics and recovery',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  test('Save, favorites, reload and remove expose the actual persistent state',async({page})=>{
    await setup(page,'en');const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');const item=reader.locator('.space-list-item').first(),url=(await item.getAttribute('data-payload'))!,title=(await item.locator('strong').textContent())!;await item.click();const favorite=reader.locator('[data-reader-favorite]'),purpose=`Bookmark article: ${title}`;await expect(favorite).toHaveAttribute('aria-label',purpose);await expect(favorite).toHaveAttribute('aria-pressed','false');const original=await favorite.elementHandle();
    const originalLink=reader.locator('.space-reader-toolbar a');await expect(originalLink).toHaveAttribute('href',new URL(url,page.url()).href);await hit(originalLink);await page.evaluate(()=>{(window as any).__libraryOriginalClicks=[];document.addEventListener('click',event=>{const a=(event.target as Element).closest<HTMLAnchorElement>('.space-reader-toolbar a');if(a){event.preventDefault();(window as any).__libraryOriginalClicks.push(a.href);}},true);});await originalLink.click();expect(await page.evaluate(()=>(window as any).__libraryOriginalClicks)).toEqual([new URL(url,page.url()).href]);
    await hit(favorite);await favorite.click();await expect(favorite).toHaveAttribute('aria-pressed','true');await expect(favorite).toHaveAttribute('aria-label',purpose);await expect(favorite).toContainText('Saved');await expect(favorite).toBeFocused();expect(await favorite.evaluate((el,old)=>el===old,original)).toBe(true);expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().favorites)).toContain(url);
    const back=reader.locator('.space-reader-toolbar [data-open="reader"]');await hit(back);await back.click();await reader.locator('[data-library-query]').fill('');await choose(page,reader,'favorites');await expect(reader.locator('.space-list-item')).toHaveCount(1);await page.reload();await enterWorkspace(page);await openApp(page,'reader');await expect(reader.locator('[data-library-select]')).toHaveValue('favorites');await expect(reader.locator('[data-library-query]')).toHaveValue('');await expect(reader.locator('.space-list-item')).toHaveCount(1);await reader.locator('.space-list-item').click();await expect(favorite).toHaveAttribute('aria-pressed','true');await hit(favorite);await favorite.click();await expect(favorite).toHaveAttribute('aria-pressed','false');await expect(favorite).toHaveAttribute('aria-label',purpose);await expect(favorite).toContainText('Save');await back.click();await expect(reader.locator('.space-library-empty h3')).toHaveText('No bookmarks yet');expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().favorites)).not.toContain(url);const recover=reader.locator('[data-library-recover]');await hit(recover);await recover.click();await expect(reader.locator('[data-library-select]')).toHaveValue('all');await expect(reader.locator('[data-library-query]')).toBeFocused();
  });
});

test('the real library scroller restores reading position while Notes and Books keep their own documents',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await setup(page);const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]'),draft='目录、文章、书架之间，同一份笔记继续写。';await editor.fill(draft);const originalEditor=await editor.elementHandle(),reader=await openApp(page,'reader');await choose(page,reader,'engineering');await reader.locator('[data-library-query]').fill('Go');const list=reader.locator('[data-library-list]');expect(await list.locator('.space-list-item').count()).toBeGreaterThan(3);await wheelLibrary(page,list,850,100);await frames(page);const readingScroll=await list.evaluate(el=>el.scrollTop);expect(await reader.locator('[data-window-body]').evaluate(el=>el.scrollTop)).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')!).scroll)).toBe(readingScroll);
  const url=await list.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll<HTMLElement>('.space-list-item')].find(item=>{const b=item.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;})!.dataset.payload!;});await list.locator(`[data-payload="${url}"]`).click();const back=reader.locator('.space-reader-toolbar [data-open="reader"]');await hit(back);await back.click();await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);const originalList=await list.elementHandle();
  await reader.locator('[data-window-action="minimize"]').click();await openApp(page,'reader');expect(await list.evaluate((el,old)=>el===old,originalList)).toBe(true);await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);const noteEntry=reader.locator('.space-library-actions [data-open="notes"]');await hit(noteEntry);await noteEntry.click();expect(await editor.evaluate((el,old)=>el===old,originalEditor)).toBe(true);await expect(editor).toHaveValue(draft);await editor.press('End');await editor.pressSequentially('继续。');await openApp(page,'reader');const bookEntry=reader.locator('.space-library-actions [data-open="books"]');await hit(bookEntry);await bookEntry.click();const books=page.locator('[data-space-window="books"]');await expect(books.locator('.space-book')).toHaveCount(4);await books.locator('.space-books-toolbar [data-open="reader"]').click();await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);
  await page.reload();await enterWorkspace(page);await openApp(page,'reader');await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);await openApp(page,'notes');await expect(editor).toHaveValue(draft+'继续。');
});

test('the original public favorite action synchronizes state and semantics without replacing the reader',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await setup(page,'en');const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');const item=reader.locator('.space-list-item').first(),url=(await item.getAttribute('data-payload'))!,title=(await item.locator('strong').textContent())!;await item.click();const favorite=reader.locator('[data-reader-favorite]'),body=reader.locator('[data-reader-body] .post-content'),windowBody=reader.locator('[data-window-body]');await expect(body).toBeVisible();await expect(favorite).toHaveAttribute('aria-pressed','false');await favorite.focus();const originalButton=await favorite.elementHandle(),originalBody=await body.elementHandle(),text=await body.textContent(),readingScroll=await windowBody.evaluate(el=>el.scrollTop);expect(text!.length).toBeGreaterThan(100);
  for(const saved of [true,false]){
    expect(await page.evaluate(url=>(window as any).BearSpace.execute('favorite',{url}),url)).toBe(true);await frames(page);expect(await page.evaluate(url=>(window as any).BearSpace.snapshot().favorites.includes(url),url)).toBe(saved);await expect(favorite).toHaveAttribute('aria-pressed',String(saved));await expect(favorite).toHaveAttribute('aria-label',`Bookmark article: ${title}`);await expect(favorite).toContainText(saved?'Saved':'Save');await expect(favorite.locator('span[aria-hidden="true"]')).toHaveText(saved?'★':'☆');expect(await favorite.evaluate((el,old)=>el===old,originalButton)).toBe(true);await expect(favorite).toBeFocused();expect(await body.evaluate((el,old)=>el===old,originalBody)).toBe(true);await expect(body).toHaveText(text!);expect(await windowBody.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);
  }
});

test('a minimized library restores after reload once, then follows a new real reading scroll',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await setup(page);const reader=await openApp(page,'reader');await choose(page,reader,'engineering');await reader.locator('[data-library-query]').fill('Go');const list=reader.locator('[data-library-list]');await wheelLibrary(page,list,850,100);await frames(page);const savedScroll=await list.evaluate(el=>el.scrollTop);await reader.locator('[data-window-action="minimize"]').click();await expect(reader).toBeHidden();await page.reload();await enterWorkspace(page);await expect(reader).toBeHidden();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')!).scroll)).toBe(savedScroll);
  await openApp(page,'reader');await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),savedScroll)).toBeLessThanOrEqual(1);const restoredList=await list.elementHandle();await wheelLibrary(page,list,300,savedScroll+100);await frames(page);const newScroll=await list.evaluate(el=>el.scrollTop);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')!).scroll)).toBe(newScroll);
  await reader.locator('[data-window-action="minimize"]').click();await openApp(page,'reader');await frames(page);expect(await list.evaluate((el,old)=>el===old,restoredList)).toBe(true);expect(await list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),newScroll)).toBeLessThanOrEqual(1);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')!).scroll)).toBe(newScroll);
});
