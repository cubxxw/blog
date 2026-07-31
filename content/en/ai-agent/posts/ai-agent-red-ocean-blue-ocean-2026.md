---
title: 'Where AI Agents Still Have a Blue Ocean'
date: 2026-07-15T18:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Agent
  - Product Strategy
  - Solo Builder
  - Super Individual
categories:
  - Development
description: >
  A practical map of defensible AI agent businesses: vertical workflows, accountable delivery, agent infrastructure, and moats that survive model progress.
tldr:
  - "General-purpose and horizontal agents are crowded: when differentiation lives mainly in prompts and orchestration, model and platform progress keeps compressing it."
  - "My framework tests three durable moats: a proprietary learning loop, domain depth, and bounded accountability for an outcome."
  - There is one cold test for red versus blue. Ask why nobody has killed this opportunity yet. If the answer is "everyone just noticed," it is red. If the answer is "because it is hard, dirty, slow, and somebody has to be liable," it might be blue.
  - "Accountability lives or dies in the contract: define the outcome, exclusions, review gates, remedies, and who decides a dispute."
  - "My blue-ocean shortlist is vertical regulated workflows plus agent infrastructure: runtimes, delegated payments, governance, and evals."
  - Agent payments already have serious entrants; the unfinished work is interoperability, delegated authority, risk controls, reconciliation, and disputes.
  - The difficult layer can be more defensible because domain context, controls, and accountability improve more slowly than a model feature.
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
  alt: 'A narrow blue passage beyond a crowded red ocean, representing defensible AI agent businesses'
---

Suppose you had to place a bet today on one direction in AI agents. What is the first question you should ask?

Most people ask whether the thing can be built. By mid-2026, that is often the least interesting part. The colder question is: **why has nobody made this opportunity routine yet?**

The answer is a useful filter. If nobody has solved it because everyone just noticed it, competition is probably coming. If nobody has solved it because the work is dirty, slow, and carries consequence, there may be something defensible—or there may be no market. The rest of the article is how I try to separate the two.

After following agent products and the infrastructure beneath them, I keep returning to a narrower thesis: **general-purpose agents are crowded, while defensibility collects around work that is specific, accountable, and operationally unpleasant.** This is an author's framework, not a law of the market. "Red" and "blue" describe competitive pressure, not product quality.

## A Map of the Battlefield: The Red Ocean Is Full, the Blue Ocean Is Hard to Enter

Let's draw the terrain first.

```
                       AI Agent Battlefield · 2026
   Easy to replicate ←──────────────────────────────→ Hard to replicate
   (soft layer / general capability)        (hard layer / domain + liability)

  ┌─────────────────── RED OCEAN (full) ─────────────────────┐
  │  coding agent   support agent   sales agent   scheduling │
  │       ▲             ▲              ▲             ▲       │
  │       │             │              │             │       │
  │   Model and platform progress keeps compressing features │
  │   (a feature alone is a shallow moat)                    │
  └──────────────────────────────────────────────────────────┘
                          │
      Defensibility shifts toward "learning + domain + accountability"
                          │
                          ▼
  ┌─────────────── BLUE OCEAN (hard to enter) ───────────────┐
  │  legal   healthcare ops   audit   research   mfg         │
  │      +                                                   │
  │  Infrastructure for agents: runtime · rails · eval       │
  │                                                          │
  │  Moat = learning loop · domain depth · accountability    │
  │  Price = hard, dirty, slow, and bounded by contract      │
  └──────────────────────────────────────────────────────────┘
```

I could list the red ocean column with my eyes closed: **coding agents, support agents, sales agents, scheduling agents**. What they have in common isn't that they lack value — quite the opposite, they are all genuinely useful. The problem is that they are all built on the **soft layer**.

## Why the Red Ocean Can't Be Defended

I wrote earlier in this column about how the soft layer gets steamrolled from above (see [From Chatbot to Agent to Skill](/ai-agent/posts/from-chatbot-to-agent-to-skill/)): the closer a feature sits to general language capability, and the less it depends on proprietary assets, the more easily it gets flattened by the layer upstream. The tragedy of the red ocean is written into that rule.

**First, feature moats are compressed by model progress.** A weekly-report drafter or scheduling assistant may be useful, but if most of its differentiation is a prompt, fallback rules, and orchestration, each upstream improvement removes some of the scaffolding customers once paid for. Orchestration can still be excellent engineering; it is simply not durable by itself.

