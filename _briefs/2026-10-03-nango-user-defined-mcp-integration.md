---
schema: blog-brief/v1
id: 2026-10-03-nango-user-defined-mcp-integration
title: 用户在聊天里添加自己的 MCP：Nango 接入、实战与生产维护
status: published
priority: high
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-10-03T22:24:30+08:00
source_refs: []
---

# 选题契约

本篇来自作者在博客聊天中的直接写作委托，未经过 brain，不补造 brain 引用。只处理这一篇；队列中的其他选题保持原状。

## 唯一命题

产品可以允许用户在聊天中添加未预置的 MCP，但要把目录发现、账户授权、协议连接与工具执行分别落实。Nango 能承担其中部分集成基础设施；支持范围和生产责任需要根据当前文档及源码核实。

## 为什么值得由我写

作者连续追问 Nango 的项目接入方式，关心用户能否自行扩展产品，以及首次使用的惊喜如何变成可持续的能力。本文的一手增量是这组明确的产品问题，不宣称作者已经上线 Nango 或取得真实用户指标。

## 目标读者与阅读场景

正在开发聊天式 AI 产品的中文开发者和产品负责人。他们想让用户连接自己的工具，读完能辨认支持条件，理解参数如何在前后端与 Nango 之间传递，并能按案例验证第一条调用链。

## 编辑选择

- 文章轨道：研究与上手实战。
- 已选形态：通俗长文，包含逐段链路解释、可复制请求、可本地验证的小案例和架构图。
- 核心张力：连接体验可以很短，账户归属和执行责任需要长期维护。
- 这次主动不讲：推测 Manus 私有实现、泛化工具排行榜、无依据的成功率或性能数字。

## 已批准素材包

### 作者原话与在场片段

“如果是自己添加自己的 mcp，是否支持”

“用户默认添加，怎么添加，链路是什么？如何传递的，如何接入的，如何返回的，参数是什么”

“深度调研，帮我写一篇 blog，上手以及实战的案例文章，以及生产中真实需要注意的，后面维护的”

“真实的产品最开始给用户的惊喜会很多”

“篇幅可以长一些，但是内容不要太隐晦难懂，要通俗易懂”

### 事实与项目证据

尚未提供可公开的已上线产品、Nango API Key 或生产日志。示例需标出真实运行验证与文档推演的区别；前文助手关于任意 MCP、严格参数 schema 和自动重试的宽泛表述不能作为事实来源。

### 待验证推论

核心工具由产品维护、外部 MCP 按需接入是否更适合本场景；首次授权后恢复原任务是否减少体验断裂；必须说明这是设计建议，不能写成已经测量的用户结果。

## 参考方向

Nango 官方 MCP Auth、Connect Sessions、Frontend SDK、Proxy、Agent Sessions、Functions、webhook 文档和固定版本源码；MCP 官方协议及 Registry；有明确边界的 Replit 公开案例。

## 证据与隐私边界

- 可以公开：上述问题，官方文档，合成演示数据与明确标注的设计建议。
- 必须匿名：示例使用虚构的账户与项目标识，不使用真实用户资料。
- 禁止使用：本机密钥、私有产品信息、未经提供的生产经历；不得解析 brain 私有材料。
- 发布前仍需作者确认：中文成稿和最终发布。当前仅完成文章及验收，不提交或部署。

## 不要写成

连接器百科、缩写清单或供应商宣传稿。不要把授权成功写成任务成功，不把协议示意响应当成真实云端请求记录。

## 验收标准

- [x] 支持自己的 MCP 的条件与例外讲清楚。
- [x] 授权参数、协议参数、业务参数和返回值逐项区分。
- [x] 实战示例可核对，未执行的云端步骤如实标注。
- [x] 生产恢复、权限、幂等和后续维护落实到动作。
- [x] 研究事实、源码观察和本文建议区分明确。
- [x] 中文结构定稿后执行作者声音审读及 lieflat-less-ai-tone 白名单检查。

## 执行回执

