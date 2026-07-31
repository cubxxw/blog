---
title: 'Claude Code Playbook: 10 Configurations for Reliable Agent Workflows'
ShowRssButtonInSectionTermList: true
date: 2026-07-20T23:30:00+08:00
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Automation
  - Harness Engineering
  - Productivity
  - Testing
categories:
  - Development
description: >
  A practical Claude Code guide to verification, permissions, worktrees, subagents, workflows, goals, loops, and routines, with current limits and safe defaults.
tldr:
  - Plan mode and Auto mode solve different problems. Plan exposes decisions before edits; Auto reduces execution-time permission prompts through a separate safety classifier.
  - Auto mode reduces interruptions but does not guarantee safety. Sensitive data, production systems, credentials, and irreversible operations still deserve human review.
  - Worktrees isolate files. Subagents isolate context. Agent teams coordinate peers. Dynamic workflows put repeatable orchestration into a script. These are separate layers.
  - Use `/goal` for a measurable completion condition and `/loop` for session-scoped polling. Recurring loop tasks expire after seven days.
  - The durable advantage is not “more agents.” It is putting tests, evidence, permission boundaries, and lessons from failure into infrastructure that the next session can reuse.
maturity: mature
cover:
  image: /images/covers/ai-agent/2026/claude-code-boris-121-tips-playbook.jpeg
  alt: 'Claude Code playbook for verification, permissions, worktrees, loops, and parallel agents'
---

## Put the Tip List Down for a Moment

I began this article as a collection of Boris Cherny's Claude Code habits. That version had a problem: social posts age with models and product releases, while fan-maintained collections tend to mix personal advice, previews, and impressive-looking statistics. A sharp opinion can become a historical footnote before the article reaches its readers.

So I took the slower route. Product claims in this revision come from Anthropic or the official Claude Code documentation. Untraceable numbers, second-hand quotations, and claims of universal superiority are gone. Boris's way of working remains an inspiration, but it is not treated as a specification.

That distinction matters. Opinions can be light; boundaries must be heavy. The point of an agent is not that it acts more automatically. The point is that it can act inside a trust boundary and return evidence you can inspect.

The ten changes below mix three kinds of material:

1. **Established building blocks:** CLAUDE.md, skills, hooks, worktrees, subagents, Plan mode, `/goal`, and `/loop`.
2. **Capabilities with explicit constraints:** Auto mode, agent view, agent teams, dynamic workflows, and Ultracode.
3. **My operating method:** how I combine those pieces. This is practice, not official doctrine.

---

## Change 1 | Write CLAUDE.md as High-Signal Constraint

CLAUDE.md is persistent context. It deserves information Claude cannot reliably recover just by reading the repository:

- the correct build, test, lint, and release commands;
- architectural boundaries that must not be crossed;
- repository-specific naming and contribution rules;
- recurring mistakes, with the reason each one is dangerous.

A copied directory tree or a long introduction to the framework is usually dead weight. Claude can inspect both. Think of context as a small workbench, not a warehouse: every object left on it should help with a decision that occurs often.

I use a three-part shape:

```markdown
# Commands
- Fast check: `bun run typecheck`
- Targeted test: `bun test <path>`
- Before handoff: `bun run lint && bun test`

# Boundaries
- Do not change public API shapes without updating compatibility tests.
- Never edit generated files; change the generator instead.

# References
- Architecture decisions: @docs/architecture.md
- Release process: @docs/releasing.md
```

The goal is not to make the file tiny. The goal is to remove ambiguity at a reasonable context cost. Long references can remain in the repository and be loaded when needed; rules that constrain almost every session earn a permanent place.

A useful maintenance prompt is:

```text
Audit this repository's CLAUDE.md. Keep commands, boundaries, and failure modes
that cannot be inferred reliably from the code. Remove repeated introductions.
Move low-frequency explanations into docs/ and leave precise links behind.

Before editing, classify every section as keep, move, or delete.
After editing, run the repository's existing checks and show the diff.
```

This turns “remember what I said” into an artifact the next session can actually inherit.

---

## Change 2 | Make “Done” Return with Evidence

“Fixed” is a claim. A test exit code, a real request, a browser interaction, or a built artifact is evidence.

Verification should resemble the thing being delivered:

| Change | Minimum useful verification |
|---|---|
| Backend endpoint | Start the service, send real requests, inspect status and body |
| Frontend page | Open the affected route, exercise the interaction, inspect console and visual result |
| CLI | Run success and failure paths, then check exit codes and output |
| Configuration or CI | Run a parser or local equivalent and prove the configuration was loaded |
| Documentation | Build the site and check links, code blocks, and rendered output |

If the same acceptance path appears repeatedly, make it a skill:

```markdown
---
name: verify-change
description: Use before claiming that a code, UI, configuration, or documentation change is complete.
---

Identify the user path affected by the change.
Run the closest practical end-to-end check and the repository's required static checks.
If anything fails, fix it and rerun the affected verification chain from the start.
Report commands, exit codes, observations, and any risk that remains untested.
```

The final report should be auditable. Repeating “I checked it” in a confident voice is not a verification loop. Future you should not have to trust the tone of a transcript; the evidence should stand on its own.

---

## Change 3 | Plan Mode Did Not Become Obsolete

Plan mode and Auto mode are often presented as rivals. Officially, they answer different questions.

- **Plan mode** lets Claude read files, run exploratory commands, and propose a plan without editing source. Use it to understand unfamiliar code, compare approaches, and expose the impact before committing.
- **Auto mode** reduces routine permission prompts during execution. A separate classifier reviews actions before they run and blocks behavior outside the stated request or trust boundary.

One decides **how to proceed**. The other decides **how often execution should stop for approval**.

A complex task can use both:

```text
Plan mode: inspect the system -> compare options -> list risks -> review the plan
Execution: choose default, acceptEdits, or auto for the actual risk level
Verification: run tests and real interactions -> inspect the diff
```

The value of a plan does not depend on whether the current model can “think without one.” A plan makes expensive decisions visible before they become expensive edits. I still use it for cross-module migrations, data-model changes, and permission-system work. I skip the ceremony for a typo or a small change that follows an established pattern.

On Claude Code on the web, rejecting a proposed plan can also offer **Ultraplan** for browser-based plan review. That is a plan-review option, not the same feature as **Ultracode**, the workflow-oriented effort setting discussed later.

---

## Change 4 | Treat Auto Mode as a Safety Trade-off, Not a Safety Proof

Auto mode executes without routine permission prompts, while a separate classifier checks actions for escalation, unrecognized infrastructure, hostile external content, destructive operations, and sensitive data flows. Explicit `ask` and `deny` rules still apply.

The official warning is the right one to remember: Auto mode reduces prompt fatigue, but it does not guarantee safety. It is suitable when you trust the direction of the task. It is not a substitute for review when production, credentials, personal data, external publishing, or irreversible changes are involved.

Availability has changed more than once, which is why old matrices should not be copied. At this review date, the official permission-mode page says Auto mode is available on all plans when the selected model and provider support it. Support now covers more than the Anthropic API. Check that page rather than preserving a plan/model table in a long-lived article.

My practical ladder is:

1. `default` for unfamiliar repositories and sensitive work;
2. `acceptEdits` when I am comfortable reviewing ordinary file edits afterward;
3. `plan` when I want research and a proposal before source changes;
4. `auto` for a trusted direction, reversible work, and a strong verification path;
5. `bypassPermissions` only inside a deliberately isolated container or VM.

Then make common boundaries explicit:

```json
{
  "permissions": {
    "allow": [
      "Bash(bun run typecheck:*)",
      "Bash(bun test:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

An allowlist should reserve attention for genuinely unusual actions, not chase the aesthetic of zero prompts. A command touching production, secrets, an external recipient, or hard-to-recover state deserves an intentional decision.

---

## Change 5 | Isolate Files Before You Parallelize

The most ordinary multi-agent failure is also the least glamorous: two sessions edit one checkout, and the resulting conflict is mistaken for a product problem.

Claude Code can start an isolated Git worktree:

```bash
claude --worktree feature-auth
# shorthand
claude -w feature-auth
```

The worktree lives under `.claude/worktrees/` and gets its own branch. A custom subagent can request the same isolation:

```markdown
---
name: migration-worker
description: Handle an independently testable migration batch.
isolation: worktree
---
```

Worktrees isolate **files**, not dependencies between tasks. Parallel work is a good fit when:

- module ownership is clear;
- inputs and outputs are already agreed;
- each branch can be verified independently.

Database migration order, a shared interface rename, and edits to one generated artifact usually need serial execution—or at least a contract fixed before dispatch.

Parallelism is a debt paid in advance. You spend time defining ownership and acceptance criteria, then earn throughput. Start ten agents with a vague boundary and you have not accelerated one problem; you have cloned it.

---

## Change 6 | Choose the Right Kind of Parallel Work

Claude Code now has several parallel-work primitives. Their names are close enough to invite confusion:

| Capability | What it is | Best fit |
|---|---|---|
| Subagent | A delegated worker with an isolated context | Focused research, review, testing, or a self-contained implementation |
| Agent view | A control surface for multiple background sessions | Watching independent local sessions from one place |
| Agent team | A lead plus peer sessions with shared tasks and messaging | Work whose owners must coordinate and challenge one another |
| Dynamic workflow | A JavaScript orchestration script executed by a runtime | Audits, migrations, and research across dozens or hundreds of units |

The distinction is not marketing trivia. It tells you where state lives. A subagent returns a summary to the parent. An agent team coordinates through a shared task list and messages. A workflow stores loops, branches, and intermediate results in script variables, keeping them out of the main context.

### Permission inheritance is not one universal rule

For normal subagents, the parent permission context carries over, but the subagent may declare a mode subject to parent precedence. If the parent uses `acceptEdits` or `bypassPermissions`, that mode takes precedence. If the parent uses Auto mode, the subagent inherits Auto and its frontmatter `permissionMode` is ignored.

Agent-team teammates start with the lead's permission settings. A teammate cannot approve another teammate's prompt or relay “approval” as if it came from the human. Prompts surface in the lead session.

Workflow agents follow a different rule: official documentation says they run in `acceptEdits` and inherit the session's tool allowlist, regardless of the session mode. File edits are therefore auto-approved, while shell, web, or MCP actions outside the allowlist may still prompt during the run.

That last boundary matters. An old claim that workflows “require Auto mode” is no longer correct. A workflow can run under other modes; its launch approval and mid-run prompts depend on the documented permission flow.

### “Use a workflow” and Ultracode are real, but different

Dynamic workflows require Claude Code v2.1.154 or later. A direct request such as:

```text
use a workflow to audit every route under src/routes for missing auth checks,
then have independent agents verify every finding
```

is an official opt-in. The `ultracode` keyword does the same for one typed prompt. The literal trigger used to be `workflow` before v2.1.160, but current natural-language requests such as “use a workflow” remain supported.

`/effort ultracode` goes further: on models that support `xhigh` effort, it combines that effort with automatic workflow planning for each substantive task in the current session. It costs more and takes longer, so return to a lower effort setting for routine work.

My selection order remains conservative:

1. Stay in one conversation when the work is small and shares context.
2. Use a subagent when a focused side task would pollute the main context.
3. Use an agent team when peers truly need ongoing coordination.
4. Use a workflow when orchestration itself should be readable, repeatable, and scalable.

More agents are not a quality metric. Independent verification and non-overlapping ownership are.

---

## Change 7 | Manage Context by Removing the Failed Path

When an approach has proved wrong, adding another correction leaves the failed code, old assumptions, and new direction in the same conversation. Claude Code offers different tools for different levels of cleanup:

- `/rewind` returns to a checkpoint and can restore conversation, code, or both;
- `/compact` summarizes the current conversation so work can continue;
- `/clear` starts a new conversation;
- **Summarize from here** creates a summary from a chosen point.

My rule is simple:

- The implementation was wrong but the investigation was useful: summarize the lesson, then rewind.
- The task is unchanged but the context is swollen: compact with a specific focus.
- The goal has changed: write a handoff brief, then clear.

A handoff brief needs only the facts that control the next decision:

```text
Goal:
Constraints:
Acceptance criteria:
Confirmed facts:
Rejected approaches and reasons:
Next action:
```

Avoid hard-coding unofficial token thresholds. Models, windows, and compaction behavior change. More durable warning signs are repeated explanations of the same fact, tool output drowning out decisions, and references to an approach already rejected.

Context hygiene is not mystical. It is the habit of removing evidence that no longer belongs to the current hypothesis.

---

## Change 8 | Turn Repeated Work into Skills—Without Worshipping Skills

A skill packages reusable instructions and resources. It is useful when a repository-specific process repeats and has a clear trigger:

- pre-release checks;
- database migration acceptance;
- UI regression verification;
- an incident runbook;
- correct use of an internal API.

A good skill usually starts small:

```markdown
---
name: verify-release
description: Use when preparing a release, generating a changelog, or creating a version tag.
---

# Required checks
...

# Gotchas
...

