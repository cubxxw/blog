# 适配器 · 海外技术平台（Dev.to / Medium / Hashnode / X）

**触发**："把 `2-master/<slug>.md` 分发到海外平台"
**产物**：一篇英文技术文（Markdown）+ 一条 X thread。

---

## 人群与机制
英文技术受众，重**技术含量、可复现、真实经验**，反感营销腔。Dev.to/Hashnode 靠标签社区分发；Medium 靠标题点击和阅读时长；X 靠 thread 前两条。SEO 归属要回指博客（canonical）。

## 生成规则

**语言**
- 地道英文**重写**，不是直译。技术术语精准，句子简洁主动。

**标题（英文钩子）**
套路择一：`How I …`、`Why … (and what to do instead)`、`N things I learned …`、`… from scratch`、`The one … nobody tells you`。含关键词但自然。

**结构**
- **TL;DR**：3-4 句话，开门见山给结论。
- 小标题分段（H2/H3），每段一个观点。
- 代码块可复现，配简短说明。
- 第一人称经验视角（"in my case…"）——海外平台吃"真实踩坑"。
- 结尾：takeaways + 一个引发评论的开放问题。

**SEO / 归属**
- 若母版已发博客，加 canonical 指回博客原文（Dev.to front matter `canonical_url`，Medium 用 import 或文末声明）。
- Dev.to front matter：`title` `published` `tags`（≤4，全小写）`cover_image` `canonical_url`。

**X thread 版本**
- 第 1 条 = 最强钩子 + 承诺收益，独立成立。
- 每条 ≤280 字符，一条一个点，从 `key_takeaways` 展开。
- 末条：CTA + 回指博客全文链接。
- 6-10 条为宜。

## 注意
- 不夸大、不标题党到失真，海外技术圈对 hype 容忍度低。
- 代码/命令确保真的能跑。
