---
title: "The Super Individual's Intelligence System: Building a Personal Pipeline From Information to Action With Agents and MCP"
date: 2026-07-15T14:30:00+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ['super individual', 'intelligence system', 'AI Agent', 'MCP', 'information gathering', 'information acquisition', 'RSS', 'RSSHub', 'agentic search', 'information pipeline', 'knowledge management', 'second brain', 'observability', 'solo builder', 'signal-to-noise']
tags:
  - AI
  - LLM
  - Agent
  - MCP
  - Automation
  - Super Individual
  - Context Engineering
  - Monitoring
description: >
  How one person can build an AI intelligence system that actually keeps running. Starting from the essence of information acquisition, this essay takes apart the full chain — gathering, analysis, processing, knowledge, action — with first-principles thinking, covers frontier acquisition channels like RSS, RSSHub, change monitoring, and agentic search, explains why this machine is 98% not AI, and the observability that decides whether it can be operated long term.
tldr:
  - What a super individual should really build is not an account that auto-posts content, but an intelligence system. The difference between intelligence and information is that its endpoint is action, not information.
  - The essence of continuous acquisition isn't going out to find information; it's compiling "what I care about" into a set of standing queries so the world's changes come to you. Every acquisition channel reduces to three modes only, subscribe, poll, and pull.
  - In the AI era the bottleneck of acquisition shifted from "can I get it" to "the latency between the world changing and me knowing." An intelligence system is the machine that drives that latency and attention cost toward zero.
  - Along the chain, gathering, analysis, and processing can be safely handed to AI; but the knowledge and action layers you must press yourself — that one sentence of "why this matters" is a moat no one can copy.
  - This machine is 98% not AI. It's the unglamorous plumbing of source scheduling, dedup, storage, distribution, and observability. The full weight of the word "operable" sits in that 98%.
maturity: budding
cover:
  image: /images/covers/ai-agent/2026/super-individual-intelligence-system.jpeg
  alt: "The Super Individual's Intelligence System: Building a Personal Pipeline From Information to Action With Agents and MCP"
---

> "In the information age, information is worthless. What's valuable is the ability to process it."
>
> I quoted this once in the [column overview](../info-to-creation-the-framework/). This essay is my attempt to turn it into a machine that actually runs.

---

## A machine that ran for three years, and where it stalled

Lately I've been staring at a knowledge planet run entirely by AI, on autopilot.

Its one-line bio says it all: it gathers the freshest AI content worldwide in real time, then uses an agent to select, translate, summarize, and publish. Three hundred posts a day, covering X, GitHub, arXiv, every product launch. Every post comes from the same bot account, and adjacent posts are often just three minutes apart — a cadence no human hand will ever match. It's been running for over three years, and engagement has stayed high.

I'll admit the first impression was striking. Almost single-handedly, it proved one thing: **one person plus a set of agents can genuinely funnel an entire field's global information stream into a single pipe.** Five years ago that took a small editorial team.

But the longer I looked, the more clearly I saw its ceiling. It hauls information tirelessly, yet it stalls in an awkward place — **a more polished bookmark folder.** Three hundred items dumped in raw, translated and summarized, sure, but it never answers a single question that actually matters: of these three hundred, which three are worth acting on today? Which one signals an opportunity I should grab? It leaves "read all three hundred" — along with the denoising, the judgment, the decision — to the subscriber's eyes.

It's a hauling machine, not an intelligence system.

And I'm increasingly convinced that what the super individual of the AI era should build for themselves is not the former, but the latter.

## Intelligence and content aggregation are two different things

Let's get the words straight first, because they decide where this whole essay goes.

"Intelligence" has a precise original meaning. In the military and in business, intelligence was never a synonym for information — it is **information that has been gathered and assessed in service of some decision.** The acceptance test for a piece of intelligence isn't "is the information complete," it's "did it change the recipient's next move."

Follow that definition and the line between a personal intelligence system and a content aggregator turns razor-sharp:

- A content aggregator's endpoint is **information** — get more, faster, fuller information in front of you, and the job is done.
- An intelligence system's endpoint is **action** — if a piece doesn't change any decision or action of yours, then no matter how fresh or accurate, its value is zero.

