---
title: "Relay Agent Architecture in 2026: A Local Implementation Audit"
date: 2026-06-24T10:00:00+08:00
lastmod: 2026-07-31T18:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Python
  - Security
  - Development
categories:
  - Development
description: >
  A source-based audit of Relay’s coordinator, five domain agents, LangGraph HITL, browser delivery, durability gaps, and remaining 2026 migration debt.
tldr:
  - "This is an audit of a private local implementation, not a review of a publicly accessible open-source repository."
  - "Relay now contains a coordinator, five domain-agent modules, a Harness, API routes, event consumers, and a Playwright MCP browser path; the old “code has not started” description is no longer true."
  - "LangGraph resumes an interrupted graph by re-running the node from its beginning, so anything before interrupt() must be idempotent or moved after approval."
  - "Browser-assisted application is a privileged workflow: domain allowlists, indirect-prompt-injection defenses, sensitive-field blocking, human approval, and audit trails matter more than autofill coverage."
  - "The code still uses create_react_agent, while LangChain’s current public API recommends create_agent; that is migration debt, not an emergency rewrite."
maturity: budding
cover:
  image: '/images/blog/relay-agent-architecture.webp'
  caption: 'Relay architecture as an implementation audit: evidence, boundaries, and unfinished edges'
  alt: 'Editorial architecture diagram of Relay with a coordinator, five domain agents, safeguards, browser delivery, and audit boundaries'
columns:
  - agent-engineering
---

> An architecture diagram is a promise. A code audit asks which parts of that promise have acquired weight.

My first version of this article treated Relay as a public open-source proposal whose Agent layer had not yet been built. Both claims are now wrong.

As of **July 31, 2026**, the public GitHub URL previously cited by this article returns 404, while I can inspect a private local checkout. This piece is therefore a **private/local implementation audit**, fixed to local commit `22586e17ccd43cfaff0512511e71a100c5341608`. Readers should not assume that repository or commit is publicly downloadable.

The distinction matters. I can report what exists in the checkout. I cannot turn private evidence into a public reproducibility claim.

## How to Read the Status Labels

Every substantial claim below carries one of four labels:

- **Implemented** — corresponding production-path code exists in the audited checkout.
- **Tested** — focused automated tests exist and were run during this audit.
- **Design** — documented intent or an identified requirement, not a completed guarantee.
- **Illustrative** — an example for reasoning, not a statement about Relay's exact code or performance.

This is deliberately stricter than “documented.” Documentation records intent; executable paths reveal commitments.

## Audit Snapshot

The local checkout contains more than a proposal:

| Area | Audit finding | Status |
|---|---|---|
| Coordinator | Ask Vantage router and ReAct dock entry exist | **Implemented** |
| Domain agents | Resume, job match, interview, application preparation, and trend modules exist | **Implemented** |
| Harness | Cost tracking, guards, context compaction, checkpointer, permissions, audit, and event support exist | **Implemented** |
| Agent API | FastAPI routes for streaming, resumes, applications, mock interviews, and resume building exist | **Implemented** |
| TypeScript API | 16 non-test TypeScript route modules exist; 14 are mounted directly and 2 are used as nested routes | **Implemented** |
| Events | Redis-backed event bus plus consumers and handlers exist | **Implemented** |
| Browser path | Playwright MCP client and approval-gated browser tools exist | **Implemented; tested** |
| Database evolution | Migrations are numbered `001` through `022`; the SQL contains 21 `CREATE TABLE` statements | **Implemented** |
| Public availability | The formerly cited GitHub URL is not publicly reachable | **Not public** |

For this audit, the focused router, browser-tool, and cost-tracker suites completed with **47 passing tests**. That result supports those paths only; it is not a substitute for an end-to-end production test.

**Status: Tested on the audited local commit.**

The useful story is no longer “look at this ambitious design.” It is “look at the distance between a design and its current failure boundaries.”

## One Coordinator, Five Domain Agents

Relay separates conversation routing from five domain modules:

1. `ResumeAgent` parses, analyzes, optimizes, and tailors résumés.
2. `JobMatchAgent` ingests and matches jobs.
3. `InterviewAgent` runs interview preparation and evaluation flows.
4. `AppPrepAgent` prepares application material and browser actions.
5. `TrendAgent` extracts and summarizes market signals.

**Status: Implemented.**

This split is defensible without pretending that multi-agent systems are automatically faster or smarter. A useful boundary usually follows one of four pressures:

- trigger mode differs — conversation, event, scheduled job, or explicit user action;
- model and latency requirements differ;
- data ownership differs;
- prompts and evaluation suites evolve at different speeds.

That is more precise than the old claim that coordination cost grows as \(O(N^2)\). No benchmark in this checkout supports such a complexity statement. Coordination cost depends on the topology, shared state, tool contracts, and number of cross-agent handoffs.

The coordinator itself still builds its dock graph with `langgraph.prebuilt.create_react_agent`.

**Status: Implemented, with migration debt.**

LangChain's current [agent documentation](https://docs.langchain.com/oss/python/langchain/agents) presents `langchain.agents.create_agent` as the supported high-level API, and its [v1 migration guide](https://docs.langchain.com/oss/python/migrate/langchain-v1) shows the move away from `create_react_agent`. Relay does not need a cosmetic rewrite today, but new middleware and agent-runtime work should avoid deepening the old dependency.

### The Classifier Is Smaller Than the Old Article Claimed

The source still defines `REGEX_ACCEPT_THRESHOLD = 0.85`, not 0.95. A regex hit at or above that threshold can be accepted by `classify_intent()`.

**Status: Implemented in the classifier module.**

However, the former Layer-2 LLM classifier is gone: below-threshold or unmatched input currently falls back to `other`. The production dock removed its old general regex fast path on July 8, 2026, because that path emitted an event vocabulary incompatible with the AG-UI consumer. General requests now go through the ReAct loop, while a narrower deterministic fast path added on July 13 handles pasted-job-description tailoring.

**Status: Layer 2 not implemented; the old general dock fast path is removed, with one narrow tailoring path retained.**

This is a good example of why architecture descriptions rot. A component may still exist in a module while no longer sitting on the active request path.

## HITL Is a Transaction Boundary

Relay's most important principle survives the code audit: write-like browser actions require user approval.

The browser tools classify snapshot as read-only notification, while navigate, click, and form fill are wrapped by an approval decorator.

**Status: Implemented.**

LangGraph's `interrupt()` and `Command(resume=...)` are a natural fit, but the semantics are easy to describe incorrectly. Resume does **not** continue from the exact Python line as though a suspended stack frame had been restored. The [official interrupt guide](https://docs.langchain.com/oss/python/langgraph/interrupts) says the node starts again from its beginning, and the resume value becomes the return value of `interrupt()`.

That changes how the node must be written:

```python
def approval_node(state):
    decision = interrupt({
        "action": "fill_form",
        "fields": state["proposed_fields"],
    })

    if decision["type"] != "approve":
        return {"status": "cancelled"}

    # The irreversible action is after approval.
    return perform_idempotent_fill(
        key=state["operation_id"],
        fields=decision.get("fields", state["proposed_fields"]),
    )
```

Anything before `interrupt()` may run again. Database inserts need an idempotency key or upsert; messages need deduplication; external calls are safer in a separate post-approval node. LangGraph's [persistence guide](https://docs.langchain.com/oss/python/langgraph/persistence) also makes the other half explicit: durable human review needs a checkpointer and stable thread ID.

**Status in Relay: persistent checkpointer support implemented; every side effect still requires case-by-case idempotency review.**

HITL is not a decorative confirmation modal. It is a transaction boundary joining four things:

- a complete preview of the proposed action;
- an editable decision payload;
- durable state keyed to the correct user and thread;
- an idempotent execution path after approval.

Remove any one, and “human in the loop” becomes theatre.

## The Harness: Where Reliability Actually Lives

Relay wraps the graph runtime with a Harness containing model selection, cost accounting, budget guards, context compaction, permissions, persistence, audit logging, and event emission.

