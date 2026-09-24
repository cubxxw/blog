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

对 289 条本地精确 301 规则进行 GET 检查，首轮有 248 条单次 301 到预期的自指 canonical 200 页面。33 次连接超时或断开正在定向复查，不能称源站 404/5xx；另有四条带查询参数的旧规则未按规则重定向，但页面 canonical 正确去掉查询参数，单独保留为规则语义待核验项，不据此修改首页或搜索页索引策略。

发现 LangGraph、NotebookLM 各中英文共四个 `/posts/ai-projects/...` 入口被既有 Hugo alias 文件遮蔽，线上先补尾斜杠，再经 HTML refresh 前往目标。仅将这四条既有映射改为 `301!`，保留源、目标和规则顺序。四个目标及 alias 对应关系已核对；父代理与独立 reviewer 的 299 条静态规则检查通过，尾斜杠归一化未发现循环。Netlify 的 force 与尾斜杠行为见[官方说明](https://docs.netlify.com/manage/routing/redirects/redirect-options/)。发布后仍须验证四条路径的有/无尾斜杠共八种请求。

### 性能历史诊断（#395）

已取回 [2026-09-23 Lighthouse 原始 artifact](https://github.com/cubxxw/blog/actions/runs/35863365843)，13 个 URL 各一个样本。实际版本为 Lighthouse 12.6.1，mobile 412×823、DPR 1.75、模拟网络/CPU 4×、en-US。工作流 SHA 不证明公开站点当时的部署 SHA。

- 年度总结 LCP 节点是 `h1.post-title`；模拟 LCP 为 15,788.61ms，原始 trace 的 observed LCP 为 1,044ms。二者口径不同，不能把观察时间线的 phase 相加去解释模拟总值。
- 年度总结有 65 次字体请求，font transferSize 合计 2,419,754 bytes，总 transferSize 2,781,758 bytes。成长分类页 18 次字体请求/718,097 bytes，AI Agent 分类页 10 次/358,199 bytes。字体是已测量的成本，是否为当前改善的因果来源仍需固定条件复测。
- 英文首页 LCP 是 `p.hp-hero-bio`，CLS 0.21231858 的 attribution 指向整个 `#hp-root`；这不等于已确认字体或图片是根因。

下一批性能实现先固定测量条件，再选择一个有证据的改动。保留中文衬线设计、SSR 正文、无 JS 可读性和 reduced-motion；不能用 macOS 自带字体的结果代替缺少这些本地字体的设备表现。

这批历史报告的 13 个 SEO category 分数均为 100，最低 accessibility 为 92。SEO 基础分已满并不代表收录、点击或读者体验已经达标。

### 教程示例正确性（#394）

在 page-query 证据到齐前，先修复两篇教程已有的可复现示例错误，中英文同步：

- GoReleaser：恢复合法的 `name` 和 `distribution` YAML 字段，去掉重复 `version` 和多余代码围栏文字。
- GitHub Actions：用一个具备触发器、runner、`needs` 和最小权限的完整示例替换已停用的 artifact v3 片段；明确另一次运行的下载还需要运行 ID 与 token。版本边界有相邻官方引用。

Ruby Psych 对修改前示例重现语法、重复键及旧版本问题；修改后 6 个示例解析通过、无重复键，artifact 作业依赖、名称和文件路径一致。独立 reviewer 重复验证并通过。front matter、标签、中文风格（0 错误、0 警告）和 diff 检查通过。没有执行真实 release 或这些示例工作流，整篇旧教程也尚未完成时效审计；标题、description 和 URL 均未改动。这是正确性维护，不作为 CTR 实验结果。

`debd55e2` 推送后，四个中英文页面的稳定线上复查全部通过：均为目标 URL 直接 200，正文包含修正后的示例且不再含对应错误字段或 artifact v3。未取得精确部署 SHA，不以页面行为证明全部 CI 已通过。

## 尚未完成

- A/B 的 GSC 采集与报告、PSI 精度/重试、模型诊断、可信发布与 Autofix 预演实现及独立验收。
- Search Console UI 已成功读回：当前 Chrome 登录账号没有 `sc-domain:cubxxw.com` 访问权限，且该会话仅有一个已登录账号。已请求作者指出可访问的既有浏览器资料或切换账号，没有申请新权限或修改 GSC 设置。本机没有 GSC/API 环境凭据；GitHub secrets 名称存在，值未读取，不能据名称声称可用。新 query×page/56 天采集、UI 同口径总量、11 类索引导出、URL Inspection 与迁移设置仍待核验。
- #395 固定条件的前后各三次性能测量、LCP/CLS 原因与改进；尚未宣称分数提升。
- #394/#396/#397 依赖 page-query 的内容实验、作者内容终审和重新抓取后的 28 天观察；没有新文章发布。
- 已推送 `origin/main`：`eb9a28d7`（交付合同）、`0d1343a3`（日报文字完整性）、`105905c2`（完整摘要）、`945d153f`（UFO 规范路径）。`105905c2` 的 Blog Build Check、Lighthouse、Sitemap Ping、README 更新已通过；`945d153f` 适用 CI 仍在排队，未认定全部通过。保留并行 #389 的 `a47babe0`，未修改该任务的工作区。
- 线上英文 GitHub Actions 文章已读回 222 字符完整 description，与修复后的模板行为一致。尚无部署 SHA 证明，因此这只证明该页面的渲染行为，不能代替指定提交的部署验收。没有关闭任何子任务。

## Pi 运行状态

A 批次任务 `20260924-182903-0cb4bdfa` 使用冻结基线 `105905c22ddb6288199a1073a5b40d2dbba08e3f` 和 MiMo Pro，在隔离 worktree 实现 #391。日期、切片、HTTP、持久化及 CLI 已开始落盘，当前 36 项核心测试通过。中期独立审查仍发现合法空响应、响应体超时和安全错误边界问题；父代理另复现并发写可能覆盖同日快照。已记录返工要求，未接受整个批次或发布该实现。B 的合同已经独立审查，须在 A 通过父代理审查并集成后启动，A/B 必须一起发布。

只读监督任务每 30 分钟检查 Pi 与交付状态，仅在失败、停滞、越界或需要验收时提醒；它不会启动模型、写源码、修改 issue 或使用 Token Plan 凭据。
