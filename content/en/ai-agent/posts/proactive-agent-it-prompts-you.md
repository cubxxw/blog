---
title: 'When the AI Agent Starts Prompting You, What Has Actually Changed'
date: 2026-07-15T12:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: [proactive agent, AI agent interaction paradigm, agent runtime, agent sandbox, overnight agent, persistent memory, human-AI collaboration, AI agent product design, event triggers, harness engineering, HITL, context engineering, interruption cost, proactive assistant]
tags:
  - AI
  - LLM
  - Agent
  - Harness Engineering
  - Product Strategy
  - Context Engineering
description: >
  The counterintuitive signal of the past six months is that a growing number of AI agents no longer wait for your instruction. They read your context and prompt you instead. This essay places the proactive agent inside the third migration of interaction paradigms, from CLI-style to chat-style to proactive, takes apart the three foundations it needs, persistent memory, an agent runtime, and event triggers, offers an interruption budget model and a speak-up threshold you can apply directly, and makes a forecast for the second half, proactive will become a buzzword, but a wave of these products will die first, because the cost of interruption is badly underestimated and the tradeoff between trust and interruption is the real dividing line.
tldr:
  - AI agent products are going through their third paradigm shift, from CLI-style where you issue exact commands, to chat-style where you prompt in natural language, to proactive, where the agent reads your context and prompts you.
  - The point of proactive isn't a flashy feature. It's the line where an agent stops being a passive tool and becomes an active partner, rewriting the division of labor from "you drive it" to "it drives your attention."
  - Standing a proactive agent up takes three foundations, persistent memory, an agent runtime or sandbox that is isolated, durable, and long-running, and event triggers.
  - Interruption has a budget. One bad interruption costs roughly what six to ten good prompts earn, so the speak-up threshold belongs above 0.8 confidence, not at 0.5.
  - Forecast for the second half, proactive becomes a buzzword and a wave of these products dies first, because interruption cost is badly underestimated. The real moat is the judgment to speak only when it matters.
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

Start with a question. Suppose one day you open your workspace and the agent isn't sitting there quietly waiting for your next command. It speaks first: "I noticed section three of yesterday's proposal is still unfinished. I drafted something in the voice you used last week — want to take a look now?" **Is that thoughtful, or is it presumptuous?**

Over the past six months I've noticed a counterintuitive signal. I try to read through every frontier agent launch, primary source, paper, and benchmark I can, and one trend keeps getting clearer: **more and more agents no longer wait for your instruction. They prompt you instead.** They read your context, decide what's most worth doing right now, and push it in front of you.

Gimmick, or inflection point? My read is unambiguous: **this is an inflection point, and it's the third paradigm shift in agent product form.** It sounds like a small upgrade to a notification feature, but follow it down and you'll find it rewrites the basic question of who drives whom. This piece is my attempt to work it through: where it came from, what holds it up, why I think the second half will see it catch fire and then burn out, and what its real enemy is.

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

The first stage is **CLI-style**. You translate intent into commands the machine can eat, and one wrong flag gives you a different result. Control is one hundred percent yours; the price is that you bear the entire translation cost. You have to learn its language first.

The second stage is **chat-style**, the mainstream of the last two or three years. Natural language became the interface. You say "make this function more readable" and it fills in the details. The barrier collapsed, but one thing didn't change: **it's still waiting for you to speak.** A chat-style agent is fundamentally a very smart passive responder. Say nothing and it stays silent forever. The intelligence is real, but it only exists in the moment you remember to invoke it.

The third stage is what I'm calling **proactive**. The dividing line is that the subject changed — **you don't prompt it, it prompts you.** It reads your context continuously: your calendar, your unfinished tasks, what's piling up in your inbox, the loose thread from your last conversation. Then it decides what's most worth your attention right now and pushes it to you.

Notice the pattern across all three steps: **every paradigm shift moves a piece of judgment from the human side to the machine side.** In the CLI era humans made every judgment. In the chat era humans supplied intent and machines filled in details. With proactive, the machine starts making the meta-judgment of what you should be doing right now. This isn't a reskin of the interface. It's a redistribution of decision rights.

Put the three generations in a table and the thing you're giving up gets harder to ignore:

| | CLI-style | Chat-style | Proactive |
|---|---|---|---|
| Who initiates | You | You | **It** |
| Translation cost you pay | High (learn its language) | Low (just talk) | Near zero |
| Judgment the machine carries | None | Details | **"What should happen now"** |
| Shape of failure | An error (loud) | A bad answer (you see it) | **An interruption (it costs you even unseen)** |
| Who pays for failure | You, immediately | You, immediately | **You, continuously and on a lag** |
| Its value when you're not using it | Zero | Zero | **Still accruing** |

The last two rows are the real point. The first two generations fail **on the spot**: a bad command errors out, a bad answer is visible at a glance, you swear once, fix it, move on. Proactive is different — **it fails while you aren't looking, and the bill lands on you anyway.** A chat-style agent you never open just wastes a subscription. A proactive agent you never open is still judging on your behalf, still deciding whether to poke you. That property of doing things while you're absent is both the entire source of its value and the entire source of its risk. Same coin. You don't get one side.

