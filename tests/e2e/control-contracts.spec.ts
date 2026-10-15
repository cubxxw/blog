import {test, expect} from '../helpers/frozen-site';

const article = '/zh/engineering/posts/use-go-tools-dlv/';
test.use({reducedMotion: 'reduce'});

test('article tabs expose one stop and support Arrow, Home and End', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto(article);
  const tabs = page.locator('.reading-companion [role="tab"]');
  await expect(tabs.first()).toHaveAttribute('tabindex', '0');
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.reading-companion [role="tab"][tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
});

test('compact tools retain focus around the selected tab and name each panel', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(article);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.locator('#article-fab').click();
  const sheet = page.locator('#article-bottom-sheet');
  const tabs = sheet.locator('[role="tab"]');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  const selectedID = await tabs.last().getAttribute('id');
  await expect(sheet.locator('[role="tabpanel"]:visible')).toHaveAttribute('aria-labelledby', selectedID!);
  await page.keyboard.press('Shift+Tab');
  await expect(sheet.locator(':focus')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#article-fab')).toBeFocused();
});

test('mobile navigation is a dismissible named disclosure', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/zh/articles/');
  const trigger = page.locator('.hamburger-menu');
  await expect(trigger).toHaveAttribute('aria-controls', 'menu');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#menu a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#menu')).toBeHidden();
});

test('refused clipboard copy leaves code selected with a truthful recovery', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(new Error('denied'))}});
    document.execCommand = () => false;
  });
  await page.goto(article);
  const copy = page.locator('.post-content .copy-code').first();
  await copy.click();
  await expect(copy).not.toHaveClass(/is-copied/);
  await expect(copy).toBeEnabled();
  await expect(page.locator('.code-copy-status').first()).toContainText('代码已选中');
  expect(await page.evaluate(() => window.getSelection()?.toString().length || 0)).toBeGreaterThan(0);
});

test('closed compact tools cannot receive focus before opening or after dismissal',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(article);
  const sheet=page.locator('#article-bottom-sheet'),tab=page.locator('#abs-tab-toc');
  await expect(sheet).toHaveAttribute('inert','');await expect(sheet).toHaveAttribute('aria-hidden','true');
  await tab.evaluate((node:HTMLElement)=>node.focus());await expect(tab).not.toBeFocused();
  await page.evaluate(()=>window.scrollTo(0,300));await page.locator('#article-fab').click();
  await expect(tab).toBeFocused();await expect(sheet).toHaveAttribute('aria-hidden','false');
  await page.keyboard.press('Escape');await expect(sheet).toHaveAttribute('inert','');
  await tab.evaluate((node:HTMLElement)=>node.focus());await expect(tab).not.toBeFocused();
});

test('fullscreen code uses a native modal and restores its expand trigger',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(article);
  const trigger=page.locator('.code-tool-expand:visible').first();await trigger.click();
  const dialog=page.getByRole('dialog',{name:'全屏阅读'});await expect(dialog).toBeVisible();
  for(let i=0;i<6;i++){await page.keyboard.press('Tab');await expect(dialog.locator(':focus')).toBeVisible();}
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
});

test('book AI uses a native modal with keyboard containment and a 44px exit',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/zh/travel/');
  const trigger=page.locator('.tw-tome__ask').first();await trigger.click();
  const dialog=page.getByRole('dialog',{name:'问 AI 关于这本书'});await expect(dialog).toBeVisible();
  for(let i=0;i<8;i++){await page.keyboard.press('Tab');await expect(dialog.locator(':focus')).toBeVisible();}
  const close=dialog.locator('.tw-book-ai__x'),box=await close.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
});
