---
title: 'Open Models Got Roughly 90% Cheaper. How Big an Agent Fleet Can One Person Afford?'
date: 2026-07-15T14:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: [open source LLM, AI agent cost, token cost, multi-model routing, super individual, inference cost, open model comparison, agent fleet, LLM cost collapse, closed-source premium, inference infrastructure, solo builder, HITL, LLM cost]
tags:
  - AI
  - LLM
  - Agent
  - Open Source
  - Super Individual
  - Solo Builder
description: >
  An agent is a workload that burns tokens, and cost is its law of physics. By my own estimate, at comparable intelligence open models are now roughly 90% cheaper, taking a single agent task from a few dollars down to a few cents. For the first time, one person can genuinely afford a fleet of agents running around the clock. This essay works through the arithmetic and one ASCII diagram to explain the token cost collapse, why multi-model routing went from an optimization to the default architecture, and the hidden costs that cheap tokens quietly leave on your plate.
tldr:
  - An agent is a workload that burns tokens continuously. Cost is its law of physics, not a finance detail.
  - By my own estimate, at comparable intelligence open models are roughly 90% cheaper, taking a single agent task from a few dollars to a few cents.
  - Yet open models still account for only about 25 to 30 percent of total token usage. The price has collapsed, the share hasn't followed. That gap is the window.
  - Agent cost is quadratic in turns, because every turn replays the entire history. Halve the turns and cost drops to roughly a quarter. Cutting turns beats switching models.
  - Multi-model routing graduated from optimization trick to default architecture. The most useful routing criteria are pure rules. If an if statement can decide it, don't spend a model call. When in doubt, route up.
  - The cost curve bends. Tokens dominate only at small scale. Past that, eval, operations, and your own attention are the real bottleneck.
  - Cheap is not free. Reliability, evaluation, dedup, and operations are the hidden cost of a fleet. This machine is 98% not AI.
maturity: budding
columns:
  - ai-2026-review-forecast
series:
  name: "AI 2026: First-Half Review, Second-Half Forecast"
  slug: ai-2026-review-forecast
  order: 3
  total: 5
cover:
  image: /images/covers/ai-agent/2026/open-model-cost-collapse-agent-fleet.jpeg
  alt: 'Open Models Got Roughly 90% Cheaper. How Big an Agent Fleet Can One Person Afford?'
---

How many agents can one person actually drive at once?

I've been asking myself that for over a year. In the first half of 2026 the answer got rewritten from scratch — but what rewrote it **wasn't models getting smarter, it was models getting cheaper**. That sentence is worth a second read, because the entire industry's attention is on the first half of it, while the thing actually moving the board is the second.

I try to read everything: frontier and open model releases, primary sources, papers, benchmarks, inference cost data. The strongest impression from the last six months is this: the ceiling of intelligence lifts a notch every few months, but **the floor of intelligence — what it costs to run one inference of comparable quality — is caving in, in whole slabs at a time**. How far in? By my own estimate, at comparable intelligence open models now run roughly 90% cheaper than closed-source flagships. Roughly 90% isn't a discount. It's a change of order of magnitude.

And an agent happens to be the workload in this world that cares least about the ceiling of intelligence and most about the floor.

## First, get this straight: cost is an agent's law of physics

We're used to treating an LLM as a question-and-answer thing. You ask, it answers, token usage is bounded and predictable. An agent is not that. **An agent doing work is a loop that burns tokens continuously**: read context, plan, call a tool, read the tool's return, reflect, plan again, call again. A moderately complex task might send an agent through dozens or hundreds of internal turns, each one pouring tokens into the model and pulling tokens back out.

So here's a judgment I keep repeating: **for an agent, cost is not a finance detail, it's a law of physics.** It decides whether you can leave an agent running, how many you can run, and whether you dare let one work overnight on your behalf. An agent fleet billed at flagship closed-source rates and running 24 hours a day produces a bill that swells at a genuinely unreasonable rate — not because the agents are dumb, but precisely because they're diligent.

