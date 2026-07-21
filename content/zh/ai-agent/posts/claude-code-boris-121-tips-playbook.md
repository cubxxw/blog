---
title: 'Claude Code 之父的 121 条用法：我把它拆成了 10 个今晚就能改的配置'
ShowRssButtonInSectionTermList: true
date: '2026-07-20T23:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ['Claude Code', 'Boris Cherny', 'CLAUDE.md', 'git worktree', 'auto mode', 'plan mode', 'subagent', 'hooks', 'skill', 'slash command', '/goal', '/loop', '/checkup', 'dynamic workflow', 'context minimalism', 'verification', '验证闭环', 'AI 编程', 'Agent 工程']
tags:
  - AI
  - Agent
  - LLM
  - Automation
  - Harness Engineering
  - Productivity
  - Testing
description: >
  howborisusesclaudecode.com 收了 Claude Code 作者 Boris Cherny 和团队从 2026 年 1 月到 7 月的 121 条一线用法。我把 21 卷全部读完，发现它真正的价值不是技巧清单，而是一条半年内被三次推翻又重建的演进轨迹。这篇把它压成 10 个可以直接抄进 .claude/ 的配置，每个后面附一条可复制的指令——粘给 Claude Code，它自己就把改动做完了。
tldr:
  - 这半年里 Boris 亲手推翻了自己的三条建议：plan mode 被 auto mode 取代、context engineering 被 context minimalism 取代、workflow 的触发词从「workflow」改成「use a workflow」。读这份清单要看日期，不要当教条。
  - 121 条里只有一条从第一卷活到最后一卷没被修正过：给 Claude 一个能自己验收的闭环。Boris 说它值 2-3 倍质量，Thariq 说团队最好的工程师都在做验证，Fable 5 最被称道的能力也是自我验证。
  - 最反直觉的一条是 auto mode 比逐条读权限弹窗更安全——「当你 99% 都点同意，你的眼睛就会发直」。分级放行让你只在真正重要的地方停一次。
  - 「写下来，别重说一遍」是长跑的全部秘密：聊天里的纠正只修这一轮，写进 CLAUDE.md 或 skill 才修掉未来每一轮。Boris 原话是「如果你能做到这个，Claude 就能一直跑下去」。
  - 但写下来的东西会发霉。Boris 自己跑 /checkup，查出 38 个 skill 在 2345 次会话里从没被调用过，CLAUDE.md 每次会话吃掉 1 万 token。加法要配一套减法。
  - 最后一卷的收尾句最狠：一个被打回的 PR，是自动化的失败——那份知识本该在基础设施里，而不是在 reviewer 的脑子里。
maturity: budding
cover:
  image: /images/covers/ai-agent/2026/claude-code-boris-121-tips-playbook.jpeg
  alt: '121 条一线用法压缩成 10 个可落地配置——从技巧清单到 .claude 目录'
---

## 一份被自己人反复推翻的清单

