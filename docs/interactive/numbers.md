# Numerical explainers (group: numbers)

Three teaching models for arithmetic arguments, entered through the same
controlled `interactive` shortcode and driven by build-time JSON like every
other kind. This page documents the group's data fields, computations and
factual limits; the shared vocabulary (top-level fields, sourceRefs policy,
static fallback contract, byte budgets, testing gates) lives in
[the author guide](../interactive-articles.md).

| Kind | Element | Learning question | Spec used in production |
|---|---|---|---|
| `reliability-chain` | `<blog-reliability-chain>` | How does a strong per-step success rate degrade over a chain of mandatory steps — and what do checkpoints buy? | `reliability-chain-v1` |
| `task-cost` | `<blog-task-cost>` | Does the cheaper-call route stay cheaper per accepted task after retries and human review? | `task-cost-v1` |
| `notification-threshold` | `<blog-notification-threshold>` | How high must calibrated usefulness be before a proactive prompt is worth the interruption? | `notification-threshold-v1` |

```go-html-template
{{< interactive kind="reliability-chain" id="compound-error" spec="reliability-chain-v1" >}}
```

All numeric inputs are **integer-scaled** (whole currency units, per-mille
probabilities, integer counts) so every computation is finite and every
displayed decimal can be reproduced identically by Hugo (SSR) and the
browser runtime. Probability sliders operate in percent for the reader but
store per-mille integers internally. Display rounding follows IEEE-754
double semantics identically in both runtimes (exact halves round up,
trailing zeros are trimmed); `E` on the notification figure is never rounded
at all — it is formatted exactly from integer milli-units.

## `reliability-chain`

`model` keys (no others): `stepsMin` (1…200), `stepsMax` (stepsMin+1…200),
`stepsPerSegment` (1…200, FIXED segment size for the checkpoint mode),
`probStep` (1…1000 per-mille slider step for both probability sliders —
when it does not divide 1000 the aligned maximum is
`floor(1000/probStep)·probStep`, so snapping can never leave the grid).

