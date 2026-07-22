---
title: AI Writes Requirements for Free, and That's the Most Dangerous Part
ShowRssButtonInSectionTermList: true
date: '2026-07-19T10:00:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['judgment layer', 'requirement gate', 'acceptance criteria', 'AI Agent', 'rules file', 'CLAUDE.md', 'AGENTS.md', 'super individual', 'indie developer', 'survivorship bias', 'hit rate', 'context engineering']
tags:
  - AI
  - Agent
  - Super Individual
  - Context Engineering
  - Product Strategy
  - Solo Builder
description: >
  When execution cost approaches zero, the price of building the wrong thing doesn't shrink — it becomes payable in full. AI generates requirements at near-zero cost, so your queue fills with tasks that look reasonable and deliver little, and agents will faithfully complete every one. This essay takes apart the three jobs of the judgment layer: how to guard the requirement gate, how to write acceptance criteria, and how to externalize judgment into rules files the agent reads on every run — the only part of this layer that compounds. It's also honest about the half of judgment that rules can't hold, and why hit rate is the only real test of judgment.
tldr:
  - Execution cost going to zero doesn't shrink the price of a wrong direction — it amplifies it. The build cycle itself used to be your mid-course wake-up buffer, and that buffer is gone.
  - AI generates requirements at near-zero cost, and that's the most dangerous link in the whole system — your queue fills with plausible-looking low-value tasks, and the agent won't doubt them for you.
  - If you can't write acceptance criteria for a ticket, you haven't thought it through — handing it to an agent at that point amplifies your confusion by the degree of parallelism.
  - The only part of the judgment layer that compounds is the part you write down — taste in your head doesn't compound; conventions settled into project rules files do.
  - The test of judgment isn't "this thing I built worked" but hit rate — even the most successful indie developers hit around 5%, so the goal is to fail cheap, fail fast, and salvage assets from every miss.
maturity: budding
columns:
  - super-individual-stack
series:
  name: The Super Individual's Gear Stack
  slug: super-individual-stack
  order: 3
  total: 5
cover:
  image: /images/covers/ai-agent/2026/super-individual-stack-judgment.jpeg
  alt: "AI Writes Requirements for Free, and That's the Most Dangerous Part"
---

## One morning, and three things that shouldn't exist

One morning I got up, made coffee, opened my laptop, and found the agents I'd left running overnight all parked at "done": one had added full multilingual support to a small tool of mine — Chinese, English, Japanese copy, an i18n layer extracted; one had built reading-progress analytics for my blog; one had refactored a CLI I wrote six months ago into a plugin architecture. The code was clean. The tests were green.

I sat there for about ten minutes, then rolled back two of them. I personally know most of that tool's users — all Chinese speakers, not one had ever asked for an English version. The CLI has exactly three commands and hadn't gained a feature in half a year; I had built ecosystem infrastructure for a thing with no ecosystem. The one I kept, I didn't keep because it was right — I kept it because rolling it back was more trouble than living with it.

This isn't AI doing bad work — put these three changes through code review and every one passes. Their problem isn't at the implementation level. It's earlier: **they should never have been queued in the first place.** And queuing them was my doing. The night before, I'd spent twenty minutes chatting with a model while scrolling my phone, "organizing" a few vague notions into three well-structured, professional-sounding tickets. The whole process felt as pleasant as doing planning.

---

This is the third essay in *The Super Individual's Gear Stack*. In the [overview](../super-individual-stack-four-layers/) I split the gear into four layers, with one test: does progress in this layer help only you, or does it help all your competitors at the same time? The [previous essay](../super-individual-stack-production/) covered the production layer, and the conclusion was "equip to sufficiency and stop," because every improvement there is a public good issued to the whole industry simultaneously.

This one is about the third layer, judgment. If you read only one essay in this series, I hope it's this one.

## Execution cost going to zero amplifies the price of the wrong direction

Let me start with a causal relationship I think people have systematically backwards. Most people's gut response to "AI makes execution cheap" is: great, then trial-and-error is cheap too — try more things, being wrong costs nothing. That inference sounds self-evident, but it drops a key variable.

