---
title: 'Conversation as Database：OpenHands 的无状态 Agent 与事件运行时'
date: 2026-08-07T19:40:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Data Processing
  - Monitoring
  - Security
  - Development
description: >
  以 OpenHands SDK v1.41.0 为样本，沿事件链拆解无状态 step、Conversation 与 local/remote workspace。文章区分 event log、覆盖式 base state、派生 view 和外部世界，并以崩溃路径说明内部可回放为何仍不等于副作用恰好一次。
tldr:
  - OpenHands V1 的 Agent 是 immutable Pydantic 配置加无状态 `step()`；Conversation 才拥有事件、执行状态、workspace、持久化和生命周期。
  - “Conversation as Database”是有用类比，但不是纯事件溯源：事件逐个追加，`base_state.json` 会被覆盖，active view 是派生缓存，workspace 与外部服务更是独立事实源。
  - LocalConversation 与 RemoteConversation 共用 API 和 typed events；前者默认直接接触 host，后者经 HTTP/WebSocket 连接 Agent Server 与隔离 workspace。V1 的隔离是可选部署选择，不是默认保证。
  - ActionEvent 已落盘、外部写入已成功、ObservationEvent 尚未追加时发生崩溃，恢复方无法仅凭日志判断能否重试。append-only 不提供 exactly-once。
  - 最小恢复协议必须加入 operation ID、外部查询、幂等键、结果补录与 unknown 人工队列；否则“可恢复”只恢复了 Agent 的认识，没有恢复世界的一致性。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 10
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/10-openhands/openhands-event-sourced-runtime.svg
  alt: 'OpenHands V1 从无状态 Agent step、追加式 typed event log、base state、派生 view 到 local/remote runtime 与副作用恢复协议的架构图'
---

凌晨两点，Agent 准备给一个 GitHub issue 添加“修复已完成”的标签。

`ActionEvent` 已经写进日志。GitHub API 也返回了 200。就在 SDK 把结果包装成 `ObservationEvent` 之前，进程崩溃。

重启以后，历史里只剩一条没有 observation 的 action。

如果恢复器重放它，issue 可能收到第二次相同写入；如果跳过它，又可能把一次实际失败误判为成功。事件日志准确记录了系统**知道什么**，却没有自动证明外部世界**发生了什么**。

这就是 OpenHands V1 最值得研究、也最容易被“event sourcing”一词遮住的边界：

> **无状态 Agent 与可回放 conversation 能解决内部恢复；跨进程、workspace 和外部服务的副作用一致性，仍必须由另一套协议拥有。**

