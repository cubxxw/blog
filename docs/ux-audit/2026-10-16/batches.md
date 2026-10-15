# 本地批次与实际证据

工作持续至2026-10-16 12:00（上海）。这是当前验收记录，不是全站已完成声明。最新源码工作树见 control.md；仅本地，未发布。

| 批次 | 实际结果 | 已验收的范围 | 限制/后续 |
| --- | --- | --- | --- |
| 前序 `6d7b9fe9` | 咖啡默认入口、真实首帧终端、小猫、材料与失败恢复 | 见 `docs/acceptance/2026-10-15-space-onboarding-local.md` | 保留风格化场景，未达到照片级写实 |
| A | 真实复制pending/success/failure、焦点与按压、换景名称、quiet选择态 | `batch-a-checks.json`：20条 | 只覆盖记录的状态与设备模拟 |
| B/C | tabs、菜单、分享、订阅超时、阅读器空结果、代码错误布局 | D1时7条contracts/recovery；C时8条视觉检查 | C净空不足1px，后由D3改进 |
| D1 | 安全渲染、Travel/FAQ流取消、搜索取消、迟到分享不弹窗 | 24 Node、TypeScript、7浏览器回归、5请求流程；原log保留 | 五流程后在D2b及D4b重新验证，当前回执各自绑定新manifest |
| D2b | 隐藏面板inert、代码/书籍原生dialog与Tab循环、IME、FAQ外层取消、搜索不抢焦点 | 26 Node、TypeScript、12浏览器合同、6专项、5请求回归 | D2a原生dialog仍有body一跳，失败记录保留，已补首尾wrap |
| D3 | 复制净空/单语/触屏文案、Knowledge真实All、正文结构块静态、ripple opt-in | 14浏览器合同、8错误态视觉、2动效；净空最低14.58px | 专家局部D1=96、D4=94.5；320英文尾词单行仍可细化，完整功能分数未知 |
| D4b | 产品CTA抵达真实App且根入口仍咖啡、Dock命名、44px书籍AI、单一滚动对话区 | 10浏览器合同（含568×320/256中英）、5请求回归、26 Node、TypeScript | D4旧横屏溢出图/失败记录保留；当前PNG为修复后实际画面 |

每批 `evidence/batch-*-source.json`有源码SHA及其Git base。旧截图不认证后续代码。Node、浏览器合同、视觉判断分别记录；不能相加冒充已认证控件数量。

## Space专项和下一步

- `space-window-audit.json`：桌面/手机共6条实际操作通过，笔记最小化保持原DOM、最大化恢复、关闭再开文本保留。
- `space-render-probe.json`：灰色缩略图为过早截帧；450ms后两张本地照片ready/naturalWidth480。SVG组bbox中点落海洋、滚动裁剪外不是遮挡缺陷。
- `space-plane-concept-1440.png`仅临时CSS设计实验，不是生产改动或通过截图。
- 下一E5：工作区承载面减少穿透/重复边界；正文提高实际字号；桌面窗口目标≥24、手机地图控制≥44，保留原world/DOM架构。
- 已复现待修：FAQ在运行时切换减少动态效果后仍使用旧偏好播放高度动画（`batch-d3-motion-checks.json`的observation，不能算通过）。
- 后续按inventory 18个Roadmap小批继续：电脑/相框/墙体/光、小猫/quiet/六景、11应用、真实内容、首页层级与导航。完整309族未认证；固定评分表不为凑96而改动。

## 复现与边界

唯一预览 http://127.0.0.1:1317 。`local-qa.config.mjs`复用已构建站点，单浏览器串行。父任务脚本按记录运行；历史故障复现脚本成功只代表复现故障，不代表产品通过。

浏览器是Mac Chromium响应式模拟。没有实体手机、Safari/Firefox或真实模型/订阅后端的全覆盖验收；隔离mock不写真实用户数据，不进行公开部署。原始日志保留于登记artifact，正式文本副本已去ANSI与行尾空格。

## E5 / E5.1 真实验收与未通过边界（2026-10-16 01:55）

