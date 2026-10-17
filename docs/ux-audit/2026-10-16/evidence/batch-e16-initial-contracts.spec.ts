import {test,expect,type Page,type Locator} from '../helpers/frozen-site';

test.use({channel:'chromium',reducedMotion:'reduce'});
const article=(lang:string)=>`${lang==='zh'?'/zh':''}/growth/posts/2026-07-14-what-remains-when-taken-apart/`;
const root=(page:Page)=>page.locator('[data-article-chat]');
const input=(page:Page)=>root(page).locator('.rc-ai-textarea');
const send=(page:Page)=>root(page).locator('.rc-ai-send');
const stop=(page:Page)=>root(page).locator('.article-chat-stop');
const messages=(page:Page)=>root(page).locator('.rc-ai-messages');
const reference=(page:Page)=>root(page).locator('.article-chat-reference');
const clear=(page:Page)=>root(page).locator('.article-chat-reference-clear');
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));

// Only the original ArticleAIClient's local fetch boundary is replaced. No model call.
async function offlineAI(page:Page){
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window),state:any={mode:'json',turns:[]};
    (window as any).__legibilityAI=state;
    window.fetch=(input,options)=>{
      const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(new URL(address,location.href).pathname!=='/.netlify/functions/article-ai')return original(input,options);
      const turn:any={payload:JSON.parse(String(options?.body)),aborts:0};state.turns.push(turn);
      if(state.mode==='fail')return Promise.resolve(new Response('{"error":"offline"}',{status:503,headers:{'Content-Type':'application/json'}}));
      if(state.mode==='json')return Promise.resolve(new Response(JSON.stringify({answer:'Controlled reading response.\n\nThis is a second readable paragraph, generated only by this offline verification fixture.'}),{headers:{'Content-Type':'application/json'}}));
      let ended=false;
      const stream=new ReadableStream<Uint8Array>({start(controller){
        turn.delta=(text:string)=>{if(!ended)controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({delta:text})}\n\n`));};
        options?.signal?.addEventListener('abort',()=>{turn.aborts++;if(!ended){ended=true;controller.error(new DOMException('Aborted','AbortError'));}},{once:true});
      },cancel(){ended=true;}});
      return Promise.resolve(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));
    };
  });
}
const count=(page:Page)=>page.evaluate(()=>(window as any).__legibilityAI.turns.length);
const mode=(page:Page,value:string)=>page.evaluate(value=>{(window as any).__legibilityAI.mode=value;},value);
async function prepare(page:Page,width:number,height:number,lang:string,dark:boolean){
  await page.setViewportSize({width,height});
  await page.addInitScript(dark=>{localStorage.setItem('pref-theme',dark?'dark':'light');},dark);
  await page.goto(article(lang));await expect(root(page)).toHaveAttribute('data-chat-ready','true');
  await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await frames(page);
}
async function settled(page:Page){
  if((page.viewportSize()?.width||0)<1200){
    await expect(page.locator('#article-bottom-sheet')).toHaveClass(/abs--open/);
    await expect.poll(()=>page.locator('#article-bottom-sheet').evaluate(el=>{
      const style=getComputedStyle(el),matrix=style.transform==='none'?null:new DOMMatrixReadOnly(style.transform);
      return Number(style.opacity)===1&&(!matrix||Math.abs(matrix.m42)<.1)&&!el.getAnimations().some(animation=>animation.playState==='running');
    })).toBe(true);
  }await frames(page);
}
async function openAI(page:Page){
  if((page.viewportSize()?.width||0)>=1200)await page.locator('#rc-tab-ai').click();
  else {await page.locator('#article-fab').click();await page.locator('#abs-tab-ai').click();}
  await settled(page);await expect(input(page)).toBeVisible();
}
async function hit(page:Page,locator:Locator,minHeight=0,minWidth=0){
  await expect(locator).toBeVisible();const box=(await locator.boundingBox())!,viewport=page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(-.1);expect(box.y).toBeGreaterThanOrEqual(-.1);
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+.1);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+.1);
  expect(box.height).toBeGreaterThanOrEqual(minHeight-.1);expect(box.width).toBeGreaterThanOrEqual(minWidth-.1);
  expect(await locator.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  return box;
}
async function font(locator:Locator,minimum:number){
  expect(await locator.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(minimum);
}
async function sameInput(page:Page,original:Awaited<ReturnType<Locator['elementHandle']>>){expect(await input(page).evaluate((el,old)=>el===old,original)).toBe(true);}
async function selectedRequest(page:Page,lang:string){
  // Use an actual published paragraph, its original text node and the real toolbar.
  const candidates=page.locator('.post-content p');
  const index=await candidates.evaluateAll(elements=>elements.map((el,index)=>({index,length:el.textContent?.length||0,plain:el.childElementCount===0&&el.firstChild?.nodeType===Node.TEXT_NODE})).filter(x=>x.plain&&x.length>80).sort((a,b)=>b.length-a.length)[0].index);
  const paragraph=candidates.nth(index);await paragraph.evaluate(async el=>{
    el.scrollIntoView({block:'center',behavior:'instant'});const style=getComputedStyle(el);
    await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,el.textContent||'');await document.fonts.ready;
  });await frames(page);
  const selected=await paragraph.evaluate((el,limit)=>{
    const range=document.createRange();range.setStart(el.firstChild!,0);range.setEnd(el.firstChild!,Math.min(limit,el.firstChild!.textContent!.length));
    const selection=getSelection()!;selection.removeAllRanges();selection.addRange(range);return range.toString();
  },lang==='zh'?150:450);
  const toolbar=page.locator('.asel-toolbar');await expect(toolbar).toBeVisible();const before=await page.evaluate(()=>scrollY);
  await toolbar.locator('[data-asel-action="ai"]').click();await settled(page);await expect(input(page)).toBeFocused();
  expect(await page.evaluate(()=>scrollY)).toBe(before);
  await expect(reference(page).locator('.article-chat-reference-text')).toHaveText(selected);
  await expect.poll(()=>count(page)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>(window as any).__legibilityAI.turns.at(-1).payload.selectedText)).toBe(selected);
  return selected;
}
async function leaveAI(page:Page){
  if((page.viewportSize()?.width||0)<1200){await input(page).focus();await page.keyboard.press('Escape');await expect(page.locator('#article-bottom-sheet')).not.toHaveClass(/abs--open/);}
  else await page.locator('#rc-tab-toc').click();
}

// Only flat computed-color stacks with opacity=1 receive a contrast verdict.
// Gradients/group opacity remain recorded as unverified; no paper-token shortcut.
async function contrast(locator:Locator){
  return locator.evaluate(el=>{
    type Color=[number,number,number,number];
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true})!;
    const parse=(css:string):Color=>{context.clearRect(0,0,1,1);context.fillStyle=css;context.fillRect(0,0,1,1);const c=context.getImageData(0,0,1,1).data;return[c[0],c[1],c[2],c[3]/255];};
    const over=(a:Color,b:Color):Color=>{const alpha=a[3]+b[3]*(1-a[3]);return alpha?[(a[0]*a[3]+b[0]*b[3]*(1-a[3]))/alpha,(a[1]*a[3]+b[1]*b[3]*(1-a[3]))/alpha,(a[2]*a[3]+b[2]*b[3]*(1-a[3]))/alpha,alpha]:[0,0,0,0];};
    const stack=[];let backdrop:Color=[0,0,0,0],eligible=true,foundOpaque=false;
    for(let node:Element|null=el;node;node=node.parentElement){
      const style=getComputedStyle(node);stack.push({tag:node.tagName,className:node.className,color:style.color,background:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity});
      if(Number(style.opacity)!==1)eligible=false;
      if(!foundOpaque){
        if(style.backgroundImage!=='none')eligible=false;
        backdrop=over(backdrop,parse(style.backgroundColor));foundOpaque=backdrop[3]>=.999;
      }
    }
    const luminance=(color:Color)=>color.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,index)=>sum+v*[.2126,.7152,.0722][index],0);
    eligible=eligible&&foundOpaque;const fg=over(parse(getComputedStyle(el).color),backdrop),a=luminance(fg),b=luminance(backdrop);
    return{eligible,ratio:eligible?(Math.max(a,b)+.05)/(Math.min(a,b)+.05):null,foreground:getComputedStyle(el).color,backdrop,stack};
  });
}
let sample=0;
async function readable(locator:Locator,minimum:number){
  await font(locator,minimum);const result=await contrast(locator);
  await test.info().attach(`computed-colors-${++sample}`,{contentType:'application/json',body:JSON.stringify(result,null,2)});
  if(result.eligible)expect(result.ratio).toBeGreaterThanOrEqual(4.5);
}
async function scrollInside(page:Page,locator:Locator){
  await locator.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY),box=await hit(page,locator);
  expect(await locator.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(2);
  const old=await locator.evaluate(el=>el.scrollTop);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,140);
  await expect.poll(()=>locator.evaluate(el=>el.scrollTop)).toBeGreaterThan(old);expect(await page.evaluate(()=>scrollY)).toBe(before);
}
async function selectedAppearance(page:Page,selected:string,compact:boolean){
  const quote=root(page).locator('.article-chat-quote').last();await expect(quote).toHaveText(selected);
  expect(await quote.evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
  expect(await quote.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  const outer=quote.locator('..');expect(await outer.evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('0px');expect(await outer.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('0px');
  expect(await reference(page).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');expect(await reference(page).evaluate(el=>getComputedStyle(el).borderRadius)).toBe('0px');
  await readable(root(page).locator('.rc-ai-user-text').last(),14);await readable(root(page).locator('.rc-ai-user-label').last(),12);
  await font(root(page).locator('.rc-ai-answer-body').last(),14);await font(reference(page).locator('.article-chat-reference-label'),12);await font(reference(page).locator('.article-chat-reference-text'),14);
  const share=root(page).locator('.rc-ai-share-btn').last();await share.scrollIntoViewIfNeeded();await readable(share,13);await hit(page,share,compact?44:32);
  const before=(await share.boundingBox())!;await share.hover();expect(await share.evaluate(el=>getComputedStyle(el).transform)).toBe('none');const after=(await share.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(.1);
  await scrollInside(page,quote);await scrollInside(page,reference(page).locator('.article-chat-reference-text'));
  await hit(page,clear(page),44,44);const draft=await input(page).inputValue();await clear(page).click();await expect(reference(page)).toBeHidden();await expect(input(page)).toBeFocused();await expect(input(page)).toHaveValue(draft);await expect(quote).toHaveText(selected);
}

test('desktop bilingual light/dark supporting copy, full passage and answer sharing keep a readable hierarchy',async({page})=>{
  await offlineAI(page);
  for(const lang of ['zh','en'])for(const dark of [false,true]){
    await prepare(page,1440,900,lang,dark);await openAI(page);await readable(root(page).locator('.rc-ai-intro-copy'),14);await readable(root(page).locator('.rc-ai-greeting'),14);await font(root(page).locator('.rc-ai-quick-label'),12);
    expect(await input(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBe(lang==='zh'?13:12.5);
    await input(page).fill('Unsent reading draft');await leaveAI(page);const selected=await selectedRequest(page,lang);await expect(root(page)).toHaveAttribute('aria-busy','false');await selectedAppearance(page,selected,false);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test.describe('compact article reading',()=>{
  test.use({hasTouch:true,isMobile:true});
  test('390px bilingual conversation keeps 16px editing, full quote and 44px local actions',async({page})=>{
    await offlineAI(page);
    for(const lang of ['zh','en']){
      await prepare(page,390,844,lang,lang==='en');await openAI(page);await readable(root(page).locator('.rc-ai-intro-copy'),14);await font(input(page),16);await input(page).fill('Preserved phone draft');await leaveAI(page);
      const original=await input(page).elementHandle(),selected=await selectedRequest(page,lang);await expect(root(page)).toHaveAttribute('aria-busy','false');await sameInput(page,original);await selectedAppearance(page,selected,true);await hit(page,send(page),44,44);await hit(page,input(page));
      await input(page).press('Escape');await expect(page.locator('#article-bottom-sheet')).not.toHaveClass(/abs--open/);await expect(page.locator('#article-fab')).toBeFocused();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  });

  test('568px short AI keeps initial, held selection, Stop, full quote, Clear and 503 Retry within 320/256/224px',async({page})=>{
    await offlineAI(page);await prepare(page,568,320,'zh',true);await openAI(page);
    const original=await input(page).elementHandle(),sheet=page.locator('#article-bottom-sheet');
    for(const height of [320,256,224]){
      await page.setViewportSize({width:568,height});await settled(page);await hit(page,input(page));await hit(page,send(page),44,44);await hit(page,sheet.locator('.abs-handle'));
      for(const tab of await sheet.locator('.abs-tab').all())await hit(page,tab,44);
    }
    // Every original lens is still reachable above the sticky composer, including
    // the last row at the smallest height; mere DOM presence is not sufficient.
    expect(await root(page).locator('[data-prompt]').count()).toBeGreaterThanOrEqual(6);
    for(const chip of await root(page).locator('[data-prompt]').all()){
      await chip.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await frames(page);await hit(page,chip,44);await hit(page,input(page));
    }
    for(const tab of ['toc','share']){
      await page.locator(`#abs-tab-${tab}`).click();await frames(page);expect((await sheet.boundingBox())!.height).toBeLessThanOrEqual(224*.78+.1);
    }
    await page.locator('#abs-tab-ai').click();await settled(page);
    await page.setViewportSize({width:568,height:320});await settled(page);await input(page).fill('Keep the selected-passage draft');await leaveAI(page);await mode(page,'held');
    const selected=await selectedRequest(page,'zh');await expect(root(page)).toHaveAttribute('aria-busy','true');await expect(send(page)).toBeHidden();await expect(stop(page)).toBeVisible();
    for(const height of [320,256,224]){
      await page.setViewportSize({width:568,height});await settled(page);await sameInput(page,original);await font(input(page),16);await hit(page,input(page));await hit(page,clear(page),44,44);await hit(page,stop(page),44,44);await expect(send(page)).toBeHidden();
      expect(await messages(page).evaluate(el=>el.clientHeight)).toBeGreaterThanOrEqual(24);expect(await count(page)).toBe(1);expect(await page.evaluate(()=>(window as any).__legibilityAI.turns[0].payload.selectedText)).toBe(selected);
    }
    const stopBox=await hit(page,stop(page),44,44);await stop(page).click();await expect(root(page)).toHaveAttribute('aria-busy','false');await expect(stop(page)).toBeHidden();await expect(input(page)).toBeFocused();const sendBox=await hit(page,send(page),44,44);expect(Math.abs(sendBox.x-stopBox.x)).toBeLessThanOrEqual(1);expect(Math.abs(sendBox.y-stopBox.y)).toBeLessThanOrEqual(1);expect(await page.evaluate(()=>(window as any).__legibilityAI.turns[0].aborts)).toBe(1);
    await mode(page,'json');await input(page).fill('Explain the full quoted passage');await send(page).click();await expect(root(page)).toHaveAttribute('aria-busy','false');await expect(root(page).locator('.rc-ai-answer-body').last()).toContainText('Controlled reading response.');await expect(root(page).locator('.article-chat-quote')).toHaveText(selected);
    for(const height of [320,256,224]){
      await page.setViewportSize({width:568,height});await settled(page);await sameInput(page,original);await hit(page,input(page));await hit(page,clear(page),44,44);await hit(page,send(page),44,44);await font(root(page).locator('.rc-ai-answer-body').last(),14);
    }
    await scrollInside(page,root(page).locator('.article-chat-quote'));await scrollInside(page,reference(page).locator('.article-chat-reference-text'));await clear(page).click();await expect(reference(page)).toBeHidden();await expect(input(page)).toBeFocused();await expect(root(page).locator('.article-chat-quote')).toHaveText(selected);
    await mode(page,'fail');await input(page).fill('A controlled unavailable response');await send(page).click();const retry=root(page).locator('.ai-retry-btn');await expect(retry).toBeVisible();await expect(root(page)).toHaveAttribute('aria-busy','false');
    await retry.scrollIntoViewIfNeeded();await hit(page,retry,44,44);await readable(retry,14);await hit(page,input(page));await hit(page,send(page),44,44);
    const requests=await count(page);await mode(page,'json');await retry.click();await expect.poll(()=>count(page)).toBe(requests+1);await expect(retry).toHaveCount(0);await expect(root(page)).toHaveAttribute('aria-busy','false');await hit(page,input(page));await hit(page,send(page),44,44);await expect(stop(page)).toBeHidden();await sameInput(page,original);
    await input(page).focus();await input(page).press('Escape');await expect(sheet).not.toHaveClass(/abs--open/);await expect(page.locator('#article-fab')).toBeFocused();expect(await sheet.evaluate((el:HTMLElement)=>el.inert)).toBe(true);
  });
});
