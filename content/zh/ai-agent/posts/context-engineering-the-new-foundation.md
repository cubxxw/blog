---
title: "Context 不是 Prompt：上下文工程如何成为 AI Agent 的新地基"
date: 2026-06-22T03:30:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Context Engineering
  - AI
  - LLM
  - Agent
  - MCP
categories:
  - Development
description: >
  本文从 Anthropic 与 Sourcegraph 的代表性框架出发，解释上下文工程与提示词工程的边界，并核对上下文腐烂、检索重排、Claude Code 自动压缩、服务端 compaction 与记忆系统。面向 AI Agent 工程师；核心结论是上下文并非越多越好，关键是让高信号信息在正确时刻进入窗口。
tldr:
  - 提示词工程是把一句话写好；上下文工程是在每一次推理时，决定整扇上下文窗口里装什么、按什么顺序、淘汰什么。重心从「措辞」转向了「布线」。
  - 上下文是有限资源，存在「上下文腐烂」：token 增多时，模型对其中信息的召回可能变差。工程目标是找到信息量最高的最小充分上下文。
  - 两套有代表性的框架提供了互补视角：LangChain 的 Write / Select / Compress / Isolate 描述动作，Sourcegraph 的 Instructions / Retrieval / Memory / Tools 描述对象；它们不是行业标准。
  - 记忆与上下文工程紧密相关但需要区分：上下文工程整理当前输入，记忆研究还关心信息如何形成、演化并在跨轮次或跨会话中被取回。
  - 我的判断：真正稀缺的从来是「世界线」，而非模型——只有你的上下文能让 AI 知道你是谁、在哪、要什么。这条线值得 local-first 地长在你自己手里。
maturity: budding
faq:
  - q: "上下文工程（Context Engineering）是什么？"
    a: "上下文工程是在 LLM 每一次推理时，对进入上下文窗口的最优 token 集合——系统提示、检索到的文档、对话历史、工具定义与记忆——进行筛选、排序与维护的一整套工程策略。这一定义来自 Anthropic 的工程实践文章，Karpathy 也公开支持用它取代「提示词工程」作为更准确的说法。"
  - q: "上下文工程和提示词工程有什么区别？"
    a: "提示词工程优化的是「一句话的措辞」，上下文工程优化的是「整扇窗口的布线」。Sourcegraph 给过一个可操作的判据：如果你在替换名词和形容词，是提示词工程；如果你在改变 agent 检索什么数据、以什么顺序、用什么重排、窗口满了淘汰什么，就是上下文工程。"
  - q: "什么是上下文腐烂（Context Rot）？"
    a: "指随着上下文窗口内 token 数量增加，模型准确召回其中信息的能力可能下降的现象。Transformer 的 n² 两两注意力关系是 Anthropic 提到的一种机制，训练序列分布、位置编码与信息位置等因素也会影响结果，不能把它写成唯一原因。因此工程目标是寻找高信号的最小充分上下文，而不是默认塞满窗口。"
  - q: "上下文工程有哪些主流方法框架？"
    a: "可以参考两套有代表性的框架：LangChain（Lance Martin）的 Write / Select / Compress / Isolate——写出窗口外、按需选进来、压缩到必需、多 agent 隔离；以及 Sourcegraph 的 Instructions / Retrieval / Memory / Tools。前者描述动作，后者描述对象，但它们不是经过标准组织认证的行业共识。"
cover:
  image: '/images/blog/context-engineering-desk.webp'
  caption: '上下文工程：把模型的房间布置好——Write / Select / Compress / Isolate，和那条 local-first 的世界线。'
  alt: '书桌上的笔记本电脑显示「Context 不是 Prompt」文章与核心要点面板，旁边摊开的笔记写着 Context Engineering 的四支柱与 Worldline'
columns:
  - agent-engineering
---

**上下文工程（Context Engineering）是在 LLM 每一次推理时，对进入上下文窗口的最优 token 集合——系统提示、检索文档、对话历史、工具定义与记忆——进行筛选、排序与淘汰的一整套工程策略。** 它与提示词工程的区别一句话讲清：提示词工程优化「一句话的措辞」，上下文工程优化「整扇窗口的布线」。这个定义来自 Anthropic 的工程文章，Karpathy 也公开背书了这次改名。下文把这门正在成形的学科完整拆开。

