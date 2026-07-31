---
title: 'GPT Researcher 源码审计：深度研究代理如何检索、写作与自托管'
date: 2025-04-14T16:17:27+08:00
lastmod: 2026-07-31T10:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Project Learning
  - Open Source
  - Python
  - Docker
  - MCP
  - RAG
categories:
  - Development
description: >
  本文以 GPT Researcher v3.5.0（b364917）为源码基线，核对 Python 3.11、调用链、Docker、MCP 五项工具、LangSmith 与 DeepResearchGym，并厘清 Apache-2.0 代码、自托管资源和 API 成本，帮助工程师判断它是否适合生产研究流程。
cover:
  image: /images/covers/ai-agent/2025/gpt-researcher.png
  alt: 'GPT Researcher 深度研究代理的检索、证据与报告生成流程'
  relative: false
aliases:
  - /zh/projects/gpt-researcher/
  - /zh/posts/ai-projects/gpt-researcher/
tldr:
  - 'GPT Researcher 的稳定嵌入路径是先调用 conduct_research，再调用 write_report；旧文章中的一体化入口不应再作为当前主路径。'
  - '仓库代码可按 Apache-2.0 使用，但运行并不免费：自托管仍需计算、存储和运维资源，联网研究通常还会产生模型与搜索 API 费用。'
  - 'DeepResearchGym 证明了它在固定评测设置下的引用和覆盖能力，却不能替代业务数据、中文任务与成本约束下的验收测试。'
faq:
  - q: 'GPT Researcher 是什么？'
    a: '它是一个面向网页和本地文档研究的开源代理：先规划问题并检索资料，再整理证据、保留来源，最后生成带引用的长报告。'
  - q: '现在应该怎样从 Python 调用 GPT Researcher？'
    a: '创建 GPTResearcher 实例后，依次 await conduct_research() 与 await write_report()。本文审计的 v3.5.0 README 和源码都采用这条调用链。'
  - q: 'GPT Researcher 可以免费使用吗？'
    a: '仓库代码采用 Apache-2.0 许可证，可以自行部署和修改；但机器、存储、运维、LLM 推理以及搜索服务并不会因此免费。'
  - q: 'GPT Researcher 的 MCP Server 提供哪些工具？'
    a: '独立的 gptr-mcp 仓库公开五项主工具：deep_research、quick_search、write_report、get_research_sources 与 get_research_context。'
---

> 研究工具最容易制造一种错觉：报告越长，答案越可靠。源码给出的提醒恰好相反——真正值得审计的不是字数，而是问题怎样被拆开、证据怎样进入上下文，以及结论能否回到来源。

![GPT Researcher 深度研究工作流](/images/projects/gpt-researcher-workflow.svg)

## 先说结论

GPT Researcher 适合需要**可编程研究流程、来源留痕和部署控制权**的团队。它不是一个“输入问题就必然得到事实”的按钮，而是一条可以更换模型、检索器和报告策略的研究流水线。

我更愿意把它理解为三个动作：

1. 规划：把宽泛问题拆成可检索的子问题；
2. 取证：并行搜索、抓取、筛选并记录来源；
3. 写作：把研究上下文组织成带引用的报告。

这三个动作解决的是研究的吞吐量和可追踪性，不自动解决来源偏差、网页失效、模型误读与业务口径冲突。自动化扩大了人的判断力，也会放大没有被发现的错误。

## 审计基线：不要用滚动的 master 解释架构

本文在 **2026 年 7 月**复核，固定到官方仓库：

