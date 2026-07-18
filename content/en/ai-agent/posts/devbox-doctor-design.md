---
title: 'How Many of Your Mac Tools Are Fighting Each Other? I Designed a Dev-Machine Checkup Skill'
ShowRssButtonInSectionTermList: true
date: '2026-07-18T13:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['devbox-doctor', 'dev machine checkup', 'Claude Code', 'Skills', 'Agent Skills', 'developer tools', 'zombie apps', 'bloatware', 'toolchain audit', 'Homebrew', 'Spotlight', 'mdls', 'software alternatives', 'agent engineering', 'SKILL.md']
tags:
  - AI
  - LLM
  - Agent
  - Context Engineering
  - Automation
  - DevOps
description: >
  A programmer's computer is a graveyard of tools: editors once tried, container runtimes running side by side, three Python version managers, uninstalled apps that left gigabytes of residue behind. This article is the full design document for devbox-doctor - a dev-machine checkup skill for programmers. It uses Spotlight usage records as evidence to identify zombie apps, uses the model's world knowledge to detect toolchain stack conflicts and low-value software, then offers modern same-niche alternatives, all landing in a shareable checkup report. The article covers the complete repository structure, the data and judgment layer design, the restraint rules that keep recommendations from becoming shilling, and viral mechanics designed in as a first-class citizen.
tldr:
  - Three chronic diseases of a developer machine - zombie apps (installed, never opened again), stack conflicts (Docker Desktop coexisting with OrbStack, pyenv plus conda plus uv in parallel), and uninstall residue (app gone, gigabytes of data left). All three diagnoses require world knowledge, which is exactly the model's niche.
  - macOS Spotlight has been keeping books all along - mdls reads out every app's last-used date and use count, fully read-only. But null does not mean never used - zombie verdicts require multi-source evidence, not model gut feeling.
  - devbox-doctor inherits the code-model-code sandwich - read-only scans produce a facts JSON, the model does niche judgment and emits tiered proposals, and an allowlisted server plus a confirming human execute. Beyond the three lights there is a fourth zone, Upgrade Suggestions - not a deletion decision, but same-niche better options.
  - Recommendations are the easiest zone to fumble, so its rules are the strictest - only same-niche actively maintained tools, migration cost must be stated, a reason not to switch must be given, and never suggest replacing a paid tool in heavy use. A recommendation is intelligence, not a decree.
  - Tool-ecosystem knowledge rots, so judgment references live in a date-stamped stacks.md instead of being frozen into the prompt. That is the fundamental difference between a skill and an article - an article freezes at publish time, a skill's knowledge layer stays alive.
maturity: seedling
columns:
  - agent-engineering
faq:
  - q: "How do I check when a Mac app was last used?"
    a: "Use the built-in mdls command to read Spotlight metadata: mdls -name kMDItemLastUsedDate -name kMDItemUseCount /Applications/SomeApp.app shows the last-used date and cumulative use count, fully read-only with nothing to install. Note that null does not mean never used - some apps are not launched through Launch Services, so cross-check with other evidence such as the modification time of the app's data directories."
  - q: "What are zombie apps and stack conflicts on a developer machine?"
    a: "Zombie apps are software installed and then never opened again, still occupying disk and login items - typically editors tried once and forgotten, or old runtime versions. Stack conflicts are multiple functionally overlapping tools installed in the same niche, all consuming resources - typically Docker Desktop coexisting with OrbStack, pyenv plus conda plus uv managing Python in parallel, or nvm and n both claiming Node versions. Both accumulate gradually: every individual install had a reason, and the pile becomes debt that slows the machine down."
  - q: "How do you keep AI software recommendations from becoming irresponsible shilling?"
    a: "Constrain the conditions under which a recommendation may be produced instead of banning recommendations: only same-niche, actively maintained tools with a migration cost that can be concretely stated; every suggestion must also state a reason not to switch, so the user sees the trade-off rather than a verdict; and never suggest replacing a paid tool in heavy use - usage evidence outranks popularity. The recommendation's role is intelligence gathering: it lays out the current state of the category, and the decision stays with the human."
cover:
  image: /images/covers/ai-agent/2026/devbox-doctor-design.jpeg
  alt: "How Many of Your Mac Tools Are Fighting Each Other? I Designed a Dev-Machine Checkup Skill"
