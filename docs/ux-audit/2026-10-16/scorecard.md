# 全博客控件评分卡

更新：2026-10-16T02:38:36+08:00。截止：2026-10-16 12:00 Asia/Shanghai。量表 v1.0，基线 `6d7b9fe92a746a83e635282c9b78966920336a69`。

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

测量单位：本卡“实际/投影后字号”和命中尺寸均为变换后的**浏览器视口CSSpx**，独立于DPR和屏幕硬件像素。原回执的legacy字段 `physicalFont` / `fontPhysical` 为兼容保留，含义仍是投影后显示CSSpx；44×44目标同理。模拟粗指针不是实体设备测试。

- 类型分开记录：源码、轻量测试、历史浏览器回执、已检查截图、当前浏览器、实体设备、专家视觉判断。源码不等于实测。
- 基础尺寸：1440×900、390×844、320×740、568×320；按适用性覆盖中英、明暗、200%缩放、正常/减少动态效果。
- 操作状态：正常、hover（适用时）、pressed/selected、键盘focus、disabled、pending、success、empty、error/retry、cancel/迟到结果。导航另测历史/深链/语言；私人内容另测输入和原DOM连续性。
- 后端桩只证明界面合同，不证明真实邮件送达、付费模型质量或生产服务在线。不得实际发送订阅/联系消息或调用付费AI。
- 共享CSS/JS变化后，受影响旧截图降为历史参考，不能继续当最新视觉通过证据。

## 已发现缺口与当前状态

最近已验checkpoint：`4782757e`（E6–E62）。E7/E7.1当前8hash/QA一致，无新P0/P1；初跑19/21保留，fixture修后9/9，最终21不同合同=未改12+修后9。UX025/026/027/031仅按各自已测范围关闭，OSIME、wheel-away失败等剩余边界不外推。



| ID | 控件族 | 问题 | 批次 | 当前状态 |
| --- | --- | --- | --- | --- |
| UX-001 | `S.CAFE.PICKER` | 手机换景按钮缺名称且只剩chevron | A | `closed_for_recorded_A_contracts_incomplete_family_matrix` |
| UX-002 | `S.CAFE.QUIET` | 安静开关缺视觉开启状态 | A | `closed_for_recorded_A_contracts_incomplete_family_matrix` |
| UX-003 | `A.TOC.TABS`, `A.TOC.MOBILETABS` | 文章两套Tab只有点击，缺复合控件键盘模式 | B | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-004 | `A.TOC.MOBILETABS` | 手机tabpanel指向不存在的标签ID | B | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-005 | `A.BODY.CODECOPY` | 代码复制在Promise完成前伪报成功 | A | `closed_for_recorded_A_contracts_incomplete_family_matrix` |
| UX-006 | `G.SHARE.DIRECT` | 文章链接复制拒绝后无恢复且提示未本地化 | C | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-007 | `G.SUB.SUBMIT`, `G.SUB.EMAIL` | 订阅请求挂起会永久busy | C | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-008 | `G.NAV.MOBILE` | 手机菜单缺Escape及明确关闭焦点规则 | B | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-009 | `A.TOC.LINK` | TOC自动平滑滚动忽略减少动态效果 | B | `closed_for_recorded_right_TOC_runtime_reduce_click_internal_autofollow_unverified` |
| UX-010 | `S.APP.reader.QUERY`, `S.APP.reader.FILTER` | 搜索空结果没有条件解释与恢复入口 | C | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-011 | `A.BODY.CODECOPY`, `A.BODY.CODEEXPAND` | 新增复制失败说明与代码展开按钮重叠 | A-followup | `closed_for_recorded_D3_cases_incomplete_family_matrix` |
| UX-012 | `T.BOOK.ASK`, `T.BOOK.SUGGEST`, `T.BOOK.INPUT`, `T.BOOK.SEND`, `A.FAQ.AI.OPEN`, `A.FAQ.AI.CHIP`, `A.FAQ.AI.INPUT`, `A.FAQ.AI.SEND`, `A.FAQ.AI.RETRY` | AI Markdown链接未做属性转义，可注入事件属性 | D-security | `closed_parser_and_recorded_entrypoint_scope` |
| UX-013 | `A.BODY.CODEEXPAND` | 全屏代码阅读器缺键盘焦点边界 | D-followup | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-014 | `A.TOC.FAB`, `A.TOC.MOBILETABS`, `A.TOC.LINK` | 关闭的文章工具抽屉仍可进入键盘顺序并捕获Tab | B-followup | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-015 | `G.SEARCH.QUERY`, `G.SEARCH.FOLLOWUP` | AI旧回复成功后强制聚焦追问框 | D1-followup | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-016 | `A.BODY.FAQ`, `A.FAQ.AI.OPEN`, `A.FAQ.AI.SEND` | 收起外层FAQ没有取消正在生成的AI | D1-followup | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-017 | `T.BOOK.ASK`, `T.BOOK.CLOSE`, `T.BOOK.INPUT`, `T.BOOK.SEND` | 书籍AI模态未约束键盘焦点在弹层内 | D2 | `closed_for_recorded_D2b_contracts_incomplete_family_matrix` |
| UX-018 | `T.SOCIAL.QR` | 旅行二维码打开后焦点留在背景，正常动效快速重开被旧关闭隐藏 | later-bounded-TravelQR-after-E7 | `confirmed_recorded_390_zh_two_media_focus_failure_and_normal_reopen_race` |
| UX-019 | `MOTION.FAQ`, `A.BODY.FAQ` | 运行时开启减少动态效果后FAQ仍沿用旧WAAPI动画分支 | later-motion-queue | `closed_for_recorded_E52_runtime_motion_hidden_focus_cancel_cases` |
| UX-020 | `T.BOOK.SEND`, `T.BOOK.SUGGEST` | 书籍手机发送/建议按钮仍偏小且长问题出现孤行 | later-mobile-polish | `closed_for_recorded_D4b_contracts_incomplete_family_matrix` |
| UX-021 | `S.WINDOW.DRAG`, `S.WINDOW.CLOSE`, `S.APP.notes.EDITOR`, `S.APP.map.REGION` | Space工作区整体缩小且透明边界叠加，桌面文字发软 | next-Space-readability | `closed_for_E5_primary_reading_and_plane_scope_chrome_matrix_unknown` |
| UX-022 | `S.APP.map.ZOOM` | 手机地图缩放按钮仅22px宽 | next-Space-readability | `closed_for_recorded_E52_620_and_844_coarse_target_boundaries` |
| UX-023 | `S.WINDOW.CLOSE`, `S.CAFE.RETURN`, `S.WINDOW.ARRANGE`, `S.CAFE.PICKER` | 短横屏café HUD截获窗口关闭/并排入口 | E5-shortheight-followup | `closed_for_recorded_E52_568_bilingual_and_844_coarse_HUD_paths` |
| UX-024 | `S.WINDOW.ARRANGE`, `S.WINDOW.OVERVIEWITEM`, `S.WINDOW.CLOSE`, `S.WINDOW.MAXIMIZE` | 短横屏三窗“并排”仍重叠，隐藏了一整组窗口操作 | after-E6-short-arrange-recovery | `confirmed_recorded_shortheight_arrange_failure_bounded_followup` |
| UX-025 | `H.CHAT.INPUT`, `H.CHAT.CLOSE`, `H.CHAT.OPEN` | 首页聊天关闭再开丢失未发送草稿 | E7/E7.1 | `closed_for_E71_named_draft_close_reopen_clear_send_cases` |
| UX-026 | `H.CHAT.INPUT`, `H.CHAT.SEND` | 首页聊天合成composition Enter触发发送 | E7/E7.1 | `closed_for_E71_synthetic_composition_guards_OS_IME_unverified` |
| UX-027 | `H.CHAT.INPUT`, `H.CHAT.SEND`, `H.CHAT.CLOSE`, `H.CHAT.RETRY` | 首页聊天挂起无就地停止或请求时限，只能关窗取消 | E7/E7.1 | `closed_for_E7_E71_named_Stop_idle_JSON_SSE_DONE_recovery_cases` |
| UX-028 | `S.APP.products.SELECT`, `S.APP.products.OPEN`, `S.APP.books.READ`, `S.APP.contact.DRAFT`, `S.APP.contact.CHANNEL`, `S.APP.settings.LANG`, `S.APP.settings.THEME`, `S.APP.settings.COLOR`, `S.APP.settings.EXPORT` | Space四App重要正文、动作标签和能力说明在投影后过小 | after-E6-Space-four-app-type-targets | `confirmed_recorded_normal_readability_gap_bounded_four_app_batch` |
| UX-029 | `S.APP.products.OPEN`, `S.APP.books.READ`, `S.APP.contact.CHANNEL` | Space手机主要产品/阅读/联系链接仍低于项目44px触控目标 | after-E6-Space-four-app-type-targets | `confirmed_recorded_390_primary_anchor_target_gap` |
| UX-030 | `H.CHAT.INPUT`, `H.CHAT.SEND`, `H.CHAT.CLOSE`, `H.CHAT.QUICK` | 短横屏聊天聚焦输入后composer部分出屏，关闭按钮被导航遮挡 | E6.1-short-chat-recovery | `closed_for_recorded_E61_568_bilingual_844_coarse_chrome_scroll_paths` |
| UX-031 | `H.CHAT.INPUT`, `H.CHAT.SEND`, `H.CHAT.CLOSE` | 短屏旧回复完成把滚去旅行书的读者拉回聊天并聚焦输入 | E7/E7.1 | `closed_for_E7_E71_568_en_wheel_JSON_completion_case` |

## 有证据的单项锚点评分

