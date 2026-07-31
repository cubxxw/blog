---
title: "Agent Engineering Harness: The Eight Pillars Behind the 98.4%"
date: 2026-06-17T09:30:00+08:00
lastmod: 2026-07-31T12:00:00+08:00
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
  - Context Engineering
  - Architecture
  - MCP
description: >
  Agent Engineering Harness explained through eight production pillars: orchestration, context, memory, tools, reliability, evaluation, cost, and governance.
tldr:
  - "98.4% is a narrative anchor, not a paper-reported measurement. The defensible claim is simpler: most production engineering surrounds the model loop."
  - "The harness connects a probabilistic model call to persistent state, tools, budgets, permissions, recovery, and evaluation."
  - "Its eight concerns are orchestration, context, memory, tools, reliability, evaluation, cost, and governance."
  - "Choose frameworks by the decisions they safely remove from your team, not by the number of abstractions they advertise."
maturity: budding
cover:
  image: '/images/blog/agent-engineering-harness.webp'
  caption: 'Eight engineering concerns surrounding a small agent loop.'
  alt: 'A technical diagram with a tiny agent loop at the center, surrounded by concentric rings of the eight pillars: orchestration, context, memory, tools, reliability, evaluation, cost, governance'
columns:
  - agent-engineering
---

> A small model loop becomes a system only after we decide what it may remember, touch, spend, and survive.

An agent demo can be a loop around an API call. A production agent is the surrounding discipline: state, tools, permissions, recovery, evaluation, and cost. This article offers a map of that discipline rather than a framework tutorial. Each pillar is described through the gap it fills, a minimal implementation, and the boundary where it stops helping.

The factual review below is current through **31 July 2026**. Precise claims are linked to first-party engineering posts, specifications, or the original paper. Numbers that could not be tied to a stable version and evaluation setting have been removed.

---

## The Number Everyone Cites: 98.4%

The title keeps a number that travels well, but it needs a warning label.

