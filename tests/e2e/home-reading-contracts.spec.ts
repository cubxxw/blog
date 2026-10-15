import {test,expect} from '../helpers/frozen-site';
test.use({reducedMotion:'reduce'});

test.describe('a server-rendered reading entrance',()=>{
  test.use({javaScriptEnabled:false});
  for(const locale of ['zh','en'])test(`${locale} practice title is a real article link without scripts`,async({page})=>{
    await page.goto(locale==='zh'?'/zh/':'/');
    const start=page.locator('.hp-reading-start__link'),title=(await start.locator('h2').textContent())!.trim();
    const href=(await start.getAttribute('href'))!;expect(href).toMatch(/\/(ai-agent|engineering)\/posts\//);
    await expect(start.locator('time')).toHaveAttribute('datetime',/^\d{4}-\d{2}-\d{2}$/);
    await expect(start.locator('.hp-reading-start__description')).not.toBeEmpty();
    await start.click();await expect(page).toHaveURL(href);await expect(page.locator('.post-title')).toHaveText(title);
  });
});

for(const width of [320,390])for(const locale of ['zh','en']) {
  test(`${locale} reading precedes all contact targets at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});await page.goto(locale==='zh'?'/zh/':'/');
    const intro=(await page.locator('.hp-hero-intro').boundingBox())!,start=page.locator('.hp-reading-start'),startBox=(await start.boundingBox())!,social=page.locator('.hp-hero-socials'),socialBox=(await social.boundingBox())!;
    expect(startBox.y).toBeGreaterThanOrEqual(intro.y+intro.height);expect(socialBox.y).toBeGreaterThanOrEqual(startBox.y+startBox.height);
    const heading=(await start.locator('h2').boundingBox())!;expect(heading.y).toBeLessThan(800);
    const controls=social.locator('a,button');await expect(controls).toHaveCount(10);
    const boxes=await controls.evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};}));
    for(let i=0;i<boxes.length;i++) {
      const box=boxes[i];expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
      if(i&&Math.abs(box.y-boxes[i-1].y)<1)expect(box.x-boxes[i-1].x-boxes[i-1].width).toBeGreaterThanOrEqual(8);
      else if(i)expect(box.y-boxes[i-1].y-boxes[i-1].height).toBeGreaterThanOrEqual(8);
    }
    for(const anchor of await social.locator('a').all())expect(await anchor.getAttribute('href')).toMatch(/^https:\/\//);
    for(const platform of ['wechat','xhs']) {
      const trigger=social.locator(`[data-contact-platform="${platform}"]`);await expect(trigger).toHaveAttribute('data-contact-qr',/.+/);
      await trigger.click();await expect(page.locator('#wechat-contact-backdrop .wxc-card')).toBeVisible();
      await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
    }
    if(locale==='zh') {
      const lines=await page.locator('.hp-keep-word').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length;});
      expect(lines).toBe(1);await expect(page.locator('.hp-keep-word')).toHaveText('项目');
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const href=(await start.locator('a').getAttribute('href'))!,topic=href.match(/\/(ai-agent|engineering)\//)![1];
    await expect(page.locator(`.hp-channel-panel[data-channel="latest"] a[href="${href}"]`)).toHaveCount(0);
    await expect(page.locator(`.hp-channel-panel[data-channel="${topic}"] a[href="${href}"]`)).toHaveCount(1);
    const latest=page.locator('.hp-channel-panel[data-channel="latest"]');
    await expect(latest.locator('.hp-post-card.hp-featured')).toHaveCount(1);await expect(latest.locator('.hp-post-card:not(.hp-featured)')).toHaveCount(2);
    for(const excerpt of await latest.locator('.hp-post-card:not(.hp-featured) .hp-post-excerpt').all())await expect(excerpt).toBeHidden();
    await expect(latest.locator('.hp-posts-list-row')).toHaveCount(4);
  });
}

test('Bear follows the writing with the same conversation and restores its question opener',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/.netlify/functions/blog-ai',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'这是一条用于验证原会话的受控回复。'})}));
  await page.goto('/zh/');await expect(page.locator('#hp-bear-ai')).toHaveCount(1);
  expect(await page.evaluate(()=>{
    const posts=document.getElementById('hp-posts')!,bear=document.getElementById('hp-bear-ai')!,books=document.getElementById('hp-books')!;
    return !!(posts.compareDocumentPosition(bear)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(bear.compareDocumentPosition(books)&Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  const root=page.locator('#hp-bear-ai'),original=await root.elementHandle();await root.scrollIntoViewIfNeeded();
  await expect(root.locator('.hp-bear-avatar-status')).toHaveText('AI 分身');await expect(root.locator('.hp-bear-hud')).toHaveCount(0);
  const question=(await root.locator('.hp-bear-bubble').first().textContent())!;await root.getByRole('button',{name:question,exact:true}).click();
  await expect(root.locator('#hp-chat-body')).toContainText('这是一条用于验证原会话的受控回复。');
  await root.locator('#hp-chat-close').click();await expect(root.getByRole('button',{name:question,exact:true})).toBeFocused();
  await root.locator('#hp-avatar-btn').click();await expect(root.locator('#hp-chat-body')).toContainText(question);
  await expect(root.locator('#hp-chat-body')).toContainText('这是一条用于验证原会话的受控回复。');
  expect(await root.evaluate((el,previous)=>el===previous,original)).toBe(true);
  await expect(root.locator('.hp-bear-chat-meta')).toContainText('AI 分身');
  await root.locator('#hp-chat-close').click();await expect(root.locator('#hp-avatar-btn')).toBeFocused();
});