| 检查 | 维度片段 | 分 | 依据与限制 | as-of / 状态 / 置信度 |
| --- | --- | --- | --- | --- |
| `CHK-A-PICKER-NAME` | D2.1 | 96 | 390/320/568三个宽度均有稳定名称；44px命中另列。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-PICKER-KEYBOARD` | D2.2 | 96 | 已记录打开场景选择后Escape关闭并返回原触发器；只对这条取消链。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-PICKER-TARGET` | D2.3 | 96 | 390/320/568宽度中实际盒均44×44；未外推其他按钮。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-QUIET-VISIBLE` | D3.2 | 96 | 三个宽度pressed开启后背景明显反色且title改变，状态反馈和开关一致；不证明所有暂停资源。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-QUIET-CONSISTENCY` | D4.3 | 96 | 320px实图中quiet开启使用浅色实底，区别旁边未选图标；范围仅此状态对照。 | batch A frozen source / scoped_assessment / medium |
| `CHK-A-COPY-TRUTH` | D3.2 | 96 | pending未伪报success；resolved与legacy true才完成，denial显示人工复制路径。仅桩结果，不证明实体剪贴板。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-COPY-RECOVERY` | D3.3 | 80 | 390px人工恢复说明右端被展开按钮覆盖；信息有方向但可读性受损。C布局已修，待新图关闭。 | batch A frozen source / historical_gap_closed_for_new_C_recorded_cases / high |
| `CHK-A-COPY-ATTENTION` | D4.4 | 80 | 复制恢复说明与展开工具同占代码块右下角，用户不能清楚区分说明和工具区域。 | batch A frozen source / historical_gap_closed_for_new_C_recorded_cases / high |
| `CHK-A-COPY-MOBILE-TARGET` | D2.3 | 96 | zh/en手机用例复制按钮高44px；桌面31.34px无需硬套移动44目标。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-EMAIL-FOCUS` | D2.4 | 96 | zh/en桌面/手机均实际focused/visible，边框改变并有3pxshadow；outline:none不构成缺陷。此分仅焦点可见片段，未量测对比或虚拟键盘。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-WINDOW-PRESS` | D5.2 | 96 | 最小化按钮按压前后44.28px边界稳定，未因全局scale跳动。 | batch A frozen source / scoped_assessment / high |
| `CHK-A-MAP-PRESS` | D5.2 | 96 | 地图标记按压几何稳定；9.46px盒只证明未被transform覆盖，命中/spacing/等价区域列表须另测。 | batch A frozen source / scoped_assessment / high |
| `CHK-BASE-UX-001` | D2.1 | 60 | 手机换景旧按钮唯一文字隐藏且图标aria-hidden，读屏需绕路；A专项已关闭此片段。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-002` | D3.2 | 80 | 旧quiet仅aria变化，视觉用户无法确认暂停状态；A已验证反色。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-003` | D2.2 | 60 | role=tab未实现方向键与roving模型，Tab/Enter仍能绕路；B改后待实际矩阵。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-004` | D2.1 | 60 | 旧aria-labelledby所指ID不存在，辅助技术缺关联；B改后待渲染验证。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-005` | D3.2 | 60 | 旧Promise未settle即成功，用户无法判断复制是否完成；A专项已关闭。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-006` | D3.3 | 60 | 旧clipboard拒绝无恢复说明；C已改源码待真实桩验收。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-007` | D3.1 | 60 | 旧fetch无超时，挂起submit一直disabled，必须刷新绕路；C改后待挂起和重试链。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-008` | D2.2 | 80 | 原菜单无Escape/返回焦点；B同步focus又撞visibility过渡，延迟guard正在修。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-009` | D5.1 | 60 | 旧TOC固定smooth无reduce分支；B源码改后待实际行为。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-BASE-UX-010` | D1.4 | 80 | 旧无匹配仍说目录空，缺清条件入口，用户可手动删查询绕路；C待验收。 | baseline source before fixes / historical_diagnosis_not_runtime_score / high |
| `CHK-SOURCE-CLOSED-SHEET` | D2.2 | 60 | article-bottom-sheet.css:113–145仅用transform移到屏外，没有hidden/visibility/inert；模板当前tab tabindex0且TOC链接可聚焦。article-bottom-sheet.js:157 keydown handler未检查abs--open，屏外进入后还会循环trap；Escape可退出，故不夸大为完全无法脱困。 | current source review / source_diagnosis_not_runtime_score / high |
| `CHK-C-COPY-SEPARATION` | D6.1 | 96 | 四张当前图已逐张查看；文字Range rect和44px工具不相交，hit中心成功；仅关闭UX-011。横屏/200%与键盘边界仍未知。 | batch C frozen source / scoped_contract_pass / high |
| `CHK-C-COPY-ATTENTION` | D4.4 | 90 | 恢复说明和44px工具已分出独立行，旧覆盖关闭；320zh与390en文字终点距工具仅约0.24/0.25px，仍显拥挤，后续可留更明确间距。此为视觉细化，不重新宣告叠压失败。 | batch C frozen source / historical_C_crowding_improved_D3 / medium |
| `CHK-C-COPY-CLEAN-READER` | D3.4 | 96 | 四个C记录中从error打开fullscreen没有重复旧status；UX-013 focus边界未包含在该合同。 | batch C frozen source / scoped_contract_pass / high |
| `CHK-D1-SHARE-INTENT` | D3.4 | 96 | 390px zh/light/reduce中复制迟到拒绝没有重开manual模态，焦点仍在FAB；只证明该意图变更链。 | D4b frozen source / scoped_contract_pass / high |
| `CHK-D1-BOOK-STOP` | D3.3 | 96 | 1440px zh/light/reduce，部分SSE后Stop取消并保留问题，回到可编辑状态。 | D4b frozen source / scoped_contract_pass / high |
| `CHK-D1-BOOK-SWITCH` | D3.4 | 96 | 同一桌面配置关闭A并打开B后旧回答隔离；不认证D2后来native dialog Tab/淡出。 | D4b frozen source / scoped_contract_pass / high |
| `CHK-D1-FAQ-STOP` | D3.3 | 96 | 390px zh/light/reduce，部分SSE Stop恢复问题和输入；不包含外层summary collapse。 | D4b frozen source / scoped_contract_pass / high |
| `CHK-D1-SEARCH-CLOSE` | D3.4 | 96 | 1440px zh/light/reduce，关闭搜索取消部分SSE，重开清空；不包含旧成功回复抢编辑焦点。 | D4b frozen source / scoped_contract_pass / high |
| `CHK-D2-NATIVE-FOCUS-GAP` | D2.2 | 80 | native dialog仍有一跳activeElement=body，焦点环丢失后下一Tab返回首项；可完成有明确摩擦。此分不声称背景控件可用。 | D2a frozen source before explicit focus wrap / historical_D2a_gap_closed_for_D2b_recorded_cases / high |
| `CHK-D2B-TABS-DESKTOP` | D2.2 | 96 | 1440×900 zh reduced，End/Home/ArrowRight循环与单一tabstop按实际断言通过；ArrowLeft另有Node合同，完整可选series配置未齐。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-TABS-COMPACT` | D2.2 | 96 | 390×844 zh reduced，End切末tab、ShiftTab不离弹层、Escape返回FAB。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-PANEL-NAME` | D2.1 | 96 | 实际可见分享panel aria-labelledby等于被选tabID；源中全部ID已补，未把可选series组合都认证。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-MOBILE-MENU` | D2.2 | 96 | 390×844 /zh/articles/，实际延后可见后首链接聚焦、Escape回触发器且关闭；不外推长英文/断点。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-COPY-REFUSAL` | D3.3 | 96 | 受控reject+execCommandfalse，没有is-copied，原代码选择保留且按钮恢复可用。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-SHEET-CLOSED` | D2.2 | 96 | 390×844初始与关闭后inert/ariahidden，尝试focus当前tab均失败；打开可聚焦，Escape再关闭。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-CODE-FOCUS` | D2.2 | 96 | 390×844全屏连续6次Tab每次都有可见dialog内焦点，Escape关闭并返回原展开按钮。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-BOOK-FOCUS` | D2.2 | 96 | 390×844书籍弹层连续8次Tab均可见，Escape返回触发器，关闭控件实际44px。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-BOOK-CLOSE-TARGET` | D2.3 | 96 | 只验证书籍Close实际宽高≥44；Send和chips尺寸不包含，不能由Close通过认证整模态命中。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-IME-BOOK` | D3.4 | 96 | 合成isComposing Enter不发请求，后续明确Enter才发；不是实体手机真实中文输入法完整验收。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-IME-FAQ` | D3.4 | 96 | isComposing与keyCode229合成事件都保留草稿且0请求，明确Enter才发。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-SHARE-RECOVERY` | D3.3 | 96 | 390×844分享拒绝后native manual弹层保留可选择URL，Escape回复制触发器。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-SUB-TIMEOUT` | D3.1 | 96 | fetch桩永不settle，虚拟时钟16秒后submit恢复/邮箱保留/超时可见；未发送真实订阅。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-LIBRARY-EMPTY` | D3.3 | 96 | 真实Dock开reader，清无匹配query后焦点回输入且列表恢复；空收藏能回all并显示文章。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-FAQ-OUTER-CANCEL` | D3.4 | 96 | 390×844 zh/light/reduce外层summary关闭取消；关闭后的迟到结果不被承诺为有效回复。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-SEARCH-FOCUS` | D3.4 | 96 | 1440×844 zh/light/reduce，旧回答完成不抢正在编辑的新搜索焦点。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-D2B-BOOK-ESCAPE-REOPEN` | D3.4 | 96 | 390×844 zh/light，在reduce与no-preference均双Escape和快速重开不被旧回调关闭。 | D2b frozen source / scoped_contract_pass / high |
| `CHK-SPACE-NOTE-DOM` | D6.4 | 96 | 1440/390×900两个记录最小化/恢复保留同DOM；不外推语言/路由/关闭后原节点。 | Space window audit against D2b frozen source / scoped_contract_pass / high |
| `CHK-SPACE-MAX-RESTORE` | D3.4 | 96 | 1440/390×900最大化再恢复按记录完成；内容可读性与所有尺寸仍须另评。 | Space window audit against D2b frozen source / scoped_contract_pass / high |
| `CHK-SPACE-NOTE-TEXT` | D6.4 | 96 | 1440/390×900关闭再开保留文本；该合同不承诺关闭后仍同节点。 | Space window audit against D2b frozen source / scoped_contract_pass / high |
| `CHK-SPACE-PHONE-WINDOW-TARGET` | D2.3 | 96 | 手机四个windowaction实际44.28×44.28、中心命中，专项通过；桌面各22.96，不能由手机通过外推。 | Space window audit against D2b frozen source / scoped_contract_pass / high |
| `CHK-SPACE-MAP-ZOOM-TARGET` | D2.3 | 80 | 手机+/−实际22.14×44.28，宽不足项目重要移动控件44目标；中心命中但点击有摩擦，G4上限89。WCAG24与spacing/替代仍须独立判断。 | Space window audit against D2b frozen source / observed_target_gap / high |
| `CHK-D3-COPY-CLEARANCE` | D4.4 | 96 | 文字Range与44px展开工具净空实算26.23/45.55/18.53/14.58px，四图分区清楚，C的0.24px拥挤在这些新D3状态关闭。 | D3 frozen source / scoped_contract_pass / high |
| `CHK-D3-COPY-ACTION-LANGUAGE` | D1.3 | 96 | 中文按钮只保留“复制”；手机失败文案明确“长按代码，选择复制”，四张语言/指针场景与动作一致。 | D3 frozen source / scoped_contract_pass / high |
| `CHK-D3-COPY-NO-STALE-STATUS` | D3.4 | 96 | 四个D3记录从error进入全屏没有克隆旧status；focus循环另由D2b合同保证，未由这8条替代。 | D3 frozen source / scoped_contract_pass / high |
| `CHK-D4B-PRODUCT-INTENT` | D1.4 | 96 | Chinesehomehero/Englishhomeproducts/Chinesearticlefooter nowopensactualProductsappcurrenttab withrealh2andproperDocklabel;#studio-products already supportedroute. | D4b frozen source / scoped_contract_pass / high |
| `CHK-D4B-SPACE-PLAIN-ENTRY` | D6.4 | 96 | Bothzh/enplain /projects/ stillstartcafe;Dock/productsapphidden untilintentionalenter. Productdeeplinkdoesnotchangecafédefault. | D4b frozen source / scoped_contract_pass / high |
| `CHK-D4B-BOOK-TOUCH` | D2.3 | 96 | 320/390zhsuggestionsheight≥44,SendandStop44×44,input16pxand≥8pxgap;Stopabortsandrestoresquestion. Targetsactuallymeasured,notCSS-only. | D4b frozen source / scoped_contract_pass / high |
| `CHK-D4B-BOOK-LINES` | D4.1 | 96 | 320/390firstpromptfinalrenderedline≥4characters,oldtwo-characterorphanclosed;allrealquestionspreserved. | D4b frozen source / scoped_contract_pass / high |
| `CHK-D4B-BOOK-SHORTHEIGHT` | D6.1 | 96 | 568×320/256bothzh/en:card16pxinset,Close/input/Send≥44insidecardandcenterhit;thirdsuggestioncan scrollintoview/click withoutcoveringcomposer. | D4b frozen source / scoped_contract_pass / high |
| `CHK-D4B-BOOK-LONG-READING` | D6.2 | 96 | Shortheight4cases:thirdsuggestionyields30paragraphanswer;conversationoverflowsscrollably;focusedregionHome/Endwork;header/composerstayreachableandEscapecloses. | D4b frozen source / scoped_contract_pass / high |
| `CHK-E5-PRIMARY-TYPE` | D4.1 | 96 | Notesactualfont16.4px at1440/390/320/568,upfromsmallprojectedreadingtype;onlyprimarynoteschrome,notalllabels. | E5 frozen Space styles / scoped_contract_pass / high |
| `CHK-E5-DESKTOP-TARGETS` | D2.3 | 96 | Desktopwindow/mapcontrolsactual26.24px,meetingthe24pximportantdesktopgoalat1440;fullpointerhit/pathnotallclaimed. | E5 frozen Space styles / scoped_contract_pass / high |
| `CHK-E5-MOBILE-MAP-TARGETS` | D2.3 | 96 | 320/390/568mapcontrolsactual44.28×44.28;fit62.32×44.28andWorld44.28. UX022closedfortheserecordedwidths;600..640unknown. | E5 frozen Space styles / scoped_contract_pass / high |
| `CHK-E5-OPAQUE-PLANE` | D4.2 | 96 | Actualnotes/mapplaneisrgb(238,239,235),noimagegradient,worldbehindnolongershows throughreadingarea;stablefocusededitorringretained. | E5 frozen Space styles / scoped_contract_pass / high |
| `CHK-E5-SHORT-CLOSE-FAIL` | D6.1 | 60 | 568×320 close center triggered café return instead of closing notes; notesCount remained1. Known historical failure, repaired by E5.2. | E5 actual boundary failure / historical_failure_closed_for_recorded_E52_cases / high |
| `CHK-E5-620-MAP-FAIL` | D2.3 | 80 | 620×844 zoom26.24×44.28 and World27.88×44.28 missed the project important mobile target; no blanket WCAG claim. | E5 actual boundary failure / historical_failure_closed_for_recorded_E52_cases / high |
| `CHK-E51-COARSE-TARGET-FAIL` | D2.3 | 80 | 844×390 coarse window/map controls about26.24px; arrange center additionally hit scenery HUD. E5.2 now addresses both. | E5.1 coarse boundary failure / historical_failure_closed_for_recorded_E52_cases / high |
| `CHK-E52-CLOSE-HUD` | D6.1 | 96 | 568×320 zh/en and844×390 coarse zh all window/HUD centers hit intended targets; actual coordinate close removes window while desktop remains. | E5.2 frozen source / scoped_contract_pass / high |
| `CHK-E52-MAP-TARGETS` | D2.3 | 96 | 620×844 zh and844×390 coarse zh: every map button≥44.27px, center hit and actual click;568×320 zh/en also pass. | E5.2 frozen source / scoped_contract_pass / high |
| `CHK-E52-HUD-INTENT` | D6.4 | 96 | Three short-height journeys open picker, Escape returns focus, café return then CtrlK/workspace preserves original editor DOM and note text. | E5.2 frozen source / scoped_contract_pass / high |
| `CHK-E52-FAQ-MOTION` | D5.1 | 96 | Runtime reduce change cancels active opening/closing WAAPI, reaches intended details.open/class, clears height/overflow and leaves zero animations; subsequent toggles settle. | E5.2 frozen source / scoped_contract_pass / high |
| `CHK-E52-FAQ-HIDDEN` | D2.2 | 96 | Initial hidden panel has no bounding box and input cannot focus. Closing after runtime preference change becomes hidden; toggle keeps focus, reopening focuses input. | E5.2 frozen source / scoped_contract_pass / high |
| `CHK-E52-FAQ-INTENT` | D3.4 | 96 | Moving focus to theme before reduce does not steal it; controlled hanging request aborts when FAQ collapses and reopens with draft enabled/intact. | E5.2 frozen source / scoped_contract_pass / high |
| `CHK-SPACE-SHORT-ARRANGE` | D1.4 | 80 | Explicit“窗口并排”does not expose allthree windows: welcome’s fourcontrolcenters arecovered bymap afterfitRectclamps row2. Alternativeapp/overview entry exists in source, so this is a bounded recovery/clarity friction, not proven total task failure. | E5.2 short-layout exploratory probe / observed_shortheight_arrange_gap / high |
| `CHK-HOME-DRAFT-BASE` | D6.4 | 60 | 受控close/open后未发送草稿为空，必须重新输入；只绑定77/E52。 | Homepage transport baseline before E6 build / recorded_baseline_gap_not_full_score / high |
| `CHK-HOME-COMPOSITION-BASE` | D2.2 | 60 | 合成composing Enter发生1次API stub；事件guard缺失，OS级输入未测试。 | Homepage transport baseline before E6 build / recorded_baseline_gap_not_full_score / high |
| `CHK-HOME-PENDING-BASE` | D3.1 | 80 | 虚拟35秒仍busy/disabled/无Stop，关闭可abort；可退出但恢复有明确摩擦。 | Homepage transport baseline before E6 build / recorded_baseline_gap_not_full_score / high |
| `CHK-FOUR-APP-PRIMARY-TARGETS` | D2.3 | 80 | 390主要anchor高度29.52/13.53/36.08px，未达项目44目标；不自动等同WCAG失败。 | Space four-app normal maximized baseline / recorded_baseline_gap_not_full_score / high |
| `CHK-E6-NOJS-ARTICLE` | D1.4 | 96 | 中英禁用JS均点击真实实践链接，到文章并核对标题/time/说明。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-READING-FOCUS` | D2.2 | 96 | 六旅程开始阅读focus=hp-posts、headingTop约130CSSpx；原CTA与新实践anchor分别验。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-SOCIAL-TARGETS` | D2.3 | 96 | 六旅程10social均44×44CSSpx；320/390中英合同补≥8gap，无横溢。未导航所有外链。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-CONTACT-RETURN` | D2.2 | 96 | 320/390中英微信/小红书联系卡打开，Escape回原触发器。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-CHAT-ROOT-SESSION` | D6.4 | 96 | 受控开/答/关/重开仍同Bear根、消息保留、问题或头像opener获焦点；未发送草稿不包含。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-CHAT-STALE` | D3.4 | 96 | 当前布局重验close/clear迟到stream隔离与失败retry；桩故意忽略AbortSignal。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-REPLY-FOCUS` | D3.4 | 96 | 离开chat到posts后旧回复完成不抢posts焦点；UX026/027不包含。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-SYNTHETIC-BFCACHE` | D3.4 | 96 | 合成persisted pagehide/pageshow后composer恢复，新轮可发且旧delta隔离；非原生缓存命中验收。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-PAINT` | D6.2 | 96 | 412×823暂停模块再放行，Books位置变化≤1CSSpx；320/375/412 CTA≥44且不横溢。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-PRODUCT-INTENT` | D6.4 | 96 | 中英两条首页产品入口按当前源码重验同tab实际Products app；不外推所有路由。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-REAL-AMBIENT` | D5.1 | 96 | 真实Metal：hero交互+3秒无renderer下载；Bear可见2canvas；runtime reduce销毁/restore重挂。非性能或隐藏零帧证明。 | E6 frozen historical production evidence; E6.1 WIP not accepted / scoped_contract_pass / high |
| `CHK-E6-SHORT-FOCUS` | D6.1 | 80 | 568中英初始input部分出屏，close中心被固定导航盖；滚入composer又把close移出，局部恢复摩擦。 | E6 frozen historical production evidence; E6.1 WIP not accepted / historical_E6_failure_closed_for_recorded_E61_cases / high |
| `CHK-E61-SHORT-CHROME` | D6.1 | 96 | 五actual中input/send/close均44CSSpx，完整位于header下和屏内，中心命中；568×320/256中英与844×390粗指针英文。 | E6.1 frozen short-chat and material review / scoped_contract_pass / high |
| `CHK-E61-SHORT-RETURN` | D2.2 | 96 | 五actual coordinateclose移除panel并回opener，重新打开Escape再次回opener；close不被固定导航截获。 | E6.1 frozen short-chat and material review / scoped_contract_pass / high |
| `CHK-E61-SCROLL-CONTENT` | D2.2 | 96 | 四568合同：末条真实suggestion可在中段滚入、中心hit并坐标点击；24段受控回答、Home/End滚动，同时chrome保持可达。 | E6.1 frozen short-chat and material review / scoped_contract_pass / high |
| `CHK-E61-NORMAL-SESSION` | D6.4 | 96 | 390/1440×900 normal wrapper为display:contents，原尺寸/受控问答close-reopen保留；不含未发送draft。 | E6.1 frozen short-chat and material review / scoped_contract_pass / high |
| `CHK-E61-CONTINUITY` | D3.4 | 96 | 当前3合同重验close/clear迟到隔离、点击离开后回复不抢焦点、合成bfcache恢复；不认证wheel-only意图候选。 | E6.1 frozen short-chat and material review / scoped_contract_pass / high |
| `CHK-E61-REAL-AMBIENT` | D5.1 | 96 | 真实新renderer：herointent+3s无renderer请求，Bear可见2canvas，runtime reduce销毁/restore重挂、pageErrors空。非FPS/资源基准。 | E6.1 frozen short-chat and material review / scoped_contract_pass / high |
| `CHK-E61-WHEEL-COMPLETION-FAIL` | D3.4 | 80 | 读者已滚到Books而仅保留旧chat DOM焦点；完成将scrollY2803拉回2183并focusinput，需再次找回阅读位置。可恢复但有明确摩擦，非P1。 | E6.1 actual wheel-only late-completion failure / observed_current_intent_regression / high |
| `CHK-E62-RUNTIME-MOTION` | D5.1 | 96 | Both light/dark actual Metal scopes remove both canvases on runtime reduce, remount on restore and remove on final reduce. Only recorded preference lifecycle. | E6.2 bounded core material correction / closed_for_recorded_E62_two_theme_lifecycle_only / high |
| `CHK-E62-VISIBILITY-LOAD` | D5.3 | 96 | Both themes: trusted interaction at hero +3s causes zero renderer requests; only Bear visible loads two genuine canvases. No FPS or all-hidden-frame assertion. | E6.2 bounded core material correction / closed_for_recorded_E62_two_theme_lifecycle_only / high |
| `CHK-TRAVEL-QR-FOCUS-FAIL` | D2.2 | 80 | Both reduce/normal actual open leaves background trigger focused; Tab goes background WeChat, so modal keyboard context is not entered. | TravelQR actual baseline after E62; E7 WIP outside scope / observed_failure / high |
| `CHK-TRAVEL-QR-REOPEN-FAIL` | D3.4 | 80 | Normal motion Escape→Enter reopen is hidden by old close after500ms, while is-open/expanded remain true; reduce variant does not reproduce hide. | TravelQR actual baseline after E62; E7 WIP outside scope / observed_failure / high |
| `CHK-TRAVEL-QR-ESCAPE-RETURN` | D2.2 | 96 | Only Escape closure returns original trigger and expanded=false in both named media; not proof that focus entry/trap/reopen or X/backdrop works. | TravelQR actual baseline after E62; E7 WIP outside scope / scoped_positive_fragment / high |
| `CHK-ANCHOR-META-NATIVE` | D6.4 | 96 | NativeMacMeta onArchives #year-2026 opens matchingnewtab; originalURL/scroll unchanged, defaultPrevented=false, zero scrollIntoView. Ctrl/middle/etc nottested. | 478 preview native anchor and actual right TOC scoped probes / scoped_recorded_pass_incomplete_family_matrix / high |
| `CHK-ANCHOR-PLAIN-REDUCE-BACK` | D5.1 | 96 | Archives plainclick reaches correcthash/y365 with CSS auto and scrollIntoView withoutsmooth; Back restores originalURL. Exact1440zh/light/reduce/year2026 only. | 478 preview native anchor and actual right TOC scoped probes / scoped_recorded_pass_incomplete_family_matrix / high |
| `CHK-RIGHT-TOC-RUNTIME-REDUCE-CLICK` | D5.1 | 96 | ActualrightTOC after no-preference→runtime reduce clicksencodedChineseheading, matchesdecodedhash, auto CSS/no smooth. Does not trigger or instrument internalpanel auto-follow scrollTo. | 478 preview native anchor and actual right TOC scoped probes / scoped_recorded_pass_incomplete_family_matrix / high |
| `CHK-E71-DRAFT-CLOSE` | D6.4 | 96 | zh/en exactquoted draft survivesclose/reopen; clearresets; sendingclearsmatchingdraft; twoactualcoordinatejourneys independentlyretainunsentdraft. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-SYNTHETIC-COMPOSITION` | D3.4 | 96 | SyntheticisComposing/keyCode229 Enter/Escape causeszero request/noclose, preservesinput; ordinaryEnterafterwards sends once. OSIME unverified. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-ACTUAL-STOP-TARGET` | D2.3 | 96 | ActualcoordinateStop enabledsame44×44 viewportCSSpxsender at568×256zh/light and1440×900en/dark; shortcontractcheckcenterhitandposition. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-STOP-RECOVERY` | D3.3 | 96 | Abortrestorescomposer, retainsquestion/partial, recoveryline separatefromanswer; retry/newturn excludesfailedcontext; oldresultcannotwrite. Stuckreader.cancelnotawaited. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-IDLE-FRONTIERS` | D3.1 | 96 | Pausedclock+requeststartedAt provesbusy at24999 andready25000 forheaders/firstchunk; laterchunkat20000 renews to44999busy/45000ready. JSONbodystallalso releases; lateheaders/bodyignored. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-DONE-NO-EOF` | D3.4 | 96 | DONEcompleteswithoutEOF orsettlingcancel; inputready, signalnotabortedonsuccess; +30000virtualtime cannotmarksuccessfulanswer timedout. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-WHEEL-COMPLETION` | D3.4 | 96 | Actualwheel620 leavesoldchatDOMfocus, lateJSONcompletion preserves2803→2803 anddoesnotfocusinput; contractindependentlypasses. Errorbranch/othersizesunverified. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |
| `CHK-E71-CONTINUITY-REGRESSION` | D3.4 | 96 | Unchanged6about passsafeSSE, close/clear staleisolation, clickedpostsfocus, syntheticbfcache andretry; 6short keepexplicitopen/close/composerreachable. | E7/E7.1 final bounded homepage transport recovery / closed_for_named_E7_E71_cases_incomplete_family_matrix / high |

