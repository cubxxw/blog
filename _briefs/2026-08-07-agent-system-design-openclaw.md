---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-openclaw
title: 常驻 Agent 的网关结构：OpenClaw 如何统一渠道、身份、会话与设备
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:46:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

OpenClaw 的独特性在于把 Agent 放进长期在线的 Gateway：渠道、账户、发送者、bindings、per-agent workspace/state/auth、session 与设备节点都由常驻控制面路由。文章要回答：跨渠道保持连续性时，怎样避免身份串线、权限扩散和长期攻击面失控。

## 为什么值得由我写

站内已有《从洛克到 OpenClaw》讨论记忆、连续性与 Agent 自我。本篇主动离开哲学，研究 Gateway、WebSocket、routing、session isolation、node 与 idempotency，把“常驻个人 Agent”作为系统和产品品类拆开。

## 目标读者与阅读场景

读者正在把 Agent 接入 Telegram、Slack、邮件、Web 或本地设备，或者希望它 24/7 在线。读完后能设计 `channel/account/sender → agent → session → capability` 路由表，区分 workspace 与 sandbox，并知道常驻能力如何改变安全、凭据和运维责任。

## 编辑选择

- 文章轨道：`research`
- 已选形态：以一条跨渠道消息的完整路由为主线
- 核心张力：连续性依赖共享控制面，但安全依赖身份和状态不能错误共享
- 这次主动不讲：人格同一性、陪伴叙事、安装教程
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `6` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 必须扫描现有 `agent-identity-from-locke-to-openclaw.md`，只继承必要定义，不重复其哲学主线。
- 本轮允许公开的作者要求：分析三层架构、设计品类、生态位置与边界。

### 作者原话与在场片段

- 不补写私人聊天渠道或长期运行数据。

### 作者观察

- 一个 Agent 能跨渠道“认出同一个人”既是产品价值，也是最危险的身份合并操作之一。

### 待验证推论

- OpenClaw 可以被视为个人 Agent Gateway，而不是单纯聊天机器人；需要用官方协议、routing 和安全文档验证。

## 参考方向

