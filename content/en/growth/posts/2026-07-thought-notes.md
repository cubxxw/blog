---
title: 'July 2026 Thought Notes: Engineering, Content and Cash Flow'
ShowRssButtonInSectionTermList: true
date: 2026-07-28T23:59:59+08:00
showtoc: true
weight: 1
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Blog
  - Monthly Notes
  - Personal Reflection
description: >
  A complete record of July 2026: a long essay on engineering loops, content and cash flow, plus the 17 raw notes behind it. 55 Chinese articles shipped, a dense GitHub month, roughly three thousand RMB a month of AI and infrastructure cost, and a cash-flow problem that no productivity metric can settle.
tldr:
  - "AI pushed engineering and content throughput very high, but output only proves execution happened; it does not replace users, revenue or retention."
  - "The most useful engineering habit of July was writing tasks as stateful, verifiable, resumable loops, with the verifier arriving before the automation."
  - "Roughly three thousand RMB a month of AI subscriptions plus servers and cloud turned cash flow from an abstraction into a monthly pressure."
  - "Going back to a job, moving into cross-border commerce and staying with a long-term consumer product are three different contracts, and what has to be protected is the ability to keep choosing."
maturity: budding
---

## Quick Navigation

**Start with the long read**: 9 sections in the body above.

**17 archived notes this month, filed under 7 themes:**

