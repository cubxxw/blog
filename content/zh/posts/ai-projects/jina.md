---
title: "Jina 开源项目深度学习"
date: 2025-04-12T13:01:59+08:00
draft: false
description: "AI开源项目学习笔记"
tags: ["AI开源", "项目学习"]
categories: ["AI Open Source"]
author: "cubxxw"
---

## 项目概览

### 基本信息
- 项目名称：Jina
- GitHub 地址：[https://github.com/jina-ai](https://github.com/jina-ai)
- 主要技术栈：

<!-----



Conversion time: 1.812 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β44
* Sat Apr 12 2025 00:49:37 GMT-0700 (PDT)
* Source doc: Jina 项目深度学习分析

* Tables are currently converted to HTML tables.
----->



# **Jina 开源项目深度分析报告**


## **1. 项目概览**


### **1.1. 目标与定位**

Jina AI 的核心目标是为构建高质量的企业级搜索和检索增强生成（Retrieval-Augmented Generation, RAG）系统提供一个强大的基础平台 <sup>1</sup>。它旨在解决现代应用中对更高级搜索能力的需求，特别是在处理多模态数据和需要深度理解内容的场景下 <sup>1</sup>。Jina 将自身定位为 MLOps 框架，专注于帮助开发者构建和部署以微服务形式存在的 AI 应用，这些应用能够通过 gRPC、HTTP 和 WebSocket 等多种协议进行通信 <sup>3</sup>。其核心价值在于提供一套先进的模型和框架，显著提升搜索质量、相关性和效率 <sup>1</sup>。

Jina 不仅仅是一个向量搜索工具，更是一个全面的框架，用于构建、扩展和部署复杂的 AI 服务 <sup>2</sup>。它致力于简化从本地开发到生产环境部署的过渡过程，让开发者能够专注于核心算法和业务逻辑，而无需过多关注底层基础设施的复杂性 <sup>3</sup>。Jina 的设计理念使其能够支持各种主流的机器学习框架和数据类型，并提供云原生的特性 <sup>3</sup>。


### **1.2. 解决的问题**

Jina 主要解决以下问题：



* **复杂 AI 服务构建与部署：** 传统方式下，构建包含多个 AI 模型（如编码器、排序器、生成器）的复杂应用，并将其部署为可扩展、高可用的服务，需要大量的工程投入。Jina 通过其 Flow、Executor 和 Deployment 机制简化了这一过程 <sup>3</sup>。
* **多模态/跨模态数据处理：** 现代应用常常需要处理文本、图像、音频、视频等多种类型的数据。Jina 通过其核心数据结构 DocArray，提供了统一的方式来表示和处理这些异构数据，支持多模态和跨模态的搜索与分析 <sup>2</sup>。
* **低效的搜索与 RAG 实现：** 传统搜索依赖关键词匹配，而 RAG 系统需要高效地检索相关信息以增强大型语言模型（LLM）的生成能力。Jina 提供了优化的神经搜索能力，包括先进的嵌入模型和重排模型，以提高检索的准确性和相关性 <sup>1</sup>。
* **基础设施复杂性：** 将 AI 应用部署到生产环境，需要处理容器化、服务编排、扩展性、监控等一系列云原生挑战。Jina 内置了对 Docker、Kubernetes、Docker Compose 的支持，并集成了 OpenTelemetry 等监控工具，旨在降低基础设施管理的门槛 <sup>3</sup>。


### **1.3. 核心价值主张**

Jina 的核心价值主张体现在以下几个方面：



* **强大的 AI 基础能力：** 提供包括前沿嵌入模型（支持多语言、多模态、长文本）、重排模型、分类器、Reader API（转换 URL 内容）、DeepSearch（深度搜索与推理）等在内的一系列高质量 AI 功能 <sup>1</sup>。这些模型和功能旨在提供业界领先的性能 <sup>15</sup>。
* **云原生 MLOps 框架：** 提供从本地开发到云端部署的无缝体验，内置容器化、服务编排（Flow）、独立扩展（Deployment、副本、分片）、多协议支持（gRPC, HTTP, WebSocket）和可观测性 <sup>3</sup>。
* **多模态与框架无关性：** 通过 DocArray 支持任意数据模态，并兼容主流深度学习框架（如 PyTorch, TensorFlow/Keras, ONNX） <sup>2</sup>。
* **高性能与可扩展性：** 专为高性能设计，支持异步处理、动态批处理、流式传输，并提供简单的配置来实现服务的水平扩展（副本和分片） <sup>3</sup>。
* **开发者友好：** 提供 Pythonic 的 API 设计，简化复杂 AI 应用的构建和部署流程，并通过 Executor Hub 促进组件的复用和共享 <sup>4</sup>。


## **2. 宏观架构**

Jina 的架构设计体现了其云原生和微服务的核心思想，旨在将复杂的 AI 应用拆分为可独立开发、部署和扩展的组件。其架构主要可以分为三个逻辑层 <sup>3</sup>：


### **2.1. 数据层 (Data Layer)**



* **核心组件：** DocArray (及其核心类 BaseDoc, DocList)
* **职责：** 统一表示和处理流入和流出 Jina 系统的数据。DocArray 是 Jina 的基础数据结构，用于封装各种模态的数据（文本、图像、音频、视频、向量等）及其元数据 <sup>3</sup>。DocArray >= 0.30 版本基于 Pydantic，允许用户定义灵活的数据模式 (schema)，适应不同的应用需求 <sup>20</sup>。
* **交互：** Client 将用户请求封装成 DocList[InputDoc] 发送给 Gateway，Executor 接收 DocList[InputDoc]，处理后返回 DocList[OutputDoc]，最终由 Gateway 返回给 Client <sup>20</sup>。


### **2.2. 服务层 (Serving Layer)**



* **核心组件：** Executor, Gateway
* **职责：**
    * **Executor:** 执行具体的 AI 任务（如编码、索引、排序、生成等）的基本计算单元。每个 Executor 是一个独立的 Python 类，封装了特定的业务逻辑，并通过 @requests 装饰器定义处理请求的端点 <sup>3</sup>。Executor 处理 DocArray 数据 <sup>20</sup>。
    * **Gateway:** 作为 Flow 的入口点，负责接收外部客户端的请求，并将请求路由到 Flow 中的 Executor(s)。它支持多种通信协议（gRPC, HTTP, WebSocket, GraphQL）和 TLS 加密，并将处理结果返回给客户端 <sup>3</sup>。
* **交互：** Gateway 接收来自 Client 的请求，根据 Flow 的定义将请求（封装在 DocList 中）通过 gRPC 发送给相应的 Executor(s) <sup>28</sup>。Executor 处理请求后，将结果通过 gRPC 返回给 Gateway（或 Flow 中的下一个 Executor），最终 Gateway 将结果聚合后返回给 Client。


### **2.3. 编排层 (Orchestration Layer)**



* **核心组件：** Deployment, Flow
* **职责：**
    * **Deployment:** 用于服务化（serve）单个 Executor。它负责管理 Executor 的生命周期，并提供扩展（副本）、动态批处理等功能 <sup>3</sup>。一个 Deployment 对应一个微服务实例。
    * **Flow:** 将多个 Executor（通过 Deployment 服务化）组织成一个有向无环图（DAG）的处理流水线。Flow 定义了数据在不同 Executor 之间的流转路径和逻辑，并管理整个流水线的生命周期和扩展 <sup>3</sup>。Flow 会自动启动一个 Gateway 作为入口 <sup>25</sup>。
* **交互：** Flow 通过 .add() 方法将 Deployment（或直接指定 Executor 配置）添加到流水线中 <sup>25</sup>。Flow 启动时，会创建并管理其包含的所有 Deployment 实例以及 Gateway 实例。Client 通过 Gateway 与 Flow 进行交互，Flow 负责根据定义的拓扑将请求路由到相应的 Deployment/Executor。


### **2.4. 关键组件交互示意**

以下表格总结了 Jina 核心组件及其主要职责和交互方式：


<table>
  <tr>
   <td><strong>组件</strong>
   </td>
   <td><strong>核心职责</strong>
   </td>
   <td><strong>主要交互对象</strong>
   </td>
   <td><strong>相关技术/概念</strong>
   </td>
   <td><strong>关键 Snippets</strong>
   </td>
  </tr>
  <tr>
   <td><strong>DocArray</strong>
   </td>
   <td>统一数据表示（多模态），定义数据 Schema
   </td>
   <td>Client, Executor, Gateway
   </td>
   <td>Pydantic, Protobuf, gRPC
   </td>
   <td><sup>3</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Executor</strong>
   </td>
   <td>执行具体 AI 任务（处理 DocArray）
   </td>
   <td>Deployment, Flow, DocArray
   </td>
   <td>Python Class, @requests, gRPC
   </td>
   <td><sup>3</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Deployment</strong>
   </td>
   <td>服务化单个 Executor，提供扩展、生命周期管理
   </td>
   <td>Executor, Flow
   </td>
   <td>Microservice, Scaling (Replicas)
   </td>
   <td><sup>3</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Flow</strong>
   </td>
   <td>编排多个 Deployment/Executor 构成处理流水线 (DAG)
   </td>
   <td>Deployment, Gateway, Client
   </td>
   <td>Orchestration, Pipeline, DAG
   </td>
   <td><sup>3</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Gateway</strong>
   </td>
   <td>Flow 的入口，处理客户端请求，支持多协议，路由到 Executor
   </td>
   <td>Client, Flow, Executor
   </td>
   <td>API Gateway, gRPC, HTTP, WebSocket
   </td>
   <td><sup>3</sup>
   </td>
  </tr>
</table>



### **2.5. 设计思想：分布式与云原生**

Jina 的架构深度融合了分布式系统和云原生的设计思想：


* **微服务化:** 将复杂的 AI 应用分解为独立的 Executor 服务，每个服务都可以独立开发、部署、扩展和维护 <sup>3</sup>。
* **容器化:** 内置对 Docker 的支持，方便将 Executor 打包成容器镜像，并通过 Executor Hub 进行分发和管理 <sup>3</sup>。
* **服务编排:** 通过 Flow 和 Deployment 实现服务的自动化部署、扩展和管理，并能导出配置到 Kubernetes 和 Docker Compose <sup>3</sup>。
* **通信协议:** 优先采用 gRPC 进行内部服务间通信，以获得高性能和效率，同时通过 Gateway 支持 HTTP 和 WebSocket 等多种协议，方便客户端集成 <sup>3</sup>。
* **可观测性:** 集成 OpenTelemetry、Prometheus 和 Grafana，提供对分布式系统行为的监控和追踪能力 <sup>4</sup>。
* **可扩展性:** 通过副本（Replicas）和分片（Shards）机制，可以轻松地对 Executor 进行水平扩展，以应对不同的负载需求 <sup>4</sup>。

这种设计使得 Jina 构建的应用天然具备高可用性、可伸缩性和弹性，能够很好地适应云环境的需求 <sup>2</sup>。


## **3. 核心设计思路与权衡**

Jina 在其核心组件的设计中做出了一系列关键选择和权衡，以实现其目标。


### **3.1. 数据表示：DocArray 的演进与灵活性**



* **早期设计 (&lt;=0.21):** 最初，DocArray（当时是 jina.types 的一部分）提供了一个相对固定的 Document 模式，用于封装多模态数据和 Protobuf 交互 <sup>21</sup>。这种设计简化了早期 Jina 的数据处理，但强制用户数据适应固定模式 <sup>20</sup>。
* **当前设计 (>=0.30):** 随着 Jina 的发展和 DocArray 独立成为 LF AI & Data 基金会的项目 <sup>10</sup>，其设计理念发生了重大转变。新版 DocArray 基于 Pydantic，允许用户通过定义 BaseDoc 的子类来创建自定义的数据模式 <sup>10</sup>。
    * **优点:** 极大地提高了灵活性，用户可以精确定义 Executor 需要的输入输出结构，更好地适应特定任务和数据类型。支持嵌套结构，便于表示复杂的多模态关系 <sup>10</sup>。与 FastAPI 等现代 Python 框架的类型提示和数据验证机制保持一致 <sup>10</sup>。
    * **权衡:** 相比固定模式，用户需要显式定义数据模式，增加了少量初始工作量。为了兼容旧版本，Jina 提供了 LegacyDocument <sup>20</sup>，并在内部自动检测和适配 DocArray 版本 <sup>20</sup>。
* **DocList vs DocVec:** DocArray 提供了 DocList（类似 Python list，保持 tensors 独立）和 DocVec（类似 NumPy array，将 tensors 堆叠）两种容器，分别适用于流式处理/重排和批处理/模型输入场景，提供了不同场景下的性能和易用性权衡 <sup>10</sup>。
* **序列化与传输:** DocArray 内置了对 Protobuf 的支持，使其能够高效地通过 gRPC 进行传输。同时也支持 JSON、Base64 等序列化方式 <sup>10</sup>。选择 Protobuf 和 gRPC 是为了在分布式环境中获得更好的性能和跨语言兼容性 <sup>7</sup>。

这种从“强制适应框架”到“框架适应数据”的转变，体现了 Jina 对开发者体验和应用多样性需求的重视。虽然增加了模式定义的步骤，但换来了更高的表达能力和与现代 Python 生态更好的集成。


### **3.2. 流程编排：Flow 的声明式与命令式结合**



* **核心机制:** Flow 通过 .add() 方法（命令式）或 YAML 配置（声明式）将 Executor 组织成 DAG <sup>25</sup>。
* **声明式 (YAML):**
    * **优点:** 配置与代码分离，易于版本控制和管理，特别适合生产环境部署。非 Python 开发者也能理解和修改流程 <sup>25</sup>。
    * **权衡:** 对于非常动态或复杂的逻辑编排，YAML 可能表达能力有限。
* **命令式 (Python API):**
    * **优点:** 更加灵活，可以在 Python 代码中动态构建和修改 Flow，方便调试和快速原型开发 <sup>25</sup>。
    * **权衡:** 配置与代码耦合，可能不利于生产环境的维护。
* **路由与条件 (when):** Flow 允许通过 when 参数为 Executor 添加条件，实现基于 Document 内容的条件路由 <sup>25</sup>。这增加了流程的灵活性，但也可能使得流程逻辑更难追踪。
* **扩展性设计:** Flow 本身作为编排器，将实际计算委托给独立的 Deployment/Executor 进程/容器。这种解耦设计是实现独立扩展和弹性的关键 <sup>7</sup>。

Jina 同时提供声明式和命令式接口，满足了从快速原型到生产部署不同阶段的需求，并在灵活性和可维护性之间取得了平衡。


### **3.3. 计算单元：Executor 的封装与服务化**



* **封装:** Executor 将 AI 模型或业务逻辑封装在 Python 类中 <sup>4</sup>。通过继承 jina.Executor 并使用 @requests 装饰器定义处理方法，实现了接口的统一 <sup>22</sup>。
* **输入/输出:** Executor 强制使用 DocArray 作为输入输出，确保了数据在 Flow 中流转的一致性 <sup>20</sup>。Executor 可以定义自己的输入输出 Schema (使用 DocArray >= 0.30) <sup>20</sup>。
* **服务化 (Deployment):** Deployment 将 Executor 包装成一个独立的微服务，处理网络通信 (gRPC)、生命周期管理和扩展 <sup>4</sup>。
    * **优点:** 将 Executor 逻辑与服务化基础设施分离，简化了 Executor 的开发。提供了标准化的方式来部署和扩展 AI 功能。
    * **权衡:** 引入了 Deployment 这一层抽象，增加了系统的组件数量。对于非常简单的任务，可能显得有些重。
* **Executor Hub:** 通过 Hub 共享和复用 Executor，是 Jina 生态系统的重要组成部分 <sup>4</sup>。
    * **优点:** 加速开发，避免重复造轮子，促进最佳实践的传播。
    * **权衡:** 依赖社区维护的 Executor 质量可能参差不齐，需要用户自行评估。版本管理和依赖冲突是潜在问题（尽管 Hub 试图解决） <sup>4</sup>。

Executor 的设计体现了“单一职责原则”和“关注点分离”。开发者专注于实现 Executor 的核心逻辑，而 Jina 框架负责处理服务化、通信和扩展等基础设施问题。


## **4. 核心能力与特性**

Jina 框架提供了一系列强大的核心能力和特性，使其成为构建现代 AI 应用的有力工具。



* **多模态/跨模态支持:**
    * **实现基础:** 核心依赖于 DocArray 数据结构，能够统一表示文本、图像、音频、视频、3D Mesh 等多种数据类型及其嵌入向量 <sup>2</sup>。
    * **能力:** 支持构建能够理解和处理多种数据模态的应用，例如使用文本查询图像（跨模态搜索）或融合文本和图像信息进行分析（多模态 RAG） <sup>2</sup>。Jina AI 也提供多模态嵌入模型 <sup>15</sup>。
* **神经搜索与 RAG:**
    * **实现基础:** 结合了先进的嵌入模型（如 Jina Embeddings v2/v3）、重排模型（Reranker）、向量索引和检索能力（通过集成向量数据库或内置索引器 Executor）以及 Flow 编排能力 <sup>1</sup>。
    * **能力:** 支持基于语义理解的搜索，而非简单的关键词匹配。能够构建高效的 RAG 系统，通过检索相关上下文来增强 LLM 的回答质量和事实准确性 <sup>1</sup>。Jina 的 DeepSearch 产品是其 RAG 能力的体现 <sup>1</sup>。
* **高可扩展性与性能:**
    * **实现基础:** 微服务架构、Flow/Deployment 的编排、副本（Replicas）、分片（Shards）、动态批处理（Dynamic Batching）、异步处理（Asyncio）和 gRPC 通信 <sup>3</sup>。
    * **能力:** 能够通过增加副本并行处理更多请求，通过分片处理大规模数据。动态批处理优化模型推理效率。异步和 gRPC 保证了高吞吐和低延迟 <sup>2</sup>。支持有状态 Executor 的一致性复制 (RAFT) <sup>18</sup>。
* **框架无关性:**
    * **实现基础:** Executor 作为 Python 类，可以在内部使用任何主流的机器学习框架（PyTorch, TensorFlow, ONNX, PaddlePaddle 等）加载和运行模型 <sup>3</sup>。
    * **能力:** 开发者可以自由选择最适合其任务的模型和框架，Jina 负责将其服务化和集成到 Flow 中。
* **云原生部署:**
    * **实现基础:** 内置 Docker 支持、Executor Hub 分发容器镜像、导出 Docker Compose 和 Kubernetes 配置、Jina AI Cloud 一键部署选项、集成 OpenTelemetry/Prometheus/Grafana 进行监控 <sup>3</sup>。
    * **能力:** 简化了将 Jina 应用部署到各种云环境和本地集群的过程，提供了生产级的运维能力。
* **多协议支持:**
    * **实现基础:** Gateway 组件支持 gRPC、HTTP、WebSocket 和 GraphQL 协议，并支持 TLS 加密 <sup>4</sup>。内部 Executor 间通信默认使用 gRPC <sup>28</sup>。
    * **能力:** 提供了灵活的客户端接入方式，满足不同场景的需求。gRPC 保证了内部通信的高效性 <sup>6</sup>。
* **LLM 服务与流式输出:**
    * **实现基础:** 支持在 Executor 中运行 LLM，并能通过异步处理和流式传输协议（如 gRPC streaming, WebSocket）将 LLM 生成的 token 逐步返回给客户端 <sup>3</sup>。
    * **能力:** 适用于构建交互式聊天机器人、实时内容生成等需要流式响应的应用。


## **5. 技术选型**

分析 Jina (jina-ai/serve) 的源代码、依赖文件（如 pyproject.toml）和文档，可以梳理出其关键的技术选型：



* **主要编程语言:** Python <sup>4</sup>。整个框架的核心是用 Python 编写的，提供了 Pythonic 的 API。
* **核心依赖库:**
    * **DocArray:** 用于多模态数据表示和处理，是 Jina 数据层的基础 <sup>3</sup>。新版本基于 Pydantic。
    * **gRPC (grpcio):** 用于服务间的高性能 RPC 通信，是 Executor 间以及 Gateway 与 Executor 间通信的基础 <sup>3</sup>。
    * **Protobuf (protobuf):** 与 gRPC 配合使用，用于定义服务接口和序列化数据结构（DocArray 底层也使用） <sup>10</sup>。
    * **FastAPI:** 虽然 Jina 与 FastAPI 有所不同 <sup>3</sup>，但 Jina 的 Gateway 支持 HTTP 协议，其实现可能借鉴或使用了 FastAPI 的部分理念或依赖（如 Pydantic, Starlette, Uvicorn）。Executor API 的设计也受到了 FastAPI 的启发 <sup>20</sup>。
    * **Uvicorn / Hypercorn:** ASGI 服务器，用于运行支持 HTTP/WebSocket 的 Gateway。
    * **Asyncio:** Python 的异步 I/O 框架，广泛用于 Jina 的内部实现，以支持高并发和非阻塞操作 <sup>4</sup>。
    * **Pydantic:** 用于数据验证和模式定义，尤其在 DocArray >= 0.30 和 Executor 的 Schema 定义中广泛使用 <sup>10</sup>。
    * **NumPy:** 用于处理数值计算和张量数据 <sup>10</sup>。
    * **PyYAML:** 用于解析 YAML 配置文件（Flow, Deployment, Executor config） <sup>25</sup>。
* **构建与打包:**
    * pyproject.toml: 用于定义项目元数据、依赖项和构建系统（通常是 setuptools） <sup>3</sup>。其他 Jina 生态项目（如 llm-jina-api, late-chunking, thinkgpt）也使用 pyproject.toml，但可能使用 poetry 作为构建后端 <sup>46</sup>。
    * requirements.txt: 可能也存在，用于列出运行时依赖 <sup>3</sup>。
* **容器化:** Docker <sup>3</sup>。
* **可观测性:** OpenTelemetry (opentelemetry-api, opentelemetry-sdk, exporters) <sup>4</sup>。
* **其他生态依赖 (常见于 Executor 或示例):**
    * transformers: Hugging Face 库，用于加载和使用各种预训练模型 <sup>3</sup>。
    * torch, tensorflow: 主流深度学习框架 <sup>3</sup>。
    * 各种向量数据库客户端 (e.g., weaviate-client, pinecone-client, qdrant-client) <sup>35</sup>。

Jina 的技术选型体现了对现代 Python 生态、高性能网络通信、异步编程以及云原生实践的拥抱。通过标准化核心依赖（如 DocArray, gRPC）并保持对上层 AI 框架的灵活性，Jina 试图在提供强大功能的同时，维持良好的开发体验和集成能力。


## **6. 核心实现细节探索**

为了更深入地理解 Jina 的工作机制，我们选择两个核心方面进行探索：Flow 的构建与运行机制，以及 Executor 的生命周期管理。


### **6.1. Flow 构建与运行机制**

Flow 的核心职责是编排一系列 Executor（通过 Deployment 服务化）形成数据处理流水线。



* **构建过程:**
    * **Python API (.add()):** 当调用 f = Flow().add(uses=MyExecutor, name='exec1') 时，Flow 实例内部会记录下这个 Executor 的配置（uses, name, replicas, shards, when 等参数）以及它在图中的位置（前驱节点、后继节点）。.add() 方法返回 Flow 实例自身，允许链式调用 <sup>25</sup>。
    * **YAML 加载:** 使用 Flow.load_config('flow.yml') 或 jina flow --uses flow.yml 时，Jina 会解析 YAML 文件，提取 jtype: Flow 以及 executors 列表下的配置，同样在内部构建出流水线的拓扑结构 <sup>25</sup>。
    * **Gateway 添加:** Flow 在构建时，通常会自动配置并添加一个 Gateway（默认是 gRPC Gateway，但可配置为 HTTP, WebSocket 或自定义 Gateway）作为整个流水线的入口点 <sup>25</sup>。
* **运行机制 (启动 with Flow(): 或 f.start()):**
    1. **资源分配:** Flow 遍历其内部维护的 Executor 配置。对于每个 Executor，它会创建一个或多个 Deployment 实例来管理该 Executor 的服务化 <sup>25</sup>。如果设置了 replicas 或 shards，会相应地创建多个 Executor 实例。
    2. **进程/容器启动:** 每个 Deployment 会启动其管理的 Executor(s) 实例。在本地运行时，这通常意味着启动新的 Python 进程 <sup>25</sup>。如果 Executor 配置为使用 Docker (uses='docker://...' 或 uses='jinaai+docker://...')，则会启动相应的 Docker 容器 <sup>19</sup>。在 Kubernetes 环境下，会创建对应的 Pods <sup>14</sup>。
    3. **Gateway 启动:** Flow 启动关联的 Gateway 实例，监听指定的端口和协议 (e.g., gRPC, HTTP) <sup>7</sup>。
    4. **连接建立:** Gateway 知道 Flow 中所有（第一个）Executor 的地址。Executor 之间也需要知道下游 Executor 的地址以转发请求（这部分路由逻辑由 Flow 的编排层管理，并通过运行时环境传递给 Executor 或其所在的 Deployment/Pod）。内部通信主要通过 gRPC <sup>28</sup>。
    5. **就绪等待 (timeout_ready):** Flow 会等待所有 Executor 和 Gateway 成功启动并报告就绪状态，然后 Flow 本身才进入可服务状态 <sup>8</sup>。
* **请求处理:**
    1. **Client -> Gateway:** 客户端通过指定的协议连接到 Gateway 的暴露端口，发送请求（通常是包含 DocList 的数据） <sup>26</sup>。
    2. **Gateway -> First Executor(s):** Gateway 接收请求，根据 Flow 的拓扑结构，将请求通过 gRPC 转发给流水线中的第一个 Executor(s) <sup>28</sup>。如果第一个节点有副本（replicas），Gateway 会进行负载均衡。
    3. **Executor -> Executor:** Executor 处理完数据后，如果 Flow 中还有后续节点，它会将处理结果（DocList）通过 gRPC 发送给下一个 Executor(s)。Flow 的编排逻辑确保数据按照 DAG 定义流动。条件路由 (when) 在此阶段生效 <sup>25</sup>。
    4. **Last Executor -> Gateway:** 流水线中最后一个 Executor 将最终结果返回给 Gateway。
    5. **Gateway -> Client:** Gateway 收集来自最后一个 Executor(s) 的结果，聚合并返回给客户端 <sup>7</sup>。
* **关闭 (exit from with block or f.close()):** Flow 负责优雅地关闭所有启动的 Deployment (Executor 进程/容器) 和 Gateway 实例，释放资源 <sup>25</sup>。确保状态的正确保存（尤其对于有状态 Executor）是关闭过程中的一个重要挑战 <sup>53</sup>。

Flow 的实现依赖于底层的 Deployment 来管理 Executor 服务，并通过 Gateway 提供统一入口，其核心价值在于将这些分布式组件的启动、连接、数据路由和生命周期管理进行了抽象和自动化。


### **6.2. Executor 生命周期管理**

Executor 的生命周期由其容器（通常是 Deployment）和更高层的编排器（Flow）管理。



1. **实例化 (__init__):** 当 Deployment 启动一个 Executor 实例时（无论是在新进程还是容器中），Executor 类的 __init__ 方法被调用。这是加载模型、初始化连接、设置配置参数（通过 uses_with 传入）的最佳时机 <sup>8</sup>。避免在请求处理方法（如 @requests 装饰的方法）中执行耗时的初始化操作 <sup>53</sup>。
2. **服务就绪:** Executor 初始化完成后，其所在的 Deployment/Pod 会向 Flow 报告就绪状态。Flow 会等待所有组件就绪 <sup>29</sup>。timeout_ready 参数控制等待超时时间 <sup>17</sup>。
3. **请求处理 (@requests):** 一旦就绪，Executor 就开始监听来自 Gateway 或上游 Executor 的 gRPC 请求。当请求到达时，Jina 运行时会将请求数据（DocList）反序列化，并调用 @requests 装饰的相应方法 (根据请求的 endpoint 匹配，如 /index, /search 或默认 /) <sup>22</sup>。该方法执行用户定义的逻辑，处理 DocList，并返回结果 DocList。这个过程是 Executor 的主要工作阶段。Jina 运行时处理了 gRPC 服务器的细节、数据的序列化/反序列化以及与 Flow 的集成。
4. **状态管理 (可选):** 对于需要持久化状态的 Executor（例如，向量索引器），需要在请求处理过程中更新其内部状态。Jina 提供了基于 RAFT 的共识机制来管理有状态 Executor 的副本一致性 <sup>18</sup>。
5. **健康检查:** Deployment/Flow 可能会定期对 Executor 进行健康检查，以确保其正常运行 <sup>7</sup>。
6. **热重载 (Hot Reload):** Jina 支持 Executor 的热重载功能，允许在不停止服务的情况下更新 Executor 的代码或配置 <sup>7</sup>。
7. **终止/关闭:** 当 Flow 或 Deployment 被停止时（例如，退出 with 块或收到终止信号），它会向其管理的 Executor 发送关闭指令。
    * **优雅关闭:** Executor 应该有机会完成正在处理的请求，并执行清理操作（例如，保存状态、关闭文件句柄、释放资源）。这通常在 __del__ 方法或通过信号处理程序实现。
    * **状态保存:** 对于有状态 Executor，在关闭前持久化其状态至关重要。Jina 的早期版本中存在关闭时状态保存可能失败的问题，后续版本通过改进生命周期管理（如使用非守护进程、join() 等待）来增强其鲁棒性 <sup>53</sup>。
    * **资源释放:** 释放 GPU 内存、关闭数据库连接等。

Executor 的生命周期管理是确保 Jina 应用稳定性和可靠性的关键。框架通过 Deployment 和 Flow 提供了大部分管理功能，但开发者仍需在 __init__ 和可能的清理逻辑（如 __del__ 或信号处理）中正确处理资源和状态。对 <sup>53</sup> 中提到的关闭问题的修复过程（涉及非守护进程和 join()) 表明，在分布式环境中确保优雅关闭和状态一致性是一个复杂但核心的工程挑战，框架在这方面持续进行优化。timeout_ready <sup>17</sup> 和就绪检查 <sup>29</sup> 的存在进一步凸显了管理分布式组件状态的重要性。


