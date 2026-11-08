import {test,expect,type Page} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';

test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

const NOTE='GET-444 synthetic local note. Never include this in a public lookup.';
const DRAFT='GET-444 synthetic private draft.';
const PASSAGE='GET-444 deliberately synthetic public passage, returned by the selected article route.';
const agent=(page:Page)=>page.locator('[data-space-window="agent"]');

async function openAgent(page:Page){
  await page.locator('[data-space-menu-trigger]').click();
  await page.locator('.space-menu [data-open="agent"]').click();
  await expect(agent(page)).toBeVisible();
  await expect(agent(page).locator('[data-agent-root]')).toHaveAttribute('data-ready','true');
  return agent(page);
}
async function setup(page:Page){
  await reserveWorldJourney(page);
  await page.addInitScript(({note,draft})=>{
    if(window.parent!==window||sessionStorage.getItem('get444:seeded'))return;
    localStorage.setItem('bear-space:v1',JSON.stringify({version:1,windows:[],active:null,note,draft,favorites:[],excerpts:[],recoveries:[],theme:'light',wallpaper:'dawn',initialized:true}));
    sessionStorage.setItem('space:visited:v2','yes');sessionStorage.setItem('get444:seeded','yes');
  },{note:NOTE,draft:DRAFT});
  const providerRequests:string[]=[];
  page.on('request',request=>{
    if(new URL(request.url()).pathname==='/.netlify/functions/bear-agent')providerRequests.push(request.url());
  });
  await page.goto('/projects/');await enterWorkspace(page);
  const article=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}').articles[0]) as {title:string,url:string};
  expect(article?.title).toBeTruthy();expect(article?.url).toBeTruthy();
  const source=new URL(article.url,page.url()).href;
  const win=await openAgent(page);
  await expect(win.locator('[data-agent-mode]')).toHaveValue('conversation');
  return {win,article,source,query:article.title.trim().slice(0,80),providerRequests};
}
async function submit(page:Page,query:string){
  await agent(page).locator('[data-agent-mode]').selectOption('public-research');
  await expect(agent(page).locator('[data-agent-mode-hint]')).toBeVisible();
  await expect(agent(page).locator('[data-agent-context-bar]')).toBeHidden();
  await agent(page).locator('[data-agent-input]').fill(query);
  await agent(page).locator('[data-agent-send]').click();
}
async function privateState(page:Page){
  return page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('bear-space:v1')!);
    return {note:state.note,draft:state.draft,favorites:state.favorites,excerpts:state.excerpts,recoveries:state.recoveries};
  });
}
async function capture(page:Page,name:string){
  const path=test.info().outputPath(`${name}.png`);
  await agent(page).screenshot({path,animations:'disabled'});
  await test.info().attach(name,{path,contentType:'image/png'});
}
const articleHTML=()=>`<!doctype html><article class="post-content"><p>${PASSAGE}</p><script>window.GET444_UNTRUSTED_SCRIPT=true</script><form>UNTRUSTED_CONTROL_TEXT</form></article>`;

