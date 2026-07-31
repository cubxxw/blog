---
title: 'Claude Code 实战手册：从验证闭环到并行代理的 10 个配置'
ShowRssButtonInSectionTermList: true
date: 2026-07-20T23:30:00+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: []
tags:
  - AI
  - Agent
  - Automation
  - Harness Engineering
  - Productivity
  - Testing
categories:
  - Development
description: >
  Claude Code 实战手册把官方能力整理成十个改动：精简 CLAUDE.md、建立验证闭环、按风险配置权限、用 worktree 隔离并行任务，正确选择 plan、auto、goal、loop 与 Routines。每节说明适用边界、套餐限制和验收方法，帮助开发者把偶然的好结果沉淀成可重复、可审查的工程系统。
tldr:
  - Plan mode 和 Auto mode 解决不同问题：前者先研究和审计划，后者减少执行时的权限弹窗。复杂、跨模块或高风险任务仍适合先规划，再选择执行模式。
  - Auto mode 是研究预览，只在特定套餐、模型和 Anthropic API 上可用；它有后台安全分类器，但不等于绝对安全，也不能替代敏感操作的人工复核。
  - /goal 适合有明确完成条件的连续工作；/loop 适合会话内定时巡检，循环任务创建 7 天后自动过期；长期任务应使用 Routines、Desktop 定时任务或 GitHub Actions。
  - worktree 负责隔离文件改动，subagent 和 agent team 负责分工协作，agent view 负责管理多个后台会话。它们是不同层次的能力，不该混为一谈。
  - 真正能复利的是把测试、验收证据、权限边界和失败经验写进仓库，让下一次会话也能复用，而非单纯“让模型多跑几轮”。
maturity: mature
cover:
  image: /images/covers/ai-agent/2026/claude-code-boris-121-tips-playbook.jpeg
  alt: 'Claude Code 十项实战配置：验证、权限、上下文、循环与并行代理'
---

## 先把“技巧清单”放到一边

我最初想写一篇 Boris Cherny 用法合集。问题是，社交媒体里的经验会随模型、版本和套餐变化；粉丝站又常把个人观点、尚未公开的功能和统计数字混在一起。今天看起来锋利的结论，几个月后可能只剩一个漂亮的句子。

所以这次我换了一个更笨、也更可靠的办法：**只保留能在 Anthropic 或 Claude Code 官方文档里核验的产品事实；没有原始出处的数字、转述和绝对判断全部删掉。** Boris 的经验仍然是灵感，但不再被当作规格说明。

这也更接近我理解的工程：观点可以很轻，边界必须很重。工具的价值不在“更自动”，在于它能在正确的信任范围里稳定地产生证据。

下文分成三层：

1. **稳定能力**：CLAUDE.md、skills、hooks、worktree、subagent、Plan mode、`/goal`、`/loop` 等，已经有正式文档。
2. **研究预览或实验能力**：Auto mode、agent view、agent teams 等，接口和可用范围仍可能变化。
3. **个人实践**：我怎样把这些能力组合成工作流。这部分是方法，不冒充官方结论。

---

## 改动 1｜把 CLAUDE.md 写成高信号约束

CLAUDE.md 会作为持久指令进入会话。它适合记录 Claude 仅靠读代码不容易稳定推断出的内容：

- 正确的构建、测试、lint 命令；
- 不可违反的架构边界；
- 仓库特有的命名与提交约定；
- 容易重复踩中的坑，以及为什么不能那样做。

目录树、框架简介、可以从 `package.json` 直接读到的脚本，不必大段复制。把上下文当成一块昂贵的工作台，而非仓库宣传册：每放一件东西，都要知道它会帮助哪个决定。

我习惯把 CLAUDE.md 分成三段：

```markdown
# Commands
- Fast check: `bun run typecheck`
- Targeted test: `bun test <path>`
- Before handoff: `bun run lint && bun test`

# Boundaries
- Do not change public API shapes without updating the compatibility tests.
- Never edit generated files; change the generator instead.

# References
- Architecture decisions: @docs/architecture.md
- Release process: @docs/releasing.md
```

目标是减少歧义，不是追求最短。长文可以留在仓库里，需要时再读取；每轮都必须执行的约束，才值得常驻。

可直接交给 Claude Code：

```text
审查这个仓库的 CLAUDE.md。保留无法从代码直接推断的命令、边界和坑；
删除重复介绍；把低频长文移到 docs/，在 CLAUDE.md 留清晰索引。
修改前先列出保留、迁移、删除三类内容，修改后运行仓库现有检查。
```

---

## 改动 2｜让“完成”带着证据回来

模型说“已经修好”，只是一个陈述。测试退出码、真实请求、浏览器交互和构建产物，才是证据。

