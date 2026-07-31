---
url: "/zh/ai-agent/posts/jina/"
aliases:
  - /zh/projects/jina/
  - /zh/posts/ai-projects/jina/
title: 'Jina 2026：搜索底座模型、API 与 Jina Serve 实战指南'
date: 2025-04-12T13:01:59+08:00
lastmod: 2026-07-31T12:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - RAG
  - LLM
  - MCP
  - Python
  - Open Source
  - Project Learning
categories:
  - Development
description: >
  Elastic 收购 Jina AI 后，Jina 已从云原生神经搜索框架转向搜索底座模型品牌。本文按 2026 年现状厘清托管 API 与开源 Jina Serve 的边界，比较 v4、v5 text/omni、reranker v3.5 的上下文、维度和许可证，并给出 API、MCP、Flow 示例与生产选型矩阵。
cover:
  image: /images/covers/ai-agent/2025/jina.png
  alt: "Jina 搜索底座模型、托管 API 与 Jina Serve 的两层架构"
---

第一次认识 Jina 时，我把它理解成“用 Flow 编排神经搜索服务的 Python 框架”。这个理解没有错，只是停在了旧地图上。

2025 年 10 月 9 日，Elastic 宣布与 Jina AI 合并力量，随后完成收购。Jina 创始人肖涵加入 Elastic 担任 AI 副总裁，模型继续通过 Hugging Face 提供，并逐步进入 Elastic Inference Service。到 2026 年再谈 Jina，更准确的起点已经不是一个通用 MLOps 框架，而是一个面向检索的 **Search Foundation Models（搜索底座模型）品牌**：它提供嵌入、重排、网页读取、文本切分、分类和深度搜索等能力。[Elastic 的收购公告](https://www.elastic.co/blog/elastic-jina-ai)把方向说得很明确——把多语言、多模态检索能力放到 Elasticsearch 的搜索规模与生态中。

但旧框架并没有凭空消失。`jina-ai/serve` 仍然是一个独立的 Apache-2.0 开源项目。于是今天的 Jina 实际上有两条不应混写的线：

1. **Search Foundation APIs 与模型**：Jina/Elastic 提供现成的检索能力，你按 API 调用，或下载符合许可条件的模型权重自行部署。
2. **Jina Serve**：你用 `Doc`、`Executor`、`Gateway`、`Deployment`、`Flow` 把自己的 Python/AI 逻辑做成可伸缩服务。

一个解决“用什么能力”，另一个解决“怎样把能力服务化”。这篇文章只围绕这条边界展开。

> 文中的产品、模型、上下文长度、向量维度与许可证均按 Jina、Elastic 及 Jina 官方仓库核验，截止日期为 **2026 年 7 月 31 日**。价格、限流和服务可用区变化较快，上线前仍应以控制台与正式条款为准。

## Search Foundation APIs：六种能力，不是一个万能端点

Jina 的 API 产品看起来都与“搜索”有关，但它们处在检索链路的不同位置。

| 能力 | 输入与输出 | 最适合解决的问题 | 不负责什么 |
| --- | --- | --- | --- |
| Reader | URL → Markdown、结构化内容或截图 | 把网页变成 LLM 可读上下文 | 不替代站点授权、事实核验或数据库 |
| Embeddings | 文本/图像/音视频 → 向量 | 召回、聚类、相似度、跨模态搜索 | 不直接生成答案 |
| Reranker | 查询 + 候选文档 → 相关性排序 | 对初召回结果精排 | 不应扫描整个语料库 |
| Classifier | 输入 + 标签/已训练分类器 → 类别 | 零样本、少样本或任务分类 | 不是自由文本生成器 |
| Segmenter | 长文本 → 语义片段与位置信息 | 为索引、RAG 和长文处理切块 | 不判断片段事实是否正确 |
| DeepSearch | 研究问题 → 搜索、阅读、推理后的答案 | 需要多轮查找和综合的开放问题 | 不保证来源永远可靠，也不适合低延迟确定性查询 |

Reader 最小调用甚至不需要 SDK：在目标 URL 前加 `https://r.jina.ai/http://` 或 `https://r.jina.ai/https://`，即可得到适合模型消费的内容。生产环境应带 API key，并显式处理超时、缓存、robots/版权和敏感数据边界。

```bash
curl "https://r.jina.ai/https://www.elastic.co/blog/elastic-jina-ai" \
  -H "Authorization: Bearer ${JINA_API_KEY}"
```

Embeddings 与 Reranker 走 `api.jina.ai/v1`；Classifier 和 Segmenter 也属于同一套 Search Foundation API 面。DeepSearch 则提供 OpenAI Chat Completions 兼容端点 `https://deepsearch.jina.ai/v1/chat/completions`，它会反复搜索、阅读与推理，成本和延迟自然高于单次 Reader 或 Reranker。完整请求字段应以 [Jina API 参考](https://api.jina.ai/redoc) 为准。

### MCP：把 API 变成 Agent 的工具箱

Jina 的官方远程 MCP Server 位于 `https://mcp.jina.ai/v1`。它把 Reader、网页/论文搜索、截图、Reranker、去重等能力暴露为工具，适合 Codex、Claude Code、Cursor 等 MCP 客户端。最小配置如下：

```json
{
  "mcpServers": {
    "jina": {
      "url": "https://mcp.jina.ai/v1",
      "headers": {
        "Authorization": "Bearer ${JINA_API_KEY}"
      }
    }
  }
}
```

这里有一个容易忽略的成本：工具越多，模型在真正工作前消耗的上下文越多。官方 MCP 支持 `include_tools`、`exclude_tools` 和标签过滤；如果 Agent 只需要读网页与搜索，就不要把全部工具都注册进去。具体工具名与传输方式可查 [Jina 官方 MCP 仓库](https://github.com/jina-ai/MCP)。

## 2026 年的模型线：v4、v5 text、v5 omni 与 reranker v3.5

模型名不能只看“代数”。v4、v5 text 和 v5 omni 面向的模态、部署体量与许可证边界不同。

| 模型 | 输入 | 上下文 | 默认维度 | 可截断维度 | 权重许可证 | 适用判断 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `jina-embeddings-v4` | 文本、图像、PDF | 32,768 tokens | 2048 | 最低 128 | Qwen Research License | 需要单向量/多向量视觉文档检索；不应默认用于商业托管生产 |
| `v5-text-small` | 文本 | 32,768 tokens | 1024 | 最低 32 | CC BY-NC 4.0 | 质量优先的多语言文本检索 |
| `v5-text-nano` | 文本 | 8,192 tokens | 768 | 最低 32 | CC BY-NC 4.0 | CPU、边缘设备或低延迟文本检索 |
| `v5-omni-small` | 文本、图像、音频、视频、PDF | 32,768 tokens | 1024 | 最低 32 | CC BY-NC 4.0 | 服务器侧统一多模态检索 |
| `v5-omni-nano` | 文本、图像、音频、视频、PDF | 8,192 tokens | 768 | 最低 32 | CC BY-NC 4.0 | 资源受限的多模态检索 |
| `jina-reranker-v3.5` | 查询 + 文档列表 | 总计最高 131K tokens | 不适用 | 不适用 | CC BY-NC 4.0 | 对召回候选做多语言、领域与半结构化精排 |

数据来自 Jina 官方模型页：[v4](https://jina.ai/models/jina-embeddings-v4/)、[v5-text-small](https://jina.ai/models/jina-embeddings-v5-text-small/)、[v5-text-nano](https://jina.ai/models/jina-embeddings-v5-text-nano/)、[v5-omni-small](https://jina.ai/models/jina-embeddings-v5-omni-small/)、[v5-omni-nano](https://jina.ai/models/jina-embeddings-v5-omni-nano/) 与 [reranker v3.5 官方模型卡](https://huggingface.co/jinaai/jina-reranker-v3.5)。

v4 是 3.8B 参数的统一文本—视觉模型，既能输出单向量，也能输出 late-interaction 多向量。它的能力很强，但基于 Qwen2.5-VL 主干并受 Qwen Research License 约束。Jina 官方明确说明其 API 免费且被限流，原因正是不能把它作为商业产品销售。因此，“API 能调通”不等于“可用于商业生产”。

v5 走了另一条路。`text-small` 为 677M 参数、1024 维、32K 上下文；`text-nano` 为 239M 参数、768 维、8K 上下文。两者都有 retrieval、text-matching、clustering、classification 四类任务适配器。`omni` 在保持对应 text 模型文本向量兼容的同时，加入图像、音频和视频：从 text 升到对应 omni 时，已有文本索引不必重建，但跨 small/nano 或跨其他代际仍不能想当然地混用向量。

`jina-reranker-v3.5` 是 2026 年 7 月的新版本。它仍是 0.6B 参数的 listwise reranker，一次联合观察查询和多条候选；相比 v3，官方模型卡强调了领域鲁棒性、半结构化数据排序和长列表推理效率。它与 v3 使用同一 API schema，升级主要是更换模型名：

```bash
curl https://api.jina.ai/v1/rerank \
  -H "Authorization: Bearer ${JINA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jina-reranker-v3.5",
    "query": "如何为中文 RAG 选择嵌入模型？",
    "documents": [
      "v5-text-small 提供 32K 上下文和 1024 维向量。",
      "Jina Serve 是一个服务编排框架。",
      "Reader 可以把网页转换为 Markdown。"
    ],
    "top_n": 2,
    "return_documents": true
  }'
```

### 许可证边界比排行榜更重要

这几类许可证不能混为一谈：

- `jina-ai/serve` 代码是 **Apache-2.0**，可以商业使用，但你放进 Executor 的模型与数据仍受各自条款约束。
- v5 text、v5 omni 和 reranker v3.5 的公开权重是 **CC BY-NC 4.0**。未经商业授权，不应把“权重可下载”解释成“可直接商用”。
- v4 使用 **Qwen Research License**。Jina 官方对其商业限制有单独说明。
- 调用 Jina 托管 API 还受服务条款、套餐和数据处理约定约束，不能只看模型仓库里的 LICENSE。

真正上线前，需要分别回答三个问题：代码能否商用？模型权重能否商用？发送到托管服务的数据能否离开自己的安全边界？少回答一个，架构就还没有闭环。

## Jina Serve：框架仍在，但它不是 Search Foundation API

[Jina Serve 官方仓库](https://github.com/jina-ai/serve)把核心概念分成三层：

- **数据层：`BaseDoc` / `DocList`（广义上的 Doc）**。用类型化文档表达请求与响应。
- **服务层：`Executor` / `Gateway`**。Executor 承载业务逻辑，Gateway 对外暴露 gRPC、HTTP 或 WebSocket 入口并路由请求。
- **编排层：`Deployment` / `Flow`**。Deployment 把单个 Executor 服务化；Flow 把多个 Deployment 连接成有向处理图。

最小示例不需要模型。下面的 Executor 接收文本、返回规范化结果；Flow 启动时会创建 Gateway：

```python
from docarray import BaseDoc, DocList
from jina import Executor, Flow, requests


class TextDoc(BaseDoc):
    text: str


class Normalize(Executor):
    @requests(on="/normalize")
    def normalize(self, docs: DocList[TextDoc], **kwargs) -> DocList[TextDoc]:
        for doc in docs:
            doc.text = " ".join(doc.text.split()).lower()
        return docs


flow = Flow(port=12345, protocol="http").add(uses=Normalize)

with flow:
    flow.block()
```

```bash
curl -X POST http://localhost:12345/normalize \
  -H "Content-Type: application/json" \
  -d '{"data":[{"text":"  Search   Foundation  "}]}'
```

如果只部署一个 Executor，用 `Deployment(uses=Normalize, ...)` 更直接；需要串联切分、嵌入、自有推理或后处理时，再使用 Flow。Jina Serve 的价值在于副本、分片、动态批处理、流式响应、多协议与容器编排，而不是替你选择模型或向量数据库。

也要正视它的边界：官方仓库最新 release 仍停在 2024 年的 v3.28.0，Jina 的公司重心已经转向搜索底座模型。已有复杂 Jina Flow 可以继续维护；新项目若只是把一个 HTTP 推理函数上线，则应认真比较 FastAPI、Ray Serve、KServe 或云厂商托管推理，避免为并不存在的 DAG 和多协议需求支付抽象成本。

## 选择矩阵：先定问题，再选 Jina 的哪一层

| 你的问题 | 推荐起点 | 原因 | 主要边界 |
| --- | --- | --- | --- |
| 把公开网页交给 LLM | Reader | 接入最快，直接得到 Markdown | 页面权限、抓取质量、时效与提示注入 |
| 文本语义召回 | v5-text-small | 32K、多语言、质量与体量平衡 | CC BY-NC 权重；API 数据边界 |
| 本地 CPU/边缘检索 | v5-text-nano | 239M、768 维、GGUF/MLX 路线 | 8K 上下文，需实测中文领域数据 |
| 图文音视频统一搜索 | v5-omni-small/nano | 共享向量空间，对应 text 向量兼容 | 非商业权重许可，模态预处理成本 |
| PDF、截图、图表检索 | v4 或 v5-omni | 原生视觉文档输入 | v4 商业限制；两者都需评测吞吐 |
| 提升前 20–100 条候选质量 | reranker v3.5 | listwise 精排，适合领域与结构化内容 | 不能替代第一阶段召回，延迟随候选增长 |
| Agent 需要读网、搜网、精排 | 官方 MCP Server | 工具已封装，可按需过滤 | 工具 schema 占上下文，远程数据治理 |
| 开放式多轮研究 | DeepSearch | 搜索、阅读、推理一体 | 延迟、成本、引用与事实仍需复核 |
| 自建多阶段 Python 服务 DAG | Jina Serve Flow | Executor 可独立扩缩、支持多协议 | 项目活跃度与运维复杂度 |

我更倾向于把检索系统拆成可替换的窄接口：Reader 只负责摄取，Segmenter 只负责切分，Embeddings 只负责召回，Reranker 只负责精排，生成模型只根据证据回答。不要因为同一家厂商提供了整条链路，就让每个环节失去替换能力。

## 生产落地前的五个检查

### 1. 用自己的查询集评测

排行榜只能说明模型在某组公开数据上的平均表现。中文术语、代码、表格、法律文本和企业缩写会改变结果。至少准备真实查询、相关文档标注与困难负例，分别测召回率、nDCG、延迟和单次成本。

### 2. 不把“长上下文”当作免切分许可证

32K 或 131K 是容量上限，不是质量承诺。文档越长，噪声、吞吐和成本越难控制。Segmenter、标题层级、滑动窗口与 late chunking 仍要按任务验证。

### 3. 固化向量契约

模型名、任务适配器、前缀、维度、归一化方式和相似度函数共同定义一份向量契约。任何一项变化都可能要求重建索引。v5 text 与对应 v5 omni 的文本兼容是官方明确设计，不应被外推到所有模型组合。

### 4. 把外部内容当作不可信输入

Reader 和 MCP 把网页送入 Agent，也把网页里的提示注入、错误信息和敏感内容带了进来。抓取结果需要来源白名单、内容隔离、引用记录、权限检查与人工复核。

### 5. 为退出留接口

Jina 被 Elastic 收购说明优秀能力最终会进入更大的平台，也提醒我们：产品重心会变化。保留原始文档、可重建索引、模型版本与评测集；把 API 封装在自己的适配层后面。好的基础设施不是永远不变，而是变化时仍能离开。

## 结语

2026 年的 Jina，不再适合被一句“云原生神经搜索框架”概括。它更像两块叠在一起的地层：上层是 Elastic 体系中的搜索底座模型与托管 API，下层是仍然可用的 Jina Serve 开源框架。

理解 Jina 的关键也不是记住全部产品名，而是守住边界：向量负责找到可能相关的内容，重排负责缩小判断范围，Reader 负责把外部世界变成可读材料，DeepSearch 负责多轮研究，Serve 负责让自己的逻辑可靠运行。工具可以替我们缩短路径，却不能替我们决定什么算证据。

检索的价值，从来不在于系统记住了多少，而在于需要回答时，它能否把正确的东西带回来。

## 官方资料

- [Elastic：Elastic and Jina AI join forces](https://www.elastic.co/blog/elastic-jina-ai)
- [Jina Search Foundation API Reference](https://api.jina.ai/redoc)
- [Jina Embeddings 官方页面](https://jina.ai/embeddings/)
- [Jina Reranker 官方页面](https://jina.ai/reranker/)
- [Jina Serve 官方仓库](https://github.com/jina-ai/serve)
- [Jina Reader 官方仓库](https://github.com/jina-ai/reader)
- [Jina Remote MCP Server 官方仓库](https://github.com/jina-ai/MCP)
- [Jina DeepSearch 官方仓库](https://github.com/jina-ai/node-DeepResearch)