本文把主研究对象冻结为 [OpenHands Software Agent SDK v1.41.0](https://github.com/OpenHands/software-agent-sdk/releases/tag/v1.41.0)，tag commit [`ca46719d5e9a0b0af79f7de2da37067a5b94563c`](https://github.com/OpenHands/software-agent-sdk/commit/ca46719d5e9a0b0af79f7de2da37067a5b94563c)，发布于 2026-08-06；研究日 `main` 为 [`e8daeed9cb0c8e91c15aa6d534ecb0be1376ffa9`](https://github.com/OpenHands/software-agent-sdk/commit/e8daeed9cb0c8e91c15aa6d534ecb0be1376ffa9)。产品表面另以 [Agent Canvas v1.10.0](https://github.com/OpenHands/OpenHands/releases/tag/v1.10.0) 为准。历史 Docker Runtime 只用来解释 V0，不反向描述 V1 默认行为。

## 图解：无状态 Agent 如何完成长任务

![OpenHands V1 无状态 Agent 与事件运行时](/images/agent-system-series/10-openhands/openhands-event-sourced-runtime.svg)

**阅读指南：** 中间横带是按文件追加的 typed event log：用户消息进入以后，active branch 被投影成只读 view；无状态 Agent step 读取 view，产生 ActionEvent；workspace 或外部服务执行动作，再返回 ObservationEvent。左上角的 `base_state.json` 与事件目录共同组成可恢复 conversation，派生 view 不是事实源。右侧故意把 workspace、外部服务和 crash window 画在 Conversation 边界之外。底部恢复协议说明：内部 replay 之后，还必须查询外部世界，才能决定补录还是重试。

这张图没有把 event log 画成整个系统唯一的数据库，因为源码并不支持这个更强的说法。

## 先拆开三个同名层次

2026 年的 OpenHands 已经不是一个仓库、一条运行路径。

| 层次 | 固定对象 | 主要职责 | 不能据此推断 |
|---|---|---|---|
| Software Agent SDK | `software-agent-sdk` v1.41.0 | Agent、Conversation、typed events、tools、workspace abstraction | 不等于浏览器产品 |
| Agent Server | 同一 monorepo 的 `openhands-agent-server` | 通过 REST/WebSocket 远程运行 conversation 与 workspace | 不自动等于强隔离 |
| Agent Canvas | `OpenHands/OpenHands` v1.10.0 | 管理 OpenHands、Claude Code、Codex、Gemini 与 ACP Agent 的自托管控制面 | 版本号不是 SDK 版本 |
| V0 Docker Runtime | V0 reference 文档 | backend 与容器内 action executor 通过 REST 交换 action/observation | 不是 V1 本地默认 |

[`software-agent-sdk` monorepo](https://github.com/OpenHands/software-agent-sdk/tree/v1.41.0) · [Agent Canvas README v1.10.0](https://github.com/OpenHands/OpenHands/blob/v1.10.0/README.md) · [V0 Runtime Architecture](https://docs.openhands.dev/openhands/usage/architecture/runtime)

V0 把每次工具执行默认送入 Docker 容器。官方 V1 设计文档列出的代价是：Agent 与 sandbox 分属不同进程，状态容易分叉，而且 mandatory sandbox 与 MCP 偏好的本地执行相冲突。V1 因而选择**默认同进程、隔离可选**；需要隔离时，再把同一栈放进容器或远端环境。[OpenHands V1 Design Principles](https://docs.openhands.dev/sdk/arch/design)

这是部署语义变化，不是“安全不重要”。它把决定权交回应用：可信个人开发环境可以选择低摩擦 local path，多租户或不可信代码必须显式选择 remote/container path。

## Agent 无状态，Conversation 有状态

`AgentBase` 是 frozen Pydantic model。它保存 LLM、tools、MCP、prompt、condenser、security analyzer 等配置，却声明 Agent 不应跨 step 持有可变运行状态。[`agent/base.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/agent/base.py)

每次 `step()` 都从 Conversation 取得当前 state：

```text
pending action?
  → 有：执行已确认 action，返回
  → 无：读取 active event view
       → 必要时 condensation
       → 调用 LLM
       → 解析 MessageEvent / ActionEvent
       → 检查确认策略
       → 执行工具并写 ObservationEvent
```

[`agent/agent.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/agent/agent.py) · [Agent architecture](https://docs.openhands.dev/sdk/arch/agent)

因此“无状态”只描述 Agent component，不描述整个应用。真正长期存在的是 Conversation：

- 选择 local 或 remote implementation；
- 拥有 `ConversationState` 与 `EventLog`；
- 维护 run、pause、confirmation、finished、error、stuck 等状态；
- 协调 workspace、persistence、secrets、metrics、callbacks 与 visualizer；
- 把 Agent 的一次 step 放进可暂停、可继续的生命周期。

这个责任划分非常干净：Agent 回答“下一步提出什么”，Conversation 回答“这一步属于哪个任务、能否执行、怎样持久化、何时停止”。

### Delegation 仍是被 Conversation 包住的能力

v1.41.0 已有两类可选 delegation：TaskToolSet 以阻塞方式顺序调用子任务，DelegateTool 可 fan-out/fan-in。每个子 Agent 拥有独立 Conversation，父 Agent 最终接收汇总 Observation。[Task Tool Set](https://docs.openhands.dev/sdk/guides/task-tool-set) · [`openhands-tools/delegate`](https://github.com/OpenHands/software-agent-sdk/tree/v1.41.0/openhands-tools/openhands/tools/delegate)

所以不能因为出现多个 Agent 名称，就把系统描述成长驻多主体网络。它更接近一棵以 tool call 发起、由各自 Conversation 管理状态的任务调用树。并发子任务是否提升正确率，仍需独立 eval。

## Conversation 不是一份 messages 数组

OpenHands 的 event model 把三件经常混在一起的东西拆开：

1. `Event.source`：事件来自 user、agent 还是 environment；
2. LLM `role`：投影给模型时是 system、user、assistant 还是 tool；
3. `parent_id`：事件在 conversation tree 中的父节点。

一个 observation 可以是 `source="environment"`，同时以 `role="tool"` 送给模型；框架合成的反馈也可能来自 environment，却以 user role 进入上下文。若用 LLM role 推断真实作者，审计会直接失真。[Events architecture](https://docs.openhands.dev/sdk/arch/events)

事件本身是 frozen Pydantic models，带 ID、timestamp、source 和 parent。`EventLog.append()` 在文件存储锁内检查重复 ID 和 parent，再把每个事件写成独立 JSON；active branch 则沿 `parent_id` 回溯。旧线性事件没有 parent 时，代码保留前一事件作为兼容父节点。[`event/base.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/event/base.py) · [`conversation/event_store.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/event_store.py)

这比 mutable messages 数组多出四种能力：

- 事件类型与来源可验证；
- history 可以追加而不必整段重写；
- active branch 可以导航、分叉和重建；
- metrics、visualization、stuck detection 等服务可以围绕事件流观察。

但它仍不是纯粹的“event log = 全部真相”。

分支尤其容易制造错觉。`LocalConversation.fork()` 会复制事件和 agent state，却把同一个 workspace 传给新 Conversation；两个逻辑分支仍可能覆盖同一批文件。[`local_conversation.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py) event tree 的分叉不等于 filesystem snapshot，也不是安全隔离。

## 四种状态，四个所有者

### 1. Event log：交互轨迹

`events/event-*.json` 保存消息、action、observation、condensation、pause 与部分 state update。它适合追加、审计和重建 Agent 看到的 active view。

### 2. Base state：可覆盖的运行快照

`base_state.json` 保存 Agent 配置、execution status、statistics、secret metadata、`agent_state` 等字段。公开字段变化时，`ConversationState.__setattr__` 会自动覆盖保存整个 base state。[Persistence guide](https://docs.openhands.dev/sdk/guides/convo-persistence) · [`conversation/state.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/state.py)

所以恢复需要：

```text
conversation = base_state snapshot + append-only events
```

只重放事件不能可靠推出全部运行状态；只读 base state 又没有完整交互轨迹。

官方 persistence guide 把 base-state update 描述为 atomic；固定版本的 `LocalFileStore.write()` 实现却是直接打开目标并覆盖写入，没有 temp file、`fsync` 和 rename 组成的 crash-safe commit 证据。[`io/local.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/io/local.py) 因此本文只把它称作自动覆盖快照，不把文档措辞升级成数据库级原子保证。

### 3. Derived view：当前分支的投影

`ConversationState.view` 是 private、read-only、never persisted 的缓存。普通线性 append 只 replay 新 tail；切换 branch 时才从 `path_to_root(leaf)` rebuild。[`conversation/state.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/state.py)

它是为了给 Agent 高效提供当前上下文，不是新的事实源。view 损坏可以重建，event/base state 损坏则可能改变任务。

### 4. Workspace 与外部服务：世界状态

文件、进程、git working tree、远端 issue、Slack 消息和支付系统都能在 conversation 之外独立变化。SDK 可以把 tool result 记录成 observation，却无法仅凭历史重造那个世界。

这也是“Conversation as Database”类比的正确用法：

> Conversation 是 Agent 控制面的任务数据库，不是所有执行对象的全局数据库。

还有一条不在上述四种核心恢复状态里的旁路：可选 Persistent Memory 使用分层 Markdown `MEMORY.md`，默认关闭，在新会话中重新读取并注入 prompt；它既不由 event log 投影，也不保存在 `base_state.json`。[Persistent Memory](https://docs.openhands.dev/sdk/guides/persistent-memory) 这再次说明“唯一事实源”必须限定在具体作用域。

## Local 与 Remote 共享语义，不共享风险

`Conversation` factory 根据 workspace 类型选择实现：

- string path 或 `LocalWorkspace` → `LocalConversation`，Agent 与 tool 同进程执行；
- `RemoteWorkspace` → `RemoteConversation`，通过 HTTP 发请求、WebSocket 接收 event/state update。

[Conversation architecture](https://docs.openhands.dev/sdk/arch/conversation) · [Workspace architecture](https://docs.openhands.dev/sdk/arch/workspace)

统一 API 的价值很实在：应用可以保留 MessageEvent → ActionEvent → ObservationEvent 语义，再替换执行身体。开发者不必为本地 CLI、远端 Agent Server 和容器部署各写一套 Agent loop。

但“同一 API”不意味着“相同故障模型”：

| 问题 | Local | Remote |
|---|---|---|
| 工具调用 | 进程内函数与本地 subprocess | HTTP 到 Agent Server / remote workspace |
| 事件到达 | 直接 callback | WebSocket，存在断线与重连 |
| host 权限 | 默认可直接触达本机 | 取决于 server 所在机器及容器/VM配置 |
| 失败窗口 | 进程崩溃、工具半完成 | 再加网络超时、响应丢失、租约与服务重启 |
| 隔离 | process-level，不是 sandbox | 可以是 container/VM，但必须实际配置 |

Agent Canvas v1.10.0 的 README 甚至直接警告：无 sandbox 启动 Agent Server 会给予它完整文件系统访问；Docker 方案也只看到显式 mount 的项目目录。[Agent Canvas README v1.10.0](https://github.com/OpenHands/OpenHands/blob/v1.10.0/README.md)

隔离边界是部署事实，不是产品名带来的性质。

远端同步也不是把 WebSocket 当数据库。固定版本的 `RemoteConversation` 先通过 REST 读取事件，随后消费 WebSocket 增量；断线重连后再次 reconcile，并用 event ID 去重客户端视图。[`remote_conversation.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/impl/remote_conversation.py) 这能修补客户端漏收，却不能恢复服务端尚未持久化的事件，更不能确认外部动作是否发生。

## Append-only 无法关闭副作用崩溃窗口

考虑更精确的时序：

```text
T1  Conversation append ActionEvent(action_id=A)
T2  tool 调用外部 API，外部 mutation 成功
T3  进程 / 网络崩溃
T4  ObservationEvent(action_id=A) 尚未 append
```

恢复以后存在三种真相：

- event log：A 被提出，没有结果；
- base state：可能显示 paused、running 或恢复前最后一次 autosave；
- external service：mutation 可能已成功。

SDK 不能从前两项推导第三项。

当前源码对“orphan action”已有防御：pause/interrupt 后可为没有 observation 的 action 写入 synthetic `AgentErrorEvent`，避免 LLM provider 拒绝不完整 tool-call history。它解决的是**对话格式可继续**，不是证明副作用未发生。[`local_conversation.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py)

更危险的是，正常恢复路径并不总会写 synthetic error。`ConversationState.get_unmatched_actions()` 会把没有匹配 Observation 的 Action 当作 pending；`Agent.step()` 在生成新动作之前优先执行 pending action。[`conversation/state.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/state.py) · [`agent/agent.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/agent/agent.py)

因此下面这条路径在固定源码中真实可达：

```text
ActionEvent append
  → 外部 mutation 成功
  → ObservationEvent append 前崩溃
  → restore 得到 unmatched action
  → 下一次 step 优先重新执行
  → 重复副作用
```

同一文件还提供高级 `rerun_actions()`，并明确警告它会重新执行历史 action，可能造成数据修改、文件操作、网络请求等副作用。可重演执行身体与安全恢复不是同义词。

## 一个最小可用的恢复协议

对有外部写入的 tool，至少需要六步：

```yaml
operation_id: conversation_id/action_id
intent_hash: hash(tool_name + canonical_args)
target: github:repo/issue/123
status: proposed | executing | confirmed | failed | unknown
provider_receipt: external request/result id
reconcile_after: timestamp
```

1. **先持久化 intent**：ActionEvent 带稳定 `operation_id` 与规范化参数哈希。
2. **传递幂等键**：外部 API 支持 idempotency key 时，直接使用 operation ID。
3. **保存 provider receipt**：执行成功后先拿到外部 request/result ID，再写 observation。
4. **恢复时先查询**：发现 orphan action，不立即 replay；先按 operation ID、目标状态或 receipt 查询外部系统。
5. **补录或重试**：已发生就补 ObservationEvent；确定未发生才重试；无法判断则进入 `unknown`。
6. **把 unknown 交给人**：不可逆动作不能靠模型猜测完成状态。

如果外部系统既不支持幂等键，也没有可查询结果，那么“自动 exactly-once”本身就是错误需求。可选方案只有：把动作改成可重复的 set-to-state、增加应用侧 outbox/ledger、用补偿动作近似撤销，或要求人工确认。

### 并行 action 让问题更难

v1.41.0 可以接受同一 LLM response 的多条 action；默认 `tool_concurrency_limit=1` 时仍顺序执行，显式提高后 `ParallelToolExecutor` 才并发运行。官方把该能力标为 experimental，并提醒共享文件和外部状态的竞态。[Parallel Tool Execution](https://docs.openhands.dev/sdk/guides/parallel-tool-execution)

事件层用相同 `llm_response_id` 把多个 ActionEvent 投影回一个含多个 tool calls 的 assistant message，但每个 action 的副作用成功与否仍是独立事件。[Parallel execution in `agent.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/agent/agent.py)

因此批次级“全部成功”不是安全默认。恢复 ledger 应逐 action 记录结果，必要时声明依赖顺序；否则 A 成功、B 超时、C 被取消时，整批 replay 会重复 A。

## 安全不应只在 prompt 里

OpenHands V1 有 security analyzer、risk level 与 confirmation policy。高风险 action 可以让 Conversation 进入 `WAITING_FOR_CONFIRMATION`，用户拒绝则生成 `UserRejectObservation`。[Security architecture](https://docs.openhands.dev/sdk/arch/security) · [`security/confirmation_policy.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/security/confirmation_policy.py)

但固定 SDK 的 `ConversationState` 字段默认是 `NeverConfirm()`，`security_analyzer=None`；具体产品 surface 可以覆写，不能把“支持确认”写成“所有调用默认确认”。此外，直接调用 `execute_tool()` 可以绕开 Conversation loop 的确认链。[Security guide](https://docs.openhands.dev/sdk/guides/security)

这是一层有用的 effect proposal gate，但它与 runtime isolation 分属不同层：

```text
model proposes action
  → analyzer classifies
  → policy may request approval
  → workspace/runtime enforces actual OS/network boundary
  → external service enforces its own authorization
```

模型判断风险不能替代容器；容器不能替代 API scope；approval 也不能替代幂等。安全成立，需要每一层都拥有自己能强制的约束。

## 产品架构：数据库语义让多个 surface 共用任务

Software Agent SDK 的用户是 Agent/application builder；Agent Server 的用户是需要远程、多会话运行的团队；Agent Canvas 则把 conversation、backend 与 automation 组织成操作界面，并且能接 OpenHands 之外的 ACP Agent。[Agent Canvas README v1.10.0](https://github.com/OpenHands/OpenHands/blob/v1.10.0/README.md)

这解释了为什么 typed events 与 Conversation API 不只是 SDK 内部整洁：

- CLI、Web UI、automation、remote server 可以围绕同一任务语义协作；
- backend 可以切换，产品 surface 不必拥有 Agent 的私有可变对象；
- event stream 可同时服务 UI 更新、监控、可视化与审计；
- conversation ID 成为跨 session 的稳定任务标识。

产品层最好把交付物分成三级：

1. **执行卷宗**：conversation events、transcript、trajectory export，回答“系统做过什么”；
2. **物质工件**：workspace files、git diff/commit，回答“代码实际变成什么”；
3. **协作验收**：PR、CI、review 与 merge，回答“这次变化是否被团队接受”。

`FINISHED` 只代表运行状态，不证明测试通过、修改正确或适合合并。公开 transcript 也只是事件投影，不是 repo、依赖、容器镜像与外部服务的可复现快照。

但采用边界同样明确：

- 一次性、纯函数式调用不需要完整 Conversation runtime；
- 能写成确定性 workflow 的任务，不该为了“可回放”先引入模型 loop；
- 没有持久化目录时，SDK 会退回 in-memory event store，跨进程恢复并不存在；
- 多租户系统若没有 remote isolation、配额、租约和外部 effect ledger，不能只依赖 SDK 默认；
- 需要历史 A/B 分支却仍共享同一 workspace 时，必须另配 worktree、snapshot 或独立 sandbox；
- 需要数据库级事务、严格顺序消费或 exactly-once 的业务，应把它们交给专门状态系统，而不是期待 Agent event log 顺带提供。

## 怎样验证“可恢复”

不要只做“保存、重启、继续聊天”的 happy-path demo。至少构造以下故障注入：

| 故障点 | 应验证的性质 |
|---|---|
| ActionEvent append 前崩溃 | 不执行、可安全重新规划 |
| action 执行前崩溃 | intent 存在，reconcile 能确认未发生 |
| 外部成功、observation 前崩溃 | 不重复写入，能补录结果或进入 unknown |
| 多 action 批次部分成功 | 每个 action 独立恢复，不整批盲重放 |
| base state 写入与 event append 交错 | status、leaf 与 active view 恢复一致 |
| WebSocket 断线重连 | event 去重、顺序与完整性可证明 |
| workspace 被人工修改 | conversation 不把旧 observation 当成当前世界 |
| secret 无 cipher 持久化 | 恢复后明确失败，不静默使用丢失凭据 |

指标也应分层：

- Agent：任务完成率、工具选择、stuck/iteration stop；
- Conversation：event 完整性、branch rebuild、resume success；
- Runtime：命令失败、资源限制、隔离逃逸；
- Effect：重复率、unknown 比例、reconcile 延迟、人工恢复时间；
- Product：用户是否能看懂当前状态、批准风险动作、拿到可验证工件。

OpenHands 的 event runtime 让这些层终于可以分别测量。它没有替你证明每一层都可靠。

### 停止也属于 Conversation，而不是一句模型文本

Agent 可以输出普通文本或 FinishTool，但 `Conversation.run()` 还会检查 Stop hook、pause、confirmation、stuck detector、error、迭代上限与预算。experimental critic 可为动作或完成质量打分并触发 iterative refinement，却不是独立的全局正确性证明。[Critic](https://docs.openhands.dev/sdk/guides/critic) · [`local_conversation.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py)

一个生产 surface 应把“模型认为完成”“运行循环停止”“外部验收通过”显示为三个状态，而不是压成一个绿色对勾。

## 结论：恢复认识，不等于恢复世界

OpenHands V1 做出的关键分配是：

- 模型拥有下一步提议；
- immutable Agent 配置拥有能力组合；
- Conversation 拥有生命周期与内部任务状态；
- event log 拥有可审计交互轨迹；
- base state 拥有非事件运行快照；
- workspace 拥有可变执行环境；
- runtime 与外部服务拥有真实副作用；
- policy 与人拥有高风险动作的放行权。

“Conversation as Database”因此不是一句把聊天记录包装成数据库的口号。它要求开发者先承认：一个长任务至少同时生活在事件历史、运行快照、派生投影和外部世界四种状态里。

无状态 Agent 让 loop 可以暂停、替换和远程化；追加日志让内部历史可以恢复、分支和审计。它们共同消除了许多隐式状态，却没有消除最危险的未知：

> **一次 action 已经离开 Conversation 边界，但它的 observation 还没有回来。**

生产系统的成熟，不在于假装这个窗口不存在，而在于给它稳定 operation ID、可查询外部证据、明确 unknown 状态和一个愿意接手的责任人。

## 参考资料

- [OpenHands Software Agent SDK v1.41.0](https://github.com/OpenHands/software-agent-sdk/releases/tag/v1.41.0)
- [OpenHands V1 Design Principles](https://docs.openhands.dev/sdk/arch/design)
- [Agent Architecture](https://docs.openhands.dev/sdk/arch/agent)
- [Conversation Architecture](https://docs.openhands.dev/sdk/arch/conversation)
- [Events Architecture](https://docs.openhands.dev/sdk/arch/events)
- [Workspace Architecture](https://docs.openhands.dev/sdk/arch/workspace)
- [Conversation Persistence](https://docs.openhands.dev/sdk/guides/convo-persistence)
- [Persistent Memory](https://docs.openhands.dev/sdk/guides/persistent-memory)
- [Parallel Tool Execution](https://docs.openhands.dev/sdk/guides/parallel-tool-execution)
- [Security Architecture](https://docs.openhands.dev/sdk/arch/security)
- [OpenHands Agent Canvas v1.10.0](https://github.com/OpenHands/OpenHands/releases/tag/v1.10.0)
- [OpenHands V0 Runtime Architecture](https://docs.openhands.dev/openhands/usage/architecture/runtime)
