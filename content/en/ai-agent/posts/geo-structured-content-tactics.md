---
title: 'Structured Content for GEO: A Reader-First Playbook'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T10:30:00+08:00'
lastmod: '2026-07-31T18:00:00+08:00'
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - GEO
  - Content Strategy
  - SEO
  - AI Search
  - Hugo
categories:
  - Development
description: >
  A practical guide to clearer technical articles: lead with useful answers, use honest evidence, add valid schema, build internal links, and test AI visibility.
cover:
  image: '/images/columns/geo/en-03-structured.svg'
  alt: 'GEO structured tactics cover showing clear, reusable content blocks'
tldr:
  - Structure a technical article so a reader can find the conclusion, evidence, limits, and next action without reconstructing the author's intent.
  - Lead with an answer when the reader needs one, but do not force every paragraph into a fixed word count or every heading into a question.
  - Structured data should describe visible page content and satisfy documented search requirements. There is no special schema required for Google AI features.
  - Google says it ignores llms.txt. Maintain one only for a documented consumer or a workflow you can test; use a visible summary because it helps readers.
  - Treat AI visibility as an outcome to measure, not a promise attached to formatting. Keep a fixed prompt set and record citations, dates, platforms, and regions.
maturity: budding
columns:
  - geo
series:
  name: Generative Engine Optimization
  slug: geo
  order: 3
  total: 6
---

## The answer first: structure is a promise to the reader

**Good structure reduces the amount of reconstruction a reader must do. A useful technical section makes its conclusion, evidence, limits, and next action easy to find. That also gives search and answer systems cleaner material to process, but no heading pattern, paragraph length, summary block, or schema type guarantees an AI citation.**

That distinction matters. It is tempting to turn GEO into a writing ritual: put the answer first, keep the paragraph within a magic range, add FAQ schema, and wait for citations. Google explicitly says its AI search features use the same foundational SEO requirements as ordinary Search and require no special AI markup or content format. The safer order is:

1. solve a real reader's problem;
2. make the reasoning inspectable;
3. satisfy documented technical requirements;
4. measure whether discovery or citation changes.

This is **Chapter 3 (Structured Tactics)** of the *Generative Engine Optimization* series. [Chapter 2](/ai-agent/posts/geo-how-ai-retrieves-and-cites/) separates documented product behavior from inference. This chapter turns that caution into an editing workflow I can use on cubxxw.com.

---

## Lead with the answer when the reader needs an answer

Many technical articles delay the useful sentence because the author is replaying the order in which the problem was discovered. The reader usually arrives in a different state: they already have an error, a slow build, or a design decision to make.

Here is a common opening:

> When it comes to Hugo build speed, many factors can be involved. Different configurations, content volumes, and template complexity all create variation. To understand the problem, we should first look at the build pipeline.

The paragraph is not false, but it postpones the decision. A stronger version starts with a scoped diagnosis:

> **On this Hugo site, the first templates I inspect for a slow build are those repeatedly walking `.Site.Pages`, processing the same image more than once, or calculating related content across a large collection.** I confirm the bottleneck with Hugo's template metrics before changing code, because the expensive operation varies by site.

The second version works because it says **where the claim applies**, **what to inspect**, and **how to verify it**. Its value does not depend on an AI system lifting it verbatim.

I use a four-part check rather than a word-count formula:

- **Answer**: Does the opening sentence resolve the question or name the decision?
- **Scope**: Does it say which version, environment, audience, or conditions the claim covers?
- **Evidence**: Can the reader inspect a command, measurement, source, example, or trade-off?
- **Next step**: Does the section make the next action obvious?

The section may need 35 words or 300. A short definition and a failure analysis should not be forced into the same shape. Google also says there is no need to create many small chunks solely for its AI features. Paragraph boundaries should follow meaning and readability.

### A note on my Hugo timing example

An earlier draft said that changing one full-site iteration to `where` plus caching reduced a roughly 1,100-page bilingual build from 18 seconds to 6 seconds. That is a useful debugging memory, not a controlled benchmark: it was one repository state, on one local machine, and I did not preserve the Hugo version, warm-up runs, hardware load, or a repeatable fixture.

