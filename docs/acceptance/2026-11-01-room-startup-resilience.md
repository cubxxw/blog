# Room startup resilience — 2026-11-01

The author requested the diagnosed startup repairs, then image-priority optimization, preserving the existing room and publishing after verification. Base source: `86a76ae7`; functional repair: `8d37a3cb`.

## Resulting behavior

The catalog embeds a 256px WebP derived from the exact existing vista (5,687 data-URI characters, about 4.2 KB decoded file). Its photographic texture can establish a real first frame while the unchanged full-quality image is pending. Full image success upgrades the same shader uniform; failure retains the preview. An eight-second primary-image deadline records `vista-timeout` without destroying a working room. The previous geometric town remains the last fallback when no usable photograph exists.

The existing centered terminal exposes its workspace action throughout loading. It cancels and settles startup immediately, disposes any current world, restores the original DOM workspace, and rejects late factory ownership. A deliberate later visit can retry. The same cancellation applies during cross-renderer scene replacement; a browser regression first reproduced an old pending replacement creating a late canvas before the cancellation fix.

Startup has one cancellable ten-second visible-time deadline covering imports, construction and the first frame. Background/hidden room time is excluded. Fatal startup or runtime graphics errors reveal the ordinary workspace automatically. Diagnostics retain only twelve closed-code records and numeric readiness counters in a DOM attribute; raw exceptions, URLs and private content are excluded. No telemetry service or external writes were introduced.

Parser-time preloading prioritizes only the selected Jiangnan full vista. Daylight and water extension requests start once, after the real first frame. The original full-vista URL remains `/images/space-cafe/jiangnan-vista-study-v2_hu_c4a7a0328eb5671c.webp`. Camera, furniture, lighting, shaders, render-quality budgets and final image quality were not redesigned.

## Verification record

- New tests failed first for missing preview, hidden loading action, unresolved workspace handoff, eager optional images and missing prioritized image preload. The held-replacement browser case also failed before its cancellation fix.
- Task 1 focused Node checks: 80 passed. Initial broad room run: 600/601; the failing source-extraction fixture still used a deleted comment boundary and explicit recovery semantics. It was updated to assert automatic release and preserve its focus checks.
- Initial fault suite: 11/14 passed. Three failures came from newly written test selectors targeting intentionally hidden mobile Dock/HUD controls. Tests now use the existing File and workspace menus; the four handoff/module-failure cases passed 4/4 in 15.9 seconds. These reruns are not additional unique product scenarios.
- Preview, optional-image ownership and preload checks after optimization: 31 passed. `space:boot:test` includes the new regressions and passed 30/30.
- Hugo 0.145.0 extended production compilation generated 722 localized pages. Cold image-cache compilation took 128,901 ms; later full compilation took 26,457 ms. These are build times, not visitor entry measurements.
- The repository's `netlify dev --offline --port 8888` served the Chinese project page with HTTP 200. Browser fault tests use frozen production output so development rebuild timing cannot change their application bytes.
- Desktop and mobile restored full-vista screenshots were inspected. They retain the accepted room and photographic framing. This is visual inspection plus unchanged owning files/assets, not a pixel-identical cross-time comparison of animated rain or clock state.

Final verification before review: `bear:test` passed 601/601, `space:boot:test` passed 30/30, typecheck passed, all 16 new fault journeys passed, and all 22 selected existing desktop/mobile regressions passed without retries or skips. Browser groups overlap some behavior and are not a field reliability percentage. Independent review, final commit, CI and production read-back results will be appended before this task is marked delivered. No unmeasured physical-device, Safari or universal zero-error guarantee is implied.
