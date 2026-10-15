# 已有证据驱动的后续批次

沿用 control 固定量表与所有权。以下是实施约束，不是已完成声明；每批 source manifest 与真实动作完成后才闭环。

## E8 · Space 窗口容量与真实动作名称

已复现 UX024：844×390 coarse 三窗整理后，最小高260把原小tile抬高，欢迎窗4个控制中心被地图遮住。默认重叠与最大化可用，不把它们误判为缺陷。

- 仅 `assets/js/space/state.mjs` 与 `desktop.js` 生产路径；追加 workspace-state 单元测试与新 arrangement 浏览器合同，不改 world、CSS、公开内容或私人节点。
- 同一纯布局plan按实际viewport与可见窗计算，优先原1/2列，再尝试其他可行列数；扣除现有100px chrome、边距与gap后，raw cell必须达到320×260且不超fitRect可用范围。否则返回overview，不让fitRect把小tile抬大导致重叠。reducer亦守卫，fallback不改原state/rect。
- ≤640使用overview；它的stateViewport=10000仅为保留原桌面rect，不能据此认定容量足够。0可见窗不宣称已并排，1窗按实际容量处理。
- bar aria/title与settings动作按实际模式命名。容量不足时菜单使用已有overview入口，避免两个同名动作；terminal返回实际结果。公开 `BearSpace.execute('arrange')` 布尔兼容性保留。
- 实测：844×390 coarse中英3/4窗点击bar打开overview，选择原notes、Escape回触发器、原DOM/草稿/rect连续；菜单与terminal反馈真实。1440×900的2/4窗真实平铺、无相交/出界、控制中心hit、原notes可续写。Node补0/1/minimized、最小容量前沿和fallback原state不变。

## E9 · 四App阅读、触控与边框

已复现 UX028/029，见 space-app-families.json 与独立评分建议。一次仅 products/books/contact/settings；不借机重写11App或世界。保持真实产品/书籍/外链与四色封面，不真实打开联系发送渠道。

主正文/输入投影后约15–16 CSSpx，主要动作13–14、必要辅助/能力状态12–13、装饰编号10–11；不是WCAG统一字号规则。重要手机目标投影后44×44并实际中心命中。desktop产品图限制高度但保持比例；phone目录用紧凑选择释放正文宽度。book允许单列纵滚。contact减少渠道重复围框，草稿同DOM/值保留。settings状态就近对应，不新增卡片层。

实拍需desktop/390前后对照，并补320/620/844 coarse、长英文、深色与zoom；逐个选择/滚到底/恢复，不以无横溢出作为可用证明。具体范围可再拆小批，单浏览器串行。

## E10 · Travel QR 与其余目录边界

UX018已有真实390×844zh/light两motion焦点失败；normal Escape后立即Enter重开被旧transition隐藏。修复需要实际focus进入/Tab containment/Escape返回，运行时reduce与取消旧过渡。先保留渠道/二维码源与可见外观，不真实添加联系人。

F03只验Archives首年Mac Meta/plain/Back；其余修饰键/页面不继承。UX009只验当前右TOC runtime reduce点击定位；长目录自动追踪container.scrollTo与焦点仍需独立探针，legacy左sidebar无当前模板不能冒充活路径。

### E9拆批与已测基线

E9a先products/books，E9b再contact/settings；共用原有palette/组件语义，不同时重写4个App。E9a允许native phone select释放正文宽度、保持desktop目录与全部7个产品/4本真实书、限制截图高度保持图像比例、主入口投影后44px、同component产品选择后焦点连续；E9b原contact draft同节点，settings仅同步pressed而不重建整个host，避免焦点BODY。

3caab4d1不可变预览书封computed CSS对比探针已保存：作者/编号因opacity.75，四封面分别约3.415/2.330/2.706/3.164；第二封面的标题2.957，不能上取整为3。E9a保持四色相，允许调深背景与去降低对比opacity，测实际computed前景/背景/元素opacity并报告原始ratio；不把source数值或程序设焦点当全页/Tab路径通过。


### E10只读准备（E9b期间，不是实现）

父读取当前Travel QR源码与既有baseline：div role=dialog未移焦/约束Tab，close仅靠未过滤transitionend且保留旧listener，normal立即重开后会被旧关闭完成事件隐藏；reduced是脚本初次缓存，不保证runtime变化。独立基线已有390中文两motion，继续使用而不重复跑无变化版本。下批仅Travel template的QR markup/controller、对应QR CSS和精确新合同；可参考已存在book modal的native dialog/显式wrap，但不改book AI运输或公开QR源。新增重要close44、短高有界内容与close可达属于项目体验目标，需实际画面决定。先完成E9b独立验收再放行E10生产。


### E9c · 壁纸的真实可见结果（只读方案，待E9b checkpoint）

UX038独立确认1440真实spatial desktop中的颜色选择无可见背景效果；旧landscape隐藏，新screen用固定sp-surface。仅space-cafe.css复用classic现有6色至screen桌面面，保持窗口paper/chrome、3D物理机框与world材质/灯光/动画。新独立合同：1440zh+390en真实3色×2主题→minimize露背景、准确computed色与不同色、原button/焦点/notes/contact草稿保留；同主题阅读面/chrome不跟着换。另1440 forced-WebGL-failure验原fallback landscape palette。父截图确认实际色差，不能只靠dataset或“选择成功”。


