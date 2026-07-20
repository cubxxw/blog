---
title: 'GEO 结构化实战：把"值得被引用"写进每一段（Answer-First、Schema、llms.txt）'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T10:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['GEO', 'Answer-First', '结构化数据', 'Schema', 'JSON-LD', 'FAQPage', 'HowTo schema', 'llms.txt', 'tldr', '问题式标题', '可提取性', 'AI搜索优化', '内链', '主题集群']
tags:
  - GEO
  - Content Strategy
  - SEO
  - AI Search
  - Hugo
description: >
  原理讲完，这一篇全是手上功夫：怎么写 Answer-First 段落、怎么把标题改成问题、FAQPage/HowTo schema 在富媒体被弃用后到底还要不要加、llms.txt 与 tldr 的正确姿势，以及怎么用内链织成主题集群。带代码、带前后对照。GEO 系列第 3 篇。
cover:
  image: '/images/columns/geo/zh-03-structured.svg'
  alt: GEO 结构化实战封面，展示把每一段写成可引用内容块
tldr:
  - Answer-First 段落有公式：一句可独立成立的结论 + 40~100 字展开 + 至少一个证据（数字/来源/引语）。这是被 AI 一字不差搬走的那段。
  - 问题式标题不是修辞，是给"查询扇出"喂子查询——把用户会追问的问题各自写成 H2/H3，等于主动认领多个检索入口。
  - Google 已在 2026 年弃用 FAQ/HowTo 的富媒体展现，但 FAQPage 仍是合法 schema、且仍被 AI Overviews/ChatGPT/Perplexity 解析——所以现在加 schema 是"为 AI 加"，不是"为富媒体加"。
  - llms.txt 对搜索排名几乎无用、对 AI 开发工具有用；tldr 前置摘要才是低成本高回报的 Answer-First 落地。别把力气用反。
  - 可提取性 = 把文章拆成能单独取用的乐高块：列表、表格、步骤、独立结论段、清晰标题；再用内链把支柱与子文织成主题集群。
maturity: budding
columns:
  - geo
series:
  name: GEO 生成式引擎优化
  slug: geo
  order: 3
  total: 6
---

## 先给结论：结构化不是排版洁癖，是"可被引用"的工程

**让 AI 引用你，靠的不是文采，而是"可提取性"——你的每一段能不能被单独抠出来、直接当答案用。这一篇给你四件可复制的手艺：Answer-First 段落公式、问题式标题体系、面向 AI 的 Schema、以及 llms.txt / tldr / 内链的正确姿势。全部带代码或前后对照，今天就能改。**

第 2 篇（[原理篇](/zh/ai-agent/posts/geo-how-ai-retrieves-and-cites/)）证明了 AI 检索的单元是"段落"而非"整页"。这一篇就是把那条原理，翻译成你写每一段时的具体动作。

> 这是「GEO 生成式引擎优化」系列的**第 3 篇（结构化实战）**。上一篇讲机制，这一篇讲手艺，下一篇（第 4 篇）讲信任与背书。

---

## Answer-First 段落公式

先看一个前后对照，一眼就懂差别在哪：

**❌ 改造前（铺垫式）：**
> 关于 Hugo 的构建速度，其实有很多因素会影响。我们在长期实践中发现，不同的配置、不同的内容规模、不同的模板复杂度，都会带来差异。那么到底该怎么优化呢？让我们先从了解 Hugo 的构建流程说起……

**✅ 改造后（Answer-First）：**
> **Hugo 构建慢，最常见的三个原因是：模板里滥用 `.Site.Pages` 全量遍历、图片没走 Hugo Pipes 处理、以及 `related` 相关文章计算开销过大。** 在一个约 1,100 页的双语站上，仅把全量遍历改成 `where`+缓存，构建时间就从 18s 降到 6s。下面逐个拆解……

差别不在信息量，在**顺序与证据**。Answer-First 段落有一个可套用的公式：

1. **第一句 = 可独立成立的结论**（把答案顶到最前，哪怕剧透）。
2. **接 40~100 字展开**（约 60~150 汉字，落在 [第 2 篇](/zh/ai-agent/posts/geo-how-ai-retrieves-and-cites/) 说的段落甜区）。
3. **至少嵌一个"可机读证据"**：一个数字、一处来源、或一句权威引语（这直接对应普林斯顿研究的 +22~41% 可见度）。

