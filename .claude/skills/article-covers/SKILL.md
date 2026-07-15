---
name: article-covers
description: Generate AI cover images for blog posts that lack one, using Doubao Seedream or Gemini. Use when the user asks to create/generate/add a cover or 封面 for an article, backfill covers for posts missing them, check which posts have no cover, or adjust the cover art direction. Also use right after writing a new post, to give it a cover before it ships.
---

# Article Covers

Generates a cover image for a post from its own front matter, writes the file into
`static/images/covers/`, and points `cover.image` at it.

Covers matter beyond decoration: `layouts/partials/templates/opengraph.html` only emits a
per-post `og:image` when `cover.image` exists. A post without one falls back to the site-wide
default image, so every share of it — WeChat, X, RedNote — looks identical to every other post.

## The tool

`scripts/generate-covers.mjs`, backed by `scripts/lib/cover-providers.mjs`.

```bash
npm run covers                          # dry-run: list targets + prompts, costs nothing
npm run covers:write -- --limit 3       # generate 3, write images + front matter
node --env-file-if-exists=.env scripts/generate-covers.mjs --write \
  --file content/zh/growth/posts/x.md \
  --scene "清晨的长桌上，几条细流汇入一只敞开的木匣……"      # two-stage: preferred
node scripts/generate-covers.mjs --write --provider gemini --limit 1
node scripts/generate-covers.mjs --write --file <path> --force --variants 3   # 3 candidates
```

Flags: `--write` (without it nothing is generated — dry-run is the default), `--provider
doubao|gemini`, `--file <path>`, `--limit <n>`, `--force`, `--scene "<一到两句具体画面>"`
(requires `--file`), `--variants <1-4>` (extra candidates land as `<slug>.v2.jpeg`…),
`--seed <n>` (doubao only — pins noise for A/B-ing prompt changes).

## Credentials