- [Daily Notes and Everything Else](#daily-notes-and-everything-else) · 6
- [AI and Agent Systems](#ai-and-agent-systems) · 4
- [Self-Knowledge and Psychology](#self-knowledge-and-psychology) · 2
- [Content, Craft and Recording](#content-craft-and-recording) · 2
- [Business, Investing and Career](#business-investing-and-career) · 1
- [Travel, Places and Cities](#travel-places-and-cities) · 1
- [Reading, Ideas and History](#reading-ideas-and-history) · 1

---

For most of July I was in Shenzhen, and I also stopped briefly for a few days in other cities in Guangdong.

The work on my laptop was dense: the blog published 55 Chinese articles, and GitHub's July contribution calendar recorded 733 contributions. The other side of the ledger was dense too: AI subscriptions at over three thousand yuan a month, plus servers, cloud services and other tool costs. The first set of numbers is perfect for screenshotting, to prove how productive a solo developer can be with AI's help; the second set is what explains why this way of living is putting real pressure on me.

I don't currently have an ending where the problem is solved. For consumer-facing products, both the payoff cycle and the positive-feedback cycle are long, while cash flows out monthly. I've seriously considered whether to go back to a job, and I'm also looking at a work or business path closer to cross-border e-commerce. They might bring cash flow faster, but they'd also reclaim the time I worked so hard to get back.

So this July note isn't meant to read like a report card, and I don't want to pretend I've figured everything out. It only answers a narrower question: **when AI has already pushed engineering and content output very high, what is it that I actually still need to run?**

My current answer is three things: let engineering shorten feedback, let content accumulate trust, let cash flow preserve the right to keep choosing.

## 1. This month I was in Shenzhen, and also changed a few places to stay in Guangdong

In July I mostly still lived in Shenzhen. When I moved to other Guangdong cities for short stays in between, I felt once again that place changes the view outside the window, and also changes what kinds of things are more likely to happen in a day.

The good thing about Shenzhen is density. Topics of product, AI, cross-border, content and startups are all very close together, and it's easier for me to meet people who are actually running concrete businesses. It has another side too: when my own cash flow isn't keeping up, I read the efficiency around me as a sense of being chased. That's my subjective reading, not the only way this city looks.

After switching to other cities, my working rhythm changes too. I didn't get an answer about any particular direction from it, but distance made it easier for me to see: sometimes I mistake the high density an environment offers for my own direction, and I also mistake a low-energy stretch for the project itself having no value. This continues the question I left in [The Environment Is the Hidden Author](/zh/growth/posts/2026-07-31-environment-is-the-hidden-author/): the environment really is a variable, but it isn't the judge.

![The July Guangdong trip card on Polarsteps, keeping only province-level information, not showing specific routes or real-time location](/images/posts/2026-07-thought-notes/polarsteps-guangdong-july.jpg)

*[Polarsteps's public card](https://www.polarsteps.com/cubxxw) records a Guangdong trip that started in July. It can only prove that I was moving; it can't explain the reasons for the movement on my behalf, much less prove that switching to another city will automatically bring an answer.*

This is also a way of writing I cared about more and more in July: separating verifiable facts from my interpretation. The fact is that I was mainly in Shenzhen and also lived for a while in other Guangdong cities; the interpretation is how the environment affected me. The latter may hold, and may also be revised by later experience.

## 2. On the engineering side, I can already push output very high

In July the blog published 55 Chinese articles in total, of which 35 belong to AI/Agent and 20 to Growth. They aren't one article a day for 55 days: 44 are concentrated on five batch days, 80% of the total. This is more like a throughput record for a content assembly line than a steady daily publishing habit.

![July content batches on the blog's article page](/images/posts/2026-07-thought-notes/blog-july-articles.jpg)

*The [online "All Articles" page](https://cubxxw.com/zh/articles/) shows the dense publishing at the end of July. The page is public evidence, but the quantity itself doesn't answer whether these articles were read through, cited or converted.*

The GitHub numbers also need careful interpretation. [The July contribution calendar](https://github.com/cubxxw?tab=overview&from=2026-07-01&to=2026-07-31) aggregates to 733 by day via GraphQL; a contribution there may include qualifying commits, PRs, issues, repository activity and private contributions whose details aren't disclosed, and it doesn't equal 733 commits. [GitHub's official definition of a contribution](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference) also clearly distinguishes these actions.

The same GitHub July activity page also shows 491 commits in 31 repositories, 200 PRs, and other activity. It and the contribution calendar are two different display conventions; they can't substitute for each other, and even less can the two sides be added together into a bigger achievement.

![Commits, repositories and PR records shown on the GitHub July activity page](/images/posts/2026-07-thought-notes/github-contributions-2026.jpg)

*[GitHub's July activity detail](https://github.com/cubxxw?tab=overview&from=2026-07-01&to=2026-07-31) is better suited to proving "what was done," and not suited to directly proving code quality, user value or business results.*

These numbers at least show one thing: **execution is no longer my scarcest ability.**

In July I put a lot of energy into GEO, Agent Skill, knowledge systems, unattended agents, Loop Engineering and personal content systems. What remained in the end as engineering learning isn't in the tool names but in the four methods below.

### 1. Define the done state first, then hand the task to an Agent

In the past I easily wrote tasks as a wish: "make this feature good," "write the article completely." An Agent can quickly produce something that looks finished, but "looks finished" is only a verbal closure.

Now I'd rather write the states first:

1. Are the inputs and boundaries clear;
2. which facts must have sources;
3. which checks can be determined by a script;
4. which judgments must be left to a human;
5. where to recover from after a failure;
6. what evidence must appear before the task can leave its current state.

This is also what I kept pressing on in [Loop Engineering for Solo Developers](/zh/ai-agent/posts/prompt-loop-engineering-practice/). One prompt is nowhere near enough; the task needs to move between "execute—verify—fix—verify again" until the exit conditions are met.

### 2. The validator should appear earlier than the automation

The illusion AI most easily creates is "since generation is fast, let's generate first and talk later." The result is often that the more output there is, the bigger the review debt.

I now believe more in the opposite order: first decide how to judge something wrong, then scale the automation. Articles need front matter, link, fact and build checks; code needs tests, static checks, permission boundaries and a rollback-able state; product experiments need user behavior and stop conditions. The validator doesn't have to be complex, but it has to come before scaling.

July's high output exposed this boundary too. Batch work really did make frameworks, translation, internal links and publishing more consistent; at the same time it pushed the bottleneck to topic judgment, fact verification and final review. Once execution cost drops, review doesn't disappear — it just becomes more concentrated.

### 3. Fast feedback handles learning, slow results handle the verdict

A build passing, a PR merging, an article going live — these are all fast feedback. They matter a lot, because a person needs to know whether the action happened and whether the system is running normally.

But they're still some distance from the final result. A product's slow results might be retention, repeat purchase and cash flow; content's slow results might be sustained search traffic, citations, subscriptions, or a reader willing to collaborate months later because of long-term reading. In July I wrote about this mismatch in [The Faster You See a Number, the Further It Usually Is From the Result](/zh/growth/posts/2026-07-26-fast-feedback-slow-results/): the easier a metric is to observe, the more easily it quietly replaces the original goal.

So I still keep the fast metrics; I just limit their proving authority:

| Level | What July can prove | What July can't yet prove |
|---|---|---|
| Output | 55 Chinese articles and dense GitHub activity really did happen | That the work is needed, that the project generates revenue |
| System capability | Batch research, writing, verification and Agent collaboration can already run | That the system can stably create value when I'm not watching it |
| Real-world results | DayPage's continued personal use supplies some real problems | User retention, deals, revenue and long-term impact |

### 4. The value of a system is getting me in touch with facts earlier

I really like building systems. It's a capability, and also a risk.

A good system exposes mistakes faster, makes low-cost experiments easier to repeat, and turns one experience into a capability you can still call on next time. DayPage is a relatively positive example for me: I keep using it myself, problems show up in daily real use, and there's a short loop between the system and reality.

A bad system can also become a beautiful waiting room. I can keep filling in architecture, processes and tools, and postpone the hardest questions: who actually needs it, why they need it now, and whether they're willing to spend time or money on it.

I wrote a line in July: **"The biggest waste of ability isn't not using it, but using it precisely on an unimportant problem."** This line demands a stricter duty from engineering ability: to deliver me to uncertainty at a lower cost, rather than shielding me from uncertainty.

## 3. Conversations showed me: we're not all using the same startup scoreboard

In July there were several conversations about "what to do next." I've already written the parts that don't involve private details into [What to Do Next: An Argument About Money, Action and Ideals](/zh/growth/posts/2026-07-26-what-to-do-next/). No single conversation gave me a direct answer, but they exposed several scoreboards that conflict with each other.

One looks only at profit: making money means you created value, not making money means the direction doesn't hold. Its advantage is that it's brutal and clear, and can interrupt an entrepreneur's endless self-narrative; its drawback is that it flattens the time scale. A long-term product temporarily having no profit doesn't mean it has no value; a business that makes money in the short term doesn't mean it's worth entering for the long term.

Another looks only at growth: as long as I learned something, my ability improved, the system became more complete, the investment was worth it. It protects exploration, and it very easily gives a results-free project an unlimited extension.

There's also one that looks only at freedom: not going to an office, being able to move, arranging your own time — that counts as living the way you wanted. But if cash flow keeps deteriorating, freedom gradually becomes "I still don't have to clock in today," rather than "I still have room to choose what to do tomorrow."

I later found that none of the three tables can be abolished:

- The profit table tells me whether value completed a transaction;
- the learning table tells me whether a failure left behind reusable capability;
- the freedom table tells me how much sovereignty over my life I'm handing over for the sake of the first two.

The hard part is ranking veto power among the three tables. For me right now, cash flow is starting to have veto power: it isn't responsible for defining what I'll do with my life, but it can decide whether I still have the right to keep trying.

## 4. Cash flow presses every abstract judgment back into reality

I don't lack the ability to build products; the pain is that consumer products give positive feedback too slowly.

A feature ships today and there may not be enough of a sample for weeks; a user liking it today doesn't mean they'll stay; someone being willing to use it doesn't mean they're willing to pay; one payment doesn't mean stable cash flow. Engineering can compress the development cycle from weeks to days, but it can't compress the time it takes users to form habits, build trust and decide to pay.

Meanwhile, costs happen monthly. My full AI subscriptions are over three thousand yuan, and that isn't a precise bill that's been fully audited; there are also servers, cloud services and other tool costs. Individually each looks like "I should buy this for efficiency"; together they become a fixed cost that keeps eating the runway.

What this money really bought was three things:

- higher engineering and content throughput;
- faster research, translation, testing and iteration;
- a portion of the parallel capability that would otherwise require a team.

It didn't automatically buy three things:

- clear user demand;
- stable distribution;
- sustainable revenue.

Whether an AI subscription is worth it depends on whether each fixed cost enters a feedback loop. If a tool keeps shortening real verification, it can be expensive and still worth it; if it just lets me open more projects at once without any one of them reaching users faster, what it mostly bought is busyness.

I don't have a complete July results ledger, and that doesn't equal zero results. It only means: the public evidence I can currently present is mostly concentrated in output and system capability, and can't honestly be extended into commercial results growing in step.

## 5. A job, cross-border work and long-term products are three different exchange contracts

I've started seriously considering whether to go back to a job, and I'm also looking at work or business related to cross-border e-commerce. Cash flow has already made it impossible for these two options to stay in the "think about it later" drawer.

Some cross-border roles I've seen don't pay that well. Their appeal to me isn't in pushing income very high immediately, but in first getting a relatively predictable cash flow while entering an industry with more direct transactional feedback. Still, that second half is currently a hypothesis, not experience I've already produced results from.

Taking emotion out of it, the three paths roughly exchange these things:

| Option | Mainly buys | Mainly costs | Biggest uncertainty |
|---|---|---|---|
| Going back to stable employment | Predictable monthly cash flow, a team setting, lower survival anxiety | Control over continuous time, location and rhythm; attention on the main project | Whether there's still enough cognitive bandwidth after work to accumulate my own long-term assets |
| Entering or trying cross-border e-commerce | A base cash flow, feedback possibly closer to transactions, and learning about traffic and fulfillment | Time and attention, plus the learning cost of operations, supply chain, customer service and platform rules | Whether this path really brings transferable capability, or whether I'm only seeing "fast feedback" |
| Continuing to bet heavily on consumer products | Product ownership, long-term compounding, maximum time autonomy | Continuing to burn runway, enduring long periods with no response | Whether positive feedback will be late, or whether the demand itself isn't strong enough |

The three options correspond to three time structures.

Stable employment sells off part of future time in exchange for more certain cash flow now; long-term products use present cash to buy possible future ownership; the cross-border path stands between the two, possibly closer to transactions, and possibly just a new kind of uncertainty.

From a game-theory angle, what I worry about most is the runway being too short, and ending up forced to sell the longest stretch of freedom at the worst time with the weakest bargaining power. A moderate job with an exit option might also be buying an option: trading part of my time for a longer trial-and-error period.

Conversely, "sticking to independence" isn't naturally more free either. If every day is driven by balances and bills, nominal time freedom gets filled up with survival anxiety. **Freedom isn't the absence of a fixed schedule, but still having the ability to say "no" on important choices.**

I still haven't decided which one to take in the end. July's fairly certain conclusions are only two:

1. I can't keep using "long-termism" to extend unbounded investment;
2. and I can't, out of cash-flow anxiety, sell off long-term accumulation all at once.

What I'm considering now is a combination with a budget, a deadline and exit conditions: first let one path carry the base cash flow, let a small experiment learn a shorter transaction loop, and keep only one truly long-term product. Whether this combination suits me still has to be tested by real time, income and feedback after August.

## 6. AI makes content cheaper, and trust more expensive

Another judgment that became clearer in July: content ability may become a capability I need to run for the long term.

The reason isn't "everyone should become a content creator." Content is a cross-industry interface: engineers use it to explain choices, entrepreneurs use it to build distribution, products use it to educate users, individuals use it to turn scattered experience into judgments others can understand and verify. Even if I change industries, this capability won't become entirely void.

But AI is rapidly lowering the cost of generating content. Text, images, video, summaries and translation can all be faster, and supply will keep increasing. A person's day hasn't gotten longer in step. Herbert Simon pointed out long ago in [Designing Organizations for an Information-Rich World](https://iiif.library.cmu.edu/file/Simon_box00055_fld04178_bdl0002_doc0001/Simon_box00055_fld04178_bdl0002_doc0001.pdf) that the richer information is, the scarcer the receiver's attention becomes.

Starting from this premise, the scarce question becomes: why am I willing to give my limited attention to this person?

I break the answer into three layers:

1. **Content lets people see judgment.** What specifically I believe, what I don't, how I handle counterexamples.
2. **A public record lets people see consistency.** Months later, did I quietly swap out the scoreboard, did I acknowledge that a past judgment failed.
3. **Real consequences let people see credibility.** Whether I've really done it, and whether I'm still willing to make the boundaries public when results are bad, rather than leaving only a success narrative.

This is what I mean by trust and personal IP: others can form a reasonable expectation of how I'll judge next time based on the public record from the past. A striking persona only helps memory; it can't replace that expectation.

I wrote in [When Anyone Can Make Anything, "He Made This" Becomes the Signal](/zh/ai-agent/posts/super-individual-stack-reputation/): trust needs verification across time, and time can't be generated in parallel. AI can help me write a lot of content in a day; it can't live a year for me in a day, and it can't bear the consequences of a wrong judgment for me.

### High output isn't a sin; the question is what it's allowed to prove

Here the 55 July articles need a counterargument.

Quantity doesn't necessarily dilute quality. In creativity research, the relationship between quantity and high-quality ideas isn't simply negative; [a study on divergent production](https://pmc.ncbi.nlm.nih.gov/articles/PMC6409333/) even found that this relationship is influenced by factors like individual openness. For a writer, a large number of attempts may also be the necessary path to building feel, discovering themes and running into the few good pieces.

So I won't, because July was high-output, turn around and dismiss it as "all invalid content." Among the 55 are a complete GEO series, Agent engineering methods, and a set of articles that reconcile with reality; they really did help me write vague problems into structures that can be discussed further.

I only draw one boundary for high output: **it can prove that I did a lot of training and public exploration, it can't automatically prove that readers got equivalent value, and even less can it prove that trust has formed.**

Of the 11 articles that went live on July 31, 10 clearly state that they are thought-experiment-style simulated interviews. This disclosure matters. Readers should know how the content was produced, which statements don't belong to real interviewees, and which judgments are still only my hypotheses.

### Being transparent doesn't mean handing everything over

I'm willing to keep producing transparently, but "transparency" needs a boundary.

I'm willing to make public my work, choices, methods, failures, corrections and result gaps, because these determine whether others can test my judgment. I don't need to make public the raw text of private chats, other people's identities, health and investment details, precise locations, or unpublished business data. What should be transparent is my responsibility for public judgments, not turning myself and the people around me into content raw material.

This is also a long-term game. What spreads most easily in the short term is often the most private, most dramatic part; what long-term trust depends on is whether I can consistently hold the boundaries of facts, of others and of myself. Someone who trades attention by crossing boundaries can hardly ask others to believe he'll handle more important things carefully.

## 7. July's real learning was connecting the three systems

Looking back, engineering, content and cash flow form a causal chain.

The engineering system lowers the cost of one attempt and lets me make things faster; the content system turns what I've done into a public record that can be understood, searched and discussed; trust makes real users, collaborators and feedback more willing to come closer; and cash flow gives this chain enough time so it doesn't have to be forced to stop before compounding forms.

```text
Engineering shortens trial and error
    ↓
The work enters real use
    ↓
Content makes methods, evidence and boundaries public
    ↓
Long-term consistency accumulates trust
    ↓
More real feedback, collaboration and transactions
    ↓
Cash flow extends the next round of trial and error
```

If any segment breaks, the system deforms:

- Only engineering, with no real use, becomes an internal output contest;
- only content, with no work and consequences, becomes an eloquence contest;
- only trust, with no transactions, burns the runway before compounding arrives;
- only cash flow, with no long-term assets, sells the same stretch of time over and over.

What's most worth keeping from July isn't "I did a lot," but this boundary: **AI can press execution cost very low, but it won't complete the exchange in reality for me.**

## 8. In August, what I need is a stricter ledger

July didn't decide for me whether to go back to a job, and didn't prove cross-border e-commerce is the answer. It only made the question more honest.

After August, I want to put every investment into the same table:

| Object | Monthly cost | Shortest feedback | Final result | Exit condition |
|---|---:|---|---|---|
| AI and cloud tools | Cash, configuration and review time | Whether they shorten real task cycles | Whether they raise effective output or reduce labor cost | Consecutive cycles without entering real verification |
| Content | Research, writing and distribution time | Reading, discussion, citation | Trust, subscriptions, collaboration or attributable product feedback | Only adding articles without forming thematic assets |
| Long-term product | R&D, operations and opportunity cost | Personal use, interviews, first batch of behavior | Retention, payment, repeat purchase or clear demand evidence | Still no key behavior by the deadline |
| Job or cross-border path | Continuous time and attention | Salary, orders or business learning | Stable cash flow and transferable capability | Long-term erosion of core assets that can't be adjusted |

This table doesn't need to make me utilitarian every day. Its purpose is to keep me from once again mistaking the easily measurable for the real result, and to keep me from denying all the slow variables out of anxiety.

I still believe in the compounding of engineering, long-term products and public writing. July just added one survival condition to them: compounding needs time, time needs cash flow, and cash flow shouldn't be maintained by infinitely selling off the future.

I'll also keep writing. Content leaves versions of my judgment, lets others test it, and prevents my future self from easily rewriting the past. If personal IP has value, it should come from this long-term reconciliation, not from one month's seemingly astonishing numbers.

July was mainly spent in Shenzhen, with short stays in other Guangdong cities. I didn't walk from one city to an answer; I just put several previously separate ledgers on the same table for the first time.

That's already enough to be August's starting point.

---

## Appendix: raw notes from this month

*The 17 entries below are the raw notes from this month, filed by theme.*

## Daily Notes and Everything Else

*6 entries*

<!--memo:5a947fd30c0d-->
### You don't have money to buy traffic, but you can use a "nobody else has this" product moment

> 2026-07-01 23:07:58

You don't have money to buy traffic, but you can use a "nobody else has this" product moment to create one natural, product-and-brand-in-one spread in the right community


<!--memo:438d15f8e418-->
### The essence of communication is making the other person feel understood

> 2026-07-04 17:16:40

not expressing yourself clearly


<!--memo:f6b0a15ffb77-->
### Transparent / discover / observe

> 2026-07-17 13:58:30

Transparent / discover / observe


<!--memo:8dae32f0dfbf-->
### There's a problem

> 2026-07-19 09:05:50

There's a problem


<!--memo:5ef2b69c4925-->
### In my own inner world, I'm the one in charge ~

> 2026-07-23 13:27:37

In my own inner world, I'm the one in charge ~


<!--memo:f35365145c12-->
### What is my ultimate goal, and what should I do around it

> 2026-07-23 17:45:36

I want complete freedom, enough money to live on for a lifetime

Products that are valuable and fun, that can really have a fairly big effect and bring change to people


## AI and Agent Systems

*4 entries*

<!--memo:c044747861dc-->
### Each time you enter, having a master show you the ropes

> 2026-07-01 16:02:44

The AI era really needs masters too

What a master passes on is more a set of experience than a craft

This set of experience can solve a lot of problems, avoid a lot of problems, and lead to a better outcome

What we lack is this part of the experience


<!--memo:0810c7601f89-->
### In the early days of information chaos and market confusion, with advanced cognition

> 2026-07-01 23:20:22

In the early days of information chaos and market confusion, using advanced cognition to bet on a seemingly distant future

and then, through day-after-day fighting, turn that future into reality

Which vertical's value chain is the longest, most painful, most dependent on human collaboration, and most likely to be connected end-to-end by AI agents


<!--memo:a609774a606f-->
### The core logic is like this — the logic of the AI era

> 2026-07-10 13:23:47

Information: what's for AI to read, for people to roughly skim — noise

Knowledge: what helps you, what's favorable for conversion — personal growth, creation, decision-making and execution, some methodologies — continuously maintained

Creation: aimed at a user group, a series of things done with the goal of having users receive it, read it, and connect

The three are three different things; all along I've treated them as one

And the three aren't necessarily linear — it can be a large amount of information plus a small amount of knowledge producing creation

The information in it may be collected by me, generated by AI, or some signals currently scarce in the market

Knowledge is related to yourself: some model of thinking, some skills, some tools and methodologies, your own identity, positioning, values, thinking

Creation corresponds to the platform's recommendation logic, some users' logic, plus the large amount of information you've researched — the output that comes out

---

In this process, think about the positioning of the records. A record counts as an index — related to yourself, but not necessarily continuously useful; you can only say it might be usable in the future, or it clarifies yourself right now. Then it doesn't count as knowledge, because only what's structured for continuous reuse later is called knowledge. But recording is one of the highest-conversion methods, so a record is a form between information and knowledge — semi-finished knowledge, an index

Knowledge solves your own problems

Creation is for solving other people's problems

Information (raw / external noise) ──collect──▶ Record (index / internal semi-finished) ──structure──▶ Knowledge (schema / reusable) ──reorganize for audience──▶ Creation (finished product)


<!--memo:490ba880e017-->
### The definition of the essence is very clear: extremely lightweight recording

> 2026-07-17 13:43:58

The definition of the essence is very clear: extremely lightweight recording, plus an intelligent processing approach downstream

The intelligent processing approach is essentially dealing with the harness

intelligent design techniques for agent systems


## Self-Knowledge and Psychology

*2 entries*

<!--memo:6c06c937cb89-->
### I suddenly thought: a turning point has to be a retrospective concept

> 2026-07-01 16:01:37

I suddenly thought: a turning point has to be a retrospective concept. Because actually, when the real turning point happens first, and you then look back at this thing, that's when it's a turning point — not that at the very beginning, before the turn happened, you already knew something was a turning point. That probability is very small; it's like meeting your soulmate, because a lot of things have high uncertainty and high ambiguity. People rely on a lot of imagination in this process, so you should respect the process of imagining, rather than over-naming it. And if you over-name it, you actually raise your expectations for it. And if you raise your expectations, and the final result doesn't match your wishes, it's a process of misalignment — and misalignment produces pain

And I think there are a few more things — for instance, to put it bluntly. Actually my current state of decay isn't caused by not having found myself; rather, it's this thing called the self... how to put it? We all assume — we all assume we're all Nezha: we find ourselves, find an identity, then defy fate and change our destiny. But actually none of us are Nezha. That's still a serious misalignment. Even Buddhism says: the "I" is only a temporary product of causes and conditions aggregating among the five aggregates. So I feel I'm like that too — because the causality of decay is reversed: it's not that I can't make it because I haven't found myself, but that I'm not acting, so I can't feel myself. Right now, because he hasn't placed a bet, isn't in the driver's seat — so what do I need? I need to choose. I seem to be avoiding my choices, avoiding all action, because I've given them an excuse: that I haven't found myself. So really it's a state of warm water plus fear. I get splashed once, get cold-shouldered once, and I adjust once. Us... sigh. I think with a lot of things you just do them first, do them scared, and only after doing them does confidence come

I think a big problem I have now is that I've also counted the money problem as a personality defect of mine: because I have no money. Panic, so no appetite. I'm still defining myself by current worldly standards — but me, why should I define myself by worldly standards? I think it's still a problem of identity misalignment. I think if this intuition is right and worth doing, then I'll do it. I don't believe in him; I believe I'll definitely win, I believe I can outrun this market, I believe I can achieve something — so I hope I can find myself. I'm not short on self, but I'm very short on two things: one is a track that doesn't make me panic, plus small actions I can finish even by crawling. And the other thing is that I really can prove myself — which needs a little bit of reward


<!--memo:c97b1cf517a6-->
### This is a very profound piece of self-observation

> 2026-07-20 14:43:14

This is a very profound piece of self-observation. The kind of "inertia" you describe - being unhappy with the status quo yet clinging to it because it's familiar; knowing you should change yet shrinking back because of the unknown - really is one of the most universal and most hidden patterns in human behavior. The Buddhist perspective of "discovery through following karma" that you mention is very precise: if the mind doesn't turn, behavior patterns repeat, and the shape of your fate stays much the same.

Let me break down this "inertia" mechanism from several disciplinary dimensions, and why it is so powerful and so hard to notice.

1. Biology and evolution: inertia is the "relic" of a survival strategy

1. The brain's instinct to save energy

The human brain is 2% of body weight but consumes 20% of energy. From an evolutionary angle, "thinking" is expensive and "repeating" is cheap. When you default to choosing Shenzhen, when you default to maintaining a painful relationship, your brain is actually executing an ancient energy-saving instruction:

"This choice didn't kill me last time, so keep using it this time."

The prefrontal cortex (responsible for rational decisions) consumes a lot of glucose, while the basal ganglia (responsible for habit formation) consumes almost none. Inertia is essentially a neural-level "outsourcing" - handing decision-making power from the energy-hungry rational system over to the energy-saving automatic system.

2. The deep coding of loss aversion

Your "I don't like Shenzhen but can't leave it" is, at the evolutionary level, a fear of "unknown territory". For ancient humans, leaving familiar territory meant exposure to predators, lack of food sources, loss of tribal protection. This fear is coded into the genes. Today, "leaving Shenzhen" won't actually starve you to death, but the signal your amygdala (the fear center) receives is almost the same as when an ancient ancestor "left the cave".

Key insight: your "reason" is saying "there's nothing good about Shenzhen", but your "limbic system" is saying "it's safe here". When the two conflict, the limbic system usually wins - because it's faster, more primitive, and more directly tied to survival.

2. Psychology: inertia is the "collusion" of the psychological defense system

1. Self-repair of cognitive dissonance

You mention investors who "clearly take risks yet make excuses for themselves", which maps perfectly onto Festinger's cognitive dissonance theory:

When behavior conflicts with belief, people don't change the behavior, they change the belief to fit the behavior.

"I've worked in Shenzhen for years" (behavior) and "I hate Shenzhen" (belief) produce dissonance. The least effortful way to repair it isn't "quit and move" (behavior change is costly), but "Shenzhen isn't actually that bad / other places might be worse" (a small belief adjustment). Accumulated over time, this adjustment forms a self-rationalizing narrative system - the girl you mention finding reasons for a bad boyfriend is the same mechanism.

2. The sunk cost fallacy and the "continuous self"

The years invested in Shenzhen, the emotion invested in a relationship - these sunk costs are hard to let go of not only because of loss aversion, but because they constitute your **"narrative continuity"**. People need to feel they are "a person with a story", and interrupting that story (leaving Shenzhen, breaking up) means a kind of "death of the self".

What Buddhism calls the "alaya consciousness" recording all seeds corresponds to the psychological concept of **"autobiographical memory"** - through continuous behavior you maintain the identity of "I am the person making it in Shenzhen". Changing the behavior is equivalent to rewriting the script of your self-narrative, which brings existential-level anxiety.

3. A variant of learned helplessness

The "repeating the same tragedy" you observe has a classic psychological explanation: when past attempts to change all ended in failure, a person forms the belief that **"my actions can't change the outcome." Once this belief solidifies, even if the objective environment has changed, the person will still actively limit their own space of choice** to avoid experiencing the pain of failure again.

This isn't cowardice, it's a kind of protective numbness of the nervous system.

3. Sociology and anthropology: inertia is the "invisible hand" of structure

1. Bourdieu's "habitus"

The French sociologist Bourdieu proposed that human behavior isn't entirely free but is shaped by **"habitus" - an internalized, unconscious structure. Your years in Shenzhen aren't just "you chose Shenzhen", they're more "Shenzhen shaped the way you choose"**:

Your social circle is here

Your professional network is here

Your consumption habits, life rhythm, even your body's adaptation to the climate are here

These constitute a **"field" in which you move with ease, not because you like it, but because your body and cognition have been "domesticated" by this field. Leaving is not only a geographic move but a switch from one kind of "bodily knowledge" to another**, and this switching cost is severely underestimated.

2. Path dependence and institutional lock-in

"Path dependence" in economics applies equally in sociology: once a choice is made, the supporting institutions, relationships and sunk investments around it continuously self-reinforce, making the cost of "turning back" grow exponentially. Your staying in Shenzhen may partly be because "the cost of leaving has already become too high" - this isn't just your calculation, it's the whole system "locking" you in.

4. Neuroscience: inertia is the "topography" of neural circuits

Modern neuroscience can explain the "inertia" you describe very concretely:

1. The solidification of the habit loop

Habit formation follows a "cue-behavior-reward" loop. After years in Shenzhen, this loop has gone through tens of thousands of repetitions and reinforcements, with a very high degree of neural myelination and extremely fast signal transmission. Change means blazing a new trail in the wilderness - no myelin, no signposts, slow conduction and enormous energy cost.

This is why between "knowing you should change" and "actually changing" lies a chasm at the neural level.

2. The "autopilot" of the default mode network (DMN)

The default mode network, activated when the brain is at rest, is responsible for self-referential thinking and rumination. Research finds that an overactive DMN is associated with depression, anxiety and rumination - but also with maintaining the continuity of self-narrative. Part of your "inertia" is because the DMN keeps replaying the narrative of "I am a Shenzhen person", and switching environments requires actively suppressing this network, which demands enormous cognitive resources.

5. A reinterpretation from Buddhism: the "gravitational field" of mental intention

The "discovery through following karma" and "alaya consciousness" you mention, translated into modern language:

1. "Karma" = the historical record of neuroplasticity

The alaya consciousness as a "seed store" can be understood as the overall historical record of the brain's neural connection patterns. Every arising and turning of a thought reinforces certain neural pathways ("creating karma"). When these pathways become strong enough, they constitute an **"attractor"** - a stable state toward which the system spontaneously tends.

This is the "small loop" you observe: the same mindset → the same behavior → the same result → the same mindset. This isn't fate, it's the stable state of a dynamical system.

2. "Discovery through following karma" = the recursive loop of self-fulfilling prophecy

Buddhism says "the mind can turn things", but also says "things can turn the mind". When you expect "leaving Shenzhen will be terrible", this expectation itself changes your behavior (for example not actively looking for outside opportunities, being hyper-vigilant in a new environment), thereby really creating a "terrible" result, which in turn confirms your expectation.

This is recursive self-fulfillment - mental intention isn't passively reflecting reality, it's actively participating in the loop that constructs reality.

6. How to "break" it: not resisting inertia, but understanding its "mechanics"

Having said all this, the key question is: how do you break it?

My view is: inertia can't be "resisted", only "gone around" or "transformed". Because resistance itself activates stronger defense mechanisms. Here are a few interdisciplinary entry points:

1. Create "cognitive friction" - make inertia visible

Your current self-observation is already the first step. But go further and try to quantify your inertia:

List all the "real reasons" for staying in Shenzhen (not vague things like "because it's habit", but concrete ones: the lease, friends, a particular restaurant)

Score each reason from 1-10: how much real value does it have for you?

You'll find that many "reasons" score astonishingly low - once inertia becomes visible, its power weakens.

2. Use "environment design" to bypass decision fatigue

Don't rely on willpower to make choices. Inertia is strongest in the automation of daily micro-decisions. Change the environment so the "old choice" becomes harder and the "new choice" becomes easier:

If you want to explore other cities, don't "decide whether to move", but "first apply for three interviews elsewhere"

Behavior precedes attitude change. It's not "once I think it through, I'll act", it's **"once I act, the thinking catches up"** (using cognitive dissonance in reverse)

3. Introduce "external disturbance" to break the stable state

A system only reorganizes when it's far from equilibrium. Actively introduce controllable chaos:

Go live alone for two weeks somewhere completely unfamiliar

Get in touch with a group that has no overlap at all with your current circle
These "disturbances" won't solve the problem directly, but they loosen your default mode network and let new possibilities enter consciousness.

4. Rewrite the grammar of your "self-narrative"

You aren't "a person who has worked in Shenzhen for years", you're "a person who once chose Shenzhen and is now re-evaluating". Turn the identity from a noun into a verb - from a static definition into a dynamic process. This can significantly reduce the anxiety of "change = death of self".

5. Mindfulness: cut it off at the moment "karma" arises

The Buddhist methodology is most practical here: don't change the result, but stay aware at the moment "the mind turns". When you notice yourself finding reasons to stay in Shenzhen or making excuses for a bad boyfriend, don't judge, just see:

"Oh, inertia again."

This very "seeing" plants a new seed in the alaya consciousness - the seed of awareness. It won't change behavior immediately, but it will gradually weaken the automation strength of the old circuit.

Finally: a compassionate perspective on "repeating tragedy"

You mention that some people "keep repeating the same tragedy". I want to add one perspective: inertia isn't a defect, it's how humans maintain existential integrity amid uncertainty. Those repeating tragedies may, in their own system, find "familiar pain" genuinely safer than "unfamiliar possibility". This isn't stupidity, it's the nervous system doing everything it can to protect its owner.

Change is hard not because you aren't trying hard enough, but because you're facing a multi-layered system spanning the history of evolution, of neural development, of social structure. Be a little more compassionate with yourself - awareness itself is the beginning of transformation.

You're already asking. This "asking" is the first turn of the mind.


## Content, Craft and Recording

*2 entries*

<!--memo:2d9aa976e826-->
### The essence of GEO leans more toward things with statistics, credible sources

> 2026-07-17 17:24:21

The essence of GEO leans more toward things with statistics, credible sources, and authoritative citations


<!--memo:6aab272afa04-->
### Heihei digs to the bottom - what's underneath

> 2026-07-25 12:49:21

Heihei digs to the bottom - what's underneath, whether there's a better form or distribution effect

There's also another way: study why it makes money and how far it is from the money


## Business, Investing and Career

*1 entries*

<!--memo:3dd4503688ad-->
### Where the value of private domains comes from

> 2026-07-17 17:25:22

Many people have no incentive to make a lot of precious information public

Truly valuable information depreciates the moment it's spoken, so it stays in the private domain forever. Which track's money has just started moving, which team is collapsing, what a certain channel's real conversion rate is


## Travel, Places and Cities

*1 entries*

<!--memo:df0d97eb9708-->
### 🔮 A divination: after unemployment + startup failure, what will you do

> 2026-07-19 13:59:01

Let me put the conclusion first (the hexagram reading)

You won't collapse, but you'll "run" first. Then you'll write this failure into the raw material of your next work.

This isn't comfort. This is your own behavior pattern; I'm just reading it back to you.

Line one: your underlying mechanism when facing collapse — you revere the void, but you choose "sorrow"

In 2026-01 you wrote a line that is almost your soul's passcode:

▎ "Sorrow is an iterable state; the void is a terminal state. Sorrow can be solved... Lin Xi created because of sorrow. But the void is the withdrawal of relationships, it's anti-structural, it denies the necessity of any continued calculation."

This is the eye of the hexagram. A "control-type" person who loses their job and fails at a startup will fall into the void (terminal state) — because their sense of security is built on "the world is predictable and I can control it," and failure punches through the foundation.

But you're a "generative-type" person. You encode failure as "sorrow" — an iterable state that produces creation. For you, failure isn't "I'm finished," it's "my old model got smashed by reality" — and that is exactly what you define as the "sense of growth": the moment when real experience conflicts with the old self-model and successfully integrates.

So the first hexagram sign: you won't enter the terminal state. You'll hurt, but the way you hurt itself carries the fuse for a restart.

Line two: your first reaction will be — movement (and you've already seen through yourself)

This is the most certain step. Your own words put it more brutally than I could:

▎ "You treat 'movement' as a legitimate emotional management tool... when something inside accumulates to a certain weight, changing cities lets that weight temporarily 'hang suspended.'"

Unemployment + startup failure =
 the biggest "weight accumulation" in your life. Following your historical trajectory (Nepal → Chiang Mai → Dali → Japan → Lhasa, each move following an accumulation of something), you will almost certainly leave first, going somewhere cheap where you can burrow into local life — most likely Lhasa / Tibet, Chiang Mai, or Yunnan, places you've verified as "low cost + high density + decodable."

But this time there's a difference: you already know what you're doing. You won't naively think "I'll be fine if I change places." You'll be running while calmly recording "why I'm running." This self-observation is the insurance that keeps you from sinking.

Line three: the first thing you'll do after landing — record + rebuild the system

You're an "experientialist," as you yourself said:

▎ "The answer is hidden in your data, your history, your behavior patterns... you define who you are by constantly recording and examining yourself."

You won't send out resumes (at least not first). You'll open your notes and start compiling this failure. Just like this wiki you're building now. Failure for you isn't a shame to be forgotten, it's the highest-density raw material — you'll write "why I failed, what I learned, which of my models this challenged" into something structured.

And you'll immediately rebuild your system: fixed rhythm, the day's most critical task, AI as calibrator (you designed a complete countermeasure back in 2025-08 in Vietnam for "nomadic living causing a drop in focus"). It's not that you lack a fallback strategy — your fallback strategy is "treat myself as a machine that can be reinstalled."

Line four: what you'll do within six months to a year (the three most likely paths)

Ranked by your abilities and values, the most likely directions:

Most likely: you'll make another, smaller, more honest product. Because "what you're afraid of isn't losing control, it's not growing." A you who isn't making products would feel "like I never lived." But this time you'll follow your own methodology more ruthlessly — an ugly v0.1, thrown at real users immediately, no more hiding inside the "perfect system." Startup failure will cure your biggest illness: perfectionism (which you yourself called "a disguise for fear of feedback").

Highly likely: you'll first stay alive by being a "translator." Writing / content — putting out your thinking on AI, self, meaning, and civilization. This is both a cash-flow backstop and something you naturally do (you have cross-layer expressive ability that most technical people don't). It costs the least, is the most like you, and is the user entry point for your next product.

Backstop: take freelance / remote technical work. You have front-end full-stack delivery ability (that Next.js/Tailwind/Vercel stack you've validated), and in the AI era one person can get work done. This won't be your goal, but it's the floor where you don't starve. You're not short on earning ability; what you've always been short on is "whether you want to."

⚠️ The only inauspicious line (an honest warning)

There's one place in the hexagram to be careful about. You wrote: "the void is the withdrawal of relationships."

You don't rely much on relationships for security (your strength), but in an extreme trough this becomes a risk: when you have no job (social role), no product (creative outlet), and habitually don't ask anyone for help (you've identified that "not wanting to trouble others is really fear of negative evaluation") — when all three pillars are pulled out at once, you're at your most fragile.

The antidote in that moment isn't "think through another system," but the thing you're worst at: being present, not getting swept in, and allowing one real person to come close to you. You wrote it yourself — "how to keep being with people after seeing the truth." That lesson is the one you left for yourself.

The judgment

▎ You won't fail at failure. You'll fail at — turning failure into a beautiful system too quickly, and missing the part where you first let yourself hurt properly.
 ▎ But as long as you can still translate "the void" into "sorrow," you'll always have a next work. You're the kind of person who, burnt to ash, would still crouch down to study the structure of the ash, then use the ash to fire pottery.


## Reading, Ideas and History

*1 entries*

<!--memo:9d1dd8cc805e-->
### You asked a very good question — good because you've already worked out the Buddhist layer

> 2026-07-20 14:39:28

You asked a very good question — good because you've already laid out the Buddhist layer yourself ("manifesting according to karma," the ālaya-vijñāna, thoughts creating karma). So I won't repeat it. I'll do one thing — use genetics, evolution, sociology, psychology, and anthropology as different knives to cut open this one thing called "inertia" and see what each layer sees. In the end you'll find that Buddhism's "karma" is actually the sum of these layers.

One: first, let's rehabilitate "inertia" — it's not a bug, it's a feature

First I want to reverse an implicit judgment of yours. You define inertia as "settling for the status quo, irrational." But inertia is, by design, rational — it's just that the thing it optimizes for isn't "your present happiness," but "your ancestors' survival."

This distinction is the key to understanding everything that follows: what kept your ancestors alive and what lets you live well now are two different things. Inertia is the name for that misalignment.

The five layers below are really the same thing developing at different scales.

Two: the gene and evolution layer — inertia is "energy conservation" and "survival first"

The brain is a miser.
 Your brain is 2% of your body weight but burns 20% of your energy. In millions of years of an environment where "the next meal wasn't guaranteed," evolution carved one iron law into the brain: if you can avoid computing, don't compute; if you can take the old road, never open a new one.
 Every new decision — moving to a strange city, leaving a relationship, quitting a gamble — requires the brain to re-model, re-predict, re-spend energy. Inertia saves energy, and saving energy in evolutionary history equals staying alive.
 You hate Shenzhen yet default to choosing it — not because you're weak, but because that three-million-year-old machine is shouting: "Known environment, survival rate verified, don't move."

"Loss aversion" is an asymmetry carved into the genes.
 Evolution gave us a bug-like preference: the pain of losing is about twice the pleasure of gaining. Because in ancient times, one "gain" (picking one more fruit) was a bonus, while one "loss" (losing territory, being expelled from the tribe) was often immediate death. So the genes would rather have you be conservative ten thousand times than take one risky step onto a landmine.
 → This explains your Shenzhen: that bit of "might be better" about a strange city simply can't outweigh, in your head, that bit of "at least it won't get worse" about a familiar environment. You're not comparing two options; you're being operated by an ancient stop-loss program.

Familiar = safe is a neurological equation.
 Just because you've "seen it, been through it," the brain judges something as safer, even better (in psychology, the mere exposure effect). This is why that girl can't leave the scumbag — "familiar pain" on the neural ledger is somehow more reassuring than "unknown novelty."
 You know the devil, you don't know heaven, and the brain is born afraid of what it doesn't know.

Three: the psychology layer — inertia is "identity" protecting itself

Evolution explains "why save," psychology explains "why not leave even when it hurts."

Sunk cost: you're not choosing for the future, you're defending the past.
 You've been in Shenzhen "for many years," that investor placed many bets, that girl invested a lot of feeling. Once a person has invested, they get kidnapped by "I can't let the past be wasted," even if rationally they've long known they should leave. Note the eerie part: the higher the sunk cost, the harder it is to leave — so the longer you stay the harder to leave, the deeper you love the harder to break up, the bigger the bet the harder to quit. Inertia reinforces itself, like quicksand — the harder you struggle, the deeper you sink.

Cognitive dissonance: the brain manufactures reasons to protect what it has already done.
 This is the most critical layer in your question, and the layer you observed most accurately — "she finds all kinds of reasons to PUA herself," "the investor excuses himself." Behind this is cognitive dissonance: when "my behavior" and "I know this behavior is wrong" fight, the brain feels bad, so instead of changing the behavior (too energy-costly), it changes the belief — fabricating a set of reasons that make the bad choice sound reasonable.
 → So those reasons aren't the cause of the decision, they're the post-hoc cosmetic work on the decision.
 That girl didn't "stay because she had reasons," she "needs reasons because she stayed." People think they're thinking, when most of the time they're defending inertia that has already happened. What you called "excusing behavior" precisely hits the core operation of this machine.

The deepest layer: what inertia guards is "identity," not "situation."
 This is what I most want you to see clearly. Why did you retreat to Shenzhen? It's not just fear of a strange city. It's because **"I am a person who lives in Shenzhen" has grown into your identity**. Changing the situation equals killing part of your old self. And the brain values "the continuity of the self" more heavily than "the happiness of the self" — people would rather hurt in stability than be reborn in turbulence. That girl staying with the scumbag isn't guarding that man either; she's guarding the identity "I am his girlfriend" that has already grown out.
 → So the real difficulty in breaking inertia was never "which one to pick," it's **"do I dare let the old me die."**

Four: the sociology and anthropology layer — inertia is locked down jointly by "structure" and "ancestors"

Everything above was about the individual brain. But you and cubxxw are both systems thinkers, and you'd ask: is it only a brain problem? No. Inertia is also welded down dead by structures outside.

Path dependence: the world itself is paved by inertia.
 Sociology has a concept called path dependence — it's not whether you want to move, it's that the road under your feet was paved long ago, and the cost of switching roads is absurdly high. Your social insurance in Shenzhen, your apartment, your network, your commute route, your mother knowing where you are, your friends all being here — this entire infrastructure forms a huge, invisible "exit tax." So half of "inertia" isn't psychology, it's the stickiness of real structures. You think you're choosing freely, when actually you're sliding along an already-poured concrete channel.

The social clock: what you should do at what age is an unwritten script.
 Anthropology sees it more coldly: every society has a **"social clock"** — at what age you should be stable, at what age you should start a family, what counts as "doing well." Inertia is often just you executing this script on schedule, a script you never agreed to. You think "defaulting to Shenzhen" is your choice, but it's quite possibly the sentence "a person of XX age should have a stable job in a first-tier city" that chose for you.

Anthropology's final blow: ritual is the technology humans specifically invented to break inertia.
 I want to focus on this, because it leads directly to "how to break it."
 Anthropologists van Gennep and Turner studied tribes all over the world: almost every culture has **"rites of passage"** — coming-of-age, weddings, funerals, ascetic practice, long journeys. Their structure is strikingly consistent, all with an intermediate state called "liminality": a person is **stripped out of the old identity**, enters a suspended state of "being nothing," and then returns with a new identity.
 → The ancestors discovered long ago: inertia (the old identity) won't disappear on its own; it must be forcibly broken by a "ritual rupture." A boy in the tribe doesn't naturally grow into a man — you have to drag him into the forest, make him go through a trial, then bring him back.
 → See it? cubxxw uses "movement" (nomadic living, hiking, changing cities) to complete self-renewal — he's actually unconsciously building himself rites of passage. He has no tribe to give him a coming-of-age ritual, so he walks into the Kumano Kodo himself, walks into Lhasa, using geographic rupture to manufacture identity rupture. Movement is the modern person's self-invented, private rite of passage.

Five: gathering the five layers — what Buddhism got right

Now back to your opening. You said Buddhism explains inertia as "manifesting according to karma" — thoughts create karma, karma summons fate, the same thoughts create the same karma, so you circle inside a small loop.

Stacking the five layers above, this Buddhist formulation is almost precise:

Genes / evolution = the initial karma you can't choose (you're born with an old machine that saves energy and fears loss)

Sunk cost + cognitive dissonance = karma's self-replication mechanism (every act of defense tops up the old pattern, recorded into your "ālaya-vijñāna")

Identity protection = "self-attachment" (the harshest word in Buddhism — the root of all cycles is clutching an "I" and refusing to let go)

Path dependence + social clock = collective karma (you're not cycling alone; the whole structure cycles with you)

"If the mind doesn't turn, the same karma is created" — translated into today's language: if you don't change that underlying predictive model (the mind), your brain will generate old behavior from the old model, old behavior brings old results, and old results in turn confirm the old model. This is a closed loop, a snake biting its own tail.
 Buddhism calls it reincarnation, cognitive science calls it a self-fulfilling predictive loop — it's the same thing.

And Buddhism's deepest point meshes completely with point 3 in psychology: the root of reincarnation isn't "circumstances," it's "self-attachment" — that old identity that refuses to die. Breaking reincarnation isn't changing environments, it's "no-self" — letting that clutching self loosen its grip.

Six: so, how do you break it? — not through willpower, but through "design"

I won't give you chicken soup. Based on the five layers above, inertia is something welded down by four things — genes, psychology, structure, ancestors — and "I want to change" willpower alone will almost certainly lose, because willpower also burns that 20% of energy, and your old machine is specifically built to fight energy expenditure.

To break inertia, use design, not resolve. Five items, each corresponding to a layer above:

Against evolution's stop-loss program → put a price tag on "not changing" too.
 Your brain by nature only calculates "the risk of changing," never "the cost of not changing." So you have to force it to calculate the latter. Ask yourself one question (and ask it for cubxxw too):

▎ "If I stay in Shenzhen another 5 years and everything stays the same, what will I have lost in 5 years? Who will I have become?"
 ▎ Reprice "maintaining the status quo" from a "zero-cost default option" into "an option that is quietly bleeding." Inertia's biggest scam is making you feel that "not moving" is free. It isn't. It's you paying in installments out of the future.

Against cognitive dissonance's defense mechanism → forcibly separate "reasons" from "decision."
 Since the brain will fabricate reasons for what it has already done, write the reasons down before making the decision. Write "I choose Shenzhen because ____," then ask item by item: is this the real reason, or post-hoc cosmetic work? A brutal test: "If I had never lived in Shenzhen, and today I chose from scratch, would I pick it?"
 If the answer is no, then all the reasons you stayed are sunk-cost defense arguments, not grounds for the choice.

Against sunk cost → decide with a "reset to zero" view.
 Economics has a saying: sunk cost is not a cost. The years already spent, the feeling already spent, the chips already bet — in making the next decision, their weight should be zero. The real question is forever only one: "Looking forward from this moment, which road is better?"
 Not "I've already paid in so much." That girl, that investor, and you — all fell because you counted "past investment" into "future choice."

Against path dependence → don't force it; lower the "exit tax" first.
 If structural stickiness is too great, don't ram it with willpower (you'll bounce back). Take apart that "exit tax" piece by piece: first try living in a strange city for a month short-term, first migrate part of your social relationships out, first turn "leaving" from a cliff jump into a slope you can test and back out of. What inertia fears isn't courage, it's "reversible small steps" — because small steps don't trigger that ancient stop-loss alarm.

Against identity / self-attachment → actively build yourself a "rite of passage."
 This is the most fundamental item, and the one I most want to leave you with. Since the old identity won't die on its own, actively create a "liminality" — a deliberate, ritual-feeling rupture: a solo long-distance hike, a period of living alone away from everyone you know, a clear marking event of "ending the old self, welcoming the new one." Not to escape, but so that in that suspended "being nothing," the old identity loosens its grip and the new identity has room to grow. cubxxw has been doing this unconsciously all along. You can do it consciously too.
 → Buddhism calls this "practice": what you practice isn't anything else — it's repeatedly letting that "I" loosen its grip at the level of the mind. Every loosening cuts one link of karma.

Finally, one sentence for you

▎ Inertia is an old machine designed to keep your ancestors "alive," but which is now making it impossible for you to "live well." It's welded into your brain by genes, fed in your heart by defense mechanisms, locked under your feet by concrete-like structure, and has had your road chosen for you by an unwritten social script.

▎ So breaking it is never about "becoming more persistent" — it's about seeing clearly that it's a machine, then not colliding with it head-on, but going around behind it and redesigning its inputs.

▎ Buddhism says "manifesting according to karma," science says "predictive loop," and they're describing the same thing: you're not pushed along by fate, you're dragged by an "old self that won't die," drawing circles in place. The only exit from the circle isn't changing places, changing people, or changing bets — it's in that hardest action: letting the old you die once.