## D1 / D4 独立专家视觉判断

| 范围 | 维度 | 四子项 | 范围分 | 原因 | as-of / 置信度 |
| --- | --- | --- | --- | --- | --- |
| S.BOOT | D4 | 96,90,80,96 | 90.5 | Memorable restrained terminal fits explicit brief;waiting text too dim,typography/label hierarchy still worth checking. Not full-control score. | Space checkpoint 6d7b9fe9 / 2026-10-15 recorded evidence / medium |
| S.CAFE | D4 | 90,90,80,90 | 87.5 | Clear main/secondary actions and real room;mobile tiny labels/unnamedchevron and top/bottom chrome need correction. Batch A changes mean these old visuals cannot certify current rendering. | Space checkpoint 6d7b9fe9 / 2026-10-15 recorded evidence / medium |
| S.WINDOW | D4 | 80,80,90,90 | 85.0 | Preserved place context and clear workspace;mobile window/monitor/editor boundaries stack,and secondarylabels small. Need current per-control measurements. | Space checkpoint 6d7b9fe9 / 2026-10-15 recorded evidence / medium |
| S.CAFE.PICKER/S.CAFE.QUIET | D4 | 90,96,96,90 | 93.0 | 风景图标与quiet反色让操作含义/状态更清晰；完整hover/focus/明暗/长英文字体矩阵未齐。 | batch A frozen source / medium |
| H.HERO.READ, H.HERO.PRODUCT, H.HERO.ABOUT, H.CHAT.BUBBLE | D1 | 90,80,90,90 | 87.5 | 首页阅读/产品CTA清楚；同一首屏同时出现6个聊天问题、10个社交入口与两条主路径，次级入口分量接近，初访任务选择有明确摩擦。建议先弱化协议/版本小字和社交围框，再以实际点击任务验证，不改变Bear主体。 | baseline before batch A / medium |
| H.HERO.SOCIAL, H.CHAT.BUBBLE, H.CHANNEL.TABS | D4 | 80,90,90,80 | 85.0 | 正文与主CTA易读；Digital Twin/协议/语气等小字明显低于主要文字，头像周围六个白色卡片与社交按钮围框共同争抢注意。D4.1降分针对这些辅助标记，不推断必要文字对比度失败；只建议先去低信息量标签或弱化辅助边界。 | baseline before batch A / medium |
| A.TOC.LINK, A.BODY.CODECOPY | D1 | 90,96,90,90 | 91.5 | 步骤标题、正文和右侧当前目录层级清楚；本截图为代码工具出现前基线，未展示复制入口和失败出口，不能据此评复制功能清晰度。 | baseline before batch A / medium |
| A.TOC.LINK, A.BODY.CODECOPY | D4 | 90,96,90,96 | 93.0 | 正文行长与段距稳定，代码框边界表达内容类型且没有装饰性多层围框；右侧目录较淡需量测必要对比。截图右侧代码横向截断是滚动容器可能行为，未测试不能报溢出缺陷。 | baseline before batch A / medium |
| S.CAFE.PICKER, S.CAFE.QUIET, S.CAFE.READ, S.CAFE.WORKSPACE | D1 | 90,96,90,90 | 91.5 | 两个主动作采用完整动词且主次明确；换景已改风景图标，quiet反色可识别。320px只靠风景图标发现换景用途仍有学习成本，地点标题与顶部换景为双入口，建议后续实测发现率再决定是否加短标签；不能仅凭偏好加更多HUD。 | batch A frozen source / medium |
| T.BOOK.ASK, T.BOOK.SUGGEST, T.BOOK.INPUT, T.BOOK.SEND | D1 | 96,96,90,96 | 94.5 | 书名、作者与种子问题明确约束本次任务，输入位于顺序末尾且focus可见；初始占位“追问”略预设已经有回答，术语细化可后续处理，不构成功能阻塞。 | D2b frozen source / medium |
| T.BOOK.ASK, T.BOOK.SUGGEST, T.BOOK.INPUT, T.BOOK.SEND | D4 | 90,96,90,96 | 93.0 | 单一卡片与实际书籍/旅行色彩相称，建议问题、输入与焦点边界分工清楚，遮罩集中注意；仅桌面zh初始态，字号/对比需实际量测与手机长标签验证。 | D2b frozen source / medium |
| T.BOOK.CLOSE, T.BOOK.SUGGEST, T.BOOK.INPUT, T.BOOK.SEND | D4 | 80,96,90,90 | 89 | 卡片居中/边界与44px关闭对齐清楚，focus清晰。12px建议问题与单字孤行让手机密度偏高，发送38px观感比关闭小，下一轮优先测实际box并改善留白。no-preference图是中间帧，不评分。 | D2b frozen source / medium |
| S.WINDOW.DRAG, S.APP.notes.EDITOR | D1 | 90,80,90,80 | 85.0 | 前台笔记任务明确，但behind欢迎窗口/实体电脑仍穿出，工作区整体小字和次级操作不易定位。原节点与文字连续性专项通过，不抵消阅读层级缺口。 | Space window audit against D2b frozen source / medium |
| S.WINDOW.DRAG, S.APP.notes.EDITOR | D4 | 60,60,90,80 | 72.5 | 标题与保存/导出等实际文字很小且软；透明屏幕、实体电脑、双窗口边缘/阴影多层穿透，边界没有清楚表达单一承载面。需要放大/聚焦的明显摩擦；不推断未测对比度失败。 | Space window audit against D2b frozen source / high |
| S.APP.map.ZOOM, S.APP.map.REGION, S.APP.map.RELATED | D4 | 80,80,80,80 | 80.0 | 地图题名可识别，但kicker/坐标/照片计数很小，地图工具框/区域卡/屏幕外框叠加；两张灰块照片目前像空占位，原因待查而非自动归咎后端。 后续诊断已确认灰图为截帧过早，不能作稳定占位缺陷。 | Space window audit against D2b frozen source / medium |
| A.BODY.CODECOPY, A.BODY.CODEEXPAND | D1 | 96,96,96,96 | 96.0 | 当前四图“复制”与失败后的下一步动作明确，本地化去重复括号，长按指令对应coarsepointer；只评这些静态文字/操作入口清晰度，不等于实体长按成功。 | D3 frozen source / high |
| A.BODY.CODECOPY, A.BODY.CODEEXPAND | D4 | 90,96,96,96 | 94.5 | 说明与44px工具明显分区，实际水平净空≥14.58px，边界与状态位置清楚；320英文Copy.单词占末行、13px提示略密是小幅排版余量，非遮挡/功能失败。 | D3 frozen source / high |
| S.APP.map.ZOOM, S.APP.map.REGION, S.APP.map.RELATED | D4 | 80,80,90,80 | 82.5 | 两张真实旅行照片已显示，区域→图片→写作内容联系清楚；工具窄/细标签和多框层级仍有摩擦。没有稳定灰图/加载失败缺陷。 | StableSpace sourceunchangedfroma8e4120b / high |
| T.BOOK.SUGGEST, T.BOOK.INPUT, T.BOOK.SEND, T.BOOK.CLOSE | D1 | 96,96,90,96 | 94.5 | 标题/问题/输入次序清楚，短横屏固定composer让下一步稳定；初始“追问”略预设对话，属小文案余量。只评两张当前稳定截图，不认证完整状态矩阵。 | D4b frozen source / high |
| T.BOOK.SUGGEST, T.BOOK.INPUT, T.BOOK.SEND, T.BOOK.CLOSE | D4 | 90,96,96,96 | 94.5 | 整行13px建议保持实际问题且不再孤字；44px发送与输入对齐、边框分工清楚；短屏裁出部分第三项作为可滚区域，输入区稳定。字号仍偏细致，dark/zoom未测，不给完整D4维度。 | D4b frozen source / high |
| S.APP.notes.EDITOR | D1 | 96,90,90,90 | 91.5 | 笔记正文可读、编辑焦点明确，纸面承载使前台任务更清楚；窗口标题和保存/导出等次级文字仍小，未认证整体工具层级。 | E5 frozen Space styles / high |
| S.APP.notes.EDITOR, S.WINDOW.DRAG | D4 | 90,90,90,90 | 90.0 | 实际16.4px正文与不透明纸面显著改善。前后窗口仍有小标题/次级工具与软化细节，但不再实体电脑穿透；真实focusring表达编辑状态，不按装饰扣分。 | E5 frozen Space styles / high |
| S.APP.notes.EDITOR | D4 | 90,96,90,96 | 93.0 | 手机大正文、单前台窗口与纸面清楚，边框表达窗口/输入。次级保存/导出和状态仍细；只评390稳定图，568HUD碰撞单列不被此分掩盖。 | E5 frozen Space styles / high |
| S.APP.notes.EDITOR | D4 | 90,90,90,90 | 90.0 | 深色纸面与文字层级稳定，背景世界不穿透；前后窗口层次可辨，小标题/次级标签尚需更广尺寸/对比量测。 | E5 frozen Space styles / high |
| S.APP.map.ZOOM, S.APP.map.REGION, S.APP.map.RELATED | D4 | 80,90,90,90 | 87.5 | 44px地图操作较易点，真实照片、区域与写作清楚；坐标/kicker/图片小标签仍很细。320图题名与相册链接换行占高，但未凭截图认定功能失败。 | E5 frozen Space styles / high |
| S.APP.reader.ITEM, S.APP.reader.NAV | D4 | 90,90,90,90 | 90.0 | 正文/标题明显可读，阅读器有稳定承载面；小工具条与后台多窗仍影响整体精致度。旧文章可见:::tip与锚点#属于内容/渲染呈现后续检查，不归咎本CSS。 | E5 frozen Space styles / high |
| S.APP.notes.EDITOR, S.WINDOW.CLOSE, S.CAFE.RETURN | D4 | 90,96,90,96 | 93.0 | 两张568中英图：正文与真实输入焦点清楚，侧边44px HUD与窗口条各占独立位置；小窗口标题/保存导出仍细，不能由此认证全部工具阅读性。 | E5.2 frozen source / high |
| S.APP.map.ZOOM, S.APP.map.REGION, S.APP.map.RELATED | D4 | 80,90,90,90 | 87.5 | 620图地图动作、区域选择与实图顺序清楚且纸面稳定；坐标/kicker等次级字仍细，图片在滚动区继续，非全部内容一次可见。 | E5.2 frozen source / high |
| S.APP.products.SELECT, S.APP.products.OPEN | D1 | 90,60,90,80 | 80.0 | 真实产品/测试边界文案明确，但桌面巨幅截图把“打开真实产品”推到下一屏；手机侧栏挤占正文到194px，目录与主要动作极小。 | Space four-app normal maximized baseline / high |
| S.APP.products.SELECT, S.APP.products.OPEN | D4 | 60,90,80,60 | 72.5 | 正文11.48、手机目录8.2、动作9.84实际px；桌面无高度上限截图主导版面。边框能表达目录/截图，优先字号/比例，不再加围框。 | Space four-app normal maximized baseline / high |
| S.APP.books.READ | D1 | 90,90,90,90 | 90.0 | 四色书封与真实书名快速说明自己写的书，读入口一致；小摘要和孤立小链接增加判断/点击摩擦。 | Space four-app normal maximized baseline / high |
| S.APP.books.READ | D4 | 60,96,90,80 | 81.5 | 书封有辨识且边界克制，摘要8.2px是主要阅读障碍；手机双列使长书名拆行、摘要密排，需以真实长标题与阅读动作净空为准，不凭换行认定溢出。 | Space four-app normal maximized baseline / high |
| S.APP.contact.DRAFT, S.APP.contact.CHANNEL | D1 | 90,80,90,80 | 85.0 | 标题/便笺/渠道/由用户确认发送顺序明确；社交多行先于草稿，重要发送边界提示太细，原目标都应保留。 | Space four-app normal maximized baseline / high |
| S.APP.contact.DRAFT, S.APP.contact.CHANNEL | D4 | 60,90,90,80 | 80.0 | 输入与主发送边界有意义、主次可见；9px渠道/8.2px隐私说明和全宽桌面长行需提升，次级社交已有多围框，宜减视觉权重而非加卡片。 | Space four-app normal maximized baseline / high |
| S.APP.settings.LANG, S.APP.settings.THEME, S.APP.settings.COLOR, S.APP.settings.EXPORT | D1 | 90,90,90,80 | 87.5 | 语言/咖啡/外观/能力分组清楚；“未连接/本浏览器保存”等决策信息约7.52px，桌面左右隔整屏，状态关系不够易读。 | Space four-app normal maximized baseline / high |
| S.APP.settings.LANG, S.APP.settings.THEME, S.APP.settings.COLOR, S.APP.settings.EXPORT | D4 | 60,90,90,80 | 80.0 | 选中浅色/勾与功能组边界明确，手机44.28按钮已够大；标签9.02、状态7.52px太细。限制桌面阅读列与增加语义字号，不把每组再围卡。 | Space four-app normal maximized baseline / high |
| H.HERO.READ, H.HERO.PRODUCT, H.HERO.ABOUT, H.HERO.SOCIAL | D1 | 96,96,90,96 | 94.5 | 真实Nango题目说明“能读什么”，作者/阅读/产品主次清楚、社交后置；390中文阅读动作完整可见。MCP专业词对非工程访客仍有少量理解成本。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.HERO.READ, H.HERO.PRODUCT, H.HERO.ABOUT, H.HERO.SOCIAL | D4 | 96,96,90,90 | 93.0 | 实际文字/按钮与边界清楚、项目成词；比旧首屏六气泡和原A重复月记聚焦。长说明仍密，社交去盒保留44px。320标题仅局部入屏、568常规纵滚本身非bug。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.CHANNEL.CARD, H.CHANNEL.TABS, H.CHANNEL.PREV, H.CHANNEL.NEXT | D1 | 96,90,90,90 | 91.5 | 一主两compact可扫描且不重复hero实践；月记真实摘要统计仍密，中文READ ESSAY混用是小语义余量。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.CHANNEL.CARD, H.CHANNEL.TABS, H.CHANNEL.PREV, H.CHANNEL.NEXT | D4 | 90,96,90,90 | 91.5 | neutral实图分隔线表达一主两辅，比原A三长列表节制；320长标题自然占高。早期红/蓝hover可能态不当normal不一致。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.CHAT.OPEN, H.CHAT.INPUT, H.CHAT.CLOSE, H.CHAT.QUICK | D1 | 90,90,90,90 | 90.0 | AI身份/公开资料/输入/关闭明确；320三条quick建议省略后难辨问题。568可达性单列UX030，运输仍开。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.CHAT.OPEN, H.CHAT.INPUT, H.CHAT.CLOSE, H.CHAT.QUICK | D4 | 90,90,90,90 | 90.0 | 照片/消息/输入/真实focus边界分工，中英明暗主输入清楚；quick/footer仍细且省略，真实focus不扣装饰分。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.CHAT.OPEN, H.CHAT.BUBBLE | D4 | 90,90,90,90 | 90.0 | 后置AI明确标题和真头像，手机整块入口接旅行书，避开B大留白。六气泡仍有装饰分量但不再抢首次阅读。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| MOTION.HOMEFIELD, MOTION.HOMEBUBBLES, H.CHAT.BUBBLE | D4 | 90,80,80,80 | 82.5 | 真实normal强白密线网覆盖整圈、块边缘可见，分量高于头像与问题；同配置reduce静态更清楚。只判视觉注意力，不推断GPU性能失败。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.BOOK.LINK | D4 | 90,96,90,90 | 91.5 | 真实封面/地点/引句形成内容停顿，产品实图已显示；英语书脊VIETNA/M小断行余量，旁边完整书名可读，非功能阻断。 | E6 frozen historical production evidence; E6.1 WIP not accepted / high |
| H.CHAT.INPUT, H.CHAT.CLOSE, H.CHAT.QUICK | D4 | 90,96,90,90 | 91.5 | 短屏header/composer完整，输入focus清楚；中段有独立可滚内容而非压小动作。256高只能显示少量文本是可滚状态，不据此扣“缺内容”。footer与meta仍细，只评5图。 | E6.1 frozen short-chat and material review / high |
| MOTION.HOMEFIELD, MOTION.HOMEBUBBLES, H.CHAT.BUBBLE | D4 | 90,80,80,90 | 85.0 | 比E6强白密网安静，头像/问题更清楚；NormalBlending核心呈褐色薄壳/实体片，仍不自然，背景光斑边缘尚显。D4范围85，未达目标；静态仍更轻。 | E6.1 frozen short-chat and material review / high |
| MOTION.HOMEFIELD, MOTION.HOMEBUBBLES, H.CHAT.BUBBLE | D4 | 90,90,90,96 | 91.5 | 褐色实体片已消失；头像与六条问题比弱金光先被看见，低对比网络不再形成白色围栏。手绘人物/轨道/外晕仍叠在同一小区域，静态仍更轻；此材质范围91.5，不是完整控件分。 | E6.2 bounded core material correction / high |
| MOTION.HOMEFIELD, MOTION.HOMEBUBBLES, H.CHAT.BUBBLE | D4 | 90,90,90,90 | 90.0 | 实体壳消失，细淡金网络与背景相融，头像/问题保持主次。暗色仍可见多边形光晕与人物线稿的第二套轮廓，辅助提示较微小；范围90，保留进一步组件收敛空间。 | E6.2 bounded core material correction / high |
| H.CHAT.SEND, H.CHAT.INPUT, H.CHAT.RETRY | D1 | 96,90,96,90 | 93.0 | 短屏Stop图标与真实停止反馈同位，输入恢复和下一问明确；256高重试位于中段滚动内，不能把首屏只见停止行当全部恢复动作已可扫到。 | E7/E7.1 final bounded homepage transport recovery / high |
| H.CHAT.SEND, H.CHAT.INPUT, H.CHAT.RETRY | D4 | 90,96,90,90 | 91.5 | 短屏44sender清楚，停止行与回复内容分离；保留输入真实focus环，未当装饰扣分。256高内容窗口窄，辅助小字/多层细线仍可收敛。 | E7/E7.1 final bounded homepage transport recovery / high |
| H.CHAT.SEND, H.CHAT.INPUT, H.CHAT.RETRY | D1 | 96,96,90,96 | 94.5 | 停止后的partial、Reply stopped和独立Retry清楚，新问题继续可用；合成stub正文不是模型质量，中英混用的次级品牌文字仍有工艺余量。 | E7/E7.1 final bounded homepage transport recovery / high |
| H.CHAT.SEND, H.CHAT.INPUT, H.CHAT.RETRY | D4 | 90,90,90,90 | 90.0 | 深色停止/下一问界面层级稳定，恢复文本不混入AI回复；quick省略、细碎辅助小字和输入/区域分隔层仍较多，范围90而非96。 | E7/E7.1 final bounded homepage transport recovery / high |

