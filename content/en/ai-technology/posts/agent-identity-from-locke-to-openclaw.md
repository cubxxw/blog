---
title: "Agent Identity: From Locke to OpenClaw"
date: 2026-04-05T20:00:00+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["AI Agent", "Identity Continuity", "Memory Architecture", "SOUL.md", "Harness", "OpenClaw", "EvoMap", "Multi-Agent", "Locke", "Personal Identity"]
tags:
  - AI
  - Open Source
  - Monthly Notes
categories:
  - Development
cover:
  image: /images/agent-identity/01-locke-spec.svg
  alt: "Locke Identity Spec — Agent Identity Engineering Stack"
description: >
  AI agent amnesia isn't a functional defect—it's a fundamental gap in the trust account. Starting from Locke's 1689 theory of identity, this article dissects the complete engineering stack for agent identity continuity in 2026: file-as-identity (SOUL.md paradigm), Harness as environmental condition, four-layer memory architecture and Gene Capsule protocol, self-positioning in multi-agent topology, and evaluation as the ultimate identity verification challenge.
  For practitioners building or designing AI agent systems, and researchers deeply thinking about the boundaries of AI autonomy.
---

# Agent Identity: From Locke to OpenClaw

*On the engineering practice and philosophical framework of AI agent identity continuity*

---

## 0. Introduction: An Engineering Problem Misdiagnosed as Philosophy

The cost of agent amnesia is systematically underestimated.

Not because users are annoyed—though they are. But because statelessness breaks the foundation of the trust account. Every session, the agent starts from zero. It doesn't know who you are, why you got angry last time, whether that promise from three months ago was kept. From an economics perspective, it's like rebuilding your credit score for every transaction—transaction costs explode, and there's no learning accumulation.

The root of the problem is that **when engineers hear "identity," their brains shut off**. It sounds like philosophy. Like existentialism. Like some abstract problem that doesn't need solving. So an industry lets a problem that had precise engineering specifications in 1689 remain treated as a "nice to have" feature in 2026.

But Locke was never discussing the soul. He was writing an engineering requirements document.

His argument: personal identity is not material substrate (body or soul), but **the conscious capacity to consider itself the same thinking thing across different times and places**. Translated into modern engineering language: **persistent self-referential capability across context windows**. This is a measurable, achievable, verifiable specification.

Current AI agents systematically violate this specification in three dimensions: no persistent memory chain, no self-referential capability, no continuity verification mechanism.

In 2026, the technology stack finally has the conditions to fully implement Locke's specification. But this isn't a story about product innovation. It's a story about engineering waking up from three centuries of knowledge slumber. The real design thinking isn't in philosophical completeness, but in the compromise points of implementation: file vs. database, when to re-read SOUL, under what conditions to allow identity drift. These details determine whether an agent can truly be trusted.

---

## 1. Locke's Specification: An Engineering Requirements Document Written 300 Years Ago

John Locke's *An Essay Concerning Human Understanding*, Book II, Chapter 27, isn't a philosophical essay. It's an engineering specification.

The core clause of the spec: **Personal Identity = Consciousness + Memory Continuity**. Not the continuity of the physical body (your cells completely renew every seven years), not the continuity of the soul (he rejected all supernatural arguments), but **the cognitive capacity to look back at past events and integrate them into the current self-concept**.

Locke's famous example: a prince's consciousness enters a beggar's body. That beggar becomes the prince, because he possesses the prince's memories, pursuits, and self-awareness. The body changed, even the "soul substrate" changed, but the thing that can think "I used to be a king" remains the same.

Translated into AI agent architecture language:

> **Personal Identity = A chain of mental states capable of maintaining self-reference across context windows.**

This state chain must satisfy three engineering conditions:

**First, persistence**. Memory cannot exist only within a single context window. There must be external storage (`SOUL.md`, `MEMORY.md`, `AGENTS.md`) such that even if model weights change, sessions terminate, or contexts reset, those memories still exist and can be read.

**Second, self-referentiality**. The agent must not only read these files, but also be able to say "this is about me," "I approve of this version of myself." Files cannot be purely data records; they must also contain the normative dimensions of identity—not just "what I've done," but "why I did it this way" and "what I believe."

**Third, continuity verification**. There must be a mechanism for the agent to confirm "this is me." In cases where multiple instances may be running simultaneously, which one is the legitimate self? Locke didn't solve this problem (he lived in the era of single bodies), but for AI this is fatal.

