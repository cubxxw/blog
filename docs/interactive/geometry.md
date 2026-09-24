# Interactive Explainers — Geometry Group (`vector-cosine`, `flow-bottleneck`)

Author guide for the two geometry-expansion interactive kinds. It extends the
shared contract in [../interactive-articles.md](../interactive-articles.md)
(data shape, static fallback, runtime rules, byte budgets and the controlled
`interactive` shortcode apply unchanged). This page documents only this
group's **data fields, computations, factual limits and reuse**.

Both kinds are native Light DOM Web Components entered through the existing
`interactive` shortcode. Everything runs on static files in the reader's
browser: no backend, no model calls, no persistence, no third-party runtime.

## When to use which kind

| Kind | Learning question | Reader action |
|---|---|---|
| `vector-cosine` | "What changes in the dot product, angle and cosine when only the length or only the direction changes?" | Scale a vector without changing its direction, rotate it, drag or type coordinates |
| `flow-bottleneck` | "When one stage speeds up but the constraint stays downstream, what happens to queues and cumulative delivery?" | Advance deterministic ticks, change per-tick capacities, compare a local speedup with the delivered stream |

Neither kind predicts anything: `vector-cosine` is a **2-D mathematical
illustration**, not a semantic predictor for real embeddings;
`flow-bottleneck` is a **fixed-input deterministic run**, not a business
forecast. Both carry those limits on the figure itself (`assumption` +
`illustrationNotice`).

## `kind: "vector-cosine"`

```go-html-template
{{< interactive kind="vector-cosine" id="cosine-figure" spec="vector-cosine-v1" >}}
```

### `model` keys (exact)

| Key | Range | Meaning |
|---|---|---|
| `bound` | integer 1…24 | Radius of the finite disk (grid units) that both vectors live in. Every coordinate is clamped here — pointer, keyboard and numeric input alike. |
| `gridStep` | decimal 0.05…1, must divide `bound` into whole cells | Snap grid for dragging and numeric entry. |
| `angleStep` | integer 1…90 | Degrees per rotate-button press. |

### `scenarios[]` entries

`{ "id", "ax", "ay", "bx", "by" }` — decimal grid coordinates, each vector
inside the `bound` disk. Four preset ids are **required** and semantically
validated:

| id | Invariant |
|---|---|
| `parallel` | two non-zero vectors, cosine 1 |
| `orthogonal` | two non-zero vectors, cosine 0 |
| `opposite` | two non-zero vectors, cosine -1 |
| `zero` | at least one zero vector (angle/cosine undefined) |

Additional scenarios up to the 8-scenario cap are allowed without invariants.

### Computations (pure, identical in SSR and runtime)

```text
dot      = ax*bx + ay*by
|A|, |B| = sqrt(x*x + y*y)
cos      = dot / (|A| * |B|), clamped to [-1, 1] (and snapped to ±1 within 1e-12)
angle    = degrees(acos(cos))
```

Zero vector ⇒ `cos`/`angle` are **undefined** — the figure shows the spec's
`undefinedText` and never renders `0` or `NaN`. Display precision: 2 decimals
for coordinates, dot product and lengths; 3 for cosine; 1 for the angle.
Scaling keeps the direction (cosine fixed) and clamps the length into
`[0, bound]`; rotating keeps the length. Scaling or rotating the zero vector
keeps it zero (documented teaching point). The drawn angle arc is always
centred on the origin for both rotation senses.

Pointer dragging and typed coordinates **snap to `gridStep`** and clamp into
the bound disk. Rotation and scaling compute exact (off-grid) values: the
numeric fields use `step="any"` so they stay valid and always show the true
bounded state on commit (`change`), while the live `input` stream preserves
free typing. Touch gestures are captured only by the two enlarged drag
handles after enhancement (`touch-action: none` is gated on `[data-enhanced]`)
— the rest of the plot and the entire static fallback keep normal page
scrolling, and the coordinate fields remain the full keyboard alternative.

### `copy.<lang>` fields

Shared fields (`figureLabel`, `title`, `question`, `assumption`, `observe`,
`footerNote`, `referenceTitle`, `scenarioLabels`) plus: `illustrationNotice`
(visible honesty badge), `unitLabel`, `undefinedText`, `diagramNote` (the
textual explanation of the SVG), `vectorLabels` `{a,b}`, `inputs`
`{ax,ay,bx,by}`, `metrics` `{dot,magA,magB,angle,cosine}`, `actions`
`{scale,rotateLeft,rotateRight}` and `explanations`
`{parallel,similar,orthogonal,opposite,zero}` (pre-written rule-based
readings keyed by the cosine band).

