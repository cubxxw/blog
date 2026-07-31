---
title: 'LangChain 1.x in Practice: A Developer Guide to Reliable Agents'
date: 2024-05-22T21:37:34+08:00
lastmod: 2026-07-31T10:00:00+08:00
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
  A practical LangChain 1.x guide to models, agents, middleware, memory, RAG, SQL, Ollama, and LangSmith, with runnable Python and safe migration advice.
cover:
  image: /images/covers/ai-agent/2024/harnessing-language-model-applications-with-langchain-a-developer-is-guide.png
  alt: 'LangChain 1.x architecture connecting models, agents, memory, retrieval, and observability'
  relative: false
tldr:
  - 'LangChain 1.x centers on a small set of current interfaces: init_chat_model, create_agent, typed tools, structured output, and middleware.'
  - 'A checkpointer preserves thread-scoped conversation state; a LangGraph store holds selected data across threads. In-memory implementations are for development, not production.'
  - 'RAG, SQL, Ollama, and LangSmith are integration layers. Reliability still comes from permissions, evaluation, versioned state, and explicit failure boundaries.'
faq:
  - q: 'What changed most in LangChain 1.x?'
    a: 'create_agent is now the standard agent entry point, middleware owns cross-cutting behavior, and legacy chains, retrievers, indexing APIs, and hub imports moved to langchain-classic.'
  - q: 'Should I use LangChain or LangGraph directly?'
    a: 'Start with LangChain models and create_agent for ordinary agent applications. Use LangGraph directly when you need custom nodes, conditional transitions, durable recovery, or a state machine beyond the standard model-tool loop.'
  - q: 'How does memory work in LangChain 1.x?'
    a: 'A checkpointer saves short-term state under a thread_id. A store saves long-term JSON documents under namespaces that can be shared across threads.'
  - q: 'Is InMemorySaver suitable for production?'
    a: 'No. It is convenient for tests and local demos but loses data when the process exits. Production systems need a persistent checkpointer and store, plus migration, backup, retention, and deletion policies.'
---

> A framework is most dangerous not when it lacks features, but when its old tutorials still look plausible. Familiar code can cross a version boundary long before it produces an obvious error.

This guide follows the current **LangChain Python 1.x** path: model calls, agents, tools, structured output, middleware, memory, RAG, SQL, Ollama, and LangSmith. It is deliberately different from a framework overview. The aim is to leave you with a compact application architecture, runnable examples, and a way to recognize code that belongs to the 0.x era.

The examples assume **Python 3.10+**, `langchain>=1.0`, and `langgraph>=1.0`. Model catalogs change faster than application code, so model identifiers live in environment variables. That small decision keeps a tutorial useful after a provider renames its latest model.

## The LangChain 1.x mental model

Think of the current stack as four layers:

1. **Standard interfaces** for messages, chat models, embeddings, and tools.
2. **The agent layer**, where `create_agent` runs the model-tool loop and middleware handles context engineering and guardrails.
3. **The LangGraph runtime**, which supplies state, persistence, streaming, human intervention, and durable execution. `create_agent` is built on LangGraph.
4. **The LangSmith feedback loop**, which records traces and supports debugging, evaluation, and production monitoring.

These layers are not a maturity ladder. A classifier may need only a model and typed output. Add an agent when the model must choose an action. Drop to LangGraph when the workflow needs custom states or recovery rules. Complexity should be earned by the problem.

## Install only what the application uses

For an OpenAI-backed example:

```bash
python -m venv .venv
source .venv/bin/activate

pip install -U \
  "langchain>=1.0,<2" \
  "langgraph>=1.0,<2" \
  "langchain-openai>=1.0,<2" \
  "pydantic>=2,<3"

export OPENAI_API_KEY="..."
export MODEL_NAME="openai:your-model-name"
export OPENAI_MODEL="your-model-name"
```

Provider integrations are separate packages. OpenAI uses `langchain-openai`; Ollama uses `langchain-ollama`. A production application should commit a lockfile and test dependency upgrades rather than running an unbounded `pip install -U` during deployment.

## Start with one model call

Use `init_chat_model` when provider portability matters:

```python
# model_call.py
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
        ("system", "Be precise. State uncertainty instead of inventing facts."),
        ("user", "Explain the difference between an agent and a fixed workflow."),
    ]
)
print(response.text)
```

