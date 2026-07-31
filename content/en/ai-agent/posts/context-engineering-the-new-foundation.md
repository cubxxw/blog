---
title: "Context Engineering: The New Foundation for AI Agents"
date: 2026-06-22T03:30:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Context Engineering
  - AI
  - LLM
  - Agent
  - MCP
categories:
  - Development
description: >
  Learn how context engineering improves AI agents through retrieval, compaction, memory, and token budgeting—and why high-signal context beats a larger window.
tldr:
  - "Prompt engineering is writing one instruction well. Context engineering is deciding, on every inference call, what goes into the whole window, in what order, and what gets evicted. The center of gravity moved from wording to wiring."
  - "Context is finite, and context rot means recall can worsen as the window grows. The goal is the smallest sufficient set of high-signal tokens, not the largest possible prompt."
  - "Two representative frameworks offer complementary views: LangChain's Write / Select / Compress / Isolate describes actions; Sourcegraph's Instructions / Retrieval / Memory / Tools describes objects. Neither is an industry standard."
  - "Memory and context engineering overlap but are not interchangeable: context engineering curates the present input, while memory also concerns how information persists, evolves, and is retrieved across turns or sessions."
  - "My claim: the scarce thing is not the model but the world line—only context can tell an AI who you are, where you are, and what you want. That line deserves to live local-first, in your own hands."
maturity: budding
faq:
  - q: "What is context engineering?"
    a: "Context engineering is the set of strategies for curating and maintaining the most useful tokens that enter an LLM's context window on every inference call—the system prompt, retrieved documents, conversation history, tool definitions, and memory. Anthropic has articulated this distinction in its engineering guidance, and Karpathy helped popularize the broader term."
  - q: "How is context engineering different from prompt engineering?"
    a: "Prompt engineering optimizes the wording of one instruction; context engineering optimizes the wiring of the whole window. Sourcegraph's operational test: if you are swapping nouns and adjectives, you are doing prompt engineering; if you are changing what data the agent retrieves, in what order, with what re-ranking, and what gets evicted when the window fills, you are doing context engineering."
  - q: "What is context rot?"
    a: "Context rot describes the observed tendency for recall to worsen as a context window grows. Transformer attention's n² pairwise relationship is one possible mechanism, but training distributions, position encoding, information placement, task design, and model differences also matter. The engineering goal is therefore the smallest sufficient set of high-signal tokens—not simply a full window."
  - q: "What are the main frameworks for context engineering?"
    a: "Two representative frameworks are useful: LangChain's Write / Select / Compress / Isolate—persist outside the window, pull in on demand, keep only necessary tokens, and isolate context—and Sourcegraph's Instructions / Retrieval / Memory / Tools. The first describes actions and the second describes objects; neither should be presented as an industry standard."
cover:
  image: '/images/blog/context-engineering-worldline.webp'
  caption: 'Context engineering: furnishing the model''s room — Write / Select / Compress / Isolate, and the local-first world line between you and the AI.'
  alt: 'A wide schematic of context engineering: the Write / Select / Compress / Isolate pillars feeding an AI, a laptop with notes, and a local-first world line'
columns:
  - agent-engineering
---

**Context engineering is the set of strategies for curating, ordering, and evicting the tokens that enter an LLM's context window on each inference call—system instructions, retrieved documents, conversation history, tool definitions, and memory.** The short version is this: prompt engineering optimizes the *wording* of an instruction; context engineering optimizes the *wiring* of the whole window. Anthropic has articulated this distinction in its engineering guidance, and Karpathy helped popularize the term. The rest of this article takes the emerging discipline apart.

> "We are not really writing prompts. We are furnishing a room for the model — deciding what gets carried in, where it sits, when it gets moved out. The wording is just a sticky note on the desk. What we are actually doing is the interior work."

If you had asked me in 2024 "how do I use AI well," I would most likely have talked to you about prompts: how to phrase instructions, how to set a role, how to give examples. But if you asked me the same question today, my answer would be completely different.

Over the past year, engineering practice has increasingly adopted another term: **context engineering**. It does not erase prompt engineering; it widens the frame. The center of gravity moves from "how do I write this instruction?" to "how do I decide what the model sees on this inference call?"

This article wants to do two things. First, with my **Logic Core**, take apart this discipline as it forms: what it is, where its boundary with prompt engineering lies, and which design patterns are already running in production. Second, with my **Sensitivity Core**, come back to myself — as someone who treats AI as an environment rather than a tool and stays local-first, why I believe the end of context engineering is a thing I call the *world line*.

