# PRD: Blog Full-Site SEO Overhaul

**Issue:** https://github.com/cubxxw/blog/issues/174
**Status:** Draft
**Target:** nsddd.top (cubxxw/blog, Hugo + PaperMod)
**Baseline health score:** 49% (41 articles audited, 2026-04-19)
**Target health score:** ≥ 80%

---

## Introduction

nsddd.top 是一个 Hugo 静态博客，中英文双语，100+ 篇文章覆盖 AI、Kubernetes、开源贡献、成长记录等主题。全站 SEO 存在 6 类系统性缺陷，其中 `meta description` 和 `canonical` 标签 100% 缺失，英文 title 66% 超长，`og:title` 在含单引号的标题上截断。

根本原因已定位：`layouts/partials/seo.html` 实现了完整 SEO 逻辑，但**从未被任何模板调用**；`layouts/partials/head.html` 自带的 title/og 实现存在 bug。修复路径明确：接入 `seo.html`、修复 bug、批量更新英文 title、修复 URL 异常、补充分类封面图。

---

## Goals

- `meta description` 覆盖率从 0% → ≥ 95%
- `canonical` 覆盖率从 0% → 100%
- 英文版 title 超长率从 66% → ≤ 10%
- `og:title` 截断问题从 8 篇 → 0 篇
- URL 重定向异常从 2 篇 → 0 篇
- 全站 SEO 健康评分从 49% → ≥ 80%
- `netlify dev` 构建全程无报错

---

## User Stories

### US-001: 接入 seo.html partial，修复 head.html 双重渲染冲突

**Description:** As a site owner, I want the existing `seo.html` partial to be properly wired into the page `<head>`, so that description, canonical, og tags are rendered on every page.

**Background:** `layouts/partials/seo.html` 已包含完整 SEO 实现但未被调用。`head.html` 自带实现与之冲突。修复策略：在 `head.html` 中调用 `seo.html`，并移除 `head.html` 中已被 `seo.html` 覆盖的重复字段（description、canonical、og tags）。

**Acceptance Criteria:**
- [ ] `layouts/partials/head.html` 添加 `{{- partial "seo.html" . -}}` 调用
- [ ] 移除 `head.html` 中与 `seo.html` 重复的 `<meta name="description">`、`<link rel="canonical">` 字段，避免双重渲染
- [ ] 生产环境的 `opengraph.html` / `twitter_cards.html` 调用保留不变（它们在 `{{- if hugo.IsProduction }}` 条件块内）
- [ ] `netlify dev` 启动无报错，首页和任意一篇文章 `<head>` 中可见 `<meta name="description">` 和 `<link rel="canonical">`

---

### US-002: 修复 og:title 单引号截断 bug

**Description:** As a site owner, I want og:title to render the full article title even when it contains apostrophes or em-dashes, so social shares show correct titles.

**Background:** `seo.html` 中 og:title 输出 `$title`，而 `$title` 由 `printf "%s | %s" .Title site.Params.title` 拼接，Hugo 的 `printf` 默认不做 HTML 转义，导致含 `'` 的 title 在 `content='...'` 属性中被提前截断。

受影响文章（已确认）：
- `growth/posts/2025-annual-review` — og:title 截断为 `"I"`
- `growth/posts/ai-and-self-identity` — 截断为 `"AI Is Getting Smarter, But I"`
- `projects/notebooklm` — 截断为 `"NotebookLM: Google"`
- `projects/markitdown` — 截断为 `"MarkItDown: Microsoft"`

**Acceptance Criteria:**
- [ ] `seo.html` 中所有 `content='{{ $title }}'` 改为 `content="{{ $title | htmlEscape }}"` （双引号 + htmlEscape）
- [ ] 同样处理 `$description` 字段，防止描述中含引号时截断
- [ ] 验证上述 4 篇文章的 og:title 在本地 `netlify dev` 中渲染完整

---

