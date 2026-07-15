---
title: 'Where an AI That Tracks a Whole Field For You Finally Gets Stuck'
date: 2026-07-15T10:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: [AI information pipeline, automated news tracking, AI content automation, information aggregation, denoising, agentic search, super individual, AI intelligence system, noticing latency, deduplication, judgment hit rate, close the loop, HITL, compounding error]
tags:
  - AI
  - LLM
  - Agent
  - Automation
  - Super Individual
  - Monitoring
description: >
  If you hand an AI the job of tracking a whole field for you, how far does it actually get? This essay takes apart the AI information pipelines that exploded in the first half of 2026: where each of the three technical routes stalls, how much three-stage dedup can cut and what it can never cut, and why compounding error makes long chains drift by construction. Access has been cut to zero, but the output usually stops at a more polished bookmark folder. The real ceiling is structural. AI can know things for you; it cannot judge for you. Includes a build checklist you can copy directly, a list of anti-patterns, and three forecasts for the second half.
tldr:
  - AI moved the bottleneck of information from "can I get it" (access) to "how long between the world changing and me knowing" (noticing latency), plus the attention it costs to absorb.
  - These products have only three technical routes - subscription push misses, change-monitoring poll gets noisy, agentic search drifts. Every usable system mixes all three.
  - Gathering, translation, summarization, aggregation, and three-stage dedup can all be automated, but the ceiling of pure automation is a more polished bookmark folder.
  - The engineering core of denoising is three-stage dedup (URL canonicalization, content fingerprint, vector near-duplicate, cheap filters strictly before expensive ones) - but dedup cannot decide whether something is worth reading.
  - Compounding error is structural - 95% per step over 5 steps leaves about 77%, and pushing each step to 99% still cannot carry a long chain. The fix is shorter chains and checkpoints, not waiting for better models.
  - The information layer is AI's home turf. The knowledge and action layers are not. Judgment hit rate is the most fundamental metric and the one almost nobody tracks, and you can start measuring it today.
  - Forecast for the second half - information automation keeps improving, converges, and becomes a utility. What stays scarce is the person who closes the loop from output to judgment to action.
maturity: budding
columns:
  - ai-2026-review-forecast
series:
  name: "AI 2026: First-Half Review, Second-Half Forecast"
  slug: ai-2026-review-forecast
  order: 1
  total: 5
cover:
  image: /images/covers/ai-agent/2026/ai-auto-news-pipeline-limits.jpeg
  alt: "Where an AI that tracks a whole field for you finally gets stuck"
---

Suppose you stand up an AI today and tell it to track everything happening in one field — papers, releases, benchmarks, what the loud accounts are saying, first-party changelogs. How far can it actually get on your behalf? This isn't a thought experiment. From what I've tracked, I've tried to work my way through most of the "AI intelligence system / automated news tracking" products that surfaced in the first half of 2026: some do subscription aggregation, some do change monitoring, some hand you an end-to-end "one briefing a day." They're all capable. But after running them side by side for a few months, I've grown more and more certain of one thing: **pure AI automation can perfect the *hauling* of information, but there is a structural ceiling it cannot cross — it can know things for you, it cannot judge for you.**

This is the first essay in the column *AI 2026: First-Half Review, Second-Half Forecast*. I want to get the first half straight first — what the explosion of information automation actually gave us, and where it jammed — before extrapolating into the second half.

## First half: access got cut to zero

The good news first, and it's a real dividend.

A year ago, the biggest cost of following a fast-moving field was **access** — whether you could get the material at all. Sources were scattered across dozens of places: arXiv, GitHub releases, company blogs, some mailing list that only publishes in English, a handful of accounts on various platforms talking faster than you can read. Just *knowing where to look* was one barrier. *Keeping up* was the second. *Understanding it* — especially across languages — was the third.

By the first half of 2026, AI had flattened all three barriers more or less at once. **Gathering, translation, summarization, aggregation: those four are now fully automatable, at a quality level where you'd struggle to find a real complaint.** An RSS feed, an API, a page snapshot comes in, and the model casually translates it, compresses it to three sentences, tags it, and files it by topic. I try to get through the full stream of frontier AI system releases, primary sources, papers, and benchmarks year-round; that used to eat a fixed and substantial block of every day. Now that block is thin.

Here's the way I keep putting it: **the bottleneck of getting information has moved.** It's no longer "can I get it" (access). It's two new numbers — **noticing latency**, the gap between the world changing and you actually knowing, and **attention cost**, how much attention it takes you to digest. AI drove access to zero and simultaneously compressed noticing latency from "whenever you next have time to scroll" to "a few minutes after it happened." That's a genuine step-change, and anyone who's used it knows.

