---
title: 'Personal Agent 技术研究：OpenClaw 怎样把一次运行接到长期事务上'
date: 2026-10-03T00:15:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Automation
  - Security
  - Development
  - Open Source
description: >
  个人代理跨天办事，要把有限运行接入持久任务、独立授权和可验证的外部结果。核读 OpenClaw 2026 年 10 月源码快照，以取消订阅为设计示例，追踪 Agent Harness 与 Gateway、状态恢复与 Computer Use 的配合，解释回执丢失与用户接管，以及迟到事件的边界，讨论架构选择与任务评测。
series:
  name: 'Personal Agent 研究'
  slug: personal-agent-studies
  order: 2
  total: 2
cover:
  image: /images/personal-agent-studies/technical-cover.webp
  alt: '概念插画：个人代理的有限运行、持久任务、执行环境与结果回执；并非精确的 OpenClaw 架构图'
---

个人代理要可靠地替人办事，得把一次模型运行接到可恢复的任务上，并用外部状态确认结果。模型说“已经取消”，还不能证明商家停止了续费。

考虑一个设计示例：用户让代理取消一项月度订阅，保留本期已经付费的权益，不接受新的优惠，也不删除账户。代理找到订阅并检查条款，随后点击确认；商家已经处理请求，浏览器却在返回结果前断开。此时重新点击可能多做一步，直接报成功又没有依据。这件事能否安全继续，取决于按钮之外保存了什么。

下面会让这条取消订阅事务从授权进入运行，中间经历暂停和恢复，最后走到验证与回执。**它是本文的设计示例，没有 Instinct 的生产执行日志，也不是我已经部署并测过的系统。** [上一篇产品研究](/zh/ai-agent/posts/personal-agent-product-delegation/) 讨论人为什么愿意再次委托；这一篇追问技术上谁负责把委托接住，以及失败之后该恢复哪一段。

OpenClaw 是主要样本。我核读的是 2026 年 10 月 3 日的 main 源码快照，固定在 `32e30e59d9a7fd1f5b3a9e9659427d45145779dd`，不把它称为已发布的稳定版。文中把项目已经声明、源码可以观察到的机制，与我建议采用的事务模型分开。站内 [OpenClaw 常驻网关文章](/zh/ai-agent/posts/agent-system-design-openclaw/) 使用较早版本，解释消息路由；这里重点看运行、恢复和动作后的结果。

## 先让“取消订阅”成为一件有边界的事

用户的请求里至少有三个不同的事实：取消哪项服务，允许产生什么后果，怎样才算完成。它们若只留在长聊天中，下一次运行就得重新猜一次。

我会先查当前订阅记录，核对账户与计划名称，也检查续费日期和本期权益。如果账户里有两个相似计划，无法唯一确定对象，就需要用户裁决；如果商家只支持立即终止且不给退款，原来的“保留本期权益”无法满足，也需要把新后果交给用户。已经说清的事情不该重复追问，真正改变后果的歧义又不能让模型自选。

为说明生命周期，我会分开保存三个对象。以下是**本文参考领域模型**，名称与字段都不是 OpenClaw 的原生类型。

| 对象 | 保存什么 | 何时结束 |
| --- | --- | --- |
| 委托 Mandate | 用户目标、允许的后果、对象范围、期限与撤销记录 | 用户撤销、期限到达或目标已解决 |
| 任务 Task | 当前进度、外部对象标识、证据、阻塞原因和下一次检查 | 已验证完成、明确失败或交还用户 |
| 运行 Run | 某次执行的输入版本、运行时、工具结果、终态与费用 | 该次执行停止、失败或正常结束 |

一次委托可以对应多次任务运行。今晚需要用户登录，今天的运行可以结束，任务停在“等待本人验证”；用户明天回来，任务在新的运行中继续。取消操作已经发出但结果不明时，任务停在“等待对账”，也不能因为某次运行正常结束就提前变成“已完成”。

委托记录还不能独自承担权限检查。我会让独立的授权服务保存“现在仍允许做什么”，运行每次产生写入动作时重新查询它。任务保存的是目标与进度，授权服务给出当前可执行范围，商家系统拥有订阅状态。三者可以相互引用，却不该互相冒充。

例如，任务里记着 `renewal_enabled = false`，应附带检查时间、来源和对应账户。恢复后若读到商家状态又变回启用，就应承认出现了新事实。不能让昨天的摘要压过今天的账户页面，也不能因为用户以前同意过取消，就忽略今天的撤销。

