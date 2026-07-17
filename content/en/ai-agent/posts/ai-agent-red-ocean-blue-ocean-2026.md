---
title: 'The Red Ocean Is Full: Where the Blue Ocean for AI Agents Is in Late 2026'
date: 2026-07-15T18:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: [AI agent startups, vertical agents, red ocean blue ocean, AI agent opportunities, vertical AI, agent moat, enterprise memory, AI startup directions 2026, horizontal SaaS, end-to-end accountability, agent payment infrastructure, proprietary data flywheel, super individual, LLM applications]
tags:
  - AI
  - LLM
  - Agent
  - Product Strategy
  - Solo Builder
  - Super Individual
description: >
  In late 2026, general-purpose and horizontal AI agents (coding, support, sales, scheduling) are a red ocean that foundation model labs can replicate within a single product cycle. The real blue ocean sits in two places: vertical, regulated workflows where someone takes end-to-end accountability, and infrastructure built for agents themselves (runtimes, payment rails, evals). This piece explains why feature moats cannot hold, what a real moat looks like (proprietary data flywheels, domain depth, end-to-end accountability), and offers a red-blue test table, a direction self-check, and an anti-pattern list, with separate bets for solo builders and founders. It closes out the entire 2026 review-and-forecast column.
tldr:
  - "General-purpose and horizontal agents are already a red ocean: the differentiation is too thin, and foundation model labs erase it within one product cycle."
  - "Only three moats are left standing: a proprietary data flywheel, domain depth, and end-to-end accountability. Not an assistant — something that owns a regulated process to the finish."
  - There is one cold test for red versus blue. Ask why nobody has killed this opportunity yet. If the answer is "everyone just noticed," it is red. If the answer is "because it is hard, dirty, slow, and somebody has to be liable," it might be blue.
  - "End-to-end accountability lives or dies in the contract: an SLA that names an accuracy floor, money paid out when you are wrong, and insurance you can actually buy. If you cannot afford to pay, you are not accountable."
  - The blue ocean is in vertical regulated workflows (legal compliance, healthcare operations, financial audit, research orchestration, construction and manufacturing) plus infrastructure for agents (runtimes, payment rails, evals).
  - Forecast for the second half - vertical agents eat horizontal SaaS; enterprise memory becomes the core moat; payment infrastructure built for agents starts to take shape.
  - The blue ocean is blue precisely because it is hard, dirty, and slow. The soft layer gets steamrolled from above; the hard layer will not budge. Do not throw your weakness at someone else's strength.
maturity: budding
columns:
  - ai-2026-review-forecast
series:
  name: 'AI 2026: First-Half Review, Second-Half Forecast'
  slug: ai-2026-review-forecast
  order: 5
  total: 5
cover:
  image: /images/covers/ai-agent/2026/ai-agent-red-ocean-blue-ocean-2026.jpeg
  alt: 'The red ocean is full — where the blue ocean for AI agents is in late 2026'
---

Suppose you had to place a bet today on one direction in AI agents. What is the first question you should ask?

Most people ask whether the thing can be built. But in the second half of 2026, model capability is no longer the bottleneck, and "can it be built" is very nearly always true. The question worth asking is colder: **why hasn't anyone killed this opportunity yet?**

The answer to that question usually tells you whether you are looking at a red ocean or a blue one. If nobody has killed it because everyone just noticed it, you are almost certainly in a red ocean, and rushing in only adds one more body to the water. If nobody has killed it because it is hard, because it is dirty, because it is slow, because somebody has to be liable for it — then you may have stumbled onto something genuinely rare.

After scanning a lot of agent products, startup pitches, primary sources, and industry analysis, I keep landing on the same conclusion: **general-purpose and horizontal agents are a red ocean that is already scabbing over, and the blue ocean is hiding in exactly the places people instinctively don't want to touch.**

## A Map of the Battlefield: The Red Ocean Is Full, the Blue Ocean Is Hard to Enter

Let's draw the terrain first.

```
                    AI Agent Battlefield · Late 2026
   Easy to replicate ←──────────────────────────────→ Hard to replicate
   (soft layer / general capability)        (hard layer / domain + liability)

  ┌─────────────────── RED OCEAN (full) ─────────────────────┐
  │  coding agent   support agent   sales agent   scheduling │
  │       ▲             ▲              ▲             ▲       │
  │       │             │              │             │       │
  │   Foundation labs: one product cycle and you're erased   │
  │   (feature as moat = no moat)                            │
  └──────────────────────────────────────────────────────────┘
                          │
        Moat migrates from "features" to "data + domain + liability"
                          │
                          ▼
  ┌─────────────── BLUE OCEAN (hard to enter) ───────────────┐
  │  legal   healthcare ops   audit   research   mfg         │
  │      +                                                   │
  │  Infrastructure for agents: runtime · rails · eval       │
  │                                                          │
  │  Moat = data flywheel · domain depth · liability         │
  │  Price = hard, dirty, slow, and you're on the hook       │
  └──────────────────────────────────────────────────────────┘
```

