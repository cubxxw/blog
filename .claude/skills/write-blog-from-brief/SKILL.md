---
name: write-blog-from-brief
description: Process a ready topic in `_briefs/` into a researched, cited, authorial, bilingual-ready Hugo article. Use when asked to scan or execute the blog topic queue, write an article from an upstream brain brief, research and write a blog post, or take a post through independent review, AI-flavor cleanup, SEO/GEO, internal linking, cover generation, scoring, and pre-publication validation.
---

# Write Blog from Brief

Produce one `ready-to-publish` article from one upstream brief. Preserve the upstream claim and author material; let the blog repository own public research, native writing, presentation, and verification.

Announce use of this skill before acting. Never process more than one brief per invocation.

## Read in order

1. `AGENTS.md`
2. `_briefs/README.md`
3. `docs/blog-editorial-workflow.md`
4. The selected brief
5. `config/tags-mapping.json`
6. `references/research-protocol.md` before web research
7. `references/review-rubric.md` before review
8. `../craft-article-opening/SKILL.md` before drafting the first screen
9. `../article-covers/SKILL.md` only after the article and title stabilize

Treat the brief as the editorial contract. Treat `brain://` references as traceability identifiers, not permission to read private upstream files. Use only the brief's approved material bundle unless the user explicitly authorizes more.

## State model

Follow:

```text
ready → claimed → drafting → review → ready-to-publish
```

Use `blocked` when author confirmation, public-safe material, privacy boundaries, or decisive evidence is missing. Do not manufacture continuity to avoid blocking.

Do not mark `published`, commit, push, merge, or deploy unless the user separately authorizes publication.

## 1. Select and claim

Run:

```bash
npm run briefs:next
npm run briefs:check
```

Confirm that no other task or worktree is already editing the corresponding article. Search existing Chinese and English content for the same claim, slug, and search intent.

If a better existing article should be updated, report that decision instead of creating a duplicate.

Change the selected brief to `claimed` before drafting. Preserve all upstream content.

When invoked by `briefs:dispatch`, the prompt names one specific brief and the dispatcher has already changed it to `claimed`. In that mode:

- process only the named brief;
- do not run `briefs:next`;
- do not read or choose another queued brief;
- do not access the brain repository or resolve `brain://` references;
- treat the clean process boundary as part of the privacy contract.

## 2. Build the editorial contract

Extract into working notes:

- one question;
- one confirmed claim;
- the author's unique contribution;
- approved facts, memories, observations, and hypotheses;
- strongest counterclaim;
- scope and falsifier;
- privacy restrictions;
- unresolved gaps.

Stop as `blocked` if the claim or author contribution exists only as AI interpretation and has not been confirmed in the brief.

## 3. Research before outlining

Perform two separate searches using `references/research-protocol.md`:

1. **Epistemic research** — verify facts, find primary evidence, locate the strongest counterargument, and test the claim's boundary.
2. **Search-intent research** — inspect how readers phrase the question, what current results answer, what they omit, and which internal pages should connect.

For current, technical, product, legal, financial, medical, statistical, or otherwise unstable claims, web verification is mandatory. Prefer official documentation, original research, standards, repositories, first-party reports, and direct data.

Do not collect links for decoration. Record for each useful source:

```text
source → supported or challenged claim → what it proves → what it cannot prove → checked date
```

Update the brief to `drafting` after the material is sufficient.

## 4. Design the argument

Create an argument map before prose:

```text
concrete opening
  → central tension
  → previous assumption
  → evidence or experience that changes it
  → confirmed claim
  → strongest counterargument
  → cost and boundary
  → consequence for real action
```

Every planned section must advance one step and name its evidence. Delete sections that exist only to make the article look comprehensive.

Choose the correct section: `ai-agent`, `engineering`, `growth`, or `projects`. Create only the Chinese article first. Work on a branch and treat every file under `content/` as publishable; do not create placeholders there.

## 5. Write in three passes

Read and apply `../craft-article-opening/SKILL.md`. Build the first screen from approved concrete material; its opening tension and index line must point to the confirmed claim.

1. **Argument pass** — make reasoning, evidence, counterargument, and limits complete.
2. **Presence pass** — restore scenes, actions, choices, costs, uncertainty, and the author's actual change of mind.
3. **Reading pass** — improve rhythm, headings, transitions, and compression.

Place citations next to the claims they support. Distinguish source fact, source opinion, author observation, and article inference. Never fabricate quotations, experience, motives, metrics, or results.

End every researched article with a final second-level reference section:

```markdown
## 参考资料

- [Descriptive source title](https://example.com) — publisher or institution
```

Use `## References` for English. Include every public source cited in the article exactly once, prefer the primary source, and keep the title descriptive enough to identify it. The end list complements inline citations; it does not replace claim-adjacent attribution. Do not list sources that the article never uses.

