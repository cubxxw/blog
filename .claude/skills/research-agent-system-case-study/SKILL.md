---
name: research-agent-system-case-study
description: Research and write one source-grounded case study about an AI Agent tool, harness, workflow platform, gateway, vertical system, or multi-agent framework. Use for the Agent systems design series and whenever an article must distinguish Agent architecture, technical system architecture, product architecture, design aesthetics, implementation choices, ecosystem position, and operational boundaries; coordinate independent read-only subagents and create a validated Excalidraw architecture diagram.
---

# Research an Agent System Case Study

Use this skill together with `write-blog-from-brief`. Process one brief and one
research object only. Preserve the brief's claim, privacy boundary, and final
human publishing decision.

## 1. Freeze the object before interpreting it

Record:

- official product and repository identity;
- open-source, source-available, or closed-source status;
- version, release, branch, or commit inspected;
- implementation languages and frameworks visible in manifests or source;
- which statements are official facts, source observations, or article inference.

Do not reverse-engineer a closed product's internal architecture from its UI.
For closed products, draw and discuss only publicly documented product,
execution, and trust boundaries. Label inference in prose.

## 2. Split research by concern

Spawn these repository-local, read-only subagents in parallel when available:

1. `agent_architecture_researcher` — loop, context, memory, tools, planning,
   delegation, evaluation, and stop conditions;
2. `system_architecture_researcher` — runtime, state, protocols, concurrency,
   recovery, security, deployment, and language/framework choices;
3. `product_ecosystem_researcher` — user task, interaction, artifact, adoption
   path, extension model, business boundary, category, and ecosystem position.

Give each subagent only the target, research date, and brief question. Do not
give it the expected conclusion. Subagents return evidence and retained-source
notes; they do not edit the article or diagram. The parent writer owns synthesis
and all writes.

Require all three research passes for this series. If the runtime cannot start
the three subagents, mark the brief `blocked` and record the missing capability
instead of silently replacing independent research with one blended pass.

Require every subagent to return:

```text
1. Verified official facts
2. Source-code observations
3. Explicitly stated rationale
4. Inferred rationale
5. Boundaries and failure modes
6. Contradictions and evidence gaps
7. Source ledger: source → claim → proves → cannot prove → version/date
```

## 3. Use primary evidence

Prefer official documentation, repositories, architecture notes, protocols,
release notes, papers, and first-party product material. Use secondary sources
only for discovery or when no primary source exists.

For every retained source, record:

```text
source → claim supported or challenged → what it proves
→ what it cannot prove → version/date checked
```

Link source claims close to the relevant sentence. A README describes intent;
source code describes one inspected implementation; neither alone proves
production behavior. Refresh unstable product, pricing, model, and ecosystem
claims on the execution date.

## 4. Analyze three architectures without forcing three equal chapters

Distinguish these lenses in the reasoning and make them visible in the article:

- **Agent architecture:** how the model decides and acts; context, tools,
  memory, plans, subagents, feedback, and termination.
- **System architecture:** control plane, event/state model, runtime, workers,
  data plane, protocols, identity, permissions, recovery, observability, and
  deployment.
- **Product architecture:** the user's job, entry surface, unit of value,
  interaction and approval model, artifact delivery, continuity, and adoption.

The article shape should follow the strongest design tension. Do not turn the
three lenses into a repeated template if another order reads better.

## 5. Explain design aesthetics through trade-offs

Name the category before comparing features: coding harness, Agent platform,
workflow automation, personal gateway, general Agent product, vertical Agent,
or bounded AI application.

Answer:

- What did the designers deliberately make central?
- What did they deliberately omit or push to extensions?
- Who owns the next state transition: model, graph, code, or human?
- What is the canonical state and artifact?
- Where does probability end and deterministic control begin?
- Which complexity is moved onto users, operators, or integrators?

For language and framework choices, inspect manifests and runtime constraints.
Separate an explicitly stated rationale from an inference based on distribution,
startup latency, concurrency, ecosystem, portability, sandboxing, or team
history. Never invent a founder rationale.

Use a counterfactual when useful: what would become worse if this system used a
different control model, runtime, or extension boundary?

## 6. Make boundaries operational

Cover the boundaries that can change a reader's design decision:

- trust and prompt-injection boundary;
- read versus write capability;
- permission versus sandbox;
- identity, credentials, tenancy, and data residency;
- retries, idempotency, partial success, rollback, and reconciliation;
- concurrency ownership and file/state conflicts;
- context versus durable memory;
- model self-evaluation versus external verification;
- human approval placement and irreversible actions;
- cost, latency, failure budget, and observability;
- appropriate and inappropriate use cases.

State who bears the consequence when the system is wrong.

## 7. Create one visual argument

Invoke `excalidraw-architecture` after the article's central tension is clear.
The main diagram must answer one literal question from the brief; it must not be
a decorated component inventory.

Deliver under:

```text
assets/diagrams/agent-system-series/<order>-<slug>/<stem>.excalidraw
static/images/agent-system-series/<order>-<slug>/<stem>.svg
static/images/agent-system-series/<order>-<slug>/<stem>.png
```

Follow the Excalidraw skill's V1/later semantics, render, validate, and visually
inspect the full-resolution PNG. Do not use dashed strokes for uncertainty.
Exclude unverified internal nodes instead of making speculation look factual.
Add a short reading guide in the article.

## 8. Synthesize independently

Compare the three research passes. Preserve disagreements and evidence gaps.
Do not average them into a generic verdict.

Keep one writable parent executor. Subagents remain read-only and never edit the
brief, article, diagram, shared skill, repository configuration, or column page.
One case run may write only its target brief, one Chinese article, and its
uniquely named diagram source/renders.

The finished article must let the reader:

- recognize the system's design taste;
- reconstruct its main control and state routes;
- understand why key implementation choices fit its constraints;
- decide when to adopt, borrow, or reject the pattern;
- see how it connects to adjacent Agent standards and products;
- identify at least one boundary that marketing material hides.

Do not rank by feature count. Do not claim that multiple personas create
independent judgment when they share the same model, data, and objective.

## 9. Validate and stop

Run the checks required by `write-blog-from-brief`, plus:

- verify product identity, version/date, and repository links;
- ensure facts, source observations, and inference remain distinguishable;
- confirm the diagram source, SVG, and PNG describe the same scene;
- trace every consequential arrow and trust boundary;
- record unresolved evidence and human judgments in the brief receipt;
- add a durable `### 系列研究回执` to the target brief containing research
  date, inspected version/commit, retained primary sources, three architecture
  conclusions, diagram question, strongest boundary, and evidence gaps.

Stop at `ready-to-publish`. Do not translate, commit, push, merge, deploy, or
publish without separate authorization.
