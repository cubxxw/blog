# 全博客控件评分卡

更新：2026-10-16T01:13:13+08:00。截止：2026-10-16 12:00 Asia/Shanghai。量表 v1.0，基线 `6d7b9fe92a746a83e635282c9b78966920336a69`。

**当前没有足够证据宣称全站或每个按钮96+。所有功能总分保持 `unverified / null`；旧Space证据只覆盖已记录的本地Chromium状态。**

## 固定量表与分数计算

| 维度 | 权重 | 四项等权检查 |
| --- | ---: | --- |
| D1 任务清晰与信息层级 | 20% | 名称准确说明用户将得到什么，避免把技术实现当用户目标。；每个区域主动作突出，次级动作不争抢；顺序符合任务。；中英文、图标与开关文案一致，动作和结果用同一词汇。；操作后知道当前位置、下一步及返回方式。 |
| D2 命中与键盘无障碍 | 25% | 控件有稳定可访问名称、正确角色及有效ARIA引用。；全部功能可用键盘，复合控件遵守自身模式；焦点进入/返回/取消正确。；重要移动操作实际命中至少44×44；内联链接按24×24或合法例外单独判断。；焦点可见且不被遮挡；必要文字/图形对比度实际测量通过。 |
| D3 状态反馈与错误恢复 | 20% | 真实pending明确、限制重复提交；慢/挂起有可用出口。；仅真实成功后报成功，不用点击/计时器伪造完成。；失败说明可执行恢复，保留输入；空结果指明条件并可清除。；取消/关闭/切换后迟到结果不覆盖新意图、不抢焦点、不重复操作。 |
| D4 视觉一致性、边框与注意力 | 15% | 字号、行长、字重表达层级；重要文案在实际尺寸可读。；边框仅表示输入/分组/选择/状态，不叠加同级装饰围栏。；相同功能的状态、图标、间距和样式一致，主次允许有意义差异。；反馈位置稳定，主内容不被无关标签、徽章、重复CTA和装饰动效抢占。 |
| D5 动效舒适与性能 | 10% | 减少动态效果在初始和运行时切换均有效。；操作反馈跟随用户，避免叠加缩放/位移覆盖已有transform。；阅读、隐藏、弹窗/安静状态不持续做无关动画或GPU重绘。；反馈及时且不靠假等待；长操作状态可理解、可退出。 |
| D6 响应式与内容连续性 | 10% | 320×740、390×844、568×320、1440×900无关键遮挡和横向溢出。；断点/旋转/键盘出现与关闭后，焦点、滚动和主内容仍可达。；中英文长标签与200%缩放可用，不靠隐藏必要名称腾位置。；刷新、历史、语言、模式切换保持明确目标及适用的私人输入/节点。 |

每项检查仅使用固定锚点：0=不能完成；60=严重障碍需绕路；80=可完成但有明确摩擦；90=有少量可复现缺口；96=全部约定项目及边界实测通过；100=完整约定矩阵未观察到缺口。专家视觉判断必须单列，不能代替操作证据。

单控件总分为适用维度加权值；任何适用检查缺证据，分数为null。真正不适用项须写原因后重分权重，不得把失败或未知改成N/A。96+还须每维≥90且所有硬门槛pass。控件族取已验证子控件的最低分；只要有一个未知子项，族仍不能认证。全站目标要求每一项通过，不能用平均分掩盖单个坏按钮。显示分数只向下保留一位小数，95.99不能四舍五入成96。

## 硬门槛

| 门槛 | 失败后最高分 | 规则 |
| --- | ---: | --- |
| G1 主任务可达与键盘脱困 | 79 | 任一必要动作无法完成、键盘焦点陷阱、主入口不可发现且无等价可达路径。  |
| G2 名称、语义与焦点 | 79 | 交互控件没有可访问名称/必要关联，或异步结果强行夺走仍有效的编辑焦点。  |
| G3 状态真实与恢复 | 84 | 伪报成功、失败无可执行恢复、无期限busy且无退出/恢复路径。  |
| G4 命中、遮挡与必要对比 | 89 | 重要移动控件未达项目44×44目标且无等价操作；内容/焦点被遮挡；必要文字/图形对比失败。  |
| G5 减少动态效果与静止资源 | 89 | 减少动态效果未尊重，或阅读/隐藏状态持续运行无关动画/GPU重绘。  |
| G6 目标与私人内容连续性 | 79 | 深链/历史/语言/模式切换丢失明确目标，或丢失私人输入/已承诺保留的原节点。  |
| G7 证据完整性 | 不出分 | 任一适用状态、尺寸、语言/主题或依赖边界缺实测。 verified_score=null; status=unverified; certification_96_plus=false。不能拿95/96代替未知。 |

44×44是本项目**重要移动操作**的设计目标，不能把所有内联链接低于44误判为WCAG失败。WCAG2.5.8使用24×24及spacing/equivalent/inline等适用例外；每项需记适用性。焦点须可见且不被覆盖；必要文字与图形对比须测量，不能只看CSS声明。

## 证据与必测矩阵

- 类型分开记录：源码、轻量测试、历史浏览器回执、已检查截图、当前浏览器、实体设备、专家视觉判断。源码不等于实测。
- 基础尺寸：1440×900、390×844、320×740、568×320；按适用性覆盖中英、明暗、200%缩放、正常/减少动态效果。
- 操作状态：正常、hover（适用时）、pressed/selected、键盘focus、disabled、pending、success、empty、error/retry、cancel/迟到结果。导航另测历史/深链/语言；私人内容另测输入和原DOM连续性。
- 后端桩只证明界面合同，不证明真实邮件送达、付费模型质量或生产服务在线。不得实际发送订阅/联系消息或调用付费AI。
- 共享CSS/JS变化后，受影响旧截图降为历史参考，不能继续当最新视觉通过证据。

## 已发现缺口与当前状态

