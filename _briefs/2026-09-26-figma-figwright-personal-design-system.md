---
schema: blog-brief/v1
id: 2026-09-26-figma-figwright-personal-design-system
title: 用 Figma、Figwright 与 AI 建设可维护的个人设计系统
status: ready-to-publish
priority: normal
language: zh
section: engineering
brief_type: research
dispatched_at: 2026-09-26T00:00:00+08:00
source_refs:
  - brain://learning/product-interface-design/publication-selection.md
  - brain://learning/product-interface-design/figwright-personal-workflow.md
  - brain://learning/product-interface-design/design-md-ecosystem.md
  - brain://projects/daypage.md
  - brain://identity/thesis.md
---

# 选题契约

## 唯一命题

研究问题：个人开发者如何把 Figma、免费 Figwright、Claude/Codex、设计描述与真实组件组织成可持续维护的多端设计工作流，并在迭代中形成自己的审美判断？围绕一次真实界面从探索、选择、实现到下一次变更展开，帮助读者理解信息应由哪里维护、工具具体解决哪段工作、何处仍需要本人判断。

## 为什么值得由我写

作者正在为自己的多端项目寻找设计方法，已经使用免费 Figwright；DayPage 的已有项目记录包含同源 token 输出 Web CSS 与 Swift。这使文章可以从具体的个人约束出发：已有代码、免费设计工具、多个 Agent、长期维护需求。作者公开原话“围绕一个问题做工程：让上下文在工具切换之间不丢失”也与设计意图如何跨画布、代码和模型保存直接相关。不要把这延伸为已验证的完整设计系统或个人能力评价。

## 目标读者与阅读场景

读者能写代码，也能让 AI 生成页面，却在第二个页面、第二个端或下一次改版时遇到风格、组件和状态漂移。读完应能选择最小工具组合、整理一个免费 Figma 文件、建立自己的设计说明和 token/组件映射，并完成一条真实任务及一次变更的验证。

## 编辑选择

- 文章轨道：research，中文完整博客长文。
- 已选形态：从作者的实际问题和已有产品约束进入，以一个可理解的项目贯穿机制、工具、案例和操作；篇幅由信息需要决定，保持短段落和自然推进。
- 核心张力：AI 降低生成界面的成本，长期一致性、正确复用与设计判断仍需要明确的来源、实现与审阅。
- 这次主动不讲：私人知识库结构、未公开项目计划、模型排名、未经验证的效率提升、穷举所有设计工具。

## 已批准素材包

### 事实与项目证据

作者现有 public 项目记录：DayPage 是 iOS + Web 日志项目，使用 tokens.json 单一来源生成 globals.css 与 DSTokens.swift，记录有 CI 漂移检查。本轮没有重新运行项目和 CI；可以写成已有工程机制，不能声称本次完成端到端验证。项目公开入口：https://github.com/getyak/daypage 。如果访问或可见性受限，保留“作者已有项目记录”的准确范围，不猜测源码位置或最新状态。

### 作者原话与在场片段

以下都是获准用于本篇的准确原话，最多选择真正推进文章的少量内容：

1. 本次问题：“结合 figma，以及我自己使用的免费版的 https://github.com/awdr74100/figwright 思考可以如何搭建一套自己设计系统和工作流”。
2. 早先目标：“如何沉淀美学？如何尽可能把项目设得高级优雅？具有设计感、具有美感”。
3. 已标 public 的本人原话：“围绕一个问题做工程：让上下文在工具切换之间不丢失。”仅该句获准使用，不携带上游 AI 对人格/主命题地位的归纳。
4. 当前交付要求：“思考，整理，输出blog，结合所有的知识库以及引用，帮我写一篇专业完整，信息含量高，并且便于人阅读的文章”。

### 作者观察

已明确的事实是正在研究、使用 Figwright 并希望搭建个人流程。没有获准新增的失败现场、心理活动、审美偏好、长期实践成效或使用频率。可以使用“以 DayPage 的 memo 为练习”的演示场景，但说明是拟议练习。

### 待验证推论

可提出按信息类型分配维护入口、一次一个共享资产写入者、用相同内容做 A/B 方向、实现后更新差异基线等建议。其效果需要实际任务验证，不称“本人已验证最佳实践”。Claude/Codex 的岗位可交换，不能虚构模型固有分工或多模型共识。

