# CLAUDE.md - Blog Development Guidelines

This document contains critical information about working with this codebase. Follow these guidelines precisely.


---

编译不要用 make，用 netlify dev，如果是修改代码，修改完成后必须要验证页面是否正常

执行任务之前确保当前的分支从远程更新了，避免大的冲突，执行一个任务之后尽可能的再验证一下，通过的情况下去 commit

### GitHub 交付规则

- 本博客仓库默认从远程更新 `main` 后直接修改、提交并推送到 `origin/main`
- 默认不创建 PR；只有用户在某次任务中明确要求时才走 PR 流程
- 工作区存在无关改动时，只暂存和提交当前任务涉及的文件

### PR 关联 issue 规则（仅在明确要求创建 PR 时适用）

- **一事一议的普通 issue**：PR 正文必须用关闭关键词 `Closes #N`（或 `Fixes #N`），合并即自动关闭 issue 并出现在 Development 侧栏。这是默认做法，凡 PR 解决某个 issue 都要写。
- **滚动聚合类 issue（带 `daily-report` 标签的站点日报）**：PR 正文只允许普通引用 `#N`，**禁止**关闭关键词——一条日报对应多个 PR，首个合并会提前关闭日报；且 `scripts/daily-report-issue.mjs` 只查 open 状态定位当天 issue，提前关闭会导致当天重复建日报。日报的关闭由次日 `closeStaleDailyIssues` 负责。



### 创建新文章

博客选题默认来自 `_briefs/`。执行下发任务前先读
`_briefs/README.md` 和 `docs/blog-editorial-workflow.md`，用
`npm run briefs:next` 选择下一篇。当前仓库不负责作者定位、上游母版或其他平台分发；
自动流程到 `ready-to-publish` 为止，未经作者确认不发布。
`content/` 中的文件一律视为可发布内容，不使用 `draft` front matter；未完成内容只能
留在未合并分支，空占位和内部 fixture 必须留在发布目录之外，最终发布由分支合并和部署控制。

从 brief 写文章、扫描并执行选题或完成整套发布前加工时，必须使用
`.claude/skills/write-blog-from-brief/SKILL.md`。该 skill 统一编排公开研究、原生写作、
独立 agent 审读、AI 味清理、SEO/GEO、内链、封面、评分与确定性验证。brief 含
`source_refs` 时，先运行 `npm run briefs:trace -- --file <brief>`，沿相同引用串联公开
brief、执行回执和既有文章，明确既有判断、本次增量与后续开放问题；不得读取
`brain://` 背后的 private 内容。

brain 自动下发时使用
`npm run briefs:dispatch -- --brief _briefs/<file>.md`。该命令启动全新的 ephemeral
executor，只传任务卡路径，不继承 brain 对话，也不得读取 `brain://` 指向的私有文件。
定向任务已经由 dispatcher 认领，executor 不再运行 `briefs:next`。

新写或重写文章第一段、开篇 Hook、楔子或首屏时，必须使用
`.claude/skills/craft-article-opening/SKILL.md`。开篇必须从真实材料建立在场感和张力，
不得用标题党、虚构经历或泛化的“AI 时代”开场。

```bash
# AI Agent 文章（Agent 工程、上下文工程、LLM 应用、GEO）
hugo new content content/zh/ai-agent/posts/my-article.md
hugo new content content/en/ai-agent/posts/my-article.md

# 工程文章（Kubernetes 云原生、Go、DevOps、开源实践）
hugo new content content/zh/engineering/posts/my-article.md
hugo new content content/en/engineering/posts/my-article.md

# 成长文章
hugo new content content/zh/growth/posts/my-article.md
hugo new content content/en/growth/posts/my-article.md

# AI 项目文章
hugo new content content/zh/projects/my-project.md --kind ai-project
hugo new content content/en/projects/my-project.md --kind ai-project
```

### 写作反模式（AI 味句式，写中文文章时必须遵守）

- **「不是 X，而是 Y」全文 ≤2 次；title/description、标题行、blockquote 金句位禁用**。改写手法：
  - 假对立（两边不构成真对立）→ 删掉前半句直陈：「训练的不是记忆，而是思考」→「训练的是思考」
  - 真对立 → 拆成独立短句或用破折号/冒号：「这不是倒退，而是把注意力挪到关键点」→「有人会说这是倒退。不是——它把注意力从"全程盯着"挪到"关键点按一下"」
  - 金句/标题 → 重写为正面断言：「不是让 Agent 更自由，而是把 LLM 框得更稳」→「用确定性的编排框住非确定性的 LLM」
- 「本质上」「不仅仅是」「这意味着」原则上直接删除——删后句意不变即证明它是填充词；每篇各 ≤3 次
- 每写完一节自查一遍上述句式；成稿后跑 `node scripts/check-ai-flavor.mjs <文件>` 验证（`npm run flavor:check` 查本次 git 改动，E 级必须清零）

### 内容架构（v3.0.0，2026-07）

- 四个内容 section：`ai-agent`、`engineering`、`growth`、`projects`；判断归属用对应命令创建文件，不要手工新建到错误目录（详见 `content/CATEGORIES.md`）
- **categories taxonomy 已退役**：不要在 frontmatter 写 `categories:`，分类职责由 section 承担，细粒度用 tags
- 旧 `ai-technology` 的所有 URL 已在 `static/_redirects` 配置逐篇 301；新增文章移动/改名时也要在该文件补重定向
- `travel` 是刻意保留的顶层生活单页（非 section），位于主菜单尾部，与"专栏"相邻——这是有意的定位，不要"修复"它

系列长文用 frontmatter `series: { name, slug, order, total }` 标识（中英文 slug 一致），自动生成正文导航卡、侧栏 Series 块与 AI 系列问。

多篇成组的专栏用 frontmatter `columns: [<slug>]` 挂载，落地页在 `content/{zh,en}/columns/<slug>/_index.md`。现有专栏：`ignite-and-settle`、`agent-engineering`、`geo`。

### SVG 放置规则

- **文章里要用的 SVG**：放 `static/images/...`，Markdown 用绝对路径 `![alt](/images/x.svg)` 或 frontmatter `cover.image: /images/x.svg`。Hugo 只把 `static/` 透到站点根，放错目录会 404（见 commit `9ba34af`）。
- **不要把大段 SVG 内联到 Markdown 正文**。Goldmark 看到行间空行或行首零宽空格（U+200B）时，会把 SVG 子元素当作段落处理，套上 `<p>`、丢掉 `xmlns`，渲染结果会破碎。一律抽到 `static/` 用 `![](...)` 引用。
- **需要 Hugo Pipes 处理（指纹、min、SRI）的 SVG**：放 `assets/`，模板里 `{{ (resources.Get "x.svg").RelPermalink }}`。不要放 `assets/` 又用绝对路径引用。
- SVG 不要写内联 `<script>` 或外链字体。Markdown 中的 SVG 走 `render-image` hook 自动加 `loading=lazy decoding=async role=img`；Netlify 给 `/*.svg` 单独下发 `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`，任何脚本/外链都会被静默拦截。
- 中英文双语文章里的 SVG 文字翻译版本：建议另存 `xxx.en.svg` 与 `xxx.svg` 并列；中英文章各自引用各自版本。

---