---

## Draw the boundary first: prompt and context are not the same thing

The easiest confusion is treating context engineering as "advanced prompt engineering." They are related, but they are not on the same layer.

Anthropic, in its widely cited engineering piece, gives a clean distinction: **prompt engineering is "methods for writing and organizing LLM instructions," while context engineering is "the set of strategies for curating and maintaining the optimal set of tokens during LLM inference"** — a set that includes the system prompt, retrieved documents, conversation history, tool definitions, memory, and everything else that might land in the window but is not a "prompt."[^anthropic]

Andrej Karpathy put it more bluntly in his much-shared June 2025 tweet: "+1 for context engineering over prompt engineering... the delicate art and science of filling the context window with just the right information for the next step."[^karpathy]

And Sourcegraph, in its 2026 practical guide, offered a test I particularly love because it is operational:

> "If you're swapping nouns and adjectives, you're still doing prompt engineering. If you're changing what data the agent retrieves, in what order, with what re-ranking, and what gets evicted when the context window fills, you're doing context engineering."[^sourcegraph]

**The center of gravity moved from wording to wiring.** Of everything I read, that is the line worth keeping. Prompt engineering cares about the literal text; context engineering cares about the plumbing — where data enters, what processing it passes through, how long it stays in the window, and when it gets kicked out.

This is not wordplay. When your agent is just a single-turn chatbox, writing one good sentence is almost the entire job. But the moment it has tools, memory, and a retrieval layer, writing the prompt is a small fraction of the whole system; everything else is the context engineering built around it.

---

## Why "engineering": context is a finite resource, and it rots

Calling it "engineering" rather than "tricks" has a hard justification. The context window is not a container that is better the larger it gets — it is a **finite resource with diminishing marginal returns**.

Anthropic states it directly: "Context, therefore, must be treated as a finite resource with diminishing marginal returns." And — "Good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome."[^anthropic]

One reason is a phenomenon called **context rot**: **as the number of tokens in a context window grows, a model's ability to recall information from it can decline.**[^anthropic] Transformer attention forms n² pairwise relationships across n tokens, which Anthropic offers as one possible mechanism—not a complete causal explanation. Training distributions, position encoding, where the evidence appears, the task, and the model itself can all change the result. Chroma's long-context experiments provide useful empirical evidence, but they are benchmarks rather than a universal law for every production workload.[^chroma]

Here is a counterintuitive but crucial detail Anthropic itself stresses: **minimal does not necessarily mean short.** What you want is not context cut to the fewest words, but cut to the highest information density — keep the high-signal, drop the low-signal.

For me, this turns "context is the bottleneck" from a line in my notebook into an engineering question. The limit is not only how capable the model is; it is whether, on *this* inference call, the right evidence reached it. A million tokens of noise can be worth less than a thousand tokens of signal.

---

## Two representative frameworks for the same window

Context engineering is still moving quickly, and no standards body has settled on one canonical map. Two **representative and complementary** four-part frameworks are nevertheless useful: they are practice-oriented lenses from particular authors and companies, not proof that the field has converged.

### Scheme A (LangChain / Lance Martin): Write / Select / Compress / Isolate

LangChain's Lance Martin (who originated this taxonomy) grouped all approaches into four buckets in June 2025:[^langchain][^lance]

- **Write** — save information **outside** the context window (drafts, external files, memory).
- **Select** — **pull** information **into** the window when needed.
- **Compress** — retain only the tokens **required** to finish the task.
- **Isolate** — **split up** the context (e.g. multi-agent, each holding its own slice).

### Scheme B (Sourcegraph): Instructions / Retrieval / Memory / Tools

Sourcegraph, under an explicit heading "The Four Pillars of Context Engineering," gives a different cut:[^sourcegraph]

1. **Instructions / system prompt** — identity, rules, constraints.
2. **Retrieval** — RAG, vector, SQL, file, just-in-time retrieval.
3. **Memory** — short-term (conversation + tool results) plus long-term (preferences, conventions, summaries).
4. **Tools** — the capabilities the agent can call.

These two are not competitors. They cut the same ground from two axes: **what action you take** (Write / Select / Compress / Isolate) and **what object you manage** (Instructions / Retrieval / Memory / Tools). Cross them — "Compress the Memory," "Select for Retrieval" — and you roughly hold the whole map of context engineering.

