---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-pi
title: Pi 的减法：一个 Agent Harness 为什么应该主动不拥有能力
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:42:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

Pi 的价值在于把“没有 MCP、权限弹窗、多 Agent、Plan Mode、Todo 或后台 shell”等缺失变成可审视的设计选择。文章要研究：去掉工作流偏好后，一个仍然有用的 Agent kernel 最少保留什么，以及被移出内核的复杂性最终由 extension、host 还是用户承担。

## 为什么值得由我写

作者的公开 Agent Engineering 文章已经解释 Harness 有哪些支柱；Pi 提供了反向样本：不是继续添加支柱，而是重新判断哪些能力不配进入 core。它可以迫使系列从功能比较转向责任分配。

## 目标读者与阅读场景

读者正在写自己的 Agent loop、CLI 或 SDK，功能不断长进内核。读完后能画出 core/extension/host 责任表，理解 session tree 与扩展协议，并决定哪些能力应保持可替换、哪些安全责任不能靠“极简”省略。

## 编辑选择

- 文章轨道：`research`
- 已选形态：围绕“主动不拥有能力”的减法审计
- 核心张力：小内核提升可塑性，也会把安全与一致性责任外移
- 这次主动不讲：把 Pi 写成 Claude Code/Codex 的轻量替代品排行
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `2` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 可引用公开 Harness 总纲作为问题背景，但 Pi 的事实必须从当前官方文档和仓库重新核验。
- 本轮允许公开的研究要求是解释设计理念、语言/框架选择、边界和生态连接。

### 作者原话与在场片段

- 不补写“长期使用 Pi”的虚构经历。

### 作者观察

- 极简架构真正的成本通常不是功能少，而是把原本由产品承担的选择与风险交还给扩展作者和使用者。

### 待验证推论

- Pi 可以被理解为 Unix 式 Agent 小内核；该类比必须具体落实到扩展边界和可替换性，不能只当赞美。

## 参考方向

- 从 [Usage/design](https://pi.dev/docs/latest/usage)、[Extensions](https://pi.dev/docs/latest/extensions)、[SDK](https://pi.dev/docs/latest/sdk)、[Security](https://pi.dev/docs/latest/security) 和 [官方仓库](https://github.com/earendil-works/pi) 起步。
- 核验 session tree、resource loading、extension 权限、project trust 与 sandbox 的真实含义。
- 仓库中的 durable harness 文档若是设计稿，应明确它与当前运行实现的距离。
- 语言选择只能结合 manifest、分发和扩展生态做有标记的推论。

## 图示任务

回答“最小可用 kernel 究竟保留什么”。使用中心小核、可拆卸扩展轨道和下方 session tree；显式标出 provider 网络、项目资源加载和 extension 到 host OS 的信任边界。输出 `02-pi/pi-minimal-kernel` 三种格式。

## 证据与隐私边界

- 可以公开：官方文档、公开仓库、可复现源码观察和本轮研究问题。
- 必须匿名：不需要个人案例。
- 禁止使用：私有 Agent 配置、密钥、未公开使用数据。
- 发布前仍需作者确认：Unix 类比、极简审美判断、所有关于语言动机的推论。

## 不要写成

不要把“刻意不内置”自动写成“更优雅”；必须列出责任转移和失败面。不要把 project trust 误写成执行 sandbox，也不要把全权限 extension 描述成安全插件市场。

## 验收标准

- [ ] 给出 core/extension/host 三方责任边界
- [ ] 清楚区分可塑性收益与安全外移成本
- [ ] 设计文档、当前源码和产品行为不混为一谈
- [ ] 读者能据此删减自己的 Agent 内核
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-pi.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 无 source_refs；三路研究独立核验 Pi v0.84.1 release 源码、研究日 latest 文档、作者设计说明与公开 package/security 边界，并将 release tag 与同日 main 分开记录
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: 文章把“极简”拆成 loop kernel、coding harness 与 host responsibility 三层；Unix 类比只保留组合性，不把同权 extension 或裸 Bash 误写成低权限进程

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：Pi `v0.84.1`，tag commit `53fa77ccd8a279eb87e92294ef3687b03ff80112`，MIT，TypeScript / Node.js `>=22.19.0`。研究日 main 已前进到 `10474bd697b2270defa200998f16baf2166775a8`，源码结论固定 release tag，latest 文档不假定逐行对应。
- 三路独立研究：
  - Agent 架构：最小闭环是 provider stream、messages/tools、tool 参数验证与执行、result feedback、events、abort/stop；Plan、subagent、Todo、MCP 与 eval 均非 loop 必要条件。
  - 系统架构：`pi-agent-core` 拥有 loop/state，`pi-coding-agent` 加入默认工具、ResourceLoader、SessionManager、compaction、TUI 与 extensions；Project Trust 只守启动资源加载，真实隔离由 OS/container/micro-VM 承担。
  - 产品架构：Pi 是开源、可嵌入、可自行组装的 terminal coding-agent substrate；普通文件、Git、tmux、CLI、packages、SDK/RPC 共同接走被移出 core 的产品责任。
- 保留的一手来源：
  - [Pi v0.84.1](https://github.com/earendil-works/pi/releases/tag/v0.84.1) 与 [release 源码](https://github.com/earendil-works/pi/tree/53fa77ccd8a279eb87e92294ef3687b03ff80112) → 版本、包分层、许可与实现边界；不能证明第三方部署正确。
  - [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent-loop.ts) 与 [`agent.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent.ts) → loop、tool feedback、queues、并发与 stop seam；不能证明模型会在正确时机结束。
  - [`session-manager.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/session-manager.ts) → append-only JSONL tree、active leaf 与 context projection；不能证明工作树随会话分支回滚。
  - [`resource-loader.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/resource-loader.ts) → trust 前 bootstrap 与资源 reload；不能证明加载后的 extension 安全。
  - [Extensions](https://pi.dev/docs/latest/extensions) 与 [Packages](https://pi.dev/docs/latest/packages) → 可组合能力与 full-system-access 边界；不能证明 package index 等于安全审计。
  - [Security](https://pi.dev/docs/latest/security) 与 [Containerization](https://pi.dev/docs/latest/containerization) → Project Trust、无内置 sandbox 与外部隔离责任；不能证明容器/micro-VM 配置正确或所有 custom tool 已路由。
  - [作者设计说明](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/) → 无 Plan/Todo/MCP/subagent/permission/background Bash 的明示理由；不能证明这些取舍对所有团队更优。
- 图示问题：最小可用 kernel 究竟保留什么。
- 图示交付：
  - `assets/diagrams/agent-system-series/02-pi/pi-minimal-kernel.excalidraw`
  - `static/images/agent-system-series/02-pi/pi-minimal-kernel.svg`
  - `static/images/agent-system-series/02-pi/pi-minimal-kernel.png`
- 最强边界：Project Trust 不限制已启动 Agent 的工具；extension 也不是低权限插件。默认 Bash 与 extension 继承启动 Pi 的用户权限。
- 证据缺口：provider 重试与副作用 exactly-once、session 与文件/Git 的事务绑定、内建 credential encryption、多进程 session 一致性、第三方 delegation 语义与默认任务验收器均未形成统一公共契约。
- 未决作者判断：Unix 类比、极简审美、第一人称取舍、标题和发布决定仍由作者确认。