**Second, platforms have structural advantages.** They may have lower unit costs, existing distribution, and the ability to bundle a feature into a product customers already use. Their marginal cost is not negative—compute, support, and risk still cost money—but their *incremental* economics can be better than those of an API-dependent startup. A thin product can therefore be squeezed even when nobody copies it line for line.

**Third, shallow differentiation produces shallow switching costs.** A crowded product can make money; it just needs a better answer than interface habit when asked what a customer loses by leaving.

Here's a plain self-test: **if all your users migrated to a competitor tomorrow, what would they lose?** If the answer is "they'd have to learn a new interface," you don't have a moat, you have a habit. If the answer is "everything they accumulated over two years, which exists only inside your product, is gone" — that's a switching cost. For red ocean products, the answer is almost uniformly the former.

In one line: **when features are your entire moat, you don't have one.**

## My Three-Moat Test

So what still stands? I use three tests. They are not the only possible moats, and they are not proof of a good business. But when two or three stack together, they expose where model progress helps a product instead of erasing it.

**One: the proprietary data flywheel — it gets better the more it's used.** This is one of the few old moats that still holds in the AI era. The key isn't that you have data; it's that **every single use of your product generates data nobody else can get, which makes your next run better**. Once that loop is closed, a latecomer with an equally strong model still has to spend the time from zero. Which echoes something I say often: **information itself isn't worth much. What's worth something is the ability to process it — and what settles out of that processing that nobody can copy.**

But "data flywheel" appears in too many decks without a loop behind it. A real learning loop needs four things:

1. **The output has to be judgeable as right or wrong.** After a user finishes, the system needs to know whether this run was correct. Drafting a weekly report has no right or wrong, only "eh, fine" — so it will never spin. But "did this regulatory filing get rejected" has a crisp verdict. **A rejection is a free label.** A direction with no verdict signal is accumulating logs, not data, no matter the volume.
2. **The verdict has to flow back as input to training or rules.** Knowing you were wrong isn't enough; you need an engineering path that turns "where it went wrong" into the next version's improvement. Lots of teams stall right here: the feedback sits in support tickets and never enters the pipeline.
3. **The data has to be exclusively yours.** If the same data can be scraped off the public web, or walks out the door when the customer switches vendors tomorrow, that's not a flywheel — it's a rented warehouse.
4. **The improvement has to be perceptible to users.** Otherwise they churn before the flywheel has turned enough times, and it stops before it ever spun up.

**To judge whether a direction can start a flywheel, look for a natural, cheap, high-frequency verdict signal.** That lens is a hundred times more useful than "we have a lot of data."

**Two: domain depth — does the team actually know the business?** The directions I find most defensible have industry language, implicit rules, and edge cases that appear in no document. A team that has walked a hospital process, worked through a legal matter, or survived audit season starts with context a generalist must earn. Domain depth can be hired or copied over time; it is costly because the learning curve includes real exceptions and trust.

The most valuable part of domain depth isn't knowing a lot — it's **knowing which step must not be automated**. Someone who hasn't lived in the industry cannot make that call. They'll hand every step to the model with equal confidence, and then get it wrong at exactly the place where being wrong is unaffordable.

**Three: bounded accountability — not merely an assistant, but a party that stands behind a defined outcome.** The contract may still require human approvals and cap remedies. The important difference is that the vendor names what it owns, what it excludes, and what happens when it fails. Responsibility is harder for a general capability layer to bundle than a feature.

## What "Hard, Dirty, Slow" Actually Means: Take One Process Apart

"Hard, dirty, slow" is easy to say and lands like a slogan. So let me put it into a concrete process — because **the barrier in a blue ocean lives in the details of the workflow, not in the capability of the model**.

Take one of the most common jobs in compliance and audit: a regulated institution has to file a periodic data return with its regulator. Sounds like "pull the numbers from the database, drop them into a template" — an afternoon's work. Anyone who has actually done it knows the process looks more like this:

```
  ①extract ──→ ②reconcile ──→ ③judgment ──→ ④cross-foot ──→ ⑤approve ──→ ⑥file ──→ ⑦Q&A
   ✅auto       ⚠️semi-auto     ⚠️review      ⚠️semi-auto     👤gate     ✅auto    👤lead

  ① Extract: pull from a dozen systems. Dirty because the systems are old and the
     interfaces are bad — but not hard. AI can do this.
  ② Reconcile: the same field is called "net amount" in system A and "net amount"
     in system B, but one is tax-inclusive and one isn't. The discrepancy is buried
     in meeting minutes from five years ago. AI can raise the question, not settle it.
  ③ Judgment: does this transaction belong to that account? AI can retrieve policy,
     compare precedent, and draft a rationale. A qualified owner still reviews
     material ambiguity because the missing context may never have been recorded.
  ④ Cross-foot: this table's total must equal the sum of certain rows in that table.
     The rule is writable; the exceptions are endless, and each one has a specific
     historical reason behind it.
  ⑤ Approve: the applicable rule, role, and jurisdiction decide who may attest or
     sign. Automation can prepare the evidence, but it does not erase the named
     person's or institution's responsibility.
  ⑥ File: call the API. AI can do this.
  ⑦ Q&A: when a regulator asks where a number came from, the agent can assemble
     evidence. A responsible owner should lead the answer. This needs an audit
     trail, not confident generation.
```

Once you can see the process, a lot of things click.

**First, the hard part tends to sit in the middle.** Extraction and submission are visible in a demo; reconciliation, judgment, exceptions, and response work carry the context and consequence. The gap between demo and production is the one I called the eval gap in [Trusting an Unattended Agent](/ai-agent/posts/trusting-unattended-ai-agent/); here its other name is domain depth.

**Second, what "dirty" concretely means is: rules have exceptions, and exceptions have histories.** Write a rule down, run it in an industry for ten years, and it grows dozens of exceptions — each one a specific incident, a specific piece of regulator feedback, a specific internal compromise. None of it is in any document. You can only accumulate it with time and people, which is exactly why it's slow.

**Third, step ⑦ explains why this class of product must build an audit trail.** A number needs a replayable lineage: source rows, transformation, definition, reviewer, and version. That engineering is less cinematic than generation and more useful on the day a regulator asks.

So "hard, dirty, slow" isn't a set of adjectives. It's a construction drawing. **Red ocean players see this drawing and walk around it. That's precisely why it's blue.**

## What End-to-End Accountability Looks Like on Paper: Contracts, Payouts, Insurance

"We take end-to-end accountability" sounds bold, but it has to land on paper or it's still marketing. I've seen too many products claim they stand behind the outcome, and then you open the contract and clause one says outputs are for reference only. **Those two statements cannot both be true.**

Real end-to-end accountability looks like the following, and it comes in gradations:

| Tier | What the contract says | Who eats the error | Pricing logic | Moat depth |
|---|---|---|---|---|
| L0 assistant | "Output is for reference only" | Customer, entirely | Per seat / per token | None |
| L1 tool with SLA | Guarantees uptime, not correctness | Customer, entirely | Per usage | Shallow |
| L2 measured outcome | Defines a measurable result and service credit | Capped remedy | Usage + outcome | Medium |
| L3 bounded indemnity | Covers specified direct losses, with exclusions and a cap | Vendor within the contract | Per outcome | Potentially deep |
| L4 risk-transfer ready | Controls and loss history support a tailored insurance discussion | Contract plus policy terms | Outcome + risk cost | Evidence, not proof |

The part of this table worth chewing on is **the jump from L2 to L3**. It isn't a copy upgrade; it's an upgrade of the entire company:

- You have to be able to **define "wrong" precisely**. If the contract says 99% accuracy, you must answer: what's the denominator? Is one filing one item or a hundred? Who adjudicates? Who arbitrates a dispute? — **If you can't answer these, the SLA is an empty sentence.** And being able to answer them requires exactly the verdict signal described above. You'll notice that **the conditions for starting a data flywheel and the conditions for landing end-to-end accountability are the same conditions.** That isn't a coincidence.
- You have to be **able to fund the remedy**. That means controls, reserves, legal review, and clear exclusions. A small team may accept bounded liability, but promising uncapped loss absorption would usually be reckless.
- You need a credible **risk-transfer conversation**. This is not purely hypothetical: Munich Re's [aiSure](https://www.munichre.com/en/solutions/for-industry-clients/insure-ai.html) describes cover for specified contractual liabilities, financial losses, and legal liabilities caused by AI performance errors, and publishes cases such as an insured model-performance warranty for lending. Insurance availability still depends on wording, jurisdiction, exclusions, controls, loss history, and appetite. A policy proves that a defined risk was underwritten under defined terms; it does not certify the whole product.

