---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-openhands
title: Conversation as Database：OpenHands 的无状态 Agent 与事件运行时
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:50:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

OpenHands 把 Agent step 做成无状态计算，把不可变 typed event log 和 conversation state 作为长期任务的事实基础。文章要回答：长任务怎样可回放、可恢复，并让 local 与 remote runtime 使用同一语义，同时不重复已经发生的外部副作用。

## 为什么值得由我写

Codex 个案关注多 surface 的双向控制协议；OpenHands 的独立价值是 conversation/event 如何成为 SDK 与平台的状态核心。它能把“聊天记录”从 UI 数据提升为事件溯源、reducer、workspace 和 runtime 的系统设计问题。

## 目标读者与阅读场景

读者正在构建长任务 Agent SDK 或远程执行平台，状态散落在 messages、对象字段和 runtime。读完后能定义 event schema、projection/reducer、agent step 与 action/observation 关系，并理解 append-only log 对恢复有何帮助、对外部副作用又解决不了什么。

## 编辑选择

- 文章轨道：`research`
- 已选形态：沿一条 append-only event ribbon 解释运行时
- 核心张力：内部状态可以重放，外部世界的写入不能靠重放自动撤销
- 这次主动不讲：OpenHands 安装、coding benchmark、Codex 功能比较
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `10` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 对象限定为当前 OpenHands SDK/platform 官方文档与公开仓库，必须固定版本或 commit。
- 本轮允许公开的作者要求：区分 Agent、系统和产品架构，解释框架/语言选择、边界与生态关联。

### 作者原话与在场片段

- 不补写未提供的 OpenHands 生产使用经历。

### 作者观察

- 如果 conversation 只是可变 messages 数组，崩溃恢复、审计和多个 runtime 之间的状态一致性很快会变成隐式约定。

### 待验证推论

- OpenHands 的核心审美可概括为“无状态 step + conversation as database”；需要核验 V1 文档、当前代码和 V0 历史边界。

## 参考方向

