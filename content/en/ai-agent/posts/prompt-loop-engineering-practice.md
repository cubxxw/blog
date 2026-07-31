---
title: 'Loop Engineering for Solo Builders: Verifiers, State, and Safe Automation'
ShowRssButtonInSectionTermList: true
date: '2026-07-20T21:00:00+08:00'
lastmod: '2026-07-31T12:00:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Automation
  - Harness Engineering
  - Testing
  - Solo Builder
description: >
  Loop engineering turns repeated prompting into a verifiable system. A field guide to state, layered checks, permissions, and clear stopping rules for solo work.
categories:
  - Development
tldr:
  - "A loop needs only three things: one task, one check, one stopping condition. Model choice, frameworks, MCP — all secondary. The real work is making the check real and defining when to stop."
  - The verifier is the bottleneck, not the model. It comes in three tiers - deterministic gates, scoring scripts, and model judges for criteria that cannot be reduced to a command.
  - An easily missed hard constraint - `/goal`'s evaluator calls no tools; it only reads the transcript. So your loop has to say the evidence out loud. A success that never appeared in the transcript never happened.
  - The verifier's permissions must be strictly narrower than the executor's. Give a checker write access and it will quietly edit things until the check passes, and maker-checker degrades into maker-maker.
  - State lives in three layers - contract (structured backlog, bounded), distillate (reusable patterns, bounded), and stream (append-only log, archivable). The agent reads the first two at the top of every round.
  - Don't drop one big loop into unattended mode. Split it by permission into three stages - collect with no AI, analyze read-only and speech-only, then fix through a narrow trigger and scope allowlist.
maturity: budding
cover:
  image: /images/covers/ai-agent/2026/prompt-loop-engineering-practice.jpeg
  alt: "A quiet control desk representing verifiable loop engineering for solo builders"
---

## Why Does Getting Better at This Make Me More Tired?

Let me start with a strange thing I banged my head against for a long time before I understood it.

When I first started using Claude Code, the productivity gain was visible to the naked eye: an afternoon's work covered what used to take two days. Once I got fluent, the gains kept coming — but so did the exhaustion at the end of each day. Because I was doing the same thing all day long: **watch it finish, judge whether it's right, think about what to say next, hit enter again.**

Some days I hit enter more times than I care to count. None of those decisions was hard. Every one still required me to be there.

This posture is **human in the loop**. It is useful when judgment is still forming, but it becomes a bottleneck once the work is repetitive and checkable. How many sessions can you watch at once? Three? Five? That is your attention ceiling, and a stronger model does not remove it.

The phrase **loop engineering** points at something concrete: taking the responsibilities still hiding in your head — scheduling, acceptance, state, and the decision to stop — and moving them into an explicit system.

Prompt engineering optimizes **one answer**. Loop engineering optimizes **many answers converging on a verifiable result**.

This article is about that middle layer. I built it in this blog's repository, watched it fail, and kept the parts that survived contact with real work.

---

## A Loop Needs Only Three Things

Let's strip the noise first. Most articles on loops open with the five steps of ReAct, orchestration frameworks, multi-agent topologies — enough to make your head spin. Peel it all back and a working loop needs exactly three things:

```
┌────────────────────────────────────────────────┐
│                                                │
│  ① do one thing ─▶ ② check it ─▶ ③ not there?  │
│     ▲                              │           │
│     └──────────────────────────────┘           │
│                                                │
│          there → stop, hand off to a human     │
└────────────────────────────────────────────────┘
```

**One task. One check. One stopping condition.**

All of the engineering effort lands on ② and ③. ① is the model's problem — you can't control it and don't need to. ② and ③ are yours, and nearly every loop that fails cut corners in exactly those two places.

The classic corner-cut looks like this: the goal is written as "make the homepage better." That's a **direction**, not a **task** — it has no done state. So the loop rewrites the homepage eight times, each version different, none obviously better, and then reports "complete" with total confidence, and you've paid real money for an **expensive slop machine**: motion without progress.

I wrote about the single-turn version of this principle in [Give Your AI Tasks, Not Directions](../give-ai-tasks-not-directions/). Inside a loop the damage is amplified by an order of magnitude — because when a single turn goes off the rails you notice immediately, and when a loop goes off the rails you find out the next morning from the bill.

So the test for a good goal is one question: **can its success be checked?**