## Three foundations hold proactive up

I've seen too many products turn "proactive" into a scheduled popup that asks, at 9:00 every morning, "anything I can help with today?" **That isn't a proactive agent. That's a more annoying alarm clock.** A real proactive agent needs three hard foundations under it, and losing any one of them degrades it into a gimmick.

**The first is persistent memory.** An agent that only lives inside a single session cannot possibly be proactive — it doesn't even remember what you were wrestling with yesterday, so what business does it have deciding what you should do today? Proactive presupposes a long river of context about you across time: your preferences, the thing you keep postponing, the decision you deferred last week. Memory isn't a nice-to-have feature. It's the fuel for proactive judgment. I've written about how persistent memory holds up a personal intelligence system in [The Super Individual's Intelligence System](/ai-agent/posts/super-individual-intelligence-system/), so I won't repeat it here.

**The second is an agent runtime, or a sandbox.** This is a new infrastructure layer I've watched quietly take shape over the past six months. From what I've tracked, agent runtimes and sandboxes are becoming a distinct layer — an isolated, durable, long-running environment for code, files, and agent sessions. Why is this non-negotiable for proactive? **Because "proactive" implies "it has to be working while you're not watching."** If the agent only exists for the seconds your chat window is open, it can never watch something for you while you sleep. The runtime is what gives it presence while you're away: isolation so a crash doesn't take your main environment with it, durability so its state doesn't evaporate when you close the tab, long-running so it can stay with a task for hours or overnight.

**The third is event triggers.** The first two solve "it remembers" and "it's present." Event triggers solve "when does it speak." Proactive can't guess by polling. It needs to be woken by real events: an email arrives, a PR merges, a meeting approaches, a metric crosses a threshold. Events are the nerve endings of proactive. Without them, an agent can only interrupt you on a timer, like that 9 a.m. alarm.

There's a pit here that nearly everyone falls into, and it's worth calling out on its own: **"an event happened" is not the same as "you should speak."** Between those two sits an entire filtering layer, and the vast majority of products wire them straight together — event in, notification out. The result is an agent that's a reskinned webhook forwarder. The real chain has at least four segments:

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

Segment ① is free; webhooks and APIs have been mature for years. Segment ② runs on persistent memory and is manageable. **What stops everyone is segment ③ — how would it know whether you can be interrupted right now?** A calendar that says "free" doesn't mean you're free; you might be thirty minutes into untangling a piece of logic. The signals here are extremely thin: calendar state, whether you've been typing recently, how long you took to respond to the last prompt, whether this is historically a deep-work window for you. From what I've seen, the products that treat segment ③ seriously fit on one hand. Most skip it entirely and jump from ② to ④. **And the price of skipping segment ③ is exactly the bill the next section adds up.**

Only with all three foundations together do you get a complete loop that can read context, judge, and speak at the right moment. Over the past six months I have seen products embed a resident agent directly into team collaboration tools — no code from you, it just lives in your workflow and stays on call. That's a signal these three foundations are starting to get productized.

Worth noting why all three have to be there **at once**: they multiply, they don't add. Without memory, presence just means judging blindly. Without a runtime, all the memory in the world only exists for the seconds your chat window is open. Without event triggers, the other two can only ask you on a timer whether there's anything they can help with. **Any zero zeroes the product.** Which is why more than half the "proactive" products on the market are fake — they built the easiest piece, usually event triggers, and called it proactive.

## What it rewrites is the division of labor, not just the interaction

Pull the camera back. The weight of that timeline isn't that interaction got more convenient. It's that **the default direction of the human-machine division of labor flipped.**

The chat-era split was: **you drive it.** You're the engine; the agent moves when you hit the gas. Its capability reaches exactly as far as your attention goes. Forget to use it and all its intelligence is worth zero. That model has a hard ceiling — **the agent's value is pinned to your attention bandwidth.** You only get so many moments a day when you remember to hand it something. Past that, no model, however strong, can help.

Proactive is trying to break that ceiling. Its split is: **it drives your attention.** The agent stops waiting for you to allocate attention and starts helping allocate it — scanning the wide surface of information you can't cover, filtering out what's actually worth your attention, ranking it, sometimes finishing part of it, then handing it to you.

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

**Stare at the p = 0.6 row for three seconds.** A proactive agent with 60% judgment accuracy — which doesn't sound bad at all, well above guessing — **contributes exactly zero.** What it catches for you in a day and what it wastes for you in a day cancel out. You paid for it, installed it, fed it all your context, and got something that mathematically doesn't exist.

And that's before part ③, the trust discount. Add it and the conclusion gets harsher. The trust discount is **nonlinear and cumulative**: one mistake doesn't just cost that one prompt, it costs your default trust in **every future prompt**. In my own experience, two or three pointless interruptions in a row are enough to flip my default reaction to the next one from "let's see what it says" to "not this again" — and once it flips, **it can be right every time afterward and I still won't look. However high p goes, it never multiplies in.**

So the real formula looks more like this:

```
E_real = p × G − (1 − p) × C − trust_discount(consecutive errors)
                                └─ once this term fires,
                                   the first two go to zero
```

That's the mathematical shape of what I'd call the **brutal asymmetry**: **gains accumulate linearly; trust falls off a cliff.** Get it right a hundred times and you've banked a hundred small conveniences. Get it wrong three times in a row and all hundred are void — because the user has already muted you, and nothing you judge afterward reaches them.

**One operational conclusion follows: a proactive agent's speak-up threshold should not be 0.5. It should be above 0.8.** What's counterintuitive about that? Engineering habit says ship anything better than random — a binary classifier hits 0.6 accuracy and we call it production-ready. But proactive isn't a classifier. **Its false positives and false negatives cost wildly different amounts.** A miss (should have prompted, didn't) costs you one G at most, and you don't even know you missed it. A false positive (prompted when it shouldn't have) costs you C, and you **feel it, explicitly**. Felt pain is what burns trust.