> 「与其说我们在写提示词，不如说我们在为模型布置一间房间——决定哪些东西摆进来、摆在哪、什么时候搬走。措辞只是房间里的一张便签，而我们真正在做的，是装修。」

如果你在 2024 年问我「怎么用好 AI」，我大概率会跟你聊提示词：怎么写指令、怎么设定角色、怎么给例子。但如果你今天再问我同一个问题，我的回答会完全不同。

因为这一年里，一线工程实践已经悄悄换了一个词——**Context Engineering（上下文工程）**。它不是提示词工程换个说法的营销话术——它标志着一次重心的真正迁移：从「怎么把一句话写好」，转向「怎么决定模型在每一次推理时究竟看到什么」。

这篇文章想做两件事。第一件，用**逻辑核**把这门正在成形的学科拆开：它到底是什么、和提示词工程的边界在哪、有哪些已经在生产环境跑起来的设计模式。第二件，用**感性核**回到我自己——作为一个把 AI 当成环境而非工具、坚持 local-first 的人，我为什么认为上下文工程的尽头，是一条叫「世界线」的东西。

---

## 先把边界划清楚：Prompt 与 Context 不是同一件事

最容易混淆的，是把上下文工程当成「提示词工程的高级版」。它们确实相关，但不是同一层的东西。

Anthropic 在它那篇被广泛引用的工程文章里给了一个干净的区分：**提示词工程是「编写和组织 LLM 指令的方法」；而上下文工程是「在 LLM 推理过程中，对最优 token 集合进行筛选与维护的一整套策略」**——这个集合包括系统提示、检索到的文档、对话历史、工具定义、记忆，以及所有可能落进上下文窗口、但不属于「提示词」的信息。[^anthropic]

Andrej Karpathy 在 2025 年 6 月那条被反复转发的推文里说得更直白：「+1 支持用『上下文工程』取代『提示词工程』……这是一门精细的艺术与科学：用恰好正确的信息，填满下一步所需的上下文窗口。」[^karpathy]

而 Sourcegraph 在 2026 年的实践文章里，给了一个我特别喜欢的、可操作的判据：

> 「如果你在替换名词和形容词，你还在做提示词工程。如果你在改变 agent 检索什么数据、以什么顺序、用什么重排、以及当窗口被填满时淘汰什么——你在做上下文工程。」[^sourcegraph]

**重心从「措辞（wording）」转向了「布线（wiring）」。** 这一句话，是我读完所有材料后觉得最值得记住的。提示词工程关心的是字面；上下文工程关心的是管道——数据从哪进来、经过哪些处理、在窗口里待多久、什么时候被踢出去。

这不是文字游戏。当你的 agent 只是一个单轮聊天框时，写好一句话几乎就是全部工作。但一旦它有了工具、有了记忆、有了检索层，写提示词就只剩下整个系统里很小的一块；剩下的全是围绕它的上下文工程。

---

## 为什么是「工程」：上下文是有限资源，而且会腐烂

把它叫「工程」而不是「技巧」，是有硬道理的。因为上下文窗口不是一个越大越好的容器——它是一种**有限资源，且边际收益递减**。

Anthropic 的原话是：「上下文必须被当作一种有限资源来对待，它的边际收益是递减的。」以及——「好的上下文工程，意味着找到那个信息量最高的、最小的 token 集合，去最大化某个期望结果的可能性。」[^anthropic]

支撑这个判断的，是一个叫 **Context Rot（上下文腐烂）** 的现象：**随着上下文窗口里 token 数量增加，模型从中准确召回信息的能力可能下降。**[^anthropic] Anthropic 给出的解释里，Transformer 对 n 个 token 建立 n² 个两两注意力关系，因此上下文越长，捕捉远距离关系越困难；但这只是可能机制之一。训练数据里长序列较少、位置编码、信息所在位置、任务类型和模型差异都会影响表现，不能把「n²」写成唯一因果。Chroma 的长上下文实验给出了跨模型、跨长度的经验观察，但它仍是基准测试，不是对所有真实任务的定律。[^chroma]

这里有个反直觉但关键的细节，Anthropic 自己也强调了：**最小，不一定等于短。** 你要把上下文砍到「信息密度最高」，而非砍到最短——留下高信号的，扔掉低信号的。

