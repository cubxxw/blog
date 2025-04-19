---
title: "LangGraph 深度解析：设计、架构、原理与应用"
date: 2025-04-19T15:19:20+08:00
draft: false
tocopen: true
tags: ["AI开源", "项目学习"]
categories: ["AI Open Source"]
author: ["Xinwei Xiong", "Me"]
description: >
  本项目是一个持续的过程，以日拱一卒的态度去学习 AI 开源项目，并且记录。
---

> 本项目是一个持续的过程，以日拱一卒的态度去学习 AI 开源项目，通过实践真实项目，结合 AI 工具，提升解决复杂问题的能力。并且记录。
> [notion List](https://traveling-thistle-a0c.notion.site/Open-Source-Project-Learn-1d2a444a6c008030a24efaa0e3bf5f5c?pvs=4)


## **I. LangGraph 简介**


### **A. 定义 LangGraph：目标、愿景与核心价值主张**

LangGraph 是由 LangChain Inc. 开发的一个底层编排框架，旨在利用大型语言模型（LLMs）构建有状态、多参与者的应用程序，特别是智能体（Agent）和多智能体工作流 <sup>1</sup>。其核心目标是为复杂的 AI 智能体任务提供可靠性、可控性和可扩展性 <sup>2</sup>。众多知名公司，如 Klarna、Elastic、Uber、Replit、LinkedIn 和 GitLab，已在生产环境中使用 LangGraph，证明了其可行性和价值 <sup>2</sup>。

LangGraph 的一个关键特性是它专注于支持**循环图结构**。这与许多传统 LLM 链（通常构建为有向无环图 - DAGs）不同 <sup>8</sup>。这种循环能力对于实现智能体行为至关重要，这些行为通常涉及循环、重试和基于动态决策的路径选择。LangGraph 采用 MIT 开源许可证发布，允许社区自由使用和贡献 <sup>3</sup>。

LangGraph 的出现，可以看作是 LLM 开发社区（特别是 LangChain Inc.）认识到简单线性链（例如主要由 LangChain 表达式语言 - LCEL 构建的链）不足以满足现代 AI 智能体日益增长的复杂性、动态性和状态依赖性需求的一种体现。早期的 LLM 应用主要集中在单次生成或简单的链式调用。随着人们期望构建能够执行多步骤任务、使用工具并进行交互的自主智能体，对循环（如重试、规划周期）、状态持久化（记忆、上下文）和条件逻辑的需求变得至关重要 <sup>6</sup>。主要设计用于 DAG 的 LCEL 在处理这些固有的循环和状态模式时显得力不从心 <sup>22</sup>。LangGraph 通过其明确的图/状态/节点/边模型 <sup>12</sup> 以及持久化和条件边等特性 <sup>12</sup>，直接解决了在实践中遇到的这些限制，其核心特性正是为了克服早期范式在构建复杂智能体时遇到的瓶颈而量身定制的。


### **B. 在 LangChain 生态系统中的定位**

LangGraph 是 LangChain 生态系统的一个扩展或模块 <sup>2</sup>，通常与 LangChain 的组件一起使用，但也可以独立运行 <sup>2</sup>。它与 LangChain（提供组件/接口、用于简单链/检索流程的框架）和 LangSmith（用于可观察性、调试和评估的平台）的角色不同 <sup>2</sup>。LangGraph 专注于复杂、有状态流程的**编排**。


### **C. 满足循环、有状态工作流的需求**

传统的 DAG 结构（如主要由 LCEL 构建的结构）在处理需要循环、重试、跨步骤状态维护以及基于中间结果动态选择路径的复杂智能体任务时存在局限性 <sup>8</sup>。LangGraph 的设计灵感来源于 Google 的 Pregel 系统和 Apache Beam <sup>2</sup>，通过支持循环计算和强大的状态管理机制，直接满足了这一需求 <sup>8</sup>。这使得构建能够根据结果进行推理、规划、行动，并可能重新规划或重试的智能体成为可能。


## **II. 核心概念与架构**


### **A. 基于图的范式：节点、边、状态**

LangGraph 的核心是将智能体工作流建模为图。其基本构建块包括：状态（State）、节点（Nodes）和边（Edges），这些概念与图论有直接的对应关系 <sup>8</sup>。这些是开发人员用来定义智能体行为的核心抽象。它们之间的关系是：节点执行工作，边根据状态指导流程，状态则保存应用程序当前的快照 <sup>12</sup>。


### **B. 状态管理深度解析**

状态（State）是 LangGraph 应用程序的基础，代表了应用程序数据在执行过程中的当前快照 <sup>12</sup>。状态的设计和管理对于构建复杂、可靠的智能体至关重要。

**1. 模式定义 (Schema Definition):**

状态模式定义了图管理的信息结构，是所有节点和边的输入/输出契约 <sup>12</sup>。LangGraph 主要支持使用 Python 的 TypedDict 或 Pydantic BaseModel 来定义状态模式 <sup>7</sup>。



* TypedDict: 这是指定状态模式的主要且文档完善的方式，它允许定义具有特定键和预期数据类型的字典，为状态提供类型提示 <sup>12</sup>。
* Pydantic BaseModel: 使用 Pydantic 模型可以带来额外的好处，例如为状态属性设置默认值和利用 Pydantic 内置的数据验证功能 <sup>12</sup>。

**2. Reducer 与更新机制:**

节点执行后返回的是对状态的**更新**（updates），而不是整个新状态 <sup>12</sup>。LangGraph 使用 **Reducer 函数**来定义这些更新如何应用于现有状态 <sup>12</sup>。



* **默认 Reducer (Override):** 如果没有为状态中的某个键指定特定的 Reducer 函数，默认行为是用新的更新值**覆盖**该键的现有值 <sup>12</sup>。
* **自定义 Reducer:** 可以使用 typing（或 typing_extensions）模块中的 Annotated 类型为状态中的特定键指定自定义 Reducer 函数。这允许更复杂的更新逻辑，例如追加到列表、数字相加或合并字典 <sup>12</sup>。例如，可以使用 operator.add 来实现列表追加。
* **add_messages Reducer:** 一个常见的用例是管理作为消息列表的对话历史。LangGraph 为此提供了一个预构建的 Reducer 函数 add_messages <sup>7</sup>。当节点返回对使用 add_messages 注释的键的更新时，它会智能地将新消息追加到现有列表中，同时还能根据消息 ID 处理对现有消息的更新，并处理将消息反序列化为 LangChain Message 对象的操作 <sup>12</sup>。

**3. 多模式可能性 (Multiple Schemas):**

虽然通常所有节点都使用单一、统一的状态模式进行通信，但在某些情况下需要对数据流进行更精细的控制。LangGraph 允许使用多种模式：



* **内部状态通道 (Internal State Channels):** 节点可以写入不属于图的显式输入或输出模式的状态通道（状态中的键）。这允许内部节点传递图最终输入/输出中不需要的信息 <sup>12</sup>。图状态本质上是初始化时定义的所有状态通道的并集。
* **私有状态通道 (Private State Channels):** 只要定义了状态通道的模式，节点甚至可以在图中声明并写入额外的状态通道。这使得特定节点之间能够进行内部通信，而不必将这些数据暴露在整体图状态中 <sup>12</sup>。
* **显式输入/输出模式 (Explicit Input/Output Schemas):** 可以定义一个包含图操作所需所有数据的“内部”模式，并另外指定作为内部模式子集的独立 input 和 output 模式。这允许约束图接受的输入和产生的输出，同时仍为内部处理维护更丰富的状态 <sup>12</sup>。

状态对象与 Reducer 机制相结合，充当了智能体或工作流的中心化、持久化且持续更新的“记忆”或“上下文”。在循环图中，节点可能被重新访问，执行路径也可能变化，因此一个共享的、定义良好的状态 <sup>12</sup> 对于维护上下文、在步骤间传递信息以及启用边的条件逻辑 <sup>12</sup> 至关重要。Reducer 概念 <sup>12</sup> 超越了简单的状态替换，允许开发者定义复杂的更新逻辑（如通过 add_messages 累积消息 <sup>12</sup> 或合并数据），这对于许多智能体模式（例如维护聊天历史、聚合结果）至关重要。这种状态的持久化 <sup>20</sup> 使得长时间运行的任务和时间旅行等功能成为可能。因此，状态的精心设计和更新逻辑对于成功执行复杂的多步骤流程至关重要。


### **C. 节点：功能与实现**

节点（Nodes）是 LangGraph 图中的基本计算单元，封装了具体的逻辑或工作 <sup>7</sup>。



* **定义:** 节点可以是普通的 Python 函数或 LangChain 表达式语言（LCEL）的 Runnable 对象。
* **输入/输出:** 节点接收当前的 State 对象作为输入，执行其内部逻辑（例如调用 LLM、执行工具、运行自定义 Python 代码），然后返回对 State 的更新（一个包含要更新的键值对的字典）<sup>7</sup>。
* **添加:** 使用图构建器（StateGraph 实例）的 add_node(name, value) 方法将节点添加到图中，其中 name 是节点的唯一标识符，value 是节点对应的函数或 Runnable <sup>12</sup>。
* **特殊节点:** END 是一个特殊的内置节点名称，表示图执行的结束点。当流程需要终止时，边可以指向 END <sup>23</sup>。
* **内部实现:** 在后台，LangGraph 会将 Python 函数节点包装成 RunnableLambda，这提供了额外的优势，如异步执行、批量处理支持以及与 LangSmith 的无缝集成以进行跟踪和调试 <sup>12</sup>。


### **D. 边：控制执行流**

边（Edges）定义了图中节点之间的连接和执行流程的转换逻辑 <sup>9</sup>。它们决定了在当前节点执行完毕后，接下来应该执行哪个（或哪些）节点。



* **定义:** 边通常由 Python 函数表示，这些函数根据当前的 State 来决定下一个节点的走向 <sup>12</sup>。
* **类型与添加方式:**
    * **普通边 (Normal Edges):** 表示从一个节点到下一个节点的直接、无条件转换。使用 graph_builder.add_edge(upstream_node_name, downstream_node_name) 添加 <sup>12</sup>。
    * **条件边 (Conditional Edges):** 实现动态分支逻辑。它们基于一个条件函数（通常检查当前状态）的输出来决定接下来要路由到哪个节点。使用 graph_builder.add_conditional_edges(upstream_node_name, condition_function, path_map) 添加 <sup>8</sup>。
        * condition_function: 接收当前状态，返回一个字符串（或字符串列表），该字符串是 path_map 中的键。
        * path_map: 一个字典，将 condition_function 的输出映射到下游节点的名称。
    * **入口点 (Entry Point):** 定义图执行的起始节点。可以通过 graph_builder.set_entry_point(node_name) 或添加从特殊虚拟节点 START 到起始节点的边 (add_edge(START, node_name)) 来设置 <sup>12</sup>。
    * **条件入口点 (Conditional Entry Point):** 允许根据初始输入动态决定起始节点。通过在 START 节点上使用条件边逻辑实现 <sup>12</sup>。
* **并行执行:** 如果一个节点有多个出边（无论是普通边还是条件边返回了多个节点名），那么所有目标节点将在下一个“超步”（super-step）中并行执行 <sup>12</sup>。

虽然节点执行具体的操作，但**条件边**体现了指导智能体在图中导航的决策逻辑。它们是应用智能（通常由 LLM 驱动）以动态导航工作流的地方。简单的线性流程可以通过普通边处理 <sup>23</sup>。然而，智能体行为需要选择：是否调用工具？调用哪个工具？是否重试？是否询问用户？是否结束？条件边 <sup>12</sup> 通过评估当前状态的函数 <sup>12</sup> 为这些选择提供了机制。路径映射将决策函数的结果连接到下一个适当的节点 <sup>23</sup>，从而实现了智能体所需的复杂分支和循环 <sup>8</sup>。


### **E. 编译：必要性与运行时配置**

在定义了图的状态、节点和边之后，必须调用图构建器的 compile() 方法才能使用该图 <sup>7</sup>。



* **目的:** 编译步骤相对简单，主要执行基本的结构检查（例如，确保没有孤立节点）并允许指定运行时参数 <sup>12</sup>。
* **运行时参数:** 编译时可以指定重要的运行时配置，最关键的是：
    * **检查点 (Checkpointers):** 用于启用状态持久化 <sup>12</sup>。
    * **断点 (Breakpoints):** 用于调试或实现人机交互（Human-in-the-loop）<sup>12</sup>。


### **F. 底层原理：灵感与执行模型**

LangGraph 的设计和执行模型借鉴了一些成熟的分布式计算框架。



* **灵感来源:** 其设计受到了 Google 的 Pregel 系统和 Apache Beam 的启发 <sup>2</sup>。这些系统都支持大规模图计算和数据处理流程。
* **执行模型:** LangGraph 的底层图算法使用**消息传递**来定义一个通用程序。执行过程以离散的“**超步**”（super-steps）进行 <sup>12</sup>。
    * 在图执行开始时，所有节点都处于非活动状态。
    * 当一个节点在其任何入边（或称“通道”）上收到新消息（状态更新）时，它变为活动状态。
    * 活动节点运行其函数并响应更新。
    * 当一个节点完成其操作后，它会沿着一条或多条出边向其他节点发送消息（更新后的状态）。
    * 接收到消息的节点随后执行它们的函数，将产生的消息传递给下一组节点，依此类推。
    * 在每个超步结束时，没有收到传入消息的节点通过将自己标记为非活动来“投票”停止 <sup>12</sup>。
    * 在同一超步中运行的节点是并行执行的，而顺序运行的节点则属于不同的超步 <sup>12</sup>。


## **III. 关键特性与能力**

LangGraph 提供了一系列强大的特性，使其能够构建复杂、可靠且交互性强的 AI 应用。


### **A. 持久化与检查点 (Persistence and Checkpointing)**

持久化是 LangGraph 的核心能力之一，它允许图的状态在不同的运行实例之间甚至跨线程保存和恢复 <sup>16</sup>。这是构建需要长期维护上下文或支持中断/恢复的应用的基础。



* **机制:** 持久化通过**检查点**（Checkpointers）机制实现 <sup>9</sup>。检查点负责在每个超步（super-step）将图的当前状态保存到持久化存储中。
* **后端:** LangGraph 支持多种检查点后端，包括内存（用于测试或简单场景）、Postgres、MongoDB、Redis 等，并允许用户实现自定义检查点 <sup>20</sup>。
* **作用:** 持久化是实现其他关键功能（如记忆、人机交互、时间旅行和容错）的基础 <sup>12</sup>。**持久执行**（Durable Execution）确保了每个执行步骤的状态都被保存到持久存储中 <sup>35</sup>。


### **B. 记忆管理 (Memory Management)**

基于持久化能力，LangGraph 提供了内置支持来管理对话记忆 <sup>9</sup>。这使得智能体能够“记住”过去的交互，并在后续对话中利用这些信息。



* **类型:**
    * **短期记忆 (Short-Term Memory):** 通常指在单次执行线程或会话中保持上下文的能力。这通常通过检查点机制实现，为特定的线程 ID 保存和加载状态 <sup>9</sup>。
    * **长期记忆 (Long-Term Memory):** 指跨线程、跨会话共享和保留信息的能力。这依赖于更持久的存储后端（如数据库），可以通过检查点或专门的记忆存储（如 Zep、向量数据库）实现 <sup>9</sup>。
* **策略:** LangGraph 支持多种记忆管理策略，例如：
    * 维护完整的对话历史记录（通常使用 add_messages Reducer）<sup>20</sup>。
    * 选择性地从历史记录中删除消息 <sup>20</sup>。
    * 对对话历史进行摘要以节省空间和计算资源 <sup>20</sup>。
    * 利用语义搜索从长期记忆中检索相关信息 <sup>20</sup>。

LangGraph 的记忆能力并非独立特性，而是建立在其底层的持久化/检查点机制之上。要“记住”过去的交互 <sup>20</sup>，包含这些历史的状态必须在调用之间被保存（通过检查点持久化 <sup>9</sup>）。为特定 thread_id <sup>9</sup> 加载状态即可恢复短期记忆。使用共享的持久存储（如通过检查点连接的 Postgres 或专门的记忆存储 <sup>20</sup>）则允许不同的线程/会话访问公共信息，构成了长期记忆的基础。


### **C. 人机交互 (Human-in-the-loop - HITL)**

LangGraph 支持将人类判断、审查或批准集成到图的执行流程中 <sup>10</sup>。这对于需要人工监督或协作的任务至关重要。



* **实现方式:**
    * **interrupt 函数:** 这是推荐的方式，可以暂停图的执行，等待用户输入或批准 <sup>20</sup>。例如，可以在调用工具前中断，让人类审查、编辑或确认工具调用请求 <sup>16</sup>。
    * **静态断点:** 主要用于调试，但也可用于暂停执行以进行人工干预 <sup>12</sup>。
    * **编辑状态:** 当使用断点暂停时，可以通过 graph.update_state 方法直接编辑图的状态 <sup>20</sup>。
    * **动态断点 (NodeInterrupt):** 虽然可用，但 interrupt 函数是更推荐的动态人工干预方法 <sup>20</sup>。


### **D. 时间旅行 (Time Travel)**

时间旅行功能允许开发者回溯应用程序的执行历史，检查过去的状态，甚至探索不同的执行路径 <sup>20</sup>。



* **用途:** 这对于调试复杂的工作流、理解图如何达到特定状态以及探索“假设”场景非常有价值 <sup>20</sup>。
* **能力:** 可以查看图在过去时间点的状态，甚至可以更新过去的状态以触发不同的后续流程 <sup>20</sup>。


### **E. 流式处理 (Streaming)**

鉴于 LLM 可能存在的延迟，流式处理对于提升用户体验至关重要。LangGraph 支持逐步显示输出，让应用程序感觉更具响应性 <sup>2</sup>。



* **流式内容:** 可以流式传输 LLM 生成的单个 token、中间步骤的输出、工具产生的数据以及子图的输出 <sup>2</sup>。
* **平台支持:** LangGraph Platform 也提供了对图执行各个方面（如更新、消息、事件）的流式支持 <sup>20</sup>。
* **禁用:** 对于不支持流式传输的模型，可以禁用此功能 <sup>20</sup>。


### **F. 工具调用 (Tool Calling)**

LangGraph 与现代聊天模型的工具调用（或函数调用）API 无缝集成 <sup>20</sup>。这使得图中的智能体能够调用外部函数或 API 来执行操作、获取信息。



* **ToolNode:** LangGraph 提供了专门用于调用工具的 ToolNode <sup>20</sup>。
* **特性:** 支持处理工具调用错误、向工具传递运行时值和配置、以及根据工具输出更新图状态 <sup>20</sup>。
* **大规模工具:** LangGraph 设计上考虑了处理大量工具的情况。langgraph-bigtool 库利用 LangGraph 的存储（Store）机制，允许智能体在拥有数百甚至数千个工具时，通过搜索来检索和使用相关工具 <sup>20</sup>。


### **G. 模块化与可重用性：子图 (Subgraphs)**

子图允许将现有的、已定义的 LangGraph 图作为节点嵌入到另一个更大的图中 <sup>20</sup>。



* **优势:** 促进了代码的模块化和组织性，通过将复杂应用分解为更小、可管理的组件来简化开发 <sup>20</sup>。
* **能力:** 可以方便地重用图逻辑，并且可以从父图中查看和更新子图的状态，甚至转换子图的输入和输出以适应父图的需求 <sup>20</sup>。


### **H. 多智能体系统 (Multi-Agent Systems)**

LangGraph 非常适合构建多智能体系统，即多个独立的智能体协作以实现共同目标 <sup>2</sup>。



* **模式:** 支持实现智能体之间的**切换**（handoffs）、构建复杂的智能体**网络**以及在多智能体应用中进行**多轮对话** <sup>20</sup>。
* **langgraph-swarm-py:** 这是一个专门用于实现**群体式**（swarm-style）多智能体架构的库 <sup>39</sup>。在这种架构中，智能体根据其专长动态地将控制权交给彼此。该库提供了切换工具和记忆集成等功能 <sup>39</sup>。

LangGraph 的核心架构本身就天然地支持多智能体模式。有状态图、作为行动者的节点以及条件边这些核心概念，为编排多个智能体之间的交互提供了必要的原语。一个多智能体系统需要：1) 不同的智能体（可通过节点或子图表示 <sup>12</sup>），2) 共享的上下文（通过状态实现 <sup>12</sup>），3) 通信和控制转移（通过边，特别是条件边实现 <sup>12</sup>），以及 4) 可能需要的持久记忆（通过检查点/存储实现 <sup>20</sup>）。LangGraph 提供了所有这些要素。langgraph-swarm-py 库 <sup>39</sup> 展示了如何将这些原语组合成特定的多智能体模式（如群体模式），利用切换工具和图管理下的共享状态。


