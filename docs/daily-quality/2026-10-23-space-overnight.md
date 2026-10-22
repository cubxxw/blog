# 博客 / Space 半小时持续测试与优化：2026-10-23

截止时间：**2026-10-23 05:00 Asia/Shanghai**。作者已授权自主发现、设计和实现合理的 fix / feature，不逐项请求干预。当前状态：**第一轮 99 项宿主测试通过，入口修复通过独立审查和真实浏览器模块边界验收；完整 Space E2E、CI 和上线尚未完成，不能称已交付。**

## 调度与恢复入口

- 当前聊天：`01a164ef-b975-7c13-9bf5-008170d34111`；heartbeat：`space-05-00`，ACTIVE，已通过工具创建并读回本地配置。
- 后续上海时间 03:00、03:30、04:00、04:30 继续；05:00 只汇总与安全收尾，并暂停 heartbeat。定时触发不代表轮次已完成；此表只在真实执行后填写结果。
- 唯一工作区：`/Users/cubxxw/data/blog`；任务分支：`codex/space-overnight-20261023`；基线 `db80e3fb`。本次 fetch 发现本地 main 落后 28 个提交，无分叉，已 ff-only 更新，再创建任务分支。已有未跟踪 `output/` 保留，未加入任务成果。
- 后续先核对分支、HEAD、dirty 状态、其他活动任务和全局暂停，不能重建另一套重复实现。04:00 既有每日质量任务若进入本仓库，复用此记录并确认文件归属，避免同时改同一文件或重复发布。
- 遵守仓库 `CLAUDE.md` 默认流程：隔离分支完成验证和审查，再按现有链交付 main；本任务未要求 PR，不擅自改成 PR 流程。文章不在本次发布授权范围内。

| 轮次 | 计划时间 | 实际执行与结论 |
| --- | --- | --- |
| R01 | 02:47 起立即执行 | 资源/暂停核实、更新基线、HTTP/SEO 审查、宿主状态/导航/音频测试、浏览器入口修复；交付门禁待解锁 |
| R02 | 03:00 | 未执行；优先检查加载/失败/2D 降级、重复房间入口及首批待验收项 |
| R03 | 03:30 | 未执行；键盘/焦点/Escape、窄屏/窗口恢复、语言/主题、存储失败与私有草稿 |
| R04 | 04:00 | 未执行；与每日质量任务协调，覆盖博客导航、搜索、文章、SEO；按资源决定性能采样 |
| R05 | 04:30 | 未执行；先闭环已有修复的 review/CI/线上验收，再选择能在截止前安全完成的小项 |
| 收尾 | 05:00 | 未执行；停止新增改造，保存真实结果、待办、恢复入口并暂停 heartbeat |

## 环境与本轮约束

02:47 前后只读核实：`.agent-pause` 仍存在，归属 `current-chat-sre`，事件 `INC-20261022055202-4d3e5e`，原因 `disk_below_30_GiB_swap_above_19_GiB`。没有删除或覆盖该标记。

`dev-storage-guard resources`：267 个 Node/npm，swap 19.43 GiB，可用磁盘 31.51 GiB。`audit` 退出 2：三台允许设备均关机、8 个 Docker Compose 项目均在白名单；41 个登记产物约 3.9 GiB，其中 3 个被标为不安全 Git 根，不按垃圾清理。上述都是采样，不证明泄漏或全天状态。

本轮没有启动服务、浏览器、Simulator、Docker 或 Pi/MiMo；没有启动构建或新委派。只运行单并发、亚秒级的宿主定向测试，并做小范围源码/测试修改。CUA 只盘点可复用页面：Chrome 只有 New tab，本聊天 IAB 无页面，因此没有声称完成真实浏览器检查，也没有另开浏览器。独立 sub-agent review 因全局暂停而待执行。资源恢复必须核实，不能用文档中的旧放行授权替代本任务授权或擅自解除暂停。

**02:54 后状态变化**：再次读回时暂停标记已由外部移除，本任务未执行解除。资源采样为 311 个 Node/npm、11.96 GiB swap、39.87 GiB 可用；告警仍在，因此不做本地全量构建。随后启动一个只读 reviewer 和一个轻量原生模块验收服务器（PID 71083，02:54:54 +08:00，127.0.0.1:58978），用本聊天 IAB 单页面操作，无 GPU 场景。其产物目录为 `/private/tmp/ai-test-blog-space-overnight-20261023.grhLzt`；正式证据保存后按精确路径收尾。

## R01 测试步骤、预期与实际

使用仓库 `blog` 工作流、`qa` 的发现/记录/修复/复验流程；问题定位用 `systematic-debugging`，回归按 `test-driven-development` 先红后绿，结论按 `verification-before-completion` 核对新证据。浏览器步骤因资源门禁未运行；没有计算或虚构全站健康评分。

