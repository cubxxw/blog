---
title: 'Build a Personal Intelligence System That Leads to Action'
date: 2026-07-15T14:30:00+08:00
lastmod: 2026-07-31T23:30:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - MCP
  - Automation
  - Super Individual
  - Context Engineering
  - Monitoring
categories:
  - Development
description: >
  Build a personal intelligence system that turns monitored sources into decisions, with honest boundaries for RSS, RSSHub, agents, MCP, safety, and evaluation.
tldr:
  - A personal intelligence system is not a larger inbox. It is a monitored path from relevant change to a decision, with evidence preserved along the way.
  - Subscribe, poll, and query are useful operating modes, not a law of nature. RSS is normally fetched by a reader; push requires a mechanism such as WebSub or a webhook.
  - Use deterministic collectors for known sources and agents for bounded investigation. MCP standardizes an interface, but it does not guarantee source quality, authorization, or safe behavior.
  - Deduplication, summarization, and scoring all make consequential errors. Measure false merges, unsupported summaries, missed signals, latency, cost, and source health.
  - Keep irreversible actions behind explicit approval. The durable advantage is not how much the system reads, but how clearly you can explain why a signal should change your next move.
maturity: budding
cover:
  image: /images/covers/ai-agent/2026/super-individual-intelligence-system.jpeg
  alt: 'A personal intelligence pipeline connecting monitored sources to evidence, judgment, and action'
---

## The quiet dashboard can be the dangerous one

A morning briefing with no new items may mean that nothing relevant happened. It may also mean an RSS route broke, an API began returning empty pages, or a credential expired during the night. From the reader's side, those very different states look identical: silence.

That is the first lesson of a personal intelligence system. Gathering more information is easy to demonstrate; knowing whether the machine is healthy, whether its summaries are faithful, and whether a signal deserves action is the real work. The system I want is not an account that publishes automatically. It is a pipeline that can show me what changed, why it may matter, what evidence supports the claim, and which decision—if any—should follow.

This essay turns the cognitive path from [information to creation](../info-to-creation-the-framework/) into an operable loop. It is an engineering model, not a claim that every source or decision can be reduced to one perfect architecture.

---

## Information becomes intelligence only in context

An aggregator and an intelligence system can ingest the same sources and produce very different outcomes.

- An **aggregator** optimizes delivery: more items, fresher items, fewer sites to visit.
- An **intelligence system** supports a decision: it preserves provenance, reduces avoidable noise, exposes uncertainty, and routes a useful signal toward a person or a bounded workflow.

This does not mean that every collected item must trigger an action. “No action yet” can be a valid decision. The practical test is whether the system gives me enough evidence to change, confirm, or deliberately keep my next move.

That distinction prevents a common failure. Translation, summarization, and automatic publishing can make a stream look finished while leaving judgment entirely to the reader. The interface is polished; the attention cost has merely moved downstream.

## Model acquisition as subscribe, poll, and query

I use three modes to design acquisition:

| Mode | What happens | Good fit | Typical failure |
|---|---|---|---|
| Subscribe | A source exposes a stable feed or event contract that a consumer follows | RSS/Atom feeds, release feeds, event subscriptions | feed disappears or stops updating |
| Poll | A collector checks a known resource and compares state | pricing pages, changelogs, status pages | layout change looks like a content change |
| Query | A person or agent asks an explicit question | discovery, comparison, investigation | incomplete search or unsupported synthesis |

