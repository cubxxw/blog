---
title: 'GEO Structured Tactics: Writing "Worth Citing" Into Every Paragraph (Answer-First, Schema, llms.txt)'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T10:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['GEO', 'Answer-First', 'structured data', 'Schema', 'JSON-LD', 'FAQPage', 'HowTo schema', 'llms.txt', 'tldr', 'question headings', 'extractability', 'AI search optimization', 'internal linking', 'topic cluster']
tags:
  - GEO
  - Content Strategy
  - SEO
  - AI Search
  - Hugo
description: >
  Principles done — this chapter is all hands-on: how to write Answer-First paragraphs, turn headings into questions, whether FAQPage/HowTo schema still matters after Google retired the rich results, the right way to do llms.txt and tldr, and how to weave internal links into a topic cluster. With code and before/after. Chapter 3 of the GEO series.
cover:
  image: '/images/columns/geo/en-03-structured.svg'
  alt: GEO structured tactics cover showing citable paragraph blocks
tldr:
  - Answer-First paragraphs follow a formula - one standalone conclusion + 40-100 words of expansion + at least one piece of evidence (number/source/quote). That's the block AI lifts verbatim.
  - Question headings aren't rhetoric; they feed sub-queries to "query fan-out." Writing each follow-up question as its own H2/H3 claims multiple retrieval entry points.
  - Google retired FAQ/HowTo rich results in 2026, but FAQPage is still valid schema and still parsed by AI Overviews/ChatGPT/Perplexity - so you add schema now "for AI," not "for rich snippets."
  - llms.txt does almost nothing for search ranking but helps AI dev tools; a tldr summary is the real low-cost, high-return Answer-First move. Don't spend effort backwards.
  - Extractability = breaking the article into liftable LEGO bricks - lists, tables, steps, standalone conclusions, clear headings - then weaving pillar and child posts into a topic cluster via internal links.
maturity: budding
columns:
  - geo
series:
  name: Generative Engine Optimization
  slug: geo
  order: 3
  total: 6
---

## The answer first: structure isn't tidiness, it's citability engineering

**Getting cited by AI isn't about prose; it's about extractability — whether each of your paragraphs can be lifted out and used as an answer on its own. This chapter hands you four copyable crafts: the Answer-First paragraph formula, a question-heading system, AI-facing Schema, and the right way to do llms.txt / tldr / internal links. All with code or before/after. You can ship it today.**

Chapter 2 (the [mechanics](/ai-agent/posts/geo-how-ai-retrieves-and-cites/)) proved AI's retrieval unit is the *paragraph*, not the page. This chapter translates that principle into the concrete moves you make while writing each paragraph.

> This is **Chapter 3 (Structured Tactics)** of the *Generative Engine Optimization* series. The last chapter was mechanics; this one is craft; the next (Chapter 4) is trust and endorsement.

---

## 1. The Answer-First paragraph formula

A before/after makes the difference obvious:

**❌ Before (throat-clearing):**
> When it comes to Hugo build speed, there are actually many factors at play. In our long practice we've found that different configs, content scales, and template complexity all cause variance. So how should you optimize? Let's start by understanding Hugo's build pipeline…

**✅ After (Answer-First):**
> **The three most common reasons Hugo builds slowly are: templates abusing full `.Site.Pages` iteration, images not going through Hugo Pipes, and the `related` cross-reference computation.** On a ~1,100-page bilingual site, switching one full iteration to `where`+cache alone cut build time from 18s to 6s. Here's each one broken down…

The difference isn't information — it's **order and evidence.** The Answer-First paragraph has a reusable formula:

1. **First sentence = a standalone conclusion** (lead with the answer, even if it "spoils").
2. **Then 40–100 words of expansion** (landing in the passage sweet spot from [Chapter 2](/ai-agent/posts/geo-how-ai-retrieves-and-cites/)).
3. **Embed at least one machine-readable proof**: a number, a source, or an authoritative quote (directly the Princeton +22–41% visibility lever).