Use the provider class when you need provider-specific options:

```python
import os

from langchain_openai import ChatOpenAI

model = ChatOpenAI(
    model=os.environ["OPENAI_MODEL"],
    temperature=0,
    timeout=30,
    max_retries=2,
)

print(model.invoke("Give one testable claim, not a slogan.").text)
```

The choice is architectural, not ideological. `init_chat_model` favors interchangeability; `ChatOpenAI` exposes the OpenAI integration directly. In LangChain 1.x, message text is available through the `.text` property. The old `.text()` method is on a migration path and is scheduled for removal in v2.

## Build a narrow agent with typed tools

An agent is useful when the model must decide whether and how to call a tool. A good tool has one responsibility, typed inputs, a precise docstring, and a permission boundary that exists outside the prompt.

```python
# agent_demo.py
import os

from langchain.agents import create_agent
from langchain.tools import tool


@tool
def calculate_total(unit_price: float, quantity: int) -> float:
    """Calculate a pre-tax total. Quantity must be a positive integer."""
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    return round(unit_price * quantity, 2)


agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[calculate_total],
    system_prompt=(
        "You are a purchasing assistant. Use the tool for arithmetic. "
        "Never invent tax rates, stock levels, or discounts."
    ),
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Seven units cost $19.90 each. Total?"}]}
)
print(result["messages"][-1].text)
```

This tool intentionally cannot read inventory or place an order. Reading, calculating, and writing should usually be separate capabilities with different privileges. Irreversible operations also need idempotency keys, audit logs, and human approval. Decorating a large function with `@tool` does not make it safe.

## Return data, not prose that looks like data

If another service will consume the answer, request structured output. Pass a Pydantic type to `response_format`; LangChain selects provider-native structured output when supported and otherwise uses a tool-calling strategy. The validated value is returned in `structured_response`.

```python
# structured_output.py
import os

from langchain.agents import create_agent
from pydantic import BaseModel, Field


class Ticket(BaseModel):
    category: str = Field(description="One of billing, bug, or question")
    priority: int = Field(ge=1, le=5)
    summary: str = Field(max_length=120)


agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[],
    response_format=Ticket,
    system_prompt="Triage only from supplied facts. Do not infer missing details.",
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "Checkout charged me twice. Order 4172."}
        ]
    }
)
ticket: Ticket = result["structured_response"]
print(ticket.model_dump())
```

Schema validation proves that the shape is valid, not that the claims are true. Money, dates, identities, and authorization still require deterministic business validation. Never interpolate model output directly into SQL or a shell command.

## Put cross-cutting behavior in middleware

Old agent examples often bury retries, dynamic prompts, approval, and logging inside the main loop. LangChain 1.x gives these concerns a middleware layer. Hooks such as `before_model` and `after_model` can validate or update state; wrappers such as `wrap_model_call` and `wrap_tool_call` can surround execution.

Here is a minimal built-in middleware example:

```python
# middleware_demo.py
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
    system_prompt="Preserve confirmed constraints; never summarize guesses as facts.",
)
```

Middleware is a good home for:

- input and output guardrails, including PII redaction;
- bounded retries with backoff;
- dynamic model or tool selection;
- human review before high-risk tools;
- latency, token, error, and business metadata.

More middleware is not automatically safer. Ordering changes behavior, retries can repeat side effects, and summarization can erase a decisive constraint. Test each layer separately.

## Memory: a checkpointer is not a store

“Remember me” hides two different requirements:

| Requirement | Mechanism | Isolation key | Lifetime |
|---|---|---|---|
| Continue one conversation | checkpointer | `thread_id` | thread-scoped state |
| Recall a preference in a new conversation | store | namespace such as `(user_id, "preferences")` | cross-thread data |

### Short-term, thread-scoped memory

Because `create_agent` runs on LangGraph, it accepts a checkpointer directly:

```python
# short_memory.py
import os

from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model=os.environ["MODEL_NAME"],
    tools=[],
    checkpointer=InMemorySaver(),  # local development only
)

config = {"configurable": {"thread_id": "demo-thread-42"}}

agent.invoke(
    {"messages": [{"role": "user", "content": "I prefer concise answers."}]},
    config,
)
result = agent.invoke(
    {"messages": [{"role": "user", "content": "How do I prefer answers?"}]},
    config,
)
print(result["messages"][-1].text)
```

