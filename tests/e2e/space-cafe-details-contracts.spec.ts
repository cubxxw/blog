import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';
import {clickStaticRoomControl} from '../helpers/static-room-control';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.env.SPACE_SOFTWARE_QA==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
const root=(page:Page)=>page.locator('[data-bear-workspace]');
const detail=(page:Page,kind:string)=>page.locator(`[data-cafe-inspect="${kind}"]`);
const exit=(page:Page)=>page.locator('[data-cafe-inspect-exit]');
const frames=(page:Page,count=2)=>page.evaluate(count=>new Promise<void>(done=>{const next=()=>--count?requestAnimationFrame(next):done();requestAnimationFrame(next);}),count);
async function settled(page:Page,mode:string){
  await expect.poll(()=>page.evaluate(()=>{
    const el=document.querySelector<HTMLElement>('[data-bear-workspace]');
    return {mode:el?.getAttribute('data-world-mode')??null,rendered:el?.getAttribute('data-world-rendered-mode')??null,travel:el?.getAttribute('data-world-travel')??null};
  }),{timeout:5000}).toEqual({mode,rendered:mode,travel:'false'});
}
async function ready(page:Page,lang='zh'){
  await reserveWorldJourney(page);
  await page.goto(`${lang==='zh'?'/zh':''}/projects/`);await page.waitForFunction(()=>{const d=document.querySelector<HTMLElement>('[data-bear-workspace]')?.dataset;return d?.worldReady==='true'&&d.bootState==='complete'&&!d.worldLoading;},undefined,{timeout:30_000});await settled(page,'roam');
}
async function hit(button:Locator){
  await expect(button).toBeVisible();const b=(await button.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(await button.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
}
async function pose(page:Page){return JSON.parse((await root(page).getAttribute('data-world-pose'))!);}
async function inspect(page:Page,kind:string){await hit(detail(page,kind));await detail(page,kind).click();await settled(page,'inspect');await expect(root(page)).toHaveAttribute('data-world-inspect',kind);await hit(exit(page));}
async function samePose(page:Page,value:unknown){await settled(page,'roam');expect(await pose(page)).toEqual(value);await expect(root(page)).not.toHaveAttribute('data-world-inspect');}
async function point(page:Page,position:number[]){
  return page.evaluate(async position=>{
    const imports=JSON.parse(document.querySelector('script[type="importmap"]')!.textContent!).imports;
    const THREE=await import(imports.three),el=document.querySelector<HTMLElement>('[data-bear-workspace]')!,p=JSON.parse(el.dataset.worldPose!),r=el.getBoundingClientRect();
    const camera=new THREE.PerspectiveCamera(p.fov,r.width/r.height,.08,220);camera.position.set(p.x,p.y,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');camera.updateMatrixWorld();const v=new THREE.Vector3(...position).project(camera);return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};
  },position);
}

for(const view of [{width:1440,height:900,lang:'zh'},{width:390,height:844,lang:'en'},{width:320,height:740,lang:'zh'}])test.describe(`${view.width}px true café detail entry`,()=>{
  test.use({viewport:{width:view.width,height:view.height},isMobile:view.width<640,hasTouch:view.width<640});
  test('the ten real source books and coffee views have reachable exits and restore their exact roam pose and native trigger',async({page})=>{
    await ready(page,view.lang);
    const raster=await page.locator('.space-world__canvas').evaluate((canvas:HTMLCanvasElement)=>{
      // An initialized canvas returns its existing context; a different context
      // type returns null. Do not create a probe canvas or a second renderer.
      const gl=(canvas.getContext('webgl2')||canvas.getContext('webgl')) as WebGL2RenderingContext|WebGLRenderingContext|null;
      let renderer='';try{const debug=gl?.getExtension('WEBGL_debug_renderer_info');if(debug)renderer=String(gl!.getParameter(debug.UNMASKED_RENDERER_WEBGL)||'');}catch{}
      const root=canvas.closest<HTMLElement>('[data-bear-workspace]')!;
      return {renderer,software:/SwiftShader|llvmpipe|softpipe|swrast|software rasterizer/i.test(renderer),width:canvas.width,height:canvas.height,cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight,rootWidth:root.clientWidth,rootHeight:root.clientHeight,dpr:devicePixelRatio};
    });
    expect(raster.cssWidth).toBe(raster.rootWidth);expect(raster.cssHeight).toBe(raster.rootHeight);
    if(raster.software)expect(raster.width*raster.height,raster.renderer).toBeLessThanOrEqual(384000);
    else{expect(raster.width).toBe(Math.floor(raster.cssWidth*Math.min(raster.dpr,1.5)));expect(raster.height).toBe(Math.floor(raster.cssHeight*Math.min(raster.dpr,1.5)));}
    const source=parse(readFileSync('data/travel.yml','utf8')).books,books=await page.locator('[data-cafe-catalog]').evaluate(el=>JSON.parse(el.textContent!).books);
    expect(books).toEqual(source.map((b:any,index:number)=>({id:`book-${index}`,title:b[`title_${view.lang}`],author:b[`author_${view.lang}`],note:b[`note_${view.lang}`],own:b.own===true,url:b.url||''})));expect(books).toHaveLength(10);
    const osBooks=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent!).books);expect(osBooks).toHaveLength(4);expect(osBooks.map((b:any)=>b.title)).toEqual(books.filter((b:any)=>b.own).map((b:any)=>b.title));
    await expect(root(page)).toHaveAttribute('data-world-reflection','room');const before=await pose(page);expect(before.y).toBe(1.52);expect(before.pitch).toBeGreaterThan(-.35);await inspect(page,'coffee');await expect(exit(page)).toBeFocused();await expect(page.locator('[data-cafe-inspect-coffee]')).toBeVisible();await page.keyboard.press('Escape');await samePose(page,before);await expect(detail(page,'coffee')).toBeFocused();
    await inspect(page,'books');const zoom=page.locator('[data-cafe-bookzoom]');await hit(zoom);await zoom.click();await settled(page,'inspect');await expect(root(page)).toHaveAttribute('data-world-inspect','spines');await expect(zoom).toBeFocused();await expect(zoom).toHaveAttribute('aria-pressed','true');await expect(detail(page,'books')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Escape');await samePose(page,before);await expect(detail(page,'books')).toBeFocused();await inspect(page,'books');await zoom.click();await settled(page,'inspect');await zoom.click();await settled(page,'inspect');await expect(root(page)).toHaveAttribute('data-world-inspect','books');await expect(zoom).toBeFocused();await expect(zoom).toHaveAttribute('aria-pressed','false');const list=page.locator('[data-cafe-inspect-books] ul'),toggle=page.locator('[data-cafe-booklist-toggle]');await expect(list).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toHaveAttribute('aria-controls','space-cafe-booklist');await hit(toggle);await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(list.locator('li strong')).toHaveText(books.map((b:any)=>b.title));await expect(list.locator('li span')).toHaveText(books.map((b:any)=>b.author));await expect(list.locator('a')).toHaveCount(0);
    for(const title of books.filter((b:any)=>b.own).map((b:any)=>b.title)){const label=list.locator('strong').filter({hasText:title}).first();await label.scrollIntoViewIfNeeded();await expect(label).toBeVisible();}
    await list.locator('li').last().scrollIntoViewIfNeeded();await expect(list.locator('li').last()).toBeVisible();await hit(exit(page));await exit(page).click();await samePose(page,before);await expect(detail(page,'books')).toBeFocused();await inspect(page,'books');await expect(list).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');await exit(page).click();await samePose(page,before);expect(await root(page).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  });
});

test('the actual cup and book raycasts enter the same detail views; a drag retains the computer hit instead of creating a click',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await ready(page);const before=await pose(page),coffee=await point(page,[-.05,.865,1.3]);await page.mouse.click(coffee.x,coffee.y);await settled(page,'inspect');await expect(root(page)).toHaveAttribute('data-world-inspect','coffee');await page.keyboard.press('Escape');await samePose(page,before);await expect(page.locator('.space-world__canvas')).toBeFocused();
  const book=await point(page,[-.37,.809,1.5]);await page.mouse.click(book.x,book.y);await settled(page,'inspect');await expect(root(page)).toHaveAttribute('data-world-inspect','books');await exit(page).click();await samePose(page,before);
  const p=await pose(page),yaw=Math.atan2(-(3.65-p.x),-(-2.63-p.z)),pitch=Math.atan2(1.86-p.y,Math.hypot(3.65-p.x,-2.63-p.z)),b=(await root(page).boundingBox())!,x=b.x+b.width*.55,y=b.y+b.height*.55;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-(yaw-p.yaw)/.0035,y-(pitch-p.pitch)/.003,{steps:6});await page.mouse.up();await settled(page,'roam');const monitor=await point(page,[3.65,1.86,-2.63]);await page.mouse.click(monitor.x,monitor.y);await settled(page,'workspace');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
});

test('six scene changes and both detail views preserve the original Notes node, draft and selection through the live workspace',async({page})=>{
  await reserveWorldJourney(page,120_000);
  await page.setViewportSize({width:1440,height:900});await ready(page);await enterWorkspace(page);await page.locator('[data-space-dock] [data-open="notes"]').click();const editor=page.locator('[data-note-editor]'),original=await editor.elementHandle(),draft='Coffee on the table.\nContinue this same notebook.';await editor.fill(draft);await editor.evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(3,18,'backward'));const selection=await editor.evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection]);
  await page.locator('.space-world-hud [data-cafe-visit]').click();await settled(page,'roam');const before=await pose(page);await inspect(page,'coffee');await exit(page).click();await samePose(page,before);await inspect(page,'books');await page.keyboard.press('Escape');await samePose(page,before);
  for(const id of ['zen','garden','coast','mountain','lake','rain']){await page.locator('.space-cafe__utilities [data-cafe-picker]').click();const choice=page.locator('[data-cafe-dialog]').locator(`button[data-cafe-theme="${id}"]`);await expect(choice).toHaveCount(1);await choice.click();await expect(root(page)).toHaveAttribute('data-world-theme',id);await expect(page.locator('[data-cafe-dialog]')).not.toHaveAttribute('open');}
  await page.locator('[data-cafe-enter]').click();await settled(page,'workspace');expect(await editor.evaluate((el,old)=>el===old,original)).toBe(true);await expect(editor).toHaveValue(draft);expect(await editor.evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual(selection);
});

