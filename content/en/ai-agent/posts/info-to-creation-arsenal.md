---
title: 'Building an AI Knowledge Base: From Notes to Executable Workflows'
ShowRssButtonInSectionTermList: true
date: '2026-07-17T21:30:00+08:00'
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Agent
  - Context Engineering
  - Personal Growth
  - Automation
categories:
  - Development
description: >
  Build an evidence-driven AI knowledge base with executable workflows, method cards, voice rules, review gates, and feedback loops that improve content work.
tldr:
  - Internal and external are two separate systems. The internal knowledge base is an arsenal (methodologies, playbooks, battle records); external platforms are battlefields (audience-facing work). The arsenal stays private, ammunition flows out one way, feedback flows back one way.
  - Battle records (evidence) are the admission ticket. Methods without real-world data stay in the unverified zone — this is the vaccine against hoarder's disease. Imported conclusions are second-class citizens until I've used them myself.
  - Directory structure is a map for AI - a constitution (CLAUDE.md), an index (index.md), and an append-only log (log.md), plus three workflows (ingest, query, lint) that outsource the most tedious part of knowledge management — maintenance — to AI.
  - The watershed for AI-era knowledge bases is knowledge turning from documents you consult into actions that execute - a writing skill auto-assembles voice rules, platform playbook, and hook cards into every single generation.
  - Voice is not defined from scratch; it is reverse-engineered from your own best published work into observable rules. Together with deconstructed hit patterns, it forms the two lines of defense against AI slop.
maturity: seedling
columns:
  - info-to-creation
cover:
  image: /images/covers/ai-agent/2026/info-to-creation-arsenal.jpeg
  alt: "A private AI knowledge arsenal connecting evidence cards, executable workflows, publishing platforms, and feedback loops"
---

## After the Framework Stood Up, I Realized I Had No "Shared Workshop"

The five-part Info-to-Creation series got the framework standing: information gets collected and denoised, records settle into half-finished goods, knowledge gets structured into capability, creation reorganizes it for an audience. But after writing that line in [Layer 3: Knowledge](../info-to-creation-knowledge/) — "your knowledge base is the workshop you share with your AI" — something kept nagging at me.

**I didn't actually have such a workshop.**

My methodologies were scattered across four places: principles written into blog posts, fragments in note apps, project material in several Obsidian vaults, and a large amount of muscle memory that existed only as "I think this worked last time." Every time I wanted to write a serious 小红书 post or plan a new platform, I had to reconstruct from scratch how I pulled it off the previous time.

So I did one thing: I turned the knowledge layer from a concept into an entity — a private repository, codename arsenal. These field notes document its design, and the handful of things I only truly figured out while building it.

## Internal and External Are Two Systems

The first thing I got clear on was separating "internal" and "external" completely.

The external side everyone can see: the blog, 小红书, someday X and short video. They are **battlefields** — audience-facing, platform-driven, judged by whether people receive you and connect with you. That's the creation layer of the framework.

The internal side only I (and my AI) can see: a combat playbook per platform, verified title formulas, my own voice rules, the potholes I've hit. They are the **arsenal** — self-facing, judged by reusability, solving exactly one problem: make the next shot land closer. That's the knowledge layer.

```
        Internal (private repo: arsenal)
┌─────────────────────────────────────────┐
│ identity/   who I am: voice, red lines   │
│ playbooks/  one combat manual per platform│
│ methods/    hooks, structures, SOPs      │
│ swipe/      unverified zone (mess allowed)│
│ retro/      review & reflow workshop     │
└──────────────┬──────────────────────────┘
               │ ammunition flows out
               ▼
        External (platform battlefields)
   Blog / 小红书 / X / short video
               │
               └── feedback flows back ──▶ retro/
```

Once separated, several long-standing frictions simply vanished. Writing for a platform no longer carries the worry of "should I be hiding this method" — the method was never on the battlefield to begin with. Distilling a method no longer involves fussing over presentation — there is no audience inside an arsenal. **Mixing the two ruins both — this is the physical-isolation version of the series' founding claim that knowledge solves your problems while creation solves other people's.**

Here is the sanitized tree I am actually using. The names are real; private topics, accounts, and performance data are not.

```text
arsenal/
├── CLAUDE.md              # operating rules and permission boundaries
├── index.md               # short routing map, not a second knowledge base
├── log.md                 # append-only admission and retirement log
├── identity/
│   ├── voice.md
│   └── red-lines.md
├── playbooks/
│   └── xiaohongshu.md
├── methods/
│   ├── hooks/
│   └── structures/
├── swipe/                 # imported, explicitly unverified material
├── retro/
│   ├── reviews/
│   └── failures/
└── skills/
    └── write-xiaohongshu/
        └── SKILL.md
```