That's why "roughly 90% cheaper" matters far more to a solo developer than "another, stronger model shipped." A stronger model lets you do things you couldn't do before. A cheaper model lets you **keep doing** things you previously only dared do occasionally. The first widens the boundary of capability; the second widens capability's *runtime*. And the leverage of the super individual hides in the runtime.

## Different task shapes burn tokens at wildly different magnitudes

Before doing the arithmetic, one thing has to be clear, or every number that follows is mush: **"one agent task" is not a meaningful unit of measurement.** Across task shapes, token consumption differs by two or three orders of magnitude. Estimating from an average produces a number with no guidance value at all.

Based on the workloads I run, here's a rough split of common agent task shapes into four classes. The numbers in this table are **magnitude observations from my particular pipeline, not universal constants** — change the domain, the prompt style, or the tool set and the absolutes move. But **the shape of the ladder is stable**:

| Task shape | Typical turns | Total tokens per task (magnitude) | Where it goes |
|---|---|---|---|
| One-shot classify / extract fields | 1 | Thousands | The short body text you send in |
| Summarize a long article | 1–2 | Tens of thousands | The full input text |
| Multi-step retrieval + synthesis | 5–15 | Hundreds of thousands | Retrieval results re-injected every turn |
| Codebase sweep / refactor | 30–100+ | Millions | Context replayed over and over + long output |

The thing worth remembering here isn't any specific number, it's the **span**: from thousands to millions, three orders of magnitude in between. **One codebase sweep is worth a thousand classification tasks.**

And *how* tokens get burned is worth pulling apart too. Most people's intuition is "the agent did 30 turns, so that's 30 calls' worth of money." That's wrong, **and wrong by a lot**. Because on every turn, an agent has to **resend the context from all previous turns** to the model. It has no memory. Its "memory" is re-pouring the entire history in, every single time.

```text
   How input tokens snowball across a 30-turn agent task
   (assume 5K initial context, each turn adds ~2K of tool return + model output)

   Turn      This turn's input = full history      Cumulative input
   ────────────────────────────────────────────────────────────────
   Turn 1     5K                                   5K
   Turn 5     5K + 4×2K = 13K                      ~45K
   Turn 10    5K + 9×2K = 23K                      ~140K
   Turn 20    5K + 19×2K = 43K                     ~480K
   Turn 30    5K + 29×2K = 63K                     ~1,020K

   Cumulative input ≈ Σ(5K + 2K×n), for n from 0 to 29
                    ≈ 30×5K + 2K×(29×30/2)
                    ≈ 150K + 870K ≈ 1.02M tokens
   (Illustrative magnitudes; actuals depend on your context management strategy.)
```

Look closely at that shape: **double the turns and cost roughly quadruples.** Because cumulative input is quadratic in turn count (Σn ≈ n²/2). This is the most counterintuitive and most punishing property of agent cost — **it isn't linear, it's quadratic.** When your agent takes a few extra detours, the bill doesn't go up a bit. It goes up a tier.

Two direct corollaries, both practical:

- **The biggest lever for saving tokens isn't a cheaper model, it's making the agent wander less.** Take work that finishes in 30 turns and compress it to 15, and cost falls to roughly a quarter — a bigger win than switching models, with zero quality given up.
- **Context management isn't fastidiousness, it's finance.** Every redundant token you stuff in on one turn gets re-billed on **every remaining turn**. Add 1K of useless material on turn 3, and by turn 30 you've paid for that 1K twenty-seven times.

Once that clicks, the total bill below stops looking absurd and starts looking inevitable.

## Do the arithmetic: one night of tokens, closed vs. open

Talk about "cheap" is boring. Let's price it. Every number below is marked **illustrative / estimated** — don't treat it as a quote, just feel the magnitude.

