---
schema: blog-brief/v1
id: 2026-10-23-tana-product-teardown
title: Tana 产品拆解：从结构化笔记到会议中的工作
status: ready
priority: normal
language: zh-en
section: ai-agent
brief_type: research
dispatched_at: 2026-10-23T00:25:00+08:00
source_refs:
  - brain://research/learning/tana-product-teardown/index.md
---

# 选题契约

## 唯一命题

为正在设计知识工作产品的独立开发者解释 Tana 如何连接信息结构、会议与后续行动。先辨明当前 Tana 与 Tana Outliner 的产品分工，再讨论哪些机制值得借鉴、实施时要承担什么成本。

## 为什么值得由我写

读者需要看清一条工作怎样穿过对象与界面，而不只是知道产品有哪些按钮。本篇以公开文档逐项核验，给出可以自行复现的最小例子和验收方法。没有获准公开的个人测试记录，不写成作者亲测或长期使用心得。

## 目标读者与阅读场景

读者正在做笔记、知识管理或会议产品，需要决定先建立哪种数据对象，哪些工作应由人确认，怎样判断首版真正可用。读完能画出自己的最小产品流程，并辨别官方能力与自己的实现选择。

## 编辑选择

- 文章轨道：research；三篇中这一篇专注结构化信息如何进入工作。
- 已选形态：独立、可连续阅读的深度产品拆解，正文建议约 5000–8000 中文字，按材料决定实际长度。
- 核心张力：结构化信息带来的复用能力，与学习成本、团队协作及自动修改风险。
- 这次主动不讲：未经证实的服务端源码、性能、用户增长、长期个人收益。

## 已批准素材包

### 事实与项目证据

当前官方研究入口为 https://tana.inc/ 与 https://outliner.tana.inc/ 。2026 年 3 月的官方公告说明两款产品的分工，发布前必须结合当前官网和更新日志复核，不能把公告时的状态当作当前状态。节点、Supertags、字段、引用、搜索、导入导出和开放接口等事实分别核读所属产品的官方说明。

### 作者原话与在场片段

本批任务原话：“写三篇产品文档，分别是 tana ， doneas 以及 ambi，整个链路，一直到发布，带中英文，图片，去AI味”。本人进一步选择“三篇深度产品拆解文章”。这明确授权本篇中文定稿后完成英文、配图、提交、发布与线上验收，无需重复请求这些动作的许可。

### 作者观察

没有额外获准公开的个人判断。作者关心的是从产品流程走到可实现、可验收的工程选择；不得为增强在场感补造使用经历。

### 待验证推论

可以给出自己的最小数据模型与实现路线，必须直说这是建议方案，并非 Tana 的实际后端。演示数据只用虚构项目，不使用真实工作区内容。

## 参考方向

从产品身份、一个具体工作对象的流转、关键交互与实现代价深入。公开来源就近引用，文末去重列出；必要时与另两篇互链。新资料由本次公开研究取得，不读取 brain:// 目标。

## 证据与隐私边界

- 可以公开：本 brief 的任务要求、重新核读的公开资料、无账户信息的官方页面截图、明确标为建议的原创示意。
- 必须匿名：例子使用合成数据；公开页面的营销演示要标明为官方演示。
- 禁止使用：brain 私有教材、实测原文、账户或付费信息、未获逐项批准的截图与个人材料。
- 发布前仍需作者确认：新增私人素材或改变文章目标时才需要确认；本篇的双语与公开发布已在本次任务获准。

## 不要写成

功能清单、营销软文、假装长期体验的第一人称评测、把客户端线索当服务端架构的逆向报告。避免三篇套用同一结构。英文完整自然，不是中文摘要。

## 验收标准

- [ ] 产品身份和事实按 2026-10-23 公开来源复核；示例、官方承诺和建议实现分明
- [ ] 中文稳定后按 translate-and-format-blog 产出完整英文，同路径同资源
- [ ] 每篇至少两张有解释作用的已检查配图，优先公开界面与产品细节；封面准确
- [ ] 先读作者声音，再执行 lieflat-less-ai-tone 白名单检查；后续改正文要复查
- [ ] 相邻引文、文末参考、标签、元信息、资源、双语一致性和文章级检查通过
- [ ] 不 commit、不 push、不发布，由本批协调者统一审查和执行已授权发布

## 执行回执

