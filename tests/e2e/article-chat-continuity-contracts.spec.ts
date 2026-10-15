import {test,expect,type Page} from '../helpers/frozen-site';

test.use({channel:'chromium',reducedMotion:'reduce'});
const article=(locale='zh')=>`${locale==='zh'?'/zh':''}/engineering/posts/use-go-tools-dlv/`;
const root=(page:Page)=>page.locator('[data-article-chat]');
const input=(page:Page)=>root(page).locator('.rc-ai-textarea');
const messages=(page:Page)=>root(page).locator('.rc-ai-messages');
const sheet=(page:Page)=>page.locator('#article-bottom-sheet');
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
async function prepare(page:Page,width=1440,locale='zh'){
  await page.setViewportSize({width,height:900});await page.goto(article(locale));await expect(root(page)).toHaveAttribute('data-chat-ready','true');
  await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await frames(page);
}
async function openAI(page:Page){
  if((page.viewportSize()?.width||0)>=1200)await page.locator('#rc-tab-ai').click();
  else {await page.locator('#article-fab').click();await page.locator('#abs-tab-ai').click();}
  await expect(input(page)).toBeVisible();
}
async function resize(page:Page,width:number){
  await page.setViewportSize({width,height:900});await expect.poll(()=>root(page).evaluate(el=>el.parentElement?.id)).toBe(width>=1200?'rc-panel-ai':'abs-panel-ai');await frames(page);
}
async function identities(page:Page){return {root:await root(page).elementHandle(),input:await input(page).elementHandle(),messages:await messages(page).elementHandle()};}
async function unchanged(page:Page,original:Awaited<ReturnType<typeof identities>>){
  expect(await root(page).evaluate((el,old)=>el===old,original.root)).toBe(true);expect(await input(page).evaluate((el,old)=>el===old,original.input)).toBe(true);expect(await messages(page).evaluate((el,old)=>el===old,original.messages)).toBe(true);
}
async function mockJSON(page:Page){
  const posts:any[]=[];await page.route('**/.netlify/functions/article-ai',route=>{posts.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:`Controlled answer ${posts.length}.`})});});return posts;
}
async function heldStream(page:Page){
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window),state:any={turns:[]};(window as any).__articleStreams=state;
    window.fetch=(input,options)=>{
      const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(new URL(address,location.href).pathname!=='/.netlify/functions/article-ai')return original(input,options);
      const turn:any={payload:JSON.parse(String(options?.body)),aborts:0,cancels:0};let ended=false;
      const stream=new ReadableStream<Uint8Array>({start(controller){
        turn.delta=(delta:string)=>{if(!ended)controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({delta})}\n\n`));};
        options?.signal?.addEventListener('abort',()=>{turn.aborts++;if(!ended){ended=true;controller.error(new DOMException('Aborted','AbortError'));}},{once:true});
      },cancel(){ended=true;turn.cancels++;}});
      state.turns.push(turn);return Promise.resolve(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));
    };
  });
}
const streamCount=(page:Page)=>page.evaluate(()=>(window as any).__articleStreams.turns.length);
const aborts=(page:Page)=>page.evaluate(()=>(window as any).__articleStreams.turns[0].aborts);
async function delta(page:Page,text:string){await page.evaluate(text=>(window as any).__articleStreams.turns[0].delta(text),text);}
async function analyze(page:Page,blockId:string,selectedText:string,question:string){
  await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('article:selection-analyze',{detail})),{blockId,selectedText,selectionContext:`Context for ${blockId}`,question});
}

for(const locale of ['zh','en'])test(`${locale} active draft, selection and the same nodes follow both directions repeatedly`,async({page})=>{
  const posts=await mockJSON(page);await prepare(page,1199,locale);await openAI(page);const original=await identities(page),draft=`${locale} — 尚未发送 / editing this same question`;
  await input(page).fill(draft);await input(page).evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(3,13,'backward'));
  for(const width of [1200,1199,1440,390,1200]){
    const y=await page.evaluate(()=>scrollY);await resize(page,width);await unchanged(page,original);await expect(input(page)).toBeFocused();await expect(input(page)).toHaveValue(draft);expect(await input(page).evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual([3,13,'backward']);expect(await page.evaluate(()=>scrollY)).toBe(y);
    await expect(page.locator(width>=1200?'#rc-tab-ai':'#abs-tab-ai')).toHaveAttribute('aria-selected','true');if(width<1200)await expect(sheet(page)).toHaveClass(/abs--open/);else expect(await sheet(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);
  }expect(posts).toHaveLength(0);
});

for(const from of [1199,1200])test(`${from}px non-AI tools use visible equivalent focus without opening AI`,async({page})=>{
  const posts=await mockJSON(page);await prepare(page,from);if(from<1200)await page.locator('#article-fab').click();await page.locator(from<1200?'#abs-tab-toc':'#rc-tab-toc').focus();const y=await page.evaluate(()=>scrollY);await resize(page,from<1200?1200:1199);
  await expect(page.locator(from<1200?'#rc-tab-toc':'#article-fab')).toBeFocused();await expect(sheet(page)).not.toHaveClass(/abs--open/);await expect(page.locator('#rc-tab-ai')).toHaveAttribute('aria-selected','false');await expect(page.locator('#abs-tab-ai')).toHaveAttribute('aria-selected','false');expect(await page.evaluate(()=>scrollY)).toBe(y);
  const nav=page.locator('[data-search-trigger="nav"]:visible').first();await nav.focus();await resize(page,from);await expect(nav).toBeFocused();await expect(sheet(page)).not.toHaveClass(/abs--open/);expect(posts).toHaveLength(0);
});

test('a completed general conversation remains the actual follow-up context in the other layout',async({page})=>{
  const posts=await mockJSON(page);await prepare(page);await openAI(page);const original=await identities(page);await input(page).fill('First general question');await input(page).press('Enter');await expect(root(page).locator('.rc-ai-answer-body')).toHaveText('Controlled answer 1.');
  await input(page).fill('Unsent follow-up draft');await resize(page,390);await unchanged(page,original);await expect(input(page)).toHaveValue('Unsent follow-up draft');await expect(input(page)).toBeFocused();await input(page).press('Enter');await expect.poll(()=>posts.length).toBe(2);
  expect(posts[1].context).toEqual([{role:'user',content:'First general question'},{role:'assistant',content:'Controlled answer 1.'}]);expect(posts[1].question).toBe('Unsent follow-up draft');expect(posts[1].selectedText).toBeUndefined();await expect(root(page).locator('.rc-ai-answer-body')).toHaveCount(2);
});

test('quoted A/B scopes and general history stay owned by one controller across layouts',async({page})=>{
  const posts=await mockJSON(page);await prepare(page,390);await openAI(page);const original=await identities(page);await input(page).fill('An unsent draft');
  await analyze(page,'passage-a','Quoted passage A','Explain A');await expect.poll(()=>posts.length).toBe(1);await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 1.');await expect(input(page)).toHaveValue('An unsent draft');await resize(page,1200);
  await input(page).fill('Follow up A');await input(page).press('Enter');await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 2.');expect(posts[1].context).toHaveLength(2);expect(posts[1].selectedText).toBe('Quoted passage A');expect(posts[1].selectionContext).toBe('Context for passage-a');
  await analyze(page,'passage-b','Quoted passage B','Explain B');await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 3.');expect(posts[2].context).toEqual([]);await resize(page,1199);
  await analyze(page,'passage-a','Quoted passage A','Return to A');await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 4.');expect(posts[3].context).toEqual([{role:'user',content:'Explain A'},{role:'assistant',content:'Controlled answer 1.'},{role:'user',content:'Follow up A'},{role:'assistant',content:'Controlled answer 2.'}]);expect(posts[3].selectedText).toBe('Quoted passage A');await unchanged(page,original);
  await root(page).locator('.article-chat-reference-clear').click();await input(page).fill('Back to the article');await input(page).press('Enter');await expect.poll(()=>posts.length).toBe(5);expect(posts[4].context).toEqual([]);expect(posts[4].selectedText).toBeUndefined();
});

test('a held long stream preserves the visible text anchor after user scroll and handoff, then Stop aborts once',async({page})=>{
  await heldStream(page);await prepare(page);await openAI(page);const original=await identities(page);await input(page).fill('Keep one streaming request');await input(page).press('Enter');await expect.poll(()=>streamCount(page)).toBe(1);
  const text=Array.from({length:100},(_,i)=>`Reading anchor paragraph ${String(i).padStart(3,'0')}. This controlled passage is long enough to wrap differently in each reading layout.`).join('\n\n');await delta(page,text);await expect(root(page).locator('.rc-ai-answer-body p')).toHaveCount(100);const stream=await root(page).locator('.rc-ai-msg--ai').last().elementHandle();
  const box=(await messages(page).boundingBox())!,atBottom=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-3000);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).toBeLessThan(atBottom-100);await frames(page);
  const anchor=await messages(page).evaluate(el=>{const view=el.getBoundingClientRect();const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>{const r=p.getBoundingClientRect();return r.top>=view.top+1&&r.bottom<=view.bottom-1;})!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return {text:p.textContent,top:range.getBoundingClientRect().top-view.top};});
  const checkAnchor=async()=>{const position=await messages(page).evaluate((el,text)=>{const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>p.textContent===text)!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return range.getBoundingClientRect().top-el.getBoundingClientRect().top;},anchor.text);expect(Math.abs(position-anchor.top)).toBeLessThanOrEqual(1);expect(await messages(page).evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeGreaterThan(90);};
  for(const width of [1199,1440,390]){await resize(page,width);await unchanged(page,original);await expect(input(page)).toBeFocused();await checkAnchor();expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);expect(await root(page).locator('.rc-ai-msg--ai').last().evaluate((el,old)=>el===old,stream)).toBe(true);}
  await delta(page,'\n\nA later chunk must not pull the reader to the bottom.');await expect(root(page).locator('.rc-ai-answer-body')).toContainText('A later chunk');await checkAnchor();
  const nextBox=(await messages(page).boundingBox())!,beforeSecondWheel=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(nextBox.x+nextBox.width/2,nextBox.y+nextBox.height/2);await page.mouse.wheel(0,-700);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).toBeLessThan(beforeSecondWheel-100);await frames(page);
  const nextAnchor=await messages(page).evaluate(el=>{const view=el.getBoundingClientRect();const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>{const r=p.getBoundingClientRect();return r.top>=view.top+1&&r.bottom<=view.bottom-1;})!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return {text:p.textContent,top:range.getBoundingClientRect().top-view.top};});expect(nextAnchor.text).not.toBe(anchor.text);
  const checkNextAnchor=async()=>{const position=await messages(page).evaluate((el,text)=>{const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>p.textContent===text)!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return range.getBoundingClientRect().top-el.getBoundingClientRect().top;},nextAnchor.text);expect(Math.abs(position-nextAnchor.top)).toBeLessThanOrEqual(1);expect(await messages(page).evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeGreaterThan(90);};
  for(const width of [1440,1199,390]){await resize(page,width);await unchanged(page,original);await checkNextAnchor();expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);expect(await root(page).locator('.rc-ai-msg--ai').last().evaluate((el,old)=>el===old,stream)).toBe(true);}
  await delta(page,'\n\nThe new reading position also survives a later chunk.');await expect(root(page).locator('.rc-ai-answer-body')).toContainText('The new reading position');await checkNextAnchor();
  const stop=root(page).locator('.article-chat-stop'),stopBox=(await stop.boundingBox())!;expect(stopBox.height).toBeGreaterThanOrEqual(44);expect(stopBox.width).toBeGreaterThanOrEqual(44);expect(await stop.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);await stop.click();await expect(root(page)).toHaveAttribute('aria-busy','false');expect(await aborts(page)).toBe(1);expect(await streamCount(page)).toBe(1);await unchanged(page,original);
});

test('synthetic composition and keyCode229 cannot submit while the same draft crosses layouts',async({page})=>{
  const posts=await mockJSON(page);await prepare(page,1199);await openAI(page);const original=await identities(page);await input(page).fill('正在选择中文候选');await input(page).dispatchEvent('compositionstart');await input(page).dispatchEvent('keydown',{key:'Enter',isComposing:true});await resize(page,1200);await input(page).dispatchEvent('keydown',{key:'Enter',keyCode:229});await expect(input(page)).toHaveValue('正在选择中文候选');await unchanged(page,original);expect(posts).toHaveLength(0);
  await input(page).dispatchEvent('compositionend');await input(page).press('Enter');await expect.poll(()=>posts.length).toBe(1);await expect(root(page).locator('.rc-ai-answer-body')).toHaveText('Controlled answer 1.');
});

test('layout handoff restores the exact overflow owner; an explicit compact Escape alone cancels the request',async({page})=>{
  await heldStream(page);await prepare(page);await page.evaluate(()=>document.body.style.setProperty('overflow','auto','important'));await openAI(page);const original=await identities(page);await input(page).fill('Still running');await input(page).press('Enter');await expect.poll(()=>streamCount(page)).toBe(1);await delta(page,'Controlled partial.');await expect(root(page).locator('.rc-ai-answer-body')).toHaveText('Controlled partial.');await input(page).fill('Preserve this unsent draft');
  await resize(page,1199);expect(await aborts(page)).toBe(0);await expect(sheet(page)).toHaveClass(/abs--open/);await resize(page,1200);expect(await aborts(page)).toBe(0);expect(await page.evaluate(()=>[document.body.style.getPropertyValue('overflow'),document.body.style.getPropertyPriority('overflow')])).toEqual(['auto','important']);
  await resize(page,1199);await input(page).press('Escape');await expect(sheet(page)).not.toHaveClass(/abs--open/);expect(await aborts(page)).toBe(1);await expect(page.locator('#article-fab')).toBeFocused();expect(await sheet(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await page.evaluate(()=>[document.body.style.getPropertyValue('overflow'),document.body.style.getPropertyPriority('overflow')])).toEqual(['auto','important']);await unchanged(page,original);await expect(input(page)).toHaveValue('Preserve this unsent draft');
  await page.locator('#article-fab').press('Enter');await expect(input(page)).toBeVisible();await expect(input(page)).toHaveValue('Preserve this unsent draft');expect(await streamCount(page)).toBe(1);await expect(root(page)).toHaveAttribute('aria-busy','false');
});

test('delayed shared initialization and two entry calls still create one root, controller and selection request',async({page})=>{
  const posts=await mockJSON(page);await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const root=document.querySelector('[data-article-chat]');const a=(window as any).ArticleChat.init(root,{prefix:'rc'}),b=(window as any).ArticleChat.init(root?.parentElement,{prefix:'abs'});(window as any).__sameChatEntry=!!a&&a===b;}));
  let release=()=>{},scripts=0;let gate:Promise<void>;await page.route(/\/js\/article-chat\.js(?:\?|$)/,async route=>{scripts++;await gate;await route.continue();});
  for(const width of [390,1440]){
    gate=new Promise<void>(resolve=>{release=resolve;});await page.setViewportSize({width,height:900});await page.goto(article(),{waitUntil:'commit'});await expect(root(page)).toHaveCount(1);await expect.poll(()=>scripts).toBe(width===390?1:2);const original=await identities(page);await page.setViewportSize({width:width===390?1200:1199,height:900});await page.setViewportSize({width,height:900});release();await page.waitForLoadState('domcontentloaded');await expect(root(page)).toHaveAttribute('data-chat-ready','true');await unchanged(page,original);expect(await page.evaluate(()=>(window as any).__sameChatEntry)).toBe(true);
    await expect(root(page).locator('textarea')).toHaveCount(1);await expect(input(page)).toHaveAttribute('maxlength','500');expect(await root(page).locator('[data-prompt]').count()).toBeGreaterThanOrEqual(6);await expect(page.locator('#rc-tab-ai')).toHaveAttribute('aria-selected','false');await expect(page.locator('#abs-tab-ai')).toHaveAttribute('aria-selected','false');await expect(sheet(page)).not.toHaveClass(/abs--open/);
    await analyze(page,'initialization-check','One controlled selected passage',`One action at ${width}`);await expect.poll(()=>posts.length).toBe(width===390?1:2);await expect(root(page).locator('.rc-ai-answer-body')).toHaveText(`Controlled answer ${posts.length}.`);
  }expect(scripts).toBe(2);
});

for(const entry of ['Send','quick chip'])test(`actual ${entry} clicks retain AI ownership across layouts until the user clicks outside`,async({page})=>{
  await heldStream(page);
  for(const from of [1440,390]){
    await prepare(page,from,'en');await openAI(page);const original=await identities(page),draft=`Unsent draft for ${entry} at ${from}`;await input(page).fill(draft);
    const control=entry==='Send'?root(page).locator('.rc-ai-send'):root(page).locator('[data-prompt]').first();const question=entry==='Send'?draft:(await control.getAttribute('data-prompt'))!;await control.click();
    await expect.poll(()=>streamCount(page)).toBe(1);await expect(control).toBeDisabled();await expect(root(page)).toHaveAttribute('aria-busy','true');expect(await page.evaluate(()=>(window as any).__articleStreams.turns[0].payload.question)).toBe(question);await expect(input(page)).toHaveValue(entry==='Send'?'':draft);
    const target=from===1440?1199:1440;await resize(page,target);await unchanged(page,original);await expect(input(page)).toBeVisible();await expect(input(page)).toBeFocused();await expect(root(page)).toHaveAttribute('aria-busy','true');await expect(page.locator(target>=1200?'#rc-tab-ai':'#abs-tab-ai')).toHaveAttribute('aria-selected','true');if(target<1200)await expect(sheet(page)).toHaveClass(/abs--open/);expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);
    await resize(page,1440);await unchanged(page,original);await expect(input(page)).toBeFocused();await expect(root(page)).toHaveAttribute('aria-busy','true');expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);
    const outside=page.locator('#theme-toggle');await outside.click();await expect(outside).toBeFocused();await resize(page,1199);await expect(outside).toBeFocused();await expect(sheet(page)).not.toHaveClass(/abs--open/);await unchanged(page,original);expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);await expect(input(page)).toHaveValue(entry==='Send'?'':draft);
  }
});

test('a real compact selection toolbar analysis owns focus, preserves the draft and closes with Escape',async({page})=>{
  await heldStream(page);await page.setViewportSize({width:390,height:900});await page.goto('/zh/growth/posts/2026-07-14-what-remains-when-taken-apart/');await expect(root(page)).toHaveAttribute('data-chat-ready','true');
  const passage=page.locator('.post-content p').filter({hasText:'先从一个意象讲起，它是这场讨论里最美的一块。'});await passage.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await frames(page);await openAI(page);const original=await identities(page),draft='Keep this unsent selection draft';await input(page).fill(draft);await input(page).evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(2,8,'backward'));await input(page).press('Escape');await expect(page.locator('#article-fab')).toBeFocused();
  for(const attempt of [0,1]){
    await passage.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);getSelection()!.removeAllRanges();getSelection()!.addRange(range);});const action=page.getByRole('toolbar').getByRole('button',{name:'AI 分析',exact:true});await expect(action).toBeVisible();await expect(page.locator('#article-fab')).toBeFocused();const y=await page.evaluate(()=>scrollY),quote=await passage.textContent();await action.click();
    await expect.poll(()=>streamCount(page)).toBe(attempt+1);await expect(input(page)).toBeFocused();await expect(sheet(page)).toHaveClass(/abs--open/);expect(await sheet(page).evaluate((el:HTMLElement)=>el.inert)).toBe(false);await unchanged(page,original);await expect(input(page)).toHaveValue(draft);expect(await input(page).evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual([2,8,'backward']);expect(await page.evaluate(()=>scrollY)).toBe(y);expect(await page.evaluate(index=>(window as any).__articleStreams.turns[index].payload.selectedText,attempt)).toBe(quote);await expect(root(page)).toHaveAttribute('aria-busy','true');
    await page.keyboard.press('Escape');await expect(sheet(page)).not.toHaveClass(/abs--open/);expect(await sheet(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);await expect(page.locator('#article-fab')).toBeFocused();await expect(root(page)).toHaveAttribute('aria-busy','false');expect(await page.evaluate(index=>(window as any).__articleStreams.turns[index].aborts,attempt)).toBe(1);expect(await page.evaluate(()=>scrollY)).toBe(y);await expect(input(page)).toHaveValue(draft);
  }
});
