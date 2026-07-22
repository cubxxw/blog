---
title: I Ran Ten Agents Overnight, Woke Up to Ten PRs, and Then I Got Stuck
ShowRssButtonInSectionTermList: true
date: '2026-07-19T09:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['production layer', 'AI coding', 'agent orchestration', 'review bandwidth', 'first-pass correctness', 'git worktree', 'CLAUDE.md', 'AGENTS.md', 'MCP', 'Claude Code', 'AI code quality', 'super individual']
tags:
  - AI
  - Agent
  - Super Individual
  - Harness Engineering
  - Testing
  - Security
description: >
  Part two of "The Super Individual's Gear Stack," on the bottom layer — production. Every advance in this layer is a public good, handed to everyone at the same moment, so once it's good enough you should stop investing. What actually blocks you isn't execution bandwidth but review bandwidth, which cannot be scaled the same way. The only lever that works is raising first-pass correctness — front-loading rules, writing acceptance criteria into tickets, and letting agents run tests to green before opening a PR. The back half lays out empirical data on AI code quality and security, which happens to explain exactly why testing and isolation are the real gear of this layer.
tldr:
  - Every advance in the production layer is a public good distributed to the whole industry at once. When you get 5x faster, so do your competitors — so equip this layer to "good enough" and stop.
  - The test for "good enough" isn't whether you're on the latest tools; it's whether your bottleneck has moved off delivery speed — usually to "I can't review it all."
  - Execution bandwidth can be parallelized and copied. Review bandwidth lives in one person's head and can't be scaled the same way. That's the real ceiling on parallel agents.
  - The only lever that works isn't adding more agents; it's raising first-pass correctness, so review can downgrade from reading code line by line to checking tests and PR descriptions.
  - Empirical data shows models are getting better at writing functionally correct code and not at writing secure code, so tests and isolation aren't optional — they're this layer's primary gear.
maturity: budding
columns:
  - super-individual-stack
series:
  name: The Super Individual's Gear Stack
  slug: super-individual-stack
  order: 2
  total: 5
cover:
  image: /images/covers/ai-agent/2026/super-individual-stack-production.jpeg
  alt: "I Ran Ten Agents Overnight, Woke Up to Ten PRs, and Then I Got Stuck"
---

This is part two of "The Super Individual's Gear Stack." If you haven't read the [overview](../super-individual-stack-four-layers/), start there — every judgment in this piece rests on the yardstick that essay proposed: **does an advance in a layer of gear help only you, or does it help all of your competitors at the same time?**

## A morning I thought was good news

For a stretch last winter, I had tuned my execution pipeline to a state I was, at the time, quite proud of.

Before bed I'd split the day's accumulated backlog into roughly ten tasks, each in its own isolated workspace, agents running in the background. Next morning I'd open the laptop: ten branches, ten PRs, each with a change description that read pretty convincingly. From the perspective of any "gear checklist," this was a model setup: parallelism maxed out, output happening while I wasn't even there, marginal cost approaching zero.

Then I sat down to review.

I started at nine thirty. By lunch I'd gotten through three. One of them looked fine, but it took me forty minutes to confirm it hadn't quietly changed a piece of boundary handling I'd deliberately written that way three months earlier. By the fifth PR that afternoon I didn't really want to look anymore. For the sixth and seventh I basically glanced at the diff line count and whether tests passed. The eighth I just merged. By evening, two were still sitting there, and I dragged them back into the backlog.

That night I did something very stupid: I queued up ten more tasks. Because instinctively, if waking up to ten PRs was good news, waking up to ten more tomorrow must be good news too.

A week later I did the math. That week I merged about three times my usual volume of code, but the number of features that actually shipped, that actual users actually touched, didn't go up by one. Everything extra piled up in main, existing in the form of "done," actually existing in the form of "not yet verified." And my subjective experience of that week was: extremely busy, extremely productive, extremely exhausted.

That's the thing I want to get straight in this essay. **I made execution faster and discovered that nothing got faster.** It wasn't that the tools were bad. It was that I had the bottleneck wrong.

## First, what this layer actually looks like right now

**Any discussion of the production layer that doesn't first separate the "model layer" from the "harness layer" degenerates into a flame war about which model is smarter — which is precisely the least worthwhile part to discuss.**

The model layer is raw reasoning ability: can it understand a refactor spanning a dozen files, can it locate the right spot in an unfamiliar codebase, how big is the context window, what's the unit cost. You have zero influence over this layer. It's determined by the training schedules of a few companies, shipped by version number, released to the entire world at the same moment.

