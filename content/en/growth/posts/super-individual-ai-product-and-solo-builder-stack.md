---
title: 'The Super-Individual Stack: AI-Native Product Directions and Solo Builder Ops in 2026'
date: 2026-06-24T14:55:00+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords:
  - super individual
  - solo builder
  - indie hacker
  - AI-native
  - harness engineering
  - agent
  - solo founder
  - service as software
  - product strategy
  - MCP
tags:
  - Super Individual
  - Solo Builder
  - AI
  - Agent
  - Harness Engineering
  - MCP
  - Product Strategy
  - Personal Growth
cover:
  image: /images/posts/2026/super-individual/cover.jpg
  alt: "The Super-Individual Stack: AI-Native Product Directions and Solo Builder Ops in 2026"
description: >
  As the model layer commoditizes and 40% of enterprise AI projects are headed for cancellation, the super-individual finally has the full primitive set to cut into a $4.6T services market. This essay assembles the most current 2025-2026 methodologies into one executable map: the core thesis, six product directions, five ops stacks, the Soul Core + Harness Engineering foundations, and a 12-month roadmap.
tldr:
  - "The super-individual's real moat is not the model—it's the harness, the schema, and distribution. The Claude Code codebase is 98.4% scaffolding and only 1.6% AI decision logic."
  - "A structural window is open: solo founders are now 36.3% of new startups, and the median top-100 Stripe AI company hit $1M ARR in 11.5 months—four months faster than the fastest-growing SaaS."
  - "The real 2026 leverage stack is MCP + Agent Skills + x402: for the first time, an individual can build headless SaaS sold to agents, not humans."
  - "Failure modes have hard math. Lusser's Law: 95% × 20 steps = 36% success rate. HITL isn't UX—it's survival."
maturity: budding
---

> "Software is eating the world." — Marc Andreessen, 2011
>
> "Now AI is eating software—and the question for the rest of us is: what's left for one human, alone, in front of a screen?" — me, asking myself one night in 2026.

---

## Prologue: How Big Does One Person Need to Be?

In February 2026, I ran my first complete overnight agent.

I set a prompt, dropped it into Claude Code in a loop, and went to sleep. At 7 a.m. the next morning, what I saw on the screen was: 6 commits, 4 PRs, 3 auto-rolled-back failures, and a research brief I hadn't even read myself.

What shocked me wasn't how much it had done. It was that **I wasn't present while it did any of it**.

That's when I realized that the "super-individual" isn't a slogan, and it isn't the cliché of "one person doing the work of three." It's a **structure that's actually forming**—when the model layer commoditizes, when harness engineering gives a single person the ability to orchestrate a dozen parallel agents, when Stripe / Carta / MIT NANDA all show with hard data that **this is really happening**—the leverage one person can swing is being amplified in a way no prior generation had access to.

This essay isn't a pep talk. I've taken everything I've absorbed in the past six months—Stripe's Indexing the AI Economy, Carta's 2025 Solo Founder Report, MIT NANDA's GenAI Divide, Foundation Capital's Service-as-Software paper, Geoffrey Huntley's Ralph Loop, VILA-Lab's Claude Code teardown, Sarah Tavel's "sell work, not software"—and assembled them into one executable map.

It tries to answer four questions:

1. **What's actually happening?** (Data foundation and paradigm shift)
2. **What product should a super-individual build?** (Six directions, ranked by fit)
3. **How does one person hold up an entire ops chain?** (Five ops stacks + self-hosted options)
4. **What does it take to engineer that 98.4%?** (Soul Core, Harness, Overnight Agent)

It closes with a 12-month roadmap.

---

## I. The Paradigm Shift: Correcting Three Widely Misquoted Numbers

The fastest way to wreck an article about the "super-individual" is to mis-cite the numbers. Let me put three frequently mangled statistics back where they belong.

### "$1M ARR in 11.5 months" is Stripe's data, not Carta's

Stripe's *Indexing the AI Economy* (2025) states it plainly: **The top 100 AI companies on Stripe achieved annualized revenues of $1 million in a median period of just 11.5 months—about four months ahead of the fastest-growing SaaS companies.**

A second statistic from the same report cuts even deeper: **20% of new companies acquire their first paying customer within 30 days of incorporation—double the 2020 rate.**

