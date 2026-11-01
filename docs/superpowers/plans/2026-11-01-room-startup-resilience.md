# Room startup resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove network-image startup traps, offer immediate workspace recovery, preserve the current room and publish the verified repair.

**Architecture:** Inline the exact vista's lightweight preview and independently upgrade the photographic texture. Decouple workspace entry from cancellable room startup, record bounded local failure codes, then prioritize essential image requests and defer optional ones.

**Tech Stack:** Existing Hugo templates, vanilla JavaScript, Three.js r160, Node tests, Playwright and Netlify Git builds.

**Spec:** `docs/superpowers/specs/2026-11-01-room-startup-resilience-design.md`

## Global Constraints

- Keep current room camera, geometry, lighting, photographic vista, final image quality and interactions.
- Keep the original DOM workspace, Notes, drafts and focus; no new service or telemetry writes.
- User explicitly authorized implementation and production publication. Execute inline without repeated approval questions; obtain independent whole-change review before publishing.
- Preserve unrelated checkout/output work. Work in this isolated branch and follow the repository's existing Git-to-Netlify publication path.

## Review Focus

- Primary and optional image requests never settle; a real preview frame must enter without claiming the full image loaded.
- User chooses workspace while renderer import is held; late factories/callbacks must not steal the workspace or recreate a disposed context.
- Module, image, drawing and context-loss errors must retain separate closed diagnostic codes, with no private payloads.
- Disposal, hidden tabs and late texture callbacks must release ownership exactly once and remove timers/listeners.
- Full-quality restoration and deferred optional images must preserve both-language desktop/mobile visuals.

### Task 1: Bounded image entry, independent workspace and diagnostics

**Files:** `assets/js/space/{cafe.js,cafe-scene.js,onboarding.js,world-jiangnan.js,jiangnan-exterior.js}`, new focused startup helpers if needed, `layouts/partials/space/cafe.html`, existing/new `scripts/space-*.test.mjs`, and `tests/e2e/space-startup-resilience.spec.ts`.

**Interfaces:** Catalog `night.vistaPreview` is a data image derived from the unchanged original. Exterior reports `image-preview` until full texture succeeds. World errors carry a closed `code`; cancellation is separate from failure. Pending renderer imports must observe disposal before constructing a world.

- [ ] Write and run failing tests: held primary retains photographic preview, eventual upgrade, failed image, exact disposal; visible enabled workspace action during loading; cancellation of a held import; classified diagnostics and privacy limits.
- [ ] Implement preview ownership with an 8-second primary-image diagnostic deadline, immediate usable workspace handoff, guarded restart and automatic fatal fallback.
- [ ] Run targeted Node tests and browser fault injection, including held primary/materials/module and late completion. Preserve content node identity and focus. Commit the verified functional repair.

### Task 2: Prioritize images and validate release

**Files:** `layouts/section/projects.html`, `layouts/partials/space/cafe.html`, `assets/js/space/{preload.js,world-jiangnan.js,jiangnan-exterior.js}`, corresponding targeted tests, acceptance record.

**Interfaces:** First real frame activates optional image requests once. The parser-time preload selects only the active renderer's primary vista; embedded pages create no extra GPU/image workload.

- [ ] Write and run failing tests proving optional images are not requested before a real first frame and selected-vista preload behavior.
- [ ] Prioritize the unchanged primary vista; defer optional images without changing final shaders/assets. Re-run affected lifecycle/room tests, typecheck, production build and desktop/mobile fault and visual checks.
- [ ] Obtain independent review, address material findings with regression tests, commit and pass current required source checks.
- [ ] Publish through existing Netlify Git builds; verify exact production commit/state and read back bilingual room/workspace paths. Record actual results and limitations without promising zero errors across untested devices.