这样做会多出数据库、状态转换和管理界面。对一次只读摘要可能不值得；对跨天执行、会改变账户状态的事务，这些成本换来的是一个具体能力：模型换了、进程停了，用户仍能知道这件事停在哪里。

## 当前 OpenClaw 自己拥有内置 Agent loop

把模型连到工具以后，应用还需要一段程序反复读取输出并执行工具，再返回结果，并判断继续还是结束。这段反复执行的程序叫 Agent loop。围绕它安排上下文与工具，并处理权限、会话及生命周期的执行层，通常称为 Agent Harness。

当前 OpenClaw 的内置运行时已经由项目自己拥有。可复用的循环在 `packages/agent-core/`，内置的单次尝试（attempt）编排在 `src/agents/embedded-agent-runner/`，Harness 选择与注册在 `src/agents/harness/`，模型供应商的传输实现在 `src/llm/`。旧运行时别名 `pi` 会归一为 `openclaw`；留下的 Pi TUI 依赖是终端组件，不能据此断言今天的 Agent loop 仍由外部 Pi SDK 驱动。[运行时架构](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/agent-runtime-architecture.md)

这次阅读里，我更关注几条责任边界。模型负责根据输入提出回答或动作；provider 把请求和流式响应接到具体模型服务；Harness 驱动一次准备好的执行；Gateway 接住消息并调度运行，维护会话与投递；浏览器、终端或设备节点才是动作实际发生的环境。它们可以在同一进程附近部署，责任仍然不同。

```text
用户请求 / 定时事件
        ↓
Gateway：准入、路由、队列与运行记录
        ↓
Core：准备模型、上下文、工具政策和执行条件
        ↓
Harness：驱动这一次 attempt
        ↔ provider：模型请求与响应
        ↔ 执行环境：浏览器、文件、终端、远端设备
        ↓
运行终态 → 任务结果验证 → 用户回执
```

这是责任示意，不是 OpenClaw 的精确调用图。尤其最后一行，“任务结果验证”包含本文建议增加的业务层，不能从项目会保存 transcript（会话记录） 推导它已经懂得所有订阅业务。

内置循环也比“模型说话了就退出”细得多。在 `agent-loop.ts` 中，循环检查新来的引导消息、处理取消信号，流式取得模型响应，执行工具并合并结果，再判断是否需要下一轮。provider 的错误、工具的终止要求和 宿主程序（host）的停止决策各有路径。即使一次响应的 `stopReason` 是 `stop`，只要 `endTurn = false` 且没有工具终止，仍可继续。[循环源码](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/packages/agent-core/src/agent-loop.ts)

取消订阅时，模型先说“我找到订阅了”，可能只是进度消息。后面还要读取取消条件，可能再调用工具。把第一段自然语言当作完成信号，会提前关闭任务，甚至释放用户原本等待的结果归属。

Gateway 的 `agent` 请求首先返回 `runId` 与接收时间，它们证明运行被接受。随后有 assistant、tool 和 lifecycle 三类事件；`agent.wait` 等待运行终态，另有最终回复的投递事实。`sourceReplyDelivered: true` 可以证明最终回复送到原会话，仍不能证明这封回复所描述的商家结果为真。[运行生命周期](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md)

我因此会分别记录：请求已接收和执行已结束，外部目标已验证和用户回执已送达。四个时间可能不一样。运行超时了，外部动作可能已经发生；业务成功了，消息可能没发出去；消息送达了，也可能只是在告诉用户当前还不能确认。

