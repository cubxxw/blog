# BEAR Workspace Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task in this session.

**Goal:** Turn the existing BEAR OS into a persistent, freely usable personal desktop.

**Architecture:** Keep Hugo as the content source and preserve Product Lab. Add independent state, app and desktop modules; all interaction surfaces call the same workspace operations.

**Tech Stack:** Hugo, native ES modules, Pointer Events, localStorage, existing Netlify blog-ai, repository Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-bear-workspace-design.md`

## Global Constraints

- No invented public content, login, sent messages, Immich connection or sandbox execution.
- Preserve unrelated user edits and bilingual canonical URLs.
- No added production framework dependency; assets loaded only on the workspace page.
- User requested local verification; do not publish automatically.

## Review Focus

- Corrupt or oversized saved state must not prevent opening the desktop.
- A window restored from a larger display must remain reachable.
- Multiple windows, minimized windows and document focus must stay consistent.
- User text and fetched article HTML must not execute code.
- Network failures, AI cancellation and unavailable services must show accurate status.

### Task 1: Persistent workspace model

Files: `assets/js/space/state.mjs`, `scripts/bear-workspace-state.test.mjs`.

Interfaces: `createWorkspace(saved, viewport)`, `reduceWorkspace(state, action, viewport)`, `serializeWorkspace(state)`, `safeURL(value, origin)`.

- [x] Test opening multiple windows, focus, minimize/restore, viewport clamping and corrupted state before implementation.
- [x] Run the tests and observe missing behavior.
- [x] Implement bounded versioned state, geometry, preferences, notes and favorites.
- [x] Verify tests pass.

### Task 2: Desktop and real applications

Files: `layouts/partials/space/desktop.html`, `assets/js/space/apps.js`, `assets/js/space/desktop.js`, `assets/css/space.css`, `static/images/space/landscape.svg`, `layouts/section/projects.html`.

Interfaces: `mountApps({root,catalog,execute,getState,updateNote,notify})` returns app rendering and disposal; desktop exposes a browser-local guest operation surface. The execution service separately checks local-development origin and credentials.

- [x] Add browser acceptance scenarios before implementing the desktop.
- [x] Build the desktop and inject build-time public content; preserve secondary Product Lab and knowledge graph.
- [x] Implement real reading, photos/map, books, products, notes, contacts, CLI and existing AI integration.
- [x] Add search, keyboard commands, window movement/resizing/snap, overview, settings, export and state restoration.
- [x] Verify reachable mobile full-screen apps, keyboard focus and no horizontal overflow.

### Task 3: Verify and compare

Files: `docs/bear-workspace.md`, `output/playwright/bear-workspace/` evidence.

- [x] Build using Hugo; start Netlify dev and test the resulting pages.
- [x] Run state tests, targeted browser tests and product integration checks.
- [x] Inspect desktop/mobile/light/dark/reduced-motion screenshots, console and content loading.
- [x] Compare the same observed tasks against the two requested reference sites and report gaps honestly.
- [x] Commit only current-task files after verification; leave delivery local for the user's review.

### Added local execution task

Implemented `scripts/bear-runtime.mjs` and `netlify/functions/bear-runtime.js`, with authentication, production rejection, bounded requests, a persistent Docker volume and serialized execution. Verified real browser/CLI/AI calls and persistence after a runtime restart. Production multi-user sandboxes remain a separate deployment.

### Evidence

- 13 state/runtime/proxy checks, 2 real Docker checks, 20 browser scenarios; no browser exceptions.
- Reproduced and repaired cancelled-reader mutation, incorrect keyboard window focus, Product Lab graph exit, asynchronous note-save control access and dark heading inheritance.
- Production Hugo build, bilingual product checks and rendering-table checks passed.
- Reference comparison is limited to observed desktop interactions; complete competitor scoring remains unknown, as documented in `docs/bear-workspace.md`.
- Clean output verification and local-only commit are recorded at delivery. No publish was requested.
