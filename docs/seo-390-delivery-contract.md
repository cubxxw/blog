# SEO #390：实施目标、架构与验收合同

状态：研究与基线已复核；实现、发布与搜索观察分别验收。日期：2026-09-24（Asia/Shanghai）。

主任务：[390](https://github.com/cubxxw/blog/issues/390)。初始源码：`2b6bbeae9779cb6c36d23409297ef43135b5cb7d`。

## 目标

让已经在搜索中被看见的文章更准确地回答读者的问题，并让维护者能解释每次改进依据什么、改变了什么、效果是否可测。交付一条可靠的采集、分析、候选评估、有限改进和复测链路；保留 Hugo 服务端内容、双语 URL 和博客原有表达。

技术健康、实验室性能、搜索表现分开记录。Lighthouse SEO 分数衡量基础检查，不能证明排名、点击或内容价值；不为提高数字改变测量口径、删减正文、扩大 noindex 或制造近重复文章。

## 已核实的起点

父代理从历史 `data/seo/gsc-*.json` 独立重算 `date_page`：相同日期选最新快照整日结果，hostname 严格等于 `cubxxw.com`。

| 数据窗口（GSC 原始日期） | 日期覆盖 | 点击 | 曝光 | CTR | 曝光加权位置 |
|---|---:|---:|---:|---:|---:|
| 2026-07-27—08-23 | 28/28 | 119 | 61,892 | 0.192270% | 14.2253 |
| 2026-08-24—09-20 | 28/28 | 141 | 93,015 | 0.151588% | 10.6474 |

这是返回的页面行汇总，不是 property 图表总量。旧数据缺少 query×page；不能把全域查询猜配到某篇文章。上述历史重算还不能证明新的分页采集、空日处理和失败恢复正确。

源码诊断：

- `gsc-fetch.mjs` 默认抓取重叠三日窗口，单次 5,000 行，无分页、独立 date 总量或 query×page；旧注释 `--lookback 28` 实际为 29 天。
- `psi-fetch.mjs` 对所有指标使用 `Math.round`，会丢失 CLS 小数；`total-byte-weight` 等机会项被统一标成 `wastedMs`，混淆字节与时间。
- 2026-09-23 PSI 为 13 URL × 2 策略，15/26 成功、11/26 失败；失败不能充当零分或源站 500。
- Analyze 指令比较相互重叠的三日窗口，并把低 CTR 自动视为重写标题机会；对空查询、跨语言或子站的推断缺少证据。
- Analyze 失败日志显示 Claude 初始化后首轮 `is_error: true`、耗时约两秒，没有足够诊断确认是鉴权、模型、额度或其他原因。该次运行无可下载 artifact；不猜根因。
- `layouts/partials/seo.html` 对显式 description 也执行 `truncate 160`，可能在服务端截断作者完整摘要。

## 什么是好的设计

搜索入口的承诺应与正文答案一致。标题说清实际任务，摘要交代对象、范围和限制，首屏用少量具体入口帮助读者定位；目录、稳定锚点和上下文内链承担导航，不靠关键词墙。

工程教程保持代码可复制、版本可核对、适用条件明确。月度笔记保留完整档案和作者判断，只为经证据确认的主题增加入口。项目页提供确实有材料支撑的理解、实现或选型答案，保留 BEAR OS 默认视图及双向切换。中英文分别服务各自读者，保留 URL/canonical/hreflang。

视觉修改先证明问题，使用既有排版和 token；不把测量与内部调试信息放进读者流程。首屏正文和 LCP 资源可直接从 HTML 发现；没有 JavaScript 时正文、链接、目录仍可使用。深浅主题、键盘、移动端不得因性能改动回归。

## 架构决策

1. **事实采集与派生报告分离。** 原始快照不可回写修饰历史；新 schema 明确版本、property、hostname 范围、search type、聚合方式、过滤条件、数据时区、抓取时间、每个日期/切片状态及分页证据。
2. **以完整日期/切片替换重叠数据。** 成功空响应、缺失、失败、部分分页、旧格式未知完整性使用不同状态。失败不能覆盖已成功结果；已确认日期可用的成功空日才能替换旧结果。历史缺行不补成零。范围或聚合方式不同的切片不可互相覆盖。
3. **确定性脚本负责数字和状态。** 模型只能解释已验证报告和提出带证据候选。即使模型不可用，采集完整性和分析失败状态也必须呈现。
4. **建议先于自动修改。** Autofix 默认预演；新鲜度、完整性、page-query 证据不足时安全跳过。低 CTR 只是调查信号；不自动制造标题方案或新内容。
5. **工作流只编排，模块可离线验证。** 采集、聚合、报告、门槛各有可注入 HTTP/时钟的纯函数；CLI 保留现有使用方式。GitHub 凭据仅留在既有 secrets，Pi Token Plan 不进入 CI。

## 分批派工与完成标准

| 批次 | 对应任务 | Pi 所有权和产物 | 父代理验收 | 仍需外部证据 |
|---|---|---|---|---|
| A | [391](https://github.com/cubxxw/blog/issues/391) | GSC 采集、版本化日切片、兼容聚合器、测试、56 天比较与使用文档 | 分页、空日、失败、重复和乱序输入；历史 141/93,015 可复现；CTR/位置正确 | 新 56 天采集、GSC 同过滤 UI 核对 |
| B | [392](https://github.com/cubxxw/blog/issues/392) | PSI 精度/单位/有限重试；确定性报告；Analyze/Autofix 状态与预演门槛 | 500 分类、timeout/runtimeError、15/26 分母、旧 CLS 精度未知；模型失败仍有状态 | 手动 Analyze 读回同日日报；随后 3 次计划运行 |
| C | [393](https://github.com/cubxxw/blog/issues/393) | 有限 URL Inspection 只读采集、URL 分诊记录与精确重定向验证；真实导出到齐后再处理其格式 | 主站/子站与 sitemap 分离；无循环、终点语义对应；不泛跳首页；索引版本与实时 HTTP 状态分开 | 全 11 类 GSC 导出、P1 URL Inspection、迁移设置、T+14/T+28 |
| D | [395](https://github.com/cubxxw/blog/issues/395) | 固定条件性能测量和有因果证据的资源修复 | 每 URL 前后各 ≥3 次、median/范围、LCP 元素与瀑布、CLS 元素；正文与导航无回归 | 同条件线上复测；CrUX 样本不足保持未知 |
| E | [394](https://github.com/cubxxw/blog/issues/394) | 3 篇教程的查询/内容缺口表与有限改进；完整 description 渲染 | 技术示例针对性验证；真实独有摘要；URL/双语互指；一个可解释变量组 | query×page/device/country、Google 重抓后完整 28 天 |
| F | [396](https://github.com/cubxxw/blog/issues/396) | 1–2 页月档案入口提案、一个有独立价值的选题 brief | 不丢档案/锚点/引用；不默认 noindex、不伪造观点 | 查询证据、作者内容选择与新文终审、T+28 |
| G | [397](https://github.com/cubxxw/blog/issues/397) | LangGraph/Mem0 意图表、经核实的内容及相关内链 | 官方来源和真实示例；独特价值；保留 Products 双视图 | 查询证据、重抓后 28 天 |

A/B 为基础，C/D 可在证据许可时调查；E/F/G 不猜测 A 尚未提供的 page-query 关系。父代理可以修复明确的通用渲染缺陷，但须把它与特定页面的搜索实验区分记录。

A 的新快照 schema 与 B 的 Analyze 消费者迁移必须一起集成发布，避免旧工作流继续读取错误的维度或快照。独立合同审查已补充：同日快照追加且原子写入；数据可用截止日独立于 HTTP 成功；语义选择键不含抓取窗口/分页参数；跨页重复键或聚合变化视为不完整；必需切片失败即记录证据并非零退出。

报告的 `as-of` 是抓取观察时间截止点，与流量起止日期分开；晚于截止点的快照和可用性探测不得进入回放。摘要必须继承底层数据的范围、覆盖与失败状态。默认公开基线不包含原始查询，显式查询视图保留真实 query+page 组合和输出限制，供后续页级候选验证。

## 每份 Pi 合同必须写清

- 冻结源码 SHA、目标、允许修改路径、输入证据、非目标及环境。`xiaomi-token-plan-cn/mimo-v2.6-pro`，high thinking；一仓库一个活动 Pi writer。
- Pi 负责范围内实现、局部测试与第一轮自审；它不是独自在代码库，不能撤销其他任务修改，不递归委派。
- 先完成小闭环再扩展。每次回报列出实际命令、退出码、产物、失败及未验证项；禁止以测试数量或自评分替代验收。
- 不提交、推送、部署或修改外部 issue；父代理拥有最终 diff、独立 review、集成和交付。保护当前 #389 交互组件任务。
- 失败先检查证据再返工，同一任务 `resume`，保留累计计数。`ready_for_review` 只代表本地检查通过。

## 验收指标与否决项

| 维度 | 合格证据 | 否决项 |
|---|---|---|
| 测量正确性 | 同输入输出一致；56 日期完整标记；可解释的 page/property/query 差异 | 重复计数、平均 CTR、缺失当零、部分分页冒充完整 |
| 状态可靠性 | 采集/完整性/分析/自动修复各自显示状态、时间和运行链接 | 有日报就当 Analyze 成功、原始凭据进入日志 |
| 技术 SEO | 目标页面 200、规范页、预期索引策略、双语互指、完整真实摘要 | 改 URL 无映射、滥用 noindex、模板固定截断、关键词堆砌 |
| 读者体验 | 首屏找到任务入口、答案与标题一致、SSR/锚点/无障碍保持 | 客户端隐藏正文跑分、删作者表达、虚构实践 |
| 性能 | 同一工具版本、设备、网络、缓存和 CPU 条件至少 3 次；LCP/CLS 原因明确 | 单次总分当结论、单位混用、把实验室数值写成用户 p75 |
| 搜索效果 | 重抓后完整 28 天，查询/设备/国家/位置分层并保留对照 | 承诺固定涨幅、把同期波动宣称因果、未观察就关 issue |

实验室目标 LCP ≤2.5s、CLS ≤0.1；达不到时报告残余瓶颈。Lighthouse SEO 以目标模板基础检查通过为目标；分数无需与搜索成效合成为一个“98 分”。

## 证据与发布记录

每个批次记录基线 SHA、实现 SHA、review 结论、验证命令、线上读回及剩余验收。实验记录包含路径、查询证据、假设、旧/新变量、未改对照、部署日期、Google 重抓日期、观察起止日。观察窗口不从代码提交时间猜起。

仓库当前 `CLAUDE.md` 默认直接提交并推送 main，不默认建 PR。Pi 在隔离分支实现，父代理检查最新远端和并行工作后集成；不得覆盖未提交修改或绕过适用门禁。只有实际完成的验收可以标完成，#390 保持持续改进主线；外部时间窗口未到的子任务保持开放。

本任务不自动发布新文章，不修改 Search Console 设置，不迁移凭据，不新建收费服务，不清理其他任务产物。

## 官方依据

- [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)：请求/响应、日期、聚合、分页与过滤语义。
- [Getting your performance data](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)：逐日采集和分页仍受内部行数及维度限制。
- [PSI v5 response](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed)：实验室、运行错误和字段数据的分离。
- [Google snippets](https://developers.google.com/search/docs/appearance/snippet) 与 [title links](https://developers.google.com/search/docs/appearance/title-link)：具体、准确、页面独有的承诺，不保证 Google 采用提供的文字。
- [Optimize LCP](https://web.dev/articles/optimize-lcp) 与 [Optimize CLS](https://web.dev/articles/optimize-cls)：定位资源发现、传输、渲染和布局位移原因。
- [Site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)：逐 URL 迁移与监测。
