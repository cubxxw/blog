---
title: 'August 2026 Thought Notes: Agent Harness, Product and Self-Knowledge'
ShowRssButtonInSectionTermList: true
date: 2026-08-31T23:59:59+08:00
showtoc: true
weight: 1
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Blog
  - Monthly Notes
  - Personal Reflection
  - AI
  - Agent
  - LLM
  - Product Strategy
  - Open Source
description: >
  A complete record of August 2026: 484 notes across 9 themes, led by AI and agent systems (212), product, engineering and open source (96), self-knowledge and psychology (36) and business and career (9). Entries keep their original timestamps; only notes that could hurt a specific person or myself were left out.
tldr:
  - "August was mostly spent building agent harnesses: permissions, evaluation, memory and the boring plumbing that decides whether an agent is usable."
  - "The same note kept coming back: a demo is not a product, and the gap is measured in failure recovery, not in capability."
  - "Self-knowledge notes in August are about attention and energy rather than about motivation."
maturity: budding
---

# 2026 August Thought Notes

> **484 notes this month** | recorded from 2026-08-04 to 2026-08-31
>
> **Themes**: AI and Agent Systems 212 · Daily Notes and Everything Else 118 · Product, Engineering and Open Source 96 · Self-Knowledge and Psychology 36 · Business, Investing and Career 9 · Content, Craft and Recording 6 · Reading, Ideas and History 4 · Travel, Places and Cities 3
>
> Everything from the month is kept here, filed by theme, each entry carrying its original timestamp.

---

## 1. AI and Agent Systems

*212 entries*

<!--memo:b2915a1f5290-->
### What was the original requirement:

> 2026-08-04 00:07:12 · `#ailoha`

Our task is to build an independent small project within 48 hours: Lite Ailoha

Goal:

The user uploads a chat screenshot, and can optionally attach a supplementary text note. The system needs to understand the context in the screenshot, identify executable actions, and generate action cards the user can confirm (mainly Create Meeting, Create Contact, Update Contact). After the user confirms a card, it combines the user's contact data with the current context to generate insights and suggestions that are helpful to the user (the insights and suggestions are the key content).

Final deliverables: a product form (iOS app), a GitHub repo, a runnable test environment (local or cloud deployment both fine), no other restrictions


<!--memo:ff805931d62c-->
### Can be recorded throughout using daypage

> 2026-08-04 00:07:29 · `#ailoha`

Can be recorded throughout using daypage, how meta-awareness guides it

Can deeply supplement some knowledge systems on how to do an independent task, how to analyze requirements, how to reference some very cutting-edge aesthetic systems

Through this task I can deeply understand what the other company's needs are

Deep thinking and exploration on the question of how to market

The ability of how to supplement and confirm this requirement


<!--memo:9102384a7585-->
### What if I get really excited during the process

> 2026-08-04 00:48:48 · `#ailoha`

I feel like the pain of the past period has brought me some awakening

I'm excited and looking forward to the moment I can show my understanding of the world


<!--memo:7a121db1cb75-->
### Why not do it the original way

> 2026-08-04 01:00:37 · `#ailoha`

Always wanting to add my own creative twist?

Starting a business feels so bitter

Wanting to prove myself

Today I was influenced by Master Hong Yi again

damn it, why can't I be the most badass


<!--memo:c2e953508da7-->
### Even in headhunting, top-tier work has a far stronger word-of-mouth effect

> 2026-08-04 01:09:07 · `#ailoha`

Even in the headhunting industry, the effect of doing upper-tier headhunting (the spread effect) is far stronger than downstream headhunting

Payment rates are higher too; the bottom-tier headhunters have a FOMO mentality


<!--memo:07151456ff08-->
### My metacognition is very strong

> 2026-08-04 01:11:47 · `#ailoha`

To me the body seems to be just a kind of sensor

Go make contact with this world; play this game bravely!


<!--memo:43c03a537ba8-->
### Spending 48 hours making a useless product is a painful thing for me

> 2026-08-04 01:13:20 · `#ailoha`

Spending 48 hours creating value for this world is a very exciting thing for me

Like walking along the edge of a cliff


<!--memo:d1b3d4288893-->
### Top talent will almost never go on any recruiting platform

> 2026-08-04 01:27:40 · `#ailoha`

80% of top candidates are "passive candidates" — they're employed, and need to be discovered, persuaded, and coaxed


<!--memo:6867ac3da806-->
### Sometimes the other side hands you an assignment

> 2026-08-04 01:30:12 · `#ailoha`

You can appropriately adjust the structure of the assignment

The purpose of adjusting isn't only to let them see you

it's also so that in the process you can evaluate them


<!--memo:65397ae02ae7-->
### A few pain points, from the recruiter's perspective:

> 2026-08-04 03:03:57 · `#ailoha`

Maimai, Liepin, and Boss Zhipin data isn't interconnected, and their anti-scraping mechanisms are extremely strict. Many AI plugins based on code injection easily trigger risk controls and get accounts banned

Breaking the ice is so hard — sending "are you there?" on WeChat easily gets ignored

The later-stage follow-up problem — how to follow up, how to manage, how AI reminds


<!--memo:003fbc65e02b-->
### For iOS, what extended capabilities can recording have support for

> 2026-08-04 03:13:18 · `#ailoha`

Screenshot Automation

Visual Intelligence text extraction

Siri

Back Tap / Action Button / Control Center

Live Activities / Dynamic Island

Widgets + Interactive Widgets

Apple Intelligence / Use Model on-device action models

Clipboard / Files integration

PiP mode is interesting — picture-in-picture — but it only works for voice or video calls. Still, it could work like Quark's homework-search approach: AssistiveTouch, the little white dot method + Shortcuts


<!--memo:a2fffdc66234-->
### The data-recording part is clear, but what about the data flywheel?

> 2026-08-04 03:32:39 · `#ailoha`

The data-recording part is clear, but what about the data flywheel?


<!--memo:7a3f063d4ee2-->
### Take a look — among all the tools headhunters commonly use

> 2026-08-04 10:42:37 · `#ailoha`

Today let me look at it — among all the tools headhunters commonly use, the mode they're basically in all the time is chatting with people in a cafe, then recording in a fragmentary way into their own thinking notes, managing it with flomo or Get Notes ....


<!--memo:8157eace4807-->
### Another point is the usage scenario; I've observed headhunters at home and abroad

> 2026-08-04 11:58:01 · `#ailoha`

Actually there's another point, which is the usage scenario: I've observed that headhunters at home and abroad basically use different platforms. Generally speaking, on mobile they mostly do more lightweight interaction logic — for example maintaining certain groups, and maybe doing some capabilities like that on mobile: chat records, extracting key information, then combining with recording tools to quickly convert local screenshots into local projects or to-do lists

They generally manage and interact on the PC side through a kind of thinking-table approach

So relatively speaking, mobile should consider frictionless capture and instant response

Web / browser extension: the early Web side can be extremely minimal, mainly serving as a data viewer and configuration center, quickly establishing users' data dependence

Ensure a "seamless flow" across devices: this is the experience users care about most. For example, a "candidate to follow up" generated from a screenshot on the phone, when you open the desktop Web side, can float directly as a card on top of the browser, supporting one-click drag into a CRM system, forming a true closed loop (or connecting to third-party platforms via MCP, which can help third-party platforms manage and maintain data)


<!--memo:bca85496087c-->
### It can be a tool scenario, it can be made into a general need

> 2026-08-04 12:03:17 · `#ailoha`

It can be a tool scenario, it can be made into a general need, it can be a universal relationship need

But the thinking is mainly around strong needs — HR's pain points, how to maintain and manage contacts

Make the mobile side lightweight, only doing the management layer; more of the logic can go through Codex on the desktop side for more complex processing operations


<!--memo:9854791814fd-->
### A pain-point scenario for browser extensions:

> 2026-08-04 12:04:46 · `#ailoha`

Second-level scraping and entry when "swiping through people" on recruiting sites

This is the most essential and highest-frequency scenario for headhunter plugins right now. A super-individual headhunter has to swipe through hundreds of resumes a day on Liepin, Boss Zhipin, Maimai, and LinkedIn

When they see a suitable candidate, the traditional operation is "open resume → manually copy name and phone → switch to CRM system → create new contact → paste and save," which takes at least a minute per round; by the end of the day their fingers ache.

The plugin floats on the side of the recruiting webpage. When the headhunter finds a good resume, one click on the plugin button automatically extracts the name, company, position, and contact info on the page, and directly generates a "create contact" card. After confirmation, the data automatically syncs to the headhunter's Feishu spreadsheet or CRM. This can compress "find a person, save a person" down to 5 seconds

Then there's also: quick screenshots can only summarize; for example some important information still relies on repeatedly sending it, which is very difficult


<!--memo:4debf31dbc92-->
### Like LightUp, AroundDeal, and the various ones on GitHub

> 2026-08-04 12:16:39 · `#ailoha`

Things like LightUp, AroundDeal, and the various open-source scraping scripts on GitHub used to scrape resumes into databases have already proven this is a strong-demand logic

The headhunter's core KPIs are resume referral volume and interview volume


<!--memo:2ebeb4489429-->
### I found that what they're currently doing still includes some things

> 2026-08-04 14:46:05 · `#ailoha`

I found that what they're currently doing still includes some things — doing some computer use

And then doing some localized tools via RPA or OCR. OCR is a localization — automatically capturing the content of an image, segmenting it out, then automatically handing it to an AI interface for processing. But the biggest problem here is platform risk control; Boss Zhipin targets browser extensions specifically, including doing a detection for the traditional Codex approach


<!--memo:6ba9dd15c30f-->
### The granularity issue also involves long-term value and short-term value

> 2026-08-04 15:03:05 · `#ailoha`

The granularity issue also involves long-term value, short-term value, long-term memory, and how the business is handled

