---
title: 'Tana 产品拆解：一条任务怎样从笔记走到会议中的工作'
date: 2026-10-23T00:45:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Productivity
  - Product Strategy
  - Development
  - MCP
description: >
  Tana 与 Tana Outliner 是两款产品。用虚构任务解释节点与引用如何复用信息，Supertags 和查询怎样生成工作界面，再看新版会议中的提案审核与外部执行。面向产品开发者，结合类型和空间讨论建模成本与权限，给出任务复现流程及首版实现和数据迁移的验收方法。依据 2026 年 10 月 23 日公开资料。
cover:
  image: /images/product-docs/2026/tana-home.png
  alt: 'Tana 官网演示：视频会议旁显示 Linear 工作项与邮件草稿'
  caption: 'Tana 官网公开演示，2026-10-23 获取；非作者账户实测。'
  relative: false
---

一条写在会议记录里的任务，如果还能出现在项目看板上，并从任一处修改同一份内容，记录就有了继续参与工作的机会。研究 Tana，我想先弄清这条任务的去向。

先约定一个虚构例子。青苔项目要解决“离线后重复提交表单”的问题，会议里记下任务“补上提交去重”，负责人暂定为成员甲。接下来要知道它属于哪个项目，谁接手，为什么要做，以及会后究竟有没有进入工作系统。这个例子只用于解释和设计验收，没有在真实账户中执行。