## **IV. LangGraph 生态系统**

LangGraph 不仅仅是一个独立的库，它是一个不断发展的生态系统的一部分，旨在提供从开发到部署和监控的端到端解决方案。


### **A. LangGraph 开源库**

这是 LangGraph 的核心，一个基于 MIT 许可证的免费开源库 <sup>3</sup>。它提供了构建有状态、多参与者应用程序的基础框架和原语，如 StateGraph、节点、边、状态管理机制等。开发者可以完全基于这个开源库来构建和部署他们的应用。


### **B. LangGraph Platform**

LangGraph Platform 是一个商业化（提供免费/精简版）的解决方案，旨在简化 LangGraph 应用在生产环境中的部署、扩展和管理 <sup>2</sup>。



* **核心功能:**
    * **一键部署:** 快速将 LangGraph 应用部署为生产就绪的 API <sup>47</sup>。
    * **托管基础设施:** 提供托管的、可水平扩展的服务器和任务队列 <sup>2</sup>。
    * **内置持久化:** 无缝集成持久化存储，支持记忆、线程管理等 <sup>2</sup>。
    * **可扩展性与弹性:** 设计用于处理大工作负载，具有自动扩展、负载均衡、心跳检测、故障转移和重试机制 <sup>13</sup>。
    * **专用 API:** 提供用于管理记忆、线程、执行后台任务和定时任务（Cron Jobs）的 API <sup>2</sup>。