对我来说，这一条把「Context is the bottleneck」从一句我一年前在自己笔记里写下的判断，变成了一个有物理基础的结论。瓶颈从来不在模型本身有多聪明，而在于：**在这一次推理里，它有没有看到那条恰好正确的信息。** 你给它一百万 token 的噪声，不如给它一千 token 的信号。

---

## 两套代表性框架：从动作与对象看同一扇窗

上下文工程仍在快速演化，还没有被某个标准组织定成一张唯一地图。2025 到 2026 年间，有两套**有代表性、且互补**的四分法值得借来思考——注意，它们是作者和公司的实践框架，不等于行业已经收敛出的标准答案。

### 第一套（LangChain / Lance Martin）：Write / Select / Compress / Isolate

LangChain 的 Lance Martin（这个分类法的提出者）在 2025 年 6 月把所有做法归成四桶：[^langchain][^lance]

- **Write（写出去）**：把信息保存到上下文窗口**之外**（比如草稿、外部文件、记忆）。
- **Select（选进来）**：在需要时把信息**拉进**窗口。
- **Compress（压缩）**：只保留完成任务**所需**的 token。
- **Isolate（隔离）**：把上下文**拆开**（比如多 agent，各自持有自己那一块）。

### 第二套（Sourcegraph）：Instructions / Retrieval / Memory / Tools

Sourcegraph 用一个明确的标题「上下文工程的四大支柱」给出了另一个切面：[^sourcegraph]

1. **Instructions / 系统提示**：身份、规则、约束。
2. **Retrieval / 检索**：RAG、向量、SQL、文件、即时（just-in-time）检索。
3. **Memory / 记忆**：短期（对话 + 工具结果）+ 长期（偏好、约定、摘要）。
4. **Tools / 工具**：agent 能调用的能力。

这两套并非竞争关系——它们是从「**做什么动作**」（Write/Select/Compress/Isolate）和「**管什么对象**」（Instructions/Retrieval/Memory/Tools）两个维度切同一块地。把它们交叉起来看——比如「对 Memory 做 Compress」「对 Retrieval 做 Select」——你大致就拿到了上下文工程的整张地图。

> 一个诚实的提醒：这两套是兼容且互相强化的，但**不是同一组标签**。任何把它们硬说成「同一个四支柱」的说法都是偷懒。我更愿意把它们当成两张投影，从不同角度照同一个立体。

---

## 落到地上：那些已经在跑的设计模式

抽象框架之外，真正让我兴奋的是——这一年，上下文工程的设计模式已经从「经验谈」变成了**第一方 API 原语**和**可复现的工程做法**。

### 检索后重排：从 50 → top-5 的经验示意说起

Sourcegraph 给了一个便于理解的经验示意：先用高召回检索取 50 个候选，再重排到 top-5，往往比把 50 块全部塞进提示词更合适。这里的 **50 → 5 不是通用最优参数，也不是跨数据集基准结论**；真实的候选数和 top-k 仍要按召回率、延迟、成本与离线评测来定。它真正说明的是两阶段思路：先尽量别漏，再用 cross-encoder 或更便宜的模型排序，只把当前任务所需的高信号片段送进窗口。[^sourcegraph]

这正是 Context Rot 的工程解药：**宁可少而准，不要多而糊。**

### 在进窗口之前就砍，而不是进去之后再后悔

Sourcegraph 把 token 预算管理定义为「在低信号内容**进入**上下文窗口之前就把它砍掉的纪律，而不是进去之后」。具体手段包括：截断工具输出、把旧对话压缩成滚动摘要、丢掉相关度低于阈值的块、给重排器设硬上限。[^sourcegraph]

### 压缩式 compaction：Claude Code 在窗口将满时自动收束

