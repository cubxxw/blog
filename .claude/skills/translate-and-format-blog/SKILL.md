---
name: translate-and-format-blog
description: Translate an approved Chinese Hugo article into natural English and polish the presentation of either or both language editions. Use after the Chinese article is editorially stable, when creating or updating its matching `content/en/` file, or when improving bilingual Markdown with repository-supported figures, disclosures, diagrams, quotes, and interactive shortcodes without changing the argument.
---

# Translate and Format Blog

Handle localization and presentation after the article itself is settled. Do not research, expand the argument, or manufacture a stronger author voice.

## Pass 1 — Translate

Create the English file at the same path below `content/en/` as the source below `content/zh/`. Do not leave a partial file in `content/`.

- Preserve meaning, first-person perspective, uncertainty, rhythm, headings, citations, code, and resource paths. Write natural English instead of mirroring Chinese syntax.
- Translate `title`, `description`, visible body text, image alt text, captions, `tldr`, FAQ, HowTo, and visible shortcode labels.
- Preserve dates, author, type, canonical tags, series/column slugs, maturity, image paths, URLs, identifiers, and code unless localization genuinely requires a change.
- Preserve `relref`. English is the default root language: change a hard-coded `/zh/...` link to `/...` only when the matching `content/en/...` target exists; never invent an `/en/` prefix.
- Use an established English name or title when one is supported; otherwise preserve the Chinese term with a brief romanization or gloss instead of inventing a canonical translation.
- Keep every factual claim and citation adjacent. Add no new fact or interpretation.
- Never add `draft`; wait to create the target until the translation is complete.

## Pass 2 — Format

Read [references/rendering.md](references/rendering.md). Improve either language only where presentation helps comprehension.

- Keep the semantic structure aligned across a bilingual pair; translate visible labels while preserving shortcode names, parameters, IDs, code, and asset paths.
- Prefer ordinary Markdown. Add a special renderer only when it makes a quote, optional detail, relationship, comparison, sequence, terminal transcript, or annotated image materially clearer.
- Do not decorate by quota. Do not introduce raw HTML or legacy `<aside>` blocks.
- Inspect the owning shortcode before using an unfamiliar parameter.

## Verify

Reread the translation once against the source for omissions, added certainty, wrong attribution, broken Markdown, and untranslated visible text.

Run:

```bash
npm run frontmatter:check
npm run tags:check
git diff --check
```

When a shortcode, Mermaid block, raw rendering feature, or new media path changed, also run `hugo --minify`. Check both files and do not publish, commit, or push without the task's authorization.