## 参考方向

把下面公开材料作为可核查入口，优先原始文档、源码、团队文章。正文邻近引用关键事实，末尾去重参考资料；不为凑数量全部纳入正文。不要解引用任何 brain://，本任务包已自足。

## 证据与隐私边界

- 可以公开：以上确切作者原话、已标 public 的项目技术记录、公开官方/源码/团队资料的准确归纳，以及明确为建议的实践设计。
- 必须匿名：本篇不依赖私人第三方材料，不引入此类材料。
- 禁止使用：上游未标级知识卡正文、个人候选审美偏置、本机路径/文件名/连接页面身份、秘密、未返回的 Gemini/Claude 研究、未经确认的一手经历与结果。
- 发布前仍需作者确认：最终中文署名表达与发布；本任务授权研究、写作、审校，自动完成到 ready-to-publish。无需为 research 轨道再次询问结构方向。

## 不要写成

不要写成工具清单拼盘、聊天记录压缩稿、全篇对称表格、营销式“高级感公式”，或声称已经跑通的实战复盘。第一人称只用确实提供的事实与原话；公共研究与本文建议可以用自然的说明文表达。别把每个判断都写成“不是X而是Y”。每个重要概念要有读者能想象的具体界面、改动或失效情境，技术细节逐层引入，术语首次解释。

## 验收标准

- [x] 读者为什么继续读、读完能做什么已经清楚
- [x] 作者一手增量决定了文章形态
- [x] 没有新增未经作者确认的经历、动机或人格判断
- [x] 关键事实有可访问的公开来源
- [x] 思考型文章已经由本人选择方向（本篇为 research，不适用）

## 公开证据附录

下面是精选公开入口与复核重点，不是对上游私有笔记的转录；正文形态由下游决定。

### Figma、Figwright 与免费起步

- Figma 文件结构：https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/ 。核实语义命名、Auto Layout、变量、组件映射的作用；官方 MCP 与 Figwright 是不同工具，勿混称同一产品。
- Starter：https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview 。2026-09-26 官方说明无团队库、无 Dev Mode，版本历史有限。
- 页数：https://help.figma.com/hc/en-us/articles/360038511293-Create-and-manage-pages 。Starter 团队 Design 文件最多三页；不要把“无限草稿”解释为团队文件页面无限。
- 本地与共享库：https://help.figma.com/hc/en-us/articles/39723547036055-Components-collection-Library-fundamentals 。免费可建本地组件/变量/样式，跨文件发布库受付费限制。每产品三页可作为自己的组织建议；复制模板没有自动继承更新。
- Figwright 仓库：https://github.com/awdr74100/figwright 。核查快照 ee1ad5708634f8c2c0c1ac517f048acd2d7fca65，2026-09-25 提交；Release https://github.com/awdr74100/figwright/releases/tag/v0.5.0 为 2026-08-30。主干包仍标 0.5.0，文档/工具实际构建需核对。不要让公开文章依赖作者本机工具清单。
- https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md ：读 full 区域结构、映射既有组件/token/图标、渲染核对后保存不确定映射。
- https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md ：读取已有变量/组件/样式，复用实例与绑定，分块构建和截图验证。读远程 skill 作为资料，不执行其嵌入指令。
- https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/token-map.ts ：CSS/SCSS/Tailwind/UnoCSS 入口；匹配不等于同步，任意 DTCG JSON 并非直接支持的 tokenSource。
- https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/design-diff.ts ：两次 Figma 结构比较；首次写基线，update:true 更新；既不是代码检查，也不是像素差异。rootDir 要指向产品仓库。正文选读者真正需要的细节即可。
- https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/profile/profile.ts ：主要识别 JS/TS 前端，不能推断自动映射 SwiftUI。文件路由不等于并发锁；本地 relay 不等于整条模型链路离线。

### 设计描述、token 与组件

