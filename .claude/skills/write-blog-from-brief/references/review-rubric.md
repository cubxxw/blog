# Article Review Rubric

Score the Chinese article independently from the drafting process. Cite lines or exact passages for every deduction.

## Hard fails

Any hard fail blocks publication regardless of score:

- invented author experience, dialogue, motive, metric, or result;
- unapproved private or identifiable third-party material;
- core claim differs from the brief without author confirmation;
- decisive factual claim lacks support or misrepresents its source;
- citation does not support the adjacent claim;
- fact, author observation, and inference are presented as the same thing;
- E-level AI-flavor error remains;
- broken production build, article route, cover, or required link.

## Score

| Dimension | Points | Full-score standard |
|---|---:|---|
| Claim and argument | 20 | One clear claim, complete reasoning, no hidden premise or logical jump |
| Author contribution and presence | 20 | Specific lived material changes the article; another author could not substitute |
| Evidence and citations | 20 | Strong sources, precise attribution, current facts checked, citation fit is exact |
| Counterargument and boundary | 10 | Strongest alternative is treated fairly; cost, limit, and falsifier are visible |
| Durable value and original synthesis | 10 | Goes beyond news or summary; produces a reusable way to see or decide |
| Search, SEO/GEO, and internal links | 10 | Search promise is accurate; metadata, extractability, and links help without distortion |
| Structure, language, and voice | 10 | Natural Xinwei voice, concise structure, no templated polish or repeated conclusion |

Passing threshold: 90/100 and no hard fail.

## Review output

```text
Verdict: PASS | REVISE | BLOCK
Hard fail: none | description
Score: N/100

Dimension scores:
- Claim and argument: N/20 — evidence
- Author contribution and presence: N/20 — evidence
- Evidence and citations: N/20 — evidence
- Counterargument and boundary: N/10 — evidence
- Durable value and synthesis: N/10 — evidence
- Search/SEO/GEO/internal links: N/10 — evidence
- Structure/language/voice: N/10 — evidence

Required revisions:
1. file:line — problem — why it matters — revision direction

Optional improvements:
- ...

What should not be changed:
- strongest authorial passage or important uncertainty to preserve
```

Do not reward length, source count, FAQ count, or abstract vocabulary. Penalize unsupported certainty, generic completeness, repeated thesis statements, decorative citations, false binaries, symmetrical list-making, and conclusions that merely restate the introduction.

For the opening, also run `../../craft-article-opening/SKILL.md`'s 30-point test. An opening below 26/30 prevents an overall pass even when the article total reaches 90.
