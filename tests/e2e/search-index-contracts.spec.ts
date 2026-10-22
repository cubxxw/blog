import {test,expect,type Page,type Locator} from '../helpers/frozen-site';

test.use({channel:'chromium',reducedMotion:'reduce'});
type Doc={title:string,content:string,summary:string,tags:string[],permalink:string};
function documents(locale='zh',prefix='') : Doc[] {
  const base=locale==='zh'?'/zh':'';
  return ['Kubernetes','Delve'].flatMap(topic=>Array.from({length:10},(_,i)=>({title:`${prefix}${topic} fixture ${i}`,content:topic,summary:topic,tags:[topic],permalink:`${base}/engineering/posts/${topic==='Kubernetes'?'kubernetes-an-article-to-get-started-quickly':'use-go-tools-dlv'}/?fixture=${i}`})));
}
async function installIndex(page:Page) {
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window),state:any={turns:[],aiCalls:0};(window as any).__localIndex=state;
    window.fetch=(input,options)=>{
      const address=typeof input==='string'?input:input instanceof URL?input.href:input.url,url=new URL(address,location.href);
      if(url.pathname==='/.netlify/functions/blog-ai')state.aiCalls++;
      if(!['/index.json','/zh/index.json'].includes(url.pathname))return original(input,options);
      const turn:any={url:url.href,startedAt:Date.now(),aborts:0,jsonCalls:0};
      const body=new Promise((resolve,reject)=>{turn.body=resolve;turn.bodyError=reject;});
      options?.signal?.addEventListener('abort',()=>{turn.aborts++;},{once:true});
      const pending=new Promise<Response>(resolve=>{turn.headers=(status:number)=>{
        const response=new Response('[]',{status,headers:{'Content-Type':'application/json'}});
        Object.defineProperty(response,'json',{value:()=>{turn.jsonCalls++;return body;}});resolve(response);
      };});
      state.turns.push(turn);
      // Ignore abort deliberately: the production race must settle its UI
      // independently of a stuck fetch or a stuck Response.json().
      return pending;
    };
  });
}
async function prepare(page:Page,locale='zh',dark=false) {
  await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),dark);
  await page.goto(locale==='zh'?'/zh/articles/':'/articles/');
  if(dark)await expect(page.locator('body')).toHaveClass(/dark/);
  return page.locator('[data-search-trigger="nav"]:visible').first();
}
const turnCount=(page:Page)=>page.evaluate(()=>(window as any).__localIndex.turns.length);
const settlePromises=(page:Page)=>page.evaluate(async()=>{for(let i=0;i<8;i++)await Promise.resolve();});
async function reply(page:Page,index:number,data:Doc[],status=200) {
  await page.evaluate(({index,data,status})=>{const turn=(window as any).__localIndex.turns[index];turn.headers(status);if(status===200)turn.body(data);},{index,data,status});
}
const input=(page:Page)=>page.locator('.search-palette__input');
const options=(page:Page)=>page.locator('#search-results-list [role="option"]');
async function retryHit(retry:Locator) {
  const box=(await retry.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await retry.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  expect(await retry.evaluate(el=>getComputedStyle(el).fontSize)).toBe('14px');return box;
}

for(const view of [
  {width:390,height:844,locale:'zh',dark:true},{width:390,height:844,locale:'en',dark:false},
  {width:1440,height:900,locale:'zh',dark:false},{width:1440,height:900,locale:'en',dark:true},
])test.describe(`${view.width}px ${view.locale} ${view.dark?'dark':'light'} local search states`,()=>{
  test.use({viewport:{width:view.width,height:view.height},hasTouch:view.width===390,isMobile:view.width===390});
  test('loading, error, retry, calculation, real empty and idle have truthful content',async({page})=>{
    await installIndex(page);const trigger=await prepare(page,view.locale,view.dark),query=input(page),summary=page.locator('#search-result-summary'),status=page.locator('#search-empty'),retry=page.locator('#search-index-retry');
    await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);
    await expect(summary).toBeHidden();await expect(status).toHaveText(view.locale==='zh'?'正在准备搜索…':'Preparing search…');await expect(options(page)).toHaveCount(0);
    await expect(retry).toBeHidden();expect(new URL((await page.locator('#search-full-link').getAttribute('href'))!,page.url()).searchParams.get('q')).toBe('Kubernetes');
    await reply(page,0,[],503);await expect(status).toHaveText(view.locale==='zh'?'暂时无法搜索，请重试。':'Search is unavailable. Please try again.');
    await expect(query).toHaveAttribute('aria-busy','false');await expect(summary).toBeHidden();await expect(query).toHaveValue('Kubernetes');
    const box=await retryHit(retry);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(retry).toBeFocused();await expect(retry).toHaveAttribute('aria-disabled','true');
    expect(await retry.boundingBox()).toEqual(box);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(retry).toBeFocused();expect(await retry.boundingBox()).toEqual(box);await expect.poll(()=>turnCount(page)).toBe(2);await expect(status).toHaveText(view.locale==='zh'?'正在准备搜索…':'Preparing search…');
    await reply(page,1,documents(view.locale));await expect(options(page)).toHaveCount(10);await expect(query).toBeFocused();await expect(retry).toBeHidden();await expect(summary).toBeVisible();
    expect(await status.evaluate(el=>el.style.minHeight)).toBe('');
    await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
    await query.press('ArrowDown');await expect(query).toHaveAttribute('aria-activedescendant',/search-result-option/);await query.fill('Delve');
    await expect(options(page)).toHaveCount(0);await expect(query).not.toHaveAttribute('aria-activedescendant',/./);await expect(summary).toBeHidden();
    await expect(status).toHaveText(view.locale==='zh'?'正在搜索…':'Searching…');expect(new URL((await page.locator('#search-full-link').getAttribute('href'))!,page.url()).searchParams.get('q')).toBe('Delve');
    await page.clock.fastForward(149);await expect(options(page)).toHaveCount(0);await page.clock.fastForward(1);await expect(options(page)).toHaveCount(10);
    await expect(options(page).first()).toContainText('Delve');await expect(status).toBeHidden();
    await query.fill('zz_no_matching_topic_981254');await page.clock.fastForward(150);await expect(options(page)).toHaveCount(0);await expect(summary).toBeVisible();await expect(page.locator('#search-result-count')).toHaveText('0');
    await expect(status).toHaveText(view.locale==='zh'?'没有找到匹配结果':'No matching results');await expect(retry).toBeHidden();
    await query.fill('');await expect(summary).toBeHidden();await expect(status).toBeHidden();
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await trigger.press('Enter');await expect(query).toBeFocused();expect(await turnCount(page)).toBe(2);await expect(summary).toBeHidden();
    await expect(page.locator('.search-palette__eyebrow')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    expect(await page.evaluate(()=>(window as any).__localIndex.aiCalls)).toBe(0);
  });
});

for(const locale of ['zh','en'])test(`${locale} status text size 200% keeps the same Retry target through loading and timeout`,async({page})=>{
  await page.setViewportSize({width:390,height:844});await installIndex(page);await page.clock.install();const trigger=await prepare(page,locale),query=input(page),status=page.locator('#search-empty'),retry=page.locator('#search-index-retry');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);await reply(page,0,[],503);await expect(retry).toBeVisible();
  await status.evaluate(el=>el.style.fontSize=`${parseFloat(getComputedStyle(el).fontSize)*2}px`);const box=await retryHit(retry),beforeHeight=await status.evaluate(el=>el.getBoundingClientRect().height);
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(retry).toHaveAttribute('aria-disabled','true');await expect(retry).toBeFocused();expect(await retry.boundingBox()).toEqual(box);expect(await status.evaluate(el=>el.getBoundingClientRect().height)).toBe(beforeHeight);
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(retry).toBeFocused();expect(await turnCount(page)).toBe(2);expect(await retry.boundingBox()).toEqual(box);
  await page.clock.fastForward(15000);await expect(status).toHaveText(locale==='zh'?'搜索超时，请重试。':'Search timed out. Please try again.');await expect(retry).toHaveAttribute('aria-disabled','false');await expect(retry).toBeFocused();expect(await retry.boundingBox()).toEqual(box);expect(await status.evaluate(el=>el.getBoundingClientRect().height)).toBe(beforeHeight);
  await page.keyboard.press('Escape');expect(await status.evaluate(el=>el.style.minHeight)).toBe('');await trigger.press('Enter');await expect(query).toBeFocused();expect(await status.evaluate(el=>el.style.minHeight)).toBe('');await expect.poll(()=>turnCount(page)).toBe(3);
});

