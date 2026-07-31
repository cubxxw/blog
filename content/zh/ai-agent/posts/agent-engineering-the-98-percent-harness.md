---
title: "Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点"
date: 2026-06-17T09:30:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Context Engineering
  - Harness Engineering
  - MCP
description: >
  从并非论文硬测量的 98.4% 说起，拆解 Agent Harness 的编排、上下文、记忆、工具、可靠性、评估、成本与治理八根支柱。文章以截至 2026 年 7 月的一手资料校准关键事实，给出每根支柱的最小实现、失效边界和选型判断，帮助工程师把会调用模型的演示，推进为可恢复、可评估、可治理的生产系统。
tldr:
  - Agent loop 可以短到十来行，Agent engineering 却主要发生在 loop 之外。对 Claude Code v2.1.88 的公开源码分析给出的可靠结论，是大量系统设计集中在权限、压缩、扩展机制、子 agent 隔离与会话存储；98.4% 只是本文采用的叙事锚点。
  - 这门学科存在的第一性原理是一处阻抗失配：无状态的概率预测器，要被套进有状态的无限世界。harness 就是这两者之间那层翻译电路，它不增加智能，只增加可控性。
  - 八大支柱：编排让它会走多步，上下文让它不腐烂，记忆让它跨会话成为某人，工具让它能改变世界，可靠性让它不崩，评估让它可度量，成本让它跑得起，治理让它自治而不失控。
  - 2025 至 2026 年的一手工程资料反复指向几条边界：context 有限且边际收益递减；外部记忆要可检索、可更新；checkpoint 只是恢复机制的一部分；多 agent 的收益依赖任务能否并行；安全不能只靠模型自律。
  - 选型的判断轴只有一句：看一个框架替你拿走了哪几根支柱的决策权——把不差异化的支柱交出去，把工程力压在你真正的护城河上。
maturity: budding
cover:
  image: '/images/blog/agent-engineering-harness.webp'
  caption: 'Agent Engineering 的八大支柱：包在 10 行 agent loop 外面的那 10 万行防御工事。'
  alt: '一张技术示意图，中心是一个小小的 agent loop，外面一圈一圈包裹着编排、上下文、记忆、工具、可靠性、评估、成本、治理八根支柱'
columns:
  - agent-engineering
---

> 「Agent loop 是 10 行代码，Agent engineering 是 10 万行代码。」

这句话不是代码审计结论，更像一把拆系统的刀。它戳破了一个常见错觉：把 prompt 写好、把 LLM API 调通，只能证明 loop 能转；要让系统在无人值守时仍可恢复、可追踪、可约束，主要工作在 loop 外。

这篇文章想做一件事：把 **Agent Engineering** 当成一门**学科**来拆，而不是当成一个教程。我不会教你怎么用 LangGraph，我想给你一张**地图**——这门学科由哪八根支柱构成、每一根填补了前一根留下的什么缺口、它的最小实现长什么样、又会在什么时候失效。读完之后，你看任何一个 Agent 框架、任何一篇大厂工程博客，都能立刻定位它在这张地图的哪个位置。

地图的素材，一半来自我自己造 Agent 系统时反复踩的坑，另一半来自 Anthropic、OpenAI、Manus 等团队公开的工程资料。本文涉及产品行为、版本和实验数字的内容，均按**截至 2026 年 7 月 31 日**能找到的一手来源核对；无法稳定核验的精确数字，宁可删掉，也不拿传播热度替代证据。

---

## 那个被反复引用的数字：98.4%

先从一个流传极广的数字开始，因为它是这篇文章的标题，也是整个领域最好的一句开场白。

