# Personal social identity implementation plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans for scoped implementation and independent review.

**Goal:** Deploy the approved H personal calling card and G author mark across the blog's social previews.

**Architecture:** Keep the native Hugo pipeline. Bundle the approved artwork, localized English artwork and transparent signature/mark. Home/about previews use the author card; article/section cards use reusable branded typography. All preview fallbacks share one cached image result. Restore the mobile chat viewport constraint that blocked the prior required browser gate.

**Tech stack:** Hugo 0.145, bundled fonts, native image filters, Node contract tests, Playwright, existing Netlify Git publisher.

**Spec:** output/social-brand-lab-2026-10-12/DIRECTION.md and the user's approval of H + G, with A retained as a secondary field-note mood.

## Constraints

- Preserve unrelated local edits. Commit only this task, directly to main as required by CLAUDE.md.
- Exact identity: 熊鑫伟 / cubxxw; website cubxxw.com. No invented credentials.
- Use the original photograph as the production portrait; approved generated artwork supplies typography/material.
- Chinese and English previews, opaque 1200×630 PNG, below 5 MB, content-addressed paths.
- Keep real article covers and article text unchanged; explicit dedicated local social-image overrides remain supported.
- No runtime image API, new frontend framework or external font dependency.

## Review focus

- Long Chinese/Latin titles and single-character final lines remain inside the image.
- Home and about use the identity card; sections/articles still identify the page.
- Backup path prefixes and overrides remain valid; no old default PNG is referenced by preview fallbacks.
- The original portrait remains recognizable; badge transparency remains intact until composition onto an opaque card.
- Mobile chat controls must stay in the viewport without forced clicks or weakened tests.

## Tasks

- [x] Bundle H artwork, English localization, transparent cubxxw signature and G mark; record source and composition geometry.
- [x] Update social partials and Open Graph/Twitter/WeChat/schema fallbacks; add an isolated real-Hugo identity regression test and inspect home/long-title outputs.
- [x] Reproduce and fix the mobile chat viewport failure in the existing CSS/runtime module; run the failing mobile tests unchanged.
- [x] Independently review, run targeted checks and production build, commit/push, await required CI, verify live page/image URLs with social crawler requests.

No additional design approval is needed: the user explicitly selected the proposed direction and requested implementation and deployment.

Local evidence: real-Hugo identity/contract suite 5 passed; generated SEO audit
593 pages passed; unchanged mobile homepage suite 13 passed against fresh source
output. Independent review also verified backup prefixes, override traversal,
overlay cache invalidation, cover fallback preservation and 640px thumbnails.

Release evidence: implementation commit `90edd5275dc191c0d23ab5fbea6f06a02a3d7fa6`;
required quality run https://github.com/cubxxw/blog/actions/runs/38169170505
completed successfully. Existing native Netlify Git publisher delivered the
new home-zh/home-en identity images. Twitterbot, facebookexternalhit and
redditbot requests confirmed anonymous access; image responses are PNG,
1200×630 and below 5 MB. Actions release/followups remain intentionally skipped
in shadow mode; no publisher cutover or credential change was performed.
