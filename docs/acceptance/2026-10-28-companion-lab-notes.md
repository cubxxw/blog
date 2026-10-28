# Contextual companion and Lab notes acceptance

Scope: remove the resident Companion Dock item, summon from current content, let focused reading hide the Dock, and distinguish technical deep reads from products. Base: `origin/main` at `d80fcb8d`; delivery branch: `codex/companion-lab-notes-20261028`. This is branch delivery, not a production release.

## Behavior

The desktop Dock has seven destinations and no Companion item. Mobile uses Home, Writing, Projects, Notes and Settings. Application search and Command/Control J retain a keyboard recovery path. Article and product text selections expose an explanation action. Notes requires an explicit live selection and previews only that selection, with a sharing notice, before sending. Opening a composer makes no model request. Removing the source removes both reference and quoted text from the next user message; previously sent conversation history remains history. Closing returns focus to the originating control. Focused reading hides the Dock and restores the reader's position on exit.

Thirteen existing English/Chinese technical article canonicals move from `/projects/<slug>/` to `/lab-notes/<slug>/`. Source files stay in their original sections. Old addresses remain aliases and direct Netlify redirects; older compatibility redirects point directly to the new canonical. Existing reader windows and bookmarks migrate through catalog aliases on both startup and cross-tab synchronization. Product inventory and the default BEAR OS entrance remain unchanged. The bilingual Lab notes index, article breadcrumbs, cards, source-sharing label and Writing filter use the new name.

## Verification

- 76 targeted Node tests pass, covering companion context, Notes selection, library state, actual storage synchronization, source removal, navigation, reading focus and agent tools.
- TypeScript checks, front matter validation, canonical tags and `git diff --check` pass.
- Redirect audit: 312 rules, no duplicate sources, loops or chains.
- Full minified Hugo build passes: 352 English pages, 375 Chinese pages, 63 aliases. The first cold build timed out in the unchanged homepage template; the cache-warmed full build passed. A further full build includes the final narrow-screen fix.
- Generated SEO audit passes; final output is checked again after the last build.
- `scripts/space-contextual-entry.browser.mjs`: nine browser checks pass in Chrome, with no page errors. It covers explicit send, quotation removal, private-note exclusion, passage-only sharing, product selection, focus return, scroll restoration, 320px light/dark layouts, both indexes and old-route redirects. Provider responses are intercepted fixtures: four test requests, no live model acceptance claim.
- Screenshots were inspected at 1440px and 320px. The added viewport assertion first reproduced an input width of 654px and an offscreen send button; scoped minimum-width constraints bring input and send controls inside the viewport. Source paragraphs, URLs and sharing hints remain readable.
- The changed bodies of 21 existing Markdown articles were compared with the base commit. Only internal link destinations changed; facts, wording, code, quotes and image paths are unchanged.

Reproduce browser acceptance with `BEAR_DEV_URL=http://127.0.0.1:8899 BEAR_BROWSER_CHANNEL=chrome node scripts/space-contextual-entry.browser.mjs` against `netlify dev`. Set `EVIDENCE_DIR` to choose a screenshot/report destination. The standard test browser remains Chromium when no override is supplied.

## Review and boundaries

Independent review found one issue: cross-tab storage synchronization initially skipped alias migration. It is fixed and covered by a regression that executes the actual storage listener. No other actionable source findings were reported. Visual inspection then found and fixed the quoted-source overflow described above.

The author requested a new remote branch. No PR, merge or production deployment is performed. Physical iPhone long-press, Safari, VoiceOver, and a live provider turn were not tested; touch selection uses the browser's native selection behavior.

## Chinese copy check

The current `lieflat-less-ai-tone` rules and project writing constraints were read. New interface/index copy and the edited documentation passages were reviewed sentence by sentence. The interface/index sample is below the detector's 500-Han-character minimum; the script reported that condition, so no statistical score is claimed. No whitelist rewrite was needed; a second manual review retained the same wording. Existing article bodies were outside the rewriting scope.