验证方式应该贴着交付物：

| 改动 | 最低限度的验证 |
|---|---|
| 后端接口 | 启动服务，发送真实请求，检查状态码和响应体 |
| 前端页面 | 打开受影响页面，走一遍交互，检查 console 和视觉结果 |
| CLI | 真实执行成功与失败路径，检查退出码和输出 |
| 配置 / CI | 运行解析器或本地等价命令，确认配置被实际加载 |
| 文档 | 构建站点，检查链接、代码块和页面渲染 |

把重复的验收流程写成 skill，比每次临时提醒更稳：

```markdown
---
name: verify-change
description: 在任何准备宣布改动完成、交付或提交 PR 的时候使用。
---

先识别受影响的用户路径，再执行最接近真实使用的检查。
同时运行仓库要求的静态检查与测试。
失败时修复并重跑受影响的完整验证链。
最后列出命令、退出码、实际观察和未覆盖风险。
```

这里最重要的是让输出可审计，单纯“多测几次”远远不够。未来的自己不必相信本轮会话的语气，只需读证据。

---

## 改动 3｜Plan mode 没有过时，它和 Auto mode 不是同一件事

官方文档给两者的定义很清楚：

- **Plan mode**：Claude 可以读取文件、运行探索命令并提出计划，但不会编辑源码。适合在动手前理解代码、比较方案和审查影响面。
- **Auto mode**：执行时不再逐项弹权限确认，由独立分类器在后台审查动作。适合方向已经可信、任务较长、权限弹窗会频繁打断的工作。

因此，“Auto mode 取代 Plan mode”是一个错误二分。复杂任务完全可以这样走：

```text
Plan mode：调查现状 → 列出方案与风险 → 我审计划
执行阶段：按风险选择 default / acceptEdits / auto
验证阶段：测试、构建、真实交互 → 查看 diff
```

官方 Desktop 文档仍明确建议复杂任务从 Plan mode 开始。计划的价值也不取决于某一代模型“会不会思考”，而在于它把高成本决定提前暴露给人审查。跨模块迁移、数据模型变化、权限系统改造，我仍会先计划；一个局部错字或已有模式下的小修复，不必为了仪式感写长计划。

Plan mode 是决定“怎么做”；权限模式是决定“做的时候哪些动作要问我”。把两者分开，选择才不会混乱。

---

## 改动 4｜Auto mode 要连同限制一起介绍

截至本文复核时，Auto mode 仍是**研究预览**，需要 Claude Code v2.1.83 或更高版本。它不是所有用户、模型和提供商都能使用：

- 套餐：Max、Team、Enterprise 或 API；Pro 不支持；
- Team / Enterprise：管理员还需要显式启用；
- 模型：Team、Enterprise 和 API 支持 Sonnet 4.6、Opus 4.6、Opus 4.7；Max 仅支持 Opus 4.7；
- 提供商：仅 Anthropic API；Bedrock、Vertex AI 和 Microsoft Foundry 不支持。

它会让独立分类器在工具执行前检查越权、陌生基础设施和可疑外部内容。这个设计能减少“机械地点同意”，但官方也写得很克制：**它不保证安全，不是敏感操作免审的理由。**

我的分级做法是：

1. 默认模式处理陌生仓库和敏感数据；
2. `acceptEdits` 用于我愿意事后通过 diff 审查的常规改动；
3. Plan mode 用于先探索、暂不写入；
4. Auto mode 只用于目标明确、仓库可信、可回滚且有验证闭环的长任务；
5. `bypassPermissions` 只在隔离容器或虚拟机里使用。

还可以用 `.claude/settings.json` 明确常见边界：

