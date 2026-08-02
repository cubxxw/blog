---
title: 'Common Sense Is Not the Mechanism: Rebuilding Industries Around Demand, Constraints, and Scarcity'
date: 2026-08-01T23:00:47+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Product Strategy
  - Harness Engineering
  - Automation
  - Career
description: >
  A framework for testing AI industry ideas: start with durable demand, map constraints and scarcity, redesign the workflow, and validate it with real failures.
tldr:
  - Common sense compresses repeated experience into a stable rule of thumb. It can lead us toward a mechanism, but it cannot replace the mechanism, its boundary, counterexamples, or a falsifier.
  - Industry analysis should separate user, business, and technical demand, then map both demand and supply. As AI lowers old costs, verified context, quality standards, action rights, trust, and accountability often become scarcer.
  - Netflix kept returning to the higher-level job of making satisfying entertainment convenient. DVD delivery, streaming, originals, advertising, and games were provisional answers; Qwikster showed that a sound direction does not excuse a bad user experience.
  - Agent adoption should move from learning the work manually to AI assistance, a stable workflow, and only then autonomy, with domain graders, small real bets, and production failures feeding the next iteration.
cover:
  image: /images/covers/ai-agent/2026/common-sense-ai-industry-reconstruction.jpeg
  alt: 'A fixed demand axis beside industry workflow cards being reconnected'
---

“Is common sense the same as the mechanism underneath?” That was where I got stuck while testing ideas across several industries. I had also reviewed the published work of 22 frontier AI teams and more than 70 people whose work is public. A pattern kept returning: pursue one long-running question, define what good work looks like, connect papers, code, and products, then turn production failures into the next round of tests. But the pattern still did not tell me where industry analysis should begin.

I no longer try to compress common sense, first principles, and demand into one correct starting point. My current answer is narrower: common sense may point toward a mechanism, but it cannot stand in for one. Start with a relatively durable customer job, then map the supply structure, old constraints, and the movement of scarcity. Netflix and recruiting will test that workflow below. The pattern I saw is my synthesis of public sources, not a uniform self-description by the people studied. I have not yet validated this framework inside a real traditional-industry business.

## Common sense can start the inquiry, but it cannot finish it

The first correction was to separate common sense, essence, and first principles. They can all look like what remains after we “dig deeper,” but they do different work.

| Concept | The question it answers | The common mistake | What makes it reliable |
|---|---|---|---|
| Consensus | How do people currently understand or act? | Treating a majority habit as a fact | Participants, incentives, and formation process |
| Common sense | What usually happens? | Dropping the conditions under which it holds | Repeated experience, mechanism, and counterexamples |
| Essence | Why does the phenomenon happen this way? | Replacing a causal chain with an elegant label | A testable causal mechanism |
| First principle | Which premise supports this system but cannot be derived from within its current boundary? | Letting the analyst choose an arbitrary axiom | An explicit system boundary and falsifiable premises |

Take the claim that excess profits attract competitors. As common sense, it is often useful. Underneath it sits a mechanism: profit signals redirect resources, and new supply changes prices and competition. But licensing, network effects, exclusive resources, switching costs, and regulation can preserve excess profits for a long time. Remove those boundaries and the rule becomes a slogan.

First-principles reasoning is not automatically safer. The deductions may be formally valid while the starting premise merely reflects the analyst's preference. Change the system boundary and what looked “irreducible” can change with it. The value of first principles is that they force me to expose the premises; they do not grant my conclusion immunity from review.

Complex systems also defeat linear common sense. In her discussion of system interventions, Donella Meadows shows how feedback strength, information flows, and delays relative to a system's rate of change can produce oscillation, overshoot, and collapse. She also warns that self-organizing systems with nonlinear feedback can be understood only in broad terms, not precisely predicted or controlled. [Those constraints](https://donellameadows.org/archives/leverage-points-places-to-intervene-in-a-system/) make “do A, get B” a local map at best.

I now put four guardrails around any claim presented as common sense: What mechanism produces it? Under which conditions does it hold? What is the strongest counterexample? What result would make me admit it is wrong? Only after those questions does common sense become a useful starting point for industry analysis.

## Map three kinds of demand—and both sides of the market—before reaching for AI

