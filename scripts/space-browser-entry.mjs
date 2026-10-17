// Shared workspace QA enters through a real keyboard action, independent of
// the introductory room layout and of WebGL availability.
export async function enterWorkspace(page) {
  await page.waitForFunction(()=>{const d=document.querySelector('[data-bear-workspace]')?.dataset;return d?.worldFailed==='true'||(d?.bootState==='complete'&&!d.worldLoading);});
  if(await page.locator('[data-bear-workspace]').getAttribute('data-world-failed')==='true'&&await page.locator('[data-boot-skip]').isVisible())await page.locator('[data-boot-skip]').click();
  if(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode')==='desktop')return;
  await page.keyboard.press('Control+k');
  await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.cafeMode==='desktop');
  await page.locator('[data-space-search-close]').click();
}