I could list the red ocean column with my eyes closed: **coding agents, support agents, sales agents, scheduling agents**. What they have in common isn't that they lack value — quite the opposite, they are all genuinely useful. The problem is that they are all built on the **soft layer**.

## Why the Red Ocean Can't Be Defended

I wrote earlier in this column about how the soft layer gets steamrolled from above (see [From Chatbot to Agent to Skill](/ai-agent/posts/from-chatbot-to-agent-to-skill/)): the closer a feature sits to general language capability, and the less it depends on proprietary assets, the more easily it gets flattened by the layer upstream. The tragedy of the red ocean is written into that rule.

**First, feature moats are being erased by AI itself.** The thing you're proud of today — it drafts the weekly report, it schedules the meeting, it follows up with the customer — is fundamentally a prompt and a bit of orchestration wrapped as a product. But orchestration is not a barrier, and a prompt certainly isn't. Any clever trick you thought of, someone else thinks of next quarter, and one notch up in model capability means nobody has to think of it at all.

There's a mechanism here that rarely gets named: **the core asset of a red ocean product is exactly the part that the next model upgrade eats.** The prompt engineering you spent six months tuning, the pile of fallback rules, the layer of format constraints — all of it exists to patch the weaknesses of today's model. And patching that same set of weaknesses is precisely what the labs ship next. In other words, **the scaffolding you built so carefully is the thing upstream plans to tear down next year.** You are taping gauze over a wound that is healing on its own, and hoping to make a living selling gauze.

**Second, a foundation model lab needs one product cycle to replicate you.** This is the cruelest part of the red ocean. When your entire product happens to sit inside the range of what a model lab can do offhand, you aren't competing with your peers — you're competing with the people who supply your electricity. From what I've been tracking, any direction that amounts to a thin wrapper over general capability tends to get absorbed by an official Copilot or an official agent mode; it's mostly a matter of time. The market you spent so much educating turns out to be tuition you paid on someone else's behalf.

And the asymmetry runs much deeper than "big companies have more money." Three things are the actually lethal ones. Their marginal cost is negative — for the same agent feature, you pay API fees on every call while they run their own GPUs, and shipping it also makes their subscription stickier. Their distribution is free — you buy users one at a time, they add a button to an entry point that already exists. And their iteration requires convincing nobody — you have to ship a release, educate the market, wait for the customer to nod, while they flip a default and it's live. **You're in a price war against an opponent with lower costs, free distribution, and no need for your consent.**

**Third, the differentiation is so thin that users won't stay for it.** The difference between red ocean products is often small enough that it has to be manufactured with marketing spend. No switching costs, no accumulated data, users come and go freely. That business can make money, but it cannot build a **moat**.

Here's a plain self-test: **if all your users migrated to a competitor tomorrow, what would they lose?** If the answer is "they'd have to learn a new interface," you don't have a moat, you have a habit. If the answer is "everything they accumulated over two years, which exists only inside your product, is gone" — that's a switching cost. For red ocean products, the answer is almost uniformly the former.

In one line: **when features are your entire moat, you don't have one.**

## Only Three Real Moats Are Left

So what still stands? I'd narrow the things that still count as moats in late 2026 down to three, and they usually have to stack to be deep enough.

**One: the proprietary data flywheel — it gets better the more it's used.** This is one of the few old moats that still holds in the AI era. The key isn't that you have data; it's that **every single use of your product generates data nobody else can get, which makes your next run better**. Once that loop is closed, a latecomer with an equally strong model still has to spend the time from zero. Which echoes something I say often: **information itself isn't worth much. What's worth something is the ability to process it — and what settles out of that processing that nobody can copy.**

But "data flywheel" has been abused so badly it's in every deck, so it's worth pulling apart the **conditions required to start one**. A flywheel that actually turns needs four things, and it needs all four:

1. **The output has to be judgeable as right or wrong.** After a user finishes, the system needs to know whether this run was correct. Drafting a weekly report has no right or wrong, only "eh, fine" — so it will never spin. But "did this regulatory filing get rejected" has a crisp verdict. **A rejection is a free label.** A direction with no verdict signal is accumulating logs, not data, no matter the volume.
2. **The verdict has to flow back as input to training or rules.** Knowing you were wrong isn't enough; you need an engineering path that turns "where it went wrong" into the next version's improvement. Lots of teams stall right here: the feedback sits in support tickets and never enters the pipeline.
3. **The data has to be exclusively yours.** If the same data can be scraped off the public web, or walks out the door when the customer switches vendors tomorrow, that's not a flywheel — it's a rented warehouse.
4. **The improvement has to be perceptible to users.** Otherwise they churn before the flywheel has turned enough times, and it stops before it ever spun up.

Here's where each of those four tends to break:

```
   usage ──→ output ──→ ①verdict ──→ ②feedback pipeline ──→ model/rule improvement
      ▲                     │                │                        │
      │                     ✗                ✗                        │
      │            no right/wrong      feedback stuck in              ▼
      │              ("eh, fine")      tickets, never piped   ④users perceive it
      │                                                               │
      └───────────────────────────────────────────────────────────────┘
                     ③data exclusivity (or the whole loop is rented)

   Break at ① → you're collecting logs, not data
   Break at ② → you have a gold mine and no shaft
   Break at ③ → you're doing charity work for your industry
   Break at ④ → users left before the flywheel spun up
```

