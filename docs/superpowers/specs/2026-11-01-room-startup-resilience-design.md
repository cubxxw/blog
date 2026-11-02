# Room startup resilience

The author approved the preceding diagnosis and explicitly requested implementation and production publication, preserving the current room. This is an authorized repair, not a redesign.

Keep the current camera, geometry, lighting, photographic vista, final texture quality and interactions. Embed a small preview derived from the exact current vista in the room catalog. It can establish a real photographic first frame without another network dependency. The unchanged full-quality vista replaces it when available. A stalled or failed full image retains that preview; the previous geometric town is only a final fallback when no usable preview exists. Optional daylight/water images never own entry.

The existing centered progress gains its existing workspace action during preparation. Selecting it synchronously cancels pending 3D initialization, restores the original DOM workspace and focus, and settles pending startup promises. It must not remount Notes, navigate, wait for GPU resources or report a user cancellation as a failure. A later deliberate room visit may initialize a fresh renderer. Fatal graphics/module failures automatically reveal the usable workspace; no extra error-screen click is required.

Keep a bounded local diagnostic record with closed error codes, stage, elapsed time and readiness counters. Never retain exception messages, private workspace data, user text, credentials or access-bearing URLs. Preserve original error cause classifications at imports, first-frame deadlines, draw failures, context loss and image deadlines. No new telemetry service or network writes.

After these functional repairs, prioritize the existing full vista in the document head for the selected Jiangnan room. Start optional daylight/water requests only after a real first frame, retaining exact final images/shaders. Do not introduce minimum presentation delays, reduce final image quality, or globally prewarm shaders.

Considered: merely increasing the global timeout leaves a hanging request in charge; making the workspace the default changes the accepted room entrance; progressive current-image loading plus independent workspace recovery meets the requested behavior. Absolute zero errors cannot be guaranteed across all networks/devices; recovery must remain usable when rendering is impossible.

Acceptance: held/404 primary vista still yields the current photographic room; all material requests may hang without blocking entry; original full-quality image eventually replaces preview; background/resume/dispose and late callbacks are safe; a held module permits immediate workspace entry and later explicit retry; fatal renderer failure preserves editable content and keyboard focus; optional images start after first frame; desktop/mobile and both languages retain accepted room appearance.
