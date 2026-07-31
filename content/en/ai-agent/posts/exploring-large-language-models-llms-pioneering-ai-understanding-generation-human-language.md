---
title: 'From Language Models to RAG: Capabilities, Limits, and Engineering'
date: 2024-05-15T20:12:29+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - RAG
  - Context Engineering
  - Development
  - Testing
  - Security
categories:
  - Development
description: >
  Understand how Transformers, scaling, and RAG work—and how retrieval, citations, evaluation, security, and production rollout make LLM systems reliable.
tldr:
  - "A large language model still predicts conditional token probabilities. More data, parameters, and compute expand its useful range, but do not guarantee factuality or reliable execution."
  - "Emergence may describe real capability gains, yet sharp jumps can also be artifacts of discontinuous metrics. Measure behavior on your own task instead of treating scale as magic."
  - "RAG is an evidence pipeline, not a memory attachment: data governance, hybrid retrieval, reranking, citations, abstention, and layered evaluation determine whether it can be trusted."
cover:
  image: /images/covers/ai-agent/2024/exploring-large-language-models-llms-pioneering-ai-understanding-generation-human-language.jpeg
  alt: "From Language Models to RAG: Capabilities, Limits, and Engineering"
---

## Introduction: Do Not Learn the Model from the Chat Window

The first encounter with a large language model creates a powerful illusion. Something on the other side of the screen appears to have read widely, reasoned carefully, and chosen to explain itself. It can write code, summarize papers, preserve a tone across a conversation, and offer a polished rationale for an answer that is completely wrong.

The chat window shows behavior, not mechanism. Fluency hides missing evidence. Completeness hides uncertainty. A human voice invites us to overestimate how firmly the model is connected to the world.

A better starting point is not *what does it resemble?* but *what does it optimize?* Given the tokens already present, a language model estimates a probability distribution over the next token:

\[
P(x_t \mid x_1, x_2, \ldots, x_{t-1})
\]

Modern systems involve more than pretraining. Instruction tuning, preference optimization, system instructions, tool use, and inference-time reasoning all shape their behavior. Still, next-token prediction explains much of both the power and the failure.

I think of an LLM as a compression and reconstruction system for language. It compresses relationships found across enormous text corpora into parameters, then reconstructs a plausible continuation under the constraints of a prompt. This works surprisingly well because so much human knowledge and so many traces of reasoning are written in language. It remains unreliable because *resembling a correct answer* and *being supported by evidence* are different conditions.

Retrieval-augmented generation, or RAG, grows out of that gap. Instead of requiring the model to answer only from its parameters, a RAG system retrieves external material before generation and asks the model to ground its response in inspectable evidence. RAG is not a universal repair kit. It is, however, an excellent lens for understanding how a capable model becomes an accountable system.

## 1. What a Language Model Learns

### From counts to distributed representations

Early statistical language models estimated the next word from a short history, often with n-grams. The idea was transparent, but sparse observations and a fixed context window made it difficult to represent rare phrases or long-range dependencies.

Neural language models mapped discrete words into continuous vectors, allowing related usages to share statistical strength. Bengio and colleagues' 2003 neural probabilistic language model was an important step along this path. Recurrent networks and LSTMs later improved sequence modeling, but their sequential computation and difficulty with distant dependencies limited efficient scaling.

The deeper shift was not merely storing more examples. A neural model learns reusable representations of syntax, semantics, context, and task structure in a shared high-dimensional space. Instead of maintaining a table that says which word usually follows another, it develops a distributed representation that can support many related predictions.

### Why the Transformer became the foundation

