import {test,expect,Page} from '../helpers/frozen-site';

test.use({reducedMotion:'reduce'});

async function installTransport(page:Page,mode='sse',cancelNever=false) {
  await page.addInitScript(({mode,cancelNever})=>{
    const original=window.fetch.bind(window),encoder=new TextEncoder();
    const state:any={mode,turns:[],
      push(index:number,value:string) {try{this.turns[index].controller.enqueue(encoder.encode(value));return true;}catch{return false;}},
      event(index:number,payload:unknown) {return this.push(index,'data: '+JSON.stringify(payload)+'\n\n');},
      done(index:number) {return this.push(index,'data: [DONE]\n\n');},
      headers(index:number) {this.turns[index].resolve(this.turns[index].response);},
      json(index:number,value:unknown) {this.push(index,JSON.stringify(value));try{this.turns[index].controller.close();}catch{}},
    };
    (window as any).homeRecovery=state;
    window.fetch=(input,options)=>{
      if(!String(input).includes('/.netlify/functions/blog-ai'))return original(input,options);
      const turn:any={payload:JSON.parse(String(options?.body)),startedAt:Date.now(),aborts:0,cancels:0};
      state.turns.push(turn);
      options?.signal?.addEventListener('abort',()=>{turn.aborts++;},{once:true});
      // Deliberately ignore AbortSignal and optionally never settle cancel().
      // The production race must release UI independently of this transport.
      turn.response=new Response(new ReadableStream<Uint8Array>({
        start(controller){turn.controller=controller;},
        cancel(){turn.cancels++;if(cancelNever)return new Promise(()=>{});},
      }),{headers:{'Content-Type':state.mode==='json'?'application/json':'text/event-stream'}});
      return state.mode==='headers'?new Promise<Response>(resolve=>{turn.resolve=resolve;}):Promise.resolve(turn.response);
    };
  },{mode,cancelNever});
}

async function open(page:Page,locale='zh') {
  await page.goto(locale==='zh'?'/zh/':'/');await page.locator('#hp-avatar-btn').click();
  await expect(page.locator('#hp-chat-input')).toBeFocused();
}
async function count(page:Page) {return page.evaluate(()=>(window as any).homeRecovery.turns.length);}
async function pauseBeforeRequest(page:Page) {
  // install() lets time advance with the real clock. Pause only after the
  // modules and chat are ready, before production creates its deadline.
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
}
async function elapsed(page:Page,index=0) {return page.evaluate(index=>Date.now()-(window as any).homeRecovery.turns[index].startedAt,index);}
async function answer(page:Page,index:number,text:string,done=true) {
  await page.evaluate(({index,text,done})=>{const state=(window as any).homeRecovery;state.event(index,{delta:text});if(done)state.done(index);},{index,text,done});
}
async function expectIdle(page:Page) {
  await expect(page.locator('#hp-chat-input')).toBeEnabled();await expect(page.locator('#hp-chat-body')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#hp-chat-send')).toHaveAttribute('data-action','send');
}

for(const locale of ['zh','en'])test(`${locale} draft survives close and IME Enter/Escape retains composition`,async({page})=>{
  await installTransport(page);await open(page,locale);
  const input=page.locator('#hp-chat-input'),draft='保留未发送的文字 & "quoted" draft';await input.fill(draft);
  for(const event of [{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'Escape',isComposing:true},{key:'Escape',keyCode:229}]) {
    await input.dispatchEvent('keydown',{...event,bubbles:true,cancelable:true});
  }
  expect(await count(page)).toBe(0);await expect(input).toHaveValue(draft);await expect(input).toBeFocused();
  await page.locator('#hp-chat-close').click();await page.locator('#hp-avatar-btn').click();await expect(input).toHaveValue(draft);
  await expect(page.locator('#hp-chat-send')).toBeEnabled();await input.press('Enter');await expect.poll(()=>count(page)).toBe(1);
  await answer(page,0,'A completed, controlled answer.');await expectIdle(page);await expect(input).toHaveValue('');
  await input.fill('next unsent draft');await page.locator('#hp-chat-close').click();await page.locator('#hp-avatar-btn').click();
  await expect(input).toHaveValue('next unsent draft');await page.locator('#hp-chat-clear').click();
  await expect(input).toHaveValue('');await expect(page.locator('#hp-chat-body')).not.toContainText(draft);expect(await count(page)).toBe(1);
});

test('a 25s header stall unlocks retry and a late response cannot overwrite it',async({page})=>{
  await page.clock.install();await installTransport(page,'headers',true);await open(page);
  await pauseBeforeRequest(page);
  await page.locator('#hp-chat-input').fill('header timeout question');await page.locator('#hp-chat-input').press('Enter');await expect.poll(()=>count(page)).toBe(1);
  await page.clock.fastForward(24999);expect(await elapsed(page)).toBe(24999);await expect(page.locator('#hp-chat-body')).toHaveAttribute('aria-busy','true');
  await page.clock.fastForward(1);expect(await elapsed(page)).toBe(25000);await expectIdle(page);await expect(page.locator('.hp-bear-chat-recovery')).toContainText('超时');
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[0].aborts)).toBe(1);
  await page.evaluate(()=>{const state=(window as any).homeRecovery;state.mode='sse';state.headers(0);});
  await expect.poll(()=>page.evaluate(()=>(window as any).homeRecovery.turns[0].cancels)).toBe(1);
  await page.locator('#hp-chat-retry').click();await expect.poll(()=>count(page)).toBe(2);
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[1].payload.context)).toEqual([]);
  await answer(page,1,'Retry succeeds.');await expectIdle(page);await expect(page.locator('#hp-chat-body')).toContainText('Retry succeeds.');
  await expect(page.locator('#hp-chat-retry')).toHaveCount(0);
});