In the old world, building something took three months. If you judged the direction wrong on day zero, the next three months would keep slamming you into reality: week three you discover a core assumption needs users to cooperate and they won't; week six you show someone the half-built thing and they give a polite "hm"; week nine you start doubting the whole enterprise yourself. **The long build process was itself a channel that kept feeding you feedback** — many wrong directions were discovered and aborted mid-course, and never became a full sunk cost. The three-month build cycle wasn't just a cost; it was simultaneously a buffer.

In the new world, building something takes three hours. You judge wrong at minute zero, and three hours later it's built — with no point along the way where you stop and ask "wait, does this even matter?" — because there is no along-the-way. **Your wrong judgment converts into a finished product at full face value, with zero attrition.** Worse is the second-order effect: because everything is fast, you queue three to five tasks at once, and by the time the first wrong output lands in front of you and you realize the direction is off, the others have already finished. **You didn't get one thing wrong. You got five things wrong before you woke up.**

Drawn out, it looks like this — and it's the starting point for everything else in this layer:

```
  Old world (build = 3 months)

  Judge ──┬──────────────────────────────────────┬──► Ship
          │  week 3      week 6      week 9      │
          │    ▲            ▲           ▲        │
          │  hit wall   cold reception  doubt    │
          └── the build itself keeps sending feedback ──┘
               → many wrong directions die mid-course, on their own
               → sunk cost = partial


  New world (build = 3 hours)

  Judge ──────────────────────────────────► Ship (same night)
          └─ no mid-course, no wall, no cold reception, no doubt ─┘
               → wrong directions run the full course, 100% of the time
               → sunk cost = full amount

          And it looks like this:

  One wrong judgment
       ├──► agent A ──► finished product (wrong)
       ├──► agent B ──► finished product (wrong)
       ├──► agent C ──► finished product (wrong)
       └──► agent D ──► finished product (wrong)
              ▲
         parallelism multiplied a single misjudgment by 4
```

So my conclusion is the opposite of the popular take: **cheap execution didn't lower the cost of trial and error — it moved that cost from "build cost" to "judgment cost," and amplified it once in transit.** The cost of a failed try was never just "what it cost to build." It also includes the attention you spent, the maintenance burden you took on, and the most expensive item of all — **the time slot it occupied that could have gone to the right thing.**

There's a line from the DORA 2025 report that has stuck with me, roughly: AI doesn't fix your team, it amplifies it. That holds for individuals too, and hits harder. **AI amplifies the judgment quality you already have — including the confusion inside it.**

## Requirement inflation: the most dangerous link in this system

In the old world, writing a requirement carried a cost of its own. You had to turn a vague notion into something another person could understand: what problem it solves, where the boundaries are, what "done" means. That was exhausting enough that many notions died mid-document — you'd get halfway through and realize, huh, this doesn't actually matter that much. **The act of "writing the idea down clearly" has long moonlighted as a requirement filter.** It works on friction, and the friction isn't a bug — it's the only free sieve in the system.

AI erased that friction. Now all it takes is one sentence — "I want to add multilingual support to this tool" — and the model returns a fully structured spec, written better than you would have written it, three minutes apiece, twenty in an evening. **This is requirement inflation**, and the mechanism is almost identical to monetary inflation: **when the cost of issuance approaches zero, issuance volume runs out of control, and the value per unit falls.**

The dangerous part is that every "banknote" in this inflation looks genuine. If AI-generated requirements were obvious nonsense, you'd veto them on sight. The problem is they're all reasonable — multilingual support, reading analytics, plugin architecture — each one stands up on its own, even sounds a bit professional. **Reasonable and worth doing are two entirely different things, and AI only guarantees the former.**

Ask a model "how should this feature be built" and it will earnestly help you build it. It will not ask back "are you sure you want to build this?" It doesn't have your opportunity-cost function; it only has the context you gave it — and that context usually already presupposes the thing is happening.

Stack on one more mechanism and the inflation loop closes:

```
   A vague notion
        │
        │  ← old world: friction here (writing it up is exhausting)
        │     many notions die at this step
        ▼
   AI turns it into a spec in three minutes
        │  ← friction erased, notions pass at 100%
        ▼
   A professional-looking ticket      ← the "professional appearance" itself
        │                               manufactures legitimacy — you overvalue
        │                               it because it's well written
        ▼
   Into the queue (almost no resistance)
        │
        ▼
   Agent executes faithfully          ← the agent doesn't doubt, it only delivers
        │
        ▼
   Finished product + maintenance burden + your attention consumed
        │
        └──► your system got more complex, but you got no closer to your goal
```

