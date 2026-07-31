---
title: 'LangChain 1.x 实战指南：从模型调用到可观测 Agent'
date: 2024-05-22T21:37:34+08:00
lastmod: 2026-07-31T10:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Agent
  - Python
  - RAG
  - Development
  - Automation
categories:
  - Development
description: >
  面向 Python 开发者的 LangChain 1.x 实战指南，覆盖模型初始化、工具调用、结构化输出、中间件，以及 LangGraph 记忆、RAG、SQL Agent、Ollama 本地模型和 LangSmith 追踪。文章提供 API 迁移表、可运行代码与排错清单，帮助你避开过时示例，构建可维护的智能体应用。
cover:
  image: /images/covers/ai-agent/2024/harnessing-language-model-applications-with-langchain-a-developer-is-guide.png
  alt: 'LangChain 1.x 模型、Agent、记忆与可观测性工程架构'
  relative: false
tldr:
  - 'LangChain 1.x 的主线不再是堆叠 Chain，而是用统一模型接口、create_agent、工具和中间件构建可组合的 Agent。'
  - '短期记忆由 LangGraph checkpointer 按 thread_id 保存，跨会话的长期记忆由 store 按 namespace 管理；生产环境不能继续使用内存实现。'
  - 'RAG、SQL 与 Ollama 都是可替换的集成层，真正决定系统质量的是检索、权限、状态、追踪和评测，而不是框架调用本身。'
faq:
  - q: 'LangChain 1.x 和旧版最大的区别是什么？'
    a: 'create_agent 成为标准 Agent 入口，动态提示、错误处理、人工审批等横切能力统一进入 middleware；旧 chains、retrievers 和 hub 等能力迁移到 langchain-classic。'
  - q: 'LangChain 和 LangGraph 应该怎样选择？'
    a: '先用 LangChain 的模型与 create_agent 完成常见应用；只有在需要自定义节点、条件边、恢复执行或复杂状态机时，才直接使用 LangGraph。create_agent 本身已经运行在 LangGraph 之上。'
  - q: 'LangChain 的记忆为什么需要 thread_id？'
    a: 'checkpointer 用 thread_id 隔离每段对话的状态。相同 thread_id 可以续接短期记忆；跨 thread 共享的用户偏好则应写入 store，并用 user_id 等稳定标识组成 namespace。'
  - q: '生产环境可以使用 InMemorySaver 和 InMemoryStore 吗？'
    a: '不建议。它们适合本地演示和测试，进程退出后数据会消失。生产环境应选择 PostgreSQL、Redis、MongoDB 等持久化实现，并完成迁移、加密、备份和数据保留策略。'
---

> 一个框架最危险的时刻，不是它没有能力，而是旧教程仍然看起来能够运行。代码一旦跨过版本边界，熟悉感往往比报错更会误导人。

这篇文章只讨论 **LangChain Python 1.x** 的当前主线：模型、Agent、工具、结构化输出、中间件、记忆、RAG、SQL、Ollama 与 LangSmith。它不再复述 LangChain 的项目历史，也不把几十种组件罗列成字典；目标是让你拿到一条短而完整的工程路径。

文中代码以 **Python 3.10+、`langchain>=1.0`、`langgraph>=1.0`** 为基线。模型名称和服务端能力变化更快，因此示例把它们放进环境变量，而不是假装某个模型会永远存在。

## 先建立正确的心智模型

LangChain 1.x 可以看成四层：

1. **标准接口**：消息、Chat Model、Embedding、Tool 等统一协议。
2. **Agent 层**：`create_agent` 负责模型—工具循环，middleware 负责上下文工程与护栏。
3. **LangGraph 运行时**：提供状态、持久化、流式输出、人工介入与失败恢复。`create_agent` 就构建在它之上。
4. **LangSmith 工程闭环**：记录 trace，支持调试、评测和线上监控。

这四层的关系不是“功能越多越好”。一次分类任务只需要模型和结构化输出；有外部动作时再引入 Agent；需要恢复执行和复杂状态机时才直接下沉 LangGraph。复杂度应该由问题产生，而不是由框架诱导。

