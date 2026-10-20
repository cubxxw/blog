# 项目描述更新记录

核对日期：2026-10-20（Asia/Shanghai）。以各项目当前公开 README、产品文案与官网响应为依据，更新 `data/products.yml` 的中英文目录，同时修订 IMStage 的双语详情页。

## 本次修正

| 目录项目 | 当前描述与依据 |
| --- | --- |
| capri | 仓库名为 Capir，公开显示品牌为小写 capri；前身为 Talent Signal。定位已从独立猎头工具扩展为保存重要人物背景与未完事项的个人 Agent。官网提供合成演示，真实工作空间需申请；完整接续仍是验证中的产品方向。[README](https://github.com/getyak/capir/blob/30b41f3235e68c600e91303b04fd6e953bb6431b/README.md) |
| Leafhour | 支持导入 PDF、EPUB、TXT、Markdown，按需查看直译与意译，并把笔记和问题留在原文旁。移除缺乏当前证据的 Google 品牌审核状态，未据此宣称审核已通过。[README](https://github.com/getyak/leafhour/blob/0d2ebb310d8af3fc4b94885b37fa089ae929f01b/README.md) |
| IMStage | 定位为非商业测试、教学与评测数据集的合成聊天工具。新版本为非商业源码可用许可，历史 MIT 版本保持原条款；公开入口已禁用真实截图编辑。补充 JSON 导出、OAuth 账号 MCP 与实例 MCP 的区别。[README](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md) |
| Roamorrow | Solo Compass 已更名，官网与源码入口同步更新。保留地图优先、独行旅行与 AI 筛选的方向；阶段仍按 README 标记为 TestFlight 准备中。[README](https://github.com/getyak/roamorrow/blob/d7c5e4cb2f29cf43ade75e1405e2758b72cdee6a/README.md) |
| DayPage | 从轻量日记说明更新为本地优先的个人记忆系统：原始记录经 AI 编译为 Daily Pages、实体页面和知识图谱。技术栈覆盖 SwiftUI、Kotlin、Next.js 和 MCP，不以代码存在推断各客户端已完整交付。[README](https://github.com/getyak/daypage/blob/243e7c537d23eaf0536e1b51b73e4435fb166224/README.md) |
| Telepace | 从语音用户研究更新为 evidence-to-eval：定义正确性，将生产失败、专家修正与用户意图编译为可回放 Eval Pack 和版本化发布门禁。访谈是补齐证据的一种入口。[README](https://github.com/getyak/telepace-next/blob/46dd7309e644591b519727118349989cde8d1668/README.md) |
| Vantage | Apply Agent 仓库中的界面品牌为 Vantage，开源系统名为 Relay。更新职业事实审阅、岗位匹配、材料准备与浏览器填表的描述，明确最终投递由用户确认。[README](https://github.com/getyak/apply-agent/blob/2ba250495645e373b0b753bd1ba75f2ac5731e0c/README.md) |
| Agent Diff Guard | 补充 Agent loop 的范围、预算、停止条件与本地审计；保留 push 前检查、日志 token 与估算成本的职责。源码运行和完整代码审查的边界均有说明。[README](https://github.com/cubxxw/agent-diff-guard/blob/171a0a558c84fa8e7235efe75ccdef3d720ff047/README.md) |

## 兼容与观察边界

- 目录仍保留 `talent-signal`、`solo-compass`、`apply-agent` 内部 ID，避免破坏已保存的产品选择、窗口状态、文章关联和图片路径。
- 首页、About、BEAR OS 与 Product Lab 继续读取同一目录；默认 BEAR OS 与双向切换逻辑未修改。
- 现有 capri 与 IMStage 图片保留为早期界面，替代文字或文章图注明确标识，未伪造当前截图。
- 官网 HTTP 200：`gettalentsignal.com`、其 `/demo`、`leafhour.com`、其 `/en` 与公开阅读入口、`imstage.org`、`roamorrow.com`。
- 本机请求 DayPage、Telepace、Vantage 官网得到 HTTP 403，无法验证线上应用体验；目录状态保守标记为持续开发，并提供可核对的公开源码入口。没有把源码能力当作线上验收结果。

## 验证

- `npm run frontmatter:check`：通过。
- `npm run tags:check`：通过，0 个文件需要标签迁移。
- `npm run flavor:check`：本次修改的中文文章 1 篇，0 错误、0 警告；并按 `lieflat-less-ai-tone` 白名单逐句复查可见文案。
- Hugo `0.145.0 extended` 压缩构建：通过，英文 346 页、中文 369 页。最后一次使用相同缓存重建，用时 24.586 秒。
- 对本次构建执行 `npm run products:check`：通过，覆盖中英文 Projects、首页和 About 的共享目录、语言资源、图片存在性，以及 BEAR OS 默认入口与双向切换控件。
- 对生成页面额外逐项核对：8 个项目的中英文名称、完整描述与 GitHub 链接均匹配当前 YAML；IMStage 两版详情页的 description 与当前源文件一致，分别为 154 和 158 字符，参考资料存在，旧 MIT 许可表述已移除。
- 两个修改脚本的语法检查、`git diff --check`：通过。
- 独立只读 reviewer 核对上述固定版本来源、双语事实与目录消费路径：未发现需修复的 P0/P1/P2。旧 roadmap 字段未被当前首页、About、BEAR OS 或 Product Lab 渲染。
- 本次没有修改布局或交互逻辑，未运行本地浏览器、全量 E2E 或 iOS 测试；产品官网的实际登录体验不在本次验收范围内。

按仓库 `CLAUDE.md` 的默认交付流程直接提交并推送 `origin/main`；线上状态以该提交对应的 GitHub 检查与部署读回为准，本记录不将本地构建当作线上发布成功。
