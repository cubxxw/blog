---
schema: blog-brief/v1
id: 2026-10-03-personal-agent-harness-openclaw
title: Personal Agent 技术研究：OpenClaw、Agent Harness 与可靠 Computer Use
status: published
priority: high
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-10-03T00:15:00+08:00
source_refs:
  - brain://topics/personal-agent-technical-study.md
---

# 选题契约

## 唯一命题

个人代理长期替用户办事，要把一次有限的模型运行嵌入持久任务与独立执行权限之中。以当前 OpenClaw 的真实代码和契约为主样本，解释 Agent Harness 怎样与网关、状态存储及执行环境配合，并把 Computer Use 放回这条完整链路。模型最后一句话不能作为外部事务完成的证据。

## 为什么值得由我写

作者明确要求为产品和技术同学分别写两篇 Personal Agent 深度博客，技术篇回到 OpenClaw、Harness Agent 设计、品类常见设计和好的 Computer Use。作者的一手增量是独立核读公开源码，区分项目已经实现的机制与本文提出的设计。本任务没有作者运行生产压力测试或亲历 Instinct 内部系统的记录，不得补造。站内旧文 agent-system-design-openclaw 冻结 2026 年 7 月版本，重点是消息路由与 Gateway；本文的新材料是 10 月运行时、终态、恢复与计算机操作，不重写旧文。

## 目标读者与阅读场景

读者正在实现或重构个人代理，已经能把模型连到工具，却遇到跨天任务、重复动作、用户接管、换运行时或无法判断“真的办完”的问题。文章需要让工程师知道每段状态由谁保存、每一步权限由谁决定，以及出错后应该恢复什么。英文术语第一次出现就解释，用中文把机制说清楚，代码只承担必要的契约表达。

## 编辑选择

- 文章轨道：公开技术研究，完整博客。
- 已选形态：用一条具体事务贯穿，但由博客侧决定结构和标题。预计约 8000–11000 个中文字，源码事实与原创建议各自有边界，不按名词堆章节。
- 核心张力：聊天会话、运行终态和真实事务有不同的生命周期；常驻产品靠许多可终止、可恢复的有限运行持续工作，失败可能发生在模型之外。
- 这次主动不讲：产品篇解释入口、用户感受与商业取舍，本篇只选会改变技术设计的体验要求；不写 OpenClaw 安装大全或框架横评。

## 已批准素材包

### 事实与项目证据

附录全部为重新核验的公开源码、论文和官方工程文档，作者本次已授权公开写作、英文翻译、封面、远程提交与部署。仅使用这些材料和博客侧进一步核读的公开资料，禁止读取 brain:// 背后的私有文件。OpenClaw 样本固定为 2026-10-03 核读时的 main commit `32e30e59d9a7fd1f5b3a9e9659427d45145779dd`，这是源码快照，不是声称已发布的版本或生产部署。

### 作者原话与在场片段

“技术文章更多的回到 OpenClaw 以及 harness agent 的 agent 设计上，以及 person agent 目前普遍的设计上，以及好的 compuer use 等等，清晰表达。”本文统一使用 Personal Agent、Agent Harness 和 Computer Use。作者同时要求中文定稿后去 AI 味，再由 Pi Agent 翻译英文并发布。写作 executor 只完成中文并交回协调方；后续授权已经具备，无需再次请求同一确认。

### 作者观察

可用“我会把这些对象分开保存”表达本文设计，不能把未落地的架构写成作者已跑过的系统。可用取消订阅或改行程作为贯穿的设计示例，开头就标明这是示例，没有 Instinct 生产执行日志。对具体公司未知实现不能用示意图填空。

### 待验证推论

可提出委托、任务和运行三个对象，但明确它们是本文建议的领域模型，不是 OpenClaw 原生类型。执行前后的动作账本、超时后先对账、重新授权、预算与终态校验，都要说明适用条件和代价。需要比较直接接口、浏览器可访问结构与桌面像素操作的任务选择，不把其中任何一种封为通用最佳方案。

## 参考方向

围绕附录的固定 commit 继续读关键实现，阅读边界写入回执。普通 Markdown 与简洁 ASCII 流程优先；设计对比表能清楚表达就使用。没有实现测试时明确是设计示意。可以引用站内旧 OpenClaw 文章作为先修，系列 personal-agent-studies 的技术篇 order 2 / total 2，与已存在的产品篇 personal-agent-product-delegation 互链。