还有一个容易误用的接口：`agent.wait` 超时只结束这次等待，不会取消底层运行。调用方应继续观察同一个 `runId`，或明确请求停止。如果因为等待超时又发起一条新运行，旧运行可能仍在点击，新运行也开始找同一个取消按钮。[等待语义](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md#timeouts)

## Harness 契约约束的是一次执行，不能吞掉其他责任

OpenClaw 的 Harness 插件契约把执行单位叫作 prepared attempt：core 已经准备好的一次尝试。普通模型 API 接入应该做 provider 插件；只有需要原生线程、恢复标识，或需要会话压缩或独立后台服务（daemon）的运行时，才有理由替换 Harness。换一种模型，不必连会话管理和工具政策一起换掉。[Harness 插件契约](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md)

在调用 `runAttempt` 前，core 准备 provider/model、运行时认证与上下文预算，也准备 transcript、工作目录（workspace）、执行隔离环境（sandbox）、工具政策与回调，保留模型回退（fallback）等决策。Harness 接到这些输入之后运行，不能悄悄另选模型或改渠道投递。契约中的 `runtimePlan` 是 host 拥有的政策状态，也不能当普通可写配置。[Core ownership](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md)

这对个人代理很实际。假如取消任务允许查询和取消指定订阅，却禁用任意 shell，一个原生运行时若仍保留自己的 shell，就能绕开表面工具列表。OpenClaw 要求声明 `conversationToolPolicySupport: "exact"` 的 Harness 覆盖原生工具、接入工具，也覆盖 MCP（工具互操作协议）、apps、委派及恢复线程上的明确限制。无法做到时，应显式拒绝受限的执行轮次（turn），不能静默忽略。[原生工具政策契约](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md#native-tool-policy-enforcement)

会话归属也需要单独处理。原生 Harness 可以把自己的 thread 或 resume token 绑定到 OpenClaw session（会话），并把可见输出镜像回 transcript。但知道某条原生线程属于谁，只是归属事实；存储租约也只是协调存储的机制。两者都不能授予现在执行动作的权限。[Sessions and results](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md)

我会特别保留契约中关于工具终态的部分。执行工具的 Harness 需要在工具到达终态时调用 `observeToolTerminal`，报告实际执行的参数与原始结果或错误，说明是否已经开始执行，以及成功或失败。若批准或校验挡住了调用，`executionStarted` 为 false；一旦可能已经派发，就要保守地报告 true。不能从显示文字里猜“应该没执行”。[工具终态契约](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md#terminal-tool-outcomes)

这能保住一个重要区别：“取消动作被权限挡住”与“取消动作执行后返回失败”。前者可能安全地重新申请授权；后者需要先查外部状态。契约保留的是执行边界上的事实，如果工具只返回模糊的网页错误，它也无法凭空产生商家交易凭证。

另一个有意思的设计是 `finalizeSettledTurn`：工具已经全部结束，原生 turn 却没有最终回答时，可以专门生成一次可见回执。这个过程必须使用冻结到工具结果边界的记录，移除工具、授权、用户输入、调度和远控等能力，不能把普通 `runAttempt` 加一个“请别用工具”的提示当作隔离。[终态后的回执补写](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md#settled-tool-finalization)

取消已经发生，只欠一句回答时，系统可以补写说明，却不应再获一次取消机会。这个约束也提醒我：回执生成应读取事实，不能为了让答案完整，重新进入会改变世界的执行循环。

当前插件接口仍属实验性。Harness 可以在不同 turn 之间切换；一轮已经有工具或审批，或已有 assistant 文本或发送之后，不能中途更换。迁移运行时需要检查会话与政策兼容性，也需要保留已经发生动作的记录。[当前限制](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md#current-limitations)

## 跨天工作靠持久状态，也靠有人负责唤醒

取消订阅可能遇到商家客服承诺“稍后处理”。继续盯着同一个模型调用没有必要。我会把任务置为“等待商家”，保存工单号与已发出的请求，记下下一次检查时间与停止条件，让本次运行结束。到期事件再产生新的有限运行，先查状态，再决定是否继续。

OpenClaw 的定时工作由 Gateway scheduler 管理，任务定义、运行状态与历史持久化到 SQLite。Gateway 必须运行，计划才会触发；这与模型是否正在生成 token 是两回事。启动后的补跑和运行恢复，也由调度层依据已存记录处理。[Automations 运行机制](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md)

当前 Heartbeat 也是 scheduler 管理的 system-owned automation，定期启动一次 agent turn。默认提示要求读取监控上下文，不从旧聊天臆测、重复过往任务。`every: "0m"` 停的是周期执行节奏，特定事件仍可能唤醒一次 turn。因此“后台在线”不代表模型不停思考，“关闭周期心跳”也不代表所有事件都被禁用。[Heartbeat](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/heartbeat.md)

在我的取消示例里，唤醒记录应该指向任务 ID，而非一段“继续帮用户处理之前的事”。记录要说清这次只查哪张工单和何时截止，还要说明没有变化时是否保持安静。用户暂停任务以后，调度层也应停止自动检查；如果只能在 prompt 写一句“已暂停”，旧计划仍会把它叫醒。

恢复同样需要分层。OpenClaw 的会话、transcript、计划与部分输入、投递记录保存在磁盘；Gateway 内存里的交互式终端 PTY 随旧进程结束，不会恢复。不同任务有各自的 owner，不能见到一个恢复计数就认为所有事情都已继续，更不能认为回复已经送达。[重启恢复的保存范围与验证](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/restart-recovery.md)

用户偏好与任务事实要拆开，运行记录与权限事实也值得拆开。OpenClaw 将稳定偏好放在 `USER.md`，精炼的长期事实放在 `MEMORY.md`，日期日志保存工作材料；写在磁盘不代表每次都全量注入 prompt。记忆可以记录授权背景，但硬政策仍由执行环境检查。[Memory overview](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/memory.md)

“用户倾向保留已付费权益”可以是偏好；“这次允许取消计划 A”是有范围的委托；“商家已收取本期费用”需要账户事实；“此刻是否允许点击确认”要读当前授权。把四件事合成一条长期记忆，会让偏好悄悄变成执行许可，或让过期事实一直影响下一次操作。

上下文压缩只负责让模型在有限窗口内继续理解。它可能留下“正在取消订阅”，遗漏请求是否已经发出，也可能缩掉一次撤销。任务账本必须保留这些细节，恢复时按需取回。Anthropic 对 Managed Agents 的工程说明也把 session log、Harness 与 sandbox 拆开，持久日志在上下文窗口之外；这是该产品声明的设计，不是个人代理已被证明可靠的结论。[Managed Agents 的分离设计](https://www.anthropic.com/engineering/managed-agents)

同样，LangGraph 的状态保存点（checkpoint） 可以保存执行线程中的状态，是否跨重启保留还取决于后端；跨线程信息有单独的存储（store）。它能帮助程序从一个状态点恢复，却不能让商家已经执行、应用尚未落盘的取消动作自动变成“只执行一次”。外部事务仍需要独立核对。[LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)

## 三类架构，差别在于谁持有连续性

实现个人代理时，我会先按连续性放在哪里区分几种常见选择。下表是设计归纳，不是对市场份额的统计，也没有横向性能测试。

| 选择 | 比较容易做好什么 | 需要承担什么 |
| --- | --- | --- |
| 在自有应用中直接运行模型与工具循环 | 精确控制业务步骤、权限和数据结构 | 自己维护压缩、流式事件、取消、恢复与 provider 差异 |
| 常驻网关接消息、调度并驱动 Harness | 多入口、会话队列、定时工作和运行记录较集中 | 仍需补业务任务状态，并处理网关可用性与信任边界 |
| 持久任务服务调度可替换的原生 Agent 运行时 | 复用原生线程、工具生态与恢复能力 | 原生状态和产品状态要对账，政策必须覆盖隐藏能力 |

第一种适合范围清楚的垂直任务。一个只处理特定商家订阅的产品，可能先用确定的程序查账，再让模型读条款；取消动作由小型业务服务完成。开发者更容易指定成功条件，代价是新商家、新模型和 UI 变化都需要维护。

第二种接近 OpenClaw 提供的基础。消息入口与调度不用每个场景从头做，Gateway 负责许多运行责任。但把“运行成功”投影为“取消成功”仍是业务设计。采用网关没有免除任务层，只是让它可以站在现成基础上。

第三种把任务留在自己的持久服务中，某次执行可以交给原生编程代理、浏览器代理或其他运行时。它适合需要多种能力、希望替换执行器的系统。不过原生线程会保存自己的历史与待完成工作；产品停止任务以后，必须确认原生执行也被停止，恢复时还要重新验证权限，不能只对齐一个 thread ID。

这三种可以组合。小团队先在单个 Gateway 上实现有限任务，后来再把状态与执行拆成服务，并不矛盾。我会优先选择能解释当前失败的结构：如果连取消请求是否发出都无法判断，先补动作记录和查询；继续增加代理数量，通常不会让这个事实更清楚。

## Computer Use 要从观察走到可确认的结果

计算机操作是上述链路中的执行手段。取消订阅可能用商家接口，也可能用网页可访问结构，还可能只能操作桌面上的应用。选择依据是当前任务能看到什么、能验证什么，以及需要付出多少维护和安全成本。

有正式接口时，可以直接查询订阅 ID、读取状态，再发出范围清楚的请求。如果接口支持稳定的操作 ID 或幂等键，恢复更容易对账；接口没有覆盖的条款、账户权限和错误语义仍要处理。我不会为了展示“像人一样点鼠标”，放弃一个已有授权且能返回明确状态的接口。

网页具备可访问结构时，浏览器可以返回控件的角色、名称与层级，再让代理引用当前控件点击。OpenClaw 的 browser 工具提供 AI/ARIA snapshot（带角色与名称的页面快照）、`act` 与 screenshot；`text` 用于有限可见文字，requests/errors 用于诊断。网页的文档结构 DOM 与可访问属性 ARIA 可以减少坐标猜测，不能直接推广到所有桌面软件。[Browser agent tools](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/agent-tools.md)

例如订阅页有“暂停计划”和“关闭续费”两个按钮。结构化观察有助于读清名称和对应区域，截图则有助于确认按钮是否被弹窗遮住和账户头像是否切换，也能确认条款是否只在视觉区域显示。两种观察可以互补，不能把某一张旧截图或旧树一直当成当前事实。

桌面像素操作适合原生应用、画布或语义树缺失的界面。模型读截图后提出鼠标、键盘动作，由应用在受控环境执行，再返回结果。Anthropic 当前 Computer Use 文档把这条循环明确留给客户应用实现；动作序列中的每个工具块都要得到结果，产生后果的动作在每块执行前检查授权。[Computer Use 官方文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

截图坐标只对当时的画面成立。窗口缩放或分辨率发生变化，页面滚动、出现弹窗或多屏位置变化以后，需要重新观察；按键之前还得知道当前焦点在哪里。取消示例里，原本要在商家表单输入工单说明，系统通知抢走焦点，后续文字就可能进入另一个应用。我的执行器会绑定目标窗口与截图尺寸，动作前检查前台窗口，关键输入后再看字段内容；无法确认就停下。

网页操作也会失效。OpenClaw 的浏览器指导要求保留稳定 tab handle，用最新快照中的控件引用 ref 操作；导航、弹窗和提交改变页面后重新取得状态。旧 ref 失效时，在同一个目标标签页重新观察，找当前控件，再有限重试。若页面已经进入登录或权限阻塞，就报告阻塞，不继续盲点。[项目浏览器操作指导](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/extensions/browser/skills/browser-automation/SKILL.md)

这里有两种“旧元素”。一种是 ref 指向的控件已经消失，工具可以明确失败；另一种是名称还一样，但背后的业务对象变了。用户切换账户后仍然有“取消”按钮，重新定位也会找到它。第二种需要重新核对账户和订阅 ID，不能只靠工具能点击来防止。

Playwright 的 locator 在动作时重新定位当前元素，并在点击前检查是否可见与稳定，是否能接收事件和已经启用等条件，断言也可以等待状态出现。它能减少页面时序引起的错误；这些检查证明的是动作可执行，无法证明选中了正确订阅。`force` 绕过部分检查，更不能作为页面出错时的通用修复。[Locators](https://playwright.dev/docs/locators)、[Auto-waiting](https://playwright.dev/docs/actionability)

我会让取消流程保留这样一个短循环：

```text
观察账户、订阅与当前页面
        ↓
核对目标、授权与控制权
        ↓
执行一个有限动作
        ↓
重新观察页面变化
        ↓
检查业务证据；不足则等待、对账或交给用户
```

等待的依据应该是一个预期状态。按钮暂时禁用且显示处理中，就在有限预算内等它结束；页面导航还没完成，就等待目标页；后台取消可能需要客服处理，就退出当前运行，定时查询。短暂没有输出不等于卡死，等待超时也不等于动作失败。

重新观察适合前提已经变了：弹窗出现或 URL 改变，元素失效或窗口焦点切换，用户刚接管，或网络恢复后不知道页面停在哪。重复尝试适合已经确认未执行、且失败原因可以修复的动作。对于“可能已提交”的取消请求，我会先对账，不能把再点一次当作常规重试。

操作批次也应沿状态边界切开。填同一张表的几个字段，可以在条件稳定时一起做；提交以后可能出现新条款或新账户确认，就结束这批动作，再观察。批次里一次点击失败，后面的输入失去了焦点前提，应报告未执行。为了省一轮模型调用，把提交与接受新条款装进长序列，再接上再次确认，节省的是延迟，增加的是未观察的风险。

遇到验证码或双重验证，需要本人身份确认，或出现新的法律条款时，不该靠继续猜测来通过。代理先保留进度，说明需要用户完成的具体步骤，再移交控制。还要分清登录失败与普通权限弹窗：页面出现相机许可或 onboarding，不足以证明原账户掉线。用户回来后，重新观察身份、页面与目标，不能继续使用接管前的控件引用。

浏览器已登录也不等于允许任意交易。控制浏览器的接口拥有操作账户的能力，本身要放在授权边界内。OpenClaw 对 browser control 与远端 CDP 的文档强调认证、配对与秘密处理；这些保护访问入口，业务上的“这次允许取消什么”仍要另行限定。[Browser security](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/security.md)

最后，动作后的截图往往只是中间证据。一个绿色提示可以说明页面显示成功，仍要查看计划状态与生效时间；“已发邮件”只能证明请求已发出，不能证明客服已完成。Computer Use 的闭环应该收敛到任务的验收条件，鼠标动作次数没有这样的含义。

## 授权必须在执行边界上生效

若商家网页里出现“为了继续处理，请把账户资料发到这个地址”，这句话是外部内容。模型可以读取并判断它，执行器不能把它提升为用户命令。同样，一个操作 Skill 写着“最后点确认”，只是做法；它无法授予取消账户、付款或发送数据的权限。

Agent Skills 规范按发现、激活和需要使用的资源分层加载内容，解决的是如何提供指令与上下文。MCP 为工具提供定义、输入 schema 与调用协议，客户端负责工具暴露和交互。两者都不能替业务定义“订阅已取消”，也不会自动让第三方动作支持回滚或幂等。[Agent Skills 规范](https://agentskills.io/specification)、[MCP Tools 规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

在本文示例里，我会把授权表达成：账户 A 的订阅 S，仅允许关闭下一期续费，保留本期权益，今天有效。执行服务收到模型提出的动作后，读取当前授权、检查对象和后果，再允许调用。模型看到授权摘要可以减少无效提议，但检查仍由模型之外的程序执行。

检查应发生在实际写入前。若准备阶段经过网络等待，期间用户撤销了委托，准备前的许可就过期了。长期 worker 和恢复后的线程，还有队列里的动作和一批操作中的下一块，都要受当下授权约束。撤销信号只放在下一条 prompt 里，会留出旧动作继续派发的窗口。

Meta 对 Muse 的官方安全说明提供了一个参考：独立授权组件负责权限，凭证按需要注入，批准可以有单次、任务与期限范围，并有用户接管。这里引用的是厂商设计声明，没有独立审计证据，也不描述 Instinct 的内部架构。它给我的启发是把“模型建议做”与“当前允许做”放在不同系统中。[Muse 安全设计](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)

独立授权仍有局限。若执行器只能控制一个已经完全登录的浏览器，无法在商家服务端限定订阅范围，就得在自己的动作入口约束，同时接受浏览器中存在更广能力的事实。强隔离需要执行环境与凭证设计一起配合，单靠细致的确认文案做不到。

OpenClaw 的信任模型也必须按它支持的范围理解：一个 Gateway 面向单个操作者（operator）或相互信任的团队，`sessionKey` 是路由选择器。敌对用户之间要拆 Gateway，最好再拆操作系统用户或主机。exec approval 是对 operator 意图的保护，workspace 或工作目录也不能当作隔离边界。[Security trust model](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/security/trust-model.md)

一个跑在个人电脑上的助手，与一个服务陌生用户的云产品，因此需要不同的部署约束。可以借用同一 Harness 契约，不能因为各人有不同 session，就假定文件、账户和设备已经隔离。

## 三段失败时序，比一张成功流程图更有用

下面的防线是本文设计建议。它们借用了运行身份、持久记录与授权检查的思路，不能被读成 OpenClaw 已经为任意商家实现这些业务保证。

### 商家已取消，本地没有收到回执

时间线从实际写入开始：执行器把动作 A 记成“准备提交”，派发取消；商家关闭续费；连接断开；本地只留下“调用超时”。随后 worker 重启，从最近的 checkpoint 看到订阅尚未标记完成。

如果恢复策略是“上一动作失败就重跑”，这里便可能重复提交。我的动作账本会记录任务与外部对象，保存操作意图、派发时间和稳定请求 ID，也记录结果已知程度。写入前先持久化意图，写入后再持久化结果；两次记录之间仍有一个不可消除的未知窗口。

恢复看到“已派发、结果未知”，先查商家权威状态。若订阅 S 已关闭续费，生效时间符合委托，就把这次观察附到动作 A，标为已验证；无需再取消。如果商家支持幂等键和按请求 ID 查询，可以关联同一操作；它不支持时，我不会假装本地生成的唯一标识（UUID）有同样作用。

若页面只说“正在处理”，任务继续等待。若无法可靠查询，也没有稳定标识，就向用户交代“请求可能已提交，目前无法确认”，给出最后证据和接管入口。系统可以选择停止自动动作，不能为了消除状态上的难看，把 Unknown 强行改成成功或失败。

OpenClaw 的 one-shot automation 已对完成投递的不确定性做了相应约束：持久化投递尝试后被中断，任务会保留 disabled/Unknown 供检查，不盲目重放。文档也明确，这个 fence 不让任意脚本或工具副作用获得恰好一次（exactly-once）的保证。它保护的对象与商家取消事务不同。[One-shot 恢复边界](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md#how-automations-work)

### 用户接管或撤销，旧执行还在路上

第二段时序中，代理来到验证码前，任务暂停并把浏览器交给用户。用户登录以后改变主意，手动保留订阅；旧 worker 却从网络等待中返回，继续准备点击取消。

接管需要控制权转移。我会让同一个任务浏览器一次只接受一个写入者，用可撤销的控制租约区分人和代理；移交时停止代理派发，等待已发动作结算，不能只在界面显示“您现在可以操作”。用户可能进入另一个账户，返还后必须重新观察，重新核对目标。

若用户撤销委托，授权服务先使对应动作许可失效，任务停止自动调度，再向 active run 发停止信号。worker 在最后派发边界检查许可，发现已撤销就拒绝写入。即使旧程序还活着，它也不能凭任务创建时的同意继续操作。

如果取消已经到达商家，再撤销本地授权也无法把它收回。任务应保存已发生的事实，告诉用户是否有恢复订阅或联系商家的可能。再次开通会产生新的后果，要取得相应授权。不能把“用户撤销了请求”报告为“已撤回商家操作”。

暂停与撤销因此不同。暂停可以保留目标，等待明确恢复；撤销终止原来的执行许可。恢复按钮也不是万能授权按钮：原许可过期、对象变了或条款新增时，需要确认新范围。

### 重复和迟到事件，不能覆盖当前事实

第三段时序里，一次取消查询超时，任务随后恢复并验证完成。几秒后旧运行的错误事件到达；同时，渠道重试又送来原请求。若系统按到达顺序更新一列 `status`，已完成任务可能变回失败，再启动一次取消。

我会把消息 ID 与任务 ID 分开，run ID 和动作 ID 也分别保存。相同消息的重送可复用接收回执；同一任务的新运行有新 run ID；同一业务动作需要可关联的动作身份。重试原消息不必创建新任务，但一条真的新请求也不能只因文字相同就被吞掉。

状态更新还需要携带预期版本或执行代次，只有仍拥有该阶段的运行才能推进任务。旧错误作为旧 run 的记录保留，不能改写新 run 已确认的任务结果；如果迟到的外部通知揭示了新业务变化，则另起核对，不能一概丢弃。版本检查防旧写入，业务判断确认事件是否仍有意义。

OpenClaw 对 transcript 使用 `activeWriterRunId` 与 `expectedWriterRunId`，在提交事务里检查当前 writer；会话 lane 与 SQLite 写队列也为各自资源排序。它们阻止旧运行覆盖新 transcript，不等于两个 session 不会同时操作同一商家订阅。共享业务对象仍需要自己的协调。[会话 writer fence](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md#queueing-and-concurrency)

可以把本文建议的恢复逻辑压缩成下面几行。它是解释责任的伪代码，省略了事务与租约，也省略了异常和清理，不能直接投产：

```text
读取当前任务、委托版本和授权
若已撤销：停止派发，结算在途动作
若人持有控制权：保留进度，等待返还
若动作已派发且结果未知：先查询外部状态
若目标已验证：保存证据，安排回执
否则：取得当前控制权与许可，再执行下一步
```

这里最重要的选择，是把“先查询”作为一种正常恢复路径。恢复也可能是把已经发生但尚未记录的结果找回来，不必从失败行再执行一次。

## 回到取消订阅：任务什么时候才结束

现在把示例接完整。用户最初允许关闭下一期续费，代理查询账户与条款后建立任务。运行一到身份验证处暂停，记录当前页面、订阅对象和未提交事实，交给用户。用户完成验证并返还控制权，运行二重新观察，没有沿用旧 ref。

运行二确认授权仍有效，读取最新条款，派发关闭续费动作。返回连接丢失，运行结束为错误，任务进入结果未知。运行三由恢复事件唤醒，先查询订阅 S；看到续费关闭、本期权益保留至明确日期，保存检查时间和来源，将任务标为已验证完成。

如果仍在客服处理中，就保存工单与下一次检查，结束运行三；到期运行四继续查。超出截止、需要新授权或无法核实时，转为等待用户。没有变化的检查可以安静结束，有必要动作才通知，避免把每次轮询变成用户需要管理的新消息。

最后的回执可以很短：“计划 A 的续费已关闭，本期权益保留至某日；这是刚才账户页显示的状态，确认页在这里。”若有不确定部分，就说明哪一部分尚未确认。任务里保存的是可追溯证据，模型负责把它说清楚；回执发送失败只触发投递处理，不能再次执行取消。

这段设计也要求对证据保留有所节制。账户页面可能包含私人信息，通常只需保存被授权的订阅标识与必要字段，连同时间与来源，不必永久归档整个桌面。截图用来诊断或核对时，应限制访问与保留周期。详细记录有助恢复，也增加了敏感数据的管理成本。

“已完成”的边界应当与最初目标一致：用户只要求关闭下一期续费，就确认这件事；若要求退款，取消成功以后仍有一段退款任务。不能用一个成功按钮替代多个不同的外部结果，也不能把商家未来永不扣费当作当下可以证明的事实。

## 评测要让成功落在任务上

验证个人代理时，我会先给每个任务写可检查的目标状态。取消示例要求账户与计划正确，续费关闭，本期权益未被提前终止，也包括没有接受新计划或删除账户。再查必要回执是否到达，以及全过程是否越过授权。最终状态碰巧正确、过程中未经允许操作，仍然不能算安全成功。

τ-bench 的 2024 年论文提供了一个有用起点：检查结束数据库是否达到目标状态，还检查用户回复包含必要信息；作者也指出奖励为一并不一定足以证明政策遵守。它的 `pass^k` 是同一任务 **k 次独立试验全部成功** 的概率，再跨任务平均；`pass@k` 才是至少一次成功。两者回答的问题不同。[τ-bench 原文](https://arxiv.org/html/2406.12045v1)

一个事务偶尔能做成，与每次都能做成，对委托价值很不一样。但反复测试应在重置的环境或受控样本中进行，不能对同一个真实订阅连续取消 k 次。历史模型分数也不能换算成今天 Instinct 的成功率，或现实旅行、支付任务的成功率。

桌面任务可以借鉴 OSWorld 的 execution-based evaluator：任务提供初始环境，检查操作后的实际结果，而非只给生成轨迹打分。它的 2024 年基准包含真实网页和桌面、多应用任务；这里借用验证思路，没有测过本文系统，也不把旧成绩当作 2026 年的能力上限。[OSWorld](https://arxiv.org/abs/2404.07972)

我会让取消测试经历几种明确干扰：提交以后断网或接管时切账户，授权在等待中到期，旧 worker 迟到或同一消息重送，以及商家显示处理中。观察是否再次产生写入，是否保留 Unknown，是否正确寻求人工处理。正常路径跑通以后，这些实验更能暴露恢复设计的漏洞。

度量也需要同时看目标完成、反复可靠性和权限违反，记录人工介入次数与耗时，记录任务等待时间和无法确定结果的比例。成本则计入模型与浏览器或虚机，也计入重试、状态保存与人工核对，最后落到每个已验证任务。本文没有真实账单和实验样本，不填一个看似精确的单用户成本或成功率。

我最后会检查一条看起来不够漂亮的回执：“请求可能已经提交，我暂时无法确认，也不会重复取消。”如果证据只到这里，这句话就是系统应当交付的事实。个人代理的可靠性既表现在顺利完成时，也表现在它能保留进度、承认未知，并让下一次运行继续面对同一件真实的事。

## 参考资料

以下 OpenClaw 链接全部固定到本文核读的源码 SHA；正文中的事务对象、控制权和动作账本是本文设计建议。公开源码阅读不等于生产实测。

- OpenClaw：[运行时架构](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/agent-runtime-architecture.md)、[Agent loop 生命周期](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md)、[循环源码](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/packages/agent-core/src/agent-loop.ts)
- OpenClaw：[Harness 插件契约](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md)、[Core ownership](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md)、[Sessions and results](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md)
- OpenClaw：[Automations 运行机制](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md)、[Heartbeat](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/heartbeat.md)、[重启恢复](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/restart-recovery.md)、[Memory overview](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/memory.md)
- OpenClaw：[Browser agent tools](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/agent-tools.md)、[浏览器操作指导](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/extensions/browser/skills/browser-automation/SKILL.md)、[Browser security](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/security.md)、[Security trust model](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/security/trust-model.md)
- Playwright：[Locators](https://playwright.dev/docs/locators)、[Auto-waiting](https://playwright.dev/docs/actionability)
- Anthropic：[Computer Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)、[Managed Agents 的分离设计](https://www.anthropic.com/engineering/managed-agents)
- Meta：[Muse 安全设计](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)
- LangChain：[LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Agent Skills 规范](https://agentskills.io/specification)、[MCP Tools 规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [τ-bench 论文原文](https://arxiv.org/html/2406.12045v1)、[OSWorld 论文](https://arxiv.org/abs/2404.07972)
