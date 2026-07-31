---
title: 'When the AI Agent Starts Prompting You, What Has Actually Changed'
date: 2026-07-15T12:00:00+08:00
lastmod: 2026-07-31T00:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Agent
  - Harness Engineering
  - Product Strategy
  - Context Engineering
description: >
  A practical framework for proactive AI agents: memory, runtimes, triggers, interruption budgets, human approval, and the discipline to stay quiet by default.
categories:
  - Development
tldr:
  - >-
    Proactive interaction is a useful next shift after command- and chat-led tools: the agent can read permitted context and decide when a suggestion deserves your attention.
  - The point of proactive isn't a flashy feature. It's the line where an agent stops being a passive tool and becomes an active partner, rewriting the division of labor from "you drive it" to "it drives your attention."
  - Standing a proactive agent up takes three foundations, persistent memory, an agent runtime or sandbox that is isolated, durable, and long-running, and event triggers.
  - Interruption has a budget. A team should begin with a conservative speak-up policy, measure outcomes, and tune the threshold against the user's actual re-entry cost.
  - My forecast for the second half is that "proactive" becomes a crowded label. Products that cannot distinguish a useful signal from an expensive interruption will struggle to retain trust.
  - Proactive is not the same as autonomous decision-making. Irreversible actions still require a human in the loop. Safety lives in the harness, not in the model's discretion.
maturity: budding
columns:
  - ai-2026-review-forecast
series:
  name: 'AI 2026: First-Half Review, Second-Half Forecast'
  slug: ai-2026-review-forecast
  order: 2
  total: 5
cover:
  image: /images/covers/ai-agent/2026/proactive-agent-it-prompts-you.jpeg
  alt: 'When the AI Agent Starts Prompting You, What Has Actually Changed'
---

## A counterintuitive signal: it starts prompting you

Start with a question. Suppose one day you open your workspace and the agent isn't sitting there quietly waiting for your next command. It speaks first: "I noticed section three of yesterday's proposal is still unfinished. I drafted something in the voice you used last week — want to take a look now?" Is that thoughtful, or is it presumptuous?

Over the past six months I've noticed a counterintuitive signal while following agent launches, primary sources, papers, and benchmarks: more products are experimenting with agents that do not wait for the next instruction. They use available context, estimate what is worth doing, and bring a suggestion forward.

Gimmick, or inflection point? My working thesis is that this is a meaningful shift in agent product form. It sounds like a small upgrade to notifications, but follow it down and it rewrites the question of who directs whose attention. This piece works through what holds that shift up, why the label may spread faster than the craft, and why interruption is its real enemy.

## A timeline: from "you command it" to "it prompts you"

To see where proactive sits, you have to lay out the history of agent interaction. I like to compress it into a minimal timeline:

```
AI agent interaction paradigms

   CLI-style          Chat-style         Proactive
       │                  │                  │
 you → exact cmd    you → plain words   it → reads your context
       │                  │                  │
 "run --flag x"     "refactor this"     "three things worth doing
                                         today; one I've drafted"
       │                  │                  │
  human judges all    human gives intent   it judges first,
  machine executes    machine fills in     human vetoes or accepts
       │                  │                  │
 ────●─────────────────●──────────────────●──────▶
  who drives whom:    you drive it        it starts driving
                                          your attention
```

The first stage is CLI-style. You translate intent into commands the machine can eat, and one wrong flag gives you a different result. Control is one hundred percent yours; the price is that you bear the entire translation cost. You have to learn its language first.

The second stage is chat-style, the mainstream of the last few years. Natural language became the interface. You say "make this function more readable" and it fills in the details. The barrier collapsed, but one thing did not change: it is still waiting for you to speak. A chat-style agent is fundamentally a capable passive responder. Say nothing and it stays silent. Its value appears only when you remember to invoke it.

The third stage is what I'm calling proactive. The dividing line is that the subject changed: you do not always prompt it; sometimes it prompts you. Within the permissions you grant, it can use context such as your calendar, unfinished tasks, inbox, or the loose thread from your last conversation. Then it estimates what deserves your attention and either surfaces it or stays quiet.

