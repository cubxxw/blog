# Tana 产品拆解：交付验收

目标任务卡为 `_briefs/2026-10-23-tana-product-teardown.md`。本轮只处理这一篇，交付中文与完整英文，等待协调者统一审查。核对日期为 2026-10-23（+08:00）。

## 编辑契约与成品

中文成品：[Tana 产品拆解](../../content/zh/ai-agent/posts/tana-from-notes-to-meeting-work.md)。英文成品：[Tana Product Teardown](../../content/en/ai-agent/posts/tana-from-notes-to-meeting-work.md)。

只使用任务卡批准的作者材料、图像，以及本轮重新核读的官方公开资料。未访问上游仓库、`brain://` 目标、账户或私人工作区。任务卡没有作者实测记录，文章明确使用虚构的青苔项目（英文 Project Moss），复现步骤是依据文档设计的实验，未冒充已执行的产品测试。

精确引用谱系命令只返回当前 brief，没有同引用的既有成稿可以继承。本次增量是把两个产品的分工落实到一条任务的身份、查询、会议产出与执行结果，并给出明确标为建议的首版数据关系。未把仓库其他旧文中的作者经历移入本文。

开始时已在 `codex/product-docs-bilingual-20261023` 工作分支，未在 main；按定向 dispatch 继续本篇，没有运行 `briefs:next`。已有并行改动，未改变 Git 引用或更新远程。集成与远程版本核对留给本批协调者。

## 发展编辑

结论：KEEP。

文章沿“补上提交去重”推进：对象身份让同一任务出现在不同位置，类型和查询让它进入工作界面，会议提案与执行状态再解释工作怎样继续。research 轨道使用条件式判断，不补造作者经历。

独立只读审读确认无需结构性重写。首轮实质修订来自当前 MCP 文档：素材包 F29 只概括了写入生成 proposal，而正文必须补上用户明确跳过复核后的 `autoApprove: true` 例外，且部分工具不支持。主 executor 读回 How writes work 后修正；普通修改请求不等于跳过审核。另将 proposal 限定为 AI 发起的内容改动，将创建外部工作项统一称 action。

这项变化来自允许范围内的公开研究，不涉及文章目标或私人素材变化，不需要新增作者素材批准。它也说明 proposal 页的批准要求不能扩大为“每一次写入都必须再次打开界面复核”。

## 保留来源与证据能力

下列 23 个来源均于 2026-10-23 重新核读。除 MCP 的审核例外属于本轮补充，其他项确认任务卡的公开资料。官网与文档只能证明厂商当前展示或记载，不能证明本文亲测、长期收益或内部实现。正文中的产品判断与建议另作标注。

