---
title: 'How to Design a Skill Worth Having: I Dissected a Plugin That Dared to Delete My Files'
ShowRssButtonInSectionTermList: true
date: '2026-07-18T00:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['Claude Code', 'Skills', 'Agent Skills', 'SKILL.md', 'agent engineering', 'context engineering', 'security model', 'allowlist', 'plugin design', 'storage-analyzer', 'LLM applications', 'human-AI collaboration']
tags:
  - AI
  - LLM
  - Agent
  - Context Engineering
  - Automation
description: >
  More and more people are writing Skills for agents, but most Skills never rise above a repackaged prompt. This article starts from a storage-cleanup skill that dares to delete local files with one click in a web page, and fully dissects how a genuinely valuable Skill gets designed: how to find a need worth building for, how to divide responsibility among code, model, and human, how to map risk tiers onto permission allowlists, and how to write UI contracts and troubleshooting playbooks straight into the prompt. At the end I turn the methodology back on my own skills and leave a design checklist you can steal.
tldr:
  - A need is worth turning into a Skill only when three conditions hold at once - the workflow recurs, one step genuinely requires model judgment, and the output has a concrete deliverable. Missing any one, write a plain script or a plain prompt instead.
  - The architecture of a good Skill is a code-model-code sandwich. Deterministic scripts produce facts, the model only judges and emits structured proposals, and execution always returns to allowlisted code plus a confirming human. Two JSON contracts clamp the model's freedom, structurally capping the blast radius of hallucination.
  - SKILL.md is not a README - it is a PRD written for the model. The description should be a trigger classifier with exhaustive positive and negative examples, safety boundaries become non-negotiable iron rules, knowledge is layered by execution stage, and even output field formats and tone are specified like an API contract.
  - The right posture for dangerous operations is mapping risk tiers to permission tiers. Auto-cleanable items may be deleted, judgment-needed items may only go to Trash (reversible), and caution items may only be opened for inspection. One dataset drives both the UI buttons and the backend allowlist - data is permission.
  - The runtime for Skills is migrating from human terminals to agent harnesses. Foreground processes, stdout, and Ctrl+C are interaction assumptions designed for humans that shatter in the new runtime. Treat "executed by another agent in the background" as a first-class scenario.
maturity: budding
columns:
  - agent-engineering
faq:
  - q: "What kind of need is worth turning into an agent Skill?"
    a: "Only needs that satisfy three conditions at once: the workflow will be executed repeatedly (one-off tasks are better solved in plain conversation); somewhere in the middle there is a step only a model can judge (otherwise a script is more reliable); and the output has a concrete deliverable with acceptance criteria (otherwise you cannot tell whether the Skill works). Disk cleanup is the canonical example: scanning is a script's job, judging whether a directory is safe to delete requires world knowledge, and the deliverable is a tiered cleanup report."
  - q: "How should a SKILL.md description be written to improve trigger accuracy?"
    a: "Write the description as a trigger classifier, not a one-line feature summary. Enumerate the colloquial phrasings users actually say as positive examples (for storage cleanup: disk is full, C drive is full, clear the cache, what is eating my space), and explicitly list confusable negative examples (in colloquial Chinese, memory usually means storage - but when the user clearly means RAM and process usage, do not trigger). Exhaustive positives plus explicit negatives beat a plain summary by an order of magnitude."
  - q: "If an LLM proposes file deletions, how do you prevent hallucinated paths from destroying data?"
    a: "Layer the defenses and assign each layer to a distinct adversary. Against external attackers: loopback-only binding, a random port, a per-session token, and Host header validation. Against model hallucination: a realpath-resolved path allowlist plus a home-directory boundary guard, so any path outside the allowlist or the user directory is rejected outright. Against user slips: a per-click browser confirmation, defaulting to the reversible Trash rather than hard deletion. The model only ever produces proposals; execution authority stays with validating code and a confirming human."
cover:
  image: /images/covers/ai-agent/2026/designing-valuable-agent-skills.jpeg
  alt: "How to Design a Skill Worth Having: I Dissected a Plugin That Dared to Delete My Files"
---

What makes a Skill genuinely valuable is not how clever its prompt is, but how cleanly it divides three things: **deterministic work goes to code, judgment goes to the model, and execution confirmation returns to the human** — stitched together with structured contracts. That conclusion comes from a full dissection I did recently: a storage-cleanup skill that dares to delete my local files with one click from a web page. Deleting files is among the most dangerous things an agent can do, and this skill moved me from instinctive suspicion to clicking with confidence — entirely through design.

