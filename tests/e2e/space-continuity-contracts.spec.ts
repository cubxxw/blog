import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
import {enterWorkspace,reserveWorldJourney} from '../helpers/space-entry';
import {readFile} from 'node:fs/promises';

// Rendered Chromium contracts in the existing desktop/mobile projects. All
// visitor text is synthetic. Frozen routing blocks live functions/accounts;
// the video case additionally simulates the official YouTube API boundary.
test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});

const NOTE='GET-441 synthetic original note. Keep this exact text.';
const IMPORTED='GET-441 synthetic imported note.';
const EXCERPT='Synthetic GET-441 excerpt: deliberately supplied test text.';
const VIDEO='BsWxPI9UM4c';
const win=(page:Page,app:string)=>page.locator(`[data-space-window="${app}"]`);
const raw=(page:Page)=>page.evaluate(()=>localStorage.getItem('bear-space:v1'));
const stored=async(page:Page)=>JSON.parse((await raw(page))!);
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));

function workspace(note=NOTE,recoveries:object[]=[]){
  return {version:1,windows:[],active:null,note,draft:'',favorites:[],excerpts:[],recoveries,theme:'light',wallpaper:'dawn',initialized:true};
}
function backup(note=IMPORTED,recoveries:object[]=[]){
  return {name:'synthetic-get441-workspace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'bear-workspace',version:1,exportedAt:'2026-11-07T00:00:00Z',workspace:workspace(note,recoveries)}))};
}
async function setup(page:Page){
  await reserveWorldJourney(page);
  await page.addInitScript(({state,video})=>{
    if(window.parent!==window||sessionStorage.getItem('get441:seeded'))return;
    localStorage.setItem('bear-space:v1',JSON.stringify(state));
    localStorage.setItem('bear-video-positions:v1',JSON.stringify({version:1,entries:[{id:video,seconds:62}]}));
    sessionStorage.setItem('space:visited:v2','yes');sessionStorage.setItem('get441:seeded','yes');
  },{state:workspace(),video:VIDEO});
  await page.goto('/projects/');await enterWorkspace(page);
  await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-cafe-mode','desktop');
}
async function openApp(page:Page,app:string){
  const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  if(await dock.isVisible())await dock.click();
  else{
    await page.locator('[data-space-menu-trigger]').click();
    await page.locator('.space-menu [data-space-launchpad-trigger]').click();
    await page.locator(`[data-launchpad-app="${app}"]`).click();
  }
  await expect(win(page,app)).toBeVisible();return win(page,app);
}
async function capture(page:Page,name:string){
  const path=test.info().outputPath(`${name}.png`);
  await page.locator('[data-bear-workspace]').screenshot({path,animations:'disabled'});
  await test.info().attach(name,{path,contentType:'image/png'});
}
async function downloaded(page:Page,action:()=>Promise<unknown>){
  const pending=page.waitForEvent('download');await action();const download=await pending;
  const path=await download.path();expect(path).not.toBeNull();
  return {name:download.suggestedFilename(),text:await readFile(path!,'utf8')};
}
async function selectSource(paragraph:Locator){
  await paragraph.scrollIntoViewIfNeeded();
  // A real Range in the rendered browser document, never a supplied excerpt
  // string or direct workspace command. Browser selectionchange drives UI.
  await paragraph.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const selection=document.getSelection()!;selection.removeAllRanges();selection.addRange(range);});
}

test('fresh article selection saves a separate excerpt with source return and Markdown export',async({page})=>{
  await setup(page);
  const article=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}').articles[0]) as {url:string,title:string};
  expect(article.url).toBeTruthy();
  await page.route(new URL(article.url,page.url()).href,route=>route.fulfill({status:200,contentType:'text/html',body:`<!doctype html><article class="post-content"><h2 id="get441-section">Synthetic source</h2><p id="get441-source">${EXCERPT}</p></article>`}));
  const reader=await openApp(page,'reader');
  await reader.locator('[data-open="reader"][data-payload]').filter({hasText:article.title}).first().click();
  const paragraph=reader.locator('#get441-source'),save=reader.locator('[data-excerpt-save]');
  await expect(paragraph).toHaveText(EXCERPT);await selectSource(paragraph);await expect(save).toBeEnabled();
  await paragraph.evaluate(el=>{el.textContent='Changed synthetic source invalidates the old claim.';});
  await expect(save).toBeDisabled();expect((await stored(page)).excerpts).toHaveLength(0);
  await paragraph.evaluate((el,text)=>{el.textContent=text;},EXCERPT);
  await selectSource(paragraph);await expect(save).toBeEnabled();await save.click();
  await expect(reader.locator('.space-reading-tools__feedback')).toContainText('Saved in this browser');
  expect((await stored(page)).note).toBe(NOTE);
  const notes=await openApp(page,'notes');await expect(notes.locator('[data-note-editor]')).toHaveValue(NOTE);
  await expect(notes.locator('.space-excerpt-shelf__quote')).toHaveText(EXCERPT);
  const markdown=await downloaded(page,()=>notes.locator('[data-excerpt-action="export"]').click());
  expect(markdown.name).toBe('bear-article-excerpts.md');expect(markdown.text).toContain(EXCERPT);expect(markdown.text).toContain(`${article.url}#get441-source`);
  await test.info().attach('synthetic-excerpts.md',{body:markdown.text,contentType:'text/markdown'});await capture(page,'excerpt-shelf');
  await notes.locator('[data-excerpt-action="source"]').click();
  await expect(reader).toBeVisible();await expect(paragraph).toBeVisible();
  expect(await reader.evaluate(el=>el.contains(document.activeElement))).toBe(true);
});