The harness layer is how the model gets wired into your repo and your workflow. This layer has real engineering in it, and all of that engineering is on your side.

Take Claude Code's official extension stack as a concrete coordinate system. Its layering goes roughly like this: `CLAUDE.md` (a project-level rules file), Skills (reusable skill packs), Code intelligence (LSP, so the agent actually understands symbols and references instead of string-matching), MCP (connecting external tools and data sources), Subagents (dispatching subtasks to sub-agents with independent contexts), Agent teams (experimental multi-agent collaboration), Hooks (attaching your own scripts to lifecycle events), and Plugins with Marketplaces (packaging and distributing all of the above).

Lay these out side by side and you notice they're all answering the same question: **the model is generic, your repo is particular — who bridges the gap?**

```
                    ┌──────────────────────────────────┐
   Model layer      │  reasoning / context window / unit cost │   fully exogenous
                    └──────────────────────────────────┘
                                    ▲
                                    │  same capabilities, same moment, to everyone
                                    │
   ┌────────────────────────────────┴────────────────────────────────┐
   │  Harness layer — how the model is wired into YOUR repo and flow │
   │                                                                 │
   │   rules file    tool interface   subagents     hooks     distro │
   │   CLAUDE.md        MCP          Subagents     Hooks    Plugins  │
   └─────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │  three form factors; the only difference is
                                    │  whether you're present
   ┌──────────────┬─────────────────┴──────────┬──────────────────┐
   │ terminal agent│    cloud autonomous agent   │   IDE-embedded   │
   │ you're present│    you're absent            │   you watch every│
   │ interrupt any │    it hands you a PR        │   line: complete/│
   │ time          │    when done                │   local edits    │
   └──────────────┴────────────────────────────┴──────────────────┘
```

The three form factors on the bottom row deserve a couple of extra sentences, because the difference between them isn't features — it's **how your attention gets consumed**. IDE-embedded requires your presence the entire time; the quality floor is high but parallelism is 1. The terminal agent is most people's daily driver right now; parallelism depends on how many terminals you can watch at once, which in practice rarely exceeds two or three.

Cloud autonomy is the seductive one. Claude Code's **Routines** (currently a research preview) is the archetype of this form: you save a configuration — prompt, target repo, required connectors — and it runs on Anthropic-hosted cloud; close your laptop and it keeps going. There are three trigger types: Scheduled (minimum interval one hour, cron expressions supported), API (each routine gets its own `/fire` endpoint and bearer token), and GitHub event triggers.

There's a detail here I think anyone who does engineering should stop and look at: **a routine runs with no permission picker and no approval prompts.** Which makes sense — you're not there, so who would the dialog be shown to? So its security boundary is drawn a different way: by default it can only push to branches prefixed `claude/`. In other words, it can write code, open branches, open PRs — but it cannot touch your main.

Another detail is even prettier. Text passed in through the API trigger gets wrapped in a `<routine-fire-payload>` block and explicitly labeled as **untrusted data**. That's an exceptionally clear-headed design: since this endpoint can be called by any system holding the token, whatever the caller stuffs in must be treated as external input, not as your own instructions. It's textbook prompt-injection defense — structurally separating "who is speaking" from "what was said."

I'm pulling this detail out not to praise a product, but because it reveals the real maturity marker of this layer of gear: **once agents start running while you're absent, the security model must switch from "ask you at every step" to "pre-draw the boundary of what it can touch."** That switch changes how you work more than any single model upgrade does.

### The rules file — a thing the internet keeps getting wrong

Since `CLAUDE.md` came up, I need to insert a correction here, because this is the single technical detail I've seen written wrong most often.

**Claude Code reads `CLAUDE.md`, not `AGENTS.md`.** The official docs say it plainly: *"Claude Code reads CLAUDE.md, not AGENTS.md."*

Yet there are plenty of articles out there — including some widely circulated Chinese translations — flatly stating "Claude Code now supports the AGENTS.md standard." That is wrong. If you believed it, put your project rules only in `AGENTS.md`, and then wondered why the agent completely ignored your conventions — here's your answer: it never read them.

The official bridge comes in two flavors, both plain: import it inside `CLAUDE.md` with `@AGENTS.md`, or just make a symlink, `ln -s AGENTS.md CLAUDE.md`. Either route lets one set of rules serve multiple tools.

