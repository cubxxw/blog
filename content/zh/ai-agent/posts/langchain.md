---
url: "/zh/projects/langchain/"
title: "LangChain 1.x 生产实践：模型、Agent 与 LangGraph 如何选"
date: 2025-04-16T17:36:46+08:00
lastmod: 2026-07-31T10:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Open Source
  - LangChain
  - Agent
  - RAG
  - Python
  - LLM
categories:
  - Development
description: >
  这是一份面向生产环境的 LangChain 1.x 工程指南：从直接调用模型、create_agent 到 LangGraph，给出清晰选型边界、可运行的 RAG 与智能体示例、人机审批设计，以及评估、权限、状态和可观测性检查清单，帮助团队避开旧 API、过度抽象与不可控的自动化，引入框架时为长期维护保留清晰路径。
cover:
  image: "/images/covers/ai-agent/2025/langchain.png"
  alt: "模型、智能体与图工作流沿三条路径汇合的克制编辑插画"
  relative: false
aliases:
  - /zh/posts/ai-projects/langchain/
tldr:
  - "从能暴露问题的最小抽象开始：一次推理直接调用模型，标准工具循环使用 create_agent，只有控制流本身成为产品需求时才引入 LangGraph。"
  - "LangChain 1.x 的主线是构建在 LangGraph 之上的 Agent 框架；langchain-core 提供消息、模型、工具和 Runnable 接口，旧式 Chain API 已移入 langchain-classic。"
  - "生产质量来自明确契约、检索评估、受限工具、持久状态、关键操作的人类审批，以及能同时解释输出与成本的追踪，而不是更厚的框架抽象。"
---

过去介绍 LangChain，常会列出 Chain、Memory、Prompt、Loader 和各种集成。那段历史没有错，却已经不适合指导今天的项目。

截至 2026 年 7 月，理解 LangChain 1.x 可以简单得多：

- 任务只是一次输入明确、输出可校验的推理，**直接调用模型**。
- 模型确实需要在若干工具中选择，并根据工具结果继续判断，使用 **`create_agent`**。
- 业务要求持久状态、显式分支、重试、并行、长时等待或人工决策，使用 **LangGraph**。

这不仅是 API 分类，更是一条工程原则：每增加一层框架，就会在产品旁边再造一个执行系统——新的心智模型、新的术语，也多一个藏住故障的地方。抽象只有在让真实系统更容易理解和运维时，才值得存在。

本文只讲 LangChain 1.x。`LLMChain`、`ConversationChain`、`AgentExecutor`、旧 Memory 层次和早期 PaLM 集成仍会出现在搜索结果里，但新项目不应从那里起步。

## 先建立 1.x 的心智模型

LangChain 1.x 是高层 Agent 框架，默认入口 `create_agent` 运行在 LangGraph 之上。生态中的每一层各有边界：

| 层次 | 适合做什么 | 不适合做什么 |
|---|---|---|
| 模型 SDK 或 `init_chat_model` | 单次模型调用、结构化输出、分类、抽取、改写 | 需要工具选择或持久状态的流程 |
| `langchain-core` | 消息、工具、文档、模型接口、Runnable | 完整应用架构 |
| `langchain` / `create_agent` | 带中间件的标准模型—工具循环 | 有许多显式状态和分支的业务流程 |
| LangGraph | 可持久化、可恢复、状态明确的工作流 | 一次提示加一次模型回复 |
| LangSmith | 追踪、数据集、评估与监控 | 替代应用日志、权限控制或业务指标 |

模型提供方通常在独立包中，例如 `langchain-openai`。部分社区集成位于 `langchain-community`；若存在提供方维护的合作包，生产项目应优先选它。拆包让核心依赖更小，也让集成可以独立发版。

“LangChain 有很多连接器”已不足以成为采用它的理由。连接器也许省下一下午，执行模型却可能塑造未来几年的代码结构。

## 真正重要的选型

### 1. 直接调用模型

同时满足以下条件时，用提供方 SDK，或 LangChain 的统一模型接口：

- 应用只进行一次边界清楚的推理；
- 所需输入已经准备好；
- 输出能用 schema 校验；
- 不需要模型选择并执行副作用；
- 重试只是普通请求重试，而不是推理循环。

分类、实体抽取、翻译、查询改写，以及根据已给上下文起草答案，都属于这类任务。直接调用的栈最短、依赖最少，成本也最容易解释。

