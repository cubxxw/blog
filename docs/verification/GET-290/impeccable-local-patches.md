# Impeccable 4.8.0 local patches — PR #493 / GET-290

2026-10-29; reviewed against PR head `f169cb52`. These are intentional local fixes to the vendored guidance and launchers, authorized as part of fixing and merging PR #493. No project `DESIGN.md` or design sidecar was changed by this patch.

The original source remains [the official skill-v4.8.0 release](https://github.com/pbakaus/impeccable/releases/tag/skill-v4.8.0), `universal.zip`, SHA-256 `82e6f6ff3a2b18f46f0f2fc388c1ab7abf3ccc52bbfc522456396d13011d6706`, with engine 0.1.18. That digest authenticates the original download only. It does **not** attest that the locally patched files below are byte-identical to upstream. The engine binary and its checksum manifest are unchanged. A future skill update must review/reapply these local fixes rather than silently discard them.

The 16 reviewed findings result in these changes:

- Existing DESIGN.md writes consume the user's recorded refresh/overwrite/merge choice. A missing choice returns pending with both files untouched; prior authorization does not trigger another question. Both documenter contracts, their reference, and the calling handoff agree.
- Post-write `hook` invocations try installed engines and then skip without network/cache creation; explicit commands retain verified bootstrap. A skipped hook is not a clean scan. POSIX behavior is exercised; the equivalent Windows branch is source-reviewed only.
- Native adaptation separates available window size from fold posture/hinge data. Web audits now name source/URL JSON detection, distinguish failure from clean findings, and describe browser fallback limits.
- Simplification preserves semantic color roles; error UI uses allowlisted localized messages; layout targets are quoted. Pinned directions carry a corroborated source marker accepted by both reviewers without invented random seeds. Moving painted material remains a separate raster layer.
- Tooltip guidance separates Tippy behavior from Popper positioning. Optimization uses standard dynamic import and measured compositing heuristics. Enhancement guidance uses the project support floor and feature checks; backend selection handles missing/failed adapters and devices, then WebGL2/CSS fallback. Quieter text requires composited contrast checks and valid CSS easing.

Validation:

- Before the hook fix, the six-case host suite produced **4 passed / 2 failed**: cold install and rejected cache attempted download and returned 127. Download commands were intercepted in an isolated temporary HOME/PATH; no actual network request was made.
- After the fix, `node --test .cursor/skills/impeccable/scripts/impeccable-hook.test.mjs`: **7 passed / 0 failed**, including configured/home/PATH/verified-cache delegation, rejected-cache skip, cold-install skip, and explicit offline bootstrap failing closed.
- `/bin/sh -n` for the POSIX launcher, `node --check` for the test, and `git diff --check` passed.
- The JavaScript example in `overdrive.md` ran in Node VM against **6 backend-selection scenarios**, including absent GPU, no adapter, rejected device, adapter failure, successful device, and failed WebGL context. All selected the expected backend; this is API-boundary logic validation, not real GPU/browser acceptance.
- The prose contracts were reviewed against prior-choice/missing-choice, pinned/unpinned, and moving-painted-layer scenarios. No agent behavioral benchmark, browser, Windows runtime, dependency install, or site build ran for these guidance changes.

Reference checks used [Tippy's positioning comparison](https://atomiks.github.io/tippyjs/v6/motivation/), [MDN requestAdapter](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter), and [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change). Android guidance was checked against the existing platform terminology; the official Android pages timed out during this run.

Exact patched paths (relative to repository root):

- `.cursor/agents/impeccable-documenter.md`
- `.cursor/agents/impeccable-finish-reviewer.md`
- `.cursor/skills/impeccable/SKILL.md`
- `.cursor/skills/impeccable/reference/adapt.native.md`
- `.cursor/skills/impeccable/reference/audit.md`
- `.cursor/skills/impeccable/reference/degraded/documenter.md`
- `.cursor/skills/impeccable/reference/degraded/finish-reviewer.md`
- `.cursor/skills/impeccable/reference/distill.md`
- `.cursor/skills/impeccable/reference/document.md`
- `.cursor/skills/impeccable/reference/harden.md`
- `.cursor/skills/impeccable/reference/hooks.md`
- `.cursor/skills/impeccable/reference/layout.md`
- `.cursor/skills/impeccable/reference/new-work.md`
- `.cursor/skills/impeccable/reference/onboard.md`
- `.cursor/skills/impeccable/reference/optimize.md`
- `.cursor/skills/impeccable/reference/overdrive.md`
- `.cursor/skills/impeccable/reference/quieter.md`
- `.cursor/skills/impeccable/reference/region-map.md`
- `.cursor/skills/impeccable/reference/visualize.md`
- `.cursor/skills/impeccable/scripts/impeccable`
- `.cursor/skills/impeccable/scripts/impeccable.cmd`
- `.cursor/skills/impeccable/scripts/impeccable-hook.test.mjs`
- `docs/verification/GET-290/impeccable-local-patches.md` (this local patch record)
