# Space window first paint

**Goal:** Show the current photographic window view on the first visible room frame, without briefly rendering the previous geometric town.

**Scope:** `jiangnan-exterior.js`, `world-jiangnan.js`, and their existing lifecycle and browser tests. Keep the current room, photo wall, scene choices, and workspace behavior.

**Approach:** Make the geometric town an on-demand fallback for an actual primary-image failure. Remove the temporary daytime switch to geometry. Keep the existing boot screen until the primary window image has either loaded or definitively failed; optional daytime and water textures must not block entry.

- [x] Reproduce the initial-view and daytime regressions against production functions.
- [x] Remove normal-path geometric town construction and wait for the primary vista before completing boot.
- [x] Verify image failure, late callbacks, resource cleanup, and reflection timing with targeted tests.
- [x] Inspect a cold entry with delayed window-image loading and a narrow viewport in the browser.
- [x] Record the observed result and the limits of local validation in `docs/acceptance/2026-10-26-space-window-first-paint.md`.
