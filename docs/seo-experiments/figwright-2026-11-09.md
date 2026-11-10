# Figwright 搜索点击试点

任务：[GET-463](https://linear.app/getyak/issue/GET-463/figwright-搜索点击试点明确入口补齐连接步骤并验证上线)。作者于2026-11-09明确授权完成该既有文章的搜索意图调查、修改、验证与上线。实施起点为 main `7f302b5366824860f45dfdf75831941e52665923`。

本轮页面实施状态：已上线并通过双语HTML核验，最终产品提交`5a0673739f6732696a661da65fabb06fca58aa70`。Google已接受两页[索引请求](evidence/figwright-2026-11-09/indexing-requests.json)，仍待确认新版实际抓取；搜索点击效果未验收。发布、失败与实际验证见[本轮日报](../daily-quality/2026-11-09-seo-clicks.md)。

## 基线与来源

Google Search Console，`sc-domain:cubxxw.com`，主站精确 hostname，Web / final，GSC 数据日期 America/Los_Angeles。使用仓库 `gsc-report.mjs`，显式 `--summary-response-aggregation byPage`；重叠快照按现有逐日选择规则去重。当前完整窗口2026-10-09—11-05；前一窗口2026-09-11—10-08。最新快照为11月8日采集的 `data/seo/gsc-2026-11-08.json`，数据截至11月5日。

| 语言 / 口径 | 曝光 | 点击 | 平均位置 |
| --- | ---: | ---: | ---: |
| 英文页面汇总，当前窗口 | 229 | 0 | 6.18 |
| 英文页面 × figwright，当前窗口 | 162 | 0 | 6.65 |
| 中文页面汇总，当前窗口 | 28 | 1 | 9.14 |
| 中文页面 × figwright，当前窗口 | 11 | 0 | 10.64 |
| 英文页面汇总，前一窗口 | 54 | 1 | 6.76 |
| 英文页面 × figwright，前一窗口 | 8 | 1 | 12.13 |

查询明细并非全部流量，不能把229与162的差值解释为未被覆盖的需求类型。前一窗口英文目标词只有8次曝光，不能据点击率作显著性判断。未返回的中文旧窗口行保持未知，不填零。

[基线原数](evidence/figwright-2026-11-09/gsc-baseline.json)保留窗口、完整性、页面行与返回的查询配对。11月9日上线前通过既有只读[Google索引检查](https://github.com/cubxxw/blog/actions/runs/42551163585)实际查询两页，均已收录、允许索引，Google与页面声明的canonical一致。英文最近抓取为9月26日10:30:38 UTC，中文为11月1日10:18:51 UTC；这是旧版的抓取记录，后续需要确认新版抓取。[检查原件](evidence/figwright-2026-11-09/inspection-before.json)

目标地址保持不变：

- [英文文章](https://cubxxw.com/engineering/posts/2026-09-26-figma-figwright-personal-design-system/)
- [中文文章](https://cubxxw.com/zh/engineering/posts/2026-09-26-figma-figwright-personal-design-system/)

## 搜索意图调查

2026-11-09使用公开网页搜索采样 `Figwright`、`Figwright MCP setup Figma`、`"figwright" setup codex`、`"figwright" free Figma` 和站点限定词。它不是固定国家、设备或登录状态的 Google 排名重现，不把返回顺序写成 Google 的实际排名。只有精确查询 `figwright` 在上述 GSC 配对中有已观察证据；扩展查询用于检查含义，不声称有额外搜索量。

品牌词采样首先给出[项目仓库](https://github.com/awdr74100/figwright)、[npm 包](https://www.npmjs.com/package/@figwright/mcp)和官方设置内容。项目维护者的[公开介绍](https://github.com/521xueweihan/HelloGitHub/issues/3478)说明同一用途：双向读写、MCP客户端加Figma插件、免费套餐可用。上游当前发布版本为[v0.7.0](https://github.com/awdr74100/figwright/releases/tag/v0.7.0)，固定提交`afd947f62ec1e2588d2e72bd5a6e768c05227148`。

| 意图判断 | 依据 | 原文缺口 | 本轮处理 |
| --- | --- | --- | --- |
| 找工具、知道它做什么，判断置信度较高 | 品牌查询配对；仓库和包说明直接回答用途 | 原标题以“一个人维护界面”起笔；定义在较深的Figwright章节 | 标题前置Figwright；正文首段说明第三方、双向、免费边界，并链接固定上游说明 |
| 连接工具、完成第一次读取，判断置信度中等 | 上游README有Setup与Connect；扩展查询出现安装内容 | 原文只有概括性的manifest导入说明，没有可用客户端配置及读取检查 | 增补版本固定的Claude Code JSON、Codex命令、插件导入和ping后只读检查 |
| 让工具服务长期设计维护，原文的主要命题 | 原文已有token、组件映射、卡片改版及平台边界 | 内容有价值，但先接触工具的读者需要先建立连接 | 保留原作者段落、主体章节、图表与旧版源码引用，再从连接入口进入维护练习 |

这些证据支持更明确的入口与安装路径，仍不能证明所有未点击曝光都由标题造成。本轮标题、摘要与前部答案一起变更，是一个入口与任务完成度的组合实验，不能把后续变化单独归因于标题。

## 变更边界

发布日期、URL、标签、封面、原有章节锚点和主体论述保持。增加真实 `lastmod`。新连接步骤固定v0.7.0；原token、组件与design_diff源码分析仍注明9月26日的`ee1ad57`，不将版本号升级等同于全文重新验证。

本轮没有新增实测成功的个人经历。连接步骤依据上游README，Codex命令格式按本机CLI帮助和[官方MCP说明](https://developers.openai.com/codex/mcp/)核对。文章验证与真实Figma插件操作属于不同证据范围，未实际执行的操作照实记录。

## 验证与效果观察

本轮的适用检查、上线SHA、可信部署和线上读回记在[本轮日报](../daily-quality/2026-11-09-seo-clicks.md)。该记录的发布状态以实际验收为准，不借已有页面200或历史CI成功证明本次上线。

后续每日任务先核对这两个URL的Google索引版本与最近抓取时间。确认采用新版之后，以首个完整GSC数据日开始观察28天；第14天只作中期记录。未确认抓取则保持待确认。英文和中文分别报告页面汇总及精确`figwright`配对；新增词另列，不倒填入基线。

英文Mem0页面作为未同步改写的背景参考，当前完整窗口406曝光/1点击/平均位置7.23，前一窗口781/4/7.31。它的主题与需求不同，只用于观察站点背景变化；一旦自身改动或抓取状态不匹配，标记受干扰，不作为因果对照，也不阻止更高价值的后续工作。

每次观测写清窗口、已知抓取状态、数据新鲜度和是否达到判读条件。样本仍不足时延长观察，不能把短期零点击或少量增长写成确定结果。Google标题与摘要是自动生成的，本次HTML更新不证明搜索结果已采用它们。[标题说明](https://developers.google.com/search/docs/appearance/title-link)、[摘要说明](https://developers.google.com/search/docs/appearance/snippet)

## 2026-11-10 续查

复用只读索引检查 [42689692761](https://github.com/cubxxw/blog/actions/runs/42689692761)，双语页仍 PASS、可索引且 canonical 匹配。英文最近抓取2026-09-26T10:30:38Z、中文2026-11-01T10:18:51Z，均早于实际部署2026-11-09T02:42:28.419Z。[检查与来源摘要](../daily-quality/evidence/2026-11-10/inspection-summary.json)保留源 SHA 和原件 hash。没有再次提交索引请求，未观察到新版抓取，首个可计入效果的完整GSC日、14天与28天判读日仍为未知。

新完整窗口10-10—11-06英文页面235曝光/0点击/CTR0%、精确 figwright 168/0/0%，中文页面30/1/3.33%、精确查询11/0/0%；前窗9-12—10-09英文页面57/1、精确查询9/1，中文旧行未返回保持未知。[新窗口原数](../daily-quality/evidence/2026-11-10/target-window-evidence.json)单列，未覆盖上文10-09—11-05冻结基线。新窗口也全部早于本次部署，不作为修改后的效果。补数前，设备与国家切片在该窗口无可计入日期，已由GET-478修复定时采集并补齐前后窗各28个计划日期；过滤切片的分母与无过滤页面不同，内部覆盖仍未知，不能替代原基线，详见[10日日报](../daily-quality/2026-11-10.md)。

## 2026-11-11 续查

只读[42893703167](https://github.com/cubxxw/blog/actions/runs/42893703167)两页均PASS、可抓取且canonical匹配；英文最近抓取仍2026-09-26T10:30:38Z、中文2026-11-01T10:18:51Z，均早于实际部署。[原始归属与回执](../daily-quality/evidence/2026-11-11/fig-crawl-readback.json)已核对。没有再次索引提交，效果首个完整日、T14、T28仍未知，GET-463保持In Progress。

新窗口10-11—11-07英文页面244曝光/0点击/CTR0%、精确figwright177/0/0%；中文页面30/1/3.33%、精确查询11/0/0%。前窗9-13—10-10英文页面59/1/1.69%，中文未返回保持未知。窗口完全在部署前，[新原数](../daily-quality/evidence/2026-11-11/search-target-evidence.json)与冻结基线分列，不作上线效果。[设备/国家分母对照](gsc-scope-2026-11-11.md)仅支持各上下文独立报告，不改变本实验主指标。
