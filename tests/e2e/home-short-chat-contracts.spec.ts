import {test,expect,Page} from '../helpers/frozen-site';

test.use({reducedMotion:'reduce'});

async function assertReachableChrome(page:Page,width:number,height:number,short:boolean) {
  const panel=page.locator('.hp-bear-chat'),bounds=(await panel.boundingBox())!;
  const headerHeight=await page.locator('.header-wrapper').evaluate(el=>el.getBoundingClientRect().height);
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
  expect(bounds.y).toBeGreaterThanOrEqual(short?headerHeight+11:headerHeight);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(height-(short?11:0));
  for(const selector of ['#hp-chat-close','#hp-chat-input','#hp-chat-send']) {
    const control=page.locator(selector),box=(await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);expect(box.y).toBeGreaterThanOrEqual(bounds.y);
    expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width);
    expect(box.y+box.height).toBeLessThanOrEqual(bounds.y+bounds.height);
    expect(await control.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

for(const height of [320,256])for(const locale of ['zh','en']) {
  test(`${locale} homepage chat keeps real close and composer reachable at 568×${height}`,async({page})=>{
    await page.setViewportSize({width:568,height});
    const answer=Array.from({length:24},(_,i)=>`Paragraph ${i+1}: a controlled reply that remains available for reading.`).join('\n\n');
    let requests=0;
    await page.route('**/.netlify/functions/blog-ai',route=>{requests++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer})});});
    await page.goto(locale==='zh'?'/zh/':'/');await page.locator('#hp-avatar-btn').click();
    await expect(page.locator('#hp-chat-input')).toBeFocused();await assertReachableChrome(page,568,height,true);
    const scroll=page.locator('#hp-chat-scroll'),chips=scroll.locator('.hp-bear-chat-quick.is-start button');
    await expect(chips).toHaveCount(6);expect(await scroll.evaluate(el=>el.scrollTop)).toBe(0);
    expect(await scroll.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
    // Check the last real suggestion without asking Playwright to scroll the
    // page on our behalf, then click its actual hit-tested center.
    const chip=chips.last();
    await chip.evaluate(el=>{
      const viewport=el.closest('#hp-chat-scroll')!;
      viewport.scrollTop+=el.getBoundingClientRect().bottom-viewport.getBoundingClientRect().bottom;
    });
    const chipBox=(await chip.boundingBox())!;
    expect(chipBox.y).toBeGreaterThanOrEqual((await scroll.boundingBox())!.y);
    expect(chipBox.y+chipBox.height).toBeLessThanOrEqual((await scroll.boundingBox())!.y+(await scroll.boundingBox())!.height+1);
    expect(await chip.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
    await assertReachableChrome(page,568,height,true);
    await page.mouse.click(chipBox.x+chipBox.width/2,chipBox.y+chipBox.height/2);
    await expect(page.locator('#hp-chat-body')).toContainText('Paragraph 24');
    await expect(page.locator('#hp-chat-input')).toBeEnabled();expect(requests).toBe(1);
    await assertReachableChrome(page,568,height,true);
    await scroll.focus();await page.keyboard.press('Home');await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBe(0);
    await page.keyboard.press('End');await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    await assertReachableChrome(page,568,height,true);
    const close=(await page.locator('#hp-chat-close').boundingBox())!;
    await page.mouse.click(close.x+close.width/2,close.y+close.height/2);
    await expect(page.locator('#hp-chat-close')).toHaveCount(0);await expect(page.locator('#hp-avatar-btn')).toBeFocused();
    const opener=(await page.locator('#hp-avatar-btn').boundingBox())!;
    expect(opener.y).toBeGreaterThanOrEqual(52);expect(opener.y+opener.height).toBeLessThanOrEqual(height);
    await page.locator('#hp-avatar-btn').click();await expect(page.locator('#hp-chat-body')).toContainText('Paragraph 24');
    await assertReachableChrome(page,568,height,true);await page.keyboard.press('Escape');
    await expect(page.locator('#hp-avatar-btn')).toBeFocused();expect(requests).toBe(1);
  });
}

for(const width of [390,1440]) {
  test(`normal-height homepage chat retains its layout and conversation at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.route('**/.netlify/functions/blog-ai',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'The normal-height conversation remains intact.'})}));
    await page.goto('/zh/');await page.locator('#hp-avatar-btn').click();
    await page.locator('.hp-bear-chat').scrollIntoViewIfNeeded();
    expect(await page.locator('#hp-chat-scroll').evaluate(el=>getComputedStyle(el).display)).toBe('contents');
    // Normal layouts retain the same panel bounds with the 44px sender.
    const panel=(await page.locator('.hp-bear-chat').boundingBox())!;
    expect(panel.height).toBeGreaterThanOrEqual(width===390?360:420);expect(panel.height).toBeLessThanOrEqual(560);
    for(const selector of ['#hp-chat-close','#hp-chat-input','#hp-chat-send']) {
      const box=(await page.locator(selector).boundingBox())!;
      if(selector==='#hp-chat-send') {expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
      expect(box.x).toBeGreaterThanOrEqual(panel.x);expect(box.x+box.width).toBeLessThanOrEqual(panel.x+panel.width);
      expect(box.y).toBeGreaterThanOrEqual(panel.y);expect(box.y+box.height).toBeLessThanOrEqual(panel.y+panel.height);
    }
    await page.locator('#hp-chat-input').fill('normal height');await page.locator('#hp-chat-send').click();
    await expect(page.locator('#hp-chat-body')).toContainText('The normal-height conversation remains intact.');
    await page.locator('#hp-chat-close').click();await page.locator('#hp-avatar-btn').click();
    await expect(page.locator('#hp-chat-body')).toContainText('The normal-height conversation remains intact.');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
