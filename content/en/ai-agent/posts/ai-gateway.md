---
title: 'AI Gateway Guide: LiteLLM, Kong, APISIX, Cloudflare, or Portkey?'
date: 2025-04-16T17:36:12+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Cloud Native
  - Security
  - Monitoring
  - Open Source
  - DevOps
categories:
  - Technology
description: >
  A practical comparison of LiteLLM, Kong, APISIX, Cloudflare, and Portkey across routing, cost, security, deployment boundaries, and production checks.
aliases:
  - /projects/ai-gateway/
  - /posts/ai-projects/ai-getway/
cover:
  image: /images/covers/ai-agent/2025/ai-gateway.png
  alt: "Several model pipelines converge at an AI Gateway where cost and governance are weighed"
---

An AI Gateway is not merely a reverse proxy placed in front of a language model. Once an application reaches production, every model call carries several kinds of uncertainty at once: long-lived streaming connections, token-based billing, provider quotas, sensitive inputs, changing model behavior, and outputs that cannot be trusted by default.

A conventional API gateway can handle part of this traffic. It may authenticate clients, terminate TLS, enforce request limits, and route HTTP requests. It does not automatically answer the questions that matter most to an AI product:

1. When a model slows down or returns `429`, where should the request go next?
2. How much has a team spent this month, and which models may it still use?
3. If a response leaks data or breaks a contract, can we reconstruct which policy, model, prompt version, and fallback path produced it?

The useful promise of an AI Gateway is to pull these repeated decisions out of individual applications and place them in one auditable policy point. But centralization is not governance by itself. A gateway without an explicit failure boundary, cost owner, and data policy merely concentrates scattered risks into one larger outage.

This guide compares LiteLLM, Kong AI Gateway, Apache APISIX, Cloudflare AI Gateway, and Portkey using their official documentation available in July 2026. Features, licenses, and pricing will keep changing. Treat the comparison as the beginning of a proof, not a substitute for a contract or a production test.

## What an AI Gateway should own

In a reasonably complete system, the gateway sits between the application and model providers:

```text
User / Agent
     |
Business API: sessions, permissions, product rules
     |
AI Gateway: virtual keys, model aliases, budgets, routing, guardrails, telemetry
     |
OpenAI / Anthropic / Gemini / Bedrock / Azure / self-hosted models
```

The gateway should not replace the business service. Whether a person may read a document, whether a tool call requires approval, and whether an answer may be written back to a database remain business authorization decisions. The gateway is better at answering a narrower question: may this model request pass, how should it pass, and what evidence must remain afterward?

It also helps to separate three related products:

- A **traditional API gateway** governs general north-south traffic. Its strengths are authentication, routing, rate limiting, WAF policies, and API lifecycle management.
- An **AI Gateway** understands providers, models, tokens, streams, and inference-specific failure modes. It usually governs outbound traffic from applications to models.
- An **Agent or MCP gateway** must also understand tools, resources, and delegated identity. It deals with actions that may have side effects, not inference alone.

One company may use a single platform for all three layers. Another may combine two gateways. The objective is not the smallest component count; it is a boundary that operators can explain during an incident.

## Two architectural paths

### AI-native gateways

LiteLLM and Portkey begin with model calls. They prioritize a common API, provider adapters, retry and fallback, usage accounting, and guardrail integrations. They are often the fastest route for AI teams working mainly in Python or JavaScript.

The trade-off appears when the problem grows beyond inference. Complex API products, protocol transformation, developer portals, and Kubernetes-wide network governance may still require an outer gateway. If both layers retry, rate-limit, and log independently, a small upstream failure can become a request storm and an observability puzzle. Only one layer should own each policy.

### General gateways extended for AI

Kong and Apache APISIX add AI capabilities to mature API gateways. They are attractive when an organization already has consumer identities, certificates, plugins, and operational practices in those platforms.

