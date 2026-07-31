---
title: 'How to Build Real Trust in Unattended AI Agents That Act'
date: 2026-07-15T16:00:00+08:00
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
  - Monitoring
  - Security
  - Testing
description: >
  A practical trust stack for unattended AI agents: hard tool controls, regression evals, checkpoints, rollback, and focused human review for risky actions.
categories:
  - Development
tldr:
  - Once an agent is capable enough to act, the next bottleneck is trust — whether you can use its output without replaying every step by hand.
  - Observability tells you what happened; only evals tell you whether it was right. Between the two sits the eval gap.
  - "In a simplified independent-step model, 95% accuracy over 20 required steps gives a 36% clean-run rate. Checkpoints help only when detection and recovery work."
  - "The trust stack is three parts: guardrails that authorize before the action, regression evals, and a morning HITL review. Irreversible actions need a human finger on the button."
  - Sort guardrails into four tiers by reversibility (read-only / logged / capped / gated). The best cold start for an eval set is your own incident log.
  - Second-half forecast — evals and observability become an M&A battleground, and continuous red teaming becomes table stakes.
maturity: budding
columns:
  - ai-2026-review-forecast
series:
  name: "AI 2026: First-Half Review, Second-Half Forecast"
  slug: ai-2026-review-forecast
  order: 4
  total: 5
cover:
  image: /images/covers/ai-agent/2026/trusting-unattended-ai-agent.jpeg
  alt: 'A quiet control room supervising an unattended AI agent workflow'
---

Suppose you actually have one now — an agent that takes a job end to end. Pulls the data, writes the code, runs the tests, opens the PR, updates the docs. It doesn't need you feeding it prompts line by line. You hand it the task at night and go to sleep.

The real question isn't whether it finishes. In coding, research, and content workflows, model capability is often already sufficient to produce a plausible result. That does not mean capability has stopped mattering everywhere: in unfamiliar domains and genuinely novel tasks, it can still be the limiting factor. But once an agent is capable enough to act, a different bottleneck appears —

**The next morning, do you dare use what it produced?**

If yes, you've reclaimed real attention. If no, it is just a fancier autocomplete: you review every line, fix every line, and hand back the time you thought you had saved. This is a **trust** problem — not faith in a model, but evidence that the system stays inside its authority, detects bad work, and can recover.

## Between the demo and production sits an eval gap

I've watched a lot of stunning agent demos. In the screen recording it glides through, gets it right on the first try, and the room claps. Then the thing hits production and starts leaking.

The reason isn't mysterious. **A demo is one carefully selected success. Production is ten thousand consecutive runs that nobody gets to select from.** The first only needs to be right once. The second needs to be able to fail affordably, get caught, and roll back. The thing sitting between them is what I call the **eval gap**.

Plenty of teams already sense the gap is there, so they pile on **observability**: traces, token accounting, a log line for every tool call, alerts on failed retries. All of that is correct — but be clear about what it actually solves.

**Observability tells you what happened. Evals tell you whether it was right.**

Those are different things. Observability can tell you the agent made 47 tool calls last night, spent forty-five cents, and retried twice at step 31. It cannot tell you **whether the report those 47 calls produced reaches the wrong conclusion.** However complete your logs, they only record the accident in high fidelity. They don't prevent it.

The mismatch shows up in LangChain's [State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering) survey. Across respondents, 89% reported some agent observability, while 52.4% ran offline evaluations on test sets. Among respondents with agents in production, 94% reported some observability. Those figures have different denominators, so they should not be collapsed into one production-only ratio. The useful signal is simpler: **instrumentation is more common than systematic evaluation.**

Many teams have installed the dashcam before the brakes. We are good at recording what an agent did and less disciplined about asking whether the result was correct.

