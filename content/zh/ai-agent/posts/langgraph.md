---
url: "/zh/projects/langgraph/"
title: "2026 LangGraph 架构指南：StateGraph、持久化与故障恢复"
date: 2025-04-19T15:19:20+08:00
lastmod: 2026-07-31T18:11:30+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Python
  - Open Source
  - Project Learning
categories:
  - Development
description: >
  面向 2026 年生产实践的 LangGraph 架构指南：解释 StateGraph 的状态、节点与边，演示检查点、thread_id、interrupt 与 Command 恢复流程，并用退款审批故障路径说明幂等副作用、重试边界和持久化责任，帮助团队判断何时从 create_agent 下沉到 LangGraph。
aliases:
  - /zh/posts/ai-projects/langgraph/
  - /zh/ai-agent/posts/langgraph/
tldr:
  - "LangGraph 是面向长时间运行、有状态 Agent 的底层编排框架；状态、节点与边共同组成可检查的执行图。"
  - "它真正的价值是持久执行：通过检查点、恢复、人工审批、流式输出、记忆与追踪，让工作流在失败和等待之后继续运行。"
  - "先从模型 API、LangChain create_agent 或 Deep Agents 开始；只有显式状态、恢复语义、interrupt 或定制控制流确实需要时，才直接使用 StateGraph。"
faq:
  - q: "LangGraph 是什么？"
    a: "LangGraph 是 LangChain 生态中的底层 Agent 编排框架与运行时，用来构建长时间运行、有状态的工作流。它不替你设计提示词，而是提供持久执行、流式输出、人工介入和显式状态转换等基础能力。"
  - q: "LangGraph 的核心概念是什么？"
    a: "核心是状态、节点和边：状态保存步骤间共享的数据，节点执行单一工作并返回状态更新，边决定下一步运行哪个节点。开发者用 StateGraph 组装三者，再通过 compile() 得到可执行图。"
  - q: "LangGraph 与 LangChain 有什么区别？"
    a: "LangChain 提供模型、工具集成和较高层的 create_agent API，其标准 Agent 运行在 LangGraph 之上；LangGraph 则让开发者直接拥有状态模式、路由、检查点、interrupt 与恢复语义。LCEL 是 Runnable 组合接口，不应简单等同为 DAG 产品。"
  - q: "什么时候应该直接使用 LangGraph？"
    a: "当应用需要显式状态转换、自定义循环或路由、持久检查点、人工审批，或者长任务在进程失败后恢复时，直接使用 LangGraph 才有明确收益。单次模型调用或标准工具循环通常不需要下沉到这一层。"
  - q: "LangGraph 的检查点能避免重复副作用吗？"
    a: "不能自动避免。恢复时节点或任务可能重放，interrupt 所在节点也会从头重新执行，因此外部 API、数据库写入和付款等副作用仍须使用幂等键、事务或去重记录保护。"
cover:
  image: /images/covers/ai-agent/2025/langgraph.jpeg
  alt: "带检查点、人工审批与恢复路径的 LangGraph 状态图"
---

