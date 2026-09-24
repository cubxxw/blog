# #390 实施证据

更新：2026-09-24。目标与各子任务验收见 [交付合同](seo-390-delivery-contract.md)。

## 已完成的研究与小修复

- 逐个读取 #391–#397；历史主站 page 行独立复算为前期 119 点击/61,892 曝光、当前 141/93,015，两个窗口各覆盖 28 个日期。
- 首批 GSC 合同经过独立只读审查，补齐不可变同日重跑、空日可用性、跨页冲突、语义切片身份与 A/B 同时集成门槛。
- 线上 sitemap 按 sitemap namespace 的 `url/loc` 计数为 **417 个唯一页面**，不把 image namespace 的 `loc` 算作页面。
- 12 个目标页面（GoReleaser、GitHub Actions、Hugo、LangGraph、Mem0、2026-03 笔记，各中英文）均返回 200，在 sitemap 中，自指 canonical；样本内 en/zh/x-default 互指无错误。这是样本核验，未宣称全站 Google 收录状态。
- `npm run redirects:check`：297 条规则，无重复 source、循环或链式跳转。这是静态规则检查，不替代所有历史 URL 的线上语义核验。
- 2026-09-23 PSI 实际样本确认 CLS 丢失精度：英文 ai-agent desktop 的 displayValue 为 `0.104`，numericValue 却为 `0`；另一个 total-byte-weight 为 `2,786,034` bytes，被标记为 `wastedMs`。将在 B 修正采集与旧格式解释，历史原始文件不回写。

### 日报文字完整性（#392）

共享 helper 把 Markdown 当作 JavaScript replacement string，遇到 `$&`、`$'` 等字符会插入旧内容或邻接小节。改为 callback replacement，保留文字原样。`node --test scripts/daily-report-issue.test.mjs`：**7/7 通过**，覆盖字面量、marker 引用、相邻小节及重复发布。

这项修复不声称解决不同工作流同时写日报的竞争；B 仍需共用发布串行边界和可信发布器隔离。

### 完整摘要渲染（#394 / #397 的通用模板前置修复）

`layouts/partials/seo.html` 现在保留作者显式 description 的完整纯文本，只对自动生成的 Summary 保留长度限制，meta/OG/Twitter 使用一致值。没有改文章标题、摘要原文、URL 或 canonical。

在 **Hugo 0.145.0 extended** 的最小生产 minify fixture 中，对实际 SEO partial 做修改前后验证；不相关 pagination、author 和 structured-data partial 使用隔离 stub，因此这不是全站构建验收：

| 场景 | 修改前 | 修改后 |
|---|---|---|
| 206 字符英文显式摘要 | 160 字符，末尾省略号 | 206 字符，与输入一致 |
| 252 字符中文显式摘要 | 162 字符，末尾省略号 | 252 字符，与输入一致 |
| 无显式摘要的长正文 | 156 字符摘要，末尾省略号 | 相同 |
| 社交摘要 | 三种 meta 一致 | 三种 meta 一致 |

该修复消除本地模板截断；Google 是否采用摘要、点击是否变化尚未观察。

## 尚未完成

- A/B 的 GSC 采集与报告、PSI 精度/重试、模型诊断、可信发布与 Autofix 预演实现及独立验收。
- Search Console UI 加载超时；本机没有 GSC/API 环境凭据。GitHub secrets 名称存在，值未读取，不能据名称声称可用。新 query×page/56 天采集、UI 同口径总量、11 类索引导出、URL Inspection 与迁移设置仍待核验。
- #395 固定条件的前后各三次性能测量、LCP/CLS 原因与改进；尚未宣称分数提升。
- #394/#396/#397 依赖 page-query 的内容实验、作者内容终审和重新抓取后的 28 天观察；没有新文章发布。
- 当前实现只在隔离分支：尚未推送、未线上发布、未验证交付 SHA 的 CI、未关闭任何子任务。