- ✅ `All tests under test/auth pass and tsc reports no errors` — checkable, just run it
- ✅ `Every PSI score in the newest snapshot under data/seo/ is ≥ 90` — checkable, read the file and compare
- ❌ `Refactor this module to be more elegant` — not checkable, never knows when to stop
- ❌ `Improve the article's SEO performance` — not checkable, and no sense of how long is enough

If you can't write a checkable condition, that's a sign the work **isn't ready for a loop**. It needs to pass through your judgment first and get sliced into pieces that can be checked.

---

## My First Loop: One bash while and Three Files

The most primitive loop implementation is the **Ralph technique**, named by Geoffrey Huntley in July 2025 — after Ralph Wiggum from *The Simpsons*, that clueless, persistent, optimistic kid, because this loop behaves the same way: whatever happens, it dumbly keeps going. In its purest form it's one line:

```bash
while :; do cat PROMPT.md | claude -p --dangerously-skip-permissions ; done
```

It looks crude. But hidden inside is a genuinely important design decision: **every round gets a fresh context window.**

That's not a defect, it's the feature. Context rots — by round 40, the window is stuffed with 39 rounds of trial and error, abandoned approaches, and failed commands, and the model gets dragged off course by its own history. Ralph's answer is to knock it all down every round and let **state live on disk instead of in the context**.

Or, in a line I'm fond of: **the agent forgets; the repo doesn't.**

I put all of this under `scripts/ralph/` in this blog's repo and ran a full project through it — rebuilding the article detail page into a three-column layout with bilingual dual themes, nine user stories total, entirely unattended. The directory looks like this:

```
scripts/ralph/
├── ralph.sh        # the loop itself: run N rounds, detect the done signal, archive across rounds
├── CLAUDE.md       # the instruction fed in each round (the loop body)
├── prd.json        # contract layer: structured backlog, each story with acceptance criteria and passes
├── progress.txt    # distillate + stream layers: distilled patterns on top, append-only log below
└── .last-branch    # auto-archives the previous run's records on branch switch
```

### The Loop Body: Ten Hard-Coded Steps per Round

`CLAUDE.md` is the instruction stuffed into the model each round. What matters about it isn't cleverness — it's **determinism**. Ten steps, none of them leaving room for improvisation:

```
1. Read prd.json
2. Read progress.txt (start with Codebase Patterns at the top)
3. Confirm you're on the branch the PRD specifies; switch/create if not
4. Pick the single highest-priority story with passes: false
5. Implement only that one story
6. Run the quality checks (typecheck / lint / test)
7. Write any reusable pattern you discover back into CLAUDE.md
8. Commit only if the checks pass, with a fixed message format
9. Flip that story's passes to true
10. Append this round's progress to progress.txt
```

Note steps 4 and 5: **one thing per round**. This is the most easily ignored discipline in Ralph. Resetting the context is fundamentally a blunt form of scope control — kill the context, start clean, do one thing. Ask it to do three things in a round and the third one will be mush.

Steps 6 and 8 are this loop's **gate**: no commit unless the checks pass. That single rule turns "progress every round" into "**verifiable** progress every round."

### Three Layers of State — Don't Mix Them in One File

I started with all my state in one markdown file, and about a dozen rounds in the problem surfaced: the file grew to several thousand lines, the agent burned most of its context just reading it every round, and got more confused the more it read.

I split it into three layers, and I think that split is the most reusable part of this whole setup:

```
┌───────────────────────────────────────────────────────┐
│ CONTRACT   prd.json                                   │
│   structured, bounded, machine-readable               │
│   each story: {id, title, acceptanceCriteria[], passes}│
│   ← agent takes tasks from here, writes done back here│
├───────────────────────────────────────────────────────┤
│ DISTILLATE  ## Codebase Patterns, top of progress.txt │
│   distilled reusable knowledge, bounded, compacted    │
│   "PaperMod puts .dark on body, not on html"          │
│   ← agent reads this first, to avoid re-hitting pits  │
├───────────────────────────────────────────────────────┤
│ STREAM      append-only log below it in progress.txt  │
│   append-only, unbounded, archived on branch switch   │
│   ← audit trail for humans; agent rarely reads it all │
└───────────────────────────────────────────────────────┘
```

What separates the three layers is **how they grow**. The contract layer grows with task count but is bounded. The distillate layer is deliberately held down and not allowed to grow — when it does, you merge and delete. The stream layer grows without bound over time but can be archived wholesale. The agent must read the first two every round; it only digs into the stream when tracing something back.