The risk is assuming that the existence of a plugin means the capability is complete and included. A pattern-based prompt check is not a semantic guardrail. Exact and semantic caches have different correctness risks. A basic AI proxy and multi-model load balancing may belong to different plugins or license tiers. Evaluate the exact plugin, version, and license—not the product name on a slide.

Cloudflare represents a third path: a globally managed AI Gateway. It exchanges deployment control and customization depth for a very small operational surface.

## Capability comparison

The table describes each product's center of gravity. It does not imply that every cell is available in one edition or under one license.

| Gateway | Routing and resilience | Cache | Budgets and limits | Security | Observability | Deployment and license boundary |
|---|---|---|---|---|---|---|
| **LiteLLM** | Model aliases, several routing strategies, retries, and fallbacks across a broad provider adapter layer | Exact and semantic cache configurations with local or external backends such as Redis | Virtual keys; spend and limits by key, user, or team | Master and virtual keys, model access, and guardrail integrations; verify advanced RBAC and audit features by edition | Callbacks plus metrics and tracing integrations; detailed token and cost records | Core proxy is self-hostable; virtual key management requires PostgreSQL, and scaled deployments often add Redis; some governance features are Enterprise |
| **Kong** | AI Proxy performs provider translation; multi-target balancing, retry, and fallback are centered in AI Proxy Advanced | AI Semantic Cache uses embeddings and a vector store such as Redis/Valkey or pgvector | Combines Kong consumers, rate limits, usage, and cost data; depth depends on plugins and control plane | Mature API authentication ecosystem; semantic guards, PII handling, and other advanced AI controls require license checks | Model, token, latency, and optional message data can enter Kong logging and analytics | Best fit for an existing Kong platform; inspect the license notice on every AI plugin, because several advanced plugins require AI Gateway Enterprise |
| **Apache APISIX** | `ai-proxy-multi` supports weighted or priority routing, health checks, retries, and fallback criteria | No equivalent first-party semantic cache is documented alongside the core AI plugins; compose an external cache or extension if needed | `ai-rate-limiting` limits prompt, completion, or total tokens | `ai-prompt-guard` checks allow/deny patterns; it is not a complete semantic safety system | Access logs can include model, token usage, and time to first response while reusing APISIX logging plugins | Apache 2.0 and self-hosted; good for teams already fluent in APISIX/OpenResty and plugin operations |
| **Cloudflare** | Managed retries and fallback; Dynamic Routing uses conditions, quotas, and versioned routes | Caches **identical requests** for text and image responses; this is not semantic caching | Request-based rate limiting plus quota logic in Dynamic Routing; less of a departmental cost-control plane than dedicated products | Can compose with the wider Cloudflare security stack; application-level PII and prompt policy still need explicit design | Managed logs and analytics with plan-dependent retention limits | Fully managed, not self-hosted OSS; current core features are free, but future features may be paid |
| **Portkey** | Retries, fallback, load balancing, conditional routing, timeouts, and multimodal adapters | Simple and semantic cache features exist, but deployment and product-tier details must be verified | Usage analysis, keys, rate limits, and budget controls; organizational depth varies by plan | The OSS gateway has a guardrail framework; fine-grained RBAC, audit, central policies, compliance, and private deployment are primarily Enterprise concerns | Gateway context can enrich logs and traces; some OpenTelemetry export and full control-plane capabilities are Enterprise/self-hosted features | MIT-licensed gateway core can run locally; Hosted and Enterprise add a broader control plane, and private/hybrid deployment has separate requirements |

A single score would hide the constraints that make the decision real. For a regulated team, log residency can be a veto. For a three-person startup, a "free" self-hosted service that needs PostgreSQL, Redis, backups, upgrades, and multiple replicas can cost more than a managed gateway.

## Where each gateway fits

### LiteLLM: the short path to one model entry point

