# BEAR OS Evolution Implementation Plan

> **For agentic workers:** Use scoped parallel workers for independent modules and an independent review of the integrated result. User has authorized direct execution and multi-agent work; no design confirmation gate.

**Goal:** 将 BEAR OS 的导航、旅途与 AI 改造成连贯、可恢复、有真实操作证据的访客工作区。

**Architecture:** Hugo 保留公开内容与资源构建；浏览器管理窗口与私人状态；Netlify 固定模型和 Immich 的服务端连接。工具循环执行实际浏览器操作，公开相册按服务端 allowlist 投影。

**Tech Stack:** Hugo 0.145.0 extended、vanilla JavaScript/ES modules、Node 22、Netlify Functions；无新前端框架。

**Spec:** `docs/superpowers/specs/2026-10-13-bear-os-evolution.md`

## Global Constraints

保留 BEAR 默认入口和 Product Lab；双语、手机、键盘、深色与 reduced motion。私密状态不自动发送；无公开 shell；Immich 默认无公开相册。只运行定向测试和一个本地服务栈。

## Review Focus

- 模型工具参数、恶意来源文字、未知工具与超长结果。
- 停止后迟到模型结果、审批重用、关闭窗口和刷新后的未终结任务。
- 未批准相册、伪造资产 ID、分享过期、元数据与上游重定向。
- 320px 手机、输入焦点、键盘 Escape、全部应用与返回路径。
- 远端新提交、未提交输出、其他活动项目和服务生命周期。

## Task 1: Shell 与导航

Owner：`shell_implementation`。Files：`desktop.js`、`space.css`、`desktop.html`、`icon.html`、`navigation.mjs` 与定向测试。

- [x] 实现手机五入口、全部应用启动器与一致的搜索快捷键。
- [x] 修窗口点击区域、焦点、编辑态 Escape 与材质排版。
- [x] 运行定向检查并向父 Agent 返回接口与证据。

## Task 2: Travel 与 Immich

Owner：`media_implementation`。Files：`media.js`、`media-state.mjs`、`space-media.css`、`bear-media.js` 与定向测试。

Produces：`mountMedia({catalog,execute,notify})`，包含 `renderPhotos`、`renderMap`、`dispose`、`status`。

- [x] 完成区域筛选、照片前后浏览、缩放地图和游记关联。
- [x] 实现空默认 allowlist、共享链接校验、资产归属与图片代理。
- [x] 测越权、错误、超时、净化和选择状态。

## Task 3: Agent loop

Owner：Pi `20261013-122103-522f5592`，固定 `xiaomi-token-plan-cn/mimo-v2.6-pro`。Files：`agent-loop.mjs`、`agent-panel.js`、`space-agent.css`、`bear-agent.js` 与测试。

Produces：`runAgentTask(...)` 与 `mountAgent({host,catalog,execute,getState,notify})`。

- [x] 固定模型 turn 接口、注册工具与有限执行循环。
- [x] 实现实际事件、逐次审批、取消与有界任务历史。
- [x] 测任务终态、重复动作、审批取消、恶意输入与失败结果。

## Task 4: 集成与交付

Owner：父 Agent。Files：`apps.js`、共享状态、构建资源、定向浏览器验收与本文档。

- [x] 核对独立模块，接入应用与 Hugo 资源；修必要的共享边界。
- [x] 运行123项定向测试、初始生产构建与最新 Netlify dev 页面21项验证，保存永久证据；最终生产产物交给当前提交CI。
- [x] 独立 review，修已确认问题并复核。
- [ ] 按仓库默认流程提交和推送 main，等待当前提交 CI/部署验证。
- [ ] 收尾本任务服务与临时产物。

## Progress

- 基线13项窗口与沙盒边界测试通过。
- 独立 managed worktree：`/Users/cubxxw/.codex/worktrees/bear-os-evolution/blog`。
- 现有公开照片、三地区与本机 Immich v3.3.1 已核查；尚未指定公开 Immich 相册，未读取私人素材。
- 设计选择 A（内容桌面）；方案 B（持续侧栏）保留研究结论，避免双重导航同时上线。

- 最终独立复核：2项P1、3项P2全部关闭，暂无未解决P0/P1。
- 最新公开main基线已快进到 `11ba51ab`，保留自动SEO快照和主工作区无关 `output/`。
- 本地剩余26GiB，遵守资源守卫，不并行追加全量构建。
