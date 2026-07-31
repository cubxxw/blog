---
title: '2024 AI Field Notes, Reassessed: From Emergence to Production RAG'
date: 2024-01-14T22:52:24+08:00
lastmod: 2026-07-30T22:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - RAG
  - Agent
  - Monitoring
categories:
  - Development
description: >
  A 2026 reassessment of 2024 AI field notes, covering model emergence, Prefix LM, LoRA, QLoRA, agents, and the engineering required for reliable RAG today.
cover:
  image: "/images/covers/ai-agent/2024/emerging-challenges-and-trends-in-2024.png"
  alt: "From 2024 AI field notes to a reliable production RAG system"
  caption: "Models change. The reliability bill does not disappear."
  relative: false
aliases:
  - /en/growth/posts/emerging-challenges-and-trends-in-2024/
tldr:
  - "The 2024 bets on parameter-efficient fine-tuning, retrieval, and agents still hold; the center of gravity has moved from capability demos to permissions, evaluation, and observability."
  - "Emergence may reflect genuine changes in model behavior, but discrete metrics can exaggerate a smooth curve. Treat it as an observation to investigate, not proof that a model has awakened."
  - "Production RAG is not a vector database with a chat box. It is an evidence pipeline: access control, hybrid retrieval, reranking, grounded citations, calibrated abstention, evaluation, and traces."
---

> This article began as notes from a large-language-model meetup in January 2024. Back then, the question was what a model could do. Two years later, the harder question is why anyone should trust the system around it.
>
> I have not polished the old notes into a story in which every early judgment was right. Mistakes are useful sediment. They remind us that a technical opinion is not a prophecy; it is a bet with an expiry date. Each section therefore keeps the 2024 observation and adds a 2026 reassessment: **still true**, **changed**, or **wrong at the time**.

## 1. Emergence: a leap in capability, or a mark on the ruler?

### What I thought in 2024

Once model scale, data, and compute crossed some threshold, abilities that were barely visible in smaller models seemed to appear abruptly. The industry called these *emergent abilities*.

### The 2026 reassessment: real question, unsettled answer

Wei and colleagues described emergent abilities as capabilities absent from smaller models but present in larger ones. Schaeffer and colleagues later argued that some apparent jumps can be artifacts of nonlinear or discrete metrics. Replace exact-match pass/fail with a continuous measure, and a cliff may become a slope.

Those positions do not have to cancel each other out. A model's behavior may change meaningfully with scale while our chosen ruler amplifies or hides that change. For engineering work, the useful response is restraint:

- Do not turn a benchmark jump into a claim that a model suddenly “understands.”
- Inspect continuous scores, failure categories, and variance across repeated runs.
- Test on the distribution that matters to the product; a public leaderboard is not an acceptance test.

**Verdict: still true, but cooler language is warranted.** Scale can produce new behavior. “Emergence” names an observation that still needs explanation; it is not permission to skip evaluation.

Papers: [Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682) and [Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004).

## 2. Model architecture: Prefix LM does not peek at the future

### What I thought in 2024

The original notes contrasted a causal decoder with a “prefix decoder” and claimed that the latter could see both preceding and following text, much like BERT. That confused a **Prefix LM** with masked-language modeling.

### The 2026 reassessment: wrong at the time

Under UniLM's unified attention-mask formulation:

- A **causal language model** lets each position attend only to tokens on its left, which supports autoregressive generation.
- A **bidirectional language model** lets tokens attend to context on both sides, which suits understanding tasks.
- A **sequence-to-sequence model**, often discussed as a Prefix LM, allows bidirectional attention *within the conditioning prefix*. Output tokens are still generated causally and may attend to the full prefix.

A Prefix LM does not inspect answer tokens that have not been generated. The difference lies in its attention mask: the input condition can understand itself fully while the answer remains autoregressive.

**Verdict: the old explanation was wrong.** To know whether a position can see another token, read the attention mask rather than reasoning from the word “decoder.”

