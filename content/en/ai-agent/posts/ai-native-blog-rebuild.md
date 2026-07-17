---
title: 'One Person and a Crew of Agents Rebuilt a 120-Post Blog From the Ground Up'
ShowRssButtonInSectionTermList: true
date: '2026-07-17T17:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ['AI blog', 'rebuild blog with AI', 'Claude Code', 'Codex', 'MCP', 'Skills', 'AI workflow', 'blog automation', 'GEO', 'generative engine optimization', 'AI cover generation', 'GitHub Actions', 'Hugo', 'solo builder', 'cubxxw']
tags:
  - AI
  - Agent
  - MCP
  - Automation
  - Harness Engineering
  - GEO
  - Hugo
  - Blog
description: >
  I rebuilt a four-year-old blog of 120+ posts with a crew of agents: a master-source writing pipeline, a skills library, a self-hosted MCP server, a two-stage cover factory, an AI on duty inside GitHub Actions, and five layers of GEO infrastructure. This is the full retrospective — how each layer was built, how I actually talk to the models, what I delegate and what I never will, and what the new site looks like.
tldr:
  - The new site is at cubxxw.com. What got rebuilt was not the skin but the whole production line — a master-source writing pipeline, a skills library, a self-hosted MCP server, a two-stage cover factory, an AI on duty inside GitHub Actions, and five layers of GEO infrastructure.
  - Talking to AI comes down to a few patterns that keep proving themselves — give tasks not directions (every task has a definition of done), send plans through adversarial review before execution, ask "how would I find out if this breaks?" of every module, and fence permissions with an allowlist rather than an adjective.
  - The engineering discipline behind Claude and Codex is "structure is constraint" — CLAUDE.md/AGENTS.md hold only the version-sensitive traps, craft lives in single-purpose skills, and permissions get granted narrow-to-wide over time.
  - Cover generation is deliberately two-stage — reading the piece and imagining the image goes to a language model (or me), and the image model receives exactly one concrete scene, because every abstraction you feed it comes back misspelled and painted onto the picture.
  - The automation boundary is drawn sharply — the AI reads the data and files a daily report, opens a PR when named, but the merge is always human. 98.4% of the scaffolding can be handed off; the 1.6% that is judgment cannot.
maturity: budding
---

## What actually happened here

How large a team does it take to rebuild a four-year-old blog with 120+ posts — content architecture, operations, all of it?

My answer, delivered over the first half of this year: **one person and a crew of agents with clearly divided jobs.** The human owns judgment and direction; the agents own nearly all the execution. The result is the site you're reading — [cubxxw.com](https://cubxxw.com/). It isn't a redesign. It turned "a blog" from a static site into **a system that writes its own daily report, files its own fix proposals, and exposes its own API.**

![The new home page: identity and signals on the left, BEAR_AI — a digital counterpart you can talk to — on the right](/images/blog/rebuild-2026/home-light.jpeg)

That wireframe sphere on the right isn't decoration. It's my digital counterpart: visitors can ask it "where should I start?" or "what is GEO?", and it's wired to the full site index behind the scenes. Dark mode has a different temperament:

![The home page in dark mode](/images/blog/rebuild-2026/home-dark.jpeg)

This post is the complete retrospective. It is not an "AI is amazing" piece — it lays out how each layer was built, how I actually talk to the models, where I delegate, and where I never will. If you maintain a content site, a knowledge base, or any system that's too much for one person, this should be copyable more or less directly.

---

## 1. Before rebuilding, answer what a blog even is

Four years ago I understood a blog as "a website where articles go." Before this rebuild I finally got the thing straight: **the blog is not the source. It's the most downstream outlet of my content pipeline.**

So the repository grew a directory that Hugo never publishes but everything else answers to — `writing-pipeline/`:

```
0-inbox/      inbox         →  frictionless capture, never organized
1-notes/      atomic notes  →  self-contained, cross-linkable
2-master/     master (SSOT) →  the full piece, written once, platform-agnostic ★source of truth★
3-adapters/   adapters      →  AI instruction templates that derive per-platform versions
4-published/  publish log   →  where it went, how it did, feeding back into what to write next
```