- 冻结基线为本地 `94e644e5`；E5四文件和E5.1六文件分别见source manifest。生产预览复用1317。
- E5：纸面不透明，实际主文字16.4px；桌面窗控26.24px；原320/390/568手机窗控与地图44.28px。5条Space阅读/原笔记DOM与fallback合同通过，10张稳定画面/JSON已归档。E5截图实际为390×900、320×844、568×320、1440×900；reading手机合同为320/390×844，不能互相替代。
- 独立设计判断：桌面笔记D4由72.5→90，390笔记93，深色笔记/阅读器90，390地图87.5。仅局部视觉范围，完整控件分仍未知。
- 后续实际hit与click发现：568×320 close中心被“回到咖啡馆”HUD盖住，真实点击进入café、notes仍存在；620×844 map按钮只有26.24px宽；844×390 coarse=true，窗控/map仅26.24px且arrange被换景HUD截获。E5阅读合同只测几何，不能据此声称这些按钮可点。
- E5.1 FAQ runtime减少动态效果第一合同通过；第二合同失败：`.article-faq__ai-panel[hidden]`仍有可见盒子，自定义display:grid覆盖UA hidden。失败原始log已存，不能关闭UX019。
- E5.2执行Agent正在修上述四个确定缺陷；父任务等待冻结交接后一次构建/动作复验。暂无新的已验收checkpoint。
- 首页before/A/B为临时DOM/CSS比较图；A文章优先、B作者/明确AI分身与3问题优先。当前仅方案研究，不是生产修改、功能回执或96分事实。

## E5.2 已闭环（2026-10-16 02:00）

- 九文件SHA manifest：`evidence/batch-e52-source.json`。Hugo生产构建、typecheck、JS语法与diff检查通过；11条FAQ/Space阅读/边界合同通过。
- 父任务实际浏览器：568×320中英、620×844中文、844×390中文coarse，4条真实坐标鼠标旅程+8张稳定图。close中心命中且真实点击删除窗口、仍desktop；HUD各44px独立点击，换景Escape返焦点；咖啡往返原editorDOM/文字不丢。地图四按钮实际44.28px以上，逐个hit和点击。详见`batch-e52-boundaries.json/log`。
- 第一次父脚本错误使用`/en/projects/`而超时，修正为项目真实默认英文`/projects/`后完整通过；这不是生产路由缺陷，也未用CSS/重定向掩盖脚本错误。
- 独立review：9/9 hash匹配，读11条断言/原始log与4鼠标旅程、逐张看8图；已复现的FAQ runtime/hidden、620/coarse按钮、568 HUD遮挡按具体范围关闭，无新P0/P1。完整控件族分仍null。
- 剩余观察：844×390桌面式重叠窗口有plane裁切；body自身无x溢出不证明被裁内容可达。后续以maximize/arrange/滚动实际动作探针判断，不外推全app可用。
- 资源审计82 Node/npm、swap21.79GiB、剩余21.54GiB；其他SoloCompass模拟器验收仍活动。只复用既有服务、缓存与单浏览器，未启动Simulator/并行构建，未停止或清理其他活动任务。

## 下一批基线探针（02:07，尚未修复）

- `space-short-layout-probe.json`：844×390 coarse真实max/restore可用，default map仅边界0.82px，不证明内容不可达；但3窗arrange后第2排因minHeight260/clamp重叠，第1个welcome所有窗控被盖。独立判P2 UX024，建议容量不足走现有overview并同步真实动作名称/terminal反馈。
- `home-chat-baseline-probe.json`：绑定77bf94c2模板blob hash。原未发送draft关开变空；合成composition Enter触发API stub（不代表OS级IME测过）；35s虚拟挂起仍busy/disabled/无Stop，关闭可abort。独立记录UX025/026/027，留E6布局之后单独修，不把关闭可取消描述成无法退出。
- `space-app-families.json`与16张normal max图：products/books/contact/settings在1440×900与390×844。只做8个外观scope，API503隔离、不真实外链/联系，未认证功能。目录物理7.38px、书meta6.56px、settings状态7.52px、contact link9.02px，交独立设计角色建议正文/辅助/控件的真实层级；不能据无x溢出/字号数字宣称观感达96。
- E6生产实施中：真实Hugo实践文章先于AI、保留原Bear实例与会话、资源观察迁移、手机全社交入口。父任务未构建半写源码，1317仍为已验收E5.2。

