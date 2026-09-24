# Interactive Article Components — Author Guide

Reusable interactive explainers for existing articles: `<blog-context-budget>` and
`<blog-agent-loop>`, entered only through the controlled `interactive` shortcode and
driven by build-time JSON data. After publishing, everything runs in the reader's
browser on static files: no backend, no model calls, no persistence, no third-party
runtime.

This document is the single field vocabulary. The executable validator
`scripts/check-interactive-specs.mjs` (backed by
`assets/js/components/spec-schema.mjs`) enforces it before every Hugo build; the
templates and runtime consume exactly these fields. Do not invent new fields without
updating the schema module, this guide and the tests together.

## When to use (and when not to)

Use an interactive component when the reader must **change one condition, watch a
deterministic consequence and compare a small number of prepared outcomes** to
understand the article's argument.

Do **not** use one when:

- a static figure already makes the point;
- you would need new questions, free-text AI answers or live tool execution at read
  time;
- you want to predict real model quality, real token counts, production cost or
  production success rates with the component's numbers (the numbers are labelled
  illustrative units);
- you need a new interaction type — V1 ships exactly two kinds. Filling an existing
  kind with new data is the supported extension path; a new kind needs a new reviewed
  custom element.

Every experiment answers five questions before it is written (see
[Fact boundaries](#fact-boundaries)).

## Quick start

1. Create `data/interactive/<spec>.json` (`<spec>` = lowercase letters, digits and
   hyphens only; it is a local data identifier, never a URL or path).
2. Validate: `npm run interactive:check`.
3. In the article (zh and its existing en counterpart), insert one shortcode where the
   argument needs it:

   ```go-html-template
   {{< interactive kind="context-budget" id="context-window" spec="context-window-v1" >}}
   ```

4. Build or serve with Hugo. Done — no component runtime edits are needed to add an
   instance.

### Shortcode parameters

| Parameter | Allowed | Meaning |
|---|---|---|
| `kind` | `context-budget` \| `agent-loop` | Fixed allowlist registry mapping to one custom element and one static partial. Any other value fails the build. |
| `id` | `^[a-z0-9]+(-[a-z0-9]+)*$` | Page-unique semantic id. Duplicate ids on one page fail the build — including collisions between one instance's derived ARIA ids (labels, range inputs) and any other instance's id. |
| `spec` | `^[a-z0-9]+(-[a-z0-9]+)*$` | Stem of `data/interactive/<spec>.json`. URLs, absolute paths, `..` traversal and unknown stems fail the build. |

During `hugo server` / Netlify dev rebuilds, each occurrence replaces its own
registration using the complete parent shortcode ordinal chain. Content/data
revision keys discard removed claims; metadata line changes do not affect identity.
This is necessary because Hugo Page.Store survives development rebuilds.

Resources load per page and per kind only: a page without the shortcode emits no
component JS/CSS; a page using one kind twice loads that kind's fingerprinted ESM and
CSS exactly once.

## Data contract (`data/interactive/<spec>.json`)

### Top level (both kinds)

```json
{
  "schemaVersion": 1,
  "kind": "context-budget",
  "id": "context-window-v1",
  "defaultScenario": "tool-heavy",
  "model": { },
  "scenarios": [ ],
  "copy": { "zh": { }, "en": { } },
  "sourceRefs": [
    { "url": "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
      "title": "Effective context engineering for AI agents" }
  ]
}
```

| Field | Rules |
|---|---|
| `schemaVersion` | Integer `1` only. Unknown versions fail. |
| `kind` | `context-budget` or `agent-loop`; must match the shortcode `kind`. |
| `id` | `^[a-z0-9]+(-[a-z0-9]+)*$`, must equal the filename stem. |
| `defaultScenario` | Must reference an existing scenario id. |
| `model` | Kind-specific, exact key set (below). Unknown model fields fail. |
| `scenarios` | 1–8 entries, unique `^[a-z0-9]+(-[a-z0-9]+)*$` ids, no duplicates. |
| `copy` | Exactly `zh` and `en`, both complete. Missing translations fail — there is no silent fallback to Chinese. |
| `sourceRefs` | 1–8 entries of `{url, title}`. `url` must be `https://` or a controlled internal path starting with a single `/`; `javascript:`, `data:`, protocol-relative `//` and any `..` segment fail. |

All numeric fields must be finite integers (no `NaN`/`Infinity`/negatives where not
allowed) and inside their documented ranges. String fields must be non-empty after
trimming and contain no control characters other than `\n` (newlines round-trip
safely). Text is rendered with `textContent` only: HTML fragments in data are inert
text, never markup. Length caps keep payloads small, and the real budgets are
enforced at build time on the final HTML-safe serialized `{id, lang, spec}`
string: ≤ 30 KiB per instance and ≤ 100 KiB cumulative per page (the shortcode
measures the exact string it emits and fails the build with page/spec/id;
`npm run interactive:check` early-bounds specs by the same serialized metric,
since HTML escaping can multiply `<`, `>`, `&` several-fold).

### `kind: "context-budget"`

Arithmetic is exact integer math:

```text
used      = system + history + tools
remaining = max(0, capacity - used)
overflow  = max(0, used - capacity)
```

`model` keys (no others): `capacity` (1…1000000), `system` (0…capacity),
`toolMin` (0…toolMax), `toolMax` (toolMin+1…1000000), `toolStep` (1…toolMax−toolMin).
The slider value snaps to the nearest legal step; when `toolMax` is not itself
a legal step (e.g. min 2 / max 32 / step 4), values above the greatest legal
step normalise down to it (30 in that example) — exactly like a native
`<input type="range">`. Units are **illustrative units**, never real token
counts. V1 does not simulate output reservation, auto-compaction, tokenizers,
answer quality or latency, and never silently compresses history when the bar
overflows: overflow is shown explicitly beside a fixed-capacity bar.

`scenarios[]`: `{ "id", "history" (int ≥ 0), "tools" (int, toolMin…toolMax, aligned to toolStep) }`.
Switching scenario restores that scenario's initial values; reset restores the
spec's `defaultScenario` values (no memory of the reader's last choice).

`copy.<lang>` (all required): `figureLabel`, `title`, `question`, `unitLabel`,
`capacityLabel`, `assumption`, `observe`, `footerNote`, `sliderLabel`,
`referenceTitle`, `segments` (`system`,`history`,`tools`,`remaining`), `metrics`
(`used`,`remaining`,`overflow`), `table`
(`scenario`,`used`,`remaining`,`overflow`), `explanations`
(`plenty`,`tight`,`overflow` — the pre-written rule-based readings), and
`scenarioLabels` with one label per scenario id.

### `kind: "agent-loop"`

A finite, author-written teaching sequence. It is always labelled as a **preset
trace**: the decision notes are the author's pedagogical wording, not a real model's
private reasoning, and tool calls are inert text that is never executed.

`model` keys (no others): `maxSteps` (2…24) — the hard bound for any sequence.

`scenarios[]`: `{ "id", "outcome", "events" }` with `outcome` one of `success`,
`recovery`, `budget-exhausted` and 2…24 events.

Event shape — note that `tool`, `args`, `status` and `reason` are mutually
exclusive per kind; a `decision` event carries only `kind` and `copy`:

```json
{ "kind": "decision",
  "copy": { "zh": { "text": "删除前先看清楚有什么可删的。" },
            "en": { "text": "See what is actually there before deleting." } } }
```

```json
{ "kind": "tool_call", "tool": "run_command", "args": "{\"cmd\":\"ls dist/\"}",
  "copy": { "zh": { "text": "请求工具列出目录。" },
            "en": { "text": "Request the directory listing." } } }
```

| `kind` | Required extra fields | Notes |
|---|---|---|
| `decision` | — | Author's decision note. |
| `tool_call` | `tool`, optional `args` (≤ 200 chars, plain text) | Tool request only. `tool` matches `^[A-Za-z0-9_.-]{1,40}$`. |
| `tool_result` | `tool`, `status` (`ok`\|`error`) | Tool result text in `copy`. |
| `stop` | `reason` (`answered` \| `budget-exhausted`) | The stop reason / final answer. Must be the last event, exactly once per sequence. |

Sequence rules (validated):

- exactly one `stop` event and it is the last one;
- `success` → `stop.reason` is `answered`;
- `recovery` → an earlier `tool_result` has `status: "error"` **and a later
  `decision` event carries the explicit recovery reasoning** before the
  retried action, ending `reason: "answered"` (a bare `tool_call` after the
  failure is not enough — the recovery must be explained);
- `budget-exhausted` → `stop.reason` is `budget-exhausted`; the sequence must not
  pretend an answer was produced;
- every sequence length must respect `model.maxSteps` (the hard bound for the
  finite sequence; the budget scenario should visibly hit it).

`copy.<lang>` (all required): `figureLabel`, `title`, `question`, `assumption`,
`observe`, `footerNote`, `referenceTitle`, `presetNotice`, `stepKinds`
(`decision`,`tool_call`,`tool_result`,`stop`), `nodes` (`decision`,`tool`,
`result`,`stop`), `table` (`step`,`kind`,`detail`), `io` (`input`,`output`), and
`scenarioLabels` with one label per scenario id. Event `copy.<lang>.text` is
required for every language.

## Static fallback: one source of truth

The figure has two regions, both generated from the same JSON the runtime
consumes:

- **Current result stage** — the working interactive area. Hugo renders the
  `defaultScenario`'s exact result (numbers, bar geometry, explanation; for
  `agent-loop` the single current event) before any JS runs. Exactly one
  scenario is current at a time — initial state and Reset focus
  `defaultScenario`, switching restores that scenario's initial values, and
  non-current stages stay hidden (they never take focus). Controls live in
  same-sized `visibility:hidden` slots so the upgrade swaps them in with zero
  layout shift; the slots themselves are never fake controls.