## **7. Jina 生态系统与社区**

Jina 不仅仅是一个单一的框架，它围绕着一个不断发展的生态系统，包括核心库、相关工具、集成和社区资源。


### **7.1. 核心相关项目 (Jina AI GitHub 组织内)**

除了核心的 jina-serve (曾用名 jina) 仓库外，jina-ai GitHub 组织下还有多个紧密相关的项目，共同构成了 Jina 技术栈：


<table>
  <tr>
   <td><strong>项目名称</strong>
   </td>
   <td><strong>主要功能</strong>
   </td>
   <td><strong>与 Jina Core 的关系</strong>
   </td>
   <td><strong>关键 Snippets</strong>
   </td>
  </tr>
  <tr>
   <td><strong>DocArray</strong>
   </td>
   <td>基础数据结构，用于表示、传输和存储多模态数据
   </td>
   <td>Jina 的核心依赖，定义了 Executor 的输入输出格式
   </td>
   <td><sup>3</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Finetuner</strong>
   </td>
   <td>用于微调 AI 模型（特别是嵌入模型）
   </td>
   <td>使用 DocArray 作为输入，微调后的模型可作为 Executor 使用
   </td>
   <td><sup>56</sup>
   </td>
  </tr>
  <tr>
   <td><strong>CLIP-as-service</strong>
   </td>
   <td>提供可扩展的 CLIP 模型服务（嵌入、推理、排序）
   </td>
   <td>可以作为 Executor 集成到 Jina Flow 中，常用于示例
   </td>
   <td><sup>56</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Reader</strong> (reader)
   </td>
   <td>将 URL 或网页搜索结果转换为 LLM 友好的 Markdown 格式
   </td>
   <td>可作为独立 API 使用，也可封装为 Executor
   </td>
   <td><sup>1</sup>
   </td>
  </tr>
  <tr>
   <td><strong>DeepSearch/node-DeepResearch</strong>
   </td>
   <td>实现深度搜索和 RAG 的代理式（Agentic）框架
   </td>
   <td>利用 Reader、Embeddings 等 Jina 技术，展示复杂 Flow 逻辑
   </td>
   <td><sup>1</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Executor Hub</strong> (非独立仓库)
   </td>
   <td>发现、共享和管理可重用 Executor 组件的平台
   </td>
   <td>Jina Flow 可以直接引用 Hub 中的 Executor
   </td>
   <td><sup>4</sup>
   </td>
  </tr>
  <tr>
   <td><strong>DiscoArt / DALL-E Flow</strong>
   </td>
   <td>使用 Jina/DocArray 构建的生成艺术应用示例
   </td>
   <td>展示 Jina 生态能力的具体应用
   </td>
   <td><sup>61</sup>
   </td>
  </tr>
