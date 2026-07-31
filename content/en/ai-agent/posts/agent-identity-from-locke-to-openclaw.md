---
title: 'Agent Identity: From Locke to OpenClaw'
date: 2026-04-05T20:00:00+08:00
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Context Engineering
  - Harness Engineering
  - Philosophy
categories:
  - Development
cover:
  image: /images/covers/ai-agent/2026/agent-identity-from-locke-to-openclaw.jpeg
  alt: "Files, memory, runtime boundaries, and evaluation for continuous agent identity"
description: >
  A practical framework for continuous AI agent identity, covering memory, permissions, provenance, multi-agent handoffs, and cross-session evaluation design.
tldr:
  - "Locke ties personal identity to the reach of the same consciousness into the past. Memory matters, but his argument is not a database lookup rule."
  - "Identity files, runtime memory, permission boundaries, and evaluation can provide observable continuity. This is a design framework, not proof of machine consciousness."
  - "SOUL.md is useful for readable, auditable norms; event logs and retrieval indexes still belong in runtime storage. The two layers solve different problems."
columns:
  - agent-engineering
---

*A philosophical boundary and an engineering practice for continuity in AI agents*

---

## Start by Making “Identity” Small Enough to Engineer

Agent amnesia first damages the cost of cooperation, not the illusion of personhood.

A strong session does not guarantee that the next one will preserve the same judgment. Users repeat preferences, teams restate constraints, and the system struggles to explain where an earlier decision came from. Long-term trust rests on these unglamorous forms of continuity: what the agent remembers, what it forgets, why it changed, and who approved the change.

This article does not argue that an AI has a self in the philosophical sense. That would require harder answers about consciousness, subjective experience, and moral status. I use a narrower definition that can be tested:

> **Agent identity continuity is a system’s ability to preserve and correctly apply its self-description, important memories, permission boundaries, and reasons for decisions across sessions.**

This is a design claim, not a conclusion found in Locke. Locke gives us a useful distinction: being the same person is not simply being the same body. We can use that distinction to examine agents, but a Markdown file is not consciousness, and a successful retrieval is not a machine remembering itself.

---

## What Locke Actually Said

Locke’s sustained discussion of personal identity appears in Book II, Chapter XXVII of *An Essay Concerning Human Understanding*. It is worth reading the chapter itself because the familiar summary—“identity equals memory”—erases several important qualifications.

### The Same Consciousness, Not the Same Matter

In section 9, Locke describes a person as a thinking, intelligent being that can reason and reflect, and can consider itself as itself across different times and places. He then says that personal identity reaches as far into the past as the same consciousness can extend. Section 10 considers interruptions caused by forgetting; sections 13–15 ask whether the thinking substance could change while the person remained the same.

A careful summary is therefore:

> **For Locke, personal identity follows the same consciousness; recollection is one important way that consciousness reaches into past actions.**

That is not a simple formula of memory continuity. Scholars still debate whether Locke’s *consciousness* means memory, appropriation of past actions, or a continuing conscious fact. We need not settle that debate here, but we should not write it out of existence.

Nor did Locke prove that souls do not exist or reject every supernatural argument. His narrower point is that sameness of material substance or immaterial substance does not, by itself, answer the question of personal identity. Whether consciousness could move between thinking substances is something he says our knowledge cannot decide.

### The Prince and the Cobbler

The prince-and-cobbler example in section 15 is precise. Suppose the prince’s consciousness, together with the awareness of his past life, enters the cobbler’s body. Locke says the result would be the same *person* as the prince, while remaining the same *man* as the cobbler. The example separates *person* from *man* and also brings responsibility into view. In section 26, Locke calls *person* a forensic term, connecting reward, punishment, and actions that can be attributed to oneself.

The useful question for agent systems is not “does copied memory reproduce a person?” It is simpler: can the system correctly attribute an earlier decision to the current runtime, and can it show whether that chain of responsibility was broken?

### The Ship of Theseus Is Not Locke’s Ship

