# SEO data contract: GSC collection and deterministic reporting (issue #391)

Status: implemented with offline evidence; live Google/UI gates pending. This
document is the data contract for `scripts/gsc-fetch.mjs` (collector),
`scripts/gsc-report.mjs` (deterministic report) and `scripts/lib/gsc-*.mjs`.
Baseline artifact: [`docs/seo-390-baseline.json`](./seo-390-baseline.json).

The pipeline separates **observed rows** from **proven completeness**, and
**transport success** from **data availability**. Nothing in the report is
inferred: query rows never imply landing pages, unknown coverage is never
fabricated as zero, and differing semantic contexts are never blended into one
continuous baseline.

## Commands

```bash
# Collector (needs GSC_SERVICE_ACCOUNT_JSON; GSC_SITE_URL optional)
node scripts/gsc-fetch.mjs                    # 3-day window ending today-3 (GSC calendar)
node scripts/gsc-fetch.mjs --lookback 27      # 28-day backfill  (27 -> 28 days)
node scripts/gsc-fetch.mjs --lookback 55      # 56-day backfill  (55 -> 56 days)
node scripts/gsc-fetch.mjs --start 2026-07-27 --end 2026-09-20   # fixed strict range
node scripts/gsc-fetch.mjs --dry-run          # fetch + summary, no write
node scripts/gsc-fetch.mjs --out path.json    # explicit output (never overwritten)
node scripts/gsc-fetch.mjs --dir data/seo     # output directory (default data/seo)
node scripts/gsc-fetch.mjs --with-device --with-country  # optional page-based cuts

# Deterministic report (no network, no build clock)
node scripts/gsc-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20
node scripts/gsc-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20 \
  --out docs/seo-390-baseline.json
node scripts/gsc-report.mjs ... --host cubxxw.com --include-query-rows
node scripts/gsc-report.mjs ... --as-of 2026-09-23T00:00:00Z   # observation cutoff

node --test scripts/gsc-fetch.test.mjs scripts/gsc-report.test.mjs
```

- `--lookback` is an **inclusive offset**: `27 → 28` days, `55 → 56` days.
- Date defaults use the Search Console calendar (`America/Los_Angeles`), never
  UTC traffic dates. `--start`/`--end` are strict `YYYY-MM-DD`: trailing
  garbage, impossible dates, future end dates and inverted ranges are rejected.
- The report window must have an even day count and splits into two
  non-overlapping halves (56 days → 28+28).

## Collector snapshot schema (`gsc-snapshot/2`)

Required slices (queried **one date at a time**, `rowLimit` up to 25,000 with
`startRow` pagination, `type: web`, `dataState: final` explicit):

| slice | dimensions | scope | aggregation |
|---|---|---|---|
| `date_totals` | `date` | property (unfiltered) | `byProperty` |
| `blog_date_totals` | `date` | host-filtered | `byPage` — **not property totals** |
| `date_page` | `date,page` | property (unfiltered, keeps other hosts) | `auto` (legacy-compatible) |
| `blog_date_query_page` | `date,query,page` | host-filtered | `byPage` |

Optional page-based cuts (`--with-device` / `--with-country`), never a
device×country join: `blog_date_page_device`, `blog_date_page_country`.

Host filter is an escaped RE2 URL prefix **including the path boundary**:
`^https?://cubxxw\.com/` — exact hostname only, never subdomains or lookalikes.
Page filtering disallows `byProperty`; page-filtered date totals use `byPage`
semantics and **cannot be called property totals** (enforced in code).

Explicit metadata per snapshot: property, hostname scope (pattern + actual
filter groups), `searchType=web`, `dataState=final`, ordered dimensions, actual
filter groups, request aggregation, `dataTimezone=America/Los_Angeles`,
`fetchedAt` (UTC), request date/window and `runDate` (UTC, filename-compatible).

