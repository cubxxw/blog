import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace} from '../helpers/space-entry';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
async function captureReview(page:Page,name:string){
  const path=test.info().outputPath(`${name}.png`);
  await page.locator('[data-bear-workspace]').screenshot({path,animations:'disabled'});
  await test.info().attach(name,{path,contentType:'image/png'});
}

const root=(page:Page)=>page.locator('[data-bear-workspace]');
const companion=(page:Page)=>page.locator('[data-space-window="agent"]');
async function openCompanion(page:Page){
  await page.goto('/zh/projects/');await enterWorkspace(page);
  await page.locator('[data-space-dock] [data-open="agent"]').click();
  await expect(companion(page)).toBeVisible();
}
async function hit(control:Locator){
  await control.scrollIntoViewIfNeeded();await expect(control).toBeVisible();
  const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await control.evaluate(el=>{const box=el.getBoundingClientRect();return el.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));})).toBe(true);
}
async function fillsActiveSurface(page:Page){
  const win=companion(page),layer=(await page.locator('[data-space-windows]').boundingBox())!,box=(await win.boundingBox())!;
  const phone=page.viewportSize()!.width<=640,inset=phone?6:10,top=phone?4:10,bottom=phone?88:104;
  expect(Math.abs(box.x-layer.x-inset)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y-layer.y-top)).toBeLessThanOrEqual(1);
  expect(Math.abs(layer.x+layer.width-box.x-box.width-inset)).toBeLessThanOrEqual(1);
  expect(Math.abs(layer.y+layer.height-box.y-box.height-bottom)).toBeLessThanOrEqual(1);
  expect(await win.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  const send=win.locator('[data-agent-send]');for(const control of await win.locator('.bear-agent__controls > button:visible').all())await hit(control);
  const sendBox=(await send.boundingBox())!;expect(sendBox.y+sendBox.height).toBeLessThanOrEqual(box.y+box.height);
  expect((await win.locator('[data-agent-input]').boundingBox())!.width).toBeGreaterThanOrEqual(100);
  expect(await win.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
}

for(const size of [{width:768,height:1024},{width:390,height:568},{width:320,height:568}])test.describe(`${size.width}×${size.height} active companion`,()=>{
  test.use({viewport:size,isMobile:size.width<640,hasTouch:size.width<640});
  test('compact, conversation and history use the single task surface; a shorter viewport retains the composer',async({page})=>{
    await openCompanion(page);await expect(root(page)).toHaveAttribute('data-workspace-layout','single');
    await expect(companion(page)).toHaveAttribute('data-companion-mode','compact');await fillsActiveSurface(page);await captureReview(page,'assistant-empty');
    await expect(companion(page).locator('.bear-agent__prompt-hint')).toHaveCSS('font-size','14px');
    const longAnswer=Array.from({length:24},(_,i)=>`第 ${i+1} 段公开回答，用于验证真实对话区域能独立滚动。`).join('\n\n');
    let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/.netlify/functions/bear-agent',async route=>{await gate;await route.fulfill({contentType:'application/json',body:JSON.stringify({message:longAnswer,toolCalls:[]})});});
    await companion(page).locator('[data-agent-input]').fill('测试对话区域');await companion(page).locator('[data-agent-send]').click();
    try{await expect(companion(page).locator('[data-agent-stop]')).toBeVisible();await fillsActiveSurface(page);}finally{release();}
    await expect(companion(page).locator('[data-agent-badge]')).toHaveAttribute('data-status','completed');
    await expect(companion(page)).toHaveAttribute('data-companion-mode','expanded');await fillsActiveSurface(page);
    expect(await companion(page).locator('[data-chat-log]').evaluate(el=>el.clientHeight>0&&el.scrollHeight>el.clientHeight)).toBe(true);
    await companion(page).locator('[data-agent-history]').click();const history=companion(page).locator('[data-agent-sessions]');await expect(history).toBeVisible();await hit(history.locator('[data-agent-history-close]'));await history.locator('[data-agent-history-close]').click();
    const narrow={width:size.width,height:420};await page.setViewportSize(narrow);await expect.poll(()=>companion(page).evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(340);
    await companion(page).locator('[data-agent-input]').focus();await fillsActiveSurface(page);await expect(companion(page).locator('[data-agent-input]')).toBeFocused();await captureReview(page,'assistant-short');
    await page.unrouteAll({behavior:'wait'});
  });
});

test('wide desktop keeps the compact floating companion',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await openCompanion(page);await expect(root(page)).toHaveAttribute('data-workspace-layout','windows');
  const box=(await companion(page).boundingBox())!,layer=(await page.locator('[data-space-windows]').boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(560);expect(box.width).toBeGreaterThan(400);expect(box.height).toBeLessThan(layer.height*.8);expect(box.y-layer.y).toBeGreaterThan(100);
});
