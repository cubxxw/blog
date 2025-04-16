---
title: "LLM/AI API 网关市场分析 & 创业团队选型推荐"
date: 2025-04-16T17:36:12+08:00
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


# **LLM/AI API 网关市场分析与创业团队选型推荐**


## **1. 执行摘要**

随着大型语言模型（LLM）和人工智能（AI）应用的蓬勃发展，管理其与应用程序的交互变得日益复杂。传统的 API 网关在处理 LLM 特有的挑战（如基于 Token 的计费、流式响应处理、复杂的安全需求和成本控制）时显得力不从心。因此，专门针对 AI 工作负载设计的 AI API 网关应运而生，成为生产环境中部署和管理 LLM 应用的关键基础设施组件 <sup>1</sup>。

本报告旨在全面分析当前市场上的 LLM/AI API 网关解决方案，涵盖开源和商业两大类别。报告深入探讨了这些网关的实现方式、核心技术栈、云原生适应性以及关键功能特性，特别关注与 LLM/AI 相关的能力，例如模型路由与负载均衡、认证授权、成本控制、缓存机制、安全防护（如 PII 检测）以及与 LangChain/Langfuse 等流行工具的集成情况。

分析显示，市场呈现出两种主要趋势：一类是**从零开始、专为 AI 设计的网关**（如 LiteLLM, Portkey），它们通常能更快地响应 AI 领域的特定需求；另一类是**由成熟的通用 API 网关演进而来的解决方案**（如 Apache APISIX, Kong Gateway, Gloo Gateway），它们 leveraging 现有强大的 API 管理能力，并通过插件或扩展来支持 AI 功能 <sup>2</sup>。

对于资源有限但追求灵活性和快速迭代的创业团队而言，选择合适的 AI 网关至关重要。评估标准应综合考虑功能满足度、成本效益、易用性、社区支持、云原生集成度以及与现有技术栈的兼容性。开源解决方案因其低初始成本、高灵活性和活跃的社区而备受关注 <sup>4</sup>。

综合分析各项因素，**LiteLLM** 被认为是当前最适合 AI 初创团队的选择之一。它提供了广泛的 LLM 供应商支持、与 OpenAI 兼容的统一 API、强大的成本控制和可观测性功能（包括与 Langfuse 的深度集成），拥有活跃的开源社区，并且易于部署和集成到基于 Python 的 AI 开发流程中。当然，选择任何网关都需要考虑其运维复杂性和对特定功能的需求。

未来，AI 网关与传统 API 网关的功能界限预计将逐渐模糊，网关将演变为更智能的 AI 流量编排器 <sup>2</sup>。选择一个具备良好云原生基础和 AI 功能扩展性的网关，将为企业在日益激烈的 AI 竞争中奠定坚实的基础。


## **2. 引言：LLM/AI API 网关的兴起**

大型语言模型（LLM）的广泛应用正在重塑各行各业，但将其有效、安全、经济地集成到生产环境并非易事。传统的 API 网关虽然在管理微服务和 Web 应用流量方面表现出色，但在应对 LLM/AI 特有的挑战时却显得捉襟见肘 <sup>2</sup>。这些挑战主要源于 LLM 与传统 API 在交互模式、计费方式、安全风险和性能要求上的根本差异。

首先，LLM 的**计费通常基于 Token 消耗**，而非传统的按请求次数计费。这意味着网关需要具备精确追踪和控制每个请求 Token 数量的能力，以便进行成本核算和预算管理 <sup>2</sup>。其次，许多 LLM 应用（如实时聊天机器人）采用**流式响应（Server-Sent Events, SSE 或 WebSockets）**，要求网关能够高效处理长连接和分块传输的数据，并进行实时监控，这与传统 API 网关处理原子性请求的模式不同 <sup>2</sup>。

再者，LLM 的交互涉及自然语言，这带来了新的**安全和合规风险**。网关需要具备检查请求（Prompt）和响应内容的能力，以防止**提示注入（Prompt Injection）攻击**、过滤不当或有害内容、以及检测和处理**个人身份信息（PII）**等敏感数据，确保 AI 应用符合安全策略和法规要求 <sup>1</sup>。

此外，企业通常会使用**多个来自不同供应商（如 OpenAI, Azure OpenAI, Anthropic, Google Vertex AI, AWS Bedrock 等）的 LLM**，甚至包括自托管模型。这就要求网关提供**统一的访问接口**，简化开发者的集成工作，并支持基于成本、性能、可用性或特定任务需求进行**智能路由和负载均衡** <sup>3</sup>。最后，为了优化性能和降低成本，**缓存机制**也变得尤为重要，特别是能够理解语义相似性的**语义缓存**，可以显著提高缓存命中率 <sup>6</sup>。

面对这些独特的挑战，**LLM/AI API 网关**应运而生。它是一种专门设计的中间件，充当应用程序与各种 LLM 服务之间的**中央控制平面** <sup>1</sup>。AI 网关不仅继承了传统 API 网关的路由、认证、限流等基本功能，更针对 AI 工作负载进行了扩展和优化，提供了 Token 级监控、精细化成本控制、内容安全防护、多模型管理、语义缓存等 AI 特有能力 <sup>2</sup>。

AI 网关的核心价值在于**将 AI 交互的管理复杂性从应用层下沉到基础设施层** <sup>1</sup>。通过统一管理对 LLM 资源的访问，AI 网关能够确保所有 AI 驱动的应用都符合企业的安全策略、合规要求和成本预算，同时简化开发流程，提高运维效率 <sup>3</sup>。值得注意的是，AI 网关主要关注的是**出站（Egress）流量**，即从企业内部应用流向外部或内部 LLM 服务的流量，这与传统 API 网关主要管理**入站（Ingress）流量**（从外部客户端到内部应用）的焦点有所不同 <sup>3</sup>。这种出站焦点决定了 AI 网关必须具备强大的供应商凭证管理、跨供应商路由、Token 成本追踪以及 Prompt/Response 内容检查等功能。


## **3. 市场格局：主流 LLM/AI API 网关解决方案**

当前的 LLM/AI API 网关市场呈现出多元化的格局，既有专注于 AI 领域的创新项目，也有传统 API 管理巨头扩展其产品线，还有云服务商提供的集成解决方案。根据其来源和商业模式，我们可以将主流解决方案分为开源、商业和云提供商三大类。

**开源 AI 网关**通常由社区驱动或有商业公司支持，提供核心的网关功能，并允许用户自由部署、修改和扩展。它们因其灵活性、低成本和快速创新而受到欢迎，尤其适合需要高度定制化和掌控技术的团队。

**商业 AI 网关**则通常在开源版本（如果存在）的基础上提供增强功能、企业级支持、SLA 保障、更完善的管理界面和额外的安全合规特性。它们适合需要稳定可靠、有专业支持且对安全合规有严格要求的企业。

**云提供商的网关服务**（如 AWS API Gateway, Azure API Management, Cloudflare AI Gateway）则将 AI 网关功能集成到其云平台中，提供便捷的部署和管理体验，并能与其他云服务深度集成。但它们可能在 AI 特定功能的前沿性上略逊于专门的 AI 网关，且存在一定的厂商锁定风险。

下表总结了当前市场上一些主流的、专门用于或常用于 LLM/AI 的 API 网关解决方案：

**表 1: 主流 LLM/AI API 网关概览**


| 网关名称 | 类型 | 主要焦点 | 核心技术基础 | 关键价值主张/差异化 |
|----------|------|----------|--------------|----------------------|
| **LiteLLM** <sup>14</sup> | 开源 | 专为 AI 设计 | Python | 极其广泛的 LLM 支持（100+），统一 OpenAI 格式 API，强大的成本追踪、虚拟密钥和可观测性集成（Langfuse），活跃社区，易于 Python 集成。 |
| **Portkey.ai** <sup>12</sup> | 开源 | 专为 AI 设计 | Node.js/JavaScript (推测) <sup>12</sup> | 极低延迟（声称<1ms），支持多种模型类型，提供回退、负载均衡、语义缓存、内置 Guardrails，与 LangChain 等 Agent 框架良好集成。 |
| **Apache APISIX** <sup>17</sup> | 开源 | 演进的 API 网关 | Nginx / OpenResty (Lua) <sup>17</sup> | 高性能、云原生、平台无关，通过插件系统支持 AI 功能（代理、负载均衡、Token 限流），生态丰富，Apache 基金会支持。 |
| **Kong Gateway** <sup>18</sup> | 开源 | 演进的 API 网关 | Nginx / OpenResty (Lua) <sup>18</sup> | 功能丰富的 API 管理平台，通过插件支持 AI（多 LLM、Prompt Guardrails、PII 清理、RAG），提供 K8s Ingress Controller。 |
| **Gloo/Kgateway** <sup>19</sup> | 开源 | 演进的 API 网关 | Envoy Proxy / Go <sup>19</sup> | 基于 Envoy，云原生设计，支持 Kubernetes Gateway API 标准，提供 API 管理和 AI 网关能力。 |
| **Higress** <sup>20</sup> | 开源 | 演进的 API 网关 | Istio / Envoy Proxy | 基于 Istio/Envoy，云原生，支持 Wasm 插件扩展，提供 AI 网关功能（多模型、可观测性、限流、缓存）和 MCP Server Hosting。 |
| **MagicAPI** <sup>21</sup> | 开源 | 专为 AI 设计 | Rust (Axum/Tokio) | 极高性能和低资源占用（Rust 实现），统一 API 接口，支持主流 AI 提供商和流式传输。 |
| **Dify** <sup>22</sup> | 开源 | LLM 应用开发平台 | Python (推测) | 集成了 LLM 应用开发、API 网关和后端服务能力，提供可视化 Prompt 编辑、数据集管理和应用监控。 |
| **Kong Konnect** <sup>11</sup> | 商业 | 演进的 API 网关 | Kong Gateway (OSS Core) | 提供 Kong Gateway 的企业版功能，包括增强的 AI 能力、管理平台、企业级支持和 SLA。 |
| **API7.ai** <sup>23</sup> | 商业 | 演进的 API 网关 | Apache APISIX (OSS Core) | 提供基于 APISIX 的企业级解决方案，增强的管理界面、多租户、审计、分析、商业插件和企业支持。 |
| **Gloo Platform** <sup>25</sup> | 商业 | 演进的 API 网关 | Gloo/Kgateway (OSS Core) / Envoy | 提供 Gloo Gateway 的企业版功能，可能包括更高级的 AI 集成、安全策略、可观测性和企业支持。 |
| **Cloudflare AI Gateway** <sup>26</sup> | 云提供商 | 专为 AI 设计 (托管) | Cloudflare 托管服务 | 易于集成（一行代码），提供统一的可观测性（日志、指标、成本）、缓存、速率限制，支持主流 AI 提供商和 Workers AI。 |
| **AWS API Gateway** <sup>27</sup> | 云提供商 | 通用 API 网关 | AWS 托管服务 | AWS 生态深度集成，提供 RESTful 和 WebSocket API，具备流量管理、认证、监控等功能，但 AI 特定功能相对较少。 |
| **Azure API Management** <sup>28</sup> | 云提供商 | 通用 API 网关 | Azure 托管服务 | Azure 生态深度集成，提供 API 生命周期管理，可通过策略实现部分 AI 网关功能（如示例中的 PII 检测、路由）。 |
| **IBM API Connect AI Gateway** <sup>29</sup> | 商业 | 演进的 API 网关 | IBM API Connect | 提供对公共和私有 AI 服务 API 的集中控制、安全连接、策略管理、成本限制、缓存和分析洞察。 |
| **TrueFoundry** <sup>10</sup> | 商业 | MLOps/AI 平台 | 托管服务 | 作为 MLOps 平台的一部分提供 LLM 网关功能，强调统一访问、密钥管理、访问控制、模型部署和监控。 |
| **Traefik AI Gateway** <sup>13</sup> | 商业 | 演进的 API 网关 | Traefik Proxy | 将 AI 功能集成到 Traefik 平台，提供 AI 模型部署、生命周期管理、数据预处理、安全和 CI/CD 集成。 |
| **TrustGate** <sup>1</sup> | 开源 (似乎不活跃) | 专为 AI 设计 | (未知) | 早期提出的专为 AI 工作负载设计的网关概念，强调高性能和 AI 特定优化，但 GitHub 仓库似乎不再活跃。 |


