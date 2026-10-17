import {test,expect,type Page,type Locator} from '../helpers/frozen-site';

test.use({channel:'chromium',viewport:{width:568,height:320},reducedMotion:'reduce',isMobile:true,hasTouch:true});
const article=(lang:string)=>`${lang==='zh'?'/zh':''}/growth/posts/2026-07-14-what-remains-when-taken-apart/`;
const root=(page:Page)=>page.locator('[data-article-chat]');
const input=(page:Page)=>root(page).locator('.rc-ai-textarea');
const messages=(page:Page)=>root(page).locator('.rc-ai-messages');
const choices=(page:Page)=>root(page).locator('.article-chat-followup');
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
const count=(page:Page)=>page.evaluate(()=>(window as any).__replyLanding.turns.length);
const mode=(page:Page,value:string)=>page.evaluate(value=>{(window as any).__replyLanding.mode=value;},value);
async function offlineAI(page:Page){
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window),state:any={mode:'json',answer:'A controlled reading response.',turns:[]};(window as any).__replyLanding=state;
    const candidates=[{title:'Original engineering article',permalink:'/engineering/posts/use-go-tools-dlv/'},{title:'Original context engineering article',permalink:'/ai-agent/posts/context-engineering-the-new-foundation/'}];
    window.fetch=(input,options)=>{
      const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(new URL(address,location.href).pathname!=='/.netlify/functions/article-ai')return original(input,options);
      const turn:any={payload:JSON.parse(String(options?.body)),aborts:0,cancels:0};state.turns.push(turn);
      if(state.mode==='json')return Promise.resolve(new Response(JSON.stringify({answer:state.answer,candidates}),{headers:{'Content-Type':'application/json'}}));
      let ended=false;const stream=new ReadableStream<Uint8Array>({start(controller){
        const event=(data:unknown)=>controller.enqueue(new TextEncoder().encode(`data: ${typeof data==='string'?data:JSON.stringify(data)}\n\n`));
        turn.delta=(text:string)=>{if(!ended)event({delta:text});};turn.finish=()=>{if(!ended){event({meta:{candidates}});event('[DONE]');}};
        options?.signal?.addEventListener('abort',()=>{turn.aborts++;if(!ended){ended=true;controller.error(new DOMException('Aborted','AbortError'));}},{once:true});
      },cancel(){ended=true;turn.cancels++;}});
      return Promise.resolve(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));
    };
  });
}
async function prepare(page:Page,lang:string){
  await page.setViewportSize({width:568,height:320});await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),lang==='zh');
  await page.goto(article(lang));await expect(root(page)).toHaveAttribute('data-chat-ready','true');await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await frames(page);
}
async function settled(page:Page,height:number){
  await page.setViewportSize({width:568,height});await expect(page.locator('#article-bottom-sheet')).toHaveClass(/abs--open/);
  await expect.poll(()=>page.locator('#article-bottom-sheet').evaluate(el=>{const style=getComputedStyle(el);return Number(style.opacity)===1&&(style.transform==='none'||Math.abs(new DOMMatrixReadOnly(style.transform).m42)<.1);})).toBe(true);await frames(page);
}
async function hit(page:Page,control:Locator,min=0){
  await expect(control).toBeVisible();const box=(await control.boundingBox())!,viewport=page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(-.1);expect(box.y).toBeGreaterThanOrEqual(-.1);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+.1);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+.1);expect(box.width).toBeGreaterThanOrEqual(min-.1);expect(box.height).toBeGreaterThanOrEqual(min-.1);
  expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);return box;
}
async function readPoint(page:Page){return page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}));}
async function selectedAnalysis(page:Page,lang:string){
  const passage=page.locator('.post-content p').filter({hasText:lang==='zh'?'先从一个意象讲起，它是这场讨论里最美的一块。':'Start with an image — the most beautiful thing in that whole conversation.'});
  await passage.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await frames(page);
  const selected=await passage.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);getSelection()!.removeAllRanges();getSelection()!.addRange(range);return range.toString();});
  await page.evaluate(()=>{const range=getSelection()!.getRangeAt(0),toolbar=document.querySelector('.asel-toolbar')!;const bottom=Math.max(...Array.from(range.getClientRects(),rect=>rect.bottom)),target=innerHeight-56-toolbar.getBoundingClientRect().height-16;if(bottom>target)scrollBy({top:bottom-target,behavior:'instant'});});await frames(page);
  const before=await readPoint(page);await page.locator('.asel-toolbar [data-asel-action="ai"]').click();await settled(page,320);await expect(input(page)).toBeFocused();expect(await readPoint(page)).toEqual(before);return selected;
}
async function lastReplyLine(page:Page){
  return root(page).locator('.rc-ai-answer-body').last().evaluate(el=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node:Node|null,last:Node|null=null;while((node=walker.nextNode()))if(node.textContent?.trim())last=node;if(!last)throw Error('No real reply text');
    const range=document.createRange();range.selectNodeContents(last);const rectangles=Array.from(range.getClientRects()),line=rectangles[rectangles.length-1],view=el.closest('.rc-ai-messages')!.getBoundingClientRect(),style=getComputedStyle(last.parentElement!);
    return{line:line.toJSON(),view:view.toJSON(),lineHeight:parseFloat(style.lineHeight),text:last.textContent};
  });
}
async function replyVisible(page:Page){
  const geometry=await lastReplyLine(page);expect(geometry.line.top).toBeGreaterThanOrEqual(geometry.view.top-.1);expect(geometry.line.bottom).toBeLessThanOrEqual(geometry.view.bottom+.1);expect(geometry.view.height).toBeGreaterThanOrEqual(geometry.lineHeight);
  expect(geometry.line.left).toBeGreaterThanOrEqual(geometry.view.left-.1);expect(geometry.line.right).toBeLessThanOrEqual(geometry.view.right+.1);
}
async function wheelTo(page:Page,control:Locator){
  for(let step=0;step<10;step++){
    const view=(await messages(page).boundingBox())!,box=(await control.boundingBox())!,delta=box.y<view.y+2?box.y-view.y-3:box.y+box.height>view.y+view.height-2?box.y+box.height-view.y-view.height+3:0;
    if(!delta)return;const before=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(view.x+view.width/2,view.y+view.height/2);await page.mouse.wheel(0,delta);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).not.toBe(before);await frames(page);
  }throw Error('The actual message scroller did not expose the requested action');
}