* **部署选项:** 提供多种部署模式以满足不同需求，包括云 SaaS、自托管精简版、自带云（BYOC）和自托管企业版 <sup>13</sup>。
* **架构:** 平台实例是无状态的，依赖 Redis 进行临时元数据存储和实例间通信（PubSub），依赖 Postgres 进行持久状态存储。这种架构支持水平扩展和高可用性 <sup>35</sup>。


### **C. LangGraph Studio**

LangGraph Studio 是一个专门为 LangGraph 设计的集成开发环境（IDE），可以作为桌面应用运行，也可以通过 LangGraph Platform 在 Web 浏览器中访问 <sup>3</sup>。



* **主要功能:**
    * **可视化:** 以图形方式展示 LangGraph 应用的结构（节点和边），帮助理解复杂流程 <sup>3</sup>。
    * **交互式测试:** 直接在 UI 中运行图，测试其行为 <sup>35</sup>。
    * **调试:** 允许用户在运行时暂停图的执行（使用中断或断点），检查和编辑当前状态，然后继续执行，便于调试和迭代 <sup>3</sup>。
    * **管理:** 提供界面来创建和管理助手（Assistants）、线程（Threads）和长期记忆 <sup>35</sup>。
    * **LangSmith 集成:** 无缝集成 LangSmith，便于协作调试和将节点输入/输出添加到测试数据集 <sup>35</sup>。
* **本地开发:** 可以通过 langgraph dev 命令启动本地开发服务器，并自动在浏览器中打开 Studio 连接到本地运行的应用 <sup>35</sup>。桌面版需要 Docker 环境 <sup>45</sup>。


### **D. LangSmith 集成**

LangGraph 与 LangSmith（LangChain 的可观察性平台）紧密集成，为开发、调试和监控 LangGraph 应用提供了强大支持 <sup>2</sup>。



* **功能:** 自动记录所有 LangGraph 执行的跟踪信息（traces），可视化智能体的轨迹、延迟和 token 使用情况，帮助调试失败的运行，评估性能 <sup>2</sup>。
* **价值:** 对于理解和优化复杂的、可能包含循环和条件分支的智能体行为至关重要 <sup>2</sup>。

开源 LangGraph 库与商业化的 LangSmith/LangGraph Platform 之间的紧密集成，创造了一个强大、端到端的开发和部署体验。然而，这也鼓励用户留在 LangChain Inc. 的生态系统内。虽然核心库是开源的 <sup>3</sup>，但在生产环境中大规模部署和管理复杂、有状态的应用本身就带来了巨大的基础设施挑战（可扩展性、持久性、监控 <sup>24</sup>）。LangGraph Platform <sup>3</sup> 直接解决了这些问题，为生产部署提供了一条捷径。同样，调试复杂的智能体行为非常困难 <sup>31</sup>，而 LangSmith 提供了关键的可观察性 <sup>2</sup>。使用这些集成工具 <sup>2</sup> 提供了显著的开发和运营优势，但也使得切换到替代的部署或可观察性解决方案变得更加困难，可能导致一定程度的供应商锁定。


## **V. 实践应用与用例**

LangGraph 不仅是一个理论框架，它已经被广泛应用于构建各种实际的 AI 应用。


### **A. 入门：设置与基础应用演示**

开始使用 LangGraph 的步骤相对直接：



1. **安装:** 通过 pip 安装 LangGraph 及其可能需要的依赖项（如 LangChain、模型提供商的 SDK）: pip install langgraph langchain langchain_openai (示例) <sup>1</sup>。
2. **环境配置:** 设置必要的环境变量，特别是 LLM 提供商的 API 密钥（例如 OPENAI_API_KEY）<sup>6</sup>。对于 Azure OpenAI 用户，需要设置特定的 Azure 环境变量 <sup>6</sup>。
3. **构建基础聊天机器人:**
    * **定义状态 (State):** 使用 TypedDict 定义一个包含 messages 键的状态类，并使用 Annotated 和 add_messages 来指定消息列表的累加行为 <sup>7</sup>。
    * **创建节点 (Node):** 定义一个 Python 函数，接收状态作为输入，调用 LLM（例如 ChatOpenAI 或 ChatAnthropic）处理 messages，并返回包含 LLM 响应的新消息列表作为状态更新 <sup>7</sup>。使用 graph_builder.add_node() 将此函数添加为节点。
    * **设置边 (Edges):** 使用 graph_builder.add_edge(START, "chatbot_node_name") 设置入口点，并使用 graph_builder.add_edge("chatbot_node_name", END) 设置结束点 <sup>7</sup>。
    * **编译 (Compile):** 调用 graph_builder.compile() 创建可执行的图对象 <sup>7</sup>。
    * **执行与流式处理 (Execute/Stream):** 使用 graph.stream() 方法，传入包含用户输入的初始状态。迭代 stream() 返回的事件，从中提取并显示助手的响应消息 <sup>7</sup>。通常会将其包装在一个循环中以实现连续对话。
    * **可视化 (Visualize):** 可以使用 graph.get_graph().draw_ascii() 或其他绘图方法（可能需要额外依赖）来可视化图的结构 <sup>7</sup>。


### **B. 常见智能体模式与模板**

LangGraph 的灵活性使其能够实现多种常见的智能体架构和模式：



