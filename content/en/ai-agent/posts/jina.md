---
url: "/ai-agent/posts/jina/"
title: "Jina AI in 2026: Embeddings, Reranking, Reader, and Jina Serve"
date: 2025-04-12T13:01:59+08:00
lastmod: 2026-07-31T12:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - AI Search
  - RAG
  - Open Source
  - Project Learning
  - Cloud Native
categories:
  - Development
description: >
  A production-focused guide to Jina after its Elastic acquisition, covering v4/v5 embeddings, reranking, Reader, DeepSearch, MCP, licensing, and deployment.
aliases:
  - /projects/jina/
  - /posts/ai-projects/jina/
cover:
  image: /images/covers/ai-agent/2025/jina.png
  alt: "A layered search system connecting multimodal data, embeddings, reranking, and grounded answers"
  relative: false
---

Jina used to be easiest to explain as a cloud-native neural-search framework. That description is still true, but it is no longer sufficient.

In 2026, the name covers two related products:

1. **Jina Search Foundation**: hosted APIs and model families for embeddings, reranking, web reading, search, and research.
2. **Jina Serve**: the open-source framework for turning Python AI components into services and composing them into distributed flows.

The distinction matters. Search Foundation gives an application retrieval intelligence; Jina Serve gives a team control over how its own services run. One is a set of capabilities, the other an orchestration layer. Treating them as interchangeable usually leads either to unnecessary infrastructure or to a hosted dependency that was never consciously chosen.

This guide builds a current mental model of both sides, then turns it into practical model, licensing, and deployment decisions.

## What changed after the Elastic acquisition