## `kind: "flow-bottleneck"`

```go-html-template
{{< interactive kind="flow-bottleneck" id="line-figure" spec="flow-bottleneck-v1" >}}
```

### `model` keys (exact)

| Key | Range | Meaning |
|---|---|---|
| `demand` | integer 0…20 | Fixed incoming jobs per tick (explicit, never dropped). |
| `capacityMax` | integer 1…20 | Upper bound of the per-tick capacity controls. |
| `maxTicks` | integer 2…40 | Hard stop bound — the run cannot exceed it and play pauses terminally there. |

### `scenarios[]` entries

`{ "id", "capacity": {generate, review, delivery}, "initial": {generate, review,
delivery} }` — integer capacities within `0…capacityMax`, initial in-flight
queues within `0…20`. The three serial stages are always generation → review →
delivery.

### Deterministic synchronous tick semantics

One tick, in order:

1. `demand` new jobs enter the generation queue (admitted; never dropped);
2. delivery serves `min(delivery capacity, its queue)` — served jobs leave the
   system and count towards cumulative `delivered`;
3. review serves `min(review capacity, its queue)` into the delivery queue —
   delivery already served this tick, so those jobs are served no earlier than
   the next tick;
4. generation serves `min(generation capacity, its queue)` into the review
   queue the same way.

Conservation invariant after every tick, including initial in-flight jobs:

```text
admitted === queue.generate + queue.review + queue.delivery + delivered
```

Integer math only: no negative queues, no dropped jobs, no silent
backlogging tricks. WIP and the throughput-vs-WIP chart are derived from the
same history (`chartScale` fixes the chart baseline at `max(8, seen values)`).
The rule-based explanation reports `demand-limited` while **every** stage
absorbs the fixed demand (minimum capacity ≥ demand — there is no sustained
queue buildup to describe and delivery follows demand); otherwise it names
the strictly narrowest stage below demand (unique minimum; ties read as
"balanced").

### `copy.<lang>` fields

Shared fields plus: `illustrationNotice`, `unitLabel`, `diagramNote`,
`tickLabel`, `tickRule` (the visible statement of the tick semantics above),
`capacityLabel`, `demandLabel`, `stages` `{generate,review,delivery}`,
`metrics` `{tick,queue,wip,delivered,throughput,admitted}` and `explanations`
`{generate,review,delivery,balanced,demand-limited}`.

## Static fallback (both kinds)

- The SSR stage shows the default scenario's **exact** tick-0 / default-vector
  state, computed in `layouts/partials/interactive/<kind>-values.html` /
  `flow-bottleneck-sample.html` with the same formulas as the pure models —
  the fixture build asserts string parity.
- The native `<details>` reference holds **all finite scenarios**:
  `vector-cosine` lists every preset with exact values; `flow-bottleneck`
  lists every preset's inputs plus a sampled deterministic run (ticks 0–min(3, maxTicks))
  generated from the same spec. No runtime selectors and no ids inside — the
  upgrade never touches it or its open state.
- Controls live in one same-sized `visibility:hidden` slot row and swap in
  only after successful validation + first render; no JS / script 404 /
  corrupt config leaves the complete static figure with zero dead controls.
- Print shows the complete reference (even closed) and hides all controls.
- The SVGs are decorative (`aria-hidden`) and paired with the `diagramNote`
  textual explanation plus the numeric readout / tick log — dragging is never
  required: wrapping-label number fields are the full keyboard equivalent and
  the figure emits no derived ARIA ids at all.

## Factual limits (keep in the article copy)

- `vector-cosine` computes plane geometry only. Real embedding similarity
  lives in much higher dimensions; this figure proves nothing about semantic
  quality, model behaviour or retrieval performance.
- `flow-bottleneck` runs fixed illustrative inputs. Real systems react:
  demand rebounds, quality drops under pressure, buffers and constraints
  move. Use the figure to build intuition, then return to the article's
  caveat — not as a forecast.

## Reuse

Add an instance with a new `data/interactive/<spec>.json` and a page-unique
shortcode id; no runtime changes needed. Keep specs inside the serialized
config budget (≤ 30 KiB/instance, ≤ 100 KiB/page — enforced at build time) and
run `npm run interactive:check`. Validation lives in
`assets/js/components/vector-cosine-model.mjs` and
`assets/js/components/flow-bottleneck-model.mjs` (pure models + strict
validators, no schema imports). Tests: `tests/interactive/expansion-geometry.test.mjs`
(pure model + corrupt specs) and `tests/interactive/expansion-geometry.spec.ts`
(browser semantics/fallback/reset/isolation/mobile on a real fixture build).
