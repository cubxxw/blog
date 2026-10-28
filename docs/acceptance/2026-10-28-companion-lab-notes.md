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

`npm run flavor:check` is **not green**: it finds an existing E3 sentence in the MarkItDown blockquote (now line 46), plus a NotebookLM density warning. The identical E3 quote was reproduced from `HEAD` before this task at line 44. Only URL metadata changed in these articles; the author's published quote is preserved, and the detector is not weakened. This remains a content gate for any later release.
