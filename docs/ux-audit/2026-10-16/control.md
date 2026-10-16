# 全博客体验逐项优化控制记录

用户于2026-10-16授权：使用 frontend-design，三个Agent分别盘点、执行、评分建议，持续迭代至**2026-10-16 12:00 Asia/Shanghai（UTC04:00）**。每项按钮/功能96+为目标，必须按固定量表和真实证据报告，不能保证主观分数或给未测试项高分。

## 唯一工作区与安全基线

- 源码：`/Users/cubxxw/.local/state/pi-delegate/tasks/20261015-210720-6087ab60/worktree`
- 当前分支：`codex/blog-experience-20261016`
- 已验证前序checkpoint：`6d7b9fe9`（终端、真实首帧、咖啡室内、小猫及独立验收）。主线main仍是旧版，不回到main覆盖本轮工作。
- 前序正式证据：`docs/acceptance/2026-10-15-space-onboarding-local.md`，185 Node、28 desktop/mobile E2E及专项回归；不把前序证据外推至这次全站的全部状态。
- 预览构建：`/Users/cubxxw/.local/state/pi-delegate/tasks/20261015-210720-6087ab60/preview-site`。先检查1317端口并复用；停掉的旧进程不代表构建不存在。
- 不推送、建PR、合并或部署；不改公开文章原文、模型供应商/凭证或私人数据；不真实提交订阅/联系/分享/付费AI调用。

## Agent所有权

| 角色 | Agent | 唯一写入责任 |
| --- | --- | --- |
| 盘点 | `/root/blog_inventory` | `inventory.md`、`inventory.json`；只读生产代码 |
| 执行 | `/root/blog_executor` | 小批生产CSS/JS/templates与相关精确测试；不写inventory/scorecard/control |
| 评分建议 | `/root/space_review` | `scorecard.md`、`scorecard.json`；只读生产代码，保持独立 |
| 父任务 | `/root` | control、批次/证据、单浏览器真实验收、调度、本地已验收checkpoint |

复用三个角色，不重复生成相同Agent；新一轮先检查当前工作，所有人不得回滚其他协作者修改。上轮Pi/MiMo两次长请求中断，已停止，未产出源码；本轮小批先由执行Agent直接处理。无人值守heartbeat不得新启动/恢复Pi/MiMo或mimo-review Token Plan模型调用。

## 固定评分量表 v1

1. 任务清晰与信息层级20%。
2. 命中与键盘无障碍25%。
3. 状态反馈与错误恢复20%。
4. 视觉一致性、边框与注意力15%。
5. 动效舒适与性能10%。
6. 响应式与内容连续性10%。

评分Agent定义每维可检查子项与硬门槛；缺少任一适用状态或尺寸实测则verified_score=null、status=unverified。主流程不可达、焦点陷阱、数据或路由丢失 cap79；虚假成功或无恢复失败 cap84；命中/遮挡/对比度失败 cap89。96+要求所有适用硬门槛通过且每维≥90；控件族取子控件最低分。源码诊断、专家设计判断、确定性测试、浏览器实测分开记录；模拟手机不宣称实体手机验收。

## 本轮设计方向

保留博客纸色/墨色/酒红与中文阅读排版；控件采用清晰的无衬线，等宽字限于用户要求的终端与真实数据。主动作每区唯一；边框只表达分组、输入、选择、状态；非用户触发动效集中在已授权入场，避免悬停位移与多重缩放争抢阅读注意。Space继续咖啡默认、终端与后台渲染并行、BEAR OS主体/双向可切换Product Lab、作者真实内容、原私人节点连续性。

## 批次策略

先核对inventory/scorecard，挑尚未验收的高影响控件族：源码定位→有界实现→必要定向测试→生产构建→真实动作/截图→独立评分→修复。通过检查只有因新改动/失败/新风险才重跑。不为了填时间制造装饰，不以调度成功或worker运行中当交付。

初始批次A：真实复制pending/success/failure、独占复制反馈、全局焦点与按压变换、手机换景名称、quiet开启状态。下一批候选：文章tabs的键盘/ARIA关联、文章分享复制失败恢复、手机菜单Escape/关闭焦点、TOC减少动态效果、订阅超时、Space搜索空结果。

## 定时延续与截止

Heartbeat ID：`12-00`，当前聊天`01a13ec1-4c36-7410-915a-d52653d3129f`。每小时00/20/40分延续，最晚到UTC2026-10-16 04:00。每轮先读clock；到12:00停止新实现，保存真实结果及剩余项，暂停heartbeat并读回。仅在实质进展、完成、失败或需要用户参与时通知。

## 资源与证据

