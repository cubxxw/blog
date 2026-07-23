---
name: seo-autofix
description: Act on today's daily report (站点日报) SEO recommendations as small labeled PRs, then log what was taken and what was skipped back into the same issue's autofix section. Use when running the daily seo-autofix CI job, or when the user asks to process today's daily report recommendations / 处理今日日报建议.
---

# SEO Autofix — daily recommendation triage

Close the observe→act loop on the daily report issue. The SEO analyzer (dry-run) writes recommendations every day; this skill picks the safest, highest-impact ones, turns each into one small PR, and writes an honest processing log into the same issue. A human merging (or rejecting) the PRs is the only approval gate — never merge anything yourself.

Inputs (from the invoking prompt; use defaults when absent):

- `MAX_PRS` — maximum PRs to open this run. Default **2**.

## Step 1 — locate today's issue and read it

- `node scripts/daily-report-issue.mjs` prints today's issue number (creating the issue if absent — if it had to be created, the analyzers haven't run yet; write a section saying so and stop).
- `gh issue view <number>` and read the `### 🔍 SEO` section's `建议动作` list. Each item follows `**[分类]** 建议 — 文件路径 — 数据依据`. Also skim the Lighthouse section for corroborating numbers.

## Step 2 — backpressure and dedup (BEFORE any edit)

- `gh pr list --label seo-auto --state open --json number,title,headRefName,url` — if 3 or more are already open, do NOT open new PRs today. Write the autofix section explaining the backlog and stop. Unreviewed PRs piling up means the bottleneck is review, not generation.
- `gh pr list --label seo-auto --state all --limit 30 --json title,state,mergedAt,closedAt,headRefName,body` — skip any recommendation whose target files overlap an open PR, or overlap a PR closed WITHOUT merging in the last 14 days (a human already rejected that idea; don't re-litigate it daily).

## Step 3 — pick what to act on

Eligible categories, in priority order:

1. `[标题重写]` / `[meta 描述]` — frontmatter-only edits to `content/**` (title, description). The bread and butter.
2. `[内链]` — adding a relevant internal link inside an article body.
3. `[结构化数据]` — only when it means frontmatter fields on content files.
4. `[性能]` — ONLY when the fix is pure content: moving images into a page bundle, compressing an oversized image, fixing a missing image reference. (Precedent: PR #225.)

NOT eligible — leave for a human and say so in your section:

- Anything touching `layouts/**`, `assets/**`, `.github/**`, `scripts/**`, `config.yml`, `package.json`, `netlify.toml`, `data/seo/**`.
- Anything speculative — "复测", "排查", "确认": investigations are not fixes.
- Anything the analyzer itself flagged as possible noise.

Pick AT MOST `MAX_PRS`, favoring impact (impressions, persistence across days) and confidence. Zero picks is a valid outcome — never invent work to fill the quota.

## Step 4 — make each fix (one branch + PR per pick)

- Branch: `seo-autofix/YYYYMMDD-<short-slug>` (today's UTC date).
- Bilingual discipline: when rewriting title/description, edit BOTH `content/zh/...` and `content/en/...` variants when both exist — each written natively in its own language, not translated word-for-word.
- Chinese titles/descriptions must follow the anti-AI-flavor rules in the project CLAUDE.md: no 「不是 X，而是 Y」 in title/description, no filler like 「本质上」「不仅仅是」. Descriptions should promise the searcher a concrete payoff — these pages rank but get zero clicks precisely because the current text doesn't.
- Keep each diff minimal: only the files that recommendation needs. No opportunistic clean-ups.
- Build check before every PR. If `hugo` is not installed (CI runner), install it once:
  `wget -qO /tmp/hugo.deb https://github.com/gohugoio/hugo/releases/download/v0.147.0/hugo_extended_0.147.0_linux-amd64.deb && sudo dpkg -i /tmp/hugo.deb`
  Then `hugo --gc --minify --quiet` must exit 0.
- PR body must contain: `## Source` (link to today's issue + exact recommendation text quoted), `## Change` (files touched and why), `## Verification` (the hugo command and result). Label `seo-auto` (create if missing: `gh label create seo-auto --color FBCA04 --description "AI-generated SEO fix"` — ignore errors).

## Step 5 — write the autofix section (ALWAYS, even on zero picks)

- Compose Markdown starting at `### 🤖 自动处置`, containing:
  - 已开 PR：one line per PR — 建议原文的分类+对象 → PR 链接
  - 跳过：each skipped recommendation and the one-line reason（不在安全范围 / 已有 PR / 此前被拒 / 疑似噪声 / 积压达上限）
  - 状态：open `seo-auto` PR count.
  - Keep it under ~300 words. Plain statements, no cheerleading.
- Use the `Write` tool to save it to `/tmp/autofix-section.md` (do NOT heredoc through Bash — the content has backticks and newlines), then run exactly:
  `node scripts/report-section-to-issue.mjs autofix /tmp/autofix-section.md`
- Do NOT edit the issue with `gh` yourself; the script owns issue writes. If it exits non-zero, report the error plainly.
