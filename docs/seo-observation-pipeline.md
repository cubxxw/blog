# SEO observation pipeline (A+B1+B2): PSI observations, deterministic report, proposal-only gate, trusted workflow integration

Status: A+B1+B2 implemented with offline evidence (issue #392, batches A/B1/B2).
A+B1 freeze the interfaces; B2 owns the trusted workflow integration around
them (stage validation, Snapshot/Analyze/proposal-only Autofix workflows,
separate read-only interpretation and trusted publisher, shared daily-report
concurrency/date handling, minimal Lighthouse publication integration and the
offline SEO Contracts CI job). **No live/production success is claimed here**:
live Analyze read-back, scheduled runs and the 56-day backfill remain
parent-owned gates. A+B1+B2 release together so the old Analyze consumer never
sees A's new schema alone.

Scope boundary: A+B1 are the pure collector/observation/report/gate layer — no
workflow orchestration, model jobs, issue publishers or YAML CI tests. B2 adds
the trusted orchestration WITHOUT changing any collector/report/gate API: it
reuses their CLIs and normalizers, adds small pure stage/adapter helpers
(`scripts/lib/seo-run-context.mjs`, `scripts/lib/seo-stages.mjs`,
`scripts/lib/seo-model-output.mjs`, `scripts/lib/seo-github-review.mjs`,
`scripts/lib/seo-compose.mjs`), one adapter CLI (`scripts/seo-pipeline.mjs`)
and the stdlib page-map producer (`scripts/seo-page-map.py`). Verification
reported here is offline. The observation collectors make the explicitly
documented Google requests; report generation and candidate decisions do not
call a network service or model.

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

## B2 trusted pipeline adapter (implemented)

```bash
# Trusted orchestration (scripts/seo-pipeline.mjs) — no model calls, no issue writes
node scripts/seo-pipeline.mjs plan --repository R --run-id ID --attempt N \
  --out run/plan.json --github-output "$GITHUB_OUTPUT"   # frozen UTC date + exact artifact per stage/run attempt
node scripts/seo-pipeline.mjs stage --plan run/plan.json --kind gsc|psi|crux \
  --exit-code N --out run/stage-gsc.json                 # process outcome AND the exact new artifact
node scripts/seo-pipeline.mjs stage --kind publish --exit-code N --out run/stage-publish.json
node scripts/seo-pipeline.mjs report --exit-code N --report report.json --markdown section.md \
  --expect-as-of TS --expect-run-date D [--expect-start D --expect-end D] --out run/stage-report.json
node scripts/seo-pipeline.mjs interpretation --action-outcome X \
  --structured-output-env STRUCTURED_OUTPUT --execution-file F --run-url U --out interpretation.json
node scripts/seo-pipeline.mjs prompt --report report.json --repository R --run-date D --as-of TS --out prompt.txt
node scripts/seo-pipeline.mjs compose --kind seo|autofix|failure … --out section.md
node scripts/seo-pipeline.mjs review-state --repository R --out run/review.json   # read-only gh adapter
node scripts/seo-pipeline.mjs freeze --review-state run/review.json --now … \
  --out run/run-context.json --github-output "$GITHUB_OUTPUT"                     # ONE decision instant
node scripts/seo-pipeline.mjs aggregate --stage … [--interpretation …] --out run/status.json

# Trusted page-map preparation (stdlib csv -> seo-page-map/1; tracked-file proof)
hugo list published --environment production --config config.yml \
  --clock "$DECISION_AT" --noBuildLock > run/page-map.csv   # env: HUGO_BASEURL/HUGO_ENABLEGITINFO/GOMAXPROCS=1
python3 scripts/seo-page-map.py --csv run/page-map.csv --out run/page-map.json \
  --repository cubxxw/blog --source-commit "$GITHUB_SHA" --clock "$DECISION_AT"
```

Stage semantics (the frozen five-case matrix; both the process outcome and the
exact new artifact must agree):

| Case | Collector / artifact | Report | Interpretation | Publication | Aggregate |
|---|---|---|---|---|---|
| all fresh | exit 0 + exact new artifact | exit 0: generated/fresh | ok or explicitly skipped | deterministic report | required ok → 0 |
| CrUX two certified `notEligible` | success/**no-sample** (unknown, never zero) | exit 2: generated/degraded | optional | no-sample status published | 0; never called API failure or fresh field data |
| CrUX `results[].error` rows (even raw exit 0) | **failed/partial** | generation may still succeed | optional | facts preserved | **nonzero** |
| CrUX HTTP-200 `record:null`/invalid | **invalid** | generated/degraded never fixes it | optional | invalid/gap published | **nonzero** |
| no new file at the exact planned path | **unverified/failed** — old files never borrowed | — | — | honest gap | **nonzero** |
| report exit 1/unknown or missing/invalid artifacts (JSON-only is NOT generated) | separate | **failed** | skipped (no trusted input) | minimal failure section | **nonzero** |
| optional model failure / invalid output | unchanged | unchanged | **failed**, text withheld | deterministic evidence still published | may be 0 (optional), but the interpretation state stays failed |
| trusted publication failure | preserved | preserved | unchanged | **failed** | **nonzero** always |

Additional adapter rules (tested): PSI completeness comes from B1's
planned-slot normalizer (summary counts over deleted rows are rejected as
inconsistent); GSC `runStatus: degraded` (required slices complete, optional
cut failures) is collection SUCCESS with a distinct `degraded` outcome; the
report adapter requires the real minimum evidence shape, the expected
window/identity, JSON↔Markdown correspondence and exit↔freshness consistency.

## Optional model interpretation boundary (verified pin)

The interpretation job is optional, read-only and tool-free. Verified boundary
(slim proof: `docs/seo-model-boundary-proof.json`; a changed action pin or
boundary argument FAILS the semantic workflow tests until explicitly
re-verified):

- `anthropics/claude-code-action@v1.0.231` → SDK 0.3.278 → CLI 2.1.278.
- argv: `--tools= --disallowedTools "mcp__*" --strict-mcp-config
  --mcp-config '{"mcpServers":{}}' --safe-mode --disable-slash-commands` plus
  `--json-schema` (one bounded `explanation` string, `additionalProperties:false`)
  and `--max-turns 2` under a job timeout. Never `--tools ""`, never `--bare`.
- the job's own read-only `github.token` is supplied explicitly; checkout
  `persist-credentials: false`; no Google or publisher write token exists there;
  `show_full_output`/`display_report` stay false and `ACTIONS_STEP_DEBUG` is
  forced false at action execution (the parser lets debug override the input).
- the trusted prompt is a byte-bounded allowlisted public-safe summary whose
  VALUES are validated (owned HTTPS URLs without query/fragment, strict dates,
  finite aggregates, fixed enums); raw GSC query strings never enter it — the
  action logs prompts unconditionally.
- `structured_output` is consumed through the environment by trusted code and
  strictly validated (exactly `{explanation}`, non-blank, ≤600 chars). Only
  allowlisted sanitized diagnostics persist (action outcome, constant error
  class, the result/init subtype / is_error / turns / model when recognized,
  the run URL); raw execution files, transcripts and error text never persist
  or upload. Model text is published ONLY as a fenced literal block (or
  withheld) and never replaces metrics, status, markers or gate decisions.

## Trusted workflows (actual YAML)

- **Snapshot** (`seo-snapshot.yml`): plans exact artifacts per stage/run
  attempt (unique safe `--out` for the unchanged collectors), validates each
  stage against the exact new artifact, commits partial evidence even when a
  collector fails, treats git PERSISTENCE as a required stage (a failed push
  never yields ok=true) and ends with an explicit aggregate that stays nonzero
  on any required failure. The durable upload covers per-run state PLUS the
  exact three planned new observations (never the historical directory).
  Manual `lookback` input preserved (`55` = 56-day inclusive backfill);
  `with_device`/`with_country` are opt-in SEPARATE cuts.
- **Analyze** (`seo-analyze.yml`): a minimal `context` job freezes the run's
  UTC identity BEFORE fragile preparation and passes it by job outputs →
  trusted prepare (deterministic report, bounded prompt) → separate read-only
  interpretation job → trusted publisher (fresh checkout at the frozen SHA,
  `run/` created unconditionally, regenerated deterministic evidence,
  literal/withheld model paragraph, malformed optional interpretation
  degraded to failed/withheld, a rejected report published as the minimal
  failure block) writing the shared `seo` daily section with the frozen date.
- **Autofix** (`seo-autofix.yml`): proposal-only and model-free. The UTC
  report date freezes ONCE before fragile work and travels by job output (a
  post-midnight publish still lands on the run's own day). Read-only review
  state FIRST, then ONE frozen `decisionAt` shared as Hugo `--clock`, report
  `--as-of` and gate `--decision-at`; trusted page map (pinned Hugo 0.145.0
  `list published` → stdlib CSV→JSON with tracked-file/case/realpath proof),
  report with query×page rows, B1 gate, public-safe proposal section.
  Missing/malformed gate evidence publishes a truthful minimal failure section
  AND keeps the required pipeline failed. Minimum permissions (`contents:
  read`, `pull-requests: read` / `issues: write` in the publisher). Apply is
  unavailable until independently authorized future implementation.
- **Lighthouse** (`lighthouse.yml`): measurement unchanged (existing
  lighthouserc assertions); publication moved to a small dedicated job in the
  shared serialization group with the run's frozen UTC date. Manifest
  `jsonPath` resolves ONLY artifact-locally (basename + path-boundary check);
  zero eligible measurements publishes an honest missing-evidence section and
  exits nonzero. Push runs never write the issue.
- **Contracts** (`seo-contracts.yml`): offline Node 22 job
  (`npm ci --ignore-scripts`) running the targeted A+B suites — including the
  real-history regression at the fixed cutoff `2026-09-24T00:00:00Z`, semantic
  workflow YAML contracts and the stdlib page-map fixtures. No
  Google/model/browser/Hugo. Later batches append their tests to this job.

Daily issue identity and concurrency: ONE issue per day
(`站点日报 — YYYY-MM-DD`, UTC, frozen ONCE per run and passed via `--date` to
all three publishers). `seo` / `lighthouse` / `autofix` sections overwrite in
place; `ensureDailyIssue` reads ALL states so a delayed rerun of an already
CLOSED frozen date updates that issue instead of duplicating it (never
reopened); `closeStaleDailyIssues` closes only STRICTLY OLDER, labelled,
parseable daily issues — a delayed older-day run can never close a newer one.
All daily-report write paths share ONE GitHub Actions publish concurrency
group `daily-report-publish` with `cancel-in-progress: false` (running
publishes serialize and are never cancelled; GitHub keeps at most one PENDING
run per group, so an older waiting publish can be superseded — per-run state
therefore stays in durable workflow artifacts, not only in the issue).

## Live acceptance (separate from offline implementation)

Current release and run receipts are recorded in [#390](https://github.com/cubxxw/blog/issues/390#issuecomment-5813098179). The offline tests below do not establish these external outcomes:

1. One manual Analyze dispatch with read-back of the same daily issue.
2. Scheduled runs with complete status records (Snapshot/Analyze/Autofix).
3. One manual 56-day backfill (`--lookback 55`) and GSC UI same-filter
   verification.
4. Real Linux action initialization/tool inventory/OAuth success and a live
   structured-output readback for the model job (the offline proof used the
   fixed Darwin package; no Linux/model test is claimed).
5. The A+B1+B2 integrated release. Apply mode remains unavailable.

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

## Verification performed for B2 (offline)

- `node --test scripts/psi-fetch.test.mjs scripts/seo-report.test.mjs
  scripts/seo-pipeline.test.mjs scripts/seo-autofix-gate.test.mjs
  scripts/daily-report-issue.test.mjs scripts/lighthouse-report-to-issue.test.mjs
  scripts/gsc-fetch.test.mjs scripts/gsc-report.test.mjs` — full targeted suite
  (the contract's verify command): **273/273 passed** in the parent integrated tree.
- `scripts/seo-pipeline.test.mjs` covers the five-case stage matrix (incl. the
  PSI deleted-rows and report-shell counterexamples, A's `degraded` contract),
  the model boundary (actual pretty-JSON-array execution file, blank/extra-key/
  overlong/missing output, error subtype rejection, constant diagnostics,
  literal fenced publication, public-safe prompt with value validation and an
  inclusive byte cap), the bounded review adapter (31-sentinel list, rename
  old+new paths, incomplete reads), publisher date/close semantics, the
  stdlib page-map fixtures (Mem0/LangGraph-style overrides, uppercase UFO.md,
  bundles, CSV quoting, conflicts, untracked/wrong-case/symlink rows, caps)
  and semantic workflow YAML contracts bound to `docs/seo-model-boundary-proof.json`.
- Parent-independent probe suites replayed green against these sources:
  model boundary 10/10, stage semantics 12/12, publisher/compose 14/14 + 5/5.
- `actionlint` 1.7.12 (shellcheck/pyflakes disabled) clean over the five
  workflows. `git diff --check` clean.

Parent integration also executes 14 actual workflow shell scenarios: successful/failed snapshot persistence with exact artifact retention, optional interpretation absence/corruption, rejected report publication, and valid/missing/malformed/empty proposal evidence across midnight. All 14 passed. Malformed optional interpretation remains failed/withheld without failing required stages; empty gate/context produces a failure section and a nonzero required outcome.