Say I keep an overnight agent fleet: 5 agents, each on its own task line (intelligence roundup, codebase sweep, doc cleanup, competitor tracking, asset dedup), running a full 8-hour night. From my rough magnitude observations, a fleet like that chewing through tens of millions of tokens in a night is entirely normal — an agent's context replay is extremely token-hungry, so don't estimate it with chat intuition.

Let's conservatively take **50 million tokens a night**, split 7:3 input to output. And two sets of illustrative unit prices:

- A flagship closed model: about $5 / million input tokens, $25 / million output tokens
- A strong open model: about $0.30 / million input tokens, $1.20 / million output tokens

```text
              One night, 50M tokens (35M input / 15M output)
        ┌─────────────────────────────────────────────────────────┐
CLOSED  │  Input   35M × $5     = $175                             │
FLAGSHIP│  Output  15M × $25    = $375                             │
        │  ─────────────────────────────                          │
        │  Per night ≈ $550    →   Per month ≈ $16,500            │
        └─────────────────────────────────────────────────────────┘
        ┌─────────────────────────────────────────────────────────┐
STRONG  │  Input   35M × $0.30  = $10.5                           │
OPEN    │  Output  15M × $1.20  = $18                             │
        │  ─────────────────────────────                          │
        │  Per night ≈ $28.5   →   Per month ≈ $855               │
        └─────────────────────────────────────────────────────────┘

        Same fleet, same night's work:  $550  vs  $28.5
        Monthly bill: an entry-level used car  vs  a nice dinner
        (Illustrative magnitudes, not live quotes.)
```

Note that I'm not claiming the open model does this work at **identical quality** to the closed flagship — I'll deal with that honestly further down. What I am saying is: **when the price gap is that wide, the question "should I use it" changes character entirely.** At $16,500/month, a solo developer wouldn't even entertain the thought; that's a small company's budget. At $855/month, it's something a serious independent developer can grit their teeth and afford. The same agent task that costs "a few dollars a run" at flagship prices drops to "a few cents a run" on a strong open model. **What sits between a few dollars and a few cents isn't money — it's the psychological threshold of whether you dare leave it running.** Cross that threshold and the overnight agent fleet goes from a concept on a slide to something you can switch on tonight.

## Why the closed-source premium is collapsing: the share is small, the price already broke

Someone will ask: cheap is cheap, but can open models really keep up?

Which brings us to the most interesting **dislocation** of the last six months. From what I've tracked, on the three most token-hungry task classes — reasoning, coding, and agent work — the gap between open models and closed flagships has narrowed to "good enough for most production scenarios." Not a blanket win, but **good enough on exactly the kind of work you actually run in bulk, over and over.** And that's precisely the work that ought to be cheap.

But another number is worth chewing on: by my own estimate, open models currently account for only about 25 to 30 percent of the industry's total token usage. In other words — **the price already broke, the share hasn't followed.** A vast amount of tokens still burns at closed flagship rates, much of it purely out of inertia, defaults, or "that's what I wired up back then."

I call this the collapse of the closed-source premium, and it's the kind of collapse that **breaks on price first and cashes out in share slowly after**. Price is the leading indicator; share is the lagging one. For an individual, the lag between them is the window: **while most people are still paying flagship rates, whoever migrates their agent workload onto open routing first has effectively put a ~90% discount on every unit of their own output.** That isn't saving money, it's leverage — in [The Super Individual's Intelligence System: 98% Is Not AI](../super-individual-intelligence-system/) I argued that the ability to process information is the scarce good; this fills in the other half: **the compute to process it just got cheap enough, for the first time, for one person to use without flinching.**

## One diagram for multi-model routing

After the collapse, the real architectural change is one sentence: **stop billing every operation at flagship rates.**

We used to pick "the one strongest model" and feed it everything. In an agent world where cost is physics, that's pure waste — you're having a lawyer do your transcription and an architect haul your bricks, and paying their hourly rate for it. The right move is **multi-model routing**: send every call, according to the nature of the task, to the model that's just barely good enough and cheapest.

