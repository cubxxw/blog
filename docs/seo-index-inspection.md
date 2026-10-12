# #393: bounded Google indexed-version inspection

Status: implemented and verified offline. Live URL Inspection permission is
**unknown** until the one-URL canary succeeds with the existing CI principal.
Search Analytics success does not certify Inspection permission. No GSC settings,
permissions, URL submission or credential migration is part of this collector.

## First live acceptance: one URL

Manually dispatch **SEO Index Inspection** on the approved implementation commit,
keeping `inspection_urls` at its default:

```text
https://cubxxw.com/engineering/posts/go-release-tools/
```

The workflow passes the input through `INPUT_URLS`, not interpolated shell code.
It reuses the existing `GSC_SERVICE_ACCOUNT_JSON` secret and the existing
`webmasters.readonly` OAuth helper. Only the Google OAuth token endpoint and
`urlInspection/index:inspect` are requested by the collector. No SDK or npm
installation is needed; its dependencies are Node built-ins and existing modules.

Both exact artifacts include the run ID and attempt:

- `run/inspection-<run-id>-<attempt>.json`: versioned, allowlisted observations.
- `run/inspection-process-<run-id>-<attempt>.json`: process exit code and binding
  to the exact report path/source SHA, including CLI/auth/collection failures.

Artifacts upload with `always()` and retention of 14 days. The job then validates
both artifacts and the collector step's actual `outcome` (never its
`continue-on-error` conclusion), and fails on a failed current step, nonzero
process code, missing report or incomplete
observation set. An uploaded diagnostic artifact is not a successful inspection.
Save the required permanent evidence in the project before artifact expiry.

Before requesting a batch, read back the default canary: exact source SHA,
property `sc-domain:cubxxw.com`, fetchedAt, `httpStatus: 200`, `status: inspected`,
and a substantive `indexStatus.verdict`. A Google `FAIL`/`NEUTRAL` verdict can be a
successful collection of a non-indexed/problematic URL; it is not a transport
failure. A 401/403 is explicit authentication/permission evidence: stop and
resolve the authorized access path separately, never auto-upgrade the principal.

## Bounded follow-up batch

After the one-URL canary's actual result has been checked, dispatch the same
manual workflow with at most **25** distinct URLs, one per line. Each invocation
also treats its first URL as a canary: any HTTP/transport/parse failure or absent
valid IndexStatus stops all remaining requests. Later 401/403/429 also stops the
remainder. Other later failures are retained per URL; the run remains nonzero.

Only explicit `https://cubxxw.com/` pages are accepted. Subdomains, other domains,
credentials, explicit ports, fragments, malformed inputs and duplicate URLs are
rejected before authentication. Queries are preserved (`/?p=341` remains that
exact inspection target), never guessed into content or stripped as evidence.
The default property is fixed, including for the full-domain service account;
this tool does not inspect `nsddd.top` or child sites under the main-blog scope.

There is at most one retry per OAuth/Inspection request and a 30-second deadline
covering headers and body. At most 2 OAuth attempts plus 50 Inspection attempts
can occur for 25 URLs. Authentication, quota and canary stop conditions normally
reduce this bound. Requests are sequential; no schedule or perpetual monitor is
created. The workflow has `contents: read` and never commits report data.

Equivalent CLI when an already authorized environment has the existing secret:

```bash
node scripts/gsc-inspect.mjs --source-sha <full-40-character-source-sha> \
  --out <new-report-path>

node scripts/gsc-inspect.mjs --source-sha <full-source-sha> \
  --url https://cubxxw.com/engineering/posts/go-release-tools/ \
  --url https://cubxxw.com/projects/UFO/ --out <new-report-path>

node scripts/gsc-inspect.mjs --source-sha <full-source-sha> \
  --urls-env INPUT_URLS --out <new-report-path>
```

An existing `--out` is never overwritten and is checked before token exchange.
Authentication failures still write a diagnostic report with all planned URLs
blocked. Input/IO failures can prevent a report; the workflow's process artifact
retains that failure independently. CLI exit **0** means every planned URL was
observed with a valid IndexStatus; exit **1** means usage/IO/auth/partial/unknown.

## Observation contract

Schema `gsc-inspection/1` records source SHA, fetchedAt, exact fixed property,
request language (`en-US`), first canary URL, bounds, collection status and
per-URL counts/outcomes. Transport success and Google verdict stay separate:

| outcome | meaning |
| --- | --- |
| `inspected` | HTTP 200 with substantive recognized IndexStatus verdict |
| `unknown` | non-200, transport failure, invalid JSON/shape or no valid IndexStatus |
| `blocked` | not requested because OAuth/canary/permission/quota failed |

