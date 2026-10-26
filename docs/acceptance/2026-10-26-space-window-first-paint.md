# Space window first paint — 2026-10-26

The reported first-entry screenshot showed the current room around the previous geometric town. The window photograph arrived after the room had already been revealed.

## Cause and change

The room's first-frame gate checked material readiness but not the primary vista. The exterior also constructed the complete previous town for every photographic room, then hid it after the image loaded. A separate daylight branch could show the town again while the optional daytime texture was pending or unavailable.

The normal photographic path now omits town construction and waits for its primary vista before completing boot. The daytime branch retains the current photograph while its optional texture loads. Geometry is constructed only for an explicit geometry view or a definitive primary-image failure. This preserves the existing explorable failure recovery without using the previous design as a loading screen. The 12 water-light uniform slots remain valid when no town exists.

## Local evidence

- A regression executing the production frame loop failed before the change: room entry completed with the primary vista still `loading`.
- Seven targeted Node files passed: **65 tests, 0 failures, 0 skips**. These cover the vista lifecycle, production frame/reflection loop, window projection, room navigation, rear-door interruption, boot stages and preloading.
- Desktop and mobile Chromium passed **4 browser tests**: delayed primary-image cold entry and the existing failed-image exploration/workspace journey on both viewports. The delayed-image case confirms that boot stays visible after material readiness, then the first revealed frame reports the photographic vista.
- Both actual first-frame screenshots were inspected. They show the current photographic window view. Local screenshots remain under `output/playwright/space-first-paint-20261026/` and are not committed.
- `npm run typecheck`, `git diff --check` and Hugo 0.145.0 production compilation passed. The build generated 721 pages and used `/tmp/blog-space-first-paint-20261026/public` for the frozen browser checks.
- Independent review found no actionable issue in lazy construction, shader uniforms, asynchronous ownership, disposal or first-frame/reflection ordering. Its repeated 31 tests overlap the 65 above and are not additional tests.

`netlify dev --offline --port 8888` did not provide a stable preview: the local CLI repeatedly reported unexpected termination. It was stopped with its owned children. Browser verification therefore used the successful production build and the repository's frozen-output server. No deployment settings or dependencies were changed.

These are local results; they do not establish completion of the remote release checks or production deployment. Physical devices, Safari and Firefox were not tested in this change.