## Battle Records Are the Admission Ticket

The second design decision installed a gate my knowledge systems never had: **every method card carries an `evidence` field in its frontmatter recording its real-world track record. No record, no admission.**

This is the vaccine against hoarder's disease. I wrote in Layer 3 that the surest way a knowledge base degenerates is into a bookmarks folder — see a good method, save it, done. This time the gate is structural: conclusions imported from external research are tagged `maturity: imported`. Imports may sit there for reference, but they are second-class citizens — **only what I have personally used, measured, and confirmed gets promoted to proven.**

This forced a very healthy side effect: the hook library is deliberately empty. I did not port over the hundred "proven hooks" from my research, because that was someone else's proof, not mine. The first hook card in this library must come from deconstructing my own first published piece.

**Better an empty arsenal than a fake one.** An empty one pushes you toward real combat; a fake one only hands you the illusion of "I have so many methods" — and that illusion is exactly what killed the last bookmarks folder.

A method card is intentionally small. This example is sanitized from the current repository:

```yaml
---
id: hook-specific-tension
maturity: tested
platform: xiaohongshu
claim: "A concrete tension is a better opening candidate than a generic promise."
evidence:
  runs: 2
  compared_with: "my previous 10 posts on the same account"
  signals: [open_rate, completion_rate, saves]
last_reviewed: 2026-07-17
---

Use only when the body resolves the exact tension named in the opening.
Retire if two later runs fall below the account's rolling median.
```

`tested` does not mean universal. It means the card survived my stated comparison on one account. The scope travels with the conclusion.

## The Directory Is a Map: Constitution, Index, Log

The third design comes straight from a judgment in Layer 3: the directory structure you give your AI is essentially a map. This time I drew the map all the way down.