</table>


这个生态结构体现了一种平台策略：jina-serve 提供通用的 MLOps 基础（编排、服务化、扩展），而像 Reader、Finetuner 这样的工具以及特定的模型（如 Jina Embeddings）则是在这个基础上构建的、针对特定高价值用例（如 RAG、模型微调、搜索质量提升）的专业化解决方案。Executor Hub 则充当了连接组织，使得这些专业能力能够以可复用组件的形式被共享和集成到 Jina Flow 中 <sup>7</sup>。这种分层和专业化的方式使得核心框架保持通用性，同时又能通过周边工具快速响应特定领域的需求。


### **7.2. Executor Hub**

Executor Hub 是 Jina 生态的核心组成部分，它是一个用于共享和发现可重用 Executor 组件的中央存储库 <sup>4</sup>。



* **功能:** 允许开发者将自己编写的 Executor 打包（包括代码、依赖、配置和 Dockerfile）并发布 (jina hub push) 到 Hub <sup>17</sup>。其他用户可以通过 Jina CLI (jina hub pull, jina hub list) 或直接在 Flow 定义中 (uses='jinaai://...' 或 uses='jinaai+docker://...') 来发现和使用这些 Executor <sup>7</sup>。Hub 还处理版本管理和依赖解析，并支持平台感知的 Docker 镜像拉取 <sup>4</sup>。
* **价值:** 极大地促进了代码复用，减少了开发时间。开发者可以利用社区贡献的各种预构建 Executor（如编码器、索引器、预处理器等）快速搭建应用，而无需从头开始实现所有功能 <sup>7</sup>。


