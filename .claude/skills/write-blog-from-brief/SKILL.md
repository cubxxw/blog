---
name: write-blog-from-brief
description: Turn one `_briefs/` task into an authorial Hugo article and stop for author review. Use when writing, rewriting, or deepening a blog article from a brief, including themes connected by recurring `source_refs`. Preserve the author's lived perspective, trace only approved public material, research in proportion to the article, and keep publication under the author's control.
---

# Write Blog from Brief

Write one article from one brief. Treat the brief as material and boundaries, not as a section plan.

## Read first

Read `AGENTS.md`, `_briefs/README.md`, `docs/blog-editorial-workflow.md`, the brief, and `config/tags-mapping.json`.

When needed:

- `references/source-tracing.md` for `source_refs`;
- `references/research-protocol.md` for research-led work;
- `../craft-article-opening/SKILL.md` when writing the first screen;
- `references/review-rubric.md` for the final rereads.

Never open the private target behind `brain://`.

## Keep only the hard boundaries

- Use only approved author material. Never invent experience, dialogue, emotion, motive, chronology, or results.
- Preserve privacy, attribution, and factual accuracy.
- Process one brief at a time.
- Do not publish, translate, commit, push, or deploy without separate authorization.
- Stop as `blocked` when the article needs lived material or a privacy decision that the brief does not provide.
- Allow `KILL`: a safe brief does not automatically deserve an article.

Everything else—shape, order, length, headings, amount of research, and ending—depends on the material.

## Work in three passes

### Pass 1 — Find the living center

Identify:

```text
who is speaking to whom
what actually happened or was observed
what the author felt, believed, or could not resolve
what changed in this source lineage
what must stay private
```

For `source_refs`, trace the related public briefs and articles. Look separately for continuity in experience, emotion, and thought. Do not force old material into the draft.

Choose the mode:

- `thinking`: let the reader enter the author's experience and follow a judgment changing;
- `research`: help the reader understand or complete a concrete task;
- `field-note`: preserve a specific observation before it becomes falsely complete;
- `maintenance`: improve an existing artifact.

For a thinking article, draft the author's account before doing broad research. If there is no authorial presence to write from, stop instead of filling the gap with explanation.

### Pass 2 — Let the article discover its shape

Write freely from the strongest approved material. Follow the natural movement of the experience or question; ignore brief headings and acceptance criteria that would make the prose mechanically complete.

Research only claims that matter. Let evidence challenge the draft, but keep research in a supporting role unless the article is research-led.

Do not add a framework, checklist, FAQ, counterargument, or tidy conclusion by habit. An unresolved ending is valid when it is true.

### Pass 3 — Reread three times

1. **Presence:** Can the reader feel why this belongs to this author? Where did explanation hide the person?
2. **Movement:** Does each surviving part deepen or change the experience, question, or judgment?
3. **Integrity:** Are facts, citations, privacy, attribution, metadata, links, and assets correct?

Rewrite as needed. Prefer cutting a well-written paragraph over keeping one that could appear unchanged under another author's name.

## Finish

Use canonical tags, a reached Shanghai `+08:00` timestamp, plain-text description, adjacent citations for external claims, and a deduplicated `## 参考资料` / `## References` section when public sources are used.

Finish the Chinese article only. After author approval, delegate English translation and optional bilingual rendering to `../translate-and-format-blog/SKILL.md`; do not make this writing pass produce the English edition.

For standard Markdown, run:

```bash
node scripts/check-ai-flavor.mjs <article...> --check
npm run frontmatter:check
npm run tags:check
git diff --check
```

Record the article path, source lineage, meaningful revision, checks, and unresolved human choices in the brief. Stop for author review; publication remains a separate decision.