## E6 初次运行结果与 E6.1 待修（02:23）

- 七文件source manifest `batch-e6-source.json`，Hugo/typecheck通过。20条home-reading/home-about合同、2paint、2实际product入口全部通过。源站SEO/公开数据未改，新增文章起点为Hugo真实Nango，原AI整根/会话保留。非JS双语入口实际点击可到对应文章。
- 父6scope实际图/动作见`batch-e6-visual.json`：1440zh/light、1440en/dark、390zh/light、390zh/dark、320en/light、568en/light。24图包括real mocked request关开连续性；不认证真实模型、实体手机、Safari或200% zoom。阅读CTA后posts图可能带实际pointer hover，另存neutral图作公平布局判断。
- `batch-e6-ambient.json`使用真实Chromium Metal模块：hero可信交互+3s不下载renderer，Bear可见后两canvas有非零尺寸，运行时reduce释放、restore重新挂载。它不等于FPS/INP/CWV通过。
- 独立判断：hero约D1=94.5/D4=93，posts约91.5；normal白色密线球D4仅82.5，对照静态约90，仍需降低背景注意力。没有把24测试当96。
- 父`home-short-composer-probe.json`证实568×320中英初开后input/send y≈288,h44，底部出屏约12px；close中心被固定导航盖。滚动到input会让close进一步出界。控件只是部分出屏，不以此一概宣称WCAG失败，也不能以isVisible/无x溢出当任务可用。
- E6.1已交执行Agent：short-height完整panel定位/滚动/命中与更短256中英，normal球网亮度/密度克制；不扩大到聊天运输或Space。旧E6图、manifest、缺陷证据保留；E7已准备但等待该批冻结/独立验收后开始。

## E6.1 短屏闭环与 E6.2 材质迭代（02:40）

- E61九文件与QA config hash匹配。6条短屏/normal合同、3条原连续性定向合同、Hugo/typecheck及真实GPU生命周期通过。父5条坐标旅程为568×320/256中英、844×390en coarse；close/input/send均44px且实际中心命中，关闭/重开/Escape焦点返回可用。
- 独立复核6+3日志、5旅程与8图，无新P0/P1；UX030仅按上述具体范围关闭。疏网已降噪，core NormalBlending却形成褐色薄壳，D4仅85（历史白网82.5、静态90）；没有把功能通过等同视觉达标。E6.2只core恢复Additive并降低真实每帧opacity与rim，网络保留Normal/低alpha。
- `home-wheel-intent-probe.json`实际复现UX031：568×320英文reduce，Enter发送后chatsection焦点，真实wheel620px读到books；mock JSON完成后scrollY2803→2183，画面被拉回620px并聚焦input。两图/日志保留，不是候选猜测，也不外推全部视口。交E7与草稿/IME/Stop/idle一并处理。
- 最新资源95 Node/npm、swap13.04GiB、磁盘30.12GiB；未增加并行浏览器/服务，不清理其他活动任务。

## E6.2 已独立接受（02:44）

- final九文件`batch-e62-source.json`与QA配置hash一致，core constructor/loop opacity均.25、低gain、Additive；110点/.62邻距/低alpha Normal网络保持。只材质5处增量，未重跑无新风险的24条E6合同。
- Hugo构建4219ms、JS语法/diff通过；父实际Metal浅/深2scope分别未可见0renderer→可见2canvas→reduce0→restore2→final0，无page error。4图/JSON/log归档。不证明FPS/INP/实体手机/后台零帧。
- 独立看4图、source与log，无新P0/P1；褐壳消失，局部D4浅色91.5、暗色90。留真实头像、问题、淡金光晕，未称96。
- 额外未来缺陷基线`travel-qr-baseline-probe.json`：390×844zh/light两motion，打开仍焦点背景trigger，Tab进背景WeChat；Escape后立即Enter重开，normal旧transition让hidden=true且expanded=true，reduce重开可见。4图、独立Travel template SHA与日志保留，不属于E62通过范围；UX018后续修。

## E7实施期间的非相交实际探针（02:49）

