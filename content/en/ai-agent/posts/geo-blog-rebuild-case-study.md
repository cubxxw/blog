---
title: 'GEO Blog Rebuild Case Study: Running the Five-Layer Model on Real Data'
date: 2026-07-11T11:30:00+08:00
lastmod: 2026-07-31T00:00:00+08:00
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - GEO
  - SEO
  - AI Search
  - Content Strategy
  - Performance
  - Blog
categories:
  - Development
description: >
  A real-data GEO case study using Search Console and Lighthouse to separate noisy impressions from useful demand, protect a domain move, and plan a Hugo rebuild.
cover:
  image: '/images/columns/geo/en-05-case-study.svg'
  alt: 'GEO blog rebuild case study cover showing a real-data dashboard and growth curve'
tldr:
  - "A three-month Search Console snapshot for the old nsddd.top property recorded 852 clicks, 878K impressions, 0.1% aggregate CTR, and average position 13.2; these totals describe a mixed query portfolio, not one ranking problem."
  - "The useful signal appeared after segmentation: Hugo and AI-tool pages earned the clicks, while unrelated long-tail queries contributed many impressions and almost no visits."
  - "A Lighthouse SEO score of 100 proved only that the tested page passed Lighthouse's covered checks; it did not prove that the whole site's technical SEO was complete."
  - "The migration is nsddd.top to cubxxw.com. Google recommends path-preserving redirects for as long as possible, generally at least one year."
  - "The rebuild order is migration integrity first, then query-page analysis and content experiments, followed by evidence, internal structure, accessibility, and measured AI-search visibility."
maturity: budding
columns:
  - geo
series:
  name: Generative Engine Optimization
  slug: geo
  order: 5
  total: 6
---

## The answer first: a clean technical audit was not the same as demand

In July 2026, I put the previous four chapters' five-layer GEO model against my own blog. The useful result was not “technical SEO is perfect.” It was narrower:

> The tested homepage passed every Lighthouse SEO audit, while a three-month Search Console snapshot showed 878K impressions and only 852 clicks. Once I segmented the data, most clicks came from a small technical core, while many impressions came from unrelated long-tail queries.

That distinction changed the rebuild plan. I did not need another week of polishing a score that was already green. I needed to protect the domain migration, understand which query-page pairs had real demand, improve pages where the intent match was weak, and stop treating aggregate impressions as one coherent audience.

This is **Chapter 5** of the *Generative Engine Optimization* series. It applies the [five-layer model](/ai-agent/posts/geo-generative-engine-optimization-guide/) to one real site. It is a dated diagnostic, not a controlled ranking experiment.

## Data provenance and limits

The original version of this chapter mixed private analytics, Lighthouse lab output, and a local accessibility check in one table. That made the evidence look cleaner than it was. Here is the actual measurement boundary.

| Source | Scope | Snapshot | What it can support |
|---|---|---|---|
| Google Search Console | `nsddd.top` domain property; Google Search, Web; all countries and devices | Trailing three-month window ending July 10, 2026 | Clicks, impressions, CTR, approximate average position, query and page segmentation |
| PageSpeed Insights | Mobile test of the `cubxxw.com` homepage | July 10, 2026 | Lighthouse lab diagnostics; CrUX field data only when PSI reports enough real-user samples |
| Local agent-readiness check | Three project-defined accessible-interaction checks | July 10, 2026 | A repository-specific review, not a Google or industry score |

The Search Console totals and sample rows came from a private export. I have kept example queries partially redacted because queries can contain sensitive wording. Search Console omits some anonymized queries and truncates ordinary table data; its totals and exported rows therefore need to be read with those limits in mind. Google's [documentation on data grouping](https://support.google.com/webmasters/answer/17011259) explains those constraints.

This case study reports what I saw. It cannot prove that a particular edit caused a ranking change because there is no before-and-after experiment here.

## The baseline, split into three kinds of evidence

### 1. Search Console: observed search performance

| Metric | Value |
|---|---:|
| Total clicks | **852** |
| Total impressions | **878,000** |
| Aggregate CTR | **0.1%** |
| Average position | **13.2** |
| Pages with reported rows | **813** |