This is what I kept hammering on in [The Super Individual's Intelligence System](../super-individual-intelligence-system/): observability is the ticket in, evals are the moat.

## The trust stack for unattended agents

So how do you actually get to "comfortable"? My answer is unglamorous and engineering-shaped: trust isn't asked for, it's built. Three parts.

**Part one: guardrails that authorize before the action fires.**

Most people's mental model of a guardrail is still "filter the output" — wait for the agent to finish talking, then run a classifier over it to check for anything nasty. That's far too late. For an agent that **acts**, the danger was never in what it said. It's in what it did.

Guardrails have to move forward to the **tool execution layer**. You're not intercepting its speech, you're intercepting its hands. Before `delete`, `transfer`, `deploy`, or `send` fires, ask: is the action allowed, how large is its blast radius, is it reversible, and does its scope exceed a threshold? **The harness decides before execution; it does not rely on the model having thought things through.** OWASP's guidance on [excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) makes the same point through least functionality, least privilege, and human approval for high-impact actions. Anthropic's account of [containing Claude across products](https://www.anthropic.com/engineering/how-we-contain-claude) adds the systems view: sandboxes, virtual machines, egress controls, and narrowly bounded tool permissions reduce the damage an autonomous process can cause.

As for how to tier that authorization, there's a four-level table further down that you can copy straight into a config file. It's the most immediately usable thing in this piece.

**Part two: regression evals.**

Guardrails prevent unauthorized actions. Evals ask whether the work achieved its intended outcome. The key word is **regression** — you need a fixed set you can re-run, and every time you change a prompt, swap a model, or add a tool, you run it again. Anthropic's guide to [agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) is useful here because it treats an eval as a task, an environment, and explicit grading logic rather than a vague model score.

There's a counterintuitive and very important point here: **passing a benchmark doesn't mean it's usable.** However high you climb on a public leaderboard, all that proves is it does well on problems someone else picked. Your business, your data, your edge cases — you have to write those problems and grade them yourself. I've even noticed a new ranking style appearing in the industry, one that weights **human preference** together with **factuality** rather than scoring a single dimension of right and wrong. Which tells me people are finally catching on: **"looks right" and "is right" are two things you have to test separately.**

**Part three: the morning HITL review.**

HITL — human in the loop. This isn't regressing to manual work. It's moving your attention **precisely, from "watching the whole run" to "pressing a button at the points that matter."**

Overnight the agent runs on its own, guardrails hold back high-impact actions, and checks grade the outputs they are actually capable of grading. In the morning you review two categories first: **whatever the checks flagged red**, and **whatever action is irreversible**. Anything rollbackable — editing a draft, running tests, generating a report — can run inside a recoverable workspace. Anything where one mistake sinks the whole thing — moving money, dropping a database, publishing externally, deploying to production — waits for a person.

The order of the three matters: **guardrails first (don't cause harm), evals in the middle (judge right from wrong), HITL last (carry final responsibility).** Drop any one and "unattended" is just a word.

## Compounding error: the math you don't get around

Why am I this cautious about "unattended"? Because there's a piece of math, cold and indifferent, that nobody gets around.

Agents work in **steps**: plan, call a tool, read the result, plan again. A serious task can run twenty steps. Here is a deliberately simplified model: every step is required, each has a 95% chance of being correct, and errors are independent. The probability of a completely clean run is:

```
0.95^20 ≈ 0.36
```

That is a **36% clean-run rate**, not a universal measurement of agent success. Real steps are neither equally difficult nor independent; some errors are harmless, while one early mistake can make later failures strongly correlated. The toy model earns its keep by making one point visible: a high-looking local accuracy does not automatically become reliable end-to-end behavior.

One number is easy to dismiss as a special case. Spread it into a table and it starts to scare you properly. Steps across the top, per-step accuracy down the side, probability the whole chain comes out right in the cells:

```
Per-step accuracy →   90%     95%     98%     99%    99.5%
Steps ↓
   5 steps           59%     77%     90%     95%     98%
  10 steps           35%     60%     82%     90%     95%
  20 steps           12%     36%     67%     82%     90%
  50 steps            0.5%    8%     36%     61%     78%
 100 steps            0.003%  0.6%   13%     37%     61%
```

Read across: reducing per-step error from 5% to 1% moves the 20-step clean-run rate from 36% to 82%. Read down: adding more required steps rapidly lowers it. This is not proof that every longer chain is worse; it is a warning to measure the chain you actually built.

The engineering response is to **shorten the chain, checkpoint objective state, and make the work recoverable**. Checkpoints do not improve the model. They stop a detectable error from contaminating everything downstream and let the system restore a known-good state.

The toy calculation below makes stronger assumptions explicit. Divide twenty independent steps into four five-step segments. A segment succeeds with `p = 0.95^5 ≈ 0.77`. Assume the checkpoint catches every failed segment, never rejects a good one, rollback restores the exact prior state, and one retry is independent with the same success probability:

```
No checkpoints:  [1 → 2 → ... → 20]        clean run = 0.95^20 ≈ 36%

Checkpoints:     [1..5] ✓ [6..10] ✓ [11..15] ✓ [16..20] ✓
                 p(segment) = 0.95^5 ≈ 77%
                 p(success within two attempts) = 1-(1-p)^2 ≈ 95%
                 p(all four recovered segments) ≈ 0.95^4 ≈ 81%
```

The increase from 36% to 81% is **not free** and it is not a production forecast. It buys reliability with more attempts, latency, compute, checkpoint logic, retained state, and operational complexity. The assumptions also fail in predictable ways:

- **Checkpoint recall:** if a check catches only a fraction `r` of bad segments, correctness after one retry becomes `p + (1-p)rp`, not `1-(1-p)^2`. Missed faults continue downstream.
- **False positives:** a check that rejects good work creates needless retries, cost, delay, and sometimes a false terminal failure.
- **Retry independence:** repeating the same prompt against the same bad context is correlated. If the task exceeds the model's capability, retries reproduce the failure. Change the context, strategy, tool, or escalate.
- **Recoverability:** retrying helps only if the system can restore a known-good checkpoint and external side effects are idempotent, compensatable, or deferred. You cannot retry an already-sent payment as if nothing happened.

Put checkpoints where verdicts are objective — tests pass, a schema validates, totals reconcile, permissions remain bounded — and measure their recall and false-positive rate against real incidents. A model judge can help with subjective quality, but it adds another probabilistic component that needs calibration. Cheap tokens buy attempts; **reliable recovery requires state, evidence, and boundaries.**

## "Runs at night, reviewed in the morning": the whole pipeline in one diagram

Put all of that together and an unattended agent you can genuinely relax about looks like this:

```
        NIGHT (unattended)                     MORNING (HITL)
  ┌─────────────────────────────┐    ┌───────────────────────────┐
  │                             │    │                           │
  │  task → plan → [tool call]  │    │   human arrives           │
  │           │                 │    │      │                    │
  │           ▼                 │    │      ▼                    │
  │   ┌──────────────┐          │    │  review only two things:  │
  │   │ guardrail    │──over────┼────┼─▶ ① eval-flagged red      │
  │   │ (pre-exec)   │ threshold│    │   ② irreversible action   │
  │   │ reversible?  │  → queue │    │      │                    │
  │   │ blast radius?│          │    │   ┌──┴───────┐            │
  │   └──────┬───────┘          │    │   │ approve  │──▶ execute │
  │     pass │                  │    │   │ reject   │──▶ rollback│
  │          ▼                  │    │   └──────────┘            │
  │   execute → eval → persist  │    │                           │
  │          │(rollback point)  │    │   Any action where one    │
  │          ▼                  │    │   mistake sinks it: a     │
  │   next step / close the loop│    │   human presses it.       │
  │                             │    │                           │
  └─────────────────────────────┘    └───────────────────────────┘

  reversible actions   → let the agent run them
  irreversible actions → queue at the HITL gate, wait for a human
```

Read that diagram and you have my whole argument: **an agent's autonomy should be allocated strictly by the reversibility of the action.** Editing drafts, running tests, generating first passes — let it loose. Moving money, dropping databases, publishing externally — everything queues. Autonomy isn't better when it's higher. It's better when it's **high where it should be high and locked where it should be locked.**

## Guardrail tiers: a four-level table you can copy

"Allocate autonomy by reversibility" sounds elegant. What you actually need at the tool execution layer is a table you can write into a config file. This is the split I use — four tiers, and one question decides the tier: **if this action is wrong, what does it cost to undo?**

| Tier | Test | Typical actions | What the harness does |
|---|---|---|---|
| **L0 Read-only** | No side effects, pure read | Read a file, query a database, run a read-only query, search | Let it through; retain enough logs to investigate |
| **L1 Logged** | Reversible, undo cost ≈ 0 | Write a temp file, run tests, generate a draft, open a branch | Let it through, but a rollback point is mandatory |
| **L2 Capped** | Reversible, but undoing costs money or time | Write to a database, call a paid API, commit off trunk, send an internal notification | Let it through with thresholds: per-action cap, cumulative cap, rate cap. Over the cap → drop to L3 |
| **L3 Gated** | Irreversible, or undo cost is extreme | Move money, delete data, publish externally, deploy to production, send an unrecallable message, change permissions | **Always queue for a human.** No exceptions |

Four traps I've fallen into using this table, passed on directly:

**One: you tier actions, not tools.** The same `db.execute` tool is L0 running a `SELECT`, L2 running an `UPDATE`, L3 running a `DROP`. Authorize at tool granularity and you've granted the tool's maximum danger level. **Authorization granularity has to reach the parameter level.**

**Two: L2 thresholds must be set on cumulative volume, not just per action.** A $500 cap per transfer sounds safe — until the agent makes 200 transfers in an hour. **Every cap needs both a per-action limit and a windowed cumulative limit**, otherwise it's a fake guardrail you can walk around with a loop.

**Three: when unsure, tier up.** The cost of a tiering mistake is wildly asymmetric: mistake an L3 for an L2 and you might lose a production database; mistake an L2 for an L3 and you press one extra button in the morning. **That asymmetry is far too large to justify optimizing for fewer button presses.**

**Four, and the easiest to miss: watch for composition.** Each step reads L1 on its own; strung together they're L3. The agent writes some internal data to a temp file (L1), uploads the temp file to object storage (L1), then sets that bucket to public-read (looks like a config operation) — three unalarming steps that compose into an irreversible data leak. **So on top of action-level guardrails you need a small number of trajectory-level rules**: something like "any chain that has touched data marked sensitive has all downstream outbound actions promoted to L3." Rules like that are annoying to write, and they catch exactly the accidents that per-action review can never see.

The value of this table isn't that it's clever — it isn't clever at all. It's that **it converts a vague psychological question, "how much do I actually trust this agent," into a config file that can be reviewed, diffed, and argued about in code review.** Once trust can be version-controlled, it stops being a feeling and becomes engineering.

## Eval sets aren't designed. They grow out of incidents.

There isn't much resistance to adding guardrails — everybody's afraid of accidents. What actually blocks most teams is part two: **where does the eval set come from?**

I've watched a lot of teams stall right here, and they stall for the same reason every time: they want to *design* a complete eval set. Book a meeting, open a doc, try to enumerate every scenario worth testing. The meeting ends, three pages get written, and then nothing — because you cannot finish this from the front. You will never think of them all.

**Don't design it. Grow it.** Five steps:

**Step one: pilot it and measure it.** Run the agent in a sandbox or tightly bounded low-risk scope. Start with a small designed test set, but expect real traces to reveal failure modes you did not imagine. Do not expose users or production data merely to collect samples.

**Step two: every time something goes wrong, freeze it into a case immediately.** This is the central move. If the agent parses a date wrong and skews an entire report, **don't just patch the prompt and move on.** Save the input, relevant intermediate state, expected behavior, and a privacy-safe reproduction as an eval case. An incident is an expensive lesson; regression coverage preserves its value.

**Step three: want the wrong samples before the right ones.** Counterintuitive but important: an eval set with only positive cases carries almost no information — the model was probably going to get those right anyway. **All of an eval set's value density lives in the negatives.** So during cold start, prioritize sweeping in every failure, every human rejection, every output that made you frown during the morning review.

**Step four: grade with objective checks first; don't reach for a model judge on day one.** If exact match works, use exact match. If schema validation works, use schema validation. If you can run tests, run tests. Only where no objective test exists ("is this summary any good?") do you bring in a model as judge — and you need to remember that **a model judge is itself a model that makes mistakes, and it needs its own evals.** Don't validate one thing with another thing you haven't validated.

**Step five: wire it into the change path.** Change a prompt, swap a model, add a tool — run the relevant suite and inspect the deltas. Schedule broader suites when they are too slow or costly for every commit. This is consistent with the NIST AI RMF's call for documented, repeatable [testing, evaluation, verification, and validation](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) before deployment and during operation.

The shape of the whole thing is roughly:

```
   a failure in production
        │
        ▼
   ┌────────────────────┐
   │ capture: input +   │  ← the incident's value is captured here,
   │ intermediate state │    not after you've patched the prompt
   │ + correct output   │
   └────────┬───────────┘
            ▼
   ┌────────────────────┐
   │ freeze as eval case│
   │ annotate: why wrong│
   └────────┬───────────┘
            ▼
   ┌────────────────────┐      ┌────────────────────┐
   │  regression suite  │◀─────│ new attack samples │
   │  (only grows)      │      │ from continuous    │
   └────────┬───────────┘      │ red teaming        │
            ▼                  └────────────────────┘
   every prompt / model / tool change
            │
            ▼
   run it → numbers up? down?
            │
            ▼
   down means don't ship ← this line is the whole meaning of "regression"
```

Note the inlet on the right: **whatever continuous red teaming produces should feed straight back into the same eval set.** These aren't two systems, they're one. Red team's job is to find new ways to be wrong; the eval set's job is to make those failures repeatable and catch their return. That interlock is the technical foundation of the forecast below.

In one of my own workflows, the return became visible only after the incident set had accumulated for a few months. Capturing each case felt like overhead; then a model swap regressed on the handful of cases I cared about most. The suite caught it before release. **The return is delayed, which is exactly why the work is easy to postpone.**

## The morning checklist, and a few mistakes to skip

Guardrails and evals are written for machines. This section is written for you — **what, specifically, you look at when you sit down tomorrow morning.**

### The morning review checklist

Work it in this order, from "most likely to be catastrophic" to "most likely to be ignored":

- **The gate queue first (the L3 items waiting on you).** This is the only place that genuinely needs your judgment, so give it your best attention while you still have it. Ask each one: do I recognize this action? Is the blast radius what I think it is? If it's wrong, can I absorb it?
- **Then the eval reds.** Not that it's red — **why** it's red. Did the model regress, or is the case itself out of date? The latter is more common than you'd think, and it's the main source of eval rot.
- **Then the chains that stopped halfway.** Tasks that died mid-run are often more informative than the ones that finished. Where it stopped is either your guardrail doing its job, or your guardrail with a badly set threshold. **A guardrail that never fires and a guardrail that fires daily are both misconfigured.**
- **Spot-check one all-green chain.** The most counterintuitive item, and the most important. **All green doesn't mean all correct. It means nothing you already knew to check got tripped.** Pick one chain at random every day and walk it end to end by hand, and you'll periodically find new failure modes — and every one of those is the next eval case. This is your only detector for unknown unknowns.
- **Bill and duration last.** Anomalies in those two numbers are often the first signal of behavioral drift: last night suddenly cost three times as much, which usually means something is spinning in a retry loop, not that it got industrious.

For my small personal workflow, the target is roughly **fifteen to twenty minutes**, not an industry benchmark. Your right number depends on risk, run volume, and reviewer expertise. Track queue age, review time, approval reversals, and incidents. If review expands without bound, reduce autonomous scope or improve triage; if nothing is ever surfaced, test whether the checks have meaningful recall.

### Anti-patterns

The most common and most expensive ways to get this wrong, ordered by damage:

- **Observability without evals.** The most universal one, as above: dashcam installed, brakes not installed.
- **Guardrails written into the prompt.** You put "please do not delete production data" in the system prompt and feel safe. **A prompt is a suggestion, not a constraint.** Guardrails have to be hard-coded at the tool execution layer, where the model can't touch them, change them, or route around them. Any guardrail that can be talked out of its position with a sentence was never a guardrail.
- **Shipping on benchmark scores.** A public leaderboard proves it does well on problems someone else picked. It has nothing to do with your business or your edge cases.
- **A model judge that was never evaluated.** You use one model to grade another and then trust the grade completely. You've relocated the problem, and relocated it somewhere less visible.
- **HITL degraded into a rubber stamp.** Approval prompts do not create attention on demand. [Anthropic reports](https://www.anthropic.com/engineering/how-we-contain-claude) that Claude Code users approved roughly 93% of permission prompts and that attention declined as prompts accumulated; that observation helped motivate a shift toward containment and safer automatic approvals. Treat review volume as a measured capacity constraint, not as evidence of safety.
- **Patching the prompt after an incident and keeping no case.** Every time you do this, you discard an expensive lesson and invite the same mistake back.

The first two decide whether you'll have an accident. The last two decide whether you'll have the same one twice.

## Why the guardrail layer still feels immature

In my own projects, guardrails remain the least standardized part of the stack. That is an observation, not an industry measurement. Models have comparable benchmarks and observability has recognizable trace conventions; authorization policy still turns quickly into product-specific permissions, budgets, state transitions, and recovery rules.

That specificity is not entirely a tooling failure. Risk lives in context: a database `SELECT`, `UPDATE`, and `DROP` cannot share one policy merely because they use the same connector. OWASP's [AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) provides a useful baseline, but the application owner still has to encode its own blast radii and approval boundaries.

In [98.4% Is Scaffolding, 1.6% Is Judgment](../agent-engineering-the-98-percent-harness/) I used a deliberately sharp ratio to describe this division of labor. The exact number is not a measurement; the principle is that a small amount of model judgment depends on a large amount of ordinary systems engineering. Whether you dare let that judgment act depends on how solidly the surrounding permissions, tests, and recovery paths are built.

In the end: **"information is worthless, what's valuable is the ability to process it"** — and in the agent era I'd add a line. The ability to process information is getting cheap too. What's actually valuable is the trust to use the processed result directly, and that trust is held up by scaffolding.

## Second-half forecast: the bottleneck moves from building agents to trusting them

This is a forecasting column, so let me commit. Two clear predictions about the second half of 2026 and the agent trust layer.

**Prediction one: evals and observability become the next M&A battleground.**

In the first half, the money and the attention went to **building agents** — stronger models, smoother frameworks, flashier demos. In the second half the bottleneck will visibly migrate from **building agents to trusting agents**. When every company holds a pile of working agents and nobody dares actually let one run unattended, the market will pay enormous sums for anything that makes them trustworthy.

Eval platforms, observability tools, guardrail middleware — three categories previously filed under "ops miscellany" — become contested ground overnight. The big players will buy their way into this layer, because **building a trustworthy eval and guardrail system from scratch is far slower than acquiring a team that already has one.** Whoever controls the ability to make agents trustworthy controls the actual gate on agent commercialization. Remember this call: **in the second half, money flows from "smarter" to "more trustworthy."**

This is the same coin as [the blue-ocean argument in the fifth article](../ai-agent-red-ocean-blue-ocean-2026/). That one says the red ocean is full and the blue ocean is vertical, regulated, and end-to-end — but **on what basis does an agent in a regulated field dare take end-to-end responsibility for a customer?** Guardrails bound what it can do, evals provide evidence about work quality, and HITL keeps a person accountable at decisive moments. **The trust layer isn't just a business; it is an entry requirement for serious vertical products.**

**Prediction two: continuous red teaming becomes table stakes.**

One-shot pre-launch security testing gets retired. The reason is simple: an agent is alive. Swap a model version, add a tool, edit a prompt, and its behavioral boundary quietly drifts. Safe last month doesn't mean safe this month.

So red teaming can't be a one-off. It has to become **standing, automated, continuously running adversarial testing**: a red team (quite possibly made of agents itself) attacking your production agent around the clock, inducing privilege escalation, probing guardrail boundaries, and feeding every new hole straight back into the eval set. **Continuous red teaming is to agent safety what CI/CD is to software quality** — from "test once before release" to "always testing." By the end of this year I expect it to go from a luxury at frontier companies to standard equipment for anyone deploying agents seriously.

## A caveat I have to state

Forecasts are forecasts. Let me put this plainly so you don't read the piece as blind optimism.

**Safety lives in the harness, not in the model's good sense.**

I want to say that with maximum weight. You can never, ever hand safety to "the model will probably think it through." The model has no good sense. It has a probability distribution. That it thought it through once doesn't mean it won't, on some edge you never tested, drop the production database with complete composure. **What actually stops it was never its conscience. It's the guardrail you hard-coded at the tool execution layer that nothing can route around.**

So there's exactly one bottom line, bold, and carved into the SOP: **irreversible actions require HITL.** Moving money, deleting data, publishing externally, deploying to production, sending an unrecallable message — no matter how "mature" the agent or how high the eval scores, a human finger lands on the final confirm. This isn't distrust of the agent. It's basic respect for two objective facts: **compounding error** and **irreversibility**.

This bottom line and the "proactive ≠ autonomous decision" boundary from [the second article](../proactive-agent-it-prompts-you/) are the same nail driven in two places. That one argues that "who initiates" and "who decides" are independent dimensions — an agent can be extremely proactive about initiating and must be extremely restrained about deciding. The guardrail tiers here are what that restraint looks like in practice: **L0 through L2 is the range where it can be proactive; L3 is the gate where it must hold back.** Proactive agents aren't an exception to this system, they're a layer built on top of it — they ask you to trust not just the agent's execution but the agent's judgment (its judgment that this thing is worth interrupting you for right now). The bar goes up, never down. **Build the unattended trust foundation first, then talk about proactive. Reverse the order and what you get is an agent that proactively causes accidents.**

## What we're really learning is how to let go

Writing this, I notice it looks like a technical piece but is really about something harder — **learning to let go.**

Handing work to an agent nobody is watching is, fundamentally, no different from handing work to a new hire. You don't let them touch the production database on day one because their résumé was impressive. You scope their permissions first (guardrails), make everything they do traceable and reviewable (evals), and keep the decisive calls routed through you (HITL). Then, as they prove themselves over and over, you loosen your grip a little at a time.

**Trust is earned through engineering, bit by bit. It isn't granted all at once by capability.**

The agent capability curve over the past two years has been frighteningly steep, but I'm less and less anxious about whether it'll replace me, and clearer and clearer about one thing: **in an era where anyone can summon a powerful agent, the scarce thing is no longer an agent that can do the work — it's someone who can build a harness that makes an agent worth trusting.** The former keeps getting cheaper. The latter keeps getting more valuable.

So, back to the question at the top — the next morning, do you dare use its output directly?

My answer: **when you can answer, in your own words, what the guardrails held back, what the evals checked, and which steps still need your finger — then you dare.** And nobody can build that for you. You grow it yourself, one layer at a time. Which is probably the most worthwhile job the agent era leaves each of us.