This is also the extension of the framework in [From Information to Creation](../info-to-creation-the-framework/). That essay was about the four stations of cognition: information, records, knowledge, creation. This essay is about what you have to build, in engineering terms, when you turn those cognitive stations **into a machine that runs continuously.** One is philosophy, one is craft; this one fills in the craft.

## First, get clear on the essence of acquisition

Most people picture "acquiring information" as going out to find, search, scroll. That's a manual-labor picture of it, and it's why it's exhausting.

**Continuous acquisition, at its core, isn't "going to find information" — it's compiling "what I care about" into a set of standing queries, and then letting the world's changes come to you.** You do the translation work once — turn "I care about AI Infra open-source progress" into a dozen executable subscriptions and queries — and for the next three years the information flows to you. The difference: in the first mode you chase information every day; in the second, you lay the pipes once and information chases you.

Broken down to the base layer, humans have only three ways — and exactly three — to acquire external information:

```
① Subscribe / push   the world pushes to you       — RSS, webhooks, message streams
② Poll / diff        you check periodically if it changed — page monitoring, ranking snapshots
③ Pull / query       you go ask it a question       — search, agentic search
```

Any fancy "acquisition channel," taken apart, is one of these three or a combination. See this clearly and you stop being dazzled by tool names; you just ask directly: for this source, should I push, poll, or pull?

Go one layer deeper and you reach the part worth remembering. **Before AI, acquisition was about access — could you get information others couldn't.** You subscribed to sources others couldn't, read reports others hadn't, and that alone was an edge. Now a model will collect, translate, and search almost anything for you in a second, and the barrier of access has been cut to zero.

So the problem acquisition solves has quietly changed to two others:

- **Noticing latency**: from "something relevant to me happened in the world" to "I know about it," how long was the gap?
- **Attention cost**: to learn of it, how much attention did I spend that could have gone elsewhere?

The entire engineering of an intelligence system comes down to **driving these two numbers as low as possible**: let relevant things reach you with minimal latency, while keeping irrelevant noise out at minimal cost.

There's also an essence that's more engineering-flavored but extremely practical: **a large part of acquisition work is standardizing "unstructured, unaddressable sources" into "structured, addressable, machine-readable streams."** RSSHub, which comes up below, is a killer tool precisely because it turns Twitter, WeChat public accounts, and rankings — things that each looked different — all into the same kind of addressable feed. When every source looks the same, downstream dedup, scoring, and distribution can finally scale. Heterogeneity is the enemy of hand-work; normalization is the prerequisite for automation.

## A panorama of frontier acquisition channels

With the three-mode ruler in hand, the most current acquisition channels get clean. I'll order them by their essential mode:

**Native RSS / Atom (subscribe).** The easiest kind; many sites have a hidden feed. If you can subscribe, don't poll.

**RSSHub — turning "sources without a feed" into a feed (subscribe).** This is the most elegant replacement for the private crawlers behind that hauling machine. It offers ready-made routes for Twitter accounts, WeChat accounts, Zhihu, Bilibili, GitHub Trending, Product Hunt, and more — essentially **disguising a pull-only source as a pushable stream.** Self-host one instance and you've standardized "subscribe to everything" down to the single act of "subscribe to RSS."

**Structured APIs (subscribe / pull).** Sources with an official API are highest quality: GitHub Releases and Trending, arXiv's Atom endpoint, Hacker News, every product's changelog. If an API exists, don't scrape the page — stability is an order of magnitude better.

**Web change monitoring (poll).** For pages that have no feed, no API, but you just want to watch them change — a pricing page, release notes, some ranking. Tools like changedetection.io support CSS selectors and browser rendering, and wake your pipeline with a webhook on change. This is the standard landing spot for the "poll" mode.

**Active retrieval / live preview search (pull).** For plugging the gap of "you don't yet know what you should subscribe to." Periodically hand a search agent a set of questions and pull live results via Web Search, Exa, or Tavily; one notch stronger is letting a browser agent actually navigate pages carrying your login state — the way I read the internal posts of that hauling machine at the top was exactly this capability.

