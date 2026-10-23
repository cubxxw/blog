import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {hitRoomObject,lookAtRoomObject} from '../helpers/room-interaction';

test.use({channel:'chromium',launchOptions:{args:process.platform==='darwin'&&process.env.SPACE_SOFTWARE_QA!=='1'
  ? ['--enable-gpu','--use-angle=metal']
  : ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});

const root=(page:Page)=>page.locator('[data-bear-workspace]');
const phase=(page:Page,value:string)=>expect(root(page)).toHaveAttribute('data-room-door-state',value,{timeout:30_000});
const pose=async(page:Page)=>JSON.parse((await root(page).getAttribute('data-world-pose'))!);
const panel=(page:Page,kind:string)=>root(page).locator(`.space-cafe-door[data-door-panel="${kind}"]`);
const stepButton=(page:Page)=>panel(page,'threshold').getByRole('button',{name:'到外面走一步',exact:true});
const safeExit=(page:Page)=>root(page).locator('.space-cafe-door-exit');
const failures=new WeakMap<Page,string[]>();

test.beforeEach(async({page})=>{
  test.setTimeout(150_000);
  const errors:string[]=[];failures.set(page,errors);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/THREE.WebGLProgram|Shader Error|GL_INVALID/.test(message.text()))errors.push(message.text());});
  await page.addInitScript(()=>{
    localStorage.setItem('space:cafe:theme:v2','jiangnan');
    localStorage.setItem('space:cafe:onboarding:v1','seen');
    localStorage.setItem('space:cafe:quiet:v1','no');
    sessionStorage.removeItem('space:cafe:mode');
  });
});
test.afterEach(async({page})=>{expect(failures.get(page)).toEqual([]);});

async function ready(page:Page) {
  await page.goto('/zh/projects/?room-hour=22');
  await expect(root(page)).toHaveAttribute('data-world-renderer','jiangnan',{timeout:30_000});
  await expect(root(page)).toHaveAttribute('data-boot-state','complete',{timeout:30_000});
  await expect(root(page)).toHaveAttribute('data-world-ready','true',{timeout:30_000});
  await expect(root(page)).toHaveAttribute('data-cafe-mode','cafe');
  await expect(root(page)).toHaveAttribute('data-world-mode','roam');
  await expect(root(page)).toHaveAttribute('data-world-travel','false');
  await phase(page,'indoor');
}

async function savedScreenshot(page:Page,name:string) {
  // Artifacts for human review; these deliberately are not pixel baselines.
  const path=test.info().outputPath(`${name}.png`);
  await root(page).screenshot({path,animations:'disabled'});
  await test.info().attach(name,{path,contentType:'image/png'});
}