Bolt to $20M ARR in two months. Cursor to $100M+ ARR in three years. ElevenLabs to a $3B valuation in 2.5 years. All in that report.

> Why does this matter for the super-individual? Because it's the first time the speed advantage has been **stamped with a median of 100 companies**, not just an outlier anecdote: **speed is no longer the exception, it's the distribution**.

### Carta's real finding: solo founders are now 36.3%

The core number from Carta's 2025 Solo Founder Report, disclosed by Peter Walker, is this: **the share of new U.S. startups with a single founder rose from 23.7% in 2019 to 36.3% in H1 2025**; the median solo founder's first hire arrives at day 399, vs. day 480 for team-founded companies.

Walker's words: "A 13-point rise in about five years is a big shift."

> Solo founders aren't a minority narrative anymore. They're approaching the mainstream at 40%.

### MIT NANDA's real insight: what the 5% did right

"95% of enterprise GenAI pilots produced no measurable P&L impact" became the viral headline, but the **real insight** of MIT NANDA's *The GenAI Divide: State of AI in Business 2025* (August 2025, lead author Aditya Challapally) is the four things the 5% who succeeded did right:

1. **Buy, don't build**: 67% of externally purchased projects succeed, vs. 33% built internally.
2. **Ruthless focus on a single pain point** instead of spreading 12 pilots thin.
3. **Back-office automation beats front-of-house demos**: over 50% of budgets were misallocated to sales/marketing demos.
4. **Use adaptive tools that learn workflows**, not generic demo-ware.

Challapally puts it bluntly: "The barrier is absence of learning and memory in deployed systems."

> Those four traits are a portrait of the super-individual's **natural advantage**. The things big organizations are structurally bad at are exactly the moat the individual gets to keep.

### Service-as-Software: a $4.6T new unit

The "Service-as-Software" paradigm wasn't coined by Sequoia or a16z—it was **named by Joanne Chen and Jaya Gupta at Foundation Capital in 2024**, sized at a **$4.6 trillion market** ($2.3T global wages + $2.3T outsourced services).

Their words: "In the software business, a company may sell access to its platform... In the services business, responsibility for achieving the desired outcome sits with the company selling the service."

The pricing unit shift is what matters: **from per-seat to per-outcome**. This is the reason a solo builder can finally cut into enterprise markets without a sales team—you're not selling tools anymore, you're selling results.

Sarah Tavel (Benchmark) condenses the whole thesis: **"Sell work, not software."** Combine that with Intercom Fin's $0.99-per-resolution pricing and the line is complete.

---

## II. The Super-Individual's Real Moat: That 98.4%

In 2026, a number emerged from academia that forced every AI engineer to reread their own codebase.

**MBZUAI's VILA-Lab, in the paper *Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems* (arXiv:2604.14228), reverse-engineered the Claude Code codebase** and found: of roughly 512K lines of code, **only about 1.6% is "AI decision logic." The remaining 98.4% is operational infrastructure around the model**—context management, tool routing, error recovery, state persistence, permission resolution, budget tracking, compaction engines, observability.

Claude Code's own lead, Boris Cherny, echoed the same point on the Latent Space podcast in one sentence: **"The harness is the thinnest possible wrapper over the model. We literally could not build anything more minimal."**

Cobus Greyling distilled it: **"98% of Claude Code is not AI."**

Tattoo that number. It tells you two things:

1. **The engineering load of a production-grade agent is almost entirely in the harness, not in the prompt or the model call.**
2. **The model is a commodity; the harness is a craft.** When everyone has access to the same GPT-5 / Claude Sonnet 4.6, the moat moves to that 98.4% of scaffolding.

This is the engineering ground the super-individual actually stands on. The moment the model layer becomes commoditized, **the layer that records "who you are, what you want, how you decide" becomes the new moat**. That's what lets a solo migrate across tools without being locked into any single platform.

---

## III. Six Product Directions, Ranked by Fit

Each direction is scored on fit to the indie developer (technical / audience / engineering load) and near-term monetizability.

### Direction 1: A Portable "Soul Core" Personal Context Layer ★ Best Fit

**Job to be done**: Own a structured record of "who I am, what I believe, what I'm aiming at, what my voice sounds like," and inject it via MCP into every AI tool I touch—so ChatGPT, Claude, Cursor, and Gemini all act like they know me.