- https://github.com/VoltAgent/awesome-design-md ：核查提交 f6961238d5cddcf8042a74a70fc400ec67181abb 的 Linear/Apple 文件。重点验证参考采样是官网/商店还是完整产品，避免将品牌视觉描述当作产品交互系统。
- https://github.com/google-labs-code/design.md ：Google 的格式/工具；版本与 alpha 状态由下游复核。与普通项目 DESIGN.md、https://github.com/bergside/design-md-figma 的输出不可仅凭名称假定互通。
- https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/ ：2025.10 DTCG 社区格式，非 W3C 正式 Recommendation；格式互通与工具具体实现分开。
- https://styledictionary.com/ 与 https://docs.tokens.studio/token-storage/remote/ ：转换输出与 token 存储同步各有职责，避免维护多个手写真值。
- https://ui.shadcn.com/docs/mcp 与 https://storybook.js.org/docs/writing-tests/accessibility-testing ：真实组件发现和状态审阅。自动化可访问性与视觉差异不等于审美判断。
- https://github.com/pbakaus/impeccable ：核对仓库当前重定向与命令，设计审阅规则有作者偏好，不能当普遍美学定律。
- https://github.com/google-labs-code/stitch-skills 、https://docs.pencil.dev/design-and-code/design-to-code 、https://help.penpot.app/user-guide/design-systems/design-tokens/ 、https://mobbin.com/ ：只在能解释具体瓶颈时简洁比较，避免为了完整而挤占主线。

### 多端案例与审美

- https://www.coinbase.com/blog/how-coinbase-design-systems-are-powering-the-ai-prototyping-era ：2026-09-09 团队原文，Skills/MCP/Code Connect/Playground 给 Agent 正确的生产上下文。
- https://www.coinbase.com/blog/automating-figma-to-code-at-coinbase ：截图、参考实现与规则的另一条路径，大变更拆小审阅。若引用效率数字，必须标为团队单例自报。
- https://www.figma.com/blog/how-coinbase-used-code-connect-to-shrink-token-costs/ ：同一表单三次运行的小样本，不能给出通用 ROI，数字非必需。
- 携程原文：https://mp.weixin.qq.com/s?__biz=MjM5MDI3MjA5MQ==&mid=2697276518&idx=1&sn=50c7d97c8db2c3a8334beaeb782ad113&chksm=827f7922823b86bf3ec772a04c81f79fc38ff72431b6a33900f9f284bc25ebadf39e8d09aead#rd 。若可重新读取，可用三层 token、平台差异与多品牌的机制；不可访问则不强行依赖。
- 设计系统失败复盘：https://mp.weixin.qq.com/s?__biz=MzAxNDYwMTMxOA==&mid=2247483755&idx=1&sn=02ae68ef31bb73f967b61c1e64e79f6f&chksm=9a66a50be63a6ccfc726b2178f4056c6be0ff86a44fb9385068eca711ac0d9a704baddcd2ea5#rd 。同样需原文复核；团队自述不推导普遍失败率。
- https://developer.apple.com/documentation/technologyoverviews/interface-fundamentals ：各平台输入和任务约束。
- https://www.figma.com/blog/you-never-stop-cultivating-taste/ ：作者关于 craft 与 taste 的观点，不能据此宣称训练效果经过实证。
- 可自行读的公开产品例子：https://culturedcode.com/things/features/ 、https://ia.net/writer/ 、https://developer.apple.com/design/awards/2023/ 。从公开产品机制说明信息层级、直接操控、注意力与状态，不能将这些产品归纳为作者已经确认的个人偏好。

## 作者修订要求：从一个人的维护问题讲起

2026-09-26，作者读后明确要求直接修订现稿，以下为本篇新增获准素材和编辑目标；原稿的事实、隐私与发布边界继续有效。

### 新增本人原话与目标

“最开始可以通俗易懂地描述一下，就是我自己一个人，然后我想搭建一套我的系统，然后我想维护对应的 UI 的前端。然后有没有一些比较好的维护方法？以及这种维护过程中有没有比较好的经验，或者是比较好的工具，然后去组合起来，能够完成更好的效果。这是核心的问题。”

“再就是我们怎么样去判断一些品味的问题，就是在设计过程中有没有一些比较好的设计技巧。各个文件应该怎么样去维护？比如说这个 design，再比如说这个 figma……即使不用官方的订阅，然后不用出那么多钱，一个人也可以免费的去使用，并且得到……比较好的效果。这能讲清楚，就讲清楚。”

