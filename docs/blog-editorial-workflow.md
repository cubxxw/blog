# Blog Editorial Workflow

Turn one approved brief into an article worth the author's review. The workflow protects truth and publishing safety while leaving prose decisions to the writer.

## 1. Receive

- Process one brief.
- Confirm its mode: `thinking`, `research`, `field-note`, or `maintenance`.
- Treat the brief as approved material and boundaries, not an outline.
- Trace recurring `source_refs` through public repository material only.
- Stop when author material, privacy permission, or decisive evidence is missing.

The queue states remain:

```text
ready → claimed → drafting → review → ready-to-publish → published
```

Use `blocked` when human input is required and `cancelled` when the article receives a `KILL`.

## 2. Write in three passes

### First pass: author and material

Find what happened, what mattered to the author, what changed, and what stays private.

For `thinking`, begin with the author's lived account and uncertainty. For `research`, begin with the reader's task. For `field-note`, begin with the current observation. Do not use research to replace missing experience.

### Second pass: discovery and evidence

Let the draft choose its own order and length. Research only what can change or protect the article. Brief headings, checklists, FAQ, frameworks, and tidy conclusions are optional.

### Third pass: three rereads

1. Author presence and voice.
2. Movement and reader experience.
3. Facts, citations, privacy, metadata, and links.

Use `.claude/skills/write-blog-from-brief/references/review-rubric.md`. Choose `KEEP`, `REBUILD`, or `KILL`.

## 3. Package only after the article lives

- Choose an accurate title and plain-text description.
- Use canonical tags and a reached Shanghai `+08:00` timestamp.
- Add SEO/GEO devices only when they serve the article.
- Add adjacent citations and a deduplicated reference section when public sources are used.
- Reuse existing routes, content directories, and cover conventions.
- Finish the Chinese edition first. After author approval, use `.claude/skills/translate-and-format-blog/SKILL.md` for English translation and optional rendering polish in either language.

## 4. Validate and hand off

For ordinary Markdown:

```bash
node scripts/check-ai-flavor.mjs <article...> --check
npm run frontmatter:check
npm run tags:check
git diff --check
```

Record the article, source trail, meaningful revision, checks, and remaining human choices in the brief. Stop at `ready-to-publish` until the author separately approves publication.