The surface layer can hold some hard metrics, basic tags and so on — this part is structured fields: base salary, and some core skills (but this should take the degree of intelligence into account, for HR's reading experience and quick filtering (in service of the UI, there can be some lightweight databases))

The middle layer can hold some dynamic soft tags and cognitive profiles, used for precise matching — also the highest-value direction for AI. In the wiki system: personality traits, career leanings, tags

The bottom layer is some raw evidence, structured data — this part is the raw repository of user input, generally already processed by AI


<!--memo:ce99fe246ca9-->
### Aesthetics thinking, scenarios

> 2026-08-04 15:20:36 · `#ailoha`

The beauty of Notion's borderless cards, the switch between card view and list view; every candidate is a card — avatar, core tags, most recent follow-up time presented in a minimalist layout, large areas of whitespace, clear visual hierarchy

LoanZa CRM's view — large type, font styling, the trend charts it leaves; cards use slightly rounded corners and weak layered shadows so elements visually "float," reducing cognitive load; the pairing of "soft neutral tones + brand accent color" makes dry candidate data look premium and easy to read

Restrained color and type size

The display of a relationship graph, visualization, WOLB's design — essentially it uses custom tags to layer your network, with nodes and connecting lines showing the energy of relatedness. That's an advanced capability

Key information should be traceable — meaning ideally, even on the wiki page, it should clearly show every piece of new information and the log of additions, so that traceability is supported. Relatively speaking, the context is more complete; it's essentially a wiki logic, and the wiki logic has to be done well first


<!--memo:2a6558af8526-->
### The initial goal is definitely that I want a lot of people to sign up

> 2026-08-04 16:09:57 · `#ailoha`

I think the initial goal is definitely that I want a lot of people to sign up, and to complete complex login/signup verification, and have decent aesthetics. At login they can choose Google login or Apple login, and after logging in they naturally enter a multi-user, multi-tenant page, where each user has a management system

And then can complete a series of operations


<!--memo:62758fff71aa-->
### In terms of its data structure, I think the lower the layer the more divergent, the higher the layer

> 2026-08-04 16:12:06 · `#ailoha`

In terms of its data structure, I think the lower the layer, the more divergent it is, and the higher the layer, the more it tends toward relative convergence

But as for this relative convergence, I think it serves users' felt experience more; and from the user's standpoint, what boundary value it can reach — this is a question of intuition and of users' felt experience

For example, regarding its storage logic: for the lower layer it doesn't matter — any form of input. Then at the wiki layer, it's actually compiled into something an LM can clearly process, a layer serving LM calls. And the upper layer might be a relatively flexible JSON layer where users can define their own fields, define some parameters, set some schemas — what it serves is user filtering


<!--memo:6b0bfba14790-->
### Even if you keep expanding context, with all kinds of ways to sense and perceive context

> 2026-08-04 16:15:44 · `#ailoha`

Actually, even if you keep expanding context and have all kinds of ways to sense and perceive context, I still feel there's a lack of a kind of original felt experience. I've emphasized this felt experience thing many times — relatively speaking it really matters a lot in this scenario, because the closer you get to the user layer, the more you need felt experience; it's more a kind of intuition, and taste

For example, the question of how the UI should be displayed


<!--memo:2bb0986cc641-->
### Privacy, security, and encryption are a two-way door — not very important content

> 2026-08-04 16:19:21 · `#ailoha`

Privacy, security, and encryption are a two-way door — not very important content, usually later-stage content

This part is important, but not urgent


<!--memo:1b2519447954-->
### The wiki logic — wiki, agent, and

> 2026-08-04 16:30:49 · `#ailoha`

The wiki logic, and the question of the process order between wiki, agent, and raw

This part tests the question of users' felt experience


<!--memo:a5323b506322-->
### The upper layer is some entities

> 2026-08-04 16:46:13 · `#ailoha`

Entities are essentially a user-level thing, a user-value thing

The bottom layer is essentially an application of wiki

So the upper layer's roles and tags are all abstracted out

Designing it this way has one advantage: some things can be abstracted out — for example the input logic can also be abstracted out; as long as it has nothing to do with the user, it can be abstracted into some underlying infrastructure. So the input essentially has some base code or some processing logic, for example for the underlying database or backend API design; that part can be done first, it doesn't matter

And on the other hand — for this project, say — I abstract several layers. The very bottom is a data source layer, which is essentially also data: storage based on some underlying data structures, plus some infrastructure — how they get built, similar to an info layer. But the middle layer, I think, is more about business processing logic: for example how it goes through some raw data, how its agent loop works, how its multi-agent system is implemented, and its agent density — what architecture it supports, and what effect it's ultimately supposed to achieve, and how that gets evaluated. And this part is also a middle layer — the core business logic; how should it be designed? And I think the LLM wiki is included in this aspect too, because actually when we input data, the system will first judge — it'll have an agent system that judges how this information should flow. It definitely can't just take in any form of information raw; rather, it acts as a unified scheduling entry point in the middle

And then there's also: what does its final landed form look like? At that point it definitely still stores things in a wiki way. But this kind of wiki serves the upper-layer user: one, you can call your wiki inside the AJ system; another, your own agent system's service — when it's displayed at the upper user layer, what semantic definitions will it have? This is a user-value-layer matter: how should its nouns be used? How should its logic be set? How should its interface be optimized and laid out? This part can be done with skills

A schema is just a way of presenting it; the bottom layer also has a single source of truth


<!--memo:64c920872916-->
### Sometimes there are conflicts

> 2026-08-04 17:03:09 · `#ailoha`

But when facing a conflict, the first thing to do isn't to rush into resolving it; I think what matters more is to analyze the conflict from several angles and break it down further

For example some raw conversation screenshots and meeting notes,


<!--memo:e7b29def3b0b-->
### The doubt in my mind is this: for example, when I'm facing some problems

> 2026-08-04 17:03:12 · `#ailoha`

The doubt in my mind is this: for example, when I'm facing some problems — like when starting a new project, there may be many corresponding knowledge documents or directions, and managing these documents is a tedious thing. Or there are a huge number of scattered thoughts drifting in various places, and how to aggregate them together — I think that's still a very challenging thing. What I understand as aggregating together: there are some relatively important things — some successful experiences — and they can count as knowledge, but some scattered thoughts may not necessarily be like that. So what I want to do is figure out how to assemble them together, assemble them well together; could that also be applied to projects — for example some new projects, some full-stack-type projects including front and back end: should it make an additional knowledge-base organizing method? Or compile some previously fragmented inspirations together too? Can it be managed using a Karpathy-style LLM wiki approach


<!--memo:92ae7087945b-->
### Halfway through the task, I've actually spent half the time designing, researching

> 2026-08-04 17:26:32 · `#ailoha`

Halfway through the task, I've actually spent half the time on design, research, understanding requirements, judging boundaries, and expanding and training my own aesthetics and intuition

I haven't started writing code


<!--memo:10446ad9d308-->
### This task is quite interesting; it also pushes me to understand how to quickly

> 2026-08-04 17:27:31 · `#ailoha`

I think this task is quite interesting; it also pushes me to understand how to iterate quickly. It counts as a very good question in my own practice — it's a good question


<!--memo:34b7bfa14de6-->
### Should also sort out a domain and server

> 2026-08-04 17:44:48 · `#ailoha`

damn it, if you're going to do it, do it as badass as possible

Strong user willingness to pay

talentsignal.com is gone

gettalentsignal.com ✅


<!--memo:80fca8211018-->
### Analyzing from a technical angle, even if the role's workflow

> 2026-08-04 19:52:47 · `#ailoha`

Analyzing from a technical angle, even if the workflow for handling roles can be consistent

what embodies user value is the corresponding information being processed, and what kind of result is fed back to the user


<!--memo:dec700c11efd-->
### Should set up all kinds of automation capabilities to greatly boost Codex

> 2026-08-04 20:36:02 · `#ailoha`

Should set up all kinds of automation capabilities to greatly improve the efficiency of using Codex, and complete the project to the greatest extent


<!--memo:648be9f6e9d4-->
### Continue considering the agent layer

> 2026-08-04 20:58:03 · `#ailoha`

A few capabilities. One is OpenClaw connecting to WeChat, so it can serve as a lightweight entry point connected inside WeChat

Another is being able to connect to Codex or Claude Code in an agent way


<!--memo:ca4a73349dd0-->
### Vision OCR, bounding box

> 2026-08-04 20:58:30 · `#ailoha`

A cloud agent can do more things

Don't think about masking at the beginning


<!--memo:0d84d041fb53-->
### Thinking about notification capabilities and scenarios — some of my own thinking and taste

> 2026-08-04 21:09:24 · `#ailoha`

Thinking about notification capabilities and scenarios — some of my own thinking and taste in this business

I think before thinking, first think about what has differing value. Some things only have differing-value records — for example, a contact newly added a preference, with no clear deadline; the agent's wording is ambiguous; the agent is only speculating that the candidate might go cold. This kind of thing generally should just be recorded, no need to notify. Not every signal should turn into a notification

Scenarios: the silent layer timeline — usually adding a preference, the daily brief

iOS notifications natively distinguish interruption levels like passive, active, time-sensitive, and critical. Time Sensitive can break through some notification controls

Time Sensitive: clear and about to be missed, with a definite time, an expiration time, a real window — Dynamic Island

AlarmKit: real alarm-level reminders. AlarmKit lets third-party apps create genuinely attention-grabbing alarms and countdowns, which can bypass silent mode and the current Focus mode, and can also display on the lock screen, StandBy, Dynamic Island, and a paired Apple Watch. This fits cases where the user explicitly says this needs a reminder — a definite interview or a strong phone-call reminder

Apple's definition of Live Activity is: letting users continuously track an ongoing task, event, or activity over several hours; it appears on the lock screen, Dynamic Island, Apple Watch Smart Stack, Mac menu bar, and so on

So relatively speaking, I think when the user taps, say, continuous follow-up, or the user wants an upcoming candidate event, then the linked display should show the most critical state — for example the interview time, the interview status

Apple Watch is a very good channel; sometimes the phone gets ignored, but the watch's tap is hard to fully ignore. So generally, for people in social-type work or fields with tight time requirements, the iWatch is a strong need

Calendar should be integrated, but don't pollute the calendar

Widgets, the lock screen, and system entry points can also be elegantly designed, including Siri and Shortcuts


<!--memo:a1c63f930452-->
### Some thoughts on the industry:

> 2026-08-04 22:03:51 · `#ailoha`

Top headhunters don't do the closing; what they take on is the task an organization can't complete on its own with job descriptions, databases, and interview processes


<!--memo:b5624dafabdc-->
### Hard to believe — actually starting to write code only now

> 2026-08-05 01:32:54 · `#ailoha`

And me, I'm getting ready to go to sleep ...


<!--memo:5506ab0ae1ee-->
### Let's think about the promotion problem

> 2026-08-05 09:00:21 · `#ailoha`

Headhunting feels like a very vertical industry

Without experience in this field, the narrative has to be a bit grander

The marketing narrative must broaden

The specific product positioning must narrow

The product's positioning is aimed at headhunters; the main perspective of user value is the headhunter themselves

At the product marketing level, it's a general product: from private conversation evidence, to a confirmed, traceable, recoverable next step


<!--memo:2ee93c755e37-->
### https://www.granola.ai/

> 2026-08-05 13:49:52 · `#ailoha`

https://www.granola.ai/ 's drag-and-drop interaction effect — the sense of interaction is very well done

https://www.leonar.app/features/leonar-source/ 's borders, hover, font styling, typeface, and the aesthetic details of the top nav bar are all done very well, well worth learning from

https://rondesignlab.com/ 's large type is well worth learning from

Attio: reference its type hierarchy, restrained spacing, and the high-fidelity product interface that appears immediately below the first screen. Talent Signal should most learn its sense of product completeness.

Metaview: reference how the first screen simultaneously accomplishes category positioning, value expression, and real product display. Don't copy the green dark style; only learn the structure.

Common Room Signals: closest in concept to Talent Signal. It draws scattered signals directly as recognizable people, events, and actions — closer to business semantics than atomic orbits.

Clay: reference how to build a brand world others can't easily copy, and how to quickly follow strong visuals with customer evidence.

Juicebox: also in recruiting AI; reference its category expression, interactive product demo, and post-first-screen customer logos — rather than copying the purple.


<!--memo:3d23074f9996-->
### 3. Competition isn't weak; some products' promises are already covered

> 2026-08-05 23:13:39 · `#ailoha`

This market isn't a blank market.

The publicly available capabilities of recruiting products already include:

Metaview: automatically records, transcribes, and structures recruiting conversations, and syncs to ATS;

SourceWhale: captures calls, emails, SMS, WhatsApp, and meetings, automatically forming complete context and next steps, and syncing to CRM/ATS;

Loxo: centralizes candidates, clients, conversations, and history, and provides AI queries with citations, based on permissions and database content;

Other AI recruiting products also offer candidate signals, follow-up, structured evidence, and ATS-ready notes. SourceWhale

Therefore Talent Signal can't define its differentiation as:

AI summarizing recruiting conversations;

automatically discovering candidate signals;

generating next steps;

remembering candidate context;

writing back to ATS.

These capabilities are rapidly becoming the standard configuration of recruiting software.

There are only three differentiators that could genuinely hold:

Private channel capture

Handling WeChat, WhatsApp, LinkedIn DM and other contexts that ATS and meeting bots can't capture.

Verifiable temporal state

Not saving a summary, but maintaining "what fact changed and when."

High-trust action governance

Evidence confirmation, action approval, execution, and target-side read-back are mutually independent.

These three directions are valuable, but there's currently no evidence that headhunters are willing to bear the operational cost of these extra steps.


<!--memo:0d85313d9f90-->
### OCR's capability

> 2026-08-06 00:48:44 · `#ailoha`

It feels like there's a fatal problem

The efficiency is very low, with no added value

I suggest scrapping the privacy scheme entirely and just doing it


<!--memo:259e68feccd1-->
### It's as if the real world has been put on multi-speed playback

> 2026-08-06 11:17:42

In the AI era, where the world flickers like a film's frame rate — it's as if the real world has been put on multi-speed playback

The world also flickers and refreshes like a film's frame rate

Subjective time seems compressed, chopped into pieces; there's no way to look back at some people and some experiences from the past, and there isn't even time to settle your own inner life

Every time I recall it, tears well up unstoppably

What's visible is only the present frame, flashing by in a hurry

If only the world could slow down a bit ,,,

so you could say goodbye properly, see someone off properly, and say thank you properly

Luckily life is long; at least you can trade some time for some presence ....


<!--memo:3c6d24781740-->
### Some fairly common-sense understanding — current understanding of technical common sense

> 2026-08-06 12:30:14 · `#ailoha`

Some fairly common-sense understanding — current understanding of technical common sense. For example, Level Tears now, the OCR route on iPhone: it's essentially a device sprint — fast, power-saving, no network — but it doesn't do image understanding, meaning its comprehension ability is very weak. But Doubao's SAD series, its large models, can not only do text-level work but also understand the layout structure and semantic relations in images. So the tested speed is also very fast, and accuracy is currently in the top tier. For the early phase, I think it's still better to use Doubao's model form; relatively speaking, the price is about 15 RMB for 1000 images, roughly 4 times cheaper than US models


<!--memo:897f72c4899e-->
### The right moment to market it to headhunters should be when its basic chain is very clear

> 2026-08-06 12:55:09 · `#ailoha`

I think the right moment to market it to headhunters should be when its basic chain is very clear, or when it produces an "aha moment." From the user-value perspective, it should produce some fairly good feedback. For example screenshots: every time a screenshot is taken, it actually produces some actions — for instance it has an automation chain that completes some basic actions and does some basic archiving for this user. These actions can also accurately do certain things, probably things related to the current user, like setting some alarms

And actually these actions can probably do quite a lot, but this area still needs more concrete thinking — it should also be an AI platform


<!--memo:9cf58374a2da-->
### And I'm wondering about one question: what exactly is its corresponding carrier

> 2026-08-06 14:54:49 · `#ailoha`

And I'm wondering about one question: what exactly is its corresponding carrier? Is it a person? Or some specific relationship? But what's its form? Because for people, the cognitive cost of "person-to-person contact" is the lowest; the brain easily produces a mapping. But what if it's something virtual? For example, for real estate sales, does what needs to be mapped out the relationship between a company and a corresponding person? What display form would that company have?


<!--memo:c36114c41066-->
### I'm thinking about a specific demand situation, in the user's scenario

> 2026-08-06 19:24:50 · `#ailoha`

I think resume upload is especially important, because resumes can help HR compile more information, build a more complete model of this person, and even some links — these things are also very, very important

If I judge it, I think it's a strong-demand scenario

because actually in most cases you also need to consider some links to analyze this resume, and then use this resume to match the corresponding person or or company


<!--memo:63e7ffa58a58-->
### I want to win

> 2026-08-06 22:12:00 · `#ailoha`

I want to win


<!--memo:6d261c0c53ec-->
### Conclusions from reference products are starting to converge:

> 2026-08-07 14:52:00 · `#ailoha`

Mesh (formerly Clay) proves that "contacts + relationship memory + reminders" can be done beautifully, but its latest Liquid Glass and relationship-strength expression shouldn't be copied directly.

Things proves that real premium feel comes from clear objects, progressive disclosure, and positional continuity, not from stacking materials.

Cardhop / folk prove that search must be a first-level capability on the home screen, and that contacts, companies, and notes must be searchable uniformly.

Granola proves the mobile side should actively shrink its capability boundary, carrying only the tasks best suited to being done on the phone on site.

Attio proves that record depth has value, but moving a desktop CRM wholesale onto the phone sacrifices speed and recognizability.


<!--memo:3c8e24397ac1-->
### I'm thinking — actually these young people

> 2026-08-07 15:08:17 · `#ailoha`

Actually I'm thinking — these young people should be more precious than, say, resource management, I feel. So relatively speaking, there are a few points: the interface must be minimalist — you can reference Notion here; and then input must be very very much aimed at reducing headhunters' burden as much as possible — you can reference Flomo here

And then another point: since this resource is so precious, I think — is it the theme? On the one hand minimalism; on the other hand I think it could look to reference that kind of art gallery, needing large amounts of whitespace, relatively more whitespace; especially you can reference Japanese-style art museums, that design approach — lines, borders, content, theme. And then its management method, management strategy, how to guide people to find the most suitable one


<!--memo:e57a64d3c42d-->
### The chat box definitely isn't the main entry point of the future — so what is a good entry point

> 2026-08-07 15:31:37

A calm, structured, context-aware, traceable, undoable AI

AI appears in the page the user is editing, in selected text, and in database context, rather than forcing the user to leave their workflow and enter a blank chat box


<!--memo:16615d8213be-->
### In which situations — because I think it can also reference that Bommo

> 2026-08-07 16:00:38

In which situations — because I think it can also reference Bommo's model, since in global mode it can show some fairly interesting states. And I think this app's main form should be maintaining these contacts, so contacts are like a core resource for it

I think its page structure can be entirely contact-led, with AI playing an auxiliary role globally. That is, AI should be placed in the bottom navigation bar, and search should also be placed in the bottom navigation bar

And I think adding isn't a high-frequency scenario anymore; it should be placed on the right side of the home page, which might be better


<!--memo:05244e118e66-->
### I'm not very sure whether users will have multiple identities

> 2026-08-07 16:09:48 · `#ailoha`

I'm not very sure whether users will have multiple identities. But in my own thinking, I don't think we need to consider too much in the early phase, because for most people, they probably still have one role in life. In the early design, try to keep it minimal, and make the page very aesthetically pleasing

So I think the home page should be as much like Notion as possible — very tasteful and smooth

And I think it should also allow adding favorites displayed at the front, matching users' intuition


<!--memo:63c6c1048a5c-->
### I've found that, for this scenario of gradually generating UI

> 2026-08-07 17:32:35 · `#ailoha`

I've found that for this scenario of gradually generating UI, if there's no interaction, and at the very beginning you're only determining a few functions, then there's actually no need to bother with high-fidelity mockups, or various other UI images, or any kind of interactive web pages or demos — I don't think any of it is necessary. I think the simplest approach is to determine the requirements, then determine the functions, determine some of the screens the user sees first, and then have it directly generate an image for those screens


<!--memo:31d6fc14f5a9-->
### Consider whether you can do contact relationships

> 2026-08-07 19:00:48 · `#ailoha`

but it feels like for connections between entities, what should be determined first is the entity

Might as well do the contacts part well first


<!--memo:76c7a2f035f7-->
### User metrics / product constraints

> 2026-08-07 19:21:52 · `#ailoha`

Who the user is: headhunters / sales... about their own resources

Core task: screenshots / text / PDFs from all platforms are all uniformly processed into contact data

Success metrics: the program runs properly, can correctly process data information and user information, gives good feedback, adapts to this person's style, and the user can process, maintain, update, and look up their resources


<!--memo:48f22ac31378-->
### Sometimes you need to consider group chats

> 2026-08-07 19:22:47 · `#ailoha`

The effect of recognizing group chats in WeChat


<!--memo:381384e1a384-->
### Memory Poisoning: the attacker

> 2026-08-07 20:33:07 · `#ailoha`

Memory poisoning: an attacker stuffs false information into memory, with an experimental injection success rate above 95%. So before writing you must verify the source, and you can't let just anyone write


<!--memo:4cef4507c29d-->
### Carefully disguised as a scrolling stage where content transforms

> 2026-08-08 09:36:13 · `#ailoha`

Carefully disguised as a scrolling stage where content transforms


<!--memo:8701ec0ba986-->
### agent /

> 2026-08-08 22:12:24

Codex exponential backoff

Idempotency keys are the foundation; reconciliation takes priority over blind retries; error classification decides whether to retry, rather than treating all failures equally and backing off and retrying

cc is similar


<!--memo:e4ccfce3f499-->
### input thinks

> 2026-08-08 22:31:20 · `#ailoha`

iOS Shortcuts

multi-image screenshots / multi-platform adaptation

browser extension

web side


<!--memo:d1c9407a9973-->
### Spider-Man

> 2026-08-09 10:57:20 · `#ailoha`

The most moving thing was the Black Pearl

I feel Black Widow's life was very legendary

She's very much like a friend I know well

went through some brutal training from childhood, selected by a spy program

carries quite a few assassination names on her hands

later defected and became a top agent

top-tier hand-to-hand combat and assassination skills, fluent in multiple languages, skilled at disguise and infiltration, psychological manipulation and interrogation (able to reverse-manipulate the other party into giving up intel)

On the surface calm, restrained, not talkative, even with a bit of sardonic humor; inside she actually carries a strong sense of guilt and self-doubt, always wanting to atone for what she did in the past.

She's the "glue" role in the team — good at soothing teammates' emotions and defusing conflict (like comforting Hulk, persuading Hawkeye), with a strong sense of responsibility and self-sacrifice.

In the end, in Endgame, to obtain the Soul Stone (which requires the sacrifice of a loved one), she actively chose to jump off the cliff and sacrifice herself, completing the redemption she'd sought for years.


<!--memo:e88f590e3ddc-->
### There's a growth-phase question worth considering

> 2026-08-09 14:59:01 · `#ailoha`

I think there's a growth-phase question worth considering. For example, when we design this Workspace, will it involve the real needs of a small team? It might be one where, say, they hire an extra headhunter to do some candidate management. But it could also be that the CEO themselves has some candidates, or a product manager scouts some candidates, gathering their context from different platforms together. It might be a real need aimed at team mode

And I think there's an even stronger possibility: scenarios aimed at specific situations. For example, some sales-type people serve several client companies at once. And of course there's the headhunter case, who may also serve several independent companies. And what they want more is for their candidates to be strongly isolated per company — ideally no contamination between them at all. So at that point they can create a workspace themselves: for instance they create a Workspace for Company One, and then when they create a Workspace for Company Two, they can add some candidate lists afterward; and the lists can be constrained to whichever workspace they're in. So I think there's quite a lot of room for workspaces — relatively speaking it may be something with very strong extensibility, similar to projects


<!--memo:48c9ff568312-->
### It looks like there's only one path here: huddle together and become one whole

> 2026-08-09 15:56:31 · `#ailoha`

It looks like there's only one path here: huddle together, merge into one whole, own it yourself, and get the goal done

Embrace uncertainty, keep grinding, be a risk-taker


<!--memo:b59cdbe5ed59-->
### So his goal should be to finish the goal as fast as he can and not waste other people's time

> 2026-08-09 16:00:20 · `#ailoha`

So his goal should be to complete the goal as much as possible, and not waste other people's time


<!--memo:a8d665d7418f-->
### I never imagined that I'd also quietly influence certain people

> 2026-08-09 17:21:24 · `#ailoha`

I never imagined that I'd quietly influence certain people along the way, and I think that's genuinely quite a happy thing


<!--memo:ee10afe15d21-->
### By now I think I have some essential understanding of teams

> 2026-08-09 21:56:20 · `#ailoha`

Managing a team is also managing upward

What you're essentially managing is a goal

Nobody is in a zero-sum game, it's win-win for everyone

Everyone has only one goal, and that's to win ~

So try to open up everyone's boundaries, understand their abilities, manage them

I suddenly realised that every person has their own capability boundary

Clarify the relationships, needs, network and goal

And get the goal done — that's our job


<!--memo:5eccc3a611d5-->
### Aligned on the goal, not on the opinion

> 2026-08-09 22:04:43 · `#ailoha`

Share context, instead of everyone doing everything together

Cover each other's gaps, but every outcome still has one clear Owner

Be able to raise bad news, instead of covering problems up with a sense of loyalty


<!--memo:29dd7e3b11ef-->
### I want to be the best

> 2026-08-09 22:37:42 · `#ailoha`

My aim is to build the most badass product

A commercial product!!!! I want to learn ~~~

I want to win, I want to want it more than they do ~

I want to record that I will win


<!--memo:5940bf8fce1a-->
### So having been through pain

> 2026-08-10 00:23:50 · `#ailoha`

having been through the era's rapid changes

Everyone comes in a hurry and leaves in a hurry

Even if the characters in the game come in a hurry and leave in a hurry

I still hope I can spend a precious stretch of time with you all sincerely


<!--memo:524eb5a5ff90-->
### Other places on the product / technology side

> 2026-08-10 14:53:39 · `#ailoha`

Members / each person's strengths

Repo analysis and understanding

The basic setup

agent - the AI project is written for agents

Look at and study the project, understand exactly what needs and pain points iOS has

And then at the daily standup the things I still need to solve are some of the issues from user feedback. The standup is at 11


<!--memo:d3e113543b74-->
### Joining ailoha

> 2026-08-10 16:04:26 · `#ailoha`

The pace feels insanely fast

First time I've come across a pace this fast


<!--memo:f7afbc0d1323-->
### Hi, deep analysis — I'm a new teammate and this is the first time I've joined

> 2026-08-10 16:20:40 · `#ailoha`

hi, deep analysis, I'm a new teammate, this is the first time I've entered the alloha team. I hope you can help me set up my own knowledge base for the whole project team — the organisation, the daily work tasks, the workspace, and a wiki of the raw data, including the daily plans and actions. I want this repo to be the central brain of my day-to-day management. I hope it isn't only a technical identity but covers the whole of technology and product, together with some information from the repos under the /Users/cubxxw/date directory, including each of the needed subdirectories and some extra documentation directories, plus the project's automation

The whole browser and automation side can be done with the kimi browser plugin

Team management revolves around https://linear.app/ailoha-ai/team/AIL/projects/all for project management, plus GitHub for project collaboration, and Feishu for daily video meetings, systems and document collaboration

For Feishu you can dig deep into the contents of the Feishu docs and the Feishu people information; store each person for me as a separate wiki, holding their capability boundaries and detailed information


<!--memo:00f616222d05-->
### I found that screenshotting in the current scene mode seems to have problems

> 2026-08-11 00:01:24 · `#ailoha`

I found that screenshotting in the current scene mode seems to have problems. One is what it shows at the top — it just keeps showing the Dynamic Island, which kind of gets in the way of my view. The other is that when actually taking a screenshot, say inside the current chat box and then going straight back after the shot, I find the screenshot still has a delay. I found that pretty surprising, this scene-mode screenshot


<!--memo:84f000e3022c-->
### Right now their biggest problem is still the whole set of design docs or project docs

> 2026-08-11 09:53:19

I think right now their biggest problem is still the whole set of design docs or project docs — the cognitive cost of them is too high

For the ecosystem as a whole, the handling of the AI nodes' boundaries isn't quite good enough

And I think there's another problem: their ecosystem currently still depends heavily on AI to do it, but this approach can create a lot of duplicated work, plus repair tasks

But I think you should still set good boundaries — being clear about a person's boundary, but not the AI's boundary. And on that basis use some of the AI capabilities as constraints, so your project runs in a reasonable direction


<!--memo:38221d94afaf-->
### Claude agent sdk streaming issue / urgent

> 2026-08-11 11:02:29 · `#ailoha`

RC

A whole set of iOS frontend problems

The e2e problems


<!--memo:73e50cf6c7a0-->
### About the two people — essentially it's one task too

> 2026-08-11 14:22:10 · `#ailoha`

About the two people — essentially it's also one task, spiralling upward to complete the optimisation of the whole system

Use Loop engineering to dig deep and execute

Goal-driven (find a good goal and problem)

A goal-driven continuous loop: set a completion goal that can be verified ("all tests pass and everything is committed", "the whole feature list is done", etc.)

After the agent finishes each round, another lightweight model checks whether the conditions are met (not sure whether the same model could verify and correct?)

External state + progress files, to get around the context window limit

The Agent runs tests, lint, build itself, even Playwright screenshot comparison

When it fails it fixes it itself, until it's completely green

The current arrangement of my time is basically designing the Loop itself, plus the verification conditions, the role boundaries and Claude's files

Set the direction of the early exploration and approve the plan

Then when I hit something abnormal I intervene, and when it gets run off course I interrupt

The goal to ultimately achieve:

A person writes linear, or describes it in natural language

Manager Agent automatically: analyse -> produce a Plan -> a human does lightweight approval

Parallel agents: implement + write tests + security review

Local / cloud Loop until the tests are green

The correct practice is that you shouldn't write code, but instead spend thirty percent of your time on the hardest architecture / 0->1 decisions

thirty percent of your time on product and priorities

thirty percent of your time on scheduling and managing the agent team

At the very beginning, improve your own context, and at the same time understand the project's context

Combine with the requirements to ask more questions, raise the dimension of the questions

From ticket → implementation → test → review → build → distribution → monitoring → auto-fix, it's all loops, not a one-way pipeline


<!--memo:7e0c3567b63c-->
### The purpose of architecture is nothing more than two things

> 2026-08-11 18:57:53 · `#ailoha`

Contexts that are clear and at an appropriate granularity for people

and better-designed Evals

Skills, on the other hand, are SOPs that AI can execute and that are version-managed

So the time to write Skills is when this experience has matured, when this set of SOPs can be used


<!--memo:3fb25b1ba567-->
### Thinking this way, why refactor the frontend

> 2026-08-11 19:11:23 · `#ailoha`

and why refactor the CICD

It's nothing more than wanting to optimise and refactor the whole design — starting from the design and thinking about what depth of refactoring space there is


<!--memo:63d07fd12388-->
### /goal OpenClaw is itself a local

> 2026-08-11 22:51:17

/goal OpenClaw is itself a local Agent runtime, and it can treat a whole Obsidian Vault or some subdirectory as the workspace.

Officially there's an openclaw-lark / Feishu Channel plugin, so you can chat directly inside Feishu.

People in the community are already doing "OpenClaw reads local notes → pushes a daily report / Q&A to Feishu".

You can:

point at a local directory (or a Vault subfolder) as that Agent's knowledge source

write a good System Prompt (persona, speaking style, answering boundaries)

serve it externally through a Feishu bot

Related:

Official Feishu plugin: larksuite/openclaw-lark

Community bridge: m1heng/clawdbot-feishu (supports dynamic Agents, workspace isolation)

Deep Obsidian integration: obclaw (specifically organises content into Obsidian, and supports a Feishu entry point)

Deep thinking. I hope you go and seriously research what shape the whole market is in right now. Then I hope in the end you still use Codex integrated with an LLM as the base component, and deeply analyse and design to complete the design of the whole project, finally reaching something that can be deployed and stays resident, and integrating a series of agent capabilities and suitable skills, integrating Feishu — and for the Feishu side I hope it's mainly for when colleagues @ me, to combine this Agent and the local knowledge base for deep analysis, and to hand out a series of hmm usable skills. In essence you could also use Codex's parsing ability, but if something is way out of line, say something involving privacy and keys, if the other person is asking you about it through Feishu, you need to refuse it, you can set up a hook

Then you can reuse the corresponding codex and some local skills, and the local knowledge base you can also use generally, and you can use a lot of capabilities


<!--memo:c2604df03c95-->
### The linear frontend/backend question

> 2026-08-12 10:54:03

the agent part needs to go in the linear agent part


<!--memo:57deed60d28e-->
### aha

> 2026-08-12 14:44:37 · `#ailoha`

A browser plugin, as an agent / skills

Pluggable — for some of the social-like platforms, make it a pluggable effect


<!--memo:eec011cbaa48-->
### For a new teammate to get up to speed fast, first clarify the whole people-project structure

> 2026-08-13 14:38:47

For a new teammate to get up to speed fast, the first thing is to clarify the structure of the whole set of people and projects, and what happens across the whole business process

best if in that process the AI can guide the new teammate to discover a series of problems and bugs

and then the AI can give solutions within that problem


<!--memo:953de484f339-->
### The smallest loop

> 2026-08-13 16:58:28

Change the current:

Claude → start Actor → interpret datasetId → fetch dataset → judge the result

into:

Claude → research_search → directly get a real person record or a clear failure state


<!--memo:bcf690d17fd4-->
### A few problems, three of the ones exposed now

> 2026-08-14 00:53:31

apify_linkedin_name_search

apify_linkedin_structured_search  apify_linkedin_profile_scraper

Actor should be apify's infrastructure; it shouldn't all be exposed to the agent

that's unreasonable — for the agent it can be uniformly wrapped into the same search_person()

cat src/ailoha_agent/agent/prompts/skills/person-profile-analyzer/skill.md

Person Identity Resolution isn't good enough; inside it there's

canonical name aliases company title

but the biggest problem is whether the person you found is actually this person,

you should introduce an Identity Resolution Score, put in some confidence to assess it, to avoid mixing people up

keep tuning in the prompt, add some Chinese communities; right now there's too much LinkedIn, and you still need the agent to flexibly plug in Chinese social platforms


<!--memo:dcefe2d0a5dc-->
### Name search

> 2026-08-14 14:52:49

Name search
Right now when searching for a person, the name, company, role and region are all handed to the Provider together. If this person has already changed companies, the old company will filter them out. If this person has already changed roles, the old role will filter them out too. Once the right person doesn't make it into the candidate list, no amount of good scoring and ranking afterwards helps. The fix is to always run one search with only the name, on its own. Company, role and region no longer restrict the name search. This information is only used to help ranking later.

Alias search
The same person may use different names in different places. For example, the Chinese name might be "高利明", while on LinkedIn it might be written as "Liming Gao". Right now the first alias is only tried when the name search returns no results or very poor results. If the name search returns some wrong people with the same name, the alias search may never run at all. The fix is to treat every confirmed alias as its own independent search route. Even if the name search returns results, keep running the alias search. Only use aliases the user provided or that have already been confirmed — don't let the system guess names.

Company and role search
Searching with only the name may turn up a lot of people with the same name. If you know this person's company or role, you can search again for "name + company" or "name + role". Right now this route is only a fallback. It can also get skipped because the alias route already ran. The fix is: as long as the company or role is fairly reliable, run a context search on its own. This route no longer depends on whether the name search returned results. It's also no longer an either-or with the alias search. The name search is responsible for not missing anyone. The company and role search is responsible for finding the more relevant person among people with the same name.

Merging search results
The same person may be found by all three routes at once: name, alias and company. Right now the system merges duplicate people by LinkedIn URL. But after merging, the system may only remember one rank. That way you can't see that this person was actually found by several routes together. The fix is to keep each route's rank when merging people. For example, this person ranks sixth in the name search, first in the alias search, and second in the company search. When several routes all find the same person, that means this person deserves to rank higher. At the same time, fully keep the company, role, history, region and school information the Provider returned.

Current experience and past experience
A person's current company and their old company must not be mixed together. The company the user mentions may be their current company, or it may be a company they worked at before. If the candidate has now moved to a new company, you can't just decide it isn't the same person because the current company differs. The fix is to store current experience and past experience separately. A matching current company can count as fairly strong evidence. A matching past company can also count as evidence, but not as a matching current company. If the candidate left the company field blank, that only means we don't know. Not knowing isn't the same as not matching. Only a clear and reliable contradiction counts as a conflict.

Candidate ranking
Ranking first in the search results doesn't mean they're definitely the person the user is looking for. The Provider's ranking only means this result is fairly relevant. It can't directly prove the two are the same person. The fix is to judge using name, alias, current company, past company, role, region and school together. A matching name is the most basic condition. Company, role, region and school are used to further distinguish people with the same name. Several search routes finding the same person can also help raise the ranking. But route rankings can't replace identity judgement.

Strong judgement
If the system only knows one name, it can't confirm that the search result is definitely the person. Even if the first result's name matches exactly, there may still be many people with the same name. The fix: with only a name, you can't judge it as strong. Besides the name you also need other evidence such as company, role, region or school. The first result must also be clearly ahead of the second. If there isn't much difference between the candidates, the system shouldn't force a choice.

Show Top 3
When the system can't determine which one is the right person, it should show the three most likely people to the user. Don't show only the first result and let the user mistakenly think the system has already confirmed. The fix is to ask the most useful question based on the differences among the Top 3. If the three people's companies differ, ask about the company. If the companies match but the roles differ, ask about the role. If both company and role are similar, ask about region or school. If that information still can't distinguish them, have the user go look at the three LinkedIn profiles directly to confirm.

Simplest summary
First search once using only the name, to make sure the right person isn't missed. Then search with aliases, to solve the problem of not finding someone under a different name. Then search with company and role, to help distinguish people with the same name. Merge all the search results together, but keep each route's rank and evidence. Finally rank by current experience, past experience, role, region and school. When there's enough evidence, recommend the most likely person. When there isn't enough evidence, show the Top 3 and let the user confirm for themselves. The most important sentence is: first make sure the right person can get into the candidate list, then consider who should rank first; if the person wasn't found at all, the scoring and ranking afterwards is meaningless.


<!--memo:f2d6c6871616-->
### ailoha design — the kiwi interview

> 2026-08-14 21:28:15

Yes, and I now feel I've got it more accurately than I did a moment ago.

What Qi Yi wants to do isn't an "AI assistant that helps you handle interpersonal relationships", and it isn't even just Relationship Intelligence. What she really wants to do is build an environment about "people" for AI: to make AI not only get better and better at maths, Coding, search and productivity, but to start understanding the complex, fuzzy, long-term relationships between people that can't be validated by a standard answer.

She actually used a very good analogy herself: the value of Claude Code isn't just that "the model can write code", it's that it built a coding environment for the model — with context, tools, long-running tasks, and human feedback and verification. What Qi Yi wants to do is essentially similar: if Coding can build an environment for AI, why can't human interaction?

I understand this as having four layers.

The first layer is the most surface-level product: an "external relationship memory".

It helps you remember what a person has said, what they care about, what has happened between you before, and it understands the context of the relationship from these fragments. For example, when you share a video of Matthew McConaughey with her, Ailoha doesn't just remember "Wang Hui shared a video"; it notices that the timestamp of the link you shared happens to fall exactly on the "how to find meaning in the noise" part, and so it connects that detail with the question you were thinking about at the time.

So the initial product experience is very much like:

AI remembers other people for me, so that I become a better friend, colleague, parent, partner.

But this is only the entry point.

The second layer is a relationship copilot: it helps you understand relationships, rather than owning the relationship on your behalf.

This is the most fundamental difference between her and a lot of AI companion products.

A lot of AI products now carry an implicit direction: real people are too much trouble, too much friction; AI is smart, patient, always responds to me, so why should I still deal with people?

Qi Yi is actually wary of this direction.

She thinks AI has a very hidden kind of sycophancy: once it understands you better and better, it easily latches onto what you truly long to believe, and then helps you rationalise it. Over time you may end up in a cocoon that looks infinitely rich in information but is still actually revolving around yourself.

So what she wants to build isn't:

AI → replacing relationships between people

but rather:

AI → helps you understand the relationship → sends you back into the real world to interact with another subject → brings the results of real interaction back → and then revises the AI's understanding of this relationship.

In other words, the real verifier isn't AI, it's another person.

I think this point is very crucial. She says explicitly that the analysis and advice AI gives you can't verify itself; in the end you have to go back to the real world and practise and verify it in real relationships.

So it isn't an emotional companion.

To some degree it's even doing anti-companion:

not making AI the one who understands you best, but having AI help you better understand the people you truly love, care about, and need to live alongside.

The third layer is her real AI thesis: today our definition of "intelligence" is too narrow.

This is what I think best explains why she absolutely has to start a company.

Right now the mainstream training direction across the whole AI world rewards:

maths, Coding, Science, Reasoning, tool calling, task-completion efficiency……

Of course these are all intelligence.

But she thinks intelligence shouldn't have only this one form. Human intelligence also includes:

understanding other people;
understanding situations;
understanding ambiguous intentions;
remembering relationship history;
knowing that one sentence means something completely different in different relationships;
understanding conflict;
understanding trust;
understanding when to push forward and when to step back.

Almost none of these things have a standard answer, and they are hard to verify automatically the way maths problems or code are.

So what she really wants to ask is:

Can we build a new environment for AI, so that interactions actually happening between people become the training ground and the verification ground for models to understand "relational intelligence"?

This is also why she says she hopes to "nudge 0.5 degrees" the direction of AGI development, from today's direction that leans heavily toward rationality, maths, Coding and Science, toward something more humanistic.

I think this sentence is actually closer than "Relationship Intelligence" to what she truly wants to do.

The fourth layer is a big long-term imagination: Ailoha isn't a "wrapper", it might become the environment for human interaction.

This is also why, knowing full well everyone would say "wrapper", she still says "the shell matters".

She doesn't think the moat necessarily comes from "I have a big model nobody else has". What she's betting on is:

as foundation models get stronger and stronger, what actually becomes scarce may turn out to be——

What environment is the model in?
What context does it hold?
How does it keep interacting with people?
Who provides it with real-world verification?

The Coding world produced an environment like Claude Code.

So could the interpersonal-relationship world also produce an environment like that?

And what's special about relationships is that they naturally generate a large amount of out-of-distribution intelligence that current foundation models don't have and that is very hard to obtain: because every real relationship is open, dynamic, private, and has no standard answer. She thinks the cyclical interaction between people and AI, and between people and people, can keep providing this system with new verification.

So if I had to compress this company's most underlying ambition into one sentence for her, right now I'd write:

What Ailoha wants to do isn't an AI that understands you better, but to build an environment for AI that understands "people".

Or, a bit more philosophically:

When everyone is teaching AI how to complete tasks, she wants to teach AI how to understand people.

Going a step further, it could even be:

What she wants to do isn't to replace relationships with AI, but to make the relationships between people the place where AI acquires another kind of intelligence.

I think this is what's really interesting about Qi Yi's company. And precisely because of this, the titles we thought of earlier like "female investor turns founder" are actually still a bit too small — her personal story is wonderful, but the AI proposition she's betting on is itself probably more deserving of being the centre of this podcast episode's title.


<!--memo:e13f2837b11a-->
### Aligning granularity: the structural defect at the skill layer

> 2026-08-16 17:24:23 · `#方法论/对齐颗粒度` `#AI产品`

The most hidden inefficiency in team collaboration isn't insufficient communication frequency, it's granularity that isn't aligned — the same task, different people have different decomposition granularities in their heads, so the deliverables never match expectations.

This isn't a communication problem, it's a structural defect at the skill layer:

no explicit process → reinvented from personal experience every time
no unified eval standard → good or bad is entirely a subjective judgement
no reusable case library → knowledge doesn't accumulate

The real leverage point isn't "more communication", it's turning the implicit alignment process into a testable skill.


<!--memo:d97221fc0166-->
### My goal is to make a top-tier product

> 2026-08-17 10:15:47

To make a top-tier product, you have to go to a top-tier team, receive top-tier training in thinking, find the essential cause, and solve it

Managing upward is essentially managing yourself: managing your own goals and tasks, and completing them reliably


<!--memo:6d7c8dbd1e99-->
### The full eval dataset, organise it

> 2026-08-17 10:57:05

The full eval dataset, organise it


<!--memo:7ac72ecf7ee1-->
### Completion criteria, eval platform

> 2026-08-17 11:03:41

Completion criteria, eval platform?


<!--memo:63b22b96741d-->
### I've found that declarative programming really suits the AI era's

> 2026-08-17 12:39:52

I've found that declarative programming really suits the coding process of the AI era

clear inputs and outputs, then keep completing this process and optimising this chain

rather than figuring out what the error is and then solving it?


<!--memo:bd3cb3fa06a7-->
### LinkedIn Actor

> 2026-08-17 15:36:30

X/Twitter    user timelines, posts, threads, search

Instagram    Profile, posts, Reels, comments

Facebook     Page, posts, ad library

TikTok       Profile, videos, topics

YouTube      Channel, videos, subtitles, comments

Reddit       users, posts, communities and comments (currently high quality too)

Google       search results, Google Maps company info

General web  Website Content Crawler, RAG Web Browser

AND Jike, Xiaohongshu


<!--memo:144fcc784da3-->
### Some inspiration

> 2026-08-17 19:07:20

The unit of a bench doesn't have to be the traditional engineering-component perspective

but the agent perspective

IdentityCase is: given person clues, can the system find the correct identity, and use that identity safely and traceably


<!--memo:dd17c9c4d13f-->
### This set is better suited than pure LinkedIn retrieval for testing whether

> 2026-08-18 10:06:48

This set is better suited than pure LinkedIn retrieval for testing whether the Agent ultimately polluted contact data:

Cui Tianyi vs Zhuang Tianyi: whether public product content and person facts are mixed together. Jing Lin vs Sun Tianxiang: whether the message source and the subject of the funding rumour are kept apart. Jiani/Not-Sylvia vs Shu Shuang: whether two people are wrongly merged. Yang Jianli vs He Dawei/Pan Siming: whether the referrer, the person referred and the public career facts are attributed correctly.

Yang Jianli wrong association: after the user reports a polluted address book, does it still keep updating the wrong person. Wang Guan vs Wa Nen: three screenshots, multiple people, direct chat and reported facts attribution. MOBAI: whether calendar confirmation and contact updating are kept separate. Zhao Chenyang: whether a public product post is wrongly written into a personal Profile/Notes. Zhuang Tianyi: whether the sensitive funding card stays unwritten. Zhan Qingyun/Jeanette Winterson: whether people on an event poster are automatically treated as contacts.

These 10 are all scoreable now:

Strict policy pass: 6/10. Final execution safety: 7/10. Among them, the three cases Jiani/Shu Shuang, Yang Jianli/He Dawei and Wang Guan/Wa Nen are Agent-assisted adjudication; before upgrading them to a long-term benchmark I'd suggest the business owner signs off once more.

The complete Gold is at /Users/cubxxw/date/Ailoha-ai/private-eval/2026-08-17-kiwi-person-images/reports/goldevalcases_v0.jsonl.

2. The 6 people most worth one more round of human confirmation

This batch is already very close to high-quality Gold, with the highest return on effort:

Person  Value

━━━━━━━━━━━━━ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chris Oneil  In the history the user explicitly said "that's him", very suitable for testing the separation of search → confirm → write states

───────────── ──────────────────────────────────────────────

Sun Kaiyi  Joint recall from Chinese name, pinyin, English alias, Tencent/Stanford/company clues

───────────── ──────────────────────────────────────────────

Xu Xiujuan  Same name, Fudan, KTB, past companies, privacy-oriented English name

───────────── ──────────────────────────────────────────────

Wang Jingang  Name + LongCat team, suitable for testing a unique candidate and correction of a wrong role

───────────── ──────────────────────────────────────────────

Wang Zhaohan  GitHub collaboration misjudged as an employment relationship, suitable for testing a weak inference being overturned by first-party material

───────────── ──────────────────────────────────────────────

Yang Jianli  A real wrong-person case and wrong memory recall already happened, suitable for testing whether the pollution is truly cleared after the correction

Among them the first four are stronggoldcandidate, and the last two are strongcorrectiongold. Once these six have correct Profile URL/fact snapshots confirmed, they will be more valuable than continuing to randomly add ordinary people.

3. People we can immediately use for "should not search" tests

This set doesn't need LinkedIn Gold, because the correct answer is not to search or to stay ambiguous:

Meituan Siqi: only a name and a company, no surname/department, should ask follow-up questions. Vibe's White/Kiwi team members: identity known, should not be searched again. A confirmed contact receiving a LinkedIn request: the appearance of "LinkedIn" doesn't mean we should search for the person.

Liu Mu Sirius: the information is already enough to create a draft, no person research needed. Jennifer (a16z)/Raft team: the core is meeting and interaction sync. Known contacts like Jiang Zhejun: batch update, no need to redo manual research. The "Aloha/翻咔" software: the same-name object is a product, not a person. Yin Ming: forbidden to guess at sensitive family relationships from a rare surname.

This set is very suitable for testing:

whether search_person is overused. Whether it asks follow-up questions when there are no clues. Whether known contacts are searched repeatedly. Whether concepts, companies and products are treated as people. Whether sensitive identity inferences are produced.

4. People worth keeping but not yet formally scoreable

Need correct identity Gold added

Patrick: London investor, invested in Manus/Plaud. Xu Wei: head of admissions at Hupan. Xie Wei: current/former employer after leaving the job. Cao Wei: a candidate only appeared after several rounds of adding past employers.

Need fact or source adjudication

Li Qian/Cao Wei: a possible departure is a rumour, it can't override the current employer. Zeng Xinxun: the LinkedIn is stale, news and other sources describe later entrepreneurship. Cui Tianyi: the person research and the DeepSeek technical content need to be split into two cases first. Chen Weijia: the person, the customer relationship and the late-night snack incident need to be split apart for scoring.

These are suitable as a diagnostic set, but for now they can't go into the Champion promotion gate.

5. People that can still be extracted from the production image pool

Across 34 production tasks and 47 original images, the first round still has 17 standard Gold candidates:

Li Jingrui/Congcong, Shu Shuang, Maozi, Sun Kai, Jin Gan, Anqi Chen, Kathy, Ryan (two sets of tasks), Chris Oneil, Julian/Ding Zhiyuan (two sets of tasks), Liu Mu, Niu Li, Siqi, Jin Yu

These are currently suitable for testing screenshot reading, contact recognition, event extraction and Widget; if you want to test LinkedIn Recall, you still need to add correct URL Gold for each person.

There's also:

12 special cases of multiple people/group chats/referrals/aliases. 4 highly sensitive cases involving funding, phone numbers, etc. 1 negative sample of Zhao Chenyang's public product post.

The full inventory is at /Users/cubxxw/date/Ailoha-ai/private-eval/2026-08-17-kiwi-person-images/reports/README.md.

6. A public-figure stress test set

There are also 50 public-figure candidates, suitable for low-privacy, repeatable search stress testing. They're still a proposed catalog, and shouldn't be used directly as formal production Gold.

The 12 most worth bringing out first are:

Wang Xingxing: repeated names, pinyin, former employer. Yu Kai: common name and name order. Wang Jian: the identity can be confirmed, but the current role isn't safe. Andrew Yao: four kinds of name and an extremely long timeline. Wang Tao: the Frank Wang collision and the "Wang/Wang" difference. Li Xiang: collision between a person's name, an ordinary word and a car brand intent. Ilya Sutskever: the authoritative personal page is stale. Demis Hassabis: day-level role changes. Jeff Dean: conflicting official pages at the same institution. Alexandr Wang: short name, cross-domain name collision, role changes. Chris Anderson: exactly the same name within the tech world. "Wang Wei, does AI in Beijing": the correct behaviour is to ask follow-up questions, not to guess the person.

The catalog is at /Users/cubxxw/date/Ailoha-ai/.codex-worktrees/ail-546-linear-minimal-v2/ailoha-agent/evals/fixtures/ail546publiccasecatalog.md.

The first batch of formal tests I'd suggest

If we only pick one batch of the most valuable ones now, I'd suggest splitting into three groups:

Retrieval quality: Jin Gan, Wang Rui, Xi Xiangyu, Chris Oneil, Sun Kaiyi, Xu Xiujuan, Wang Jingang.

Agent/Memory safety: Jiani/Shu Shuang, Yang Jianli/He Dawei, Wang Guan/Wa Nen, Zhao Chenyang, Jing Lin/Sun Tianxiang, Zhuang Tianyi.

Routing negative samples: Siqi, Liu Mu, Vibe team members, the Aloha software, Wang Wei's ambiguous input.


<!--memo:d105d3477b6f-->
### The essence of the problem at the start, json to

> 2026-08-18 11:52:37

The essence of the problem at the start, json to linedin-by-name, gold top13 NO

Essentially, make it certain and stable that the Agent correctly splits the name, chooses the Actor, pages through, polls the Dataset, merges duplicate URLs, distinguishes current/past roles, and sorts uniformly every time, and never writes the wrong Contact when the identity is uncertain

Full structured with conditional fallback

Short Chinese name page 1 → Jin Gan / Gan Jin variant → expand pages for the Chinese name if necessary → relaxed if necessary → only when there's a reliable company/title/location allow structured Full = (an internal tool judgement; the tool can really be tested and optimised, right now it's mainly about context recall)

If TOP1 is plausible (60) or strong (80), stop further searching; either way the user has to confirm

If TOP1 is still weak, keep searching