作者明确提供的是单人建设与长期维护的动机、已使用 Figwright 的起点，以及希望降低工具成本的目标。可以写成自然的第一人称开篇，先让读者理解为什么这篇文章存在。没有新增具体失败次数、深夜经历、付费金额、结果数据或已跑完整套系统的经验，不得补造。

### 这次要改清楚的内容

- 开篇先讲一个人做产品的实际问题：希望持续维护自己的界面，下一次加功能和改样式仍然能接续。让“维护方法、工具组合、设计判断、预算”自然提出，再引入文件和术语；不要以设计系统定义、官方文档、token/CI 术语开头。DayPage 和 memo 继续作具体载体，虚构情境须明显是例子。
- 文件分工从人的动作解释：想改设计理由、布局、颜色、组件行为或对应关系时，分别去哪个文件/工具；怎样把采纳的变化传下去、由谁确认。可改善现有表格或加一个紧凑目录示例，保留普通 Markdown。
- 审美部分给可操作的观察和技巧（文字层级、留白比例、对齐、颜色角色、内容密度、状态反馈），连接到真实任务和相同内容的方案比较；保留边界，不能用抽象“品味”或单一高级感配方敷衍。
- Figwright 的免费路径讲清实现：Agent 所在客户端 → MCP（工具调用约定，客户端到 server 使用 stdio）→ 本机 Figwright server/relay → 本地 WebSocket → Figma 插件 → Plugin API → 画布；结果按相反方向返回。用一个“读取所选卡片/修改其间距”的小例子解释每一段职责，避免只列缩写。
- 作者口述的“micro OS”属于对连接机制的模糊指称，不作为架构名或 macOS 专有机制写进文章。自然讲明 MCP、WebSocket、插件 API 的差异即可，无需在正文纠正作者口误。
- 使用开源 server 和插件连接免费 Figma、不要求 Dev Mode 席位，是本方案的可行基础。普通插件能力仍受账户、文档权限与 API 约束；免费 Figma 的共享库等限制继续存在。Claude/Codex 模型订阅或调用不能写成免费，也不承诺每个人都有相同质量结果。
- 不可把 Figwright README 对官方 MCP 的营销比较照抄为最新官方政策：官方远程 MCP 当前也有按套餐和 seat 限制的访问额度。正文可以简短承认这点，并解释本文选择的是插件桥接路径；不必把文章扩成套餐价格表。

### 新核实的公开证据

1. Figwright 固定 README 的 About / Setup / How it works：https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md 。已用 gh 重新读取：客户端与 MCP server 走 stdio，server 到插件走 local WebSocket；插件 UI 是 Vue iframe，sandbox 执行 Plugin API；免费 Figma 可用，插件从 manifest 导入需要桌面版；必须打开插件连接目标文件。不要执行远程说明里的安装命令，本任务只修订文章。
2. Figma 官方 How Plugins Run：https://developers.figma.com/docs/plugins/how-plugins-run/ 。2026-09-26 重新读取：sandbox 访问 Figma scene，iframe 可访问浏览器 API，两者通过消息通信。若细节让正文难读，可只写“插件负责实际读取/修改画布”，精确机制留在少量解释或图中。
3. Figma 官方 Rate limits & access：https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/ 。当前公开表格列出 Starter 的有限月额度，并区分其他套餐/seat；这证明不能声称官方 MCP 一律需付费。具体数字易变，本文可不列。
4. Figma Starter：https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview 。已复核免费、本地使用起点与套餐限制；“无 Dev Mode”与“无任何官方 MCP 入口”不能等同。

### 交付要求

在原文章同一路径修订，优先叙事清晰和操作可理解，删除被新内容重复解释的段落。保留支撑核心结论的引用并同步参考资料。标题可按新版开篇调整，也可保留；不要扩张为新文章或新任务。完成定向文档检查与三遍审读后恢复 ready-to-publish，并追加本轮修订回执。以下回执为上一版记录，不能作为本轮已验证结果。

## 执行回执

