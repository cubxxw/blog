# 开放 issue 分诊与修复（2026-10-12）

审计起点：`17abebbd24e0002393fdda0151e31ed0081f7011`，远端 `cubxxw/blog` 共 15 条开放 issue。逐项读取正文、评论、当前实现、真实 GSC 快照和相关 Actions；本轮不把已有代码、工作流绿灯或局部维护修正当成完整搜索实验验收。

## 判断与任务分配

| Issue | 实际问题 / 当前价值 | 本轮处理与关闭条件 |
| --- | --- | --- |
| [#203](https://github.com/cubxxw/blog/issues/203) | utterances 创建的文章评论；唯一留言是读者评价，无开发工作项 | 标 `blog-comment` 并关闭，保留评论及未锁定状态 |
| [#235](https://github.com/cubxxw/blog/issues/235) | Solo Compass 公开反馈入口；`data/products.yml` 直接引用 | 不是未解决 bug；保留反馈通道 |
| [#236](https://github.com/cubxxw/blog/issues/236) | DayPage 公开反馈入口；页面直接引用 | 保留反馈通道 |
| [#237](https://github.com/cubxxw/blog/issues/237) | Telepace 公开反馈入口；页面直接引用 | 保留反馈通道 |
| [#238](https://github.com/cubxxw/blog/issues/238) | Apply Agent 公开反馈入口；页面直接引用 | 保留反馈通道 |
| [#389](https://github.com/cubxxw/blog/issues/389) | 组件与后续扩展已部署，已有三引擎和线上证据 | 仍缺实际 VoiceOver 朗读验收；AX/DOM 标签不能替代朗读，不重复开发 |
| [#390](https://github.com/cubxxw/blog/issues/390) | SEO 改进主线，七个子项仍有独立验收 | 更新本轮实际进展；子项未完成前不关闭父项 |
| [#391](https://github.com/cubxxw/blog/issues/391) | 真实 56 天/query×page 回填已完成；新旧响应组并存使摘要误报未知 | GSC worker 修显式 `byPage` 选择、共享 freshness selector、真实采集待办状态；仍待同口径 GSC UI 核验 |
| [#392](https://github.com/cubxxw/blog/issues/392) | Snapshot plan 缺失仍采集/提交；PSI 把 API 缺少比较参数误当采集失败 | 主代理修 plan 守卫与工作流接线，PSI worker 分开采集与比较状态；还需真实运行/三次计划验收。可选模型缺 structured_output 保持 withheld，不猜鉴权/配额原因 |
| [#393](https://github.com/cubxxw/blog/issues/393) | 旧路径迁移大部分有效；4 条查询规则无效，Google 侧分诊未验收 | 留存真实 HTTP 证据；`?p=341` 原内容未确认，不盲跳首页。仍需索引分类导出、P1 Inspection、迁移设置和观察 |
| [#394](https://github.com/cubxxw/blog/issues/394) | 既有摘要/示例修复已上线；英文 archives YAML 仍不可解析 | 主代理修完整 YAML 缩进/空格，独立验证中英解析一致；未声称 GoReleaser release 执行或 CTR 实验完成 |
| [#395](https://github.com/cubxxw/blog/issues/395) | 性能仍有测量和修复空间 | 聊天“优化博客性能与 SEO”已有唯一 Pi writer；本轮不重复占用/覆盖其模板与性能改动；仍需固定条件前后各三次证据 |
| [#396](https://github.com/cubxxw/blog/issues/396) | 原计划的月档案主题导航已存在；英文摘要条数/日期不准；新文试点缺作者选择 | 主代理修准确性，不按不相关搜索词拼装新文；作者内容选择和重抓后观察仍未验收 |
| [#397](https://github.com/cubxxw/blog/issues/397) | Mem0 确有 OSS 查询；现有正文已覆盖核心边界，相关文字未链接 | 给上下文工程文章已有 Mem0 提及补中英规范内链；保留 Products 默认 BEAR OS；搜索实验仍需重抓和完整窗口 |
| [#450](https://github.com/cubxxw/blog/issues/450) | 最新站点日报，记录真实降级 | 保留运维证据，由下一日报自动关闭；不能提前关以免重复建当天日报 |

任务分配：只读 SEO/数据审计、只读内容/意图审计、GSC 修复 worker、PSI 修复 worker；主代理负责 workflow、局部内容、独立验收和 GitHub 交付。SEO 审计代理随后独立 review，未参与本轮实现。Pi 已被另一个正在进行的聊天占用；遵守同仓库一个活动 Pi writer，未新建第二个 Pi 编码任务。

## 可复核的新数据

固定观察截止 `2026-10-12T00:00:00Z`；前窗 2026-08-14—09-10，当前窗 2026-09-11—10-08，两个独立 28 天。使用唯一 domain-wide 请求上下文中的明确 `responseAggregationType=byPage`；只汇总 hostname=cubxxw.com，按日期整日替换最新证据，不借 legacy 或其他上下文日期。

| 窗口 | 日期覆盖 | 点击 | 曝光 |
| --- | --- | ---: | ---: |
| 前 28 天 | 28/28 proven complete | 150 | 94,022 |
| 当前 28 天 | 28/28 proven complete | 137 | 48,110 |

这是返回 page 行汇总，不是 GSC property 总量，不是维护修正的因果效果。真实 query×page 两窗也均完整；device/country 在当前窗仅 11/28，且是独立页级切片，不是 query×device×country 联表。查询缺行仍不能当零。

当前英文页：GoReleaser 0/4,186 clicks/impressions，GitHub Actions 0/1,215，Hugo 2/532，LangGraph 0/572，Mem0 4/781。Mem0 英文规范页 `mem0 oss` 为 1/113、`mem0 v3` 为 1/20，中文 `mem0 oss` 为 2/8。四个中文月档案合计 11/9,421；返回查询仅 146 曝光，覆盖不足且多为不相关或站点查询，不支持猜写主题。

## 根因与有界修正

### GSC 摘要

默认历史报告要求唯一响应组；旧 `unrecorded-legacy` 与新 `byPage` 共存后拒绝汇总。新增显式 CLI selector，由摘要与 freshness 共用同一选择器：唯一请求语义、精确响应类型、记录来源 schema；缺失、多个请求上下文或未证明来源继续拒绝。原 groups 保留，不自动挑最新/覆盖最多的组。

默认历史输出字节保持；Analyze/Autofix 明确 opt-in `--gsc-response-aggregation byPage`。同口径 UI 验收仍保留，不把采集成功称为 Google 管理界面核验。

### Snapshot

[10/11 真实失败](https://github.com/cubxxw/blog/actions/runs/38137070654) 中 `npm ci` 失败跳过 plan，`always()` collectors 收到空路径，GSC/PSI 落回传统输出，CrUX 报 ENOENT，仍提交快照。最新主线已修锁文件；本轮只修剩余路径守卫。plan outcome、文件、各输出或冻结日期无效时停止对应采集/持久化，写 `code=1`，后续 required stage 继续显示失败。

### PSI

官方 API 的 [ConfigSettings](https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed#ConfigSettings) 未承诺完整本地 Lighthouse 节流/屏幕/UA 配置。比较签名缺这些参数时不能声称前后测量可比；但有实际 timestamp、版本、URL 和有效指标的 API 测量不应仅因此被称为采集失败。两个状态单独保存，不补默认参数伪装实测，比较门禁保持严格。

### 文章准确性

- 英文 GoReleaser `archives` 代码块：修 `id`/`builds`/`format` 的空格及不一致缩进；整个 YAML 与中文解析结果一致。未执行实际 release，也不认证整篇历史教程的所有版本行为。
- 英文 2026-03/02/01、2025-12 摘要条数分别改为 464/363/386/374，与两语言唯一 memo 标记数一致；2 月起始日期为 02-01，12 月范围为 12-01—12-31。档案条目、标记和锚点保留。
- 双语上下文工程文章已有“Mem0 技术分析”文字分别链接 `/zh/projects/mem0/` 与 `/projects/mem0/`，不新增事实或泛化链接。

## 验证与交付

本轮使用定向 Node 测试和文档检查，不启动 iOS、第二套浏览器或本地全站构建。最终 310/310 定向检查通过（SEO 全套、PSI 新契约、比较门禁与工作流检测）；front matter、标准标签、中文文风和 diff 检查通过。最初两项社交卡片微型 fixture 因 PATH 缺 Hugo 无法执行，补上固定 Hugo 0.145.0 后重跑及最终联合运行通过；未把初次失败隐去。

独立 reviewer：第一轮 GSC/报告/pipeline 115/115、冻结后的 PSI/stage/pipeline/SEO 149/149；真实 26 槽的 10 类故障注入 × exit 0/2 继续拒绝；历史 GSC 基线逐字节 SHA256 `7a72dc9d80bfd677e79d1b5c766cf2191cb5ca5a6324800a4b1f29d35c981941` 保持。最终无 P0/P1/P2，PSI 实现 hash 前后不变。提交 SHA、当前 CI 与真实 Actions 读回记在 issue #390 的本轮交付回执；不把 pending 或缺失验收标为通过。

### 真实 Snapshot 读回与当前计划后续修正

[手动 Snapshot 38201965206](https://github.com/cubxxw/blog/actions/runs/38201965206) 已成功；GSC/PSI/CrUX/持久化四个 required stages 全部 succeeded，最终 status.ok=true。GSC 六个切片各有 56 个 complete 日期（2026-08-14—10-08），包括独立的 page-device/page-country；本次观察 `fetchedAt=2026-10-12T04:00:28.547Z`，不回填进入较早的 as-of 报告。快照已由工作流提交为 `ec863b0a9bc5d3d7a970f6e29921dfbbd6ba3cc9`。

PSI outcome=degraded，明确缺比较配置；CrUX outcome=no-sample，明确实地指标未知。这两项没有被伪装为完整比较或用户 p75。

实际报告同时发现旧 7 月 `/ai-technology/` 观测影响当前 PSI 新鲜度。后续修正只用最新可证明的 schema2 计划确定当前分母：26 个当前槽位、6 个退役目标，32 个历史目标全部保留。最新缺失/失败/坏计划/无法排序的文件保持 partial/unknown，不退回旧成功计划；比较器未变。最终联合 314/314 检查及独立 184/184 审查通过，无 P0/P1/P2。

### 索引版本读取：新的可执行 C 批次

新增 `scripts/gsc-inspect.mjs` 与仅手动触发的 `seo-index-inspection.yml`。复用现有只读 OAuth/secret，固定 `sc-domain:cubxxw.com` 和 HTTPS 主站；每次最多 25 URL，第一条为 canary，认证/权限/配额或首条无有效 IndexStatus 时停止并将余项标 blocked。只记录 Google 索引版本与 allowlist 字段，缺失 canonical 保持 null，不将 HTTP 200 推断为已收录。只上传本次 run/attempt 的 report/process 两个 artifact，不提交快照或更改 Google 设置。

独立 review 复现并修复了一个 P1：同一路径重复执行时旧成功回执可掩盖新失败。最终门禁绑定本次 `steps.inspect.outcome`（不是 continue-on-error 的 conclusion），真实 shell 碰撞探针确认失败门禁为 1。相关 80/80、父代理含工作流检查 94/94 通过，剩余 P0/P1/P2=0。现场 Inspection 权限仍待单 URL canary 读回。

本轮另在当前已登录 Search Console 页面直接确认 `not-verified` / “无权访问 cubxxw.com”；未更换账号、验证所有权或修改权限。这是 UI 分类导出与同口径人工图表核验的真实剩余条件，API canary 独立判断现有 CI 身份能否读取索引版本。
