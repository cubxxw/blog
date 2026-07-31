---
title: 'Off-Site Trust for GEO: Identity, Evidence, and Ethical Distribution'
ShowRssButtonInSectionTermList: true
date: 2026-07-11T11:00:00+08:00
lastmod: 2026-07-31T12:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - GEO
  - AI Search
  - Content Strategy
  - SEO
  - AI
  - LLM
categories:
  - Development
description: >
  A practical 2026 guide to off-site GEO trust: author identity, third-party evidence, ethical community distribution, and repeatable citation measurement.
cover:
  image: '/images/columns/geo/en-04-trust.svg'
  alt: 'A verifiable network connecting an author, original work, independent evidence, and reader communities'
tldr:
  - "E-E-A-T is a Google self-assessment concept, not a single ranking factor and not a disclosed cross-platform citation algorithm."
  - "Author pages and sameAs markup can help people and Google disambiguate identity; they do not guarantee that an answer engine will cite you."
  - "Third-party sources dominate some brand-answer datasets, but source mixes vary by language, market, platform, prompt, and date. Prevalence is not proof of causal trust."
  - "Distribute work where the intended readers already gather, disclose your relationship, follow community rules, and never manufacture endorsements or edit Wikipedia for promotion."
  - "Measure owned, earned, community, and institutional evidence separately with a fixed prompt set, repeated runs, citation support checks, and reader outcomes."
maturity: budding
columns:
  - geo
series:
  name: Generative Engine Optimization
  slug: geo
  order: 4
  total: 6
---

## The answer first: trust is evidence, not a platform trick

A technically healthy page can be crawlable, clear, and quotable and still receive no visible citation from an answer engine. That does not prove a hidden “trust gate” rejected it. The page may never have been selected, another source may have matched the prompt better, the answer may have absorbed its facts without linking it, or the platform may have behaved differently on that run.

Off-site evidence still matters — first for people, and sometimes for the systems that retrieve information about a person, project, or brand. The careful claim is:

> Make identity and evidence easy to verify, earn independent discussion by doing useful work, and measure whether that changes source selection or reader behavior.

This is **Chapter 4 (Trust & Endorsement)** of the *Generative Engine Optimization* series. The [previous chapter](/ai-agent/posts/geo-structured-content-tactics/) focused on on-site structure. This chapter asks what happens beyond the domain without turning community participation into a ranking scheme.

## E-E-A-T: useful guidance, not a citation score

Google describes E-E-A-T as **Experience, Expertise, Authoritativeness, and Trustworthiness**. Its [people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) says automated systems use a mix of factors that can identify aspects of E-E-A-T, with trust the most important. It also says something many marketing summaries omit:

> E-E-A-T is not a specific ranking factor.

Google's quality raters use the concept to evaluate whether ranking systems produce helpful results. Rater judgments do not directly set the ranking of a page. And Google does not say E-E-A-T is a shared citation score used by Perplexity, ChatGPT, Claude, or every other answer engine.

That boundary leaves plenty of useful work.

### Experience

Show what you actually did:

- the environment and version;
- the decision you made;
- the failure you observed;
- the before-and-after measurement;
- the part that did not work;
- the date the observation was still true.

“I reduced a Hugo build from 18 seconds to 6 seconds on a 1,100-page site” is useful only when those conditions are real and visible. A number without its setup is decoration.

### Expertise

Use terms accurately, distinguish fact from inference, cite original evidence, and correct the page when the field changes. Expertise is not the number of acronyms in a paragraph. It is the reader's ability to follow the reasoning and test the claim.

### Authoritativeness

Authority is contextual. An official specification is authoritative for an API contract. A maintainer may be authoritative about a project's release process. A long-time user may be the best source for a failure mode the manual omits. No single directory or social platform confers authority across every question.

### Trust

Trust begins with ordinary publishing discipline:

- a visible author and a useful author page;
- clear dates and update history;
- contact and correction paths;
- HTTPS and non-deceptive behavior;
- sources that support the nearby claim;
- disclosure of incentives, sponsorship, and affiliation;
- privacy practices appropriate to what the site collects.

These practices help a reader decide whether to rely on the page. That alone is enough reason to do them.

## Identity consistency: what author markup can and cannot do

Google's [Article structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/article) recommends identifying an author with the correct `Person` or `Organization` type and a valid `url` or `sameAs` property. Its purpose is author disambiguation: helping Google understand who created the content.

That supports a clean identity graph:

```text
article author
    ↓
canonical author page
    ↓
official profiles and work
```

It does not support the stronger promise that adding another social URL increases AI citation probability.

For my blog, the current canonical `Person` node lists **seven** `sameAs` URLs:

1. cubxxw.com;
2. GitHub;
3. X;
4. LinkedIn;
5. Zhihu;
6. Bilibili;
7. YouTube.

The right maintenance work is not to make that list as long as possible. It is to ensure:

- every URL actually belongs to me;
- the visible author name matches the markup;
- profile descriptions do not contradict one another;
- obsolete accounts are removed;
- the author page explains relevant experience rather than only listing icons;
- structured data matches what a user can see.

Identity markup reduces ambiguity. Reputation still has to come from work and evidence.

## What off-site citation research actually shows

The previous version of this article claimed that Wikipedia and Reddit made up 66.4% of all AI citations, that Reddit and YouTube made up 78.2% of social citations, and that particular engines had fixed platform preferences. Those numbers were not tied to a primary dataset and methodology strong enough to carry the universal wording. They are gone.