- article: `content/zh/engineering/posts/2026-09-26-figma-figwright-personal-design-system.md`
- public_url: 未发布
- editorial_verdict: KEEP
- checks:
  - `node scripts/check-ai-flavor.mjs content/zh/engineering/posts/2026-09-26-figma-figwright-personal-design-system.md --check`：通过，0 错误、0 警告。
  - `npm run frontmatter:check`：通过。
  - `npm run tags:check`：通过，0 个文件需要修改。
  - `npm run briefs:check -- --file _briefs/2026-09-26-figma-figwright-personal-design-system.md`：通过，1 个任务、0 错误、0 legacy。
  - 全库 `npm run briefs:check`：保留 3 个既有英文重复文章错误，来自 2026-08-07 的 pi、n8n、openclaw 任务；本任务无报错，未修改其他 brief。
  - `git diff --check`：通过；另检查了未跟踪文章，未发现行末空白。
  - 相邻引用与文末参考资料核对：26 处正文引用，23 个唯一公开来源；23 条参考资料无重复、无缺项、无未引用项。
  - description 159 字符；6 个 canonical tags；使用已到达的上海 `+08:00` 时间；没有 `draft`、退役的 `categories`、本机路径或私有引用泄漏。
  - 普通 Markdown、标准表格与围栏代码，无 raw HTML、shortcode、特殊媒体或运行时改动；未做全量构建、浏览器截图和 E2E。
- published_at: 未发布
- retro_notes:
  - 仅完成中文文章。未翻译、未 commit、未 push、未部署。
  - 研究与写作完成于 2026-09-26；正文约 6,864 个汉字（含标题、描述，参考资料前），实际阅读长度另含英文术语和代码示例。
  - 尚待作者确认最终中文署名表达与发布；全文方法建议、memo 练习及审美训练效果仍待真实任务验证。

### 来源谱系与本次增量

- 已运行 `briefs:trace`，仅追踪博客仓库内的公开 brief、回执与文章；没有解析 `brain://` 目标。
- 阅读相关旧文 `content/zh/projects/daypage-ai-metacognition-experiment.md` 与 `content/zh/ai-agent/posts/2026-08-02-ai-era-conceptual-mobility.md`。沿用的事实限于当前任务卡获准素材；未引入旧文里的其他生活经历和项目指标。
- 延续：DayPage 的多端产品背景，以及作者关于上下文跨工具保存的公开原话。
- 本次增量：把问题推进到设计信息的维护职责、Figwright 实际映射边界、同源 token 与平台组件的对应，以及一次真实可执行的小改动如何验收。
- 保持开放：作者个人审美偏好、整条流程的实测效果、跨端实现完成度。文章没有替作者确认这些结论。

### 三遍写作与三次语义审读

- 第一遍：选择 research 轨道，以已有项目和免费工具约束进入；将 memo 明确标成拟议练习，保持作者在场但不虚构失败现场。
- 第二遍：围绕一张卡片的探索、实现与下一次改动组织正文；公开资料只进入对应机制，未按资料目录逐条拼接。
- 作者在场审读：第一人称仅用于已批准的工具使用、项目记录和准确原话；方案判断使用“本文建议”等表达。
- 思想推进审读：修正初稿里失败与重试状态重复新增的问题，统一为“先有失败状态与菜单内重试，随后把重试移到错误提示旁”；补入 token/组件首次解释及实际映射记录入口。
- 事实与安全审读：区分 token 映射、格式转换和存储同步；明确 design_diff 只比较 Figma 结构；区分固定源码快照与发布包、Starter 草稿数量与团队页数、Web 检测与 SwiftUI 映射。
- 发展编辑选择：保留 3 张小表和短示例，未加入 FAQ、强行量化收益或无教学增量的交互动画；补入 awesome-design-md 取样边界与按瓶颈选择的 3 个可选工具。
- 主代理完成两轮只读审阅，最终 KEEP；反馈已落实为来源点名、工具取舍与练习生命周期修正。

### 保留来源的证明范围

以下编号对应正文去重参考资料，均于 2026-09-26 核查。对技术事实以原始文档或源码为准；工具/团队自述不推导普遍效果。