[LiteLLM's virtual key documentation](https://docs.litellm.ai/docs/proxy/virtual_keys) describes spend tracking by key, user, and team, along with model access and budget fields. It also states the operational boundary plainly: key management needs PostgreSQL. Its strength is not that every individual feature is uniquely best. It is that a team can collapse many provider APIs behind a familiar interface and then add routing, keys, budgets, and telemetry without first adopting a full API management platform.

LiteLLM is worth testing when:

- providers change often and stable model aliases would reduce migration work;
- the application uses OpenAI-compatible SDKs and a Python-heavy stack;
- the team wants to self-host the data plane and grow from simple proxying into usage governance.

Do not select it on a feature checklist alone when:

- nobody owns database backups, Redis, upgrades, or high availability;
- the organization needs a developer portal and complex management for many non-AI APIs;
- "supports provider X" is being interpreted as perfect compatibility with every new endpoint and parameter.

A compatibility layer normalizes common fields; it cannot erase provider semantics. Tool calls, structured outputs, images, audio, batches, and Responses-style APIs need contract tests for the versions actually used.

### Kong: an incremental choice for an existing API platform

[Kong AI Proxy](https://developer.konghq.com/plugins/ai-proxy/) translates supported provider requests and responses, proxies selected self-hosted models, authenticates upstream calls, and records usage information. Kong's practical advantage is that AI traffic can enter an existing system of consumers, certificates, routes, logging, and platform operations instead of creating a second island.

The license boundary deserves equal attention. [AI Proxy Advanced](https://developer.konghq.com/plugins/ai-proxy-advanced/) is the multi-target plugin for load-balancing algorithms, retries, and failover. [AI Semantic Cache](https://developer.konghq.com/plugins/ai-semantic-cache/) explicitly requires an AI Gateway Enterprise license and an embedding model plus a supported vector database. Semantic guards, PII sanitization, and other advanced plugins must also be checked individually.

Kong is a strong candidate when:

- Kong already runs reliably and a platform team owns its plugin lifecycle;
- AI and ordinary APIs should share identity, ingress, certificates, and policy;
- enterprise support and licensed AI capabilities are acceptable costs.

If the only requirement is to put two models behind one URL, adopting the whole platform is usually heavier than the problem.

### Apache APISIX: open control with a network-first mindset

APISIX's AI support goes beyond basic forwarding. [`ai-proxy-multi`](https://apisix.apache.org/docs/apisix/3.14/plugins/ai-proxy-multi/) documents load balancing, retries, fallbacks, health checks, and logging of inference fields. [`ai-rate-limiting`](https://apisix.apache.org/docs/apisix/3.14/plugins/ai-rate-limiting/) can enforce prompt-token, completion-token, or total-token limits.

Its security boundary is equally important. [`ai-prompt-guard`](https://apisix.apache.org/docs/apisix/3.14/plugins/ai-prompt-guard/) applies allow and deny patterns to input. That is useful for explicit rules and immediate blocking, but it does not prove semantic understanding and cannot, by itself, stop indirect prompt injection.

APISIX is a sensible fit when:

- the organization already operates APISIX, Nginx/OpenResty, or a related Kubernetes gateway stack;
- open licensing, network performance, and unified traffic policy matter more than an all-in-one AI console;
- the team can assemble separate caching, cost reporting, and content safety components where required.

### Cloudflare: minimal operations, limited deployment control

[Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) provides managed analytics, logging, caching, retries, fallback, and rate limiting. [Dynamic Routing](https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/) adds versioned routing flows with conditions, quotas, and fallbacks. For a product already built on Workers or Cloudflare's network, it may be the shortest path from direct provider calls to a governed entry point.

One widespread assumption needs correction. The [official caching documentation](https://developers.cloudflare.com/ai-gateway/features/caching/) says the cache currently serves identical requests and supports text and image responses. It is not semantic caching. Designing savings around semantic reuse would therefore create the wrong cost model.

Cloudflare is attractive when:

- the team is small and wants the provider to operate the gateway;
- Cloudflare's control plane, logging model, and retention limits are acceptable;
- basic analytics, exact caching, rate limiting, and resilience are the immediate needs.

Regulated data, private-network models, or strict regional log residency should trigger a legal and data-path review before adoption. Also treat [the current pricing statement](https://developers.cloudflare.com/ai-gateway/reference/pricing/) as current policy, not a permanent architectural guarantee: core features are free today, while future additions may use paid plans.

### Portkey: AI-native developer experience with a commercial control plane

The [Portkey open-source gateway](https://github.com/Portkey-AI/gateway) is MIT-licensed and supports local operation, retries, fallback, load balancing, conditional routing, and guardrail integrations. It is approachable from common application and agent frameworks.

The product boundary matters more than the headline feature count. Portkey's [Enterprise offering](https://portkey.ai/docs/product/enterprise-offering) places fine-grained access rules, audit logs, centralized guardrails, custom retention, compliance, and deeper organizational controls in the commercial tier. Its private and hybrid deployments introduce a distinct data-plane/control-plane architecture and infrastructure requirements. "The gateway is open source" does not mean the entire observability and governance platform is available as a self-contained OSS deployment.

Portkey deserves a proof of concept when:

- the team wants richer AI-native routing and guardrail composition than a bare proxy;
- integrated developer experience and model observability are important;
- the distinction between local gateway, hosted service, and Enterprise control plane can be made explicit in procurement and testing.

Before production, pin a stable release and make the acceptance criteria concrete: Can it run without the hosted control plane? Which logs leave the network? Which features continue during control-plane failure? Which license enables each policy?

## Caching is not free correctness

Exact caching hashes a request and reuses the result. Semantic caching uses embeddings and a similarity threshold to reuse answers for requests that appear to mean the same thing. The second approach can save more tokens, but it also converts a probabilistic similarity decision into application behavior.

These requests should rarely be reused across users:

- prompts containing identity, permissions, or private retrieval results;
- live prices, inventory, policies, incidents, or operational state;
- requests with tool calls, randomness, or session history;
- medical, legal, or financial answers that require traceable freshness.

A cache key should include every input that can change the correct answer: tenant, model and revision, system-prompt version, tool set, knowledge-base version, permissions, temperature, and other relevant generation settings. A semantic cache should also record the threshold, embedding model, source entry, and reason for a hit. It needs explicit bypass and deletion paths.

Saved tokens appear immediately on a dashboard. A confidently reused wrong answer often surfaces much later.

## Design routing and budgets in the right order

"Intelligent routing" is tempting because it makes a good demo. Production reliability usually grows in a less exciting sequence:

1. Introduce stable **model aliases** so business code does not depend on provider names.
2. Load-balance the same model across keys or regions before mixing model behavior.
3. Retry only known failure classes, with a total attempt and wall-clock budget.
4. Add cross-model fallback only after verifying tool calls, schemas, safety policy, and output quality remain acceptable.
5. Add cost-, latency-, or task-based dynamic routing last.

This order isolates one variable at a time. If a fallback silently changes structured output or tool semantics, its lower error rate may only move the failure downstream.

A budget dashboard is also not a budget system. Production cost control needs three layers:

- **Before the request:** model allowlists, RPM, TPM, concurrency, and maximum tokens per call.
- **During operation:** reject or degrade a key or team when a daily or monthly allowance is exhausted.
- **Afterward:** attribute usage by tenant, team, application, environment, model, and provider bill.

Provider prices change, and usage fields may be missing or delayed. Gateway cost is an estimate until it is reconciled against provider invoices. A hard stop at exactly 100 percent is rarely exact under concurrency; design for an overspend window.

## Production validation checklist

A selection meeting should end with reproducible failure experiments, not a successful demo.

### 1. Protocol and streaming

- Test every endpoint the application uses: Chat or Responses, embeddings, images, audio, batches, and tool calls.
- Measure time to first token, total latency, client cancellation, timeouts, and mid-stream disconnects.
- Compare gateway and direct-provider error codes, usage fields, finish reasons, headers, and structured outputs.
- Verify that the gateway does not buffer a stream that clients expect to receive incrementally.

### 2. Routing and failure

- Inject `429`, `5xx`, DNS failure, connection timeout, malformed responses, and interrupted streams.
- Record which errors retry, whether retries change region or model, and which layer owns them.
- Give the entire request a time budget so three fallbacks do not turn a ten-second SLA into a minute.
- Confirm that proxy retries cannot execute a non-idempotent tool twice.
- Test the behavior when the gateway's database, cache, or control plane is unavailable.

### 3. Cost and limits

- Give a test key very small budgets, RPM, TPM, concurrency, and model permissions.
- Send concurrent traffic across reset boundaries and measure the overshoot.
- Reconcile samples across gateway estimates, provider usage, and the final bill.
- Decide how failed streams, retries, cache hits, and fallback calls are charged and attributed.
- Verify that unknown or newly released models fail safely when pricing metadata is absent.

### 4. Cache correctness

- Prove that tenant, permissions, system prompt, tools, and knowledge-base version are isolated.
- Test invalidation after a model, policy, or document update.
- Verify `no-store` or bypass behavior for sensitive and time-dependent requests.
- For semantic cache, build adversarial pairs: similar questions with different correct answers.
- Confirm operators can locate, explain, and delete a cached response.

### 5. Security and privacy

- Keep provider credentials out of browsers, application logs, traces, and error bodies.
- Test prompt injection, PII, malicious files, oversized inputs, and encoded content.
- Document whether raw prompts and responses are logged, where, for how long, and who can read them.
- Verify RBAC, administrative audit logs, key rotation, TLS, and network egress for both data and control planes.
- Treat guardrails as layered detection and enforcement, not proof that unsafe output is impossible.

### 6. Observability and operations

- Capture request volume, errors, time to first token, total latency, tokens, estimated cost, cache hits, and fallback count.
- Propagate a trace from the business request through the gateway to the provider call without exposing sensitive content.
- Load-test gateway CPU, memory, connections, queues, database, and cache—not only provider latency.
- Rehearse upgrade, rollback, bad configuration, control-plane loss, and regional failure.
- Export enough data to investigate an incident without depending on a vendor dashboard being available.

## A practical selection order

Start with constraints, not brands:

- **AI product team of three to ten people:** test Cloudflare and LiteLLM first. Cloudflare minimizes operations; LiteLLM offers more provider freedom and self-hosted control.
- **Team that wants routing, guardrails, and AI-native developer tooling together:** evaluate Portkey, but freeze the OSS, Hosted, and Enterprise boundaries before the proof of concept.
- **Organization already running Kong:** validate an incremental Kong plugin design before introducing a second identity and telemetry system. Include AI licenses and vector-store operations in total cost.
- **Organization already running APISIX/OpenResty:** let APISIX provide common traffic policy, then add specialized semantic caching, cost control, or content safety only where the requirements justify them.
- **Regulated or large platform organization:** define residency, audit, SLA, RTO/RPO, support, and procurement constraints before looking at feature matrices. A provable boundary matters more than the longest checklist.

There is another valid answer: do not adopt a separate AI Gateway yet. One application, one provider, and small traffic may need only a thin SDK abstraction, secret management, limits, and basic telemetry. Infrastructure should absorb complexity that has appeared, not complexity imagined for a future scale.

## Conclusion

There is no universally best AI Gateway. There is only a control plane that matches a team's constraints.

LiteLLM is a practical route to a unified model interface and incremental budget governance. Kong is strongest when AI belongs inside an established API platform. APISIX suits teams that value open control and network engineering. Cloudflare offers a managed entry point with the least operational work. Portkey combines AI-native routing and guardrails with a broader commercial governance platform.

The durable choice is not a bet that one product will lead forever. It is a design that preserves the ability to leave: applications depend on stable aliases, provider-specific behavior has contract tests, policies are versioned, telemetry can be exported, and credentials are not trapped in a control plane.

A gateway is doing its best work when nobody mistakes it for magic. Models, providers, and organizations will change. The system should still be able to explain why each request was allowed, why it went where it did, and who catches it when the path fails.