> One honest caveat: these two are compatible and mutually reinforcing, but they are **not the same set of labels**. Anyone who flattens them into "one four-pillar model" is being lazy. I prefer to treat them as two projections, lighting the same solid from different angles.

---

## Down to the ground: patterns already in production

Beyond the abstract frameworks, what genuinely excites me is that this year the design patterns of context engineering moved from "war stories" to **first-party API primitives** and **reproducible engineering practice**.

### Retrieve, then re-rank: the lesson behind 50 → top-5

Sourcegraph uses a concrete illustration: retrieve 50 high-recall candidates, then re-rank them to a precise top five instead of dumping all 50 chunks into the prompt. **Those numbers are an example, not universal tuning advice.** In a real system, candidate count and top-k should be chosen against recall, latency, cost, and offline evaluation. The durable idea is a two-stage pipeline: miss as little as possible, then use a cross-encoder or cheaper model to pass only the highest-signal evidence into the window.[^sourcegraph]

This is the engineering antidote to context rot: **few and precise beats many and blurry.**

### Cut before it enters the window, not regret after

Sourcegraph defines token-budget management as "the discipline of cutting low-signal content *before* it enters the context window, not after." Concrete moves: truncating tool outputs, compacting old conversation into a running summary, dropping chunks below a relevance threshold, hard-capping the re-ranker.[^sourcegraph]

### Summarization-based compaction: Claude Code closes the loop

Claude Code provides an intuitive example: auto-compact is enabled by default and summarizes older conversation history as the window fills. The current documentation describes the behavior and exposes configuration such as `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW`; it does not justify treating one percentage as a permanent product guarantee. Models, context sizes, and releases can all move the practical boundary.[^claude-code-env][^claude-code-context]

### Anthropic brought three distinct strategies into the API

This is the step with the most signal value: context management is no longer only a script you hand-roll; it is also a platform capability. Anthropic currently documents three first-party strategies for distinct bottlenecks:[^cookbook][^context-editing][^server-compaction]

- **Server-side compaction (`compact_20260112`)** summarizes older conversation history at a configurable token threshold and returns a typed compaction block.
- **Server-side context editing**, including tool-result clearing (`clear_tool_uses_20250919`), selectively removes stale, re-fetchable material before the request reaches the model.
- **The memory tool (`memory_20250818`)** gives the model a protocol for writing to persistent storage **outside** the window so information can survive across sessions.

The Memory tool's design philosophy suits me well: it is **client-implemented**. The API provides the protocol, while **where and how data is stored remains the client's responsibility; the model decides when and what to save.** This separates *what to remember* from *how to persist it*.[^cookbook]

There is a second distinction worth keeping current. Client-side SDK compaction remains available through `tool_runner`, but Anthropic now recommends server-side compaction for most long-running conversations. The Python, TypeScript, and Ruby SDKs mark `compaction_control` as deprecated. Tool-result clearing and thinking-block clearing remain fine-grained server-side context-editing strategies.[^context-editing] These identifiers and recommendations are dated; examples are not eternal truth.

### KV-cache hit rate: the underrated lifeline in production

If the patterns above are the art of *assembling* context, the Manus team's build postmortem is about the *economics* of context engineering in production. Co-founder Yichao "Peak" Ji states it plainly: **"the KV-cache hit rate is the single most important metric for a production-stage AI agent... It directly affects both latency and cost."**[^manus]

Why does it matter? Because "even a single-token difference can invalidate the cache from that token onward." The classic anti-pattern: **putting a timestamp in the system prompt** — it changes every second, so the cache never hits.

From this comes their principle "Mask, Don't Remove": tool definitions sit near the front of the context, so any dynamic add/remove of the tool list invalidates the KV-cache. Their fix is not to add or remove tools mid-iteration, but to **mask token logits directly** to constrain which action the model can select — preserving the cache while avoiding schema violations.[^manus]

And one design I especially love, almost philosophical: **the file system as the ultimate context** — "unlimited in size, persistent by nature." Compression is always designed to be **restorable**: a web page's content can be dropped from the context **as long as the URL is preserved.**[^manus]

> This "restorable compression" deserves to be pulled out on its own. It is not deleting information — it is **leaving information a way home**. It is isomorphic to how I take notes: the body can be folded, can be summarized, but the link and the source always stay — at any moment you can follow the thread and pull the whole thing back.

