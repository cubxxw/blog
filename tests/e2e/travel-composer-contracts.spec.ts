import {test,expect} from '../helpers/frozen-site';
test.use({reducedMotion:'reduce'});

for(const width of [320,390]) {
  test(`book prompts and Send/Stop have room for touch at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(()=>{
      const original=window.fetch;
      window.fetch=(input,options)=>String(input).includes('/.netlify/functions/article-ai')
        ? new Promise<Response>((_,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('Stopped','AbortError')),{once:true}))
        : original(input,options);
    });
    await page.goto('/zh/travel/');await page.locator('.tw-tome__ask').first().click();
    const dialog=page.getByRole('dialog',{name:'问 AI 关于这本书'}),chips=dialog.locator('.tw-book-ai__chip');
    for(const chip of await chips.all()) {
      const box=(await chip.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
    }
    // Check rendered text lines, including the last two characters that used to wrap alone.
    const lastLine=await chips.first().evaluate(node=>{
      const text=node.firstChild!,lines=new Map<number,number>();
      for(let i=0;i<(text.textContent||'').length;i++) {
        const range=document.createRange();range.setStart(text,i);range.setEnd(text,i+1);
        const top=Math.round(range.getBoundingClientRect().top);lines.set(top,(lines.get(top)||0)+1);
      }
      const counts=[...lines.values()];return counts[counts.length-1]||0;
    });
    expect(lastLine).toBeGreaterThanOrEqual(4);
    const input=dialog.locator('.tw-book-ai__input'),send=dialog.getByRole('button',{name:'发送',exact:true});
    const inputBox=(await input.boundingBox())!,sendBox=(await send.boundingBox())!;
    expect(sendBox.width).toBeGreaterThanOrEqual(44);expect(sendBox.height).toBeGreaterThanOrEqual(44);
    expect(sendBox.x-(inputBox.x+inputBox.width)).toBeGreaterThanOrEqual(8);
    expect(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await input.fill('保留这条问题');await send.click();
    const stop=dialog.getByRole('button',{name:'停止生成',exact:true});await expect(stop).toBeVisible();
    const stopBox=(await stop.boundingBox())!;expect(stopBox.width).toBeGreaterThanOrEqual(44);expect(stopBox.height).toBeGreaterThanOrEqual(44);
    await stop.click();await expect(input).toHaveValue('保留这条问题');await expect(input).toBeEnabled();
    await expect(send).toBeVisible();await page.keyboard.press('Escape');
  });
}

for(const height of [320,256])for(const locale of ['zh','en']) {
  test(`book conversation scrolls inside its card in ${locale} at 568×${height}`,async({page})=>{
    await page.setViewportSize({width:568,height});
    const answer=Array.from({length:30},(_,i)=>`Paragraph ${i+1}: a longer controlled reading response.`).join('\n\n');
    await page.route('**/.netlify/functions/article-ai',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer})}));
    await page.goto(locale==='zh'?'/zh/travel/':'/travel/');await page.locator('.tw-tome__ask').first().click();
    const dialog=page.locator('#tw-book-ai'),card=dialog.locator('.tw-book-ai__card'),conversation=dialog.locator('.tw-book-ai__conversation');
    const assertChrome=async()=>{
      const bounds=(await card.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(16);expect(bounds.y).toBeGreaterThanOrEqual(16);
      expect(bounds.x+bounds.width).toBeLessThanOrEqual(552);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height-16);
      for(const control of ['.tw-book-ai__x','.tw-book-ai__input','.tw-book-ai__send']) {
        const box=(await dialog.locator(control).boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(bounds.x);expect(box.y).toBeGreaterThanOrEqual(bounds.y);
        expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width);expect(box.y+box.height).toBeLessThanOrEqual(bounds.y+bounds.height);
        expect(await dialog.locator(control).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
      }
    };
    await assertChrome();await expect(conversation.locator('.tw-book-ai__chip')).toHaveCount(3);
    await conversation.locator('.tw-book-ai__chip').last().scrollIntoViewIfNeeded();await assertChrome();
    await conversation.locator('.tw-book-ai__chip').last().click();
    await expect(dialog.locator('.tw-book-ai__msg--ai')).toContainText('Paragraph 30');
    expect(await conversation.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);await assertChrome();
    await conversation.focus();await page.keyboard.press('Home');
    await expect.poll(()=>conversation.evaluate(el=>el.scrollTop)).toBe(0);
    await page.keyboard.press('End');await expect.poll(()=>conversation.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    await assertChrome();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  });
}
