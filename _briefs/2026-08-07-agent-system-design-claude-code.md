---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-claude-code
title: Claude Code 的扩展语法：为什么一个 Coding Agent 需要多种控制原语
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:41:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

Claude Code 最值得研究的不是功能数量，而是它把上下文、可复用流程、外部能力、确定性拦截和并行上下文拆成不同原语。文章要回答：一个模糊意图怎样经过 `CLAUDE.md`、Skill、MCP、Hook、Subagent、permission、sandbox 与 worktree，最终变成受约束、可验证的仓库修改。

## 为什么值得由我写

作者已经公开写过 Agent Harness 全景、Claude Code 使用实践和 Claude Tag 的组织级运行时；本篇的新增长是从“会用工具”下沉到“为何要设计多套语义不同的扩展机制”，并把个人交互、Agent loop 与系统治理放在同一条控制链上。

## 目标读者与阅读场景

读者正在为 coding agent 增加规则、工具、自动动作或多 Agent 能力，却不知道该放进 prompt、skill、hook、MCP、subagent 还是产品代码。读完后能画出职责表，并判断哪些要求只是建议、哪些必须由确定性机制或操作系统强制。

## 编辑选择

- 文章轨道：`research`
- 已选形态：以“一个仓库修改如何获得控制”为主线的设计解剖
- 核心张力：可塑性越高，越需要把软指令、能力与硬约束分开
- 这次主动不讲：入门教程、技巧清单、模型能力排名、Claude Tag 企业产品
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `1` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 可引用站内既有公开文章 `agent-engineering-the-98-percent-harness.md`、`claude-code-boris-121-tips-playbook.md` 与 `claude-tag-organizational-agent-runtime.md`，但必须检查重复。
- 本轮允许公开的作者要求：每篇区分 Agent 架构、系统架构和产品架构，并重点解释设计美学、语言/框架选择与边界判断。

### 作者原话与在场片段

- 无需补写新的个人经历；从读者真实设计决策进入。

### 作者观察

- 不同性语义若被塞进同一个 system prompt，团队最终无法知道一条规则是知识、建议、能力还是强制策略。

### 待验证推论

- Claude Code 的核心审美可概括为“渐进式披露的可塑工作台”；必须用官方文档和当前产品边界压力测试。

## 参考方向

