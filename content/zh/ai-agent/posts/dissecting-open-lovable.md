---
title: "拆解 open-lovable：一个不靠 Agent 框架、直接驯服裸 API 的应用生成器"
date: 2026-06-29T09:30:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["open-lovable", "Firecrawl", "AI Agent", "Agent Harness", "自研 harness", "E2B", "Vercel Sandbox", "代码沙箱", "Vercel AI SDK", "streamText", "Agentic Search", "Morph Fast Apply", "Next.js", "AI 应用生成器", "Lovable", "Bolt", "v0"]
tags:
  - AI
  - Agent
  - LLM
  - Architecture
  - Harness Engineering
description: >
  把 firecrawl/open-lovable（27k★，输入一个网址几秒重建成 React 应用）从产品到代码彻底拆开。它最有意思的地方不是「能生成代码」，而是它不用任何 Agent 框架、不用 Claude Agent SDK、不用原生 tool-calling，而是在裸 LLM API 之上手搓了一整套 harness：文本 DSL 协议、流式正则解析、截断检测与补全、手工上下文编排，再配一套可切换的云端沙箱（E2B / Vercel Sandbox）。这是一份「直接驯服原始 API」的工程范本拆解。
tldr:
  - open-lovable 是 Firecrawl 的旗舰开源 Demo，本质是把「抓取」这个枯燥中间件包装成有病毒传播力的爆款应用，27k star 自然转化为 Firecrawl API 用户——一个教科书级的「开源即增长」漏斗。
  - 它的 Agent 不是自主循环，而是一条写死的 workflow 状态机；模型只在「意图分析 / 代码生成 / Morph 落地」三个固定卡槽里被调用，可预测、可调试、不会跑飞。
  - 它的 harness 完全自研：不用原生 tool-calling，而是发明 `<file>`、`<package>`、`<edit>` 文本 DSL，用流式正则边出边解析，再用截断检测 + 单文件补全 + 多 provider 回落把裸 streamText 兜成产品级可用。
  - 沙箱层用抽象基类隔离 E2B 与 Vercel：E2B 把一切包进 Python subprocess 防注入，Vercel 直连 shell 求贴合，两者都靠「原生 API → shell 回落」双通道兜稳定性，再加单例生命周期 + 空闲 GC 控成本。
  - 核心哲学一句话：不是让 Agent 更自由，而是用确定性的代码编排去框住非确定性的 LLM——这正是「产品级生成器」区别于「Demo 级 Agent」的分水岭。
maturity: budding
columns:
  - agent-engineering
---

> 输入一个网址，AI 在几秒内把它重建成一个能跑、能预览、能继续对话修改的现代 React 应用。