---

I have decided to build a dev-machine checkup skill for programmers, codename **devbox-doctor**. It scans your Mac read-only, uses Spotlight usage records and package-manager data as evidence, has the model diagnose three classes of problems — zombie apps, stack conflicts, uninstall residue — then offers modern same-niche alternatives, and finally produces a checkup report that is tiered in three lights, actionable with one click, and screenshot-shareable. This article is its complete design document: how the need was validated, how the data and judgment layers are divided, how to do recommendations without fumbling, and what the repository looks like.

[Last time](../designing-valuable-agent-skills/) I dissected a storage-cleanup skill that dared to delete my files and distilled a design methodology out of it. A methodology that never lands is just another bookmark — this article is its first full application, and the need was not invented. It grew out of my own machine.

## The Need Was Dug Out of My Own Disk

It started with that disk cleanup. After scanning 296 GB of used space, beyond the expected caches, a few report entries made me sit up:

- **Docker Desktop and OrbStack coexisting** — one holding a 4.4 GB virtual disk, the other 12 GB of data. Both are container runtimes; I use exactly one of them daily. The other is pure "forgot to see the predecessor out after switching tools";
- **Trae editor residue**: the app itself was uninstalled long ago, yet `Application Support` still held 2.5 GB and `~/.marscode` another 1.2 GB — the uninstall only ever finished halfway;
- **3.6 GB of Pythons hoarded inside pyenv**, while all my new projects this year have moved to uv;
- and a whole row of "installed, tried, never opened again" tools: several AI editors, several terminals, assorted utilities.

Put these together and a pattern surfaces: **a programmer's computer is a graveyard of tools.** We are the population that installs software the most eagerly and uninstalls it the most lazily. Every tech-stack decision, every tooling hype wave, every "this changed my workflow" post leaves a corpse on the machine: old runtimes, superseded CLIs, trial apps forgotten, half-migrated predecessors. Each individual install had its reason; the accumulation is tens of gigabytes of disk, a row of login items, and a you who can no longer quite say what is installed on your own machine.

And the problem has a subtle property: **it cannot be solved by "cleanup."** Clearing caches is manual labor; judging "should this tool still live on my machine" is brain work — it requires knowing what the tool is, whether its niche has produced something better, and whether I actually still use it. Which makes it the perfect test case for last article's thesis: deterministic work to code, judgment to the model.

## Three Gates: This Need Deserves a Skill

Following the methodology, run the gates first.

**Recurring?** Installing software is a programmer's daily action, while auditing the inventory almost never happens — not for lack of will, but because the cost is absurd: recalling "when did I last open this" app by app is unrealistic. High-frequency debt accumulation plus never-executed audits equals exactly the kind of workflow a skill should take over.

**Model-only judgment?** This is where devbox-doctor leans on the model even harder than storage cleanup did. "`OrbStack` and `Docker Desktop` are same-niche competitors," "`fnm` is the modern replacement for `nvm`," "this thing calling itself a cleaner-master is an ad container disguised as a utility" — every one of these is world knowledge that cannot be written into a rules table. Especially the increment this skill promises: **not just what to remove, but what in the same category is better now** — an alternative suggestion is a miniature tech-selection consultation, pure model territory.

**Concrete deliverable?** A checkup report: a three-light disposal list, a fourth zone of upgrade suggestions, and one shareable stats card. Acceptable (every item verifiable) and iterable (bad judgments get fixed in the reference docs).

All three gates pass. Time to build.

## Data Layer: Your Mac Has Been Keeping Books All Along

The first principle carries over unchanged: **the scan is read-only, end to end.** But the data surface is far richer than directory sizes — judging "still in use?" needs usage evidence, and macOS happens to have been keeping books that nobody reads:

```
scan.py collects six classes of facts, read-only
├── App inventory    /Applications + mdls per app
│                    (kMDItemLastUsedDate / kMDItemUseCount /
│                     size / version)
├── Package managers brew list, brew leaves (orphan deps),
│                    brew autoremove --dry-run, npm -g, pipx list
├── Version managers pyenv versions, nvm ls, rustup toolchain list —
│                    how many managers per niche, hoarding how much
├── Autostart        LaunchAgents / LaunchDaemons / login items —
│                    who quietly resurrects at boot
├── Residue matching Application Support / Containers directories
│                    diffed against installed apps → orphan data
└── Runtime evidence current process table — which "unused" things
                     are in fact resident in the background
```

