# Editorial Review

Review in two stages. Developmental editing comes before correctness polish. Do not use a percentage score.

## Stage 1: Should this article exist in this shape?

### Publication hard fails

Any of these blocks publication:

- invented author experience, dialogue, motive, metric, chronology, or result;
- unapproved private or identifiable third-party material;
- an author judgment that the author did not confirm;
- a decisive factual claim that is false, unsupported, or misrepresented;
- a citation that does not support the adjacent claim;
- a title or opening promise the body does not repay;
- broken route, media, or required production behavior.

### Developmental tests

Answer with evidence from the article:

1. **Necessity** — what specific value disappears if this is not published?
2. **Reader contract** — what is the reader doing before reading, and what can they do or see afterward?
3. **Only this author** — which scene, decision, artifact, failure, or judgment makes substitution impossible?
4. **Movement** — where does the question, evidence, or judgment materially change?
5. **Compression** — what 30% should be cut first? If nothing can be cut, identify why every part is necessary.
6. **Memory** — what single scene, object, contradiction, or sentence is likely to survive a day later?
7. **Ending consequence** — does the ending change a decision, experiment, cost, or open question rather than restate the opening?

Apply mode-specific expectations:

- `thinking`: protect tension, personal material, discovery, and consequence. Do not demand comprehensive coverage.
- `research`: optimize correctness, task completion, comparison, and findability.
- `field-note`: optimize specificity, timeliness, and honest incompleteness.

### Developmental verdict

- `KEEP` — the shape works; continue to accuracy and line editing.
- `REBUILD` — the core is worth keeping, but sections need major cuts, movement, or reordering.
- `KILL` — the article has no sufficient necessity or author contribution, duplicates a better piece, or would require inventing material to become alive.

## Stage 2: Can this version publish safely?

After a `KEEP` verdict, check:

- fact, source opinion, author observation, and article inference remain distinct;
- current facts, dates, versions, samples, and jurisdictions are accurate;
- citations are adjacent and fit the claim;
- each surviving case has one clear argumentative job, sufficient support, an explicit limit, and a visible return to the central claim;
- privacy and third-party boundaries hold;
- front-matter fields are not removed until their rendering, schema, search, and automation consumers are checked;
- Markdown, front matter, links, reference list, and media are valid;
- language is readable without sanding away uncertainty or voice.

AI-flavor lint is supporting evidence only. Passing it does not improve the editorial verdict.

## Output

```text
Verdict: KEEP | REBUILD | KILL
Hard fail: none | description

Why this should exist:
Reader contract:
Only-the-author evidence:
Where the article moves:
Where a reader may stop:

Cut first:
1. file:line — delete/combine/move — what remains
2. ...

Fact/privacy issues:
- file:line — issue — required correction

Preserve:
- strongest scene, uncertainty, or sentence

Remaining human decision:
- ...
```

Do not reward length, citation count, FAQ count, abstract vocabulary, symmetrical frameworks, or rubric compliance itself.