---

## Bring in the vendors: when the "context layer" becomes a product

If the above is context engineering at the personal/engineering scale, 2026 has a larger line too: **vendors are starting to sell the "context layer" as a product of its own.**

One documented example is Databricks' **Genie Ontology**. Databricks presents it as an automatic context layer that **extracts snippets of knowledge** from tables, queries, dashboards, pipelines, and connected apps, then organizes them into "a living graph of how a company works and what the data inside actually means."[^databricks]

Its thesis is almost the enterprise version of my "context is the bottleneck": **the real bottleneck is not the base model, it is the scattered, inaccessible business context.** Databricks' own words — business context is "scattered across dashboards, queries, pipelines, wikis, tickets, documents, and chat threads"; and "when AI doesn't easily find the information it needs, it fills in the gaps with inference, producing answers that are generic at best and wrong at worst."[^databricks]

> ⚠️ Here I have to be honest with you, and with myself: this Databricks piece is **vendor product marketing**, to be cited as Databricks' *framing/positioning*, not as independent proof. The 84.5% vs 52.4% comparison benchmark in the original post was **refuted** in my fact-check, so I will not cite a single one of those numbers — the positioning is fair to cite, the benchmark is not. This is itself a meta-discipline of context engineering: **every piece of information entering your argument window should first pass the check "is its source good enough for this conclusion?"**

---

## Context vs memory: a window, and the river beyond it

Here we must clarify a relationship that is often flattened: **memory and context engineering overlap, but they are not interchangeable.** External memory must be retrieved, selected, and often compressed before it enters the current context; experiences in the current context may later be distilled into memory.

A survey submitted in December 2025 and revised in January 2026, *Memory in the Age of AI Agents* (arXiv 2512.13564), distinguishes agent memory from related concepts including LLM memory, RAG, and context engineering. It organizes memory by form, function, and dynamics, and argues that memory deserves treatment as a **first-class primitive** in agent design.[^survey]

The paper does **not** support the tidy quotation often attributed to it—"RAG accesses knowledge, context engineering optimizes the immediate window, memory provides persistent identity"—so I will not put those words in the authors' mouths. What it does support is a more useful point: the concepts are related but should not be collapsed. Agent memory also asks what form information takes, what function it serves, and how it is formed, updated, and retrieved over time.[^survey]

My own image is simpler: **context engineering arranges what sits in this window now; memory tends the river that continues beyond it.** The window is cleared and rearranged. The river keeps the possibility of continuity.