**用在哪**：文章开头第一段、每个 H2 小节的第一段、以及任何"是什么/为什么/怎么做"的回答处。你现在读的每一节开头，都是这个公式。

---

## 问题式标题体系：给"查询扇出"铺路

第 2 篇讲过 Google 的**查询扇出**——把一个问题拆成一堆子查询并行检索。标题就是你认领这些子查询的方式。

- **把陈述改成提问**：`GEO 概述` → `GEO 是什么？和 SEO 有什么区别？`。用户的提问被编码成向量，问题式标题在语义空间里离查询更近。
- **主动铺满"子问题邻域"**：一篇讲"Hugo SEO"的文章，用 H2/H3 显式认领这些追问——"Hugo 怎么配 sitemap？""Hugo 结构化数据怎么写？""Hugo 图片怎么懒加载？"每一个都是一张进入扇出的门票。
- **一个标题只问一件事**：便于系统切块、也便于该 chunk 语义单一。

> 小技巧：写完标题，把所有 H2/H3 单独抽出来读一遍——它们应该像一份"用户会问的问题清单"，而不是一堆名词短语。

---

## 面向 AI 的 Schema：一个关键的认知更新

这是最容易过时、也最多人做错的部分，务必看清 2026 年的现状：

> **Google 已经弃用 FAQ 和 HowTo 的"富媒体展现"**：FAQ 富媒体的搜索展现、报告与 Rich Results Test 支持于 2026 年 6 月起陆续下线，Search Console API 支持在 8 月移除；HowTo 富媒体早在 2023 年就已在桌面端取消。([The HOTH](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/)、[Google 官方](https://developers.google.com/search/blog/2023/08/howto-faq-changes))

那还要不要加 schema？**要，但目的变了。** Google 明确表示 FAQPage 仍是**合法的 Schema.org 类型**、会**继续解析**它来理解页面；更重要的是，**AI Overviews、ChatGPT、Perplexity、Gemini 都靠"清晰结构化的内容"生成答案，而问答格式恰恰是这些系统最容易提取的模式之一**。([The HOTH](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/)、[alevdigital](https://alevdigital.com/blog/faq-structured-data-2026/)) 而且未被使用的结构化数据**不会带来任何惩罚**。

**结论：现在加 FAQPage/HowTo 是"为 AI 解析加"，不是"为富媒体加"。** 心态一变，做法就顺了。

一段可直接用的 FAQPage JSON-LD（放进文章模板即可）：

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "GEO 会取代 SEO 吗？",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "不会。GEO 是 SEO 之上的新增层：SEO 争链接排名，GEO 争被 AI 生成时引用，二者共用同一套内容资产。"
    }
  }]
}
```

在 Hugo 里，你可以在文章模板里读 frontmatter 的 `faq` 字段循环生成（示意）：

```go-html-template
{{ with .Params.faq }}
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {{ range $i, $q := . }}{{ if $i }},{{ end }}
  {"@type":"Question","name":{{ $q.q }},
   "acceptedAnswer":{"@type":"Answer","text":{{ $q.a }}}}
  {{ end }}
]}
</script>
{{ end }}
```

> **本博客现状**：文章页已经输出 `BlogPosting`、`WebSite`、`Person`、`BreadcrumbList` 四类 JSON-LD（Lighthouse SEO 100）。**唯一该补的就是 `FAQPage`**——正文里我本来就写了 FAQ 小节，把它同步进 schema 几乎零成本。

---

## llms.txt 与 tldr：别把力气用反

这两个常被混为一谈，但价值天差地别：

- **`llms.txt`**：一个给大模型的"站点导览"提案。**对 Google Search 排名当前几乎无用**（Google 明确不使用，Ahrefs 对 13.7 万站研究发现 97% 从没被 AI 爬虫读过）；**但对 AI 开发者工具链有用**（Cursor、Claude Code、Copilot、MCP 会真实读取）。成本极低，放着无妨，别指望它提升被引率。（详见 [第 1 篇](/zh/ai-agent/posts/geo-generative-engine-optimization-guide/) 的判断。）
- **`tldr` 前置摘要**：这才是低成本高回报的那个。把文章要点做成开头的清单，本质就是 **Answer-First + 可提取性**的双重落地——AI 能直接摘走你的 tldr 当答案。

> **本博客现状**：我的文章 frontmatter 有 `tldr` 数组，正文顶部渲染成要点清单（你现在这篇开头那 5 条就是）。这一步已经做对了，要做的是**让每一篇核心文章都认真写 tldr**，而不是可有可无。

---

## 可提取性排版：把文章拆成乐高

同样的信息，换个排版，AI 的可提取性天差地别。四条硬规则：

1. **能用列表/表格就别写成大段散文**。结构化呈现是 AI 最爱抠的形态。
2. **步骤用有序列表 + 命令/代码块**。操作类内容尤其如此（这也是我 [《Hugo 博客搭建》](/zh/engineering/posts/my-hugo/) CTR 高的原因——每一步都能被单独取用）。
3. **每个小结论自成一段**，不依赖上下文也能读懂。
4. **清晰的 H2/H3 层级**，不跳级（跳级既伤无障碍也伤 chunk 切分）。

---

## 内链与主题集群：把单篇变成"权威区"

单篇再好也是孤岛。GEO 时代要建的是**主题集群（topic cluster）**：一篇支柱长文 + 若干子文 + 相互内链，形成话题权威（topical authority），这正是引用阶段的六大因素之一。

- **支柱 ← → 子文双向链**：支柱文链向每个子文，子文回链支柱（本系列就是这么织的：支柱篇 ↔ 原理篇 ↔ 本篇）。
- **锚文本用自然语言**：链接文字写成"AI 怎么检索与引用"这样的语义短语，而不是"点击这里"。
- **围绕已验证需求建集群**：别追噪声词。我会在 [第 5 篇](/zh/ai-agent/posts/geo-blog-rebuild-case-study/) 用真实数据演示，怎么围绕 Hugo、AI 工具、Go 这些**已经在被点击**的主题建集群。

---

## 落到本博客：一张"今天就能改"的清单

把上面六节压成对 cubxxw.com 的可执行动作：

- [ ] 给 Top 10 技术文章的开头补 Answer-First 段落（结论 + 展开 + 一个证据）。
- [ ] 把这些文章的 H2/H3 改写成问题式，并补齐常见子问题小节。
- [ ] 在文章模板里新增 `FAQPage` JSON-LD（读 frontmatter `faq` 字段），正文 FAQ 与 schema 同步。
- [ ] 每篇核心文章认真写 `tldr`（3~5 条，每条一个可独立成立的结论）。
- [ ] 把长文里"强依赖上下文"的段落，改写成自足的乐高块。
- [ ] 用内链把支柱与子文双向织起来，锚文本用语义短语。

---

## 常见问题（FAQ）

**Q：Google 弃用了 FAQ 富媒体，加 FAQPage schema 还有意义吗？**
A：有。FAQPage 仍是合法 schema，Google 会继续解析，AI Overviews/ChatGPT/Perplexity 也在用问答结构提取答案。现在加它是"为 AI 解析"，不是"为富媒体"。未使用的结构化数据不会带来惩罚。([The HOTH](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/))

**Q：Answer-First 会不会让文章开头很"剧透"、影响阅读？**
A：不会。人类读者也偏爱先看到结论再决定要不要深入；AI 更是直接摘走开头。剧透式开头 + 逐层展开，是对人和机器的双赢。

**Q：llms.txt 到底还要不要做？**
A：可以做，成本低，但别指望它提升搜索/被引。它真正有用的场景是 AI 开发工具读你的文档。把力气优先放在 tldr 和 Answer-First 上。

**Q：一篇文章加多少个 FAQ 合适？**
A：以"真实会被追问的问题"为准，通常 3~6 个。每个答案写成能独立成立的一段（对应 chunk 可提取性），别为凑数硬编。

---

## 小结与下一篇

这一篇的四件手艺——**Answer-First 段落、问题式标题、面向 AI 的 Schema、内链集群**——是把前两篇的理论真正"写进内容"的地方。做完这些，你的技术底座和内容结构就都到位了。但还差最后、也是最难补的一块：**信任与背书**。

- **上一篇**：[GEO 原理篇 —— AI 怎么检索、重排、引用](/zh/ai-agent/posts/geo-how-ai-retrieves-and-cites/)
- **下一篇（第 4 篇·信任与背书）**：E-E-A-T 怎么落地、为什么 Reddit 和 Wikipedia 占了 AI 引用的一大半、个人博客怎么做站外分发与第三方背书。

---

*本文规范与数据来源：Google Search Central 关于 FAQ/HowTo 富媒体变更的官方文档、The HOTH / alevdigital 的 2026 结构化数据分析，以及普林斯顿 GEO 研究。链接均在文中标注。*
