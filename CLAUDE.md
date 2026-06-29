# CLAUDE.md - Blog Development Guidelines

This document contains critical information about working with this codebase. Follow these guidelines precisely.


---

编译不要用 make，用 netlify dev，如果是修改代码，修改完成后必须要验证页面是否正常

执行任务之前确保当前的分支从远程更新了，避免大的冲突，执行一个任务之后尽可能的再验证一下，通过的情况下去 commit



### 创建新文章

```bash
# 技术文章
hugo new content content/zh/ai-technology/posts/my-article.md
hugo new content content/en/ai-technology/posts/my-article.md

# 成长文章
hugo new content content/zh/growth/posts/my-article.md
hugo new content content/en/growth/posts/my-article.md

# AI 项目文章
hugo new content content/zh/projects/my-project.md --kind ai-project
hugo new content content/en/projects/my-project.md --kind ai-project
```

### 添加文章的推荐流程

判断文章属于 `ai-technology`、`growth` 还是 `projects`，用对应命令创建文件，不要手工新建到错误目录

系列长文用 frontmatter `series: { name, slug, order, total }` 标识（中英文 slug 一致），自动生成正文导航卡、侧栏 Series 块与 AI 系列问。

### SVG 放置规则

- **文章里要用的 SVG**：放 `static/images/...`，Markdown 用绝对路径 `![alt](/images/x.svg)` 或 frontmatter `cover.image: /images/x.svg`。Hugo 只把 `static/` 透到站点根，放错目录会 404（见 commit `9ba34af`）。
- **不要把大段 SVG 内联到 Markdown 正文**。Goldmark 看到行间空行或行首零宽空格（U+200B）时，会把 SVG 子元素当作段落处理，套上 `<p>`、丢掉 `xmlns`，渲染结果会破碎。一律抽到 `static/` 用 `![](...)` 引用。
- **需要 Hugo Pipes 处理（指纹、min、SRI）的 SVG**：放 `assets/`，模板里 `{{ (resources.Get "x.svg").RelPermalink }}`。不要放 `assets/` 又用绝对路径引用。
- SVG 不要写内联 `<script>` 或外链字体。Markdown 中的 SVG 走 `render-image` hook 自动加 `loading=lazy decoding=async role=img`；Netlify 给 `/*.svg` 单独下发 `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`，任何脚本/外链都会被静默拦截。
- 中英文双语文章里的 SVG 文字翻译版本：建议另存 `xxx.en.svg` 与 `xxx.svg` 并列；中英文章各自引用各自版本。

---