for(const late of ['fetch-failure','json-failure','json-success'] as const)test(`a late ${late} cannot overwrite the newer successful index`,async({page})=>{
  await installIndex(page);const trigger=await prepare(page),query=input(page);await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);
  if(late!=='fetch-failure'){await page.evaluate(()=>(window as any).__localIndex.turns[0].headers(200));await expect.poll(()=>page.evaluate(()=>(window as any).__localIndex.turns[0].jsonCalls)).toBe(1);}
  await page.keyboard.press('Escape');expect(await page.evaluate(()=>(window as any).__localIndex.turns[0].aborts)).toBe(1);
  await trigger.press('Enter');await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(2);await reply(page,1,documents('zh','Current '));await expect(options(page)).toHaveCount(10);await expect(options(page).first()).toContainText('Current Kubernetes');
  const before=await options(page).allTextContents();
  await page.evaluate(({late,data})=>{const old=(window as any).__localIndex.turns[0];if(late==='fetch-failure')old.headers(503);else if(late==='json-failure')old.bodyError(new Error('Old JSON failed'));else old.body(data);},{late,data:documents('zh','OLD ')});
  await settlePromises(page);
  await expect.poll(()=>options(page).allTextContents()).toEqual(before);await expect(page.locator('#search-empty')).toBeHidden();await expect(query).toHaveAttribute('aria-busy','false');await expect(query).toBeFocused();
});