今天看 Tana，需要先辨明两个名字。**Tana Outliner 继续提供以节点和 Supertags 为核心的结构化笔记；新 Tana 将入口放在会议与团队工作。** 两款产品分别有官网和文档，能力要逐项归属。[Tana Outliner 首页](https://outliner.tana.inc/)、[Tana 首页](https://tana.inc/)

本文核对公开资料的日期是 **2026 年 10 月 23 日**。下文区分官方文档记载、据此作出的产品判断，以及我建议的实现。没有安装、登录或亲测证据的部分，不作体验结论。

## 两款产品，把结构化的成本放在不同地方

2026 年 3 月 31 日的拆分公告解释了这个转向。团队承认，原来的 Tana 功能强，却难学，也难让整个团队用起来。新产品为协作重新搭基础。这是厂商对自身取舍的解释，还不足以证明新版已经降低了用户的实际学习时间。[The next chapter for Tana](https://outliner.tana.inc/blog/the-next-chapter-for-tana)

到本次核对时，新 Tana 已有下载和套餐页面，更新日志最新一条日期为 10 月 8 日；Outliner 的最新记录则是 10 月 12 日。旧产品仍在维护，不能把拆分理解为立即退役，也不能拿早期测试期的状态描述今天。[Tana 更新日志](https://tana.inc/changelog)、[Outliner 更新日志](https://outliner.tana.inc/changelog)、[Tana 定价](https://tana.inc/pricing)

我的理解是，这次分工触及了一个很实际的问题：谁来把杂乱的信息整理成可以继续处理的对象？Outliner 让使用者直接掌握建模工具。新版尝试让 AI 分担一部分整理工作，人再面对提案和执行结果。开发者从中可以借鉴的，是这笔成本怎样分配。是否值得付出，还得回到具体任务。

![Tana Outliner 官网首屏：左侧介绍结构化笔记，右侧展示会议记录中的字段与后续任务](/images/product-docs/2026/tana-outliner.png)

*Tana Outliner 官网公开演示，2026-10-23 获取。右侧把会议记录和后续任务放在同一个信息环境里，适合观察产品的组织思路。图中内容不是作者工作区，也不能证明本次完成过任务流转。来源：[Outliner 官网](https://outliner.tana.inc/)。*

## 先让任务拥有自己的身份

Outliner 的基本单位是 node，也就是大纲中的一个节点。每个节点创建时就有唯一标识，同名内容可以是不同对象。reference 则让同一个节点出现在别处。编辑任何一处引用，会更新同一对象的其他呈现。[Nodes and references](https://outliner.tana.inc/learn/features/nodes-and-references)

于是，青苔项目里的“补上提交去重”可以留在会议原来的位置，同时供另一个界面使用。会议保存它的来由，任务界面提供处理入口。这个关系成立的前提，是两处指向同一个对象。

普通复制也会受这套语义影响。Outliner 内部复制粘贴默认生成引用；要得到独立副本，需要 Duplicate。删除引用只移除该处引用，不删除原节点。[Copy-paste and export](https://outliner.tana.inc/learn/features/copy-paste-and-export)

这会改变用户已经学会的动作。一个人想把旧任务当作新任务模板，复制后改名，却可能改到了原对象。我会在借鉴这种设计时，把“引用”和“独立复制”都做成明确操作，复制后立即告诉使用者新位置与原内容的关系。统一身份省下了维护重复内容的力气，也增加了解释编辑影响范围的责任。

对象身份还给后续验收一个很小的抓手。不要只看两个界面里有没有相同标题，要核对对象链接是否一致。否则，两份同名文字也能制造出“已经联动”的错觉。

## Supertag 给记录一个类型，字段补上工作条件

Supertag 让节点获得类型和模板。例如，给节点标上 Task，模板可以带出字段和子节点，同类节点随后能够被查询与整理。官方用“它是一种什么”来解释类型选择，这比把 Supertag 当作主题关键词更接近它的用途。[Supertags](https://outliner.tana.inc/learn/features/supertags)

沿着青苔项目的例子，我会先设一个 Task 类型，只放项目、负责人和完成状态。项目信息用关联对象表达，负责人从成员里选，先不设计复杂优先级。这里的字段组合是示范方案，不是 Tana 自带的固定模板。

字段的语义也要逐个弄清。Outliner 的 Options from supertag 能从特定类型的节点中提供选项。字段校验发现不合规数据会警告，但不阻止存入。自动初始化则只在相应模板字段初始化时填值，之后不会持续跟随来源变化。[Fields](https://outliner.tana.inc/learn/features/fields)

这三个细节会直接改变产品行为。负责人如果只是自由文本，“成员甲”和他的另一个名字可能被当成两个值。项目从父节点初始化后，任务再移到别处，也不能假定项目字段自动改了。日期出现警告时，记录仍可能留在系统里，后面的自动处理就要决定如何对待它。

我倾向于先让捕获足够宽松，再在“进入执行”这个动作上收紧条件。例如，记下一条任务可以缺负责人，提交到团队工作队列前必须补齐。这样能保留随手记录的空间，又不把缺项悄悄交给下游处理。这是我从文档行为引出的实现选择，不是对 Tana 内部校验流程的披露。

## 查询把散落的任务聚到一起

字段具备了，才轮到工作界面。Outliner 的 Search node 保存查询，结果是匹配节点的引用。编辑结果会修改原对象。查询只在搜索节点展开时运行，折叠时不在后台持续执行，结果上限为 2,500 个。[Search nodes](https://outliner.tana.inc/learn/features/search-nodes)

视图再决定怎样呈现这些对象。Outline、Table 和 Cards 等视图可以作用于节点的子内容，也能用在搜索结果上。换视图不改变底层数据。[Views](https://outliner.tana.inc/learn/features/views)

两者接起来，就能描述一个可自行复现的最小实验。下面依据文档安排操作，尚未亲测。操作名称与入口应以实际版本为准。

1. 在测试工作区创建 Task 类型，设置项目与负责人字段，并让任务节点带完成复选框。
2. 建立“青苔项目评审”会议节点，在其下创建“补上提交去重”，加上 Task 类型，填写项目和负责人。
3. 在另一处新建搜索节点，用查询构建器组合 Task、该项目与未完成条件。这里是条件描述，不是可粘贴的查询语法。
4. 展开搜索，把结果切到 Table，核对任务链接，再修改标题；回到会议原处检查同一对象。
5. 标记完成后重新展开查询，检查任务是否退出未完成集合，会议记录中是否仍能找到它。

这五步要验的是同一对象怎样在不同位置参与工作。表格再漂亮，也不能代替身份核对；最后从未完成集合消失，也不该被误读成原记录遭到删除。若结果不符，需要检查查询条件、刷新时机，以及是否误用了独立副本。

我据此理解，Outliner 很有价值的一点，是让记录可以先发生，再逐步获得结构。代价也在这里：一个新成员需要辨别模板默认值、引用和查询结果各自的行为。厂商的拆分公告谈到了这类学习负担，但本次没有独立数据能回答，一个团队到底要学多久。[拆分公告](https://outliner.tana.inc/blog/the-next-chapter-for-tana)

## 新 Tana 从会议进入，同样需要可处理的对象

新 Tana 的官网把会议旁边的工作项和邮件草稿放在首屏。10 月 8 日更新日志还描述了会中待处理动作的集合，以及会后优先显示摘要和剩余事项的安排。它在界面上把关注点移向了谈话正在产生的工作。[Tana 首页](https://tana.inc/)、[2026-10-08 更新记录](https://tana.inc/changelog)

![新 Tana 官网首屏：视频会议旁有已发送的 Linear 工作项、待发送的邮件草稿与建议操作](/images/product-docs/2026/tana-home.png)

*新 Tana 官网公开演示，2026-10-23 获取。工作项上的 Sent 和邮件旁的 Send 分别表达结果与待执行动作，阅读时要分清这两种状态。这是厂商演示，不是本文的操作结果。来源：[Tana 官网](https://tana.inc/)。*

新版仍然保留结构。Types 给文档共同字段，可以设置工作流，也能附上 AI instructions 和 skills。类型既能手动建，也可以用自然语言请求 AI 建立。它提供了另一种建模入口，不能据此认定 Types 和 Outliner Supertags 能直接互换。[Types](https://tana.inc/learn/features/types)

青苔项目若沿着这个入口继续，我会先让系统提出一条“补上提交去重”的任务草稿，再检查它的类型与字段。把会议里的“需要有人看看”直接变成正式指派，会凭空增加承诺。即使负责人在谈话中出现，也应保留原句，供人检查那是在提议、讨论，还是已经接受了工作。

AI 降低输入结构的门槛之后，审阅界面需要承担更多解释工作。一个类型名称正确、字段齐全的对象，依然可能误解会议。开发者可以观察人们怎样修正草稿：如果每次都要重读整段转录，模型省下的输入时间，就可能在核对时重新花掉。这里没有现成的效率数字，需要用任务测试取得证据。

## 从草稿到改动，中间必须说清发生了什么

新版文档把 AI 发起的内容改动称为 proposal，把对外写入称为 action。但存在自动批准例外：会中的定期摘要、截图选择，以及部分后台新建文档可自动批准；该页要求更新、删除和空间变更取得批准。版本历史目前只读，不能直接回滚。[Proposals and actions](https://tana.inc/learn/features/proposals)

这个边界值得读完整。把所有内容都叫“建议”，用户可能以为它尚未生效；把所有结果都叫“已处理”，又可能掩盖等待确认的部分。我会先在自己的产品里逐项写下哪些自动保存，哪些等待确认，再让文案对应真实状态。自动保存的会议摘要和正式修改任务负责人，可以采用不同规则。

外部 action 获批准后，原卡片还会报告执行结果，包括部分完成、等待用户或失败。发送邮件也先走 action 批准。[Proposals and actions](https://tana.inc/learn/features/proposals)

放回青苔项目，接受“创建外部工作项”的 action，只说明有人同意了这次操作。后续可能遇到目标项目不存在，或者外部服务暂时没有返回明确结果。产品必须让人继续找到这次动作，知道下一步该做什么。

我的首版方案会把提案版本和实际执行分开记录。成员甲确认的是哪一版内容，任务状态是否已经被别人改过，外部系统究竟返回了什么，都需要留下对应关系。批准后内容若有变化，就重新展示差异；结果不确定时先核查外部记录，再决定是否重试。这些是建议的提交协议，公开资料没有证明 Tana 使用了相同实现。

## 空间决定谁能看见，连接决定能做什么

新 Tana 的 Spaces 同时组织内容与上下文。访问按 organization、space、document 继承，新建空间默认仅自己可见，文档还可进一步收紧访问。空间也能配置自己的类型和 AI instructions。[Spaces and sharing](https://tana.inc/learn/features/spaces)

这让会议产出多了一层需要核对的去向。任务本身没错，放进错误空间仍可能让不该看到的人看到。我的审阅卡会把目标位置与读者范围放在任务内容旁。若这次操作改变了访问范围，单独显示变化。不能指望使用者在接受之后，才去导航栏里发现它属于哪里。

上下文也不能从旧产品的名词直接外推。Outliner 的 AI Chat 要通过引用等方式显式加入笔记，文档明确说明不能直接和整个 graph 对话。[AI Chat](https://outliner.tana.inc/learn/features/ai-chat)

新版 Agents 的公开定义则包含提示词、能力和可选日程，可以通过聊天或语音使用，也能定时运行。这个定义说明了配置入口，还不能回答长任务是否可靠、重试怎样避免重复副作用。[Agents](https://tana.inc/learn/features/agents)

接口要继续分产品看。Outliner 的本地 MCP 免费，但需要桌面应用运行；托管 MCP 当前为付费 beta。官方还提供新版经 MCP 访问 Outliner 的路径，并建议传递原节点标识，便于精确读写。[API and MCP](https://outliner.tana.inc/learn/features/local-api-mcp)

新版也有独立的 MCP 服务，写入默认生成待审核的 proposal。用户明确选择跳过审核时，支持该参数的工具可传入 `autoApprove: true`，同轮应用提案。普通修改请求不算跳过审核，部分工具也不支持此参数。这里要区分用户已授权的直接应用和每次打开界面复核。[MCP：How writes work](https://tana.inc/learn/features/mcp)

连接能让工具访问对象，却没有自动解决两边对象的对应关系。青苔项目的一条任务如果同时出现在两款产品中，我仍会保存来源节点与目标对象的标识，约定哪边拥有哪个字段。没有这份约定，标题变了以后就可能找不到原对象，或者重复创建同一项工作。公开文档证明了桥接路径，尚未证明两款产品共享数据库或具备无损自动同步。

## 做首版时，我会先保住这条任务的来路

如果把这些观察带回自己的产品，我会先实现一条很窄的路径：一次会议记录产生一条候选任务，经过确认，进入同一产品的任务列表。输入先用文本，外部集成晚一些再接。以下数据关系是建议方案，不代表 Tana 的实际后端。

| 需要保存什么 | 在青苔项目里表示什么 | 首版怎样验收 |
|---|---|---|
| 任务的稳定标识 | 这条“补上提交去重” | 改名后，会议链接仍能找到同一对象 |
| 来源与证据位置 | 哪次会议的哪段文字 | 打开任务能回到依据，不靠标题猜测 |
| 类型与字段值 | Task、项目和负责人 | 缺负责人可留草稿，进入执行前明确提示 |
| 目标空间和访问范围 | 任务交给谁看 | 无权用户不能经查询或关联入口读到正文 |
| 提案版本与批准记录 | 人确认过哪一版 | 预览后再改内容，旧批准不能覆盖新版本 |
| 执行记录与外部标识 | 工作项是否创建成功 | 重试前能核对既有结果，避免重复创建 |

数据库选型可以随后讨论。这些关系用常规存储也能先表达清楚。是否需要图数据库，要看真实查询与规模，而本次公开资料没有披露可据以照搬的服务端方案。

顺序上，我会先证明身份与引用没有混淆，再加入结构化查询。AI 从文本提取候选任务后，先做可编辑预览，最后才开放一个外部写入目标。每增加一段，都保留上一步的人工入口。这样即使提取失败，人也能继续把任务补完，排查时还知道问题出在哪一段。

验收还要安排不顺利的情况。两个人同时改负责人，旧提案被再次打开，批准按钮点了两次，外部创建成功却没收到回执，都比成功演示更能检验产品。测试时应分别记录是否出现重复对象、是否丢失变更，以及用户能否从界面理解现状。这里给的是测试方法，本次没有这些场景的 Tana 实测结果。

## 长期使用，还要能离线和离开

对象越能互相引用，退出时越要核对带走了什么。Outliner 可以导出 Markdown 和 JSON。JSON 中的 Tana Intermediate Format 2.1 可以导入新工作区，完整 Tana JSON 则不能通过同一导入器回灌。[Copy-paste and export](https://outliner.tana.inc/learn/features/copy-paste-and-export)

工作区文档另说明，Markdown 导出保留媒体下载链接，不包含图像和视频文件本身。[Workspaces：Export workspace](https://outliner.tana.inc/learn/features/workspaces#export-workspace)

导入也有损耗。Notion 原生导入不保留数据库关系、自定义视图和工作区自动化。[Import data into Tana Outliner](https://outliner.tana.inc/learn/features/import-data-into-tana)

如果青苔项目要迁移，我会把一个小样本先搬一遍，检查任务文本、字段和来源关系，再单独核对媒体。最后尝试在新环境继续处理这条任务。文件能打开，只完成了阅读层面的验收，原来的工作方式是否还能运行需要另外检查。新版 Tana 定价页虽承诺可以导出到其他系统，本次没有取得同等具体的组织级导出与恢复证据，不能套用 Outliner 的说明。[Tana 数据说明](https://tana.inc/pricing)

离线也有范围。Outliner 完整离线模式可编辑个人工作区，共享工作区只读。AI 和第三方集成等功能需要联网。短暂断线时继续改共享内容，恢复同步还可能覆盖其他编辑。[Tana Outliner for desktop](https://outliner.tana.inc/learn/features/tana-for-desktop)

这会影响团队的使用承诺。一个人在路上能改自己的记录，和整个团队断网后仍能安全协作，需要分别验证。我会让离线状态直接影响可用操作和提示，不等同步回来才解释冲突。

试用成本同样要按产品计算。当前两边均有免费档。新版免费档列每月主持 5 场会议、50 次 AI queries，Outliner 免费档列 500 AI credits。额度单位不同，不能直接横比。正式选型前还应在实际结算周期下核对需要的接口与套餐。[Tana 定价](https://tana.inc/pricing)、[Outliner 定价](https://outliner.tana.inc/pricing)

## 先让一个人把一件事处理完

我从 Tana 得到的设计启发，是让信息在后续工作里保有身份与来路。Outliner 把这件事落实到可复用节点和查询；新版把会议产出的草稿与执行放到更靠近谈话的位置。两种入口都要面对同一个验收问题：这条任务现在在哪里，谁能看，什么已经生效，什么还等人决定？

做自己的首版，我会先用青苔项目这样的小例子，把从记录到确认的过程走完。让一个没参与设计的人处理“补上提交去重”，看他能否找到原话，修正负责人，并判断操作是否成功。这个过程顺了，再谈更多类型、更大知识库和自动执行，才有可以继续验证的基础。

## 参考资料

以下均为官方公开资料，核对日期为 2026-10-23。功能记载与本文建议应分别阅读。

- [Tana 首页](https://tana.inc/)
- [Tana Outliner 首页](https://outliner.tana.inc/)
- [The next chapter for Tana，2026-03-31](https://outliner.tana.inc/blog/the-next-chapter-for-tana)
- [Tana Changelog](https://tana.inc/changelog)
- [Tana Outliner Changelog](https://outliner.tana.inc/changelog)
- [Nodes and references](https://outliner.tana.inc/learn/features/nodes-and-references)
- [Copy-paste and export](https://outliner.tana.inc/learn/features/copy-paste-and-export)
- [Supertags](https://outliner.tana.inc/learn/features/supertags)
- [Fields](https://outliner.tana.inc/learn/features/fields)
- [Search nodes](https://outliner.tana.inc/learn/features/search-nodes)
- [Views](https://outliner.tana.inc/learn/features/views)
- [Types](https://tana.inc/learn/features/types)
- [Proposals and actions](https://tana.inc/learn/features/proposals)
- [Spaces and sharing](https://tana.inc/learn/features/spaces)
- [AI Chat](https://outliner.tana.inc/learn/features/ai-chat)
- [Agents](https://tana.inc/learn/features/agents)
- [API and MCP](https://outliner.tana.inc/learn/features/local-api-mcp)
- [MCP](https://tana.inc/learn/features/mcp)
- [Workspaces — Export workspace](https://outliner.tana.inc/learn/features/workspaces#export-workspace)
- [Import data into Tana Outliner from other tools](https://outliner.tana.inc/learn/features/import-data-into-tana)
- [Tana Outliner for desktop](https://outliner.tana.inc/learn/features/tana-for-desktop)
- [Tana Pricing](https://tana.inc/pricing)
- [Tana Outliner Pricing](https://outliner.tana.inc/pricing)