### US-003: 控制英文版 title 长度，避免 Google 截断

**Description:** As a site owner, I want English article titles in `<title>` and og:title to stay within 60 characters, so search results show the full title without "…".

**Background:** 当前 `seo.html` 的 title 拼接逻辑：`printf "%s | %s" .Title site.Params.title`，`site.Params.title` 为 `"Xinwei Xiong (cubxxw) - AI, Open Source & Nomad Blog"`（52 字符），导致英文文章 title 普遍 100-156 字符。

**修复策略（模板层，无需逐篇改文章）：**
```
如果 .Title 长度 > 20 字符 → 只输出 .Title（不拼接站名）
如果 .Title 长度 ≤ 20 字符 → 输出 .Title | site.Params.shortTitle
```
`site.Params.shortTitle` 在 `hugo.toml` 中新增，值为 `"cubxxw"`（6 字符）。

中文版文章 title 普遍 42-57 字符，不需特殊处理。

**Acceptance Criteria:**
- [ ] `hugo.toml` 新增 `shortTitle = "cubxxw"` 配置项
- [ ] `seo.html` 的 `$title` 计算逻辑改为：文章标题 > 20 字符时只输出 `.Title`，否则输出 `title | shortTitle`
- [ ] 验证 5 篇超长英文文章的 `<title>` 字符数 ≤ 70（本地 `netlify dev`）
- [ ] 中文文章 title 渲染不受影响

---

### US-004: 为英文文章批量重命名 SEO 友好 title

**Description:** As a site owner, I want key English articles to have concise, keyword-rich titles under 60 characters, so Google shows them completely in search results.

**Background:** US-003 修复模板层后，文章的 `.Title` front matter 本身仍然过长（最长 156 字符）。需要对重要文章逐篇重写 title，遵循 SEO 最佳实践：包含主关键词、50-60 字符以内、自然可读。

**重命名规则：**
- 保留核心关键词（项目名、技术名）
- 去除冗余描述词（"Deep Dive"、"Open Source"、"A Developer's Guide" 等）
- 长度目标：英文 45-60 字符

**参考示例（AI 建议，需人工确认）：**

| 原 title | 建议 title | 字符数 |
|---------|-----------|--------|
| `Reflection on Open Source Commercialization & Learning and Summary of Global Traffic Conference (GTC)` | `Open Source Business: From Community to Revenue` | 48 |
| `Exploring Large Language Models (LLMs): Pioneering AI Understanding, Generation & Human Language` | `Large Language Models: How LLMs Work` | 38 |
| `Harnessing Language Model Applications with LangChain: A Developer's Guide` | `LangChain: Building LLM Applications` | 37 |
| `Test-Driven Development for AI Applications: Open Source Deep Dive` | `TDD for AI: Test-Driven Development Guide` | 43 |
| `NotebookLM: Google's AI Research Assistant Deep Dive` | `NotebookLM: Google's AI Research Tool` | 38 |
| `MarkItDown: Microsoft's Document-to-Markdown Converter Deep Dive` | `MarkItDown: Convert Documents to Markdown` | 43 |
| `OpenIM: Building an Efficient Version Control and Testing Workflow` | `OpenIM: Version Control & Testing Workflow` | 44 |
| `Jina AI: Multimodal Embedding and Search Deep Dive` | `Jina AI: Multimodal Search & Embeddings` | 41 |
| `LangChain: Open Source Deep Dive` | `LangChain: Open Source LLM Framework` | 38 |
| `LangGraph: Open Source Deep Dive` | `LangGraph: Stateful AI Agent Workflows` | 40 |
| `AI Recommendation Systems: Open Source Deep Dive` | `AI Recommendation Systems: How They Work` | 42 |
| `Agent Identity: From Locke to OpenClaw` | 保留（已 39 字符）| 39 |
| `I'm Wandering, But I'm Not Lost — 2025-2026 Annual Review` | `Wandering & Growing: 2025-2026 Annual Review` | 46 |