| 编号与来源 | 支持的事实或用途 | 不能证明的内容 |
| --- | --- | --- |
| 1 Figma 文件结构指南 | 组件、变量、语义命名、Auto Layout 与注释 | 采用后必然获得更好审美 |
| 2 DayPage 仓库 | `gh` API 确认 `visibility=public`，提供公开入口；技术记录来自批准素材 | 本轮没有重跑 CI 或端到端实现 |
| 3 Starter overview | 无 Dev Mode/团队库，30 天历史，无限 drafts | 不把草稿数量推成团队页数无限 |
| 4 页面管理 | Starter 团队 Design 文件最多三页 | 三页命名与组织是本文建议 |
| 5 Library fundamentals | 免费本地资产与付费发布库的区别 | 复制文件不会自动获得库更新语义 |
| 6 Google design.md | 格式、schema、CLI 及 alpha 状态 | 任意同名 Markdown 自动兼容 |
| 7 Figwright 仓库 | 插件与 MCP 连接、免费使用、读写和文件路由 | 整条模型链路离线或公共资产并发锁 |
| 8 v0.5.0 Release | 2026-08-30 发布 | 发布包等同后续主干快照 |
| 9 figma-codegen skill | 结构读取、映射、渲染后记录模糊对应关系 | 候选匹配本身就是正确复用证据 |
| 10 token-map.ts | CSS/SCSS/Tailwind/UnoCSS 输入、名字和值匹配、歧义提示 | 任意 DTCG JSON 输入或多端自动同步 |
| 11 figma-build skill | 先读已有资产、实例化、绑定、截图验证 | 任意代码都能无损往返 |
| 12 profile.ts | 当前项目检测以 JS/TS 前端为主 | 自动完成 SwiftUI 组件映射 |
| 13 DTCG 2025.10 | token 交换格式及社区规范身份 | W3C Recommendation 或工具全量支持 |
| 14 Style Dictionary | 多平台 token 转换输出 | 自动负责 Figma 存储同步与业务行为 |
| 15 shadcn MCP | registry 组件浏览、搜索、安装 | 为日志项目决定交互方案 |
| 16 Coinbase CDS AI Overview | Skills、MCP、分平台文档及真实组件入口 | 确定的个人项目 ROI；博客原文访问不稳定，改用官方文档 |
| 17 Storybook accessibility | axe-core 规则检查及人工确认项 | 覆盖全部可访问性与审美问题 |
| 18 design-diff.ts | 结构快照、首次基线、后续比较及 update 参数 | 代码同步完成或像素一致 |
| 19 awesome-design-md | 固定提交 README 的公开网站分析、维度与收录例子 | 等同品牌官方完整产品设计系统 |
| 20 Apple 分析页 | 独立分析、无品牌背书、产品展示/营销适用场景 | Apple 内部交互规范或本项目适用性 |
| 21 Impeccable | 当前审阅能力与带偏好的设计规则 | 普遍美学定律或质量保证 |
| 22 Tokens Studio | 远程 token 存储同步、Git push/pull 与部分 Pro 能力 | 自动等价于多端转换输出 |
| 23 Stitch Design Skills | 设计生成、编辑、变体与 Stitch MCP 前提 | 候选方案已适配现有产品组件与状态 |

## 作者修订回执（2026-09-26，第二版）

- article: `content/zh/engineering/posts/2026-09-26-figma-figwright-personal-design-system.md`
- title: 一个人如何维护自己的界面：用 Figma、Figwright 与 AI 搭建设计系统
- public_url: 未发布
- editorial_verdict: KEEP
- status: ready-to-publish
- published_at: 未发布

### 本轮编辑选择

- 重新应用本仓库 `craft-article-opening`，依作者已选入口，用获准的单人建设与长期维护动机开篇；首屏先交代为什么需要方法，再进入文件与术语，没有新增失败经历、成果或付费记录。
- 文件分工改为“想改什么、去哪里改、接受后做什么”，补充变更传递例子。`AGENTS.md` / `CLAUDE.md` 只提供工作入口，指向设计说明、token 源与组件映射；生成 CSS / Swift 明确为产物。
- 将设计判断落到文字层级、留白、对齐、颜色、密度与状态反馈六项观察，继续用相同内容比较候选，选定后留下具体理由。
- 用普通文本图解释客户端、MCP、stdio、本机 server/relay、WebSocket、插件与 Plugin API；用读取选中卡片、试改间距的连续例子说明职责和结果回传。
- 免费范围拆分为 Figma 可用能力、开源连接程序与模型费用；保留官方 Starter MCP 限量入口、账户与 API 约束，不将 README 的营销比较视为当前官方套餐事实。
- 保留 `token_map` 输入范围、映射与同步区别、`design_diff` 对象、Web/iOS 边界和版本快照；删除两处没有对应效果断言的额外免责声明。description 同步改为单人维护动机与文件分工。