`mdls` is the delight of the whole data layer. Verified on my own machine: `Discord.app` returns "last used July 15, count 2" — **system-level usage records, read-only, zero dependencies.**

But verification also exposed a trap immediately: `Xcode.app` and `Pages.app` return `null`, and I use Xcode constantly. Some apps are not launched through Launch Services (spawned from the command line, resident in the background), so Spotlight never books them. That trap became a design rule written straight into the SKILL.md: **`null` does not mean unused. A zombie verdict requires multi-source evidence — usage records, data-directory modification times, the process table, invocation traces in shell history — at least two sources pointing the same way before an app may be called "suspected zombie," and a single source never convicts.** When evidence falls short, the item goes to "under observation," never to the deletion list.

The essence of this rule is pushing last article's "the model only proposes" one step further: **the model's proposals must themselves carry an evidence chain** — it does not get to sentence an app to death because its name sounds dated.

## Judgment Layer: Three Lights Plus an Upgrade Zone

Once the scan JSON reaches the model, judgment proceeds in four steps:

**Step one, identify every niche.** What each app and CLI is, and which category it belongs to (editor / terminal / container runtime / version manager / notes / utilities). Pure world knowledge.

**Step two, diagnose the three chronic diseases.** Zombie apps (multi-source evidence, as above); stack conflicts (two or more same-niche tools all showing recent use → list them for the user to pick one; only one in use → the other is processed as a zombie); uninstall residue (the diff set comes straight out of residue matching — the closest thing to deterministic in the whole pipeline).

**Step three, low-value and bloatware verdicts.** Bundled family-suite installs, ad containers disguised as system utilities, tools with clean open-source equivalents that nag with resident paywalls — this class is the most sensitive, so its evidence bar is the highest: an item only gets a light when it hits both **behavioral evidence** (autostart, resident processes, nag records) and **niche evidence** (a recognized clean alternative exists), and the report must state the grounds.

**Step four — the differentiating increment — upgrade suggestions.** For every tool that is "in use and healthy," the model answers one question: **within the same niche, is there now something more popular, faster, or better value?** Still on nvm? `fnm` and `mise` start an order of magnitude faster. Still on Postman? `Bruno` is offline-first and versions its config in git. Three Python toolchains? `uv` replaces five tools with one.

The report shape grows accordingly from three lights to "three lights plus one zone":

| Zone | Meaning | Action |
|---|---|---|
| 🟢 Clear directly | Uninstall residue, orphan deps, caches | One-click Trash / show brew commands |
| 🟡 Needs a decision | Stack conflicts, suspected zombies | Show evidence, open in Finder, user decides |
| 🔴 Guide only | Big items needing proper uninstall, autostart die-hards | Reveal the app, step-by-step uninstall guidance |
| ⬆️ Upgrade suggestions | Same-niche better options for in-use tools | Pure intelligence cards, no delete buttons |

The upgrade zone has one iron boundary with the lights: **it is not a deletion decision and never appears in the disposal list.** It is a tech-radar sweep you get for free — read it, then feel entirely free to ignore it.

## Recommendations Fumble Easiest, So Their Rules Are Strictest

At this point in the design I stopped for a long think — not about tech, but about a product-ethics question: **what separates an AI recommending software from an influencer shilling it?**

The constraints on how a recommendation may be produced. I gave the upgrade zone four rules, written into the SKILL.md's iron-rules section:

1. **Only same-niche, actively maintained tools.** No cross-category evangelism ("you should try Rust" is not an upgrade suggestion), no abandoned projects;
2. **Migration cost must be stated.** "fnm reads .nvmrc, ten-minute migration" and "switching build systems, a week minimum" are entirely different suggestions — a recommendation without its cost is malpractice;
3. **A reason not to switch must be given.** Every card carries a "when to stay put" field — a recommendation's job is presenting the trade-off, not concluding for the user;
4. **Never suggest replacing a paid tool in heavy use.** Usage evidence outranks popularity: the JetBrains suite you live in daily does not belong in the upgrade zone no matter what the internet is hyping. Paid for and in use is the strongest selection evidence there is.

