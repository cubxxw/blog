---
title: 'Claude Code 的扩展语法：一条仓库修改怎样逐级获得控制'
date: 2026-08-07T16:35:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Context Engineering
  - MCP
  - Security
  - Testing
description: >
  以 Claude Code v2.1.224 为证据边界，沿仓库修改控制链拆解 CLAUDE.md、Skill、MCP、Hook、permission、sandbox、subagent 与 worktree。文章区分软语境、能力接口、确定性拦截和文件隔离，说明模型何时拥有下一步，代码、操作系统、测试与人在何处接管后果。
tldr:
  - Claude Code 的多种扩展机制处理的是不同语义：CLAUDE.md 与 Skill 影响模型，MCP 增加能力，Hook 接入生命周期，permission 决定工具能否尝试，sandbox 约束 Bash 真正可达的资源，worktree 隔离并行修改。
  - 一次修改没有被编译成固定工作流。模型持续选择下一步；确定性控制集中在 tool boundary、操作系统边界和 Git/CI 验收面。
  - “模型停止”只表示它返回了不含工具调用的响应。测试、类型检查、diff、CI 与人工验收才把完成声明变成可检查证据。
  - 子代理首先解决上下文隔离和并行吞吐，不自动产生独立判断。共享模型、证据和目标的多个角色仍可能一起犯错。
  - Claude Code 的设计取向可概括为渐进式控制：先用低成本语境引导，需求变硬后再下沉到 Hook、策略、sandbox、worktree 与外部验证。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 1
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/01-claude-code/claude-code-progressive-control.svg
  alt: 'Claude Code 中模糊意图经过上下文、Agent loop、工具提案、权限、沙箱、工作树和测试，成为受约束仓库修改的控制河流'
---

把“永远不要修改 `.env`”写进 `CLAUDE.md`，这条要求会进入 Claude 的上下文。它会影响模型的选择，却没有在文件系统前竖起一道墙。

同一句话若进入 `PreToolUse` Hook、permission deny rule 或 sandbox 文件规则，语义已经变了：它开始决定一次工具调用能否发生，或者一个 Bash 子进程实际能碰到什么。

这正是 Claude Code 最值得拆开的设计问题。一个 coding agent 为什么需要 `CLAUDE.md`、Skill、MCP、Hook、Subagent、permission、sandbox 和 worktree 这么多原语？答案不在功能数量里，而在它们分别接管了**知识、流程、能力、生命周期、策略、执行环境和并发状态**。把这些东西全塞进 system prompt，团队迟早会分不清一条规则究竟是建议，还是能承担后果的控制。