## 安装与环境

最小 OpenAI 路径：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U "langchain>=1.0,<2" "langgraph>=1.0,<2" \
  "langchain-openai>=1.0,<2" pydantic

export OPENAI_API_KEY="..."
export MODEL_NAME="openai:你的模型名"
```

LangChain 1.x 要求 Python 3.10 或更高版本。提供商集成是独立包：OpenAI 用 `langchain-openai`，Ollama 用 `langchain-ollama`。不要为了一个模型安装整个社区包，也不要把密钥写进源码。

锁定主版本不是为了永远不升级，而是让一次部署可复现。应用应提交 lockfile，并让升级经过测试集，而不是在生产启动时执行无上限的 `pip install -U`。

## 第一步：统一模型接口

如果代码需要在不同提供商之间切换，优先使用 `init_chat_model`：

```python
# model_call.py
# Requires: Python>=3.10, langchain>=1.0, langchain-openai>=1.0
import os

from langchain.chat_models import init_chat_model

model = init_chat_model(
    os.environ["MODEL_NAME"],
    temperature=0,
    timeout=30,
    max_retries=2,
)

response = model.invoke(
    [
        ("system", "你是严谨的技术编辑；不确定时明确说明。"),
        ("user", "用三句话解释 Agent 与固定工作流的区别。"),
    ]
)
print(response.text)
```

如果只使用 OpenAI，并且需要它特有的参数，可以直接实例化集成类：

```python
import os
from langchain_openai import ChatOpenAI

model = ChatOpenAI(
    model=os.environ["OPENAI_MODEL"],
    temperature=0,
    timeout=30,
    max_retries=2,
)
print(model.invoke("给出一个可验证的结论，而不是口号。").text)
```

两种方式并不冲突：`init_chat_model` 优先考虑可替换性，`ChatOpenAI` 优先考虑提供商特性。注意 1.x 中消息文本使用 `.text` 属性；旧资料中的 `.text()` 已进入迁移期。

## 第二步：用 `create_agent` 组织工具循环

Agent 的价值不在于“自主”，而在于它能根据输入选择工具，并把工具结果带回下一次模型调用。工具边界必须窄、输入必须有类型、docstring 必须说清适用条件。

```python
# agent_demo.py
# Requires: Python>=3.10, langchain>=1.0, langchain-openai>=1.0
import os

from langchain.agents import create_agent
from langchain.tools import tool


@tool
def calculate_total(unit_price: float, quantity: int) -> float:
    """仅用于计算不含税总价。quantity 必须是正整数。"""
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    return round(unit_price * quantity, 2)


agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[calculate_total],
    system_prompt=(
        "你是采购助手。涉及乘法时必须调用工具；"
        "不要编造税率、库存或折扣。"
    ),
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "单价 19.9 元，买 7 件，共多少？"}]}
)
print(result["messages"][-1].text)
```

这段代码故意没有让工具“顺便”读取数据库或发起支付。读取、计算、写入应是不同权限等级的工具；任何不可逆动作都应加入幂等键、审计日志和人工确认。把巨大函数包成 `@tool`，不会自动得到可靠的 Agent。

## 第三步：让输出成为数据，而不是待解析的文字

下游要写数据库、调用 API 或驱动 UI 时，使用结构化输出。把 Pydantic 类型直接交给 `response_format`，LangChain 会依据模型能力选择提供商原生策略或工具调用策略，最终结果位于 `structured_response`。

```python
# structured_agent.py
# Requires: Python>=3.10, langchain>=1.0, pydantic>=2
import os

from langchain.agents import create_agent
from pydantic import BaseModel, Field


class Ticket(BaseModel):
    category: str = Field(description="billing、bug 或 question")
    priority: int = Field(ge=1, le=5)
    summary: str = Field(max_length=120)


agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[],
    response_format=Ticket,
    system_prompt="只根据用户提供的信息分诊，不补写事实。",
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "结账页重复扣款，订单 4172。"}]}
)
ticket: Ticket = result["structured_response"]
print(ticket.model_dump())
```

类型校验只能保证“形状正确”，不能保证事实正确。金额、日期、身份和权限仍需业务规则校验；模型输出也不应该直接拼进 SQL 或 shell。

## 第四步：middleware 承担横切能力

旧式教程常把重试、日志、动态模型选择和审批塞进 Agent 主循环。1.x 把这些职责收敛到 middleware：节点式 hook 适合前后校验和状态更新，wrap 式 hook 适合包围模型或工具调用。

下面用内置摘要中间件控制长对话。摘要本身也会调用模型，因此必须同时评估成本和信息损失：

```python
# middleware_demo.py
# Requires: Python>=3.10, langchain>=1.0
import os

from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware

agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[],
    middleware=[
        SummarizationMiddleware(
            model=os.environ["MODEL_NAME"],
            trigger={"tokens": 4000},
            keep={"messages": 12},
        )
    ],
    system_prompt="保留用户已确认的约束，不把推测写成事实。",
)
```

适合 middleware 的典型职责包括：

- 敏感信息脱敏、输入/输出护栏；
- 模型和工具重试，但必须设置次数与退避；
- 根据上下文选择模型或工具；
- 对高风险工具启用 human-in-the-loop；
- 记录耗时、token、错误类型和业务元数据。

中间件不是越多越安全。顺序会影响结果，重试可能放大副作用，摘要可能删除关键约束。每一层都要有独立测试。

## 记忆：checkpointer 与 store 不是一回事

“让机器人记住我”至少包含两个问题：

| 需求 | 机制 | 隔离键 | 生命周期 |
|---|---|---|---|
| 同一对话继续追问 | checkpointer | `thread_id` | 线程级短期状态 |
| 新对话仍记得偏好 | store | `(user_id, "memories")` 等 namespace | 跨线程长期数据 |

### 线程级短期记忆

`create_agent` 已运行在 LangGraph 上，可以直接传入 checkpointer：

```python
# short_memory.py
# Requires: Python>=3.10, langchain>=1.0, langgraph>=1.0
import os

from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[],
    checkpointer=InMemorySaver(),  # 仅用于本地开发与测试
)

config = {"configurable": {"thread_id": "demo-thread-42"}}
agent.invoke(
    {"messages": [{"role": "user", "content": "我偏好简洁答案。"}]},
    config,
)
result = agent.invoke(
    {"messages": [{"role": "user", "content": "我的回答偏好是什么？"}]},
    config,
)
print(result["messages"][-1].text)
```

换一个 `thread_id` 就是另一段对话。生产环境应使用数据库实现，例如 PostgreSQL checkpointer，并在部署阶段执行它要求的 `setup()` 或迁移；不要把内存实现误当作数据库。

### 跨线程长期记忆

LangGraph store 用 namespace 隔离数据：

```python
# long_memory_store.py
# Requires: Python>=3.10, langgraph>=1.0
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()  # 仅用于演示
namespace = ("user-17", "preferences")

store.put(namespace, "answer-style", {"value": "concise"})
items = store.search(namespace)
print(items[0].value["value"])
```

真实系统还要回答：谁能写记忆、何时遗忘、用户能否查看和删除、错误记忆如何纠正。长期记忆不是把整段聊天永久保存，而是经过筛选、带来源与时间的业务数据。

## RAG：先选架构，再选向量库

当前官方文档把 RAG 分成三类：

- **2-step RAG**：先检索，再生成。路径固定、延迟可预测，适合 FAQ 和内部文档问答。
- **Agentic RAG**：把检索器作为工具，由 Agent 决定何时搜索。灵活，但调用次数和延迟更不稳定。
- **Hybrid RAG**：增加查询改写、检索验证或答案校验，适合歧义较高、质量要求更严的场景。

最小 2-step RAG 不需要旧版 `RetrievalQA`。下面直接使用向量库的 retriever 接口：

```python
# rag_demo.py
# Requires: Python>=3.10, langchain>=1.0, langchain-openai>=1.0
import os

from langchain.chat_models import init_chat_model
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

documents = [
    Document(page_content="退款申请须在付款后七天内提交。", metadata={"id": "policy-1"}),
    Document(page_content="数字商品激活后不支持无理由退款。", metadata={"id": "policy-2"}),
]