* **ReAct (Reason + Act):** 这是一种流行的模式，智能体交替进行推理（思考下一步做什么）和行动（调用工具）。LangGraph 提供了预构建的 ReAct 智能体 <sup>4</sup>，也可以从头开始构建 <sup>39</sup>。
* **Plan-and-Execute:** 智能体首先制定一个计划，然后按顺序执行计划中的步骤 <sup>48</sup>。
* **Reflection & Critique:** 智能体生成一个初步响应，然后自我反思或由另一个智能体进行批判，最后进行修正 <sup>38</sup>。
* **RAG (Retrieval-Augmented Generation):** 智能体首先从知识库（如向量数据库）中检索相关信息，然后利用这些信息生成响应 <sup>48</sup>。
* **Multi-Agent Collaboration:** 如前所述，LangGraph 支持构建协作式多智能体系统，例如代理切换（Agent Handoffs）和群体智能（Swarm Intelligence）<sup>20</sup>。

LangChain 和 LangGraph 社区提供了许多**模板和示例代码**，涵盖了这些常见模式以及特定应用（如聊天机器人、内存管理、工具使用等），可以作为开发的起点 <sup>2</sup>。


### **C. 真实世界应用示例与案例研究**

LangGraph 已被应用于多种生产环境和概念验证项目中：



* **客户支持:** Klarna 使用 LangGraph 构建支持 8500 万活跃用户的客服机器人 <sup>2</sup>。
* **安全智能:** Elastic 利用 LangGraph 构建用于威胁检测的安全 AI 助手 <sup>2</sup>。
* **软件开发:** Uber 使用 LangGraph 实现自动化单元测试生成 <sup>2</sup>；Replit 用于代码生成 <sup>2</sup>；有案例实现了完整的软件开发生命周期自动化 <sup>55</sup>。
* **数据分析与处理:** 生成和执行 SQL 查询 <sup>16</sup>。
* **研究与信息综合:** 研究助手 <sup>21</sup>、法律案例分析 <sup>32</sup>。
* **特定领域应用:** 房地产智能体 <sup>32</sup>。
* **生成式 UI:** 构建与用户交互的界面，如股票经纪人、旅行规划器、邮件工具、计算机使用代理（CUA）<sup>4</sup>。

这些案例展示了 LangGraph 在处理需要状态管理、工具集成、条件逻辑和潜在人机交互的复杂任务方面的能力。


### **D. 学习资源**

为了帮助开发者学习和掌握 LangGraph，社区和 LangChain Inc. 提供了丰富的资源：



* **官方文档:** 包含核心概念解释、操作指南（How-to Guides）、教程、API 参考等 <sup>2</sup>。
* **LangChain Academy:** 提供免费的 LangGraph 入门在线课程，包含视频讲解和练习 <sup>2</sup>。
* **GitHub 仓库:**
    * 主仓库 (langchain-ai/langgraph): 包含源代码、核心文档和 issue 跟踪 <sup>3</sup>。
    * 示例仓库 (langgraph-example, langgraph-example-pyproject): 用于 LangGraph Cloud 部署的示例项目 <sup>5</sup>。
    * langgraph-swarm-py: 群体智能体库 <sup>39</sup>。
    * langgraph-bigtool: 处理大量工具的库 <sup>43</sup>。
    * langgraph-101: 基础教程 Notebooks <sup>6</sup>。
    * awesome-LangGraph: 社区维护的资源、项目和工具列表 <sup>4</sup>。
* **博客文章:** LangChain 官方博客和其他技术博客上有关于 LangGraph 的介绍和教程 <sup>9</sup>。
* **社区:** GitHub Discussions、Reddit (r/LangChain) 等社区是提问和交流经验的地方 <sup>52</sup>。
* **视频教程:** YouTube 等平台上有开发者分享的 LangGraph 教程和项目演示 <sup>33</sup>。


## **VI. 对比分析**

选择合适的技术框架需要了解其与其他替代方案的异同。本节将 LangGraph 与 LangChain 生态系统内的 LCEL 以及其他流行的智能体框架（CrewAI, AutoGen）进行比较。


### **A. LangGraph vs. LangChain 表达式语言 (LCEL)**

LCEL 是 LangChain 中用于构建链（Chains）的核心抽象，它采用声明式的方式将 Runnable 组件组合起来 <sup>22</sup>。



* **LCEL 优势:**
    * **声明式定义:** 开发者描述“做什么”而非“如何做”，允许 LangChain 优化运行时执行 <sup>22</sup>。
    * **优化:** 支持并行执行、异步 API、优化的流式传输，以减少首个 token 的延迟 <sup>22</sup>。
    * **集成:** 无缝集成 LangSmith 跟踪，所有链都遵循标准的 Runnable 接口，易于使用 LangServe 部署 <sup>22</sup>。
    * **适用场景:** 主要用于构建**有向无环图 (DAGs)**，适合简单的顺序或分支流程，如“提示+LLM+解析器”或简单的 RAG 设置 <sup>15</sup>。
* **LangGraph 优势:**
    * **循环与状态:** 专为需要**循环**、复杂状态管理、分支和多智能体交互的工作流而设计 <sup>14</sup>。
    * **显式控制:** 提供对执行流程更底层、更明确的控制，开发者直接定义节点和边 <sup>13</sup>。
    * **适用场景:** 复杂智能体、需要持久化记忆、人机交互、重试逻辑或动态路径选择的应用 <sup>22</sup>。
* **选择指南:**
    * 如果只是进行单次 LLM 调用，直接使用模型即可，无需 LCEL 或 LangGraph <sup>22</sup>。
    * 对于简单的链式结构（DAG），如果能利用 LCEL 的优化和集成优势，LCEL 是合适的选择 <sup>22</sup>。
    * 对于涉及复杂状态、循环、分支、多智能体或需要精细控制流程的应用，应选择 LangGraph <sup>22</sup>。
    * 值得注意的是，LCEL 可以在 LangGraph 的节点内部使用，结合两者的优势 <sup>22</sup>。

LCEL 和 LangGraph 的核心区别在于它们最适合支持的计算模型。LCEL 擅长定义和优化操作的线性或分支**序列**（DAGs）。它的声明性 <sup>22</sup> 允许框架进行执行优化（并行、流式传输 <sup>22</sup>）。然而，这种抽象使得实现复杂的控制流（如基于中间结果的循环）不够明确，可能很麻烦。LangGraph 则专为管理可能涉及循环、复杂条件逻辑以及多个参与者之间协调的**有状态过程**（通用图）而设计。LangGraph 的命令式图定义（显式添加节点和边 <sup>12</sup>）让开发者能够直接控制流程和状态 <sup>12</sup>，这对于智能体循环和复杂决策制定是必需的 <sup>14</sup>，即使这意味着框架本身的自动优化较少（尽管底层执行可能仍然高效 <sup>13</sup>）。


### **B. LangGraph vs. CrewAI**

CrewAI 是一个专注于编排**角色扮演、自主协作**的 AI 智能体框架 <sup>10</sup>。



* **CrewAI 特点:**
    * **易用性:** 通常被认为入门门槛较低，提供直观的、基于角色的设计方法和预构建模板 <sup>54</sup>。
    * **协作重点:** 强调智能体之间的团队合作和任务分配 <sup>10</sup>。
    * **结构化:** 提供更结构化的记忆架构和流程（例如顺序编排）<sup>40</sup>。
    * **生产导向:** 设计上注重生产环境的可靠性和确定性 <sup>10</sup>。
    * **基于 LangChain:** 构建在 LangChain 之上，可以利用其生态系统 <sup>65</sup>。
* **LangGraph 特点:**
    * **灵活性与控制:** 提供更底层、基于图的方法，允许对工作流和状态进行更精细的定制和控制 <sup>16</sup>。
    * **复杂交互:** 更适合处理复杂的、循环的智能体交互 <sup>63</sup>。
    * **可定制记忆:** 记忆管理更灵活，可定制化程度高 <sup>40</sup>。
* **比较:**
    * **学习曲线:** CrewAI 通常更容易上手，LangGraph 较陡峭 <sup>16</sup>。
    * **灵活性:** LangGraph 提供更高的灵活性和控制力 <sup>16</sup>，而 CrewAI 可能更具“主见”（opinionated）<sup>41</sup>。
    * **缺点:** CrewAI 可能在灵活性上受限 <sup>41</sup>，且有用户报告其延迟较高 <sup>54</sup>。LangGraph 的复杂性可能导致开发开销增加 <sup>41</sup>。


### **C. LangGraph vs. AutoGen**

AutoGen 是由微软研究院开发的框架，专注于构建能够进行对话、执行代码和协作的多智能体系统 <sup>17</sup>。



* **AutoGen 特点:**
    * **对话驱动:** 将工作流视为智能体之间的对话 <sup>17</sup>。
    * **灵活性:** 高度灵活，支持自定义智能体行为、工具集成和多种对话模式 <sup>57</sup>。
    * **代码执行:** 擅长让智能体生成、修复和执行代码（例如在 Docker 中）<sup>67</sup>。
    * **成熟度与社区:** 相对成熟，拥有较大的社区和微软的支持 <sup>63</sup>。
* **LangGraph 特点:**
    * **图与状态:** 基于图的状态管理和工作流控制是核心 <sup>17</sup>。
    * **结构化控制:** 提供更结构化的流程可视化和控制 <sup>17</sup>。
    * **LangChain 集成:** 与 LangChain 生态系统紧密集成 <sup>70</sup>。
