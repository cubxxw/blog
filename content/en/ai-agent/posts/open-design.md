---
title: "Taking Open Design Apart: Turning the Coding Agent You Already Have Into a Design Engine"
date: 2026-07-22T20:30:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["Open Design", "nexu-io/open-design", "Claude Design", "AI design tool", "coding agent", "Claude Code", "Codex", "Cursor", "DESIGN.md", "design system", "BYOK", "MCP", "local-first", "HyperFrames", "AI Agent", "frontend prototype"]
tags:
  - AI
  - Agent
  - LLM
  - Architecture
  - MCP
  - Design System
description: >
  Open Design (nexu-io/open-design) is an open-source, local-first alternative to Claude Design. It ships no model of its own. Instead it treats the coding agents already installed on your machine (Claude Code, Codex, Cursor…) as the design engine, orchestrating three layers of files — skills, design systems, plugins — to produce real HTML/CSS artifacts, preview them live in a sandbox, and export HTML/PDF/PPTX/MP4. This piece runs from positioning and the three-tier system architecture, through the DESIGN.md contract, to the gap between the marketing copy and what the repo actually ships, and finally a full local hands-on.
tldr:
  - Open Design is an open-source, local-first Claude Design alternative. It holds no model itself; it detects the coding agents already on your PATH and orchestrates design work onto them, producing real frontend files instead of a screenshot.
  - Three tiers - a Next.js 16 frontend (live sandbox iframe preview) + a local Node daemon (/api/chat, spawn agent, SQLite) + the agent runtime CLI. The request path is daemon → spawn(agent) → stdout → SSE → `<artifact>` parser → preview.
  - Every send composes the system prompt from three layers - a base output contract + the active design system's DESIGN.md + the active skill's SKILL.md. Swap the skill or the design system in the top bar and the next send swaps that one layer.
  - The marketing copy and the repo disagree - the README boasts 150 design systems / 100+ skills / 21 CLIs, while QUICKSTART actually bundles 129 design systems, ~9 skills, and scans 8 agents. Trust your local dropdown for the real numbers.
  - Local-first - the daemon binds to 127.0.0.1 and is read-only by default; with no CLI installed you fall back to BYOK straight to Anthropic/OpenAI; data lives in the `.od/` directory and never leaves your machine. Apache-2.0, self-hostable.
maturity: budding
columns:
  - agent-engineering
cover:
  image: /images/covers/ai-agent/2026/open-design.jpeg
  alt: "Taking Open Design Apart: Turning the Coding Agent You Already Have Into a Design Engine"
---