An AI capability becomes a product only after it passes three different tests: user demand, business demand, and technical demand. Mixing them produces the seductive leap from “the model can do it” to “the market must want it.”

- **User demand:** Who is trying to accomplish what, and what money, time, risk, or uncertainty do they carry today?
- **Business demand:** Who pays, why do they pay, how is value delivered, how is margin retained, and who absorbs the cost of failure?
- **Technical demand:** What abilities are required to gather information, exercise judgment, take action, and verify the result for the first two layers?

I use **grader** below to mean an acceptance test that can actually be run: what passes, what must be stopped, and how a failure becomes input to the next iteration.

In the product reasoning I use today, technical demand is derived from the first two. The same image-recognition capability behaves differently in an entertainment filter, industrial inspection, and medical diagnosis. The data, tolerance for error, responsibility structure, and buyer all change. The capability is the same; the product is not. This ordering does not deny that technology can create new behavior. When a new capability changes what people want to do or what they will pay, the demand map has to be redrawn.

The supply side belongs on the same page. Demand analysis asks who is trying to complete a job, what substitute they use, and why it remains unsatisfactory. Supply analysis asks who controls content, goods, data, channels, trust, fulfillment, standards, and decision rights. Many “inefficient” intermediaries also verify claims, provide guarantees, finance transactions, handle compliance, or resolve disputes. Looking only at visible interface steps makes it easy to delete a risk bearer while believing we removed an information broker.

Users, buyers, and affected people may also be different groups. A company buys a recruiting screen, a recruiter operates it, and a candidate bears the cost of a false rejection. A hospital may purchase a clinical assistant, a doctor may use it, and a patient absorbs the harm of a mistake. When these roles are misaligned, usage and willingness to pay are not enough to prove user value. The grader cannot measure only what the buyer likes.

I compress the workflow into this map:

```text
User job and actual cost
        ↓
Business value and distribution of benefits
        ↓
Current supply, information, risk, and power structure
        ↓
Which constraints came from old technology, and which remain
        ↓
What AI makes cheaper, and where scarcity and power move
        ↓
Redesign roles, workflow, and responsibility
        ↓
grader → small real bet → production failure feedback
```

The map does not assume that demand never changes. Technology creates new behavior, expectations, and social norms; short-form video on smartphones is an obvious example. What remains relatively stable is often a higher-level job—finding entertainment, reducing transaction uncertainty, or locating a suitable collaborator—while preferences and implementations still move. “Durable demand” is a hypothesis to test, not an eternal truth.

## Netflix kept the customer job stable while repeatedly rewriting the product

