# Goal: Keep blog content search integrity at 100

This repo already has a good Hugo structure, bilingual AI project content, and a generated search corpus. The main failure mode was operational drift: content could change without refreshing the generated search index in the common authoring/build targets. The goal is to keep the searchable corpus current, keep the bilingual AI-project set mirrored, and prevent junk files from leaking into `content/`.

## Fitness Function

```bash
node scripts/score-content-search-integrity.mjs --json
```

### Metric Definition

```
score = index_freshness + workflow_coverage + ai_project_parity + content_hygiene
```

| Component | What it measures |
|-----------|------------------|
| **index_freshness** | Whether `netlify/functions/_generated/content-index.json` and `static/data/content-index.json` match the current content corpus, ignoring `generatedAt` timestamp drift |
| **workflow_coverage** | Whether the main authoring/build targets in `Makefile` refresh the search index before running |
| **ai_project_parity** | Whether `content/en/posts/ai-projects/` and `content/zh/posts/ai-projects/` have matching markdown slugs |
| **content_hygiene** | Whether Finder/Explorer junk files are absent from `content/` |

### Metric Mutability

- [x] **Locked** — Agent cannot modify the scoring script or the indexing logic used by the scorer

## Operating Mode

- [x] **Converge** — Stop when criteria met

### Stopping Conditions

Stop and report when ANY of:
- `score >= 100`
- 5 consecutive iterations produce no score improvement
- 15 iterations completed
- `node` or Hugo/module bootstrap becomes unavailable

## Bootstrap

1. `make module-init`
2. `node scripts/generate-content-index.mjs`
3. `node scripts/score-content-search-integrity.mjs --json`
4. Record the baseline: Starting score: 100

## Improvement Loop

```
repeat:
  0. Read iterations.jsonl if it exists — note what drift was already fixed
  1. node scripts/score-content-search-integrity.mjs --json > /tmp/before.json
  2. Read total score and component breakdowns
  3. Pick the lowest-scoring component from the Action Catalog
  4. Make the change
  5. If verifiable: run the narrowest relevant check
  6. node scripts/score-content-search-integrity.mjs --json > /tmp/after.json
  7. Compare: if improved without regression, keep the change
  8. If unchanged or regressed, revert
  9. Append to iterations.jsonl: before/after scores, action taken, result, one-sentence note
  10. Continue
```

Commit messages: `[S:NN→NN] search-integrity: what changed`

## Iteration Log

File: `iterations.jsonl` (append-only, one JSON object per line)

```jsonl
{"iteration":1,"before":65,"after":100,"action":"Add a reusable content-index Make target, wire it into core Hugo workflows, and remove Finder junk","result":"kept","note":"Search corpus refresh is now enforced in the main workflows and content hygiene is clean."}
```

## Action Catalog

### Index Freshness (target: 40/40)

| Action | Impact | How |
|--------|--------|-----|
| Regenerate stale index files | +20-40 pts | Run `node scripts/generate-content-index.mjs`, then rerun the scorer to confirm both generated JSON files match current content |
| Fix content parsing drift | +5-20 pts | If the scorer says the index is stale immediately after regeneration, inspect recent content changes and update the authoring content so the generator can parse it consistently |

### Workflow Coverage (target: 30/30)

| Action | Impact | How |
|--------|--------|-----|
| Wire `content-index` into a missing Make target | +5 pts per target | Add `content-index` as a prerequisite for the missing target, then rerun the scorer to confirm coverage |
| Refresh authoring commands after content creation | Prevent regressions | For targets that create content, invoke `$(MAKE) content-index` after file creation so generated search data stays current |

### AI Project Parity (target: 15/15)

| Action | Impact | How |
|--------|--------|-----|
| Add missing bilingual AI project post | +3 pts per mismatch | Mirror the missing `.md` slug into the other language under `content/*/posts/ai-projects/`, then regenerate the index |
| Remove accidental one-sided AI project stub | +3 pts per mismatch | Delete or finish the unmatched draft file so both language trees expose the same AI-project slugs |

### Content Hygiene (target: 15/15)

| Action | Impact | How |
|--------|--------|-----|
| Remove Finder/Explorer junk files | +5 pts per file | Delete `.DS_Store` or `Thumbs.db` under `content/`, then rerun the scorer |
| Prevent reintroduction during content moves | Prevent regressions | When reorganizing content directories, check `find content -name '.DS_Store' -o -name 'Thumbs.db'` before keeping changes |

## Constraints

1. **Do not modify `scripts/score-content-search-integrity.mjs`** — the fitness function must stay locked.
2. **Do not modify `scripts/generate-content-index.mjs` to game freshness scoring** — it defines the corpus used by production search and the Netlify function.
3. **Do not edit generated JSON files by hand** — refresh them only through `node scripts/generate-content-index.mjs`.
4. **Do not edit `themes/PaperMod` directly for this goal** — search integrity and content parity should be handled in the repo’s own files.

## File Map

| File | Role | Editable? |
|------|------|-----------|
| `GOAL.md` | Goal specification for future agents | Yes |
| `iterations.jsonl` | Append-only history of scoring iterations | Yes |
| `Makefile` | Workflow entrypoints that should refresh the search index | Yes |
| `content/en/posts/ai-projects/*.md` | English AI project content used by parity checks | Yes |
| `content/zh/posts/ai-projects/*.md` | Chinese AI project content used by parity checks | Yes |
| `content/**/.DS_Store` | Junk files to remove if present | Yes |
| `netlify/functions/_generated/content-index.json` | Generated search corpus for Netlify function | Written by `node scripts/generate-content-index.mjs` only |
| `static/data/content-index.json` | Generated search corpus for client-side search | Written by `node scripts/generate-content-index.mjs` only |
| `scripts/score-content-search-integrity.mjs` | Locked fitness function | No |
| `scripts/generate-content-index.mjs` | Locked indexing logic used by the scorer | No |

## When to Stop

```
Starting score: 100
Ending score:   100
Iterations:     0
Changes made:   (list)
Remaining gaps: (list)
Next actions:   (what a human or future agent should do next)
```
