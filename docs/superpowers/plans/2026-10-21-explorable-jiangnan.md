# Explorable Jiangnan Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a viewport-filling, explorable 3D Jiangnan night café with real fullscreen and the existing live OS.
**Architecture:** A dedicated Three r160 renderer shares the current scene facade and workspace owner. Room and exterior modules build geometry; pure state owns walking/camera poses. Fullscreen/audio/chrome are independent of scene construction.
**Tech Stack:** Existing Hugo, vendored Three/CSS3DRenderer, native Fullscreen/Audio APIs, Playwright.
**Spec:** `docs/design/2026-10-21-space-explorable-jiangnan.md`.

## Global Constraints

- Preserve the six existing spatial scenes, bilingual routes, BEAR OS/Product Lab and private browser data.
- No fixed-aspect background plate, image hotspot replacement or new runtime dependency.
- Reuse current PBR maps; direct-main delivery remains authorized; preserve unrelated `output/`.
- Work in attached `/Users/xiongxinwei/.codex/worktrees/space-night-cafe/blog`.

## Review Focus

- Camera input must stop at dialogs, hidden pages, workspace focus and window blur.
- CSS3D workspace must hide behind opaque geometry and retain one original DOM owner.
- Scene changes/fullscreen exit/rapid travel must not lose note selection or focus ownership.
- Reduced motion stops environmental animation but does not block intentional exploration.
- Software WebGL, missing graphics, resize and unsupported fullscreen remain usable.

### Task 1: Fullscreen, shared ambience and room controls

**Owner:** isolated worker. **Files:** `fullscreen.js`, `room-audio.js`, `space-jiangnan.css`, café/desktop partials, fullscreen import in `desktop.js`, dedicated fullscreen tests.
**Produces:** `mountRoomAudio({root,assets,zh}) -> {setQuiet,dispose}`; shared fullscreen button; `jiangnan` renderer styling, `.jiangnan-workspace[data-surface=monitor|desktop]`.
- [x] Add behavior checks for real fullscreen/exit, unsupported fallback and no automatic audio.
- [x] Implement native controls and ensure mobile 320px fits with touch controls.
- [x] Run targeted tests and return exact changed files; do not commit shared changes.

### Task 2: Three-dimensional room, exterior and navigation

**Owner:** primary agent. **Files:** `jiangnan-state.mjs`, `jiangnan-room.js`, `jiangnan-exterior.js`, `world-jiangnan.js`, `cafe-scene.js`, section resource config and state/browser tests.
**Consumes:** shared ambience API and renderer styling. **Produces:** current `createCafeWorld` interface plus real geometry/camera/raycast behavior for `jiangnan`.
- [x] First prove missing 3D state/movement/collisions/full-viewport behavior with failing tests.
- [x] Build crafted furniture/lighting, geometry-based rain river/boat/houses/mist, live screen and photo raycasts.
- [x] Implement walk/look/inspect/travel/visibility/disposal and preserve native workspace owner.
- [x] Verify actual frames, geometry, walking collisions, screenshots and interactions on desktop/phone.

### Task 3: Integrated review and delivery

- [x] Run targeted original workspace/scene contracts, state tests, typecheck and production build.
- [x] Independently review input, geometry, resource cleanup, fullscreen and native workspace preservation; repair findings.
- [x] Prepare named staging and the existing direct-main publication path. Keep unrelated output files and the node_modules symlink out of the commit.

Deployment evidence is recorded separately after publication: `.netlify/space-3d-deploy.json` binds the live Netlify deployment to the source commit; `.netlify/space-3d-production.json` records real desktop, phone and short-landscape journeys against matching resource fingerprints. A local build or a pushed commit does not establish production acceptance.

## Decisions

Ruling: latest user request authorizes this correction and its reversible implementation; continue without another design approval round. Existing native publication authorization remains in force.
Ruling: run independent fullscreen/chrome work alongside the scene build using the parallel-agents skill; file ownership is disjoint.

## Verification and repaired findings

259 state/runtime tests passed. 86 targeted browser cases passed across the new 3D room/fullscreen, product entries, original scenes, detail views, private input and responsive reading. Three additional forced-software WebGL journeys passed for first geometry, actual navigation/parallax and the physical Mac's original editor. TypeScript, product integration and the production Hugo build passed.

Independent review found and closed two P2 issues. Leaving fullscreen for Product Lab now releases the hidden fullscreen owner. Returning the live workspace to the physical monitor now keeps it connected synchronously, before CSS3DRenderer's next frame; immediate Ctrl+K no longer queries a detached menu. The reviewer separately confirmed four immediate searches, the original Notes node/text/backward selection, actual context-loss recovery and resource disposal without page errors.