for(const phase of ['headers','json'] as const)test(`the 15000ms total index deadline also releases a non-cooperating ${phase} stage`,async({page})=>{
  await installIndex(page);await page.clock.install();const trigger=await prepare(page),query=input(page);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);const startedAt=await page.evaluate(()=>(window as any).__localIndex.turns[0].startedAt);
  if(phase==='json'){await page.clock.fastForward(8000);await page.evaluate(()=>(window as any).__localIndex.turns[0].headers(200));await expect.poll(()=>page.evaluate(()=>(window as any).__localIndex.turns[0].jsonCalls)).toBe(1);}
  await page.clock.fastForward(phase==='json'?6999:14999);expect(await page.evaluate(()=>Date.now())-startedAt).toBe(14999);await expect(query).toHaveAttribute('aria-busy','true');await expect(page.locator('#search-empty')).toHaveText('正在准备搜索…');
  await page.clock.fastForward(1);expect(await page.evaluate(()=>Date.now())-startedAt).toBe(15000);await expect(query).toHaveAttribute('aria-busy','false');await expect(page.locator('#search-empty')).toHaveText('搜索超时，请重试。');await expect(query).toHaveValue('Kubernetes');
  expect(await page.evaluate(()=>(window as any).__localIndex.turns[0].aborts)).toBe(1);await expect(page.locator('#search-result-summary')).toBeHidden();
  const retry=page.locator('#search-index-retry');await retry.click();await retry.evaluate((el:HTMLButtonElement)=>el.click());await expect.poll(()=>turnCount(page)).toBe(2);await expect(retry).toBeFocused();
  const full=page.locator('#search-full-link');if(phase==='json')await full.focus();
  await reply(page,1,documents());await expect(options(page)).toHaveCount(10);await expect(phase==='headers'?query:full).toBeFocused();
  await page.evaluate(({phase,data})=>{const old=(window as any).__localIndex.turns[0];if(phase==='headers')old.headers(503);else old.body(data);},{phase,data:documents('zh','OLD ')});
  await settlePromises(page);
  await expect(options(page).first()).not.toContainText('OLD');await expect(query).toHaveAttribute('aria-busy','false');
  const urls=await page.evaluate(()=>(window as any).__localIndex.turns.map((turn:any)=>turn.url));
  for(const address of urls){const url=new URL(address);expect(url.origin).toBe(new URL(page.url()).origin);expect(url.pathname).toBe('/zh/index.json');}
});