Delete generic paragraphs that would survive unchanged under another author's name.

## 6. Run independent review

Move the brief to `review`.

When reviewer agents are available, spawn two read-only reviewers in parallel:

- **logic-evidence reviewer**: receive the raw brief, article path, source list, and `references/review-rubric.md`; inspect factual support, inference, counterarguments, privacy, and citation fit.
- **voice-editorial reviewer**: receive the raw brief, article path, repository voice constraints, and `references/review-rubric.md`; inspect authorial presence, AI phrasing, repetition, structure, and over-polished certainty.

Do not give reviewers the intended score or suspected defects. They must not edit files. Require line-specific findings, hard-fail status, dimension scores, and revision advice.

If independent agents are unavailable, run the two reviews in separate passes and record that independence was reduced.

Reconcile findings yourself. Do not blindly implement contradictory advice; protect the confirmed claim and approved author material.

## 7. Optimize after editorial stability

Only after logic and voice review:

- finalize title and pure-text description;
- add `tldr` only from claims already demonstrated;
- add FAQ only for real search questions the article actually answers;
- apply Answer-First only to explanatory or how-to content;
- add relevant internal links by argumentative role;
- select 5–8 canonical tags;
- keep `keywords: []` unless precise supplementation is justified;
- use an already-reached Shanghai `+08:00` timestamp.

Run the GEO audit as advisory evidence, not as an instruction to reshape every essay:

```bash
npm run geo:audit
```

## 8. Generate and inspect the cover

Read and follow `../article-covers/SKILL.md`.

Design a concrete visual metaphor from the finished article, generate 2–3 candidates, inspect the image assets directly, and reject text, logos, malformed people, generic AI imagery, and compositions that fail as thumbnails. A page screenshot is not required for a standard article. Reuse the chosen cover for the later English counterpart.

## 9. Score and revise

Use `references/review-rubric.md`. A passing article requires:

- total score at least 90/100;
- no hard fail;
- every deduction linked to evidence;
- one focused revision pass for failed dimensions;
- a fresh score after revision.

Do not inflate the article merely to increase a score.

## 10. Run deterministic gates

For a standard article that uses existing Markdown, front matter, routes, and cover conventions, optimize for document correctness. Run:

```bash
node scripts/check-ai-flavor.mjs <article...> --check
npm run frontmatter:check
npm run tags:check
git diff --check
```

The explicit article-path form checks only the named files and `--check` fails on E-level errors. The detector analyzes Chinese content; passing an English counterpart is harmless but does not lint English prose. Use `npm run flavor:check` instead when the intended scope is every staged, unstaged, and untracked Chinese article changed from `HEAD`. Do not use `npm run flavor:scan` for this gate because it scans the full Chinese corpus without check mode.

Inspect the changed article files directly and confirm:

- the path, front matter, Shanghai timestamp, description, and canonical tags are correct;
- headings and Markdown structure are valid;
- factual external claims have adjacent citations;
- the final `## 参考资料` or `## References` section exists and accounts for every cited public source without decorative entries;
- internal links and referenced cover/media paths are plausible and the files exist;
- bilingual articles preserve the same claim, source support, and cover.

Do not run `npm test`, take page screenshots, start `netlify dev`, or run a full local Hugo production build for an ordinary article by default. CI/CD owns the full build, full E2E suite, and cross-site visual regression.

Escalate local validation only when risk warrants it:

- raw HTML, shortcodes, generated markup, a new content type or route, or unusual media: run the relevant Hugo build or page preview;
- template, CSS, JavaScript, configuration, or shared rendering changes: run targeted tests and inspect the affected rendering;
- cover tooling changes: run `npm run covers:test`;
- content-index behavior changes or a consumer explicitly needs a refreshed local index: run `node scripts/generate-content-index.mjs`;
- CI is unavailable, the user requests deeper local testing, or CI reports a failure: reproduce only the affected check locally.

Screenshots are optional evidence for a meaningful visual comparison, not a publication gate. Before merging, wait for required CI checks and let CI/CD supply the full-site confidence.

If a required document check fails, keep the brief in `review` or mark it `blocked`. If CI fails, determine whether the failure belongs to the article before changing unrelated code or snapshots.

## 11. Handoff

When all gates pass:

- set the brief to `ready-to-publish`;
- fill `article`, score breakdown, source/check summary, and unresolved caveats in its execution receipt;
- leave the branch unmerged until the author explicitly signs off;
- report the files changed, research performed, review findings resolved, score, local document checks, CI status, and remaining human decisions.

Do not translate until the Chinese article is approved. After approval, create an idiomatic English rewrite, verify the same claims and citations, reuse the cover, and rerun the relevant gates.