I therefore should not present the ratio as a general Hugo performance rule. The reproducible lesson is smaller: run `hugo --templateMetrics --templateMetricsHints`, change one suspected hot path, repeat the same build several times, and record the median together with the Hugo version and commit. If I cannot provide those conditions, the number remains an anecdote.

---

## Use question headings only for real questions

Question headings can be excellent navigation. A reader searching for “How do I add a sitemap in Hugo?” benefits from seeing that exact question above a focused answer. But a question mark is not a retrieval credential.

Google documents **query fan-out** for some AI search experiences: the system may issue related searches to assemble a response. It does not document a rule that question-shaped headings “claim” those subqueries, sit at a privileged vector distance, or create additional ranking entries.

My editing rule is therefore semantic:

- Use a question when the section directly answers a question a reader would ask.
- Use a descriptive heading for a concept, comparison, narrative turn, or case study.
- Keep one clear subject per heading, without contorting natural language around a keyword.
- Read the heading outline by itself. It should reveal the argument, not merely repeat variations of a query.

For example, `Hugo SEO` is too broad. `Generate a sitemap in Hugo` may be better for an instruction, while `When a custom sitemap becomes necessary` may be better for a decision guide. Neither is universally superior because the intended reader task differs.

---

## Structured data describes the page; it does not create an AI channel

Structured data is useful when it accurately describes visible content and matches a search feature's documented requirements. My article pages already emit types such as `BlogPosting`, `WebSite`, `Person`, and `BreadcrumbList`. Those annotations can make page meaning explicit and support eligible search presentations.

The boundary is equally important:

> Google says there is no special schema.org structured data required for AI Overviews or AI Mode. Structured data should match the visible text, and adding unsupported markup does not create a documented AI citation advantage.

FAQ and HowTo are a good test of that discipline. In August 2023, Google limited FAQ rich results primarily to well-known government and health sites and deprecated HowTo rich results. That was a search-presentation change, not evidence that publishers should repurpose `FAQPage` as “AI-facing schema.”

For this personal blog, the practical policy is:

1. Write an FAQ only when it resolves recurring reader questions that do not fit naturally elsewhere.
2. Keep every answer visible on the page.
3. Add `FAQPage` JSON-LD only if the page and current Google documentation make it appropriate.
4. Do not promise a rich result, an AI citation, or better ranking.
5. Remove markup that drifts out of sync with the prose.

A minimal Hugo template can mirror visible FAQ data, but it needs correct JSON encoding and should not be added merely because the field exists:

```go-html-template
{{ with .Params.faq }}
<script type="application/ld+json">
{{ dict
  "@context" "https://schema.org"
  "@type" "FAQPage"
  "mainEntity" (apply . "partial" "schema/faq-item.html" ".")
  | jsonify
  | safeJS
}}
</script>
{{ end }}
```

That sketch still needs a tested `schema/faq-item.html` partial and validation against the rendered page. It is an implementation pattern, not a recommendation to add FAQ markup site-wide.

Primary references:

- [Google: AI features and your website](https://developers.google.com/search/docs/fundamentals/ai-features)
- [Google: Succeeding in AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google: Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)

---

## Treat llms.txt and visible summaries as different tools

`llms.txt` is a proposed convention for presenting a site's important resources to language-model tools. It is not a Google Search requirement. Google's current guidance says it does not use the file.

Claims about other products need the same standard of proof. “AI developer tools read llms.txt” is too broad: Cursor, Claude Code, Copilot, MCP clients, answer engines, and crawlers are different products with different fetching rules. I should name a consumer only when its current first-party documentation says it reads the file, and then test the exact workflow.

That leads to a simple maintenance decision:

- Keep `llms.txt` if a documented consumer, a project integration, or my own tooling uses it.
- Do not maintain it as a speculative ranking signal.
- Monitor it like any generated index so its links do not rot.
- Remove product claims when the cited behavior changes.

A visible `tldr` serves another purpose. It helps a hurried human decide whether the article is worth reading and exposes the author's main claims for scrutiny. Search or answer systems may process that text because it is part of the page, but I cannot infer a citation lift from the presence of five bullets.

The summary should therefore contain the article's actual conclusions and limits, not a second set of promotional keywords.

---

## Make evidence easy to inspect

“Extractability” is useful only if it does not flatten the writing into disconnected blocks. A paragraph copied without its conditions can become more misleading, not more useful.

I prefer **inspectable structure**:

- Put commands and code in code blocks, with version and environment notes nearby.
- Use a table when readers must compare the same fields across several options.
- Use an ordered list when sequence matters; do not turn every collection into a list.
- Keep a qualification with the claim it limits.
- Link to the primary source beside the statement it supports.
- Label personal measurements, vendor benchmarks, and inferences differently.
- Preserve transitions when one section depends on the reasoning of the previous one.

This also makes revision easier. When an API changes, I can find the versioned claim and its source instead of rereading an essay-shaped wall of assertions.

The Princeton-led GEO paper is a useful example of careful boundaries. Its experiments reported visibility gains of up to roughly 40% for some methods and domains. That result is not a universal citation-rate improvement: the study used its own visibility metrics, selected systems and queries, and effects varied by domain. It supports further testing, not a fixed “add a quotation and gain 22–41%” writing rule.

See the original paper rather than inherited marketing summaries: [GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735).

---

## Build internal links around reader journeys

Internal links help people discover prerequisites, deeper explanations, and the next useful action. They also help crawlers understand relationships between pages. I use topic clusters as an information architecture, not as one of a supposed fixed number of “AI citation factors.”

For this series:

- the [GEO guide](/ai-agent/posts/geo-generative-engine-optimization-guide/) defines the problem and evidence boundary;
- [Chapter 2](/ai-agent/posts/geo-how-ai-retrieves-and-cites/) explains a testable retrieval model;
- this chapter covers editing and page structure;
- the [case study](/ai-agent/posts/geo-blog-rebuild-case-study/) separates Search Console observations from AI citation evidence.

The anchor text names what the destination contributes. Links are added where a reader may need them, not repeated to manufacture authority. If a child article no longer answers the promised question, I update or remove the link.

---

## My cubxxw.com editing checklist

Here is the version I can actually apply and audit:

- [ ] State the reader's problem and the article's scope near the beginning.
- [ ] Lead with an answer where delay would waste the reader's time.
- [ ] Keep evidence, conditions, and caveats beside the claim.
- [ ] Use headings that describe the real section, whether or not they are questions.
- [ ] Use lists, tables, and code blocks only when their structure matches the information.
- [ ] Validate structured data against visible content and current official documentation.
- [ ] Treat `llms.txt` as an integration file, not a ranking tactic.
- [ ] Write a `tldr` that summarizes conclusions and limitations for people.
- [ ] Link to the next useful page with descriptive anchor text.
- [ ] Test AI visibility with recorded prompts instead of inferring success from formatting.

For an AI-visibility test, I keep the prompt set stable, repeat runs, and record the platform, model or product surface when available, date, region, cited URL, and whether the page actually supports the answer. A citation appearing once is an observation; a durable change requires repeated evidence and a comparison period.

---

## FAQ

### Does Answer-First writing improve AI citations?

It can make an answer easier for people to locate and evaluate, but there is no documented universal citation lift. Treat it as a reader-first editorial practice, then test visibility separately.

### Should this blog add FAQPage schema to every article?

No. Add an FAQ only when readers need it, keep the answers visible, and use structured data only when it accurately describes the page and follows current documentation. Google does not require special schema for its AI search features.

### Is there an ideal paragraph length for GEO?

No universal length is documented. A paragraph should develop one coherent point with its necessary evidence and qualification. Split it when comprehension improves, not when a counter reaches a preset number.

### Should I keep llms.txt?

Only when a documented consumer or a workflow you control uses it, or when the small maintenance cost is justified as an experiment. Google says it ignores `llms.txt`, so the file should not be sold as a Search or AI-citation lever.

---

## Summary and what comes next

Structured content is not a way to negotiate with an opaque ranking system. It is a way to respect the reader: answer the real question, expose the evidence, preserve the limits, and make the next step clear. Those qualities also give search and answer products cleaner inputs, but any visibility gain remains something to measure.

The next chapter turns from page structure to trust: experience, primary evidence, author identity, corrections, and third-party references. The same rule will apply there—document what the systems say, label what I infer, and keep claims no larger than their evidence.

- **Previous**: [How AI search retrieves and cites sources](/ai-agent/posts/geo-how-ai-retrieves-and-cites/)
- **Next (Chapter 4 · Trust & Endorsement)**: building verifiable authority without manufacturing consensus
