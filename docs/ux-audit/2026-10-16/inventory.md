# 博客全端交互与场景清单

2026-10-16 · Asia/Shanghai · 基线 `6d7b9fe92a74`。只读生产源码；本 Agent 未启动浏览器、构建或测试。

已登记 **309 个控件/对象族**，其中 **26 类动画**、**18 类空间装饰/动态对象**。源码扫描 224 个文件，得到 626 个“可交互标签表达式候选”；它们含条件/循环/旧模板，**不是页面上实际按钮数量**。发现 34 个去掉 fenced code 后的文章 shortcode 源码实例（是否生产发布另由日期/路由决定）。

采用 `frontend-design`：把真实写作、构建和旅途作为个性来源；把大胆表达集中在终端→咖啡馆这一处；控件边界只解释层级，非用户触发的运动要克制；名称说明下一步，而不是展示实现。

## 覆盖边界与实际证据

- 共享页面：全局头部/页脚/搜索/订阅/分享：首页、文章库、AI/工程/成长分区、专栏、标签、归档、文章、Travel、About、404。
- Space：终端引导、6景、3D电脑/室内/露台/猫、窗口/Dock/菜单/搜索/Launchpad、11应用、Product Lab与Knowledge。
- 内容特殊组件：12类可探索图示、知识星图、图片/代码/脚注/选文、FAQ/系列/月度笔记、外部嵌入；重复文章按模板归类。
- 原始盘点检查3张旧Space实拍；v1.3另导入父任务A批20项定向check并检查6张A截图。证据逐状态绑定，仍不代表控件族全部验收或实体设备通过。
- 完整机器可读记录（逐项八状态、验证方法、源码表达式候选、内容实例）见 [inventory.json](inventory.json)。

## 第一轮优先级

| ID | 级别 | 观察事实/待核实项 | 合格标准 |
| --- | --- | --- | --- |
| F01 | P1 | 同站有至少五类AI入口及独立实现，输入/发送/停止/错误/关闭/引用状态需逐套验收；现有Space回执不能覆盖全站。 | 输入不丢失、请求中能停、失败后原问题可重试、明确上下文、关闭后焦点恢复 |
| F02 | P2 | “全部”过滤实际 next===all ? n.kind===product，写作/系列不显示；名称与字面期望存在冲突。 | 选项名称与实际集合一致 |
| F03 | P2 | 全局锚点处理在preventDefault前缺少modifier/button guard；可能拦截Ctrl/⌘点击原生意图。 | 普通点击增强不改变修饰键/新标签语义 |
| F04 | P2 | 390px实拍右上换景仅剩下箭头；同屏左下地点又可换景。两个入口不必同权，手机可发现性需复核。 | 控件能从可见标签理解动作；重复入口有主次 |
| F05 | P2 | 经典OS描边、内高光、阴影与多层边界累积；欢迎/设置/相册/AI重复大写眉题与↗。源码证明层数，是否抢注意力要实拍各App。 | 边框表达可操作分组/活动窗口，不能让装饰层比内容和主按钮更强 |
| F06 | P2 | 装饰、交互、状态动画分别实现在多个文件；减少动态效果与hidden暂停需要跨页面逐项核查，不能从猫已暂停外推所有动画。 | 非用户触发动态克制、减少动态效果生效、不持续GPU空转、不夺取阅读注意力 |
| F07 | P2 | 桌面搜索height30、主题32，而手机有44px覆盖；尚未测实际padding/命中范围，不应直接宣称目标达标。 | 触控命中至少44×44，桌面也有容错与相邻间距 |
| F08 | P2 | 只有电脑可射线点击；墙、照片、书架、猫是装饰/动态。不得把每个装饰都当按钮，也不能让静态物体出现交互暗示。 | 视觉可操作性与真实点击能力相符 |
| F09 | P2 | 首页部分站内/Space产品卡 target=_blank，其他站内导航同页；需要按同一任务连续性检查，不能无理由增多标签页。 | 同站浏览意图连续，外部目标清楚 |
| F10 | P1 | 截至本次源码盘点，没有逐控件八状态、实体手机、Safari/Firefox和真实后端的全覆盖证据。96分仅能作为可量化验收目标，不能靠主观补分达标。 | 功能硬门槛通过并附实际证据，未证实不能给满分 |

## 八状态协议

每项记录 normal、hover、focus、active、disabled、loading、error、empty。`不适用`必须有语义原因；`unverified`不能当通过。下表引用的 profile 是验收标准和源码归类，只有 JSON `state_observations` 标有实拍的正常态可算已有视觉证据。

| Profile | 正常/焦点/动作 | 禁用/加载/失败/空态 |
| --- | --- | --- |
| `nav` | 链接可见且指向可读目标；链接 Tab/Enter 导航；Space 保留原生滚动，按钮才使用 Enter/Space；焦点轮廓待实测；导航触发；当前路由 aria-current/active 依组件而异 | 不适用：普通导航不应禁用；浏览器原生导航；无组件加载状态；目标/外链失败由目标页呈现，未逐个联网验证；不适用 |
| `command` | 可触发当前用户动作；应可 Tab/Enter/Space；焦点视觉待实测；按下反馈和完成后的状态待实测 | 依据组件真实条件；不存在条件时不适用；同步动作不适用；异步动作另以 async profile 记录；同步动作不适用；失败出口看对应功能；无输入时不适用 |
| `toggle` | 可见选项及当前选择；Tab/Enter/Space 可达性待实测；以 aria-pressed / aria-selected / checked 或 details[open] 区分 | 边界或忙碌时条件性禁用，逐项待核验；不适用：本地选择立即生效；持久化失败反馈待实测；无可选项时说明或不渲染 |
| `input` | 有标签、占位、保留已有值；输入焦点/光标与虚拟键盘遮挡待实测；输入和选区连续；IME/中文输入待核验 | 忙碌时可能禁用，组件有差异；输入值应保留；请求中组件另行记录；格式/长度/存储错误依组件；逐项待实测；占位文字及发送禁用应可理解 |
| `async` | 明确动作及预期结果；Tab 可达与异步完成不抢焦点待实测；动作启动后防重复提交 | 请求中/输入为空/不可用时真实 disabled；逐项待核验；应为实际请求状态，不能用装饰动画伪成功；源中存在错误/重试/直达出口，详见该条；未逐个断网实测；无内容或未连接时说明下一步，不伪造内容 |
| `window` | 窗口及标题/控件可见；活动窗口/focus ring/焦点恢复待实测；聚焦/z-index/最小化/最大化状态来自 state | 无窗口或移动端不支持的动作需要明确处理；首次 app 内容可有实际异步状态；app 自身错误不应使窗口管理失效；桌面空白时 Dock/所有应用可继续 |
| `3d` | 真实 WebGL 画面及 DOM 替代入口；三维物体无 DOM focus；电脑由打开工作区按钮等价替代；拖动观察/走动/镜头过渡；不应误触电脑 | boot/modal/quiet/reduced/hidden 条件分别控制；firstFrame 实际绘制成功后交接；WebGL/context loss 进入普通工作区；可选猫失败不阻断；无场景时保留普通内容路径 |
| `decor` | 装饰或空间环境，不是按钮；不进入 Tab 顺序；不适用 | 不适用；可选媒体异步；失败不阻断；可选媒体失败时省略或保留静态画面；不适用 |
| `animation` | 动态传达氛围或用户动作结果；不夺取焦点；由动作/可见性状态驱动 | prefers-reduced-motion/hidden/quiet 依模块暂停；需逐项实测；不得用动画代替实际完成信号；降级至静态/普通内容；数据为空时不产生假节点 |

## 逐项清单

v1.2：已逐项校准 selector；删除源码中不存在的年份筛选；补全DOM工厂生成的批准/拒绝、FAQ追问、采访、分享渠道、联系卡和外部嵌入。共有 265 个控件族、356 个选择器级稳定 control ID。JSON 中 `familyId` 与 `control_ids` 用于评分关联，重复数据实例不冒充独立设计。

源码行及 SHA256 指盘点阶段；执行 Agent 后续变更不会自动转化为已验收。旧PNG只有正常态证据。原生链接 Enter 导航/Space滚动，按钮 Enter/Space触发。第三方组件内部按钮待运行时补全。


### G · 全局系统

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `G.NAV.SKIP` | 跳到正文 | `.skip-link`<br>[layouts/partials/header.html:42](../../../layouts/partials/header.html) | 绕过重复导航 | `nav` / source-only |
| `G.NAV.HOME` | CUBXXW 品牌/首页 | `.logo a`<br>[layouts/partials/header.html:49](../../../layouts/partials/header.html) | 返回首页 | `nav` / source-only |
| `G.NAV.MENU` | 文章/专栏/AI Agent/工程/成长/空间 | `#menu a`<br>[layouts/partials/header.html:80](../../../layouts/partials/header.html) | 切换内容分区；子菜单完整链接族 | `nav` / source-only |
| `G.NAV.SEARCH` | 搜索/⌘ K | `[data-search-trigger="nav"]`<br>[layouts/partials/header.html:146](../../../layouts/partials/header.html) | 打开全站搜索 | `command` / source-only |
| `G.NAV.THEME` | 浅色/深色 | `#theme-toggle`<br>[layouts/partials/header.html:166](../../../layouts/partials/header.html) | 切换全站主题 | `toggle` / source-only |
| `G.NAV.LANG` | 中文/EN | `.lang-switch__item a`<br>[layouts/partials/header.html:193](../../../layouts/partials/header.html) | 切换对应语言 | `nav` / source-only |
| `G.NAV.MOBILE` | 打开/关闭导航 | `.hamburger-menu`<br>[layouts/partials/header.html:226](../../../layouts/partials/header.html) | 手机展开导航 | `toggle` / source-only |
| `G.NAV.ANCHOR` | 原生页内锚点 | `a[href^="#"]`<br>[layouts/partials/footer.html:52](../../../layouts/partials/footer.html) | 目录/归档/段落跳转与历史 | `nav` / source-only |
| `G.NAV.TOP` | 返回顶部/进度环 | `#top-link`<br>[layouts/partials/footer.html:13](../../../layouts/partials/footer.html) | 长文返回顶部 | `command` / source-only |
| `G.NAV.WAYFINDER` | 章节侧边索引 | `[data-page-wayfinder] a`<br>[layouts/partials/page-wayfinder.html:22](../../../layouts/partials/page-wayfinder.html) | 定位当前章节 | `nav` / source-only |
| `G.SEARCH.CLOSE` | 关闭搜索 | `.search-palette__close`<br>[layouts/partials/search-palette.html:19](../../../layouts/partials/search-palette.html) | 退出搜索并恢复焦点 | `command` / source-only |
| `G.SEARCH.QUERY` | 搜索文章 | `.search-palette__input`<br>[layouts/partials/search-palette.html:24](../../../layouts/partials/search-palette.html) | 输入检索词 | `input` / source-only |
| `G.SEARCH.RESULT` | 搜索结果/键盘上下移动 | `.search-palette__result`<br>[assets/js/search-palette.js:456](../../../assets/js/search-palette.js) | 打开命中文章 | `nav` / source-only |
| `G.SEARCH.AI` | 用 AI 回答 / 停止生成 | `#search-ai-btn`、条件性 `#search-ai-stop`<br>[layouts/partials/search-palette.html:40](../../../layouts/partials/search-palette.html) | 发送搜索问题并可取消pending | `async` / 局部状态证据，Stop点击待测 |
| `G.SEARCH.SUGGEST` | 入门推荐/AI Agent/最新文章 | `.search-palette__ai-suggestion`<br>[layouts/partials/search-palette.html:73](../../../layouts/partials/search-palette.html) | 启动一个建议问题 | `async` / source-only |
| `G.SEARCH.AICLOSE` | 关闭 AI 搜索 | `#search-ai-close`<br>[layouts/partials/search-palette.html:65](../../../layouts/partials/search-palette.html) | 返回普通检索 | `command` / source-only |
| `G.SEARCH.FULL` | 完整搜索页面 | `#search-full-link`<br>[layouts/partials/search-palette.html:95](../../../layouts/partials/search-palette.html) | 使用完整检索 | `nav` / source-only |
| `G.SEARCH.PAGE` | 完整搜索输入/结果 | `#searchInput`<br>[layouts/_default/search.html:24](../../../layouts/_default/search.html) | 无弹窗查找文章 | `input` / source-only |
| `G.SUB.EMAIL`（A部分状态） | 订阅邮箱 | `.fsub-input`<br>[layouts/partials/footer-subscribe.html:76](../../../layouts/partials/footer-subscribe.html) | 输入有效邮箱 | `input` / source-only |
| `G.SUB.SUBMIT` | 订阅 | `.fsub-go`<br>[layouts/partials/footer-subscribe.html:80](../../../layouts/partials/footer-subscribe.html) | 订阅 newsletter | `async` / source-only |
| `G.SUB.FEED` | RSS/JSON/OPML/频道 | `.fsub-chip`<br>[layouts/partials/footer-subscribe.html:96](../../../layouts/partials/footer-subscribe.html) | 选择订阅格式或下载OPML | `nav` / source-only |
| `G.FOOTER.LINKS` | 内容/产品/作者/社交入口 | `.sf-list a, .hp-footer a`<br>[layouts/partials/site-footer.html:28](../../../layouts/partials/site-footer.html) | 页脚继续探索 | `nav` / source-only |
| `G.FOOTER.MORE` | 更多作品/其他平台 | `.hp-footer-more summary`<br>[layouts/partials/homepage-footer.html:35](../../../layouts/partials/homepage-footer.html) | 展开次级链接 | `toggle` / source-only |
| `G.CONTACT.QR` | 微信/小红书二维码/复制 ID | `[data-contact-platform]`<br>[layouts/partials/homepage-daypage.html:88](../../../layouts/partials/homepage-daypage.html) | 通过二维码建立联系 | `command` / source-only |
| `G.SHARE.ENTRY` | 生成分享卡/微信分享 | `[data-share-trigger], .marginalia-share-btn`<br>[layouts/_default/single.html:374](../../../layouts/_default/single.html) | 生成文章卡片 | `command` / source-only |
| `G.SHARE.DIRECT` | X/Email/复制链接 | `.abs-share-btn, .marginalia-share-btn`<br>[layouts/partials/article/marginalia.html:221](../../../layouts/partials/article/marginalia.html) | 使用系统/社交分享 | `command` / source-only |
| `G.SHARE.CLOSE` | 关闭卡片编辑器 | `.conv-share-close`<br>[static/js/share-conversation.js:91](../../../static/js/share-conversation.js) | 退出分享回到原处 | `command` / source-only |
| `G.SHARE.THEME` | 卡片主题颜色 | `.conv-share-swatch`<br>[static/js/share-conversation.js:101](../../../static/js/share-conversation.js) | 选择分享卡配色 | `toggle` / source-only |
| `G.SHARE.MODE` | 当前回答/全部回答 | `.conv-share-mode`<br>[static/js/share-conversation.js:100](../../../static/js/share-conversation.js) | 选择分享范围 | `toggle` / source-only |
| `G.SHARE.COPYIMAGE` | 复制图片 | `#csb-copy-img`<br>[static/js/share-conversation.js:816](../../../static/js/share-conversation.js) | 复制卡片至剪贴板 | `async` / source-only |
| `G.SHARE.SAVE` | 下载图片 | `#csb-save-img`<br>[static/js/share-conversation.js:822](../../../static/js/share-conversation.js) | 导出PNG分享卡 | `async` / source-only |
| `G.SHARE.SYSTEM` | 系统分享 | `#csb-web-share`<br>[static/js/share-conversation.js:828](../../../static/js/share-conversation.js) | 交给系统选择目标 | `async` / source-only |
| `G.SHARE.COPYTEXT` | 复制文本/引用/原文链接 | `#csb-copy-text, #csb-copy-link`<br>[static/js/share-conversation.js:891](../../../static/js/share-conversation.js) | 复制可复用内容 | `async` / source-only |
| `G.SHARE.SOURCE` | 分享到X/返回原文 | `#csb-x, #csb-source`<br>[static/js/share-conversation.js:881](../../../static/js/share-conversation.js) | 去来源或外部分享 | `nav` / source-only |
| `G.SEARCH.FOLLOWUP` | AI追问输入/发送 | `.search-palette__followup-input, .search-palette__followup-send`<br>[assets/js/search-palette.js:172](../../../assets/js/search-palette.js) | 继续当前检索问答 | `async` / source-only |
| `G.SEARCH.RETRY` | AI搜索重试 | `.search-palette__ai-error .ai-retry-btn`<br>[assets/js/search-palette.js:458](../../../assets/js/search-palette.js) | 以原问题重试 | `async` / source-only |
| `G.SEARCH.CONTACT` | 打开微信名片 | `.ai-wechat-cta-btn`<br>[assets/js/search-palette.js:540](../../../assets/js/search-palette.js) | 从联系回答到真实二维码 | `command` / source-only |
| `G.CONTACT.CLOSE` | 关闭联系卡 | `.wxc-close`<br>[layouts/partials/wechat-contact.html:111](../../../layouts/partials/wechat-contact.html) | 退出联系卡并还原焦点 | `command` / source-only |
| `G.CONTACT.COPY` | 复制账号 | `.wxc-copy`<br>[layouts/partials/wechat-contact.html:135](../../../layouts/partials/wechat-contact.html) | 复制微信/小红书ID | `async` / source-only |
| `G.CONTACT.VIEW` | 查看二维码大图/打开主页 | `.wxc-qr, .wxc-visit`<br>[layouts/partials/wechat-contact.html:124](../../../layouts/partials/wechat-contact.html) | 使用大图扫码或访问主页 | `nav` / source-only |
| `G.SHARE.MORE` | 更多/收起分享渠道 | `#share-more-btn`<br>[layouts/partials/share_icons.html:144](../../../layouts/partials/share_icons.html) | 按需展开次级分享方式 | `toggle` / source-only |
| `G.SHARE.WEBSHARE` | 系统分享文章 | `#share-webshare-btn`<br>[layouts/partials/share_icons.html:128](../../../layouts/partials/share_icons.html) | 使用系统目标选择 | `async` / source-only |
| `G.SHARE.PLATFORMS` | X/Email/LinkedIn/Telegram/WhatsApp/Reddit/微博/B站/知乎/小红书/HN/Facebook | `.share-primary a, .share-secondary a`<br>[layouts/partials/share_icons.html:161](../../../layouts/partials/share_icons.html) | 在指定平台继续分享；部分渠道复制富文本 | `nav` / source-only |

### H · 首页

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `H.HERO.READ` | 开始阅读 / 读这篇文章 | `.hp-entry-actions a[href="#hp-posts"]`、`.hp-reading-start__link`<br>[homepage-reading-start.html:4](../../../layouts/partials/homepage-reading-start.html) | 定位文章区 / 直接读真实实践文章 | `nav` / 每个control独立局部证据 |
| `H.HERO.PRODUCT` | 探索产品 | `.hp-entry-actions a[href*="projects"]`<br>[layouts/partials/homepage-daypage.html:59](../../../layouts/partials/homepage-daypage.html) | 进入空间 | `nav` / source-only |
| `H.HERO.ABOUT` | 认识我/关于我 | `.hp-hero-cta`<br>[layouts/partials/homepage-daypage.html:61](../../../layouts/partials/homepage-daypage.html) | 打开作者介绍 | `nav` / source-only |
| `H.HERO.SOCIAL` | 社交图标链接 | `.hp-social-icon`<br>[layouts/partials/homepage-daypage.html:83](../../../layouts/partials/homepage-daypage.html) | 访问公开平台 | `nav` / source-only |
| `H.CHAT.OPEN` | Bear 头像 | `#hp-avatar-btn`<br>[layouts/partials/homepage-daypage.html:505](../../../layouts/partials/homepage-daypage.html) | 开启首页问答 | `command` / source-only |
| `H.CHAT.BUBBLE` | 环绕问题气泡 | `.hp-bear-bubble`<br>[layouts/partials/homepage-daypage.html:471](../../../layouts/partials/homepage-daypage.html) | 从建议问题开始对话 | `async` / source-only |
| `H.CHAT.QUICK` | 快捷问题 | `.hp-bear-chat-quick-btn[data-msg]`<br>[layouts/partials/homepage-daypage.html:595](../../../layouts/partials/homepage-daypage.html) | 追问产品/文章/旅行 | `async` / source-only |
| `H.CHAT.INPUT` | 给 Bear 的消息 | `#hp-chat-input`<br>[layouts/partials/homepage-daypage.html:622](../../../layouts/partials/homepage-daypage.html) | 编写问题 | `input` / source-only |
| `H.CHAT.SEND` | 发送消息 | `#hp-chat-send`<br>[layouts/partials/homepage-daypage.html:623](../../../layouts/partials/homepage-daypage.html) | 发送问题/查看流式回答 | `async` / source-only |
| `H.CHAT.CLEAR` | 清空对话 | `#hp-chat-clear`<br>[layouts/partials/homepage-daypage.html:614](../../../layouts/partials/homepage-daypage.html) | 清除浏览器本轮对话 | `command` / source-only |
| `H.CHAT.CLOSE` | 关闭对话 | `#hp-chat-close`<br>[layouts/partials/homepage-daypage.html:615](../../../layouts/partials/homepage-daypage.html) | 继续浏览首页 | `command` / source-only |
| `H.CHAT.RETRY` | 重试这条消息 | `#hp-chat-retry`<br>[layouts/partials/homepage-daypage.html:620](../../../layouts/partials/homepage-daypage.html) | 服务失败后重试原问题 | `async` / source-only |
| `H.CHANNEL.TABS` | 写作频道标签 | `.hp-rail-tab`<br>[layouts/partials/homepage-daypage.html:208](../../../layouts/partials/homepage-daypage.html) | 首点切换本页频道；再次可进入分区 | `toggle` / source-only |
| `H.CHANNEL.PREV` | 上一个频道 | `#hp-rail-prev`<br>[layouts/partials/homepage-daypage.html:224](../../../layouts/partials/homepage-daypage.html) | 横向频道导航 | `command` / source-only |
| `H.CHANNEL.NEXT` | 下一个频道 | `#hp-rail-next`<br>[layouts/partials/homepage-daypage.html:227](../../../layouts/partials/homepage-daypage.html) | 横向频道导航 | `command` / source-only |
| `H.CHANNEL.MORE` | 查看全部文章 | `#hp-posts-action`<br>[layouts/partials/homepage-daypage.html:167](../../../layouts/partials/homepage-daypage.html) | 进入当前频道全集 | `nav` / source-only |
| `H.CHANNEL.CARD` | 频道内文章卡片 | `.hp-channel-panel a`<br>[layouts/partials/homepage-posts-panel.html:67](../../../layouts/partials/homepage-posts-panel.html) | 打开文章 | `nav` / source-only |
| `H.BOOK.LINK` | 书籍封面/阅读 | `.hp-book`<br>[layouts/partials/homepage-daypage.html:253](../../../layouts/partials/homepage-daypage.html) | 阅读作者书籍 | `nav` / source-only |
| `H.PRODUCT.CARD` | 产品主卡片 | `.hp-product__main`<br>[layouts/partials/homepage-daypage.html:298](../../../layouts/partials/homepage-daypage.html) | 进入产品在Space的详情 | `nav` / source-only |
| `H.PRODUCT.OPEN` | 打开产品/GitHub | `.hp-product__links a`<br>[layouts/partials/homepage-daypage.html:314](../../../layouts/partials/homepage-daypage.html) | 访问真实产品或源码 | `nav` / source-only |
| `H.ACTIVITY.STATS` | 总文章/今年/年数/标签 | `.hp-travel-stat`<br>[layouts/partials/homepage-daypage.html:345](../../../layouts/partials/homepage-daypage.html) | 进入归档/标签 | `nav` / source-only |
| `H.ACTIVITY.YEAR` | 热力图年份 | `.hp-heatmap-year-tab`<br>[layouts/partials/homepage-daypage.html:373](../../../layouts/partials/homepage-daypage.html) | 查看不同年份写作频率 | `toggle` / source-only |
| `H.ACTIVITY.DAY` | 热力图日期格子 | `.hp-heat-cell.has-posts`<br>[layouts/partials/homepage-daypage.html:979](../../../layouts/partials/homepage-daypage.html) | 定位日期文章/提示写作数 | `nav` / source-only |
| `H.ACTIVITY.RECENT` | 最近文章 | `.hp-recent-post-link`<br>[layouts/partials/homepage-daypage.html:359](../../../layouts/partials/homepage-daypage.html) | 打开近期更新 | `nav` / source-only |

### L · 列表与分类

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `L.FILTER.TOPIC` | 全部/AI Agent/工程/成长/项目 | `[data-category]`<br>[layouts/section/articles.html:76](../../../layouts/section/articles.html) | 筛选文章大类 | `toggle` / source-only |
| `L.FILTER.MORE` | 更多筛选 | `#filter-toggle`<br>[layouts/section/articles.html:98](../../../layouts/section/articles.html) | 展开标签/年份/排序 | `toggle` / source-only |
| `L.FILTER.TAG` | 标签选项 | `[data-tag]`<br>[layouts/section/articles.html:114](../../../layouts/section/articles.html) | 组合标签筛选 | `toggle` / source-only |
| `L.FILTER.SORT` | 排序 | `#filter-sort`<br>[layouts/section/articles.html:127](../../../layouts/section/articles.html) | 选择新旧顺序 | `toggle` / source-only |
| `L.FILTER.RESET` | 清除筛选/重置 | `#filter-clear`<br>[layouts/section/articles.html:132](../../../layouts/section/articles.html) | 恢复完整文章库 | `command` / source-only |
| `L.CARD.OPEN` | 文章标题/封面 | `.article-card a`<br>[layouts/partials/articles/card.html:16](../../../layouts/partials/articles/card.html) | 打开文章详情 | `nav` / source-only |
| `L.CARD.MORE` | 加载更多/下一页 | `[data-lm-next]`<br>[layouts/partials/list-loadmore.html:17](../../../layouts/partials/list-loadmore.html) | 继续读取后续列表 | `async` / source-only |
| `L.CARD.PAGINATION` | 继续加载文章/下一页 | `[data-posts-next]`<br>[layouts/section/articles.html:200](../../../layouts/section/articles.html) | 无JS也能翻页 | `nav` / source-only |
| `L.TAXONOMY.TAG` | 标签/分类入口 | `.terms-tags a`<br>[layouts/_default/terms.html:28](../../../layouts/_default/terms.html) | 查看某一主题全部文章 | `nav` / source-only |
| `L.TAXONOMY.COLUMN` | 专栏卡片 | `.column-entry__link`<br>[layouts/columns/terms.html:53](../../../layouts/columns/terms.html) | 选择一个系列 | `nav` / source-only |
| `L.ARCHIVE.YEAR` | 归档年份 | `.archives-year-nav__link`<br>[layouts/_default/archives.html:49](../../../layouts/_default/archives.html) | 跳到年度 | `nav` / source-only |
| `L.ARCHIVE.POST` | 归档文章 | `.archives-post__link`<br>[layouts/_default/archives.html:76](../../../layouts/_default/archives.html) | 按时间打开文章 | `nav` / source-only |