2026-10-16约00:32：58 Node/npm、swap10.37GiB、可用34.40GiB；Solo Compass仍有并行任务。单浏览器串行，复用现有服务/工具；重构建前资源审计，不开iOS Simulator，不抢占/停止别人的服务。测试目录用dev-storage-guard注册；正式证据保存后精确清理，保留活动预览构建。

父任务后续在`batches.md`与`state.json`记录当前批次、验证源码revision、证据路径、工作中Agent及下一个可执行目标。

最新已验本地checkpoint：`e5fafdc2`（E10/E10a；前序b5b6fa34 E9c）。1317当前同源E10a已验构建，17合同/17新主图独立复核，native/focus/fullposter/loading/error/15s/Retry已测范围闭，无新增P0/P1。盘点1.18：309族/366selector entries（非按钮数）/295状态/63局部族/0完整，完整分null。正常局部静态D4=96、恢复94.5/D1均94.5不等于完整族96。UX039–041 search与UX042脚注开放；E11只读方案已定（见next-batches），下一轮复用现有executor明确放行，当前无生产WIP/无在跑browser。QR portrait错误态约120px反馈→账号距离留作后续细化。滚动恢复仅稳定fonts/有限背景过渡，mid-reveal未知保留。无push/PR/部署，heartbeat ACTIVE继续至12:00。

E11于05:04明确放行现有executor，限local index/result intent、真实status/44Retry、冗余eyebrow及新合同；单flight15s total fetch+JSON、关闭代次隔离、即时失效旧候选/Enter同步当前query。源码正在修改，不build半成品；1317继续E10a checkpoint e5fafdc2。资源swap10.79GiB/76Node/37.88GiB，复用缓存/服务、无新增浏览器并行。父独立补文章1199→1200的草稿/焦点风险基线，不涉及当前WIP source。

05:15 E11初候选已3850ms构建到1317，但未验收；首合同因lazy-ready测具等待死锁中止，pagehide会话边界source review修复中。accepted checkpoint仍e5fafdc2，不能将当前candidate预览当已通过。

05:35 E11b独立闭环：四源/QA/2runner/suppQA均match，15新+2旧合同通过，7actual15图+Back2图独立逐看，无新P0/P1，UX039040041045只命名范围闭。v1.20 309族/367selectors/313状态/69局部族，完整0/null。正常局部D1/D4=96，恢复94.5/94.5；仅两文案建议下一E11c，不把计划当完成。42脚注/44文章仍open，Back未命中BFCache而保unknown。三个Agent最终停写、无browser/build，保存本地checkpoint后继续；不push。

E11b本地checkpoint `1e2d94acae058204233d6547ba47ba599025c9bf` 已readback，未push。E11c继承行为，仅搜索短文案/Retry label；新receipt使用batch-e11c前缀，不覆盖b source/图/score证据。当前1317仍b已验构建，E12方案待c后放行。

E11c独立闭环：15同case7.0s、7actual/15图独立逐看，6status+2Retry文本only反替换与bCP字节相同，c recovery局部静态D1/D4=96/96，13可见opaque文字对比rawmin5.789000796485059独立重算误差0。完整分null；315状态/69局部族/309族/367selector/0完整，42/44仍open，Back仅b未命中unknown。raw receipt顶层sourceManifest旧b literal保留，实际runner5–7prefix读取c且SHA assert；provenance erratum明确绑定raw/cmanifest/runner3SHA，不偷偷改raw或宣称重跑。两Agent最终停写，无browser/build/source WIP；准备本地checkpoint，随后E12。

E11c checkpoint `9d43d0cc2e4b090b0196b2fe36a09c9dece26653` 已readback，工作树当时clean，未push。E12按next-batches中已准备8合同边界明确放行现executor；source冻结前不build，1317继续c已验preview。E13推荐canonical单DOM/controller，7源/10合同只读候选，优先E12，未实施。

E12独立闭环：8合同14.9s/Hugo3488ms，7actual15主图父/独立逐看，20computed含More.9合成rawmin4.879289268784955、独立误差1.78e-15；4源/QA/4runner/provenance一致。v1.22 309族/367selectors/323状态/69局部/0完整，D1局部94.5（键盘可视入口缺提示），静态D4=96；UX042仅settledfont首tap/nativehistory/ownedkeyboard命名范围闭，044/046open。所有初失败/harness修正/冷font负基线保留，未把额外150px说实体手机，不把first-visible smooth截图说终态。下一E12c先可视cue，同时额外150px真实Tab引用导致31px正文偏移的新probe待独立诊断；无新已评P0/P1，不扩充完整96认证。先保存本地checkpoint，继续单browser/不push。