// The real renderer currently renders plain paragraphs, including fenced code
// and quote input. These exercise that existing behavior without injecting HTML.
test('short bilingual completed replies land on their actual final line; all three original suggestions and related links remain reachable',async({page})=>{
  await offlineAI(page);
  for(const lang of ['zh','en']){
    await prepare(page,lang);const answer=(tail:string)=>`An earlier controlled paragraph is long enough to wrap in the real conversation.\n\n${tail}`;
    const tails=['The final paragraph remains the primary reading destination.','```text\nA final code-shaped line remains readable.\n```','> A final quoted line remains readable.'];
    let selected='';
    for(let part=0;part<tails.length;part++){
      await page.evaluate(answer=>{(window as any).__replyLanding.answer=answer;},answer(tails[part]));
      if(part===0)selected=await selectedAnalysis(page,lang);else{await input(page).fill(`Next ending ${part}`);await input(page).press('Enter');}
      await expect.poll(()=>count(page)).toBe(part+1);await expect(root(page)).toHaveAttribute('aria-busy','false');await expect(choices(page)).toHaveCount(3);
      const original=await input(page).elementHandle();
      for(const height of [320,256,224]){
        await settled(page,height);await replyVisible(page);await hit(page,input(page));await hit(page,root(page).locator('.rc-ai-send'),44);expect(await input(page).evaluate((el,old)=>el===old,original)).toBe(true);
      }
      expect(await page.evaluate(()=>(window as any).__replyLanding.turns.at(-1).payload.selectedText)).toBe(selected);
    }
    const before=await readPoint(page),links=messages(page).locator('.ai-sources').last().locator('a');await expect(links).toHaveCount(2);
    await wheelTo(page,links.first());await hit(page,links.first());await links.first().evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));await expect(links.first()).toBeFocused();
    for(const height of [320,256,224]){await settled(page,height);await expect(links.first()).toBeFocused();await hit(page,links.first());}
    await page.keyboard.press('Tab');await expect(links.nth(1)).toBeFocused();await hit(page,links.nth(1));
    for(const choice of await choices(page).all()){
      await page.keyboard.press('Tab');await expect(choice).toBeFocused();await hit(page,choice,44);
    }
    const third=choices(page).nth(2);for(const height of [320,256,224]){await settled(page,height);await expect(third).toBeFocused();await hit(page,third,44);}
    await wheelTo(page,choices(page).first());await hit(page,choices(page).first(),44);await wheelTo(page,third);await hit(page,third,44);expect(await readPoint(page)).toEqual(before);
    const question=(await third.textContent())!,requests=await count(page);await mode(page,'held');await third.click();await expect.poll(()=>count(page)).toBe(requests+1);await expect(root(page)).toHaveAttribute('aria-busy','true');expect(await page.evaluate(()=>(window as any).__replyLanding.turns.at(-1).payload.question)).toBe(question);
    await root(page).locator('.article-chat-stop').click();await expect(root(page)).toHaveAttribute('aria-busy','false');expect(await count(page)).toBe(requests+1);await expect(input(page)).toBeFocused();expect(await readPoint(page)).toEqual(before);
  }
});