These are an operating model, not “the only three ways humans acquire information.” They overlap. A feed reader normally **polls** an RSS URL even though the user experiences it as a subscription. A source can deliver timely push notifications only when another mechanism exists, such as [WebSub](https://www.w3.org/TR/websub/) or a webhook. An agentic query may itself call several polled APIs.

The model is still useful because it forces a concrete question: does this source have a stable contract, must I detect changes myself, or am I investigating an open question?

### Compile interests into versioned source definitions

“I care about AI infrastructure” is not executable. A source definition is:

```yaml
id: github-model-context-protocol-releases
mode: poll
source: https://api.github.com/repos/modelcontextprotocol/servers/releases
interval: 6h
owner: ai-infra
expected_max_silence: 30d
priority: high
```

The exact schema is less important than making the assumptions visible. I want to know who owns the source, how often it should be checked, what “too quiet” means, and how urgently a failure should be handled. Configuration belongs in version control; secrets do not.

## Choose source adapters by contract, not fashion

### Native RSS and Atom

If a publisher maintains a feed, use it before scraping the rendered page. Feeds provide stable identifiers, timestamps, and canonical links often enough to simplify downstream work. They are not magically reliable: entries can be edited, GUIDs can change, and some feeds contain only excerpts.

Track the last successful fetch, HTTP status, item count, newest item timestamp, and repeated GUID rate. A successful `200` response with zero fresh entries for months may still be a failed source.

### RSSHub

[RSSHub](https://docs.rsshub.app/) provides community-maintained routes that turn many sites into RSS-compatible feeds. That is valuable normalization, but it does not turn a pull-only source into a true push stream. The reader or collector still fetches a route unless another delivery mechanism is added.

Routes are adapters over upstream sites. They can break when HTML, authentication, anti-bot controls, or upstream APIs change. Some routes require cookies, tokens, browser rendering, or a self-hosted instance. For each production route, record:

- the route documentation and required parameters;
- whether credentials are involved;
- the expected update cadence;
- a fallback source or an acceptable outage policy;
- a small fixture or health check that detects structural drift.

“Subscribe to everything” is a seductive slogan. “Know which adapters I can operate” is a safer design principle.

### Official APIs and webhooks

An official API usually has a clearer contract than scraping, but “official” does not mean permanent or free of limits. Version changes, pagination, rate limits, permissions, and retention windows remain part of the design.

For example, GitHub documents a [REST endpoint for repository releases](https://docs.github.com/en/rest/releases/releases). It does not document a corresponding REST endpoint for the GitHub Trending page, so I should not call Trending an official API source. If I need that page, I treat it as a monitored webpage or use a third-party dataset with an explicit maintenance risk.

The same boundary applies to product changelogs: some expose feeds or APIs; others are pages. Verify the contract source by source.

### Web change detection

Polling is appropriate when I care about a known page but no suitable feed or API exists. A change monitor can fetch the page, isolate a selector, normalize irrelevant markup, and emit an event when the meaningful region changes.

The hard part is not taking a diff. It is preventing cookie banners, rotating timestamps, personalization, and A/B tests from becoming “signals.” Store the selector, a representative fixture, and the last accepted snapshot. When a page needs a logged-in browser, treat the session as a credential and minimize its permissions.

### Search and agentic investigation

Queries fill the gap between known sources and unknown questions. A conventional search retrieves candidates. An agent can plan several searches, open sources, compare claims, and decide that more evidence is needed.

That is useful procedural capability; it is not reliable “judgment” by itself. A research run should retain:

- the original question and scope;
- queries issued and pages inspected;
- quoted evidence or source spans;
- publication and retrieval dates;
- unresolved contradictions;
- the model and tool versions when reproducibility matters.

Without that trace, a polished answer is difficult to audit and easy to overtrust.

## MCP standardizes an interface, not the truth behind it

The [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) lets compatible clients connect to servers that expose resources, prompts, and tools. In this pipeline, an MCP server can wrap search, a database, a feed registry, or an internal workflow behind a common discovery and invocation model.

That can reduce integration work, but MCP does not make every source interchangeable:

- the server still implements upstream authentication, pagination, retries, and schemas;
- the client decides which protocol features and authorization flows it supports;
- tool descriptions can be incomplete or misleading;
- retrieved data can be stale, malicious, or simply wrong;
- a model can choose the wrong tool or arguments;
- a broadly scoped token turns one tool error into a larger incident.

Follow the protocol's current [security guidance](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices): use least-privilege credentials, validate redirect targets and tokens, keep trust boundaries explicit, and require consent for consequential access.

I use MCP where several compatible clients need the same capability. I do not wrap a stable cron job in MCP merely to make the architecture look agentic.

## The pipeline: gather, analyze, process, judge, act

The five stages are a map of responsibilities:

```text
Gather ──▶ Analyze ──▶ Process ──▶ Judge ──▶ Act
   │          │           │          │         │
   └──────────┴───────────┴──────────┴─────────┘
            provenance, metrics, review, replay
```

### Gather: preserve provenance

Collectors should be deterministic wherever the source contract is known. Store the source ID, canonical URL, fetch time, publisher timestamp, content hash, and raw or replayable representation allowed by policy. If later stages cannot point back to what they processed, debugging becomes guesswork.

Useful metrics:

- fetch success rate and latency by source;
- consecutive failures and time since last new item;
- rate-limit responses and authentication failures;
- items received per fetch and parse-error rate.

### Analyze: deduplicate without erasing disagreement

Deduplication is not a harmless cleanup step. A false merge can hide an independent confirmation or collapse two releases with similar names.

I apply progressively more expensive checks:

1. normalize URLs and remove known tracking parameters;
2. compare stable IDs and content hashes;
3. use text fingerprints for reposts or small edits;
4. cluster semantically similar reports as a candidate event, while retaining every source.

Vector similarity is not proof that two items describe the same event. Evaluate thresholds on a labeled sample and report both:

- **merge precision**: among merged pairs, how many truly belong together?
- **merge recall**: among true duplicates, how many did the system catch?

The cost of a false merge and a missed duplicate differs by domain. Security advisories deserve more conservative merging than casual product news.

### Process: compress with citations

Translation, tagging, and summarization turn raw material into something I can inspect quickly. The output should never sever itself from the source. Each material factual sentence needs a supporting span or link, and uncertainty should survive compression.

Having a second model check the first model can catch some errors, but it is not ground truth. A better gate combines:

- required citations to retrieved source spans;
- deterministic checks for dates, names, versions, and URLs;
- contradiction or missing-evidence flags;
- sampled human review;
- automatic escalation when confidence or source quality is low.

Track unsupported-claim rate on the reviewed sample, citation coverage, correction rate, processing latency, and cost per accepted item.

### Judge: write down why a signal matters

The system can rank candidates, but a score is not yet a decision. For the top items, I write one short judgment:

> This matters to my current work because ___; the evidence is ___; I will reconsider if ___.

That sentence is where a general stream meets my context. It can be assisted, but I should be able to defend it. This is the practical connection to [Handing Your Notes Over to AI](../ai-second-brain-build/): durable judgments flow into the second brain with evidence and review dates, not as decontextualized summaries.

Measure judgment quality after a defined horizon. Of the items marked high signal, how many changed a project, conversation, experiment, or explicit decision? Also sample discarded items to estimate missed-signal rate. A system that never reviews its false negatives trains itself to admire its own filter.

### Act: automate only inside a clear risk envelope

Action closes the loop, but not every action deserves automation.

| Action | Default policy |
|---|---|
| draft a note, issue, or reply | automatic, clearly labeled as draft |
| create a reversible local task | automatic with audit log |
| notify a private channel | allowed within rate and privacy limits |
| publish, message externally, purchase, delete, or change access | explicit human approval |

A previous version used `0.95^20 ≈ 0.36` to dramatize compound error. The arithmetic is correct only for a toy model with twenty independent steps and the same success probability. Real workflows have correlated failures, different step risks, retries, and validation gates. The operational lesson does not need the toy number: identify consequential transitions and put approval, idempotency, rollback, and audit logs around them.

Safety belongs in the harness, not in a hope that the model will notice every boundary.

## Most of the durable work is outside the model call

It is tempting to assign a precise percentage to “AI” and “infrastructure.” I cannot support the old 98.4% / 1.6% split with a reproducible primary source, and Claude Code's public repository does not establish such a decomposition of its product codebase. The number should not carry the argument.

The inspectable claim is enough: a long-running system needs scheduling, state, retries, rate-limit handling, identity, storage, provenance, evaluation, budgets, alerts, and recovery. A model call can improve a stage; it does not remove those responsibilities.

The model is replaceable more often than the accumulated operating knowledge: which source fails quietly, which threshold merges unrelated stories, which summary pattern drops caveats, and which alert I actually act on. That knowledge is the craft.

## Observability: detect when the system is quiet for the wrong reason

I keep one small dashboard with four views.

### Source health

- success rate, parse-error rate, and consecutive failures;
- time since last successful fetch and last new item;
- expected versus observed item volume;
- expiring credentials and rate-limit headroom.

Alerts need an owner and a runbook. Otherwise the dashboard merely documents decay.

### Information quality

- duplicate rate before and after clustering;
- merge precision and recall on a reviewed sample;
- unsupported-claim and correction rates;
- percentage of high-priority items with primary-source evidence.

### Operations

- end-to-end latency from publisher timestamp to accepted card;
- cost per fetched, processed, and accepted item;
- queue age, retry volume, and dead-letter count;
- percentage of runs that can be replayed from stored provenance.

### Decision value

- high-signal items that led to a recorded decision or experiment;
- time spent reviewing the daily shortlist;
- sampled missed-signal rate;
- alerts dismissed, acted on, or muted.

These metrics are not universal targets. Establish a baseline, choose thresholds from the consequences of failure, and review them on a fixed cadence.

## A minimum operable version

Start with one topic and three sources:

1. one maintained RSS or Atom feed;
2. one documented API such as GitHub Releases;
3. one monitored page or carefully chosen RSSHub route.

Run the loop for two weeks:

```text
collect → normalize → preserve source → deduplicate
        → cited summary → daily shortlist → one human judgment
```

Before adding an agent, define acceptance criteria:

- every card links to its source and retrieval time;
- source failures become visible within the chosen detection window;
- reviewed summaries contain no unsupported material claims;
- duplicate clusters meet the chosen precision threshold;
- daily review fits the attention budget;
- no external or irreversible action occurs without approval;
- cost and latency are recorded, not guessed.

At the end of the trial, inspect failures before adding more sources. Scale the part that earned trust. Replace the part that only looked impressive.

## Closing: build for a different next move

A person can now connect more feeds, APIs, searches, and tools than they can possibly read. That is a capability, not yet an advantage.

The advantage appears later in the chain: when evidence survives compression, when silence can be distinguished from failure, when a recurring signal becomes a judgment you can explain, and when that judgment changes a next move without crossing a safety boundary.

Do not build the system that knows the most. Build the one that helps you notice what matters, shows you why it believes so, and leaves you responsible for the consequential decision.

---

Further reading:

- [Information, Records, Knowledge, Creation](../info-to-creation-the-framework/) for the cognitive framework behind the pipeline;
- [Handing Your Notes Over to AI](../ai-second-brain-build/) for the knowledge layer;
- [The Super Individual's Stack](/growth/posts/super-individual-ai-product-and-solo-builder-stack/) for agents, MCP, and operable solo systems.
