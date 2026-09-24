# Interactive Article Components — Acceptance Evidence (issue #389)

Current implementation status against the acceptance contract in
[cubxxw/blog#389](https://github.com/cubxxw/blog/issues/389); the issue remains
the authoritative contract and carries the final delivery receipt. Everything
labelled **measured** was executed against this implementation; anything
labelled **not measured** is deliberately unclaimed.

Environment for the recorded run: Hugo `v0.145.0+extended`, Node `v22.23.2`,
Playwright engines Chromium 147 / Firefox 148 / WebKit 26.4. Heavy output goes
to the artifact root (`INTERACTIVE_ARTIFACT_DIR`, e.g.
`/private/tmp/ai-test-blog-389.JunRTB/artifacts` locally; tests default to the
CI-portable `tests/.artifacts`).

## Reproducible commands

```bash
# Data contract validation + pure unit tests + fixture builds and build-level
# assertions (safe serialization, serialized byte budgets, static/model parity,
# resource isolation, id uniqueness, legacy demo-* compatibility, negative
# builds). Needs the pinned Hugo binary on PATH (or HUGO_BIN).
npm run interactive:check

# Cross-engine suite (Chromium + Firefox + WebKit) against the PRODUCTION Hugo
# output plus fixtures kept outside content/ (scripts/serve-interactive-fixtures.mjs;
# ports/artifact roots env-overridable).
npm run interactive:test

# Content gates for the four edited articles
npm run frontmatter:check
npm run tags:check
node scripts/check-ai-flavor.mjs content/zh/ai-agent/posts/context-engineering-the-new-foundation.md content/zh/ai-agent/posts/agent-engineering-the-98-percent-harness.md --check
git diff --check

# Playwright test/configuration typecheck (runtime JS is covered by the
# build and behavior suites; tsconfig.json is repository-shared configuration;
# the second tsc invocation covers playwright.interactive.config.ts explicitly)
npm run typecheck
```

## Measured results

| Suite | Result | Notes |
|---|---|---|
| `node --test tests/interactive/*.test.mjs` | **44/44 pass** | Exact issue arithmetic (16/48/0, 56/8/0, 56/8/0; tool-heavy 0/32/40/48 → remaining 40/8/0/0, overflow 0/0/0/8), boundaries, clamp-to-greatest-legal-step, closed schema vocabulary, null/non-object members (file+field errors, never throws), `model.maxSteps` hard bound, URL/path/malicious-text policy, serialized-byte accounting. |
| `node scripts/build-interactive-fixtures.mjs` | **63/63 pass** | Categories below. Machine report: `fixture-checks.json` in the artifact root. |
| `npm run interactive:test` (3 engines) | **102/102 pass** | 34 scenarios × Chromium/Firefox/WebKit, incl. the four real article pages in both locales. Flaky-prone cases (offline, reconnect, legacy demo) additionally run green under `--repeat-each=2…3`. |
| `frontmatter:check` / `tags:check` / `check-ai-flavor` / `git diff --check` / `npm run typecheck` | pass | |

### Development rebuild regression

A real isolated Hugo watch server starts with 14 instances near the page budget.
Three CSS-only rebuilds and a data change preserve exact emitted byte totals;
front-matter-only line changes followed by a CSS rebuild do not duplicate claims.
Moving/removing occurrences drops old claims, nested occurrences remain distinct,
real duplicate IDs still fail, and removing the final component unloads its assets.
The registry uses a content/data revision and the full parent shortcode ordinal
chain; Hugo Page.Store survives server rebuilds, so registration must be idempotent.

### Build-level assertions (interactive:check)

- **Safe serialization:** `JSON.parse` once returns the payload *object*; the
  hostile fixture (`</script>`, `<img onerror>`, quotes, backticks, `<`, `&`,
  Chinese, newlines) round-trips verbatim in both locales; no raw `</` inside
  any payload; raw payloads carry the `\u003c` escapes.
- **Serialized config byte budgets — enforced at BUILD time on every
  publication route**: the shortcode serializes the final `{id, lang, spec}`
  payload once, measures that exact emitted HTML-safe string, and fails the
  build above 30 720 B/instance or 102 400 B cumulative/page (error reports
  page, spec and instance id). Boundary positives build: 29 020 B instance,
  98 579 B page. Negative builds fail: escaped-size expansion (raw 12 258 B →
  serialized 52 469 B) and a repeated-page total (106 162 B, rejected at
  instance `op-14`). `check-interactive-specs.mjs` additionally early-bounds
  source specs by the same serialized metric.
- **Static/model parity and geometry:** every scenario's SSR numbers equal
  `computeBudget()` output in both locales; bar widths equal `value/capacity`
  percentages of a fixed 64-unit reference (tool-heavy: 6.25 / 31.25 / 50 /
  12.5 %), overflow band at the same scale below the bar.
- **Resource isolation:** one fingerprinted stylesheet + one `type=module` ESM
  per used kind regardless of instance count; pages without the shortcode load
  none. Budgets: both kinds JS gzip **13 027 B (12.72 KiB)** (≤ 25 KiB), CSS gzip
  **3 551 B (3.47 KiB)** (≤ 8 KiB).
- **Static fallback structure:** one current stage per figure (non-current
  stages hidden in SSR), invisible same-box control slots (localized Reset
  label included for baseline alignment), preset-trace notice, one native
  `<details>` reference per figure with no runtime selectors/ids, comparison
  table and all 21 authored events, bilingual summary wording, explicit
  fixed-capacity unit line.
- **Ids:** zero duplicate ids in every built page (roots *and* derived ARIA
  ids).
- **Negative builds must fail** (7 cases): duplicate id, derived/root id
  collision (`probe` + `probe-tool-heavy-label`), unknown kind, path-traversal
  spec, unknown spec, oversize instance, oversize page.
- **Legacy `demo-*` compatibility:** `demo-steps` and `demo-agent-trace` render
  next to the new components (and their controls still work — browser suite).

### Browser suite (interactive:test — each on Chromium 147, Firefox 148, WebKit 26.4)

- Upgrade swaps controls into same-sized slots: root/box geometry delta ≤ 2 px
  with the module load delayed until static content is styled.
- `<details>` open state survives upgrade and reset.
- One current scenario in SSR, after enhancement, on switch and on Reset;
  switching restores the selected scenario's initial values; multi-instance
  isolation (incl. id uniqueness).
- Exact arithmetic + fixed-capacity geometry at the slider extremes (tools 48 →
  72/0/8 with the tools segment at 75 % of the bar and the overflow band at
  12.5 % of the same scale; 40 → 64/0/0; 0 → 24/40/0; 32 → 56/8/0).
- Agent stage shows exactly one current event; finite stepping with disabled
  bounds; playback stops terminally at the last event (Play label restored, no
  trailing timer movement); switching during playback stops timers.
- Pause on hidden page and offscreen; no auto-resume.
- Reduced motion disables autoplay and keeps manual stepping; preference
  changes apply live — including after remove/re-insert (MediaQueryList
  observer regression).
- Remove/reconnect: stays paused, correct labels, preserved state, exactly one
  event binding per control.
- Failure fallback: component script **HTTP 404** and blocked fetch both keep
  the static view for both kinds; corrupt embedded config (unparseable budget
  JSON, unparseable agent JSON with healthy siblings) falls back with zero
  page errors and healthy siblings still enhancing; the runtime-invalid spec
  (toolStep 0) never enhances and never renders NaN; unsupported (`"fr"`) and
  missing envelope `lang` are rejected before enhancement with the trusted zh
  SSR preserved; update-failure injection restores the trusted SSR current
  card / node strip via `cloneNode` (agent) and the default readout (context)
  while the reader's `<details>` open state survives; duplicate module imports
  never double-register or double-bind (one click = one step).
- Offline (issue protocol: frozen after page + component static resources
  load, incl. lazy webfont slices): operating every control performs **0**
  requests outside the two explicitly disabled preexisting embeds (Google
  Analytics bootstrap, utterances comments widget — both aborted at the route
  and documented) and **0** storage-class writes — Web Storage, cookies,
  IndexedDB, Service Worker, history instrumented unfiltered from page start,
  so unknown ambient writes fail instead of being excused — with identical
  full key/value storage contents before vs after.
- Security: hostile data text renders inert on the **English and Chinese**
  safety pages (no element nodes created from data, no dialogs, no console
  errors); malicious URLs/paths rejected at validation with field errors.
- Keyboard: native slider arrows and button activation work; no dead controls.
- Print (JS and no-JS states, all three engines): closed `<details>` reference
  content (comparison table and **all three traces / 21 events**) is laid out
  in every engine; **zero visible buttons/inputs across each entire root**
  including the header Reset button; the duplicate agent stage is hidden.
  Figure screenshots recorded under `screenshots/print-*` in the artifact root.
- No JS (engine-level `javaScriptEnabled:false`): hidden controls are truly
  invisible (computed visibility), static stage/question/assumption visible,
  the native disclosure opens to the complete reference.

Component-level zh/en × 375/1280 screenshots of the polished figures were
captured and inspected (`screenshots/` under the artifact root): compact
3-column numeric readout with a single unit statement, non-wrapping bilingual
toolbar labels with full accessible names, screen-reader-only live regions
(no visible duplication), and zero document overflow at 320–1280 px.

## Acceptance matrix status (issue §8)

| Category | Status |
|---|---|
| Data & computation | **measured** (unit + build assertions; exact expected values; field errors) |
| Sequence | **measured** (browser suite) |
| Static HTML (no JS / script 404 / blocked script / corrupt config) | **measured** (browser suite + build assertions) |
| Multi-instance (same/different kinds, one broken) | **measured** |
| Lifecycle (remove/reinsert, playback removal, duplicate import) | **measured** |
| Offline & requests/storage/cookie/IDB/history/SW writes | **measured** (instrumented, unfiltered writes) |
| Resource isolation | **measured** |
| Security boundaries (serialization, paths, URLs) | **measured** |
| Keyboard / focus / button states | **measured** (core cases) |
| Native 200 % browser zoom / contrast | **measured**: Chrome 153 native zoom=2 on all four pages; no horizontal overflow and 44 px controls. Restored zoom=1. Eight light/dark locale/component contrast + CSS reflow samples have no text contrast below 4.5:1. |
| Screen-reader speech | **not accepted yet**: macOS VoiceOver was enabled with author permission and controls exercised, but the computer interface could not read its caption window or deliver its global speech-copy shortcut. No speech pass is inferred from DOM/AX labels. VoiceOver restored off; original caption preference unchanged. Final speech validation remains an issue-closing gate. |
| Theme & layout matrix | **measured**: 32 real-article samples = zh/en × two components × light/dark × 320/375/768/1280 px, no document overflow or component errors; 16 mobile/desktop screenshots plus ARIA snapshots retained and representative screenshots inspected. |
| Motion (reduced-motion, hidden, offscreen, manual pause) | **measured** |
| Print (no-JS and enhanced, controls hidden, complete traces) | **measured** (3 engines × both states) |
| Browser engines | **measured**: Chromium 147, Firefox 148, WebKit 26.4 (real engines) |
| Article regression (routes, old demos, no console errors) | **measured** (focused suite: zh/en × 2 articles; `demo-agent-trace` replaced exactly once per harness page; legacy `demo-*` controls verified working; full-site regression stays with CI) |
| Release artifacts (production build, fingerprints) | **measured** (production build driven by `scripts/serve-interactive-fixtures.mjs` + fixture assertions) |
| Performance budgets (gzip JS/CSS, serialized config bytes) | **measured** (13 027 B JS / 3 551 B CSS gzip; 30 720 B/instance and 102 400 B/page enforced at build time with boundary cases) |
| Long tasks | **measured**: each component received 20 real consecutive slider/step operations; zero > 50 ms long tasks. Chrome 153.0.8010.53, Apple M4, Darwin 25.4.0 arm64, 4× CPU, fresh cache. CDP traces retained. Existing Google Analytics bootstrap was explicitly isolated after a baseline trace attributed a 101 ms task to that script; component resources and tasks were not filtered. |
| CLS ≤ 0.02 on delayed upgrade (real articles, mobile/desktop) | **measured** after final CSS: zh real articles at 1280/375 px, 4× CPU; all non-input shifts counted after styled SSR/fonts settled and the module released. Context: 0.005923 / 0; agent: 0.000987 / 0.000655. All below 0.02. |
| CI actually green on the delivery SHA | **not measured** — CI runs on the delivery commit. Wiring: `interactive:check` runs after the pinned Hugo install in `main.yaml` and the `e2e` job, and in the dedicated `interactive` job (Chromium/Firefox/WebKit suite); `hugo.yml` runs the dependency-free spec gate before Hugo; Netlify production runs `interactive-check` before Hugo via `make production-build`, and preview/branch commands run the spec gate before Hugo. |
| Post-deploy online smoke + issue closure | Final delivery SHA, CI run links and live smoke are recorded in issue #389 after deployment. Keep the issue open until screen-reader speech acceptance is complete. |

Independent final CSS recheck: **21/21** focused cross-engine upgrade, print
and real-article cases passed after matching static/live scenario typography.
Independent production print audit: **12/12** agent samples (three engines ×
two locales × JS/no-JS); all 21 events are laid out, with no visible controls.
Offline audit of both real articles: **zero** requests and instrumented writes
while operating controls after resources load (known analytics isolated).

## Known limitations / deliberate decisions

1. **One current scenario/event per stage (deliberate):** complete comparisons
   and full traces live in the native `<details>` reference, which the upgrade
   never touches; the stage never toggles a comparison mode. Folding to a
   single scenario happens only as normal interaction state.
2. **Print + closed disclosure:** printing relies on CSS
   (`::details-content` + child rules), verified by geometry in
   Chromium/Firefox/WebKit with screenshots recorded. WebKit's
   `isVisible()` reports false for the forced content while painting it (an
   independently verified false negative); the assertions use real layout.
3. **Offline test isolation:** the two known preexisting third-party embeds
   (Google Analytics bootstrap, utterances comments widget) are explicitly
   aborted at the route before load, and the network is frozen only after the
   page's and components' static resources (including lazy webfont slices)
   have loaded — the issue's own protocol. Their fetch attempts are excluded
   from the zero-request count; **all** storage-class writes are instrumented
   unfiltered and must be zero.
4. **Ambient console noise:** exactly one documented preexisting site quirk is
   ignored in console-error assertions (the comments widget's cross-origin
   `postMessage` log on Firefox/WebKit); nothing else is filtered.
5. **Scope note:** `tsconfig.json` is shared repository configuration outside
   this change; `playwright.interactive.config.ts` is typechecked by an
   explicit second `tsc` invocation in `package.json "typecheck"`.
6. **Fixed button copy** is maintained in the component's bilingual dictionary
   (`assets/js/components/ui-copy.mjs`); visible labels are short non-wrapping
   forms (`Prev`/`Next`/`Play`/`Pause`/`Reset`, `上一步`…) with full accessible
   names. The SSR toolbar slot mirrors the visible strings.

## Rollback

Revert the implementation commit recorded in issue #389. For an article-only
rollback, restore all four edited article files from its parent revision,
including the surrounding introduction and the previous `demo-agent-trace`
blocks; deleting only the shortcode would leave misleading surrounding copy.
Component JS/CSS load only on pages with the shortcode, so restoring the
articles drops those assets. Legacy `demo-*` remains supported. No data
migration or deployed reader state needs cleanup.