- article: content/zh/ai-agent/posts/nango-user-defined-mcp-integration.md
- english_article: content/en/ai-agent/posts/nango-user-defined-mcp-integration.md
- public_url: https://cubxxw.com/zh/ai-agent/posts/nango-user-defined-mcp-integration/
- english_public_url: https://cubxxw.com/ai-agent/posts/nango-user-defined-mcp-integration/
- editorial_verdict: REBUILD → KEEP（2026-10-04 按作者新要求重写）
- source_trail: source_refs 为空；没有读取 brain。站内已有 MCP Apps 文章讲界面协议，本篇新增用户连接和运行时参数链路。
- checks: frontmatter:check、tags:check、定向与 changed flavor 检查通过；定向 briefs:check 为 0 错误；代码块语法与 JSON 通过；图源与 PNG 验收通过，原尺寸 PNG 已查看。引用去重为 47 个来源；资源路径正确。description 为 159 字符，六个 canonical tags，日期已到达且带 +08:00。Markdown 空白、引用完整性与示例代码一致性检查通过。
- published_at: 2026-10-04T02:18:28+08:00
- retro_notes: 核心增量是完整参数往返、目录与会话工具搜索分离、Generic 兼容条件和生产恢复责任。约 9600 汉字，包含本地可运行案例。中文尚待作者确认；没有英文版，没有提交或发布。普通 Markdown 与已有图片约定，没有修改模板、脚本或 shortcode，不跑全站构建及 E2E。

### 系列研究回执

研究对象为 Nango 的用户自定义 MCP 接入，本文独立成篇，不增加或重排现有专栏。研究日期 2026-10-03；Nango 源码固定于 `6b794c68f7f70302a3151b9ae9bb2b0e21edf117`（根包 0.71.12），MCP 规范使用 2026-07-28，SDK 源码固定于 `8aabbdcef6e016978a3132045281dfbd51c69792`。Registry 源码固定于 `bf4e88cbe8d1a635c06144ccea1d24cb52fa6186`。

三位独立只读研究者分别核查 Agent、系统与产品生态，返回事实和源账本，未修改任何文件。成稿再次分别审读，未发现关键事实错误，已采纳针对环境字段、元数据权限、协议兼容和任务状态的修订。

- Agent 架构：外部 tools/list、参数到模型工具的适配、调用与结果回填由产品承担；Nango Agent Sessions 主要开放已部署 Actions，没有外部 MCP 自动导入的证据。
- 系统架构：Connect session 的受信配置固定用户选择的 URL；后端验签与核对 connection，再执行代理。Nango-Proxy-* 请求头、显式 Base-Url-Override 和重试策略按固定源码核查。
- 产品架构：连接成功和任务成功分别验收；授权后恢复原任务，交付可验证结果；多账号、重连和未知写入结果都有明确状态。
- 图解问题：用户添加自己的 MCP 后，授权、业务参数与结果怎样往返？
- 图源：assets/diagrams/agent-system-series/12-nango-user-mcp/nango-user-mcp-roundtrip.excalidraw
- 图渲染：static/images/agent-system-series/12-nango-user-mcp/nango-user-mcp-roundtrip.svg；同名 PNG。
- 最强边界：Generic 当前限定 DCR/CIMD，不负责本地进程；connection ID 与环境 key 不提供产品用户级权限；JSON-RPC 请求 ID 不提供写入幂等。
- 证据空白：没有 Nango Cloud API Key，因此云端授权与代理没有运行回执；源码 HEAD 不证明云端部署一致；没有产品转化率或延迟测量，不把设计建议当成用户实验结论。

### 保留来源账本

文章末尾列出全部 47 个去重来源。以下按决策归类，说明证据的边界；公开来源核对于 2026-10-03。