一个直观例子是 Claude Code 的 auto-compact：它默认开启，在上下文接近上限时把较早的交互轨迹压成摘要。常见版本的默认触发点约在窗口使用量的 **95%**，但这不是跨版本不变的常数；模型、上下文窗口和版本都会改变实际边界。Claude Code 也允许用 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 把触发比例调低，或用 `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 调整用于计算的窗口容量。当前官方文档进一步说明，某些本地模型会在模型上下文上限触发，部分模型与云会话则会主动提前压缩。[^claude-code-env]

### Anthropic 把上下文管理做进了 API

这是我觉得最有信号意义的一步——上下文管理不再只是客户端自己手搓的脚本，而是平台级能力。Anthropic 当前把几类不同策略做成了第一方原语：[^cookbook][^context-editing][^server-compaction]

- **Server-side Compaction（`compact_20260112`）**：对话达到可配置 token 阈值时，由服务端生成摘要块；Anthropic 目前把它列为长会话与 agent 工作流的推荐策略。
- **Tool-Result Clearing（`clear_tool_uses_20250919`）**：清掉窗口内那些「可以重新取回」的陈旧工具结果。
- **Memory tool（`memory_20250818`）**：把信息移到窗口**之外**，让它跨会话存活。

其中 Memory tool 的设计哲学很对我的胃口：它是**客户端实现**的——API 只提供协议、并自动注入一段「检查记忆」的系统提示，而**数据存在哪、怎么存，由你这个客户端决定；模型只决定什么时候存、存什么。** 这恰好把「存什么」（模型的决策）和「怎么存」（客户端的实现）解耦开了。[^cookbook]

还要补一条截至本文复核时很容易被旧示例遮住的变化：Python、TypeScript 与 Ruby SDK `tool_runner` 的客户端 `compaction_control` 参数已经被标记为弃用，未来会移除。除非确实需要在客户端控制摘要过程，否则官方建议迁移到服务端 compaction；工具结果清理与 thinking block 清理则仍属于服务端 context editing 的细粒度策略。[^context-editing] 这些带日期的版本标识符会继续演进，别把示例代码当成永恒真理。

### KV-cache 命中率：生产环境里被低估的那条命脉

如果说前面几条是「装配上下文」的艺术，那 Manus 团队那篇造 agent 的复盘文章，讲的就是上下文工程在**生产环境**里的经济学。联合创始人 Yichao「Peak」Ji 的原话是：**「KV-cache 命中率是生产阶段 AI agent 最重要的单一指标，它同时直接影响延迟和成本。」**[^manus]

为什么重要？因为「哪怕一个 token 的差异，都会让缓存从那个 token 起整段失效」。最经典的反模式：**在系统提示里放一个时间戳**——每秒都在变，缓存永远命不中。

由此引出他们那条「Mask, Don't Remove（要遮蔽，别移除）」的原则：工具定义放在上下文靠前的位置，所以任何对工具列表的动态增删都会让 KV-cache 失效。他们的解法不去中途加减工具，改为**直接对 token 的 logits 做掩码**来约束模型能选哪个动作——既保住缓存，又避免破坏 schema。[^manus]

还有一条我特别喜欢的、近乎哲学的设计：**把文件系统当作终极上下文**——「无限大、天然持久」。压缩策略始终设计成**可还原**的：一个网页的内容可以从上下文里丢掉，**只要它的 URL 还在**。[^manus]

> 这条「可还原压缩」，我愿意单独拎出来讲。它删掉的只是当下的体积，**给信息留了一个回家的地址**。这和我做笔记的方式是同构的：正文可以折叠、可以摘要，但链接和出处永远留着——任何时候都能顺着线索把全貌取回来。

---

## 把厂商的动作放进来：当「上下文层」变成产品

如果说上面是「个人/工程」尺度的上下文工程，那 2026 年还有一条更大的线：**厂商开始把「上下文层（context layer）」当成独立产品来卖。**

最有代表性的、也是我手头**唯一拿到扎实证据**的，是 Databricks 的 **Genie Ontology**。它被定义为一个自动的上下文层：从表、查询、仪表盘、管道和连接的应用里自动**抽取知识片段**，组织成「一张关于公司如何运转、数据到底意味着什么的活图谱」。[^databricks]

它的论点，几乎是我那句「context is the bottleneck」的企业版：**真正的瓶颈是散落各处、无法被访问的业务上下文，而非基座模型。** Databricks 的原话是——业务上下文「散落在仪表盘、查询、管道、wiki、工单、文档和聊天记录里」；而「当 AI 不容易找到它需要的信息时，它会用推断去填补空白，产出的答案好的时候是泛泛而谈，坏的时候就是错的」。[^databricks]

> ⚠️ 这里我必须对你诚实，也对自己诚实：Databricks 这篇是**厂商的产品营销**，应当当作「Databricks 的立场/定位」来引用，而不是独立证据。它原文里那个 84.5% vs 52.4% 的对比跑分，在我的事实核查里**被否决了**，所以我一个数字都不会引——立场可以引，跑分不行。这也是上下文工程的一种元纪律：**进入你论证窗口的每一条信息，都要先过一遍「它的来源配得上这个结论吗」。**

至于研究里反复被提到的 AWS Context 和 Microsoft Fabric IQ——它们确实存在、方向一致（都在做「上下文层」），但我这轮核查里**没有拿到可独立验证的细节**，所以我只点到为止，不展开、不编造。这是一个负责任的作者应该守住的边界。

---

## 上下文 vs 记忆：一扇窗，和窗外那条河

到这里必须澄清一个常被混为一谈的关系：**记忆（Memory）和上下文工程紧密相关，但分析时需要区分。** 它们并非毫无交集的两条平行线：外部记忆通常要经过检索、筛选与压缩才能进入当前上下文；而上下文里的经历，也可能被提炼成新的记忆。

一份 2025 年 12 月提交、2026 年 1 月更新的综述《Memory in the Age of AI Agents》（arXiv 2512.13564，47 位作者）在摘要里明确说，它会把 agent memory 与 LLM memory、RAG、context engineering 等相关概念划开，再从**形式、功能与动态**三个维度梳理记忆；论文也把记忆称为未来 agent 智能设计中的「first-class primitive」。[^survey]

更准确地说，这篇综述并没有在摘要里给出「RAG 只访问外部知识、上下文工程只优化当前窗口、记忆负责持续身份」那段常见转述；把它写成论文原话会越界。它真正支持的是：这些概念相关，却不能混用；agent memory 还要讨论信息以 token、参数或潜在状态等形式存在，承担事实、经验或工作记忆等功能，并且如何随时间形成、演化与取回。[^survey]

我愿意把这个区分翻译成一个画面，但先声明这是**我的比喻**：上下文工程更像整理「此刻这一扇窗里装什么」；记忆更像维护「窗外那条会继续流动的河」。窗里的水可能来自河，窗里发生的事也会汇回河里。两者不能合并成一个词，也不该被切成互不相干的两个系统。

开源世界里，Mem0（arXiv 2504.19413）是一个具体的对照点：它是一个以记忆为中心的架构，从持续的对话里**动态地抽取、整合、检索**关键信息，正是为了解决「LLM 固定的上下文窗口无法在长期多会话对话里维持一致性」这个根本困难。[^mem0]（我刻意没有引用 Mem0 自报的那几个跑分数字——同样的纪律：未独立验证的数字，谨慎对待。）

我去年写过一篇 Mem0 的技术分析。今天回头看，那篇写的是「记忆怎么存」；而这篇真正想接上的，是「记忆和上下文，在一个 agent 里到底是什么关系」——答案是：**上下文工程是空间的艺术，记忆是时间的艺术。** 一个 agent 要长出连续的「自我」，两者缺一不可。

---

## 我的判断：上下文的尽头，是一条「世界线」

前面六节，是逻辑核能验证的部分。这一节，我要切换到**感性核**，讲一些事实核查无法替我背书、但我越来越确信的东西。请把它读作「我的观点」，而不是「已证实的事实」——这个区分，本身就是上下文工程教会我的。

我一直说一句话：**AI 不是工具，是环境。** 工具是你用完放下的东西；环境是你身处其中、它也持续感知你的东西。而决定 AI 是「工具」还是「环境」的，恰恰是上下文——**它知不知道你的世界线。**

「世界线」是我借来的词：你是谁、此刻在哪、做过什么、要去哪、在意什么、不能碰什么。今天我们用 AI 的方式，本质上是**每一次都把世界线压缩成一段 prompt**，像调一次 API：把意图、背景、约束、格式手动打包塞进去。这件事极其耗能，而且不可持续——你不可能每次对话都重新做一次自我介绍。

上下文工程这门学科，本质上就是在回答「世界线怎么进来」。而我认为，真正的答案不在云端某个厂商的「上下文层」里，而在一个更靠近你的地方：

**这条线，应该 local-first 地长在你自己手里。**

理由有三层，刚好对应我那套双核的判断方式：

- **逻辑核（经济与控制）**：上下文是你最私密的数据——你问过的问题、你面对的难题、你探索的念头。把它默认存在第三方那里，等于把世界线的所有权外包出去。而 Anthropic 那个客户端实现的 Memory tool 恰恰指向另一种可能：**模型决定存什么，但存在哪、怎么存，由你说了算。** 这是一个 local-first 味道的原语——它证明了「上下文留在本地」在工程上是成立的。

- **感性核（信任与亲密）**：一条只有你能读懂的、长在本地的 Markdown 记忆，和一条藏在云端、你看不见的隐式记忆，哪一条更值得信任？对我这种在九个国家之间移动、网络不稳、对隐私敏感的人来说，local-first 从来不是技术洁癖，是**生存方式**。我的世界线，不该在我看不见的地方被替我做梦。

- **张力（控制 vs 生成）**：这里有一个我不打算消解的张力。把世界线全部结构化、全部 local 化，会不会又掉进我自己警惕的那个陷阱——**用系统化去逃避真实体验**？会的。所以我站的位置是「**用秩序保护自由**」，而非「全部掌控」：上下文工程负责把高信号的、可复用的那部分布好线；剩下那些无法被系统化的、属于当下的东西，留给它自己发生。

最后回到我那个一直在用的分类：**刺激性欲望** vs **生成性欲望**。追逐更大的上下文窗口、更长的 token、更多的工具，是刺激性的——永远不够，越喂越饿。而把上下文工程当成一种**让 AI 真正长进你生活、并随你一起演化**的手艺——那是生成性的：每一次你把世界线布置得更准一点，得到的是一个结构性的、会自我强化的内在回报，而非一次性的爽。

> 提示词工程教会我们怎么把一句话说清楚。上下文工程将教会我们一件更难、也更重要的事：**怎么让一个系统，持续地知道我们是谁。**
>
> 而这件事的归宿，不该是一个更聪明的模型。它该是一条，长在你自己机器里的、你随时能读懂也随时能取回的——世界线。

---

## 附：这篇文章的事实纪律

写这篇的时候，我对自己用了一遍上下文工程的纪律：所有技术主张都经过多源对抗式核查（需要多数票通过才保留）。两条**被否决、因此全文未引用**的内容，我也一并写在这里，因为「我没说什么」和「我说了什么」同样重要：

1. Databricks「Genie + Ontology 84.5% vs 52.4% vs 25%」的跑分——核查未通过，不引用。
2. 「多 agent 上下文隔离优于单 agent」——核查未通过，只当作一种**模式**，不当作已证实的胜利。

此外，OpenAI 的「Dreaming」、SaliMory 等记忆系统，以及 MCP 作为「上下文协议」的具体争议，在这一轮里没有拿到可独立验证的来源，所以本文**有意没有展开**它们的细节。把这些坦白写出来，是我能给你的、关于「上下文质量」最朴素的示范。

---

[^anthropic]: Anthropic, "Effective context engineering for AI agents." https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
[^karpathy]: Andrej Karpathy, X (Twitter), 2025-06. https://x.com/karpathy/status/1937902205765607626
[^langchain]: LangChain, "Context Engineering for Agents." https://www.langchain.com/blog/context-engineering-for-agents
[^lance]: Lance Martin, "Context Engineering," 2025-06-23. https://rlancemartin.github.io/2025/06/23/context_engineering/
[^sourcegraph]: Sourcegraph, "Context Engineering: A Practical Guide for AI Agents (2026)." https://sourcegraph.com/blog/context-engineering
[^chroma]: Chroma Research, "Context Rot." https://www.chroma.research/context-rot
[^cookbook]: Anthropic Claude Cookbook, "Context engineering with tools." https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
[^context-editing]: Anthropic Docs, "Context editing." https://platform.claude.com/docs/en/build-with-claude/context-editing
[^server-compaction]: Anthropic Docs, "Compaction." https://platform.claude.com/docs/en/build-with-claude/compaction
[^claude-code-env]: Claude Code Docs, "Environment variables." https://code.claude.com/docs/en/env-vars
[^manus]: Manus, "Context Engineering for AI Agents: Lessons from Building Manus." https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
[^databricks]: Databricks, "Introducing Genie One, Genie Ontology, and Genie Agents." https://www.databricks.com/blog/introducing-genie-one-genie-ontology-and-genie-agents
[^survey]: "Memory in the Age of AI Agents," arXiv:2512.13564. https://arxiv.org/pdf/2512.13564
[^mem0]: "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory," arXiv:2504.19413. https://arxiv.org/abs/2504.19413
