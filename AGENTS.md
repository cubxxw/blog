# Repository Guidelines

## Project Structure & Module Organization

This repository is a Hugo blog with a customized `PaperMod` theme. Main site content lives under `content/`, split by language (`content/en/`, `content/zh/`) and section (`ai-technology`, `growth`, `posts`). Use `archetypes/` for new content templates. Custom layouts and overrides live in `layouts/`; shared styling and images live in `assets/` and `static/`. Utility scripts are in `scripts/`, and Netlify Functions are in `netlify/functions/`. The theme itself is tracked as a submodule in `themes/PaperMod`.

## Build, Test, and Development Commands

- `make module-init`: initialize the `PaperMod` submodule on a fresh clone.
- `make run`: start the main Hugo dev server with drafts enabled on port `13131`.
- `make build`: generate a local development build into `public/`.
- `make envbuild`: build with the system `hugo` binary and refresh the generated content index first.
- `make netlify-dev`: run Hugo plus Netlify Functions locally; requires `OPENAI_API_KEY`.
- `make new-post POST_NAME="slug"`: scaffold paired English and Chinese posts.
- `node scripts/generate-content-index.mjs`: refresh the AI search index after content changes affecting search.

## Coding Style & Naming Conventions

Follow the existing style in each area. JavaScript in `netlify/functions/` uses CommonJS, semicolons, double quotes, and 2-space indentation. Hugo templates and YAML front matter should stay consistent with current files. Prefer lowercase, hyphenated slugs such as `content/en/posts/my-new-post.md`. Keep bilingual content mirrored when a feature or article is intended for both languages.

## Testing Guidelines

There is no dedicated unit test suite in the root project today. Validate changes by running `make build` for site generation and `make netlify-dev` when editing `netlify/functions/` or AI search behavior. For content updates, confirm front matter renders correctly and that links, images, and section placement resolve in the local Hugo server.

## Commit & Pull Request Guidelines

Recent history shows a mix of Conventional Commit prefixes (`feat:`, `fix:`) and informal messages. Prefer the clearer pattern: `feat: add bilingual travel post index` or `fix: correct mobile header spacing`. Keep PRs focused, describe user-visible changes, list any required env vars or build steps, and attach screenshots for layout/theme updates. Mention content paths or function files changed so reviewers can validate quickly.

## Configuration & Security Tips

Do not commit secrets. `OPENAI_API_KEY` is required only for local Netlify function work. Treat `public/` as generated output, and avoid editing `themes/PaperMod` directly unless the theme override cannot be handled in `layouts/` or `assets/`.
