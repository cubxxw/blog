---
title: 'Codex 的协议化内核：第二个 Surface 不该复制第一个 Agent'
date: 2026-08-07T17:05:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Open Source
  - Development
  - Security
  - MCP
description: >
  以 Codex 0.147.0、App Server 契约和 Rust core 为证据，拆开 Thread、Turn、Item 与 Submission、Event 两层协议。文章解释多种客户端如何共享 Agent loop、状态与治理，并厘清 approval、sandbox、持久化与产品 Surface 的边界。
tldr:
  - Codex 没有把 Agent loop 交给每个客户端重写。`codex-core` 拥有 session、context、tool loop、compaction 与 stop；Surface 主要负责输入、呈现和批准交互。
  - 外部 App Server 以 `Thread → Turn → Item` 提供 JSON-RPC 契约；core 内部则用 `Submission(Op) → Event(EventMsg)` 交换命令与事件。这是两个抽象层，不是一套名词的不同写法。
  - command、event、state、effect 是一套有用的设计分析框架，却不是官方统一术语。协议化的价值，是让新 Surface 复用状态与治理语义，而不直接依赖 loop 内部函数。
  - approval 决定何时暂停以及由谁授权，sandbox 决定命令实际能访问什么；两者正交。批准不是隔离，隔离也不会自动构成批准。
  - 开源证据能证明 CLI、core、SDK 与 App Server 的边界，不能证明 ChatGPT Desktop、IDE 和 Codex Cloud 的完整生产拓扑，更不能把所有内存队列描述为 durable。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 3
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/03-codex/codex-event-control-plane.svg
  alt: 'Codex 多 Surface、App Server 公共契约、Submission 与 Event 双总线以及 approval 和 sandbox 副作用闸门'
---

第二个界面，往往才是一次 Agent 架构审查的开始。

只有 CLI 时，输入框可以直接调用 loop，命令结果可以直接刷进终端，审批状态也可以藏在某个局部变量里。等 IDE 侧栏、桌面端、自动化脚本和第三方客户端陆续出现，同一份内部状态会被复制成四套近似实现：它们对“当前任务是否结束”“这次 patch 属于哪个 turn”“批准以后还受不受 sandbox 限制”给出不同答案。

界面复制容易，**控制语义复制很危险**。

Codex 最值得解剖的地方，不是它有多少入口，而是它试图把 Agent 从入口里拆出来：Rust core 持有 loop 和任务状态；内部用 Submission 与 Event 交换控制；App Server 再把这些内部语义投影成跨语言客户端可消费的 Thread、Turn、Item 与通知。

这不等于“所有 OpenAI 产品都运行同一个开源进程”。可验证的边界更窄，也更有用：一个 coding-agent core 如何允许多个 Surface 共享行为，却不让 UI 直接耦合内部函数。