Per URL, the only retained Google IndexStatus fields are `verdict`,
`coverageState`, `robotsTxtState`, `indexingState`, `pageFetchState`,
`googleCanonical`, `userCanonical`, `lastCrawlTime`. Missing canonical and other
optional fields are **null/unknown**, never replaced with the requested URL.
Error bodies, raw exceptions, tokens and credential material are not retained or
logged. Unrecognized/unspecified verdicts stay unknown rather than becoming
“indexed” from HTTP 200. The report does not request deprecated mobile usability
analysis and does not persist referring URLs or unrelated response fields.

HTTP/HTML, sitemap membership, Google-selected canonical and last crawl must be
read as separate dated evidence. Inspection reads Google's **indexed version**;
it does not test the current live page, prove current HTTP health, request a
recrawl, or establish the content semantics of an old redirect.

## Initial investigation candidates

The live GSC snapshot fetched at `2026-10-12T04:00:28.547Z`, traffic window
`2026-09-11..2026-10-08`, supplies these main-host returned-page observations:

| candidate path | clicks / impressions | investigation basis |
| --- | ---: | --- |
| `/engineering/posts/go-release-tools/` | 0 / 4,186 | default canary, tutorial and old-path migration |
| `/zh/growth/posts/2026-03-thought-notes/` | 6 / 3,328 | valuable monthly archive |
| `/engineering/posts/github-actions-advanced-techniques/` | 0 / 1,215 | high-exposure tutorial |
| `/projects/mem0/` | 4 / 781 | project page |
| `/projects/langgraph/` | 0 / 572 | project and legacy entry |
| `/engineering/posts/hugo-advanced-tutorial/` | 2 / 532 | tutorial |
| `/projects/UFO/` / `/projects/ufo/` | 0 / 211; 0 / 106 | case migration and Google canonical reconciliation |

These are priority **investigation candidates**, not already-proven unindexed
P1s. Add paired LangGraph/NotebookLM legacy entries, canonical destinations and
UFO Chinese case variants within the 25-URL limit after successful canary readback.
Use actual Inspection plus dated HTTP/canonical/sitemap evidence to label each
URL expected exclusion, needs repair or awaiting Google. Do not infer missing
Google index state from low CTR or a page absent from returned Search Analytics.

## Independent acceptance and remaining #393 gates

Run `node --test scripts/gsc-inspect.test.mjs scripts/gsc-fetch.test.mjs`.
For local runs, set `BLOG_TEST_ARTIFACT_DIR` to the task's registered artifact
root; CI uses `RUNNER_TEMP`. Rebuildable fixtures are removed by each test.
Offline verification on 2026-10-12: **80 tests passed**, CLI/test syntax checks
and `git diff --check` passed. The actual workflow shell ran against injected
OAuth/Inspection responses, including correct success, mismatched source SHA,
empty IndexStatus, invalid environment input, and a successful run followed by
a no-clobber collision on the identical report/process paths. The old successful
artifacts remain untouched but cannot mask the current failed step outcome. No real Google request,
workflow dispatch, secret read or settings change was performed.
Tests exercise the actual OAuth JWT scope, fixed Inspection request, field
allowlist, missing canonical, Google-negative verdict, malformed/missing data,
HTTP errors, finite retry/deadline, canary stop, permission/quota stop, URL scope,
25-URL cap, exact output/no-clobber and nonzero authentication evidence. These are
offline transport fixtures, not live Google acceptance.

After independent review, run the default single-URL workflow and retain its
actual result. If authorized Inspection works, run the small follow-up batch and
join each result with current HTTP/canonical/sitemap proof. If it fails, preserve
its exact process/status evidence and keep the Google-read gate open.

The 11-class Page indexing exports, old/new sitemap and Change of Address UI
settings, unresolved WordPress `p=341` semantics and T+14/T+28 observations remain
separate #393 acceptance. The API has no report-wide Page indexing enumeration;
even UI example exports are capped and not guaranteed exhaustive. Nothing here
claims those gates, recrawl, full-domain export or issue completion.

Official sources checked 2026-10-12:

- [Inspection method, property scope, readonly OAuth and indexed-version limitation](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- [IndexStatus fields](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult)
- [Per-site Inspection quota: 2,000/day, 600/minute](https://developers.google.com/webmaster-tools/limits)
- [API resources](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Page indexing example-list limitations](https://support.google.com/webmasters/answer/7440203?hl=en)