```text
                       An agent call comes in
                               │
                     ┌─────────┴─────────┐
                     │      Router       │   ← classify the task
                     └─────────┬─────────┘
        ┌──────────────┬───────┴──────┬──────────────┐
        ▼              ▼              ▼              ▼
  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
  │ Hard      │  │ Coding    │  │ Chat /    │  │ Bulk      │
  │ reasoning │  │ tasks     │  │ light     │  │ dedup     │
  │ Planning  │  │ Refactor  │  │ Classify  │  │ Format    │
  │ Decisions │  │ Write code│  │ Summarize │  │ cleanup   │
  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
        ▼              ▼              ▼              ▼
   Strong open     Code-tuned      Small light    Cheapest tiny
   model (or a     variant         model          model
   closed flagship (cheap, more    (a fraction    (near dirt
   only if forced)  accurate)       of the price)  cheap)
        │              │              │              │
        └──────────────┴──────┬───────┴──────────────┘
                              ▼
              Fewer than 10% of calls truly need
              flagship-grade intelligence. Run the other
              90% on cheap models and the bill drops an
              order of magnitude.
```

The core of that diagram isn't "how many models you used," it's that one line: **the calls that genuinely need flagship-grade intelligence are usually under one in ten.** The other 90% is manual labor — reading files, extracting fields, classifying, summarizing, formatting, deduping. It accounts for the overwhelming majority of your token usage while needing almost none of the top-tier intelligence. Running that 90% at flagship rates is paying for intelligence that isn't being used.

The most valuable thing I did to my own agent stack this half-year wasn't switching to a stronger model — it was **building the routing layer properly**. The ROI is frankly obscene: almost no quality lost, and the bill drops an order of magnitude. This is no longer an "optimization trick." It's the default architecture.

## What does the router actually decide on?

The diagram is easy to draw. The hard part is what that "router" actually looks at. From what I've hit this half-year, the usable criteria are pretty plain, and **the ones at the top of the list need no model at all** — a rule decides them, for free.

I order the criteria cheapest-first, the same logic as the three-tier dedup in the first essay of this column: **the cheap filter must sit in front of the expensive one.**

| Criterion | How you decide | Cost | Points to |
|---|---|---|---|
| Task type label | Caller declares it (this is extraction / this is planning) | Free | Straight to the matching tier |
| Input length | Count the tokens | Free | Too long → compress first, don't jump to flagship |
| Output structured? | Is there a schema? | Free | Has schema → a small model suffices |
| Reversible? | If this step is wrong, can you redo it? | Free | Irreversible → route up + human in the loop |
| Historical hit rate | Past pass rate of the small model on this task class | Cheap (table lookup) | Below threshold → route up |
| Semantic complexity | Let a small model judge "is this one hard?" | Cheap | Judged hard → route up |

The first four are pure rules, and they cover **most** of my routing decisions — without a single model call. That matters, because I've seen plenty of people set out to build an "intelligent router" that uses a model to decide which model to use. Now you've conjured up an extra call, an extra latency hop, and an extra thing that can be wrong, all to solve a problem an `if` statement handles. **If an `if` can decide it, don't spend a model on it.**

The fourth criterion, reversibility, deserves its own paragraph, because it's the only one **not aimed at saving money**. It asks not "is this hard" but "can I afford to be wrong here." Writing a record to a database, sending an email, pushing a commit — get these wrong and they're either painful to roll back or unrecoverable. **Saving money on irreversible actions is the worst possible way to save**: you pocket a few cents and gamble on a mess that takes you an hour to clean up by hand. What this criterion connects to downstream is the trust engineering covered in this column's fourth essay, [How Do You Trust an AI Agent Nobody Is Watching?](../trusting-unattended-ai-agent/) — **the boundary where routing is allowed to step down is drawn by your trust boundary, not by the price sheet.**

