---
title: 'Agent 不是一种产品：十套系统如何重新分配控制权、状态、身份与副作用'
date: 2026-08-07T19:43:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - System Design
  - Data Processing
  - Security
  - Development
description: >
  基于十篇个案，以控制权、状态、执行身体、强制层和产品表面五个所有权问题，推导 bounded function、workflow、harness、event platform、gateway/computer 与 vertical organization 六种形态，并给出副作用宪法、五层停止协议和选型树。
tldr:
  - Agent 不是一种产品，也不是从聊天机器人到“全自治”的成熟度阶梯。十套系统真正不同的，是谁控制下一步、状态由谁保存、动作在哪里执行、哪一层能强制规则，以及人从什么表面协作。
  - 上一篇 Harness 总纲回答“生产系统需要哪些能力”；本篇回答“这些能力交给谁”。组件清单相同的两个系统，可能因所有权不同而拥有完全不同的风险、成本与产品价值。
  - 六种最小成立形态是 bounded function、deterministic workflow、model-led harness、event platform、gateway/cloud computer、vertical organization。它们可以组合，不构成等级。
  - 一次现实动作必须经过 proposal、authorization、execution、evidence、closure 五层。模型可以提议，强制权、事实权与业务关闭权必须落到代码、策略、外部系统或人。
  - 最危险的不是 failed，而是 unknown outcome：系统知道动作已发出，却不知道世界是否已改变。没有 idempotency、receipt 与 reconciliation owner，checkpoint、event log 和多 Agent 辩论都不能证明安全完成。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 11
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/11-synthesis/agent-system-constitutional-route.svg
  alt: 'Agent 系统设计的五个所有权问题、从意图到副作用与证据的控制权宪法之河，以及六种最小成立形态的决策图'
---

系统 A 有十二个 Agent、长期记忆、云端电脑、事件日志和自动恢复。

系统 B 只做一次 `document → structured candidate`，把结果放进表单，等人核对原件后再保存。

如果 A 在外部 API 已成功、内部 observation 尚未记录时崩溃，恢复后盲目重试；而 B 把概率输出一直留在 candidate 区，直到用户显式 commit——哪一个更“成熟”？

答案不是 A。

它们甚至不在同一条成熟度轴上。

过去我们常把 Agent 想象成一种产品：先有聊天，再有工具，再有记忆、多 Agent、电脑和完全自治。十篇个案研究给出的结论正相反：

> **Agent 产品的形态不取决于自治等级，取决于控制权、状态、身份、副作用和完成权如何分配。**

设计目标并非把更多决定交给模型。只把**无法预写**的决定交给模型；每次越过现实世界边界时，授权、证据与关闭责任都必须已经有主人。

本文只聚合系列前十篇已经冻结的一手来源与研究回执，研究日为 2026-08-07。不从文章修辞制造新事实，也不把闭源 surface 反推成未公开 runtime。具体版本、commit 与证据缺口保留在各个案文末。

## 这不是 Harness 的第九根支柱

我在[《Agent Engineering 全景地图》](/zh/ai-agent/posts/agent-engineering-the-98-percent-harness/)里把生产 Harness 拆成八根支柱：编排、上下文、记忆、工具、可靠性、评估、成本与治理。

那张地图回答：

> 一个生产 Agent 需要哪些能力？

这个系列新增的问题是：

> **这些能力交给谁？**

同样有 loop、context、tools、memory 和 eval：

- [Pi](/zh/ai-agent/posts/agent-system-design-pi/) 把 plan、permission、sandbox、MCP 和 subagent 大量外移给 host 与 extension；
- [n8n](/zh/ai-agent/posts/agent-system-design-n8n/) 用确定性 graph 拥有全局控制，只在 Tools Agent 节点内暂时把工具选择交给模型；
- [OpenHands](/zh/ai-agent/posts/agent-system-design-openhands/) 把单步决策交给无状态 Agent，却让 Conversation 拥有生命周期、事件、恢复与 stop；
- [TaxHacker](/zh/ai-agent/posts/agent-system-design-taxhacker/) 根本不需要 Agent loop，应用代码拥有顺序、commit 与 canonical record。

