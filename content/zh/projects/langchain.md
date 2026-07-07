---
title: "LangChain 开源项目深度学习"
date: 2025-04-16T17:36:46+08:00
lastmod: 2026-07-07T10:00:00+08:00
draft: false
showtoc: true
tocopen: true
tags: ["AI", "Project Learning", "LangChain", "Agent", "RAG"]
categories: ["Projects"]
author: ["Xinwei Xiong", "Me"]
description: LangChain 开源框架深度学习：从 LCEL、链式调用、RAG 管道到 LangChain 1.0 的 create_agent 与中间件（middleware）体系，配套上手案例、前沿进展与面试高频题，持续记录学习过程与关键实践。
aliases:
  - /zh/posts/ai-projects/langchain/
tldr:
  - "LangChain 已从早期单体式 LLM 框架演进为模块化生态：langchain-core 承载 LCEL 与 Runnable 抽象，LangGraph 负责有状态复杂 Agent，LangSmith 提供可观测与评估，LangGraph Platform 负责部署。"
  - "2025 年 10 月 LangChain 1.0 与 LangGraph 1.0 同步 GA：核心收敛到 create_agent 的 Agent 主循环 + middleware（中间件）体系，引入标准 content blocks，遗留能力迁往 langchain-classic，要求 Python 3.10+。"
  - "本文在原调研报告基础上补充了三部分实战内容：可直接运行的上手案例（LCEL、RAG、create_agent、中间件 HITL、LangGraph）、2025–2026 前沿进展，以及面试高频问答。"
---