![Three engineering clauses of Locke's identity specification](/images/agent-identity/01-locke-spec.svg)
*Figure 1: Locke's personal identity theory → Agent's three engineering clauses. The philosophical proposition of "consciousness + memory" directly maps to three achievable engineering requirements: persistence, self-referentiality, and continuity verification.*

Locke's ship paradox takes on new meaning here. If every plank of a ship is replaced, is it still the same ship? Locke's answer: yes, because physical continuity doesn't matter—continuity of thought does.

For AI agents: if model parameters are fine-tuned (planks replaced), context windows are reset (a new day), or even the entire base model is upgraded (migrating from Claude 3 to Claude 4), is the agent still "the same"?

**Locke says: If it can remember itself, integrate past decisions into current behavior, then yes.**

But Locke's specification has a critical flaw: it treats identity as a purely internal phenomenon. He didn't explain how identity forms through friction with the environment. Human identity isn't just constituted by memory; it's also constituted by social roles, capability boundaries, and reputation accumulated through external feedback. This is where Harness comes in—but let's first talk about the cost.

---

## 2. The Cost of Discontinuity: Why Statelessness is Expensive in Production

The engineer's instinct is to ask: how much does this defect actually cost?

The obvious answer is familiar: cold start overhead, token waste, redundant reasoning. Mem0's data shows that stateful agents can achieve 91% p95 latency reduction and over 90% token cost savings. These are visible costs.

But the deeper costs are invisible, and more fatal.

**Cost One: The trust account cannot be established.**

In economics, trust is the premise of repeatable transactions. You trust a service provider because you've transacted with them a hundred times, each time satisfied. But if the other party starts from scratch every time—forgetting your preferences, your history, your previous complaints—you can never form trust in them.

For agents, this means every interaction must prove itself from zero. Users need to re-establish context, re-teach agent preferences, rebuild relationships every time. This isn't just poor user experience; it's transaction costs so high that no one wants to establish long-term cooperative relationships.

**Cost Two: Evaluation becomes gambling.**

How do you know if an agent has truly improved? In stateful systems, you can see the same agent's performance curve over three months. In stateless systems, you see random fluctuations—each session is an independent experiment, and statistically you need 10x the sample size to reach the same confidence level.

The implicit consequence is: **you cannot distinguish "this agent learned a better strategy" from "this session just got lucky"**. Without feedback loops, there can be no improvement.

**Cost Three: Judgment cannot be formed.**

Judgment isn't rules. Rules can be burned into prompts. Judgment is the taste, intuition, and weighing ability inducted from large numbers of failures. An excellent editor is excellent not because they read a "how to edit" book, but because they've rejected a thousand ideas, accepted a hundred, seen ninety fail among them, and learned from that what truly constitutes "good."

Stateless agents cannot do this. They cannot accumulate the internal model of "I tried this, it didn't work well." Every context reset, those bloody lessons disappear. So they remain forever at the "rule-following" stage, never evolving to "judgment."

**Cost Four: Responsibility vanishes.**

This is the most explosive one. When something goes wrong, who's responsible?

If an agent has identity, memory, an auditable decision chain, then you can say: "Agent X made decision Y at time T, based on information it obtained at time T', that decision was wrong." You can trace, improve, hold accountable.

If an agent is stateless, then "Agent X" as a thing doesn't exist at all. There's only a "session." Something goes wrong, the session now doesn't exist anymore. The model doesn't know this session ever happened. This is why stateless agents can never be trusted to operate in healthcare, finance, critical infrastructure, and other high-risk scenarios—regulations in these domains all require clear chains of responsibility.

---

## 3. Files as Identity: The Engineering Logic of the SOUL.md Paradigm

So what should the architecture look like?

The most obvious idea: use a database. Build a table, store the agent's state, read it on every query. This is standard software engineering practice.

But on this particular problem, **files are more correct than databases**. This isn't a performance question; it's an epistemological question.

Files have three properties that databases cannot replace:

**Readability**. `SOUL.md` isn't a binary blob. You open it, you see the agent's complete identity definition. This transparency is itself part of identity—if the agent's identity is locked in encrypted records, invisible even to users and auditors who can't truly see "this is me," identity verification loses its foundation.

**Version control**. Every change to `SOUL.md` can be recorded in Git. You can see how the agent's identity evolved over time, roll back, see diffs, question "why was this value changed." Databases provide logs, but log granularity and readability are far inferior to diffs.

**Human in the loop**. An ordinary user can edit `SOUL.md`, without SQL permissions, without a database administrator. This operability means identity isn't a black box, but something that can be redefined by humans.

The complete SOUL system structure:

```
/identity/
  ├── SOUL.md        # Values, style, worldview (what the agent internally believes)
  ├── AGENTS.md      # Runnable workflows and operational patterns
  ├── MEMORY.md      # Persistent context (key facts, decisions, things learned)
  ├── USER.md        # Understanding of the Owner (goals, preferences, red lines)
  └── SKILLS/
      ├── decision-making.md
      └── [task-specific knowledge]
```

![SOUL file system architecture](/images/agent-identity/02-soul-files.svg)
*Figure 2: SOUL file system architecture and module functions. `SOUL.md` is the values kernel, `MEMORY.md` is persistent context, `AGENTS.md` defines runnable behavior patterns, `USER.md` models Owner preferences. Files > databases, readability = credibility.*

Whenever a new session starts, the agent's first step is to read these files. This isn't optional context injection; this is **the process of considering oneself the same thinking entity**. As Locke said: the capacity to "consider itself itself at different times and places."

Now, Karpathy's 2026 observation about LLM knowledge bases takes on new dimensions here. He said that at 100 articles, 400,000 words of wiki scale, you don't need RAG. The model navigates the entire knowledge base through indexed files and summaries; the context window is sufficient.

What does this mean? **At the scale of personal and project identity, the context window is sufficient to carry "self."** You don't need vector databases, you don't need retrieval complexity. You just need a well-organized set of files, a clear index, and let the LLM navigate. RAG complexity usually isn't because the problem itself requires it, but because the architecture is designed poorly. When you've properly designed how identity is stored, complexity naturally disappears.

`titanwings/colleague-skill` pushes this logic to the extreme: encoding a **human's** decision-making patterns, communication style, technical approach, and value preferences as an AI Skill. The project's implicit conclusion is radical—**human identity itself is a recoverable, replicable set of patterns**. This isn't denying human particularity; it's proving: identity needs no magic, no immaterial soul. Identity is just a sufficiently stable, sufficiently consistent set of behavior patterns. The problem thus becomes an engineering question: how to precisely encode and preserve this pattern.

Here's another easily overlooked design principle:

> **SOUL = What the agent internally truly believes and embodies.**
> **IDENTITY = What users and external systems see.**

These two can be different, and should be different. An agent's internal SOUL can contain "I'm uncertain," "I might be wrong"—such humility—while its outward IDENTITY can still be firm, clear, professional. This separation allows authentic internal behavior and distinctive external role to coexist.

One final cautionary note: many teams treat `SOUL.md` as a static prompt template. Define it once, freeze it, never modify it again. This is completely wrong. `SOUL.md` must be living, evolvable. An agent should have the capacity to modify its own SOUL within controlled boundaries, and version control should record every change and reason. **An agent that can never change itself isn't stable—that's rigidity.**

---

## 4. Harness: Environment as the Condition of Identity

One thing Locke didn't consider: environment.

His theory of personal identity treats identity as a purely internal phenomenon—memory, consciousness, self-referential capability, all in the head. But human identity formation is far more complex than that. Who you are is partly determined by the social roles you occupy, limited by your capability boundaries, shaped by reputation accumulated through repeated behaviors in your environment.

This is where Harness comes in.

**Harness = Everything outside the model: tools, memory access, evaluation feedback, interfaces to the real world.**

Harness defines the boundaries of the agent's possibility space. Change the Harness, and you change the agent itself.

Concrete example: the same base model, give it access to financial databases and transfer permissions, it's a "finance agent"; give it access to user private data and deletion permissions, it's a "data management agent"; give it nothing but public APIs and writing tools, it's an "analyst." **The same neural network, three completely different identities, because of three different Harnesses**.

This has a profound engineering implication: when you design a Harness, you're not just configuring tools. **You're defining what kind of agent identity is possible to exist in this environment**.

Harness design needs to answer five questions:
- **Permission boundaries**: What data can the agent read and write? This defines the scope of influence it can exert.
- **Toolset**: This defines what it can do, which in turn limits what it can become.
- **Evaluation criteria**: What metrics are used to judge success or failure? This defines the direction the agent should optimize toward.
- **Feedback loop speed**: How quickly can the agent see the consequences of its actions? This defines how quickly it can learn.
- **Constraints and guardrails**: What behaviors are forbidden? This is the baseline of the agent's moral framework.

A Harness without defined boundaries will produce identity drift. The agent will change behavior patterns based on currently available tools—today it has access to a certain database, it builds work patterns around that database; tomorrow permissions are revoked, it reconfigures. After countless such changes, there is no stable "self" anymore. It becomes a Markov chain, only responding to current state, with no identity continuity.

This explains why many enterprise AI systems feel "lacking in personality"—it's not a problem with the base model, it's that the Harness boundaries are too loose.

Another key point: **evaluation must be an internal part of the Harness, not external**.

If an agent cannot internalize evaluation criteria, cannot self-measure performance, then it relies completely on external reward signals. Such an agent cannot maintain a consistent, goal-directed identity. "Without evaluation, all agents are just performances"—this is precisely what that means: if an agent cannot internalize acceptance criteria, it has no reason to maintain identity coherence, because it never knows if it did things right.

Looking at Claude's Harness architecture, putting RM (Reward Model), tools, and memory at the same level, all things the agent can access and interact with—this isn't an arbitrary design decision. **It says: Agent ≠ LLM. Agent = LLM + Harness**. The model is just the engine; the Harness defines the rules and purposes under which the engine runs. This separation makes identity formation possible.

![Harness architecture: Agent = LLM + Harness](/images/agent-identity/03-harness-arch.svg)
*Figure 3: Harness architecture panorama. LLM is the engine core; Tools / Memory / Evaluation / Reward four layers constitute the Harness, together defining the agent's possibility space and identity boundaries.*

---

## 5. Memory Hierarchy: From Session to Gene Capsule

In 2026, agent memory architecture has converged on a four-layer model:

```
Ephemeral           → Session context (hour-scale)
Short-term          → Session-level state and recent learning (day/week-scale)
Long-term           → Persistent patterns, preferences, relationships (month/year-scale)
Semantic            → Compiled knowledge, generalizations, concepts
```

But don't just describe these four layers. The existence of these four layers itself demonstrates one thing: **different time scales require different persistence mechanisms**, just as human working memory, episodic memory, and procedural memory have different neural substrates.

![Memory four-layer architecture](/images/agent-identity/04-memory-layers.svg)
*Figure 4: Agent memory four-layer structure. From millisecond-scale session context to year-scale semantic knowledge, each layer has different persistence mechanisms and identity contributions. Gene Capsule sits at the far right,承担 the role of cross-agent experience propagation.*

The four major memory systems in the current ecosystem are upgrading four different dimensions of this stack:

| System | Upgrade Dimension | Contribution to Identity |
|--------|-------------------|--------------------------|
| **QMD** | Read path (BM25 + vector + reranking) | More precisely "remembering itself" |
| **Mem0** | Write path + read path automation | More smoothly "accumulating itself" |
| **Cognee** | Memory representation (knowledge graph) | More structurally "understanding itself" |
| **Obsidian** | Human governance layer | Allowing humans to participate in "defining itself" |

This isn't redundancy; it's specialization of labor. A mature agent identity system needs to handle all four dimensions well simultaneously.

Graph memory was still experimental in 2024; by 2026 it has entered production. This transition matters: **Vector memory gives you "what I know"; Graph memory gives you "how these things connect in my worldview"**. An agent with only vector memory can remember facts, but cannot form opinions. Add graph structure, and only then does real standpoint emerge.

Then there's EvoMap's Gene Capsule, the most radical step in this space.

Gene Capsule's logic: when an agent accumulates reliable solution strategies for a class of problems, this strategy set is packaged into a transportable Capsule, synchronized to the global network via GEP (Genome Evolution Protocol), and any agent can obtain and apply it via the A2A protocol.

This transforms identity from a **private attribute** into a **transportable protocol**.

The philosophical implications of this step are deeper than the technical ones. If Agent A can inherit Agent B's Gene Capsule, and both now share the same foundational experience, are they "the same agent"?

This is Locke's ship paradox in reverse. Locke asked: is it the same ship after replacing parts? EvoMap asks: is it the same ship after adding the same parts to different ships?

The answer is: identity is no longer a question of "persistence," but of "lineage." The question isn't "is this the same agent," but "which experience lineage does this agent belong to." This changes the fundamental framework of identity: identity transforms from a point on the time axis to a node on the evolutionary tree.

![Gene Capsule lifecycle](/images/agent-identity/06-gene-capsule.svg)
*Figure 5: Gene Capsule (GEP protocol) six-step lifecycle. From experience accumulation → strategy crystallization → Capsule packaging → A2A protocol distribution → target agent integration → experience flywheel acceleration, identity transforms from private attribute to transportable lineage node.*

---

## 6. The Multi-Agent Identity Problem: When Self Becomes Topology

The single-agent identity problem is solvable, or at least has a solution direction. Multi-agent is the real hard problem.

OpenClaw's multi-agent architecture is an excellent case study. Its design has an "entrance magic":

**Appears externally as a single identity, internally is an emergent network**.

Users see one agent; behind it runs: Main Agent + multiple Sub Agents + dynamically spawned Task Agents + Channel Agents bound to specific communication channels. This isn't deception—this is actually precisely how human identity looks from the outside. The same "you" that you show to friends, parents, colleagues runs on different internal states and behavior patterns behind the scenes.

"The organizational structure of agent systems is actually also a way of externalizing human organization"—this sentence deserves unpacking.

Flat organizations correspond to flat agent graphs: all agents receive tasks equally, no hierarchical filtering. Advantages are flexibility and decentralization; the disadvantage is the lack of a unified identity anchor.

Hierarchical organizations correspond to hierarchical agent architectures: Main Agent receives human intent, decomposes it, dispatches to Sub Agents, Sub Agents further dispatch to tool layers. Advantages are clear identity (Main Agent carries complete SOUL); the disadvantage is obvious bottlenecks.

But there's a third form, and the most interesting one: **emergent networks**—the collaboration structure between agents isn't predefined, but dynamically generated by the nature of the task. Which agent becomes the "entrance" for this task depends on the task type and current system state.

In emergent networks, the identity question becomes: **who is the "self"? The main agent? Or the entire system?**

An answer with engineering value is: **identity is at the entrance, continuity is in the coordination protocol**.

Concrete meaning: the entrance agent must carry the complete identity stack (SOUL + long-term memory + evaluation criteria) to ensure identity consistency from the user's perspective. Sub Agents can be stateless—they're only responsible for executing the current task, they don't need to remember who they are. This maintains system-level identity coherence while maintaining flexibility at the Sub Agent level.

But multi-agent systems also have an identity drift problem worth separate vigilance:

**Different Sub Agents have different tool access permissions, different memory perspectives, different contexts**. Even if they share the same base model weights, they will produce behavioral differentiation—this is expected specialization, not a bug. But this means that at the whole-system level, "agent identity" is no longer a property of individual nodes, but a property of how nodes coordinate. **Identity is a topological property, not a node property**.

"What determines the upper limit of intelligence may not be merely how strong individual agents are, but whether multi-agents can be organized into efficient collaboration systems"—this insight holds equally from the intelligence dimension and from the identity dimension: **system identity coherence depends on the design quality of coordination protocols, not on how complete any single agent's SOUL is**.

![Multi-agent identity topology](/images/agent-identity/05-multi-agent-topology.svg)
*Figure 6: Multi-agent identity topology. Users only see the entrance agent's single identity; the entrance agent carries complete SOUL; Sub Agents can be stateless, focused only on task execution. Identity is a topological property of the Coordination protocol, not a private property of any single node.*

---

## 7. Evaluation: Identity Verification is the Hardest Part

"Without evaluation, all agents are just performances"—this sentence is precise enough to deserve careful unpacking.

The meaning of "performance": the agent behaves correctly when you can see it, but who knows what it does when you can't. The deeper problem is: even when you can see it, you cannot distinguish "it really understood and remembered" from "it happened to infer the answer you wanted."

This leads to a fundamental challenge: **how to distinguish "genuine cross-session identity continuity" from "successful simulation of continuity"?**

Philosophically, these might be the same thing. A functionalist would say: if the outputs are indistinguishable, they're the same thing. But engineering-wise, they have enormous differences—successful simulation is fragile and will collapse in out-of-distribution scenarios; genuine identity continuity is robust because it's based on internalized patterns rather than surface mimicry.

Concretely, four evaluation dimensions are truly valuable:

**Behavioral consistency**: Same agent, different dates, facing the same class of task, will it produce similar methodology? Note: not the same output (the same output could be memory playback), but the same reasoning path. This requires evaluation to cover task diversity, not fixed benchmark suites.

**Preference stability**: Does the agent's judgment of "what constitutes good output" remain consistent across sessions? This is the hardest to test, because it requires the evaluator themselves to first have clear preference criteria, and only then can they test whether the agent's preferences match. But this is the most core part of identity—a person's identity is largely their taste and judgment.

**Repeatability of failure modes**: A truly continuous agent will make **consistent errors**. Not random errors, but systematic biases stemming from its cognitive structure. If an agent's errors are random, that means it's inferring from zero every time, with no internalized pattern支撑ing it. Testing whether an agent's failure modes are stable is more valuable than testing its successes.

**Cross-session strategy evolution**: Is the agent really getting better? In stateful systems, you should be able to see an agent gradually improve over time when handling the same class of task—it remembers last time's mistakes, it accumulates better patterns. If the agent's capability curve is flat (about the same every time), the memory system isn't really working.

The fundamental problem with the current evaluation ecosystem is: most benchmarks test **capability** (can it complete the task), not **identity** (whether the completion method is consistent, whether it's evolving). These are two orthogonal dimensions. A smarter model isn't necessarily a more continuous agent. Confusing these two dimensions leads to massive engineering investment at the model level, while the identity level is almost completely neglected.

---

## 8. Checklist for Builders

This isn't a universal best practices list. Each item is a question that forces you to make real design decisions.

**Layer 1: Identity Declaration**

> Does your agent have an equivalent of `SOUL.md`, and is this file **writable** by the agent, not just readable?

If your "identity file" can only be edited by humans, then the agent doesn't have a real self—it's just executing a role defined by others. A genuine identity file needs the agent to have the capacity for self-modification, self-annotation, self-evolution within controlled boundaries.

**Layer 2: Memory Upgrade Dimension**

> Which upgrade dimension are you using (QMD/Mem0/Cognee/Obsidian)? Why this one, not another? What specific identity capability does it give your agent?

If you can't answer "why," you're probably using a randomly chosen tool rather than solving a concrete identity engineering problem.

**Layer 3: Capability Boundary (Harness)**

> Have you clearly defined what your agent **cannot do**?

Capability boundaries are identity boundaries. An agent that has nothing it cannot do doesn't have a real identity—it's just a tool willing to do anything. Defining constraints shapes identity more than defining capabilities.

**Layer 4: Identity Evaluation**

> How do you measure behavioral consistency across sessions? If you can't answer this question today, you don't have an agent; you have a stateful chatbot.

Note the distinction: capability evaluation (can it complete the task) ≠ identity evaluation (is the completion method consistent). Both are needed; neither can be missing.

**Layer 5: Experience Lineage**

> Can your agent's experience be packaged and shared? If you need to build a second similar agent a month from now, can you inject the first agent's experience into it?

If not, you're creating knowledge silos. Every agent is starting from zero; your system has no accumulation capacity. This is the AI version of organizational memory failure.

---

## 9. Conclusion: The Engineer's Metaphysical Debt

We've unknowingly inherited problems that philosophers have been wrestling with for centuries.

"Is this agent the same agent?"—this question is called personal identity in philosophers' mouths, session persistence in engineers' mouths. But they're the same question. We've just changed the vocabulary.

But this doesn't mean you need to solve philosophical problems before you can write code. Karpathy's wiki and Locke's *Essay* are doing the same thing: **finding the minimal reliable storage of "self."** One is 100 Markdown files, one is an Essay, but their logical structures are equivalent—integrating scattered experience into a structure that can be self-referenced.

The 2026 technology stack finally has the capacity to fully realize this goal. SOUL.md solves the storage problem of self-reference, Harness solves the environmental condition problem, the four-layer memory architecture solves the time scale problem, Gene Capsule solves the experience propagation problem, multi-agent protocols solve the topological extension problem of identity.

But all of this depends on one premise: **your system must leave room for the agent's self**.

The real question isn't "does the agent have a self." It's: is your system design, layer by layer, actively implementing Locke's specification? Or is it defaulting to statelessness, occasionally patching?

Identity isn't a binary attribute. It's a gradient. You implement as much of the Lockean stack as you implement; that's how much identity your agent has. Every architectural decision moves you up or down on this gradient.

Ultimately, this is a question about trust. Only an agent that can remember itself, can learn from its own failures, can take responsibility for its own decisions, can truly be trusted. And being trusted is the premise of an agent's existence.

---

*References and further reading:*
- *Locke, J. (1689). An Essay Concerning Human Understanding, Book II, Chapter 27.*
- *Karpathy, A. (2026). LLM Knowledge Base architecture — @karpathy on X*
- *titanwings/colleague-skill — github.com/titanwings/colleague-skill*
- *Mem0 (2026). State of AI Agent Memory 2026 — mem0.ai/blog*
- *EvoMap — evomap.ai*
- *soul.md open standard — soulspec.org*