所以本篇不给 Harness 再加一个组件，而把组件清单改写成**产权表**。

## 图解：控制权宪法之河

![Agent 系统设计控制权宪法之河](/images/agent-system-series/11-synthesis/agent-system-constitutional-route.svg)

**阅读指南：** 顶部先问五个所有权问题。中间画的是动作从意图流向现实的责任链，拒绝成熟度阶梯：身份化意图 → 不确定性圈定 → effect proposal → policy/approval/idempotency → world mutation → artifact/evidence → memory/eval/stop。十个项目停靠在它们实际接管的河段。底部是六种最小成立形态；从左到右只是增加了新的必要条件，不代表更先进。

图中最重要的是 world mutation 前后的红色边界。

模型停止、graph END、checkpoint success、event append 和角色投票，都不能越过这条线替外部世界作证。

## 五个所有权问题

可以把 Agent 形态写成：

\[
\text{Agent Shape}
=
\text{Control}
\times \text{State}
\times \text{Body}
\times \text{Enforcement}
\times \text{Surface}
\]

这是一组设计审查的五个必填项，不用于评分。

### 1. 谁控制下一步

答案通常无法简化成“模型”或“代码”二选一，需要画出局部控制权地图。

- TaxHacker：代码固定 `document → candidate → form → save`，模型只做一次类型化转换；
- n8n：Workflow graph 决定全局节点，模型只在 Agent island 内选择工具；
- TradingAgents：LangGraph 固定 analyst、debate、manager、risk 与 END，只有 analyst 内部有 tool loop；
- Pi、Claude Code、Codex、OpenHands：下一步确实依赖上一次 observation，模型在 loop 内拥有局部选择权。

[TaxHacker 的 bounded AI](/zh/ai-agent/posts/agent-system-design-taxhacker/) · [n8n 的确定性外骨骼](/zh/ai-agent/posts/agent-system-design-n8n/) · [TradingAgents 的真实图](/zh/ai-agent/posts/agent-system-design-tradingagents/)

一个实用判断是：

> 能预写的状态转移交给代码；只有依赖开放环境观察、无法枚举的下一步才交给模型。

反例也很重要。TaxHacker 的 `1309.00 → 13090` 可以通过 JSON/Zod shape，说明确定性外骨骼不会自动带来语义正确；但这个风险应增加 field provenance、算术规则与人审，不必先增加 planner、memory 和 tool loop。

### 2. 状态在哪里

“唯一事实源”在 Agent 系统里往往是危险缩写。十个案例更支持一个 **authoritative state bundle**：

| 状态 | 典型所有者 | 能回答 | 不能回答 |
|---|---|---|---|
| Candidate / record | TaxHacker form 与 Transaction | 应用内部提交了什么 | 原始单据、银行或税务事实 |
| Workflow execution | n8n Postgres | 节点执行与恢复状态 | 第三方 node 是否已提交 |
| Session / transcript | Pi JSONL、OpenClaw session | Agent 记得什么 | working tree、channel 与 API 世界 |
| Event + base state | OpenHands Conversation | 内部轨迹、active branch、run state | workspace 与外部 mutation |
| Artifact + checkpoint | OpenMontage | 阶段工件与批准进度 | provider 收费、版权与平台发布 |
| Computer filesystem | Manus VM / Cloud Computer | 文件、进程与环境连续性 | 网站/API 副作用回滚 |

[OpenHands 的四种状态](/zh/ai-agent/posts/agent-system-design-openhands/)给出了最清楚的反例：immutable event tree、会覆盖的 `base_state.json`、不持久化的 active View、独立可变的 workspace 与外部服务同时存在。把其中任何一个画成统摄一切的 database，都会丢失恢复边界。

所以架构文档不该只写 `Source of Truth: X`，而应写：

