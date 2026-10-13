# BEAR OS：内容、旅途与可验证任务

日期：2026-10-13，上海时间。基线：`aaf0d481`。

## 目标与设计取舍

保留默认桌面与 Product Lab 双向切换，改进访客实际浏览、记录和交给 BEAR 一个任务的体验。宽屏保留多窗口；手机给出五个稳定目的地与全部应用。正文用纸面，导航和浮层用克制的半透明材质，真实内容决定视觉重点。

已比较持续侧栏工作台与内容桌面。本轮选择内容桌面：延续博客身份、减少迁移，保留 Notion 的目录、最近与对象连接思路。持续侧栏适合以后高频创作，暂不替换公开访客入口。

## 三个交付单元

1. Shell：搜索、全部应用、触控目标、键盘焦点、编辑状态下 Escape、手机导航与浅深色工艺。
2. Travel：公开照片区域筛选、单张前后浏览、地图缩放与地区列表、地区与游记关联；服务端 Immich allowlist 适配与图片代理。
3. Agent：固定服务端模型配置，客户端有限步骤工具执行；真实操作事件、逐次写入确认、取消、失败和历史记录。刷新后的活动任务为中断，不自动重放。

## 硬边界

- 不迁移文章路由，不发布新文章，不引入新的模型付费服务。
- 复用现有 DashScope 服务端配置，MiMo Token Plan 仅用于本轮编码。
- 模型只使用注册工具；不能选择 provider、宿主路径、外部账户或任意 URL。
- 浏览器笔记、留言、私人相册和 GPS 不自动回传模型。
- Immich 相册默认空 allowlist；只读取作者指定的公开分享。没有选定公开相册时继续显示原有八张照片。
- 地图标记表示已有公开旅行地区中心，不能标为照片拍摄位置。
- 沙盒保持本地开发与无网络 Docker 边界；前端停止等待不能宣称终止已执行的 Docker 进程。
- 保留本机其他活动项目和服务，只回收本任务可重建产物。

## 参考与证据

- [Apple Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)：稳定导航目的地。
- [Apple Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)：直接操作、连续反馈、可中断交互。
- [Notion Sidebar](https://www.notion.com/help/navigate-with-the-sidebar)：内容库、收藏与任务入口。
- [Claude Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)：客户端执行工具，再返回实际结果。
- [Codex as a platform](https://developers.openai.com/blog/codex-as-a-platform)：产品持有上下文、工具与审批，harness 负责循环。
- [OpenClaw Agent loop](https://docs.openclaw.ai/concepts/agent-loop)：事件、任务等待与执行终态；源码研究固定 `c86edb99b3d363c2b7e519289668f4fbab37a2c4`，未实跑 OpenClaw。
- [Immich v3.3.1](https://github.com/immich-app/immich/releases/tag/v3.3.1)、[Sharing](https://docs.immich.app/features/sharing/)：本机版本与分享接口已查证；私人资产未读取。

## 验收

工具 schema、步骤/时间/大小上限、重复写入、迟到结果、停止等待、历史恢复、公开相册越权与字段净化有定向测试。完成 Hugo 构建与 Netlify 开发页检查；中文/英文、320/390/1440 宽度、浅深色、键盘与减少动态效果覆盖实际受影响路径。最终独立 review，记录未测项目，不以设计自评分代替验收。