That last arrow is the real price of all this. Not "a few hours of compute wasted" — it's **your system silently growing complex**: every feature that shouldn't exist taxes every future change. The most concrete pothole I've hit is that i18n layer — rolling it back was far harder than adding it, because it had seeped into a dozen files. **Adding a thing is the agent's job. Removing a thing is yours.**

That line in the diagram — "the professional appearance itself manufactures legitimacy" — deserves its own emphasis. You will, without noticing, translate "this document is high quality" into "this requirement has been vetted." But the document quality came from the model. The vetting was supposed to come from you, and you spent three minutes.

## How to guard the requirement gate

The methods below are what survived a year of my trying things — not because they're clever, but because they're dumb enough that I still execute them at my laziest.

### A "not doing" list

I now keep a file called `NOT-DOING.md` in the project root, sibling to the README. It's not a todo list — it's the things I've explicitly decided not to do, each with one line of why. My blog project's file has entries like:

- No comment system. Reason: I'm here to write, not to run community engagement; email and GitHub are enough.
- No self-built index for full-text site search. Reason: at this site's scale, users actually arrive via search engines, not by searching within the site.
- No automatic translation for the multilingual version. Reason: the English edition needs rewriting, not translation; machine translation would pollute the quality signal.

This list's value isn't at the moment of writing — it's three months later. Three months later I will absolutely think of the comment system again. Human notions are cyclical; the same idea keeps reincarnating in your head. Without this list, I'd treat it as a fresh idea and enthusiastically re-litigate it, and maybe this time it passes. **The essence of a not-doing list is leaving evidence for your future self, so the same bad idea can't keep invading on the strength of your forgetting.**

Write it concretely. "No over-engineering" is useless — anyone can explain the thing they want to build as "not over-engineering." Write falsifiable entries like "no comment system."

### A hard cap on in-flight tasks

The second one is cruder: **set a hard cap on tasks running at the same time.** Mine is 2. Not 5, not 10 — 2.

That number sounds laughably low — especially in a discourse where everyone's talking about "orchestrating ten agents in parallel." But here's my math: the bottleneck isn't on the agent's side, it's on mine. **The number of outputs I can genuinely, seriously review in a day is about two or three.** Not the "skimmed it, looks fine" kind — the kind where I actually read it, understand it, and think through what it does to the system. The previous essay made the point: once execution speed goes up, the bottleneck moves to review bandwidth, and review bandwidth is nearly impossible to scale the same way. If I run five at once, the result isn't "I did five things" — it's "I reviewed five things at skim quality."

**Fewer, but true.** The operating discipline: when I want to open a third task, I first close one — merge it or kill it, no leaving it hanging. Hanging tasks rot; come back two weeks later and it reads like a stranger's work.

The cap has one hidden benefit: it moves the pain of choosing earlier. When you can only run two things at once, you have to make real trade-offs at queue time. **The value of a gate is precisely that it has to hurt a little. A gate that doesn't hurt isn't a gate — it's a hallway.**

### "What happens if I never do this?"

The third is a change in how you ask, cheapest to adopt and most effective. Before queuing any task, I force myself to answer the inverse question: **if this never gets done, what happens?**

Not "what's the upside of doing it" — that question always has an answer; everything has upside if you do it, which is exactly why it's useless. Run that morning's reading-progress analytics through it: what happens if I don't build it? Answer: I won't know how far readers get. And if I knew, then what? Answer: uh... I'd probably adjust article length? And right now, not knowing, can I not adjust length? Answer: I can. Verdict: don't build it.

What's distinctive about this question is that **it forces you to name a specific, bad consequence.** If you can't, or you need two layers of contortion to invent one, the thing is skippable.

There's a variant that works especially well on "architecture" requirements: **if I postpone this three months, does it get more expensive?** If the answer is "no," postpone it. The cost of postponing is severely overestimated for the vast majority of "we'll need it eventually" architecture work in software — because what you learn during those three months of postponement will make you do it better than you would now. The only things that genuinely can't wait are the ones that cause data loss, security holes, or user migrations.

### Position AI as "structures the idea," never "decides what to build"

The last one is about positioning, and it's the most important. I draw a very clear line:

> **AI's job is to turn a thing I've already decided to do into a rigorous spec. It does not decide what to do.**

This side of the line (my job): should this thing exist, who is it for, what happens if it's never done, where does it rank in my next three months. That side of the line (AI's job): given that we're doing it, where are the boundaries, what cases haven't I thought of, how do we write the acceptance criteria so they're falsifiable.

**On that side of the line, the model is absurdly strong.** It's better than me at enumerating edge cases, better at unpacking "add an export feature" into twelve precise behavioral statements. **On this side of the line, the model's output is nearly worthless to me.** Not because it's dumb — because what it lacks is information, not capability. It doesn't know where I want to be standing in three months. It doesn't know which user's complaint has been living in my head for half a year. And I can't feed it those things completely — not out of laziness, but because I can't fully articulate them myself.

So I separate the two in time: **when deciding what to build, the AI stays closed.** I first write down, in a blank document, what I'm doing and why. Only when that's done do I open the model and say "turn this into a spec."

I've learned what happens when the order flips. I once started by chatting with the AI, and mid-conversation it listed five "directions worth considering." I picked one of the five, and felt the sensation of having made a choice. But those five options were its. **It set the choice set; all I did was pick from it — and the real judgment happened at the moment the choice set was set.**

## Acceptance criteria are judgment made concrete

Everything above was about whether to build. This section is about what "built right" means. My rule: **if I can't write acceptance criteria for a ticket, I don't hand it to an agent.** Not "hand it off and figure it out along the way" — I don't hand it off.

The reason is direct: if I can't write acceptance criteria, I haven't figured out what the world should look like once this thing is done. Hand it to an agent in that state and it will **guess** the parts I haven't figured out — it has to guess, because it must deliver something complete — and its guesses will arrive in the form of finished code, indistinguishable from the parts I actually thought through. **That's confusion, amplified**: my vagueness becomes its specificity, my hesitation becomes its certainty, and after one round of conversion I can't even tell which parts I intended and which parts it guessed.

So acceptance criteria aren't process bureaucracy. They're **judgment in verifiable form.** "Judgment" is a vaporous word — so vaporous you can't tell whether you've exercised it. Acceptance criteria bring it down to the ground: if you can write them, you've thought it through; if you can't, you haven't.

### What good acceptance criteria look like

Bad ones first. Bad acceptance criteria look like this:

- Smooth user experience
- Good code quality
- No obvious performance regression
- Compatible with existing features

The shared problem with all four is that they're **unfalsifiable**: any output can be argued to satisfy them, and any output can be argued to fail them. They look like criteria; they're actually four blessings. Good acceptance criteria have three traits.

**First, falsifiable.** "Exporting 10,000 rows completes within 3 seconds" is falsifiable; "export is fast" is not. Falsifiable means that when the work is done, you get a yes or a no — not a discussion.

**Second, they include negative cases.** Most people write only "input A should yield B," never "invalid input C should be rejected, with this message." And an agent's behavioral signature is: **cases it wasn't asked to handle, it will quietly handle in some plausible-looking way.** Swallowing an exception and returning an empty array, say — the feature "works fine," and the problem surfaces three weeks later as data inconsistency.

**Third, they include the dimensions AI won't care about on its own.** This one has empirical backing. Veracode's 2025 GenAI code security report has a data point: 45% of code samples failed security tests. More notable is their other observation — models keep improving at writing *functionally correct* code, but show no improvement at writing *secure* code, regardless of model size. That exposes a misalignment between the training objective and yours: "it works" has abundant positive feedback signal; "it can't be exploited" has feedback that's sparse, delayed, and often absent from training data entirely.

**So the dimensions AI won't spontaneously care about must be written into your acceptance criteria explicitly.** Beyond security, my list usually includes: **observability** (the logs an agent writes by default are for its own debugging, not for you three months from now), **rollback** (anything touching data structures must spell out the rollback path), **dependency delta** ("no new runtime dependencies" — if one is truly needed, argue for it separately), and **deletion** (can this change delete something along the way — by default an agent only adds, never subtracts, and over time the system monotonically bloats).

What these share: **their payoffs are delayed, diffuse, and invisible to "does the feature work."** Which is precisely why they never get satisfied spontaneously — any optimization process whose goal is "ship this feature" will naturally squeeze them to the floor.

### A side effect