In the open-source world, Mem0 (arXiv 2504.19413) is a concrete reference point: it is a memory-centric architecture that **dynamically extracts, consolidates, and retrieves** salient information from ongoing conversations, precisely to address the fundamental difficulty that "LLMs' fixed context windows cannot maintain consistency over prolonged multi-session dialogues."[^mem0] (I deliberately did not cite Mem0's self-reported benchmark numbers — same discipline: treat unverified numbers with care.)

Last year I wrote a technical analysis of Mem0. Looking back, that piece asked how memory is stored; this one asks how memory and context meet inside an agent. My answer is still a metaphor, not a standard definition: **context engineering is the art of space; memory is the art of time.** A continuous agent needs both.

---

## My claim: the end of context is a "world line"

The previous six sections are the part my Logic Core can verify. In this one I switch to the **Sensitivity Core** and say things a fact-check cannot underwrite for me, but which I am increasingly sure of. Please read it as *my opinion*, not as *verified fact* — and that very distinction is something context engineering taught me.

I keep saying one thing: **AI is not a tool, it is an environment.** A tool is something you put down after use; an environment is something you are inside of, that perceives you continuously too. And what decides whether AI is a "tool" or an "environment" is exactly the context — **whether it knows your world line.**

"World line" is a term I borrowed: who you are, where you are right now, what you have done, where you are going, what you care about, what you must not touch. The way we use AI today essentially **compresses the world line into a prompt every single time**, like calling an API: manually packing intent, background, constraints and format and stuffing them in. This is hugely energy-expensive and unsustainable — you cannot re-introduce yourself at the start of every conversation.

The discipline of context engineering is, at bottom, answering "how does the world line get in." And I believe the real answer is not in some vendor's cloud "context layer," but in a place closer to you:

**This line should live local-first, in your own hands.**

There are three layers of reasons, mapping neatly onto my dual-core way of judging:

- **Logic Core (economics and control)**: context is your most intimate data — the questions you have asked, the problems you face, the ideas you explore. Storing it by default with a third party is outsourcing ownership of your world line. And Anthropic's client-implemented Memory tool points exactly to another possibility: **the model decides what to save, but where and how to store it is up to you.** That is a local-first-flavored primitive — proof that "keeping context local" is engineering-feasible.

- **Sensitivity Core (trust and intimacy)**: a local Markdown memory that only you can read, versus an implicit cloud memory you cannot see — which one deserves more trust? For someone like me who moves between nine countries, with unstable networks and a sensitivity to privacy, local-first was never tech purism, it is a **way of surviving**. My world line should not be dreamed up for me somewhere I cannot see.

- **The tension (control vs generativity)**: here is a tension I will not resolve. If I structure the entire world line, make it all local — won't I fall back into the very trap I warn myself about, *using systematization to escape real experience*? Yes. So my position is not "total control," it is "**use order to protect freedom**": context engineering wires up the high-signal, reusable part; everything that cannot be systematized, that belongs to the present moment, is left to simply happen.

Finally, back to a distinction I always use: **stimulative desire** vs **generative desire**. Chasing a larger context window, longer tokens, more tools — that is stimulative: never enough, hungrier the more you feed it. But treating context engineering as a craft that lets **AI genuinely grow into your life and evolve alongside you** — that is generative: each time you wire the world line a little more precisely, what you get is not a one-off hit, but a structural, self-reinforcing internal reward.

> Prompt engineering taught us how to say one sentence clearly. Context engineering will teach us something harder and more important: **how to let a system continuously know who we are.**
>
> And the home of that thing should not be a smarter model. It should be a line that lives in your own machine — one you can always read, and always pull back — your world line.

---

## Appendix: this article's fact discipline

While writing this, I applied the article's own discipline to its evidence: technical claims had to stay within what the cited sources could actually support. Two claims failed that check and are therefore not used as evidence:

1. The Databricks "Genie + Ontology 84.5% vs 52.4% vs 25%" benchmark — failed verification, not cited.
2. "Multi-agent context isolation outperforms single-agent" — failed verification, treated only as a **pattern**, not a proven win.

Beyond that, OpenAI's "Dreaming," memory systems like SaliMory, and the specific controversy around MCP as a "context protocol" produced no independently verifiable sources this round, so this article **intentionally does not elaborate** on their details. Laying that out plainly is the simplest demonstration of "context quality" I can give you.

---

[^anthropic]: Anthropic, "Effective context engineering for AI agents." https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
[^karpathy]: Andrej Karpathy, X (Twitter), 2025-06. https://x.com/karpathy/status/1937902205765607626
[^langchain]: LangChain, "Context Engineering for Agents." https://www.langchain.com/blog/context-engineering-for-agents
[^lance]: Lance Martin, "Context Engineering," 2025-06-23. https://rlancemartin.github.io/2025/06/23/context_engineering/
[^sourcegraph]: Sourcegraph, "Context Engineering: A Practical Guide for AI Agents (2026)." https://sourcegraph.com/blog/context-engineering
[^chroma]: Chroma Research, "Context Rot." https://www.chroma.research/context-rot
[^cookbook]: Anthropic Claude Cookbook, "Context engineering with tools." https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
[^context-editing]: Anthropic Docs, "Context editing." https://platform.claude.com/docs/en/build-with-claude/context-editing
[^server-compaction]: Anthropic Docs, "Compaction." https://platform.claude.com/docs/en/build-with-claude/compaction
[^claude-code-env]: Claude Code Docs, "Environment variables." https://code.claude.com/docs/en/env-vars
[^claude-code-context]: Claude Code Docs, "Explore the context window." https://code.claude.com/docs/en/context-window
[^manus]: Manus, "Context Engineering for AI Agents: Lessons from Building Manus." https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
[^databricks]: Databricks, "Introducing Genie One, Genie Ontology, and Genie Agents." https://www.databricks.com/blog/introducing-genie-one-genie-ontology-and-genie-agents
[^survey]: "Memory in the Age of AI Agents," arXiv:2512.13564. https://arxiv.org/pdf/2512.13564
[^mem0]: "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory," arXiv:2504.19413. https://arxiv.org/abs/2504.19413
