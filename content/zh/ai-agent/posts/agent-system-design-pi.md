---
title: 'Pi 的减法：最小 Agent Kernel 保留什么，责任又去了哪里'
date: 2026-08-07T16:40:00+08:00
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
  - Context Engineering
description: >
  以 Pi v0.84.1 源码为证据，沿 agent loop、默认四工具、JSONL session tree 与 extension seam 反推最小 Agent kernel。文章审计 Pi 省略 Plan、MCP、subagent、permission 和 sandbox 后，安全、一致性和恢复责任的去向。
tldr:
  - Pi 的最小 kernel 可以收缩为 provider-neutral stream、消息状态、tool loop、结果回注、事件与中断；Plan、Todo、MCP、subagent、审批和后台进程都不是 agenthood 的必要条件。
  - '`pi-agent-core` 与 `pi-coding-agent` 要分开看：前者拥有循环与状态，后者才加入默认工具、prompt、resource loading、session tree、compaction、TUI 和 extension。'
  - JSONL session tree 是权威对话历史，模型上下文只是当前 leaf 的派生视图；切换会话分支不会回滚工作树，compaction 也会有损。
  - Project trust 只阻止仓库在批准前加载项目配置和可执行扩展。Pi 没有内置 sandbox，extension 与 Pi 进程同权，真实隔离必须由 OS、容器或 micro-VM 提供。
  - 极简没有消除复杂性。它把 workflow、安全、验收、Git 恢复、多 Agent 冲突和企业治理交回给用户、package 作者与 embedding host。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 2
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/02-pi/pi-minimal-kernel.svg
  alt: 'Pi 最小 Agent kernel、可拆卸 extension 轨道、provider 与 host OS 信任边界以及下方 JSONL session tree'
---

Pi 默认只把四个工具交给模型：`read`、`bash`、`edit`、`write`。

它没有内置 Plan Mode、Todo、MCP、subagent、permission popup 或 background bash。读到这里，很容易把 Pi 写成一篇极简主义赞歌：四个工具足够，复杂框架都可以删掉。

真正有价值的问题更冷一点。删掉一项能力以后，它原来承担的责任去了哪里？

Plan 可以变成 `PLAN.md`，后台进程可以交给 tmux，subagent 可以是另一个 Pi 进程，MCP 可以换成 CLI 加 README。可一旦删掉 permission 和 sandbox，模型发出的 Bash 命令会直接继承启动 Pi 的用户权限；一旦把 workflow 放进 extension，extension 自己就获得了与 Pi 进程相同的系统访问。极简的成本从来不只表现为“功能少”，它也会把选择、集成和事故后果退回给使用者。