A different `thread_id` represents a different conversation. Production should use a database-backed checkpointer such as PostgreSQL and run the implementation's setup or migration step during deployment. An in-memory saver is not a database.

### Long-term, cross-thread memory

LangGraph stores organize JSON documents by namespace and key:

```python
# long_memory_store.py
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()  # demonstration only
namespace = ("user-17", "preferences")

store.put(namespace, "answer-style", {"value": "concise"})
items = store.search(namespace)
print(items[0].value["value"])
```

An agent can receive the store through `create_agent(..., store=store)`, and tools can access it through `ToolRuntime`. In a real product, memory also needs answers to harder questions: who may write it, when it expires, how a user inspects or deletes it, and how a wrong memory is corrected. Long-term memory should be selected, sourced business data—not an immortal transcript.

## RAG: choose the architecture before the vector database

The current LangChain documentation separates RAG into three useful shapes:

- **Two-step RAG** retrieves before generation. It is predictable and often best for documentation or FAQ systems.
- **Agentic RAG** exposes retrieval as a tool and lets the agent decide when to search. It is flexible but has less predictable latency and cost.
- **Hybrid RAG** adds query rewriting, retrieval validation, or answer validation for ambiguous and high-assurance domains.

A minimal two-step path does not need the legacy `RetrievalQA` chain:

```python
# rag_demo.py
import os

from langchain.chat_models import init_chat_model
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

documents = [
    Document(
        page_content="Refund requests must be submitted within seven days.",
        metadata={"id": "policy-1"},
    ),
    Document(
        page_content="Activated digital goods are not eligible for change-of-mind refunds.",
        metadata={"id": "policy-2"},
    ),
]

vector_store = InMemoryVectorStore(
    OpenAIEmbeddings(model="text-embedding-3-small")
)
vector_store.add_documents(documents)
retriever = vector_store.as_retriever(search_kwargs={"k": 2})
model = init_chat_model(os.environ["MODEL_NAME"], temperature=0)

question = "Can I return an activated digital product because I changed my mind?"
hits = retriever.invoke(question)
context = "\n\n".join(
    f"[{doc.metadata['id']}] {doc.page_content}" for doc in hits
)

response = model.invoke(
    [
        (
            "system",
            "Answer only from the supplied evidence. If evidence is insufficient, "
            "say so. Cite the document ID.",
        ),
        ("user", f"Evidence:\n{context}\n\nQuestion: {question}"),
    ]
)
print(response.text)
```

The in-memory vector store is for the example. Before launch, evaluate chunking, recall, metadata filters, permission inheritance, citation support, and no-answer behavior. A fluent answer cannot repair a retriever that selected an obsolete policy or leaked a document the user was not allowed to see.

## SQL agents: let the model query, not own, the database

The current SQL-agent flow inspects tables and schemas, drafts a query, checks it, executes it, and corrects database errors. That is useful for exploratory analysis, but it should not imply write access.

```python
# sql_agent.py
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
        "You may issue read-only queries. Inspect tables and schemas first. "
        "Return at most 20 rows. Never use INSERT, UPDATE, DELETE, DROP, or ALTER."
    ),
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "Count orders by month for the last year."}
        ]
    }
)
print(result["messages"][-1].text)
```

Install the example's database integration with `pip install langchain-community`. In production, use a read-only account and replica, allow-list tables and columns, set time and row limits, audit generated SQL, and block DDL/DML at the database layer. Prompt instructions are not an authorization system. Database cell contents are also untrusted input and may contain indirect prompt injection.

## Ollama: swap the model endpoint, keep the engineering discipline

Ollama lives in its own integration package:

```bash
pip install -U "langchain-ollama>=1.0,<2"
ollama pull llama3.1
```

```python
# ollama_demo.py
from langchain_ollama import ChatOllama

model = ChatOllama(model="llama3.1", temperature=0)
print(model.invoke("Explain reproducible builds in one sentence.").text)
```

If the selected Ollama model supports tool calling, the model instance can be passed to `create_agent`. That says nothing about how reliably it will follow your particular tool schemas. Test the exact model tag with your languages, context sizes, concurrency, and failure cases. Self-hosting may exchange API spend for GPU capacity, throughput work, upgrades, and on-call burden.

## LangSmith: observe first, then optimize

LangChain agents support LangSmith tracing without application-level wrappers:

```bash
export LANGSMITH_TRACING="true"
export LANGSMITH_API_KEY="..."
export LANGSMITH_PROJECT="langchain-production"
```

A trace shows model calls, tool calls, timings, and agent decisions. It can explain why the wrong tool ran or where latency accumulated. It does not prove quality. Tracing answers “what happened”; datasets and evaluators answer “was the result good enough?”

A useful production loop includes:

- a fixed regression set with normal, boundary, refusal, and adversarial cases;
- task metrics such as correctness, tool choice, citation support, and escalation rate;
- system metrics such as end-to-end latency, tokens, cost, retries, and error classes;
- version metadata for prompts, models, tool schemas, indexes, and application code;
- redaction, access control, retention, and deletion rules for trace data.

Do not ship secrets, full personal records, or raw database results to tracing by default. Observability must obey the same data boundaries as the application.

## Migrating from LangChain 0.x

Use this table as a code-review filter:

| Old API or assumption | LangChain 1.x path |
|---|---|
| Text-completion `OpenAI` class for chat | `ChatOpenAI` or `init_chat_model` |
| `initialize_agent` and old `AgentExecutor` tutorials | `langchain.agents.create_agent` |
| `langgraph.prebuilt.create_react_agent` | `langchain.agents.create_agent` |
| `prompt=` on agent constructors | `system_prompt=` for static instructions; middleware for dynamic prompts |
| “Return JSON” plus manual parsing | `response_format=Schema` and validated `structured_response` |
| `ConversationBufferMemory` attached to a chain | checkpointer plus `thread_id` |
| Every old message copied into every prompt | store selected cross-thread memory by namespace |
| `LLMChain` or `ConversationChain` | direct model/LCEL composition or an agent; use `langchain-classic` only as a bridge |
| imports from `langchain.retrievers` | the relevant integration package; temporarily `langchain-classic` for legacy code |
| tool errors caught inside the main loop | `wrap_tool_call` middleware |

`langchain-classic` is a migration shelter, not the default for new applications. Isolate legacy dependencies, freeze current behavior with tests, and replace one boundary at a time.

## A release checklist that catches real failures

### Dependencies and code

- Python and provider packages are locked to tested versions.
- Imports use current namespaces rather than copied 0.x examples.
- Timeouts, retries, concurrency, and token budgets are explicit.
- Every tool has typed inputs, narrow permissions, and idempotent side effects.

### State and security

- Each conversation receives a stable, unguessable `thread_id`.
- The server injects `user_id` and store namespaces; it does not trust client claims.
- Production uses persistent checkpointers and stores with backup and deletion plans.
- Database, filesystem, network, and write permissions are enforced outside prompts.

### Quality and operations

- RAG tests recall, citations, authorization, and the no-answer path.
- Tool retries and recovery cannot duplicate a side effect.
- Traces include version metadata and exclude sensitive payloads by default.
- A fixed dataset runs before release; cost, latency, errors, and escalation are monitored after it.

## The final judgement

LangChain 1.x is useful because it puts models, tools, state, and observability behind a smaller set of current interfaces. It does not make the architecture decision for you. The engineering work is still the work of drawing boundaries: which facts came from retrieval, which actions require authority, which state deserves to survive, and where execution resumes after failure.

I prefer to begin with one model call and add one layer only when a requirement demands it. A system is mature when removing a component has a consequence you can name—not when its dependency graph looks impressive.

## Official references

- [LangChain installation and Python requirements](https://docs.langchain.com/oss/python/langchain/install)
- [Models and `init_chat_model`](https://docs.langchain.com/oss/python/langchain/models)
- [Agents, tools, and middleware](https://docs.langchain.com/oss/python/langchain/agents)
- [Structured output](https://docs.langchain.com/oss/python/langchain/structured-output)
- [LangChain v1 migration guide](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [Short-term memory](https://docs.langchain.com/oss/python/langchain/short-term-memory)
- [Long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory)
- [Retrieval and RAG architectures](https://docs.langchain.com/oss/python/langchain/retrieval)
- [SQL agent tutorial](https://docs.langchain.com/oss/python/langchain/sql-agent)
- [ChatOllama integration](https://docs.langchain.com/oss/python/integrations/chat/ollama)
- [LangSmith observability](https://docs.langchain.com/oss/python/langchain/observability)
