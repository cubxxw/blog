import {test,expect} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';
import {clickStaticRoomControl} from '../helpers/static-room-control';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({channel:'chromium',launchOptions:{args:process.env.SPACE_SOFTWARE_QA==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
test.beforeEach(({page})=>reserveWorldJourney(page));
const root='[data-bear-workspace]';
const room=async(page:import('@playwright/test').Page)=>{
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-rendered-mode','roam');
};

for(const language of ['zh','en'])test(`the default personal room boots visibly in ${language}`,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('space:cafe:theme:v2','jiangnan'));
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-jiangnan.*.js',async route=>{await gate;await route.continue();});
  const evidence=process.env.SPACE_BOOT_EVIDENCE_DIR;
  await page.goto(language==='zh'?'/zh/projects/':'/projects/');
  try{
    await expect(page.locator('.space-boot__body')).toBeVisible();
    await expect(page.locator('.space-boot__intro')).toContainText(language==='zh'?'熊鑫伟':'Xinwei Xiong');
    await expect(page.locator('[data-boot-skip]')).toBeHidden();
    expect(await page.locator('[data-space-boot]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    if(evidence){await fs.mkdir(evidence,{recursive:true});await page.screenshot({path:path.join(evidence,`${test.info().project.name}-${language}-terminal.png`)});}
  }finally{release();}
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-renderer','jiangnan');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  if(evidence)await page.screenshot({path:path.join(evidence,`${test.info().project.name}-${language}-room.png`)});
  expect(errors).toEqual([]);
});

test('the terminal stays visible until a real scene frame, with a direct writing escape',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-cafe.*.js',async route=>{await gate;await route.continue();});
  await page.goto('/zh/projects/');
  try {
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await expect(page.locator('[data-boot-skip]')).toBeHidden();
    await expect(page.locator('[data-boot-step]').first()).toHaveAttribute('data-state','current');
    await expect(page.locator('.space-boot__identity')).toContainText('cubxxw');
    await expect(page.locator('[data-space-boot] a').last()).toHaveAttribute('href','/zh/articles/');
    await expect(page.locator(root)).not.toHaveAttribute('data-world-ready','true');
    expect(await page.locator('[data-space-boot]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }finally{release();}
  await room(page);await expect(page.locator(root)).toHaveAttribute('data-world-ready','true');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator('[data-cafe-read]')).toBeVisible();
});

test('changing renderer keeps the terminal visible until the replacement room paints',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await room(page);
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-jiangnan.*.js',async route=>{await gate;await route.continue();});
  await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
  await page.locator('button[data-cafe-theme="jiangnan"]').click();
  try{
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await expect(page.locator('[data-boot-skip]')).toBeHidden();
    await expect(page.locator('[data-boot-step]').first()).toHaveAttribute('data-state','current');
  }finally{release();}
  await expect(page.locator(root)).toHaveAttribute('data-boot-state','complete',{timeout:30000});
  await expect(page.locator(root)).toHaveAttribute('data-world-renderer','jiangnan');
  await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator('.space-world__canvas')).toBeFocused();
});

test('a stalled replacement renderer times out to a usable workspace',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await room(page);
  await page.clock.install();
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/world-jiangnan.*.js',async route=>{await gate;await route.continue();});
  try{
    await page.locator('.space-cafe__utilities [data-cafe-picker]').click();
    await page.locator('button[data-cafe-theme="jiangnan"]').click();
    await expect(page.locator('[data-space-boot]')).toBeVisible();
    await page.clock.fastForward(30005);
    await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
    await expect(page.locator('[data-boot-skip]')).toBeVisible();
    await page.locator('[data-boot-skip]').click();
    await expect(page.locator('[data-space-boot]')).toBeHidden();
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
    await expect(page.locator('.space-world__canvas')).toHaveCount(0);
  }finally{release();await page.clock.resume();}
});

test('opening a seat or terrace from the workspace preserves notes and allows returning',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await enterWorkspace(page);
  await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(n:string,a:object)=>void}}).BearSpace.execute('open',{app:'notes'}));
  await page.locator('[data-note-editor]').fill('The same private draft.');
  await page.locator('[data-note-editor]').evaluate(el=>(el as HTMLElement).dataset.instance='resident');
  for(const place of ['outside','start']){
    await page.locator('.space-world-hud__workspace [data-cafe-picker]').click();
    await page.locator(`[data-cafe-${place}]`).click();await room(page);
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','cafe');
    await page.locator('[data-cafe-enter]').click();
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
    await expect(page.locator(root)).toHaveAttribute('data-world-mode','workspace');
    await expect(page.locator('[data-note-editor]')).toHaveAttribute('data-instance','resident');
    await expect(page.locator('[data-note-editor]')).toHaveValue('The same private draft.');
  }
});

