---
title: 'GEO 博客改造复盘：用真实数据重跑五层模型'
date: 2026-07-11T11:30:00+08:00
lastmod: 2026-07-31T00:00:00+08:00
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - GEO
  - SEO
  - AI Search
  - Content Strategy
  - Blog
categories:
  - Development
description: >
  这是一篇基于真实数据的 GEO 博客改造复盘：我用 Search Console、Lighthouse 与本地审计拆解 87.8 万曝光背后的噪声和有效需求，重新核对 nsddd.top 到 cubxxw.com 的域名迁移，并按风险、证据与可验证性排出 Hugo 博客的重建顺序，同时说明这些数字不能证明什么。
cover:
  image: '/images/columns/geo/zh-05-case-study.svg'
  alt: 'GEO 博客改造复盘封面，展示真实数据仪表盘与增长曲线'
tldr:
  - "旧域 nsddd.top 的三个月 Search Console 快照记录了 852 次点击、87.8 万次曝光、0.1% 汇总 CTR 与 13.2 的平均排名；这些数值描述的是混合查询组合，不是一个单一排名问题。"
  - "把数据按查询与页面拆开后，真正带来点击的是 Hugo 和 AI 工具文章；大量曝光则来自几乎不产生访问的无关长尾词。"
  - "Lighthouse SEO 100 只能证明被测页面通过了该版本覆盖的检查，不能证明全站技术 SEO 已经完成。"
  - "真实迁移是 nsddd.top 到 cubxxw.com；Google 建议重定向尽可能长期保留，通常至少一年。"
  - "改造顺序应是先守住迁移，再验证查询与页面的匹配，最后补证据、内部结构、可访问性和可测量的 AI 搜索表现。"
maturity: budding
columns:
  - geo
series:
  name: GEO 生成式引擎优化
  slug: geo
  order: 5
  total: 6
---

## 先给结论：技术检查干净，不等于需求匹配

2026 年 7 月，我把 GEO 系列前四篇的五层模型照向自己的博客。最有价值的结论，不是“技术 SEO 满分”，而是一个范围更小、也更可靠的判断：

> 被测首页通过了当次 Lighthouse 的全部 SEO 检查；与此同时，Search Console 三个月快照有 87.8 万次曝光，却只有 852 次点击。继续拆分才发现，点击集中在少数技术主题，许多曝光来自与博客无关的长尾查询。

这改变了改造顺序。我不该继续追逐已经变绿的工具分数，而应先守住域名迁移，找出真正有需求的“查询—页面”组合，再修补意图匹配较弱的内容。至于整站曝光，必须先拆开，不能把它想象成同一群读者。

这是「GEO 生成式引擎优化」系列的**第 5 篇**。它把[五层模型](/zh/ai-agent/posts/geo-generative-engine-optimization-guide/)用在一个真实站点上。这里是一份有日期的诊断，不是排名因果实验。

## 数据从哪里来，又不能说明什么

旧稿把私有 Search Console 数据、Lighthouse 实验室输出和本地可访问性检查塞进同一张表，证据看起来比实际整齐。重新核对后，测量边界如下：

| 来源 | 范围 | 快照时间 | 可以支持的判断 |
|---|---|---|---|
| Google Search Console | `nsddd.top` 网域资源；Google 搜索、Web；全部国家和设备 | 截至 2026-07-10 的近三个月窗口 | 点击、曝光、CTR、近似平均排名，以及查询和页面分组 |
| PageSpeed Insights | `cubxxw.com` 首页移动端测试 | 2026-07-10 | Lighthouse 实验室诊断；只有 PSI 报告足够样本时，CrUX 才提供真实用户数据 |
| 本地 Agent 就绪检查 | 项目自定义的三个可交互性检查 | 2026-07-10 | 仓库自己的回归检查，不是 Google 或行业标准 |

