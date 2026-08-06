---
name: blog
description: Maintain the cubxxw bilingual Hugo blog, including brief-driven writing, content front matter and taxonomy, PaperMod templates, CSS and JavaScript, SEO, proportional validation, and GitHub delivery. Use for any content, design, implementation, validation, or publishing task in this repository.
---

# Blog repository workflow

## Start with repository truth

1. Read `CLAUDE.md` before changing content or code. Treat it as the authoritative project guide.
2. Inspect the current branch, remote state, and working tree before editing. Preserve unrelated local changes.
3. Read the files that own the behavior before proposing a change.

## Route the task

- For a brief-driven article, read `_briefs/README.md` and `docs/blog-editorial-workflow.md`, then use `.claude/skills/write-blog-from-brief/SKILL.md`. Trace recurring `source_refs` across public briefs and article receipts before drafting; never dereference `brain://`.
- For a new or rewritten opening, also use `.claude/skills/craft-article-opening/SKILL.md`.
- For an approved English translation or presentation polish in either language, use `.claude/skills/translate-and-format-blog/SKILL.md`.
- For template or design work, trace the relevant layout, partials, Hugo resources, and extended CSS before editing.
- For taxonomy, metadata, or SEO work, inspect the project scripts and `config/tags-mapping.json` before changing content.

## Preserve content invariants

- Store ordinary posts only under `content/{lang}/{ai-agent|engineering|growth}/posts/`.
- Store project pages only under `content/{lang}/projects/`.
- Use `articles` as the aggregate entry point.
- Use Shanghai timestamps with an explicit `+08:00` offset and avoid future publish dates unless requested.
- Do not add `draft` to files in `content/`; keep unfinished work on an unmerged branch.
- Keep descriptions as plain text and use canonical tags from `config/tags-mapping.json`.
- Do not reintroduce the retired `categories` taxonomy.
- Put directly referenced article images in `static/`; reserve `assets/` for Hugo Pipes.
- Cite factual external claims next to the supported sentence and end every researched article with `## 参考资料` or `## References`. List each cited public source once with a descriptive link; do not add decorative or uncited sources.

## Implement with the existing architecture

- Prefer repository-native Hugo layouts, partials, assets, and scripts over parallel implementations.
- Keep bilingual routes and labels aligned.
- Preserve responsive behavior, dark mode, accessibility, SEO metadata, and resource fingerprinting.
- Use `apply_patch` for intentional file edits and explicit paths when staging mixed worktrees.

## Validate proportionally

Choose the lowest-cost validation layer that covers the changed surface.

For a standard article-only change using existing Markdown, front matter, routes, and cover conventions:

- inspect the changed document directly;
- run `npm run frontmatter:check`, `npm run tags:check`, and `git diff --check`;
- run `npm run flavor:check` for the changed Chinese Markdown set; it expands to `--changed --check`, includes staged, unstaged, and untracked files under `content/zh`, and fails on E-level errors. Do not substitute `npm run flavor:scan`, which scans the full Chinese corpus without check mode;
- verify the path, Shanghai timestamp, description, canonical tags, headings, inline citations, final reference section, internal links, and referenced asset paths;
- check both documents when the article is bilingual;
- do not launch a browser, take screenshots, run `npm test`, or run a full local production build by default.

Escalate only when the article introduces raw HTML, shortcodes, a new content type or route, unusual media, generated markup, or another rendering risk.

For template, CSS, JavaScript, configuration, or shared rendering changes:

- run only the relevant targeted tests and `npm run typecheck` when TypeScript changes;
- run `hugo --minify` when build behavior, templates, shortcodes, routes, or configuration change;
- use `netlify dev` and inspect the affected viewport and console only when rendering could have changed;
- use screenshots only when a visual baseline or before/after comparison materially helps; screenshots are not a default gate.

Leave the full Hugo build, full `npm test` suite, and cross-site visual regression to CI/CD. Repeat them locally only when CI is unavailable, the user requests it, a cross-cutting release is unusually risky, or a CI failure needs diagnosis. Wait for required CI checks before merging.

## Deliver through GitHub

- Update from the remote before starting when the working tree allows it.
- Commit only the intended scope with a concise, contextual message.
- Prefer `gh` for GitHub operations.
- Follow the issue-closing rules in `CLAUDE.md` when a PR is associated with an issue.