Data flows one direction only: fragments → atomic notes → master → platforms. The master is the single source of truth. The blog version, the Xiaohongshu version, the overseas-platform version, the video script — all of it is derived from the master by an adapter. **Content changes only ever touch the master.** That is the one discipline the pipeline requires; without it every platform version drifts on its own and the master becomes a fiction.

An adapter is really just an instruction file for the AI — one per platform, encapsulating that platform's algorithmic mechanics and audience psychology. Publishing collapsed into a single sentence for me: "Read this piece in `2-master/`, generate the Xiaohongshu version following the rules in `3-adapters/xiaohongshu.md`." Depth yields to resonance, substance compresses into a list, the image script comes along with it — all that platform-fitting grunt work is frozen into the adapter instead of depending on whatever I improvise that day.

Once that layer is settled, every downstream AI job has something to hang off: **the AI isn't "helping me write articles." It's claiming one station on a clearly defined line.**

---

## 2. How I talk to AI: the question patterns that keep proving themselves

I ran an enormous volume of conversation through Claude and Codex during this rebuild. Past a certain volume, the ways of asking that actually work precipitate out on their own. I use these five every day now:

**1. Give tasks, not directions.** The most important one on this list — important enough that I wrote [a whole piece about it](../give-ai-tasks-not-directions/). The difference is one thing: **a definition of done.** "Help me optimize the home page" is a direction. It has no terminus; you can talk about it until the heat death of the universe. "Get home-page LCP under 2.5s, touch only the image loading strategy, hand me a before/after Lighthouse comparison" is a task — you can see at a glance whether it's finished. A project this size got done entirely by being sliced into tasks that each had a definition of done.

**2. Send the plan through adversarial review before executing it.** The most dangerous AI output isn't an error. It's a fluent, confident paragraph pointed in the wrong direction. So anything architectural — how to split the content directories, how to configure redirects, where to set the noindex threshold — goes to a second AI playing the harshest possible reviewer: "List the three most likely reasons this plan fails." That gate costs approximately nothing and it has caught several plans that looked entirely correct. The long version is in [Put a quality gate on your AI workflow](../engineering-discipline-ai-workflow/).

**3. For every module you build, ask: "if this breaks, how would I find out?"** This is ops thinking moved into a personal system. AI bugs don't turn the screen red or throw an exception. They quietly hand you a wrong answer. So every automated stage is required to have an alarm outlet — as you'll see below, the output of the entire SEO automation isn't "fixed code," it's **a daily report issue that lands in front of my face.** The goal isn't a system that runs. It's a system that yells when it doesn't.

**4. Fence permissions with an allowlist, not an adjective.** Telling an AI "don't mess anything up" accomplishes nothing; its definition of "mess" isn't yours. What works is an explicit list of what's allowed: these files may be touched, nothing else; these commands may run, everything else is refused. That pattern eventually got productized into the pipeline itself — the AI fix ticket has a `scope_hint` field, which is exactly the file allowlist for that task.

**5. Require the AI to state its basis and its uncertainty.** Every output must carry "what this conclusion rests on, and which step I'm least sure about." It amounts to forcing the model to log its own reasoning; when I review, I read the log before the conclusion.

All five collapse into one sentence: **direction, standards, and boundaries are mine; execution is the AI's.** Draw that line clearly and collaboration compounds instead of dissolving into chat.

---

## 3. Skills: freezing the traps you've already stepped in into craft

Question patterns solve "how to ask well once." The real leverage is **making a good way of asking reusable.** That's what skills are in my system: every skill under `.claude/skills/` is a verified work instruction that the AI follows each time, so it no longer depends on me re-describing it.

Six skills live in this repo now: `article-covers` (cover generation), `apple-design` and `emil-design-eng` (design taste and implementation standards), `animation-vocabulary`, `review-animations`, and `improve-animations` (a vocabulary, a review standard, and an improvement process for motion) — plus a `/check-posts` command, the pre-publish QA checklist that walks front-matter timezones, future timestamps, tag conventions, and bilingual completeness, item by item.

Let me take apart the most representative one, `article-covers`, since it also answers the "how are the images made?" question.

### The cover factory: two-stage image generation

