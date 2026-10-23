# Space terminal startup

Status on 2026-10-23: implementation and lightweight checks passed. Full Hugo/Netlify rendering, real WebGL acceptance, independent review, CI, and production delivery remain pending. This is not a production release receipt.

## Behavior

- The initial HTML contains a readable terminal with the public identity, the current language's article count, and the project count. It remains visible while JavaScript and the scene are loading, including workspace deep links and language navigation.
- Engine import, room construction, and the first rendered frame drive the three runtime checkpoints. Completed lines show elapsed time since the boot controller mounted. These times are not navigation timings or simulated machine diagnostics.
- Normal preparation has no loading or confirmation button. The page enters automatically after the actual first frame, with a 160 ms opacity transition; reduced motion enters immediately. A failed startup exposes a workspace recovery action. The writing link remains available even if JavaScript cannot load.
- Replacing the renderer when switching between Jiangnan and an outdoor scene reopens the terminal until the replacement scene paints. Same-renderer theme changes retain the current canvas.

## Performance changes

1. Removed the Jiangnan CSS rule that clipped all terminal content to an invisible 1 px region.
2. Removed the 1,400 ms minimum presentation period. Reduced the separate fade from 550 ms to 160 ms. The minimum period only affected first frames arriving before that deadline; this is not a measured 1,400 ms improvement for every visit.
3. Preload the workspace bundle, scene controller, shared Three.js module, and selected renderer during HTML parsing, before the large catalog/template content. Saved theme selection is validated; denied storage uses the default. Embedded pages do not start these preloads. The other renderer remains lazy. Preloading does not evaluate a renderer or create a GPU context.
4. Defer the six-view cubemap reflection capture until after the first scene frame. Existing material readiness, fallback deadlines, software-renderer budgets, and final reflection behavior remain intact.

## Verification

The combined targeted Node run passed **79 tests, 0 failures**. Coverage includes boot state and timers, slow connections, failure recovery, reduced motion, keyboard focus, replacement-renderer readiness, theme/preload selection, denied storage, nested pages, reflection capture order, door transitions, resident interaction, and CI workflow contracts.

```sh
npm run space:boot:test
node --test --test-concurrency=1 scripts/space-cafe.test.mjs scripts/space-rain-room.test.mjs scripts/space-entry.test.mjs scripts/space-jiangnan-reflection.test.mjs scripts/space-jiangnan-door-fade.test.mjs scripts/space-cat-interaction.test.mjs scripts/ci-workflows.test.mjs
git diff --check
```

Syntax checks passed for the changed preload, onboarding, café, and renderer-controller scripts. The existing BEAR CI step now also runs the new preload and boot-stage tests.

An isolated browser fixture used the actual CSS and onboarding controller, with the terminal template's bilingual values resolved locally. It did **not** build the Hugo page or load a 3D scene. Checks at 1440 px desktop, 390 px Chinese mobile, and 320 px English mobile found no horizontal overflow; normal startup had zero visible buttons. Runtime checkpoint and failure interactions worked, with no captured console errors. Screenshots and the full TAP receipt were saved in the task's persistent local visualization artifact directory.

The existing onboarding E2E contracts were updated, and a replacement-renderer test was added. They have **not** been run in this task.

## Remaining delivery gates

The machine-wide `.agent-pause` marker was present. The resource snapshot showed 139 Node/npm processes, 8.13 GiB swap, and 37.84 GiB free disk. The repository's task lifecycle rule prohibits starting new builds or delegation while that marker remains effective. This task therefore did not start a Hugo/Netlify build, WebGL browser suite, or independent delegate/reviewer, and did not push to main or claim deployment.

After that restriction is lifted or an explicit task-specific exception is authorized, complete independent review, the targeted production build, real initial-load/switch/failure/deep-link acceptance, the applicable current-head CI checks, and production revision readback. Keep the current main checkout and unrelated work intact. The initial task baseline was `01952d12`.