test('backup preview and cancel are inert, then explicit confirmation preserves a before-copy across reload',async({page})=>{
  await setup(page);const settings=await openApp(page,'settings'),file=settings.locator('[data-transfer-file]');
  const before=await raw(page);expect(before).not.toBeNull();
  await file.setInputFiles(backup());await expect(settings.locator('[data-transfer-preview]')).toBeVisible();
  await expect(settings.locator('[data-transfer-snippet]')).toHaveText(IMPORTED);expect(await raw(page)).toBe(before);
  await settings.locator('[data-transfer-cancel]').click();await expect(settings.locator('[data-transfer-preview]')).toBeHidden();expect(await raw(page)).toBe(before);
  const notes=await openApp(page,'notes');await expect(notes.locator('[data-note-editor]')).toHaveValue(NOTE);
  await openApp(page,'settings');await file.setInputFiles(backup());await expect(settings.locator('[data-transfer-preview]')).toBeVisible();
  const previous=await downloaded(page,()=>settings.locator('[data-transfer-confirm]').click());
  expect(previous.name).toMatch(/^bear-before-restore-.*\.json$/);expect(JSON.parse(previous.text).workspace.note).toBe(NOTE);
  await expect(settings.locator('[data-transfer-preview]')).toBeHidden();
  await expect.poll(async()=> (await stored(page)).note).toBe(IMPORTED);
  expect((await stored(page)).recoveries.some((copy:{note:string})=>copy.note===NOTE)).toBe(true);
  await expect(settings.locator('[data-transfer-recoveries] button')).toHaveCount(1);await capture(page,'backup-confirmed-recovery');
  await page.reload();await enterWorkspace(page);await openApp(page,'notes');await expect(win(page,'notes').locator('[data-note-editor]')).toHaveValue(IMPORTED);
});

test('capacity and quota refusal preserve exact stored bytes and the visible original note',async({page})=>{
  await setup(page);const settings=await openApp(page,'settings'),file=settings.locator('[data-transfer-file]');
  const copies=Array.from({length:3},(_,i)=>({id:`get441-copy-${i}`,note:`Synthetic preserved copy ${i}`,draft:'',at:'2026-11-07T00:00:00Z',reason:'before-restore'}));
  await file.setInputFiles(backup(IMPORTED,copies));await expect(settings.locator('[data-transfer-preview]')).toBeVisible();
  const beforeCapacity=await raw(page);await downloaded(page,()=>settings.locator('[data-transfer-confirm]').click());
  await expect(settings.locator('[data-transfer-status]')).toContainText('Your current workspace is unchanged');
  expect(await raw(page)).toBe(beforeCapacity);await openApp(page,'notes');await expect(win(page,'notes').locator('[data-note-editor]')).toHaveValue(NOTE);
  await openApp(page,'settings');await settings.locator('[data-transfer-cancel]').click();
  await file.setInputFiles(backup());await expect(settings.locator('[data-transfer-preview]')).toBeVisible();
  const beforeQuota=await raw(page);
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    (window as any).__get441RestoreStorage=()=>{Storage.prototype.setItem=original;};
    Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='bear-space:v1')throw new DOMException('Synthetic quota denial','QuotaExceededError');return original.call(this,key,value);};
  });
  try{
    await downloaded(page,()=>settings.locator('[data-transfer-confirm]').click());
    await expect(settings.locator('[data-transfer-status]')).toHaveAttribute('data-error','true');
    await expect(settings.locator('[data-transfer-status]')).toContainText('Restore could not be saved');
    expect(await raw(page)).toBe(beforeQuota);expect((await stored(page)).note).toBe(NOTE);await capture(page,'backup-refused');
  }finally{await page.evaluate(()=>(window as any).__get441RestoreStorage());}
  await openApp(page,'notes');await expect(win(page,'notes').locator('[data-note-editor]')).toHaveValue(NOTE);
});

const YOUTUBE_API_STUB=String.raw`
  window.__get441YouTubeBoundary={play:0,pause:0,destroy:0};
  window.YT={Player:class {
    constructor(frame,options){this.events=options.events;this.dead=false;frame.addEventListener('load',()=>{if(!this.dead)this.events.onReady({target:this});},{once:true});}
    playVideo(){window.__get441YouTubeBoundary.play++;this.events.onStateChange({data:1,target:this});}
    pauseVideo(){window.__get441YouTubeBoundary.pause++;this.events.onStateChange({data:2,target:this});}
    getCurrentTime(){return 88;}
    seekTo(){}
    destroy(){this.dead=true;window.__get441YouTubeBoundary.destroy++;}
  }};
  window.onYouTubeIframeAPIReady();
`;

