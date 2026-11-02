import {test,expect,type Page} from '../helpers/frozen-site';
import fs from 'node:fs/promises';
test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'&&process.env.SPACE_SOFTWARE_QA!=='1'?['--enable-gpu','--use-angle=metal']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
async function openNotes(page:Page){
  await page.locator('[data-mac-menu="file"]').click();
  await page.locator('[data-mac-panel="file"] [data-open="notes"]').click();
}
test.beforeEach(async({page})=>{
  test.setTimeout(60_000);
  await page.addInitScript(()=>localStorage.setItem('space:cafe:theme:v2','jiangnan'));
});
async function hold(page:Page,pattern:RegExp){
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;}),done:Promise<unknown>[]=[];
  await page.route(pattern,route=>{const task=(async()=>{await pending;await route.continue();})();done.push(task);return task;});
  return async()=>{release();await Promise.all(done);};
}

for(const lang of ['zh','en'])test(`a hanging primary still paints the current photograph and later restores full quality (${lang})`,async({page})=>{
  const release=await hold(page,/jiangnan-vista-study-v\d+.*\.webp/);
  try{
    await page.goto(lang==='zh'?'/zh/projects/':'/projects/',{waitUntil:'domcontentloaded'});
    await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:10000});
    await expect(root(page)).toHaveAttribute('data-world-vista','image-preview');
    await expect(root(page)).not.toHaveAttribute('data-world-failed');
    const observation=await page.evaluate(()=>({observedReadyMs:Math.round(performance.now()),stageTimes:[...document.querySelectorAll('[data-boot-time]')].map(node=>node.textContent),note:'Local Chromium observation, not a field percentile.'}));
    await fs.mkdir(test.info().outputDir,{recursive:true});
    await fs.writeFile(test.info().outputPath('entry-observation.json'),JSON.stringify(observation,null,2));
    const pose=await root(page).getAttribute('data-world-pose');
    await page.screenshot({path:test.info().outputPath('preview-room.png')});
    if(lang==='zh')await expect(root(page)).toHaveAttribute('data-room-diagnostics',/vista-timeout/,{timeout:9000});
    await release();await expect(root(page)).toHaveAttribute('data-world-vista','image',{timeout:10000});
    expect(await root(page).getAttribute('data-world-pose')).toBe(pose);
    await page.screenshot({path:test.info().outputPath('full-room.png')});
  }finally{await release();}
});

test('a failed primary retains the photographic room instead of failing entry',async({page})=>{
  await page.route(/jiangnan-vista-study-v\d+.*\.webp/,route=>route.fulfill({status:404,body:''}));
  await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
  await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:10000});
  await expect(root(page)).toHaveAttribute('data-world-vista','image-preview');
  await expect(root(page)).toHaveAttribute('data-room-diagnostics',/vista-load/);
  await expect(root(page)).not.toHaveAttribute('data-world-failed');
});

test('the high-priority primary preload is reused by the texture loader without a duplicate request',async({page})=>{
  let requests=0;const warnings:string[]=[];
  page.on('request',request=>{if(/jiangnan-vista-study-v\d+.*\.webp/.test(request.url()))requests++;});
  page.on('console',message=>{if(/preload.*credentials|credentials.*match/i.test(message.text()))warnings.push(message.text());});
  const release=await hold(page,/jiangnan-vista-study-v\d+.*\.webp/);
  try{
    await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
    await expect(root(page)).toHaveAttribute('data-world-vista','image-preview',{timeout:10000});
    await release();await expect(root(page)).toHaveAttribute('data-world-vista','image');
    expect(requests).toBe(1);expect(warnings).toEqual([]);
  }finally{await release();}
});

test('held material maps do not prevent a real room from becoming usable',async({page})=>{
  const release=await hold(page,/\/materials-v1\/.*\.jpg/);
  try{
    await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
    await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:10000});
    await expect(root(page)).toHaveAttribute('data-world-pbr-maps','0');
    await expect(page.locator('.space-world__canvas')).toBeVisible();
    await expect(root(page)).not.toHaveAttribute('data-world-failed');
  }finally{await release();}
});

test('workspace entry cancels a held renderer import and a deliberate later visit can retry',async({page})=>{
  const release=await hold(page,/\/world-jiangnan\.[a-f0-9]+\.js/);
  try{
    await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
    const action=page.locator('[data-boot-skip]');await expect(action).toBeEnabled();await action.click();
    await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop',{timeout:1500});
    await expect(page.locator('[data-space-boot]')).toBeHidden();
    await expect(root(page)).not.toHaveAttribute('data-world-failed');
    await openNotes(page);
    const note=page.locator('[data-note-editor]');await note.fill('The same note survives a late renderer.');const original=await note.elementHandle();
    await release();
    await expect(page.locator('.space-world__canvas')).toHaveCount(0);
    await expect(note).toHaveValue('The same note survives a late renderer.');
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-cafe-visit]').click();
    await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:10000});
    await expect(root(page)).toHaveAttribute('data-world-renderer','jiangnan');
    expect(await note.evaluate((node,before)=>node===before,original)).toBe(true);
  }finally{await release();}
});

test('module failure automatically opens the workspace with a classified local diagnostic',async({page})=>{
  await page.route(/\/world-jiangnan\.[a-f0-9]+\.js/,route=>route.abort('failed'));
  await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(root(page)).toHaveAttribute('data-room-diagnostics',/module-load/);
  await openNotes(page);await page.locator('[data-note-editor]').fill('Still usable.');
});

test('a held replacement renderer can also be cancelled immediately without stealing the workspace',async({page})=>{
  await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
  await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:10000});
  const release=await hold(page,/\/world-cafe\.[a-f0-9]+\.js/);
  try{
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await page.locator('[data-cafe-theme="zen"]').click();
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await page.locator('[data-boot-skip]').click();
    await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop',{timeout:1500});
    await openNotes(page);await page.locator('[data-note-editor]').fill('A cancelled scene switch keeps my work.');
    await release();await expect(page.locator('.space-world__canvas')).toHaveCount(0);
    await expect(page.locator('[data-note-editor]')).toHaveValue('A cancelled scene switch keeps my work.');
    await expect(root(page)).not.toHaveAttribute('data-world-failed');
  }finally{await release();}
});

test('graphics context loss restores the same editable note without another error-screen click',async({page})=>{
  await page.goto('/zh/projects/',{waitUntil:'domcontentloaded'});
  await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:10000});
  await page.evaluate(()=>(window as any).BearSpace.execute('open',{app:'notes'}));
  const note=page.locator('[data-note-editor]');await note.fill('Keep this note and selection.');const original=await note.elementHandle();
  await page.locator('.space-world__canvas').evaluate(node=>node.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(root(page)).toHaveAttribute('data-room-diagnostics',/context-lost/);
  await expect(note).toHaveValue('Keep this note and selection.');expect(await note.evaluate((node,before)=>node===before,original)).toBe(true);
});