| 来源 | 支持或挑战什么 | 能证明 | 不能证明 |
|---|---|---|---|
| [MCP Auth](https://nango.dev/docs/guides/auth/mcp-auth)、[Generic](https://nango.dev/docs/integrations/all/mcp-generic) | 用户自带远程服务接入 | DCR/CIMD、URL 输入、授权与代理的文档流程 | 任意 MCP 或本地包都能接；本次云端实际连通 |
| [Connect session API](https://nango.dev/docs/reference/backend/http-api/connect/sessions/create)、[请求类型源码](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/types/lib/connect/api.ts) | 参数怎样传递 | tags、allowed_integrations、配置嵌套层级 | tags 自身就是访问控制 |
| [OAuth controller](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/oauth.controller.ts) | 受信 URL 固定 | session 配置覆盖前端参数的静态实现 | 所有部署有完整网络出口防护 |
| [代理控制器](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/proxy/allProxy.ts)、[代理工具](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/shared/lib/services/proxy/utils.ts) | 协议头和地址转发 | Nango-Proxy-* 剥前缀、URL 拼接、缺默认地址的边界 | Cloud 已允许 override；请求已真实授权 |
| [Agent Sessions](https://nango.dev/docs/guides/agent-sessions)、[搜索源码](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/services/agentSessionToolSearch.service.ts)、[Pinned schema](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/agent/mcp/sessionServer.ts) | 避免过度承诺工具发现 | 会话 Actions 搜索，Fuse 与英文分词，部分发现 schema 不完整 | 中文产品的实际搜索成功率；会话自动聚合外部 MCP |
| [MCP 规范](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)、[SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/8aabbdcef6e016978a3132045281dfbd51c69792) | 实战协议与客户端 | 规范及 SDK 的发现、参数、返回机制 | Nango Cloud 实现了所有现行规范 |
| [Registry API](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/reference/api/official-registry-api.md)、[审核政策](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/modelcontextprotocol-io/moderation-policy.mdx) | 目录发现与信任 | 名称搜索和元数据；收录不等于安全认证 | 自然语言推荐效果，任一服务器可信 |
| [Replit 案例](https://nango.dev/case-studies/replit/) | 生产使用的公开实例 | 供应商报告的 30+ connector triggers 与增量同步用途 | 用户自带 MCP 接入、独立性能测量 |
| [Webhook](https://nango.dev/docs/guides/platform/webhooks-from-nango)、[令牌恢复](https://nango.dev/docs/guides/auth/token-refreshing)、[重试源码](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/shared/lib/services/proxy/retry.ts) | 恢复与部分失败 | 验签、失败恢复事件和请求重试条件 | 写入 exactly-once、业务自动恢复 |

### 实战验证记录

- 本地安装 `@modelcontextprotocol/server@2.3.0`、`@modelcontextprotocol/client@2.3.0`、`@modelcontextprotocol/node@2.1.1`、`zod@4.6.5`，运行文章中的服务与客户端。
- 验证工具 schema 和成功返回；不存在项目、继承属性名与错误类型参数均被拒绝或返回工具错误。
- 请求记录确认现代 server/discover、tools/list、tools/call 的 body _meta 与 HTTP 头匹配。
- 后端 fetch 适配器用本地代理替身验证 SDK→代理→MCP 往返，目标 URL 改变与非 POST 请求被拒绝。这个验证不经过 Nango，不证明 Nango OAuth 或云端代理成功。
- 20 个 fenced code blocks 完成 JavaScript 语法和 JSON 解析检查；示例 API 段落均说明是否可独立运行。

### 作者声音与去 AI 痕迹收尾

先阅读项目 AGENTS.md 与现有技术文章，遵循中文同事口吻、直接给判断和不堆缩写的要求；未找到额外独立声音规范文件。结构稳定后重新读取作者指定的 lieflat-less-ai-tone skill，对中文可见文案逐项检查。

只做两处最小改写：按第 5 条去掉开篇提示性冒号，按第 2 条调整首版建议中的密集顿号。参数清单、引用、代码和外语段落保留。核对前后标题、段落数、代码块、引用与资源路径一致；front matter 包装调整单独完成，不借风格检查修改机器字段。其余未命中文字原样保留。

### 最终检查说明

本任务的定向 brief 检查通过。全队列检查曾同时发现三篇旧 brief 的英文成品重复提示，属于已有状态，不修改它们。新文章完成回执并进入 ready-to-publish 后，自己的重复提示已由正式成品记录消除。

`git diff --check` 没有输出。由于新文件未暂存，另做新文件空白检查：没有尾随空格，文末有换行；`git diff --no-index --check` 返回 1 是与空文件存在内容差异，无空白错误输出。文章代码和本地实际执行文件逐字比对一致；未运行全站构建与浏览器检查。

### 2026-10-04 作者要求后的深度改写

作者否定第一版阅读体验，明确要求以“帮我看看 demo 项目卡在哪”贯穿全文，使用固定结构，正文控制在 4000—6000 字，保留事实，验证声明统一到开头，正文最多五个链接，技术细节折叠，最后列出删改内容。

本轮重新构建主线：90 字开头 → 一句话与简化流程图 → 连续跑完本地服务和客户端 → 用户添加远程地址、授权、返回原聊天 → 五个症状/原因/处理办法 → 三句话结尾。原稿事实留在主线、四个折叠块和原来的 47 项参考资料中；没有新增外部研究结论。示例实现改为更短的完整文件，演示端口使用 43173，避开本机已有服务。

- 当前正文约 4600 汉字（含折叠），全文件约 5000 汉字；五个正文外链。
- 五个坑各三句话，三句话结尾，禁用词检查通过。
- 7 个代码块，其中 5 个 JavaScript 文件都可保存运行，没有未定义的框架 helper；授权与云端脚本需要文中列明的账号配置和环境变量。
- 本地 server/client 已重新运行，工具菜单、成功结果、错误类型、不存在与继承属性项目名都通过。
- 新代理客户端的原样代码使用本地替身重新验证，没有发出真实 Nango 网络请求；授权脚本缺环境变量时在请求前失败，HTTPS 地址条件明确。
- 流程图由 9 个主要节点缩为 5 个，图源、SVG、PNG 同步重绘，原尺寸 PNG 已查看。
- 新增原生 details 后，使用隔离的单篇 Hugo fixture 验证 Goldmark：4 个折叠块和 7 个代码块正确，折叠后的正文完整；没有运行全站构建。
- 作者声音按本轮明确要求执行。结构稳定后重新读取 lieflat-less-ai-tone，白名单收尾只按第 5 条删除结尾的提示性冒号；结构、段落数、代码、引用与 front matter 保持一致。

给作者的删改说明：移除独立概念分类与参数表的铺陈；删除反复出现的验证声明；将 GitHub 支线和部署维护细节移出主线；删除手写协议报文的重复展示；将源码行号与版本差异集中到坑的折叠说明；用一条项目查询路线替换多条并列流程。删除的是重复解释和原有组织方式，事实与证据继续保留。

### 2026-10-04 英文翻译与发布授权

作者已明确批准当前中文，并要求“翻译为英文一份，然后完成发布”。本轮按 translate-and-format-blog 翻译，未扩展研究或修改中文正文。英文路径与中文对应；日期、作者、标签和标识符保留，五个正文链接及 47 项参考 URL 完全一致。七个代码块只翻译了演示项目名称、状态和阻塞项三条文字，其余代码逐字一致。

英文图源为 assets/diagrams/agent-system-series/12-nango-user-mcp/nango-user-mcp-roundtrip.en.excalidraw，另存同名 .en.svg 与 .en.png；结构与箭头沿用中文图，原尺寸 PNG 已查看。独立只读英文审读未发现技术含义或限定词偏差。英文最小 demo 重新运行，工具发现、英文数据返回和不存在项目验证通过；云端步骤仍按正文开头的范围说明处理。

发布前已通过 frontmatter、tags、changed flavor、代码语法、双语结构与引用核对、图源验收、Hugo 生产构建、渲染检查及生成 SEO 检查。实际输出中，两篇页面都含四个 details/summary，canonical 与语言切换正确，英文使用独立英文图路径。按仓库约定直接发布到 main，不创建 PR，不修改软件版本、共享模板或作者的无关本地改动。线上发布结果在完成后补入回执。

### 已核验的双语发布回执

- 内容提交：`636bde068ceb697337d153b257fb77e6709bc8ec`，已推送到 origin/main。
- [全站质量检查](https://github.com/cubxxw/blog/actions/runs/37141719038)：success，Required blog quality 通过。
- [性能流程](https://github.com/cubxxw/blog/actions/runs/37141718642)：success。
- 当前发布模式为 shadow，GitHub 的新 release/followups 分支按条件跳过；实际页面由既有 Netlify Git 发布路径上线。
- 中英文地址均返回 HTTP 200，标题与成稿一致，四个折叠块完整，canonical 正确，可以互相切换语言。
- 两个 SVG 资源均返回 HTTP 200；英文图包含英语标题，中文图包含中文标题，页面各自引用正确。
- 此次仅补录发布状态、地址和验证证据，沿用仓库已有 publication receipt 的 `[skip ci]` 提交惯例；不改变文章、图解或运行时代码。