async function readingAnchor(page:Page){
  return messages(page).evaluate(el=>{
    const view=el.getBoundingClientRect(),paragraph=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>{const r=p.getBoundingClientRect();return r.top>=view.top+1&&r.bottom<=view.bottom-1;});if(!paragraph)throw Error('No fully visible real paragraph for the reading fixture');
    const range=document.createRange();range.setStart(paragraph.firstChild!,0);range.setEnd(paragraph.firstChild!,1);return{text:paragraph.textContent,top:range.getBoundingClientRect().top-view.top};
  });
}
async function alignUserReading(page:Page){
  const anchor=await readingAnchor(page),box=(await messages(page).boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  if(Math.abs(anchor.top-6)>1){await page.mouse.wheel(0,anchor.top-6);await expect.poll(async()=>Math.abs((await readingAnchor(page)).top-6)).toBeLessThanOrEqual(1);await frames(page);}
  return readingAnchor(page);
}
async function checkAnchor(page:Page,anchor:Awaited<ReturnType<typeof readingAnchor>>){
  const top=await messages(page).evaluate((el,text)=>{const paragraph=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>p.textContent===text)!;const range=document.createRange();range.setStart(paragraph.firstChild!,0);range.setEnd(paragraph.firstChild!,1);return range.getBoundingClientRect().top-el.getBoundingClientRect().top;},anchor.text);
  expect(Math.abs(top-anchor.top)).toBeLessThanOrEqual(1);
}

test('finishing a held long reply and resizing preserves a genuine wheel-owned reading anchor; a later wheel changes ownership',async({page})=>{
  await offlineAI(page);await prepare(page,'en');await mode(page,'held');await page.locator('#article-fab').click();await page.locator('#abs-tab-ai').click();await settled(page,320);await input(page).fill('Read this long answer');await input(page).press('Enter');await expect.poll(()=>count(page)).toBe(1);
  const text=Array.from({length:100},(_,index)=>`Reading paragraph ${String(index).padStart(3,'0')}. This controlled paragraph wraps inside the actual article conversation.`).join('\n\n');
  await page.evaluate(text=>(window as any).__replyLanding.turns[0].delta(text),text);await expect(root(page).locator('.rc-ai-answer-body p')).toHaveCount(100);
  const box=(await messages(page).boundingBox())!,bottom=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-2200);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).toBeLessThan(bottom-100);await frames(page);
  const anchor=await alignUserReading(page),before=await readPoint(page),original=await input(page).elementHandle();await expect(input(page)).toBeFocused();
  await page.evaluate(()=>(window as any).__replyLanding.turns[0].finish());await expect(root(page)).toHaveAttribute('aria-busy','false');await expect(choices(page)).toHaveCount(3);await checkAnchor(page,anchor);
  for(const height of [256,224,320]){await settled(page,height);await checkAnchor(page,anchor);expect(await readPoint(page)).toEqual(before);await expect(input(page)).toBeFocused();expect(await input(page).evaluate((el,old)=>el===old,original)).toBe(true);}
  const nextBox=(await messages(page).boundingBox())!,old=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(nextBox.x+nextBox.width/2,nextBox.y+nextBox.height/2);await page.mouse.wheel(0,-300);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).toBeLessThan(old-50);await frames(page);const next=await alignUserReading(page);expect(next.text).not.toBe(anchor.text);
  for(const height of [224,320]){await settled(page,height);await checkAnchor(page,next);expect(await readPoint(page)).toEqual(before);await expect(input(page)).toBeFocused();}
  const third=choices(page).nth(2);await wheelTo(page,third);await hit(page,third,44);const question=(await third.textContent())!;await third.click();await expect.poll(()=>count(page)).toBe(2);expect(await page.evaluate(()=>(window as any).__replyLanding.turns[1].payload.question)).toBe(question);expect(await page.evaluate(()=>(window as any).__replyLanding.turns[1].payload.context)).toEqual([{role:'user',content:'Read this long answer'},{role:'assistant',content:text}]);
  await root(page).locator('.article-chat-stop').click();await expect(root(page)).toHaveAttribute('aria-busy','false');expect(await page.evaluate(()=>(window as any).__replyLanding.turns[0].aborts)).toBe(0);expect(await page.evaluate(()=>(window as any).__replyLanding.turns[1].aborts)).toBe(1);expect(await readPoint(page)).toEqual(before);
});