**Why now**:
- OpenAI's and Anthropic's memory are **deliberately non-portable** (locked to their own ecosystems).
- MCP provides a standard delivery rail that did not exist 18 months ago.
- Portable / user-owned context is a named emerging category: Plurality Network's Open Context Layer, Nate B. Jones's OpenBrain (Supabase + pgvector + Ollama, $0.10–0.30/month, 45-minute setup), Pickle (YC).

**MVP scope (3–4 months)**: A local-first vault holding the schema (Identity Atoms, Belief Map, Goal Graph, Style DNA, Context State, Feedback Memory) + one MCP server exposing `get_context` / `search_context` / `update_context`. Build a polished frontend editor. Start BYO-API-key. Publish the schema as an open specification.

**Moat**: Not storage infrastructure (that's Mem0 / Letta territory), but **the self-modeling schema + product experience + local-first ownership**.

**Monetization**: $12–19/month prosumer subscription. Target ~500 paying users in 6–9 months ≈ $6K–10K MRR.

### Direction 2: A Voice-Native Personal-Brand Content Engine ★ Best Fit

**Job to be done**: Turn my existing knowledge (Obsidian vault, past posts, voice notes) into a steady, platform-native stream of content that **actually sounds like me**.

**Why now** (this is the most validated willingness-to-pay):
- **Tibo Louis-Lucas sold Tweet Hunter + Taplio for $8M in 2024** ($2M upfront + up to $6M earnout). Pre-sale peak: Tweet Hunter at $300K MRR + Taplio at $600K MRR ≈ **$10.8M ARR run-rate**.
- Tony Dinh's TypingMind hit **$130–160K/month in October 2025**, with 20K+ customers and **B2B Team tier accounting for more than half of MRR**.
- Human LinkedIn ghostwriters charge $2K–5K/month. AI tools cut roughly 95% of that price.

**Differentiation**: Versus Taplio / Typefully's generic "AI fluff," your edge is **deep voice modeling from the user's own corpus**. Bilingual (Chinese / English) is a real advantage in Xiaohongshu / WeChat markets where Western tools are weak.

**Key lesson**: Voice isn't the endgame; the **B2B upgrade path is**. TypingMind's Team tier overtook its individual subscriptions, showing that wrappers die when they fail to climb the contract-price ladder.

**Monetization**: $29–49/month prosumer; $99+/month for agencies / multi-account. $5K–15K MRR within 6–12 months is realistic.

### Direction 3: A Productized "Overnight Autonomous Agent" for a Vertical ★ Strong Fit

**Job to be done**: Hand me a **finished deliverable** every morning. I don't want to watch an agent dashboard.

**Why now**:
- **Ralph Loop** (named by Geoffrey Huntley in July 2025, after Ralph Wiggum from The Simpsons): the skeleton is one line of bash—`while :; do cat PROMPT.md | claude ; done`. Philosophy: "Let Claude fail repeatedly until it succeeds."
- The economics are visceral: **YC hackathon teams shipped 6+ repos overnight for $297 in API costs**.
- Autonomous task duration has stretched dramatically; Claude Opus 4.6 reportedly runs ~14.5 hours unsupervised at a 50% completion rate.

**Productization**: Don't sell "an agent"—sell the **morning deliverable**. Pick one vertical artifact (e.g., "daily competitive / market brief for indie founders" or "overnight research dossier"). Run an overnight loop + multi-agent orchestration + provider-agnostic fallback. Deliver by email / Notion / messaging.

**Key insight**: The shift from "Software-as-a-Service" to "Result-as-Software" is most concrete here—buyers want **the delivered outcome**, not an agent dashboard.

**Monetization**: Hybrid outcome + subscription. $29–99/month individual; add a $199+/month "team brief" tier.

### Direction 4: A Memory / Self-Evolution Layer for Coding Agents ◑ Medium-Strong Fit

**Job to be done**: Make my Claude Code / Cursor / Codex remember decisions, stop repeating rejected approaches, and accumulate reusable skills.

**The honest monetization reality**: Coding accounts for ~51% of enterprise GenAI usage; Claude Code's run-rate revenue has crossed $2.5B (per Anthropic's Series G announcement on February 12, 2026). But be honest: **standalone MCP / Skills monetization is thin**—most MCP servers earn roughly zero. Paid tiers sit at $19–149/month and skew B2B.