### A · 文章阅读

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `A.META.AUTHOR` | 作者卡/日期/语言/分类/标签 | `.marginalia-author-card, .marginalia-link, .dialect-link, .marginalia-tag`<br>[layouts/partials/article/marginalia.html:39](../../../layouts/partials/article/marginalia.html) | 了解来源/切换译文/同主题阅读 | `nav` / source-only |
| `A.META.SOURCE` | 编辑本文/查看源文 | `.marginalia-github-btn`<br>[layouts/partials/article/marginalia.html:174](../../../layouts/partials/article/marginalia.html) | 在GitHub检查/建议修改 | `nav` / source-only |
| `A.TOC.TABS` | 目录/系列/AI 阅读标签 | `.rc-tab`<br>[layouts/partials/article/editorial-tools.html:26](../../../layouts/partials/article/editorial-tools.html) | 切换右栏辅助工具 | `toggle` / source-only |
| `A.TOC.LINK` | 目录标题项 | `.toc-side__nav a`<br>[layouts/partials/article/editorial-tools.html:73](../../../layouts/partials/article/editorial-tools.html) | 定位正文段落 | `nav` / source-only |
| `A.TOC.FAB` | 移动阅读工具 | `#article-fab`<br>[layouts/_default/single.html:228](../../../layouts/_default/single.html) | 打开底部阅读抽屉 | `command` / source-only |
| `A.TOC.MOBILETABS` | 目录/系列/AI/分享 | `.abs-tab`<br>[layouts/_default/single.html:244](../../../layouts/_default/single.html) | 切换底部工具 | `toggle` / source-only |
| `A.TOC.SERIES` | 系列列表/上一下一篇/更多系列 | `.rc-series-link, .abs-series-link, .series-nav__title`<br>[layouts/partials/article/series-nav.html:54](../../../layouts/partials/article/series-nav.html) | 有顺序地读完系列 | `nav` / source-only |
| `A.TOC.SERIESMORE` | 查看系列全部篇数 | `.series-nav__summary`<br>[layouts/partials/article/series-nav.html:46](../../../layouts/partials/article/series-nav.html) | 展开完整章节 | `toggle` / source-only |
| `A.AI.CHIP` | 总结/原句/关联/质疑/入门/延伸/系列视角 | `.rc-ai-chip, .abs-ai-chip`<br>[layouts/partials/article/editorial-tools.html:142](../../../layouts/partials/article/editorial-tools.html) | 选一个阅读视角 | `async` / source-only |
| `A.AI.INPUT` | 文章问题 | `.rc-ai-textarea, .abs-ai-textarea`<br>[layouts/partials/article/editorial-tools.html:182](../../../layouts/partials/article/editorial-tools.html) | 询问具体正文 | `input` / source-only |
| `A.AI.SEND` | 发送问题 | `.rc-ai-send, .abs-ai-send`<br>[layouts/partials/article/editorial-tools.html:185](../../../layouts/partials/article/editorial-tools.html) | 发起流式回答 | `async` / source-only |
| `A.AI.STOP` | 停止回答 | `.article-chat-stop`<br>[static/js/article-chat.js:140](../../../static/js/article-chat.js) | 中止当前生成 | `command` / source-only |
| `A.AI.CONTEXTCLEAR` | 移除引用上下文 | `.article-chat-reference-clear`<br>[static/js/article-chat.js:138](../../../static/js/article-chat.js) | 换一个讨论对象 | `command` / source-only |
| `A.AI.RETRY` | 重试 | `.ai-retry-btn`<br>[static/js/article-chat.js:252](../../../static/js/article-chat.js) | 恢复失败问答 | `async` / source-only |
| `A.AI.FOLLOWUP` | 继续提问建议 | `.article-chat-followup`<br>[static/js/article-chat.js:192](../../../static/js/article-chat.js) | 沿回答继续探索 | `async` / source-only |
| `A.AI.SHARE` | 分享阅读洞见 | `.rc-ai-share-btn, .abs-ai-share-btn`<br>[static/js/article-chat.js:184](../../../static/js/article-chat.js) | 生成本地分享卡 | `command` / source-only |
| `A.SELECTION.SHARE` | 选文分享 | `[data-asel-action="share"]`<br>[static/js/article-selection.js:246](../../../static/js/article-selection.js) | 将选中段落生成卡片 | `command` / source-only |
| `A.SELECTION.AI` | 解释选中段落 | `[data-asel-action="ai"]`<br>[static/js/article-selection.js:247](../../../static/js/article-selection.js) | 带原文上下文询问AI | `async` / source-only |
| `A.SELECTION.COMMENT` | 评论选中段落 | `[data-asel-action="comment"]`<br>[static/js/article-selection.js:248](../../../static/js/article-selection.js) | 建立带引用的评论 | `command` / source-only |
| `A.SELECTION.MORE` | 更多/复制引用/复制定位链接/清除 | `[data-asel-action="more"], [data-asel-action="copy-quote"], [data-asel-action="copy-link"], [data-asel-action="clear"]`<br>[static/js/article-selection.js:274](../../../static/js/article-selection.js) | 复制或清除当前选择 | `command` / source-only |
| `A.SELECTION.COMMENTDRAWER` | 评论抽屉关闭/复制/继续阅读 | `.asel-comments-close, .asel-comments-copy, .asel-comments-resume`<br>[static/js/article-selection.js:904](../../../static/js/article-selection.js) | 离开评论回到阅读 | `command` / source-only |
| `A.BODY.LINK` | 正文/脚注/参考资料/文内锚点 | `.post-content a`<br>[layouts/_default/_markup/render-link.html:22](../../../layouts/_default/_markup/render-link.html) | 跟随来源或段落 | `nav` / source-only |
| `A.BODY.IMAGE` | 图片放大/关闭 | `.post-content img.zoomable, .lightbox-close`<br>[static/js/image-lightbox.js:52](../../../static/js/image-lightbox.js) | 看清图片细节后返回原位 | `command` / source-only |
| `A.BODY.CODECOPY`（A部分状态） | 复制代码 | `.copy-code`<br>[static/js/code-copy.js:17](../../../static/js/code-copy.js) | 复制完整代码 | `command` / source-only |
| `A.BODY.CODEEXPAND` | 代码全屏/字体缩放/关闭 | `.code-tool-expand, .code-fs-zoom-in, .code-fs-zoom-out, .code-fs-close`<br>[static/js/code-mobile.js:123](../../../static/js/code-mobile.js) | 小屏阅读长代码 | `command` / source-only |
| `A.BODY.FAQ` | FAQ 折叠 | `.article-faq__q`<br>[layouts/partials/article/faq.html:28](../../../layouts/partials/article/faq.html) | 展开答案 | `toggle` / source-only |
| `A.BODY.NOTES` | 月度思考段落定位 | `.note-block[id]`<br>[layouts/partials/article/note-blocks.html:7](../../../layouts/partials/article/note-blocks.html) | 定位具体笔记段 | `nav` / source-only |
| `A.BODY.LINKPREVIEW` | 链接预览 | `.link-preview`<br>[static/js/link-preview.js:56](../../../static/js/link-preview.js) | 悬停了解目的地 | `decor` / source-only |
| `A.BODY.FOOTNOTEPREVIEW` | 脚注预览/继续到脚注 | `.fn-popover`（非点击support）、`.post-content a.footnote-ref[href^="#"]`、`.fn-popover__more`<br>[static/js/footnote-preview.js:46](../../../static/js/footnote-preview.js) | 不离开阅读线查看注释 | `command` / source-only |
| `A.FOOTER.NEXT` | 上一篇/下一篇/相关文章/专栏结尾 | `.paginav a, .related-posts a, .column-outro a`<br>[layouts/partials/post_nav_links.html:44](../../../layouts/partials/post_nav_links.html) | 继续下一段阅读 | `nav` / source-only |
| `A.BODY.DISCLOSURE` | 收起长折叠内容 | `.article-disclosure__collapse`<br>[static/js/article-disclosure.js:85](../../../static/js/article-disclosure.js) | 读完折叠块后回到标题 | `command` / source-only |
| `A.FAQ.AI.OPEN` | 继续问AI | `.article-faq__ai-toggle`<br>[static/js/article-faq.js:236](../../../static/js/article-faq.js) | 带FAQ问答上下文追问 | `toggle` / source-only |
| `A.FAQ.AI.CHIP` | FAQ建议问题 | `.article-faq__ai-chip`<br>[static/js/article-faq.js:271](../../../static/js/article-faq.js) | 快速追问当前答案 | `async` / source-only |
| `A.FAQ.AI.INPUT` | FAQ追问输入 | `.article-faq__ai-input`<br>[static/js/article-faq.js:290](../../../static/js/article-faq.js) | 输入具体疑问 | `input` / source-only |
| `A.FAQ.AI.SEND` | FAQ追问发送/请求中停止（同一按钮） | `.article-faq__ai-send`<br>[static/js/article-faq.js:297](../../../static/js/article-faq.js) | 请求流式问答 | `async` / source-only |
| `A.FAQ.AI.RETRY` | FAQ追问重试 | `.article-faq__ai-retry`<br>[static/js/article-faq.js:484](../../../static/js/article-faq.js) | 失败后重试原问题 | `async` / source-only |
| `A.COMMENTS.EXTERNAL` | 登录/排序/回复/反应/评论输入与提交 | `#post-comments-body`<br>[layouts/partials/comments.html:18](../../../layouts/partials/comments.html) | 阅读与参与真实讨论 | `async` / source-only |

### S · Space 与11应用

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `S.BOOT.HOME` | 终端品牌返回首页 | `.space-boot__header a`<br>[layouts/partials/space/cafe.html:7](../../../layouts/partials/space/cafe.html) | 加载时仍能返回 | `nav` / rendered-baseline |
| `S.BOOT.READ` | 先读文章 | `.space-boot__footer a`<br>[layouts/partials/space/cafe.html:19](../../../layouts/partials/space/cafe.html) | 无需等WebGL直接阅读 | `nav` / rendered-baseline |
| `S.BOOT.SKIP` | 准备中/进入/打开工作区 | `[data-boot-skip]`<br>[layouts/partials/space/cafe.html:19](../../../layouts/partials/space/cafe.html) | 首帧就绪后提前交接或失败后继续 | `async` / rendered-baseline |
| `S.CAFE.HOME` | Space Café 品牌 | `.space-cafe__brand`<br>[layouts/partials/space/cafe.html:23](../../../layouts/partials/space/cafe.html) | 返回博客 | `nav` / rendered-baseline |
| `S.CAFE.LANGUAGE` | EN/中 | `[data-cafe-language]`<br>[layouts/partials/space/cafe.html:25](../../../layouts/partials/space/cafe.html) | 保留场景/模式切换语言 | `command` / rendered-baseline |
| `S.CAFE.QUIET`（A部分状态） | 安静模式 | `[data-cafe-quiet]`<br>[layouts/partials/space/cafe.html:26](../../../layouts/partials/space/cafe.html) | 暂停环境动态 | `toggle` / rendered-baseline |
| `S.CAFE.PICKER`（A部分状态） | 换个地方/当前地点/换个风景 | `[data-cafe-picker]`<br>[layouts/partials/space/cafe.html:27](../../../layouts/partials/space/cafe.html) | 打开六景选择器 | `command` / rendered-baseline |
| `S.CAFE.THEME` | 六个场景卡片 | `[data-cafe-theme]`<br>[assets/js/space/cafe.js:27](../../../assets/js/space/cafe.js) | 切换garden/coast/lake/mountain/rain/zen | `toggle` / source-only |
| `S.CAFE.PICKERCLOSE` | 关闭场景选择 | `[data-cafe-picker-close]`<br>[layouts/partials/space/cafe.html:38](../../../layouts/partials/space/cafe.html) | 保持原景返回 | `command` / source-only |
| `S.CAFE.SEAT` | 回到座位 | `[data-cafe-start]`<br>[layouts/partials/space/cafe.html:40](../../../layouts/partials/space/cafe.html) | 返回室内主构图 | `async` / source-only |
| `S.CAFE.TERRACE` | 去露台看看 | `[data-cafe-outside]`<br>[layouts/partials/space/cafe.html:40](../../../layouts/partials/space/cafe.html) | 镜头到室外 | `async` / source-only |
| `S.CAFE.REPLAY` | 重播入场 | `[data-cafe-replay]`<br>[layouts/partials/space/cafe.html:40](../../../layouts/partials/space/cafe.html) | 重看真实就绪的终端过渡 | `async` / source-only |
| `S.CAFE.READ` | 坐下读一篇 | `[data-cafe-read]`<br>[layouts/partials/space/cafe.html:34](../../../layouts/partials/space/cafe.html) | 镜头到电脑并开阅读目录 | `async` / rendered-baseline |
| `S.CAFE.WORKSPACE` | 打开工作区 | `[data-cafe-enter]`<br>[layouts/partials/space/cafe.html:34](../../../layouts/partials/space/cafe.html) | 进入电脑内真实DOM应用 | `async` / rendered-baseline |
| `S.CAFE.RETURN` | 回到咖啡馆 | `[data-cafe-visit]`<br>[layouts/partials/space/cafe.html:33](../../../layouts/partials/space/cafe.html) | 离开屏幕保留窗口与草稿 | `async` / source-only |
| `S.WORLD.LOOK` | 拖动环顾 | `.space-world canvas`<br>[assets/js/space/world-cafe.js:326](../../../assets/js/space/world-cafe.js) | 探索视角 | `3d` / rendered-baseline |
| `S.WORLD.WALK` | 方向键/WASD/触控四方向 | `[data-world-walk]`<br>[layouts/partials/space/cafe.html:35](../../../layouts/partials/space/cafe.html) | 自由漫步并避家具 | `3d` / rendered-baseline |
| `S.WORLD.COMPUTER` | 真实三维电脑屏幕 | `.space-world canvas raycast monitor/display`<br>[assets/js/space/world-cafe.js:321](../../../assets/js/space/world-cafe.js) | 点击实体屏幕进入工作区 | `3d` / source-only |
| `S.MENU.OS` | CUBXXW OS菜单 | `[data-space-menu-trigger]`<br>[layouts/partials/space/desktop.html:70](../../../layouts/partials/space/desktop.html) | 访问全局工作区动作 | `toggle` / source-only |
| `S.MENU.HOME` | 欢迎与关于我 | `[data-space-home]`<br>[layouts/partials/space/desktop.html:53](../../../layouts/partials/space/desktop.html) | 打开介绍与阅读地图 | `command` / source-only |
| `S.MENU.LAUNCH` | 所有应用 | `[data-space-launchpad-trigger]`<br>[layouts/partials/space/desktop.html:54](../../../layouts/partials/space/desktop.html) | 浏览11个应用 | `command` / source-only |
| `S.MENU.SEARCH` | 搜索/⌘K | `[data-space-search-trigger]`<br>[layouts/partials/space/desktop.html:55](../../../layouts/partials/space/desktop.html) | 查找应用与文章 | `command` / source-only |
| `S.MENU.OVERVIEW` | 窗口概览 | `[data-space-overview-trigger]`<br>[layouts/partials/space/desktop.html:57](../../../layouts/partials/space/desktop.html) | 看所有已开窗口 | `command` / source-only |
| `S.MENU.ARRANGE` | 窗口并排/整理窗口 | `[data-space-arrange]`<br>[layouts/partials/space/desktop.html:58](../../../layouts/partials/space/desktop.html) | 恢复可读窗口布局 | `command` / source-only |
| `S.MENU.DESKTOP` | 显示桌面 | `[data-space-show-desktop]`<br>[layouts/partials/space/desktop.html:59](../../../layouts/partials/space/desktop.html) | 暂时最小化所有窗口 | `command` / source-only |
| `S.MENU.LAB` | Product Lab | `[data-product-view-button="lab"]`<br>[layouts/partials/space/desktop.html:62](../../../layouts/partials/space/desktop.html) | 切换到产品目录 | `command` / source-only |
| `S.MENU.BLOG` | 返回博客 | `.space-menu a`<br>[layouts/partials/space/desktop.html:63](../../../layouts/partials/space/desktop.html) | 退出沉浸空间 | `nav` / source-only |
| `S.DOCK.APP` | Dock常用应用：桌面7项/手机5项，另有OS；全集11项在Launchpad | `.space-dock [data-open]`<br>[layouts/partials/space/desktop.html:72](../../../layouts/partials/space/desktop.html) | 打开/恢复对应应用 | `window` / source-only |
| `S.WINDOW.CLOSE` | 关闭窗口 | `[data-window-action="close"]`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 关闭当前应用 | `window` / source-only |
| `S.WINDOW.MINIMIZE`（A部分状态） | 最小化 | `[data-window-action="minimize"]`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 保留窗口收至Dock | `window` / source-only |
| `S.WINDOW.MAXIMIZE` | 最大化/恢复 | `[data-window-action="maximize"]`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 切换阅读大小 | `window` / source-only |
| `S.WINDOW.ARRANGE` | 窗口并排 | `[data-window-action="arrange"]`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 整理窗口 | `window` / source-only |
| `S.WINDOW.DRAG` | 标题栏拖动 | `[data-window-drag]`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 移动窗口 | `window` / source-only |
| `S.WINDOW.RESIZE` | 右/下/角缩放 | `[data-window-resize]`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 按内容调整尺寸 | `window` / source-only |
| `S.WINDOW.OVERVIEWITEM` | 窗口概览项 / 返回 | `[data-overview-id]`、`[data-space-overview-close]`<br>[desktop.html:87](../../../layouts/partials/space/desktop.html) | 选择窗口 / 返回触发器 | `command` / 每control分别绑定证据 |
| `S.SEARCH.QUERY` | 打开应用或找文章 | `[data-space-search-input]`<br>[layouts/partials/space/desktop.html:78](../../../layouts/partials/space/desktop.html) | 检索工作区 | `input` / source-only |
| `S.SEARCH.RESULT` | 结果项 | `[data-search-kind]`<br>[assets/js/space/desktop.js:227](../../../assets/js/space/desktop.js) | 打开应用或具体文章 | `command` / source-only |
| `S.SEARCH.EMPTY` | 清空搜索/浏览所有应用 | `[data-space-search-reset]`<br>[assets/js/space/desktop.js:227](../../../assets/js/space/desktop.js) | 从空结果恢复 | `command` / source-only |
| `S.SEARCH.CLOSE` | Esc/关闭搜索 | `[data-space-search-close]`<br>[layouts/partials/space/desktop.html:78](../../../layouts/partials/space/desktop.html) | 退出搜索 | `command` / source-only |
| `S.LAUNCH.QUERY` | 查找应用 | `[data-space-launchpad-input]`<br>[layouts/partials/space/desktop.html:83](../../../layouts/partials/space/desktop.html) | 筛选11个应用 | `input` / source-only |
| `S.LAUNCH.APP` | 应用磁贴/查看所有应用 | `[data-launchpad-app], [data-space-launchpad-reset]`<br>[assets/js/space/desktop.js:260](../../../assets/js/space/desktop.js) | 打开应用/清空筛选 | `window` / source-only |
| `S.LAUNCH.CLOSE` | 完成/Esc | `[data-space-launchpad-close]`<br>[layouts/partials/space/desktop.html:82](../../../layouts/partials/space/desktop.html) | 返回已有窗口 | `command` / source-only |
| `S.APP.welcome.ENTER` | 进入空间 | `[data-enter-space]`<br>[assets/js/space/apps.js:184](../../../assets/js/space/apps.js) | 从介绍继续到应用 | `command` / source-only |
| `S.APP.welcome.ROUTES` | 文章/作品/AI向导/关于我 | `.space-welcome [data-open]`<br>[assets/js/space/apps.js:184](../../../assets/js/space/apps.js) | 按兴趣打开应用 | `command` / source-only |
| `S.APP.welcome.PROFILE` | 个人档案/这些年/阅读地图/展开履历 | `[data-profile-target], .space-profile summary`<br>[layouts/partials/space/profile.html:10](../../../layouts/partials/space/profile.html) | 查看作者真实公开信息 | `toggle` / source-only |
| `S.APP.welcome.LINKS` | 简历/GitHub/联系/公开JSON/时间线 | `.space-profile a, .space-profile [data-open]`<br>[layouts/partials/space/profile.html:20](../../../layouts/partials/space/profile.html) | 检查项目证据/联系作者 | `nav` / source-only |
| `S.APP.products.SELECT` | 产品侧栏选择 | `[data-select-product]`<br>[assets/js/space/apps.js:30](../../../assets/js/space/apps.js) | 查看产品详情 | `toggle` / source-only |
| `S.APP.products.OPEN` | 真实产品/预览/源码/相关写作 | `.space-product__links a, .space-product [data-open]`<br>[assets/js/space/apps.js:30](../../../assets/js/space/apps.js) | 从介绍到真实产品 | `nav` / source-only |
| `S.APP.reader.QUERY` | 筛选文章 | `[data-library-query]`<br>[assets/js/space/apps.js:37](../../../assets/js/space/apps.js) | 查找文章 | `input` / source-only |
| `S.APP.reader.FILTER` | 全部/AI/工程/思考/收藏 | `[data-library-filter]`<br>[assets/js/space/apps.js:37](../../../assets/js/space/apps.js) | 限定阅读主题 | `toggle` / source-only |
| `S.APP.reader.ITEM` | 文章列表项 | `.space-list-item`<br>[assets/js/space/apps.js:27](../../../assets/js/space/apps.js) | 阅读特定文章 | `async` / source-only |
| `S.APP.reader.NAV` | 返回目录/原文 | `.space-toolbar [data-open="reader"], .space-toolbar a`<br>[assets/js/space/apps.js:56](../../../assets/js/space/apps.js) | 从正文回目录或直达原文 | `nav` / source-only |
| `S.APP.reader.FAVORITE` | 收藏/已收藏 | `[data-reader-favorite]`<br>[assets/js/space/apps.js:56](../../../assets/js/space/apps.js) | 保存到本地收藏 | `toggle` / source-only |
| `S.APP.reader.EXPLAIN` | 解释选中内容 | `[data-reader-explain]`<br>[assets/js/space/apps.js:63](../../../assets/js/space/apps.js) | 带选中文本问AI向导 | `async` / source-only |
| `S.APP.photos.FILTER` | 地区筛选 | `[data-photo-filter]`<br>[assets/js/space/media.js:127](../../../assets/js/space/media.js) | 按旅行区域看照片 | `toggle` / source-only |
| `S.APP.photos.SELECT` | 打开照片 | `[data-photo-select]`<br>[assets/js/space/media.js:127](../../../assets/js/space/media.js) | 看大图 | `command` / source-only |
| `S.APP.photos.NAV` | 返回/上一张/下一张 | `[data-photo-back], [data-photo-prev], [data-photo-next]`<br>[assets/js/space/media.js:127](../../../assets/js/space/media.js) | 连续浏览照片 | `command` / source-only |
| `S.APP.photos.RETRY` | 重试照片 | `[data-image-retry]`<br>[assets/js/space/media.js:18](../../../assets/js/space/media.js) | 从单图失败恢复 | `async` / source-only |
| `S.APP.photos.LOAD` | 加载Immich/刷新/重试连接 | `[data-media-load]`<br>[assets/js/space/media.js:33](../../../assets/js/space/media.js) | 显式连接公开相册 | `async` / source-only |
| `S.APP.photos.MORE` | 继续加载相册 | `[data-media-more]`<br>[assets/js/space/media.js:34](../../../assets/js/space/media.js) | 增量载入公共照片 | `async` / source-only |
| `S.APP.photos.PLACE` | 去过的地方/查看旅行区域 | `[data-media-open="map"]`<br>[assets/js/space/media.js:127](../../../assets/js/space/media.js) | 看照片所在公开地区 | `command` / source-only |
| `S.APP.map.PIN`（A部分状态） | 地图区域标记 | `[data-map-pin]`<br>[assets/js/space/media.js:151](../../../assets/js/space/media.js) | 选择一个地区 | `toggle` / source-only |
| `S.APP.map.REGION` | 区域列表 | `[data-place-select]`<br>[assets/js/space/media.js:155](../../../assets/js/space/media.js) | 无精准地图点击也能选择 | `toggle` / source-only |
| `S.APP.map.VIEW` | 拖动/键盘平移地图 | `[data-map-viewport]`<br>[assets/js/space/media.js:155](../../../assets/js/space/media.js) | 浏览地理范围 | `command` / source-only |
| `S.APP.map.ZOOM` | 放大/缩小/全部/世界 | `[data-map-zoom], [data-map-fit], [data-map-reset]`<br>[assets/js/space/media.js:155](../../../assets/js/space/media.js) | 调整地图视野 | `command` / source-only |
| `S.APP.map.RELATED` | 相关照片/游记/数据许可 | `[data-media-open="photos"], [data-media-open="reader"], .sp-media-footer a`<br>[assets/js/space/media.js:155](../../../assets/js/space/media.js) | 从地点继续看真实记录 | `nav` / source-only |
| `S.APP.books.READ` | 开始阅读 | `.space-book a`<br>[assets/js/space/apps.js:217](../../../assets/js/space/apps.js) | 打开作者自著 | `nav` / source-only |
| `S.APP.notes.EDITOR` | 本地笔记 | `[data-note-editor]`<br>[assets/js/space/apps.js:115](../../../assets/js/space/apps.js) | 随时记想法并保留 | `input` / source-only |
| `S.APP.notes.EXPORT` | 导出.md | `[data-note-export]`<br>[assets/js/space/apps.js:115](../../../assets/js/space/apps.js) | 保存本地备份 | `command` / source-only |
| `S.APP.notes.SANDBOX` | 保存到沙盒 | `[data-note-sandbox]`<br>[assets/js/space/apps.js:115](../../../assets/js/space/apps.js) | 写到已连接的本地Linux环境 | `async` / source-only |
| `S.APP.contact.DRAFT` | 留言草稿 | `[data-message-draft]`<br>[assets/js/space/apps.js:136](../../../assets/js/space/apps.js) | 起草要发给作者的话 | `input` / source-only |
| `S.APP.contact.CHANNEL` | 邮件/GitHub公开留言/WhatsApp/社交 | `[data-contact-email], [data-contact-github], .space-contact-links a, .space-contact__actions a[href*="wa.me/"]`<br>[assets/js/space/apps.js:164](../../../assets/js/space/apps.js) | 用户选渠道自行确认发送 | `nav` / source-only |
| `S.APP.terminal.COMMAND` | 命令输入/help/history/run | `[data-terminal-input]`<br>[assets/js/space/apps.js:146](../../../assets/js/space/apps.js) | 执行工作区命令或本地沙盒命令 | `async` / source-only |
| `S.APP.agent.NEW` | 新对话 | `[data-agent-new], [data-agent-session-new]`<br>[assets/js/space/agent-panel.js:92](../../../assets/js/space/agent-panel.js) | 切换一个干净的任务 | `command` / source-only |
| `S.APP.agent.HISTORY` | 历史/关闭历史 | `[data-agent-history], [data-agent-history-close]`<br>[assets/js/space/agent-panel.js:92](../../../assets/js/space/agent-panel.js) | 恢复过往对话 | `toggle` / source-only |
| `S.APP.agent.SESSIONQUERY` | 查找之前聊过的内容 | `[data-agent-session-search]`<br>[assets/js/space/agent-panel.js:116](../../../assets/js/space/agent-panel.js) | 检索本地会话 | `input` / source-only |
| `S.APP.agent.SESSION` | 历史会话项 | `[data-agent-session]`<br>[assets/js/space/agent-panel.js:164](../../../assets/js/space/agent-panel.js) | 恢复会话及草稿 | `command` / source-only |
| `S.APP.agent.EXPORT` | 导出记录 | `[data-agent-session-export]`<br>[assets/js/space/agent-panel.js:118](../../../assets/js/space/agent-panel.js) | 保存对话副本 | `command` / source-only |
| `S.APP.agent.CONTEXT` | 当前页面/选文上下文 | `[data-agent-context]`<br>[assets/js/space/agent-panel.js:101](../../../assets/js/space/agent-panel.js) | 查看/回到任务上下文 | `command` / source-only |
| `S.APP.agent.INPUT` | 给空间助手的任务 | `[data-agent-input]`<br>[assets/js/space/agent-panel.js:103](../../../assets/js/space/agent-panel.js) | 提交自然语言任务 | `input` / source-only |
| `S.APP.agent.VOICE` | 语音输入 | `[data-agent-voice]`<br>[assets/js/space/agent-panel.js:105](../../../assets/js/space/agent-panel.js) | 浏览器语音识别输入 | `async` / source-only |
| `S.APP.agent.SEND` | 发送 | `[data-agent-send]`<br>[assets/js/space/agent-panel.js:106](../../../assets/js/space/agent-panel.js) | 运行公开资料/空间/沙盒工具任务 | `async` / source-only |
| `S.APP.agent.STOP` | 停止 | `[data-agent-stop]`<br>[assets/js/space/agent-panel.js:107](../../../assets/js/space/agent-panel.js) | 中止当前任务 | `command` / source-only |
| `S.APP.agent.ACTIVITY` | 任务执行过程/工具步骤 | `[data-agent-activity]`<br>[assets/js/space/agent-panel.js:337](../../../assets/js/space/agent-panel.js) | 展开可审查过程 | `toggle` / source-only |
| `S.APP.settings.LANG` | 中文/English | `[data-set-language]`<br>[assets/js/space/apps.js:175](../../../assets/js/space/apps.js) | 保留本地内容切换语言 | `toggle` / source-only |
| `S.APP.settings.THEME` | 经典浅色/深色 | `[data-set-theme]`<br>[assets/js/space/apps.js:175](../../../assets/js/space/apps.js) | 调整应用主题 | `toggle` / source-only |
| `S.APP.settings.COLOR` | 青绿/暮蓝/鼠尾草 | `[data-set-wallpaper]`<br>[assets/js/space/apps.js:175](../../../assets/js/space/apps.js) | 调整桌面颜色 | `toggle` / source-only |
| `S.APP.settings.EXPORT` | 导出工作区 | `[data-space-export]`<br>[assets/js/space/apps.js:175](../../../assets/js/space/apps.js) | 备份窗口/笔记/收藏 | `command` / source-only |
| `S.LAB.SWITCH` | CUBXXW OS/Product Lab双向切换 | `.product-view-switch button`<br>[layouts/section/projects.html:122](../../../layouts/section/projects.html) | 在沉浸空间与产品目录间切换 | `toggle` / source-only |
| `S.LAB.FEATURE` | 推荐产品/所有产品锚点 | `.builds-hero a`<br>[layouts/section/projects.html:148](../../../layouts/section/projects.html) | 从产品主张跳到详情 | `nav` / source-only |
| `S.LAB.PRODUCT` | 产品截图/打开产品/预览/源码 | `.build-card a, .builds-feature a`<br>[layouts/section/projects.html:286](../../../layouts/section/projects.html) | 访问真实项目证据 | `nav` / source-only |
| `S.LAB.KNOWLEDGE` | 进入知识空间 | `[data-bks-enter]`<br>[layouts/section/projects.html:196](../../../layouts/section/projects.html) | 探索产品与写作关系 | `async` / source-only |
| `S.KNOWLEDGE.BACK` | 返回Product Lab | `.bks__back`<br>[assets/js/bear-knowledge-space.js:608](../../../assets/js/bear-knowledge-space.js) | 退出知识场景 | `command` / source-only |
| `S.KNOWLEDGE.FILTER` | 全部/产品/写作/系列 | `.bks__filter`<br>[assets/js/bear-knowledge-space.js:615](../../../assets/js/bear-knowledge-space.js) | 切换节点类型 | `toggle` / source-only |
| `S.KNOWLEDGE.NODE` | 可聚焦节点标签 | `[data-node-id]`<br>[assets/js/bear-knowledge-space.js:704](../../../assets/js/bear-knowledge-space.js) | 查看关系与详情；Enter打开 | `toggle` / source-only |
| `S.KNOWLEDGE.OPEN` | 打开当前条目 | `[data-bks-open]`<br>[assets/js/bear-knowledge-space.js:657](../../../assets/js/bear-knowledge-space.js) | 打开文章/产品来源 | `nav` / source-only |
| `S.KNOWLEDGE.RELATED` | 相邻条目/浏览写作 | `[data-bks-related] a, .bks__browse-writing`<br>[assets/js/bear-knowledge-space.js:532](../../../assets/js/bear-knowledge-space.js) | 沿关系继续探索 | `nav` / source-only |
| `S.OBJECT.WALLS` | 抹灰墙/木梁/落地窗立柱 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:74](../../../assets/js/space/world-cafe.js) | 围合空间、建立尺度 | `decor` / rendered-baseline |
| `S.OBJECT.FLOOR` | 木地板/接缝/露台地板 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:75](../../../assets/js/space/world-cafe.js) | 支撑空间可信度与方向 | `decor` / rendered-baseline |
| `S.OBJECT.RUG` | 编织地毯 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:86](../../../assets/js/space/world-cafe.js) | 柔化近景、标出猫与活动区 | `decor` / rendered-baseline |
| `S.OBJECT.TABLE` | 圆桌/纸页/陶杯 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:54](../../../assets/js/space/world-cafe.js) | 咖啡馆日常物件 | `decor` / rendered-baseline |
| `S.OBJECT.CHAIR` | 椅背/坐垫/椅腿 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:61](../../../assets/js/space/world-cafe.js) | 提供比例、碰撞和落地感 | `decor` / rendered-baseline |
| `S.OBJECT.SHELF` | 书架/彩色书脊 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:101](../../../assets/js/space/world-cafe.js) | 呈现主人的阅读背景 | `decor` / rendered-baseline |
| `S.OBJECT.BAR` | 咖啡吧/机器/杯碟 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:113](../../../assets/js/space/world-cafe.js) | 形成咖啡馆身份 | `decor` / rendered-baseline |
| `S.OBJECT.DESK` | 书桌/键盘/杯子/鼠标 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:123](../../../assets/js/space/world-cafe.js) | 电脑所在工作场景 | `decor` / rendered-baseline |
| `S.OBJECT.PHOTO` | 桌上旅行照片/相框 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:132](../../../assets/js/space/world-cafe.js) | 把真实旅途带入空间 | `decor` / rendered-baseline |
| `S.OBJECT.LIGHT` | 吊灯/太阳/阴影 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:155](../../../assets/js/space/world-cafe.js) | 给眼睛提供方向与层次 | `decor` / rendered-baseline |
| `S.OBJECT.PLANT` | 盆栽/陶瓶 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:162](../../../assets/js/space/world-cafe.js) | 建立有机尺度 | `decor` / rendered-baseline |
| `S.OBJECT.SKY` | 天空/雾/远景 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:167](../../../assets/js/space/world-cafe.js) | 提供深度与柔和背景 | `decor` / rendered-baseline |
| `S.OBJECT.GARDEN` | 庭院/月洞门/竹/苔藓/石 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:269](../../../assets/js/space/world-cafe.js) | 可切换环境主题 | `decor` / rendered-baseline |
| `S.OBJECT.TREES` | 树木/树叶实例/岩石 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:192](../../../assets/js/space/world-cafe.js) | 围合窗外中景 | `decor` / rendered-baseline |
| `S.OBJECT.MOUNTAIN` | 分层群山 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:210](../../../assets/js/space/world-cafe.js) | 环境深度 | `decor` / rendered-baseline |
| `S.OBJECT.WATER` | 水面/波纹 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:218](../../../assets/js/space/world-cafe.js) | 海岸湖景的慢动态 | `decor` / source-only |
| `S.OBJECT.RAIN` | 雨粒子/街景/路灯 | `Three scene room/outdoors`<br>[assets/js/space/world-cafe.js:252](../../../assets/js/space/world-cafe.js) | 雨夜氛围 | `decor` / source-only |
| `S.OBJECT.CAT` | 小猫/眼睛/骨骼/接触影 | `Three cafe resident`<br>[assets/js/space/world-cat.js:7](../../../assets/js/space/world-cat.js) | 自主慢走/观察/停留，营造陪伴 | `animation` / rendered-baseline |
| `S.APP.reader.SUMMARIZE` | 总结这篇文章 | `[data-reader-ask]`<br>[assets/js/space/apps.js:62](../../../assets/js/space/apps.js) | 保持文章上下文进行总结 | `async` / source-only |
| `S.APP.agent.RETRY` | 作为新任务重试 | `[data-agent-retry]`<br>[assets/js/space/agent-panel.js:290](../../../assets/js/space/agent-panel.js) | 失败或中断后显式新任务 | `async` / source-only |
| `S.APP.agent.APPROVE` | 批准执行 | `[data-agent-approve]`<br>[assets/js/space/agent-panel.js:350](../../../assets/js/space/agent-panel.js) | 确认精确笔记文本/命令后执行 | `async` / source-only |
| `S.APP.agent.DECLINE` | 拒绝 | `[data-agent-decline]`<br>[assets/js/space/agent-panel.js:353](../../../assets/js/space/agent-panel.js) | 不执行待确认动作 | `command` / source-only |
| `S.APP.agent.CHIP` | 聊产品/最新写作/某地旅程 | `.bear-agent__chip`<br>[assets/js/space/agent-panel.js:587](../../../assets/js/space/agent-panel.js) | 从真实目录开始任务 | `async` / source-only |
| `S.APP.agent.LINK` | 回答中的文章/产品/照片/地点入口 | `.bear-agent__link`<br>[assets/js/space/agent-panel.js:221](../../../assets/js/space/agent-panel.js) | 从回答打开真实资源 | `nav` / source-only |