Per slice/day evidence: status, rows, request scope (`rowLimit`, `startRows`),
pagination evidence (`pageRowCounts`, `responseAggregationType`, terminator,
pages), truncation/conflict flags, warnings and sanitized errors.

Day status vocabulary:

| status | meaning |
|---|---|
| `complete` | proven whole day (clean pagination terminator) |
| `empty` | proven successful empty response (omitted `rows` is legal empty) |
| `partial` | failed page after rows, or conflict — incomplete, never a full day |
| `failed` | no usable page (transport/parse/auth) |
| `truncated` | pagination safety cap reached — incomplete |

Completeness caveats recorded as evidence:

- Duplicate dimension keys across pages or a changing/incompatible
  `responseAggregationType` marks **conflict/incomplete** — never summed into a
  falsely complete result (even when stable across pages).
- An API/internal row-cap warning is emitted whenever paging size is reached;
  paging cannot prove Google returned every row (internal limits and
  anonymous-query omission apply).
- A failed page keeps its partial rows marked incomplete and never replaces a
  previously complete day in the report. Required slice/day failures persist a
  status artifact and exit non-zero; a snapshot file on disk never implies a
  successful run (`meta.runStatus`, per-day `error`). Optional slice failures
  are explicit degradation (`runStatus: degraded`).

### Availability probe (independent of transport)

A bounded recent-date probe (official guidance: past 10 days) records the
observed availability cutoff (`availableThrough`). Empty rows are an observed
successful empty response — **not** proof of zero traffic or finalized
availability. Dates past the observed cutoff are `unavailable-unknown`, never
complete-zero. If the probe fails, availability is `unknown` independently of
transport completeness. Invalid/out-of-window probe dates are segregated before
the cutoff is computed.

### Persistence (append-only, atomic, no-clobber)

- Conventional first daily name `data/seo/gsc-YYYY-MM-DD.json` is kept for
  workflow compatibility. **Changed behavior:** a same-day rerun appends
  `gsc-YYYY-MM-DD-<UTC HHMMSSmmmZ>-<random>.json` instead of overwriting.
- An explicit `--out` that exists is never overwritten — the run fails clearly
  before any request is made. At publication time a competing writer can never
  be clobbered either (exclusive temp create + hard-link publication); a lost
  race on the default name retries with a fresh suffixed name, an explicit
  `--out` collision exits non-zero.
- Writes are atomic (temp + link + unlink): interrupted writes are invisible at
  the destination; a temp path this invocation failed to create exclusively is
  never cleaned up.

## Report schema (`gsc-report/1`)

Deterministic: identical inputs produce identical bytes; **no build clock**
enters results. `--as-of` is an input cutoff, not a clock.

**Selection.** The exact selection key is the normalized request context
(property, ordered dimensions, normalized semantic filters, search type,
dataState, request aggregation semantics) + slice + data day. Outer fetch
window, `fetchedAt`, filenames, `rowLimit` and `startRow` are provenance, never
partition keys. Whole-day replacement rules:

- latest **successful whole day** wins (`complete`, proven `empty`, legacy rows);
  ties are deterministic (filename order) and marked `tieBreak`;
- an empty refresh **without proven availability/completeness** (new-schema
  empty past the cutoff, or a legacy request window with no rows) never erases
  previous row-bearing evidence: the rows are retained and the refresh is
  visible as `uncertainRefresh`;
- a later **failure** is attached as `laterFailure` diagnostics (including
  failures with no response aggregation) and never erases the last success;
- failure-only days render as `failed`/`partial`/`truncated` — never zero.

Observed response aggregation semantics are part of successful evidence
identity: same-day evidence with different `responseAggregationType`
(including legacy `unrecorded-legacy` vs new-schema values) stays in separate
groups and surfaces under `incompatibilities` — never silently overwritten or
blended.

