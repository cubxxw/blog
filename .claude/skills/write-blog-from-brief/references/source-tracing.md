# Source Tracing

Use `source_refs` to build a longitudinal editorial lineage without dereferencing private `brain://` targets.

## Build the exact lineage

Run:

```bash
npm run briefs:trace -- --file _briefs/YYYY-MM-DD-slug.md
```

For each exact ref, inspect the related public briefs, their status, execution receipts, and any recorded article path. Read a related article only when it exists in this repository. Treat the current brief as the start of the lineage when no earlier match exists.

Do not open, infer a local path for, or request the private target behind `brain://`. A ref connects approved public packets; it does not expand the approved material.

## Write the source-trail note

Record:

```text
source_ref
related public briefs and articles
inherited insight that remains useful
current delta, contradiction, or sharper question
decisive public evidence checked now
private or unapproved material that remains unavailable
one or two follow-up questions worth returning upstream
```

Keep three layers separate:

- **Inherited** — an earlier approved claim, observation, or published argument.
- **Current delta** — what this brief adds, narrows, corrects, or challenges.
- **Open trail** — a question that deserves later evidence or a new approved brief.

## Let lineage change the article

Use the trail to:

- avoid publishing the same claim with new packaging;
- identify a real reversal, accumulation, or unresolved contradiction;
- refresh unstable public evidence instead of inheriting old citations;
- choose internal links by argumentative lineage;
- narrow or stop the article when the current delta is too small.

Do not force every related source into the draft. The article should include only the lineage that changes its movement.

## Preserve the trail

In the brief receipt, record exact refs, related published articles, the current delta, and follow-up questions. Keep follow-up questions as proposals for upstream `brain`; do not create new briefs or import private source material from the blog repository.
