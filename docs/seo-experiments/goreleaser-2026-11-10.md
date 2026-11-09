# GoReleaser：让 Action 读者直接找到示例

[GET-477](https://linear.app/getyak/issue/GET-477/help-goreleaser-action-readers-reach-the-right-example) 复用仍开放的[工程教程实验 #394](https://github.com/cubxxw/blog/issues/394)。本轮是具体提案，**尚未获文章发布授权、尚未上线**。[草稿 PR522](https://github.com/cubxxw/blog/pull/522) 只修改已有双语文章的入口段落与 lastmod。当前明确的内容修改授权仅覆盖 Figwright，因此本提案通过独立审查、适用 CI 与预览核验后交作者决定。

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

在原开篇后、Preparation / 准备工作之前加入一个直达段落，分别链接现有 GitHub Actions 与 Quick Start / 快速开始锚点。保留标题、摘要、发布日期、全部旧章节、每语68个完整 fenced code block；移除新增段落并恢复 lastmod 后可逐字节还原原文。[保存性检查](../daily-quality/evidence/2026-11-10/source-preservation.json)

候选 head `a3955d0446e10ac66b671ed83dcadcc30b7b04a0`，源码 CI [42690877586](https://github.com/cubxxw/blog/actions/runs/42690877586) success；独立审查无确认P0/P1/P2。[不可变预览](https://6af22967438d3f33e81e4189--cubxxw.netlify.app/engineering/posts/go-release-tools/) source 同 head。双语 HTTP 核验各9项通过：新段、链接、旧锚点、72个生成 pre 的原文本、title/description/hreflang/canonical，以及生产仍未出现提案。72个生成 pre 与68个源码 fence 是不同计数。

首轮读取工具对 HTML 可省略 p 结束标签和 preview canonical 作了错误假设，检查失败已[保留](../daily-quality/evidence/2026-11-10/preview-readback-first.json)；修正读取工具后[复验通过](../daily-quality/evidence/2026-11-10/preview-readback.json)，文章源码未为此改变。预览 canonical 绑定 Netlify API 的 deploy-preview URL，不伪称生产 canonical。此为 HTML 检查，不是浏览器或生产验收。

如果作者批准，再按最新 head 与现有门禁正常合并，读取 Netlify 实际生产 source、双语段落/锚点及元数据。上线后确认 Google 新版抓取，再从首个完整 GSC 数据日开始14天观察、28天判读；当前这些日期均未确定。预期是减少寻找已有示例的步骤，不预报点击提升百分比；查询组与页面指标分别报告，不把本轮内容入口单独认定为 CTR 原因。

## 本轮设备、国家补数边界

GET-478通过既有只读Snapshot补齐56天，两个独立切片前后窗各28完整计划日期，[覆盖与上下文](../daily-quality/evidence/2026-11-10/backfill-coverage.json)保留。Google内部全部行覆盖仍未知；同一snapshot的无过滤英文页面为1103曝光/2点击，主站page过滤的device/country切片各仅合计38/0，其中设备桌面36、手机2。两组分母不同，不用38解释全页点击，也不凭缺行填0；查询与设备/国家没有联合采集，不能推断某个查询的手机或国家表现。具体过滤差额留下一轮受控调查。[聚合证据](../daily-quality/evidence/2026-11-10/backfill-target-cuts.json)