**To judge whether a direction can start a flywheel, look for a natural, cheap, high-frequency verdict signal.** That lens is a hundred times more useful than "we have a lot of data."

**Two: domain depth — does the team actually know the business?** Blue ocean directions almost all have a thick layer of industry jargon, implicit rules, and edge cases that appear in no document and live only in practitioners' heads. A team that has actually walked a hospital's process, pulled all-nighters at a law firm, been through the grinder of audit season, builds a different species of agent than a team that read Wikipedia. Domain depth can't be bought or copied, and it doesn't depreciate when the model improves.

The most valuable part of domain depth isn't knowing a lot — it's **knowing which step must not be automated**. Someone who hasn't lived in the industry cannot make that call. They'll hand every step to the model with equal confidence, and then get it wrong at exactly the place where being wrong is unaffordable.

**Three: end-to-end accountability — not an assistant, but the party that owns the outcome.** This is the one I think is most underrated. Nearly every red ocean agent is positioned as an assistant: I give you a recommendation, and whether you act on it, whether it's wrong, is on you. The real blue ocean products do the opposite — **they take a regulated process and own it end to end.** Not "helps you draft the compliance report" but "does the regulatory filing and stands behind the result." Liability is the hard layer that the soft layer can never steamroll.

## What "Hard, Dirty, Slow" Actually Means: Take One Process Apart

"Hard, dirty, slow" is easy to say and lands like a slogan. So let me put it into a concrete process — because **the barrier in a blue ocean lives in the details of the workflow, not in the capability of the model**.

Take one of the most common jobs in compliance and audit: a regulated institution has to file a periodic data return with its regulator. Sounds like "pull the numbers from the database, drop them into a template" — an afternoon's work. Anyone who has actually done it knows the process looks more like this:

```
  ①extract ──→ ②reconcile ──→ ③judgment ──→ ④cross-foot ──→ ⑤sign ──→ ⑥file ──→ ⑦Q&A
   ✅auto       ⚠️semi-auto     ❌barely      ⚠️semi-auto     ❌never   ✅auto    ❌never

  ① Extract: pull from a dozen systems. Dirty because the systems are old and the
     interfaces are bad — but not hard. AI can do this.
  ② Reconcile: the same field is called "net amount" in system A and "net amount"
     in system B, but one is tax-inclusive and one isn't. The discrepancy is buried
     in meeting minutes from five years ago. AI can raise the question, not settle it.
  ③ Judgment: does this transaction belong to that account? The regulation is vague,
     and the industry runs on precedent like "the regulator said so verbally last
     year" — precedent with no text. AI has no input here at all.
  ④ Cross-foot: this table's total must equal the sum of certain rows in that table.
     The rule is writable; the exceptions are endless, and each one has a specific
     historical reason behind it.
  ⑤ Sign: a human has to take personal liability for this filing. This step is
     legally not automatable.
  ⑥ File: call the API. AI can do this.
  ⑦ Q&A: the regulator comes back with three questions, and you have three days to
     explain where every number came from. Can't explain = filing void. This step
     needs an audit trail, not generation.
```

Once you can see the process, a lot of things click.

**First, the hard part is never at the ends — it's in the middle.** ① and ⑥ (extract, file) are pure engineering; any wrapper team finishes them in a week. That's why red ocean demos always look beautiful: the demo is ① and ⑥. Meanwhile ②③④⑦, the steps that eat 80% of a practitioner's time, are all stuck on tacit knowledge with no written record and on someone needing to be liable. **The gap between demo and production is the one I called the eval gap in [Trusting an Unattended Agent](/ai-agent/posts/trusting-unattended-ai-agent/); here its name is domain depth. They're two faces of the same gap.**

**Second, what "dirty" concretely means is: rules have exceptions, and exceptions have histories.** Write a rule down, run it in an industry for ten years, and it grows dozens of exceptions — each one a specific incident, a specific piece of regulator feedback, a specific internal compromise. None of it is in any document. You can only accumulate it with time and people, which is exactly why it's slow.

**Third, step ⑦ explains why this class of product must build an audit trail.** It's not enough for your agent to produce a number; you have to be able to answer which rows of which three tables, under which definition, produced it. Which means the whole chain has to be replayable and attributable. The engineering for that is often an order of magnitude larger than "have the AI generate the report." And it's exactly what a red ocean player will never build — **it can't appear in a demo, and it only matters on the day the regulator asks.**

So "hard, dirty, slow" isn't a set of adjectives. It's a construction drawing. **Red ocean players see this drawing and walk around it. That's precisely why it's blue.**

## What End-to-End Accountability Looks Like on Paper: Contracts, Payouts, Insurance

"We take end-to-end accountability" sounds bold, but it has to land on paper or it's still marketing. I've seen too many products claim they stand behind the outcome, and then you open the contract and clause one says outputs are for reference only. **Those two statements cannot both be true.**

