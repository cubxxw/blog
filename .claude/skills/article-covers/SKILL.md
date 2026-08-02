---
name: article-covers
description: Design, generate, and inspect a distinctive cover for a finished blog article. Use when creating or replacing article covers, backfilling missing covers, or changing art direction. Compare genuinely different visual directions before generation, preserve technical safety, and keep the site coherent without forcing every article into one identical illustration style.
---

# Article Covers

A cover is editorial interpretation and a share card. Consistency should come from craft and recognizability, not identical palette, medium, and composition.

## Tool

Use `scripts/generate-covers.mjs`:

```bash
npm run covers
node --env-file-if-exists=.env scripts/generate-covers.mjs --write \
  --file <article> --scene "<approved art direction and concrete scene>" --variants 2
```

The default is dry-run. `--scene` is strongly preferred. Keys remain in the gitignored `.env`; never print or copy them.

## 1. Read the finished article

Use the body, not only title and description. Identify:

- the article's emotional or explanatory center;
- one real object, artifact, place, or action;
- what recent site covers already overuse;
- whether a real screenshot, photo, scan, diagram, or product artifact would be more truthful than generated metaphor.

If a real artifact tells the story better, use it with permission instead of generating an illustration.

## 2. Compare three art directions

Before generating, propose three materially different directions:

1. **Documentary/artifact** — real interface, notebook, object, screenshot, photo, or scan.
2. **Explanatory/diagrammatic** — spatial relationship, process, contrast, or annotated object without embedded text.
3. **Metaphorical/editorial** — a concrete scene that carries the central tension.

Each direction should state:

```text
subject / medium / composition / light or color logic / what makes it distinct
```

Choose one direction before generating variants. Variants are for execution quality, not for pretending one idea is three ideas.

Use approved public visual references when available. Do not load private upstream taste notes without permission.

## 3. Write the scene

Describe a paintable scene in one to three sentences. Include medium and composition when they matter. Avoid abstract jargon and objects that inevitably render text.

Keep these safety constraints:

- no embedded words, letters, numbers, logos, or watermarks;
- no malformed or decorative human faces;
- no generic circuit, glowing-brain, robot, node-network, or cyber-tunnel imagery;
- the subject must remain legible as a small thumbnail.

Do not include hex codes or palette labels that may be painted literally.

## 4. Generate and inspect

Generate two or three candidates from the selected direction. Open every image and reject:

- accidental text or marks;
- anatomy or object errors;
- generic stock-AI composition;
- a metaphor unrelated to the finished article;
- near-duplication of recent covers;
- poor thumbnail hierarchy.

Pick the best asset, remove unused variants, and confirm `cover.image` and `alt`.

Use one image for the Chinese and English versions of the same article. The script reuses the same section/slug asset.

## Technical invariants

- Keep `watermark: false`.
- Keep title/description/tags out of the painting prompt when `--scene` is supplied.
- Keep front-matter rewriting surgical and idempotent.
- Run `npm run covers:test` after changing prompt construction or front-matter helpers.
- The output path remains `static/images/covers/<section>/<year>/<slug>.<ext>`.

The fallback without `--scene` is for low-risk bulk backfill only. A widely shared article requires an inspected art direction and image.