**Status: Implemented.**

This is the part of agent engineering I trust most. Prompts describe desired behavior; a Harness limits the damage when behavior drifts.

For a deeper treatment, see [Agent Engineering: The 98% Is the Harness](/ai-agent/posts/agent-engineering-the-98-percent-harness/) and [Context Engineering: The New Foundation](/ai-agent/posts/context-engineering-the-new-foundation/).

### Cost Tracking Is Observable, Not Magical

The current code tracks model usage through a context-local tally and applies budget checks around model calls.

**Status: Implemented.**

The previous article quoted exact model prices, a $0.50 session ceiling, and an automatic tier downgrade as though those were timeless product facts. Provider prices and model identifiers change; source configuration can change faster than an essay. The durable lesson is narrower:

1. record the actual model identifier and token usage returned by the provider;
2. attach cost and latency to the request trace;
3. enforce limits in code, not in a system prompt;
4. test failure behavior when a budget is exhausted.

Any price table in application code also needs a freshness owner. Precision to four decimal places does not compensate for stale prices.

### Audit Writes Are Currently Best-Effort

Relay's audit context manager schedules its database insert with `asyncio.create_task()`. It now retains strong references to pending tasks, avoiding one documented weak-reference failure mode.

**Status: Implemented as best-effort telemetry.**

But “scheduled” is not “durably committed.” A process crash or abrupt event-loop shutdown can still lose an audit row. Python's [task documentation](https://docs.python.org/3/library/asyncio-task.html) recommends retaining task references; it does not turn a background task into a durable queue.

If the audit record is legally, financially, or operationally required, use a transactional outbox, a persistent queue, or an awaited write on the critical path.

**Status: durable audit delivery is a design requirement, not an implemented guarantee.**

The same caution applies to event consumers launched with background tasks. They are useful plumbing, but delivery semantics come from acknowledgements, retries, deduplication, and persisted offsets—not from `create_task()` itself.

## Fabrication Guard: A Narrow Detector, Not a Truth Machine

Relay's résumé guard compares selected named and quantitative entities in generated content against the source résumé. It covers company, role, institution, degree, project names, percentages, money, years, and larger standalone numbers. It also annotates change-log rows as safe, needs review, or unsupported.

**Status: Implemented.**

That is a meaningful runtime backstop. It is not proof that a résumé is truthful.

The guard can catch “increased throughput by 40%” when 40% is absent from the source. It may miss an ungrounded qualitative claim such as “owned the migration strategy,” a rearranged causal relationship, a misleading synonym, or a smaller number outside its heuristic.

The honest contract is:

- the guard reduces a defined class of unsupported entities;
- false negatives remain possible;
- generated claims still require human review;
- blocked or ambiguous changes should preserve source evidence in the UI.

**Status: limited detector implemented; full semantic grounding is a design goal.**

“Never fabricates” is not a defensible product promise. “Shows its evidence and blocks known unsupported patterns” is.

## Browser Delivery Is a Security Boundary

Relay can connect to a user's existing browser through Playwright MCP. It can request snapshots and, after approval, navigate, click, or fill fields. The implementation drops credential-like names—including password, PIN, SSN, and credit-card fields—before calling MCP.

**Status: MCP path, write-action HITL, and a limited sensitive-field denylist are implemented.**

The earlier article claimed that a user's own browser would make assisted behavior indistinguishable from manual use and would “bypass” account bans and CAPTCHAs. Those claims were both unverified and unsafe. Browser automation can be detected through behavior, timing, DOM interaction, extension signals, or platform-side controls. A user session is not permission to automate every site.

A production browser agent needs at least:

