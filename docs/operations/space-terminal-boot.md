# Space terminal startup

Status on 2026-10-24: implementation, independent review, production build, targeted real WebGL acceptance, and the isolated fixture diagnosis passed. Final current-head CI and production delivery remain pending. This is not a production release receipt.

## Behavior

- The initial HTML contains a readable terminal with the public identity, the current language's article count, and the project count. It remains visible while JavaScript and the scene are loading, including workspace deep links and language navigation.
- Engine import, room construction, and the first rendered frame drive the three runtime checkpoints. Completed lines show elapsed time since the boot controller mounted. These times are not navigation timings or simulated machine diagnostics.
- Normal preparation has no loading or confirmation button. The page enters automatically after the actual first frame, with a 160 ms opacity transition; reduced motion enters immediately. A failed startup exposes a workspace recovery action. The writing link remains available even if JavaScript cannot load.
- Replacing the renderer when switching between Jiangnan and an outdoor scene reopens the terminal until the replacement scene paints. Same-renderer theme changes retain the current canvas.

## Performance changes

1. Removed the Jiangnan CSS rule that clipped all terminal content to an invisible 1 px region.
2. Removed the 1,400 ms minimum presentation period. Reduced the separate fade from 550 ms to 160 ms. The minimum period only affected first frames arriving before that deadline; this is not a measured 1,400 ms improvement for every visit.
3. Preload the workspace bundle, scene controller, shared Three.js module, and selected renderer during HTML parsing, before the large catalog/template content. Saved theme selection is validated; denied storage uses the default. Embedded pages do not start these preloads. The other renderer remains lazy. Preloading does not evaluate a renderer or create a GPU context.
4. Defer the six-view cubemap reflection capture until after the first ready scene frame and the terminal fade. Existing material readiness, fallback deadlines, software-renderer budgets, and final reflection behavior remain intact. The reveal wake and visibility lifecycle still complete the single reflection capture.

## Verification

The combined targeted Node run passed **82 tests, 0 failures**. Coverage includes boot state and timers, slow connections, failure recovery, reduced motion, keyboard focus, replacement-renderer readiness, theme/preload selection, denied storage, nested pages, reflection capture order, hidden-page reveal, door transitions, resident interaction, and CI workflow contracts.

```sh
npm run space:boot:test
node --test --test-concurrency=1 scripts/space-cafe.test.mjs scripts/space-rain-room.test.mjs scripts/space-entry.test.mjs scripts/space-jiangnan-reflection.test.mjs scripts/space-jiangnan-door-fade.test.mjs scripts/space-cat-interaction.test.mjs scripts/ci-workflows.test.mjs
git diff --check
```

Syntax checks passed for the changed preload, onboarding, café, and renderer-controller scripts. The existing BEAR CI step now also runs the new preload and boot-stage tests.

An isolated browser fixture used the actual CSS and onboarding controller, with the terminal template's bilingual values resolved locally. It did **not** build the Hugo page or load a 3D scene. Checks at 1440 px desktop, 390 px Chinese mobile, and 320 px English mobile found no horizontal overflow; normal startup had zero visible buttons. Runtime checkpoint and failure interactions worked, with no captured console errors. Screenshots and the full TAP receipt were saved in the task's persistent local visualization artifact directory.

The production Hugo build passed (349 English and 372 Chinese pages) and was served through offline Netlify dev, with no backend functions. A single Chromium worker passed **24 real WebGL cases without retries**: ten startup/switch/failure/deep-link/graphics-recovery contracts at desktop and mobile, plus the default Jiangnan boot at both sizes in Chinese and English. Those real pages also had zero horizontal overflow, a visible terminal during a held renderer request, zero normal loading buttons, automatic first-frame entry, and no page runtime errors. Actual terminal and room screenshots are retained separately from the earlier isolated fixture.

The complete type check passed with the locked TypeScript 7.0.2 compiler. The shared existing dependencies contained 5.9.3, which rejected `--ignoreConfig`; the correct compiler and macOS ARM package were installed only in the registered task artifact directory. Project dependencies and global settings were not modified.

