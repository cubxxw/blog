# 适配器 · 技术博客（Hugo / PaperMod，双语）

**触发**："把 `2-master/<slug>.md` 分发到博客"
**产物**：`content/zh/<type>/posts/<slug>.md` 和 `content/en/<type>/posts/<slug>.md`

---

## 人群与机制
读者是通过搜索或 RSS 来的技术人，愿意读长文、要深度和可复现。这里的分发目标是 **SEO + 系统性沉淀**，不是流量爆款。母版的完整度基本原样保留。

## 生成规则

**目录与文件名**
- 按母版 `type` 选目录：`ai-agent` / `engineering` / `growth` / `projects`。
- 用 `hugo new content` 对应命令创建（见仓库 CLAUDE.md），不要手工建到错目录。
- 中英同 `slug`，分别落 `content/zh/...` 和 `content/en/...`。

**frontmatter（照 archetype 补全）**
```yaml
title: "<含主关键词、对搜索友好的标题>"
date: <当天>
type: posts
showtoc: true
tocopen: false
author: ["Xinwei Xiong", "Me"]
keywords: [<母版 keywords>]
tags: [<3-6 个>]
categories: [<Development / 对应大类>]
description: >
    <120-160 字，含主关键词，能独立说清这篇讲什么，用于搜索摘要>
cover.image: /images/<slug>-cover.svg   # 有封面才填，SVG 放 static/
series: { name, slug, order, total }     # 母版有 series 才填，中英 slug 一致
```

**SEO 要点**
- 主关键词进：标题、首段前 100 字、至少一个 H2。
- `description` 独立成句、含关键词、120-160 字。
- 合理内链到站内相关文章；系列文用 `series` 串起来。
- H2/H3 分层清晰，利于摘要抓取。

**正文**
- 保留母版的深度与代码块，可复现。
- 双语：英文版是**地道重写**而非直译；术语准确。

**SVG 铁律（来自仓库 CLAUDE.md，务必遵守）**
- 文章用的 SVG 放 `static/images/...`，用 `![alt](/images/x.svg)` 或 `cover.image` 绝对路径引用。
- **绝不把大段 SVG 内联进 Markdown 正文**（Goldmark 会套 `<p>`、丢 `xmlns`，渲染破碎）。
- 双语文字版 SVG：另存 `xxx.en.svg` 与 `xxx.svg` 并列，各自引用。

## 收尾
- 先 `netlify dev` 起本地（不要用 make），确认中英两页正常。
- 确认当前分支已从远程更新，通过后再 commit。
