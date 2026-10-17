import {test,expect,type Page,type Locator} from '../helpers/frozen-site';

test.use({channel:'chromium',reducedMotion:'reduce'});
const article=(locale='zh')=>`${locale==='zh'?'/zh':''}/ai-agent/posts/context-engineering-the-new-foundation/`;
const marker=(page:Page)=>page.locator('.post-content a.footnote-ref').first();
const preview=(page:Page)=>page.locator('#fn-preview-popover');
const more=(page:Page)=>page.locator('.fn-popover__more');
const keyboardHint=(page:Page)=>page.locator('.fn-popover__keyboard-hint');
async function center(ref:Locator,noJS=false){
  await ref.scrollIntoViewIfNeeded();
  await ref.evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:scrollY+r.y+r.height/2-innerHeight/2,behavior:'instant'});});
  if(noJS)await ref.evaluate(el=>el.getBoundingClientRect().toJSON());
  else await ref.page().evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
async function tap(ref:Locator){
  const box=(await ref.boundingBox())!;await ref.page().touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}
async function actionGeometry(action:Locator){
  const box=(await action.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await action.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  expect(await action.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);return box;
}
async function openPreview(ref:Locator){
  await tap(ref);await expect(preview(ref.page())).toHaveAttribute('aria-hidden','false');
  await expect.poll(()=>preview(ref.page()).evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await expect(keyboardHint(ref.page())).toBeHidden();
}
async function targetFor(ref:Locator){
  const href=(await ref.getAttribute('href'))!;return {href,target:ref.page().locator(`[id=${JSON.stringify(decodeURIComponent(href.slice(1)))}]`)};
}

for(const locale of ['zh','en'])test.describe(`${locale} coarse native footnotes`,()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:locale==='zh'?'reduce':'no-preference'});
  test('first tap keeps the reading point; second tap and More retain native history and Back',async({page})=>{
    await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),locale==='en');
    await page.goto(article(locale));const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);
    const before=await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}));
    await openPreview(ref);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);expect(await page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
    await expect(preview(page)).toHaveAttribute('role','region');await expect(preview(page)).toHaveAttribute('aria-label',locale==='zh'?'脚注预览':'Footnote preview');await expect(preview(page)).not.toHaveAttribute('aria-modal',/./);
    await expect(more(page)).toHaveAttribute('href',href);await actionGeometry(more(page));expect(await preview(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    await tap(ref);await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();expect(await page.evaluate(()=>history.length)).toBe(before.history+1);await expect(preview(page)).toHaveAttribute('aria-hidden','true');
    await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
    await openPreview(ref);const box=await actionGeometry(more(page));await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveAttribute('aria-hidden','true');
    await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  });
});

for(const locale of ['zh','en'])test.describe(`${locale} fine keyboard footnotes`,()=>{
  test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  test('Tab discovers ArrowDown entry; internal citation focus survives and Escape returns without reopening',async({page})=>{
    await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),locale==='en');await page.goto(article(locale));const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);await page.mouse.move(2,2);
    // A programmatic preceding-control setup, followed by the actual Tab
    // into the marker. This is a local keyboard contract, not a whole-page audit.
    await ref.evaluate(el=>{const nodes=Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,textarea,[tabindex]')).filter(n=>n.tabIndex>=0&&!n.matches(':disabled')&&n.getClientRects().length&&!n.closest('[inert]')&&getComputedStyle(n).visibility!=='hidden');const previous=nodes[nodes.indexOf(el as HTMLElement)-1];if(!previous)throw new Error('No preceding keyboard control');previous.focus({preventScroll:true});});
    await page.keyboard.press('Tab');await expect(ref).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');await expect(ref).toHaveAttribute('aria-keyshortcuts',/ArrowDown/);await expect(ref).toHaveAttribute('aria-controls',/fn-preview-popover/);await expect(ref).toHaveAttribute('aria-describedby',/fn-preview-keyboard-help/);
    await expect(keyboardHint(page)).toBeVisible();await expect(keyboardHint(page)).toHaveText(locale==='zh'?'在标记上按 ↓ 进入预览':'At the marker, press ↓ to enter.');await expect(keyboardHint(page)).toHaveAttribute('aria-hidden','true');expect(await keyboardHint(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);const keyboardBox=await preview(page).boundingBox();
    const y=await page.evaluate(()=>scrollY);await page.keyboard.press('ArrowDown');const body=page.locator('.fn-popover__body');await expect(body).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(y);await expect(keyboardHint(page)).toBeVisible();expect(await preview(page).boundingBox()).toEqual(keyboardBox);
    const citation=body.locator('a[href]').first();const originalCitation=await citation.getAttribute('href');await page.keyboard.press('Tab');await expect(citation).toBeFocused();await page.waitForTimeout(250);await expect(citation).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');expect(await citation.getAttribute('href')).toBe(originalCitation);await expect(keyboardHint(page)).toBeVisible();expect(await preview(page).boundingBox()).toEqual(keyboardBox);expect(await page.evaluate(()=>scrollY)).toBe(y);
    await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();await actionGeometry(more(page));await expect(keyboardHint(page)).toBeVisible();expect(await preview(page).boundingBox()).toEqual(keyboardBox);await page.keyboard.press('Escape');await expect(ref).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(await preview(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);await page.waitForTimeout(250);await expect(preview(page)).toBeHidden();await expect(ref).toBeFocused();
    await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('.fn-popover'))).toBe(false);
    await ref.focus();await page.keyboard.press('Enter');await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  });
});

