# 二月思考笔记：先核对查询与档案入口

本轮从[搜索增长队列](../seo-growth-priorities.md)选择[中文二月思考笔记](https://cubxxw.com/zh/growth/posts/2026-02-thought-notes/)，接续[总任务 #390](https://github.com/cubxxw/blog/issues/390)。这是具体证据调查，没有改文章、标题、索引规则或运行时代码，也没有请求扩大文章授权。

## 页面分母与可见查询

复用既有快照，asOf `2026-11-26T20:06:47.308Z`，精确主站、Web/final、显式 byPage。前窗9月29日—10月26日、本窗10月27日—11月23日，各28完整计划日期。[原数与上下文](../daily-quality/evidence/2026-11-27/search-summary.json)

| 页面 | 前窗曝光 / 点击 / CTR | 本窗曝光 / 点击 / CTR |
| --- | --- | --- |
| ZH canonical，主要页面 | 2931 / 1 / 0.034% | 2178 / 2 / 0.092% |
| EN canonical，辅助核对 | 839 / 3 / 0.358% | 606 / 3 / 0.495% |

中文前窗返回9个真实 query×page 配对、44曝光/0点击；本窗5个配对、10曝光/0点击。页面汇总与查询请求上下文不同，不能把10除以2178称为完整查询覆盖率，也不能把页面2次点击分配给没有返回的查询。缺行不是零，内部行覆盖仍未知。

两条可见短语涉及“物理时间/心理时间”和“可能性”的表达，共5曝光/0点击，发生在洛杉矶日期11月15—16日；其余配对也都早于11月20日UTC的本次最近抓取。这只支持“可能在定位某段表达”的假设，不证明稳定的单一主题需求。原始字符串、逐日来源与请求响应归属保留在私有证据，不在公开报告重贴可能已移除或无关的长段内容。[日期与边界](../daily-quality/evidence/2026-11-27/query-date-summary.json)

Google说明匿名查询和查询过滤会改变能看到的数据，API也不保证返回全部内部行。因此不把页面低CTR直接解释为标题错误或页面应当删除。[官方边界](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive)

## 当前正文、导航与索引

当前文章明确是335条记录、9个主题方向的月度档案，已有月度精选与主题导航。两语真实HTML均200、自canonical、en/zh/x-default互反、robots及全部重复X-Robots-Tag、JSON-LD语法无确认问题；每语实际340个三级标题、352个不同的同页片段链接，目标均存在。它们是HTTP与HTML观察，不是浏览器交互或全外链验收。[读回](../daily-quality/evidence/2026-11-27/monthly-http.json)

所核三个短语在当前Markdown及线上可见正文中均未按字面出现，11月1日变更的parent也没有这些字面串。不能据此声称11月1日删改造成了查询差异，或Google保存着旧正文。11月1日提交、实际生产1f897800与本轮基线d90bbed8的双语文章blob相同；Git修改日期仍不等于发布日期。[源码绑定](../daily-quality/evidence/2026-11-27/source-binding.json)

只读[45889337539](https://github.com/cubxxw/blog/actions/runs/45889337539)在精确d90bbed8、attempt1成功，仅查询新的中文月度目标。原ZIP、两个根文件、CRC/SHA、producer归属、source与process退出0均核对；结果PASS、允许索引、抓取成功、Google与页面canonical一致，最近抓取为`2026-11-20T01:57:35Z`。没有提交索引请求。接口不返回保存正文或搜索标题，不能证明Google采用了具体字节。[结果](../daily-quality/evidence/2026-11-27/inspection-summary.json)、[接口说明](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult)

## 决定与下一条件

未确认抓取、索引或正文导航阻断。保留现有月度档案与标题，不恢复旧段落、不批量拆稿或noindex，也不把两条小样本短语硬塞进标题。Google的建议是标题清晰、准确描述页面内容，避免关键词堆砌；它不证明任何特定标题能提升本页点击。[官方标题建议](https://developers.google.com/search/docs/appearance/title-link)

下一步等待新的实际query×page，尤其是最近抓取后的配对；若能稳定对应现存条目，再做最窄的直达入口提案并遵守作者许可。目前已有导航目标完整、短语需求很小，没有证据支持新的改稿或催问批准。这里只交付调查，不宣称点击增长或上线了优化。