The original study, [*Dive into Claude Code*](https://arxiv.org/abs/2604.14228) (submitted 14 April 2026; revised 2 July 2026), analyzed publicly available TypeScript from Claude Code v2.1.88. Its abstract says the core is a simple loop and that most code sits around it: permissions, compaction, extensibility, delegation, and session storage.

It does **not** report a reproducible “1.6% intelligence / 98.4% infrastructure” measurement in the abstract, nor does it define a stable denominator for that split. Here, **98.4% is only a narrative anchor**. It should not appear in a benchmark table, a design requirement, or a claim about every agent.

The defensible point is narrower: production behavior depends heavily on code outside the model call. OpenAI's [*Unrolling the Codex agent loop*](https://openai.com/index/unrolling-the-codex-agent-loop/) (23 January 2026) calls that layer the **Codex harness** and describes it as the core loop and execution logic. The model supplies capability; the harness determines how that capability is exposed, constrained, observed, and recovered.

---

## First Principles: Why This Discipline Must Exist

![A stateless probabilistic predictor versus a stateful, unbounded world — the harness is the bridge between them](/images/blog/agent-engineering-impedance.webp)

Before listing the pillars, we have to answer a more fundamental question: **why can't the model just do the whole job end to end? Why wrap such a thick layer around it?**

The answer is an **impedance mismatch.** Unrolled into a causal chain:

1. **Treat a model invocation as a stateless boundary.** Persistence may exist in the product or provider, but the engineering contract for one inference call is inputs in, outputs out.
2. **Real tasks accumulate state and side effects.** They span turns, call tools, retain constraints, and may need to resume after interruption.
3. **The harness reconciles those boundaries.** It assembles context, records state, mediates tools, and decides what recovery means.

From this throughline come two iron laws that run through everything, explaining the design motivation behind nearly every one of the eight pillars below:

**Iron law one: context is a scarce, rotting compute resource.**

Anthropic's [*Effective context engineering for AI agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (29 September 2025) describes context as a finite resource with diminishing marginal returns. Its practical target is the smallest set of high-signal tokens that improves the desired outcome—not the fullest possible window.

**Iron law two: the core component is itself probabilistic.**

Model outputs are probabilistic and tool observations may be incomplete. Any step **may** be wrong, so correctness cannot be inferred from a clean process exit. Reliability, evaluation, and governance exist because the system must detect, contain, and learn from uncertainty.

---

## A Component Anatomy

Before the eight pillars, take one look at what parts actually live inside a harness. The diagram below is the standard "component model" reverse-engineered from production systems like Claude Code / Codex. Being able to recite this list basically means you know what modules a production-grade agent is assembled from:

```
                    ┌──────────────── HARNESS ────────────────┐
   user / event ──► │  Instruction Manager  (system prompt / identity) │
                    │  Context Builder      (assemble context per turn) │
                    │  Memory Manager       (prefetch / write-back / extract) │
                    │  Tool Registry        (tool discovery / schema)  │
                    │  Permission Resolver  (risk tier / approval)     │ ──► LLM
                    │  Model Adapter        (provider abstraction / routing) │ ◄──
                    │  Budget Tracker       (turn / token / $ budget)  │
                    │  Compaction Engine    (context compression)      │
                    │  Trace / Observability(trace every step)         │
                    │  Stop-condition Logic (termination check)        │
                    └──────────────────────────────────────────┘
                                      │
                              tools / world
```

The **eight pillars** are what you get when you regroup these parts by "engineering concern." Below, each one is taken apart in three beats: **the gap it fills → minimal implementation → failure boundary.**

---

## Pillar One: Orchestration (Control Flow)

**The gap it fills:** an LLM outputs one chunk of text at a time; but tasks need the "think → act → observe → think again" multi-step loop, plus coordination across subtasks. Orchestration decides **how control flows**.

**Minimal implementation:** the fabled 10-line while loop.

```python
state = init(task)
while not done(state):
    thought, action = model(render_context(state))      # Think
    observation = execute(action)                        # Act (through the harness!)
    state = update(state, thought, action, observation)  # Observe / Update
    if turns(state) > MAX_TURNS:                          # safety net
        break
return finalize(state)
```

The `execute(action)` line is the entry point to the harness. A model can request deletion; the runtime decides whether the request is valid, where it may run, and whether approval is required. OpenAI's [Codex loop description](https://openai.com/index/unrolling-the-codex-agent-loop/) follows the same broad shape: the model emits a response or tool call, the harness appends the tool result, and the cycle continues.

Let's run the loop through a real scenario. Watch the second `run_command`: the model merely **requests** the deletion — what decides whether it happens is the harness's confirmation gate:

{{< demo-agent-trace title="Agent Loop × Harness Gate" question="Clean the build artifacts out of this repo" >}}
[
  {"type":"think","text":"Files need deleting. First see what's actually there — never act blind."},
  {"type":"tool_call","tool":"run_command","args":"{\"cmd\":\"ls dist/ build/\"}"},
  {"type":"tool_result","text":"dist/  14 files · 3.2 MB\nbuild/  7 files · 1.1 MB"},
  {"type":"think","text":"Target confirmed. Deletion is a dangerous action — this call will be intercepted by the harness for approval."},
  {"type":"tool_call","tool":"run_command","args":"{\"cmd\":\"rm -rf dist build\"}"},
  {"type":"tool_result","text":"[harness] rm -rf matched a confirmation rule → awaiting approval → approved\n21 files deleted (4.3 MB)"},
  {"type":"answer","text":"Cleaned dist/ and build/ — 21 files, 4.3 MB. The deletion passed through the harness's confirmation gate before executing; the model only ever issued requests and never touched the shell."}
]
{{< /demo-agent-trace >}}

**Common control patterns:**

- **Single-agent paradigms**
  - **ReAct** interleaves reasoning and action. It adapts locally but can drift.
  - **Plan-and-Execute** separates planning from execution. It is easier to inspect but needs explicit re-planning when assumptions change.
  - Many systems use a coarse plan with local re-planning.
- **Multi-agent topologies**
  - **Supervisor / Orchestrator-Worker** gives one lead responsibility for delegation and synthesis.
  - **Network / Swarm** gives peers more freedom but creates a larger coordination surface.
  - Protocol layer: **A2A (Agent-to-Agent)** for cross-agent communication, **MCP (Model Context Protocol)** for agent-to-tool.

But here's the **single most important judgment**, worth pulling out on its own: **who controls state transitions?**

> **LLM controls state transitions = Agent; deterministic code controls them = Workflow.**

Anthropic draws this boundary in [*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents) (19 December 2024): workflows follow predefined code paths; agents dynamically direct their process and tool use. Its advice is equally useful—start with the simplest approach that works.

Graph runtimes can mix both: code fixes some transitions while the model chooses others.

**Failure boundary:** multi-agent performance is workload-specific. Anthropic reported that its lead-and-subagent research system beat its single-agent baseline by **90.2% on an internal research evaluation**, while consuming about **15× the tokens of chat**; the same post says tightly coupled tasks are a poor fit ([13 June 2025](https://www.anthropic.com/engineering/multi-agent-research-system)). Those figures describe one system and one evaluation, not a general multiplier.

The durable lesson is structural: parallelize work that can be explored independently and merged cheaply. If workers must continuously share implicit state or edit the same object, coordination can consume the gain.

---

## Pillar Two: Context Engineering

Context is one of the widest gaps between a demo and a long-running system. I cover it separately in ["Context Is Not Prompt"](../context-engineering-the-new-foundation/); here it belongs inside the harness.

**The gap it fills:** iron law one — finite window plus context rot.

**Four useful failure modes:**

| Failure mode | What it is | Typical fix |
|---|---|---|
| **Poisoning** | A hallucination / error enters the context, then gets referenced and copied repeatedly; the agent builds strategy on a false premise | Verify before writing; isolate untrusted sources; rollback-able state |
| **Distraction** | The context grows so long the model over-relies on history and replays past actions instead of synthesizing a new plan | Compress / summarize; watch for the "distraction ceiling" |
| **Confusion** | Irrelevant info (especially too many tool descriptions) gets used, degrading output quality | Load tools on demand; only select relevant context |
| **Clash** | Parts of the context contradict each other (multiple sources, multiple MCPs, accumulation across turns) | De-conflict; unify sources |

**Four operating strategies:**

- **Write (out)**: persist information **outside** the window — scratchpad, state fields, external storage, memory tools.
- **Select (in)**: pull only **relevant** content back into the window each turn — RAG, memory retrieval, on-demand tool mounting.
- **Compress**: summarize rather than crudely truncate as you approach the window.
- **Isolate**: use a schema-shaped state, exposing only the `messages` field to the LLM; or isolate subtasks into a subagent's own context.

Anthropic defines **compaction** as summarizing a conversation near its context limit and continuing from that summary. The stable principle is to retain decisions, unresolved questions, and next actions while removing redundant tool output. Exact trigger percentages vary by model, product version, and configuration, so they do not belong in a portable architecture assumption.

**And one pervasive economic constraint: the prompt cache.**

Prompt caching makes prefix stability an economic concern. Prices and cache semantics change, but the engineering habit survives: keep common instructions and tool definitions stable, append volatile observations later, and measure actual cache behavior rather than embedding an old price table in the design.

**Failure boundary:** context engineering solves "what the context should be," but not "what intent it should serve." An agent can receive perfectly relevant, isolated, economical context and **still pursue a goal-violating outcome.** That's governance's job (Pillar Eight).

---

## Pillar Three: Memory Engineering

**The gap it fills:** context engineering manages the window **within a single session**; but an agent needs to remember facts, preferences, and procedures **across sessions**. Memory is the continuously evolving substrate outside the window.

**A practical four-layer model:**

- **Working** = the current context window itself (fastest, most expensive, most rot-prone).
- **Episodic** = concrete records of past sessions (typically SQLite + full-text search + LLM summaries for cross-session recall).
- **Semantic** = abstracted facts / knowledge (MEMORY.md, knowledge graphs, vector stores).
- **Procedural** = "how to do something" (the hardest to externalize, and the most valuable).

The minimal implementation can be a curated `MEMORY.md` loaded at session start. Storage is easy; selection, freshness, provenance, and forgetting are the real work. External files also make compaction less destructive: a summary can retain a path to evidence instead of pretending to preserve every detail.

Whether to keep failures is a policy choice. Retain a failed action when it changes the next decision; discard repetitive output that only consumes attention.

**Failure boundary:** memory goes **stale** and **conflicts**. A "deployment process" written in March is wrong by May; two contradictory memories trigger context clash. So a memory system needs **versioning / freshness** and **conflict resolution**, not just append.

---

## Pillar Four: Tool Engineering

**The gap it fills:** an LLM only generates text; to change the world (query data, send email, run code) it must go through tools. Tools are the agent's "hands."

**Minimal implementation:** give the LLM a set of JSON-schema-described functions plus a dispatcher that routes the model's `tool_call` to real functions and feeds the result back into message history. But that dispatcher hides the harness's first ring of defense, and the order can't be scrambled:

```python
def dispatch(tool_call, registry):
    spec = registry.get(tool_call.name)
    if spec is None:
        return ToolError("unknown_tool", retryable=True)        # let the model self-correct
    err = validate_against_schema(tool_call.args, spec.schema)
    if err:
        return ToolError("schema_violation", detail=err, retryable=True)
    return spec.run(tool_call.args)                              # only here does it enter the runtime
```

**Engineering points:**

- **Tool design is API design plus instruction design.** Names, descriptions, parameters, and error shapes influence model behavior. Anthropic's [tool-design review](https://www.anthropic.com/engineering/writing-tools-for-agents) (11 September 2025) recommends clear, distinct purposes and token-efficient responses through pagination, filtering, and truncation.
- **Function calling and MCP sit at different layers.** Function calling expresses a model's tool request. MCP standardizes communication between clients and servers; the [2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18/) defines JSON-RPC 2.0 message requirements.
- **Discover tools on demand.** In Anthropic's Google Drive-to-Salesforce example, code execution with MCP reduced context use from roughly 150,000 to 2,000 tokens ([4 November 2025](https://www.anthropic.com/engineering/code-execution-with-mcp)). That is a worked example, not a universal saving.
- **Treat tool output as untrusted, bounded input.** Preserve the evidence needed for the next decision and a reference to the full result.
- **Error classification precedes response strategy:** tools fail — network, timeout, permission, bad args, business errors. **Classify first, then decide** retry / swap tool / degrade / escalate.

**Failure boundary:** tools are the **entry point for side effects** and the **largest security breach**. A tool that can `mv`, send messages, and spend money is a disaster the moment a prompt injection hijacks it — which leads us straight to the governance pillar.

---

## Pillar Five: Reliability Engineering

**The gap it fills:** how to make progress recoverable when model calls, tools, networks, and processes can fail.

First, **a checkpoint is not durable execution.**

- **Checkpoint:** persist enough state to resume from a known boundary.
- **Durable execution:** detect interruption, schedule recovery, prevent unintended duplication, and resume across process boundaries.

Agent workflows contain nondeterminism: model output, time, retrieval, and external services. Recovery should record the result of a side effect and reuse it where semantics require exactly-once behavior. Re-running a model call is a new decision, not a replay of the old one.

The [Crab paper](https://arxiv.org/abs/2604.28138) (submitted 30 April 2026) found that more than 75% of turns in its shell-intensive and code-repair workloads produced no recovery-relevant OS state. Its runtime reached 100% recovery correctness in those experiments and reduced checkpoint traffic by up to 87%. These are workload-specific research results; the useful design question is which state changes are costly or dangerous to repeat.

> **Direct advice:** set checkpoint granularity by "consequence of loss," not by reflexively saving every step. A month-long thread where a missed checkpoint means re-sending or dropping an email deserves strong durability; a purely computational intermediate step that you can just recompute should not be saved.

The standard arsenal also includes error classification, idempotency keys, bounded retries, circuit breakers, hard turn/token/cost budgets, and compensating actions. Retry without idempotency is simply permission to repeat a side effect.

**Failure boundary:** reliability engineering can keep the system from "crashing," but not make it "do the right thing." An agent that forever returns "I'm done" passes every reliability check while doing nothing — that's for eval (Pillar Six) to catch.

---

## Pillar Six: Evaluation & Observability

**The gap it fills:** process completion does not prove task success. Without evaluation, a prompt or harness change is only a story about improvement.

**Two pieces of infrastructure (required before you optimize anything):**

1. **Tracing / observability:** retain model calls, tool calls, compaction events, costs, and end-state changes with suitable privacy controls.
2. **A repeatable test set:** start small, but define success before tuning the system.

**The methodology spectrum:** offline eval (regression on a fixed dataset, guarding against "fixed A and quietly broke B"), online eval (sampling production traffic), and **LLM-as-a-Judge** (scoring with another LLM against a rubric).

LLM judges introduce position, verbosity, and self-enhancement biases, documented in the original [MT-Bench and Chatbot Arena paper](https://arxiv.org/abs/2306.05685) (submitted 9 June 2023). Mitigations include explicit rubrics, order swapping for pairwise comparisons, multiple trials, and human calibration.

An independent judge can help when it receives the task, rubric, evidence, and final state without inheriting the solver's private narrative. It is still a model, not an oracle. Anthropic's [agent-evaluation guide](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (9 January 2026) recommends combining outcome checks, transcript graders, and human review rather than trusting one score.

**Failure boundary:** eval itself can be gamed. Optimize one metric long enough and the agent learns to "please the judge" rather than do well. So you need periodic human spot-checks plus multi-dimensional metrics that cross-check each other.

---

## Pillar Seven: Cost & Latency Engineering

**The gap it fills:** running correctly ≠ running affordably. A demo costing a few cents per run is fine; at scale, token cost and latency will crush the product.

**The core levers:**

- **Prompt cache hit rate:** keep common prefixes stable and measure whether the provider actually reuses them.
- **Model routing:** route by evaluated task difficulty and bind budgets to the model that will run the turn.
- **Parallel tool execution:** run path-independent tool calls concurrently, but force interactive tools serial, and re-feed results in strict order after concurrency.
- **Compaction policy:** trigger from measured quality and budget constraints, not a copied percentage from another product version.
- **Auxiliary model division of labor:** use cheap models for "side tasks" like summarization, vision, classification.

**Failure boundary:** over-optimizing cost sacrifices quality (letting a small model do a big model's job). **Cost vs. quality is a Pareto frontier, not a single objective.** Hold a quality floor with eval, then push cost down.

---

## Pillar Eight: Safety & Governance

**The gap it fills:** greater tool access and autonomy increase the consequences of a wrong decision. Governance limits what the system can do and establishes who may authorize exceptions.

Model-level refusals are useful, but they are not a complete control plane. Runtime validation, least privilege, sandboxing, approvals, audit logs, and organizational policy each cover different failure modes.

From this comes the field's core governance paradigm:

> **Propose / Apply separation:** let the **LLM propose**, and let **deterministic code or a human apply.**

**Propose / apply separation** is a useful default: the model proposes; deterministic code or a human authorizes and applies. The boundary should become stricter as reversibility falls and blast radius rises.

Isolation must follow the threat model. A hardened container may be appropriate for trusted internal code; untrusted generated code may require a stronger sandbox or microVM. No sandbox choice removes the need for narrow credentials, network policy, output validation, and monitoring.

**Failure boundary:** governance trades autonomy for control. There is no universal setting—only explicit risk tiers, observable exceptions, and periodic review.

---

## Weaving the Eight Pillars Together: the Full Lifecycle of One Request

The eight pillars aren't a parallel checklist — they're a pipeline that **flows together within every single request.** Walk it end to end and you see how they mesh:

```
1. Event arrives (user message / cron / subtask)
2. [Governance] Untrusted sources pass an injection scan first    ← Pillar 8
3. [Context] Context Builder assembles dynamically:
     immutable system prefix (identity + instructions)           ← Pillar 2 (cached)
   + injected memory snapshot (prefetch relevant episodic/semantic) ← Pillar 3
   + relevant tools selected (on-demand, avoid confusion)        ← Pillar 4
   + project context / session history                           ← Pillar 2
4. [Budget] Budget Tracker checks turn / token / $ balance       ← Pillar 5
5. [Orchestration] Enter the loop: LLM decides think / act       ← Pillar 1
6.   if tool_call:
       [Governance] permission matrix judges risk tier → approve if needed ← Pillar 8
       [Reliability] execute; on failure classify → retry / degrade / break ← Pillar 5
       [Context] truncate / summarize tool result, then re-feed   ← Pillar 2 + 4
7.   nearing the window → [Context] Compaction                    ← Pillar 2
8.   repeat until goal-check is met or budget is exhausted        ← Pillar 1 + 5
9. [Memory] session end: offline-distill memory / skills, scan write boundary ← Pillar 3
10.[Observability] trace throughout, eval-grade afterward         ← Pillar 6
Throughout: [Cost] cache hits, parallelism, routing apply at every step ← Pillar 7
```

If you can narrate this pipeline in one breath, you've basically nailed the classic whiteboard question — "describe the full process of a production agent handling one request."

---

## The Learning Path: Learn by Pillar, Not by Framework

Finally, a learning path ordered by dependency — each stage fills the gap the previous one left:

| Stage | What to learn | Gap it fills | Minimal milestone |
|---|---|---|---|
| **0 Foundation** | LLM API, function calling, message format, token / cost | Understand one call | Hand-write a 10-line tool loop |
| **1 Orchestration** | ReAct / Plan-Execute, StateGraph / Edges / Checkpointer | Single step → multi-step | Run an agent that calls tools multiple times |
| **2 Context** | Four failure modes, Write/Select/Compress/Isolate, prompt cache | Short chat → long-horizon without rot | A compressor + a cache-stable prefix |
| **3 Memory** | Four memory layers, bounded curation, offline extraction, vector / FTS5 | Single session → useful continuity | MEMORY.md + cross-session recall |
| **4 Tools** | Tool design, MCP vs FC, result handling, error classification | Only talks → can change the world | Connect MCP + tool-failure fallback |
| **5 Reliability** | Fallback chains, circuit breakers, budgets, saga, idempotency, durable execution | Runs → can recover | Recovery tests for critical boundaries |
| **6 Evaluation** | Tracing, offline / online eval, LLM-as-judge, independent judge | By feel → measurable | A regression eval + a judge agent |
| **7 Cost** | Cache hits, routing, parallelism, auxiliary models | Affordable demo → scale | Reduce measured cost while holding an eval floor |
| **8 Governance** | Propose/apply separation, permission matrix, least privilege, injection defense, sandbox | Powerful → safe and controllable | Automated changes default to dry-run + approval gate |

> **Learning advice:** learn by pillar, not by framework. A framework is one set of decisions across these concerns; the map lets you ask which decisions it owns and which remain yours.

And that leads to the final axis for selection — which is really just one sentence:

> **Look at which pillars' decision rights a framework takes off your hands.**

Encapsulation transfers decision rights. MCP standardizes part of tool integration; workflow runtimes can own scheduling and recovery; graph libraries can own state transitions and persistence. The build-versus-buy question is not which product looks strongest. It is whether the decisions inside the abstraction are part of your differentiation.

---

## One Line to Close

By now we can compress the whole map into a single sentence:

> **Agent Engineering builds the harness between a probabilistic model call and a stateful world. Orchestration controls steps; context curates attention; memory preserves useful continuity; tools mediate action; reliability enables recovery; evaluation measures outcomes; cost constrains scale; governance limits authority.**

The 98.4% in the title is not a measurement. It is a reminder to look away from the impressive center and inspect the quiet machinery around it. Models change. Clear boundaries, evidence, and recovery habits compound.

---

### Appendix: Verified Sources

| Topic | Primary source and scope |
|---|---|
| Claude Code architecture | [Liu et al., *Dive into Claude Code*](https://arxiv.org/abs/2604.14228), v2 revised 2 July 2026; analysis of v2.1.88. It supports the “small loop, large surrounding system” framing, not the 98.4% figure. |
| Codex harness terminology | [OpenAI, *Unrolling the Codex agent loop*](https://openai.com/index/unrolling-the-codex-agent-loop/), 23 January 2026. |
| Context engineering | [Anthropic, *Effective context engineering for AI agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), 29 September 2025. |
| Multi-agent research | [Anthropic, *How we built our multi-agent research system*](https://www.anthropic.com/engineering/multi-agent-research-system), 13 June 2025; internal research evaluation and token observations only. |
| MCP tool efficiency | [Anthropic, *Code execution with MCP*](https://www.anthropic.com/engineering/code-execution-with-mcp), 4 November 2025; Google Drive-to-Salesforce example. |
| Recovery | [Wu et al., *Crab*](https://arxiv.org/abs/2604.28138), submitted 30 April 2026; shell-intensive and code-repair workloads. |
| Agent evaluation | [Anthropic, *Demystifying evals for AI agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), 9 January 2026; [Zheng et al.](https://arxiv.org/abs/2306.05685), submitted 9 June 2023. |

> Evidence decays more slowly when its scope travels with it. Before copying a number into a design document, carry the date, version, workload, and denominator too.
