# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: space-media-legibility-contracts.spec.ts >> a synthetic already-complete error and detached old-attempt events cannot overwrite a reopened real photo
- Location: tests/e2e/space-media-legibility-contracts.spec.ts:67:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 1

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content":
    - /url: "#main-content"
  - text: /
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "Space · CUBXXW OS" [level=1] [ref=e4]
      - paragraph [ref=e5]: CUBXXW OS workspace
      - region "CUBXXW OS personal workspace" [ref=e6]:
        - generic [ref=e7]:
          - generic "3D café. Walk with WASD or arrow keys; drag to look around." [ref=e8]
          - generic "CUBXXW OS" [ref=e9]:
            - generic:
              - region "Welcome" [ref=e10]:
                - generic [ref=e11]:
                  - generic [ref=e12]:
                    - button "Close window" [ref=e13] [cursor=pointer]: ×
                    - button "Minimize window" [ref=e14] [cursor=pointer]: −
                    - button "Maximize or restore window" [ref=e15] [cursor=pointer]: +
                  - strong: Welcome
                  - button "Arrange windows" [ref=e16] [cursor=pointer]: ◫
                - article [ref=e18]:
                  - generic [ref=e19]:
                    - generic [ref=e20]: Xinwei Xiong / cubxxw
                    - button "About me ↗" [ref=e21] [cursor=pointer]
                  - group [ref=e22]:
                    - generic "About me and my story" [ref=e23] [cursor=pointer]:
                      - text: About me and my story
                      - generic [aria-hidden] [ref=e24]: ↗
                    - generic [ref=e25]:
                      - navigation "Profile sections" [ref=e26]:
                        - button "Profile" [ref=e27] [cursor=pointer]
                        - button "Along the way" [ref=e28] [cursor=pointer]
                        - button "Reading paths" [ref=e29] [cursor=pointer]
                      - generic [ref=e30]:
                        - paragraph [ref=e31]: CUBXXW / PROFILE
                        - heading "Xinwei Xiong cubxxw" [level=3] [ref=e32]
                        - paragraph [ref=e33]: Xinwei Xiong (熊鑫伟, aka cubxxw / BEAR, b. 2001) builds AI products with a focus on agent evaluation and reliable execution. He contributed to OpenIM's engineering and community workflows, and writes about projects and monthly reflections at cubxxw.com. Travel remains part of his life.
                        - paragraph [ref=e34]: To know myself more, and to know the world more.
                        - generic [ref=e35]:
                          - link "Resume and project evidence ↗" [ref=e36] [cursor=pointer]:
                            - /url: https://resume.cubxxw.com/en/
                          - link "GitHub ↗" [ref=e37] [cursor=pointer]:
                            - /url: https://github.com/cubxxw
                          - button "Say hello ↗" [ref=e38] [cursor=pointer]
                        - group [ref=e39]:
                          - generic "Full biography and public records" [ref=e40] [cursor=pointer]
                      - generic [ref=e41]:
                        - paragraph [ref=e42]: CUBXXW / ALONG THE WAY
                        - heading "Along the way" [level=3] [ref=e43]
                        - list [ref=e44]:
                          - listitem [ref=e45]:
                            - time [ref=e46]: "2021"
                            - generic [ref=e47]:
                              - heading "A first blog post" [level=4] [ref=e48]
                              - paragraph [ref=e49]: I created my GitHub account and began publishing my notes.
                              - group [ref=e50]:
                                - generic "More of the story" [ref=e51] [cursor=pointer]
                              - link "Read “My First Blog” ↗" [ref=e52] [cursor=pointer]:
                                - /url: /growth/posts/my-first-blog/
                          - listitem [ref=e53]:
                            - time [ref=e54]: "2023"
                            - generic [ref=e55]:
                              - heading "OpenIM and open source" [level=4] [ref=e56]
                              - paragraph [ref=e57]: I joined OpenIM as an intern, contributed code, and hosted community meetings.
                              - group [ref=e58]:
                                - generic "More of the story" [ref=e59] [cursor=pointer]
                              - link "Read the 2023 annual review ↗" [ref=e60] [cursor=pointer]:
                                - /url: /growth/posts/2023-annual-summary-reflections-and-aspirations/
                          - listitem [ref=e61]:
                            - time [ref=e62]: "2024"
                            - generic [ref=e63]:
                              - heading "Graduation and departure" [level=4] [ref=e64]
                              - paragraph [ref=e65]: My first trip abroad, graduation, a job, then leaving to travel and build.
                              - group [ref=e66]:
                                - generic "More of the story" [ref=e67] [cursor=pointer]
                              - link "Read the 2024 annual review ↗" [ref=e68] [cursor=pointer]:
                                - /url: /growth/posts/2024-annual-review/
                          - listitem [ref=e69]:
                            - time [ref=e70]: "2025"
                            - generic [ref=e71]:
                              - heading "The Annapurna Circuit" [level=4] [ref=e72]
                              - paragraph [ref=e73]: My first high-altitude trek. From February, I began writing monthly notes.
                              - group [ref=e74]:
                                - generic "More of the story" [ref=e75] [cursor=pointer]
                              - link "Read the 2025–2026 annual review ↗" [ref=e76] [cursor=pointer]:
                                - /url: /growth/posts/2025-annual-review/
                          - listitem [ref=e77]:
                            - time [ref=e78]: "2026"
                            - generic [ref=e79]:
                              - heading "Products and a new job" [level=4] [ref=e80]
                              - paragraph [ref=e81]: I kept building and writing. On August 10, after roughly two years away, I started a new job.
                              - group [ref=e82]:
                                - generic "More of the story" [ref=e83] [cursor=pointer]
                              - link "Read the August 2026 thought notes ↗" [ref=e84] [cursor=pointer]:
                                - /url: /growth/posts/2026-08-thought-notes/
                      - generic [ref=e85]:
                        - paragraph [ref=e86]: CUBXXW / READING PATHS
                        - group [ref=e88]:
                          - generic "Want to read my writing? Open four curated reading paths" [ref=e89] [cursor=pointer]:
                            - text: Want to read my writing?
                            - generic [ref=e90]: Open four curated reading paths
              - region "Kumano Kodo" [ref=e94]:
                - generic [ref=e95]:
                  - generic [ref=e96]:
                    - button "Close window" [ref=e97] [cursor=pointer]: ×
                    - button "Minimize window" [ref=e98] [cursor=pointer]: −
                    - button "Maximize or restore window" [ref=e99] [cursor=pointer]: +
                  - strong: Kumano Kodo
                  - button "Arrange windows" [ref=e100] [cursor=pointer]: ◫
                - region "Travel photographs" [ref=e102]:
                  - generic [ref=e103]:
                    - generic [ref=e104]:
                      - paragraph [ref=e105]: BEAR / FIELD ARCHIVE
                      - heading "Kumano Kodo" [level=2] [ref=e106]
                    - button "Explore places ↗" [ref=e107] [cursor=pointer]
                  - generic [ref=e108]:
                    - navigation "Photograph navigation" [ref=e109]:
                      - button "← Back to photographs" [ref=e110] [cursor=pointer]
                      - generic [ref=e111]: 1 / 8
                      - generic [ref=e112]:
                        - button "Previous photograph" [ref=e113] [cursor=pointer]: ←
                        - button "Next photograph" [ref=e114] [cursor=pointer]: →
                    - figure [ref=e115]:
                      - generic [ref=e116]:
                        - generic [ref=e117]:
                          - status: Trying again…
                          - button "Retry photograph" [disabled] [active] [ref=e118]
                        - img "Kumano Kodo, Japan" [ref=e119]
                      - generic [ref=e120]:
                        - generic [ref=e121]:
                          - strong [ref=e122]: Kumano Kodo
                          - paragraph [ref=e123]: Kumano Kodo, Japan · Photograph by Xinwei
                        - button "See travel region ↗" [ref=e124] [cursor=pointer]
                    - paragraph [ref=e125]: ← → browse photographs · Esc returns to the album
            - navigation "Application Dock" [ref=e129]:
              - button "CUBXXW OS Space menu" [ref=e130] [cursor=pointer]:
                - generic: CUBXXW OS
              - button "Welcome" [ref=e135] [cursor=pointer]
              - button "Writing" [ref=e143] [cursor=pointer]
              - button "Products" [ref=e149] [cursor=pointer]
              - button "Photos" [ref=e156] [cursor=pointer]
              - button "Your notes" [ref=e163] [cursor=pointer]
              - button "Space companion" [ref=e169] [cursor=pointer]
              - button "Settings" [ref=e175] [cursor=pointer]
        - navigation "Café navigation":
          - generic:
            - button "Back to the café" [ref=e181] [cursor=pointer]: ← Back to the café
            - generic: CUBXXW OS
            - button "Change the view" [ref=e182] [cursor=pointer]: Change the view ↗