### T · Travel

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `T.HERO.EXPLORE` | 探索世界/Polarsteps | `.tw-hero .tw-btn`<br>[layouts/page/travel.html:84](../../../layouts/page/travel.html) | 跳转地图或完整旅程 | `nav` / source-only |
| `T.MAP.PIN` | 世界地图地区点 | `.tw-wm__blip`<br>[layouts/partials/travel-worldmap.html:48](../../../layouts/partials/travel-worldmap.html) | 跳转对应区域游记 | `nav` / source-only |
| `T.MAP.REGION` | 区域游记文章卡 | `.tw-card__title a, .tw-card__cover`<br>[layouts/partials/travel-card.html:75](../../../layouts/partials/travel-card.html) | 打开旅行记录 | `nav` / source-only |
| `T.BOOK.READ` | 书脊/封面 | `.tw-tome__spine`<br>[layouts/page/travel.html:205](../../../layouts/page/travel.html) | 打开书籍 | `nav` / source-only |
| `T.BOOK.ASK` | 和这本书聊聊 | `.tw-tome__ask`<br>[layouts/page/travel.html:222](../../../layouts/page/travel.html) | 打开带书籍上下文的AI | `async` / source-only |
| `T.BOOK.CLOSE` | 关闭书籍AI | `[data-bai-close]`<br>[layouts/page/travel.html:247](../../../layouts/page/travel.html) | 恢复原书位置焦点 | `command` / source-only |
| `T.BOOK.SUGGEST` | 书籍建议/追问 | `.tw-book-ai__chip`<br>[static/js/travel-book-ai.js:173](../../../static/js/travel-book-ai.js) | 启动/延展书籍问题 | `async` / source-only |
| `T.BOOK.INPUT` | 书籍问题 | `.tw-book-ai__input`<br>[layouts/page/travel.html:260](../../../layouts/page/travel.html) | 编写问题 | `input` / source-only |
| `T.BOOK.SEND` | 发送书籍问题/请求中停止（同一按钮） | `.tw-book-ai__send`<br>[layouts/page/travel.html:262](../../../layouts/page/travel.html) | 请求流式解释 | `async` / source-only |
| `T.SOCIAL.QR` | 社交二维码 / 查看ID / 关闭 / 重试 | `.tw-social--qr, [data-qr-close], .tw-qr__details, .tw-qr__retry`<br>[layouts/page/travel.html:326](../../../layouts/page/travel.html) | 联系作者 | `command` / source-only |
| `T.SOCIAL.LINK` | 社交平台链接 | `a.tw-social`<br>[layouts/page/travel.html:316](../../../layouts/page/travel.html) | 打开公开平台 | `nav` / source-only |
| `T.BOOK.RETRY` | 重试书籍问题 | `.tw-book-ai__retry`<br>[static/js/travel-book-ai.js:175](../../../static/js/travel-book-ai.js) | 失败后重试原问题 | `async` / source-only |

### B · About

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `B.HERO.ACTION` | 经历/文章 | `.studio-hero__actions a`<br>[layouts/page/about.html:69](../../../layouts/page/about.html) | 开始了解作者 | `nav` / source-only |
| `B.HERO.CAROUSEL` | 人物照片轮播/命名照片选项 | `[data-hero-carousel], [data-hero-carousel] [data-deck-choice]`<br>[layouts/page/about.html:79](../../../layouts/page/about.html) | 鼠标拖动/左右键/触控选照片 | `command` / source-only |
| `B.STORY.CAROUSEL` | 旅程横向照片/选项/展开文字 | `[data-card-carousel], [data-road-carousel], [data-deck-choice]`<br>[assets/js/about-natural-experience.js:6](../../../assets/js/about-natural-experience.js) | 按节奏看真实旅途 | `command` / source-only |
| `B.IDENTITY.LINKS` | 简历/公开资料/联系/产品 | `.about-studio a`<br>[layouts/page/about.html:564](../../../layouts/page/about.html) | 核验作者身份与经历 | `nav` / source-only |
| `B.INTERVIEW.START` | AI采访主题/返回/关闭 | `[data-telepace-topic], [data-interview-back], [data-interview-close]`<br>[assets/js/about-native-interview.js:327](../../../assets/js/about-native-interview.js) | 进入作者AI采访 | `async` / source-only |
| `B.INTERVIEW.CONSENT` | 同意复选框/开始采访 | `[data-interview-consent], [data-interview-start]`<br>[layouts/page/about.html:457](../../../layouts/page/about.html) | 确认后进入实际采访 | `async` / source-only |
| `B.INTERVIEW.ANSWER` | 采访回答输入 | `[data-interview-answer]`<br>[layouts/page/about.html:484](../../../layouts/page/about.html) | 编写采访回答 | `input` / source-only |
| `B.INTERVIEW.SEND` | 发送采访回答 | `[data-interview-send]`<br>[layouts/page/about.html:485](../../../layouts/page/about.html) | 发送当前回答 | `async` / source-only |
| `B.INTERVIEW.RESTART` | 再来一次 | `[data-interview-restart]`<br>[layouts/page/about.html:502](../../../layouts/page/about.html) | 重新开始采访 | `command` / source-only |
| `B.INTERVIEW.RETRY` | 重试/打开独立采访页 | `[data-interview-retry], [data-interview-fallback]`<br>[layouts/page/about.html:516](../../../layouts/page/about.html) | 失败后恢复或使用外部入口 | `async` / source-only |

### Q · About Quest变体

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `Q.STORY.START` | 进入故事/从头开始/文字版 | `#bqStartBtn, #bqStartRestart, #bqStartSkip`<br>[layouts/page/about-quest.html:336](../../../layouts/page/about-quest.html) | 选择玩故事或直接读文字 | `command` / source-only |
| `Q.STORY.PAUSE` | 暂停/慢走/正常/加速 | `#bqPause, [data-speed]`<br>[layouts/page/about-quest.html:312](../../../layouts/page/about-quest.html) | 控制行走节奏 | `toggle` / source-only |
| `Q.STORY.MOVE` | 方向键/跳跃/触控移动 | `#bq`<br>[layouts/page/about-quest.html:1073](../../../layouts/page/about-quest.html) | 完成叙事旅程 | `command` / source-only |
| `Q.STORY.LEVEL` | 文章关卡块/文章卡 | `.bq-level-block, .bq-level-card`<br>[layouts/page/about-quest.html:268](../../../layouts/page/about-quest.html) | 从剧情进入真实文章 | `command` / source-only |
| `Q.STORY.REPLAY` | 再走一遍/去读文字/跳过 | `#bqReplay, #bqSkip, .bq-clear-read`<br>[layouts/page/about-quest.html:355](../../../layouts/page/about-quest.html) | 重播或离开游戏 | `command` / source-only |

### E · 错误恢复

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `E.404.HOME` | 返回主页/浏览文章/推荐文章 | `.not-found-btn, .not-found-recent a`<br>[layouts/404.html:12](../../../layouts/404.html) | 从失效链接恢复 | `nav` / source-only |

### X · 内容交互组件

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `X.INTERACTIVE.context-budget` | 上下文预算 | `[data-ib-scenario], [data-ib-range], details summary`<br>[layouts/partials/interactive/context-budget.html:35](../../../layouts/partials/interactive/context-budget.html) | 情景切换/预算滑块/参考说明 | `toggle` / source-only |
| `X.INTERACTIVE.agent-loop` | Agent循环 | `[data-ib-scenario], [data-ib-prev], [data-ib-play], [data-ib-next]`<br>[layouts/partials/interactive/agent-loop.html:35](../../../layouts/partials/interactive/agent-loop.html) | 情景切换/前一步/播放暂停/下一步 | `toggle` / source-only |
| `X.INTERACTIVE.effect-recovery` | 副作用恢复 | `[data-ib-scenario], [data-ib-crash], [data-ib-strategy]`<br>[layouts/partials/interactive/effect-recovery.html:49](../../../layouts/partials/interactive/effect-recovery.html) | 故障点单选/恢复策略单选/情景 | `toggle` / source-only |
| `X.INTERACTIVE.flow-bottleneck` | 流动瓶颈 | `[data-ib-scenario], [data-ib-cap], [data-ib-tick], [data-ib-play]`<br>[layouts/partials/interactive/flow-bottleneck.html:57](../../../layouts/partials/interactive/flow-bottleneck.html) | 改各站产能/推进一轮/播放暂停 | `toggle` / source-only |
| `X.INTERACTIVE.gitops-reconcile` | GitOps对账 | `[data-ib-scenario], [data-ib-toggle], [data-ib-sync], [data-ib-rollback]`<br>[layouts/partials/interactive/gitops-reconcile.html:35](../../../layouts/partials/interactive/gitops-reconcile.html) | 自动同步/自愈/prune复选框/同步/回滚 | `toggle` / source-only |
| `X.INTERACTIVE.memory-lineage` | 记忆来源 | `[data-ib-scenario], [data-ib-source]`<br>[layouts/partials/interactive/memory-lineage.html:72](../../../layouts/partials/interactive/memory-lineage.html) | 切换情景/移除与恢复来源 | `toggle` / source-only |
| `X.INTERACTIVE.notification-threshold` | 通知阈值 | `[data-ib-scenario], [data-ib-gain-range], [data-ib-cost-range], [data-ib-prob-range]`<br>[layouts/partials/interactive/notification-threshold.html:35](../../../layouts/partials/interactive/notification-threshold.html) | 收益/打断成本/概率滑块 | `toggle` / source-only |
| `X.INTERACTIVE.reliability-chain` | 可靠性链 | `[data-ib-scenario], [data-ib-recall-range], [data-ib-step-range], [data-ib-steps-range], summary`<br>[layouts/partials/interactive/reliability-chain.html:37](../../../layouts/partials/interactive/reliability-chain.html) | 召回率/单步可靠率/步数/检查点折叠 | `toggle` / source-only |
| `X.INTERACTIVE.session-tree` | 会话树 | `[data-ib-scenario], [data-ib-compaction]`<br>[layouts/partials/interactive/session-tree.html:63](../../../layouts/partials/interactive/session-tree.html) | 情景/压缩开关 | `toggle` / source-only |
| `X.INTERACTIVE.session-scope` | 会话作用域 | `[data-ib-scenario]`<br>[layouts/partials/interactive/session-scope.html:36](../../../layouts/partials/interactive/session-scope.html) | 情景切换后解释路由/隔离 | `toggle` / source-only |
| `X.INTERACTIVE.vector-cosine` | 向量余弦 | `[data-ib-scenario], [data-ib-coord], [data-ib-scale], [data-ib-rot], [data-ib-handle]`<br>[layouts/partials/interactive/vector-cosine.html:45](../../../layouts/partials/interactive/vector-cosine.html) | 坐标数值/模长滑块/正负旋转/拖拽向量 | `toggle` / source-only |
| `X.INTERACTIVE.task-cost` | 任务成本 | `[data-ib-scenario], [data-ib-num]`<br>[layouts/partials/interactive/task-cost.html:34](../../../layouts/partials/interactive/task-cost.html) | 调整模型工具/重试/审查/费率/验收数 | `toggle` / source-only |
| `X.INTERACTIVE.RESET` | 重置图示/参考说明/来源 | `[data-ib-reset], .ib-reference summary, .ib-sources a`<br>[layouts/partials/interactive/figure-head.html:12](../../../layouts/partials/interactive/figure-head.html) | 恢复可复现情景或查看模型边界 | `command` / source-only |
| `X.GALAXY.NODE` | 知识星图节点/中心 | `[data-kg-height] a.kg-chip`<br>[layouts/shortcodes/knowledge-galaxy.html:85](../../../layouts/shortcodes/knowledge-galaxy.html) | 从星图访问真实内容 | `nav` / source-only |
| `X.EMBED.LINKS` | Buy Me a Coffee外部支持组件 | `script[data-name="BMC-Widget"]`<br>[layouts/shortcodes/coffee.html:1](../../../layouts/shortcodes/coffee.html) | 使用作者外部资源 | `nav` / source-only |
| `X.EMBED.CALENDLY` | 预约时间外部浮钮/日历 | `.calendly-badge-widget, .calendly-inline-widget`<br>[layouts/shortcodes/calendly.html:4](../../../layouts/shortcodes/calendly.html) | 选择预约时间；外部确认提交由用户执行 | `async` / source-only |
| `X.EMBED.POLARSTEPS` | 嵌入旅行轨迹 | `.polarsteps-container iframe`<br>[layouts/shortcodes/polarsteps.html:16](../../../layouts/shortcodes/polarsteps.html) | 查看真实旅行路线 | `async` / source-only |
| `X.EMBED.OPENSOURCE` | 开源项目列表链接 | `.opensource-grid a`<br>[layouts/partials/opensource-grid.html:20](../../../layouts/partials/opensource-grid.html) | 查看开源项目或仓库 | `nav` / source-only |

### MOTION · 动画

| 稳定 ID | 可见内容/动作 | 定位与源码 | 用户任务 | 状态/证据 |
| --- | --- | --- | --- | --- |
| `MOTION.BOOT` | 终端光标/真实步骤/揭幕 | `见所属模块`<br>[assets/css/space-cafe.css:147](../../../assets/css/space-cafe.css) | 引导视线、并行首帧等待 | `animation` / rendered-baseline |
| `MOTION.CAMERA` | 进电脑/离开/座位/露台镜头 | `见所属模块`<br>[assets/js/space/world-cafe.js:306](../../../assets/js/space/world-cafe.js) | 空间连续性 | `animation` / source-only |
| `MOTION.CAT` | 小猫步态/尾巴/观察/停留 | `见所属模块`<br>[assets/js/space/world-cat.js:38](../../../assets/js/space/world-cat.js) | 有生命但不打断阅读 | `animation` / source-only |
| `MOTION.WEATHER` | 雨粒/水波 | `见所属模块`<br>[assets/js/space/world-cafe.js:354](../../../assets/js/space/world-cafe.js) | 缓慢环境动势 | `animation` / source-only |
| `MOTION.ENTRY` | 欢迎方块/轨道/窗口入场 | `见所属模块`<br>[assets/js/space/entrance.js:4](../../../assets/js/space/entrance.js) | 欢迎身份表达 | `animation` / source-only |
| `MOTION.DOCK` | Dock hover 提起图标 | `见所属模块`<br>[assets/css/space-classic.css:29](../../../assets/css/space-classic.css) | 指向反馈 | `animation` / source-only |
| `MOTION.WINDOW` | 窗口开关/最小化/拖拽/缩放/并排 | `见所属模块`<br>[assets/js/space/desktop.js:76](../../../assets/js/space/desktop.js) | 响应具体窗口动作 | `animation` / source-only |
| `MOTION.HOMEFIELD` | 首页背景场/球体 | `见所属模块`<br>[assets/js/home-ambient.mjs:3](../../../assets/js/home-ambient.mjs) | 作者首页特色 | `animation` / source-only |
| `MOTION.HOMEBUBBLES` | 头像周围建议气泡 | `见所属模块`<br>[layouts/partials/homepage-daypage.html:471](../../../layouts/partials/homepage-daypage.html) | 邀请提问 | `animation` / source-only |
| `MOTION.HOMEREVEAL` | 首页分区 reveal | `见所属模块`<br>[assets/css/extended/zzz-homepage-reveal.css:2](../../../assets/css/extended/zzz-homepage-reveal.css) | 阅读节奏 | `animation` / source-only |
| `MOTION.MICRO` | 涟漪/悬浮/磁吸/反馈 | `见所属模块`<br>[static/js/micro-interactions.js:7](../../../static/js/micro-interactions.js) | 点击反馈 | `animation` / source-only |
| `MOTION.CARDTILT` | 卡片鼠标倾斜 | `见所属模块`<br>[assets/js/card-tilt.js:2](../../../assets/js/card-tilt.js) | 卡片反馈 | `animation` / source-only |
| `MOTION.COVER` | 封面视差 | `见所属模块`<br>[assets/js/cover-parallax.js:28](../../../assets/js/cover-parallax.js) | 文章封面深度 | `animation` / source-only |
| `MOTION.READPROGRESS` | 文章阅读进度/返回顶环 | `见所属模块`<br>[layouts/partials/footer.html:27](../../../layouts/partials/footer.html) | 阅读位置 | `animation` / source-only |
| `MOTION.WAYFINDER` | 章节索引安静/唤醒 | `见所属模块`<br>[assets/js/page-wayfinder.js:14](../../../assets/js/page-wayfinder.js) | 正文阅读时减弱注意力 | `animation` / source-only |
| `MOTION.LINKPREVIEW` | 链接/脚注预览显隐 | `见所属模块`<br>[static/js/link-preview.js:10](../../../static/js/link-preview.js) | 阅读辅助 | `animation` / source-only |
| `MOTION.TRAVELREVEAL` | 旅行分区 reveal | `见所属模块`<br>[layouts/page/travel.html:61](../../../layouts/page/travel.html) | 旅行阅读节奏 | `animation` / source-only |
| `MOTION.KNOWLEDGE` | Canvas/WebGPU关系场/指针响应 | `见所属模块`<br>[assets/js/bear-knowledge-space.js:90](../../../assets/js/bear-knowledge-space.js) | 真实节点关系环境 | `animation` / source-only |
| `MOTION.ABOUTCAROUSEL` | 照片横向滚动 | `见所属模块`<br>[assets/js/about-natural-experience.js:75](../../../assets/js/about-natural-experience.js) | 用户主动选择照片 | `animation` / source-only |
| `MOTION.QUEST` | 游戏行走/金币/跳跃/爬山/滑索 | `见所属模块`<br>[layouts/page/about-quest.html:672](../../../layouts/page/about-quest.html) | 个人经历的叙事变体 | `animation` / source-only |
| `MOTION.404` | 404漂浮画面 | `见所属模块`<br>[assets/js/three/not-found-float.js:23](../../../assets/js/three/not-found-float.js) | 失效路径恢复 | `animation` / source-only |
| `MOTION.CHATSTREAM` | AI流式文字/运行步骤/停止 | `见所属模块`<br>[static/js/article-chat.js:117](../../../static/js/article-chat.js) | 真实请求进度 | `animation` / source-only |
| `MOTION.INTERACTIVE` | 12类模型图示播放/步骤/响应 | `见所属模块`<br>[assets/js/components/agent-loop.mjs:17](../../../assets/js/components/agent-loop.mjs) | 帮助理解文章的因果 | `animation` / source-only |
| `MOTION.NEWSLETTER` | 订阅熊眼睛追踪/成功反应 | `[data-fsub-bear]`<br>[layouts/partials/footer-subscribe.html:148](../../../layouts/partials/footer-subscribe.html) | 响应指针并表达实际订阅结果 | `animation` / source-only |
| `MOTION.CONTACTQR` | 二维码扫描线/联系卡显隐 | `.wxc-scanline`<br>[layouts/partials/wechat-contact.html:127](../../../layouts/partials/wechat-contact.html) | 帮助识别可扫码内容 | `animation` / source-only |
| `MOTION.FAQ` | FAQ高度展开/AI面板/流式回答 | `.article-faq__item, .article-faq__ai-panel`<br>[static/js/article-faq.js:222](../../../static/js/article-faq.js) | 响应读者展开和追问动作 | `animation` / source-only |

## 实际执行路径

1. Hugo `layouts/_default/baseof.html` → `header.html` → 页面模板 → 非沉浸页 `site-footer.html`/首页 `homepage-footer.html` → `footer.html` → `extend_footer.html`；搜索在非About页面按能力挂载，文章辅助脚本只对 `.IsPage` 挂载。
2. Space `layouts/section/projects.html` → `space/desktop.html` + `space/cafe.html` → `assets/js/space/desktop.js` → `cafe.js` → 动态 world-cafe → 实际 renderer/css frame → onboarding 隐藏；进入电脑把原窗口/Dock/Menu DOM 移入空间屏幕，不复制编辑器。
3. 11应用由 `mountApps`/`render` 路由；photos/map由 `mountMedia`；AI由 `mountAgentPanel` 与 agent-loop/sessions；笔记/会话是浏览器本地状态，外部运行时和相册需要真实连接。
4. Lab 经 desktop `setView` 双向切换，Knowledge 由 `openKnowledge` 动态挂载；Canvas/WebGPU是装饰层，DOM节点保持可键盘访问。
5. 文章 shared single → marginalia/editorial-tools + mobile bottom-sheet → article-chat/selection + share/image/code/footnote/link helper；所有内容 shortcode 实例及12种模型变体在 JSON 中逐文件登记。

## 本轮不能宣称已验证的部分

1. 全站每个按钮达到96分：尚无逐状态测量；本清单只建立可追踪对象和验收条件。
2. 所有外链有效、订阅真实提交、第三方嵌入、真实AI/Immich/本地Docker、语音浏览器权限：未触发外部动作。
3. 动画持续帧率、深色反差、键盘焦点遮挡、虚拟键盘、小屏横屏：需父任务复用一个浏览器逐族验证。
4. About Quest 与旧部分模板的当前公开路由、Hugo条件分支是否渲染：源码候选和用户实际可见必须分开。
5. 墙壁/灯/照片/猫没有独立点击能力；其评价对象是材质、比例、阴影、构图与动势，而非不存在的点击交互。

## 后续旅程队列与A批状态证据

v1.3：A的20个定向check均报告passed，但只对应6个控件族的部分状态。**整个family仍unverified，verified_score=null**。JSON `state_evidence` 给出具体case、尺寸、原文观察与剩余状态；不能把record的passed当最终96分。

| 控件族 | A已记录的具体状态 | 仍未覆盖的关键项 |
| --- | --- | --- |
| `A.BODY.CODECOPY` | loading：zh desktop单请求pending→success，截图可见“正在复制…”；未用真实剪贴板。；error：zh mobile/en desktop拒绝路径显示人工复制说明；截图可见原代码已选中。中文手机说明与展开图标疑似重叠，故视觉恢复仍待复测。；normal：四配置记录真实矩形；mobile44px，desktop31.34px，不把desktop31写成44。 | hover、focus、active、disabled、empty、当前B改动后CSS下的error布局、真实Clipboard权限差异 |
| `G.SUB.EMAIL` | focus：zh/en桌面/手机focused+visible为true；焦点border/shadow有变化，截图已检查。；normal：四配置记录未聚焦border/shadow作为对照。 | hover、active、disabled、loading、error、empty、真实虚拟键盘、订阅请求状态 |
| `S.CAFE.PICKER` | normal：390×844、320×844、568×320右上入口均44×44；该case通过名称与返回检查。截图390显示风景图标。 | hover、focus、active、disabled、loading、error、empty、点击后六景选中/焦点恢复的具体字段未在JSON独立记录、图标可理解性 |
| `S.CAFE.QUIET` | normal：三种尺寸均记录开关前颜色。；active：三种尺寸启用后底色变为rgb(244,238,224)，title明确“已开启，点击恢复环境动效”；390实拍已检查。 | hover、focus、disabled、loading、error、empty、实际cat/weather/GPU暂停、恢复、切语言/刷新持久化 |
| `S.WINDOW.MINIMIZE` | active：按住minimize前后rect完全一致，44.28×44.28，未引入pressed transform位移。 | normal、hover、focus、disabled、loading、error、empty、点击释放后的最小化/恢复/焦点、其他窗口控制按钮 |
| `S.APP.map.PIN` | active：按住pin前后rect完全一致，9.46×9.46。该通过项只证明不位移，不能证明触控命中达标。 | normal、hover、focus、disabled、loading、error、empty、触控有效命中范围、键盘区域选择、与等价地区列表关系 |

A证据绑定 `batch-a-source.json`。与当前源码比较时，`zzz-copy-code-feedback.css` 和 `footer.html` 已后续变化，故复制相关视觉结论仅as-of A；不自动转成B之后通过。A地图截图带正文选择高亮，不作为正常态审美图。

优先顺序建议：**D-05串书 → D-04读流停滞 → D-02关闭搜索 → E-01真实窗口命中 → E-03地图触控 → E-07首页CTA**。每批3–6族，当前B/C范围先等父任务调度，避免重复改同文件。所有服务请求用本地stub，不真实提交订阅、模型、邮件、沙盒。

### D-01 · 首页Bear：输入→等待→关闭/清空→失败重试

**范围**：`H.CHAT.OPEN`, `H.CHAT.INPUT`, `H.CHAT.SEND`, `H.CHAT.CLOSE`, `H.CHAT.CLEAR`, `H.CHAT.RETRY`。P1；candidate-after-current-batches。

**路由**：`/zh/`, `/`。

**定位**：`H.CHAT.OPEN` → `#hp-avatar-btn`；`H.CHAT.INPUT` → `#hp-chat-input`；`H.CHAT.SEND` → `#hp-chat-send`；`H.CHAT.CLOSE` → `#hp-chat-close`；`H.CHAT.CLEAR` → `#hp-chat-clear`；`H.CHAT.RETRY` → `#hp-chat-retry`。

**测试**：头像打开，Tab到输入；空白不能发送；中文IME回车不误提交。 → 填合成问题→发送→持有请求；观察pending、重复点击去重。 → 关闭/清空后释放旧响应，再打开；旧响应不能复活已清对话或抢焦点。 → 503后用原问题重试；一次用户气泡，未污染history；不真实调用模型。。

**最高影响**：首页已有requestSerial取消机制，但仍需证明关闭/清空/重开边界与名称。；不为首页强行复制Space外观；发送/等待/取消语义保持一致。。

### D-02 · 搜索AI：搜索→追问→关闭→迟到响应→重试

**范围**：`G.SEARCH.QUERY`, `G.SEARCH.AI`, `G.SEARCH.FOLLOWUP`, `G.SEARCH.RETRY`, `G.SEARCH.CLOSE`, `G.SEARCH.AICLOSE`。P1；candidate-after-current-batches。

**路由**：`/zh/`, `/`。

**定位**：`G.SEARCH.QUERY` → `.search-palette__input`；`G.SEARCH.AI` → `#search-ai-btn`；`G.SEARCH.FOLLOWUP` → `.search-palette__followup-input, .search-palette__followup-send`；`G.SEARCH.RETRY` → `.search-palette__ai-error .ai-retry-btn`；`G.SEARCH.CLOSE` → `.search-palette__close`；`G.SEARCH.AICLOSE` → `#search-ai-close`。

**测试**：⌘/Ctrl K打开→输入词→AI按钮发问；空值禁用。 → 请求保持pending→关闭AI或整个palette→重新打开普通搜索。 → 释放旧结果，断言旧请求不改新输入、不抢新焦点、不使isAiThinking长期锁住。 → 失败后重试与追问各检查history不重复；Escape回原触发点。。

**最高影响**：search-palette.js:107 closePalette不触及askAI局部controller；source-only竞态候选。；当前未有用户Stop；关闭是否能有效取消需要实际证据。。

### D-03 · 正文AI：引用→发送→停止→重试→追问

**范围**：`A.AI.INPUT`, `A.AI.SEND`, `A.AI.STOP`, `A.AI.RETRY`, `A.AI.CONTEXTCLEAR`, `A.AI.FOLLOWUP`。P1；candidate-after-current-batches。

**路由**：`/zh/growth/posts/2026-07-14-what-remains-when-taken-apart/`, `/growth/posts/2026-07-14-what-remains-when-taken-apart/`。

**定位**：`A.AI.INPUT` → `.rc-ai-textarea, .abs-ai-textarea`；`A.AI.SEND` → `.rc-ai-send, .abs-ai-send`；`A.AI.STOP` → `.article-chat-stop`；`A.AI.RETRY` → `.ai-retry-btn`；`A.AI.CONTEXTCLEAR` → `.article-chat-reference-clear`；`A.AI.FOLLOWUP` → `.article-chat-followup`。

**测试**：输入草稿→选一段正文→AI分析；草稿和引用定位都保留。 → 流式pending点击停止；解锁输入，迟到chunk不追加。 → 重试原问题不重复用户消息、不带失败assistant进history。 → 移除引用只影响上下文；追问仍留在当前文章。。

**最高影响**：移动底部sheet与桌面panel不能产生两套互相污染的状态。。

### D-04 · FAQ AI：折叠→输入→流中停滞→重试

**范围**：`A.FAQ.AI.OPEN`, `A.FAQ.AI.INPUT`, `A.FAQ.AI.SEND`, `A.FAQ.AI.RETRY`, `A.FAQ.AI.CHIP`。P1；candidate-after-current-batches。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`, `/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`A.FAQ.AI.OPEN` → `.article-faq__ai-toggle`；`A.FAQ.AI.INPUT` → `.article-faq__ai-input`；`A.FAQ.AI.SEND` → `.article-faq__ai-send`；`A.FAQ.AI.RETRY` → `.article-faq__ai-retry`；`A.FAQ.AI.CHIP` → `.article-faq__ai-chip`。