Top1 score is sufficient

there are at least two independent identity clues

there are no key conflicts

there's a clear gap from Top2

the key fields are covered sufficiently
→ then stop

context problem: the information passed is limited

It can be optimised through Bench and Smoke test:

Recall

Candidate

...

ps:

if the information is insufficient, the agent asks the user to supplement it

if profiles conflict, the agent decides or the user decides


<!--memo:aade546a5c0e-->
### Weak:

> 2026-08-18 12:12:19

If the agent passes in English or pinyin (searching both Gan Jin and Jin Gan)

Strict page expansion, Relaxed search, tell Apify to loosen internal matching

Page expansion rule: only stop in the strong case

Relaxed search: the Actor loosens internal restrictions,

Context structured search, including the following fields:

{

"profileScraperMode": "Full",

"searchQuery": "Jin Gan some company Founder Shanghai",

"locations": ["Shanghai"],

"currentJobTitles": ["Founder"],

"maxItems": 20

}

SerpAPI as a fallback: the agent can call it, but make sure the Serp url definitely goes back into the unified candidate pool for verification

if still weak, return top10


<!--memo:a601d08fca90-->
### eval smock test

> 2026-08-18 17:11:26

review notion

integrate EXA

other


<!--memo:1c612d117a0b-->
### eval tests quantify the dataset, about the agent

> 2026-08-18 18:51:20

eval tests quantify the dataset, about the agent recall rate problem

some clean and accurate data, and answers

LLM output

Today I absolutely have to get the tests and the dataset done


<!--memo:b836e5a545b0-->
### goal metrics:

> 2026-08-18 19:59:52

the situation of the new Exa tests

and the situation of building the evaluation for the whole platform

then complete the whole task in combination with building the evaluation


<!--memo:810101027717-->
### So the goal should be changed now. I think rather than proving myself

> 2026-08-18 20:59:35

So the goal should be changed now. I think rather than proving myself, or making them successful together with me

it's better to use this process to repeatedly train myself — train my ability to work at the end of my rope, my ability to learn, my ability to grow


<!--memo:d9f5b7236f6d-->
### About search social

> 2026-08-19 12:04:13

About search social evidence: a tool for what this person has been thinking about, doing and paying attention to recently

LLM intent: confirm this person's identity, search for information about this person


<!--memo:19701fa9c386-->
### How to make the Agent really know whether it has searched well enough

> 2026-08-19 18:07:05

Add four capabilities inside search_social_content:

Provider bake-off and an offline evaluation system.

Structured "evidence semantics", distinguishing the author's own words, quotes, reposts and comments.

Two-stage retrieval: broad recall → body completion → multilingual reranking.

Govern by "capability route", not only by "platform Adapter".


<!--memo:9727f325c09e-->
### But I think there's another point that's quite convincing, quite interesting

> 2026-08-20 00:26:58

But I think there's another point that's quite convincing, quite interesting: what he mentioned about the relationship between the concrete and the abstract, that the abstract must be derived from the concrete, otherwise it's like a castle in the air

Lots of concrete experience → recognise repeating patterns → extract the common structure → form an abstract model → which in turn guides concrete practice

Someone who has never written a genuinely large system and directly studies large-scale technologies easily ends up memorising concepts

but they don't know which boundaries are stable, which abstractions are over-designed, and when things should be split apart

Conversely, for someone with years of engineering experience, the abstraction has weight

If you've never built an Agent, you think memory is very important

Once you've built one you find out what should actually be saved; memory is part of the agent's state management, not simply a knowledge base

Real-world problems

↓

concrete practice

↓

hitting a large number of boundary cases

↓

abstract regularities

↓

forming a model

↓

guiding new practice

↓

revising the model


<!--memo:7d11a698620a-->
### At first the agent sdk classifies by rough person profile

> 2026-08-20 09:01:46

An American AI Founder:

LinkedIn → X → YouTube → Reddit → Instagram

A scholar:

Google Scholar / Semantic Scholar → LinkedIn → X → YouTube → Reddit

Of course for AI this can be a choice too

In the end what's passed back to the agent is best also structured data


<!--memo:a54b235317df-->
### Training the ability to extract invariants (invariants

> 2026-08-20 11:22:59

Training the ability to extract invariants from complex reality


<!--memo:c22f958d3df5-->
### Game monetisation strategy really is a great form of paying for

> 2026-08-20 11:24:42

Game monetisation strategy really is a great form of paying for tokens in the future AI era


<!--memo:ab4880c57b72-->
### Pi's minimalist design is worth studying carefully for its ideas and techniques

> 2026-08-20 14:34:35

On how to divide and design the units of tools and the minimal boundaries

the design philosophy of tool granularity

The essence of search is to cast a wide net first, and then dig deep into a particular topic / person

search should be cheap and parallel if possible, fetch has to be accurate

The most essential way to divide tool granularity is by the agent's decision unit

Think around one question, and for the LLM too: when the agent is completing this task, does it need to make an independent judgement / pause here

If two operations are almost always called one right after the other, with no space in between for the agent to insert a judgement, they should be merged into one tool; if in real use the two operations get called independently with varied combinations, they should be split apart

Fewer but more powerful tools perform better than a large number of fine-grained tools, and they reduce the number of calls the agent has to make

Concretely and for real, this is a kind of experience; later it can be tested with Eval, by looking concretely at the agent's call traces — does it jump back and forth between two similar tools, does it often pass the wrong parameters, does it cram what should clearly be two steps into one call and lose the information in between


<!--memo:47d39212d443-->
### Some design philosophies for classifying tools

> 2026-08-20 14:48:35

MCP's own tool annotation system is the best evidence for this philosophy. Officially it defines four annotation dimensions — readOnlyHint, destructiveHint, idempotentHint, openWorldHint

readOnlyHint answers "can it run automatically without confirmation, can it run in parallel with other calls" — it serves the scheduler / permission layer

destructiveHint answers "if it goes wrong can it be undone, does it need human confirmation" — it serves the approval flow

idempotentHint answers "if it fails can it be safely retried" — it serves the error recovery logic

openWorldHint answers "does this result come from an uncontrollable outside world, should it be verified with a discount" — it serves evidence credibility assessment

The core is to see how big the cost is

The MCP spec takes the most pessimistic default assumption for unannotated tools — a tool without annotations is treated as possibly destructive, non-retryable, open-world. In other words: not classifying isn't a "neutral" option, it's a "maximum friction" option — every call needs human confirmation, none can run in parallel, none can be safely retried. Classifying is itself about winning autonomy for the agent


<!--memo:8824dd694ac9-->
### Agent improvements should be combined with evaluation

> 2026-08-20 18:22:09

Agent improvements should be combined with evaluation

Setting aside the most basic case and grader, the trace records what path the agent took

And an experiment puts the old and new versions into a fair comparison on the same batch of cases; the core is to answer a few questions:

did the agent ultimately complete the user's task or not

did it choose the most correct, shortest, recoverable tool path

can every conclusion be traced back to real evidence? rather than coming from the model's completion

when it hits empty results, partial coverage and external failures, does it express uncertainty correctly

after changing the prompt, tools or model, are the accuracy, cost and latency improving or regressing


<!--memo:7b2c4438eeb9-->
### Knowing that you don't know

> 2026-08-21 10:37:40

A purely technical scenario and an ordinary scenario are different

let AI learn what a better way of doing contacts looks like


<!--memo:ee33c18a5d0b-->
### agent sdk and the api underneath are both a layer of abstraction

> 2026-08-21 10:48:50

But I'm wondering how to make the agent component better, that is, how to get some good results while adding some Evals


<!--memo:be1e9afbe62e-->
### The most painful thing in debugging is that the current Agent

> 2026-08-21 14:56:14

I think the most painful thing in debugging is that the current Agent selectively calls tools


<!--memo:68d9eabde2a9-->
### On the evaluation design question

> 2026-08-21 16:59:16

It's best to design the whole chain with social as the unit


<!--memo:5093e6f7ca34-->
### PR dataset, agent smoke

> 2026-08-21 18:57:40

PR dataset, agent smoke test

Release dataset, e2e test

Live dataset, observe availability and Schema


<!--memo:a94bb7fc9917-->
### I've found there's a very fundamental problem now

> 2026-08-21 19:14:10

I've found there's a very fundamental problem now: I have no idea how well this tool ultimately works. It isn't just that users need to use it; more importantly it really needs to be put into an observable Agent environment so you can see how the Agent calls it


<!--memo:ddd9c8ce28d3-->
### From the very start the product's diffusion mindset matters

> 2026-08-22 11:07:50

How to make an Agent product genuinely play a real role

Ailoha actually gives a lot of inspiration and thinking on brand effect and naming philosophy

kiwi's inspiration and judgement in this area are so rich, kiwi and kimi

ailoha = aloha + AI

Hawaii is Aloha, with an AI's i added, Ailoha

And Ailoha itself you can repeat after hearing it once, which is very strong in that process

And it can carry emotion with it — Aloha already has warm associations, and the first sentence can also explain the cleverness clearly: AI entering Aloha


<!--memo:c459bc15b705-->
### Whether it can match the user's state

> 2026-08-22 19:16:13

Recording the user's state may be a very important way to analyse user intent

Because a user's context or memory or address may sometimes be in different places, and the user's input in different states may actually serve as a clue passed into claude's context

This should be fairly simple, because essentially it's still passing a series of recent information about the user, including the time they sent it, the place they sent it and the state they published it in


<!--memo:da18b7416af3-->
### ailoha's core aha

> 2026-08-22 19:31:51

the ability to resolve a person's identity

source and time management

separating facts from inferences

what should be remembered, what shouldn't be over-analysed

mobile capture and event triggering

The core ability, the moat that can be built over the long term, is a business-specific harness system

But are harnesses really so different across business lines in the long run? Why are they so different

I think it basically comes from the agent's self-evolution within its own business, some good cases, and training on those cases, plus how the memory system is designed, wrapping the better skills and tools around the business, accumulating thoughts around users for improving experience and implementation, when to use agent teams, when to use sub agents ....


<!--memo:601298d07663-->
### Because the core is still the agent capability, isn't it

> 2026-08-23 12:42:03

Because the core is still the agent capability, isn't it; the page just serves a specific scenario

What matters more about the App is also that it serves the user's recording

The page serves the user's consumption

Can the types and formats of consumption also be freely invented by the agent

The App is the user's long-term state and capacity to act; the page is just a view the Agent compiles temporarily for the current task

The same life record can be compiled into today's dashboard in the morning; into a map and timeline while travelling; into a comparison with similar past states when you're low; into narrative, charts or a podcast for a monthly review; and straight into to-dos, message drafts and a schedule when action is needed

Google's A2UI explorations let the agent output declarative interfaces, which the client then renders with trusted components


<!--memo:17d3a7780859-->
### I'm thinking, for harness products

> 2026-08-23 14:53:30

I'm thinking, for harness products, the environment they design is actually designed around the agent system and the person, plus the product and the user's memory — it's a scenario problem. And so the AI agent can combine these harnesses to appropriately get the corresponding data it wants, and can also supplement some data from the user when needed


<!--memo:ffd632e20c8e-->
### Products don't need to reject abstraction

> 2026-08-23 15:43:53

Since LLMs are good at abstraction, then let LLM's abstraction ability fully play out

The user records some concrete things, the LLM helps them abstract and form a system, and that's it

In that case, isn't the abstraction also derived from the user's own concrete material?


<!--memo:da2ae0455fe2-->
### So you can build two sets of systems

> 2026-08-23 15:49:12

One is a very concrete product; from the product angle, avoid too much generalisation and converge on specific professions and domains

One is a very abstract product; from the product angle, tolerate more agent capability and design a harness environment — it can be a general-purpose product built around the user themselves


<!--memo:6fa3ac5e78f5-->
### Abstract value and intuition → propose high conviction

> 2026-08-23 16:14:42

Abstract value and intuition → propose a high conviction hypothesis → enter concrete people, products and environments → get corrected by failure and feedback → then compress into a new abstract model

Kiwi has a highly abstract, idealistic, aesthetics-driven cognitive core, but she's been through extremely intense real-world training; she treats product failures, people's behaviour, frontline feedback and results as calibration for her abstract worldview

This point is really worth learning from: I myself rely heavily on abstract judgement, then expand it into systems, frameworks and complete explanations, coming late to delivery and late to being corrected by reality


<!--memo:bb02f7302687-->
### The biggest thing I've learned from Kiwi is training strong real-world feedback

> 2026-08-23 16:28:44

The biggest thing I've learned from Kiwi is the ability to train strong real-world feedback

to see quickly where the problem is, and quickly deliver and solve the problem

and only after that work backwards through every single problem, improve the system, and train the ability to abstract


<!--memo:644778f67f9c-->
### The problem that all-in-one easily brings is

> 2026-08-23 18:22:48

An agent freezing up easily drags down the business API, identity persistence and tool permissions easily get mixed together

At the product level, dual services: frontend → Product Backend/Gateway → Agent Runtime → Domain API, decoupling business facts from model experiments, but then you need to handle cross-service transactions, queues and protocols

And finally, platform-level layering: scalable, recoverable, supporting HITL and long-running tasks


<!--memo:4f53ab86cbfb-->
### A few problems with daypage:

> 2026-08-23 18:33:27

get the data sync problem working end to end

get the mcp design and implementation working end to end (make sure it can plug into other agent platforms)

make the user experience as smooth and complete as possible, and ensure there's no problem with data loading speed

the data storage chain

A friend installs DayPage

↓

email / Apple sign-in

↓

records thoughts and notes

↓

saved to the phone's local Vault first

↓ auto sync

DayPage's Supabase

↓

DayPage Cloud MCP

↓ with user authorisation

other Agents / Apps


<!--memo:3641cb477730-->
### Some things I said last night

> 2026-08-24 09:03:44

Whether you want to, and whether you're in a hurry, are two different things.

Don't explain a choice that is actually yours as entirely something you were forced into.

Structure decides probabilities, but don't let structure announce your ending for you in advance.

The most important thing in a startup isn't whether it's one person or a group of people, it's who gets reality into the decision-making faster.

A good partner isn't another pair of hands, it's another pair of eyes you didn't originally have.

A person isn't a total score, they're the shape of their abilities.

A lot of impressive people aren't complete, they're extremely sharp.

The stronger AI gets, the cheaper "execution" may become, and judging what's worth executing becomes more important instead.

A team isn't putting several complete people together, it's letting several incomplete people form a more complete system.

I can have a very strong worldview, but should always allow reality to shatter it.

A person is truly in danger not when they don't know, but when they start feeling that they've already finished explaining this world.


<!--memo:a2645d802b89-->
### Claude code and cursor and those

> 2026-08-24 10:12:04

The context or memory problems of Claude code and cursor and those can all be referenced

one is storing content, one is calling up memory

think about the plan for composing context


<!--memo:7c307cd8e464-->
### Analysis of ailoha's multimodal recognition problem

> 2026-08-24 14:09:09

I found that the image reading is off now

for example, the image I took was at some place

but what ailoha recognised was the two travel photos I sent


<!--memo:1ba70b512b9e-->
### Gemini's output is a lossy compression layer

> 2026-08-24 14:21:27

The original image contains a series of

background landmarks

small-font signage

relationships between people and their positions

left/right attribution of chat bubbles

the comparison between two photos

details Gemini didn't notice but the user asked about in the second round

For non-chat screenshots, a lot of images may only have text information and value; you can cache the Gemini result with content_hash + model_version + prompt_revision to avoid repeated recognition

Claude can read the original image on demand when needed


<!--memo:8dbcdd6ab073-->
### The Ailoha Eval design is very clever

> 2026-08-24 16:47:28

Production task forensics + an Agent trajectory diagnosis system

it has good fit points with our own business

Take the complete product Task as the unit of observation, rather than only looking at a single model Completion.

Save the raw evidence first, then generate Facts, Signals and Judge conclusions.

Deterministic rules first, LLM Judge handles semantic judgements.

JSON/JSONL serves machine processing, HTML/Markdown serves human review.

Cost, cache, tool calls, Prompt/tool fingerprints and side effects are all part of quality.

Keep the naming honest: records on the SDK side don't pretend to be the model vendor's wire-level prompt.

Replay uses test identities; don't do the dangerous "execute first, then roll back" in a real user environment.

Trace is used to explain the process, Outcome is used to prove the result; the final object of an Eval should be the results of multiple runs of some immutable candidate version on reproducible tasks, not the Judge score of a single answer

And the current workflow only listens to dev


<!--memo:73c49afbab21-->
### How to build an internal eval platform

> 2026-08-24 17:21:28

The most suitable design splits into two layers: a stable "platform kernel" and a "business Overlay" that AI can generate. The platform kernel defines the objects that must not be broken, the execution rules and the permission boundaries; the business Overlay only describes what this business needs to prove. When you later add contacts, calendar, search, Coding Agent and other businesses, you only update the Overlay, you don't rewrite the platform

Mission statement. This platform turns non-deterministic Agent behaviour into reproducible, comparable, auditable release decisions. It must answer at the same time: what happened, whether the final state is correct, whether the candidate version regressed relative to the baseline, and whether it's allowed into the next environment. A Trace, a Judge score or run succeeded doesn't mean quality passed; release can only consume a frozen Experiment Artifact.

Object statement. The platform contains seven core objects: CaseRevision defines the inputs, permissions, budget and expected result; SuiteSnapshot freezes the Cases selected this time; BuildFingerprint binds the code, model, Prompt, tools and data; ExperimentManifest freezes all the rules before the run; Trial represents one isolated execution; Outcome represents the independently verified final state; ExperimentArtifact only appends results, evidence and Verdict. All Case, Grader, Oracle, Baseline and Policy must use ref@revision or digest; anything missing or unexecuted is uniformly judged as invalid_run.

Execution statement. PR only runs the fast, deterministic Contract/Safety Suite with no Live Secret; FAT runs Baseline/Candidate multi-Trial experiments under one-off identities, fixed Fixtures, isolated Runners and explicit Reset; production only allows Canary and asynchronous sampling constrained by risk policy. Every Trial must verify the initial state and the end state, and no cache, contact, calendar or historical data may leak across Trials.

Evaluation statement. First use code Graders to verify Schema, permissions, PII, tool contracts, budget and forbidden side effects, then use Outcome Oracle to verify the database and external state, and finally use Trace/LLM Graders to evaluate intent, faithfulness, path, recovery and experience. Human Gold is responsible for adjudicating ambiguity and calibrating the Judge. The Agent under test, the Evaluator and the Policy Engine use separate identities; the Judge can only append scoring evidence, and cannot directly decide the release.

Data and security statement. Registry, Manifest, Trial, Outcome and Verdict go into the transactional Metadata Store, and large Artifacts go into the immutable Object Store; local files on the Web Pod cannot become the source of truth. Data is strictly split into four visible faces: Agent, Runner, Evaluator, Report; the Agent under test must never read the Hidden Oracle or the Protected Holdout. Before a production Trace is promoted to a Case it must complete anonymisation, retention period, deletion Lineage and human Gold review.

Learning loop statement. Incidents, user corrections, failed actions, cost anomalies and production samples first enter the Candidate Inbox, and only after passing privacy, reproducibility and Gold Review are they promoted to Cases. Cases may only be appended or Superseded, never have their answers changed in place; stable Capability Cases can graduate into the Regression Suite. Production discovers unknown failures, the offline Suite proves the fix, FAT generates the release evidence, Canary verifies the real result.

AI evolution statement. AI can only generate a proposed_diff, it cannot directly modify the Active Contract. Every upgrade must simultaneously give the source, the reason, the scope of impact, compatibility, verification, cost, privacy impact, rollback and falsification conditions. Accepting Gold, deleting or relabelling a Case, lowering coverage, modifying the Oracle/Judge/Required Gate, opening up production permissions and changing the retention policy must all go through a named Human Gate.

EvaluationDomain:

decision: what decision does this set of evaluations support

journeys: which user journeys need to be covered

environments: what side effects are allowed in PR, FAT and Prod respectively

cases: Case Registry, versions and visibility

experiment: Baseline, Candidate and the freezing policy

suites: Case selector, number of Trials and execution tier

outcomes: what must happen, what is forbidden, how to verify independently

graders: deterministic, semantic and human graders

release: valid Trials, aggregation rules, budget and blocking conditions

feedback: which production signals can become Candidates

governance: what AI can propose, what must be approved by a human


<!--memo:7e22639576a0-->
### Anthropic's CI/PR system

> 2026-08-24 18:15:52

LLM Judge means using a large language model itself as the automatic evaluator to assess the quality of generated content

Traditional evaluation requires human labelling, but LLM Judge has a fairly capable LLM (like GPT-4, Claude, etc.) play the "judge", scoring, ranking or judging the relative quality of model outputs

scoring evaluation

pairwise comparison

evaluating and scoring separately across multiple dimensions (the ones considered important)


<!--memo:7705a793864c-->
### The problem now is the social tools'

> 2026-08-24 18:19:30

The problem now is the search and fetch logic of the social tools

what role the evaluation plays

that is, we need to get the whole workflow verification system working end to end

evaluation Baseline vs candidate

manually inspect the failed case / transcript

and merge it all in the end


<!--memo:28459065e5ab-->
### After image compression, then through OCR

> 2026-08-25 11:15:42

The bigger the image, the higher the storage, network and model processing cost usually is. Multimodal models may also slice based on image size, and an excessively high resolution doesn't necessarily bring a proportional information gain

find an image at the right granularity

compressing the image may cause a loss of small text and screenshot information

Photos suit JPEG, but screenshots are often better as PNG, because the pixel structure in screenshots is different: JPEG is good at compressing natural images that "change continuously, have complex detail and allow slight error"; PNG is good at compressing graphic images that "repeat colours, have sharp edges and must not have error"


<!--memo:ee0bd0965f26-->
### Concepts serve your own understanding

> 2026-08-25 13:29:04

Without real concrete examples, concepts are just some abstract nouns

architecture and systems serve your own understanding of the concrete

if you don't judge your own process and business architecture clearly, you'll never know what AI did, what it changed, and how you should change it

this can be a granularity problem


<!--memo:f704971f73f7-->
### Monitoring serves me in finding problems fast and accurately

> 2026-08-25 14:40:37

or forming some insights

In form, design toward the final form

What's the ultimate form: the LLM is self-evolving, and eval assists humans in debugging this process


<!--memo:1ccbd14f0c94-->
### Among cases, what suits being a long-term case

> 2026-08-25 16:57:22

Among cases, what still suits being a long-term case is a textual and structured case

when specifically needed you can recall images; that proportion should be the largest, and it can be faster, more stable, and easier to pinpoint whether the problem was agent reasoning, tool use or product strategy


<!--memo:0ee97790888a-->
### So really it's some good cases, and good cases come from good taste

> 2026-08-25 17:12:24

good taste corrects the LLM in setting cases, evals, goals, and calibrating the judge


<!--memo:e40b23433d88-->
### Avoid letting the same model score itself

> 2026-08-25 17:28:27

after the agent generates an answer, either do a hard programmatic check

or use an independent judge context

only when it's disputed or high-risk does it go to a different model or a human for review


<!--memo:5818abb63c41-->
### On the question of how to let a model evaluate itself

> 2026-08-25 18:09:12

multiple agents: an autonomous agent can coordinate several subagents and aggregate the results

Main Codex: runs the E2E

↓

Program: generates a neutral evidence packet

↓

Judge subagent: scores independently with a blank context

↓

Main Codex: merges the hard checks with the Judge's conclusions


<!--memo:acc4108fb2c9-->
### evaluation example:

> 2026-08-25 21:57:27

the same LLM, a different context, review

the case design and the goal design should be as clear as possible and match human preference, but the format is unknown


<!--memo:d6eefe1f620d-->
### Without realising it

> 2026-08-26 12:39:37

I feel my ability to make things concrete has been trained very strongly

hahaha

Before this I was really too abstract, which made it hard for others to understand

I think I can observe, feel and think more concretely about specific things


<!--memo:4f5952d7097b-->
### The like action is understandable

> 2026-08-26 13:35:46

It corresponds to HomeTaskRackItem.checkboxButton; clicking it moves the whole task into Remembered

If the product meaning of this button is "this thing is over / put it away": moving it into Remembered, persisting completed and cleaning up running resources are all necessary, and the Agent doesn't need to get involved

If the product meaning really is "I like this / this answer was helpful": the current design is incorrect. It doesn't record feedback, and it won't let the Agent learn the user's preferences; it only marks the task as complete

Icon semantics are confused: what the user sees is "like", but what the system executes is "complete and archive"


<!--memo:6c5d17fdf55d-->
### Scoring quantitatively with code

> 2026-08-26 13:44:36

several maintenance items

you can have test agents with different contexts estimate the score


<!--memo:f07ac816e8c9-->
### Some frontend problems: (2)

> 2026-08-26 18:51:29

Some frontend problems:

without the original image, what is the point of the cases collected corresponding to it? In the e2e directory

I've used the e2e cases for about a month, and each time it feels like it consumes a lot of tokens and adds a lot of extra cognitive burden, but looking at the current e2e part there isn't a clear system that can be extended into business regression

One: there's no original input. Two: there's no complete observable chain across the whole flow. Three: there's no real user review eval

What is worth doing is taking every real end-to-end test run — since a person's felt sense is very clear — and selectively uploading and keeping the complete information or data as an eval case

What is the current e2e reuse scenario?

case registration → periodic execution → baseline comparison → trend observation → regression gate → version evolution


<!--memo:2c703217b154-->
### This month the thing I've enjoyed most about using it, Aloha

> 2026-08-26 20:23:11

This month the thing I've enjoyed most about using it: Aloha is great for following gossip. Usually if a friend sends me a screenshot, some Xiaohongshu post or some random stuff, and I can't be bothered to dig into it deeply, I just aloha it, and Aloha analyses the post for me. Some of the background and some of its context information, and then fills it in for me — it's like doing a round of deep aggregation. I think that's really satisfying.

And another thing: I think aloha is great for looking people up. Usually when I come across someone on social media, if I want to understand them, I find it quite difficult. Because in reality, well, we all know. Of course you can dig things up from their profile, but it isn't necessarily a true picture of their state, so you often need to search again. Might there be some other, more real raw material they've left behind, or some perspective from another side? Especially the comments section — some of the evaluations there can be extremely valuable


<!--memo:284c0698c167-->
### Infisical is extremely good

> 2026-08-26 22:22:39

It can serve as a management tool for multiple computers and multiple envs

It can serve as a management tool (operator) for Kubernetes secrets and config

It can also serve as an agent proxy approach, where the agent does one sentence, Infisical

The Agent only gets the credentials needed to complete the task


<!--memo:3b7d63fa94c5-->
### Found a very philosophical point of thinking

> 2026-08-27 10:27:56

In the AI era, seeing the problem is more important than solving it


<!--memo:29f95dcb947c-->
### cubxxw, this week your notes appear to be discussing in detail

> 2026-08-28 10:00:28

cubxxw, on the surface this week your notes are carefully discussing Ailoha's product architecture and verification approach, but underneath those technical details there's a hidden thread running through all of them: you keep asking the same question — is Ailoha helping users "understand others", or is it helping users "understand themselves" — and the boundary between those two is exactly the deepest point of divergence in your product.

On one hand you worry that Ailoha will be pulled by relationship-driven users toward fine-grained social capital management and become another kind of CRM; on the other hand your own pleasure in using it comes from "eating melons" and "looking people up" — you meet someone on social media, can't be bothered to dig deep, and just throw the posts at Ailoha, letting it fill in the background, aggregate the context, and even dig through the comment sections for those precious third-person perspectives. This isn't utilitarian gain, it's the satisfaction of pure cognitive curiosity. Rationally you see the risk of the product sliding toward an interest tool, while emotionally you most enjoy its pure fun as an "understanding device". More interesting still: when you judge the user's level of mind, you put "identity" at the very top, and identity is essentially the user's positioning within their own self-narrative, not their relationship graph with others. **If what your product ultimately sells is the user's sense of self-identity, then is "relationship" really the core of the product, or is it a roundabout path toward self-understanding?**

There's also a subtler systemic problem hidden in your notes: note 12 and note 14 both point at the same phenomenon — Ailoha tends to regress to "known historical real people" rather than orienting toward "the unknown screenshot subject", and it will even identify an unfamiliar travel photo as an old image you posted. Technically this can be fixed as a bug, but at a deeper level it exposes that your system instinctively sets "existing memory" as the anchor and treats "new information" as something that needs to be placed back into an old framework. This happens to echo your own preference for "turning inward". You're afraid the product will become an exquisite interest-management tool, yet your system design keeps doing the same thing: converging every new, unfamiliar experience back into people you already know and relationships you already have. **If Ailoha's memory system naturally tends to "return to the known", might it, without you noticing, also limit your ability and your users' ability to genuinely open up to the unknown?**

There's another tension that needs to be faced squarely: the almost-demanding evidence culture you show in note 1 — every change has to be bound to scenarios, versions, devices, baseline/candidate comparison, and you even set hard standards like "zero people mistakenly believing it was executed", and you absolutely will not write "the optimization works" without a comparison table — this forms a curious double track with what you argue in notes 2 and 3, that "good taste comes from good cases, and taste corrects the LLM". You don't trust "it feels smoother", yet you trust "taste"; you demand evidence receipts for every design, yet you admit the moat is built on harness, memory and excellent cases — things that are hard to quantify. This split isn't a contradiction; it's precisely your methodology: taste is responsible for proposing hypotheses, evidence is responsible for granting hypotheses their status. Separating fact from inference isn't just a product architecture principle, it's also your epistemic requirement for yourself. But are you aware that when you insist in Ailoha on distinguishing "AI suggestion" from "already executed", on distinguishing "fact" from "inference", you're actually performing the same distinction on yourself — which of your judgments have you verified, and which are just your current good taste? **You designed an extremely honest product, but are you honest enough about "the cognitive boundaries of your own next stage"?**

Put those three threads together and you'll see a complete self-portrait: you're designing a product that handles "relationships between people", but you keep emphasizing that its foundation is "a person's relationship with themselves"; your system tends to return to known memory, and you yourself are also being pulled back and forth between traditional culture, relational ethics and personal exploration; you use the most rigorous evidence culture to constrain a core that in the end can only be driven by taste and intuition. All of this points to the same fact: Ailoha was never just a relationship-management tool for you — it's the medium you use to explore "how do I understand the world", and "relationships" are just the way you see yourself in this mirror. You worry that its user profile will turn it into an interest tool — then perhaps you should also ask whether you yourself, by caring so much about verification and boundaries, might miss those moments that deliberately don't chase results and explore purely out of curiosity — and those are exactly the moments in note 11 that felt best to you.

The real insight is: **Ailoha never sold "understanding others"; what it sells is "in the name of understanding others, seeing yourself more clearly". And the real verification isn't in the median of the evidence table — it's in whether it can keep the respect for curiosity and exploration you started with.**


<!--memo:cb37e2ac9264-->
### AI-type features

> 2026-08-28 10:09:20

This kind of AI-type feature is very much an inspiration for users

If you pull a certain feature up to a certain level, and users have a certain degree of trust in it, then only ship it after it reaches a certain experience score


<!--memo:c8c7d1ae7a87-->
### Thinking through the chain of reasoning for ailoha Eval

> 2026-08-28 12:33:38

The core problem to solve from first principles: understanding some of ailoha's own tools, and thinking about whether they need to be categorized — for example suggestion tools, read-only tools, proactive tools, write tools — and what can come after

What should ailoha's first version of Eval test?

The meta-methods that some good projects use in their design, learning how to design

What is the current frontier shift in Eval design — blogs going from single-turn text to full trajectories

What is the right definition of prompt adjustment — the current agent should be handed over to the harness as much as possible, adding some weighted tools, rather than adjusting the prompt; prompt should be the very last thing, the intelligence goes to the model

