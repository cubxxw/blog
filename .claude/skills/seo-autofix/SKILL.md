---
name: seo-autofix
description: Produce and publish PROPOSAL-ONLY SEO repair candidates from today's daily report (站点日报) evidence using the deterministic gate, and log what was proposed and what was safely skipped back into the same issue's 提案 section. Use when running the daily seo-autofix CI job, or when the user asks to process today's daily report recommendations / 处理今日日报建议.
---

# SEO Autofix — proposal-only candidate triage

Turn the daily report's deterministic evidence into **bounded repair
proposals** and an honest processing log in the same daily issue. This skill is
PROPOSAL-ONLY: it never edits content, never opens branches or PRs, and never
merges anything. **Apply is explicitly unavailable** until an independently
authorized future implementation passes its own gates and repository review
rules.

Hard boundaries (non-negotiable):

- Low CTR alone NEVER proves bad copy and never authorizes a rewrite — copy
  changes require the target page's own real query×page evidence. When the
  evidence is missing, say so and skip; do not generalize.
- Targets resolve ONLY through the trusted page map (one URL, one sourcePath).
  Model or prose suggestions of file paths are never evidence and cannot borrow
  another page's data.
- The numerical/status source of truth is the deterministic report
  (`seo-report/1`) and the gate decision (`seo-autofix-gate/1`). Suggestion
  text is untrusted bounded input; it never replaces metrics or gate reasons.
- No `git write`, `gh pr`, `wget`, `sudo`, `hugo` or content edits in this
  mode. The scheduled workflow has no model step and no write-capable tool.

Inputs (from the invoking prompt; use defaults when absent):

- `MAX_CANDIDATES` — proposal budget. Default **2** (hard maximum 5).

## Step 1 — locate today's issue and the run evidence

- `node scripts/daily-report-issue.mjs --date <frozen YYYY-MM-DD>` prints the
  day's issue number (creating it if absent — if it had to be created, the
  analyzers haven't run yet; write a section saying so and stop).
- Prefer the workflow's own artifacts (`run/report.json`, `run/review.json`,
  `run/page-map.json`, `run/gate.json`). When running locally, generate them
  with `node scripts/seo-pipeline.mjs freeze …` (ONE decision instant shared as
  Hugo clock / report as-of / gate decision-at) and the commands documented in
  `docs/seo-observation-pipeline.md`.

## Step 2 — deterministic gate before any proposal

Run the accepted proposal-only gate (or read the workflow's `run/gate.json`):

```bash
node scripts/seo-autofix-gate.mjs --report run/report.json --review-state run/review.json \
  --page-map run/page-map.json --expected-source-commit <40-hex frozen SHA> \
  --decision-at <UTC> --repository cubxxw/blog --out run/gate.json
```

It enforces, visibly: report freshness re-evaluated at the decision time,
per-kind required evidence (a `meta-description` proposal needs the target's
OWN current certified fresh measurement with the failing audit; a copy-intent
proposal needs the page's real query×page coverage), review rules from ACTUAL
changed-file evidence (backlog ≥ 3 blocks; overlapping open proposal blocks; a
proposal closed without merge within 14 days blocks; merged/unrelated never
block), a finite candidate budget and model-path isolation. Missing evidence is
a safe skip with a reason — never a guess.

## Step 3 — publish the proposal section (always, even on zero picks)

- Compose with trusted code (it keeps raw GSC query strings out of the issue
  and publishes any untrusted summary as a literal block):
  `node scripts/seo-pipeline.mjs compose --kind autofix --gate run/gate.json --run-date <D> --decision-at <UTC> --out /tmp/autofix-section.md`
- Then run exactly:
  `node scripts/report-section-to-issue.mjs autofix /tmp/autofix-section.md --date <frozen D>`
- Do NOT edit the issue with `gh` yourself; the script owns issue writes (one
  daily issue, marker-scoped sections, frozen UTC date). If it exits non-zero,
  report the error plainly.
- The section (heading `### SEO 提案`) lists: mode (proposal-only, apply
  unavailable), review status, candidate proposals (kind, target URL, the
  map-derived source file, bounded summary), safe skips with their exact gate
  reasons, and the budget line. Zero candidates is a valid outcome — never
  invent work to fill the quota.

## What is explicitly NOT in scope

- Applying proposals (content edits/branches/PRs), re-litigating rejected
  targets within 14 days, title changes without the page's own query×page
  evidence, and anything touching `layouts/**`, `assets/**`, `.github/**`,
  `scripts/**`, `config.yml`, `package.json`, `netlify.toml`, `data/seo/**`.