// Read-only observations: never settle, seek, finish or otherwise control an
// animation. A diagnostic failure must not replace the original CSS assertion.
async function recordWaterState(page:Page,label:string,includeDOM=false) {
  try {
    const state=await page.evaluate(includeDOM=>{
      const root=document.querySelector<HTMLElement>('[data-bear-workspace]')!;
      const water=root.querySelector<HTMLElement>('.space-cafe-door-water')!;
      const selector='.space[data-room-door-state="submerged"] .space-cafe-door-water';
      const attributes=['id','class','style','hidden','inert','data-room-door-state','data-room-door-still','data-world-mode','data-world-travel','data-world-frames','data-world-pose','data-cafe-mode'];
      const rootAttributes=Object.fromEntries(attributes.map(name=>[name,root.getAttribute(name)]));
      const properties=['opacity','display','visibility','transition','transition-property','transition-duration','transition-delay','transition-timing-function','transition-behavior','animation','animation-name','animation-duration','animation-delay','animation-play-state','animation-fill-mode','animation-timing-function','animation-iteration-count'];
      const styles=(node:Element)=>{const computed=getComputedStyle(node);return Object.fromEntries(properties.map(name=>[name,computed.getPropertyValue(name)]));};
      const animations=water.getAnimations({subtree:true}).map(animation=>{
        const effect=animation.effect,frames=effect instanceof KeyframeEffect?effect.getKeyframes():null;
        const target=effect instanceof KeyframeEffect?effect.target:null;
        return {id:animation.id,type:animation.constructor.name,playState:animation.playState,pending:animation.pending,
          currentTime:animation.currentTime,startTime:animation.startTime,playbackRate:animation.playbackRate,
          // Promise state has no synchronous observer. Retain its type and the
          // animation's pending flag without awaiting a possibly stalled ready.
          ready:Object.prototype.toString.call(animation.ready),
          target:target?{tag:target.tagName,id:target.id,class:target.getAttribute('class')}:null,
          timing:effect?.getTiming(),computedTiming:effect?.getComputedTiming(),keyframes:frames};
      });
      let rootDOM:string|undefined;
      if(includeDOM){
        // Keep the exact relevant DOM while omitting unrelated catalog/app data.
        // Only a detached clone is edited; the live root is never mutated.
        const clone=root.cloneNode(false) as HTMLElement;
        for(const attribute of [...clone.attributes])if(!attributes.includes(attribute.name))clone.removeAttribute(attribute.name);
        for(const node of root.querySelectorAll('.space-cafe-door-water,.space-cafe-door'))clone.append(node.cloneNode(true));
        rootDOM=clone.outerHTML;
      }
      return {rootAttributes,waterCount:root.querySelectorAll('.space-cafe-door-water').length,
        selector:{value:selector,matches:water.matches(selector),count:document.querySelectorAll(selector).length},
        water:{connected:water.isConnected,styles:styles(water),bounds:water.getBoundingClientRect().toJSON(),outerHTML:includeDOM?water.outerHTML:undefined},
        rootStyles:styles(root),rootDOM,animations,
        environment:{innerWidth,innerHeight,devicePixelRatio,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,
          visibilityState:document.visibilityState,hidden:document.hidden,timelineTime:document.timeline.currentTime,performanceNow:performance.now(),dateNow:Date.now()}};
    },includeDOM);
    const info=test.info(),observation={label,project:info.project.name,retry:info.retry,browserVersion:page.context().browser()?.version(),...state};
    const json=JSON.stringify(observation,(_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value,2);
    console.info(`[door-water] ${json}`);
    await info.attach(`door-water-${label}`,{body:json,contentType:'application/json'});
  } catch(error) {
    console.warn(`[door-water] ${label}: diagnostic collection failed: ${error instanceof Error?error.message:String(error)}`);
  }
}

async function clickPhysicalDoor(page:Page,{touch=false,double=false}={}) {
  const point=await lookAtRoomObject(page,'door');
  const before=await pose(page);
  if(touch) {
    await page.touchscreen.tap(point.x,point.y);
    if(double)await page.touchscreen.tap(point.x,point.y);
  } else if(double) await page.mouse.dblclick(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
  return before;
}

async function threshold(page:Page) {
  await phase(page,'threshold');
  await expect(root(page)).toHaveAttribute('data-world-travel','false',{timeout:30_000});
  await expect(panel(page,'threshold')).toHaveCount(1);
  await expect(stepButton(page)).toBeVisible();
  for(const selector of ['.space-cafe__header','.space-world-hud__roam','.space-world-hud__workspace'])await expect(root(page).locator(selector)).toBeHidden();
  await expect(safeExit(page)).toBeVisible();
  await expect(safeExit(page)).toHaveCSS('color','rgb(255, 248, 232)');
  await expect(safeExit(page)).toHaveCSS('background-color','rgba(24, 43, 35, 0.85)');
}

async function returned(page:Page,before:Record<string,number>) {
  await phase(page,'indoor');
  await expect(root(page)).toHaveAttribute('data-world-mode','roam');
  await expect(root(page)).toHaveAttribute('data-world-travel','false');
  await expect(root(page).locator('.space-cafe-door')).toHaveCount(0);
  await expect(safeExit(page)).toBeHidden();
  await expect(root(page).locator('.space-cafe-door-water')).toHaveCSS('opacity','0');
  expect(await pose(page)).toEqual(before);
}

async function isReachable(node:Locator,minimum=44) {
  await expect(node).toBeInViewport();
  const measured=await node.evaluate(el=>{
    const box=el.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    return {width:box.width,height:box.height,hit:hit!==null&&el.contains(hit)};
  });
  expect(measured.width).toBeGreaterThanOrEqual(minimum);
  expect(measured.height).toBeGreaterThanOrEqual(minimum);
  expect(measured.hit).toBe(true);
}

for(const width of [1440,390]) for(const motion of ['no-preference','reduce'] as const) {
  test.describe(`${width}px / ${motion}`,()=>{
    const touch=width===390;
    test.use({viewport:{width,height:touch?844:900},isMobile:touch,hasTouch:touch,reducedMotion:motion});

    test('the real rear door, deliberate step, splash and safe return form one repeatable journey',async({page})=>{
      await ready(page);
      await lookAtRoomObject(page,'door');
      await savedScreenshot(page,'closed-rear-door');
      const before=await clickPhysicalDoor(page,{touch,double:true});
      await threshold(page);
      await expect(panel(page,'submerged')).toHaveCount(0);
      await recordWaterState(page,'threshold-before-screenshot');
      await savedScreenshot(page,'threshold');
      await recordWaterState(page,'threshold-after-screenshot');
      if(width===1440&&motion==='reduce') {
        const widePose=await pose(page);
        await page.setViewportSize({width:390,height:844});
        await expect.poll(async()=>(await pose(page)).z).toBeLessThan(widePose.z-.3);
        await isReachable(safeExit(page));
        await page.setViewportSize({width,height:900});
        await expect.poll(()=>pose(page)).toEqual(widePose);
      }
      if(touch) {
        for(const button of await panel(page,'threshold').getByRole('button').all())await isReachable(button);
        await isReachable(safeExit(page));
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await savedScreenshot(page,'390-overlay');
        await stepButton(page).tap();
      } else await stepButton(page).click();
      await phase(page,'submerged');
      await recordWaterState(page,'submerged-entered');
      await expect(root(page)).toHaveAttribute('data-world-travel','false');
      await expect(panel(page,'threshold')).toHaveCount(0);
      await expect(panel(page,'submerged')).toHaveCount(1);
      await expect(panel(page,'submerged').getByRole('status')).toContainText('鱼却都看见了');
      try {
        await expect(root(page).locator('.space-cafe-door-water')).toHaveCSS('opacity','1');
      } catch(error) {
        await recordWaterState(page,'opacity-assertion-failed',true);
        throw error;
      }
      await savedScreenshot(page,'submerged');
      const recover=panel(page,'submerged').getByRole('button',{name:'回到咖啡馆',exact:true});
      if(touch) {await isReachable(recover);await recover.tap();} else await recover.click();
      await returned(page,before);
      await savedScreenshot(page,'returned');

      // Reopen the actual door after a full run. The desktop path also proves
      // its focus-revealed object control invokes the same production action.
      let again:Record<string,number>;
      if(touch)again=await clickPhysicalDoor(page,{touch});
      else {
        again=await pose(page);
        const control=root(page).locator('.jiangnan-object-controls [data-room-object="door"]');
        await control.focus();await control.press('Enter');
      }
      await threshold(page);
      if(touch)await safeExit(page).tap();else await safeExit(page).click();
      await returned(page,again);
      await expect(root(page).locator('.space-cafe-door')).toHaveCount(0);
    });
  });
}

test.describe('escape during a moving excursion',()=>{
  test.use({viewport:{width:1440,height:900},isMobile:false,hasTouch:false,reducedMotion:'no-preference'});

  test('Escape restores the same camera from every phase, including a return already in flight',async({page})=>{
    test.setTimeout(240_000);await ready(page);
    for(const target of ['approaching','opening','threshold','falling','submerged','returning']) {
      await test.step(`Escape from ${target}`,async()=>{
        const before=await clickPhysicalDoor(page);
        if(target==='approaching'||target==='opening')await phase(page,target);
        else {
          await threshold(page);
          if(target==='falling'||target==='submerged') {
            await stepButton(page).click();await phase(page,target);
          } else if(target==='returning') {
            await safeExit(page).click();await phase(page,'returning');
          }
        }
        await page.keyboard.press('Escape');
        await returned(page,before);
      });
    }
  });

  test('resizing and enabling reduced motion during opening keeps the explicit step and return reachable',async({page})=>{
    await ready(page);const before=await clickPhysicalDoor(page);await phase(page,'opening');
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await threshold(page);await expect(root(page)).toHaveAttribute('data-room-door-still','true');
    expect((await pose(page)).z).toBeLessThan(.75);
    await stepButton(page).click();await phase(page,'submerged');
    await expect(panel(page,'submerged').getByRole('button',{name:'回到咖啡馆',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');await returned(page,before);
  });

  test('a companion shortcut during opening returns from the Mac to the pre-door camera',async({page})=>{
    await ready(page);const before=await clickPhysicalDoor(page);await phase(page,'opening');
    await page.keyboard.press('Control+j');
    await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
    await expect(root(page)).toHaveAttribute('data-world-mode','workspace');
    await expect(root(page)).toHaveAttribute('data-world-travel','false',{timeout:30_000});
    await expect(root(page).locator('[data-space-window="agent"]')).toBeVisible();
    await phase(page,'indoor');await expect(root(page).locator('.space-cafe-door')).toHaveCount(0);
    await backToRoom(page);await returned(page,before);
  });
});

test.describe('touch recovery before reaching the threshold',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  test('the persistent exit is tappable while the initial camera approach is still moving',async({page})=>{
    await ready(page);const before=await clickPhysicalDoor(page,{touch:true});await phase(page,'approaching');
    await isReachable(safeExit(page));await safeExit(page).tap();
    await returned(page,before);await expect(root(page).locator('.space-cafe-door')).toHaveCount(0);
  });
});

async function openApp(page:Page,app:string) {
  const workspace=root(page),dock=workspace.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else {
    await workspace.locator('[data-space-menu-trigger]').click();
    await workspace.locator('.space-menu [data-space-launchpad-trigger]').click();
    await workspace.locator(`[data-launchpad-app="${app}"]`).click();
  }
  const win=workspace.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
}

async function backToRoom(page:Page) {
  await root(page).locator('[data-space-menu-trigger]').click();
  // The workspace HUD also has data-cafe-visit; the menu action is intentional.
  await root(page).locator('.space-menu [data-cafe-visit]').click();
  await expect(root(page)).toHaveAttribute('data-world-mode','roam');
  await expect(root(page)).toHaveAttribute('data-world-travel','false',{timeout:30_000});
}

test.describe('the working Mac survives the excursion',()=>{
  test.use({viewport:{width:1440,height:900},isMobile:false,hasTouch:false,reducedMotion:'reduce'});
  test('Notes keeps its original DOM, draft and backward selection, and the reader keeps its article and scroll',async({page})=>{
    await ready(page);await hitRoomObject(page,'computer');
    await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
    const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]');
    const draft='这本笔记跟着同一台电脑，出门也不会被水冲走。';await editor.fill(draft);
    const originalEditor=await editor.elementHandle();
    await editor.evaluate((el:HTMLTextAreaElement)=>el.setSelectionRange(2,11,'backward'));
    await expect(notes.locator('[data-note-save]')).toHaveAttribute('data-saved','true');
    const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');
    await reader.locator('[data-open="reader"][data-payload="/zh/engineering/posts/use-go-tools-dlv/"]').click();
    const article=reader.locator('[data-reader-body] .post-content');await expect(article).toBeVisible();
    const originalArticle=await article.elementHandle(),scroller=reader.locator('[data-window-body]');
    const originalScroller=await scroller.elementHandle();
    await article.locator('p').first().hover();await page.mouse.wheel(0,700);
    await expect.poll(()=>scroller.evaluate(el=>el.scrollTop)).toBeGreaterThan(200);
    const scrollTop=await scroller.evaluate(el=>el.scrollTop);
    await backToRoom(page);
    const before=await clickPhysicalDoor(page);await threshold(page);await stepButton(page).click();await phase(page,'submerged');
    await panel(page,'submerged').getByRole('button',{name:'回到咖啡馆',exact:true}).click();await returned(page,before);
    await hitRoomObject(page,'computer');await expect(root(page)).toHaveAttribute('data-cafe-mode','desktop');
    expect(await editor.evaluate((el,old)=>el===old,originalEditor)).toBe(true);
    await expect(editor).toHaveValue(draft);
    expect(await editor.evaluate((el:HTMLTextAreaElement)=>[el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual([2,11,'backward']);
    expect(await article.evaluate((el,old)=>el===old,originalArticle)).toBe(true);
    expect(await scroller.evaluate((el,old)=>el===old,originalScroller)).toBe(true);
    expect(Math.abs(await scroller.evaluate(el=>el.scrollTop)-scrollTop)).toBeLessThanOrEqual(1);
    await openApp(page,'notes');await editor.press('End');await editor.press('Enter');await editor.pressSequentially('继续写。');
    await expect(editor).toHaveValue(`${draft}\n继续写。`);
  });
});