**Acceptance Criteria:**
- [ ] 对上表中每篇文章修改 front matter 中的 `title` 字段
- [ ] 所有修改后 title 字符数 ≤ 60
- [ ] `netlify dev` 中验证文章页 `<title>` 标签展示新 title
- [ ] 中英文对应文章的 ZH 版 title 不受影响（中文版独立 front matter）

---

### US-005: 修复 2 个 URL 重定向异常

**Description:** As a site visitor, I want all blog URLs to resolve to the correct page with proper metadata, so I don't land on a broken or wrong-language page.

**Background:**
1. `https://nsddd.top/growth/posts/flow-state-guide` → 重定向到 `/growth/posts/flow-state/`，目标页 title 显示为 URL 字符串，H1/og 全缺失。根因：文章 slug 为 `flow-state`，但被链接为 `flow-state-guide`。
2. `https://nsddd.top/growth/posts/2026-03-27-lhasa-slow-and-heavy` → 重定向到 `/zh/growth/posts/2026-03-27-lhasa-slow-and-heavy/`，英文路径被重定向到中文版。根因：该文章可能只有中文版，英文路径应返回 404 或重定向到中文版并加 hreflang。

**Acceptance Criteria:**
- [ ] 定位 `flow-state` 文章文件，在 front matter 添加 `aliases: ["/growth/posts/flow-state-guide/"]` 使旧 URL 正常跳转
- [ ] 访问 `https://nsddd.top/growth/posts/flow-state-guide` 时正确渲染文章（title、h1、og 全部正常）
- [ ] 定位 `lhasa-slow-and-heavy` 文章，确认是否存在英文版；如不存在，在 `/content/en/` 对应位置创建 stub 页（或删除错误重定向配置）
- [ ] 两个 URL 均不再出现语言错误或元数据缺失

---

### US-006: 为各分类设置专属默认 og:image

**Description:** As a site owner, I want each content category to have a distinct default og:image, so social shares look different and recognizable across AI, growth, and projects content.

**Background:** 当前 `seo.html` 逻辑：`cond .Params.cover.image .Params.cover.image (site.Params.images | first | default "/assets/og-image.png")`，34/41 篇文章落入默认占位图分支，社交分享卡片千篇一律。

**修复策略：** 在 `seo.html` 中按分类（section）选择默认图：
```
ai-technology → /assets/og-ai-technology.png
growth        → /assets/og-growth.png
projects      → /assets/og-projects.png
fallback      → /assets/og-image.png（保留）
```

**Acceptance Criteria:**
- [ ] 准备 3 张分类封面图（1200×630px），放置于 `static/assets/`：`og-ai-technology.png`、`og-growth.png`、`og-projects.png`
- [ ] `seo.html` 的 `$ogImage` 计算逻辑按 `.Section` 选择对应默认图
- [ ] 验证：一篇 ai-technology 文章、一篇 growth 文章、一篇 projects 文章，社交预览图各不相同（本地 `netlify dev`）
- [ ] 已设置 `cover.image` 的文章不受影响，仍使用自定义图

---

### US-007: 添加 hreflang 互指标签

**Description:** As a site owner, I want Google to understand that English and Chinese pages are language variants of each other, so neither version cannibalizes the other's search ranking.

**Background:** 博客已有翻译机制（`range .AllTranslations`），`head.html` 中已输出 `<link rel="alternate" hreflang="...">` 标签。需确认 `seo.html` 接入后不重复输出，并验证标签格式符合 Google 要求。

**Acceptance Criteria:**
- [ ] 检查 `seo.html` 是否已包含 hreflang 输出；如无，参考 `head.html` 现有实现补充
- [ ] 确认中英文对应文章各自输出了对方的 hreflang 互指（本地验证）
- [ ] 不存在重复的 hreflang 标签（`head.html` 与 `seo.html` 不双重输出）

---

## Functional Requirements

