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
- 语音验收只覆盖不可用回退和生命周期代码；尚未以真实麦克风验收识别质量。

证据在本地 `output/playwright/space-companion/`、`output/playwright/space-companion-regression/`；公开仓库不提交临时浏览器输出。最终定向测试与构建结果以本轮交付记录为准。

## 部署条件

线上必须在 Netlify 的 Functions 环境变量中配置 `DEEPSEEK_API_KEY`，不能将密钥放入源码或客户端。Messages 地址和模型默认值在 netlify.toml 中配置。当前本机 CLI 未登录，浏览器控制连接无法加载请求策略，线上密钥配置需由用户在 Netlify 后台完成，随后重新部署并验证线上调用。

## 参考设计

入口与任务状态参考 [Microsoft 的 Windows Agent 预览](https://blogs.windows.com/windowsexperience/2025/11/18/ignite-2025-windows-at-the-frontier-of-work/)；公开对象上下文与语音入口参考 [Google 的通用助手方向](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-universal-ai-assistant/)。本站已实现的能力由上述验收限定。

协议与实现依据：[DeepSeek Harness 源码](https://github.com/deepseek-ai/deepseek-harness/)、[DeepSeek 模型文档](https://api-docs.deepseek.com/quick_start/pricing/)、[思考模式](https://api-docs.deepseek.com/guides/thinking_mode/)。
