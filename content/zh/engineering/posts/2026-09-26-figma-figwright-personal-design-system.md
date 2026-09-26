---
title: '一个人如何维护自己的界面：用 Figma、Figwright 与 AI 搭建设计系统'
date: 2026-09-26T15:18:51+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Development
  - AI
  - Agent
  - MCP
  - Context Engineering
  - Solo Builder
description: >
  从一个人长期维护界面的需要出发，解释如何组合免费 Figma、Figwright 与 Claude/Codex。通过日志卡片的设计和改版，讲清设计说明、token、组件与画布的分工，Figwright 如何借插件连接 AI，以及怎样用层级、留白、对齐、颜色和状态反馈作设计判断，形成适合 Web 与 iOS 的工作流。
cover:
  image: /images/covers/engineering/2026/figma-figwright-personal-design-system.jpg
  alt: '一张设计画布通过连接线关联桌面界面与手机界面'
  relative: false
---

我一个人做产品，想搭建一套自己的设计系统，把对应的 UI 和前端长期维护好。页面做好之后，还会加功能、改样式、适配另一个端。我希望下一次打开项目时，能够接着已有的设计往下做，也能说清楚一处改动会影响哪些地方。

所以，我需要一套自己能维护的方法：想改颜色时知道去哪里改，想换布局时有地方比较方案，交给 AI 实现时能让它找到已有组件。与此同时，我也想让界面更有设计感，并尽量用免费工具起步。文件怎么组织、工具怎么组合、好不好看怎么判断，是连在一起的问题。