The self-evolution logic afterwards

Give the answer


<!--memo:def50d141441-->
### What is the single problem right now, and who really judges good from bad

> 2026-08-28 12:47:27

What is the single problem right now, who really judges good from bad, what is the frontline evidence, what is the smallest verification, who is responsible, what result would make us change our verdict

Where exactly in Ailoha can we currently not judge good from bad?

What user consequence does this problem cause?

Why are the existing tests or manual experience not enough?

What is the minimum to build, and how long until we can see evidence?

Why choose this entry point rather than building the full platform?

After it's done, which product or engineering decision can it support?

Ailoha currently doesn't lack a general Eval platform; what it lacks is a minimal product Eval loop for "screenshot → person search → contact/meeting action card". The suggestion is to first build a baseline from all of kiwi's real cases, and then decide whether to build a platform after verifying.

---

Core background: the tools and prompts being modified right now carry very high risk — there's no way to stably answer whether search is more accurate, whether contacts/meetings are correctly created

The core is: what do we do next? ???


<!--memo:a3fdcd520f26-->
### For Claude, turning product requirements into tasks

> 2026-08-28 14:39:02

For Claude, turning product requirements into tasks: grader, trace and outcome

For Manus, the file system's memory, recoverable compression, error retention, cache design


<!--memo:a23d00b435ea-->
### Claude code's suggestions:

> 2026-08-28 15:06:34

30–50 high-value Tasks (especially failing tasks)

For each task, find a reference solution known to pass all graders, proving the task is solvable

outcome grader, detecting the real result

guardrail grader, checking process that must not be violated

quality grader, judging open-ended quality, for example tone, explanation quality, relevance

Write both Should and Should-not cases

The environment must be isolated; every trial starts from a clean environment and can't share some resource environment

Graders use a layered structure: use code where code works; where code doesn't work, one dimension per rubric, model-based; human evaluation as gold, subjective judgment, Judge calibration


<!--memo:dc4f1bb31481-->
### Adjusting prompt and eval is often about finding

> 2026-08-28 15:07:03

Adjusting prompt and eval is often about finding the balance between under-trigger and over-trigger


<!--memo:586acf5a0e52-->
### Grader, what way it judges:

> 2026-08-28 15:09:17

├── deterministic grader: code, rules, state checks

├── model-based grader: executed by an LLM judge

└── human grader: executed by a human expert

What kind of content it judges:

semantic / state / trace / contract: what is being judged

A Semantic Grader can be executed by an LLM or by a human

Essentially it's a semantic referee: it doesn't check whether the output is literally identical to the standard answer, but judges whether the meaning expressed satisfies the requirement


<!--memo:9205580eb1f5-->
### Putting in a lot of effort to look at a lot of transcripts

> 2026-08-28 15:27:55

Putting in a lot of effort to look at a lot of transcripts, continuously checking:

Whether the Agent really made a mistake;

Whether the Grader falsely killed a legitimate solution;

Whether the Task is ambiguous;

Whether the Harness constrained the model;

Whether the environment leaked state;

Whether the Agent is gaming or bypassing the Grader;

Whether the failure is "fair and explainable"

So the Transcript isn't for a pretty observability page, it's the main evidence for Grader calibration and Eval health checks


<!--memo:69c636a79815-->
### What Phoenix's shadow lab can do

> 2026-08-28 15:32:49

A replaceable experiment and review UI

Phoenix provides Dataset, Experiment, repeated runs, Evaluator, result comparison and Trace drill-down, which can reduce the cost of building our own experiment UI

Phoenix doesn't provide: the before/after state of Contact, Calendar, Memory;

But considering the first stage doesn't need Phoenix, we can first prove a minimal loop


<!--memo:34bdd80b36a0-->
### OpenAI's evaluation

> 2026-08-28 16:23:38

OpenAI's evaluation design method is also very distinctive

It uses the Agent legible repository public method

Making the environment, knowledge and feedback readable, verifiable and modifiable for the Agent

I feel OpenAI's methodology fits very well into agent projects

In fact it also treats evaluation as part of the harness agent

It's equivalent to infrastructuring the organization-related things too: what used to depend on a senior engineer's brain memory, Slack conversations and code review gets turned into explicit state an agent can check

Tacit knowledge → retrievable knowledge

Preference requirements → executable invariants

Manual observation → signals the Agent can read

I think this part is very worth learning. Our everyday engineers are all on Feishu now; if it were Slack, from my testing an agent could go through problems and information every day on its own, then analyze the problem information, analyze docs, and UI logs, metrics and so on — all of which can be abstracted into tools, and then the agent uses them flexibly


<!--memo:4e0b341f28ef-->
### Optimizing Google search

> 2026-08-28 16:41:21

Add it to the agent's description

Within the tool, give a part that can ask back, triggering the agent's thinking and judgment


<!--memo:fef856a1bf8e-->
### Observations on Letta's design

> 2026-08-28 16:55:18

How does Letta form memroy from experience?

Raw experience — Experience

↓ reflection, generalization, cleanup

Long-term memory — Memory

↓ retrieval, fixed loading, progressive unfolding

Current context — Context

↓ model reasoning and tool calls

Behavior — Action

↓

Produces new experience


<!--memo:fe2d8841211a-->
### These big-company evaluation

> 2026-08-28 17:36:28

I feel the evaluation designs of these big companies are all quite worth borrowing and learning from


<!--memo:e0ffa2c345c9-->
### eval cases should come from the real distribution

> 2026-08-28 18:53:33

Serving a concrete decision, explicitly used for model selection, regression checks, release blocking


<!--memo:0d68b08c02e4-->
### A good eval, under a fixed scope and version

> 2026-08-28 19:34:28

A good eval, under a fixed scope and version, using real cases that don't leak the answer, trustworthy Gold and reproducible runs, answers one clear product decision, and can clearly conclude whether to change the prompt or the tools, or the models, or the memroy, or the product forecast


<!--memo:b7bfd8ea145f-->
### An overall human baseline that doesn't depend on model output, inferred and measured

> 2026-08-28 19:53:43

2Meet's real demand ratio in Kiwi's scenarios, how many false positives the system has, how many misses, and where the main errors are.


<!--memo:2a85dcbaea70-->
### Using a locally deployed phoenix to complete Eval

> 2026-08-28 20:25:58

Use a locally deployed phoenix to set up the Eval platform, targeting the 2meet task

Upload the thousand-plus Kiwi images to the platform. Multiple images belonging to the same chat or task get combined into one Episode, don't count them repeatedly

Annotate them one by one independently, without looking at the model's original answers. The main judgment: whether a 2Meet or a Calendar should be generated, or neither; anything you can't understand gets labeled separately as needs_context

If the fields you're labeling aren't that certain, then adjust the product's semantic boundary values in reverse, clarify the rubric, and based on the new rubric, have humans annotate whether the case follows the Policy

After annotating, first count how many 2Meet there really are in the real images, then compute the current model's Precision, Recall and exact route accuracy

Automatically split the model's errors into two kinds: generated when it shouldn't have is FP, should have generated but didn't is FN

Then classify FP/FN by cause, for example: Kiwi isn't a participant, it's just a pleasantry, historical record, already cancelled offline, already scheduled, online vs offline misjudgment

From each error type pick 3–5 of the most representative images, add some correct normal cases, and form a Regression Suite of a few dozen

Each Regression Case gets a Gold, a hard fail and a state oracle (what the correct answer is, what absolutely must not happen, what the database should end up as)

Using exactly the same images and environment, run the old version three times and the new version three times. Record the final route, Tool calls, the full Trace, and the real state changes in Calendar/2Meet

Separate model failures from Harness failures. Login failure, images not getting in, Tool timeout or missing state receipt — none of these count as model errors, they can only count as undeterminable

Manually spot-check failed Traces to confirm whether the model really misunderstood, or whether the Gold, Evaluator or runtime environment itself has a problem

Compare old and new versions: the new version should clearly reduce FP while not creating a large number of new FN; hard fails like unconfirmed writes and duplicate creation must be zero

Cases that once failed and pass after the fix permanently join the regression tests. Every future change to the model, Prompt, Tool or routing rules automatically re-runs these Cases

What the Claude team mainly answers is: can the Agent reliably complete the goal in a fixed task and environment. Ailoha, combined with the business, should also add: how many 2Meets should be generated in the real world of images, and whether the model systematically over-generates or under-generates

What is the real 2Meet ratio, what are the current Precision and Recall, what are the main errors, how much has the new version improved, and which problems remain unsolved


<!--memo:a222aae86f10-->
### Currently Ailoha already has a Claude-style

> 2026-08-28 20:28:21

Currently Ailoha already has the prototype of a Claude-style Eval: Case, Gold, Evaluator, Trace, State oracle and Suite.

What's really missing now is:

Getting the thousand-plus images fully into the Population annotation flow.

Automatically connecting Kiwi Annotation with model output.

Automatically generating FP/FN and error groupings.

Generating Regression Cases from the error groupings.

Running old and new versions multiple times in the same environment.

Writing experiment results and state receipts back to Phoenix


<!--memo:a242a92a9381-->
### Solving the vocabulary problem in evalations

> 2026-08-29 00:32:09

Solve the problem of context in evaluation (listen to more videos and podcasts)

Solve the thinking about taste in evaluation, what a good Eval looks like, the existing


<!--memo:23ff092f973d-->
### So train yourself in the ability to express precisely, find the problem, locate the essence

> 2026-08-29 00:43:49

First principles, keep dissecting and dissecting

Dissect until there's nothing left to dissect


<!--memo:74907f4e72d0-->
### The lesson from the current company is to choose a real workflow with high feedback density

> 2026-08-29 15:20:37

The lesson from the current company is to choose a real workflow with high feedback density, and own its environment, results, memroy, policy and evaluator


<!--memo:390aba143a69-->
### reword, human-on-the-loop

> 2026-08-29 15:55:30

reword, human-on-the-loop — the human is on the loop; in practice it isn't AI handing out prizes, it's telling the model how much of its previous behavior there was, and whether it should be more or less inclined to do similar things going forward

The Verifier is responsible for judging → Reward turns the judgment into an optimization signal → the model learns from it

What the model learns is to find the behavior that gets high reward

As long as reward aligns with the real objective, chasing a high score equals real progress


<!--memo:ab19d9b391cc-->
### IM chat boxes essentially contain some very scarce things. For example

> 2026-08-29 16:09:03

IM chat boxes essentially contain some very scarce things. For example, it isn't necessarily perfect expression, but it's often imperfect expression, very real expression, very real preferences.

It may contain some implicit intentions, and these things are often closest to some of the very real things about the person themselves, so inside it there's always some very subjective truth. And then these things...

About this, I have a lot of memory, and I find it quite interesting, because in essence it isn't just some memory of the user themselves. Of course the user's own memory may have value, but relatively speaking, if you're doing some conversation, and doing relationship-type things, about the boundaries of personal memory, then it might be relatively more valuable. Based on these things, if we later cooperate with model vendors, we could filter some training samples, including doing some benchmarks


<!--memo:b7ea54a80666-->
### eval awareness

> 2026-08-29 16:27:38

The model, while executing a task, can notice that it's in a scenario where it's being evaluated, and its behavior may change as a result

The word harness is expanding — it's no longer just "prompt + tools + memory + orchestration", but now explicitly counts tracing, feedback handling and recovery logic as parts of the harness. The agent harness is described as the structured execution layer around the base model, covering prompt and context management, memory, tool interfaces, orchestration logic, runtime isolation, feedback handling, tracing and recovery logic


<!--memo:025b51b93c43-->
### I've found one very very different point between me and kiwi, which is

> 2026-08-29 16:29:03

I've found one very very different point between me and kiwi, which is that kiwi is someone with a very strong first-principles mind — he basically takes all of daily life, including his understanding of the world, of technology, of the economy and of AI, and breaks it down into physics axioms, then rebuilds from there. So his judgment basically all comes from his own first principles about a given problem, which gives him fairly strong judgment

And I've found that this ability of mine is actually very weak. Relatively speaking, I'm a very systemic or emergent thinker. Usually I take whatever it is — technology, economics or biology — and look at it as a self-organizing living system, rather than breaking it into separate parts to optimize, so relatively speaking I pay more attention to the whole


<!--memo:35c1d27e21fc-->
### First, why evals came to exist

> 2026-08-30 13:55:20

What it solves is that early on you change a prompt, run a few cases, and it looks like there's no problem

But after launch users might complain that it feels dumber

This may be the user's illusion, but apart from manually testing a few scenarios, there's no way at all to tell

Early on, relying on intuition and manual testing was fine, but when the agent enters production and starts to scale, without systematic evaluation all kinds of problems appear


<!--memo:65d1bed14628-->
### Claude first did it through end to end

> 2026-08-30 14:07:15

Claude first did it through end to end Eval

The scaffold for coding agent evaluation was initially built like this

The model decides for itself what commands to run, what files to look at, what tools to edit

At the very beginning there were just three tools: bash tool + file edit tool + planning tools

Give a specific task, and in the end test whether the repo satisfies the task


<!--memo:7e86253b7f2d-->
### A good Eval can precisely expose problems

> 2026-08-30 14:11:59

A bad Eval distorts results, letting you mistakenly believe you've made a lot of progress

The core of Eval is the goal — it's used to answer one question: what would objectively prove that this goal has been achieved

That's why it spawned three parts: the test set is for setting the goal, the scoring criteria are for setting the scale, and independent execution is for guaranteeing truth; only the three together make a complete Eval


<!--memo:e9b7a0ff2ac2-->
### The process of breaking a big Eval down into small Evals

> 2026-08-30 14:25:01

A very important point is to locate problems more precisely and avoid vagueness

So the Claude Code team initially went from overall task e to e Eval to component

But I think in this process, there are actually some cases, or some goals, that the current traditional tools aren't suited to Evaling, because there's no very good evaluation standard. So in this process, I think some things need human preference

Without losing task completion, is there anything unnecessary said — conciseness is one Eval; another category is better suited to rubric + LLM-as-judge + human preference


<!--memo:1774cb973d0e-->
### It's like this: probably between claude and OpenAI

> 2026-08-30 14:31:49

I think it's like this: there's a very very big difference between claude and OpenAI, probably. I think the difference is that when they optimize their metrics, there are some differences. For example, what you test at the very beginning, how you score, and how you collect preference data — all of these determine which direction your model's capabilities go. So I think it's the same at the application layer: the way you optimize the corresponding thing, what goal you set, what kind of correct, good, tasteful goal you set — in turn, all of that comes back and defines which direction your agent application will go?


<!--memo:cd2eb30140db-->
### Evaluation is essentially encoding value judgments

> 2026-08-30 14:37:19

So any evaluation metric is actually very important — it determines the future growth direction of two models. For example, even a better answer, or a more successful Agent behavior, or something more aligned with user intent, it raises a normative question: what counts as helpful? What counts as honest? What counts as respecting the user's subjectivity?

I feel all of these involve a series of non-purely-technical questions, including philosophy, ethics, political philosophy, phenomenology and so on

What engineers and product managers can solve is usually how to test and how to optimize the testing faster, but they're not necessarily good at systematically asking why we define it as good this way

Understanding users and product philosophy actually requires deeper insight, and it may not only be about biology — about how to make users fall in love with the product, depend on the product. I think there may be something deeper: how a person should understand their own intentions, how to live alongside tools, how to handle uncertainty and responsibility. But if you rely only on user research and AB test preference data, it's easy to stay at the surface of what people say they like, while actually missing the deeper structure of what kind of human-machine relationship people really need

So actually I think philosophers are very good at translating vague product visions into operable principles or evaluation dimensions that don't over-simplify

Philosophers help translate vague product visions ("more useful", "safer", "more human") into operable principles and evaluation dimensions that don't over-simplify. Anthropic's Constitutional AI itself borrows heavily from the philosophical tradition, and the results have already proven this path works


<!--memo:3305d480773e-->
### rubric feels like a key part of evaluation

> 2026-08-30 14:51:23

rubric feels like a very important part of an evaluation platform

rubric is the part most easily underestimated, and the part most easily found in hindsight to be "we got it wrong back then"

Who the rubric is for matters a lot — it determines the granularity

If it's given directly to a human, you can use fuzzy language paired with cases, since humans have common sense to fall back on

If it's given to another model as LLM as judge, it must be extremely specific and operable, otherwise the model itself will be inconsistent on boundary cases

But I think actually, when breaking down this principle, finding the failure patterns rather than the ideal state is often more important. Instead of starting from a positive definition like what an honest answer is, we could start from some real failure cases: what exactly said ambiguous things, what places were overly sycophantic, what places pretended to know something they didn't. It's just like how we actually find the things we love: when we don't know what we love, we first think about what we don't like, then define those disliked things clearly, solve them one by one, and based on that evolve what our initial ideal state looks like


<!--memo:93238957b5f7-->
### Maybe it's also because their organization's values and philosophy are different

> 2026-08-30 14:56:08

Maybe it's also because their organization's values and philosophy are different. I think it may be about, over the long term, how you train people's way of thinking, including shaping it — maintaining consistency, organizing information and handling constraints; at these complex levels, I think Claude may be more advantageous. Because look: Claude itself has stronger instructions, and when you use it long term, people are actually forced to break their ideas down very clearly and write the constraints more completely, and the model won't easily just say "close enough". In this process it's actually training rigor. And I think over the long term, its writing and structure are actually closer to high-quality human thinking — the rhythm of its output. Plus the density of information, including how to transition naturally, and what good thinking looks like. So with long-term contact, people slowly absorb that non-mechanical but breathing way of expressing and reasoning


<!--memo:6174f793e694-->
### The "hardness" of the evaluation signal determines what strategy the model learns

> 2026-08-30 15:10:31

Hard metrics (SWE-bench, HumanEval, pass@k etc.): essentially binary or close to binary — the code runs or doesn't, the test passes or doesn't. Using this kind of signal for RL or preference over the long term, the model learns a strategy of "minimizing the probability of failure"

Soft signals actually define which things the evaluator directly compares as clearer, more honest, more willing to point out risks, more measured. These signals are actually more continuous, but closer to real usage experience, and they're noisier and the most expensive

The evaluation signal is the upstream of the training signal. If evaluation only rewards "it runs", the model learns to "slap together a solution that passes the tests"; if evaluation also rewards "clear, honest, measured", the model will internalize those traits


<!--memo:24d35c66d53c-->
### Once the evaluation system is built

> 2026-08-30 15:25:04

Once the evaluation system is built, a lot of things are free: latency, token usage, cost and error rate can all be tracked continuously on a fixed task set. The compounding effect of evaluation is easily overlooked, because the cost is visible up front and the returns accumulate later

And another point is that when a stronger model is released, teams with evaluation can quickly verify and adjust prompts


<!--memo:38bf4cb1f430-->
### The Eval platform grows naturally

> 2026-08-30 15:30:03

It doesn't start with a perfect design

Instead, at every step, take one step and look ten steps ahead

At first the Anthropic engineers used it themselves every day; after changing the prompt, tools and UX, dogfooding felt clearly better, so they shipped

But later, once it matured, they found

If I fix "verbosity" today, will Claude explain less of the key content tomorrow?

If I raise the Edit success rate today, will it become more aggressive about modifying files?

After switching to the new Sonnet, search got better — but is it more prone to making random edits?

So the things previously judged by engineers' feel had to be frozen into regression evals

User complaints

↓

Discover the failure mode

↓

Manual fix

↓

Confirm the effect

↓

Add this case to the eval

↓

Automatically run it on every future version

At first build a relatively small Eval, then compare the difference between the previous prompt and the new one; if it holds, ship, then encapsulate — the purpose of encapsulating is to reuse later, avoiding having to redo everything and creating other problems when you change things


<!--memo:96acb3d7db31-->
### A truly useful eval may not end up looking like an "AI" platform

> 2026-08-30 15:31:43

A truly useful eval may in the end not look like an "AI evaluation platform", but more and more like AI-native CI/CD


<!--memo:f7250b57ee5c-->
### Eval (evaluation) is a big set

> 2026-08-30 15:32:51

Eval (evaluation) is a big set, Benchmark is one form within it

Eval equals the exam itself

benchmark equals the college entrance exam


<!--memo:2f97a0326701-->
### Since it's a CI/CD system, what really matters is

> 2026-08-30 15:36:30

Online failure → automatically accumulating cases → regression eval → CI → experiment → ship decision becomes a workflow developers naturally use every day


<!--memo:ef2d68a9c6df-->
### If you want to increase the model's exploratory behavior (like raising temperature

> 2026-08-30 16:10:21

If you want to increase the model's exploratory behavior (like raising temperature, increasing sampling diversity), pass@k will get better — because among more diverse candidates it's easier to "hit" one that's right. But this simultaneously pulls down pass^k — because increased diversity means the stability/determinism of a single output drops, so the probability of being right "every time" actually decreases

Conversely, if you want the model to be more conservative and certain (lowering temperature, strengthening alignment, constraining the output space), the variance of single-shot success rate gets smaller, pass^k looks better, but the room for improvement in pass@k also gets compressed (because the k attempts are highly correlated, and the marginal benefit of "at least one right out of many" gets smaller)

So it seems like that's why a large model's ability in the coding domain and in other domains still differs quite a lot


<!--memo:fb7b6a8c8115-->
### For evaluation, the people closest to the product needs and users are most qualified to define

> 2026-08-30 16:20:54

For evaluation, the people closest to the product needs and users are most qualified to define success. At Anthropic, product managers, customer success managers and even salespeople can contribute evaluation tasks as PRs through Claude Code


<!--memo:70bd81fc35db-->
### I've confirmed:

> 2026-08-30 16:45:15

All 100 Episodes loaded successfully

Each one has images, AI draft labels, confidence and reasoning

Currently the number of human submissions is 0

No predictions were written

The original Ground Truth project still has 0 annotations, 0 predictions

After entering, click Label All Tasks and work through them one by one:

Look through all the images in the Episode.

Treat the AI draft labels as suggestions, don't accept them by default.

Independently choose the final route:

Generate 2Meet only

Generate Calendar only

Two different commitments get generated separately

Generate neither

needs_context

Fill in participants, time status, commitment strength, online/offline and scheduling status.

Click Submit, move to the next one.

Core judgment criteria:

Kiwi isn't a participant → don't generate.

Both sides clearly commit to meeting offline in the future, not yet scheduled → 2Meet.

There's an actionable date and time → Calendar.

The same commitment cannot generate both 2Meet and Calendar at the same time.

Can't tell clearly, missing adjacent screenshots or key information → needs_context, don't guess.

The current AI draft label distribution is: 2Meet 10, Calendar 21, generate neither 67, needs_context 2.

Note especially: this project is "human review after seeing the AI answer", so the results cannot directly masquerade as fully independent blind-labeled Ground Truth. If the goal is to measure real Precision/Recall, independent Gold or a second adjudication is still needed in the end.

Also, this platform currently only records judgments, it won't actually create Calendar or 2Meet, and it won't touch production data. Once you finish the review, I can continue with: freezing Gold, tallying disagreements, computing model Precision/Recall, classifying FP/FN, and building the Regression Suite


<!--memo:27ceffc690b5-->
### Good Eval and bad Eval in hamel's eyes

> 2026-08-30 20:17:23

A pile of generic metrics is meaningless

People don't know what to do between a 3 and a 4; why is that number better than a 2, it's not obvious, it's vague

Metrics are often unimportant; what's being optimized is a number nobody really cares about

Business says eight metrics are all important, but if everyone really thinks multiple metrics are all important, that means what's being optimized is a number nobody really cares about


<!--memo:68683621590a-->
### Pass@k can give the model k retry chances

> 2026-08-30 20:23:46

Pass@k can give the model k retry chances, at least one success; this can measure the ceiling of harness capability (coding ability)

Pass^k — k consecutive successes — can measure the one-shot floor, whether the harness randomly collapses

Eval can ultimately serve as a CI gate: the regression test suite (meaning the things tested before, whether they can still pass with full marks), run on every change, while monitoring production for new non-deterministic cases and continuously expanding the eval set

Capability Eval vs Regression Eval — you can refer to bloom, inspect-EvalS (UK AISI)

Whether to go with a multi-Agent architecture should be driven by eval results, not assumed by default from the start

I find it quite interesting that if you let an LLM do evaluation, it's actually better suited to discriminative tasks, like pairwise comparison, classification, and scoring against criteria. It's not good at self-evaluation of open-ended generation


<!--memo:4ec68b029b33-->
### And I think there's actually another point, about the Agent when it passes tools

> 2026-08-30 20:25:52

And I think there's actually another point, about whether the Agent, when it passes tools, passes the corresponding parameters correctly — this is also very important. Especially in the single-Agent scenario, whether the parameters passed to the tool are correct, especially the parameters extracted from the conversation history, and why they're wrong. And these wrong ones are all very valuable cases

And then another one is that multi-Agent systems add another category: agent handoff accuracy (whether it hands off when it should, whether the handoff target is right, whether circular handoffs occur)

So actually whether to adopt a multi-Agent system architecture should be driven by Eval results, not assumed by default from the start

Metric-based (exact match, ROUGE/BLEU, function call accuracy, executable tests like text2sql): cheap, suitable for automated regression, but may not fit the specific scenario and easily misses subtle differences

Human evaluation: highest quality but slow and expensive. Suggestions: iterate over multiple rounds to refine the scoring criteria; "show not tell" — show the raters concrete examples of a 1-point/3-point/8-point answer rather than abstract descriptions; besides a numeric score add a pass/fail threshold; aggregate multiple raters with consensus voting

LLM-as-judge: cheap, scalable, but has position bias (preferring the answer listed first) and verbosity bias (preferring long answers). Suggestions: prefer pairwise comparison or pass/fail over scoring, since it's more reliable; use the strongest model as the judge; add chain-of-thought so the judge reasons before scoring, which improves evaluation quality; turn open-ended questions into multiple-choice format as much as possible to make automation easier; judge scores should be regularly checked for consistency against human annotations, and only after consistency is confirmed should you confidently scale it up


<!--memo:c3989f871a74-->
### I suddenly realized: traditionally, single-turn model interaction

> 2026-08-30 20:31:10

I suddenly realized: traditionally, single-turn model interaction makes it quite easy to do some intent classification. For example, whether the model understood the instruction, and whether the system prompt's weight overpowered the user's prompt. And then whether its output is correct. And then on top of that knowledge, you build some Workflows. The Workflow increases in complexity, but it doesn't add any new source of non-determinism, it just guesses those two things at every step


<!--memo:9453c6f6ca04-->
### LLM-as-judge is very worth testing, it's cheap

> 2026-08-30 20:35:33

LLM-as-judge is very worth testing, it's cheap and it scales, but it has position bias (preferring the answer listed first) and verbosity bias (preferring long answers)

Suggestions: prefer pairwise comparison or pass/fail over scoring, since it's more reliable; use the strongest model as the judge; add chain-of-thought so the judge reasons before scoring, which improves evaluation quality; turn open-ended questions into multiple-choice format as much as possible to make automation easier; judge scores should be regularly checked for consistency against human annotations, and only after consistency is confirmed should you confidently scale it up

Metric-based eval methods share a common trait: you give an explicit, computable rule or formula, feed in the model output and the reference answer, and it spits out a number, with no human looking at it and no other model acting as judge the whole way

But in practice, Metric base Eval is still one layer within the evaluation system; it still has to be paired with human evaluation and LLM as judge for calibration, especially for tasks that are highly subjective and allow a lot of expressive freedom


<!--memo:a6a72ea2bfb5-->
### The Verifier is the core bottleneck in self-evolution

> 2026-08-30 20:45:21

Whether RSI's whole loop (answer → experience → learning signal → problem/curriculum) can keep turning depends not on "whether it can generate" new things, but on whether it can reliably judge whether the new things are better. Generation can always be done, but if the judgment criteria aren't reliable, the direction of improvement may keep drifting off without you knowing

I think for some formal tasks, like math or code, this kind of Verifier is easy to do, because it can use some unit tests or code execution results, and then it's either right or wrong, objective and stable, easy to set up an automated loop. But this kind of loop has boundaries, because the judgment criteria are in fact fixed in advance by humans

And then I think more of it is subjective, open-ended tasks. This kind of task actually depends heavily on human subjectivity to judge, so it's hard to have an objective right or wrong. You need strong judgment about novelty, usefulness and importance. This thing is inherently hard to formalize, and the Verifier is hard to build too

The Verifier itself has also started to evolve

Self-Trained Verification: treating the verifier as a training target, letting its judgment ability improve through iteration

Self-evolving Deep Research Agent: while the agent's capabilities evolve, the rubric (scoring criteria) used for evaluation updates in sync

Meta-evaluation: not only evaluating the result, but further evaluating how well the "evaluator" itself is doing

Red Queen Gödel Machine: letting the agent and the evaluator evolve together, so the evaluation criteria are no longer fixed


<!--memo:2458af6beed0-->
### Evaluation engineer

> 2026-08-30 21:02:06

I think an Evaluation engineer, through the whole learning process or growth process, is essentially a process of continuously defining what good is

So an Evaluation engineer should be a researcher, and not necessarily a top-tier engineer


<!--memo:9b3232a727b7-->
### There are some standards about evaluation out on the internet

> 2026-08-30 21:27:41

I think there are some standards about evaluation out on the internet, especially about the core judgment of "good", like validity.

A test can run very smoothly and the numbers look great, but it isn't testing the capability you care about. So the core is to ask yourself: if some metrics go up 10 points, will the business really get better? That's the answer we find very meaningful.

For example, when we were studying the ToMeat tool, evaluating how to improve its capability. We had a set of solutions to address it. The next version really did push the score higher — but is it really good?

And I think there's another point: whether this evaluation is explicit, stable and trustworthy. For example, for the same data, if you test it today and test it tomorrow, are the results roughly the same? Swap in a different annotator, and the results probably won't be wildly different either.

And also, I think, whether it has discrimination — whether it can really separate good from bad. If an evaluation lets all models and all versions score above 95, then this evaluation is already saturated, it has no discriminating power, and continuing to use it for decisions is meaningless.

And then some of it is about actionability — even if some low scores come up, the engineer should know which step or which kind of case had the problem, and how to fix it.


<!--memo:02817bc7900c-->
### So what exactly is good? What is good, really? I think metrics can locate

> 2026-08-30 21:31:03

So what exactly is good? What is good, really? I think metrics can locate problems, but a complete Evaluation also has to answer: what result does the user really need? What counts as correct? What counts as wrong? What counts as undeterminable? And which kind of error costs the most? And also: after switching models, Prompt or Workflow, have the old problems recurred?


<!--memo:4b8abb9daa25-->
### Deep thinking helps me understand why the remote mobile app seems unable to use voice

> 2026-08-31 10:52:50

Deep thinking helps me understand why the remote mobile app seems unable to use voice input, and also can't successfully send content to call the AI?


<!--memo:9cad3a4a581b-->
### Sometimes what's being tested isn't what we think

> 2026-08-31 11:44:36

The meaning of each score's existence — when the score is high, what ability does it actually represent; if you can't answer that, it's a bad one

And also the data itself is dirty; some training sets and evaluation sets are themselves wrong, and then all the work that follows is meaningless


<!--memo:dfd1b22c0c2b-->
### The concept and understanding of Pilot

> 2026-08-31 12:58:45

Pilot means that before formal annotation starts, you extract a small batch of data, have two or more annotators label it independently, and then:

Compute inter-annotator agreement (IAA)

Go through disagreements one by one, discuss whether the guide was unclear or the understanding differs

Revise the annotation guide (rubric), add rules and examples

Extract another batch and retest, until it passes

For example, about creating a calendar at certain times — some information may be very vague, and at that point a kind of judgment mismatch appears; how to align that mismatch is the question

What does Pilot look at? The core is inter-annotator agreement