Keys live in `.env` at the repo root, which is gitignored and untracked — the same place
`BAIDU_PUSH_TOKEN` and `INDEXNOW_KEY` live. The npm scripts load it via Node's native
`--env-file-if-exists=.env` (no dotenv dependency; `-if-exists` so CI, where the value comes
from the real environment, doesn't hard-fail).

Running the script with bare `node` will *not* see `.env` — use `npm run covers…`, or pass
`--env-file-if-exists=.env` yourself.

Never print a key, never copy one into another file, and never commit one. `.env` staying
untracked is a precondition for this whole workflow; check with `git check-ignore .env`
before touching anything in that area.

## Workflow

The pipeline is two-stage on purpose. The image model is good at *painting a described
scene* and poor at *inventing a metaphor* — asked to "read the article and draw something
fitting", it regresses to its priors (circuits, glowing nodes, blue gradients). So the
reading happens upstream, in the model that is actually good at reading: **you**.

1. `npm run covers` — dry-run; confirm the target list. With `--file` it also prints the
   stage-1 scene prompt for that post.
2. **Stage 1 — you design the scene.** Answer the scene prompt yourself: read the title and
   description, produce one-to-two sentences describing a concrete, paintable picture —
   objects and composition, no abstractions, none of the blacklisted clichés. Example that
   worked: 「清晨的书房里，几条细流从不同的窗口淌到一张长木桌上，汇进一只敞开的木匣；
   匣子另一侧，沉淀出的卵石被码成一条向右延伸的小径，尽头停着一只蓄势待发的纸飞机。」
   (an intelligence pipeline: collection → distillation → action).
3. Confirm `ARK_API_KEY` (doubao, default) or `GEMINI_API_KEY` is in `.env`.
4. **Stage 2 — generate**, ideally 2–3 candidates: same-prompt variance dwarfs
   prompt-tweak gains, and candidates are cheap.
   `node --env-file-if-exists=.env scripts/generate-covers.mjs --write --file <path> --scene "<你的画面>" --variants 2`
5. **Look at the images.** Open them. Generated art fails in ways an exit code cannot see:
   text smuggled in, a warped human face, a composition that fights the page. Three
   exit-0 runs in this project's history produced garbage that only eyes caught. Pick the
   best candidate (rename it to `<slug>.jpeg` if it isn't the primary), delete the rest.
6. Only then scale up. For a backfill batch, loop steps 2–5 per article — the scene step
   does not batch; that is the point of it.

Without `--scene` the script falls back to sending title+description straight to the image
model. Acceptable for bulk work, but expect cliché drift — never use the fallback for a
post that will be shared widely.

**After translating a post** (zh→en or the reverse): re-run
`node scripts/generate-covers.mjs --write --file <新语言版本路径>`. The image already on
disk is reused for free (same section/slug → same file); only the front matter is written.
Skipping this leaves the translation with no cover and the site-default og:image.

Cost is ~0.20 CNY per image on Seedream, and failures are not billed. That is cheap enough
that regenerating a bad cover is always better than shipping it.

## Rules that are not negotiable

**Two failure classes shaped the prompt; both were paid for in real bad images.**

1. *Anything concrete in the image prompt gets drawn literally.* Listing
   `Themes: AI, MCP, Agent, RSS` produced the labels painted on the cover, misspelled
   (*"AI Inteligenct"*, *"Agetic"*, *"monitzring"*). Spelling out the site palette by hex
   code produced a literal swatch chart with the codes written on it. Each time the script
   reported `✓`, exit code 0, unit tests green — only looking at the image caught it.
2. *Anything conceptual left to the image model regresses to its priors.* "读懂文章画个
   贴合的画面" with no scene produced a glowing dark-cyan tunnel that had nothing to do
   with the article.

The two-stage split answers both at once: the reading model (you) turns metadata into one
concrete scene; the painting model receives **only the scene** — with `--scene`, no
metadata reaches the image model at all, so jargon cannot leak onto the canvas. In the
fallback path, only title+description pass through (never tags/keywords — densest drawable
jargon, zero added comprehension), scoped by 「以上信息只用于理解主题」 and the canvas rule
stated in Chinese beside the Chinese context.

`scripts/generate-covers.test.mjs` pins all of this. If you rewrite the prompt, keep the
positive canvas definition (「画面为纯图形与图像构成」) ahead of the negative list, and
keep tags out of the image prompt — dropping either re-opens a known failure.

**The style anchor is fixed and identical for every cover** — see `STYLE_LINE` in
`scripts/generate-covers.mjs`: 扁平杂志编辑插画 + 低饱和不超过四种颜色 + 大面积留白纸纹 +
横构图主体偏下上方留白. It names a medium, a colour *budget*, and a composition — never a
colour, never a hex code, never digits ("16:9" is digits too; the ratio lives in the API
`size` param). Consistency across the set comes from this one line, not from per-section
palettes — a per-section `STYLES` table existed once and its cyber-blue entry is what caused
failure class 2.

**Audience targeting is per-section, and it lives in material, not colour.** A cover is a
share card: it should signal to its own audience what kind of content sits behind the link —
a tech essay whose cover reads as a lifestyle vignette loses exactly the reader it was
written for (and the share-card click-through with it). The `SECTIONS` map in
`scripts/generate-covers.mjs` gives each section an audience line + material vocabulary for
stage 1 (tech → 仪器/工作台/图纸/传送分拣机构; growth → 自然与日常; projects → 单一主体的
产品海报式静物) and one temperament clause for stage 2 (理性精确 / 安静温和 / 利落聚焦).
When you design a scene in stage 1, draw its objects from that section's material world.
This is the sanctioned way to differentiate sections — colours are still never named.

**One image per article, shared by zh and en.** Same slug, same section, same meaning →
same file. The script caches by `section/slug` within a run and reuses images already on
disk, so a zh/en pair costs one generation, not two. Never give the two language versions
unrelated art.

**`watermark: false` stays pinned.** The Ark API happens to default to false, but a
watermarked cover is dead on arrival. It's declared explicitly in `cover-providers.mjs`
rather than left to a default that could change.

**No people, no logos, no text in the image.** Faces and brand marks are where generators
produce their most embarrassing output. Text baked into a raster can't be translated,
selected, or read by a screen reader — and this site ships every post in two languages. The
title already sits above the cover in the page template; the image only carries meaning.

## How it decides what to generate

Targets are posts under `content/{zh,en}/{ai-agent,engineering,growth,projects}/` that:
have a `title`, are not `draft: true`, are not `_index`/`index`, and have no `cover.image`
(unless `--force`).

The body is never read — front matter is the whole semantic input for stage 1, so **a good
`description` is what yields a good scene, and a good scene is what yields a good cover**.
A post with a thin or missing description deserves a better description before it deserves
a cover.

Output path: `static/images/covers/<section>/<year>/<slug>.<ext>`, referenced as an absolute
path `/images/covers/...`. Per `CLAUDE.md`, article images live in `static/` and are
referenced from the site root — `assets/` is for Hugo Pipes and would 404 here.

## Front matter handling

Parsing is regex-based, deliberately — matching `scripts/normalize-tags.mjs` and avoiding a
YAML dependency. It rewrites surgically so block scalars, quote styles, and comments survive.

`setCover()` preserves existing `cover:` siblings (`caption`, `hidden`) and only touches
`image:`, adding `alt:` from the title when absent. It is idempotent, and it will not
overwrite a hand-written `alt:`.

One real hazard, already handled but worth knowing if you touch `scalar()`: some posts write
`description: >` **with a trailing space**. A naive inline regex captures the bare `>` as the
description and feeds it to the model. Block scalars are therefore matched *before* the
inline form.

### Tests

```bash
npm run covers:test     # node --test, no network, no API key, touches nothing
```

`scripts/generate-covers.test.mjs` pins the parse/rewrite behaviour — this code edits every
post in `content/`, so a regression corrupts articles in bulk. **Run it after any change to
`scalar()`, `list()`, `hasCover()`, `setCover()`, or `buildPrompt()`**, and add a case when
you hit a new front-matter shape.

The pure functions are exported from the CLI for this. `IS_CLI` guards the entry point, so
importing the module must stay side-effect-free — don't move argv parsing or `process.exit`
back out of that guard.

## Adding a provider

Add an entry to `PROVIDERS` in `scripts/lib/cover-providers.mjs` with `generate({ prompt,
aspect })` returning a Buffer, plus `envKey` and `ext`. The caller stays provider-agnostic.
Keep credentials in `process.env`.

Current backends:
- **doubao** (default) — Volcengine Ark, `doubao-seedream-4-0-250828`, OpenAI-compatible.
  Returns a URL that the script downloads. Strong on Chinese titles, reachable from the
  mainland without a proxy. ~10s and ~500 KB per 2048x1152 image.

  **`size` must be `WIDTHxHEIGHT` or `1k`/`2k`/`4k`.** Widely-copied examples (including the
  seedream-guide repo) show `size: "16:9"` — the live API rejects that with
  `HTTP 400 InvalidParameter`. `ASPECTS` therefore holds explicit pixel dimensions. Verify
  against the API, not against blog posts, before changing it.
- **gemini** — `gemini-3-pro-image-preview`. Returns inline base64. Has no size parameter, so
  the aspect ratio is carried in the prompt text. May return prose instead of an image when
  it refuses — the script surfaces that text rather than a generic failure.

## Verifying

After generating and eyeballing the images:

```bash
npm run covers        # the posts you just did should no longer be listed
netlify dev           # per CLAUDE.md: verify the page renders, not `make`
```

Check the cover renders on the post page and that `og:image` is in the page head.