test('pagehide preserves the open query and pageshow resumes without accepting the old index owner',async({page})=>{
  await installIndex(page);await page.clock.install();const trigger=await prepare(page),query=input(page);await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);
  const originalQuery=await query.elementHandle(),palette=page.locator('#search-command-palette');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(palette).toBeVisible();await expect(query).toHaveValue('Kubernetes');await expect(query).toHaveAttribute('aria-busy','false');expect(await query.evaluate((el,original)=>el===original,originalQuery)).toBe(true);expect(await page.evaluate(()=>(window as any).__localIndex.turns[0].aborts)).toBe(1);
  await page.clock.fastForward(20000);await reply(page,0,documents('zh','OLD '));await settlePromises(page);await expect(palette).toBeVisible();await expect(query).toHaveValue('Kubernetes');await expect(options(page)).toHaveCount(0);expect(await turnCount(page)).toBe(1);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect.poll(()=>turnCount(page)).toBe(2);await expect(query).toHaveValue('Kubernetes');expect(new URL((await page.locator('#search-full-link').getAttribute('href'))!,page.url()).searchParams.get('q')).toBe('Kubernetes');
  await reply(page,1,documents('zh','Current '));await expect(options(page)).toHaveCount(10);await expect(options(page).first()).toContainText('Current Kubernetes');await expect(options(page).first()).not.toContainText('OLD');await expect(query).toHaveAttribute('aria-busy','false');expect(await page.evaluate(()=>(window as any).__localIndex.aiCalls)).toBe(0);
});

test('pagehide and pageshow preserve a completed AI conversation, its draft and the next follow-up context',async({page})=>{
  await page.setViewportSize({width:390,height:844});await installIndex(page);
  const requests:any[]=[];const answer='Controlled first answer.';
  await page.route('**/.netlify/functions/blog-ai',route=>{requests.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:requests.length===1?answer:'Controlled follow-up answer.',candidates:[]})});});
  const trigger=await prepare(page),query=input(page);await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);await reply(page,0,documents());await expect(options(page)).toHaveCount(10);
  await page.locator('#search-ai-btn').click();const content=page.locator('#search-ai-content'),followup=content.locator('.search-palette__followup-input'),assistant=content.locator('.search-palette__conversation-message.assistant');
  await expect(assistant.locator('.search-palette__conversation-content')).toHaveText(answer);await expect(content).not.toHaveAttribute('aria-busy',/./);const draft='保留这段追问草稿';await followup.fill(draft);
  const originalFollowup=await followup.elementHandle(),originalAnswer=await assistant.elementHandle(),before=await content.innerHTML();
  for(const phase of ['pagehide','pageshow']){
    await page.evaluate(phase=>window.dispatchEvent(new PageTransitionEvent(phase,{persisted:true})),phase);
    await expect(page.locator('#search-command-palette')).toBeVisible();await expect(page.locator('#search-ai-box')).toBeVisible();await expect(query).toHaveValue('Kubernetes');await expect(followup).toHaveValue(draft);
    expect(await followup.evaluate((el,original)=>el===original,originalFollowup)).toBe(true);expect(await assistant.evaluate((el,original)=>el===original,originalAnswer)).toBe(true);expect(await content.innerHTML()).toBe(before);expect(requests).toHaveLength(1);
  }
  expect(await turnCount(page)).toBe(1);await followup.press('Enter');await expect.poll(()=>requests.length).toBe(2);expect(requests[1].question).toBe(draft);expect(requests[1].context).toEqual([{role:'user',content:'Kubernetes'},{role:'assistant',content:answer},{role:'user',content:draft}]);
  await expect(content.locator('.search-palette__conversation-message.assistant').last()).toContainText('Controlled follow-up answer.');expect(await page.evaluate(()=>(window as any).__localIndex.aiCalls)).toBe(2);
});