The distillate layer is where the compounding happens. Looking at the top of my `progress.txt`, here's what it had accumulated on its own after nine rounds:

```
## Codebase Patterns
- PaperMod puts the .dark class on body (not html) — dark selectors in tokens.css must use body.dark
- Static JS must live in static/js/; Hugo does not serve assets/js/ directly
- Playwright's force:true click does not fire JS events on hidden elements; use page.evaluate(() => el.click())
- custom.css has a hardcoded color override for .dark .post-content h2; needs a higher-specificity rule to beat it
```

Not one of those four came from me — it hit every one of them on its own. And it hit the first one twice: the version it first wrote into the distillate layer was wrong (it wrote `html.dark`), and only the second collision corrected it. Which tells you something on its own: **the distillate layer needs verification too, or it will compound your errors right along with your insights.**

### Stopping: Say What the Script Actually Enforces

The core stopping logic in `ralph.sh` is:

```bash
for i in $(seq 1 $MAX_ITERATIONS); do
  OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/CLAUDE.md" 2>&1 | tee /dev/stderr) || true

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo "Ralph completed all tasks!"
    claude --dangerously-skip-permissions --print "/ship-pr"
    exit 0
  fi
  sleep 2
done
exit 1   # hit the iteration cap, non-zero exit
```

- **Completion marker**: the loop exits when the output contains `<promise>COMPLETE</promise>`. This is a soft signal because it depends on the model's own report.
- **Iteration cap**: `MAX_ITERATIONS` stops an endless loop with a non-zero exit. It limits damage; it does not prove completion.

The `passes` field for every story in `prd.json` can be checked independently with `jq`, but that contract gate is **not wired into the current script**. The honest next improvement is to run that check before accepting the completion marker, then continue or fail closed when the contract is incomplete. Until then, the script has two stopping mechanisms, not three, and a false completion marker can still pass through.

---

## Product Goals Are Not All the Same Mechanism

The word *goal* now appears in more than one coding product, but the implementations are not mirrors.

### Claude Code `/goal`: a session loop with a separate evaluator

In Claude Code, `/goal` sets a completion condition for the current session. After each turn, a small evaluator model receives the condition and the conversation and decides whether another turn is needed. The evaluator does **not** call tools or inspect the repository on its own. Its view is limited to evidence Claude surfaced in the transcript.

```text
/goal All tests under test/auth pass and lint is clean.
      Run both commands, report their exit codes, and stop after 20 turns.
```

That limitation produces a useful rule: ask for the check and its evidence, not merely the outcome.

```text
Weak:   All tests pass.
Better: Run npm test. The goal is met when the reported exit code is 0
        and the output shows no failing test; otherwise continue.
```

Claude Code also documents `/loop` for interval-based repetition and Stop hooks for script- or prompt-controlled stopping. They solve different trigger problems:

| Mechanism | Starts another turn when | Stops when |
| --- | --- | --- |
| `/goal` | the previous turn ends | the evaluator accepts the condition |
| `/loop` | an interval elapses | you stop it or the task ends |
| Stop hook | the previous turn ends | your configured script or prompt allows it |