```

# Test source

```ts
  1   | import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
  2   | import {enterWorkspace} from '../helpers/space-entry';
  3   | import {readFileSync} from 'node:fs';
  4   | import {resolve} from 'node:path';
  5   | 
  6   | test.use({channel:'chromium',reducedMotion:'reduce',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
  7   | type Photo={id:string;image:string;thumb:string;title:string;place:string;region:string};
  8   | const win=(page:Page,app='photos')=>page.locator(`[data-space-window="${app}"]`);
  9   | const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
  10  | async function setup(page:Page,lang='zh',theme='light'){
  11  |   await page.goto(`${lang==='zh'?'/zh':''}/projects/`);await enterWorkspace(page);
  12  |   await page.evaluate(value=>(window as any).BearSpace.execute('theme',{value}),theme);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-theme',theme);
  13  |   return page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as Promise<{photos:Photo[];labels:Record<string,string>}>;
  14  | }
  15  | async function openApp(page:Page,app:string){
  16  |   const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  17  |   if(await dock.isVisible())await dock.click();
  18  |   else{
  19  |     const label=await page.locator('[data-space-catalog]').evaluate((el,app)=>JSON.parse(el.textContent||'{}').labels[app],app);
  20  |     await page.keyboard.press('Meta+k');const search=page.locator('[data-space-search-input]');await expect(search).toBeVisible();await search.fill(label);
  21  |     await search.press('ArrowDown');const result=page.locator(`[data-search-kind="app"][data-search-app="${app}"]`);await expect(result).toBeFocused();await result.press('Enter');
  22  |   }
  23  |   await expect(win(page,app)).toBeVisible();return win(page,app);
  24  | }
  25  | async function projectedFontCSS(control:Locator){
  26  |   return control.evaluate((el:HTMLElement)=>{const font=parseFloat(getComputedStyle(el).fontSize);if(!el.closest('.space-spatial-screen'))return font;for(let box:HTMLElement|null=el;box;box=box.parentElement){const style=getComputedStyle(box);let width=parseFloat(style.width);if(!Number.isFinite(width)||!width)continue;if(style.boxSizing!=='border-box')width+=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);return font*box.getBoundingClientRect().width/width;}throw Error('No measurable layout box for projected text');});
  27  | }
  28  | async function hit(control:Locator,min=44,scroll=true){
  29  |   if(scroll)await control.scrollIntoViewIfNeeded();await expect(control).toBeVisible();const box=(await control.boundingBox())!;
  30  |   expect(box.width).toBeGreaterThanOrEqual(min);expect(box.height).toBeGreaterThanOrEqual(min);expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);return box;
  31  | }
  32  | async function visibleText(control:Locator,min:number){expect(await projectedFontCSS(control)).toBeGreaterThanOrEqual(min);}
  33  | const preview=(page:Page)=>win(page).locator('.sp-photo-detail__image');
  34  | const retry=(page:Page)=>preview(page).locator('[data-image-retry]');
  35  | const status=(page:Page)=>preview(page).locator('[data-image-feedback]');
  36  | const image=(page:Page)=>preview(page).locator('[data-media-image]');
  37  | function originalPhoto(photo:Photo){const path=new URL(photo.image,'http://local.test').pathname;expect(path.startsWith('/images/about/journey/')).toBe(true);return readFileSync(resolve('static','.'+path));}
  38  | async function galleryTypography(page:Page,photo:Photo){
  39  |   const photos=win(page),card=photos.locator(`[data-photo-select="${photo.id}"]`);await expect(card.locator('strong')).toHaveText(photo.title);await expect(card.locator('.sp-photo-card__place')).toHaveText(photo.place);
  40  |   await visibleText(card.locator('strong'),16);await visibleText(card.locator('.sp-photo-card__place'),12);await visibleText(photos.locator('.sp-media-kicker'),12);await hit(photos.locator('[data-photo-filter="all"]'));await visibleText(photos.locator('[data-photo-filter="all"]'),14);
  41  |   await expect(photos.locator('.sp-photo-card [role="status"]')).toHaveCount(0);
  42  |   await visibleText(photos.locator('.sp-media-source p'),14);await hit(photos.locator('[data-media-load]'));await visibleText(photos.locator('.sp-media-footer'),12);
  43  |   expect(await photos.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  44  | }
  45  | 
  46  | for(const view of [{width:1440,height:900,lang:'zh',theme:'light',owned:true},{width:390,height:844,lang:'en',theme:'dark',owned:false}])test.describe(`${view.width}px ${view.lang} image recovery`,()=>{
  47  |   test.use({viewport:{width:view.width,height:view.height},isMobile:view.width<640,hasTouch:view.width<640,reducedMotion:view.owned?'reduce':'no-preference'});
  48  |   test('404 recovery keeps one stable reachable Retry; only its remaining focus owner receives decoded success',async({page})=>{
  49  |     const catalog=await setup(page,view.lang,view.theme);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');const photo=catalog.photos[0],bytes=originalPhoto(photo),requests:string[]=[];let release=()=>{};const gate=new Promise<void>(done=>{release=done;});
  50  |     await page.route(new URL(photo.image,page.url()).href,async route=>{requests.push(route.request().url());if(requests.length===1)return route.fulfill({status:404,body:''});await gate;await route.fulfill({status:200,contentType:'image/webp',body:bytes});});
  51  |     try{
  52  |       await openApp(page,'photos');await galleryTypography(page,photo);await win(page).locator(`[data-photo-select="${photo.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','error');
  53  |       await expect(status(page)).toHaveAttribute('role','status');await expect(status(page)).toHaveAttribute('aria-live','polite');await expect(status(page)).toHaveAttribute('aria-atomic','true');await visibleText(status(page),14);
  54  |       const original=await retry(page).elementHandle(),before=await hit(retry(page),44,false);await visibleText(retry(page),14);await retry(page).click();await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect(retry(page)).toBeFocused();await expect(retry(page)).toHaveAttribute('aria-disabled','true');expect(await retry(page).isDisabled()).toBe(false);
  55  |       const pending=await hit(retry(page),44,false);expect(Math.abs(pending.x-before.x)).toBeLessThanOrEqual(.1);expect(Math.abs(pending.y-before.y)).toBeLessThanOrEqual(.1);expect(pending.width).toBe(before.width);expect(pending.height).toBe(before.height);expect(await retry(page).evaluate((el,old)=>el===old,original)).toBe(true);
  56  |       await retry(page).press('Enter');await retry(page).press('Enter');await frames(page);expect(requests).toHaveLength(2);await expect(retry(page)).toBeFocused();
  57  |       let away:Awaited<ReturnType<Page['evaluateHandle']>>|undefined;
  58  |       if(!view.owned){await page.keyboard.press('Tab');away=await page.evaluateHandle(()=>document.activeElement);expect(await page.evaluate(()=>!!document.activeElement?.closest('[data-space-window="photos"]'))).toBe(true);expect(await retry(page).evaluate(el=>el===document.activeElement)).toBe(false);}
  59  |       release();await expect(preview(page)).toHaveAttribute('data-image-state','ready');await expect(retry(page)).toBeHidden();expect(await image(page).evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);expect(await image(page).evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');await expect(image(page)).toHaveAttribute('alt',photo.place||photo.title);
  60  |       if(view.owned)await expect(image(page)).toBeFocused();else expect(await page.evaluate(old=>document.activeElement===old,away!)).toBe(true);
  61  |       await expect(win(page).locator('figcaption strong')).toHaveText(photo.title);await visibleText(win(page).locator('figcaption strong'),16);await visibleText(win(page).locator('figcaption p'),12);
  62  |       for(const control of await win(page).locator('.sp-photo-detail__nav button,figcaption button,.sp-media-link').all()){await hit(control);await visibleText(control,14);}expect(requests).toHaveLength(2);
  63  |     }finally{release();await page.unrouteAll({behavior:'wait'});}
  64  |   });
  65  | });
  66  | 
  67  | test('a synthetic already-complete error and detached old-attempt events cannot overwrite a reopened real photo',async({page})=>{
  68  |   await page.setViewportSize({width:1440,height:900});
  69  |   // This specifically models the late-listener complete/error branch. It is
  70  |   // not presented as an observed HTTP warm-cache or browser cache result.
  71  |   await page.addInitScript(()=>{const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'complete')!;(window as any).__completeError=false;Object.defineProperty(HTMLImageElement.prototype,'complete',{...descriptor,get(){if((window as any).__completeError&&this.hasAttribute('data-media-src'))return true;return descriptor.get!.call(this);}});});
  72  |   const catalog=await setup(page,'en','dark'),photo=catalog.photos[0],bytes=originalPhoto(photo),requests:string[]=[];let release=()=>{};const gate=new Promise<void>(done=>{release=done;});
  73  |   await page.route(new URL(photo.image,page.url()).href,async route=>{requests.push(route.request().url());if(requests.length<3)await gate;await route.fulfill({status:200,contentType:'image/webp',body:bytes});});
  74  |   try{
  75  |     await openApp(page,'photos');await page.evaluate(()=>(window as any).__completeError=true);await win(page).locator(`[data-photo-select="${photo.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','error');await expect(retry(page)).toBeVisible();await expect.poll(()=>requests.length).toBe(1);const first=await image(page).elementHandle();
> 76  |     await page.evaluate(()=>(window as any).__completeError=false);await retry(page).click();await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect.poll(()=>requests.length).toBe(2);const second=await image(page).elementHandle();expect(await first!.getAttribute('src')).toBe(null);
      |                                                                                                                                                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  77  |     await first!.evaluate(el=>{el.dispatchEvent(new Event('load'));el.dispatchEvent(new Event('error'));});await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect(retry(page)).toBeFocused();
  78  |     await win(page).locator('[data-window-action="close"]').click();await expect(win(page)).toHaveCount(0);expect(await second!.getAttribute('src')).toBe(null);
  79  |     await openApp(page,'photos');await win(page).locator(`[data-photo-select="${photo.id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','ready');const current=await image(page).elementHandle();await win(page).locator('[data-photo-next]').focus();const focused=await page.evaluateHandle(()=>document.activeElement);
  80  |     release();await first!.evaluate(el=>el.dispatchEvent(new Event('load')));await second!.evaluate(el=>el.dispatchEvent(new Event('error')));await frames(page);await expect(preview(page)).toHaveAttribute('data-image-state','ready');expect(await image(page).evaluate((el,old)=>el===old,current)).toBe(true);expect(await page.evaluate(old=>document.activeElement===old,focused)).toBe(true);await expect(retry(page)).toBeHidden();expect(requests).toHaveLength(3);
  81  |   }finally{release();await page.unrouteAll({behavior:'wait'});}
  82  | });
  83  | 
  84  | test.describe('phone native photo navigation',()=>{
  85  |   test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  86  |   test('Next Enter then ArrowRight and Escape retain the existing window keyboard route and Notes node',async({page})=>{
  87  |     const catalog=await setup(page,'en','dark'),notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]'),draft='Read photographs, then continue this exact note.';await editor.fill(draft);const original=await editor.elementHandle();
  88  |     await openApp(page,'photos');await galleryTypography(page,catalog.photos[0]);await win(page).locator(`[data-photo-select="${catalog.photos[0].id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','ready');const next=win(page).locator('[data-photo-next]');await hit(next);await next.focus();await next.press('Enter');await expect(win(page).locator('.sp-media-header h2')).toHaveText(catalog.photos[1].title);expect(await win(page).evaluate(el=>el.contains(document.activeElement))).toBe(true);
  89  |     await page.keyboard.press('ArrowRight');await expect(win(page).locator('.sp-media-header h2')).toHaveText(catalog.photos[2].title);await expect(preview(page)).toHaveAttribute('data-image-state','ready');await hit(win(page).locator('[data-photo-prev]'));await hit(win(page).locator('[data-photo-next]'));await hit(win(page).locator('[data-photo-back]'));
  90  |     await page.keyboard.press('Escape');await expect(win(page).locator('.sp-photo-grid')).toBeVisible();await expect(win(page).locator('[data-photo-filter="all"]')).toHaveAttribute('aria-pressed','true');await openApp(page,'notes');expect(await editor.evaluate((el,old)=>el===old,original)).toBe(true);await expect(editor).toHaveValue(draft);
  91  |   });
  92  | });
  93  | 
  94  | test('the classic fallback keeps 14px actions and 44px targets; shared map reading and original zoom still work',async({page})=>{
  95  |   await page.setViewportSize({width:1440,height:900});await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return Reflect.apply(original,this,[type,...args]);} as typeof original;});
  96  |   const catalog=await setup(page,'zh','light');await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-failed','true');await expect(page.locator('.space-spatial-screen')).toHaveCount(0);
  97  |   await openApp(page,'photos');await galleryTypography(page,catalog.photos[0]);await win(page).locator(`[data-photo-select="${catalog.photos[0].id}"]`).click();await expect(preview(page)).toHaveAttribute('data-image-state','ready');for(const control of await win(page).locator('.sp-photo-detail__nav button,figcaption button,.sp-media-link').all()){await hit(control);await visibleText(control,14);}
  98  |   await win(page).locator('.sp-media-link').click();const map=win(page,'map');await expect(map).toBeVisible();await visibleText(map.locator('.sp-media-kicker'),12);await hit(map.locator('.sp-media-link'));await visibleText(map.locator('.sp-media-link'),14);await visibleText(map.locator('.sp-media-footer'),12);
  99  |   const viewport=map.locator('[data-map-viewport] svg'),before=await viewport.getAttribute('viewBox');await map.locator('[data-map-zoom="in"]').click();expect(await viewport.getAttribute('viewBox')).not.toBe(before);expect(await map.locator('[data-window-body]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  100 | });
  101 | 
```