## 完整可追踪覆盖（inventory v1.10 一对一映射）

309族/358selectors；55族有某种局部状态证据，完整认证仍0。新实践anchor只绑定自身E6 no-JS文章导航，不继承原CTA focus/paint。



| family_id | 族 | 控件数 | 片段数 | 完整评分 | 发现 |
| --- | --- | --- | --- | --- | --- |
| `G.NAV.SKIP` | 跳到正文 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.HOME` | CUBXXW 品牌/首页 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.MENU` | 文章/专栏/AI Agent/工程/成长/空间 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.SEARCH` | 搜索/⌘ K | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.THEME` | 浅色/深色 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.LANG` | 中文/EN | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.MOBILE` | 打开/关闭导航 | 1 | 2 | `unverified / null` | UX-008 |
| `G.NAV.ANCHOR` | 原生页内锚点 | 1 | 2 | `unverified / null` | 待矩阵 |
| `G.NAV.TOP` | 返回顶部/进度环 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.NAV.WAYFINDER` | 章节侧边索引 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.CLOSE` | 关闭搜索 | 1 | 1 | `unverified / null` | 待矩阵 |
| `G.SEARCH.QUERY` | 搜索文章 | 1 | 2 | `unverified / null` | UX-015 |
| `G.SEARCH.RESULT` | 搜索结果/键盘上下移动 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.AI` | 用 AI 回答 / 停止生成 | 2 | 1 | `unverified / null` | 待矩阵 |
| `G.SEARCH.SUGGEST` | 入门推荐/AI Agent/最新文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.AICLOSE` | 关闭 AI 搜索 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.FULL` | 完整搜索页面 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.PAGE` | 完整搜索输入/结果 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SUB.EMAIL` | 订阅邮箱 | 1 | 2 | `unverified / null` | UX-007 |
| `G.SUB.SUBMIT` | 订阅 | 1 | 2 | `unverified / null` | UX-007 |
| `G.SUB.FEED` | RSS/JSON/OPML/频道 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.FOOTER.LINKS` | 内容/产品/作者/社交入口 | 2 | 0 | `unverified / null` | 待矩阵 |
| `G.FOOTER.MORE` | 更多作品/其他平台 | 1 | 1 | `unverified / null` | 待矩阵 |
| `G.CONTACT.QR` | 微信/小红书二维码/复制 ID | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.HERO.READ` | 开始阅读 / 读这篇文章 | 2 | 4 | `unverified / null` | 待矩阵 |
| `H.HERO.PRODUCT` | 探索产品 | 1 | 2 | `unverified / null` | 待矩阵 |
| `H.HERO.ABOUT` | 认识我/关于我 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.HERO.SOCIAL` | 社交图标链接 | 1 | 2 | `unverified / null` | 待矩阵 |
| `H.CHAT.OPEN` | Bear 头像 | 1 | 5 | `unverified / null` | UX-025 |
| `H.CHAT.BUBBLE` | 环绕问题气泡 | 1 | 1 | `unverified / null` | 待矩阵 |
| `H.CHAT.QUICK` | 快捷问题 | 1 | 1 | `unverified / null` | UX-030 |
| `H.CHAT.INPUT` | 给 Bear 的消息 | 1 | 15 | `unverified / null` | UX-025, UX-026, UX-027, UX-030, UX-031 |
| `H.CHAT.SEND` | 发送消息 | 1 | 12 | `unverified / null` | UX-026, UX-027, UX-030, UX-031 |
| `H.CHAT.CLEAR` | 清空对话 | 1 | 2 | `unverified / null` | 待矩阵 |
| `H.CHAT.CLOSE` | 关闭对话 | 1 | 12 | `unverified / null` | UX-025, UX-027, UX-030, UX-031 |
| `H.CHAT.RETRY` | 重试这条消息 | 1 | 4 | `unverified / null` | UX-027 |
| `H.CHANNEL.TABS` | 写作频道标签 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.CHANNEL.PREV` | 上一个频道 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.CHANNEL.NEXT` | 下一个频道 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.CHANNEL.MORE` | 查看全部文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.CHANNEL.CARD` | 频道内文章卡片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.BOOK.LINK` | 书籍封面/阅读 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.PRODUCT.CARD` | 产品主卡片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.PRODUCT.OPEN` | 打开产品/GitHub | 1 | 2 | `unverified / null` | 待矩阵 |
| `H.ACTIVITY.STATS` | 总文章/今年/年数/标签 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.ACTIVITY.YEAR` | 热力图年份 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.ACTIVITY.DAY` | 热力图日期格子 | 1 | 0 | `unverified / null` | 待矩阵 |
| `H.ACTIVITY.RECENT` | 最近文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.FILTER.TOPIC` | 全部/AI Agent/工程/成长/项目 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.FILTER.MORE` | 更多筛选 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.FILTER.TAG` | 标签选项 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.FILTER.SORT` | 排序 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.FILTER.RESET` | 清除筛选/重置 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.CARD.OPEN` | 文章标题/封面 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.CARD.MORE` | 加载更多/下一页 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.CARD.PAGINATION` | 继续加载文章/下一页 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.TAXONOMY.TAG` | 标签/分类入口 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.TAXONOMY.COLUMN` | 专栏卡片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.ARCHIVE.YEAR` | 归档年份 | 1 | 0 | `unverified / null` | 待矩阵 |
| `L.ARCHIVE.POST` | 归档文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.META.AUTHOR` | 作者卡/日期/语言/分类/标签 | 4 | 0 | `unverified / null` | 待矩阵 |
| `A.META.SOURCE` | 编辑本文/查看源文 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.TOC.TABS` | 目录/系列/AI 阅读标签 | 1 | 2 | `unverified / null` | UX-003 |
| `A.TOC.LINK` | 目录标题项 | 1 | 4 | `unverified / null` | UX-009, UX-014 |
| `A.TOC.FAB` | 移动阅读工具 | 1 | 2 | `unverified / null` | UX-014 |
| `A.TOC.MOBILETABS` | 目录/系列/AI/分享 | 1 | 6 | `unverified / null` | UX-003, UX-004, UX-014 |
| `A.TOC.SERIES` | 系列列表/上一下一篇/更多系列 | 3 | 0 | `unverified / null` | 待矩阵 |
| `A.TOC.SERIESMORE` | 查看系列全部篇数 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.CHIP` | 总结/原句/关联/质疑/入门/延伸/系列视角 | 2 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.INPUT` | 文章问题 | 2 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.SEND` | 发送问题 | 2 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.STOP` | 停止回答 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.CONTEXTCLEAR` | 移除引用上下文 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.RETRY` | 重试 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.FOLLOWUP` | 继续提问建议 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.AI.SHARE` | 分享阅读洞见 | 2 | 0 | `unverified / null` | 待矩阵 |
| `A.SELECTION.SHARE` | 选文分享 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.SELECTION.AI` | 解释选中段落 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.SELECTION.COMMENT` | 评论选中段落 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.SELECTION.MORE` | 更多/复制引用/复制定位链接/清除 | 4 | 0 | `unverified / null` | 待矩阵 |
| `A.SELECTION.COMMENTDRAWER` | 评论抽屉关闭/复制/继续阅读 | 3 | 0 | `unverified / null` | 待矩阵 |
| `A.BODY.LINK` | 正文/脚注/参考资料/文内锚点 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.BODY.IMAGE` | 图片放大/关闭 | 2 | 0 | `unverified / null` | 待矩阵 |
| `A.BODY.CODECOPY` | 复制代码 | 1 | 11 | `unverified / null` | UX-005, UX-011 |
| `A.BODY.CODEEXPAND` | 代码全屏/字体缩放/关闭 | 4 | 9 | `unverified / null` | UX-011, UX-013 |
| `A.BODY.FAQ` | FAQ 折叠 | 1 | 3 | `unverified / null` | UX-016, UX-019 |
| `A.BODY.NOTES` | 月度思考段落定位 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.BODY.LINKPREVIEW` | 链接预览 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.BODY.FOOTNOTEPREVIEW` | 脚注预览/继续到脚注 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.FOOTER.NEXT` | 上一篇/下一篇/相关文章/专栏结尾 | 3 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.ENTRY` | 生成分享卡/微信分享 | 2 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.DIRECT` | X/Email/复制链接 | 2 | 3 | `unverified / null` | UX-006 |
| `G.SHARE.CLOSE` | 关闭卡片编辑器 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.THEME` | 卡片主题颜色 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.MODE` | 当前回答/全部回答 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.COPYIMAGE` | 复制图片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.SAVE` | 下载图片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.SYSTEM` | 系统分享 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.COPYTEXT` | 复制文本/引用/原文链接 | 2 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.SOURCE` | 分享到X/返回原文 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.BOOT.HOME` | 终端品牌返回首页 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.BOOT.READ` | 先读文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.BOOT.SKIP` | 准备中/进入/打开工作区 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.HOME` | Space Café 品牌 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.LANGUAGE` | EN/中 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.QUIET` | 安静模式 | 1 | 3 | `unverified / null` | UX-002 |
| `S.CAFE.PICKER` | 换个地方/当前地点/换个风景 | 1 | 6 | `unverified / null` | UX-001, UX-023 |
| `S.CAFE.THEME` | 六个场景卡片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.PICKERCLOSE` | 关闭场景选择 | 1 | 1 | `unverified / null` | 待矩阵 |
| `S.CAFE.SEAT` | 回到座位 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.TERRACE` | 去露台看看 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.REPLAY` | 重播入场 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.CAFE.READ` | 坐下读一篇 | 1 | 1 | `unverified / null` | 待矩阵 |
| `S.CAFE.WORKSPACE` | 打开工作区 | 1 | 1 | `unverified / null` | 待矩阵 |
| `S.CAFE.RETURN` | 回到咖啡馆 | 1 | 3 | `unverified / null` | UX-023 |
| `S.WORLD.LOOK` | 拖动环顾 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.WORLD.WALK` | 方向键/WASD/触控四方向 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.WORLD.COMPUTER` | 真实三维电脑屏幕 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.OS` | CUBXXW OS菜单 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.HOME` | 欢迎与关于我 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.LAUNCH` | 所有应用 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.SEARCH` | 搜索/⌘K | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.OVERVIEW` | 窗口概览 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.ARRANGE` | 窗口并排/整理窗口 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.DESKTOP` | 显示桌面 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.LAB` | Product Lab | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.MENU.BLOG` | 返回博客 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.DOCK.APP` | Dock常用应用入口：桌面7项/手机5项，另有OS；全部11项在Launchpad | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.WINDOW.CLOSE` | 关闭窗口 | 1 | 6 | `unverified / null` | UX-021, UX-023, UX-024 |
| `S.WINDOW.MINIMIZE` | 最小化 | 1 | 5 | `unverified / null` | 待矩阵 |
| `S.WINDOW.MAXIMIZE` | 最大化/恢复 | 1 | 4 | `unverified / null` | UX-024 |
| `S.WINDOW.ARRANGE` | 窗口并排 | 1 | 5 | `unverified / null` | UX-023, UX-024 |
| `S.WINDOW.DRAG` | 标题栏拖动 | 1 | 1 | `unverified / null` | UX-021 |
| `S.WINDOW.RESIZE` | 右/下/角缩放 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.WINDOW.OVERVIEWITEM` | 窗口概览项 | 1 | 1 | `unverified / null` | UX-024 |
| `S.SEARCH.QUERY` | 打开应用或找文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.SEARCH.RESULT` | 结果项 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.SEARCH.EMPTY` | 清空搜索/浏览所有应用 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.SEARCH.CLOSE` | Esc/关闭搜索 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.LAUNCH.QUERY` | 查找应用 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.LAUNCH.APP` | 应用磁贴/查看所有应用 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.LAUNCH.CLOSE` | 完成/Esc | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.welcome.ENTER` | 进入空间 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.welcome.ROUTES` | 文章/作品/AI向导/关于我 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.welcome.PROFILE` | 个人档案/这些年/阅读地图/展开履历 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.welcome.LINKS` | 简历/GitHub/联系/公开JSON/时间线 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.products.SELECT` | 产品侧栏选择 | 1 | 0 | `unverified / null` | UX-028 |
| `S.APP.products.OPEN` | 真实产品/预览/源码/相关写作 | 2 | 1 | `unverified / null` | UX-028, UX-029 |
| `S.APP.reader.QUERY` | 筛选文章 | 1 | 2 | `unverified / null` | UX-010 |
| `S.APP.reader.FILTER` | 全部/AI/工程/思考/收藏 | 1 | 2 | `unverified / null` | UX-010 |
| `S.APP.reader.ITEM` | 文章列表项 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.reader.NAV` | 返回目录/原文 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.reader.FAVORITE` | 收藏/已收藏 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.reader.EXPLAIN` | 解释选中内容 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.FILTER` | 地区筛选 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.SELECT` | 打开照片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.NAV` | 返回/上一张/下一张 | 3 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.RETRY` | 重试照片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.LOAD` | 加载Immich/刷新/重试连接 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.MORE` | 继续加载相册 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.photos.PLACE` | 去过的地方/查看旅行区域 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.map.PIN` | 地图区域标记 | 1 | 1 | `unverified / null` | 待矩阵 |
| `S.APP.map.REGION` | 区域列表 | 1 | 0 | `unverified / null` | UX-021 |
| `S.APP.map.VIEW` | 拖动/键盘平移地图 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.map.ZOOM` | 放大/缩小/全部/世界 | 3 | 6 | `unverified / null` | UX-022 |
| `S.APP.map.RELATED` | 相关照片/游记/数据许可 | 3 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.books.READ` | 开始阅读 | 1 | 1 | `unverified / null` | UX-028, UX-029 |
| `S.APP.notes.EDITOR` | 本地笔记 | 1 | 5 | `unverified / null` | UX-021 |
| `S.APP.notes.EXPORT` | 导出.md | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.notes.SANDBOX` | 保存到沙盒 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.contact.DRAFT` | 留言草稿 | 1 | 0 | `unverified / null` | UX-028 |
| `S.APP.contact.CHANNEL` | 邮件/GitHub公开留言/WhatsApp/社交 | 3 | 1 | `unverified / null` | UX-028, UX-029 |
| `S.APP.terminal.COMMAND` | 命令输入/help/history/run | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.NEW` | 新对话 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.HISTORY` | 历史/关闭历史 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.SESSIONQUERY` | 查找之前聊过的内容 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.SESSION` | 历史会话项 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.EXPORT` | 导出记录 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.CONTEXT` | 当前页面/选文上下文 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.INPUT` | 给空间助手的任务 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.VOICE` | 语音输入 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.SEND` | 发送 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.STOP` | 停止 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.ACTIVITY` | 任务执行过程/工具步骤 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.settings.LANG` | 中文/English | 1 | 0 | `unverified / null` | UX-028 |
| `S.APP.settings.THEME` | 经典浅色/深色 | 1 | 0 | `unverified / null` | UX-028 |
| `S.APP.settings.COLOR` | 青绿/暮蓝/鼠尾草 | 1 | 0 | `unverified / null` | UX-028 |
| `S.APP.settings.EXPORT` | 导出工作区 | 1 | 0 | `unverified / null` | UX-028 |
| `S.LAB.SWITCH` | CUBXXW OS/Product Lab双向切换 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.LAB.FEATURE` | 推荐产品/所有产品锚点 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.LAB.PRODUCT` | 产品截图/打开产品/预览/源码 | 2 | 0 | `unverified / null` | 待矩阵 |
| `S.LAB.KNOWLEDGE` | 进入知识空间 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.KNOWLEDGE.BACK` | 返回Product Lab | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.KNOWLEDGE.FILTER` | 全部/产品/写作/系列 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.KNOWLEDGE.NODE` | 可聚焦节点标签 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.KNOWLEDGE.OPEN` | 打开当前条目 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.KNOWLEDGE.RELATED` | 相邻条目/浏览写作 | 2 | 0 | `unverified / null` | 待矩阵 |
| `T.HERO.EXPLORE` | 探索世界/Polarsteps | 1 | 0 | `unverified / null` | 待矩阵 |
| `T.MAP.PIN` | 世界地图地区点 | 1 | 0 | `unverified / null` | 待矩阵 |
| `T.MAP.REGION` | 区域游记文章卡 | 2 | 0 | `unverified / null` | 待矩阵 |
| `T.BOOK.READ` | 书脊/封面 | 1 | 0 | `unverified / null` | 待矩阵 |
| `T.BOOK.ASK` | 和这本书聊聊 | 1 | 3 | `unverified / null` | UX-012, UX-017 |
| `T.BOOK.CLOSE` | 关闭书籍AI | 1 | 5 | `unverified / null` | UX-017 |
| `T.BOOK.SUGGEST` | 书籍建议/追问 | 1 | 4 | `unverified / null` | UX-012, UX-020 |
| `T.BOOK.INPUT` | 书籍问题 | 1 | 7 | `unverified / null` | UX-012, UX-017 |
| `T.BOOK.SEND` | 发送书籍问题 / 请求中停止生成（同一按钮） | 1 | 7 | `unverified / null` | UX-012, UX-017, UX-020 |
| `T.SOCIAL.QR` | 社交二维码 / 查看 ID / 关闭 | 2 | 3 | `unverified / null` | UX-018 |
| `T.SOCIAL.LINK` | 社交平台链接 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.HERO.ACTION` | 经历/文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.HERO.CAROUSEL` | 人物照片轮播/命名照片选项 | 2 | 0 | `unverified / null` | 待矩阵 |
| `B.STORY.CAROUSEL` | 旅程横向照片/选项/展开文字 | 3 | 0 | `unverified / null` | 待矩阵 |
| `B.IDENTITY.LINKS` | 简历/公开资料/联系/产品 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.INTERVIEW.START` | AI采访主题/返回/关闭 | 3 | 0 | `unverified / null` | 待矩阵 |
| `Q.STORY.START` | 进入故事/从头开始/文字版 | 3 | 0 | `unverified / null` | 待矩阵 |
| `Q.STORY.PAUSE` | 暂停/慢走/正常/加速 | 2 | 0 | `unverified / null` | 待矩阵 |
| `Q.STORY.MOVE` | 方向键/跳跃/触控移动 | 1 | 0 | `unverified / null` | 待矩阵 |
| `Q.STORY.LEVEL` | 文章关卡块/文章卡 | 2 | 0 | `unverified / null` | 待矩阵 |
| `Q.STORY.REPLAY` | 再走一遍/去读文字/跳过 | 3 | 0 | `unverified / null` | 待矩阵 |
| `E.404.HOME` | 返回主页/浏览文章/推荐文章 | 2 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.context-budget` | 上下文预算 | 3 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.agent-loop` | Agent循环 | 4 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.effect-recovery` | 副作用恢复 | 3 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.flow-bottleneck` | 流动瓶颈 | 4 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.gitops-reconcile` | GitOps对账 | 4 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.memory-lineage` | 记忆来源 | 2 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.notification-threshold` | 通知阈值 | 4 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.reliability-chain` | 可靠性链 | 5 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.session-tree` | 会话树 | 2 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.session-scope` | 会话作用域 | 1 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.vector-cosine` | 向量余弦 | 5 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.task-cost` | 任务成本 | 2 | 0 | `unverified / null` | 待矩阵 |
| `X.INTERACTIVE.RESET` | 重置图示/参考说明/来源 | 3 | 0 | `unverified / null` | 待矩阵 |
| `X.GALAXY.NODE` | 知识星图节点/中心 | 1 | 0 | `unverified / null` | 待矩阵 |
| `X.EMBED.LINKS` | Buy Me a Coffee外部支持组件 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.WALLS` | 抹灰墙/木梁/落地窗立柱 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.FLOOR` | 木地板/接缝/露台地板 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.RUG` | 编织地毯 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.TABLE` | 圆桌/纸页/陶杯 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.CHAIR` | 椅背/坐垫/椅腿 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.SHELF` | 书架/彩色书脊 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.BAR` | 咖啡吧/机器/杯碟 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.DESK` | 书桌/键盘/杯子/鼠标 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.PHOTO` | 桌上旅行照片/相框 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.LIGHT` | 吊灯/太阳/阴影 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.PLANT` | 盆栽/陶瓶 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.SKY` | 天空/雾/远景 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.GARDEN` | 庭院/月洞门/竹/苔藓/石 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.TREES` | 树木/树叶实例/岩石 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.MOUNTAIN` | 分层群山 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.WATER` | 水面/波纹 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.RAIN` | 雨粒子/街景/路灯 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.OBJECT.CAT` | 小猫/眼睛/骨骼/接触影 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.BOOT` | 终端光标/真实步骤/揭幕 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.CAMERA` | 进电脑/离开/座位/露台镜头 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.CAT` | 小猫步态/尾巴/观察/停留 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.WEATHER` | 雨粒/水波 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.ENTRY` | 欢迎方块/轨道/窗口入场 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.DOCK` | Dock hover 提起图标 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.WINDOW` | 窗口开关/最小化/拖拽/缩放/并排 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.HOMEFIELD` | 首页背景场/球体 | 0 | 4 | `unverified / null` | 待矩阵 |
| `MOTION.HOMEBUBBLES` | 头像周围建议气泡 | 0 | 4 | `unverified / null` | 待矩阵 |
| `MOTION.HOMEREVEAL` | 首页分区 reveal | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.MICRO` | 涟漪/悬浮/磁吸/反馈 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.CARDTILT` | 卡片鼠标倾斜 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.COVER` | 封面视差 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.READPROGRESS` | 文章阅读进度/返回顶环 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.WAYFINDER` | 章节索引安静/唤醒 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.LINKPREVIEW` | 链接/脚注预览显隐 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.TRAVELREVEAL` | 旅行分区 reveal | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.KNOWLEDGE` | Canvas/WebGPU关系场/指针响应 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.ABOUTCAROUSEL` | 照片横向滚动 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.QUEST` | 游戏行走/金币/跳跃/爬山/滑索 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.404` | 404漂浮画面 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.CHATSTREAM` | AI流式文字/运行步骤/停止 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.INTERACTIVE` | 12类模型图示播放/步骤/响应 | 0 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.reader.SUMMARIZE` | 总结这篇文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `T.BOOK.RETRY` | 重试书籍问题 | 1 | 0 | `unverified / null` | 待矩阵 |
| `X.EMBED.CALENDLY` | 预约时间外部浮钮/日历 | 2 | 0 | `unverified / null` | 待矩阵 |
| `X.EMBED.POLARSTEPS` | 嵌入旅行轨迹 | 1 | 0 | `unverified / null` | 待矩阵 |
| `X.EMBED.OPENSOURCE` | 开源项目列表链接 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.FOLLOWUP` | AI追问输入/发送 | 2 | 1 | `unverified / null` | UX-015 |
| `G.SEARCH.RETRY` | AI搜索重试 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SEARCH.CONTACT` | 打开微信名片 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.CONTACT.CLOSE` | 关闭联系卡 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.CONTACT.COPY` | 复制账号 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.CONTACT.VIEW` | 查看二维码大图/打开主页 | 2 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.MORE` | 更多/收起分享渠道 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.WEBSHARE` | 系统分享文章 | 1 | 0 | `unverified / null` | 待矩阵 |
| `G.SHARE.PLATFORMS` | X/Email/LinkedIn/Telegram/WhatsApp/Reddit/微博/B站/知乎/小红书/HN/Facebook | 2 | 0 | `unverified / null` | 待矩阵 |
| `A.BODY.DISCLOSURE` | 收起长折叠内容 | 1 | 0 | `unverified / null` | 待矩阵 |
| `A.FAQ.AI.OPEN` | 继续问AI | 1 | 1 | `unverified / null` | UX-012, UX-016 |
| `A.FAQ.AI.CHIP` | FAQ建议问题 | 1 | 0 | `unverified / null` | UX-012 |
| `A.FAQ.AI.INPUT` | FAQ追问输入 | 1 | 5 | `unverified / null` | UX-012 |
| `A.FAQ.AI.SEND` | FAQ追问发送 / 请求中停止生成（同一按钮） | 1 | 4 | `unverified / null` | UX-012, UX-016 |
| `A.FAQ.AI.RETRY` | FAQ追问重试 | 1 | 0 | `unverified / null` | UX-012 |
| `A.COMMENTS.EXTERNAL` | 登录/排序/回复/反应/评论输入与提交 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.RETRY` | 作为新任务重试 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.APPROVE` | 批准执行 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.DECLINE` | 拒绝 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.CHIP` | 聊产品/最新写作/某地旅程 | 1 | 0 | `unverified / null` | 待矩阵 |
| `S.APP.agent.LINK` | 回答中的文章/产品/照片/地点入口 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.INTERVIEW.CONSENT` | 同意复选框/开始采访 | 2 | 0 | `unverified / null` | 待矩阵 |
| `B.INTERVIEW.ANSWER` | 采访回答输入 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.INTERVIEW.SEND` | 发送采访回答 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.INTERVIEW.RESTART` | 再来一次 | 1 | 0 | `unverified / null` | 待矩阵 |
| `B.INTERVIEW.RETRY` | 重试/打开独立采访页 | 2 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.NEWSLETTER` | 订阅熊眼睛追踪/成功反应 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.CONTACTQR` | 二维码扫描线/联系卡显隐 | 0 | 0 | `unverified / null` | 待矩阵 |
| `MOTION.FAQ` | FAQ高度展开/AI面板/流式回答 | 0 | 2 | `unverified / null` | UX-019 |

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

