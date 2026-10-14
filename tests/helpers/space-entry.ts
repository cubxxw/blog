import {expect,type Page} from './frozen-site';
export async function enterWorkspace(page:Page) {
  if(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode')==='desktop')return;
  await page.keyboard.press('Control+k');
  await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','desktop');
  await page.locator('[data-space-search-close]').click();
}