- 从 [Features overview](https://code.claude.com/docs/en/features-overview)、[Memory](https://code.claude.com/docs/en/memory)、[Hooks](https://code.claude.com/docs/en/hooks-guide)、[Agents](https://code.claude.com/docs/en/agents)、[Sandboxing](https://code.claude.com/docs/en/sandboxing) 起步。
- 固定核验日期；若实现语言或内部框架缺少官方源码/设计声明，只能写可观察事实与推论，不得编造选型动机。
- 检查 permission 与 sandbox、subagent 上下文隔离与 worktree 文件隔离之间的区别。

## 图示任务

回答“模糊意图怎样成为受约束的仓库修改”。画左到右的渐进式控制河流，标出 context、Agent loop、tool proposal、Hook/permission gate、sandbox、worktree、tests 与反馈；不得把 `CLAUDE.md` 或 Skill 画成硬策略。输出 `01-claude-code/claude-code-progressive-control` 三种格式。

## 证据与隐私边界

- 可以公开：官方资料、公开文章、公开仓库与本轮研究要求。
- 必须匿名：无需使用第三方私人案例。
- 禁止使用：Brain 私有原文、未公开配置、密钥、私人对话。
- 发布前仍需作者确认：最终审美判断、第一人称表述、标题和所有未获官方证实的架构推论。

## 不要写成

不要写成功能百科、配置教程或 Claude 与 Codex 的跑分比较。不要把“能影响模型”写成“能强制系统”，也不要以功能多寡代替设计判断。

## 验收标准

- [ ] 三种架构层次都可辨认，但文章不是机械三段式
- [ ] 读者能决定新要求应落在哪种原语
- [ ] permission/sandbox、context/file isolation 等边界清楚
- [ ] 语言与框架动机区分官方声明和作者推论
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-claude-code.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 无 source_refs；独立核验 Claude Code 官方文档、v2.1.224 公开仓库、Agent SDK 进程边界、Claude Code Action 与 sandbox-runtime，保留事实/源码观察/本文推论三种证据等级
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与 2940×1689 全尺寸目视检查均通过
- published_at:
- retro_notes: 文章把原命题收紧为 soft context、tool boundary、OS isolation 与 external verification 四段控制权转移；未把公开仓库误写成核心开源，也未把模型停止或测试通过写成需求正确

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：Claude Code `v2.1.224`；官方公开仓库 commit `66edf5358349356774812264b75b8ea792f0d0a3`。公开仓库为 all-rights-reserved，未包含核心 CLI loop 源码；相邻可审计对象为 Claude Agent SDK、`claude-code-action` 与 `sandbox-runtime@97c197fc5ef393493743f6b372d3cadd05177464`。
- 三路独立研究：
  - Agent 架构：公开行为是 context → model/tool loop → tool result → repeat；默认停止条件是模型返回无 tool call 的响应。子代理提供上下文隔离和摘要回传，不天然构成独立判断。
  - 系统架构：确定性控制集中在 `PreToolUse`、permission、Bash OS sandbox、worktree path isolation、真实工具退出码与 Git/CI；permission 与 sandbox 保护不同对象，checkpoint 也不覆盖远程副作用。
  - 产品架构：CLI、IDE、Desktop、Web、CI 等 surface 重新安排提出、批准和审阅位置；仓库修改的长期 canonical artifact 仍是 working tree / diff / branch / commit / PR。
- 保留的一手来源：
  - [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) → 公开 loop、context、session 与工具反馈链；不能证明闭源核心的内部调度算法。
  - [Agent SDK loop](https://code.claude.com/docs/en/agent-sdk/agent-loop) → 与 Claude Code 相同的消息—工具循环及停止边界；不能证明交互式 CLI 的全部默认值。
  - [Extend Claude Code](https://code.claude.com/docs/en/features-overview) → CLAUDE.md、Skill、MCP、Hook、Subagent 与 Plugin 的官方职责；不能证明扩展内容都可信。
  - [Hooks](https://code.claude.com/docs/en/hooks) 与 [Permissions](https://code.claude.com/docs/en/permissions) → 生命周期拦截、决策优先级和 Stop 限制；不能证明 Hook 本身正确或可用。
  - [Sandboxing](https://code.claude.com/docs/en/sandboxing) 与 [Worktrees](https://code.claude.com/docs/en/worktrees) → OS 边界、fail-open 条件、并行文件隔离与共享面；不能证明完整租户隔离。
  - [Checkpointing](https://code.claude.com/docs/en/checkpointing) → 文件恢复边界；不能证明数据库、API、部署或 Bash 副作用可回滚。
  - [Claude Code v2.1.224](https://github.com/anthropics/claude-code/releases/tag/v2.1.224) 与 [仓库许可证](https://github.com/anthropics/claude-code/blob/66edf5358349356774812264b75b8ea792f0d0a3/LICENSE.md) → 版本和公开边界；不能证明闭源内部实现。
- 图示问题：模糊意图怎样成为受约束的仓库修改。
- 图示交付：
  - `assets/diagrams/agent-system-series/01-claude-code/claude-code-progressive-control.excalidraw`
  - `static/images/agent-system-series/01-claude-code/claude-code-progressive-control.svg`
  - `static/images/agent-system-series/01-claude-code/claude-code-progressive-control.png`
- 最强边界：影响模型的 context/Skill 没有强制力；能阻断动作的 Hook/permission/sandbox 也不能证明修改满足真实需求，最终仍需外部验收证据。
- 证据缺口：核心 CLI 语言/框架、system prompt、context assembly、compaction 算法、tool scheduler、auto classifier 与 cloud orchestration 未公开；不能从 UI、SDK wrapper 或独立 sandbox runtime 反推。
- 未决作者判断：最终审美命名“渐进式控制”、第一人称判断、标题和是否进入发布流程仍由作者确认。