Notice the pattern across these three interaction styles: each moves another piece of judgment from the human side to the machine side. In the CLI era humans made nearly every judgment. In the chat era humans supplied intent and machines filled in details. With proactive workflows, the machine begins making a meta-judgment about what may deserve attention now. This is not merely a reskinned interface; it is a redistribution of decision rights.

Put the three generations in a table and the thing you're giving up gets harder to ignore:

| | CLI-style | Chat-style | Proactive |
|---|---|---|---|
| Who initiates | You | You | **It** |
| Translation cost you pay | High (learn its language) | Low (just talk) | Near zero |
| Judgment the machine carries | None | Details | **"What should happen now"** |
| Shape of failure | An error (loud) | A bad answer (you see it) | **An interruption (it costs you even unseen)** |
| Who pays for failure | You, immediately | You, immediately | **You, continuously and on a lag** |
| Its value when you're not using it | Zero | Zero | **Still accruing** |

The last two rows are the real point. The first two generations fail on the spot: a bad command errors out, a bad answer is visible at a glance, you fix it and move on. Proactive is different—it can fail while you are not looking, and the bill still lands on you. A chat-style agent you never open wastes a subscription. A proactive agent you never open may still be deciding whether to interrupt you. Working while you are absent is both the source of its value and the source of its risk.

## Three foundations hold proactive up

I've seen products turn "proactive" into a scheduled popup that asks, at 9:00 every morning, "anything I can help with today?" That is an alarm clock, not contextual judgment. A genuinely proactive agent needs three foundations under it.

The first is persistent memory. An agent that only lives inside a single session cannot know what you were wrestling with yesterday, so it has little basis for deciding what deserves attention today. Proactive judgment depends on context across time: your preferences, the thing you keep postponing, the decision you deferred last week. I've written about how persistent memory supports a personal intelligence system in [The Super Individual's Intelligence System](/ai-agent/posts/super-individual-intelligence-system/), so I will not repeat it here.

The second is an agent runtime, or a sandbox. Runtimes and sandboxes are becoming a distinct infrastructure layer: isolated, durable environments for code, files, and agent sessions. Proactive work implies that something can continue while you are not watching. The runtime provides that presence: isolation so a failure does not take your main environment with it, durability so state does not evaporate when you close the tab, and enough lifetime to follow a task for hours or overnight.

The third is event triggers. The first two solve "it remembers" and "it is present." Event triggers solve "when does it reconsider?" An email arrives, a PR merges, a meeting approaches, or a metric crosses a threshold. Without signals, an agent falls back to polling or a timer.

There is a pit worth calling out: "an event happened" is not the same as "you should speak." Between those two sits a filtering layer. Wiring event input straight to notification output produces a reskinned webhook forwarder. The useful chain has at least four segments:

```
The four segments of an event trigger (most products build only ① and ④)

  ① Event         ② Relevance     ③ Timing        ④ Speak
  ─────────       ─────────       ─────────       ─────────
  PR merged   →   does it bear →  are you in   →  prompt / swallow
  email in        on this          a meeting?
  metric fires    week's focus?    deep work?
     │              │                │              │
  objective       needs memory    needs state     needs a
  (cheap)         (medium)        awareness       threshold
                                  (hardest)       (policy)
     │              │                │              │
  ───●──────────────●────────────────●──────────────●───▶
   is there       does it          is now          say it
   a signal       matter           the moment      or not
```

Segment ① is cheap; webhooks and APIs have been mature for years. Segment ② can draw on persistent memory. The difficult part is segment ③: how would it know whether you can be interrupted right now? A calendar that says "free" does not mean you are free; you might be thirty minutes into untangling a piece of logic. The available signals are thin: calendar state, recent activity, response latency, and the times when you usually protect deep work. Products that model timing seriously still appear uncommon. Skip it, and the next section's bill arrives.