**Agentic / deep research — the channel grows judgment (the frontier of pull).** This is the evolution worth watching most. Traditional retrieval is "given a query, return results"; agentic search is "given a question, the agent decides what to search, what to read, and whether to search again." For the first time the acquisition channel has evolved from "executing a query" to "conducting an investigation" — the channel itself has judgment. That's both an opportunity and a warning: the further back you go, the blurrier the line between gathering and analysis.

**MCP — turning every source into a protocol.** Each source above can be wrapped as an MCP server so an agent calls them through one protocol, without caring whether it's RSS, an API, or search behind it. This is normalization at the "source" layer — what RSSHub did at the feed layer, done again at the protocol layer. On why MCP is the key lever for this generation of super individuals, I did the full accounting in [The Super Individual's Stack](/growth/posts/super-individual-ai-product-and-solo-builder-stack/).

One principle for the engineering: **high-frequency, stable sources should be scraped with deterministic code; only exploratory, fuzzy needs go to an agent for active querying.** Don't stuff all gathering into an agent — it's expensive, slow, and flaky. Spend the agent's judgment on the sharp edge, not on grunt work like polling.

## The full chain: five stations, each with its own first principle

Wire acquisition into the system and the whole chain is five stations, plus one observability thread running through all of them. It's isomorphic to the [information → records → knowledge → creation](../info-to-creation-the-framework/) cognitive framework, just seen from the angle of "a machine that runs continuously":

```
Gather ──▶ Analyze ──▶ Process ──▶ Knowledge ──▶ Action
(info)     (denoise)   (refine)    (distill)      (decide)
  │          │           │            │             │
  └──────────┴───────────┴────────────┴─────────────┘
                Observability (across the whole chain)
```

Let me take them one at a time. For each I ask only three questions: what's its essence? Can I outsource it to AI? How do I know it didn't break?

### 1. Gather: compile your attention into standing queries

The essence is settled above — compile "what I care about" into a set of subscriptions and queries. In engineering terms it should be **config-driven**: one direction is one config file, spelling out its sources, fetch frequency, processing rules, and distribution targets. Adding a new direction of attention equals adding a config file, not rewriting code. Only this way can your field of attention keep evolving instead of demanding a rewrite each time.

The most counterintuitive point in this layer: **what you subscribe to is what a future version of you will need.** So don't only subscribe to what's hot now; subscribe to directions that are "cold now, but you judge will accelerate" — that's where the excess returns of intelligence come from.

### 2. Analyze: signal-to-noise is the only KPI here

What comes in from gathering is a pile of raw items, mostly noise, and highly repetitive — for one event, twenty sources will report it twenty times from twenty angles. The entire task of this layer is to push the signal-to-noise ratio up.

The core technique is **three-tier dedup**, cheap to expensive:

```
① URL normalization   strip tracking params, expand short links   — kills exact duplicates
② Content fingerprint  SimHash / MinHash on body text              — kills reposts and light edits
③ Vector near-dup      embed title+summary, cosine similarity      — collapses many reports of one event into a single "event"
```

The third tier is the crux. It collapses "twenty reports" into "one event," so what you read downstream is **thirty things**, not **three hundred items.** That's exactly where the hauling machine is sick — it's missing this layer, dumps three hundred items on you as-is, and thereby hands the most exhausting job, denoising, back to your eyes.

The good news: the judgment here is highly deterministic and mechanical, so **you can safely outsource the whole layer to AI and algorithms**, dozens of times faster than by hand. It maps to the "information layer" of the cognitive framework — AI's home turf.

**How to observe it**: watch the "dedup hit rate." A sudden change in this ratio often means a source's structure changed or something failed.

### 3. Process: compress raw into "units you can judge"

Translate, summarize, tag, pre-score. The essence is a compression move: **turn something that takes two minutes of reading the original to judge, into a card you can judge in ten seconds.**

This is still AI's home turf, mapping to the "information-to-records" refinement in the cognitive framework. But always add a **quality check**: have another agent verify consistency between the summary and the source. Because AI summaries drift and hallucinate, and a drifting summary is more dangerous than no summary — it makes you **confidently decide based on a wrong judgment.** This is exactly where those pure-AI content accounts crash most often. Bounce or explicitly flag anything that fails the check; don't let it slip into the main stream.