The origin story of `AGENTS.md` explains why the misconception spread so far. It was released by OpenAI in August 2025, donated on December 9, 2025 to the newly formed Agentic AI Foundation (AAIF, under the Linux Foundation), and by the official December 2025 figures, over 60,000 open-source projects had adopted it. The Linux Foundation press release names native-support tools including Amp, Codex, Cursor, Devin, Factory, Gemini CLI, GitHub Copilot, Jules, VS Code — a list long enough that people naturally default to "every agent tool supports it." But Claude Code genuinely isn't on it.

**The significance here goes beyond fixing one error.** A fact you can verify in thirty seconds got retold, repeatedly, as its own opposite — and every unit of attention you invest in this layer first has to pass through that kind of noise. Which is itself an empirical argument for "this layer doesn't deserve much of your attention."

The docs offer one more piece of advice I strongly agree with: **keep `CLAUDE.md` under about 200 lines.** The reasoning behind it I'll unpack later when we get to "front-loading rules" — it's not about saving tokens; it's about making the rules actually get followed.

### Tool interfaces and ticket-driven orchestration

MCP's position in this stack is "let the agent touch the world beyond code." It was first open-sourced in November 2024, and — same date again — donated by Anthropic to the AAIF on December 9, 2025. The official figure is over 10,000 published MCP servers (December 2025). AAIF's platinum members include AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI; platforms that have adopted the protocol include Claude, Cursor, Microsoft Copilot, Gemini, VS Code, ChatGPT.

I'm listing all this not to show off a thriving ecosystem — quite the opposite. **Two protocols that originally belonged to different companies were donated to the same foundation on the same day. The signal could not be clearer: competition at the interface layer is over.** The end of competition means it moved from "a source of differentiation" to "the backdrop of differentiation" — everyone's ability to plug into external systems is now identical. This is the standard form of what the overview essay called a "table stake."

One layer up is ticket-driven orchestration — agents pulling work directly from your task system. Linear's agents directory is the clearest window on this: the leading agents you can directly assign today include Codex, Cursor, GitHub Copilot, Factory's Droids, Sentry Agent, and Devin. You assign an issue to one of them, it goes off and does the work, writes progress back to the issue, and finally opens a PR.

But there's a gap worth calling out: **what Anthropic officially ships for Linear is just an MCP connector, filed under "AI clients" — it can't be assigned, has no event triggers, and won't watch an inbox on its own.** In other words, you can have Claude read Linear, but you can't throw a Linear issue at Claude and have it run on its own.