本文冻结 **Pi v0.84.1**，release tag commit 为 `53fa77ccd8a279eb87e92294ef3687b03ff80112`，发布日期是 2026-08-07。Pi 是 MIT 开源的 TypeScript / Node.js monorepo；研究日 `main` 已前进到另一个 commit，因此源码判断统一以 release tag 为准，`pi.dev/docs/latest` 只作为研究日当前文档，不混成同一版本事实。[v0.84.1 release](https://github.com/earendil-works/pi/releases/tag/v0.84.1)

## 最小 kernel 先保留一个闭环

若把 TUI、session、skills、extension、Git 和项目规则都拿掉，`@earendil-works/pi-agent-core` 的源码仍能构成一个可用 Agent：

```text
messages + tools + model
          │
          ▼
 provider-neutral stream
          │
   assistant tool call
          │
          ▼
 validate → execute tool
          │
       tool result
          └──────────────► messages → next turn
```

[`agent-loop.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent-loop.ts)把这条路径写得很直接：

1. 把新 prompt 加入 context；
2. 对 messages 做可选 `transformContext`；
3. 转成 provider 可接受的 LLM messages；
4. 流式调用模型；
5. 收集、验证并执行 tool calls；
6. 把 tool results 加回 context；
7. 有工具调用或 steering message 时继续；
8. 模型不再调用工具且队列为空时结束；
9. error、abort、`shouldStopAfterTurn` 或工具 termination 也可以停止。

一个最小 Agent kernel 因而至少需要：

- 模型流调用接口；
- `systemPrompt + messages + tools`；
- assistant/tool message 转换；
- 工具参数验证与执行；
- 结果回注；
- loop、abort 与 stop；
- 事件流，让宿主观察 turn、message 和 tool execution。

Plan、角色、任务图、审批 UX、Git checkpoint 和 session database 都没有进入这份必要条件。模型拥有概率性的下一步；kernel 只确保循环、工具执行和反馈可以发生。

这条结论有一个重要限定：它描述的是 **agent loop kernel**。一个真正可用的 coding harness 还需要默认工具、项目上下文、持久 session、压缩、资源发现和交互界面。Pi 把它们放在另一个包里。

## 图解：最小可用 kernel 究竟保留什么

![Pi 最小 kernel 与责任外移](/images/agent-system-series/02-pi/pi-minimal-kernel.svg)

**阅读指南：** 中心是 `pi-agent-core` 的小核：消息状态、provider stream、tool loop、事件与 abort/stop。上方 provider adapter 说明模型厂商可替换；外圈的 prompt、默认四工具、resource loader、TUI、session manager 和 compaction 属于 `pi-coding-agent`。更外层的 Plan、MCP、subagent、permission、Git checkpoint 与 background process 通过 extension、package 或普通 OS 工具接回。下方 JSONL tree 保存完整会话分支，active context 只投影当前 leaf。红色边界提醒：extension 运行在 host 进程内，project trust 也没有形成 sandbox。

## Pi 其实有两层“核心”

谈 Pi core 时，经常把两组不同职责揉在一起。

### `pi-agent-core`：循环、状态与事件

[`agent.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent.ts)的源码注释很明确：`Agent` 拥有当前 transcript，发出生命周期事件，执行工具。

它维护：

- 当前 messages；
- model、thinking level 与 system prompt；
- 可用 tools；
- streaming 与 active run 状态；
- pending tool calls；
- steering 与 follow-up queues；
- `AbortController`；
- `beforeToolCall`、`afterToolCall`、`prepareNextTurn`、`shouldStopAfterTurn` 等策略注入点。

默认允许的 tools 可并行执行；只要其中一个工具声明 sequential，整批就顺序运行。模型输出若因 token length 被截断，Pi 不会冒险执行可能残缺的参数，而是生成失败 tool result，请模型重新给出完整调用。

这一层没有 TUI，也没有资源发现。它提供 mechanism 和 seams，让 embedding caller 决定 context 如何变换、工具如何限制、何时强制停止。

### `pi-coding-agent`：可恢复的终端产品

`@earendil-works/pi-coding-agent` 再把 loop 包成开发者能直接使用的产品：

- 默认 system prompt；
- `read / bash / edit / write` 四个活动工具；
- 默认关闭但可启用的 `grep / find / ls`；
- `AGENTS.md`、`CLAUDE.md`、skills 与 cwd 的上下文装配；
- resource loader；
- JSONL session tree；
- compaction 与 branch summary；
- TUI、JSON、RPC 和 SDK 入口；
- extension 与 package runtime。

[`agent-session.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/agent-session.ts)是两层之间的桥：它订阅 core events，把消息写进 SessionManager，触发 extension hooks，管理自动压缩与重试，并在下一 turn 刷新 prompt、tools、model 与 thinking level。

Pi 的“极简”因此不是只有几百行 loop。它是**先把最小机制单独封装，再让默认 coding shell 和第三方 extension围绕它组装**。分层比代码量更重要。

## Provider 是 kernel 的一部分

Pi 没有把某个模型厂商当成产品身份。`@earendil-works/pi-ai` 统一了 Anthropic Messages、OpenAI Chat/Responses、Codex Responses、Google、Vertex、Bedrock、Mistral 等 API 的主要消息与流式事件。[`pi-ai` types](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/ai/src/types.ts)

公开契约包含：

- text、thinking、image、toolCall、toolResult；
- `sse / websocket / websocket-cached / auto` transport；
- `stop / length / toolUse / error / aborted / deferred` 等 stop reason；
- custom fetch、headers、provider env、timeout 和 retry options；
- provider 注册、覆盖与自定义 stream implementation。

统一接口吸收了模型调用的共同结构，却没有假装 provider 完全等价。各 adapter 只读取自己理解的 options；thinking、caching、tool calling、retry、cost reporting 和 context handoff 仍可能不同。

这是 Pi 小内核里一项容易低估的选择：**模型可替换性被放进 substrate，而非留给上层产品临时打补丁。** 对自建 harness 的人来说，provider-neutral message 与 event contract 可能比 Plan Mode 更接近 kernel 能力。

代价是抽象泄漏。跨 provider session 能 best-effort 迁移，并不意味着 reasoning metadata 或工具语义完全保真；精确计费、重试和错误分类仍需 embedding host 理解具体 provider。

## Session tree：完整历史与模型视图分开

Pi 的 session 不是线性聊天记录。它是 append-only JSONL tree。

[`session-manager.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/session-manager.ts)显示，每个 entry 有 `id` 与 `parentId`，SessionManager 维护当前 `leafId`：

```text
root
 └─ user A
    └─ assistant A
       ├─ user B
       │  └─ assistant B   ← active leaf
       └─ user C
          └─ assistant C
```

`/tree` 会移动当前 leaf，再从旧位置继续追加；`/fork` 创建新 session file；`/clone` 复制当前 active branch。旧 entry 没有被改写。

这里出现了一个很干净的状态分层：

- **权威会话历史**：整个 JSONL tree；
- **当前模型上下文**：从 active leaf 沿 `parentId` 回到 root 的路径；
- **压缩视图**：最新 compaction entry 替代一段旧消息进入 active context；
- **扩展持久状态**：CustomEntry 可留在 session，但默认不进模型；
- **模型可见扩展消息**：CustomMessageEntry 显式进入 context。

Context 因此是 durable session state 的投影。compaction 可以有损，完整旧历史仍在磁盘；模型却不会自动重读全部历史。branch summary 也是模型生成的摘要，可能遗漏被离开分支里的事实。

更关键的边界在工作区：**session tree 的分支不等于文件系统分支。** `/tree` 回到早期对话 leaf 时，磁盘仍可能保留后续对话产生的修改。Pi 没有把 JSONL entry、文件变更与 Git commit做成一个事务。

这正是最小内核没有拥有的复杂性：conversation recovery 有清晰数据结构，workspace rollback 交给 Git、container snapshot 或 extension。

## Resource loader 是启动控制面

小内核若允许任意扩展，启动顺序本身就会变成安全问题。Pi 用 `DefaultResourceLoader` 统一发现：

- settings；
- packages；
- extensions；
- skills；
- prompt templates；
- themes；
- system prompt additions；
- `AGENTS.md` / `CLAUDE.md` context files。

[`resource-loader.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/resource-loader.ts)有一个值得借鉴的 bootstrap：先按 untrusted project 加载 user/global 与 CLI extensions，完成 project trust 判断，再按最终 trust state reload 项目资源。这样，尚未信任的仓库不能先运行自己的 extension 来决定“是否信任自己”。

Skills 使用 progressive disclosure。常驻 system prompt 的主要是 name 与 description；完整 `SKILL.md` 由模型用 `read` 按需加载。扩展若注册同名 tool、command 或 flag，loader 还能生成 collision diagnostic。

这部分已经超出裸 loop，却仍然保持可替换：SDK host 可以替换 ResourceLoader，从数据库、远端包索引或企业配置构造另一套产品。

## Extension 轨道：可塑性与全权限绑在一起

Pi extension 是在进程内运行的 TypeScript / JavaScript module。它可以：

- 注册或替换 tools、commands、providers、flags 与 renderer；
- 拦截用户 input；
- 在 Agent 开始前修改 system prompt；
- 观察或改写 provider request/response；
- 在 `tool_call` 前 block；
- 修改 tool result；
- 控制 session switch、fork、tree 与 compaction；
- 持久化 custom session entries；
- 启动任意本地进程。

这种 extension seam 足够强，所以 permission gate、protected paths、subagent、MCP、Git checkpoint、sandbox routing、完整 workflow 都能作为 package 被加回。[Extensions](https://pi.dev/docs/latest/extensions)

它也足够危险。extension 与 Pi 进程同权，可以读取 credentials、修改 session、启动命令、替换 provider。Pi package 支持 npm、Git 和 local source，项目被信任后还可以安装缺失 package；官方文档因此直接提醒：package 有 full system access，安装者必须审查源码。[Packages](https://pi.dev/docs/latest/packages)

Plugin marketplace 常给人一种“功能模块”的心理预期，Pi package 更接近“把一段拥有本机权限的程序装进 Agent runtime”。可组合性是一种 API 边界，没有自动变成安全边界。

## Project trust 守住什么，又放过了什么

[Pi Security](https://pi.dev/docs/latest/security)对 project trust 的定义很窄：

- 它决定项目级 settings、resources、packages 和 extensions 是否加载；
- 默认在有动态项目资源时询问；
- 决定按 canonical directory 保存在 `~/.pi/agent/trust.json`；
- 非交互模式不会弹窗，而按 global default 或 CLI override 处理。

它明确没有做三件事：

1. 不限制模型启动后如何使用 tools；
2. 不给 Bash、网络或凭证提供 sandbox；
3. 默认仍可加载 `AGENTS.md` / `CLAUDE.md` context。

因此，拒绝 project trust 可以阻止仓库直接执行自己的 TypeScript extension，却挡不住仓库文档把恶意文本送进模型，也挡不住模型使用默认 Bash 访问本机资源。

这不是文档漏洞。Pi 公开把 prompt injection 和本地 agent 风险放在产品安全边界之外；它只承诺不让未批准项目悄悄改变启动配置与可执行资源。

## 无内置 sandbox 是一项明确取舍

Pi 没有内置 filesystem、process、network 或 credential permission system。默认工具与 extensions 继承启动 Pi 的 OS 用户权限。

官方给出的理由值得认真对待：一个局部 in-process sandbox 仍然依赖 host shell、filesystem、package manager、credentials 和 extension code，很容易让用户把不完整限制误认成真实隔离。真正边界应来自操作系统、虚拟机或容器。[Security](https://pi.dev/docs/latest/security)

官方列出的部署方式正好展示了责任如何外移：

- **整个 Pi 进 Docker / OpenShell**：model loop、tools 与 extensions 都在外层隔离中；
- **host Pi + Gondolin micro-VM**：Pi 和 provider credential 留在 host，内置 tools 被路由进 micro-VM；
- **最小挂载与短期凭证**：只给任务所需文件、网络和 keys。

这些方式也有边界：

- read-write bind mount 仍能修改 host workspace；
- 把 `~/.pi/agent` 挂进容器会暴露 auth、settings、trust decision 和 sessions；
- Gondolin 只隔离被转发的 built-in tools，第三方 extension tool 可能继续在 host 执行；
- external sandbox 的 policy、更新、tenant isolation 与 recovery 属于 operator。

Pi 的安全美学不是“安全机制越少越好”。更准确的说法是：**不在无法形成完整边界的层里承诺隔离。** 这个选择很诚实，也让裸跑 Pi 的默认风险直接落到用户身上。

## 那些被拿出 core 的东西，实际去了哪里

| Pi 主动不内置 | 替代路径 | 新的责任所有者 |
|---|---|---|
| Plan Mode | 直接提示、`PLAN.md`、extension | 用户 / workflow author |
| Todo | `TODO.md`、extension | 用户 / 仓库 |
| MCP | CLI + README、Skill、extension | CLI author / package author |
| Subagent | bash、tmux、另一个 Pi、package | 用户 / orchestrator author |
| Permission popup | tool gate extension、外部 policy sandbox | extension / operator |
| Sandbox | Docker、OpenShell、Gondolin、VM | host / platform operator |
| Background Bash | tmux、extension process manager | 用户 / extension |
| Git checkpoint | Git 命令、checkpoint extension | repository owner |
| Completion eval | tests、CI、review、stop extension | 用户 / embedding host |
| Enterprise RBAC / audit | SDK/RPC 外层平台 | integrator / organization |

这张表揭示 Pi 设计的真正审美：它不争夺“唯一正确工作流”的定义权。普通文件、Git、tmux、CLI、container 和 package 都是可替换的外部组件。

问题也在同一张表里。不同 extension 对 context inheritance、权限继承、失败传播、幂等、清理和 UI 可能有完全不同的语义；团队无法只凭“它是 Pi package”推断行为。

## 反事实：把这些能力全部塞回内核

假设 Pi 内置：

- 一套固定 Plan；
- 一个 Todo 状态机；
- 一个 MCP client；
- 一种 subagent 拓扑；
- 一组 permission popup；
- 一个 background process manager；
- 一个 Git checkpoint policy。

用户会获得更完整、一致的开箱体验。团队也更容易写文档、培训和支持。

内核同时要开始回答大量无法通用回答的问题：

- Plan 是否必须由人批准？
- Todo 与模型 context 怎样同步？
- MCP 工具 schema 何时加载？
- 子代理继承哪些 prompt、credentials 与 tools？
- 哪类命令该弹窗，非交互模式怎么办？
- background process 如何恢复、清理和接收 stdin？
- Git 脏工作树由谁 stash，何时 commit？

这些答案会把一个可嵌入 substrate 变成带产品偏好的 coding agent。那未必更差，只是品类已经改变。

Pi 选择把最稳定、可组合的机制留在 core，把组织偏好推到外层。这很像 Unix 的组合取向，但类比只能到这里：Pi extension 不是低权限小进程，默认 Bash 也没有 capability sandbox。Unix 管道的组合性不能替 Pi 自动补上安全隔离。

## 如何用 Pi 审计自己的 Agent 内核

如果你正在写 Agent loop，Pi 提供的价值不是照抄功能列表，而是一套删除测试。

对每项准备进入 core 的能力，问五个问题：

1. **没有它，模型—工具—反馈闭环还能运行吗？**
2. **它表达的是稳定 mechanism，还是某个团队的 workflow 偏好？**
3. **外置后，是否仍有清楚的 API、事件与持久化位置？**
4. **谁接走安全、恢复、兼容与升级责任？**
5. **用户会不会误把一个组合接口当成强隔离边界？**

有些东西适合删除：

- 特定审批文案；
- 特定任务图；
- 特定 provider；
- 特定多 Agent 角色；
- 特定 Git 工作流。

有些东西删掉后必须显式交接：

- abort 与错误传播；
- tool 参数验证；
- provider stop reason；
- session durability；
- extension 启动顺序；
- OS 权限和凭证边界；
- 并发写冲突；
- 外部副作用的幂等与恢复。

最小内核的判断标准因此不该是代码行数。它要让机制可替换，同时让责任有名字。

## 我的判断：Pi 的减法值得借，默认风险不能借

Pi 的强项是把 Agent 重新还原成一条可理解的状态循环。Provider、loop、tools、events、abort 构成小核；coding shell、session tree、resource loader 与 extensions 构成可替换 harness；普通文件和 OS 工具继续承担计划、任务、并发与版本。

这套结构适合熟悉 shell、Git、container 和供应链风险的开发者，也适合想嵌入 SDK/RPC、自选 provider、自建产品层的团队。它不适合未经补强就进入零信任、强审计、中央 RBAC 或多租户环境。

我会借它的三项减法：

- kernel 只拥有稳定 mechanism；
- session state 与 model context 明确分开；
- extension seam 先于内置 workflow。

我不会把安全也理解成可随手删除的产品偏好。裸 Pi 把后果交给当前 OS 用户，extension 又拥有同等权限。若任务包含不可信仓库、长期无人值守或远程副作用，外层 container、credential scope、Git/CI 验收和恢复策略必须先于“极简”到位。

小内核很自由。自由的另一面，是宿主必须真的成为宿主。

## 参考资料

- [Pi v0.84.1 release](https://github.com/earendil-works/pi/releases/tag/v0.84.1)
- [Pi repository at v0.84.1](https://github.com/earendil-works/pi/tree/53fa77ccd8a279eb87e92294ef3687b03ff80112)
- [Pi Agent loop source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent-loop.ts)
- [Pi Agent state source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent.ts)
- [Pi SessionManager source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/session-manager.ts)
- [Pi ResourceLoader source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/resource-loader.ts)
- [Pi AgentSession source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/agent-session.ts)
- [Pi AI types](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/ai/src/types.ts)
- [Pi usage](https://pi.dev/docs/latest/usage)
- [Pi extensions](https://pi.dev/docs/latest/extensions)
- [Pi packages](https://pi.dev/docs/latest/packages)
- [Pi security](https://pi.dev/docs/latest/security)
- [Pi sessions](https://pi.dev/docs/latest/sessions)
- [Pi compaction](https://pi.dev/docs/latest/compaction)
- [Pi containerization](https://pi.dev/docs/latest/containerization)
- [Pi author: Pi coding agent design rationale](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [Pi author: What if you do not need MCP?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)