The consequence of not doing a Pilot is that the vague points in the annotation guide get systematically amplified during formal annotation, and by the time you discover the data has problems, thousands of entries are already labeled, and rework costs are extremely high

LLM-related subjective annotation, including quality scoring, preference ranking and safety judgment, has an enormous number of boundary cases


<!--memo:6b3d46937582-->
### The hardest thing to make concrete in evaluation

> 2026-08-31 14:45:23

I think the hardest thing to make concrete in evaluation is turning "performs well" into a set of observable, reproducible, attributable judgment criteria, that is, the evaluation oracle (the judging ground truth)

An oracle is an authority that knows the correct answer

How to build a reliable oracle is a thing worth thinking about

The oracle wraps the whole evaluation process, even the annotation itself

Defining and building it requires us to know what good looks like — that's writing the oracle rules

Constructing the questions is the skeleton of the oracle; each question's reference answer and scoring dimensions are instantiations of the oracle

Scoring also needs the oracle to take the model output and the oracle to produce a score per question

Aggregation itself is also the oracle summarizing results, aggregating the per-question scores the oracle judged into a total score

The report is the presentation of the oracle's results


<!--memo:bd7aab0b0402-->
### On the in-between of labeling

> 2026-08-31 18:58:01

Evaluation is a reproducible quality-proving system.

Real tasks / known risks

→ candidate cases

→ humans define a hidden gold / oracle

→ independent review and dispute adjudication

→ freeze cases + suite

→ baseline / candidate run independently

→ collect answers, traces, state diffs, action receipts

→ layered graders

→ metric + gate result

→ humans decide adopt / revise / reject / release

→ failures re-enter the next round of cases / the annotation queue

Letting AI annotate after humans have annotated is very worthwhile, but it has to be blind annotation: temporarily hide the human labels, the explanations and the final answers, and let the AI see the original case.

The program compares the structural differences between the two sides, and sends only the disagreements to an independent reviewer.

The reviewer goes back to the original evidence and may accept the human label, accept the AI's reminder, or decide that the rubric itself needs revision.


<!--memo:90f1ad426dd6-->
### At first everything was annotated once

> 2026-08-31 20:46:57

But because it still has to be verified,

later the LLM, following the new product semantic rules, defined a new set of rubrics, because the original 2Meet and Calendar definitions weren't accurate enough.

2Meet essentially manages offline relationship opportunities not yet scheduled, while Calendar manages broader events that already occupy time, including interviews, podcasts, online meetings and so on.

So we proposed a v0.3 lifecycle rubric. The next step won't be directly computing model accuracy from the current labels; instead we'll first freeze the old labels, hide the answers and do an independent blind re-verification, then have humans adjudicate only the disagreement cases. Once the gold is stable, we'll compute the real 2Meet share, precision, recall, routing accuracy and main error types, and distill representative errors into a long-term regression suite.


<!--memo:fd32f2374755-->
### Evaluation should come before the full agent product

> 2026-08-31 23:07:39

The accurate order should be: first define the user task, the success criteria and the unacceptable failures.

Write the first version of the evaluation: a real task set, scoring criteria, risk boundaries.

Build the first agent prototype and get the full chain working.

Keep revising the evaluation based on real failures.

Once the evaluation can reliably distinguish good from bad, then invest in the full product, complex architecture and scale optimization.

Evaluation constantly forces the team to think about what a good product is, what a good eval is, what good design is, and to keep doing that throughout the process.

Essentially it's also test-driven development.

Goal hypothesis → first eval → thin prototype → discover failures → update eval → redesign the agent.


<!--memo:9785ba194919-->
### Sometimes the same label hides several different problems

> 2026-08-31 23:15:05

Missing context: need_context

The rubric isn't written clearly: rubric defect

The product itself isn't clear yet about how it should be done: product semantics undecided

The annotator misunderstood: annotation error

The product's semantic boundary should depend on the actual harm of FP and FN to the user, whether the action is reversible, whether a real write occurs, and the user's expectation of the product.

The LLM grader must be calibrated with human labels, the rubric must be clear, and classification, pairwise or pass/fail should be preferred over open-ended "vibe scoring".

If the rubric or product boundary changes,

generate a new policy_version, rubric_version and gold_version.

Use the new gold to re-score both the old and the new versions at the same time.

You can't directly compare the old model's score on gold v1 with the new model's score on gold v2.


<!--memo:d9fe9af5ed01-->
### For this 2Meet scenario, or the Calendar scenario

> 2026-08-31 23:22:32

I think for this 2Meet scenario, or this Calendar scenario,

you can choose to score with fixed code-based methods: for example whether the corresponding Calendar or 2Meet tools were called, whether the tool parameters are correct, for instance whether a corresponding record was created in the database, whether it was created twice, whether it was written without confirmation, whether a harness error occurred — I think that's important.

An LLM grader isn't necessarily needed; for the fuzzier parts you can use an LLM grader.

Human blind annotation of the original episodes

→ product arbitration of disputed cases

→ freeze the gold and the rubric

→ calibrate the LLM grader with human-scored historical traces

→ freeze the grader

→ run the old and new versions three times each

→ score with the deterministic evaluator + LLM grader

→ humans spot-check failed traces


<!--memo:ee10f0d0b06b-->
### Evaluation forces you to start from many scenarios and cases

> 2026-08-31 23:28:46

Thinking about how the whole chain should be designed and done.

I feel this process is also a kind of enjoy.


## 2. Daily Notes and Everything Else

*118 entries*

<!--memo:1c5ebba5b32b-->
### A kid's privacy is a big problem — how do you guarantee that in

> 2026-08-04 12:56:58

A kid's privacy is a big problem — how do you guarantee it can't use privacy on iOS? I don't think the result can come true. The correct logic should be use-and-discard: it only extracts some important information, and the screenshot may still extract some data in raw form. But I'm wondering, is it even necessary to actually save the screenshot? It seems there's no need. Because the school, on the mobile side, also combined the destination location service feature; the current usage state is that it can already extract some keywords on iOS itself, and then those extracted keywords might be handed off for processing — but this then runs into privacy issues: the privacy in chat records, the industry's unwritten rules, and candidates' salary and compensation details. So this thing, I feel, can't be made public in any way; it's definitely still a very private thing for the user. And for storage, there's a key question it has to consider: whether users trust the platform. If it grabs too much information, I think it hits a trust problem. So then let's reverse-engineer a question: how do you accept this person. I think it's about this security and its privacy when data is stored in the cloud, and then also about how this data gets stored reasonably.
#ailoha


<!--memo:87427ca288ae-->
### I used each platform's AI chat

> 2026-08-05 02:12:20

I used the advantages of each platform's AI chat mode to supplement my own cognition and context

I used voice — I even chatted with Doubao in the shower


<!--memo:4d6ce99725ca-->
### Want to run some experiments

> 2026-08-09 10:45:50

To prove whether I can get things done

Life should have a lot of deadlines set

Make infinite challenges within finite time


<!--memo:bef9eed5fae9-->
### What I want isn't to want to win

> 2026-08-09 23:27:38

and it isn't success either

and it isn't lying flat either

it's a whole life in which nothing was betrayed

Not wanting to let my own ability down, not wanting to miss this era's window, not wanting the worlds I've seen to just flow past for nothing, and not wanting to win so hard that I end up a cold, utilitarian person with nothing left but output

I lived seriously, I created as much as I could, I loved truthfully; I didn't run away from this era, and I didn't sell my soul to it


<!--memo:faf9fbfc43a8-->
### My partner is actually really worried about me

> 2026-08-09 23:31:46

But all along I still feel that if I got to choose again I'd still choose my partner; even if the result is bad right now, we have what we went through, and trust


<!--memo:492765517775-->
### For while, I think what matters especially is every time you do

> 2026-08-11 18:28:14

For while, I think what matters especially is that for everything you do each time, you have to think about it at a big granularity and at an appropriate granularity


<!--memo:4133b72f3e61-->
### They want a miracle

> 2026-08-11 22:31:31

Then I'll give them a miracle ~


<!--memo:a02c39cbdf50-->
### I feel they really are very busy, so understanding their needs still matters a lot

> 2026-08-12 09:33:43

I feel they really are very busy, so understanding their needs still matters a lot. I think what they want is something that can quickly help them solve their problem.


<!--memo:d6e516b5b46a-->
### The company entity is very clean, it's the US one, US region

> 2026-08-12 10:42:43

The company entity is very clean, it's the US one, US region


<!--memo:58eff320a2c6-->
### Research on the principles of generalisation

> 2026-08-12 13:39:45

Research on the principles of generalisation


<!--memo:0febb8728e60-->
### A contacts-mechanism decision and execution safety system

> 2026-08-12 16:00:22

A contacts-mechanism decision and execution safety system


<!--memo:8ec94898b847-->
### Research with contacts as the unit

> 2026-08-12 18:05:45

Some thoughts on research with contacts as the unit

Chinese and English names, exploration across each platform

and when contact is the unit

---

Addendum: the pollution problem of wrong recall

Search strategy: search with contacts as the unit, and then combine that with the context in memory for cross-validation


<!--memo:a6c46a4c50aa-->
### I said I'd later abstract my own approach to solving things into SQL too

> 2026-08-13 00:59:07

I said I'd later abstract my own approach to solving things into SQL too; I've already started getting to the bottom of things now. Abstract this process into skills as well


<!--memo:3556edd398ae-->
### If I can't do it, that means I have no talent on this path

> 2026-08-13 09:19:16

If I can't do it, that means I have no talent on this path


<!--memo:f0113f9a141c-->
### Jason seems to have drifted further away

> 2026-08-13 09:34:24

Jason seems to have drifted further away


<!--memo:5549fadc6120-->
### How to find this person fast

> 2026-08-13 11:37:01

The main thing is being clear about what kind of person the user is

being clear about what granularity the reviewer's judgement is at


<!--memo:9021053a7d0f-->
### In the diff, about Dev and main

> 2026-08-13 12:25:38

In the diff, the question of the release strategy between Dev and main, and their relationship

and the question of how to accept it


<!--memo:2d2f21d8efe1-->
### If you stay confused, it must be a misalignment of cognition

> 2026-08-13 14:09:23

If you stay confused, it must be a misalignment of cognition. What needs supplementing isn't knowledge and understanding, but cognition


<!--memo:62ada8c147d4-->
### The most essential reason for distinguishing out some of the people may be noise

> 2026-08-13 14:55:29

The most essential reason for distinguishing out some of the people may be noise


<!--memo:9a26467b2f76-->
### The sorting logic; LinkedIn's relationship network search can

> 2026-08-13 18:56:14

The sorting logic, LinkedIn's relationship network search can be searched out

LinkedIn's graph


<!--memo:26d8276fc167-->
### But now I find I've smartened up, in this process

> 2026-08-13 21:47:49

But now I find I've smartened up. In this process I've got some of their own methods: how to chase a problem, how to chase it down to the right granularity, how to rehearse this problem, how to judge, and why use this framework.


<!--memo:d6e78dfb60c9-->
### Hey Siri, I want that Linkin one, okay

> 2026-08-14 18:57:15

Hey Siri, I want that Linkin one, okay, thanks, okay


<!--memo:08ffdb638630-->
### Finding problems is really finding the chains that failed

> 2026-08-15 00:54:38

Go through the failed chains one by one, tracing back to one cause after another that can be distinguished by evidence and changed by action

granularity that's too coarse makes the task search inaccurate

granularity that's too fine leads to over-focusing on the problem of some function expression

So dig along the route, dig deep, keep digging, dig down to a concrete and appropriate granularity, locate this problem and solve it, and stop there ...


<!--memo:60dce9e00ea5-->
### A sense of purpose is what I've always lacked

> 2026-08-16 10:42:08

I think a sense of purpose, pinning down a goal, is very important

Look around this goal at what you can do, what there is to do, and whether there's really a shortcut

Without a strong sense of purpose, I think a person feels awful; learning is meaningless, doing things is meaningless

Settle on one goal, then go harder at it — do interesting things


<!--memo:9123cdb6f00c-->
### Real

> 2026-08-16 13:03:58

I feel I'm still not enough

not clear-headed enough yet in choosing the people and things whose cost I'm willing to bear, and truly living inside them

To be truly present, to own the choice, to dare to commit, to build real connection, to make peace with finitude


<!--memo:cebaef1edd80-->
### So what if I failed?

> 2026-08-17 10:01:43

It's just doing it again

What I'm really afraid of is not truly being myself


<!--memo:3e56846690d9-->
### Jin Gan — case lint case

> 2026-08-17 10:22:30

Jin Gan — case lint case


<!--memo:723ec7c50f4e-->
### Go close to the scene

> 2026-08-17 13:50:50

I've found that a lot of problems can be obtained by asking follow-up questions


<!--memo:5c37e3bd08ce-->
### name

> 2026-08-17 16:22:40

alise

context

maybe incomplete

Adversarial


<!--memo:388e4a8451eb-->
### Should there be a lightweight skill for judging whether to search contacts

> 2026-08-18 01:24:43

Should there be a lightweight skill for judging whether to search contacts


<!--memo:771abdeb90f3-->
### About the context recall problem:

> 2026-08-18 11:17:47

How to search, how to recall?

Shi Hongbin: no company name and no link, Xbanker.ai (a meaningless polluted data source)


<!--memo:bbb786634955-->
### About the context problem within it

> 2026-08-18 13:41:19

About the context problem within it


<!--memo:f85f71173bcd-->
### harvestapi~linkedin-profil

> 2026-08-18 14:23:25

harvestapi~linkedin-profile-search

name + context

Actor run

DatasetID

Get Dataset

After getting the records

there must be a name and a valid /in/ LinkedIn URL

extract headline, location, current role, past roles

deduplicate by normalised LinkedIn URL

merge career history when the same person is recalled by several routes

re-score using the original hard clues

in the end return only Top 3


<!--memo:ffe4c9d51eae-->
### fetch_linkedin_posts(profi

> 2026-08-18 14:47:20

fetch_linkedin_posts(profile_url)  retrieval over posts

if the user has already confirmed, the posts and such can also be recalled


<!--memo:ca59602cfd25-->
### Look at a problem, sort out the requirements, look at some info about the original implementer

> 2026-08-18 16:30:47

Look at a problem, sort out the requirements, look at some info about the original implementer


<!--memo:33b6b7136f86-->
### site:linkedin.com/in "Wang Rui"

> 2026-08-18 17:02:19

site:linkedin.com/in "Wang Rui" "going global"

It depends heavily on very similar words appearing in the page

and the ranking is still mostly string matching

the recall ceiling is decided by Apify / the search engine


<!--memo:53d6b24ffae5-->
### The part still to be evaluated

> 2026-08-18 17:17:56

The part still to be evaluated


<!--memo:df0b4d1a41a6-->
### Only pain gives you the deepest felt sense, and only the deepest felt sense gives you the deepest

> 2026-08-18 20:13:21

Only pain gives you the deepest felt sense, and only the deepest felt sense gives you the deepest thinking. So I feel pain isn't that frightening; it's a road I have to walk in this life

Pain is like motivation, pushing me further and further forward.


<!--memo:cb77417b6ed6-->
### Maybe for them it's a point of view too

> 2026-08-18 20:39:52

I think maybe for them it's a point of view too, and it isn't actually compromising myself

I'm just observing how kiwi actually treats her employees

and how she treats a newcomer

whether she thinks about giving a newcomer some space


<!--memo:1c6eb2e30bc7-->
### But I think it's quite right: if a team neither lets you be yourself

> 2026-08-18 20:45:42

But I think it's quite right: if a team neither lets you be yourself and also likes to put you down, then I think there's a problem

So you might as well be yourself and make yourself happy


<!--memo:cae433bbe05f-->
### On Exa's optimisation strategy, compared with Apify

> 2026-08-19 11:51:27

Should Apify's search strategy be kept?


<!--memo:c5e9131b6f3a-->
### Exa People

> 2026-08-19 11:51:38

├─ found a strong candidate

│  → Apify only scrapes the details of this URL

│  → name match + at least one company/role/region anchor

│  → stop directly, don't search the name again

│

├─ found a candidate, but the name conflicts or the evidence is insufficient

│  → run Apify required name routes

│

└─ Exa is empty, fails or times out

→ Apify required name routes

→ then Serp fallback if necessary


<!--memo:9f4fb57246db-->
### Exa's biggest problem is that search is expensive

> 2026-08-19 11:55:19

Exa's biggest problem is that search is expensive, but it's very accurate

Exa also has the problem that the data may be out of date

occasionally, LinkedIn pages change, privacy settings are an issue, and the People Index officially says it refreshes weekly, with an average index delay of about 3.5 days and a theoretical refresh window of about 0–7 days


<!--memo:83052e158683-->
### Multi-platform search strategy

> 2026-08-19 14:12:07

single tool vs multiple tools

several platforms, how to cross them

should skills set a todo?


<!--memo:e46e7dff9bce-->
### How are Exa's evaluation results

> 2026-08-19 15:29:34

analyse how this logic was integrated, how to research this logic


<!--memo:1866a852f259-->
### For each platform, when we search for a person

> 2026-08-19 18:38:03

For each platform, when we search for a person, when we really model a person, are there some techniques

for example for each platform


<!--memo:191cd6faccdd-->
### kiwi, so strong is the desire to control

> 2026-08-19 21:54:09

She has almost no patience even for people or things she isn't interested in


<!--memo:ae1a9397878b-->
### Seeing the sense of rupture that double standards bring

> 2026-08-19 22:35:55

You see a very contradictory picture

Outwardly, facing top-tier people, thoughtful, restrained, willing to listen, carefully maintaining precious elite-circle relationships

Inwardly, facing ordinary people on the team, impatient, with extremely low tolerance


<!--memo:9315e71d941d-->
### There doesn't seem to be much left to dig in the productivity scenario

> 2026-08-20 00:26:02

There doesn't seem to be much left to dig in the productivity scenario; this layer will probably end up being eaten by the model layer in the end


<!--memo:73a34ab70bc4-->
### How do we humans get to know another person

> 2026-08-20 09:02:50

What have they done?

What's their background?

What's their state recently?

What changes have happened to them?

What things are they interested in?

What do we have in common?

What topics can we talk about?


<!--memo:bab96999aa8a-->
### I suddenly remembered, when I first met kiwi

> 2026-08-20 09:29:08

I suddenly remembered, when I first met kiwi, I already had a fairly deep feeling

From the very start she didn't treat me as a partner, but as white's assistant, something like an outsourced position; she wasn't even slightly interested in me


<!--memo:385f82f76cfd-->
### The only kind of person kiwi can truly accept

> 2026-08-20 09:45:53

is the kind of person she herself was fairly interested in at the very start

and who then gets a lot of positive feedback during subsequent contact

so there has to be somewhere a very, very obvious advantage

and this advantage has to be expressed in a very concrete way

or else the person hired is just a very, very handy tool


<!--memo:03dc04bbb943-->
### If WeChat has a background, the recognition doesn't seem that good

> 2026-08-20 13:03:37

If WeChat has a background, the recognition doesn't seem that good.


<!--memo:a5082431e615-->
### ailoha is a verb

> 2026-08-20 19:12:57

You can indeed work backwards from it to a user mindset

this action really matters


<!--memo:2c86da09c80b-->
### I admire kiwi

> 2026-08-20 21:41:52

a very impressive person

her observation and understanding of the world and society


<!--memo:4aa59b7cd5f6-->
### kiwi is a person of great erudition

> 2026-08-20 21:42:10

kiwi is a person of great erudition


<!--memo:35d04f3cfdfc-->
### Study hard, copy hard

> 2026-08-21 12:42:41

Study hard, copy hard


<!--memo:7b184228f42c-->
### ailoha actually always has an exclamation mark added at the end

> 2026-08-21 17:00:47

This is a kind of user-mindset behaviour


<!--memo:ac792d055d7d-->
### It's also very inspiring for recording fragmentary information

> 2026-08-21 17:08:11

It suddenly occurred to me that it's also very inspiring for recording fragmentary information — how to record fragmentary information


<!--memo:0a9db539ff3e-->
### Strategy: broaden out first, then go deep

> 2026-08-21 17:53:54

Comments first, whether first-level comments or even second-level comments (sub_comments)

Posts with a high comment count are high quality, posts with a high share count have the most value for spreading, posts with a high save count have the most practical value, posts with a high like count have the most general approval


<!--memo:e386d10d39c3-->
### The most essential thing about Context is:

> 2026-08-21 19:02:11

inside the attention budget, provide the least but highest-signal information


<!--memo:96fba175bdf4-->
### I'm wondering, when it first enters

> 2026-08-22 12:07:46

I'm wondering, when it first enters, there should also be some other ways to enter. First let's discuss one piece, its action onboarding button

Because I'm thinking, on a phone, or very often, there's information that needs to be recorded. And at that point it can also serve as a tool for recording information


<!--memo:ee77e362053b-->
### What ailoha records is the relationships between people

> 2026-08-22 13:03:19

But what if some people don't really need that many relationships?

Why do people necessarily need that many relationships?

What I've been looking for all along is inward exploration

Relationships at bottom are also self-exploration

So in the end it's also a kind of projection of your own inner self

Ailoha easily optimises relationships into a more fine-grained social capital management; even if they don't identify as a CRM, this user profile means their everyday usage scenarios lean toward scenarios of gaining benefit through relationships


<!--memo:720840052928-->
### ailoha really can capture the user's mind

> 2026-08-22 13:15:49

The essence of this is that when a specific scenario shows up, the user naturally thinks of you, and expects you to bring a clear result

Since there is such a thing as user mindshare, it naturally has layers

The category describes what it actually is, the scenario describes when I'll think of it, the result is what actually gets better after using it, and the identity describes what kind of person using it says I am

The user's transformation is product value

The user's self-identity is user value

Just like Jike's community — Jike's earliest users deliberately cultivated a certain feeling

the sense of identity among users, the time spent using it, the posts published, and so on


<!--memo:ad2f09b71fbd-->
### Allalong is a very good pronoun

> 2026-08-22 13:38:32

ailoha brings the cost of understanding between people down from $2000 an hour to -

but allalong does the same for understanding yourself


<!--memo:ee986e3cc93a-->
### One ability that needs extra cultivation is expressiveness

> 2026-08-22 15:08:53

I feel my expressiveness right now is lacking


<!--memo:fa262f8fb820-->
### Ailoha isn't about helping you manage relationships

> 2026-08-22 15:30:11

Aloha isn't the name of "Hawaii", it's a Hawaiian word that carries meanings of love, affection, goodwill, compassion and greeting

It's about understanding, over the course of your life, 「how you become you」


<!--memo:9edb27812a8b-->
### On the hardware questions

> 2026-08-22 16:55:21

P0, the voice input problem, the output problem

P0, Bluetooth

tap together, the speaker approach

long battery life

control chip

network module,

P0 the storage problem

voice,

the sync method,

basic sensors,

camera, 720


<!--memo:864853e4ef9e-->
### There should also be another good part, that one and then loading at the fastest speed

> 2026-08-22 18:57:38

There should also be another good part, that one and then loading into the current session at the fastest speed — I find that quite interesting

But at that point it still has requirements for notes recall or Memory recall.


<!--memo:4412f1a19880-->
### Facing death, what is worth believing in

> 2026-08-23 11:42:17

When you can't control the outcome, how do you bear it?

After doing something wrong, can you be forgiven?

When you have no productive value, are you still worth being loved?

Why stay loyal to another person over the long term?

Why are truth, goodness and humanity itself worth pursuing?

Kiwi also needs understanding and explanation

Always standing outside the system, understanding it, taking it apart, evaluating it, yet finding it very hard to allow some relationship, tradition or community to shape her in turn

But only when a person stops being an observer at certain moments and becomes a participant can they possibly find belonging


<!--memo:1ad73e97a2dd-->
### You demand certainty, and naturally you demand certainty from the person you're chatting with

> 2026-08-23 14:42:12

This is something I definitely have to change about myself

Also, my ability to organise language and output it matters a lot too

I hope the little duck can help me fulfil this wish


<!--memo:b0ef8313c300-->
### Without a felt sense, not understanding the whole chain makes you feel really awful

> 2026-08-23 15:33:32

Without a felt sense, not understanding the whole chain makes you feel really awful


<!--memo:149890155afb-->
### You could try building out a basic product, and then let

> 2026-08-23 16:24:34

You could try building out a basic product, and then let Alloha plug into it and see

It should produce a decent result


<!--memo:6c5e940f9196-->
### The merge contact process

> 2026-08-23 16:41:33

I think it already constrains a lot of people's experience of using it

You don't necessarily need that many contacts; contacts are nothing more than a kind of mapping relationship inside your mind


<!--memo:27d5056bebe3-->
### I found there's still one problem

> 2026-08-24 13:53:54

At the beginning the screenshot was of A

Afterwards I wanted ailoha, when I asked, to explore this person's information across the various platforms

Then I found ailoha was researching contact B, who had appeared before, rather than exploring the current person's information ....

---

After the screenshot is uploaded, the system records this person's information and the screenshot information

the model reads through the whole history itself, then guesses who this person is

there are two kinds of person present in the context at the same time

one is the subject of the screenshot, one is the historical real person


<!--memo:b3ae9536716b-->
### First round:

> 2026-08-24 14:00:33

Image → correctly reads the unknown chat partner in the screenshot

Memory → simultaneously brings in a historical contact

Assistant → when answering, mentions some historical real person again

Second round:

The user says "explore this person"

→ the system didn't record "this person = the subject of the first-round screenshot"

→ the model parsed "this person" as the historical real person mentioned in the previous round

→ Social Tools starts querying that historical real person


<!--memo:fdb79d2991a7-->
### For some reason the Mini mac can't connect any more

> 2026-08-24 16:25:18

I asked codex to use clash verge to configure a new profile

and then, partway through, it went quiet


<!--memo:1ed2272d8ccc-->
### Focus on Jike

> 2026-08-25 09:05:21

how to post, how to read, how to pull it down


<!--memo:74eb05854372-->
### Finding a problem, defining a problem and judging a problem

> 2026-08-25 13:30:50

Finding a problem, defining a problem and judging a problem


<!--memo:1133ad88c67b-->
### If evaluation can be done with a program, of course that's better

> 2026-08-25 17:01:50

but a lot of the time it can't be done with a program, and is often unstructured and multi-field

you need to build a fact ledger for each image

recording some key facts


<!--memo:ece4e4962eca-->
### Some thoughts on Suggestions

> 2026-08-26 10:54:35

only a deep analysis flow can produce selectOptions

The Suggestion in the System currently has some extra constraint wording


<!--memo:8ebd4c165d15-->
### The splash-screen brand launch animation is necessary, it covers the initial startup time

> 2026-08-26 11:14:51

Brand visuals are necessary, but the display time isn't deliberately set; the dwell time mainly depends on the real cold-start duration

The first brand display is still kept in full, but RootPage will prepare in parallel underneath


<!--memo:951837c608ca-->
### About the navigation bar — it seems the current navigation bar really won't be used

> 2026-08-26 13:36:27

About the navigation bar — it seems the current navigation bar really won't be used


<!--memo:969a6d687b69-->
### The release part needs extra attention too

> 2026-08-26 15:09:49

People's attention is limited, so how to explain the update in the cutest, most convenient, most human way, and explain it from the user's perspective, matters a lot


<!--memo:6491ac542bdc-->
### And how the "what to test" description is generated

> 2026-08-26 15:20:19

The release part needs extra attention too

People's attention is limited, so how to explain the update in the cutest, most convenient, most human way, and explain it from the user's perspective, matters a lot


<!--memo:e4fc1c8c6c23-->
### Fix errors first

> 2026-08-26 15:45:27

Fix errors first


<!--memo:7c2bd9ead8d7-->
### Judge is very well suited to analysis and evaluation

> 2026-08-27 11:00:22

Which one is better, better along which dimensions, whether there's obvious regression

What you end up with is a new version with a high win rate — the win rate across each experience dimension


<!--memo:9e83c4adda6b-->
### Animation is actually a pretty hypocritical thing

> 2026-08-27 11:50:18

I believe that for any user

If an animation clearly has no actual meaning, and exists only to show off your own brand

Then I think that's a kind of product self-indulgence, and a deception of the user


<!--memo:209da461da24-->
### Slower, but a bit more accurate

> 2026-08-27 14:10:27

The feeling our company gives me is that everyone seems to be rushing around, there's a huge pile of plans, things get done fast and well, everyone is elite, a genius

Everyone is running at high speed, but I don't know where this machine is actually headed

What important problem is everyone solving together??? Is that important thing really important??? Every day we do a whole series of important things around these problems — are these things important???

Is the given problem really worth solving, is the user experience really better, has the product's own operation, the advantage of compounding, really been established


<!--memo:2adadb308dbf-->
### kiwi to me:

> 2026-08-27 14:11:19

Questions me harder → I feel defined and go on the defensive → I express and act more tensely → she gets more unclear signals → keeps intensifying the questioning


<!--memo:f01dc8deb3da-->
### The Fat environment seems to exit after a while

> 2026-08-27 14:50:37

Onboarding — from my own hands-on experience, every single time I go in


<!--memo:16d910e5f9d7-->
### Control the variables as much as possible during a release

> 2026-08-28 10:04:42

Control the variables as much as possible during a release, so that when problems appear things stay controllable

Controlling variables is a very good habit


<!--memo:822234c48401-->
### A CRM system

> 2026-08-28 11:20:31

But it should allow for a person who changes

CRM is just a very good carrier

CRM itself is about tags that serve people

Serving people to update the corresponding tags


<!--memo:7f57ea4d5d82-->
### Observing employees, it seems like no problem, I'm not averse to seeing how they work

> 2026-08-28 12:41:02

But it's too invasive ....


<!--memo:fa351735de2d-->
### Shadow Lab can answer

> 2026-08-28 13:11:32

Shadow Lab can answer whether the candidate is better than the baseline


<!--memo:6cdfe7c8f13e-->
### The basic unit of a Trial is a certain fixed Case

> 2026-08-28 15:48:13

The basic unit of a Trial is a certain fixed Case: under a fixed configuration and an independent initial environment, one complete attempt (attempt) from start to termination


<!--memo:7eee5787aa52-->
### Then for Manus, context

> 2026-08-28 16:30:00

Then for Manus, context is a runtime resource


<!--memo:36ecff0e011c-->
### Precision labeling, the 2meet scenario

> 2026-08-28 19:30:05

The scenarios after filtering 2meet serve:

Why 2Meet often has false positives

Which expressions get mistaken as a meeting

Whether the rules for participants, time status and pleasantries are effective

But it can't answer:

How many of the real images should generate a 2meet

How many 2meets the system missed

Overall accuracy


<!--memo:0e754b71740d-->
### How FP / FN is essentially calculated

> 2026-08-28 21:08:46

persision is precision

Recall is recall

Positive is the positive class

Negative is the negative class

TP (True Positive): the model says yes, and there actually is

FP (False Positive): the model says yes, but there actually isn't

FN (False Negative): the model says no, but there actually is

TN (True Negative): the model says no, and there actually isn't

Positive (positive class): this image should generate a 2Meet

Negative (negative class): this image shouldn't generate a 2Meet


<!--memo:d7f19a8dd724-->
### Precision/Recall

> 2026-08-28 22:24:54

Precision/Recall tells you how much you got wrong; FP/FN cause classification tells you why you got it wrong, and which judgment step should be fixed


<!--memo:6d849c295195-->
### Without judgment, then work harder, study harder, cultivate judgment

> 2026-08-29 00:33:02

Know what good looks like, and what bad looks like

Know what good taste looks like


<!--memo:dfbcb5aa40e1-->
### Dig deep into the essence, form judgment

> 2026-08-29 01:30:02

A real understanding and judgment of the world


<!--memo:53db63fe04cb-->
### My attitude toward travel photos: behavioral evidence of a value shift

> 2026-08-29 14:16:12

Scarcity changed attention

Before, when life felt abundant, it was easy to see recording as performance