for(const partial of [false,true])test(`SSE idle deadline covers ${partial?'a later chunk':'the first chunk'} without awaiting stuck cancellation`,async({page})=>{
  await page.clock.install();await installTransport(page,'sse',true);await open(page);
  await pauseBeforeRequest(page);
  await page.locator('#hp-chat-input').fill('stream timeout question');await page.locator('#hp-chat-input').press('Enter');await expect.poll(()=>count(page)).toBe(1);
  if(partial) {
    await page.clock.fastForward(20000);await answer(page,0,'已收到的片段。',false);
    await expect(page.locator('#hp-chat-body .hp-bear-chat-bubble')).toContainText(['stream timeout question','已收到的片段。']);
  }
  await page.clock.fastForward(24999);expect(await elapsed(page)).toBe(partial?44999:24999);await expect(page.locator('#hp-chat-body')).toHaveAttribute('aria-busy','true');
  await page.clock.fastForward(1);expect(await elapsed(page)).toBe(partial?45000:25000);await expectIdle(page);await expect(page.locator('.hp-bear-chat-recovery')).toContainText('超时');
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[0].cancels)).toBe(1);
  await expect(page.locator('#hp-chat-body')).toContainText('stream timeout question');
  if(partial)await expect(page.locator('.hp-bear-chat-msg-bear .hp-bear-chat-bubble')).toHaveText('已收到的片段。');
  await expect(page.locator('.hp-bear-chat-bubble')).not.toContainText(['等待回复超时']);
  await page.locator('#hp-chat-retry').click();await expect.poll(()=>count(page)).toBe(2);
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[1].payload.context)).toEqual([]);
  await answer(page,1,'Recovered stream.');await expectIdle(page);await expect(page.locator('#hp-chat-body')).toContainText('Recovered stream.');
});

test('a JSON body stall also races the idle deadline and ignores late JSON',async({page})=>{
  await page.clock.install();await installTransport(page,'json');await open(page,'en');
  await pauseBeforeRequest(page);
  await page.locator('#hp-chat-input').fill('json timeout question');await page.locator('#hp-chat-input').press('Enter');await expect.poll(()=>count(page)).toBe(1);
  await page.clock.fastForward(25000);await expectIdle(page);await expect(page.locator('.hp-bear-chat-recovery')).toContainText('timed out');
  await page.evaluate(()=>(window as any).homeRecovery.json(0,{answer:'STALE_JSON'}));
  await expect(page.locator('#hp-chat-body')).not.toContainText('STALE_JSON');await expectIdle(page);
});

