---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-codex
title: Codex 的协议化内核：如何把 Agent 从界面里拆出来
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:43:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

Codex 最值得研究的是 Agent engine 与产品 surface 的协议化分离：Submission/Event queues、Session/Task/Turn、Ops/Events、App Server，以及 approval 与 sandbox 的不同职责。文章要回答：一个 core 如何同时服务 CLI、IDE、Desktop 等界面，而不在每个客户端复制状态和治理逻辑。

## 为什么值得由我写

作者已有公开 Harness 全景文章，但尚未把“多界面共享同一 Agent 内核”作为独立系统设计问题展开。本篇从协议、状态和信任边界进入，能与 Claude Code 的扩展语义、OpenHands 的事件状态模型形成清晰对照。

## 目标读者与阅读场景

读者正在把 Agent 从 CLI 扩展到 Web、IDE 或桌面端，或者 UI 已经直接依赖内部 loop。读完后能设计最小双向事件协议，区分 command、event、snapshot、approval 和 effect，并知道哪些能力需要独立信任边界。

## 编辑选择

- 文章轨道：`research`
- 已选形态：双总线控制平面的源码与协议解剖
- 核心张力：多 surface 要共享能力，但不能共享未经定义的内部状态
- 这次主动不讲：Codex 使用教程、模型比较、桌面端功能宣传
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `3` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief`、`openai-docs` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 允许引用公开 Agent Harness 总纲作为概念入口；Codex 当前事实必须由官方文档和 `openai/codex` 仓库核验。
- 本轮允许公开的作者要求：解释技术架构、产品架构、Agent 架构、语言选择与边界判断。

### 作者原话与在场片段

- 不补写未提供的 Codex 内部开发经历。

### 作者观察

- 当 UI 直接调用 Agent 内部函数时，第二个客户端通常会复制权限、状态与恢复逻辑；协议化能把这种复制变成显式契约。

### 待验证推论

- Codex 的审美可以描述为“Agent 操作系统或控制平面”；必须说明类比的适用范围，不能把产品生态夸成通用 OS。

## 参考方向

- 从 [openai/codex](https://github.com/openai/codex)、[core protocol](https://github.com/openai/codex/blob/main/codex-rs/docs/protocol_v1.md)、[App Server](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md) 和 OpenAI 当前官方 Codex 文档起步。
- 固定 commit，区分稳定公共协议、内部事件和仍在演进的接口。
- 核验 Rust core 的实际边界；关于 Rust 的可靠性、分发和并发优势若无官方选型说明，必须标为设计推论。
- 分开描述本地命令 sandbox、MCP/connectors/browser/cloud 等能力平面。

## 图示任务

回答“一个 core 怎样服务多个 surface”。使用 Submission Queue 与 Event Queue 两条平行总线，中间放 Session/Task/Turn engine，在 effect 前放 approval/sandbox 闸门；不要暗示所有 event 都是稳定公开协议。输出 `03-codex/codex-event-control-plane` 三种格式。

## 证据与隐私边界

- 可以公开：OpenAI 官方资料、公开仓库、协议与源码观察。
- 必须匿名：无需使用用户任务内容。
- 禁止使用：本地 Codex 私有任务、账号信息、密钥、未公开产品行为。
- 发布前仍需作者确认：“操作系统”类比、Rust 选型推论、最终产品评价。

## 不要写成

不要写成 Claude Code 对比评测或 UI 功能清单。不要把 approval 写成 sandbox 的替代品，也不要暗示多 Agent 自动解决共享工作区的写冲突。

## 验收标准

- [ ] command/event/state/effect 四类概念清楚
- [ ] core、App Server 与 surface 的所有权边界可复述
- [ ] stable protocol 与内部实现未混写
- [ ] 读者能据此设计一个最小 Agent 事件协议
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-codex.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 无 source_refs；三路独立研究冻结 Codex 0.147.0，并用 OpenAI 官方 App Server / Security 文档与 openai/codex 的 core、protocol、app-server 一手源码交叉核验；同日 post-release main 另行标记
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: 文章把外部 Thread/Turn/Item 与内部 Submission/Event 分成两层，主动排除闭源 Desktop/Cloud 拓扑、所有队列 durable、approval 等于 sandbox 等过度推断

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：Codex `rust-v0.147.0`，tag commit `be6e8eac029b183056b7e4402879f15d2c85f61b`，Apache-2.0，Rust/Tokio 为主体。研究日 main 为 `95c7265e849e6e360a7fa53ffeac70b25d6051a3`，晚于稳定版；文章不把 post-release main 自动写成 0.147.0 行为。
- 三路独立研究：
  - Agent 架构：`RegularTask::run → run_turn` 证明 loop、context assembly、tool follow-up、compaction 与 stop 属于 core；Surface 负责输入、呈现、steer、interrupt 与批准交互，没有发现覆盖全部任务的统一 success oracle。
  - 系统架构：core 内部以 `Submission(Op)` / `Event(EventMsg)` 双向交换，App Server 再投影为 Thread/Turn/Item JSON-RPC；有界 queue、overload error 与可选 QueueStore 不构成统一 durable/exactly-once 承诺。
  - 产品架构：CLI、IDE、SDK、App Server client 与 Cloud 面向不同任务和工件；可证的共享范围止于开源 core/protocol/adapter，不能反推 ChatGPT Desktop、IDE 或 Cloud 的完整生产拓扑。
- 保留的一手来源：
  - [Codex 0.147.0](https://github.com/openai/codex/releases/tag/rust-v0.147.0) 与 [release 源码](https://github.com/openai/codex/tree/rust-v0.147.0) → 发布版本、许可、crate 边界；不能证明更晚 main 或闭源产品行为。
  - [Codex App Server](https://learn.chatgpt.com/docs/app-server) 与 [App Server README](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/app-server/README.md) → rich-client 定位、Thread/Turn/Item、JSON-RPC、transport、backpressure；不能证明 WebSocket 已适合生产或所有 Surface 都经同一传输。
  - [`protocol.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/protocol/src/protocol.rs) 与 [`codex_thread.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/codex_thread.rs) → Submission/Op、Event/EventMsg 与双向 conduit；不能证明 channel durable、全局公平或 exactly-once。
  - [`regular.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/tasks/regular.rs) 与 [`turn.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/session/turn.rs) → 模型采样、tool feedback、pending input、compaction 与 stop loop；不能证明 turn 完成等于任务正确。
  - [`thread_manager.rs`](https://github.com/openai/codex/blob/rust-v0.147.0/codex-rs/core/src/thread_manager.rs) → thread lifecycle、fork snapshot 与恢复线索；不能证明 rollout、SQLite 与 state DB 在所有部署中的权威关系。
  - [Sandbox](https://learn.chatgpt.com/docs/sandboxing) 与 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security) → sandbox 是技术边界、approval 是决策策略；不能证明所有入口或 OS 后端完全等价。
  - [Open Source](https://learn.chatgpt.com/docs/open-source) → CLI、SDK、App Server 等开放边界及 IDE/Cloud 非开源；不能据此审计闭源产品内部。
- 图示问题：一个 core 怎样服务多个 Surface。
- 图示交付：
  - `assets/diagrams/agent-system-series/03-codex/codex-event-control-plane.excalidraw`
  - `static/images/agent-system-series/03-codex/codex-event-control-plane.svg`
  - `static/images/agent-system-series/03-codex/codex-event-control-plane.png`
- 最强边界：App Server 是协议适配层，不是第二个 Agent；CLI 也不必经外部 JSON-RPC。共享 core 的证据不能外推到 ChatGPT Desktop、IDE 与 Cloud 的全部生产实现。
- 证据缺口：跨 Surface delivery guarantee、队列 durability、rollout/SQLite/state DB 权威关系、长期 memory 算法、统一 evaluator、各 OS sandbox 等价性与生产 SLO 均未形成公开稳定契约。
- 未决作者判断：“Agent 操作系统”类比只保留控制面语义；Rust 选型动机、最终产品评价、标题和发布决定仍由作者确认。