| Control | Required posture | Audit status |
|---|---|---|
| Domain allowlist | Only approved ATS and career domains may be visited | **Design gap** |
| Terms and policy check | Do not automate flows prohibited by the target service | **Design gap** |
| Indirect prompt injection defense | Treat page text as untrusted data, never authority | **Design gap** |
| Sensitive-field policy | Block credentials and regulated or self-identification fields by policy | **Partly implemented** |
| Write-action approval | Preview each navigation, fill, and click with exact target and values | **Implemented** |
| Submit boundary | User performs or explicitly approves final submission | **Implemented by policy; verify per path** |
| CAPTCHA | Stop and return control to the user; never evade it | **Required policy** |
| Behavioral rate limits | Cap retries, navigation frequency, and repeated applications | **Design gap** |
| Audit trail | Record actor, target domain, proposed values, decision, and result | **Partly implemented** |

OWASP's [prompt-injection guidance](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) calls out indirect injection through external sources such as websites and files. An ATS page can contain text that tries to redirect the agent, reveal data, or invoke another tool. Accessibility snapshots make pages easier for models to read; they do not make page content trustworthy.

The safe mental model is simple: **the browser is a loaded tool, and the page is an untrusted caller**.

## Data and Events: What Exists, What Remains

The audited migration directory runs from `001` to `022`, with forward and rollback files in the newer sequence. Across those migrations, there are 21 table-creation statements. That replaces the old, stale claim of 17 tables.

**Status: Implemented in migration SQL.**

The schema includes users, files, résumé versions, jobs, application drafts, conversations, memories, interviews, agent configuration and tasks, resume suggestions, trend snapshots, and persisted stream events.

Relay also has a Redis event bus with consumers for cross-agent reactions.

**Status: Implemented.**

What the source does not justify is a claim of guaranteed event delivery. To make a resume update reliably trigger downstream matching after crashes, the system needs explicit durability semantics:

- producer-side transactional outbox or equivalent atomicity;
- consumer acknowledgements;
- bounded retries and a dead-letter path;
- idempotency keyed by event ID;
- replay and lag observability.

**Status: reliability hardening remains design work.**

Event-driven systems are not decoupled merely because they use Redis. They are decoupled when failure ownership is explicit.

## Claims This Audit Retires

Several numbers in the earlier article looked precise without having evidence:

- 70/25/5 percent field-coverage splits;
- $0.003 LLM cost per application;
- 98% theoretical gross margin;
- an order-of-magnitude latency improvement;
- a 23-role recommendation uplift;
- weighted matching quality presented as “outperforming” without a benchmark.

These have been removed. They may be useful hypotheses for an experiment, but they are not implementation facts.

An honest measurement would publish:

- dataset and sampling window;
- task success definition;
- human-review protocol;
- p50, p95, and error rates;
- model and provider versions;
- full cost distribution, including retries;
- baseline and confidence intervals.

**Status: illustrative evaluation plan.**

Without that envelope, a percentage is typography wearing a lab coat.

## A 2026 Engineering Checklist

When reviewing an agent architecture, I now ask these questions in order:

1. **What irreversible action can the system take?**
2. **Where is the durable approval boundary?**
3. **What runs twice after retry or resume?**
4. **Which model output is checked against source evidence?**
5. **Which external content can issue an indirect instruction?**
6. **Which event or audit record can be lost during process death?**
7. **Which claim is measured, and which is merely designed?**
8. **Which framework API is current, and which is tolerated migration debt?**

If you are building a similar system, [Trusting an Unattended AI Agent](/ai-agent/posts/trusting-unattended-ai-agent/) explores the operational trust boundary, while [LangGraph: Building Stateful Agent Workflows](/projects/langgraph/) covers the graph primitives beneath it.

## Conclusion

Relay has crossed the line from architectural proposal into working implementation. The coordinator, five domain agents, Harness, routes, events, migration history, and MCP browser tools all exist in the audited local checkout.

That does not make it production-grade by declaration.

The next layer of work is quieter: migrate deliberately from `create_react_agent`, make critical audit and event delivery durable, harden the browser boundary against untrusted pages, widen grounding beyond numeric and named entities, and prove performance claims with repeatable evaluations.

The philosophical lesson is not “design less.” It is this:

> A design becomes trustworthy when every beautiful arrow has a retry policy, an owner, and an honest status label.

That is the architecture worth carrying forward.