| ID | 控件族 | 问题 | 批次 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| UX-001 | `S.CAFE.PICKER` | 手机换景按钮缺名称且只剩chevron | A | `verified_specific_contracts_incomplete_matrix` |
| UX-002 | `S.CAFE.QUIET` | 安静开关缺视觉开启状态 | A | `verified_specific_contracts_incomplete_matrix` |
| UX-003 | `A.TOC.TABS`, `A.TOC.MOBILETABS` | 文章两套Tab只有点击，缺复合控件键盘模式 | B | `source_fixed_awaiting_browser` |
| UX-004 | `A.TOC.MOBILETABS` | 手机tabpanel指向不存在的标签ID | B | `source_fixed_awaiting_browser` |
| UX-005 | `A.BODY.CODECOPY` | 代码复制在Promise完成前伪报成功 | A | `verified_specific_contracts_incomplete_matrix` |
| UX-006 | `G.SHARE.DIRECT` | 文章链接复制拒绝后无恢复且提示未本地化 | C | `source_fixed_awaiting_browser` |
| UX-007 | `G.SUB.SUBMIT`, `G.SUB.EMAIL` | 订阅请求挂起会永久busy | C | `source_fixed_awaiting_browser` |
| UX-008 | `G.NAV.MOBILE` | 手机菜单缺Escape及明确关闭焦点规则 | B | `browser_found_transition_focus_gap_fix_pending` |
| UX-009 | `A.TOC.LINK` | TOC自动平滑滚动忽略减少动态效果 | B | `source_fixed_awaiting_browser` |
| UX-010 | `S.APP.reader.QUERY`, `S.APP.reader.FILTER` | 搜索空结果没有条件解释与恢复入口 | C | `source_fixed_awaiting_browser` |
| UX-011 | `A.BODY.CODECOPY`, `A.BODY.CODEEXPAND` | 新增复制失败说明与代码展开按钮重叠 | A-followup | `closed_for_recorded_C_cases_incomplete_family_matrix` |
| UX-012 | `T.BOOK.ASK`, `T.BOOK.SUGGEST`, `T.BOOK.INPUT`, `T.BOOK.SEND`, `A.FAQ.AI.OPEN`, `A.FAQ.AI.CHIP`, `A.FAQ.AI.INPUT`, `A.FAQ.AI.SEND`, `A.FAQ.AI.RETRY` | AI Markdown链接未做属性转义，可注入事件属性 | D-security | `closed_parser_and_recorded_entrypoint_scope` |

| UX-013 | `A.BODY.CODEEXPAND` | 全屏代码阅读器缺键盘焦点边界；源码确认，待Tab链实测 | D-followup | `browser_observed_body_focus_gap_wrap_fix_pending` |

| UX-014 | `A.TOC.FAB`, `A.TOC.MOBILETABS`, `A.TOC.LINK` | 关闭工具抽屉仅移出屏幕，仍进入Tab并trap；待浏览器复现 | B-followup | `source_fixed_awaiting_D2_browser` |

| UX-015 | `G.SEARCH.QUERY`, `G.SEARCH.FOLLOWUP` | AI旧回复成功后强制聚焦追问框 | D1-followup | `source_fixed_awaiting_D2_browser` |
| UX-016 | `A.BODY.FAQ`, `A.FAQ.AI.OPEN`, `A.FAQ.AI.SEND` | 收起外层FAQ没有取消正在生成的AI | D1-followup | `source_fixed_awaiting_D2_browser` |

| UX-017 | `T.BOOK.ASK/CLOSE/INPUT/SEND` | 书籍AI弹层只有Escape，无Tab焦点边界；待浏览器复现 | D2 | `browser_observed_body_focus_gap_wrap_fix_pending` |

| UX-018 | `T.SOCIAL.QR` | 二维码模态焦点与旧关闭回调重开风险，后续队列 | later-modal-queue | `source_confirmed_queued_browser_reproduction` |

| UX-019 | `MOTION.FAQ`, `A.BODY.FAQ` | reduceMotion缓存不响应运行时变更，后续窄范围复现 | later-motion-queue | `source_confirmed_queued_browser_reproduction` |

P1 `UX-012` 原属性逃逸已由三处renderer转义修复；独立运行6条parse5安全回归通过，源码/解析器层关闭，当前浏览器验收待补。另6条transport与4条clipboard意图单测通过（共16）。无浏览器或事件执行，无外部AI调用；不改变已冻结UX量表或临时创造分数。

## 有证据的单项锚点评分

以下分数只对表中检查片段与as-of证据负责，完整维度/控件/全站仍是null。历史源码诊断分用于排序，不能冒充当前运行时评分。96表示该片段的约定检查通过，不认证整个功能。

| 检查 | 维度片段 | 锚点分 | 依据与限制 | as-of / 置信度 |
| --- | --- | ---: | --- | --- |
| `CHK-A-PICKER-NAME` | `D2.1` | 96 | 390/320/568三个宽度均有稳定名称；44px命中另列。 | batch A frozen source / high |
| `CHK-A-PICKER-KEYBOARD` | `D2.2` | 96 | 已记录打开场景选择后Escape关闭并返回原触发器；只对这条取消链。 | batch A frozen source / high |
| `CHK-A-PICKER-TARGET` | `D2.3` | 96 | 390/320/568宽度中实际盒均44×44；未外推其他按钮。 | batch A frozen source / high |
| `CHK-A-QUIET-VISIBLE` | `D3.2` | 96 | 三个宽度pressed开启后背景明显反色且title改变，状态反馈和开关一致；不证明所有暂停资源。 | batch A frozen source / high |
| `CHK-A-QUIET-CONSISTENCY` | `D4.3` | 96 | 320px实图中quiet开启使用浅色实底，区别旁边未选图标；范围仅此状态对照。 | batch A frozen source / medium |
| `CHK-A-COPY-TRUTH` | `D3.2` | 96 | pending未伪报success；resolved与legacy true才完成，denial显示人工复制路径。仅桩结果，不证明实体剪贴板。 | batch A frozen source / high |
| `CHK-A-COPY-RECOVERY` | `D3.3` | 80 | 390px人工恢复说明右端被展开按钮覆盖；信息有方向但可读性受损。C布局已修，待新图关闭。 | batch A frozen source / high |
| `CHK-A-COPY-ATTENTION` | `D4.4` | 80 | 复制恢复说明与展开工具同占代码块右下角，用户不能清楚区分说明和工具区域。 | batch A frozen source / high |
| `CHK-A-COPY-MOBILE-TARGET` | `D2.3` | 96 | zh/en手机用例复制按钮高44px；桌面31.34px无需硬套移动44目标。 | batch A frozen source / high |
| `CHK-A-EMAIL-FOCUS` | `D2.4` | 96 | zh/en桌面/手机均实际focused/visible，边框改变并有3pxshadow；outline:none不构成缺陷。此分仅焦点可见片段，未量测对比或虚拟键盘。 | batch A frozen source / high |
| `CHK-A-WINDOW-PRESS` | `D5.2` | 96 | 最小化按钮按压前后44.28px边界稳定，未因全局scale跳动。 | batch A frozen source / high |
| `CHK-A-MAP-PRESS` | `D5.2` | 96 | 地图标记按压几何稳定；9.46px盒只证明未被transform覆盖，命中/spacing/等价区域列表须另测。 | batch A frozen source / high |
| `CHK-BASE-UX-001` | `D2.1` | 60 | 手机换景旧按钮唯一文字隐藏且图标aria-hidden，读屏需绕路；A专项已关闭此片段。 | baseline source before fixes / high |
| `CHK-BASE-UX-002` | `D3.2` | 80 | 旧quiet仅aria变化，视觉用户无法确认暂停状态；A已验证反色。 | baseline source before fixes / high |
| `CHK-BASE-UX-003` | `D2.2` | 60 | role=tab未实现方向键与roving模型，Tab/Enter仍能绕路；B改后待实际矩阵。 | baseline source before fixes / high |
| `CHK-BASE-UX-004` | `D2.1` | 60 | 旧aria-labelledby所指ID不存在，辅助技术缺关联；B改后待渲染验证。 | baseline source before fixes / high |
| `CHK-BASE-UX-005` | `D3.2` | 60 | 旧Promise未settle即成功，用户无法判断复制是否完成；A专项已关闭。 | baseline source before fixes / high |
| `CHK-BASE-UX-006` | `D3.3` | 60 | 旧clipboard拒绝无恢复说明；C已改源码待真实桩验收。 | baseline source before fixes / high |
| `CHK-BASE-UX-007` | `D3.1` | 60 | 旧fetch无超时，挂起submit一直disabled，必须刷新绕路；C改后待挂起和重试链。 | baseline source before fixes / high |
| `CHK-BASE-UX-008` | `D2.2` | 80 | 原菜单无Escape/返回焦点；B同步focus又撞visibility过渡，延迟guard正在修。 | baseline source before fixes / high |
| `CHK-BASE-UX-009` | `D5.1` | 60 | 旧TOC固定smooth无reduce分支；B源码改后待实际行为。 | baseline source before fixes / high |
| `CHK-BASE-UX-010` | `D1.4` | 80 | 旧无匹配仍说目录空，缺清条件入口，用户可手动删查询绕路；C待验收。 | baseline source before fixes / high |

