import {test,expect} from '../helpers/frozen-site';
test.use({reducedMotion:'no-preference'});
const article='/zh/ai-agent/posts/gpt-researcher/';

test('FAQ reads runtime motion preferences and settles interrupted opening and closing',async({page})=>{
  await page.goto(article);const item=page.locator('.article-faq__item').first(),summary=item.locator('summary');
  const animations=()=>item.evaluate(el=>el.getAnimations().length);
  const assertSettled=async(open:boolean)=>{
    await expect.poll(()=>item.evaluate((el:HTMLDetailsElement)=>el.open)).toBe(open);
    await expect.poll(animations).toBe(0);
    expect(await item.evaluate((el:HTMLElement)=>({height:el.style.height,overflow:el.style.overflow}))).toEqual({height:'',overflow:''});
    if(open)await expect(item).toHaveClass(/article-faq__item--open/);else await expect(item).not.toHaveClass(/article-faq__item--open/);
  };
  await page.emulateMedia({reducedMotion:'reduce'});await summary.click();await assertSettled(false);
  await summary.click();await assertSettled(true);
  await page.emulateMedia({reducedMotion:'no-preference'});await summary.click();
  await expect.poll(animations).toBeGreaterThan(0);await page.emulateMedia({reducedMotion:'reduce'});await assertSettled(false);
  await page.emulateMedia({reducedMotion:'no-preference'});await summary.click();
  await expect.poll(animations).toBeGreaterThan(0);await page.emulateMedia({reducedMotion:'reduce'});await assertSettled(true);
  await summary.click();await assertSettled(false);await summary.click();await assertSettled(true);
});

test('runtime reduced motion keeps FAQ focus intent, draft recovery and request cancellation',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.addInitScript(()=>{
    const original=window.fetch;
    window.fetch=(input,options)=>{
      if(!String(input).includes('/.netlify/functions/article-ai'))return original(input,options);
      document.documentElement.dataset.faqRequest='started';
      return new Promise<Response>((_,reject)=>options?.signal?.addEventListener('abort',()=>{
        document.documentElement.dataset.faqRequest='cancelled';reject(new DOMException('Stopped','AbortError'));
      },{once:true}));
    };
  });
  await page.goto(article);const item=page.locator('.article-faq__item').first(),toggle=item.locator('.article-faq__ai-toggle'),input=item.locator('.article-faq__ai-input'),panel=item.locator('.article-faq__ai-panel');
  await expect(panel).toBeHidden();expect(await panel.boundingBox()).toBeNull();
  await input.evaluate((el:HTMLTextAreaElement)=>el.focus());await expect(input).not.toBeFocused();
  await toggle.click();const theme=page.locator('#theme-toggle');await theme.focus();
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(400);await expect(theme).toBeFocused();
  await toggle.click();await expect(panel).toBeHidden();await expect(toggle).toBeFocused();await toggle.click();await expect(input).toBeFocused();
  await input.fill('切换偏好后保留这个问题');await item.getByRole('button',{name:'发送',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-faq-request','started');
  await item.locator('summary').click();await expect(page.locator('html')).toHaveAttribute('data-faq-request','cancelled');
  await item.locator('summary').click();await expect(input).toBeEnabled();await expect(input).toHaveValue('切换偏好后保留这个问题');
  await page.emulateMedia({reducedMotion:'no-preference'});await toggle.click();
  await page.emulateMedia({reducedMotion:'reduce'});await expect(panel).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');
});