## 证据与隐私边界

- 可以公开：附录公开事实、明确标注的本文设计建议、作者此次提供的写作范围。
- 必须匿名：不需要带入用户私人任务、账号或真实支付信息，代码只用明显示例值。
- 禁止使用：brain 私有目录、密钥、作者未授权经历、公司未公开架构；禁止把 OpenClaw 单 operator 信任模型写成敌对多租户隔离保证。
- 发布前仍需作者确认：已有此次明确发布授权；新增隐私裁决才需停下。源码尚未实测只降低论断强度，不作为拒绝成文的理由。

## 不要写成

不要写成“几个 Markdown 文件加一个 while 循环就能做 Personal Agent”，也不要给出十几个缩写而不解释责任。不要把 Skills 当权限、MCP 当事务保障、checkpoint 当外部支付 exactly-once。严禁沿用“当前 OpenClaw 底层必然使用 Pi SDK”的旧说法。不要拿基准任务成功率推断 Instinct 或现实旅行成功率。未发生的新访谈不能写成问答。

## 验收标准

- [x] 一条贯穿事务能追到授权、运行、暂停、恢复、执行结果与用户回执；每个对象的生命周期和权威来源清晰。
- [x] 清楚解释 model/provider、Harness、Gateway 与执行环境，至少用一次真实 OpenClaw 契约说明边界，重要源码链接固定 commit。
- [x] 深入 Computer Use：语义观察与截图各自适用范围，旧元素引用/窗口焦点/页面变化怎样处理，何时等待、刷新观察或让用户接管，以及怎样确认外部结果。
- [x] 至少三个失败过程具体还原，包括外部动作成功但本地未收到回执，用户撤销或接管，重复/迟到事件；建议的防线不冒充现有保证。
- [x] 任务事实、用户偏好、运行记录和权限事实分开解释；说明上下文压缩不能替代持久记录。
- [x] 验证方案同时看目标状态、反复可靠性、权限违反、人工介入和真实成本；不存在的指标数值不能补。
- [x] 技术事实有相邻引用，参考资料去重；官方设计声明、源码观察和本文推论逐处区分。
- [x] 开篇使用 craft-article-opening。中文定稿后读取并执行 lieflat-less-ai-tone，只对白名单命中文案做最小改写；作者声音优先，保留结构、事实、代码、限定词与引用。仓库无该文件时读 ~/.codex/skills/lieflat-less-ai-tone/SKILL.md，复改正文后再查。
- [x] flavor/frontmatter/tags/diff 等文章级检查通过；不引入无必要的新组件。暂不翻译、不 commit/push/部署，已挂载协调方提供的封面。

## 执行回执

- article: `content/zh/ai-agent/posts/personal-agent-harness-openclaw.md`
- translated_article: `content/en/ai-agent/posts/personal-agent-harness-openclaw.md`
- public_url: `https://cubxxw.com/zh/ai-agent/posts/personal-agent-harness-openclaw/`；英文：`https://cubxxw.com/ai-agent/posts/personal-agent-harness-openclaw/`。四个页面及两张封面均已于 2026-10-03 01:32 +08:00 核验上线。
- editorial_verdict: KEEP。标题为「Personal Agent 技术研究：OpenClaw 怎样把一次运行接到长期事务上」。正文 9741 个汉字，不含 frontmatter 与参考资料。以取消订阅为明确标注的设计示例，把授权、运行、暂停、恢复、验证与用户回执接完整；当前 OpenClaw 内置 loop、Harness 契约与 Gateway 责任分别解释。协调方独立复读全文，并复核工具终态、终态后回执补写及 τ-bench 指标段，通过编辑复核。
- checks: 文章级 flavor 为 0 错误、0 警告；frontmatter 检查 exit 0；tags 检查为 0 文件待修改；git diff 空白检查通过，另对新增文件执行 no-index 空白检查，无空白诊断。独立解析本篇 YAML，验证无 draft/categories、7 个 canonical tags、159 字符纯文本 description、已到达的 +08:00 时间，series 为 personal-agent-studies/order 2/total 2。14 个保留的 OpenClaw 文件链接均固定指定 SHA，公开副本中的目标文件存在；正文引用与末尾来源集合一致，内链与资源路径存在。封面为 1672×941 无损 WebP，转换前后 RGBA 像素一致。全仓库 briefs 校验仍有同篇新英文产品稿及三个历史英文文章的重复提示，已告知协调方；本卡补入中文 article 回执后不再有当前成稿重复问题，未改队列实现或历史任务。
- published_at: 2026-10-03T01:32:03+08:00（首次成功生产核验时间）。
- retro_notes: 本次增量是从较早的 Gateway 路由研究推进到当前自有运行时、prepared attempt 的政策边界、工具终态与外部业务状态的区别。三类架构是本文设计归纳，Mandate/Task/Run、控制租约和动作账本都是参考设计，不冒充 OpenClaw 原生对象。三组失败过程具体覆盖动作成功但回执丢失、用户接管或撤销、重复与迟到事件；未知结果优先对账，没有可靠查询渠道时交还用户。Computer Use 解释接口、页面可访问结构与桌面像素的选择，观察与动作交替，分别处理过期 ref、焦点、页面变化、等待、验证码及接管。未读取 brain 私有材料、凭证或公司内部实现；没有生产压力测试、真实账单或现实产品成功率。中文执行侧完成正文与封面挂载，英文翻译、提交与发布由协调方继续。