But the migration in pricing logic is where the value may sit: **L0 to L1 sells capability; L3 to L4 can sell a bounded outcome.** The former is compared with tool budgets. The latter can be compared with the cost of the process and the portion of risk actually transferred. That distinction is material, but the multiple is a matter for evidence, not rhetoric.

Back to the hard math of compounding error — I ran the numbers in [the trust engineering piece](/ai-agent/posts/trusting-unattended-ai-agent/): 95% per-step accuracy across 20 steps leaves you around 36%. It has a direct corollary here: **the precondition for daring to sign an L3 contract is that you've already decomposed the process so humans only review a few critical nodes, rather than running end-to-end autonomy.** Taking accountability is not the same as full automation. Quite the opposite — **the teams willing to be liable tend to be the most willing to keep humans on the critical steps**, because they know exactly which step costs them money when it's wrong. Which is why "taking accountability" and "human in the loop" aren't in tension. They're two sides of one thing.

## Where the Blue Ocean Is: Vertical, Regulated, End-to-End

Trace back along those three moats and the coordinates get clear.

**Blue ocean one: vertical, consequential workflows.** My shortlist includes legal compliance, healthcare operations, financial audit, research orchestration, and high-compliance parts of construction and manufacturing. These are hypotheses to test, not certified blue oceans. The attraction is that value depends on workflow evidence, exceptions, review rights, and accountability—not just fluent output.

The honest product shape is usually narrower than "replace the department." It might own evidence collection and reconciliation, preserve lineage, route ambiguous cases to a qualified reviewer, and submit only after the required approval. That is still an end-to-end service if the handoffs and remedy are explicit. Accountability does not require pretending the human disappeared.

**Blue ocean two: infrastructure for agents.** In a gold rush, the people selling shovels often last longest. When thousands of agents start actually running, start being trusted with unattended work (I wrote about how hard that is in [Trusting an Unattended AI Agent](/ai-agent/posts/trusting-unattended-ai-agent/)), they need a whole foundation that was built for humans and now has to be rebuilt for agents:

- **Runtime**: this is already an ecosystem, not untouched ground. [Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/) is a concrete first-party example: it provides runtime isolation, identity, memory, versioning, and observability across models and frameworks. The remaining opportunities are narrower—fleet policy, cost attribution, cross-platform governance, domain-specific traces, and incident response. Tooling for one agent and tooling for two hundred are different products.
- **Payment infrastructure**: this is also no longer blank. [Visa's Trusted Agent Protocol](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications/) lets merchants verify approved agents and their commerce intent. [Mastercard Agent Pay](https://www.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai) introduced registered agents, agentic tokens, and consumer controls; its 2026 [Agent Pay for Machines](https://www.mastercard.com/us/en/news-and-trends/press/2026/june/mastercard-launches-agent-pay-for-machines.html) extends the idea toward high-frequency machine transactions. [Coinbase's x402](https://www.coinbase.com/developer-platform/discover/launches/x402) embeds stablecoin payment requests in HTTP for APIs, apps, and agents. These are real rails and protocols, not slideware.

  The unfinished layer is coordination. How does authority travel across protocols? Which consent artifact proves a task, merchant class, time window, and spending ceiling? How are transactions reconciled to the agent run that caused them? Who carries evidence into a chargeback or service dispute? Visa's own materials say its product is still being deployed, while the networks continue to align with standards bodies and other protocols. The opportunity is therefore not "invent agent payments." It is to mature interoperable standards, risk controls, reconciliation, and dispute handling around an ecosystem that already exists.
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
| **Would you define the outcome in a contract** | No — "for reference only" | Yes — scope, review gates, and remedy | Contractual accountability is harder to bundle than a feature |
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

## What I Would Watch Next

Pulling the lens back through 2027, here are three structural calls. They are bets, not laws.

**Forecast one: vertical agents take some workflow value from horizontal SaaS.** Horizontal systems of record will not disappear. But where a vendor can measure a completed process and accept bounded responsibility, pricing can move from seats toward usage or outcomes. Whether that happens depends on procurement, margins, and proof—not on the label "agent."

**Forecast two: enterprise memory becomes the core moat.** When model capability is thoroughly commoditized, the structured "memory and data" an enterprise accumulates itself — the kind an agent can call efficiently — becomes one of the few moats still standing in the AI era. Whoever turns their domain knowledge into memory an agent can consume becomes irreplaceable on their own turf. This is really the organizational version of the proprietary data flywheel.

Worth naming is how it relates to the process diagram above: **what enterprise memory actually has to hold is the stuff in steps ②③④ — why the definition was set this way, which year this exception was added and after what incident, what the regulator said verbally last time.** Today that lives in senior employees' heads and in meeting minutes from five years ago. Whoever turns it into a structure an agent can retrieve, cite, and audit has digitized an organization's least replaceable asset. Which also explains why enterprise memory isn't "a better knowledge base" — a knowledge base stores documents; enterprise memory has to store **judgments and their reasons**.

**Forecast three: agent payments move from launches to interoperability.** The primitives already exist across Visa, Mastercard, Coinbase, and others. The signal I will watch is whether a task-bound authorization—agent identity, user consent, merchant scope, expiry, and spending ceiling—can travel across networks and survive reconciliation and dispute review. A credential is useful; a credential that different parties interpret the same way is infrastructure.

## An Honest Caveat

Let me walk some of this back, so the piece doesn't read like a recruitment flyer.

**A blue ocean is blue precisely because it's hard, dirty, and slow.** That isn't rhetoric. Vertical regulated work means grinding through regulations, passing audits, walking on eggshells in a domain where one error makes the news. End-to-end accountability means you genuinely backstop the outcome instead of tossing out a "for reference only." The payback period for these directions may be measured in years. Plenty of people charge into a blue ocean and end up not drowning but ground down, worn out, exasperated.

And blue oceans don't stay blue. Once someone walks the path, accumulates the data, and gets used to carrying the liability, today's hard, dirty, slow place slowly becomes the new red ocean. A moat is a verb, not a noun — stop maintaining it and it silts up. **The soft layer gets steamrolled, the hard layer won't budge** describes the terrain as it is now. Terrain changes.

I also have to throw cold water on my own test table: **these seven tests are very accurate looking backwards and very hard looking forwards.** For "why hasn't anyone killed it," you can always invent a beautiful answer after the fact. The hard part is that while you're inside it, you can't distinguish "nobody does it because it's hard" from "nobody does it because it's worthless" — those two look identical early on, which is exactly why hole one exists. I have no silver bullet for telling them apart, only a dumb method: **go find three people brute-forcing this with human labor, and see how expensive it is for them.** The answer to that question doesn't lie.

So don't treat "blue ocean" as a get-out-of-jail card. All it does is swap your death from "flattened by a model lab in one cycle" to "ground down by a long slog." What you're picking is the direction whose hard, whose dirty, and whose slow you happen to be able to bear.

## Closing: This Whole Column Was Only Ever About One Thing

This is where the column ends.

The five pieces in this column now form one line. [The news pipeline](/ai-agent/posts/ai-auto-news-pipeline-limits/) asked what remains when information becomes cheap. [The proactive agent](/ai-agent/posts/proactive-agent-it-prompts-you/) showed that delegated judgment spends trust, not just tokens. [The agent fleet](/ai-agent/posts/open-model-cost-collapse-agent-fleet/) made capability abundant. [The trust engineering piece](/ai-agent/posts/trusting-unattended-ai-agent/) argued that guardrails, evaluation, and human review can make that abundance usable.

This final piece asks what to carry once trust has been earned. My answer is modest: carry a well-defined part of the responsibility. Define the boundary, preserve the evidence, keep the right human at the irreversible gate, and accept a remedy you can actually fund.

As capability gets cheaper and more general, what remains scarce is not magic. It is accumulated context, practiced judgment, and a counterparty willing to stand behind a bounded outcome.

So back to that cold question from the start — why hasn't anyone killed this opportunity yet?

If a direction remains awkward because the exceptions matter and responsibility cannot be hand-waved away, look closer. It may be a moat; it may also be a bad market. Find the people already paying for the pain, then decide whether you can stay in the water longer than the work takes.

See you in the second half.