A local cold-context probe observed one request per startup module, parallel controller/vendor/selected-renderer fetches, no request for the other renderer, and exactly one scene canvas. After moving reflection out of the fade, one observed reveal-to-complete interval was 174.6 ms (the configured timer is 160 ms). These are local frozen-site observations on a busy host, not a WAN benchmark, a controlled before/after comparison, or a universal startup-time guarantee.

Independent review found and then verified fixes for three P2 issues: a stalled replacement renderer now shares the visible-time deadline and releases its controller on failure; explicit deep-link recovery restores document focus; reflection capture waits for the first ready frame rather than an earlier unready draw. A new maps=0 to maps=12 regression covers that last distinction. The reviewer independently passed 39 focused Node tests and found no remaining P0-P2 issues.

The reviewer also verified the terminal-exit reflection gate in three lifecycle cases: normal fade, completion while hidden, and material fallback before terminal completion. All captured exactly once after the proper wake. The final 24 real WebGL cases were rerun after this render scheduling change and passed in 1.1 minutes.

Remote preflight `39972971697` exposed a missing virtual-clock advance in the modified cancelled-read/replay test: the real scene was ready, but the paused test clock left the 160 ms exit at `revealing`. The test now asserts that intermediate state and advances the actual exit timer, preserving all reader-race and final-workspace assertions. Both desktop and mobile replay cases then passed locally without retries (2 cases, 6.4 seconds). This adds the replay scenario omitted from the earlier 24-case targeted selection; the failed CI run is not treated as a passing release gate.

Full CI `39978587373` passed preparation, quality, all three interactive browser engines, and legacy partitions 1–3. Legacy partition 4 reported 275 passed, 3 skipped, one failed audio fixture, and one flaky camera fixture. The audio fixture raced autoplay permission against its injected HTTP 503; it now obtains a real gesture while holding that first response, observes the network error, and requires a second real gesture to recover rain without starting music. The camera fixture could miss its short approach on a slow software renderer; it now controls that timeline after normal boot, checks normal-motion prerequisites, and retains real drag, resize, and two-finger input. No production audio or camera behavior was changed for these fixture fixes.

Isolated diagnostic `39996903172` verified the unchanged frozen runtime from `08434a8c` with test harness `76e89db5`. Both fixtures passed at desktop and mobile sizes, three times each: **12 passed, 0 failures, 0 retries, 0 flaky**, in 9.1 minutes. The independent reviewer found no P0–P2 issues in those changes. This diagnostic has `releaseProof: false` and does not replace the final full CI. Its temporary workflow extension was removed before that final run.

The native Netlify branch preview was also checked in a real browser. Desktop Chinese, desktop English, and mobile Chinese passed on the first attempt. Mobile English timed out once during startup; the original probe did not record failed requests, so that attempt's exact cause is unknown. A targeted mobile-English repeat passed with no failed requests, page errors, or console errors. All six startup assets matched the locally verified runtime bytes. These are preview results, not production acceptance.

## Remaining delivery gates

The initial machine-wide `.agent-pause` marker was present. The initial resource snapshot showed 139 Node/npm processes, 8.13 GiB swap, and 37.84 GiB free disk. Work first stopped after lightweight checks. The author then explicitly authorized this task's targeted build, page acceptance, and independent review. The global pause marker remains untouched. Builds reused the existing Hugo/dependencies and image cache; browser work was serial and used the same frozen site through Netlify dev.

Complete the applicable current-head CI checks and production revision readback before claiming delivery. Keep the current main checkout and unrelated work intact. The initial task baseline was `01952d12`. The local Netlify CLI has no valid site authorization; the repository's existing native Git publisher remains the configured release path. Production currently returns 404 for `__release.json`, so use the actual native deployment identity plus exact built asset readback rather than treating that endpoint as available.

Later resource snapshots exceeded the machine's pressure thresholds (over 200 Node/npm processes and over 13 GiB swap). Final CI runs in GitHub Actions. No new local browser, build, or implementation delegation is started while that pressure persists. Production readback will verify the native published deployment identity, bilingual terminal HTML, and the six runtime asset hashes; it will not be described as a new production browser run.