本文以同日稳定版 **Codex 0.147.0** 为发布锚点。release tag `rust-v0.147.0` 指向 commit `be6e8eac029b183056b7e4402879f15d2c85f61b`，发布于 2026-08-07 01:41:49 UTC。[0.147.0 release](https://github.com/openai/codex/releases/tag/rust-v0.147.0)

研究日 `main` 已前进到 `95c7265e849e6e360a7fa53ffeac70b25d6051a3`。文中若引用该 commit 的新模块，会明确标为 **post-release main**，不把它冒充 0.147.0 已发布行为。

## 先把两层协议拆开

谈 Codex 的“事件架构”时，最容易犯的错误是把两组对象揉成一组：

```text
对外产品协议                         core 内部控制协议

Thread                               Submission
  └─ Turn                              └─ Op
      └─ Item                       Event
                                          └─ EventMsg
```

它们解决的不是同一问题。

### Thread、Turn、Item：给 Surface 的稳定语义

App Server 官方文档把三类核心 primitive 定义得很清楚：

- **Thread**：用户与 Codex Agent 的一段会话；
- **Turn**：一次用户请求以及 Agent 随后的工作；
- **Item**：输入或输出单元，包括用户消息、Agent 消息、命令、文件修改和工具调用。

客户端先完成 `initialize / initialized` 握手，再用 `thread/start` 创建会话；它可以 `thread/resume` 继续、`thread/fork` 分叉，用 `turn/start` 发起工作、`turn/steer` 向正在运行的 turn 追加输入，或用 `turn/interrupt` 请求中断。进度通过 `item/started`、内容 delta、工具事件和 `turn/completed` 等通知向外流动。[Codex App Server](https://learn.chatgpt.com/docs/app-server)

这是一套**面向客户端的生命周期词汇**。IDE 不需要知道 core 的某个 Rust future 如何被 poll，它只需要知道一个 command item 已开始、产生输出、然后完成。

### Submission、Op、EventMsg：给 core 的控制代数

`codex-rs/protocol` 中则定义了另一层类型：

```text
Submission {
  id,
  op: Op,
  ...
}

Event {
  id,
  msg: EventMsg
}
```

`Op` 可以是用户输入、interrupt、thread settings、审批响应、权限响应、动态工具结果或 Agent 间通信；`EventMsg` 可以表达 turn 生命周期、item 流、命令执行、patch、审批请求、计划、diff、压缩、错误和终止。[protocol.rs](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/protocol/src/protocol.rs)

`CodexThread` 是这层双向流的门面：上层调用 `submit(Op)`，再消费 `next_event()`；Submission 和 Event 的 `id` 可以把一次请求与后续事件关联起来。[codex_thread.rs](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/codex_thread.rs)

因此，App Server 不是把内部 enum 原样序列化。它承担的是**协议适配和状态投影**：把 core 事件映射为客户端可理解的 Thread、Turn、Item、response 与 notification。

## 图解：双总线控制平面

![Codex 事件控制平面](/images/agent-system-series/03-codex/codex-event-control-plane.svg)

**阅读指南：** 最上层 Surface 只拥有交互与呈现。紫色 App Server 是公开 JSON-RPC 契约；绿色区域才是 Rust core 内部实现。黄色 Submission Queue 把输入、设置、interrupt 和批准响应送入 session；蓝色 Event Queue 把 item、command、patch 和完成状态送回。最下方红色区域不是第三条消息总线，而是副作用边界：approval 决定何时询问，sandbox 决定实际可达范围，然后 shell、patch、network 或外部工具才真正执行。图中没有画出闭源 Desktop/Cloud 内部节点，因为公开证据不支持那种推断。

这里的“Submission Queue / Event Queue”需要一项限定：它们描述 core 的异步命令—事件关系，**不自动意味着持久化消息队列、跨进程 broker 或 exactly-once delivery**。

App Server 自身使用有界 ingress 与 outbound queue，并在入口饱和时返回 `-32001 Server overloaded; retry later`，要求客户端用带 jitter 的指数退避。可选 `QueueStore` 又依赖实验性 state database；没有数据库时，并不存在同等的 durable queue backend。[App Server README](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/app-server/README.md)

这更接近“把背压做成协议事实”，而不是“把所有状态都放进消息系统”。

## Loop 的所有者是 core，不是 Surface

如果 UI 只是一层壳，真正的 Agent loop 在哪里？

0.147.0 的调用链可以沿 `RegularTask::run → run_turn` 进入 core：

1. 收集本轮初始输入，或吸收运行中追加的 input；
2. 捕获 turn context；
3. 从历史、base instructions、当前工具规格与输出 schema 组装 prompt；
4. 请求模型采样；
5. 处理 assistant item 与 function call；
6. 路由工具、执行副作用并记录 tool output；
7. 若模型需要 follow-up，或队列中还有 pending input，则继续采样；
8. 接近 context limit 时 compact 或 rollover；
9. 无需 follow-up 时运行 stop hooks，结束 turn。

这条循环在 [`regular.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/tasks/regular.rs) 和 [`turn.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/session/turn.rs) 中可直接追踪。

因此，各层的所有权可以更精确地分成：

| 能力 | 主要所有者 | Surface 参与什么 |
|---|---|---|
| Agent loop | core Session / RegularTask / `run_turn` | 发起、steer、interrupt、呈现 |
| Context assembly | core context、history、compaction | 提供用户输入与 per-turn override |
| Tool registry / routing | core tools、handlers、MCP、environment | 提供动态工具或审批响应 |
| Conversation state | ThreadManager、thread store、rollout | 查询、恢复、分叉、归档 |
| Planning | 模型生成，core 记录与流式发送 | 展示 plan item / delta |
| Delegation | core agent control 与 agent graph | 展示父子关系和进度 |
| Evaluation | review、Guardian、hooks、工具反馈等分散机制 | 触发或展示检查 |
| Stop | follow-up、pending input、interrupt、error、token、hook | 用户可请求 interrupt |

最后一行尤其重要：`turn/completed` 只证明运行生命周期结束，不证明仓库修改正确，也不证明用户目标完成。公开源码中没有一个统一、强制、覆盖全部任务的 success oracle。

## 为什么设置也要走 Submission Queue

协议化不是只把用户 prompt 包成 event。真正难的是让**控制状态与工作请求保持顺序**。

core 源码让 `Op::ThreadSettings` 与新 turn 共用 submission queue，注释给出的理由是保持调用顺序，避免 setting update 与 `turn/start` 竞态。[protocol.rs](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/protocol/src/protocol.rs)

反过来想就很清楚：

```text
t0  client: sandbox = workspace-write
t1  client: turn/start

如果设置走旁路：
  runtime 可能先看到 t1，再看到 t0
  → 本轮究竟用旧权限还是新权限？

如果共用有序 submission：
  runtime 按 t0 → t1 观察
  → turn 在确定的配置快照下启动
```

这是一条可以迁移到其他 Agent 系统的设计原则：

> 会改变下一次执行语义的控制命令，不能只写进 UI 本地状态；它必须进入与工作请求可排序的控制协议。

同样的原则适用于 model、cwd、tool exposure、reviewer、network policy 与 instructions。否则第二个 Surface 看到的不是同一个 Agent，只是同一个模型名字。

## App Server 是端口适配器，不是另一个 Agent

App Server 官方定位是为 VS Code extension 等 rich clients 提供 authentication、conversation history、approvals 与 streamed agent events；自动化或 CI 则更适合用 Codex SDK。[Codex App Server](https://learn.chatgpt.com/docs/app-server)

它使用省略线缆上 `jsonrpc: "2.0"` 字段的双向 JSON-RPC 2.0：

- 默认 `stdio` transport 是逐行 JSON；
- Unix socket 使用 WebSocket handshake；
- WebSocket listener 仍是 experimental、unsupported；
- 非本地连接必须考虑 TLS 与认证，不能把裸 `ws://` 暴露到远端。

版本化 TypeScript bindings 与 JSON Schema 可以由对应 Codex binary 生成。这让客户端绑定与服务端版本同源，降低手写类型漂移。[App Server protocol schemas](https://github.com/openai/codex/tree/rust-v0.147.0/codex-rs/app-server-protocol/schema)

这一层的价值有三部分：

1. **语言边界**：Rust core 不要求 IDE 用 Rust；
2. **进程边界**：客户端不必直接链接 session 内部对象；
3. **治理边界**：approval request、权限、历史和事件成为可审查契约。

代价也同样明确。自定义客户端接上 App Server 后，不只是多了一个聊天框。它必须正确处理初始化、过载退避、事件顺序、请求关联、实验字段、批准 UI、client identity 与断线恢复。

协议把 core 的复杂性封装起来，却把**集成责任**公开了。

## 多 Surface 的“共享”不能写过头

官方开源清单显示，Codex CLI、SDK、App Server、skills 与 plugins 可审计；IDE extension 和 Codex cloud 不开源。[Open Source](https://learn.chatgpt.com/docs/open-source)

因此，当前证据只支持下面这些强度不同的判断：

### 可以确认

- `codex-core` 承担业务逻辑并服务不同 UI；
- App Server 依赖 core，为 VS Code 等富客户端提供接口；
- CLI/TUI 可以直接复用 core，也可以成为 App Server client；
- TypeScript SDK 包装同版本 Codex binary，而不是重写 Agent；
- App Server 将 core 状态投影成 Thread、Turn、Item；
- 自定义客户端可以复用 authentication、history、approvals 与 event stream。

### 只能谨慎推断

- “共享 core”降低新客户端复制 loop、状态与治理的成本；
- Rust 的强类型 enum、Tokio channel 和生成式 schema 有利于协议演进与并发边界；
- App Server 更接近 ports-and-adapters 中的 adapter，而不是业务核心。

### 不能从开源仓库推出

- ChatGPT Desktop、IDE 和 Codex Cloud 的完整生产 runtime 都直接调用同一 `codex-core`；
- 云端 scheduler、容器池、租户隔离或 durable queue 与本地 App Server 同构；
- Desktop 产生的文档、表格、图片等工件都属于 Thread/Turn/Item 的同一存储模型；
- 所有 Surface 拥有一致的延迟、可靠性和安全保证。

尤其要注意名称边界。2026-08-07 的官方文档把桌面入口表述为 **ChatGPT desktop app**；它是比 coding agent 更宽的工作台，不能简单改名为“开源 Codex Desktop”。

## Approval 与 Sandbox 是两种不同控制

官方安全文档给出了一条非常适合写进架构评审的区分：

- **sandbox**：这条命令在技术上能接触哪些文件、进程和网络；
- **approval policy**：何时必须停下，由谁决定是否继续。

本地默认通常把命令放进 OS-enforced sandbox，网络默认关闭；在已允许边界内，Agent 可以连续工作。需要越界时，approval flow 才介入。[Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)

于是同一副作用至少可能出现四种状态：

| Approval | Sandbox | 结果 |
|---|---|---|
| 不需要 | 允许 | 自动执行 |
| 需要且拒绝 | 任意 | 不执行 |
| 需要且批准 | 仍受限 | 只在批准后的有效边界内执行 |
| 自动批准 | 仍受限 | review 自动化，不扩大技术权限 |

“用户点了允许”不会神奇地让 OS 失去边界；“进了 sandbox”也不代表组织已经授权这个行为。

反例更能说明入口的重要性。App Server 的 `thread/shellCommand` 面向用户主动触发的 `!` 命令，官方文档明确它以 full access、unsandboxed 方式运行。一个 Thread 配置了 sandbox，不能推出从该 Thread 入口发出的每个宿主命令都受同一 sandbox 约束。[Codex App Server](https://learn.chatgpt.com/docs/app-server)

所以安全评审不能只问“这个 Agent 有没有 sandbox”，还要追踪：

1. 哪个入口创建 effect；
2. 使用哪一份 turn configuration；
3. 谁担任 reviewer；
4. 批准是否改变 sandbox policy；
5. 最终执行器在哪个 OS 或环境边界内。

## State 不是一张聊天记录

Thread、Turn、Item 为客户端提供了稳定阅读模型，core 内部的恢复却不只保存最终 assistant 文本。

公开源码出现了 thread store、rollout reconstruction、turn state、diff tracker、thread truncation 与可选 state database。它们共同说明：

- 流式展示状态与可恢复历史不是同一个对象；
- 工作区 diff 与对话 transcript 需要分别追踪；
- fork 正在运行的 thread 时，部分 turn 不能被伪装成完整历史；
- ephemeral thread 可以只在内存中，不能笼统地说所有 Item 都 durable；
- archive 与 delete 具有不同恢复性质。

`ThreadManager` 创建并维护多个 thread；fork 前会刷新排队中的 rollout update，再生成快照。若源 thread 正处于未完成 turn，fork 会记录与 interrupt 同类的中断边界，避免新 thread 把部分输出当作完整结果。[thread_manager.rs](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/thread_manager.rs)

仍然不能下的结论是：rollout 文件、SQLite projection 与 state database 在所有部署中共享一套唯一权威规则。公开材料没有给出这种统一存储契约。

## 协议化之后，产品差异去了哪里

共享 core 不会消灭 Surface 差异，只会把它们放回正确位置。

| Surface | 擅长的用户任务 | 主要工件 | 它必须拥有的产品责任 |
|---|---|---|---|
| CLI / TUI | 本地仓库、终端工具链、连续 steer | 文件修改、命令输出、diff | 紧凑呈现、权限反馈、终端恢复 |
| IDE extension | selection、symbol、打开文件附近的修改 | 原位 diff、聚焦编辑 | 编辑器上下文、定位、变更审阅 |
| SDK | CI、内部工具、服务端自动化 | final response、事件、本地副作用 | 生命周期、日志、错误与重试 |
| App Server client | 深度定制的富客户端 | Thread/Turn/Item 事件流 | 鉴权、批准 UX、关联、兼容与过载 |
| Codex cloud | 隔离后台任务、并行委派 | summary、diff、可选 PR | 环境配置、review point、云治理 |
| ChatGPT Desktop | 跨项目和多类型工件的通用工作台 | 文档、表格、图片、代码等 | 项目、文件、应用与权限的更宽交互 |

Codex SDK 文档还给出了一个有用的品类分界：如果核心任务是一条 coding-focused thread，使用 Codex SDK；如果 Codex 只是更大编排中的一个 specialist，则把 Codex CLI 暴露为 MCP server，再由 Agents SDK 编排。[Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)

这避免让每个层次都膨胀成“通用多 Agent 平台”。core 专注 coding loop，App Server 专注 rich-client contract，SDK 专注程序化调用，更广的 orchestration 交给相邻系统。

## 一个最小 Agent 事件协议应该有哪些东西

Codex 的具体类型很多，但设计新系统时不必照抄整个 schema。可以先保留五组最小契约：

### 1. Command

```text
initialize
thread.start | resume | fork
turn.start | steer | interrupt
approval.respond
```

每个 command 至少要有 request id、thread id、可选 turn id、client metadata 与配置版本。

### 2. Event

```text
turn.started
item.started
item.delta
item.completed
approval.requested
turn.completed | failed | interrupted
```

delta 是呈现优化，completed item 才是可重建语义的候选。不要默认每个 progress event 都持久化。

### 3. State projection

客户端需要可以重新读取：

- thread 当前状态；
- turn 列表与完成状态；
- item 的最终形态；
- 当前配置与有效权限；
- token、diff 或其他必要派生信息。

如果断线后只能继续等事件，协议还没有恢复能力。

### 4. Effect round-trip

```text
core:  request(command, cwd, diff, reason)
client/reviewer: allow | deny | modify
executor: run under effective sandbox
core:  emit result
```

批准响应必须与原请求相关联；执行器必须读取**有效权限快照**，而不是相信 UI 显示过什么。

### 5. Backpressure 与版本

- 有界队列；
- 明确 overload error；
- 客户端退避与 jitter；
- schema/version negotiation；
- experimental 字段隔离；
- 至少一次重连后的 state re-read。

协议若不描述拥塞和版本，就只在 demo 的正常路径上存在。

## “Agent 操作系统”类比哪里成立

把 Codex 称为 Agent OS，有一部分是准确的：

- core 调度 turn 与 tool effect；
- protocol 把输入和事件变成控制面；
- thread store 承担任务生命周期状态；
- permission、approval、sandbox 管理能力边界；
- App Server 允许不同 Surface 成为客户端。

但类比到这里就应该停止。

开源 Codex 没有因此变成通用资源调度 OS，也不能证明它拥有云端多租户、跨主机容错、统一 durable log 或任意 Agent workload 的稳定 ABI。更准确的名称是：

> 一个协议化的 coding-agent runtime，以及围绕它建立的多 Surface 控制面。

它的设计价值不在“像操作系统”这句口号，而在四次责任分配：

1. 模型提出下一步，core 拥有 loop；
2. core 产生状态与事件，App Server 拥有跨进程契约；
3. Surface 拥有交互、批准呈现和工件检查；
4. host policy 与 OS sandbox 约束真正副作用。

第二个 Surface 到来时，这四条边界仍能成立，系统才没有复制出第二个 Agent。

## 边界清单

### 已确认

- 0.147.0 的 core、protocol 与 App Server 存在清晰模块边界；
- `run_turn` 在 core 内完成模型—工具循环；
- `Submission(Op)` 与 `Event(EventMsg)` 构成内部双向控制；
- App Server 对外使用 Thread、Turn、Item 与双向 JSON-RPC；
- App Server 有有界队列、overload error 与版本化 schema；
- approval 与 sandbox 是不同机制；
- CLI、SDK 与富客户端可以在不同集成深度复用同一 runtime 语义。

### 设计推论

- Rust + typed enums + generated bindings 有助于收敛多 Surface 协议漂移；
- 共享 core 把安全语义从 UI 私有状态提升为宿主契约；
- command、event、state、effect 是比“聊天消息”更完整的 Agent 客户端模型。

### 仍未知

- 闭源 Desktop、IDE、Cloud 的完整运行拓扑；
- 所有部署中的权威持久化源与恢复保证；
- WebSocket 何时达到 production maturity；
- 跨 Surface 的 delivery、latency、approval accuracy 与成功率 SLO；
- 是否会出现覆盖所有任务的统一 evaluator。

## 参考资料

- [OpenAI Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [OpenAI Codex Sandbox](https://learn.chatgpt.com/docs/sandboxing)
- [OpenAI Codex Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)
- [OpenAI Codex Open Source](https://learn.chatgpt.com/docs/open-source)
- [OpenAI Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI Codex Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)
- [openai/codex 0.147.0](https://github.com/openai/codex/releases/tag/rust-v0.147.0)
- [codex-core README](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/README.md)
- [App Server README](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/app-server/README.md)
- [Core protocol](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/protocol/src/protocol.rs)
- [Core regular task](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/tasks/regular.rs)
- [Core turn loop](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/session/turn.rs)
- [CodexThread](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/codex_thread.rs)
- [ThreadManager](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/thread_manager.rs)
- [App Server protocol schemas](https://github.com/openai/codex/tree/rust-v0.147.0/codex-rs/app-server-protocol/schema)