- 从 [Docs](https://docs.openclaw.ai/)、[Gateway Architecture](https://docs.openclaw.ai/architecture)、[Agent Runtime](https://docs.openclaw.ai/concepts/agent)、[Multi-Agent Routing](https://docs.openclaw.ai/concepts/multi-agent)、[Security](https://docs.openclaw.ai/gateway/security) 起步。
- 核验 Gateway 与 LLM 的区别、bindings 顺序、per-agent 状态、session 存储、节点连接和副作用 idempotency。
- workspace cwd 不等于硬 sandbox；网页、邮件与文档内容仍是 prompt-injection 输入面。
- 语言/框架动机必须区分 manifest 事实与对长连接、插件生态、跨平台分发的推论。

## 图示任务

回答“跨渠道连续性怎样不变成身份串线”。使用真实 hub-and-spoke：渠道在左、Gateway 在中、per-agent enclave 在右、设备节点和工具在下；标出互联网、agent state/auth 与设备节点信任边界。输出 `06-openclaw/openclaw-persistent-gateway` 三种格式。

## 证据与隐私边界

- 可以公开：官方文档、公开源码、现有公开文章和本轮系统判断。
- 必须匿名：不使用任何真实联系人、频道和会话。
- 禁止使用：个人消息、token、账户映射、私有 workspace。
- 发布前仍需作者确认：Gateway 品类判断、语言选型推论和长期运行风险表述。

## 不要写成

不要重复 Agent 自我与哲学连续性。不要把 Gateway 等同模型、workspace 等同 sandbox，也不要把多渠道默认画成同一个安全上下文。

## 验收标准

- [ ] 与现有 OpenClaw 哲学文章有明确增量
- [ ] identity、binding、session、workspace、node 各自职责可复述
- [ ] 至少展示一个跨租户/跨账户串线失败模式
- [ ] 长期在线带来的凭据、更新、注入和撤销边界清楚
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-openclaw.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 先审读站内《Agent 的自我：从洛克到 OpenClaw》并排除身份哲学主线，再由三路独立研究冻结 OpenClaw v2026.7.1-2，核验 Gateway/route/session/capability、协议/状态/恢复/安全与产品采用边界
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: 文章只研究 route algebra 与 operator responsibility；发现研究日 live docs 已迁移 SQLite，而 release tag 仍是 sessions.json + JSONL，正文与图均按固定 tag 修正

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：OpenClaw `v2026.7.1-2`，annotated tag `be8b8a9e8838f832e4fa47cde8bea0a33aec71ba`，commit `0790d9f593ad30c940ed93b5872a8cf6d6f3cf8c`；研究日 main 为 `2dd0e9b950462acc1f24fa9b207e9b7b0b4bd36b`，不把后续实现倒灌进 release。
- 与前文的增量：现有公开文章已经讨论洛克、身份文件、记忆、权限和评测如何构成连续性；本篇不再讨论人格同一性，只拆 `channel/account/peer → binding → agent → session → capability` 的工程路径。
- 三路独立研究：
  - Agent 架构：Gateway 拥有准入、routing、session identity、capability 与 delivery；embedded runtime 或外部 harness 拥有 model/tool loop。`dmScope` 决定 session key 的身份维度，`identityLinks` 是显式 join。
  - 系统架构：v4 typed WebSocket 使用 request/response/event；socket events 不 replay，副作用 RPC 只有短期 dedupe。release tag 的 session store 为 `sessions.json + JSONL`，普通 turn queue 是进程内 lane；workspace cwd 不等于 sandbox。
  - 产品架构：Telegram/Slack 是交互 channel，Gmail 更接近 hook，WebChat 是 Gateway client，node 是执行外设。采用成本从学习新 App 转移到 host uptime、凭据、升级、插件供应链与身份映射。
- 保留的一手来源：
  - [v2026.7.1-2](https://github.com/openclaw/openclaw/releases/tag/v2026.7.1-2) 与 [package manifest](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/package.json) → 版本、MIT、TypeScript/Node.js 与分发形态；不能证明生产 SLA 或语言选择的唯一动机。
  - [Gateway architecture](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md) 与 [protocol](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/gateway/protocol.md) → 单 Gateway、typed WS、roles、events not replayed 与短期 dedupe；不能证明 durable event log 或 exactly-once。
  - [`resolve-route.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/resolve-route.ts) 与 [`session-key.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/session-key.ts) → binding precedence、resolved route fields、dmScope 与 identityLinks；不能证明外部平台身份真实性或 operator mapping 正确。
  - [Multi-agent](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md) 与 [Session](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md) → per-agent workspace/state/auth/session、JSON/JSONL store、DM isolation 与 cwd 边界；不能证明 hostile tenant isolation。
  - [Agent loop](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-loop.md) 与 [Agent runtimes](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-runtimes.md) → Gateway/runtime/model ownership、queue、context、stop；不能证明每个 runtime 完全等价或普通 turn 有统一 evaluator。
  - [Nodes](https://docs.openclaw.ai/nodes) 与 [Security](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/gateway/security/index.md) → device pairing、capability、single-operator trust model、prompt injection 与 hard controls；不能证明 paired command、browser 或外部 API 副作用可事务回滚。
  - [Multi-tenant hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting) → 一个不互信 tenant 一个完整 Gateway cell；Fleet 仍是实验性单机 lifecycle supervisor，不是共享 ingress 或 tenant IAM。
- 失败模式验证：两个 Telegram/Slack accounts 同路由到一个 agent 且使用 `per-channel-peer` 或默认 `main` 时，account 维度缺失会让不同 inbox 共享 context；修复为显式 account binding + `per-account-channel-peer`，对不互信租户则拆 Gateway/OS boundary。
- 图示问题：跨渠道连续性怎样不变成身份串线。
- 图示交付：
  - `assets/diagrams/agent-system-series/06-openclaw/openclaw-persistent-gateway.excalidraw`
  - `static/images/agent-system-series/06-openclaw/openclaw-persistent-gateway.svg`
  - `static/images/agent-system-series/06-openclaw/openclaw-persistent-gateway.png`
- 最强边界：session key 是路由选择器，不是 tenant authorization；per-agent workspace/state 分区不把一个 Gateway 变成敌对多租户安全边界。
- 证据缺口：短期 dedupe 的 TTL/重启语义、普通 queue 的 crash replay、外部 sender identity、插件全局存储、node pending delivery、外部 API 幂等与生产 SLA 没有统一公共契约。
- 未决作者判断：“个人 Agent Gateway”“受控 identity join”是本文的品类与解释性主张；语言选型推论、最终标题、边界表述和发布仍需作者确认。