test('a cancelled read transition cannot steal a replayed café visit',async({page})=>{
  await page.clock.install({time:new Date('2026-10-17T00:00:00Z')});
  try{
    await page.goto('/zh/projects/');await room(page);
    await page.clock.pauseAt(new Date('2026-10-17T01:00:00Z'));
    await clickStaticRoomControl(page,'[data-cafe-read]');
    await expect(page.locator(root)).toHaveAttribute('data-world-travel','true');
    await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-picker]');
    await clickStaticRoomControl(page,'[data-cafe-replay]');
    // A replay uses the already rendered room and must not add a boot delay.
    await page.clock.fastForward(2000);
    await expect(page.locator(root)).toHaveAttribute('data-boot-state','revealing');
    await page.clock.runFor(160);await room(page);
    await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','cafe');
    const snapshot=await page.evaluate(()=>(window as unknown as {BearSpace:{snapshot:()=>{active:string;windows:{id:string}[]}}}).BearSpace.snapshot());
    expect(snapshot.active).not.toBe('reader');
    await expect(page.locator('[data-space-window="reader"]')).toHaveCount(0);
    await clickStaticRoomControl(page,'[data-cafe-enter]');await page.clock.fastForward(2000);await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  }finally{await page.clock.resume();}
});

test('a completed onboarding recovers immediately after graphics context loss',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await room(page);
  await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('.space-world')).toHaveCount(0);
  await expect(page.locator('[data-space-toast]')).toBeVisible();
  await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(n:string,a:object)=>void}}).BearSpace.execute('open',{app:'notes'}));
  await page.locator('[data-note-editor]').fill('Still usable after losing the GPU.');
});

test('module failure offers an ordinary workspace and reading link',async({page})=>{
  await page.route('**/world-cafe.*.js',route=>route.abort());
  await page.goto('/zh/projects/');await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(page.locator('[data-boot-status]')).toContainText('仍可阅读');
  await page.locator('[data-boot-skip]').click();await expect(page.locator('[data-space-boot]')).toBeHidden();
  await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-menu-trigger]')).toBeVisible();
});

test('a failed deep link restores focus to its document after explicit recovery',async({page})=>{
  await page.route('**/world-cafe.*.js',route=>route.abort());
  await page.goto('/zh/projects/#identity');
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await page.locator('[data-boot-skip]').click();
  await expect(page.locator('[data-space-window="welcome"]')).toBeVisible();
  await expect(page.locator('[data-space-window="welcome"]')).toBeFocused();
});

test('the optional resident can fail without blocking the room or workspace',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/models/space/cat.glb',route=>route.abort());
  await page.goto('/zh/projects/');await room(page);await expect(page.locator(root)).toHaveAttribute('data-cat-loaded','false');
  await page.locator('[data-cafe-read]').click();await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator('[data-space-window="reader"]')).toBeVisible();
});