Real end-to-end accountability looks like the following, and it comes in gradations:

| Tier | What the contract says | Who eats the error | Pricing logic | Moat depth |
|---|---|---|---|---|
| L0 assistant | "Output is for reference only" | Customer, entirely | Per seat / per token | None |
| L1 tool with SLA | Guarantees uptime, not correctness | Customer, entirely | Per usage | Shallow |
| L2 accuracy floor | States an accuracy floor, refunds if missed | Capped at refund | Usage + outcome | Medium |
| L3 pays for errors | Direct losses from product error are compensated | You pay, up to a cap | Per outcome | Deep |
| L4 insurable | An insurer will underwrite this process | Insurance backstops | Outcome + premium | Deepest |

The part of this table worth chewing on is **the jump from L2 to L3**. It isn't a copy upgrade; it's an upgrade of the entire company:

- You have to be able to **define "wrong" precisely**. If the contract says 99% accuracy, you must answer: what's the denominator? Is one filing one item or a hundred? Who adjudicates? Who arbitrates a dispute? — **If you can't answer these, the SLA is an empty sentence.** And being able to answer them requires exactly the verdict signal described above. You'll notice that **the conditions for starting a data flywheel and the conditions for landing end-to-end accountability are the same conditions.** That isn't a coincidence.
- You have to be **able to afford the payout**. That means risk control, capital reserves, and legal — all heavy. A two-person team can't sign that contract, which is exactly how it keeps the light wrapper crowd out.
- You have to get an **insurer to say yes**. L4 is the most interesting tier: when an insurance company is willing to underwrite your process, it means a professional third party whose business is paying out claims has run the numbers on your error rate and judged it manageable. **That's a harder endorsement than any benchmark.** I'd argue one signal worth watching in the second half is whether this kind of "AI outcome delivery insurance" starts to appear at all — once it does, it means the reliability of some vertical has been actuarially priced for the first time.

But the migration in pricing logic is where the real value sits: **L0 to L1 sells capability, billed by headcount or by token; L3 to L4 sells outcomes, billed by outcome.** The ceiling on the former is what a customer will pay for a tool. The ceiling on the latter is what the thing was already costing them (labor plus risk). Those two numbers often differ by an order of magnitude.

Back to the hard math of compounding error — I ran the numbers in [the trust engineering piece](/ai-agent/posts/trusting-unattended-ai-agent/): 95% per-step accuracy across 20 steps leaves you around 36%. It has a direct corollary here: **the precondition for daring to sign an L3 contract is that you've already decomposed the process so humans only review a few critical nodes, rather than running end-to-end autonomy.** Taking accountability is not the same as full automation. Quite the opposite — **the teams willing to be liable tend to be the most willing to keep humans on the critical steps**, because they know exactly which step costs them money when it's wrong. Which is why "taking accountability" and "human in the loop" aren't in tension. They're two sides of one thing.

## Where the Blue Ocean Is: Vertical, Regulated, End-to-End

Trace back along those three moats and the coordinates get clear.

**Blue ocean one: vertical regulated workflows.** From what I've tracked, the directions drawing the most conviction cluster into a few categories — **legal compliance, healthcare operations, financial audit, research orchestration, and the high-compliance, high-coordination-cost parts of construction and manufacturing**. What they share: the cost of an error is enormous, the process is long and filthy, and somebody is willing to pay a lot for a party that will be liable. Some analysts argue that **vertical AI agents are eating horizontal SaaS** — where you used to buy a general tool and assemble the process yourself, you now buy an agent that knows your industry and finishes the job. I broadly agree: horizontal SaaS sells capability, vertical agents sell outcomes, and outcomes are what the customer always wanted.

You can already see early forms of this. Some teams describe themselves outright as building the most accurate financial-reporting AI agents, taking over something as hard and dirty as a bank's regulatory filing end to end — not as an assistant to the finance team, but as the process itself. That approach is exactly what red ocean players least want to touch: too heavy, too slow, too easy to be liable for. Which is exactly why it's blue.

**Blue ocean two: infrastructure for agents.** In a gold rush, the people selling shovels often last longest. When thousands of agents start actually running, start being trusted with unattended work (I wrote about how hard that is in [Trusting an Unattended AI Agent](/ai-agent/posts/trusting-unattended-ai-agent/)), they need a whole foundation that was built for humans and now has to be rebuilt for agents:

- **Runtime**: keeping agents running for long stretches, stably, observably, with rollback — especially once open model costs collapse and everyone can spin up a whole fleet (see [The Open Model Cost Collapse and the Agent Fleet](/ai-agent/posts/open-model-cost-collapse-agent-fleet/)), which only raises the value of scheduling and governance. There's an easily missed corollary here: **when your agent count goes from single digits to triple digits, "what did those 200 agents do last night, what did it cost, which ones went off the rails" stops being a curiosity and becomes an operations problem.** Tooling for one agent and tooling for a fleet are not the same product.
- **Payment rails**: the most obvious vacuum I see right now. From what I've tracked, dedicated payment infrastructure for autonomous agents is essentially still blank — every existing payment system presupposes that a human is paying. That assumption is buried deeper than most people think. **One of the core features fraud models use is whether the behavior looks human** — 3am, one transaction per second, amounts precise to the cent, no hesitation and no browsing. In today's risk systems that's a textbook fraud profile, and it's also the exact behavioral fingerprint of a perfectly normal agent. The same mismatch is everywhere. Authorization presupposes one person, one card, one limit, but an agent needs fine-grained authorization scoped to this task, this time window, this ceiling, this class of merchant. Reconciliation presupposes that a human remembers what they bought, but an agent produces thousands of micro-charges overnight — who attributes them to which task? Dispute handling presupposes a cardholder who can explain their intent, but where does an agent's intent live? In its prompt? **When the payer isn't human, all four — risk, authorization, reconciliation, disputes — have to be rewritten.** Whoever gets that rail working holds a position at the entrance.
- **Evals**: the more autonomous an agent is, the more expensive and difficult "did it actually do this right" becomes to answer. Trustworthy, reproducible evaluation is a business in itself. And note how this rhymes with the flywheel's starting conditions above — **evals supply exactly that verdict signal.** Whoever defines an evaluation standard the industry accepts within a vertical simultaneously holds the flywheel's starting point for every player in that vertical. That's a much bigger position than "building an eval tool."

These two blue oceans share something: **neither is in the soft layer; both are in the hard layer.** The soft layer gets steamrolled from above. The hard layer only yields to grinding.

## A Test Table: How to Tell Whether a Direction Is Red or Blue

Everything above is terrain. What you actually need is a ruler you can hold up against a specific direction. I'd narrow it to seven tests — **not a weighted score, a checklist; every hit in the red column is an independent cause of death.**

| Test | Red ocean answer | Blue ocean answer | Why it matters |
|---|---|---|---|
| **Why hasn't anyone killed it** | Everyone just noticed | It's hard, dirty, slow, and someone must be liable | The only meta-question; the other six are its expansion |
| **Would a model lab do it offhand** | Yes, and next cycle | No — too heavy, too narrow, too much liability | You're competing with your electricity supplier |
| **One notch stronger model: worth more or useless** | Useless (you were patching its gaps) | Worth more (the model was never your bottleneck) | Is upstream progress your tailwind or headwind |
| **Is there a natural right/wrong signal** | No ("eh, fine") | Yes (rejected / denied / incident) | No verdict signal, no flywheel, ever |
| **What does a user lose by leaving tomorrow** | Relearning an interface | Years of accumulation that exists only here | Separates "habit" from "switching cost" |
| **Would you promise the outcome in a contract** | No — "for reference only" | Yes — with a payout clause | Liability is the one wall the soft layer can't breach |
| **Could two people build it in three months** | Yes — so can everyone else | No — so neither can anyone else | Low barriers are bad news, not good news |

That last row deserves its own note, because it's the most counterintuitive: **"easy to pick up, fast to demo" is a danger signal today, not good news.** Anything you can build in a weekend means anyone can build it in a weekend, and it means a model lab can build it in an afternoon. **The height of the barrier is the height of your future moat** — however hard the door was for you to open, that's how hard it'll be for whoever chases you.

## Direction Self-Check: Three Things to Do Right Now

If you've read this far while seriously considering a direction, don't start writing code. Spend an hour on these three things first.

**One: run your direction through the seven tests and write down each answer.** Don't score and average — **any two hits in the red column are basically fatal**. Pay particular attention to "one notch stronger model: worth more or useless." If your honest answer is "useless," then all your effort is unpaid work for the layer upstream, and the better you do it, the faster you get eaten.

**Two: run a moat physical.** Answer these five with your actual current state, not your plan:

```
Moat physical (write what IS, not what you "plan to")

□ Verdict signal   Can I automatically know today whether yesterday's output was right?
                   ├ Yes, free and automatic       → the flywheel has a starting point
                   ├ Yes, but requires labeling    → the cost will eat you
                   └ No                            → no flywheel; stop using the word

□ Data exclusivity Can my data be scraped? Does it walk if the customer switches vendors?
                   └ "Yes" to either               → not a flywheel, a rented warehouse

□ Domain depth     Has anyone on my team actually worked in this business?
                   ├ Yes, and knows what can't be automated → real depth
                   ├ Yes, but only did one segment          → half depth; hire
                   └ No, we plan to do more interviews      → that's research, not depth

□ Liability tier   Where does my contract sit today (L0-L4)?
                   └ Stuck at L0-L1                → you sell capability, not outcomes

□ Switching cost   What does a user lose by leaving? (answer in one sentence)
                   └ Answer contains "habit"/"familiar" → no moat
```

**Three: work backwards from how you die.** Don't ask how you'll succeed; ask how you most likely died three years from now. The red ocean death is "flattened by a model lab in one cycle." The blue ocean death is "ground down by a long slog of hard work." **You aren't picking a direction with no way to die — there isn't one — you're picking the death you happen to be able to survive.** Someone whose cash won't last two years shouldn't take on a compliance direction that needs three years of walking into potholes. Someone with no industry network shouldn't take on work that runs on precedent. That's not conservatism; that's choosing your battlefield.