test('video requires a real facade click and never resumes from hide, reopen or reload',async({page})=>{
  test.info().annotations.push({type:'evidence-scope',description:'Rendered UI and lifecycle with synthetic official YouTube API/iframe routes; not real provider, audio or playback acceptance.'});
  const apiRequests:string[]=[],frameRequests:string[]=[];
  await page.route('https://www.youtube.com/iframe_api',async route=>{apiRequests.push(route.request().url());await route.fulfill({status:200,contentType:'application/javascript',body:YOUTUBE_API_STUB});});
  await page.route('https://www.youtube-nocookie.com/embed/**',async route=>{frameRequests.push(route.request().url());await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><p>Synthetic YouTube boundary. No real provider media.</p>'});});
  await setup(page);const video=await openApp(page,'video'),resume=video.locator('[data-video-resume]');
  await expect(video.locator('[data-video-facade]')).toBeVisible();await expect(resume).toContainText('1:02');await expect(video.locator('iframe')).toHaveCount(0);
  expect(apiRequests).toHaveLength(0);expect(frameRequests).toHaveLength(0);
  await resume.click();await expect(video.locator('iframe')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).__get441YouTubeBoundary?.play||0)).toBe(1);
  expect(apiRequests).toHaveLength(1);expect(frameRequests).toHaveLength(1);
  const frame=video.locator('iframe'),source=new URL((await frame.getAttribute('src'))!);
  expect(source.hostname).toBe('www.youtube-nocookie.com');expect(source.searchParams.get('start')).toBe('62');expect(source.searchParams.get('autoplay')).toBe('0');await capture(page,'video-explicit-stub-activation');
  await video.locator('[data-window-action="minimize"]').click();await expect(video).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>(window as any).__get441YouTubeBoundary.pause)).toBeGreaterThan(0);
  await openApp(page,'video');await expect(video).toBeVisible();await frames(page);
  expect(await page.evaluate(()=>(window as any).__get441YouTubeBoundary.play)).toBe(1);expect(frameRequests).toHaveLength(1);
  await video.locator('[data-window-action="close"]').click();await expect(video).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).__get441YouTubeBoundary.destroy)).toBe(1);
  await openApp(page,'video');await expect(video.locator('[data-video-resume]')).toContainText('1:28');await expect(video.locator('iframe')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__get441YouTubeBoundary.play)).toBe(1);expect(frameRequests).toHaveLength(1);
  await page.reload();await enterWorkspace(page);await openApp(page,'video');await frames(page);
  await expect(video.locator('[data-video-facade]')).toBeVisible();await expect(video.locator('iframe')).toHaveCount(0);expect(apiRequests).toHaveLength(1);expect(frameRequests).toHaveLength(1);
});

test('photo to map returns to the verified original photo and its gallery region',async({page})=>{
  await setup(page);
  const catalog=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as {photos:{id:string,image:string,thumb:string,title:string,region:string}[],places:{id:string}[]};
  const photo=[...catalog.photos].reverse().find(photo=>catalog.places.some(place=>place.id===photo.region));expect(photo).toBeTruthy();
  const syntheticImage='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#e6eee8"/><text x="30" y="60" font-size="24">Synthetic public photograph boundary</text></svg>';
  for(const path of new Set([photo!.image,photo!.thumb]))await page.route(new URL(path,page.url()).href,route=>route.fulfill({status:200,contentType:'image/svg+xml',body:syntheticImage}));
  const photos=await openApp(page,'photos'),body=photos.locator('[data-window-body]');
  await photos.locator('[data-photo-filter="all"]').click();const card=photos.locator(`[data-photo-select="${photo!.id}"]`);await card.scrollIntoViewIfNeeded();
  const galleryTop=await body.evaluate(el=>el.scrollTop);await card.click();
  await expect(photos.locator('.sp-photo-detail__image')).toHaveAttribute('data-image-state','ready');await expect(photos.locator('figcaption strong')).toHaveText(photo!.title);
  await photos.locator('figcaption [data-media-open="map"]').click();const map=win(page,'map');await expect(map).toBeVisible();
  const back=map.locator('.sp-media-return');await expect(back).toBeVisible();
  const payload=(await back.getAttribute('data-media-payload'))!;expect(payload.startsWith('photo-context:')).toBe(true);
  expect(payload).toBe(`photo-context:${encodeURIComponent(photo!.id)}:all`);
  await capture(page,'map-original-photo-return');await back.click();
  await expect(photos).toBeVisible();await expect(photos.locator('figcaption strong')).toHaveText(photo!.title);
  await photos.locator('[data-photo-back]').click();await expect(photos.locator('[data-photo-filter="all"]')).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBe(galleryTop);
  expect(await photos.evaluate(el=>el.contains(document.activeElement))).toBe(true);
});