有个叫 [howborisusesclaudecode.com](https://howborisusesclaudecode.com/) 的站点，把 Claude Code 作者 Boris Cherny 和 Anthropic 团队公开过的用法全收进去了。到今天是 **121 条，21 卷**，时间跨度从 2026 年 1 月 2 日的第一条推文，到 7 月 15 日的最新一条。

我花了一晚上把 21 卷全读完。读之前以为是一份技巧清单，读完发现不是——**它的信息量在版本差里**。

同一个人，在同一个话题上，半年内改了三次口径：

- **1 月**：「大部分会话都从 plan mode 开始」。**6 月**：「我不用 plan mode 了。新模型不需要那个规划步骤。」
- **1 月**：往 CLAUDE.md 里疯狂加规则。**7 月**：自己跑体检，发现 CLAUDE.md 每次会话吃掉 1 万 token，其中一大半该删。
- **5 月 28 日**：说 prompt 里提到 `workflow` 就能触发动态工作流。**6 月 9 日**：「说『use a workflow』。光说『workflow』误触发太多。」

这种自我推翻不是缺点，是这份清单最值钱的地方。它记录的不是「正确答案」，是**一套方法论在半年里被模型能力推着往前跑的轨迹**。你抄的时候要看日期，不能当教条。

先说清来源：这站是粉丝做的（作者 [@carolinacherry](https://github.com/carolinacherry)），不是 Anthropic 官方；内容里混着不少 research preview（动态工作流、agent view、Routines、Dreaming），随时可能变。下面凡是预览特性我都会标出来。

至于为什么值得抄这份作业——同站的 Claudeonomics 页面在数公开 GitHub 上带 AI 提交尾注的 commit：Claude Code 最新一周 **364 万次提交**，累计 7250 万次。注意口径，那个 99.7% 是**在它追踪的 6 个 agent 之间**的份额，不是 GitHub 全站份额，站方自己也把这条写进了方法论警告里。但即便打足折扣，这个量级意味着一件事：**这套用法已经在极大的样本上跑过了。**

---

## 半年里的三次转弯，和唯一没变的那条

在进入十个改动之前，先把主线拉出来。这是我认为读完 121 条之后最值得留下的东西。

### 转弯一：从「先规划」到「直接跑」

Boris 在第 1 卷把 plan mode 列为核心习惯：shift+tab 两次进规划，反复迭代直到计划扎实，再切自动接受。第 2 卷加码：「把精力全砸在计划上，让 Claude 一次成功」，还有人专门开第二个 Claude 以 staff engineer 的身份 review 计划。

到了 6 月的一年复盘，他原话是：

> 「以前是 plan mode。我现在不用了。我用 auto mode 代替它。新模型其实不需要那个规划步骤——它对 Opus 4 到 4.5 非常重要，但从 4.6 开始，尤其是 4.7，就不需要了。」

**判据不是「哪个功能更好」，是「你在用哪代模型」。** 老模型需要一份显式的计划来防跑偏；4.6 之后模型自己会隐式规划，那一步就变成了纯开销——一份你得先审完才能开工的中间产物。

有人保留 plan mode 是为了那份可归档的书面产物，这也完全成立。但如果你保留它的理由是「怕它跑歪」，那可以试着松手了。

### 转弯二：从「喂饱它」到「少说话」

这条更根本。一年复盘里专门有一章叫「从上下文工程到上下文极简主义」：

> Sonnet 3.5 是 **prompt engineering** 的时代。Opus 4 是 **context engineering** 的时代。今天的模型两者都不需要。
> 「你给它最小的系统提示、最小的工具集，然后让模型自己想办法。你只需要给它一条能自己拉取上下文的路。」——Boris

Cat Wu 补了一句更锋利的：

> 「我是个上下文极简主义者。只告诉模型它需要知道的，剩下的让它自己搞明白。你给太多上下文的时候，其实是在微观管理它——有时候模型知道一条更好的路通向同一个结果。」

我之前写过[《Context 不是 Prompt》](../context-engineering-the-new-foundation/)，讲的是上下文工程为什么成了新地基。这条转弯不推翻它，是给它加了个上限：**上下文工程解决的是「模型拿不到该拿的东西」，一旦它能自己拿，你继续往里塞就变成了噪声。**

要注意「极简」不等于「含糊」。给目标，不给微操步骤——这是两件事。

### 转弯三：从「用好一个 agent」到「经营一支舰队」

这条是渐进的，能看出清晰的阶梯：

| 时间 | 能力 | 你交出去的是 |
|---|---|---|
| 1 月 | 5 个终端标签页 + 5 个 git checkout | 手工切窗口 |
| 2 月 | `claude --worktree` 原生隔离 | 环境冲突 |
| 3 月 | `/loop`、`/schedule` | 触发器 |
| 5 月 | `claude agents` 控制面、`/goal` | 停机条件 |
| 5–6 月 | 动态工作流、嵌套子代理 | 编排本身 |
| 7 月 | Routines、事件驱动 | 提示词本身 |

半年时间，从「你手动切五个终端」走到「事件触发、云端执行、无人在场」。

### 唯一没被推翻的：验证

第 1 卷第 13 条，Boris 标注为「最重要的一条」：

> 「要从 Claude Code 拿到好结果，最重要的事大概就是——**给 Claude 一个能验证自己工作的办法**。如果 Claude 有那个反馈闭环，最终结果的质量会翻 2 到 3 倍。」

半年后，Thariq 在 5 月的 workshop 上说：「鉴于 agent 写代码已经这么好了，最该投入的就是验证。**Claude Code 团队最有才华的工程师都在做验证。**」

再半年后 Fable 5 发布，Boris 夸它的第一件事还是这个：

> 「它是我用过的第一个如此有条理、如此精确的模型——会做测量、加日志，然后**验证自己真的修好了才宣布胜利**。Claude Code 的提示词里没有任何一句让它这么做，这就是它性格的一部分。」

一条建议，在半年里被功能迭代验证了三遍，一次没被修正。**如果这篇你只抄一条，抄第二个改动。**

---

下面是十个改动。每一个的结构都一样：为什么、抄什么、以及最后一个代码块——**那是可以直接粘给 Claude Code 的指令，它会自己把这个改动做完**。

---

## 改动 1｜把 CLAUDE.md 从「说明书」改成「错题本」

大多数人的 CLAUDE.md 写成了项目说明：技术栈是什么、目录结构长什么样、这个项目是干嘛的。这些内容 Claude 读一遍代码就知道了，写进去是浪费。

Boris 团队的 CLAUDE.md 是另一种东西。第 1 卷第 4 条：

> 「任何时候我们看到 Claude 做错了什么，就把它加进 CLAUDE.md，这样 Claude 下次就知道别那么干。」

到了 6 月的一年复盘，这条被升级成他心里最重要的一条：

> 「每一次 Claude 犯错，我都不是让它换个做法。我让它**写进 CLAUDE.md，或者做成一个 skill**。如果你能做到这个，Claude 就能一直跑下去。」

区别在哪：**聊天里的纠正是补丁，只修这一轮；写进文件是修复，修掉未来每一轮。** 前者的错误率每次会话都重置，后者的错误率单调下降。

他们真实的 CLAUDE.md 长这样——注意里面几乎全是**命令**和**禁令**，没有一句在介绍项目：

```markdown
# Development Workflow

**Always use `bun`, not `npm`.**

# 1. Make changes
# 2. Typecheck (fast)
bun run typecheck
# 3. Run tests
bun run test -- -t "test name"     # Single suite
bun run test:file -- "glob"        # Specific files
# 4. Lint before committing
bun run lint:file -- "file1.ts"    # Specific files
bun run lint                       # All files
# 5. Before creating PR
bun run lint:claude && bun run test
```

禁令部分来自 code review。他们用 GitHub Action（`/install-github-action`），在 PR 上直接 at 机器人把当次学到的东西沉进去：

```text
nit: use a string literal, not ts enum
@claude add to CLAUDE.md to never use enums, always prefer literal unions
```

Claude 自己去改 CLAUDE.md 并提交：*「Prefer `type` over `interface`; never use `enum` (use string literal unions instead)」*。Boris 管这个叫他们版本的 **Compounding Engineering**。

**但加法必须配减法。** 7 月 8 日他跑 `/checkup` 体检自己的设置，结果是 CLAUDE.md 每次会话加载约 1 万 token。所以正确的结构是三段：命令清单、禁令清单、其余全部懒加载。

```text
读一遍我的 CLAUDE.md，按三段重构它：

(1) 命令清单——typecheck / test / lint / build 的确切命令，标注什么时候用哪个
(2) 禁令清单——一条一行的「不要做什么」，每条后面附一句为什么
(3) 其余长内容抽到 .claude/docs/*.md，CLAUDE.md 里只留一行指路

重构完告诉我它现在占多少 token，以及你删掉了哪些从来没有实际约束力的条目。
```

---

## 改动 2｜给 Claude 一个能自己验收的闭环

这是全站唯一一条从头活到尾没被修正的原则，所以值得多写几行。

Boris 给的类比很好：**你让一个人做网站，但不许他打开浏览器，结果会好看吗？** 大概率不会。但给他浏览器，他会一直改到看着顺眼为止。模型也一样——它不是不想改好，是你没给它「看见结果」的通道。

验证按域分工，这张表直接抄：

| 域 | 给它什么 |
|---|---|
| 后端 / 服务 | 确保它知道**怎么启动你的服务**并打真实请求 |
| 前端 | Chrome 扩展（Boris：「比其他类似的 MCP 更可靠」，且比 Playwright「更强也更省 token」） |
| 移动端 | iOS / Android 模拟器 MCP |
| 桌面端 | computer use |
| CLI / 脚本 | bash 直接跑，比什么都准 |

Boris 现在的日常是把这一整套折成一个 skill 叫 `/go`，他说「我很多提示词长这样：『Claude 干这个干那个 /go』」。`/go` 做三件事：端到端自测 → 跑 `/simplify` → 提 PR。

关于「该写脚本测试还是让 Claude 现场测」，他的答案是**都要**：一次性的检查让 Claude 现场驱动；以后每个 PR 都要跑的，让它写成真的测试。

第 19 卷给了一段可以直接改写的 skill 提示词，这是原文的意思：

```markdown
---
name: verify-change
description: 验证一次改动是否真的可用。任何声称「改完了」的时刻都应该先跑它。
---

绝不允许仅凭「编辑成功」就宣布 UI 改动完成。

1. 启动开发服务器
2. 打开受影响的页面
3. 真实交互一遍这次改动涉及的路径
4. 确认零新增 console 报错
5. 跑一次性能 trace

任何一步失败：修它，然后**从第 1 步重新跑一遍**。
每一步都要把证据打印出来——没有出现在输出里的成功，不算成功。
```

最后一句是我加的，但它有依据。`/goal` 的评估器只读对话记录、不调用工具，这个约束我在[《把提示词写成循环》](../prompt-loop-engineering-practice/)里展开过。

```text
在 .claude/skills/verify-change/SKILL.md 里给我写一个验证技能。

先判断改动属于哪个域（后端 / 前端 / CLI / 文档），然后执行对应的端到端检查：
- 后端：启动服务，打真实请求，断言状态码和响应体
- 前端：启动 dev server，打开页面，交互一遍，确认零新增 console 报错
- CLI：真实执行命令，检查退出码和输出

任何一步失败就修，修完从第一步重跑。禁止仅凭「编辑成功」宣布完成。
每一步都必须把证据打印出来。
```

---

## 改动 3｜把权限从「每次点同意」换成分级放行

大部分人在两个极端之间摇摆：要么每次都点同意，要么直接 `--dangerously-skip-permissions` 一把梭。中间地带其实很宽。

**第一层，预授权安全命令。** Boris 明确说他不用 `--dangerously-skip-permissions`，而是用 `/permissions` 把常用安全命令预先放行，配置进 `.claude/settings.json` 跟着 git 走。支持完整通配符：

```json
{
  "permissions": {
    "allow": [
      "Bash(bun run typecheck:*)",
      "Bash(bun run test:*)",
      "Bash(bun run lint:*)",
      "Bash(gh pr diff:*)",
      "Bash(gh pr list:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Edit(docs/**)"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

**第二层，`/fewer-permission-prompts`。** 这个 skill 会扫你的历史会话，找出那些安全但反复弹窗的命令，直接给出建议清单。不用自己回忆。

**第三层，沙箱。** `/sandbox` 开启开源沙箱运行时，在你自己机器上做文件和网络隔离，安全性上去了，弹窗反而少了。

**第四层，auto mode。** 这是最反直觉的一条。它把每个动作路由给一个分类器判断安全性，而不是问你。Boris 的论证是：

> 「当你 99% 的请求都点同意的时候，你的眼睛就会发直。**auto mode 比逐条读权限弹窗更安全**，因为它意味着你只需要关注最重要的那一件事。」

它是怎么硬化的：团队收集了**数千份完整 agent 会话记录**加上对应的权限请求，让 auto mode 逐条分类安全与否；然后请红队来做提示注入和攻击；**这些攻击又变成 evals**，一直调到全部拦住为止。

这套值不值得信任，你自己判断。但它的意义超出安全本身——**Boris 说正因为信任它，他才能让一个 agent 跑起来之后立刻去开第二个。信任是并行的前提。**

```text
统计我最近的会话里被权限弹窗打断最多的命令。

把其中确定安全的（只读、构建、测试、格式化、git 只读操作）用通配符写进
.claude/settings.json 的 permissions.allow；
把危险的（force push、rm -rf、任何直接写生产环境的命令）写进 deny。

改完把 diff 给我看，逐条说明为什么放进 allow。有疑问的先别加，单独列出来问我。
```

---

## 改动 4｜worktree：把一个你变成五个你的最短路径

第 1 卷第 1 条就是并行：Boris 在终端里同时跑 5 个 Claude Code，用 5 个独立 checkout，标签页编号 1-5，配 iTerm2 通知知道哪个在等输入。第 2 卷团队投票，这是**最大的生产力解锁**。

2 月 20 日这件事被做进产品，不用手工管理 checkout 了：

```bash
# 起一个隔离的 worktree 会话
claude --worktree my-feature

# 顺便丢进独立 tmux
claude --worktree my-feature --tmux

# 简写
claude -w
```

子代理也能用隔离，这在批量迁移时特别有用：

```markdown
# .claude/agents/worktree-worker.md
---
name: worktree-worker
model: haiku
isolation: worktree
---
```

或者直接说出来：

```text
把所有同步 IO 迁到异步。分批处理，起 10 个并行 agent 带 worktree 隔离。
每个 agent 都要端到端测自己的改动，然后各自提一个 PR。
```

**用 Mercurial / Perforce / SVN 的不用眼馋**，定义 worktree hook 就行：

```json
{
  "hooks": {
    "WorktreeCreate": [
      { "command": "jj workspace add \"$(cat /dev/stdin | jq -r '.name')\"" }
    ],
    "WorktreeRemove": [
      { "command": "jj workspace forget \"$(cat /dev/stdin | jq -r '.worktree_path')\"" }
    ]
  }
}
```

并行到一定数量，你会开始分不清哪个窗口在干嘛。5 月 11 日的 `claude agents` 就是解这个的——Thariq 形容它「像是为 Claude Code 做的 tmux」，Boris 说它是**从 1 个 agent 升级到多个 agent 的最好方式**。会话按状态分三组：需要你输入、还在干活、已完成。

配套的几个小工具都值得开：`--name` 启动时命名、plan mode 之后自动命名、`/color` 给不同会话上色、`/rename` 随时改名。Dickson Tsai 的提醒很实在：**会话一多，改名就成了刚需**，可以用 `UserPromptSubmit` hook 自动改。

```text
把这个仓库改成能同时跑 4 个 Claude：

1. 给我一段 shell 函数，一条命令开新 worktree 并在里面启动会话（带 --name）
2. 一个 .claude/agents/ 下 isolation: worktree 的 agent 模板
3. 检查 .gitignore 会不会把 worktree 目录漏进版本库

顺便告诉我我这个项目里哪些任务适合并行、哪些必须串行（比如共享的 migration）。
```

---

## 改动 5｜上下文管理：回退，而不是纠正

这一节的四条来自 Thariq，都是能立刻改掉的习惯。

**第一条，用 `/rewind`，别用「刚才那样不行，换个思路」。**

Thariq 说这是判断一个人上下文管理水平的单一信号。算一笔账就懂了：

- **纠正**：上下文 = 读的文件 + 失败的尝试 + 你的纠正 + 最终修复
- **回退**：上下文 = 读的文件 + 一条更聪明的提示 + 最终修复

失败的那次尝试永远留在窗口里污染后面每一轮。命令是 `/rewind`，终端里双击 Esc。

进阶技巧：回退之前先说 **"summarize from here"**，让 Claude 把这一段学到的东西写成一条交接信息——**一封下一轮的 Claude 写给过去的自己的信**。

**第二条，`/compact` 和 `/clear` 不是一回事。**

- `/compact` 是**有损的模型摘要**：Claude 自己决定什么重要。便宜、保持惯性、细节会糊。可以给提示引导它：`/compact focus on the auth refactor, drop the test debugging`
- `/clear` 是**你亲手写的简报**：你把「我们在重构 auth 中间件，约束是 X，涉及文件 A 和 B，已经排除了方案 Y」写下来，然后干净重开。费事，但上下文是你亲自定的

判据：**真的换任务 → `/clear` 开新会话；相关任务还需要一些上下文 → 带提示的 `/compact`。**

**第三条，主动把自动压缩的阈值调低。**

上下文腐烂（context rot，模型性能随上下文增长而衰减）在 100 万上下文的模型上大约从 **30 万到 40 万 token** 开始。Thariq 推荐的折中：

```bash
CLAUDE_CODE_AUTO_COMPACT_WINDOW=400000 claude
```

逻辑是：上下文窗口是硬截断，逼近尾部时你**被迫**压缩——而那时模型已经在腐烂区了。提前压缩，意味着压缩发生在模型还清醒的时候。

**第四条，第一轮就给全上下文。** Cat Wu 的三件套：

```text
Goal: 给 /api/login 加限流

Constraints:
- 不动数据库 schema
- 保持现有 auth 流程不变
- 用 Redis（已经配好了）

Acceptance criteria:
- 每 IP 每分钟 5 次，超限返回 429
- 现有测试全绿
- 新增一个限流行为的测试用例
```

如果开局只说「加个限流」，它会做一堆假设，而**每一次纠正都要付上下文的钱**。

```text
帮我做一次上下文体检：这个会话里哪些内容已经没用了——失败的尝试、读了但没用上的文件、重复的工具输出？

给我两样东西：
1. 一个 /rewind 的回退点建议，说明为什么退到那里
2. 一段可以直接粘贴的交接简报，让下一个干净会话不用重读这些文件就能接上，
   包含：当前目标、已确认的约束、已经排除的方案和排除的原因、下一步动作
```

---

## 改动 6｜停止微观管理，改成写委派简报

Cat Wu 的一句话把这件事说透了：

> 「把它当成一个你委派任务的工程师，而不是一个你逐行指导的结对搭档。」

旧工作流是：描述一步 → 看输出 → 纠正 → 描述下一步。中断频率极高，你始终在回路里。新工作流是：写一份清晰的简报 → 启动 → 等它做完，或者等它问出一个真问题。

配套的判断标准很有用：**当 Claude 问太多澄清问题或者跑偏，通常说明你的简报不完整，而不是模型需要更多牵引。**

我在[《给 AI 任务，别给方向》](../give-ai-tasks-not-directions/)里写过这条原则的单轮版本。第 18 卷给了它一个更结构化的框架——Thariq 把 Rumsfeld 矩阵搬到了提示词上：

| | 是什么 | 怎么处理 |
|---|---|---|
| **已知的已知** | 你写进提示词的 | 直接写清楚 |
| **已知的未知** | 你知道自己不知道的 | 让 Claude 采访你 |
| **未知的已知** | 「看到就认得，但写不出来」 | 让它做原型给你选 |
| **未知的未知** | 你压根没想过的坑 | 让它做盲点扫描 |

他给的四条原话可以直接抄：

**盲点扫描**——他用的字面词就是 "blindspot pass"：

```text
我要给这个项目加一个新的认证提供方，但我对这个代码库的 auth 模块一无所知。
你能做一次 blindspot pass，帮我找出相关的未知的未知，让我能更好地给你提示吗？
```

**原型**——对付「看到才认得」的需求，比如视觉设计：

```text
我想给这份数据做个仪表盘，但我没什么审美，也不知道能做成什么样。
给我做一个 HTML 页面，放 4 个差异极大的设计方向，让我挑。
```

**采访**——这是 Thariq 在 workshop 上说的「提示词的魔法词」：

```text
一次问我一个问题，把模糊的地方问清楚，优先问那些我的回答会改变架构的问题。
```

含糊任务大概会被问 **30 到 40 个问题、分好几轮**。他在现场演示时故意给了一个极糊的提示——「给我做个分账单的 app」，Claude 立刻反问：用户是谁？室友还是旅行团？要不要多币种？什么时候收钱？

**实现计划**——把最可能被你改的部分排前面：

```text
写一份 HTML 格式的实现计划，但要把我最可能想改的决策放最前面：
数据模型变更、新的类型接口、以及任何用户可见的东西。
机械性的重构埋到最后，那部分我信你。
```

顺带一提，Thariq 说他**已经完全不写 markdown 了**：「如果是我让 Claude 编辑它，那有更好看的格式。HTML。它能带图表、代码路径、原型图。而且我更可能真的去读。」markdown 成为默认，是因为人类要在任何地方编辑它——当编辑的人不是你了，这个优化就失效了。

```text
在我开始干活之前，先帮我找未知。

我要做的是：<一句话描述>
我对这块的了解程度是：<诚实描述>

请按顺序做三件事：
1. 做一次 blindspot pass，列出我可能没意识到自己不知道的点
2. 一次问我一个问题，优先问那些「我的回答会改变架构」的
3. 问完整理成 Goal / Constraints / Acceptance criteria 三段，我确认后再动手
```

---

## 改动 7｜一天做两次的事，就该固化成 skill

第 2 卷第 4 条的判据非常干脆：**一天做超过一次的事，就做成 skill 或者命令。**

团队给的具体例子：

- 一个 `/techdebt` 命令，每次会话结束跑一遍，找出并干掉重复代码
- 一个命令，把 7 天的 Slack、GDrive、Asana、GitHub 同步成一份上下文
- analytics-engineer 风格的 agent，写 dbt 模型、review 代码、在 dev 里测改动

Thariq 后来专门整理了 Anthropic 内部数百个 skill 的规律，归成 **9 类**：内部库/API 参考、产品验证、数据分析、业务自动化、脚手架模板、代码质量与 review、CI/CD 部署、事故 runbook、基础设施运维。**好 skill 通常干净地落在其中一类里**，如果你的 skill 横跨三类，多半该拆。

写法上的 9 条，我挑最反直觉的四条：

1. **跳过显而易见的**——Claude 已经有默认行为，只写那些**把它推离默认路径**的内容
2. **建一个 Gotchas 段落**——信噪比最高的部分，每次 Claude 踩坑就加一行
3. **渐进披露**——skill 是**文件夹，不是文件**。`SKILL.md` 是枢纽，辐条文件干活
4. **别铁轨化**——给信息，别给分步脚本，留出让它适应现场的空间

还有一条：**description 是写给模型看的，不是写给人看的。** 把「应该触发它的原话」直接写进去。

以及 Thariq 一句挺重要的态度：

> 「我非常反感 `npm install skills-dash-x` 然后来一个『CEO agent』。**如果你从来没读过那个 skill，我不信任它。** 为你自己的工作流写的 skill 才是好的。」

这条我完全同意。我在[《如何设计一套有价值的 Skill》](../designing-valuable-agent-skills/)里拆过一个敢删我文件的插件，结论一样：**没读过的 skill 等于没读过的 `sudo` 脚本。**

```text
翻一遍我最近的会话记录和 shell history，找出我一天做超过一次的重复动作。
挑出最值得固化的 3 个，各写成 .claude/skills/<name>/SKILL.md。

要求：
- description 写给模型看，把该触发它的原话写进去
- 正文只写 Claude 默认不会做对的部分，跳过它本来就会的
- 单独留一个 Gotchas 段落
- 超过一屏的内容抽到同目录子文件，SKILL.md 只留索引
- 给信息不给分步脚本，留出适应空间

写完把每个 skill 的触发条件念给我听，我判断会不会误触发。
```

---

## 改动 8｜从「一次对话」升级成「一个循环」

第 19 卷把 Claude Code 里所有循环归成四类，我认为这张表是整个站点信息密度最高的东西：

| 循环类型 | 你交出去的 | 什么时候用 | 用什么 |
|---|---|---|---|
| **轮次型** | 检查 | 你在探索或做决定 | 自定义验证 skill |
| **目标型** | 停机条件 | 你知道「完成」长什么样 | `/goal` |
| **定时型** | 触发器 | 工作按时间发生，在你项目之外 | `/loop`、`/schedule` |
| **事件型** | 提示词本身 | 重复且定义良好的工作流 | 以上全部 + 动态工作流 |

注意那一列**「你交出去的」**——这是整张表的灵魂。从上到下，你依次交出检查、停机条件、触发器，最后连提示词都交出去。**自动化程度不是一个滑块，是四个台阶。**

具体的原语：

```bash
# 目标型：设一个完成条件，达不到不许停
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries

# 定时型（本地，最长 3 天，关机就停）
/loop 5m check my PR, address review comments, and fix failing CI

# 定时型（云端，笔记本关了也跑）
/schedule every hour: check the project-feedback channel for bug reports,
triage each one, open a PR with a fix, and have a second agent review it
```

Boris 自己长期挂着的几个 loop：

```bash
/loop 5m /babysit           # 自动处理 code review、自动 rebase、盯 PR
/loop 30m /slack-feedback   # 把 Slack 反馈自动变成 PR
/loop /post-merge-sweeper   # 补上漏掉的 review 意见
/loop 1h /pr-pruner         # 关掉过期和多余的 PR
```

`/goal` 的机制是：每次 Claude 想停，都会有一个评估模型拿你的条件对照会话记录检查一遍，不达标就送回去继续。ClaudeDevs 管这个叫**「内置到 Claude Code 里的 Ralph 循环」**。**用确定性判据**——测试通过、分数阈值——别用「看起来没问题」。

还有一个非编码用法我很喜欢：把 `/goal` 指向**你的理解**而不是测试套件。

```text
/goal the session should not end until you've verified
      that the human has demonstrated they understood
      everything on your list.
```

同样的机制，退出条件从「构建变绿」换成了「你真的懂了」。Claude 会维护一份你该掌握的清单、让你复述、补你的缺口、然后用选择题考你。

这一节我写得比较紧，因为循环工程我刚在[《把提示词写成循环》](../prompt-loop-engineering-practice/)里完整拆过一遍——验证器的三级阶梯、权限梯度、状态分层那些，那篇讲得更细。

```text
把我这件重复的活儿改造成一个 loop：<描述>

先告诉我它属于哪一类——轮次型 / 目标型 / 定时型 / 事件型，
判断依据是我能交出去的到底是「检查」「停机条件」「触发器」还是「提示词」。

然后给出：
- 完整的 /goal 或 /loop 命令
- 退出条件（必须是确定性判据，不接受「看起来没问题」）
- 失控兜底：最大轮次、token 上限、权限白名单
- 每轮必须打印到 transcript 里的证据清单
```

---

## 改动 9｜大活儿：说「use a workflow」，并且 auto mode 不是可选项

这是 5 月 28 日的研究预览，能在**一次会话里跑几百个并行子代理**。触发方式很特别——**没有新命令、没有新 flag，你在提示里说「use a workflow」就行。**

> 「说『use a workflow』。光说『workflow』误触发太多。」——Boris，6 月 9 日的修正

**它解决三个具体的失败模式**，这三个名字起得非常准：

- **Agentic laziness（代理懒惰）**：复杂多部分任务做到一半就宣布完成——安全审查列了 50 项，处理了 20 项就说做完了
- **Self-preferential bias（自我偏好）**：让它按标准验证自己的产出时，它倾向于偏袒自己。**问题出在打分的和写作的是同一个上下文**
- **Goal drift（目标漂移）**：多轮之后逐渐偏离原始目标，**压缩之后最严重**——每次摘要都是有损的，「不要做 X」这类约束会悄悄掉出去

工作流的解法是让**每个 Claude 有自己的上下文窗口和一个孤立的小目标**：懒惰输给不达标不退出的确定性循环；偏袒输给「验证者永远不是作者」；漂移输给「每个 agent 只抱一个不会被摘要掉的小目标」。

结构是**编排器**形状，不是「agent 互相商量」：顶层 claude 分发 N 个任务 → 每个任务里 **implementer 写 → 分叉给两个 verifier → 汇入一个 fixer** → 循环到 verifier 通过 → 全部完成才返回。

Claude 会组合六种模式：分类路由、扇出汇总、**对抗式验证**、生成过滤、**锦标赛**（让 N 个 agent 各用一种方式做同一件事，两两评判——比较判断比绝对打分可靠）、**跑到没有新发现为止**（而不是固定跑几轮）。

**什么时候该用**：迁移、重构、性能优化、批量修 bug、以及「盘点归类」类扫描（A/B 实验开关、feature toggle、依赖、死代码、过期端点）。Cat Wu 的实例：她用它盘点了几百个 A/B 实验开关，找出已经 0% 或 100% 的那些好下线——**本来要串行调查，工作流并行跑完不到 10 分钟。**

**什么时候不该用**，Thariq 说得很老实：

> 「常规编码任务先问自己：这真的需要更多算力吗？**大部分传统编码任务不需要一个五人评审团。**」

**两条必须记住的边界：**

一是**必须开 auto mode**。几百个并行子代理，一个权限弹窗就把整条流水线冻住。二是**给 token 预算**，直接在提示里说：

```text
use a workflow to rank these 80 resumes for the backend role
and double-check the top ten. use 50k tokens
```

跑超了用 `/usage` 看是哪个 skill / MCP / plugin 在吞 token，`/workflows` 看每个 agent 的消耗并可以单独停掉。

还有一个细节值得知道：**工作流可以保存和分享。** 在工作流菜单里按 `s` 保存，文件进 `~/.claude/workflows`，或者塞进 skill 目录分发。分发的时候提示 Claude 把它当**模板而不是脚本**，让它按具体情况改造，而不是照着重放。

```text
use a workflow to <你的大任务>

要求：
- 实现者和验证者必须是不同的 agent，验证者不许改代码
- 每个子任务在自己的 worktree 里跑
- 先在 3 个样本上试跑给我看结果，我确认后再全量
- 整体控制在 50k tokens 以内
- 跑完把这个 workflow 存下来，并告诉我它适合复用到哪些场景
```

---

## 改动 10｜定期体检，并把修复写进基础设施

前面九个改动全是加法。这一个是减法，而且是必须做的减法。

7 月 8 日 Boris 发了 `/checkup`——一条命令体检整个 Claude Code 设置。他在自己机器上跑出来的结果挺吓人：

- `claude` 命令**是坏的**——某次测试跑覆盖了它的启动器
- **38 个项目 skill，在 2345 次会话里从来没被调用过**
- CLAUDE.md 每次会话加载**约 1 万 token**
- 清理完，每次会话省下大约 **5500 token 的上下文**——这是从此以后每一轮都免掉的税

`/checkup` 覆盖七件事：清理没用过的 skill / MCP / plugin、把本地 CLAUDE.md 跟入库版本去重、关掉拖慢每轮的 hook、更新版本、默认开 auto mode、预授权那些老被拒的只读命令，等等。

设计上有两条让它敢在真项目上跑：**先出计划等你拍板**，以及**全部可逆**——设置改动是能翻回去的开关，CLAUDE.md 编辑留在工作区，你 `git diff` 看完再决定要不要提交。四个选项：全清、我自己挑、只出报告不动、先聊聊。

这个功能背后的道理比功能本身重要：**设置会累积无声的浪费，而你不会注意到，直到有东西来度量它。**

而最后一卷（7 月 15 日）把整件事收进了一句我认为全站最狠的话：

> **一个被打回的 PR，是自动化的失败。**

Boris 的完整论证：如果你给一个不熟的 iOS 代码库提 PR，reviewer 因为你没用对框架把它打回来；或者一个设计师的功能因为不符合架构模式被打回——**这些都是自动化的失败。那份知识本该在基础设施里，而不是在 reviewer 的脑子里。**

而「能编码成基础设施的知识」在 agent 时代扩容了。以前只有 lint 规则、类型、测试；现在**几乎全部领域知识**都能编码——代码注释、skill、CLAUDE.md、REVIEW.md、文档、记忆——让一个 agent（或者一个新人）**在零额外上下文的情况下就能高效工作**。

这也是自动化在 agent 时代变得更重要的原因：**收益不再是线性的。**

> 更多自动化 = 单位时间产出 × 你的 agent 数量

```text
给我的 Claude Code 设置做一次体检：

1. 列出我装了但从没实际调用过的 skill / MCP / plugin
2. 统计 CLAUDE.md 每次会话加载多少 token，指出哪些内容该懒加载
3. 找出会拖慢每一轮的 hook
4. 检查我最近被 code review 打回的理由里，有哪几条本该写进 CLAUDE.md 或 REVIEW.md

输出「建议删除 / 建议懒加载 / 建议保留 / 建议新增规则」四段清单。
先别动手，等我确认。
```

---

## 一个额外的教训：听起来对，和真的对，差两段提示词

同站还有一篇实验记录值得单独说，因为它跟改动 2 是一回事的另一面。

作者拿 Anthropic 的 Dreaming 研究预览跑 Boris 的 87 条 tips——让 20 个 Claude 各自应用一条，再让一个 Claude 读完这 20 场会话写出一份手册。

**第一版的输出，逐句核对之后全是编的。** Boris 原文里约 80 词的 plan mode 那条，被扩写成约 390 词，多出来的 300 多词是「听起来极其合理」的推演，还夹着完全虚构的行业断言，比如「持续这么做的团队报告 Claude 在几个 sprint 内就『理解了代码库』」。作者的评价很诚实：

> 「如果我没有逐行回去核对 Boris 的原话，v1 版本的输出**权威到足以直接发表**。」

**第二版只改了两段提示词**：要求应用者把记忆条目分成 `[Boris]`（源自原文）、`[illustrative]`（自己编的演示场景）、`[synthesis]`（自己加的判断）三段；要求最终手册**每一句话都必须以这三个标签之一结尾**。

结果：零虚构断言，每个编造的例子都被明确标注，**输出还短了 36%**。

同样的模型、同样的语料、同样的架构。差别只是两段提示词。这跟改动 2 说的是同一件事——**当输出的正确性无法被廉价验证时，你就得先把「可验证」本身建进去。** 给标签，就是给验证的抓手。

对写作、研究、任何 AI 参与输出的场景，这条都成立。

---

## 执行顺序：今晚两小时该先做哪个

十个改动全做要好几天。按投入产出排，前三个优先：

**第 1 小时**

1. **改动 3（权限）** ——15 分钟，立竿见影。少掉的每一次弹窗都是白捡的
2. **改动 1（CLAUDE.md 重构）**——30 分钟。粘那条指令，让它自己改，你审 diff
3. **改动 10（体检）**——15 分钟。先只出报告，看看你的设置里堆了多少灰

**第 2 小时**

4. **改动 2（验证 skill）**——这是唯一一个「做一次，吃半年」的。它决定了后面所有自动化的天花板
5. **改动 4（worktree）**——如果你还在手工切 checkout，这一步的解锁感最强

剩下五个（上下文、委派、skill 化、loop、workflow）都属于习惯改造，不适合一晚上塞进去，跑几天自然会来。

**速查表：**

| 改动 | 命令 / 文件 | 一句话 |
|---|---|---|
| 1 | `CLAUDE.md` | 命令 + 禁令 + 懒加载，不写项目介绍 |
| 2 | `.claude/skills/verify-*/` | 没有验证闭环，其他都是空谈 |
| 3 | `.claude/settings.json`、`/fewer-permission-prompts`、`/sandbox` | 分级放行，不是二选一 |
| 4 | `claude -w`、`claude agents`、`isolation: worktree` | 并行的前提是隔离 |
| 5 | `/rewind`、`/compact <hint>`、`CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 回退，别纠正 |
| 6 | "interview me"、"blindspot pass" | 委派，不是结对 |
| 7 | `.claude/skills/`、`.claude/commands/` | 一天两次就固化 |
| 8 | `/goal`、`/loop`、`/schedule` | 四个台阶，看你交出去什么 |
| 9 | "use a workflow"、`/usage` | 验证者不能是作者 |
| 10 | `/checkup` | 加法配减法 |

---

## 最后

这份清单最打动我的不是任何一条技巧，是那个**自我推翻的姿态**。

一个人把自己半年前的公开建议明确标为过时，理由是「模型变了」——这在一个人人都在卖确定性的领域里，罕见到值得单独记一笔。

它也给了一个务实的读法：**这类清单的保质期，跟模型迭代速度成反比。** 你抄配置的时候，顺手记下抄的是哪一版；下次模型大更新，回来看看哪几条该退休了。

而那条从第一卷活到最后一卷的原则，大概是唯一不会过期的：

> 给它一个能自己验收的办法。

其余的都是这句话在不同尺度上的展开——一个 skill 是它的会话尺度版本，一个 `/goal` 是它的循环尺度版本，一个 workflow 是它的舰队尺度版本，而一条写进 CLAUDE.md 的规则，是它的时间尺度版本。

---

## 延伸

- [How Boris Uses Claude Code](https://howborisusesclaudecode.com/)：本文的全部素材来源，121 条 tips 分 21 卷。粉丝维护，非 Anthropic 官方
- 想装进 Claude Code 直接问的，站点提供了一个 skill：`mkdir -p ~/.claude/skills/boris && curl -L -o ~/.claude/skills/boris/SKILL.md https://howborisusesclaudecode.com/api/install`，之后打 `/boris` 唤起。**装之前先读一遍那个文件**——这也是改动 7 里 Thariq 那条原则
- [Claude Code 官方文档 · hooks](https://code.claude.com/docs/en/hooks)、[scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks)
- 同系列可以接着读：[把提示词写成循环](../prompt-loop-engineering-practice/)（改动 8 的完整展开）、[Agent Engineering 全景地图](../agent-engineering-the-98-percent-harness/)（这些配置在整个 harness 里的位置）、[Context 不是 Prompt](../context-engineering-the-new-foundation/)（改动 5 的地基）、[给 AI 任务，别给方向](../give-ai-tasks-not-directions/)（改动 6 的单轮版本）、[如何设计一套有价值的 Skill](../designing-valuable-agent-skills/)（改动 7 的安全边界）