- **Native `<details>` reference** — complete read-only evidence: a compact
  scenario comparison table (`context-budget`) or all authored preset traces
  (`agent-loop`). No runtime data selectors and no ids inside, so the upgrade
  never touches it or its open state; the disclosure works without JS.

Only after the custom element has validated its config (same executable schema
as the build gate), bound events and rendered its first frame does it set
`data-enhanced` and swap the controls in. So:

- no JS, a 404'd/blocked script or a corrupt config leaves a meaningful static
  article: default result, question, assumption, sources and the complete
  reference disclosure (comparison table / full traces);
- no broken or focusable-but-dead buttons ever remain;
- print shows the complete reference content even when the disclosure is
  closed (cross-engine `::details-content` handling is tested on Chromium,
  Firefox and WebKit) and hides the live controls — the `agent-loop` stage is
  hidden in print so the full traces are never duplicated.

The acceptance test suite compares the server-rendered default numbers against the
pure model functions (`assets/js/components/model.mjs`) so the two cannot drift.

## Runtime behaviour contract

- Native autonomous custom elements in Light DOM (`HTMLElement` subclasses; no
  `is="..."`, no Shadow DOM, no framework). Styles are scoped under the two element
  selectors and reuse `assets/css/extended/tokens.css` variables.
- The runtime re-validates the embedded config with the **same executable
  schema** used by the build gate (`assets/js/components/spec-schema.mjs`):
  corrupted embeds — zero step, negative values, unknown versions or kinds,
  missing locales, malformed scenarios — never enhance and always fall back to
  the static view.
