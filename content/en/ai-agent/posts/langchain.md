---
url: "/projects/langchain/"
title: "LangChain 1.x in Production: Choosing Models, Agents, and LangGraph"
date: 2025-04-16T17:36:45+08:00
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
  A production-minded guide to LangChain 1.x: when to call a model directly, use create_agent, or adopt LangGraph, with tested patterns for RAG and HITL.
cover:
  image: "/images/covers/ai-agent/2025/langchain.png"
  alt: "A restrained editorial illustration of connected paths representing models, agents, and graph workflows"
  relative: false
aliases:
  - /posts/ai-projects/langchain/
tldr:
  - "Start with the smallest abstraction that makes failure easier to see: a direct model call for one inference, create_agent for a standard tool loop, and LangGraph only when control flow becomes part of the product."
  - "LangChain 1.x is primarily an agent framework built on LangGraph, while langchain-core provides messages, models, tools, and Runnable interfaces; older chain APIs live in langchain-classic."
  - "Production quality comes from explicit contracts, retrieval evaluation, bounded tools, durable state, human approval for consequential actions, and traces that explain both output and cost."
---

LangChain used to be introduced as a box of chains, memory classes, prompt templates, loaders, and integrations. That description is historically accurate and operationally unhelpful.

As of July 2026, the useful way to understand LangChain 1.x is much narrower:

- **Call a model directly** when the task is one inference with a clear input and output.
- Use **`create_agent`** when a model must choose among tools in a conventional model–tool loop.
- Use **LangGraph** when your application has durable state, explicit branches, retries, parallel work, long-running steps, or human decisions that are part of the workflow.

This is not merely a taxonomy. It is an engineering rule about where complexity should live. Every framework abstraction creates a second system beside your product: another execution model, another vocabulary, and another place for failure to hide. The abstraction earns its place only when it makes the real system easier to operate.

This guide follows the LangChain 1.x architecture only. It does not teach `LLMChain`, `ConversationChain`, `AgentExecutor`, PaLM integrations, or the older memory hierarchy. Those APIs still appear in search results and old tutorials, but new projects should not begin there.

## The 1.x mental model

LangChain 1.x is a high-level agent framework. Its default agent entry point, `create_agent`, runs on LangGraph. The surrounding packages have distinct jobs:

| Layer | Use it for | Avoid using it for |
|---|---|---|
| Model SDK or `init_chat_model` | One model call, structured output, classification, extraction, rewriting | Workflows that need tool selection or durable state |
| `langchain-core` | Messages, tools, documents, model interfaces, Runnables | A complete application architecture |
| `langchain` and `create_agent` | A standard tool-calling loop with middleware | A business process with many explicit states and branches |
| LangGraph | Durable, stateful workflows with controlled transitions | A simple prompt followed by one model response |
| LangSmith | Tracing, datasets, evaluation, monitoring | Replacing application logs, access control, or domain metrics |

Third-party providers live in separate packages such as `langchain-openai`. Community integrations may live in `langchain-community`, but production teams should prefer a provider-maintained partner package when one exists. This separation keeps the core small and lets integrations release independently.

The old idea that “LangChain is where all the connectors are” is no longer a sufficient reason to adopt it. A connector saves an afternoon. An execution model can shape a codebase for years.

## The decision that matters

### 1. Call the model directly

Use the provider SDK directly, or LangChain's model interface, when all of these are true:

- the application makes one bounded inference;
- the inputs are already available;
- the output can be validated with a schema;
- no model-selected side effect is required;
- retries are ordinary request retries, not reasoning loops.

Examples include classification, entity extraction, translation, query rewriting, and drafting a response from a supplied context. A direct call has the shortest stack trace, the fewest dependencies, and the clearest cost model.

LangChain's `init_chat_model` is useful if provider interchangeability and a common message interface are valuable:

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

This is a complete structural example for LangChain 1.x. It requires a valid provider API key and a model available to your account. In a real service, pin package versions, validate the result again at the boundary, and record model name, latency, token usage, and schema failures.

Do not add an agent because the word “intelligent” appears in a product brief. If code already knows the next operation, write that operation in code.

### 2. Use `create_agent`

Use `create_agent` when the model genuinely needs to choose a tool, inspect its result, and decide whether another tool call is necessary. Good examples are:

- a support assistant that searches policy documents before answering;
- an operations assistant that queries several read-only systems;
- a research assistant that chooses between search and internal data;
- a drafting assistant that may request a calculator or database lookup.

The loop is intentionally conventional: messages enter, the model may request a tool, the runtime executes it, and the result returns to the model. LangChain 1.x middleware adds hooks around that loop for logging, model routing, prompt construction, tool filtering, summarization, and human approval.

`create_agent` is not permission to expose an entire infrastructure account as tools. Tool design remains normal security engineering:

- give each tool one legible purpose;
- use typed arguments;
- enforce authorization inside the tool, never in the prompt;
- separate read tools from write tools;
- make write operations idempotent where possible;
- return compact results instead of raw database dumps;
- set timeouts and output limits;
- treat tool descriptions as model-facing API documentation.

### 3. Use LangGraph

Adopt LangGraph when the workflow itself is part of the product specification. Typical signals are:

- a step must pause for minutes or days and later resume;
- different states permit different actions;
- deterministic code must run before or after an agent;
- failures require state-specific recovery rather than retrying everything;
- several workers run in parallel and then join;
- a reviewer may approve, edit, or reject;
- the system must replay or inspect prior state;
- an agent loop is only one node in a larger process.

LangGraph gives you nodes, edges, state, persistence, interrupts, and resumability. It is deliberately lower-level than `create_agent`. That control is valuable only when you need it. For a two-node sequence, an ordinary Python function is usually clearer.

The rule I use in reviews is simple: **draw the states before importing LangGraph**. If the diagram contains meaningful branches, waiting points, or recovery paths, a graph may clarify the design. If it is a straight line, the graph is decoration.

## A minimal, consistent environment

The examples below target the 1.x generation of the Python packages:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install \
  "langchain>=1,<2" \
  "langchain-openai>=1,<2" \
  "langgraph>=1,<2"

export OPENAI_API_KEY="your-key"
```

Package ranges are shown so the imports belong to one architectural generation. A production application should lock exact resolved versions and update them through tested dependency pull requests. Model identifiers and account availability can change independently of Python packages, so put the model name in configuration rather than scattering it through code.

## RAG without ceremony

Retrieval-augmented generation is not an agent by default. The application already knows the steps: retrieve relevant evidence, format it, ask a model to answer from that evidence. Making the model decide whether to retrieve often adds cost and makes grounding less predictable.

The following small example is runnable with the packages above and valid credentials. It uses an in-memory vector store so the architecture is visible; it is not a production index.

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

The demo omits document loading, chunking, durable storage, and access control. Those are not incidental details; they are most of the production system.

### What to measure before changing the model

A RAG application fails in several different places:

1. **Corpus failure**: the source is missing, stale, duplicated, or unauthorized.
2. **Chunking failure**: the answer is split away from its heading, table, or exception.
3. **Retrieval failure**: the correct chunk is not in the top results.
4. **Context failure**: too much weak evidence dilutes the useful evidence.
5. **Generation failure**: the model ignores or misreads correct context.
6. **Citation failure**: the answer sounds grounded but points to the wrong source.

Build a small evaluation set from real questions and label the supporting documents. Track retrieval recall separately from answer quality. If the right evidence never reaches the prompt, prompt engineering is theatre.

For production, also preserve document identity, revision, tenant, and permissions as metadata. Apply authorization before or during retrieval. Post-filtering unauthorized results can leave too few valid documents and can leak information through scores or timing.

## A standard agent with middleware

This runnable example gives an agent a bounded, read-only tool. It also shows middleware used for logging rather than embedding observability inside every tool.

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
    # Replace with an authorized repository call.
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

The dictionary is deliberately fake; the agent mechanics are real. In production, inject customer identity through trusted runtime context and verify access inside `lookup_order`. Never let a model supply the identity used for authorization.

Middleware is most valuable for cross-cutting policy: dynamic prompts, context trimming, model fallback, rate accounting, tool selection, guardrails, and approvals. Keep business rules in ordinary functions and domain services. A clever middleware stack that nobody can mentally execute becomes another legacy framework inside the framework.

## Human approval for consequential tools

Human-in-the-loop is not a confirmation sentence generated by the model. It is a runtime boundary that prevents a tool from executing until an authorized person makes a recorded decision.

The following is a **structural 1.x example** because the exact interrupt payload presented by your user interface is application-specific. The agent configuration and resume pattern follow the 1.x middleware and LangGraph command model, but the example intentionally stops short of claiming that a terminal is an approval UI.

```python
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command