**测试**：展开FAQ AI→点建议/输入→发送；只传当前FAQ问答上下文。 → headers后流暂停，检查超时/停止/关闭是否能解除busy。 → 折叠/切到另一FAQ后放出旧响应，检查隐藏线程/新线程和焦点不被影响。 → 503后点击重试，不重复原问题气泡；空值与长度限制有说明。。

**最高影响**：article-faq.js在fetch(headers)后request.cancel清超时，SSE持续停滞时可能永久busy；无Stop/source-only。。

### D-05 · 旅行书籍AI：A书请求→关闭→B书→迟到回答

**范围**：`T.BOOK.ASK`, `T.BOOK.INPUT`, `T.BOOK.SEND`, `T.BOOK.CLOSE`, `T.BOOK.RETRY`, `T.BOOK.SUGGEST`。P1；candidate-after-current-batches。

**路由**：`/zh/travel/`, `/travel/`。

**定位**：`T.BOOK.ASK` → `.tw-tome__ask`；`T.BOOK.INPUT` → `.tw-book-ai__input`；`T.BOOK.SEND` → `.tw-book-ai__send`；`T.BOOK.CLOSE` → `[data-bai-close]`；`T.BOOK.RETRY` → `.tw-book-ai__retry`；`T.BOOK.SUGGEST` → `.tw-book-ai__chip`。

**测试**：打开A书→输入合成问题→发送pending。 → 关闭→打开B书→发送B问题→先释放B再释放A。 → 断言B标题/回答/history只含B；A迟到结果不能污染B或解除B的busy。 → 503重试/空答案/断流分别证明恢复，关闭后回到原书按钮。。

**最高影响**：travel-book-ai.js controller仅在send局部，openForBook重置全局current/history/busy；旧请求跨书写入为高影响P1候选。。

### D-06 · 空间助手：输入→任务→停止/失败→精确批准门

**范围**：`S.APP.agent.INPUT`, `S.APP.agent.SEND`, `S.APP.agent.STOP`, `S.APP.agent.RETRY`, `S.APP.agent.APPROVE`, `S.APP.agent.DECLINE`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。

**定位**：`S.APP.agent.INPUT` → `[data-agent-input]`；`S.APP.agent.SEND` → `[data-agent-send]`；`S.APP.agent.STOP` → `[data-agent-stop]`；`S.APP.agent.RETRY` → `[data-agent-retry]`；`S.APP.agent.APPROVE` → `[data-agent-approve]`；`S.APP.agent.DECLINE` → `[data-agent-decline]`。

**测试**：空值/中文IME/重复发送测试；pending可停止。 → 返回append_note/sandbox_run工具请求，检查可见精确预览，拒绝后无工具执行。 → 停止/切会话后迟到approve不能执行旧动作。 → 失败记录重试明确“作为新任务”，不暗示原失败成功。。

**最高影响**：批准门、取消与任务隔离是功能硬门槛；先于视觉打磨。。

### D-07 · 空间助手会话：新建/历史/检索/草稿/导出

**范围**：`S.APP.agent.NEW`, `S.APP.agent.HISTORY`, `S.APP.agent.SESSIONQUERY`, `S.APP.agent.SESSION`, `S.APP.agent.EXPORT`, `S.APP.agent.CONTEXT`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。

**定位**：`S.APP.agent.NEW` → `[data-agent-new], [data-agent-session-new]`；`S.APP.agent.HISTORY` → `[data-agent-history], [data-agent-history-close]`；`S.APP.agent.SESSIONQUERY` → `[data-agent-session-search]`；`S.APP.agent.SESSION` → `[data-agent-session]`；`S.APP.agent.EXPORT` → `[data-agent-session-export]`；`S.APP.agent.CONTEXT` → `[data-agent-context]`。

**测试**：新会话与旧会话各写未提交草稿。 → 查找/空结果/恢复会话，确定无隐式模型请求。 → 切场景/切语言/重载保留所选会话与草稿。 → 导出Blob只检查合成内容；回到上下文不丢焦点。。

**最高影响**：本轮不以旧会话专项通过外推新的样式/几何。。

### E-01 · 电脑窗口：关闭/最小化/最大化/拖动/缩放/并排

**范围**：`S.WINDOW.CLOSE`, `S.WINDOW.MINIMIZE`, `S.WINDOW.MAXIMIZE`, `S.WINDOW.DRAG`, `S.WINDOW.RESIZE`, `S.WINDOW.ARRANGE`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。

**定位**：`S.WINDOW.CLOSE` → `[data-window-action="close"]`；`S.WINDOW.MINIMIZE` → `[data-window-action="minimize"]`；`S.WINDOW.MAXIMIZE` → `[data-window-action="maximize"]`；`S.WINDOW.DRAG` → `[data-window-drag]`；`S.WINDOW.RESIZE` → `[data-window-resize]`；`S.WINDOW.ARRANGE` → `[data-window-action="arrange"]`。

**测试**：合成笔记作为内容，逐控件hover/focus/pressed截图。 → 关闭/最小化/恢复/最大化后检查原textarea节点与选区、scroll。 → 键盘能完成等价窗口任务；拖动/缩放不让控制器出可视区。 → 用边框层级截图对比活动/背景窗，减少无语义多重描边。。

**最高影响**：A只证明minimize按压不位移；baseline咖啡模式20px DOM不能误作命中验收。。

### E-02 · 笔记/联系/终端：可写内容的输入与恢复

**范围**：`S.APP.notes.EDITOR`, `S.APP.notes.EXPORT`, `S.APP.notes.SANDBOX`, `S.APP.contact.DRAFT`, `S.APP.contact.CHANNEL`, `S.APP.terminal.COMMAND`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/zh/projects/?profile=about`, `/zh/projects/?profile=about`。

**定位**：`S.APP.notes.EDITOR` → `[data-note-editor]`；`S.APP.notes.EXPORT` → `[data-note-export]`；`S.APP.notes.SANDBOX` → `[data-note-sandbox]`；`S.APP.contact.DRAFT` → `[data-message-draft]`；`S.APP.contact.CHANNEL` → `[data-contact-email], [data-contact-github], .space-contact-links a`；`S.APP.terminal.COMMAND` → `[data-terminal-input]`。

**测试**：笔记输入/选区→切换App→返回检查连续性与真实保存反馈。 → 导出验证Blob；沙盒未连接/超时/失败不会显示成功。 → 联系草稿仅构造mailto/GitHub链接，检查URL编码，不点击提交。 → terminal help/未知命令/运行中/失败/历史均可理解，焦点不逃出应用。。

**最高影响**：外部边界文案和失败反馈要解释真实可用性，避免大写眉题挤压内容。。

### E-03 · 相册与地图：选择/空态/错误/等价地区入口

**范围**：`S.APP.photos.FILTER`, `S.APP.photos.SELECT`, `S.APP.photos.RETRY`, `S.APP.map.PIN`, `S.APP.map.REGION`, `S.APP.map.VIEW`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/zh/projects/?profile=about`。

**定位**：`S.APP.photos.FILTER` → `[data-photo-filter]`；`S.APP.photos.SELECT` → `[data-photo-select]`；`S.APP.photos.RETRY` → `[data-image-retry]`；`S.APP.map.PIN` → `[data-map-pin]`；`S.APP.map.REGION` → `[data-place-select]`；`S.APP.map.VIEW` → `[data-map-viewport]`。

**测试**：在手机真实屏幕命中测pin与区域列表；不要只看CSS设定。 → 鼠标点击/Tab Enter/Space/拖动分别选择地区，移动不误触。 → 图片404后重试单张；无地区照片时有可继续的路径。 → 切地区/照片保留清楚的当前位置与返回，边界/卡片不能同权抢注意力。。

**最高影响**：A pin实际box9.46×9.46仅证明按压稳定；触控有效目标未验证。。

### E-04 · 相册与地图：缩放/翻页/连接/增量加载

**范围**：`S.APP.map.ZOOM`, `S.APP.map.RELATED`, `S.APP.photos.NAV`, `S.APP.photos.LOAD`, `S.APP.photos.MORE`, `S.APP.photos.PLACE`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/zh/projects/?profile=about`。

**定位**：`S.APP.map.ZOOM` → `[data-map-zoom], [data-map-fit], [data-map-reset]`；`S.APP.map.RELATED` → `[data-media-open="photos"], [data-media-open="reader"], .sp-media-footer a`；`S.APP.photos.NAV` → `[data-photo-back], [data-photo-prev], [data-photo-next]`；`S.APP.photos.LOAD` → `[data-media-load]`；`S.APP.photos.MORE` → `[data-media-more]`；`S.APP.photos.PLACE` → `[data-media-open="map"]`。

**测试**：Zoom in/out边界不伪禁用，Fit/World意义分明。 → 上一/下一照片键盘可用，Esc回相册原滚动位置。 → 加载/重试/刷新/更多在pending时防重复，不错报已连接。 → 从地点到相册到文章保持对应区域。。

**最高影响**：地图四个操作与相册多个↗需要意图区别，不强行统一为同一种按钮。。

### E-05 · 阅读器：检索→文章→目录/原文/AI

**范围**：`S.APP.reader.QUERY`, `S.APP.reader.FILTER`, `S.APP.reader.ITEM`, `S.APP.reader.NAV`, `S.APP.reader.SUMMARIZE`, `S.APP.reader.EXPLAIN`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。

**定位**：`S.APP.reader.QUERY` → `[data-library-query]`；`S.APP.reader.FILTER` → `[data-library-filter]`；`S.APP.reader.ITEM` → `.space-list-item`；`S.APP.reader.NAV` → `.space-toolbar [data-open="reader"], .space-toolbar a`；`S.APP.reader.SUMMARIZE` → `[data-reader-ask]`；`S.APP.reader.EXPLAIN` → `[data-reader-explain]`。

**测试**：筛选/空收藏/空检索保留下一步。 → 打开文章pending/404时原文入口能恢复。 → 选文解释保留选区；回目录保留搜索和scroll。 → 字号/边框/段宽在3D屏幕内检查；不要照抄桌面大页面卡片。。

**最高影响**：reader会净化交互组件为正文；说明能力边界，不把移除控件当死按钮。。

### E-06 · 产品/书架/设置：内容优先与选择状态

**范围**：`S.APP.products.SELECT`, `S.APP.products.OPEN`, `S.APP.books.READ`, `S.APP.settings.LANG`, `S.APP.settings.THEME`, `S.APP.settings.COLOR`。P1；candidate-after-current-batches。

**路由**：`/zh/projects/?profile=about`, `/zh/projects/?profile=about`, `/zh/projects/?profile=about`。

**定位**：`S.APP.products.SELECT` → `[data-select-product]`；`S.APP.products.OPEN` → `.space-product__links a, .space-product [data-open]`；`S.APP.books.READ` → `.space-book a`；`S.APP.settings.LANG` → `[data-set-language]`；`S.APP.settings.THEME` → `[data-set-theme]`；`S.APP.settings.COLOR` → `[data-set-wallpaper]`。

**测试**：产品侧栏、详情、主外链形成一个明确主动作。 → 书架的书封与阅读链接关系清楚，无假可点区域。 → 设置语言/主题/桌面色分别有可见选中，切换不重建私人笔记节点。 → classic边框/大写眉题/箭头以活动与层级需要为依据逐项取舍。。

**最高影响**：11 App不应套一模一样卡片，但按钮语义/焦点基线需一致。。

### E-07 · 首页：主CTA→频道→产品，标签页连续性

**范围**：`H.HERO.READ`, `H.HERO.PRODUCT`, `H.HERO.ABOUT`, `H.PRODUCT.CARD`, `H.PRODUCT.OPEN`, `H.CHANNEL.MORE`。P1；candidate-after-current-batches。

**路由**：`/zh/`, `/`。

**定位**：`H.HERO.READ` → `.hp-entry-actions a[href="#hp-posts"]`；`H.HERO.PRODUCT` → `.hp-entry-actions a[href*="projects"]`；`H.HERO.ABOUT` → `.hp-hero-cta`；`H.PRODUCT.CARD` → `.hp-product__main`；`H.PRODUCT.OPEN` → `.hp-product__links a`；`H.CHANNEL.MORE` → `#hp-posts-action`。

**测试**：首屏5秒任务：读文章/了解作者/看产品分别找到一个主入口。 → 主卡进入Space产品，打开产品进入外站；用新标签意图判定是否有理由。 → 同页阅读锚点尊重修饰键、历史与目标焦点。 → 与页脚CTA对照，不让重复Space入口同权吸睛。。

**最高影响**：当前首页部分站内Space卡_blank，可能无理由增加标签页；source-only。。

### E-08 · 首页/长文：非用户触发动效与注意力

**范围**：`MOTION.HOMEFIELD`, `MOTION.HOMEBUBBLES`, `MOTION.CARDTILT`, `MOTION.COVER`, `MOTION.HOMEREVEAL`, `MOTION.MICRO`。P2；candidate-after-current-batches。

**路由**：`/zh/`, `/zh/ai-agent/posts/nango-user-defined-mcp-integration/`。

**定位**：`MOTION.HOMEFIELD` → `见所属模块`；`MOTION.HOMEBUBBLES` → `见所属模块`；`MOTION.CARDTILT` → `见所属模块`；`MOTION.COVER` → `见所属模块`；`MOTION.HOMEREVEAL` → `见所属模块`；`MOTION.MICRO` → `见所属模块`。

**测试**：正常/减少动态效果分别看首屏与正文，不把所有动效一刀切。 → 静止阅读/隐藏标签页时检查循环暂停；恢复无闪动。 → hover/pressed不能移动有定位意义的控件。 → 截图/短录屏比较气泡、背景、指示器同时运动是否争夺主任务。。

**最高影响**：有趣不等于持续运动；按frontend-design只保留承担解释/指向任务的动势。。

### E-09 · 可探索图示1：预算/循环/瓶颈/GitOps

**范围**：`X.INTERACTIVE.context-budget`, `X.INTERACTIVE.agent-loop`, `X.INTERACTIVE.flow-bottleneck`, `X.INTERACTIVE.gitops-reconcile`, `X.INTERACTIVE.RESET`。P1；candidate-after-current-batches。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`, `/zh/ai-agent/posts/agent-engineering-the-98-percent-harness/`, `/zh/growth/posts/2026-07-26-bottlenecks-after-ai/`, `/zh/engineering/posts/argo-cd/`。

**定位**：`X.INTERACTIVE.context-budget` → `[data-ib-scenario], [data-ib-range], details summary`；`X.INTERACTIVE.agent-loop` → `[data-ib-scenario], [data-ib-prev], [data-ib-play], [data-ib-next]`；`X.INTERACTIVE.flow-bottleneck` → `[data-ib-scenario], [data-ib-cap], [data-ib-tick], [data-ib-play]`；`X.INTERACTIVE.gitops-reconcile` → `[data-ib-scenario], [data-ib-toggle], [data-ib-sync], [data-ib-rollback]`；`X.INTERACTIVE.RESET` → `[data-ib-reset], .ib-reference summary, .ib-sources a`。

**测试**：滑块/数值/情景/按钮各测键盘与标签。 → 步骤/播放/重置后图表和数字一致，disabled边界有语义。 → 320px light/dark及print参考说明保持可读。 → 减少动态效果保持模型可操作；隐藏/卸载停止计时。。

**最高影响**：共享组件主题覆盖不能破坏独立模型；不为审美改变因果数据。。

### E-10 · 可探索图示2：向量/可靠性/成本/通知阈值

**范围**：`X.INTERACTIVE.vector-cosine`, `X.INTERACTIVE.reliability-chain`, `X.INTERACTIVE.task-cost`, `X.INTERACTIVE.notification-threshold`, `X.INTERACTIVE.RESET`。P1；candidate-after-current-batches。

**路由**：`/zh/ai-agent/posts/vector-database-learning/`, `/zh/ai-agent/posts/trusting-unattended-ai-agent/`, `/zh/ai-agent/posts/open-model-cost-collapse-agent-fleet/`, `/zh/ai-agent/posts/proactive-agent-it-prompts-you/`。

**定位**：`X.INTERACTIVE.vector-cosine` → `[data-ib-scenario], [data-ib-coord], [data-ib-scale], [data-ib-rot], [data-ib-handle]`；`X.INTERACTIVE.reliability-chain` → `[data-ib-scenario], [data-ib-recall-range], [data-ib-step-range], [data-ib-steps-range], summary`；`X.INTERACTIVE.task-cost` → `[data-ib-scenario], [data-ib-num]`；`X.INTERACTIVE.notification-threshold` → `[data-ib-scenario], [data-ib-gain-range], [data-ib-cost-range], [data-ib-prob-range]`；`X.INTERACTIVE.RESET` → `[data-ib-reset], .ib-reference summary, .ib-sources a`。

**测试**：拖拽提供键盘/数值等价操作；坐标/滑块边界和undefined语义准确。 → 改参数不改变周围正文几何、焦点或scroll。 → 320px布局/公式可读，输入边框表达编辑范围。 → 重置返回当前情景默认，读屏公告不随每像素疯狂播报。。

**最高影响**：小滑块/数值输入/数学SVG适用不同控制规则，不能机械加全局44px破布局。。

### E-11 · 可探索图示3：记忆/会话树/作用域/恢复

**范围**：`X.INTERACTIVE.memory-lineage`, `X.INTERACTIVE.session-tree`, `X.INTERACTIVE.session-scope`, `X.INTERACTIVE.effect-recovery`, `X.INTERACTIVE.RESET`。P1；candidate-after-current-batches。

**路由**：`/zh/ai-agent/posts/2026-07-31-forgetting-is-an-ai-system-capability/`, `/zh/ai-agent/posts/agent-system-design-pi/`, `/zh/ai-agent/posts/agent-system-design-openclaw/`, `/zh/ai-agent/posts/agent-system-design-n8n/`, `/zh/projects/langgraph/`。

**定位**：`X.INTERACTIVE.memory-lineage` → `[data-ib-scenario], [data-ib-source]`；`X.INTERACTIVE.session-tree` → `[data-ib-scenario], [data-ib-compaction]`；`X.INTERACTIVE.session-scope` → `[data-ib-scenario]`；`X.INTERACTIVE.effect-recovery` → `[data-ib-scenario], [data-ib-crash], [data-ib-strategy]`；`X.INTERACTIVE.RESET` → `[data-ib-reset], .ib-reference summary, .ib-sources a`。

**测试**：单选/情景/来源移除/压缩开关有明确selected/checked。 → 结果与说明同步，空来源或失败路径无虚假成功。 → Tab与输入焦点稳定；无JS静态解释仍完整。 → 参考资料折叠、打印和复制链路可继续。。

**最高影响**：12个kind至少各取一真实文章，不能以一个组件通过代表整组。。

### R-01 · 剩余G表面逐态覆盖 1

**范围**：`G.NAV.SKIP`, `G.NAV.HOME`, `G.NAV.MENU`, `G.NAV.SEARCH`, `G.NAV.THEME`, `G.NAV.LANG`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.NAV.SKIP` → `.skip-link`；`G.NAV.HOME` → `.logo a`；`G.NAV.MENU` → `#menu a`；`G.NAV.SEARCH` → `[data-search-trigger="nav"]`；`G.NAV.THEME` → `#theme-toggle`；`G.NAV.LANG` → `.lang-switch__item a`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-02 · 剩余G表面逐态覆盖 2

**范围**：`G.NAV.MOBILE`, `G.NAV.ANCHOR`, `G.NAV.TOP`, `G.NAV.WAYFINDER`, `G.SEARCH.RESULT`, `G.SEARCH.SUGGEST`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.NAV.MOBILE` → `.hamburger-menu`；`G.NAV.ANCHOR` → `a[href^="#"]`；`G.NAV.TOP` → `#top-link`；`G.NAV.WAYFINDER` → `[data-page-wayfinder] a`；`G.SEARCH.RESULT` → `.search-palette__result`；`G.SEARCH.SUGGEST` → `.search-palette__ai-suggestion`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-03 · 剩余G表面逐态覆盖 3

**范围**：`G.SEARCH.FULL`, `G.SEARCH.PAGE`, `G.SUB.EMAIL`, `G.SUB.SUBMIT`, `G.SUB.FEED`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.SEARCH.FULL` → `#search-full-link`；`G.SEARCH.PAGE` → `#searchInput`；`G.SUB.EMAIL` → `.fsub-input`；`G.SUB.SUBMIT` → `.fsub-go`；`G.SUB.FEED` → `.fsub-chip`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-04 · 剩余G表面逐态覆盖 4

**范围**：`G.FOOTER.LINKS`, `G.FOOTER.MORE`, `G.CONTACT.QR`, `G.SHARE.ENTRY`, `G.SHARE.DIRECT`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.FOOTER.LINKS` → `.sf-list a, .hp-footer a`；`G.FOOTER.MORE` → `.hp-footer-more summary`；`G.CONTACT.QR` → `[data-contact-platform]`；`G.SHARE.ENTRY` → `[data-share-trigger], .marginalia-share-btn`；`G.SHARE.DIRECT` → `.abs-share-btn, .marginalia-share-btn`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-05 · 剩余G表面逐态覆盖 5

**范围**：`G.SHARE.CLOSE`, `G.SHARE.THEME`, `G.SHARE.MODE`, `G.SHARE.COPYIMAGE`, `G.SHARE.SAVE`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.SHARE.CLOSE` → `.conv-share-close`；`G.SHARE.THEME` → `.conv-share-swatch`；`G.SHARE.MODE` → `.conv-share-mode`；`G.SHARE.COPYIMAGE` → `#csb-copy-img`；`G.SHARE.SAVE` → `#csb-save-img`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-06 · 剩余G表面逐态覆盖 6

**范围**：`G.SHARE.SYSTEM`, `G.SHARE.COPYTEXT`, `G.SHARE.SOURCE`, `G.SEARCH.CONTACT`, `G.CONTACT.CLOSE`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.SHARE.SYSTEM` → `#csb-web-share`；`G.SHARE.COPYTEXT` → `#csb-copy-text, #csb-copy-link`；`G.SHARE.SOURCE` → `#csb-x, #csb-source`；`G.SEARCH.CONTACT` → `.ai-wechat-cta-btn`；`G.CONTACT.CLOSE` → `.wxc-close`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-07 · 剩余G表面逐态覆盖 7

**范围**：`G.CONTACT.COPY`, `G.CONTACT.VIEW`, `G.SHARE.MORE`, `G.SHARE.WEBSHARE`, `G.SHARE.PLATFORMS`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`G.CONTACT.COPY` → `.wxc-copy`；`G.CONTACT.VIEW` → `.wxc-qr, .wxc-visit`；`G.SHARE.MORE` → `#share-more-btn`；`G.SHARE.WEBSHARE` → `#share-webshare-btn`；`G.SHARE.PLATFORMS` → `.share-primary a, .share-secondary a`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-08 · 剩余H表面逐态覆盖 8

**范围**：`H.HERO.SOCIAL`, `H.CHAT.BUBBLE`, `H.CHAT.QUICK`, `H.CHANNEL.TABS`, `H.CHANNEL.PREV`, `H.CHANNEL.NEXT`。P2；backlog-await-parent-selection。

**路由**：`/zh/`。

**定位**：`H.HERO.SOCIAL` → `.hp-social-icon`；`H.CHAT.BUBBLE` → `.hp-bear-bubble`；`H.CHAT.QUICK` → `.hp-bear-chat-quick-btn[data-msg]`；`H.CHANNEL.TABS` → `.hp-rail-tab`；`H.CHANNEL.PREV` → `#hp-rail-prev`；`H.CHANNEL.NEXT` → `#hp-rail-next`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-09 · 剩余H表面逐态覆盖 9

**范围**：`H.CHANNEL.CARD`, `H.BOOK.LINK`, `H.ACTIVITY.STATS`, `H.ACTIVITY.YEAR`, `H.ACTIVITY.DAY`, `H.ACTIVITY.RECENT`。P2；backlog-await-parent-selection。

**路由**：`/zh/`。

**定位**：`H.CHANNEL.CARD` → `.hp-channel-panel a`；`H.BOOK.LINK` → `.hp-book`；`H.ACTIVITY.STATS` → `.hp-travel-stat`；`H.ACTIVITY.YEAR` → `.hp-heatmap-year-tab`；`H.ACTIVITY.DAY` → `.hp-heat-cell.has-posts`；`H.ACTIVITY.RECENT` → `.hp-recent-post-link`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-10 · 剩余L表面逐态覆盖 10

**范围**：`L.FILTER.TOPIC`, `L.FILTER.MORE`, `L.FILTER.TAG`, `L.FILTER.SORT`, `L.FILTER.RESET`, `L.CARD.OPEN`。P2；backlog-await-parent-selection。

**路由**：`/zh/articles/`, `/zh/archives/`, `/zh/columns/`, `/zh/tags/`。

**定位**：`L.FILTER.TOPIC` → `[data-category]`；`L.FILTER.MORE` → `#filter-toggle`；`L.FILTER.TAG` → `[data-tag]`；`L.FILTER.SORT` → `#filter-sort`；`L.FILTER.RESET` → `#filter-clear`；`L.CARD.OPEN` → `.article-card a`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-11 · 剩余L表面逐态覆盖 11

**范围**：`L.CARD.MORE`, `L.CARD.PAGINATION`, `L.TAXONOMY.TAG`, `L.TAXONOMY.COLUMN`, `L.ARCHIVE.YEAR`, `L.ARCHIVE.POST`。P2；backlog-await-parent-selection。

**路由**：`/zh/articles/`, `/zh/archives/`, `/zh/columns/`, `/zh/tags/`。

**定位**：`L.CARD.MORE` → `[data-lm-next]`；`L.CARD.PAGINATION` → `[data-posts-next]`；`L.TAXONOMY.TAG` → `.terms-tags a`；`L.TAXONOMY.COLUMN` → `.column-entry__link`；`L.ARCHIVE.YEAR` → `.archives-year-nav__link`；`L.ARCHIVE.POST` → `.archives-post__link`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-12 · 剩余A表面逐态覆盖 12

**范围**：`A.META.AUTHOR`, `A.META.SOURCE`, `A.TOC.TABS`, `A.TOC.LINK`, `A.TOC.FAB`, `A.TOC.MOBILETABS`。P2；backlog-await-parent-selection。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`A.META.AUTHOR` → `.marginalia-author-card, .marginalia-link, .dialect-link, .marginalia-tag`；`A.META.SOURCE` → `.marginalia-github-btn`；`A.TOC.TABS` → `.rc-tab`；`A.TOC.LINK` → `.toc-side__nav a`；`A.TOC.FAB` → `#article-fab`；`A.TOC.MOBILETABS` → `.abs-tab`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-13 · 剩余A表面逐态覆盖 13

**范围**：`A.TOC.SERIES`, `A.TOC.SERIESMORE`, `A.AI.CHIP`, `A.AI.SHARE`, `A.SELECTION.SHARE`。P2；backlog-await-parent-selection。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`A.TOC.SERIES` → `.rc-series-link, .abs-series-link, .series-nav__title`；`A.TOC.SERIESMORE` → `.series-nav__summary`；`A.AI.CHIP` → `.rc-ai-chip, .abs-ai-chip`；`A.AI.SHARE` → `.rc-ai-share-btn, .abs-ai-share-btn`；`A.SELECTION.SHARE` → `[data-asel-action="share"]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-14 · 剩余A表面逐态覆盖 14

**范围**：`A.SELECTION.AI`, `A.SELECTION.COMMENT`, `A.SELECTION.MORE`, `A.SELECTION.COMMENTDRAWER`, `A.BODY.LINK`。P2；backlog-await-parent-selection。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`A.SELECTION.AI` → `[data-asel-action="ai"]`；`A.SELECTION.COMMENT` → `[data-asel-action="comment"]`；`A.SELECTION.MORE` → `[data-asel-action="more"], [data-asel-action="copy-quote"], [data-asel-action="copy-link"], [data-asel-action="clear"]`；`A.SELECTION.COMMENTDRAWER` → `.asel-comments-close, .asel-comments-copy, .asel-comments-resume`；`A.BODY.LINK` → `.post-content a`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-15 · 剩余A表面逐态覆盖 15

**范围**：`A.BODY.IMAGE`, `A.BODY.CODECOPY`, `A.BODY.CODEEXPAND`, `A.BODY.FAQ`, `A.BODY.NOTES`。P2；backlog-await-parent-selection。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`A.BODY.IMAGE` → `.post-content img.zoomable, .lightbox-close`；`A.BODY.CODECOPY` → `.copy-code`；`A.BODY.CODEEXPAND` → `.code-tool-expand, .code-fs-zoom-in, .code-fs-zoom-out, .code-fs-close`；`A.BODY.FAQ` → `.article-faq__q`；`A.BODY.NOTES` → `.note-block[id]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-16 · 剩余A表面逐态覆盖 16

**范围**：`A.BODY.LINKPREVIEW`, `A.BODY.FOOTNOTEPREVIEW`, `A.FOOTER.NEXT`, `A.BODY.DISCLOSURE`, `A.COMMENTS.EXTERNAL`。P2；backlog-await-parent-selection。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`。

**定位**：`A.BODY.LINKPREVIEW` → `.link-preview`；`A.BODY.FOOTNOTEPREVIEW` → `.footnote-preview`；`A.FOOTER.NEXT` → `.paginav a, .related-posts a, .column-outro a`；`A.BODY.DISCLOSURE` → `.article-disclosure__collapse`；`A.COMMENTS.EXTERNAL` → `#post-comments-body`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-17 · 剩余S表面逐态覆盖 17

**范围**：`S.BOOT.HOME`, `S.BOOT.READ`, `S.BOOT.SKIP`, `S.CAFE.HOME`, `S.CAFE.LANGUAGE`, `S.CAFE.QUIET`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.BOOT.HOME` → `.space-boot__header a`；`S.BOOT.READ` → `.space-boot__footer a`；`S.BOOT.SKIP` → `[data-boot-skip]`；`S.CAFE.HOME` → `.space-cafe__brand`；`S.CAFE.LANGUAGE` → `[data-cafe-language]`；`S.CAFE.QUIET` → `[data-cafe-quiet]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-18 · 剩余S表面逐态覆盖 18

**范围**：`S.CAFE.PICKER`, `S.CAFE.THEME`, `S.CAFE.PICKERCLOSE`, `S.CAFE.SEAT`, `S.CAFE.TERRACE`, `S.CAFE.REPLAY`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.CAFE.PICKER` → `[data-cafe-picker]`；`S.CAFE.THEME` → `[data-cafe-theme]`；`S.CAFE.PICKERCLOSE` → `[data-cafe-picker-close]`；`S.CAFE.SEAT` → `[data-cafe-start]`；`S.CAFE.TERRACE` → `[data-cafe-outside]`；`S.CAFE.REPLAY` → `[data-cafe-replay]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-19 · 剩余S表面逐态覆盖 19