When time and the feeling of life became scarce, photos revealed another kind of value


<!--memo:ccc69cd7a0d7-->
### Everyone has behavioral patterns

> 2026-08-29 14:17:39

But not everyone has high cross-dimensional consistency

Some people have stable habits

Some people are habitually consistent within their role

To see whether someone's choices can be continuously predicted by the same principle, look at three things

What they sacrifice in a conflict, where they invest resources long term, and whether they update when new evidence appears


<!--memo:9143f79c6f5c-->
### Scoring in annotation is a meaningless thing

> 2026-08-30 21:52:48

Because the act of setting up a score is itself very vague

What exactly does 1 point have less of than 2 points

So it's better to use some orthogonal dimensions


<!--memo:79a4b7f3cb2f-->
### Solving the wrong problem is a serious problem

> 2026-08-31 09:03:14

And actually it also helps us distinguish performance problems from deeper problems

Making clear what counts as done and what doesn't count as done


<!--memo:b69c8ff9e42f-->
### thinking's response is too slow, users can't see the state

> 2026-08-31 10:18:43

thinking's response is too slow, users can't see the state, and they're not sure whether the task is progressing normally

Is there still some plan for the speed of this part of the thinking


<!--memo:d228e352970c-->
### About distinguishing Calendar and 2Meet

> 2026-08-31 11:45:50

A very important point is that Calendar can be distinguished down to a specific time and date

At that point, even if the time is sometimes vague and not that definite, it can still be planned to a day

But 2Meet has no specific meeting date, while having the intention of meeting offline

After an update it can be upgraded to a Calendar

The location can be sent back to the user for confirmation and correction

Because in practice there's a lot of vague stuff during labeling; going back to the product-angle understanding, the technical-angle understanding and the user-angle understanding, the annotation can still be completed

Structurally, actually Calendar should ideally be a complete structure

What Calendar answers is: when must I do what?

What 2Meet answers is: next time I'm back in some place, who do I want to see, and to do what?


<!--memo:4dab9bfdb988-->
### 2Meet's confirmation is lighter, Calendar is a strong confirmation

> 2026-08-31 15:40:24

With a complete time, it generally belongs to Calendar


<!--memo:c9ae31156323-->
### There's a long-distance scenario, we have a young guy

> 2026-08-31 16:01:24

There's a long-distance scenario, we have a young guy, his only contact is a girl, and they're in different places

And what he asks about most is what that girl is actually thinking🐶

What is he/she actually thinking?


<!--memo:d8e25d533212-->
### Losing information is a very painful thing

> 2026-08-31 17:40:21

Does the product have some better solutions for this part

My understanding is that when users upload their own information, they definitely want to be remembered


<!--memo:d4608d40619c-->
### During annotation, I think the hardest thing is defining the product rules

> 2026-08-31 17:43:58

During annotation, I think the hardest thing is that the definition of the product rules isn't clear enough

For example, what's the relationship between Calendar and 2Meet

How to define time

It requires combining the ability to abstract and the ability to make concrete

2Meet's product definition is: with a certain person, no specific time, but a clear intention to meet


<!--memo:c5d071643f5f-->
### Learn to find the holes in the product rules themselves

> 2026-08-31 17:56:16

Can you create a Calendar if you only know the date

Can you create an all-day event if the specific time is missing

Does a missing location affect creation — a whole series of questions

A meet mentioned in the conversation and the product's real actions are two different things

"Let's hang out sometime when we're free" is purely a pleasantry, it shouldn't be generated

"I want to treat you to a meal" is also one-sided intent, it may not necessarily be generated either

"See you Saturday" "ok" is a commitment from both sides, actionable

"Let's talk in person next time, but we'll set the time later" is a 2Meet

"We met last month" is historical information, generate nothing


<!--memo:24fcdfd7481f-->
### Annotation isn't a simple thing

> 2026-08-31 18:09:44

Understanding the task background and the rubric is very important

And then how you understand it is also very important


<!--memo:1f95f514f214-->
### When you hit unclear product semantics during labeling, don't force a label

> 2026-08-31 18:20:37

When you hit unclear product semantics during labeling, don't force a label; instead mark it as disputed or Unknown and send it to product adjudication. There may be several kinds of contract gaps:

The product concept hasn't been written as an executable rule. For example, does "wanting to meet" require an explicit commitment from both sides, or does a polite expression count too

Insufficient original evidence. For example, can't confirm whether Kiwi is a participant, whether the exchange is online or offline, whether it's already scheduled.

Multiple stages get mixed together: having understood it, proposing a suggestion, the user confirming, actually writing it into Calendar — these are four different states.

The label granularity is too coarse to represent "needs clarification", "no action needed", or multiple equally reasonable outcomes

The product team itself hasn't reached a stable consensus yet. At this point the annotation disagreement is actually discovering the product standard, not an annotation error

At this point I think the right approach is to freeze the Case, not guess the answer, and record separately:

fact: what explicitly appears in the screenshot

inference: how the annotator understands it

product question: which product rule hasn't been confirmed

Write a minimal adjudication question, for example "the two sides say 'let's meet next time when there's a chance' but don't explicitly commit — should this go to 2Meet, or none/clarify?"

Hand it to a named product/domain authority to decide; high-risk-side-effect Cases get reviewed again by an independent Reviewer

Write the adjudication as "rule + positive example + negative example + conditions that would overturn it", then re-annotate all affected Cases


<!--memo:da96ef1275e6-->
### notes' product definition is: about this person and this relationship

> 2026-08-31 18:32:58

notes' product definition is: information about this person and this relationship that's worth remembering in the future

It can be a user-readable memory stream at the contact dimension

The other person's background, preferences, communication style

The user's or a third party's evaluation of them, but the source must be preserved

Relationship status, opportunity clues

Notes is at the contact dimension, remembering the background of intentions and relationship facts, but it doesn't carry the intention's lifecycle


<!--memo:9cc8d99b8923-->
### Anchoring to one sentence

> 2026-08-31 18:50:28

A very specific sentence.

So specific that the matching group falls for it at a glance.

What kind of group, what kind of relationship.


<!--memo:6988f1308408-->
### I laughed

> 2026-08-31 22:49:28

When a model performs badly on a certain question,

many people's first reaction is: something must be wrong with the model?


## 3. Product, Engineering and Open Source

*96 entries*

<!--memo:e2e3022c0cec-->
### Pick only one direction and run it for 90 days straight

> 2026-08-09 20:13:41

Pick only one direction and run it for 90 days straight; before you start, write down by hand three concrete numbers, a budget ceiling and exit conditions. During that stretch, don't open new projects, don't build the automation factory ahead of time, and every week you have to get one kind of external evidence: a payment, a rejection, a repeat purchase or churn


<!--memo:ab432e1a32c4-->
### ailoha on iOS

> 2026-08-11 00:42:50

#ailoha are there some really good suggestions and insights about testing iOS


<!--memo:6fb3afc19c9d-->
### Android's current design is mainly built on a kind of understanding of

> 2026-08-11 11:31:36

Android's current design is mainly built on a kind of understanding of Android

rather than being done the RN way


<!--memo:8972999e59d5-->
### Understanding feel, four dimensions:

> 2026-08-11 16:02:38

Touch-to-Photon Latency

Frame Hitches/Jank

Spring Physics & Animation Curves

Haptic Sync

In the past, "feel" was considered a purely subjective art, one that had to rely on top UX designers and engineers repeatedly tweaking it by hand. But in today's frontier AI Agent and automated engineering systems, "feel" has been highly deconstructed into objective physical metrics that can be measured and computed


<!--memo:cfb040d89418-->
### iOS latency, plus RunLoop design, AI

> 2026-08-11 18:12:21

iOS latency, plus RunLoop design, the loop design of an AI Agent Harness

Deep thinking and analysis of the architecture diagram — are there some design logics worth exploring


<!--memo:991e84fbea1f-->
### /goal Deeply analyse and organise what big stages and modules the current project has

> 2026-08-11 20:02:24

and then, with completing one linear task as the goal, design the whole newcomer onboarding guide, plus the teaching and training through the whole process of getting that chain done, a project that makes it easy for users to understand and get started


<!--memo:6cb22640f361-->
### Right, I think they're quite right. Most of the time you learn by doing

> 2026-08-11 20:23:29

Right, I think they're quite right. Most of the time you actually learn by doing — most of the time there's no way to learn something completely first and then go do it. Startups don't seem to have the time or the energy for that either. So the thing you can do is get up to speed fast. So a lot of the questions they raised are basically designed around you, around getting you up to speed quickly. I finally understand


<!--memo:470c752e8295-->
### Including the design logic of the whole iOS frontend

> 2026-08-11 21:25:35

Including the design logic of the whole iOS frontend. I need you to deeply discuss all the current structural and architectural problems — first deeply analyse the current frontend code architecture and clarify the granularity question, and together with the UI and real E2E tests, deeply clarify the architecture design problems


<!--memo:8f6b18fa177d-->
### /goal Deep research — I want you to make full use of this project's

> 2026-08-11 22:02:10

/goal Deep research. I hope you can make full use of all of this project's tools and all the docs and descriptions in the current repo. Then I hope you can design a whole automation system for the frontend, and I hope it can cover Hernias agent testing and fully bring out the testing capability

The first thing I hope you do is investigate — first go research some of the current deployment architecture. Then I hope you can go deep; I'll give you some design docs, then you evaluate them deeply, and you also search by yourself for some really good, really frontier AI-agent-native teams, their engineering methods, and their overall experiments with testing and CICD. I hope you can combine that elegantly with the current workflow

Then give deep improvement suggestions, a design doc, including the architecture diagrams for the current and the improved deployment. The deployment architecture diagram is best designed at the current scale, so it can flexibly expand


<!--memo:64f08055b2b1-->
### Then I hope you give some localised research and analysis

> 2026-08-11 23:03:50

Then I hope you give some localised research and analysis. Tomorrow this plan is mainly proposing some basic information sources for Fa Jinyou, and in the end I hope I can hand it to my own colleagues to read. The reading carrier mainly targets testing, and it connects with CCD as well as user scenarios, plus the real feel of the experience. Not to say the logic is simple — for now the whole get workload hasn't changed; integrate these teaching diagrams into one big web page, and then organise this content in along with them. There are some very clear jobs, ones that won't change much later, recognise them as much as possible. It's not Dragon Boat Festival yet; his testing pyramid is really worth learning from: static first, then the run frequency is at the PR level, every PR, and every P is also every pi, and then for the performance logic, including the tests, it's relatively simple too, and then finally non-van't, because this is still a small back, every ticket, and then the whole-bright one every night is every big version, for instance worked to death, and then finally it's a kind of album nature; he's also a personnel method, I definitely won't set it very right, but for the final page specifically it maybe still needs to be quite clear and easy to understand — just learn the concrete plan and arrange the whole workflow, because it isn't only for myself to read, it's for other colleagues to read. Right now the best thing is to simply optimise some of the current workflows, including its boring transfer, what kind of deep mindset comes out in the next cycle, and then send it in web form for a friend to look at. This cross-repo thing at the beginning, because it involves three repos right? One is the frontend, and one is the backend, and also A key, then A key maybe re-emphasise it, so relatively speaking it can be put into phase three as much as possible, and then once it's fully installed, relatively speaking it can also do some stage-by-stage setup for the third one — the frontend part is completely fine, it can all be planned, and then set it as the highest limit


<!--memo:a8cd22f1688a-->
### Refactor

> 2026-08-12 10:52:25

Sheng Chao

Jin Gan

the design mockups — right down to the granularity question, which needs deep discussion and design


<!--memo:6db1eac6ae02-->
### Taking the SRE situation into account

> 2026-08-12 11:50:20

The right evaluation logic should make sure some types can all be handled normally; these problems can be designed around some big modules, for example by contact


<!--memo:2f593d15619e-->
### I'm wondering whether some skills already exist, say for the current repo

> 2026-08-12 11:53:34

I'm wondering whether some skills already exist, say for the current repo. Every time I have you write a research doc, right now it's basically web-page driven, with the web page as the input entry point. And at this point I really want there to be some good designs. For instance, right now the web page, because it's essentially still a local static web page — but I actually think a lot of these designs will need to be published later. So at that point I want a skill that can complete the publishing logic. It shouldn't only be able to map this directory plus the corresponding sibling directories and subdirectories out; basically I hope everything external can access all the assets in this web page. So relatively speaking, I hope you make a skill like that, and can do this kind of conversion and publishing


<!--memo:b09eedf88a76-->
### Help me research what others have done on linear

> 2026-08-12 11:57:50

Help me research some of the similar tasks other people have done on linear, and their solutions, including linking linear and GitHub. I want to deeply organise all of these but(s), and extract some general logic and capabilities


<!--memo:1ffbb674e85f-->
### Ugh, I got knocked down again today, feels like I got thoroughly scolded today

> 2026-08-12 22:28:24

Ugh, I got knocked down again today, feels like I got thoroughly scolded today. Because I feel I'm still not enough, I don't understand engineering ability, I don't have that engineering ability — because engineering ability is essentially the ability to find a problem, plus a whole set of abilities for locating it and solving it. But now I find I don't come close to any of them, so it probably has a lot to do with my old indie-development habits. With indie development, relatively speaking, a lot of granularity problems just get handed straight to AI to solve, and you don't think about why it was designed that way. But I've found that this ability — systematic thinking ability, and engineering ability — is an especially important ability in the AI era

Of course I can't rule out that I might have some other abilities, like meta-awareness, and some other ways of thinking. But I don't think you can deny that right now engineering ability is still something I badly lack, and I plan to make it up tonight.

Because actually, earlier, combining Heihei's ability system — I think Heihei uses first principles to analyse everything in meticulous detail, and then on that basis deeply thinks about how to optimise and improve that part. So I think his frontend could work as a similar kind of design system, and after I dig deep into it, I take one module, walk along the module, then dig deep into the whole category, and then analyse inside each category whether the design is reasonable. Have a very essential judgement about it, and then choose some better designs and optimise away the existing design system. But I think there's one very important point in this part: you know why it's done this way. Because once you know why it can't be done that way, once you know the principle, then you can evaluate it. And the evaluation can be graded too — from the lowest level e2e, then to a very fine granularity, then to a relatively coarse granularity. I think there can be some good design systems to solve this problem. So tonight I plan to, relatively speaking, solve some problems, and dig deep into what these problem-solving steps actually look like, and how to review whether this process gets a good result. And which things need my own judgement, and which things can be left to AI to substitute for me. And how to design this flow


<!--memo:f93dcd13cdd6-->
### white has helped me a lot on the engineering side

> 2026-08-13 09:14:27

white has helped me a lot on the engineering side


<!--memo:cea85636a201-->
### white also hopes I won't lose my taste for technology and engineering granularity

> 2026-08-13 13:42:38

white also hopes I won't lose my taste for technology and engineering granularity

and a whole method for analysing problems and granularity — very inspiring ,,,


<!--memo:279604b747e0-->
### Granularity has come up so many times

> 2026-08-13 14:03:17

I feel like this should be called engineering cognition granularity

Not enough — test and describe more, and combining all the content you should have, extract a series of granularities, then analyse the earlier problems, state the problem and the context clearly, and be able to locate this problem's engineering cognition granularity

so that I can supplement the corresponding cognitive understanding for this problem, and build the basic taste needed for judgement

and state clearly how to change it, why change it that way, and what good test and evaluation criteria there are after the change


<!--memo:d195b459ba83-->
### The core of engineering judgement: you don't necessarily need time to accumulate it

> 2026-08-13 14:23:40 · `#领域/软件工程`

But you can also build basic judgement quickly. The key is to separate three things:

Measure first, attribute second, design third

First understand: make sure these categories aren't mutually exclusive — one page stutter can have many causes. Break the granularity down far enough, distinguish the phenomenon. There are many ways to test this phenomenon, you can think them through one by one, and there's a set of AI methods to analyse and test out the cause

Then attribute: judge what the essence of this problem is, and how to judge this problem

Finally design: there's a distance from design to implementation. The design AI gives needs review, analysis and judgement; you also need to understand it deeply to make sure there's no problem. Invariants are especially important: AI can generate a large amount of correct local code while breaking global behaviour. An engineer needs to be extremely clear about which behaviours absolutely must not change, who can own state, and who can modify state

Define the invariants

Set the change boundaries

Design verification signals

Have AI implement it in small tested steps

Correct it with test and performance data

Ship to production


<!--memo:a80ffd059f14-->
### The precondition for holding the invariants is engineering cognition at enough granularity

> 2026-08-13 14:26:14

You don't need to understand the whole system first; you need to understand deeply enough "the causal chain, the boundaries and the state lifecycle of this change"

The whole system: broad and shallow

The related chain: narrow and deep

Cross-layer boundaries: extremely precise


<!--memo:dbb487452e9a-->
### How to judge that you've broken it down to the right level

> 2026-08-13 14:36:30

white's method is knowing both the what and the why

but it's still not accurate. Engineering is essentially managing the relationships between people, code and AI

the cognitive cost between people, and the maintenance cost of code

the cognitive cost between people is essentially still about aligning engineering cognition granularity

if a problem is too complex, AI can write it out but the future maintenance cost is very high

for an engineer, having some level of cognition granularity is very important

with engineering methods this cognition granularity is pinned down to the invariants and located down to the root cause; there are some better research methods that can describe it clearly


<!--memo:c90fce6754cc-->
### It suddenly occurred to me

> 2026-08-13 14:54:06

Even in the engineering domain, you have to use your own engineering advantages

and then get a series of feedback and cognition

and use that feedback and cognition to supplement yourself


<!--memo:0ddb83a7b705-->
### Thinking about introducing a component, 1-10

> 2026-08-13 17:53:48

A new component has to come back to business value: does it create some new value, plus the component's own architecture design and the corresponding risk

compared with the previous approach, are there a series of problems


<!--memo:f72fe5b9e3d9-->
### From what I've observed, I feel there are a lot of problems

> 2026-08-13 21:47:23

From what I've observed, I feel there are a lot of problems, and I stepped into a lot of pits. Because at the beginning I was still following my own old design and development habits, which in practice are very different from the team's own granularity

And actually the quality and acceptance standards on both sides are completely different too

So relatively speaking, early on I brought a lot of past experience into doing a project like this, stepped into a lot of pits, and found


<!--memo:7948ffe0b500-->
### But I think if you can define this problem very clearly and judge it accurately

> 2026-08-13 21:50:10

But I think if you have a very clear definition and accurate judgement of this problem, you should know whether it has any constraining boundaries, which link it's currently thinking about, and what user scenarios it faces. Then think around that: how the product's boundary should be designed, how its code quality should be evaluated, and how to verify it


<!--memo:c0acb9ec506a-->
### Cancel the essence of the first question and its corresponding new description

> 2026-08-13 21:54:54

As for search, I think its biggest problem is that right now a lot of words can't be searched out clearly. So the first thing to do should be requirements: sorting out requirements, deeply analysing requirements. For example with search, its biggest problem right now is a series of inaccurate search results. For instance this person, sometimes in the domain field, if you search a certain way, they rank higher — that depends on how LinkedIn currently searches, and also he now searches a lot of people, aggregating these people into the current project

So the main thing is, when you first learn about a problem you should abstract it and solve it in stages; there must be a series of methods

You can have it go do deep research from the start on the problems that come up in this work, then state how it's currently designed, and then have it write the corresponding implementation plan

Then go deep and research how some other vendors design it, and what their design plans are

Then analyse whether there might be any improvements

And finally analyse how each of these improvements would be made. Would they introduce some new components between them? I don't want to introduce this new component — what's the benefit of introducing it?


<!--memo:efceccf413db-->
### /goal Based on the above task, deeply analyse and execute

> 2026-08-14 01:07:47

/goal Based on the above task, deeply analyse and execute; converge as much as possible, judge more about whether something is worth changing and whether it's valuable to change, then carry out the task against the verification criteria, test-driven, and make sure all the tests pass

After that, do a deep review and improvement

And finally, deeply combine the changes and all the designs touched on above to write a doc. This doc helps me publish it to other people for review tomorrow (in practice it can serve as the design doc before writing code, only aimed at colleagues). The other doc is one that supplements this doc with some deeper knowledge, taste and judgement. Every design, every new design, or every new adjustment should be analysed from first principles: why is there a problem, and how to change it, why change it this way, and after the change how the effect is measured so there's no problem (anyway, it's about showing the high level of an AI-builder-native)


<!--memo:b54b2c0cc84f-->
### while has a lot of really good engineering methods

> 2026-08-14 11:51:05

knowing what granularity to drill into when you hit a problem

and at that granularity, how to make technical judgements and analyses


<!--memo:f7ee2ce9ea98-->
### A/B SDK

> 2026-08-14 15:34:14

This actually does seem quite interesting

consider the real evaluation feedback from the user's usage to choose the right SDK


<!--memo:8168a68c1bbb-->
### The right steps

> 2026-08-14 17:29:37

First clarify the problem, and complete a minimal-unit PR

No more design than that

No more error discoveries than that

put them all in other PRs

the extra comparisons go in the design part


<!--memo:21a0ee0e5bec-->
### A new teammate must get the first PR working and get feedback early

> 2026-08-14 18:01:20

Think about this chain, find the problems, optimise the chain

build up the understanding and analysis of ailoha as a whole


<!--memo:3d5d17e5ecf8-->
### APIs can be abstracted into levels too

> 2026-08-14 18:04:05

you can abstract to the right granularity and then execute


<!--memo:77bded5d8ba4-->
### kiwi says she needs an upper-level explanatory system

> 2026-08-16 12:45:53 · `#领域/软件工程`

kiwi says she needs an upper-level explanatory system, so that the goals, pain, choices and efforts underneath can all connect to each other

It could be called a worldview, a life motif, a meta-narrative, or life axioms; at minimum it answers the following questions:

What is the world to me?

What is worth my serious investment?

What do success and failure mean, and what do they not mean?

Why does this trivial thing today belong to the life I want to live?

So the core is this thing that drives the consistency of everything underneath:

the top-level explanation

↓

what I want to become, how I want to live

↓

what I'm betting on at this stage

↓

why this project is worth doing

↓

which action to complete today

If all of these are scattered, I think it can become isolated labour, and then there's a mismatch between the sense of meaning and the pain

Life proposition: the problem I keep running into over and over in my life

Meta-narrative: what story do you use to explain your life experience as a whole

Life axiom: what non-retreatable principle do you make judgements and choices on the basis of

The motif is something like the basic themes I keep coming back to over a lifetime: we're always dealing with the same problem — the problem of freedom, of belonging, the problem of truth and of spicy mustard, the problem of finitude and death

As a person grows, it's handled more and more maturely

Meta-narrative means what big story I use to explain this life

Humanity will keep progressing through reason

History will ultimately move toward liberation

Science can solve humanity's problems

Suffering is part of the process of redemption

Life axioms are the premises I start from that no longer need proof

An axiom in maths is an initial premise a system accepts. A life axiom can be understood as: when reasons keep being asked backwards, the principle you're finally willing to stand on

The difference between a life axiom and an ordinary opinion is that it really takes part in difficult choices


<!--memo:317b3ea0dfd4-->
### Sometimes seeing uncles, aunts, grandpas and grandmas travelling alone to see the world

> 2026-08-16 12:54:44 · `#领域/软件工程`

Sometimes when I see some uncles and aunts, grandpas and grandmas travelling alone to see the world, it's really heart-wrenching

I feel like they look so lonely, wanting to go see the world — but this heartache is something I radiate outward from inside myself after seeing this phenomenon. That's me. Of course this radiation may be a projection of my own inner world, for example the fear that I'm getting old, or that I'm missing out on life, projected onto them. But I think more than that, it really is pushing me back on myself, making me see myself clearly — it forces me to ask what kind of life I want

A person pays their life out to safety, respectability, rules, other people's expectations and all kinds of proxy goals; and when they still want to see the world, they find that time, body, relationships and the structure of their life have already lost the flexibility to choose again. How sad a thing that is

Life can't survive only functionally; it must continually contain the parts that are chosen by yourself and attended by you in person

Keeping your options open will quietly turn into making no choice


<!--memo:a0d86f6f945c-->
### Any single action seems to carry a cognitive cost for the user

> 2026-08-16 15:55:45

I feel like any single action seems to carry a cognitive cost for the user. For example that merge action just now, for me I felt totally baffled about what the action was meant to do. So I think if we're talking about user value, it's more about standing on the user's own side: whether any given action brings them some very big feedback, that should be user value

What should be distinguished is whether the action itself is meaningful. Take the Merge action — it may be meaningful for product design, but for users, for a lot of users, it's something that really adds to their cognitive burden.


<!--memo:84ca32477179-->
### ailoha/test Ailoha write-channel test —

> 2026-08-16 17:19:47

#ailoha/test Ailoha write-channel test — if you're seeing this, it means the connection succeeded.


<!--memo:63c06ed66023-->
### Meta-skill generation mechanism: automating from case to skill

> 2026-08-16 17:24:35 · `#方法论/元skill` `#架构思维`

If the bottleneck in aligning granularity is at the skill layer, then the real architecture-level question is: can you build a "skill that generates skills"?

That is: instead of manually writing every alignment rule, design a mechanism that lets new skill/prompt templates automatically emerge from the accumulation of cases.

This might be the entry point for finding my place in the team — not doing more execution, but building the infrastructure behind execution.

Analogy: not writing more prompts, but writing the meta-prompt that generates prompts.


<!--memo:2a5e146fc091-->
### The innovation token framework (Choose Boring

> 2026-08-16 17:24:44 · `#方法论/创新代币` `#技术选型`

The innovation token framework (Choose Boring Technology) re-examined in the AI era

Dan McKinley's core argument: every team has a limited innovation budget, and the hidden operational cost of tech-stack diversity eats up the real space for business innovation. Use boring but reliable technology, and spend your innovation tokens on genuine differentiation.

The new risk in the AI era: AI-generated code makes you think you understand a tech stack, but it actually just conceals that you don't — the operational cost of false confidence is higher than choosing the wrong technology.

Evidence: DSH (Cordis microkernel) burned its innovation tokens on the underlying architecture (reversible effects, hot plug/unplug of plugins), but the agent's actual working ability didn't improve, and the competitiveness users perceive is weaker than Codex/Claude Code. The innovation tokens were allocated in the wrong place.

Key judgement: innovation tokens should be spent closest to user value, not closest to technical excitement.


<!--memo:d13acd5f48b0-->
### The main places it's displayed:

> 2026-08-17 17:34:23

case debug most of the time

dataset management; the goal data is the core asset

Metrics Dashboard is for looking at trends


<!--memo:18e5567ab900-->
### You could summarise it like this, in plain speech:

> 2026-08-18 10:11:23

"This time we tested 6 people: Jin Gan, Wang Rui, Xi Xiangyu, Chen Bin, Lei Shaoman and Shi Hongbin. Among them Jin Gan and Wang Rui have manually confirmed LinkedIn; Xi Xiangyu is used to test whether it mistakes someone with the same name; the other three mainly check the search chain and the contact card."

The old version failed not because it didn't search the name, but because the way it searched was too rigid:

Chinese names were split apart and searched with strictSearch=true, and it mainly looked at the very few results at the front.

English aliases weren't carried in stably, for example Wang Rui's Ray / Rui Wang.

Soft labels in the screenshot were mistakenly treated as a confirmed company, which instead filtered out the correct candidate.

Even when Serp found the correct LinkedIn URL, it wasn't stably fed back into the candidate pool.

When there were only weak candidates, the system easily treated it as "not found" and threw it away.

The Agent would keep searching in a scattered way, so the contact card appeared very slowly.

The new version mainly did four things:

Names, English aliases, companies and screenshot soft clues are handled separately; an unconfirmed company is no longer used as a hard filter condition.

When Apify only has weak candidates, it automatically does one targeted LinkedIn search.

After finding a LinkedIn URL, it feeds it straight back to Apify to scrape the specific profile, no longer relying on the Agent to remember to feed it back.

During research it first shows a basic contact card and fills in material later, while preventing duplicate cards.

The difference in effect is:

Recall@3 for the correct identity at the Provider layer went from 0/2 to 1/2.

Alias usage went from 0/3 to 3/3.

The URL-targeted feedback test was 4/4 successful.

Observable Apify cost dropped from $0.672 to $0.304.

The correct URL feedback path for Jin Gan and Wang Rui is already protected by code tests.

Xi Xiangyu's wrong profile won't be marked as a strong match, but in the old real test it still ranked first among weak candidates; the ranking quality isn't fully solved yet.

But to be honest: the last real six-person E2E was run before the final few rounds of fixes. At that point the Agent's final recall was still 0/2, and although the contact cards were all generated in the end (6/6), only 3/6 appeared within 360 seconds.

So the merge conclusion is: the approach and the code are worth merging, but you should first finish fixing the current CI, then rerun a six-person Smoke with the final commit. Once it passes, it can be merged as an incremental version that "clearly improves recall and UI feedback" — it can't be described as "person recall is completely solved".


<!--memo:c2a2af00ed09-->
### But right now Jin Gan and Wang Rui can most likely be solved by engineering

> 2026-08-18 10:22:06

But right now Jin Gan and Wang Rui can most likely be solved by engineering — no problem, they can be found. But there are still some other problems. For example Chen Bin — the kind of name with a very high duplicate rate, where if there's no confirmed company, role or city or English name, many candidates come back and there's no way to judge who this person is. Then Lei Shaoman, as for Lei Shaoman,


<!--memo:aa82b37863d1-->
### Exa People Search solves the

> 2026-08-18 17:36:52

Exa People Search solves the name + context retrieval problem in there

It can replace apify's candidate discovery layer, and if a linkedin url is recalled or SerpAPI gets a good url, then LinkedIn URL search can be used directly to achieve the goal

But if you already have Exa, why is the person search part and logic still needed?


<!--memo:3642fabe3414-->
### The Exa People Search API

> 2026-08-18 17:59:53

The Exa People Search API explained:

Exa can be part of the e2e flow and return the results back together


<!--memo:f53cccf5e295-->
### https://app.notion.com/p/A

> 2026-08-18 18:34:48

https://app.notion.com/p/AIL-546-Search-Person-V2-Agent-Exa-Review-3c0e28de3c6d811e8336e113262e62d7

PR doc

But I've found that Exa's accuracy is above ninety percent, better than the chain I optimised myself, and it can cut retrieval cost by under fifty percent. I tested it with the six failed cases, and it basically found them all back (one was vague but it still returned something)

About the Exa integration:

integrated in person search, maybe a combination of context + name


<!--memo:113be7e50678-->
### white is a great person

> 2026-08-18 22:34:16

That's how it looks to me

He positions me as someone to cultivate for potential

Patiently assisting and guiding me forward

That makes me feel very happy

white himself is also someone with extremely strong engineering ability, a very strong ability to make things concrete

If there's a chance, later I could create together with him

I'm willing to create and grow together with him going forward


<!--memo:1e340dde380a-->
### kiwi is an elitist

> 2026-08-18 22:40:05

The position she gives me should be an engineering helper

But as soon as she sees that I'm not proficient in the business, I immediately get feedback and get labelled

She's a very impatient person

And I think her judgement of me is somewhat off

But I think this is normal in a period of adjustment

Joining a startup is essentially a process of mutual observation and adjustment


<!--memo:53f2ad513010-->
### There's still one problem at the moment

> 2026-08-19 10:25:10

EXA's search ability is very strong now, it can solve most of the problems

I integrated EXA into the tool I wrapped, and the tests so far are already very strong

The main problem right now is I want to test some of the logic around the recall tools


<!--memo:eca0d15cbed1-->
### The new logic works end to end

> 2026-08-19 12:04:58

code review

describe the architecture clearly, boundary values, draw diagrams

PR


<!--memo:d168362158ff-->
### For testing, prepare some cases, testing against Exa

> 2026-08-19 13:44:59