`npm run flavor:check` is **not green**: it finds an existing E3 sentence in the MarkItDown blockquote (now line 46), plus a NotebookLM density warning. The identical E3 quote was reproduced from `HEAD` before this task at line 44. Only URL metadata changed in these articles; the author's published quote is preserved, and the detector is not weakened.

## Author merge instruction

After receiving the branch, verification summary and disclosure of the existing prose-check error, the author explicitly requested merging on 2026-10-28. The existing published quote remains unchanged under that instruction. Required engineering and release checks still apply. Merge and deployment verification are performed through the repository's existing main workflow; the preceding branch-delivery statements describe the initial handoff.

### Pre-merge source-scope correction

Full workflow run `40641623686` first failed on `legacy-flavor`: it treated the unchanged MarkItDown body as an authored-text edit because URL metadata had changed. The source gate now compares modified files with their proven base revision. Only identical bodies and identical non-routing YAML fields may omit prose detection; the routing field allowlist is `url`, `aliases`, and `labnotes`. New, renamed, copied, malformed, unreadable-base and text-edited files retain the original hard detector. Full prose audits still report the historical quote. Structural, metadata, tag, redirect and rendering gates are unchanged, and source reports retain `flavorScope` for audit.

The integration test runs the real prose detector and proves that new title/description/body violations still fail. Missing historical content and A/R/C status also fail closed. All 31 content source/output/report tests pass. Replaying the failing CI change set now checks 410 source files with zero errors, 266 existing warnings, and no waived exceptions. This fixes the selection of authored prose; it does not suppress a detector finding or change the author's quote.

### Library browser contract update

Run `40642391305`, partition `legacy-3`, found six stale test failures: the expected library list omitted the requested Lab notes filter, and the keyboard helper assumed Favorites was always the fifth option. The helper now reads the actual option values before performing the same Home/ArrowDown keyboard sequence. The expected contract includes Lab notes, and the suite also verifies that its displayed articles match the real catalog. Font size, hit targets, focus, title wrapping, scrolling, bookmarks and persistence assertions remain intact.

The seven affected real-browser scenarios pass locally against the frozen production HTML, including 320px, English/Chinese, light/dark and the complete bookmark/reload/remove flow. The local run used installed Chrome through `BEAR_BROWSER_CHANNEL=chrome`; CI continues to use its pinned Chromium by default. Complete BEAR OS Node coverage also passes: 594 tests, zero failures.

### Existing room repair dependency

Exact-head run `40646296607` passed the library partition but found the resident startup observation failure already being repaired on `origin/codex/get-267-pr`. Review of actual historical main `e3af48a` confirms independent boot 30s, rendered roam 5s, cat load 30s and motion 12s gates, all inside the 90s journey. Later main incorrectly combined those phases inside one 30s read. The existing repair restores the original phase semantics, keeps late-transport rejection and root identity, replaces attribute timer polling with passive DOM mutation observation under the same absolute Node deadline, and recalculates resident activity in the frame that completes camera travel.

The repair at `7e7eddd7` is integrated by a normal merge. The staged delta is eleven room source/test/evidence files; it does not revert recent writing, SEO data or any Companion/Lab notes changes. Independent review found no actionable issue. All 79 selected host tests, the exact installed Playwright 1.64.1 typecheck, and a complete minified Hugo build pass. The combined source still requires a fresh frozen producer, focused room preflight and the complete browser graph before main.

The earlier local dependency cache was Playwright 1.63.0; an isolated installation now matches the manifest and lock at 1.64.1. Before the room merge, the seven library cases and nine contextual entry flows were re-run successfully with the correct client and installed Chrome. These local checks do not substitute for Linux acceptance.

Diagnostic-only runs `40652219158` and `40653722998` retained original operation deadlines and recorded phase timings on a separate branch. Neither qualifies a release. No trace disabling, pixel-budget reduction or experimental diagnostic code is part of this product branch; render quality and native actions are preserved.

### Mobile keyboard-to-pointer fixture correction