市场分析揭示了一个关键现象：**市场正经历分化与融合并存的阶段**。一方面，像 LiteLLM 和 Portkey 这样专注于 AI 的开源项目，凭借其敏捷性和对 AI 需求的深刻理解，在功能创新上往往走在前列 <sup>12</sup>。另一方面，Kong、APISIX、Gloo 等成熟的 API 管理供应商，正在利用其坚实的网关基础设施，通过插件或扩展模块的方式，将 AI 功能整合进其平台 <sup>11</sup>。云服务商则提供了便捷的集成选项，但可能在专业 AI 功能的深度和广度上有所取舍 <sup>26</sup>。

同时，"AI 网关" 的定义本身也存在一定的**模糊性**。一些解决方案，如 Portkey 和 LiteLLM，旨在提供一个包含可观测性、高级路由、缓存、安全防护等功能的**综合性平台** <sup>12</sup>。而另一些可能更侧重于**基础的代理和路由功能**，作为连接应用和 LLM 的简单桥梁 <sup>32</sup>。还有一些则是在强大的 API 管理平台之上，通过**插件化**的方式添加 AI 能力 <sup>11</sup>。这种差异意味着用户在选择时，必须仔细评估其具体需求，明确所需的功能范围是基础代理，还是全面的 AI 流量管理平台。


## **4. 架构深入探讨：实现策略与云原生适应性**

LLM/AI API 网关的实现方式多种多样，反映了不同的设计哲学和技术选型。理解这些架构差异及其云原生特性，对于选择符合特定需求的解决方案至关重要。

**两种核心架构哲学：**



1. **专为 AI 设计 (Purpose-Built)：** 这类网关（如 LiteLLM, Portkey, MagicAPI）从一开始就将 AI/LLM 的独特需求置于核心位置 <sup>1</sup>。它们通常优先实现 Token 级控制、多模型统一 API、语义缓存、AI 特定安全防护等功能。其优势在于对 AI 工作流的深度优化和快速的功能迭代。然而，它们可能在通用的 API 管理功能（如复杂的流量整形、协议转换）或生态系统集成方面，相较于成熟的通用网关起步较晚。
2. **演进的 API 网关 (Evolved API Gateway)：** 这类网关（如 Apache APISIX, Kong Gateway, Gloo/Kgateway, Higress）基于成熟的通用 API 网关技术构建 <sup>2</sup>。它们 leveraging 现有强大的网络代理能力、丰富的插件生态和企业级特性，通过添加 AI 相关插件或模块来扩展功能 <sup>17</sup>。其优势在于继承了底层代理（如 Envoy, Nginx）久经考验的性能、稳定性和广泛的通用 API 管理能力。但 AI 功能可能是后续添加的，集成深度和易用性可能不如专为 AI 设计的方案。

**底层技术栈分析：**



* **Envoy Proxy:** Gloo/Kgateway 和 Higress 等网关基于 Envoy 构建 <sup>19</sup>。Envoy 是一个高性能、云原生的 L7 代理和通信总线，以其可扩展性、强大的 API 和动态配置能力而闻名。基于 Envoy 的网关天然具备优秀的云原生特性。
* **Nginx / OpenResty (Lua):** Apache APISIX 和 Kong Gateway 的核心基于 Nginx 或其增强版 OpenResty，并大量使用 Lua 进行扩展 <sup>17</sup>。Nginx 以其高性能、稳定性和低资源消耗著称。Lua 提供了在 Nginx 请求处理阶段进行灵活编程的能力。
* **Python:** LiteLLM 主要使用 Python 构建 <sup>15</sup>。Python 在 AI/ML 领域拥有极其丰富的生态系统和庞大的开发者社区，使得集成 AI 相关库和开发特定功能更为便捷，但可能在纯粹的代理性能和并发处理上相较于 C/Go/Rust 实现有一定差距。
* **Go:** Tyk 和 KrakenD 使用 Go 语言 <sup>34</sup>。Go 语言以其出色的并发性能、高效的内存管理和简洁的语法，成为构建高性能网络服务的热门选择。Gloo/Kgateway 的控制平面也主要使用 Go <sup>19</sup>。
* **Rust:** MagicAPI 使用 Rust 构建 <sup>21</sup>。Rust 以其内存安全、零成本抽象和极致性能而闻名，特别适合构建对延迟和资源消耗极其敏感的高性能系统。
* **Node.js / JavaScript:** Portkey 的部署方式暗示其可能使用 Node.js <sup>12</sup>。JavaScript/Node.js 拥有庞大的生态系统和异步 I/O 模型，适合快速开发网络应用。Express Gateway 也是基于 Node.js <sup>34</sup>。

底层技术的选择直接影响网关的性能特征、资源占用、可扩展性以及开发团队的定制和贡献门槛。例如，基于 Envoy 或 Nginx 的网关继承了成熟的底层代理能力，但在 AI 功能定制上可能需要特定的插件开发技能（如 Lua 或 C++ filter for Envoy）。而基于 Python 的网关则更容易与 AI 生态集成，但可能需要更多关注性能优化。Rust 或 Go 实现则有望在性能和资源效率上取得平衡。

**云原生适应性评估：**

真正的云原生不仅仅意味着能在 Docker 中运行，更关键的是与 Kubernetes 生态系统的深度集成。成熟的云原生 AI 网关应具备以下特征：



* **容器化部署:** 提供官方 Docker 镜像，支持通过 Docker Compose 或容器平台部署 <sup>12</sup>。
* **Kubernetes 集成:**
    * **Helm Charts:** 提供官方 Helm chart，简化在 Kubernetes 上的部署和配置管理 <sup>35</sup>。
    * **Kubernetes Ingress Controller:** 作为 Ingress Controller 运行，管理集群的入口流量，尽管这正逐渐被 Gateway API 取代 <sup>17</sup>。
    * **Kubernetes Gateway API 支持:** 这是衡量现代 Kubernetes 网关成熟度的关键指标。Gateway API 提供了比 Ingress 更丰富、更灵活、面向角色的 API 模型来管理网关资源 <sup>43</sup>。明确支持 Gateway API 的网关（如 Gloo/Kgateway <sup>19</sup>, APISIX <sup>43</sup>, Higress <sup>20</sup>）展现了其对 Kubernetes 标准的遵循和未来发展方向的把握。
    * **Kubernetes Operator:** 提供 Operator 模式来自动化网关的安装、升级、配置和生命周期管理，极大地降低了运维复杂性 <sup>45</sup>。Kong <sup>45</sup> 和可能的 Gloo (通过 Gloo Platform) <sup>41</sup> 提供了 Operator 支持。
* **服务网格集成:** 能够与 Istio, Linkerd 等服务网格良好集成，统一管理南北向（Ingress/Egress）和东西向（服务间）流量 <sup>20</sup>。
* **动态配置:** 支持通过 Kubernetes API 或其他控制平面动态更新路由、策略等配置，无需重启网关实例。

评估显示，基于 Envoy (Gloo/Kgateway, Higress) 和 Nginx (APISIX, Kong) 的网关通常拥有较成熟的云原生支持，包括 Ingress Controller、Helm Charts，并且正在积极拥抱 Gateway API 和 Operator 模式。专为 AI 设计的开源网关（LiteLLM, Portkey）虽然也提供容器化和 Helm 支持，但在 Gateway API 和 Operator 等更深层次的 Kubernetes 集成方面可能仍在发展中，但其部署方式（如 Render, Railway, Cloudflare Workers <sup>12</sup>）也体现了对现代云部署模式的适应。对于追求深度 Kubernetes 集成和自动化运维的团队，选择支持 Gateway API 和 Operator 的解决方案将更具长远价值。


## **5. 功能分析：面向 AI 工作负载的关键能力对比**