```yaml
authoritative_bundle:
  - owner: conversation
    state: event_tree + base_state
  - owner: workspace
    state: files + processes + git
  - owner: external_provider
    state: mutation + receipt
commit_pointer:
  internal: action_id
  external: provider_operation_id
unknown_owner: human_reconciliation_queue
```

### 3. 使用什么执行身体

模型不能改变世界，身体才能。

- bounded function 的身体是一次函数调用；
- n8n 的身体是 workflow node 与 worker；
- Pi、Claude Code、Codex 的身体是 shell、文件工具、sandbox/worktree；
- OpenHands 通过 Workspace abstraction 在 local process 与 remote Agent Server 之间切换；
- Manus 把身体扩张为 per-task computer、browser 与长期 Cloud Computer；
- OpenClaw 再把手机、浏览器和 paired node 变成常驻 Gateway 的外设。

[Manus：给 Agent 一台电脑](/zh/ai-agent/posts/agent-system-design-manus/)说明完整计算机为何能把回复变成工件；它同时也说明，VM recycle、tab close 和 session clear 不会撤销外部系统已经接受的变化。

身体越完整，错误成本越接近用户本人。

### 4. 哪一层能强制

影响模型与阻断动作是两件事。

```text
instructions / memory / skills
  → 影响模型想做什么

schema / graph / hook / permission / approval
  → 决定提议能否继续

sandbox / OS user / credential scope / RBAC
  → 决定真实 blast radius

idempotency / target query / compensation
  → 决定失败后能否安全恢复
```

[Claude Code](/zh/ai-agent/posts/agent-system-design-claude-code/)把 context、Hook、permission、sandbox、worktree、Git/CI 放在不同层；[Pi](/zh/ai-agent/posts/agent-system-design-pi/)则反向证明 Project Trust 只管启动资源加载，Bash 与 extension 仍继承宿主用户权限；[OpenClaw](/zh/ai-agent/posts/agent-system-design-openclaw/)又证明 session key 是 routing selector，不是 tenant authorization。

permission、approval、sandbox、identity 与 idempotency 保护的对象不同。把它们统称“安全层”，会让最危险的空隙消失在名词里。

### 5. 人从哪里协作

Surface 不是 Agent 的皮肤，它重排了谁可以提出、批准、观察、接管与验收。

- CLI/IDE 把 steer、interrupt、diff review 放在仓库旁边；
- n8n Canvas 与 Executions UI 把 graph、HITL、retry 和运行记录可视化；
- Agent Canvas 把多个 Agent/backend 与 conversation 放在同一控制面；
- OpenClaw 把 Slack、Telegram、WebChat、Gmail hook 与 device node 放进同一个身份路由；
- Manus 的 Plan、Observe、Take Over 和 artifact review 分散在任务过程；
- TaxHacker 的表单把“模型候选”与“用户提交”分成两个状态。

同一个 core 经过不同 Surface，可能变成开发工具、远程 API、自动化平台或常驻个人 Gateway。[Codex 的多 Surface 控制面](/zh/ai-agent/posts/agent-system-design-codex/)最清楚地说明：Surface 可以投影协议、承接批准，却不是第二个 Agent。

## 五层行动权：从提议到业务关闭

五个形态轴描述系统；一次具体动作还需要另一条关闭协议：

```text
proposal
  → authorization
  → execution
  → evidence
  → closure
```

| 层 | 问题 | 应由谁拥有 |
|---|---|---|
| Proposal | 下一步建议是什么 | 模型、规则或人 |
| Authorization | 这一步能不能做 | 确定性 policy、RBAC、审批人 |
| Execution | 以谁的身份、在哪里改变世界 | runtime、workspace、credential owner |
| Evidence | 世界是否真的改变 | provider receipt、目标查询、artifact、Observation |
| Closure | 结果是否可采用、任务能否关闭 | 领域 validator、CI/review、业务 owner |

模型可以同时对五层发表意见，但不能靠语言获得五层所有权。

### 最危险的状态叫 unknown outcome