> 这个项目是一场持续的开源学习：每天向前一点，用真实项目训练解决复杂问题的能力，也把判断变化的过程留下来。
> [项目学习清单](https://traveling-thistle-a0c.notion.site/Open-Source-Project-Learn-1d2a444a6c008030a24efaa0e3bf5f5c?pvs=4)

![LangGraph 有状态 Agent 图](/images/projects/langgraph-state-machine.svg)

**项目信息**

- 项目：LangGraph
- 仓库：[langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- 主要技术：Python、JavaScript/TypeScript、LangChain、LangSmith、检查点存储与模型供应商 API

## 1. LangGraph 真正解决的是什么

LangGraph 是 LangChain 生态中的底层编排框架与运行时。一个 Agent 需要保存带类型的状态、循环或分支、等待人工确认、从进程故障中恢复，或者把每次状态转换暴露给追踪和测试时，它才开始有价值。使用 LangGraph 并不强制使用 LangChain 的模型抽象。

它的核心想法并不浪漫，却很实用：把应用建模成图。节点负责做事，边决定下一步，状态只携带后续步骤真正需要的数据。图不会让模型突然变聪明；它只是让模型周围的系统更容易检查、测试和恢复。

我现在判断一个 Agent 架构时，会先问一个朴素的问题：**进程在任意外部调用之后死掉，系统接下来会发生什么？** 如果答案只能靠运气，画得再漂亮的图也不是可靠架构。

## 2. 先选择抽象层，再选择 LangGraph

截至 2026 年 7 月，官方开源栈提供了几种不同入口。它们彼此相关，但不应混为一谈：

| 层级 | 适合从这里开始的情况 | 需要自己承担的部分 |
|---|---|---|
| 模型供应商 API | 一次调用、结构化输出或很小的工具循环已经足够 | 循环、消息、重试与持久化 |
| LangChain `create_agent` | 需要标准的模型加工具 Agent，以及中间件和集成 | 工具、提示词、中间件与产品行为 |
| Deep Agents | 需要规划、子 Agent、文件系统工具和上下文管理等现成 harness | 领域工具、策略、评测与部署 |
| 直接使用 LangGraph | 状态机本身就是产品逻辑 | 状态模式、节点、路由、interrupt 与恢复语义 |

`create_agent` 运行在 LangGraph 之上，Deep Agents 又在其上提供更有主张的 harness。直接使用 `StateGraph` 意味着亲自承担更多编排责任，并不天然“更高级”。只有当我能说出高层接口无法清楚表达的状态转换或恢复规则时，才会下沉到这一层。

LCEL 属于另一类比较。它是 `Runnable` 的组合接口，支持顺序、并行、路由、重试和回退。很多 LCEL 流程确实没有环，但把 LCEL 简化成“DAG 层”会掩盖它真正的角色；LCEL 也可以运行在 LangGraph 节点内部。

## 3. StateGraph：状态、节点与边

LangGraph 围绕三个原语展开：

| 原语 | 作用 | 应回答的工程问题 |
|---|---|---|
| State | 图中的共享数据快照 | 哪些信息必须跨步骤保留？ |
| Node | 返回状态更新的函数或 Runnable | 哪项工作应该被隔离并独立测试？ |
| Edge | 从一个节点到另一个节点的路由规则 | 哪个决定控制下一步？ |

`StateGraph` 构建器负责定义图，`compile()` 再生成可执行对象。运行时采用受 Pregel 启发的消息传递模型：活跃节点在 super-step 中运行，产生状态更新，并激活后续节点。

状态模式才是最重要的设计选择，节点名称只是其表象。状态过于松散，每个节点都会依赖隐含约定；状态过于宽大，图又会迅速失去可推理性。一个好的图通常从很小的 `TypedDict` 或 Pydantic 模型开始，只在真实节点需要时才增加字段。

下面是一个可独立阅读的最小示例。`audit` 使用带注解的 reducer，让不同节点返回的记录被追加而不是覆盖；checkpointer 用 `thread_id` 关联状态快照；审核节点通过 `interrupt()` 暂停，再由 `Command` 恢复。

```python
from operator import add
from typing import Annotated, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt


class State(TypedDict):
    request: str
    draft: str
    audit: Annotated[list[str], add]


def write_draft(state: State) -> dict:
    return {
        "draft": f"Proposed response to: {state['request']}",
        "audit": ["drafted"],
    }


def review(state: State) -> dict:
    approved = interrupt(
        {"question": "Publish this draft?", "draft": state["draft"]}
    )
    return {"audit": [f"human_approved={bool(approved)}"]}


builder = StateGraph(State)
builder.add_node("write_draft", write_draft)
builder.add_node("review", review)
builder.add_edge(START, "write_draft")
builder.add_edge("write_draft", "review")
builder.add_edge("review", END)

graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "article-42"}}

# 第一次调用在 review 中暂停，并返回 interrupt 信息。
paused = graph.invoke(
    {"request": "Explain durable execution", "draft": "", "audit": []},
    config=config,
)

# 使用同一个 thread_id，从对应检查点恢复。
finished = graph.invoke(Command(resume=True), config=config)
print(finished["audit"])
```

`InMemorySaver` 适合示例与本地测试，不适合抵抗生产进程重启。生产环境需要持久化 checkpointer；如果使用 Agent Server，则由服务端管理持久化基础设施。

## 4. 持久化是一份恢复契约

检查点不只是“把状态存进数据库”。一旦启用检查点，工作流的设计方式也随之改变。

图可以在失败后继续、等待人工批准、查看历史状态，并从某个已知检查点重放或分叉。`thread_id` 是 checkpointer 找回同一条执行线程的主键，不能当作可有可无的元数据。

但 durable execution 不意味着程序永远从进程停止的那一条机器指令继续。节点或 task 可能被重放。由此得到最重要的一条生产规则：**把非确定性工作隔离出来，让所有外部副作用保持幂等。**

检查点记录了系统知道什么，却不会替我们撤销一笔重复转账。

## 5. 沿着一条真实故障路径思考

设想一个 Agent：先起草退款方案，交给运营人员审批，再调用支付 API。

1. 模型供应商返回 `429`。应在模型节点配置有上限的 `RetryPolicy`，包含退避与最大次数；无效业务输入不能无限重试。
2. 退款超过策略阈值。审核节点调用 `interrupt()`；检查点与 `thread_id` 让另一个进程稍后用 `Command(resume=...)` 恢复。
3. 审批后 worker 崩溃。再次调用同一线程，LangGraph 从持久状态继续，而不是从整笔请求的起点重跑。
4. 支付成功，但确认响应丢失。此时必须发送稳定的幂等键，例如 `refund:{thread_id}:{refund_id}`，并保存供应商交易 ID；单靠检查点无法阻止重复付款。

`interrupt()` 还有一个容易被忽略的陷阱：恢复时，包含 interrupt 的节点会从头执行。写在 `interrupt()` 之前的数据库操作或 API 调用可能再次发生。因此应把审批放在副作用之前，或者保证审批前的所有操作都可安全重放。

我给自己的故障测试很具体：如果不能解释进程在每次外部调用之后立刻退出会怎样，这张图就还没有准备好上线。

## 6. 生产工程中的取舍

**让节点保持无聊。** 一个节点只做一件事，并返回清楚的状态更新。如果同一节点同时规划、调用工具、重写状态并决定路由，调试会很快变成猜谜。

**让路由显式。** 条件边是生产业务逻辑。在引入模型之前，先用普通状态对象测试每条路径。

**尽早持久化，但不要把仓库塞进状态。** 大文档应存放在外部，只在图状态中保存引用。每个 super-step 都检查点化一个不断增长的全文，会同时拖累存储与延迟。

**记录转换证据。** 使用 LangSmith 或同等工具观察状态转换、延迟、token 消耗与工具错误。加入重试和并行分支后，没有 trace 的图几乎无法可靠解释。

**分清开源运行时与部署产品。** 当前部署产品名是 **LangSmith Deployment**，其中运行 Agent Server，并提供 Cloud、standalone server 和 self-hosted 等方式。LangGraph 是开源编排运行时；LangSmith Deployment 是部署产品。把名字分开，架构讨论才不会变成供应商迷雾。

代价同样真实。LangGraph 带来显式状态、持久执行与可控转换，也让团队承担状态模式迁移、检查点保留、重放语义和更多测试。对于一次抽取调用，我会拒绝这笔成本；对于必须跨部署存活的审批流程，我愿意接受。

## 7. 当前结论

LangGraph 仍然重要，不是因为“图”听起来比“链”高级，而是因为它把 Agent 当作有状态系统，而不是一个聪明提示词。当软件可以花钱、修改数据或等待人类时，控制流和恢复方式本身就是产品行为。

从比直觉更高的一层开始：先使用模型 API、`create_agent` 或 Deep Agents，直到真实约束迫使图显现出来。然后只构建能够表达这项约束的最小图，加上持久检查点，并亲手演练故障路径。

复杂度不该由框架声量证明，而应由一个你能说出名字的失败来赢得。

## 参考资料

1. [LangGraph 官方概览](https://docs.langchain.com/oss/python/langgraph/overview)
2. [LangGraph 持久化](https://docs.langchain.com/oss/python/langgraph/persistence)
3. [LangGraph interrupt](https://docs.langchain.com/oss/python/langgraph/interrupts)
4. [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)

## 相关文章

- [开源的阶段性成长指南](/zh/growth/posts/stage-growth-of-open-source/)
- [一份完整的开源贡献指南](/zh/engineering/posts/open-source-contribution-guidelines/)
- [我的实践总结：开源社区的规范设计思路](/zh/engineering/posts/advanced-githook-design/)
- [在开源社区中学会如何提问](/zh/engineering/posts/the-art-of-asking-questions-in-open-source-communities/)
