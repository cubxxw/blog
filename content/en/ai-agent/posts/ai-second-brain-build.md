---
title: 'Handing Your Notes Over to AI: Building an AI-Native Second Brain With Claude + Obsidian'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T15:00:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['AI second brain', 'Obsidian', 'Claude', 'PARA', 'knowledge base', 'knowledge management', 'AI Agent', 'QClaw', 'Claude Code', 'Hermes', 'knowledge cards', 'MCP', 'local-first', 'note management']
tags:
  - AI
  - LLM
  - Agent
  - MCP
  - Harness Engineering
  - Automation
description: >
  Most people's note-taking systems are "meant to be read by a human," while what genuinely has leverage in the AI era is a knowledge system "AI can directly read, write, and operate." This essay lays out its three-layer architecture (Claude as the brain, Obsidian as the file system, WeChat as the on-the-go entry point), how to build it step by step, and a real pitfall someone hit in a community: don't try to run the whole chain in one day — validate layer by layer.
cover:
  image: 'images/blog/ai-second-brain-build.svg'
  alt: The three-layer AI second-brain architecture of Claude, Obsidian, and WeChat
tldr:
  - The key distinction is not "a note-taking app meant for humans to read" versus "a knowledge system AI can directly read, write, and operate." The former grows as you record more; the latter gets stronger the more you use it.
  - "Three-layer architecture: Obsidian (a local Markdown file system, AI's workbench) + Claude/an Agent (the brain, reading and writing your library, running pipelines) + WeChat and similar on-the-go entry points (low-friction capture)."
  - "Why Obsidian: pure local Markdown, structure equals folder layout — AI can operate it the way it operates a code repository; local-first keeps your context living in your own hands."
  - "Build order: define structure first (PARA) → install an Agent runtime (start with QClaw, upgrade to Claude Code/Hermes) → have Claude lay out the library → turn knowledge-card and creation workflows into skills → wire up capture entry points → add retirement."
  - "The biggest pitfall, from a real retrospective: don't try to run the whole chain in a single day. Validate each layer independently, get one working before wiring in the next — otherwise you can't localize which layer is broken."
maturity: budding
---

## First, Separate Two Kinds of "Note Systems"

Start with one question: is your note-taking system **meant for you to read yourself**, or **meant for AI to operate on**?

In the AI era, that difference is large enough to determine the ceiling on your efficiency.

- **A system meant for humans to read**: its core is formatting, backlinks, a nice-looking graph view. You open it to "browse it yourself." Its ceiling is your own eyes and time — it's worth exactly as much as you can personally read and flip through.
- **A system meant for AI to operate on**: its core is clear structure, uniform format, machine-readable. You open it more so AI can browse for you, look things up for you, compress ten documents into one page for you, draft against your framework for you. Its ceiling is your **structure** — the better you organize your knowledge, the more work AI can do on your behalf.

I made this point in [Your Knowledge Base Is Not a Bookmark Folder](../info-to-creation-knowledge/): in the AI era, your knowledge base is simultaneously the context you feed to AI. This essay grounds that in the most concrete place possible — **how to actually build a second brain that AI can directly operate on.**

I'm drawing on a large amount of real build practice from a community of tens of thousands of AI users (some succeeded, some got stuck for an entire day), and abstracting it into a reproducible architecture and set of steps.

## A Three-Layer Architecture

Break down an AI-native knowledge system, and it's just three layers:

1. **File system layer — Obsidian (where knowledge lives)**
   A purely local Markdown repository. All your knowledge is stored as plain `.md` files, in a clear folder structure. This is AI's workbench.

2. **Brain layer — Claude / an Agent (who operates it)**
   An AI Agent that can read and write this repository and run workflows. It reads your library, processes according to your rules, and writes the results back.

3. **Entry-point layer — WeChat and other on-the-go channels (how you feed things in)**
   A low-friction entry point you can capture into anywhere, catching inspiration within three seconds of it appearing, rather than waiting until you're "back at your computer."

Each layer has its own job: Obsidian is responsible for "storing things neatly," the Agent is responsible for "actually putting it to use," the entry point is responsible for "catching it." Below, I go layer by layer through why these choices, and how to build them.

## Why Obsidian: Local Markdown Is What Lets AI Actually Operate on It

Why recommend Obsidian (or any equivalent local Markdown setup) for a knowledge base, rather than a cloud-based rich-text tool like Notion? For exactly one reason: **AI needs to be able to operate on it the way it operates on a code repository.**

- **Purely local, purely Markdown**: every piece of knowledge is a plain text file. An Agent can read it, edit it, and create new ones directly, with no API layer and no need to parse a complex proprietary format.
- **Structure equals folder layout**: however knowledge is categorized, that's simply which folder the file sits in. This folder structure itself is a map you're giving AI — it finds things and places things according to that map.
- **Local-first, context living in your own hands**: your judgment, positioning, and history all live in local files, not locked inside some cloud service. This "worldline" is the most valuable thing between you and AI, and it's worth keeping in your own hands.

For organization, I recommend **PARA**: Projects (ongoing), Areas (long-term responsibilities), Resources (topic materials), Archives (archived). It's centered on "action" rather than "discipline," which naturally ties knowledge to "use." The good news — you don't have to build this skeleton by hand. **Have Claude lay out PARA inside Obsidian for you; it takes a few minutes** (someone in the community did exactly this, one instruction and done). You're responsible for defining the structural principles; building it is AI's job.