[OpenHands](/zh/ai-agent/posts/agent-system-design-openhands/)存在一条固定源码可达路径：

```text
ActionEvent 已追加
  → 外部 mutation 成功
  → ObservationEvent 追加前崩溃
  → restore 发现 unmatched action
  → 下一次 step 优先重新执行
  → 重复副作用
```

[n8n](/zh/ai-agent/posts/agent-system-design-n8n/)的 queue recovery 选择把失联 execution 标为 crashed，而不是假装能从 Redis/Postgres 判断第三方写入；[OpenMontage](/zh/ai-agent/posts/agent-system-design-openmontage/)的孤儿媒体文件也说明 checkpoint 不知道付费 provider job 是否已完成。

这三个形态完全不同，却碰到同一条分布式系统边界：

> **event ID、queue job ID、checkpoint ID 和短期 dedupe 都不是业务幂等。**

幂等必须由最靠近 mutation、且能查询真实目标状态的 adapter/provider 拥有。恢复时先对账，再决定补写 evidence、retry 或 compensation；不能让 Agent 根据 transcript 猜世界。

## 六种最小成立形态

这些形态可以嵌套，也可以只采用一部分。分类依据是当前讨论的所有权，不是给项目贴唯一标签。

### 1. Bounded function

**成立条件：** 不确定性可以压缩成一次 `input → typed candidate`；应用拥有顺序、校验、commit 和 canonical record。

**正例：** TaxHacker 把 LLM 限制在 document extraction，用户显式 save 才生成内部 Transaction。

**反例：** schema-valid 不等于 semantic-valid；缺 field provenance、算术和 source-span validator 时，数值错误仍可通过。

**停止扩张：** 若一次转换已足够，不要为了“Agent 化”引入 planner、tool loop、memory 和多 Agent。

### 2. Deterministic workflow

**成立条件：** 全局步骤、状态转移和交接契约可以预先描述；模型只处理局部不确定节点。

**正例：** n8n 的 Workflow graph 包住 Tools Agent island；OpenMontage 的 stage/manifest/checkpoint 是另一种 artifact workflow。

**反例：** graph 确定不代表外部 node 确定；queue mode 与 checkpoint 都不能提供第三方 exactly-once。

**停止扩张：** 当下一步确实必须依据开放环境 observation 才能决定，继续枚举 graph 分支会比一个受控 loop 更脆。

### 3. Model-led harness

**成立条件：** 下一动作依赖上一步工具观察，任务环境可以由有限工具集操作。

**正例：** Pi 证明 provider stream、messages/tools、validation、feedback、events 与 abort 已构成最小 kernel；Claude Code 与 Codex 再加 permission、sandbox、protocol 和多 Surface 控制。

**反例：** Pi 无内建 sandbox 与统一 evaluator，session tree 也不回滚 working tree；“最小成立”不是“生产完备”。

**停止扩张：** host 已能承担工具、状态、隔离和验收时，不必先造远程 event platform。

### 4. Event platform

**成立条件：** Agent step 可以无状态；长任务 lifecycle、typed history、分支、pause/resume 与 remote sync 归外部持久层。

**正例：** OpenHands 的 Conversation、event tree、base state 与 derived View。

**反例：** Codex 的 EventMsg channel、OpenClaw 不 replay 的 WebSocket events、Pi 的 JSONL session 都有“事件”，却不能仅凭协议形态称 durable event platform；OpenHands 自身也不能事务性恢复 workspace/API。

**停止扩张：** 任务不跨进程、不跨小时、不需要 resume/fork/multi-surface 时，普通 session persistence 可能已经足够。

### 5. Gateway / cloud computer

这其实是两个经常被“超级 Agent”叙事混在一起的轴。

**Gateway 成立条件：** 价值依赖跨 channel/account/device 的身份连续性。OpenClaw 让 binding、session key 与 capability 先于 model loop。

**Computer 成立条件：** 价值依赖 browser、GUI、长期进程、文件系统和完整软件环境。Manus 提供 task VM、Cloud Computer 与不同 browser identity 路径。