- 生产预览仍4782757e/E62。`anchor-intent-source.json`单独冻结footer/reduce/TOC相关5源hash；E7只改首页，不以WIP验全站。
- 1440×900 zh/light/reduce归档首年真实Mac Meta点击开新tab，原页hash/scroll不变、defaultPrevented=false且未调scrollIntoView；普通click到year2026的365px、hash正确，computed scrollBehavior=auto，Back回原route。
- 当前右侧文章TOC在normal→runtime reduce后click编码中文heading，文档定位auto、无显式smooth、hash正确。此scope只验证点击定位；未触发reading-companion长目录内部`container.scrollTo`自动追踪，后者继续unverified。旧左sidebar脚本当前模板无对应selector，不把dead路径判实测失败/通过。
- 首次脚本按percent编码大小写逐字比hash而失败；`anchor-intent-initial.log`保留，使用decodeURIComponent比较后复跑2旅程通过。没有修改生产路由或源码掩盖探针错误。

## E7 / E7.1 聊天恢复与时间基准（02:54）

- E7八文件冻结：独立draft；Enter/Escape合成composition/229守卫；同位44px enabled Stop；25s请求等待竞态覆盖fetch/JSON/read，SSE headers/每chunk续期；DONE立即收尾，cancel不等待。失败问题/partial保留在画面且排除未来context，恢复原因独立UI，不拼进AI答案；关闭/清空/pagehide仍隔离迟到请求。
- 36Node、typecheck、Hugo4468ms通过。首跑21合同19通过/2失败，完整initial.log保留；失败处在请求发起/poll后fastForward24999，本虚拟clock仍随真实时间推进，已越25s。不是通过删断言或改生产deadline处理。
- E71只修改testfixture：请求前暂停clock并记录startedAt，精确检查24999/25000与20s收到chunk后44999/45000两个边界。其余7hash与E7一致，生产不重建/旧12合同不重复；typecheck与9新恢复合同均通过。两份source manifest及initial/pass日志留档。
- 父实际2坐标Stop旅程：568×256zh/light未返回headers；1440×900en/dark保留部分SSE。草稿关开精确保留，Stop中心实际44×44并enabled，点击立即解锁；保留问题/部分回答，真实signal abort+reader cancel，新问答完成且迟到旧结果不覆盖/旧失败问题不进context。6图与JSON/log归档。
- 另父568×320en真实wheel620px去books、旧JSON完成，scrollY2803→2803（旧版2803→2183），两图正文位置一致，input不抢焦点。只该实际配置，不外推OS输入法、真实模型或所有尺寸。独立评分复核尚待完成；此处是父验收结果，无全站96声明。

### E7/E71独立复核完成

8/8当前源码与QA hash匹配；E71仅修test，七其余hash与原生产相同。独立确认21不同合同组合、初始失败与修复前沿保留、3实际旅程/8图，无新P0/P1。UX025/026/027/031按具体范围关闭；OS输入法、离开后error状态及其他矩阵仍未知。恢复界面局部D1短屏93/桌面94.5、D4短屏91.5/桌面90，不能自动给完整族96。E8范围已由父/执行明确，见next-batches.md。

## E8初跑与两项真实缺口

- 4文件source manifest冻结，16Node/typecheck/JS语法通过，Hugo生产构建与6合同运行：5通过，4窗最后一项重复整理失败。首次tile不重叠、控件可点、原笔记保留；focus notes只改变z顺序，再arrange却重新分配三个窗口位置。完整initial.log保留。独立判UX032/P2/D4.4片段80，非数据丢失或P1；不删幂等断言。
- 父3实际旅程：844×390 coarse中文3窗、英文4窗，1440×900中文4窗；全部worldFrames=3/worldFailed=false/boot complete，真实Metal场景。短屏bar打开overview、Escape及实际Back点返触发器、选择welcome全部4窗控命中、notes同DOM/草稿续写；desktop实际tile不重叠且所有窗控centerhit。5图/JSON/log保留，只核心路径通过，不等于完整E8通过。
- 两个短屏overview Back实际宽44.98/48.66，高仅17.5px；hit与实际返回功能正确，未达项目重要触控44px目标。不一概声称WCAG失败。
- E8.1授权：filter副本按原rect y/x/id稳定排tile，不改持久z/active；补focus后重复整理unit；新增space.css仅overview[open]flex受限列表内滚、header与44pxBack可达，避免作者display让closed dialog泄漏。更新4coarse合同滚底/Back真实点击，不扩大其他App/world范围。
- 资源92Node/npm、swap11.97GiB、可用34.10GiB，单浏览器串行复用1317/缓存。没有重复跑E7或启动新服务。

