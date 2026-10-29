# PR 492 failed-case trace diagnosis

Source: GitHub run `40788123958`, artifact `12864171225`, candidate `edad168d00b9ca15e522ee62de1869996894b1f5`. Artifact digest: `sha256:0e3f2fac40f620bc908e98bbc4d48114c6b7afee81ca06f5ff13470e5a180b53`.

Only the artifact central directory, result JSON and first-attempt trace prefixes were downloaded through HTTP 206 byte ranges. `*-trace-prefix.bin` contains original inflated inner ZIP prefix bytes. `volume-outer-prefix.bin` also preserves its original compressed range. Each extracted trace/network entry reaches DEFLATE EOF and passes its original inner ZIP CRC32 and size descriptor; see `trace-integrity.json`. No browser, app, build or test execution was started.

All times below are seconds relative to each trace testRunner monotonic origin. `library end` precedes Playwright's after snapshot; `caller end` includes its completion. Snapshot timestamps include transport/renderer queueing; snapshot `collectionTime` itself was generally 3–7 ms. These timings do not measure snapshot CPU cost or prove all boundary delay is exclusively tracing.

| Case / call | API start | Before snapshot | Library end | After snapshot | Caller end | Actual returned state |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Sleeping / final pose `crmc@919` | 89.398 | 91.089 | 92.789 | 94.502 | 94.503 | Exact entry pose restored |
| Records / final rain `almr@3503` | 88.298 | 89.495 | 90.700 | 91.905 | 91.906 | Original rain id 0, stopped false |
| Zero volume / last poll `fhfq@667` | 89.102 | 90.232 | 90.235 | 90.238 | 90.239 | Music gain 1, original rain id 0 |

The sleeping case's preceding travel=false assertion used 82.553–89.397 s, with before/after snapshots at 84.268/89.396 s. Its twelve original 400 ms breathing samples used 26.264–57.354 s. The original screenshot used 57.361–70.742 s. Preserve those sampling intervals and screenshot.

The records case returned `platterAngle=5.235987755982987` both before and after its original 180 ms pause. Final rain identity also matched. Several late attribute reads each used about 3.6 s including snapshot completion. The final native playback click used 58.066–74.987 s; preserve its action and actionability behavior.

The zero-volume case's End press completed at 88.985 s. The first poll at 88.987–88.999 s returned gain 0.9863187670707703. The next poll returned gain 1 after the total test deadline. Thus the reported nonunit gain is the last timely sample, not proof the gain never reached 1. The unchanged result JSON records first attempt failed and both retries timedOut.

Recommended smallest scope: replace only read-only root-attribute waits, root data snapshots and native audio snapshots inside these three failed cases with the existing bounded `expectRoomAttributes`, `readRoomObservation` and `readRoomAudioSources`, using `withRoomObservationSession` to reuse the connection. Preserve every original assertion value/precision, each 5s/30s observation budget, the 90s total case budget, all native actions, reload, screenshots, breathing intervals and platter pause. Keep separate checkpoints around input; do not combine observations across actions. In the paused-clock case avoid adding polling timers that wait while the page clock is paused. Actual savings and stability require current-head CI; these old traces do not certify a proposed fix.

The one flaky lamp/fan physical hit is separate. No raycast/hit correctness inference follows from the three timeout traces.