First, a disambiguation. In tech writing "Open Design" points to at least two unrelated things. One is the **open-hardware / open design movement** that began in the late 1990s (the MIT-adjacent Open Design Foundation, OpenStructures, Open Source Ecology — publishing the blueprints of physical products for collaborative manufacture). The other is a GitHub project that surfaced after 2025, [`nexu-io/open-design`](https://github.com/nexu-io/open-design), a tool that turns an AI coding agent into a design engine.

This article is only about the latter. If you came for open hardware, this one won't help.

## What it is, in one sentence

Open Design positions itself as an **open-source, local-first alternative to Claude Design**. To understand it, accept one counterintuitive premise up front: **it does not generate designs, and it embeds no large model of its own.**

What it does is closer to a **design dispatcher**. On startup it scans the command-line coding agents already installed on your `PATH` (`claude` / `codex` / `cursor-agent` / `gemini` / `opencode` / `qwen` / `copilot` and friends) and uses them as the back-end "compile-and-execute engine." You type "make a SaaS landing page in such-and-such design system"; Open Design composes that sentence into a constrained prompt, spawns the matching agent to write real HTML/CSS, parses the stream as it comes, renders it live in a sandboxed iframe, and finally writes it to disk.

The bigger slogan the project gives itself: a **"Figma alternative for the agent era."** The weight of that claim is in the delivery path — what you get out is not a PNG or a theme JSON, but real frontend code you can drop straight into Cursor / Codex and continue as React/Vue. The most painful stretch of traditional design tooling, the lossy "mockup → code" handoff, is sidestepped at the source: **the output is code from the very first second.**

The license is the permissive Apache-2.0, full self-hosting is supported, and data stays on your machine by default.

## Positioning: why a "dispatcher," not yet another image generator

Plenty of "AI generates UI" tools exist. Open Design's differentiation is two words: **local-first** and **model-agnostic**.

Most SaaS design tools lock your assets into a proprietary cloud database, bound to their own rendering engine and billing. Open Design inverts that — every capability rides on the coding agent you're **already using**. Whoever's agent you run, that's whose quota and model you spend; it does not decide which model you use, and it does not charge you for the model. Three direct consequences follow:

- **No vendor lock-in.** Claude Code today, Codex or a local Ollama tomorrow — all that changes is one CLI. Your artifacts, design systems, and history all stay.
- **You bypass cloud rate limits.** Nothing routes through its servers; it runs as fast as your agent does.
- **Data sovereignty.** Mockups, prompts, and project context all land in a local `.od/` directory, with zero telemetry by default.

The cost is just as clear: **there's a prerequisite — you need a working coding agent (or an API key) first.** If you want the zero-friction "type once, get an image" experience, this isn't the easiest option. It serves people who are already living in the terminal with an agent.

## System design: three tiers and how a request flows

This is the part of the piece most worth your time. Open Design's skeleton is three tiers, decoupled through standard interfaces.

![How Open Design works: the coding agent you already have acts as the design engine; Open Design orchestrates three layers of files — skills, design systems, plugins — running a brief→direction→artifact→deliver→memory loop that emits real HTML/PDF/PPTX/MP4 files](/images/blog/open-design-how-it-works.en.svg)

**Tier one, the presentation layer (Next.js 16 + React 18 + TypeScript).** An App Router UI whose core is a **sandboxed `srcdoc` iframe**: the HTML the agent streams out renders here within seconds into a clickable, testable prototype, while being isolated so unknown scripts can't break your host. The desktop build wraps another Electron shell around it.

**Tier two, the local daemon (Node 24 + Express + SSE + better-sqlite3).** A lightweight background service bound to `127.0.0.1`, and the hub of the whole system. It exposes `/api/skills`, `/api/design-systems`, `/api/chat` (SSE stream), `/api/proxy/*`, `/api/artifacts/{save,lint}` and more, and manages projects, conversations, messages and tabs in SQLite (`.od/app.sqlite`). It also embeds an **MCP stdio server** so mainstream agents can consume its skills and files natively.

**Tier three, the agent runtime.** The daemon spawns your local CLI via `spawn(<agent>, [...], { cwd: .od/projects/<id> })`, streaming over standard stdio. The agent reads `SKILL.md` + `DESIGN.md` inside the project working directory and writes artifacts to disk.

The full path of a single "send" looks like this:

```
frontend input
  → daemon /api/chat
  → spawn(<agent>, cwd=project dir)
  → agent stdout (writes HTML as it thinks)
  → SSE stream back
  → <artifact> parser (slices the HTML out of the chat stream)
  → live render in the sandboxed iframe
  → "Save to disk" → ./.od/artifacts/<timestamp>-<slug>/index.html
```

**Two execution modes** share the same `<artifact>` parser and the same sandboxed iframe; only the transport differs:

| Mode | Trigger | How the request flows |
|---|---|---|
| **Local CLI** (default) | daemon detects an agent on PATH | frontend → daemon `/api/chat` → `spawn(<agent>)` → stdout → SSE → parse → preview |
| **Anthropic API · BYOK** (fallback) | no CLI installed | frontend → `@anthropic-ai/sdk` direct → parse → preview |

### The three-layer prompt composition

The design I admire most here is how it keeps a large model from "drifting back to default styling." On every send, the app composes the system prompt from three layers and sends it to the provider:

```
BASE_SYSTEM_PROMPT        (output contract: wrap in <artifact>, no code fences)
  + active design system body   (DESIGN.md — palette / type / layout)
  + active skill body           (SKILL.md — workflow and output rules)
```

Swap the skill or design system in the top bar and the next send replaces that one layer, leaving the rest untouched. Bodies are cached in memory per session, so each swap is a single daemon fetch. This three-layer composition splits "brand," "workflow," and "output format" into independently swappable, orthogonal dimensions — which is exactly why one prompt plus a dropdown flip can produce completely different brand aesthetics.

## DESIGN.md: a machine-readable and human-readable contract

To get a probabilistic model to reliably output a particular brand feel, a few hex values won't do — it'll drift right back to Material Design or Tailwind defaults. Open Design's answer is a brand contract called `DESIGN.md` (the format was first proposed by Google Labs for its Stitch design tool and has since been adopted by the open-source community as a general AI contract for describing a visual brand).

Its cleverness is the **two-layer structure**:

**The YAML frontmatter at the top** provides machine-readable precision — color ramps, font families, radii, spacing grids, component style bindings. Frontend parsers and static validators can pull these straight out as parameters.

**The Markdown prose body below**, organized under second-level headings, carries the "design logic" and constraints — the things numbers can't express and only language can. A line like "no 3D gradients or drop shadows; keep the flat feel of printed paper" gets loaded as a system prompt and governs typographic mood at a higher level.

A compact example (illustrative; the bundled systems use a nine-section schema):

```markdown
---
name: "Nordic Warmth"
colors:
  primary: "#2C3E50"
  accent: "#E67E22"
  neutral-bg: "#FAF8F5"
typography:
  headline: { fontFamily: "Lora", fontSize: "3.5rem", fontWeight: 700 }
  body:     { fontFamily: "Inter", fontSize: "1rem", lineHeight: 1.6 }
rounded: { sm: "4px", md: "12px" }
spacing: { sm: "8px", md: "16px", lg: "32px" }
---

## Colors
Primary (#2C3E50): a warm coal-ink, for all headlines and body text.
Accent (#E67E22): burnt persimmon, used sparingly on the primary action and focus.
Background is a soft paper #FAF8F5, never pure white, to cut reading fatigue.

## Component Rules
The primary button maps its background strictly to accent, with a 4px corner —
never fully rounded, which would break the geometric crispness.
```

Some bundled systems' validators also do an accessibility pass: they pull foreground/background colors from the YAML, compute the contrast ratio via the WCAG 2.1 relative-luminance formula, warn in the terminal below 4.5, and nudge the agent to auto-tune toward AA.

## Three composable planes: skills, design systems, plugins

Open Design takes Claude Design's closed "discover the need → lock a direction → stream artifacts → review → deliver" loop and breaks it into a pile of ordinary files you can read, write, version, and publish. They fall into three planes:

- **Skills** carry the agent's "taste." Each skill is a folder under `skills/`, following Claude Code's `SKILL.md` convention and extending it with `od:`-prefixed frontmatter (`mode`, `platform`, `design_system.requires`, and so on). The prototype-type skills actually bundled are `web-prototype` (default), `saas-landing`, `dashboard`, `pricing-page`, `docs-page`, `blog-post`, `mobile-app`; deck-type are `simple-deck` and `magazine-web-ppt` (the `guizang-ppt` bundle, default for deck mode).
- **Design systems** carry the brand — the `DESIGN.md` above. Switch a system to swap the whole token set, with no theme JSON to maintain.
- **Plugins** carry runnable workflows, as portable agent-skill folders.

All three are files you can author yourself, put in git, and publish. This "filesystem as product" design is what lets it call itself an "open-source alternative."

### A gap worth naming: marketing copy vs. what the repo ships

Digging this far, I found something worth putting in the body: **the project's advertised numbers don't match what the repo actually bundles — and its own two documents disagree with each other.**

The slogan at the top of the README is "**100+ skills · 150 design systems · 261 plugins · 21 CLIs**"; the SEO tags say "259+ Skills · 142+ Design Systems." But open the `QUICKSTART.md` on the same branch — the one that actually runs — and it says:

> The Design system dropdown ships **129 design systems** (2 hand-authored starters + 70 bundled product systems + 57 design skills); the skill dropdown bundles **~9**; the PATH scanner recognizes **8** agents (claude / codex / devin / gemini / opencode / cursor-agent / qwen / copilot).

My advice is simple: **for the numbers, always trust whatever your local dropdown actually loads.** The README sells the product vision (plus the 261 things packaged under `plugins/_official/`); QUICKSTART describes the MVP that runs today. Star counts are the same story — indexes range from a few thousand to nearly 60k, growing fast; don't treat any single figure as gospel. Being able to see this layer of gap is basic literacy for judging a "hit" open-source project's maturity.

## Local-first and the security model

The daemon binds to `127.0.0.1` and is read-only by default; any LAN exposure has to be declared explicitly via `OD_BIND_HOST` + `OD_ALLOWED_ORIGINS`.

For the BYOK proxy (`POST /api/proxy/{anthropic,openai,azure,google,ollama,...}/stream`), it adds an **SSRF guard** at the daemon's edge, physically blocking all private IP ranges — internal / link-local / CGNAT. So you can safely dispatch requests to OpenAI, Anthropic, Google, Azure, and just as safely wire up a local Ollama / LM Studio, without leaving an attacker a port to probe your internal network. Credentials and the live-artifact preview route stay on the loopback no matter what.

## What I can build with it: a practical guide across four dimensions

**By product type, pick a skill + design system.** SaaS / tooling: `saas-landing`, `dashboard`, `pricing-page`, paired with restrained systems like Linear / Vercel / Stripe. Marketing / growth: social, email, and poster skills, paired with expressive brands like Nike / Spotify / Airbnb. Internal docs / productivity: `docs-page`, `blog-post`, on a neutral starter, favoring information density. If you already have a brand, don't pick from the presets — drop in a product screenshot or a live URL and let the agent reverse-author your own `DESIGN.md`.

**By product form, pick a mode.** A one-off static screen uses `prototype`; something to walk someone through uses `deck`; something to spread with motion goes to image / video / HyperFrames. The rule: if a single-page HTML artifact can do it, don't reach for video — the lighter the form, the faster you iterate.

**By platform.** Web, desktop, and mobile share one design system; what changes is the skill's `platform` field and the device frame. Mobile favors `mobile-app`; for cross-platform work, fix one `DESIGN.md` first, then emit per-platform artifacts to keep tokens consistent.

**By product stage.** This is the dimension I find most useful:

| Stage | How to use Open Design |
|---|---|
| 0→1 exploration | With no brand yet, pick from the curated visual directions; use the sandbox preview to try fast; don't lock a design system too early |
| Refinement | Edit "in place" on the same artifact; tweak the prompt for local adjustments instead of regenerating from scratch |
| Engineering handoff | Take the real HTML/CSS into Cursor / Codex to convert to framework code, or export PPTX / PDF / MP4 directly |
| Scale & consolidation | Fold the confirmed brand, palette, and fonts into `DESIGN.md` and team plugins; use Automation to orchestrate recurring flows |

As for output formats, it covers HTML (inline), PDF (browser print), PPTX, ZIP, Markdown, plus deterministic MP4 via HyperFrames rendered through headless Chrome + FFmpeg.

## Hands-on: from zero to your first artifact

Here's the shortest fully-local path. Three install routes — pick one by your needs.

**Route A: the desktop app (zero config, try this first).** Download the macOS / Windows installer from GitHub Releases or the site, install, open — it auto-detects agents on your PATH and defaults to the `web-prototype` skill + `Neutral Modern` design system. Type a prompt, hit Send, get an artifact.

**Route B: from source (to modify code / self-host).** Requires Node `~24`, pnpm `10.33.x`; enable Corepack to pin the version:

```bash
git clone https://github.com/nexu-io/open-design.git
cd open-design
corepack enable
pnpm install
pnpm tools-dev run web   # starts daemon + web in the foreground; open the URL it prints
```

Note: `pnpm tools-dev` is the only lifecycle entry point — the old aliases like `pnpm dev` and `pnpm start` are gone. Handy subcommands: `pnpm tools-dev status` for runtime state, `pnpm tools-dev logs` for logs, `pnpm tools-dev check` for diagnostics.

**Route C: Docker (production / team self-host).** The daemon serves the static build directly on port 7456:

```bash
git clone https://github.com/nexu-io/open-design.git
cd open-design/deploy
cp .env.example .env
echo "OD_API_TOKEN=$(openssl rand -hex 32)" >> .env
docker compose up -d
# open http://localhost:7456
```

**Wire it into your own agent (headless usage).** Open Design ships an MCP server natively; one command injects it into the agent you use daily:

```bash
od mcp install claude      # or codex / cursor / gemini / opencode ...
```

After that, you can call its tools from inside the agent: `od project list --json`, `od files read <project-id> <path>`, `od skills list --json`, `od plugin list --json`.

**Make your own design system.** Create a directory under `design-systems/`, put a `DESIGN.md` at its core (same nine-section shape as the example above), and the dropdown will pick it up. For the field conventions, read `design-systems/README.md`.

**Produce and deliver.** The agent reads your chosen skill + `DESIGN.md`, generates a pixel-aligned HTML artifact in the project workspace; you click-test and tweak in the sandbox; once happy, either export PPTX / PDF / MP4, or have the frontend convert it to React / Vue components with Cursor in the same workspace.

If media generation errors with `OD_BIN: parameter not set` or the daemon URL turns into `:0`, rebuild the daemon CLI and restart, then **reopen the project from the Open Design app** (don't resume an old terminal session) so the daemon re-injects fresh `OD_*` env vars:

```bash
pnpm --filter @open-design/daemon build
pnpm tools-dev restart --daemon-port 7457 --web-port 5175
```

## Engineering extension: wiring the output into a real design-system pipeline

What this section covers is **not built into Open Design** — it's the adjacent ecosystem worth layering on when you want to take its output into enterprise-grade design-system engineering, left here so you can follow the thread.

What Open Design hands you is a `DESIGN.md` and landed HTML/CSS. To upgrade that into cross-platform, governable design assets, the typical chain is: extract tokens into **W3C DTCG**-standard JSON (keys prefixed with `$value`, `$type`; the 2025.10 spec is stable and adopted by Adobe / Figma / GitHub) → compile with **Style Dictionary** (v5+ requires Node 22, native ESM, a flattened Map underneath that drops lookups to O(1)) to Web's rem, Android's dp/sp, iOS's UIColor → use **Figma Code Connect** to map real components' props back into Figma Dev Mode so designers, frontend, and AI all consume the same high-fidelity code. If hand-writing `.figma.tsx` gets tedious, scaffolds like Superconnect generate the mappings for you.

This chain is complementary to Open Design: the latter handles "quickly produce a branded prototype," the former handles "harden design decisions into scalable, governable multi-platform assets." Small projects won't need it; a design system at real scale will.

## When to use it, when not to

**Good fit:** you already live in the terminal with Claude Code / Cursor / Codex; you want open-source control with data on your machine; you're after lossless "design → real code" handoff; you need to quickly produce branded landing pages, dashboards, or pitch decks.

**Hold off:** you want zero-friction "type once, get an image" (it requires an agent or key first); you need multi-person real-time collaboration on a canvas (it's a local-first single-machine tool); you want a pixel-perfect finished visual comp rather than an iterable code artifact.

One line to close: the bet Open Design makes is that **"the model is bought; the orchestration and output format are what you get to build"** — it parasitizes design capability onto the coding agent you already have, using deterministic file orchestration to box in a non-deterministic model, so the output is deliverable real code from the first second. That thinking is of a piece with the past year's direction in agent engineering: put your engineering leverage in the harness, not the model.

## Learning resources

- Main repo and README: <https://github.com/nexu-io/open-design>
- The `QUICKSTART.md`: environment requirements, the two execution modes, the file map, troubleshooting — the first thing to read
- The `docs/` directory: `architecture.md`, `skills-protocol.md` (the full `od:` frontmatter), `agent-adapters.md` (how to add a new CLI), `modes.md` (the four modes), `roadmap.md`
- `design-systems/README.md`: the design-system catalog and nine-section schema
- The DeepWiki page for nexu-io/open-design: a community-organized structured walkthrough

Get your first artifact running with the desktop app, then come back to `QUICKSTART.md` and read the three-tier architecture against the file map, and finally write a skill of your own following `docs/skills-protocol.md` — that path takes roughly two hours to get the whole thing.
