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