One sentence to close it: **a recommendation is intelligence, not a decree.** The model's job is laying the category's current state on the table; the gavel stays in human hands — the same separation of powers as before, extended from "delete or not" to "switch or not."

## Knowledge Rots, So the References Carry Date Stamps

Upgrade suggestions carry a difficulty the three lights never had: **tool-ecosystem knowledge is perishable.** Today's "modern replacement" is next year's zombie. Freeze "fnm beats nvm" into the prompt and this skill rots at a visible rate.

The fix is extracting perishable knowledge out of the SKILL.md into a standalone reference where **every entry carries its judgment date**:

```
devbox-doctor/
├── SKILL.md              # flow and iron rules (stable, rarely edited)
├── references/
│   ├── macos.md          # how to read the data: mdls traps,
│   │                     # residue-matching rules (stable)
│   ├── stacks.md         # niche map: mainstream picks and stack
│   │                     # patterns per category
│   │                     # (PERISHABLE - every entry date-stamped)
│   └── judging.md        # verdict standards: zombie evidence chain,
│                         # bloatware conditions, the four
│                         # recommendation rules (stable)
├── scripts/
│   ├── scan.py           # read-only scan of six fact classes → JSON
│   ├── build_report.py   # analysis JSON → static report
│   └── server.py         # local server: allowlisted one-click
│                         # disposal (inherits the seven locks)
└── assets/
    └── report_template.html
```

The SKILL.md instruction becomes: "when judging stacks and alternatives, read `stacks.md`, **mind each entry's date stamp, and flag entries older than a year as possibly stale in the report**." This design happens to answer a bigger question — **what is the fundamental difference between a skill and a blog post?** A post freezes at publish time; a skill's knowledge layer stays alive: spot a stale line in `stacks.md`, change one line, and every subsequent checkup benefits immediately. Last article said "a Skill is a frozen workflow"; this one adds the missing half: **the workflow is frozen, the knowledge stays alive.**

## Viral Mechanics Are a First-Class Citizen, Not Post-Launch Marketing

Last article analyzed storage-analyzer's viral gears: screenshot-able results, universal relevance, a surprise factor, zero dependencies. devbox-doctor builds all four straight into the product:

**Screenshot-able**: the report opens with a "checkup card" — N stack conflicts, N zombie apps, N GB of residue, N upgrade suggestions, four numbers plus a machine health score. **The card carries only statistics — no paths, no app names** — safe to drop into any group chat with zero privacy anxiety. That constraint goes into the SKILL.md output spec, exactly like "the three tier statistics must begin with parseable numbers."

**Surprise factor**: a programmer who reads "your Mac has been recording every app's use count all along" reaches for the terminal to run `mdls` immediately — the fact itself is viral material. "Three Python version managers fighting on one machine" and "an editor uninstalled six months ago still squatting on 3.7 GB" are ready-made conversation pieces.

**Universal relevance**: a narrower circle than everyone-has-a-full-disk cleanup, but far denser — every programmer owns a tool graveyard, and programmers are the population most willing to post terminal screenshots.

**Zero dependencies**: inheriting the standard-library principle — `mdls`, `brew`, `osascript` are all built-in or already installed.

## Cold Water: A Blueprint Is Not a Product

Two buckets over my own head, as usual.

First bucket: **this is a design document, not a launch announcement.** The last military rule from the methodology piece — "a workflow you have not completed by hand does not deserve freezing" — applies to me too. Every collection point in the data layer has been verified (the `mdls` null trap is a trophy of that verification), but the judgment layer's accuracy, the recommendation zone's fumble rate, and the report's actual feel all wait on enough real-machine rounds. When it ships I will come back with a field-test article, and the designs reality slaps down will be shown as-is.

Second bucket: **the upgrade zone is the part I am least sure of.** Four iron rules guard against malice, not mediocrity — the model can perfectly well produce a pile of correct-but-useless suggestions (yes, I know uv is great; I switched six months ago). The fix is probably making it read the machine's actual versions and configs before speaking, but that widens the scan surface significantly. I have not resolved that trade-off, so it gets recorded honestly here.

**Everyone owns a tool graveyard. As of today, the groundskeeper position can finally be outsourced to AI.** See you when the repository breaks ground.
