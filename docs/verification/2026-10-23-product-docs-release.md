# Tana、Doneas、Ambi 双语发布收尾

三篇文章已于 `2026-10-23T02:26:13.131+08:00` 正式发布。PR [#471](https://github.com/cubxxw/blog/pull/471) 于 `2026-10-23T02:22:57+08:00` 合并。作者已明确允许先合并发布、在后台继续整站回归；发布与回归通过分别记录。

整站回归终态为 **未通过**：原合并版主检查和两轮测试修复的完整检查均已达到既有两小时时限后 cancelled，仍有失败与未完成覆盖。原合并版主检查继续作为最终依据；文末补充修复后终态。

正文、完整英文、六张配图保持合并版本原样。文件校验值见 [定稿清单](2026-10-23-product-docs-release/final-content-before.sha256)。

## 正式链接与 brief

| 产品 | 正式中文 | 正式英文 | brief / pending 内容回执 |
| --- | --- | --- | --- |
| Tana | [中文](https://cubxxw.com/zh/ai-agent/posts/tana-from-notes-to-meeting-work/) | [English](https://cubxxw.com/ai-agent/posts/tana-from-notes-to-meeting-work/) | [brief](../../_briefs/2026-10-23-tana-product-teardown.md) / [receipt](../content-receipts/pending/2026-10-23-tana-product-teardown.json) |
| Doneas | [中文](https://cubxxw.com/zh/ai-agent/posts/doneas-weekly-commitments/) | [English](https://cubxxw.com/ai-agent/posts/doneas-weekly-commitments/) | [brief](../../_briefs/2026-10-23-doneas-product-teardown.md) / [receipt](../content-receipts/pending/2026-10-23-doneas-product-teardown.json) |
| Ambi | [中文](https://cubxxw.com/zh/ai-agent/posts/ambi-memory-to-work/) | [English](https://cubxxw.com/ai-agent/posts/ambi-memory-to-work/) | [brief](../../_briefs/2026-10-23-ambi-product-teardown.md) / [receipt](../content-receipts/pending/2026-10-23-ambi-product-teardown.json) |

## 生产部署

- 源版本：`db80e3fbfed57e9f75f15ab83ef8a192a0316059`。
- Netlify deployment：`6ada5484e1776686525b58a4`，`production`、`main`、`ready`。
- 发布时间来自 Netlify 当前 `published_deploy.published_at`，不是文章 front matter 日期或合并时间。
- [Netlify 实际读回](2026-10-23-product-docs-release/netlify-production.json) 同时绑定当前 published deployment 和完整 commit。
- 当前使用 Netlify 原生 Git 生产构建；公开 `__release.json` 返回 404。版本认定依据上面的平台 published deployment，未把 404 的 marker 或 HTTP 200 本身当作部署版本证明。

首份收尾记录已提交为 `7a87412036a4592ed906e49ae491300cb394da4f` 并部署；README 自动更新随后产生 `b5411e75d5a72f671d7ccbb4e03a4cc55afbee78`，于 `2026-10-23T02:58:28.200+08:00` 部署，Netlify deployment 为 `6ada5b95d54024e7a01183a7`。这两个提交只涉及 brief、收尾证据与 README。相对首次文章发布版本的文件差异未包含文章或原图；线上 Tana 中文 HTML 与首次验收逐字节相同。见带观察时刻的 [收尾后生产读回](2026-10-23-product-docs-release/production-after-closeout.json)。`published_at` 与三张回执仍记录首次文章实际发布时刻。

校验修复与诊断提交 `90c194b9d3f89f198cd786c483ec39e7230a619d` 于 `2026-10-23T03:55:57.286+08:00` 部署，Netlify deployment 为 `6ada69992b9b95778fb14a90`。相对首次文章发布，文章、原图与应用实现无变化，Tana 中文页的线上 HTML 仍与首次验收相同。见 [修复后生产读回](2026-10-23-product-docs-release/production-after-repairs.json)。

手机测试修复与主回归终态证据提交 `08783e4e190f587527fdf8aeecae1b5b6279d3fb` 于 `2026-10-23T04:41:17.158+08:00` 部署，Netlify deployment 为 `6ada743df7250e29aced2af2`、ready。随后读回六个正式链接：6/6 HTTP 200，语言、canonical、标题与全部定稿 H2 顺序正确；六张原图 MIME/SHA-256 一致，Tana 中文 HTML 仍与首次验收逐字节相同，读回期间部署未变。文章、原图、应用与工作流相对 `db80e3fb…` 均无差异，见 [六页再次读回](2026-10-23-product-docs-release/production-after-final-test-repairs.json)。平台快照均标注观察时间；后续收尾记录提交不改写首次文章的 `published_at`。

## 正式站浏览器验收

目标流程：进入每篇正式文章 → 确认全文、图片与参考资料 → 实际点击中英文切换 → 确认同篇对应语言；另以手机尺寸阅读三篇中文。

连接浏览器技能已读取并搜索相关工具，本轮没有可调用的 `js` / Browser / CUA 运行工具。任务未限定本地浏览器，使用当前云环境已安装的 Chromium 154.0.8037.57 与 Playwright，保持 TLS 校验和环境网络代理。此项是正式站实际浏览器验收，不替代仓库整站回归。

| 检查 | 结果与范围 |
| --- | --- |
| 桌面六页 | 1440×1000；6/6 HTTP 200，标题、HTML 语言与 canonical 对应 |
| 正文完整性 | 6/6 正文可见，所有 H2 与定稿顺序相同：Tana 各 11、Doneas 各 8、Ambi 各 9；参考资料存在 |
| 图片 | 每页封面及两张正文图片成功解码，alt 和图注存在；六张线上原图 MIME 为 image/png，SHA-256 与合并版本一致 |
| 语言切换 | 6/6 实际点击 `.lang-switch`，目标 URL、语言、标题与非空正文正确 |
| 手机中文 | 390×844；3/3 标题、正文、图注、图片与参考资料可读，无横向溢出或正文超宽，未发现阻断阅读的裁切 |
| 运行健康 | 9 个页面状态均无框架错误层、控制台 error/warning、pageerror 或失败请求 |
| 截图复核 | 逐项目视检查六页桌面首屏与正文配图，以及三篇中文手机首屏、正文配图和参考资料 |

Hugo 响应式图片的 `_hu_<hash>` 文件名通过原始图片名称归一确认来源；原图另外按完整字节做 SHA-256 校验。未因为生成文件名不同而替换定稿图片。

[完整浏览器读回](2026-10-23-product-docs-release/browser-acceptance.json) · [截图及 SHA-256 清单](2026-10-23-product-docs-release/screenshots-manifest.json)。清单中的截图随此记录保存。

| 页面 | 首屏 | 正文图片 |
| --- | --- | --- |
| Tana 中文 | [桌面](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-desktop-top.png) / [手机](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-mobile-top.png) | [桌面](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-desktop-image2.png) / [手机](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-mobile-image2.png) |
| Tana 英文 | [桌面](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-en-desktop-top.png) | [正文](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-en-desktop-image2.png) |
| Doneas 中文 | [桌面](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-desktop-top.png) / [手机](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-mobile-top.png) | [桌面](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-desktop-image2.png) / [手机](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-mobile-image2.png) |
| Doneas 英文 | [桌面](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-en-desktop-top.png) | [正文](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-en-desktop-image2.png) |
| Ambi 中文 | [桌面](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-desktop-top.png) / [手机](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-mobile-top.png) | [桌面](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-desktop-image2.png) / [手机](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-mobile-image2.png) |
| Ambi 英文 | [桌面](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-en-desktop-top.png) | [正文](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-en-desktop-image2.png) |

## 回归检查

最终依据是合并版本的主分支 [Blog Quality and Release / 39830855910](https://github.com/cubxxw/blog/actions/runs/39830855910)。该运行于 `2026-10-23T04:24:23+08:00` 结束，平台结论为 **cancelled，整站回归未通过**；[平台注释](2026-10-23-product-docs-release/main-annotations.json) 确认达到既有 2 小时 job 时限，非本轮手动取消。PR 头版本的 [39824062985](https://github.com/cubxxw/blog/actions/runs/39824062985) 同样因 2 小时时限结束为 cancelled。快照见 [main](2026-10-23-product-docs-release/main-quality.json) 与 [PR](2026-10-23-product-docs-release/pr-quality.json)。

主分支 artifact 的冻结源码精确为 `db80e3fbfed57e9f75f15ab83ef8a192a0316059`，source、output enforce 报告均为 ok，generated SEO 为 success，内容矩阵 72/72 passed。legacy 计划 1,058 项；中断前日志记录到 960 passed、27 个最后仍失败的唯一场景、24 skipped，另有 47 项没有记录结果。此为部分日志统计，不是已完成 suite 的总结。失败包括过时测试预期及 Space 动画、音频、交互超时，不能把回归失败只归结为时限。[完整部分统计](2026-10-23-product-docs-release/main-test-summary.json) 与 [剩余 trace 摘录](2026-10-23-product-docs-release/main-remaining-failure-excerpts.json) 已保存。

先保留原日志与 [artifact 12455303879](https://github.com/cubxxw/blog/actions/runs/39830855910/artifacts/12455303879)，下载 125,977,484 字节并核对 SHA-256 `b889af5fb2acc5ad6d840d2d16ed23c0886dda88866ac66f3b2a471917f97562` 一致，再分析失败。冻结计划、报告摘要与 trace 数量见 [产物核验](2026-10-23-product-docs-release/main-artifact-verification.json)。

PR 其余现有检查中：Netlify preview、Header rules、Redirect rules、GitGuardian、create-pr 和 Mergify Summary 已成功；Pages changed 与 Mergify Merge Queue 为 neutral。CodeRabbit 的 status 为 success，但描述是 `Review rate limited`，不能据此说它完成了独立代码审查。完整 [PR check-runs](2026-10-23-product-docs-release/pr-check-runs.json)、[PR statuses](2026-10-23-product-docs-release/pr-statuses.json)、[合并信息](2026-10-23-product-docs-release/pr471.json) 与 [main check-runs](2026-10-23-product-docs-release/main-check-runs.json) 随记录保存。其他工作流成功不代替 Required blog quality。

收尾记录提交 `140f16ae0ae05193e4c334e8c05739207457c8d9` 自己的 [39837285225](https://github.com/cubxxw/blog/actions/runs/39837285225) 于 `2026-10-23T03:10:45+08:00` success；该次只有维护文档范围，未生成部署 bundle，release 和 followups 正常 skipped。见 [收尾提交检查](2026-10-23-product-docs-release/closeout-quality.json)。此成功不能替代合并版本的整站回归。

Lighthouse [39830855352](https://github.com/cubxxw/blog/actions/runs/39830855352) 第 1 次在 `/projects/` 发生 DevTools `Network.getResponseBody` 的 `PROTOCOL_TIMEOUT`。失败发生在采集阶段，尚未完成整套测量。失败 [摘要](2026-10-23-product-docs-release/lighthouse-attempt1-excerpt.log) 及 [原 artifact 12449249813](https://github.com/cubxxw/blog/actions/runs/39830855352/artifacts/12449249813) 已保留，原 artifact digest 为 `sha256:8124aeee0c88e0558b8337b655deb140e27db32502e9cdeedf2ad6be098d6ae4`。

同版 `/projects/` 独立浏览器复核 HTTP 200、load 约 0.91 秒且无 pageerror。保存首次失败证据后，仅重试失败 job；第 2 次于 `2026-10-23T02:57:43+08:00` 完成，运行结论为 success。13/13 URL 完成采集并按原规则检查，保留 6 项 performance 警告；未调整工作流、断言、阈值、范围或超时。首次失败属于本次采集未完成，重试通过不删除原失败。见 [首次采集摘要](2026-10-23-product-docs-release/lighthouse-attempt1-summary.json)、[重试快照](2026-10-23-product-docs-release/lighthouse-current.json)、[重试日志摘录](2026-10-23-product-docs-release/lighthouse-attempt2-excerpt.log) 与 [13 页结果](2026-10-23-product-docs-release/lighthouse-attempt2-summary.json)。第 2 次原 artifact 为 [12449974618](https://github.com/cubxxw/blog/actions/runs/39830855352/artifacts/12449974618)，下载后核对 digest `sha256:a2f019c9f0f581c21e942cb9a7406952fc784ef1518eb0c47cb71a96aadd9fb5` 一致。

`published` 只表示文章正式发布与本批正式页验收；**合并版本整站回归未通过**。不因合并成功、Netlify ready 或定向浏览器通过而改写该状态。

Lighthouse 第 2 次测量期间，生产站于 `02:55:38.130+08:00` 更新到首份收尾记录提交 `7a874120…`。虽然该提交没有改动正文、配图或应用实现，Lighthouse 的 success 仍只是这次在线工作流的结论，不应被当作精确冻结 `db80e3fb…` 产物的替代验收。合并版本的主分支 Required blog quality 仍是最终依据。

## 超时诊断与必要修复

PR 的 [平台注释](2026-10-23-product-docs-release/pr-annotations.json) 明确记录 `The job has exceeded the maximum execution time of 2h0m0s`。先保存日志和 [artifact 12452548853](https://github.com/cubxxw/blog/actions/runs/39824062985/artifacts/12452548853)，下载 132,577,491 字节并核对 SHA-256 `cf67f877b5f01cef7012c74354252480cf86cd94673e628dfa3165b2a1ae4275` 一致，再检查失败 trace。

该 PR 运行的实际冻结源码为 `9bf31c062a3d825552dba4c018ac9d79fa43e479`，workflow head 为 `424d891a…`。source 与 output 报告均为 enforce / ok，generated SEO 为 success；四项目内容矩阵 72/72 passed。之后计划运行 1,058 项 legacy E2E，尚未完成即到达 job 时限。日志中有 17 个最后仍失败的唯一场景，包含搜索校验及 Space 阅读、书籍、雨声、镜头、时钟和猫的状态；其中 15 项也在文章发布前基线 [39793923387](https://github.com/cubxxw/blog/actions/runs/39793923387) 留有未恢复失败。统计来自已打印结果，不是完整 suite 的最终计数，不将超时归结为只有性能问题。[详细部分统计](2026-10-23-product-docs-release/pr-test-summary.json)。

第一批必要修复涉及两份测试实现：

- 搜索测试把合法的相对 href 直接交给 Node 的 `new URL()`，7 个场景因此在校验查询参数之前抛出 `TypeError: Invalid URL`。四处解析补上 `page.url()` 作为基址，保留全部查询与导航断言。
- 书籍测试的严格对象比较未包含模板已存在的 `id` 和 `note` 字段。补齐对这两项的期望值，继续核对全部标题、作者、自著标记、链接及 10 本数量，并增加对当前字段的严格核对。

在绑定 `db80e3fb…` 的不可变 Netlify 原部署上，先复现 7 个搜索 TypeError 与一个桌面书籍字段差异，再验证原有相关场景：desktop/mobile 两个项目共 20/20 passed，0 failed、0 flaky、0 skipped；`npm run typecheck` 退出 0。两文件的 expect 调用数前后均为 242，场景名称、GPU 预算、全站范围、断言阈值与工作流时限保持不变。应用实现、三篇正文、完整英文及原图均未修改。见 [修复回执](2026-10-23-product-docs-release/targeted-repair-results.json)、[搜索修复前](2026-10-23-product-docs-release/targeted-before.log)、[书籍修复前](2026-10-23-product-docs-release/cafe-before.log)、[修复后 20 项](2026-10-23-product-docs-release/targeted-after.log) 与 [类型检查](2026-10-23-product-docs-release/typecheck.log)。

主分支最终 trace 又定位到 `p1-p2-ux.spec.ts` 的两处旧版预期：手机按钮的计数已隐藏，可访问名称为“工程”和“成长与生活”，旧正则要求尾部空格；当前注册表已包含 browser，共 12 个应用，旧测试仍要求 11。先在同一不可变部署复现两项失败，再修正名称、逐个核对 12 个应用 ID。手机分类行实测 `clientWidth = scrollWidth = 287`，无需滚动提示；测试核对工程和成长分类可见、分类行不溢出且提示隐藏，展开后仍核对溢出标签行的提示可见，并保留卡片高度、44px 控件、主题持久化和关闭行为。两项均 passed，0 failed/flaky/skipped；最终 typecheck 退出 0。见 [两项修复回执](2026-10-23-product-docs-release/mobile-contracts-repair-results.json)、[修复前](2026-10-23-product-docs-release/mobile-contracts-before.log)、[修复后](2026-10-23-product-docs-release/mobile-contracts-after.log) 与 [布局实测](2026-10-23-product-docs-release/mobile-library-diagnostic.json)。三份测试文件合计 22 项定向验证通过；检查范围、重试次数、GPU 设置、超时和尺寸阈值均未放宽。

这次定向修复验证不替代冻结产物的完整 CI。其余 Space 时序与交互失败、完整 legacy 未执行部分及运行预算问题仍需继续跟踪；没有删除场景、调低阈值或把未完成结果写为通过。现有 Space 工作 [#472](https://github.com/cubxxw/blog/pull/472) 与文章分页工作 [#474](https://github.com/cubxxw/blog/pull/474) 保持各自范围，未合并或覆盖这些并行改动。

修复提交 `90c194b9…` 的新主分支运行 [39843952273](https://github.com/cubxxw/blog/actions/runs/39843952273) 已启动，在本记录采样时 [快照](2026-10-23-product-docs-release/repair-ci.json) 为 in_progress，不能作为通过证据。手机修复提交 `08783e4e…` 也已触发完整检查 [39850588715](https://github.com/cubxxw/blog/actions/runs/39850588715) 与 Lighthouse [39850588644](https://github.com/cubxxw/blog/actions/runs/39850588644)。带观察时刻的 [追踪记录](2026-10-23-product-docs-release/ci-followup-tracking.json) 保存三个快照；各链接对应的 GitHub run/check 记录保留后续实际终态，不用采样中的运行状态推断通过。

原版主运行仍是本批最终判定依据。[剩余回归待办](2026-10-23-product-docs-release/regression-followups.json) 按主分支结果保留 5 个未解决的已观察场景：靠近/拖拽动画、缩放时重定向镜头、猫唤醒后到达、音量调整保持音源身份、手机浏览器连续音频超时；并保留未完成覆盖与未确认的底层原因。PR 独有但主分支已通过的失败单独存为历史上下文，不混入主分支最终失败数。

额外诊断在不可变原部署上使用未经修改的原场景，四项桌面均再次失败；手机 native/compatible 两项也超时，其中 compatible 本地在房间鼠标移动阶段超时，主分支原 trace 则在后续音频读回超时。此差异与本地额外 native 失败分别记录，不改写主分支 27 项失败数，也不据此断言底层原因完全相同。[诊断摘要](2026-10-23-product-docs-release/remaining-space-diagnostics.json) 保留结果与原始日志 SHA-256。进一步源码检查发现猫时钟收到先被截为 0.12 秒的场景 delta，这是稀疏渲染下动作偏慢的候选原因；音乐身份校验的失败位于 `later.id == music.id`，不是尚未执行的雨声音源断言。相关原因仍待隔离验证，应用实现、场景、超时和音源连续性断言均未修改。

修复提交的 Lighthouse [39843952208](https://github.com/cubxxw/blog/actions/runs/39843952208) 第 1 次再次在 `/projects/` 采集时出现 DevTools `Network.getResponseBody` 的 `PROTOCOL_TIMEOUT`，没有完成整套测量。先保留 [日志摘录](2026-10-23-product-docs-release/repair-lighthouse-attempt1-excerpt.log) 及 [artifact 12455770798 元信息](2026-10-23-product-docs-release/repair-lighthouse-attempt1-artifact.json)，下载 3,920,747 字节并核对 SHA-256 `3784776a11299ddd7795e767c6439af92e9ad8af0ed315fa707b453cb9c73c67` 一致，再仅重试失败 job。第 2 次于 `2026-10-23T04:30:25+08:00` 仍以相同采集错误结束，failure；只产生前 9 页报告，未到整套断言。[第 2 次日志](2026-10-23-product-docs-release/repair-lighthouse-attempt2-excerpt.log)、[报告清单](2026-10-23-product-docs-release/repair-lighthouse-attempt2-summary.json) 与 [artifact 12456407357 核验](2026-10-23-product-docs-release/repair-lighthouse-attempt2-artifact.json) 已保存，下载 SHA-256 `214e6d3cb56beb7102baab0738fdfdd1d9a130c58e2872722782d789c1e11bbd` 一致。见最终 [快照](2026-10-23-product-docs-release/repair-lighthouse.json)。采集不稳定继续跟踪，底层原因未完全确定，未直接归为基础设施故障，也未请求第 3 次盲目重跑或放宽规则。

## 内容回执与读者反馈

三张 brief 均回填 `published`、中英文正式链接、实际发布时间、部署版本与证据链接。三张博客侧内容回执放在 [pending](../content-receipts/pending/README.md)，`publication_status` 为 `published`，回执 `status` 与 `reader_feedback.status` 保持 `pending`，真实反馈列表为空。自动浏览器验收不作为读者反馈，也不证明文章所述产品的账户流程已经实测。

上游回执导入状态单独记录为 pending。本轮云环境未带入此前交接目录及上游工作树，尚未声称已写回 Brain。

## 保存与清理边界

本批修改范围为三张 brief、收尾记录、pending 回执、验证证据，以及三份测试文件中的必要校验实现修复。正文、英文翻译、配图、应用实现及 CI 范围、阈值、时限保持不变。

交接目录及其中列明的临时工作区清单尚未取得，旧临时工作区未清理。当前工作区没有 Brain 检出，未接触既有合并冲突；其他任务和改动均未回退。核实清单、确认提交及证据已保存后，才处理明确列名的本批临时工作区。

[清理回执](2026-10-23-product-docs-release/cleanup-receipt.json) 的删除清单为空；此前清理授权保留，待交接清单可读后按列名执行。当前云检出、原始 CI artifact 和完整浏览器证据也予以保留。

## 修复后整站检查终态

原合并版本的主运行继续作为最终依据。两轮测试修复的完整检查也已结束，没有手动取消任务或延长时限；文档范围检查的 success 不替代这些结果。

| 冻结源码 / 运行 | 内容检查 | legacy 已打印结果 | 未取得结果 | 结论 |
| --- | --- | --- | --- | --- |
| db80e3fb / 39830855910 | 72/72 passed | 960 passed、27 failed、24 skipped | 47 | cancelled，2h |
| 90c194b9 / 39843952273 | 48/48 passed | 909 passed、6 failed、24 skipped；其中 2 项重试恢复 | 119 | cancelled，2h |
| 08783e4e / 39850588715 | 48/48 passed | 499 passed、6 failed、13 skipped；其中 1 项重试恢复 | 540 | cancelled，2h |

各行是独立冻结运行的部分日志统计，pass 数已包含重试恢复项；不合并统计，也不以打印序号代替完成覆盖。后两行内容矩阵由既有范围判定规则选择为 48 项，legacy 范围仍为 1,058 项、单 worker、原重试策略和 120 分钟上限。source、output、workflow 的 enforce 报告均为 ok，generated SEO 为 success。

[首轮终态](2026-10-23-product-docs-release/repair90-final.json) · [手机修复版终态](2026-10-23-product-docs-release/repair087-final.json) · [平台注释](2026-10-23-product-docs-release/repair-final-annotations.json) · [trace 摘录](2026-10-23-product-docs-release/repair-final-trace-excerpts.json)。首轮 artifact 12462355011 下载 67,652,632 字节，SHA-256 为 `724a4c1b18544bc21b0d115b6d22527744d86c12feeb81a4c936433a166a27cf`；手机修复版 artifact 12463918112 下载 72,056,950 字节，SHA-256 为 `c3a8cc73a663cdc1c0362fd65dd5429a6e8f7bc28520ad9dab546619d1ce8f10`，均与 GitHub digest 一致，冻结源码分别为 90c194b9… 和 08783e4e…。

首轮仍失败的两项旧版手机预期已在后续 08783e4e 修正；但 08783e4e 的运行未抵达 mobile 项目，不能声称两项已通过冻结全量 CI。22/22 定向验证和 typecheck 通过保持为独立证据。08783e4e 还记录到两个 Space 阅读场景 90 秒超时、雨声停留 wanted、两个镜头动画失败和猫未到达；与原合并版本的音源身份、手机音频问题一并保留待办，不因覆盖中断或一次重试恢复而关闭。

文档提交 9c341164 的[范围检查 39854328929](https://github.com/cubxxw/blog/actions/runs/39854328929) 为 success；[产物](2026-10-23-product-docs-release/maintenance-check-9c34116.json) 确认仅 `requiredChecks=[workflow]`、`runSite=false`。9c341164 的 [Lighthouse 39854328809](https://github.com/cubxxw/blog/actions/runs/39854328809) 于 `2026-10-23T05:27:05+08:00` 为 failure，仍在 `/projects/` 采集时发生 `Network.getResponseBody` 的 `PROTOCOL_TIMEOUT`，只完成前 9 页，未进入完整断言。[采集证据](2026-10-23-product-docs-release/final-lighthouse.json) 保留 artifact 12459364361 及核验 SHA-256 `1900827a76bbe05e6cd4bf8369b634f40d4a8aeab430fec7a1c949c09443bf58`。未再次手动重跑或放宽规则。

9c34116444bb7a9506c5ae187e34cec37c5cf9fd 于 `2026-10-23T05:07:57.415+08:00` 部署为 Netlify `6ada7a80eeb39307a5eb844e`、ready；[六页及原图读回](2026-10-23-product-docs-release/production-before-terminal-evidence.json) 通过，文章、原图、应用和工作流相对首次发布无差异。此为明确观察时刻的平台快照；本次最终证据提交不改写三篇首次 `published_at`。

三张回执的发布状态保留 published，原合并版及修复版回归均如实记录未通过；真实读者反馈和上游导入继续 pending。交接清单仍不可读，清理回执删除列表为空，Brain 既有冲突及未列名工作区未触碰。