One more counterintuitive lesson from practice: **be more aggressive about routing up than down.** The cost of the router guessing wrong is wildly asymmetric. Route to a flagship when a cheap model would've done, and you overspent a few cents. Route to a cheap model when you needed the flagship, and the agent carries a wrong intermediate conclusion twenty more turns — those twenty turns burn for nothing, the output is still wrong, and you have to discover the error with your own eyes. **The cost of being wrong once far exceeds the gain from being right a hundred times.** So when my router is unsure, it always goes up.

## Past a certain scale, the cost curve bends

The arithmetic above carries an implicit assumption: **cost grows linearly with scale.** 5 agents cost $28.5, so 50 cost $285. At small scale that assumption holds well enough, but it fails at some point — and it fails in the direction that's bad for you.

Break the curve into three segments and you'll see that token unit price is the protagonist only in the first one:

```text
   Total cost of running an agent fleet: three segments

   Cost
    ▲
    │                                          ╱  ← Segment 3: your time
    │                                        ╱      becomes the bottleneck;
    │                                     ╱         slope steepens again
    │                            ╱───────╯       ← Bend 2:
    │                        ╱                      you can't keep up
    │                  ╱────╯                    ← Segment 2: tokens are cheap,
    │            ╱────╯                             but eval / ops / QA
    │       ╱───╯                                   fixed costs get amortized in
    │   ╱──╯                  ← Bend 1: you now need to "know what they're doing"
    │╱─╯       ← Segment 1: token cost dominates, roughly linear
    └──────────────────────────────────────────────▶ Number of agents
       1–2            5–20                 50+

   Segment 1: tokens are the main cost      → 90% cheaper = 90% off the bill
   Segment 2: tokens are secondary          → 90% cheaper = 50% off? 30%?
   Segment 3: tokens barely show on the bill → 90% cheaper ≈ imperceptible
```

That diagram says one thing only: **"roughly 90% cheaper tokens" is only 90% in segment one.** The further right you go, the smaller tokens' share of total cost, and the thinner the meaning of that 90%.

The two bends deserve separate treatment:

**Bend one shows up when you start needing to know what they're doing.** With one or two agents, you can watch them by hand. At five or ten, you must have logs, alerts, and one place where you can see at a glance which one is stuck and which is spinning. The cost of that machinery **has little to do with how many agents you run — it's a fixed investment**. But once it's amortized in, your "cost per agent" is no longer a straight line through the origin. This is also why so many people do the token math, find it unbelievably cheap, then run it for real and discover they didn't save nearly that much: **they costed segment one and are running segment two's work.**

**Bend two shows up when you personally can't keep up.** This one is the brutal one, because what it spends isn't money, it's your time — and your time can't be bought at $0.30 per million tokens. Fifty agents' worth of overnight output, at even 5 minutes of your review each, is over four hours. **The ceiling on your fleet size was never your budget. It's your attention.** This is the same thing as the funnel in this column's first essay, [Where an AI Pipeline That Tracks the Whole Web Actually Stalls](../ai-auto-news-pipeline-limits/), said two ways: there it's the volume of information you can't compress down; here it's the volume of output. Both jam on the same thing — **your bandwidth for judgment**.

So on scale, my conclusion is a deflating one: **the cost collapse took you from "can't afford 2" to "can afford 20," but it didn't make you able to "keep up with 200."** Two to twenty is what token prices gave you. Above twenty, something else has to give it — and that something else is the cold water this essay ends with.

## The lever got longer: how much output can one person move?

Stack those pieces together — the cost collapse, routing becoming default — and you get a conclusion that matters a great deal to solo developers: **the lever got longer.**

The super individual story is fundamentally about one person using tools to amplify their output out of all proportion. The bottleneck on that amplifier was rarely "I can't think of anything for agents to do." It was "I can't afford to keep them doing it." You have a hundred things you'd like an agent watching, but you only dare run one or two, because every additional one burns real money. **The cost floor is the imagination floor.**