我已经在使用免费 Figwright。[DayPage](https://github.com/getyak/daypage) 这个 iOS + Web 日志项目，可以作为讨论的具体载体。本文整理的是接下来可采用的工作流，其中的建议还需要通过实际任务验证。

下面以 **DayPage 的 memo 卡片作为拟议练习**：一条记录有正文、时间、同步状态和操作入口；先实现包含失败状态的一版，再把重试入口从操作菜单移到错误提示旁。卡片结构、变量名称和接口都是演示方案，不代表 DayPage 当前实现。这样一个小改动，已经足以带我们走过设计、代码和后续维护。

## 想改一处界面，先知道去哪里改

假设卡片底部的状态文字，在 Figma 中是灰色，在 Web 中使用一枚叫 `muted` 的颜色，iOS 又写了一个相似色值。它们看起来接近，却可能表达三种不同含义：次要信息、禁用控件、尚未完成的同步。

如果现在需要让“保存失败”更醒目，只告诉 Agent“把灰色改红”，很容易改到不该改的地方。更可靠的提问是：这个状态的含义在哪里定义，颜色由哪个入口维护，哪些组件消费它？

颜色和间距这类反复使用的值，可以取一个稳定名字，让各处通过名字使用它，这就是 **design token**。卡片的结构与行为可以封装为组件，例如 `MemoCard` 接收正文和状态，负责显示内容与响应操作。前者帮助统一数值，后者帮助复用实现。

对已有代码的个人项目，本文建议按“这次想改什么”寻找入口。下面的文件名是示例，可以沿用现有组织。

| 想做的改动 | 去哪里改 | 接受后还要做什么 |
| --- | --- | --- |
| 改变阅读优先级或设计取舍 | `DESIGN.md` 等项目设计说明 | 写清理由与适用条件，检查哪些界面应跟着调整 |
| 尝试新的排列、密度与留白 | Figma 的实验区 | 用相同内容比较；本人选定后移入接受区，落实到代码 |
| 统一颜色、间距等设计值 | `tokens.json` 等唯一源文件 | 生成 CSS / Swift 输出，更新画布变量并核对受影响界面 |
| 改变点击、重试、展开等行为 | 实际组件代码与状态示例 | 检查接口、交互和布局，再补齐 Figma 的状态图或注释 |
| 修正“画布里的它对应哪段代码” | 组件与 token 映射记录 | 确认实际渲染正确，再保存对应关系；重命名时一起维护 |

这里的“单一来源”应当按信息类型理解。Figma 很适合比较空间、层级和排列；代码才能证明键盘焦点、请求失败和屏幕适配实际怎样运行。把所有事实都挤进一个文件，会让这个文件迅速失去可维护性。

例如，想把失败提示改得更醒目，可以先在 Figma 的实验区比较“加粗文字”和“增加浅色背景”。本人选定后，如果只是调颜色，就修改对应的语义 token；如果还增加了重试按钮，就同时修改状态组件。生成产物、核对画布、检查真实页面，完成后再记录这次接受的版本。

**生成的 CSS / Swift 是产物，修改要回到源文件。** 如果直接在生成后的 CSS 里修颜色，下次生成时修正可能被覆盖；若只改 Figma，产品实现又没有收到变化。暂时无法自动同步的部分，可以保留明确的人工步骤，完成后核对两边。

### 给下一个 Agent 留一个入口

一个人维护也会有交接：今天的自己交给下次打开项目的自己，或者换一个 Agent 继续。项目采用的 `AGENTS.md` / `CLAUDE.md` 可以充当工作入口，指向设计说明、token 源与组件位置。本文建议让它们保存路径和操作规则，设计理由集中写在 `DESIGN.md`，避免几份文件各抄一套。

一个紧凑的入口可以这样写，路径需替换为项目实际位置：

```text
修改界面前，先读 DESIGN.md。
颜色与间距修改 tokens.json，再运行项目已有的生成命令。
复用现有组件；组件位置与已确认映射见 docs/figma-component-map.md。
完成后检查受影响状态，并同步已接受的画布与设计说明。
```

不需要每次把所有资料塞给模型。改卡片状态，就让它读相应设计约定、状态组件、相关 token 和那块画布。若这次没有改变设计理由，也无须为了一次小修把 `DESIGN.md` 重写一遍。

如果是从零开始、以设计为主的项目，也可以让设计工具中的变量承担最初入口。但应明确导出方向和接受变更的步骤。本文围绕已有 Web 与 iOS 代码展开，因此采用“仓库维护 token，画布保留探索和视觉证据”的方案。

## 免费 Figma 足够起步，但文件要有秩序

截至 2026 年 9 月 26 日，Figma Starter 不提供 Dev Mode 和团队库，版本历史为 30 天；它允许无限数量的 drafts，但 Starter 团队里的 Design 文件最多三页。“草稿数量不限”不能推导出“团队文件页数不限”。[Starter 说明](https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview)、[页面限制](https://help.figma.com/hc/en-us/articles/360038511293-Create-and-manage-pages)

免费层仍能创建本地组件、样式和变量；限制在于不能把它们发布成供其他文件使用的库。[Figma 库基础说明](https://help.figma.com/hc/en-us/articles/39723547036055-Components-collection-Library-fundamentals)

这使“一个产品先用一个文件”成为务实的起步方式。可以把三页安排成：

- **Foundations**：变量、字体样式、基础组件，以及它们需要被检查的状态。
- **Product**：当前接受的产品界面，按实际任务组织；memo 的 Web 与 iOS 方案放在可以并排比较的位置。
- **Lab**：尚未接受的方向、参考与改版实验，用 section 区分批次。

三页是本文建议的组织方式，并非 Figma 要求的设计系统模板。目的很简单：Agent 和人进入文件后，都能找到“正在使用的”“可以复用的”和“还在尝试的”。

卡片也需要有能传递意图的结构。与其保留 `Frame 238` 和 `Group 17`，可以使用 `Memo/Card`、`Memo/Body`、`Memo/Status`。正文变长时，容器应如何扩展；窗口变窄时，状态和操作入口是否换行，都应通过 Auto Layout 和约束表达，再亲手缩放画布检查。Figma 官方指南明确建议用语义名称、变量与 Auto Layout，并用注释补充视觉无法传达的行为。[结构指南](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/)

不要因为要“建系统”，就先画几十个用不到的控件。这个练习只需要正文容器、状态提示和实际会出现的操作。等第二个界面真的复用了其中一部分，再判断边界是否合适。

免费工作流还有一个维护成本：把模板复制到另一个文件，只产生另一个副本。本文建议给副本标记来源版本，并把更新当作明确的迁移。等多个产品频繁共享组件，跨文件发布库所省下的维护工作才成为值得评估的付费理由。

## 让“优雅”变成可以讨论的设计决定

“做得高级一点”没有告诉 Agent 应当牺牲什么。它可以加留白、减对比、缩小字号，也可以加渐变和动效；这些动作都可能改善一张展示图，也可能妨碍正在发生的任务。

因此，在继续操作画布之前，可以先为 memo 写一段短的设计说明。下面是练习用的普通 Markdown 文档，不是任何工具的专用配置：

```markdown
# Memo 卡片的设计约定

任务：用户快速找到一条记录，并继续阅读或编辑。
内容顺序：正文 > 需要处理的异常 > 时间等辅助信息。

已接受的约束：
- 正文变长时允许卡片增长，操作入口不能覆盖正文。
- 保存失败需要文字说明和重试入口，不能只靠颜色。
- 正常同步状态保持克制，避免每张卡片都争夺注意力。

实现入口：
- 数值从项目 token 源生成，各端输出不手工修改。
- 使用现有组件；没有对应能力时，先列出接口缺口。

待验证：
- 密集列表中，异常提示是否仍然容易发现？
- 字体放大后，正文和操作是否仍能完整使用？
```

它的价值在于保留约束和判断依据。下一次换一个 Agent，它能够继续讨论“异常提示的可见性”，无需重新猜测“高级”的含义。

`DESIGN.md` 这个名字也需要分清。项目自己写的设计说明，与某个仓库定义的格式，不会因为同名就自动兼容。例如，Google Labs 的 [design.md](https://github.com/google-labs-code/design.md) 定义了面向 coding agent 的视觉身份描述格式、token schema 和 CLI；本次核查时仍标为 `alpha`。使用它应当阅读其具体 schema，不能假设任意 Markdown 都能被它解析。

一个值得用来练习描述的素材库是 VoltAgent 的 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/f6961238d5cddcf8042a74a70fc400ec67181abb/README.md)。它把公开网站的视觉分析整理成 DESIGN.md，内容包括色彩角色、排版、组件样式、布局和使用约束；收录了 Linear、Apple 等例子。可以借用它的描述维度，学习怎样把“感觉清爽”拆成可讨论的色彩、密度和层级。

取样边界同样要保留。例如，该集合的 [Apple 分析页](https://getdesign.md/apple/design-md)明确把内容定位为对公开可见模式的独立分析，并将适用场景指向产品展示页和营销网站；它没有获得 Apple 的背书。这样的参考不会自动补齐 memo 的失败重试、编辑中离开、长文本展开等交互。本文建议先写下“借用什么、在哪个任务下验证”，再把选中的规则改写为自己的项目说明。直接搬进整份品牌描述，容易连同不适用的展示逻辑一起带入。

### 用同一份内容比较两个方向

做比较之前，可以先把“好不好看”拆成几件能在画面上指出来的事。以下是本文建议的观察顺序，可以直接用在 memo 上：

1. **文字层级：先看到什么。** 让正文、时间和状态放在一起，检查第一眼落在哪里。如果时间比正文更抢眼，先减少它的字重或强调程度；如果错误被淹没，就提高错误提示的可见性。每轮先改变一个因素，避免同时放大、加粗、变色之后无法判断原因。
2. **留白：哪些内容属于一组。** 正文和它的时间可以靠近一些，两条记录之间留出更明显的距离。先看内外间距的相对关系，再定数值。示例里可以试 8、16、24 这样的少量间距档位；它们只是起点，窄屏和长文本仍需检查。
3. **对齐：有没有无意的偏移。** 暂时淡化背景和装饰，看正文左边缘、时间、状态是否沿着有意义的线排列。图标与文字还要看视觉上的居中，数字相等不一定看起来齐。能通过一处对齐解决的杂乱，先别用新卡片或分隔线包起来。
4. **颜色：每种强调有没有职责。** 正文、辅助信息、主要操作和错误分别承担什么角色，先说清楚。若普通标签和保存失败都用同样的红色，异常就难以被识别。检查时还可以临时隐藏颜色，确认文字和图形本身仍表达了状态。
5. **密度：当前屏幕支持什么任务。** 一屏容纳更多记录有利于扫读，但不能靠不断缩小正文和操作区实现。拿同一批真实长度的内容，比较疏与密两版，看找记录、读正文、点操作分别变得更容易还是更费力。
6. **反馈：操作前后是否说得清。** 点击重试后，应能分辨正在处理、已成功还是再次失败。留意按钮变化是否导致卡片跳动，反馈是否挡住正文。把这些状态并排放在画布上，再到实际页面里走一遍。

这些技巧提供的是比较方法。单个字号、留白比例或颜色数量，都不应脱离内容和任务变成必须遵守的“高级感”数值。

对这张卡片，可以先做两版候选：一版减少边界、依靠留白区分记录；另一版压缩纵向空间、强调时间与状态的对齐。两版放入**完全相同的正文、时间、状态和屏幕宽度**。

比较时先完成任务：找到昨天的一条记录，辨认哪条保存失败，进入编辑，然后返回列表。再看哪些视觉决定帮了忙。

如果 A 使用短句、B 使用长段落，或者 A 展示正常状态、B 展示三个错误，评审就很难知道差异来自内容还是设计。固定内容，是让个人审美判断变得可以复查的一种练习方法。

选定一版后，留下具体理由。例如：“保留 B 的状态对齐；采用 A 的正文间距；错误文字占独立一行，避免长文本时挤压重试按钮。”这样的记录能直接进入下一次修改。单独留下“更干净、更有质感”，很难继续工作。

## Figwright 怎样把 AI 接到免费 Figma 上

可以把 Figwright 理解为接在 AI 客户端和 Figma 插件之间的一段连接程序。你在 Claude、Codex 等支持 MCP 的客户端里提出任务；Figwright 将工具调用送到 Figma 中运行的插件，插件负责实际读取或修改画布。它是独立的开源项目，采用插件路径，不要求 Dev Mode 席位。[Figwright 固定版本说明](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)

这条链路可以画得很简单：

```text
你在 AI 客户端里提出任务
         ↓
客户端发出 MCP 工具调用
         ↓ stdio：本机进程的标准输入/输出
本机 Figwright server / relay
         ↓ 本地 WebSocket 连接
目标文件中运行的 Figma 插件
         ↓ Plugin API：读取节点、修改属性
Figma 画布

读取结果或执行结果，沿连接返回客户端。
```

这里几个名字负责不同事情：**MCP** 约定客户端怎样发现和调用工具；**stdio** 是客户端与本机 server 交换消息的通道；**WebSocket** 维持 server 与插件之间的连接；**Plugin API** 则是 Figma 向插件提供的读写接口。Figwright 的固定 README 给出了这套连接结构。[实现结构说明](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)

Figma 插件内部也有分工：能使用浏览器能力的界面层负责连接，访问文档节点的沙箱层执行画布操作，两者传递消息。Figma 官方的 [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) 解释了这一区别。使用时不必记住内部细节，但应知道：执行画布修改的是插件，模型负责根据任务选择和组织工具调用。

### 读一张卡片，再试着改它的间距

例如，在 Figma 中选中 memo，要求 Agent“读取这张卡片，说明正文和状态如何排列”。客户端会调用读取工具；本机 server 把请求交给插件，插件通过 API 读取对应节点的层级、布局与绑定信息，结果再返回客户端。这样，Agent 能拿到画布结构，不必只凭一张截图猜测。[设计读取工作流](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md)

接着，在实验区要求“把正文与状态之间的间距从 16 试到 24”。这两个数只是演示：Agent 应先确认改的是哪层容器，以及间距有没有绑定变量，再调用写入工具，由插件修改布局属性或相应绑定。返回执行结果后，重新读取、截图，看长正文下的变化；写入成功还需要视觉核对。[画布写入工作流](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md)

开始使用这条路径，需要让本机 server 运行，并在目标 Figma 文件中打开插件。该版本文档采用从 manifest 导入插件的方式，这一步需要 Figma 桌面版。连接成功后，再确认目标文件与选择区域。[设置说明](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)

### 免费的范围要分开看

这套组合可以用免费 Figma 加开源 Figwright 起步。插件能力仍受账户、文档权限和 Plugin API 约束，共享库等 Starter 限制也依然存在。Claude/Codex 的模型订阅或调用费用要单独计算；接通工具只提供了执行路径，输出质量仍取决于设计材料、组件复用和审阅。

同时，Figma 官方远程 MCP 当前也给 Starter 提供有限访问额度，具体限制按套餐和 seat 区分。因此，“Starter 没有 Dev Mode”不等于“官方 MCP 全部必须付费”。本文围绕已经使用的 Figwright 插件路径展开，官方额度以其 [Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) 页面为准。

本地连接也不等于整条工作流离线。如果客户端把工具返回的设计上下文交给远程模型，这部分数据仍会进入该模型的处理链路，应按实际客户端和模型的配置判断。

本文对工具行为的核查固定在提交 `ee1ad57`。公开 [v0.5.0 Release](https://github.com/awdr74100/figwright/releases/tag/v0.5.0) 发布于 2026 年 8 月 30 日，不能仅凭版本名称，就假设已安装的包和插件包含后续主干的全部功能。应检查实际连接后的工具清单，并对照安装版本的文档。下面的示例是调用思路，参数以实际安装版为准。

### 从画布进入代码：先读对应关系

对 memo 这样的局部区域，Figwright 的 [`figma-codegen` 工作流](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md)先读取完整设计上下文，再匹配已有组件、token 和图标，最后渲染验证。这个顺序可以缩成三次判断：

1. **画布上到底有什么？** 获取当前区域的结构、布局、变量绑定和组件属性；只选要实现的卡片或 section，不把整个产品一口气塞进来。
2. **仓库里已经有什么？** 检查组件映射及其候选，读取实际接口；已有 `MemoStatus` 时，优先确认它能否表达这次状态。
3. **哪些仍是猜测？** 同名组件、相同色值和未映射属性需要审阅，不能因为工具给了一个候选就视为已确认。

尤其要留意“看起来一样”的 token。`text.secondary` 与 `control.disabled` 当前可能都是同一种灰，但它们的含义不同。把时间文字绑定到禁用控件 token，今天看不出问题，下一次调整禁用态时就会误伤时间文字。

[`token_map` 的实现](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/token-map.ts)会结合名字和值匹配；同色候选存在歧义时会提供提示。它读取的 `tokenSource` 包括 CSS、SCSS，以及 Tailwind / UnoCSS 配置。**任意 DTCG JSON 不是这里可直接代入的输入格式。**

如果项目先从 `tokens.json` 生成 CSS，可以让这个工具读取生成后的 CSS 做映射，同时继续把 JSON 当作数值维护入口。不要让“工具读哪个文件”改变“人应该修改哪个文件”。

```text
token_map({
  rootDir: PRODUCT_ROOT,
  tokenSource: GENERATED_CSS_PATH
})
```

这里的 `PRODUCT_ROOT` 是产品仓库根目录，`GENERATED_CSS_PATH` 是相对于它的实际 CSS 路径，二者都是示意占位。尤其在多仓库环境里，要显式指定 `rootDir`；默认服务器工作目录未必就是正在实现的产品。

`token_map` 的输出是一份对应关系和缺口信息。它不会因此把 token 源、Figma 变量和 Swift 文件全部双向同步。映射、转换输出和同步存储应当分别验收。

核实后的模糊对应关系还需要保存。上述 `figma-codegen` 工作流约定，`docs/figma-component-map.md` 用 `FigmaName | code/path` 记录组件，`docs/figma-token-map.md` 用 `FigmaName | ref` 记录 token。应在实际渲染、确认语义正确之后，再写入原本不确定的映射；这些记录会覆盖以后重新计算的匹配结果，错误记录也会被持续复用。[映射记录约定](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md)

### 回到画布：让实例和变量保留关系

反向建设 Figma 时，先读取文件已有的变量、组件和样式，再以实例组装界面、绑定数值，最后截图核对。Figwright 的 [`figma-build` 工作流](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md)明确采用这条路径。

假设正文颜色已有变量，Agent 应把正文绑定到它；如果 `Memo/Status` 已经是组件，就创建实例。把它们重新画成外观相同的文本和矩形，会丢掉以后集中修改的入口。

这也是截图之外必须检查的事情：一张图能够展示最终外观，却无法证明每个颜色仍绑定到正确变量、每张卡片仍是同一个组件的实例。

## 多端共享到语义，平台行为分别实现

DayPage 的已有工程记录中，`tokens.json` 是数值的单一来源，再生成 Web 的 `globals.css` 和 iOS 的 `DSTokens.swift`，并有 CI 漂移检查。上述机制来自已有项目记录；本文没有重新运行项目或 CI。[项目公开入口](https://github.com/getyak/daypage)

这套机制可以作为本文方案的起点，帮助控制数值漂移。Web 和 iOS 的输入方式、导航及组件行为，仍需要各端实现。

最容易共享的是语义。例如，都需要表达主要文字、次要文字、危险操作和保存失败。可以先约定 `status.error` 表达需要用户处理的错误，再分别决定两端怎样显示、怎样朗读、怎样让用户采取下一步动作。

下面是拟议映射，名称仅作演示：

| 设计含义 | Figma | Web | iOS |
| --- | --- | --- | --- |
| 次要文字 | `text/secondary` 变量 | `--text-secondary` | `DSTokens.textSecondary` |
| memo 状态 | `Memo/Status` 组件 | `MemoStatus` | `MemoStatusView` |
| 重试保存 | 状态图与行为注释 | 可聚焦的重试按钮 | 可访问的原生按钮 |

最后一行尤其重要。Web 需要检查键盘能否到达按钮、焦点是否可见；iOS 需要检查触摸操作、字体放大和辅助功能下的可用性。两端可以拥有相同的任务含义，同时采用适合各自环境的呈现。

Figwright 在本次核查的 [`profile.ts`](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/profile/profile.ts)中，主要识别 React、Vue、Svelte 等 JS/TS 前端及其样式系统。不能据此推断它已经替 SwiftUI 完成了组件自动映射。iOS 一侧应明确提供现有 Swift 组件入口、token 输出和平台约束，再单独验证结果。

### token 格式统一之后，还要验证输出

Design Tokens Community Group 的 [2025.10 格式](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)为 token 的类型、值和引用等提供了交换约定。它是社区组发布的规范，不是 W3C Recommendation；采用这个格式，也不代表每个工具都完整支持它。

[Style Dictionary](https://styledictionary.com/)承担的是把 token 转换为多个平台输出的工作。项目可以使用这类工具，也可以继续使用已有生成器。本文建议把验收放在结果上：名称和引用是否正确解析，单位是否按目标平台处理，主题是否完整，重新生成是否能暴露手工改动。

对 memo 练习，一个够用的检查是：修改源中的一枚语义 token，重新生成 CSS 与 Swift，确认受影响的两端组件都正确变化。再观察不相关的文字是否被误伤。这个小实验能同时检查命名、转换和消费关系，比确认“JSON 文件存在”更接近可维护性。

不要为了工具兼容，同时手写 JSON、CSS、Swift 和 Figma 四套数值。无法自动贯通的那一段，可以暂时保留明确的人工更新步骤；成本至少应当看得见。

## 第一次实现，要把状态带进来

选好视觉方向后，可以给 Claude 或 Codex 一份窄任务。岗位无需固定在某个模型身上；下面的任务也可以由同一个 Agent 先实现、再切换到审阅阶段完成。

```text
实现已选 memo 卡片方案。

先读取设计说明、现有卡片与状态组件、token 输出入口，
再读取指定 Figma 区域的完整上下文。

复用已存在的组件和 token。存在歧义或接口缺口时，
列出候选、依据和待决定项，不静默创造近似实现。

覆盖短正文、长正文、待同步、保存失败和重试中状态；
同时检查窄屏与宽屏、键盘操作和字体放大后的表现。

完成后给出实际复用项、仍未映射项、运行检查与截图。
只有渲染并确认正确的模糊映射，才写入映射记录。
```

其中“复用已存在的组件”需要真实入口。对于使用 shadcn/ui 的项目，其 [MCP 文档](https://ui.shadcn.com/docs/mcp)提供了浏览、搜索和安装 registry 组件的能力；它解决组件发现问题，不能替项目决定哪种交互适合日志卡片。已经有合适组件时，也没有必要为这篇文章再引入一套库。

Coinbase 提供了一个可参考的团队例子。其 [CDS 官方 AI 文档](https://cds.coinbase.com/getting-started/ai-overview)把 Agent Skills、组件 MCP 和分平台文档索引组织在一起：`cds-code` 识别 React / React Native 环境与可用包，指导组件选择，优先使用设计 token；MCP 则提供组件 API 上下文。

本文从这个案例借鉴的是信息供给方式：让 Agent 找到当前项目真实可用的组件、接口和规则。个人项目可以先靠一份设计说明、几处清晰入口和已验证映射做到这一点，无需照搬团队的基础设施。

### 把组件放到真实内容里检查

memo 可以先有一个很小的状态集合：

- 一行正文与一段很长的正文。
- 正常保存、待同步、保存失败、重试中。
- 没有记录时的空状态。
- 窄屏、宽屏，以及用户放大字体后的布局。

不必机械地把所有状态相乘。先检查能改变布局或阻断任务的组合，例如“窄屏 + 长正文 + 保存失败”。错误提示是否把重试按钮挤出屏幕，用户是否还能读完内容，往往比默认态的阴影差一像素更值得优先处理。

如果项目已经有 Storybook，可以把这些状态做成可重复打开的 story。它的 [accessibility addon](https://storybook.js.org/docs/writing-tests/accessibility-testing)基于 axe-core，对渲染后的页面进行规则检查，并把无法自动确认的结果留待人工检查。没有 Storybook 时，一个只供开发使用的组件展示页也可以承载这些场景。

审阅应分别回答三个问题：实现是否使用了正确资产，交互是否可用，视觉选择是否服务任务。截图有助于看出排版和间距差异；可访问性检查有助于发现规则问题；二者都不能独自决定哪个方向更有美感。

## 下一次改动，才开始检验系统是否存在

第一次画好、第一次实现之后，先保存一个明确的比较起点。然后提出一个小需求：把保存失败后的重试入口从操作菜单移到错误提示旁，其他正常状态保持原来的层级。

这里适合使用 `design_diff`，但需要清楚它比较的对象。

根据本次核查的 [实现源码](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/design-diff.ts)，它读取某个 Figma 节点的设计上下文，在产品仓库的 `.figwright/snapshots/` 下保存快照。第一次调用创建基线；后续调用比较同一节点的结构与属性，返回新增、删除及变化；`update: true` 接受当前设计作为新基线。

```text
// 首次实现并核对后：保存对应区域的设计快照
design_diff({ nodeId: MEMO_NODE_ID, rootDir: PRODUCT_ROOT })

// 画布调整后：读取相对旧快照的变化
design_diff({ nodeId: MEMO_NODE_ID, rootDir: PRODUCT_ROOT })

// 代码更新、状态检查与视觉核对完成后：接受新基线
design_diff({
  nodeId: MEMO_NODE_ID,
  rootDir: PRODUCT_ROOT,
  update: true
})
```

这里比较的是**两次 Figma 设计上下文**。它不会检查产品代码是否已经同步，也不做像素截图比较。即便返回 `no-changes`，代码仍可能被别人改过，或者上一次实现就有遗漏。

本文建议把接受基线放在实现和验证之后：先读变化，确定受影响组件，完成代码修改，检查相关状态，再更新快照。如果读完变化就立即 `update: true`，下一轮就难以再从原基线看清尚未落实的设计改动。

对这次 memo 修改，理想的审阅范围应当能够被说明：移动失败态操作、让状态组件接收重试动作、调整对应布局，并验证它没有改变正常态。若 Agent 重写了整个页面，至少应先解释为什么现有组件无法承载这次变化。

发现实现中更好的排版，也不必强迫代码退回画布。可以由本人接受这个改进，再更新 Figma 和设计说明。关键是接受过程留下记录，使下一位执行者知道应该跟随哪个版本。

### 多个 Agent 共用资产时，减少同时写入

让一个 Agent 做候选方案，另一个核对实现，是可以尝试的分工。但本文建议同一时刻只让一个执行者修改共享 token、基础组件或同一个 Figma 文件；其他执行者提出差异和建议。并行先用于相互独立的探索与检查，公共资产的变更集中审阅。

Figwright 的文件选择机制能帮助调用落到指定文件，其 [固定版本说明](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)介绍了 `list_files` / `use_file`。选择目标文件不应被当成共享资产的并发锁：两个 Agent 即使分别操作不同画布，仍可能同时修改同一份 token 源。

## 遇到明确瓶颈，再补工具

到这里，起步组合已经很小：Figma 保存视觉方案，Figwright 连接画布，一个能访问产品仓库的 Agent 执行任务，仓库保存设计说明、token 和真实组件。本文建议等缺口具体出现，再选择补充工具：

| 已出现的瓶颈 | 可考虑的工具 | 应当验收的边界 |
| --- | --- | --- |
| 能做出页面，却说不清哪里需要改 | [Impeccable](https://github.com/pbakaus/impeccable) 的 `critique`、`audit` 等设计审阅能力 | 用来提出层级、可读性与响应式问题；其中字体、色彩等风格规则带有作者偏好，需对照本项目目标取舍 |
| 希望在设计侧编辑 token，并把修改交回版本管理 | [Tokens Studio 的远程存储](https://docs.tokens.studio/token-storage/remote/) | 明确它连接的是哪份 token 源、何时 push/pull；存储同步之后仍需转换输出，插件内 Git 分支创建与切换属于 Pro 能力 |
| 初始方向过窄，想比较新的布局候选 | [Stitch Design Skills](https://github.com/google-labs-code/stitch-skills) 的设计生成与变体工作流 | 需要配置 Stitch MCP；候选选定后仍应回到项目组件、token 和状态验证中落实 |

例如，memo 当前的问题若是“错误提示不容易发现”，先用审阅工具解释层级问题，再试一处修改即可。只有当两三个局部调整仍无法承载任务时，重新发散整个布局才有明确理由。每多接入一个工具，也要说清它产出的内容由谁接受、保存到哪里。

## 把审美留在每一次具体选择里

做完一次界面修改后，可以在设计说明里留下一条短记录：改了什么、想解决什么、在哪些内容和状态下检查过。把审美练习放进日常维护，下一次就能比较自己的判断是否仍然成立。

也要允许判断失效。某个布局在三条短记录中很好看，遇到二十条长记录可能就变得疲惫。此时记录“在哪种内容和任务下不合适”，比维护一句永远正确的“少即是多”更有用。

随着项目增加，可以把这种记录连同组件一起复用。但复用的单位应包含适用条件：某种状态布局解决了什么问题，在哪些尺寸和内容下检查过，什么变化会要求重新判断。这样，个人风格才能逐渐成为一套自己能够解释的选择。

如果今天开始，本文建议只完成这个练习：在一个 Figma 文件里整理 memo，比较两个方向，实现选中的一版，再真的做一次小修改。结束时应能找到设计理由、token 来源、真实组件、状态示例，以及与当前实现对应的设计快照。哪一项找不到，下一步就补哪一项。

我曾把自己的工程问题概括为：“围绕一个问题做工程：让上下文在工具切换之间不丢失。”放到设计上，这句话可以有一个很小、很具体的落点：下一次打开画布或让 Agent 修改页面时，仍然知道这一处为什么这样做，也知道什么证据足以让它改变。

## 参考资料

以下资料核查于 2026 年 9 月 26 日。Figwright 的实现与工作流细节固定引用提交 `ee1ad5708634f8c2c0c1ac517f048acd2d7fca65`；产品套餐和工具能力仍应在实际采用时复核。

1. [Figma：Structure your Figma file for better code](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/)——组件、变量、命名、Auto Layout 与行为注释。
2. [DayPage 公开仓库](https://github.com/getyak/daypage)——项目入口；本文对同源 token 与 CI 的描述依据作者已有工程记录，未在本轮重跑验证。
3. [Figma：Starter plan overview](https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview)——免费方案、团队库、Dev Mode 和版本历史限制。
4. [Figma：Create and manage pages](https://help.figma.com/hc/en-us/articles/360038511293-Create-and-manage-pages)——Starter 团队 Design 文件页数限制。
5. [Figma：Components collection — Library fundamentals](https://help.figma.com/hc/en-us/articles/39723547036055-Components-collection-Library-fundamentals)——本地资产与跨文件发布库的区别。
6. [Google Labs：design.md](https://github.com/google-labs-code/design.md)——视觉描述格式、token schema 与 alpha 状态。
7. [Figwright 固定版本 README](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)——MCP、stdio、WebSocket、插件、本地连接与文件路由。
8. [Figwright v0.5.0 Release](https://github.com/awdr74100/figwright/releases/tag/v0.5.0)——发布版本与日期。
9. [Figwright：figma-codegen 工作流](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md)——读取、复用、渲染与映射记录。
10. [Figwright：token-map.ts](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/token-map.ts)——输入格式、匹配与歧义。
11. [Figwright：figma-build 工作流](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md)——读取既有资产、实例化、绑定和截图核对。
12. [Figwright：profile.ts](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/profile/profile.ts)——项目识别的技术栈范围。
13. [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)——DTCG 格式与规范地位。
14. [Style Dictionary](https://styledictionary.com/)——多平台 token 转换输出。
15. [shadcn/ui：MCP Server](https://ui.shadcn.com/docs/mcp)——组件 registry 的浏览、搜索和安装。
16. [Coinbase Design System：AI Overview](https://cds.coinbase.com/getting-started/ai-overview)——Skills、MCP 与分平台组件文档。
17. [Storybook：Accessibility tests](https://storybook.js.org/docs/writing-tests/accessibility-testing)——组件可访问性自动检查与人工核对。
18. [Figwright：design-diff.ts](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/design-diff.ts)——Figma 结构快照、差异与更新基线。
19. [VoltAgent：awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/f6961238d5cddcf8042a74a70fc400ec67181abb/README.md)——固定快照中的网站视觉描述集合与分析维度。
20. [GetDesign：Apple Design System Analysis](https://getdesign.md/apple/design-md)——独立分析的取样、适用场景与非官方属性。
21. [Impeccable](https://github.com/pbakaus/impeccable)——设计审阅命令及其风格规则。
22. [Tokens Studio：Remote Token Storage Integrations](https://docs.tokens.studio/token-storage/remote/)——远程存储、Git 同步与部分 Pro 能力。
23. [Google Labs：Stitch Design Skills](https://github.com/google-labs-code/stitch-skills)——设计生成、编辑、变体及 MCP 前提。
24. [Figma：How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/)——插件界面层、沙箱层与文档访问机制。
25. [Figma：Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)——官方 MCP 按套餐和 seat 提供的访问范围与额度。
