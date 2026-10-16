# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: space-media-legibility-contracts.spec.ts >> the classic fallback keeps 14px actions and 44px targets; shared map reading and original zoom still work
- Location: tests/e2e/space-media-legibility-contracts.spec.ts:94:5

# Error details

```
Error: locator.evaluate: Error: strict mode violation: locator('[data-space-window="map"]').locator('.sp-media-kicker') resolved to 2 elements:
    1) <p class="sp-media-kicker">BEAR / PLACES & FIELD NOTES</p> aka getByText('BEAR / PLACES & FIELD NOTES')
    2) <p class="sp-media-kicker">35.36°N / 138.73°E</p> aka getByText('°N / 138.73°E')

Call log:
  - waiting for locator('[data-space-window="map"]').locator('.sp-media-kicker')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content":
    - /url: "#main-content"
  - text: /
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "空间 · CUBXXW OS" [level=1] [ref=e4]
      - paragraph [ref=e5]: CUBXXW OS 工作区
      - region "CUBXXW OS 个人工作区" [ref=e6]:
        - navigation "咖啡馆导览"
        - generic:
          - region "欢迎" [ref=e8]:
            - generic [ref=e9]:
              - generic [ref=e10]:
                - button "关闭窗口" [ref=e11] [cursor=pointer]: ×
                - button "最小化窗口" [ref=e12] [cursor=pointer]: −
                - button "最大化或恢复窗口" [ref=e13] [cursor=pointer]: +
              - strong: 欢迎
              - button "窗口并排" [ref=e14] [cursor=pointer]: ◫
            - article [ref=e16]:
              - generic [ref=e17]:
                - generic [ref=e18]: Xinwei Xiong / cubxxw
                - button "关于我 ↗" [ref=e19] [cursor=pointer]
              - group [ref=e20]:
                - generic "个人介绍与经历" [ref=e21] [cursor=pointer]:
                  - text: 个人介绍与经历
                  - generic [aria-hidden] [ref=e22]: ↗
                - generic [ref=e23]:
                  - navigation "个人介绍目录" [ref=e24]:
                    - button "个人档案" [ref=e25] [cursor=pointer]
                    - button "这些年" [ref=e26] [cursor=pointer]
                    - button "阅读地图" [ref=e27] [cursor=pointer]
                  - generic [ref=e28]:
                    - paragraph [ref=e29]: CUBXXW / PROFILE
                    - heading "熊鑫伟 cubxxw" [level=3] [ref=e30]
                    - paragraph [ref=e31]: 熊鑫伟（cubxxw / BEAR，2001 年生）构建 AI 产品，关注 Agent 评估与可靠执行。曾参与 OpenIM 的工程和社区协作，在 cubxxw.com 公开项目实践与每月思考，旅行仍是生活的一部分。
                    - paragraph [ref=e32]: 更了解自己，更了解世界。
                    - generic [ref=e33]:
                      - link "简历与项目证据 ↗" [ref=e34] [cursor=pointer]:
                        - /url: https://resume.cubxxw.com
                      - link "GitHub ↗" [ref=e35] [cursor=pointer]:
                        - /url: https://github.com/cubxxw
                      - button "联系我 ↗" [ref=e36] [cursor=pointer]
                    - group [ref=e37]:
                      - generic "完整履历与公开资料" [ref=e38] [cursor=pointer]
                  - generic [ref=e39]:
                    - paragraph [ref=e40]: CUBXXW / ALONG THE WAY
                    - heading "这些年" [level=3] [ref=e41]
                    - list [ref=e42]:
                      - listitem [ref=e43]:
                        - time [ref=e44]: "2021"
                        - generic [ref=e45]:
                          - heading "第一篇博客" [level=4] [ref=e46]
                          - paragraph [ref=e47]: 注册了 GitHub，写下第一篇博客，开始公开自己的笔记。
                          - group [ref=e48]:
                            - generic "多一点细节" [ref=e49] [cursor=pointer]
                          - link "阅读《我的第一个博客》 ↗" [ref=e50] [cursor=pointer]:
                            - /url: /zh/growth/posts/my-first-blog/
                      - listitem [ref=e51]:
                        - time [ref=e52]: "2023"
                        - generic [ref=e53]:
                          - heading "OpenIM 与开源社区" [level=4] [ref=e54]
                          - paragraph [ref=e55]: 进入 OpenIM 实习，贡献代码，设计并主持社区双周会。
                          - group [ref=e56]:
                            - generic "多一点细节" [ref=e57] [cursor=pointer]
                          - link "阅读 2023 年度总结 ↗" [ref=e58] [cursor=pointer]:
                            - /url: /zh/growth/posts/2023-annual-summary-reflections-and-aspirations/
                      - listitem [ref=e59]:
                        - time [ref=e60]: "2024"
                        - generic [ref=e61]:
                          - heading "毕业，出发" [level=4] [ref=e62]
                          - paragraph [ref=e63]: 第一次出国、毕业、工作，再离职，开始一边旅行一边构建。
                          - group [ref=e64]:
                            - generic "多一点细节" [ref=e65] [cursor=pointer]
                          - link "阅读 2024 年度回顾 ↗" [ref=e66] [cursor=pointer]:
                            - /url: /zh/growth/posts/2024-annual-review/
                      - listitem [ref=e67]:
                        - time [ref=e68]: "2025"
                        - generic [ref=e69]:
                          - heading "尼泊尔 ACT" [level=4] [ref=e70]
                          - paragraph [ref=e71]: 走完第一次高原徒步。从 2 月起，开始每月写思考笔记。
                          - group [ref=e72]:
                            - generic "多一点细节" [ref=e73] [cursor=pointer]
                          - link "阅读 2025-2026 年度总结 ↗" [ref=e74] [cursor=pointer]:
                            - /url: /zh/growth/posts/2025-annual-review/
                      - listitem [ref=e75]:
                        - time [ref=e76]: "2026"
                        - generic [ref=e77]:
                          - heading "产品和新的工作" [level=4] [ref=e78]
                          - paragraph [ref=e79]: 继续做产品、写作。8 月 10 日，结束约两年的空窗，开始新的工作。
                          - group [ref=e80]:
                            - generic "多一点细节" [ref=e81] [cursor=pointer]
                          - link "阅读《不会让恐惧替我做决定》 ↗" [ref=e82] [cursor=pointer]:
                            - /url: /zh/growth/posts/2026-08-10-fear-does-not-decide-for-me/
                  - generic [ref=e83]:
                    - paragraph [ref=e84]: CUBXXW / READING PATHS
                    - group [ref=e86]:
                      - generic "想读我的文字？ 展开四条精选阅读路径" [ref=e87] [cursor=pointer]:
                        - text: 想读我的文字？
                        - generic [ref=e88]: 展开四条精选阅读路径
          - region "熊野古道" [ref=e92]:
            - generic [ref=e93]:
              - generic [ref=e94]:
                - button "关闭窗口" [ref=e95] [cursor=pointer]: ×
                - button "最小化窗口" [ref=e96] [cursor=pointer]: −
                - button "最大化或恢复窗口" [ref=e97] [cursor=pointer]: +
              - strong: 熊野古道
              - button "窗口并排" [ref=e98] [cursor=pointer]: ◫
            - region "旅途相册" [ref=e100]:
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - paragraph [ref=e103]: BEAR / FIELD ARCHIVE
                  - heading "熊野古道" [level=2] [ref=e104]
                - button "去过的地方 ↗" [ref=e105] [cursor=pointer]
              - generic [ref=e106]:
                - navigation "照片导航" [ref=e107]:
                  - button "← 返回相册" [ref=e108] [cursor=pointer]
                  - generic [ref=e109]: 1 / 8
                  - generic [ref=e110]:
                    - button "上一张照片" [ref=e111] [cursor=pointer]: ←
                    - button "下一张照片" [ref=e112] [cursor=pointer]: →
                - figure [ref=e113]:
                  - img "日本 · 熊野古道" [ref=e115]
                  - generic [ref=e116]:
                    - generic [ref=e117]:
                      - strong [ref=e118]: 熊野古道
                      - paragraph [ref=e119]: 日本 · 熊野古道 · 熊鑫伟 摄
                    - button "查看旅行区域 ↗" [ref=e120] [cursor=pointer]
                - paragraph [ref=e121]: ← → 切换照片 · Esc 返回相册
          - region "去过的地方" [active] [ref=e125]:
            - generic [ref=e126]:
              - generic [ref=e127]:
                - button "关闭窗口" [ref=e128] [cursor=pointer]: ×
                - button "最小化窗口" [ref=e129] [cursor=pointer]: −
                - button "最大化或恢复窗口" [ref=e130] [cursor=pointer]: +
              - strong: 去过的地方
              - button "窗口并排" [ref=e131] [cursor=pointer]: ◫
            - generic [ref=e133]:
              - generic [ref=e134]:
                - generic [ref=e135]:
                  - paragraph [ref=e136]: BEAR / PLACES & FIELD NOTES
                  - heading "从一段路，找到一个故事。" [level=2] [ref=e137]
                - button "浏览相册 ↗" [ref=e138] [cursor=pointer]
              - generic [ref=e139]:
                - generic "地图：方向键移动，加减号缩放" [ref=e140]:
                  - group "公开旅行区域地图，可用下方地区列表选择" [ref=e141]:
                    - generic [ref=e143]:
                      - generic [ref=e144]: 180°W
                      - generic [ref=e145]: 160°W
                      - generic [ref=e146]: 140°W
                      - generic [ref=e147]: 120°W
                      - generic [ref=e148]: 100°W
                      - generic [ref=e149]: 80°W
                      - generic [ref=e150]: 60°W
                      - generic [ref=e151]: 40°W
                      - generic [ref=e152]: 20°W
                      - generic [ref=e153]: 0°E
                      - generic [ref=e154]: 20°E
                      - generic [ref=e155]: 40°E
                      - generic [ref=e156]: 60°E
                      - generic [ref=e157]: 80°E
                      - generic [ref=e158]: 100°E
                      - generic [ref=e159]: 120°E
                      - generic [ref=e160]: 140°E
                      - generic [ref=e161]: 160°E
                      - generic [ref=e162]: 180°E
                      - generic [ref=e163]: 60°S
                      - generic [ref=e164]: 40°S
                      - generic [ref=e165]: 20°S
                      - generic [ref=e166]: 0°N
                      - generic [ref=e167]: 20°N
                      - generic [ref=e168]: 40°N
                      - generic [ref=e169]: 60°N
                      - generic [ref=e170]: 80°N
                    - generic [ref=e172]:
                      - generic: 亚洲
                      - generic: 太平洋
                      - generic: 印度洋
                    - button "西藏高原" [ref=e173] [cursor=pointer]
                    - button "日本列岛" [pressed] [ref=e177] [cursor=pointer]
                    - button "东南亚" [ref=e181] [cursor=pointer]
                - generic "地图控制" [ref=e185]:
                  - button "放大地图" [ref=e186] [cursor=pointer]: +
                  - button "缩小地图" [ref=e187] [cursor=pointer]: −
                  - button "查看所有区域" [ref=e188] [cursor=pointer]
                  - button "世界" [ref=e189] [cursor=pointer]
                - generic: 等距经纬投影 · 区域中心
              - navigation "选择旅行区域" [ref=e190]:
                - button "01 西藏高原 2 张照片" [ref=e191] [cursor=pointer]:
                  - generic [ref=e192]: "01"
                  - strong [ref=e193]: 西藏高原
                  - generic [ref=e194]: 2 张照片
                - button "02 日本列岛 2 张照片" [pressed] [ref=e195] [cursor=pointer]:
                  - generic [ref=e196]: "02"
                  - strong [ref=e197]: 日本列岛
                  - generic [ref=e198]: 2 张照片
                - button "03 东南亚 4 张照片" [ref=e199] [cursor=pointer]:
                  - generic [ref=e200]: "03"
                  - strong [ref=e201]: 东南亚
                  - generic [ref=e202]: 4 张照片
              - article [ref=e203]:
                - generic [ref=e204]:
                  - paragraph [ref=e205]: 35.36°N / 138.73°E
                  - heading "日本列岛" [level=3] [ref=e206]
                  - paragraph [ref=e207]: 用木头、火与缺口和时间共处的群岛
                  - generic [ref=e208]:
                    - generic [ref=e209]: 2 张公开照片
                    - generic [ref=e210]: 1 篇相关写作
                - generic [ref=e211]:
                  - article [ref=e212]:
                    - button "熊野古道" [ref=e213] [cursor=pointer]:
                      - img "日本 · 熊野古道" [ref=e215]
                  - article [ref=e217]:
                    - button "富士山" [ref=e218] [cursor=pointer]:
                      - img "日本 · 富士山" [ref=e220]
                - generic [ref=e222]:
                  - heading "走过之后，写了这些。" [level=4] [ref=e223]
                  - button "2025.12.15 日本旅居笔记 - 用木头、火与缺口和时间共处" [ref=e224] [cursor=pointer]:
                    - generic [ref=e225]:
                      - generic [ref=e226]: 2025.12.15
                      - strong [ref=e227]: 日本旅居笔记 - 用木头、火与缺口和时间共处
                    - generic [aria-hidden] [ref=e228]: ↗
              - generic [ref=e229]:
                - generic [ref=e230]: 标记来自已公开旅行记录，代表区域中心；不是照片 GPS。
                - link "Natural Earth 1:110m ↗" [ref=e231] [cursor=pointer]:
                  - /url: https://www.naturalearthdata.com/about/terms-of-use/
        - navigation "应用 Dock" [ref=e235]:
          - button "CUBXXW OS 空间菜单" [ref=e236] [cursor=pointer]:
            - generic: CUBXXW OS
          - button "欢迎" [ref=e241] [cursor=pointer]
          - button "文章与思考" [ref=e249] [cursor=pointer]
          - button "产品" [ref=e255] [cursor=pointer]
          - button "旅途相册" [ref=e262] [cursor=pointer]
          - button "你的笔记" [ref=e269] [cursor=pointer]
          - button "空间助手" [ref=e275] [cursor=pointer]
          - button "工作区设置" [ref=e281] [cursor=pointer]
        - status [ref=e287]: 场景暂时无法启动，可以直接阅读或打开工作区。
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
> 26  |   return control.evaluate((el:HTMLElement)=>{const font=parseFloat(getComputedStyle(el).fontSize);if(!el.closest('.space-spatial-screen'))return font;for(let box:HTMLElement|null=el;box;box=box.parentElement){const style=getComputedStyle(box);let width=parseFloat(style.width);if(!Number.isFinite(width)||!width)continue;if(style.boxSizing!=='border-box')width+=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);return font*box.getBoundingClientRect().width/width;}throw Error('No measurable layout box for projected text');});
      |                  ^ Error: locator.evaluate: Error: strict mode violation: locator('[data-space-window="map"]').locator('.sp-media-kicker') resolved to 2 elements:
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
  76  |     await page.evaluate(()=>(window as any).__completeError=false);await retry(page).click();await expect(preview(page)).toHaveAttribute('data-image-state','loading');await expect.poll(()=>requests.length).toBe(2);const second=await image(page).elementHandle();expect(await first!.getAttribute('src')).toBe(null);
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