**Where to use it**: the article's first paragraph, the first paragraph of each H2 section, and any "what / why / how" answer. Every section opener you're reading uses this formula.

---

## 2. A question-heading system: paving the way for query fan-out

Chapter 2 covered Google's **query fan-out** — splitting one question into many parallel sub-queries. Headings are how you claim those sub-queries.

- **Turn statements into questions**: `GEO Overview` → `What is GEO? How is it different from SEO?` The user's question is encoded into a vector, and question headings sit nearer the query in semantic space.
- **Proactively cover the "sub-question neighborhood"**: a "Hugo SEO" post should claim these follow-ups via H2/H3 — "How do I add a sitemap in Hugo?", "How do I write structured data in Hugo?", "How do I lazy-load Hugo images?" Each is a ticket into fan-out.
- **One question per heading**: easier to segment and semantically single-purpose.

> Tip: after writing, pull all your H2/H3s out and read them alone — they should read like "a list of questions users ask," not a pile of noun phrases.

---

## 3. AI-facing Schema: a critical mental update

This is the most easily-outdated and most-often-wrong part — see the 2026 reality clearly:

> **Google retired the *rich results* for FAQ and HowTo**: the FAQ search appearance, report, and Rich Results Test support are being dropped from June 2026, with Search Console API support removed in August; HowTo rich results were removed on desktop back in 2023. ([The HOTH](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/), [Google](https://developers.google.com/search/blog/2023/08/howto-faq-changes))

So should you still add schema? **Yes — but the purpose changed.** Google confirms FAQPage is still a **valid Schema.org type** it will **continue to parse** to understand pages; more importantly, **AI Overviews, ChatGPT, Perplexity, and Gemini all generate answers from clearly structured content, and Q&A formatting is one of the easiest patterns for them to extract.** ([The HOTH](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/), [alevdigital](https://alevdigital.com/blog/faq-structured-data-2026/)) And unused structured data causes **no penalty.**

**Bottom line: adding FAQPage/HowTo now is "for AI parsing," not "for rich snippets."** Change the mindset and the practice follows.

A ready-to-use FAQPage JSON-LD (drop into your article template):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Will GEO replace SEO?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "No. GEO is a layer on top of SEO: SEO fights for links and rankings, GEO fights for being cited when AI generates an answer; both share the same content assets."
    }
  }]
}
```

In Hugo, loop over a frontmatter `faq` field to generate it (sketch):

```go-html-template
{{ with .Params.faq }}
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {{ range $i, $q := . }}{{ if $i }},{{ end }}
  {"@type":"Question","name":{{ $q.q }},
   "acceptedAnswer":{"@type":"Answer","text":{{ $q.a }}}}
  {{ end }}
]}
</script>
{{ end }}
```

> **My blog's state**: article pages already emit `BlogPosting`, `WebSite`, `Person`, `BreadcrumbList` (Lighthouse SEO 100). **The one thing to add is `FAQPage`** — I already write FAQ sections in prose, so mirroring them into schema is nearly free.

---

## 4. llms.txt vs tldr: don't spend effort backwards

These two get conflated, but their value differs wildly:

- **`llms.txt`**: a proposed "site guide" for LLMs. **Near-useless for Google Search ranking today** (Google doesn't use it; an Ahrefs study of 137K sites found 97% are never read by AI crawlers); **but useful for AI dev tooling** (Cursor, Claude Code, Copilot, MCP genuinely read it). Cheap — keep it, but don't expect a citation lift. (See [Chapter 1](/ai-agent/posts/geo-generative-engine-optimization-guide/).)
- **`tldr` summary**: this is the low-cost, high-return one. A bullet summary at the top is Answer-First + extractability in one — AI can lift your tldr straight into an answer.

> **My blog's state**: my frontmatter has a `tldr` array rendered as a top bullet list (the 5 bullets atop this post). That step is right; the work is to **write a real tldr for every core post**, not treat it as optional.

---

## 5. Extractability layout: break the article into LEGO

Same information, different layout, wildly different extractability for AI. Four hard rules:

1. **If it can be a list or table, don't write it as prose.** Structured presentation is what AI extracts most.
2. **Steps as ordered lists + commands/code blocks.** Especially for how-to content (that's why my [Hugo build post](/engineering/posts/my-hugo/) earns high CTR — each step is independently usable).
3. **Each mini-conclusion stands as its own paragraph**, readable without context.
4. **Clear H2/H3 hierarchy, no skipped levels** (skipping hurts both accessibility and chunk segmentation).

---

## 6. Internal links and topic clusters: turning one post into an "authority zone"

Even a great single post is an island. The GEO era builds **topic clusters**: one pillar + several child posts + mutual internal links, forming topical authority — one of the six citation factors.

- **Bidirectional pillar ↔ child links**: the pillar links to each child; each child links back (this very series is woven that way: pillar ↔ mechanics ↔ this post).
- **Natural-language anchor text**: link text like "how AI retrieves and cites," not "click here."
- **Cluster around validated demand**: don't chase noise. In [Chapter 5](/ai-agent/posts/geo-blog-rebuild-case-study/) I'll use real data to show how to cluster around Hugo, AI tools, and Go — topics already earning clicks.

---

## 7. Back to my blog: a "ship it today" checklist

Compressing the six sections into executable actions for cubxxw.com:

- [ ] Add Answer-First openers to the top 10 technical posts (conclusion + expansion + one proof).
- [ ] Rewrite their H2/H3s as questions and add common sub-question sections.
- [ ] Add `FAQPage` JSON-LD to the article template (reading a frontmatter `faq` field); keep prose FAQ and schema in sync.
- [ ] Write a real `tldr` (3–5 standalone conclusions) for every core post.
- [ ] Rewrite context-dependent paragraphs in long posts into self-contained LEGO bricks.
- [ ] Weave pillar and child posts bidirectionally with semantic anchor text.

---

## 8. FAQ

**Q: Google retired FAQ rich results — is adding FAQPage schema still worth it?**
A: Yes. FAQPage is still valid schema, Google keeps parsing it, and AI Overviews/ChatGPT/Perplexity use Q&A structure to extract answers. You add it now "for AI parsing," not "for rich snippets." Unused structured data carries no penalty. ([The HOTH](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/))

**Q: Won't Answer-First "spoil" the opening and hurt reading?**
A: No. Human readers also prefer the conclusion first, then decide how deep to go; AI simply lifts the opener. A spoiler opener + layered expansion is a win for both humans and machines.

**Q: Should I bother with llms.txt?**
A: You can — it's cheap — but don't expect a search/citation lift. Its real use is AI dev tools reading your docs. Prioritize tldr and Answer-First.

**Q: How many FAQs per article?**
A: Go by "questions genuinely asked," usually 3–6. Write each answer as a standalone paragraph (matching chunk extractability); don't pad for count.

---

## Summary and what's next

The four crafts here — **Answer-First paragraphs, question headings, AI-facing Schema, and internal-link clusters** — are where the last two chapters' theory actually gets written into content. Do these and your technical base and content structure are both in place. But the last, hardest piece remains: **trust and endorsement.**

- **Previous**: [GEO Mechanics — how AI retrieves, re-ranks, and cites](/ai-agent/posts/geo-how-ai-retrieves-and-cites/)
- **Next (Chapter 4 · Trust & Endorsement)**: how to operationalize E-E-A-T, why Reddit and Wikipedia make up half of AI citations, and how a personal blog builds off-site distribution and third-party endorsement.

---

*Standards and data sources: Google Search Central's official docs on FAQ/HowTo rich-result changes, The HOTH / alevdigital 2026 structured-data analysis, and the Princeton GEO study. Links cited inline.*