**Day states** in the report: `complete`, `empty`, `legacy-unknown` (rows
observed, completeness unproven), `legacy-empty-unknown` (legacy window day
without rows — unknown gap, not zero), `unavailable-unknown`, `partial`,
`conflict`, `failed`, `truncated`, `missing`. Only `complete|empty|legacy-unknown`
feed metrics; only `complete|empty` are **proven**, so legacy evidence never
reports `metricsComplete: true`. Windows carry `metrics` (null when no counted
evidence — zeros require proven empties), `daysCounted`, `provenCompleteDays`,
`metricsComplete`, `partial`, `gapDates` (missing days are gaps too) and
`unprovenDates`.

**Tables and totals.** Main-host page table uses strict hostname equality
(`hostname === cubxxw.com`; `www.cubxxw.com` counts as other host) and is a sum
of **returned page-dimension rows** — not property chart totals. Other-host
rows are kept in a separate table. Property totals (`date_totals`) and
host-filtered byPage date totals (`blog_date_totals`) are separate sections and
are never mixed.

**Queries.** Query rows are incomplete (anonymous queries and internal row
limits) — absence is not zero. Transparent rule-based labels (first match
wins): `site-maintenance` (`site:` operator), `brand` (token list),
`ambiguous-anomalous-heuristic` (URL-like text, 3+ repeated tokens, >12 tokens,
>100 chars, control characters — a flag for review, not a judgment),
`nonbrand`. Landing pages are **never inferred**; real query×page pairs exist
only where the page dimension was returned. The default report emits no raw
query strings (the public baseline must not); `--include-query-rows` adds
labeled `topQueries` and real `queryPagePairs` (query+page+metrics) with a
documented limit and explicit `truncated` flag.

**Summary comparability** (conservative, fail closed). Cross-source
comparisons (e.g. query rows vs main-host page rows) require:

1. the query request context to be the **unique exact host-filter context
   emitted by the known collector builder** — arbitrary regex is never
   reverse-engineered (an unescaped-dot expression is not the builder output),
   and every remaining normalized filter semantic (country/device/…) must
   match exactly; extra filters make the scope `unproven` and such contexts
   never enter comparisons;
2. matching property/searchType/dataState identity;
3. **both** windows' sources to have non-null metrics with proven complete
   window coverage over identical counted date sets.

Multiple candidate query contexts are never resolved by picking the first one
(comparison is refused with the candidate identities listed). Anything weaker
is not comparable with a reason while independent metrics stay visible.
Domain-wide legacy `date×query` (no page dimension, includes other hosts) is
reported independently and never compared with main-host page rows; where
comparable, the gap is explicitly **not** a measured coverage loss.

**Availability.** The report-level availability summary is selected by the
**exact identity** (property + searchType + dataState) of the unique report
context; another property's — or another search type's / dataState's — probe
never redefines it (per-semantic-context evidence stays in
`availabilityByContext`). An ambiguous report context yields `unknown` with the
groups retained — never a first-key pick. A newer failed probe (`unknown`)
coexists visibly with `lastObserved`; ties on `fetchedAt` resolve by filename.

**as-of observation cutoff** (`--as-of` / `asOf`, strict UTC timestamp
`YYYY-MM-DDTHH:MM:SS[.mmm]Z`): distinct from the traffic start/end. The check
is **fail-closed at every exported core entry** (`buildReport`, `loadEvidence`,
`loadAvailability`): a non-null cutoff must be a strict UTC timestamp and can
never degrade into "no cutoff"; the preloaded-evidence shortcut is refused so
nothing can bypass cutoff/eligibility proofs. `buildReport` additionally
validates strict calendar dates and an ordered nonempty range without any
clock (the CLI keeps its future-date check). Eligibility is chronological
(epoch comparison, never lexical offset ordering); later observations —
including later failures, which can never attach as `laterFailure` — are
excluded consistently from selection, availability, undated sections, inputs
and summaries. Missing/invalid `fetchedAt` cannot prove eligibility and is
excluded with the visible constant reason `AS_OF_UNPROVABLE_REASON`; later
observations use `AS_OF_AFTER_CUTOFF_REASON`. Without a cutoff all inputs are
used.

