# Contextual companion and Lab notes implementation plan

**Goal:** Deliver the author's requested contextual entry and distinct writing/product naming on a new remote branch.

**Architecture:** Extend the existing Hugo desktop and bounded companion context. Preserve source sections and use Hugo URL overrides plus aliases for the legacy deep reads.

**Stack:** Hugo, native JavaScript, Node tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-companion-lab-notes-design.md`

## Constraints and review focus

Preserve homepage geometry, BEAR OS default, bilingual behavior and unrelated local files. No new dependencies. Check stale selections, keyboard recovery, narrow screens, persisted reader URLs and redirect chains. Private editor content must remain absent until an explicit selection is sent.

### Task 1: Contextual companion

- [x] Add failing tests for explicit note selection, bounded context and removal; run them.
- [x] Modify `companion.mjs`, `apps.js`, `desktop.js`, desktop markup and scoped styles to remove the Dock item, offer selected-text actions and hide the Dock during focused reading.
- [x] Run companion, content-details, navigation, reading-focus and reading-layout tests.

### Task 2: Lab notes routes and discovery

- [x] Add a failing route-inventory test for canonical Lab notes paths and legacy aliases.
- [x] Update legacy article URL metadata, direct redirects, internal references, bilingual discovery and breadcrumbs; add an index using existing card styles.
- [x] Verify metadata, tags, redirects and production build output; preserve article bodies.

### Task 3: Delivery

- [x] Exercise contextual entry, privacy, focus, bilingual URLs and mobile layout in a browser; inspect actual screenshots.
- [x] Request an independent branch review; resolve material findings.
- [x] Commit and push the new branch without merging or deploying. Repository rules reserve PR creation for an explicit request.
