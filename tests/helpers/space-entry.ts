import {test,expect,type Page} from './frozen-site';
// A real room can cold-start again after language navigation or reload.
// Budget the whole journey while preserving the original per-operation cap.
export async function reserveWorldJourney(page:Page,timeout=90_000) {
  const info=test.info();
  if(info.timeout>0&&info.timeout<timeout)info.setTimeout(timeout);
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  // These legacy contracts intentionally exercise the six navigable 3D rooms.
  // The cinematic default has its own entry and real-device interaction suite.
  await page.addInitScript(()=>{if(!localStorage.getItem('space:cafe:theme:v2'))localStorage.setItem('space:cafe:theme:v2','zen');});
}
export async function enterWorkspace(page:Page) {
  await reserveWorldJourney(page);
  await page.waitForFunction(()=>{const d=document.querySelector<HTMLElement>('[data-bear-workspace]')?.dataset;return d?.ready==='true'&&(d.worldFailed==='true'||(Number(d.worldFrames)>0&&!d.worldLoading&&d.bootState==='complete'));},undefined,{timeout:30_000});
  if(await page.locator('[data-bear-workspace]').getAttribute('data-world-failed')==='true'&&await page.locator('[data-boot-skip]').isVisible())await page.locator('[data-boot-skip]').click();
  if(await page.locator('[data-bear-workspace]').getAttribute('data-cafe-mode')==='desktop')return;
  await page.keyboard.press('Control+k');
  await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','desktop');
  await page.locator('[data-space-search-close]').click();
}