```json
{
  "permissions": {
    "allow": [
      "Bash(bun run typecheck:*)",
      "Bash(bun test:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

白名单的目的，是把注意力留给真正异常的动作，而非追求“零弹窗”。任何涉及生产环境、密钥、外部发送或不可逆变更的命令，都不该因为自动化顺手就被放行。

---

## 改动 5｜并行之前，先用 worktree 隔离

并行代理最常见的失败并不神秘：两个会话同时改一个工作区，最后谁都不知道冲突来自业务还是并发。

Claude Code 的正式能力是：

```bash
claude --worktree feature-auth
# 简写
claude -w feature-auth
```

它会在 `.claude/worktrees/` 下创建隔离工作树和分支。subagent 也可以声明：

```markdown
---
name: migration-worker
description: 处理可独立验证的迁移批次。
isolation: worktree
---
```

但 worktree 只解决**文件隔离**，不解决任务依赖。适合并行的任务通常具备三点：

- 文件或模块边界清楚；
- 输入输出契约已经确定；
- 每个分支都能独立验证。

数据库迁移顺序、共享接口改名、同一份生成文件，则更适合串行或先确定契约再分派。

我把并行理解为债务提前支付：先花时间切边界、写验收，再换回吞吐。边界没写清时开十个 agent，只是把一个模糊问题复制十份。

---

## 改动 6｜分清 subagent、agent view 和 agent teams

这三个名称很像，职责不同。

| 能力 | 状态 | 适合场景 |
|---|---|---|
| subagent | 正式能力 | 在当前会话内委派一个有独立上下文、工具和提示的专门任务 |
| agent view | 研究预览 | 从 `claude agents` 管理多个后台会话，查看谁在运行、阻塞或完成 |
| agent teams | 实验功能，默认关闭 | 多个会话共享任务清单并互相通信，由 lead 协调 |

agent view 需要 v2.1.139 或更高版本。后台会话仍运行在本机，机器休眠或关机会停止；使用独立 worktree 的会话被删除时，工作树也会删除，所以应先合并或推送需要保留的改动。

agent teams 需要设置 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。它会显著增加 token 消耗，而且 teammates 默认不靠 worktree 隔离；如果不同 agent 会编辑相同文件，就必须先划清所有权。

我的选择顺序很朴素：

1. 能由一个会话完成，就不组队；
2. 需要专门审查、调研或测试时，用 subagent；
3. 多个独立任务需要人在控制台统一看状态时，用 agent view；
4. 任务之间真的需要通信和动态协调时，才考虑 agent teams。

“更多 agent”从来不是质量指标。验证者与实现者分开、任务边界不重叠，才是。

---

## 改动 7｜上下文管理不是补一句“不是这样”

当一条路线已经证明错误，继续在原会话里叠加纠正，会让失败代码、旧假设和新目标同时存在。Claude Code 提供了几种不同力度的工具：

- `/rewind`：回到检查点，恢复代码、对话或两者；
- `/compact`：压缩当前会话，保留摘要继续工作；
- `/clear`：开始新的对话；
- “Summarize from here”：从某个消息位置生成摘要。

我的判据：

- 实现路线错了，但调查结果仍有价值：先总结经验，再 rewind；
- 任务仍相同，只是上下文过长：带明确重点 compact；
- 目标已经改变：写一段交接简报，然后 clear。

交接简报至少包含：

```text
Goal:
Constraints:
Acceptance criteria:
Confirmed facts:
Rejected approaches and reasons:
Next action:
```

不要依赖未经官方说明的固定 token 阈值。模型、上下文窗口和压缩策略都会变；比数字更稳定的信号是：同一事实反复解释、工具输出淹没决策、Claude 开始引用已经被否定的方案。看到这些信号，就该整理现场。

---

## 改动 8｜把高频动作固化成 skill，而不是神化 skill

Skill 是一组可复用的说明和资源。它适合封装仓库特有、需要多次执行、且能明确判断何时触发的流程，例如：

- 发布前检查；
- 数据库迁移验收；
- UI 回归验证；
- 事故排查 runbook；
- 团队内部 API 的正确用法。

一个好 skill 的骨架通常很小：

```markdown
---
name: verify-release
description: 当准备创建版本、发布或生成 changelog 时使用。
---

# Required checks
...

# Gotchas
...