for(const missing of [false,true])test(`Enter within the debounce opens only the current ${missing?'full-search query':'matching article'}`,async({page})=>{
  await installIndex(page);const trigger=await prepare(page),query=input(page);await trigger.click();await query.fill('Kubernetes');await expect.poll(()=>turnCount(page)).toBe(1);await reply(page,0,documents());await expect(options(page)).toHaveCount(10);
  const old=(await options(page).first().getAttribute('href'))!;await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  const current=missing?'zz_no_matching_topic_981254':'Delve';await query.fill(current);await expect(options(page)).toHaveCount(0);expect(new URL((await page.locator('#search-full-link').getAttribute('href'))!,page.url()).searchParams.get('q')).toBe(current);
  const navigations:string[]=[];let aiRequests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/.netlify/functions/blog-ai')aiRequests++;});
  await page.route('**/*',route=>{if(route.request().isNavigationRequest()&&route.request().frame()===page.mainFrame()){navigations.push(route.request().url());return route.abort();}return route.fallback();});
  await query.dispatchEvent('keydown',{key:'Enter',isComposing:true});await query.dispatchEvent('keydown',{key:'Enter',keyCode:229});expect(navigations).toHaveLength(0);
  if(missing)await page.clock.fastForward(149);await query.press('Enter');await expect.poll(()=>navigations.length).toBe(1);
  const destination=new URL(navigations[0]);expect(destination.href).not.toBe(new URL(old,page.url()).href);
  if(missing){expect(destination.pathname).toBe('/zh/search/');expect(destination.searchParams.get('q')).toBe(current);}
  else expect(destination.pathname).toBe('/zh/engineering/posts/use-go-tools-dlv/');
  expect(aiRequests).toBe(0);
});