**Deduplication** is SHA-256 plus full byte comparison: byte-identical files
count once (recorded as `duplicateOf`), distinct contents are never merged even
on a hash collision.

## Legacy snapshot caveats

Historical `data/seo/gsc-*.json` (four arrays + `meta`) are read-only evidence
and stay usable, with labelled assumptions (see `legacyAssumptions` in every
report):

- `searchType=web` and `requestAggregationType=auto` are inferred from the
  known legacy collector; `responseAggregationType` is `unrecorded-legacy`;
  `dataState=final` was actually sent by the legacy collector (fact).
- Legacy day completeness is unknown: observed rows are a returned-row
  baseline, never proof of completeness (`metricsComplete` stays false).
- A legacy request-window day without rows is an **unknown gap**, never a
  proven zero day and never a reason to erase older rows.
- Legacy `date_query` has no page dimension; `query_device`/`query_country`
  have no date dimension and are kept as an undated legacy reference: per-slice
  input counts and source file references only, never attributed to a day or
  window and never summed across overlapping snapshots into a traffic total
  (per-snapshot detail stays in the original `data/seo` JSON).
- Old missing days/failed status are unknown, not fabricated zeros.

The collector no longer emits the legacy four arrays (reading them remains
supported); the Analyze consumer migration is owned by batch B.

## Baseline artifact

`docs/seo-390-baseline.json` is produced from the read-only historical
snapshots with windows ending 2026-09-20:

```bash
node scripts/gsc-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20 --out docs/seo-390-baseline.json
```

Reproduced main-blog (strict `hostname == cubxxw.com`) returned page-row
totals: **2026-08-24—09-20: 141 clicks / 93,015 impressions** (CTR
0.151588%, impression-weighted position 10.6474) and **2026-07-27—08-23:
119 / 61,892** (CTR 0.192270%, position 14.2253). These are sums of returned
page-dimension rows, not property chart totals; days are `legacy-unknown`
(completeness unproven). Query rows in the same corpus cover only 21 clicks /
4,943 impressions and are explicitly not comparable with main-host page rows.
The artifact contains aggregated metrics and provenance only — no raw query
strings.

**Frozen input set.** The committed baseline was generated without `--as-of`
from the historical input list at source revision
`105905c22ddb6288199a1073a5b40d2dbba08e3f` (78 legacy
snapshots; last included `fetchedAt` is `2026-09-23T10:52:13.815Z`, covered by
the real-history regression's frozen cutoff `2026-09-24T00:00:00Z`). Once
newer snapshots land in `data/seo`, the no-cutoff regeneration command above
would see different inputs and correctly **refuse to overwrite** this frozen
artifact; a fresh baseline must use a **new output path** (or an explicit
`--as-of` for a fixed observation basis). Regeneration over the identical input
set is byte-identical (`--out` no-ops on identical content).

## Source facts (official references)

- [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query):
  request/response semantics; search dates are inclusive **Pacific** dates;
  page filtering disallows `byProperty`; the server response aggregation is
  evidence; `rowLimit` max 25,000 with `startRow` paging.
- [Getting your performance data](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data):
  per-day collection and paging still cannot bypass internal row/dimension
  limits or anonymous-query omission.
- [Google metrics definitions](https://support.google.com/webmasters/answer/17011364?hl=en):
  CTR = clicks / impressions; position is impression-weighted.

## Live gates (pending — parent-owned)

- [ ] Fresh 56-day collection with the new collector (live Google API run).
- [ ] GSC UI verification on the same filter/date basis, with differences
      explained.
- [ ] Fresh query×page evidence for the content experiments (#394–#397).
- [ ] CI run and A+B integrated release (Analyze consumer migration).

No Google, CI, deployment or search-growth claims are made by this document or
the baseline artifact.