Writing acceptance criteria has a benefit I didn't anticipate: it kills a portion of requirements. Several times I've sat down to write criteria for an idea and gotten stuck at the field "what changes once this is done" — not stuck for words, stuck because nothing really changes. The notion died in the act of writing its acceptance criteria. **That happens to restore exactly the friction AI erased — except this time I reinstalled it myself.**

## Externalizing judgment into rules: the only part of this layer that compounds

Everything so far has been "personal capability": your taste, your trade-offs, your discipline. The problem with those things is — **they don't compound.** Your judgment today isn't automatically stronger because you exercised it yesterday, and you can't hand it to anyone — including an agent. In the overview I called the judgment layer a "half-asset," and this is what I meant. This section is about the half that can become an asset; the next section is about the half that can't.

**The half that can become an asset has exactly one method: write the judgment down, in the place the agent automatically reads every time it starts work.**

### Two kinds of things, kept apart

**What doesn't change goes in the rules file.** Code style, naming conventions, testing requirements, architectural boundaries, red lines on tech choices, the uniform pattern for error handling. These are the crystallized form of your judgment; they hold across tasks and don't change depending on whether today's job is an export feature or a login flow. **What's specific to this task goes in the ticket**: what the feature does, where its boundaries are, what the acceptance criteria say.

The distinction pays off very concretely: **once the rules file is in place, tickets get short.** Many of my tickets are now three to five lines, because the background lives in the rules file and the agent reads it every time — I no longer repeat "remember to write tests" or "no new dependencies." Say it once, and it holds forever.

That's what compounding looks like in the concrete. **Every problem you catch in review, if you only fix it in place, comes back next time; if you write it into a rule, it never comes back.** The former is expenditure, the latter is accumulation. My own habit: **the second time I correct the same problem, it must go into the rules** — the first time might be chance, the second time is a pattern. The virtue of this discipline is that it doesn't require me to foresee all the rules up front — the rules get hammered out of me by reality, one at a time.

### Layer your rules — don't pile them into one file

The most common failure mode of a rules file is that it becomes an ever-growing dump where everything gets thrown: three months later it's eight hundred lines, half of it stale, and the red lines that actually matter drown in the noise. Claude Code's official guidance draws a pretty clear layering:

- **`CLAUDE.md`**: loaded in full every session, which means it has a cost — context budget, attention budget — and the official recommendation is to keep it under 200 lines. I only put in **the red lines and highest-frequency conventions that hold across all tasks.** This file should feel like every single line is worth reading every single time.
- **`.claude/rules/`**: conditionally loaded — you can declare `paths` in the frontmatter, and file-path matching decides whether this run loads it. **Rule relevance was always scoped; this mechanism finally makes the file's scope match its actual scope.**
- **Skills**: loaded on demand. Right for the "rarely done, but with a whole fixed procedure when it is" category — like a release process.

The core logic of layering is **matching load cost to usage frequency**: putting occasionally-used things into the always-loaded zone dilutes the things you use every day.

### A detail a great many articles get wrong

While we're here, a pothole — because I've seen plenty of articles, in both Chinese and English, get this backwards: **Claude Code reads `CLAUDE.md`. It does not read `AGENTS.md`.** `AGENTS.md` is a cross-tool convention that OpenAI released in August 2025 and donated to the Agentic AI Foundation in December 2025, with adoption across 60,000+ open-source projects; the official bridge is to import it from `CLAUDE.md` via `@AGENTS.md`.

The detail itself doesn't matter much. What matters is the thing behind it: **rules files are shifting from "some tool's configuration" to "part of the project."** Once rules travel with the repo instead of the tool, they've genuinely become assets.

One final reminder: rules expire. Stale rules left in the file keep burning context and can mislead the agent into reasoning from obsolete premises. **Deleting from the rules file matters as much as deleting code — and is equally unloved.**

## The half that rules can't hold

Now I have to be honest about the boundary, or this essay turns into a false promise: **what can be written as rules is only part of judgment — and quite possibly the less important part.** Let me try to draw the line precisely:

```
              The judgment layer
    ┌────────────────────────────────────┐
    │                                    │
    │   Externalizable (rules-file-able, │
    │   compounds)                       │
    │   ─────────────────────────────    │
    │   · code style, naming, directory  │
    │     conventions                    │
    │   · testing requirements, coverage │
    │     floor                          │
    │   · architectural boundaries (who  │
    │     may not depend on whom)        │
    │   · red lines on new dependencies  │
    │   · security / observability /     │
    │     rollback checklists            │
    │   · "a mistake made once" → rule   │
    │                                    │
    │   Traits: holds across tasks,      │
    │     falsifiable, fully             │
    │     expressible in words           │
    ├────────────────────────────────────┤
    │                                    │
    │   Non-externalizable (grows only   │
    │   on a person)                     │
    │   ─────────────────────────────    │
    │   · whether this thing deserves    │
    │     to exist                       │
    │   · who it's for, who it's not for │
    │   · when to stop, when to cut      │
    │   · how to trade simplicity        │
    │     against completeness           │
    │   · what counts as "good"          │
    │                                    │
    │   Traits: context-dependent,       │
    │     shifts over time, distorts     │
    │     the moment it's written down   │
    └────────────────────────────────────┘
              │
              └──► this half is why AI can't flatten it,
                   and why it can't be handed off
```

The top half compounds; the bottom half doesn't. And **the decisions the bottom half governs are far bigger than the top half's**: get code style wrong and the price is a few ugly spots per file; get "should this thing exist" wrong and the price is three months. Yet only the former can go in a file.

Why can't the latter be written down? The answer, roughly: **this class of judgment takes infinite-dimensional input, and text is finite-dimensional.** "Is this feature worth building" depends on who your users are right now, where their real pain is (as opposed to what they say), where you want to be standing in three months, and the state you're in today. Most of that is tacit knowledge — you can judge with it, but you can't say what it is. Polanyi's line: we know more than we can tell.

You could write a rule like "prioritize features users have explicitly asked for." Sounds fine. But sometimes the feature users ask for is wrong — they're describing an imagined solution, not their problem — and then you have to violate your own rule. And **"when to violate the rules" cannot itself be written as a rule.** Write it down and it becomes a new rule, needing new exceptions, recursing forever.

So my stance on this layer: **rules are the sediment of judgment, not its substitute** — they don't spare you from judging; they concentrate judgment where judgment is still needed.

### Agents need a caretaker

Every's experience is a good example here, because it's a conclusion a real organization reached at real scale — not somebody's opinion.

Dan Shipper wrote a retrospective of Every's agent practice in May 2026. They initially **gave every employee their own agent** — perfectly in line with the "super individual" intuition. Later they **walked it back**, moving agents to team or company ownership, maintained by dedicated AI engineers, for a plain reason: personal agents **decay fast**. Shipper's core claim, roughly: for today's AI agents to actually be useful, they need someone who cares about them; the farther an agent sits from the person responsible for making it work well, the worse it works.

That cuts against the "AI gives everyone their own team" narrative — and it matches my own felt experience exactly. **An agent's effectiveness doesn't depend on how strong the model is; it depends on whether someone is continuously tending its context** — are the rules updated, is the stale stuff deleted, are freshly-hit potholes being sedimented in. With no one doing that, the agent slowly degrades into a thing executing conventions that expired three months ago — and the degradation is silent: it throws no errors, its output just drifts further and further from what you want.

Incidentally, the title of that Every podcast episode was "We Automated Everything With AI and Tripled Our Headcount" — automation didn't reduce the need for people. It changed what people do, **from executing to tending judgment.**

## Hit rate: the only honest test of judgment

The last section is about a more fundamental question: **how do you know whether your judgment is any good?** Most people's answer is to review their successes — this thing I built worked, so I judged right. That answer doesn't hold, for a reason too familiar to need naming: survivorship bias. But the concept has been said so often it's lost its force, so I want to make the case with harder material — hard because **it comes from the successful people themselves.**

### A 5% hit rate

Pieter Levels is probably this era's most-cited exemplar of the "super individual." He has a tweet to this effect: of the 70+ projects he's built, only 4 made money and grew; more than 95% of everything he's ever done failed; his hit rate is about 5%. Therefore — ship more.

That's the most persuasive anti-survivorship-bias material I've ever seen, because it isn't a loser's self-consolation. It's a man already standing on the summit, turning around, pointing at the pile of wreckage below, and saying: those were all mine too.