**范围**：`S.CAFE.READ`, `S.CAFE.WORKSPACE`, `S.CAFE.RETURN`, `S.WORLD.LOOK`, `S.WORLD.WALK`, `S.WORLD.COMPUTER`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.CAFE.READ` → `[data-cafe-read]`；`S.CAFE.WORKSPACE` → `[data-cafe-enter]`；`S.CAFE.RETURN` → `[data-cafe-visit]`；`S.WORLD.LOOK` → `.space-world canvas`；`S.WORLD.WALK` → `[data-world-walk]`；`S.WORLD.COMPUTER` → `.space-world canvas raycast monitor/display`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-20 · 剩余S表面逐态覆盖 20

**范围**：`S.MENU.OS`, `S.MENU.HOME`, `S.MENU.LAUNCH`, `S.MENU.SEARCH`, `S.MENU.OVERVIEW`, `S.MENU.ARRANGE`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.MENU.OS` → `[data-space-menu-trigger]`；`S.MENU.HOME` → `[data-space-home]`；`S.MENU.LAUNCH` → `[data-space-launchpad-trigger]`；`S.MENU.SEARCH` → `[data-space-search-trigger]`；`S.MENU.OVERVIEW` → `[data-space-overview-trigger]`；`S.MENU.ARRANGE` → `[data-space-arrange]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-21 · 剩余S表面逐态覆盖 21

**范围**：`S.MENU.DESKTOP`, `S.MENU.LAB`, `S.MENU.BLOG`, `S.DOCK.APP`, `S.WINDOW.OVERVIEWITEM`, `S.SEARCH.QUERY`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.MENU.DESKTOP` → `[data-space-show-desktop]`；`S.MENU.LAB` → `[data-product-view-button="lab"]`；`S.MENU.BLOG` → `.space-menu a`；`S.DOCK.APP` → `.space-dock [data-open]`；`S.WINDOW.OVERVIEWITEM` → `[data-overview-id]`；`S.SEARCH.QUERY` → `[data-space-search-input]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-22 · 剩余S表面逐态覆盖 22

**范围**：`S.SEARCH.RESULT`, `S.SEARCH.EMPTY`, `S.SEARCH.CLOSE`, `S.LAUNCH.QUERY`, `S.LAUNCH.APP`, `S.LAUNCH.CLOSE`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.SEARCH.RESULT` → `[data-search-kind]`；`S.SEARCH.EMPTY` → `[data-space-search-reset]`；`S.SEARCH.CLOSE` → `[data-space-search-close]`；`S.LAUNCH.QUERY` → `[data-space-launchpad-input]`；`S.LAUNCH.APP` → `[data-launchpad-app], [data-space-launchpad-reset]`；`S.LAUNCH.CLOSE` → `[data-space-launchpad-close]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-23 · 剩余S表面逐态覆盖 23

**范围**：`S.APP.welcome.ENTER`, `S.APP.welcome.ROUTES`, `S.APP.welcome.PROFILE`, `S.APP.welcome.LINKS`, `S.APP.reader.FAVORITE`, `S.APP.agent.VOICE`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.APP.welcome.ENTER` → `[data-enter-space]`；`S.APP.welcome.ROUTES` → `.space-welcome [data-open]`；`S.APP.welcome.PROFILE` → `[data-profile-target], .space-profile summary`；`S.APP.welcome.LINKS` → `.space-profile a, .space-profile [data-open]`；`S.APP.reader.FAVORITE` → `[data-reader-favorite]`；`S.APP.agent.VOICE` → `[data-agent-voice]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-24 · 剩余S表面逐态覆盖 24

**范围**：`S.APP.agent.ACTIVITY`, `S.APP.settings.EXPORT`, `S.LAB.SWITCH`, `S.LAB.FEATURE`, `S.LAB.PRODUCT`, `S.LAB.KNOWLEDGE`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.APP.agent.ACTIVITY` → `[data-agent-activity]`；`S.APP.settings.EXPORT` → `[data-space-export]`；`S.LAB.SWITCH` → `.product-view-switch button`；`S.LAB.FEATURE` → `.builds-hero a`；`S.LAB.PRODUCT` → `.build-card a, .builds-feature a`；`S.LAB.KNOWLEDGE` → `[data-bks-enter]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-25 · 剩余S表面逐态覆盖 25

**范围**：`S.KNOWLEDGE.BACK`, `S.KNOWLEDGE.FILTER`, `S.KNOWLEDGE.NODE`, `S.KNOWLEDGE.OPEN`, `S.KNOWLEDGE.RELATED`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.KNOWLEDGE.BACK` → `.bks__back`；`S.KNOWLEDGE.FILTER` → `.bks__filter`；`S.KNOWLEDGE.NODE` → `[data-node-id]`；`S.KNOWLEDGE.OPEN` → `[data-bks-open]`；`S.KNOWLEDGE.RELATED` → `[data-bks-related] a, .bks__browse-writing`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-26 · 剩余S表面逐态覆盖 26

**范围**：`S.OBJECT.WALLS`, `S.OBJECT.FLOOR`, `S.OBJECT.RUG`, `S.OBJECT.TABLE`, `S.OBJECT.CHAIR`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.OBJECT.WALLS` → `Three scene room/outdoors`；`S.OBJECT.FLOOR` → `Three scene room/outdoors`；`S.OBJECT.RUG` → `Three scene room/outdoors`；`S.OBJECT.TABLE` → `Three scene room/outdoors`；`S.OBJECT.CHAIR` → `Three scene room/outdoors`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-27 · 剩余S表面逐态覆盖 27

**范围**：`S.OBJECT.SHELF`, `S.OBJECT.BAR`, `S.OBJECT.DESK`, `S.OBJECT.PHOTO`, `S.OBJECT.LIGHT`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.OBJECT.SHELF` → `Three scene room/outdoors`；`S.OBJECT.BAR` → `Three scene room/outdoors`；`S.OBJECT.DESK` → `Three scene room/outdoors`；`S.OBJECT.PHOTO` → `Three scene room/outdoors`；`S.OBJECT.LIGHT` → `Three scene room/outdoors`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-28 · 剩余S表面逐态覆盖 28

**范围**：`S.OBJECT.PLANT`, `S.OBJECT.SKY`, `S.OBJECT.GARDEN`, `S.OBJECT.TREES`, `S.OBJECT.MOUNTAIN`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.OBJECT.PLANT` → `Three scene room/outdoors`；`S.OBJECT.SKY` → `Three scene room/outdoors`；`S.OBJECT.GARDEN` → `Three scene room/outdoors`；`S.OBJECT.TREES` → `Three scene room/outdoors`；`S.OBJECT.MOUNTAIN` → `Three scene room/outdoors`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-29 · 剩余S表面逐态覆盖 29

**范围**：`S.OBJECT.WATER`, `S.OBJECT.RAIN`, `S.OBJECT.CAT`, `S.APP.agent.CHIP`, `S.APP.agent.LINK`。P2；backlog-await-parent-selection。

**路由**：`/zh/projects/`。

**定位**：`S.OBJECT.WATER` → `Three scene room/outdoors`；`S.OBJECT.RAIN` → `Three scene room/outdoors`；`S.OBJECT.CAT` → `Three cafe resident`；`S.APP.agent.CHIP` → `.bear-agent__chip`；`S.APP.agent.LINK` → `.bear-agent__link`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-30 · 剩余T表面逐态覆盖 30

**范围**：`T.HERO.EXPLORE`, `T.MAP.PIN`, `T.MAP.REGION`, `T.BOOK.READ`, `T.SOCIAL.QR`, `T.SOCIAL.LINK`。P2；backlog-await-parent-selection。

**路由**：`/zh/travel/`。

**定位**：`T.HERO.EXPLORE` → `.tw-hero .tw-btn`；`T.MAP.PIN` → `.tw-wm__blip`；`T.MAP.REGION` → `.tw-card__title a, .tw-card__cover`；`T.BOOK.READ` → `.tw-tome__spine`；`T.SOCIAL.QR` → `.tw-social--qr, [data-qr-close]`；`T.SOCIAL.LINK` → `a.tw-social`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-31 · 剩余B表面逐态覆盖 31

**范围**：`B.HERO.ACTION`, `B.HERO.CAROUSEL`, `B.STORY.CAROUSEL`, `B.IDENTITY.LINKS`, `B.INTERVIEW.START`。P2；backlog-await-parent-selection。

**路由**：`/zh/about/`。

**定位**：`B.HERO.ACTION` → `.studio-hero__actions a`；`B.HERO.CAROUSEL` → `[data-hero-carousel], [data-hero-carousel] [data-deck-choice]`；`B.STORY.CAROUSEL` → `[data-card-carousel], [data-road-carousel], [data-deck-choice]`；`B.IDENTITY.LINKS` → `.about-studio a`；`B.INTERVIEW.START` → `[data-telepace-topic], [data-interview-back], [data-interview-close]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-32 · 剩余B表面逐态覆盖 32

**范围**：`B.INTERVIEW.CONSENT`, `B.INTERVIEW.ANSWER`, `B.INTERVIEW.SEND`, `B.INTERVIEW.RESTART`, `B.INTERVIEW.RETRY`。P2；backlog-await-parent-selection。

**路由**：`/zh/about/`。

**定位**：`B.INTERVIEW.CONSENT` → `[data-interview-consent], [data-interview-start]`；`B.INTERVIEW.ANSWER` → `[data-interview-answer]`；`B.INTERVIEW.SEND` → `[data-interview-send]`；`B.INTERVIEW.RESTART` → `[data-interview-restart]`；`B.INTERVIEW.RETRY` → `[data-interview-retry], [data-interview-fallback]`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-33 · 剩余Q表面逐态覆盖 33

**范围**：`Q.STORY.START`, `Q.STORY.PAUSE`, `Q.STORY.MOVE`, `Q.STORY.LEVEL`, `Q.STORY.REPLAY`。P2；backlog-await-parent-selection。

**路由**：`/zh/about/quest/`。

**定位**：`Q.STORY.START` → `#bqStartBtn, #bqStartRestart, #bqStartSkip`；`Q.STORY.PAUSE` → `#bqPause, [data-speed]`；`Q.STORY.MOVE` → `#bq`；`Q.STORY.LEVEL` → `.bq-level-block, .bq-level-card`；`Q.STORY.REPLAY` → `#bqReplay, #bqSkip, .bq-clear-read`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-34 · 剩余X表面逐态覆盖 34

**范围**：`X.GALAXY.NODE`, `X.EMBED.LINKS`, `X.EMBED.CALENDLY`, `X.EMBED.POLARSTEPS`, `X.EMBED.OPENSOURCE`。P2；backlog-await-parent-selection。

**路由**：`/zh/ai-agent/posts/writing-explorable-articles-with-ai/`。

**定位**：`X.GALAXY.NODE` → `[data-kg-height] a.kg-chip`；`X.EMBED.LINKS` → `script[data-name="BMC-Widget"]`；`X.EMBED.CALENDLY` → `.calendly-badge-widget, .calendly-inline-widget`；`X.EMBED.POLARSTEPS` → `.polarsteps-container iframe`；`X.EMBED.OPENSOURCE` → `.opensource-grid a`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-35 · 剩余MOTION表面逐态覆盖 35

**范围**：`MOTION.BOOT`, `MOTION.CAMERA`, `MOTION.CAT`, `MOTION.WEATHER`, `MOTION.ENTRY`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/projects/`, `/zh/travel/`, `/zh/about/`。

**定位**：`MOTION.BOOT` → `见所属模块`；`MOTION.CAMERA` → `见所属模块`；`MOTION.CAT` → `见所属模块`；`MOTION.WEATHER` → `见所属模块`；`MOTION.ENTRY` → `见所属模块`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-36 · 剩余MOTION表面逐态覆盖 36

**范围**：`MOTION.DOCK`, `MOTION.WINDOW`, `MOTION.READPROGRESS`, `MOTION.WAYFINDER`, `MOTION.LINKPREVIEW`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/projects/`, `/zh/travel/`, `/zh/about/`。

**定位**：`MOTION.DOCK` → `见所属模块`；`MOTION.WINDOW` → `见所属模块`；`MOTION.READPROGRESS` → `见所属模块`；`MOTION.WAYFINDER` → `见所属模块`；`MOTION.LINKPREVIEW` → `见所属模块`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-37 · 剩余MOTION表面逐态覆盖 37

**范围**：`MOTION.TRAVELREVEAL`, `MOTION.KNOWLEDGE`, `MOTION.ABOUTCAROUSEL`, `MOTION.QUEST`, `MOTION.404`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/projects/`, `/zh/travel/`, `/zh/about/`。

**定位**：`MOTION.TRAVELREVEAL` → `见所属模块`；`MOTION.KNOWLEDGE` → `见所属模块`；`MOTION.ABOUTCAROUSEL` → `见所属模块`；`MOTION.QUEST` → `见所属模块`；`MOTION.404` → `见所属模块`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-38 · 剩余MOTION表面逐态覆盖 38

**范围**：`MOTION.CHATSTREAM`, `MOTION.INTERACTIVE`, `MOTION.NEWSLETTER`, `MOTION.CONTACTQR`, `MOTION.FAQ`。P2；backlog-await-parent-selection。

**路由**：`/zh/`, `/zh/projects/`, `/zh/travel/`, `/zh/about/`。

**定位**：`MOTION.CHATSTREAM` → `见所属模块`；`MOTION.INTERACTIVE` → `见所属模块`；`MOTION.NEWSLETTER` → `[data-fsub-bear]`；`MOTION.CONTACTQR` → `.wxc-scanline`；`MOTION.FAQ` → `.article-faq__item, .article-faq__ai-panel`。

**测试**：在代表路由找到实际控件；不存在则记not-rendered并追条件，不删除功能断言。 → 按每项八状态协议验证适用状态，保存精确状态证据。 → 键盘/触控/错误/空态与light/dark中优先暴露的问题再决定实现范围。。

**最高影响**：本队列是待实测覆盖，不表示发现了缺陷；不得为了凑分制造修改。。

### R-39 · 错误页面恢复→首页→搜索

**范围**：`E.404.HOME`、`G.NAV.HOME`、`G.SEARCH.QUERY`。P2；backlog。

**路由**：`/404.html`、`/zh/`、`/`。**定位**：`.not-found-btn, .not-found-recent a`、`.logo a`、`.search-palette__input`。

**测试**：本地404→Tab/Enter返回主页/文章→搜索合成不存在词→空结果→Escape恢复焦点；390px和减少动态效果检查。无外部写入。

**最高影响**：失效路径恢复动作必须清楚，不能依赖装饰动画找到出口。

队列登记 **57批，覆盖309/309项**；队列本身没有任何实现或验收完成含义。无未分配项。第三方内部按钮仍按宿主族登记，待真实加载后补实例。

状态只从实际动作与截图导入，不因源码看似正确或时间推进自动升级。

## v1.4 路由与安全回归校正

前版部分候选队列误写 `?app=...`，真实 `resolveSpaceRoute` 只解析已支持hash与`?profile=about`。已统一校正：进入`/zh/projects/?profile=about`后等待工作区镜头结束，再点OS菜单→所有应用→`[data-launchpad-app="<app>"]`；App是否打开以真实窗口选择器为准。不能把URL上任意query当已进入应用。

Travel/FAQ AI补入不可信链接渲染回归：引号/尖括号不能逃逸为HTML事件属性，脚本型URL不可点击，正常站内/HTTPS链接保持可用。这是独立审查提出的回归条件，盘点Agent没有运行浏览器，不据此标通过。

音乐当前没有播放器实现；“安静模式”暂停环境动态，不能称已静音音乐。该缺项记为`feature_gaps`，不扩大309项盘点数量。历史`blog-ai-inline.js`加载后只寻找`.blog-ai-container`，当前源码找不到挂载容器，保持dormant，不新增可见控件族。

## 下一阶段 Roadmap：先真实可用，再减装饰

本附录从现有57旅程队列提取**18个小批次**，每批3–6项；不新增309项功能数量。源码分析均保持`source_only`，尚未浏览器验收。先完成父任务已确认的P1安全/异步边界；如果执行Agent已修，只补当前源码的回归证据，不重复实现。

优先完成RM-07地图真实命中与RM-12 CTA落点，再按RM-01至RM-18覆盖空间与内容。完整57批仍是兜底覆盖表，不代表要对所有控件制造修改。

### 对真实内容、可点暗示与装饰的逐项判断

| 对象 | 真实内容与能力 | 名称/可点暗示 | 具有品味的合格标准 | 不合格标准 |
| --- | --- | --- | --- | --- |
| 墙壁/梁柱/窗/天花 | 程序构建的想象咖啡馆，不是真实店铺照片。 | 无独立DOM/点击/hover；允许画布拖动，不暗示墙板是菜单。 | 比例、光向、接触阴影一致；墙体退为背景。；桌面/390px/568×320的主任务入口不被梁柱切断。；天空、玻璃、室内光形成清楚远中近层次。 | 给墙面加假控制点、发光描边或无功能箭头。；为了“更真”堆纹理/高光，反而产生摩尔纹、曝光冲突、眩光。 |
| 木地板/地毯/桌椅/杯/书架 | 程序几何与原生生成材质；书脊没有具体书名，不冒充真实书目。 | 均为场景装饰和碰撞环境；书架/咖啡机不应给pointer光标。 | 地板接缝低对比、杯椅落地、地毯无穿模；猫的路径与家具对应。；材质族统一，纸/陶瓷/木头的粗糙度有辨识度。 | 书架伪造会点击的书名却无阅读目标。；地毯纹理/阴影密度比文章入口还强；椅腿穿猫或接触影漂浮。 |
| 三维电脑/真实屏幕/返回路径 | 待机屏幕为程序纹理；进入后移入原窗口/Dock/Menu真实DOM，不是录屏或假截图。 | hitComputer仅命中monitor/display；有打开工作区按钮作键盘/触控等价入口。 | 点击屏幕或按钮抵达同一真实工作区。；原编辑器节点、草稿、选区、滚动不因镜头变化重建。；回咖啡馆/重新进入不残留透明活动层，不抢用户输入焦点。 | 电脑文字像按钮却只有背景贴图、无后续动作。；镜头移动中点击已被禁用却没有反馈；屏幕太小仍声称控件44px。 |
| 桌上相框/旅行照片 | 来自作者已有本地旅行资源06-kumano-480.webp；不是本轮AI占位图。 | 相框当前纯装饰，照片App是独立的真实浏览功能；不能把相框评分成“点击看照片”已实现。 | 保持原始比例和相纸留白，不拉伸；照片加载失败不妨碍进入。；若无点击能力，光标/箭头/动效不暗示可点击；若后来赋予动作，必须真的抵达对应照片并可返回。 | 把真实照片变成过曝小色块或放大变形。；相框不响应却出现pointer/hover浮起，用户反复试点。 |
| 地图/地区/照片关联 | Natural Earth陆地轮廓+已公开旅行地区中心；不是照片GPS，也不是实时位置。 | Places/去过的地方与区域中心含义一致；地图pin和下方列表是等价选择入口。 | 可按Tab/Enter/Space选地区；手机有效hit area可测，列表作为等价入口。；选择后照片/游记区域一致，Fit与World的结果可区分。；明确区域中心语义，避免伪精度。 | 9px视觉圆点被当44px命中通过；为扩命中把相邻地区盖住。；装饰网格比真实地区/照片更突出；标题或预览像按钮却无动作。 |
| Dock/OS菜单/11应用发现 | 真实应用入口；desktop常用7项/mobile5项+OS，11应用完整表在Launchpad。 | Dock中文产品实验室与独立Product Lab有名称歧义候选；app产品目录与营销Lab是两个真实目标。 | 常用入口清楚，全部11项一次OS菜单可达；移动端不为了齐全塞11图标。；活动/运行/助手working是不同状态，不靠一颗模糊点混用。；图标/文字可见且真实矩形合适；菜单关闭回原触发点。 | 把Launchpad存在误当Dock已显示11项。；每个图标常驻强调、悬浮跳动和多重边框同时吸睛；标签太小靠猜图标。 |
| 窗口边框/标题栏/控制按钮 | 真实窗口状态/布局，保存在本浏览器。 | 无文字窗口图标有aria-label；hover/pressed不应改变命中位置。 | 一眼分清活动窗/背景窗/输入焦点；边界只解释层级。；关闭/最小化/恢复保留对应内容；3D变换后也测真实hit box。 | 为简约删掉必需focus ring；为复古叠层加到内容像被牢笼包住。；控件按下缩放导致相邻位置偏移，键盘用户没有等价动作。 |
| 终端引导与工作区shell | 引导步骤绑定实际模块/房间/首帧；应用终端调用真实工作区命令，本地run仅在已连接运行时可用。 | 两个终端外观相似但任务不同：boot等待进入；shell输入help/apps/open/实际run。 | 引导无假百分比/假成功，失败有普通阅读/工作区出口。；shell help与真实可执行列表一致，未知/未连接/失败均明确。；pending实际禁用/可停止语义、恢复输入焦点，不偷偷运行真实命令。 | 把视觉引导的日志当真实沙盒输出。；run未连接却回显exit0；为酷而无限打字延迟已经可用的首帧。 |
| 小猫/环境生命感 | CC BY 3.0骨骼猫+现有idle clip；新增眼睛/步态/路线原生代码，不宣称有睡眠/喂养/宠物AI。 | 猫无点击事件，不应在悬停时暗示可抚摸；安静模式控制环境动态。 | 步幅随位移，转弯/减速/停留可信；脚不漂浮、不穿家具。；quiet/reduced/dialog/workspace/hidden分别停止推进路线；恢复不瞬移。；不同手机构图内猫与主按钮分开，有存在感但不挡任务。 | 猫像会互动却无响应；在阅读时持续晃动/跟鼠标/叫声。；用一段固定循环假装四处游走，位置和腿步不对应。 |
| 音乐/环境音/安静模式 | 当前没有音轨或播放器；这是能力缺项，不是现有控件待打分。 | Quiet当前暂停动态，不等于静音；不能显示播放/音量或假频谱暗示已有音乐。 | 现有功能描述只承诺实际动态暂停。；若父任务后续新增：用户明确启动、真实曲名/来源/授权、播放暂停音量与离开策略可测。 | 自动播放、没有音轨的假播放按钮、把静音与暂停猫混为一谈。 |
| 首页主CTA/产品卡/作者入口 | 真实写作/产品数据；hero探索产品指向Space根入口，根按用户要求默认咖啡；产品卡hash才指定具体产品。 | “探索产品/全部产品”实际先到咖啡存在任务预期差距；部分站内卡_blank没有源码说明理由。 | 标签与抵达内容一致，首屏能区分开始阅读、进入空间、了解作者。；站内路径连续，外站目标有可理解的新标签策略。；真实产品截图/阶段保持诚实，内部使用不冒充公开可用。 | CTA说产品，进去后只见咖啡且找不到作品；同站无理由不断开新标签。；每个标题前都加编号/大写眉题，只为看起来设计过。 |
| 内容筛选/目录/系列/返回路径 | 真实文章及系列归类，不用模拟数据。 | 选项名/计数/当前筛选/排序必须与实际集合一致；原生链接保留Enter/修饰键语义。 | 无结果说明怎样恢复，reset真实清除；按键焦点和滚动位置连续。；TOC/系列对真实标题和章节，不能出现定位错误/焦点藏在固定顶栏后。 | 显示“全部”但实际少一种类型；空结果只一句文艺占位无出口。；数百标签全画强边框，目录每项都做hover位移。 |

Three物件没有独立DOM selector。墙、相框、猫的定位是`.space-world canvas`加具体构建符号/源行，不能编造`[data-wall]`等不存在元素；当前构图下的画布坐标由父任务实拍取证。完整源行/文件SHA256见JSON `roadmap.subject_assessments`。

### 小批验收步骤（全部待父任务运行）

#### RM-01 · 入口真实里程碑与阅读出口

P2 / `source_only`；复用队列：R-17, R-19, R-35。

**路由**：`/zh/projects/`, `/projects/`。**进入**：新context普通根入口；首访/回访/reduced分别覆盖。

**控件/对象**：`S.BOOT.SKIP` → `[data-boot-skip]`（layouts/partials/space/cafe.html:19）；`S.BOOT.READ` → `.space-boot__footer a`（layouts/partials/space/cafe.html:19）；`MOTION.BOOT` → `见所属模块`（assets/css/space-cafe.css:147）；`S.CAFE.READ` → `[data-cafe-read]`（layouts/partials/space/cafe.html:34）；`S.CAFE.WORKSPACE` → `[data-cafe-enter]`（layouts/partials/space/cafe.html:34）。

1. 持有world模块响应，检查只出现真实等待、准备中不能跳黑屏。
2. 释放模块但延迟首帧，skip仍不能伪完成；首帧成功后交接。
3. 在pending直接先读文章，再返回；所有出口可键盘操作。
4. 模块失败/context loss只模拟一次，普通阅读/工作区仍可用；保存对应失败态。

**好**：用户要求的酷终端只承担一段入场；真实可用后不继续阻拦。 **坏**：假百分比/额外固定等待/全局键盘被透明终端吞掉。

#### RM-02 · 墙面与光：空间背景退后

P2 / `source_only`；复用队列：R-26, R-27。

**路由**：`/zh/projects/`, `/projects/`。**进入**：首帧后固定同一camera pose；三种viewport对照。

**控件/对象**：`S.OBJECT.WALLS` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:74）；`S.OBJECT.FLOOR` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:75）；`S.OBJECT.LIGHT` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:155）；`S.OBJECT.RUG` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:86）；`S.OBJECT.TABLE` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:54）；`S.OBJECT.CHAIR` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:61）。

1. 固定室内主视角，1440×900/390×844/568×320各拍上下文。
2. 看梁柱是否切断猫/电脑/CTA，地毯/杯椅是否落地，地板无摩尔纹。
3. 画布拖过墙/桌椅时不出现pointer，不触发无定义动作。
4. 进入工作区阅读1段再返回，背景亮度/边界不可比内容主动作更显眼。

**好**：统一尺度/光向/材质，氛围来自实际家具与窗景。 **坏**：为了更真堆装饰/锐利纹理；每个物件像可点击卡片。

#### RM-03 · 电脑与相框：真实内容的可点界线

P2 / `source_only`；复用队列：R-19, R-27。

**路由**：`/zh/projects/`, `/projects/`。**进入**：3D物体没有DOM selector；使用画布+源码对象，点击坐标必须在当前构图实拍后取。

**控件/对象**：`S.WORLD.COMPUTER` → `.space-world canvas raycast monitor/display`（assets/js/space/world-cafe.js:321）；`S.CAFE.WORKSPACE` → `[data-cafe-enter]`（layouts/partials/space/cafe.html:34）；`S.CAFE.RETURN` → `[data-cafe-visit]`（layouts/partials/space/cafe.html:33）；`S.OBJECT.DESK` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:123）；`S.OBJECT.PHOTO` → `Three scene room/outdoors`（assets/js/space/world-cafe.js:132）。

1. 观察电脑和相框：只有monitor/display命中pointer；相框保持装饰光标。
2. 实体电脑点击与打开工作区按钮抵达同一DOM，键盘也能到。
3. 合成笔记写入→选区→回咖啡→重进，检查原节点/选区/滚动不丢。
4. 让照片asset404，咖啡/工作区仍能进入；有效图保持原比例和身份线索。

**好**：待机是视觉邀请，进入后确为原应用；真实照片不拉伸。 **坏**：贴图电脑假功能、相框假hover、无回程、重建丢草稿。

#### RM-04 · 小猫/安静/六景；音乐保留为缺项

P2 / `source_only`；复用队列：R-18, R-35, R-17, R-29。

**路由**：`/zh/projects/`, `/projects/`。**进入**：不要新增音乐控件；GAP.SPACE.AUDIO只写能力边界。

**控件/对象**：`S.OBJECT.CAT` → `Three cafe resident`（assets/js/space/world-cat.js:7）；`MOTION.CAT` → `见所属模块`（assets/js/space/world-cat.js:38）；`S.CAFE.QUIET` → `[data-cafe-quiet]`（layouts/partials/space/cafe.html:26）；`MOTION.WEATHER` → `见所属模块`（assets/js/space/world-cafe.js:354）；`S.CAFE.THEME` → `[data-cafe-theme]`（assets/js/space/cafe.js:27）；`S.CAFE.PICKER` → `[data-cafe-picker]`（layouts/partials/space/cafe.html:27）。

1. 等猫loaded，观察一轮走→停→转向，不追着按钮打转或穿家具。
2. quiet/reduced/dialog/workspace/hidden各停路线；恢复不瞬移。
3. 切六景后猫/窗景/UI名称/选中保持一致，主任务一直可达。
4. 检查无音频实例/自动播放，安静名称只被解释为当前真实动态行为。

**好**：有生命且能安静，动势服务环境而非奖励机制。 **坏**：无音轨假播放、自动声音、猫挡CTA/跟鼠标抢注意力。

#### RM-05 · Dock/OS/Launchpad的发现与命名

P2 / `source_only`；复用队列：R-22, R-20, R-21。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。

**控件/对象**：`S.DOCK.APP` → `.space-dock [data-open]`（layouts/partials/space/desktop.html:72）；`S.MENU.OS` → `[data-space-menu-trigger]`（layouts/partials/space/desktop.html:70）；`S.MENU.LAUNCH` → `[data-space-launchpad-trigger]`（layouts/partials/space/desktop.html:54）；`S.LAUNCH.APP` → `[data-launchpad-app], [data-space-launchpad-reset]`（assets/js/space/desktop.js:260）；`S.LAUNCH.QUERY` → `[data-space-launchpad-input]`（layouts/partials/space/desktop.html:83）；`S.LAUNCH.CLOSE` → `[data-space-launchpad-close]`（layouts/partials/space/desktop.html:82）。

1. desktop核7个常用App+OS，mobile核5个+OS，不误称11都在Dock。
2. OS→所有应用实际列11项；搜索terminal/地图/不存在词，空态可恢复。
3. 打开products，再切Product Lab，比较两处名称是否误导同一目的地。
4. 逐图标hover/focus/active/running，操作只强调当前目标，关闭弹窗恢复触发焦点。

**好**：常用轻、全集易找；标签负责识别，图标是辅助。 **坏**：6层框/每图标都跳动/每处同名却不同目标。

#### RM-06 · 窗口层级与实际命中

P2 / `source_only`；复用队列：E-01。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。

**控件/对象**：`S.WINDOW.CLOSE` → `[data-window-action="close"]`（assets/js/space/desktop.js:76）；`S.WINDOW.MINIMIZE` → `[data-window-action="minimize"]`（assets/js/space/desktop.js:76）；`S.WINDOW.MAXIMIZE` → `[data-window-action="maximize"]`（assets/js/space/desktop.js:76）；`S.WINDOW.ARRANGE` → `[data-window-action="arrange"]`（assets/js/space/desktop.js:76）；`S.WINDOW.DRAG` → `[data-window-drag]`（assets/js/space/desktop.js:76）；`S.WINDOW.RESIZE` → `[data-window-resize]`（assets/js/space/desktop.js:76）。

1. 同时开notes/reader，背景窗与活动窗/输入焦点各拍一帧。
2. 按住控制器测实际矩形+elementFromPoint，不按未落位镜头采样。
3. 关闭/最小化/恢复/并排/拖缩后保持内容及键盘可达。
4. light/dark/390px比较框层数和对比；只对证据中的噪声作定向处理。

**好**：经典OS可保留，边框表达活动/分组而非装饰比赛。 **坏**：为了清爽删focus ring，或为复古给所有层同强边。

#### RM-07 · 地图区域与故事：真实而不伪精确

P1 / `source_only`；复用队列：E-03, E-04。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。 选择map。

**控件/对象**：`S.APP.map.PIN` → `[data-map-pin]`（assets/js/space/media.js:151）；`S.APP.map.REGION` → `[data-place-select]`（assets/js/space/media.js:155）；`S.APP.map.ZOOM` → `[data-map-zoom], [data-map-fit], [data-map-reset]`（assets/js/space/media.js:155）；`S.APP.map.VIEW` → `[data-map-viewport]`（assets/js/space/media.js:155）；`S.APP.map.RELATED` → `[data-media-open="photos"], [data-media-open="reader"], .sp-media-footer a`（assets/js/space/media.js:155）；`S.APP.photos.PLACE` → `[data-media-open="map"]`（assets/js/space/media.js:127）。

1. 测pin与地区列表真实hit area；相邻点不能被扩圈误选。
2. 键盘选择/平移/Zoom/Fit/World分别核对结果和焦点。
3. 地区→照片→游记保持区域对应；地图注释表明区域中心而非GPS。
4. 空照片/游记时有下一步；删除文字选择高亮后再拍正常视觉图。

**好**：数据有边界、故事有去向、当前地区最清楚。 **坏**：9px图标误写44达标、虚构精确轨迹、网格比内容更强。

#### RM-08 · 相册和公开连接：照片优先

P2 / `source_only`；复用队列：E-03, E-04。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。 选择photos；Immich全部stub。

**控件/对象**：`S.APP.photos.FILTER` → `[data-photo-filter]`（assets/js/space/media.js:127）；`S.APP.photos.SELECT` → `[data-photo-select]`（assets/js/space/media.js:127）；`S.APP.photos.NAV` → `[data-photo-back], [data-photo-prev], [data-photo-next]`（assets/js/space/media.js:127）；`S.APP.photos.RETRY` → `[data-image-retry]`（assets/js/space/media.js:18）；`S.APP.photos.LOAD` → `[data-media-load]`（assets/js/space/media.js:33）；`S.APP.photos.MORE` → `[data-media-more]`（assets/js/space/media.js:34）。

1. 地区筛选和上一/下一/Esc有连续位置。
2. 单图404/重试不重载整个工作区，alt/来源文案清楚。
3. 连接/重试/刷新/更多以真实pending禁重复，空相册不虚构。
4. 照片卡不同时堆索引/大写眉题/多层框争取注意；依据截图评估。

**好**：真实公开照片是主角，连接只是次级能力。 **坏**：静态占位装成照片、连接失败写已连接、公开地区写GPS。

#### RM-09 · 终端与笔记：实际执行边界

P2 / `source_only`；复用队列：E-02, R-24。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。 选择terminal/notes；run与导出均在隔离context。

**控件/对象**：`S.APP.terminal.COMMAND` → `[data-terminal-input]`（assets/js/space/apps.js:146）；`S.APP.notes.SANDBOX` → `[data-note-sandbox]`（assets/js/space/apps.js:115）；`S.APP.notes.EDITOR` → `[data-note-editor]`（assets/js/space/apps.js:115）；`S.APP.notes.EXPORT` → `[data-note-export]`（assets/js/space/apps.js:115）；`S.APP.settings.EXPORT` → `[data-space-export]`（assets/js/space/apps.js:175）。

1. help/apps/未知命令/open notes由真实本地state响应。
2. run只回受控断开/超时/错误stub，禁止实际Docker执行，失败不写exit0。
3. notes合成文本→切场景/语言/窗口→保留；沙盒按钮pending/失败可恢复。
4. 导出Blob核对内容；末尾焦点回可编辑输入，日志不要无限撑长。

**好**：终端等宽字有真实理由，输入/输出区分清楚。 **坏**：假日志/假回执/无连接还显示成功。

#### RM-10 · 11应用内容面：产品/书/身份/联系/设置

P2 / `source_only`；复用队列：E-06, E-02, R-23。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。

**控件/对象**：`S.APP.products.SELECT` → `[data-select-product]`（assets/js/space/apps.js:30）；`S.APP.products.OPEN` → `.space-product__links a, .space-product [data-open]`（assets/js/space/apps.js:30）；`S.APP.books.READ` → `.space-book a`（assets/js/space/apps.js:217）；`S.APP.welcome.PROFILE` → `[data-profile-target], .space-profile summary`（layouts/partials/space/profile.html:10）；`S.APP.contact.CHANNEL` → `[data-contact-email], [data-contact-github], .space-contact-links a`（assets/js/space/apps.js:136）；`S.APP.settings.THEME` → `[data-set-theme]`（assets/js/space/apps.js:175）。

1. 逐App从Launchpad真实进入，确保不是仅看到欢迎窗口。
2. 产品来源/阶段/打开链接真实；书目来自作者数据；身份公共链接可定位。
3. 联系草稿仅构造URL不发送，设置主题保留当前内容。
4. 每页只一个主任务；大写眉题/↗/强框按是否解释层级作判断。

**好**：不同内容有各自布局，但动作词/焦点/状态基线一致。 **坏**：11页同卡片模版、产品开放阶段误导、无功能箭头。

#### RM-11 · 阅读器与文章库：找得到、退得回

P2 / `source_only`；复用队列：E-05, R-23。

**路由**：`/zh/projects/?profile=about`, `/projects/?profile=about`。**进入**：等待worldMode=workspace且worldTravel=false；OS菜单→所有应用→data-launchpad-app指定App，随后验证真实窗口存在。 选择reader；AI全部stub。

**控件/对象**：`S.APP.reader.QUERY` → `[data-library-query]`（assets/js/space/apps.js:37）；`S.APP.reader.FILTER` → `[data-library-filter]`（assets/js/space/apps.js:37）；`S.APP.reader.ITEM` → `.space-list-item`（assets/js/space/apps.js:27）；`S.APP.reader.NAV` → `.space-toolbar [data-open="reader"], .space-toolbar a`（assets/js/space/apps.js:56）；`S.APP.reader.FAVORITE` → `[data-reader-favorite]`（assets/js/space/apps.js:56）；`S.APP.reader.SUMMARIZE` → `[data-reader-ask]`（assets/js/space/apps.js:62）。

1. 检索/类别/收藏空态有恢复路径，当前计数真实。
2. 加载文章/失败直达原文，返回目录恢复query/scroll。
3. 收藏有明确状态，数据存储失败不假装保存。
4. 总结仅针对当前文章，不丢未提交问题；屏幕内部排版可读。

**好**：目录是导航、文章是内容，边界和字号支持阅读。 **坏**：每条文章做大装饰卡、无标题空结果、收藏状态看不出。

#### RM-12 · 首页CTA/同站连续性

P1 / `source_only`；复用队列：E-07。

**路由**：`/zh/`, `/`。**进入**：逐个记录可见名称、href、target、实际抵达标题。

**控件/对象**：`H.HERO.READ` → `.hp-entry-actions a[href="#hp-posts"]`（layouts/partials/homepage-daypage.html:58）；`H.HERO.PRODUCT` → `.hp-entry-actions a[href*="projects"]`（layouts/partials/homepage-daypage.html:59）；`H.HERO.ABOUT` → `.hp-hero-cta`（layouts/partials/homepage-daypage.html:61）；`H.PRODUCT.CARD` → `.hp-product__main`（layouts/partials/homepage-daypage.html:298）；`H.PRODUCT.OPEN` → `.hp-product__links a`（layouts/partials/homepage-daypage.html:314）；`H.CHANNEL.MORE` → `#hp-posts-action`（layouts/partials/homepage-daypage.html:167）。