### 三遍复读与作者声音

先读取博客当前 CLAUDE.md、AGENTS.md 与 content/CLAUDE.md 的写作约束，并读取站内早期 OpenClaw 网关文章的研究语体，以及本系列产品篇的开头与分工。研究开篇按 craft-article-opening 执行，从动作已发生但结果未知的具体事务进入，没有虚构作者亲历或 Instinct 日志。

三遍分别检查作者立场与声音、论证推进及阅读负担、事实安全与引用。第一遍保留“我会”的设计判断，清楚区分公开研究与未落地方案；第二遍从取消事务进入职责，再进入计算机操作与失败时序，最终返回回执和评测，没有依靠名词清单扩篇；第三遍逐项核对固定 SHA、实验性契约、执行终态、业务结果、权限边界以及 pass^k/pass@k，不把恢复计数或自然语言当作完成凭证。

中文稳定后读取作者指定的 lieflat-less-ai-tone，按白名单完成最小改写，主要对应规则 2 的顿号罗列，另处理规则 10 的句首连接词及规则 1 的翻案句式。必要完整政策配置项按例外保留。白名单收尾对比确认 frontmatter、标题层级、段落数量与顺序、表格、代码块和全部引用 URL 不变；其后单独完成中文 description 的长度检查，再对最后的中文文案按同一白名单复查。没有新增或删除观点、事实与限定条件。

### Pi 英译与双语复核

中文稳定后由实际安装的 Pi Agent 0.87.1 执行英文翻译。考虑单次输出长度，先在内容目录之外写入七个完整片段，再合并并原子写入英文目标；没有将中间残稿暴露为站点文章。协调方通读英文，并对照最终中文核查事务对象、权限边界、三组失败时序、Computer Use 流程与评测定义。随后仍由 Pi 对十一处直译表达作局部修正，没有改变观点、事实、代码标识或引用。

英文完整保留 14 个标题、55 处外部引用及三个 text 流程块，引用 URL 的出现顺序与中文逐项一致；没有残留中文或遗漏段落。两种语言的作者、日期、类型、标签、系列 slug/order/total 与封面路径一致。英文 description 为 158 字符，系列名称本地化为 Personal Agent Studies；产品篇与早期 Gateway 篇的英文内链均已有对应文章。英文路线为 `/ai-agent/posts/personal-agent-harness-openclaw/`。本节记录翻译和复核，不表示已经部署。

### 公开阅读范围与证据边界

已执行精确 source_refs trace，只发现本任务卡，没有解析 brain:// 目标。博客侧仅使用本卡批准素材与公开资料；只读 OpenClaw 公开源码副本，HEAD 与指定 SHA 一致，没有运行该仓库脚本。站内既有网关篇的增量是消息路由，本篇增加 10 月执行契约、终态、恢复和计算机操作；产品篇负责用户委托与体验，本篇不重复产品横评。

重新核读的 OpenClaw 范围：运行时架构、Harness 主契约、core-ownership、sessions-and-results 全文；agent-loop.ts 第 1–440 行；agent-loop 文档的 run sequence、writer claim、终态、投递与等待超时段；automation how-it-works 全文；heartbeat 开头至默认规则；restart-recovery 第 1–130 行与末尾 limits/verify/not-resumed 段，未宣称逐句审阅全部恢复分支；memory 第 1–115 行；trust-model 的 operator 边界与 node/exec 责任段；browser agent-tools、browser-automation 指导与 browser-security。还读取 attempt-runtime 的引导输入与共享机制片段，但未在正文增加未经必要核读的分支结论。