test('initial lenses and later suggestions keep a bilingual two-line draft; only its direct Send consumes it',async({page})=>{
  await offlineAI(page);
  const snapshot=()=>input(page).evaluate((el:HTMLTextAreaElement)=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,scroll:el.scrollTop,height:el.getBoundingClientRect().height,styleHeight:el.style.height,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}));
  const owner=()=>page.evaluate(()=>{const active=document.activeElement;return{tag:active?.tagName,className:active?.className,ariaLabel:active?.getAttribute('aria-label'),insideChat:!!active?.closest('[data-article-chat]')};});
  const seed=async(label:string)=>{
    const draft=`${label}: ${'Keep this first draft line while reading. '.repeat(3).trim()}\n${'The second draft line is still mine. '.repeat(3).trim()}`;
    await input(page).fill(draft);await input(page).evaluate((el:HTMLTextAreaElement)=>{const start=el.value.indexOf('\n')+12;el.setSelectionRange(start,start+12,'backward');el.scrollTop=Math.max(0,el.scrollHeight-el.clientHeight-8);});return snapshot();
  };
  const preserved=async(before:Awaited<ReturnType<typeof snapshot>>,original:Awaited<ReturnType<Locator['elementHandle']>>)=>{
    const after=await snapshot();expect(after.value).toBe(before.value);expect([after.start,after.end,after.direction]).toEqual([before.start,before.end,before.direction]);expect(after.scroll).toBe(before.scroll);expect(Math.abs(after.height-before.height)).toBeLessThanOrEqual(.1);expect(after.styleHeight).toBe(before.styleHeight);expect(await input(page).evaluate((el,old)=>el===old,original)).toBe(true);return after;
  };
  for(const lang of ['zh','en']){
    await prepare(page,lang);await page.locator('#article-fab').click();await page.locator('#abs-tab-ai').click();await settled(page,320);const original=await input(page).elementHandle();
    const quickDraft=await seed(`${lang} initial lens`),quick=root(page).locator('[data-prompt]').first(),prompt=(await quick.getAttribute('data-prompt'))!;
    await quick.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await frames(page);await hit(page,quick,44);await quick.click();await expect.poll(()=>count(page)).toBe(1);await expect(root(page)).toHaveAttribute('aria-busy','false');
    await test.info().attach(`${lang}-initial-lens-draft`,{contentType:'application/json',body:JSON.stringify({before:quickDraft,after:await snapshot(),owner:await owner()},null,2)});
    await preserved(quickDraft,original);await expect(input(page)).toBeFocused();expect(await page.evaluate(()=>(window as any).__replyLanding.turns[0].payload.question)).toBe(prompt);await expect(choices(page)).toHaveCount(3);
    const followupDraft=await seed(`${lang} later suggestion`),choice=choices(page).nth(2),question=(await choice.textContent())!;await mode(page,'held');await wheelTo(page,choice);await hit(page,choice,44);await choice.click();await expect.poll(()=>count(page)).toBe(2);await expect(root(page)).toHaveAttribute('aria-busy','true');
    // The existing owner-aware handoff must happen before its focused group
    // is removed, keeping this exact editor and its selection in place.
    await test.info().attach(`${lang}-followup-draft-and-owner`,{contentType:'application/json',body:JSON.stringify({before:followupDraft,after:await snapshot(),owner:await owner()},null,2)});
    await preserved(followupDraft,original);await expect(input(page)).toBeFocused();expect(await page.evaluate(()=>(window as any).__replyLanding.turns[1].payload.question)).toBe(question);await hit(page,root(page).locator('.article-chat-stop'),44);
    await page.evaluate(()=>(window as any).__replyLanding.turns[1].delta('A controlled partial reply.'));await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('A controlled partial reply.');await preserved(followupDraft,original);await expect(input(page)).toBeFocused();
    await root(page).locator('.article-chat-stop').click();await expect(root(page)).toHaveAttribute('aria-busy','false');await preserved(followupDraft,original);expect(await page.evaluate(()=>(window as any).__replyLanding.turns[1].aborts)).toBe(1);
    await mode(page,'json');await root(page).locator('.rc-ai-send').click();await expect.poll(()=>count(page)).toBe(3);await expect(root(page)).toHaveAttribute('aria-busy','false');await expect(input(page)).toHaveValue('');expect(await page.evaluate(()=>(window as any).__replyLanding.turns[2].payload.question)).toBe(followupDraft.value);expect(await input(page).evaluate((el,old)=>el===old,original)).toBe(true);
  }
});