The remaining five mobile browser failures in the upstream repair were reproduced locally with the correct Playwright 1.64.1 client. After the fixture focuses the speaker button and presses Enter, the existing `:focus-within` object navigation covers the projected monitor point. All fifteen retained upstream pointer attempts hit a DOM button rather than the canvas; the unchanged pose and roam state confirm that the physical computer never received the click.

The fixture now completes its actual keyboard interaction using bounded native Shift+Tab navigation until the existing canvas receives focus. It asserts canvas focus and an unchanged room pose before continuing. The original real Three projection, native mouse click, monitor activation and absolute 5s state gate remain. No generic click helper hides or bypasses an overlay, no product state is written, and no new product Escape policy is introduced. The red reproduced the original 5s failure; all five affected mobile browser scenarios then passed without retries, including native/compatible iframe preservation, continuous sound, navigation and reload. The optional local browser-channel override retains pinned Chromium as CI's default.

### Complete-graph follow-up

Run `40658658856` binds source `d0d9fd8c` to frozen producer artifact `12802358284`. Its 18 focused room checks pass on their first attempts, as do quality, all three interactive engines, and legacy partitions 1 and 3. Partitions 2 and 4 exceed their unchanged 120-minute job limit; GitHub's annotation confirms the maximum-execution cancellation. This run does not qualify a release. Its retained desktop log also contains three failed attempts of the bookshelf breathing test, while the mobile reading-focus test exposes the conditional-control fixture error below.

The browser planner now uses eight legacy partitions. Actual Playwright 1.64.1 enumeration before and after the partition change retains exactly the same 1,238 legacy identities and 573 interactive identities (191 per engine), with no omission or duplicate. Each new legacy partition contains 154 or 155 cases. Workers, trace capture, filters, projects, individual operation/journey limits, job limits and enforcing aggregation are unchanged. Host regressions prove that omitting partition 8 still prevents certification. All eight partitions require a new frozen producer; results from the old four-partition run cannot certify it.

The 320px reading failure is reproduced locally as a null bounding-box read for the new selection-only explanation control. Before selection it is intentionally hidden. The fixture now explicitly requires that hidden state, then requires exactly four ordinary controls, checks every one is visible, and retains the original 44px minimum dimensions. All six desktop/mobile reading-focus scenarios pass with no retries. No product layout or timeout is changed by this fixture correction.

The bookshelf diagnostic run `40676060248` compares the original and native-clock fixtures against the identical frozen UI and locked Playwright 1.64.1 on Linux. The original has one 90-second timeout and two passes; the native-clock fixture passes all three first attempts. Original failure traces show setup ending at 31.108s, the twelve nominal 400ms live samples finishing at 59.952s, all cat/amplitude assertions passing, a screenshot finishing at 73.705s, and native pointer movement/wheel completing at 84.935s. The overall 90-second limit expires during the final travel-state expectation. A later successful pose read is retained as late evidence, never counted as a pass.

This is a cumulative journey-budget failure, not evidence that breathing stopped or that `clock.resume()` hung. The independent steady-state case inherited six clock-control calls from a former combined mid-flight test, although it samples no intermediate flight state. It now uses the browser's native clock and waits for the actual completed bookshelf arrival. The original 90-second journey, 5-second travel-state observation, twelve real 400ms samples, cat state/position/time and amplitude assertions, screenshot, trusted wheel input and final entry-pose equality remain. All actual mid-flight interruption/resize cases retain their controlled clocks. The paired runs do not isolate every runner/hardware variable and do not certify the new complete graph.

The optional focused preflight now includes both bookshelf cases and all six reading-focus scenarios, increasing its required first-attempt inventory from 18 to 26 without replacing the complete graph. The selected CI/inventory/aggregation tests pass 41/41, preflight/receipt tests pass 11/11, and the complete TypeScript check passes. Fresh exact-head preflight, every browser partition, aggregation, merge and online verification remain required.

Both final native-clock bookshelf cases also pass locally without retries. Independent final review reports no actionable findings. `2026-10-28-companion-browser-followup.json` retains the diagnostic hashes, raw counts, exact failed-call timeline, causality limits, current-worktree partition comparison and local check totals.