### E10最终边界与设计判断（E9c后放行）

只Travel QR markup/controller、QR CSS与新定向合同。保持原渠道、label/id、两张真实竖版海报源（wechat962×1231、RedNote1279×1747）；旧200平方cover会裁海报，新版完整自然比例/contain，normal约200–220宽，短屏横向有界完整海报+真实ID，独立44Close不压图。良好标准是任务辨识、完整图、可关闭且可继续；不能用方形构图好看掩盖图像裁切，也不以显示完整推断实体扫码成功。

原生dialog.showModal+背景inert，打开focus Close；显式Tab双向循环、Escape/Close/backdrop即时归还原opener与原overflow值。只保留用户动作触发开场，runtime reduce立即终态并取消RAF；close即时且幂等、pending旧close事件不teardown新session。页面hide释放自有锁。English实际渠道无QR入口，保留原Instagram/Facebook/email/GitHub；组件fixture必须独立命名，不能计为真实英文二维码旅程。


## E11 / E12 · E10期间新增实证队列

E11优先global search的当前查询意图与索引恢复：旧结果150ms内被Enter实际打开；index挂起可关闭但无有界载入状态，旧失败能盖新成功。先等待独立review命名；最小方案需input立即同步query/fullHref并失效旧results，Enter只基于当前query；索引代次/单次请求所有权、取消与timeout/retry保留query，真实pending与无结果分开。不要重写Fuse算法/检索内容、AI运输或借机装饰全站。

E12阅读脚注firsttap：先解决footer通用anchor与preview首tap的所有权冲突，保证保持原阅读scroll/hash、预览存活、显式GoToNote/第二tap正常跳转与Back；JS缺失仍原生anchors。进一步tooltip交互语义/键盘发现和hover仅在具体actual/source复核后加入小批，不泛化旧TOC已测结论。Article工具1199→1200现已独立复现：compact未发送草稿保留原节点，desktop空且未切AI，focusBODY，下一真实Tab scroll500→26055落推荐链接。不是草稿已丢失；确为跨布局续写/键盘位置缺口，评分独立定级后单独有界修复。


### E11实施合同（E10a期间准备，05:04已放行现有executor）

仅search-palette本地index/结果闭包、必要状态/44Retry模板样式和新search-index合同。input即时clear旧options/count/active并同步fullHref；150ms仅延迟计算，timer捕获query+intent代次，普通Enter取消debounce并同步计算当前query再导航，不读取旧候选。保持IME与Fuse现keys/threshold/fallback、AItransport和全文搜索页/路由。

index独立owner/AbortController/serial，单flight，15s总期限覆盖fetch与JSON，非合作abort仍由race释放UI；close/pagehide失效旧owner，成功Fuse可复用。idle/loading/debounce/trueempty/error/timeout分清，loading/error不展示虚假0结果；Retry保query/fullHref与focus，成功仅自身仍focused才返input再隐藏。测试0/149/150ms与14999/15000ms前沿、旧503/JSON覆盖、cached成功不重复GET、双语390/1440/dark与44hit。E10a checkpoint后再明确放行生产。


### QR后续视觉细化（E11/E12真实主任务缺陷之后）

独立review指出390无clock error图Retry底约455而账号标题约580，提示“使用账号搜索”和实际ID被约120px空区割开，属于可见关联成本而非AT/实体扫码unknown。后续可保持modal/poster固定高度，portrait error/retrying反馈组靠近poster底部/账号区，固定Retry底以避免错误两行→重试一行时按钮漂移；initial loading/正常海报保持。短横屏左右布局不机械下移。先以独立图测反馈→账号间距/Retry位置与焦点，再有界CSS状态实现；不为凑96新增框/功能或改原图。正常图若没有可观察type缺口，不用纯unknown扣局部视觉分；全族仍受完整矩阵unknown约束。


### E12最小实施方案（E11b后只读已审，未放行）

只`layouts/partials/footer.html`、`static/js/footnote-preview.js`、`assets/css/extended/zzz-footnote-preview.css`及新`tests/e2e/footnote-preview-contracts.spec.ts`，拟8个不同合同。通用footer只跳过真实post-content footnote-ref；coarse仅有效定义/普通主键无修饰的真实首tap接管，第二tap/More/Enter/modifier/noJS保持native。坏URI/缺定义放行不抛、不吞。

交互tooltip改具名非模态region，marker aria-controls/expanded+共享键盘说明/ArrowDown进入（Enter仍native）；内部focusin/out与180ms timer绑定当前marker代次，Escape仅内部回marker且不立刻重开；关闭inert阻断残留Tab，不加背景inert或trap。More各pointer可见44；纸色/引用/正文不改。短屏flex/body min-height0+内部scroll，max-height 100dvh-24px并vh回退，More不缩水，12px边界；不加装饰动画/框层。

父实际门槛：390zh/en首tap原scroll/hash/history不动、secondtap/More→脚注→Back回原读点；1440可信Tab局部起点→ArrowDown进入引用/More、停250ms、Escape返原ref不重开、再Enter仍native；568×224 dark实际长note/body可滚/More真实44且屏内、runtime reduce；coarse Meta/非主键、noJS真anchor；timer换marker/离开不抢焦点。OS输入法/AT/实体设备未知不伪称。只读方案由现executor准备，E11c checkpoint后由父明确放行，不覆盖现搜索源码。