| 来源 | 支撑的事实 | 不能据此证明 |
|---|---|---|
| [Tana 首页](https://tana.inc/) | 当前会议入口与官网演示状态 | 作者完成了外部写入 |
| [Outliner 首页](https://outliner.tana.inc/) | 当前结构化笔记定位 | 与新版为同一产品 |
| [拆分公告](https://outliner.tana.inc/blog/the-next-chapter-for-tana) | 2026-03-31 分工与厂商解释 | 新版实际学习时间下降 |
| [Tana Changelog](https://tana.inc/changelog) | 当前最新展示日期与会中、会后入口 | 所有账号表现一致 |
| [Outliner Changelog](https://outliner.tana.inc/changelog) | 10 月仍有维护记录 | 性能实测或未来维护承诺 |
| [Nodes and references](https://outliner.tana.inc/learn/features/nodes-and-references) | 唯一身份与引用编辑语义 | 实际数据库引擎 |
| [Copy-paste and export](https://outliner.tana.inc/learn/features/copy-paste-and-export) | 引用与 Duplicate；两种 JSON 的不同用途 | 所有执行逻辑可完整恢复 |
| [Supertags](https://outliner.tana.inc/learn/features/supertags) | 类型与模板语义 | 严格面向对象语言语义 |
| [Fields](https://outliner.tana.inc/learn/features/fields) | 类型选项、校验警告、初始化不持续更新 | 下游写入必然校验成功 |
| [Search nodes](https://outliner.tana.inc/learn/features/search-nodes) | 结果为引用、展开时运行、2,500 上限 | 折叠后继续后台计算 |
| [Views](https://outliner.tana.inc/learn/features/views) | 数据与呈现分离 | 本次五步实验已运行 |
| [Types](https://tana.inc/learn/features/types) | 新版字段、工作流与两种建模入口 | 与 Outliner 定义无损互换 |
| [Proposals and actions](https://tana.inc/learn/features/proposals) | 内容与外部动作、自动批准例外、执行状态、只读历史 | 所有工具永远要求逐次界面复核 |
| [Spaces and sharing](https://tana.inc/learn/features/spaces) | 访问继承和默认私有空间 | 权限穿透测试通过 |
| [AI Chat](https://outliner.tana.inc/learn/features/ai-chat) | Outliner 显式加入上下文和整图限制 | 新版有同样上下文行为 |
| [Agents](https://tana.inc/learn/features/agents) | 新版配置与定时入口 | 长任务可靠性和重试正确性 |
| [API and MCP](https://outliner.tana.inc/learn/features/local-api-mcp) | 本地、托管服务边界与节点标识桥接 | 共享数据库或自动同步 |
| [MCP](https://tana.inc/learn/features/mcp) | 默认 proposal 与显式授权后部分工具的 autoApprove 例外 | 单凭“修改”请求即可跳过审核 |
| [Workspaces](https://outliner.tana.inc/learn/features/workspaces#export-workspace) | Markdown 媒体链接，不包含媒体文件本身 | 导出已含离线媒体备份 |
| [Import data](https://outliner.tana.inc/learn/features/import-data-into-tana) | Notion 导入不保留的结构 | 所有迁移无损 |
| [Desktop](https://outliner.tana.inc/learn/features/tana-for-desktop) | 完整离线范围和临时断线覆盖风险 | 全部功能离线可用 |
| [Tana Pricing](https://tana.inc/pricing) | 新版免费档和导出承诺 | 具体组织级导出和恢复结果 |
| [Outliner Pricing](https://outliner.tana.inc/pricing) | 免费档列 500 credits | 与新版查询单位直接可比 |

新版 Meetings 详情页两次读取超时，没有用于正文引用；会中与会后入口由已成功读取的 changelog 支撑。未引用未核读的页面。定价未交互切换周期，因此正文没有把默认报价称为月付价格，也没有照抄相互矛盾的额度换算。正文没有使用离线搜索规模阈值，避免把功能页与较新更新日志中的不同口径强行合并。

## 配图与呈现

已逐张目视检查任务卡提供的两张 PNG，均为 1440 × 1000 的公开官网首屏，无账户私有内容。正文分别说明应观察什么，并标注官网演示、获取日期与非作者实测；英文保留相同路径，翻译说明。封面使用新版会议首屏，没有另造隐喻图。

- `static/images/product-docs/2026/tana-home.png`，SHA-256：`1838d570318bca6fcdfcd373cd5262d58a157a610b83d01cd942a01cc8f584a6`。
- `static/images/product-docs/2026/tana-outliner.png`，SHA-256：`741bd12e0fd968a6444754c17be8485ebd85cb36473327114a2142693e82a924`。

考虑过交互图解：本文解释的是产品语义与对象关系，虚构操作尚未亲测；静态对照表和五步实验已能表达验证方法，不需要制作可能被误认为实际运行的动画。两版只用普通 Markdown 和现有 cover 约定，未改渲染实现或增加 shortcode。

## 声音与去 AI 味

先读取当前项目 CLAUDE.md 的写作约束、brief 的 research 轨道和作者表达边界，再执行指定的全局 `lieflat-less-ai-tone/SKILL.md`，并核对仓库同名 skill。项目的 `docs/author-voice.md` 是音频工具说明，不把其旁白规范当作作者文字风格。没有从私有材料推断作者语气。

中文结构稳定后，按全部 11 条白名单逐句复查，检查了中文可见摘要与图注；未凭检测器分数重写正文，没有改动观点、限定词、事实、引文或资源路径。密集罗列的摘要在 SEO 编辑阶段完成调整；事实修订后再次复查。操作步骤、表格和访问继承中的必要配置项按规则豁免保留，英文不纳入中文去 AI 味改写。

## 确定性检查

- `npm run frontmatter:check`：通过，禁止字段检查无报错。
- `npm run tags:check`：通过，0 个文件需标准化。
- `npm run flavor:check`：实际扫描 1 篇中文，0 错误、0 警告；另对目标文章显式执行检测，结果相同。
- `npm run briefs:check -- --file _briefs/2026-10-23-tana-product-teardown.md`：目标 1 张，0 错误、0 legacy。
- `git diff --check`：通过。
- 双语定向核对：各 11 个 H2、2 张正文图片、5 步复现步骤、6 行数据关系；链接顺序和段落数量一致，各有 23 个相邻来源及 23 个去重参考，没有漏列或未使用来源。
- 元信息核对：日期均为已到达的 `2026-10-23T00:45:00+08:00`；中文 description 159 字符，英文 160；六个 canonical tags、作者、keywords 和封面路径一致；无 draft 或 categories；未出现上游私有地址或机器路径。
- 资源核对：正文与封面引用的本地文件均存在，两张图的散列保持不变。起始时已有的 Doneas brief 内容散列为 `83a39344cf798701ab6c7d4a4a567156fa93a2f474eefc3b20471ec65c5d5c8d`，首轮定向检查仍一致；结束前观察到并行工作随后更新了该文件，未回退这些变化。本 executor 的写入范围只有本篇双语文章、目标 brief 和此验收记录。

普通 Markdown 文章按仓库规定不跑本地全站构建、浏览器或 E2E；未改模板、脚本和特殊渲染，没有新增媒体路径。没有可报告的 CI、线上部署、账户功能测试或人类使用验收结果，也没有把这些状态写成通过。英文逐段独立审读给出 KEEP，无必须修改项；该审读没有验收图片像素或线上页面，配图像素检查由主 executor 单独完成。

## 交接边界

本 executor 不 commit、不 push、不合并、不部署，不填写 published。成品路由仅为待发布路径，未声称线上可访问。协调者仍需审查并按既有发布链进行构建与线上验收。若发布日发生变化，重核套餐与更新日志的时效性；本文的所有功能判断都明确截至 2026-10-23。