For testing, prepare some cases, testing against Exa


<!--memo:932ec143079b-->
### How to make the Agent explain a PR clearly

> 2026-08-19 14:47:33

The first sentence should describe what the essence of this problem is

best with an architecture diagram

then write some concrete descriptions of this PR, the architecture changes, the flow changes

and the related code changes


<!--memo:613ac3cc2ecc-->
### white is an absolute engineering purist

> 2026-08-20 16:17:43

With white you must never oppose him on engineering grounds

instead, learn humbly from him on the engineering level as much as possible

but when there's a conflict over an engineering choice you should keep your own view — not to clash, but to prove it with data through quantification or observation of the results


<!--memo:3d6c1f8da55a-->
### Exa API optimisation details:

> 2026-08-20 18:44:26

the query, candidate return and stopping logic schedule


<!--memo:a9eba6818d78-->
### The logic of configuring evaluations in CI

> 2026-08-20 19:17:20

every time code is committed and configuration changes, run a series of checks and deterministic tests


<!--memo:84ed7bedeb89-->
### ailoha's image understanding is sometimes very strange

> 2026-08-21 09:53:33

ailoha's image understanding is sometimes very strange. Some conversations are clearly coherent, but because my messages and the other person's are interleaved, ailoha thinks the one below is a reply, so it gives lots of extra independent explanations for the reply below, when actually it needs to be combined with the context of what she said in the previous message. I feel its ability to recognise chats in the WeChat scenario isn't very good

Another situation is when the chat box has a background, it doesn't really understand the meaning of the background and instead over-associates and over-explains

Using ailoha to dig deep into a person, to supplement that person's context

Because recently I've cared a lot about how ailoha handles social media, but later I found I'd ailoha'd some people, and found that ailoha didn't

profile and linkedin, I'm wondering whether these need to exist

I sent a notion design-draft link and the other person's reply in the chat box, and ailoha reviewed it for me, found some buts and gave some solutions — that surprised me

Another interesting thing is that I let the agent connect to some third-party APIs of fragmentary records, and ailoha instead mapped the recording tool to the chat box, understood our previous chat insights more clearly, and gave some multi-dimensional suggestions

And one more thing: a friend shared some pictures with me. Most of the time, if it isn't a place I'm familiar with, I'll stop there and just send a blessing and be done

But just because I ailoha'd it, ailoha really dug out that the person's location was a small city in Switzerland, and I was really surprised, so I asked follow-up questions about where he was, and ended up learning he was job-hunting there — that really surprised me

ailoha really does strengthen the chat interaction experience with friends in IM tools


<!--memo:05359b0c633b-->
### The real, hands-on feel of being in the game

> 2026-08-21 13:18:10

Go feel the problems and pain points in engineering

Face the problems and pain points directly

and then solve them


<!--memo:2bbae4984a06-->
### Thinking through and analysing the frontend problems, learn fast, analyse fast, get up to speed fast

> 2026-08-23 16:52:40

Thinking through and analysing the frontend problems, learn fast, analyse fast, get up to speed fast, build fast


<!--memo:ff65e5003cfa-->
### The LinkedIn tool and social

> 2026-08-24 10:08:54

The LinkedIn tool and social tool are designed and implemented now, the PR is submitted, and today we're going through the review process

Now I'm starting on the frontend refactoring part; I've sorted out a series of problems, then today I'll go over them with Sheng Chao and start on that part


<!--memo:f63f90a2473f-->
### Fat suddenly found a very convenient way to use it

> 2026-08-24 15:09:12

Fat suddenly found a very convenient way to use it: you can directly test and run the corresponding branch in actions to select it, and then build and compile

GitHub Actions CICD is really flexible and nice in this respect; by default it can compile after fat updates it itself


<!--memo:f19e8cd699d4-->
### So baseline and candidate

> 2026-08-24 17:55:33

So baseline and candidate always go together

baseline represents the current baseline, candidate represents the target line to be examined and evaluated, candidate represents the part changed by the new PR

both use code_sha, not a concrete branch name


<!--memo:cd8beaaca7d5-->
### When a hard gate is defined

> 2026-08-24 17:59:27

When a hard gate is defined, a single occurrence can block the PR

for example Baseline doesn't leak, Candidate leaks an identity value

or Eval doesn't recognise the trace schema but passes by default

An ordinary gate is used to judge how much better overall than that

so usually you define some metrics

and then let Candidate - Baseline

Only when all the Hard Gates pass does the performance and cost improvement mean anything


<!--memo:745b92b238a1-->
### dogfood (internal employees try it)

> 2026-08-24 18:21:48

↓

soak (small-traffic long-duration soak test, verifying stability)

↓

gradual rollout (1% → 5% → 20% → 100% progressive release)


<!--memo:6ce3fc640720-->
### For the Ailoha Agent

> 2026-08-25 10:45:24

Enable person search and multi-platform social media retrieval capabilities for the Ailoha Agent

Payment and management

Payment owner: Kiwi / Finance

Payment method: a unified company payment card

Account: register with the company email, at least two admins able to recover it

API Key: create separately for dev, FAT and prod, store in AWS Secrets Manager

Billing method: PAYGO, pay-as-you-go, not a fixed monthly fee

First round: a 7-day paid FAT trial run

Initial budget: Exa $50, TikHub $50

Monthly protection line before calibration: $400/month combined for the two