选择 AI 网关的核心在于其功能集是否能有效解决 LLM 应用带来的独特挑战。本节将详细对比主流网关在几个关键 AI 相关功能领域的表现。

**5.1 统一访问与模型路由/负载均衡**



* **需求:** 开发者需要一个统一的 API 接口来访问不同供应商（OpenAI, Azure, Bedrock, Anthropic, Cohere, Google Vertex AI, HuggingFace, Replicate, Groq 等）的多种模型，并能轻松切换，无需修改应用代码 <sup>10</sup>。网关应支持灵活的路由策略，如基于模型名称、版本、成本、延迟或特定请求内容进行路由，并提供负载均衡（如轮询、加权）和故障切换（Fallbacks）机制以提高可靠性 <sup>8</sup>。
* **能力对比:**
    * **LiteLLM:** 强项。支持超过 100 种 LLM API，提供统一的 OpenAI 格式接口 <sup>14</sup>。支持模型别名、回退逻辑（跨 Azure/OpenAI 等部署）、基于权重的负载均衡和条件路由 <sup>15</sup>。
    * **Portkey.ai:** 强项。支持超过 250 种 LLM 及多种模态模型 <sup>12</sup>。提供统一 API，支持自动回退、基于权重的负载均衡和条件路由 <sup>12</sup>。
    * **Apache APISIX:** 支持。通过 AI 插件提供 AI 代理和多 LLM 负载均衡能力 <sup>8</sup>。支持动态上游和多种负载均衡算法。
    * **Kong Gateway:** 支持。通过 AI 插件提供统一接口，支持切换不同 AI 提供商 <sup>11</sup>。支持动态负载均衡和健康检查。
    * **Gloo/Kgateway:** 支持。作为 AI 网关，可管理到 LLM 提供商的流量 <sup>19</sup>。支持基于 Envoy 的高级路由和负载均衡。
    * **Higress:** 支持。连接国内外主流模型提供商，支持统一协议，提供多模型负载均衡/回退 <sup>20</sup>。
    * **Cloudflare AI Gateway:** 支持。统一 OpenAI, Anthropic, Hugging Face, Workers AI 等提供商 <sup>26</sup>。支持模型回退 <sup>26</sup>。

**5.2 认证、授权与凭证管理**



* **需求:** 安全地管理和轮换访问各个 LLM 提供商所需的 API 密钥，避免在应用代码中硬编码 <sup>9</sup>。提供虚拟 API 密钥，将用户/团队与具体的提供商密钥解耦，便于权限控制和成本追踪 <sup>12</sup>。集成企业现有的认证/授权系统（如 OAuth, JWT, SSO）进行访问控制，并实现基于角色的访问控制（RBAC）来管理对网关和模型的访问权限 <sup>3</sup>。
* **能力对比:**
    * **LiteLLM:** 强项。支持虚拟密钥、预算和团队管理，可将成本归因到密钥/用户/团队 <sup>14</sup>。支持 JWT 认证、SSO、审计日志（企业版）<sup>14</sup>。
    * **Portkey.ai:** 强项。提供虚拟密钥管理，支持 RBAC <sup>12</sup>。强调安全密钥管理 <sup>12</sup>。
    * **Apache APISIX:** 强项。支持多种认证插件（key-auth, JWT, basic-auth, OAuth2, OIDC, LDAP 等）和 RBAC <sup>17</sup>。
    * **Kong Gateway:** 强项。支持多种认证插件（key-auth, JWT, basic-auth, OAuth2, ACL 等）<sup>18</sup>。企业版提供更高级的 RBAC 和安全功能。
    * **Gloo/Kgateway:** 支持。利用 Envoy 的能力和自身扩展，支持 JWT, OAuth, OIDC, API Key 等认证，并可集成外部认证服务 <sup>19</sup>。
    * **Cloudflare AI Gateway:** 基本。主要通过 Cloudflare 平台进行访问控制，具体细节未详述 <sup>26</sup>。
    * **商业/云平台 (API7, Kong Konnect, IBM, Azure 等):** 通常提供更完善的企业级认证集成（SSO, LDAP）和精细化 RBAC <sup>3</sup>。

**5.3 成本控制（Token 限流、配额、预算）**



* **需求:** 实现基于 Token 数量（而非请求数）的速率限制（RPM/TPM）和配额管理，以精确控制对昂贵 LLM API 的调用成本 <sup>1</sup>。支持设置用户/密钥/模型的预算，并在接近或达到预算时进行告警或阻止请求 <sup>14</sup>。提供清晰的 Token 消耗视图，便于成本分析和优化 <sup>7</sup>。
* **能力对比:**
    * **LiteLLM:** 强项。支持按项目/API 密钥/模型设置预算和速率限制（RPM/TPM）<sup>14</sup>。自动跨提供商追踪支出 <sup>14</sup>。
    * **Portkey.ai:** 支持。提供成本管理功能，包括使用情况分析 <sup>12</sup>。具体 Token 限流细节未详述，但目标是成本控制。
    * **Apache APISIX:** 支持。可通过插件实现 Token 级限流 (limit-req 等插件可扩展) <sup>2</sup>。需要自定义逻辑或特定插件。
    * **Kong Gateway:** 支持。提供速率限制插件，可扩展支持 Token 级限制 <sup>11</sup>。AI 网关特性中包含 Token 使用追踪 <sup>11</sup>。
    * **Gloo/Kgateway:** 支持。支持基于 Token 加权的速率限制 <sup>19</sup>。提供消耗控制和可见性 <sup>25</sup>。
    * **Cloudflare AI Gateway:** 支持。提供速率限制和成本监控功能 <sup>26</sup>。
    * **商业/云平台:** 通常提供更精细的成本控制和分析仪表板 <sup>11</sup>。

**5.4 性能优化（缓存策略）**



* **需求:** 通过缓存 LLM 的响应来减少对后端模型的调用，从而降低延迟和成本 <sup>6</sup>。支持**简单/精确匹配缓存**（针对完全相同的请求）和**语义缓存**（基于向量相似度匹配语义相似的请求）<sup>10</sup>。提供灵活的缓存配置（如 TTL）和对常用缓存后端（如 Redis）的支持 <sup>55</sup>。
* **能力对比:**
    * **LiteLLM:** 支持。支持 Redis 缓存，包括精确匹配和语义缓存（使用 redis-semantic 类型，需配置嵌入模型）<sup>55</sup>。
    * **Portkey.ai:** 支持。明确支持简单缓存和语义缓存模式，可通过网关配置启用 <sup>12</sup>。
    * **Apache APISIX:** 支持精确缓存。提供 proxy-cache 插件支持基于磁盘的精确匹配缓存 <sup>57</sup>。语义缓存需要自定义插件或集成外部服务。
    * **Kong Gateway:** 支持。提供 ai-semantic-cache 插件，同时支持精确缓存和语义缓存（需要向量数据库支持）<sup>11</sup>。
    * **Gloo/Kgateway:** 支持语义缓存。通过配置（RouteOption）和 Redis 后端实现语义缓存 <sup>25</sup>。
    * **Cloudflare AI Gateway:** 支持精确缓存。目前仅支持相同请求的缓存，计划未来添加语义搜索 <sup>26</sup>。
    * **IBM API Connect:** 支持缓存 AI 响应 <sup>29</sup>。未明确缓存类型。

语义缓存是 AI 网关的一个显著优势，因为它能更好地处理自然语言输入的多样性。然而，实现语义缓存需要额外的基础设施（嵌入模型、向量数据库）和计算资源 <sup>54</sup>，因此并非所有网关都提供或以相同方式提供此功能。精确缓存虽然简单，但对 LLM 场景的有效性有限 <sup>54</sup>。

**5.5 安全与合规（Guardrails）**



* **需求:** 提供输入（Prompt）和输出（Response）的验证和防护机制（Guardrails）<sup>1</sup>。检测并阻止恶意输入，如**提示注入** <sup>1</sup>。过滤或标记**有害、不当或偏离主题**的内容 <sup>1</sup>。检测并处理（编辑、屏蔽、替换）**个人身份信息（PII）或其他敏感数据，满足 GDPR、HIPAA 等合规要求 **<sup>9</sup>**。支持基于正则表达式**或**关键字列表**的自定义规则 <sup>60</sup>。允许集成第三方安全服务或自定义 Webhook <sup>12</sup>。
* **能力对比:**
    * **LiteLLM:** 支持。提供 Guardrails 功能，可集成自定义逻辑或第三方工具 <sup>14</sup>。PII 检测通常依赖集成（如 Presidio <sup>64</sup>）。
    * **Portkey.ai:** 强项。提供丰富的内置 Guardrails（40+），包括 PII 检测、PHI 检测、内容审核、Regex 匹配、代码检测等，并支持自定义 Webhook 和合作伙伴集成（Pangea, Pillar 等）<sup>12</sup>。Guardrails 可应用于聊天和嵌入请求 <sup>62</sup>。
    * **Apache APISIX:** 基本。可通过插件（如 limit-req, uri-blocker）实现部分控制。高级 Guardrails（PII, 内容审核）需要自定义 Lua 插件或集成外部服务 <sup>64</sup>。
    * **Kong Gateway:** 强项。提供 ai-prompt-guard 插件（基于 Regex 的允许/拒绝列表）<sup>63</sup> 和 PII 清理插件（支持 20+ PII 类别，12 种语言，可自托管容器，支持响应重插）<sup>11</sup>。
    * **Gloo/Kgateway:** 支持。提供 Prompt Guardrails，可用于请求和响应，支持 Regex 匹配以阻止或编辑内容（如 PII 替换）<sup>25</sup>。
    * **Higress:** 支持。提供 AI 网关能力，暗示包含安全防护，但具体 Guardrails 细节未详述 <sup>20</sup>。
    * **商业/云平台 (Databricks AI Gateway, Dataiku):** 通常提供内置的 PII 检测、内容过滤和自定义规则功能 <sup>60</sup>。AWS Bedrock Guardrails 提供 PII 过滤和屏蔽 <sup>61</sup>。