### E8.1父复验完成

5文件manifest与QA配置冻结。17Node、typecheck、语法、diff、Hugo、6arrangement合同全过；父3实际旅程及5新图完成。844 coarse Back实际zh60.98×44/en64.66×44，列表滚到底仍header可达、实际点回原trigger；原notes DOM/草稿/geometry保留；1440四窗focusnotes后第二次真实bar整理，同id rect不变。独立最终复核与盘点收尾中，未提前宣布整站96。

额外E9边界基线`space-preference-focus-baseline.json/log`独立绑定apps/desktop/spaceCSS/classicCSS四hash：1440×900zh/reduce，明确程序设button焦点后真实Space激活。产品imstage选择与payload正确，但焦点改为products section；主题dark/颜色forest应用且pressed正确，重建后焦点为BODY。它不证明Tab遍历/全部尺寸失败，也不是状态未应用；后续E9按局部键盘连续性审查。两张真实画面保留，不真实联系/模型请求。

### E8.1独立闭环

独立复核5/5源码与QA、17Node/6合同/3实际旅程和5新图，无新P0/P1。UX024/032/033只按已测容量fallback、重复整理稳定、844coarse Back44/滚末项返回链关闭；历史失败保留。概览局部D1 94.5/D4 93，四窗tile D4仍89（App小字问题归E9继续修）。盘点补漏现存Back selector至359：是既有按钮新登记，不是新增功能；与item/menu证据分别绑定。完整309族仍无全矩阵认证。


## E9a初跑：真实链接缺口

4文件source manifest和QA冻结，语法/typecheck/diff通过，Hugo4296ms。6组合同全部在IMStage第二产品链接数失败：catalog.demo为空，已有shared link→safeURL('',origin)却解析成本站root，额外显示“测试预览”。不是通过删/放宽真实URL断言处理；旧3ca helper相同，此处首次动作合同揭示既有缺陷。初始完整log保留，未把后半未执行的书/笔记合同当通过。E9a1只shared link空/空白/非string提前返回，不改state全局URL策略；原6合同继续复跑。


### E9a1功能复验与E9a2观感迭代

- 最小link presence guard后四hash/QA冻结，Hugo与typecheck通过，6不同合同全部通过16.2s，原count/URL断言未放宽，并显式无demo无预览入口。
- 父4实际Metalcontext（320×740zh/light、390×844en/dark、844×390en/light coarse、1440×900zh/light）/16图：7真实产品选择与全部URL、跨2帧choice焦点；desktop实际坐标/phone native selectOption明确非实体picker认证。每scope1主要link真实popup由本地route截获，无真实外站请求；explore实际去书架，4书命名/链接/hit/滚动，12computed比值最低4.893529，各scope一致；body16.4CSSpx、主要link高约44.28，notes同DOM/草稿保留，pageerrors0。
- 独立逐张审16图认同UX037：844短coarse stacked picker/explore约115px，标题与headline全在fold外，功能可滚动不等于优秀初开层级。旧a1短屏图保留；授权E9a2仅短coarse产品导航同行/减少多余纵距，保持原字号与44目标，增加入口h2/介绍首行实际geometry。其他viewports/CSS/生产JS不扩大修改。


### E9a2父实拍通过

A2仅shortcoarse产品CSS与对应入口几何增强，4hash/QA核验；Hugo3733ms、typecheck/语法/diff通过；原6不同合同完整通过15.9s。父844×390en/light coarse复用1实际Metalcontext/4新图，不覆盖a1：body可见y89.22..272.90，first/last产品h2 y180.89..215.00，headline首行bottom247.80，真实入口能同时辨认产品身份和介绍。其余6合同全7产品入口几何成立；目标/焦点/原URL/书封比值/笔记连续性仍过。独立review/盘点收尾后才能做本地checkpoint，联系/设置未开始。


