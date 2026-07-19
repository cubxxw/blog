---
title: 'GEO Blog Rebuild Case Study: Running the Five-Layer Model on Real Data'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T11:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['GEO', 'case study', 'Google Search Console', 'PageSpeed Insights', 'SEO audit', 'zero-click', 'topic cluster', 'domain migration', 'cubxxw', 'data-driven', 'AI search optimization']
tags:
  - GEO
  - SEO
  - Analytics
  - Content Strategy
  - AI Search
  - Hugo
description: >
  Four chapters of method — now real data. I dug through cubxxw.com's Google Search Console and PageSpeed Insights and diagnosed it layer by layer with the five-layer model: why 878K impressions produced only 852 clicks, which queries are noise and which are gold, how to protect a domain migration, and a priority-ranked rebuild checklist. Chapter 5 of the GEO series.
cover:
  image: '/images/columns/geo/en-05-case-study.svg'
  alt: GEO blog rebuild case study cover showing a real-data dashboard and growth curve
tldr:
  - Real baseline (old domain, last 3 months) - 852 clicks, 878K impressions, 0.1% CTR, average position 13.2. The technical base scores a perfect Lighthouse SEO; the bottleneck is ranking and clicks, not tech.
  - 878K impressions is a vanity metric - the highest-impression queries are all off-topic noise (MBTI/medical/local history) with zero clicks, diluting site CTR to 0.1%.
  - The gold is in clicks - markitdown (96 clicks / 72K impressions), my-hugo (35 clicks / 10.4% CTR benchmark), TDD/LangGraph/NotebookLM. Those technical clusters deserve the investment.
  - Held against the five-layer model - L1 technical base is near-perfect; the real gaps are L2 structure, L3 evidence, L4 FAQ schema, L5 off-site endorsement - mapping one-to-one to the earlier chapters.
  - Domain nsddd.top → cubxxw.com is mid-migration - Change of Address set, 301s path-preserving and verified. The key is keeping old-domain 301s for 180+ days and monitoring both properties.
maturity: budding
columns:
  - geo
series:
  name: Generative Engine Optimization
  slug: geo
  order: 5
  total: 6
---

## The answer first: perfect tech, stuck at "impressions without being chosen"

**I dug through cubxxw.com's real data, and the conclusion is blunt: technical SEO is near-perfect (Lighthouse SEO 100), yet the last 3 months turned 878K impressions into only 852 clicks — a 0.1% CTR at average position 13.2 (page two). The problem isn't the technical layer; it's "impressions without being chosen." This chapter runs the previous four chapters' five-layer model against those real numbers, diagnosis and rebuild schedule included.**

The first four chapters were method; this one is live fire. Every number comes from real Google Search Console and PageSpeed Insights measurements, not a demo.