[Elastic announced that it had joined forces with Jina AI on October 9, 2025](https://www.elastic.co/blog/elastic-jina-ai). Jina's own company page describes the event more directly: [Jina AI was acquired by Elastic](https://jina.ai/about-us/).

This did not erase the Jina product line. It clarified its center of gravity:

- Jina continues as a search-model brand focused on embeddings, rerankers, Readers, and small language models.
- Elastic can expose selected Jina models through the Elastic Inference Service and connect them directly to Elasticsearch retrieval workflows.
- Jina's API and cloud-marketplace routes remain useful to teams that do not want Elasticsearch to be their application boundary.
- The Apache-licensed serving framework remains available in the [official Jina Serve repository](https://github.com/jina-ai/serve).

The acquisition therefore should not be read as “Jina became an Elasticsearch feature.” A better interpretation is that the model layer and the search engine layer now have a much shorter path between them.

That path is valuable, but architecture should still begin with the problem. A vector database is not relevance. An embedding model is not a retrieval system. A reranker is not a substitute for a weak corpus. Search quality emerges from how these pieces constrain one another.

## The two Jina stacks

### Search Foundation APIs: buy the capability

Use the hosted Search Foundation APIs when you need one or more of the following:

- multilingual text or multimodal embeddings;
- a second-stage reranker;
- URL-to-clean-text conversion;
- web search returned in model-friendly form;
- iterative search-and-reasoning through DeepSearch;
- agent tools exposed through MCP.

The operational contract is a normal HTTPS request. Jina owns model serving, batching, scaling, and model updates. You own data preparation, retrieval design, evaluation, access control, and the behavior of the application around the API.

This route is usually the fastest way to test whether better retrieval changes the product. It also prevents a common mistake: spending a week deploying a model before proving that the model improves the metric that matters.

### Jina Serve: own the service topology

[Jina Serve](https://github.com/jina-ai/serve) is for packaging and orchestrating your own AI services. Its core vocabulary is compact:

- A **BaseDoc** or **DocList** defines typed input and output data.
- An **Executor** contains business or model logic.
- A **Deployment** serves one Executor and can add replicas, shards, or dynamic batching.
- A **Flow** composes Deployments behind a gateway.
- The **Gateway** exposes HTTP, gRPC, or WebSocket interfaces to clients.

Choose Serve when the system needs custom preprocessing, privately hosted models, mixed runtimes, independent scaling, streaming, or a pipeline that must remain inside your network. Do not choose it merely because “production systems need Kubernetes.” A single API call can be a sound production architecture; a five-service Flow can be an expensive way to hide an undecided boundary.

The two stacks can also coexist. An Executor may call a Search Foundation API, enrich the result with private logic, and pass it to the next service. The important question is not whether the architecture is pure. It is whether each boundary has a reason.

## Model choice in 2026

Jina's catalog now spans lightweight text encoders, universal multimodal encoders, and listwise rerankers. “Use the newest model” is not a selection method. The right model is the smallest one that preserves the evidence your users search for.

| Need | Recommended starting point | Why | Main cost |
|---|---|---|---|
| Text-only multilingual retrieval at the edge | `jina-embeddings-v5-text-nano` | 239M parameters, 8K context, 768 dimensions | Less headroom than the small model |
| Text-only multilingual production search | `jina-embeddings-v5-text-small` | 677M parameters, 32K context, 1024 dimensions | More compute and memory |
| Text, image, audio, video, and PDF in one space | `jina-embeddings-v5-omni-small` | 32K context and 1024-dimensional shared embeddings | Multimodal inference cost |
| Edge-oriented multimodal retrieval | `jina-embeddings-v5-omni-nano` | 8K context and 768-dimensional vectors | Lower capacity than omni-small |
| Visually rich documents with dense or late-interaction retrieval | `jina-embeddings-v4` | Text, image, and PDF input; single- and multi-vector output | 3.8B parameters and a restrictive model license |
| High-quality multilingual second-stage ranking | `jina-reranker-v3.5` | 0.6B listwise model; stronger domain and structured-data ranking than v3 | Extra latency; non-commercial weights |

The specifications above follow Jina's [model catalog](https://jina.ai/models/), Elastic's [Jina model reference](https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-jina), and the official [`jina-reranker-v3.5` model repository](https://huggingface.co/jinaai/jina-reranker-v3.5).

### v4 versus v5 is a workload decision

`jina-embeddings-v4` remains meaningful when screenshots, diagrams, tables, page layout, or PDF appearance carry information that text extraction destroys. Its multi-vector output can preserve token-level evidence for late interaction, while its dense output works with ordinary approximate nearest-neighbor indexes.

The v5 line separates efficiency from modality more deliberately:

- **v5-text** is the economical default for natural-language fields.
- **v5-omni** places text, image, audio, video, and documents in a shared embedding space.
- **nano** favors constrained hardware and lower latency.
- **small** favors retrieval quality and longer context.

Do not switch embedding models in place. A new model changes the vector space even when dimensions happen to match. Build a new index, replay a representative query set, compare recall and downstream answer quality, then move traffic. Model names are versioned; indexes should be too.

### Why reranker v3.5 belongs after retrieval

An embedding index is designed to find a plausible candidate set quickly. A reranker can spend more computation comparing those candidates with the query.

`jina-reranker-v3.5` is a 0.6B multilingual listwise model. It preserves the “last-but-not-late” interface of v3, but adds hybrid attention and self-distillation for better domain robustness, structured-data ranking, and long-list efficiency. Because candidates are considered jointly, it can compare documents rather than score every pair in isolation.

A practical pipeline is:

1. retrieve 30–100 candidates with dense, sparse, or hybrid search;
2. rerank that list;
3. keep only the evidence that fits the answer context;
4. require citations from the retained documents.

Reranking is not free relevance. It magnifies the quality of a candidate set; it cannot recover a document the first stage never retrieved. Measure first-stage recall separately from final ranking quality.

## Reader, Search, DeepSearch, and MCP

These products sit above the embedding layer and solve different parts of the information path.

### Reader API: turn a URL into usable evidence

Prefix a public URL with `https://r.jina.ai/http://...` or `https://r.jina.ai/https://...` to receive cleaner, model-friendly content. Reader is useful for removing navigation noise before chunking or prompting.

```bash
curl "https://r.jina.ai/https://www.elastic.co/blog/elastic-jina-ai" \
  -H "Authorization: Bearer ${JINA_API_KEY}"
```

Reader improves representation, not authority. Keep the source URL, fetched time, and content hash. Respect site terms, robots policies, authentication boundaries, and personal-data rules. Clean Markdown can look trustworthy while still being stale or wrong.

### Search API: discover pages, then inspect them

The `s.jina.ai` endpoint searches the web and returns results in an LLM-friendly form. It is useful for agents that need current discovery rather than a fixed corpus. Search results should be treated as leads, not as final evidence: read the primary page, preserve provenance, and prefer first-party sources.

### DeepSearch: delegate the research loop

[DeepSearch](https://jina.ai/deepsearch/) exposes an OpenAI-compatible chat-completions endpoint that can search, read, reason, and iterate:

```bash
curl https://deepsearch.jina.ai/v1/chat/completions \
  -H "Authorization: Bearer ${JINA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jina-deepsearch-v1",
    "messages": [
      {"role": "user", "content": "Compare Jina v4 and v5 for visual PDF retrieval. Cite primary sources."}
    ]
  }'
```

DeepSearch reduces orchestration work when a question requires repeated discovery. It should not silently replace a controlled retrieval pipeline for regulated, private, or reproducible workloads. If the answer must be audited later, save the sources and the decision trail, not only the prose response.

### MCP: give an agent narrow search tools

The [official Jina MCP server](https://github.com/jina-ai/MCP) exposes Reader, search, embeddings, reranking, screenshots, and research utilities through Model Context Protocol. A remote configuration can be as small as:

```json
{
  "mcpServers": {
    "jina": {
      "url": "https://mcp.jina.ai/v1?include_tags=search,read",
      "headers": {
        "Authorization": "Bearer ${JINA_API_KEY}"
      }
    }
  }
}
```

Tool filtering is more than tidiness. Every registered schema consumes context and enlarges the agent's action surface. Give an agent the smallest tool set that completes its job.

## Minimal Search Foundation API examples

### Create text embeddings

The embedding API follows a familiar JSON shape:

```bash
curl https://api.jina.ai/v1/embeddings \
  -H "Authorization: Bearer ${JINA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jina-embeddings-v5-text-small",
    "task": "retrieval.passage",
    "dimensions": 1024,
    "input": [
      "Retrieval quality begins with a corpus whose boundaries are understood."
    ]
  }'
```

Use the corresponding query task when embedding queries. Store the model name, task, dimensions, normalization rule, and chunking version beside the index. Without that metadata, rebuilding the same vector space later becomes guesswork.

### Rerank candidates

```bash
curl https://api.jina.ai/v1/rerank \
  -H "Authorization: Bearer ${JINA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jina-reranker-v3.5",
    "query": "Which Jina component orchestrates multiple AI services?",
    "documents": [
      "A Flow composes Deployments behind a Gateway.",
      "Reader converts a public URL into model-friendly text.",
      "An embedding maps an input into a vector."
    ],
    "top_n": 2,
    "return_documents": true
  }'
```

In production, log latency, token usage, candidate count, and the rank movement of clicked or accepted results. A reranker that improves an offline benchmark but damages tail latency or domain-specific precision is not an improvement.

## A minimal Jina Serve service

The following Executor exposes typed input and output over a Deployment. It is deliberately small: the point is to make the service boundary visible.

```python
from docarray import BaseDoc, DocList
from jina import Deployment, Executor, requests


class TextInput(BaseDoc):
    text: str


class TextOutput(BaseDoc):
    normalized: str


class Normalizer(Executor):
    @requests(on="/normalize")
    def normalize(
        self, docs: DocList[TextInput], **kwargs
    ) -> DocList[TextOutput]:
        return DocList[TextOutput](
            TextOutput(normalized=" ".join(doc.text.split()))
            for doc in docs
        )


if __name__ == "__main__":
    with Deployment(
        uses=Normalizer,
        port=12345,
        protocol="http",
    ) as deployment:
        deployment.block()
```

Install and run it:

```bash
python -m pip install jina docarray
python app.py
```

Once one Executor is not enough, a Flow can compose services:

```python
from jina import Flow

flow = (
    Flow(port=12345, protocol="http")
    .add(name="normalize", uses=Normalizer)
    .add(name="retrieve", uses="config/retriever.yml")
)

with flow:
    flow.block()
```

Before adding replicas or shards, establish a load profile. Replicas improve parallel capacity; shards partition state or data; dynamic batching improves accelerator utilization at the cost of queueing delay. These are different controls, not three synonyms for scale.

## License and deployment boundaries

Jina has no single license that covers every artifact. Review the exact repository, model card, API terms, and deployment channel you use.

| Artifact | Typical boundary | What it means in practice |
|---|---|---|
| Jina Serve source | Apache-2.0 | Modification and commercial deployment are broadly permitted under the license conditions |
| Official MCP server source | Apache-2.0 | The server code is open; upstream API usage still follows service terms |
| Some older embedding models | Model-specific open licenses | Verify each model card; do not inherit terms from another version |
| v4 and many newer model weights | Research or CC BY-NC-style terms | Public weights do not automatically permit commercial self-hosting |
| `jina-reranker-v3.5` weights | CC BY-NC 4.0 | Research and non-commercial use; commercial use needs an appropriate agreement |
| Jina hosted APIs | Service terms and account plan | You consume a managed service rather than receiving ownership of model weights |
| Elastic Inference Service | Elastic service terms and supported-model matrix | Availability depends on model, region, deployment type, and Elastic version |

Three rules prevent most licensing mistakes:

1. **Open source code does not make adjacent weights open for commercial use.**
2. **API access does not grant the right to download and self-host a model.**
3. **A Hugging Face download button is distribution, not a commercial license.**

For sensitive data, licensing is only one boundary. Also decide where prompts and documents travel, how long providers retain them, which region serves them, how secrets rotate, and whether a fallback provider changes the data path. After the Elastic acquisition, use [Elastic's current legal resources](https://www.elastic.co/legal/) for data-processing terms rather than relying on an old blog post.

## A production decision sequence

The following order keeps infrastructure from outrunning evidence:

1. **Define the retrieval unit.** Decide whether the thing users seek is a paragraph, a table, a screenshot, a whole document, an audio passage, or code.
2. **Build a judged query set.** Include common questions, ambiguous queries, multilingual input, and failure cases from real users.
3. **Choose the first-stage model.** Start with v5-text for text, v5-omni for mixed media, or v4 when visual documents and late interaction justify its size.
4. **Choose the index shape.** Dense, sparse, hybrid, or multi-vector search should follow the evidence, not fashion.
5. **Add reranking only after measuring recall.** Retrieve broadly enough that the relevant item reaches the reranker.
6. **Select the operating boundary.** Use Jina API, Elastic Inference Service, a cloud marketplace, or approved self-hosting based on latency, privacy, commercial rights, and team capacity.
7. **Version everything.** Corpus snapshot, parser, chunker, model, dimensions, task adapter, index, and relevance judgments belong in the release record.
8. **Observe user outcomes.** Track failed searches and grounded answer acceptance, not only cosine similarity.

## What I would build today

For a multilingual documentation assistant, I would begin with `jina-embeddings-v5-text-small`, hybrid retrieval, and `jina-reranker-v3.5` through the hosted API. Reader would be an ingestion aid for public web pages, not an untracked runtime dependency. The index would carry source URLs, timestamps, section paths, and content hashes. A small evaluation set would gate every reindex.

For manuals dominated by diagrams, scans, and tables, I would test v5-omni-small against v4 rather than assuming that newer means better. The evaluation would include visual questions whose answers disappear under plain-text extraction.

For a private multi-model pipeline, I would use Jina Serve only where independent scaling or protocol boundaries are real requirements. The first Flow would contain two or three legible services, not a map of every function in the codebase.

There is a quiet principle underneath these choices: retrieval is the discipline of deciding what deserves to enter the context window. Better models help, but the deeper work is deciding what counts as evidence, how it remains traceable, and when the system should admit that it has not found enough.

## Official references

- [Jina Search Foundation model catalog](https://jina.ai/models/)
- [Jina Embedding API and product guide](https://jina.ai/embeddings/)
- [Jina Reader](https://jina.ai/reader/)
- [Jina DeepSearch](https://jina.ai/deepsearch/)
- [Elastic and Jina AI acquisition announcement](https://www.elastic.co/blog/elastic-jina-ai)
- [Elastic documentation for Jina models](https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-jina)
- [Jina Serve official repository](https://github.com/jina-ai/serve)
- [Jina MCP official repository](https://github.com/jina-ai/MCP)
- [`jina-reranker-v3.5` official model repository](https://huggingface.co/jinaai/jina-reranker-v3.5)