这是 [firecrawl/open-lovable](https://github.com/firecrawl/open-lovable) 给人的第一眼印象——27k star、5.2k fork，TypeScript 占比 94.9%，是 Firecrawl 团队做的一个旗舰开源示例。它对标商业产品 Lovable.dev（README 里直接写明「完整云方案请用 Lovable.dev」），处在 Lovable、Bolt.new、v0、Replit Agent 这条极其拥挤的「AI 应用生成器」赛道里。

但我想拆的不是「它能生成代码」这件事——那已经不稀奇了。我真正感兴趣的是它的**工程姿态**：它**没有用任何 Agent 框架**，没有 LangGraph，没有 Claude Agent SDK，甚至没有用模型原生的 tool-calling。它只用了 Vercel AI SDK 的一个原语 `streamText()`，然后把一个可用编码 Agent 所需要的**全部脚手架**自己手搓了出来。

如果你读过我之前那篇[《Agent Engineering 全景地图》](../agent-engineering-the-98-percent-harness/)，会记得一个核心论点：**模型是买来的，harness 是你造的，工程杠杆全在那 98.4%**。open-lovable 就是这句话一个绝佳的、可以逐行验证的真实样本。这篇文章会沿着四个维度把它拆开：产品定位 → Agent 架构 → 自研 harness（独立成章）→ 云端沙箱（独立成章），最后落到可借鉴点。

本文的代码级事实，主要来自对其仓库与 DeepWiki 索引的交叉阅读，关键出处都会标注。

---

## 产品视角：一个伪装成应用的增长漏斗

### 它到底是什么

一句话：**输入一个网址或一句话描述，AI 在云端沙箱里生成并实时预览一个可运行的 React 应用**。三种核心用法：

- **克隆模式**：用 Firecrawl 抓取目标网站的 Markdown + 截图，让 AI 重建为现代 React 应用；
- **品牌延展（Brand Extension）**：只提取目标站的色彩、字体、间距等设计 token，再用这套品牌规范生成全新页面；
- **搜索生成**：先搜索、再抓内容、再生成。

### 真正聪明的是它的商业意图

open-lovable 本身不直接变现。它是 Firecrawl 的**获客漏斗与技术名片**——你要跑它，就必须配一把 `FIRECRAWL_API_KEY`。于是 27k star 几乎都会顺手成为 Firecrawl 抓取 API 的潜在用户。

这是一个非常值得学习的开源增长策略：**把「抓取」这个相对枯燥的中间件，包装成一个看得见、摸得着、有病毒传播力的完整应用**。同类对照是 Vercel 用 v0 带 Next.js、用 AI SDK 带自家云。开源爆款 Demo 不是慈善，是漏斗顶端。

### 目标用户与边界

它的主要用户是**开发者和技术创业者**，而非纯小白——因为需要自己配 Firecrawl + 至少一家 LLM + 沙箱（Vercel / E2B）的多个 API key。真正的零基础用户会被 README 引导去用托管版 Lovable.dev。这条「开源自托管做技术展示、托管 SaaS 做规模变现」的双层结构，本身就是产品设计。

### 几个值得抄的产品判断

- **感知性能优先于真实性能**：沙箱创建与截图抓取**并行**启动，先给用户看截图占位，代码流式逐字出现，页面「乐观跳转」。一整套手段让等待「显得」很快。
- **对话式增量编辑**：第二轮起自动进入 edit 模式，AI 只动该动的文件，而非整页重生成。
- **克制的生成边界**：系统提示词里硬性规定「简单改动 = 1 个文件、新组件最多 2 个文件、除非明确要求否则不准画自定义 SVG」——刻意压制 AI 过度发挥。这恰恰是同类产品最容易翻车的地方。

---

## 技术总览：四层架构与一条流水线

### 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | Next.js 15.4（App Router）+ React 19 | 同一个 Next 应用既做 UI 又做 API |
| 语言 | TypeScript 5 | 占比 94.9% |
| 状态管理 | Jotai（客户端）+ `sessionStorage`（跨页传参）+ 进程内全局变量（服务端） | **没有数据库** |
| 样式 / UI | Tailwind 3.4 + Radix UI + framer-motion + lucide-react | |
| AI 调用 | Vercel AI SDK（`ai@5`） | 一套 `streamText()` 统一对接 4 家模型 |
| 模型 | `@ai-sdk/anthropic / openai / google / groq` | 按模型 ID 前缀路由 provider |
| 抓取 | Firecrawl（`@mendable/firecrawl-js`） | 抓 Markdown + 截图 + 提取品牌 token |
| 沙箱 | Vercel Sandbox 或 E2B（`@e2b/code-interpreter`） | 工厂模式可切换 |
| 快速编辑 | MorphLLM（`morph-v3-large`，可选） | 差量 apply |
| 传输 | SSE（Server-Sent Events） | 所有长任务的进度 / 流式通道 |

### 四层架构

```
Client（Next.js 15 / React 19）
   ↓  SSE
API Gateway（app/api/**/route.ts）
   ↓
Core Services（会话状态 / 文件选择 / 沙箱管理）
   ↓
Provider 抽象层（Vercel Sandbox ↔ E2B 可切换）
```

一个容易被忽略的真相：**每个生成的 App，实际上是跑在远程沙箱里的一个 Vite + React 项目**。宿主 Next 应用本身不「编译」用户代码，它只是把 AI 生成的文件写进沙箱，让沙箱里的 Vite 去做 HMR，再用一个 iframe 嵌入沙箱暴露的 URL 做预览。整套系统**不需要数据库**——所有状态都在内存全局变量和浏览器 `sessionStorage` 里。

### 克隆流水线的六个阶段

1. **URL 输入 + 配置**（风格、模型、品牌延展开关）→ 存进 `sessionStorage`；
2. **导航与状态传递**：跳转到生成页，沙箱创建在后台并行启动；
3. **内容抓取**：Firecrawl 抓 Markdown + 截图（有缓存则跳过）；
4. **代码生成**：拼 Prompt → `streamText()` 流式输出 → 正则实时切出 `<file>`；
5. **代码应用**：装包 → 写文件到沙箱 → Vite HMR；
6. **预览**：iframe 展示，带多级刷新兜底策略。

这六步是**一条人写死的状态机**，不是 Agent 自主决定的——这一点在下一章会展开，它是理解整个系统的钥匙。

### 一条指令到一个可预览应用：完整流程图

![open-lovable 端到端生成流程：抓取与建沙箱并行、单次流式生成、截断时单文件补全、写入沙箱预览后终止](/images/dissecting-open-lovable/open-lovable-flow.svg)

*蓝底框为 LLM 调用；虚线为回环。⑥ 是唯一的自动重试（仅修复被截断的代码），⑩ 是用户驱动的多轮编辑。*

### 澄清一个常见误解：它不是「反复校验」的闭环

很多人会下意识以为「克隆网站」= 系统**一遍遍对比目标站和自己生成的站、自动收敛逼近**。**不是的。** open-lovable 的克隆是**单次生成（one-shot）**：抓取 → 拼一次 Prompt → `streamText` 跑一遍 → 写入沙箱 → 预览，**就终止了**。它**不会**自动把生成结果再截图、与目标站做视觉 diff、再一轮轮纠偏。那张截图的作用只是：① 给用户当加载占位；②（部分模式下）作为一次性视觉输入喂给模型——**不是用来比对纠错的**。

于是「什么时候终止」要分三层，别混在一起：

- **唯一的自动重试是截断补全**：只针对「代码没输出完整」（`<file>` 标签未闭合、花括号不匹配等），对那个文件补一次。它对应图里 ⑥ 的回环，**和「视觉像不像」毫无关系**；
- **整个克隆的终止** = 那一次流式生成跑完（`complete` 事件）、文件落地、预览出来，结束；
- **后续「更像一点」靠用户**：你在对话里说「导航再大一点」「配色换暖色」，才触发 Edit 模式（Agentic Search 定位文件）再生成一轮——这是**人驱动的多轮**，不是系统自动闭环。

一句话：**视觉逼近是用户多轮对话推进的，不是机器自动收敛的。** 这也再次印证了第三章的判断——它是 workflow，不是会自我评估、自我迭代的 autonomous agent。

---

## Agent 架构：它其实是 workflow，不是 autonomous agent

很多人看到「AI 生成代码 + 对话修改」就默认它背后是个经典 Agent 循环。**不是的。** open-lovable 没有那种「模型决策 → 调工具 → 看结果 → 再决策」的自主 while 循环。用 Anthropic 的术语，它是 **workflow（prompt chaining + routing）**，不是 autonomous agent。理解这点，整个架构就清晰了。

### 三个 LLM 角色（职责分离，不是三个进程）

```
角色 A：意图分析器（Intent Analyzer）
  端点 /api/analyze-edit-intent
  输入：用户 prompt + 文件清单(manifest)
  输出：结构化「搜索计划」{ searchTerms[], editType }
  —— 唯一带「规划」性质的 LLM 调用

角色 B：代码生成器（Code Generator）
  端点 /api/generate-ai-code-stream
  输入：拼装好的上下文 + 系统提示词
  输出：流式 <file>...</file> 或 <edit>...</edit>
  —— 主力 LLM，干重活

角色 C：快速应用器（Morph）
  morph-v3-large
  输入：原文件 + AI 给的 <update> 差量片段
  输出：合并后的完整文件
  —— 专精「把片段精确合并进原文件」的小模型
```

这是一种「**大模型规划 + 大模型生成 + 小模型 apply**」的职责分离，和 Cursor 的「frontier model 出 diff + Fast Apply model 落地」是同一思路。



**补充关于  Manus 架构设计的细节**



① 客户端入口 — CLI / macOS / Web / Mobile 四个并列。注意一个 Manus 的关键设计哲学差异：因为执行全在云端 VM，所以它能做 fire-and-forget（下发任务后关电脑都行），这和 Cursor 那种本地执行、每步都要你授权的形态不同——本地操作可能搞坏你的机器，云沙箱没这顾虑。

② 传输层（pipe） — AG-UI / SSE·WebSocket 把每一步事件流式推给客户端，这就是你看到的"实时操作回放"的底层。

③ 大脑 + ③′ 模型 — 这是全图最该记住的一点：编排是自研薄 loop，不是 LangChain/AutoGen。主 loop 维护状态（不让 LLM 改 status）、Planner 子 agent 跑完即弃、Verifier 做可计算验证。底部那条虚线带是 context engineering——KV-cache / 文件即记忆 / todo.md 复述 / action masking / 保留错误，这才是真护城河。右边模型层是 Claude（选它是因为 long-horizon planning 强）。

④ 云端沙箱 — 你点名的四块全在这：浏览器操作（Chromium + 只取 browser-use 的协议层）、电脑操作（Shell/bash）、代码执行（CodeAct，代码即 action）、文件读取（File System，同时充当"无限上下文"）。右上角标了 HITL，关键操作前人工确认 + token 不出沙箱。

⑤ 状态持久化 — Plan 对象（结构化、驱动前端 step UI）、文件记忆（todo.md + 可恢复压缩）、Session（Replay 回放、可暂停续跑）。





![Manus 类 Agent 完整架构：自研极简 loop + Claude 推理 + 云端沙箱工具 + context engineering，五层结构图](/images/dissecting-open-lovable/manus-architecture.svg)




### 核心亮点：Agentic Search

编辑模式下，它不把整个代码库塞给生成模型，而是跑一个**两阶段、确定性编排的检索**：

```
阶段1 意图分析(LLM)：prompt + manifest → 生成搜索计划
   例: "把 hero 背景改蓝" → searchTerms:["hero","background","bg-"], editType:UPDATE_COMPONENT

阶段2 搜索执行(纯代码，无LLM)：executeSearchPlan()
   - 规范化路径(统一到 /home/user/app/)
   - 遍历文件内容匹配搜索词
   - 提取命中行上下文
   - 按相关性打分(relevanceScore)

阶段3 目标选择：selectTargetFile()
   - 选最高分 + editType 兼容 + 文件类型匹配
   - 产出「外科手术上下文」：单文件 + 精确行号 + confidence 0.95
```

然后给生成模型注入一段**外科手术系统提示词**：

```
SURGICAL EDIT INSTRUCTIONS:
You have been given the EXACT location of the code to edit.
- File: /home/user/app/src/components/Hero.jsx
- Line: 42
- Reason: Found 'bg-' class in Hero component
Make ONLY the change requested. Do not modify any other code.
```

效果对比（DeepWiki 索引给出的口径）：agentic search 文件命中置信度 **90–95%**，朴素关键词匹配只有 **60–70%**，且前者能精确到行号。代价是多一次 LLM 调用 + 50–200ms 搜索。

**这里的设计哲学很关键**：它把「Agent 该读哪些文件」这个本可以交给 LLM 自由 function-calling 去摸索的问题，**降维成「LLM 只产出搜索词 → 代码做确定性检索打分」**。用确定性代码替代不确定的 Agent 循环，换来可控性与成本。

#### 为什么要打分？

根因是一个**多对一的消歧问题**。一组搜索词几乎必然命中多个位置——「把 hero 背景改蓝」拆出的 `hero / background / bg-`，可能同时出现在 `App.jsx`、`Hero.jsx`、`Header.jsx`、`index.css` 里。如果不排序，你只剩两个糟糕选项：

- **把所有命中都塞进上下文**：token 膨胀，而且模型可能同时改好几处、或改错地方；
- **随便挑一个**：大概率挑错。

朴素关键词匹配的致命缺陷正是「all-or-nothing」——它只能告诉你「匹配 / 不匹配」，无法回答「哪一个匹配最值得改」。打分的作用，就是给所有候选**建立一个全序**，从而能稳定地选出**唯一主目标**。`relevanceScore` 不是单一维度，它综合了：

| 维度 | 含义 |
|---|---|
| 词频 | 搜索词在该文件 / 该行出现的密度 |
| 位置 | 命中出现在组件定义、className，还是注释里 |
| editType 兼容 | 改组件优先 `.jsx`，改样式优先含 Tailwind 类的行 |
| 文件类型适配 | 例如 UPDATE_COMPONENT 倾向 `.jsx` 而非 `.css` |

#### 打分的四个目的

1. **消歧 / 单目标定位**：把 N 个候选收敛成 1 个主文件，这是「外科手术式编辑」（单文件、单行）的前提；
2. **排序喂给模型**：在上下文预算内，把最相关的排在最前；
3. **精确到行**：分数附带命中行号，于是提示词里能写出 `Line: 42`，让模型直接定位；
4. **充当降级的决策信号**：分数会折算成 `confidence`（命中时 0.95）。它不只是排序，更是一道**门槛**——高置信度才走外科手术路径，否则触发回落。换句话说，打分同时承担了「选谁」和「要不要相信这次检索」两件事。

#### 什么情况下会终止？

这里要区分三种「终止」，而它们的可终止性，正是这套设计相对自主 Agent 的最大优势：

**1. 检索本身——天然有界，必然终止。** `executeSearchPlan()` 是**纯代码遍历一个有限文件集**（manifest 里通常 10–50 个文件，耗时 50–200ms），扫完即停。它**没有模型在循环里**，所以不存在「Agent 不知道何时收手」的经典问题——终止性是免费的、确定的。这与「LLM 自己决定下一步、可能无限探索」形成根本对照。

**2. 选择成功——产出即终止。** `selectTargetFile()` 选出最高分且 editType / 文件类型兼容的文件，生成 `confidence 0.95` 的外科手术上下文，检索阶段就此结束，交棒给生成模型。

**3. 检索失败——降级即终止（但绝不彻底失败）。** 出现下列任一情况，agentic 路径终止并向下回落：

- 意图分析（那唯一一次 LLM 调用）失败或超时；
- 没有可用的 manifest / 文件缓存；
- 搜索零命中，或最高分低于置信门槛。

此时按 **agentic search → 关键词匹配（`selectFilesForEdit`）→ 全量上下文** 的层级逐级降级。DeepWiki 把这条原则点得很清楚：**每一层都有 fallback，确保编辑操作永远不会彻底失败**——宁可退回精度更低、但一定能出结果的方法，也不让用户的请求空手而归。

一句话：打分把「多个模糊命中」变成「一个带置信度的确定目标」；而终止性之所以不用操心，是因为真正干检索的是**有界的确定性代码**，LLM 只负责一次性地出搜索词——**把可能失控的部分，从循环里彻底挪走了。**

### 为什么「没有循环」反而是对的

经典 agentic loop 让模型自己决定何时收手；open-lovable 的每一步（抓取 → 分析 → 检索 → 生成 → apply → 预览）都是**人写死的卡槽**，模型只在固定位置被调用。

好处是：**可预测、可调试、成本可控、不会跑飞**。对一个面向终端用户的生成器，这恰恰是正确取舍——你不希望 Agent 自己决定装 20 个包、改 15 个文件。**可控性 > 自主性**，这是产品级与 Demo 级的分水岭。

---

## 自研 harness：如何在裸 API 上手搓一套脚手架

这是整篇文章我最想讲的部分，也是 open-lovable 最反直觉的地方：**它直接用 LLM API，而不用 Claude Agent SDK、不用 CLI 工具、不用任何 Agent 框架。** 那么，一个可用编码 Agent 所需的全部能力——orchestration、工具调用、上下文管理、重试恢复——它是怎么补出来的？

### 先对齐概念：这里的 harness 指什么

Claude Agent SDK / Claude Code 帮你内置了一整套脚手架：Agent 主循环、原生 tool-use 协议、文件工具、上下文压缩、重试。你只管定义工具和提示词。open-lovable **放弃了这一整套**，只用 `streamText()` 作为唯一与模型的接触点，然后把上面这些能力**全部自己实现**。所以它的 harness = 「把裸 `streamText()` 包装成一个可用编码 Agent 的全部自研脚手架」。它可以拆成五个子系统。

### 子系统 1：模型调用层——`streamText()` 作唯一原语

不直接调 Anthropic SDK，而是走 Vercel AI SDK：

```
createAnthropic() / createOpenAI() / createGoogleGenerativeAI() / createGroq()
        ↓ 统一成
streamText({ model, system, prompt }) → 流式 token
```

一套接口对接 4 家模型，按模型 ID 前缀路由。这是 harness「可换模型」的地基。

### 子系统 2（灵魂）：用文本 DSL 替代原生 tool-calling

这是整个 harness 设计的**核心决策**。它**不用 function-calling / tool-use**，而是发明了一套 XML 式文本协议，让模型把「要做的动作」写进正文：

```xml
<file path="src/components/Hero.jsx"> ...完整文件... </file>
<package>lucide-react</package>
<edit target_file="src/App.jsx"><update>...差量片段...</update></edit>
<explanation> ...给用户看的说明... </explanation>
```

模型不「调用工具」，它只是**输出带标签的文本**；真正的动作（写文件、装包、执行命令）由 harness 解析标签后在代码里执行。换句话说：**工具调用被「协议化 + 后置化」了**——模型负责声明意图，harness 负责落地执行。

### 子系统 3：流式解析器——边出 token 边切文件

`streamText` 的 token 流被一个正则解析器实时消费：

```
/<file path="([^"]+)">([^]*?)<\/file>/g
```

每命中一个完整 `<file>` 就解析出路径 + 内容、判断 jsx/css/json、决定新建还是更新，**同时通过 SSE 把进度推给前端**（`thinking / stream / file-progress / complete`）。这就是「代码逐字出现在预览里」那种体验的来源。包名则从 `<package>` 标签 + `import X from '...'` 两路提取。

### 子系统 4：可靠性层——截断检测 + 聚焦补全 + 重试回落

裸 API 没有任何「输出保证」，harness 自己补：

- **截断检测**（保守多信号）：`<file>` 标签未闭合 / HTML 以 `<` 结尾 / 花括号差值 > 3 / 出现 `function X(){` 后戛然而止 → 判定被截断。它还**特意跳过对 `...` 的检测**，以避免和扩展运算符、loading 文案误判；
- **聚焦补全**：只对那个被截断的文件**再发一次 `streamText`** 做定向补全，把内容拼回原处，而不是整体重来；
- **重试与回落**：服务不可用指数退避（2s/4s），Groq 失败自动切 GPT-4，工具校验错误跳过继续。

### 子系统 5：上下文 / 记忆层——全手工编排

没有 SDK 的自动上下文管理，全自己算：

- **manifest + agentic search**：编辑时不塞全量代码，先让模型出搜索词 → 代码确定性检索 → 只给命中的单文件；
- **会话记忆配额化**：最近 3 次编辑 + 5 条消息（每条截 100 字）+ 2 次重大改动，**总量封顶 2000 字符**；
- 状态存在进程内全局变量 + 后端文件缓存，无数据库。

### 它的「主循环」其实没有循环

| | Claude Agent SDK 范式 | open-lovable 范式 |
|---|---|---|
| 控制流 | 模型决策 → 调工具 → 看结果 → 再决策的**自主 while 循环** | 一条**人写死的状态机流水线** |
| 工具调用 | 模型在循环里**请求**工具 | harness 解析文本后**主动**执行 |
| 收手判断 | 模型自己决定 | 流水线终点写死 |
| 形态 | autonomous agent | workflow（chaining + routing） |

### 为什么不用 Agent SDK / tool-calling？（设计动机）

这不是偷懒，是有明确理由的：

| 诉求 | 为什么文本协议 + 自研 harness 更合适 |
|---|---|
| **流式 UX** | 要让代码逐字出现在 iframe 预览里。原生 tool-use 返回结构化块，难做字符级流式渲染；文本流天然可边出边解析边显示 |
| **多模型** | 要在 Anthropic/OpenAI/Gemini/Groq 间随意切。各家 tool-calling 语义不一致，**纯文本标签是最大公约数**，一套解析器通吃 |
| **确定性** | 不希望模型自主决定装多少包、改多少文件。流水线写死，每步可预测、可埋点 |
| **成本 / 延迟** | 避免 Agent 循环的多轮往返，多数生成一次 streamText 搞定 |
| **产品形态** | 它是面向终端用户的生成器，不是给开发者的自主 Agent，**可控 > 自主** |

### 代价：这套自研 harness 的脆弱点

- **正则解析 LLM 文本极脆**：边界一多就崩——所以才被迫堆那么多截断检测和 fallback。本质是「用文本协议换多模型 + 流式」的必然税；
- **没有真正的 Agent 自主性**：模型不能自己探索代码库、多步推理调工具，能力天花板由人写的流水线决定；
- **工具协议要自己维护**：`<file>/<package>/<edit>` 这套 DSL 的鲁棒性、提示词里的约束规则，全靠手工打磨；
- **无状态持久化**：进程内全局态，重启即丢。

一句话：open-lovable 的 harness 用**文本协议替代原生 tool-calling**（换来多模型 + 流式），用**确定性流水线替代自主 Agent 循环**（换来可控性），再用**一整套防御性工程**把裸 API 的不可靠兜成产品级可用。这是「不依赖任何框架、直接驯服原始 API」的典型范本——和 Claude Code 那种「框架替你管一切」恰好是两条相反的路。

---

## 云端沙箱：可切换的执行底座与最佳实践

生成的代码要真的跑起来、能预览，就需要一个云端执行环境。open-lovable 支持两家——E2B 与 Vercel Sandbox——并用一层抽象把它们隔开。这一层的工程质量很高，值得单独拆。

### 为什么非要用沙箱？场景到底是什么

先回答一个根本问题：为什么不能直接在自己的 Next.js 服务进程里跑生成的代码，非得搞一个云端沙箱？四个理由：

1. **跑的是不可信代码**。AI 生成的 React 项目要真的 `npm install` + 起 Vite dev server，本质就是在**执行任意代码**。一行 `rm -rf`、一个死循环、一个挖矿脚本，就能拖垮甚至攻陷你整个后端。**绝不能让它和你的服务进程同处一地。**
2. **需要一台真实的「机器」**。要有真实文件系统、能装 npm 包、能起进程监听端口、能被 iframe 公网访问——这不是「调个 API」能给的，必须有一台（虚拟）机器。
3. **多租户隔离**。每个用户 / 每次会话必须互相隔离，A 用户的代码不能看到、不能动 B 用户的文件与进程。
4. **即用即弃 + 计费**。会话结束就销毁、不留痕迹，按分钟计费。

这类需求的**通用场景**远不止 open-lovable：AI 代码解释器（ChatGPT Code Interpreter 那一类）、Agent 的代码执行工具、在线 IDE / playground、CI 临时环境、数据分析沙箱——凡是「让 AI 或用户跑你无法预先信任的代码」，都需要这样一层。**沙箱不是性能优化，是安全边界。**

### E2B 的底层：Firecracker microVM 与 Linux 的关系

E2B 不是「容器即服务」，它的每个沙箱 = 一个 **Firecracker microVM**。这件事决定了它的隔离强度，值得讲透。

**Firecracker 是什么。** 它是 AWS 开源的轻量级虚拟机监控器（VMM），也是 **AWS Lambda / Fargate 背后的同款技术**，每月扛数万亿次函数调用。它的设计目标就是「像容器一样快、像虚拟机一样隔离」。

**关键：microVM ≠ 容器。** 这是理解 E2B 安全模型的核心：

| | 容器（Docker） | Firecracker microVM（E2B） |
|---|---|---|
| 内核 | **共享宿主机同一个 Linux 内核** | **每个 VM 跑自己独立的 Linux 内核** |
| 隔离机制 | namespace / cgroup（软件隔离） | KVM 硬件虚拟化（CPU 级隔离） |
| 逃逸风险 | 内核有漏洞就可能逃逸到宿主 | 两个沙箱内核代码零共享，横向扩散被从根堵死 |
| 启动 | 毫秒级 | ~125ms（快照恢复 ~150ms 冷启动） |
| 适合 | 可信负载 | **不可信代码执行** |

容器靠 namespace/cgroup 在**同一个内核**上切分资源——一旦那个共享内核出漏洞，就可能逃逸到宿主、波及其他租户。Firecracker 走 KVM 硬件虚拟化，**每个 microVM 有自己独立的 Linux 内核**，两个沙箱之间内核代码零共享。这正是「跑不可信的 AI 生成代码必须用 VM 级隔离、而不是容器级」的原因。

**它和 Linux 的关系。** 每个沙箱里就是一个**精简的真 Linux**：自己的内核 + 极简根文件系统。所以你能在里面 `npm install`、跑 Node、监听 5173 端口，和一台真实 Linux 机器无异；但它被 Firecracker 这层硬件虚拟化边界，与宿主和其他租户彻底隔开。Firecracker 还**故意砍掉了绝大多数设备模拟**（无 BIOS、无 PCI、最小化设备集），attack surface 极小，内存开销只有约 5MB，这既提升了安全也让它启动飞快。

**为什么这么快——靠快照。** E2B 预热一批 VM 到 ready 状态、打**内存快照**；新请求直接**从快照恢复**而不是从头 boot 内核，冷启动压到 ~150ms。它还能 pause/resume（5–30ms）保留内存 + 文件状态，支撑多轮 agent 会话的状态持久——这也是为什么前文说 E2B「SDK 层面支持按 ID 重连」。

**回到 open-lovable。** 它在 E2B 这个 microVM 里 `setupViteApp()` 起 Vite、把生成的文件写进去，再用 microVM 暴露的 URL 喂给 iframe。前文强调的「命令包进 Python subprocess、数组传参防注入」之所以重要，正是因为**这层里跑的就是不可信代码**——VM 隔离是第一道防线，subprocess 防注入是第二道，两道叠起来才够。

**顺带一提选型谱系**：纯容器（最快、隔离最弱）→ gVisor（Google 的用户态内核，拦截 syscall，介于两者之间）→ Firecracker microVM（隔离强、启动仍快）→ 传统 QEMU 全虚拟化（最重）。E2B 选 Firecracker，正是踩在「隔离强度 vs 启动速度」的甜点上。

### E2B vs Vercel Sandbox：底层差异

两者都是「云端按需启动的隔离执行环境」（microVM / 容器，可联网、能跑任意代码、用完即焚），但运行模型完全不同：

| 维度 | **E2B（`@e2b/code-interpreter`）** | **Vercel Sandbox（`@vercel/sandbox`）** |
|---|---|---|
| 定位 | 给 AI agent 用的**代码解释器沙箱** | Vercel 边缘基础设施上的**通用 Node 沙箱** |
| 运行时 | Python 内核（`runCode()` 跑 Python） | Node.js 22，直接跑 shell |
| 工作目录 | `/home/user/app` | `/vercel/sandbox`（写死） |
| 鉴权 | `E2B_API_KEY` | OIDC Token（部署内自动）或 PAT |
| 命令执行 | 包进 Python `subprocess.run(shell=False)` | SDK `runCommand()` 直接执行 |
| 文件 API | 原生 `files.write/read` | `writeFiles()`（Buffer） |
| 重连 | SDK 支持按 ID 重连（项目里暂占位） | **不支持** |
| 超时 | 可调，默认 10 分钟 | 创建时固定，默认 300s |
| 输出类型 | string | **string 或 function**（需 await） |
| 最适合 | 安全敏感、跨平台一致的执行 | shell 密集、贴合 Vercel 生态 |

**一句话区分**：E2B 是「为 AI 执行代码而生」的沙箱，强在安全隔离；Vercel Sandbox 是「Node 应用临时托管」，强在与 Vercel 部署 / 边缘网络无缝集成。

### 抽象基类 + 工厂：核心解耦点

定义一个 `SandboxProvider` 抽象类，规定统一契约：`createSandbox / runCommand / writeFile / readFile / listFiles / installPackages / getSandboxUrl / terminate / isAlive`，外加可选的 `setupViteApp / restartViteServer`。两个 provider 各自实现，`createSandbox()` 工厂按环境变量挑实现。**业务层只依赖抽象接口，完全不知道底下是谁。** 这是整个沙箱层最值得抄的设计。

### 两种截然不同的执行策略

**E2B：一切包进 Python。** 每条 shell 命令都被翻译成：

```python
import subprocess, json
result = subprocess.run(json.loads('["npm","install"]'),  # 数组传参，shell=False
    capture_output=True, text=True)
print(result.stdout)
```

为什么？三个理由：**杜绝 shell 注入**（数组传参不拼字符串）、**跨平台一致**（Python 抹平差异）、**结构化输出**（可返回 JSON）。文件写入优先用原生 `files.write()`，失败回落 Python `os.makedirs + open`。**沙箱里跑的是 AI 生成的不可信内容，注入风险是真实的。**

**Vercel：直连 shell + 多级回落。** 直接 `runCommand({cmd, args})`，但要处理一个坑——Vercel SDK 的 stdout/stderr 可能是函数也可能是字符串，得两种都兼容。文件写入：先 `writeFiles()`，失败回落 `mkdir -p + echo 重定向`（且要转义内容）。`npm install` 也是两段式：先直连，失败再 `sh -c 'cd /vercel/sandbox && npm install'`。

### Vite 脚手架的网络配置（最容易卡的地方）

两个 provider 的 `setupViteApp()` 产出完全相同的项目结构，但 `vite.config.js` 几个设置是精华：

```js
host: '0.0.0.0',        // 必须，否则 iframe 跨网络访问不到
hmr: false,             // 关掉热更新——稳定性优先于速度
strictPort: true,       // 端口固定 5173，URL 可预测
allowedHosts: [...]     // 白名单 E2B/Vercel 域名，否则被 Vite 拦截
```

启动方式：E2B 用 Python `Popen()` 后台跑；Vercel 用 `nohup ... &` 后台跑、日志重定向到 `/tmp/vite.log`。启动后**硬等 7 秒**确保 server ready 才返回 URL。

### 生命周期：单例 + 空闲 GC 控成本

`SandboxManager` 是个全局单例，用 `Map<sandboxId, SandboxInfo>` 注册所有沙箱，记录 `createdAt / lastAccessed`。`getOrCreateProvider()` 对 E2B 尝试重连、对 Vercel 直接新建；空闲超过 `maxAge`（默认 1 小时）自动 `terminate()`；每次访问刷新 `lastAccessed`，活跃沙箱不会被误杀。

### 最佳实践（从这套代码提炼）

1. **永远用 Provider 抽象隔离厂商**——避免被单一沙箱供应商锁死，也方便本地 / 测试 mock。
2. **命令执行优先「数组传参」，不要拼 shell 字符串**——E2B 的 `subprocess.run(array, shell=False)` 是防注入范本。
3. **关键操作都要有「原生 API → shell 回落」双通道**——沙箱 SDK 在权限 / 路径 / 网络边界上不稳定，单一路径必翻车。**回落不是冗余，是生产可用性的底线。**
4. **网络配置三件套必须对**——`host:'0.0.0.0'` + `strictPort` + `allowedHosts` 白名单，是 dev server 能被 iframe 访问的硬前提。
5. **用「固定延时 + 端口固定」换可预测性**——短生命周期、网络不稳的沙箱里，稳定 > 极致速度。
6. **后台进程要管好**——`nohup/Popen` + 日志重定向 + 重启前 `pkill -f vite || true`，否则端口冲突、进程泄漏。
7. **集中式生命周期 + 空闲 GC 防止烧钱**——沙箱按分钟计费，忘记 terminate 就是持续扣费。**这是自托管最容易踩的钱坑。**
8. **按「是否需要状态持久」选型**——E2B 支持重连适合长任务；Vercel 启动快适合一次性预览。
9. **创建即清理旧实例**——两个 provider 的 `createSandbox()` 第一步都是 kill/stop 旧实例 + 清空文件追踪。

### 这套沙箱设计的局限

- `isAlive()` 只检查对象是否存在，不验证真实网络 / 进程健康——是浅检查；
- E2B 重连在项目里是占位的（返回 false），实际上每次断连仍丢状态；
- 全局单例 + 内存 Map、无持久化——进程重启注册表全丢，天然不支持多实例水平扩展；
- 硬编码 7 秒延时是脆弱妥协，更好的做法是轮询端口直到 ready。

---

## 可借鉴点：做产品与写代码都用得上

把一整套拆解收敛成可以直接复用的设计模式：

1. **「开源爆款 Demo 做增长漏斗」**——把你的核心能力包装成有传播力的完整应用，star 自然转化为 API 用户。
2. **感知性能三件套**：并行启动 + 占位截图 + 流式逐字输出。
3. **文本 DSL 替代 tool-calling**——当你需要多模型兼容 + 字符级流式时，自定义 `<tag>` 协议比原生 tool-use 更灵活（代价是要自己写解析与容错）。
4. **确定性流水线替代自主 Agent 循环**——面向终端用户的产品，可控性远比自主性重要。
5. **Agentic Search 替代全量上下文**——大代码库编辑的标准解法：LLM 出搜索词、代码做确定性检索，省钱又准。
6. **截断检测 + 单文件聚焦补全**——任何依赖 LLM 长输出的产品都该抄的韧性机制。
7. **上下文配额化**——把「记忆」做成有明确字符 / 条数预算的工程问题。
8. **Provider 抽象 + 双通道回落**——沙箱 / 模型都做成可切换、可降级，避免被单一供应商锁死。

---

## 不是让 Agent 更自由，而是把 LLM 框得更稳

open-lovable 最有价值的，从来不是「它能生成代码」这个结果，而是**为了让不可靠的 LLM 输出变得可用，它堆叠的那一整套防御性工程**：流式协议、截断恢复、agentic search、多级 fallback、感知性能优化、可切换沙箱。

它用一句话总结了当下「产品级 AI 应用」区别于「Demo 级 Agent」的核心——

> **不是让 Agent 更自由，而是用确定性的代码编排去框住非确定性的 LLM。**

模型是买来的，harness 是你造的。无论你用不用 Agent SDK，真正决定一个 AI 应用能不能上生产的工程量，永远在模型外面那一圈你亲手写的脚手架里。open-lovable 把这一圈，结结实实地展示了一遍。

---

**参考来源**

- [firecrawl/open-lovable（GitHub）](https://github.com/firecrawl/open-lovable)
- [open-lovable 架构索引（DeepWiki）](https://deepwiki.com/firecrawl/open-lovable)
- 配套阅读：[《Agent Engineering 全景地图：那 98.4% 的工程量到底在哪里》](../agent-engineering-the-98-percent-harness/)