If you only see this layer, you reach a conclusion that is optimistic to the point of being dangerous: tracking a field is a solved problem.

## What these products actually are: three technical routes

Before going further, I want to break up the vague phrase "AI intelligence system." From what I've tracked, these products come with wildly varied names but only three underlying technical routes — and **each route jams somewhere different.** I won't name specific products; they iterate too fast, and naming one dates the essay the same day. But the shapes are stable. Take any new product and you can slot it in.

**Route one: subscription aggregation (push).** It wires in RSS, newsletters, webhooks, platform APIs, waits passively for things to arrive, then translates, summarizes, and files them. It's the most mature and cheapest route, and it's the true identity of nearly every "one AI briefing a day" product. Its boundary is clear: **someone has to configure the sources first.** Anything you didn't subscribe to, it will never know about. Its recall is exactly equal to the completeness of your subscription list — if a team you've never heard of shipped something game-changing yesterday, this route misses it 100% of the time.

**Route two: change monitoring (poll).** It snapshots a page, a release, a doc on a schedule, diffs them, and reports changes. Its value is covering sources that have no RSS: pricing pages, model cards, API docs, GitHub releases. Its problem is a **terrible signal-to-noise ratio**. A page swaps a CSS class, replaces an image, bumps the copyright year — the diff dutifully tells you "it changed." You have to stack a model on top to judge whether a change is *semantically* important, and misjudgments at that layer are this route's main cost.

**Route three: agentic search (pull).** You give it a question or a description of a field; it searches on its own, decides what's worth reading, decides whether to run another round. It has the highest ceiling — it's the only route with a real chance of surfacing what you don't know you don't know. The price is that **it's the most expensive, the slowest, and the least stable**: run the same query twice and a meaningful share of the results won't overlap, because search results themselves shift and the model's retrieval decisions carry their own randomness.

Put the three side by side and an interesting structure shows up:

| | Subscription push | Change-monitor poll | Agentic search |
|---|---|---|---|
| Trigger | Source pushes to you | Scheduled poll + diff | You or an event asks |
| Latency | Seconds to minutes | Equal to poll interval | Tens of seconds to minutes after asking |
| Cost per item | Very low | Low (diff is cheap, judging is not) | High (multi-round retrieval + long context) |
| Main failure mode | Misses (not subscribed, never knows) | Noise (meaningless diffs flood you) | Drift (same question, two different answers) |
| Can it find unknown unknowns? | No | Almost never | Yes, but unreliably |
| Where it belongs | The routine baseline | Guarding the critical few sources | Targeted digs / filling blind spots |

Any system that's actually pleasant to use isn't one route — it's **all three mixed**: push carries the baseline (cheap, broad, fast), poll watches the dozen-odd sources you genuinely care about that happen to have no RSS, agentic runs a few targeted passes a week to fill blind spots. The combination makes sense. But notice: **all three routes optimize the same thing — getting what should reach you in front of you faster and more completely.** Not one of them addresses what happens *after* it arrives. That's the next section.

## The ceiling: output stops at "a more polished bookmark folder"

Run this pipeline for a month, though, and something starts to feel off.

The problem isn't that it does its job badly. It's that **once it's done, it hands the heaviest work right back to your eyes, untouched.** What it gives you is a neatly ordered, well-translated, deduped, categorized stream. And then? Then you still read down it item by item, deciding yourself which one matters, which is noise, which is worth trying today, which is three-month-old news wearing a new headline.

**It scores full marks on gathering, translation, summarization, and aggregation, then stops dead at denoising and judgment.** The final output is, in essence, **a more polished, more timely, more complete bookmark folder**. However polished, a bookmark folder is still a bookmark folder — it knows everything for you and has thought through nothing for you.

There's an easily missed mismatch hiding here. Summarization is not denoising. Compressing a long piece into three sentences reduces **word count**, not **noise**. Real noise is "this doesn't matter *to me*," and whether something matters is relative to your goals, your judgment, what you're doing right now — **and none of that is in the model's head.** So all it can do is rank by *generic* importance, and for someone with a specific goal, generic importance has a pitiful hit rate.

I'm happy to nail this sentence to the middle of the section: **information is worthless; the ability to process it is what's valuable.** The first half's automation perfected the worthless part — getting the information. The valuable part — processing it — it barely scratched.

## One diagram: what automation swallows and what it can't

