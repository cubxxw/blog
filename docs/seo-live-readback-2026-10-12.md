# SEO 现场读回（2026-10-12）

本记录补充 [issue 分诊](issue-triage-2026-10-12.md)，不将 HTTP、Google 索引版本与变更后搜索观察混为一项验收。

## 索引版本

单 URL [canary 38205103588](https://github.com/cubxxw/blog/actions/runs/38205103588) 成功后，执行 [24 URL 批次 38206337426](https://github.com/cubxxw/blog/actions/runs/38206337426)。source SHA=`f71bec61305a33954b1d1cfd67a224b3bd5c7d32`；24/24 inspected，unknown=0、blocked=0。Google 的 `NEUTRAL / URL is unknown to Google` 是真实索引结果，不是采集失败。

| 样本 | Google 结论 | 处理 |
| --- | --- | --- |
| GoReleaser、GitHub Actions、Hugo 的中英页面；四中文月档案；Mem0/LangGraph/NotebookLM/UFO 的中英页面，共 18 个规范 URL | 全部 PASS / Submitted and indexed；Google canonical 与请求的规范 URL 一致 | 不把低点击或全域排除数量误当这些文章未收录 |
| `/projects/UFO/`、`/zh/ai-agent/posts/UFO/` | Page with redirect，分别选 lowercase 规范页 | 预期排除 |
| `/zh/ai-technology/posts/go-release-tools/`、`/ai-technology/` | Page with redirect，分别选当前工程文章与 AI 栏目 | 预期排除 |
| `/posts/ai-projects/notebooklm`、`/ai-technology/posts/mem0/` | URL is unknown to Google | 旧 URL 未知，不能推断新页未收录；两新页已独立 PASS |

英文 Mem0 最近抓取为 2026-08-18，GoReleaser 英文为 2026-09-30，均早于本轮维护。不能认为 Google 已看到本轮变更，也不能提前验收重抓后 28 天。

当前登录的 GSC 管理界面实测无此 property 权限；没有切换账号或改变权限。API 身份读取成功，不等于 UI 身份能完成同口径图表核验、全部 11 类排除导出与地址迁移设置。#391/#393 这些剩余条件保留。

## 查询意图与是否继续改写

as-of=`2026-10-12T05:00:00Z`，来源为已提交的六切片 56 天真实快照，当前窗 2026-09-11—10-08。研究用 `buildReport` 将 pairsLimit 提至 10,000，当前返回 1,209 对、报告截断=false。Google 匿名查询和内部返回限制仍存在，未返回不是零；正常公开模型提示仍不包含原始 query 字符串。

| 页面 | 返回查询示例（曝光/点击） | 本轮判断与动作 |
| --- | --- | --- |
| GoReleaser 英文 | `goreleaser/goreleaser-action` 36/0、`goreleaser action` 11/0、`goreleaser` 15/0 | action 集成与项目入口并存；修真实 archives YAML 错误，保留现有版本定位，不再泛改标题 |
| GitHub Actions 英文 | 多个 `pillar-markup microdown-agenda` 复合词；`site:docs.github.com ...continue-on-error` 6/0 | 查询与本文预期任务关系不明，需核验 SERP；不为异常复合词拼文章或自动改标题 |
| Hugo 英文 | `hugo range` 4/0、`hugo tutorial` 1/0，另有站点运维查询 | 正文已有 range/else 与变量作用域；小样本不足以证明内容缺答案 |
| Mem0 英文 | `mem0 oss` 113/1、`mem0 v3` 20/1，graph 类各 3/0 | OSS 版本需求真实；既有文章已覆盖 ADD-only、实体检索、OSS/Platform 区别，本轮补相关正文内链 |
| LangGraph 英文 | `langgraph stategraph` 3/0、`stategraph langgraph` 3/0、`langgraph architecture` 1/0 | 运行状态与架构有零散证据，现有文章已有对应说明；不据低覆盖大规模重写 |

这些是基于词与正文的研究判断，不是已验证的 SERP 分类或排名原因。设备/国家是独立页级切片，不声称 query×device×country 联表。#394/#397 的完整版本/示例验收与重抓后观察继续保留。

## 无效查询规则

删除 Netlify source 中内嵌 `?` 的四条无效规则。官方 query 匹配采用独立条件；默认参数透传使同路径强制 301 可能循环。搜索变体使用现有搜索页 noindex；referral 使用现有无参数 canonical。`p=341` 原文未确认，不发布首页跳转或 410。这是无效配置清理，不是 WordPress 迁移验收。[Netlify query 参数规则](https://docs.netlify.com/manage/routing/redirects/redirect-options/#query-parameters)

295 条剩余规则检查无 duplicate/loop/chain，独立 reviewer 确认无有效行为丢失。没有新增 query conditions，本次不扩展三字段 checker。

## 自动化现场验收与日报

[Analyze 38204743082](https://github.com/cubxxw/blog/actions/runs/38204743082) 发布完整 #451：required report/publish 成功，GSC/PSI fresh、CrUX no-sample/unknown；optional interpretation 真实 `is_error:true`、structured_output missing，文本 withheld。上游 action 的成功 step 不代表解释可接受，也不据此猜鉴权或配额。

[proposal-only Autofix 38206340568](https://github.com/cubxxw/blog/actions/runs/38206340568) 在 `f71bec61` 成功，无候选，不执行 apply。手动现场运行不能替代三次计划运行。

#450 未即时关闭符合现有分工：SEO 不关旧日报，Lighthouse push 不发布，schedule/manual 发布才做关闭。本轮确认 #451 已有完整结果后，按同一严格日期规则关闭 10/11 旧日报；今日 #451 保持开放。历史失败没有被抹除。

## #396 范围决定

原导航已存在，英文计数/日期维护已交付。四中文月档案当前合计 11 点击/9,421 曝光，返回查询仅 146 曝光且主要为站点/不相关词；不足以选独立深度文章。取消尚未启动的新文与未定义的搜索试点，按 `not_planned` 关闭，不将原验收全勾成完成。未来有作者观点、查询证据与 brief 再走编辑流程；已上线维护的后续观察归 #390。
