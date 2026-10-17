import {test,expect} from '../helpers/frozen-site';
test.use({reducedMotion:'reduce'});

test('book AI keeps the composing draft until a deliberate Enter',async({page})=>{
  let requests=0;
  await page.route('**/.netlify/functions/article-ai',route=>{requests++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'受控回答'})});});
  await page.goto('/zh/travel/');await page.locator('.tw-tome__ask').first().click();
  const input=page.locator('.tw-book-ai__input');await input.fill('正在选择中文候选');
  await input.dispatchEvent('keydown',{key:'Enter',isComposing:true,keyCode:229});
  await expect(input).toHaveValue('正在选择中文候选');expect(requests).toBe(0);
  await input.press('Enter');await expect.poll(()=>requests).toBe(1);
});

test('FAQ AI ignores both composing Enter and Safari keyCode 229',async({page})=>{
  let requests=0;
  await page.route('**/.netlify/functions/article-ai',route=>{requests++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'受控回答'})});});
  await page.goto('/zh/ai-agent/posts/gpt-researcher/');
  const faq=page.locator('.article-faq__item').first();await faq.locator('.article-faq__ai-toggle').click();
  const input=faq.locator('.article-faq__ai-input');await input.fill('候选确认后再发送');
  await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});
  await input.dispatchEvent('keydown',{key:'Enter',keyCode:229});
  await expect(input).toHaveValue('候选确认后再发送');expect(requests).toBe(0);
  await input.press('Enter');await expect.poll(()=>requests).toBe(1);
});