A better example is the 2026 preprint [*How Large Language Models Source Brand Reputation Across Languages and Markets*](https://arxiv.org/abs/2606.25787). In its dataset, 85.7% of citations used for brand-reputation answers pointed to third-party sites rather than brand-owned sites.

That finding is useful and bounded:

- it concerns brand-reputation questions, not every informational query;
- it measures a particular set of platforms, brands, languages, prompts, and dates;
- a third-party citation can be positive, negative, neutral, accurate, or wrong;
- citation prevalence does not reveal a platform's private ranking feature;
- the source mix varied by market — the paper reports YouTube leading for its Polish brand sample and local careers sites exceeding Polish Wikipedia.

The durable observation is **source ecology varies by market**. The dangerous shortcut is “put my brand on Reddit and Wikipedia because models trust those domains.”

### Citation frequency is not causal endorsement

Suppose Reddit is frequently cited in a dataset. Several explanations can coexist:

- the prompts ask for user experience;
- relevant discussions are abundant and indexable;
- the platform ranks well in upstream search;
- answers seek viewpoint diversity;
- the dataset overrepresents categories where Reddit is useful;
- current product partnerships or experiments affect retrieval.

The count alone cannot tell us which explanation caused a specific citation.

“Mentioned often” is also not the same as “endorsed.” A safety incident, lawsuit, outage, or hostile review can generate abundant third-party references. Measure sentiment and claim support separately from domain frequency.

## A source-type model that is more useful than a domain leaderboard

I group off-site evidence by relationship, not by a supposedly magical hostname.

| Source type | Examples | What it can establish | Main risk |
|---|---|---|---|
| **Owned** | Blog, docs, GitHub organization, official release notes | What you claim, publish, and maintain | Self-description without independent support |
| **Earned editorial** | Independent article, newsletter, podcast, conference report | Another party considered the work worth covering | Incentives, shallow summaries, copied claims |
| **Community** | Forum thread, issue discussion, Q&A, user review | Lived experience, objections, edge cases | Brigading, unverifiable anecdotes, manipulation |
| **Institutional** | Standards body, university, regulator, professional society | Formal definitions, evidence, policy, credentials | Scope mismatch and outdated documents |
| **Reference/directory** | Wikidata, registries, curated catalogs | Identity, identifiers, discoverability | Incorrect records, notability and conflict-of-interest rules |

No row automatically outranks another. Match the source to the claim:

- use an official release note for a version;
- use an incident report for a failure;
- use an independent benchmark for a comparison;
- use a community discussion to discover a problem, then verify it;
- use a registry for an identifier, not an opinion.

Trust is not “how many famous domains mention me.” It is whether the right kind of evidence supports the question being asked.

## Distribution is for readers first

A personal blog has no newsroom or PR budget. It does have something large sites often struggle to preserve: the exact texture of doing the work.

Distribution begins by finding where the intended readers already talk:

| Reader and task | Possible channels |
|---|---|
| Chinese engineering discussion | Zhihu, Juejin, V2EX, Bilibili, relevant WeChat communities |
| Global developer discussion | Project forums, Hacker News, Lobsters, dev.to, a relevant subreddit |
| Open-source implementation | GitHub README, release notes, issues, discussions, curated lists |
| Research or standards work | Conference community, field newsletter, institutional repository |

This table is an **audience heuristic**, not a ranking-factor map. A different project may need none of these channels.

### Adapt, do not spray

One strong article can become:

- a concise answer to a community question;
- a reproducible repository;
- a demo video;
- a failure-focused postmortem;
- a conference proposal;
- a short note that invites critique.

Each version should fit the norms of its venue. Copy-pasting the same promotional paragraph everywhere is not distribution. It is noise with a backlink.

### GitHub is evidence when the artifact is real

A repository can make a technical claim inspectable: code, tests, release history, issues, and reproduction steps are stronger than a sentence saying “I have experience.”

That does not make every GitHub link a strong E-E-A-T signal. An empty repository created for a backlink proves almost nothing. Build an artifact because readers can run it; let any citation benefit remain an outcome to measure.

## Community ethics are part of trust

If the strategy requires hiding your relationship to a page, it is already consuming trust rather than building it.

### Disclose affiliation

When sharing your article or project, say that you wrote or maintain it. A reader can evaluate self-reference honestly; they cannot evaluate an undisclosed campaign.

### Follow venue rules

Some communities welcome project posts on specific days, some require substantive participation, and some prohibit self-promotion. Read the rules before posting. A link removed for violating community norms is not an endorsement failure. It is a distribution failure.

### Do not manufacture discussion

No sockpuppets, purchased comments, coordinated fake questions, fabricated reviews, or mass-generated “independent” articles. Besides being deceptive, manufactured consensus contaminates the evidence other people rely on.

### Treat Wikipedia as an encyclopedia, not a channel

Wikipedia has notability, reliable sourcing, neutrality, and conflict-of-interest rules. Do not create or edit an article about yourself or your project as a GEO tactic. If independent coverage eventually supports notability, uninvolved editors decide what belongs there.

### Preserve criticism

An honest issue thread that finds a bug may look less flattering than a polished launch post, but it creates evidence about how the project responds. Deleting valid criticism to keep a clean “entity footprint” destroys exactly the trust the strategy claims to seek.

## A repeatable off-site measurement protocol

The goal is not to prove that one mention caused one answer. It is to detect changes without lying about uncertainty.

### 1. Define the question families

Use a fixed set such as:

```text
branded:
- What is cubxxw?
- Who writes cubxxw.com?

category:
- Independent technical blogs about Hugo and AI agents
- Practical sources for building agent harnesses

comparison:
- cubxxw versus [relevant alternative] for [specific task]

evidence:
- What projects or publications support cubxxw's experience with [topic]?
```

Some small personal sites will not deserve an answer to broad recommendation prompts. “No answer” is valid data.

### 2. Record the environment

For every run, retain:

- platform and product mode;
- visible model, if exposed;
- exact prompt;
- date, language, country, and login state;
- answer and citation URLs;
- whether each source is owned, earned, community, institutional, or reference;
- whether the citation supports the attached claim;
- sentiment: positive, negative, neutral, or mixed.

### 3. Separate the outcomes

Following the measurement model from [Chapter 2](/ai-agent/posts/geo-how-ai-retrieves-and-cites/), track:

- **selection**: was a source visibly selected or cited?
- **absorption**: did the answer use a distinctive fact, phrase, or piece of evidence?
- **identity accuracy**: did it connect the correct person, site, and project?
- **claim support**: did the cited page entail the answer?
- **reader outcome**: did referrals lead to useful engagement?

Do not merge them into a single “trust score” before inspecting each component.

### 4. Establish a baseline and control

Run the prompt set repeatedly across several days before an intervention. Then change one distribution variable:

- publish a real repository for one article;
- contribute a substantive answer in one community;
- correct identity inconsistencies;
- add an author page with verifiable experience;
- earn one independent review or podcast discussion.

Keep unrelated pages as controls. Repeat the same prompts. Report the numerator, denominator, time window, and uncertainty.

### 5. Set a review and stop condition

There is no universal “trust takes three months” rule. Choose a review date based on the publishing cadence and expected discovery delay. Stop an experiment when:

- the channel sends no relevant readers after the agreed window;
- participation requires repeated self-promotion;
- citation changes cannot be separated from platform drift;
- maintaining the channel costs more than the reader value it creates;
- the intervention conflicts with community rules or editorial integrity.

Slow does not automatically mean compounding. Sometimes slow means the channel is wrong.

## What I would change on this blog

The existing foundation is better than the old article described:

- the canonical `Person` entity connects seven verified profiles;
- articles already point to a real author;
- technical posts often include first-hand commands, failures, and artifacts;
- the bilingual site creates opportunities to test market and language differences.

The next work is small and observable:

- make the author page explain relevant projects and current roles, not merely list profiles;
- audit that visible biographies match structured data;
- choose three technical posts with runnable artifacts;
- share each only in communities where the answer fits an existing conversation;
- disclose authorship on every share;
- record referral quality and fixed-prompt citation behavior;
- keep negative and neutral mentions in the evidence ledger.

I would not open seven new social accounts, chase a Wikipedia page, or turn every article into ten copies. Identity becomes clearer through consistency. Reputation becomes stronger through useful work that other people have reasons to discuss.

## FAQ

### Can a solo author have authority?

Yes, within a bounded subject and claim. Authority is not a permanent rank attached to a person. Repeated first-hand work, correct explanations, inspectable artifacts, corrections, and independent use can make an author a useful source for a particular question.

### Should I post every article to Reddit?

No. Use a subreddit only when the article answers a real question there and the rules allow self-authored links. The same principle applies to every community.

### Does `sameAs` improve AI citations?

Google documents `sameAs` and author URLs as identity-disambiguation aids. It does not promise an AI-citation lift. Implement accurate markup, then measure outcomes rather than announcing a causal signal.

### Are backlinks irrelevant now?

No. Links can help readers discover material and remain part of the broader web and search ecosystem. But a link's meaning depends on context. A genuine citation from a relevant document is not equivalent to a directory entry or a manufactured profile.

### How long does off-site trust take?

There is no universal duration. Set a baseline, an intervention, a review window, and a stop condition. Report what changed and what did not.

## What endorsement really means

The old article reduced endorsement to a domain leaderboard: get mentioned on the sites models cite, then wait for trust to flow back. It was attractive because it turned reputation into a shopping list.

Real endorsement is harder:

```text
useful work
    ↓
inspectable evidence
    ↓
independent use, discussion, or criticism
    ↓
accurate identity and claim linkage
    ↓
measured reader and citation outcomes
```

You cannot command the middle of that chain. You can make the work worth testing, make your relationship transparent, and preserve the evidence when other people respond.

Trust is not what a profile says about itself.

Trust is how well a claim survives the trip through other people's hands.

- **Previous**: [GEO Structured Tactics](/ai-agent/posts/geo-structured-content-tactics/)
- **Next**: [Blog Rebuild Case Study](/ai-agent/posts/geo-blog-rebuild-case-study/)