## D2b 独立闭环与provenance更正

2026-10-16T01:17:39+08:00：已读12条contracts/recovery/IME日志、对应实际断言源、6条自定义回执与当前47文件manifest。已覆盖focus/closed sheet/IME/取消/错误恢复按具体范围关闭，未覆盖语言/主题/缩放保持null。D1原五流程日志仍存；原JSON现在为索引，当前5条重验与换书图统一绑定D2b，不能当旧D1图。稳定390px图已评D4范围89；no-preference中间帧不评分。后续真正可见的优先项：复制说明工具净空、书籍手机Send/Stop与chip44px命中、长chip孤行/12px密度；首页旧图多入口/低信息小字需新当前前后图，而非只作源码重构。

## Space当前实拍优先项

2026-10-16T01:20:46+08:00：独立查看desktop笔记与390地图图、6条窗口连续性检查与实际几何。最小化保持同DOM、max恢复、关闭再开保留文字在两尺寸均通过（片段96）；手机windowactions44.28专项通过。手机map缩放22.14px宽属项目目标缺口，D2.3片段80、G4cap89；pin8px有91.8×44等价区域列表，桌面hitfalse需先查当前遮挡节点。

真实观感：desktop笔记D1范围85，D4范围72.5（60/60/90/80）；手机地图D4范围80。优先接近1:1的文字与清楚承载纸面，减少透明工作区/实体电脑/窗口多重边界，保留咖啡在外侧；正文/工具实际可读后再调装饰。灰图原因未知，先查currentSrc/naturalWidth/data-image-state再决定修复，不填假图、不自动怪后端。新增UX-021/022已入JSON追踪；未改inventory数量。

