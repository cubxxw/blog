# 空间助手与 DeepSeek Flash 迁移

2026-10-14。本轮修改空间助手的交互和三个文本 AI 入口，不改历史文章中的模型事实。

故障起因已由真实上游请求确认：旧运行配置连接 qwen-turbo，返回 HTTP 429 / limit_requests，本站把上游错误统一变成 ai-unavailable。现运行逻辑移除 Qwen 与 DashScope 分支，三个入口共用官方 DSH DeepSeekAdapter，模型固定为 deepseek-flash。

## 已验证

- 官方 DSH 适配器的真实 Messages 流经本地测试服务，覆盖文字、工具参数、思考过滤与 429 / 402 / 401 错误分类。
- 模型因输出上限截断时，流式和非流式都进入不完整状态，不发送成功完成标记。
- 本地 Netlify 三个函数均真实调用 DeepSeek 并返回 HTTP 200 和有效回答。
- 浏览器真实任务完成两轮模型交互：提出打开笔记的工具调用，浏览器执行后返回结果，模型才确认完成。
- 原工作区回归覆盖窗口、文章、笔记、收藏、产品切换、手机、英文、任务取消、笔记确认和刷新不重放。
- 新交互覆盖单实例快捷键、语音不可用回退、公开文章引用、选文、移除上下文后的发送负测、私有编辑器排除、320px 布局。
- 回答支持有限的行内加粗；模型输出中的 HTML 始终显示为文字，不执行。默认回复收短，打开应用后简短确认实际结果。
- 界面语言经规范化后明确写入服务端模型指令；仅使用 English / Chinese 常量，客户端原文不进入系统指令。英文界面的真实两轮模型任务、实际打开文章目录和手机布局已通过本地验证。
- 语音验收只覆盖不可用回退和生命周期代码；尚未以真实麦克风验收识别质量。

最终本地验收：149 项工作区及服务测试、5 项文章客户端测试通过；21 项原工作区与8 项新交互浏览器检查通过，另已独立实测真实 DeepSeek 两轮工具任务。生产构建与双语产品、SEO 输出检查通过。独立审查确认上下文移除、截断回答和超时断言已闭环，取消流关闭上游连接，原生依赖打包可加载。英文回复回归复审的 21 项服务边界测试全部通过。

证据在本地 `output/playwright/space-companion/`、`output/playwright/space-companion-final-regression/`；公开仓库不提交临时浏览器输出。语音检查未使用真实麦克风。

## 线上验收

已通过管理 cubxxw 站点的账户完成配置，`DEEPSEEK_API_KEY` 保存为生产环境的 Secret，旧 `DASHSCOPE_API_KEY` 已删除。当前 Starter 计划不支持单独选择 Functions 范围，使用 Netlify 默认的 Builds / Functions / Runtime 范围。凭证不进入源码、客户端或验收输出。

首次完成线上配置的生产部署 `6acf4ff8230b097180af84c2` 已就绪，来源为 `e760193`。在正式域名 cubxxw.com 上，空间、首页、文章三个入口都真实返回 HTTP 200 与有效回答；两个流式入口正常结束。正式中文页面完成两轮模型交互并实际打开文章目录，手机页面没有横向溢出，浏览器无运行错误。实现与验收提交的 GitHub 质量检查、Lighthouse 检查均通过。

线上证据保存在本地 `output/playwright/space-companion-production/`：`configuration.json` 只记录配置元信息，`services.json` 记录三个服务的实际返回，`browser.json` 记录模型轮次、工具执行、窗口和手机布局；配套桌面与手机截图保留实际回答。

## 参考设计

入口与任务状态参考 [Microsoft 的 Windows Agent 预览](https://blogs.windows.com/windowsexperience/2025/11/18/ignite-2025-windows-at-the-frontier-of-work/)；公开对象上下文与语音入口参考 [Google 的通用助手方向](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-universal-ai-assistant/)。本站已实现的能力由上述验收限定。

协议与实现依据：[DeepSeek Harness 源码](https://github.com/deepseek-ai/deepseek-harness/)、[DeepSeek 模型文档](https://api-docs.deepseek.com/quick_start/pricing/)、[思考模式](https://api-docs.deepseek.com/guides/thinking_mode/)。
