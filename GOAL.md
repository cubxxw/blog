# Goal: Keep the Hugo blog buildable and locally operable

This repo is a bilingual Hugo blog with generated search data and a Netlify function that depends on that data. The immediate operational problem is local build reliability: `make envbuild` works, but `make build` and `make build-preview` fail on this machine because the managed `_output/tools/hugo` binary crashes. The first goal is to restore a trustworthy local workflow and keep the generated search index in sync while doing it.

## Fitness Function

```bash
node scripts/score-site-build-health.mjs
node scripts/score-site-build-health.mjs --json
```

### Metric Definition

```
score = hugo_resolution + envbuild + build + build_preview + index_freshness
```

| Component | What it measures |
|-----------|------------------|
| **hugo_resolution** | A working `hugo` binary is discoverable and returns a version successfully |
| **envbuild** | `make envbuild` completes successfully |
| **build** | `make build` completes successfully |
| **build_preview** | `make build-preview` completes successfully |
| **index_freshness** | Generated content-index artifacts match the current markdown corpus |

### Metric Mutability

- [x] **Locked** — Agent cannot modify the scoring code

## Operating Mode

- [x] **Converge** — Stop when criteria met

### Stopping Conditions

Stop and report when ANY of:
- `score >= 95`
- `build`, `build_preview`, and `envbuild` all pass
- 8 iterations completed
- Hugo or Node becomes unavailable in the local environment

## Bootstrap

1. `git submodule update --init --recursive --depth 1`
2. `node scripts/generate-content-index.mjs`
3. `node scripts/score-site-build-health.mjs`
4. Record the baseline: Starting score: `45/100`

## Improvement Loop

```text
repeat:
  0. Read iterations.jsonl if it exists and avoid repeating failed experiments
  1. node scripts/score-site-build-health.mjs --json > /tmp/before.json
  2. Read the failing components
  3. Pick the highest-impact action from the Action Catalog
  4. Make one atomic change
  5. Run the narrowest verification that proves the change
  6. node scripts/score-site-build-health.mjs --json > /tmp/after.json
  7. Compare: if score improved and no previously passing component regressed, keep the change
  8. If score regressed or stayed flat, revert the change
  9. Append one line to iterations.jsonl with before/after, action, result, and note
  10. Continue
``` 

Commit messages: `[S:NN->NN] build: what changed`

## Iteration Log

File: `iterations.jsonl` (append-only, one JSON object per line)

```jsonl
{"iteration":1,"before":45,"after":75,"action":"Prefer working system hugo over crashing managed binary","result":"kept","note":"make build recovered without breaking generated search artifacts"}
```

## Action Catalog

### Build Command Reliability (target: 75/75)

| Action | Impact | How |
|--------|--------|-----|
| Prefer a working system `hugo` for local targets | +30-55 pts | Resolve `hugo` from PATH before falling back to `_output/tools/hugo`, then reuse that binary in `build`, `build-preview`, `run`, and related targets |
| Make `tools.verify.hugo` validate the chosen binary | +10 pts | Skip reinstalling when a valid system `hugo` exists; install only when no working binary is available |
| Align all Hugo-invoking targets on one resolver | +5-10 pts | Replace hard-coded `$(TOOLS_DIR)/hugo` and bare `hugo` calls in local build targets with the same resolved binary |

### Generated Search Index (target: 15/15)

| Action | Impact | How |
|--------|--------|-----|
| Keep tracked index outputs deterministic | +15 pts | Run the generator, compare both tracked JSON files while ignoring `generatedAt`, and fix generator/output mismatches without hand-editing generated files |
| Add missing workflow coverage only if a target bypasses generation | +5 pts | If a new local command writes `public/` or serves content, make it depend on `content-index` first |

### Command Hygiene (target: 10/10)

| Action | Impact | How |
|--------|--------|-----|
| Preserve fast failure with actionable output | +5 pts | Ensure the chosen Hugo path fails clearly when neither system nor managed Hugo is usable |
| Keep local and Netlify workflows coherent | +5 pts | Avoid changes that fix one build mode while silently breaking the other; verify both local make targets and the generated index path assumptions still hold |

## Constraints

1. **Do not edit `themes/PaperMod` directly** — repo guidance says theme changes should go through overrides unless unavoidable.
2. **Do not hand-edit generated index JSON** — the source of truth is markdown content plus `scripts/generate-content-index.mjs`.
3. **Do not weaken the fitness function by removing build checks** — the goal is to restore reliability, not hide failures.
4. **Keep Netlify function behavior intact** — build-flow fixes must not change `netlify/functions/blog-ai.js` inputs or generated file paths.

## File Map

| File | Role | Editable? |
|------|------|-----------|
| `GOAL.md` | Optimization contract for future agent runs | Yes |
| `scripts/score-site-build-health.mjs` | Fitness function | No |
| `Makefile` | Local workflow orchestration | Yes |
| `scripts/generate-content-index.mjs` | Search-index generator | Yes |
| `netlify/functions/_generated/content-index.json` | Generated search index artifact | Written by script only |
| `static/data/content-index.json` | Generated search index artifact used by the site | Written by script only |
| `netlify/functions/blog-ai.js` | Consumer of generated index | Yes |
| `netlify.toml` | Netlify build/runtime configuration | Yes |

## When to Stop

```
Starting score: NN
Ending score:   NN
Iterations:     N
Changes made:   (list)
Remaining gaps: (list)
Next actions:   (what a future agent should do next)
```