Only with all three foundations together do you get a loop that can read context, judge, and speak at an appropriate moment. As of July 2026, concrete products do support parts of this pattern: ChatGPT Scheduled Tasks can run one-off or recurring work and monitor for meaningful changes, while Codex Automations can run recurring coding workflows and return results for review. These are evidence that scheduled and monitored agent work is being productized, not proof that every such feature has the memory, timing judgment, or restraint described in this essay.

The three foundations reinforce one another. Without memory, presence means judging from thin context. Without a runtime, memory cannot support work while you are away. Without triggers, the other two fall back to polling or a timer. A scheduled notification may still be useful, but it should not be confused with context-aware initiative.

## What it rewrites is the division of labor, not just the interaction

Pull the camera back. The weight of that timeline is not simply that interaction became more convenient. The default direction of the human-machine division of labor has begun to flip.

The chat-era split was: you drive it. You are the engine; the agent moves when you hit the gas. Its practical reach extends only as far as your attention. Forget to use it and it creates no value. That model has a ceiling because the agent's usefulness is pinned to your attention bandwidth.

Proactive systems try to break that ceiling. Their offer is to help allocate attention: scan a surface you cannot cover, filter what may matter, rank it, sometimes finish part of it, and then hand it to you.

The weight of this only lands if you put it next to the line I keep repeating: **information is worthless; the ability to process it is what's valuable.** A chat-style agent helps you process information you've already decided to process. A proactive agent helps you decide **which information is worth processing** — it moves one notch further upstream in the value chain. Whether that notch is placed well is exactly where proactive products separate from each other, and it's the deciding factor of the second half.

## The overnight agent as a live case

Three foundations in the abstract stays vague, so let me ground it in a scenario I use constantly: **the overnight agent.**

The traditional version goes like this: before bed you hand the agent a pile of work; in the morning it gives you a long list of "here's what I finished" — and then you read the whole thing top to bottom, deciding what's usable, what went sideways, what needs redoing. **Note that in this model the initiative is still yours.** You assigned the work before bed; the agent just shifted execution into the night. It's diligent, but it's passive.

A proactive overnight agent is different. Persistent memory tells it what you've been busy with and where you're stuck. The runtime keeps it present and running after you fall asleep. Event triggers wake it when something actually moves. So what you get in the morning is **not a pile of to-dos, but a sentence: "Given your focus this week, three things are worth doing today. The most urgent one I've drafted in your usual voice — glance at it, tweak two lines, and you can send it."**

Feel the difference. The first delivers **execution**, and you still have to do the judging. The second delivers **judgment plus half-finished execution**, and you only have to veto or accept. The first saves your hands. The second saves your head. And your head is the scarce thing.

There's a caveat I have to add, though, before this reads like a fairy tale.

## An honest aside: it isn't that pretty

Let me be clear: **that scene of waking up to three things worth doing is, today, more aspiration than steady state.** In my own use of proactive workflows, things go wrong routinely.

The most typical failure is **bad judgment**. Of the "three things most worth doing today" it hands you, a meaningful fraction are its own ranking errors — it puts something that could wait a week at the top and misses what's actually urgent. Underneath is compounding error: read the context slightly wrong, then rank priorities slightly wrong, and two small errors stack into a suggestion that's pointed in the wrong direction entirely. I took apart this kind of failure chain in [part 1](/ai-agent/posts/ai-auto-news-pipeline-limits/) — every additional automated decision in an information pipeline multiplies the error again, and proactive adds one more link to that chain.

There's a subtler problem too: **the value of proactive depends heavily on how well it knows you, and that knowledge takes time to accumulate.** A proactive agent two days into your workflow is, most likely, harassment — it hasn't banked enough context about you, and it's making judgments on your behalf from thin signals. It has to grind alongside you long enough for proactivity to shift from annoying to worth it. Which means proactive products have a long cold-start period during which the experience is net negative — and I think most product managers underestimate that badly.

The cold start is lethal precisely because it collides with a bill few people have actually added up.

## Adding up the cost of interruption