### **7.3. 第三方集成**

Jina 积极与其他 AI 和数据处理工具集成，扩展其应用范围：



* **向量数据库:** Jina 可以与多种流行的向量数据库集成，通常通过专门的 Executor 来实现数据的索引和查询。支持的数据库包括 Weaviate <sup>35</sup>、Pinecone <sup>35</sup>、Qdrant <sup>10</sup>、Milvus <sup>10</sup>、Elasticsearch <sup>32</sup>、Couchbase <sup>36</sup> 等。
* **AI 框架:**
    * **LangChain:** Jina 的 Embeddings、Reader API 和 Reranker 已被集成到 LangChain 中，方便 LangChain 用户利用 Jina 的能力构建 RAG 或其他 LLM 应用 <sup>56</sup>。
    * **Haystack:** 类似地，Haystack 也集成了 Jina 的 Embeddings、Reader API 和 Reranker 组件 <sup>11</sup>。
* **云平台:** 除了 Jina 自身的 Jina AI Cloud <sup>7</sup>，Jina 的模型（如 Embeddings, Reranker）和服务也可以部署在主流云平台上，如 AWS SageMaker <sup>15</sup>、Microsoft Azure <sup>15</sup> 和 Google Cloud <sup>15</sup>。
* **可观测性工具:** Jina 通过 OpenTelemetry 标准接口导出追踪（Tracing）和指标（Metrics）数据，可以与 Prometheus（用于收集指标）和 Grafana（用于可视化）等工具集成，实现对 Jina 应用的监控 <sup>4</sup>。
* **API 网关:** 虽然 Jina Flow 自带 Gateway，但也可以与外部 API 网关（如 Kong）集成，以利用更高级的网关功能（如更复杂的认证、限流策略等） <sup>27</sup>。