# Evidence
...
```

`description` 要说明“何时用”，正文说明“默认行为不足在哪里”。长参考资料可以放在同目录，由 `SKILL.md` 指向。第三方 skill 在安装前必须阅读，因为它可能携带工具权限、hooks 或外部依赖；“听起来像专家”不是信任依据。

我还会定期做减法：

- 这个 skill 最近是否被触发过？
- 它与 CLAUDE.md 是否重复？
- 它的命令是否仍能运行？
- 能否用测试、lint 或 CI 取代文字提醒？

经验应该沉淀，但沉淀物也会淤塞。能复利的系统既会记住，也知道什么时候忘掉。

---

## 改动 9｜用 /goal 管完成条件，用 /loop 管时间

这两个命令最容易被混用。

### `/goal`：上一轮结束后检查“完成了吗”

`/goal` 设置一个会话级完成条件。每轮结束后，一个默认使用 Haiku 的小型快速模型读取条件和对话记录，返回是否达成；如果未达成，Claude 会开始下一轮。

```text
/goal test/auth 下的测试全部通过，lint 退出码为 0；
每轮都必须把实际命令和结果写进对话；最多运行 12 轮。
```

评估器**不会调用工具，也不会独立读取文件**。因此条件必须要求 Claude 把证据放进对话。`/goal` 适合明确、可测量的终点，不适合“做到最好”“看起来专业”这类主观要求。

Auto mode 与 `/goal` 互补：前者减少一轮内部的工具权限弹窗，后者决定一轮结束后是否继续。两者都不能替代测试。

### `/loop`：时间到了再运行

`/loop` 是当前会话里的定时任务：

```text
/loop 5m 检查当前 PR；若 CI 失败则读取日志并修复，若有新 review 则处理
```

它需要会话保持打开，本机也要保持运行。恢复会话时，未过期任务可以恢复。**循环任务创建 7 天后会自动执行最后一次并删除**，不是 3 天，也不是永久任务。最短间隔为 1 分钟。

因此：

- 明确完成条件、希望连续推进：`/goal`；
- 当前会话内短期轮询：`/loop`；
- 需要跨重启、长期稳定运行：Routines、Desktop 定时任务或 GitHub Actions。

这条边界比任何“让它一直跑”的口号都重要。无人值守更需要写清期限、成本和退出条件。

---

## 改动 10｜把 Routines 当成独立运行的自动化

Routines 是 Claude Code on the web 的持久自动化：可以按计划、API 调用或 GitHub 事件触发，在 Anthropic 管理的云端环境执行。它与 `/loop` 的关键差别是，**不依赖当前终端会话或本机持续在线**。

适合 Routines 的任务：

- 每天整理 issue 或反馈；
- 定时运行仓库维护；
- GitHub 事件触发的审查与修复；
- 需要连接云端服务、但不依赖本机未提交文件的流程。

不适合直接迁移过去的任务：

- 必须读取本机工作区或本地数据库；
- 需要人工批准敏感动作；
- 没有成本上限和退出条件；
- 依赖尚未提交的环境状态。

创建前我会写一张很短的运行契约：

```text
Trigger:
Inputs:
Allowed systems:
Expected artifact:
Verification:
Maximum scope:
Escalation condition:
```

Routines 已有正式文档，但它与 Auto mode、agent view 不属于同一种“预览状态”。文章里把所有新能力笼统叫 research preview，会让读者误判成熟度；本文只在官方明确标注时使用这个词。

---

## 一套我真正会执行的顺序

如果今晚只花两小时，我不会先追求多代理。顺序是：

1. **补验证**：找出这类改动真实的验收路径；
2. **清 CLAUDE.md**：让高信号约束常驻，长资料按需读取；
3. **设权限边界**：预授权只读、构建和测试，危险动作明确拒绝；
4. **复杂任务先 Plan**：先把不可逆决定暴露出来；
5. **需要并行再切 worktree**：先隔离，再分派；
6. **有明确终点用 `/goal`**：证据必须出现在对话里；
7. **短期巡检用 `/loop`**：记住 7 天到期和本机在线限制；
8. **长期任务才上 Routines**：给触发器、范围、预算和升级条件。

可以把它压成一句话：

> 先让一次改动可验证，再让十个代理并行。

这是我从这些功能里留下的“笨原则”。模型会变，命令会变，套餐也会变；可回滚、可验证、可追责的工作方式不会突然失效。

---

## 官方资料与复核日期

本文于 **2026 年 7 月 31 日**按以下 Claude Code / Anthropic 官方资料复核。涉及研究预览、版本、模型和套餐的内容可能继续变化，使用前应再查看对应页面。

- [Permission modes：Plan mode、Auto mode 与可用范围](https://code.claude.com/docs/en/permission-modes)
- [Keep Claude working toward a goal：`/goal` 机制与评估器边界](https://code.claude.com/docs/en/goal)
- [Run prompts on a schedule：`/loop`、7 天到期与长期调度选择](https://code.claude.com/docs/en/scheduled-tasks)
- [Run parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees)
- [Run agents in parallel：subagent、agent view、agent teams 与 worktree 的分工](https://code.claude.com/docs/en/agents)
- [Manage multiple agents with agent view：研究预览与限制](https://code.claude.com/docs/en/agent-view)
- [Orchestrate teams of Claude Code sessions：实验开关与协作方式](https://code.claude.com/docs/en/agent-teams)
- [Automate work with routines](https://code.claude.com/docs/en/routines)
- [Claude Code Desktop：复杂任务的 Plan mode 建议](https://code.claude.com/docs/en/desktop)
- [Beyond permission prompts：Anthropic 的沙箱安全设计](https://www.anthropic.com/engineering/claude-code-sandboxing)

同系列可继续读：[把提示词写成循环](../prompt-loop-engineering-practice/)、[Agent Engineering 全景地图](../agent-engineering-the-98-percent-harness/)、[Context 不是 Prompt](../context-engineering-the-new-foundation/)、[如何设计一套有价值的 Skill](../designing-valuable-agent-skills/)。