"Interruption cost is underestimated" is a truism unless you do the arithmetic. So let me try.

The model below is what I use to set thresholds for my own proactive workflows. **It isn't a rigorous academic model; the parameters are my own gut estimates**, and you should swap in your own numbers. The point I'm making is this: **once you're willing to fill in the parameters honestly, you'll find that "should it speak" isn't a matter of feel at all. It's arithmetic, and the answer is wildly counterintuitive.**

Define both sides.

**The gain from one good prompt**, call it `G`. What it saves you is the time you'd have spent noticing the thing yourself, plus a small discount for the risk of nearly missing it. By my own estimate, one genuinely accurate prompt is worth something like 5 to 15 minutes. Take the median: **G ≈ 10 minutes**.

**The cost of one bad interruption**, call it `C`. Here's the crux — **most people estimate C as "glance at it, dismiss it, 30 seconds," and that's where they're most wrong.** C has at least three parts:

```
The real cost C of one bad interruption

  ① Handling cost    read it, decide it's useless, close   ≈ 0.5 min
  ② Re-entry cost    getting back to where your head was   ≈ 10~20 min
                     (if you were in deep work)
  ③ Trust discount   next time it speaks, your default     ← not priceable
                     reaction drops a notch                   in minutes,
                                                              but it's the killer
  ─────────────────────────────────────────────────────
  priceable part C ≈ 0.5 + 15 ≈ 15 min (during deep work)
                   ≈ 0.5 + 1  ≈ 1.5 min (when you were slacking anyway)
```

Part ② is the systematically ignored heavyweight. **The cost of an interruption isn't how long you spent reading it. It's which state it dragged you out of.** The same prompt, fired while you're scrolling your phone, costs roughly nothing. Fired thirty minutes into untangling a piece of complex logic, it costs that half hour. **The same prompt can differ in cost by more than twentyfold depending on the moment** — which is precisely why segment ③, timing, is both the hardest and the most valuable.

Now finish the arithmetic. Let `p` be the agent's judgment accuracy — the fraction of things it thought worth prompting that, in hindsight, actually were. The expected value of each time it speaks is:

```
E = p × G − (1 − p) × C

With G = 10, C = 15 (assume it interrupts while you're focused):

  p = 0.5  →  E = 5 − 7.5   = −2.5   min   ← net loss
  p = 0.6  →  E = 6 − 6     =  0     min   ← exactly break-even
  p = 0.7  →  E = 7 − 4.5   = +2.5   min
  p = 0.8  →  E = 8 − 3     = +5     min
  p = 0.9  →  E = 9 − 1.5   = +7.5   min
```

In this illustrative parameter set, a 60% hit rate merely breaks even. Change `G` or `C` and the boundary moves; that is the point. A team should measure the value of a useful prompt and the re-entry cost of a bad one rather than treating model confidence as a universal product threshold.

That leaves the trust discount. It is nonlinear and cumulative: a mistake can lower your willingness to inspect later prompts. In my own use, a short run of pointless interruptions is enough to change my default reaction from "let's see" to "not this again." Once the channel is muted, later accuracy no longer matters.

So the real formula looks more like this:

```
E_real = p × G − (1 − p) × C − trust_discount(consecutive errors)
                                └─ once this term fires,
                                   the first two go to zero
```

That is the asymmetry: gains accrue one prompt at a time, while trust can fall much faster. The exact curve varies by user and task, but the design implication is stable: preserving the channel matters more than maximizing notification volume.

One operational conclusion follows: begin with a conservative speak-up threshold and lower it only when observed outcomes justify the change. Proactive prompting is not an ordinary balanced classifier because false positives and false negatives carry different costs. A missed suggestion forfeits a possible gain; a needless interruption imposes a visible cost and can damage the channel itself.

So a proactive product should behave like someone sparing with words. Frequency is contextual, not a universal daily quota; what matters is that each interruption earns its place. Users who mute a noisy agent are not rejecting assistance. They are protecting the conditions under which assistance remains useful.