若团队看重统一消息接口与模型可替换性，可以使用 `init_chat_model`：

```python
from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model


class Triage(BaseModel):
    category: str = Field(description="billing, technical, or account")
    urgency: int = Field(ge=1, le=5)
    reason: str


model = init_chat_model("openai:gpt-4.1-mini", temperature=0)
classifier = model.with_structured_output(Triage)

result = classifier.invoke(
    "I was charged twice and need the duplicate payment reversed today."
)
print(result)
```

这是符合 LangChain 1.x 结构的完整示例，需要有效的提供方密钥，以及账号可用的模型。真实服务还应锁定依赖版本，在系统边界再次校验结果，并记录模型名、延迟、token 用量和 schema 失败。

不要因为产品文档里出现了“智能”二字就添加 Agent。如果代码已经知道下一步做什么，就把那一步写成代码。

### 2. 使用 `create_agent`

只有当模型确实需要选择工具、读取结果，再决定是否继续调用工具时，`create_agent` 才合适。例如：

- 回答前需要检索政策文档的客服助手；
- 查询多个只读系统的运维助手；
- 在外部搜索和内部数据之间选择的研究助手；
- 偶尔需要计算器或数据库查询的写作助手。

它的循环并不神秘：消息进入，模型可能请求工具，运行时执行工具，再把结果交还模型，直到模型给出最终答案。1.x 的中间件可在循环周围实现日志、模型路由、动态提示、工具过滤、摘要和人工审批。

但 `create_agent` 绝不等于把整个基础设施账号暴露成工具。工具设计仍然是普通的安全工程：

- 每个工具只承担一个可读懂的职责；
- 参数有明确类型；
- 权限在工具内部校验，绝不依赖提示词；
- 读工具与写工具分开；
- 写操作尽可能幂等；
- 返回紧凑结果，不倾倒整张数据库表；
- 设置超时和输出上限；
- 把工具描述当作面向模型的 API 文档。

### 3. 使用 LangGraph

当工作流本身成为产品规格的一部分，才引入 LangGraph。典型信号包括：

- 某一步要暂停数分钟或数天，之后恢复；
- 不同状态允许不同操作；
- Agent 前后必须运行确定性代码；
- 失败要按状态恢复，而不是整条链重跑；
- 多个任务要并行执行再汇合；
- 审核者可以批准、编辑或拒绝；
- 系统需要检查或回放历史状态；
- Agent 循环只是更大流程中的一个节点。

LangGraph 提供节点、边、状态、持久化、中断与恢复。它比 `create_agent` 更底层，这种控制力只有在确实需要时才有价值。两节点的直线流程，普通 Python 函数通常更清楚。

我在评审里采用一个朴素规则：**先画状态，再导入 LangGraph**。图中若真的存在有意义的分支、等待点和恢复路径，图模型可能让设计更清晰；若只有一条直线，图只是装饰。

## 一套一致的最小环境

下面示例面向 Python 1.x 这一代包：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install \
  "langchain>=1,<2" \
  "langchain-openai>=1,<2" \
  "langgraph>=1,<2"

export OPENAI_API_KEY="your-key"
```

版本范围只是为了说明这些导入属于同一代架构。生产项目应锁定解析后的精确版本，并通过经过测试的依赖升级来更新。模型标识和账号可用性会独立变化，所以模型名应放进配置，而不是散落在代码里。

## 不要把 RAG 仪式化

RAG 默认不是 Agent。应用已经知道步骤：检索证据、整理上下文、让模型依据证据回答。让模型判断“是否需要检索”，往往只是增加成本，让 grounding 更难预测。

下面使用内存向量库，方便看清结构。它可以在安装上述依赖、配置有效凭证后运行，但不是生产索引：

```python
from langchain.chat_models import init_chat_model
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_openai import OpenAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore


documents = [
    Document(
        page_content=(
            "Refund requests are accepted within 30 days of purchase. "
            "Approved refunds return to the original payment method."
        ),
        metadata={"source": "refund-policy", "revision": "2026-06"},
    ),
    Document(
        page_content=(
            "Enterprise plans include priority support. The target first "
            "response time for critical incidents is one hour."
        ),
        metadata={"source": "support-policy", "revision": "2026-05"},
    ),
]

store = InMemoryVectorStore.from_documents(
    documents=documents,
    embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
)
retriever = store.as_retriever(search_kwargs={"k": 2})