That gap is exactly the space where open-source projects like [Cyrus](https://github.com/cyrusagents/cyrus) live. Its self-description is blunt: *"Your (Claude Code|Codex|Cursor|Gemini) powered (Linear|GitHub|GitLab|Slack) agent."* Apache-2.0, around 703 stars, BYOK, fully self-hostable. The mechanism: listen for assigned issues, **create an isolated git worktree for each issue**, run an agent session inside it, stream activity back to Linear or GitHub, and open a PR at the end.

I bolded the worktree part on purpose. There's an entire section on it below — it's the piece of gear in this layer I consider most underrated.

## Every advance in this layer ships to everyone at the same moment

**Now take everything inventoried above and run it back through the overview's question: model upgrades, stronger harnesses, protocol standardization, one more assignable agent in Linear — which of these helps you and not your competitors?**

Not one.

Model upgrades are public events shipped by version number. Once MCP and `AGENTS.md` were donated to a foundation, the ability to plug into external systems became identical for everyone. Cloud autonomy like Routines — you can use it, and so can everyone doing the same thing you do, starting the same day. Cyrus is Apache-2.0; anyone can clone it.

There is no form of private accumulation in this layer. Spend two weeks today tuning your toolchain to perfection, and three months from now someone spends two hours installing default configs and lands at 80% of where you are — because more than half of your two weeks was burned on pitfalls, stale tutorials, and misinformation like that "Claude Code supports AGENTS.md" line, and those pits fill themselves in as the ecosystem matures, with the gains distributed evenly across the whole industry.

So the correct strategy for this layer is one sentence: **equip to good enough, then stop.**

The trouble is that "good enough" is too soft a phrase — soft enough that anyone can talk themselves into "I'm not there yet." So let me give you an operational set of criteria.

### Five tests for "good enough"

The standard I use myself is these five. When all five hold, stop, and look at the next layer up.

**One: you have a project-level rules file that actually gets followed.** Not "I wrote a `CLAUDE.md`" — the agent's output genuinely conforms to what's in it. The check is simple: skim your last ten reviews. If the same comment appears three or more times, that rule either isn't written down or is written down and ignored.

**Two: you have a verification pipeline that runs end to end with one command, locally and in CI.** Tests, lint, type checks, build — one command, exit code 0 or not 0. The point of this pipeline isn't "guaranteeing quality." It's **giving the agent a feedback signal it can read on its own.** Without it, all verification work flows back to you. This is the most important of the five.

**Three: you have isolated execution environments.** One task, one workspace; if the agent wrecks it, your main branch stays clean.

**Four: you have a single intake for tasks.** Linear, GitHub Issues, or one markdown file — doesn't matter. What matters is that task descriptions and acceptance criteria have a fixed home, instead of being improvised in a chat box every time.

**Five: your bottleneck is no longer "we build too slowly."** This is the terminal test. When you honestly ask yourself "why didn't I ship more this week" and the answer isn't "I couldn't write it fast enough" but "I couldn't review it all" or "I didn't know what to build" — congratulations, this layer's job is done.

Conversely, a few signals say you're over-equipped: you spend more hours per week tuning tools than using them; you can explain the differences between five agent orchestration frameworks but can't say who the user of your last feature was; your `CLAUDE.md` has grown to 500 lines while the agent keeps making mistakes it explicitly forbids.

That last one is the real meaning of the official "under 200 lines" advice. **A rules file doesn't get better as it gets longer, because it isn't documentation — it's a standing payload squeezed into the context of every conversation.** By the time it hits 500 lines, the weight of the first 200 has been diluted; you are, in effect, weakening your rules by adding rules. The right mindset for writing a rules file is closer to writing a constitution than a handbook: only the hard constraints where "violation means the PR gets bounced," and leave the rest to tests.

## The real bottleneck is review bandwidth, not execution bandwidth

**Execution bandwidth can be parallelized, copied, with marginal cost approaching zero. Review bandwidth lives inside one person's head — serial, uncopyable, a fixed daily ration. These two things scale in completely different ways, and every piece of gear in the production layer acts only on the former.**

This is the core of the essay.

Back to that morning. Launching ten agents overnight costs me almost the same as launching three — the seven extra tasks are seven extra commands. But what I had to read in the morning more than tripled. That asymmetry is the part the entire "parallel agents" narrative systematically buries.

```
   Execution bandwidth                          Review bandwidth
   parallel · copyable · marginal cost → 0      serial · uncopyable · fixed per day

   agent × 1  ─┐
   agent × 2  ─┤
   agent × 3  ─┤                              ┌────────────┐
   agent × 4  ─┼──►   10 PRs   ─────────────► │    you     │ ──► merge
      ...     ─┤                              └────────────┘
   agent × 10 ─┘                                    ▲
                                                    │
                                       you still get the same few hours a day —
                                       and they're your best-attention hours
```

Someone will say: fine, just have AI do the reviewing.

I've tried that, and it does help — AI review catches low-level mistakes, flags style violations, reminds you a function never handles null. But it can't solve the most expensive part of review. **The cost of review isn't in "understanding what this code does." It's in "judging whether this code should do it this way."**

That second thing requires things the agent doesn't have: why this module was written into its current awkward shape three months ago; that this seemingly redundant check is actually papering over a bug in an upstream system; that this abstraction, if introduced now, becomes a liability in six months; that this change is technically correct but misaligned with the product direction. This information isn't in the code and isn't in the docs. It lives in your memory and your judgment — and that belongs to layer three.

So yes, outsource the **mechanical part** of review. It genuinely compresses the time per PR, and you genuinely should. But you can't compress the judgment part, and the judgment part is exactly what grows linearly with parallelism.

Worse, review bandwidth has a property execution bandwidth doesn't: **it fatigues, and the fatigue looks like continued work.**

When you're too tired to write code, you feel it — output just stops. When you're too tired to review, you don't stop — you keep reviewing, just shallower and shallower. From the first PR to the eighth, I went from reading line by line, to scanning diffs, to checking line counts, to merging on sight — and at no point in that decline did I feel like I had "stopped working." **The exhaustion of review bandwidth is silent.**

### A causal chain I walked end to end

Which brings us to the chain below. I'm drawing it out because it contains a self-accelerating loop, and that loop is the genuinely lethal part.

```
   PRs pile up
     │
     ▼
   can't read line-by-line ──► degrade to skim review (diff size, did tests pass,
                    │           does the description sound plausible)
                    ▼
              plausible-looking bad code lands in main
                    │
                    ├──► duplicate implementations (agent doesn't know the same
                    │      function exists from three months ago)
                    ├──► misaligned abstractions (each PR locally optimal,
                    │      the sum has no shape)
                    └──► silent behavior changes (edge cases quietly altered,
                    │      tests don't cover them)
                    ▼
          the next batch of agents works from this now-degraded main
                    │
                    ▼
              their output quality drops further, needing more review
                    │
                    └────► back to step one, with a bigger pile
```

The key is that final loop-back. **Your codebase is the agent's context.** A messy main makes the next batch of agents produce messier code, because they will faithfully imitate the existing style, reuse the existing (wrong) abstractions, and follow the existing (inconsistent) naming.

This is different from technical debt on a human team. On a human team, an experienced engineer sees bad code and winces, routes around it, proposes a refactor. An agent doesn't — **it treats everything in your codebase as legitimate precedent.** So technical debt stops being merely "money to repay later" and becomes "input that contaminates the next batch of output." And it's not a problem you can defer with "we'll refactor when there's time": every single day of "later," that bad code is teaching the next batch of agents how to write code.

## The only lever that works is raising first-pass correctness

**Since review bandwidth can't be expanded, the only way out is making each PR need less review. This isn't corner-cutting. It's the only real lever this layer has.**

Say you can seriously review three PRs a day. To merge six a day, you have two options: double your review capacity (impossible — argued above), or arrange for three of the six to not need serious review — their correctness guaranteed by some other mechanism, with you only confirming "the mechanism fired."

The second path is the only viable one, and what it demands is **first-pass correctness**.

Once first-pass correctness goes up, the nature of review changes. It downgrades from "read the code line by line and find what's wrong" to "look at the tests and the PR description and confirm this is indeed the thing I asked for." The cost of the former grows with code volume; the latter is nearly constant. **That downgrade is the one true unlock condition for parallel agents.**

Getting there requires three things, all of which must be done before the agent starts running.

### Front-load the rules

The vast majority of review comments are preventable. Every "use the existing X we already have in this project," every "this error handling doesn't follow our convention" you write in a review is evidence that a rule failed to get front-loaded.

So my practice is: **the moment I catch myself repeating a review comment, I stop and write it into the rules file instead of into the PR comment.** Written into a comment, it fixes one PR. Written into the rules file, it fixes every future PR.

The payoff compounds, but it's bounded by the constraint from earlier: the rules file can't grow without limit. My triage runs on three rules:

- **Anything a test can check automatically doesn't go in the rules file — it becomes a test.** Tests are the stronger constraint; they don't depend on the agent's obedience.
- **A rule that only holds inside one directory doesn't go in the root rules file.** Put it in that directory, or make it a Skill loaded on demand.
- **Only write hard constraints — "violation means the PR gets bounced."** Soft rules like "preferably this" and "ideally that" have terrible compliance rates in long contexts. Writing them down just makes you feel better while diluting the weight of the hard ones.

### Write acceptance criteria into the ticket

This is the one I've benefited from most, and the one most often skipped.

Most people hand an agent a task description like: "add a data export feature to the user settings page." Then the agent hands something back, and only at review time do you start thinking — hm, should export be sync or async? What about large datasets? What format? Do we need rate limiting?

**Thinking about these questions at review time means review is absorbing work that belonged to requirements definition** — and that's the most expensive part of review, because it forces you to fully rebuild context.

The right move is answering those questions in the ticket itself. My ticket template these days looks roughly like:

- **Goal**: one sentence on the problem being solved (not the code to be written)
- **Non-goals**: the explicitly excluded scope — this line saves more review time than "what to do"
- **Acceptance criteria**: a set of checkable declarative statements, ideally each mapping to a test
- **Relevant files**: where to make changes, and what not to touch
- **Known constraints**: the things "not visible in the code but you have to know"

Writing a ticket like this takes fifteen minutes. What it buys: **the agent's output points the right direction from the start, and at review time I just walk the acceptance criteria item by item, instead of judging from scratch whether this thing is right.**

Here's a point that took me a while to see: the act of writing acceptance criteria is itself judgment-layer work. Which means **once you've tuned the production layer to good enough, your time isn't freed — it's transferred, one layer up.** That's exactly what this series is about, and part three is devoted to that transfer.

### Let the agent run itself to green before opening a PR

Of the three, this one has the lowest technical sophistication and the highest payoff.

If your repo has an automatable verification pipeline, and your rules file explicitly requires "all tests must pass before opening a PR," the agent enters a loop on its own: change code, run tests, see red, fix, run again, until everything's green.

The value of that loop isn't "tests guarantee quality" — tests don't guarantee much quality, especially when the tests were also written by the agent. The value is this: **it transfers the discovery cost of a large class of low-level mistakes from "your attention" to "machine time."** Machine time can be parallelized, copied, with marginal cost approaching zero. Your attention cannot.

This is also where the status of "testing" in this layer gets badly misjudged. In the traditional framing, writing tests is a somewhat boring engineering practice done for maintainability and frequently cut. In the agent framing, **tests are the agent's sensory organs.** Without tests, the agent is blind — its only source of feedback is you. With tests, it has a self-correction loop that consumes none of your attention.

Which also explains a phenomenon: why some people get vastly better results from AI than others, with the gap having almost nothing to do with which model they use. The gap is in the repo. In a repo with a full test suite, clean boundaries, and fast feedback, an agent can self-correct a very long way. In a repo with no tests, five-minute runs, and no way to tell if the run even succeeded, the agent can only guess — and the burden of verifying every guess lands entirely on you.

**The real private accumulation in this layer isn't which tools you know how to use — it's how hospitable your repo is to agents.** This may be the only thing in the production layer with any asset-like character, because you built it up yourself, brick by brick, and nobody can copy it away.

## Isolation is the precondition for parallelism

**Talking about parallelism without isolation is talking about a disaster.**

The logic here is almost boring in its simplicity, but I've watched too many people trip over it — myself included.

If ten agents all work in the same working directory: they overwrite each other's file changes; one runs tests while another is mid-edit, making the results meaningless; at review time you can't tell which change belongs to which task; and when one of them wrecks something, you can't roll it back in isolation.

The correct shape is what Cyrus does: **one issue, one git worktree, one branch, one PR.**

`git worktree` has existed for many years, and the vast majority of people have never used it. It lets you check out multiple branches of the same repo into different directories simultaneously — sharing one `.git`, but with fully independent working trees. Before the agent era, its use cases were narrow: one person only ever writes one branch at a time anyway. In the agent era it became infrastructure.

```
   my-repo/                    ← you live here, on main, always usable
   .worktrees/
     ├── issue-142/            ← agent A: claude/issue-142
     ├── issue-143/            ← agent B: claude/issue-143
     ├── issue-147/            ← agent C: claude/issue-147
     └── issue-151/            ← agent D: claude/issue-151

   four agents running at once, invisible to each other
   each finishes and opens a PR; you review serially at the PR level
   any one goes wrong: rm -rf that directory, cost zero
```

This structure has three properties I care about a lot. **Failure is cheap** — when an agent turns a worktree into a mess, deleting it and starting over costs zero, which fundamentally changes your posture: you can let it try aggressive approaches, because failure doesn't spread. **Your main workspace is always usable** — you never have to "step aside" while agents work; it sounds minor but it's the actual dividing line between real and fake parallelism. **The boundary of review coincides with the boundary of the task** — one PR maps to one issue maps to one explicit set of acceptance criteria, which is what makes it possible for review to downgrade from "reading code" to "checking criteria." Mix three tasks' changes into one PR and that downgrade becomes impossible.

Now look back at Routines' "can only push to `claude/`-prefixed branches by default" and you'll see it and worktrees are two levels of the same idea: **don't try to make the agent never err — make sure that when it errs, it can't reach anything important.** That's the single engineering instinct in this layer most worth internalizing.

## Now for the ugly part

**Everything above about "how to equip this layer well" rests on one premise: that AI-generated code is usable. On functional correctness that premise mostly holds. On quality and security, the empirical data is genuinely ugly.**

I'm going to put several datasets here. Not to be a doomer — I use these tools heavily every day, and this series itself was written inside this very workflow. I'm including them because **these numbers happen to explain exactly why the earlier sections lean so hard on review, tests, and isolation.** If AI-generated code were inherently reliable, that engineering would be redundant. It's precisely because it isn't that the engineering is this layer's primary gear rather than an option.

### Security: bigger models have not made code more secure

Veracode's 2025 GenAI Code Security Report ran an experiment I think was well designed: 80 coding tasks, over a hundred LLMs, across Java, Python, C#, JavaScript.

Results: **45% of code samples failed security tests**, introducing vulnerabilities in OWASP Top 10 categories. Among XSS-related samples (CWE-80), **86% failed to defend correctly**. Java was worst, at a 72% failure rate.

But the report's most lethal conclusion isn't any percentage. It's this: **models are getting better and better at writing functionally correct code, showing no improvement at writing secure code — and this is independent of model size.**

That sentence punches straight through a very popular defense — "yes, there are issues now, but the next generation of models will fix them." The data says: these are two separate curves. Functional correctness is climbing; security is flat. They don't share an improvement mechanism, so you cannot assume the latter will ride along with the former.

My read: functional correctness has a clear feedback signal — does it run, do tests pass, do users report errors — and those signals exist abundantly in training data. Security has no such signal. A piece of code with an XSS hole is green in every functional test, looks identical to secure code, and only reveals itself under attack — a moment that almost never flows back into training data as "code + label."

**So security won't be solved automatically by model scale. It can only be solved by engineering.** And the engineering is the same old stuff: security tests in CI, dependency scanning, least privilege, code review that specifically inspects input boundaries. In the agent era these didn't become less important — they became more important, because output volume went up while the security expectation per line stayed the same.

### A concrete case

Abstract numbers lack a face, so here's a concrete one.

In March 2025, developer Leo Acevedo publicly bragged that his SaaS product EnrichLead was generated entirely by Cursor — "zero hand-written code." After the post went viral, the product was breached within roughly two days: people bypassed subscription payments, tampered with database records, and maxed out his API keys. The post-mortem list of flaws: no authentication, database directly exposed, no rate limiting, no input validation, secrets leaked in the frontend.

The most telling part comes after: he tried fixing it with Cursor, but the AI "kept breaking other parts of the code." The app went offline within a week.

The point isn't "AI-written code is insecure." The point is **the second half**. The reason he couldn't fix it wasn't that AI can't fix an individual vulnerability (none of those were hard to fix). It's that he possessed no verification mechanism to tell him "did fixing this break something else." No tests, no isolation, no rollback boundary — just eyeballing patches into a codebase he had never once understood.

It's the exact negative image of the three practices above: no rules front-loaded, no acceptance criteria in existence, no self-verifying tests. **"Zero hand-written code" wasn't the problem. "Zero verification" was.**

### Maintainability: a dataset to take with a discount

GitClear's "The Maintainability Gap" (2026 edition) analyzed 623 million real code changes between 2023 and 2026. Findings include: copy/paste code share rising from 9.4% in 2022 to **15.7%** in the first half of 2026; moved code — the marker of "healthy refactoring" — falling from 21% to **3.8%**; block-level duplication up 81% versus 2023; cross-file function calls down 35%.

In plain language: **code is growing, reuse is shrinking, refactoring is vanishing.** Agents lean toward "write a fresh copy right here" instead of "find the existing one and reuse it" — understandably, since a fresh copy is simpler and less error-prone for them, and they may not even know the existing one exists.

An obligatory disclaimer: **GitClear is a commercial company that sells code analysis tools, and its product's value proposition rests precisely on the narrative that code quality is deteriorating.** Clear conflict of interest; discount the data accordingly.

Still, I'm inclined to accept the directional claim, because it matches something I can verify myself: in my own repos, agents do repeatedly write functionally duplicate helper functions, and that only ever surfaces at review time — it's green in every automated check.

### The team level: AI amplifies teams, it doesn't fix them

The last dataset comes from the DORA 2025 report (dora.dev/dora-report-2025), with a sample of nearly 5,000 practitioners worldwide — bigger than any of the above.

The baseline: 90% AI adoption (up 14 percentage points year over year); median 2 hours a day working with AI; over 80% self-reporting productivity gains.

The core tension is here: **AI adoption correlates positively with delivery throughput, and persistently negatively with delivery stability.** More stuff ships, but change failure rates and rework go up.

DORA's qualitative conclusion is, I think, the most valuable sentence in this whole pile of data: **"AI doesn't fix teams; it amplifies them."** The report attributes the real source of value not to the tools themselves but to the surrounding engineering practices — automated testing, version control maturity, fast feedback loops.

That sentence is the strongest backing for my entire argument in the earlier section, and it puts the causality the right way around: it's not "we used AI, therefore results improved" — it's "we already had good engineering practices, therefore AI amplified them." Conversely, a project with no tests, no fast feedback, and a tangled main branch will, once wired to AI, simply rot faster.

**This also explains why "gear checklists" are inherently misleading.** They list tools, while the things that determine outcomes are everything around the tools — things absent from the list, because they can't be bought or installed, only built.

### On speed itself, a necessary addendum

The [overview](../super-individual-stack-four-layers/) already covered METR's research in detail; here I'll take only what the argument needs.

The July 2025 study (arXiv:2507.09089): 16 developers, 246 tasks, all working in mature open-source projects they knew well, randomly assigned "AI allowed" versus "AI forbidden." Result: with AI allowed, tasks took **19% longer** — while those same developers predicted a 24% speedup beforehand and still believed in a 20% speedup afterward.

METR's February 2026 follow-up has to be reported alongside it, or the number gets misused: the second round was much larger and flipped to a "speedup" — but METR itself judged the signal unreliable. Many developers declined to participate, and 30% to 50% of participants admitted **deliberately withholding tasks that AI could dramatically accelerate.** Their conclusion, roughly: they lean toward believing developers in early 2026 really were accelerated more than in early 2025, but the evidence is weak.

I include the update because without it, "19%" becomes a doomer slogan. It isn't one. **The correct reading is: this has become very hard to measure cleanly.** And on a matter that resists reliable measurement while delivering an intense subjective feeling of acceleration, you should be skeptical of every specific productivity number — including your own estimate about yourself.

## So where does this layer actually belong

The whole essay collapses into one sentence: **the goal of the production layer isn't "faster" — it's "make speed no longer your bottleneck," and then turn around immediately.**

Concretely, my current priority order:

- **Build the verification pipeline before building agent orchestration.** Parallel agents without tests are manufacturing technical debt for yourself — the compounding kind.
- **Write the rules and acceptance criteria before adding parallelism.** The ceiling on parallelism is first-pass correctness; if that doesn't move, more parallelism just stacks the PR pile higher.
- **Set up isolation before talking about autonomy.** Letting agents run while you're absent is only safe if, when they crash, you lose nothing.
- **Don't chase novelty in tool selection.** This layer's progress is a public good. Adopting a new capability three months late costs you approximately zero; spending three months tracking every update costs you three months.

And finally, the most important one: **give this layer an attention budget, and stop when it's spent.** Mine is at most two hours a week on toolchain maintenance and exploration. Past that number, I know I'm using "optimizing the tools" to dodge "deciding what to build" — which is far harder, and far more important.

## But if output doesn't flow upward, it stays disposable

Back to the overview's framework. The four layers aren't parallel — they have a direction.

If the production layer's output stops at "the product shipped," it's disposable: earn a little money, reset to zero, start the next product from scratch. **The more efficient you make this layer, the bigger that waste becomes — because you're producing disposable things faster.**

So every unit of production-layer output should leave behind three things at once: **what stays in the repo** (that improved rule, that backfilled test, that straightened-out directory structure — each one nudging the next round's first-pass correctness a little higher); **what flows up to the distribution layer** (how this thing got built, what went wrong, what your solution was — the act of building is itself material, and not writing it down is throwing it away); **and what flows further up to the reputation layer** (an open-source contribution, a tool someone else actually adopts — no direct revenue, but they set the cold-start cost of your next product).

If those three pipes aren't connected, you become the person who is "absurdly strong at layer four, but starts from zero every single time." I've seen too many of those people. I've been one. It's not a capability problem. It's an architecture problem.

## Next up

One sentence kept coming back to me while writing this: **when execution becomes cheap, the expensive thing doesn't disappear — it just moves somewhere else.**

Everything in this essay — review bandwidth, first-pass correctness, acceptance criteria, front-loaded rules — points in the same direction. Once you take these seriously, your time flows overwhelmingly into "figuring out what I want," not "making it." A good ticket takes fifteen minutes to write; the agent executes it in three. Two years ago that ratio ran the other way.

Which is the thing this series is really about: **the success of the production layer manifests as the cost of the judgment layer being exposed.**

[Part three](../super-individual-stack-judgment/) covers the judgment layer: how to guard the requirements gate, how acceptance criteria should actually be written, and — most crucially — how to externalize "judgment," a thing that used to exist only in your head, into rules an agent can read over and over. That's the only path by which this layer upgrades from "personal skill" to "reusable asset."

If you remember one thing from this essay, let it be this: **stop asking "how do I make agents run more," and start asking "how do I make each thing they produce need less of me."**