All hundred-plus posts need covers (a post without one produces an identical preview card everywhere it's shared). My solution is a script pipeline, `scripts/generate-covers.mjs`, sitting on two image models: Doubao Seedream (default, direct domestic connection, roughly three cents an image) and Gemini (fallback).

But the script isn't the valuable part. The valuable part is that the process is forcibly split into **two stages**:

- **Stage one — read the piece, imagine the image — goes to a model that's good at reading (or to me.)** The output is one or two concrete, paintable scene descriptions: "A study in early morning; several thin streams run from different windows onto a long wooden table and converge into an open wooden box; on the far side of the box, settled pebbles are stacked into a small path extending to the right."
- **Stage two — paint it — the image model receives that sentence and nothing else.**

Why the split? Because I've paid cash for both failure modes:

1. **Anything concrete, the image model will copy straight onto the picture.** I once fed the article's tags along with the prompt and got a cover with "AI Inteligenct," "Agetic," and "monitzring" printed proudly across it. Another time I put the site's hex color codes into the prompt and it painted a swatch card with the hex codes as text. Every single time, the script reported success, exited 0, and all tests were green — **only eyes catch this class of error.**
2. **Anything abstract, the image model falls back on its stereotypes.** Ask it to "read the article and paint something fitting" and you will get a glowing circuit board and a blue gradient tunnel, forever.

So the division has to be: **understanding goes to the thing that can read, drawing goes to the thing that can draw, and exactly one sentence of plain language passes between them.** Then a few non-negotiable rules: one style anchor site-wide (flat editorial magazine illustration, low saturation, no more than four colors, generous white space), no faces, no logos, no text of any kind in the image, and the Chinese and English versions share the same picture. Once generated, I open it and look before deciding whether to use it — the one stage in this pipeline that can't be automated, and shouldn't be.

Getting this working the first time cost me an evening. Every new post's cover since then costs one scene description and three cents. **That's what a skill is for — you pay tuition once.**

---

## 4. MCP: growing an API for the blog

My favorite step in the rebuild was writing the blog its own MCP server (`scripts/mcp-server.mjs`, zero dependencies, one file). It exposes two tools, `search_blog` and `get_blog_post` — any MCP-capable client (Claude, Cursor, the ChatGPT desktop app) can add one line of config and search and read my entire archive.

The interesting part is the implementation: this MCP server, the on-site AI Q&A, and that digital counterpart on the home page **share one content index** (`content-index.json`). Which means "make the AI understand my blog" was done once and reused by three outlets — on-site Q&A, digital counterpart, external MCP. Write a new post, run the index script, all three update at once. That's what closing the loop means to me: not a separate pipe per feature, but one pipe with three taps.

On my own side, the MCP tools I keep mounted while writing and maintaining each have a job too: Playwright MCP drives the browser — every screenshot in this post was taken by it; Context7 looks up current framework docs, which cures the model's habit of confidently writing against a three-year-old API; GitHub MCP handles the issue and PR round trips. The point isn't having many tools. It's that each one has a defined post.

A note on layout while I'm here. The new article page is three columns: metadata on the left (author, maturity, length, how to contribute), body in the middle, table of contents on the right — and next to the TOC, an AI tab where readers can ask questions about the specific piece they're reading:

![The new three-column article layout: metadata rail, body, TOC and AI Q&A](/images/blog/rebuild-2026/article-three-column.jpeg)

---

## 5. The engineering discipline behind Claude and Codex

I used both Claude Code and Codex for this rebuild (`CLAUDE.md` and `AGENTS.md` coexist in the repo, each with its own config directory). The deeper I went, the more one judgment held: **the ceiling on these tools isn't the model. It's the structure you lay under it.** A few things that earned their place:

**Put the version-sensitive traps in CLAUDE.md, not a tutorial.** The most valuable content in mine reads like: "don't build with make, use netlify dev"; "SVGs must go in `static/` — put them in `assets/` and you get a 404"; "don't inline large SVGs into Markdown, Goldmark shreds them when it sees a leading zero-width space." Every line is a real crash. The AI doesn't need you to teach it what Hugo is. It needs to know **where this repo diverges from its priors.**

**Structure is constraint.** The config doc kept growing and the AI kept getting less obedient — so I broke it up. CLAUDE.md keeps only repo-level hard rules; craft sinks into single-purpose skills, one directory per concern. More files, each smaller, and execution accuracy went up visibly. The directory structure *is* the map you hand the AI; draw it badly and it walks badly.

**Grant permissions progressively.** The allowlist in `settings.local.json` accumulated one line at a time: approve by hand first, and only operations that recur get promoted. Today `git add/commit/push` and `gh pr` need no approval, but anything with a large blast radius is still confirmed individually. Trust is accumulated, not granted in one shot.

**Overnight work runs on a Ralph loop.** For jobs too big for one sentence but decomposable into a string of user stories, I use a crude but effective script, `ralph.sh`: write the requirement as a set of user stories in `prd.json`, and the script loops Claude, one story per round — implement, run QA, commit, append what it learned to `progress.txt`, and open a PR once everything passes. `progress.txt` is the heart of it: each round the agent writes down "the traps in this repo" for the next round, which amounts to giving a forgetful crew a shift-handover log. Why one story per round? Because success on long chains multiplies out — 95% confidence per step, compounded over twenty steps, leaves you about a third. Shortening the chain and externalizing the state is the most basic defense against compounding error there is.

---

## 6. Automated operations: an AI on duty inside GitHub Actions

The biggest change after the rebuild isn't what the site looks like. It's that it **started operating itself.** The loop:

```
 daily cron                   daily cron
┌──────────────┐   data    ┌──────────────┐  report  ┌─────────────────┐
│ seo-snapshot  │ ────────▶ │ seo-analyze  │ ───────▶ │ daily site issue │
│ pull GSC/PSI/ │ data/seo/ │ (AI reads    │          │ + Lighthouse     │
│ CrUX snapshot │           │  snapshots)  │          └────────┬────────┘
└──────────────┘           └──────────────┘                   │ I name one suggestion
                                                              ▼
                            ┌──────────────┐   PR    ┌─────────────────┐
                            │   seo-fix     │ ──────▶ │  I review/merge  │
                            │ (AI branches) │         └─────────────────┘
                            └──────────────┘
```

Every afternoon a Claude running inside GitHub Actions reads today's and yesterday's Search Console, PageSpeed, and CrUX snapshots and diffs out what changed — which page dropped five or more performance points, which queries sit at rank 8–20 and are therefore cheap title-rewrite opportunities, which pages get impressions but anomalous click-through — and writes the observations into that day's *Site Daily Report* issue. Lighthouse results flow into the same issue. One issue a day, never a flood.

When I decide a suggestion is worth doing, I manually trigger `seo-fix` and pass in that suggestion's text plus a file allowlist. The AI opens a branch, touches only files on the list, runs a full build to confirm the site isn't broken, opens a PR, and goes back to the daily report issue to leave a line: "handled suggestion X → PR #NN." A complete paper trail.

The permission design in this pipeline cost me more thought than the functionality did: the analysis job's token is read-only, and the prompt is told again not to touch source — belt and suspenders; the tool allowlist is precise down to the individual command; even "write an issue" is forbidden to go through `gh` directly and must run through an idempotent script, so it can't decide on its own to open a new issue. The publish-side pings (sitemap, IndexNow, Baidu push) are also fully handled by Actions post-deploy.

**The one step that isn't automated is the merge.** Not because it can't be. Because I chose to keep it. The AI can observe, suggest, and prepare everything — but the signature on "does this go into main" is mine. On what it takes to hand work to an agent nobody is watching, I go deeper [here](../trusting-unattended-ai-agent/).

---

## 7. GEO: getting cited by AI, not just indexed by Google

The last piece of the rebuild is GEO — generative engine optimization. As more people take their answers straight from an AI, content visibility stops being decided by click-through rate and starts being decided by the probability of being cited. I wrote a full [six-part column](/columns/geo/) about it, and this blog is the column's own test bed:

![The GEO column landing page: six pieces, from principles through practice to measurement](/images/blog/rebuild-2026/column-geo.jpeg)

A few of the concrete moves that landed in this rebuild: robots explicitly welcomes GPTBot, ClaudeBot, and the PerplexityBots; `llms.txt` sits at the site root; every post's front matter carries a structured `tldr` field — exactly the paragraph-level extractable conclusion an AI wants when it's pulling an answer; four kinds of JSON-LD structured data are in place. The more painful cut was to the index: across four years the blog had accumulated tag pages where seven in ten tags had a single post underneath, and those thin pages made up more than half the sitemap. Once they were uniformly noindexed and kicked out, the URL count submitted to search engines nearly halved, handing the crawl budget back to the actual writing. And then there's the domain migration (nsddd.top → cubxxw.com), the kind of thing where one wrong step wastes all of it: 301s that preserve paths, old and new assets coexisting under monitoring, old-domain redirects kept at least 180 days.

The complete methodology is in the column; the real-data retrospective on my own site (why 870k impressions bought only 852 clicks, and how to strip the vanity out of a metric) is its own piece, [the rebuild case study](../geo-blog-rebuild-case-study/). One sentence is worth keeping here: **a perfect technical score only buys you a ticket in. What decides whether you get cited is structure, evidence, and endorsement.**

The reorganized content is in service of citation too: every multi-part long-form set is mounted into the column system, so an AI (and a human) can read a thread all the way down:

![The columns index: grouped long-form work, one thread written to the end](/images/blog/rebuild-2026/columns-index.jpeg)

---

## 8. What isn't finished

An honest retrospective has to include this section.

The English side lags the Chinese — the adapters can derive a first draft, but I haven't established a stable rhythm for English polish. Covers are backlogged: the two-stage factory runs fine, but the red line requiring human eyes on every image turns backfilling old posts into slow work, and I accept that pace. Indexing is still climbing — the new domain's index rate remains ugly, transferring authority after a domain migration takes patience measured in months, and GEO's off-site endorsement layer (L5) is essentially untouched. And the radius of automation stops at "suggestion to PR" — I've tried imagining fully automatic merges, and I stop at the same question every time: when it goes wrong, who notices? Until that has a reliable answer, the signature stays in-house.

These are logged here as both a reminder and the backlog for the next round.

---

## 9. FAQ

**Q: Does this pipeline transfer to a non-Hugo blog?**
A: Yes. The master-source pipeline, the question patterns, the two-stage cover factory, the AI on duty, and the GEO checklist don't depend on Hugo. Only the concrete scripts (index generation, front-matter parsing) need rewriting for your system — which is precisely the kind of task with a clean definition of done that you should hand to an AI.

**Q: What does the whole system cost per month?**
A: The bulk is Claude subscription plus API usage; covers bill at roughly three cents each; GitHub Actions stays inside the free tier; Netlify's free tier is enough. For a personal site the total is about the price of a meal out — provided your own time investment bought leverage rather than one more pile of toys that need tending.

**Q: Why not let the AI write the posts and publish automatically?**
A: Because I tried letting AI chase information and produce content end to end, and I took apart where its limits are [here](../ai-auto-news-pipeline-limits/): collection, organization, and derivation it handles fine, but "is this worth writing, what's the argument, does it deserve my name on it" is judgment. Outsource the judgment and the blog has no reason to exist. The agents assembled this place, but the one who lives in it has to be me.

**Q: Copying this from zero — what's step one?**
A: Not installing tools. Break the things you do repeatedly into a task list where each task has a definition of done. Run it manually end to end first, then write the working process into a skill or a script, and only then talk about automation. Get that order backwards and all you'll have is a machine that produces mistakes faster.

---

## 10. What got rebuilt wasn't the blog

The last thing worth saying: on the surface this rebuild shipped a new website. What it actually shipped was **an upgrade to the way I process information.**

Four years ago the bottleneck in blogging was the writing itself — layout, covers, publishing, SEO, each one draining the energy that was supposed to go into the work. Now they're all fixed stations on a line: an agent holds each one, it alarms when something breaks, and every improvement leaves a paper trail. One thing is left that I can't outsource and don't want to — **deciding what to write, and standing behind what gets written.**

Information isn't worth much. The ability to process it is. And in 2026, that ability looks like this in the concrete: one pipeline thought through, a crew of agents with their boundaries drawn, a stack of trust accumulated line by line, and one person who never lets go of the signature.

The new site is at [cubxxw.com](https://cubxxw.com/). Come look around — and go ahead and ask that digital counterpart on the home page. It knows better than I do where you should start.

---

*Further reading: the methodology overview, [The Agent Engineering Map: Where Does That 98.4% of the Work Actually Live?](../agent-engineering-the-98-percent-harness/) ｜ [The Super Individual's Intelligence System](../super-individual-intelligence-system/) ｜ [How Do You Get to the Point Where You Trust an AI Agent Nobody Is Watching?](../trusting-unattended-ai-agent/) ｜ the full GEO methodology in the [GEO column](/columns/geo/).*