- Git tag：[`v3.5.0`](https://github.com/assafelovic/gpt-researcher/releases/tag/v3.5.0)
- commit：[`b364917f55ea579c47e5ef3f038f7e56f51213df`](https://github.com/assafelovic/gpt-researcher/tree/b364917f55ea579c47e5ef3f038f7e56f51213df)
- Python 包元数据版本：`0.14.7`
- Python 要求：`>=3.11`

固定快照很重要。这个项目的发布 tag、Python 包版本和主分支会继续变化；如果只写“当前源码”，几个月后代码路径、依赖和配置就可能对不上。下文的接口、部署与成本判断都以这个 commit 为准。

## 真实调用链：研究与写报告是两个阶段

v3.5.0 的 README 给出的 PIP 用法很克制：

```python
from gpt_researcher import GPTResearcher

researcher = GPTResearcher(query="研究主题")
research_result = await researcher.conduct_research()
report = await researcher.write_report()
```

`conduct_research()` 负责形成研究上下文，`write_report()` 再消费这些上下文并生成报告。把两步分开有实际价值：

- 可以在写作前检查研究结果和来源；
- 可以把检索与报告生成分别计时、记录和失败重试；
- 可以在同一批证据上实验不同报告要求；
- 可以把“没有搜到”与“写得不好”区分开来。

因此，不应再把旧教程中的一体化调用和命令行脚本描述为当前推荐入口。服务部署的官方路径是 Uvicorn，库集成则是 `conduct_research()` 加 `write_report()`。

## 架构：只陈述源码和官方文档能证明的部分

官方 README 把高层架构概括为 planner、execution agents 与 publisher：

- planner 根据研究问题生成一组研究问题；
- execution agents 为每个问题收集相关信息；
- 每个资源被摘要并保留来源；
- publisher 过滤、聚合结果，形成最终报告。

这个描述足以解释它为什么比一次普通搜索更慢，也解释了成本为何会累积：一次研究不是一次模型调用，而是规划、多个检索分支、上下文处理和写作的组合。

这里需要避免一种常见的源码阅读错误：看到依赖表里有 Selenium、向量库或某个解析器，就直接写成“系统一定在每次任务中使用它”。依赖只证明项目能够安装或支持某个组件，不能证明某条运行路径必然经过它。判断能力应继续追到配置、工厂选择和实际调用点，而不是从 `requirements` 反推功能。

## 安装与部署：Python、Uvicorn 和 Docker 三条边界

### 本地服务

官方基线要求 Python 3.11 或更高版本：

```bash
git clone https://github.com/assafelovic/gpt-researcher.git
cd gpt-researcher
git checkout b364917f55ea579c47e5ef3f038f7e56f51213df

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export OPENAI_API_KEY="..."
export TAVILY_API_KEY="..."
python -m uvicorn main:app --reload
```

默认访问地址是 `http://localhost:8000`。示例中的 OpenAI 与 Tavily 是官方快速开始组合，不代表只能使用这两个提供商；真正换模型或检索器前，应再核对该快照支持的配置项。

### Docker

仓库提供 Compose 路径：

```bash
docker compose up --build
```

默认 Compose 流程会启动 Python 服务和 React 前端，分别监听 `8000` 与 `3000` 端口。容器解决的是环境一致性，不会替你解决密钥管理、出站网络、抓取合规、持久化、并发上限和观测告警。生产环境至少要把密钥移出镜像与仓库，并限制日志中出现查询、网页正文和模型输入。

## “开源免费”需要拆成三张账单

仓库根目录 `LICENSE` 与 README 的免责声明采用 **Apache License 2.0**。这意味着代码可以在许可证条件下使用、修改和分发；它不意味着一次研究的边际成本为零。

实际成本至少分三层：

| 成本层 | 典型项目 | 是否因自托管消失 |
|---|---|---|
| 基础设施 | CPU、内存、存储、带宽、日志与运维 | 否 |
| 模型 | 规划、摘要、推理、报告生成的 token 或 GPU | 否 |
| 检索 | Tavily 等搜索 API、代理、抓取失败重试 | 否 |

官方 README 对 deep research 给过一个可复核的示例口径：使用 `o3-mini`、`high` reasoning effort 时，单次约 5 分钟、约 0.4 美元。它只是特定模型、参数和当时价格下的估算，不是报价，更不是服务等级承诺。问题宽度、递归深度、网页数量、报告长度和重试次数都会改变账单。

如果全部换成本地模型，外部模型 API 账单可以下降，但成本会转移到 GPU、延迟、吞吐和维护上。所谓“免费替代”往往只是没有把资源成本写在同一张账单里。

## LangSmith：v3.4 引入的是可观测性，不是质量保证

官方 `v3.4.0` 发布说明把 LangSmith tracing 列为新增能力。启用方式是：

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY="..."
export LANGCHAIN_PROJECT="gpt-researcher"
```

它可以观察模型调用、token 用量、研究规划、子查询与报告生成步骤。这对定位“检索错了还是写作错了”很有用，但 trace 的存在不证明报告正确。

另一个边界是数据治理：研究问题、来源片段、提示词或模型输出可能进入追踪系统。接入前要先确认脱敏、保留周期、访问权限和所在区域，尤其不要把内部文档研究默认等同于“数据只在本机”。

## MCP：先区分客户端检索与独立 Server

GPT Researcher 主仓库可以把 MCP 数据源接入检索流程；面向 Claude Desktop、n8n 等客户端的 GPT Researcher MCP Server，则已经迁到独立的 [`assafelovic/gptr-mcp`](https://github.com/assafelovic/gptr-mcp) 仓库。

该 Server 的 README 公布了五项主工具：

1. `deep_research`：执行较完整的深度研究；
2. `quick_search`：优先速度的快速搜索；
3. `write_report`：基于研究结果生成报告；
4. `get_research_sources`：读取本次研究使用的来源；
5. `get_research_context`：读取完整研究上下文。

这五项工具的价值不在于又多了一层协议，而在于把研究、写作、来源和上下文拆成可组合接口。调用方可以先看来源再决定是否写报告，也可以把研究结果交给另一个代理继续处理。

同时要注意版本独立性：`gptr-mcp` 是单独仓库，有自己的依赖、传输方式和许可证元数据。部署时应分别锁定两个仓库的 commit，不能用 GPT Researcher 的版本号替代 MCP Server 的版本。

## DeepResearchGym：读表格，不读“第一名”口号

DeepResearchGym 是 2025 年提出的可复现深度研究评测沙箱，论文使用 1,000 个复杂查询，分别观察覆盖、引用和报告质量。其表格在 **DeepResearchGym 搜索 API**设置下给 GPT Researcher 的结果包括：

- Key Point Recall：`64.67`
- Citation Precision：`85.36`
- Citation Recall：`90.82`
- Clarity：`83.70`
- Insightfulness：`78.01`

这些数字支持一个有限但重要的结论：在论文固定的查询集、检索接口和评判器下，GPT Researcher 是表现很强的开源基线，尤其是覆盖率与引用指标。

但它们不能直接推出三个更大的结论：

1. 不能证明每篇报告都事实正确；引用存在不等于引用支持该句。
2. 不能证明它在中文、企业私有数据或特定行业上同样领先。
3. 不能把不同检索条件下的分数随意混在一起，宣称对所有商业系统全面第一。

论文的价值不只是排行榜。它还提示：检索 API 的变化会显著影响系统结果，而多面问题的长尾覆盖仍是 GPT Researcher 的典型失败模式。生产验收应复刻自己的问题分布，而不是借用总榜成绩。

## 什么时候值得用，什么时候不值得

适合：

- 需要保留来源、研究上下文和中间过程；
- 希望替换模型、搜索引擎或接入内部数据；
- 能接受分钟级延迟，并愿意为检索质量做评测；
- 有自托管、审计或二次开发需求。

不适合：

- 只需要一个事实或几秒内返回的简单搜索；
- 把“有引用”误当成“可直接发布”；
- 没有预算上限、并发控制和失败重试策略；
- 涉及医疗、法律、投资等高风险结论，却没有人工复核。

我的判断是：GPT Researcher 最值得学习的不是某个模型或抓取器，而是它把研究拆成了可观察的过程。工具真正成熟的标志，不是它替人写完一篇报告，而是人在必要时能停下来，知道该检查哪一段证据。

## 一份可执行的验收清单

在把它接入真实工作前，我会用 20—50 个业务问题做小规模评测，并记录：

- 来源是否权威、是否能打开、是否与结论对应；
- 多面问题是否漏掉关键子问题；
- 中文专有名词、数字、日期和单位是否准确；
- 单次 token、搜索请求、总成本与 P95 延迟；
- 搜索失败、页面抓取失败和模型超时时怎样降级；
- 相同问题重复运行时，结论波动是否可接受；
- trace、缓存、报告和本地文档分别保留多久。

只有这些答案被量化，“可自托管”才会从安装说明变成工程能力。

## 参考资料

1. [GPT Researcher v3.5.0 README（固定 commit）](https://github.com/assafelovic/gpt-researcher/blob/b364917f55ea579c47e5ef3f038f7e56f51213df/README.md)
2. [GPT Researcher v3.5.0 pyproject.toml](https://github.com/assafelovic/gpt-researcher/blob/b364917f55ea579c47e5ef3f038f7e56f51213df/pyproject.toml)
3. [GPT Researcher Apache-2.0 LICENSE](https://github.com/assafelovic/gpt-researcher/blob/b364917f55ea579c47e5ef3f038f7e56f51213df/LICENSE)
4. [GPT Researcher v3.4.0 发布说明](https://github.com/assafelovic/gpt-researcher/releases/tag/v3.4.0)
5. [GPT Researcher MCP Server](https://github.com/assafelovic/gptr-mcp)
6. [DeepResearchGym 论文](https://arxiv.org/abs/2505.19253)

## 补充相关文章

- [开源的阶段性成长指南](/zh/growth/posts/stage-growth-of-open-source/)
- [一份完整的开源贡献指南](/zh/engineering/posts/open-source-contribution-guidelines/)
- [我的实践总结：开源社区的规范设计思路](/zh/engineering/posts/advanced-githook-design/)
- [在开源社区中学会如何提问](/zh/engineering/posts/the-art-of-asking-questions-in-open-source-communities/)
