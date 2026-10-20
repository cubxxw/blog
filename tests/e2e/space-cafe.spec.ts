import {test,expect} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(({page})=>reserveWorldJourney(page));

test.describe('Space café',()=>{
  test('the café entry offers the night room and six spatial scenes, then opens the real workspace search',async({page})=>{
    await page.goto('/zh/projects/');const space=page.locator('[data-bear-workspace]');
    await expect(space).toHaveAttribute('data-ready','true');await expect(space).toHaveAttribute('data-cafe-mode','cafe');
    await expect(page.locator('[data-space-dock]')).toBeHidden();
    expect(await page.locator('[data-space-windows]').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
    await expect(page.locator('[data-cafe-image]')).toHaveCount(0);
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await expect(page.locator('button[data-cafe-theme]')).toHaveCount(7);
    await page.locator('button[data-cafe-theme="coast"]').click();await expect(space).toHaveAttribute('data-cafe-theme','coast');
    await expect(page.locator('[data-cafe-dialog]')).toBeHidden();
    await page.keyboard.press('Control+k');await expect(space).toHaveAttribute('data-cafe-mode','desktop');
    await expect(page.locator('[data-space-search]')).toBeVisible();
  });

  test('the landscape room controls stay clickable at low height',async({page})=>{
    await page.setViewportSize({width:568,height:320});await page.goto('/zh/projects/');
    const space=page.locator('[data-bear-workspace]');
    await page.waitForFunction(()=>{const d=document.querySelector<HTMLElement>('[data-bear-workspace]')?.dataset;return d?.worldFailed==='true'||d?.bootState==='complete';},undefined,{timeout:30_000});
    test.skip(await space.getAttribute('data-world-failed')==='true','This engine has no WebGL; ordinary workspace fallback is tested separately.');
    await expect(space).toHaveAttribute('data-world-rendered-mode','roam');
    for(const control of ['[data-cafe-read]','[data-cafe-enter]'])expect(await page.locator(control).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
    // Open the composer without sending a model request in frozen-site QA.
    await page.keyboard.press('Control+j');await expect(space).toHaveAttribute('data-cafe-mode','desktop');
    await expect(page.locator('[data-agent-input]')).toBeFocused();
  });

  test('an old About route can return to the room across language and reload',async({page})=>{
    await page.goto('/zh/projects/?profile=about#identity');const space=page.locator('[data-bear-workspace]');
    await expect(space).toHaveAttribute('data-ready','true');await expect(space).toHaveAttribute('data-cafe-mode','desktop');
    await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();await page.locator('button[data-cafe-theme="garden"]').click();
    await expect(space).toHaveAttribute('data-cafe-theme','garden');await page.locator('[data-cafe-language]').click();
    await expect(page).toHaveURL(/\/projects\/$/);await expect(space).toHaveAttribute('data-cafe-mode','cafe');
    await expect(page.locator('[data-cafe-name]')).toHaveText('Scholar’s Garden');await page.reload();
    await expect(space).toHaveAttribute('data-cafe-mode','cafe');await expect(space).toHaveAttribute('data-cafe-theme','garden');
  });

  test('visiting the room preserves the exact note editor and private workspace',async({page})=>{
    await page.goto('/zh/projects/');await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-ready','true');await enterWorkspace(page);
    await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(name:string,args:object)=>unknown}}).BearSpace.execute('open',{app:'notes'}));
    await page.locator('[data-note-editor]').fill('A private note beside the window.');
    await page.locator('[data-note-editor]').evaluate(el=>(el as HTMLElement).dataset.instance='original');
    const snapshot=()=>page.evaluate(()=>(window as unknown as {BearSpace:{snapshot:()=>unknown}}).BearSpace.snapshot());
    const before=await snapshot();await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-cafe-visit]').click();
    expect(await snapshot()).toEqual(before);await enterWorkspace(page);
    await expect(page.locator('[data-note-editor]')).toHaveAttribute('data-instance','original');expect(await snapshot()).toEqual(before);
    await page.reload();await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','cafe');await enterWorkspace(page);
    await expect(page.locator('[data-note-editor]')).toHaveValue('A private note beside the window.');
  });
});