test('runtime quiet/reduce and resize settle inspection without a late focus grab or an idle render loop',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await ready(page,'en');const before=await pose(page);await clickStaticRoomControl(page,'[data-cafe-inspect="coffee"]');await expect(exit(page)).toBeFocused();const quiet=page.locator('.space-cafe__utilities [data-cafe-quiet]');await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-quiet]');await expect(quiet).toHaveAttribute('aria-pressed','true');await settled(page,'inspect');await expect(quiet).toBeFocused();await page.setViewportSize({width:390,height:844});await frames(page);await expect(root(page)).toHaveAttribute('data-world-inspect','coffee');await expect(quiet).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>new Promise<boolean>(resolve=>{
    const el=document.querySelector('[data-bear-workspace]'),before=el?.getAttribute('data-world-frames');
    let remaining=6;const next=()=>{if(--remaining)requestAnimationFrame(next);else resolve(!!el&&before!==null&&before!==undefined&&document.querySelector('[data-bear-workspace]')===el&&el.getAttribute('data-world-frames')===before);};
    requestAnimationFrame(next);
  })),{timeout:5000}).toBe(true);await page.keyboard.press('Escape');await samePose(page,before);await expect(quiet).toBeFocused();
  await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-quiet]');await clickStaticRoomControl(page,'[data-cafe-inspect="books"]');await expect(exit(page)).toBeFocused();await page.keyboard.press('Tab');const zoom=page.locator('[data-cafe-bookzoom]');await expect(zoom).toBeFocused();await zoom.press('Enter');await expect(root(page)).toHaveAttribute('data-world-inspect','spines');await expect(zoom).toBeFocused();await zoom.press('Enter');await expect(root(page)).toHaveAttribute('data-world-inspect','books');await page.keyboard.press('Tab');const toggle=page.locator('[data-cafe-booklist-toggle]');await expect(toggle).toBeFocused();await toggle.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Tab');const list=page.locator('[data-cafe-inspect-books] ul');await expect(list).toBeFocused();await page.emulateMedia({reducedMotion:'reduce'});await settled(page,'inspect');await expect(list).toBeFocused();await page.setViewportSize({width:320,height:740});await frames(page);await expect(list).toBeFocused();await page.keyboard.press('Escape');await samePose(page,before);await expect(detail(page,'books')).toBeFocused();
});