**5% means that even if your judgment is already good enough to stay in this game long-term, you will still be wrong 19 times out of 20.** If your mental baseline is "I should judge correctly," you'll start doubting yourself at failure number 3 and quit at number 8. At a 5% hit rate, failure number 8 carries no information whatsoever. **A lot of people don't lack judgment — they hold a wrong baseline for their own judgment, and exit too early against that wrong baseline.**

### fly.pieter.com, and a detail that must be spelled out

The same man supplies an even more frequently cited case. In February 2025, Levels used Cursor plus Claude plus Grok 3 to build a flight-simulator prototype in roughly three hours. The thing went from zero to $1M in annual recurring revenue in **17 days**, hit $87K in monthly revenue, and was played by 320,000 people. The story has been cited endlessly, usually as "look — in the AI era, three hours builds a million-dollar business."

But the case contains a detail almost nobody mentions, and it's exactly the one that matters most: **the revenue model was primarily in-game ad placements, not subscriptions.** Ad-placement revenue depends on an **attention peak** — during that stretch it was wildly viral on social media, 320,000 people poured in, and the ad slots were valuable because of it. What it sold wasn't really software. It was a short-lived window of attention.

So what the case actually proves is: **when you already possess enormous distribution and a stock of reputation — which happen to be layers two and one of this series — one successful capture of attention can be monetized extremely fast.** The three-hour part is the least important, and most easily replicated, part of the story.

I have deliberately not cited the product's revenue figures one year on, because I can't find a reliable source. **In a field where everyone tells stories with numbers, "I don't know" is an answer that deserves protection.**

### 54% at zero — and the survivorship bias inside that number itself

One more, colder, set of data. ScrapingFish scraped 937 products on Indie Hackers with Stripe-verified revenue. Result: **over 54% of the products had zero revenue**, and only about 5% cleared roughly $8,333 in monthly revenue. That 5% is the same order of magnitude as the hit rate Levels reports — two independent sources pointing at the same order of magnitude says something.

**But what's more worth saying is the bias inside the dataset itself.** It counts people who finished the product, actively shipped it, and were willing to hook up Stripe for revenue verification — each of those three acts is a sieve. The overwhelming majority of "I'm going to build a product" notions never reach the first sieve — they die at "abandoned it halfway," "finished it, never launched" — **they're not in the denominator at all.**

So "54% at zero" isn't a pessimistic number. It's an **optimistic lower bound.** And that meta-level observation is worth more than the data itself: **every statistic about success rates you will ever see has already passed through at least one round of filtering, and the filtering always points the same way — toward making the number look better.** Nobody's faking it; the generating mechanism of the data carries the bias by construction — failures don't post, abandoned projects don't hook up Stripe.

### So the goal is not "be right every time"

If the ceiling on hit rate sits around 5%, then setting the judgment layer's goal to "raise the hit rate" is inefficient — the room for improvement is small, and the feedback cycle is too long to learn from. I think the right goal is three things.

**First, fail cheap**: make every wrong direction consume as little as possible — simpler architecture, smaller initial scope, less up-front investment. Levels's stack — single-file PHP, no framework, SQLite, one machine — draws sneers on engineering aesthetics, but under a 5% hit rate it is supremely rational. And this is the real argument for minimal architecture: not the aesthetic claim that "simple is more elegant," but that **in a high-failure-rate game, the first job of architecture is to lower the cost of a single failure.** Complex architecture does exactly the opposite — it raises each project's sunk cost, and thereby raises the psychological bar for abandoning a project that's clearly not working. **Architectural complexity converts into fuel for the sunk-cost fallacy.**

**Second, fail fast**: get the wrongness exposed as early as possible — which means reaching real users early, not finishing the code early. **"Built it in three hours" and "learned in three hours that it doesn't work" are two entirely different things, and the second is the valuable one.** Most people use AI to accelerate the first, with the result that the wrongness surfaces no sooner — there's just more wrong output.

**Third, salvage assets from every failure.** This one matters most, and it connects the essay back to the [overview](../super-individual-stack-four-layers/) — the four layers have a direction: every output of the production layer should sediment downward into distribution-layer and reputation-layer assets, and it's precisely in the failure scenario that this direction shows its value.

When a project fails, if all you had was the project itself, you're back to zero. But if along the way you wrote a retrospective, extracted a reusable component, sedimented the potholes into three new lines in the rules file — then the project scores zero on the *product* dimension, and **non-zero on the other three.**

