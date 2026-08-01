---
name: blog
description: Maintain the cubxxw bilingual Hugo blog, including brief-driven writing, content front matter and taxonomy, PaperMod templates, CSS and JavaScript, SEO, local browser verification, and GitHub delivery. Use for any content, design, implementation, validation, or publishing task in this repository.
---

# Blog repository workflow

## Start with repository truth

1. Read `CLAUDE.md` before changing content or code. Treat it as the authoritative project guide.
2. Inspect the current branch, remote state, and working tree before editing. Preserve unrelated local changes.
3. Read the files that own the behavior before proposing a change.

## Route the task

- For a brief-driven article, read `_briefs/README.md` and `docs/blog-editorial-workflow.md`, then use `.claude/skills/write-blog-from-brief/SKILL.md`.
- For a new or rewritten opening, also use `.claude/skills/craft-article-opening/SKILL.md`.
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

## Implement with the existing architecture

- Prefer repository-native Hugo layouts, partials, assets, and scripts over parallel implementations.
- Keep bilingual routes and labels aligned.
- Preserve responsive behavior, dark mode, accessibility, SEO metadata, and resource fingerprinting.
- Use `apply_patch` for intentional file edits and explicit paths when staging mixed worktrees.

## Validate proportionally

- Use `netlify dev` for local page verification; do not compile through `make`.
- Run `hugo --minify` for a production build.
- Run `npm test` for affected browser flows and `npm run typecheck` for TypeScript changes.
- Run the relevant content checks, such as `npm run frontmatter:check`, `npm run tags:check`, or `npm run flavor:check`, when their inputs change.
- Inspect desktop and mobile rendering for template or CSS changes and check the browser console.
- Run `git diff --check` before committing.

## Deliver through GitHub

- Update from the remote before starting when the working tree allows it.
- Commit only the intended scope with a concise, contextual message.
- Prefer `gh` for GitHub operations.
- Follow the issue-closing rules in `CLAUDE.md` when a PR is associated with an issue.