Now the floor has dropped roughly 90%. On the same budget, the number of agents you can drive simultaneously goes from "one or two" to "a fleet." Which means you can point agents at the things that **don't pencil out individually but compound if done continuously**: sweep every source you follow each night, run continuous inspection over your codebase, dedup and file your scattered material, watch every update your competitors ship. Too expensive and too tedious for a human; too token-hungry for an agent, until now. For the first time they're simultaneously "cheap enough to be worth doing forever." As for what these proactive, overnight-running agents actually look like, I sketched their shape in [The Proactive Agent That Prompts You Back](../proactive-agent-it-prompts-you/); what this essay adds is the economic base that lets that shape **run at all, and stay affordable**.

**Information is worthless. What's valuable is the ability to process it.** And what happened this half-year is: the unit price of that ability collapsed.

## Four things you can do tonight

That's a lot of judgment. What lands in your hands should be executable. The four below are ordered the way I did them, **highest ROI first**.

**One: measure before you optimize.** Before you switch any model, answer three questions: which agent is your token spend going to? Within that agent, which class of call? Within that class, what's the input/output split? Without those three answers, every optimization you make is a guess. The bar for this is embarrassingly low — wrap a layer around your model calls and log `task type / input tokens / output tokens / which model / how much it cost` into a table. That's enough. **I'll bet your first reaction after measuring is "wait, *that's* the one?"** — for most people, the token hog is not the one they assumed.

**Two: cut turns before you switch models.** Back to that quadratic curve: halve the turns, cost drops to roughly a quarter. So first check whether your agent is wandering — is it re-reading the same file, is the tool return stuffed with fields nobody uses, is it retrying three times because the prompt is unclear? **These are free money: cheaper, faster, and more accurate.** Switching models trades quality for money. Cutting turns trades nothing for anything.

**Three: wire up routing starting from the lowest-risk tier.** Don't refactor the whole chain on day one. Pick a class of call that's **high frequency, reversible, and easy to verify** — classification, tagging, field extraction — and step just that one down to a small model. Run it a week. Compare quality. That class usually contributes a healthy chunk of tokens, and getting it wrong costs almost nothing. **Eat that block first: the bill moves visibly and you've taken essentially no risk.**

**Four: leave a rollback switch on every step-down decision.** Every tier must be switchable back with one line of config. This isn't fastidiousness — you will need it. An open model's version update, a small tweak to your prompt, either can make a tier suddenly insufficient. **You'll only step down boldly if you can step back in ten seconds.**

Conversely, these are **anti-patterns**, all of which I've walked into myself:

- **Saving money on irreversible actions.** Writing to a database, sending a message, committing code — that's the last model spend you should be trimming.
- **Compressing context too hard to save money.** Compressing context is right, but overdo it and the agent wanders five extra turns for lack of information, and those five turns cost far more than you saved. **This is the most common "saved my way into a worse outcome."**
- **Switching models without an eval.** You step a tier down to a cheap model, the bill drops, you're happy. Did quality drop? You don't know. **A step-down with no eval isn't optimization, it's gambling** — and the kind that pays out long after the fact, by which time you've already lost a lot.
- **Making the router a model.** If an `if` can decide it, don't spend a model on it.
- **Watching unit price and ignoring the total.** Squeezing unit price on segment two of the curve matters less than getting your eval and ops machinery in order — that's the real bulk of your bill in that segment.

## Second-half forecast

Pushing the observations above forward, here are this column entry's calls — this is *AI 2026: First-Half Review, Second-Half Forecast*, and for the second half I'm betting on these:

**One: multi-model routing goes from "advanced technique" to "default architecture."** By year end, someone building agents seriously who still feeds every call to the same flagship will look the way hand-concatenating SQL strings looks today: a recognizable, obsolete posture. Routing will be built into mainstream agent frameworks, part of the scaffold you get when you start a new project, not the optimization you remember to do afterward.