Draw the pipeline out and you can see at a glance which layers got flattened and which layer hits a wall.

```
              The outside world (constantly changing)
                        │
   ┌────────────────────┼────────────────────┐
   │  Acquisition mode (pick one, usually mixed) │
   │  ① push          ② poll          ③ pull   │
   │     RSS/webhook     diff/snapshot   agentic │
   └────────────────────┼────────────────────┘
                        ▼
        ┌──── Information layer (AI's home turf) ────┐
        │  gather → translate → summarize → group    │  ← cut to zero
        │  3-stage dedup: URL → fingerprint → vector │
        └───────────────────┼────────────────────────┘
                            ▼
        ╔═══════ THE STRUCTURAL CEILING ═══════╗
        ║   denoising (for you) + judgment     ║  ← stuck here
        ╚═══════════════════┼══════════════════╝
                            ▼
        ┌──────── Knowledge layer / Action layer ────┐
        │  read → judge → decide → act → feed back   │  ← handed back to you
        └────────────────────────────────────────────┘
```

The top half is AI's home turf, and it's approaching free. The bottom half is where the moat is — and precisely where automation currently barely reaches.

While we're here, let me spell out the engineering of that denoising layer, because plenty of people assume denoising just means "show me less." The real core of denoising is **three-stage dedup**:

```
Stage 1: URL canonicalization  strip utm_* params, anchors, redirects; collapse the same link
Stage 2: content fingerprint   SimHash / MinHash; catch "the same piece, rehosted"
Stage 3: vector near-duplicate embedding similarity; catch "the same event, retold differently"
```

Three-stage dedup collapses "ten outlets reposting the same wire story" down to one. It's solid. The division of labor is worth spelling out, because **getting the order wrong wastes a lot of money**:

- **Stage 1 (URL canonicalization) is essentially free.** It's string handling: strip `utm_*`, `?from=`, anchors, redirect interstitials, then collapse the AMP version, the mobile version, and the mirror of the same article. It eats a meaningful share of the duplicates at negligible cost.
- **Stage 2 (content fingerprint) is very cheap.** SimHash and MinHash are pure CPU, judging at the body-text level whether a piece has been rehosted. It catches the reposts that changed the headline, bolted on an intro paragraph, and left the body untouched.
- **Stage 3 (vector near-duplicate) is the one that costs money.** It needs embeddings, and it catches "the same event, retold differently" — three outlets each wrote their own piece, all different wording, all about the same thing.

The key is that **you must run them in that order**. Stage 3 costs orders of magnitude more per item than the first two, so running embeddings before URL canonicalization means paying to vectorize a pile of links that were literally identical. **Cheap filters must sit in front of expensive ones** — a universal law for pipelines, but especially easy to forget in information systems, because everyone's first instinct is to solve everything with a model.