## Anti-Patterns: Looks Blue, Actually a Hole

The test table tells you what's blue. But there's a class of direction that's the most dangerous of all — **they look like a blue ocean, they even hit "hard, dirty, slow" perfectly, and they're holes.** Here are the ones I've seen.

**Hole one: hard, but hard without value.** Some directions really are hard, really are dirty, and really have nobody doing them — because nobody would buy the result either. "Nobody does it" and "nobody will pay for it" are two different things, and early on they look identical. **The way to tell them apart is direct: is anyone brute-forcing this with human labor today, and how expensive is it?** If nobody does this thing at all today — not "does it the crude way," but doesn't do it — it's probably not a blue ocean, it's a demand that doesn't exist. **The correct picture of a blue ocean is "people are doing this in an expensive, painful way," not "nobody is doing this."**

**Hole two: fake vertical — a general agent with an industry prompt in front of it.** This is the most common self-deception. You say you build a legal agent, but take it apart and your product equals a general model, plus a legal-domain system prompt, plus an interface with different colors. **That's not vertical, that's a red ocean product with a new skin.** It hits none of the real moats: no exclusive data, no tacit knowledge, no liability. The test: **delete your system prompt, swap in a competitor's — does your product collapse? If it's merely "a bit worse," you don't have a vertical, you have a prompt.**

**Hole three: the difficulty is in you, not in the problem.** You think this is hard, and it may only be because you're unfamiliar with it. To a veteran, it's common sense. **What you took for a moat is your own learning curve.** The signature of this direction: every step forward is painful for you, while an actual practitioner glances at it and says "oh, that's just such-and-such." The test is cheap: **talk to three real practitioners. If the reaction is "yeah, that's a nightmare, we spend two days a week on it," the direction is right. If it's "that's not hard, we've always done it this way," your difficulty is an illusion.**

**Hole four: the customer wants liability, and you're offering accuracy.** You pushed accuracy from 95% to 98% and you're proud. But the question in the customer's head was never "what's the accuracy" — it's "who sits in the meeting when this blows up." **In regulated domains, what the customer buys is often not performance but a counterparty who can absorb the consequences.** If your contract is still at L0 "for reference only," then no matter how high you push accuracy, you're still selling a tool, and the customer still has to keep the original team around as backstop — which means the cost you saved them was never actually saved.

**Hole five: mistaking "heavy" for a moat.** Heavy and hard are not the same thing. Some directions really are heavy and slow — integrating thirty customers' legacy systems, say — but that kind of heavy is **linear grunt work**, and it never settles into an exclusive asset. After the thirtieth customer, you've simply done the same dirty job thirty times, and the thirty-first still starts from scratch. **A real moat's weight is weight that accumulates**: every customer you onboard thickens your rule base, your precedent base, your exception set, and the thirty-first customer is ten times cheaper than the first. **The test is one sentence: is your Nth customer cheaper than your first?** If not, you're not digging a moat, you're running a staffing agency.

**Hole six: waiting for the wind.** "This direction isn't mature yet — wait for the model to get stronger, wait for regulation to clarify, wait for the market to be educated." That's correct in a red ocean (where timing is the game) and fatal in a blue one — **a blue ocean's moat is dug by time itself**. The two years you spend waiting are the two years someone else spends accumulating data, precedent, and trust. By the time you decide the timing is right, the blue ocean has been dug into someone's private lake. **Blue oceans don't reward clever timing. They reward starting early.**

## Two Different Bets: Solo Builders vs. Founders

Same map, but a solo builder and a startup team should not walk the same path.

**If you're a solo builder**, my advice is: **don't throw your weakness at the red ocean's strength.** You can't beat a model lab's general coding agent. But you can take a niche narrow enough that the big players won't bother, and use your domain understanding plus a harness you're fluent with to build an agent for one kind of person and one specific process. Your advantage was never resources — it's **ground-level domain depth and extremely fast iteration**. Let the soft layer steamroll the people still doing this by hand; don't use it to go head-on against upstream.

To make that actionable, I'd narrow a solo builder's selection criteria to three hard constraints:

- **Narrow enough that the big players won't bother.** A concrete quantitative intuition: if the market tops out at a few tens of millions in revenue, it wouldn't survive a single project review at a model lab — but it's more than enough business for one person. **"The market is too small" is a filter for you and a veto for them. That asymmetry is your only safe zone.**
- **Deep enough that you are the user.** The thing you should build is the process that hurts you every day. A solo builder has no budget for user research, so your only source of domain depth is yourself. **If you aren't a victim of the process, don't build it.**
- **Fast enough that you've shipped three revisions before anyone reacts.** Your moat isn't any static asset; it's iteration speed itself. Which also means: **you shouldn't pick a direction that takes three years to validate once** — that direction's moat is time, and time is precisely what a solo builder can least afford. Compliance audit work is a blue ocean for a startup team, not for you.

