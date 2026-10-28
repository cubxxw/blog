# Retained browser draft checks

The two mobile room journeys reached their original 90-second deadline while checking the embedded draft after returning to the computer. The recorded failures do not establish that a draft value was lost. Repeated Playwright DOM snapshots of the surrounding room added observation work to these checks.

The return checkpoints now use public Chromium protocol sessions to read the actual textarea value and button text. The original exact expectations, native pointer and keyboard inputs, request counts, continuous audio checks, graphics recovery, screenshots and 90-second case budget remain. Binding, reading and cleanup each have a total five-second deadline, including late-response rejection. Cleanup is awaited inside the test body.

Binding identifies the unique browser iframe rather than assuming it is the only iframe on the page. A separate, zero-size listening iframe is valid. Same-document history changes are also valid; a passive reproduction confirmed the room calls `history.replaceState` without replacing its document. Missing, duplicate, replaced or detached targets, changed documents, stale protocol objects and replaced fields still reject a checkpoint. Reads never cache expected values or modify the room.

## Verification before hosted checks

- 74 focused host tests passed, including all 43 protocol regression cases. Strict TypeScript checks passed.
- The original mobile native and compatible journeys passed locally in 12.649 and 16.519 seconds, with zero retries and the unchanged 90-second limit. Both return checkpoints and bounded cleanup executed. The frozen room files were unchanged before and after the run.
- Local browser results used macOS and the previously frozen production room application. They are not Linux CI, a current full-site producer, a physical-phone test or production browser acceptance.
- The observation changes preserve the product interaction. Renderer quality, dependency versions, lockfile, assertions, timeouts and retries are unchanged. The new host regressions are included in the existing explicit CI test list. A separate initialization optimization is described below.

## Earlier production state

[PR 487](https://github.com/cubxxw/blog/pull/487) was merged externally as `c85ed6df613e9198c4b82bea7ae3559f06ae72ef` while its previous required browser check was failing. Its classic Netlify production deployment became ready at 2026-10-28 16:18:29 UTC. The Chinese and English project routes returned HTTP 200, and their observed room entry script matched the immutable deployment. This limited response check does not establish complete browser acceptance. The subsequent [main quality run](https://github.com/cubxxw/blog/actions/runs/40724176630) was still running when this follow-up was prepared.

This follow-up requires its own current-source hosted checks before normal merge. Lighthouse and PSI measurement recovery are tracked separately; the room checks above do not prove either measurement service has recovered.

## Safe PSI failure diagnostics

The PSI collector previously discarded provider error bodies on HTTP failures, leaving only a status code. The follow-up retains only closed, allowlisted provider statuses, reasons and recognized Lighthouse runtime codes. Unknown, malformed and oversized diagnostic bodies produce fixed `unknown` values. The 16 KiB ceiling applies before diagnostic JSON parsing; the existing transport deadline still covers receiving the response. Messages, URLs and raw provider bodies are not retained.

The plan denominator, retry policy, timeout, failure classification and failing exit status remain. The focused PSI and downstream contract tests passed 158 cases after three new regressions first failed against the original implementation. This adds diagnostic evidence; it does not establish that the previously failed online measurements now pass.

## Avoid duplicate timber calculations

A bounded public-page diagnostic identified long tasks in room initialization. The procedural timber builder calculated the same pure sample twice per pixel, once for color and again for roughness. It now retains the already clamped oil byte in a local array for the second pass. Across five timber materials, sample calls decrease from 5,242,880 to 2,621,440. No dimension, pigment, material, shader, rendering budget or lifecycle order changes. The array stays local to the synchronous builder, with 0.5 MiB per call and no retained external reference; five calls can temporarily occupy 2.5 MiB before collection.

Offline native Chromium Canvas2D checks compared all RGBA bytes of ten original and optimized color/roughness maps. Hashes match before and after photographic blending, including the worn surface's real stroke. Late delivery after disposal leaves versions, wake calls and disposal counts unchanged. Original and candidate source hashes were independently matched to the evidence. All 46 existing related timber, geometry, furnishing, floor and alignment tests passed.

These checks prove reduced duplicate work and matching texture output. They do not establish recovery of the Linux Lighthouse freeze: the public-page diagnostic did not reproduce its 45-second timeout, and its CPU-throttling method differed from Lighthouse's simulated metric calculation. The subsequent current-source hosted build and browser checks are still required.