> 本项目是一个持续的过程，以日拱一卒的态度去学习 AI 开源项目，通过实践真实项目，结合 AI 工具，提升解决复杂问题的能力，并且记录下来。
> [notion List](https://traveling-thistle-a0c.notion.site/Open-Source-Project-Learn-1d2a444a6c008030a24efaa0e3bf5f5c?pvs=4)

**基本信息：**

- **项目名称**：LangChain（含 LangGraph、LangSmith、deepagents 等生态）
- **GitHub 地址**：<https://github.com/langchain-ai/langchain>
- **官方文档**：<https://docs.langchain.com>（2025 年起 Python / JavaScript 文档统一到此站点）
- **许可证**：MIT（LangChain、LangGraph、deepagents 均为开源；LangGraph Platform 为商业闭源）
- **主要语言 / 技术栈**：Python 与 TypeScript 双实现，底层依赖 LangGraph 运行时、Pydantic（数据校验）、FastAPI（LangServe 部署）
- **当前版本**：LangChain 1.0 与 LangGraph 1.0 于 **2025-10-22** 正式 GA，承诺在 2.0 之前不引入破坏性变更
- **社区规模**：GitHub 约 12.4 万 stars、2 万+ forks，PyPI 月下载约 90M+（全生态口径），被 Uber、LinkedIn、Klarna、摩根大通、Cisco 等公司用于生产

---

## 一、导读：LangChain 是什么，为什么值得学

LangChain 是当下构建大语言模型（LLM）应用最主流的框架之一。它的核心价值在于提供一套**标准化接口**与**可组合的构件（building blocks）**，把 LLM 与外部数据源、算力和各类工具的集成过程大幅简化。最初的目标是让开发者能轻松构建既「数据感知（data-aware）」又「具备行动能力（agentic）」的应用。

随着框架演进和社区反馈积累，LangChain 经历了三次关键转型：

1. **架构模块化**——从早期「大而全」的单体 `Chain` 类，拆分为职责清晰的多个包（`langchain-core` / `langchain` / `langchain-community` / 各集成包）。
2. **声明式组合**——引入 LangChain 表达式语言（LCEL）与统一的 Runnable 接口，让「原型即生产」成为可能。
3. **面向 Agent 与生产**——推出 LangGraph（复杂有状态 Agent 编排）、LangSmith（可观测与评估）、LangGraph Platform（部署基础设施），并在 **1.0 版本**把核心收敛到 `create_agent` 的 Agent 主循环加中间件体系。

一句话概括权衡：**LangChain 极擅长快速原型和广泛集成，但抽象层带来了学习曲线陡峭、调试复杂等代价；进入生产往往需要配合生态工具（LangSmith / LangGraph）。**

## 二、框架总览与核心理念

### 2.1 使命、目标与演进

LangChain 立足于一个核心信念：真正强大、有差异化的 LLM 应用，不只是通过 API 调用一次模型，而需要两种关键能力——**数据感知**（把模型连接到其他数据源）与**行动能力**（让模型与环境交互）。

早期版本被认为相对「单体化」，核心 `Chain` 类封装了大量逻辑。随着社区快速增长、用户遭遇「灵活性不足、难以调试」等真实痛点，LangChain 转向更**模块化**的架构，并陆续推出针对生产挑战与高级 Agent 需求的专门工具。这条演进路线映射了整个行业从「探索式 LLM 开发」走向「工程化、可维护、可生产部署」的趋势。

今天，LangChain 把自己定位为覆盖 LLM 应用全生命周期的**产品套件**：用 LangChain / LangGraph **构建（Build）**，用 LangGraph Platform **运行（Run）**，用 LangSmith **管理（Manage）**。其核心目标之一是通过模型与工具的互操作性，帮助开发者构建「面向未来（future-proof）」的应用——底层 LLM 或向量库可以相对轻松地替换，即所谓「厂商可选性（vendor optionality）」。

### 2.2 主要用例

- **问答（尤其是 RAG）**：让 LLM 基于外部（通常是私有或领域）文档回答问题，而非仅依赖训练数据。LangChain 提供完整的 RAG 构件：文档加载器、文本分块器、嵌入模型、向量库、检索器。
- **聊天机器人**：构建能记住此前交互、连贯对话的机器人，记忆（Memory）组件是关键。
- **智能体（Agent）**：以 LLM 作为推理与决策引擎，调用工具与外部环境交互；1.0 之后以 `create_agent` 与 LangGraph 为主力。
- **结构化信息抽取**：从非结构化文本中抽取符合特定 schema 的 JSON 等结构化数据。
- **摘要**：为长文本（文章、会议记录）生成简洁摘要。
- **查询结构化数据**：用自然语言查询 SQL、CSV 等表格数据。
- **调用 API / 理解代码**：让 LLM 调用外部 API 获取实时信息，或分析、查询代码库。

覆盖如此广的用例，必然要求提供一套全面（也因此复杂）的组件与集成选项——这是 LangChain 强大的根基，也是其「学习曲线陡峭」批评的主要来源。

## 三、架构与核心组件拆解

### 3.1 模块化包结构

为解决早期版本耦合紧、依赖臃肿的问题，LangChain 把框架拆成多个职责清晰的包：

- **`langchain-core`**：整个生态的基石，包含最基础的抽象——Runnable 接口、LLM / ChatModel / Embeddings 基础接口、消息类型（HumanMessage、AIMessage 等）以及 LCEL 的实现。刻意保持极小依赖。
- **`langchain-community`**：第三方集成的聚集地，容纳大量社区贡献与维护的集成组件。质量、文档完备度与更新频率因社区维护而参差。
- **`langchain`**：包含构成应用「认知架构」的核心逻辑组件——各类预置 Chain、Agent 实现、通用检索策略。**1.0 后这里的重心是 `create_agent` 与中间件。**
- **集成包**（如 `langchain-openai`、`langchain-anthropic`、`langchain-google-genai`）：对重要且广泛使用的集成，官方与合作方共同维护独立轻量包，仅依赖 `langchain-core`，便于按需安装、更快迭代。
- **`langchain-classic`**（1.0 新增）：承接从主包中剥离的遗留功能，保证向后兼容。

### 3.2 LCEL 与 Runnable 接口

LangChain 表达式语言（**LCEL**）是现代 LangChain 开发的核心，提供**声明式**方式组合各类组件，目标是让原型无需改动即可部署到生产。它不只是语法糖，而是强大的组合机制。

LCEL 的核心是 **Runnable 接口**。几乎所有核心组件（模型、提示模板、检索器、输出解析器）都实现了这一统一接口，定义了标准方法：

- `invoke`：对单个输入调用组件
- `batch`：对一批输入调用
- `stream`：对单个输入流式返回
- `astream_events`：流式返回更细粒度的事件（含中间步骤）
- 以及对应的异步方法（`ainvoke`、`abatch`、`astream` 等）

任何实现 Runnable 的组件都能用管道运算符 `|` 与其他组件轻松组合。LCEL 的关键优势包括：**一等的流式支持**（最小化首 token 延迟）、**同步/异步双原生**、**自动并行优化**、**可配置的重试与回退（fallback）**、**可访问中间结果**、**自动推断输入/输出 schema**、以及**与 LangSmith 的无缝集成**（每一步自动上报，便于调试）。

### 3.3 核心构件速览

- **模型（Models）**：`LLM`（字符串进、字符串出的旧接口）、`Chat Model`（消息列表进出的现代接口，支持工具调用等高级能力）、`Embeddings`（把文本转为向量，是 RAG 与语义检索的基础）。核心目标是**模型互操作性**。
- **提示（Prompts）**：`PromptTemplate` 生成字符串提示，`ChatPromptTemplate` 生成消息列表；支持 few-shot 与 Example Selector（按长度、语义相似度、MMR 动态选例）。
- **数据连接（Data Connection）**：Document Loaders 从各种来源加载数据；Text Splitters 按字符、递归、token、Markdown 标题、代码结构或语义切分长文档。
- **检索（Retrieval）**：Vector Stores 存储嵌入并做相似度检索（Chroma、FAISS、Pinecone、Milvus、Weaviate、pgvector 等）；Retrievers 接收查询、返回相关片段，支持 MultiQuery、上下文压缩等策略。
- **记忆（Memory）**：跨多轮对话保存与管理历史，让 LLM「记得」此前对话。
- **链（Chains）**：把多个组件按顺序或逻辑组合完成任务。旧版大量使用继承 `Chain` 基类的 legacy chain（`LLMChain`、`ConversationalRetrievalChain`），今天首选 LCEL。
- **智能体（Agents）**：以 LLM 为「大脑」决定调用哪些工具达成目标。旧版 `AgentExecutor` 因处理复杂逻辑、循环、状态、人机协同能力有限，已被 `create_agent`（基于 LangGraph）取代。

> LCEL 标准化了组件「如何连接」，但每个组件本身（不同分块器、检索器配置、记忆策略）仍需深入理解——这正是 LangChain 学习曲线陡峭的重要原因。

## 四、生态：从原型到生产

### 4.1 LangSmith：可观测与评估

LangSmith 用于**调试、测试、评估、监控** LLM 应用，目标是弥合原型与生产之间的鸿沟。关键能力：

- **追踪与调试（Tracing）**：对 LLM 调用、Agent 决策、链执行提供实时、细粒度可见性；通常只需设置环境变量即可开启；**框架无关**，非 LangChain 应用也可通过 SDK 或 OpenTelemetry 接入。
- **评估（Evals）**：创建数据集、定义评估目标、用 Evaluator 打分，支持规则式、启发式与强大的 **LLM-as-Judge**，并可收集**人类反馈**。
- **监控（Monitoring）**：跟踪延迟、token 成本、错误率、用户反馈等生产指标。
- **提示工程与 Hub**：提供 Playground 交互试验，支持提示版本管理与团队共享。

追踪为异步，官方声称不给应用增加延迟，且承诺不将用户 trace 数据用于训练模型。提供云 SaaS 与企业自托管两种形态。

### 4.2 LangGraph：高级 Agent 编排

LangGraph 是生态中用于构建复杂、**有状态**、**多角色** LLM 应用（尤其是 Agent）的库。核心思想是把应用执行流建模为**图**：节点（Nodes）表示计算步骤，边（Edges）表示转移逻辑。核心组件为 **StateGraph**（初始化时定义贯穿全图的状态 schema）、**Nodes**、**Edges**（含起始边、普通边、条件边——实现分支与循环）。

主要特性：**环与分支**（支持反思重试）、**持久化与状态管理**、**人机协同（Human-in-the-Loop）**、**时间旅行（Time Travel，回溯到历史状态调试）**、**细粒度控制与可扩展性**、**一等流式**。相较旧版 `AgentExecutor` 更透明可控，避免「黑盒」。**LangGraph 库本身开源（MIT），免费使用。**

### 4.3 部署：LangServe 与 LangGraph Platform

- **LangServe**：把 LCEL 构建的 Runnable 快速部署为 REST API 的 Python 库，集成 FastAPI，自动推断 schema，提供 `/invoke`、`/batch`、`/stream` 等标准端点。**主要面向简单 Runnable，不直接支持 LangGraph 应用**，且目前处于维护模式。
- **LangGraph Platform**：专为部署 LangGraph Agent 设计的**商业闭源**方案，提供可扩展容错基础设施、长期记忆 API、状态回溯、长时后台任务、LangGraph Studio 可视化调试，以及与 LangSmith 的深度集成。提供 Self-Hosted Lite（免费但需 LangSmith key）、Cloud SaaS、BYOC、Self-Hosted Enterprise 等选项。

### 4.4 集成生态与社区

LangChain 的核心优势之一是**庞大的集成生态**，覆盖模型提供方（OpenAI、Anthropic、Google、Cohere、Meta Llama、Mistral、Hugging Face、Ollama 本地模型等）、嵌入模型、向量库、文档加载器、工具与工具包（搜索、计算器、Python REPL、SQL、文件系统、各类 API）。配合活跃的开源社区（官方文档、LangChain Hub、Discord、LangChain Academy、博客、模板），大幅降低上手门槛。

这一生态是精心布局的整体：核心库提供构建能力、LangGraph 处理复杂逻辑、LangSmith 提供可观测与评估、Platform 负责部署与扩容。这也揭示了 LangChain Inc. 的「开放核心（open core）」商业模式：以强大开源库吸引社区，再以关键生产能力（Platform、LangSmith 高级功能）变现。需要留意的是：尽管组件层强调可替换，但一旦深度依赖 LangSmith 的追踪与 Platform 的部署，**运维层面的锁定风险**会上升。

## 五、竞争格局

### 5.1 LangChain vs LlamaIndex

- **LangChain**：定位**通用、广泛**的 LLM 应用开发框架，组件模块化、集成广、擅长复杂链与 Agent（尤其借助 LangGraph），并有 LangSmith 生态。代价是抽象层多、学习曲线陡、链式调用可能引入延迟。
- **LlamaIndex**（前身 GPT Index）：**专注数据索引、检索与 RAG**，在数据摄取、索引构建、查询效率与精度上更深入、更精简；但通用性弱、Agent 能力相对不如 LangGraph 成熟。

两者并非互斥——可把 LlamaIndex 作为强大的数据索引/检索组件，嵌入到更广的 LangChain 工作流中。随着双方能力边界扩张，选择日益取决于具体项目需求与团队熟悉度。

### 5.2 LangGraph vs CrewAI / AutoGen / Semantic Kernel

| 维度 | LangChain (create_agent/LCEL) | LlamaIndex | LangGraph | CrewAI | AutoGen |
|------|-------------------------------|------------|-----------|--------|---------|
| 核心范式 | 通用组件组合 + Agent 主循环 | 数据索引与 RAG | 图式 Agent/工作流编排 | 角色制多智能体协作 | 对话式多智能体交互 |
| 主要优势 | 灵活、集成广、生态完整 | RAG 性能、数据处理 | 控制力、状态管理、复杂流程 | 协作任务定义简单直观 | 动态对话、异步通信 |
| 上手难度 | 中（组件多） | RAG 场景相对简单 | 较陡 | 高（高层抽象） | 中 |
| 可控性 | 高（中间件 + LCEL） | 中（聚焦 RAG） | 极高（低层控制） | 中（较有主见/opinionated） | 高 |
| 典型场景 | 通用 LLM 应用、快速原型 | RAG、知识库问答 | 复杂 Agent、有状态流程、HITL | 研究/写作等协作任务 | 研究、模拟、动态多方对话 |

关键结论：Agent 框架尚未出现单一「最佳实践」。LangGraph 适合需要精确流程与状态控制的复杂任务；CrewAI 适合结构化的多智能体协作；AutoGen 更适合模拟动态多方对话；Semantic Kernel 则更贴合微软技术栈的企业场景。抽象层次的取舍（低层控制 vs 高层易用）在框架选择中反复出现。

## 六、批判性评估

**优势**：可组合与灵活（LCEL/Runnable）、集成广度、快速原型、生态完整（LangSmith/LangGraph/Platform）、庞大社区与资源、对流式/异步/批处理/回退等常见模式的标准化。

**局限与批评**：

- **复杂度与学习曲线**：概念、组件、抽象层众多，掌握全貌需要时间。
- **抽象开销**：多层抽象有时使底层不透明、调试困难、限制深度定制。
- **性能**：多次链式调用/API 请求不可避免引入延迟；默认配置未必对成本/延迟最优。
- **文档质量**：文档虽广，但部分存在滞后、示例过时、随快速迭代难以同步的问题。
- **可靠性与调试**：组件交互复杂、部分逻辑隐藏在抽象后，复杂链/Agent 行为难以追踪——LangSmith 正是对此的回应。
- **快速演进与维护成本**：更新频繁，偶有破坏性变更；依赖管理易冲突。
- **安全**：与所有 LLM 应用一样面临提示注入等风险，需开发者自行加固。

这些批评彼此关联：使 LangChain 快速原型的抽象与集成广度，恰恰也是复杂度与调试难度的来源——这是框架设计中的经典权衡。

## 七、2025–2026 前沿进展（重点补充）

> 这是原报告写于 2025 年 4 月后最重要的更新。2025 年 10 月 22 日，LangChain 1.0 与 LangGraph 1.0 同步 GA，是两个框架的首个正式大版本，承诺 2.0 前不引入破坏性变更。

### 7.1 分工再定位：LangChain 与 LangGraph

- **LangChain**：构建 Agent 最快的方式——标准工具调用架构、厂商无关设计、以中间件做定制。
- **LangGraph**：更底层的框架与运行时，面向高度定制、可控、生产级的长时 Agent。
- 二者关系：**LangChain 的 Agent 建在 LangGraph 之上**，可从 LangChain 高层 API 起步，需要时无缝下沉到 LangGraph，且可把 `create_agent` 生成的 Agent 嵌入自定义 LangGraph 工作流。

### 7.2 `create_agent`：新的 Agent 入口

`create_agent`（TypeScript 为 `createAgent`）围绕核心 Agent 主循环设计，是 1.0 的标准入口，**取代了旧版 `AgentExecutor` 与 `langgraph.prebuilt.create_react_agent`**。主循环为：选模型 → 给工具与提示 → 发请求 → 模型返回工具调用（执行并回填）或最终答案（返回）→ 循环。

```python
from langchain.agents import create_agent

weather_agent = create_agent(
    model="openai:gpt-5",
    tools=[get_weather],
    system_prompt="Help the user by fetching the weather in their city.",
)

result = weather_agent.invoke(
    {"messages": [{"role": "user", "content": "what's the weather in SF?"}]}
)
```

### 7.3 中间件（Middleware）体系：最大的新增

中间件定义了一组**钩子（hooks）**，可在 Agent 主循环的每一步做细粒度定制——这是 `create_agent` 相对其他「不允许在核心循环外定制」的 Agent 构建器的核心差异。内置钩子包括 `before_agent`、`before_model`、`wrap_model_call`、`wrap_tool_call`、`after_model`、`after_agent`。官方随附几类开箱即用的中间件：

- **Human-in-the-loop**：在工具执行前暂停，让用户批准 / 编辑 / 拒绝——对涉及外部系统、发送通信、敏感交易的 Agent 至关重要。
- **Summarization**：消息历史接近上下文上限时压缩较早内容，保留近期消息，避免 token 溢出。
- **PII redaction**：基于模式匹配识别并脱敏邮箱、电话、身份证号等敏感信息，帮助满足合规要求。

此外，1.0 把**结构化输出生成**并入主「模型↔工具」循环，省去过去额外的一次 LLM 调用，降低延迟与成本；开发者可通过工具调用或提供方原生结构化输出两种方式精细控制。

### 7.4 标准内容块（Standard Content Blocks）

`langchain-core` 升到 1.0 并新增消息上的 `.content_blocks` 属性，提供跨提供方一致的内容类型，支持**推理轨迹（reasoning）、引用（citations）、工具调用（含服务端工具调用）**，并保持完全向后兼容。这解决了「切换模型/提供方就打断流式、前端与记忆存储」的痛点，让抽象跟上现代 LLM 能力。

### 7.5 瘦身与迁移

- 核心包收敛到最必要的抽象，**遗留功能迁往 `langchain-classic`**。
- `create_react_agent` 在 `langgraph.prebuilt` 中弃用；LangGraph 的 `langgraph.prebuilt` 模块整体弃用，增强能力迁到 `langchain.agents`。
- 因 Python 3.9 于 2025 年 10 月 EOL，**1.0 要求 Python 3.10+**（3.14 支持在路上）。
- 安装：`uv pip install --upgrade langchain` / 需要遗留能力再装 `langchain-classic`。

### 7.6 deepagents：面向长时复杂任务的「Agent 骨架」

`deepagents` 是构建于 LangChain 之上、基于 LangGraph 运行时的独立库，面向研究、编码等**长时、多步**任务，架构灵感来自 Deep Research 与 Claude Code。三大核心能力：

- **规划（Planning）**：内置 `write_todos` 工具，把大任务拆成可管理的小步并跟踪进度。
- **上下文管理（Context Management）**：用 `ls / read_file / write_file / edit_file` 等文件工具把信息存到短期记忆之外，避免上下文溢出。
- **子智能体（Sub-Agents）**：内置 `task` 工具，把专门子任务委派给聚焦的小 Agent。

默认使用 Claude Sonnet 4.5，但可自由切换 OpenAI、Gemini、Anthropic 等任意 LangChain 支持的模型。

### 7.7 平台侧演进

LangSmith 已发展为更完整的「Agent 工程平台」，除可观测与评估外，还扩展出部署、沙箱（安全运行 Agent 生成的代码）、以及面向全公司的无代码 Agent（Fleet）等能力；整体战略仍是把开源框架与商业平台协同，覆盖 Agent 的构建—运行—改进闭环。

## 八、最佳上手案例（Hands-On）

> 以下示例基于 LangChain 1.0（Python 3.10+）。先安装依赖：`uv pip install -U langchain langchain-openai langchain-community langgraph`，并设置 `OPENAI_API_KEY`。开启 LangSmith 追踪只需 `export LANGSMITH_TRACING=true` 与 `LANGSMITH_API_KEY`。

### 案例 1：最小 LCEL 链（提示 → 模型 → 解析）

```python
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

model = init_chat_model("openai:gpt-4o-mini")
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一名简洁的技术翻译。"),
    ("user", "把这句话翻译成英文：{text}"),
])

chain = prompt | model | StrOutputParser()   # 用管道符组合 Runnable
print(chain.invoke({"text": "日拱一卒，功不唐捐"}))
```

要点：`|` 组合的每一环都是 Runnable，天然支持 `invoke / batch / stream / ainvoke`。

### 案例 2：一个最小 RAG 管道

```python
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# 1) 加载 → 2) 分块 → 3) 嵌入入库
docs = WebBaseLoader("https://docs.langchain.com/oss/python/langchain/overview").load()
chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150).split_documents(docs)
retriever = FAISS.from_documents(chunks, OpenAIEmbeddings()).as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_template(
    "仅根据以下上下文回答问题。\n\n上下文:\n{context}\n\n问题: {question}"
)
rag = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()
)
print(rag.invoke("LangChain 1.0 的 create_agent 有什么用？"))
```

要点：RAG = 加载 → 分块 → 嵌入 → 检索 top-k → 拼进提示 → 交给 LLM。生产中重点在分块策略、检索质量与重排。

### 案例 3：`create_agent` + 工具调用

```python
from langchain.agents import create_agent
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """返回指定城市的天气。"""
    return f"{city} 今天晴，26°C"

agent = create_agent(
    model="openai:gpt-4o-mini",
    tools=[get_weather],
    system_prompt="你是一个天气助手，需要时调用工具。",
)
result = agent.invoke({"messages": [{"role": "user", "content": "北京天气怎么样？"}]})
print(result["messages"][-1].content)
```

### 案例 4：带中间件的人机协同（HITL）Agent

```python
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware, SummarizationMiddleware

agent = create_agent(
    model="openai:gpt-4o-mini",
    tools=[send_email],  # 假设已定义一个会发邮件的敏感工具
    middleware=[
        HumanInTheLoopMiddleware(),      # 敏感工具执行前暂停，等待人工批准
        SummarizationMiddleware(),        # 历史过长时自动压缩
    ],
)
```

要点：中间件让你无需改动主循环即可插入审批、脱敏、摘要等横切逻辑，是 1.0 生产化的核心手段。

### 案例 5：LangGraph 显式状态机（分支 + 循环）

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]