Three control files sit at the repo root. `CLAUDE.md` is the **constitution**: what each directory is responsible for, how frontmatter is written, what qualifies for admission where, and the AI's permission boundary at each layer. This use matches Anthropic's documentation for [project instructions and memory](https://code.claude.com/docs/en/memory): Claude Code can load project-level instructions from `CLAUDE.md`. `index.md` is my own **master map**, not a Claude Code primitive: my workflow tells the agent to read it first instead of crawling the whole tree. `log.md` is likewise my own **journal**: append-only, one line per admission or retirement.

On top sit three fixed workflows: **ingest** (new material enters the unverified zone; only field-tested material gets distilled and admitted), **query** (a creation task auto-assembles its context), and **lint** (monthly: cards unused for sixty days get archived, conclusions overturned by new data get rewritten in place rather than appended, orphan cards get merged or deleted).

You may recognize this as the full landing of the "elimination mechanism" from Layer 3 — but with one insight I hadn't fully absorbed back then: **routine maintenance is a good candidate for agent assistance, provided a human still owns deletion and promotion.** An agent can propose contradictions, stale cards, and index changes, but each run consumes model tokens and time. It can also miss conflicts or confidently archive useful context. My lint workflow therefore produces a reviewable diff; it does not silently rewrite the arsenal. Only after making maintenance cheap enough *and* reversible did "a knowledge base needs metabolism" turn from a nice principle into a practice I could sustain.

## Knowledge Turns from Documents into Actions

The fourth design is, I believe, the longest lever in the whole system: **the repository ships with executable skills.** Here, “skill” means a directory of instructions and supporting resources that an agent can load for a task, following the pattern described in Anthropic's [Agent Skills documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview). The surrounding routing, evidence rules, and acceptance gates are mine.

When the "write a 小红书 post" skill fires, it attempts to assemble my voice rules, the 小红书 combat manual, matching hook cards, and the corresponding topic card. It then drafts under those constraints. The handoff is explicit:

```yaml
input:
  topic: "Why an AI knowledge base needs an elimination mechanism"
  audience: "builders with a folder full of unused notes"
  evidence_refs:
    - retro/reviews/2026-07-knowledge-lint.md

required_output:
  - three title candidates with different tensions
  - one draft with evidence references attached to factual claims
  - one cover concept
  - a banned-word and unsupported-claim report

acceptance:
  - no invented first-person experience
  - no imported method presented as proven
  - every cited card exists and is within its review date
  - human approval required before publishing
```

This deserves spelling out. In a traditional knowledge base, knowledge is usually **consulted**: you must remember to look, find it, read it, then apply it — leaking at every step. A skill can make parts of knowledge **operational**: the workflow asks for the relevant material each time instead of relying on my memory alone. That is not the same as guaranteed injection. Context limits, ambiguous routing, instruction conflicts, and model changes can all cause a card to be omitted or misapplied.

In Layer 3 I said that every bit of structure you add makes your AI understand you a bit more. Now I would phrase it more carefully: **structure makes intent easier to retrieve; executability makes that intent easier to test.** The agent does not become me. It produces a candidate under constraints, and the review log tells me where those constraints failed. That testability is the part of AI-era knowledge management I am willing to bet on.

The first useful failure came from the voice layer itself. One draft loaded a punchline rule but missed its prerequisite: build the argument before earning the line. The output sounded like me sentence by sentence and unlike me as a whole. I added neither a stronger adjective nor another example. I changed the acceptance gate to require each punchline to point back to the paragraph that established it. The failure became a rule only after I could name and test it.

## Voice Is Excavated from Old Work, Not Defined from Scratch

The fifth design targets a concrete fear: AI slop.

The most important file in the arsenal is the voice spec. But I did not sit down to "define my style" — styles defined from scratch are all adjectives. "Sincere," "deep," "authentic": hand those to an AI and it can do nothing with them.

What I did was **reverse engineering**: take the published pieces I'm most satisfied with and derive observable rules of action from them. For instance: section headings must be complete judgment sentences, not noun phrases; abstract claims must be paired with firsthand cases, never invented characters; punchlines may only appear at the end of an argument — they are results, not decoration; every method must end with a bucket of cold water. Plus a banned-word list — the words that instantly announce "an AI wrote this" get named and shot.

**The voice spec and the deconstructed hit patterns are the two lines of defense against AI slop.** The former tells the AI "I never talk like this"; the latter tells it "this is how I succeeded last time." Both are drawn from things that actually happened — which is the only reason they work.

## The Flywheel's Axle: Reflow Beats Hoarding

The last design answers the content flywheel from the series finale. Flywheels are easy to draw; the hard part is finding the axle — the one concrete action that makes "feedback becomes new insight" actually happen instead of living on in a diagram.

My answer is a mandatory review card. For every significant publication, I take an early snapshot on day 3 and a slower snapshot on day 7. Those windows are not platform laws; they are checkpoints for my current publishing rhythm. If a platform distributes a post for longer, the review window moves with it.

The card records five things:

| Signal | What I compare | Why it matters |
|---|---|---|
| Impressions | the rolling median of my previous ten comparable posts | whether distribution changed |
| Open or click-through rate | the same account, format, and traffic source | whether the opening earned attention |
| Completion rate | posts in the same length band | whether the structure held attention |
| Saves or qualified replies | normalized by impressions | whether the piece was useful enough to keep or discuss |
| Downstream action | profile visits, newsletter sign-ups, or relevant conversations | whether attention connected to an actual goal |

I do not promote a method because one post is above median. One run creates a candidate card; a second comparable run may move it to `tested`. A regression sends it back for review. With that gate in place, **repeatable overperformers get deconstructed — their hook and structure become new cards with scoped evidence; duds get an honest cause of death written into that platform manual's counter-example section.**

This action outranks adding any new knowledge to the library. Hoarding makes a library bigger; only reflow makes it more accurate. A library that keeps ingesting knowledge but never reflows battle records is still a bookmarks folder — no matter how beautiful its structure.

## Cold Water: Don't Build the Whole System First

As is the custom here, the method ends with cold water. This bucket goes to myself from three days ago.

While designing this system I briefly wanted to build everything at once — every platform playbook, every structure card, a fully stocked topic pipeline. That is precisely the trap the series finale warned about: turning "building a cool system" into the goal, fondling the hammer endlessly, driving zero nails.

The actual cold start needs four files: a constitution, a voice spec excavated from old work, a manual for the one platform you most want to break through, and one writing skill. **Then go publish something real.** Let every other directory grow out of actual publishing and actual reviews. A system is a crop, not a building.

## The Test Remains the Same One

The thing is freshly built, and its current state is: structure complete, magazine mostly empty. By my own rules it doesn't yet deserve the name "knowledge base" — right now it is only a promise.

Whether it's any good will not be judged by how well this essay reads, but by the next review cycle: whether the hook library has grown cards with scoped battle records, whether the counter-example sections hold honest corpses, whether the workflow catches unsupported claims, and whether comparable content outcomes have moved.

Information alone is cheap, and methodology without a boundary is not much better. What becomes valuable is a method with scoped evidence, a workflow that can test it, and a review process that can retire it. The arsenal is built. It still needs a quartermaster. Time to open fire.

---

*These are field notes appended to the Info-to-Creation series. Return to [the framework](../info-to-creation-the-framework/) for the four-layer overview, or revisit [Layer 3: Knowledge](../info-to-creation-knowledge/) for the theory this design departs from.*