安全 Guardrails 正从“锦上添花”变为“必备功能”，因为它们是确保 AI 应用安全、合规运行的关键防线。特别是 PII 处理和提示注入防护，对于处理用户数据或面向公众的应用至关重要。

**5.6 可观测性与监控**



* **需求:** 记录详细的请求/响应日志，包括 Prompt、模型信息、Token 数量、延迟、成本和错误 <sup>7</sup>。与分布式追踪系统（如 OpenTelemetry, Zipkin, Jaeger）集成，以便在复杂系统中追踪请求链路 <sup>2</sup>。提供关键性能指标（Metrics）并能接入监控系统（如 Prometheus, Grafana, Datadog）<sup>2</sup>。提供可视化仪表板（Dashboard）便于监控和分析 <sup>11</sup>。与专门的 LLM 可观测性工具（如 Langfuse, Helicone, PromptLayer）集成，以获得更深入的 AI 特定洞察 <sup>14</sup>。
* **能力对比:**
    * **LiteLLM:** 强项。支持将日志和指标发送到多种目标，包括 Langfuse, Langsmith, OpenTelemetry (OTEL), Prometheus, S3, Elasticsearch 等 <sup>14</sup>。提供与 Langfuse 的深度集成示例 <sup>70</sup>。
    * **Portkey.ai:** 强项。提供详细的日志记录、请求追踪、使用情况分析（请求量、延迟、成本、错误率）和自定义标签 <sup>12</sup>。支持与 Langfuse 集成 <sup>12</sup>。
    * **Apache APISIX:** 强项。支持 OpenTelemetry <sup>17</sup>、Zipkin、SkyWalking 追踪。支持 Prometheus 指标导出。支持多种外部日志记录器 <sup>17</sup>。可通过插件或 API 调用与 Langfuse 集成 <sup>72</sup>。
    * **Kong Gateway:** 强项。支持 OpenTelemetry (OTLP) <sup>11</sup>、Zipkin、Jaeger 追踪。支持 Prometheus, StatsD 指标。提供丰富的日志插件。可通过插件或 API 调用与 Langfuse 集成 <sup>73</sup>。AI 网关特性包含 AI 指标和可观测性 <sup>11</sup>。
    * **Gloo/Kgateway:** 强项。基于 Envoy，继承其强大的可观测性能力。支持 OpenTelemetry <sup>31</sup>、Prometheus 指标、访问日志。Gloo Platform 提供 UI 和更高级的洞察 <sup>25</sup>。Langfuse 集成可能需要自定义或通过 OTEL。
    * **Cloudflare AI Gateway:** 支持。提供日志、指标（Token 使用、成本、错误）、统一仪表板 <sup>26</sup>。
    * **Langfuse:** 本身是 LLM 可观测性平台，不作为网关，但强调与网关（特别是 LiteLLM）的集成，并指出其异步观测不增加延迟的优势 <sup>69</sup>。

对于 LLM 应用，仅有传统的可观测性（日志、指标、追踪）可能不够。与 Langfuse 等专用工具的集成，可以提供更丰富的上下文信息，如 Prompt/Response 对、用户反馈、多步调用的 Trace 视图，这对于调试和优化 LLM 应用至关重要。支持 OpenTelemetry 是一个加分项，因为它提供了标准化的数据导出方式，但可能需要额外配置才能捕获 Langfuse 所提供的 LLM 特定细节。

**5.7 生态系统集成（LangChain, LangGraph, LlamaIndex 等）**



* **需求:** 与流行的 LLM 应用开发和编排框架（如 LangChain, LangGraph, LlamaIndex）以及 Agent 框架（如 AutoGen, CrewAI）无缝集成 <sup>12</sup>。提供简单易用的方式在这些框架中使用网关，例如通过配置 API Base URL 或提供专门的集成类/回调 <sup>15</sup>。
* **能力对比:**
    * **LiteLLM:** 强项。明确支持 LangChain (Python/JS) <sup>15</sup>。其 OpenAI 兼容接口使其易于在任何支持 OpenAI API 的框架中使用 <sup>14</sup>。提供与 Langfuse 集成的 LangChain 示例 <sup>70</sup>。
    * **Portkey.ai:** 强项。明确支持 LangChain, LlamaIndex, Autogen, CrewAI 等 Agent 框架 <sup>12</sup>。提供 LlamaIndex 集成示例 <sup>51</sup>。
    * **Apache APISIX:** 支持。其 OpenAI 兼容性（通过插件）应使其能与 LangChain 等框架集成。社区可能有相关实践。
    * **Kong Gateway:** 支持。其 OpenAI 兼容性（通过插件）和原生 SDK 支持 <sup>50</sup> 应使其能与 LangChain 等框架集成。
    * **Gloo/Kgateway:** 支持。可以通过配置框架指向网关端点来集成。
    * **Cloudflare AI Gateway:** 支持。可以通过配置框架指向网关端点来集成 <sup>26</sup>。
    * **Higress:** 支持 MCP (Model Context Protocol) Server Hosting <sup>20</sup>，这表明其对 AI Agent 和工具调用的支持，可能简化与相关框架的集成。

对于大量使用 LangChain 或类似框架的团队来说，网关的易集成性是一个重要的生产力因素。提供 OpenAI 兼容接口的网关（LiteLLM, Portkey, APISIX/Kong 插件）通常能较好地满足这一需求。

**表 2: 主流 AI 网关功能对比矩阵 (示意)**
| 功能类别 | 具体特性 | LiteLLM | Portkey | APISIX | Kong | Gloo/Kgateway | Cloudflare |
|----------|----------|---------|---------|--------|------|---------------|------------|
| **统一访问** | 多 LLM 支持 (数量) | 100+ | 250+ | 通过插件 | 通过插件 | 通过配置 | 主要几家 |
|  | OpenAI 兼容 API | ✅ (核心) | ✅ (核心) | ✅ (插件) | ✅ (插件) | ✅ (配置) | ✅ (配置) |
| **路由/负载均衡** | 智能路由 (成本/性能) | ✅ (条件路由) | ✅ (条件路由) | ✅ (插件/规则) | ✅ (插件/规则) | ✅ (Envoy 规则) | 否 |
|  | 回退 (Fallback) | ✅ | ✅ | ✅ (插件) | ✅ (插件) | ✅ (Envoy 规则) | ✅ |
|  | 负载均衡 (加权等) | ✅ | ✅ | ✅ | ✅ | ✅ | 否 |
| **认证/授权** | 虚拟密钥 | ✅ | ✅ | 否 (需自定义) | 否 (需自定义) | 否 (需自定义) | 否 |
|  | 提供商密钥管理 | ✅ (中心化) | ✅ (中心化) | ✅ (插件/Vault) | ✅ (插件/Vault) | ✅ (K8s Secret/Vault) | ✅ (平台管理) |
|  | RBAC | ✅ (企业版) | ✅ | ✅ (插件) | ✅ (企业版) | ✅ (平台/集成) | ✅ (平台) |
|  | 企业认证 (OAuth/SSO) | ✅ (企业版) | ✅ (企业版) | ✅ (插件) | ✅ (企业版) | ✅ (平台/集成) | ✅ (平台) |
| **成本控制** | Token 级限流 | ✅ | ✅ (推测) | ✅ (插件/扩展) | ✅ (插件/扩展) | ✅ | ✅ |
|  | 预算/配额管理 | ✅ | ✅ (分析) | 否 (需自定义) | ✅ (企业版/分析) | ✅ (分析) | ✅ (分析) |
|  | Token 成本追踪 | ✅ | ✅ | ✅ (插件/日志) | ✅ (插件/日志) | ✅ (日志/指标) | ✅ |
| **缓存** | 精确匹配缓存 | ✅ (Redis) | ✅ | ✅ (磁盘) | ✅ (插件) | ✅ (Redis) | ✅ |
|  | 语义缓存 | ✅ (Redis) | ✅ | 否 (需自定义) | ✅ (插件+向量库) | ✅ (Redis) | 否 (计划中) |
| **安全 Guardrails** | 输入/输出验证 | ✅ (基础/集成) | ✅ (内置丰富) | ✅ (插件/自定义) | ✅ (插件) | ✅ (Prompt Guard) | 否 |
|  | PII 检测/处理 | 否 (需集成) | ✅ (内置) | 否 (需自定义) | ✅ (插件) | ✅ (Prompt Guard Regex) | 否 |
|  | 内容审核 (Toxicity) | 否 (需集成) | ✅ (内置/集成) | 否 (需自定义) | ✅ (插件/集成) | 否 (需自定义) | 否 |
|  | Prompt Injection 防护 | 否 (需自定义) | ✅ (部分/集成) | 否 (需自定义) | ✅ (Prompt Guard) | ✅ (Prompt Guard) | 否 |
|  | 自定义规则 (Regex/Webhook) | ✅ (集成/自定义) | ✅ | ✅ (插件/Lua) | ✅ (Prompt Guard) | ✅ (Prompt Guard) | 否 |
| **可观测性** | 详细日志 (含 Prompt) | ✅ | ✅ | ✅ (可配置) | ✅ (可配置) | ✅ (Envoy 日志) | ✅ |
|  | OpenTelemetry | ✅ | ✅ (推测/集成) | ✅ (插件) | ✅ (插件) | ✅ (原生) | 否 |
|  | Prometheus 指标 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (平台指标) |
|  | Langfuse 集成 | ✅ (原生/推荐) | ✅ (支持) | ✅ (通过 API/OTEL) | ✅ (通过 API/OTEL) | ✅ (通过 OTEL) | 否 |
| **生态集成** | LangChain/LlamaIndex | ✅ (推荐) | ✅ (推荐) | ✅ (兼容) | ✅ (兼容) | ✅ (兼容) | ✅ (兼容) |
|  | Agent 框架支持 | ✅ (通用) | ✅ (明确支持) | ✅ (通用) | ✅ (通用) | ✅ (通用) | ✅ (通用) |
| **云原生** | K8s Gateway API | 否 | 否 | ✅ | ✅ (Operator 支持) | ✅ (核心) | N/A |
|  | K8s Operator | 否 | 否 (企业版?) | ✅ (Ingress) | ✅ | ✅ (Gloo Platform) | N/A |
|  | Helm Chart | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |


*注：此表为示意性总结，具体功能的完善程度和实现方式可能有所不同，"✅" 表示支持，"否" 表示未明确支持或需要大量自定义，"(插件)" 表示通过插件实现，"(企业版)" 表示主要在商业版本提供。*


## **6. 开源 vs. 商业：战略考量**

在选择 LLM/AI API 网关时，开源与商业模式的选择是一个关键的战略决策，尤其对 AI 工作负载而言，其影响更为深远。

**开源 AI 网关的优势：**



1. **成本效益:** 最显著的优势是通常没有前期软件许可费用 <sup>4</sup>。这对于预算有限的初创公司或处于实验阶段的项目极具吸引力。虽然仍需考虑托管、运维和可能的内部开发成本，但初始投入较低。
2. **灵活性与定制化:** 开源软件允许用户访问和修改源代码，提供了无与伦比的灵活性 <sup>4</sup>。在快速发展的 AI 领域，模型、框架和最佳实践不断变化，这种灵活性使团队能够快速适应，集成新的 LLM 提供商，或根据特定需求定制功能（如特殊的路由逻辑、自定义 Guardrails）。
3. **避免厂商锁定:** 使用开源解决方案可以降低对特定供应商的依赖，保留未来更换技术栈或供应商的选择权 <sup>5</sup>。
4. **社区支持与创新:** 活跃的开源社区（如 LiteLLM, Portkey, APISIX）是宝贵的资源，可以提供问题解决方案、共享最佳实践，并共同推动项目发展 <sup>12</sup>。社区驱动的创新往往能更快地响应新兴的 AI 需求。
5. **透明度:** 源代码开放意味着更高的透明度，用户可以审查代码以确保安全性和理解其工作原理。

**开源 AI 网关的挑战：**



1. **运维成本与专业知识:** 虽然软件本身免费，但部署、配置、监控、维护和升级开源网关需要相应的 DevOps 和基础设施专业知识 <sup>4</sup>。对于缺乏相关经验的团队来说，这可能是一笔不小的隐性成本。
2. **支持的可靠性:** 开源项目主要依赖社区支持（论坛、邮件列表、GitHub Issues），响应时间和问题解决质量可能无法得到保证，这对于生产环境中的关键任务可能存在风险 <sup>4</sup>。
3. **安全更新与合规:** 安全补丁的发布速度和覆盖范围可能依赖于社区贡献者的活跃度。虽然许多大型开源项目有专门的安全团队，但响应速度可能不如商业供应商。获得官方的合规认证（如 SOC 2, HIPAA）通常需要商业支持 <sup>4</sup>。
4. **功能完整性与易用性:** 虽然核心功能强大，但某些高级功能、用户友好的管理界面或企业级特性（如精细化审计、SSO 集成）可能需要商业版本或自行开发 <sup>12</sup>。
5. **许可风险 (特定项目):** 对于由单一商业公司主导的开源项目，存在未来更改许可模式的风险，可能影响其后续使用（如 <sup>5</sup> 中提到的 Redis 和 Elasticsearch 的例子）。选择由中立基金会（如 Apache, CNCF）管理的项目（如 APISIX, Envoy/Kgateway）可以降低这种风险 <sup>5</sup>。

**商业 AI 网关的优势：**



1. **企业级支持与 SLA:** 商业供应商通常提供专业的 24/7 技术支持、服务水平协议（SLA）保障，确保关键业务的稳定运行 <sup>4</sup>。
2. **增强的功能与易用性:** 商业版本通常包含更多开箱即用的高级功能、优化的性能、更完善的管理控制台和更简化的用户体验 <sup>12</sup>。
3. **安全与合规保障:** 商业供应商通常会投入更多资源进行安全审计、及时发布安全补丁，并提供官方的合规认证，降低企业的风险暴露 <sup>4</sup>。
4. **托管服务选项:** 许多商业供应商提供完全托管的 SaaS 或 PaaS 选项，进一步减轻用户的运维负担 <sup>26</sup>。

**商业 AI 网关的挑战：**



1. **成本:** 商业许可费用（通常基于订阅、使用量或节点数）可能相当高昂，尤其对于大规模部署或高流量场景 <sup>4</sup>。定价模型可能随时间变化，带来成本不可预测性 <sup>5</sup>。
2. **灵活性受限:** 定制化能力通常不如开源版本，用户可能受限于供应商提供的功能和配置选项 <sup>4</sup>。
3. **厂商锁定:** 选择商业解决方案可能导致对特定供应商的技术和生态系统的深度绑定，增加未来迁移的难度和成本 <sup>5</sup>。
4. **创新速度:** 相较于灵活的开源社区，商业产品的版本发布周期可能更长，对最新 AI 趋势的响应可能稍慢。

混合模式：

许多解决方案（如 LiteLLM, Portkey, APISIX/API7, Kong）采用开源核心加商业增强版的模式 12。这种模式允许用户从开源版本起步，享受其灵活性和低成本，并在需要企业级支持、高级功能或托管服务时，平滑升级到商业版本。这为企业提供了一条兼顾成本、灵活性和长期发展需求的路径 4。

**结论：** 对于 AI 工作负载，开源网关在快速适应变化、提供前沿 AI 功能和成本控制方面具有优势，特别适合技术能力强、需要高度灵活性的团队。商业网关则在支持、稳定性和安全合规方面更胜一筹，适合对风险容忍度低、需要可靠保障的企业。混合模式提供了一个有吸引力的中间地带。选择应基于团队的技术实力、预算、风险偏好、对特定功能的需求以及长期战略。


## **7. 未来展望：演进中的 AI 网关版图**

LLM/AI API 网关领域正处于快速发展阶段，其功能、形态和市场格局都在不断演变。展望未来，几个关键趋势将塑造这一领域的发展方向。

**趋势一：API 网关与 AI 网关的融合**

目前市场上存在专为 AI 设计的网关和由传统 API 网关演进的解决方案。未来，这两者的界限将越来越模糊 <sup>2</sup>。随着 AI 在应用中变得无处不在（例如，电商搜索、客户服务），几乎所有 API 网关都需要具备处理 AI 流量的基本能力，如 Token 计量、基本的内容安全检查和对常见 AI 服务提供商的路由支持。成熟的 API 网关供应商（如 Kong, APISIX, Gloo）正积极将其平台扩展为“AI 就绪”，通过插件或核心功能集成来满足这些需求 <sup>11</sup>。从长远来看，维护独立的 AI 网关和非 AI 网关会增加运营开销和复杂性 <sup>2</sup>。因此，具备统一管理 REST, GraphQL, gRPC 以及 AI API 流量能力的**融合型网关平台**将成为主流。

然而，这并不意味着专用的 AI 网关会完全消失。在处理高度复杂或前沿的 AI 工作负载（如复杂的 Agent 协作、实时多模态处理、精密的 RAG 优化）方面，专注于 AI 的解决方案可能继续保持其创新优势和深度优化能力 <sup>8</sup>。它们可能会更快地采用新的 AI 协议或集成新兴的 AI 工具。

**趋势二：网关成为智能 AI 编排层**

AI 网关的角色正在从简单的流量代理和策略执行点，演变为更智能的**AI 流量编排器** <sup>2</sup>。未来的网关可能不仅仅是路由请求，还会更主动地参与到 AI 工作流中：



* **自动化 RAG:** 网关可以直接处理部分 RAG（Retrieval-Augmented Generation）流程，例如根据请求自动从向量数据库检索相关上下文，并将其注入到发送给 LLM 的 Prompt 中，从而简化应用层逻辑 <sup>8</sup>。
* **Agent 工具调用管理:** 随着 AI Agent 的兴起，网关可以作为 Agent 调用外部工具（API、数据库、函数）的统一出入口和管理点。例如，通过支持像 MCP (Model Context Protocol) 这样的协议，网关可以对工具调用进行认证、授权、限流和监控，确保 Agent 行为的安全可控 <sup>20</sup>。
* **动态模型选择与优化:** 基于实时性能、成本数据和请求特性，网关可以更智能地动态选择最合适的 LLM 模型或提供商来处理请求，实现持续的成本和性能优化 <sup>8</sup>。
* **Prompt 模板与装饰:** 网关可以集中管理和应用 Prompt 模板或装饰器，确保 Prompt 的一致性、有效性，并动态注入上下文信息 <sup>8</sup>。

这种编排能力的增强，将使 AI 网关成为 AI 基础设施中更为核心和智能的组件，进一步降低 AI 应用的开发和运维复杂性。

**趋势三：云原生与标准化的深化**

随着企业将 AI 应用部署到云原生环境（主要是 Kubernetes），AI 网关的云原生特性将变得愈发重要。



* **Kubernetes Gateway API 的普及:** Kubernetes Gateway API 作为下一代 Kubernetes 服务网络 API 标准，将逐渐取代传统的 Ingress <sup>43</sup>。支持 Gateway API 将成为衡量 AI 网关是否符合云原生最佳实践的关键指标。它提供了更强的表达能力、更好的角色分离和跨实现的可移植性，有助于避免厂商锁定 <sup>19</sup>。
* **Operator 模式的成熟:** Kubernetes Operator 将成为管理 AI 网关生命周期的标准方式，实现自动化部署、配置、升级和故障恢复，降低运维门槛 <sup>45</sup>。
* **与服务网格的协同:** AI 网关将更紧密地与服务网格（如 Istio, Linkerd）集成，共同管理进入 AI 应用的南北向流量和应用内部服务间（可能也涉及 AI 模型调用）的东西向流量，提供端到端的安全、可观测性和流量控制 <sup>20</sup>。

**前景预测：**

综合来看，**基于成熟开源项目（尤其是由中立基金会支持的项目，如基于 Envoy 或 APISIX）并积极拥抱云原生标准（特别是 Gateway API）的演进型 API/AI 网关**，最有潜力在未来占据主导地位。它们能够 leveraging 强大的基础架构，并通过插件或扩展快速集成 AI 功能，同时提供企业所需的可扩展性、可靠性和生态系统集成。

