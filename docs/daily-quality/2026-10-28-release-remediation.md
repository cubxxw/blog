# 2026-10-28 发布门禁修复

本轮接续 PR487，保留原分支历史并正常合入 main。只处理生产构建资源争用和物件键盘菜单遮挡；主页布局、文章、锁文件、工具版本、页面数、视口、断言、超时与重试保持原值。独立审阅后更新现有 PR，由主任务负责最终合并和发布。

## 构建

原冻结生产构建退出 2，两篇 columns 页的 Critical CSS 未完成。插件吞掉具体 renderer 错误，因此用同一锁定 critical、相同 Hugo 输出、全部 30 页、三个原视口和相同限时做对照：并发 2 时 7 页出现 `Penthouse timed out after 30s`；并发 1 时 30 页全部完成。失败页面随批次变化，证据支持资源争用，不能把最初两篇文章当作内容错误。

`netlify.toml` 仅把页并发改为 1。renderer 的 30 秒、池任务的 120 秒、全部页面、视口和构建失败判定均保留。严格冻结构建必须在提交后重跑；上述诊断输出不算正式构建成功。

## 键盘与原生点击

手机尺寸 Chromium 中，真实 Enter 播放音响后，焦点留在 speaker，`:focus-within` 使物件菜单展开。电脑投影点 `(265.64, 405.19)` 实际命中菜单的 speaker。修复前真实 Escape 后仍然如此，原生点击无法在原 5 秒内打开电脑。

现在仅在物件 nav 内处理 Escape，沿用世界导航、可见性、blocked 和室内条件，并保留输入法组合键及已消费事件。消费 Escape 后将焦点交回已有 canvas；CSS 自然收起菜单，不设置世界模式、相机或音频状态。

真实手机尺寸浏览器回归通过。菜单从 `343×487.19` 收起为 `1×1`，投影命中 canvas，模式、相机和播放状态保持相同，原生电脑点击通过原 5 秒断言。正式 Browser 流程增加同一真实 Escape 步骤；原有 `music=no` 保存偏好只作为手动启动音乐的前置，不改变首访自动播放或加载取消语义。

宿主定向 85 项通过，包含真实 listener 的组合键、blocked、世界和门状态检查，以及既有音频意图与加载取消测试。构建相关 56 项中 55 通过、1 项既有跳过。12 项完整 Browser、提交后的冻结构建和新 head CI 结果继续记录在交接证据，不将诊断输出或单例通过扩展为整套通过。

本机证据目录为 `~/.codex/artifacts/online-remediation-20261028/`：`blog-critical-batch-diagnostic.json`、`blog-critical-serial-diagnostic.json`、`blog-menu-paused-escape-probe.json`、`blog-menu-green-target.json`，以及同名前缀的原始日志和 Playwright 报告。首次本机探针还遇到错误工作目录、SwiftShader 冷启动和 CDP cleanup 失败，这些与菜单故障分开保留，不计为菜单红绿证据。

Lighthouse 和 SEO Snapshot 的外部失败尚未验收恢复。PSI 的槽位与错误检查保持；未经同版本公开目标验证，不归因为权限问题，也不把本次资源修复写成外部测量已经通过。