本文冻结在 **Claude Code v2.1.224（2026-08-07）**。官方公开仓库的根许可证是 all-rights-reserved，仓库中也没有核心 CLI loop 源码；可审计的是产品文档、公开插件、Agent SDK 的进程边界、GitHub Action 和独立的 sandbox runtime。因此，下面会把官方事实、公开源码观察和本文推论分开，不从 UI 反推闭源内部模块。[v2.1.224 发布记录](https://github.com/anthropics/claude-code/releases/tag/v2.1.224)与[官方仓库许可证](https://github.com/anthropics/claude-code/blob/66edf5358349356774812264b75b8ea792f0d0a3/LICENSE.md)给出了这条证据边界。

## 一条修改真正经过了什么

Claude Code 对外描述的循环很简洁：

```text
gather context → take action → verify results → repeat
```

工具结果会回到下一轮模型输入，模型根据新证据继续搜索、编辑、运行命令或结束。[How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)给出了这条公开生命周期；Agent SDK 文档又把更底层的停止条件写得很清楚：模型返回不含工具调用的响应，loop 就可以结束。[Agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop)

这两个表述之间有一道容易被忽略的缝：

> “模型决定不再调用工具”是停止条件；“修改满足真实需求”是验收判断。

从模糊意图到可交付修改，至少经历七次控制权转移。

1. **用户定义问题与验收线索。** 一个自然语言请求进入 turn。若规格仍有歧义，模型可以调用 `AskUserQuestion`；它是否追问、问到什么，仍是概率判断。
2. **上下文装配影响解释。** `CLAUDE.md`、auto memory、Skill 描述、已经读取的文件、工具输出与会话历史进入有限窗口。它们改变模型眼中的任务，却不会自动变成执行策略。
3. **Agent loop 选择下一步。** 模型可以探索、形成计划、委派子代理、提出文件编辑或命令调用。Plan mode 把探索与源文件写入分开，但它依然是一种行为模式。
4. **工具提案抵达边界。** 模型产出结构化 tool name 与 input。此时世界尚未被修改。
5. **Hook 与 permission 判断能否尝试。** `PreToolUse` 在工具执行前运行；permission 规则按 deny、ask、allow 处理请求。这里可以阻断、要求批准或修改参数。
6. **sandbox 与 worktree 限制执行半径。** 对 Bash 及子进程，OS sandbox 决定文件和网络实际可达范围；worktree 把并行会话的工作文件与分支隔开。
7. **测试、diff、CI 与人检查结果。** 工具执行结果回到 loop。真正的测试退出码、静态检查、截图、Git diff 和合并策略，为“完成”提供外部证据。

Claude Code 没有把这条路实现为一张所有任务都必须经过的固定 DAG。官方最佳实践推荐对复杂任务采用 `Explore → Plan → Implement → Commit`，同时允许清晰小修跳过计划。[Best practices](https://code.claude.com/docs/en/best-practices) 这保留了开放式编程任务需要的弹性，也让质量更依赖用户给出的验收信号和仓库自己的控制面。

## 图解：模糊意图怎样成为受约束的仓库修改

![Claude Code 渐进式控制河流](/images/agent-system-series/01-claude-code/claude-code-progressive-control.svg)

**阅读指南：** 从左向右读主河道。上方的 `CLAUDE.md`、Skill、按需读取文件和子代理摘要只改变模型拥有的上下文；中部的 Agent loop 仍决定下一步并提出工具调用；到 Hook/permission 才出现执行前决策，sandbox 与 worktree 再把获准动作限制在具体环境里。下方反馈河道把测试、diff 和 CI 证据送回 loop。图中最重要的分界是：**影响模型的内容，不自动拥有强制力；能阻断动作的机制，也不自动证明需求正确。**

## 八种原语，八种不同的承诺

官方扩展总览把这些机制放在同一页，容易让人把它们都理解成“扩展 Claude 的方法”。真正用于设计时，更有用的是问：每种原语究竟承诺了什么？[Extend Claude Code](https://code.claude.com/docs/en/features-overview)

| 原语 | 它拥有的语义 | 适合放什么 | 它不能保证什么 |
|---|---|---|---|
| `CLAUDE.md` / rules | 持久上下文 | 项目约定、架构事实、常用命令 | 模型每次都遵守；禁止动作绝不发生 |
| Skill | 渐进加载的知识与流程 | 可复用方法、领域参考、复杂操作步骤 | 每个步骤都被执行；外部副作用安全 |
| MCP | 外部能力与数据接口 | 数据库、SaaS、浏览器、内部服务 | Server 可信；返回内容没有提示注入 |
| Hook | 生命周期触发与拦截 | 强制检查、日志、策略调用、参数校验 | Hook 本身正确、可用、无副作用 |
| Subagent | 隔离上下文中的独立 loop | 大量检索、局部分析、并行只读工作 | 结论独立；摘要没有丢信息 |
| permission | 工具级决策 | allow / ask / deny、组织策略 | 已获准进程只能触达安全资源 |
| sandbox | Bash 的 OS 级资源边界 | 文件写域、网络域、子进程约束 | Read/Edit/MCP 等所有工具都被同样包住 |
| worktree | Git 工作文件与分支隔离 | 并行 session、独立修改所有权 | 租户隔离、凭证隔离、共享 `.git` 无风险 |

这张表也给出一个很实用的迁移规律：

```text
偶尔需要知道 → 写进 Skill
每轮都应知道 → 写进 CLAUDE.md / rule
需要外部能力 → 接 MCP
每次发生都要执行 → 用 Hook
动作能否尝试 → 交给 permission
获准命令实际能碰哪里 → 交给 sandbox
并行修改不能互相踩文件 → 分 worktree
结果必须满足什么 → 让测试、CI 和人验收
```

当一条要求的后果变重，就把它从概率语境逐步下沉到确定性宿主。这个过程可以叫作**渐进式控制**。

## Agent 架构：模型拥有局部下一步

Claude Code 的 Agent 架构没有公开核心 loop 源码，但官方文档和 Agent SDK 足以确认外部行为：模型收到 prompt、system instructions、tools 与历史，返回文本或工具调用；harness 执行工具，再把结果送回模型，直到响应不再包含工具调用。[Agent SDK loop](https://code.claude.com/docs/en/agent-sdk/agent-loop)

模型因此拥有很大的局部控制权：

- 先搜哪些文件；
- 是否需要追问；
- 要不要进入 Plan；
- 何时委派子代理；
- 选择 Edit、Bash 还是 MCP；
- 看见错误后如何改道；
- 何时认为可以给出最终响应。

这里的关键设计不是“模型能规划”，而是**计划没有垄断控制流**。对于小修，Agent 可以读一处、改一处、跑一个测试；对于大任务，它可以探索、计划、委派、再实施。若核心强制采用固定七阶段工作流，简单任务会被流程税拖慢，未知任务又会被过早冻结的图限制。

代价同样直接：同一请求可能走出不同路径，重试也未必复现。Claude Code 把可复现性留给 Git diff、测试和外部日志，而没有要求思考路径本身可复现。

### 子代理隔离的是上下文

当前版本的普通子代理使用新的上下文，不继承父会话完整历史、父会话已经读取的文件或已调用的 Skill；父代理传入任务，子代理返回摘要。[Subagents](https://code.claude.com/docs/en/sub-agents)

这带来两个真实收益：

- 搜索日志、源码片段和长文档不会持续挤压主上下文；
- 只读研究可以并行，主代理只吸收压缩后的发现。

但“独立上下文”不等于“独立判断”。若三个 reviewer 使用同一模型、同一目标、同一代码和相近提示，它们的错误高度相关。独立性要来自不同证据路径、互相不知道预设结论、可证伪的问题，以及最后的外部测试。子代理首先是一种**上下文与吞吐结构**。

### Context 与 durable state 分开

Claude Code 的状态并没有集中在一个 Agent database：

- 当前决策材料在 context window；
- 会话历史保存在本地 JSONL；
- 跨会话指导来自 `CLAUDE.md` 与 auto memory；
- 文件结果存在 working tree；
- 长期协作状态进入 Git branch、commit 与 PR；
- 短期回退由 checkpoint 辅助。

这种分层贴合开发者已有工具。它也制造了多个恢复边界：compaction 可能丢掉早期细节；auto memory 可能保存错误经验；checkpoint 不能回滚数据库、API 或部署。Git 仍是长期代码工件的权威历史，checkpoint 只负责会话级快速撤销。[Sessions](https://code.claude.com/docs/en/sessions)、[Memory](https://code.claude.com/docs/en/memory)、[Checkpointing](https://code.claude.com/docs/en/checkpointing)

## 系统架构：真正的控制集中在 tool boundary

模型可以提出动作，宿主决定动作如何进入世界。Claude Code 的系统设计因此围绕 tool boundary 展开。

### Hook 先看参数，permission 再判权

`PreToolUse` 在模型已经生成工具参数、工具尚未执行时触发。它可以 deny、ask、allow 或修改 input。多个匹配 Hook 会并行运行，最终取更严格的结果；一个 Hook 的 deny 却无法撤销另一个并行 Hook 已经产生的副作用。[Hooks reference](https://code.claude.com/docs/en/hooks)

Hook 的生命周期触发可以是确定性的，handler 却未必确定：

- command Hook 可以读取 JSON、运行策略程序、凭退出码阻断；
- HTTP Hook 可能超时或返回非 2xx，而默认行为可能放行；
- prompt / agent Hook 本身仍使用模型判断；
- Hook 进程以用户权限运行，恶意项目 Hook 是新的信任面。

permission 是另一层。规则按 `deny → ask → allow` 处理；managed policy 可以把组织要求放在个人配置之上。Hook 的 allow 不能绕过 permission deny，blocking Hook 又能压住普通 allow rule。[Permissions](https://code.claude.com/docs/en/permissions)

因此，Hook 更像**可编程的事件拦截器**，permission 更像**工具调用策略**。把两者混为“权限系统”，会看不见它们各自的失败方式。

### Permission 与 sandbox 保护不同对象

官方文档给出的区分十分精确：

- permission 控制 Claude Code 是否可以尝试某个工具；
- sandbox 使用 OS 机制约束 Bash 及其子进程运行后能访问什么。

macOS 使用 Seatbelt，Linux/WSL2 使用 bubblewrap，网络通过 sandbox 外代理控制域名。开源的 `sandbox-runtime` 可以让人检查这一外围实现，但不能据此断言 Claude Code v2.1.224 内嵌了同一 commit 或所有 surface 使用同一运行时。[Sandboxing](https://code.claude.com/docs/en/sandboxing)、[sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime/tree/97c197fc5ef393493743f6b372d3cadd05177464)

这一层有四个常被隐藏的边界：

1. sandbox 主要包住 Bash 和子进程，不会自动包住进程内的 Read、Edit、WebFetch 或 MCP。
2. 默认读范围可能比工作区大，机密路径要显式 deny。
3. sandbox 依赖不可用时可以警告后继续；想要硬门，需要 `failIfUnavailable: true`。
4. 还要关闭 unsandboxed retry，才能避免模型请求逃出 sandbox 重跑命令。

权限挡住“能不能调用”，sandbox 限制“调用后能去哪”。两者组合才接近 defense-in-depth。

### Worktree 解决冲突，不解决信任

worktree 给并行 session 一套独立工作文件和分支。当前文档还描述了对主 checkout 的编辑阻断，以及对 `git -C`、`GIT_DIR`、`GIT_WORK_TREE` 等重定向的限制。[Worktrees](https://code.claude.com/docs/en/worktrees)

它解决的是文件与分支冲突：

```text
session A → worktree A → branch A
session B → worktree B → branch B
```

它没有形成完整安全边界。worktree 仍共享 `.git`、项目插件和部分 permission approvals；通过 `.worktreeinclude` 复制 `.env` 还会把凭证面扩散到更多 checkout。并行 Agent 需要 worktree，也需要文件所有权、凭证范围和最终合并策略。

## 产品架构：价值单位是可审阅工件

Claude Code 出现在 CLI、IDE、Desktop、Web、Mobile、GitHub Actions、GitLab CI、Slack 与浏览器等 surface。官方把它们描述为连接同一底层 engine 的不同入口，同时明确 CLI 的能力最完整、Web 是云执行、Mobile 更接近薄客户端。[Platforms](https://code.claude.com/docs/en/platforms)

入口很多，coding 场景的主要价值单位仍很稳定：

```text
working tree → diff → test evidence → branch / commit / PR → human merge
```

聊天回复解释过程，Git 工件才进入团队协作。Desktop 的视觉 diff、IDE 的行级反馈、Web 的云任务、Action 的 issue/PR 触发，都是在重新安排“谁在何处提出、查看和批准修改”。它们并未改变代码长期真相仍由仓库和 CI 保存。

这也解释了 Claude Code 的渐进采用路径：

1. 先在已有项目目录里以默认安全姿态读代码；
2. 给复杂任务增加 Plan 和明确验收信号；
3. 把重复知识写进 `CLAUDE.md` 或 Skill；
4. 把外部数据与动作接到 MCP；
5. 把必须执行的检查下沉到 Hook；
6. 用 managed settings、sandbox 与 allowlist 管团队；
7. 到 CI 再增加最小 token scope、turn/timeout/concurrency 限制；
8. 最后仍由 branch protection、review 和 merge policy接住生产后果。

产品没有要求团队先迁移到一套封闭 IDE 或 Agent database。它从开发者已有的 shell、Git 和编辑器切入，再逐层增加自己的控制面。这降低了采用门槛，也把配置一致性、扩展供应链和最终验收责任留给了用户与组织。

## 最容易误判的四条边界

### 1. “读懂整个仓库”不等于把仓库放进上下文

Claude Code 有仓库级搜索与读取能力，文件内容仍是按需进入有限窗口。上下文会压缩，旧 tool output 会被清理或总结。更准确的说法是：**Agent 可以在仓库范围内主动构造上下文。**

### 2. Plan mode 不等于 OS 级只读

Plan mode 不编辑源文件，也可以运行受权限约束的 shell 命令来探索。若 shell 读取面没有被 sandbox 收紧，“计划阶段”仍可能看见工作区外内容。行为模式和资源隔离必须分别配置。

### 3. Stop Hook 不等于无限验收门

Stop Hook 可以拒绝结束、把原因反馈给 Claude；连续阻止八次后，Claude Code 会覆盖 Hook 并结束当前 turn。用户 interrupt 和 API failure 也有不同事件。高风险发布门应落在 CI、branch protection 或部署系统，而不是只靠 Stop。

### 4. 回退文件不等于回滚副作用

checkpoint 不覆盖 Bash 直接改动、很多后台子代理修改、并发 session、符号链接目标、数据库写入、外部 API、部署或已推送历史。任何走出工作树的动作都需要自己的幂等、补偿和 reconciliation。

## 如果只保留一个原语会怎样

假设 Claude Code 只保留一个巨大的 system prompt：

- 所有知识都占据每轮上下文；
- 外部工具无法按协议发现和撤销；
- “必须执行测试”和“建议先读 README”只剩措辞强弱；
- 多任务搜索污染主上下文；
- prompt injection 一旦改变模型判断，系统没有第二道边界；
- 并行修改仍会踩进同一工作树。

相反，若把所有任务硬编码成一张固定 workflow graph，开放式编程又会失去关键能力：模型无法根据未知代码、失败测试和局部线索动态选择下一步。

Claude Code 采取了中间路线。核心 loop 保留自由度，把差异化知识、能力与强制策略放到不同扩展面。这里的复杂性没有消失，只是被重新分配：

- 用户负责把真实意图和验收信号说清；
- 模型负责局部探索与下一步；
- 扩展作者负责 Skill、MCP、Hook 的正确性；
- 管理员负责策略、凭证、sandbox 与观测；
- 仓库和 CI 负责保存工件与验证证据；
- reviewer 与 operator 承担合并、部署和远程副作用。

## 我的判断：最好的扩展边界是一张责任表

我会把 Claude Code 的设计取向概括为**渐进式披露的工作台，加上渐进式加硬的控制链**。前半句有官方文档和团队设计文章支撑：知识与工具按需进入上下文，避免一次性塞满窗口。[Seeing like an agent](https://claude.com/blog/seeing-like-an-agent) 后半句是本文的架构推论：要求从 `CLAUDE.md`、Skill 逐步迁到 Hook、permission、sandbox、worktree 与 CI，强制力才随着后果增大。

这套审美适合开放式仓库任务：问题起初不完整，路径要随着代码与测试反馈变化，团队又已经拥有 Git、shell、CI 和 review 习惯。它不适合把每次外部写入都要求事务化、可重放、可对账的业务流程；那类任务更需要显式状态机、幂等键、队列与 reconciliation，而不能把 Agent transcript 当成业务账本。

最后，判断一条新要求放在哪里，可以只问三个问题：

1. **它是在帮助模型理解，还是在限制系统行为？**
2. **违反它的后果，是否可以靠 review 发现并安全撤回？**
3. **它需要影响一次会话，还是跨 Agent、跨机器、跨组织持续成立？**

第一类要求进入 context 或 Skill。后果更重时，下沉到 Hook 与 permission。需要对抗被误导的进程时，交给 sandbox。涉及并发修改时，用 worktree 和所有权。走出仓库之后，真正接管责任的应当是外部系统的身份、幂等、审批、审计和恢复机制。

模型可以拥有下一步。后果必须有别的主人。

## 参考资料

- [Claude Code v2.1.224 release](https://github.com/anthropics/claude-code/releases/tag/v2.1.224)
- [Claude Code: How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)
- [Claude Code: Agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices)
- [Claude Code: Extend Claude Code](https://code.claude.com/docs/en/features-overview)
- [Claude Code: Hooks reference](https://code.claude.com/docs/en/hooks)
- [Claude Code: Permissions](https://code.claude.com/docs/en/permissions)
- [Claude Code: Sandboxing](https://code.claude.com/docs/en/sandboxing)
- [Claude Code: Worktrees](https://code.claude.com/docs/en/worktrees)
- [Claude Code: Checkpointing](https://code.claude.com/docs/en/checkpointing)
- [Claude Code: Sessions](https://code.claude.com/docs/en/sessions)
- [Claude Code: Memory](https://code.claude.com/docs/en/memory)
- [Claude Code: Platforms](https://code.claude.com/docs/en/platforms)
- [Anthropic: Seeing like an agent](https://claude.com/blog/seeing-like-an-agent)
- [Anthropic experimental sandbox runtime](https://github.com/anthropic-experimental/sandbox-runtime/tree/97c197fc5ef393493743f6b372d3cadd05177464)