**How to observe it**: watch the quality-check pass rate. When it drops, either source quality changed or the model needs tuning.

### 4. Knowledge: don't outsource this layer

Here the chain hits a watershed.

In the column overview I set myself a rule: **use AI as much as possible in the information layer; insist on passing the knowledge layer through your own hands first.** Inside an intelligence system, this rule becomes more concrete and more important.

What is "knowledge" in an intelligence system? It's distilling recurring signals into **your own judgment models**: which sources are truly reliable, which direction is accelerating, what pattern means an opportunity the moment it appears. The system can put candidates in front of you — a scored Top N each day; but the sentence "why this one matters" you must write yourself.

That sentence is the 1.6% hammered on in [The Super Individual's Stack](/growth/posts/super-individual-ai-product-and-solo-builder-stack/) — an agent system is 98.4% scaffolding and only 1.6% real decision logic. In an intelligence system, that 1.6% is the judgment you write in the knowledge layer. It's a moat no one can copy, because it lives on your cognition, not in your code. **The moment you outsource this layer too, you'll own an ever-smarter system and an ever-emptier self.**

The output of this layer should **flow back into your second brain**, becoming reusable knowledge cards rather than lying in the stream to be washed away by the next batch. On how to build a knowledge base AI can read and write directly, I wrote the full three-layer architecture in [Handing Your Notes Over to AI](../ai-second-brain-build/); the knowledge layer of an intelligence system should exit straight into that second brain. Gathering is the inlet, the second brain is the settling pond — they were always meant to be one river.

### 5. Action: intelligence ends in action, not information

This is the layer most easily skipped, and the only one that makes the whole system genuinely worth something.

Back to the opening definition: a piece of intelligence that changes no decision or action of yours has value zero — you just own a more polished bookmark folder. So the chain can't stop at "generated a pretty briefing"; it must connect to "doing":

```
High signal  ──▶  instant alert  ──▶  trigger an action
                                    (write one, reply to someone, open an issue,
                                     draft a first cut, book a conversation)
```

The essence is one word: **close the loop.** Wire "knowing" to "doing," and only then is the system alive.

Here you can use the "overnight agent" from [The Super Individual's Stack](/growth/posts/super-individual-ai-product-and-solo-builder-stack/) to automate part of the action too — so what you wake up to isn't three hundred items to read, but "three things worth doing today, plus a first draft already written for you." But remember the most counterintuitive and most important safety axiom in that essay: **truly irreversible actions must be HITL (human in the loop).** Compounding error is hard math — 95% accuracy over twenty steps leaves only a 36% success rate — so let the agent do reversible things like drafting, summarizing, reminding, while irreversible ones — sending, buying, deleting, where one wrong step loses the whole board — must have you press the final button. **Safety lives in the harness, not in the model's conscience.**

## This machine is 98% not AI

If you actually implement the five layers above, you'll find a perhaps counterintuitive fact: **LLM calls are a small slice; the bulk of the engineering is elsewhere.**

Source scheduling, incremental fetching, three-tier dedup, storage, the vector store, multi-channel distribution, retry on failure, cost budgeting, observability and alerting — this unglamorous plumbing, the kind no one likes on social media, is the body of the machine. This echoes that number from The Super Individual's Stack: 98.4% of Claude Code's codebase is operational infrastructure around the model, and only 1.6% is AI decision logic. **The model is a commodity; the harness is the craft.**

```
┌───────────────── Intelligence System Harness ─────────────────┐
│  Gather    multi-source intake · scheduling · incremental · normalize │
│  Analyze   three-tier dedup · event clustering · noise filter         │
│  Process   translate · summarize · tag · score · quality-check ──► LLM │
│  Store     relational + vector (near-dup and retrieval, one DB) ◄──    │
│  Distill   knowledge flows back → second brain                        │
│  Action    ranking · alerting · triggers · HITL gate                  │
│  Observe   source health · signal-to-noise · cost · hit rate          │
└───────────────────────────────────────────────────────────────────────┘
```

The full weight of the word "operable" presses on that 98%. Anyone can spin up a demo; running for three years straight, alerting when a source dies, degrading when cost overruns, letting you review when judgment was wrong — that's what "operable" means. And none of it can be bought with a line of prompt.

## Observability: how you know it didn't break, and isn't lying to you

Observability deserves its own section, because it's the dividing line between an intelligence system and a toy, and it's the most easily neglected layer. I watch four dimensions:

**1. Source health.** Each source's success rate, empty-pull count, consecutive failures. This is the most dangerous class of failure — **silent failure.** An RSSHub route quietly dies, an API starts rate-limiting, and your world suddenly goes "very quiet," while you assume there's genuinely no news. **Silence doesn't mean all is well.** An intelligence system that doesn't monitor source health will, at some critical moment, make you miss something because you "didn't receive it."

**2. Signal-to-noise and dedup hit rate.** What you finally read — is it "events" or "duplicates"? A drift in this ratio says the source structure or the algorithm needs tuning.

**3. Cost.** Tokens per day, cost per item, split by direction. Set a hard budget cap and degrade on overrun — process only high-priority sources. Don't let one source anomaly blow up your bill.

**4. Judgment hit rate (the most essential, most easily missed).** The first three are system-layer observations; this one is a cognition-layer observation: **the ones you flagged "high signal" — did they really matter later? The ones you struck out — did they come back to bite you?** An intelligence system that doesn't record its own judgment hit rate will never get sharper, because it has no feedback. Build this and observability stops being staring at a dashboard, and becomes **making your judgment itself iterable** — which is exactly what the column overview meant: AI is here to help you find the edges of your own thinking. The system quantifies those edges so you know where to fix.

## The minimum operable version: don't try to run the whole chain in one day

Don't let all this intimidate you. It isn't built in one shot, and the worst mistake is greedily standing up all seven layers at once.

The path I recommend follows the same "validate layer by layer" I keep hammering in [Handing Your Notes Over to AI](../ai-second-brain-build/):

- **Step one, one minimal loop.** A single direction, three sources (one RSS, one GitHub release, one RSSHub Twitter account) → dedup → summarize → one briefing a day, sent somewhere you glance at anyway. First prove the three things: it's continuous, it's not repetitive, it's worth reading.
- **Step two, add the knowledge and action layers.** Turn on scoring and signal detection, give yourself a Top N of candidates each day, spend fifteen minutes picking three and writing a line on each; instant alerts for high signal.
- **Step three, add observability and knowledge flow-back.** Stand up the dashboards for source health, cost, and judgment hit rate; wire the knowledge layer's output into your second brain.

Get each layer running and confirmed on its own before wiring the next. Stack all seven at once and you can't localize which layer broke, and you end up with that honest retrospective — "stuck for an entire day." A system grows out of repeated real use; it isn't built ahead of time. **Drive the first nail first.**

## Closing: how much information one person can gather doesn't matter

Back to that hauling machine at the top.

It pushed "how many sources one person can wire in, how many posts a day" to a near extreme — three hundred a day, three years unbroken. And it's still just a hauling machine. That fact made me think for a long time, and I finally landed on this:

**The real practice of an intelligence system was never in the front half of the chain.** Gathering, dedup, summarizing — machines can do these to an extreme, and will only do them better. What's truly scarce, and where all the value of this system sits, is the two things at the tail end that machines can't do for you: **writing, in the knowledge layer, the judgment of "why it matters," and pressing, in the action layer, the decision of "do this one."**

This is also the echo, on the subject of intelligence, of that closing line in The Super Individual's Stack — the "super" in super individual isn't that one person can know more (the hauling machine knows more than you or me), it's that the leverage one person commands has grown longer. Longer leverage means: **the things you can do differently because you know, have also grown tenfold.**

So don't chase a system that knows the most. Build a system that **makes you do differently because you know.**

Information is worthless; what's valuable is the ability to process it. And the endpoint of processing information isn't one more pretty briefing — it's action.

---

*Further reading: the cognitive framework behind this system is in the column overview [Information, Records, Knowledge, Creation](../info-to-creation-the-framework/); how the knowledge layer lands as a second brain AI can operate is in [Handing Your Notes Over to AI](../ai-second-brain-build/); the accounting on MCP, Skills, overnight agents, and that 98.4% of engineering is in [The Super Individual's Stack](/growth/posts/super-individual-ai-product-and-solo-builder-stack/).*
