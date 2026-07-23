---
title: 'GEO 本博客改造复盘：用真实数据把五层模型跑一遍'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T11:30:00+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong"]
keywords: ['GEO', '案例复盘', 'Google Search Console', 'PageSpeed Insights', 'SEO审计', '零点击', '主题集群', '域名迁移', 'cubxxw', '数据驱动', 'AI搜索优化']
tags:
  - GEO
  - SEO
  - Analytics
  - Content Strategy
  - AI Search
  - Hugo
description: >
  前四篇讲方法，这一篇上真数据。我把 cubxxw.com 的 Google Search Console 与 PageSpeed Insights 数据翻了个底朝天，用五层模型逐层诊断：87 万曝光为什么只换来 852 点击、哪些是噪声哪些是金矿、域名迁移怎么保权重，以及一份按优先级排好的改造清单。GEO 系列第 5 篇。
cover:
  image: '/images/columns/geo/zh-05-case-study.svg'
  alt: GEO 本博客改造复盘封面，展示真实数据仪表盘与增长曲线
tldr:
  - 真实基线（旧域近 3 个月）：852 点击、87.8 万曝光、CTR 0.1%、平均排名 13.2。技术底座 Lighthouse SEO 满分，瓶颈不在技术，在排名与点击。
  - 87 万曝光是"虚荣指标"：曝光最高的词全是 MBTI/脑震荡/地方史这类与博客无关的噪声，点击为 0，把整站 CTR 稀释到 0.1%。
  - 真金在点击里：markitdown（96 点击/7.2 万曝光）、my-hugo（35 点击/CTR 10.4% 的标杆）、TDD/LangGraph/NotebookLM——这些技术集群才值得重仓。
  - 用五层模型一照：L1 技术底座接近满分，真正欠的是 L2 结构、L3 证据、L4 FAQ schema、L5 站外背书——和前几篇的方法论一一对应。
  - 域名 cubxxw.com→cubxxw.com 迁移中：已设 Change of Address、301 保留路径且实测有效，关键是保住旧域 301 至少 180 天并两资源并存监控。
maturity: budding
columns:
  - geo
series:
  name: GEO 生成式引擎优化
  slug: geo
  order: 5
  total: 6
---

## 先给结论：技术满分，卡在"有曝光、没被选中"

**我把 cubxxw.com 的真实数据翻了个底朝天，结论很干脆：技术 SEO 已经接近满分（Lighthouse SEO 100），但近 3 个月 87.8 万曝光只换来 852 次点击、CTR 仅 0.1%、平均排名 13.2（第二页）。问题不在技术层，而在"有曝光、没被选中"。这一篇，就是用前四篇的五层模型，对这些真实数字做一次逐层诊断与改造排期。**

前四篇是方法论，这一篇是"真枪实弹"。所有数字来自 Google Search Console 与 PageSpeed Insights 的真实实测，不是演示。

> 这是「GEO 生成式引擎优化」系列的**第 5 篇（本博客改造复盘）**。它把 [支柱篇](/zh/ai-agent/posts/geo-generative-engine-optimization-guide/) 的五层模型，落到我自己站点的真实数据上。

---

## 真实基线：数字先摆出来

先看 PageSpeed Insights 移动端实测（真实浏览器跑分）：

| 维度 | 得分 | 备注 |
|---|---|---|
| Lighthouse SEO | **100** | 技术 SEO 无短板 |
| Best Practices | **100** | 满分 |
| Performance | 90 | LCP 3.3s 需优化 |
| Accessibility | 86 | 对比度/标题跳级/tooltip |
| Agentic Browsing（AI 可读性） | 2/3 | 一个 tooltip 缺可访问名 |

再看 Google Search Console（旧域 cubxxw.com，近 3 个月）：

| 指标 | 数值 |
|---|---|
| 总点击 | **852** |
| 总曝光 | **878,000** |
| 平均 CTR | **0.1%** |
| 平均排名 | **13.2** |

**一句话读数**：技术底座满分（对应五层模型的 L1），但排名停在第二页、点击率低到异常。技术不是瓶颈——这正是很多"SEO 做得很好却没流量"的站的典型画像。

---

## 87 万曝光的真相：一场"虚荣指标"的祛魅

