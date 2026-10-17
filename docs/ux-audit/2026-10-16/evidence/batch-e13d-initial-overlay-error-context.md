# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: article-chat-continuity-contracts.spec.ts >> actual quick chip clicks retain AI ownership across layouts until the user clicks outside
- Location: tests/e2e/article-chat-continuity-contracts.spec.ts:119:46

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for locator('#theme-toggle')
    - locator resolved to <button accesskey="t" id="theme-toggle" title="(Alt + T)" aria-label="Toggle theme">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div aria-hidden="true" id="article-sheet-overlay" class="abs-overlay abs-overlay--visible"></div> from <main role="main" class="main" id="main-content">…</main> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div aria-hidden="true" id="article-sheet-overlay" class="abs-overlay abs-overlay--visible"></div> from <main role="main" class="main" id="main-content">…</main> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    48 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div aria-hidden="true" id="article-sheet-overlay" class="abs-overlay abs-overlay--visible"></div> from <main role="main" class="main" id="main-content">…</main> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  26  | async function mockJSON(page:Page){
  27  |   const posts:any[]=[];await page.route('**/.netlify/functions/article-ai',route=>{posts.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:`Controlled answer ${posts.length}.`})});});return posts;
  28  | }
  29  | async function heldStream(page:Page){
  30  |   await page.addInitScript(()=>{
  31  |     const original=window.fetch.bind(window),state:any={turns:[]};(window as any).__articleStreams=state;
  32  |     window.fetch=(input,options)=>{
  33  |       const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  34  |       if(new URL(address,location.href).pathname!=='/.netlify/functions/article-ai')return original(input,options);
  35  |       const turn:any={payload:JSON.parse(String(options?.body)),aborts:0,cancels:0};let ended=false;
  36  |       const stream=new ReadableStream<Uint8Array>({start(controller){
  37  |         turn.delta=(delta:string)=>{if(!ended)controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({delta})}\n\n`));};
  38  |         options?.signal?.addEventListener('abort',()=>{turn.aborts++;if(!ended){ended=true;controller.error(new DOMException('Aborted','AbortError'));}},{once:true});
  39  |       },cancel(){ended=true;turn.cancels++;}});
  40  |       state.turns.push(turn);return Promise.resolve(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));
  41  |     };
  42  |   });
  43  | }
  44  | const streamCount=(page:Page)=>page.evaluate(()=>(window as any).__articleStreams.turns.length);
  45  | const aborts=(page:Page)=>page.evaluate(()=>(window as any).__articleStreams.turns[0].aborts);
  46  | async function delta(page:Page,text:string){await page.evaluate(text=>(window as any).__articleStreams.turns[0].delta(text),text);}
  47  | async function analyze(page:Page,blockId:string,selectedText:string,question:string){
  48  |   await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('article:selection-analyze',{detail})),{blockId,selectedText,selectionContext:`Context for ${blockId}`,question});
  49  | }
  50  | 
  51  | for(const locale of ['zh','en'])test(`${locale} active draft, selection and the same nodes follow both directions repeatedly`,async({page})=>{
  52  |   const posts=await mockJSON(page);await prepare(page,1199,locale);await openAI(page);const original=await identities(page),draft=`${locale} — 尚未发送 / editing this same question`;
  53  |   await input(page).fill(draft);await input(page).evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(3,13,'backward'));
  54  |   for(const width of [1200,1199,1440,390,1200]){
  55  |     const y=await page.evaluate(()=>scrollY);await resize(page,width);await unchanged(page,original);await expect(input(page)).toBeFocused();await expect(input(page)).toHaveValue(draft);expect(await input(page).evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual([3,13,'backward']);expect(await page.evaluate(()=>scrollY)).toBe(y);
  56  |     await expect(page.locator(width>=1200?'#rc-tab-ai':'#abs-tab-ai')).toHaveAttribute('aria-selected','true');if(width<1200)await expect(sheet(page)).toHaveClass(/abs--open/);else expect(await sheet(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);
  57  |   }expect(posts).toHaveLength(0);
  58  | });
  59  | 
  60  | for(const from of [1199,1200])test(`${from}px non-AI tools use visible equivalent focus without opening AI`,async({page})=>{
  61  |   const posts=await mockJSON(page);await prepare(page,from);if(from<1200)await page.locator('#article-fab').click();await page.locator(from<1200?'#abs-tab-toc':'#rc-tab-toc').focus();const y=await page.evaluate(()=>scrollY);await resize(page,from<1200?1200:1199);
  62  |   await expect(page.locator(from<1200?'#rc-tab-toc':'#article-fab')).toBeFocused();await expect(sheet(page)).not.toHaveClass(/abs--open/);await expect(page.locator('#rc-tab-ai')).toHaveAttribute('aria-selected','false');await expect(page.locator('#abs-tab-ai')).toHaveAttribute('aria-selected','false');expect(await page.evaluate(()=>scrollY)).toBe(y);
  63  |   const nav=page.locator('[data-search-trigger="nav"]:visible').first();await nav.focus();await resize(page,from);await expect(nav).toBeFocused();await expect(sheet(page)).not.toHaveClass(/abs--open/);expect(posts).toHaveLength(0);
  64  | });
  65  | 
  66  | test('a completed general conversation remains the actual follow-up context in the other layout',async({page})=>{
  67  |   const posts=await mockJSON(page);await prepare(page);await openAI(page);const original=await identities(page);await input(page).fill('First general question');await input(page).press('Enter');await expect(root(page).locator('.rc-ai-answer-body')).toHaveText('Controlled answer 1.');
  68  |   await input(page).fill('Unsent follow-up draft');await resize(page,390);await unchanged(page,original);await expect(input(page)).toHaveValue('Unsent follow-up draft');await expect(input(page)).toBeFocused();await input(page).press('Enter');await expect.poll(()=>posts.length).toBe(2);
  69  |   expect(posts[1].context).toEqual([{role:'user',content:'First general question'},{role:'assistant',content:'Controlled answer 1.'}]);expect(posts[1].question).toBe('Unsent follow-up draft');expect(posts[1].selectedText).toBeUndefined();await expect(root(page).locator('.rc-ai-answer-body')).toHaveCount(2);
  70  | });
  71  | 
  72  | test('quoted A/B scopes and general history stay owned by one controller across layouts',async({page})=>{
  73  |   const posts=await mockJSON(page);await prepare(page,390);await openAI(page);const original=await identities(page);await input(page).fill('An unsent draft');
  74  |   await analyze(page,'passage-a','Quoted passage A','Explain A');await expect.poll(()=>posts.length).toBe(1);await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 1.');await expect(input(page)).toHaveValue('An unsent draft');await resize(page,1200);
  75  |   await input(page).fill('Follow up A');await input(page).press('Enter');await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 2.');expect(posts[1].context).toHaveLength(2);expect(posts[1].selectedText).toBe('Quoted passage A');expect(posts[1].selectionContext).toBe('Context for passage-a');
  76  |   await analyze(page,'passage-b','Quoted passage B','Explain B');await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 3.');expect(posts[2].context).toEqual([]);await resize(page,1199);
  77  |   await analyze(page,'passage-a','Quoted passage A','Return to A');await expect(root(page).locator('.rc-ai-answer-body').last()).toHaveText('Controlled answer 4.');expect(posts[3].context).toEqual([{role:'user',content:'Explain A'},{role:'assistant',content:'Controlled answer 1.'},{role:'user',content:'Follow up A'},{role:'assistant',content:'Controlled answer 2.'}]);expect(posts[3].selectedText).toBe('Quoted passage A');await unchanged(page,original);
  78  |   await root(page).locator('.article-chat-reference-clear').click();await input(page).fill('Back to the article');await input(page).press('Enter');await expect.poll(()=>posts.length).toBe(5);expect(posts[4].context).toEqual([]);expect(posts[4].selectedText).toBeUndefined();
  79  | });
  80  | 
  81  | test('a held long stream preserves the visible text anchor after user scroll and handoff, then Stop aborts once',async({page})=>{
  82  |   await heldStream(page);await prepare(page);await openAI(page);const original=await identities(page);await input(page).fill('Keep one streaming request');await input(page).press('Enter');await expect.poll(()=>streamCount(page)).toBe(1);
  83  |   const text=Array.from({length:100},(_,i)=>`Reading anchor paragraph ${String(i).padStart(3,'0')}. This controlled passage is long enough to wrap differently in each reading layout.`).join('\n\n');await delta(page,text);await expect(root(page).locator('.rc-ai-answer-body p')).toHaveCount(100);const stream=await root(page).locator('.rc-ai-msg--ai').last().elementHandle();
  84  |   const box=(await messages(page).boundingBox())!,atBottom=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-3000);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).toBeLessThan(atBottom-100);await frames(page);
  85  |   const anchor=await messages(page).evaluate(el=>{const view=el.getBoundingClientRect();const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>{const r=p.getBoundingClientRect();return r.top>=view.top+1&&r.bottom<=view.bottom-1;})!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return {text:p.textContent,top:range.getBoundingClientRect().top-view.top};});
  86  |   const checkAnchor=async()=>{const position=await messages(page).evaluate((el,text)=>{const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>p.textContent===text)!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return range.getBoundingClientRect().top-el.getBoundingClientRect().top;},anchor.text);expect(Math.abs(position-anchor.top)).toBeLessThanOrEqual(1);expect(await messages(page).evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeGreaterThan(90);};
  87  |   for(const width of [1199,1440,390]){await resize(page,width);await unchanged(page,original);await expect(input(page)).toBeFocused();await checkAnchor();expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);expect(await root(page).locator('.rc-ai-msg--ai').last().evaluate((el,old)=>el===old,stream)).toBe(true);}
  88  |   await delta(page,'\n\nA later chunk must not pull the reader to the bottom.');await expect(root(page).locator('.rc-ai-answer-body')).toContainText('A later chunk');await checkAnchor();
  89  |   const nextBox=(await messages(page).boundingBox())!,beforeSecondWheel=await messages(page).evaluate(el=>el.scrollTop);await page.mouse.move(nextBox.x+nextBox.width/2,nextBox.y+nextBox.height/2);await page.mouse.wheel(0,-700);await expect.poll(()=>messages(page).evaluate(el=>el.scrollTop)).toBeLessThan(beforeSecondWheel-100);await frames(page);
  90  |   const nextAnchor=await messages(page).evaluate(el=>{const view=el.getBoundingClientRect();const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>{const r=p.getBoundingClientRect();return r.top>=view.top+1&&r.bottom<=view.bottom-1;})!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return {text:p.textContent,top:range.getBoundingClientRect().top-view.top};});expect(nextAnchor.text).not.toBe(anchor.text);
  91  |   const checkNextAnchor=async()=>{const position=await messages(page).evaluate((el,text)=>{const p=Array.from(el.querySelectorAll('.rc-ai-answer-body p')).find(p=>p.textContent===text)!;const range=document.createRange();range.setStart(p.firstChild!,0);range.setEnd(p.firstChild!,1);return range.getBoundingClientRect().top-el.getBoundingClientRect().top;},nextAnchor.text);expect(Math.abs(position-nextAnchor.top)).toBeLessThanOrEqual(1);expect(await messages(page).evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeGreaterThan(90);};
  92  |   for(const width of [1440,1199,390]){await resize(page,width);await unchanged(page,original);await checkNextAnchor();expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);expect(await root(page).locator('.rc-ai-msg--ai').last().evaluate((el,old)=>el===old,stream)).toBe(true);}
  93  |   await delta(page,'\n\nThe new reading position also survives a later chunk.');await expect(root(page).locator('.rc-ai-answer-body')).toContainText('The new reading position');await checkNextAnchor();
  94  |   const stop=root(page).locator('.article-chat-stop'),stopBox=(await stop.boundingBox())!;expect(stopBox.height).toBeGreaterThanOrEqual(44);expect(stopBox.width).toBeGreaterThanOrEqual(44);expect(await stop.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);await stop.click();await expect(root(page)).toHaveAttribute('aria-busy','false');expect(await aborts(page)).toBe(1);expect(await streamCount(page)).toBe(1);await unchanged(page,original);
  95  | });
  96  | 
  97  | test('synthetic composition and keyCode229 cannot submit while the same draft crosses layouts',async({page})=>{
  98  |   const posts=await mockJSON(page);await prepare(page,1199);await openAI(page);const original=await identities(page);await input(page).fill('正在选择中文候选');await input(page).dispatchEvent('compositionstart');await input(page).dispatchEvent('keydown',{key:'Enter',isComposing:true});await resize(page,1200);await input(page).dispatchEvent('keydown',{key:'Enter',keyCode:229});await expect(input(page)).toHaveValue('正在选择中文候选');await unchanged(page,original);expect(posts).toHaveLength(0);
  99  |   await input(page).dispatchEvent('compositionend');await input(page).press('Enter');await expect.poll(()=>posts.length).toBe(1);await expect(root(page).locator('.rc-ai-answer-body')).toHaveText('Controlled answer 1.');
  100 | });
  101 | 
  102 | test('layout handoff restores the exact overflow owner; an explicit compact Escape alone cancels the request',async({page})=>{
  103 |   await heldStream(page);await prepare(page);await page.evaluate(()=>document.body.style.setProperty('overflow','auto','important'));await openAI(page);const original=await identities(page);await input(page).fill('Still running');await input(page).press('Enter');await expect.poll(()=>streamCount(page)).toBe(1);await delta(page,'Controlled partial.');await expect(root(page).locator('.rc-ai-answer-body')).toHaveText('Controlled partial.');await input(page).fill('Preserve this unsent draft');
  104 |   await resize(page,1199);expect(await aborts(page)).toBe(0);await expect(sheet(page)).toHaveClass(/abs--open/);await resize(page,1200);expect(await aborts(page)).toBe(0);expect(await page.evaluate(()=>[document.body.style.getPropertyValue('overflow'),document.body.style.getPropertyPriority('overflow')])).toEqual(['auto','important']);
  105 |   await resize(page,1199);await input(page).press('Escape');await expect(sheet(page)).not.toHaveClass(/abs--open/);expect(await aborts(page)).toBe(1);await expect(page.locator('#article-fab')).toBeFocused();expect(await sheet(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await page.evaluate(()=>[document.body.style.getPropertyValue('overflow'),document.body.style.getPropertyPriority('overflow')])).toEqual(['auto','important']);await unchanged(page,original);await expect(input(page)).toHaveValue('Preserve this unsent draft');
  106 |   await page.locator('#article-fab').press('Enter');await expect(input(page)).toBeVisible();await expect(input(page)).toHaveValue('Preserve this unsent draft');expect(await streamCount(page)).toBe(1);await expect(root(page)).toHaveAttribute('aria-busy','false');
  107 | });
  108 | 
  109 | test('delayed shared initialization and two entry calls still create one root, controller and selection request',async({page})=>{
  110 |   const posts=await mockJSON(page);await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const root=document.querySelector('[data-article-chat]');const a=(window as any).ArticleChat.init(root,{prefix:'rc'}),b=(window as any).ArticleChat.init(root?.parentElement,{prefix:'abs'});(window as any).__sameChatEntry=!!a&&a===b;}));
  111 |   let release=()=>{},scripts=0;let gate:Promise<void>;await page.route(/\/js\/article-chat\.js(?:\?|$)/,async route=>{scripts++;await gate;await route.continue();});
  112 |   for(const width of [390,1440]){
  113 |     gate=new Promise<void>(resolve=>{release=resolve;});await page.setViewportSize({width,height:900});await page.goto(article(),{waitUntil:'commit'});await expect(root(page)).toHaveCount(1);await expect.poll(()=>scripts).toBe(width===390?1:2);const original=await identities(page);await page.setViewportSize({width:width===390?1200:1199,height:900});await page.setViewportSize({width,height:900});release();await page.waitForLoadState('domcontentloaded');await expect(root(page)).toHaveAttribute('data-chat-ready','true');await unchanged(page,original);expect(await page.evaluate(()=>(window as any).__sameChatEntry)).toBe(true);
  114 |     await expect(root(page).locator('textarea')).toHaveCount(1);await expect(input(page)).toHaveAttribute('maxlength','500');expect(await root(page).locator('[data-prompt]').count()).toBeGreaterThanOrEqual(6);await expect(page.locator('#rc-tab-ai')).toHaveAttribute('aria-selected','false');await expect(page.locator('#abs-tab-ai')).toHaveAttribute('aria-selected','false');await expect(sheet(page)).not.toHaveClass(/abs--open/);
  115 |     await analyze(page,'initialization-check','One controlled selected passage',`One action at ${width}`);await expect.poll(()=>posts.length).toBe(width===390?1:2);await expect(root(page).locator('.rc-ai-answer-body')).toHaveText(`Controlled answer ${posts.length}.`);
  116 |   }expect(scripts).toBe(2);
  117 | });
  118 | 
  119 | for(const entry of ['Send','quick chip'])test(`actual ${entry} clicks retain AI ownership across layouts until the user clicks outside`,async({page})=>{
  120 |   await heldStream(page);
  121 |   for(const from of [1440,390]){
  122 |     await prepare(page,from,'en');await openAI(page);const original=await identities(page),draft=`Unsent draft for ${entry} at ${from}`;await input(page).fill(draft);
  123 |     const control=entry==='Send'?root(page).locator('.rc-ai-send'):root(page).locator('[data-prompt]').first();const question=entry==='Send'?draft:(await control.getAttribute('data-prompt'))!;await control.click();
  124 |     await expect.poll(()=>streamCount(page)).toBe(1);await expect(control).toBeDisabled();await expect(root(page)).toHaveAttribute('aria-busy','true');expect(await page.evaluate(()=>(window as any).__articleStreams.turns[0].payload.question)).toBe(question);await expect(input(page)).toHaveValue(entry==='Send'?'':draft);
  125 |     const target=from===1440?1199:1440;await resize(page,target);await unchanged(page,original);await expect(input(page)).toBeVisible();await expect(input(page)).toBeFocused();await expect(root(page)).toHaveAttribute('aria-busy','true');await expect(page.locator(target>=1200?'#rc-tab-ai':'#abs-tab-ai')).toHaveAttribute('aria-selected','true');if(target<1200)await expect(sheet(page)).toHaveClass(/abs--open/);expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);
> 126 |     const outside=page.locator('#theme-toggle');await outside.click();await expect(outside).toBeFocused();await resize(page,from);await expect(outside).toBeFocused();await expect(sheet(page)).not.toHaveClass(/abs--open/);await unchanged(page,original);expect(await streamCount(page)).toBe(1);expect(await aborts(page)).toBe(0);await expect(input(page)).toHaveValue(entry==='Send'?'':draft);
      |                                                               ^ Error: locator.click: Test ended.
  127 |   }
  128 | });
  129 | 
```