## D3当前复制视觉复核

2026-10-16T01:23:26+08:00：8条视觉/全屏检查已读，4张图逐张看。实际文字与44px展开工具净空26.23/45.55/18.53/14.58px，中文单语复制与coarsepointer长按提示清楚，D4.4此片段96。专家D1范围96（四项96），D4范围94.5（90/96/96/96）；320英文末尾Copy.独占末行略碎，属于小幅文案/断行余量，不阻断功能。完整copy/expand仍null（hover/200%/实体长按等未齐）。

Space诊断更正：settled390图已逐张看，两张localimage450ms后complete/naturalWidth480/opacity1/ready，灰块只是早帧。稳定地图D4范围82.5；桌面pin bboxcenter落海洋、region超出window可滚范围，不报遮挡bug。临时不透明纸面概念明显隔开实体电脑与工作区，但未改生产且前台app不同，不算数值A/B；原字仍小软，后续样式批必须看实际字号/target，而非只加不透明。

## D4b 当前Travel闭环

2026-10-16T01:34:25+08:00：19文件manifest当前全部匹配，独立读10条入口/触控/短屏合同、5条请求重验与实际断言，逐张看568×320/390×844稳定图。未发现新的P0/P1。UX-020在320/390中文与568×320/256中英具体范围关闭：Send/Stop44、建议≥44/61且不孤字；短屏第三项初始被conversation裁剪，滚入点击与30段回答/Home/End实测可用，固定header/composer不被挤走。当前专家D1/D4范围均94.5，只对两图；完整Travel总分仍null。