Netflix is useful here because the product kept changing while the customer job remained recognizable. When the company mailed its final DVD in 2023, it looked back to the first shipment in 1998 and described the service in terms of more choice, more control, and watching on a member's own schedule. [Netflix's account of the DVD era](https://about.netflix.com/en/news/thanks-for-watching) is closer to what customers bought than the label “DVD-by-mail company.”

On the user side, people wanted convenient access to satisfying entertainment with less waiting, fewer schedule constraints, and a lower cost of choosing. The subscription plan introduced in 1999 removed due dates and late fees: members chose films online and returned them in prepaid envelopes. [The original company announcement](https://about.netflix.com/en/news/netflix-com-transforms-dvd-business-eliminating-late-fees-and-due-dates-from) records that experience. Streaming removed the logistics delay. Once the catalog became too large to navigate manually, recommendation became a way to increase the odds of a satisfying viewing session. Netflix's 2025 engineering post on its recommendation foundation model discusses long interaction histories, cold start, presentation bias, downstream tasks, and evaluation, all in service of better recommendations and adaptation to member preference. [The engineering account](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39) also makes clear that larger models and more data still require robust evaluation.

The business and supply sides add different constraints. Entertainment content is expensive, licenses expire, and competitors want the same desirable rights. Netflix's latest [2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1065280/000106528026000034/nflx-20251231.htm) says revenue is primarily derived from membership fees and names linear television, other streaming providers, games, open-content platforms, and social media as competitors for consumer leisure time. The company also competes with other services and producers for licensed and original projects. Originals and exclusives, global distribution, different price tiers, and advertising can therefore be read as provisional answers to constraints around content control, acquisition, retention, and margin.

The transferable principle I am willing to keep is simple: stay loyal to the demand and constraints, not to the company's last successful answer. DVD delivery, streaming, original content, advertising, live programming, and games have no natural hierarchy. Each works only under a particular combination of technical cost, content rights, competitive structure, and user behavior.

The organizational model also has to stay attached to its conditions. Netflix's 2024 culture memo places “Context, not Control” inside a system of a high-performing team, transparency, accountable decision owners, and postmortems. Managers still coach and intervene around ethical risk, major harm, crisis, or a new employee who lacks context. [The memo](https://jobs.netflix.com/culture) assigns outcomes to an informed captain and asks that person to actively farm for dissent. Copy “fewer rules” without talent density, context, responsibility, and review, and the likely result is unowned work.

Qwikster keeps the story honest. In 2011, Netflix planned to rename its DVD business Qwikster and would have forced customers who used both DVD and streaming to manage separate sites and accounts. The company withdrew the plan three weeks later and acknowledged that customers valued the simplicity of the existing service. [Contemporary reporting](https://www.foxbusiness.com/features/netflix-aborts-plan-to-separate-dvd-streaming-services) captures the original change, user friction, and reversal. Whatever internal cost logic made separation attractive, it did not make the proposed user experience acceptable.

The Netflix story still carries survivor bias. “Competing for leisure time” may be a broad explanation sharpened after success, and no culture mechanism by itself proves why a company succeeded. I use Netflix as an observable case of separating demand from solution, not as causal proof by analogy.

## AI changes an industry's bottleneck before it changes the workflow

The useful question is what becomes expensive after AI lowers another cost. In the cases covered here—content, code, search, and preliminary analysis—I see generation and execution getting cheaper. Value may not disappear with that cost. It may move toward verified context and evidence, permission and distribution inside real systems, and people who define quality and take responsibility for the result.

I ask four questions in sequence:

1. Which step once required an intermediary because information was expensive?
2. Which step once required an expert because judgment was expensive?
3. Which step once required a handoff because execution was expensive?
4. Once those costs fall, which new bottleneck appears: data, permission, fulfillment, distribution, trust, or acceptance criteria?

Public engineering material from frontier AI companies suggests a shared pattern: model capability becomes usable only after it enters an environment with tools, evaluations, and feedback. Their own accounts do not prove that a particular workflow caused commercial success. They do show how judgment is being embedded in production workflows.

First, the environment and its context have to become legible. OpenAI's [Harness Engineering retrospective](https://openai.com/index/harness-engineering/) says that in this internal experiment, as agent throughput rose, engineers spent more time designing environments, specifying intent, making repositories legible, and building feedback loops. Architecture boundaries, documentation, and tests became mechanically enforced constraints.

Offline evaluations then have to be checked against real behavior. Cursor combines CursorBench with online experiments and tracks code Keep Rate, tool-error categories, and production failures. [Its account of harness iteration](https://cursor.com/blog/continually-improving-agent-harness) treats offline scores as comparable signals and real errors as a way to find where the harness breaks.

Production failures must become tests for the next version. Sierra has domain experts annotate real conversations, then turns problems into simulations and regression tests run at the customer level during upgrades. Its [Agent Development Life Cycle](https://sierra.ai/blog/agent-development-life-cycle) describes that loop. In a high-risk domain such as law, the grader must come from domain practice: Harvey's [BigLaw Bench](https://www.harvey.ai/blog/introducing-biglaw-bench) was designed around real legal tasks by a research team with practicing experience, with rubrics that combine content requirements, error penalties, and source verifiability.

Together, these cases support a narrower inference: as generation costs continue to fall, problem context, quality definition, action rights, and accountability may become scarcer. Every industry still has to test that proposition for itself. It is not a universal law.

Scarcity does not guarantee profit. Whether a scarce capability retains margin depends on willingness to pay, ease of replication, control of distribution, and whether liability consumes the revenue. That is why business demand has to remain a separate map.

I am willing to expand an agent's autonomy only in this order:

> learn the work manually → use AI as an assistant → codify the workflow → expand agent autonomy

I first learn the work manually so I can see its exceptions, tacit coordination, and real error costs. AI assistance helps me discover which judgments can be specified and tested. Workflow design then fixes the inputs, permissions, acceptance criteria, and recovery path. Only after that do I expand autonomy. A reversible, low-risk task with clear checks may move quickly through these stages. In a high-risk task full of tacit rules and late-arriving errors, skipping them automates a misunderstanding of the industry. I develop the engineering side of graders, permissions, and rollback in [How to Build Real Trust in Unattended AI Agents](/ai-agent/posts/trusting-unattended-ai-agent/).

## Recruiting reconnects demand, evidence, and accountability

Recruiting lets the method run from one end to the other because AI has reduced generation costs on both the applicant and screening sides. As a working model, an employer wants to find people likely to contribute while lowering hiring risk. A candidate wants suitable work, fair compensation, room to grow, and a credible promise. Those are analytical starting points; résumés and job descriptions are the information containers used by the current system.

The business map contains more than employers and candidates. Platforms reduce search costs. Recruiters organize screening and close candidates. A referral carries a bounded claim of trust based on first-hand work. The cost of a poor match is shared by the candidate, team, manager, and company. Performance after hiring also depends on management, collaboration, and resources, so “quality of hire” cannot be assigned entirely to the candidate or credited entirely to a recruiting tool.

As AI makes résumé polishing, job-description writing, keyword matching, and bulk applications cheaper, AI-polished self-description becomes a weaker differentiator. Greenhouse's [2025 Workforce & Hiring Report](https://www.greenhouse.com/blog/greenhouse-2025-workforce-hiring-report), based on 2,200 active job seekers in the United States, United Kingdom, and Ireland, reports automated applications, AI-generated fake work samples, and difficulty standing out. LinkedIn's [2025 Future of Recruiting](https://business.linkedin.com/hire/resources/future-of-recruiting) combines platform data with a survey of more than 1,000 recruiting professionals and emphasizes quality of hire and skills-based hiring. Both sources come from recruiting platforms. They establish what those platforms and respondents are prioritizing, not that skill claims have already become useless or that a new evaluation method is fairer.

I would take the next step toward **evidence-first** hiring. A role becomes a set of tasks, constraints, decision rights, and graders rather than a wish list of skills. A candidate's fact layer stores projects, roles, and verifiable outcomes. A capability layer makes bounded inferences. The résumé becomes a view compiled for the job. It will not disappear quickly: institutional habit, cheap first-pass screening, and the candidate's need to present a narrative will keep it alive.

Referrals need a similar rewrite. Their legitimate value is the transfer of reputation and first-hand work evidence; the referrer should state what they observed and what they did not. Knowing a person cannot establish that they fit a particular job. Nor should a matching system return a falsely precise percentage. A useful output identifies the evidence, the job constraints that remain untested, and the next task or conversation that would reduce the uncertainty.

```text
Candidate evidence graph × role task graph × trust relationship graph
                           ↓
               explainable match recommendation
                           ↓
               work sample / interview / human decision
                           ↓
                    30 / 90 / 180-day feedback
```

Work samples carry costs of their own. They may favor candidates with spare time, equipment, and public portfolios. They can also become unpaid labor or another evaluation candidates learn to game. A more defensible design limits the time burden, offers equivalent opportunities, measures only job-relevant work, and lets a candidate explain context. A grader makes standards visible; it should not collapse a person into one number.

Recruiting is a high-impact decision, so automation boundaries belong inside the workflow. Annex III of the EU [AI Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32024R1689) lists several recruitment, screening, and employment uses as high-risk; a particular system still has to be assessed under Article 6, including its exceptions. The application date has just changed: [Regulation (EU) 2026/1744](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202601744), which entered into force on July 27, 2026, moved the Chapter III Sections 1–3 obligations for Article 6(2) and Annex III systems—except Article 6(5)—to December 2, 2027. The Annex III listing remains, but classification and the date on which the corresponding obligations apply are different questions. New York City's [AEDT rules](https://home4.nyc.gov/site/dca/about/automated-employment-decision-tools.page) still require covered tools to receive an annual bias audit, publish information, and provide advance notice. The U.S. EEOC's [worker guide to AI and employment discrimination](https://www.eeoc.gov/sites/default/files/2024-04/20240429_Employment%20Discrimination%20and%20AI%20for%20Workers.pdf) likewise makes clear that automated selection procedures remain subject to anti-discrimination and reasonable-accommodation requirements.

An agent can maintain context, search and organize evidence, and recommend the next verification step. Job definition, fairness oversight, human relationships, appeals, and the final hiring decision still belong to people with the authority—and accountability—for the outcome. [Give AI Tasks, Not Just Direction](/ai-agent/posts/give-ai-tasks-not-directions/) reaches the same boundary from another angle: agents can execute a well-defined task, while value trade-offs and the definition of done remain human responsibilities.

## A useful framework must specify how it can fail

The most dangerous move now would be to sell this workflow as a universal answer. I use several failure signals to argue against it.

If the only defense of an industry step is “we have always done it this way,” I follow the money, risk, and decision rights. If the step mainly protects an incumbent position rather than the customer job, I remove it from the demand map. What sounded like common sense was consensus.

A second failure signal appears when two equally plausible system boundaries produce opposite solutions. If I cannot explain why one boundary deserves the bet, formal elegance does not rescue the analysis. The problem is the axiom I selected, not the neatness of the deduction.

A small trial may also expose delays, reversals, or participants adapting to the rule. Those effects go back into the system model. Calling every counterexample “poor execution” would only protect a linear assumption that has already failed.

Comparative cases can overturn the story too. Netflix and a handful of AI companies show that a mechanism exists. If similar moves do not produce comparable outcomes elsewhere, I withdraw the claim that the mechanism helped cause success; I do not let survivors erase the missing failures.

The deeper counterargument is that supply can create demand. Technology produces habits and expectations that did not exist before. A “durable demand” must pass two tests: it should explain more than one temporary solution, yet stay narrow enough that it cannot absorb every new behavior. If people stay with and pay for participatory media primarily because of identity expression and co-creation, and “satisfying viewing” no longer explains the change, I have to redraw the demand. Calling everything entertainment would only save the framework from being tested.

## Seven questions come before I try to rebuild an industry with AI

I began by asking whether common sense was the essence. A more useful question now is: What mechanism sits behind this rule, where does it fail, and which real outcome am I willing to use as a test?

The next time someone claims that AI can rebuild an industry, I will write down seven questions:

1. What is the user actually trying to accomplish, apart from the product they currently buy?
2. Who pays for the problem with money, time, risk, or uncertainty?
3. Which parts of the present structure are hard constraints, and which are historical habit?
4. After AI makes something cheaper, where do the new bottleneck and decision power move?
5. How does the new solution enter an end-to-end workflow and recover from failure?
6. Who defines “good,” and what exactly does the grader inspect?
7. Which real result would make me admit that the rebuild does not work?

If the answers produce only a feature list, a grand trend, and a vision that cannot be falsified, I will not rush to build an agent. I will go back to the work, perform the task manually, and look for the real costs, exceptions, and accountable people.

The framework still owes one debt: a real result in a traditional industry. I need to use it for a small, reversible bet and watch what someone is willing to pay, which grader predicts the outcome, and where failures surface and feed back into the workflow. Until then, it can expose my premises and unknowns. It cannot declare an industry's final form for me.

## Frequently asked questions

### What is the difference between common sense and first principles?

Common sense compresses repeated experience into a stable expectation about what usually happens. A first principle is a foundational premise inside an explicit system boundary. Neither is exempt from review: common sense needs a mechanism and counterexamples, while first principles need disclosed boundaries and falsifiers.

### How can I tell whether an AI industry idea solves a fake need?

Ask whether it can name the user job, buyer, risk bearer, and current substitute. Then identify the cost AI lowers and the new bottleneck it creates. If the answer contains only model features—or cannot define a grader and a result that would invalidate the proposal—the need remains unproven.

### What does Netflix teach about separating demand from solutions?

DVD delivery, streaming, and original content were provisional solutions under different constraints. Convenient access to satisfying entertainment is the higher-level job used in this analysis. The framework does not prove a single cause of Netflix's success; Qwikster also shows that a long-term direction cannot excuse a poor current experience.

### Why should a recruiting agent not make final hiring decisions autonomously?

Hiring changes people's opportunities, while evidence is shaped by unequal resources, networks, and history. An agent can organize evidence and recommend tests. Job definition, fairness oversight, appeals, and the final decision still require a person with authority to accept the consequences.