把查询按曝光排序，真相立刻现形——曝光最高的词，全是和博客毫无关系的噪声：

| 高曝光查询（示例） | 曝光 | 点击 |
|---|---|---|
| "…叶尔羌是自称吗…"（地方史长问句） | 2,751 | 0 |
| "…免费 MBTI 人格测试…" | 1,521 | 0 |
| "…脑震荡…核心解析…"（医学） | 1,265 | 0 |
| "洛阳千年菩提树开花了 trending 原因" | 833 | 0 |

**这些是低位（第二页往后）蹭出来的曝光，零点击、零价值，却把整站 CTR 稀释到了 0.1%。** 教训很硬：**别用"87 万曝光"给自己错误的成就感。** 曝光是站在人群里，被点击/被引用才是被点名。

呼应 [第 2 篇](/zh/ai-agent/posts/geo-how-ai-retrieves-and-cites/) 的机制：这些噪声词是"词面碰巧命中"（BM25 那一路），但页面段落经不起被单独抠出来用，所以有曝光无引用无点击。

---

## 真金在点击里：找出该重仓的集群

把视角切到"点击"，真正有价值的技术集群立刻浮现：

| 页面 | 点击 | 曝光 | CTR | 解读 |
|---|---|---|---|---|
| [markitdown](/zh/projects/markitdown/) | 96 | 72,268 | 0.13% | 流量王，但排名偏低，冲首页收益最大 |
| [tdd](/zh/projects/tdd/) | 63 | 4,825 | 1.3% | 健康 |
| [notebooklm](/zh/projects/notebooklm/) | 55 | 3,389 | 1.6% | 健康 |
| [langgraph](/zh/projects/langgraph/) | 50 | 4,304 | 1.2% | 健康 |
| [my-hugo](/zh/engineering/posts/my-hugo/) | 35 | 337 | **10.4%** | CTR 标杆，标题与意图高度匹配 |
| [mem0](/zh/projects/mem0/) | 31 | 4,534 | 0.7% | 有提升空间 |
| 某"思考笔记"长文 | 27 | 87,834 | **0.03%** | 垃圾曝光磁铁，拉低整站 CTR 的元凶 |

**两个极端最有启发**：`my-hugo` 用 337 曝光换来 35 点击（10.4% CTR），是"内容与意图高度匹配 + 段落可提取"的正面样板；而某篇思考笔记用 8.7 万曝光只换 27 点击（0.03%），是噪声磁铁的反面教材。

**策略结论**：重仓已验证有需求的技术集群——**Hugo 建站、AI 工具（markitdown/mem0/langgraph/notebooklm/gpt-researcher）、Go 与工程实践、TDD**；对噪声词不投入内容。这正是 [第 3 篇](/zh/ai-agent/posts/geo-structured-content-tactics/) 说的"主题集群"落到实处。

---

## 用五层模型逐层照一遍

把真实状态对齐前四篇的五层模型，缺口一目了然：

| 层 | 现状 | 判断 |
|---|---|---|
| **L1 可抓取** | robots 欢迎 GPTBot/ClaudeBot/PerplexityBot/百度/字节；4 类 JSON-LD；hreflang；sitemap；llms.txt；SEO 100 | ✅ 接近满分，入场券已拿到 |
| **L2 可理解** | 并非每篇都 Answer-First；标题不都是问题式 | ⚠️ 有缺口 |
| **L3 可信任** | 有一手经验，但统计/外部引用的"证据密度"不足 | ⚠️ 最大机会（+25~40%） |
| **L4 可引用** | 有 `tldr` 字段；缺 `FAQPage` schema | ⚠️ 部分到位 |
| **L5 可背书** | `sameAs` 身份已配；技术文站外讨论/外链偏少 | ⚠️ 有缺口 |

**关键洞察**：L1 满分让人误以为"SEO 做得很好"，但 GEO 的胜负手在 L2–L5。**技术满分只是入场券，真正的护城河在结构、证据与背书。**

---

## 按优先级排好的改造清单

把诊断变成排期（与 [支柱篇](/zh/ai-agent/posts/geo-generative-engine-optimization-guide/) 的 30/60/90 对齐）：

