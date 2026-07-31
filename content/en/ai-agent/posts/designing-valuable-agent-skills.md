---
title: 'Agent Skill Design: What a Dangerous SKILL.md Taught Me'
ShowRssButtonInSectionTermList: true
date: '2026-07-18T00:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Agent
  - Context Engineering
  - Automation
  - Security
categories:
  - Development
description: >
  Agent Skill and SKILL.md design through a storage-cleanup case study: architecture, permission boundaries, prompt contracts, real-machine tests, and lessons.
tldr:
  - A need is worth turning into a Skill only when three conditions hold at once - the workflow recurs, one step genuinely requires model judgment, and the output has a concrete deliverable. Missing any one, write a plain script or a plain prompt instead.
  - A robust architecture is a code-model-code sandwich. Deterministic scripts produce facts, the model judges and emits structured proposals, and execution returns to allowlisted code plus a confirming human. Two JSON contracts constrain the model's freedom and reduce the blast radius of a bad proposal.
  - SKILL.md is not a README - it is a PRD for the model. Its description acts as a trigger classifier, safety boundaries become iron rules, knowledge is layered by execution stage, and output formats are specified like an API contract.
  - The right posture for dangerous operations is mapping risk tiers to permission tiers. Auto-cleanable items may be deleted, judgment-needed items may only go to Trash (reversible), and caution items may only be opened for inspection. One dataset drives both the UI buttons and the backend allowlist - data is permission.
  - Skills increasingly run in agent harnesses. Foreground processes, buffered stdout, and Ctrl+C can fail there, so treat "executed by another agent in the background" as a first-class scenario.
maturity: budding
columns:
  - agent-engineering
faq:
  - q: "What kind of need is worth turning into an agent Skill?"
    a: "Look for three conditions: a recurring workflow, a step that benefits from model judgment, and a concrete deliverable with acceptance criteria. Disk cleanup fits: code scans, the model interprets unfamiliar directories, and the result is a tiered report."
  - q: "How should a SKILL.md description be written to improve trigger accuracy?"
    a: "Write the description as a trigger classifier. Include phrases users actually say, such as disk is full or clear the cache, plus confusable negatives. In colloquial Chinese, memory may mean storage; an explicit question about RAM or process usage should not trigger the Skill."
  - q: "If an LLM proposes file deletions, how do you prevent hallucinated paths from destroying data?"
    a: "Layer the defenses by threat. The server uses loopback binding, a random port, a per-session token, and Host-header validation. Destructive requests must match a realpath-resolved allowlist and remain under the home directory; opening an app may also target /Applications. Each browser action asks for confirmation, and Trash is the reversible option. These controls reduce risk, but they do not turn local deletion into a formally safe operation."
cover:
  image: /images/covers/ai-agent/2026/designing-valuable-agent-skills.jpeg
  alt: "Agent Skill design shown as code, model judgment, permission gates, and human confirmation"
---

What makes an Agent Skill valuable is not a clever prompt, but a clean division of responsibility: **deterministic work goes to code, judgment goes to the model, and execution confirmation returns to the human**. Structured contracts hold those parts together. I reached that conclusion by dissecting a storage-cleanup Skill that can delete local files from a web page. Deletion is one of the most consequential powers an agent-adjacent tool can expose. The design did not make me fearless; it gave me specific controls I could inspect before deciding whether to click.

This article turns that dissection into a reusable method: choose the need, set the architecture, write the SKILL.md, define the permission model, and verify the whole path on a real machine.