### 三遍修订与语义审读

- 第一遍重排入口与读者动作，作者动机先于工具定义；memo 仍明确是拟议练习。
- 第二遍补齐维护方法、审美观察与 Figwright 原理，合并重复解释，使设计到实现再到下一次修改的过程连续。
- 第三遍逐句收束，保留有实际作用的边界，移除重复的审计口吻，并复读完整正文。
- 作者在场：第一人称限于新增获准动机、已有工具使用与项目记录、原有准确引语；方案及练习未写成作者已完成的经验。
- 思想推进：读者可从“下一次如何接着改”走到文件入口、视觉比较、连接机制和变更验收；失败态与后续移动重试入口的两次改动保持一致。
- 事实完整性：新增机制只依固定 README 与 Figma 官方文档；保留未重跑 DayPage/CI、免费范围和拟议练习等边界。文章不含本机路径、私有引用或客户端配置约定误用。
- 主代理只读审阅通过，三处收束意见已落实，无新增编辑阻塞。

### 本轮来源与检查

- 重新读取固定提交的 Figwright README、Figma `How Plugins Run`、官方 MCP `Rate limits & access`；本轮没有执行其中的安装命令。
- 参考资料 7 改为固定提交 README；新增 24 支持插件界面层与沙箱层分工，新增 25 支持官方 MCP 按套餐/seat 限量访问。它们不证明完整链路离线或免费模型调用。
- 正文 32 处相邻引用，25 个唯一公开来源；25 条参考资料去重后与正文来源完全对应。
- 参考资料前约 8,388 个汉字（含标题、描述）；description 为 159 字符；保留 6 个 canonical tags。
- `node scripts/check-ai-flavor.mjs content/zh/engineering/posts/2026-09-26-figma-figwright-personal-design-system.md --check`：修订后与定稿复核均通过，0 错误、0 警告。
- `npm run frontmatter:check`：通过。
- `npm run tags:check`：通过，0 个文件需要修改。
- `git diff --check`：通过；另行检查未跟踪文章行末空白，无问题。
- `npm run briefs:check -- --file _briefs/2026-09-26-figma-figwright-personal-design-system.md`：状态更新后定向复核通过，1 个任务、0 错误、0 legacy。
- 全文使用普通 Markdown、标准表格及围栏代码；链路图为文本图，没有新增渲染语法风险。未运行全量构建、浏览器截图、E2E 或全库 briefs 检查。
- 仅修订原中文文章与本任务卡，未翻译、commit、push 或部署。下一步仍为作者最终审阅与发布决定；本文方案的实际效果留待项目任务验证。

## 双语封面与交付回执（2026-09-26）

- 按本人明确要求新增英文版 `content/en/engineering/posts/2026-09-26-figma-figwright-personal-design-system.md`，按 translation skill 对照中文；标题为 “Maintaining a UI on Your Own: A Design System with Figma, Figwright, and AI”。32 处正文引用与25项 References 的 URL 顺序、代码、标签和事实边界均与中文版对应。
- 生成无文字的多端设计主题封面，压缩为 1536×1024 JPEG，约535 KB，保存至 `static/images/covers/engineering/2026/figma-figwright-personal-design-system.jpg`；中英文共用，alt 分别本地化。
- 中文文风检查0错误/0警告，frontmatter、canonical tags、双语引用顺序和资源路径、文件空白检查通过。全站 `hugo --minify` 未通过：共享 `cover.html` 在若干非本次改动的既有英文文章页面发生3分钟渲染超时；本任务新增两篇正文不在失败路径中，且没有改布局模板。PR CI 仍需检查。
- 本人已明确授权提交 PR 并合并。当前工作仍在 PR 前；不可将“ready-to-publish”误记为已上线，合并结果与部署状态随后单独记录。