**So a proactive product should behave like someone extremely sparing with words: better to miss than to nag.** An agent that speaks once a day and only when it counts feels reliable. An agent that pipes up twenty times a day feels intolerable within three days, even if its overall accuracy is higher. This isn't users being irrational — **quite the opposite. They're doing the expected-value math the crudest and most correct way.**

## Second-half forecast: proactive becomes a buzzword, and a wave dies first

Now to the point of this column: **the forecast.**

Mine has two layers.

**First, proactive will be one of the hottest product narratives of the second half.** That's close to certain. All three foundations are maturing fast: agent runtimes are being productized into a distinct infrastructure layer, persistent-memory approaches keep multiplying, event triggers have been mature engineering for years. Once the foundations are in place, "it prompts you" gets copied into countless slogans. You'll see a pile of products in the second half flying the banner of "you don't prompt it, it prompts you" — I've already seen the early signs.

**Second, and this is the part I want to press — this wave will see a die-off, and the cause of death will be highly concentrated: interruption cost was badly underestimated.** I'm close to certain most of the first wave will fall into the same hole: **they treat "being able to be proactive" as the goal, without realizing that "being proactive with restraint" is the actual skill.**

The math of that hole is in the last section: **at p ≈ 0.6, a proactive agent's net contribution is zero.** And 0.6 is exactly the accuracy band a new product sits in during cold start — it hasn't banked enough context about you, so its judgment runs on generic priors. **So the first wave of proactive products will all hit the same wall: during the period when they're least accurate, they're most desperate to prove they're useful, so they speak most often.** That combination is suicidal — cold start should be the most restrained phase, but the product manager tunes it to be the loudest, because it has to demonstrate how proactive it is. By the time it's finally figured you out three months later and p has climbed to 0.85, you muted and uninstalled it long ago. **It doesn't die of not being smart enough. It dies of not surviving long enough to get smart.**

The brutal asymmetry here is worth nailing down again: **every correct prompt a proactive product gives you is a small convenience; every wrong interruption is real irritation plus a bit of lost trust.** Convenience accumulates linearly; trust falls off a cliff. After a few pointless interruptions, the user's default reaction to the next prompt turns from "let's see what it says" into "not this again." Once it slides there, the product is dead, even if its judgment keeps getting sharper — nobody's looking anymore.

So my call for the second half: **the moat for proactive is not whether it dares to speak. It's whether it knows when to shut up.** The products that turn proactive into an information waterfall, itching to remind you three times an hour, will get muted and uninstalled one by one. The survivors will be the ones that speak once or twice a day at genuinely pivotal moments, and every time, you're glad they did. **The hard part of proactive was never the technical "can it prompt." It's the product question of "should it prompt."** That's a judgment problem, not a capability problem.

Which, incidentally, confirms the thing I keep saying — **an agent product is won or lost 98.4% in the harness and 1.6% in the model.** Baseline model intelligence will level out soon enough. The judgment of whether to interrupt you at this moment doesn't live in the model's weights. It lives in the harness you build around the model: how memory is designed, how trigger thresholds are tuned, which signals get escalated into a prompt and which get quietly swallowed. That scaffolding is the real moat.

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
3. **Start the threshold at 0.85 and walk it down, rather than starting at 0.5 and walking up.** The failure mode of the first is "it's a bit quiet." The failure mode of the second is "the user already uninstalled it." Those two errors differ in recoverability by an order of magnitude.
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

So my stance on proactive is both settled and reserved. **Settled that it's the direction**: the curve from "waiting for you to speak" to "understanding what you didn't say" doesn't reverse. **Reserved because I know the second half will be both loud and bloody**: a crowd of products will rush in, turn proactive into interruption, and die off one by one, leaving the rare few who actually thought through "should it speak" to become the substrate of how we work next.

And as a user, here's a reminder I'm leaving for myself as much as for you: **when the agent starts prompting you, don't rush to comply and don't rush to mute.** What's valuable was never the judgments it generated for you. It's your own judgment about whether to accept or veto them. Information is worthless; the ability to process it is what's valuable — and in the proactive era, push that line one notch further: now that even **judgment** is being handled for you, **the ability to decide whether to trust that judgment is your last moat, and the one you should never outsource.**