### **7.4. 社区与资源**

Jina 拥有一个活跃的开源社区和丰富的学习资源：



* **官方文档:** docs.jina.ai 是最权威的信息来源，包含概念解释、教程、API 参考等 <sup>63</sup>。
* **GitHub 仓库:** jina-ai/serve 及相关仓库是代码、问题跟踪（Issues）、讨论和示例代码的主要场所 <sup>53</sup>。
* **博客:** Jina AI 博客 (jina.ai/news/) 发布更新、教程和深入的技术文章 <sup>21</sup>。
* **交流渠道:** Slack 和 Discord <sup>63</sup> 是社区成员交流和寻求帮助的主要平台。
* **教程与示例:** 官方文档和 jina-ai/examples <sup>64</sup> 仓库提供了大量示例代码。第三方教程和文章也逐渐增多 <sup>2</sup>。
* **YouTube 频道:** 提供教学视频和讲座 <sup>72</sup>。

Jina 的开放治理模式（例如将 DocArray 捐赠给 LF AI & Data 基金会 <sup>21</sup>）和对社区贡献的鼓励 <sup>2</sup>，有助于生态系统的健康发展。

同时，这种开放的生态系统也服务于 Jina AI 公司的商业模式。开源的 Jina 框架和相关工具（如 DocArray、部分 Executor）作为强大的基础，吸引开发者构建复杂的 AI 应用。这自然地为 Jina AI 的商业产品创造了需求，这些产品包括更先进的专有模型（如前沿的嵌入模型 <sup>15</sup>）、托管 API（如 Reader、DeepSearch API <sup>75</sup>）以及 Jina AI Cloud 托管平台 <sup>41</sup>。广泛的集成（如 LangChain、Haystack、各种向量数据库）进一步提升了开源框架的实用性，使得其商业产品作为无缝扩展或生产级解决方案更具吸引力。这是一个典型的商业开源策略（COSS），通过开源核心驱动采用和社区建设，同时通过增值功能、模型或服务实现盈利。强大的生态系统增强了开源核心和商业产品的双重价值。


## **8. Jina 系统学习路径建议**

为了系统地学习 Jina 的设计和实现，建议遵循以下结构化的路径，从基础概念逐步深入到高级特性和源码层面：

**阶段一：掌握基础概念与快速入门 (理解“是什么”与“为什么”)**



* **目标:** 理解 Jina 的核心价值、解决的问题以及基本架构。
* **行动:**
    1. **阅读概览:** 通读 jina-ai/serve (或 jina-ai/jina) 的 README 文件 <sup>3</sup> 和 Jina AI 官网 (jina.ai) 的项目介绍 <sup>1</sup>。明确 Jina 的目标是构建 AI 服务（特别是搜索和 RAG）的 MLOps 框架。
    2. **理解核心组件:** 熟悉 Jina 的三大层次（数据、服务、编排）和五大核心概念：DocArray (数据表示), Executor (计算单元), Deployment (服务化 Executor), Flow (编排流水线), Gateway (入口) <sup>2</sup>。可参考本报告的架构部分和表格 2.1。
    3. **运行快速入门:** 按照官方文档或 README 中的 Quick Start/Hello World 示例进行操作 <sup>7</sup>。目标是成功在本地运行一个简单的 Flow 并看到输出，初步感受 Jina 的工作流程。

