---
title: 'GEO Trust & Endorsement: Why Reddit and Wikipedia Make Up Half of AI Citations'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T11:00:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['GEO', 'E-E-A-T', 'off-site endorsement', 'third-party citations', 'Reddit', 'Wikipedia', 'entity consistency', 'sameAs', 'digital PR', 'community distribution', 'backlinks', 'AI citations', 'topical authority']
tags:
  - GEO
  - E-E-A-T
  - Digital PR
  - Content Strategy
  - AI Search
  - Community
  - Branding
description: >
  Your technical base and structure are right — so why still no AI citations? Because the final gate is trust, and most trust comes from off-site. This chapter covers operationalizing E-E-A-T, building entity consistency, why Reddit + Wikipedia are 66% of AI citations, and how a personal blog builds off-site endorsement pragmatically. Chapter 4 of the GEO series.
cover:
  image: 'images/columns/geo/en-04-trust.svg'
  alt: GEO trust and endorsement cover showing entity consistency and community proof
tldr:
  - Retrieved and top-ranked still don't mean cited - citation hinges on trust, and most trust comes from how others talk about you, not how you talk about yourself.
  - Hard data - Wikipedia and Reddit together account for 66.4% of all AI citations; Reddit is the single most-cited domain. Off-site corpora are the substrate of AI answers.
  - But don't blindly chase Reddit/Wikipedia. Engines differ - Perplexity leans heavily on Reddit; Claude rarely cites Reddit/Wikipedia in the top slot, favoring brand domains and institutional sources. The real driver is being genuinely, authoritatively mentioned.
  - E-E-A-T must become visible signals - a real author page, first-hand experience, a clear About, and consistent cross-platform identity (sameAs) - these feed AI and earn human trust.
  - A personal blog's pragmatic play - distribute core content sincerely to the right communities (Zhihu/Juejin/WeChat in China; Reddit/HN/dev.to globally), build backlinks via GitHub projects - not mass-produced spam.
maturity: budding
columns:
  - geo
series:
  name: Generative Engine Optimization
  slug: geo
  order: 4
  total: 6
---

## The answer first: the final gate is trust, not content

**You can max out your technical base and turn every paragraph into extractable LEGO — and AI may still not cite you. Because the final citation gate hinges on trust, and most trust comes from off-site: how others talk about you, where you're mentioned on high-credibility platforms. This chapter turns that invisible trust into operable signals.**

The first three chapters solved crawlable, understandable, and quotable (layers L1–L4 of the model). This one is the hardest and most differentiating: **L5, Endorsed.**

> This is **Chapter 4 (Trust & Endorsement)** of the *Generative Engine Optimization* series. The last chapter was on-site structure; this one is off-site reputation; the next (Chapter 5) lands the whole model on my own blog with real data.

---

## 1. E-E-A-T: turning "trustworthy" into visible signals

Google and the AI engines decide whether to trust you via **E-E-A-T** — Experience, Expertise, Authoritativeness, Trust. It's not mysticism; it's a set of signals you can operationalize:

- **Experience (first-hand)**: write what you've actually done and actually broken. "I cut a build from 18s to 6s on a 1,100-page site" beats "Hugo is said to be fast" a hundredfold. First-hand experience is the original signal AI favors — and a personal blog's biggest moat.
- **Expertise**: depth, accurate terminology, internal consistency. Back key claims with data and sources (echoing Princeton's +22–41%).
- **Authoritativeness**: who you're "considered to be" in the field. This one is mostly **off-site** — see sections 3 and 5.
- **Trust**: clear author info, About page, contact, privacy policy, HTTPS, no deceptive content. Trust is E-E-A-T's foundation.

**Action**: attribute every post to a real author, link to a detailed author page; make that page say who you are, what you've done, and why you're credible.

---

## 2. Entity consistency: help AI recognize "the same person"

To cite you, AI must first recognize the scattered "you" as a single **entity**. The more consistent your name, title, bio, and field are across platforms, the stronger the entity signal.

- **Unify identity**: use the same name and a consistent bio across your site, GitHub, Zhihu, Bilibili, LinkedIn — don't be "Xinwei Xiong" in one place and something else elsewhere.
- **`sameAs` structured data**: in `Person` schema, use `sameAs` to string all your official profiles together — telling machines "these accounts are all me."
- **Knowledge graph / entity databases**: as influence grows, aim to be listed in Wikidata, industry wikis, and authoritative directories — high-trust sources AI uses to build its entity→attribute picture.

> **My blog's state**: article pages' `Person` schema already carries `sameAs`, linking GitHub, Zhihu, Bilibili, YouTube. That's right; the work is keeping name/bio consistent across all four and expanding the `sameAs` list as influence grows.

---

## 3. Off-site endorsement is the hidden variable: the hard data

Many optimize only their own site and miss that AI's "trust" mostly comes from **other people's turf**. The 2026 citation data is blunt:

> **Wikipedia and Reddit together account for 66.4% of all AI citations; Reddit is the single most-cited domain, followed by YouTube and LinkedIn. Reddit and YouTube combined make up 78.2% of AI social citations.** ([Search Engine Land](https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138), [Everything-PR](https://everything-pr.com/ai-platform-citation-source-index-2026))

Why them? Because **AI weighs both "perceived authority" and "authentic user input"**: Reddit captures real discussion; Wikipedia is structured, neutral, multilingual, CC-licensed — treated by AI as a "high-trust, low-risk" safe source. ([Bowen Craggs](https://www.bowencraggs.com/our-thinking/latest-articles/what-to-know-about-reddit-and-wikipedia-in-the-ai-search-age/))

**Implication**: even if your blog isn't cited directly, being genuinely discussed, mentioned, and linked on these high-trust platforms puts you into the substrate of AI answers.

---

## 4. But don't blindly chase Reddit: engines differ

Reacting to that data by mass-posting on Reddit/Wikipedia is another trap. Two things to stay clear on:

1. **Engines have very different tastes**: Perplexity's Reddit citation concentration runs 20–24%; whereas **Claude rarely cites Reddit/Wikipedia/YouTube in the top slot, favoring brand domains, educational institutions, and compliance-grade sources.** ([Search Engine Land](https://searchengineland.com/reddit-wikipedia-what-drives-ai-recommendations-472580)) So which engine your readers use decides which channel to weight.
2. **The real driver is being genuinely mentioned, not appearing on a domain.** The industry already has sober voices: "stop blindly chasing Reddit and Wikipedia" — appearing is just entry; being naturally, positively, authoritatively discussed is the true cause of citation. ([Search Engine Land](https://searchengineland.com/reddit-wikipedia-what-drives-ai-recommendations-472580))

This returns us to [Chapter 1](/ai-agent/posts/geo-generative-engine-optimization-guide/)'s floor: **black-hat "poisoning" (mass fabricated articles to fake presence) may work briefly, but platforms patch it, regulators punish it, and reputation collapses with interest.** White-hat endorsement is slow but compounds — and is safe.

---

## 5. A personal blog's pragmatic distribution play

A personal blog has no PR budget, but something scarcer: **real first-hand experience.** Sincerely delivering it to the right places is the best endorsement.

**Pick channels by where your readers are:**

| Scenario | Priority channels |
|---|---|
| Chinese readers | Zhihu, WeChat, Juejin, V2EX, Bilibili, CSDN |
| English readers | Reddit (the right subreddit), Hacker News, dev.to, Lobsters, official docs / Awesome lists |
| Developers / open source | **GitHub** (project READMEs, Awesome listings, issues/discussions), Stack Overflow |

**A few rules so it isn't spam:**

- **Be useful first, link second**: sincerely answer questions and add value in communities, citing your in-depth posts along the way. Ads get removed; value gets upvoted.
- **Repurpose (one fish, many dishes)**: one pillar post can become a Zhihu answer, a Juejin short, a Reddit discussion, a Bilibili video script — adapted per platform, all pointing back to the same authoritative source.
- **GitHub is a developer's natural authority venue**: distill the tools/practices you write about into repos, READMEs, and Awesome listings — both backlinks and strong E-E-A-T signals.
- **Earn third-party mentions**: being mentioned in others' articles, newsletters, and podcasts beats self-promotion — research repeatedly shows AI favors earned media over self-praise.

> **My blog's state**: the `sameAs` identity matrix is in place, but technical posts have **thin off-site discussion and backlinks**. The pragmatic next step: pick 3–5 core technical posts (Hugo, AI tools, Go), distribute to Zhihu/Juejin/HN, and backlink from the corresponding GitHub project pages.

---

## 6. Back to my blog: the trust-layer checklist

- [ ] Flesh out the author/About page: "who you are, what you've done, why you're credible" (Experience + Trust).
- [ ] Verify name/bio consistency across the four profiles (site/GitHub/Zhihu/Bilibili); expand `Person.sameAs`.
- [ ] Foreground first-hand experience and real data in every core post (Experience + Expertise).
- [ ] Pick 3–5 core posts and distribute sincerely to matching communities (Zhihu/Juejin/HN/the right subreddit).
- [ ] Distill tools/practices from posts into GitHub repos / Awesome listings for backlinks and authority.
- [ ] Note which engines (Doubao/Perplexity/ChatGPT) your readers favor, and prioritize channels accordingly.

---

## 7. FAQ

**Q: I'm a solo blogger — how can I have "authority"?**
A: Authority ≠ big institution. In a niche, consistently publishing real, deep, community-recognized content *is* authority. A personal blog's first-hand experience is exactly the original signal big sites lack.

**Q: Since Reddit/Wikipedia are 66%, should I spam those two?**
A: Don't. Perplexity does lean on Reddit, but Claude rarely cites them in the top slot, favoring brand and institutional sources. First see which engine your readers use; more importantly, be genuinely mentioned rather than faking presence. ([Search Engine Land](https://searchengineland.com/reddit-wikipedia-what-drives-ai-recommendations-472580))

**Q: Is off-site distribution "poisoning"?**
A: No — as long as it's real, valuable, non-fabricated, non-spammy. Poisoning is "fabricated content + mass articles to manipulate models"; white-hat distribution is "real content in front of the right people." The line is truthfulness.

**Q: How long until it works?**
A: Trust is a slow variable, usually measured in months. It's not as instant as rewriting a title, but once built it's the hardest moat for competitors to copy.

---

## Summary and what's next

The five-layer model is now complete: **Crawlable → Understandable → Trustworthy → Quotable → Endorsed.** Technical, structural, and trust layers are all covered. Next, instead of "how you should do it," I'll take the whole model and run a full diagnose-to-rebuild review using my blog's **real GSC/PSI data**.

- **Previous**: [GEO Structured Tactics — Answer-First, Schema, internal-link clusters](/ai-agent/posts/geo-structured-content-tactics/)
- **Next (Chapter 5 · Blog Rebuild Case Study)**: landing the five-layer model on cubxxw.com with real data — noise vs cluster, the lessons of markitdown and my-hugo, the domain migration, and what's been changed and what's still to change.

---

*Data and viewpoints: Search Engine Land and Everything-PR 2026 AI citation-source research, Bowen Craggs' analysis of Reddit/Wikipedia, and the Princeton GEO study. Links cited inline.*