## The Brain Layer: From "It Runs" to "It Can Be Upgraded"

The brain layer is the key to bringing the whole system to life — you need an AI Agent runtime that can read and write your local library. The path people took in the community was **staged**, and I think that's the right approach:

**Step one, get it running first (good enough is good enough).** Use an out-of-the-box Agent client (a lot of people in the community start with QClaw) — install it, get it conversing, get it turning your prompts into reusable skills, get it connected to your on-the-go entry point — reach a "60%-functional, usable" state first. The goal of this step isn't perfection — it's **getting the flywheel spinning at all.**

**Step two, upgrade once you want more power.** Once it's running smoothly, move up to a more capable Agent runtime (Claude Code, Hermes, and similar), so it can genuinely read and write your Obsidian repository, run workflows in a terminal, and call tools. This is the step where you start enjoying the full capability of "AI directly operating your knowledge base."

**Step three, turn your methods into skills.** This is the step most easily overlooked, yet with the highest leverage. Take the workflows you use repeatedly — like "distill this piece of material into a knowledge card" or "draft an initial version following my creation framework" — and write them into fixed prompts/skills installed into the system. The "knowledge card prompt" and "knowledge-creation-framework install guide" circulating in the community exist for exactly this purpose. **Only once a method becomes a skill has AI truly taken over the process, instead of you re-explaining it every single time.**

One mental model to hold onto: **you decide the structure and the rules; execution is the Agent's job.** AI has no intuition, only rules — spell out the rules clearly (how folders are divided, what format cards take, what qualifies to enter the library), and it will run stably according to them.

## The Entry-Point Layer: Low-Friction Capture

However good the system is, if "putting things into it" is a hassle, nobody uses it. So you need an on-the-go, zero-pressure capture entry point.

A very typical move in the community is **connecting the Agent to WeChat**: while walking, commuting, in between meetings, whatever crosses your mind gets sent to it directly — it catches it first, then files it into the library according to your rules afterward. The key isn't which app you use, it's this principle: **capturing should be fast, messy, and careless; processing should be slow, clean, and deliberate.** Don't worry, in the instant a spark of inspiration hits, about which PARA folder it belongs in — that's the Agent's job, later.

## Don't Miss This: Retirement

Once the system is built, you also need to install a **retirement valve**, or it will sooner or later degrade back into a bookmark folder. The community founder's rule is blunt: if a piece of knowledge goes unused after being stored, it should be deleted. In practice: have the Agent run every last week of the month, moving cards that haven't been called on in a long time into Archives. This way, what remains in the library is always knowledge that's genuinely working for you. (I unpacked the reasoning behind this in the [knowledge essay](../info-to-creation-knowledge/).)

## The Most Important Lesson: Don't Try to Run the Whole Chain in One Day

With the architecture covered, here's a lesson more important than architecture — and it comes from a particularly honest retrospective in the community.

Someone deployed this `Claude + Obsidian + WeChat` combo for a client, and **got stuck for an entire day**: logging into a membership account took half an hour, downloading the client and getting it authorized got stuck for over an hour with several different approaches that all failed, scanning to connect WeChat took several tries, and it finally got stuck again at the terminal login-authorization step. Meanwhile, having Claude lay out PARA in Obsidian went smoothly in a few minutes.

Their reflection, I think, is the single most important line in this whole piece to remember: **it wasn't that the method was wrong — it's that trying to run the entire chain in one day was too rushed. Validate each layer individually, and split the work across multiple days.**

This is the first principle for building this system — **validate layer by layer**:

- First install only Obsidian, confirm the PARA structure and read/write work fine;
- Then wire up only the Agent, confirm it can read and write your library;
- Then connect only the entry point, confirm capture actually gets in;
- Only then wire up knowledge cards, retirement, and the rest of the workflow.

Get each layer running and confirmed independently, then move to the next. If you greedily stack all four layers at once, you won't be able to localize which layer is causing a problem, and you'll end up "stuck for an entire day." This is the same logic as engineering's "commit in small steps, verify at every step" — I wrote a whole essay specifically on this mindset in [Installing Quality Gates Into Your AI Workflow](../engineering-discipline-ai-workflow/).

## Don't Build a System Just to Build a System

Last, a bucket of cold water, because this is the biggest trap.

The community founder had a line that serves as ballast: **a tool is not the goal — it exists to solve a problem. You buy a hammer not to admire it every day, but to drive nails.** Building this second brain isn't about owning a cool-looking system to show off screenshots of — it's about solving the single most annoying concrete problem in your work.

So the right way to start isn't stacking all four layers at once, following this essay to the letter. It's: **pick one knowledge-related action you have to repeat every day and find genuinely annoying** (like "compress the three things I read today into points I can actually use" or "organize this pile of drafts into a first version in my style") and use this architecture to get **that one thing** working first. Run it through once, and you build muscle memory; run through one more, and the system grows naturally.

The system grows out of repeated, real use — it isn't something you pre-build. Drive the first nail first.

---

*Further reading: the methodology behind this system is in the column [From Information to Creation](../info-to-creation-the-framework/); the engineering discipline part is in [Installing Quality Gates Into Your AI Workflow](../engineering-discipline-ai-workflow/).*