Use `/goal` for a bounded outcome, `/loop` for patrol work, and a script-based hook when the stopping test itself is deterministic. This description follows the [official Claude Code goal documentation](https://code.claude.com/docs/en/goal); it does not imply that every product uses the same evaluator architecture.

### Codex Goals: durable state attached to a thread

Codex Goals use a different boundary. A Goal is persisted state belonging to one thread: the objective, lifecycle, budget, and progress accounting travel with the work that produced the files, diffs, commands, and logs. Continuation happens at safe idle boundaries, not through a claim that Codex copied Claude Code's Stop-hook design.

The completion rule is also explicit: before a Goal is marked complete, Codex audits the objective against concrete evidence such as changed files, test output, benchmarks, generated artifacts, or research results. Reaching a budget limit is not proof of completion. The official description is [Using Goals in Codex](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-goals-are-designed-in-codex).

The practical distinction is:

- Claude Code `/goal` is a session-scoped repeated-turn mechanism whose separate evaluator reads the transcript.
- A Codex Goal is a thread-scoped completion contract with persisted state and an evidence audit.

Both reward measurable conditions, but their internal contracts are different. In either case, **a completion claim should point to evidence another person can inspect**.

That is the loop version of the question from [Put Quality Gates on Your AI Workflow](../engineering-discipline-ai-workflow/): if this breaks, how will I know?

---

## The Verifier Is the Bottleneck, Not the Model

If you take one sentence from this article, take this: **once a loop can act, the verifier often becomes the bottleneck.**

Models get stronger every six months. Verifiers don't strengthen themselves. How long your loop can run, and whether you can walk away from it, depends entirely on how trustworthy the thing that says "done" is.

I sort verifiers into three tiers. Prefer the most deterministic tier that can express the criterion:

```
TIER 1  Deterministic gate ──── exit codes, compiler output, schema validation
        Cannot fool itself, near-zero cost, but only answers "pass/fail"

TIER 2  Scoring script ──────── a scorer you write, emitting a number
        Answers "how good is it," supports budgets and trend lines

TIER 3  Model judge ─────────── a language model reads the result and rules
        Can judge things with no deterministic definition, like "is this
        well written" — but needs a rubric and cited evidence.
```

### Tier One: Deterministic Gates

The exit code from `npm test`, whether `tsc` reported errors, whether `hugo build` was 0 warnings, whether `git status` is clean. These things **cannot fool themselves**, and that is their single overwhelming advantage.

In my Ralph loop, steps 6 and 8 of `CLAUDE.md` are this tier: no commit unless the checks pass. Nine rounds, and not one bad commit — not because the model was reliable, but because the gate was there.

### Tier Two: Scoring Scripts, Badly Underrated

This is the tier I think most people skip. It sits between "pass/fail" and "let the AI have an opinion": **you write a script that computes the health of the system as a number.**

I wrote two in the repo:

```
scripts/score-site-build-health.mjs        # build health
scripts/score-content-search-integrity.mjs # content / search-index consistency
```

The second does something very concrete: regenerate the content index, compare it byte for byte against the two committed index files in the repo, award 20 points per matching file for a max of 40, then layer on workflow coverage, junk-file checks, and a few other items.

```javascript
function compareIndexes(expected) {
  const expectedJson = normalizeIndexPayload(expected);   // strip noise fields like generatedAt
  const files = trackedIndexFiles.map((filePath) => ({
    filePath,
    matches: fs.existsSync(filePath) &&
             normalizeIndexPayload(readJson(filePath)) === expectedJson,
  }));
  const score = files.filter((f) => f.matches).length * 20;
  return { score, max: 40, files };
}
```

Why bother with this instead of just running `diff`? Because **a number does three things an exit code can't**:

1. **You can set a budget.** The loop's stopping condition can be "overall score ≥ 85" instead of "all green" — and all-green is a bar real projects routinely fail to clear, at which point you either abandon the loop or downgrade the gate into decoration.
2. **You can see trends.** Three rounds with an unchanged score is a deterministic signal of "no progress," which can trigger a stop directly (more on this in the guardrails section).
3. **You can localize.** The score is a sum of sub-scores, so when it drops you know which item dropped.

Writing a scorer is cheap — it's just encoding the handful of things you'd have eyeballed anyway. But it converts "feels okay to me" into "85, down 5 from yesterday, and the drop is in index consistency." That conversion is the watershed for whether a loop can run unattended.

### Tier Three: Model Judges for Irreducibly Qualitative Work

Some things genuinely have no deterministic definition — "does this copy read well," "does this change fit the project's style," "is this SEO suggestion any good." That's when the LLM judge earns its keep.

Two disciplines when you use one:

**First, ask the judge for evidence, not for feelings.** "Do you think it's done?" gets you a near-constant yes. What you ask instead is: "paste the commands you ran and their full output, and point to the specific line that proves the condition holds."

**Second — and this is the part of maker-checker I think is most often botched — give the verifier fewer capabilities than the executor.**

The reasoning is plain: a checker that can edit the artifact may “verify” by changing it. That collapses maker-checker into maker-maker.

Treat the following as a **conceptual capability policy**, not configuration syntax:

```text
verifier:
  may: read files, search text, run approved non-mutating checks
  may_not: edit files, commit, push, change tests, change its own rubric
  output: criterion -> pass/fail -> cited evidence
```

Implement that policy with the actual permission controls documented by the product you use. Tool names and configuration schemas change; the invariant is simpler: the checker reports, the maker repairs.

---

## Strip Out the Product Names

Tool-specific recipes age quickly. The structure underneath them lasts longer:

```
① A versioned source of truth          repo instructions, acceptance criteria
② Repeated actions frozen into craft   scripts or reusable workflows
③ Parallelism isolated by worktree     every background task trackable and visible
④ One gate that is never delegated     green CI + human review + proof, before land
⑤ Tools wired to the real environment  MCP / connectors, so feedback is real
⑥ Lessons written back into the rules  so corrections compound instead of vanishing
```

The last item is the only one about **time**. The first five determine whether a loop works today; the sixth determines whether it is wiser three months from now or merely faster.

---

## Wiring the Inner Loop to the Outer Loop: A Three-Stage Permission Gradient

Everything so far has been the **inner loop** — you're present, or at least your machine is on. The real leverage is in the **outer loop**: scheduled triggers, event triggers, still running after you close the laptop.

But here's where a lot of people take one step too far at once: **don't drop a big loop with code-write access straight into unattended mode.**

What I eventually converged on in this blog's repo is **splitting it by permission into three stages**, with power strictly increasing along the chain and the joints held by either a human or a deterministic condition:

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  ① COLLECT     │    │  ② ANALYZE     │    │  ③ FIX         │
│  seo-snapshot  │───▶│  seo-analyze   │───▶│  seo-fix       │
├────────────────┤    ├────────────────┤    ├────────────────┤
│ daily schedule │    │ daily schedule │    │ manual trigger │
│ no AI          │    │ AI read-only   │    │ AI can write   │
│ scripts only   │    │ contents: read │    │ scope allowlist│
│ commits json   │    │ talks to issue │    │ opens PRs only │
└────────────────┘    └────────────────┘    └────────────────┘
                                                    │
                                                    ▼
                                          merging is always a human
```

### Stage One: Collect, No AI

A few scripts run on a daily schedule, pull data from Google Search Console, PageSpeed Insights, and CrUX, and write snapshots like `data/seo/gsc-YYYY-MM-DD.json` committed into the repo.

**This stage deliberately has no AI in it.** Collection is deterministic work; letting an AI do it only introduces nondeterminism and cost. And once the snapshots are in git, you have a time series — which is what gives stage two a "today vs yesterday" to compare.

### Stage Two: Analyze — AI Reads Only, and Can Only Talk

This stage is the AI on duty. Every day it reads the two newest snapshots, diffs them, and writes its findings as a comment on a rolling tracking issue.

The key is that its **permissions are pinned down in two places**:

```yaml
permissions:
  contents: read      # ← token level: it simply cannot edit the source
  issues: write
```

```
# ← prompt level: say it again
Dry-run mode: read the SEO snapshots, write findings to the
tracking issue, do NOT touch the source tree.
```

One layer at the token, one layer at the prompt. In a comment I call this "belt to that suspenders." **Permission control always belongs at the mechanism layer; the prompt is only a supplement.** The other way around — prompt only — is the same as not doing it.

Its output is pinned down too: a PSI score change over 5 points has to name the URL and the likely culprit metric; GSC pages with impressions ≥ 20 and CTR < 2% count as title candidates; new queries at positions 8–20 count as cheap opportunities. Whole thing under 600 words.

**Constraining the output format is the precondition for the AI-on-duty being usable at all.** Without it, you get a piece of prose that reads the same every day and that you never finish, and two weeks later you stop opening it — and the loop is dead, killed by noise.

### Stage Three: Fix — Can Write, but the Door Opens Barely

This stage can change code and open PRs, so it has three locks.

**Lock one: manual trigger only.** No schedule, only `workflow_dispatch`. I read that day's observations, pick one recommendation I agree with, and click once. Judgment stays with me; only execution goes to it.

**Lock two: a scope allowlist.** The trigger passes a `scope_hint` that the prompt treats as an allowlist, plus a hard-blocked set of directories:

```
Do NOT touch these unless explicitly named in the task:
  layouts/**, .github/**, scripts/**, config.yml,
  package.json, netlify.toml, data/seo/**
```

`.github/**` being on the blocklist deserves a sentence of its own: **the AI is not allowed to modify its own workflows.** That's the most basic self-reference defense in any automated system — a loop that can edit its own trigger conditions and permissions has no guardrails at all.

**Lock three: provenance check.** The prompt's first step is to go read that issue and confirm the task the operator handed it really corresponds to a specific recommendation in there. If it doesn't match, stop, post a comment saying it couldn't find it, and exit. This step walls off "AI improvises": every change it makes must trace back to an observation it wrote yesterday and I signed off on today.

**And finally, merging is always a human.** I wrote about this boundary in [the blog rebuild retrospective](../ai-native-blog-rebuild/) and it hasn't moved since: 98.4% of the scaffolding can be handed off; the 1.6% that is judgment can't.

### Why Three Stages Beat One Big Loop

Worth spelling out, because intuitively "one loop end to end" feels simpler.

**First, least privilege lands at the stage level.** One big loop has to hold the union of permissions (read data, write issues, edit code), so a hallucination in the analysis phase gets a chance to become a change in the source tree. Split apart, stage ② holds `contents: read` and physically cannot edit even if it wanted to.

**Second, failure gets contained.** If stage ① dies, stage ② reads a stale snapshot and says "the data window is only one day" (the prompt explicitly requires it to say that rather than invent data). If stage ② dies, stage ③ never fires at all. In one big loop, a failure in the first half becomes a fact the second half keeps running on.

**Third, the human is placed at the point with the most information and the lowest cost.** I don't need to read a code diff to judge "is this recommendation worth doing" — that's stage ②'s output, a paragraph of prose. Whereas with one big loop, what I see is a PR that's already written, which costs far more to judge and carries sunk-cost pressure (it's already done, might as well merge).

That third one is the most counterintuitive and, I think, the most important. **In automation design, "at which step the human intervenes" matters far more than "whether the human intervenes."**

---

## Combinations Worth Making

The parts above compose. Here are a few combinations I've either verified or that hold mechanically.

### Ralph × Claude Code `/goal`: reset outside, converge inside

They differ in context strategy, and the difference happens to be complementary:

| | Ralph (outer bash) | `/goal` (in-session) |
| --- | --- | --- |
| Context | Cleared every round | Preserved across rounds |
| Good for | Many tasks, each narrow | One deep task needing continuous reasoning |
| State | Must live entirely on disk | Some can stay in the session |
| Failure mode | Forgets important background | Context rot, dragged off by its own history |

One useful pattern is **nesting**: an outer script selects one story and starts a fresh process; that process uses Claude Code `/goal` to work toward the story's acceptance criteria. The example is illustrative and should first be tested in a disposable branch:

```bash
# Illustrative: outer layer handles scheduling and context reset,
# inner layer handles convergence of a single task
while :; do
  STORY=$(jq -r '[.userStories[] | select(.passes==false)]
                 | sort_by(.priority) | .[0] // empty' prd.json)
  [ -z "$STORY" ] && break

  claude -p --output-format stream-json --verbose \
    "/goal Complete this story and make every acceptance criterion hold.
     For each criterion, paste the verification command and its output;
     or stop after 12 turns.
     Story: $STORY"
done
```

### Local Inner Loop × Actions Outer Loop: Cheap Runs Fast, Expensive Runs Right

My split is this:

- **Local Ralph**: fast iteration, tight feedback, controllable cost, Ctrl+C whenever. Good for work still in the exploratory phase.
- **GitHub Actions**: cross-device, keeps running after you close the laptop, full audit log, permissions enforceable at the token layer. Good for work that has stabilized and needs to happen on a schedule.

The test is simple: **is the shape of this work still changing?** Still changing, keep it local. Once it's settled into "the same thing once a day," move it into Actions and narrow the permissions on the way in.

### maker-checker × Permission Asymmetry × worktree

You need all three together for it to be complete:

```
maker      →  the implementer, has write access, works in its own worktree
checker    →  the verifier, read-only, checks against acceptance criteria and tests, reports only
worktree   →  isolation; worst case is git worktree remove, mainline stays clean
```

Drop any one and something leaks through: maker-checker without permission asymmetry means the checker cheats; permission asymmetry without worktrees means parallel makers step on each other; worktrees without a checker means you've merely produced several untrustworthy things in parallel.

---

## The Guardrail Checklist

An unattended loop needs guardrails. These are the ones I don't think you can skip.

**A hard iteration cap.** The simplest and most effective. `MAX_ITERATIONS`, or `or stop after 20 turns` written into the condition. It depends on no judgment, so it always works.

**A token / cost budget.** Set a hard ceiling on day one; don't wait until you see the bill. Loop cost is **multiplicative**: rounds × context per round × number of subagents, and any one of them running away amplifies things by orders of magnitude. Osmani added an explicit disclaimer in his piece about being careful with token cost and how enormously usage can vary — and the person writing that is an engineering lead at Google. If he feels the need to warn you, it isn't a rare event.

**No-progress detection.** Stop and report after N consecutive rounds of any of: empty `git diff`, unchanged scorer output, an evaluator reason nearly identical to last round's. Doing this cleanly requires a scoring script — one more reason tier-two verifiers are underrated.

**An allowlist for destructive operations, not a blocklist.** Allowlists are far safer than blocklists, because you'll never think of everything that should be forbidden. The `scope_hint` in `seo-fix` above is exactly this idea.

**Rollback cost near zero.** Every loop runs on its own branch or worktree; the worst case is `git branch -D`. Get this right and your tolerance for the loop goes way up — which paradoxically makes you willing to let it run longer.

**An audit trail.** The stream-layer log, the Actions run records, every change traceable to the signal that prompted it. When something goes wrong you have to answer "why did it do that," and the answer has to be in a file, not in your memory.

---

## Three Places This Fails

Everything above is about building it. But there are three problems that get **worse the better the loop works**, and they need to be said plainly.

**One: "done" is a claim, not a proof.** However well you design your verifier, it verifies only the conditions you thought of. An unattended loop is doing work and also **making mistakes unattended**. My own experience is that after a run I still have to read the diff — not every line, but the trunk of it. The handful of times I skipped that step, without exception, I paid double for it later.

**Two: comprehension erodes.** The better the loop runs, the more code exists that you never wrote, and the wider the gap between what you think you understand and what's actually there. Osmani calls this comprehension debt, and I think that's exactly right. The frightening part is that it **has no alarm** — until the day you need to work somewhere the loop can't help, and discover you've become a stranger in your own project.

My own countermeasure: use loops to go faster in areas I **already understand**, never to understand areas I **don't**. The same loop, built identically by two people — one to move faster where they're fluent, one to avoid learning at all. The tool can't tell those two apart. Only you can.

**Three: verifiers cost money and need maintenance.** Subagents run their own models and tool calls, and those tokens are real. Scoring scripts drift as the project evolves — both of mine needed changes after I restructured the repo. **A verifier isn't a one-time investment; it's an asset you have to keep feeding.** Which is why I insist on exit codes over LLMs wherever possible: exit codes need no feeding.

---

## A Block of Instructions You Can Paste Right Now

One last thing you can use immediately.

Copy the block below into the coding agent you use. It asks for product-specific commands rather than pretending Claude Code `/goal` and Codex Goals share one interface.

```text
You are going to build a minimal working loop system in this repo. Follow the
order below, and after each step report your conclusions to me before
continuing. Do not do it all in one shot.

[STEP 1: SURVEY — READ ONLY, DO NOT MODIFY ANY FILE]
1. Determine the tech stack and find the exact build / test / lint / typecheck
   commands (read package.json / Makefile / CI config — do not guess).
2. Find any existing CLAUDE.md / AGENTS.md / .claude / .codex configuration.
3. Find traces of the kind of task I repeat several times a week
   (look at message patterns across the last 50 commits).
4. Write your conclusions as a report of no more than 30 lines, and explicitly
   list what you could not determine. Do not create any file in this step.

[STEP 2: AFTER I CONFIRM, CREATE THE SKELETON]
In the repo root, create:

  LOOP.md                     — the loop body (the instruction fed to the
                                agent each round)
  .loop/state.json            — contract layer: structured task list, each
                                item {id, title, acceptance[], passes}
  .loop/patterns.md           — distillate layer: reusable patterns, empty to
                                start, hard cap of 40 lines; past that you
                                must merge older entries
  .loop/log.md                — stream layer: append-only

LOOP.md must spell out these ten things:
  1) Read .loop/patterns.md first, then .loop/state.json
  2) Pick exactly one task with passes:false and the highest priority
  3) Do only that one task this round; no doing extras along the way
  4) Verify using the real commands found in step 1; do not invent commands
  5) You must paste the verification command's full output (including exit
     code) into your reply — a success that wasn't printed didn't happen
  6) If verification fails, do not commit and do not flip passes to true
  7) On pass, commit with message format: feat: [task-id] - [title]
  8) Append this round's progress to .loop/log.md
  9) If you find a reusable pattern, write it into .loop/patterns.md
     (mind the 40-line cap)
  10) Never modify .github/**, the CI config, or LOOP.md itself

[STEP 3: THE VERIFIER]
Write scripts/loop-score.mjs (or the equivalent in this repo's language):
  - Run, in order, the check commands found in step 1
  - Assign each a fixed point value; output JSON:
    {score, max, items:[{name, pass, detail}]}
  - Exit code: return 1 when score < threshold
Do not use an LLM to judge anything a command can judge.

[STEP 4: MAKER-CHECKER]
First inspect this product's official permission and subagent documentation.
Then create a verifier, if the product supports the required restrictions:
  - It may read and run approved non-mutating checks, but may not write files,
    change tests, or commit
  - Responsible for checking evidence against each acceptance criterion and
    reporting; never fixing anything itself
  - Report format: each criterion → pass/fail → which span of output is
    cited as evidence
If the permission boundary cannot be enforced, do not invent a configuration
schema. Run the checker in a read-only sandbox or keep verification manual.

[STEP 5: GIVE ME TWO DIRECTLY RUNNABLE COMMANDS]
  a) For Claude Code, an inner-loop command using /goal whose condition
     includes the acceptance criteria, reported verification output, and a
     turn cap. For Codex, create a thread-scoped Goal with the same evidence
     contract using the supported Goal interface; do not assume /goal syntax.
  b) An outer script that runs N rounds, resets context each round, detects
     the completion signal, and exits non-zero when it hits the cap

[IRON RULES THROUGHOUT]
- Stop and ask me about anything you're unsure of. Do not guess.
- Do not touch .github/**, do not change CI, do not modify your own LOOP.md.
- Report after each step before continuing.
```

That block itself embodies several of the article's principles: survey before acting (no guessing at commands), evidence must be printed, verifier is read-only, self-reference defense (can't edit itself), and a human confirmation point between every step.

When it finishes you'll have: a loop-body instruction file, three layers of state files, a scoring script, a read-only verifier subagent, and two commands you can run directly. What's left is your own judgment — **which task to pick first.**

My advice is to pick something **boringly narrow but whose success a test can adjudicate**: fix a class of flaky test, fill in the types for one module, get some e2e suite green. Don't open with "refactor the core module." The first thing you need to verify isn't the model's capability — it's **whether your verifier can be trusted.**

---

## You Moved From Inside the Loop to Outside It

Back to the question at the top: why does getting better at this make you more tired?

Because fluency improves your efficiency **inside** the loop — you type faster, judge more accurately, watch more sessions at once. But the loop is still the same loop, and you're still in it.

What loop engineering does is move you out. You go from "the executor present at every step" to "the person who designs the loop and then watches the guardrails." This isn't easier — Osmani is right that **loop design is harder than prompt engineering, not easier** — because it demands that you write down, as explicit executable rules, all the judgments you used to make on instinct (is this done? should it stop? can I trust this change?).

But it's **cumulative**. An acceptance criterion you write today is still working tomorrow; a pit you distilled into patterns is still blocking for you three months out. Those few hundred presses of the enter key are gone the moment you make them.

Which is also why I think this matters most for the person working alone. A team can throw people at parallelism; one person can't — one person's capacity ceiling is attention. Moving attention from execution to design is the only direction that breaks through that ceiling.

Let me close by repeating a line from Osmani I strongly agree with: **the same loop, built by two people, can produce completely opposite outcomes.** One of them uses it to move faster in a domain they understand deeply; the other uses it to avoid understanding at all. The loop can't tell the difference.

You can.

---

## References

- [Keep Claude working toward a goal — Claude Code Docs](https://code.claude.com/docs/en/goal): `/goal`, `/loop`, Stop hooks, and the evaluator's transcript-only view
- [Claude Code tools reference](https://code.claude.com/docs/en/tools-reference): current tool names and permission surfaces; use this instead of copying illustrative schemas
- [Using Goals in Codex — OpenAI Developers](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-goals-are-designed-in-codex): persisted thread state, lifecycle controls, budgets, continuation, and evidence-based completion
- [Loop Engineering — Addy Osmani](https://addyosmani.com/blog/loop-engineering/): the five-primitives-plus-a-memory framework, and an honest warning about cost and comprehension debt
- [Ralph Wiggum as a "software engineer" — Geoffrey Huntley](https://ghuntley.com/ralph/): the original source of the Ralph technique
- Related reading in the same vein: [The Agent Engineering Map](../agent-engineering-the-98-percent-harness/) (the 98.4% of engineering outside the loop), [Put Quality Gates on Your AI Workflow](../engineering-discipline-ai-workflow/) (the single-machine version of verifier thinking), [Give Your AI Tasks, Not Directions](../give-ai-tasks-not-directions/) (the single-turn version of checkable goals)