| `CHK-SOURCE-CLOSED-SHEET` | `D2.2` | 60 | closed抽屉仅移到屏外，当前tab/目录仍可聚焦，keydown未检查open；源码诊断，实测待复现。 | current source / high |

| `CHK-C-COPY-SEPARATION` | `D6.1` | 96 | 四张当前图已逐张查看；文字Range rect和44px工具不相交，hit中心成功；仅关闭UX-011。横屏/200%与键盘边界仍未知。 | batch C / high |
| `CHK-C-COPY-ATTENTION` | `D4.4` | 90 | 恢复说明和44px工具已分出独立行，旧覆盖关闭；320zh与390en文字终点距工具仅约0.24/0.25px，仍显拥挤，后续可留更明确间距。此为视觉细化，不重新宣告叠压失败。 | batch C / medium |
| `CHK-C-COPY-CLEAN-READER` | `D3.4` | 96 | 四个C记录中从error打开fullscreen没有重复旧status；UX-013 focus边界未包含在该合同。 | batch C / high |


## D1 / D4 独立专家视觉判断

此处是已实际查看截图的局部设计判断，和真实操作验收分开；维度均按原四项等权计算，子项只使用固定锚点。历史图不可认证当前构建。

| 范围 | 维度 | 四子项 | 范围分 | 原因 | as-of / 置信度 |
| --- | --- | --- | ---: | --- | --- |
| S.BOOT | D4 | 96,90,80,96 | 90.5 | Memorable restrained terminal fits explicit brief;waiting text too dim,typography/label hierarchy still worth checking. Not full-control score. | Space checkpoint 6d7b9fe9 / 2026-10-15 recorded evidence / medium |
| S.CAFE | D4 | 90,90,80,90 | 87.5 | Clear main/secondary actions and real room;mobile tiny labels/unnamedchevron and top/bottom chrome need correction. Batch A changes mean these old visuals cannot certify current rendering. | Space checkpoint 6d7b9fe9 / 2026-10-15 recorded evidence / medium |
| S.WINDOW | D4 | 80,80,90,90 | 85.0 | Preserved place context and clear workspace;mobile window/monitor/editor boundaries stack,and secondarylabels small. Need current per-control measurements. | Space checkpoint 6d7b9fe9 / 2026-10-15 recorded evidence / medium |
| S.CAFE.PICKER/S.CAFE.QUIET | D4 | 90,96,96,90 | 93.0 | 风景图标与quiet反色让操作含义/状态更清晰；完整hover/focus/明暗/长英文字体矩阵未齐。 | batch A frozen source / medium |
| H.HERO.READ, H.HERO.PRODUCT, H.HERO.ABOUT, H.CHAT.BUBBLE | D1 | 90,80,90,90 | 87.5 | 首页阅读/产品CTA清楚；同一首屏同时出现6个聊天问题、10个社交入口与两条主路径，次级入口分量接近，初访任务选择有明确摩擦。建议先弱化协议/版本小字和社交围框，再以实际点击任务验证，不改变Bear主体。 | baseline before batch A / medium |
| H.HERO.SOCIAL, H.CHAT.BUBBLE, H.CHANNEL.TABS | D4 | 80,90,90,80 | 85.0 | 正文与主CTA易读；Digital Twin/协议/语气等小字明显低于主要文字，头像周围六个白色卡片与社交按钮围框共同争抢注意。D4.1降分针对这些辅助标记，不推断必要文字对比度失败；只建议先去低信息量标签或弱化辅助边界。 | baseline before batch A / medium |
| A.TOC.LINK, A.BODY.CODECOPY | D1 | 90,96,90,90 | 91.5 | 步骤标题、正文和右侧当前目录层级清楚；本截图为代码工具出现前基线，未展示复制入口和失败出口，不能据此评复制功能清晰度。 | baseline before batch A / medium |
| A.TOC.LINK, A.BODY.CODECOPY | D4 | 90,96,90,96 | 93.0 | 正文行长与段距稳定，代码框边界表达内容类型且没有装饰性多层围框；右侧目录较淡需量测必要对比。截图右侧代码横向截断是滚动容器可能行为，未测试不能报溢出缺陷。 | baseline before batch A / medium |
| S.CAFE.PICKER, S.CAFE.QUIET, S.CAFE.READ, S.CAFE.WORKSPACE | D1 | 90,96,90,90 | 91.5 | 两个主动作采用完整动词且主次明确；换景已改风景图标，quiet反色可识别。320px只靠风景图标发现换景用途仍有学习成本，地点标题与顶部换景为双入口，建议后续实测发现率再决定是否加短标签；不能仅凭偏好加更多HUD。 | batch A frozen source / medium |