test('explicit public mode renders one verified source without a provider call or private-state mutation, and reload never replays it',async({page})=>{
  const f=await setup(page),before=await privateState(page),articleRequests:string[]=[];
  await page.route(f.source,async route=>{
    articleRequests.push(route.request().url());
    await route.fulfill({status:200,contentType:'text/html',body:articleHTML()});
  });
  await submit(page,f.query);
  const task=f.win.locator('[data-agent-task]');
  await expect(task).toHaveAttribute('data-agent-task-mode','public-research');
  await expect(task.locator('[data-agent-badge]')).toHaveAttribute('data-status','completed');
  await expect(task.locator('[data-agent-answer]')).toContainText(PASSAGE);
  await expect(task.locator('[data-agent-answer]')).toContainText('Original text excerpt (not a model summary)');
  await expect(task.locator('[data-agent-answer]')).toContainText(f.source);
  await expect(task).not.toContainText(NOTE);await expect(task).not.toContainText(DRAFT);
  await expect(task).not.toContainText('UNTRUSTED_CONTROL_TEXT');
  expect(await page.evaluate(()=>(window as unknown as {GET444_UNTRUSTED_SCRIPT?:boolean}).GET444_UNTRUSTED_SCRIPT)).toBeUndefined();
  expect(articleRequests).toEqual([f.source]);expect(f.providerRequests).toEqual([]);
  expect(await privateState(page)).toEqual(before);await capture(page,'public-source-completed');
  await page.reload();await enterWorkspace(page);await openAgent(page);
  await expect(task).toHaveAttribute('data-agent-task-mode','public-research');
  await expect(task.locator('[data-agent-badge]')).toHaveAttribute('data-status','completed');
  await expect(task.locator('[data-agent-answer]')).toContainText(PASSAGE);
  await expect(f.win.locator('[data-agent-mode]')).toHaveValue('conversation');
  expect(articleRequests).toEqual([f.source]);expect(f.providerRequests).toEqual([]);
  expect(await privateState(page)).toEqual(before);
});

test('Stop preserves an interrupted task against a late response and Retry explicitly retains the public mode',async({page})=>{
  const f=await setup(page),before=await privateState(page);
  let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve;});
  let requests=0;
  await page.route(f.source,async route=>{
    const first=++requests===1;
    if(first)await held;
    if(route.request().failure())return;
    await route.fulfill({status:200,contentType:'text/html',body:first?'<article class="post-content">LATE_GET444_MUST_NOT_APPEAR</article>':articleHTML()});
  });
  try{
    await submit(page,f.query);await expect.poll(()=>requests).toBe(1);
    await f.win.locator('[data-agent-stop]').click();
    await expect(f.win.locator('[data-agent-badge]')).toHaveAttribute('data-status','interrupted');
  }finally{release();}
  await expect(f.win).not.toContainText('LATE_GET444_MUST_NOT_APPEAR');
  await capture(page,'public-source-interrupted');
  await page.reload();await enterWorkspace(page);await openAgent(page);
  const interrupted=f.win.locator('[data-agent-task]').first();
  await expect(interrupted.locator('[data-agent-badge]')).toHaveAttribute('data-status','interrupted');
  expect(requests).toBe(1);
  await expect(f.win.locator('[data-agent-mode]')).toHaveValue('conversation');
  await interrupted.locator('[data-agent-retry]').click();
  await expect(f.win.locator('[data-agent-mode]')).toHaveValue('public-research');
  await expect(f.win.locator('[data-agent-task]')).toHaveCount(2);
  await expect(f.win.locator('[data-agent-task]').last().locator('[data-agent-badge]')).toHaveAttribute('data-status','completed');
  await expect(interrupted.locator('[data-agent-badge]')).toHaveAttribute('data-status','interrupted');
  await expect(f.win).not.toContainText('LATE_GET444_MUST_NOT_APPEAR');
  expect(requests).toBe(2);expect(f.providerRequests).toEqual([]);expect(await privateState(page)).toEqual(before);
});

test('a non-article response is visibly failed and stays failed after reopening without automatic reads',async({page})=>{
  const f=await setup(page);let requests=0;
  await page.route(f.source,async route=>{requests++;await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><main>GET444_NON_ARTICLE_MUST_NOT_BECOME_A_QUOTE</main>'});});
  await submit(page,f.query);
  const task=f.win.locator('[data-agent-task]');
  await expect(task.locator('[data-agent-badge]')).toHaveAttribute('data-status','failed');
  await expect(f.win.locator('[data-agent-status]')).toContainText('did not complete');
  await expect(task).not.toContainText('GET444_NON_ARTICLE_MUST_NOT_BECOME_A_QUOTE');
  await capture(page,'public-source-failed');
  await f.win.locator('[data-window-action="close"]').click();await expect(f.win).toHaveCount(0);
  await openAgent(page);
  await expect(task.locator('[data-agent-badge]')).toHaveAttribute('data-status','failed');
  expect(requests).toBe(1);expect(f.providerRequests).toEqual([]);
});
