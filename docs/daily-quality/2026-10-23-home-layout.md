# Homepage layout restoration — 2026-10-23

## Problem and cause

The author reported a broken-looking homepage and confirmed that the established layout should be restored. The production baseline was `b37951125a5805f5a4de0daa462689d8b17f83ab`, Netlify deploy `6ada925fbbaa90db44d827ea`.

Commit `e845a5e15f9a99515c2d1cd0d36fd06e222c3f9b` (2026-10-22 19:32 +08:00), primarily a café feature commit, also changed the homepage template and `assets/css/home-about-experience.css`. It moved the conversation and social links out of the hero into a new two-column block after the writing, replaced the three-card writing grid with full-width rows, and changed typography and spacing. The sparse contact column then shared the conversation's 420px height (560px at narrow desktop widths), producing the large empty area shown in the report. This is a layout regression, with no reproduced character-decoding failure.

That commit also changed the existing layout tests to expect the new structure and added a first-screen article expectation. Those checks validated the replacement design, rather than preserving the author's established layout.

A separate existing geometry defect was reproduced: every one of the 36 real English questions overlaps the absolute-positioned caption when placed in the bottom orbit slot at 1440px. Previous collision checks covered the portrait only.

## Decision and scope

Selected: restore the homepage arrangement from the parent of `e845a5e`, then move the desktop caption into normal flow below the orbit. Impact: restores the familiar two-column introduction, social controls, original typography, channel rail and article cards; removes the detached sparse contact block. Cost: two rendering files plus focused test updates. Risk: responsive placement and lazy decoration activation; covered below. Acceptance: one conversation in the hero, social links before writing, the original responsive card grid, no question/portrait/caption collisions or horizontal overflow.

Deferred: redesigning the contact block. It would require a new product decision and would conflict with the author's request to use the previous layout. No unrelated café, article, font-loading or product-destination changes were reverted.

The homepage template before the book section matches the previous layout; after it, the product cards retain their current direct product destinations. Conversation behavior, streaming safety and short-screen recovery remain current. The caption is a sibling of the orbit on desktop; the existing compact mobile label remains inside the conversation layer. The desktop orbit also uses the available column width, capped at 420px, while retaining the existing taller narrow-desktop geometry needed for long questions.

## Validation

- Before fixing: the restored-layout regression test failed with zero conversations in the hero (expected one); the real English question pool produced 36 caption collisions.
- Hugo 0.145.0 extended production build passed with the production canonical origin.
- TypeScript checks passed.
- Desktop homepage suite: 58 passed. Mobile-emulation homepage suite: 58 passed.
- Page wayfinder suite: 15 passed sequentially. An earlier parallel run had two transient opacity-transition failures; no navigation source or assertions were changed to obtain the sequential pass.
- First restoration run also exposed four incorrect new test assertions: the historical 1440px grid has three cards in one row, while 1024px has two columns. Corrected to assert the actual historical breakpoints.
- Production-artifact unit/performance checks: 27 passed, one preview-only check skipped, zero failed. Earlier invocations had an absent default output directory and then a localhost canonical mismatch; rerun against the actual production build succeeded.
- Checked Chinese/English, light/dark, 320–1440px in browser contracts, plus manual renders at 375, 800, 1440 and 1710px. All six orbit slots were checked against every real localized question, rather than only the random visible sample.
- Manual renders: meaningful localized content, grid cards, one hero conversation, zero horizontal overflow, zero page runtime errors. Covered chat opening/closing, focus recovery, channel navigation, social contact dialogs, article navigation and no-JavaScript links in browser tests.
- Browser plugin was unavailable; validation used the repository's Playwright workflow. This is browser emulation, not real-device Safari verification.
- Remote review identified a narrow-desktop clipping defect after the caption change: at 800px the fixed 420px orbit ended at x=821.64, beyond the viewport. Hidden horizontal overflow masked this from the scroll-width check. Reproduced this failure, added all-question column-boundary assertions and the 800px breakpoint, then constrained the orbit width. Verified its right edge is within the viewport at 769, 800, 900, 901, 1024 and 1440px. The final homepage rerun passed 108 tests across desktop and mobile; the earlier direct-product-link and wayfinder results remain above.
- Cloud branch-preview acceptance passed at EN 1710px, ZH 1440px and ZH dark 375px, including chat open/close, focus and channel changes. Production acceptance is still pending.
- `git diff --check` passed. Screenshots and transient logs are outside the repository under `/tmp/blog-home-debug/`.

## Release blockers included with author approval

The author explicitly extended this task to repair release blockers and finish production delivery. The branch incorporates main's article pagination retry fix (`d3acf2c`) without reverting it.

Evidence from the two interrupted full-site runs showed that the 120-minute verification job did not complete. The original authority artifact was recovered and its SHA256 matched the recorded digest. Its log shows the clock-interruption desktop case passed (36.6 seconds) and all 12 article-reading desktop/mobile cases passed (36.5–59.9 seconds); missing traces do not establish failures in those cases.

Confirmed fixes:

- Ten generic workspace test files installed their existing legacy-room fixture after their first navigation, so the newly default Jiangnan room was already persisted. Install the same fixture before navigation at 19 entry points. The dedicated default-Jiangnan and room behavior suites retain their actual scene. Assertions and timeouts are unchanged.
- The Jiangnan render loop clipped elapsed time to 120ms before passing it to the resident's already bounded clock. At one rendered frame per second, 45 seconds advanced the cat only 5.4 seconds. Pass visible elapsed time to the resident clock and analytical scenery; retain the visitor's collision steps and the resident clock's own substeps. A regression executing the real render-loop body failed before correction and passes at 60, 1 and 0.7 frames per second, checking arrival within 20 visible seconds and bounded collision steps.
- The published vinyl hit target intersected a neighboring record from the software-rendering camera position. Correct the public target and test it from all three camera positions. The audio contract now checks track/source identity immediately after clicking the turntable, before adjusting volume.
- Camera tests observed a short flight only after an expensive input/resize command returned, which can miss the entire flight on software rendering. Arm observation before input and control the browser clock while checking actual intermediate movement, reversal, dragging, resize continuity, render frames and the unchanged terminal lens velocity threshold. Sleeping breath still uses the real clock.

Local release-blocker validation: 447 BEAR/Space Node tests passed; 46 actual desktop/mobile living-motion, object-living and speaker-volume browser tests passed in 9.9 minutes; TypeScript checks passed. Independent read-only review found no new blocker, with the stated limitation that controlled camera timing does not measure real-device frame rate. Generic workspace regression and final remote results are still pending; no interrupted run counts as passing.

## Delivery

Pending final remote checks, merge, deployment version verification and production read-back. Do not treat the local checks as production acceptance.