* **比较:**
    * **易用性:** AutoGen 的 API 相对直接，但其灵活性也可能带来复杂性；LangGraph 对熟悉图概念的用户可能更直观 <sup>58</sup>。
    * **控制流:** LangGraph 对循环和状态转换的控制更精确 <sup>58</sup>，而 AutoGen 的群聊模式中智能体执行顺序可能不确定 <sup>58</sup>。
    * **灵活性 vs. 结构:** AutoGen 在智能体交互方面更开放、灵活 <sup>57</sup>，LangGraph 通过图结构提供了更多结构 <sup>70</sup>。
    * **缺点:** AutoGen 的控制可能较难掌握 <sup>58</sup>，LangGraph 学习曲线较陡 <sup>57</sup>。


### **D. LangGraph 的整体优势与劣势**

**优势:**



* **高控制力与可靠性:** 允许对智能体行为和工作流进行精确控制和引导，通过检查点、人机交互、时间旅行等特性提高可靠性 <sup>2</sup>。
* **灵活性与可扩展性:** 底层原语设计支持构建高度定制化的智能体架构和复杂工作流 <sup>2</sup>。
* **显式状态管理:** 清晰的状态定义和 Reducer 机制便于管理复杂交互中的上下文 <sup>8</sup>。
* **原生循环支持:** 核心设计支持循环，是实现许多智能体模式（如重试、规划-执行循环）的基础 <sup>14</sup>。
* **丰富特性:** 内置持久化、人机交互、时间旅行、流式处理、工具调用、子图等强大功能 <sup>2</sup>。
* **生态系统集成:** 与 LangChain 组件和 LangSmith 可观察性平台无缝集成 <sup>2</sup>。
* **可视化:** LangGraph Studio 提供强大的可视化和调试能力 <sup>44</sup>。
* **适用性:** 特别适合构建复杂、有状态、多步骤、多智能体的应用 <sup>10</sup>。
* **生产验证:** 已被多家公司用于生产环境 <sup>2</sup>。
* **性能:** 库本身不增加显著性能开销，并为流式工作流优化 <sup>13</sup>。

**劣势:**



* **学习曲线:** 相较于更高级别的框架或简单的链式结构，学习成本更高 <sup>16</sup>。
* **代码冗余:** 对于简单任务，定义图所需的代码可能比 LCEL 更冗长 <sup>34</sup>。
* **文档问题:** 有用户反映文档可能复杂或存在过时信息 <sup>52</sup>。
* **设计复杂性:** 设计复杂、高效的图本身可能具有挑战性 <sup>17</sup>。
* **生态系统依赖:** 获得最佳体验（特别是部署和高级调试）可能需要依赖 LangGraph Platform 和 LangSmith，存在潜在的供应商锁定风险。
* **显式流程定义:** 需要开发者明确定义流程，与某些用户对“自主”智能体的期望可能存在差距（智能体不会“自动”弄清楚所有步骤）<sup>53</sup>。
* **平台限制:** LangGraph Studio 桌面版最初仅支持特定平台（Apple Silicon）<sup>44</sup>。


### **E. 表格：特性对比矩阵**

| 特性/方面 | LangGraph | LCEL (LangChain Expression Language) | CrewAI | AutoGen (Microsoft) |
|-----------|-----------|--------------------------------------|--------|---------------------|
| **核心抽象** | 图 (节点, 边, 状态) | Runnable 序列 (链) | 智能体 (角色, 任务, 工具), Crew (流程) | 对话式智能体, 群聊 (GroupChat) |
| **主要用例** | 复杂状态流, 循环, 多智能体编排 | 简单到中等复杂度的链 (DAGs), RAG, 工具使用 | 基于角色的协作式多智能体系统 | 对话式多智能体协作, 代码生成/执行 |
| **状态管理** | 显式, 基于 State 对象和 Reducers, 持久化支持 | 隐式传递, 或通过 Memory 组件管理 | 结构化 (任务输出, 内置记忆类型) | 通过消息历史和代理记忆管理 |
| **循环支持** | 原生, 核心设计特性 | 困难/不自然, 主要为 DAG 设计 | 通过流程控制实现, 可能不如 LangGraph 灵活 | 可通过智能体交互实现, 但控制可能不直接 |
| **控制 vs. 抽象** | 底层, 高控制力 | 较高层抽象, 框架优化执行 | 较高层抽象, 关注角色和任务 | 灵活, 但群聊控制可能复杂 |
| **易用性 (入门)** | 中等偏难 (需理解图概念) | 较易 (对简单链) | 较易 (直观的角色/任务定义) | 中等 (API 直接, 但灵活性带来复杂性) |
| **灵活性/定制化** | 非常高 | 中等 (受限于 Runnable 接口) | 中等 (受限于角色/流程框架) | 非常高 |
| **记忆支持** | 强大 (短/长期, 实体, 持久化) | 通过 Memory 组件 | 内置类型 (RAG, 上下文, 用户) | 通过消息列表和外部集成 |
| **多智能体侧重** | 强 (原生支持, Swarm 库) | 弱 (主要单链) | 非常强 (核心设计理念) | 非常强 (核心设计理念) |
| **生态系统集成** | 强 (LangChain, LangSmith, Platform/Studio) | 非常强 (LangChain 核心, LangSmith, LangServe) | 强 (基于 LangChain) | 强 (Microsoft 支持, 广泛工具集成) |
| **部署/运维支持** | 强 (通过 LangGraph Platform) | 中等 (通过 LangServe) | 相对较弱 (需自行解决) | 中等 (依赖用户基础设施) |
| **社区/成熟度** | 增长中 (较新) | 非常大 (LangChain 核心) | 增长中 (较新) | 大且活跃 (相对成熟) |



## **VII. 性能、可扩展性与最佳实践**

评估一个框架不仅要看其功能，还要考虑其在实际应用中的表现、扩展能力以及如何有效地使用它。


### **A. 性能特征**



* **库本身开销:** LangGraph 官方声称库本身不会给代码增加额外的性能开销 <sup>13</sup>。性能瓶颈通常来自于图内部的操作，如 LLM 调用、工具执行、数据处理或网络延迟，尤其是在复杂的多智能体交互中 <sup>73</sup>。
* **流式优化:** LangGraph 特别为流式工作流进行了设计和优化，旨在改善用户体验 <sup>13</sup>。
* **实际表现:** 虽然缺乏标准化的 LangGraph 基准测试数据，但一些用户报告和案例研究表明，在适当设计下，它可以支持生产级的性能和可扩展性 <sup>50</sup>。性能指标（如延迟、吞吐量）需要根据具体应用场景进行测量 <sup>50</sup>。


### **B. 可扩展性考量**

可扩展性需要区分库本身和部署平台：



* **库:** LangGraph 库的内在可扩展性很大程度上取决于开发者如何设计和实现图。设计不佳的图（例如，状态过于庞大、节点依赖复杂）可能会遇到瓶颈。
* **LangGraph Platform:** 该平台是专门为解决 LangGraph 应用的可扩展性问题而设计的 <sup>2</sup>。
    * **水平扩展:** 平台采用无状态服务器设计，可以通过增加实例数量来线性扩展 HTTP 请求处理能力和后台运行吞吐量（队列处理能力）<sup>13</sup>。
    * **数据库效率:** 利用 Postgres 的 MVCC 模型进行并发控制，避免长时间锁定，以提高数据库资源利用率 <sup>49</sup>。
    * **弹性:** 包含心跳机制、周期性清理任务（sweeper task）来处理实例崩溃或硬关闭，确保进行中的任务可以被重新拾取；对 Postgres 和 Redis 的通信包含重试逻辑，并支持数据库故障转移 <sup>13</sup>。
* **潜在限制:** 某些来源提到了可能的限制，如中等可扩展性或图的递归深度限制，但这可能取决于具体实现或早期版本 <sup>17</sup>。

实现生产级别的可扩展性和弹性对于复杂、有状态的应用来说，需要大量的底层设施投入。虽然 LangGraph 库本身不限制可扩展性，但要达到目标通常需要复杂的架构。LangGraph Platform 正是 LangChain Inc. 提供的解决方案，旨在抽象掉这种复杂性。运行简单的 LangGraph 脚本很容易，但将其部署以处理大量并发用户、跨数千线程可靠地管理持久状态、确保容错并监控性能，则需要负载均衡器、可扩展数据库（如 Postgres <sup>49</sup>）、消息队列/状态管理器（如 Redis <sup>49</sup>）以及弹性的计算实例等基础设施组件 <sup>13</sup>。LangGraph Platform <sup>3</sup> 提供了这些组件和编排逻辑，解决了用户自行部署开源库时将面临的可扩展性挑战。


### **C. 开发最佳实践**

遵循最佳实践有助于构建更健壮、可维护和高效的 LangGraph 应用：



* **状态设计 (State Design):**
    * 保持状态模型简洁明了，仅包含必要信息 <sup>32</sup>。
    * 优先使用 Pydantic BaseModel 进行模式定义，以利用其默认值和验证功能 <sup>12</sup>。
    * 仔细选择 Reducer 函数（默认覆盖、add_messages 或自定义），确保状态更新符合预期 <sup>12</sup>。