> This is **Chapter 5 (Blog Rebuild Case Study)** of the *Generative Engine Optimization* series. It lands the [pillar's](/ai-agent/posts/geo-generative-engine-optimization-guide/) five-layer model on my own site's real data.

---

## 1. The real baseline: numbers on the table

First, PageSpeed Insights mobile (real-browser scores):

| Dimension | Score | Note |
|---|---|---|
| Lighthouse SEO | **100** | No technical SEO gaps |
| Best Practices | **100** | Perfect |
| Performance | 90 | LCP 3.3s needs work |
| Accessibility | 86 | Contrast / heading skips / tooltip |
| Agentic Browsing (AI readability) | 2/3 | One tooltip lacks an accessible name |

Then Google Search Console (old domain nsddd.top, last 3 months):

| Metric | Value |
|---|---|
| Total clicks | **852** |
| Total impressions | **878,000** |
| Average CTR | **0.1%** |
| Average position | **13.2** |

**One-line read**: the technical base is perfect (the model's L1), but rankings sit on page two and CTR is abnormally low. Tech isn't the bottleneck — this is the classic profile of a site with "great SEO, no traffic."

---

## 2. The truth about 878K impressions: demystifying a vanity metric

Sort queries by impressions and the truth appears — the highest-impression queries are all noise unrelated to the blog:

| High-impression query (example) | Impressions | Clicks |
|---|---|---|
| "…is Yarkand a self-name…" (local-history long question) | 2,751 | 0 |
| "…free MBTI personality test…" | 1,521 | 0 |
| "…concussion…core analysis…" (medical) | 1,265 | 0 |
| "why is the Luoyang bodhi tree trending" | 833 | 0 |

**These are impressions scraped from low positions (page two and beyond) — zero clicks, zero value — yet they dilute site CTR to 0.1%.** The hard lesson: **don't let "878K impressions" give you a false sense of achievement.** Impressions mean standing in the crowd; clicks/citations mean being called on.

Echoing [Chapter 2](/ai-agent/posts/geo-how-ai-retrieves-and-cites/): these noise queries are "lexical coincidences" (the BM25 lane), but the pages' passages don't survive being lifted out — hence impressions with no citation and no clicks.

---

## 3. The gold is in clicks: finding the clusters to invest in

Switch the lens to clicks, and the genuinely valuable technical clusters surface:

| Page | Clicks | Impressions | CTR | Read |
|---|---|---|---|---|
| [markitdown](/projects/markitdown/) | 96 | 72,268 | 0.13% | Traffic leader, but low ranking — biggest upside to page one |
| [tdd](/projects/tdd/) | 63 | 4,825 | 1.3% | Healthy |
| [notebooklm](/projects/notebooklm/) | 55 | 3,389 | 1.6% | Healthy |
| [langgraph](/projects/langgraph/) | 50 | 4,304 | 1.2% | Healthy |
| [my-hugo](/engineering/posts/my-hugo/) | 35 | 337 | **10.4%** | CTR benchmark — title matches intent |
| [mem0](/projects/mem0/) | 31 | 4,534 | 0.7% | Room to improve |
| a "thought-notes" long post | 27 | 87,834 | **0.03%** | Noise magnet, chief CTR-diluter |

**The two extremes are the most instructive**: `my-hugo` turns 337 impressions into 35 clicks (10.4% CTR) — a model of "content matching intent + extractable passages"; while a thought-notes post turns 87K impressions into 27 clicks (0.03%) — the cautionary opposite.

**Strategic conclusion**: invest in validated-demand technical clusters — **Hugo, AI tools (markitdown/mem0/langgraph/notebooklm/gpt-researcher), Go & engineering practice, TDD** — and spend no content on noise queries. This is [Chapter 3's](/ai-agent/posts/geo-structured-content-tactics/) "topic cluster" made concrete.

---

## 4. Shining the five-layer model on it, layer by layer

Aligning the real state with the previous chapters' five-layer model makes the gaps obvious:

| Layer | Current state | Verdict |
|---|---|---|
| **L1 Crawlable** | robots welcomes GPTBot/ClaudeBot/PerplexityBot/Baidu/ByteDance; 4 JSON-LD types; hreflang; sitemap; llms.txt; SEO 100 | ✅ Near-perfect; entry ticket in hand |
| **L2 Understandable** | Not every post is Answer-First; headings not all question-form | ⚠️ Gap |
| **L3 Trustworthy** | Has first-hand experience but thin "evidence density" of stats/external citations | ⚠️ Biggest opportunity (+25–40%) |
| **L4 Quotable** | Has `tldr`; missing `FAQPage` schema | ⚠️ Partial |
| **L5 Endorsed** | `sameAs` identity set; thin off-site discussion/backlinks for technical posts | ⚠️ Gap |

**Key insight**: a perfect L1 fools you into thinking "SEO is great," but GEO is decided at L2–L5. **A perfect technical base is only the entry ticket; the real moat is structure, evidence, and endorsement.**

---

## 5. A priority-ranked rebuild checklist

Turning diagnosis into a schedule (aligned with the [pillar's](/ai-agent/posts/geo-generative-engine-optimization-guide/) 30/60/90):

**🔴 P0 · Protect the migration (1 week)**
- Keep old-domain nsddd.top 301s for 180+ days; keep both GSC properties and compare curves weekly to confirm equity transfer.
- Re-submit `sitemap.xml` and `news-sitemap.xml` on cubxxw.com; "request indexing" for core pages.
- Verify all 813 old-domain traffic pages 301 to the same path on the new domain (a page like markitdown must never 404).

**🟠 P1 · Win page one + lift CTR (2–4 weeks)**
- Filter GSC for "average position 8–20"; add depth, internal links, and Answer-First openers to those pages ([Chapter 3's](/ai-agent/posts/geo-structured-content-tactics/) craft). Prioritize markitdown, mem0, langgraph.
- Rewrite titles/descriptions of high-impression, low-CTR pages (with numbers/outcome promises), benchmarking my-hugo.

**🟡 P2 · Evidence + Schema + clusters (1–2 months)**
- Add statistics and external citations to core posts (L3, +25–40% visibility).
- Add `FAQPage`/`HowTo` schema to how-to/comparison posts (L4).
- Build "pillar + child + internal-link" clusters around Hugo/AI tools/Go (L4/L5) and distribute core posts to Zhihu/Juejin/HN ([Chapter 4's](/ai-agent/posts/geo-trust-and-endorsement/) endorsement play).
- Fix Accessibility (contrast, heading levels, tooltip aria-label) and LCP along the way.

---

## 6. The domain migration: don't let this one step undo everything

An easily-overlooked, veto-power item: **cubxxw.com was migrated from the old domain nsddd.top.**

- ✅ Change of Address is set in GSC; 301s preserve paths and are verified (`nsddd.top/projects/markitdown/` → 301 → `cubxxw.com/projects/markitdown/`, canonical correct).
- ⚠️ The new-domain property is recent, so Search data is still backfilling — **read history from the old domain now, and watch the new domain absorb the equity over the next 1–3 months.**
- Key actions: **keep old-domain 301s for 180+ days, monitor both properties, verify every redirect.** Any 404 or broken link during migration pours all your prior GEO effort down the drain.

---

## 7. FAQ

**Q: Lighthouse SEO is 100 — why still no traffic?**
A: Because Lighthouse only tests the L1 technical base. GEO traffic depends on L2–L5 (structure, evidence, quotability, endorsement) and real rankings. A perfect technical score is necessary, not sufficient.

**Q: Isn't 878K impressions a lot — why call it vanity?**
A: Because most of it comes from off-topic long-tail noise at low positions with zero clicks. What matters is "precise technical queries + clicks," not total impressions.

**Q: What should I watch most during migration?**
A: Three things — all old-domain 301s valid (no 404s), the two GSC properties' click curves falling/rising, and core traffic pages (e.g., markitdown) indexing normally on the new domain.

**Q: Can I copy this review method to my own site?**
A: Yes. The flow: PSI for the technical base → GSC sorted by both clicks and impressions to find clusters and noise → the five-layer model for gaps → schedule by P0/P1/P2. [Chapter 6](/ai-agent/posts/geo-measurement-and-tools/) gives low-cost measurement and monitoring tools.

---

## Summary and what's next

This chapter turned the five-layer model from "how you should do it" into "here's exactly how my site is, and what to change next." The core, in one line: **a perfect technical score is only the start; the real upside is in structure, evidence, endorsement — and protecting the domain migration.**

But once rebuilt, how do you know it worked? The classic "rank + click" fails in the GEO era. The final chapter builds a low-cost "citation rate" measurement system.

- **Previous**: [GEO Trust & Endorsement — E-E-A-T and off-site distribution](/ai-agent/posts/geo-trust-and-endorsement/)
- **Next (Chapter 6 · Measurement & Tools)**: prompt testing, AI referral traffic, GSC cross-check, Profound/Peec, and a DIY monitor built on this repo's own `geo:audit`/`gsc`/`psi` scripts.

---

*Data source: my real measurements of cubxxw.com (and old domain nsddd.top) via Google Search Console and PageSpeed Insights (July 2026). Methodology in the first four chapters of this series.*