`scenarios[]`: `{ "id", "stepPermille" (0…1000), "steps" (stepsMin…stepsMax),
"recallPermille" (0…1000) }`; both per-mille values must align to
`probStep`. Switching scenario restores that scenario's preset values; Reset
restores `defaultScenario` (no memory of the reader's edits).

Computations (`assets/js/components/reliability-chain-model.mjs`, mirrored
by `layouts/partials/interactive/reliability-chain-compute.html`):

```text
p = stepPermille / 1000        r = recallPermille / 1000
plain      = p^n
segments   = split n into fixed stepsPerSegment chunks (short final chunk)
q_i        = p^(steps of segment i)
s_i        = q_i + (1 - q_i) * r * q_i     (AT MOST one retry per segment)
checkpoint = product of s_i over ALL segments (incl. the short final one)
expectedAttempts = sum of 1 + (1 - q_i) * r
```

Edge cases the model pins: `p = 0` → 0, `p = 1` → 1, `r = 0` → the
checkpoint product collapses to plain `p^n`, `r = 1` →
`s_i = 1 − (1 − q_i)²`. `expectedAttempts` is a **planning/cost proxy in
the range `[segments, 2 × segments]` that schedules ALL segments** — a run
plan, not fail-fast runtime cost, and never a production success rate. The
difference is real: for `p = 0.5, n = 2, stepsPerSegment = 1, r = 1` the
proxy is 3 planned attempts, while fail-fast execution (a segment that
definitively fails ends the run) expects only 2.625 attempts. The figure's
attempts label, `assumption` and `checkpoint.note` state this scheduling
convention in both locales.

Factual limits (stated on the figure in `assumption` and
`checkpoint.note`): steps are independent and all mandatory; the checkpoint
mode additionally assumes **no false positives, exact rollback and at most
one independent retry per segment**. The model does not simulate correlated
errors, a real detector's precision, partial rollbacks or production
reliability — it shows probability multiplication only.

## `task-cost`

`model` keys (no others): `batchSize` (1…10000 — both routes are FIXED-size
batches of this many tasks).

`scenarios[]`: `{ "id", "a": route, "b": route }` where a route is
`{ "modelToolCost", "retryCost", "reviewMinutes", "hourlyRate", "accepted" }`
— all integers (`accepted` ≤ `batchSize`). The two routes of one scenario
are shown side by side: for this kind the COMPARISON is the learning
question, while exactly one scenario is still current.

Computations (`assets/js/components/task-cost-model.mjs`, mirrored by
`layouts/partials/interactive/task-cost-compute.html`):

```text
reviewCost = reviewMinutes * hourlyRate / 60     (batch-total review time)
total      = modelToolCost + retryCost + reviewCost
perAccepted = total / accepted                   (null when accepted = 0)
```

`modelToolCost` and `retryCost` are entered SEPARATELY and summed exactly
once, so the stacked breakdown can never double count retries. When
`accepted = 0` the ratio is **undefined** — shown as `—` with a pre-written
explanation, never `0` and never `Infinity`. The two stacked bars share one
scale (the larger total of the pair) so the comparison is visible in
lengths; a zero-total pair renders zero-width bars without division by
zero. The comparison reading is rule-based: lower per-accepted cost, tie
(within 1e-9), or undefined.

Factual limits (stated on the figure): all amounts are hypothetical editable
values in ONE currency (`unitLabel`) — never real vendor prices; review
minutes are the total for the batch; accepted counts are measured results,
not predicted model success rates. The model does not estimate token usage,
raw call volume, latency or severe-error cost — those live in the article's
argument, not in invented data.

## `notification-threshold`

`model` keys (no others): `probStep` (1…1000 per-mille slider step),
`gainMax` (1…10000), `costMax` (1…10000).

`scenarios[]`: `{ "id", "gain" (0…gainMax), "cost" (0…costMax),
"probPermille" (0…1000, aligned to probStep) }`.

Computations (`assets/js/components/notification-threshold-model.mjs`,
mirrored by `layouts/partials/interactive/notification-threshold-compute.html`):

```text
E         = p*G − (1−p)*C      (exact integer math: E = eMilli / 1000)
threshold = C / (G + C)        (null when G = C = 0)
verdict   = no-preference (G = C = 0) | notify (E > 0)
          | silent (E < 0) | equal (E = 0)
```

The default scenario `deep-work` (G = 20, C = 40) has threshold **2/3**;
the `minutes` preset (G = 10, C = 15, p = 60%) is the exact break-even
case; `no-preference` (G = C = 0) makes the undefined threshold explicit.
The SVG number line marks the threshold and the current p and is always
paired with the numeric readout (its accessible equivalent) and a static
sampled-values table (p ∈ {0, 25%, 50%, 75%, 100%} for the default G/C).

Factual limits (stated on the figure): `p` is a **calibrated past-usefulness
rate** — how often prompts it deemed worth sending actually proved useful —
never the model's self-reported confidence. `G` and `C` are subjective
illustrative values, never a universal deployment policy. The model computes
expected value only: it does not simulate trust decay, muted channels or the
non-linear cost of repeated interruptions (the article's `E_real` term).

## Reuse

Fill `data/interactive/<spec>.json` with your own numbers and add one
shortcode per article (page-unique `id`, zh + existing en counterpart). Keep
`copy` complete in both locales and keep `sourceRefs` to sources that support
the concept — the numeric inputs are labelled illustrative and must not be
presented as measurements of real systems. For a different teaching model,
add a new kind with its own `<kind>.mjs`, `<kind>-model.mjs` (pure model +
validator), `<kind>.css`, `interactive/<kind>.html` partials and tests
instead of stretching these fields.

## Tests

- `tests/interactive/expansion-numbers.test.mjs` — pure-model edge cases,
  invariants (r = 0 collapse, monotonicity, attempt bounds, undefined
  ratios, exact formatting) and corrupt-spec rejection per kind.
- `tests/interactive/expansion-numbers.spec.ts` — browser semantics
  (SSR ↔ model agreement, sliders, reset, scenario presets), fallback
  (corrupt config, blocked script, runtime-invalid spec, paint failure →
  exact SSR restore), multi-instance isolation and 320px mobile.
- Fixtures live in `tests/fixtures/interactive/expansion-numbers/` (never
  published to `content/`); the same content mount serves both locales.