vector_store = InMemoryVectorStore(OpenAIEmbeddings(model="text-embedding-3-small"))
vector_store.add_documents(documents)
retriever = vector_store.as_retriever(search_kwargs={"k": 2})
model = init_chat_model(os.environ["MODEL_NAME"], temperature=0)

question = "数字商品激活后还能无理由退款吗？"
hits = retriever.invoke(question)
context = "\n\n".join(
    f"[{doc.metadata['id']}] {doc.page_content}" for doc in hits
)
response = model.invoke(
    [
        ("system", "只根据给定资料回答；证据不足就说不知道，并引用资料编号。"),
        ("user", f"资料：\n{context}\n\n问题：{question}"),
    ]
)
print(response.text)
```

内存向量库只适合示例。上线前至少评测切块、召回率、元数据过滤、权限继承、引用正确率和无答案场景。RAG 的主要风险常常不是模型，而是检索到了错误版本，或把用户无权访问的文档送进上下文。

## SQL Agent：让模型查询，不让模型拥有数据库

官方 SQL Agent 流程会查看表、读取 schema、生成并检查 SQL、执行后根据错误修正。它适合探索式分析，却不应默认连接生产写库。

推荐边界：

1. 使用只读数据库账号和只读副本；
2. 只暴露允许的表与列，敏感字段在数据库层屏蔽；
3. 设置查询超时、行数与资源上限；
4. 对生成 SQL 做审计，禁止 DDL/DML；
5. 把恶意单元格内容视为不可信输入，防止间接提示注入。

当前入口是 `SQLDatabaseToolkit` 提供工具，再交给 `create_agent`，而不是旧版 `initialize_agent`：

```python
# sql_agent.py
# Requires: Python>=3.10, langchain>=1.0,
#           langchain-community>=0.4, langchain-openai>=1.0
import os

from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langchain_community.utilities import SQLDatabase

db = SQLDatabase.from_uri("sqlite:///analytics-readonly.db")
model = init_chat_model(os.environ["MODEL_NAME"], temperature=0)
toolkit = SQLDatabaseToolkit(db=db, llm=model)

agent = create_agent(
    model=model,
    tools=toolkit.get_tools(),
    system_prompt=(
        "你只能执行只读查询。先查看可用表与 schema；"
        "查询最多返回 20 行；禁止 INSERT、UPDATE、DELETE、DROP、ALTER。"
    ),
)
result = agent.invoke(
    {"messages": [{"role": "user", "content": "按月统计最近一年的订单量。"}]}
)
print(result["messages"][-1].text)
```

提示词不是权限系统。示例中的“禁止写入”必须由只读账号、网络策略和数据库权限共同兑现。

## Ollama：替换模型端，不等于消除工程问题

本地模型通过独立的 `langchain-ollama` 包接入：

```bash
pip install -U "langchain-ollama>=1.0,<2"
ollama pull llama3.1
```

```python
# ollama_demo.py
# Requires: Python>=3.10, langchain-ollama>=1.0
from langchain_ollama import ChatOllama