盘点已导入v1.6，309族/357selectors；新增真实条件Stop归原SearchAI族，未被关闭流证明Stop点击，保留未知且不继承族验收。D2b旧limits称D1与source/note称D2b的矛盾保留，当前5流程已用明确D4bsource再验。

## E5 实际Space复核

2026-10-16T01:48:55+08:00：4文件manifest全匹配，已看10张实际图与几何、5个合同断言源（父报告5/5，原始log待归档）。Notes主文字实际16.4px，desktopcontrols26.24px，320/390/568phonewindow/map44.28px；不透明纸面消除了实体电脑穿透，focusring是实际输入状态，不作装饰扣分。UX021按主阅读与纸面范围关闭，UX022按已测宽度关闭；600–640断点未知。专家范围：desktopNotesD1=91.5、D4=90（原72.5）；390NotesD4=93；darkNotes/readerD4=90；390MapD4=87.5。完整控件分仍null。

新UX023：568×320实际图café返回HUD覆盖窗口close的候选，已交父任务centerhit/真实click窄测，不能用44px尺寸断言当可点击证明。E5.1仅FAQ源码只读审查，targetOpen/WAAPI取消与焦点意图暂未见新P0/P1，但未构建/未实测，不关闭UX019。

## E5.2 边界实际闭环

2026-10-16T02:00:50+08:00：9/9当前hash匹配，已读生产diff、11条原始合同日志及真实断言、4条实际鼠标旅程，8张568中英/620/844 coarse图逐张看。未发现新的P0/P1。

- UX-019：E5.1的motion合同虽过，panel[hidden]仍visible的失败保留；E5.2显式CSS hidden规则后，两条FAQ合同通过。只关闭1440×900中文的初始隐藏/noBox/不能focus、运行时reduce中断终态、延迟焦点不抢、收起abort和草稿恢复链。
- UX-022：620×844与844×390 coarse已实际≥44.27px、中心命中与点击；568中英也过。旧26.24px失败不删除；不能外推所有平板/触屏。
- UX-023：568×320中英、844×390 coarse的窗口/HUD中心分离；真实coordinate close移除窗口仍desktop，picker Escape回触发器，返回café后CtrlK再进保留原editor DOM。关闭这些范围。

E5截图尺寸更正依visual.json：1440×900、390×900、320×844、568×320；reading合同另有390×844，不混同。E5原5条日志已归档。844地图图可见前窗右侧被carrier裁切，body自身无横溢不等于全部内容都在carrier内；maximize/arrange与被裁内容可达性待后续专测，不据此宣布新P0/P1或全部地图已通过。

## 首页方向独立比较：A胜出，B保留挑战者

2026-10-16T02:00:50+08:00：读父设计记录/原型源，逐张比较before/A/B桌面与390首屏、posts/books/Bear共15图，并看baseline chat展开图。采用deepen-design固定相对量表，**A减B**，范围-2..+2；这是设计选择，不是96分认证。主方向为A1“公开实践笔记”，小幅条件优势；B1“先认识作者”保留，尤其在作者辨识/亲近感方面更强。

| 标准 | 权重 | A−B | 可证伪依据 |
| --- | ---: | ---: | --- |
| 独特性 / Ownability | 25 | -1 | 隐藏名字后，B的真实作者头像与三条有具体作者语气的问题仍能承载“和这个人聊”；A首屏的身份+文章列更接近通用作者刊物。A有真实长标题，但没有额外个人资产。 以遮住姓名/站点名的桌面与390图做无提示回忆；若受试者对A的作者与内容身份记忆更明确，此项回退为0或反转。 |
| 产品真实 / Product truth | 25 | 2 | A首屏直接展示实际已发布文章标题、日期与正文摘录，390首屏可看到标题；B新增证据仍只是AI对话邀请和问题，未展示实际回答机制。两者下方真实旅行书保留。 不滚动让访客指出一项现在能读的真实成果；检查A真实文章链接可读而非虚假预览。 |
| 五秒清晰 / Five-second clarity | 15 | 1 | 两者阅读/产品CTA一致；A右列对应“开始阅读”的具体对象，并在390首屏出现真实文章，B在844px首屏底部仍停留于AI第一问题，阅读证据被推后。 给新访客5秒后询问作者做什么、从哪里开始读；若B完成率或正确率更高，此项撤回。 |
| 结构差异 / Structural distinction | 15 | 1 | A把成果放入hero、文章改为标题/摘录序列、对话移到文章后，读→聊→旅行的节奏在截图可辨；B保留原文章三卡与书籍结构，主要重排分身栏。A的列表过长仍是待修副作用。 只给轮廓/灰度截屏仍应识别A的成果与后置对话顺序；如只靠字体/边框才能辨认则退回结构分叉。 |
| 情绪准确 / Emotional precision | 10 | -1 | B的实际照片、直接“这是我的AI分身”与较少问题更像认识一位作者；A以43分钟月度长笔记开门，证据强但轻松来访感较弱。此为专家判断，不代表用户偏好已验证。 在不提示方向名的访谈中比较“有人在实践与写作/像在线客服/像刊物”归因；若A更有人感，此项撤回。 |
| 可实现 / Feasibility | 5 | -1 | A原型新增cloneNode文章并搬移整个Bear实例，需处理重复成果和既有展开/返回/焦点布局；B保留Bear容器，只将后三个问题放details，相对少一次主容器迁移。两者仍需正常生产实现。 以语义模板而非克隆输出A特色文章，并验证移动后chat全部路径；若可无额外状态风险实现，差值改0。 |
| 无障碍/性能风险 | 5 | 0 | 两者只有zh/light/reduce的临时截图；A/B新布局未测chat开关、键盘、实际命中、正常动效、English/dark/zoom与性能。0仅表示目前不能比较，不表示两者通过。 对候选生产版走同一条chat打开/关闭/返回/输入与移动端44px、运行时reduce矩阵后再比较。 |

加权相对结果 **+0.40 / [-2,+2]**。A优势集中于真实成果与阅读次序；B的头像/作者语气更具人感。无障碍/性能项0表示证据不足无法比较，绝非两者通过。

三处有实质差别的变化：D1让真实文章替代协议/版本和六个等权气泡作为首屏证明；D2按读→聊→旅行重排保留的内容；D3让390首屏出现真实文章标题，社交退为次级入口、文章由三卡转为标题/摘录序列。下方旅行书保留真实封面/地点/数据，两版并未靠新色彩伪造内容。

落地前优先修：

1. A首屏与文章第一项重复同一篇43分钟月度长文；特色位需真实编辑导语与不重复列表，不能伪造更短阅读时长。
2. A前三篇都展开为宽列表使posts几乎整屏仍是同一种标题/摘录节奏；只展开一个主要起点，再用紧凑真实标题接续，比较旅行书到达距离。
3. B若复活，先收紧390头像→标题大留白，把完整AI邀请后置或压为一行，保持真实文章与阅读/产品入口易见。
4. 新布局chat开关/返回/焦点/会话未测；A搬移Bear实例、B问题移入details须走同一条键盘/取消/迟到结果/断点链，保留原DOM与会话。
5. A books图的产品图片为空，脚本未等lazy image ready；B书籍标题被导航裁到，对齐锚点也不一致。先等真实图片complete/naturalWidth并稳定相同截帧，再评这些局部，不能当生产缺图或标题消失。

baseline chat仍显示“在线·通常几秒回复”；A/B normal入口不能证明展开后这一不确定承诺已更正。生产候选需明确AI身份与真实请求状态，保留全部社交目标、频道/箭头、旅行书、产品意图、热图和根Space café入口。原型未调用真实AI，仅before实际打开/关闭chat；A/B交互、英文/深色/200%/320/横屏/正常动效/实体触控/性能均为unverified，完整控件/族/全站总分继续null。

若A仍像泛化刊物、重复长篇未解或迁移破坏chat，回D1/D2比较，不能继续调阴影；若B修掉移动留白后真实文章同屏且五秒任务辨识胜A，允许反转胜者。当前停在D2/D3，不用测试数替代方向选择。

## 短横屏整理：UX-024有界候选

2026-10-16T02:06:09+08:00：已读实际max→restore→arrange探针与当前desktop.js/state.mjs，逐张看default/maximized/arranged三图，并以轻量Node复算state几何。**P2：844×390 coarse的3窗“并排”仍重叠，欢迎窗口4个控制中心全被map覆盖。**

原因在`state.mjs:65–72`：2列/2排先算每窗131px高，`fitRect:9–10`再将高度抬到260、第二排y压至30。实际第一排y12、第二排y30，重叠242CSSpx；这使明确整理动作未兑现“并排”。`desktop.js:159`只按宽≤640决定overview，844短高未进入。D1.4此片段80、G4上限89，完整族仍null，不升级为全局或P1。

默认地图右界只比plane多0.82px，body638/638没有横向溢出；实际最大化在plane内且4控命中。此前截图裁切观察至此撤销“内容不可达”疑虑；正常前后窗遮挡不等于整理失败，UX024只针对点击arrange后的结果。

下一有界批建议：按真实可容纳行数/最小窗口高判断；装不下时复用overview，提供每个窗口可选择的恢复入口。此时可访问名称/可见文案应说“查看所有窗口”，只有真平铺才说“窗口并排”。terminal当前源码无条件返回“已并排”也需同策略一致，但未单独实测该反馈，不虚称新运行时失败。

验收保持窄范围：844×390粗指针3/4窗实际选择被盖的welcome；Escape返回真实触发器；回notes仍同editor DOM/草稿；普通1440×900的2/4窗在装得下时仍真平铺；maximize/restore与原rect连续性不丢。E6首页当前尚未构建，不由本探针提前认证。

## 首页运输基线：下一批复现缺陷

2026-10-16T02:10:53+08:00：已读home-chat-baseline-probe.json并用77bf94c2的Git blob核对模板hash，匹配；当前E6源码/布局未构建，不能以旧预览验收它。全部API为桩，未调用真实模型。

- UX025 / D6.4片段60：未发送草稿close/open变空。原模板close→renderOrbit用innerHTML替换输入，未独立保存draft。
- UX026 / D2.2片段60：合成isComposing Enter触发1次stub，原keydown缺composition guard；不作OS级IME结论。
- UX027 / D3.1片段80：虚拟35秒挂起仍busy/inputdisabled，无Stop；关闭后abort确实发生，因此是缺少就地停止/时限的恢复摩擦，不是“完全无法退出”。headers/delta卡住和DONE保持连接另属源码后续候选，未伪称实测。

下一运输批按草稿、composition、Stop/时限、关闭/迟到结果/焦点分别验收，不能把E6布局或正常聊天展开图算通过。

## 四App下一有界排版/触控批

2026-10-16T02:10:53+08:00：已读8个scope几何并独立看16张top/bottom图（1440×900、390×844，zh/light/reduce/maximized）；apps.js/space.css/space-classic.css当前hash与77blob一致。API503隔离，未真实联系/导航外链/发送；只记normal呈现，不认证功能。

UX028是实际阅读/决策信息过小；UX029是390主要anchor触控不足。它们优先于装饰：

| App / 用户任务 | 已观察问题 | 下一有界修改建议 |
| --- | --- | --- |
| products / 先读懂产品再决定是否打开 | 正文11.48、手机目录8.2实际px；手机正文仅194px宽。desktop16:10图覆盖主阅读区，“打开真实产品”在下一屏；手机主链接29.52px高。 | 正文15–16、目录/主要动作13–14实际px；限制desktop截图高度/阅读行长；手机目录用紧凑顶部选择释放正文宽度，保留全部真实产品与外链，不把图中假按钮做成页面点击区。 |
| books / 选择一本真实书开始读 | 摘要8.2、封面meta6.56、阅读字9.02实际px；开始阅读仅13.53px高，cover为div没有等价大点击区。 | 保留四色书封，辅助编号/作者可10–11实际px；摘要约14、开始阅读重要入口≥44实际px。手机单列或封面+正文行，允许纵滚，不把四书硬塞同屏。 |
| contact / 写草稿并自行选渠道发送 | 渠道字9.02、发送边界提示8.2实际px；手机邮件/公开GitHub/WhatsApp36.08px高，X宽35.4。输入区与“由你确认发送”内容本身清楚。 | 输入约16、主要渠道14实际px且≥44目标，隐私/由谁发送说明12–13；社交保留目标、降低围框密度。限制desktop列宽，保留草稿DOM/值，不执行真实发送。 |
| settings / 清楚改偏好并知道可用边界 | 手机按钮44.28已够大，标签仍9.02、能力状态7.52实际px；desktop能力与状态隔很长一行，重要不支持信息太细。 | 现有mobile44.28保留；标签13–14、能力状态12–13实际px，组名16–18；desktop限制状态表宽或上下就近，保留真实不支持状态，边框只分组/选中。 |

建议实际字号层级：长正文/输入15–16px、主动作13–14px、重要辅助说明/能力状态12–13px、非必要装饰编号10–11px。不是所有字一律16，也不是WCAG统一字号规定；CSS声明需经过.82投影后量真实值。只在这4个App live spatialplane下处理，不改world/state/私人DOM与fallback。保留四色书封、真实截图比例、所有产品/社交/渠道目标；边框继续表达输入、选择、分组，不新增一层卡片。允许内容纵滚，不为同屏齐全压小文字。

下一实拍验收：同内容desktop/390前后，另补320、620、844coarse短高；量primary文字与实际44目标/中心hit，检查长英文、深色、zoom、focus/selected及滚到底。Contact只拦截检查mailto/GitHub公开/WhatsApp目标，不真实发信；原草稿同DOM/值、语言与主题/窗口连续性必须保留。E6完成后再开本批，当前不跨改生产。

当前专家范围判断（非完整分）：products D1=80/D4=72.5；books D1=90/D4=81.5；contact D1=85/D4=80；settings D1=87.5/D4=80。分项原因与证据在上方表/JSON；全部控件/族/全站总分仍null。