**Correct play**: Use it as an **open-source distribution engine + audience builder**, not a primary revenue line. Add a $10–20/month Pro tier for nominal revenue.

### Direction 5: AI Self-Modeling Consumer App ◑ Medium Fit

The companionship / self-modeling category is projected to break $120M in 2025; Rosebud raised $6M from Bessemer; Replika reports 25% free-to-paid conversion with 7+ month retention.

**Risk**: Marketing-intensive, retention-driven; rising regulatory scrutiny (California SB 243; Italy previously restricted Replika). **Moat = schema depth + data ownership**. Natural pairing with Direction 1 (shared Soul Core schema).

### Direction 6: A Bilingual "Second-Brain Conversation + Publishing" Tool for Xiaohongshu / WeChat Creators ◑ Medium Fit

Xiaohongshu is actively courting 50K+ independent developers ("developers are the creators of the AI era"; developer content YoY +146%). Feishu is pushing AI knowledge tools (Knowledge Q&A, Aily, MCP support).

**Risk**: Platform API constraints; domestic compliance; ARPU pressure.

**Edge**: **Distribution**—you already have an audience on these platforms. That's an asset nobody can buy. Given your existing reach, this may be the fastest path to **first cash**.

### Directions to Skip (Stated Plainly)

- **Video repurposing (Opus Clip clones)**: GPU-heavy, VC-funded, crowded.
- **Horizontal AI note apps**: Mem / Notion / OpenAI dominate; commoditized.
- **Pure memory / MCP infrastructure**: Mem0 ($24M raised) is becoming the default. Don't go head-to-head on infra.
- **General-purpose agent frameworks**: Competing with Claude Code / Cursor and free OSS harnesses. No near-term cash.

---

## IV. Five Ops Stacks: How One Person Holds the Chain

Don't chase "one tool to do everything." The most effective stack is always **a lightweight combination of 3–5 specialist tools**. As builtthisweek.com puts it: the Supabase + Vercel + Stripe + Cursor stack costs $85–$200/month vs. $5K/month in 2019.

### Acquisition / Growth

**SEO + AI Answer Visibility (GEO / AEO)**:
- Bootstrapping (0–$1K MRR): free tools (GSC, Keyword Planner, AlsoAsked) cover 50% of needs.
- Publishing regularly: Frase ($20/mo) → Surfer ($49/mo).
- For AI-answer optimization: track Semrush AI Visibility or Ahrefs Brand Radar.

**iOS ASO gold tier**: Astro ($9/mo, native macOS) + App Store Connect official data. Technical builders can roll their own keyword tracker with Python + the App Store API.

**Avoid**: Pure AI-generated programmatic SEO. Google's algorithm has crushed it; it's no longer viable.

### Content Ops

**The high-ROI long-to-short loop**:

```
Long video (your podcast / Twitter Space / demo)
  → Opus Clip (auto-cut + AI captions, $15/mo)
  → Quick human edit (~20–30% usable as-is)
  → Multi-platform distribution
```

**Generation tools**: Notion AI ($8/mo) + your own Claude/GPT API key is the most economical setup.

### Social Media Ops

**Overseas**: Buffer free tier (3 channels) → Publer ($12/mo flat) → Postiz self-hosted (open source Apache 2.0, supports 17–30+ platforms, integrates with n8n / Claude via MCP).

**Domestic (China)**: 蚁小二 / Yixiaoer (60+ platforms, $28/year) or 易媒助手 / Yimeizhushou (70+ platforms, free 5-account tier).

**Domestic AIGC enforcement data (H1 2025)**: Xiaohongshu disclosed in June 2025 that in H1 it acted against **3.2M fake posts, 10K fake personas, 600K low-quality AIGC notes, and over 10M black-hat accounts**. As of September 1, it complies with China's national standard for "Labeling Methods for AI-Generated Content."

**Implication**: Pure AI-generated content gets actively demoted or removed. The only viable mode is **human-AI symbiosis**—AI generates the draft, humans edit, term filters check, then publish.

### User Ops / Retention / Lifecycle

**Email starter**: Loops free tier (1K contacts) or Resend ($20/mo, API-first—best for technical builders).

**Complex lifecycles**: Customer.io ($100+/mo), but you'll need a dedicated maintainer.

### Analytics