@tool
def send_refund(order_id: str, amount_cents: int) -> str:
    """Issue an approved refund for an order."""
    # The real implementation must be authorized and idempotent.
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

# Your application reads pending["__interrupt__"], displays the proposed
# action to an authorized reviewer, and records the review decision.

resumed = agent.invoke(
    Command(resume={"decisions": [{"type": "approve"}]}),
    config=config,
)
print(resumed["messages"][-1].content)
```

Use a database-backed checkpointer for durable work; `InMemorySaver` is for local development. The same `thread_id` must be used when resuming. Before approval, show the reviewer the exact normalized arguments, affected resource, identity, and expected side effect. For high-risk operations, revalidate permissions and current state after the pause, because the world may have changed while the request waited.

Approval is a control, not a cure. A tired reviewer clicking “approve” on opaque JSON is merely a slower automatic system.

## When an explicit LangGraph is justified

Suppose a publication workflow must research a topic, draft an article, run policy checks, pause for an editor, and either publish or return to revision. An agent may help with research or drafting, but the overall process should not be left to a model's improvised tool loop.

Its state diagram has meaningful transitions:

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

That is a LangGraph-shaped problem. The nodes can mix deterministic code and model calls; conditional edges encode policy outcomes; persistence allows editorial review to wait; an interrupt creates the human boundary.

A graph becomes especially valuable when failure recovery is local. If publishing fails, resume from the publish node rather than repeating research and silently producing a different draft. If the policy check fails, preserve the evidence and reason. Durable execution is not about drawing attractive diagrams—it is about knowing which work happened and which work may safely happen again.

Before building the graph, define:

- the state schema and which node owns each field;
- invariants that must hold before transitions;
- which operations are idempotent;
- timeout and retry rules per node;
- how state migrations work after deployments;
- what data may be persisted;
- who can resume an interrupted run;
- how a run is cancelled and compensated.

If those questions feel too formal, that is useful information. The workflow may not be ready to become autonomous.

## What happened to LCEL?

The Runnable interface and LCEL remain useful in LangChain Core for composing deterministic model pipelines. A prompt, model, and parser can still be connected with `|`, and Runnables support synchronous, asynchronous, batch, and streaming operations.

But LCEL is no longer the answer to every architecture question. It is well suited to dataflow where the application controls the sequence. `create_agent` is the high-level choice for a standard agent loop. LangGraph is the low-level choice for explicit stateful orchestration.

This distinction prevents a common failure: forcing branches, memory, approvals, and retries into a chain until the chain has quietly become a workflow engine.

## LangServe is not the forward path

LangServe once offered a convenient way to expose Runnables as FastAPI endpoints. The official repository is now archived, and the project is deprecated for new development. Existing services may continue to run, but a new 2026 architecture should not choose LangServe as its deployment foundation.

For a simple model or RAG endpoint, expose the application through the web framework and operational stack your team already understands. For stateful LangGraph applications, evaluate the current LangGraph deployment options against your requirements for persistence, networking, data residency, observability, cost, and lock-in. The open-source LangGraph library and commercial hosting products are separate decisions.

Deprecation teaches a broader lesson: generating an endpoint is the easy part. Production deployment includes authentication, quotas, schema evolution, cancellation, streaming backpressure, rollouts, audit logs, and incident response. A framework helper can shorten setup; it cannot own those obligations for you.

## Production checklist

### Contracts and state

- Validate model output with schemas; do not parse prose with hopeful regular expressions.
- Version prompts, tool schemas, and state schemas.
- Keep durable business state outside chat history.
- Limit context growth through explicit retention or summarization policies.
- Treat persisted agent state as sensitive application data.

### Tools and side effects

- Authorize every tool call in code.
- Prefer narrow tools over generic shell, SQL, HTTP, or filesystem access.
- Use idempotency keys for retried writes.
- Separate planning from execution for costly or irreversible actions.
- Require runtime approval for consequential operations.
- Recheck state after long pauses.

### Reliability

- Set model, tool, and end-to-end timeouts.
- Bound iterations, tokens, retrieved documents, and tool output.
- Define retryable errors; do not retry invalid requests or policy failures.
- Add fallbacks only when their behavior is evaluated, not merely available.
- Support cancellation and surface partial progress honestly.

### Evaluation and observability

- Trace model calls, tool calls, retrieval, latency, tokens, and errors.
- Redact secrets and personal data before exporting traces.
- Build regression datasets from real failures.
- Evaluate retrieval and generation separately.
- Run online quality checks alongside product metrics.
- Review traces where the final answer was correct for the wrong reason.

LangSmith can provide tracing and evaluation across LangChain and LangGraph, and it can also instrument non-LangChain applications. It is useful, but it does not replace service metrics, security logs, or a data-governance decision. Decide deliberately what leaves your environment.

## Failure patterns I would avoid

### Starting with an agent

Teams often begin with an agent because it makes a demo feel alive. Then they discover that most decisions were deterministic: fetch account, check policy, calculate result, ask for approval. Replacing those steps with code makes the system cheaper and easier to test; the model can remain where language ambiguity is real.

### Confusing conversation with memory

A message list is context, not a complete memory architecture. Production memory needs ownership, expiry, provenance, correction, and deletion. Store facts in domain systems; retrieve only what the current task needs.

### Hiding migrations behind imports

Old tutorials import classes that moved to `langchain-classic` or were superseded. Copying them into a 1.x project creates an accidental hybrid architecture. Read the current migration guide, choose one generation, and isolate any legacy path until it can be removed.

### Measuring only the final answer

An answer may be correct despite retrieving the wrong document. An agent may succeed after five unnecessary tool calls. A graph may recover from an error while duplicating a side effect. Evaluate the path as well as the destination.

### Treating provider interchangeability as free

A common interface makes model replacement syntactically easier, not behaviorally equivalent. Providers differ in tool calling, structured output, streaming events, tokenization, safety policy, and failure modes. Switching models requires an evaluation run, not a configuration edit.

## A practical adoption sequence

For a new team, I would adopt the ecosystem in this order:

1. Build the smallest valuable path with a direct model call and structured output.
2. Add a trace and a regression dataset before adding orchestration.
3. Introduce retrieval only when external evidence is required; measure retrieval.
4. Introduce `create_agent` only when model-selected tools improve the task.
5. Add middleware for policies shared across the agent loop.
6. Introduce durable checkpointing and human approval before consequential tools.
7. Move to an explicit LangGraph when state transitions and recovery paths have become domain concepts.

This sequence is intentionally conservative. It preserves an escape hatch at every step. You can always wrap a tested function in a graph node later; extracting reliable business logic from an opaque agent loop is much harder.

## Conclusion

LangChain 1.x is easier to use once we stop asking whether a project “uses LangChain” and ask which layer earns its place.

A direct model call is often enough. `create_agent` is a capable default for a bounded tool loop. LangGraph is the right foundation when durable state and explicit control flow are requirements rather than embellishments. LangSmith can make these systems observable, while production quality still depends on ordinary engineering: contracts, permissions, tests, budgets, and recovery.

Frameworks change quickly because they sit close to a changing frontier. The durable skill is not memorizing their surface area. It is learning to place uncertainty inside clear boundaries.

An agent should not make a system mysterious. It should make a difficult decision possible—and leave enough evidence for the next engineer to understand why.

## Official references

- [LangChain overview](https://docs.langchain.com/oss/python/langchain/overview)
- [LangChain agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangChain middleware](https://docs.langchain.com/oss/python/langchain/middleware)
- [Human-in-the-loop middleware](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangChain migration guide](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [LangServe archived repository](https://github.com/langchain-ai/langserve)
- [LangSmith documentation](https://docs.langchain.com/langsmith/home)

## Related articles

- [Harnessing Language Model Applications with LangChain: A Developer's Guide](/ai-agent/posts/harnessing-language-model-applications-with-langchain-a-developer-is-guide/)
- [LangGraph: Building Stateful Agent Workflows](/projects/langgraph/)
- [Vector Database Learning Notes](/ai-agent/posts/vector-database-learning/)