**阶段二：核心组件实践 (构建简单服务)**



* **目标:** 学会定义和运行基本的 Executor、Deployment 和 Flow，并理解 DocArray 的基本用法。
* **行动:**
    1. **DocArray 基础:** 学习 DocArray 文档 (docs.docarray.org) <sup>10</sup>。重点掌握如何定义 BaseDoc 子类来创建数据模式 (schema)，如何使用 DocList 存储和访问文档，以及如何添加文本、张量等数据 <sup>20</sup>。练习创建包含不同数据类型的简单文档。
    2. **Executor 开发:** 学习 Executor 的基本结构：继承 jina.Executor，实现 __init__ 方法（用于加载模型或初始化资源），使用 @requests 装饰器定义处理请求的方法 <sup>22</sup>。编写简单的 Executor，例如修改文档文本或生成虚拟嵌入。理解如何定义请求端点 (on=) 和请求/响应模式 (request_schema, response_schema) <sup>22</sup>。
    3. **Deployment 使用:** 学习如何使用 jina.Deployment (通过 Python API 或 YAML) 来服务化单个 Executor <sup>24</sup>。练习使用 jina.Client 向 Deployment 发送请求并接收响应 <sup>7</sup>。
    4. **Flow 构建:** 学习如何使用 jina.Flow (通过 Python API 的 .add() 方法或 YAML 的 executors: 列表) 将多个 Executor 连接起来 <sup>25</sup>。构建一个简单的两步流水线（例如，文本分割器 -> 简单编码器），理解数据如何在 Executor 之间传递。

**阶段三：深入特性与多模态处理 (增强服务能力)**



* **目标:** 探索 Jina 的关键特性，如扩展、配置、多模态数据处理和 Executor Hub。
* **行动:**
    1. **DocArray 进阶:** 探索 DocArray 的嵌套文档、DocVec 与 DocList 的区别和适用场景、序列化选项以及与向量数据库的集成 <sup>10</sup>。尝试在 Executor 中处理图像或音频数据（可参考 jina-ai/examples 中的示例） <sup>43</sup>。
    2. **Executor 配置:** 学习使用 uses_with 和 uses_metas 向 Executor 传递初始化参数 <sup>19</sup>。研究动态批处理 (uses_dynamic_batching) 的配置和效果 <sup>17</sup>。了解如何在 Executor 中利用 GPU (device 参数, CUDA_VISIBLE_DEVICES 环境变量) <sup>17</sup>。
    3. **扩展性:** 在本地通过 replicas 参数尝试扩展 Deployment 或 Flow 中的 Executor <sup>17</sup>。理解副本（Replicas）和分片（Shards）在扩展中的不同作用。
    4. **Gateway 与协议:** 理解 Gateway 如何暴露不同的网络协议 (gRPC, HTTP, WebSocket) <sup>7</sup>。尝试通过 HTTP 协议访问你构建的 Flow。
    5. **Executor Hub:** 学习如何使用 jina hub CLI (list, pull) 查找和获取 Hub 上的 Executor <sup>19</sup>。练习在 Flow 定义中通过 uses='jinaai://...' 或 uses='jinaai+docker://...' 引用 Hub Executor <sup>7</sup>。尝试将社区提供的 Executor 集成到自己的 Flow 中。

**阶段四：生产化与生态集成 (部署与整合)**



* **目标:** 理解如何将 Jina 应用部署到生产环境，以及 Jina 如何融入更广泛的 AI 生态系统。
* **行动:**
    1. **容器化:** 学习 Jina 与 Docker 的集成方式。练习为自定义的 Executor 编写 Dockerfile 并构建镜像 <sup>6</sup>。理解如何在 Flow/Deployment 配置中挂载卷 (volumes) <sup>19</sup>。
    2. **部署:** 学习如何使用 .to_docker_compose_yaml() 和 .to_kubernetes_yaml() 方法将 Flow 或 Deployment 配置导出为 Docker Compose 或 Kubernetes 清单文件 <sup>14</sup>。如果条件允许，尝试将一个简单的 Flow 部署到 Minikube 或云上的 Kubernetes 集群。了解服务网格（如 Linkerd）在 Jina on K8s 部署中的作用 <sup>14</sup>。如果感兴趣，可以探索 Jina AI Cloud 的一键部署 (jc deploy) <sup>41</sup>。
    3. **可观测性:** 理解 Jina 中使用 OpenTelemetry 实现追踪和指标收集的基本概念 <sup>13</sup>。了解如何配置 Exporter 将数据发送到监控后端（如 Prometheus/Grafana）。
    4. **集成:** 浏览 Jina 与向量数据库 <sup>35</sup> 或其他 AI 框架（如 LangChain, Haystack <sup>11</sup>）的集成示例。尝试构建一个结合了 Jina 和外部工具的应用。

**阶段五：高级主题与源码贡献 (精通与回馈)**



* **目标:** 深入理解 Jina 的高级概念和内部实现，并考虑为社区做出贡献。
* **行动:**
    1. **有状态 Executor:** 研究 Jina 中用于有状态副本的 RAFT 共识机制 (stateful=True, peer_ports) <sup>18</sup>。
    2. **自定义 Gateway:** 探索构建自定义 Gateway 以满足特定协议或认证需求的潜力 <sup>27</sup>。
    3. **源码阅读:** 选择 Jina (jina-ai/serve 仓库) 的一个核心组件（例如 Flow 的请求路由逻辑、Deployment 的扩展机制、Gateway 的协议处理部分），深入阅读其源代码，理解其内部工作原理。可以结合调试工具进行分析。
    4. **社区贡献:** 积极参与社区（Slack/Discord/GitHub Issues）。尝试解决一个已知的 Bug，改进官方文档 <sup>42</sup>，或者开发一个新的 Executor 并将其贡献到 Hub <sup>55</sup>。

遵循此路径，可以系统地从 Jina 的使用者成长为深入理解其内部机制乃至贡献代码的开发者。


## **9. 结论**

Jina (jina-ai/serve) 是一个功能强大且设计精良的开源 MLOps 框架，专注于简化多模态 AI 应用（特别是神经搜索和 RAG 系统）的构建、部署和扩展。其核心优势在于：


* **云原生微服务架构:** 通过 Flow、Deployment、Executor 和 Gateway 等核心组件，将复杂的 AI 应用分解为易于管理、独立扩展的微服务，并内置了对容器化、服务编排和可观测性的支持。
* **强大的数据处理能力:** 以 DocArray 为核心，提供了灵活且统一的方式来表示和处理文本、图像、音视频等多种数据模态，是其多模态/跨模态能力的基础。
* **高性能与可扩展性:** 采用 gRPC、异步处理、动态批处理等技术优化性能，并通过副本和分片机制提供强大的水平扩展能力。
* **丰富的生态系统:** Executor Hub 促进了组件复用，与主流向量数据库、AI 框架（LangChain, Haystack）和云平台的广泛集成扩展了其应用场景。

Jina 的设计体现了对开发者体验的重视，提供了 Pythonic 的 API 和从本地开发到云端部署的平滑过渡路径。其技术选型紧随现代 Python 和云原生技术栈。

对于希望系统学习 Jina 的开发者而言，建议从理解核心概念和运行简单示例开始，逐步掌握 DocArray、Executor、Deployment 和 Flow 的使用，然后深入探索多模态处理、扩展性、部署选项和 Executor Hub 等特性。最终，通过阅读源码和参与社区贡献，可以达到更深层次的理解和掌握。

总而言之，Jina 提供了一套全面的工具和理念，旨在降低构建和运维生产级、可扩展、多模态 AI 应用的门槛，是 MLOps 领域一个值得关注和学习的重要项目。


