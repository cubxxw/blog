---
name: write-blog-from-brief
description: Turn one ready `_briefs/` task into a researched, authorial Hugo article and stop at `ready-to-publish`. Use for executing the blog queue, writing from a brain brief, or tracing a theme across recurring `source_refs`. Build a safe longitudinal source lineage from approved public packets, select the article mode first, preserve privacy and factual boundaries, and allow REBUILD or KILL instead of forcing every brief into a finished long-form essay.
---

# Write Blog from Brief

Produce one article from one brief. The brief controls approved material, privacy, and the confirmed claim; it does not prescribe every section or sentence.

Announce this skill before acting. Process only one brief per invocation.

## Read

Always read:

1. `AGENTS.md`
2. `_briefs/README.md`
3. `docs/blog-editorial-workflow.md`
4. the selected brief
5. `config/tags-mapping.json`

Read conditionally:

- `references/source-tracing.md` when `source_refs` are present or the user asks to deepen, revisit, or track a theme;
- `references/research-protocol.md` when external claims need verification or `brief_type: research`;
- `../craft-article-opening/SKILL.md` when creating or replacing the first screen;
- `references/review-rubric.md` before editorial review;
- `../article-covers/SKILL.md` only after title and body stabilize.

Treat `brain://` as traceability, not permission to read upstream private files.

## State and authority

Follow:

```text
ready → claimed → drafting → review → ready-to-publish
```

Use `blocked` when approved author material, privacy permission, a selected essay direction, or decisive evidence is missing. Use an editorial `KILL` verdict when the material is safe but does not deserve an article; record the reason and move the brief to `cancelled` so it does not remain active.

Do not publish, translate, commit, push, merge, or deploy without separate authorization.

## 1. Select, claim, and identify the mode

Run the relevant queue checks. In dispatch mode, process only the named, already claimed brief and do not access brain.

Map `brief_type` to an editorial mode:

- `thinking` — an essay or project philosophy piece. It needs a chosen shape, lived material, tension, and a real consequence.
- `research` — a tutorial, explanation, comparison, or evidence-led analysis. It needs a valid reader task and reliable sources.
- `field-note` — a project update, experiment log, or current observation. It may remain partial and short.
- `maintenance` — update an existing artifact; do not create a new article unless the brief explicitly says so.

Search for duplicate claims and search intent. Prefer updating an existing article when that serves the reader better.

## 2. Trace the approved source lineage

Read `references/source-tracing.md` and run:

```bash
npm run briefs:trace -- --file <brief>
```

Use exact `source_refs` to find related public briefs, completed article receipts, and existing repository articles. Record what the current brief inherits, what it changes, and which questions remain open.

Never dereference `brain://` or treat a recurring ref as permission to import private content. If the current brief adds no publishable delta to an existing article, prefer maintenance, return upstream, or `KILL`.

## 3. Extract a small editorial contract

Write working notes containing only:

```text
reader action
confirmed claim or research question
chosen shape
one or two author-only materials
inherited insight and current source-lineage delta
facts that require verification
privacy boundary
what this article deliberately omits
```

For a `thinking` brief, stop if the chosen shape is missing. Do not silently choose among several major interpretations after the author has delegated only execution.

Ignore a detailed section blueprint when it conflicts with the approved shape or makes the article mechanically complete. Preserve the claim and material boundaries, not upstream prose.

## 4. Research in proportion to the mode

- `thinking`: verify only facts that carry the argument and find the strongest relevant challenge. Do not turn the essay into a literature review.
- `research`: run epistemic and search-intent research using `references/research-protocol.md`.
- `field-note`: verify current external facts; leave open questions open.
- `maintenance`: verify only what the update changes.

Prefer a few primary sources. Research must be allowed to narrow, redirect, or stop the article. If it overturns the confirmed claim, return upstream instead of adding defensive paragraphs.

Change the brief to `drafting` once the material is sufficient.

## 5. Choose movement, not coverage

Before prose, write:

```text
the reader enters with:
the article changes:
the reader leaves able to:
keep:
omit:
```