Paper: [Unified Language Model Pre-training for Natural Language Understanding and Generation](https://arxiv.org/abs/1905.03197).

## 3. Fine-tuning: LoRA and QLoRA lower the hardware barrier, not the cost of judgment

### What I thought in 2024

Adapters, LoRA, and QLoRA made domain adaptation possible without updating every parameter in a model. A snapshot of `nvidia-smi` from an RTX 4090 felt wonderfully concrete at the time. It did not answer the questions that mattered: should we fine-tune at all, and will the result be more reliable?

### The 2026 reassessment: still true, with clearer boundaries

LoRA freezes pretrained weights and injects trainable low-rank matrices into selected layers. QLoRA goes further by keeping the frozen base model at 4-bit precision and reducing memory pressure with NormalFloat 4, double quantization, and paged optimizers. Both techniques improve **training efficiency**. Neither keeps facts current, enforces document permissions, or supplies citations.

A practical dividing line looks like this:

| Need | Start with | Why |
|---|---|---|
| Stable tone, output format, or task behavior | LoRA, QLoRA, or instruction tuning | Behavior can be learned in parameters |
| Frequently changing policies, prices, or product documents | RAG | Knowledge remains updateable and citable |
| Private terminology plus current factual answers | Fine-tuning and RAG | Govern behavior and knowledge separately |

Training data still needs deduplication, quality filtering, license review, and personal-data handling. “Cleaned” is not the same as “authorized.” Record provenance, allowed uses, deletion obligations, and the training version. Split training and evaluation data by source or time where possible; near-duplicate leakage can manufacture a reassuring score.

**Verdict: still true.** Parameter-efficient fine-tuning is now ordinary infrastructure. Data governance, evaluation, and regression testing remain the expensive work.

Papers: [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) and [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314).

## 4. The LangChain ecosystem: three responsibilities, not one blurred label

### What I thought in 2024

LangChain was often used as shorthand for the entire LLM application stack. Chains, retrieval, agents, tracing, and deployment appeared in one architecture diagram. That was convenient during exploration, but it hid operational boundaries.

### The 2026 reassessment: changed

The current official documentation draws a more useful separation:

- **LangChain** provides high-level abstractions for models, messages, tools, and agents. It is useful for assembling an application quickly.
- **LangGraph** provides graph execution and persistence for long-running, stateful workflows that may pause, resume, or involve human approval.
- **LangSmith** handles traces, datasets, evaluation, experiment comparison, and production observability.

They can work together; they do not have to travel as a bundle. A small question-answering endpoint may not need a graph. A multi-tool process that can pause for approval should not disguise its state machine as an ever-growing prompt.

**Verdict: changed.** Framework branding matters less than responsibility. High-level abstractions buy speed, explicit state buys reliability, and tracing plus evaluation makes failure visible.

Official documentation: [LangChain overview](https://docs.langchain.com/oss/python/langchain/overview), [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview), and [LangSmith observability](https://docs.langchain.com/langsmith/observability).

## 5. Early agent projects: a prototype's importance is not a production promise

### What I thought in 2024

ChatDev and AutoGPT made model planning, tool use, and role-based collaboration tangible. They opened a door: natural language could be more than generated output; it could become an interface for controlling a software process.

### The 2026 reassessment: historically useful, operationally changed

- **ChatDev** is a research prototype for multi-agent collaboration in software development. Its roles, communication chain, and simulation of a development process are instructive, but a demo workflow is not a production engineering standard.
- **AutoGPT** later grew into a broader agent platform. The autonomous-loop agent popular in 2024 was one stage in that history, so old tutorials are poor evidence for its current interfaces or maintenance model.
- **Langchain-Chatchat**, **FinGLM**, and **FastChat** preserve distinct experiments in Chinese knowledge-base question answering, financial tasks, and model-serving infrastructure. They address different layers and should not be presented as interchangeable “QA products.”

The best way to read an older project is not to ask whether it is still fashionable. Ask whether we have solved the failure modes it exposed: runaway loops, tool misuse, lost state in long tasks, uncontrolled cost, and permissions that dissolve at the model boundary. Those constraints have not aged out.

**Verdict: changed.** Agent design has moved away from “more autonomy is always better” toward completing work inside explicit boundaries. An agent that can stop, request approval, and explain a failure is often more capable than one that takes ten more steps.

Primary sources: the [ChatDev paper](https://arxiv.org/abs/2307.07924), [ChatDev repository](https://github.com/OpenBMB/ChatDev), [AutoGPT repository](https://github.com/Significant-Gravitas/AutoGPT), [Langchain-Chatchat repository](https://github.com/chatchat-space/Langchain-Chatchat), [FinGLM repository](https://github.com/MetaGLM/FinGLM), and [FastChat repository](https://github.com/lm-sys/FastChat).

## 6. RAG: from an attached knowledge base to a verifiable evidence system

### What I thought in 2024

The first notes set a sensible goal for domain question answering: support Chinese and English, preserve conversational context, understand paraphrases, combine evidence across documents, and decline to invent an answer. The direction was right. “Vector search + LLM + a prompt that says do not hallucinate” is nowhere near enough for finance, health care, legal work, or internal knowledge.

### The 2026 reassessment: still true, with a much higher engineering bar

The original RAG paper combined parametric memory with an external, non-parametric memory. In production, that idea must become a reviewable chain of evidence:

```text
identity and permissions
  → query understanding
  → permission-aware hybrid retrieval
  → reranking and deduplication
  → evidence-grounded generation
  → citation verification and abstention
  → feedback, evaluation, and tracing
```

### 6.1 Permission checks belong before retrieval

Document access rules must apply during retrieval. Fetching forbidden content and then asking the model not to mention it is not access control.

Store tenant, group, and document- or passage-level ACL metadata with the index, then filter by caller identity. Treat source files, parsed text, embeddings, caches, and traces as one security boundary. Sensitive material can leak from any layer, not only from the final answer.

### 6.2 Use hybrid retrieval, then rerank

Dense retrieval is good at semantic similarity. Lexical retrieval is good at exact entities, policy numbers, and error codes. Merge both result sets, then rank the candidates with a cross-encoder or another reranker. That is usually more dependable than increasing `top_k` until the context is full.

Chunking should also preserve structure: headings, tables, code blocks, page numbers, and parent-child relationships. Fixed character windows throw away the shape of a document.

The *Lost in the Middle* study found that models can use relevant information less effectively when it sits in the middle of a long context. A larger context window is not an invitation to paste in every retrieved passage.

### 6.3 A citation must lead back to evidence

Every consequential claim should map to a stable `document_id`, version, page, or passage anchor. After generation, verify that:

- the cited passage supports the nearby claim;
- the document version is still valid;
- the current user can open the citation;
- conflicting sources are surfaced rather than silently blended.

Citations are not decoration. They let readers verify an answer and let maintainers distinguish a retrieval failure from a ranking or generation failure.

### 6.4 Abstention is a policy, not a sentence in the prompt

“The available sources do not answer this” should be triggered by measurable conditions: no permission-approved candidate, a top reranker score below a calibrated threshold, conflicting evidence, failed citation verification, or a query beyond the declared scope.

When the system abstains, it can say what evidence is missing and suggest a narrower question or an additional document. It should not use fluent prose to plaster over an evidence gap.

Thresholds need data, not intuition. Calibrate them on a validation set that includes answerable, unanswerable, adversarial, and permission-denied queries, while accounting for the cost of a false answer.

### 6.5 Connect offline evaluation to online observation

A useful minimum evaluation set records the question, expected answer or grading rule, supporting documents, answerability, caller identity, permissions, and time/version context. Measure each layer separately:

| Layer | What to measure |
|---|---|
| Retrieval | Recall@k, MRR or nDCG, permission-filter accuracy |
| Generation | Faithfulness, answer relevance, citation completeness and correctness |
| Abstention | Recall on unanswerable queries and false-refusal rate |
| System | End-to-end success, P95 latency, token and retrieval cost, error rate |

RAGAS introduced ways to evaluate RAG pipelines without a human-written reference answer for every sample. Automated judges still need calibration against human-labeled examples.

In production, a trace should preserve query rewrites, retrieved passages, reranker scores, model and prompt versions, citations, and user feedback. The point is not to accumulate logs. It is to make one bad answer reproducible.

**Verdict: the direction still holds; the definition has matured.** RAG is not merely a way for a model to know more. It is a way for a system to know where an answer came from, who may see it, when to remain silent, and how to find the fault afterward.

Papers: [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401), [Lost in the Middle](https://arxiv.org/abs/2307.03172), and [RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217).

## 7. A production acceptance checklist for 2026

If I were rebuilding the domain QA system imagined in 2024, I would write the acceptance criteria before choosing a model or framework:

- [ ] Every indexed item has provenance, a version, an update time, a parse status, and access rules.
- [ ] Evaluation covers Chinese and English, acronyms, ambiguity, cross-document questions, stale material, and questions with no answer.
- [ ] Retrieved passages are inspectable; hybrid retrieval and reranking can be evaluated independently.
- [ ] Consequential claims have passage-level citations that open the source the current user is allowed to read.
- [ ] Permission filtering happens during retrieval; caches and traces do not bypass the boundary.
- [ ] Abstention conditions are calibrated with data rather than delegated to a prompt.
- [ ] Model, embedding, reranker, index, and prompt versions are traceable.
- [ ] Every upgrade runs the same regression suite and compares quality, latency, and cost.
- [ ] High-risk actions require deterministic controls or human approval; the model cannot grant itself authority.

## Conclusion: when the tide recedes, boundaries remain

In 2024, I was more interested in which abilities a model might acquire next. Looking back in 2026, I care more about whether the surrounding system can admit what it does not know.

Emergence tells us not to underestimate what scale may change; the debate around emergence tells us not to overestimate our ruler. LoRA and QLoRA lower the training barrier but do not perform data governance for us. Agents extend the boundary of programs into natural language, then return the old problems of permission and state in a sharper form. RAG attaches external knowledge to a model, but only citations, abstention, evaluation, and observability can turn “it knows” into “we can trust the answer.”

Technology waves reward the first people to name a new idea. Systems that last usually belong to those willing to define failure precisely.
