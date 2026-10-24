import {test,expect} from '../helpers/frozen-site';
import {hitRoomObject} from '../helpers/room-interaction';

test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'&&process.env.SPACE_SOFTWARE_QA!=='1'?['--enable-gpu','--use-angle=metal']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});

for(const {width,height,language} of [{width:1440,height:900,language:'zh'},{width:390,height:844,language:'zh'},{width:1440,height:900,language:'en'}]){
 test(`the right-wall Klee painting opens and retreats intact at ${width}px / ${language}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{localStorage.setItem('space:cafe:theme:v2','jiangnan');localStorage.setItem('space:cafe:onboarding:v1','seen');});
  const texture=page.waitForResponse(response=>response.url().includes('/images/space/art/paul-klee-main-path-and-byways-1929.jpg'));
  await page.goto(language==='zh'?'/zh/projects/':'/projects/');
  const room=page.locator('[data-bear-workspace]');
  await expect(room).toHaveAttribute('data-world-ready','true',{timeout:30000});
  await expect(room).toHaveAttribute('data-boot-state','complete');expect((await texture).ok()).toBe(true);
  await hitRoomObject(page,'painting');
  await expect(room).toHaveAttribute('data-world-inspect','painting');
  await expect(room).toHaveAttribute('data-world-travel','false');
  const caption=page.locator('[data-room-inspection]');
  await expect(caption).toBeVisible();await expect(caption.locator('h2')).toHaveText(language==='zh'?'主路与支路':'Main Path and Byways');
  await expect(caption).toContainText('Paul Klee · 1929');
  await expect(caption.locator('a')).toHaveAttribute('href','https://geheimnis-der-bilder.zdf.de/museum-ludwig/paul-klee-hauptweg-und-nebenwege.html');
  await page.screenshot({path:test.info().outputPath(`klee-${language}-${width}.png`)});
  await page.keyboard.press('Escape');await expect(room).toHaveAttribute('data-world-mode','roam');await expect(caption).toBeHidden();
  const before=await room.getAttribute('data-world-pose');
  await page.locator('[data-room-object="painting"]').press('Enter');await expect(caption).toBeVisible();
  if(width<500){await page.setViewportSize({width:320,height:900});await expect(room).toHaveAttribute('data-world-travel','false');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);}
  await page.keyboard.press('Escape');await expect(room).toHaveAttribute('data-world-mode','roam');
  expect(await room.getAttribute('data-world-pose')).toBe(before);expect(errors).toEqual([]);
 });
}