By my own estimate, a day through my pipeline has roughly this shape (the numbers are the magnitude of my particular pipeline, not universal constants, but **the shape of the funnel is stable** — run it on another field and you'll get a similar structure):

```
Raw items arriving per day               ~800
        │
        ├─ Stage 1 URL canonicalization  → cuts ~30%      ~560 left
        │  (same link, different params; mirrors; AMP)
        ▼
        ├─ Stage 2 content fingerprint   → cuts ~40% more  ~340 left
        │  (reposts, rewrites, clickbait retitles)
        ▼
        ├─ Stage 3 vector near-duplicate → cuts ~30% more  ~240 left
        │  (same event, different retelling)
        ▼
   After dedup, "every item is new"                        ~240
        │
        ╠═══════ automation ends here ═══════╣
        │
        ▼
   Actually related to what I'm working on              ~10
        │
        ▼
   Actually changed something I did                      ~1
```

The brutal part of this funnel isn't the three cuts up top — those are precise, cheap, and a genuine engineering win. **The brutal part is the last two cuts: 240 to 10, then 10 to 1, both made entirely with my own eyes and brain. Automation didn't help with either.** And look at the ratios: 240→10 is 24x, 10→1 is another 10x, 240x combined. All three dedup stages together take 800 down to 240 — 3.3x. **Automation takes the 3.3x. The human carries the 240x.**

So note carefully: **dedup removes *duplicates*, not *unimportant things*.** Each of the 240 items left may well be "new," and every one of them may still have nothing to do with what you're doing today. **Dedup solves part of attention cost. It does not touch judgment.** That line is the watershed between the first half and the second.

## Why the wall is structural

I first assumed this was a model capability problem — surely a stronger model could judge for me? Six months in, I changed my mind: **this isn't a capability problem, it's a layering problem.**

Split information handling into three layers and it gets clear. The **information layer** (where is it, what is it, what does it say) is objective, enumerable, language-independent — AI's absolute home turf, where it can be more complete, faster, and more tireless than you. The **knowledge layer** (what does this mean for me, how does it connect to what I already know, where does it contradict) starts mixing in the variable "me." The **action layer** (what do I do about it, which bet do I take, what do I drop) is almost entirely "me."

The further down you go, the more it depends on the thing sitting in your head that can't be exported to a model: your goals, your situation, your risk appetite, the pits you've fallen into before.

A concrete case. Say two items land in the system the same day: a mainstream framework ships a major version and the whole internet is reposting it; and some library nobody watches quietly changes a default timeout value in its changelog. **Any system ranking by generic importance puts the first at the top and buries the second at position 80 or filters it out entirely — and it isn't wrong. By any objective standard the first one matters more.** But if I happen to be chasing a bizarre timeout bug this week, the second is worth a hundred times the first to me. The model doesn't know what I'm doing this week. And even if I write "I'm debugging timeouts" into the prompt, it doesn't know that I fell into an almost identical pit last month and therefore have a reflexive alertness to changes of exactly this kind — **I couldn't fully put that into words myself, so how would it ever get into a context window?**

That's why I say **this isn't a problem of the context window being too small; this context isn't in any window at all.** No window, however large, can hold what was never written down — and it's precisely the unwritten part that constitutes judgment.

You can feed it *part* of your judgment (that's the work of the second half), but the moment you truly hand over the final call, you take on **compounding error**. That phrase is worth doing the arithmetic on, because it's deeply counterintuitive.

Say your pipeline has five steps: fetch → judge relevance → extract key points → cross-check → conclude. Each looks fine on its own at 95% accuracy — a number you'd happily brag about on any benchmark. But they're chained:

```
95% per step, 5 steps:   0.95^5  ≈ 77%   → roughly 1 in 4 runs drifts
95% per step, 10 steps:  0.95^10 ≈ 60%   → roughly 2 in 5 drift
99% per step, 10 steps:  0.99^10 ≈ 90%   → still 1 in 10 drifts
99% per step, 50 steps:  0.99^50 ≈ 61%   → long runs drift, guaranteed
```

The multiplication is merciless. **Pushing a single step from 95% to 99% — an enormous capability leap, possibly a full model generation — buys you a five-step chain going from 77% to 95%. And the moment the chain gets long, 99% still can't hold.** Worse: an agent that ran all night doesn't hand you "a 77% conclusion." It hands you **a report that looks 100% complete, internally consistent, and beautifully formatted**, and you have to go find where the 23% is hiding. Finding it often costs more than doing the work yourself.

This is also why the hardest part of the "overnight agent" has never been execution — it's **trust**. The real fix isn't waiting for stronger models (multiplication doesn't become addition just because the base went up); it's inserting checkpoints into the chain, cutting long chains into short ones, and letting uncertain spots stop and ask a human. I took apart the trust question separately in [the essay on unattended agents](../trusting-unattended-ai-agent/), so I won't expand it here.

So the ceiling is structural: **the information layer can go unmanned, the knowledge layer needs human-in-the-loop, and the final call at the action layer shouldn't — and can't — be handed off any time soon.** Automation that only covers the information layer, however beautifully built, naturally stops at the bookmark folder. Not because it's unfinished, but because that's where its boundary is.

## An honest caveat

I should stop here to keep you from reading this as "AI news tracking is useless." **The opposite.**

Cutting access to zero is the single biggest dividend on the information side in years. Noticing latency compressed from days to minutes, attention cost cut by more than half — that's real, spendable efficiency, and I live on it every day. **The only cold water I'm throwing is this: don't want automation and also expect it to make the call for you.** One is its home turf, the other is its exclusion zone. Confuse the two and you'll be disappointed in it and afraid to let go of it at the same time, which leaves you nowhere.

The right posture is to treat it as **a tireless, always-on, language-independent intelligence outpost.** Its job is to put what you should know in front of you at the lowest latency and lowest attention cost. The last mile — read, judge, decide — you keep for yourself, gladly. **It does 98.4%, you do the critical 1.6% — and that 1.6% is judgment, the one irreplaceable part of the whole pipeline.**

## So how should you build it today: a checklist

Enough about boundaries; it should turn into actions in your hands. What follows is what survived six months of my own tuning. You can copy it directly.

**First, draw the line: what goes to it, what stays with you.**

| Give to automation (let go) | Keep for yourself (don't outsource) |
|---|---|
| Fetching, dedup, translation, filing, tagging | Judging "does this matter to me right now" |
| Full-text snapshots, archiving, making it searchable | Deciding "should this change something I'm doing" |
| Change diffs, discovering new sources | Making irreversible calls |
| Generating structured summaries (key points + source link) | Colliding conclusions with what you already believe |
| Piling a to-read queue by topic | Admitting defeat and deleting what you never should have read |

**Answer four questions before you build.** I've watched too many people (myself included) enthusiastically build the system first and only afterward discover they can't answer these:

1. **What concrete decision are you tracking this field for?** If you can't answer, you don't need an intelligence system; you need to first figure out what you're doing. Tracking in order to "stay informed" is automation's most classic waste — it lets you waste time with extraordinary efficiency.
2. **How often is often enough?** For most fields, once a day is more than plenty; for many, once a week loses you nothing. **When you compress latency from a day to a minute, what you usually compress isn't latency — it's your focus.** Don't use a real-time architecture to solve a weekly problem.
3. **What does missing one cost you?** If the answer is "not much" (usually it is), stop chasing completeness and chase precision. Completeness and precision are an explicit trade-off in information systems, not a both-please.
4. **After you read, where does your output go?** Input with no outlet is hoarding. This one matters most; next section.

**Concrete engineering moves, ordered by payoff:**

- **Attach a one-sentence "why you're seeing this" to every item.** Not a summary — a reason: "because you were looking at X last week." The value of that sentence isn't accuracy (it's often wrong); it's that **it lets you decide at a glance whether to read, dropping the cost of judgment from "read it and find out" to "glance at the reason."** Highest ROI change I've made.
- **Put cheap filters in front of expensive ones.** Covered above; won't repeat.
- **Keep the source link and a snapshot, forever.** Summaries are lossy compression, and you will eventually need the original. Sources also vanish, get edited, get deleted.
- **Put a hard cap on "to read."** Say 20 items a day max; over that, something has to be pushed out. **A queue with no cap isn't a queue, it's a landfill** — it will reliably supply guilt, not information.
- **Have the system log your "read / skipped / acted on."** It's the only signal you might ever use for personalization, and it's useful right now: look back after a month and you'll find sources you've never once opened. Delete them.
- **Force a source cull every month.** A source list only grows monotonically unless you intervene. My rule is blunt: any source that didn't get a single click out of me in a month gets deleted.

**Anti-patterns** — I've personally stepped on all of these:

- ❌ **Chasing coverage.** "I want to track everything" is a judgment problem disguised as an engineering problem. The more completely you track, the more judgment you owe, and the faster you collapse.
- ❌ **Real-time push.** Push is the way to optimize noticing latency to its limit, and the price is your attention shredded into fragments. **You paid a full day of deep work to know something two hours earlier.** Unless your role genuinely lives on knowing two hours early (very few do), batch it, schedule it, read it in one pass.
- ❌ **Letting the model score "importance" and sorting by that.** It ranks generic importance, not importance to you — argued above. You get a beautifully sorted list whose top items are all things you don't need — **and because it looks professional, you're more inclined to trust it, which is worse than having no ranking at all.**
- ❌ **Letting an agent write the daily digest and reading only the digest.** Compounding error, plus you lose all contact with the source. Run that for three months and you'll find your instincts for the field decaying — you've been reading a model's secondhand understanding, not the field itself.
- ❌ **Treating the system as the output.** I've seen (and been) too many people who spend enormous time making the pipeline prettier instead of using what it produces. **However smoothly the pipeline runs, it isn't your work.** A crude system you use daily beats a refined system you maintain.

## Forecast for the second half

The first half gave us the explosion of information automation. Based on six months of watching, I'll make three calls about the second half.

**One: information automation keeps improving, then converges, then becomes a utility.** Gathering, translation, summarization, aggregation, dedup — that whole stack will commoditize fast, until everyone has it and everyone's is the same. Once anybody can do a thing with one click, it stops being an advantage and becomes infrastructure. **The window where "I have a system that auto-tracks the news" put you ahead is closing in the second half.**

It isn't only "everyone learned how" pushing this. There's a harder force: **cost.** The two most expensive steps in this pipeline — summarization and vector near-duplicate — happen to be the two most standardized, the two that least need a frontier model. When open-model inference cost collapses, "process the entire internet in full" goes from "needs a budget" to "just run it." At that point coverage as a moat goes to exactly zero: **what you can track, everyone can track, at a cost so low nobody bothers to advertise it.** Where the cost line goes, and how large an agent fleet one person can therefore feed, I worked out in [the essay on open-model cost collapse](../open-model-cost-collapse-agent-fleet/).

This is also what I was getting at in [the red-ocean/blue-ocean essay](../ai-agent-red-ocean-blue-ocean-2026/): pure information-layer products are piling into the red ocean together. There's a lazy test for whether a product is in it — **read its marketing. If it's bragging about how many sources it covers, how many seconds of latency, how many languages it supports, it's in the red ocean, because all three are utilities and will be cheaper next year. If it's bragging about how it knows this item matters to you, it's at least standing in front of the right problem.**

**Two: the genuinely scarce skill is wiring automation's output into judgment and action — closing the loop.** The winners of the second half won't be the people tracking most completely; they'll be **the people who convert "knowing" into "judging" efficiently, and "judging" into "acting."** The shorter and more reliable your loop, the harder your compounding. Automation shoving a flood of information at you is only the starting line; what you have to build is a private pipeline that feeds the information layer's output straight into your own knowledge and action layers — which is exactly where the super individual's moat sits. I take that pipeline apart in more detail in [The Super Individual's Intelligence System](../super-individual-intelligence-system/).

Worth noting: the first move of the loop probably isn't yours. Go back to that funnel — **the cut from 240 to 10 is yours alone to make because the system is waiting for you to look. What if it stopped waiting and pushed those 10 at you instead?** That's the subject of the second essay in this column: agents going from you prompting them to [them prompting you](../proactive-agent-it-prompts-you/). That step doesn't solve judgment (judgment stays yours), but it removes the precondition that you have to remember to look. **It's the first finger automation extends into the judgment layer.** And precisely because it reaches into territory that was yours, its failure mode is unlike every engineering problem above — not a miss, not an error, but an interruption.

**Three, the one most likely to be missed: the new metric worth building in the second half is judgment hit rate.** Nearly every information system optimizes coverage and latency — how completely, how fast. Both are near their ceiling already. **What actually deserves quantifying in the second half, and almost nobody quantifies seriously, is judgment hit rate: of the judgments you made off this information, what fraction turned out right?**

Put the three side by side and the gap is glaring:

| Metric | Optimizing for | Who measures it | Near its ceiling? |
|---|---|---|---|
| Coverage | Tracking completely | Everyone | Nearly, and free next year |
| Latency | Knowing fast | Everyone | Nearly, and free next year |
| **Judgment hit rate** | **Whether it made you do the right thing** | **Almost nobody** | **Nowhere near** |

And this one **is measurable today; it needs no new technology.** Its barrier isn't engineering, it's honesty — you have to be willing to write your judgment down and then accept getting slapped by it. The crudest method suffices: every time a piece of information leads you to a judgment ("this direction is worth investing in," "this tech is hype," "I need to steer around this pit"), write it in one sentence with the date, attached to the item that triggered it. Three months later, go back and mark each one right or wrong.

Almost everyone gets hit by the results the first time — when I first went back, I found a good share of my judgments simply unjudgeable, because I'd written them too vaguely ("this direction is interesting" — interesting how?). **Just being forced to phrase a judgment so it can be checked later is already most of the value of the exercise.** The rest of the value: after a few rounds you start seeing patterns — that you're systematically over-optimistic about a certain class of problem, say, or that you believed one source ten times and it was wrong seven.

This is the most fundamental and most counterintuitive dimension. It measures not how much information the system gave you, but whether that information ultimately made you **do the right thing**. Whoever wires it into the loop first is more than one length ahead.

One line to close the second half: **the information layer becomes a free utility; everything valuable migrates to the judgment and action layers.**

## Closing: it knows for you, it can't think for you

Back to the question at the top: if you let an AI track an entire field for you, how far does it get?

The answer: **it can go the whole distance of "knowing," then hands the baton back at the doorway of "figuring it out."** That isn't a failure, it's a division of labor. The first half fully outsourced "knowing" to machines, which is a remarkable advance. But precisely because knowing got so cheap, figuring it out has for the first time become so expensive and so scarce.

Information is worthless; the ability to process it is what's valuable. When all the world's information can land in front of you at nearly zero cost, **every last bit of the gap between you and everyone else lands on what you do with it.** In the first half, AI won the information war for us. In the second half, the real battlefield is judgment — and for now, that one you still have to fight yourself.