外部一手资料重新核读了 Playwright Locators/Auto-waiting、Anthropic Computer Use 与 Managed Agents、Muse 安全设计、LangGraph Persistence、Agent Skills 与 MCP Tools 规范、τ-bench 原文的 Reward/pass^k 段、OSWorld 论文入口。这里只借其公开机制或验证方法，未采用历史成功率与厂商性能数值，也未引用 Browser-Use 浮动 main 的代码判断。已批准的 Instinct 访谈包仅作为需求背景，本篇不复写访谈或声称掌握内部日志。

证据的权威范围分别是：OpenClaw 固定源码与项目文档支持当前机制及声明，不证明生产可靠性；厂商工程说明支持其公开设计，不等同独立审计；论文支持评测定义与思路，不证明现实产品率；本文参考模型与失败防线只提出可实施的设计选择，没有实现测试。所有未确定的外部事务保留 Unknown，不补造商家凭证。

## 公开证据附录

阅读日 2026-10-03。所有项目特性以这里的固定快照或标明的官方文档为准。非 Reddit 来源直接引语累计每源最多 25 英文词，转述应克制，避免把原工程文章复写一遍。篇幅留给不同机制之间的独立分析和具体失败示例。

### OpenClaw 的运行责任

1. [Agent runtime architecture（固定源码）](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/agent-runtime-architecture.md)：已读全文。当前 built-in runtime 由 OpenClaw 自己拥有，agent core 在 packages/agent-core，harness registry 在 src/agents/harness，provider transport 在 src/llm；旧 pi runtime alias 归一为 openclaw。Pi TUI 依赖仍在，不等于 agent loop 仍由外部 Pi SDK 拥有。不要把 main 快照当已发布稳定版。
2. [Harness 插件契约](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md)：已读全文。Harness 执行准备好的一次 attempt，不能为加 LLM API 就代替 provider 插件；有原生 session/resume 的 runtime 才需要替换 Harness。契约仍实验性，turn 中途有输出、工具或审批后不能切换。
3. [Core ownership](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md)：已读全文。Core 准备模型、上下文预算、transcript、workspace、sandbox、工具政策、回调和 fallback 等；原生 Harness 声明 exact policy support 时要覆盖原生工具与接入工具，不支持明确限制应显式拒绝。runtimePlan 是 host-owned policy，不能随意改动；原生 session ownership 与执行授权是不同事实。
4. [Agent loop 生命周期](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md)：已读 run sequence、queueing、准备与终态相关段落。runId 接收回执、assistant/tool/lifecycle streams、终态与投递回执不同；session lane 顺序与 activeWriterRunId/expectedWriterRunId 在事务内检查，防旧运行覆盖新 transcript。它们不保证所有外部副作用只执行一次。agent.wait 的超时只结束等待，不等同取消运行。
5. [agent-loop.ts](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/packages/agent-core/src/agent-loop.ts)：已读 1–440 行。runAgentLoop / runAgentLoopContinue、steering 检查、streamAgentResponse、工具结果合并、provider stop/abort、host stop 与 prepareNextTurn 在循环里各有职责。出现 assistant 文本不自动结束；stop + endTurn=false 可以继续。不需要粘贴大段源码，简化示意必须标明不是源码原样。
6. [Heartbeat](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/heartbeat.md)：已读前 130 行。当前 heartbeat 是 scheduler 管理的 system-owned automation，定期运行有限 agent turn；默认提示不从旧聊天臆测反复任务。0m 停 recurring cadence 但不禁止特定事件 wake；scheduled busy guards 与事件 wake 不完全相同。不要照旧文把 HEARTBEAT.md 当当前唯一调度真相，也不要把后台在线等同模型不停思考。
7. [Automation how it works](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md)：已读全文。Gateway scheduler 管理计划与持久 run receipts；one-shot 的投递未知保留 disabled/Unknown 而不盲目重放。文档明确该 fence 不让任意脚本或工具副作用获得 exactly-once。重复任务提为 schedule 是模型依据对话识别，并非宣称有独立重复检测引擎。
8. [Restart recovery](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/restart-recovery.md)：已读开头存储/恢复表和末尾 limits/verify，未逐句审阅全部 919 行。SQLite 保留 conversation、jobs、部分输入与投递；进程内 terminal PTY 不恢复。恢复计数代表恢复执行，不证明对外投递成功；不同 owner 的任务有自己的恢复责任。深入某个具体恢复分支前再核读相应源码。
9. [Memory overview](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/memory.md)：已读前 155 行。USER.md 用户偏好、MEMORY.md 精炼事实、按日期 memory 日志等不同层；持久文件不等于全部注入 prompt。记忆可以保存授权上下文，但不执行硬政策；精确提醒靠 scheduled tasks。正文不要照抄完整目录，说明什么该从权威系统重新读取。
10. [Security trust model](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/security/trust-model.md)：已读责任与边界。一个 Gateway 是 operator 信任边界，sessionKey 不是授权 token；敌对用户应拆 OS/host/Gateway 等边界。exec approval 是 operator 意图防护，不是对敌多租户隔离保证。切勿把 workspace/cwd 当 confinement。