### E9a2独立闭环与checkpoint

独立核四hash/QA、6不同合同、5父实际contexts和20张图，无新P0/P1；UX035/036/037只关闭已测书封、空链接和844短产品入口范围，UX028/029只products/books部分闭，联系/设置UX034仍开。A1短产品D1=89/D4=85历史保留；A2 D1=94.5/D4=93，desktop产品94.5/93、phone93/91.5、books94.5/91.5，未凑96。Inventory1.15为309族/361selectors/257state/60局部族，完整0。已保存本地checkpoint `ebc488e6`，未push。E9b放行只联系/设置，保8渠道/原草稿、有效URL与现有跨App连续性；统一UI和public tool状态同步，捕获本次runtime label避免重复重建/请求。


## E9b冻结与待验范围

3生产+1测试hash/QA冻结（test b1只追加pending-close，总7不同case），syntax/typecheck/diff与Hugo通过。settings原DOM同步UI/public tool aria、单次runtime捕获label/disposer abort；contact保8渠道/原draft listener/邮件GitHub编码，少逐项围框、正文/辅助/44目标明确。尚待7合同、父4实际context和独立评分，不提前关闭UX034。

资源审计76Node/npm、swap11.03GiB、可用35.55GiB；audit列3台allowlist模拟器均shutdown、8个Docker项目均allowlist，登记旧产物未据年龄删除。audit/resources有maintenance/swap warning(exit2)，未将其记全绿。只复用1317/缓存/单浏览器，不开Simulator、不清理或停止其他活动任务。


E9b父probe初跑在第四个1440 fine-pointer的原window minimize处误把44统一套用，量26.24×26.24且centerhit。原桌面chrome要求24、coarse要求44，E9b新增的contact/settings正文目标仍统一44。该chrome源码未改，7正式合同已按正确范围通过；修正父script仅此既有bar动作minimum参数，不修改生产或放宽本批App目标，initial log保留。因初跑未写finalJSON，四context重跑生成完整正式记录。


### E9b父实际验收与新视觉基线

7合同通过17.1s。父4实际Metalcontext/20图已全看：320×740zh、390×844en、844×390en coarse、1440×900zh，均reduce；每scope5次真实偏好点后原button/focus、原runtimeLabel pending→受控false，只1GET；外部theme/wallpaper工具同步settings但contact输入焦点不动。8社交+邮件/GitHub/WhatsApp共11anchor/case真实坐标点击在capture阻断，原URL与草稿编码正确、textarea显示约16.4CSSpx，minimize/reopen原节点/值和notes原DOM/值保留，pageerrors0。不真实联系/AI/后端。父probe initial仅错误套用旧finepointer窗控44已解释保留；新App目标未放宽。

另父新增1scope实际壁纸探针/3monitor图：1440zh/light/reduce，真实选择dawn/dusk/forest并minimize设置后，状态/pressed正确但screen背景固定#eeefeb、旧landscape display:none；dawn与forest PNG同hash，dusk hash不同但底色同，不声称三图完全一致。独立复核认UX038/P2：默认3D里的“桌面颜色”无实际色彩结果，既有问题非E9b回归，不推翻UI焦点/存储修复。E9c只读方案已备，待E9b checkpoint后使screen外露桌面背景使用现有明暗6palette，不改阅读面/机框/world材质。短横屏contact/settings仍有滚动成本，独立评分留低分。


### E9b独立闭环

独立7合同、4实际context/20图、4hash+QA均已复核，无新增P0/P1；UX034按原button/焦点、原runtimeLabel、UI/publictool同步与pending关闭/迟到隔离范围闭合。UX028/029只联系/设置已测字号/命中片段闭，其他App不继承。桌面contact D1/D4=94.5/93、settings93/91.5；手机约93/91.5；短contact89/90、settings90.5/90，留滚动成本低分，不凑96。UX038/P2真实壁纸输出缺口开放，E9c只读方案待本地checkpoint后实现。两审计Agent已停写，inventory1.16为309族/362selectors/277状态/60局部族、完整0；WhatsApp是既有功能独立补漏control.10f744。