1. 开始阅读定位写作区并保留hash/键盘语义。
2. 探索产品/全部产品进入后核是否如标签所说看到作品；与默认咖啡需求同时核对。
3. 产品卡具体hash应打开对应产品，外站Open与Source区分。
4. 相同任务的hero/分区/页脚CTA有主次；同站_blank须有可说明理由。

**好**：名称承诺与落点一致，第一眼就明白读文章/看作品/认识作者。 **坏**：重复CTA同权、每点一次新标签、文案与咖啡落点冲突。

#### RM-13 · 首页频道/活动和主题发现

P2 / `source_only`；复用队列：R-08, R-09。

**路由**：`/zh/`, `/`。**进入**：频道/热力图是不同控件语义，分别操作。

**控件/对象**：`H.CHANNEL.TABS` → `.hp-rail-tab`（layouts/partials/homepage-daypage.html:208）；`H.CHANNEL.PREV` → `#hp-rail-prev`（layouts/partials/homepage-daypage.html:224）；`H.CHANNEL.NEXT` → `#hp-rail-next`（layouts/partials/homepage-daypage.html:227）；`H.ACTIVITY.YEAR` → `.hp-heatmap-year-tab`（layouts/partials/homepage-daypage.html:373）；`H.ACTIVITY.DAY` → `.hp-heat-cell.has-posts`（layouts/partials/homepage-daypage.html:979）；`H.ACTIVITY.RECENT` → `.hp-recent-post-link`（layouts/partials/homepage-daypage.html:359）。

1. 频道单次/再次点击含义、左右键/箭头切换与原生路由一致。
2. 热力图只有有文章格才可点，空格/未来日期不伪按钮。
3. 年份选中/日期tooltip/文章链接有键盘路径；小日期格需等价列表。
4. 活动装饰不能比文章标题更难忽略；确认真实数据不是模拟随机点。

**好**：发现文章有趣但快速，控件名称和范围明确。 **坏**：10px热力格伪装手机主导航，无内容格也可聚焦。

#### RM-14 · 内容库筛选与标题入口

P2 / `source_only`；复用队列：R-10。

**路由**：`/zh/articles/`, `/articles/`。**进入**：内容只读，结果使用实际静态索引。

**控件/对象**：`L.FILTER.TOPIC` → `[data-category]`（layouts/section/articles.html:76）；`L.FILTER.MORE` → `#filter-toggle`（layouts/section/articles.html:98）；`L.FILTER.TAG` → `[data-tag]`（layouts/section/articles.html:114）；`L.FILTER.SORT` → `#filter-sort`（layouts/section/articles.html:127）；`L.FILTER.RESET` → `#filter-clear`（layouts/section/articles.html:132）；`L.CARD.OPEN` → `.article-card a`（layouts/partials/articles/card.html:16）。

1. 类别/标签/排序组合后结果和计数一致。
2. 更多展开有aria/inert/focus，收起不留不可见焦点。
3. 无结果→清除筛选可恢复，语言/后退/重载条件连续。
4. 把未选chip、已选chip、真实文章标题的注意力层级分开。

**好**：强调正在筛什么，标题比过滤框更有阅读吸引力。 **坏**：边框墙/每项hover上浮，筛选后标题点击区被覆盖。

#### RM-15 · 全局导航：内容入口不争夺阅读

P2 / `source_only`；复用队列：R-01, R-02。

**路由**：`/zh/`, `/zh/ai-agent/posts/context-engineering-the-new-foundation/`。**进入**：先核当前B/C已有证据，避免重复改父批次范围。

**控件/对象**：`G.NAV.SKIP` → `.skip-link`（layouts/partials/header.html:42）；`G.NAV.MENU` → `#menu a`（layouts/partials/header.html:80）；`G.NAV.MOBILE` → `.hamburger-menu`（layouts/partials/header.html:226）；`G.NAV.SEARCH` → `[data-search-trigger="nav"]`（layouts/partials/header.html:146）；`G.NAV.THEME` → `#theme-toggle`（layouts/partials/header.html:166）；`G.NAV.LANG` → `.lang-switch__item a`（layouts/partials/header.html:193）。

1. Tab从skip走到菜单/搜索/主题/语言，Enter与Space按原生角色。
2. 手机菜单Escape/外点关闭，焦点回触发按钮，不遮文章起点。
3. 切译文保留相应内容目标；无译文退路明白。
4. 暗色/窄屏检查真实命中/标签/分隔，不把所有项目做胶囊。

**好**：导航安静可见，当前分区与当前语言有单一明确信号。 **坏**：弱焦点/点击图标猜功能/主题控件比文章标题更抢眼。

#### RM-16 · 文章辅助工具：只在需要时出现

P2 / `source_only`；复用队列：R-12, R-13。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`, `/zh/ai-agent/posts/agent-system-design-n8n/`。**进入**：复用现有tab/TOC测试；只补未覆盖状态。

**控件/对象**：`A.TOC.TABS` → `.rc-tab`（layouts/partials/article/editorial-tools.html:26）；`A.TOC.LINK` → `.toc-side__nav a`（layouts/partials/article/editorial-tools.html:73）；`A.TOC.FAB` → `#article-fab`（layouts/_default/single.html:228）；`A.TOC.MOBILETABS` → `.abs-tab`（layouts/_default/single.html:244）；`A.TOC.SERIES` → `.rc-series-link, .abs-series-link, .series-nav__title`（layouts/partials/article/series-nav.html:54）；`A.TOC.SERIESMORE` → `.series-nav__summary`（layouts/partials/article/series-nav.html:46）。

1. 桌面tab和手机sheet键盘/ARIA关联真实；默认目录不把每一项都强调。
2. 点击标题定位准确且固定header不遮住，reduced下无强制动效。
3. 系列中当前章不能伪可点，下一篇/全集路径清楚。
4. 关闭sheet回原焦点，阅读scroll不漂移。

**好**：工具解释文章结构，不建立第二个内容竞争区。 **坏**：工具条持续晃动/层层描边、目录点后正文不在视野。

#### RM-17 · Product Lab/Knowledge内容关系

P2 / `source_only`；复用队列：R-24, R-25。

**路由**：`/zh/projects/#product-lab`, `/zh/projects/#knowledge`。**进入**：只按实际支持hash进入，不用未实现query。

**控件/对象**：`S.LAB.SWITCH` → `.product-view-switch button`（layouts/section/projects.html:122）；`S.LAB.PRODUCT` → `.build-card a, .builds-feature a`（layouts/section/projects.html:286）；`S.LAB.KNOWLEDGE` → `[data-bks-enter]`（layouts/section/projects.html:196）；`S.KNOWLEDGE.FILTER` → `.bks__filter`（assets/js/bear-knowledge-space.js:615）；`S.KNOWLEDGE.NODE` → `[data-node-id]`（assets/js/bear-knowledge-space.js:704）；`S.KNOWLEDGE.OPEN` → `[data-bks-open]`（assets/js/bear-knowledge-space.js:657）。

1. CUBXXW OS/Lab双向切换有当前位置，私人内容不重建。
2. 产品截图/阶段/链接真实；知识节点显示对应真实文章/项目。
3. 全部/产品/写作/系列的名称与集合一致，Tab/Enter路径完整。
4. Canvas/WebGPU失败也有DOM节点，场景不把正文滚动劫持。

**好**：关系帮助发现内容，图形只是解释层而非烟花。 **坏**：“全部”其实只产品、空节点/假关系、装饰线比节点更强。

#### RM-18 · 特殊图示：少量代表不能替代全部变体

P2 / `source_only`；复用队列：E-09, E-10。

**路由**：`/zh/ai-agent/posts/context-engineering-the-new-foundation/`, `/zh/growth/posts/2026-07-26-bottlenecks-after-ai/`, `/zh/engineering/posts/argo-cd/`, `/zh/ai-agent/posts/vector-database-learning/`。**进入**：12kind继续按E-09/10/11逐一覆盖，此批只列高复用代表。

**控件/对象**：`X.INTERACTIVE.context-budget` → `[data-ib-scenario], [data-ib-range], details summary`（layouts/partials/interactive/context-budget.html:35）；`X.INTERACTIVE.agent-loop` → `[data-ib-scenario], [data-ib-prev], [data-ib-play], [data-ib-next]`（layouts/partials/interactive/agent-loop.html:35）；`X.INTERACTIVE.flow-bottleneck` → `[data-ib-scenario], [data-ib-cap], [data-ib-tick], [data-ib-play]`（layouts/partials/interactive/flow-bottleneck.html:57）；`X.INTERACTIVE.gitops-reconcile` → `[data-ib-scenario], [data-ib-toggle], [data-ib-sync], [data-ib-rollback]`（layouts/partials/interactive/gitops-reconcile.html:35）；`X.INTERACTIVE.vector-cosine` → `[data-ib-scenario], [data-ib-coord], [data-ib-scale], [data-ib-rot], [data-ib-handle]`（layouts/partials/interactive/vector-cosine.html:45）；`X.INTERACTIVE.RESET` → `[data-ib-reset], .ib-reference summary, .ib-sources a`（layouts/partials/interactive/figure-head.html:12）。

1. 每个kind实际打开文章，不能用一个shared单测覆盖所有变体。
2. 参数/步骤/selected/disabled/重置与可见模型结果一致。
3. 320px、light/dark、减少动态、print保持可解释。
4. 控件框表达可改参数，装饰图不暗示不存在的点击行为。

**好**：好看用于理解因果；公式和真实数据不能为视觉任意改。 **坏**：全局44px/动画规则机械盖掉专业控件，图形漂亮但结果不同步。

### 保留的未实现边界

- 音乐没有当前播放器/音轨，不能凭“安静模式”冒称有音乐静音；如父任务决定新增，必须独立验收用户启动、真实授权曲目、播放/暂停/音量/离开策略。
- 相框/墙壁/书架/咖啡机/猫目前不是可点按钮，评价材质、尺度、注意力与暗示一致；不能为了让每个物件“活”而加假hover。
- `blog-ai-inline.js`只有历史源码，没有当前挂载container，保持dormant，安全回归与“可见入口验收”分开。

本附录只给可操作验收与设计标准。没有新增浏览器结论，没有把主观品味写成96分。

## v1.6 状态证据导入：D2b、D3与窗口探索

导入时点 **2026-10-16T01:26:06+08:00**，当前checkout **`a8e4120bb054`**。导入5个指定JSON，共27条check报告passed；它们仅作为case/状态证据。**309族仍无整族验收升级，verified_score=null**。真实新停止控件`#search-ai-stop`归入既有AI请求族，选择器级ID总数现为357。

| Freeze | 时间（上海） | 源revision上下文 | 当前继承边界 |
| --- | --- | --- | --- |
| batch-d2b-source.json | 2026-10-16T01:11:58.685295+08:00 | base `6d7b9fe92a74` + manifest文件SHA256 | 当前已变化：assets/css/extended/micro-interactions.css, assets/css/extended/zzz-copy-code-feedback.css, assets/css/extended/zzz-travel-world.css, layouts/page/travel.html, layouts/partials/footer.html, static/js/code-copy.js, static/js/code-mobile.js, static/js/micro-interactions.js, static/js/travel-book-ai.js |
| batch-d3-source.json | 2026-10-16T01:18:23.225380+08:00 | base `a8e4120bb054` + manifest文件SHA256 | 列出文件当前相同；仍不外推完整构建/全局依赖 |

D1原执行仅保留索引`evidence/batch-d1-flows.log`。五个仍以D1命名的请求case已在**D2b**重新运行，当前依据`batch-d2b-request-checks.json`；不拿旧D1截图认证已经改变的dialog。

| 对应功能 | 只可证明的状态/边界 | 不能外推 |
| --- | --- | --- | --- |
| Travel书籍AI | D2b：停止保留问题、A书关闭切B书隔离、390px双Escape与快速重开在两种motion通过 | D4改变dialog后的横屏/最新视觉、英语/其他主题、所有追问状态 |
| FAQ AI | D2b：外层关闭取消请求、SSE停止恢复输入 | 所有超时/失败/空态、运行时减少动态正确 |
| 搜索AI | D2b：关闭取消清理、完成不抢用户当前焦点 | 新Stop点击未在这批case单测；具体完成时focus target未记录 |
| 分享复制/关闭 | D2b：关闭后Clipboard迟到拒绝不复活modal | 回执未区分copy text/link发起selector，不把两者都写完整通过 |
| 代码复制/展开 | D3四个中英/320与390/light与dark交叉配置：错误说明与工具分离、展开44px且可点击、错误后仍能全屏 | 其他尺寸/主题组合与hover/focus、真实Clipboard权限 |
| 文章动效 | D3：390px no-preference文章18处正文可读；主题按钮无全局ripple | 首页reveal、全部动画/性能；回执缺失字段不补猜 |
| Space窗口/笔记 | D2b：1440/390×900最小化恢复同DOM、最大化恢复、关闭重开文本保留 | 关闭保同DOM、11App全部内容、所有窗口几何均达标 |

窗口/地图geometry全部保留为**observation-not-pass**：desktop窗口约22.96px、mobile约44.28px；mobile地图pin约8.3px；desktop部分map hit=false。hit/visible/尺寸原值不是自动通过，也不未经排查直接认定功能失败。

**负证据不能变通过**：`NEXT.faq-runtime-reduce`记录运行时改变减少动态仍有height动画running，已绑定`MOTION.FAQ`为D3已复现问题。

**D4仍待验收**：Travel横屏没有导入通过。首页产品入口的`#studio-products`与站内target、Dock中文“产品”已经源码调整，只标`source_fixed_pending`；旧图不认证最新源码。Roadmap之前的对应诊断保留为历史观察。

每个state_evidence含对应family/control ID、case route/viewport/theme/motion、freeze时间/base revision、具体依赖SHA256与当前比较。未被manifest列出的未改依赖按base blob追踪并标明fallback；不声称所有构建依赖都已穷尽。

回执元数据注意：`batch-d2b-request-checks.json`的legacy limits仍写Frozen D1，但每个case的source、revalidatedAt与note明确D2b重跑。本清单按该明确重跑记录绑定D2b，同时保留原文本矛盾提示；没有把旧D1图当最新图。


## v1.7 E5/E51/E52：逐状态证据与仍开放的探针

导入时点 **2026-10-16T02:15:38+08:00**，checkout **`77bf94c27a64`**。仍为 **309 族 / 357 个 selector ID / 57 个旅程队列**，完整功能族验收数 **0**，完整分数继续 `null`。没有启动浏览器、构建或外部提交；只读取正式回执、合同源码与现有 PNG。既有八状态在未测尺寸/实例/条件下继续未证实。

| Freeze | 上海时间 | manifest 文件数 | 本次身份边界 |
| --- | --- | --- | --- |
| batch-e5-source.json | 2026-10-16T01:38:10.850283+08:00 | 4 | 有后续变更：assets/css/space-cafe.css, assets/css/space-media.css |
| batch-e51-source.json | 2026-10-16T01:49:04.857976+08:00 | 6 | 有后续变更：assets/css/space-cafe.css, assets/css/space-media.css, tests/e2e/faq-motion-contracts.spec.ts |
| batch-e52-source.json | 2026-10-16T01:54:48.601670+08:00 | 9 | 列出文件当前hash相同；全局依赖仍受限 |

三次 freeze 的 base 都是 `94e644e50bc4`，具体变更按 manifest SHA256；E52 独立审查闭环与本地 `77bf94c2`仅作交付上下文，不增加视觉状态。每条新 `state_evidence` 都带具体 family/control ID、receipt SHA256、route/尺寸条件（回执缺失则不猜）、冻结源身份与当前比较。manifest 未列出的已知依赖另标 Git blob fallback，不声称构建闭包完整。

| 证据 | 已证明的具体范围 | 仍未证明 |
| --- | --- | --- |
| E5 5 reading 合同，E52 重跑同5项 | 笔记实际字≥16、同editor DOM/原值/继续输入；DLV真实文章首段≥16、无横向溢出；本地terminal help与投影字≥14.5；map控件实际click；OS菜单回café保留notes；1440 dark plane变化 | 全部toolbar/侧栏小字、所有文章、11App、真实sandbox、hover/focus/错误全矩阵 |
| WebGL fallback 合同 | 无WebGL时无spatial plane，notes16/terminal12的未缩放基线保留 | 不能把WebGL terminal≥14.5冒称fallback字也≥14.5；context loss等其他失败未测 |
| E52 4 boundary合同 / 4实际旅程 / 8图 | 568×320中英、620×844中文、844×390中文coarse，notes窗口4控中心hit且≥44.27，实际关闭移除窗口并仍desktop；map4控实际几何 | minimize/maximize/arrange操作结果不因hit而通过；11App关闭及dirty态未测 |
| E52 3个短高HUD链 | 568中英、844 coarse的44×44、图标/名称、picker→Escape焦点恢复、返回咖啡→再入同editor DOM | 620未记录HUD点击；不认证全部场景切换/所有picker实例 |
| E52 map真实点击 | 620/coarse合同逐个scroll/click/无横向溢出；中文568也有reading合同；四实际旅程均有map geometry/hit | 英文568回执没有独立map动作字段，不凭其正常图补成点击通过；pin/区域选择另验 |
| E52 FAQ 2合同 | runtime reduce中断opening/closing后到正确details/class终态，height/overflow清空、0动画；1440×900中文panel hidden/noBox、不能focus、主题焦点不抢、显式重开聚焦、外层关闭abort与草稿恢复 | 真实AI、Stop点击、所有error/retry、全部FAQ/尺寸/浏览器、全站动效未测 |

**图片尺寸与合同尺寸分别登记。** PNG IHDR实际为：E5 desktop1440×900；390图为390×900；320图为320×844；568图为568×320。reading合同则320×844、390×844、568×320、1440×900。E5共10图（另含dark notes/reader），E52共8图；不能把390×900图当390×844合同截图。本清单本轮只独立查看 E52 notes568zh、map620zh、Space products390top、books390top 四张，其他图登记为导入证据并不冒称逐张亲看。

**失败历史保持失败。** E51回执是1通过/1失败，第二条 `.article-faq__ai-panel[hidden]`持续visible，不能写成2通过。E5短高close误回咖啡、620窄目标和E51coarse26.24px/hit截获也保留负记录；只在E52相应窗口/尺寸/动作链上标“后续有界关闭”。D3 runtime reduce负记录同样保留。E52的11合同含重跑5个reading，不累加成16个不同任务验收。

**搜索分类修正。** `G.SEARCH.AI`现在是async：`#search-ai-btn`→`askAI(input.value)`，pending时`#search-ai-stop`取消；不能要求aria-pressed，也不能把loading/error记N/A。既有D2b完成焦点检查只关联启动按钮，Stop点击不继承该回执。

### 当前仍开放的具体问题

| ID / 控件族 | 冻结事实 | 下一轮仍需要的有界验收 |
| --- | --- | --- |
| UX-024 / `S.WINDOW.ARRANGE`（相关窗口恢复入口另保留） | 844×390coarse三窗并排后welcome/map同列重叠，welcome4控制中心被盖；`state.mjs:65–72`排2行再被`fitRect:9–10`最低高抬升、y压缩；`desktop.js:159`当前仅按width≤640选overview | 真实整理后每窗有明确可选择的恢复入口，3/4窗短高与普通桌面能容纳平铺分别验；不把普通前后窗遮挡误判失败 |
| UX-025 / `H.CHAT.INPUT/CLOSE/OPEN` | `77bf94c2`首页预览未发送草稿close/open变空 | 原问题保留、焦点/DOM连续性按实际产品合同验 |
| UX-026 / `H.CHAT.INPUT/SEND` | 合成isComposing Enter触发1次fetch桩 | composition guard及真实OS中文候选确认单独验；没有OS实测不认证IME |
| UX-027 / `H.CHAT.INPUT/SEND/CLOSE/RETRY` | 虚拟35秒仍busy、inputDisabled、Stop数量0；关闭后abort=1 | 就地停止/时限、原问题恢复与错误重试；关闭可退出已知，不能说完全无法取消 |

首页探针缺viewport/locale字段，本清单未补猜；current E6首页源码正在实现而未构建，新布局与运输状态不能由旧预览证据继承。

### 四App正常呈现与首页概念边界

`space-app-families.json`为products/books/contact/settings共8个scope、16张top/bottom图：1440×900和390×844，zh/light/reduce/maximized、API503隔离。已逐族绑定normal外观/文字几何，**没有认证选择、外链、联系发送、偏好切换或导出动作**。现有309族不增加。products手机正文狭窄/目录细、books摘要与阅读入口细、contact主要渠道触控和提示层级、settings能力状态字细，作为下一有界排版/命中批；评价以内容可读、真实动作易找、边框只表达分组/选择为标准，不靠多一层卡片/更多动画补“品味”。

`homepage-directions.json`中的A/B为临时DOM/CSS概念。父任务与评分Agent相对比较选择A1“公开实践笔记”为小幅条件胜者，B1“先认识作者”保留挑战者；不能将其作为实际首页功能验收，也没有绝对96认证。E6当前源改动尚未构建，图片仍指旧base。真实文章、旅行书、产品、社交入口与默认café意图继续由既有roadmap逐项验收。

本轮新增 **90** 条有界状态记录，触及 **30** 个既有族（含历史失败和normal观察）；当前有状态证据 **46** 族。此计数表达清单覆盖，不能当合格率。


## v1.8 E61短屏与连续性：只关闭具体范围

导入时间 **2026-10-16T02:41:07+08:00**，checkout `77bf94c27a64`。盘点仍为 **309族、57旅程**；新增真实原生文章入口 `.hp-reading-start__link`，归原有 `H.HERO.READ`，selector级总数为 **358**。原 `.hp-entry-actions a[href="#hp-posts"]` 继续存在；新入口有独立Control ID `H.HERO.READ.control.ff1fe2`，不继承原按钮的通过记录。

`layouts/partials/homepage-reading-start.html:4` 的一个原生anchor包含time/title/description及“读这篇文章”，href为真实文章URL。E6原20条正式日志里中英两条无JS合同已分别实际click并核对抵达URL/文章标题；本轮只把这两条精准绑定给新anchor。E6旧freeze为 `2026-10-16T02:12:13.486802+08:00`、7文件；E61为 `2026-10-16T02:29:48.071870+08:00`、9文件及独立QA配置hash，二者都以base `77bf94c2`和各自manifest文件SHA256定位，不能跨版本继承新布局图。