Search Console 总量和示例行来自私有导出。查询可能带有敏感表达，所以例子经过部分脱敏。Search Console 还会隐藏匿名查询，并截断普通表格中的行；总量和可导出行不能被当成完整查询全集。Google 的[维度、分组与查询限制说明](https://support.google.com/webmasters/answer/17011259)给出了这些边界。

这篇文章能报告我看见了什么，不能证明某次修改导致了某个排名变化，因为这里没有前后对照实验。

## 基线必须拆成三类证据

### 第一类：Search Console 观察值

| 指标 | 数值 |
|---|---:|
| 总点击 | **852** |
| 总曝光 | **878,000** |
| 汇总 CTR | **0.1%** |
| 平均排名 | **13.2** |
| 出现数据行的页面 | **813** |

平均排名是聚合后的近似指标，不能直接翻译成“所有结果都在第二页”。不同搜索结果组件的位置计算方式不同；在网域聚合口径下，一个资源还会使用其最靠前的结果。Google 也建议比起孤立的排名数字，更应观察点击和曝光的趋势。可参考官方的[曝光、点击与排名定义](https://support.google.com/webmasters/answer/7042828)，以及 [Performance 报告聚合规则](https://support.google.com/webmasters/answer/17011364)。

### 第二类：PageSpeed Insights 中的 Lighthouse 实验室结果

| Lighthouse 维度 | 分数 | 这项分数实际说明什么 |
|---|---:|---|
| SEO | **100** | 被测页面通过了当次 Lighthouse 所覆盖的 SEO 检查 |
| Best Practices | **100** | 被测页面通过了该版本包含的最佳实践检查 |
| Performance | **90** | 实验室分数良好，报告中的 LCP 诊断仍值得检查 |
| Accessibility | **86** | 自动审计发现对比度、标题或 accessible name 仍有工作 |

这些并不全是“真实浏览器数据”。PageSpeed Insights 同时可能展示 CrUX field data 和 Lighthouse lab data：上面的类别分数来自模拟环境里的 Lighthouse；真实用户数据由 CrUX 另行提供，而且需要足够样本。Google 的 [PSI 文档](https://developers.google.com/speed/docs/insights/v5/about)明确区分了两者。

Lighthouse SEO 100 也不等于全站没有技术缺口。它不能单独验证每条重定向、canonical、hreflang、sitemap、结构化数据、内部链接和索引状态。准确说法只是：这个页面通过了该版本当时运行的检查。

### 第三类：项目自定义的 Agent 交互检查

旧稿中的 “Agentic Browsing 2/3” 是我自己的三项检查，它发现一个 tooltip 缺少 accessible name。这个检查对项目有用，却从来不是 PageSpeed Insights 指标。把它移出 Lighthouse 表格，是为了让读者知道证据来自哪里。

## 87.8 万曝光，既不是假的，也不是一个答案

曝光不是“蹭出来的抓取”。它表示 Google 按自己的统计规则，记录了这个资源出现在搜索结果中。问题在于解读：总量把几类完全不同的需求混到了一起。

把查询导出按曝光排序，会看到一些与技术博客主题无关的长问句：

| 脱敏后的查询示例 | 曝光 | 点击 |
|---|---:|---:|
| 关于叶尔羌的地方史问题 | 2,751 | 0 |
| 免费 MBTI 测试 | 1,521 | 0 |
| 关于脑震荡的医学问题 | 1,265 | 0 |
| 洛阳菩提树相关问题 | 833 | 0 |

这些行进入分母后，整站汇总 CTR 自然很低。但这不证明 Google 因为低 CTR 惩罚了网站，也不能推出全站存在一个共同故障。它只说明“0.1% 整站 CTR”太粗，不足以指导具体修改。

更好的问题是：每一组查询对应哪个页面，大致出现在哪里，页面是否真的满足了那个意图？

这与[第 2 篇](/zh/ai-agent/posts/geo-how-ai-retrieves-and-cites/)讨论的词面重合有相似之处：页面可能因为词语交集而进入候选，却不一定是好答案。但这里的数据来自 Google Search，不是 AI 引用记录，所以我不能从零点击反推出“没有被 AI 引用”。

## 有效需求藏在页面与查询的组合里

按点击查看页面，技术主题才浮出来：

| 当前 canonical 页面 | 点击 | 曝光 | CTR | 下一步应验证什么 |
|---|---:|---:|---:|---|
| [MarkItDown](/zh/projects/markitdown/) | 96 | 72,268 | 0.13% | 先拆查询族，再决定是否改标题或正文 |
| [TDD](/zh/projects/tdd/) | 63 | 4,825 | 1.3% | 保持现有意图匹配，只在证据显示缺口时扩写 |
| [NotebookLM](/zh/projects/notebooklm/) | 55 | 3,389 | 1.6% | 加强基于来源的用例与内部链接 |
| [LangGraph](/zh/projects/langgraph/) | 50 | 4,304 | 1.2% | 区分架构、持久化和恢复三个意图 |
| [my-hugo](/zh/engineering/posts/my-hugo/) | 35 | 337 | **10.4%** | 作为标题与意图匹配的假设，不当成通用 CTR 标杆 |
| [Mem0](/zh/projects/mem0/) | 31 | 4,534 | 0.7% | 对照高曝光查询检查标题和段落覆盖 |
| 一篇长期思考笔记 | 27 | 87,834 | **0.03%** | 先找出无关查询族，再决定是否改文 |

`my-hugo` 在这张小表里 CTR 最高，但 337 次曝光不足以证明它的标题可以复制到所有文章。MarkItDown 看起来增量很大，72K 曝光却可能由许多意图和位置组成。下一步都应该是分组，而不是自动重写标题。

更耐久的策略仍是投入已经得到读者验证的主题：Hugo、AI 工具、Go 与工程实践、TDD。这样的主题集群比追逐无关高曝光词更可靠。[第 3 篇](/zh/ai-agent/posts/geo-structured-content-tactics/)解释了结构层面的做法。

## 用五层模型复盘，但不把它伪装成评分公式

五层模型是检查框架，不是 Google 或任何 AI 平台公开的排名公式。

| 层级 | 2026 年 7 月观察到的证据 | 仍然没有被证明的事 |
|---|---|---|
| **L1 · 可抓取** | robots、sitemap、hreflang、canonical、JSON-LD 模板和干净的 Lighthouse SEO 结果 | 全量抓取与索引；允许 crawler 不代表一定选择或引用 |
| **L2 · 可理解** | 许多文章有清楚标题与 `tldr` | 全站都具备答案优先结构和单一明确意图 |
| **L3 · 可相信** | 有一手项目经验和部分测量数据 | 主要论点都有一手来源、可复现实验和清楚边界 |
| **L4 · 可引用** | 摘要、系列导航与结构化段落 | 任何 AI 产品中的真实提取率或引用率 |
| **L5 · 被认可** | 作者身份与部分外部主页 | 技术主题得到独立讨论、链接和引用 |

能够保留的结论很克制：被测技术入口状态不错，结构、证据与独立背书仍有明显工作。数据没有证明任何一层能带来固定百分比提升，所以新版删掉了没有依据的增幅承诺。

## 按风险与证据安排改造队列

### P0：先守住域名迁移

真实迁移是 **`nsddd.top` → `cubxxw.com`**。

- 按照 [Google 站点迁移指南](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)，路径保持不变的永久重定向应尽可能长期保留，**通常至少一年**。
- 信号迁移期间，旧、新两个 Search Console 资源都保持验证状态。
- 批量测试重定向表，尤其是旧资源中出现过数据行的 813 个 URL。
- 检查 `/projects/markitdown/` 等高点击路径是否直接到达正确 canonical 页面。
- 提交当前 sitemap 并抽查代表性 URL；“请求编入索引”不是保证，也不是插队工具。

不能承诺权重一定在一到三个月内完成转移。抓取频率、站点规模、重定向质量和搜索系统本身都会影响时间。真正可测的任务，是持续看重定向、canonical、索引页面，以及新旧资源的点击与曝光。

### P1：验证查询与页面是否匹配

对于已经有足够曝光的页面：

1. 先把近义查询归成意图组，不读一个汇总行；
2. 对照查询族检查 title、开头答案和章节覆盖；
3. 比较相同长度、相近季节的时间窗口；
4. 条件允许时，一次只改一个主要变量；
5. 记录修改日期，积累足够新数据后再判断。

平均排名 8–20 可以作为调查筛选器，不能称为必然的“低成本机会”。只有 snippet 和正文真的没有满足已观察到的意图时，才改标题。内部链接也应先服务读者的下一步阅读，而不是搬运抽象权重。

### P2：补证据与结构

- 给依赖判断的技术主张补一手来源或可复现项目证据；
- 为主要技术主题维护一篇支柱文与少量聚焦子文；
- 独立修复标题层级、对比度、accessible name 和性能回退；
- FAQ 只保留读者真正会问的问题；
- 结构化数据必须准确描述页面上可见的内容。

这里有一个 2026 年必须说明的边界：Google 通常只向权威政府和健康站点展示 `FAQPage` 富结果，`HowTo` 富结果则已在 2023 年从 Google Search 中废弃。个人技术博客增加这两类标记，不是 CTR 策略。Google 的 [FAQ 与 HowTo 变更公告](https://developers.google.com/search/blog/2023/08/howto-faq-changes)写得很清楚。结构化数据可能帮助搜索引擎理解符合条件的内容，却不保证富结果，更不保证 AI 引用。

### P3：单独测量 AI 搜索

Search Console 描述的是 Google Search 表现，不是 ChatGPT、Claude、Perplexity 等产品的引用看板。AI 搜索应另设 prompt 测试、referral 日志、引用检查和人工核验。[第 6 篇](/zh/ai-agent/posts/geo-measurement-and-tools/)给出低成本做法。

## FAQ

### Lighthouse SEO 100，技术 SEO 是否完成了？

没有。它只说明被测页面通过了当次 Lighthouse 所包含的检查。重定向、canonical、hreflang、sitemap、结构化数据、内部链接、抓取行为和索引状态仍要分别审计。

### 87.8 万曝光是虚荣指标吗？

不必然。它们是 Search Console 统计规则下的有效观察值。只有当许多无关查询被合并为一个数字，又被当成同一群读者时，这个总量才会误导决策。先拆分，再判断。

### 域名迁移最应该盯什么？

路径保持不变的重定向、稳定 canonical、已验证的新旧资源、当前 sitemap、批量重定向测试和趋势。重定向尽可能长期保留，通常至少一年。

### 还要不要添加 FAQPage 或 HowTo schema？

只有标记准确描述页面可见内容时才考虑，而且不要期待 Google 富结果。FAQ 展示资格对多数站点受限，HowTo 富结果已经废弃。

### 别的网站能复制这套复盘吗？

可以，但要带上自己的证据。记录 Search Console property、search type、筛选器、时间窗口、聚合方式和导出限制；把 Lighthouse lab、CrUX field 与自定义审计分开；最后按查询—页面组合安排改造。

## 这次复盘真正改变了什么

初稿想要一个戏剧化结论：技术满分、流量很差，所以重建 L2–L5。数据支持的是一组更朴素、也更有用的事实。

首页通过了 Lighthouse 覆盖的 SEO 检查；旧域 Search Console 资源里有一个构成复杂的曝光总量；少量技术文章贡献了大部分点击；域名迁移所需的重定向时间比我最初写的更长。只凭这四件事，已经足够决定下一步，不必发明一个新的排名公式。

我愿意相信的 GEO，不是在 SEO 上再涂一层新分数，而是让入口、结构、证据、可引用性和独立认可始终可见，然后用真正能观察它们的工具逐项测量。

- **上一篇：** [GEO 信任与背书](/zh/ai-agent/posts/geo-trust-and-endorsement/)
- **下一篇：** [GEO 度量与工具](/zh/ai-agent/posts/geo-measurement-and-tools/)

## 一手资料

- [Google Search Console：曝光、点击与排名](https://support.google.com/webmasters/answer/7042828)
- [Google Search Console：Performance 数据聚合](https://support.google.com/webmasters/answer/17011364)
- [Google Search Console：维度、分组与查询限制](https://support.google.com/webmasters/answer/17011259)
- [PageSpeed Insights：实验室数据与真实用户数据](https://developers.google.com/speed/docs/insights/v5/about)
- [Google Search Central：带 URL 变更的站点迁移](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google Search Central：FAQ 与 HowTo 变更](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [Google Search Central：结构化数据简介](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