- **FR-1:** `layouts/partials/head.html` 必须调用 `{{- partial "seo.html" . -}}`，且不与现有字段重复渲染
- **FR-2:** `seo.html` 的所有 `content` 属性必须使用双引号 + `htmlEscape` 过滤，防止特殊字符截断
- **FR-3:** 文章 `<title>` 长度（含站名后缀）须 ≤ 70 字符；英文文章标题本身 > 20 字符时不拼接站名
- **FR-4:** `hugo.toml` 新增 `shortTitle` 配置，用于短后缀场景
- **FR-5:** `<meta name="description">` 优先读取 front matter `description`，fallback 到 `.Summary | truncate 160 | plainify`
- **FR-6:** `<link rel="canonical">` 每页输出唯一，值为 `.Permalink`
- **FR-7:** `og:image` 按 `.Section` 选择分类默认图，文章级 `cover.image` 优先级最高
- **FR-8:** 重定向异常的 2 篇文章须通过 `aliases` 或文件结构修复，不再出现语言错误或元数据缺失
- **FR-9:** hreflang 标签不重复输出，格式符合 Google Search Console 规范

---

## Non-Goals

- 不修改 PaperMod 主题目录下的模板（`themes/PaperMod/`），所有修改在 `layouts/` 覆盖层进行
- 不为所有 100+ 篇文章逐篇手写 `description` front matter（模板 fallback 覆盖此需求）
- 不引入第三方 SEO 插件或 Hugo module
- 不修改 URL 结构（不影响已有外链）
- 不做 sitemap 重构（Hugo 自动生成已足够）
- 不处理页面速度/Core Web Vitals（另立 issue）

---

## Technical Considerations

- **Hugo 模板层级：** `layouts/` 下的文件覆盖 `themes/PaperMod/layouts/` 下的同名文件，无需修改主题目录
- **双重渲染风险：** `head.html` 和 `seo.html` 各自有 description/canonical 实现，接入后需删除 `head.html` 中的重复字段
- **生产环境条件：** `head.html` 中 og/twitter 模板调用在 `{{- if hugo.IsProduction }}` 块内；`seo.html` 不受此限制，本地开发也会渲染，便于调试
- **`htmlEscape` vs `safeHTMLAttr`：** Hugo 中 `htmlEscape` 对 `<>&'"` 全部转义，适合 `content` 属性值；`safeHTMLAttr` 用于信任的属性字符串，此处不适用
- **构建验证：** 使用 `netlify dev`（非 `make`）验证，CLAUDE.md 明确要求

---

## Success Metrics

| 指标 | 基线 | 目标 |
|------|------|------|
| SEO 健康评分 | 49% | ≥ 80% |
| `meta description` 覆盖率 | 0% | ≥ 95% |
| `canonical` 覆盖率 | 0% | 100% |
| 英文 title 超长率（>70字符）| 66% | ≤ 10% |
| `og:title` 截断文章数 | 8 | 0 |
| URL 重定向异常数 | 2 | 0 |

---

## Implementation Order

建议按以下顺序执行，每个 US 完成后用 `netlify dev` 验证：

1. **US-001** — 接入 seo.html（最高 ROI，一次修复 description + canonical）
2. **US-002** — 修复 og:title 截断（同一文件，顺手修复）
3. **US-003** — 模板层 title 长度控制
4. **US-005** — 修复 URL 异常（文章级，独立）
5. **US-004** — 批量重命名英文 title（文章级，可分批）
6. **US-006** — 分类 og:image（需准备图片素材）
7. **US-007** — hreflang 验证与修复

---

## Open Questions

1. `og-ai-technology.png` 等分类封面图是否已有设计稿，或需要生成？
2. US-004 中建议的英文 title 重命名，是否需要人工逐篇审核后再提交，还是由 AI 按规则批量执行？
3. `lhasa-slow-and-heavy` 是否有计划创建英文版，还是确认为仅中文文章？