def call_model(state: State):
    return {"messages": [model.invoke(state["messages"])]}

builder = StateGraph(State)
builder.add_node("model", call_model)
builder.add_edge(START, "model")
builder.add_edge("model", END)
graph = builder.compile()          # 可接入 checkpointer 实现持久化/断点续跑
```

要点：当流程需要显式分支、循环、持久化状态或 HITL 时，下沉到 LangGraph 用节点/边显式建模，比隐式 Agent 更可控。

## 九、面试高频问题（Q&A）

**1. LangChain 里的 Chain 和 Agent 有什么区别？**
Chain 是**预定义的固定流程**（设计期确定步骤），更快、可预测、易调试；Agent 由 LLM 在**运行期动态决定**采取什么行动、调用哪个工具，更灵活但更难预测、更耗成本。

**2. 什么是 LCEL？为什么用它而不是旧版 Chain？**
LCEL 是声明式的组合语法，用管道符 `|` 把实现 Runnable 接口的组件串起来。相比继承 `Chain` 基类的旧写法，它统一了 `invoke/batch/stream/async`，原生支持流式、并行、重试回退、自动 schema 推断与 LangSmith 追踪，且「原型即生产」。

**3. Runnable 接口的核心方法有哪些？**
`invoke`（单输入）、`batch`（批输入）、`stream`（单输入流式）、`astream_events`（细粒度事件流），以及对应异步版本 `ainvoke/abatch/astream`。

**4. 完整描述一个 RAG 管道的步骤。**
文档加载（Loader）→ 分块（Text Splitter）→ 嵌入（Embeddings）→ 存入向量库（Vector Store）→ 按查询检索 top-k（Retriever）→ 把检索到的上下文拼进提示 → 交给 LLM 生成。进阶点：分块策略、MultiQuery / 上下文压缩 / 重排、评估检索质量。

**5. LangChain 有哪些记忆（Memory）方式？如何在多轮对话保持上下文？**
通过存储与回放对话历史实现。常见有完整历史、窗口（近 N 轮）、摘要式（超限压缩）等。1.0 中长历史可用 `SummarizationMiddleware` 自动压缩；LangGraph 用 state + checkpointer 提供短期与跨会话长期记忆。

**6. LangChain、LangGraph、LangSmith、LangServe 各自解决什么问题？**
LangChain 构建（组件 + `create_agent`）；LangGraph 编排复杂有状态 Agent（图/节点/边/持久化）；LangSmith 可观测与评估（追踪、Evals、监控）；LangServe 把 Runnable 部署为 REST API（LangGraph 应用用 LangGraph Platform）。

**7. 什么时候该用 LangGraph 而不是 `create_agent`？**
需要显式分支/循环、混合确定性与 Agent 步骤、长时业务流程、强人机协同/审计、需精细控制延迟与成本、或高度定制的复杂工作流时，选 LangGraph；能套进「模型→工具→回复」默认循环、只需中间件定制、追求快速交付时，用 `create_agent`。

**8. LangChain 1.0 相对旧版最大的变化是什么？**
核心收敛到 `create_agent` 的 Agent 主循环 + **中间件体系**；引入标准 content blocks；遗留能力迁到 `langchain-classic`；`create_react_agent` / `AgentExecutor` 被取代；要求 Python 3.10+。

**9. 中间件（middleware）能做什么？举几个内置例子。**
在 Agent 主循环各步插入横切逻辑（`before/after_model`、`wrap_tool_call` 等）。内置：Human-in-the-loop（工具执行前审批）、Summarization（压缩历史）、PII redaction（脱敏）。

**10. Tool 是怎么定义并被 Agent 调用的？**
用 `@tool` 装饰器把函数变成工具，函数 docstring 作为给模型的说明。Agent 由 LLM 决定是否调用、生成参数，运行时执行后把结果回填进对话，循环直到得到最终答案。

**11. 如何得到严格的结构化输出（如固定 JSON schema）？**
用 Pydantic 模型定义 schema，配合 `with_structured_output` 或 `create_agent(response_format=ToolStrategy(Model))`。1.0 把结构化输出并入主循环，省去额外 LLM 调用。

**12. LCEL 链如何做流式和异步？**
只要组件实现 Runnable，直接调用 `stream/astream` 即可流式；用 `ainvoke/abatch/astream` 走异步。原型可用同步在 Notebook 里跑，生产切异步处理高并发，无需改核心逻辑。

**13. LangChain 常被诟病的缺点有哪些？如何缓解？**
抽象层过重、调试困难、性能/成本不透明、文档滞后、破坏性变更。缓解：尽早接入 LangSmith 追踪与评估、必要时下沉到 LangGraph 或直接调用底层 API、锁定依赖版本、区分原型与生产。

**14. LangChain 与 LlamaIndex 如何取舍？**
纯 RAG / 检索优化优先且追求索引与查询性能 → LlamaIndex；需要通用组合、广泛集成、复杂 Agent → LangChain。二者可组合：LlamaIndex 做检索层，嵌入 LangChain 工作流。

**15. 如何评估一个 LLM/Agent 应用的质量？**
在 LangSmith 中建数据集（输入 + 可选期望输出），定义 Evaluator（规则式、启发式、LLM-as-Judge），对目标（单次调用或整应用）打分，并结合人类反馈持续迭代。

**16. deepagents 解决了什么问题？**
面向长时、多步的复杂任务，提供开箱即用的规划（`write_todos`）、上下文管理（文件工具把信息移出短期记忆）与子智能体委派（`task`），架构参考 Deep Research 与 Claude Code。

**17. LangGraph 的持久化 / 断点续跑是怎么实现的？**
通过 checkpointer 把执行状态自动持久化，服务器重启或长流程被中断后能从中断点恢复，无需自写数据库逻辑；这也是跨天审批、后台长任务、跨会话记忆的基础。

## 十、未来方向与选型建议

**趋势**：持续押注 Agent（LangGraph、deepagents、中间件），强化生产支持（LangSmith / Platform），LCEL 与 content blocks 持续成熟，扩展集成与多模态，企业级安全/合规/成本管理。战略上，LangChain 的未来与 LangGraph、商业平台的成功高度绑定，核心库的角色更偏向「支撑高级编排的组件库」。

**选型建议**：

1. **先明确用例**：简单 RAG？复杂交互聊天机器人？多步 Agent？
2. **按复杂度选工具**：简单链/基础 RAG/原型 → LangChain + LCEL；纯 RAG 且重检索优化 → 评估 LlamaIndex；复杂有状态/需循环或 HITL 的 Agent → 直接从 LangGraph 或 `create_agent` + 中间件起步，同时评估 CrewAI / AutoGen 是否更契合协作模式。
3. **正视学习曲线**：新手可借抽象快速上手，资深团队重视底层控制、需准备深入内部或写自定义逻辑。
4. **尽早拥抱生态**：项目一开始就接 LangSmith 做调试/追踪/评估。
5. **紧跟迭代**：该领域变化快，持续关注官方文档、博客与社区。
6. **区分原型与生产**：批判性评估抽象层对性能、成本、维护的影响，必要时绕过部分框架约束、写自定义代码。

**结语**：LangChain 已从先驱式 LLM 框架成长为涵盖核心库、可观测平台、Agent 编排引擎与部署方案的完整生态。它的核心优势是广泛集成与通过 LCEL 的灵活组合，显著加速原型开发；代价是复杂度与过度抽象带来的陡峭曲线。1.0 通过 `create_agent` + 中间件、标准 content blocks 与瘦身包结构，正面回应了多年的社区批评。对使用者而言，最佳实践永远是：**根据项目需求、复杂度与团队经验，清醒地选择合适的组件与生态工具，既用好它的强大，也认清它的局限。**

## 补充相关文章

- [开源的阶段性成长指南](/zh/growth/posts/stage-growth-of-open-source/)
- [一份完整的开源贡献指南（提供给第一次踏入开源伙伴秘籍）](/zh/ai-technology/posts/open-source-contribution-guidelines/)
- [我的实践总结：开源社区的规范设计思路](/zh/ai-technology/posts/advanced-githook-design/)
- [在开源社区中学会如何提问](/zh/ai-technology/posts/the-art-of-asking-questions-in-open-source-communities/)

## 参考资料

- LangChain & LangGraph 1.0 里程碑（LangChain 官方博客，2025-10-22）：<https://www.langchain.com/blog/langchain-langgraph-1dot0>
- What's new in LangChain v1（官方文档）：<https://docs.langchain.com/oss/python/releases/langchain-v1>
- Deep Agents 概览（官方文档）：<https://docs.langchain.com/oss/python/deepagents/overview>
- deepagents 仓库：<https://github.com/langchain-ai/deepagents>
- LangGraph 1.0 GA 公告：<https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available>
- LangChain 主仓库：<https://github.com/langchain-ai/langchain>
- LlamaIndex vs LangChain（IBM）：<https://www.ibm.com/think/topics/llamaindex-vs-langchain>
- 开源 AI Agent 框架对比（Langfuse）：<https://langfuse.com/blog/2025-03-19-ai-agent-comparison>