## Second-half forecast: proactive becomes a buzzword, and a wave dies first

Now to the point of this column: **the forecast.**

Mine has two layers.

First, I expect proactive interaction to become one of the louder product narratives of the second half. The visible arrival of scheduled and monitoring workflows makes the label easy to copy into a slogan. That is a forecast about product language, not evidence that the three foundations are already solved.

**Second—and this is the claim I would watch rather than treat as fact—I expect retention to expose products that underestimate interruption cost.** The recurring failure mode will be treating "being able to speak first" as the goal when the real skill is acting with restraint.

The model above explains the risk without predicting a universal hit rate. During cold start, an agent has little personal context and relies on generic priors. Yet this is often when a product is most tempted to demonstrate activity. The incentives point in opposite directions: cold start should be the most restrained phase. A noisy product may lose the user's channel before it gathers enough feedback to improve.

So my call for the second half is a personal one: the moat for proactive is not whether it dares to speak, but whether it knows when to stay quiet. Products that turn initiative into an information waterfall will be easy to mute. The harder product question is not "can it prompt?" but "should it prompt now?" Model quality matters, but memory design, trigger policy, timing signals, and feedback loops determine whether that judgment reaches a user at the right moment. In my shorthand: the harness earns the right to interrupt.

## A boundary worth nailing down: proactive ≠ autonomous decisions

Forecast delivered, I want to nail a boundary down immediately, so this piece doesn't get read as cheerleading for letting agents do whatever they want.

**Proactive is emphatically not autonomous decision-making.** The two get conflated constantly, but they're separate dimensions. Proactive is about **who initiates** — does the agent speak first, or do you? Autonomous decision-making is about **who calls it** — does the agent just execute, or does it wait for your nod? **An ideal proactive agent should be extremely proactive about initiating and extremely restrained about calling it.**

Concretely: let the agent scan, judge, draft, and put options in front of you — all good, that's exactly where its value is. But any **irreversible action** — sending the email, moving the money, changing a production config, deleting a record — **must stop at the HITL gate and wait for you to open it by hand.** Proactive gets the agent right up to the goal line, but whether to take the shot, and where to aim, stays welded to human hands wherever reversibility is in doubt.

Behind this is a principle I keep repeating: **safety lives in the harness, not in the model's discretion.** You can't count on a model to "know better" than to touch dangerous actions. Restraint is welded in by engineering constraints, held back by that HITL gate in the harness. It isn't a matter of hoping the model is in a good mood today. I've taken apart how you can ever be comfortable running an agent unattended, and how the trust proactive requires gets engineered layer by layer, in [part 4](/ai-agent/posts/trusting-unattended-ai-agent/) — proactive is really a further step of unattended trust, because it asks you to trust not just the agent's execution but its judgment. The bar only goes up.

For proactive to genuinely close the loop, the loop isn't the technical one of sense-and-execute. It's the collaboration loop of sense, judge, and speak to a human at the right moment, in the right way, about the right thing. The technical loop is easy to close. The human loop is hard, and the difficulty is entirely in the word "right."

## Putting it to work: a checklist

That's a lot of reasoning; here's something you can use directly. Two lists below — one for building or choosing a proactive agent, one for spotting the fakes.

**If you're building a proactive agent, do these seven things in order:**