- `constructor` only initialises fields; `connectedCallback` reads parsed children
  and config. Re-registration is guarded with `customElements.get`.
- `disconnectedCallback` releases listeners, observers, timers and animation frames;
  reconnecting re-binds once and keeps this DOM instance's valid state. A page reload
  resets to defaults.
- All state is in-instance browser memory only: selected scenario, current step,
  slider value, playback position. No `localStorage`, `sessionStorage`, IndexedDB,
  cookies, Service Workers or URL parameters. Once the page's static assets are
  loaded, interacting performs **zero** network requests (asserted in tests).
- One current scenario and one current event: the stage shows exactly the
  selected preset (default on load and on Reset); there is no comparison
  toggling — the `<details>` reference is the comparison.
- Playback is never automatic: the figure is still by default and does not start when
  scrolled into view. Playback pauses when the page is hidden or the component is
  offscreen and does not auto-resume. `prefers-reduced-motion: reduce` keeps manual
  stepping and disables auto-play and motion transitions (switching the preference
  mid-session takes effect immediately).
- Layout is upgrade-stable: the enhanced first frame keeps the static figure's
  exact geometry (controls swap into same-sized static slots), so the upgrade
  does not shift the article. Scenario folding to a single panel happens only
  after the reader's first scenario interaction — a user-initiated reflow, not
  a load-time shift. Static and enhanced states share one geometry.
- Context arithmetic and sequence stepping are pure functions in `model.mjs`; the
  elements only translate state to DOM.

## Fact boundaries

Prepared copy must state: what the reader should understand; what they can change;
which numbers are computed by formula; which explanations are pre-written; and what
the simulation cannot prove (`assumption` carries that last one on the figure itself).
Illustrative units must never be presented as real token counts, and preset traces
must never be presented as real tool execution or real model inner thought. Keep the
article's existing factual citations next to their claims and list `sourceRefs`
sources once at the figure footer — sources support the concept, not the fictional
numbers.

## Testing and gates

| Command | What it proves |
|---|---|
| `npm run interactive:check` | Schema validation of `data/interactive/*.json` (with error file+field reporting), pure model/schema unit tests, fixture builds (positive fixtures plus negative builds that must fail: duplicate id, unknown kind, bad spec path, missing translation, unknown schemaVersion), safe-JSON round-trip of `</script>`/quotes/`<`/`&`/Chinese/newlines, static-vs-model number parity, and the size budget (both kinds gzip ≤ 25 KiB JS + 8 KiB CSS; embedded config ≤ 30 KiB/instance, ≤ 100 KiB/page). |
| `npm run interactive:test` | Dedicated cross-engine Playwright run (`playwright.interactive.config.ts`) against the **production** Hugo output plus fixtures kept outside `content/`: keyboard access, multi-instance isolation, hidden/offscreen/reduced-motion pause rules, remove/reconnect cleanup, script/data failure fallback, offline zero requests and zero storage writes, malicious text/URL handling, print fallback. |
| `tests/e2e/interactive-articles.spec.ts` | Focused article-level checks that run inside the repository's normal Playwright config against the two pilot articles in both locales. |

CI runs `npm run interactive:check` before Hugo in every build/preview workflow, and
the cross-engine suite on the E2E workflow. Fixtures live in
`tests/fixtures/interactive/` and are never published to `content/`.

## Removing a pilot (rollback)

Delete the `{{< interactive ... >}}` line(s) from the article(s) and remove the spec
JSON if unused. Component JS/CSS are only requested on pages with the shortcode, so
removal drops the assets with it. The legacy `demo-*` shortcodes stay supported until
a separate migration; nothing here depends on data migrations or deployed state.