| 步骤 / 范围 | 预期 | 实际 / 证据 |
| --- | --- | --- |
| fetch、检查祖先关系、ff-only 更新、创建分支 | 使用最新 main，不覆盖已有成果 | 0/28、无分叉；基线 db80e3fb；既有 output/ 保留 |
| 初始 entry / sessions / onboarding / onboarding DOM | 焦点归属、迟到 ready、失败可退出、历史/并发草稿、存储失败保持正确 | **30/30 通过**，0 失败/跳过，156.27 ms；[TAP](2026-10-23-space-overnight/round-01-host-tests.tap) |
| 浏览器旧入口回归，修复前 | About / Start Here 直接归类 external，避免先加载另一个房间 | **4 通过 / 1 失败**，退出 1；`/about` 实际 page，期望 external；[红灯](2026-10-23-space-overnight/round-01-browser-red.tap) |
| 修复后 browser + 上述 4 文件 + profile route | 阻断旧入口、保留普通文章和授权站点浏览 | **37/37 通过**，0 失败/跳过，305.69 ms；[绿灯](2026-10-23-space-overnight/round-01-after-tests.tap) |
| navigation / workspace state / cafe / audio loop / window view / speaker volume / listening pages | 窗口/笔记恢复、快捷键、音频循环与音量、阅读页历史与焦点等既有边界正确 | **62/62 通过**，0 失败/跳过，792.18 ms；[TAP](2026-10-23-space-overnight/round-01-additional-host-tests.tap) |
| JS 语法、差异空白 | 无语法错误或空白错误 | `node --check assets/js/space/browser-state.mjs` 与 `git diff --check` 均退出 0 |
| 线上串行 GET 与 HTML head 审查 | 双语主路径可达，重定向正确，保留 title/description/canonical/hreflang/robots 原始字段 | **15 请求：14 个 200、1 个 404**（版本 manifest）；12 个 HTML 响应均有 title/description/canonical/hreflang/lang。About 与 Start Here 双语均确认重定向到 Space；搜索页 noindex 是仓库既有策略，未误报缺陷。[HTTP/SEO JSON](2026-10-23-space-overnight/round-01-http-audit.json)，采样开始 02:51:40 +08:00 |
| 真实浏览器模块边界 | 当前 mountBrowser 真实地址栏提交 About / Start Here，均 external 且 iframe 0；普通文章仍 page / iframe 1 | IAB 在 1280×720 的轻量页面实测上述 3 个场景；[截图](2026-10-23-space-overnight/browser-alias-after.jpg)。仅使用真实模块与浏览器样式、控制本地目标，没有加载完整 3D 世界，因此不冒充完整 Space 或性能验收 |
| 完整 Space E2E / 窄屏 / 深浅 / 减少动效 | 输入旧入口时没有第二次 iframe 导航，仍只有一个世界 canvas | 新 E2E 已编写；**未运行**。等待云端适用门禁，不把宿主或轻量页面算作完整端到端通过 |

修复后两组不重叠的宿主测试合计 **99 项通过**；初始 30 项和红灯的 4 项是重跑，不叠加成独立测试数量。测试代码在 Node `v22.23.2` 运行，`--test-concurrency=1`，没有构建站点，也没有变更测试门限。

### 已实现：P2 / BUG-01，内置浏览器旧入口先加载第二个房间

1. 在 Space 电脑打开内置浏览器，在地址栏提交 `/about/` 或 `/zh/about/`。
2. 修复前 `browserDestination()` 返回 page，`mountBrowser()` 创建 iframe；仓库 `static/_redirects` 将这些路径重定向到 Projects / Space，线上 GET 也已确认。
3. 现有 iframe load 回调最终会识别实际 Projects 地址并移除 iframe，**不是永久无限嵌套**；问题是入口处漏判，先进行了不必要的房间导航，可能触发额外初始化。没有测量节省的 CPU、字节或时间，不虚构收益。
4. 同样遗漏仓库中明确回到 Space 的 Start Here 入口。最小修复仅扩充本地房间入口判断，提前走已有 external 分支；保留普通文章路径、外站允许嵌入规则及 query/hash。
5. 新宿主回归涵盖 8 个真实旧路径及普通文章/外站反例；新增 E2E 覆盖真实地址栏、外部标签页、0 iframe 导航和唯一 canvas。独立 review 已通过，轻量真实模块边界已验；完整 E2E、CI 和线上验收待完成。

改动：`assets/js/space/browser-state.mjs`、`scripts/space-browser.test.mjs`、`tests/e2e/space-browser.spec.ts`。本轮尚未提交或推送，不应按已上线处理。