def format_documents(docs: list[Document]) -> str:
    return "\n\n".join(
        f"[{doc.metadata['source']}]\n{doc.page_content}" for doc in docs
    )


prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Answer only from the supplied context. If the context is "
            "insufficient, say what information is missing. Cite source ids.",
        ),
        ("human", "Question: {question}\n\nContext:\n{context}"),
    ]
)
model = init_chat_model("openai:gpt-4.1-mini", temperature=0)

rag = (
    {
        "context": retriever | RunnableLambda(format_documents),
        "question": RunnableLambda(lambda question: question),
    }
    | prompt
    | model
    | StrOutputParser()
)

print(rag.invoke("How long do I have to request a refund?"))
```

示例省略了文档加载、分块、持久化存储和访问控制。这些不是无关紧要的细节，恰恰构成了生产系统的大部分。

### 换模型前，先知道坏在哪里

RAG 的失败至少有六种：

1. **语料失败**：来源缺失、过期、重复或本不该被访问。
2. **分块失败**：答案与标题、表格或例外条件被切开。
3. **检索失败**：正确片段没有进入前几名。
4. **上下文失败**：大量弱证据稀释了关键证据。
5. **生成失败**：模型忽略或误读了正确上下文。
6. **引用失败**：答案看似有据，实际指向错误来源。

应从真实问题构建一个小型评估集，并标注支撑答案的文档。检索召回率与答案质量要分开测。如果正确证据从未进入提示词，继续雕刻提示词只是在布置舞台。

生产系统还要保留文档标识、版本、租户和权限元数据，并在检索前或检索中执行授权。检索后再过滤未授权结果，不仅可能让有效材料不足，还可能通过分数或时间差泄露信息。

## 一个带中间件的标准 Agent

下面的示例给 Agent 一个边界明确的只读工具，并用中间件记录模型请求：

```python
import logging
from langchain.agents import create_agent
from langchain.agents.middleware import wrap_model_call
from langchain.tools import tool


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("support-agent")


@tool
def lookup_order(order_id: str) -> str:
    """Return the status of one order visible to the current customer."""
    # 真实项目中替换为经过授权的 repository 调用。
    sample = {"A-100": "shipped", "A-101": "processing"}
    return sample.get(order_id, "not found")


@wrap_model_call
def log_model_request(request, handler):
    logger.info(
        "model_call messages=%s tools=%s",
        len(request.state["messages"]),
        len(request.tools),
    )
    return handler(request)


agent = create_agent(
    model="openai:gpt-4.1-mini",
    tools=[lookup_order],
    middleware=[log_model_request],
    system_prompt=(
        "You help customers check order status. Never invent an order state. "
        "Ask for an order id when it is missing."
    ),
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Where is order A-100?"}]}
)
print(result["messages"][-1].content)
```

字典里的订单状态是刻意构造的假数据，Agent 机制本身是真实的。生产环境应通过可信运行时上下文注入客户身份，并在 `lookup_order` 内部验证访问权；绝不能让模型提供用于授权的身份。

中间件适合承载横切策略：动态提示、上下文裁剪、模型回退、用量统计、工具筛选、防护与审批。业务规则仍应放在普通函数和领域服务里。若中间件栈复杂到没有人能在脑中执行，它只是在框架内部又造了一个遗留框架。

## 对关键工具做真正的人类审批

Human-in-the-loop 不是让模型生成一句“请确认”，而是在运行时阻止工具执行，直到有权限的人作出可记录的决定。

下面是一个 **1.x 的结构示意**。Agent 配置和恢复方式遵循 1.x 中间件与 LangGraph `Command` 模型，但中断数据如何呈现在界面中取决于具体应用；这段代码并不假装终端就是审批系统。

```python
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command


@tool
def send_refund(order_id: str, amount_cents: int) -> str:
    """Issue an approved refund for an order."""
    # 真实实现必须校验权限并保证幂等。
    return f"refund queued for {order_id}: {amount_cents} cents"


agent = create_agent(
    model="openai:gpt-4.1-mini",
    tools=[send_refund],
    middleware=[
        HumanInTheLoopMiddleware(
            interrupt_on={
                "send_refund": {
                    "allowed_decisions": ["approve", "edit", "reject"]
                }
            }
        )
    ],
    checkpointer=InMemorySaver(),
)