# Evidence
...
```

The `description` tells Claude **when** to use it. The body should explain where default behavior is insufficient. Long reference material belongs beside `SKILL.md`, linked and loaded only when relevant.

Read a third-party skill before installing it. A skill may bring tool access, hooks, commands, or external dependencies. A prestigious name in the description is not a security boundary.

Skills also need deletion:

- Has this skill been triggered recently?
- Does it duplicate CLAUDE.md?
- Do its commands still run?
- Could a test, linter, hook, or CI check replace the prose?

Experience should accumulate, but sediment can block a river. A system compounds only if it knows what to remember and what to remove.

---

## Change 9 | Give `/goal` the Finish Line and `/loop` the Clock

These commands are often blurred into one idea: “keep going.” Their contracts are different.

### `/goal`: check whether the work is complete

`/goal` sets a completion condition for the current session. After a turn ends, a small evaluator model reads the condition and transcript, decides whether it has been met, and either allows the session to finish or asks Claude to continue.

```text
/goal all tests under test/auth pass and lint exits with code 0;
every round must print the commands and results; stop after 12 rounds
```

The evaluator does not call tools or independently inspect files. Evidence must therefore appear in the conversation. Use measurable conditions: tests pass, an error count reaches zero, a named artifact exists. “Make it excellent” is not a useful exit condition.

Auto mode and `/goal` are complementary. Auto changes permission handling inside a turn; `/goal` decides whether another turn is needed. Neither one performs verification for you.

### `/loop`: run when the clock says so

`/loop` creates a recurring task in the current session:

```text
/loop 5m check the current PR; if CI fails, inspect the log and fix it;
if new review feedback appears, address it
```

The session must remain open and the machine must remain running. An unexpired task can return when you resume the session. Recurring loops expire seven days after creation; the loop runs one final time and is then deleted. The minimum interval is one minute.

Choose accordingly:

- measurable endpoint and continuous progress: `/goal`;
- short-lived polling inside this session: `/loop`;
- automation that must survive the terminal or machine: Routines, Desktop scheduled tasks, or GitHub Actions.

Unattended execution needs stronger limits, not weaker ones. Give it a deadline, a cost boundary, an exit condition, and a clear escalation path.

---

## Change 10 | Treat Routines as Independent Automation

Routines are persistent automations for Claude Code on the web. They can run on schedules, API calls, or GitHub events in Anthropic-managed cloud environments. Unlike `/loop`, they do not depend on the current terminal session or your laptop staying awake.

Good routine candidates include:

- daily issue or feedback triage;
- scheduled repository maintenance;
- review and remediation triggered by a GitHub event;
- work against committed cloud state and configured connectors.

Poor candidates include:

- tasks that need an uncommitted local checkout or local database;
- sensitive actions that require interactive human approval;
- loops with no cost ceiling or stopping condition;
- workflows whose correctness depends on an undocumented machine state.

Before creating one, write a short operating contract:

```text
Trigger:
Inputs:
Allowed systems:
Expected artifact:
Verification:
Maximum scope:
Escalation condition:
```

The contract is more valuable than the schedule. It lets someone else understand why the automation ran, what it was allowed to touch, and what evidence should exist afterward.

---

## The Order I Would Actually Use

If I had two hours tonight, I would not begin with a fleet:

1. **Add verification.** Find the real acceptance path for this kind of change.
2. **Clean CLAUDE.md.** Keep high-signal constraints resident and load long references on demand.
3. **Define permission boundaries.** Pre-authorize routine checks and explicitly deny dangerous operations.
4. **Plan high-cost decisions.** Expose migrations and security boundaries before editing.
5. **Isolate before parallelizing.** Give independent owners independent worktrees.
6. **Use `/goal` for a measurable endpoint.** Put evidence in the transcript.
7. **Use `/loop` for short polling.** Remember the open-session and seven-day limits.
8. **Use workflows for scale, not theatre.** Trial a small slice and inspect the orchestration.
9. **Move durable automation to Routines.** Define its trigger, scope, verification, and escalation.

The whole sequence fits into one sentence:

> First make one change verifiable. Then decide whether ten agents should do it in parallel.

Models will change. Commands, availability, and pricing will change. Reversible work, explicit trust boundaries, and evidence that survives the session will age more slowly.

---

## Official Sources and Review Date

This article was reviewed on **July 31, 2026** against the following official Claude Code and Anthropic documentation. Version, model, provider, and plan details can change; check the linked page before relying on a compatibility claim.

- [Permission modes: Plan, Auto, and their current boundaries](https://code.claude.com/docs/en/permission-modes)
- [Goals: how `/goal` evaluates completion](https://code.claude.com/docs/en/goal)
- [Scheduled tasks: `/loop`, seven-day expiry, and persistent alternatives](https://code.claude.com/docs/en/scheduled-tasks)
- [Worktrees: isolated parallel sessions](https://code.claude.com/docs/en/worktrees)
- [Subagents: context, tools, nesting, and permission inheritance](https://code.claude.com/docs/en/sub-agents)
- [Agent view: managing background sessions](https://code.claude.com/docs/en/agent-view)
- [Agent teams: shared tasks, messages, and teammate permissions](https://code.claude.com/docs/en/agent-teams)
- [Dynamic workflows: “use a workflow,” Ultracode, limits, and permission behavior](https://code.claude.com/docs/en/workflows)
- [Routines: cloud-hosted persistent automation](https://code.claude.com/docs/en/routines)
- [Sandboxing: defense beyond permission prompts](https://www.anthropic.com/engineering/claude-code-sandboxing)

Continue with [Write Your Prompt as a Loop](../prompt-loop-engineering-practice/), [The Agent Engineering Map](../agent-engineering-the-98-percent-harness/), [Context Is Not Prompt](../context-engineering-the-new-foundation/), and [How to Design a Skill Worth Having](../designing-valuable-agent-skills/).
