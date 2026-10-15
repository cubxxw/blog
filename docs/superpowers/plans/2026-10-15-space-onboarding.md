# Space terminal onboarding and living café implementation plan

> For agentic workers: Pi + MiMo was attempted and stopped after two interrupted requests without implementation output. Codex completed the settled tasks, acceptance and independent review. Do not recursively delegate.

**Goal:** Show a composed terminal while the real café prepares behind it, reveal an interior people can inhabit, and add a believable autonomous cat without weakening reading or state continuity.

**Architecture:** A small lifecycle controller owns boot milestones and reveal, consuming the world's first-render signal. Separate pure cat behavior from its rigged Three.js presentation. Preserve the existing DOM workspace, routing, private state, six scenes, and on-demand renderer.

**Tech stack:** Hugo 0.145.0 extended, native JS modules, Three.js r160, existing Playwright Chromium.

**Spec:** The frozen Pi task contract and [research](/Users/cubxxw/.codex/visualizations/2026/10/15/01a13ec1-4c36-7410-915a-d52653d3129f/space-cafe-research-2026-10-15.md), amended by the user's terminal onboarding request.

## Global constraints

- No model-provider changes, secrets, external writes or deployment.
- Real milestones; no fictitious loading percentage, simulated tests, or self-awarded 99 score.
- Plain root visits/reloads enter the café; explicit routes, locale restoration and history keep intentional targets.
- Existing OS, notes, sessions and direct content links remain usable; Product Lab remains secondary.
- Use one browser at a time and no iOS simulator. Preserve shared dependency installation.
- Keep loading controls and normal content links available, including failures and reduced motion.

## Review focus

- World first-frame signal must follow actual rendering, and loading overlay must not hide/pause the world root.
- Late imports, context loss and skip races must not re-hide a usable UI or steal focus from an active app.
- Root reload policy must not damage explicit deep links or resurrect stale profile routes.
- Cat must pause in workspace, hidden tab, quiet mode and reduced motion without a duplicate animation loop on resume.
- Cat and vendor asset cleanup must release owned resources without disposing shared materials/geometry still in use.

## Tasks

### 1. Terminal lifecycle and entry policy

Files: `assets/js/space/onboarding*`, `assets/js/space/cafe*`, `layouts/partials/space/cafe.html`, `assets/css/space-cafe.css`.

- [x] Write tests for delayed/failed readiness, ordered milestones, ready-only reveal, skip, repeat visits and cancellation.
- [x] Implement real first-frame callback/Promise in `world-cafe.js`, connect the terminal to module/geometry/render readiness.
- [x] Implement an immediately visible terminal, meaningful short zh/en stages, optional short presentation, direct reading escape and reduced-motion handoff.
- [x] Update entry rules and regressions for plain root reload versus deep route, locale and history restoration.

### 2. Interior composition and content paths

Files: `assets/js/space/world-cafe.js`, café template/CSS and scoped controls.

- [x] Start at a deliberately framed interior pose rather than outside the building.
- [x] Refine natural light, materials, contact, furniture detail and a real existing travel photograph.
- [x] Remove/reduce the dense floor-groove aliasing visible in baseline screenshots.
- [x] Provide direct writing/workspace choices and preserve wandering/scene selection on narrow/short viewports.

### 3. Autonomous cat and environment comfort

Files: `assets/js/space/world-cat*`, pure behavior module, licensed `static/models/space/` assets, r160 loader when needed.

- [x] Validate a real licensed rigged cat asset and record source/license; loading is optional and does not block core use.
- [x] Test safe paths, avoidance, dwell states, pause/resume and bounded time deltas independently of rendering.
- [x] Integrate gait/crossfade, purposeful walks, rest and contact shadow.
- [x] Add quiet control and ensure workspace/reduced-motion/hidden states are actually quiet and cheap.

### 4. Rendered acceptance

Files: `scripts/space-onboarding.browser.mjs`, affected existing Space tests.

- [x] Exercise actual delayed/failed module loading, ready/reveal order, replay/skip/revisit and deep links.
- [x] Exercise cat motion/rest/collision, quiet/reduced-motion/background lifecycle and retained private note.
- [x] Capture 1440×900, 390×844 and 320px/low-height evidence; inspect screenshots, not only DOM assertions.
- [x] Run focused unit tests, typecheck, Hugo build and existing impacted workspace/session checks.

### 5. Independent review and delivery

- [x] Codex inspects implementation, exact test receipts, assets and final rendered scenes.
- [x] Independent reviewer checks correctness, lifecycle, routing and coverage; confirmed serious issues are fixed and rechecked.
- [x] Save verified/pending acceptance honestly and expose a local preview. Publish only with appropriate authorization.

## Baseline evidence

Captured from the original main checkout on 2026-10-15, using the real full Chromium renderer:

- `/Users/cubxxw/.codex/visualizations/2026/10/15/01a13ec1-4c36-7410-915a-d52653d3129f/space-evidence/before-entry-desktop.png`
- `/Users/cubxxw/.codex/visualizations/2026/10/15/01a13ec1-4c36-7410-915a-d52653d3129f/space-evidence/before-room-desktop.png`
- `/Users/cubxxw/.codex/visualizations/2026/10/15/01a13ec1-4c36-7410-915a-d52653d3129f/space-evidence/before-room-mobile.png`

Observed: doorway introduction occupies the opening screen; dense thin floor grooves produce visible moiré; mobile view emphasizes the computer while environmental depth and direct reading affordance are limited. These are baseline observations, not a completed evaluation of the replacement.

## Parent environment note

Baseline `npm run typecheck` currently fails on the unmodified main checkout with TS5023: unknown `--ignoreConfig`. Shared node_modules toolchain is stale relative to package metadata; parent is diagnosing. Do not weaken source typecheck or change package versions to conceal this pre-existing environment issue. Baseline focused node tests: 27/27 passed.

## Final verification

See `docs/acceptance/2026-10-15-space-onboarding-local.md` for actual results, screenshots, review closure and remaining physical-device/subjective validation boundaries. The local dependency overlay fixed stale/missing shared dependencies without changing the lockfile or shared installation.
