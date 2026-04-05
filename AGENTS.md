# Repository Guidelines

## Project Structure & Module Organization

This repository is a Hugo blog with a customized `PaperMod` theme. Main site content lives under `content/`, split by language (`content/en/`, `content/zh/`) and section (`ai-technology`, `growth`, `projects`). The root `articles` section is an aggregate landing page, not a content archive. Use `archetypes/` for new content templates. Custom layouts and overrides live in `layouts/`; shared styling and images live in `assets/` and `static/`. Utility scripts are in `scripts/`, and Netlify Functions are in `netlify/functions/`. The theme itself is tracked as a submodule in `themes/PaperMod`.

## Build, Test, and Development Commands

- `make module-init`: initialize the `PaperMod` submodule on a fresh clone.
- `make run`: start the main Hugo dev server with drafts enabled on port `13131`.
- `make build`: generate a local development build into `public/`.
- `make envbuild`: build with the system `hugo` binary and refresh the generated content index first.
- `make netlify-dev`: run Hugo plus Netlify Functions locally; requires `DASHSCOPE_API_KEY`.
- `make new-post SECTION="growth" POST_NAME="slug"`: scaffold paired English and Chinese posts into `ai-technology/posts` or `growth/posts`.
- `make new-ai-project PROJECT_NAME="slug"`: scaffold paired English and Chinese project pages into `projects/`.
- `node scripts/generate-content-index.mjs`: refresh the AI search index after content changes affecting search.

## Article Authoring

Add new content into the real section directories, not a root `posts` directory. Use:
- `make new-post SECTION="ai-technology" POST_NAME="slug"` for technical writing.
- `make new-post SECTION="growth" POST_NAME="slug"` for growth and life writing.
- `make new-ai-project PROJECT_NAME="slug"` for project-focused notes in `content/{lang}/projects/`.

Recommended authoring flow:
1. Pick the correct section first: `ai-technology`, `growth`, or `projects`.
2. Create the file with the project Make target or the matching Hugo path.
3. Fill front matter before writing the full body.
4. Refresh the content index after changes that affect search or discovery.

Recommended front matter baseline for normal articles:

```yaml
---
title: "Article Title"
date: 2026-03-28T12:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
categories:
  - Development
description: >
  State what the article is about, who it helps, and the main takeaway in plain text.
---
```

Use this baseline because it matches the existing repository patterns, keeps field order stable, and avoids low-quality SEO filler. Keep `description` plain text and keep `keywords` empty unless there is a concrete need.

## Timezone Rule

Treat China/Shanghai (`Asia/Shanghai`, `+08:00`) as the default publishing timezone for this project.
- Always write article timestamps with an explicit `+08:00` offset.
- Do not rely on machine-local timezone inference.
- If an article date is in the future relative to Shanghai time, Hugo production builds may exclude it from the published site.
- For not-yet-ready content, prefer `draft: true` over a future `date`.

## Coding Style & Naming Conventions

Follow the existing style in each area. JavaScript in `netlify/functions/` uses CommonJS, semicolons, double quotes, and 2-space indentation. Hugo templates and YAML front matter should stay consistent with current files. Prefer lowercase, hyphenated slugs such as `content/en/growth/posts/my-new-post.md` or `content/en/projects/my-new-project.md`. Keep bilingual content mirrored when a feature or article is intended for both languages.

## Testing Guidelines

There is no dedicated unit test suite in the root project today. Validate changes by running `make build` for site generation and `make netlify-dev` when editing `netlify/functions/` or AI search behavior. For content updates, confirm front matter renders correctly and that links, images, and section placement resolve in the local Hugo server.

## Commit & Pull Request Guidelines

Recent history shows a mix of Conventional Commit prefixes (`feat:`, `fix:`) and informal messages. Prefer the clearer pattern: `feat: add bilingual travel post index` or `fix: correct mobile header spacing`. Keep PRs focused, describe user-visible changes, list any required env vars or build steps, and attach screenshots for layout/theme updates. Mention content paths or function files changed so reviewers can validate quickly.

## Configuration & Security Tips

Do not commit secrets. `DASHSCOPE_API_KEY` is required only for local Netlify function work. Treat `public/` as generated output, and avoid editing `themes/PaperMod` directly unless the theme override cannot be handled in `layouts/` or `assets/`.