test('the resident wanders but pauses in quiet mode, dialogs, reduced motion and the workspace',async({page})=>{
  await reserveWorldJourney(page);
  await page.addInitScript(()=>{
    const observation={status:'startup',initialPose:null as string|null,initialTime:null as number|null,changedPose:null as string|null,changedTime:null as number|null,bootCompleteAt:null as number|null,renderedRoamAt:null as number|null,readinessError:null as string|null};
    (window as unknown as {__catMotionObservation:typeof observation}).__catMotionObservation=observation;
    // Passive timestamps retain the rendered-mode5s stage even when one
    // native startup observation replaces several expensive protocol reads.
    let readinessRoot:Element|null=null;
    const stopReadiness=()=>{readinessObserver.disconnect();removeEventListener('pagehide',stopReadiness);};
    const sampleReadiness=()=>{
      const roots=document.querySelectorAll('[data-bear-workspace]');if(!roots.length)return;
      if(roots.length!==1){observation.readinessError='ambiguous root';stopReadiness();return;}
      const el=roots[0];if(readinessRoot&&el!==readinessRoot){observation.readinessError='root replaced';stopReadiness();return;}
      readinessRoot=el;(window as unknown as {__catReadinessRoot:Element}).__catReadinessRoot=el;
      const now=performance.now();
      if(el.getAttribute('data-boot-state')==='complete'&&observation.bootCompleteAt===null)observation.bootCompleteAt=now;
      if(observation.bootCompleteAt!==null&&el.getAttribute('data-world-rendered-mode')==='roam'&&observation.renderedRoamAt===null)observation.renderedRoamAt=now;
      if(observation.bootCompleteAt!==null&&observation.renderedRoamAt!==null)stopReadiness();
    };
    const readinessObserver=new MutationObserver(sampleReadiness);
    readinessObserver.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-boot-state','data-world-rendered-mode']});
    addEventListener('pagehide',stopReadiness,{once:true});sampleReadiness();
    const startupDeadline=performance.now()+60000;
    let target:Element|null=null,done=false,timer:ReturnType<typeof setTimeout>;
    const finish=(status:string)=>{
      if(done)return;done=true;observation.status=status;
      observer.disconnect();clearTimeout(timer);removeEventListener('pagehide',onPageHide);
    };
    const onPageHide=()=>finish('pagehide');
    const sample=()=>{
      if(done)return;
      const now=performance.now();if(observation.initialTime===null&&now>startupDeadline){finish('startup-timeout');return;}
      if(!target){
        target=document.querySelector('[data-bear-workspace]');if(!target)return;
        (window as unknown as {__catMotionRoot:Element}).__catMotionRoot=target;
        observer.disconnect();observer.observe(target,{attributes:true,attributeFilter:['data-cat-loaded','data-cat-active','data-cat-pose']});
      }
      const loaded=target.getAttribute('data-cat-loaded'),active=target.getAttribute('data-cat-active'),pose=target.getAttribute('data-cat-pose');
      if(observation.initialTime===null){
        if(loaded!=='true'||active!=='true'||!pose)return;
        observation.initialPose=pose;observation.initialTime=now;observation.status='watching';
        clearTimeout(timer);timer=setTimeout(()=>finish('motion-timeout'),12000);return;
      }
      if(now-observation.initialTime>12000){finish('motion-timeout');return;}
      if(loaded==='true'&&active==='true'&&pose&&pose!==observation.initialPose){
        observation.changedPose=pose;observation.changedTime=now;finish('changed');
      }
    };
    const observer=new MutationObserver(sample);
    // Only collect actual attributes: no layout reads, frame loops or product writes.
    observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-cat-loaded','data-cat-active','data-cat-pose']});
    addEventListener('pagehide',onPageHide,{once:true});timer=setTimeout(()=>finish('startup-timeout'),60000);sample();
  });
  await page.goto('/zh/projects/');
  type MotionObservation={status:string;initialPose:string;initialTime:number;changedPose:string;changedTime:number;bootCompleteAt:number|null;renderedRoamAt:number|null;readinessError:string|null};
  const handle=await page.waitForFunction(()=>{
    const state=window as unknown as {__catMotionObservation:MotionObservation;__catMotionRoot:Element;__catReadinessRoot:Element},data=state.__catMotionObservation;
    if(!data)return false;
    if(data.readinessError||['motion-timeout','startup-timeout','pagehide'].includes(data.status))throw new Error('Resident startup observation: '+(data.readinessError||data.status));
    if(data.bootCompleteAt!==null){
      if(data.renderedRoamAt===null&&performance.now()-data.bootCompleteAt>5000)throw new Error('Rendered roam exceeded5s after observed boot completion');
      if(data.renderedRoamAt!==null&&data.renderedRoamAt-data.bootCompleteAt>5000)throw new Error('Rendered roam arrived after5s');
    }
    const roots=document.querySelectorAll<HTMLElement>('[data-bear-workspace]'),el=roots[0];
    return roots.length===1&&el===state.__catMotionRoot&&el===state.__catReadinessRoot&&el.dataset.bootState==='complete'&&el.dataset.worldRenderedMode==='roam'&&el.dataset.catLoaded==='true'&&data.bootCompleteAt!==null&&data.renderedRoamAt!==null&&data.status==='changed'?data:false;
  },undefined,{timeout:30000,polling:50});
  let movement:MotionObservation;try{movement=await handle.jsonValue();}finally{await handle.dispose();}
  const movementMs=movement.changedTime-movement.initialTime;
  expect(Number.isFinite(movementMs)).toBe(true);expect(movementMs).toBeGreaterThan(0);expect(movementMs).toBeLessThanOrEqual(12000);
  expect(movement.changedPose).not.toBe(movement.initialPose);
  const pose=()=>page.locator(root).getAttribute('data-cat-pose');
  await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-quiet]');await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');
  const quiet=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(quiet);
  const frames=await page.locator(root).getAttribute('data-world-frames');await page.waitForTimeout(200);expect(await page.locator(root).getAttribute('data-world-frames')).toBe(frames);
  await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-quiet]');
  const resumed=await page.waitForFunction(()=>document.querySelector('.space-cafe__utilities [data-cafe-quiet]')?.getAttribute('aria-pressed')==='false'&&document.querySelector<HTMLElement>('[data-bear-workspace]')?.dataset.catActive==='true',undefined,{timeout:5000,polling:50});
  await resumed.dispose();
  await clickStaticRoomControl(page,'.space-cafe__utilities [data-cafe-picker]');
  await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');const modal=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(modal);
  await page.locator('[data-cafe-picker-close]').click();
  await expect(page.locator(root)).toHaveAttribute('data-cat-active','true');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');
  const reduced=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(reduced);
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator(root)).toHaveAttribute('data-cat-active','true');
  await clickStaticRoomControl(page,'[data-cafe-enter]');await expect(page.locator(root)).toHaveAttribute('data-cafe-mode','desktop');
  await expect(page.locator(root)).toHaveAttribute('data-cat-active','false');
  const desk=await pose();await page.waitForTimeout(400);expect(await pose()).toBe(desk);
});