config = {"configurable": {"thread_id": "refund-case-42"}}
pending = agent.invoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "Refund 1999 cents for order A-100.",
            }
        ]
    },
    config=config,
)

# 应用读取 pending["__interrupt__"]，把拟执行的操作展示给
# 有权限的审核者，并记录审核决定。

resumed = agent.invoke(
    Command(resume={"decisions": [{"type": "approve"}]}),
    config=config,
)
print(resumed["messages"][-1].content)
```

持久工作应使用数据库支持的 checkpointer；`InMemorySaver` 只适合本地开发。恢复时必须沿用同一个 `thread_id`。审批界面要展示规范化后的精确参数、受影响资源、执行身份和预期副作用。高风险操作还应在恢复后重新验证权限和当前状态，因为等待期间世界可能已经改变。

审批是一道控制，不是万能药。疲惫的人面对不透明 JSON 机械地点击“同意”，只是一套更慢的自动系统。

## 什么时候值得显式使用 LangGraph

假设内容发布流程需要调研、起草、规则检查、等待编辑审核，然后发布或退回修改：

```text
research -> draft -> policy_check
                      | pass
                      v
                 editor_review --approve--> publish
                      |
                    revise
                      v
                    draft
```

这是一个真正符合 LangGraph 形状的问题。节点可以混合确定性代码与模型调用，条件边编码规则结果，持久化允许编辑审核长时间等待，中断则建立人类边界。

图的价值尤其体现在局部恢复。若发布失败，应从发布节点恢复，而不是重新调研后悄悄生成另一篇稿子；若规则检查失败，应保存证据和原因。持久执行不是为了画漂亮的图，而是为了知道哪些工作已经发生，哪些工作可以安全地再次发生。

在构图前，先回答这些问题：

- 状态 schema 是什么，每个字段由哪个节点负责；
- 转移前必须成立哪些不变量；
- 哪些操作是幂等的；
- 每个节点怎样超时和重试；
- 部署升级后如何迁移状态；
- 哪些数据允许持久化；
- 谁能恢复一个中断的运行；
- 如何取消流程并补偿已经发生的副作用。

如果这些问题显得过于正式，这也是重要信号：流程可能还不适合自治。

## LCEL 去了哪里

Runnable 接口和 LCEL 仍然适合在 LangChain Core 中组合确定性的模型数据流。提示、模型和解析器可以继续用 `|` 连接，Runnable 也支持同步、异步、批处理和流式执行。

但 LCEL 不再是所有架构问题的答案。应用控制顺序的数据流适合 LCEL；标准 Agent 循环适合 `create_agent`；显式有状态编排适合 LangGraph。

弄清这个边界，可以避免把分支、记忆、审批和重试硬塞进一条 Chain，直到它悄悄长成一台工作流引擎。

## LangServe 已不是未来路径

LangServe 曾能方便地把 Runnable 暴露为 FastAPI 端点。如今官方仓库已经归档，项目也不再是新开发的推荐方案。已有服务可以继续维护，但 2026 年的新架构不应再把 LangServe 当作部署基础。

简单模型或 RAG 接口，应使用团队已经理解的 Web 框架和运维栈。对于有状态 LangGraph 应用，则需要按照持久化、网络、数据驻留、可观测性、成本和锁定风险评估当前部署选项。开源 LangGraph 库与商业托管产品是两项独立决策。

这次弃用提醒我们：生成端点一直是容易的部分。生产部署还包括认证、配额、schema 演进、取消、流式背压、发布、审计日志和故障响应。框架辅助工具能缩短起步时间，却不能替团队承担这些责任。

## 生产检查清单

### 契约与状态

- 用 schema 校验模型输出，不要用充满希望的正则解析散文。
- 为提示词、工具 schema 和状态 schema 建立版本。
- 持久业务状态不要藏在聊天记录里。
- 通过明确的保留或摘要策略限制上下文增长。
- 把持久化的 Agent 状态视为敏感应用数据。

### 工具与副作用

- 每次工具调用都在代码中授权。
- 优先使用窄工具，不暴露通用 Shell、SQL、HTTP 或文件系统能力。
- 对可能重试的写操作使用幂等键。
- 昂贵或不可逆操作应把规划与执行分开。
- 关键操作要求运行时审批。
- 长时间暂停后重新检查外部状态。

### 可靠性

- 为模型、工具和端到端流程设置超时。
- 限制迭代次数、token、检索文档数和工具输出。
- 明确定义可重试错误，不重试非法请求或策略拒绝。
- 只在行为经过评估时引入回退，不要因为框架支持就启用。
- 支持取消，并诚实展示部分进度。

### 评估与可观测性

- 追踪模型调用、工具调用、检索、延迟、token 和错误。
- 导出 trace 前清除密钥与个人数据。
- 从真实故障中建设回归数据集。
- 分别评估检索与生成。
- 让在线质量检查与产品指标同时存在。
- 特别复盘那些“答案正确但理由错误”的 trace。

LangSmith 可以追踪和评估 LangChain、LangGraph，也能接入非 LangChain 应用。它很有用，但不能替代服务指标、安全日志和数据治理决策。哪些数据可以离开环境，必须由团队明确决定。

## 我会避开的五种失败模式

### 一开始就使用 Agent

Agent 让演示显得有生命力，于是团队很容易从它起步。后来才发现，大多数步骤其实完全确定：读取账户、检查规则、计算结果、请求审批。把这些步骤改回代码，系统更便宜也更容易测试；只有存在语言歧义的地方才需要模型。

### 把对话当成记忆

消息列表只是上下文，不是完整的记忆架构。生产记忆必须有归属、过期、来源、更正和删除机制。事实放在领域系统中，只为当前任务检索必要部分。

### 用 import 掩盖迁移

旧教程中的类可能已迁入 `langchain-classic`，或被新入口替代。把它们复制进 1.x 项目，会制造一套意外的混合架构。应阅读当前迁移文档，选择同一代 API，并隔离仍无法移除的旧路径。

### 只评估最终答案

答案可能正确，却检索了错误文档；Agent 可能完成任务，却多调用五次工具；图可能从错误中恢复，却重复执行了副作用。评估的不只是终点，还有抵达终点的路径。

### 把模型可替换性当作免费能力

统一接口只让替换模型在语法上更容易，不代表行为等价。提供方在工具调用、结构化输出、流事件、分词、安全策略和失败方式上都不同。换模型需要一轮评估，而不是只改配置。

## 一条稳健的采用顺序

新团队可以按这个顺序引入生态：

1. 用直接模型调用和结构化输出，完成最小但有价值的路径。
2. 在增加编排前，先加入 trace 和回归数据集。
3. 只有任务需要外部证据时才引入检索，并单独评估检索。
4. 只有模型选择工具能改善任务时才引入 `create_agent`。
5. 用中间件承载 Agent 循环中的公共策略。
6. 在关键工具上线前加入持久 checkpoint 和人工审批。
7. 当状态转移与恢复路径已成为领域概念，再迁移到显式 LangGraph。

这条路线刻意保守，因为它在每一步都保留退路。经过测试的普通函数，随时可以被包进图节点；要从不透明的 Agent 循环里重新抽取可靠业务逻辑，困难得多。

## 结语

当我们不再问“项目是否使用 LangChain”，转而追问“哪一层值得存在”，LangChain 1.x 反而变得简单。

一次直接调用往往足够；`create_agent` 适合有边界的工具循环；当持久状态和显式控制流是需求，而不是装饰时，LangGraph 才是正确基础。LangSmith 可以让这些系统更可观察，但生产质量仍来自那些普通而坚硬的工程工作：契约、权限、测试、预算和恢复。

框架变化快，因为它贴近一条不断移动的边界。真正耐久的能力，不是记住框架表面所有 API，而是把不确定性安放在清楚的边界里。

Agent 不该让系统更神秘。它应当让一个困难的决定成为可能，并留下足够证据，让下一个工程师知道这个决定为何发生。

## 官方资料

- [LangChain 概览](https://docs.langchain.com/oss/python/langchain/overview)
- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangChain 中间件](https://docs.langchain.com/oss/python/langchain/middleware)
- [Human-in-the-loop 中间件](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph 持久化](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangChain 1.x 迁移指南](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [已归档的 LangServe 仓库](https://github.com/langchain-ai/langserve)
- [LangSmith 文档](https://docs.langchain.com/langsmith/home)

## 延伸阅读

- [LangChain 语言模型应用开发指南](/zh/ai-agent/posts/harnessing-language-model-applications-with-langchain-a-developer-is-guide/)
- [LangGraph：构建有状态 Agent 工作流](/zh/projects/langgraph/)
- [向量数据库学习笔记](/zh/ai-agent/posts/vector-database-learning/)