**Default to self-hosted PostHog**: One SDK for analytics + session recording (5K/mo free) + feature flags + A/B experiments + error tracking. $5/mo cloud-server hosting cost; data stays on your own server. Max AI turns natural language into SQL queries.

---

## V. The Engineering Foundation: Soul Core + Harness + Overnight Agent

If product direction is the "what," this section is the "how." Three engineering concepts are unavoidable for the super-individual.

### Soul Core: A Schema for "Me"

The moat isn't the record; it's **the schema that defines the record**. Another Self, Plurality OCL, OpenBrain—they're all trying to do the same thing: structure a person's identity, beliefs, goals, and voice into a portable record, and pipe it via MCP into any AI tool.

A minimal working Soul Core schema has six layers:

| Layer | Description | Example Fields |
|---|---|---|
| **Identity Atoms** | Indivisible identity facts | Role, profession, location, language |
| **Belief Map** | Your worldview claims | "Software is being eaten," "distribution > product" |
| **Goal Graph** | Goals + dependency relations | 12-month MRR target, sub-goals it depends on |
| **Style DNA** | Voice / writing style | Long vs. short sentences, citation habits, emoji use |
| **Context State** | What you're working on now | Which article you're writing, which book you're reading |
| **Feedback Memory** | Things you've corrected the AI on | "Don't use exclamation marks," "avoid marketing tone" |

The stack isn't complicated: Supabase + pgvector + Ollama (the OpenBrain path); $0.10–0.30/month; expose via an MCP server to Claude / ChatGPT / Cursor.

### Harness Engineering: That 98.4% of Scaffolding

A production-grade agent harness has roughly **15 components** (reverse-engineered from Claude Code / Codex):

```
┌──────────────── HARNESS ────────────────┐
│  Instruction Manager  (system prompt / identity) │
│  Context Builder      (per-turn context assembly)│
│  Memory Manager       (prefetch / write-back)    │
│  Tool Registry        (discovery / schemas)      │
│  Permission Resolver  (risk tiers / approvals)   │ ──► LLM
│  Model Adapter        (provider abstraction)     │ ◄──
│  Budget Tracker       (turns / tokens / $)       │
│  Compaction Engine    (context compression)      │
│  Trace / Observability(per-step audit log)       │
│  Stop-condition Logic (termination logic)        │
└──────────────────────────────────────────┘
```

**Safety axiom (most important, most counter-intuitive)**: **Safety lives in the harness, not the model. If you're relying on the model to refuse bad actions, you don't have safety at all.**

A model's "refusal" only counts when the harness validates the tool-call schema and rejects it **before** execution. Refusal isn't an alignment property; it's a **runtime validation result**.

### Overnight Agent: Trade Sleep for Dollars

The essence of the Ralph Loop pattern (Geoffrey Huntley, 2025) is this: **API time spent while you sleep is free in opportunity cost**. The skeleton is one line:

```bash
while :; do cat PROMPT.md | claude ; done
```

Philosophy: let Claude fail repeatedly until it succeeds. Trading engineering hours for "dollars + sleep" is the solo's asymmetric weapon.

The proof point: YC hackathon teams shipping **6+ repos overnight for $297 in API costs**.

But beware **the math of compounding error**—Lusser's Law, from the 1950s:

```
P(success) = accuracy^n
```

- 85% accuracy × 10 steps = **19.7% success**
- 90% × 20 = 12%
- 95% × 20 = **36%**

**Implication**: An agent that runs more than 5 steps without a checkpoint is mathematically doomed. **Checkpoints and HITL aren't UX—they're survival.** HITL takes customer-support scenarios from 73% (pure AI) to 99.8%.

---

## VI. The 2026 Primitives: MCP + Skills + x402

This is the most under-appreciated leverage stack of 2026. For the first time, the solo builder has a complete primitive set to build **headless SaaS sold to agents**.

### MCP (Model Context Protocol)

December 2025 numbers: **97M monthly SDK downloads, 10,000+ active servers, ~2,000 entries in the Registry** (a 407% increase since the September launch).

**On December 9, 2025**, Anthropic donated MCP to the **newly formed Agentic AI Foundation under the Linux Foundation**, with OpenAI / Block / AWS / Google / Microsoft co-sponsoring. This is a key step toward protocolization and away from platform capture.

### Claude Agent Skills