test('short-screen Stop is the enabled sender target and preserves a partial answer for retry',async({page})=>{
  await page.setViewportSize({width:568,height:256});await installTransport(page,'sse',true);await open(page);
  const send=page.locator('#hp-chat-send'),before=(await send.boundingBox())!;
  await page.locator('#hp-chat-input').fill('stop this question');await page.locator('#hp-chat-input').press('Enter');await expect.poll(()=>count(page)).toBe(1);
  await answer(page,0,'需要保留的部分回答。',false);
  const stop=page.getByRole('button',{name:'停止回复',exact:true});await expect(stop).toBeEnabled();await expect(page.locator('#hp-chat-input')).toBeDisabled();
  const box=(await stop.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(box.x-before.x)).toBeLessThan(1);expect(Math.abs(box.y-before.y)).toBeLessThan(1);
  expect(box.y).toBeGreaterThanOrEqual(53);expect(box.y+box.height).toBeLessThanOrEqual(244);
  expect(await stop.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expectIdle(page);
  await expect(page.locator('.hp-bear-chat-recovery')).toContainText('已停止');
  await expect(page.locator('.hp-bear-chat-msg-bear .hp-bear-chat-bubble')).toHaveText('需要保留的部分回答。');
  await expect(page.locator('#hp-chat-body')).toContainText('stop this question');await expect(page.locator('#hp-chat-body')).not.toContainText('已送达');
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[0].aborts)).toBe(1);
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[0].cancels)).toBe(1);
  await answer(page,0,'STALE_STOPPED');await expect(page.locator('#hp-chat-body')).not.toContainText('STALE_STOPPED');
  await page.locator('#hp-chat-retry').click();await expect.poll(()=>count(page)).toBe(2);
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[1].payload.context)).toEqual([]);
  await answer(page,1,'重新回复成功。');await expectIdle(page);await expect(page.locator('#hp-chat-body')).toContainText('重新回复成功。');
});

test('[DONE] completes before EOF even when reader cancellation never settles',async({page})=>{
  await page.clock.install();await installTransport(page,'sse',true);await open(page,'en');
  await pauseBeforeRequest(page);
  await page.locator('#hp-chat-input').fill('done without eof');await page.locator('#hp-chat-input').press('Enter');await expect.poll(()=>count(page)).toBe(1);
  await answer(page,0,'The complete answer.');await expectIdle(page);
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[0].cancels)).toBe(1);
  expect(await page.evaluate(()=>(window as any).homeRecovery.turns[0].aborts)).toBe(0);
  await page.clock.fastForward(30000);await expect(page.locator('.hp-bear-chat-recovery')).toHaveCount(0);await expectIdle(page);
  await expect(page.locator('#hp-chat-body')).toContainText('The complete answer.');
});

test('finishing a short-screen reply preserves a wheel departure toward the books',async({page})=>{
  await page.setViewportSize({width:568,height:320});await installTransport(page);await open(page,'en');
  await page.locator('#hp-chat-input').fill('finish after I scroll away');await page.locator('#hp-chat-input').press('Enter');
  await expect.poll(()=>count(page)).toBe(1);await expect(page.locator('.hp-bear-chat')).toBeFocused();
  const initial=await page.evaluate(()=>scrollY);await page.mouse.move(560,300);await page.mouse.wheel(0,620);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(initial+600);
  const departed=await page.evaluate(()=>scrollY);await expect(page.locator('.hp-bear-chat')).toBeFocused();
  await answer(page,0,'A completed reply that must not pull the reader back.');await expectIdle(page);
  expect(Math.abs(await page.evaluate(()=>scrollY)-departed)).toBeLessThan(2);
  await expect(page.locator('#hp-chat-input')).not.toBeFocused();
});
