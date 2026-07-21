---
title: '121 Tips from the Creator of Claude Code: I Compressed Them Into 10 Changes You Can Ship Tonight'
ShowRssButtonInSectionTermList: true
date: '2026-07-20T23:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['Claude Code', 'Boris Cherny', 'CLAUDE.md', 'git worktree', 'auto mode', 'plan mode', 'subagent', 'hooks', 'skill', 'slash command', '/goal', '/loop', '/checkup', 'dynamic workflow', 'context minimalism', 'verification', 'verification loop', 'AI coding', 'Agent Engineering']
tags:
  - AI
  - Agent
  - LLM
  - Automation
  - Harness Engineering
  - Productivity
  - Testing
description: >
  howborisusesclaudecode.com has collected 121 frontline tips from Claude Code creator Boris Cherny and his team, spanning January to July 2026. I read all 21 volumes, and found that its real value is not the list of tricks but an evolutionary arc that got overturned and rebuilt three times in six months. This piece compresses it into 10 configurations you can paste straight into your .claude directory, each followed by a copy-paste instruction block — hand it to Claude Code and it makes the change itself.
tldr:
  - 'Over these six months Boris personally overturned three of his own recommendations: plan mode gave way to auto mode, context engineering gave way to context minimalism, and the trigger phrase for workflows changed from workflow to use a workflow. Read this list with the dates in view, not as doctrine.'
  - Exactly one tip survived from the first volume to the last without revision - give Claude a loop it can check its own work with. Boris says it is worth 2 to 3 times the quality, Thariq says the team's best engineers are all working on verification, and the most praised capability of Fable 5 is also self-verification.
  - The most counterintuitive tip is that auto mode is safer than reading permission prompts one by one - "when you approve 99% of them, your eyes glaze over". Tiered approval makes you stop exactly once, at the place that actually matters.
  - 'Write it down, don''t say it again is the whole secret to the long game - a correction in chat fixes this turn only; writing it into CLAUDE.md or a skill fixes every future turn. Boris''s own words: if you can do that, Claude can just keep going.'
  - But what you write down goes stale. Boris ran /checkup on himself and found 38 skills that had never once been invoked across 2,345 sessions, and a CLAUDE.md eating 10,000 tokens per session. Every addition needs a matching subtraction.
  - The closing line of the final volume is the sharpest - a PR that gets sent back is a failure of automation. That knowledge should have lived in the infrastructure, not in the reviewer's head.
maturity: budding
cover:
  image: /images/covers/ai-agent/2026/claude-code-boris-121-tips-playbook.jpeg
  alt: "121 Tips from the Creator of Claude Code: I Compressed Them Into 10 Changes You Can Ship Tonight"
---

## A List Its Own Author Keeps Overturning

