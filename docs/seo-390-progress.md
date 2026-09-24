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

### 全站线上 URL 核验与 UFO 大小写规范地址（#393）

2026-09-24 从主站 sitemap 的 `url/loc` 读取 417 个 URL，以最多四个并发、单请求 20 秒超时逐个 GET。417 个最终响应均为 200，均有非空 description、语言属性与预期索引指令；在这组页面内的翻译互指检查未发现缺失回链。这是 HTTP/HTML 证据，不能证明 Google 已收录。

发现两个 sitemap 地址经过 301 到达小写路径，但最终页面 canonical/hreflang 仍写大写路径：

| sitemap / 原规范地址 | 实际线上 301 终点 |
|---|---|
| `/projects/UFO/` | `/projects/ufo/` |
| `/zh/ai-agent/posts/UFO/` | `/zh/ai-agent/posts/ufo/` |

将两篇文章的显式 `url` 对齐到既有线上小写终点，并使六条历史迁移规则直接到达该终点；原大写规范地址保留两条精确 `301!`。不新增同目录大小写 alias，不改内容、标题、文件名或图片路径。中文已有 `/zh/projects/UFO/` alias 保留；它仍可能经过 HTML refresh，不能称所有历史入口均为单跳 HTTP 301。

依据：[Hugo 显式 URL 不自动规范化](https://gohugo.io/content-management/urls/)、[Netlify 强制重定向与文件 shadowing](https://docs.netlify.com/manage/routing/redirects/redirect-options/)。独立只读审查确认最小方案；`945d153f` 推送后，线上稳定复查确认两个小写页面直接 200、原大写地址单次 301 到小写终点、canonical 与双语互指一致。线上 sitemap 已使用小写地址。未取得部署 SHA 或 Google 再抓取证据。

本地检查：299 条 redirect 规则无重复来源、循环或链；front matter、tags、diff 检查通过；中文风格检查 0 错误，有 1 条原正文既有密度警告。全新 Hugo 0.145.0 最小双语 fixture 验证实际 SEO/sitemap 模板：两个小写规范地址、OG URL、翻译互指、x-default 和旧中文 alias 目标正确。无关辅助 partial 使用 stub，正文使用占位，因此不是全站构建或正文验收；文章 diff 仅改 `url`。

### 精确旧路径的线上跳转（#393）

对 289 条本地精确 301 规则进行 GET 检查，首轮有 248 条单次 301 到预期的自指 canonical 200 页面。33 次连接超时或断开在一次定向复查中全部通过，未确认源站故障；另有四条带查询参数的旧规则未按规则重定向，但页面 canonical 正确去掉查询参数，单独保留为规则语义待核验项，不据此修改首页或搜索页索引策略。

发现 LangGraph、NotebookLM 各中英文共四个 `/posts/ai-projects/...` 入口被既有 Hugo alias 文件遮蔽，线上先补尾斜杠，再经 HTML refresh 前往目标。仅将这四条既有映射改为 `301!`，保留源、目标和规则顺序。四个目标及 alias 对应关系已核对；父代理与独立 reviewer 的 299 条静态规则检查通过，尾斜杠归一化未发现循环。Netlify 的 force 与尾斜杠行为见[官方说明](https://docs.netlify.com/manage/routing/redirects/redirect-options/)。`935cdbe3` 推送后，2026-09-24 19:38 上海时间的稳定复查确认八种入口全部单次 HTTP 301 到预期的 200 页面，canonical 自指，无 HTML refresh。未取得部署 SHA，不用行为验证代替精确提交的部署证明。

四条查询参数规则的后续源码核查确认：当前 source 内联 `?` 的写法不同于 [Netlify 的独立参数匹配语法](https://docs.netlify.com/manage/routing/redirects/redirect-options/#query-parameters)，现有静态检查器没有验证此项。历史提交将其解释为首页清理，但没有证明旧 WordPress `p=341` 的内容对应关系；暂不机械改成强制首页跳转，避免错误目标或参数保留造成循环。静态规则通过仍须配合线上语义验证。

### 性能历史诊断（#395）

已取回 [2026-09-23 Lighthouse 原始 artifact](https://github.com/cubxxw/blog/actions/runs/35863365843)，13 个 URL 各一个样本。实际版本为 Lighthouse 12.6.1，mobile 412×823、DPR 1.75、模拟网络/CPU 4×、en-US。工作流 SHA 不证明公开站点当时的部署 SHA。

- 年度总结 LCP 节点是 `h1.post-title`；模拟 LCP 为 15,788.61ms，原始 trace 的 observed LCP 为 1,044ms。二者口径不同，不能把观察时间线的 phase 相加去解释模拟总值。
- 年度总结有 65 次字体请求，font transferSize 合计 2,419,754 bytes，总 transferSize 2,781,758 bytes。成长分类页 18 次字体请求/718,097 bytes，AI Agent 分类页 10 次/358,199 bytes。字体是已测量的成本，是否为当前改善的因果来源仍需固定条件复测。
- 英文首页 LCP 是 `p.hp-hero-bio`，CLS 0.21231858 的 attribution 指向整个 `#hp-root`；这不等于已确认字体或图片是根因。

下一批性能实现先固定测量条件，再选择一个有证据的改动。保留中文衬线设计、SSR 正文、无 JS 可读性和 reduced-motion；不能用 macOS 自带字体的结果代替缺少这些本地字体的设备表现。

这批历史报告的 13 个 SEO category 分数均为 100，最低 accessibility 为 92。SEO 基础分已满并不代表收录、点击或读者体验已经达标。

### 无 JavaScript 字体后备（#395，兼容性维护，待发布）

Google 字体的 `noscript` 后备原先带 `media="print"`，依赖 `onload` 改为屏幕样式；禁用 JavaScript 时该处理器不会执行。现仅移除这两个属性，使用直接 stylesheet。正常 JS 的异步加载、自托管中文字体和 about / about-quest / articles / projects 排除条件保持原样；行为依据见 [HTML noscript 规范](https://html.spec.whatwg.org/multipage/scripting.html#the-noscript-element)。

真实 Hugo 0.145 最小微站生成修改前后各 13 个 HTML，独立检查确认只有预期属性变化。现有 Chrome 153 独立临时 profile 完成 40 个前后、双语、页面类型和 JS 开关组合：禁用 JS 的普通页后备样式从未应用变为应用，启用 JS 的 Google CSS 请求数仍为 1，中文样式和排除条件不变。测试拦截字体 CSS 为可观察标记，没有下载真实字体；这证明样式表应用语义，不是字体视觉质量、全站构建或 LCP 改善的证据。独立审查无 P1/P2。

### 教程示例正确性（#394）

在 page-query 证据到齐前，先修复两篇教程已有的可复现示例错误，中英文同步：

- GoReleaser：恢复合法的 `name` 和 `distribution` YAML 字段，去掉重复 `version` 和多余代码围栏文字。
- GitHub Actions：用一个具备触发器、runner、`needs` 和最小权限的完整示例替换已停用的 artifact v3 片段；明确另一次运行的下载还需要运行 ID 与 token。版本边界有相邻官方引用。

Ruby Psych 对修改前示例重现语法、重复键及旧版本问题；修改后 6 个示例解析通过、无重复键，artifact 作业依赖、名称和文件路径一致。独立 reviewer 重复验证并通过。front matter、标签、中文风格（0 错误、0 警告）和 diff 检查通过。没有执行真实 release 或这些示例工作流，整篇旧教程也尚未完成时效审计；标题、description 和 URL 均未改动。这是正确性维护，不作为 CTR 实验结果。

`debd55e2` 推送后，四个中英文页面的稳定线上复查全部通过：均为目标 URL 直接 200，正文包含修正后的示例且不再含对应错误字段或 artifact v3。未取得精确部署 SHA，不以页面行为证明全部 CI 已通过。

### 观测、确定性报告与候选门禁（#392，B1 本地验收通过）

Pi 完成 B1 的 13 个文件，父代理导入冻结版本后补正了两个独立复现的问题：性能候选必须把同一 URL、同一设备策略的最新有效样本与回归证据配对；GSC 数据延迟按 Pacific 日历日计算，不能用 UTC 小时差提前判定过期。候选仍只生成提案，不修改文章或发布外部内容。

父工作树通过 197 项定向测试、36 项独立边界探针和 17 项报告探针；独立 reviewer 最终复核无剩余 P1/P2。固定截止时间的真实历史报告重复生成，233,573 bytes 完全一致。最新 13:00 UTC 截止的旧格式 PSI 数据保留 22/26 可用、4/26 失败及来源不完整状态；CrUX 两种设备均无实地样本，不能据此宣称性能或搜索增长已经改善。

B1 明确区分当前采集失败与历史可用样本、报告生成成功与数据质量降级，并使用实际 Hugo 路由映射约束候选文件。现有 CrUX collector 的唯一输出路径和本轮产物验证由 B2 接线负责。A+B1+B2 一起发布；目前仍未完成新工作流、真实 56 天回填、模型隔离运行或线上发布回读，因此不关闭 #392。

### Hugo 摘要与正文范围对齐（#394，待发布）

英文摘要原来只有 `hugo advanced tutorial`，中文摘要则承诺正文没有充分展开的性能优化、部署和 GitHub 持续部署内容。本轮把两种语言的摘要对齐到实际章节：模块挂载、Go 模板、查找顺序、列表与分页、shortcode、i18n 和 data 文件；标题、日期和 URL 保持原样。

另修正英文首个模块 YAML 示例的 `proxy:direct`，使其成为合法的 `proxy: direct`。Ruby Psych 在修改前复现语法错误，修改后确认中英文对应示例均可解析、值一致；这不是 Hugo 模块下载或生产配置的执行证明。front matter、标签、中文风格（0 错误、0 警告）和 diff 检查通过。

这是页面摘要的准确性维护，尚未使用新的 query×page 数据选定搜索实验，也不声称 Google 已采用摘要或点击改善。正文旧版模板查找规则和示例时效仍待后续针对性核验，摘要更新不能替代整篇教程验收。

### 项目文章示例执行核验（#397）

从中英文 LangGraph 文章原样提取唯一 Python 示例，在独立 Python 3.12.14 环境安装固定的 [LangGraph 1.2.12](https://pypi.org/project/langgraph/1.2.12/) 后执行。每种语言 7 项断言通过：初次运行中断并保留草稿、同一线程恢复、audit 追加、结束状态、拒绝结果记录和线程隔离。执行时未传入模型或 LangSmith 凭据，网络审计记录为 0 次连接尝试；输出均为 `['drafted', 'human_approved=True']`。

这只验证原示例的进程内状态与暂停/恢复行为，不证明生产重启恢复、模型质量或 SEO 成效。文章已明确 `InMemorySaver` 的边界，本轮没有改写示例、标题或作者判断。完整依赖版本及源文件/代码块 SHA-256 已保留在本任务证据中，后续内容实验可据此标注测试环境。

### 最新定时采集的实际状态（#391 / #392）

[Snapshot 35989281749](https://github.com/cubxxw/blog/actions/runs/35989281749) 已完成并提交 `c209ffee`。实际读回 GSC 文件：2026-09-24 11:50:56 UTC 获取 9 月 19–21 日的旧格式数据，包含 179 条 date-query、643 条 date-page，尚无 query×page。既有 CI 认证可用，新采集实现仍需发布后验证。

本次 PSI 计划 13 个 URL × 2 个策略，共 26 次，结果 22 次成功、4 次失败；不能只按成功数组统计成 22/22。CrUX 的 PHONE 与 DESKTOP 均为 `notEligible`，表示无足够实地样本。旧工作流整体显示成功，没有证明它能正确判定这种部分失败；B 将修正状态报告。年度总结移动端这一次 PSI LCP 仍约 15.34 秒，不据单次、不同条件样本判断前后改善。

### Mem0 OSS 时间能力更正（#397，本地待发布）

核对 [`mem0ai==2.2.0`](https://pypi.org/project/mem0ai/2.2.0/) wheel 与对应发布提交 `47a69e1e72dc562b6fdd49a9ef892229afc7508a` 的 `mem0/memory/main.py`：源码逐字节一致，SHA-256 为 `5b1b75e2f00aca7bd368a6e9cd5905145d60fd05a0e36d6b1ef3e2f1b4f28ca1`。同步和异步接口均拒绝非空 `timestamp` / `reference_date`，明确标注 Platform 专属。

因此更正中文 TLDR、FAQ 和正文中“OSS 融合时间排序”的过度描述，并在两种语言加入日期明确的版本说明与相邻引用。保留标题、发布时间、公开路径、代码示例和原中文标题锚点；算法 v3 与 Python 包版本 2.2.0 分开表述。本次代码核验仅覆盖语法和发布源码参数，不包含模型、嵌入、存储或检索质量实测。

独立审查未发现 P1/P2；front matter、标签、中文风格与 diff 检查通过。Hugo 0.145.0 最小渲染确认新标题显示“两类信号”，原 `#检索语义候选再融合三类信号` 与目录链接保持有效；这不是全站构建或新内容线上读回。

这项维护修复事实准确性，不构成 query×page 搜索意图实验，也不证明点击增长、Google 重新抓取或 #397 整体验收。内容尚未推送，与 A+B1+B2 一起发布。

### Hugo 教程路径表与版本边界（#394，本地待发布）

中英各 22 行模板查找表原本把 418 个候选路径粘在同一个代码片段中，现拆为独立代码片段并按原顺序用箭头分隔。英文 Term RSS 行的 3 处路径内多余空格已纠正，与中文版逐项一致；法语 HTML 行不再误标为 AMP。保留合法的 `.html.html` 后缀、已有章节标题与代码块，明确这些旧模板示例以 Hugo 0.145.0 为参照，并给出 0.146.0 新模板系统迁移链接。

删除未经版本限定的 `GO_VERSION=1.12` 建议，改为按 Hugo 和模块要求固定已验证版本，并引用 Netlify 的 `.go-version` 优先规则。没有改站点 Hugo 版本、标题、开头、发布时间或路径。

独立审查使用固定 Hugo 0.145.0 完成 6/6 个微型模板样例，覆盖格式专用模板、类型模板、默认回退、基础模板组合、首页和法语 HTML。证据只覆盖这些代表性规则及局部修复，不认证全部 418 个候选或 0.146+，也不构成 #394 的完整内容实验验收。

## 尚未完成

- A/B 的 GSC 采集与报告、PSI 精度/重试、模型诊断、可信发布与 Autofix 预演实现及独立验收。
- Search Console UI 已成功读回：当前 Chrome 登录账号没有 `sc-domain:cubxxw.com` 访问权限，且该会话仅有一个已登录账号。已请求作者指出可访问的既有浏览器资料或切换账号，没有申请新权限或修改 GSC 设置。本机没有 GSC/API 环境凭据。2026-09-24 定时 Snapshot 的实际数据已证明既有 CI 账号可读取 GSC，但这不解决交互界面账号权限。新采集器的 query×page/56 天采集、UI 同口径总量、11 类索引导出、URL Inspection 与迁移设置仍待核验。
- #395 固定条件的前后各三次性能测量、LCP/CLS 原因与改进；尚未宣称分数提升。
- #394/#396/#397 依赖 page-query 的内容实验、作者内容终审和重新抓取后的 28 天观察；没有新文章发布。
- 已推送 `origin/main`：`eb9a28d7`（交付合同）、`0d1343a3`（日报文字完整性）、`105905c2`（完整摘要）、`945d153f`（UFO 规范路径）、`debd55e2`（教程示例）、`935cdbe3`（四条 alias 强制跳转）。`105905c2` 的 Blog Build Check、Lighthouse、Sitemap Ping、README 更新已通过；`935cdbe3` 的 Build、Pages、README 与 Sitemap Ping 已通过，其 Lighthouse 被后续提交取消不算通过。已快进保留并行 #389 的 `a47babe0`、`82cdc0e2` 及定时数据提交 `c209ffee`；截至 2026-09-24 12:28 UTC，`82cdc0e2` 的构建、Lighthouse、GitHub Pages 与 README 全部通过，覆盖既有小修复。未修改 #389 的工作区。A 的本地提交 `c5fa8860` 尚未推送，不在这些 CI 结果的覆盖范围内。
- 线上英文 GitHub Actions 文章已读回 222 字符完整 description，与修复后的模板行为一致。尚无部署 SHA 证明，因此这只证明该页面的渲染行为，不能代替指定提交的部署验收。没有关闭任何子任务。

## Pi 运行状态

A 批次任务 `20260924-182903-0cb4bdfa` 使用冻结基线 `105905c22ddb6288199a1073a5b40d2dbba08e3f` 和 MiMo Pro，在隔离 worktree 实现 #391。中期独立审查发现的合法空响应、响应体超时、安全错误边界及同日快照并发覆盖问题已返工；采集器 57 项测试通过，父代理的 6 项独立异常路径验证通过。

报告层第一轮独立复现的 3 项 P1 和 4 项 P2，以及后续核心 API 截止时间、可用性身份、过滤条件与日期覆盖的 3 个边界问题，均已在第四次受控 resume 后修复。最终 **84/84** 离线测试、父代理 **9/9** 独立探针、独立 reviewer **17/17** 检查通过，本次审查范围无剩余 P1/P2。已接受 A 的离线实现并集成到包含第 79 份 GSC 快照的最新主线，84 项测试再次通过；尚未上线新采集器。

真实历史回归固定观察截止时间为 `2026-09-24T00:00:00Z`，避免后续回填改变原有基线。父代理从 `105905c2` 重新提取原始 78 份输入，独立生成的 [基线](seo-390-baseline.json) 逐字节一致（251,868 bytes，SHA-256 `7a72dc9d80bfd677e79d1b5c766cf2191cb5ca5a6324800a4b1f29d35c981941`）。无日期维度的重复分布已从默认报告移除，保留来源和不可归属说明；原始快照未改写。

B 已按独立审查后的架构拆为 B1（纯采集、报告、候选门禁）和 B2（可信工作流与日报发布），顺序交给 Pi；每批验收后再冻结下一批基线。A+B1+B2 必须一起发布，避免旧 Analyze 消费者读到新格式后得出错误结果。

只读监督任务每 30 分钟检查 Pi 与交付状态，仅在失败、停滞、越界或需要验收时提醒；它不会启动模型、写源码、修改 issue 或使用 Token Plan 凭据。