- 从 [Design](https://docs.openhands.dev/sdk/arch/design)、[Agent](https://docs.openhands.dev/sdk/arch/agent)、[Conversation](https://docs.openhands.dev/sdk/arch/conversation)、[Events](https://docs.openhands.dev/sdk/arch/events)、[Runtime](https://docs.openhands.dev/openhands/usage/architecture/runtime) 起步。
- 区分 authoritative event log、derived state、workspace、services 和 runtime。
- 检查 V1 optional isolation 与历史 V0 Docker 模式，避免把旧架构写成当前默认。
- 语言和 Pydantic/immutable component 选择只能引用明确设计原则或标记类型安全、序列化和远程 API 推论。

## 图示任务

回答“无状态 Agent 如何完成长任务”。用横向 append-only event ribbon：user event → projected state → stateless step → action event → runtime/service → observation event → projection；标出 event log/derived view 和 conversation/runtime 边界。输出 `10-openhands/openhands-event-sourced-runtime` 三种格式。

## 证据与隐私边界

- 可以公开：官方文档、公开源码、版本差异和架构推论。
- 必须匿名：无需使用真实用户 conversation。
- 禁止使用：私有任务记录、凭据、把 self-reported risk 当作硬安全策略。
- 发布前仍需作者确认：Conversation as Database 类比、版本取舍和最终建议。

## 不要写成

不要把 append-only log 写成副作用回滚器，也不要把 derived conversation view 画成事实源。不要混写 V0/V1 或把 optional isolation 当默认强隔离。

## 验收标准

- [ ] event、projection、state、step、runtime 的所有权清楚
- [ ] 回放内部状态与重放外部动作的风险明确分离
- [ ] V0/V1 和当前版本没有混淆
- [ ] 读者能据此写出最小恢复协议
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-openhands.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 三路独立研究冻结 Software Agent SDK v1.41.0、Agent Canvas v1.10.0 与 docs 9a171cf，核验无状态 step、Conversation loop、event tree/base state/view、local/remote 协议、workspace/隔离、delegation/eval/stop、恢复与副作用崩溃窗口
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: “Conversation as Database”被收窄为 execution dossier/control record；事件日志、base state、workspace、Persistent Memory 和外部服务分别拥有不同事实，append-only 不被写成事务或 exactly-once 保证

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：
  - OpenHands Software Agent SDK 正式 release `v1.41.0`，tag commit `ca46719d5e9a0b0af79f7de2da37067a5b94563c`，发布于 2026-08-06；研究日 `main` 为 `e8daeed9cb0c8e91c15aa6d534ecb0be1376ffa9`。
  - 产品控制面 Agent Canvas 正式 release `v1.10.0`，commit `56638693908b8ac83a2fa3bde6eb6c33aae37f4b`，发布于 2026-08-05；研究日 `main` 为 `c3d7077271fd42c904420e94b601496934626abf`。
  - 官方文档固定 `OpenHands/docs@9a171cf17cdd51844d8c8f1a446123270a910537`，2026-08-05；V0 Docker Runtime 只作为历史边界，不描述 V1 SDK 默认。
- 三路独立研究：
  - Agent 架构：`Agent.step()` 读取 active event view 做一次推理—行动计算；`Conversation.run()` 才拥有重复调用、pause/confirmation、预算、stuck、error 与完成。上下文还经过 condenser、event→LLM projection、AgentContext/skills；TaskToolSet/DelegateTool 是可选 delegation，每个子 Agent 有独立 Conversation。
  - 系统架构：event files 保存 immutable typed event tree，`base_state.json` 覆盖保存 status/stats/agent config/agent_state/leaf，`View` 是不持久化的 active-branch 投影；LocalConversation 同进程，RemoteConversation 通过 REST + WebSocket 同步并在重连后 reconcile。workspace、Persistent Memory 和外部服务不由 event replay 推导。
  - 产品架构：SDK 是 coding-agent kernel，Agent Server 是执行 API，Agent Canvas 是可自托管、多 Agent/多 backend 控制面。conversation 是执行卷宗，workspace/Git diff 是物质工件，PR/CI/review/merge 才是团队验收路径；`FINISHED` 不等于正确或可合并。
- V0/V1 与产品边界：
  - V0 以 Docker Runtime client/server 和 `trajectory.json` 为主要叙述；V1 SDK 默认允许 Agent/tool 同进程执行，隔离是 Local/Process/Docker/VM/Remote 的显式部署选择。
  - `OpenHands/OpenHands v1.10.0` 当前是 Agent Canvas，不是 Python SDK；两个仓库的版本号没有一一对应证据。
  - Agent Canvas README 明确警告无 sandbox 运行会给予 Agent Server 宿主文件系统访问；remote 只说明通信位置，不自动证明强隔离。
- 核心状态所有权：
  - EventLog：消息、Action、Observation、condensation、pause 等轨迹与分支历史；带 event ID、source、timestamp、parent_id，但不是 hash-chained 防篡改日志。
  - Base state：execution status、stats、agent config、secret metadata、agent_state、active leaf；公开字段变化会自动覆盖保存。
  - Derived View：活动 leaf 到 root 的只读投影，线性 append 时增量更新，换枝时重建，不单独持久化。
  - Workspace / Git / external services：独立可变世界；conversation fork 在本地复制事件和 state，却默认共享同一 workspace。
  - Persistent Memory：默认关闭的 Markdown 旁路，新会话重新读取并注入 prompt，不属于 event/base state。
- 保留的一手来源：
  - [SDK v1.41.0](https://github.com/OpenHands/software-agent-sdk/releases/tag/v1.41.0)、[`AgentBase`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/agent/base.py) 与 [`Agent.step`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/agent/agent.py) → 版本、immutable Agent 配置、pending/condense/LLM/action/observation；不能证明 LLM 重采样或外部动作确定性。
  - [`Event`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/event/base.py)、[`EventLog`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/event_store.py) 与 [`ConversationState`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/state.py) → frozen event、event tree、ID/parent 校验、active leaf、base/view 分工；不能证明防篡改、数据库事务或副作用 exactly-once。
  - [Persistence](https://docs.openhands.dev/sdk/guides/convo-persistence) 与 [`LocalFileStore`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/io/local.py) → base/events 分储与自动保存；文档称 atomic update，但固定源码只有直接覆盖写，不能升级成 crash-safe temp+rename+fsync 保证。
  - [Conversation](https://docs.openhands.dev/sdk/arch/conversation)、[Workspace](https://docs.openhands.dev/sdk/arch/workspace) 与 [`RemoteConversation`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/conversation/impl/remote_conversation.py) → local/remote factory、REST/WS、重连 reconcile 与 event ID 去重；不能证明 server 未持久化事件或外部 mutation 可恢复。
  - [Design Principles](https://docs.openhands.dev/sdk/arch/design)、[Security guide](https://docs.openhands.dev/sdk/guides/security) 与 [`confirmation_policy.py`](https://github.com/OpenHands/software-agent-sdk/blob/v1.41.0/openhands-sdk/openhands/sdk/security/confirmation_policy.py) → optional isolation、risk analyzer 与 confirmation 能力；固定裸 SDK 默认却是 `NeverConfirm()`、analyzer `None`，且直接 `execute_tool()` 可绕开 loop gate。
  - [Agent Canvas v1.10.0](https://github.com/OpenHands/OpenHands/releases/tag/v1.10.0) 与 [fixed README](https://github.com/OpenHands/OpenHands/blob/v1.10.0/README.md) → self-hosted control center、ACP Agents、多 backend、automation 与无 sandbox 警告；不能证明闭源 Cloud 的租户隔离、数据保留或灾备。
  - [Persistent Memory](https://docs.openhands.dev/sdk/guides/persistent-memory)、[Task Tool Set](https://docs.openhands.dev/sdk/guides/task-tool-set)、[Parallel Tool Execution](https://docs.openhands.dev/sdk/guides/parallel-tool-execution) 与 [Critic](https://docs.openhands.dev/sdk/guides/critic) → 记忆、delegation、并发和 experimental eval 的作用域；不能证明多 Agent、并行或 critic 自动提高正确率。
- 可验证失败路径：ActionEvent 先 append，工具完成 GitHub/API/file mutation，进程在 ObservationEvent append 前崩溃；恢复后 `get_unmatched_actions()` 把 Action 视为 pending，下一次 `step()` 在重新采样前优先执行，可能产生重复副作用。event ID 去重只防重复事件 ID，不防外部重复写。
- 最小恢复协议：claim/fence conversation；校验 base/event/leaf；重建 active View；找 orphan Action；以稳定 `conversation_id/action_id` 查询 provider receipt 或目标状态；已发生则补 Observation，确定未发生才以幂等键重试，无法判断进入 `unknown` 人工队列；最后核验 workspace diff、Git 与外部资源。
- 安全与并发边界：固定 SDK 默认无 analyzer、`NeverConfirm()`；confirmation、hook、sandbox、API scope 与 idempotency 必须分层。多 tool-call 默认并发度 1，提高后才并行；EventLog 串行 append 不会串行化实际工具副作用。NFS file lock、async task 重入、shared workspace 与 remote lease 仍需部署级验证。
- 图示问题：无状态 Agent 如何完成长任务，以及 event replay 在哪里停止。
- 图示交付：
  - `assets/diagrams/agent-system-series/10-openhands/openhands-event-sourced-runtime.excalidraw`
  - `static/images/agent-system-series/10-openhands/openhands-event-sourced-runtime.svg`
  - `static/images/agent-system-series/10-openhands/openhands-event-sourced-runtime.png`
- 最强边界：OpenHands V1 是以无状态 step、typed event tree、Conversation lifecycle 与可替换 workspace 为核心的 coding-agent runtime；它实现内部轨迹的重建与继续执行，不是外部副作用的事务性重放、全局 database、默认强隔离或结果正确性保证。
- 证据缺口：Cloud 闭源 runtime、租户/密钥/保留/灾备；base-state crash atomicity；NFS 与多实例一致性；通用 idempotency/outbox/compensation；trajectory 的秘密清除与跨版本 replay；fork 的 filesystem snapshot；默认 product surface 是否覆写 security policy；任务正确性 benchmark 与恢复故障注入均无统一公开保证。
- 未决作者判断：Conversation as Database 类比、最小恢复协议属于基于固定源码的设计建议；系列命名、最终措辞和发布仍需作者确认。