**Two: cost-sensitive agent workloads will swing to open models first and hardest.** The high-frequency, repetitive, manual-labor token hogs — batch processing, data cleaning, continuous monitoring — will be the main force pushing open models' share up from that 25–30%. Share, the lagging indicator, will start chasing price, the leading one, in the back half of the year. The dislocation will converge, but the convergence period is the window. **What those windows of opportunity look like, which are already a crowded red ocean and which are still empty, is the map this column's final essay, [The Red Ocean of AI Agents Is Full. Where's the Blue Ocean in the Second Half of 2026?](../ai-agent-red-ocean-blue-ocean-2026/), sets out to draw** — here I'll just note one thing: **the lag while everyone else still burns money at flagship rates is itself an asset you can bet on.**

**Three: self-hosting and tuning inference infrastructure goes from "big-company only" to an edge an individual can reach.** When weights are open and unit price is already low, whoever can press one layer further down — a leaner inference framework, smarter batching, a deployment shaped to the workload — digs a basement below everyone else's floor. **That layer will become an underrated but real moat in the second half**, and it's no longer out of an individual's reach: cheap open weights plus a mature inference toolchain make "serving your own inference" viable for the first time.

## Caveat: cheap has never meant free

I have to hit the brakes here, or this turns into cheerleading.

I believe in a law I quote often, **Lusser's Law** — a system's reliability is the product of the reliability of all its parts; any weak link and the whole thing goes. **Cheap tokens only brought the price of one link down. They didn't make the other links free — if anything, the opposite: once calls get cheap enough that you dare run them in volume, the cost of every other link is amplified.**

The real bill for an agent fleet isn't in tokens. It's here: **reliability** — open models occasionally glitch, drift on format, hallucinate, and you need a backstop; **evaluation** — how do you know quality didn't drop after you switched to a cheaper model? You need a continuously running eval suite, which is itself an engineering project, and it's the subject of [How Do You Trust an AI Agent Nobody Is Watching?](../trusting-unattended-ai-agent/): **cheap is what lets you dare leave the agent running overnight; whether you dare actually go to sleep depends on whether you built the evals and the guardrails**; **operations** — five agents run all night, and in the morning you need to be able to tell which is stuck, which went off the rails, which is spinning and burning money; **QA and dedup** — agent output is a mixed bag, and you need a gate, or cheap buys you a pile of garbage that needs cleaning by hand.

Which brings us back to the number I keep coming back to: **this machine is 98.4% scaffolding and 1.6% judgment** — it's harness, not magic. Tokens getting roughly 90% cheaper saves you money on the "model call" sliver inside that 98.4%; building the harness, doing the HITL (human-in-the-loop), writing evals, watching operations — not a cent saved, and heavier now, because you dare run more. For a finer breakdown of what that 98.4% of scaffolding is made of, I take it apart in [The Agent Engineering Map: Where Does That 98.4% of the Work Actually Live?](../agent-engineering-the-98-percent-harness/). **Cheap models let you dare keep a fleet; what keeps that fleet from capsizing is the whole apparatus you build outside the model.** That part, AI can't do for you. You build it.

## Closing

Back to the question at the top: how big an agent fleet can one person actually afford?

Six months ago my answer was "one or two, and run them sparingly." Today my answer is "a fleet, as long as you can build the harness." **The change didn't come from models getting smarter — they've been getting smarter all along, that's not news. It came from models getting cheaper, cheap enough to cross the psychological threshold where an individual dares leave them running.** It's a quiet dimensional strike that made no headlines: it didn't set a single benchmark record, but it took the overnight agent fleet from an enterprise privilege and handed it, for the first time, to individuals.

But I don't want you leaving with the illusion that it's all downhill from here. **The cost collapse opened a door, not a road.** The road behind it — reliability, evaluation, operations, judgment — you still walk yourself, and now that you can afford to walk it, you have to walk it more seriously. Cheap was only ever the fuel; the driving is what's worth something. The floor dropped roughly 90%; the ceiling is still in your own hands. The question worth asking about this half-year isn't "how much cheaper did models get" — it's this: **the budget and the nerve that cheapness bought you, how big a thing are you going to spend it moving?**