test.describe('bounded short-screen footnote',()=>{
  test.use({viewport:{width:568,height:224},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  test('a long-note fixture scrolls inside the region without moving the article or clipping More',async({page})=>{
    await page.goto(article());const ref=marker(page);
    // Local long-content fixture only; the public note remains unchanged.
    await ref.evaluate(el=>{const note=document.getElementById(decodeURIComponent(el.getAttribute('href')!.slice(1)))!;for(let i=0;i<24;i++){const p=document.createElement('p');p.textContent=`Long note fixture ${i}: reference context remains readable in the bounded preview.`;note.appendChild(p);}});
    await center(ref);const before=await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}));await openPreview(ref);const pop=preview(page),body=page.locator('.fn-popover__body');const box=(await pop.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(12);expect(box.y).toBeGreaterThanOrEqual(12);expect(box.x+box.width).toBeLessThanOrEqual(568-12);expect(box.y+box.height).toBeLessThanOrEqual(224-12+.1);await actionGeometry(more(page));
    expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);const bounds=(await body.boundingBox())!;await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.wheel(0,420);await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(pop).toHaveAttribute('aria-hidden','false');await actionGeometry(more(page));
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).transform)).toBe('none');await actionGeometry(more(page));
    await ref.evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));await expect(ref).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(before.y);
    await page.keyboard.press('ArrowDown');await expect(body).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);
    const citation=body.locator('a[href]').first();await page.keyboard.press('Tab');await expect(citation).toBeFocused();expect(await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}))).toEqual(before);
    await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();expect(await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}))).toEqual(before);await actionGeometry(more(page));await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');await expect(body).toBeFocused();
    await page.keyboard.press('End');await expect.poll(()=>body.evaluate(el=>Math.abs(el.scrollHeight-el.clientHeight-el.scrollTop)<2)).toBe(true);expect(await page.evaluate(()=>scrollY)).toBe(before.y);
    await page.mouse.wheel(0,420);await page.waitForTimeout(100);expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(pop).toHaveAttribute('aria-hidden','false');await actionGeometry(more(page));await page.keyboard.press('Escape');await expect(ref).toBeFocused();await expect(pop).toHaveAttribute('aria-hidden','true');
  });
});

for(const coarse of [false,true])test.describe(`${coarse?'coarse':'fine'} real short-screen Tab`,()=>{
  test.use({viewport:{width:568,height:150},isMobile:coarse,hasTouch:coarse,reducedMotion:'no-preference'});
  test('the existing longest English note keeps native internal Tab off the document scroll chain',async({page})=>{
    await page.addInitScript(()=>localStorage.setItem('pref-theme','dark'));await page.goto(article('en'));await page.waitForFunction(()=>Array.from(document.querySelectorAll<HTMLLinkElement>('link[as="style"]')).every(link=>link.relList.contains('stylesheet')));await page.evaluate(()=>document.fonts.ready);await expect(page.locator('body')).toHaveClass(/dark/);
    const refs=page.locator('.post-content a.footnote-ref'),index=await refs.evaluateAll(nodes=>nodes.map((ref,index)=>({index,length:document.getElementById(decodeURIComponent(ref.getAttribute('href')!.slice(1)))?.textContent?.length||0})).sort((a,b)=>b.length-a.length)[0].index),ref=refs.nth(index),original=await ref.elementHandle();await center(ref);await page.mouse.move(2,2);
    const readPoint=()=>page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length})),before=await readPoint();await ref.evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));expect(await readPoint()).toEqual(before);
    await page.keyboard.press('ArrowDown');const pop=preview(page),body=page.locator('.fn-popover__body'),citation=body.locator('a[href]').first();await expect(body).toBeFocused();await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');expect(await readPoint()).toEqual(before);await expect(keyboardHint(page)).toBeVisible();expect(await pop.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
    const entry=await pop.boundingBox(),hintBox=await keyboardHint(page).boundingBox();expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight&&el.clientHeight>0)).toBe(true);
    const inViewport=async(height:number)=>{const box=(await pop.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(12);expect(box.y).toBeGreaterThanOrEqual(12);expect(box.x+box.width).toBeLessThanOrEqual(568-12);expect(box.y+box.height).toBeLessThanOrEqual(height-12+.1);await actionGeometry(more(page));};await inViewport(150);
    await page.keyboard.press('Tab');await expect(citation).toBeFocused();expect(await readPoint()).toEqual(before);expect(await pop.boundingBox()).toEqual(entry);expect(await keyboardHint(page).boundingBox()).toEqual(hintBox);
    await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();expect(await readPoint()).toEqual(before);expect(await pop.boundingBox()).toEqual(entry);expect(await keyboardHint(page).boundingBox()).toEqual(hintBox);await inViewport(150);
    await page.setViewportSize({width:568,height:224});await inViewport(224);await expect(more(page)).toBeFocused();await expect(keyboardHint(page)).toBeVisible();expect(await readPoint()).toEqual(before);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).transform)).toBe('none');await inViewport(224);expect(await readPoint()).toEqual(before);await page.keyboard.press('Shift+Tab');await expect(citation).toBeFocused();expect(await readPoint()).toEqual(before);await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();expect(await readPoint()).toEqual(before);
    await page.keyboard.press('Escape');expect(await page.evaluate(original=>document.activeElement===original,original)).toBe(true);await expect(ref).toBeFocused();await expect(pop).toHaveAttribute('aria-hidden','true');expect(await pop.evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await readPoint()).toEqual(before);await page.waitForTimeout(250);await expect(pop).toBeHidden();expect(await page.evaluate(original=>document.activeElement===original,original)).toBe(true);
    if(coarse){await openPreview(ref);await expect(keyboardHint(page)).toBeHidden();}
  });
});