Average position is an approximate, aggregated metric—not a literal statement that every result sat on “page two.” Search result features occupy positions differently, and property-level reporting uses the topmost result from the property. Google recommends focusing more on trends in impressions and clicks than on position alone. See the official definitions of [impressions, clicks, and position](https://support.google.com/webmasters/answer/7042828) and the [Performance report's aggregation rules](https://support.google.com/webmasters/answer/17011364).

### 2. PageSpeed Insights: Lighthouse lab diagnostics

| Lighthouse category | Score | Interpretation |
|---|---:|---|
| SEO | **100** | The tested page passed the SEO audits covered by that Lighthouse run |
| Best Practices | **100** | The tested page passed the included best-practice audits |
| Performance | **90** | Good lab score; the reported LCP diagnostic still deserved investigation |
| Accessibility | **86** | Automated checks found contrast, heading, or accessible-name work |

These are not all “real-browser measurements.” PageSpeed Insights can show both CrUX field data and Lighthouse lab data. The category scores above come from a simulated Lighthouse run; field data comes separately from real Chrome users when enough samples exist. Google's [PSI documentation](https://developers.google.com/speed/docs/insights/v5/about) makes that split explicit.

A Lighthouse SEO score of 100 does **not** prove that the whole site has no technical gaps. It does not, by itself, validate every redirect, canonical, hreflang pair, sitemap entry, structured-data graph, internal link, or indexed URL. It says the tested page passed the checks that version of Lighthouse ran.

### 3. Local check: agent-facing interaction

The earlier “Agentic Browsing 2/3” row was my own three-item test. It found one tooltip without an accessible name. It was useful as a local regression check, but it was never a PageSpeed Insights metric. I now keep it outside the Lighthouse table so the provenance remains visible.

## What 878K impressions did—and did not—mean

The total was not “fake,” and an impression is not a scrape. It meant that Google counted the property as appearing in search results under its reporting rules. The problem was interpretation: the aggregate joined several very different kinds of demand.

Sorting the query export by impressions surfaced long questions unrelated to the blog's technical focus:

| Redacted query example | Impressions | Clicks |
|---|---:|---:|
| local-history question about Yarkand | 2,751 | 0 |
| free MBTI test query | 1,521 | 0 |
| medical query about concussion | 1,265 | 0 |
| question about a Luoyang bodhi tree | 833 | 0 |

Those rows lowered the arithmetic aggregate CTR because the denominator contained impressions that rarely produced visits. That does **not** demonstrate a sitewide CTR penalty, nor does it show that Google punished the domain. It simply means “0.1% site CTR” was too coarse to guide an edit.

The better question was: *for each query family, which page appeared, at what approximate position, and did the page satisfy that intent?*

This is close to the distinction in [Chapter 2](/ai-agent/posts/geo-how-ai-retrieves-and-cites/): lexical overlap can expose a page to a query without making the passage a good answer. But this dataset contains Google Search performance, not AI citation data, so I cannot infer citation failure from a zero-click row.

## The useful demand appeared in page-level clicks

Sorting by clicks revealed the technical core:

| Current canonical page | Clicks | Impressions | CTR | What I would test |
|---|---:|---:|---:|---|
| [MarkItDown](/projects/markitdown/) | 96 | 72,268 | 0.13% | Segment its actual query families before changing title or content |
| [TDD](/projects/tdd/) | 63 | 4,825 | 1.3% | Preserve the query-page match; expand only where evidence shows gaps |
| [NotebookLM](/projects/notebooklm/) | 55 | 3,389 | 1.6% | Strengthen source-grounded use cases and internal links |
| [LangGraph](/projects/langgraph/) | 50 | 4,304 | 1.2% | Separate architecture, persistence, and recovery intents |
| [my-hugo](/engineering/posts/my-hugo/) | 35 | 337 | **10.4%** | Use as a hypothesis for clear intent match, not a universal CTR benchmark |
| [Mem0](/projects/mem0/) | 31 | 4,534 | 0.7% | Compare title and passage coverage against high-impression queries |
| long thought-notes page | 27 | 87,834 | **0.03%** | Identify the unrelated query families before deciding whether to edit |

`my-hugo` had the highest CTR in this small table, but 337 impressions are not enough to declare its title a causal template for every page. `MarkItDown` had the largest upside-looking gap, but its 72K impressions might represent many intents and positions. The next step is query-page segmentation, not an automatic title rewrite.

The durable strategy is still to invest in subjects where the site has demonstrated reader demand: Hugo, AI tools, Go and engineering practice, and TDD. That is a better basis for a topic cluster than chasing unrelated high-impression queries. [Chapter 3](/ai-agent/posts/geo-structured-content-tactics/) explains the structural side of that choice.

## Running the five-layer model without turning it into a score

The model is a review frame, not a Google or AI-platform ranking formula.

| Layer | Evidence observed in July 2026 | What remained unproven |
|---|---|---|
| **L1 · Crawlable** | robots rules, sitemap, hreflang, canonical tags, JSON-LD templates, and a clean Lighthouse SEO run | Complete crawl and index coverage; crawler access does not guarantee selection or citation |
| **L2 · Understandable** | headings and `tldr` on many posts | Consistent answer-first structure and unambiguous page intent across the archive |
| **L3 · Trustworthy** | first-hand project experience and some measured data | Sufficient primary sources, reproducible snapshots, and explicit claim boundaries |
| **L4 · Quotable** | concise summaries, internal series, and structured sections | Actual extraction or citation rates in AI products |
| **L5 · Endorsed** | author identity and some external profiles | Independent discussion, links, and citations for the technical clusters |

The useful conclusion is modest: the tested technical entry points were in good shape, while structure, evidence, and independent endorsement offered more obvious work. The data did not establish a percentage lift for any layer, so this article no longer promises one.

## A rebuild queue ordered by risk and evidence

### P0: protect the domain move

The real migration is **`nsddd.top` → `cubxxw.com`**.

- Keep path-preserving permanent redirects for as long as possible, **generally at least one year**, following [Google's site-move guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).
- Keep both Search Console properties verified while signals move.
- Test the redirect map in bulk, especially the 813 URLs that had rows in the old property.
- Verify that high-click paths such as `/projects/markitdown/` resolve directly to the intended canonical page.
- Submit the current sitemap and inspect representative URLs; do not treat “request indexing” as a guarantee or a queue-jump.

There is no reliable universal promise that authority will transfer in one to three months. Crawl frequency, site size, redirect quality, and the wider search system all affect timing. The measurable job is to watch old and new properties, redirects, canonicals, indexed pages, clicks, and impressions.

### P1: test query-page fit

For pages with meaningful impressions:

1. group related queries rather than reading one aggregate row;
2. compare the query family with the page's title, opening answer, and section coverage;
3. inspect trends over comparable periods;
4. change one material variable at a time where practical;
5. record the edit date and evaluate after enough new data accumulates.

Average position 8–20 can be a useful investigation filter, not a guaranteed “quick win.” Improve a title only when the snippet and page genuinely under-serve the observed intent. Add internal links when they help a reader continue the subject, not merely to move abstract authority.

### P2: improve evidence and structure

- Add primary sources or reproducible project evidence to claims that currently rest on assertion.
- Give major technical clusters a maintained pillar and a small set of focused child pages.
- Fix heading order, contrast, accessible names, and performance regressions independently of search promises.
- Keep FAQ sections when they answer real reader questions.
- Use structured data only when it accurately describes visible content.

There is an important 2026 boundary here: Google normally limits `FAQPage` rich results to authoritative government and health sites, and `HowTo` rich results were deprecated in Google Search in 2023. Adding either markup to a personal technical blog is not a CTR strategy. Google's [FAQ and HowTo change notice](https://developers.google.com/search/blog/2023/08/howto-faq-changes) is explicit. Structured data may help a search engine understand eligible content, but it guarantees neither a rich result nor an AI citation.

### P3: measure AI-search visibility separately

Search Console describes Google Search performance; it is not a citation dashboard for ChatGPT, Claude, Perplexity, or other answer engines. Keep AI-search prompt tests, referral logs, citation checks, and human verification in a separate measurement track. [Chapter 6](/ai-agent/posts/geo-measurement-and-tools/) covers that low-cost setup.

## FAQ

### Lighthouse SEO is 100. Is technical SEO finished?

No. The tested page passed the SEO audits included in that Lighthouse run. Audit redirects, canonicals, hreflang, sitemaps, structured data, internal links, crawl behavior, and indexing separately.

### Are 878K impressions a vanity metric?

Not automatically. They are valid observations under Search Console's counting rules. They become unhelpful when unrelated query families are collapsed into one number and treated as one audience. Segment first.

### What matters most during a domain migration?

Correct path-preserving redirects, stable canonicals, verified old and new properties, a current sitemap, bulk redirect testing, and trend monitoring. Keep redirects as long as possible, generally at least one year.

### Should this blog add FAQPage or HowTo schema?

Only when the markup accurately represents visible content—and not with the expectation of a Google rich result. FAQ visibility is restricted for most sites, and HowTo rich results are deprecated.

### Can another site copy this review?

Yes, with its own evidence. Record the Search Console property, search type, filters, date window, aggregation, and export limits. Keep Lighthouse lab output separate from CrUX field data and custom audits. Then segment query-page pairs before writing the rebuild queue.

## What this case study changed

The first draft wanted a dramatic conclusion: perfect tech, terrible traffic, therefore rebuild L2–L5. The data supported something more useful and less theatrical.

The homepage passed Lighthouse's covered SEO checks. The old-domain Search Console property contained a large, heterogeneous impression total. A small group of technical pages earned most of the clicks. The domain move needed a longer redirect horizon than I first wrote. Those four observations were enough to decide the next work without inventing a ranking formula.

That is the version of GEO I trust: not a new score painted over SEO, but a discipline for keeping access, structure, evidence, quotability, and endorsement visible—then measuring each with the tool that can actually observe it.

- **Previous:** [GEO Trust and Endorsement](/ai-agent/posts/geo-trust-and-endorsement/)
- **Next:** [GEO Measurement and Tools](/ai-agent/posts/geo-measurement-and-tools/)

## Primary references

- [Google Search Console: impressions, clicks, and position](https://support.google.com/webmasters/answer/7042828)
- [Google Search Console: performance data aggregation](https://support.google.com/webmasters/answer/17011364)
- [Google Search Console: dimensions, grouping, and query limitations](https://support.google.com/webmasters/answer/17011259)
- [PageSpeed Insights: lab and field data](https://developers.google.com/speed/docs/insights/v5/about)
- [Google Search Central: site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google Search Central: FAQ and HowTo changes](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [Google Search Central: structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