Then shape by mode:

- `thinking`: one central tension; a scene, decision, or contradiction changes the author's judgment; the ending returns to reality.
- `research`: organize around the reader's task and the minimum evidence needed to complete it.
- `field-note`: what happened, what it currently suggests, what will be tested next.

Do not add a framework, table, counterargument, FAQ, or checklist merely because the format supports one. A `thinking` article normally uses at most one explicit framework.

## 6. Draft with room to discover

Create a rough Chinese draft before polishing. Let the prose find better order and compression; do not attempt to satisfy every possible review criterion while writing the first paragraph.

For `thinking`:

- enter through approved concrete material;
- make every section change the problem, evidence, judgment, or action;
- retain uncertainty that belongs to the author;
- end with a decision, experiment, cost, or unresolved reality—not a summary of the introduction.

For `research`:

- answer the task early;
- distinguish source fact, source opinion, author observation, and article inference;
- cite decisive claims next to their sources;
- use `tldr`, FAQ, schemas, and step lists only when they help the task.

For `field-note`:

- prefer a short honest note over an inflated evergreen essay;
- state what is known now and what may change.

Delete paragraphs that would survive unchanged under another author's name. Never fabricate experience, dialogue, motive, metrics, chronology, or results.

When public sources are cited, end with `## 参考资料` and list only sources actually used.

## 7. Review in the correct order

Move the brief to `review` and use `references/review-rubric.md`.

Use an independent reviewer that did not draft the article for the developmental pass. Run fact and safety checking as a separate pass:

1. **Developmental editor** — decides `KEEP`, `REBUILD`, or `KILL`; can recommend cutting or moving large sections.
2. **Fact and safety checker** — checks evidence, privacy, attribution, dates, and publication integrity.

Do not ask either reviewer for a percentage score. Do not tell them the desired verdict. Save line-specific findings or record them in the brief receipt.

Resolve structural findings before line editing. If the developmental verdict is `REBUILD`, permit one substantial rewrite. If it remains `KILL`, record the reason, set the brief to `cancelled`, and stop rather than polishing.

## 8. Apply presentation after editorial stability

- Finalize title and plain-text description.
- Add Answer-First, `tldr`, FAQ, or HowTo schema only for content whose reader task benefits.
- Before removing or changing existing `tldr`, FAQ, or other front-matter fields, inspect their template, schema, search, and rendering consumers. Narrative repetition does not prove metadata is unused.
- Add internal links by argumentative role, not tag similarity.
- Select canonical tags; do not fill `keywords` without a reason.
- Use a reached Shanghai `+08:00` timestamp.
- Treat `npm run geo:audit` as advisory.

Read `../article-covers/SKILL.md`. Compare three different art directions before generating variants of the selected one. Inspect the actual images.

## 9. Run deterministic gates

For a standard Markdown article:

```bash
node scripts/check-ai-flavor.mjs <article...> --check
npm run frontmatter:check
npm run tags:check
git diff --check
```

The AI-flavor script detects a few phrase patterns; it is not an editorial grade.

Confirm:

- every inline external citation is represented once in the final reference list;
- every internal link and cover/media path resolves;
- canonical tags and front-matter consumers remain valid;
- the article has a visible current delta and does not merely repackage an earlier item from the same source lineage;
- after compression, each surviving case still has one argumentative job, nearby support, a visible limitation, and a return to the central claim.

Escalate to targeted Hugo, browser, or shared-code tests only when the article introduces corresponding rendering risk. CI owns full-site confidence.

## 10. Handoff

When the article has a `KEEP` verdict and all factual/deterministic gates pass:

- set the brief to `ready-to-publish`;
- record `editorial_verdict`, key cuts, fact checks, article path, source lineage, current delta, follow-up questions, and unresolved human choices;
- leave publication to the author.

For a `KILL` verdict, record why the current shape should not publish and what evidence could justify reopening it, then leave the brief at `cancelled`.

Report what changed and what still needs human judgment. Do not create the English version until the Chinese article is approved.