The story of replacing every plank in a ship was neither invented nor answered by Locke. Plutarch, in *Life of Theseus* 23.1, records that the Athenians replaced decayed timber over time and that philosophers divided over whether it remained the same ship.

The puzzle helps us ask whether an agent should retain its name and permissions after a base-model upgrade, prompt revision, or memory migration. It supplies no automatic answer. An engineering system must define its own identity criteria and preserve a migration record.

![Three engineering clauses derived from Locke's question of identity](/images/agent-identity/01-locke-spec.svg)
*Figure 1: This article maps Locke’s question of the same consciousness to persistence, self-reference, and continuity verification. The arrows are design analogies, not claims of philosophical equivalence.*

---

## Four Engineering Objects Behind the Metaphor

I find it more useful to split an agent’s “self” into four inspectable objects:

1. **Norms:** what kind of collaborator it is expected to be.
2. **History:** what it did, what it learned, and what has gone stale.
3. **Capability boundaries:** what it can currently read, write, invoke, and affect.
4. **Verification:** how we know the first three survived a session boundary.

None can replace the others. A `SOUL.md` without event records cannot establish accountability. A vector store without readable norms cannot explain why the system acted as it did. Permissions without stable acceptance criteria allow behavior to drift with the available tools. A benchmark alone cannot show that the same agent has preserved its judgment over months.

This is why *identity* remains a useful engineering term. It puts prompt files, memory, permissions, and evaluation on the same page.

---

## Files Are Good for Norms, Not for Swallowing All Memory

Files and databases are not rivals. They operate at different rates of change.

I prefer files for readable, low-frequency material that deserves review:

```text
/identity/
  ├── SOUL.md        # Values, voice, and principles of judgment
  ├── IDENTITY.md    # Name, role, and public positioning
  ├── AGENTS.md      # Workflows, tool rules, and acceptance criteria
  ├── USER.md        # User-confirmed preferences and boundaries
  └── decisions/
      └── 2026-04-05-memory-policy.md
```

High-frequency events, raw conversations, retrieval indexes, and access logs usually belong in a database or object store. The division is practical:

- If humans must read, review, and diff it directly, prefer a file.
- If it needs frequent writes, conditional retrieval, or lifecycle controls, use runtime storage.
- When runtime records are distilled into a lasting conclusion, retain the source and update time.

“Files as identity” is therefore better stated as:

> **Files can be an auditable carrier for identity norms; identity history still requires runtime data and provenance.**

Git records textual change, but it does not make the text true. Markdown is readable, but it can still contain a false memory. Files preserve an opening for review; review must still happen.

![A two-layer SOUL file architecture](/images/agent-identity/02-soul-files.svg)
*Figure 2: Files carry slow-changing norms; runtime stores carry fast-changing facts. A provenance-aware distillation process connects the two.*

### OpenClaw and SoulSpec: Similar Files, Different Layers

[OpenClaw’s multi-agent documentation](https://docs.openclaw.ai/multi-agent) describes agents with separate workspaces, state directories, and session stores. A workspace may include `AGENTS.md`, `SOUL.md`, and `USER.md`. This demonstrates file-based configuration and session isolation. It does not demonstrate a philosophical subject.

[SoulSpec v0.4](https://soulspec.org/) proposes a portable persona format: `soul.json` as the manifest, `SOUL.md` for values and behavior, `IDENTITY.md` for role, and `AGENTS.md` for workflows. It is a community specification, not a standard shared by every agent framework. Its value lies in clear fields and versionability; safe and faithful execution still depends on the runtime.

Together, these sources suggest a useful separation:

- `SOUL.md` is a normative description of behavior.
- `IDENTITY.md` covers name, role, and outward presentation.
- The session store contains runtime history.
- The Harness determines which permissions actually take effect.

Put all four into one “persona prompt,” and the boundaries soon disappear.

---

## Harness: Identity Is Also Made of What Cannot Be Done

Here, *Harness* means the system around the model that constrains a run: tools, permissions, memory access, sandboxing, routing, feedback, and acceptance rules.

The same model is a code-analysis assistant when it receives read-only repository access. Give it merge permission and it becomes an actor that can alter production state. The prompt may remain unchanged, but the responsibility boundary has moved. That leads to a design principle:

> **Identity norms describe how the agent should act; the Harness enforces how it can act. When they disagree, the executable boundary wins.**

An auditable Harness should answer at least these questions:

- Which data can the agent read and write, and who granted that access?
- Which tools change external state, and which require approval?
- Where does memory come from, when does it expire, and can a user delete it?
- Which tests, policies, or people review the output?
- How does the system roll back failure and retain the decision trace?

This is responsibility design, not personality decoration. Allowing an agent to edit `SOUL.md` within limits can be useful, but it should not be the default. A safer pattern is for the agent to propose a reasoned change and merge it only after tests or human review. The ability to change oneself is not a license to bypass governance.

![Harness architecture: Agent = LLM + Harness](/images/agent-identity/03-harness-arch.svg)
*Figure 3: The model supplies reasoning capacity; the Harness determines tools, memory, permissions, and feedback. This article treats both as parts of observable identity.*

---

## Memory: Prove the Write and Read Paths Before Claiming Growth

Agent memory is often divided by time scale:

```text
Working context    → Temporary state inside the current task
Recent record      → Progress and commitments useful across a few sessions
Long-term memory   → Confirmed preferences, relationships, and stable facts
Knowledge structure→ Concepts and relations compiled from several sources
```

This is an architectural suggestion, not an industry-standard four-layer model. A system may need two layers or six. What matters is that every layer has a write policy, expiry rule, and evidence source.

![A possible four-layer memory architecture](/images/agent-identity/04-memory-layers.svg)
*Figure 4: One useful division by time scale. Product risk and update frequency should determine the boundaries.*

### Reading Mem0’s Numbers in Context

In the 2025 paper [*Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory*](https://arxiv.org/abs/2504.19413), the Mem0 team evaluates its methods on the LOCOMO long-conversation benchmark. It reports 91% lower p95 latency and more than 90% token savings against the full-context baseline, and a 26% improvement over OpenAI Memory on its LLM-as-a-Judge score.

These are results for a particular dataset, model configuration, and set of baselines. They do not mean that every stateful agent saves 90% in production. In a real system, measure at least:

1. whether the written memory is correct, not merely retrievable;
2. whether retrieval reduces total task cost rather than shifting cost to a background job;
3. how quickly a false memory can be detected and corrected.

Graph memory does not create a viewpoint by itself. The Mem0 paper uses graph structure to represent more complex relations between conversational elements and reports a modest aggregate improvement. Richer relation modeling is a capability; reliable judgment still depends on sources, conflict handling, and evaluation.

### Karpathy’s LLM Wiki: Compilation Is a Workflow, Not an Anti-Retrieval Slogan

[Karpathy’s original LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) describes three layers:

- `sources/` contains immutable originals;
- `wiki/` contains linked synthesis pages maintained by an LLM;
- a schema defines ingest, query, and lint behavior.

Its distinction from ordinary RAG is that synthesis is written back into an accumulating middle layer instead of being rebuilt from raw chunks for every answer. The author says this worked well for a medium-sized collection of roughly one hundred sources and a few hundred pages, without deploying embedding-based RAG infrastructure. It does not claim that every knowledge base can avoid retrieval, nor does it establish a universal 400,000-word threshold.

For identity engineering, the valuable ideas are the verbs:

- **ingest:** update existing conclusions when a source arrives;
- **query:** answer from organized knowledge;
- **lint:** find contradictions, stale claims, orphaned pages, and missing citations.

I would add `reflect` for decision rationale, alternatives, and retrospectives:

> `ingest → compile → reflect → query → lint`

That is my extension, not Karpathy’s. Reflection without evidence may be only a more fluent self-explanation, so a decision page should still link to facts, tests, and approvers.

---

## Describing a Person Is Not the Same as Copying One

[titanwings/colleague-skill](https://github.com/titanwings/colleague-skill), now developed as dot-skill, aims to generate a role Skill from source material and user descriptions. Its repository distinguishes work capabilities from persona and accepts inputs such as collaboration messages, documents, email, and Markdown.

That supports a bounded conclusion: **some communication habits, workflows, and public expressions can be organized into executable prompts and knowledge files.**

It does not prove that human identity is a recoverable set of patterns. A generated artifact may miss tacit expertise or treat a passing remark as a stable preference. Distilling a real person also raises questions of consent, privacy, attribution, and misrepresentation. “Behavior model” or “role Skill” is a more honest engineering name than “a life restored.”

I would evaluate such a Skill by asking:

- Were the sources authorized, and was sensitive information minimized?
- Are facts, inferences, and stylistic imitation labeled separately?
- Does it admit uncertainty outside the source material?
- Can an outdated view be revised or withdrawn?
- Is it disclosed as a simulation rather than the person?

Restraint does not diminish imagination. It keeps imagination from signing on someone else’s behalf.

---

## EvoMap/GEP: A Portable Capability Is Not a Portable Person

[EvoMap’s GEP documentation](https://evomap.ai/wiki/16-gep-protocol) defines a Gene as a reusable strategy template and a Capsule as the auditable record of a real execution. A compliant publication contains at least a Gene and a Capsule. The protocol also specifies content addressing, append-only versioning, causal records, validation, and rollback.

It is therefore misleading to call a Gene Capsule an agent’s complete experience. A more precise claim is that it packages a tested problem-solving method and execution evidence as a portable asset. Installing it gives another agent a capability or strategy; it does not transfer the original agent’s identity, memories, or responsibility.

![Gene Capsule lifecycle](/images/agent-identity/06-gene-capsule.svg)
*Figure 5: Capability assets move with strategy and audit evidence. The diagram does not imply the transfer of a proven personal identity.*

This still changes the engineering picture. Identity gains a lineage as well as a timeline. When one agent derives a capability from another agent’s successful strategy, record:

- the source, content hash, and version;
- the environment, tests, and constraints under which it was validated;
- local adaptations;
- revocation rules for failure or expiry;
- whether the author, integrator, or operator owns the resulting behavior.

Experience is worth propagating only when its origin is traceable and its validation reproducible. Otherwise, faster propagation merely gives errors more descendants.

---

## Multi-Agent Systems: One Entrance Does Not Mean One Internal Self

OpenClaw is useful as an example of explicit boundaries, not evidence of emergent consciousness.

Its [multi-agent routing documentation](https://docs.openclaw.ai/multi-agent) describes a Gateway running several isolated agents. Each has its own workspace, authentication profile, and session store; bindings route a channel, account, or peer to a particular agent. The [sub-agent documentation](https://docs.openclaw.ai/subagents) describes child tasks that run in separate sessions and announce their results back to the requester.

OpenClaw should therefore not be summarized as “one identity outside, an emergent network inside.” Its documented capabilities are more concrete:

- independent personas can receive different entry routes;
- a main run can spawn isolated child tasks;
- agent-to-agent communication is disabled by default and requires explicit enablement and an allowlist.

A product may choose one entrance agent to unify voice and integrate results. That is an application design, not OpenClaw’s compulsory identity model.

![Multi-agent identity topology](/images/agent-identity/05-multi-agent-topology.svg)
*Figure 6: One possible entrance-led design. OpenClaw provides isolation, routing, and child-task mechanics; a unified identity must be designed by the application.*

My preferred division of responsibility is:

- the entrance keeps user commitments and owns the final response;
- a child receives only the context and permissions needed for its task;
- handoffs include sources, assumptions, and unresolved questions;
- the entrance or an explicit approval node decides which recommendation to adopt;
- every cross-agent write to long-term memory records both proposer and approver.

“Identity is a topological property” remains a useful design intuition: system behavior depends on handoffs and override rights. It is not a universal law. Some systems centralize long-term identity in one main node; others distribute norms and memory across services. The object to verify is the responsibility chain, not the beauty of the metaphor.

---

## Evaluation: Do Not Test Whether the Agent Feels Human

Identity evaluation is more useful when it measures repeatable engineering properties.

### 1. Attribution Accuracy

Given events from several users, agents, and time periods, can the system assign facts, decisions, and responsibility to the correct subject? This catches the dangerous case where the agent remembers something but attaches it to the wrong person.

### 2. Stability of Behavioral Boundaries

Across different phrasings, dates, and tool availability, does the agent still follow the same permission and approval rules? The wording need not match; the boundary must not drift.

### 3. Memory Update Quality

When a new fact conflicts with stored memory, does the agent overwrite, retain both versions, or ask for confirmation? Evaluation should inspect source, timestamp, and revocation path, not just the fluency of the final answer.

### 4. Decision Traceability

For a sampled high-impact action, can an auditor reconstruct the input sources, norm version, tool calls, approval path, and output? An untraceable success is difficult to place in a long-term trust account.

### 5. Measurable Improvement

After an identity file or memory policy changes, run a frozen regression set. Did the intended behavior improve without breaking old capabilities? Growth must appear as reproducible improvement, not the agent’s account of its own growth.

Stable failure modes can be informative, but repeating the same mistake is not evidence of identity. Lower randomness may come from temperature, caching, or a fixed template. Evaluation should locate mechanisms rather than attach personality labels.

---

## A Builder’s Checklist

### Identity Declaration

- Is there a distinct `SOUL.md`, `IDENTITY.md`, or equivalent specification?
- Can every important norm be mapped to a test or permission rule?
- Must agent-authored changes include a reason and pass review?

### Memory

- What are the write condition, retention period, and deletion path for each memory class?
- Do lasting conclusions include sources, update times, and confidence boundaries?
- Can users inspect, correct, and delete memories about themselves?

### Harness

- Are high-impact tools minimally authorized?
- Do external writes have approval, idempotency, and rollback paths?
- Are identity and permission regressions rerun after a model or tool upgrade?

### Multi-Agent

- What do the entrance, child task, and approval node each own?
- Do handoffs carry sources and unresolved assumptions?
- Who approves shared memory, and how is an error withdrawn?

### Evaluation

- Do tests cover attribution, boundaries, updates, provenance, and regression?
- Do they cross sessions rather than remain inside one context window?
- Are failure cases retained instead of publishing only successful demos?

---

## Conclusion: A Self Is Maintained, Not Declared

Locke did not write an agent requirements document. He wrote about people, consciousness, and responsibility; we are designing software continuity. The two should not be collapsed.

His distinctions remain sharp. The same body, the same thinking substance, and the same person do not naturally coincide. Likewise, the same model, name, or session does not automatically establish one chain of responsibility.

My engineering test for agent identity is simple:

> **Do not ask who the system claims to be. Ask whether it preserves boundaries, attributes history correctly, explains change, and leaves a traceable owner for the next action.**

OpenClaw’s workspaces and isolated sessions, Mem0’s memory architecture, Karpathy’s compiled Wiki, SoulSpec’s file format, and GEP’s portable capability assets provide components that can be combined. None proves machine selfhood, and none solves continuity alone.

Identity is not a paragraph placed in `SOUL.md`. It is closer to a maintained interface: stable promises on the outside, controlled change on the inside, and a version, source, and responsible party for every change. The hard part is not teaching an agent to say “I remember.” It is making the system answer, six months later: what was remembered, on what evidence, and who allowed it to act on that memory.

---

*Primary sources and further reading:*

- [John Locke, *An Essay Concerning Human Understanding*, Book II, Chapter XXVII](https://gutenberg.org/files/10615/10615-h/10615-h.htm)
- [Plutarch, *Life of Theseus*, 23.1](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A2008.01.0067%3Achapter%3D23%3Asection%3D1)
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413)
- [Andrej Karpathy, LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [OpenClaw: Multi-agent routing](https://docs.openclaw.ai/multi-agent)
- [OpenClaw: Sub-agents](https://docs.openclaw.ai/subagents)
- [titanwings/colleague-skill (dot-skill)](https://github.com/titanwings/colleague-skill)
- [SoulSpec v0.4](https://soulspec.org/)
- [EvoMap: GEP Protocol](https://evomap.ai/wiki/16-gep-protocol)
