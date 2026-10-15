import {expect,type Page} from './frozen-site';
export async function enterWorkspace(page:Page) {
  await page.waitForFunction(()=>{const d=document.querySelector<HTMLElement>('[data-bear-workspace]')?.dataset;return d?.ready==='true'&&(d.worldFailed==='true'||(Number(d.worldFrames)>0&&!d.worldLoading&&d.bootState==='complete'));});
  if(await page.locator('[data-bear-workspace]').getAttribute('data-world-failed')==='true'&&await page.locator('[data-boot-skip]').isVisible())await page.locator('[data-boot-skip]').click();
  if(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode')==='desktop')return;
  await page.keyboard.press('Control+k');
  await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','desktop');
  await page.locator('[data-space-search-close]').click();
}