专为 AI 设计的开源网关（如 LiteLLM, Portkey）将在创新功能和易用性方面继续发挥重要作用，尤其是在 AI 应用开发的早期阶段和需要特定高级功能的场景中。它们可能会继续推动市场发展，其成功的功能最终会被更广泛的平台所吸收。

云提供商的集成解决方案将因其便捷性和生态系统优势而吸引大量用户，特别是在特定云平台上深度投入的企业。但它们可能需要在功能专业性和跨云灵活性上做出权衡。

最终，能够提供**统一管理、深度 AI 功能、强大云原生集成和灵活部署选项（开源、商业、托管）** 的解决方案将最有可能赢得市场。


## **8. 创业团队选型推荐**

对于 AI 领域的创业团队而言，选择合适的 LLM/AI API 网关是一个重要的基础设施决策。创业团队通常面临以下特点和需求：



* **资源有限:** 预算和人力相对紧张，需要高性价比的解决方案。
* **快速迭代:** 产品和技术方向可能快速变化，需要灵活、易于调整的基础设施。
* **技术驱动:** 团队通常具备较强的技术能力，愿意拥抱和管理开源技术。
* **关注核心业务:** 希望尽量减少在非核心基础设施上的投入和运维负担。
* **拥抱生态:** 需要与流行的 AI 开发框架（LangChain, LlamaIndex）和工具（Langfuse）顺畅集成。
* **云原生优先:** 通常基于云平台构建，倾向于采用云原生技术栈（Kubernetes）。
* **可扩展性:** 需要能够支撑未来业务增长的技术方案。

基于以上需求，结合前文对市场、架构和功能的分析，**开源 AI 网关**通常是创业团队的首选，因为它们在成本、灵活性和社区支持方面具有显著优势 <sup>4</sup>。在众多开源选项中，以下几个值得重点考虑：

**主要候选者评估：**



1. **LiteLLM:**
    * **优势:**
        * **极广泛的 LLM 支持 (100+)**: 极大地降低了接入不同模型的门槛 <sup>14</sup>。
        * **统一 OpenAI 格式 API**: 简化开发，易于与 LangChain 等框架集成 <sup>14</sup>。
        * **强大的成本控制与可观测性**: 内置虚拟密钥、预算、限流、成本追踪，并与 Langfuse 等工具深度集成 <sup>14</sup>。
        * **活跃的社区与快速迭代**: 拥有庞大的用户群和贡献者，功能更新快 <sup>14</sup>。
        * **Python 技术栈**: 对于以 Python 为主的 AI 团队非常友好 <sup>15</sup>。
        * **部署灵活**: 支持 Docker, Helm, Render, Railway 等多种部署方式 <sup>15</sup>。
    * **劣势:**
        * **云原生集成深度**: 相对于基于 Envoy/Nginx 的网关，在 Kubernetes Gateway API 和 Operator 支持方面可能仍在发展中。
        * **性能**: 作为 Python 应用，在高并发、低延迟场景下的性能可能需要额外关注和优化。
        * **企业级支持**: 需要依赖社区或购买企业版获取专业支持 <sup>14</sup>。
2. **Portkey.ai:**
    * **优势:**
        * **高性能声称**: 宣称 &lt;1ms 延迟，适合对性能敏感的应用 <sup>12</sup>。
        * **丰富 AI 功能**: 提供回退、负载均衡、语义缓存、内置 Guardrails 等实用功能 <sup>12</sup>。
        * **良好的 Agent 框架集成**: 明确支持 LangChain, LlamaIndex, AutoGen 等 <sup>12</sup>。
        * **活跃社区**: 同样拥有活跃的社区和开发 <sup>12</sup>。
        * **部署灵活**: 支持 Docker, Helm, Cloudflare Workers, EC2 等 <sup>12</sup>。
    * **劣势:**
        * **技术栈**: 基于 Node.js (推测)，可能不如 Python 对 AI 团队那么原生 <sup>12</sup>。
        * **云原生集成深度**: 与 LiteLLM 类似，在 Gateway API/Operator 支持上可能不如 Envoy/Nginx 系网关。
        * **Langfuse 集成**: 虽然社区有讨论 <sup>68</sup>，但官方文档链接失效 <sup>71</sup>，集成顺畅度有待验证。
3. **Apache APISIX:**
    * **优势:**
        * **高性能与成熟稳定**: 基于 Nginx/OpenResty，性能久经考验 <sup>17</sup>。
        * **强大的通用网关能力**: 除了 AI 功能，还提供丰富的 API 管理特性 <sup>17</sup>。
        * **良好的云原生支持**: 支持 K8s Ingress Controller, Helm, 正在集成 Gateway API <sup>17</sup>。
        * **Apache 基金会支持**: 提供中立治理和长期稳定性保障 <sup>5</sup>。
        * **插件生态丰富**: 可通过插件灵活扩展功能 <sup>17</sup>。
    * **劣势:**
        * **AI 功能需插件实现**: 相较于专用 AI 网关，AI 功能可能需要额外配置和管理插件 <sup>17</sup>。
        * **技术栈**: Lua/Nginx 可能对部分团队有学习曲线 <sup>34</sup>。
        * **开箱即用的 AI 特性**: 可能不如 LiteLLM/Portkey 丰富，例如语义缓存、内置 Guardrails 需要额外工作。

**推荐选择：LiteLLM**

综合考虑创业团队的典型需求，**LiteLLM** 是目前最值得推荐的选项之一。

**推荐理由:**



1. **极低的集成成本和开发效率:** 其核心价值在于提供了一个与 OpenAI 高度兼容的统一接口，支持市面上绝大多数 LLM 服务。这意味着开发团队可以使用熟悉的 OpenAI SDK 或 LangChain 等框架，通过简单修改 api_base 即可接入网关并无缝切换不同的模型和提供商，极大地提高了开发效率和灵活性 <sup>14</sup>。
2. **强大的成本控制与可观测性:** LiteLLM 内置了精细化的成本追踪、虚拟密钥、预算和限流功能，这对于成本敏感的初创公司至关重要 <sup>14</sup>。其与 Langfuse 的深度原生集成，使得获取详细的 LLM 调用日志、追踪信息和性能指标变得非常容易，便于快速调试和优化应用 <sup>14</sup>。
3. **丰富且专注的 AI 功能:** 除了基础的路由和代理，LiteLLM 提供了回退、负载均衡、缓存（包括语义缓存）等实用功能，能够满足大部分 AI 应用场景的需求 <sup>15</sup>。
4. **活跃的社区与生态:** LiteLLM 拥有一个非常活跃的 GitHub 仓库和社区，问题响应快，功能迭代迅速，能够及时跟进 AI 领域的最新进展 <sup>14</sup>。
5. **技术栈契合:** 对于大量使用 Python 进行 AI 开发的团队，LiteLLM 的 Python 技术栈降低了理解、使用和贡献的门槛 <sup>15</sup>。
6. **灵活的部署选项:** 支持 Docker 和 Helm，便于在 Kubernetes 等云原生环境中部署 <sup>35</sup>。

**选择 LiteLLM 需要注意的事项:**



* **运维管理:** 作为自托管的开源软件，团队需要具备部署、监控和维护 LiteLLM 实例的能力。虽然部署相对简单，但仍需投入一定的运维资源。
* **性能考量:** 对于超大规模或极端低延迟的场景，需要对 Python 应用的性能进行评估和可能的优化。可以考虑增加实例进行水平扩展（需要 Redis 支持路由信息共享 <sup>79</sup>）。
* **高级云原生集成:** 如果团队对 Kubernetes Gateway API 或 Operator 有强需求，可能需要关注 LiteLLM 在这方面的发展，或考虑 APISIX/Gloo 等选项。
* **企业级支持:** 如果需要 SLA 保障或专业的商业支持，可以考虑其企业版或评估其他商业方案。

**备选考虑:**



* **Portkey.ai:** 如果团队对极低延迟有极致要求，或者特别看重其内置的 Guardrails 和语义缓存功能，并且对其技术栈（可能是 Node.js）适应良好，Portkey 是一个强有力的备选。
* **Apache APISIX:** 如果团队已经在使用 APISIX 或具备 Nginx/Lua 专业知识，并且希望在一个统一的网关上管理所有 API（包括 AI 和非 AI），那么通过 AI 插件扩展 APISIX 也是一个可行的选择，但可能需要在 AI 特定功能的易用性上做一些权衡。

最终的选择应基于团队的具体技术背景、对特定功能（如语义缓存、内置 Guardrails）的优先级、性能要求以及对云原生集成深度的需求。


## **9. 结论**

LLM/AI API 网关已不再是可选项，而是构建可扩展、安全且经济高效的 AI 应用的关键基础设施。它们通过提供统一访问、智能路由、成本控制、安全防护和增强的可观测性，有效解决了直接与多样化、复杂的 LLM 服务交互所带来的挑战 <sup>1</sup>。

市场上的解决方案主要分为专为 AI 设计的网关和由传统 API 网关演进而来的平台，以及开源和商业两种模式 <sup>2</sup>。专为 AI 设计的方案通常在 AI 特定功能上更快速和深入，而演进的 API 网关则 leveraging 成熟的基础设施和广泛的通用功能。开源方案提供了灵活性和低成本，商业方案则侧重于支持、稳定性和企业级特性。

未来，AI 网关将朝着与传统 API 网关融合、成为更智能的 AI 编排层以及深化云原生集成的方向发展 <sup>2</sup>。选择一个能够适应这些趋势，特别是遵循云原生标准（如 Kubernetes Gateway API）的网关，对企业的长期发展至关重要。

对于寻求敏捷性、成本效益和强大 AI 功能的创业团队，成熟的开源 AI 网关是极具吸引力的选择。**LiteLLM** 因其广泛的模型支持、与 OpenAI 兼容的统一 API、强大的成本与可观测性功能（特别是与 Langfuse 的集成）、活跃的社区以及对 Python 生态的友好性，成为当前值得优先推荐的解决方案之一。

