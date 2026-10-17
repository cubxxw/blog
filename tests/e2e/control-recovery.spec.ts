import {test, expect} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';

const article='/zh/engineering/posts/use-go-tools-dlv/';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

test('share link refusal preserves the URL and returns focus after dismissal',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))}});
    document.execCommand=()=>false;
  });
  await page.goto(article);await page.evaluate(()=>window.scrollTo(0,300));
  await page.locator('#article-fab').click();
  await page.locator('#abs-tab-share').click();
  const trigger=page.locator('.abs-share-copy');await trigger.click();
  const dialog=page.getByRole('dialog',{name:'复制文章链接'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox',{name:'文章链接'})).toHaveValue(/use-go-tools-dlv/);
  await expect(dialog.getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
});

test('newsletter timeout releases the busy form and preserves the email',async({page})=>{
  await page.clock.install();
  await page.addInitScript(()=>{
    const original=window.fetch;
    window.fetch=(input,init)=>String(input).includes('/subscribe-email')?new Promise<Response>(()=>{}):original(input,init);
  });
  await page.goto('/zh/');
  const form=page.locator('[data-fsub-form]').first(),input=form.locator('[name=email]'),submit=form.locator('[type=submit]');
  await input.fill('reader@example.com');await submit.click();await expect(submit).toBeDisabled();
  await page.clock.fastForward(16000);
  await expect(submit).toBeEnabled();await expect(input).toHaveValue('reader@example.com');
  await expect(page.locator('[data-fsub-status]').first()).toContainText('请求超时');
});

test('library empty search and empty bookmarks offer a working way back',async({page})=>{
  await page.goto('/zh/projects/');await enterWorkspace(page);
  await page.locator('[data-space-dock] [data-open="reader"]').click();
  const reader=page.locator('[data-space-window="reader"]');
  const query=reader.locator('[data-library-query]');
  await query.fill('a-phrase-that-does-not-exist-291789');
  await expect(reader.locator('.space-library-empty')).toContainText('没有找到');
  await reader.getByRole('button',{name:'清除搜索'}).click();
  await expect(query).toHaveValue('');await expect(query).toBeFocused();
  await expect(reader.locator('.space-list-item').first()).toBeVisible();
  const categoryPicker=reader.locator('[data-library-select]'),nativePicker=await categoryPicker.isVisible();
  if(nativePicker){
    await expect(categoryPicker).toBeVisible();await categoryPicker.selectOption('favorites');
    await expect(categoryPicker).toHaveValue('favorites');
  }else await reader.locator('[data-library-filter="favorites"]').click();
  await expect(reader.locator('.space-library-empty')).toContainText('还没有收藏文章');
  await reader.getByRole('button',{name:'查看全部文章'}).click();
  await expect(reader.locator('[data-library-filter="all"]')).toHaveAttribute('aria-pressed','true');
  if(nativePicker)await expect(categoryPicker).toHaveValue('all');
  await expect(reader.locator('.space-list-item').first()).toBeVisible();
});