test('a graphics failure during the reveal cannot leave an invisible modal behind',async({page})=>{
  await page.clock.install({time:new Date('2026-10-17T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-17T01:00:00Z'));
  try{
    await page.goto('/zh/projects/');
    await expect(page.locator(root)).toHaveAttribute('data-boot-stage','2',{timeout:30000});
    // The router now loads the spatial engine lazily after this stage.
    // Wait for its actual canvas before advancing the paused animation clock.
    await expect(page.locator('.space-world__canvas')).toBeAttached();
    await page.clock.runFor(16);await expect(page.locator(root)).toHaveAttribute('data-boot-stage','3');
    // Hold the actual short reveal window immediately after the ready frame.
    await expect(page.locator(root)).toHaveAttribute('data-boot-state','revealing');
    await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
    await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
    await expect(page.locator('[data-space-boot]')).toBeHidden();
    await page.keyboard.press('Control+k');await expect(page.locator('[data-space-search]')).toBeVisible();
  }finally{await page.clock.resume();}
});

test('graphics recovery preserves the original editor, focus and selection',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/');await enterWorkspace(page);
  await page.evaluate(()=>(window as unknown as {BearSpace:{execute:(n:string,a:object)=>void}}).BearSpace.execute('open',{app:'notes'}));
  const editor=page.locator('[data-note-editor]');await editor.click();await page.keyboard.type('A quiet draft.');
  await expect(editor).toBeFocused();
  await editor.evaluate(el=>{(el as HTMLTextAreaElement).setSelectionRange(2,7);(el as HTMLElement).dataset.instance='same';});
  await page.locator('.space-world__canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator(root)).toHaveAttribute('data-world-failed','true');
  await expect(editor).toBeFocused();await expect(editor).toHaveAttribute('data-instance','same');
  expect(await editor.evaluate(el=>[(el as HTMLTextAreaElement).selectionStart,(el as HTMLTextAreaElement).selectionEnd])).toEqual([2,7]);
  await page.keyboard.type('calm');await expect(editor).toHaveValue('A calm draft.');
});

test('returning from a hidden Product Lab waits for readiness and restores keyboard entry',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/projects/#product-lab');
  await expect(page.locator(root)).toHaveAttribute('data-ready','true');
  await expect(page.locator(root)).toBeHidden();
  await page.setViewportSize({width:568,height:320});
  await page.locator('.product-view-switch [data-product-view-button="bear"]').click();
  await expect(page.locator(root)).toHaveAttribute('data-world-rendered-mode','workspace');
  await expect(page.locator('[data-space-menu-trigger]')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('.space-menu')).toBeVisible();
});
