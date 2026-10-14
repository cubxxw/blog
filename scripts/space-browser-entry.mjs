// Shared workspace QA enters through a real keyboard action, independent of
// the introductory room layout and of WebGL availability.
export async function enterWorkspace(page) {
  if(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode')==='desktop')return;
  await page.keyboard.press('Control+k');
  await page.waitForFunction(()=>document.querySelector('[data-bear-workspace]')?.dataset.cafeMode==='desktop');
  await page.locator('[data-space-search-close]').click();
}