2026 年 4 月发布的论文 [《Dive into Claude Code》](https://arxiv.org/abs/2604.14228)（Liu 等，arXiv:2604.14228）分析了 Claude Code **v2.1.88** 的公开 TypeScript 源码。论文摘要给出的结论很克制：核心是调用模型、执行工具再重复的 while loop；大量实现位于 loop 周围，包括权限系统、多层上下文压缩、MCP / 插件 / 技能 / hooks、带 worktree 隔离的子 agent，以及追加式会话存储。

这里必须纠偏：广为流传的「**1.6% 是 AI 决策逻辑、98.4% 是基础设施**」**不是论文给出的测量结果**。论文没有定义“AI 决策逻辑”的计数口径，也没有报告这组百分比；研究对象还是公开源码，不是所谓“泄露源码”。截至核验日，我也没有找到能为 98.4% 提供可复现计算方法的一手材料。

所以本文只把 **98.4% 当成叙事锚点，不把它当成论文结论、行业统计或可比较指标**。它指向的方向仍值得讨论：

**产品级 Agent 的工程量，绝大部分不在 prompt、不在模型调用，而在模型外面那一圈基础设施里。** 业界给这一圈起了个名字——**harness（马具 / 挽具）**。

> OpenAI 在 2026 年 1 月的 [《Unrolling the Codex agent loop》](https://openai.com/index/unrolling-the-codex-agent-loop/) 中明确使用 **Codex harness**，指代支撑各类 Codex 体验的核心 agent loop 与执行逻辑。这个定义比百分比更有用：harness 是模型与真实环境之间那层可编程的约束与执行系统。

记住这个画面：模型能力大多是你**买来的、间接影响的**；harness 是你**写的、直接负责的**。所以 Agent 工程师最稳定的杠杆，在 harness 上。这篇文章剩下的部分，就是把它拆成八根支柱。

---

## 第一性原理：为什么这门学科必须存在

![无状态的概率预测器 vs 有状态的无限世界——harness 就是它们之间那座桥](/images/blog/agent-engineering-impedance.webp)

在罗列支柱之前，得先回答一个更根本的问题：**为什么不能就让模型自己端到端地干活？为什么非要在外面套这么厚一层？**

答案是一处**阻抗失配（impedance mismatch）**。把它展开成一条因果链：

1. **LLM 本质是无状态的。** 每次 API 调用都是独立的一次性函数：`f(tokens_in) → tokens_out`。它没有记忆、不会持久化、两次调用之间什么都不记得，也不能真的动外部世界。
2. **真实任务是有状态、长程、与世界交互的。** 它跨越数百轮、要调外部工具、要记住三轮前定下的约束、要在失败后从断点恢复。
3. **二者之间是阻抗失配。** 把一个无状态的预测器，套进一个有状态的无限世界，中间必须有一层"翻译 / 缓冲"电路。**这层电路就是 harness，设计这层电路就是 Agent Engineering。**

由这条主线，还衍生出两条贯穿全文的铁律，它们解释了后面八大支柱里几乎所有的设计动机：

**铁律一：上下文是稀缺、会腐烂的计算资源。**

这不是“窗口越大越好”的线性问题。Anthropic 在 2025 年 9 月发布的 [《Effective Context Engineering for AI Agents》](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) 中把上下文描述为有限且边际收益递减的资源，并讨论了 context rot：随着上下文增长，模型从长上下文中可靠提取信息的能力可能下降。所以工程目标不是“把所有东西都塞进去”，而是找到对当前决策最有用的最小信息集。

**铁律二：核心组件本身就是概率性的。**

传统软件常把故障视为例外；Agent 工程更适合把不确定性当成常态。模型输出会变化，工具会失败，早期误判还会污染后续状态。Anthropic 在 2025 年 6 月的 [多 agent 研究系统复盘](https://www.anthropic.com/engineering/multi-agent-research-system) 中也把有状态、错误累积和协调失败列为生产挑战。

把这两条铁律钉在脑子里。下面每讲一根支柱，你都能看到它其实是在回应这两条里的某一条。

---

## 一张组件解剖图

在进入八大支柱之前，先看一眼 harness 内部到底有哪些零件。下面这张图是从 Claude Code / Codex 这类生产系统里逆向出来的标准"组件模型"，能报出这张清单，基本就等于你知道一个生产级 Agent 由哪些模块拼成：

```
                    ┌──────────────── HARNESS ────────────────┐
   user / event ──► │  Instruction Manager  (系统指令 / 身份装配) │
                    │  Context Builder      (每轮动态拼上下文)    │
                    │  Memory Manager       (预取 / 写回 / 提取)  │
                    │  Tool Registry        (工具发现 / schema)   │
                    │  Permission Resolver  (风险分级 / 审批)     │ ──► LLM
                    │  Model Adapter        (provider 抽象 / 路由) │ ◄──
                    │  Budget Tracker       (turn / token / $ 预算)│
                    │  Compaction Engine    (上下文压缩)          │
                    │  Trace / Observability(每步留痕)            │
                    │  Stop-condition Logic (终止判定)            │
                    └──────────────────────────────────────────┘
                                      │
                              tools / world
```

**八大支柱**，就是把这些零件按"工程关注点"重新归组之后的结果。下面逐根拆，每一根都按 **填补的缺口 → 最小实现 → 失效边界** 这三段来讲。

---

## 支柱一：编排（Control Flow / Orchestration）

**填补的缺口**：LLM 一次只输出一段文本；但任务需要「思考 → 行动 → 观察 → 再思考」的多步循环，以及多个子任务之间的协调。编排，就是决定**控制权如何流转**。

**最小实现**：就是那个传说中的 10 行 while 循环。

```python
state = init(task)
while not done(state):
    thought, action = model(render_context(state))      # Think
    observation = execute(action)                        # Act（经过 harness！）
    state = update(state, thought, action, observation)  # Observe / Update
    if turns(state) > MAX_TURNS:                          # 安全网
        break
return finalize(state)
```

注意 `execute(action)` 这一行——**它就是整个 harness 的入口**。模型说“我要 `rm -rf /`”，是这行代码决定动作是否发生、在哪里发生、发生前要不要拦。OpenAI 对 Codex loop 的公开拆解显示了同一结构：模型产出文本或请求工具；harness 执行工具、把结果追加进下一轮输入，直到模型给出终止响应。

把这个循环放进一个真实场景跑一遍。注意第二次 `run_command`：模型只是**请求**删除，真正决定它发不发生的，是 harness 的确认闸门：

{{< demo-agent-trace title="Agent Loop × Harness 闸门" question="帮我把仓库里的构建产物清掉" >}}
[
  {"type":"think","text":"要删文件。先看清楚有什么可删的，不能直接动手。"},
  {"type":"tool_call","tool":"run_command","args":"{\"cmd\":\"ls dist/ build/\"}"},
  {"type":"tool_result","text":"dist/  14 files · 3.2 MB\nbuild/  7 files · 1.1 MB"},
  {"type":"think","text":"目标明确了。删除属于危险动作，这次调用会被 harness 拦下来要求确认。"},
  {"type":"tool_call","tool":"run_command","args":"{\"cmd\":\"rm -rf dist build\"}"},
  {"type":"tool_result","text":"[harness] rm -rf 命中确认规则 → 等待人工批准 → 已批准\n21 个文件已删除（4.3 MB）"},
  {"type":"answer","text":"已清理 dist/ 与 build/，共删除 21 个文件、4.3 MB。删除动作在执行前经过了 harness 的确认闸门——模型从头到尾只发出请求，没有碰过 shell。"}
]
{{< /demo-agent-trace >}}

**进阶谱系**（这是面试和选型都绕不开的）：

- **单 Agent 范式**
  - **ReAct**（Reason + Act 交错）：每步先推理再行动，灵活、适合探索；缺点是没有全局规划，**容易走偏、步数发散**。
  - **Plan-and-Execute**：先生成完整计划再逐步执行，**省 token、可预测**；但计划一旦错了，执行阶段难纠偏。
  - 实践里常**混合**：先 plan 出粗骨架，执行中允许 ReAct 式局部重规划。
- **多 Agent 拓扑**
  - **Supervisor / Orchestrator-Worker**（一个主管派活给工人）——最常用、最可控。Anthropic 的多 agent 研究系统就是这个：「一个主导 agent 协调整个流程，把任务委派给并行运行的专长子 agent。」
  - **Network / Swarm**（peer 之间自由通信）——表达力强但**最易失控**。
  - 协议层：**A2A（Agent-to-Agent）** 管跨 agent 通信，**MCP（Model Context Protocol）** 管 agent 到工具。

但这里有个**最关键的判断**，值得单独拎出来：**谁控制状态转移？**

> **LLM 控制状态转移 = Agent；确定性代码控制 = Workflow。**

Anthropic 在 2024 年 12 月的 [《Building Effective Agents》](https://www.anthropic.com/engineering/building-effective-agents) 里把边界划得很清楚：Workflow 由预定义代码路径编排模型和工具；Agent 则由模型动态决定流程和工具使用。它的建议也足够朴素：先找最简单的可行方案，只在确有需要时增加 agentic 复杂度。

LangGraph 之所以"中立"，正是因为它让你在同一个 `StateGraph` 里自由选择**每一条边**由谁决定——这条边由代码定死，那条边交给 LLM。这就是为什么它能同时表达 workflow 和 agent。

**失效边界**：多 Agent 不是银弹，而这正是 2025 年那场著名辩论的核心。

Cognition 在 2025 年 6 月的 [《Don't Build Multi-Agents》](https://cognition.com/blog/dont-build-multi-agents) 中提出了一个有价值的反方视角：协作者如果不能共享完整轨迹，动作中隐含的决策很容易互相冲突。这里不必把它理解成“永远不要多 agent”，而应把它当成一条设计约束：**并行切分必须减少耦合，而不是把耦合藏起来。**

Anthropic 随后公开的研究系统给出了另一面：在其内部研究评测中，多 agent 配置相对单 agent 基线取得明显提升，但 token 消耗也显著上升。这个结果只适用于该团队的研究任务、模型与评测设置，不能外推成通用收益率。

把两家放在一起，能得到一个更稳的判断：读密集、可独立搜索、结果可汇总的任务更适合并行；需要共享大量隐含状态、持续修改同一对象的任务，协调成本往往会吞掉收益。**当单 agent 加好工具足够时，多 agent 通常只会增加失败面。**

---

## 支柱二：上下文工程（Context Engineering）

这是 demo 和 production 之间最宽的鸿沟之一。我之前专门写过一篇[《Context 不是 Prompt》](../context-engineering-the-new-foundation/)，这里只把它放回 harness 的结构里，讲清它解决什么、又解决不了什么。

**填补的缺口**：就是铁律一——窗口有限 + context rot。

上下文工程的工作，不是追求更长，而是持续决定哪些信息应当进入、留在或离开窗口。

**上下文的四种失效模式**（Drew Breunig 的分类，值得背）：

| 失效模式 | 它是什么 | 典型修法 |
|---|---|---|
| **Poisoning 中毒** | 一个幻觉 / 错误进了上下文，之后被反复引用、不断复制，agent 把假事实当既定前提去建策略 | 验证后再写入；隔离不可信来源；可回滚的 state |
| **Distraction 分心** | 上下文长到模型过度依赖历史、开始复读过去的动作，不再用训练知识综合新计划 | 压缩 / 摘要；留意模型的"分心天花板" |
| **Confusion 混淆** | 无关信息（尤其是塞了太多工具描述）被模型拿去用，降低输出质量 | 工具按需加载；只选相关上下文 |
| **Clash 冲突** | 上下文里不同部分互相矛盾（多来源、多 MCP、跨轮累积） | 去冲突；统一来源 |

**四大策略**——**Write / Select / Compress / Isolate**，可以理解成上下文工程的“四则运算”：

- **Write（写出去）**：把信息持久化到窗口**之外**——scratchpad、state 字段、外部存储、memory 工具。
- **Select（选进来）**：每轮只把**相关**内容拉回窗口——RAG、记忆检索、工具按需挂载。
- **Compress（压缩）**：逼近窗口时摘要而非粗暴截断。
- **Isolate（隔离）**：用 schema 化的 state，只把 `messages` 字段暴露给 LLM；或把子任务隔离进 subagent 的独立上下文。

这里特别值得展开 **Compress**。Anthropic 将 compaction 描述为：当对话接近上下文上限时，摘要旧内容，再用摘要继续新的上下文窗口。应保留架构决策、未解决问题和下一步，削减重复工具输出。至于“达到窗口百分之多少自动压缩”，不同版本与产品配置可能变化；除非锁定版本并能复现，否则不要把某个阈值写进架构假设。

**还有一条贯穿性的经济学约束：Prompt Cache。**

Manus 团队在 2025 年 7 月的 [《Context Engineering for AI Agents》](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) 中把 KV-cache 命中率视为重要生产指标，因为它直接影响延迟和成本。具体价格会随模型与供应商调整，真正稳定的工程原则是：尽量保持公共前缀稳定，把变化快的观察放在后部，并用实际 cache 指标验证，而不是背一张过期价目表。

这条经济学直接改写了优化目标：**从"最小化 context 体积"迁移到了"最大化 cache 命中率"。** 它反过来约束你拼装上下文的顺序——稳定的（system prompt、工具定义、长期记忆）放前面，易变的（最新观察）放后面。

**失效边界**：上下文工程解决"上下文该是什么"，但解决不了"它该服务什么意图"。一个 agent 完全可以拿到完美相关、隔离、经济的上下文，**仍然去追求一个违背目标的结果**。那是治理（支柱八）的事。

---

## 支柱三：记忆工程（Memory Engineering）

**填补的缺口**：上下文工程经营的是**单次会话内**的窗口；但 Agent 需要**跨会话**记住事实、偏好、过程。记忆，是窗口之外那条持续演化的底层基质。

**四层记忆架构**（这是个相当稳定的分层）：

- **Working（工作记忆）** = 当前上下文窗口本身（最快、最贵、最易腐烂）。
- **Episodic（情节记忆）** = 过去会话的具体记录（典型实现是 SQLite + 全文检索 + LLM 摘要做跨会话召回）。
- **Semantic（语义记忆）** = 抽象出来的事实 / 知识（MEMORY.md、知识图谱、向量库）。
- **Procedural（过程记忆）** = "怎么做某事"（这是最难外化、也最有价值的一类）。

**最小实现**简单到出人意料：一个 `MEMORY.md` 文件 + "会话结束时让模型写下值得记的东西" + "下次会话开头注入"。就这么点东西也能跑。

**真正难的部分是提取与遗忘，不是存储。** 而这正是 2025 到 2026 年各家收敛出共识的地方——**外部化记忆是通用解**，但各家的招式略有不同：

- **Anthropic** 把 compaction、结构化笔记与 sub-agent 作为长任务上下文管理的互补手段；笔记写到窗口之外，需要时再取回。
- **Manus** 把文件系统当作外部记忆，压缩时留下 URL 或路径，使被省略的内容仍可追溯，而不是只剩不可逆摘要。
- **Manus 还有一招特别巧妙——recitation（复述）**：不断把 `todo.md` 重写到上下文的**末尾**，利用"近因效应"把目标反复推回模型的注意力焦点，对抗"中间迷失（lost in the middle）"。

这里有个**反直觉但重要的分歧点**，值得你自己拿捏：**该不该保留错误？** 主流做法是激进压缩、丢掉失败的工具输出；但 Manus 的第 5 条经验恰恰相反——「**把走错的弯路留在上下文里**」，因为失败的动作能帮模型更新信念、不再重蹈覆辙。这两种哲学没有绝对对错，取决于你的任务是"越干净越好"还是"越能从错误中学越好"。

**失效边界**：记忆会**过时**和**冲突**。一条三月写的"部署流程"到五月就是错的；两条互相矛盾的记忆会引发上下文冲突（context clash）。所以记忆系统需要**版本 / 时效**和**冲突消解**，不能只追加。

---

## 支柱四：工具工程（Tool Engineering）

**填补的缺口**：LLM 只会生成文本；要改变世界（查数据、发邮件、跑代码）必须经工具。工具是 Agent 的"手"。

**最小实现**：给 LLM 一组 JSON schema 描述的函数 + 一个 dispatcher，把模型吐出的 `tool_call` 路由到真实函数，结果塞回消息历史。但这个 dispatcher 里藏着 harness 的第一圈防御，顺序不能乱：

```python
def dispatch(tool_call, registry):
    spec = registry.get(tool_call.name)
    if spec is None:
        return ToolError("unknown_tool", retryable=True)        # 让模型自纠
    err = validate_against_schema(tool_call.args, spec.schema)
    if err:
        return ToolError("schema_violation", detail=err, retryable=True)
    return spec.run(tool_call.args)                              # 这里才真正进 runtime
```

**工程要点**（每一条都值得展开）：

- **工具设计 = API 设计 + prompt 设计的交集。** 工具的 `name` / `description` / 参数名**本身就是 prompt**——模型靠它们决定何时怎么调。Anthropic 的 [工具设计复盘](https://www.anthropic.com/engineering/writing-tools-for-agents) 强调：工具要有清晰、独立的用途，并在返回端提供分页、范围选择、过滤和截断。
- **Function Calling ≠ MCP，它们在不同层。** Function Calling 是模型表达工具请求的调用语法；MCP 是 harness 和工具提供方之间的连接协议。MCP [2025-06-18 版规范](https://modelcontextprotocol.io/specification/2025-06-18/) 要求 client / server 消息遵循 JSON-RPC 2.0。类比来说，Function Calling 是点菜语言，MCP 是菜单、连接与接单规则。
- **工具过多 = Confusion，而这是 2026 年最有意思的优化战场。** 几十个工具描述全塞进 prompt 会显著降质。Anthropic 给出了两个量级惊人的解法：
  - [**Code Execution with MCP**](https://www.anthropic.com/engineering/code-execution-with-mcp)：在 Anthropic 给出的 Google Drive 到 Salesforce 示例中，按需读取工具定义让上下文用量从约 150,000 token 降至约 2,000。它是单个示例的量级，不是所有 MCP 工作负载的保证。
  - [**Tool Search Tool**](https://www.anthropic.com/engineering/advanced-tool-use)：Anthropic 的内部 MCP 评测显示，按需发现工具可明显降低 token 用量并改善大型工具库上的准确率。具体提升依赖模型、工具集与评测，落地时应重测。
- **工具结果处理**：工具输出常常巨大（文件、网页、日志），是上下文膨胀的头号来源。不得不截断时要**保头保尾**（如 30% 头 + 30% 尾），因为错误信息和关键结论常在两端。
- **错误分类先于响应策略**：工具会失败——网络、超时、权限、参数错、业务错。**先分类，再决定**重试 / 换工具 / 降级 / 上报。

**失效边界**：工具是**副作用的入口**，也是**安全的最大破口**。一个能 `mv`、能发消息、能花钱的工具，一旦被 prompt injection 劫持就是灾难——这把我们直接引向治理那一根支柱。

---

## 支柱五：可靠性工程（Reliability Engineering）

**填补的缺口**：每一步都可能错的组件，怎么拼出一个"整体可靠"的系统。这是把 demo 变 production 的核心苦工，也是 2026 年资本下注最重的一层。

先讲一个容易混淆的概念：**checkpoint 不等于完整的 durable execution。**

- **Checkpoint（检查点）**：每个逻辑步骤后把 state 存进持久化存储，崩溃后从最后一个 checkpoint 恢复，而不是从头。LangGraph 的 checkpointer 就是这个。
- **Durable Execution（持久化执行）**：checkpoint 只是其中一半。完整的 durable execution 还要有**自动故障检测 + 自动重启 + 跨进程边界的 resume**。

LangGraph 的[持久化文档](https://docs.langchain.com/oss/python/langgraph/persistence)把 checkpoint 定义为线程中每一步的状态快照，可用于恢复、人工介入和调试。但系统能否在进程或节点失效后自动发现故障、重新调度，并避免副作用重复发生，还取决于运行时和部署架构。Temporal 一类工作流运行时把 workflow 历史与 activity 执行分开，通过事件历史重建控制流；它解决的是更大的恢复问题，不只是“存一份 state”。

**这里有一道必须理解的坎：非确定性。** Agent workflow 里有 LLM 输出、时间戳、随机数和检索结果。**不能重放一个 LLM 调用，再假装它和上次一样。** 对产生副作用的步骤，要么记录结果并在恢复时复用，要么用幂等键与补偿机制约束重复执行。否则“resume”只是重新做一遍相似的事。

2026 年 4 月的 [**Crab** 论文](https://arxiv.org/abs/2604.28138)在其 shell 密集与代码修复工作负载中观察到，多数 agent turn 没有产生与恢复相关的系统状态，并报告了显著的 checkpoint 流量下降。这个结论有明确实验边界：它支持“按副作用决定粒度”，不等于所有 agent 都可以少存。

> **直接的建议**：按"丢失的后果"决定 checkpoint 粒度，而不是按反射每步都存。一个月级的长线程，漏一个 checkpoint = 重发或漏发一封邮件，值得强 durability；一个纯计算的中间步骤，丢了重算就行，别存。

可靠性这根支柱的标准武器库还包括：**错误分类**（transient 重试 / permanent 换路 / fatal 停机上报，分类是地基）、**重试 + 幂等性**（重试的前提是操作幂等，否则发两封邮件）、**fallback provider 链**、**circuit breaker（熔断器）**、**预算硬上限**（每 agent 每 task 的 turn/token/$ 上限，一个死循环的 agent 几分钟能烧掉几千刀）、**Saga 补偿事务**（长流程失败时逆序执行补偿动作回到一致状态）。

**失效边界**：可靠性工程能让系统"不崩"，但不能让它"做对"。一个永远返回"我已完成"的 agent 通过了所有 reliability 检查，却完全没干活——这要靠 eval（支柱六）来抓。

---

## 支柱六：评估与可观测性（Evaluation & Observability）

**填补的缺口**：概率性系统**没有"跑通了就对"这回事**。同一输入两次结果不同。没有 eval，你根本不知道改了 prompt 是变好还是变坏。**这是大多数团队最薄弱、也最该补的一块。**

**两个基础设施（动手优化之前先有）**：

1. **Tracing / 可观测性**：每一步——每次 LLM 调用、每个 tool call、每次压缩、token 用量——都要留痕。LangSmith 把一次 trace 定义为「每一步的完整记录，从输入到最终输出」，结构是一棵 run 树。**看不见就优化不了。**
2. **一套能跑的测试集**：哪怕只有 20 条标注好的任务，也比没有强。

**评估方法谱系**：离线 eval（固定数据集跑回归，防"改 A 修好了、B 悄悄坏了"）、在线 eval（生产流量采样）、**LLM-as-a-Judge**（用另一个 LLM 按 rubric 打分）。

但 LLM-as-Judge 有个必须知道的坑：**裁判也有偏差**。位置、篇幅、措辞熟悉度和模型家族都可能影响分数。因此，裁判分要用交换位置、分维度 rubric、多次 trial 和人工校准来约束，不能把一次模型打分当作真值。

一种实用模式，是让独立裁判按预定义标准检查最终状态，而不是沿用执行 agent 的完整叙事。独立不意味着完全丢掉证据，而是避免把执行者的自我解释当成事实。Anthropic 在 2026 年 1 月的 [Agent eval 指南](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 也强调组合代码、模型和人工 grader，并把 LLM judge 与人类专家紧密校准。

**还要对抗 self-congratulation（自我表扬）**：Agent 自评刚解决的问题时会偏乐观。先检查环境里的终态——文件是否真的修改、订单是否真的存在、测试是否真的通过——再评价表达质量。能用代码验证的，不要先交给语言模型。

**失效边界**：eval 本身可能被 game。优化一个指标久了，agent 会学会"讨好裁判"而非真正做好。所以需要定期人工抽检 + 多维度指标交叉。

---

## 支柱七：成本与延迟工程（Cost & Latency Engineering）

**填补的缺口**：能跑对 ≠ 跑得起。一个 demo 每次几分钱无所谓，规模化后 token 成本和延迟会把产品压死。

**核心杠杆**：

- **Prompt cache 命中率**（已反复强调，是第一杠杆）——把 system prompt 当不可变 prefix 经营，甚至在 CI 里断言它的字节稳定。
- **智能模型路由（Smart model routing）**：简单子任务路由到更便宜、延迟更低的模型，难任务留给能力更强的模型。路由不能只看单价，还要把质量、上下文上限和重试成本一起算进 eval。
- **并行工具执行**：路径独立的 tool call 并发执行，但交互式工具要强制串行，并发后还要严格保序回灌。
- **Compaction 触发策略**：不要硬编码从其他产品抄来的百分比；按当前模型窗口、保留输出预算和任务阶段决定触发点，并通过回归 eval 校准。
- **辅助模型分工**：摘要、视觉、分类这类"侧任务"用便宜模型。

**失效边界**：过度优化成本会牺牲质量（让小模型干了大模型的活）。**成本-质量是一条 Pareto 前沿，不是单目标。** 用 eval 守住质量下界，再去压成本。

---

## 支柱八：安全与治理（Safety & Governance）

**填补的缺口**：前面所有支柱让 agent **更强大、更自主**；这一根支柱确保强大不变成危险。这是 demo→production 最后那 20%，也是最难的 20%——因为**它是治理问题，不是能力问题**。

先记住整个领域最反直觉、也最重要的一句安全公理：

> **安全边界必须由 harness 执行，不能只依赖模型自我约束。**

意思是：**如果你在指望模型自己拒绝坏动作，那你根本没有安全可言。** 模型的"拒绝"只有在 harness 在执行**之前**校验了 tool call 的 schema 并拒绝它，才算数。换句话说，refusal 不是一种对齐属性，而是一种**运行时校验结果**。

由此推出整个领域的核心治理范式：

> **Propose / Apply 分离**：让 **LLM 负责提议（propose）**，让**确定性代码或人负责执行（apply）**。

这一条就长在产品里。Claude Code 的 [plan 模式与权限系统](https://code.claude.com/docs/en/permissions)允许模型分析和提出方案，但禁止文件修改；deny 规则优先于 ask 与 allow。它把“能想到什么”和“被允许做什么”拆成了两层。

Claude Code 的 [auto mode 设计说明](https://www.anthropic.com/engineering/claude-code-auto-mode)则展示了另一层：用独立分类器检查需要审查的动作，同时仍把它放在沙箱与权限规则之内。Anthropic 在后续[隔离复盘](https://www.anthropic.com/engineering/how-we-contain-claude)中明确说明，这种分类器存在漏判，只是纵深防御的一层，不是沙箱替代品。

OpenAI 的 Codex 也把执行隔离和审批分开。其 [GPT-5.3-Codex System Card](https://deploymentsafety.openai.com/gpt-5-3-codex/gpt-5-3-codex.pdf) 记载：云端任务运行在隔离环境中，网络默认关闭；本地 macOS 使用 Seatbelt，Linux 使用 seccomp 与 Landlock 等机制。实现会迭代，但原则稳定：能力边界由操作系统或虚拟化层强制，审批策略决定何时把控制权交还给人。

治理的底线是：**不要让策略和被约束对象处在同一层。** Prompt 里的“禁止”、模型分类器与用户态 denylist 都有价值，但它们不能替代操作系统或虚拟化强制的边界。隔离技术要按威胁模型选：可信内部任务可用收紧权限的进程或容器；执行未知依赖、外部仓库或生成代码时，应考虑更强的 syscall 隔离、独立内核或 microVM。AWS 对 [Firecracker](https://aws.amazon.com/blogs/opensource/firecracker-open-source-secure-fast-microvm-serverless/) 的公开设计也把硬件虚拟化边界与最小设备模型放在核心位置。不是所有任务都需要 microVM，但边界强度必须和最坏副作用相称。

**失效边界**：治理和能力是**永恒的张力**。锁太死，agent 没用；放太开，agent 危险。没有一劳永逸的设定点，只有"随风险等级动态调节的闸门"。

---

## 把八根支柱编织起来：一个请求的完整生命周期

八大支柱不是并列的清单，而是**在每一次请求里协同流转**的一条流水线。走一遍 end-to-end，你就能看清它们如何咬合：

```
1. 事件进来（用户消息 / cron / 子任务）
2. 【治理】不可信来源先过 injection 扫描              ← 支柱 8
3. 【上下文】Context Builder 动态装配：
     不可变 system prefix（身份 + 指令）              ← 支柱 2（缓存）
   + 注入记忆快照（预取相关 episodic / semantic）      ← 支柱 3
   + 选入相关工具（按需挂载，避免 confusion）          ← 支柱 4
   + 项目上下文 / 会话历史                            ← 支柱 2
4. 【预算】Budget Tracker 检查 turn / token / $ 余额  ← 支柱 5
5. 【编排】进入 loop：LLM 决定 think / act            ← 支柱 1
6.   若 tool_call：
       【治理】权限矩阵判定风险级 → 必要时审批          ← 支柱 8
       【可靠性】执行，失败则分类 → 重试 / 降级 / 熔断   ← 支柱 5
       【上下文】工具结果截断 / 摘要后回灌              ← 支柱 2 + 4
7.   逼近窗口 → 【上下文】Compaction 压缩              ← 支柱 2
8.   重复直到 goal-check 满足 或 预算耗尽              ← 支柱 1 + 5
9. 【记忆】会话结束：离线提炼记忆 / 技能，写入边界扫描  ← 支柱 3
10.【可观测】全程 trace 留痕，事后 eval 打分           ← 支柱 6
全程：【成本】缓存命中、并行、路由在每一步生效          ← 支柱 7
```

能把这条流水线一口气讲顺，你基本就答对了那道经典的白板题——"描述一个生产 Agent 处理一个请求的全过程"。

---

## 学习路径：按支柱学，别按框架学

最后给一条按依赖顺序排好的学习路径——每一阶填补前一阶的缺口：

| 阶段 | 学什么 | 填补的缺口 | 最小里程碑 |
|---|---|---|---|
| **0 地基** | LLM API、function calling、消息格式、token / cost | 看懂一次调用 | 手写一个 10 行 tool loop |
| **1 编排** | ReAct / Plan-Execute、StateGraph / Edges / Checkpointer | 单步 → 多步 | 跑通一个会自己调多次工具的 agent |
| **2 上下文** | 四失效模式、Write/Select/Compress/Isolate、prompt cache | 短对话 → 长程不腐烂 | 实现一个压缩器 + 缓存稳定的 prefix |
| **3 记忆** | 四层记忆、有界 curation、离线提取、向量 / FTS5 | 单会话 → 跨会话成为某人 | MEMORY.md + 跨会话召回 |
| **4 工具** | 工具设计、MCP vs FC、结果处理、错误分类 | 只会说 → 能改变世界 | 接 MCP + 工具失败兜底 |
| **5 可靠性** | fallback 链、熔断、预算、saga、幂等、durable execution | 能跑 → 不崩 | 跑 100 轮真实任务不失控 |
| **6 评估** | tracing、离线 / 在线 eval、LLM-as-judge、独立裁判 | 凭感觉 → 可度量 | 一套回归 eval + judge agent |
| **7 成本** | 缓存命中、路由、并行、辅助模型 | 跑得起 demo → 规模化 | 把单任务成本降一个量级且质量不掉 |
| **8 治理** | propose/apply 分离、权限矩阵、最小权限、injection 防御、沙箱 | 强大 → 安全可控 | 自动化变更默认 dry-run + 审批闸 |

> **学习法建议**：别按"框架"学（学 LangGraph、学 CrewAI），按**支柱**学。框架只是支柱的某种实现；吃透支柱之后，任何框架你都能在 10 分钟内定位"它在哪几根支柱上做了什么选择"。

而这也通向最后那个选型的判断轴——它其实只有一句话：

> **看一个框架替你拿走了哪几根支柱的决策权。**

封装（encapsulation）的本质，就是**决策权的转移**。MCP 把"工具集成"的决策从你手里转移给了 server 提供方；Temporal 把"故障检测和恢复"的决策拿走了；LangGraph 把"调度和持久化"拿走了，把"内容"留给你。**所以 build vs buy 的判断不是"哪个更强"，而是"我的差异化在盒子里还是盒子外"**：差异化在 loop 和 memory，那就把工程力压在那里，沙箱和 durable execution 尽量买现成、别自己造收敛性问题的轮子。

---

## 一句话收尾

写到这里，可以把整张地图压成一句话了：

> **Agent Engineering，就是在"无状态的概率预测器"和"有状态的无限世界"之间，造一层叫 harness 的电路。这层电路有八根支柱：编排让它会走多步，上下文让它不腐烂，记忆让它跨会话成为某人，工具让它能改变世界，可靠性让它不崩，评估让它可度量，成本让它跑得起，治理让它自治而不失控。模型是买来的，harness 是你造的——你全部的工程杠杆，都在这八根支柱上。**

98.4% 不是测量值，也不必为它辩护。真正值得保留的是它指向的视线：别只盯着模型的那一轮输出，要看整个系统怎样约束动作、保存状态、验证结果。模型会继续变，工程资产沉淀在这些可以解释、测试和替换的边界里。

---

### 附：核心论点速记

| 论点 | 出处 / 数据 |
|---|---|
| Claude Code v2.1.88 的核心 loop 与外围系统 | [Liu 等，《Dive into Claude Code》](https://arxiv.org/abs/2604.14228)，2026-04；论文没有报告 98.4% |
| Codex harness 提供核心 loop 与执行逻辑 | [OpenAI，《Unrolling the Codex agent loop》](https://openai.com/index/unrolling-the-codex-agent-loop/)，2026-01 |
| 上下文有限、边际收益递减；compaction 与结构化笔记 | [Anthropic，《Effective Context Engineering for AI Agents》](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)，2025-09 |
| workflow / agent 边界与“优先简单方案” | [Anthropic，《Building Effective Agents》](https://www.anthropic.com/engineering/building-effective-agents)，2024-12 |
| 多 agent 的编排、收益边界与 token 代价 | [Anthropic，多 agent 研究系统复盘](https://www.anthropic.com/engineering/multi-agent-research-system)，2025-06 |
| 文件系统、cache prefix 与错误轨迹的上下文实践 | [Manus，《Context Engineering for AI Agents》](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)，2025-07 |
| MCP 工具按需加载的示例数据 | [Anthropic，Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) 与 [Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)，2025-11 |
| Agent eval 应组合 grader 并校准 LLM judge | [Anthropic，《Demystifying Evals for AI Agents》](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)，2026-01 |
| 语义感知 checkpoint 的实验边界 | [Wu 等，Crab](https://arxiv.org/abs/2604.28138)，2026-04 |
| plan / auto mode、权限与分类器的边界 | [Claude Code 权限文档](https://code.claude.com/docs/en/permissions)、[auto mode 设计](https://www.anthropic.com/engineering/claude-code-auto-mode)，核验于 2026-07-31 |
| Codex 隔离与默认网络策略 | [OpenAI，GPT-5.3-Codex System Card](https://deploymentsafety.openai.com/gpt-5-3-codex/gpt-5-3-codex.pdf)，2026 |

> 来源核验日期：**2026-07-31**。版本行为、模型价格、评测榜单与产品默认值都可能继续变化；写进设计文档时，应重新打开原始来源，而不是复制这张表里的旧快照。