E12 checkpoint `50a08fbbfb19b5f59d2dc95202071f6132466655` readback，未push，3source frozen. Boundary-demo experiment uses browser-only JS route+CSS overlay Aabsolute/Bfixed, fixedviewport coords as coherent onealternative; 3paired normal/edge/failure discovery cases, 6runs/6images. A short150 actualnote -31px and long224fixture -5px; B both0, normalboth0. Supported within thesecases, humanchoiceunreviewed/discovery unchanged, noGold/promotion. Source未改。独立review后方重写生产source与正常验收，不将实验pass冒生产交付。

E12c已明确放行现executor仅JS/CSS+现spec，10case=8加强+2短Tab，footer仍50a08字节。独立已核实验6图/immutable2blob/contract/receipt，支持定位假设无实验P0/P1，UX047/P2open；不promote discovery、不当生产pass。预览仍E12 CP50a08，source WIP不build。父c用新版本helper以保原E12 helper/runner证据不变，单独stubGA自动脚本，Netlify仍blocked503，publicfonts继续真实读取；不把Netlify计数叫完整外网审计。无browser/build运行。

E12c独立闭环：四源/QA/四runner/provenance及六条finalBack trace SHA匹配；10合同17.1s、Hugo4481ms、6actual20PNG父与独立全部逐看，22contrast独立rawmin4.879289268784955，无新增P0/P1。v1.23为309族/367selectors/328状态/69局部/0完整，普通已测视口静态D1/D4=96/96；UX047仅fixed/短Tab/原节点/resize/runtimeReduce命名范围闭。初Back10s超时未解释、全分null、实验discovery/unreviewed不变。两审计Agent停写后本地checkpoint；随后E13，预览保留，不push。

E12c checkpoint `9ec879f3c4c04c622523dc9e98222d58bb90ba3f` 已readback。E13明确放行现executor按已定canonical单DOM/controller 7源/10case，父负责单browser，sourcefreeze前不build，1317仍Caccepted。7源之外生产不改，不触真实模型，UX044继续open。

E13e独立闭环：13新合同15.3s/4旧专项4.5s/Hugo3781ms，7正式actual25PNG父/独立全看，71uniquehash/11source/QA/6standardrunner+supplemental/HTTPserved3JS/provenance匹配，无新增P0/P1。UX044仅同DOM/草稿选区/请求scope/读点/显式analyzefocus/Escape命名范围闭。局部D1=94.5、D4=90.5，小字11.5/9.5与引用多围框是真差距留E16，完整null。v1.24 309族/367selectorentries（含历史别名，非按钮数）/345状态/81局部/0完整；UX046字体与UX048Space小字open。初始锚/鼠标ownership/选段focus负例全保；defaultoverflow/自然240ms/真实Selection夹具修正明记；父scope-B初看误判由字节相同对照/几何/独立看图校准，无虚构capturebug。E14仅discovery不晋级，computer实际链条和bookmark本来功能正证有界。下批优先E15Space可读性/收藏44square和pressed/list实际911→0读点丢失，E14字体完整CSS边界另行研究；source暂停待本地checkpoint，不push。

E13e checkpoint d5b35f94cee3a203938eff63f4932a016df71fb3 readback/clean/未push。E15按已定8合同明确GO给现executor，仅apps.js/space.css/space-cafe.css+new spec；无browser/Hugo/commit权限，sourcefreeze前父不build。父可并行做E14字体当前article独立readonly fullGoogleCSS边界准备，单browser不重叠，不把Space WIP当当前预览。资源76Node/swap10.88/free33.8复用缓存/服务，无Simulator。

E15b首轮9合同8过1刷新读点失败；publicfavorite已过，candidate未接受。父实际2图证实storage850尚在但worldready后DOM0，preworld两帧850。E15c限定apps局部一次性生命周期owner与追加minimizedreload合同，等待world-ready/failed+有效尺寸，用户新意图优先、恢复后断观察、不定时重试；CSS/desktop保持B。当前preview是B未验收candidate，accepted仍d5b35f94。

E15c两审计Agent最终停写：70hash+QA/17图/10合同14.5s/Hugo3512ms无新E15 P0/P1，048/049/050仅命名scope闭。v1.25=309族/369selector entries/359states/82局部族/0完整，score234checks/106历史视觉/50findings。普通Space type/profile静态D1/D4=96/96，short90.5/94.5/readmap94.5/93具体差距保留；全分null。新preE16真实短屏input/Send不可达仍open，不能说全站无P1。保存本地checkpoint后先修短屏与AI字/引用，后续ENfont/相册retry/Knowledge当前节点Open；不push/PR/部署。