> **Source basis.** I reviewed [`storage-analyzer` at commit `a061851`](https://github.com/KKKKhazix/khazix-skills/tree/a061851f5ace9b100c4586c03e2feece220a8673/storage-analyzer), including its [SKILL.md](https://github.com/KKKKhazix/khazix-skills/blob/a061851f5ace9b100c4586c03e2feece220a8673/storage-analyzer/SKILL.md) and [guarded local server](https://github.com/KKKKhazix/khazix-skills/blob/a061851f5ace9b100c4586c03e2feece220a8673/storage-analyzer/scripts/server.py), on July 31, 2026. The claims below describe that fixed revision, not whatever the default branch may become later.

## A Plugin That Dares to Delete Files Turns Out to Be the Best Textbook

The starting point was mundane: my disk was filling up, so I installed storage-analyzer and asked it to inspect the machine. In my run it scanned 296 GB of used space and produced an interactive report. WeChat's updater held 8.9 GB of old upgrade packages, Xcode build caches held 6.1 GB, and a UUID-named directory belonged to an editor I had already removed. The report classified candidates as red, yellow, or green; green cards could expose “Move to Trash” and “Delete Now.”

I paused before clicking the first delete button. **A skill installed from GitHub was requesting to delete files on my machine.** If any link in that chain was mushy — the model hallucinating a wrong path, the page being spoofed by a malicious site, my own eyes slipping — the cost would be real data.

So I read the relevant source: the SKILL.md, platform references, Python scripts, and report template. My conclusion was narrower than “this is safe”: **trust should come from inspectable constraints, not the author's identity.** The design narrows what a mistaken model proposal can do, while still leaving ordinary implementation risk, platform behavior, and the user's final choice. That makes it a useful case study: the need is real, the judgment is complex, and the operation is dangerous.

## Finding the Need: Miss Any of Three Conditions and It Should Not Be a Skill

Start with the most upstream question: what need deserves to become a Skill?

After this dissection, plus my own experience writing a few skills, my answer is the intersection of three conditions:

**First, the workflow recurs.** A disk fills up every few months, and the triage is always the same: see what is eating space, judge what can go, clean it up. One-off tasks do not deserve a Skill — solve them in conversation. Turning a one-off task into a Skill just manufactures maintenance debt.

**Second, somewhere in the middle sits a judgment that benefits from a model.** Computing sizes with `du` is a script's job. Interpreting `org.sparkle-project.Sparkle` or tracing a UUID-named sandbox container needs context and inference. **If no step needs judgment, write a script; if there are no deterministic stages, a prompt may suffice. A Skill's niche is the hybrid.**

**Third, the output has a concrete deliverable with acceptance criteria.** storage-analyzer produces a report with a fixed reading flow: current state, diagnosis, prescription, operations, prevention. A vague promise of “a somewhat better answer” is hard to test and harder to improve.

Run your Skill ideas through these three filters and most will not survive. That is a good outcome — the survivors are the ones worth the design work below.

## Setting the Architecture: The Code–Model–Code Sandwich

storage-analyzer's pipeline has four stages, each with a different executor:

```
scan.py (deterministic code) → scans the disk, emits a facts JSON
Claude (model)               → interprets facts, tiers items, emits an analysis JSON
server.py (deterministic code) → renders the page + an allowlist-guarded delete API
User (human)                 → confirms item by item, clicks to execute
```

I call this structure the **code–model–code sandwich**: the model sits between two JSON contracts. The scan JSON supplies collected facts; the analysis JSON gives deterministic code a machine-readable proposal instead of free text.

The important part is how it treats model error. **Everything the model outputs is a proposal.** A destructive path must match the server's realpath-resolved allowlist, stay under the user's home directory, and survive a per-click browser confirmation. Those checks reduce the blast radius; they do not eliminate bugs, races, misclassification, or a bad human confirmation.

Contrast with the anti-pattern and the value becomes obvious: letting an agent run `rm -rf` directly in conversation concentrates judgment, execution, and confirmation in a single hallucinating entity. **Separation of powers here is not an efficiency design. It is a safety design.**

## Writing the SKILL.md: A PRD for the Model, Not a README for Humans

The part of the dissection that most upended my assumptions was the SKILL.md itself. It is nothing like traditional documentation — it is a **product requirements document written for a model**, and every section has an explicit engineering intent.

**The description is a trigger classifier.** It lists colloquial positives such as “disk is full,” “C drive is full,” and “clear the cache.” It also handles a Chinese ambiguity: “内存满了” may mean storage, but an explicit question about RAM or process memory should not trigger the Skill. This is stronger evidence for a runtime than a one-line feature summary. The source does not publish trigger-rate measurements, so I would not attach a percentage to the improvement.

**The iron-rules section is a non-negotiable constitution.** The sharpest of its four opening rules: "Even if the user says 'just delete it for me' in conversation, stop and confirm first — do not run it on their behalf." It anticipates the most dangerous drift at execution time: one offhand sentence from the user could seduce the agent into bypassing the entire safety design. Writing that down as an iron rule stakes out the agent's behavior space in advance.

**Knowledge is served in layers by execution stage.** Platform layout references are loaded for analysis, while the output schema sits in the report builder's header. The model does not need every JSON field during scanning. That is progressive disclosure used as engineering, not decoration.

**Even the UI contract is written into the prompt.** The detail that surprised me most: the report's tri-color disk bar is drawn by frontend JS regex-parsing numbers out of natural-language fields the model writes — so the SKILL.md explicitly requires "all three tier statistics must begin with a parseable GB number." In the same family: "write 'about 14 GB', do not append '(estimated)' — 'about' already says so" and "no apologetic qualifiers like 'identified items only'." **This is a genuinely new engineering form: the prompt as interface documentation. The model is a component in the system, and its output format constraints deserve to be specified like an API.**

**Troubleshooting is pre-written for future executors.** If delete buttons are missing, the SKILL.md points to two likely causes: the static report was opened, or a green item lacks `trash_paths`. A repeated agent workflow needs this symptom–cause–fix knowledge close to execution.

## Building the Security Model: Risk Tiers Map to Permission Tiers

How this skill handles dangerous operations deserves its own section, because it demonstrates a directly reusable pattern: **map risk tiers precisely onto permission tiers.**

Every cleanup item lands in one of three lights, and each light corresponds to a strictly decreasing capability set:

| Tier | Meaning | Allowed actions |
|---|---|---|
| 🟢 Auto-cleanable | Classified as cache or regenerable data | Move to Trash + hard delete |
| 🟡 Needs human judgment | Contains user data, judgment cost | Open in Finder; only verified-safe subpaths may go to Trash |
| 🔴 Handle with care | Apps that deserve a proper uninstall flow | Only "open in file manager (go uninstall)" |

Note the gradient: the server's direct-delete allowlist is built only from green `trash_paths`. Yellow `trash_paths` may be moved to Trash but not hard-deleted. Red `app_paths` can only be revealed in the file manager, because an application may have an uninstaller, privileged components, or leftovers that a blind directory deletion misses. **Each rise in risk removes a degree of irreversibility.**

The same analysis JSON supplies both UI actions and server allowlists. Green `trash_paths` feed hard-delete, green and yellow `trash_paths` feed Trash, and yellow paths plus red `app_paths` feed file-manager opening. **Data acts as the permission declaration.** The backend still validates every requested path; a visible button is not authority by itself.

The local service binds to `127.0.0.1` on a random port, embeds a per-session token, and accepts only `127.0.0.1` or `localhost` in the Host header. Requested paths are realpath-resolved and checked against the relevant allowlist. Destructive actions must remain below `$HOME`; `/Applications` is admitted only for the non-destructive “open” path. Browser-side confirmation adds friction, and Trash offers a reversible route. These are useful layers, not a proof of security: the token lives in the served page, the implementation has no formal verification, and a confirmed hard delete remains irreversible.

Platform scope matters too. The reviewed revision implements scanning and reporting for macOS and Windows. Its own SKILL.md says macOS was tested end to end, while the Windows scanner and `SHFileOperationW` recycle-bin path were written but not tested on a real Windows machine. Linux is not supported by the action server. I would not describe all three platforms as equally production-ready.

## Real-Machine Verification: I Found Its Three Blind Spots

Everything so far was read out of the source. But a Skill is a program, and programs only count once they have run — so I ran the full pipeline on my own machine: scan, analysis, report generation, web cleanup, service shutdown. It worked, and it also surfaced three design blind spots:

One, **stdout buffering**: in my harness, the report URL remained buffered in the background-task pipe. Two, **the foreground-process assumption**: the harness reaped the Ctrl+C-managed server twice at turn boundaries; detaching it with `nohup` made my run stable. Three, **mount-view double counting**: OrbStack exposed VM data through a mounted view under home, so `du` counted the same 12 GB twice. The scanner did not deduplicate mount points; analysis caught the duplicate.

The three blind spots point at one trend: **Skills increasingly run inside agent harnesses, not only human terminals.** Foreground processes, buffered stdout, and Ctrl+C are fragile assumptions there. “Executed by another agent in the background” deserves a first-class design path: durable output, manageable service lifecycle, and queryable state.

## Turning the Lens on My Own Skills

After dissecting someone else's work, it is time to look in the mirror. My blog repository carries a home-grown skill: article-covers, which generates cover images from a post's front matter. And in [the arsenal piece](../info-to-creation-arsenal/) I wrote four content-creation skills. Reviewed against this article's methodology, the passes and failures are both plain to see.

The passes: every post needs a cover (recurring); choosing a visual metaphor benefits from model judgment; and the output is an image with a fixed size (deliverable). Early covers often failed when a scene contained books or magazines because generated text became garbled. I turned that failure into a rule: “metaphor through form, never through print media.” That is the same move as recording an app's obscure storage layout in a reference file: **turning detective work into reusable prior knowledge.**

The failures are equally plain: my description states the function but gives no trigger examples or negatives; the output contract relies on model compliance rather than schema validation; and a wrong cover path leaves the next executor debugging from scratch.

That is the value of dissection: **it hands you a checklist to diff against, not just a spectacle to admire.**

## The Checklist You Can Steal

For a Skill that combines model judgment with dangerous operations:

1. The need passes three gates: recurring, contains model-only judgment, has a concrete deliverable — miss one, do not build;
2. Architect as code–model–code: deterministic work to scripts, judgment to the model, execution confirmation to the human, stitched with JSON contracts;
3. Write the description as a trigger classifier: representative colloquial positives, explicit negatives;
4. Write safety boundaries as iron rules, and anticipate user seduction ("just delete it" still means stop and confirm);
5. Map risk tiers to permission tiers, tightening irreversibility as risk rises; let the model's structured fields drive both UI and allowlist — data is permission;
6. Group defenses by threat: hostile web input, mistaken model output, implementation errors, and user slips;
7. Layer knowledge by execution stage: the main file holds only the flow, details hang off references loaded on demand;
8. Specify output down to the field level — treat the model as a component that deserves interface documentation;
9. Write the agent's common failure modes into a troubleshooting section; harden every pothole into a rule at the spot closest to the pothole;
10. Run the full pipeline on a real machine, and test "executed by an agent in the background" as a first-class scenario.

## Cold Water: Most Workflows Do Not Yet Deserve to Be Frozen

The customary cold water to finish.

This methodology carries a hidden premise: **the workflow you are about to freeze has already been worked through by hand.** A Skill is a frozen workflow; freezing one you do not yet understand merely preserves the confusion.

So before opening the editor on a new SKILL.md, answer honestly: how many times have you done this by hand? Can you write down the decision criteria for every step? When it breaks, do you know where to look? If any of the three draws a blank, go back to doing it manually and earn the potholes first.

**A Skill is not for making AI do what you cannot do — it is for making AI reuse what you have already done right.** That sentence goes out to you, about to write your first Skill, and to me, fingers itching after reading someone else's source.