- article:
- public_url:
- editorial_verdict:
- source_trail:
- checks:
- published_at:
- retro_notes:

## 本次公开研究附录

以下为本次重新读取公开网页取得的事实包，允许作为写作证据。只选择实际支撑正文的部分；每个事实仍保留相邻来源，不能将资料包全文改写为文章。

# Tana / Tana Outliner：公开资料事实包

核对日期：2026-10-23（Asia/Singapore）。用途：供 cubxxw.com 后续独立文章取证；这是研究材料，不是文章成稿。

范围：只使用无需登录即可访问的 Tana 官方页面，并以本次网页读取复核。未登录、未安装、未进入个人工作区、未读取 Brain、未使用个人记忆、未做功能亲测。下文“支持”均指官方当前文档记载，不能改写成“我试过”。截图部分只列公开候选入口，尚未截取。

## 1. 必须先分清的产品身份

**F01｜当前有两个产品，不能把旧教程的功能、价格和界面全部称为新版 Tana。** 当前主站把 Tana 定义为原生视频通话中的 agentic meeting platform；Outliner 首页明确将自身定义为独立的知识管理大纲工具，其核心是节点和 Supertags。官方甚至提示：把 Tana 描述为笔记、PKM 或 outliner 的旧网页内容，指的是 Tana Outliner。