1. **Make "stay quiet" the default.** Your harness should have a backstop rule: swallow every signal by default, and escalate to a prompt only when something explicitly clears the threshold. Do it the other way — prompt by default, suppress in special cases — and you'll be patching forever.
2. **Estimate p for every prompt, and log it.** Not the confidence the model outputs (that number is chronically inflated), but the **hit rate in hindsight**. Without that number, every threshold you set is a guess. This is the same quantity as the [judgment hit rate](/ai-agent/posts/ai-auto-news-pipeline-limits/) from part 1; here it measures "should it have spoken," there it measured "did it filter well."
3. **Start with a conservative threshold and walk it down, rather than beginning noisy and correcting later.** The failure mode of the first is "it is a bit quiet." The failure mode of the second is "the user has muted it." Record the initial value as a product hypothesis, not a universal constant.
4. **Make "can you be interrupted right now" a first-class citizen, not an afterthought.** Even the crudest signals — is there a meeting on the calendar, has there been keyboard activity in the last ten minutes, is this historically a deep-work window — beat nothing. This is segment ③ of that four-part chain, the hardest one. Build it and you're ahead of most.
5. **Tier your prompts; don't push everything through one channel.** At least three tiers: things that can batch up until your next natural break, things worth a chime now, and things that must interrupt you immediately. Most things belong in the first tier, and most products treat everything as the second.
6. **Leave a very cheap feedback path.** When a user dismisses a prompt, you need to distinguish "this was useless" from "this was useful but not now." The fixes are completely different: the first tunes relevance, the second tunes timing. Conflate them and you'll apply the wrong medicine.
7. **Every irreversible action stops at the HITL gate.** No exceptions; the reasoning is in the section above.

**Conversely, these five are fake proactive, and you can rule them out on sight:**

- **The scheduled greeting.** Asks "anything I can help with today?" at a fixed hour. That's an alarm clock, not an agent — it hasn't even built event triggers, the cheapest piece.
- **The webhook forwarder.** Event in, notification out, with no relevance or timing filter in between. You wanted an assistant; it gave you a message queue.
- **The amnesiac.** Starts suggesting things on day one. It knows nothing about you and is already judging on your behalf. That isn't proactive, it's reckless.
- **The monotonically increasing.** Prompts only ever go up, with no mechanism for learning to shut up. It treats activity as a health metric, and activity is the single most harmful north star for proactive.
- **The overreacher.** Reads "proactive" as "just does it without asking." This is the most dangerous, because it blurs exactly the boundary the previous section nails down — it swaps proactive initiation for proactive decision-making.

One line captures the criterion behind both lists: **look at whether anyone did engineering work on shutting up.** If they did, it earns the name.

## Closing: from waiting for you to speak, to understanding what you didn't say

Writing this out, I find myself a little moved by it.

Look back at the three steps — CLI, chat, proactive — and they trace a curve about machines understanding you better. In the CLI era, the machine understood only what you said exactly. In the chat era, it started understanding what you said casually. With proactive, it has to start understanding what you **didn't say** — the thing you're quietly agonizing over, the thing you're about to miss, the thing you should be doing most.

That's exciting and worrying at once. Exciting, because if it actually works, each of us gains a partner who is always present and always watching the whole board, and attention, the scarcest resource, gets massively amplified. Worrying, because something that understands what you didn't say will, once its judgment tilts or its restraint slips, seep its distortion into you at exactly the same depth. The better it knows you, the more its mistakes hurt.

So my stance on proactive is hopeful but reserved. The curve from "waiting for you to speak" toward making sense of permitted context is already visible. My forecast is that the label will get louder before the craft gets better. The useful products will be the ones that treat "should it speak?" as seriously as "can it act?"

And as a user, here's a reminder I'm leaving for myself as much as for you: **when the agent starts prompting you, don't rush to comply and don't rush to mute.** What's valuable was never the judgments it generated for you. It's your own judgment about whether to accept or veto them. Information is worthless; the ability to process it is what's valuable — and in the proactive era, push that line one notch further: now that even **judgment** is being handled for you, **the ability to decide whether to trust that judgment is your last moat, and the one you should never outsource.**

## Sources

- [OpenAI Academy: Codex Automations](https://openai.com/academy/codex-automations/) — recurring Codex work can run on schedules and return results for review.
- [OpenAI Help Center: Scheduled Tasks in ChatGPT](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt) — documents one-off and recurring tasks, monitoring for meaningful changes, notifications, and current product limits.
- [OpenAI: Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/) — describes background scheduled automations and a review queue for completed results.

Product details checked on 2026-07-31. The article's interruption model, product-design thresholds, and second-half forecast are my analysis, not claims made by these sources.