Note the contradiction between that last point and the founder column: **the same blue ocean is an opportunity for a startup team and possibly a grave for a solo builder.** A blue ocean isn't an absolute location. It's relative to your ammunition and your endurance.

**If you're a founder**, your bet is heavier and worth more: go grind the directions that require **data flywheel plus domain team plus end-to-end accountability**, stacked. These directions look bad early, grow slowly, and are full of dirty work — and precisely for that reason they hold no appeal for model labs and are a chasm for light wrapper teams. Survive the hard, the dirty, and the slow, and your moat is every pothole you walked into on the industry's behalf.

Making that actionable too:

- **Your first hire isn't an engineer — it's the person who spent ten years in the industry.** And give them veto power. Because as noted, the most valuable part of domain depth is knowing which step can't be automated — your engineer can't make that call, and getting it wrong costs you a payout.
- **Write your first contract at L2 or above.** Even if the customer didn't ask. Because signing L2 forces you to answer "what counts as wrong," and the process of answering that question is exactly how you install a verdict signal on your flywheel. **A contract isn't a legal matter; it's a product design matter.**
- **Do the math on how many years of potholes your cash covers.** Blue ocean payback is measured in years. If your runway is 18 months, you shouldn't pick a direction that takes 36 months to accumulate a moat — the direction isn't wrong, you and the direction are mismatched. **Count your ammunition before you pick the battlefield.**

## Forecast for the Second Half

Pulling the lens back to late 2026 through 2027, here are three structural calls. I'm framing all of them as "I lean toward thinking" — don't take them as law.

**Forecast one: vertical agents will visibly take share from horizontal SaaS.** Not that horizontal SaaS disappears, but that the center of value migrates — customers grow less willing to pay for "general capability plus assemble the process yourself" and more willing to pay a premium for a vertical agent that knows the business and delivers the outcome. SaaS valuation logic gets repriced along the way. The old model charged per seat because value scaled with how many people used it. A vertical agent's value scales with how much labor it replaces and how much risk it absorbs — under which per-seat pricing is self-contradictory: **the better you do your job, the fewer seats the customer needs, and the less revenue you make.** I lean toward thinking that internal contradiction forces pricing to migrate from seats to outcomes, and that migration is itself the red-blue divide projected onto a financial statement.

**Forecast two: enterprise memory becomes the core moat.** When model capability is thoroughly commoditized, the structured "memory and data" an enterprise accumulates itself — the kind an agent can call efficiently — becomes one of the few moats still standing in the AI era. Whoever turns their domain knowledge into memory an agent can consume becomes irreplaceable on their own turf. This is really the organizational version of the proprietary data flywheel.

Worth naming is how it relates to the process diagram above: **what enterprise memory actually has to hold is the stuff in steps ②③④ — why the definition was set this way, which year this exception was added and after what incident, what the regulator said verbally last time.** Today that lives in senior employees' heads and in meeting minutes from five years ago. Whoever turns it into a structure an agent can retrieve, cite, and audit has digitized an organization's least replaceable asset. Which also explains why enterprise memory isn't "a better knowledge base" — a knowledge base stores documents; enterprise memory has to store **judgments and their reasons**.

**Forecast three: payment infrastructure for agents starts to take shape.** I lean toward thinking the second half sees the first batch of payment, authorization, and reconciliation designs seriously rebuilt for "the payer is an agent." It won't explode overnight, but the direction is no longer blank. The signal I'll watch is specific: does a primitive emerge like "an authorization credential for an agent, carrying a task-level limit and a merchant allowlist" — **not issuing an agent a human's card, but issuing one task a credential that can only do that one thing.** Once that primitive standardizes, reconciliation and risk control can grow on top of it.

## An Honest Caveat

Let me walk some of this back, so the piece doesn't read like a recruitment flyer.

**A blue ocean is blue precisely because it's hard, dirty, and slow.** That isn't rhetoric. Vertical regulated work means grinding through regulations, passing audits, walking on eggshells in a domain where one error makes the news. End-to-end accountability means you genuinely backstop the outcome instead of tossing out a "for reference only." The payback period for these directions may be measured in years. Plenty of people charge into a blue ocean and end up not drowning but ground down, worn out, exasperated.

And blue oceans don't stay blue. Once someone walks the path, accumulates the data, and gets used to carrying the liability, today's hard, dirty, slow place slowly becomes the new red ocean. A moat is a verb, not a noun — stop maintaining it and it silts up. **The soft layer gets steamrolled, the hard layer won't budge** describes the terrain as it is now. Terrain changes.

I also have to throw cold water on my own test table: **these seven tests are very accurate looking backwards and very hard looking forwards.** For "why hasn't anyone killed it," you can always invent a beautiful answer after the fact. The hard part is that while you're inside it, you can't distinguish "nobody does it because it's hard" from "nobody does it because it's worthless" — those two look identical early on, which is exactly why hole one exists. I have no silver bullet for telling them apart, only a dumb method: **go find three people brute-forcing this with human labor, and see how expensive it is for them.** The answer to that question doesn't lie.