| E61证据 | 精确状态范围 | 不代表 |
| --- | --- | --- |
| 6 short/normal合同 | 4条568×320/256中英：input/send/close至少44、位于header下/屏内、centerhit；末条真实建议可滚入坐标click、24段回答与Home/End滚动；2条390/1440×900中文正常会话保持wrapper display:contents与原尺寸 | 未发送draft、IME、Stop/时限、所有错误重试；normal desktop仍保留原34px send，不谎称此处全44 |
| 5实际坐标旅程 / 5短屏图 | 568×320/256中英、844×390英文coarse，light/reduce；input/send/close真实44+hit，coordinate close移除panel，opener获焦点；重开Escape回opener | actual JSON没有发送/API动作，不把几何/正常图当发送功能通过 |
| 3 continuity合同 | 1440×900默认冻结QA：close/clear隔离迟到回复；实际click开始阅读转posts focus后完成不抢；合成persisted pagehide/pageshow恢复composer/隔离旧delta | wheel-only离开意图；原生BFCache命中；真实OS键盘 |
| 真实Metal ambient / 3张附图 | hero可信意图+3秒无renderer，Bear可见后两个420canvas；reduce销毁/restore重挂，pageErrors空 | FPS/INP/实体设备/hidden零帧；材质normal仍为reviewer有界85，待E62，完整分继续null |

E61共 **8图**（5短屏+normal动态/减少动态对比2图+posts neutral1图），尺寸来自PNG IHDR，图不是额外通过合同。`#hp-chat-scroll`为新增键盘滚动辅助surface：max-height420时tabIndex=0，正常高度移除tabindex并display:contents；在现有聊天/建议任务下登记，不算新按钮或新族。

**UX030仅在上述568中英/844英文coarse的light/reduce路径关闭。** UX025草稿、UX026合成IME误发送、UX027挂起缺就地Stop与时限继续open，不能用短屏布局合同关闭。Space的UX024三窗并排、UX028重要文本物理字号、UX029主anchor触控仍开放；E61首页并未处理它们。

### UX031已经实测复现：滚轮阅读意图被晚回复覆盖

`home-wheel-intent-probe.json`冻结E61、568×320英文reduce，真实wheel620px从chat到Books，DOM focus仍chatsection；受控晚JSON完成后input获焦点，scrollY从 **2803回2183（-620px）**。两张实际图分别是Books阅读中与被拉回composer，不是normal成功图。源路径为 `renderChat → layoutChat(focusInput || hadChatFocus) → revealShortChat → window.scrollTo`，以旧DOM焦点推断对话意图会忽略刚发生的滚动。已绑定 `H.CHAT.INPUT/SEND` 的focus失败及UX031开放问题；CLOSE作为恢复链相关入口不凭本探针另判失败。

旧“离开不抢焦点”合同真实点击posts改变focus后通过，与这条仅wheel离开的失败同时保留，不能互相抵消。UX031仍待E7，未调用付费/真实模型，仅一台模拟短屏Chromium，不外推实体手机/所有浏览器。E7任何进行中源码未获本次证据验收。

本轮新增 **31条** 有界state_evidence，触及 **10个既有族**；累计有状态记录 **52族**。全体完整family验收继续 **0**，完整控件/族/全站分数仍 `null`。本轮独立查看E61 short568×256en、normal motion及wheel前后4张已有图片，没有启动浏览器或构建。


### 原roadmap下一轮仅两个高影响族（只读探针候选）

本轮源追踪时间 **2026-10-16T02:43:06+08:00**；复用既有RM/R旅程，仍18个roadmap批次，不扩大实现范围、不启动browser。E61导入时`bear-orb.js`已进入E62源码改动，manifest比较标出不同；E61图与有界材质85只属于其freeze，不认证当前shader。

1. **`T.SOCIAL.QR` / R-30，作为RM-07 Travel内容同行程的附属探针。** `/zh/travel/`真实微信/小红书按钮`.tw-social--qr`→共享`#tw-qr`。`travel.html:389–399`的open只改img/label/id、hidden/class/expanded，未主动focus入modal或建立Tab边界；`:401–407`的close依赖transitionend，没有新open代次保护。CSS root透明200ms、card变换240ms，子transition也会冒泡。风险为键盘仍在背景和关闭旧回调隐藏新B，但都仍是源码候选，不能写已复现。最小探针：390×844实际键盘开A→Tab/ShiftTab记录焦点；no-preference实际closeA→过渡未完即开B→300ms后核B图/label/ID/visible；Escape回B，再runtime reduce重做关开/hidden/noBox。只读二维码，不发送、不导航外站。另已更正原盘点：ID仅显示，**当前没有复制ID按钮**；英文Travel social order不含QR。
2. **`G.NAV.ANCHOR` / RM-15、R-02。** 选`/zh/archives/`真实`.archives-year-nav__link`（`archives.html:49`）而非已被排除的首页CTA。`footer.html:57`当前已在preventDefault前检查button/modifier/download/_blank，故F03是历史源缺口、现在`source_fixed_pending_browser`，不是当前已知未修。最小探针：普通可信click实际年链接→记录hash/目标/Back；平台Meta/Ctrl、Shift或中键真实操作→读回当前页不被增强scroll与真实native新tab意图；reduce后普通click记录不强制smooth。所有链接站内，只读。首页CTA和wayfinder在55行被排除，它们的通过不能认证此global处理；不得用合成dispatchEvent替代原生新标签行为。

这两项只为下一次父任务挑选提供任务、selector、真实执行路径和可复用探针。没有增加控件族，没有将源码诊断升级为浏览器失败或通过。


## v1.9 Travel QR实际失败与F03下一最小探针

导入时间 **2026-10-16T02:45:33+08:00**，checkpoint **`4782757e3fc4`**。本轮只新增`T.SOCIAL.QR`两个失败state记录，没有成功验收升级。仍 **309族 / 358 selectors / 57 journeys / 18roadmap批次**。

- **focus失败：390×844中文light，reduce和no-preference均复现。** 实际点小红书二维码后dialog visible但focus仍trigger；真实Tab转到背景微信trigger。未点击关闭X/backdrop，不把它们算通过；Escape返原trigger只是同case的事实，不升级整族。
- **reopen失败：只在390×844中文light/no-preference。** Escape后立即Enter重开同一个小红书入口，500ms后`hidden=true`，但`is-open=true`、`aria-expanded=true`。`travel.html:401–406`旧transitionend done可覆盖新open；没有把它说成已测跨频道A→B。
- **reduce重开仍visible：** `hidden=false/open=true/expanded=true`，所以不能把normal-motion重开隐藏失败外推reduce。reduce的焦点仍在背景，单独保留前一条focus失败。

依据`travel-qr-baseline-probe.json/log`及4张390×844图；本轮独立查看normal初开/重开与reduce重开3图。receipt独立Travel template SHA为`041eb8ac202c`，与当前及`77bf94c2`Git blob一致；Travel模板和CSS不在E62九文件manifest内，使用独立hash与Git blob定位，没有借E62球体证据认证Travel。源级UX018现在升级为**有界实际失败已复现、仍开放**；完整族/全站分数继续null。

**F03下一最小实际probe（未运行）：** 复用RM-15/R-02，`/zh/archives/`、1440×900/light/reduce，真实`.archives-year-nav__link`。先从DOM取实际年href并在隔离测试context记录click的`defaultPrevented`与`scrollIntoView`调用；mac真实Meta+click（其他系统Ctrl）须放行native站内新tab、原页hash/scroll不被增强改写；再普通click同链接须正常更新目标/hash且reduce不smooth，Back读回。仅在需要覆盖auxclick时再补中键，不广铺矩阵。`footer.html:57`已存在guard，所以仍是**source_fixed_pending_browser**，未写browser pass。首页CTA和wayfinder被55行排除，不能拿它们现有通过顶替；合成dispatchEvent不能证明原生新标签行为。

本轮累计有状态记录 **53族 / 178条**，其中本次新增2条失败；完整族验收仍0。没有启动浏览器/构建，没有改生产代码。


## v1.10 F03与当前右TOC：实际路径有界导入

导入 **2026-10-16T02:49:26+08:00**，preview/checkpoint **`4782757e3fc4`**。`anchor-intent-source.json`在上海02:46:31冻结5个源hash，本轮当前hash仍匹配：footer、micro-interactions CSS、reading-companion、toc-highlight、editorial-tools。E7首页工作不在此5源范围；不外推完整构建闭包。

| 既有族 / active状态 | 实际证据 | 保留边界 |
| --- | --- | --- |
| `G.NAV.ANCHOR` / Meta原生意图 | `/zh/archives/`1440×900zh/light/reduce，可信Mac Meta点击真实year2026，站内新tab是正确hash，原页URL/scrollY0不变、event未prevent、0 scrollIntoView | 只Mac Meta/year2026；Ctrl、Shift、中键、download/_blank与其他锚点仍未实测 |
| `G.NAV.ANCHOR` / 普通定位与Back | 普通实际click后正确#year-2026、scrollY365、scrollIntoView options=null且html computed auto；Back回原Archives URL | 365是页面scrollY，不是heading top；回执未额外断言Back焦点/精确原scroll恢复 |
| `A.TOC.LINK` / runtime reduce | `/zh/engineering/posts/use-go-tools-dlv/`实际右目录`.toc-side__nav a:visible`第一中文项，no-preference→reduce后真实click，auto/no smooth，解码hash“调试go工程”，scrollY692 | 只1440中文light当前right TOC/首项；目标focus、移动目录、其他文章与全部标题未测试 |

因此F03与UX009只在上述路径关闭，不以源码guard存在推成全browser pass。`static/js/toc-highlight.js:9`的legacy`.toc-sidebar__nav #TableOfContents a`当前模板没有渲染，本次不认证它；实际右目录由`editorial-tools.html:64/73`生成，global footer处理点击。

`anchor-intent-initial.log`保留：第一次脚本用百分号编码hex大小写做原文严格比较而误报，`#%E8...`与`#%e8...`解码等价；改用decodeURIComponent后真实重跑通过。它不是生产缺陷，未新增UI失败/族。两张1440×900既有实图已独立查看。

本轮新增 **3条active局部记录**；累计 **181条 / 55族有状态证据**。仍 **309族 / 358 selectors / 57 journeys / 18roadmap批次**，完整family通过0，完整分数继续null。没有启动browser/构建或修改生产。


## v1.11 E7/E71聊天恢复：同位Stop与精确任务范围

导入 **2026-10-16T02:57:53+08:00**，base/checkpoint `4782757e3fc4`。`batch-e7-source`与E71各8文件；两manifest只有`home-chat-recovery.spec.ts`的时钟fixture hash不同，另7hash（含生产）相同。E71先在请求前暂停时钟，再断言startedAt到24999/25000的精确elapsed，不能把测试前沿修正说成另一次生产修复。

**回执计数：** E7 initial **19/21通过、2失败保留**（header和SSE首chunk的24999ms前沿断言）；E71修fixture后 **9条recovery通过**。原不相交 **6 about +6 short/normal =12** 已通过，因此最终是 **21个distinct测试**，不是30个不同测试。30仅两轮执行次数；没有用重复通过数补分。另36 Node、typecheck与build正式日志已读，Node不代替浏览器状态。

| 族 / 状态 | 具体证据 | 不能外推 |
| --- | --- | --- |
| `H.CHAT.SEND` / pending→Stop | 同一个`#hp-chat-send`切为`data-action=stop`、aria-label“停止回复/Stop reply”，沿用`control.916abc`；实际568×256zh/light headers挂起、1440×900en/dark partial，两者reduce，44px/centerhit/真实坐标click | 没有新增按钮/selector/族；不是只有正常图或aria名字就通过 |
| 输入/关开 / draft | 两actual流精确未发送draft关开保持；E71默认1440中英另验含引号draft、成功后新draft关开、clear清空 | 不认证所有存储/刷新/实体键盘/私人数据策略 |
| 发送 / synthetic composition | E71中英合成isComposing及keyCode229的Enter/Escape不误发/误关，普通Enter后1请求 | **不是OS级IME/候选词输入验收** |
| Stop / 取消与恢复 | 两actual流abort=1，partial另cancel=1；问题/已有partial留transcript，独立新turn完成，失败问题不进入context；旧header晚JSON丢弃、partial reader已取消 | 两actual发独立新问题，没有假称点Retry；Retry由单独合同证明 |
| timeout / Retry / DONE | 25秒idle涵盖header、SSE首/后chunk、JSON body；cancel永不settle也解锁；header/SSE/Stop后Retry context=[]并完成；[DONE]不等EOF，30秒后不误超时 | 受控传输不是真实服务器/模型质量；错误/主题/设备仍按case边界 |
| wheel阅读意图 | 568×320en/reduce真实620px wheel到Books后晚回复完成，**scrollY2803→2803，delta0**；不focus input；E71同路径合同偏移<2 | 只这条模拟短屏路径；不能据此接受所有滚动/触控/虚拟键盘策略 |

6张actual Stop旅程图、2张wheel图分开登记；本轮独立查看short pending、dark stopped与wheel after共3张。旧UX025/026/027/031失败state记录均保留负状态，只附E7/E71对应case有界通过链接；父验收与独立review已闭环，当前8hash/QA一致、对应范围无未解决P0/P1；完整功能族不升级。Space UX024/028/029与Travel UX018仍开放。

本轮新增 **22条** 状态绑定、触及 **6个既有族**；累计 **203条 / 56族有局部状态证据**。总量仍 **309族 / 358 selectors / 57 journeys / 18roadmap批次**，完整family认证0、完整分数null。没有启动browser/构建或修改生产代码，现停止写入供checkpoint。


## v1.12 E8历史与E81有界回归：补漏真实Back

导入 **2026-10-16T03:14:25+08:00**，base `aff16e05b322`。真实存在的`[data-space-overview-close]`原先遗漏，已补到既有`S.WINDOW.OVERVIEWITEM`（概览项/返回）：新control **`S.WINDOW.OVERVIEWITEM.control.e9b894`**，原item`control.fb932e`不变。模板`space/desktop.html:87`、点击`desktop.js:322`→`closeDialog`。这是漏项纠正，**309族不变、selector358→359**；旧item或menu trigger证据均不传给Back。

| 证据版本 | 具体记录 | 不能覆盖 |
| --- | --- | --- |
| E8 manifest4 / Node16 / initial5过1失败 | UX032：1440中文4窗focusnotes后再`BearSpace.execute(arrange)`，notes/map/terminal换tile；保留真正生产行为失败，非fixture误报 | 初次tile非重叠、可hit与重复整理失败并存，不能只看normal图宣布稳定 |
| E8 actual3 / 5图 | 844coarsezh3/en4真实bar概览、Back/Escape返回、welcome/notes选择与同editor/草稿；1440zh4实际tile/每窗控制hit | Back中文44.98×17.5、英文48.66×17.5，项目重要移动动作44目标仍失败；不是不可点，也不一概称WCAG失败 |
| E81 manifest5 / Node17 / typecheck/build / 6过 | 844coarse中英3/4窗overview不改geometry，末项内部scroll后Back≥44且在dialog内、真实click回trigger；1440中文2/4窗tile重复按idrect稳定 | 这六合同重跑同配置，不与initial凑成12个不同合同；Node也不凑33个新测试 |
| E81 actual3 / 5新图 | Back中文60.98×44、英文64.66×44，滚末项header仍可见/centerhit/坐标返回；notes同DOM/值继续；1440四窗notesfocus后真实bar再次整理rect按id不变 | actual四窗含contact，合同四窗含terminal，分开记录；不把E8旧图认证E81源改动，也不把worldFrames3当FPS/实体设备认证 |

E81菜单overview焦点→ArrowDown与重复arrange项显示条件、本地terminal arrange真实反馈只按对应合同绑定，不将bar实际入口通过赠给menu trigger。UX024/032/033仅上述状态已有父验收与有界新证据；独立最终review在导入时待closure，完整family继续未认证。旧负state保留并附E81范围，不改旧失败的raw尺寸/换位事实。

本轮新增 **25条状态绑定 / 6个既有族**，累计 **228条 / 59族有局部状态证据**。当前总量 **309族 / 359 selectors / 57journeys / 18roadmap批次**，完整family通过0、完整分数null。E8/E81各5图分开登记，本轮独立查看E8 overview en4、E81同配置与1440tile3张；未启动browser/构建、未改生产。


## v1.13 E81复核关闭与pre-E9独立失败基线

导入 **2026-10-16T03:22:25+08:00**。E81最终独立review已关闭前述对应scope，并保存checkpoint **`3caab4d18800`**；v1.12写入时pending属历史时点，现同步registry/UX024/032/033，旧E8换位与Back17.5失败仍保留原负状态。

两个新baseline均严格绑定**未改的3ca预览**，逐个显式源hash与`git show 3caab4d1:<file>`核对一致。当前E9源码的apps.js/space.css/space-cafe.css已有WIP差异，不让新源继承旧图；products/books E9a未验收，联系/设置E9b后续，均没有升级。

| 族 / 本轮状态 | 独立基线事实 | 验收边界 |
| --- | --- | --- |
| `S.APP.products.SELECT` / focus策略观察、未认证 | 1440×900zh/reduce，显式programmatic focus后真实Space选择imstage；selected/payload正确，focus进入具名products SECTION region，activeProduct=null | 这是现有导航策略，不自动判失败或硬门槛；Tab路线/完整键盘仍未认证。E9a同component留焦点是授权改善，不伪称修复原不可达 |
| `S.APP.settings.THEME` / focus失败 | 真实Space改dark：stored与selected正确，focus落BODY | 初始light→dark一条路径，不认证完整主题或持久化矩阵 |
| `S.APP.settings.COLOR` / focus失败 | 真实Space改forest：stored与selected正确，focus落BODY | 当前实际激活路径，不推断Tab/实体键盘/所有颜色 |
| `S.APP.books.READ` / normal静态文字基线 | 四色封面DOM作者/编号opacity .75合成ratio **3.415 / 2.330 / 2.706 / 3.164**，橙封DOM标题 **2.957** | 控件族承载书封呈现观察，但control_ids为空：没有新按钮，没有测阅读link点击；不是截图内图像文字 |

focus基线的2张1440×900图已独立查看。书封基线没有用图片量颜色；来自computed solid RGB与text opacity在纯色cover上的合成，cover opacity1、filter none，按sRGB luminance复算12样本与原ratio最大误差约`8.9e-16`。探针对全部封面DOM文字（含heading）统一用4.5作保守目标，**不能据此声称所有大标题标准一律4.5、抗锯齿已测或整页/全部主题对比度通过/失败**。这些是精确基线缺口，E9a正常效果未建未验，先保留。

本轮新增 **4条状态记录：3条失败（主题/颜色BODY连续性、书封原始对比基线）+1条产品导航策略观察 / 4个既有族**；累计 **232条状态 / 59族有局部证据**，仍 **309族 / 359selectors / 57journeys / 18roadmap批次**。完整family通过0、完整分数null。只改两inventory文件，没有启动browser/构建或修改生产。

分类更正时间 **2026-10-16T03:23:43+08:00**：独立review将产品SELECT的具名SECTION焦点归为现有导航结果观察，不与theme/wallpaper的BODY焦点损失混为已证失败。四条新增记录、232条总记录及309/359/57总量不变。


## v1.14 E9a1产品/书架：独立picker、保留initial失败

导入 **2026-10-16T03:36:26+08:00**。仍309族；新native`[data-product-select]`归原`S.APP.products.SELECT`、ID`S.APP.products.SELECT.control.04c780`；旧目录按钮selector/ID保留。另经父授权补漏3ca早已存在的`[data-product-ask]`，归`products.OPEN`、ID`S.APP.products.OPEN.control.a3b76f`，**只44/hit，没有触发AI动作**，不继承产品link/popup通过。因此359→**361 control IDs**；无重复新族。既存reader/books app-nav的当前aside容器locator作为旧导航control variant明确登记，原selector不改。

E9a与a1各4源hash分别冻结。initial **0过/6失败**均为无demo时预期2真实URL却出现3anchor的假预览，历史保留；a1 helper先拒绝空/全空白，**6合同全过**并检查缺demo不出现假预览。不是测试误报，也不把失败前少量断言算整批通过。当前a2短高CSS/spec工作不由a1旧图认证。

| a1证据片段 | 具体范围 | 保留边界 |
| --- | --- | --- |
| 父4actual/16新图 | 320×740zh/light、390×844en/dark、844×390en/light coarse；1440×900zh/light桌面，全部reduce | 与合同320×844、390en/light、620zh/dark、844en/dark、1440中light/英dark的6配置分开，不混尺寸/主题 |
| compact/desktop产品选择 | 父3compact用focus+selectOption；父desktop逐个7产品真实坐标click；均两帧后对应control focus/title/payload正确。六合同另验native Home/End/ArrowDown与旧目录Space | 不证明物理OS picker/Tab/IME；旧region导航是策略观察，a1 component留焦点是授权改善 |
| 产品可读/真实入口 | 实测正文约16.4，body无横溢；主link44/hit，父每context最后产品popup本地拦截；六合同所有真实url/demo/github坐标click被document捕获 | 不访问外站服务；Ask仅target测试。7真实产品与原selector保留 |
| 书架 | 4真实书/12封面DOM文字每context ratio约5.345/4.894/5.132/5.826；4named readlink各44/hit，含真实书名与distinctURL；六合同另真正坐标click并阻止导航 | computed CSS/opacity，不是截图内部文字/抗锯齿或全页对比认证；父actual本身没有点击booklink |
| 原notes | 4actual同editor DOM+draft精确保留；六合同另继续输入 | 不证明其他所有app/持久化路径 |

8渠道原contact函数与3ca源码逐字一致，只记录源内容保留；没有测试其焦点/44/发送，**UX028/029仅products/books片段有新证据，contact/settings仍开放**。书封旧raw低比值保持历史负记录并附a1对照；UX035/036对应case通过待独立final关闭，完整分数null。

**UX037保留：** a1真实844×390en/light coarse首图中产品entry nav占主要可用高度，h2/headline在fold外；内容可滚动，属于首屏层级缺口，不称不可达。a2已获父授权另修，本轮不等待也不提前验收。

本轮新增 **23条状态 / 5个既有族**，累计 **255条 / 60族有局部证据**。总量 **309族 / 361selectors / 57journeys / 18roadmap**，完整family认证0。16图按source登记，本轮独立查看short产品首图、320书架、desktop末产品、390dark末书4图；只写inventory，未启动浏览器/构建。


## v1.15 小量追加：a2只验844短coarse入口

导入 **2026-10-16T03:38:40+08:00**，source=`batch-e9a2-source.json`（4hash+QA）。CSS只在`min-width641 + pointer:coarse + max-height420`将产品picker/探索nav同排；原a1 fold缺口保留历史。

`844×390 en/light/reduce coarse`父actual首/末产品在真实body scrollTop0：body纵界 **89.22..272.90**，h2完整 **180.89..215.00**，headline首行bottom **247.80**，均在内容视口内。另a2 **6合同全过**，其中`844×390 en/dark`对全部7个产品逐个验此entry几何。父actual是selectOption与first/last量值，不是物理picker/Tab/实机；可滚的其余正文不要求全部同屏。

只新增 **2条normal内容几何记录**，不重记a1其他状态；4新图登记，本轮看产品first/last2图。UX037按此scope标改善/已测，旧a1视觉缺口不改原值/原图；Ask仍仅hit，contact/settings缺口不继承关闭。未做全站/完整控件评分。

累计 **257条状态 / 60族局部证据**，保持 **309族 / 361selectors / 57journeys / 18roadmap**、完整family通过0/fullscore null。没有启动browser/构建，只写两inventory文件，现停写。


## v1.16 E9b联系/设置：有界状态与颜色视觉基线

导入 **2026-10-16T04:03:11+08:00**。依据[E9b manifest](evidence/batch-e9b-source.json)冻结4源hash+QA，与当前逐项一致；base`ebc488e69640`。只新增必要状态/引用，原历史保留。

**补漏既有WhatsApp：** 同`S.APP.contact.CHANNEL`新增control **`S.APP.contact.CHANNEL.control.10f744`**，稳定selector`.space-contact__actions a[href*="wa.me/"]`，对应probe`.space-contact__actions a.last`。该anchor不在8社交容器，独立绑定第11次capture click与catalog href。原3个渠道control/8社交内容均保留；这是旧功能漏映射，**309族不变、361→362selectors**。AI向导只登记geometry support selector，不授启动/API/回答行为。

| 片段 | 实测范围 | 不外推 |
| --- | --- | --- |
| 7合同 / 4actual / 20图 | 合同6视口中英明暗+独立pending-close；actual320×740zh、390×844en、844×390en coarse、1440×900zh fine，全部reduce | 合同320高844与actual740分开；非实体手机/完整Tab/OS IME |
| theme/color | actual5次真实坐标事件dark→forest→light→dusk→dark，两帧原button/focus/pressed/state；合同theme显式focus+Space，color三值坐标，另核storage | 5事件不是5个不同选项。UX034仅所测焦点连续性/外部tool路径独立关闭 |
| 原runtime/close | actual单GET/原label pending→stub false；合同首次stub true不抢draft focus。独立pendingclose实点后旧GET收abort，新mount false后旧late true不覆写 | connected来自stub，不是真实后端；静态label非新按钮；不授全站AI取消 |
| 草稿/notes | 草稿投影约16.4px，无横溢，同DOM/值/最小化重开继续写；public tool改外观时textarea仍focus且settingsARIA同步；notes原DOM值保留 | public tool是programmatic，与真实选择分开；不授全部持久化/其他App |
| 11渠道 | 实际逐一44/hit，真实坐标点击capture阻导航；catalog href及mail/GitHub特殊字符/换行draft编码正确 | 没有外发邮件/公开issue/message或访问外站。WhatsApp不继承8社交通过 |
| 其他设置入口 | language/café/export/arrange仅settings实例44/hit；能力名≥16、辅助状态≥13、说明≥16 | 不授语言切换/切景返回/导出文件/整理动作 |

[7合同log](evidence/batch-e9b-contracts.log)、[actual JSON](evidence/batch-e9b-actions.json)、[actual log](evidence/batch-e9b-actions.log)、[probe](batch-e9b-actions.browser.mjs)及20图索引集中在JSON `e9b-contact-settings-import`；本Agent查看844pending、390contact bottom、1440settings top共3图。initial probe误把旧fine-pointer最小化26.24px也要求44，改探针为该处24；**不记生产新failure**，主要动作/coarse目标仍44。

**UX038独立P2视觉失败仍开放：** [颜色基线](evidence/spatial-wallpaper-baseline.json)、[log](evidence/spatial-wallpaper-baseline.log)、[probe](probe-spatial-wallpaper.browser.mjs)与3图，仅1440×900zh/light/reduce真实dawn/dusk/forest→最小化露monitor。三值pressed/stored/dataset正确，screen仍`rgb(238,239,235)`、landscape `display:none`；dawn/forest monitor PNG相同，dusk虽不同但底色同。`desktop.js:94`写dataset，`space-classic.css:5–10`改landscape，`space-cafe.css:90/122`用surface并隐藏landscape。独立review确认此范围P2；**选中成功不等于桌面视觉变色**，E9c尚未实施。

旧pre-E9 BODY焦点负记录保留，仅附有界follow-up。UX028/029补齐products/books/contact/settings这批字号/目标片段，其他App与未测状态仍开放，未关闭全站缺口。本轮新增 **19条E9b状态+1条独立视觉基线=20条**；累计 **277条 / 60族有局部状态证据**。总量 **309族 / 362selectors / 57journeys / 18roadmap**，完整family通过0、完整分数null。仅更新两inventory文件，未启动browser/构建/测试，现停写供checkpoint。


## v1.17 E9c：只追加桌面六色输出与原文档连续性

导入 **2026-10-16T04:18:59+08:00**，source=[batch-e9c-source.json](evidence/batch-e9c-source.json)：2源hash+QA匹配，base`39a7bd07c09d`。CSS只将现有classic六色投到spatial screen（`space-cafe.css:90–95`），没有新颜色控件/JS行为。

[3合同](evidence/batch-e9c-contracts.log)通过：[actual JSON](evidence/batch-e9c-actions.json)/[log](evidence/batch-e9c-actions.log)/[probe](batch-e9c-actions.browser.mjs)有 **1440×900zh fine、390×844en coarse两Metal/reduce context、12次真实wallpaper选择、18新图**。每context light/dark各dawn/dusk/forest；露出monitor且无窗口遮挡后，PNG经Canvas2D解码的单像素精确为light `111,166,157 / 113,140,155 / 151,170,143`、dark `41,76,71 / 48,67,79 / 60,76,57`，同时computed背景正确、无image、opacity1。不是整帧/显示校准/全页面对比认证。

原button/focus/pressed/storage保持；同theme三wallpaper不染paper/draft/window/chrome，theme本身仍可正常变更中性纸张。原contact textarea同DOM/值继续写，notes原DOM/值保留；主合同另返回notes继续输入。第三合同**1440zh强制WebGL失败**，无spatial screen且landscape可见，原备用桌面六色computed通过；不把它描述成实际PNG像素验收。

只新增 **COLOR normal/focus、contactDRAFT active、notesEDITOR active共4条**，不复制raw动作矩阵；18图/source/scope引用在JSON `e9c-wallpaper-scope-import`。本Agent查看desktop light forest scene、phone dark forest scene、phone neutral document三张。UX038旧固定底色失败/旧图保留；独立review已复核2hash+QA/3合同/18图，并以标准库PNG独立解码核对12采样点+SHA，关闭本次命名scope。normal motion、其他viewport、实体设备、contrast等继续unknown。

累计 **281条状态 / 60族局部证据**，保持 **309族 / 362selectors / 57journeys / 18roadmap**。完整族认证0、完整分数null；仅改两inventory文件，未启动browser/构建/测试，现停写供checkpoint。


## v1.18 E10/E10a局部闭环与全局四项真实失败

导入 **2026-10-16T04:54:05+08:00**。只补 **14状态记录**：搜索/脚注4负基线、E10历史5、E10a局部5；原负状态不改，回执/source/图片均以共享registry引用，未复制raw动作。

**selector校准/补漏：** 旧脚注`98b9b5`改真实`.fn-popover`，明确非点击/非Tab support-root，旧`.footnote-preview`仅历史alias，不继承动作。真实marker **`d3b14a`**=`.post-content a.footnote-ref[href^="#"]`、More **`70bc13`**=`.fn-popover__more`；UX042首tap只绑marker，More仍source-only未实点。QR新增 **`57404f`**=`.tw-qr__details`可Tab region、**`246c0a`**=`.tw-qr__retry`条件按钮，均归原族。当前 **366是selector entries，不能称366按钮/完整认证**。