// Synthetic lifecycle coverage: an offline fetch/reader deliberately ignores
// abort/cancel. This verifies UI ownership, not a real browser BFCache entry.
for(const phase of ['pending-headers','partial-sse'] as const)test(`synthetic pagehide/pageshow leaves ${phase} AI recoverably stopped with its question and completed context`,async({page})=>{
  const locale=phase==='pending-headers'?'zh':'en';await page.setViewportSize({width:locale==='zh'?390:1440,height:locale==='zh'?844:900});await installIndex(page);
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window),state:any={turns:[]};(window as any).__lifecycleAI=state;
    window.fetch=(input,options)=>{
      const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
      if(new URL(address,location.href).pathname!=='/.netlify/functions/blog-ai')return original(input,options);
      const turn:any={payload:JSON.parse(String(options?.body)),aborts:0,cancels:0};state.turns.push(turn);
      options?.signal?.addEventListener('abort',()=>turn.aborts++,{once:true});
      return new Promise<Response>(resolve=>{
        turn.json=(answer:string)=>resolve(new Response(JSON.stringify({answer,candidates:[]}),{headers:{'Content-Type':'application/json'}}));
        turn.stream=()=>{
          let controller:ReadableStreamDefaultController<Uint8Array>;
          const stream=new ReadableStream<Uint8Array>({start(value){controller=value;}}),reader=stream.getReader();
          const response=new Response(null,{headers:{'Content-Type':'text/event-stream'}});
          Object.defineProperty(response,'body',{value:{getReader:()=>({read:()=>reader.read(),cancel:()=>{turn.cancels++;return Promise.resolve();},releaseLock:()=>reader.releaseLock()})}});
          turn.delta=(text:string)=>controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({delta:text})}\n\n`));
          turn.finish=()=>controller.close();resolve(response);
        };
      });
    };
  });
  const trigger=await prepare(page,locale),query=input(page),question='Kubernetes',answer='Completed context before the interruption.',followup='Keep this pending question.';
  await trigger.click();await query.fill(question);await expect.poll(()=>turnCount(page)).toBe(1);await reply(page,0,documents(locale));await expect(options(page)).toHaveCount(10);
  await page.locator('#search-ai-btn').click();await expect.poll(()=>page.evaluate(()=>(window as any).__lifecycleAI.turns.length)).toBe(1);
  await page.evaluate(answer=>(window as any).__lifecycleAI.turns[0].json(answer),answer);
  const content=page.locator('#search-ai-content');await expect(content).toContainText(answer);await expect(content).not.toHaveAttribute('aria-busy',/./);
  await content.locator('.search-palette__followup-input').fill(followup);await content.locator('.search-palette__followup-input').press('Enter');await expect.poll(()=>page.evaluate(()=>(window as any).__lifecycleAI.turns.length)).toBe(2);
  const partial='Retain this incomplete streamed sentence.';
  let partialNode;
  if(phase==='partial-sse'){
    await page.evaluate(()=>(window as any).__lifecycleAI.turns[1].stream());await expect(content.locator('#ai-streaming-target')).toBeAttached();
    await page.evaluate(partial=>(window as any).__lifecycleAI.turns[1].delta(partial),partial);await expect(content.locator('#ai-streaming-target')).toHaveText(partial);partialNode=await content.locator('#ai-streaming-target').elementHandle();
  }else await expect(content.locator('.search-palette__ai-loading')).toBeVisible();
  await expect(content).toHaveAttribute('aria-busy','true');await expect(page.locator('#search-ai-btn')).toBeDisabled();await expect(page.locator('#search-ai-stop')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  await expect(content).not.toHaveAttribute('aria-busy',/./);await expect(content.locator('.search-palette__ai-loading')).toHaveCount(0);await expect(page.locator('#search-ai-stop')).toBeHidden();await expect(page.locator('#search-ai-btn')).toBeEnabled();
  await expect(query).toHaveValue(question);await expect(content).toContainText(answer);await expect(content.locator('.search-palette__conversation-message.user').last()).toContainText(followup);
  const recovery=content.locator('[role="status"]');await expect(recovery).toContainText(locale==='zh'?'已停止生成，可以重试。':'Generation stopped. You can retry.');
  if(partialNode){expect(await content.locator('#ai-streaming-target').evaluate((el,original)=>el===original,partialNode)).toBe(true);await expect(content.locator('#ai-streaming-target')).toHaveText(partial);}
  expect(await page.evaluate(()=>(window as any).__lifecycleAI.turns[1].aborts)).toBe(1);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect(page.locator('#search-ai-btn')).toBeEnabled();expect(await page.evaluate(()=>(window as any).__lifecycleAI.turns.length)).toBe(2);
  const retry=recovery.getByRole('button',{name:locale==='zh'?'重试':'Retry',exact:true});await retry.click();await expect.poll(()=>page.evaluate(()=>(window as any).__lifecycleAI.turns.length)).toBe(3);await expect(query).toBeFocused();
  const expectedContext=[{role:'user',content:question},{role:'assistant',content:answer},{role:'user',content:followup}];
  expect(await page.evaluate(()=>(window as any).__lifecycleAI.turns[2].payload.context)).toEqual(expectedContext);expect(await page.evaluate(()=>(window as any).__lifecycleAI.turns[2].payload.question)).toBe(followup);
  await page.evaluate(()=>(window as any).__lifecycleAI.turns[2].json('Recovered answer.'));await expect(content).toContainText('Recovered answer.');await expect(content).not.toHaveAttribute('aria-busy',/./);await expect(page.locator('#search-ai-btn')).toBeEnabled();
  await page.evaluate(phase=>{const old=(window as any).__lifecycleAI.turns[1];if(phase==='pending-headers')old.json('OLD late answer');else{old.delta('OLD late answer');old.finish();}},phase);await settlePromises(page);
  await expect(content).toContainText('Recovered answer.');await expect(content).not.toContainText('OLD late answer');await expect(content.locator('[role="status"]')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__lifecycleAI.turns.length)).toBe(3);
});