test.describe('coarse click intent',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('modifiers, non-primary, AT, Space and missing or malformed definitions retain native intent',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(article());const ref=marker(page);await center(ref);
    const decisions=await ref.evaluate(el=>{
      const recorded:boolean[]=[];const observe=(event:MouseEvent)=>{if(event.target===el){recorded.push(event.defaultPrevented);event.preventDefault();}};document.addEventListener('click',observe);
      // Record the component's decision before this test alone blocks the
      // default action, avoiding any navigation/new-tab side effect.
      for(const flags of [{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{button:1},{detail:0}])el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1,...flags}));
      const href=el.getAttribute('href')!;for(const value of ['#missing-footnote-fixture','#%E0%A4%A','#empty-footnote-fixture']){if(value==='#empty-footnote-fixture'){const empty=document.createElement('div');empty.id='empty-footnote-fixture';document.body.appendChild(empty);}el.setAttribute('href',value);el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1}));}el.setAttribute('href',href);document.removeEventListener('click',observe);return recorded;
    });expect(decisions).toEqual(Array(9).fill(false));await expect(preview(page)).toHaveAttribute('aria-hidden','true');
    await ref.focus();const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(errors).toEqual([]);
  });
});

test.describe('native fallback without JavaScript',()=>{
  test.use({javaScriptEnabled:false,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('the original marker navigates to the complete note and browser Back restores its reading point',async({page})=>{
    await page.goto(article());const ref=marker(page),{href,target}=await targetFor(ref);await center(ref,true);const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await tap(ref);await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveCount(0);
    const top=await target.evaluate(el=>el.getBoundingClientRect().top),headerBottom=await page.locator('.header').evaluate(el=>el.getBoundingClientRect().bottom);expect(top).toBeGreaterThanOrEqual(headerBottom-1);
    await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  });
});

test.describe('owned preview timers',()=>{
  test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  test('an old hover timer cannot replace a newer focused marker or hide its citation; existing ARIA survives',async({page})=>{
    await page.addInitScript(()=>{
      const observer=new MutationObserver(()=>{const ref=document.querySelector('.post-content a.footnote-ref');if(!ref||ref.hasAttribute('data-existing-aria'))return;ref.setAttribute('data-existing-aria','true');ref.setAttribute('aria-describedby','existing-note-description');ref.setAttribute('aria-controls','existing-note-control');ref.setAttribute('aria-keyshortcuts','Alt+N');for(const id of ['existing-note-description','existing-note-control']){const span=document.createElement('span');span.id=id;span.hidden=true;span.textContent='Existing relationship fixture';document.body.appendChild(span);}observer.disconnect();});observer.observe(document,{childList:true,subtree:true});
    });
    await page.goto(article());const refs=page.locator('.post-content a.footnote-ref'),a=refs.nth(0),b=refs.nth(1);await center(a);const role=await a.getAttribute('role');await page.mouse.move(2,2);await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
    await a.hover();await b.focus();const href=await b.getAttribute('href');await page.clock.fastForward(120);await expect(more(page)).toHaveAttribute('href',href!);await expect(b).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');
    await b.press('ArrowDown');const citation=page.locator('.fn-popover__body a[href]').first();await page.keyboard.press('Tab');await expect(citation).toBeFocused();await page.clock.fastForward(250);await expect(citation).toBeFocused();await expect(more(page)).toHaveAttribute('href',href!);
    await page.locator('[data-search-trigger="nav"]:visible').first().focus();await a.dispatchEvent('mouseleave');await page.clock.fastForward(250);await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(await preview(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await page.evaluate(()=>document.activeElement?.matches('[data-search-trigger="nav"]'))).toBe(true);
    await expect(a).toHaveAttribute('aria-describedby',/existing-note-description/);await expect(a).toHaveAttribute('aria-describedby',/fn-preview-keyboard-help/);await expect(a).toHaveAttribute('aria-controls',/existing-note-control/);await expect(a).toHaveAttribute('aria-controls',/fn-preview-popover/);await expect(a).toHaveAttribute('aria-keyshortcuts',/Alt\+N/);expect(await a.getAttribute('role')).toBe(role);
  });
});