This article reconstructs that dissection into a reusable method: finding the need, setting the architecture, writing the SKILL.md, building the security model, verifying on a real machine — and finally turning the same lens back on skills I have written myself.

## A Plugin That Dares to Delete Files Turns Out to Be the Best Textbook

The starting point was mundane: my disk was filling up, so I installed [storage-analyzer, open-sourced by Khazix](https://github.com/KKKKhazix/khazix-skills), and asked it to clean my machine. It scanned 296 GB of used space and produced an interactive web report: WeChat's updater was hoarding 8.9 GB of stale upgrade packages, Xcode build caches held 6.1 GB, and a mysterious UUID-named directory turned out to be leftovers from an editor I had already uninstalled — every item tagged red, yellow, or green, with the green ones sporting "Move to Trash" and "Delete Now" buttons right there on the page.

I paused before clicking the first delete button. **A skill installed from GitHub was requesting to delete files on my machine.** If any link in that chain was mushy — the model hallucinating a wrong path, the page being spoofed by a malicious site, my own eyes slipping — the cost would be real data.

So I read its entire source: the SKILL.md, two platform reference documents, three Python scripts, and a 497-line report template. The takeaway fits in one sentence: **this skill deserves trust not because its author is trustworthy, but because its architecture makes the untrusted links structurally incapable of causing harm.** That is exactly why it makes the best textbook — it pushes every question of "how should a valuable Skill be designed" to the limit: the need is real, the judgment is complex, and the operation is dangerous.

## Finding the Need: Miss Any of Three Conditions and It Should Not Be a Skill

Start with the most upstream question: what need deserves to become a Skill?

After this dissection, plus my own experience writing a few skills, my answer is the intersection of three conditions:

**First, the workflow recurs.** A disk fills up every few months, and the triage is always the same: see what is eating space, judge what can go, clean it up. One-off tasks do not deserve a Skill — solve them in conversation. Turning a one-off task into a Skill just manufactures maintenance debt.

**Second, somewhere in the middle sits a judgment only a model can make.** This is the most-missed condition. Computing directory sizes with `du` needs no intelligence — a script beats a model a hundred times over on reliability. But "what is this 8.9 GB directory called `org.sparkle-project.Sparkle`, and can it go?" requires world knowledge; "which app owns this UUID-named sandbox container?" requires detective work and inference — the model's comparative advantage. **If no step in the workflow genuinely needs judgment, write a script; if the whole thing is judgment with no deterministic stages, a prompt suffices. A Skill's ecological niche is precisely the hybrid.**

**Third, the output has a concrete deliverable with acceptance criteria.** storage-analyzer's deliverable is a report with a fixed reading flow: current state, diagnosis, prescription, operations, prevention. Only with a deliverable can you accept or reject; only with acceptance can you iterate. I have seen too many Skills whose output is "a somewhat better answer" — that is not a deliverable, that is astrology.

Run your Skill ideas through these three filters and most will not survive. That is a good outcome — the survivors are the ones worth the design work below.

## Setting the Architecture: The Code–Model–Code Sandwich

storage-analyzer's pipeline has four stages, each with a different executor:

```
scan.py (deterministic code) → scans the disk, emits a facts JSON
Claude (model)               → interprets facts, tiers items, emits an analysis JSON
server.py (deterministic code) → renders the page + an allowlist-guarded delete API
User (human)                 → confirms item by item, clicks to execute
```

I call this structure the **code–model–code sandwich**: the model is clamped between two JSON contracts. The upstream contract (the scan JSON) guarantees the model receives clean facts without running collection commands itself; the downstream contract (the analysis JSON schema) guarantees the model's output can be consumed directly by deterministic code, with no human parsing of free text.

The most elegant part of the sandwich is how it handles hallucination. Models hallucinate — that is a premise you cannot cure. But in this architecture, **everything the model outputs is merely a proposal.** Every deletion path it writes down must pass server.py's realpath allowlist check and the home-directory boundary guard, and then survive the per-click confirmation dialog in the browser. Hallucination is not eliminated; its blast radius is structurally capped.

Contrast with the anti-pattern and the value becomes obvious: letting an agent run `rm -rf` directly in conversation concentrates judgment, execution, and confirmation in a single hallucinating entity. **Separation of powers here is not an efficiency design. It is a safety design.**

## Writing the SKILL.md: A PRD for the Model, Not a README for Humans

The part of the dissection that most upended my assumptions was the SKILL.md itself. It is nothing like traditional documentation — it is a **product requirements document written for a model**, and every section has an explicit engineering intent.

**The description is a trigger classifier.** It enumerates trigger scenarios down to the colloquial level: "disk is full," "C drive is full," "clear the cache," "what's eating my space" — and it even handles a Chinese-colloquial ambiguity head-on: "内存满了" (memory is full) usually means storage and should trigger, but when the user clearly means RAM ("which process is eating memory"), do not trigger. Exhaustive positives plus explicit negatives — that is writing a description as a classifier. Most people write one line ("analyzes disk usage") and their trigger rate suffers by an order of magnitude.

**The iron-rules section is a non-negotiable constitution.** The sharpest of its four opening rules: "Even if the user says 'just delete it for me' in conversation, stop and confirm first — do not run it on their behalf." It anticipates the most dangerous drift at execution time: one offhand sentence from the user could seduce the agent into bypassing the entire safety design. Writing that down as an iron rule stakes out the agent's behavior space in advance.

**Knowledge is served in layers by execution stage.** The SKILL.md proper is about a hundred lines, but it hangs three layers of load-on-demand content: platform data-layout references are read only at analysis time; the output schema lives in the script's header comment, consulted only when writing the report. Context is a scarce resource, and the model does not need to know JSON field names during the scanning stage — textbook progressive disclosure.

**Even the UI contract is written into the prompt.** The detail that surprised me most: the report's tri-color disk bar is drawn by frontend JS regex-parsing numbers out of natural-language fields the model writes — so the SKILL.md explicitly requires "all three tier statistics must begin with a parseable GB number." In the same family: "write 'about 14 GB', do not append '(estimated)' — 'about' already says so" and "no apologetic qualifiers like 'identified items only'." **This is a genuinely new engineering form: the prompt as interface documentation. The model is a component in the system, and its output format constraints deserve to be specified like an API.**

**Troubleshooting is pre-written for future executors.** "No delete buttons on the page = either you opened the static report, or a green item is missing `trash_paths`" — the author has clearly run this many times and knows the two mistakes an agent most commonly makes, so symptom, cause, and fix are written down in advance. A Skill is a program that gets executed repeatedly; its bugs manifest in agent behavior, and the fix is editing the prompt.

## Building the Security Model: Risk Tiers Map to Permission Tiers

How this skill handles dangerous operations deserves its own section, because it demonstrates a directly reusable pattern: **map risk tiers precisely onto permission tiers.**

Every cleanup item lands in one of three lights, and each light corresponds to a strictly decreasing capability set:

| Tier | Meaning | Allowed actions |
|---|---|---|
| 🟢 Auto-cleanable | Pure cache, regenerable, no data loss | Move to Trash + hard delete |
| 🟡 Needs human judgment | Contains user data, judgment cost | Open in Finder; only verified-safe subpaths may go to Trash |
| 🔴 Handle with care | Apps that deserve a proper uninstall flow | Only "open in file manager (go uninstall)" |

Note the gradient: yellow can never be hard-deleted, only moved to the reversible Trash; red does not even get a Trash button — app uninstalls involve bundled uninstallers, leftovers, and admin privileges, so deleting on the user's behalf in the background is unsound. The right move is to **escort** the user to the right place (reveal the .app in Finder) and let them finish the last step themselves. **Each step down in permission tightens irreversibility by one notch.**

More elegant still: the same analysis JSON drives both the UI and the permissions. The `trash_paths` field decides whether a button appears on the page and is simultaneously the sole source of the backend deletion allowlist. **Data is the permission declaration** — there is no possible skew where the frontend shows a button the backend rejects, or the backend can delete something the frontend never displays.

Around all this stand seven locks in total, assigned by adversary: loopback-only binding, random port, session token, and Host header validation against external attackers; the realpath allowlist and home-directory guard against model hallucination; per-click confirmation and Trash-first defaults against user slips. Three classes of adversary, three groups of countermeasures, and not one lock is redundant.

## Real-Machine Verification: I Found Its Three Blind Spots

Everything so far was read out of the source. But a Skill is a program, and programs only count once they have run — so I ran the full pipeline on my own machine: scan, analysis, report generation, web cleanup, service shutdown. It worked, and it also surfaced three design blind spots:

One, **stdout buffering**: the server prints its report URL with `print`, which gets swallowed by block buffering in an agent's background-task pipe — the agent simply cannot read the URL. Two, **the foreground-process assumption**: the server is designed to "run in foreground, stop with Ctrl+C," a mental model for humans at terminals; the agent harness's background-task manager reaped the process twice at turn boundaries, and only `nohup` detaching stabilized it. Three, **mount-view double counting**: OrbStack exposes its VM data as a mounted view directory under home, so `du` counted the same 12 GB twice — the scanner has no mount-point deduplication, and only the model's analysis-stage detective work caught it.

The three blind spots point at one trend: **the runtime for Skills is migrating from human terminals to agent harnesses.** Foreground processes, stdout, Ctrl+C — interaction assumptions designed for humans will shatter one by one in the new runtime. Writing a Skill today, "executed by another agent in the background" is not an edge case; it is a first-class scenario — outputs should land in files, services should be daemonizable, state should be queryable.

## Turning the Lens on My Own Skills

After dissecting someone else's work, it is time to look in the mirror. My blog repository carries a home-grown skill: article-covers, which generates cover images from a post's front matter. And in [the arsenal piece](../info-to-creation-arsenal/) I wrote four content-creation skills. Reviewed against this article's methodology, the passes and failures are both plain to see.

The passes: all three need conditions hold — every post needs a cover (recurring), "what visual scene should express this article's core metaphor" is model-only work (judgment), and the output is an image at a fixed size spec (deliverable). It has also walked the pothole-to-rule path: early covers kept failing because whenever the scene contained a printable surface — books, magazines — the image model would inevitably print garbled text on it. That lesson got hardened into a rule inside the skill ("metaphor through form, never through print media"), which is the same move as storage-analyzer writing "Bilibili offline videos hide inside a UUID container" into its reference docs: **turning one-time detective cost into permanent prior knowledge.**

The failures: measured against this dissection, my description states the function but enumerates no trigger phrasings, let alone negatives; my output contract relies on the model's good behavior instead of schema validation; and there is no troubleshooting section — if one run writes a wrong cover path, the next agent executing the skill has to debug from scratch. All debts I can clear this week.

That is the value of dissection: **it hands you a checklist to diff against, not just a spectacle to admire.**

## The Checklist You Can Steal

Condensing the whole article into one list. If you are writing a "dangerous operations + model judgment" Skill:

1. The need passes three gates: recurring, contains model-only judgment, has a concrete deliverable — miss one, do not build;
2. Architect as code–model–code: deterministic work to scripts, judgment to the model, execution confirmation to the human, stitched with JSON contracts;
3. Write the description as a trigger classifier: exhaustive colloquial positives, explicit negatives;
4. Write safety boundaries as iron rules, and anticipate user seduction ("just delete it" still means stop and confirm);
5. Map risk tiers to permission tiers, tightening irreversibility as risk rises; let the model's structured fields drive both UI and allowlist — data is permission;
6. Group defenses by adversary: external attackers, model hallucination, user slips — three risks, three countermeasure sets;
7. Layer knowledge by execution stage: the main file holds only the flow, details hang off references loaded on demand;
8. Specify output down to the field level — treat the model as a component that deserves interface documentation;
9. Write the agent's common failure modes into a troubleshooting section; harden every pothole into a rule at the spot closest to the pothole;
10. Run the full pipeline on a real machine, and test "executed by an agent in the background" as a first-class scenario.

## Cold Water: Most Workflows Do Not Yet Deserve to Be Frozen

The customary cold water to finish.

This methodology carries a hidden premise: **the workflow you are about to freeze has already been run through by hand, many times.** storage-analyzer's author has clearly cleaned countless disks — that is how they know where WeChat hides its upgrade packages, how to trace a UUID container, and at which step a user will say "just delete it." A Skill is a frozen workflow; freezing a workflow you have never completed merely automates the chaos.

So before opening the editor on a new SKILL.md, answer honestly: how many times have you done this by hand? Can you write down the decision criteria for every step? When it breaks, do you know where to look? If any of the three draws a blank, go back to doing it manually and earn the potholes first.

**A Skill is not for making AI do what you cannot do — it is for making AI reuse what you have already done right.** That sentence goes out to you, about to write your first Skill, and to me, fingers itching after reading someone else's source.