#### Obras citadas



1. Jina AI - Your Search Foundation, Supercharged., fecha de acceso: abril 11, 2025, [https://jina.ai/](https://jina.ai/)
2. What is Jina AI? Features & Getting Started - Deepchecks, fecha de acceso: abril 11, 2025, [https://www.deepchecks.com/llm-tools/jina-ai/](https://www.deepchecks.com/llm-tools/jina-ai/)
3. jina-ai/serve: ☁️ Build multimodal AI applications with ... - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/jina](https://github.com/jina-ai/jina)
4. NotAndOr/jina-ai.jina: Build multimodal AI services via cloud native technologies - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/NotAndOr/jina-ai.jina](https://github.com/NotAndOr/jina-ai.jina)
5. jina-ai/serve: ☁️ Build multimodal AI applications with cloud-native stack - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/serve](https://github.com/jina-ai/serve)
6. jina - PyPI, fecha de acceso: abril 11, 2025, [https://pypi.org/project/jina/](https://pypi.org/project/jina/)
7. Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/](https://jina.ai/serve/)
8. NotAndOr/jina - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/NotAndOr/jina](https://github.com/NotAndOr/jina)
9. generative - PyPI, fecha de acceso: abril 11, 2025, [https://pypi.org/project/generative/](https://pypi.org/project/generative/)
10. DocArray, fecha de acceso: abril 11, 2025, [https://docs.docarray.org/](https://docs.docarray.org/)
11. Integration: Jina AI - Haystack - Deepset, fecha de acceso: abril 11, 2025, [https://haystack.deepset.ai/integrations/jina](https://haystack.deepset.ai/integrations/jina)
12. Top 10 Open-Source RAG Frameworks you need!! - DEV Community, fecha de acceso: abril 11, 2025, [https://dev.to/rohan_sharma/top-10-open-source-rag-frameworks-you-need-3fhe](https://dev.to/rohan_sharma/top-10-open-source-rag-frameworks-you-need-3fhe)
13. OpenTelemetry Support - Jina 3.27.17 documentation - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/cloud-nativeness/opentelemetry/](https://jina.ai/serve/cloud-nativeness/opentelemetry/)
14. Deploy on Kubernetes - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/cloud-nativeness/kubernetes/](https://jina.ai/serve/cloud-nativeness/kubernetes/)
15. Embedding API - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/embeddings/](https://jina.ai/embeddings/)
16. jina-embeddings-v3 - Search Foundation Models, fecha de acceso: abril 11, 2025, [https://jina.ai/models/jina-embeddings-v3/](https://jina.ai/models/jina-embeddings-v3/)
17. README.md - jina-ai/serve - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/jina/blob/master/README.md](https://github.com/jina-ai/jina/blob/master/README.md)
18. Scale Out - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/orchestration/scale-out/](https://jina.ai/serve/concepts/orchestration/scale-out/)
19. Use - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/serving/executor/hub/use-hub-executor/](https://jina.ai/serve/concepts/serving/executor/hub/use-hub-executor/)
20. DocArray support - Jina 3.27.17 documentation - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/docarray-support/](https://jina.ai/serve/docarray-support/)
21. We're Donating DocArray to LF for an Inclusive and Standard Multimodal Data Model - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/news/donate-docarray-lf-for-inclusive-standard-multimodal-data-model/?ref=jina-ai-gmbh.ghost.io](https://jina.ai/news/donate-docarray-lf-for-inclusive-standard-multimodal-data-model/?ref=jina-ai-gmbh.ghost.io)
22. Add Endpoints - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/serving/executor/add-endpoints/](https://jina.ai/serve/concepts/serving/executor/add-endpoints/)
23. A Neural Search and Jina AI. Abstract | by Muhammad Maaz Irfan, fecha de acceso: abril 11, 2025, [https://maazirfan.medium.com/a-neural-search-and-jina-ai-87a1dced853d](https://maazirfan.medium.com/a-neural-search-and-jina-ai-87a1dced853d)
24. Deploy a model - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/tutorials/deploy-model/](https://jina.ai/serve/tutorials/deploy-model/)
25. Flow - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/orchestration/flow/](https://jina.ai/serve/concepts/orchestration/flow/)
26. Client - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/client/](https://jina.ai/serve/concepts/client/)
27. Adding more power to Jina with Kong Gateway | by Deepankar Mahapatro - Medium, fecha de acceso: abril 11, 2025, [https://medium.com/@deepankarm/adding-more-to-jina-with-kong-gateway-336a1f525b63](https://medium.com/@deepankarm/adding-more-to-jina-with-kong-gateway-336a1f525b63)
28. Preliminaries - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/preliminaries/](https://jina.ai/serve/concepts/preliminaries/)
29. Deployment - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/orchestration/deployment/](https://jina.ai/serve/concepts/orchestration/deployment/)
30. Set Up Monitoring for Jina Search Applications | by Shubham Saboo - Medium, fecha de acceso: abril 11, 2025, [https://shubhamsaboo111.medium.com/set-up-monitoring-for-jina-search-applications-f3e49bcbe7ce](https://shubhamsaboo111.medium.com/set-up-monitoring-for-jina-search-applications-f3e49bcbe7ce)
31. Instrumentation - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/orchestration/instrumentation/](https://jina.ai/serve/concepts/orchestration/instrumentation/)
32. An In-Depth Look at Jina AI: 20 Key Features - WPSOLR, fecha de acceso: abril 11, 2025, [https://www.wpsolr.com/an-in-depth-look-at-jina-ai-10-key-features/](https://www.wpsolr.com/an-in-depth-look-at-jina-ai-10-key-features/)
33. Create - Jina 3.27.17 documentation - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/serving/executor/create/](https://jina.ai/serve/concepts/serving/executor/create/)
34. Jina AI MCP Server - Glama, fecha de acceso: abril 11, 2025, [https://glama.ai/mcp/servers/@Sheshiyer/jina-ai-mcp-multimodal-search?locale=en-US](https://glama.ai/mcp/servers/@Sheshiyer/jina-ai-mcp-multimodal-search?locale=en-US)
35. Jina AI For Semantic Search - Restack, fecha de acceso: abril 11, 2025, [https://www.restack.io/p/jina-ai-knowledge-answer-similarity-search-cat-ai](https://www.restack.io/p/jina-ai-knowledge-answer-similarity-search-cat-ai)
36. Tutorial - Retrieval-Augmented Generation (RAG) with Couchbase and Jina AI, fecha de acceso: abril 11, 2025, [https://developer.couchbase.com/tutorial-jina-couchbase-rag](https://developer.couchbase.com/tutorial-jina-couchbase-rag)
37. A Practical Guide to Implementing DeepSearch/DeepResearch - Jina AI, fecha de acceso: abril 11, 2025, [https://jinaai.cn/news/a-practical-guide-to-implementing-deepsearch-deepresearch](https://jinaai.cn/news/a-practical-guide-to-implementing-deepsearch-deepresearch)
38. DeepSearch - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/deepsearch/](https://jina.ai/deepsearch/)
39. jina-ai/node-DeepResearch: Keep searching, reading webpages, reasoning until it finds the answer (or exceeding the token budget) - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/node-DeepResearch](https://github.com/jina-ai/node-DeepResearch)
40. Send & Receive Data - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/client/send-receive-data/](https://jina.ai/serve/concepts/client/send-receive-data/)
41. Jina AI Cloud Hosting - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/jcloud/](https://jina.ai/serve/concepts/jcloud/)
42. Jina V1 Official Documentation. For the latest one, please check out https://docs.jina.ai - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/docs](https://github.com/jina-ai/docs)
43. executors.py - jina-ai/example-audio-search - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/example-audio-search/blob/main/executors.py](https://github.com/jina-ai/example-audio-search/blob/main/executors.py)
44. serve/pyproject.toml at master · jina-ai/serve - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/serve/blob/master/pyproject.toml](https://github.com/jina-ai/serve/blob/master/pyproject.toml)
45. Writing your pyproject.toml - Python Packaging User Guide, fecha de acceso: abril 11, 2025, [https://packaging.python.org/en/latest/guides/writing-pyproject-toml/](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
46. pyproject.toml - simonw/llm-jina-api - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/simonw/llm-jina-api/blob/main/pyproject.toml](https://github.com/simonw/llm-jina-api/blob/main/pyproject.toml)
47. pyproject.toml - jina-ai/late-chunking - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/late-chunking/blob/main/pyproject.toml](https://github.com/jina-ai/late-chunking/blob/main/pyproject.toml)
48. pyproject.toml - jina-ai/thinkgpt - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/thinkgpt/blob/main/pyproject.toml](https://github.com/jina-ai/thinkgpt/blob/main/pyproject.toml)
49. airbyte-source-jina-ai-reader - PyPI, fecha de acceso: abril 11, 2025, [https://pypi.org/project/airbyte-source-jina-ai-reader/0.1.34/](https://pypi.org/project/airbyte-source-jina-ai-reader/0.1.34/)
50. Build a GPU Executor - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/tutorials/gpu-executor/](https://jina.ai/serve/tutorials/gpu-executor/)
51. Beginner's Guide to Jina AI Resources - Restack, fecha de acceso: abril 11, 2025, [https://www.restack.io/p/beginners-guide-answer-jina-ai-resources-cat-ai](https://www.restack.io/p/beginners-guide-answer-jina-ai-resources-cat-ai)
52. jina-flow-example-1.py - GitHub Gist, fecha de acceso: abril 11, 2025, [https://gist.github.com/alexcg1/b9b885788ade655e23cbdada7777949f](https://gist.github.com/alexcg1/b9b885788ade655e23cbdada7777949f)
53. Stress Test in CICD with big datasets · Issue #867 · jina-ai/serve - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/jina/issues/867](https://github.com/jina-ai/jina/issues/867)
54. jina-ai/dalle-flow: A Human-in-the-Loop workflow for creating HD images from text - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/dalle-flow](https://github.com/jina-ai/dalle-flow)
55. Create - Jina 3.27.17 documentation, fecha de acceso: abril 11, 2025, [https://jina.ai/serve/concepts/serving/executor/hub/create-hub-executor/](https://jina.ai/serve/concepts/serving/executor/hub/create-hub-executor/)
56. Flowchart template - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/jina-ai-multimodal-stack-20230720.pdf](https://jina.ai/jina-ai-multimodal-stack-20230720.pdf)
57. Jina - ️ LangChain, fecha de acceso: abril 11, 2025, [https://python.langchain.com/v0.2/docs/integrations/providers/jina/](https://python.langchain.com/v0.2/docs/integrations/providers/jina/)
58. Jina AI - ️ LangChain, fecha de acceso: abril 11, 2025, [https://python.langchain.com/docs/integrations/providers/jina/](https://python.langchain.com/docs/integrations/providers/jina/)
59. Jina Search - ️ LangChain, fecha de acceso: abril 11, 2025, [https://python.langchain.com/docs/integrations/tools/jina_search/](https://python.langchain.com/docs/integrations/tools/jina_search/)
60. jina-embeddings-v2-base-code - Search Foundation Models - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/models/jina-embeddings-v2-base-code/](https://jina.ai/models/jina-embeddings-v2-base-code/)
61. Jina AI - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai](https://github.com/jina-ai)
62. GitHub integration | Grafana Cloud documentation, fecha de acceso: abril 11, 2025, [https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-github/](https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-github/)
63. Layer of Abstraction When Building "Tensorflow" for Search - Han Xiao, fecha de acceso: abril 11, 2025, [https://hanxiao.io/2020/08/02/Layer-of-Abstraction-when-Building-Tensorflow-for-Search/](https://hanxiao.io/2020/08/02/Layer-of-Abstraction-when-Building-Tensorflow-for-Search/)
64. Jina examples and demos to help you get started - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/examples](https://github.com/jina-ai/examples)
65. Jupyter notebook & lab kernel restarting without obvious reason when working with Jina #5863 - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jupyter/notebook/issues/5863](https://github.com/jupyter/notebook/issues/5863)
66. Build Executor (model) UI in Jina · Issue #16 · jina-ai/GSoC - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/GSoC/issues/16](https://github.com/jina-ai/GSoC/issues/16)
67. Support Gateway to Gateway communication · Issue #4556 · jina-ai/serve - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/jina/issues/4556](https://github.com/jina-ai/jina/issues/4556)
68. Jina 3.3 drops, DocArray Dataclasses and more | by Pradeep Sharma | Medium, fecha de acceso: abril 11, 2025, [https://medium.com/jina-ai/this-week-in-jina-ai-c6fcdb9caf99](https://medium.com/jina-ai/this-week-in-jina-ai-c6fcdb9caf99)
69. A Deep Dive into Tokenization - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/news/a-deep-dive-into-tokenization/](https://jina.ai/news/a-deep-dive-into-tokenization/)
70. Beginner's Guide to Jina AI Tutorial - Restack, fecha de acceso: abril 11, 2025, [https://www.restack.io/p/beginners-guide-to-ai-answer-jina-ai-tutorial-2023-cat-ai](https://www.restack.io/p/beginners-guide-to-ai-answer-jina-ai-tutorial-2023-cat-ai)
71. Beginner's Guide to Jina AI | Restackio, fecha de acceso: abril 11, 2025, [https://www.restack.io/p/beginners-guide-answer-jina-ai-cat-ai](https://www.restack.io/p/beginners-guide-answer-jina-ai-cat-ai)
72. Jina AI DocArray - Documentation Overview - YouTube, fecha de acceso: abril 11, 2025, [https://www.youtube.com/watch?v=Ii4uCcjfrgY](https://www.youtube.com/watch?v=Ii4uCcjfrgY)
73. Jina 101: Basic concepts in Jina - YouTube, fecha de acceso: abril 11, 2025, [https://www.youtube.com/watch?v=zvXkQkqd2I8](https://www.youtube.com/watch?v=zvXkQkqd2I8)
74. README.md - jina-ai/executors - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/executors/blob/main/README.md](https://github.com/jina-ai/executors/blob/main/README.md)
75. Reader API - Jina AI, fecha de acceso: abril 11, 2025, [https://jina.ai/reader/](https://jina.ai/reader/)
76. jina-ai/executor-image-preprocessor: An executor that performs standard pre-processing and normalization on images. - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/executor-image-preprocessor](https://github.com/jina-ai/executor-image-preprocessor)
77. Prepare Training Data - Finetuner documentation - Jina AI, fecha de acceso: abril 11, 2025, [https://finetuner.jina.ai/walkthrough/create-training-data/](https://finetuner.jina.ai/walkthrough/create-training-data/)
78. jina-ai/reader: Convert any URL to an LLM-friendly input with a simple prefix https://r.jina.ai - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/reader](https://github.com/jina-ai/reader)
79. jina-ai/dashboard: Interactive UI for analyzing Jina logs, designing Flows and viewing Hub images - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/dashboard](https://github.com/jina-ai/dashboard)
80. jina-ai/discoart: Create Disco Diffusion artworks in one line - GitHub, fecha de acceso: abril 11, 2025, [https://github.com/jina-ai/discoart](https://github.com/jina-ai/discoart)


## 补充相关
+ [开源的阶段性成长指南](https://nsddd.top/zh/posts/stage-growth-of-open-source/)
+ [一份完整的开源贡献指南（提供给第一次踏入开源伙伴秘籍）](https://nsddd.top/zh/posts/open-source-contribution-guidelines/)
+ [我的实践总结：开源社区的规范设计思路](https://nsddd.top/zh/posts/advanced-githook-design/)
+ [在开源社区中学会如何提问](https://nsddd.top/zh/posts/the-art-of-asking-questions-in-open-source-communities/)