Released by Anthropic on October 16, 2025; opened as a standard on December 18, 2025.

Definition: "organized folders of instructions, scripts, and resources that agents can discover and load dynamically."

### x402 (Coinbase, May 2025)

Resurrects HTTP `402 Payment Required` to embed USDC micro-payments in HTTP headers.

**End-of-April 2026 numbers**: ~69,000 active agents, 165M transactions, ~$50M cumulative flow.

**Implication**: MCP + Skills + x402 together = the first time a solo can build a product **sold to agents**. The buyer isn't a human anymore—it's another agent. This is 2026's most under-appreciated leverage stack.

---

## VII. Failure Modes: Hard Data on What Not to Do

### Gartner: 40% of agentic projects will be cancelled

On June 25, 2025, Gartner Senior Director Analyst Anushree Verma publicly predicted that by the end of 2027, **over 40% of agentic AI projects will be cancelled** due to "escalating costs, unclear business value, or inadequate risk controls."

Gartner also estimated: **of the vendors industry-wide claiming to be agentic, only about 130 actually are**. The rest is "agent-washing."

### The 80–95% wrapper failure rate

No single authoritative source, but the hardest evidence is IdeaProof's failure database tracking **319+ AI startup deaths (2023–2026)**.

Google Cloud VP Darren Mowry (February 2026, TechCrunch): startups "wrapping very thin intellectual property around Gemini or GPT-5" have no future.

### China: pure AI content gets algorithmically demoted

Xiaohongshu acted against **600K low-quality AIGC notes** and banned 10M+ black-hat accounts in H1 2025. National content-labeling standard compliance kicked in September 1. **Pure AI content gets auto-throttled or permanently removed.**

### Lusser's Law nails down "why HITL can't be cut"

Compounding error is hard science: 95% × 20 steps is only 36% success. **Checkpoints are survival.**

---

## VIII. A 12-Month Roadmap

My own roadmap, open-sourced for anyone on the same path.

### Stage 0 (Now – Month 1): Validate Willingness to Pay

Don't write code before validating. Pre-sell into your existing Xiaohongshu / X / WeChat audience. Spin up landing pages for the two best-fit directions (Soul Core + Voice Engine); collect emails / deposits.

**Threshold to continue**: ≥100 signups or ≥20 paid pre-orders per concept within 3 weeks.

### Stage 1 (Months 1–4): Direction 2 as Cash Engine

Ship the **voice content engine first**—the strongest validated willingness-to-pay, the shortest path to revenue, the cleanest leverage on your existing audience, and the bilingual angle (Direction 6) extends it almost for free.

Ship MVP. **Charge from day one** ($29/month). No free tier beyond trial.

**Benchmark**: $2K MRR by month 4.

### Stage 2 (Months 3–6, overlap): Direction 1 as Moat

Build the **Soul Core context layer**. Key insight: **the voice profile from the content engine *is* the Style DNA of Soul Core**—build the content engine *on top of* the Soul Core schema so they share infrastructure.

Publish the schema as an open specification to seed the protocol narrative.

**Benchmark**: 300+ active context profiles, 100+ paying users.

### Stage 3 (Months 6–12): Direction 3 as Premium Tier

Stack the **overnight agent** on top of the two earlier products for power users ("wake up to a finished brief / content backlog"). This lets the overnight agent monetize without needing a cold-start audience.

**Benchmark**: $10K MRR mixed across the products.

### Throughout

Use OpenClaw + MCP / Skills (Direction 4) as **open-source distribution**, not a revenue line. It builds developer credibility and funnels into the paid products.

### Metrics That Should Change the Plan

- If the voice engine can't break **$2K MRR by month 4** → the voice-fidelity differentiation didn't land; pivot to the Chinese-market wedge (Direction 6).
- If Mem0 / Anthropic ship portable, user-owned context natively → demote Direction 1 from a standalone product to a feature inside the content / companionship product.
- If a vertical overnight agent **rapidly shows >$5K MRR** → consider going all-in on that vertical.

---

## IX. Five Senior Mental Models

Five mental models to keep you from flinching at boundary decisions:

### Distribution is the 10–100x Variable

Andrew Chen's "Revenge of the GPT Wrappers" (February 2025) said it plainly: great distribution + "good enough" product wins.

You already have an audience on Xiaohongshu / X / WeChat / public accounts. **That's an asset nobody can buy. Use it. Don't abandon it.**