model = ChatOllama(model="llama3.1", temperature=0)
print(model.invoke("用一句话解释可重复构建。").text)
```

如果所选 Ollama 模型支持工具调用，也可以把该实例传给 `create_agent`。但“能传入”不等于“工具调用质量合格”；必须用自己的 schema、中文输入、并发和上下文长度做验收。自托管省下的 API 费用，可能会转化成显存、吞吐、升级和运维成本。

## LangSmith：先看见，再优化

`create_agent` 原生支持 LangSmith tracing。开启追踪只需环境变量：

```bash
export LANGSMITH_TRACING="true"
export LANGSMITH_API_KEY="..."
export LANGSMITH_PROJECT="langchain-production"
```

Trace 会记录模型调用、工具调用与 Agent 决策路径，适合定位“为什么调用了错误工具”“哪一步延迟过高”。但可观测性不等于评测：trace 回答发生了什么，数据集和评分器才回答结果是否足够好。

生产闭环至少包含：

- 固定回归集：正常请求、边界输入、拒答和恶意输入；
- 任务指标：正确率、工具选择、引用支持率和人工接管率；
- 系统指标：端到端延迟、token、成本、重试和错误分布；
- 版本元数据：prompt、模型、工具 schema、检索索引与代码版本；
- 隐私策略：脱敏、访问控制、保留期限和删除机制。

不要把密钥、完整个人信息或数据库结果无条件写入 trace。调试能力也必须受数据边界约束。

## 从 0.x 迁移：只保留一张表

| 旧写法或旧心智 | LangChain 1.x 路径 |
|---|---|
| `OpenAI` 文本补全类处理聊天 | `ChatOpenAI` 或 `init_chat_model` |
| `initialize_agent` / 旧 AgentExecutor 教程 | `langchain.agents.create_agent` |
| `langgraph.prebuilt.create_react_agent` | `langchain.agents.create_agent` |
| `prompt=` | 静态提示用 `system_prompt=`，动态提示用 middleware |
| 手工解析“请返回 JSON” | `response_format=Schema`，按能力选 Provider/Tool Strategy |
| `ConversationBufferMemory` 塞进 chain | checkpointer + `thread_id` 管短期状态 |
| 把所有历史长期拼进 prompt | store + namespace 管跨线程记忆 |
| `LLMChain`、`ConversationChain` | 新代码优先模型/Agent/LCEL；兼容旧代码用 `langchain-classic` |
| 从 `langchain.retrievers` 导入旧 retriever | 迁到相应集成包；暂时兼容时使用 `langchain-classic` |
| 工具异常在主循环里捕获 | 用 `wrap_tool_call` middleware 统一处理 |

`langchain-classic` 是迁移缓冲区，不是新项目的默认起点。先让旧系统在独立依赖组中稳定，再逐个替换边界，并用行为测试比较升级前后结果。

## 一份真正有用的上线清单

### 代码与依赖

- Python 版本、主依赖和 provider 包已锁定；
- 所有 import 来自当前命名空间，没有复制 0.x 示例；
- 超时、重试、并发和 token 上限显式配置；
- 工具参数有类型、描述、权限和幂等设计。

### 状态与安全

- 每个会话有稳定且不可猜测的 `thread_id`；
- `user_id` 与 namespace 在服务端注入，不信任客户端自报；
- 生产使用持久化 checkpointer/store，并有迁移、备份和删除方案；
- SQL、文件、网络和写操作由基础设施限制，而不只靠提示词。

### 质量与运维

- RAG 评测召回、引用与无答案，而不只看回答是否流畅；
- 工具副作用在重试和恢复时仍保持幂等；
- LangSmith trace 带版本元数据，敏感字段已脱敏；
- 发布前跑固定数据集，发布后监控成本、延迟和人工接管率。

## 最后的判断

LangChain 1.x 的价值不是替你决定架构，而是把模型、工具、状态和可观测性放进一组稳定接口。真正的工程工作仍然是划清边界：哪些事实来自检索，哪些动作需要权限，哪些状态值得保存，失败之后从哪里恢复。

我更愿意从一个模型调用开始，只在需求出现时增加一层。系统的成熟，不在于接入多少组件，而在于删掉任何一层之后，你都清楚失去了什么。

## 官方资料

- [LangChain 安装与 Python 版本要求](https://docs.langchain.com/oss/python/langchain/install)
- [Models：`init_chat_model` 与统一调用接口](https://docs.langchain.com/oss/python/langchain/models)
- [Agents：`create_agent`、工具与 middleware](https://docs.langchain.com/oss/python/langchain/agents)
- [Structured output](https://docs.langchain.com/oss/python/langchain/structured-output)
- [LangChain v1 迁移指南](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [LangGraph persistence 与 store](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Retrieval 与 RAG 架构](https://docs.langchain.com/oss/python/langchain/retrieval)
- [SQL Agent 官方教程](https://docs.langchain.com/oss/python/langchain/sql-agent)
- [ChatOllama 集成](https://docs.langchain.com/oss/python/integrations/chat/ollama)
- [LangSmith observability](https://docs.langchain.com/oss/python/langchain/observability)
