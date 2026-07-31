---
title: 'Designing devbox-doctor: A Safer Mac Toolchain Audit'
ShowRssButtonInSectionTermList: true
date: '2026-07-18T13:30:00+08:00'
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
  - DevOps
categories:
  - Development
description: >
  A design for auditing Mac developer tools with read-only evidence, bounded AI judgments, privacy safeguards, graceful fallbacks, and false-positive tests.
tldr:
  - >-
    Developer machines accumulate three kinds of debt: tools that appear dormant, overlapping toolchains that may or may not conflict, and data left behind after an uninstall. None can be judged safely from a filename alone.
  - >-
    `mdls` can expose Spotlight metadata, but Apple only documents `kMDItemLastUsedDate` in the context of items opened through Launch Services. A missing value means no value is available from that source; it does not prove that an app was never used.
  - >-
    The design follows a code-model-code boundary: a read-only collector emits facts, the model writes evidence-backed proposals, and a narrow executor acts only after confirmation.
  - >-
    Alternative-tool cards cite official project documentation or release pages, record when they were checked, and state migration costs and reasons to stay. They are research notes, not verdicts.
  - >-
    The system is evaluated primarily on false positives. Missing permissions and unavailable tools reduce coverage and confidence; they must never make a machine look healthier.
maturity: seedling
columns:
  - agent-engineering
faq:
  - q: "How can I check when a Mac app was last used?"
    a: "The built-in mdls command can read Spotlight attributes such as kMDItemLastUsedDate and kMDItemUseCount when those attributes exist. They are not a complete app-launch history. A missing value may reflect indexing, launch path, migration, or metadata coverage, so it must not be interpreted as proof that an app was never used."
  - q: "What is the difference between an overlapping toolchain and a conflict?"
    a: "Overlap means that two installed tools serve a similar purpose. Conflict requires evidence that they compete for something concrete, such as a PATH shim, shell initialization block, default file association, port, proxy, or runtime. Coexistence alone is not a defect."
  - q: "How should an AI recommend replacement software responsibly?"
    a: "Treat each recommendation as a dated, reviewable research note. Use official sources, compare only verified capabilities, show local constraints and migration cost, and include a reason to keep the current tool. A recommendation must never enter the cleanup queue automatically."
cover:
  image: /images/covers/ai-agent/2026/devbox-doctor-design.jpeg
  alt: "Designing devbox-doctor, a safer Mac toolchain audit"
---

I am building a developer-machine checkup skill called **devbox-doctor**. The idea sounds simple: inventory a Mac, identify tools that may no longer earn their keep, find actual toolchain conflicts, and trace data left behind by uninstalled apps.

The dangerous word in that sentence is *identify*. A scanner can prove that two tools are installed. It cannot prove that one is useless. A directory can resemble an app's name. That does not make the directory safe to delete. Spotlight can return no last-used date. That does not mean the app was never opened.

So this is not a design for an AI janitor with a large broom. It is a design for a cautious investigator: collect facts locally, state what each fact can and cannot prove, ask the model for bounded hypotheses, and leave consequential decisions to the person who owns the machine.

[In the previous article](../designing-valuable-agent-skills/) I studied a storage-cleanup skill and arrived at a simple division of labor: code handles repeatable facts; the model handles contextual judgment; code enforces the final safety boundary. devbox-doctor is where that principle meets a messier question: not “how large is this file?” but “why is this tool still here?”

## The Need Came Out of My Own Disk

The idea began during a 296 GB disk audit. Four findings kept bothering me:

- Docker Desktop and OrbStack were both present, with sizeable data stores, although I used only one in my daily work;
- Trae had been removed, but its support data still occupied several gigabytes;
- pyenv still held multiple Python installations while newer projects used a different workflow;
- several editors, terminals, and utilities looked as though they had been installed for an experiment and then forgotten.

The pattern was familiar. Developers install tools quickly because trying a tool is part of the job. Uninstalling is different: it is deferred maintenance with little immediate reward. Every framework migration and every “this changed my workflow” recommendation leaves sediment—old runtimes, duplicate CLIs, login items, caches, and half-migrated configuration.