### Protocols, Not Platforms

Mike Masnick's 2019 original thesis is carried in the AI era by MCP (released November 2024) + Linux Foundation governance (December 2025). Packy McCormick extends it in "Raising a Special Little AI" to the AI-agent protocol layer.

**Implication**: Publish your schema as a protocol; don't lock it inside your product. Protocols get reinforced by the whole ecosystem; platforms get harvested by giants.

### Three Specialist Tools Beat One Platform

Supabase + Vercel + Stripe + Cursor: $85–$200/month vs. $5K/month in 2019. **Lightweight composition always beats attempts at universal coverage.**

### Centaur vs. Cyborg (Ethan Mollick)

> Centaur work has a clear line between person and machine... Cyborgs don't just delegate; they intertwine.

The super-individual isn't a centaur (you do this, AI does that), it's a cyborg (**you and the AI are interleaved into the same workflow; the line is gone**). Core thesis from Ethan Mollick's *Co-Intelligence* (2024).

### Sell Work, Not Software

Sarah Tavel (Benchmark) in her own words. Combine with Intercom Fin's $0.99/resolution + Foundation Capital's $4.6T Service-as-Software framing, and the whole line becomes clear.

**This is the foundational path for the solo to cut into enterprise markets.**

---

## Closing: The "Weight" of the Super-Individual

Back to that 7 a.m.

I stared at the 6 commits, 4 PRs, and 3 rollbacks on the screen and suddenly realized something heavier: **"super" doesn't mean a person has become stronger. It means the lever a person can swing has become longer.**

A longer lever means two things:

1. The things you can do are 10x more than five years ago—the good news.
2. **The things you can do wrong are 10x more too**—the bad news.

I kept turning this over, and increasingly I think the real practice of being a super-individual isn't writing better prompts, building prettier harnesses, or running more overnight agents. Those are the techniques.

The way is: **can you keep the things you do wrong from also growing 10x as the lever grows 10x?**

That is far harder than learning a new framework. It requires unusual clarity about your own schema (who am I? what do I care about? where are my limits?), unusual sensitivity to failure modes (when do I let the agent run, and when do I HITL?), and unusual patience with distribution (a community isn't a tool, it's a ten-year game).

I'm writing this not to hand you a "go execute this now" checklist (though the methodologies all are actionable)—I'm writing it to give myself a **coordinate system**.

If in six months I haven't walked the roadmap, come find me.

If after reading this you're already drafting your Soul Core schema, wiring your own harness, tuning your overnight prompt—**find me on X or my WeChat public account**. We'll trade schemas.

---

**Final note**:

> "The best way to predict the future is to invent it." — Alan Kay
>
> "The second-best way is to read the first 100 people who are already inventing it, and steal their schema before they patent it." — me

Every data point in this essay was double-checked by a research agent (which corrected several widely-misattributed figures: the 11.5 months belongs to Stripe, not Carta; Tibo's $8M is a sale price, not ARR; the Claude Code 1.6% / 98.4% comes from a VILA-Lab paper, not Anthropic).

But the arguments and the path are my own judgment. Mine to be wrong about.

May you find your own stack.

---

**Primary References & Further Reading**:

- Stripe, *Indexing the AI Economy* (2025): [stripe.com/guides/indexing-the-ai-economy](https://stripe.com/guides/indexing-the-ai-economy)
- Carta, *2025 Solo Founder Report* by Peter Walker
- MIT NANDA, *The GenAI Divide: State of AI in Business 2025* (Aditya Challapally, 2025-08)
- Foundation Capital, *Service as Software: The $4.6T Opportunity* (Joanne Chen + Jaya Gupta)
- VILA-Lab (MBZUAI), *Dive into Claude Code* (arXiv:2604.14228)
- Geoffrey Huntley, *The Ralph Wiggum Technique*: [ghuntley.com](https://ghuntley.com/ralph/)
- Sarah Tavel, *AI Startups: Sell Work, Not Software*
- Ethan Mollick, *Co-Intelligence* (2024)
- Anthropic, *Equipping Agents for the Real World with Agent Skills* (2025-10-16)
- Coinbase, *x402 Protocol* (2025-05)
- MCP First Anniversary, [blog.modelcontextprotocol.io](https://blog.modelcontextprotocol.io)