- 新 Tana：[官方首页](https://tana.inc/)
- Tana Outliner：[官方首页](https://outliner.tana.inc/)

**F02｜2026-03-31 公告是产品拆分的时间锚点。** 官方称原产品继续以 Tana Outliner 存在；新产品为协作重建，并承认一段时间内新产品不会覆盖 Outliner 全部能力。公告解释：旧产品虽强大，但难学、难向团队推广；协作基础不能靠最后外挂完成。这是厂商对产品取舍的解释，不是独立用户研究结果。

- [The next chapter for Tana，2026-03-31](https://outliner.tana.inc/blog/the-next-chapter-for-tana)

**F03｜5 月的“社区发布、尚非公开发布”已经只能用于历史叙述。** 2026-05-27 月报称新 Tana 当时处于社区反馈阶段；截至本次核对，主站已有下载、注册和 Free / Pro / Business 计划，当前 changelog 已更新到 2026-10-08。不要用 5 月状态判断今天能否使用，也不要仅凭当前营销站推断所有账号均可获得全部功能。

- [Tana Current May 2026，2026-05-27](https://outliner.tana.inc/blog/tana-current-may-2026)
- [新 Tana Pricing](https://tana.inc/pricing)
- [新 Tana Changelog](https://tana.inc/changelog)

## 2. Tana Outliner 的数据模型：已公开的行为语义

**F04｜基础单位是 node。** 大纲中的每个 bullet 是节点；节点创建时有唯一 ID，同文案不代表同对象。字段、视图、命令、设置等在文档中也被描述为节点。节点在大纲层级中通常有一个 owner。这里是公开对象语义，不能据此断言其内部用了哪一种图数据库。

**F05｜reference 是同一节点的另一次呈现。** 任一位置的编辑会更新其他引用；删除引用不会删除原节点。普通复制粘贴优先生成引用；要产生独立副本需用 Duplicate。这个行为比“可以双链”更能解释其模型，也可能与新用户已有的复制习惯冲突。

- F04、F05：[Nodes and references](https://outliner.tana.inc/learn/features/nodes-and-references)
- 复制行为另见：[Copy-paste and export](https://outliner.tana.inc/learn/features/copy-paste-and-export)

**F06｜Supertag 是给节点加类型和模板。** 打上同一 tag 的节点可组成可查询、筛选、表格化的集合；模板可带字段、普通子节点和搜索节点。官方用 “is a” 判断适合的类型，如人、会议、任务；不要只把它解释成主题标签。

**F07｜Extend 是模板复用。** 扩展另一 supertag 后可继承模板内容、添加字段或覆盖默认值，但不能在派生模板中移动或删除来源模板内容。它可以用来构造 Task → Design task 这类模型；不能只凭此功能把整个系统等同于严格的面向对象语言。

- F06、F07：[Supertags](https://outliner.tana.inc/learn/features/supertags)

**F08｜字段表达对象属性，类型校验并非强制约束。** 文档列出 Plain、Options、Options from supertag、Date、Number、Tana Outliner user、URL、Email、Checkbox 九类。Options from supertag 从指定类型的已有节点生成候选项。校验不合规则显示警告，不阻止存入数据。

**F09｜字段可依上下文初始化，但初始化不是持续计算。** 可从祖先、当前日期或用户等填入值；仅在 supertag 模板字段的初始化时触发，之后不会随来源自动更新。避免把它写成电子表格公式或始终同步的关系属性。

- F08、F09：[Fields](https://outliner.tana.inc/learn/features/fields)

## 3. 视图和查询怎样把记录变成工作界面

**F10｜View 改变子节点的呈现，不改变底层数据。** 当前文档列出 Outline、Table、Cards，以及导航用途的 List、Calendar、Side menu、Tabs；可按字段筛选、排序、分组。同一组内容可保留多种视图状态。视图也能用在搜索节点与字段上。

- [Views](https://outliner.tana.inc/learn/features/views)

**F11｜Search node 保存的是查询，结果仍是原节点的引用。** 查询可跨有访问权的工作区，条件包括类型、字段、层级、日期、完成状态、文本等，可组合 AND / OR / NOT。编辑结果即编辑原对象。查询构建器还显示可读的逻辑表达。

**F12｜“Live”有明确边界。** 文档说查询在搜索节点展开时运行，折叠时不在后台运行；结果上限为 2,500 个，超出需收窄条件。不要写成所有看板都在后台持续计算且没有规模限制。可在查询结果中新增节点，但系统无法满足条件时会显示 mismatch。

- F11、F12：[Search nodes](https://outliner.tana.inc/learn/features/search-nodes)

**F13｜最新记录显示 Outliner 仍有持续维护。** 本次 changelog 首条为 2026-10-12，包含时区、隐藏空分组、分组行数和性能/编辑修复；不能把拆分解释为官方已经停止维护旧产品。

- [Outliner Changelog](https://outliner.tana.inc/changelog)

## 4. Outliner 中的 AI、命令与外部工具

**F14｜AI chat 不是默认读取整个 graph。** 可从节点下方按 Space 开聊，或在侧栏单独开聊；需用 @ 或搜索结果显式带入上下文。当前 AI Chat 页面明确写着不能与整个 graph 对话，也写着该聊天功能暂不处理图片和文件。整段聊天会重复作为上下文发送，因此对话越长可能越耗额度。

- [AI Chat](https://outliner.tana.inc/learn/features/ai-chat)

**F15｜Outliner 的 Agent 是可定制的聊天体验。** 文档中的组成是系统提示词、可选欢迎语、聊天命令，可作为 tagged node 上的按钮或命令入口。构建需要 command nodes / AI commands 知识，并要求付费计划；不能套用新版 Tana 的所有 agent 调度能力。

- [AI Agents](https://outliner.tana.inc/learn/features/ai-agents)

**F16｜AI 被放进多个捕获与加工入口。** 官方列出无 bot 的会议转录、带笔记上下文的聊天、图片生成、语音备忘与实时口述。厂商声称会按任务匹配模型；模型“fine-tuned”的具体技术含义未在此页公开，成稿不宜据此推断训练方式。

- [Tana AI](https://outliner.tana.inc/learn/features/tana-ai)

**F17｜Outliner 同时提供本地和托管 MCP。** 本地服务在桌面应用中运行且免费，客户端可查询、读取和修改节点/类型/字段；须保持应用运行并载入工作区。Hosted MCP 当前标为 beta，要求付费，HTTP + OAuth，不必保持桌面开着。官方文档也提供把新 Tana 接到 Outliner 图谱的路径。

**F18｜连接不等于两产品自动同步。** 文档描述的是借助工具读取/写回，并建议传递 Outliner node ID 保留精确对应；这是显式工具桥接，不是已证实的共享底层存储或无损自动迁移。

- F17、F18：[API and MCP](https://outliner.tana.inc/learn/features/local-api-mcp)

## 5. 导入、导出与数据可迁移性的边界

**F19｜Outliner 有原生导入器，但不是无损迁移承诺。** 当前列出 Notion、Roam、Logseq、Workflowy/OPML；导入创建独立工作区。Notion 可带页面、CSV 数据库、图片和跨页链接；数据库关系、自定义视图及工作区自动化不保留。Notion 单次上限写为 1,500 个 Markdown 文件。普通 Markdown 文件不能直接批量导入这一入口；可用 Tana Paste / Intermediate Format 等另行转换。

- [Import data into Tana Outliner from other tools](https://outliner.tana.inc/learn/features/import-data-into-tana)
- 更详细的复核入口：[Import content from Notion](https://outliner.tana.inc/learn/guides/import-from-notion)

**F20｜Outliner 可以导出 Markdown 和 JSON，但格式用途不同。** Markdown 适合浏览或迁往其他工具；JSON 当前分为可再导入新工作区的 Tana Intermediate Format 2.1 与技术用途的完整 Tana JSON，后者不能用 TIF importer 回灌。不要笼统写“JSON 一键恢复全部工作区”。

- [Copy-paste and export](https://outliner.tana.inc/learn/features/copy-paste-and-export)

**F21｜Markdown 导出不含图像/视频二进制。** 工作区导出中引用变成 Markdown 链接，媒体以下载链接保留；需要另存媒体。导出在本机运行，大工作区可能受内存/CPU 限制，过程中不能继续使用应用。迁移文章应分别检查文本、引用、schema、媒体和执行逻辑，而不是只看有没有导出按钮。

- [Workspaces — Export workspace](https://outliner.tana.inc/learn/features/workspaces#export-workspace)

**F22｜2026-10-09 changelog 记录了三种 Markdown 工作区布局。** Workspace outline、Supertag folders、Structured vault；后两者可选类型，Structured vault 包含 YAML 字段、类型 schema 和笔记链接。它说明导出能力在变，旧教程不一定覆盖当前版本；仍需亲测确认导出产物。

- [Outliner Changelog](https://outliner.tana.inc/changelog)

**F23｜新 Tana 的导出承诺不能替代操作证据。** 当前 Pricing FAQ 说取消或降级后仍可访问数据，并说将能够导出至其他系统；本次未找到与 Outliner 同等具体的新 Tana 全组织导出、格式保真和回灌说明。不要把 Outliner 的导入导出清单直接转给新 Tana。

- [新 Tana Pricing — What about my data?](https://tana.inc/pricing)

## 6. 新 Tana：目前文档已经写清的交互与结构

**F24｜新版的对象入口更接近文档与团队工作。** Learn 将其描述为 documents、tasks、AI、structured data 的协作工作区；会议、AI chat、outcomes 与 types 是文档中的核心入口。这个定位变化是可证事实；“学习成本因此更低”仍需用户任务测试。

- [新 Tana Learn](https://tana.inc/learn)

**F25｜Types 保留结构化能力，但不能简单改名为 Outliner Supertags。** 类型给文档共享字段；字段有 Text、Link、Date、Member、Options，可设单值或多值。Link 可约束目标类型并设反向标签；type 可有工作流看板、AI instructions 和 skills。官方支持以自然语言让 AI 建类型，也支持手动建立。现有文档未证明其与 Outliner 的类型定义可直接无损互换。

- [Types](https://tana.inc/learn/features/types)

**F26｜Spaces 同时是内容、访问和 AI 上下文的容器。** 文档将访问继承写为 organization → space → document；新 space 默认仅自己，单文档可进一步收紧。Space 可有自己的 types、skills 和 AI instructions；共享文档支持实时协作和光标；另可打开无需账号的公开查看链接。这是文档描述，未做权限穿透测试。

- [Spaces and sharing](https://tana.inc/learn/features/spaces)

**F27｜新版最值得核验的是 proposal / action 这个提交边界，但“所有改动都需手动批准”并不准确。** 页面开头概括 AI 内容操作先成 proposal、外部写入先成 action，供接受/拒绝并回报结果；同页 Automatic approval 又明确列出例外：会议定期摘要、截图选择等自动批准，后台处理的文档新建也可能自动批准。更新、删除、空间改动才被写为始终需批准；外部邮件始终先成 action。文档还列出部分成功、失败、等待用户等执行状态。其版本历史当前只读，不能直接回滚。以上都是官方公开行为说明，未做实测；不能把页首概括写成无例外的安全保证。

- [Proposals and actions](https://tana.inc/learn/features/proposals)

**F28｜新版 agent 的能力范围与 Outliner 不同。** 官方描述 prompt、capabilities、可选 schedule；可在聊天、语音和定时任务中运行，space 可设默认 agent。这里只能确认公开功能设计与文档，不证明长任务可靠性、重试或错误隔离。

- [Agents](https://tana.inc/learn/features/agents)

**F29｜新版的外部 MCP 也走 proposal。** 新 Tana 提供 OAuth 的 MCP server，文档列出 search/read/create/update/delete/schema/skills，写入需审核 proposal；其地址属于 home.tana.inc，与 Outliner 的 app.tana.inc 是不同入口。成稿只需说明二者各有连接方式，不必列端点。

- [MCP](https://tana.inc/learn/features/mcp)

## 7. 平台与计划：只记录当前公开可见状态

**F30｜Outliner 有 Web、Mac、Windows、Linux 与 iOS/Android。** 桌面版文档称增加离线、全局捕获、原生标签/分栏和会议通知。移动端支持浏览、编辑、搜索及多种捕获；文档明确截图按 iOS，Android 尚可能缺少部分功能。旧 Tana Capture 已弃用，替代者为 Tana Mobile。

- [Outliner desktop](https://outliner.tana.inc/learn/features/tana-for-desktop)
- [Tana Mobile](https://outliner.tana.inc/learn/features/tana-mobile)
- [Tana Capture：deprecated](https://outliner.tana.inc/learn/features/tana-capture)

**F31｜Outliner 离线不是所有功能都可运行。** 完整离线模式可编辑个人工作区，共享工作区只读；AI、commands、发布、日历同步、第三方集成需联网；超过 750,000 节点的工作区搜索也列为需联网。临时断线时继续在共享区编辑，重新同步可能覆盖其他编辑。不要据此称它是纯本地软件。

- [Outliner desktop — Work offline](https://outliner.tana.inc/learn/features/tana-for-desktop#work-offline)

**F32｜Outliner 当前定价页列 Free、Plus、Pro。** 抓取默认展示 Plus $8/月、Pro $14/月，并有 Monthly/Yearly（Save 22%）切换；本次未交互切换结算周期，因此不可把这两个数直接称为“月付价格”。Free 列每月 500 AI credits，最多 3 工作区、0.5 GB 文件存储、单文件 5 MB，并允许 Markdown/JSON 导出；付费档可选择模型和增加工作区，Pro 再列 Readwise、Input API 等能力。套餐权益应在发布当天再次复核。

- [Outliner Pricing](https://outliner.tana.inc/pricing)

**F33｜Outliner pricing 有内部不一致，别照抄额度换算。** 同一页卡片与 FAQ 的生成图片/会议折算不一致；AI 总览也残留“AI requires paid plan”，而当前 pricing 明确 Free 有 500 credits。可准确写“Free 当前列 500 credits”，不要将约等于多少会议/图片当成稳定事实。Hosted MCP 的付费边界以专门文档为准。

- [Outliner Pricing](https://outliner.tana.inc/pricing)
- [Tana AI](https://outliner.tana.inc/learn/features/tana-ai)
- [API and MCP](https://outliner.tana.inc/learn/features/local-api-mcp)

**F34｜新 Tana 有 Web 和 Mac/Windows/Linux 桌面版。** Apps 页面列 PWA、实时同步，桌面增加标签/分栏及外部会议捕获。下载页提供 Apple Silicon/Intel Mac 与多种 Linux 包。2026-10-08 changelog 另宣布 iPhone/iPad 正式进入 App Store；本次未找到新版 Android 对应的官方发布证据，不应把 Outliner Android 挪过来。

- [新 Tana Apps](https://tana.inc/learn/features/apps)
- [新 Tana Download](https://tana.inc/download)
- [2026-10-08 Changelog](https://tana.inc/changelog)

**F35｜新 Tana 当前计划也有三档。** Pricing 显示 Free $0（每月主持 5 场、50 AI queries、接 1 个日历），Pro 早鸟 $20/人/月并划线 $30（20 倍 AI、无限 hosted meetings 带星号、Zoom/Teams/Meet botless agent、integrations/full MCP），Business 从 $35/人/月。另列 30 天免卡试用；页面有年度/月度切换，本次未验证切换后报价。官网对“无限”未在抓取正文解释星号，不能扩大成不限长、不限资源。

- [新 Tana Pricing](https://tana.inc/pricing)

## 8. 可以用于分析的推论，与尚未证明的实现

以下是从产品行为得到的分析线索，必须在文章里用“我据此理解/推测/值得验证”表达，不能充当内部实现披露：

1. **Outliner 的优势可能来自统一对象身份。** 同一个会议中产生的任务，可保留原语境，又被查询到任务界面；根据 F04–F12 推导。尚未亲测“从会议捕获→任务看板→更新原文”的全链路。
2. **它把建模成本交给使用者，同时提供后补结构的空间。** node 可以先记，后加类型/字段；但字段、引用、查询和初始化的差别要学习。新手真实学习时间、留存或效率并无本次独立证据。
3. **新版把部分建模与操作成本交给 AI，再用 proposal 收口。** 根据 Types、Spaces、Proposals 文档；不能据此声称 AI 总能选对类型、永不越权或不存在静默写入。
4. **如果借鉴设计，可先定义对象身份、schema、引用、视图、权限和提交协议。** 这是架构建议，不是 Tana 内部架构。未证明技术栈、数据库引擎、同步算法、向量索引、RAG pipeline、模型微调方法、冲突解决与后台执行语义。

文章明确不可写成已证实的事项：两产品共享数据库；新 Tana 已覆盖 Outliner；支持无损自动迁移；AI 默认了解全部 graph；导出即可完整可执行恢复；Android 与 iOS 全功能一致；MCP 连接等于自动同步；营销示例是本人真实工作区；文档截图是本次实测截图。

## 9. 公开截图候选入口（尚未拍摄；不得替换成个人工作区）

| 候选 | 入口与可展示内容 | 使用边界 |
| --- | --- | --- |
| 新旧产品身份对照 | [新 Tana 首页](https://tana.inc/) 与 [Outliner 首页](https://outliner.tana.inc/)：标题、logo、首屏工作流 | 标为官网截屏；首页演示内容是厂商示例，不是实测 |
| 节点与引用交互 | [Nodes and references](https://outliner.tana.inc/learn/features/nodes-and-references)：官方产品截图、文本选择工具栏、引用处理 | 文章可解释对象复用，不显示任何个人知识库 |
| 类型模板 | [Supertags](https://outliner.tana.inc/learn/features/supertags)：configuration / content template / pinned fields 配图 | 图片可能来自较早版本；注明官方文档示意 |
| 动态查询 | [Search nodes](https://outliner.tana.inc/learn/features/search-nodes)：query builder 与 AND 示例图 | 最适合说明查询如何作为内容节点存在 |
| 视图切换 | [Views](https://outliner.tana.inc/learn/features/views)：outline/table/cards 示例 | 不把示意视图当成性能或大规模能力证明 |
| 离线状态 | [Outliner desktop](https://outliner.tana.inc/learn/features/tana-for-desktop)：离线指示与切换截图 | 配合 F31 说明范围，避免“全部离线”误读 |
| 手机捕获 | [Tana Mobile](https://outliner.tana.inc/learn/features/tana-mobile)：官方 iOS tab 与 capture 图 | 明确属于 Outliner 手机端，不能标成新 Tana |
| 新版审核流程 | [Proposals and actions](https://tana.inc/learn/features/proposals) 或 [新版 Learn](https://tana.inc/learn)：proposal/action 文档入口 | 若页面只有文字，截公开文档；不要伪造 UI |
| 新版类型与空间 | [Types](https://tana.inc/learn/features/types)、[Spaces](https://tana.inc/learn/features/spaces) | 可截当前公开说明；真实交互需后续另行授权与亲测 |
| 价格并列 | [Outliner Pricing](https://outliner.tana.inc/pricing)、[新版 Pricing](https://tana.inc/pricing) | 拍摄时保留周期切换与日期；额度换算矛盾不要裁掉 |

本次未下载图片、未采集账户或个人数据。官方页面可作为链接与核对证据；二次刊载截图的授权条件另需按网站条款与实际用途判断，本包没有作版权许可保证。


## 配图交接

已在无登录浏览器截取并目视检查官网公开页面。可用资源：

- `/images/product-docs/2026/tana-home.png`：官网公开页面，2026-10-23 获取。标明是官方演示，不是作者账户实测。

- `/images/product-docs/2026/tana-outliner.png`：官网公开页面，2026-10-23 获取。标明是官方演示，不是作者账户实测。

图像可作本文封面，完整英文保留相同资源路径。不要再生成无关隐喻图。