* **节点设计 (Node Design):**
    * 遵循**单一职责原则**，让每个节点专注于一个明确的任务 <sup>32</sup>。
    * 在节点内部处理预期的异常（例如，工具调用失败），可以将错误信息作为反馈返回给 LLM，而不是让整个图崩溃 <sup>16</sup>。
    * 节点应返回新的状态更新对象，而不是修改传入的状态（保持不变性）<sup>32</sup>。
    * 使用类型提示增强代码可读性 <sup>32</sup>。
    * 根据所需操作仔细设计节点功能 <sup>19</sup>。
* **边设计 (Edge Design):**
    * 条件边的逻辑应清晰、明确 <sup>32</sup>。
    * 避免创建过于复杂的循环依赖关系 <sup>32</sup>。
    * 确保条件逻辑覆盖所有可能的路径 <sup>32</sup>。
    * 在 Studio 中，明确定义条件边的目标节点映射，以避免出现意外的可视化连接 <sup>45</sup>。
* **错误处理 (Error Handling):**
    * 在关键节点添加健壮的错误处理逻辑 <sup>32</sup>。
    * 提供回退机制或重试逻辑（如果适用）<sup>32</sup>。
    * 记录详细的错误信息以供调试 <sup>32</sup>。
    * 确保工具本身具有容错性 <sup>16</sup>。
* **工具使用 (Tooling):**
    * 充分利用 LangSmith 进行调试、跟踪和性能监控 <sup>2</sup>。
    * 使用 LangGraph Studio 进行可视化、交互式测试和原型设计 <sup>44</sup>。
* **持久化与记忆 (Persistence/Memory):**
    * 根据应用需求（如持久性要求、性能、成本）选择合适的检查点或记忆存储后端 <sup>20</sup>。
    * 有效管理记忆状态，避免无限增长或包含不必要的信息 <sup>44</sup>。
* **测试 (Testing):**
    * 对节点和边的逻辑进行单元测试（LangGraph 的模块化设计便于此操作 <sup>34</sup>）<sup>31</sup>。
    * 对整个图的流程进行集成测试 <sup>31</sup>。
* **代码结构 (Code Structure):**
    * 保持代码清晰、模块化，并添加必要的文档注释 <sup>31</sup>。
    * 可以考虑使用 LangGraph Generator 等工具来生成项目结构 <sup>4</sup>。


### **D. 常见陷阱与规避策略**

开发 LangGraph 应用时可能会遇到一些常见问题：



* **图过于复杂 (Overly Complex Graphs):** 导致难以理解、调试和维护。
    * **规避:** 使用子图分解复杂性 <sup>20</sup>，坚持节点的单一职责原则 <sup>32</sup>，经常使用 Studio 或绘图工具可视化图结构 <sup>44</sup>。
* **状态管理问题 (State Management Issues):** 状态变得臃肿、包含无关信息，或 Reducer 逻辑错误导致状态更新不正确。
    * **规避:** 精心设计状态模式 <sup>32</sup>，选择或实现正确的 Reducer 函数 <sup>12</sup>，考虑使用多模式或私有状态通道 <sup>12</sup>。
* **未处理的错误 (Unhandled Errors):** 节点执行失败导致整个图意外终止。
    * **规避:** 在节点中实现健壮的错误捕获和处理逻辑 <sup>16</sup>，根据情况提供回退路径或重试机制（LangGraph Platform 提供一些自动重试 <sup>49</sup>）。
* **无限循环 (Infinite Loops):** 条件边的逻辑错误导致图无法到达 END 状态。
    * **规避:** 仔细设计和测试条件边逻辑 <sup>32</sup>，可以在状态中加入步骤计数器或使用图的递归限制（如果适用），利用 LangSmith 跟踪来调试循环 <sup>31</sup>。
* **依赖过时文档 (Documentation Lag):** 示例代码或说明与最新版本不符 <sup>52</sup>。
    * **规避:** 对照最新的 API 参考和源代码进行检查，实际运行和测试代码片段，积极参与社区（如 GitHub Discussions）寻求澄清 <sup>44</sup>。
* **误解智能体自主性 (Misunderstanding Agent Autonomy):** 期望 LangGraph 智能体能“自动”规划所有步骤，而实际上需要开发者明确定义流程和决策点 <sup>53</sup>。
    * **规避:** 理解 LangGraph 提供的是**受控编排**框架。使用 ReAct <sup>20</sup> 等模式，让 LLM 在预定义的图结构内做出决策。
* **忽视生态工具 (Ignoring Ecosystem Tools):** 试图从头构建复杂的部署、监控或调试系统。
    * **规避:** 如果需要高级的可观察性或生产级部署，尽早评估 LangSmith 和 LangGraph Platform 是否满足需求 <sup>2</sup>。


## **VIII. 结论与未来展望**


### **A. 总结：何时选择 LangGraph**

LangGraph 是一个功能强大的框架，特别适用于构建需要以下特性的 AI 应用：



* **复杂、有状态的工作流:** 当应用逻辑涉及多个步骤、需要维护上下文信息、并且流程不是简单的线性序列时，LangGraph 的图结构和状态管理机制提供了必要的支持 <sup>2</sup>。
* **循环和条件逻辑:** 对于需要重试、循环处理、基于中间结果进行动态决策（分支）的应用，LangGraph 的条件边和循环图能力是关键优势 <sup>14</sup>。
* **智能体和多智能体系统:** 构建单个复杂智能体或需要多个智能体协作的应用是 LangGraph 的核心用例 <sup>2</sup>。
* **精细控制:** 当开发者需要对执行流程、状态转换和错误处理进行精确控制时，LangGraph 的底层特性提供了这种能力 <sup>2</sup>。
* **高级特性需求:** 如果应用需要持久化记忆、人机交互（HITL）、时间旅行调试或健壮的工具调用集成，LangGraph 提供了内置支持 <sup>2</sup>。

然而，选择 LangGraph 也意味着需要接受其相对较高的学习曲线和可能更冗长的开发过程（相比于简单链或更高级别的框架）<sup>16</sup>。开发者需要权衡 LangGraph 提供的控制力和灵活性与其带来的开发复杂性。


### **B. 未来发展潜力**

基于当前的趋势和 LangGraph 的定位，可以推测其未来可能的发展方向：



* **增强的多智能体协调:** 可能会出现更多预构建的多智能体协作模式和更复杂的协调机制，超越现有的 Swarm 模式。
* **可视化与调试工具:** LangGraph Studio 可能会持续进化，提供更丰富的可视化选项、更强大的调试功能（例如，更直观的状态变化跟踪、性能剖析）。
* **与 LLM 能力的深度融合:** 随着 LLM 本身能力的增强（例如，更复杂的工具使用规范、更强的推理能力），LangGraph 可能会提供更紧密的集成，以充分利用这些新能力。
* **更多预构建模式与智能体:** 为了降低使用门槛，可能会提供更多开箱即用的图模板或特定类型的智能体实现。
* **平台与生态完善:** LangGraph Platform 可能会增加更多企业级功能，如更精细的访问控制、更广泛的云集成、更智能的自动扩展策略。对非 Apple Silicon 平台的 Studio 支持也值得期待 <sup>44</sup>。
* **持续关注可靠性与生产力:** 鉴于其已被用于生产环境，对框架的稳定性、性能优化和开发者生产力工具的投入可能会持续加强 <sup>13</sup>。

总而言之，LangGraph 作为 LangChain 生态中专注于复杂、有状态流程编排的关键组件，已经证明了其在构建高级 AI 智能体方面的价值。通过其独特的图结构、强大的状态管理和丰富的功能集，它为开发者提供了前所未有的控制力和灵活性，以应对现代 AI 应用的挑战。随着生态系统的不断成熟和社区的持续贡献，LangGraph 有望在智能体和多智能体应用开发领域扮演越来越重要的角色。


#### Obras citadas