**🔴 P0 · 保迁移（1 周）**
- 保住旧域 cubxxw.com 的 301 至少 180 天；两个 GSC 资源并存、每周对比曲线确认权重转移。
- 新域 cubxxw.com 重新提交 `sitemap.xml` 与 `news-sitemap.xml`，对核心页"请求编入索引"。
- 逐一核对旧域 813 个有流量页面，确保每个都 301 到新域同名路径（markitdown 这类流量页绝不能 404）。

**🟠 P1 · 抢首页 + 提 CTR（2–4 周）**
- 用 GSC 过滤"平均排名 8–20"的词，对应页补深度、加内链、补 Answer-First（[第 3 篇](/zh/ai-agent/posts/geo-structured-content-tactics/) 的手艺）。优先 markitdown、mem0、langgraph。
- 重写高曝光低 CTR 页的标题与 description（含数字/结果承诺），对标 my-hugo。

**🟡 P2 · 证据 + Schema + 集群（1–2 月）**
- 给核心文补统计数据与外部引用（L3，+25~40% 可见度）。
- 给 How-to/对比类文加 `FAQPage`/`HowTo` schema（L4）。
- 围绕 Hugo/AI 工具/Go 建"支柱+子文+内链"集群（L4/L5），并把核心文分发到知乎/掘金/HN（[第 4 篇](/zh/ai-agent/posts/geo-trust-and-endorsement/) 的背书打法）。
- 顺手修 Accessibility（对比度、标题层级、tooltip aria-label）与 LCP。

---

## 域名迁移：别让这一步毁掉前面所有努力

一个容易被忽视、却能一票否决的事项：**cubxxw.com 是从旧域 cubxxw.com 迁移来的。**

- ✅ 已在 GSC 设置"地址变更（Change of Address）"，301 保留路径、实测有效（`cubxxw.com/projects/markitdown/` → 301 → `cubxxw.com/projects/markitdown/`，canonical 正确）。
- ⚠️ 新域资源较新，Search 数据仍在回填——**近期看历史要用旧域数据，未来 1–3 个月要盯新域把权重接过来。**
- 关键动作：**旧域 301 至少 180 天、两资源并存监控、核对每一条重定向。** 迁移期任何 404 或断链，都是在把前面所有 GEO 努力往水里倒。

---

## 常见问题（FAQ）

**Q：Lighthouse SEO 都 100 了，为什么还没流量？**
A：因为 Lighthouse 只测 L1 技术底座。GEO 的流量取决于 L2–L5（结构、证据、可引用、背书）和真实排名。技术满分是必要条件，不是充分条件。

**Q：87 万曝光不是挺多吗，为什么说是虚荣指标？**
A：因为其中大部分来自与主题无关的长尾噪声，位置靠后、零点击。有价值的是"精准技术词 + 被点击"，而不是曝光总数。

**Q：迁移期我最该盯什么？**
A：三件事——旧域 301 全部有效（无 404）、两个 GSC 资源的点击曲线一降一升、核心流量页（如 markitdown）在新域正常收录。

**Q：这套复盘方法我能复制到自己站吗？**
A：能。流程就是：PSI 测技术底座 → GSC 按点击和曝光双维度排序找集群与噪声 → 五层模型逐层对照找缺口 → 按 P0/P1/P2 排期。[第 6 篇](/zh/ai-agent/posts/geo-measurement-and-tools/) 会给出低成本的度量与监测工具。

---

## 小结与下一篇

这一篇把五层模型从"应该怎么做"变成了"我站上到底怎样、接下来改什么"。核心就一句：**技术满分只是起点，真正的增量在结构、证据、背书，以及守住域名迁移。**

但改造完怎么知道有没有效？传统的"排名+点击"在 GEO 时代会失灵。最后一篇，我们搭一套低成本的"被引率"度量体系。

- **上一篇**：[GEO 信任与背书 —— E-E-A-T 与站外分发](/zh/ai-agent/posts/geo-trust-and-endorsement/)
- **下一篇（第 6 篇·度量与工具）**：提示词测试法、AI 转介流量、GSC 交叉验证、Profound/Peec，以及用本仓库自带的 `geo:audit`/`gsc`/`psi` 脚本搭一套 DIY 监测。

---

*本文数据来源：我对 cubxxw.com（及旧域 cubxxw.com）的 Google Search Console 与 PageSpeed Insights 真实实测（2026-07）。方法论见本系列前四篇。*