## E6生产候选：源码先行复核

2026-10-16T02:16:37+08:00：7/7当前文件hash匹配冻结batch-e6-source.json。已读真实模板/partial、CSS、ambient与3份相关测试源，未发现新P0/P1；本阶段只确认源码约束，没有给源码打96或提前接受仍运行的20条home+2条paint。

1. 实践入口来自当前语言Type=posts的AI/工程真实最新文章，原生链接/time/标题/说明由Hugo输出；latest只去重复预览，计数仍用全量，主题频道保留该文。书籍/产品/活动/社交目标数据未删除。
2. hero源码顺序为intro→practice→social；手机10目标按44px+8gap设计；文章区一主+两compact，修掉A原型的三条长摘要节奏。实际净空、短屏和长英文仍等浏览器。
3. 完整Bear根含stage/layer/field静态后置到posts/books之间，messages/request闭包未重建；不确定的在线/时限/每篇读过承诺移除。会话保留与未发送draft不同，UX025–027继续开放。
4. ambient观察实际Bearwrap，真实交互、可见、idle、motion/width/coarse/connection门禁仍在moduleload前；隐藏/偏好/离页沿用dispose生命周期。测试源确有offscreen无mount、可见后mount及runtime reduce分支，但尚未读最终回执。

新partial无JS阅读、320/390中英主次/all10social/二维码Escape、原Bearroot/消息/问题返回、paint预留位置均有明确合同断言。等待父6scope实际截图后再给E6 D1/D4范围判断；旧A/B原型+Space图片不能验收本次生产布局。

## E6实际落地：A方向保留，后续源码单独验

2026-10-16T02:29:36+08:00：已独立读20条home/about-reading、2条改变的paint、2条产品入口正式pass日志，六actual旅程和24图+neutral+真实GPU两图共27图。7hash最初匹配；最后写入时homepage模板/CSS已进入授权E6.1修改，故本轮全部绑定E6历史manifest，不认证当前WIP。未发现新P0/P1，UX030为P2且正在下一批修。

Nango实践替代原A重复月记，latest去重、一主两compact改善扫描；后置原Bear仍有作者照片和会话，手机一行入口避免B大留白。真实书籍/产品内容保留。A仍为主方向、B保留，原相对+0.40不换算绝对分。

范围专家判断：hero D1=94.5/D4=93；posts D1/D4=91.5；chat（不含568可达性）D1/D4=90；静态conversation D4=90；books D4=91.5。320英文实践标题局部入首屏、568常规纵滚不是自动失败；quick省略和书脊VIETNA/M为后续具体工艺余量。neutral文章图用于normal，早帧红/蓝hover不判样式不一致。

对应合同片段确认：无JS真实文章可读；阅读CTA焦点posts；10social44CSSpx，320/390中英联系卡Escape回触发器；原Bear根/消息/回答/opener连续、close/clear迟到隔离、retry、离开后focus、合成bfcache均按指定范围通过。未发送draft/合成composition Enter/35秒挂起恢复仍为UX025–027，不被这些正常链抵消。

真实Metal门禁：hero trustedintent+3秒无renderer请求，Bear可见才2canvas；runtime reduce销毁/restore重挂且pageErrors空。只接受门禁与偏好生命周期片段，不证明FPS/INP/隐藏零帧。实际normal强白密线球压过人物与问题，D4仅82.5；同配置reduce静态90。下一独立小批收敛线密度/亮度/不透明度/光晕边缘，保留真实头像、问题、操作反馈和资源门禁。

UX030实际568中英初始chat：input已focus却部分出屏，close中心被固定导航盖；滚入composer后close又离开视口。中文滚后仅约0.17CSSpx边界出屏，不夸大完全不可达。P2/D6.1片段80、G4cap89，非全局或P1。4张before/scrolled与JSON已读；E6.1在修，当前不关闭。

已同步inventory v1.7局部记录，SearchStop仍不继承旧完成焦点证据；完整309族/357控件/全站均null，未按24合同给审美满分。

## E6.1当前冻结：短屏闭环，材质未达目标

2026-10-16T02:36:50+08:00：9/9当前源码hash与QA config hash匹配（默认1440×900、单worker）；正式build/typecheck、6条short/normal与3条continuity日志已读，五实际坐标旅程、8张实图逐张看，无新P0/P1。

UX030仅关闭568×320/256中英、844×390 coarse英文light/reduce范围：input/send/close实际44CSSpx且全部在导航下/屏内，centerhit；真实coordinateclose移除panel，opener获焦点，重开Escape仍回opener。四568合同另验证末条真实建议可滚入/坐标点击、24段长回答Home/End滚动且chrome仍可达；390/1440正常wrapper为display:contents、原尺寸/会话保留。旧E6失败保留historical，不用旧24条替新状态。草稿/IME/Stop仍未修。

短屏D4范围91.5（90/96/90/90）；中段独立滚动允许256高只显少量内容，输入/关闭稳定，不靠压小44目标塞齐。动态偏好门禁使用当前真实Metal再次通过：herointent+3秒无renderer，Bear可见2canvas，reduce销毁/restore重挂。仅门禁/生命周期片段96，非性能/隐藏零帧结论。

normal球体D4范围85（90/80/80/90），比E6白密网82.5更安静，但核心NormalBlending形成褐色薄壳/实体片，未达自然轻量的目标；静态仍更清楚，不为checkpoint抬分。E6.2可以仅core恢复Additive并降低每帧实际opacity/rim，network维持低alpha Normal；constructor默认会被loop目标覆盖，两处须同意图。只重验shader/生命周期与真实light/dark+reduce，不重复无关24合同。

若窄材质修正后仍靠反复调色解释其意义，下一D4组件分叉明确保留两条：A进一步收敛、无实体壳的低对比球；B真实头像+少量完整问题，其余问题可展开。两条尚未实拍，不提前给相对胜负；B不是当前已授权删除问题或原状态。E7已证实的数据/输入/停止恢复优先。

新增UX031为source-only P2候选：生成中用户仅wheel滚去Books，焦点仍在chatsection，完成renderChat→layoutChat(hadChatFocus)→window.scrollTo可能把页面拉回；现“离开不抢焦点”合同点击posts改变了焦点，未覆盖此路径。建议E7受控晚回复复现/修正，当前不说已实测、不设新硬门槛或完整分。所有完整控件/族/全站仍null。

## UX031升级：实际wheel阅读意图被旧完成覆盖

2026-10-16T02:38:36+08:00：已读home-wheel-intent-probe.json/log及before/after两图。568×320英文light/reduce：受控请求开始后chatsection持有焦点；真实wheel620CSSpx滚到旅行书，scrollY从2183到2803，未改DOM焦点。延迟JSON完成后页面回2183（−620），输入框抢到焦点；前图是Angkor书卡，后图是chat。候选至此升级为具体范围复现P2，D3.4片段80；不升级为P1或全设备结论。

E7需让完成/失败保留wheel离开后的页面位置与焦点意图，同时保留显式open/close的短屏可达。现“点击posts后不抢焦点”合同改变了焦点，不能覆盖本链。只有这条延迟JSON完成已实测，失败/其他尺寸仍待补；未调用真实模型。E6.2 renderer正在授权修改，本回执不认证新材质源码。

## E6.2有界材质闭环：实体壳消失，功能缺口仍开

2026-10-16T02:42:21+08:00：9/9源码hash与QA config一致。将当前renderer五处差异反向还原后hash恰等E61：core恢复Additive，glow初值/每帧目标降低，opacity初值/每帧目标均降至.25；稀疏低alpha Normal网络、pulse/thinking/recess和资源门禁未变。正式build4219ms成功。未见新P0/P1，不重审或重复宣称旧24合同当前全范围通过。

四张1440×900中文light/dark normal/reduce实图已逐张查看。E61褐色实体片消失，头像与问题重新优先；浅色D4范围91.5（90/90/90/96），暗色90（90/90/90/90）。暗色仍有淡金多边形光晕，线稿/多圈轨道仍是额外视觉层；静态更轻。此次窄修已达到消除新增实体感回退的目标，未达到可泛化的96审美或整站结论。更大的纯头像/少量完整问题与低对比球组件分叉仍未渲染，放在E7功能恢复之后。

真实Metal双主题回执均为hero trusted intent+3秒0renderer请求，Bear可见2canvas，runtime reduce0/restore2/finalreduce0，pageErrors空。只对资源门禁与运行时偏好生命周期片段给96，不证明FPS、INP、隐藏零重绘、实体设备或其他尺寸。四图绑定batch-e62-source，不能用新材质外推旧交互矩阵。UX025–027与已实测UX031仍开；所有完整控件、族与全站分保持null。

## TravelQR实际基线与inventory v1.9同步

2026-10-16T02:46:56+08:00：已读travel-qr-baseline-probe.json/log和四张initial/reopened实际图。Travel模板独立SHA与当前源码一致（041eb8ac…）；E62首页manifest不含此模板，不将其source说明当Travel完整冻结清单。

UX018升级具体P2：390×844中文light下，reduce/normal打开均保持背景RedNote trigger焦点，Tab走到背景WeChat；Escape确实返回trigger。随即Enter重开同一RedNote，normal约500ms后hidden=true但is-open和aria-expanded仍true，截图只剩背景；reduce重开保持可见。源码389–406无焦点进入、旧transitionend关闭无代次，与实际吻合。D2.2/D3.4失败片段各80，Escape返回单链96；G4 cap89仅约束normal快速重开后内容隐藏范围。完整族仍null，不把midtransition的normal初图作D4正常态评分，不外推全设备/P1。

后续TravelQR有界批处理模态焦点与旧关闭失效，并真实复验reduce/normal快速键盘重开；不插入当前E7。页面仅显示二维码/账号ID，没有copy按钮，不虚构其行为；X/backdrop和跨频道切换未实测。

inventory结构同步到已更新的v1.9：309族/358selectors，H.HERO.READ新增control.ff1fe2（.hp-reading-start__link），旧ffae77保留；新链接仅绑定E6中英无JS真实文章导航，原CTA focus/paint不得共享。v1.8为52局部证据族，v1.9加Travel后为53，完整认证仍0。所有完整控件/族/全站评分仍null。E6–E62已保存4782757e；E7 WIP未验收。

## 原生锚点与右TOC：仅关闭实际点击子路径

2026-10-16T02:49:02+08:00：anchor-intent五源hash全部匹配478 preview；已读source/JSON/正式log、首次失败log与脚本断言，并看两张实际图。1440×900中文light/reduce下，Archives #year-2026真实MacMeta点击原生开新tab，原页hash/scroll不变、defaultPrevented=false、无scrollIntoView；普通click到365CSSpx/hash、scrollBehavior auto，Back恢复原URL。右TOC实际normal→runtime reduce后点击编码中文heading，auto/no smooth/decoded hash正确。三个精确片段各96，不外推Ctrl/其他修饰键/所有年份或锚点。

首次失败仅percent编码大小写严格比较：实际%E8与预期%e8解码相同；脚本改decode比较后通过，生产未变，initial.log保留。

UX009仅关闭当前右TOC点击定位子路径。原诊断还有reading-companion scrollTocItemIntoView的内部container.scrollTo自动追踪；源码157已按每次调用读取matchMedia，但本probe仅拦截Element.scrollIntoView并点击第一项，未触发/观测长目录内部滚动，也未证明正文焦点不变。这部分继续unverified，不能用点击片段认证完整UX009链。toc-highlight.js旧左sidebar仍有smooth，但当前layouts未找到其selector，不把dead/conditional代码当当前实测失败或通过。

F03只对这条Archives Meta意图获得真实正证据；全站anchor与适用矩阵仍null。E7首页WIP不受本批认证。

## E7/E7.1闭环：数据、停止与阅读意图

2026-10-16T02:56:17+08:00：当前E71 8/8hash与QA config匹配。与E7仅recovery测试SHA不同，其余7个hash逐一相等，包含全部生产代码。已独立读closure/helper/9新测试/受影响about与short增量；没有新P0/P1。请求拥有权与signal分离，每fetch/json/read均race25秒idle；reader.cancel不await，DONE不等EOF；failed用户/回复对排context，partial与恢复提示分离。后端followups在DONE前发送，提前结束兼容当前协议。

初跑21合同19pass/2个24999前沿fail原log完整保留。clock.install后随真实时间推进，发送/轮询再加24999会越过deadline；E71仅fixture在请求前pauseAt并记录startedAt，仍断言24999busy/25000ready，续期chunk20000后44999busy/45000ready，未放宽生产期限。修后9/9正式log和typecheck通过；最终21不同合同=原未改6about+6short+修后9，不写成30项。36Node/typecheck与E7 build4468ms已读；fixture-only不重建、不重跑无风险12。

UX025关闭指定中英draft close/reopen/clear/send与两实际旅程，非刷新持久化承诺。UX026仅关闭synthetic isComposing/keyCode229 Enter/Escape guard和普通Enter仍一次发送，OS级输入法未知。UX027关闭已测header/first/later SSE/JSON idle、DONE无EOF、永挂cancel、Stop/retry/failedcontext/迟到隔离。实际568×256中文light与1440×900英文dark reduce的44Stop坐标可点、停止恢复输入、partial保留、下一问context空，6action图逐张看完。

UX031只关闭568×320英文light/reduce真实wheel620+延迟JSON完成：2803→2803、delta0、不聚焦input；两张before/after同位置保留Angkor卡。错误完成/其他尺寸仍未知。原E61回跳−620失败证据与源码候选历史不删除。

实际恢复界面专家判断：短屏D1=93（96/90/96/90）、D4=91.5（90/96/90/90）；桌面深色D1=94.5（96/96/90/96）、D4=90（90/90/90/90）。停止、partial、恢复行与重试主次更清楚；256高重试仍在中段需滚，quick省略/细碎辅助标签/多层分隔有余量。输入/section实际focus环不是装饰缺陷。图中stub文案不代表真实AI内容质量，不靠21合同给审美满分，不重审renderer/E6文章布局。

所有完整控件/族/全站分仍null；TravelQR UX018与Space短屏arrange等剩余队列保持。
