# Figwright MCP 查询与既有连接步骤

本轮沿用[GET-463已上线试点](figwright-2026-11-09.md)，主页面是[Figwright英文文章](https://cubxxw.com/engineering/posts/2026-09-26-figma-figwright-personal-design-system/)，中文用于双语入口核对。未改文章、标题、版本或运行时，也没有新增内容授权请求。

## 实际需求与日期

既有27日快照，以`2026-11-27T20:25:14.544Z`截止，前窗9月30日—10月27日→本窗10月28日—11月24日各28完整计划日期；精确主站Web/final、显式byPage。EN页面180曝光/1点击→258/1，本窗精确`figwright`175/0、`figwright mcp`14/0、`figwright plugin`2/0。[口径](../daily-quality/evidence/2026-11-28/search-summary.json)

MCP的14曝光分别在洛杉矶22日4次、23日6次、24日4次，均晚于已登记的EN候选首完整日21日。plugin则在19日和23日各1次，不能全放进候选观察期。它们支持“可能在找MCP与插件连接方法”的意图判断，但不证明0点击原因，也不解释所有258次页面曝光。匿名/内部未返回行unknown，页面点击不分配给返回为0的查询。[逐日原数](../daily-quality/evidence/2026-11-28/fig-query-dates.json)

## 官方步骤与已有答案

仅核文章已声明的[v0.7.0固定上游README](https://github.com/awdr74100/figwright/blob/afd947f62ec1e2588d2e72bd5a6e768c05227148/README.md)，不把固定版本升级为最新版认证。该版本通过本机MCP服务和Figma插件连接，桌面导入release中的manifest并检查连接。

| 需求假设 | 当前正文与实际HTML | 结论边界 |
| --- | --- | --- |
| 启动MCP服务 | 首部已有`@figwright/mcp@0.7.0`固定启动配置 | 已有具体答案；未运行服务器 |
| 配置Codex | `codex mcp add ... -- npx ...`符合本机help的stdio命令形状 | 只核帮助，未执行添加或写配置 |
| 安装插件 | 已链接v0.7.0 release并说明桌面导入manifest和画布侧运行 | 该版本步骤已说明，不声称Community最新版状态 |
| 确认连接、只读开始 | 已解释Connected、ping、先读取当前选区并核对目标 | 文本覆盖，未真实执行Figma连接或工具 |

双语源码在原部署5a、当前生产3a及本轮基线7076的blob相同。双语HTTP200，自canonical/语言互反/robots/JSON-LD和同页片段目标没有确认问题。[源码](../daily-quality/evidence/2026-11-28/source-binding.json)、[HTTP](../daily-quality/evidence/2026-11-28/fig-http.json)

## 决定与下一条件

不再插入重复连接段，也不据短期零点击改标题或试点参数。EN候选起点后仅4个完整计划日期，返回页面117曝光/0点击；ZH5个计划日期只在2天返回页面行、合计2/0，其余3天unknown。均未到14/28日，不判断增长、失败或因果。

T14截止仍为EN12月4日、ZH3日；T28为EN18日、ZH17日，并需相应数据覆盖。沿用22日已核crawl，不重复Fig检查或索引提交。[Google索引结果字段](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult)不返回保存的正文/搜索标题；候选起点不是具体HTML字节采用证明。[窗口](../daily-quality/evidence/2026-11-28/fig-window-status.json)

到期查询结构或真实阅读故障若指明具体缺口，再在既定授权内选择最窄调整并重新冻结观察条件。当前保持GET-463进行中，不重开已结案工程教程实施任务；完整选项、资源和验证限制见[当日日报](../daily-quality/2026-11-28.md)。