## 优化候选与自主取舍

下表分别标注事实、假设和待复现项。成本是工作量判断，没有无依据的完成时间承诺。

| ID / 类型 / 优先级 | 证据与影响 | 成本 / 风险 | 预期收益与验收指标 | 本轮选择 |
| --- | --- | --- | --- | --- |
| BUG-01 / fix / P2 | 宿主红灯、真实 About 重定向、明确 Start Here 配置；旧地址触发多余 iframe 房间导航 | 小；错误匹配会阻挡正常文章，因此有文章/外站反例 | 8 旧路径提前 external；E2E 0 嵌套导航、唯一 canvas、当前房间继续存在 | **选中，已实现且宿主通过；未交付** |
| PERF-01 / fix / P1 待当前复验 | 22 日日报记录 Products Lighthouse TBT 164891 ms，测量有不完整警告；不是当前新采样，也不是现场 INP。3D 冷启动/循环可能影响响应，根因未确定 | 中高；必须保护江南默认场景、画面、音乐和双向切换 | 资源允许时在固定 SHA/配置连续 3 次冷启动，记录帧/任务/资源/CPU；定位具体热点后设可比预算，不提高门限 | 暂缓实施；先取得当前可比 trace，暂停期间不跑 GPU/性能重活 |
| OPS-01 / fix / P1 验收缺口 | 当前线上 `/__release.json` 返回 404，无法仅靠此证明精确部署版本；22 日采用其他生产读回方式 | 中；随意生成 SHA 文件会伪造 provenance，随意切换发布模式有风险 | 核对当前 Netlify 生产 commit、源码与实际资源；查清 manifest 链路后绑定真实 artifact，不填写猜测 SHA | 选中跟踪；当前仅记录，不伪造版本文件、不绕过 CI |
| BUG-02 / fix / P2 待复现 | `fullscreen.js` 隐藏观察器只在 hidden 属性变化时退出全屏；请求 pending 后再切 Product Lab，完成时是否可能留住隐藏全屏需实验 | 小到中；全屏依赖浏览器与用户手势 | 用受控 pending request + 真实视图切换证明状态；若复现，完成边界再次检查当前所有权，保证退出/焦点正常 | 作为下一轮实验，不把源码推断写成已确认 bug |
| BUG-03 / fix / P2 待复现 | listening pages 的房间判断只识别 Projects，About 仍在公共页面白名单；可能先走阅读 iframe 再处理重定向 | 小到中；错误修复可能破坏历史、音频和焦点 | DOM 受控重定向及真实点击分别验证；回到已有房间时不重建音频、不丢文章历史 | 待下一轮复现，与 BUG-01 的浏览器地址栏问题分别验收 |
| UX-01 / feature / P2 | 已有 2D 降级与可跳过入口；低性能设备是否需要更清楚的轻量入口，当前无用户行为/性能新证据 | 中；不能替换 BEAR 默认或增加干扰首屏 | 先验证 reduced-motion/saveData/WebGL 失败，确有可达性缺口后才增加入口；键盘和触屏均可直接进入可用工作区 | 暂缓 feature；先测现有能力，不为凑改动增加开关 |
| UX-02 / fix / P2 | 窄屏、文字放大、深浅主题、Escape/弹层与私有草稿属于高价值验收面；本轮只有宿主证据 | 中；布局调整易破坏空间缩放/焦点 | 桌面与 390px 真实交互、200% 字体、主题切换、取消/恢复均保留截图和具体断言；只修复确实复现的问题 | 后续轮次重点，不把检查清单本身当发现 |
| SITE-01 / fix / P2 | 首页、文章、搜索和 SEO 与 Space 共享导航；当前 GET 可达不证明交互完整 | 中；全文搜索、作者内容及语言连续性需保护 | 真实搜索首结果和打开文章、双语切换、canonical/hreflang/链接、页面错误分别有证据 | 按轮次推进；复用既有测试，不重复全量重建 |

## 交付门禁与资源归属

当前 review：**通过**，见[独立报告](2026-10-23-space-overnight/round-01-review.md)；commit/push：准备执行；CI：准备派发云端门禁；部署：未执行；线上修复验收：未执行。源码最小差异只有当前三个文件。`ready_for_review`、本地绿灯、定时任务已创建都不是上线完成。

本任务新增：本分支、此文档目录、文本测试证据；无常驻服务、浏览器子进程、设备或临时构建目录。没有清理他人资源，回收 0.00 GiB，终止 PID 无。未提交源码和证据仍用于未完成验收，保留，不按收尾垃圾删除。最终 05:00 根据实际动作更新。