A cleanup utility can count bytes. It cannot answer the more interesting question: **is this duplication deliberate, transitional, or accidental?** That question needs context, but context is precisely where an overconfident model can cause damage. The product has to make useful judgment possible without pretending that uncertainty has disappeared.

## Why This Deserves a Skill

I use three gates before turning an idea into a skill.

**Does the debt recur?** Yes. Installing software is routine; auditing the inventory is rare. The debt grows one reasonable decision at a time.

**Is there real judgment involved?** Yes, but the model's role needs careful wording. Rules can detect that OrbStack and Docker Desktop coexist, or that two shell initializers both edit `PATH`. A model can explain likely intent, ask for missing context, and distinguish a migration from an ongoing conflict. It should not label software “good,” “bad,” or “obsolete” from popularity and memory.

**Is there a concrete deliverable?** Yes: an evidence-backed report with facts, proposals, uncertain findings, and a separate upgrade-watch section. Every local conclusion should link back to observed evidence. Every time-sensitive ecosystem claim should link to an official source and a verification date.

The skill passes all three gates. The safety design starts with the collector.

## The Data Layer: Evidence, Not Surveillance

Scanning is read-only by default. More importantly, the design does not pretend macOS contains one complete, auditable usage ledger. It contains several partial sources with different failure modes.

```text
scan.py collects facts in layers
├── System baseline (available without a package manager)
│   ├── /Applications, ~/Applications, and app Info.plist data
│   ├── read-only output from mdls, du, ps, and launchctl
│   └── LaunchAgents and LaunchDaemons file inventories
├── Optional probes (run only when their commands exist)
│   ├── Homebrew: list, leaves, and autoremove --dry-run
│   ├── npm, pipx, cargo, and other global package inventories
│   └── pyenv, nvm, rustup, and other manager state
└── Corroborating evidence
    ├── bundle IDs, receipts, code signatures, and paths
    ├── Containers, Application Support, and Caches directories
    └── current processes, login items, daemons, and listening ports
```

That division matters. `mdls`, `ps`, and `launchctl` are part of the macOS baseline. Homebrew is not. If `brew`, `npm`, or a version manager is absent, the corresponding probe is skipped and the baseline report still completes. The tool must never recommend installing a package manager merely to improve its own scan.