### Computer Use 的动作与观察

11. [Browser automation skill（项目原生）](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/extensions/browser/skills/browser-automation/SKILL.md)：已读全文，这是研究对象而非本次操作网站的授权来源。先检查状态、保留稳定 tab handle，观察快照再 act，导航/弹窗后重获快照，旧 ref 一次重试仍有 blocker 就接管；已有 cookies、权限页面和真正登录失败须区分。它是操作指导，不能单靠 skill 推出系统绝对可靠。
12. [Browser agent tools](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/agent-tools.md)：已读全文。snapshot 有 AI/ARIA 树，act 引用当前控件；text 用于有限可见文字，requests/errors 是诊断，不可信网页文本仍是外部内容；browser target 的 host/sandbox/node 选择影响隔离。浏览器有 DOM/ARIA 不等同任意桌面应用都有这些语义。
13. [Browser security](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/security.md)：已读全文。Browser control/CDP 能操作已登录账户，因此其接口与凭证也需要授权边界；不把持久登录当允许任意交易。仅挑必要机制，不复制配置指南。
14. [Playwright Locators](https://playwright.dev/docs/locators) 与 [Auto-waiting](https://playwright.dev/docs/actionability)：已读原官方正文。locator 动作重新定位当前 DOM，click 等有可见/稳定/接收事件/启用条件检查，retry assertions 等待条件而非固定 sleep。动作可点击仍不证明选中了正确订单或业务最终成功；force 不该被当通用修复。
15. [Anthropic Computer Use 官方文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)：已读 How it works/agent loop 和 batch 相关正文，当前网页主入口是 computer_toolset_20260801，旧版本仍有兼容入口。模型提出动作，客户应用在自己控制环境执行并回传截图/结果；每个 batch tool block 必须获得结果，重要动作的授权在执行每一块前检查。不要粘贴旧 computer_20241022 示例当当前 API，本文无需版本安装教程。桌面坐标需对应实际截图和窗口，而 DOM 路径适用于网页。
16. [Browser-Use Agent source](https://github.com/browser-use/browser-use/blob/main/browser_use/agent/service.py) 及 [history data](https://github.com/browser-use/browser-use/blob/main/browser_use/agent/views.py)：核读 Agent 配置/敏感数据边界警告、history 定义相关片段；main 没固定版本，若保留代码判断先获取 commit。它将 browser state、action result 等组成历史，并对敏感值做过滤；不要据“secret placeholder”断言所有截图与 DOM 都绝不会泄密。没有实际横向性能测试，不评第一。

### 持久状态、权限与评测

17. [Anthropic long-running harness](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)：2025-11-26，已核读正文，initializer / incremental coding / progress artifacts 是编码任务实验；压缩本身不足、提前判完成的问题值得讨论。不能把编码 benchmark 结论直接泛化为所有 Personal Agent。
18. [Managed Agents 分离 session/harness/sandbox](https://www.anthropic.com/engineering/managed-agents)：2026-04-08，已核读全文。外置 session log 与工具环境可独立替换，durable event log 与 prompt 的职责不同；凭证不在不可信代码环境中。选少量机制与 OpenClaw 碰撞，不完整复写文章，也不引用其性能数字当个人代理增益。
19. [Muse 安全设计](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)：2026-09-08，已读 runtime cell、authd、Sentinel、用户授权、浏览器接管、支付等正文。独立权限 authority、credential insertion、单次/任务/有期限授权是公司声明的设计，不是独立审计，也不是 Instinct 的架构。只选独立权限与接管对本篇有用的部分；不要声称它消除了所有 prompt injection 风险。
20. [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)：已读全文。checkpointer 保存 thread 状态，store 用于跨线程信息；InMemorySaver 重启会丢，生产要真正持久后端。挂 checkpoint 不自动解决第三方已经执行但未落盘的交易。
21. [τ-bench](https://arxiv.org/abs/2406.12045)：2024 论文，Noah Shinn 为作者之一。已读 abstract/metadata：用户、工具与规则的交互，以结束数据库状态对目标状态验证，多轮 pass^k 测反复成功。若解释具体 k 定义需看论文原文；不要与 pass@k 混淆，不把 2024 GPT-4o 分数当今天产品表现。
22. [OSWorld](https://arxiv.org/abs/2404.07972)：2024 论文，已读 abstract/metadata，369 个真实 web/desktop 多应用任务、每任务初始环境和 execution-based evaluator。只借其结果验证方式，不拿旧成功率当 2026 能力上限，也不说测过当前自己的系统。
23. [Instinct 访谈官方入口](https://colossus.com/episode/instinct-the-personal-agent/) 与 [机器转录](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493)：2026-09-28，取消订阅等“跟进到结果”的描述可作为需求线索，不是完整任务日志。完整官方稿需登录；机器稿有广告时间偏移。产品篇深入这份访谈，技术篇只用少量需求连接。
24. [Agent Skills 官方规范](https://agentskills.io/specification)：已读 progressive disclosure，metadata 在发现时加载，完整指令按激活需要读取，资源按需读取。Skill 提供做法与上下文，授权仍由调用环境实施，不能让 SKILL.md 自己授予账户权限。
25. [MCP Tools 官方规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)：已读概念、schema 与安全建议，工具定义有 inputSchema，平台负责暴露工具、呈现动作与审批能力。互操作协议不能替产品定义交易是否成功；不要把协议建议写成所有客户端已实现的硬保证。
26. [τ-bench 原文指标及 reward 段落](https://arxiv.org/html/2406.12045v1)：已核读第 3 节 Reward 与第 5 节 metric，pass^k 是同任务 k 次独立试验全部成功的概率，再跨任务平均；pass@k 看至少一次成功。reward 还包含必要信息输出的条件，不能把论文简化成只有 DB 相等。本文若只借其外部状态验证思路，应说明还要检查用户必要输出与政策遵守。

### 原创设计应如何落地到读者的决策

委托/任务/运行三个对象、动作账本与独立授权字段是本文可提出的设计，不声称任何公司使用同名对象。用“取消订阅成功但响应丢了”的示例解释：先查权威订阅状态或稳定交易标识，不能因超时就重新执行；没有可靠查询渠道时把未知状态交给用户处理。另一条示例是用户撤销后旧 worker 恢复，必须检查当下 authority，而不是只检查创建任务时的同意。接管时 Agent 与人不能同时对同一浏览器写入；恢复后重新观察当前环境。若展示结构体或流程，注明示意而非可直接投产代码，并解释外部业务系统不支持幂等时的局限。成本可拆模型、浏览器/虚机、重试和人工检查；本文没有真实单用户账单，不填市场估算数字。

### 生产发布回执

四篇文章与两张封面以 `2152d93164ccb64e99975a3a72e849265015d35e` 提交并推送远程 main，生产站点已更新。四个页面返回 200，标题、参考资料、系列与封面正确；产品和技术各自的全部外部引用都出现在生产正文，四个页面的双语切换链接均正确。两张线上 WebP 的 SHA-256 与提交文件逐字节一致。原博客工作区的其他修改未带入本次提交。

远程源码质量检查通过，工作流与 SEO 测试通过，273 项测试全部成功，Hugo 与 Netlify 完整构建完成。最后的整站输出检查报告 12 个链接错误，当前 CI 运行 `37040008089` 因此为 failure；该步骤未保留 output-report，当前未将这些错误归因到具体文章，也未声称整个 CI 已通过。生产发布由原有 Git 构建完成；本次文章的线上正文、引用、双语链接与封面已独立核验。全仓库 source 扫描另发现历史中文文章的 flavor 硬门槛，四篇新稿的变更范围源码检查通过。