1. LangGraph | Opik Documentation, fecha de acceso: abril 17, 2025, [https://www.comet.com/docs/opik/cookbook/langgraph](https://www.comet.com/docs/opik/cookbook/langgraph)
2. LangGraph - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/)
3. langchain-ai/langgraph: Build resilient language agents as ... - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
4. A curated list of awesome projects, resources, and tools for building stateful, multi-actor applications with LangGraph 🕸️ - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/von-development/awesome-LangGraph](https://github.com/von-development/awesome-LangGraph)
5. langchain-ai/langgraph-example - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph-example](https://github.com/langchain-ai/langgraph-example)
6. langchain-ai/langgraph-101 - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph-101](https://github.com/langchain-ai/langgraph-101)
7. What Is LangGraph and How to Use It? - DataCamp, fecha de acceso: abril 17, 2025, [https://www.datacamp.com/tutorial/langgraph-tutorial](https://www.datacamp.com/tutorial/langgraph-tutorial)
8. LangGraph Simplified - Kaggle, fecha de acceso: abril 17, 2025, [https://www.kaggle.com/code/marcinrutecki/langgraph-simplified](https://www.kaggle.com/code/marcinrutecki/langgraph-simplified)
9. LangGraph Tutorial: A Comprehensive Guide for Beginners, fecha de acceso: abril 17, 2025, [https://blog.futuresmart.ai/langgraph-tutorial-for-beginners](https://blog.futuresmart.ai/langgraph-tutorial-for-beginners)
10. Comparing AI agent frameworks: CrewAI, LangGraph, and BeeAI - IBM Developer, fecha de acceso: abril 17, 2025, [https://developer.ibm.com/articles/awb-comparing-ai-agent-frameworks-crewai-langgraph-and-beeai](https://developer.ibm.com/articles/awb-comparing-ai-agent-frameworks-crewai-langgraph-and-beeai)
11. Can anyone explain the benefits and limitations of using agentic frameworks like Autogen and CrewAI versus low-code platforms like n8n? - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/AI_Agents/comments/1hdv7vg/can_anyone_explain_the_benefits_and_limitations/](https://www.reddit.com/r/AI_Agents/comments/1hdv7vg/can_anyone_explain_the_benefits_and_limitations/)
12. langgraph/docs/docs/concepts/low_level.md at main · langchain-ai ..., fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph/blob/main/docs/docs/concepts/low_level.md](https://github.com/langchain-ai/langgraph/blob/main/docs/docs/concepts/low_level.md)
13. LangGraph - LangChain, fecha de acceso: abril 17, 2025, [https://www.langchain.com/langgraph](https://www.langchain.com/langgraph)
14. LangGraph Tutorial to Build a Basic and Smart Chatbot - Data Science Dojo, fecha de acceso: abril 17, 2025, [https://datasciencedojo.com/blog/langgraph-tutorial/](https://datasciencedojo.com/blog/langgraph-tutorial/)
15. LangGraph - LangSmith - LangChain, fecha de acceso: abril 17, 2025, [https://smith.langchain.com/public/24b94adc-3356-4d9f-8f94-813f8004fdbe/r](https://smith.langchain.com/public/24b94adc-3356-4d9f-8f94-813f8004fdbe/r)
16. From Basics to Advanced: Exploring LangGraph | Towards Data Science, fecha de acceso: abril 17, 2025, [https://towardsdatascience.com/from-basics-to-advanced-exploring-langgraph-e8c1cf4db787/](https://towardsdatascience.com/from-basics-to-advanced-exploring-langgraph-e8c1cf4db787/)
17. A Detailed Comparison of Top 6 AI Agent Frameworks in 2025 - Turing, fecha de acceso: abril 17, 2025, [https://www.turing.com/resources/ai-agent-frameworks](https://www.turing.com/resources/ai-agent-frameworks)
18. Complete Guide to Building LangChain Agents with the LangGraph Framework - Zep, fecha de acceso: abril 17, 2025, [https://www.getzep.com/ai-agents/langchain-agents-langgraph](https://www.getzep.com/ai-agents/langchain-agents-langgraph)
19. Getting to Grips with the Agentic Framework, LangGraph - Advancing Analytics, fecha de acceso: abril 17, 2025, [https://www.advancinganalytics.co.uk/blog/effective-query-handling-with-langgraph-agent-framework](https://www.advancinganalytics.co.uk/blog/effective-query-handling-with-langgraph-agent-framework)
20. How-to Guides - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/how-tos/](https://langchain-ai.github.io/langgraph/how-tos/)
21. Introduction to LangGraph - LangChain Academy, fecha de acceso: abril 17, 2025, [https://academy.langchain.com/courses/intro-to-langgraph](https://academy.langchain.com/courses/intro-to-langgraph)
22. LangChain Expression Language (LCEL), fecha de acceso: abril 17, 2025, [https://python.langchain.com/docs/concepts/lcel/](https://python.langchain.com/docs/concepts/lcel/)
23. LangGraph - LangChain Blog, fecha de acceso: abril 17, 2025, [https://blog.langchain.dev/langgraph/](https://blog.langchain.dev/langgraph/)
24. LangChain, fecha de acceso: abril 17, 2025, [https://www.langchain.com/](https://www.langchain.com/)
25. Conceptual guide - ️ LangChain, fecha de acceso: abril 17, 2025, [https://python.langchain.com/docs/concepts/](https://python.langchain.com/docs/concepts/)
26. LangGraph Quickstart - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/tutorials/introduction/](https://langchain-ai.github.io/langgraph/tutorials/introduction/)
27. Langchain vs Langgraph - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1j8qjls/langchain_vs_langgraph/](https://www.reddit.com/r/LangChain/comments/1j8qjls/langchain_vs_langgraph/)
28. LangChain, LangSmith and LangGraph - Finxter Academy, fecha de acceso: abril 17, 2025, [https://academy.finxter.com/langchain-langsmith-and-langgraph/](https://academy.finxter.com/langchain-langsmith-and-langgraph/)
29. Langchain vs Langgraph: Ultimate Framework Comparison | Generative AI Collaboration Platform - Orq.ai, fecha de acceso: abril 17, 2025, [https://orq.ai/blog/langchain-vs-langgraph](https://orq.ai/blog/langchain-vs-langgraph)
30. LangChain vs. LangGraph: Comparing AI Agent Frameworks - Oxylabs, fecha de acceso: abril 17, 2025, [https://oxylabs.io/blog/langgraph-vs-langchain](https://oxylabs.io/blog/langgraph-vs-langchain)
31. Langchain In Production Best Practices - Restack, fecha de acceso: abril 17, 2025, [https://www.restack.io/docs/langchain-knowledge-langchain-in-production-cat-ai](https://www.restack.io/docs/langchain-knowledge-langchain-in-production-cat-ai)
32. Introduction to LangGraph: Core Concepts and Basic Components - DEV Community, fecha de acceso: abril 17, 2025, [https://dev.to/jamesli/introduction-to-langgraph-core-concepts-and-basic-components-5bak](https://dev.to/jamesli/introduction-to-langgraph-core-concepts-and-basic-components-5bak)
33. LangChain vs LangGraph: A Tale of Two Frameworks - YouTube, fecha de acceso: abril 17, 2025, [https://www.youtube.com/watch?v=qAF1NjEVHhY](https://www.youtube.com/watch?v=qAF1NjEVHhY)
34. Can we get rid of LCEL (LangChain Expression Language) - YouTube, fecha de acceso: abril 17, 2025, [https://www.youtube.com/watch?v=_yFfc5YB5Xc](https://www.youtube.com/watch?v=_yFfc5YB5Xc)
35. Concepts - LangGraph - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/concepts/](https://langchain-ai.github.io/langgraph/concepts/)
36. LangGraph Glossary - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/concepts/low_level/](https://langchain-ai.github.io/langgraph/concepts/low_level/)
37. LangGraph Tutorial: Building LLM Agents with LangChain's Agent Framework - Zep, fecha de acceso: abril 17, 2025, [https://www.getzep.com/ai-agents/langgraph-tutorial](https://www.getzep.com/ai-agents/langgraph-tutorial)
38. LangGraph Crash Course #5 - Drawbacks of React Agents - YouTube, fecha de acceso: abril 17, 2025, [https://www.youtube.com/watch?v=gbZLCjx0ZYs](https://www.youtube.com/watch?v=gbZLCjx0ZYs)
39. langchain-ai/langgraph-swarm-py - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph-swarm-py](https://github.com/langchain-ai/langgraph-swarm-py)
40. AI Agent Memory: A Comparative Analysis of LangGraph, CrewAI, and AutoGen, fecha de acceso: abril 17, 2025, [https://dev.to/foxgem/ai-agent-memory-a-comparative-analysis-of-langgraph-crewai-and-autogen-31dp](https://dev.to/foxgem/ai-agent-memory-a-comparative-analysis-of-langgraph-crewai-and-autogen-31dp)
41. Choosing the Right AI Agent Framework: LangGraph vs CrewAI vs OpenAI Swarm, fecha de acceso: abril 17, 2025, [https://www.relari.ai/blog/ai-agent-framework-comparison-langgraph-crewai-openai-swarm](https://www.relari.ai/blog/ai-agent-framework-comparison-langgraph-crewai-openai-swarm)
42. Mastering Agents: LangGraph Vs Autogen Vs Crew AI - Galileo AI, fecha de acceso: abril 17, 2025, [https://www.galileo.ai/blog/mastering-agents-langgraph-vs-autogen-vs-crew](https://www.galileo.ai/blog/mastering-agents-langgraph-vs-autogen-vs-crew)
43. langchain-ai/langgraph-bigtool: Build LangGraph agents ... - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph-bigtool](https://github.com/langchain-ai/langgraph-bigtool)
44. LangGraph Studio: Your first agent IDE - BakingAI Blog, fecha de acceso: abril 17, 2025, [https://bakingai.com/blog/langgraph-studio-ai-agent-ide/](https://bakingai.com/blog/langgraph-studio-ai-agent-ide/)
45. LangGraph Studio - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/concepts/langgraph_studio/](https://langchain-ai.github.io/langgraph/concepts/langgraph_studio/)
46. Multi-agent LLMs in 2024 [+frameworks] | SuperAnnotate, fecha de acceso: abril 17, 2025, [https://www.superannotate.com/blog/multi-agent-llms](https://www.superannotate.com/blog/multi-agent-llms)
47. LangGraph Platform | 🦜️🛠️ LangSmith, fecha de acceso: abril 17, 2025, [https://docs.smith.langchain.com/langgraph_cloud](https://docs.smith.langchain.com/langgraph_cloud)
48. Tutorials - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/tutorials/](https://langchain-ai.github.io/langgraph/tutorials/)
49. LangGraph Platform: Scalability & Resilience - GitHub Pages, fecha de acceso: abril 17, 2025, [https://langchain-ai.github.io/langgraph/concepts/scalability_and_resilience/](https://langchain-ai.github.io/langgraph/concepts/scalability_and_resilience/)
50. Mastering LangGraph: A Production-Ready Coding Walkthrough for Software Engineers, fecha de acceso: abril 17, 2025, [https://ragaboutit.com/mastering-langgraph-a-production-ready-coding-walkthrough-for-software-engineers/](https://ragaboutit.com/mastering-langgraph-a-production-ready-coding-walkthrough-for-software-engineers/)
51. LangGraph Studio Desktop (Beta) - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph-studio](https://github.com/langchain-ai/langgraph-studio)
52. Tutorial for Langgraph , any source will help . : r/LangChain - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1frgiah/tutorial_for_langgraph_any_source_will_help/](https://www.reddit.com/r/LangChain/comments/1frgiah/tutorial_for_langgraph_any_source_will_help/)
53. Langgraph vs other AI agents frameworks : r/LangChain - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1j4714z/langgraph_vs_other_ai_agents_frameworks/](https://www.reddit.com/r/LangChain/comments/1j4714z/langgraph_vs_other_ai_agents_frameworks/)
54. Langchain vs langgraph vs crewai for chatbot - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1gptg9u/langchain_vs_langgraph_vs_crewai_for_chatbot/](https://www.reddit.com/r/LangChain/comments/1gptg9u/langchain_vs_langgraph_vs_crewai_for_chatbot/)
55. Tutorials 2-Live Getting Started With LangGraph For Building AI Agents - YouTube, fecha de acceso: abril 17, 2025, [https://www.youtube.com/watch?v=UltwJqpNA04](https://www.youtube.com/watch?v=UltwJqpNA04)
56. Doubts: Best Practices in LangGraph #2090 - GitHub, fecha de acceso: abril 17, 2025, [https://github.com/langchain-ai/langgraph/discussions/2090](https://github.com/langchain-ai/langgraph/discussions/2090)
57. Langgraph vs CrewAI vs AutoGen vs PydanticAI vs Agno vs OpenAI Swarm : r/LangChain, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1jpk1vn/langgraph_vs_crewai_vs_autogen_vs_pydanticai_vs/](https://www.reddit.com/r/LangChain/comments/1jpk1vn/langgraph_vs_crewai_vs_autogen_vs_pydanticai_vs/)
58. Autogen vs. LangGraph : r/LangChain - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1b7q44y/autogen_vs_langgraph/](https://www.reddit.com/r/LangChain/comments/1b7q44y/autogen_vs_langgraph/)
59. Most people don't get langgraph right. : r/LangChain - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1jvxel4/most_people_dont_get_langgraph_right/](https://www.reddit.com/r/LangChain/comments/1jvxel4/most_people_dont_get_langgraph_right/)
60. LangGraph, a rant : r/LangChain - Reddit, fecha de acceso: abril 17, 2025, [https://www.reddit.com/r/LangChain/comments/1jc2am4/langgraph_a_rant/](https://www.reddit.com/r/LangChain/comments/1jc2am4/langgraph_a_rant/)
61. Tutorial 1-Getting Started With LangGraph- Building Stateful Multi AI Agents - YouTube, fecha de acceso: abril 17, 2025, [https://www.youtube.com/watch?v=gqvFmK7LpDo&pp=0gcJCfcAhR29_xXO](https://www.youtube.com/watch?v=gqvFmK7LpDo&pp=0gcJCfcAhR29_xXO)
62. Introduction to LangGraph: A Quick Dive into Core Concepts - YouTube, fecha de acceso: abril 17, 2025, [https://www.youtube.com/watch?v=J5d1l6xgQBc](https://www.youtube.com/watch?v=J5d1l6xgQBc)
63. OpenAI Agents SDK vs LangGraph vs Autogen vs CrewAI - Composio, fecha de acceso: abril 17, 2025, [https://composio.dev/blog/openai-agents-sdk-vs-langgraph-vs-autogen-vs-crewai/](https://composio.dev/blog/openai-agents-sdk-vs-langgraph-vs-autogen-vs-crewai/)
64. LangGraph vs CrewAI vs OpenAI Swarm: Which AI Agent Framework to Choose? - Oyelabs, fecha de acceso: abril 17, 2025, [https://oyelabs.com/langgraph-vs-crewai-vs-openai-swarm-ai-agent-framework/](https://oyelabs.com/langgraph-vs-crewai-vs-openai-swarm-ai-agent-framework/)
65. Langgraph Vs Crewai Comparison | Restackio, fecha de acceso: abril 17, 2025, [https://www.restack.io/p/multi-agents-answer-langgraph-vs-crewai-cat-ai](https://www.restack.io/p/multi-agents-answer-langgraph-vs-crewai-cat-ai)
66. Open Source Agentic Frameworks: LangGraph vs CrewAI & More - Prem AI Blog, fecha de acceso: abril 17, 2025, [https://blog.premai.io/open-source-agentic-frameworks-langgraph-vs-crewai-more/](https://blog.premai.io/open-source-agentic-frameworks-langgraph-vs-crewai-more/)
67. Let's compare AutoGen, crewAI, LangGraph and OpenAI Swarm - Getting Started with Artificial Intelligence, fecha de acceso: abril 17, 2025, [https://www.gettingstarted.ai/best-multi-agent-ai-framework/](https://www.gettingstarted.ai/best-multi-agent-ai-framework/)
68. Comparing Multi-agent AI frameworks: CrewAI, LangGraph, AutoGPT, AutoGen, fecha de acceso: abril 17, 2025, [https://www.concision.ai/blog/comparing-multi-agent-ai-frameworks-crewai-langgraph-autogpt-autogen](https://www.concision.ai/blog/comparing-multi-agent-ai-frameworks-crewai-langgraph-autogpt-autogen)
69. LangChain vs LangGraph: A Practical Guide - Data Scientist's Diary, fecha de acceso: abril 17, 2025, [https://datascientistsdiary.com/langchain-vs-langgraph/](https://datascientistsdiary.com/langchain-vs-langgraph/)
70. Agentic AI Comparison: AutoGen vs LangGraph, fecha de acceso: abril 17, 2025, [https://aiagentstore.ai/compare-ai-agents/autogen-vs-langgraph](https://aiagentstore.ai/compare-ai-agents/autogen-vs-langgraph)
71. Top 3 Trending Agentic AI Frameworks: LangGraph vs AutoGen vs Crew AI - Datagrom, fecha de acceso: abril 17, 2025, [https://www.datagrom.com/data-science-machine-learning-ai-blog/langgraph-vs-autogen-vs-crewai-comparison-agentic-ai-frameworks](https://www.datagrom.com/data-science-machine-learning-ai-blog/langgraph-vs-autogen-vs-crewai-comparison-agentic-ai-frameworks)
72. Autogen vs Langraph - AI Discussions - DeepLearning.AI, fecha de acceso: abril 17, 2025, [https://community.deeplearning.ai/t/autogen-vs-langraph/728036](https://community.deeplearning.ai/t/autogen-vs-langraph/728036)
73. Design multi-agent orchestration with reasoning using Amazon Bedrock and open source frameworks | AWS Machine Learning Blog, fecha de acceso: abril 17, 2025, [https://aws.amazon.com/blogs/machine-learning/design-multi-agent-orchestration-with-reasoning-using-amazon-bedrock-and-open-source-frameworks/](https://aws.amazon.com/blogs/machine-learning/design-multi-agent-orchestration-with-reasoning-using-amazon-bedrock-and-open-source-frameworks/)
74. Top 3 Agentic AI Frameworks | LangGraph vs AutoGen vs Crew AI - Rapid Innovation, fecha de acceso: abril 17, 2025, [https://www.rapidinnovation.io/post/top-3-trending-agentic-ai-frameworks-langgraph-vs-autogen-vs-crew-ai](https://www.rapidinnovation.io/post/top-3-trending-agentic-ai-frameworks-langgraph-vs-autogen-vs-crew-ai)
75. Expert Langgraph vs Langchain Guide to Master AI Automation - Lamatic Labs, fecha de acceso: abril 17, 2025, [https://blog.lamatic.ai/guides/langgraph-vs-langchain/](https://blog.lamatic.ai/guides/langgraph-vs-langchain/)
76. Scalability and Performance Benchmarking of LangChain, LlamaIndex, and Haystack for Enterprise AI Customer Support Systems - PubPub, fecha de acceso: abril 17, 2025, [https://ijgis.pubpub.org/pub/6yecqicl](https://ijgis.pubpub.org/pub/6yecqicl)


## 补充相关文章

+ [开源的阶段性成长指南](https://nsddd.top/zh/posts/stage-growth-of-open-source/)
+ [一份完整的开源贡献指南（提供给第一次踏入开源伙伴秘籍）](https://nsddd.top/zh/posts/open-source-contribution-guidelines/)
+ [我的实践总结：开源社区的规范设计思路](https://nsddd.top/zh/posts/advanced-githook-design/)
+ [在开源社区中学会如何提问](https://nsddd.top/zh/posts/the-art-of-asking-questions-in-open-source-communities/)