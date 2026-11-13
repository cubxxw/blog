# GoReleaser：让 Action 读者直接找到示例

[GET-477](https://linear.app/getyak/issue/GET-477/help-goreleaser-action-readers-reach-the-right-example) 复用仍开放的[工程教程实验 #394](https://github.com/cubxxw/blog/issues/394)。**最新状态（2026-11-14）：PR522已在作者对该PR的单次处置授权记录下由外部合并并上线，双语生产验收通过；Google新版抓取及点击效果仍待观察。** [PR522](https://github.com/cubxxw/blog/pull/522)仅修改已有双语文章的入口段落与lastmod；本轮没有重复修改或合并正文，不扩大其他文章授权。以下提案和等待记录保留各自历史时点，最新交付见末节及[14日日报](../daily-quality/2026-11-14.md)。

## 查询、意图与已有正文

使用现有 GSC 快照，主站精确 hostname、Web / final、显式 byPage。当前完整28天为2026-10-10—11-06，上一完整窗口9-12—10-09，报告 asOf 为2026-11-09T20:05Z。数据截止于本提案之前，不是上线效果。[原数与覆盖](../daily-quality/evidence/2026-11-10/target-window-evidence.json)保留页面与返回查询，含 fragment 的页面行不合并到 canonical URL。

| 对象 | 当前曝光 / 点击 / CTR / 平均位置 | 前窗曝光 / 点击 / CTR / 平均位置 |
| --- | --- | --- |
| 英文 canonical 页面 | 1103 / 2 / 0.18% / 7.52 | 3393 / 0 / 0% / 6.86 |
| 中文 canonical 页面 | 21 / 0 / 0% / 5.62 | 72 / 0 / 0% / 4.92 |
| 英文页 × goreleaser/goreleaser-action | 8 / 0 / 0% / 8.75 | 35 / 0 / 0% / 7.06 |
| 英文页 × goreleaser action | 2 / 0 / 0% / 8.50 | 11 / 0 / 0% / 7.73 |
| 英文页 × goreleaser-action | 1 / 0 / 0% / 8.00 | 7 / 0 / 0% / 8.00 |

后三个精确 Action 查询当前共11曝光/0点击，样本很小，不能解释全部1103次页面曝光，更不能将页面2次点击分配给未返回的查询。可见查询覆盖受匿名与接口限制；没有返回的行保持未知。首次默认报告显示上限之外的配对由同一报告的展示上限5000补看，未改变采集器、API分页或自动修改门禁。

公开搜索用于核查含义，未固定国家、设备或登录状态，返回顺序不当成 Google 实际排名。上游 [Action 文档](https://www.goreleaser.com/customization/ci/actions/)、[Action README](https://github.com/goreleaser/goreleaser-action/blob/master/README.md) 和 [snapshot 文档](https://goreleaser.com/customization/publish/snapshots/) 与正文核对：读者需要 tag 触发、contents: write、token 及本地不发布的检查路径。原标题已明确 GoReleaser v2，正文也已有正确工作流和 snapshot 示例，本轮不重复改标题、不重写已验证代码。

## 最小提案与验证

在原开篇后、Preparation / 准备工作之前加入一个直达段落，分别链接现有 GitHub Actions 与 Quick Start / 快速开始锚点。保留标题、摘要、发布日期、全部旧章节和代码块；移除新增段落并恢复 lastmod 后可逐字节还原原文。[提案阶段保存性检查](../daily-quality/evidence/2026-11-10/source-preservation.json)的列首正则覆盖每语68块；14日独立复核补计4个列表内围栏，完整72块均保真，见末节。

候选 head `a3955d0446e10ac66b671ed83dcadcc30b7b04a0`，源码 CI [42690877586](https://github.com/cubxxw/blog/actions/runs/42690877586) success；当时独立审查无确认P0/P1/P2。[不可变预览](https://6af22967438d3f33e81e4189--cubxxw.netlify.app/engineering/posts/go-release-tools/) source 同 head。双语 HTTP 核验各9项通过：新段、链接、旧锚点、72个生成 pre 的原文本、title/description/hreflang/canonical，以及生产仍未出现提案。旧源码计数68仅是列首正则子集，不能与完整72个生成pre并列为两种完整总数；本轮已补齐源码解析计数。

首轮读取工具对 HTML 可省略 p 结束标签和 preview canonical 作了错误假设，检查失败已[保留](../daily-quality/evidence/2026-11-10/preview-readback-first.json)；修正读取工具后[复验通过](../daily-quality/evidence/2026-11-10/preview-readback.json)，文章源码未为此改变。预览 canonical 绑定 Netlify API 的 deploy-preview URL，不伪称生产 canonical。此为 HTML 检查，不是浏览器或生产验收。

如果作者批准，再按最新 head 与现有门禁正常合并，读取 Netlify 实际生产 source、双语段落/锚点及元数据。上线后确认 Google 新版抓取，再从首个完整 GSC 数据日开始14天观察、28天判读；当前这些日期均未确定。预期是减少寻找已有示例的步骤，不预报点击提升百分比；查询组与页面指标分别报告，不把本轮内容入口单独认定为 CTR 原因。

## 本轮设备、国家补数边界

GET-478通过既有只读Snapshot补齐56天，两个独立切片前后窗各28完整计划日期，[覆盖与上下文](../daily-quality/evidence/2026-11-10/backfill-coverage.json)保留。Google内部全部行覆盖仍未知；同一snapshot的无过滤英文页面为1103曝光/2点击，主站page过滤的device/country切片各仅合计38/0，其中设备桌面36、手机2。两组分母不同，不用38解释全页点击，也不凭缺行填0；查询与设备/国家没有联合采集，不能推断某个查询的手机或国家表现。具体过滤差额留下一轮受控调查。[聚合证据](../daily-quality/evidence/2026-11-10/backfill-target-cuts.json)

## 2026-11-11 同日控制与新窗口

[GET-487的两日真实控制](gsc-scope-2026-11-11.md)补齐上段调查：同维度有无hostname过滤结果相同，page auto/byPage也相同；设备/国家维度出现较低指标或目标缺行。旧1103对38不能直接归因于过滤，移除过滤没有恢复指标，本轮不改采集默认值。Google内部具体原因与全28天归因仍未知。

新完整窗10-11—11-07英文页面1136曝光/2点击/CTR0.18%，前窗9-13—10-10为3099/0/0%；中文22/0/0%，前窗72/0/0%。精确Action查询中`goreleaser/goreleaser-action`8/0、`goreleaser action`2/0，`goreleaser-action`本窗未返回，不能搬用旧值或补零。[新窗口原数](../daily-quality/evidence/2026-11-11/search-target-evidence.json)不覆盖原冻结窗口。

在11月11日这一观察时点，文章提案仍是原head a3955d0的草稿PR522，未获新答复、未合并或上线；当时GET-477保持In Progress/need human，未重复询问。上述数据调查不扩大文章授权。

## 2026-11-14：接续已授权发布的生产验收

[11月13日处置说明](https://github.com/cubxxw/blog/pull/522#issuecomment-6848213708)记录作者对PR522的明确单次授权。该PR于08:41:30 UTC由外部合并，merge `62b2f54cd779da55a0703abd90a2b080bf8d46af`；Netlify生产`6af6cd3c05ce7467a6ab6611`于08:44:36.637 UTC发布ready。本聊天本轮只接续验证与登记，没有再提交或合并文章。[发布与主干CI读回](../daily-quality/evidence/2026-11-14/release-observation.json)

两个生产文章blob与此前独立审查head `a3955d0446e10ac66b671ed83dcadcc30b7b04a0`精确相同；本轮用仓库MarkdownIt计入列首68块与列表内4块，每语完整72个源码fence的原始围栏范围与发布前parent逐字节相同。HTTP生产与旧不可变5a部署比较，新增段落、实际href/目标锚点、旧ID、原72个生成pre文本、标题、摘要、canonical和语言声明各10项通过。另有双语×桌面手机4个真实锚点点击旅程及原36日检首次通过，0失败/重试/跳过/全局错误。[源码](../daily-quality/evidence/2026-11-14/source-preservation.json)、[HTML](../daily-quality/evidence/2026-11-14/production-entry-checks.json)、[浏览器](../daily-quality/evidence/2026-11-14/go-browser-counts.json)分别保存，不把源码fence与生成pre核验混用；原计数缺口保留为已修正P2。

新增上线前参考窗口10月14日—11月10日与9月16日—10月13日各28完整计划日期，asOf13日19:59:42Z，主站Web/final/byPage。英文1240/3/CTR0.24%，前2212/0；中文22/0，前67/0。英文可见Action词`goreleaser/goreleaser-action`6/0、`goreleaser action`1/0，精确`goreleaser-action`未返回保持未知。全部日期早于11月13日发布，不能解释为本次收益，也不覆盖原11月10日1103/2冻结基线。[配对原数](../daily-quality/evidence/2026-11-14/target-evidence.json)

只读[43498816225](https://github.com/cubxxw/blog/actions/runs/43498816225)报告Go EN最近抓取2026-11-07T10:21:48Z、ZH2026-10-29T22:55:22Z，两页PASS/允许索引/自canonical一致，仍早于本次发布。没有重复索引提交，Google索引HTML/标题采用版本没有新证据。首个完整效果日及T14/T28均未知；确认新版抓取后按洛杉矶日期另行冻结完整14/28日观察，不用当前上线前窗口替代。页面、精确查询及站点背景分母分别报告；小样本不作因果结论。

GET-477实施范围在本轮文档交付和最终平台验收后结案；搜索效果继续在本登记与工程教程实验#394观察。原need human来自当时的正文授权等待，不应在上述外部授权与实际发布后继续当作技术阻塞。Figwright效果观察GET-463保持进行中。
