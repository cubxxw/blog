# SEO observation pipeline (B1): PSI observations, deterministic report, proposal-only gate

Status: B1 implemented with offline evidence (issue #392, batch B1). This
document freezes the interfaces B2 consumes. **No live/production success is
claimed here**: live Analyze read-back, three scheduled runs and the 56-day
backfill remain parent-owned gates. A+B1+B2 release together so the old
Analyze consumer never sees A's new schema alone.

Scope boundary: B1 is the pure observation/report/gate layer — no workflow
orchestration, model jobs, issue publishers, credentials/permissions or YAML
CI tests (all B2). Verification reported here is offline. The observation
collector makes the explicitly documented Google requests; report generation
and candidate decisions do not call a network service or model.

## Components and commands

```bash
# 1) PSI observation collector (schema psi-snapshot/2) — network, needs GOOGLE_API_KEY
node scripts/psi-fetch.mjs                          # write today's observation
node scripts/psi-fetch.mjs --dry-run                # summary only
node scripts/psi-fetch.mjs --out path.json          # explicit output (never overwritten)
node scripts/psi-fetch.mjs --dir data/seo --config lighthouserc.json \
  --timeout-ms 120000 --max-attempts 3

# 2) Deterministic report (schema seo-report/1) — offline, no build clock in results
node scripts/seo-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20
node scripts/seo-report.mjs --dir data/seo --start 2026-07-27 --end 2026-09-20 \
  --as-of 2026-09-24T12:00:00Z --run-date 2026-09-24 \
  --out report.json --markdown-out section.md
node scripts/seo-report.mjs ... --include-query-rows   # real query×page rows (off by default)

# 3) Proposal-only candidate gate (schema seo-autofix-gate/1) — offline, pure
node scripts/seo-autofix-gate.mjs --report report.json --review-state review.json \
  --page-map page-map.json --expected-source-commit <40-hex-frozen-sha> \
  --decision-at 2026-09-24T12:00:00Z \
  [--intents intents.json] [--repository cubxxw/blog] [--budget 2] [--out gate.json]

# Targeted offline tests (Node 22 built-ins only)
node --test scripts/psi-fetch.test.mjs scripts/seo-report.test.mjs \
  scripts/seo-autofix-gate.test.mjs scripts/gsc-fetch.test.mjs scripts/gsc-report.test.mjs
```

### Exit semantics (stable for B2)

| CLI | 0 | 2 | 1 |
|---|---|---|---|
| `psi-fetch.mjs` | every planned slot succeeded with full provenance | evidence written; some slot partial/failed/missing (never green) | run failed (no usable measurement) or usage/config/IO error |
| `seo-report.mjs` | report generated; GSC+PSI+CrUX all fresh at the as-of cutoff | report generated with stale/missing/partial evidence (gaps in-band) | generation failed (usage/config/IO) |
| `seo-autofix-gate.mjs` | decision produced — zero candidates is a SAFE outcome | — | invalid inputs (bad usage/JSON/schema; missing `--page-map`/`--expected-source-commit`/`--decision-at`) |

`--out`/`--markdown-out` follow evidence semantics: byte-identical
regeneration is an idempotent no-op (`unchanged`); differing content is
refused (never silently overwritten).

## Immutable observation files (discovery frozen at the B1 handoff)

- Discovery accepts these exact filename forms in
  `scripts/lib/seo-observations.mjs`:
  - first daily write `psi-YYYY-MM-DD.json` / `crux-YYYY-MM-DD.json`
  - same-day rerun appends `psi|crux-YYYY-MM-DD-<UTC HHMMSSmmmZ>-<hex>.json`
- PSI persistence in `scripts/lib/psi-persist.mjs` is atomic + no-clobber
  (exclusive temp + hard-link); repeated persistence cannot replace an
  existing observation. The unchanged CrUX collector does not provide this
  guarantee. B2 must allocate a unique, nonexistent CrUX `--out` path and
  validate that exact new artifact before accepting the collection stage.
- Selection (`selectPsiObservations` / `selectCruxObservations`) orders by the
  actual `meta.fetchedAt` (strict UTC) with filename tie-break and takes an
  explicit `asOf` cutoff. Later observations (including later failures) are
  excluded at the cutoff. **Missing/invalid timestamps are never eligible —
  even without a cutoff** (they stay visible in `unprovable` + `excluded`).
- Per URL×strategy (PSI) and origin×formFactor (CrUX): `current` is the latest
  planned slot outcome — including an explicit `finalStatus: 'missing'` when
  the latest certified plan recorded nothing for the slot. `lastGood` is a
  separately labelled older sample that never substitutes for the current
  outcome. A target an uncertified/truncated latest stage never specified is
  marked `currentCertified: false` + `currentLabel: 'historical-supplement…'`.
- `runStatus: 'uncertified'` + `planCertified: false` (PSI) or
  `identityCertified: false` (CrUX) mark observations that cannot certify a
  complete denominator/identity: rows stay usable, completeness is withheld
  and propagated to report and gate.

## psi-snapshot/2 (collector output)

```jsonc
{
  "schema": "psi-snapshot/2",
  "meta": {
    "runDate": "2026-09-24",            // UTC date, frozen once per run
    "startedAt": "…", "endedAt": "…", "fetchedAt": "…",  // strict UTC
    "planned": [{ "url": "…", "strategy": "mobile" }],    // recorded plan = denominator
    "configuredUrlCount": 13, "urlCount": 13, "duplicatesRemoved": 0,
    "counts": { "planned": 26, "succeeded": 0, "partial": 22, "failed": 4,
                "missing": 0, "usable": 22, "duplicate": 0, "unplanned": 0,
                "byStrategy": { "mobile": { … }, "desktop": { … } } },
    "runStatus": "ok" | "partial" | "failed",
    "apiKeyProvided": true,             // boolean only — no key material
    "timeoutMs": 120000, "maxAttempts": 3
  },
  "measurements": [ /* one entry per planned slot, in plan order */ ]
}
```

Measurement entry essentials (all fields allowlisted; nothing else persists):

- `finalStatus`: `success` (valid core + complete provenance) | `partial`
  (usable core, provenance visibly incomplete) | `failed` | `missing`
  (planned slot with no recorded row — unknown outcome, never zero).
- `metrics`: `{LCP,FCP,TBT,SI,TTI: unit 'ms', CLS: unit 'unitless'}` with raw
  unrounded `numericValue`, `precision: 'raw'` and per-field `provenance`.
  Legacy files are normalized with `precision: 'unknown-rounded'` (CLS) and
  displayValue recovery ONLY as `displayDerivedValue.provenance:
  'derived:displayValue'` — raw precision is never fabricated.
- `diagnostics.costs`: `{ savingsMs, savingsBytes, transferBytes }`. Savings
  come from `details.overallSavingsMs/Bytes` (explicit, finite, per-field
  provenance); `numericValue` is read only with its own `numericUnit` and only
  for known opportunity audits; `total-byte-weight` is TOTAL transfer
  (`totalBytes`), never removable waste. Zero-ms/nonzero-byte audits survive;
  unknown savings stay null.
- `provenance`: validated `fetchTime`, `lighthouseVersion`, allowlisted
  `configSettings` (formFactor, throttlingMethod, throttling rtt/throughput/
  latency/cpu, full screenEmulation incl. DPR, locale, bounded emulatedUserAgent)
  and URLs. Arbitrary config (e.g. `extraHeaders`) is never retained.
  `provenanceSignature()` fails closed: unknown/invalid fields make
  compatibility unprovable and comparisons are withheld (URL/strategy/finalUrl
  must also match). CPU/RTT/DPR/locale differences remain distinguishable.
- `diagnostics.lcpElement`: legacy `largest-contentful-paint-element`
  (flat/nested) then `lcp-phases-insight` direct node entries, deterministic
  precedence, exact source audit in `provenance`, absent → null (never
  invented).
- Failure entries carry FIXED classifications only
  (`errorKind: http|transport|timeout|payload|runtime-error|legacy` +
  allowlisted metadata: numeric PSI HTTP status, bounded network code, attempt
  log, allowlisted runtimeError code or `'unknown'`). Raw provider bodies,
  exception text and runtimeError messages are never published — pattern
  redaction/truncation is not the boundary. `originHttpStatus` is always null:
  a PSI HTTP status is the PSI endpoint's status, never the origin's.
- Transport: ONE per-attempt deadline covers response headers AND body
  (aborts on expiry, bounds non-cooperative readers). Body resets/timeouts
  stay transport failures with any known PSI HTTP status preserved and the
  same bounded retry (max 3 attempts, 429/408/selected 5xx/network only).
  Genuinely malformed HTTP 200 payloads are non-retryable
  `malformed-measurement`. CrUX no-sample (field data) is independent from
  laboratory success.

## CrUX History normalization (existing collector supported, not rewritten)

The collector persists `records:queryHistoryRecord` output:
`record.collectionPeriods[]` (rolling 28-day windows advanced **weekly**;
overlapping windows are normal and labelled `overlappingWindows`, never summed
into disjoint traffic totals) with `histogramTimeseries` (bins whose
`densities[]` align to periods by index), `percentilesTimeseries.p75s[]` and
`fractionTimeseries: { label: { fractions: [...] } }`. Values are aligned to
each period; null / string-`NaN` are **no sample, never zero**; CLS is
unitless (p75 may be a numeric string). Invalid/reversed/duplicate/unordered
periods, mismatched time-series lengths and unproven record identity stay
visible (`invalid` / `identity-unproven`) and never certify sampled success.

Plan/identity: `meta.formFactors` is the denominator — missing, duplicate,
unexpected or malformed rows can never certify complete collection (two
explicit `notEligible` rows ARE valid successful no-sample). `record.key`
origin/formFactor must match the observation identity; a missing `meta.origin`
withholds certification (`identityCertified: false`) and record-key origins are
kept strictly separate — never blended.

`notEligible` = successful query, no field sample (unknown field data).
`results[].error`, an HTTP-200 missing/invalid record, and stale or absent
artifacts are never success.

## seo-report/1 (deterministic report)

Pure `buildSeoReport({ gsc, psi, crux, params })`
(`scripts/lib/seo-report-core.mjs`); the CLI composes A's public
`buildReport()` (gsc-report/1) with the observation selection. Identical
inputs including `--as-of` produce identical bytes. `params.asOf` is a
recorded input (`asOfBasis: 'explicit' | 'run-clock'`) and the EXACT frozen
cutoff is passed to GSC, PSI and CrUX consumers. `params.runDate` (UTC report
identity) is separate from all data dates.

- `inputs`: complete input provenance (eligible files/observations with
  timestamps + `excluded`/`unprovable` with constant reasons + problems).
- `sources.gsc`: scope (property/searchType/dataState/host), Pacific data
  dates, `freshness` (thresholds + reasons; fetch recency from the SELECTED
  counted evidence, never a newer failed/unrelated file), completeness.
- `sources.psi`: per-strategy denominators, per-target `current`/`lastGood`
  summaries, `comparisons` (compatible samples only; `historical: true` when
  the 'to' sample is not the current outcome) and a preserved `missingSet`.
  Freshness is per URL×strategy (`freshness.byTarget`) and aggregated
  conservatively: one fresh page never masks a stale/undated target.
- `sources.crux`: per origin×formFactor groups with the actual latest window
  and date, `originConflict` when origins differ, and the cadence note.
  Freshness is per group: a sampled factor never hides a failed/missing one
  and no-sample is a distinct collection status (never fresh field metrics).
- `trend`: `comparable` ONLY with complete non-overlapping 28+28 coverage;
  otherwise `not-comparable` with a reason (gaps, never a false trend).
- `queryEvidence`: `groups[]`, each bound to its exact request context
  (property/searchType/dataState/dimensions/filters/requestAggregationType),
  `responseAggregationType`, per-window `coverage` and `truncated` flag, with
  real query×page pairs only. Contexts are never blended into one flat pool
  and landing pages are never inferred.
- `observations`: deterministic signals. ACTIONABLE only from CURRENT dated
  target-specific proof: `missing-description` (current PSI meta-description
  audit) and `metric-regression` (current compatible-sample comparison).
  Historical-only evidence is `*-historical` + `actionable: false`.
  `low-ctr-signal` is informational: **low CTR alone never authorizes a copy
  change**.
- `markdown`: bounded, marker-safe prepared body for the existing `seo`
  daily section (the deterministic part only; optional model interpretation is
  a separate untrusted input appended by B2's trusted publisher).

Freshness thresholds (explicit, recorded in every report):

| source | threshold | rationale |
|---|---|---|
| GSC fetch age | 72h | daily cadence of the Snapshot run |
| GSC data-date lag | 6 days (Pacific calendar) | collector end lag (3 days) + publishing slack |
| PSI measurement age | 3 days | daily cadence; measured from the actual Lighthouse `fetchTime` |
| CrUX window end lag | 14 days | History releases rolling 28-day windows weekly; tolerance = two release intervals. The 28-day window length is never a freshness allowance. Windows ending after as-of are unproven (`crux-collection-date-after-as-of`) |

## seo-page-map/1 (trusted Hugo target identity — B2 produces, B1 consumes)

Frozen B1/B2 architecture: B2's trusted preparation runs the pinned Hugo
0.145.0 under the production config with an explicit clock (`hugo list
published` → stdlib CSV→JSON conversion) and writes the map. B1 only
validates and consumes it. B2 owns invoking Hugo, CSV conversion and actual
tracked-file/realpath proof; B1 performs no filesystem access and claims none.
No frontmatter route parser and no fallback routing engine exist — targets
resolve ONLY through this map.

```jsonc
{
  "schema": "seo-page-map/1",
  "repository": "cubxxw/blog",
  "sourceCommit": "<40-hex frozen checkout SHA>",
  "clock": "<strict UTC timestamp passed to Hugo — must equal --decision-at>",
  "generatedAt": "<strict UTC — calculation time; may exceed clock>",
  "producer": { "name": "hugo-list-published", "version": "0.145.0",
                "environment": "production", "baseURL": "https://cubxxw.com/" },
  "read": { "status": "ok", "completeness": "complete" },
  "pages": [
    { "url": "https://cubxxw.com/zh/projects/mem0/",
      "sourcePath": "content/zh/ai-agent/posts/mem0.md",
      "kind": "page",
      "publishDate": "2025-05-09T13:33:46Z" }
  ]
}
```

Validation/consumption rules (`scripts/lib/seo-page-map.mjs`), all visible:

- **Identity pair**: each `url` is an owned HTTPS production canonical
  permalink — no credentials, non-default port, query or fragment, no
  normalization tricks. `sourcePath` is a relative POSIX Markdown path under
  `content/en/` or `content/zh/` (no absolute/backslash/`..`/dot segments).
  Lookup is EXACT-match: paths never fold case (UFO.md ↔ /projects/ufo/
  resolves exactly as listed), aliases/old redirects never merge, missing
  mappings skip instead of guessing.
- **Conflicts isolated before kind filtering**: one URL→multiple sourcePaths
  or one sourcePath→multiple URLs isolates ALL involved associations as
  ambiguous (never a first-row pick). Exactly identical duplicate rows are
  deduplicated and recorded. Unrelated valid targets are preserved.
- **Only `kind: page` proposes** (index.md bundles are ordinary pages);
  section/term/taxonomy rows get explicit `target-not-editable-page` skips.
- `publishDate: null` is Hugo's allowed no-date sentinel; a future
  publishDate can never propose. `generatedAt` may exceed `clock`.
- Empty/failed/incomplete/over-cap (5000 rows) maps visibly skip — an
  unreadable listing is never a complete empty list.

## Decision time (explicit; distinct from the report cutoff)

`--decision-at` (strict UTC) is the one explicit decision instant. B2 freezes
it after Google collection and the GitHub review-state read and passes the
SAME value as Hugo `--clock`, `seo-report.mjs --as-of` and the gate's
`--decision-at`. The gate requires:

- `map.clock == decisionAt` (a map for another publication clock never
  authorizes this decision; re-list instead of deriving publish-date
  changes);
- `report.params.asOf <= decisionAt` (a future report cutoff never
  authorizes a historical decision) — and the report cutoff is preserved
  separately in `params.reportAsOf`;
- `reviewState.observedAt <= decisionAt` — **even one second later is
  excluded**, no tolerance window;
- proposal `closedAt`/`mergedAt` never exceed the observed review time and
  match their state (open⇒neither, closed-unmerged⇒valid closedAt + no
  mergedAt, closed-merged⇒valid mergedAt); UNKNOWN RECENCY (e.g. a
  closed-unmerged overlap without closedAt) is an incomplete review state and
  visibly skips — it is never treated as "ok".

Stored `fresh: true` flags are never trusted: freshness is re-evaluated from
the ORIGINAL measuredAt / data dates / window ends against the decision time
(shared `FRESHNESS_THRESHOLDS`; a new map, wrapper or interpretation can never
freshen old data), and source observation timestamps must also be ≤ the
report cutoff. Strict historical replay simply supplies its historical
`--decision-at`; later GitHub reads/observations cannot enter it.

## seo-review-state/1 (B2's bounded read-only GitHub adapter output)

```jsonc
{
  "schema": "seo-review-state/1",
  "repository": "cubxxw/blog",           // exact identity; verified, fail closed
  "observedAt": "2026-09-24T11:00:00Z",  // strict UTC; >24h before as-of = stale
  "read": { "status": "ok|failed|partial|truncated",
            "completeness": "complete|partial|truncated", "error": null },
  "backlog": { "relevantOpenCount": 2 },  // REQUIRED, never defaulted to zero
  "proposals": [                          // open + recently closed, bounded
    { "number": 12, "state": "open|closed-merged|closed-unmerged",
      "closedAt": "…|null", "mergedAt": "…|null",
      "changedFiles": ["content/zh/…"] }  // ACTUAL changed-file evidence only
  ]
}
```

Missing, stale, failed, truncated or incomplete review state is a **visible
safe skip**, never zero/empty by default. No GitHub calls happen in B1.

## seo-autofix-intents/1 (untrusted input) and seo-autofix-gate/1 (decision)

Intents (e.g. B2 model suggestions) are untrusted, bounded text — never a
source of numeric truth:

```jsonc
{ "schema": "seo-autofix-intents/1",
  "intents": [{ "kind": "title-intent|content-intent|internal-link|meta-description|performance-regression",
                "targetUrl": "https://cubxxw.com/…", "targetPaths": ["content/…"],
                "rationale": "≤300 chars", "evidenceBasis": { "queries": ["real query"] } }] }
```

Gate rules (all visible in `decisions[].reasons`):

- proposal-only mode; `apply.available: false` until an independently
  authorized future implementation. No content edits, branches, PRs, issue
  writes or model calls; no generic auto-edit policy engine.
- **real target identity**: every candidate resolves
  `targetUrl → one trusted sourcePath` through the page map. Model
  `targetPaths` are never evidence: a conflict with the map is rejected
  (`model-target-paths-conflict`), agreement is replaced by the map-derived
  list. Overlap compares that sourcePath DIRECTLY against actual changed-files
  (B2 includes old+new rename paths) — no URL↔path guessing (the removed
  `contentPathToUrl` inference never sees Mem0/LangGraph overrides).
- per-kind required evidence (`KIND_REQUIREMENTS`), re-evaluated at the
  decision time:
  - `meta-description` → the target's OWN current certified fresh
    URL×strategy measurement with a meta-description audit 0. Untrusted intent
    text can never create a missing audit; a healthy audit (1) never proposes.
    A strategy-less intent qualifies only when a real own current fresh
    measurement actually supports the kind.
  - `performance-regression` → a matching CURRENT compatible comparison for
    the same URL×strategy with an actual regressing delta under the shared
    `REGRESSION_THRESHOLDS` — intent plus any comparison is not enough.
    Its current measurement must itself be fresh and certified. A strategy-
    less intent searches qualifying measurement/comparison pairs; one
    device's freshness cannot authorize another device's regression.
  - `title-intent`, `content-intent`, `internal-link` → the page's real
    query×page coverage within ONE eligible current context/window carrying
    its own freshness and property/searchType/dataState/dimensions/filters/
    aggregation/coverage provenance (≥3 pairs and ≥50 impressions). Previous-
    window demand never authorizes a current change; another page's or
    another context's fresh GSC never refreshes an old/different query group;
    multi-context matches are ambiguous (never blended or first-picked).
    Truncation/partial labels stay visible. Intents must cite the page's real
    queries — empty/ungrounded bases skip as `low-ctr-alone-insufficient`.
    CrUX no-sample never blocks a GSC-evidenced proposal.
- review rules from actual changed-file evidence: backlog ≥ 3 blocks;
  overlapping OPEN proposal blocks; a proposal closed WITHOUT merge within 14
  days of the decision time blocks (human rejection); merged or unrelated
  proposals never block. Body/title guesses never establish overlap.
- finite candidate budget (default 2, max 5); overflow is a visible
  `budget-exhausted` skip. Zero candidates is a safe outcome.

Output: `candidates[]` (bounded proposals: summary + target files only) and
`skipped[]` (each with explicit reasons), plus `reviewState` status and notes.

## Still pending (B2 / parent-owned — NOT claimed here)

1. Workflow orchestration for Snapshot/Analyze/Autofix; static YAML contract
   tests and the read-only `seo-contracts.yml` offline CI job (A+B tests, real
   history regression with a fixed cutoff).
2. Trusted publication: separate read-only interpretation job (no write token,
   `persist-credentials: false`, `show_full_output: false`, `execution_file`
   output), fresh-checkout publisher at the frozen SHA that regenerates/loads
   validated evidence, escapes optional model text and persists only
   allowlisted sanitized diagnostics. One shared publish concurrency group
   (cancel-in-progress: false) across SEO/Autofix/Lighthouse writers with the
   minimal `lighthouse.yml` integration.
3. Lighthouse manifest `jsonPath` → artifact-local resolution with
   path-boundary validation; frozen UTC report date propagated through all
   publishers; one-daily-issue identity/markers/closing semantics preserved.
4. The small bounded read-only GitHub adapter producing `seo-review-state/1`
   (incl. per-proposal `changedFiles` with old+new rename paths and consistent
   state/closed/merged timestamps); proposal-mode workflow with minimum
   permissions; `.claude/skills/seo-autofix/SKILL.md` alignment (remove the
   false "low CTR proves bad copy" claim).
5. Trusted page-map preparation: pinned Hugo 0.145.0 `hugo list published`
   under the production config at the frozen clean checkout with the explicit
   clock, stdlib CSV→JSON conversion, plus actual tracked-file/realpath proof
   (B1 claims none). CrUX collector invocation with unique safe `--out` paths
   tied to run ID/attempt (collector itself unchanged).
6. Parent-owned live gates: one manual Analyze read-back into the daily issue,
   three scheduled runs with complete status records, one manual 56-day
   backfill (`--lookback 55`), GSC UI same-filter verification, and the
   A+B1+B2 integrated release. Apply mode remains unavailable.

## Verification performed for B1 (offline)

- `node --test scripts/psi-fetch.test.mjs scripts/seo-report.test.mjs
  scripts/seo-autofix-gate.test.mjs scripts/gsc-fetch.test.mjs
  scripts/gsc-report.test.mjs` — full B1+A suite (see the delivery summary for
  counts).
- `node --test scripts/daily-report-issue.test.mjs` — parent's
  `applySection` regression preserved.
- Parent probe suites replayed green (PSI boundaries, observation
  normalization incl. real History shapes, report freshness/cutoff).
- `git diff --check` clean. Real-history regression at frozen cutoff
  `2026-09-24T00:00:00Z`: legacy PSI 15+11 / 26 and 22+4 / 26, real CrUX
  PHONE+DESKTOP `no-sample` (unknown, never zero), legacy GSC coverage honest
  (`not-comparable`, no false trend).