然而，任何技术的选型都需要结合具体场景。团队在做出最终决策前，应仔细评估自身的技术能力、运维资源、对特定功能（如极致性能、内置安全规则、特定云原生集成）的需求，并考虑备选方案如 Portkey.ai 或 Apache APISIX 等。

总之，审慎选择并有效利用 AI API 网关，将是企业在 AI 时代保持竞争力、加速创新并实现负责任 AI 部署的重要基石。


#### Obras citadas



1. AI Gateway benchmark: Comparing security and performance - NeuralTrust, fecha de acceso: abril 16, 2025, [https://neuraltrust.ai/blog/ai-gateway-benchmark](https://neuraltrust.ai/blog/ai-gateway-benchmark)
2. What Is an AI Gateway: Differences from API Gateway - DEV Community, fecha de acceso: abril 16, 2025, [https://dev.to/apisix/what-is-an-ai-gateway-differences-from-api-gateway-1c63](https://dev.to/apisix/what-is-an-ai-gateway-differences-from-api-gateway-1c63)
3. What is an AI Gateway? Concepts and Examples | Kong Inc., fecha de acceso: abril 16, 2025, [https://konghq.com/blog/enterprise/what-is-an-ai-gateway](https://konghq.com/blog/enterprise/what-is-an-ai-gateway)
4. Open Source vs. Commercial API Gateways: How to Choose the Right One? - API7.ai, fecha de acceso: abril 16, 2025, [https://api7.ai/learning-center/api-gateway-guide/open-source-vs-commercial-api-gateway](https://api7.ai/learning-center/api-gateway-guide/open-source-vs-commercial-api-gateway)
5. Cloud vs Open Source vs Commercial API Gateways: Which One Fits Your Needs?, fecha de acceso: abril 16, 2025, [https://apisix.apache.org/blog/2025/02/17/cloud-vs-open-source-vs-commercial-api-gateways/](https://apisix.apache.org/blog/2025/02/17/cloud-vs-open-source-vs-commercial-api-gateways/)
6. AI Gateway vs API Gateway - What's the difference - Portkey, fecha de acceso: abril 16, 2025, [https://portkey.ai/blog/ai-gateway-vs-api-gateway](https://portkey.ai/blog/ai-gateway-vs-api-gateway)
7. What Is an AI Gateway? How Is It Different From API Gateway? - Solo.io, fecha de acceso: abril 16, 2025, [https://www.solo.io/topics/ai-gateway](https://www.solo.io/topics/ai-gateway)
8. What Is an AI Gateway? Concept and Core Features | Apache APISIX, fecha de acceso: abril 16, 2025, [https://apisix.apache.org/blog/2025/03/06/what-is-an-ai-gateway/](https://apisix.apache.org/blog/2025/03/06/what-is-an-ai-gateway/)
9. Mastering LLM Gateway: Best Practices for AI Model Integration | JFrog ML - Qwak, fecha de acceso: abril 16, 2025, [https://www.qwak.com/post/llm-gateway](https://www.qwak.com/post/llm-gateway)
10. A Guide to LLM Gateways - TrueFoundry, fecha de acceso: abril 16, 2025, [https://www.truefoundry.com/blog/llm-gateways](https://www.truefoundry.com/blog/llm-gateways)
11. AI Gateway for LLM and API Management | Kong Inc., fecha de acceso: abril 16, 2025, [https://konghq.com/products/kong-ai-gateway](https://konghq.com/products/kong-ai-gateway)
12. Portkey-AI/gateway: A blazing fast AI Gateway with ... - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/Portkey-AI/gateway](https://github.com/Portkey-AI/gateway)
13. AI Gateway:What Is It? How Is It Different From API Gateway? - Traefik Labs, fecha de acceso: abril 16, 2025, [https://traefik.io/glossary/ai-gateway/](https://traefik.io/glossary/ai-gateway/)
14. LiteLLM, fecha de acceso: abril 16, 2025, [https://www.litellm.ai/](https://www.litellm.ai/)
15. BerriAI/litellm: Python SDK, Proxy Server (LLM Gateway) to ... - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/BerriAI/litellm](https://github.com/BerriAI/litellm)
16. List of Top 13 LLM Gateways - Doctor Droid, fecha de acceso: abril 16, 2025, [https://drdroid.io/engineering-tools/list-of-top-13-llm-gateways](https://drdroid.io/engineering-tools/list-of-top-13-llm-gateways)
17. apache/apisix: The Cloud-Native API Gateway and AI ... - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/apache/apisix](https://github.com/apache/apisix)
18. Kong/kong: The Cloud-Native API Gateway and AI Gateway. - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/Kong/kong](https://github.com/Kong/kong)
19. kgateway-dev/kgateway: The Cloud-Native API Gateway ... - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/kgateway-dev/kgateway](https://github.com/kgateway-dev/kgateway)
20. alibaba/higress - AI Native API Gateway - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/alibaba/higress](https://github.com/alibaba/higress)
21. Noveum/ai-gateway: Built for demanding AI workflows, this gateway offers low-latency, provider-agnostic access, ensuring your AI applications run smoothly and quickly. - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/MagicAPI/ai-gateway](https://github.com/MagicAPI/ai-gateway)
22. Open Source Api Gateway Comparison - Restack, fecha de acceso: abril 16, 2025, [https://www.restack.io/p/open-source-fintech-tools-answer-api-gateway-comparison](https://www.restack.io/p/open-source-fintech-tools-answer-api-gateway-comparison)
23. API7.ai: Apache APISIX & Open-Source API Gateway, fecha de acceso: abril 16, 2025, [https://api7.ai/](https://api7.ai/)
24. API7.ai: Open-Source API Gateway with Commercial Enterprise Offering - Intellyx, fecha de acceso: abril 16, 2025, [https://intellyx.com/2024/09/21/api7-ai-open-source-api-gateway-with-commercial-enterprise-offering/](https://intellyx.com/2024/09/21/api7-ai-open-source-api-gateway-with-commercial-enterprise-offering/)
25. Gloo AI Gateway - Cloud-Native AI Gateway | Solo.io, fecha de acceso: abril 16, 2025, [https://www.solo.io/products/gloo-ai-gateway](https://www.solo.io/products/gloo-ai-gateway)
26. AI Gateway | Cloudflare, fecha de acceso: abril 16, 2025, [https://www.cloudflare.com/developer-platform/products/ai-gateway/](https://www.cloudflare.com/developer-platform/products/ai-gateway/)
27. API Management - Amazon API Gateway - AWS, fecha de acceso: abril 16, 2025, [https://aws.amazon.com/api-gateway/](https://aws.amazon.com/api-gateway/)
28. Azure-Samples/AI-Gateway: APIM ❤️ AI - This repo contains experiments on Azure API Management's AI capabilities, integrating with Azure OpenAI, AI Foundry, and much more - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/Azure-Samples/AI-Gateway](https://github.com/Azure-Samples/AI-Gateway)
29. AI Gateway - IBM API Connect, fecha de acceso: abril 16, 2025, [https://www.ibm.com/products/api-connect/ai-gateway](https://www.ibm.com/products/api-connect/ai-gateway)
30. Top AI Gateways for GitHub in 2025 - Slashdot, fecha de acceso: abril 16, 2025, [https://slashdot.org/software/ai-gateways/for-github/](https://slashdot.org/software/ai-gateways/for-github/)
31. Traefik Hub vs Solo.io Gloo Gateway, fecha de acceso: abril 16, 2025, [https://traefik.io/compare/traefik-vs-solo-gloo-gateway/](https://traefik.io/compare/traefik-vs-solo-gloo-gateway/)
32. LLM Proxy & LLM gateway: All You Need to Know - TensorOps, fecha de acceso: abril 16, 2025, [https://www.tensorops.ai/post/llm-gateways-in-production-centralized-access-security-and-monitoring](https://www.tensorops.ai/post/llm-gateways-in-production-centralized-access-security-and-monitoring)
33. LLM Gateway: Key Features, Advantages, Architecture - DagsHub, fecha de acceso: abril 16, 2025, [https://dagshub.com/blog/llm-gateway-key-features-advantages-architecture/](https://dagshub.com/blog/llm-gateway-key-features-advantages-architecture/)
34. Top 6 Open-Source API Gateway Frameworks - Daily.dev, fecha de acceso: abril 16, 2025, [https://daily.dev/blog/top-6-open-source-api-gateway-frameworks](https://daily.dev/blog/top-6-open-source-api-gateway-frameworks)
35. litellm - Unique Helm Charts - Artifact Hub, fecha de acceso: abril 16, 2025, [https://artifacthub.io/packages/helm/unique/litellm](https://artifacthub.io/packages/helm/unique/litellm)
36. portkey-ai/portkeyai-gateway - Helm chart - Artifact Hub, fecha de acceso: abril 16, 2025, [https://artifacthub.io/packages/helm/portkeyai-gateway/gateway](https://artifacthub.io/packages/helm/portkeyai-gateway/gateway)
37. AWS Marketplace: Bitnami Helm Chart for Apache APISIX - Amazon.com, fecha de acceso: abril 16, 2025, [https://aws.amazon.com/marketplace/pp/prodview-nv2r4teochvfk](https://aws.amazon.com/marketplace/pp/prodview-nv2r4teochvfk)
38. Apache APISIX Helm Chart - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/apache/apisix-helm-chart](https://github.com/apache/apisix-helm-chart)
39. Helm charts for Kong - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/Kong/charts](https://github.com/Kong/charts)
40. gateway-operator 0.5.3 · kong/kong - Artifact Hub, fecha de acceso: abril 16, 2025, [https://artifacthub.io/packages/helm/kong/gateway-operator](https://artifacthub.io/packages/helm/kong/gateway-operator)
41. Helm chart overview | Solo.io documentation, fecha de acceso: abril 16, 2025, [https://docs.solo.io/gloo-mesh/main/reference/helm/overview/](https://docs.solo.io/gloo-mesh/main/reference/helm/overview/)
42. Package helm-charts/gloo-gateway - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/-/solo-io/packages/container/package/helm-charts%2Fgloo-gateway](https://github.com/-/solo-io/packages/container/package/helm-charts%2Fgloo-gateway)
43. Implementations - Kubernetes Gateway API, fecha de acceso: abril 16, 2025, [https://gateway-api.sigs.k8s.io/implementations/](https://gateway-api.sigs.k8s.io/implementations/)
44. solo-io/gloo: The Cloud-Native API Gateway and AI Gateway - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/solo-io/gloo](https://github.com/solo-io/gloo)
45. AI Gateway - Kong Gateway Operator - Kong Docs, fecha de acceso: abril 16, 2025, [https://docs.konghq.com/gateway-operator/latest/guides/ai-gateway/](https://docs.konghq.com/gateway-operator/latest/guides/ai-gateway/)
46. Kong Gateway Operator, fecha de acceso: abril 16, 2025, [https://docs.konghq.com/gateway-operator/latest/](https://docs.konghq.com/gateway-operator/latest/)
47. gateway-operator/FEATURES.md at main · Kong/gateway-operator - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/Kong/gateway-operator/blob/main/FEATURES.md](https://github.com/Kong/gateway-operator/blob/main/FEATURES.md)
48. Integrations :: Gloo Edge Docs, fecha de acceso: abril 16, 2025, [https://docs.solo.io/gloo-edge/main/introduction/integrations/](https://docs.solo.io/gloo-edge/main/introduction/integrations/)
49. Gloo Gateway (Gloo Edge API) - Docs | Solo.io, fecha de acceso: abril 16, 2025, [https://docs.solo.io/gloo-edge/main/](https://docs.solo.io/gloo-edge/main/)
50. Kong AI Gateway 3.10: Enhancing AI Governance with Automated RAG and PII Sanitization, fecha de acceso: abril 16, 2025, [https://konghq.com/blog/product-releases/ai-gateway-3-10](https://konghq.com/blog/product-releases/ai-gateway-3-10)
51. Portkey - LlamaIndex, fecha de acceso: abril 16, 2025, [https://docs.llamaindex.ai/en/stable/examples/llm/portkey/](https://docs.llamaindex.ai/en/stable/examples/llm/portkey/)
52. LiteLLM Proxy Server - LLM Gateway - Microsoft Azure Marketplace, fecha de acceso: abril 16, 2025, [https://azuremarketplace.microsoft.com/en-us/marketplace/apps/berrieaiincorporated1715199563296.litellm-gateway?tab=overview](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/berrieaiincorporated1715199563296.litellm-gateway?tab=overview)
53. Return Repeat Requests from Cache - Portkey Docs, fecha de acceso: abril 16, 2025, [https://portkey.ai/docs/guides/getting-started/return-repeat-requests-from-cache](https://portkey.ai/docs/guides/getting-started/return-repeat-requests-from-cache)
54. AI Semantic Cache - Plugin - Kong Docs, fecha de acceso: abril 16, 2025, [https://docs.konghq.com/hub/kong-inc/ai-semantic-cache/](https://docs.konghq.com/hub/kong-inc/ai-semantic-cache/)
55. Litellm Redis Cache Overview | Restackio, fecha de acceso: abril 16, 2025, [https://www.restack.io/p/litellm-answer-redis-cache-cat-ai](https://www.restack.io/p/litellm-answer-redis-cache-cat-ai)
56. Gloo AI Gateway - Semantic Caching - YouTube, fecha de acceso: abril 16, 2025, [https://www.youtube.com/watch?v=drpa82tIU1g](https://www.youtube.com/watch?v=drpa82tIU1g)
57. Cache API responses | Apache APISIX® -- Cloud-Native API Gateway and AI Gateway, fecha de acceso: abril 16, 2025, [https://apisix.apache.org/docs/apisix/tutorials/cache-api-responses/](https://apisix.apache.org/docs/apisix/tutorials/cache-api-responses/)
58. Gloo AI Gateway Hands-On Lab: Semantic Caching - Solo.io, fecha de acceso: abril 16, 2025, [https://www.solo.io/resources/lab/gloo-ai-gateway-hands-on-lab-semantic-caching](https://www.solo.io/resources/lab/gloo-ai-gateway-hands-on-lab-semantic-caching)
59. Caching - AI Gateway - Cloudflare Docs, fecha de acceso: abril 16, 2025, [https://developers.cloudflare.com/ai-gateway/configuration/caching/](https://developers.cloudflare.com/ai-gateway/configuration/caching/)
60. Concept | Guardrails against risks from Generative AI and LLMs - Dataiku Knowledge Base, fecha de acceso: abril 16, 2025, [https://knowledge.dataiku.com/latest/ml-analytics/gen-ai/concept-genai-guardrails.html](https://knowledge.dataiku.com/latest/ml-analytics/gen-ai/concept-genai-guardrails.html)
61. Remove PII from conversations by using sensitive information filters - Amazon Bedrock, fecha de acceso: abril 16, 2025, [https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-filters.html](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-filters.html)
62. Guardrails for Embedding Requests - Portkey Docs, fecha de acceso: abril 16, 2025, [https://portkey.ai/docs/product/guardrails/embedding-guardrails](https://portkey.ai/docs/product/guardrails/embedding-guardrails)
63. AI Prompt Guard - Plugin - Kong Docs, fecha de acceso: abril 16, 2025, [https://docs.konghq.com/hub/kong-inc/ai-prompt-guard/](https://docs.konghq.com/hub/kong-inc/ai-prompt-guard/)
64. guardrails-ai/guardrails_pii - GitHub, fecha de acceso: abril 16, 2025, [https://github.com/guardrails-ai/guardrails_pii](https://github.com/guardrails-ai/guardrails_pii)
65. Mosaic AI Gateway introduction | Databricks Documentation, fecha de acceso: abril 16, 2025, [https://docs.databricks.com/aws/en/ai-gateway](https://docs.databricks.com/aws/en/ai-gateway)
66. Gloo AI Gateway - Content Safety with Prompt Guard - YouTube, fecha de acceso: abril 16, 2025, [https://www.youtube.com/watch?v=XWFb3QP9gbA](https://www.youtube.com/watch?v=XWFb3QP9gbA)
67. opentelemetry | Apache APISIX® -- Cloud-Native API Gateway and ..., fecha de acceso: abril 16, 2025, [https://apisix.apache.org/docs/apisix/plugins/opentelemetry/](https://apisix.apache.org/docs/apisix/plugins/opentelemetry/)
68. [200+ LLMs] Opensource AI Gateway in Rust : r/LLMDevs - Reddit, fecha de acceso: abril 16, 2025, [https://www.reddit.com/r/LLMDevs/comments/1gvih6r/200_llms_opensource_ai_gateway_in_rust/](https://www.reddit.com/r/LLMDevs/comments/1gvih6r/200_llms_opensource_ai_gateway_in_rust/)
69. Should you use an LLM Proxy to Build your Application? - Langfuse Blog, fecha de acceso: abril 16, 2025, [https://langfuse.com/blog/2024-09-langfuse-proxy](https://langfuse.com/blog/2024-09-langfuse-proxy)
70. Cookbook: LiteLLM (Proxy) + Langfuse OpenAI Integration + @observe Decorator, fecha de acceso: abril 16, 2025, [https://langfuse.com/docs/integrations/litellm/example-proxy-python](https://langfuse.com/docs/integrations/litellm/example-proxy-python)
71. fecha de acceso: enero 1, 1970, [https://portkey.ai/docs/observability/langfuse-integration](https://portkey.ai/docs/observability/langfuse-integration)
72. Apache APISIX Serverless Plugin for Event Hooks - API7.ai, fecha de acceso: abril 16, 2025, [https://api7.ai/blog/serverless-plugin-for-event-hooks](https://api7.ai/blog/serverless-plugin-for-event-hooks)
73. Public API - Langfuse, fecha de acceso: abril 16, 2025, [https://langfuse.com/docs/api](https://langfuse.com/docs/api)
74. fecha de acceso: enero 1, 1970, [https://docs.konghq.com/gateway/latest/explore/observability/tracing/opentelemetry/](https://docs.konghq.com/gateway/latest/explore/observability/tracing/opentelemetry/)
75. Langfuse Kong Plugin - YouTube, fecha de acceso: abril 16, 2025, [https://www.youtube.com/watch?v=SCgy9dYVPI4](https://www.youtube.com/watch?v=SCgy9dYVPI4)
76. fecha de acceso: enero 1, 1970, [https://docs.solo.io/gloo-gateway/latest/observability/tracing/opentelemetry/](https://docs.solo.io/gloo-gateway/latest/observability/tracing/opentelemetry/)
77. Langfuse Observability & Tracing Integrations, fecha de acceso: abril 16, 2025, [https://langfuse.com/docs/integrations/overview](https://langfuse.com/docs/integrations/overview)
78. Best LLM gateway? : r/LLMDevs - Reddit, fecha de acceso: abril 16, 2025, [https://www.reddit.com/r/LLMDevs/comments/1fdii62/best_llm_gateway/](https://www.reddit.com/r/LLMDevs/comments/1fdii62/best_llm_gateway/)
79. llm – baeke.info, fecha de acceso: abril 16, 2025, [https://baeke.info/tag/llm/](https://baeke.info/tag/llm/)
80. LiteLLM Proxy (LLM Gateway), fecha de acceso: abril 16, 2025, [https://docs.litellm.ai/docs/providers/litellm_proxy](https://docs.litellm.ai/docs/providers/litellm_proxy)


## 补充相关文章

+ [开源的阶段性成长指南](https://nsddd.top/zh/posts/stage-growth-of-open-source/)
+ [一份完整的开源贡献指南（提供给第一次踏入开源伙伴秘籍）](https://nsddd.top/zh/posts/open-source-contribution-guidelines/)
+ [我的实践总结：开源社区的规范设计思路](https://nsddd.top/zh/posts/advanced-githook-design/)
+ [在开源社区中学会如何提问](https://nsddd.top/zh/posts/the-art-of-asking-questions-in-open-source-communities/)