There is a site called [howborisusesclaudecode.com](https://howborisusesclaudecode.com/) that collects everything Claude Code creator Boris Cherny and the Anthropic team have said publicly about how they use the tool. As of today that's **121 tips across 21 volumes**, running from the first tweet on January 2, 2026 to the most recent one on July 15.

I spent an evening reading all 21 volumes. I went in expecting a list of tricks. I came out with something else — **the information is in the version diffs**.

The same person, on the same topic, changed his position three times in six months:

- **January**: "most of my sessions start in plan mode." **June**: "I don't use plan mode anymore. The new models don't need that planning step."
- **January**: pile rules into CLAUDE.md aggressively. **July**: runs a checkup on himself and finds CLAUDE.md eating 10,000 tokens per session, more than half of which should be deleted.
- **May 28**: saying `workflow` in your prompt triggers a dynamic workflow. **June 9**: "say 'use a workflow'. Just 'workflow' triggers too many false positives."

This self-overturning isn't a flaw — it's the most valuable thing about the list. What it records isn't a set of correct answers but **the trajectory of a methodology being pushed forward by model capability over six months**. Copy from it with the dates in view; don't treat it as doctrine.

Source disclosure up front: the site is fan-made (by [@carolinacherry](https://github.com/carolinacherry)), not official Anthropic; and it mixes in a fair number of research previews (dynamic workflows, agent view, Routines, Dreaming) that could change at any time. I'll flag the preview features as they come up.

As for why this homework is worth copying — the site's own Claudeonomics page counts commits on public GitHub carrying AI co-author trailers: Claude Code logged **3.64 million commits** in its latest week, and 72.5 million cumulatively. Mind the framing, though: that 99.7% is a share **among the six agents the site tracks**, not a share of all of GitHub, and the site itself puts that caveat in its methodology notes. But even after every discount, the order of magnitude means one thing: **these practices have already been run against an enormous sample.**

---

## Three Turns in Six Months, and the One Thing That Never Changed

Before the ten changes, let me pull out the through-line. This is what I think is most worth keeping after reading all 121.

### Turn One: From "Plan First" to "Just Go"

In Volume 1, Boris lists plan mode as a core habit: shift+tab twice to enter planning, iterate until the plan is solid, then switch to auto-accept. Volume 2 doubles down: "put all your energy into the plan so Claude gets it right the first time," and some people spin up a second Claude to review the plan as a staff engineer.

By the one-year retrospective in June, his words were:

> "It used to be plan mode. I don't use it anymore. I use auto mode instead. The new models don't really need that planning step — it was really important for Opus 4 through 4.5, but from 4.6 on, and especially 4.7, you don't need it."

**The criterion isn't "which feature is better," it's "which generation of model are you on."** Older models needed an explicit plan as a guardrail against drift; from 4.6 onward the model plans implicitly on its own, and that step becomes pure overhead — an intermediate artifact you have to review before work can start.

Some people keep plan mode for the archivable written artifact, and that's perfectly valid. But if your reason for keeping it is "I'm afraid it'll go off the rails," you can probably let go.

### Turn Two: From "Feed It Everything" to "Say Less"

This one runs deeper. The one-year retrospective has a whole section titled "from context engineering to context minimalism":

> Sonnet 3.5 was the era of **prompt engineering**. Opus 4 was the era of **context engineering**. Today's models need neither.
> "You give it the smallest system prompt, the smallest set of tools, and let the model figure it out. All you need to give it is a path to pull its own context." — Boris

Cat Wu added something sharper:

> "I'm a context minimalist. Tell the model only what it needs to know and let it figure out the rest. When you give it too much context you're actually micromanaging it — sometimes the model knows a better path to the same outcome."

I've written before about [why context is not prompt](../context-engineering-the-new-foundation/), and why context engineering became the new foundation. This turn doesn't overturn that — it puts a ceiling on it: **context engineering solves "the model can't reach what it needs"; the moment it can reach things itself, everything you keep stuffing in becomes noise.**

Note that "minimal" is not the same as "vague." Give the goal, not the micro-steps — those are two different things.

### Turn Three: From "Use One Agent Well" to "Run a Fleet"

This one is gradual, and the staircase is clear:

| Date | Capability | What you hand over |
|---|---|---|
| January | 5 terminal tabs + 5 git checkouts | manually switching windows |
| February | `claude --worktree` native isolation | environment conflicts |
| March | `/loop`, `/schedule` | the trigger |
| May | `claude agents` control plane, `/goal` | the stopping condition |
| May–June | dynamic workflows, nested subagents | orchestration itself |
| July | Routines, event-driven | the prompt itself |

Six months, from "you manually switch between five terminals" to "event-triggered, cloud-executed, nobody present."

### The One Thing Never Overturned: Verification

Volume 1, tip 13, which Boris marked as "the single most important one":

> "Probably the most important thing for getting good results out of Claude Code is — **give Claude a way to verify its own work**. If Claude has that feedback loop, the quality of the end result goes up by 2 to 3 times."

Six months later, at a May workshop, Thariq said: "given how good agents already are at writing code, verification is where you should invest. **The most talented engineers on the Claude Code team are all working on verification.**"

Six months after that, Fable 5 shipped, and the first thing Boris praised was still the same thing:

> "It's the first model I've used that is this methodical, this precise — it takes measurements, adds logging, and then **verifies it actually fixed the thing before declaring victory**. Nothing in Claude Code's prompt tells it to do this. It's just part of its personality."

One piece of advice, validated three times over six months by successive feature releases, never once revised. **If you copy only one thing from this article, copy change #2.**

---

Below are the ten changes. Each has the same structure: why, what to copy, and a final code block — **that one is an instruction you can paste directly into Claude Code, and it will make the change for you**.

---

## Change 1｜Turn CLAUDE.md from a Manual Into an Error Log

Most people write CLAUDE.md as a project description: what the stack is, what the directory structure looks like, what the project does. Claude learns all of that by reading the code once. Writing it down is waste.

Boris's team's CLAUDE.md is a different kind of thing. Volume 1, tip 4:

> "Any time we see Claude do something wrong, we add it to CLAUDE.md so Claude knows not to do that next time."

By the one-year retrospective in June, this had been promoted to the most important thing on his list:

> "Every time Claude makes a mistake, I don't ask it to do it differently. I have it **write it into CLAUDE.md, or turn it into a skill**. If you can do that, Claude can just keep going."

The difference: **a correction in chat is a patch that fixes this turn; writing it into a file is a fix that repairs every future turn.** The former's error rate resets each session; the latter's declines monotonically.

Their actual CLAUDE.md looks like this — note that it's almost entirely **commands** and **prohibitions**, with not a single line introducing the project:

```markdown
# Development Workflow

**Always use `bun`, not `npm`.**

# 1. Make changes
# 2. Typecheck (fast)
bun run typecheck
# 3. Run tests
bun run test -- -t "test name"     # Single suite
bun run test:file -- "glob"        # Specific files
# 4. Lint before committing
bun run lint:file -- "file1.ts"    # Specific files
bun run lint                       # All files
# 5. Before creating PR
bun run lint:claude && bun run test
```

The prohibitions come from code review. They use a GitHub Action (`/install-github-action`) and just @-mention the bot on the PR to sink what they learned that round back into the file:

```text
nit: use a string literal, not ts enum
@claude add to CLAUDE.md to never use enums, always prefer literal unions
```

Claude then edits CLAUDE.md and commits it itself: *"Prefer `type` over `interface`; never use `enum` (use string literal unions instead)"*. Boris calls this their version of **Compounding Engineering**.

**But addition has to come with subtraction.** On July 8 he ran `/checkup` on his own setup, and the result was that CLAUDE.md was loading roughly 10,000 tokens per session. So the right structure is three parts: a command list, a prohibition list, and everything else lazy-loaded.

```text
Read through my CLAUDE.md and restructure it into three sections:

(1) Command list — the exact typecheck / test / lint / build commands, annotated with when to use which
(2) Prohibition list — one-line "don't do this" entries, each with a one-sentence why
(3) Everything else long gets extracted to .claude/docs/*.md, leaving only a one-line pointer in CLAUDE.md

When you're done, tell me how many tokens it takes up now, and which entries you deleted because they never actually constrained anything.
```

---

## Change 2｜Give Claude a Loop It Can Sign Off On Itself

This is the only principle on the whole site that survived from beginning to end unrevised, so it's worth a few extra lines.

Boris's analogy is a good one: **you ask someone to build a website but won't let them open a browser — is the result going to look good?** Almost certainly not. But give them a browser and they'll keep tweaking until it looks right. Models are the same — it's not that it doesn't want to get it right, it's that you haven't given it a channel to *see the result*.

Verification splits by domain. Copy this table directly:

| Domain | What to give it |
|---|---|
| Backend / services | Make sure it knows **how to start your service** and fire real requests at it |
| Frontend | The Chrome extension (Boris: "more reliable than the comparable MCPs," and both "more capable and more token-efficient" than Playwright) |
| Mobile | iOS / Android simulator MCP |
| Desktop | computer use |
| CLI / scripts | Just run it in bash — nothing is more accurate |

Boris now folds this whole thing into a single skill called `/go`, and says "a lot of my prompts look like: 'Claude do this do that /go'". `/go` does three things: end-to-end self-test → run `/simplify` → open the PR.

On the question of "should you write test scripts or let Claude test live," his answer is **both**: one-off checks, let Claude drive live; anything every future PR has to run, have it write a real test.

Volume 19 gives a skill prompt you can adapt directly. This is the substance of it:

```markdown
---
name: verify-change
description: Verify that a change actually works. Run this before any moment where you claim to be "done".
---

Never declare a UI change complete on the strength of "the edit succeeded" alone.

1. Start the dev server
2. Open the affected page
3. Actually interact with the path this change touches
4. Confirm zero new console errors
5. Run a performance trace

If any step fails: fix it, then **rerun from step 1**.
Print evidence for every step — a success that doesn't appear in the output doesn't count.
```

That last line is mine, but it has grounding. `/goal`'s evaluator reads only the transcript and calls no tools, a constraint I unpacked in [Write Your Prompt as a Loop](../prompt-loop-engineering-practice/).

```text
Write me a verification skill in .claude/skills/verify-change/SKILL.md.

First determine which domain the change belongs to (backend / frontend / CLI / docs), then run the corresponding end-to-end check:
- Backend: start the service, fire real requests, assert on status codes and response bodies
- Frontend: start the dev server, open the page, interact with it, confirm zero new console errors
- CLI: actually execute the command, check the exit code and output

If any step fails, fix it and rerun from step one. Declaring completion on the strength of "the edit succeeded" is forbidden.
Every step must print its evidence.
```

---

## Change 3｜Replace "Approve Every Time" with Tiered Approval

Most people swing between two extremes: approve everything one prompt at a time, or just go `--dangerously-skip-permissions` and hope. The middle ground is actually quite wide.

**Tier one: pre-authorize safe commands.** Boris says explicitly that he does *not* use `--dangerously-skip-permissions`; instead he uses `/permissions` to pre-approve common safe commands, configured in `.claude/settings.json` so it travels with git. Full wildcard support:

```json
{
  "permissions": {
    "allow": [
      "Bash(bun run typecheck:*)",
      "Bash(bun run test:*)",
      "Bash(bun run lint:*)",
      "Bash(gh pr diff:*)",
      "Bash(gh pr list:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Edit(docs/**)"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

**Tier two: `/fewer-permission-prompts`.** This skill scans your session history, finds the commands that are safe but keep prompting, and hands you a suggested list. No need to remember them yourself.

**Tier three: the sandbox.** `/sandbox` turns on an open-source sandbox runtime that does file and network isolation on your own machine. Security goes up, and the prompts actually go down.

**Tier four: auto mode.** This is the most counterintuitive one. It routes each action to a classifier that judges its safety, instead of asking you. Boris's argument:

> "When you're approving 99% of requests, your eyes glaze over. **Auto mode is safer than reading permission prompts one by one**, because it means you only have to pay attention to the one thing that matters most."

How it was hardened: the team collected **thousands of full agent session transcripts** plus their corresponding permission requests, had auto mode classify each one safe or unsafe, then brought in a red team to do prompt injection and attacks; **those attacks became evals**, and they tuned until all of them were blocked.

Whether that's worth trusting is your call. But its significance goes beyond safety itself — **Boris says it's precisely because he trusts it that he can spin up a second agent the moment the first one is running. Trust is the precondition for parallelism.**

```text
Count which commands interrupted me most often with permission prompts in my recent sessions.

Take the ones that are definitely safe (read-only, build, test, format, read-only git operations) and write them into .claude/settings.json under permissions.allow using wildcards;
put the dangerous ones (force push, rm -rf, anything that writes directly to production) into deny.

Show me the diff when you're done and justify each allow entry one by one. Anything you're unsure about, don't add — list it separately and ask me.
```

---

## Change 4｜Worktrees: The Shortest Path from One of You to Five

Volume 1, tip 1 is parallelism: Boris runs 5 Claude Codes at once in the terminal against 5 separate checkouts, tabs numbered 1–5, with iTerm2 notifications so he knows which one is waiting for input. In Volume 2 the team votes, and this is **the single biggest productivity unlock**.

On February 20 this got built into the product, so you no longer have to manage checkouts by hand:

```bash
# Start an isolated worktree session
claude --worktree my-feature

# Drop it into its own tmux while you're at it
claude --worktree my-feature --tmux

# Shorthand
claude -w
```

Subagents can use isolation too, which is especially useful for bulk migrations:

```markdown
# .claude/agents/worktree-worker.md
---
name: worktree-worker
model: haiku
isolation: worktree
---
```

Or just say it out loud:

```text
Migrate all synchronous IO to async. Work in batches, spin up 10 parallel agents with worktree isolation.
Each agent must test its own change end to end, then open its own PR.
```

**Mercurial / Perforce / SVN users don't have to envy this** — just define worktree hooks:

```json
{
  "hooks": {
    "WorktreeCreate": [
      { "command": "jj workspace add \"$(cat /dev/stdin | jq -r '.name')\"" }
    ],
    "WorktreeRemove": [
      { "command": "jj workspace forget \"$(cat /dev/stdin | jq -r '.worktree_path')\"" }
    ]
  }
}
```

Past a certain amount of parallelism you start losing track of which window is doing what. `claude agents`, shipped May 11, is the answer to that — Thariq describes it as "like tmux for Claude Code," and Boris calls it **the best way to go from one agent to many**. Sessions are grouped by state into three buckets: needs your input, still working, done.

Several of the small companion tools are worth turning on: `--name` to name a session at launch, auto-naming after plan mode, `/color` to color-code sessions, `/rename` to rename at any time. Dickson Tsai's reminder is very practical: **once you have a lot of sessions, renaming becomes a hard requirement**, and you can automate it with a `UserPromptSubmit` hook.

```text
Set this repo up so I can run 4 Claudes at once:

1. Give me a shell function that opens a new worktree and starts a session inside it in one command (with --name)
2. An agent template under .claude/agents/ using isolation: worktree
3. Check whether .gitignore will let worktree directories leak into version control

While you're at it, tell me which tasks in this project are suitable for parallel work and which have to stay serial (shared migrations, for instance).
```

---

## Change 5｜Context Management: Rewind, Don't Correct

The four tips in this section come from Thariq, and they're all habits you can change immediately.

**One: use `/rewind`, not "that didn't work, try a different approach."**

Thariq says this is the single signal that tells him how good someone is at context management. Do the arithmetic and it's obvious:

- **Correcting**: context = files read + the failed attempt + your correction + the final fix
- **Rewinding**: context = files read + one smarter prompt + the final fix

The failed attempt stays in the window forever, polluting every subsequent turn. The command is `/rewind`, or double-tap Esc in the terminal.

Advanced move: before rewinding, say **"summarize from here"** and have Claude write what it learned in that stretch into a handoff note — **a letter from the next Claude to its past self**.

**Two: `/compact` and `/clear` are not the same thing.**

- `/compact` is a **lossy model summary**: Claude decides what matters. Cheap, preserves momentum, blurs details. You can steer it with a hint: `/compact focus on the auth refactor, drop the test debugging`
- `/clear` is **a brief you write by hand**: you write down "we're refactoring the auth middleware, the constraint is X, files A and B are involved, we've already ruled out approach Y," then start clean. More work, but the context is the one you chose

The criterion: **genuinely switching tasks → `/clear` and a fresh session; related task that still needs some context → `/compact` with a hint.**

**Three: proactively lower the auto-compact threshold.**

Context rot — model performance degrading as context grows — starts somewhere around **300,000 to 400,000 tokens** on million-token models. Thariq's recommended compromise:

```bash
CLAUDE_CODE_AUTO_COMPACT_WINDOW=400000 claude
```

The logic: the context window is a hard cutoff, and as you approach it you're **forced** to compact — at which point the model is already deep in the rot zone. Compacting early means compacting while the model is still lucid.

**Four: give full context on the first turn.** Cat Wu's three-part template:

```text
Goal: add rate limiting to /api/login

Constraints:
- Don't touch the database schema
- Keep the existing auth flow unchanged
- Use Redis (already configured)

Acceptance criteria:
- 5 requests per IP per minute, return 429 over the limit
- All existing tests green
- Add one test case covering the rate-limiting behavior
```

If you open with just "add rate limiting," it'll make a pile of assumptions, and **every correction costs you context**.

```text
Run a context checkup for me: what in this session is now dead weight — failed attempts, files read but never used, duplicated tool output?

Give me two things:
1. A suggested /rewind point, with an explanation of why that point
2. A paste-ready handoff brief so a clean new session can pick up without re-reading these files, covering: the current goal, the confirmed constraints, the approaches already ruled out and why, and the next action
```

---

## Change 6｜Stop Micromanaging, Start Writing Delegation Briefs

One line from Cat Wu says the whole thing:

> "Treat it like an engineer you delegate to, not a pair-programming partner you guide line by line."

The old workflow: describe a step → look at the output → correct → describe the next step. Extremely high interrupt frequency, and you're always in the loop. The new workflow: write a clear brief → launch → wait for it to finish, or for it to ask a real question.

The companion diagnostic is genuinely useful: **when Claude asks too many clarifying questions or goes off track, that usually means your brief was incomplete, not that the model needs more steering.**

I wrote the single-turn version of this principle in [Give AI Tasks, Not Directions](../give-ai-tasks-not-directions/). Volume 18 gives it a more structured frame — Thariq moves the Rumsfeld matrix onto prompting:

| | What it is | How to handle it |
|---|---|---|
| **Known knowns** | What you write into the prompt | Just write it clearly |
| **Known unknowns** | What you know you don't know | Have Claude interview you |
| **Unknown knowns** | "I'll know it when I see it, but I can't write it down" | Have it prototype and let you pick |
| **Unknown unknowns** | The pits you never even considered | Have it do a blindspot pass |

His four verbatim prompts are directly copyable:

**Blindspot pass** — his literal term is "blindspot pass":

```text
I want to add a new auth provider to this project, but I know nothing about this codebase's auth module.
Could you do a blindspot pass to help me find the relevant unknown unknowns, so I can prompt you better?
```

**Prototyping** — for "I'll know it when I see it" requirements, like visual design:

```text
I want to build a dashboard for this data, but I have no design sense and don't know what's possible.
Make me an HTML page with 4 wildly different design directions and let me pick.
```

**Interviewing** — Thariq called this the "magic words" of prompting at the workshop:

```text
Ask me one question at a time to clear up the ambiguities, prioritizing the questions where my answer would change the architecture.
```

A vague task will get you roughly **30 to 40 questions across several rounds**. In his live demo he deliberately gave an extremely fuzzy prompt — "build me a bill-splitting app" — and Claude immediately fired back: who are the users? Roommates or travel groups? Multi-currency? When does money get collected?

**Implementation plans** — put the parts you're most likely to change first:

```text
Write an implementation plan in HTML, but put the decisions I'm most likely to want to change at the very top:
data model changes, new type interfaces, and anything user-visible.
Bury the mechanical refactoring at the end — I trust you on that part.
```

Incidentally, Thariq says he's **stopped writing markdown entirely**: "if I'm having Claude edit it, there are better-looking formats. HTML. It can have diagrams, code paths, mockups. And I'm more likely to actually read it." Markdown became the default because humans needed to edit it anywhere — once the editor isn't you, that optimization stops paying.

```text
Before I start work, help me find the unknowns.

What I want to do: <one-line description>
How well I understand this area: <honest assessment>

Do three things in order:
1. Do a blindspot pass and list the things I probably don't realize I don't know
2. Ask me one question at a time, prioritizing the ones where my answer would change the architecture
3. When you're done asking, organize it into Goal / Constraints / Acceptance criteria, and wait for my confirmation before starting
```

---

## Change 7｜Anything You Do Twice a Day Should Be a Skill

Volume 2, tip 4 has a very blunt criterion: **anything you do more than once a day should become a skill or a command.**

Concrete examples from the team:

- A `/techdebt` command, run at the end of every session, that finds and kills duplicated code
- A command that syncs 7 days of Slack, GDrive, Asana, and GitHub into one piece of context
- An analytics-engineer-style agent that writes dbt models, reviews code, and tests changes in dev

Thariq later went through the patterns across hundreds of internal Anthropic skills and sorted them into **9 categories**: internal library/API reference, product validation, data analysis, business automation, scaffolding templates, code quality and review, CI/CD deployment, incident runbooks, and infrastructure operations. **A good skill usually lands cleanly in one of them** — if yours straddles three, it probably wants to be split.

Of his 9 rules for writing them, here are the four most counterintuitive:

1. **Skip the obvious** — Claude already has default behavior; write only what **pushes it off the default path**
2. **Keep a Gotchas section** — the highest signal-to-noise part of the file; add a line every time Claude hits a pit
3. **Progressive disclosure** — a skill is a **folder, not a file**. `SKILL.md` is the hub, the spoke files do the work
4. **Don't railroad it** — give information, not step-by-step scripts, and leave room for it to adapt to what it finds

And one more: **the description is written for the model, not for humans.** Put the exact phrasing that should trigger it right in there.

Plus an attitude from Thariq that matters:

> "I really dislike `npm install skills-dash-x` and here's a 'CEO agent'. **If you've never read that skill, I don't trust it.** The good skills are the ones written for your own workflow."

I fully agree. I took apart a plugin that dared to delete my files in [How to Design a Skill Worth Having](../designing-valuable-agent-skills/), and the conclusion was the same: **an unread skill is an unread `sudo` script.**

```text
Go through my recent session transcripts and shell history and find the repetitive actions I do more than once a day.
Pick the 3 most worth solidifying and write each as .claude/skills/<name>/SKILL.md.

Requirements:
- Write the description for the model; put the exact phrasing that should trigger it in there
- The body should only cover what Claude won't get right by default; skip what it already does
- Keep a separate Gotchas section
- Anything longer than a screen goes into a sibling file in the same directory; SKILL.md keeps only the index
- Give information, not step-by-step scripts; leave room to adapt

When you're done, read me each skill's trigger conditions so I can judge whether it'll misfire.
```

---

## Change 8｜Upgrade from "a Conversation" to "a Loop"

Volume 19 sorts every loop in Claude Code into four types. I think this table is the densest thing on the whole site:

| Loop type | What you hand over | When to use it | What to use |
|---|---|---|---|
| **Turn-based** | the check | You're exploring or making decisions | Custom verification skill |
| **Goal-based** | the stopping condition | You know what "done" looks like | `/goal` |
| **Scheduled** | the trigger | Work happens on a clock, outside your project | `/loop`, `/schedule` |
| **Event-based** | the prompt itself | Repeated, well-defined workflows | All of the above + dynamic workflows |

Look at that column, **"what you hand over"** — that's the soul of the table. Top to bottom, you hand over the check, then the stopping condition, then the trigger, and finally even the prompt. **Automation isn't a slider. It's four steps.**

The concrete primitives:

```bash
# Goal-based: set a completion condition and forbid stopping short of it
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries

# Scheduled (local, up to 3 days, stops when you shut down)
/loop 5m check my PR, address review comments, and fix failing CI

# Scheduled (cloud, keeps running with the laptop closed)
/schedule every hour: check the project-feedback channel for bug reports,
triage each one, open a PR with a fix, and have a second agent review it
```

Loops Boris keeps running long-term:

```bash
/loop 5m /babysit           # Auto-handle code review, auto-rebase, watch PRs
/loop 30m /slack-feedback   # Turn Slack feedback into PRs automatically
/loop /post-merge-sweeper   # Pick up review comments that slipped through
/loop 1h /pr-pruner         # Close stale and redundant PRs
```

The mechanism behind `/goal`: every time Claude wants to stop, an evaluator model takes your condition and checks it against the transcript, and sends it back to keep working if it doesn't measure up. ClaudeDevs calls this **"the Ralph loop built into Claude Code."** **Use deterministic criteria** — tests passing, a score threshold — not "looks fine to me."

There's one non-coding use I really like: point `/goal` at **your own understanding** instead of a test suite.

```text
/goal the session should not end until you've verified
      that the human has demonstrated they understood
      everything on your list.
```

Same mechanism, but the exit condition changes from "the build is green" to "you actually get it." Claude will maintain a list of what you should master, make you restate it, fill your gaps, and then quiz you with multiple choice.

I've written this section tight, because I just unpacked loop engineering in full in [Write Your Prompt as a Loop](../prompt-loop-engineering-practice/) — the three-tier verifier ladder, permission gradients, state layering, all of that is covered in more detail there.

```text
Turn this repetitive chore of mine into a loop: <description>

First tell me which type it is — turn-based / goal-based / scheduled / event-based —
based on whether what I can hand over is "the check", "the stopping condition", "the trigger", or "the prompt".

Then give me:
- The complete /goal or /loop command
- The exit condition (must be a deterministic criterion; "looks fine" is not accepted)
- Runaway backstops: max turns, token ceiling, permission allowlist
- The list of evidence that must be printed to the transcript on every turn
```

---

## Change 9｜Big Jobs: Say "use a workflow," and Auto Mode Is Not Optional

This is a research preview from May 28 that can run **hundreds of parallel subagents in a single session**. The trigger is unusual — **no new command, no new flag; you just say "use a workflow" in your prompt.**

> "Say 'use a workflow'. Just 'workflow' triggers too many false positives." — Boris, correcting himself on June 9

**It solves three specific failure modes**, and the names for them are extremely well chosen:

- **Agentic laziness**: declaring a complex multi-part task done halfway through — a security review lists 50 items, it handles 20 and says it's finished
- **Self-preferential bias**: when asked to verify its own output against a standard, it tends to favor itself. **The problem is that the grader and the writer are the same context**
- **Goal drift**: gradually diverging from the original goal over many turns, **worst after compaction** — every summary is lossy, and constraints like "don't do X" quietly fall out

The workflow's answer is to give **each Claude its own context window and one isolated, small goal**: laziness loses to a deterministic loop that won't exit short of the bar; bias loses to "the verifier is never the author"; drift loses to "each agent holds exactly one small goal that can't get summarized away."

The shape is an **orchestrator**, not "agents deliberating with each other": a top-level Claude fans out N tasks → within each task, **an implementer writes → forks to two verifiers → merges into one fixer** → loops until the verifiers pass → returns only when all are done.

Claude will compose six patterns: classification routing, fan-out-and-aggregate, **adversarial verification**, generate-and-filter, **tournaments** (have N agents each solve the same problem a different way, then judge pairwise — comparative judgment is more reliable than absolute scoring), and **run until no new findings** (rather than a fixed number of rounds).

**When to use it**: migrations, refactors, performance optimization, bulk bug fixing, and "inventory and classify" scans (A/B experiment flags, feature toggles, dependencies, dead code, stale endpoints). Cat Wu's real example: she used it to inventory several hundred A/B experiment flags and find the ones already at 0% or 100% that were ready to retire — **what would have been a serial investigation finished in under 10 minutes running in parallel.**

**When not to use it**, and Thariq is honest about this:

> "For a normal coding task, ask yourself first: does this really need more compute? **Most traditional coding tasks don't need a five-person review panel.**"

**Two boundaries you have to remember:**

First, **auto mode is mandatory**. Hundreds of parallel subagents, and one permission prompt freezes the entire pipeline. Second, **give it a token budget**, right in the prompt:

```text
use a workflow to rank these 80 resumes for the backend role
and double-check the top ten. use 50k tokens
```

If it overruns, `/usage` shows which skill / MCP / plugin is eating tokens, and `/workflows` shows per-agent consumption and lets you kill them individually.

One more detail worth knowing: **workflows can be saved and shared.** Press `s` in the workflow menu to save; the file goes to `~/.claude/workflows`, or you can drop it into a skill directory to distribute it. When you distribute one, tell Claude to treat it as a **template rather than a script**, so it adapts to the specifics instead of replaying it verbatim.

```text
use a workflow to <your big task>

Requirements:
- The implementer and verifier must be different agents; the verifier may not edit code
- Each subtask runs in its own worktree
- Do a trial run on 3 samples first and show me the results; wait for my confirmation before going full scale
- Keep the whole thing under 50k tokens
- When it's done, save the workflow and tell me what other scenarios it's suitable for reusing on
```

---

## Change 10｜Run Regular Checkups, and Write the Fixes Into Infrastructure

The first nine changes are all addition. This one is subtraction, and it's the mandatory kind.

On July 8 Boris shipped `/checkup` — one command that runs a health check on your whole Claude Code setup. What it found on his own machine is fairly alarming:

- The `claude` command **was broken** — some test run had overwritten its launcher
- **38 project skills that had never once been invoked across 2,345 sessions**
- CLAUDE.md loading **roughly 10,000 tokens** per session
- After cleanup, about **5,500 tokens of context saved per session** — a tax waived on every turn from then on

`/checkup` covers seven things: cleaning up unused skills / MCPs / plugins, de-duplicating local CLAUDE.md against the checked-in version, disabling hooks that slow down every turn, updating versions, turning on auto mode by default, pre-authorizing read-only commands that keep getting denied, and so on.

Two design decisions make it safe to run on a real project: **it produces a plan and waits for your call**, and **everything is reversible** — settings changes are toggles you can flip back, and CLAUDE.md edits stay in your working tree so you can `git diff` before deciding whether to commit. Four options: clean everything, let me pick, report only, or let's talk first.

The reasoning behind the feature matters more than the feature: **a setup accumulates silent waste, and you won't notice until something measures it.**

And the final volume (July 15) closes the whole thing with what I think is the sharpest line on the site:

> **A PR that gets sent back is a failure of automation.**

Boris's full argument: if you open a PR against an unfamiliar iOS codebase and the reviewer sends it back because you didn't use the framework correctly; or a designer's feature gets sent back for not matching the architectural pattern — **those are all failures of automation. That knowledge should have lived in the infrastructure, not in the reviewer's head.**

And "knowledge that can be encoded into infrastructure" has expanded in the agent era. It used to be just lint rules, types, and tests; now **almost all domain knowledge** can be encoded — code comments, skills, CLAUDE.md, REVIEW.md, docs, memory — so that an agent (or a new hire) **can work effectively with zero additional context**.

That's also why automation matters more in the agent era: **the returns are no longer linear.**

> More automation = output per unit time × your number of agents

```text
Run a checkup on my Claude Code setup:

1. List the skills / MCPs / plugins I've installed but never actually invoked
2. Count how many tokens CLAUDE.md loads per session and point out what should be lazy-loaded
3. Find the hooks that slow down every turn
4. Look at the reasons my code reviews got sent back recently, and identify which of them should have been written into CLAUDE.md or REVIEW.md

Output four lists: recommend deleting / recommend lazy-loading / recommend keeping / recommend adding as a rule.
Don't touch anything yet — wait for my confirmation.
```

---

## One Bonus Lesson: "Sounds Right" and "Is Right" Are Two Prompt Paragraphs Apart

The same site has an experiment log worth calling out separately, because it's the other side of the same coin as change #2.

The author took Anthropic's Dreaming research preview and ran it over Boris's 87 tips — having 20 Claudes each apply one tip, then a single Claude read all 20 sessions and write a handbook.

**The first version's output, checked sentence by sentence, was fabricated throughout.** Boris's roughly 80-word original on plan mode had been expanded to roughly 390 words, and the extra 300-plus words were "extremely plausible-sounding" extrapolation studded with completely invented industry claims — things like "teams that sustain this report that Claude 'understands the codebase' within a few sprints." The author's assessment is honest:

> "If I hadn't gone back and checked line by line against what Boris actually said, the v1 output was **authoritative enough to publish as-is**."

**The second version changed only two paragraphs of the prompt**: it required each applier to tag its memory entries as `[Boris]` (from the source), `[illustrative]` (a demo scenario it made up), or `[synthesis]` (its own added judgment); and it required every sentence in the final handbook to end with one of those three tags.

The result: zero fabricated claims, every invented example explicitly labeled, and **the output was 36% shorter**.

Same model, same corpus, same architecture. The only difference was two paragraphs of prompt. This is the same thing change #2 is saying — **when the correctness of an output can't be verified cheaply, you have to build "verifiable" into it first.** Tags are a handle for verification.

For writing, for research, for any scenario where AI participates in the output, this holds.

---

## Order of Operations: Which Ones to Do in Two Hours Tonight

All ten changes take several days. By return on effort, the first three come first:

**Hour 1**

1. **Change 3 (permissions)** — 15 minutes, immediate payoff. Every prompt you no longer see is free money
2. **Change 1 (restructure CLAUDE.md)** — 30 minutes. Paste the instruction, let it do the work, you review the diff
3. **Change 10 (checkup)** — 15 minutes. Report-only for now; just see how much dust has piled up in your setup

**Hour 2**

4. **Change 2 (verification skill)** — the only one that's "do it once, live off it for six months." It sets the ceiling on every piece of automation that follows
5. **Change 4 (worktrees)** — if you're still switching checkouts by hand, this is the biggest unlock of the lot

The remaining five (context, delegation, skill-ification, loops, workflows) are all habit changes. Don't try to cram them into one evening — they'll come naturally over a few days of running.

**Cheat sheet:**

| Change | Command / File | In one line |
|---|---|---|
| 1 | `CLAUDE.md` | Commands + prohibitions + lazy-loading; no project introduction |
| 2 | `.claude/skills/verify-*/` | Without a verification loop, everything else is talk |
| 3 | `.claude/settings.json`, `/fewer-permission-prompts`, `/sandbox` | Tiered approval, not a binary choice |
| 4 | `claude -w`, `claude agents`, `isolation: worktree` | Isolation is the precondition for parallelism |
| 5 | `/rewind`, `/compact <hint>`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Rewind, don't correct |
| 6 | "interview me", "blindspot pass" | Delegate, don't pair |
| 7 | `.claude/skills/`, `.claude/commands/` | Twice a day means solidify it |
| 8 | `/goal`, `/loop`, `/schedule` | Four steps, defined by what you hand over |
| 9 | "use a workflow", `/usage` | The verifier cannot be the author |
| 10 | `/checkup` | Pair every addition with a subtraction |

---

## Finally

What moves me most about this list isn't any single tip. It's **the posture of self-overturning**.

Someone explicitly marking his own public advice from six months ago as obsolete, on the grounds that "the models changed" — in a field where everyone is selling certainty, that's rare enough to be worth noting on its own.

It also suggests a pragmatic way to read: **the shelf life of a list like this is inversely proportional to the pace of model iteration.** When you copy a configuration, jot down which version you copied it from; at the next major model release, come back and see which entries should retire.

And the one principle that survived from the first volume to the last is probably the only one that won't expire:

> Give it a way to sign off on its own work.

Everything else is that sentence unfolded at different scales — a skill is its session-scale version, a `/goal` is its loop-scale version, a workflow is its fleet-scale version, and a rule written into CLAUDE.md is its time-scale version.

---

## Further Reading

- [How Boris Uses Claude Code](https://howborisusesclaudecode.com/): the source of everything in this piece, 121 tips across 21 volumes. Fan-maintained, not official Anthropic
- If you want it inside Claude Code to query directly, the site provides a skill: `mkdir -p ~/.claude/skills/boris && curl -L -o ~/.claude/skills/boris/SKILL.md https://howborisusesclaudecode.com/api/install`, then type `/boris` to invoke it. **Read that file before you install it** — which is Thariq's principle from change #7
- [Claude Code docs · hooks](https://code.claude.com/docs/en/hooks), [scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks)
- More in this series: [Write Your Prompt as a Loop](../prompt-loop-engineering-practice/) (the full version of change #8), [The Agent Engineering Map](../agent-engineering-the-98-percent-harness/) (where these configurations sit in the overall harness), [Context Is Not Prompt](../context-engineering-the-new-foundation/) (the foundation under change #5), [Give AI Tasks, Not Directions](../give-ai-tasks-not-directions/) (the single-turn version of change #6), [How to Design a Skill Worth Having](../designing-valuable-agent-skills/) (the safety boundary for change #7)