Homebrew also has two easily confused concepts. The [official Homebrew manpage](https://docs.brew.sh/Manpage) defines `brew leaves` as installed formulae that are not dependencies of another installed formula or cask. A leaf can be a tool the user explicitly installed and still relies on; it is not an “orphan dependency” list. `brew autoremove --dry-run` is the relevant preview for formulae that were installed as dependencies but are no longer needed. Even that output remains a proposal. The report shows the exact candidates and asks for confirmation before any later execution.

Spotlight metadata needs the same discipline. Apple's documentation says [`kMDItemLastUsedDate`](https://developer.apple.com/documentation/coreservices/kmditemlastuseddate) is updated when an item is opened through Launch Services. That does not promise coverage for command-line launches, background activation, remote calls, or every kind of in-app activity. `kMDItemUseCount` may be present, but the design does not call it an authoritative lifetime launch counter.

Therefore, `null` has one defensible meaning: **this metadata source has no value to return**. Indexing settings, index rebuilds, migration, launch path, or the metadata importer can all affect what is available. A directory modification time is not proof of human use either; an updater or background sync may have touched it.

devbox-doctor can call an app “possibly dormant” only when independent sources point the same way—for example, old Spotlight metadata, no running process or service, and no recent activity in a strongly associated app-data directory. Contradictory or single-source evidence goes to **uncertain**, never to an action queue. Shell history is not used by default: the privacy cost and accidental secret exposure outweigh the weak evidence it would add.

## “Installed Together” Is Not the Same as “In Conflict”

Once the collector emits facts, the model classifies them into four distinct conditions:

- **Overlapping tools:** two products occupy a similar niche. This is an inventory fact, not a problem by itself.
- **Configuration conflicts:** two tools compete for a concrete resource such as a `PATH` shim, shell initialization, default file association, proxy, port, or runtime. The report must show the contested resource.
- **Resident resources:** login items, LaunchAgents, daemons, menu-bar processes, and background services. Residency is measured separately; it is not treated as evidence of harm.
- **Possible uninstall residue:** the original application is absent, while related data remains. The relationship needs its own confidence score.

This distinction prevents an easy but costly mistake. Docker Desktop and OrbStack being installed together may be intentional. pyenv, conda, and uv have overlapping capabilities, but they are not interchangeable in every project. A conflict exists only when the machine provides evidence of contested configuration or when the user's stated goal requires consolidation.

Residue matching is similarly bounded:

| Confidence | Evidence | Report behavior |
|---|---|---|
| High | Exact bundle-ID or declared container match; receipt payload identifies the path | Add to a review list, never delete automatically |
| Medium | Team ID, vendor, and path structure agree, with no installed app known to reference it | Show the evidence and suggest a Finder review |
| Low | Only a directory name, icon name, or fuzzy string resembles the app | Display only; no delete control |
| Uncertain | Shared vendor directory, missing signature, incomplete receipt, or conflicting evidence | Mark “cannot attribute” and keep by default |

Shared directories deserve special suspicion. Homebrew's own manpage warns that cask `zap` artifacts may remove resources shared with other applications. A matching vendor name is not enough to establish ownership.

The report uses four sections rather than traffic lights that imply certainty:

| Section | Meaning | Action |
|---|---|---|
| Facts | Installed tools, resident services, disk use, and configuration claims | Read-only |
| Proposals | High-confidence residue, reproducible conflicts, or well-supported dormancy | Evidence and counter-evidence; user confirms |
| Uncertain | Single-source, shared, or contradictory findings | Keep by default; explain how to gather more evidence |
| Upgrade watch | Same-niche options verified against official material | Research only; never part of cleanup |

## Recommendations Need Receipts and Expiry Dates

Recommendations are the easiest place for a useful audit to turn into generic tool hype. The remedy is not a more confident model. It is a stricter output contract:

1. **Cite only first-party material:** the project's official site, documentation, repository, or release page. Rankings and model memory may suggest what to investigate, but they cannot support the final card.
2. **Record local version, candidate version, source, and checked date.** Unknown information stays explicitly unknown. An expired card falls back to “needs re-verification.”
3. **Compare capabilities, not slogans.** Claims such as “ten times faster,” “more modern,” or “replaces five tools” are excluded unless the card includes a reproducible benchmark and scope.
4. **State migration cost and a reason to stay.** Configuration, plugins, licenses, team conventions, CI, private registries, and lockfiles are all part of the cost.
5. **Default to staying put for heavily used, paid, or organization-managed tools.** Existing constraints outrank trendiness unless the user has named a problem they want to solve.

For example, the official [uv documentation](https://docs.astral.sh/uv/) describes Python version, environment, package, and project-management capabilities. That makes uv relevant to several workflows; it does not prove that uv replaces pyenv, pipx, or conda on this particular machine. A useful card would first inspect the real project's lockfile, private indexes, CI, platform matrix, and environment requirements, then propose a reversible trial.

The same rule applies to fnm and mise. Their official documentation can establish supported behavior. It cannot establish universal startup speed or a painless migration on an unknown shell setup. devbox-doctor may present either as a dated candidate for a stated constraint; it may not announce a winner.

**A recommendation is perishable intelligence, not a decree.** The decision remains with the person who will live with the migration.

## Privacy and Permissions: Read-Only Can Still Leak

“It does not delete files” is not the same as “it is safe.” An inventory can reveal usernames, client names, private repository paths, internal domains, installed security products, and project structure. Process arguments and shell history may contain tokens or database credentials. A local report can leak if it binds to every interface or lands in a synced folder.

The default permission budget is deliberately small:

- do not request Full Disk Access;
- do not read Keychain, browsers, mail, chat data, file contents, full shell history, or full process arguments;
- redact paths before they enter a remote model, using stable placeholders when correlation is needed;
- keep raw scan JSON in a user-chosen local location and do not upload it by default;
- request an additional directory separately, explaining which judgment needs it and how long its data will be retained;
- bind any report server to loopback only, use an unguessable session token, and avoid writing reports into sync folders without explicit choice.

Graceful degradation is part of the product, not an error-message afterthought:

- if Spotlight is unavailable, app-use status becomes unknown while signatures, receipts, install dates, and current-runtime evidence remain;
- if Homebrew is absent, the package-manager section is skipped;
- without administrator privileges, the report still renders and privileged actions disappear;
- offline mode disables upgrade cards that need freshness checks and retains local facts;
- denied permissions reduce the displayed coverage and widen uncertainty; they never improve the health score.

The code-model-code boundary then limits execution. The collector emits facts. The model emits structured proposals, never shell commands. A narrow executor accepts only fixed operations on exact paths observed during the scan, rechecks identity before acting, and moves recoverable items to Trash only after confirmation. Shared, system, and uncertain paths never enter its allowlist.

## Measure False Positives Before Inventing a Health Score

“Two sources agree” sounds careful, but without an evaluation set it is only a slogan. I would test the system against human-reviewed machine snapshots covering at least:

- a normal single-tool setup;
- intentional coexistence and machines mid-migration;
- projects pinned to multiple runtime versions;
- shared vendor directories and renamed applications;
- disabled Spotlight and incomplete indexes;
- remote-development workflows;
- organization-managed software.

Reviewers must annotate the evidence behind each decision, not merely “keep” or “remove.” The primary metric is false-positive control:

| Task | Primary measure | Release gate |
|---|---|---|
| Actionable residue | Precision | 99% on the reviewed set; zero automatic actions on system or shared paths |
| Configuration conflict | Precision and reproducibility | Every claim names a resource the reviewer can verify |
| Long-term dormancy | False-positive rate | No single-source finding enters the proposal section |
| Upgrade recommendation | Source validity and freshness | 100% first-party sources; expired cards automatically downgraded |

Every collector, rule, or model change reruns the fixed set and preserves its failure cases. A health score is computed only from covered, explainable dimensions. Where coverage is incomplete, the report shows coverage and a confidence interval instead of laundering missing evidence into a perfect score.

## Keep the Workflow Stable and the Knowledge Alive

Tool ecosystems age faster than audit principles. A replacement that looks sensible today may be abandoned next year. So the volatile knowledge belongs outside the main instruction:

```text
devbox-doctor/
├── SKILL.md              # stable workflow and hard boundaries
├── references/
│   ├── macos.md          # metadata limits and residue rules
│   ├── stacks.md         # capabilities, official sources, versions,
│   │                     # and per-entry verification dates
│   └── judging.md        # evidence and recommendation standards
├── scripts/
│   ├── scan.py           # read-only facts → JSON
│   ├── build_report.py   # proposals → static report
│   └── server.py         # loopback-only review and allowed actions
└── assets/
    └── report_template.html
```

`SKILL.md` tells the model to read `stacks.md`, validate the source and checked date, and suppress cards beyond their freshness window. There should be no single universal expiry period: a fast-moving runtime or security tool may need review in 90 days, while a stable operating-system fact may remain useful for a year.

This is the distinction I missed when I first called a skill “a frozen workflow.” **The workflow can be stable while the knowledge stays alive.**

## A Blueprint, Not a Launch Announcement

This article describes a design, not a finished product. The system-level probes have been explored, and their blind spots have shaped the boundaries above. The difficult parts—classification accuracy, recommendation quality, permission UX, and false-positive behavior—still need repeated testing on real machines.

The upgrade section worries me most. Rules can filter unsafe or stale claims, but they cannot guarantee relevance. A technically correct suggestion can still waste an afternoon. The only honest answer is to read less by default, ask for purpose before widening the scan, and treat “stay with what already works” as a successful result.

Every developer machine becomes a small archaeology site. The goal of devbox-doctor is not to bulldoze it. The goal is to label the layers, admit what cannot be known, and help its owner decide what still belongs.