So don't treat "blue ocean" as a get-out-of-jail card. All it does is swap your death from "flattened by a model lab in one cycle" to "ground down by a long slog." What you're picking is the direction whose hard, whose dirty, and whose slow you happen to be able to bear.

## Closing: This Whole Column Was Only Ever About One Thing

This is where the column ends.

Looking back at these five pieces — they appear to cover five different things: the limits of information automation, a shift in interaction paradigm, the collapse of cost, the engineering of trust, the map of opportunity. Stack them, and one very straight line appears:

```
① The ceiling on information automation
   "Where an AI News Pipeline Finally Breaks"
   → the information layer goes to zero; nobody takes over the judgment layer
   → conclusion: once capability gets cheap, judgment is what's scarce
                     │
                     ▼
② The shift in interaction paradigm
   "The AI Agent Starts Prompting You"
   → it begins judging, for you, what most deserves doing right now
   → conclusion: judgment is partly handed over; the price is interruption,
     the wager is trust
                     │
                     ▼
③ The collapse of cost
   "Open Models Got ~90% Cheaper: How Big a Fleet Can One Person Run"
   → the floor under intelligence fell out; one person can afford a fleet
   → conclusion: capability is oversupplied, leverage grows, but "how much you
     dare use" now caps "how much you can run"
                     │
                     ▼
④ The engineering of trust
   "How to Hand Work to an AI Agent Nobody Is Watching"
   → guardrails + evals + HITL; compounding error is hard math
   → conclusion: the bottleneck moves from building agents to trusting them;
     trust can be engineered
                     │
                     ▼
⑤ The map of opportunity  ← you are here
   "The Red Ocean Is Full, Where Is the Blue Ocean"
   → wherever responsibility can be trustworthily carried, that's the moat
   → conclusion: the red ocean culls the movers of features; the blue ocean
     rewards the bearers of responsibility

   ┌────────────────────────────────────────────────────────┐
   │ One line: cheaper capability → pricier judgment →      │
   │ judgment must be trusted → trust must be engineered →  │
   │ whoever can be liable wins                             │
   └────────────────────────────────────────────────────────┘
```

In the first piece, [the limits of an AI news pipeline](/ai-agent/posts/ai-auto-news-pipeline-limits/), I worked out a funnel: automation compressed 800 items to 240, a ratio of 3.3x; going from those 240 to the one item that actually changed something I did was a ratio of 240x — all of it cut by a human's eyes and brain. That piece's conclusion was that information isn't worth much; the ability to process it is.

The second piece, [the agent that prompts you](/ai-agent/posts/proactive-agent-it-prompts-you/), was really about a machine touching that 240x human compression ratio for the first time — it starts judging, for you, what most deserves doing right now. And the price it immediately pays is interruption: the cost of one wrong interruption is roughly the benefit of six to ten correct prompts. **Once judgment is handed over, the cost stops being tokens and becomes trust.**

The third piece, [an agent fleet](/ai-agent/posts/open-model-cost-collapse-agent-fleet/), removed the constraint on how much you can run — after costs collapsed by nearly 90%, one person can afford a fleet. But it exposed a new constraint at the same time: **being able to run a hundred agents doesn't mean you dare use the output of a hundred agents.** Once supply is abundant, the bottleneck simply relocates.

Hence the fourth piece, [trusting an unattended agent](/ai-agent/posts/trusting-unattended-ai-agent/): guardrails, evals, HITL, and the compounding error nobody gets around. Its most important line was this — **trust doesn't come from a model's good intentions; it comes from engineering. Trust can be built.**

And this piece is where the first four inevitably land. If trust can be engineered, the next question surfaces on its own: **once you've built trust, what should you carry with it?** The answer is what this piece is about — **carry the responsibility nobody else dares to.** You'll notice that L4, "an insurer will underwrite this," is the commercial endpoint of the fourth piece's trust trio: guardrails plus evals plus HITL taken to their limit has a name, and the name is **insurable**.

So all five pieces have been circling one question:

**As capability gets cheaper and more general, what remains scarce, and what still stands?**

The first half's answer was model capability, so everyone crowded into the soft layer competing on features. The second half's answer changed. What stands isn't what you can do — it's **what you understand that others don't, what you're liable for that others won't be, and what you've accumulated that others can't take.**

The red ocean culls the movers of features. The blue ocean rewards the bearers of responsibility and the cultivators of data.

Those three things happen to be exactly where the column's five pieces land: **understand** (domain depth — what's left over inside the first piece's 240x compression ratio), **be liable** (end-to-end accountability — the commercial form of trust from pieces two and four), and **accumulate** (the data flywheel — the only asset that still doesn't depreciate after the third piece's cost collapse).

So back to that cold question from the start — why hasn't anyone killed this opportunity yet?

If you find a direction whose only reason for still being alive is that it's hard, it's dirty, it's slow, and somebody has to be liable for it — congratulations. **That isn't anyone's oversight. That's a ticket left for whoever is willing to eat the hardship.** The red ocean is full. The blue ocean is never in short supply; what's in short supply is people willing to jump into cold water and swim long enough.

See you in the second half.