test('a held then failed latte image never blocks the first room; simulated context loss restores the same Notes document',async({page})=>{
  await page.setViewportSize({width:1440,height:900});let release=()=>{},requests=0;const gate=new Promise<void>(done=>{release=done;});await page.route('**/images/space/cafe/latte-rosetta-v1.jpg',async route=>{requests++;await gate;await route.abort('failed');});
  try{await ready(page);expect(requests).toBe(1);await inspect(page,'coffee');await expect(root(page)).not.toHaveAttribute('data-world-failed');expect(Number(await root(page).getAttribute('data-world-triangles'))).toBeGreaterThan(10000);release();await frames(page);await exit(page).click();await enterWorkspace(page);await page.locator('[data-space-dock] [data-open="notes"]').click();const editor=page.locator('[data-note-editor]'),old=await editor.elementHandle();await editor.fill('This document survives a renderer failure.');await page.locator('.space-world-hud [data-cafe-visit]').click();await settled(page,'roam');await inspect(page,'books');await page.locator('.space-world__canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(root(page)).toHaveAttribute('data-world-failed','true');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');await expect(page.locator('[data-cafe-inspect-panel]')).toBeHidden();expect(await page.locator('[data-space-window="notes"]').evaluate(el=>el.contains(document.activeElement))).toBe(true);expect(await editor.evaluate((el,old)=>el===old,old)).toBe(true);await expect(editor).toHaveValue('This document survives a renderer failure.');}
  finally{release();await page.unrouteAll({behavior:'wait'});}
});