The 2017 paper [Attention Is All You Need](https://arxiv.org/abs/1706.03762) introduced the Transformer. Its decisive engineering advantage was to model relationships between positions through self-attention while allowing highly parallel training.

In simplified form, attention is:

\[
\operatorname{Attention}(Q,K,V)
=
\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
\]

Queries, keys, and values let each position combine information from other positions according to learned relevance. Multiple attention heads can represent different relationships at once: local associations, references across a paragraph, or structural boundaries. We should resist assigning a neat human concept to every head, but dynamic information routing is plainly more expressive than a fixed local window.

Transformers did not abolish the cost of sequence length. Standard attention has quadratic time and memory complexity in the sequence length. Long contexts also suffer from distraction, position effects, and uneven use of information. A context-window specification tells us how much text a model can accept; it does not promise equal understanding of every token inside it.

### Pretraining does not copy the internet into a database

During pretraining, a model repeatedly predicts missing or subsequent tokens over large corpora. To do that well, it learns reusable regularities:

- vocabulary and syntax;
- statistical relationships among entities, events, and concepts;
- genres, argument patterns, and code structures;
- reasoning traces repeated in the training data;
- latent patterns connecting task descriptions to responses.

But parameters are not a database with addressable records. A fact may be diffusely represented, contradicted by another source, absent from the long tail, or frozen at the training boundary. Asking a model to recall a fact is probabilistic reconstruction, not a primary-key lookup.

This resolves an apparent contradiction. A model may explain the shape of a field while getting a date wrong. It may generate an excellent program skeleton and invent one nonexistent method. It is strong at patterns; it does not inherently possess an evidence trail.

## 2. What Scaling Changed—and What It Did Not

### Scaling laws are empirical, not mystical

Model loss has often improved predictably as parameters, data, and training compute increase. [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) documented power-law relationships across model configurations. [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556), commonly associated with Chinchilla, showed why parameters and training data must be balanced under a compute budget.

The useful conclusion is not simply “bigger is better.” Scaling laws make resource allocation more predictable. An undertrained large model can be a poor use of compute; data quality, data quantity, model size, and optimization must be considered together.

A small improvement in training loss also does not translate linearly into product value. Code that differs by one character may not run. A factual answer with one wrong number may be worthless. Underlying capability can improve smoothly while user experience crosses a sharp threshold between unusable and useful.

### The emergence debate matters to engineers

Large models are often said to acquire abilities suddenly at a certain scale: in-context learning, multistep reasoning, or instruction following. [Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682) catalogued many such observations.

Yet an apparent jump does not necessarily reveal a clean internal phase transition. [Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004) showed how discontinuous metrics can turn a smooth underlying improvement into a step on a chart. Exact match, for example, records every near-correct answer as zero until the model crosses the final threshold.

Whenever someone claims emergence, I want four questions answered:

1. Is the metric continuous, or does it impose a threshold?
2. Were data, prompts, and training methods comparable across scales?
3. Does the ability survive paraphrases and distribution shifts?
4. Does the result belong to the base model, or to scaffolding, tools, and evaluation prompts?

My view is pragmatic: scaling has expanded the set of tasks models can complete reliably, but “quantity turns into mysterious intelligence” is not an engineering specification. What matters is where capability appears on *your* task, where it disappears, and whether failure remains bounded.

### In-context learning is not parameter learning

A model can infer a task from instructions and a few examples without a training run. This looks like learning, but its parameters do not change at inference time. The examples create a temporary task structure inside the context and steer the continuation.

Three consequences follow:

- example selection and order can change the result;
- irrelevant context consumes attention and can mislead the model;
- the temporary structure does not become durable memory after the conversation.

Prompt design can improve communication, but it cannot replace knowledge governance. Piling rules into one long system prompt moves maintainability into a block of prose that is hard to test. Mature systems put stable rules in schemas, access controls, deterministic validators, and tool boundaries. Prompts should carry the parts that genuinely require language.

## 3. Capability Is Not Reliability

### Hallucination follows from the objective

When evidence is missing, a language model still has a next token to produce. Unless the system supplies evidence, teaches abstention, or validates the result, the model can generate a plausible falsehood. Hallucination is not merely an occasional software bug; it is a structural tension between probabilistic generation and factual constraint.

Typical failures include:

- invented papers, links, methods, or configuration options;
- attributes blended across similar entities;
- confident claims about events beyond the model's available knowledge;
- an early mistake in a multistep solution hidden by fluent continuation;
- agreement with a false premise instead of correcting it.

Lowering temperature reduces variation, not epistemic error. A system that gives the same wrong answer every time may be more dangerous than one whose uncertainty is visible.

### A written chain of reasoning is not an audit trail

Models can produce step-by-step explanations, but those explanations are still generated text. They may help organize an answer; they may also rationalize a conclusion after the fact. For mathematics, finance, permissions, and data transformations, executable verification is usually stronger evidence than prose that sounds methodical.

A production system should prefer:

- traceable sources;
- structured outputs validated against a schema;
- executable code with tests;
- explicit assumptions and uncertainty;
- abstention when evidence is insufficient.

Never treat model output as executable code merely because the prompt requested a dictionary or expression. Parse JSON with a standard parser, validate fields against a schema, and handle parse failure as an ordinary state. Language output is untrusted input.

### The model is one component, not the system

A reliable application also needs data, retrieval, permissions, state, tools, monitoring, evaluation, and fallbacks. A model is the probabilistic component inside that larger arrangement. Most of the work between a striking demo and a durable product happens outside the model.

This is my central engineering principle: **do not pretend uncertainty can be eliminated; contain it within measurable boundaries.** Let a model interpret ambiguous intent and compose language. Let a database own exact facts, programs enforce rules, access-control systems guard authority, and regression suites reveal when the system quietly deteriorates.

## 4. RAG Is an Evidence Pipeline

Lewis and colleagues formalized retrieval-augmented generation for knowledge-intensive tasks in their 2020 [RAG paper](https://arxiv.org/abs/2005.11401). The basic loop is simple:

1. receive a question;
2. retrieve relevant passages from an external source;
3. assemble the question and passages into context;
4. generate an answer grounded in that context.

RAG addresses three concrete problems.

**Freshness.** Model parameters do not update whenever a policy document changes. Retrieval can consult the current version at query time.

**Private knowledge.** Internal policies, project records, and personal notes change frequently and should not simply be baked into a public model. Retrieval can expose only the material the current user is allowed to access.

**Traceability.** Parameter memory cannot reliably identify its source. Retrieved passages can carry a document title, section, version, and link that a reader can inspect.

RAG does not guarantee truth. It changes part of the basis for an answer from hidden parameters to an observable retrieval context. Bad, stale, or irrelevant evidence still yields bad answers. Conflicting versions may cause a model to prefer the smoother passage over the newer one.

That is why the heart of RAG is not a vector database. It is an evidence supply chain.

## 5. Building the Evidence Supply Chain

### Start with governance, not embeddings

Before splitting or embedding documents, establish:

- which source is authoritative;
- who may read it and whether permissions inherit to chunks;
- how versions, publication times, and expiry are represented;
- which source wins when claims conflict;
- whether deleting a source also deletes its indexed derivatives.

Vectorization makes disorder faster to retrieve; it does not create order. Keep document title, path, section, owner, timestamp, language, type, version, and access policy as metadata. A citation should resolve to a location a person can understand, not only an internal chunk identifier.

### Chunk along meaning and structure

The retrieval unit is usually a chunk. A chunk that is too large mixes topics, blurs its embedding, and wastes context. One that is too small separates a rule from its exception or a definition from its scope.

Prefer document structure over a universal character count:

- split on headings, paragraphs, lists, code blocks, and table boundaries;
- attach document and parent headings to each chunk;
- merge tiny adjacent sections and recursively split very large ones;
- use modest overlap only where it preserves boundary meaning;
- adopt different policies for source code, API references, tables, and prose.

There is no globally optimal chunk size. A single configuration item in a manual and an argument in a research report require different units. Tune chunking on real questions, not on a number copied from a tutorial.

### Combine semantic and lexical retrieval

Embeddings place semantically related text close together, which helps when the question paraphrases the source. Dense retrieval can still miss exact identifiers, error codes, versions, and names. Lexical retrieval has the opposite strengths. Production systems often combine both.

A conceptual score can be written as:

\[
\text{score}
=
\alpha \cdot \text{dense}
+
(1-\alpha)\cdot \text{sparse}
\]

In practice, dense and sparse scores may not share a meaningful scale. Rank fusion, such as reciprocal rank fusion, is often safer than raw addition. Apply tenant, language, product-version, and permission filters during retrieval whenever possible. Do not retrieve forbidden material and hope the model ignores it.

The user's text may also be a poor standalone query. “Why did it fail?” needs the entity from conversation history. A complex question may need decomposition; an abstract question may benefit from several concrete search expressions. Query rewriting can change intent, so keep the original question for generation and evaluation.

### Retrieve broadly, then rerank precisely

The first retrieval stage should favor recall and quickly produce candidates. A second-stage reranker can spend more computation judging whether each passage actually answers the question. This two-stage design is usually more robust than sending the first vector top-k directly to the generator.

After reranking, remove near-duplicates and preserve source diversity. Five overlapping chunks from the same paragraph may all score highly while contributing only one piece of evidence. Maximum marginal relevance or quotas per document and section can prevent a single source from filling the context.

More context is not automatically better. Irrelevant passages dilute evidence, conflicts introduce ambiguity, and crucial material buried in a long prompt may be underused. The context budget belongs to the smallest set of passages that can support the answer.

### Assemble context with visible boundaries

Do not concatenate chunks into an undifferentiated wall of text. Preserve source identity and temporal information:

```text
Task: Answer only from the supplied evidence.
If the evidence is insufficient, say what cannot be confirmed.

Question:
{user_question}

Evidence:
[S1] Refund policy
Version: 2026-06-01
Content: ...

[S2] Enterprise customer addendum
Version: 2026-07-15
Content: ...

Requirements:
1. Cite factual claims with source identifiers such as [S1].
2. Report conflicts between sources.
3. Do not complete missing facts from outside the evidence.
```

Retrieved content is untrusted input. A document can contain instructions telling the model to ignore system rules or call a tool. Delimit instructions from evidence, restrict available tools, validate tool arguments, and reauthorize every sensitive action. Retrieval grants a model visibility, not authority.

### Bind claims to citations and permit abstention

A useful answer must satisfy three conditions:

- its factual claims are supported by the supplied context;
- citations resolve to passages that support those claims;
- insufficient evidence produces a clear abstention.

Bind source identifiers during generation and map them to links in application code. Asking a model to invent URLs from memory creates another hallucination channel.

Abstention should not depend on one sentence in a prompt. Combine retrieval confidence, agreement among candidates, answer-support checks, and domain rules. Calibrate thresholds on a validation set; scores from different retrievers are not directly comparable. A good refusal should say what is missing and, when safe, suggest what evidence would make the question answerable.

## 6. Evaluate Each Layer, Not Just the Final Sentence

A RAG failure can begin in ingestion, retrieval, ranking, generation, or presentation. Judging only the final answer hides where to intervene.

### Retrieval evaluation

Build a labelled set of questions and supporting passages, including difficult negatives. Track:

- **Recall@k:** whether the required evidence appears in the first k results;
- **MRR:** how early the first relevant result appears;
- **nDCG:** the ranking quality when passages have graded relevance;
- correctness of permission, version, language, and tenant filters.

If evidence never reaches the context, the generator can only guess. Retrieval recall sets one ceiling on the system.

### Answer and citation evaluation

Separate at least five dimensions:

- **correctness:** does the answer match the reference facts?
- **faithfulness:** is every factual claim entailed by the supplied evidence?
- **citation precision:** does each citation support the claim beside it?
- **completeness:** are all essential parts of the question addressed?
- **abstention quality:** does the system avoid guessing when evidence is absent?

Model-based graders help evaluate at scale, but should not be the sole judge. A grader model has sensitivity to wording, order, and its own prior knowledge. Use fixed rubrics and calibration examples, compare automated scores with human judgments, and require human review for consequential cases.

### System evaluation

Online quality also includes latency, cost, error rate, cache behavior, index freshness, and user corrections. A factually correct answer can still violate a revoked permission. A high-quality answer can arrive too slowly to be useful.

The most valuable evaluation suite is a history of real failures. Anonymize each incident, add it to regression coverage, and label the layer that failed. Re-run the stable core whenever the model, embedding, chunker, prompt, or index changes.

| Layer | Question | Typical failure |
|---|---|---|
| Data | Is the source authoritative, current, and permitted? | An obsolete policy remains indexed |
| Retrieval | Did the required evidence enter the candidate set? | An identifier was not recalled |
| Reranking | Did decisive evidence rise to the top? | Duplicate chunks filled top-k |
| Generation | Are claims supported by evidence? | The model filled a factual gap |
| Citation | Does the source entail the nearby claim? | A citation exists but is irrelevant |
| Security | Can content influence system authority? | Prompt injection triggers a tool |
| Runtime | Are latency and cost within budget? | Query expansion grows without limit |

## 7. Security Is Part of Answer Quality

RAG joins data from different trust zones: user input, internal documents, third-party content, model output, and tools. That makes security a property of the whole pipeline.

Threat-model at least these paths:

- indirect prompt injection hidden in retrieved text;
- cross-tenant or cross-role retrieval;
- sensitive data leaking through logs, caches, traces, or citations;
- poisoned sources entering an index;
- model-generated tool arguments that exceed user intent;
- stale copies surviving after source deletion or permission revocation.

Use least-privilege retrieval credentials, enforce authorization outside the model, attach provenance to indexed content, and make ingestion and deletion auditable. Sanitize logs and define retention explicitly. For state-changing tools, validate structured arguments and show the user a confirmation boundary proportional to the consequence.

Security tests belong in the same regression pipeline as relevance tests. A retrieval improvement that raises recall by exposing another tenant's document is not an improvement.

## 8. Know When Not to Use RAG

RAG is popular enough to become a default even when a deterministic solution is better.

### Use a database or search result directly

For an order status, account balance, inventory count, or exact policy field, query the system of record and render the result programmatically. Turning exact data into embeddings and asking a model to reconstruct it makes a deterministic problem probabilistic.

### Use long context deliberately

When there are only a few documents, their total length is manageable, and the task requires comparison across the whole set, supplying complete material may outperform chunk retrieval. Test position sensitivity and evidence use; a large advertised context window is not proof of uniform comprehension.

### Use fine-tuning for stable behavior

Fine-tuning is better suited to durable behavior, format, tone, or domain task patterns than to facts that change daily. Facts in parameters are slow to update, difficult to delete, and hard to cite. “RAG manages knowledge; fine-tuning shapes behavior” is not an absolute law, but it is a useful first distinction.

### Use tools for computation and action

Calculations, transactions, and external state changes belong in constrained tools. A currency conversion should call a deterministic calculator with current rates. A ticket submission should use an authenticated API with explicit validation. Retrieval may supply operating policy, but it cannot replace the transactional system.

Reliable products are usually composed systems: classify the intent, then query a database, retrieve documents, call a tool, or generate directly as appropriate. Models can help route work, but code must enforce permissions and business invariants.

## 9. A Production Rollout That Can Be Reversed

### Step 1: Define the answerable boundary

Write down what the system may answer and what it must refuse. Identify authoritative sources, update frequency, permissions, and success criteria. Start with a small set of real questions that includes unanswerable, ambiguous, conflicting, and unauthorized cases.

### Step 2: Build the simplest observable baseline

Use structure-aware chunks, one embedding model, and basic top-k retrieval. Record candidate identifiers, scores, filters, selected context, citations, and the final outcome with appropriate privacy controls. Errors must be reproducible before they can be improved. Avoid agents and multistep loops until the baseline is understood.

### Step 3: Let failures choose the next component

If the right passage is absent, improve query formation, chunking, metadata, or hybrid retrieval. If it is present but ranked low, add reranking. If the context is correct but the answer distorts it, improve evidence formatting, output constraints, or generation. If citations drift, add claim-to-source validation.

Change one class of variable at a time. Otherwise, a higher score cannot tell you which change worked or whether its latency and cost were justified.

### Step 4: Establish release gates

Set minimum offline metrics and explicit security invariants. Route high-risk questions to human review or deterministic workflows. A new model, index, embedding, or prompt should pass the same regression suite before a shadow deployment or small canary.

Compare the candidate against the current system on quality, refusal behavior, security, latency, and cost. Expand traffic only while those gates hold. Keep the previous configuration deployable so rollback is an ordinary operation, not an emergency project.

### Step 5: Design degradation before failure

What happens when retrieval times out? Can the system answer without reranking? What does the user see when no evidence is found? How quickly does a cache expire after a source is deleted?

A reliable system is not one that never fails. It is one that fails without crossing authority boundaries, does not disguise failure as success, and offers a useful next step.

## 10. Three Judgments About LLM Engineering

### Trusted context will matter more than plentiful answers

Generation will become cheaper, and fluent text will become abundant. The durable advantage is the ability to place the right information, under the right permission, into the right context at the right time—and let a person inspect the basis for the result.

This is why the lasting value of RAG is not “connecting a vector store.” It is knowledge governance: provenance, versions, structure, access, feedback, and retirement. An index is only one projection of governed knowledge.

### A stronger model does not repay system debt

A more capable model can conceal poor chunks, disordered data, and brittle prompts. It cannot repair their foundations, and the next model change may expose them differently. Waiting for a larger model is an expensive way to postpone engineering.

Keep models, embeddings, retrievers, and rerankers behind clear interfaces, then constrain them with the same evaluation set. An upgrade should be an experiment, not a conversion of faith.

### A mature product lets users see its limits

Some products treat “I don't know” as a failed experience and pressure the model to answer. I see the opposite. Showing sources, acknowledging a gap, exposing a conflict, and asking for missing information are signs of maturity.

People do not need a model that always speaks. They need a system that knows when to speak, what supports its words, and when to stop.

## Conclusion

The journey from language models to RAG looks like a move from one model to one application architecture. It is really a change in how we think.

When we look only at models, we focus on parameter counts, leaderboards, and surprising capabilities. When we look at systems, we ask where evidence came from, whether it remains valid, who may use it, how failure becomes visible, and how a change is evaluated. The first view produces wonder. The second earns trust.

Large language models made language a new interface to computation; they did not repeal engineering. Probabilistic output needs deterministic boundaries. Broad knowledge needs traceable evidence. Rapid iteration needs stable evaluation. That is the real meaning of RAG: not an external memory bolted onto a model, but a way to reconnect an answer to reality.

## References

1. Bengio, Y. et al. [A Neural Probabilistic Language Model](https://www.jmlr.org/papers/v3/bengio03a.html), 2003.
2. Vaswani, A. et al. [Attention Is All You Need](https://arxiv.org/abs/1706.03762), 2017.
3. Brown, T. et al. [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165), 2020.
4. Kaplan, J. et al. [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361), 2020.
5. Hoffmann, J. et al. [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556), 2022.
6. Wei, J. et al. [Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682), 2022.
7. Schaeffer, R. et al. [Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004), 2023.
8. Lewis, P. et al. [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401), 2020.
9. Gao, Y. et al. [Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997), 2023.