**反例：** routing identity 不是 tenant authorization；machine persistence 也不是外部 effect rollback。

**停止扩张：** 单用户、单入口、短任务若只需 shell/tools，不需要常驻 Gateway 或一台完整远程电脑。

### 6. Vertical organization

**成立条件：** 领域子问题拥有独立输入、独立写集、不同专业工具与明确 join；领域 artifact 和验收标准比通用回复更重要。

**正例：** OpenMontage 把创作分成 script、storyboard、assets、edit、compose 与 publish artifacts；TradingAgents 把分析、辩论、风险与 manager 决策写成领域 state graph。

**反例：** TradingAgents 的多个角色共享模型、reports 与 prompt family；OpenMontage 的 same-agent reviewer 也不是独立 evaluator。角色数量不是证据样本量。

**停止扩张：** 子 Agent 不能获得独立信息或隔离执行面时，保留单 Agent + 好工具。

## 一棵可执行的形态决策树

```text
Q1 任务能否写成一次 typed transform？
├─ 能 → bounded function
└─ 不能
   Q2 全局状态转移能否由代码画成 graph？
   ├─ 能 → deterministic workflow
   │       只把真正不确定的节点做成 Agent island
   └─ 不能
      Q3 下一步是否必须依据 tool observation 动态选择？
      ├─ 否 → 回退普通应用 / workflow
      └─ 是 → model-led harness
         Q4 是否需要跨崩溃、跨小时、fork/resume、多 Surface？
         ├─ 是 → event-backed runtime
         └─ 否 → session persistence

         Q5 连续性来自哪里？
         ├─ channel/account/device identity → gateway
         ├─ browser/files/process/computer → computer runtime
         └─ 都不是 → 保持普通 harness

         Q6 是否存在可隔离输入、写集和 join 的真实子问题？
         ├─ 是 → delegation / vertical organization
         └─ 否 → 单 Agent + 工具
```

每次向下走之前，先问一条反向问题：

> 如果删掉这一层，具体哪一种已经观察到的失败会重新出现？

答不出来，就停止。

## Stop 不是一个布尔值

十个案例最稳定的共同缺口，是把不同的“结束”压成一个 `finished=true`。

| 关闭层 | 它证明什么 | 它不证明什么 |
|---|---|---|
| Turn stop | 模型这轮不再请求工具 | 任务正确 |
| Run stop | runtime/graph 不再调用 step/node | 业务结果可用 |
| Commit stop | candidate 成为 canonical record/artifact | 外部事实正确 |
| Effect closure | 外部写入已确认或已对账 | 结果有价值 |
| Value closure | 测试、review、领域验收通过 | 未来不会变化 |

对应到案例：

- Claude Code、Pi、Codex 的“无 tool call”只是 turn stop；
- OpenHands `FINISHED`、n8n graph terminal、TradingAgents `END` 是 run stop；
- TaxHacker 显式 save、OpenMontage approval checkpoint 才接近 commit stop；
- provider receipt、目标 API 查询与 reconciliation 才能关闭 effect；
- Git diff + tests + CI + review、可观看成片、人工核对原件才接近 value closure。

真正该写进架构文档的问题是：

> 谁能停止模型，谁能停止 runtime，谁能提交事实，谁能关闭副作用，谁能宣布价值交付？

## 当前 Agent 形态正在收敛到哪里

下面是基于十个固定样本的**架构推论**，不是行业统计。

未来更可能普及的形态，是四层组合，而非一个吞下全部所有权的“超级 Agent”：

```text
deterministic spine
  + model-controlled uncertainty islands
  + explicit execution/identity cells
  + evidence and reconciliation plane
```

原因来自十个样本的共同压力：