优先顺序：先关闭P1渲染边界，再验证D批取消/超时恢复；C手机恢复说明不重叠与B菜单过渡焦点使用当前图/合同关闭。设计细化首先减少首页低信息量协议小字和重复围框；保留Bear主表达与Space终端/猫的编排，不以CSS文件数量或个人偏好批量删除动效。

## 完整可追踪覆盖（inventory v1.3 一对一映射）

| 稳定族ID | 范围 | 子选择器数 | 总分 | 已知缺口 |
| --- | --- | ---: | --- | --- |
| `G.NAV.SKIP` | 跳到正文 | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.HOME` | CUBXXW 品牌/首页 | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.MENU` | 文章/专栏/AI Agent/工程/成长/空间 | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.SEARCH` | 搜索/⌘ K | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.THEME` | 浅色/深色 | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.LANG` | 中文/EN | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.MOBILE` | 打开/关闭导航 | 1 | `unverified / null` | UX-008 |
| `G.NAV.ANCHOR` | 原生页内锚点 | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.TOP` | 返回顶部/进度环 | 1 | `unverified / null` | 待逐项实测 |
| `G.NAV.WAYFINDER` | 章节侧边索引 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.CLOSE` | 关闭搜索 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.QUERY` | 搜索文章 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.RESULT` | 搜索结果/键盘上下移动 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.AI` | AI 搜索开关 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.SUGGEST` | 入门推荐/AI Agent/最新文章 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.AICLOSE` | 关闭 AI 搜索 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.FULL` | 完整搜索页面 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.PAGE` | 完整搜索输入/结果 | 1 | `unverified / null` | 待逐项实测 |
| `G.SUB.EMAIL` | 订阅邮箱 | 1 | `unverified / null` | UX-007 |
| `G.SUB.SUBMIT` | 订阅 | 1 | `unverified / null` | UX-007 |
| `G.SUB.FEED` | RSS/JSON/OPML/频道 | 1 | `unverified / null` | 待逐项实测 |
| `G.FOOTER.LINKS` | 内容/产品/作者/社交入口 | 2 | `unverified / null` | 待逐项实测 |
| `G.FOOTER.MORE` | 更多作品/其他平台 | 1 | `unverified / null` | 待逐项实测 |
| `G.CONTACT.QR` | 微信/小红书二维码/复制 ID | 1 | `unverified / null` | 待逐项实测 |
| `H.HERO.READ` | 开始阅读 | 1 | `unverified / null` | 待逐项实测 |
| `H.HERO.PRODUCT` | 探索产品 | 1 | `unverified / null` | 待逐项实测 |
| `H.HERO.ABOUT` | 认识我/关于我 | 1 | `unverified / null` | 待逐项实测 |
| `H.HERO.SOCIAL` | 社交图标链接 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.OPEN` | Bear 头像 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.BUBBLE` | 环绕问题气泡 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.QUICK` | 快捷问题 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.INPUT` | 给 Bear 的消息 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.SEND` | 发送消息 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.CLEAR` | 清空对话 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.CLOSE` | 关闭对话 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHAT.RETRY` | 重试这条消息 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHANNEL.TABS` | 写作频道标签 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHANNEL.PREV` | 上一个频道 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHANNEL.NEXT` | 下一个频道 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHANNEL.MORE` | 查看全部文章 | 1 | `unverified / null` | 待逐项实测 |
| `H.CHANNEL.CARD` | 频道内文章卡片 | 1 | `unverified / null` | 待逐项实测 |
| `H.BOOK.LINK` | 书籍封面/阅读 | 1 | `unverified / null` | 待逐项实测 |
| `H.PRODUCT.CARD` | 产品主卡片 | 1 | `unverified / null` | 待逐项实测 |
| `H.PRODUCT.OPEN` | 打开产品/GitHub | 1 | `unverified / null` | 待逐项实测 |
| `H.ACTIVITY.STATS` | 总文章/今年/年数/标签 | 1 | `unverified / null` | 待逐项实测 |
| `H.ACTIVITY.YEAR` | 热力图年份 | 1 | `unverified / null` | 待逐项实测 |
| `H.ACTIVITY.DAY` | 热力图日期格子 | 1 | `unverified / null` | 待逐项实测 |
| `H.ACTIVITY.RECENT` | 最近文章 | 1 | `unverified / null` | 待逐项实测 |
| `L.FILTER.TOPIC` | 全部/AI Agent/工程/成长/项目 | 1 | `unverified / null` | 待逐项实测 |
| `L.FILTER.MORE` | 更多筛选 | 1 | `unverified / null` | 待逐项实测 |
| `L.FILTER.TAG` | 标签选项 | 1 | `unverified / null` | 待逐项实测 |
| `L.FILTER.SORT` | 排序 | 1 | `unverified / null` | 待逐项实测 |
| `L.FILTER.RESET` | 清除筛选/重置 | 1 | `unverified / null` | 待逐项实测 |
| `L.CARD.OPEN` | 文章标题/封面 | 1 | `unverified / null` | 待逐项实测 |
| `L.CARD.MORE` | 加载更多/下一页 | 1 | `unverified / null` | 待逐项实测 |
| `L.CARD.PAGINATION` | 继续加载文章/下一页 | 1 | `unverified / null` | 待逐项实测 |
| `L.TAXONOMY.TAG` | 标签/分类入口 | 1 | `unverified / null` | 待逐项实测 |
| `L.TAXONOMY.COLUMN` | 专栏卡片 | 1 | `unverified / null` | 待逐项实测 |
| `L.ARCHIVE.YEAR` | 归档年份 | 1 | `unverified / null` | 待逐项实测 |
| `L.ARCHIVE.POST` | 归档文章 | 1 | `unverified / null` | 待逐项实测 |
| `A.META.AUTHOR` | 作者卡/日期/语言/分类/标签 | 4 | `unverified / null` | 待逐项实测 |
| `A.META.SOURCE` | 编辑本文/查看源文 | 1 | `unverified / null` | 待逐项实测 |
| `A.TOC.TABS` | 目录/系列/AI 阅读标签 | 1 | `unverified / null` | UX-003 |
| `A.TOC.LINK` | 目录标题项 | 1 | `unverified / null` | UX-009 |
| `A.TOC.FAB` | 移动阅读工具 | 1 | `unverified / null` | 待逐项实测 |
| `A.TOC.MOBILETABS` | 目录/系列/AI/分享 | 1 | `unverified / null` | UX-003, UX-004 |
| `A.TOC.SERIES` | 系列列表/上一下一篇/更多系列 | 3 | `unverified / null` | 待逐项实测 |
| `A.TOC.SERIESMORE` | 查看系列全部篇数 | 1 | `unverified / null` | 待逐项实测 |
| `A.AI.CHIP` | 总结/原句/关联/质疑/入门/延伸/系列视角 | 2 | `unverified / null` | 待逐项实测 |
| `A.AI.INPUT` | 文章问题 | 2 | `unverified / null` | 待逐项实测 |
| `A.AI.SEND` | 发送问题 | 2 | `unverified / null` | 待逐项实测 |
| `A.AI.STOP` | 停止回答 | 1 | `unverified / null` | 待逐项实测 |
| `A.AI.CONTEXTCLEAR` | 移除引用上下文 | 1 | `unverified / null` | 待逐项实测 |
| `A.AI.RETRY` | 重试 | 1 | `unverified / null` | 待逐项实测 |
| `A.AI.FOLLOWUP` | 继续提问建议 | 1 | `unverified / null` | 待逐项实测 |
| `A.AI.SHARE` | 分享阅读洞见 | 2 | `unverified / null` | 待逐项实测 |
| `A.SELECTION.SHARE` | 选文分享 | 1 | `unverified / null` | 待逐项实测 |
| `A.SELECTION.AI` | 解释选中段落 | 1 | `unverified / null` | 待逐项实测 |
| `A.SELECTION.COMMENT` | 评论选中段落 | 1 | `unverified / null` | 待逐项实测 |
| `A.SELECTION.MORE` | 更多/复制引用/复制定位链接/清除 | 4 | `unverified / null` | 待逐项实测 |
| `A.SELECTION.COMMENTDRAWER` | 评论抽屉关闭/复制/继续阅读 | 3 | `unverified / null` | 待逐项实测 |
| `A.BODY.LINK` | 正文/脚注/参考资料/文内锚点 | 1 | `unverified / null` | 待逐项实测 |
| `A.BODY.IMAGE` | 图片放大/关闭 | 2 | `unverified / null` | 待逐项实测 |
| `A.BODY.CODECOPY` | 复制代码 | 1 | `unverified / null` | UX-005, UX-011 |
| `A.BODY.CODEEXPAND` | 代码全屏/字体缩放/关闭 | 4 | `unverified / null` | UX-011 |
| `A.BODY.FAQ` | FAQ 折叠 | 1 | `unverified / null` | 待逐项实测 |
| `A.BODY.NOTES` | 月度思考段落定位 | 1 | `unverified / null` | 待逐项实测 |
| `A.BODY.LINKPREVIEW` | 链接预览 | 1 | `unverified / null` | 待逐项实测 |
| `A.BODY.FOOTNOTEPREVIEW` | 脚注预览/继续到脚注 | 1 | `unverified / null` | 待逐项实测 |
| `A.FOOTER.NEXT` | 上一篇/下一篇/相关文章/专栏结尾 | 3 | `unverified / null` | 待逐项实测 |
| `G.SHARE.ENTRY` | 生成分享卡/微信分享 | 2 | `unverified / null` | 待逐项实测 |
| `G.SHARE.DIRECT` | X/Email/复制链接 | 2 | `unverified / null` | UX-006 |
| `G.SHARE.CLOSE` | 关闭卡片编辑器 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.THEME` | 卡片主题颜色 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.MODE` | 当前回答/全部回答 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.COPYIMAGE` | 复制图片 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.SAVE` | 下载图片 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.SYSTEM` | 系统分享 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.COPYTEXT` | 复制文本/引用/原文链接 | 2 | `unverified / null` | 待逐项实测 |
| `G.SHARE.SOURCE` | 分享到X/返回原文 | 2 | `unverified / null` | 待逐项实测 |
| `S.BOOT.HOME` | 终端品牌返回首页 | 1 | `unverified / null` | 待逐项实测 |
| `S.BOOT.READ` | 先读文章 | 1 | `unverified / null` | 待逐项实测 |
| `S.BOOT.SKIP` | 准备中/进入/打开工作区 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.HOME` | Space Café 品牌 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.LANGUAGE` | EN/中 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.QUIET` | 安静模式 | 1 | `unverified / null` | UX-002 |
| `S.CAFE.PICKER` | 换个地方/当前地点/换个风景 | 1 | `unverified / null` | UX-001 |
| `S.CAFE.THEME` | 六个场景卡片 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.PICKERCLOSE` | 关闭场景选择 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.SEAT` | 回到座位 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.TERRACE` | 去露台看看 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.REPLAY` | 重播入场 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.READ` | 坐下读一篇 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.WORKSPACE` | 打开工作区 | 1 | `unverified / null` | 待逐项实测 |
| `S.CAFE.RETURN` | 回到咖啡馆 | 1 | `unverified / null` | 待逐项实测 |
| `S.WORLD.LOOK` | 拖动环顾 | 1 | `unverified / null` | 待逐项实测 |
| `S.WORLD.WALK` | 方向键/WASD/触控四方向 | 1 | `unverified / null` | 待逐项实测 |
| `S.WORLD.COMPUTER` | 真实三维电脑屏幕 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.OS` | CUBXXW OS菜单 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.HOME` | 欢迎与关于我 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.LAUNCH` | 所有应用 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.SEARCH` | 搜索/⌘K | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.OVERVIEW` | 窗口概览 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.ARRANGE` | 窗口并排/整理窗口 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.DESKTOP` | 显示桌面 | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.LAB` | Product Lab | 1 | `unverified / null` | 待逐项实测 |
| `S.MENU.BLOG` | 返回博客 | 1 | `unverified / null` | 待逐项实测 |
| `S.DOCK.APP` | 11 Apps入口/运行状态 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.CLOSE` | 关闭窗口 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.MINIMIZE` | 最小化 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.MAXIMIZE` | 最大化/恢复 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.ARRANGE` | 窗口并排 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.DRAG` | 标题栏拖动 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.RESIZE` | 右/下/角缩放 | 1 | `unverified / null` | 待逐项实测 |
| `S.WINDOW.OVERVIEWITEM` | 窗口概览项 | 1 | `unverified / null` | 待逐项实测 |
| `S.SEARCH.QUERY` | 打开应用或找文章 | 1 | `unverified / null` | 待逐项实测 |
| `S.SEARCH.RESULT` | 结果项 | 1 | `unverified / null` | 待逐项实测 |
| `S.SEARCH.EMPTY` | 清空搜索/浏览所有应用 | 1 | `unverified / null` | 待逐项实测 |
| `S.SEARCH.CLOSE` | Esc/关闭搜索 | 1 | `unverified / null` | 待逐项实测 |
| `S.LAUNCH.QUERY` | 查找应用 | 1 | `unverified / null` | 待逐项实测 |
| `S.LAUNCH.APP` | 应用磁贴/查看所有应用 | 2 | `unverified / null` | 待逐项实测 |
| `S.LAUNCH.CLOSE` | 完成/Esc | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.welcome.ENTER` | 进入空间 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.welcome.ROUTES` | 文章/作品/AI向导/关于我 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.welcome.PROFILE` | 个人档案/这些年/阅读地图/展开履历 | 2 | `unverified / null` | 待逐项实测 |
| `S.APP.welcome.LINKS` | 简历/GitHub/联系/公开JSON/时间线 | 2 | `unverified / null` | 待逐项实测 |
| `S.APP.products.SELECT` | 产品侧栏选择 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.products.OPEN` | 真实产品/预览/源码/相关写作 | 2 | `unverified / null` | 待逐项实测 |
| `S.APP.reader.QUERY` | 筛选文章 | 1 | `unverified / null` | UX-010 |
| `S.APP.reader.FILTER` | 全部/AI/工程/思考/收藏 | 1 | `unverified / null` | UX-010 |
| `S.APP.reader.ITEM` | 文章列表项 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.reader.NAV` | 返回目录/原文 | 2 | `unverified / null` | 待逐项实测 |
| `S.APP.reader.FAVORITE` | 收藏/已收藏 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.reader.EXPLAIN` | 解释选中内容 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.FILTER` | 地区筛选 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.SELECT` | 打开照片 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.NAV` | 返回/上一张/下一张 | 3 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.RETRY` | 重试照片 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.LOAD` | 加载Immich/刷新/重试连接 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.MORE` | 继续加载相册 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.photos.PLACE` | 去过的地方/查看旅行区域 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.map.PIN` | 地图区域标记 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.map.REGION` | 区域列表 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.map.VIEW` | 拖动/键盘平移地图 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.map.ZOOM` | 放大/缩小/全部/世界 | 3 | `unverified / null` | 待逐项实测 |
| `S.APP.map.RELATED` | 相关照片/游记/数据许可 | 3 | `unverified / null` | 待逐项实测 |
| `S.APP.books.READ` | 开始阅读 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.notes.EDITOR` | 本地笔记 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.notes.EXPORT` | 导出.md | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.notes.SANDBOX` | 保存到沙盒 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.contact.DRAFT` | 留言草稿 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.contact.CHANNEL` | 邮件/GitHub公开留言/WhatsApp/社交 | 3 | `unverified / null` | 待逐项实测 |
| `S.APP.terminal.COMMAND` | 命令输入/help/history/run | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.NEW` | 新对话 | 2 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.HISTORY` | 历史/关闭历史 | 2 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.SESSIONQUERY` | 查找之前聊过的内容 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.SESSION` | 历史会话项 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.EXPORT` | 导出记录 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.CONTEXT` | 当前页面/选文上下文 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.INPUT` | 给空间助手的任务 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.VOICE` | 语音输入 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.SEND` | 发送 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.STOP` | 停止 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.ACTIVITY` | 任务执行过程/工具步骤 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.settings.LANG` | 中文/English | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.settings.THEME` | 经典浅色/深色 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.settings.COLOR` | 青绿/暮蓝/鼠尾草 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.settings.EXPORT` | 导出工作区 | 1 | `unverified / null` | 待逐项实测 |
| `S.LAB.SWITCH` | CUBXXW OS/Product Lab双向切换 | 1 | `unverified / null` | 待逐项实测 |
| `S.LAB.FEATURE` | 推荐产品/所有产品锚点 | 1 | `unverified / null` | 待逐项实测 |
| `S.LAB.PRODUCT` | 产品截图/打开产品/预览/源码 | 2 | `unverified / null` | 待逐项实测 |
| `S.LAB.KNOWLEDGE` | 进入知识空间 | 1 | `unverified / null` | 待逐项实测 |
| `S.KNOWLEDGE.BACK` | 返回Product Lab | 1 | `unverified / null` | 待逐项实测 |
| `S.KNOWLEDGE.FILTER` | 全部/产品/写作/系列 | 1 | `unverified / null` | 待逐项实测 |
| `S.KNOWLEDGE.NODE` | 可聚焦节点标签 | 1 | `unverified / null` | 待逐项实测 |
| `S.KNOWLEDGE.OPEN` | 打开当前条目 | 1 | `unverified / null` | 待逐项实测 |
| `S.KNOWLEDGE.RELATED` | 相邻条目/浏览写作 | 2 | `unverified / null` | 待逐项实测 |
| `T.HERO.EXPLORE` | 探索世界/Polarsteps | 1 | `unverified / null` | 待逐项实测 |
| `T.MAP.PIN` | 世界地图地区点 | 1 | `unverified / null` | 待逐项实测 |
| `T.MAP.REGION` | 区域游记文章卡 | 2 | `unverified / null` | 待逐项实测 |
| `T.BOOK.READ` | 书脊/封面 | 1 | `unverified / null` | 待逐项实测 |
| `T.BOOK.ASK` | 和这本书聊聊 | 1 | `unverified / null` | 待逐项实测 |
| `T.BOOK.CLOSE` | 关闭书籍AI | 1 | `unverified / null` | 待逐项实测 |
| `T.BOOK.SUGGEST` | 书籍建议/追问 | 1 | `unverified / null` | 待逐项实测 |
| `T.BOOK.INPUT` | 书籍问题 | 1 | `unverified / null` | 待逐项实测 |
| `T.BOOK.SEND` | 发送书籍问题 | 1 | `unverified / null` | 待逐项实测 |
| `T.SOCIAL.QR` | 社交二维码/复制ID/关闭 | 2 | `unverified / null` | 待逐项实测 |
| `T.SOCIAL.LINK` | 社交平台链接 | 1 | `unverified / null` | 待逐项实测 |
| `B.HERO.ACTION` | 经历/文章 | 1 | `unverified / null` | 待逐项实测 |
| `B.HERO.CAROUSEL` | 人物照片轮播/命名照片选项 | 2 | `unverified / null` | 待逐项实测 |
| `B.STORY.CAROUSEL` | 旅程横向照片/选项/展开文字 | 3 | `unverified / null` | 待逐项实测 |
| `B.IDENTITY.LINKS` | 简历/公开资料/联系/产品 | 1 | `unverified / null` | 待逐项实测 |
| `B.INTERVIEW.START` | AI采访主题/返回/关闭 | 3 | `unverified / null` | 待逐项实测 |
| `Q.STORY.START` | 进入故事/从头开始/文字版 | 3 | `unverified / null` | 待逐项实测 |
| `Q.STORY.PAUSE` | 暂停/慢走/正常/加速 | 2 | `unverified / null` | 待逐项实测 |
| `Q.STORY.MOVE` | 方向键/跳跃/触控移动 | 1 | `unverified / null` | 待逐项实测 |
| `Q.STORY.LEVEL` | 文章关卡块/文章卡 | 2 | `unverified / null` | 待逐项实测 |
| `Q.STORY.REPLAY` | 再走一遍/去读文字/跳过 | 3 | `unverified / null` | 待逐项实测 |
| `E.404.HOME` | 返回主页/浏览文章/推荐文章 | 2 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.context-budget` | 上下文预算 | 3 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.agent-loop` | Agent循环 | 4 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.effect-recovery` | 副作用恢复 | 3 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.flow-bottleneck` | 流动瓶颈 | 4 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.gitops-reconcile` | GitOps对账 | 4 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.memory-lineage` | 记忆来源 | 2 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.notification-threshold` | 通知阈值 | 4 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.reliability-chain` | 可靠性链 | 5 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.session-tree` | 会话树 | 2 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.session-scope` | 会话作用域 | 1 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.vector-cosine` | 向量余弦 | 5 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.task-cost` | 任务成本 | 2 | `unverified / null` | 待逐项实测 |
| `X.INTERACTIVE.RESET` | 重置图示/参考说明/来源 | 3 | `unverified / null` | 待逐项实测 |
| `X.GALAXY.NODE` | 知识星图节点/中心 | 1 | `unverified / null` | 待逐项实测 |
| `X.EMBED.LINKS` | Buy Me a Coffee外部支持组件 | 1 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.WALLS` | 抹灰墙/木梁/落地窗立柱 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.FLOOR` | 木地板/接缝/露台地板 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.RUG` | 编织地毯 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.TABLE` | 圆桌/纸页/陶杯 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.CHAIR` | 椅背/坐垫/椅腿 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.SHELF` | 书架/彩色书脊 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.BAR` | 咖啡吧/机器/杯碟 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.DESK` | 书桌/键盘/杯子/鼠标 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.PHOTO` | 桌上旅行照片/相框 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.LIGHT` | 吊灯/太阳/阴影 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.PLANT` | 盆栽/陶瓶 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.SKY` | 天空/雾/远景 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.GARDEN` | 庭院/月洞门/竹/苔藓/石 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.TREES` | 树木/树叶实例/岩石 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.MOUNTAIN` | 分层群山 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.WATER` | 水面/波纹 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.RAIN` | 雨粒子/街景/路灯 | 0 | `unverified / null` | 待逐项实测 |
| `S.OBJECT.CAT` | 小猫/眼睛/骨骼/接触影 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.BOOT` | 终端光标/真实步骤/揭幕 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.CAMERA` | 进电脑/离开/座位/露台镜头 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.CAT` | 小猫步态/尾巴/观察/停留 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.WEATHER` | 雨粒/水波 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.ENTRY` | 欢迎方块/轨道/窗口入场 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.DOCK` | Dock hover 提起图标 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.WINDOW` | 窗口开关/最小化/拖拽/缩放/并排 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.HOMEFIELD` | 首页背景场/球体 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.HOMEBUBBLES` | 头像周围建议气泡 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.HOMEREVEAL` | 首页分区 reveal | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.MICRO` | 涟漪/悬浮/磁吸/反馈 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.CARDTILT` | 卡片鼠标倾斜 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.COVER` | 封面视差 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.READPROGRESS` | 文章阅读进度/返回顶环 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.WAYFINDER` | 章节索引安静/唤醒 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.LINKPREVIEW` | 链接/脚注预览显隐 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.TRAVELREVEAL` | 旅行分区 reveal | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.KNOWLEDGE` | Canvas/WebGPU关系场/指针响应 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.ABOUTCAROUSEL` | 照片横向滚动 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.QUEST` | 游戏行走/金币/跳跃/爬山/滑索 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.404` | 404漂浮画面 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.CHATSTREAM` | AI流式文字/运行步骤/停止 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.INTERACTIVE` | 12类模型图示播放/步骤/响应 | 0 | `unverified / null` | 待逐项实测 |
| `S.APP.reader.SUMMARIZE` | 总结这篇文章 | 1 | `unverified / null` | 待逐项实测 |
| `T.BOOK.RETRY` | 重试书籍问题 | 1 | `unverified / null` | 待逐项实测 |
| `X.EMBED.CALENDLY` | 预约时间外部浮钮/日历 | 2 | `unverified / null` | 待逐项实测 |
| `X.EMBED.POLARSTEPS` | 嵌入旅行轨迹 | 1 | `unverified / null` | 待逐项实测 |
| `X.EMBED.OPENSOURCE` | 开源项目列表链接 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.FOLLOWUP` | AI追问输入/发送 | 2 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.RETRY` | AI搜索重试 | 1 | `unverified / null` | 待逐项实测 |
| `G.SEARCH.CONTACT` | 打开微信名片 | 1 | `unverified / null` | 待逐项实测 |
| `G.CONTACT.CLOSE` | 关闭联系卡 | 1 | `unverified / null` | 待逐项实测 |
| `G.CONTACT.COPY` | 复制账号 | 1 | `unverified / null` | 待逐项实测 |
| `G.CONTACT.VIEW` | 查看二维码大图/打开主页 | 2 | `unverified / null` | 待逐项实测 |
| `G.SHARE.MORE` | 更多/收起分享渠道 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.WEBSHARE` | 系统分享文章 | 1 | `unverified / null` | 待逐项实测 |
| `G.SHARE.PLATFORMS` | X/Email/LinkedIn/Telegram/WhatsApp/Reddit/微博/B站/知乎/小红书/HN/Facebook | 2 | `unverified / null` | 待逐项实测 |
| `A.BODY.DISCLOSURE` | 收起长折叠内容 | 1 | `unverified / null` | 待逐项实测 |
| `A.FAQ.AI.OPEN` | 继续问AI | 1 | `unverified / null` | 待逐项实测 |
| `A.FAQ.AI.CHIP` | FAQ建议问题 | 1 | `unverified / null` | 待逐项实测 |
| `A.FAQ.AI.INPUT` | FAQ追问输入 | 1 | `unverified / null` | 待逐项实测 |
| `A.FAQ.AI.SEND` | FAQ追问发送 | 1 | `unverified / null` | 待逐项实测 |
| `A.FAQ.AI.RETRY` | FAQ追问重试 | 1 | `unverified / null` | 待逐项实测 |
| `A.COMMENTS.EXTERNAL` | 登录/排序/回复/反应/评论输入与提交 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.RETRY` | 作为新任务重试 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.APPROVE` | 批准执行 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.DECLINE` | 拒绝 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.CHIP` | 聊产品/最新写作/某地旅程 | 1 | `unverified / null` | 待逐项实测 |
| `S.APP.agent.LINK` | 回答中的文章/产品/照片/地点入口 | 1 | `unverified / null` | 待逐项实测 |
| `B.INTERVIEW.CONSENT` | 同意复选框/开始采访 | 2 | `unverified / null` | 待逐项实测 |
| `B.INTERVIEW.ANSWER` | 采访回答输入 | 1 | `unverified / null` | 待逐项实测 |
| `B.INTERVIEW.SEND` | 发送采访回答 | 1 | `unverified / null` | 待逐项实测 |
| `B.INTERVIEW.RESTART` | 再来一次 | 1 | `unverified / null` | 待逐项实测 |
| `B.INTERVIEW.RETRY` | 重试/打开独立采访页 | 2 | `unverified / null` | 待逐项实测 |
| `MOTION.NEWSLETTER` | 订阅熊眼睛追踪/成功反应 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.CONTACTQR` | 二维码扫描线/联系卡显隐 | 0 | `unverified / null` | 待逐项实测 |
| `MOTION.FAQ` | FAQ高度展开/AI面板/流式回答 | 0 | `unverified / null` | 待逐项实测 |

已一对一导入 **309项**：265控件族、26动画、18场景物体；**356个selector级control_id**。这不是运行时每个重复数据行实例计数。全部ID与原inventory保持一致，完整子控件、状态和适用性在scorecard.json。当前0项认证96+；未知保持null。

非交互物体/动画的D2可有理由N/A；关联实际控件单独审查。第三方评论/Calendly/BMC/Polarsteps只登记宿主，外部内部控件仍未实测，不能声称全覆盖。

### 批次A独立复核

20条浏览器合同检查已读，0条页面JS异常；接受确切记录的复制pending/success/reject/legacy、手机换景名称/44px命中/Escape返回、quiet反色、地图/窗口按压位置。代码复制使用网络/Clipboard桩，不证明真实外部写入。

- `UX-001/002/005`对应缺口已通过具体合同检查，总分仍因矩阵缺项为null。
- 邮箱outline:none已有可见边框+3px阴影，不重复加focus环。
- 地图标记9.46×9.46只通过“按压不跳”，目标尺寸须另查等价列表/间距例外。
- **新增UX-011**：已实际查看390px复制失败PNG，代码展开按钮盖住说明末尾；暂保持最高89，需320/390px错误态几何复核。
- `UX-003/004/008/009`批次B已见源码修复，等待父任务实际浏览器；其它项不随源码修复自动变高分。

仅本轮已检查的A图片：`after-cafe-quiet-320.png`、`after-code-failure-zh-mobile.png`、`after-email-focus.png`。320pxquiet/picker的D4局部专家判断为93.0，不是整族功能分数。

### 动效与边框建议

先对正文.reveal-block的14px/500ms入场和全局button ripple做窄范围真实对照，再决定收敛；共享反馈语义，阅读与Space保留各自已有视觉语汇。保留用户指定终端/咖啡主编排与有目的猫环境行为。所有纯设计建议仍须截图/实际操作支持，不以样式文件数量认定缺陷。

## 下一批实质改进与验收

1. A：确认真实复制pending/success/manual fallback，命名/quiet视觉状态和通用focus/transform不回归。
2. B：完成文章tabs/ARIA、手机菜单Escape与返回焦点、减少动态效果；用键盘走实际流程。
3. C：复制失败可恢复、订阅超时可重试、搜索无结果可清除，保留原输入。
4. D：按完整inventory逐族采集状态、尺寸、语言与主题矩阵，补齐首页/全局搜索/旅行/互动文章，逐项接受独立复核。

## 边界与引用

本评分Agent只读生产代码，唯一写入scorecard.md/json；未启动浏览器、服务、构建或实体设备。正式旧证据见 `docs/acceptance/2026-10-15-space-onboarding-local.md`。

[WCAG2.5.8最小目标尺寸](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)；[Clipboard.writeText结果语义](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)。

## C批叠压独立复核

2026-10-16T01:00:27+08:00：已读8条C视觉检查且逐张查看4张手机截图。320/390px、中英与明暗交叉配置中，文字Range和44px展开按钮不重叠，中心可命中，全屏不复制旧status；关闭UX-011在这些C状态的缺陷。相关copy CSS/JS哈希仍匹配C；editorial-tools.css与article-share-link.js已进入D修改，C不认证这些后续改动。UX-013全屏焦点、UX-014关闭抽屉键盘仍待修/实测。D4局部90：部分文案末端距离工具仅约0.24px，功能已清楚但可进一步留白；不因此伪称仍叠压。完整控件总分仍null。

源码边界补记：`blog-ai-inline.js` 当前虽加载，但模板与content无 `.blog-ai-container`，第三renderer属于dormant实现防御，不能计为已验收可见入口；UX-012当前可见范围为Travel书籍与FAQ AI。Travel二维码UX-018先排后续复现，不扩大已冻结批次。

## D1 独立复核

2026-10-16T01:10:00+08:00：已读冻结D1的5条浏览器回执、41文件manifest，并查看换到第二本书的截图。390分享迟到拒绝、1440书籍Stop/切书隔离、390FAQ Stop、1440搜索关闭取消均按记录通过（仅zh/light/reduce、zoom1、受控流和剪贴板）。这5个D3片段各96；完整功能/维度仍null。6条parse5安全回归与实际Travel/FAQ入口绑定关闭UX-012的已发现属性逃逸；恶意载荷只在纯解析器验证，未运行事件。D2已修改多份源文件，因此D1不能认证native dialog/closed-sheet/new focus行为，UX-013至017仍待D2。当前补测包含headers后stall与首delta后stall，18条安全/传输/分享回归在独立复核中通过。

书籍弹层截图的专家范围判断：D1子项96/96/90/96＝94.5；D4子项90/96/90/96＝93。只评该1440px初始态，不能扩为手机或完整功能分。

## D2a 失败保留

2026-10-16T01:11:13+08:00：已读focus-probe：Travel和代码全屏仍有Tab落到body的一跳，D2.2此片段80；native dialog已阻止背景交互，不能把body.inert=false解释为隐式inert失效，code-fs-stage是内部div也不能用其modal:false否定父dialog。UX-013/017保留待显式首尾wrap后重测，不因native标签关闭。FAQ外层collapse与Search新query保焦点由父任务报告已过，但本轮总脚本随后停止，待独立完整回执再认证。