| 实证 | 精确范围与结果 | 保留边界 |
| --- | --- | --- |
| UX039/040/041，开放P2 | 搜索pending390zh/reduce经虚拟60s仍busy/视觉0；1440第二GET真实成功10条后旧503清空；新无匹配query在暂停150ms窗口真实Enter仍开旧Kubernetes首篇 | source与b5Git blob一致；本地传输/clock，导航abort无外网；Home/End仅观察、不判违规 |
| UX042，开放P2 | context-engineering390zh/coarse/reduce首次真实模拟tap脚注，scrollY2813→18972/hash#fn:1，两帧/300ms均无popover | root仅支持状态观测、不获点击通过；More未点；未测article1200resize |
| E10历史 | 9合同含English无QR1例；4中文context/8正常图、完整原poster/44close/Tab details/返回/即时重开；pending/404只有metadata和close，UX043原反馈失败保留 | E10旧3hash与E10a分开；不能把历史9+最新17说成26distinct。initial duration1e-6s在property:none时非实际动画 |
| E10a正常 | 3hash+QA冻结，17合同16.6s、Hugo3539ms；4中文context8正常图，原海报/账号、close/details焦点循环与返回、即时重开/overflow/scroll | 390×844light/normal、568×256dark/reduce、320×740light/reduce、1440×900dark/normal；English实际4nonQR另算 |
| E10a恢复 | 3context7图：390真实404→坐标Retry→JPEG、重复guard仅2GET、poster稳定；Retry成功转close，真实Tab至details后完成不抢；568×224dark双error/status/44Retry有界 | R2为暂停clock14999/15000精确deadline；旧node晚load/error为合成组件边界，不是实际网络等15s |
| E10a无clock补充 | 另1scope2图：390zh/reduce真实pending/404，loading/error文字与label/ID可见，auto!important overflow原样恢复，close后实际晚成功不重开 | 暂停clock0ms图有未paint label，不因此判源码缺metadata，也不拿该图认证全可见 |

**滚动限制保留：** E10a首轮严格scroll差14px及[diagnostic](evidence/batch-e10a-scroll-diagnostic.json)仍在；final严格相等以fonts/有限背景入口动画settled为前提，firstpaint/mid-reveal全局恢复继续unknown。17主图与1diagnostic分开。反馈[raw contrast](evidence/batch-e10a-feedback-contrast.json)仅4个error/timeout scope的opaque status+enabledRetry，最小 **6.371623**；不授disabled/图片/整页/抗锯齿对比认证。

依据：[E10 source](evidence/batch-e10-source.json)、[E10a source](evidence/batch-e10a-source.json)、[17合同](evidence/batch-e10a-contracts.log)、[正常动作](evidence/batch-e10a-actions.json)、[恢复](evidence/batch-e10a-recovery.json)、[无clock图像状态](evidence/batch-e10a-image-state.json)；全局四负基线见JSON `global-search-footnote-baseline-import`。本Agent查看搜索pending、脚注文末、E10a无clockpending、短横屏error四张；独立review查看E10a17主图并复算四对比scope，**UX018/UX043只在命名范围闭**，无新增P0/P1。

累计 **295状态 / 63族局部证据**；保持 **309族 / 366selector entries / 57journeys / 18roadmap**。分类62 partial-state+1 measured，完整族认证0、完整分数null。只写两inventory，未启动browser/构建/测试，现停止写入供checkpoint。


## v1.19 UX044：文章1200断点有界负基线

导入 **2026-10-16T05:11:52+08:00**；[baseline](evidence/article-resize-baseline.json)/[log](evidence/article-resize-baseline.log)/[probe](probe-article-resize.browser.mjs)的7源SHA逐项匹配immutable `e5fafdc2` Git blob与当前，和未构建E11搜索WIP分开。

`/zh/engineering/posts/use-go-tools-dlv/`、Chromium、zh/reduce、1199×900→1200×900：compact AI原textarea持未发送合成draft。跨断点sheet inert、overflow解锁，**focusBODY、desktopAI未选且空；下一真实Tab使scroll500→26055落推荐链接**。明确点desktopAI后仍是独立空textarea。原compact DOM/value始终保留，父手动回1199/scroll500并等FAB可见再实际打开、2帧+300ms后原草稿可见；**不是草稿删除或反向自动交接通过**。

只新增 **4状态片段**：FAB`671080`手动重开观察、mobileAI tab`233f10`观察、compact`001165`/desktop`4748de`值对照、compact focus失败（desktop只support）。4正式图与早期return瞬间frame诊断分开；本Agent看1200与settled return两图，未把瞬间blank判稳定缺陷。initial probe在跳到footer后点击隐藏FAB超时仍保留，不能另报FAB生产故障。UX044已由独立review复核7SHA/4主图，确认为命名范围P2开放；FAB/mobiletabs仅流程上下文，续写缺口属于两input交接。完整Tab/OS缩放/其他viewport继续未知。

E11真实`#search-index-retry`已在WIP源码出现，预计算`G.SEARCH.RETRY.control.b68b79`仅放**sourceplanned registry**，未注册/不增加control计数，等待freeze+finalactual；不继承原AI retry`788d65`。

累计 **299状态 / 66族局部证据**（65partial+1measured），保持 **309族 / 366selector entries / 57journeys / 18roadmap**。完整族0、完整分数null；仅改两inventory文件，未启动browser/构建/测试，现停写供checkpoint。


## v1.20 E11b：索引生命周期、当前意图与独立Retry

导入 **2026-10-16T05:31:50+08:00**；[final manifest](evidence/batch-e11-source.json)4源/QA/2父runner/suppQA均匹配当前。新`#search-index-retry`正式登记 **`G.SEARCH.RETRY.control.b68b79`**，与AIretry`788d65`分目标/分状态，不继承AI行为；原sourceplanned保留历史并指向本次登记。309族不变，**366→367selector entries**。

[15新合同](evidence/batch-e11-contracts.log)6.5s与[2旧专项](evidence/batch-e11-regression.log)2.8s分开，不能说17新合同。[7actualcontext/15主图](evidence/batch-e11-actions.json)为4真实local index中英390/1440交叉光暗/normal-reduce、2本地503恢复、1actualpending+virtualdeadline；各scope/method/图片只共享引用在JSON `e11-index-state-import`。

| 片段 | 实证与范围 | 限制 |
| --- | --- | --- |
| UX039 | loading/searching/ready/true empty/error/timeout区分；两actual503→真实原坐标Retry→GET2成功，缓存关开不新增GET；actual14999/15000与合同headers/JSON总deadline | exact15s为虚拟clock，不是实际壁钟等待；局部query恢复不授AIretry |
| UX040 | 旧fetch503/JSONreject/JSONsuccess不能覆写新owner10结果/query/focus | 三迟到variant来自受控合同，不伪称7actual含所有真实传输 |
| UX041 | 四actual新无匹配query立即清旧结果/currentFullHref，150ms暂停窗口真实Enter只捕获当前Full Search；合同另验matchingEnter与合成IME键码 | 导航本地capture/abort，无canonicalhost访问；不是OS IME/Full link目标页认证 |
| UX045 | 原13pass后actual第二原中心click焦点BODY失败仍存；父/独立坐标诊断y346.375→322.828125；5行status高度修复后390zh/1440en error→pending原y精确不变，44目标/焦点/GET2 | failure log直接证明BODY，位移数来自父/独立诊断，不假称raw JSON。新增2合同只status字号200%，不是pagezoom |
| 焦点意图 | 手机Retry成功回input；桌面真实ShiftTab到Full Search后完成不抢link焦点 | 只各自命名路径，不授完整键盘矩阵 |

**生命周期与Back分开：** C11/C12合成`PageTransitionEvent persisted:true`只证明原query、完成AI/原followupDOM/草稿/context受控保留；[真实Back](evidence/batch-e11-back.json)及2图`persisted=false`、document token改变，浏览器给`no-store`相关原因。**BFCache未命中，恢复仍unknown**，不能套用合成合同为真实Back通过，也不新增数据持久化缺陷。

脚注[fine诊断](evidence/footnote-focus-baseline.json)另记qualified component：programmatic marker/citation focus后250ms隐藏→BODY；实际自然Tab到下个marker保持正常，不称自然键盘进入citation失败或全脚注不可达。UX042与文章UX044继续open。初probe在被abort的chrome错误页触发localStorage限制仅runner修正，与真实UX045位移失败分开保留。

本轮 **14新state**（含1旧UX045负记录）/1新control，累计 **313状态 / 69族局部证据**（68partial+1measured）；保持 **309族 / 367selectors / 57journeys / 18roadmap**。独立review已闭UX039/040/041/045命名范围，无新增P0/P1，所有旧负记录不改。本Agent看4主图，未启动browser/构建/测试；完整族认证0/full分null，现停写供checkpoint。


## v1.21 E11c：仅追加文案与可见文字对比

导入 **2026-10-16T05:41:19+08:00**；[c manifest](evidence/batch-e11c-source.json)4源/QA/runner匹配。[scope proof](evidence/batch-e11c-scope.log)的6status+2label反替换后JS/template/spec与accepted`1e2d94a`逐字一致，CSS未变；本Agent亦独立重做反替换核对。

只新增 **2条normal片段**：QUERY的`#search-empty`非交互status-support（无control ID），以及原Retry`b68b79`的“重试搜索 / Retry search”文案。7个新actualcontext/[15图](evidence/batch-e11c-actions.json)显示短提示解决implementation名词与390中文孤行，原44几何/焦点/当前Enter在c scope维持；[15合同7.0s](evidence/batch-e11c-contracts.log)是相同15case重跑，**没有新增15功能/再叠b14状态**。

13个可见status/enabledRetry opaque computed样本raw最小 **5.789000796485059**，本Agent与独立review分别复算误差0。仅这些文字，不含disabled .65/图片/全页/AT。独立review已看c15图，确认命名恢复视觉建议解决；b94.5历史保留，专家静态D1/D4片段见scorecard，full分仍null。

**明确provenance erratum：** raw actions顶层`sourceManifest`仍为复制的b literal；[独立勘误](evidence/batch-e11c-provenance.json)绑定rawSHA、真正c manifestSHA、已执行runnerSHA。runner5–7用c prefix读取c manifest并逐4源assert。保留raw/runner不改，不冒充重跑；本次state按勘误绑定c。

E11b的17图、2旧专项及真实Back完整保留，c未重跑Back/旧专项，不继承BFCache恢复通过；UX042/UX044仍open，E12未实施。本Agent看3张c图，无browser/构建/测试进程。累计 **315状态 / 69族局部证据**，保持 **309族 / 367selector entries / 57journeys / 18roadmap**，完整族0/fullnull；现停止写入供checkpoint。


## v1.22 E12：脚注首触、局部键盘与原生阅读意图

导入 **2026-10-16T06:14:03+08:00**；[source](evidence/batch-e12-source.json)四源/QA/runner读回匹配，3生产SHA初冻至今未变。[provenance](evidence/batch-e12-provenance.json)明确main实际执行[180 snapshot](evidence/batch-e12-180-source.json)，之后只改boundary的180→150附加高度/注册contrast，**不冒main重跑**。spec仅NoJS rAF/实际ArrowDown纠正；初合同、父初失败、early-hash与180前置失败全部保留。

新增 **8条状态**，均归既存脚注族：root`98b9b5`为非点击/非Tab的具名非模态region；marker`d3b14a`、More`70bc13`分开。body`tabindex=0/role=group`仅focus/scroll支持子目标，不造按钮/control ID。[8合同14.9s](evidence/batch-e12b-contracts.log)、[4maincontext/10图](evidence/batch-e12-actions.json)、[3boundarycontext/5图](evidence/batch-e12-boundaries.json)分开；JSON只共享必要引用。

| 片段 | 实证 | 限制 |
| --- | --- | --- |
| 首触/原生阅读 | 中英390首tap预览保scroll/hash/history；第二tap/More沿原hash到完整脚注，真实Back返原阅读点 | 字体已稳定；normal目标图仅首次可见，非smooth终态 |
| 局部键盘 | 1440中英实际局部Tab→marker、ArrowDown→body，Tab到引用/More停留，Esc回marker且不重开；Enter原生 | 先focus前一真实tabstop；二次程序focus隔离Esc；**自然Tab退出BODY不授下一正文目标通过**，无完整Tab/AT认证 |
| 兼容意图 | 390zh实际Mac Meta保原页/开localpopup，Space滚动、Enter跳转；NoJS实际tap/Back | 其他modifier/nonprimary/detail0、ARIA、timer代际、长note fixture另为合同，非实机AT |
| 短屏 | 568×224正常几何；额外150高原note内部wheel至27，overscroll不动文章Y10425，More44高；runtime reduce无运行变换 | 180原note可容纳；150是明确附加边界，不认证224溢出/物理手机 |
| 文字/目标 | [4contexts/20contrast样本](evidence/batch-e12-contrast.json)含More resting-hover-focus的0.9合成；rawmin **4.879289268784955**，本Agent复算误差≤1.78e-15；root/body/More14px、More44px | 不涵inline code`.92em`/抗锯齿/整页/全部富文本与状态 |

[键盘发现性2图](evidence/probe-e12-keyboard-discovery.json)补到原keyboard binding：ArrowDown只有SR-only说明/ARIA，实际自然Tab可到下marker。可视keyhint是明确设计差距，不另报trap/不可达。独立复核关闭 **UX042的settled-font首触/nativehistory/owned局部键盘命名范围**；旧b5负记录与qualified programmaticfocus失败不删除，不认证整族。

**UX046/P2开放**：[冷字体probe](evidence/probe-e12-font-layout.json)仅en390dark/no-preference，字体0→15、document30674→31731、marker414.28→627.94、scroll3713→3652，未有新用户scroll。归阅读渲染surface、`control_ids=[]`，不是marker点击失败/E12回归；reduce本次已字体暖，不授冷加载通过。文章UX044继续开放。

本Agent看3张既有正式图、读source/provenance并复算20样本；父/独立review已读15正式图。累计 **323状态 / 69族局部证据**；保持 **309族 / 367selector entries / 57journeys / 18roadmap**。完整族0/fullscore null；未启动browser/构建/测试，现停止写入供checkpoint。


## v1.23 E12c：可见键盘入口与短屏内部焦点

导入 **2026-10-16T06:41:02+08:00**；[source](evidence/batch-e12c-source.json)/[provenance](evidence/batch-e12c-provenance.json)冻结匹配：仅JS/CSS两生产文件，footer与`50a08fbb`逐字相同。C初10合同8过2失败保留；C1只把JS整数offset测量改为实际小数bbox，CSS/footer/spec与12px/.1断言未放宽。[最终10合同17.1s](evidence/batch-e12c1-contracts.log)是**8base加强+2新shortTab**，不是18合同或10新功能。

只添 **5状态**：旧UX047负focus、键盘cue focus、两短屏内部Tab focus、当前main原生active、22文字normal；仍现有3control ID，无新族/selector entry。新`.fn-popover__keyboard-hint`只属root`98b9b5`支持span，14px且`aria-hidden`避免重复说明，不是按钮/Tabstop。

- [4maincontexts/14图](evidence/batch-e12c-actions.json)：中英键盘显示↓可视入口，ArrowDown/引用/More同会话占位不变；pointerhover/tap无提示。当前source首tap/secondtap/More/native/Back和局部Esc实测，不继承旧图认证新source。
- [2shortcontexts/6图](evidence/batch-e12c-short-tab.json)：568×150en/dark fine/coarse，现有最长note实际内部Tabcitation/More保持Y10462/hash/history；resize224/runtimeReduce/Esc保原body/citation/MoreDOM与阅读点。More44/14、12px边界有界，不认证完整Tab/实机/全矩阵。
- [22computed文字样本](evidence/batch-e12c-contrast.json)含2新hint、More0.9合成，rawmin **4.879289268784955**；本Agent复算误差≤1.78e-15。不含inlinecode`.92em`/抗锯齿/全页/AT。

**UX047负基线保留**：[真实shortTab](evidence/probe-e12-short-tab.json)绑定immutable`50a08fbb`，原fine/coarse内部focus使10462→10431，More保持偏移；不塞给marker/More点击失败。[paired boundary](evidence/boundary-footnote-position-provenance.json)仍discovery/humanChoice unreviewed，B实验不是生产pass或Gold。独立final已复核source/10合同/20正式图/22contrast，UX047关闭`closed_E12c_named_fixed_short_Tab_node_identity_resize_reduce_scope`，只限568×150en/dark normal fine/coarse现有note→resize224→runtimeReduce→Esc原DOM；224长fixture另为合同。旧负基线保留，不认证整族。

**Back初失败未解释**：[初enMore→Back10s timeout](evidence/batch-e12c-back-initial-actions.log)、原source和6初图保留。3诊断返回精确Y、finalmain6条JSONL均pass，但没有生产修复/放宽原gate，不能把原失败说成已fix或不可能复现。normal目标图仍首次可见，非smooth终态。

UX044/046继续开放，完整族0/fullscore null。本Agent只看2张既有正式图、读回source/receipt并复算22样本，无browser/构建/测试。累计 **328状态 / 69族局部证据**；保持 **309族 / 367selector entries / 57journeys / 18roadmap**，现停写供checkpoint与review同步。


## v1.24 E13e：单一文章AI与 Space 实测/负基线

导入 **2026-10-16T07:44:53+08:00**；[E13e source](evidence/batch-e13e-source.json)11源含7生产变更/2测试/2未改依赖，[final provenance](evidence/batch-e13e-provenance.json) SHA`92c225d717…`绑定71唯一文件路径（本Agent74次SHA核对）及25正式图。**13不同合同15.3s + 4旧专项4.5s分开**，7actualcontexts；正式引用段落旅程只用`batch-e13e-settled-scope.json`，不拿opacity过渡帧/早期视觉误读当稳定缺陷。

E13只新增 **11状态**：canonical输入focus/normal、实际Send、quickchip、Stop、clear、Analyze、FAB、compactAI tab，以及nonAI等价焦点合同、旧Retry专项。`.rc-ai-textarea`4748de/Send a9e4f5/Chip4702a5随同一root搬入两host；旧abs001165/6c8f06/88b800/c0f33f保历史selector，**不表示仍有第二DOM，也不继承新通过**。manual followup不认证建议按钮fc51ca；静态Share卡不认证分享动作。

| 有界实证 | 范围与限制 |
| --- | --- |
| 原root/input/messages、草稿/首交接选区、跨断点focus与显式close/reopen | 中英1199↔1200与完成general历史；迁移不等于用户取消，exact overflow!important另为合同 |
| general→A→手动追问→B→A→clear→general | 程序DOMRange选择真实公共段落后实际toolbar点击；原AIClient受控请求，不声称物理拖选/付费模型 |
| 两轮真实wheel阅读锚点、后续stream、Stop | 首可见字符相对锚点≤1px；跨host不abort，实际Stop只一次；原Stop partial-answer设计未整体验收 |
| 实际Send/quickchip与compact Analyze | 自disabled/隐藏后保AI归属；新Analyze进可见textarea，Esc回FAB；非AI/外theme不抢来自合同，非全Tab/AT |

独立复核 **UX044关闭命名`closed_E13e_canonical_DOM_active_AI_handoff_context_stream_owner_explicit_analyze_scope`**，旧resize负证据原样保留。早期A/B/C/D失败、合法fixture/normalmotion/selectiontext修正与截图误读更正在provenance留档；小字/多层引用边框仍是具体设计差距，完整分数null，不授整体验收96。

另新增 **6条**（不按PNG扩计）：

1. [电脑1actual/7图](evidence/probe-space-computer-provenance.json)：只`b4a35c`一状态，1180,325 hover/click→workspace→真实reader首篇→回cafe→50pxdrag不入场；源9ec，无生产修复，其他遮挡/阈值边沿/keyboard/motion未知。`visibleButtons`仅layout-present，不是可视按钮普查。
2. [收藏1actual/6图](evidence/probe-space-bookmark-provenance.json)：只`cab162`一状态，390en真实save→favorites→reload→remove→empty可用；本Agent逐看6图，评分Agent未逐图审，不因此新增评分卡行为通过。仅星号变更、aria-pressed/label缺失记观察，不称AT失败。实量32.44×44.28不是44square通过，小标签仍待改善。
3. **UX048/P2四族负normal**：[阅读小字4图](evidence/probe-space-reading-scale-provenance.json)，只reader.ITEM bc2443标题/date/description、FILTER bcd452首all标签、PROFILE27a4fa分组的非交互简介支持、LINKS963723实际contact文字。1440zh/390en原9ec样本约7.42–10.66投影CSSpx；bbox/offsetWidth含rounding，非字形像素或通用WCAG字号阈值。未测其他links/filter功能；手机44hit不抵消小label。该缺口开放。

[E14单face 3×3/18图](evidence/boundary-font-registration-provenance.json)只registry引用，**0新state**；discovery/humanChoice unreviewed，不promote Gold，不声称完整字体bundle或全过程文字可见；UX046继续开放。

本轮 **17新状态→345累计 / 81族局部证据**（80partial+1measured；203source-only+25rendered），由JSON条目复算；完整族0/fullnull。保持 **309族/367selector entries/57journeys/18roadmap**。本Agent仅既有证据读取、11图查看与SHA校验，无browser/构建/测试；现停写供checkpoint与scorecard同步。


## v1.25 E15c：阅读目录、收藏共享状态与读点生命周期

导入 **2026-10-16T08:22:19+08:00**；[finalsource](evidence/batch-e15c-source.json)/[provenance](evidence/batch-e15c-provenance.json)10源+60文件SHA均匹配，4生产变更；[10不同合同14.5s](evidence/batch-e15c-contracts.log)、Hugo3512ms，[5actualcontexts/17正式图](evidence/batch-e15-actual.json)分开。父/独立review逐看17图；本Agent看4正式代表图/2旧公开收藏图，前轮已看旧owner4图/Breload2图，不启动browser/构建/测试。

新增 **2selector entries**：既有FILTER族下native`e973e2`=`[data-library-select]`；既有NAV补漏`f4bc09`=`.space-library-actions [data-open]`（Notes/Books两真实实例）。5个option不是5按钮、不增族；旧desktop filter`bcd452`继续live，`[data-library-list]`只是可聚焦scrollregion支持。Notes/Books入口不误绑编辑器/书籍readlink。

本轮 **14新状态**，其中3条旧负历史单列：

| 历史/当前 | 范围与证据 |
| --- | --- |
| UX049旧owner负 | 390en/coarse/reduce实际wheel→windowbody911/list0/saved0→文章→Library0；绑定返回`311e42`，list支持 |
| UX049候选B reload负 | 1440zh/reduce存储850、新list及两RAF850→ready/实际enter0，storage仍850；不称存储覆写或精确reparent时刻 |
| UX050旧公开API负 | 候选A publicfavorite两toggle只改★☆，pressedfalse/Save滞后，ownclick才Saved/true；旧4图保留，非真实模型/AT |
| 当前目录/读点 | 390en normal真实native Home/ArrowDown选分类、wheel由list保存850/windowbody0，文章返回/reload误差≤1；1440minimizedreload/只恢复一次后新wheel是第10合同，不冒父actual |
| 当前收藏/入口 | 同button ownclick及原publicAPI同步pressed/稳定题名label/Saved和焦点；favorites reload/removal/empty恢复。844short与1440实际Notes/Books、原notesDOM/值、4书保留 |
| 当前可读性/发现性 | 320zh/1440en最长标题完整wrap；投影标题16.4/摘要14.76/meta13.12，profile16.4/actions约14.75。摘要仍3行clamp；390/320 native、844short sidebar与profile/About章节仅命名实例；无外链跟随 |

独立命名关闭 **UX048** `closed_E15c_named_spatial_library_profile_type_title_actions_scope`、**UX049** `closed_E15c_bounded_library_scroll_article_return_reload_minimized_new_intent_scope`、**UX050** `closed_E15c_shared_public_and_button_bookmark_same_node_state_scope`。旧A/B失败、源快照和初8/9合同结果保留，不将早期前段通过外推reload，也不把初8+9+10叠计。BBox投影不是字形像素/WCAG通用字号门槛；无OSpicker/AT/实体设备认证，classic/fallback/contextloss恢复仍unknown。UX046仍open。

累计 **359状态 / 82族局部证据**（81partial+1measured；202source-only+25rendered），由条目复算；保持 **309族 / 369selector entries / 57journeys / 18roadmap**，完整族0/fullscore null。现停写供checkpoint与独立scorecard同步。


## v1.26 E16b：文章 AI 阅读层级、短屏与两个独立入口基线

导入 **2026-10-16T09:13:20+08:00**；[E16b source](evidence/batch-e16b-source.json)14源/QA/3runner共18项当前哈希及[provenance](evidence/batch-e16b-provenance.json)34项文件匹配。3生产CSS，B对A仅两条short声明；A三CSS快照仍匹配原manifest。**3个不同新合同12.2s**，不是initial35+A3+B3累加的新功能；initial35含旧13+19共32且全过，新3初期有toolbar入口fixture失败，诊断/原log保留。最终Hugo4008ms来自父回执，本Agent未运行。

[5primary contexts/16图](evidence/batch-e16b-provenance.json)由A未改桌面en+phonezh的2context6图，与B affected shortzh/320en/shorten的3context10图组成；不是B单跑5context。新增 **14条证据行**（含2条负历史、旧同状态新版复验），**0新功能/控件/族**：

| 证据片段 | 实际覆盖与限制 |
| --- | --- |
| UX051旧负 | 旧08d明确settled568×320选文后input/Send到404.23、无centerhit；A后续224held消息24.8125小于computedline25.2，原失败均保留，fixture诊断分开 |
| 原输入/引用/选文 | 五primary程序Range选真实公共长段落后实际Analyze，selectedText精确、草稿/同DOM/visiblefocus保留；实际reference wheel不动正文。B两short224held视口28.8125≥25.2；不是OS选文/键盘/UX046冷字体通过 |
| Clear/Send/Stop | A桌面/phonezh+B320en实际Clear保草稿；B两short224实际Send/44方形Stop，abort1。shortClear/跨256高度另属合同；desktopfine Send31不是44touch通过 |
| 字号/分享/快捷提示/页签 | supporting正文14/meta12/reference14；Share13字号/hover几何与programmaticfocus，未执行分享；Chip逐项可达/命中、tabs切换/geometry主要是第3合同，不冒父primary逐个点击实拍；Retry503恢复也仅该受控合同 |
| 文字对比 | A桌面intro/userquestion/userlabel三个opaque computed样本ratio6.1161026899074775；Share opacity/gradient样本invalid继续unknown，不外推整页 |

独立final已逐看A完成6图+B受影响10图，另A短屏partial两图保负历史；**UX051关闭命名 `closed_E16b_named_short_AI_selected_composer_Stop_full_line_scope`**，只限命名actual/合同范围，不授OSkeyboard/AT/fullmatrix/整族96。原abs历史selector不继承当前rc证据；引用与root仅支持对象，不新造按钮。

另各 **1条**：

- [照片Retry负基线](evidence/probe-space-photo-retry-provenance.json)：08d七immutable源，1440zh/reduce真实404→Retry自动滚动→held→原WebP200；Retry52.48×23.37且首error在clip外，点击自隐藏→focusBODY，下一实际Tab回photo内BUTTON。**UX052/P2 open**，不称trap/全Tab失败；没有实际等待网络timeout。成功图片不消除焦点问题。
- [Knowledge当前Open](evidence/probe-knowledge-open-provenance.json)：1440zh light+390en dark reduce，两context三kind各一次；真实pointer/程序focus后的实际Enter捕获可信意图，href/target/rel匹配当前node。全部preventDefault留#knowledge，未实际访问外部目标/打开popup，不认证全Tab/全部筛选。既存Open源码定位校准renderDetail:486/515，旧行/hash保历史。

本Agent核现有回执/哈希，本轮看10张既有代表PNG（另照片前三图前轮只读已看），无browser/构建/测试。累计 **373条state-evidence / 85族局部证据**（84partial+1measured；199source-only+25rendered），仍 **309族 / 369selector entries / 57journeys / 18roadmap**。这些是证据行和选择器条目数，完整族认证0、完整分null；UX046仍open。现停写供独立评分同步与父checkpoint。


## v1.27 E14：英文冷字体与阅读位置的有界取舍

导入 **2026-10-16T09:28:53+08:00**；[source contract](evidence/batch-e14b-production-contract.json)8源+QA/2runner均在[51项provenance](evidence/batch-e14b-production-provenance.json)中匹配，另核7原fontfixturebytes。生产只有`extend_head.html:45–49`新增5行：**EN `.IsPage && Typeposts`** 的原5family Google请求改optional；单篇`/projects/imstage/`实际也是Typeposts而同含，BEAROSsection原lean gate/ZH/home/localCJK/fontstack未改。新E16c AIJS WIP不在这8源内，字体图不认证它。

**保持373条item状态/85族**，不把字体硬挂到脚注marker/按钮；新增 **4条独立source-surface记录**，都`family_ids/control_ids=[]`，机器记录在JSON `e14b-production-font-import.surface_state_evidence`：

| Surface记录 | 命名实际证据 |
| --- | --- |
| `en-cold-style.loading` | 390en dark/reduce的fast/lateCSS即时/lateCSS+1200held；同context marker document/viewport、rootY/docH各delta0，sameNode/focus/hash/history保留 |
| `en-font404.error` | 原CSS200、font404，原文fallback和阅读点在before/terminal可见/稳定；不代表所有字体缺失平台 |
| `en-css404.error` | 原CSS404、fontrequests0，同marker/readpoint保留；不是noJS全流程 |
| `zh-settled-smoke.normal` | 一390zh light/normal标题、混排正文、inlinecode3图；本机SourceHanSerifSC/JetBrainsMono，非缺本地CJK字体/延迟注册稳定性证明 |

[5ENcold/13正式图](evidence/batch-e14b-production-actual.json)+[1ZHsmoke/3图](evidence/batch-e14b-production-zh-smoke.json)父全看，本Agent看4代表图。**更正元数据而不覆盖raw：** 原provenance误称fast也全Georgia/Courier；本Agent读CDP发现最终fast实际heading Georgia、正文Noto Serif、代码JetBrains Mono，before/terminal一致。后四late/404才Georgia/Courier。[显式erratum](evidence/batch-e14b-production-erratum.json)绑定原provenance/rawSHA及五行glyphmaps；五行各自delta0不受此文字更正影响。及时到达可用部分webfont，晚到可保fallback，是已说明的稳定阅读取舍；不是“总是fallback”或HTTPwarm/品牌字体保证。

[9served-head](evidence/batch-e14-production-served-head.json)只证明命名HTTP200头部URL/async/noscript parity，不等于9条字体旅程。initial4合同为3行为pass+1minified handler字串fixturefail4.4s；test-only语义load scope同一case1pass1.0s，原3行为tail/helper逐字节一致、未重跑，**合计4distinct**，不叠5新case。Hugo4153ms是父回执。初parent额外precode定位失败（原文只有inlinecode）保raw/script/log和3初图；B只修额外照片locator，未发生第二次生产字体修复。

UX046原冷字体负基线保留；独立final逐看16正式图后，仅命名关闭 **`closed_E14b_named_EN_posts_cold_font_delivery_readpoint_scope`**：五EN冷交付case阅读点/node/hash/history/focus稳定，ZH settled smoke只兼容观察。旧singleface/fullbundle discovery与humanChoice继续unreviewed/nonGold；phase PNG只证明命名时间，continuousFOIT/fullCLS/FPS、HTTPwarm、Safari/AT/实机、缺本地CJK字体与全矩阵仍unknown。computed`font`空串不当字号证明；CDP实际glyph归属独立。**309族/369selectors/373item状态/85族局部证据+4surface记录，完整族0/fullnull**。本Agent未运行browser/构建/测试；独立结论已对齐，现停止写入供checkpoint。