1. TaxHacker 与 n8n 证明，越多路径能由代码拥有，越容易验证；
2. Pi、Claude Code、Codex 证明，开放仓库任务仍需要 model-led loop；
3. OpenHands 证明，长任务需要把 step 与 lifecycle/state 分开；
4. OpenClaw 与 Manus 证明，身份连续性和执行身体连续性是两条独立产品轴；
5. OpenMontage 与 TradingAgents 证明，垂直价值来自领域 artifact 与验收，不来自角色数量；
6. 所有案例都没有证明一个通用 loop 能单独解决外部副作用 exactly-once。

所以“更 Agentic”的真正含义，不应是模型控制更多步骤，而应是：

> 系统能够在更多不确定任务中工作，同时仍让每个不可逆动作、权威状态与关闭决定保持可追责。

## 一张设计审查表

设计任何新 Agent 之前，先填完这张表：

| 问题 | 必填答案 |
|---|---|
| 用户 job | 最终可采用工件是什么，不是“Agent 会做什么” |
| Uncertainty boundary | 哪些决策无法预写，为什么必须给模型 |
| Next-step owner | 每个状态转移由 code、model 还是 human 决定 |
| Canonical state bundle | record、event、workspace、external state 各由谁拥有 |
| Identity | tenant/account/agent/session/operation 哪些维度进入 key |
| Execution body | function、worker、shell、sandbox、browser 或 computer |
| Policy enforcement | schema、graph、Hook、approval、RBAC、sandbox 分别拦什么 |
| Effect protocol | idempotency key、provider receipt、target query、compensation |
| Unknown outcome | 谁接手，UI 在哪里，什么条件允许 retry |
| Evidence | 哪个独立 oracle 证明动作、工件和业务价值 |
| Stop authority | turn、run、commit、effect、value 五层分别谁关闭 |
| Adoption boundary | 什么任务、数据、租户或错误成本下应停止 Agent 化 |

如果 `unknown outcome`、canonical state 或 value closure 还是空白，系统尚未完成设计。多加一个 Agent、一个 memory store 或一个 dashboard 不会替它们补上答案。

## 结论：自由不是目标，责任闭合才是

这十套系统没有共同证明 Agent 正在变得更自治；它们共同拆掉了“Agent 是一种产品”的幻觉。

TaxHacker 把自由压到一个函数；n8n 把它包在 workflow 岛内；Pi 保留最小 loop；Claude Code 与 Codex 把仓库控制分给 harness 与 Surface；OpenHands 把 step 从长期状态里剥离；OpenClaw 先解决身份路由；Manus 提供完整执行身体；OpenMontage 用工件链组织创作；TradingAgents 用角色图暴露相关性风险。

没有一个是终点。

一个好的 Agent 系统，只在真正不确定的地方借给模型控制权；在其他地方，代码拥有状态转移，策略拥有授权，runtime 拥有执行，外部 receipt 拥有事实，人和领域验证拥有关闭权。

这不是对自治的限制。

这是让自治第一次成为可以承担责任的工程结构。

## 参考资料

- [Claude Code：扩展语义与渐进式控制](/zh/ai-agent/posts/agent-system-design-claude-code/)
- [Pi：最小内核与责任外移](/zh/ai-agent/posts/agent-system-design-pi/)
- [Codex：协议化内核与多 Surface 控制面](/zh/ai-agent/posts/agent-system-design-codex/)
- [Manus：给 Agent 一台电脑](/zh/ai-agent/posts/agent-system-design-manus/)
- [n8n：确定性外骨骼、队列与副作用](/zh/ai-agent/posts/agent-system-design-n8n/)
- [OpenClaw：常驻身份网关](/zh/ai-agent/posts/agent-system-design-openclaw/)
- [TaxHacker：拒绝成为 Agent 的窄 AI](/zh/ai-agent/posts/agent-system-design-taxhacker/)
- [OpenMontage：Instructions as Code 与工件生产线](/zh/ai-agent/posts/agent-system-design-openmontage/)
- [TradingAgents：多 Agent 辩论与相关性风险](/zh/ai-agent/posts/agent-system-design-tradingagents/)
- [OpenHands：无状态 Agent 与事件运行时](/zh/ai-agent/posts/agent-system-design-openhands/)