```
   One failed project

   Product dimension ──────────────► 0        (95% of the time)
        │
        ├──► Judgment layer: +3 rules            (won't make that mistake again)
        ├──► Distribution layer: one retrospective (brings readers)
        ├──► Reputation layer: one act of public honesty
        │                                        (telling failures builds more trust
        │                                         than telling successes)
        └──► Production layer: one reusable component
                                                 (faster cold start next time)

   → hit rate is still 5%, but the net loss per miss shrinks significantly
   → and attempt N starts from higher ground than attempt 1
```

**This is the actual condition under which "ship more" holds as advice.** Levels says ship more, and many people hear "roll the dice a few extra times" — but if every failure is a pure zeroing-out, that's just extra draws at the same 5%, expected value unchanged. Ship more works because **every shipment tops up the three non-product layers.**

So what the judgment layer ultimately points at isn't "was I right this time" — it's "**if I'm wrong this time, what's left over?**" Being able to answer that honestly is far more realistic than raising your hit rate.

## Things I haven't figured out

As usual, here's the part of this essay I'm not sure about, laid out plainly.

**First, an in-flight cap of 2 may just be my personal review ceiling, not a general law.** Someone with a better automated acceptance harness might safely run 5 or 8. What deserves recommending isn't the number — it's the method: **find your own ceiling for serious review, and set the gate to that number, not to the agents' parallel capacity.**

**Second, I may be underestimating the model's potential on the "deciding what to build" side.** I drew that line based on the context I currently give models. If a model could truly read my full project history and my past decision records, how much better would its directional judgment be? My intuition says considerably better but still not enough — because the most critical input is "what I want to become," and that's something even I keep changing. But intuition is not an argument.

**Third, the "non-externalizable judgment" boundary may be moving downward.** Five years ago I'd have said "code style is taste, it can't be written down" — and now it sits squarely on the externalizable side. I accept the possibility, but I won't abandon this layer today because of it — **while a boundary is moving, standing in front of it is more dangerous than standing behind it.**

**Fourth, the 5% hit-rate figure may have a narrow range of applicability.** Someone building vertical-industry tools with a stable customer pipeline may hit far more often. **The test of judgment should be calibrated to the game you're actually playing.**

**Fifth — and the one that unsettles me most: could externalizing judgment into rules end up weakening the judgment itself?** Once everything I've figured out is written into a file and no longer needs re-thinking each time, will I slowly lose the ability to re-think it? That rule in the file, "no new dependencies" — three years from now, will I remember why I set it? I lean toward the benefit outweighing the risk, but I have no way to verify.

## Closing

While writing this essay, I deleted an entire section. It was about "how to use AI to help you prioritize requirements" — scoring dimensions, weights, templates. After writing it I read it back and realized: **what I was writing was exactly what this essay criticizes.** Its essence was packaging "deciding what to build" as a process and handing it off. It looked highly actionable, but what it actually did was manufacture the feeling of "I've judged this" — scorecards excel at turning a hard trade-off into arithmetic, letting you skip the moment that's supposed to hurt.

Only after deleting it did I understand what this essay is really claiming: **judgment cannot be lightened.**

What you can lighten is everything around it — harden the already-figured-out into rules, turn the repeated checks into checklists, hand the structured work to a model. But **the core in the middle — "does this thing deserve to exist" — cannot be lightened, only carried.** Any method that claims to lighten it is, most likely, helping you hide it.

This is also why the overview calls this layer a "half-asset": half can sediment, half can only grow on you — and the latter half happens to be the half that decides where you're going.

AI flattened execution. It moved the cost from "how long will it take to build" to "should it be built" — and the latter accepts no outsourcing. **In a world where execution is free, the thing you're paying for is your sense of direction.**

---

The next essay covers the **distribution layer** — the only one of the four where the yield still compounds. When build costs were high, good products were scarce, so "good wine needs no bush" had some truth to it; as build costs approach zero, good products are no longer scarce — being seen is. I'll cover how to turn the act of building itself into a content pipeline, and whether your content can be read, understood, and cited by models.

That layer has a hidden connection to this one: **the projects you judged wrong are the distribution layer's best raw material.** Plenty of people tell their successes; very few can articulate why they were wrong — and the latter builds sturdier trust.

See you in the [next essay](../super-individual-stack-distribution/).