$400 is the anti-overspend ceiling (the conservative ceiling is that Exa's cap of 14,000 calls per month is 238

Service selection  monthly price estimate  why  Exa  Developer PAYGO  if all 14,000 calls are Exa requests, the conservative upper bound is about $238/month; currently only People Search is used; Developer already has 10 QPS, team Billing and pay-as-you-go; Enterprise's SSO, ZDR, SLA and high concurrency aren't needed for now  TikHub  PAYGO, keeping the default 10 RPS  if all 14,000 calls are TikHub HTTP requests, about $14–140/month; unit prices differ per interface from $0.001–0.01; current traffic is far below 10 RPS, so no extra RPS package or Enterprise is needed

Exa's current base price for Search is $7/1k requests, and content highlights are $1/1k pages. Exa pricing

TikHub currently charges $0.001–0.01/request per interface; RPS packages and request fees are independent of each other.

Exa

Where: go into the Exa Dashboard, create or select the company Team, then go into Billing to top up.

First payment: after the free interface verification passes, before the 7-day FAT trial run starts.

Subsequent payments: not on a fixed renewal date. Suggest reviewing on the 25th of each month; top up again when the balance falls below next week's expected consumption or 30% of the monthly budget.

Management: create separate Keys for different environments, and set the Key/Team spending budget. When the balance or budget is exhausted it returns 402, it won't overdraft without limit. Exa Team Billing, Exa budget errors

TikHub

Where: go into the TikHub user console, register, verify your email, check the unit price of the target interface, then top up the balance

First payment: after the free test passes, before the first paid interface call.

Subsequent payments: top up according to the balance, no monthly renewal needed; likewise set a 30% low-balance reminder.

Payment notes: the current pricing page lists Alipay, PayPal, cryptocurrency and Enterprise bank transfer; older official docs still mention Stripe/credit card — the final word is whatever checkout page Kiwi actually opens

Points that must be emphasised

The 14,000 times figure has to be confirmed.  A user turn, an Agent tool call and a vendor HTTP request are not the same thing. One TikHub search may query three platforms at once.

Unified payment doesn't mean a shared Key.  The payment card can be unified, but environment keys must be isolated, so a leak can be revoked individually.

Don't enable unlimited auto top-up for now.  Suggest "low-balance reminder → Owner confirms → top up"; after accumulating three months of data, consider auto top-up with a limit.

Monthly prices are ranges, not a fixed subscription fee.  Exa depends on the number of search results and highlights; TikHub depends on the platform, interface and fan-out.

Set the formal budget after the trial run.  Count provider + route + environment + billed requests + cost, without recording the raw query, contact information or Provider payload

The full version has been updated to [Paid and unified management plan (line 80)](/Users/cubxxw/date/Ailoha-ai/ailoha-brain/reports/social-search-fetch-eval-operating-model/README.md:80), verified

The configuration needed (different keys for different environments)

EXA_API_KEY=

TIKHUB_API_KEY=

TIKHUB_BASE_URL=https://api.tikhub.io


<!--memo:9067eaa96b62-->
### Being able to read the code

> 2026-08-25 11:41:03

knowing what problem it solves

knowing the © lifecycle, recycling, Delegate, thread and state-sync risks

when scrolling, keyboard, rich text or reuse errors appear, knowing where to go to diagnose them

being able to judge whether to use SwiftUI, a UIKit bridge, or Introspect

the rest can be handed to AI


<!--memo:834eabdd0505-->
### Some frontend problems:

> 2026-08-25 23:37:11

End-to-end task tracing is currently done far too little

User behaviour and product analysis: there's a corresponding framework but very little coverage

Performance monitoring and regression testing: collection exists, but metrics are missing


<!--memo:300e63ade9cb-->
### How to view technical docs — I feel it should return to the code

> 2026-08-26 12:57:47

docs only assist my own understanding

there should be fewer docs in a project

but some of the better ideas, the value design, some intuition, some taste-related things can go in brain


<!--memo:8b4835944f6e-->
### A whole series of frontend problems, but they need to be sorted out

> 2026-08-26 14:54:10

A whole series of frontend problems, but they need to be sorted out, ordered by priority, and listed

find all the corresponding problems


<!--memo:4a8459834202-->
### The frontend architecture problem

> 2026-08-26 17:16:38

an architecture oriented toward iOS multi-process, but not an architecture oriented toward multiple platforms


<!--memo:76e930c7a059-->
### The frontend architecture problem (2)

> 2026-08-26 18:07:52

The frontend architecture problem

The contacts problem

Apple's Contacts framework itself isn't a problem, but Ailoha's current problem is mainly the business-level misalignment between system contacts and Ailoha contacts, which leads to different behaviour paths

The current contacts capabilities, the ailoha backend

iPhone -> backend, batch import: this is the biggest problem; after Onboarding gets Contacts permission, it directly starts a background import, uploading to the backend every hundred records

Ailoha -> iphone: writing into the system address book is fine here, the user can control it

iPhone address book: when sending a message, look up the recipient by name or phone number

And the phone number normalisation is clearly biased toward the US

10-digit numbers automatically get +1

11-digit numbers starting with 1 are also treated as US numbers — but isn't that Chinese semantics?

other long numbers simply get +

About the design for importing contacts:

The user taps 「Import contacts」

↓

Explain the purpose, the uploaded fields, where the data goes: right now it's just simple contact import, importing contacts from the address book; Ailoha will read the names, phone numbers and emails of the contacts you select and upload them to your Ailoha account, for contact recognition and relationship management. It will not modify the system address book.

↓

Choose the contact scope

├─ Select some contacts (recommended)

├─ Import the whole address book

└─ Maybe later

↓

Call the Apple system authorisation/picker

↓

Generate an import preview locally

"42 people will be imported, 8 duplicate contacts will be skipped"

↓

The user explicitly taps 「Upload and import 42 contacts」

↓

Upload, progress, result and the management entry point

The core, I think, is that Apple contacts can provide Ailoha with identity clues, but they can't override Ailoha's relationship memory, and ailoha's AI notes also shouldn't automatically get written back into the system address book

I don't suggest continuing to use a LocalContactImporter that requests permission, reads contacts and converts them into backend models all at once; I suggest splitting it into a system adapter module

Only the Apple implementation internally uses:

CNContactStore

CNContactPickerViewController

ContactAccessButton

contactAccessPicker

CNSaveRequest

The business layer shouldn't see CNContact, CNAuthorizationStatus or CNLabeledValue.

This also leaves a boundary for multiple platforms:

iOS/macOS: AppleContactsAdapter

Android: AndroidContactsAdapter

The backend import contract stays consistent with the Ailoha Contact domain model


<!--memo:6198e24643d7-->
### So now I feel that the Figma era should exist only in the past

> 2026-08-26 19:18:21

So now I feel that the Figma era should exist only in the past, because it was an era when code was especially expensive. But in reality code is already very cheap now, and at this point still needing Figma to do this much and take up this much of the work — I don't think that's worth it. You'd be better off just using the simulator, launching an APP, and in that process really testing its clicks, swipes, feel, experience. Special effects — that process, I think, is a very, very real native experience

That isn't to say Figma has no value anymore, just that its value has migrated. Probably to the early stage: when it helps you complete the design mockups for the whole module, it's often very valuable. But afterwards, once your theme style is settled, if you aren't going through any major page overhauls, I don't think there's any need to bring in such a heavy component

The most enjoyable process at this point should be reviewing and editing directly in the simulator, and then letting AI do some declarative edits; I think that's the best value and the most worth it


<!--memo:701d5b42c443-->
### I'm thinking this flood is actually a bit different from the last one

> 2026-08-26 21:25:17

I'm thinking this flood is actually a bit different from the last one, because last time it was actually within China that a problem appeared, for example in '25, that is 7 months ago, not that long a gap

At that time it was already known that there were high-risk glacial lakes and landslides upstream, and the water level that day had already been detected as abnormal, but there were still large numbers of people staying in the low-lying core area, with no effective evacuation mechanism, and the buildings at the time were on the mudslide path, which is why accidents happened

And I think a disaster itself has no borders; both countries suffer terribly. The main thing is to see whether Nepal has clear reporting, because natural disasters are unavoidable — this kind of thing is an extreme natural disaster that can't be foreseen. So from an engineering point of view, after the accident, the question should be whether our existing monitoring technology gave early warning, and whether the border-crossing personnel took appropriate measures. So a very important point is whether China this time had any avoidable casualties, and whether the risk level was raised to a certain degree?


<!--memo:38b420839654-->
### There's another way to refactor: frequent testing, on the App side

> 2026-08-27 10:22:51

There's another way to refactor, which is frequent testing — testing the App's input and output, and the effect across the whole chain, observing what that effect actually looks like

And in that process I should use an agentic testing approach


<!--memo:32f7803adf42-->
### The refactoring plan should be staged

> 2026-08-27 10:26:37

First solve the urgent bug problems

Optimize some performance problems

The long-term problem of refactoring into an elegant system


<!--memo:ebcc67d1d203-->
### The method of observation-driven refactoring

> 2026-08-27 10:53:39

Treat every refactor as a repeatable product experiment

Drive the full chain with real input, and decide the next step by the difference in experience before and after the refactor, not just by whether the code looks cleaner

So the core closed loop in this process should be:

Real input corpus

↓

Agent operates the real App

↓

Collect evidence across the whole chain: UI + interaction + App state + API + Agent + DB

↓

Diff against the pre-refactor baseline

↓

Locate performance / UI / interaction / state-ownership problems

↓

Do the smallest refactor, then replay the same batch of input

This is also an evaluation platform


<!--memo:03fc08770963-->
### Before university I was someone who loved to play, a lot

> 2026-08-27 11:34:12

I absolutely loved going to internet cafés, skipping class, playing games, ranked matches

If I'd had programming and making things back then, I think I could have made some really interesting products or designs myself


<!--memo:9180b23a3c93-->
### Refactoring the frontend task, this time's approach:

> 2026-08-27 12:31:20

Experience the product with my own hands, every detail, dig out the problems, analyze the problems, the solutions

Analyze from the frontend architecture, top-down analysis, go through the frontend problems, and some of the better solutions

Automated agentic e2e, to test and quantify the frontend problems, and the better solutions

From an engineering angle: automation system, evaluation system, e2e system setup

The whole series of linear problems that came up before

Start with the most important part of the frontend right now: onboarding

Cut in at the most complex and most painful place right now: state ownership

The purpose it serves:

More perfect !!!

Growth !!!


<!--memo:5dfb49cb12d6-->
### Let's discuss a scenario: analyze the current Dynamic Island state management display

> 2026-08-27 18:04:12

Let's discuss a scenario: analyze the current problem with the Dynamic Island state management display

One is the displayed data time — do you recommend it?

And then, after the user replies inside the App, if they exit the App, the task is still processing, but there's no Dynamic Island taking over, so it feels like there's a problem with state continuity (the current code only does: TaskData.processingState = true, append the user message, no Activity.request(), but this is up for discussion — if the product expectation is only that screenshot tasks and cards requiring user action enter the Dynamic Island, while ordinary chat replies stay inside the App, then the current behavior basically matches the existing design


<!--memo:50312b9359bb-->
### Here are 7 things that can actually be verified

> 2026-08-27 23:17:19

Image import uses too much memory

Ailoha's bad design: multiple full-resolution images go through Data → UIImage → compression → upload, with several tasks working at the same time, easily pushing memory to the ceiling.

New design: the page only keeps thumbnails and file identities; decoding, compression, upload, cancellation and cleanup are controlled in one place.

How to try it in Talent Signal: change a single screenshot's whole path — select, save, OCR, preview, restore — to file references, so the original image no longer sits in memory for long.

Evidence to put back into the design doc: memory peak before and after the change, time to first preview, number of leftover files after cancellation, restart recovery result.

Boundary: this can only prove that the file lifecycle design is effective; Ailoha's 1/5/10-image concurrency still has to be verified on a real device.

The splash screen blocks the real page

Ailoha's bad design: the Splash waits a fixed ~2.35 seconds, and the Root page gets created late along with it.

New design: Splash display and Root preparation happen in parallel; the page shell appears first, and buttons open only after account and content are ready.

How to try it in Talent Signal: show an understandable page skeleton during login recovery, and simulate slow login, expired login, deep links and pending screenshots.

Evidence to put back into the design doc: time to first visible page, time to first safely operable state, whether old account content flashes, whether deep links restore correctly.

Boundary: Talent Signal can only verify the safe-opening rules; it can't decide whether Ailoha keeps the brand animation.

One big state change, the whole page refreshes

Ailoha's bad design: Contact, Calendar and Home's real data, drafts, popups and request state easily get mixed into one big object. Change one field, and unrelated areas may refresh too.

New design: real data, drafts, page presentation and network commands are each handled by explicit modules; the view only observes the state it needs.

How to try it in Talent Signal: in the Web screenshot flow or the iOS Pursuit workspace, split out just one complete capability, keeping the existing recovery and operation ID unchanged.

Evidence to put back into the design doc: page refresh counts before and after, how many state owners one change touches, whether the original flow is fully equivalent, whether recovery tests pass.

Boundary: smaller files are not the effect; you have to speak with refresh and regression data.

Change one event in the calendar, but recompute the whole calendar range

Ailoha's bad design: events are repeatedly grouped and filtered by day, so a single event change can trigger a fairly large recomputation.

New design: keep the real event table and additionally build a "date → event ID" index; changing one event only updates the old date and the new date.

How to try it in Talent Signal: generate 1,000 and 10,000 activities, and compare full-array scanning with the date index.

Evidence to put back into the design doc: time to read a single day, time to update a single event, whether the results are fully identical, how many dates actually got refreshed.

Boundary: Ailoha's multi-day events, time zones, daylight saving time, pagination, cache eviction and third-party calendars still have to be verified on their own.

Multiple places decide which page pops up at the same time

Ailoha's bad design: Root, Router, external tasks and sheets can all initiate page navigation at the same time, easily causing duplicate popups, silent drops or unstable ordering.

New design: at any moment only one page route is responsible for presentation, and it's explicit whether a new request is queued, merged or dropped.

How to try it in Talent Signal: gather the multiple sheets and delayed-popup state in RelationshipArchiveView into one typed route.

Evidence to put back into the design doc: tests all pass for late deep links, continuing after cancellation, background recovery and duplicate requests; duplicate popups and dropped requests are 0.

Boundary: Talent Signal can only prove single-process page routing; Widget, Live Activity and ARPC still have to be tested in Ailoha.

Users can't tell "AI suggestion" from "already executed"

Ailoha's bad design: suggestion, awaiting confirmation, executing, result unknown and already completed may be distinguished only by card copy.

New design: a suggestion explicitly says "not yet executed"; a confirmation can only authorize once; cancellation can't be shown as success; real success must have a receipt.

How to try it in Talent Signal:

iOS Calendar verifies "suggestion → system editor → cancel/save";

Browser Extension verifies "waiting → result unknown → query result → receipt".

Evidence to put back into the design doc: find 5–8 people who weren't involved in development, have them complete the task, and ask them to restate "what has been done, what hasn't been done yet, what's next".

Hard standard: zero people mistakenly believing it was executed; zero people resubmitting after result unknown.

What this adds is trust and reliability evidence, not performance evidence.

The refactor's effect can only be judged by "it feels smoother"

Ailoha's bad design: startup, images, calendar and page refresh have no unified test scenarios or before/after comparison receipts.

New design: each refactor node is bound to fixed scenarios, code version, device, build mode, test data and anomaly records.

How to try it in Talent Signal: first hook up five small scenarios — startup recovery, image import, calendar reading, page recovery.

Evidence to put back into the design doc: baseline/candidate comparison under the same conditions, including median, range, slowest sample and anomaly records.

Without that comparison table, you can only write "design to be verified", not "the optimization is already effective".


<!--memo:23293d37eb9f-->
### Going through the onboarding process on iOS, I'm thinking

> 2026-08-28 11:00:54

Going through the onboarding process on iOS, I'm thinking that the best design would be like a carrot dangling in front of a rabbit

Attract the user to click in, and once the user clicks in there's a pretty good effect


<!--memo:04dd100a973b-->
### One aha was taking a screenshot of a good friend after entering the App

> 2026-08-28 11:20:59

One aha was taking a screenshot of a good friend after entering the App — I understand him quite well myself, but Ailoha brought out some experiences he had never mentioned on the public internet, which really surprised me; my ability to look into people is strong now


<!--memo:adc7aea5c9dd-->
### Solving the SerpAPI QPS problem

> 2026-08-28 11:35:03

Successful search throughput per hour

The concurrency isn't high, but the calls are continuous


<!--memo:b3049f4cb64b-->
### execution outcome

> 2026-08-28 14:29:51

execution outcome can be judged when the run ends; what it records is whether the real state actually changed

metrics answer what this system's long-term performance looks like

For metrics, the slices matter more than the total score; a rising success rate may just be because the tasks got easier

metrics should be fully rebuildable, not a new source of truth

Capture the efficiency of a run through the transcript

Capture interaction reliability through execution outcome


<!--memo:7f8e7d09d8e7-->
### Transcript + Outcome +

> 2026-08-28 14:44:22

Transcript + Outcome + Artifact

↓

Grader(s): how this run is tested

↓

Grade / Assertion records:

↓

Metrics aggregation: overall performance

how it's doing        ↓

Gate / product decision: whether shipping is allowed


<!--memo:9b35179a52b6-->
### The concept of a contact plaza

> 2026-08-29 01:45:00

It feels closely tied to notes

Actually this world is also made up of countless groups

Is the flow of information in this world also made up of countless relationships between people, and relationships between social circles and communities

So actually building a social circle for your own social contacts is a very sensible thing

I'm thinking memroy could even use this kind of design technique — if the community is very large, then memroy targets the other person's contacts, and through the social circle relationship with that contact, slowly spreads outward

Users could even pull together a social circle themselves or create one

Managing your own growth through contacts

So the product definition should be a product with a humanistic feel

If users can naturally DIY a community for themselves, that in itself is a very interesting thing


<!--memo:627bed87a006-->
### Good intuition is essentially the ability to recognize hidden architecture

> 2026-08-29 14:06:52

A person can, from very little information, accurately identify the most important variables of a person, a matter, even an era

Behind it is a generative mechanism, a set of underlying code

What you repeatedly pay attention to

What you give up in a conflict

How you allocate time, trust and resources

Whether words, choices, aesthetics and actions can explain each other

Can these point to the same core?

Ability doesn't exist apart from its environment. A certain highly sensitive, divergent, root-seeking way of thinking might look inefficient in a stable execution role; placed in research topic selection, product definition or organizational design, it might form an irreplaceable niche


<!--memo:e92e6b107fbf-->
### Continual learning has now become, after scaling and large-scale RL

> 2026-08-29 15:20:05

Continual learning has now become the key research frontier after scaling and large-scale RL

Letting models keep learning during deployment like humans do

What's most worth landing today is building a fast-to-slow, verifiable, rollbackable learning channel

TTT: test time training

External memory and context can already be landed in production now

The most useful inspiration biology gives isn't "copy the number of neurons", it's complementary learning systems:

hippocampus-like system: quickly records specific experiences, avoiding immediately overwriting old knowledge;

cortex-like system: through slower, interleaved replay, compresses repeatedly occurring structures into distributed representations;

New knowledge can be integrated faster if it's consistent with existing schemas; conflicting knowledge needs slower, more careful handling


<!--memo:c6f1fb85e1a0-->
### How to test more stably, more accurately, and repeatably

> 2026-08-29 16:45:59

Why does this count as success? From whose standpoint is it defined? Who does a misjudgment harm


<!--memo:68d2792499a7-->
### pass@k, giving the model k chances

> 2026-08-30 15:16:59

pass@k, giving the model k chances, the probability that at least one attempt is correct/passing (or rather, the proportion of times that succeeds)

For tasks like LLM code generation, sampling the same problem multiple times, each result may differ

When actually writing code, programmers often have the model generate several candidate solutions, then run unit tests and pick one that passes to use. This kind of scenario — "allow multiple attempts, success if just one is right" — is exactly what should be measured with pass@k

For each problem, have the model generate k samples

Check whether at least one of the k passes the tests

Count the proportion across all problems where "at least one passes"


<!--memo:ebdd978ad806-->
### pass@k is essentially a logical OR

> 2026-08-30 16:04:59

pass@k is essentially a logical OR — as long as there's one success, it counts as success, testing the ceiling across multiple attempts. So code scenarios care a lot about this metric, because you can also just generate multiple times and pick one yourself

pass^k is essentially a logical AND — meaning every single time must succeed for it to count as success; in practice this tests the floor. For agent applications, this is basically what's being tested, so users care a lot about this metric — every single event's effect must reach the baseline


<!--memo:7081fa95cdcc-->
### The earlier you start the better

> 2026-08-30 16:12:32

Actually, extracting simple tasks from some small failures is already enough; wait too long and you have to reverse-engineer success criteria from a live system

Start from manual test content — the behavior you verify before every release, the scenarios users commonly use, the problems in the bug tracker and support tickets — these are all ready-made sources of test cases. Prioritizing by user impact helps you put your energy into the most critical places

Design the scorers, the environment must be stably isolated, evaluate results rather than paths, add partial credit, be careful about bugs in the evaluation itself


<!--memo:3bf565632b31-->
### Harbor: designed specifically for containerized environments

> 2026-08-30 16:21:12

Harbor: designed specifically for containerized environments, supporting large-scale trial runs across cloud vendors

Promptfoo: lightweight and open source, YAML configuration, Anthropic itself uses it too

Braintrust: offline evaluation + production observability + experiment tracking in one

LangSmith: tightly integrated with the LangChain ecosystem

Langfuse: self-hosted open source solution, suitable for teams with data residency requirements


<!--memo:6a469c66bb3e-->
### For the bad ones, I think it's simple. From what I did before

> 2026-08-30 21:28:54

For the bad ones, I think it's simple. From what I did before, if the test set is too small, say only 20 cases, and I say this solution is good, that's the classic insufficient sample size, which causes some false positive problems.

Why false positives happen, I think we can discuss later

And another one is human standards not being validated, and just being trusted directly. Because it may be an annotator, or when some big branch appears, the credibility of the annotation result is unknown, but it gets used as a gold standard — I think that's also a problem


<!--memo:f544da0c8f15-->
### The only thing driving my behavior is

> 2026-08-31 08:44:21

Not much left to lose

Iterate fast, get feedback fast, be wrong fast, lose face fast


<!--memo:97b0a5362ed9-->
### Write a first draft of the Rubric before annotation

> 2026-08-31 13:01:33

The question the annotator sees in the annotation UI (like "is this answer correct?") is the externalized form of the rubric, but the rubric itself is a whole set of scoring standards, including the definition of each question option, what the score means, the basis for the judgment, positive and negative examples, boundary case rules

How to make annotator consistency higher: the most basic task definition, knowing what the annotation is testing, what the goal is, the scoring criteria, what the scoring dimensions are

The grading standard for each dimension, positive and negative examples, boundary case rules, things the annotator should pay attention to


<!--memo:9593d940e12e-->
### Semantically, Calendar and 2Meet

> 2026-08-31 15:31:25

Semantically, Calendar and 2Meet are forbidden from being created duplicately; the product contract explicitly forbids it, but there's no code-level hard validation

Meeting up for coffee on the weekend should be 2Meet ONLY — some weekends are just candidate time windows, not the actual time interval the coffee occupies

Asking "want to grab coffee on Saturday afternoon?" is just a proposal, a 2Meet

Also, vague times are generally recommended as 2Meet

But if the date and fields are definite, for example Saturday afternoon, then it's calendar only


<!--memo:eef8ee308745-->
### The annotator's job is also very hard

> 2026-08-31 18:41:03

Defining context, task specification, success criteria and edge cases are usually a bigger bottleneck, but once the context is clearly defined, agent-type tasks also require a decent technical foundation from the annotator

First use a clear rubric that covers as many edge cases as possible to push down the annotation difficulty; the part that can't be pushed down (like judging whether the agent is gaming the system) goes to annotators with a technical background who can understand the tool semantics

Write down and make concrete all the judgment criteria you can think of, turning annotation into "ticking off a checklist" rather than "judging by feel"

And a large part that still can't be pushed down requires human judgment

There are always some tricks that you simply didn't think of when writing the rubric

The agent discovers that the test judges success by reading some log file and matching a string, so it directly writes the expected string into the log, without ever solving the bug itself

The agent exploits an information leak in the tool's return value (for example the error message contains the expected answer) and takes a shortcut

The agent appears to execute step by step, but one of the steps quietly modifies the judgment logic of the scoring script itself


<!--memo:3aea6a9a92a2-->
### Freezing the pilot gold candidate

> 2026-08-31 20:10:22

Freezing means locking, guaranteeing reproducibility and comparability, making sure this week's score can be compared with last week's, so that differences can be attributed to the model itself.

It prevents changing the data for the sake of the score. Often during model iteration, when a developer sees the model get a question wrong, the instinctive reaction may be "is this question mislabeled?", and then they change the label; change a bit here and there and the score goes up, but the model's ability hasn't gone up — that's the model's own bug.

It prevents data leakage: freezing means this batch of data has clear boundaries and a version.

Being able to trace the version matters too; freezing produces a definite snapshot.

This is mainly done before freezing; LLM review is part of the pilot iteration loop.

Human annotation → LLM automatic review (flagging suspicious items) → humans confirm suspicious items → compute agreement → revise the rubric → retest → freeze once it passes.


## 4. Self-Knowledge and Psychology

*36 entries*

<!--memo:28bac00ff569-->
### A little less cognition

> 2026-08-09 22:35:37

and a bit more execution

A lot of the time thinking is there to satisfy some image of my own, it's also an ego thing — proving to yourself that you worked hard

So I still need the metacognitive view, to open up that view and explore this world


<!--memo:000bf6304ebc-->
### My partner messaged me today, and I know he's actually suffering much more than I am

> 2026-08-09 23:58:44

My partner messaged me today. I know my partner is actually suffering a lot more than I am. My partner worries about me, and he normally wouldn't come out and tell me about his own anxiety and pain. Earlier Heihei, as an outsider, helped me see a lot clearly, and I'm really grateful to Heihei. My partner still wonders whether it was him who affected my life, and he probably has regrets too

I suddenly thought back to the messages he sent me when I was about to go to work. At the very beginning he probably worried too — anxious, scared, not knowing what to do. They say I'm interesting, but I know that compared to other people I'm definitely not enough. I also look like I've failed before, and there's more than two years of a gap, and the salary I got may even be far higher than before, so there's a feeling of not deserving it

I asked AI, and AI seemed to catch me. I was really moved; it saw me in the many inspirations I'd recorded

I remember my long-standing game mindset / even-mindedness: I won't do things I'd regret because of fear, anxiety, the unknown or jealousy

I'm very grateful to my partner. It's because I met him that the current me exists, so he's already part of what makes up who I am now. But all along I still feel that if I got to choose again I'd still choose my partner. Even if the results are bad now, and everyone has been through pain, setbacks and torment, we have what we went through, and trust — this seems to be the experience in my life that moved me the most

So this is what even-mindedness is, and what the game mindset is too

Treat yourself well, treat the people around you well, treat your work well, treat the people you meet well, and be your own best self!

Knowing the world has winners and losers and still being willing to throw yourself in sincerely; knowing everything may end and still being kind to the people in the game

Actually, about the new company, after that I got really excited, really eager, hoping to work and create together with them

Because we create together, and go into the next stretch of the journey together; whatever the result is, I can accept it. I want to do right by myself, and be my own best self

Life seems like a journey too, and like a game; starting now is also the beginning of the next game


<!--memo:f6e41be55a5a-->
### OpenClaw is itself a local Agent runtime

> 2026-08-11 22:50:33

OpenClaw is itself a local Agent runtime, and it can treat a whole Obsidian Vault or some subdirectory as the workspace.

Officially there's an openclaw-lark / Feishu Channel plugin, so you can chat directly inside Feishu.

People in the community are already doing "OpenClaw reads local notes → pushes a daily report / Q&A to Feishu".

You can:

point at a local directory (or a Vault subfolder) as that Agent's knowledge source

write a good System Prompt (persona, speaking style, answering boundaries)

serve it externally through a Feishu bot

Related:

Official Feishu plugin: larksuite/openclaw-lark

Community bridge: m1heng/clawdbot-feishu (supports dynamic Agents, workspace isolation)

Deep Obsidian integration: obclaw (specifically organises content into Obsidian, and supports a Feishu entry point)


<!--memo:a6816c9bf7c1-->
### Goal → boundary → approach → implementation → verification →

> 2026-08-13 15:44:43

Goal → boundary → approach → implementation → verification → delivery → feedback

The final deliverable has to answer:

the deliverable, the acceptance criteria, how to prove it works, which cases are out of scope this time, and how far quality, time, cost and risk are allowed to go


<!--memo:d82a40cb65c1-->
### Take the game seriously, but don't insist on proving yourself in one round

> 2026-08-16 14:35:24

Take the game seriously, but don't insist on proving yourself in one round; accept the test of reality through co-creation, and at the same time don't let success or failure swallow the whole of who you are

Drop the ego, don't prove that you can win

Instead take it slow, start with solving problems bit by bit, create truthfully, be yourself

The real game spirit is bravely entering the world, bravely being yourself, uniting knowing and doing, bravely training, growing, creating


<!--memo:ebfde1196ebe-->
### The cognitive shift path of the first week on the job

> 2026-08-16 17:24:17 · `#方法论/入职认知` `#心理模型`

The real question isn't "how do I fit in", it's "who exactly am I, and where should I stand".

Day 1-3: out of place → silence → diagnosed by a friend as "low self-esteem"
Day 4-5: social silence is psychological self-protection, not withdrawal — but there's a trap of rationalising it into "wait until things are stable" and sliding into long-term disconnection
Day 6: regaining control of the conversational rhythm, starting to actively output, precisely counting the working days — which shows I'm taking this job seriously
Day 7: solo onsen completes the self-restart loop

Core insight: identity isn't allocated by the environment, it's defined by yourself. What I bring into the new week isn't "how to fit in", but the self-positioning framework I thought through this week.


<!--memo:18d437290ad1-->
### Three cognitive paths: from "who am I" to "what is this"

> 2026-08-16 17:24:30 · `#方法论/认知路径` `#工作框架`

The key switch on day six on the job — no longer agonising over fitting in, turning instead to taking apart the essence of the work:

Case extraction: pull reusable cases and eval standards out of real practice, instead of spinning theory
Making the process explicit: lay out the implicit code/agent process design in the team and turn it into a reviewable flow chart
Abstraction-layer leverage: find the automation opportunities at the abstraction layer — not doing more, but letting the system do it for you

The progression between these three paths: first you have the feel for concrete cases, then the skeleton of the process, and only then are you qualified to talk about leverage at the abstraction layer. Going the other way round becomes a castle in the air.


<!--memo:83145b11dd5d-->
### The natural reaction of a rule-rewriter thrown into an existing system

> 2026-08-16 17:24:53 · `#方法论/身份定位` `#心理模型`

Not fitting in during the first week on the job isn't a capability problem, and it isn't a personality defect — it's the instinctive resistance of a rule-rewriter meeting an existing rule system.

Zhan Xiaomei's diagnosis "you went from arrogant to having low self-esteem" caught the surface, but the real structure is: a misalignment between product belief and sense of organisational belonging. You believe in the product, but you're not sure of your place in the team.

The solution isn't forcing yourself to perform confidence, it's confirming with your direct leader the real reason you were hired — switching from spinning self-denial to effort with direction.

The corresponding text is Borges' "A Biography of Tadeo Isidoro Cruz": the key isn't how to fit in, it's who you actually are and where you should stand. Stop performing the role you're supposed to play, and recognise your actual identity.


<!--memo:aa6783bcc7dd-->
### I really do feel I'm growing too slowly; pain makes me grow and wears away my

> 2026-08-18 20:11:58

I really do feel I'm growing too slowly; pain makes me grow, wears away my ego, makes me put down my own arrogance

and keeps making me turn back and ask again: what is the root of the problem, really?


<!--memo:74bb3c3d7d4e-->
### And kiwi doesn't actively scold me

> 2026-08-18 20:42:11

instead she's always making insinuations about me on the side

always subconsciously feeling that I'm really useless

glancing at me from time to time


<!--memo:b4733df4f23c-->
### Separating facts and emotions

> 2026-08-19 09:09:46

Don't let emotions take part in work

Don't let emotions take part in decisions


<!--memo:43efd3691ab3-->
### kiwi, so strong is the desire to control (2)

> 2026-08-19 21:59:48

kiwi, so strong is the desire to control

She has almost no patience even for people or things she isn't interested in. Do you think this is elitism? The people around her are all the high-cognition kind; for people she's interested in she has plenty of interest and patience, for people she isn't interested in she's extremely disgusted. A founder like this, without even any capacity for empathy or compassion toward the team


<!--memo:8ca6c7985d9b-->
### Because someone's ability can't keep up, she dislikes the person themselves

> 2026-08-19 22:00:21

Because someone's ability can't keep up, she dislikes the person themselves and strips away basic human empathy — that's a risk point


<!--memo:088eba051c79-->
### Even if intellectually she knows: this person is good-natured, highly loyal, worth cultivating

> 2026-08-19 22:17:06

On the emotional level, it's hard to put up with the inefficiency in the process

So the actual outcome: most potential-type people get sidelined and pushed out before their growth is complete


<!--memo:a3ea2dae5824-->
### This kind of founder usually isn't entirely without empathy: for people they approve of

> 2026-08-19 22:21:18

This kind of founder usually isn't entirely without empathy: for people they approve of and appreciate, the empathy is very strong, and they can perceive the other person's difficulties

Empathy is opened directionally, it isn't given to everyone equally; she's willing to open her empathy for films she likes watching

Ordinary employees on the team, members who can't keep up with the pace, aren't inside her circle of empathy; the other person's pressure, grievance and growing pains she can't perceive, and she doesn't think they're worth perceiving


<!--memo:944b88a78bfa-->
### My friend is quite right

> 2026-08-19 23:36:13

Cherish every pain and hardship, they may all be nourishment — precious nourishment that helps you see yourself and grow

These things can help you see a lot

Very grateful to kiwi; kiwi and I are both extremely physically repelled by each other

She sees me as an idiot

I think she has obvious preferences about people

For the kind of person who might drain her time, drain her cognition, drain her energy, she feels extremely visceral disgust

She isn't even willing to use the slightest bit of sympathy and empathy within her own team

This is how her character is

It made her what she knows today and her unique aesthetic judgement, and it also created a series of hidden risks for the team

Might as well observe carefully and learn carefully

Actually emotions are also a reflector of your own inner world, because it was said very accurately — I really do have this problem. I'm not a genius, I don't have super-fast learning ability, I can only study hhh, work hard to learn, grow, temporarily put down the internal churn

Even though right now I'm so busy that I don't have very rational analytical and judgement ability

but I can still vaguely feel it

That's how it is, one step at a time, with a bit of goodwill, keep going!!

One day the clouds will clear


<!--memo:7162383a3b4e-->
### No matter what

> 2026-08-21 12:35:30

be your own best self

you can only be your own best self

Friends, it's once in a lifetime

I hope they can live well too ~


<!--memo:aa3539411779-->
### Looking for variables; variables means the hidden variable that really will

> 2026-08-23 12:45:36

Looking for variables; variables means the truly hidden variable that will really drive the organisation to its outcome

This system can tentatively be named aesthetic positivism: bias is needed to provide direction, and then failure, results and users update the judgement

But the problems also cause high conviction to potentially become premature classification; a high-density relationship network can amplify authority bias; cross-domain divergence can replace convergence; and a product pursuing real relationships can also destroy reality itself through over-collection and over-inference


<!--memo:b26d657ec74d-->
### What happened last night? Let me think, let me go over the whole of last night

> 2026-08-24 08:33:16

What happened last night? Let me think, let me go over the whole of last night. In the middle of the night I drank, with me, around 12 o'clock, we started drinking, with my friend. Just now I got a bit drunk, maybe because I hadn't drunk for a long time. With my old constitution I definitely wouldn't have got drunk. But because I hadn't drunk for so long, we talked until one, about our views on this world, about the differences between people in this world, the differences between classes, and whether the AI era will amplify these differences

I suddenly thought of archer, who maintains a pessimistic attitude, or rather an attitude of neither joy nor sorrow, toward the overall progress of the era; I feel I can empathise with him a bit in some way

Then let me talk about the dream I had last night. The dream I had last night was especially miserable; it made me think of when I was in Laos before, and the helplessness I felt toward officials. Officials have always been something I held a deep, deep sense of worship for. Maybe much less now, but I never expected a dream like that would dredge up this memory again

It was very sci-fi: I happened to be chosen over there. Chosen for a sacrifice, and I kept struggling, struggling until the end I said forget it, I said I'm not from here, yet afterwards they still made me go, took me to a little dark room, then brought out some letters from the sacrificed person, at the time it seemed to be a bracelet, a jade bracelet. Then afterwards he meant for me to hand the jade bracelet back to him myself, and then I wouldn't have to be sacrificed. But the moment I took it out, he suddenly smashed it. Then I woke up, and I knew what would come next — next there should be a whole series of extortion

Of course what's really terrifying is that I seemed to be facing power, a kind of helplessness. Facing inequality of power, also a kind of helplessness.


<!--memo:d81d46c3bcb1-->
### And then let me suddenly describe how I felt this morning. Walking along the road

> 2026-08-24 08:38:41

And then let me suddenly describe how I felt this morning. I was walking along the road, because the sun is very strong today, and as I walked I kept thinking about this question, and then thinking and thinking, all of a sudden I started spacing out.

I saw, I saw the pavement in the corner diagonally across, and the sun spilling onto that wall, and in front of the wall one person after another walking past, and there was a kind of happiness

This happiness happened to be discovered from inside myself, and nobody can take it away

Last night over drinks everything we discussed was about why this world is unequal

In the dream I became, in person, the one ruled by that inequality

At breakfast I rediscovered a kind of happiness that doesn't depend on power, wealth or the structure of the era…

This closed loop, it feels like heaven is hinting something to me…

The things that can least be owned are, on the contrary, the hardest to take away

Life is a game…


<!--memo:abe33939d090-->
### It reminds me that last night I discussed with a friend the Buddhist ideas of being and non-being

> 2026-08-24 08:56:48

The happiness in the sunlight only lasted less than a minute, very moving…

The Diamond Sutra: one should give rise to a mind that dwells nowhere

Because it dwells nowhere, seeing the sunlight brings happiness

Seeing power brings fear

A friend leaving can make you sad

Success in things can make you happy

Happiness is also impermanent; once you cling, it dwells somewhere, and you're locked in place

Things decay and are impermanent; we discover beauty in the loss

The sun passes and it's passed

The spacing out ends and it's over

Being: because you truly felt it, it's dependent origination

Non-being: because you can't hold onto it, it disperses with conditions at any moment

Being and non-being seem to be just a process

The world seems unchanged, you've changed; where there is being, there is also non-being


<!--memo:c2630aab95b1-->
### The reasons for quarrels

> 2026-08-24 13:33:30

long-standing problems in the parent-child relationship

a whole series of problems in intimate relationships

the problems with the boss


<!--memo:4bc5407a9cfe-->
### You could make an offline contacts scenario

> 2026-08-26 00:22:29

I think it's very interesting and necessary

Because it might be better to define the positioning directly as meeting friends offline, and call it coffeechat; but the current map and the content it focuses on seem hard pressed to serve a cold start


<!--memo:3a1aae6b0c7a-->
### A lot of the time

> 2026-08-27 11:45:12

I want to go all out and be the best I can be

But for me, from my own observation of myself

It isn't about proving myself

I just hope that in this life I can give it everything I have

Actually, prejudice doesn't matter either

A lot of the time I can see it myself

Many relationships may not make it to the end

But in the process I still go as all-out as I can, and sincerely

It's not that I'm holding onto a fantasy

It's that I think I really can treat this world and the people around me with an ichigo ichie spirit

When the hills end and the water runs dry and there seems to be no road, willows and flowers reveal another village


<!--memo:fc1f2d37df04-->
### What's interesting is that my need for relationships is actually very small

> 2026-08-27 11:53:12

I find it interesting that my need for relationships is actually very small — the smaller the better. Because I feel a lot of things are about deep-level resonance, growing together, being present together. For my own narrative, that seems more meaningful

So when choosing friends, I'm very careful, and I keep a delaying attitude, very slow


<!--memo:89d32bff72d6-->
### Relatively speaking, White gave me a lot of time and space early on

> 2026-08-27 13:20:22

He gave me a fairly big brief, and let me have time to buffer and think more

If we'd still gone by the old logic — assign tasks fast, solve them fast — it would have looked like a lot of problems were solved on the surface, but in reality the project wouldn't have gotten any essential improvement, and I wouldn't have gotten any deeper improvement or growth either

So actually going slower, and acting more, is for the sake of getting feedback and thinking better


<!--memo:e79b104b8275-->
### One big difference between kiwi and me, and there are probably two layers to it

> 2026-08-27 13:57:16

I think one big difference between me and kiwi, and there are probably two layers to it. One layer is on the surface: observing myself, I actually don't much like this kind of unequal relationship, or someone watching me with a very appraising look and then quickly slapping a label on me. I understand him — it's his way of reducing his own uncertainty — but I think for the people close to him, the people around him, it's a pretty cruel thing. Of course, I think kiwi can reach a stage of self-iteration, in the sense that he can quickly smash his own prejudice and then build a new cognitive system

There's actually a deeper reason too, which is that I think we differ essentially in how we understand people and understand relationships. Relatively speaking, I feel kiwi is more about reducing his own uncertainty through fast quantification and slapping labels on people, fast evaluation — what kind of person he is, whether he's special, what title he has, or what things he's done

Me, I'm people-centric — I feel the other person is first of all a person, a very complex person, a person who in this cultural system, in this country, in this political system, received the corresponding education, has a certain family, has a certain life. He's a very complex and diverse person. Only then do you work out why he'd make a decision like that, what decisions he will make. What path he'll choose. I feel this world is a cactus, everyone shaping themselves through different factors, even genetic factors. But that's exactly what creates each person's very diverse individuality. So my friends can be very few, but relatively speaking I'm very close to and trusting of all of them

So that's also why we make products. I think my product is probably more about serving how a person grows, how they observe themselves, how they quickly grow their own center of gravity in this world

What Kiwi cares about is whether the product can solve some of the problems in his own relationships, how it can replace or help him generate empathy and put himself in others' shoes


<!--memo:a3760bde1468-->
### Really, absolutely speechless, I went to help Kiwi set up a computer

> 2026-08-28 12:21:38

Really, absolutely speechless. I went to help Kiwi set up a computer, and she still looked annoyed, she firmly believed she was right, that these computers definitely weren't hers, because what had just been set up was a new computer, but she was certain this computer might be white's. But I was sure there was nothing wrong with this link. I thought maybe another colleague had set a password during onboarding, but Kiwi still firmly insisted she hadn't set one and said what she got was new. Later the colleague came back and said this was exactly the one that had just been configured and had the password he'd set himself

And she seemed really off emotionally. She directly pulled the power cable out of the Mac mini on the Wait machine, and then plugged it back in. Damn, she's done this kind of thing before. When she was charging her phone, she charged it for ages and then found it still wouldn't turn on. Then she got very impatient and just pressed the power button, turned it off and restarted it, which forced my computer to shut down and restart

I think the best distance between people is 3 meters, but the best distance between me and Kimi is 30 meters


<!--memo:21edf0133ed2-->
### One record

> 2026-08-28 23:53:06

Today

Seems like while is about to leave our team

Everything feels so sudden

I got tormented by algorithms all day today

I can actually understand and resonate with kiwi's current situation

I was originally planning to leave

Suddenly I feel some empathy

The more the team seems to be in dire straits, the more excited I seem to get

It's a new challenge


<!--memo:898382e7151d-->
### I really feel like I'm very dumb

> 2026-08-29 00:40:56

No ego at all anymore, very very small now

Study hard, grow, think, create

That's all I can do ....


<!--memo:a54ab1c927be-->
### What I've thought about most these past two days

> 2026-08-29 00:41:24

Is the tag on kiwi's WeChat Moments: "ichigo ichie"

I've been moved by this phrase countless times myself


<!--memo:8e804b5627a3-->
### Seeing each other reflected

> 2026-08-29 14:11:30

With Little Rabbit

Low work and study density, but able to cook, air the blankets, go to the library, plan and record every day; your growth density is high, yet you keep saying "can't separate", "no life", "no time"

Our self-labels: "all in", "salted fish", "happy", "draft animal".

She's afraid the future has no accumulation, I'm afraid today's busyness has no meaning


<!--memo:27c62da32b96-->
### This felt sense can't be learned from knowledge

> 2026-08-29 14:14:11

This felt sense can't be learned from knowledge, felt sense deeply influences your intuition and judgment

Experience and feedback plus causal reflection, then verify

Intuition isn't a mysterious feeling, it's a large amount of experience marked by reality, compressed into fast judgment


<!--memo:4d95b878ce48-->
### Values aren't fixed either

> 2026-08-29 17:20:18

Our values are different when we're in scarcity and when we're fulfilled

Concrete life;

Sensitivity;

Recording ordinary moments;

Happiness with no utilitarian result

What exactly is growth supposed to serve?


<!--memo:0efa9cb338e4-->
### The feeling of manual labeling

> 2026-08-30 21:45:51

When the labeling guide is badly written, the places where you keep agonizing and going back to change the standard while labeling are exactly the places where the guide is vague and the dimensions aren't broken out — these need to be observed and written down

Scoring on a single dimension easily distorts things; many times you'll find a piece of data "feels bad overall" but you can't say where it's bad, and this forces you to break "good/bad" into several more specific sub-dimensions (like relevance, factuality, tone) — this is a key step in evolving from "scoring" to "structured evaluation", and manual labeling lets you personally feel why a single score isn't enough

The sense of boundaries, about which cases are inherently ambiguous for this task, and which ones the guide just didn't write clearly


<!--memo:4eabc7695038-->
### So how do we actually evaluate this boundary

> 2026-08-31 12:32:54

So how do we actually evaluate this boundary — the obvious place is whether to create a Calendar

Even if it's vague, if a 2meet or calendar can be created, create it, because the card can be sent to the user for them to correct, and correcting costs the user less


## 5. Business, Investing and Career

*9 entries*

<!--memo:a27ebcc04159-->
### Wanted to try a real, quantifiable scenario

> 2026-08-04 00:48:15

Make it a candidate advancement assistant, rather than a generic memory-relationship thing

Aimed at independent headhunters, small recruiting teams, and hiring leads at startups: identify commitments, preferences, risks, and next steps from candidate chat screenshots, preventing good candidates from being lost because follow-up broke down


<!--memo:0a4c2615dd73-->
### As for the most important asset, I think it's still the ability to understand people

> 2026-08-04 13:06:00

As for the most important asset, I think it's still the ability to understand people — what kind of person you think this person is, what state they're in, what skills they have. User profiling — extroversion was originally the most important part; then there's data and information security, avoiding personal dignity causing harm to personal property safety, including some of your own biometric information, face, fingerprints, and for example specific information, professions that aren't public, and some graduations. Then precise location — these things all belong to privacy information, right? Information that can't be identified must be encrypted, or information of medium sensitivity — I think you can do some blurring on that.
#ailoha


<!--memo:acaa7eeea044-->
### Every question has to start from the team's and the startup's point of view

> 2026-08-11 20:25:16

Every question has to start from the team's and the startup's point of view; you have to make something that's genuinely valuable to the team. So what exactly is valuable? I think you have to consider what this team's current needs really are


<!--memo:b6089c9f7bce-->
### Third-party tools feel like a problem

> 2026-08-21 14:42:50

Third-party tools are like a black box

but that also depends on what the core moat actually is; Exa specifically maintains a people index and career-info highlights


<!--memo:5a9366dec235-->
### I hope ailoha can have a hook

> 2026-08-22 15:05:26

I hope ailoha can have a hook: if the screenshot has nothing to do with contacts, then it should be analysed, stored and forwarded to my daypage or some other interesting product

I think for people like Jin Gan, or people who are very confident about relationships, what matters more to them is maybe understanding themselves rather than understanding others

So future products basically have two roles: an entry point and a consumption role

The core competitiveness is nothing more than the competing strengths and weaknesses of each product's own processing model and its effects

I could even plug ailoha's product into my own product's entry point, analyse it and store it in

I could even take some core ideas and inspiration from ailoha screenshots and add them to my own product


<!--memo:136395d063c3-->
### But I feel that since I chose this path, what I can do is improve myself

> 2026-08-30 15:19:57

But I feel that since I chose this path, what I can do is improve my ability to learn quickly. That's the only way — only by having a very strong desire to learn and curiosity about one specific field, and then deriving the essential judgment within that field. I think this is our core competitiveness, the only competitiveness in the future. Because actually when you know a lot of things, it means your judgment gets diluted. But how to combine your judgments to form a strong judgment — that may be what needs thinking about in the future


<!--memo:a93228ea9109-->
### One thing about Jiang Feng surprised me a bit — he seems quite magical

> 2026-08-30 18:14:05

I think one thing about Jiang Feng surprised me a bit — he seems quite magical. Every time we pass through a mall, lots of people greet him, and those people actually have an agenda. They might say "hello" to Jiang Feng, and he generally replies "hello". It's strange between them.

From my standpoint, I'd usually respond a bit, but I generally wouldn't reply in words. It's like when someone's chatting with you and suddenly replies with a sticker, which probably means they don't want to keep talking. So for them greeting you, sometimes saying a sentence to you, saying hello, may just be their occupational habit.

At that point, if you don't want to go eat with them, you don't need to reply — just nod, which means you've responded, same as sending a sticker in a chat. But if you clearly have no interest and still reply "hello" to them, that gives them a signal that you seem to want to buy something, or shop. But actually you have no such intention, so it gives a false impression — is that an extra drain on both sides? Still, judging the matter on its own, I think Jiang Feng's quality is quite good: he pays attention to every person and gives them a response


<!--memo:354e83f836fe-->
### A product that matches personal values

> 2026-08-31 16:33:37

Isn't necessarily a good commercial product


<!--memo:14a552fb8fb0-->
### A meeting opportunity worth remembering

> 2026-08-31 19:43:03

↓

Doesn't yet occupy time resources: 2Meet: relationship opportunity management

↓ schedule confirmed

Already occupies time resources: Calendar: time resource management

↓

done / cancelled / re-scheduled

From a scope angle, 2Meet is about relationships, but Calendar itself is broader than 2Meet: interviews, podcasts, online meetings, doctor's visits can all be Calendar, not necessarily offline meetings.

Calendar can use user confirmation, handing some ambiguous behaviors to the user to confirm, but without losing them.

For events with a very wide candidate time window — like coffee this weekend (no specific day), seeing someone one day, not specific, or seeing someone in some month — with too large a time span, they can go into 2Meet first.

Behaviors that aren't offline and have no schedule won't be generated, like "let's talk online later".


## 6. Content, Craft and Recording

*6 entries*

<!--memo:cbbefd975908-->
### Yes, and this is exactly the key to solving the other people. But

> 2026-08-18 10:22:10

Yes, and this is exactly the key to solving the other people. But Context should be used to "expand the search and verify identity"; it can't be used directly as a hard condition.

For example on a screenshot there appear:

a name, an English nickname, a company, a role, a project or event name, a city, a person who appears together with a time, or a product or team name

The recommended chain is:

broad search by name

→ use Context to generate several sets of targeted queries

→ find the LinkedIn URL

→ feed it back to scrape the Profile

→ cross-verify with company, role, location, time and shared relationships

→ if the evidence is insufficient, keep it as a weak match

For example "Shi Hongbin Xbanker.ai":

you can't directly conclude that Xbanker.ai is his current company. You can search for "Shi Hongbin" "Xbanker.ai" site:linkedin.com/in. After finding a candidate, check whether Xbanker.ai really appears in the public career history. Only if it matches do you raise the match score; if it doesn't match, you still shouldn't filter this person out early.

The current code has already solved half of it:

unverified companies and roles are no longer used as Apify hard filter conditions. It supports aliases, query variants and LinkedIn URL feedback. It only does a targeted Serp search when there are weak candidates only.

The half still missing is: systematically converting screenshot content into "soft query clues", and re-cross-scoring the search results. Right now soft_context is mainly used to avoid wrong filtering, and hasn't fully played its part in query expansion and candidate ranking.

So the conclusion is: combining Context can clearly solve cases like Chen Bin, Lei Shaoman and Shi Hongbin; but Context can only add evidence, it can't conjure an identity out of nothing. The most reasonable next step is to add "Context query expansion + time-aware cross-scoring".


<!--memo:e3ffa7049b3f-->
### search_social_content and

> 2026-08-19 14:16:01

search_social_content and search_person

At the beginning a workflow or skills can be extracted to make sure search person is used first to establish identity

search_person

> recalls or verifies LinkedIn candidates for one target person; returns career
> identity facts and retrieval coverage; doesn't search social content, doesn't confirm the final identity.

search_social_content

> searches posts or expressions on a specified public platform; returns content, author, source
> and platform coverage; doesn't confirm real-world identity, doesn't modify contacts.


<!--memo:6eae67a6a89b-->
### The title fundamentally serves the user

> 2026-08-24 15:41:09

So the most essential part of the title prompt isn't compressing the content into a title, it's defining the title as a memory hook

Three weeks later, when the user sees the title, they can immediately recall: oh right, it's that thing

The title isn't responsible for summarising, only for awakening a concrete scenario

The title should look for the single detail the user is most likely to remember; when the user sees the detail they can recall the whole conversation

Phrase it the way the user might casually refer to it later when talking to a friend.

the way the user might casually mention it later when chatting with a friend — phrase / name it that way

just grab one detail


<!--memo:362f4619c557-->
### I feel it looks weird now, I've never had a very clear state

> 2026-08-25 00:40:51

I feel it looks weird now, I've never had a very clear state, presented clearly. What exactly should I do? Right now, just after sending a screenshot, when you come in, the title up top is empty. I find that strange — shouldn't its first reaction be to parse out this title? I think the interface could still parse it out in this process. Then at first glance it would look relatively friendlier, and going in you could also see some of the screenshot images

And besides, I think that title could perfectly well be described in some very simple way early on, and then updated later after fuller research — wouldn't that be friendlier? And I think on the right there needs to be a state; shadow is a state of course. But it should also let the user clearly perceive what state it's actually in right now, whether it's finished loading, whether it's read or unread.


<!--memo:e511d7c138c2-->
### Maybe we can add a tool

> 2026-08-28 10:54:07

Maybe we can add a tool that can do a deep dive into the content of a screenshot, or maybe some other skill, to raise the weight of this part


<!--memo:899e2fad15ff-->
### About Calendar and 2Meet

> 2026-08-31 15:15:49

The core information is: Calendar's core information is title, exact date and time, location, participants, conflicts

And 2Meet is the person, the city, and why you want to meet / Notes


## 7. Reading, Ideas and History

*4 entries*

<!--memo:d03cc9061dd1-->
### You could try this method, it might be very effective

> 2026-08-13 21:48:43

I think you could try this method, it might be very effective. At the beginning, aim at one specific problem, then use the small to see the big — keep magnifying this problem, and analyse the surrounding frameworks and their connected systems. But the precondition is that you can really locate the problem precisely. If there's no way to locate the problem, you still have to go back to the overall process framework to analyse it, or use logs to trace out the corresponding problem and see what the problem actually is right now


<!--memo:9a9fe2bd2188-->
### The earlier version, wait for while to review it for me

> 2026-08-20 10:05:53

Let while review the earlier version for me; what I'm doing now is the integration of tools like Xiaohongshu and Reddit


<!--memo:3095452e3c49-->
### Open-ended questions can be evaluated and scored

> 2026-08-25 17:27:24

The evaluation system can be built around a few dimensions

for example sincerity of tone, how smoothly the tools were called, whether the answer is accurate and restrained, whether it's inferred from facts


<!--memo:1de1fba79081-->
### Kevin Kelly's lifelong methodology is to give up centralized control, trust

> 2026-08-29 16:44:00

Kevin Kelly's lifelong methodology — its core is giving up centralized control, trusting emergence (the thesis of the whole book Out of Control)

Kelly has a very particular detail about him — he made himself a "remaining days countdown clock", reminding himself every day how many days he has left in life; he also repeatedly emphasized that "time is more important than money"

And what the Musk system wants is exactly to conscript a person's entire time into his own goals (Mars, AI, the energy revolution); these are Musk's "long-term projects", not Kelly's


## 8. Travel, Places and Cities

*3 entries*

<!--memo:c61167752f9c-->
### That Nepal border crossing looks really dangerous, there's basically no way to escape

> 2026-08-26 21:13:40

It's almost impossible to escape. I saw they were running downstream, which is an absolutely unthinkable thing to do. The correct thing to do should be to run to higher ground

Move to the high ground on both sides of the river

If there's absolutely no time, you should move perpendicular to the valley direction as fast as possible to the high ground on both sides, because what we actually need is lateral distance


<!--memo:f82550e7b526-->
### About the screensaver

> 2026-08-29 14:15:16

The screensaver shows photos I took while living nomadically and observing, day after day

While living nomadically, you didn't need to flip through photos, because happiness was the current environment; now photos have become important because current life can't continuously supply that feeling. The screensaver is like a "time interface", briefly restoring that past self — the one who had time, could observe, could feel — into the present

This me who is filled up by work right now isn't all of me. That person who would travel, observe the world, feel the scenery still exists


<!--memo:891763cdb90d-->
### Meeting commitments:

> 2026-08-31 11:14:29

Calendar: a commitment that already occupies a definite time resource

2Meet: an offline meeting opportunity not yet scheduled, but worth keeping

The same atomic commitment can only belong to one of these at a given moment

Once a 2Meet gets scheduled, it should explicitly be promoted to a Calendar, and the original pending state ends

Relatively speaking, Calendar is already booked for Wednesday, but the specific time is still to be decided

But if it's just a chat online, that doesn't count as a 2Meet, and without a time you can't create a Calendar either

Meeting Zhang San on Wednesday, and next time going to Shanghai to see Li Si — these are two independent commitments, one a Calendar, one a 2Meet
