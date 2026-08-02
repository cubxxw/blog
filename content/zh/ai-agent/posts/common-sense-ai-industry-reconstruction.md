---
title: '常识不是本质：AI 时代如何从需求、约束与稀缺性重构行业'
date: 2026-08-01T23:00:47+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Product Strategy
  - Harness Engineering
  - Automation
  - Career
description: >
  这篇文章从常识是不是本质出发，区分常识、共识、本质与第一性原理，再用奈飞从 DVD 到流媒体的迁移检验一套行业分析工序：先找稳定需求，画出供需与利益结构，识别 AI 让哪些旧约束消失、稀缺性如何迁移，最后用招聘案例完整说明怎样把新方案写成可解释、可验收、能由生产失败持续校准的 Agent 工作流全貌。
tldr:
  - 常识是从反复经验中压缩出的稳定判断，可以带我们接近机制，却不能替代机制、边界、反例与证伪。
  - 分析行业应先分开用户、商业、技术三种需求，再画需求端与供给端；AI 让旧成本下降之后，真实上下文、质量标准、行动权限、信任和责任通常会成为新稀缺性。
  - 奈飞长期守住的是方便地获得满意娱乐这类上位需求，DVD、流媒体、原创内容、广告和游戏都是阶段性答案；Qwikster 则证明方向判断无法豁免当下的用户摩擦。
  - Agent 化应沿着手工获得真相、AI 辅助、工作流固化、Agent 自主化推进，并用领域 grader、小额真实下注和生产失败回流持续校准。
cover:
  image: /images/covers/ai-agent/2026/common-sense-ai-industry-reconstruction.jpeg
  alt: '固定需求轴与被重新连接的行业工作流卡片'
---

“常识就是本质吗？”我最近连续拿几个行业做推演时，最先卡在了这个问题上。看完 22 家前沿 AI 团队、70 余位公开人物的作品链后，我反复遇到几种动作：围绕一个长期命题积累，先写清怎样才算合格，让论文、代码和产品连续留下作品，再把生产失败送回下一轮。可这些动作仍没有回答：面对传统行业，我从哪里开始判断，才能避免拿着新技术寻找伪需求？

后来我又追问，常识与认知、第一性原理、需求确定和行业重构怎样连接？我放弃了把几个词揉成一个“正确起点”的想法。现在的临时答案是：常识可以带我接近机制，不能直接充当机制；分析 AI 会怎样重构行业，应先提出一个较稳定的用户任务，再看供需结构、旧约束和稀缺性怎样迁移。

这组观察来自官方主页、论文、代码、工程文章、产品和公开访谈的综合，不代表公司内部人员的统一自述。下文会把它编译成一套行业分析工序，用奈飞检验需求不变量与阶段性解法怎样分开，再让招聘从头跑一遍。我还没有凭这套方法在某个传统行业做成一门生意；它目前是一张经过公开案例碰撞、仍要靠现实下注校准的地图。

## 常识可以打开问题，但不能替我们结束推导

这次追问的第一个修正，是把常识、本质和第一性原理拆开。它们都像是“继续往下挖”之后留下的东西，作用却不在同一层。

| 概念 | 它回答什么 | 容易犯的错 | 可靠性从哪里来 |
|---|---|---|---|
| 共识 | 大家现在怎样理解或行动 | 把多数人的习惯当成事实 | 参与者、激励与形成过程 |
| 常识 | 事情通常会怎样 | 忽略适用条件 | 反复经验、机制与反例 |
| 本质 | 现象为什么这样发生 | 用一个漂亮词替代因果链 | 可检验的因果机制 |
| 第一性原理 | 当前系统靠哪些不能再由内部推导的前提成立 | 分析者任意挑选公理 | 明确系统边界与可证伪前提 |

比如，“超额利润会吸引竞争者”是一条常识。继续往下拆，机制是利润信号改变资源配置，新增供给再改变价格和竞争。可它遇到牌照、网络效应、排他资源、切换成本或监管时，利润可能保留很久。去掉这些边界，常识就会退化成口号。

第一性原理也不天然更可靠。形式推导可以完全正确，起点却可能是分析者偏爱的前提；系统边界一换，所谓“不可再推导”也会跟着变化。第一性原理的价值在于逼我公开前提，而非授予结论免检权。

复杂系统还会让朴素常识失效。Donella Meadows 在系统干预的论述中反复强调，反馈强度、信息流和相对于系统变化速度的延迟会造成振荡、过冲甚至崩溃；她也提醒我们，自组织、非线性反馈系统只能在大体上理解，很难被精确预测和控制。[这组系统约束](https://donellameadows.org/archives/leverage-points-places-to-intervene-in-a-system/)说明，线性的“做 A 就得到 B”至多是一张局部地图。

所以我现在会给每条“常识”加四个护栏：背后的机制是什么，在哪些条件下成立，哪个反例最有力，看到什么结果就承认它错了。常识通过这四关，才适合成为行业分析的起点。

## 行业分析要先分开三种需求，再画出供需两端

一项 AI 能力值得做成产品，需要同时通过用户、商业、技术三层检验。把三者混在一起，最容易出现的错觉是“模型已经能做，所以市场一定需要”。

- **用户需求**：谁想完成什么任务，今天为此承担多少金钱、时间、风险和不确定性？
- **商业需求**：谁愿意付钱，价值怎样交付，利润怎样保留，错误成本由谁承担？
- **技术需求**：为了满足前两层，信息、判断、执行和验证各需要什么能力？

下文沿用 grader 这个词，指一套能够实际执行的验收标准：什么算合格，什么必须拦下，失败后怎样回到下一轮。

在我现在采用的产品论证顺序里，技术需求默认从前两层导出。同样的图像识别能力，放在娱乐滤镜、工业质检和医学诊断里，所需数据、容错率、责任结构与购买者完全不同。能力相同，产品并不相同。这个顺序并未否认技术会创造新行为；一旦新能力改变了用户愿意做什么、付出什么，需求图也要回头重画。

需求端之外还要画供给端。需求端问谁想完成什么、现有替代方案为何仍不满意；供给端则追踪谁拥有内容、商品、数据、渠道、信任、履约能力、标准和决策权。许多看似低效的中间环节，承担着验证、担保、垫资、合规或争议处理。只看界面上的步骤，很容易把风险承接者误删成“信息中介”。

还要把使用者、付费者和受影响者分开。同一个招聘筛选工具由企业购买、招聘者操作，候选人却承受漏筛结果；同一个医疗辅助工具可能由医院采购、医生使用，患者承担误判后果。三者没有对齐时，使用次数和付费意愿都不足以证明用户价值，grader 也不能只测购买者喜欢的指标。

我把整套工序压成下面这张图：

```text
用户任务与实际代价
        ↓
商业价值与利益分配
        ↓
当前供需、信息、风险与权力结构
        ↓
哪些约束来自旧技术，哪些仍然存在
        ↓
AI 让什么变便宜，稀缺性与权力迁到哪里
        ↓
重构角色、工作流和责任边界
        ↓
grader → 小额真实下注 → 生产失败回流
```

这张图没有承诺“需求永远不变”。技术会创造新行为、新期望和新规范，智能手机上的短视频就是明显例子。相对稳定的往往是更高层任务，例如获得娱乐、降低交易不确定性、找到合适合作对象；具体偏好与实现方式仍会变化。所谓稳定需求，应当被当作待检验的尺度，而非永恒真理。

## 奈飞守住了娱乐需求，也不断改写自己的答案

奈飞适合检验这套工序，因为它的产品形态一再变化，上位需求却保持了可辨认的连续性。公司 2023 年寄出最后一张 DVD 时回顾，第一张 DVD 在 1998 年寄出，这项业务给会员带来了更多选择、更多控制和按自己节奏观看，也为后来的流媒体打下基础。[奈飞对 DVD 时代的官方回顾](https://about.netflix.com/en/news/thanks-for-watching)所描述的价值，比“邮寄光盘公司”更接近用户实际购买的东西。

从用户需求看，人们想更方便地获得满意娱乐，同时减少等待、播出时间限制和找内容的成本。1999 年推出的订阅计划取消了到期日和逾期费，会员在线选片，再用预付邮封寄回；[当年的官方公告](https://about.netflix.com/en/news/netflix-com-transforms-dvd-business-eliminating-late-fees-and-due-dates-from)记录了这套体验。流媒体又移除了物流等待。内容多到单靠目录难以选择后，推荐系统承担的商业任务是把内容供给变成一次更可能满意的观看。奈飞 2025 年的推荐基础模型工程文讨论了长期交互历史、冷启动、展示偏差、下游任务与评测，目标始终落在提升推荐质量和适应会员偏好上；模型架构只是完成这项任务的一种手段。[这篇工程说明](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39)也写到，扩大模型和数据仍需要稳健评测。

从商业与供给端看，娱乐内容投入巨大，授权有期限，优质内容又是竞争对象。奈飞最新 [2025 年 10-K](https://www.sec.gov/Archives/edgar/data/1065280/000106528026000034/nflx-20251231.htm)把收入主要归于会员费，同时把线性电视、其他流媒体、游戏、开放内容平台和社交媒体都列入对消费者闲暇时间的竞争；公司还要与其他内容服务商争夺授权内容与原创项目。于是原创与排他内容、全球分发、不同价格层和广告业务，都可以理解为对内容控制、获客、留存与利润约束的阶段性回答。

从这个案例里，我愿意暂时保留一条判断原则：持续检查需求与约束，少把公司过去的产品答案当成身份。DVD、流媒体、原创内容、广告、直播和游戏没有天然的高下之分。它们只在某一组技术成本、内容权利、竞争结构和用户习惯下有效。

组织机制也要放回约束里理解。奈飞的 2024 版文化备忘录把 “Context, not Control” 放在高绩效团队、信息透明、责任人制度和复盘之中；管理者仍需教练式参与，在伦理风险、重大损害、危机或新人缺乏上下文时介入。[文化备忘录原文](https://jobs.netflix.com/culture)还要求重大决定由 informed captain 承担结果，并主动征求异议。抽走人才密度、上下文、责任和复盘，只复制“少规则”，得到的很可能是无人负责。

Qwikster 是这段分析里重要的冷水。2011 年，奈飞准备把 DVD 业务改名为 Qwikster，让同时使用 DVD 与流媒体的会员面对不同网站和账户。三周后方案撤回，奈飞承认用户看重原有服务的简洁。[2011 年 10 月的同期报道](https://www.foxbusiness.com/features/netflix-aborts-plan-to-separate-dvd-streaming-services)同时记录了原方案、用户摩擦和撤回时间。无论拆分在内部成本结构上多么合理，它都不能抵消当下方案制造的用户摩擦。

奈飞案例仍有幸存者偏差。“争夺闲暇时间”可能是成功之后形成的宽泛解释，文化机制也无法单独证明公司为何成功。我把它当作需求与解法分离的可观察案例，不把故事类比当成因果证明。

## AI 进入传统行业时，最先变化的是瓶颈位置

AI 重构行业的关键问题是成本下降后什么变贵了。就本文讨论的内容、代码、搜索和初步分析案例而言，我观察到生成与执行成本在下降；价值未必一起消失，它可能迁向三类东西：可核验的上下文和证据，进入真实系统的权限与分发，以及定义质量并承担结果的人。

具体分析时，我会连续问四个问题：

1. 哪一步曾因信息昂贵而需要中介？
2. 哪一步曾因判断昂贵而需要专家？
3. 哪一步曾因执行昂贵而需要岗位接力？
4. 这些成本下降后，数据、权限、履约、分发、信任或验收标准，哪一个成为新瓶颈？

前沿 AI 公司的公开工程材料给了我一个共同提示：模型能力进入环境、工具、评测和反馈后，才可能成为可用能力。这些公司自述不能证明某种工作流造成了商业成功，但显示它们已经把判断机制化为生产动作。

第一步是把环境与上下文变得可读。OpenAI 的 [Harness Engineering 复盘](https://openai.com/index/harness-engineering/)写到，在这项内部实验中，Agent 执行吞吐提高后，工程师把更多时间放在设计环境、表达意图、提高仓库可读性和建立反馈回路上；架构边界、文档与测试成为可机械执行的约束。

接着要让离线判断和真实使用互相校准。Cursor 同时使用 CursorBench 离线评测与在线实验，还跟踪代码 Keep Rate、工具错误分类和生产异常。[Cursor 的 harness 迭代说明](https://cursor.com/blog/continually-improving-agent-harness)把离线分数当作可比较信号，再用真实错误寻找 harness 的失效位置。

生产失败还要能变成下一轮测试。Sierra 让领域专家标注真实对话，把问题转成仿真与回归测试；平台升级时运行客户级测试集。[Agent Development Life Cycle](https://sierra.ai/blog/agent-development-life-cycle)给出了失败回流的具体工序。到了法律这类高风险领域，grader 还必须来自领域工作：Harvey 的 [BigLaw Bench](https://www.harvey.ai/blog/introducing-biglaw-bench)由有执业经验的研究团队按真实法律任务设计，rubric 同时计算内容要求、错误惩罚和来源可核验性。

这些案例共同支持一条更克制的推论：当生成成本持续下降，拥有问题上下文、定义质量、取得行动权限并承担结果的能力可能更稀缺。它仍需在每个行业单独验证，不能写成普遍定律。

“更稀缺”也不等于“更赚钱”。稀缺能力能否保留利润，还取决于客户是否愿意付费、供应方能否复制、平台是否掌握分发，以及责任成本会不会吞掉收入。这正是商业需求必须单独画出的原因。

我目前只敢按这个次序扩大 Agent 的自主范围：

> 手工获得真相 → AI 辅助 → 工作流固化 → Agent 自主化

我先用手工过一遍任务，找出例外、隐性协作和真实错误成本；AI 辅助阶段用来检验哪些判断能够表达；工作流阶段再固定输入、权限、验收和恢复，最后才扩大自主范围。对可撤销、低风险、已有明确验收的任务，这个过程可以加速；面对高风险、隐性规则密集或错误很晚才暴露的任务，跳过前几步更容易放大对行业的误解。关于 grader、权限和回滚怎样构成生产信任，我在[《如何建立对无人值守 AI Agent 的真实信任》](/zh/ai-agent/posts/trusting-unattended-ai-agent/)里做过更完整的工程拆解。

## 招聘把需求、证据和责任重新接成了一条链

招聘能把前面的框架从头走一遍，因为 AI 已经同时降低了求职与筛选两侧的生成成本。在本文采用的上位任务模型里，我先把企业侧近似写成“寻找未来产出并降低用人风险”，把候选人侧写成“获得合适的工作、报酬、成长和可信承诺”。这只是分析起点，简历与职位描述则是当前系统里的信息容器。

商业层并不只有企业和候选人。平台降低搜索成本，猎头组织筛选与成交，内推者转移自己有限的一手信誉；误聘成本则由候选人、团队、经理和公司共同承担。入职后的产出还受管理、协作和资源影响，所以“quality of hire”不能全归因于候选人，更不能只归功于招聘工具。

AI 让简历润色、职位描述生成、关键词匹配和批量申请变便宜后，自我陈述的区分度可能下降。Greenhouse 的 [2025 招聘报告](https://www.greenhouse.com/blog/greenhouse-2025-workforce-hiring-report)来自美国、英国和爱尔兰 2,200 名活跃求职者，记录了自动申请、AI 生成虚假作品样本和候选人难以脱颖而出；LinkedIn 的 [2025 Future of Recruiting](https://business.linkedin.com/hire/resources/future-of-recruiting)结合平台数据与 1,000 多名招聘从业者调查，把 quality of hire 和 skills-based hiring 列为重点。两份材料都来自招聘平台，只能说明这些平台及受访者正在强调更接近结果的信号，不能独立证明技能自述已经失效或新的评价方式更公平。

我更愿意把下一步称为 evidence-first：岗位从技能愿望清单改写成任务、约束、决策权和 grader；候选人的事实层保存项目、角色与可核验结果，能力层只保留有边界的推断，简历则成为针对岗位编译的视图。这个方向不会让简历立即消失。制度惯性、低成本初筛和求职者的表达需求，都会让它长期存在。

内推也需要改写。它的有效价值是转移信誉和一手工作证据，推荐人应说清自己观察过什么、没观察过什么；“认识这个人”无法自动推出“适合这个岗位”。匹配系统也不该只报一个假精确百分比。更有用的输出会指出证据来自哪里、哪项岗位约束还没验证，以及下一步应安排什么任务或对话补证。

```text
人的证据图 × 岗位任务图 × 信任关系图
                  ↓
            可解释的匹配建议
                  ↓
        工作样本 / 面试 / 人类裁决
                  ↓
          30 / 90 / 180 天结果回流
```

工作样本也有代价。它可能偏向有时间、设备和公开作品的人，还可能演变成无偿劳动与新的作弊竞赛。更合理的设计应限制耗时、提供等价机会、只评岗位相关任务，并允许候选人说明上下文。grader 负责让标准可见，不能把人的复杂性压成一个分数。

招聘是高风险决策，自动化边界应写进工作流。欧盟 [AI Act 原文](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32024R1689)在 Annex III 列出了用于招聘、筛选和影响劳动关系的多类高风险用例；具体系统仍需按 Article 6 判断，包括其中的非高风险例外。适用时间刚刚发生变化：2026 年 7 月 27 日生效的 [Regulation (EU) 2026/1744](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202601744)把 Article 6(2) 与 Annex III 系统的 Chapter III Sections 1–3 义务（Article 6(5) 除外）推迟到 2027 年 12 月 2 日。Annex III 的用例清单没有因此取消，但“进入高风险分类”和“对应义务已经开始适用”必须分开表述。纽约市的 [AEDT 规则页面](https://home4.nyc.gov/site/dca/about/automated-employment-decision-tools.page)仍要求适用工具接受年度偏差审计、公开相关信息并提前通知候选人；美国 EEOC 的 [AI 与就业说明](https://www.eeoc.gov/sites/default/files/2024-04/20240429_Employment%20Discrimination%20and%20AI%20for%20Workers.pdf)也提醒，自动化选择程序仍受反歧视与合理便利要求约束。

因此，Agent 可以维护上下文、搜索和组织证据，也可以提醒下一步验证。岗位定义、公平监督、关系处理、申诉和最终用人决定仍要由有权承担后果的人完成。[《给 AI 任务，不只给方向》](/zh/ai-agent/posts/give-ai-tasks-not-directions/)讨论过同一条责任边界：可以让 Agent 执行清晰任务，价值取舍与完成态仍需人确认。

## 一套好框架必须主动寻找让自己失败的证据

走到这里，最危险的做法是把这套工序包装成万能答案。我会用几种失败信号持续反驳它。

如果某个环节只能用“行业一直如此”解释，我会沿着资金、风险和决策权继续追。只要发现它主要保护既有位置，而非用户任务，这条前提就要从需求图里删掉；此时所谓常识只是共识。

另一种失败信号，是两种同样合理的系统边界推出相反方案。我如果说不清为什么选择其中一条，就不会因为形式推导漂亮而下注。这里暴露的不是推导能力不足，而是第一性原理本身由分析者任意挑选。

小试验若出现明显延迟、反向效果，或参与者开始针对规则改变策略，我会把这些反馈重新画进系统。用“执行不到位”解释所有反例，只是在保护一条已经失效的线性判断。

案例对照也可能让框架失败。奈飞和几家 AI 公司的故事至多说明某种机制存在；相似动作若在可比较案例中没有复现结果，我就会撤回“它促成了成功”的说法，而不是让幸存者替失败样本消失。

更根本的反方是供给会创造需求。技术出现后，人会形成过去没有的习惯与期望。“稳定需求”的抽象层级至少要通过两个判据：它能解释不止一种阶段性解法，又不能高到把任何新行为都收进去。例如，若参与式内容的留存和付费主要由身份表达、共同创作驱动，而“满意观看”已解释不了变化，我就必须重画需求图，不能把一切继续归入娱乐。

## 我用七个问题决定是否值得重构一个行业

我最初问“常识是不是本质”，现在更有用的问题是：这条常识背后的机制是什么，它在哪失效，我愿意拿什么现实结果检验？

下一次面对“AI 可以重构某行业”的判断，我会先写下这七个问题：

1. 用户真正要完成什么，而非当前正在购买哪种产品？
2. 谁在为问题支付金钱、时间、风险或不确定性？
3. 当前结构里，哪些是硬约束，哪些只是历史惯例？
4. AI 让什么变便宜以后，新的瓶颈和权力迁到哪里？
5. 新方案怎样进入完整工作流，并在失败后恢复？
6. 谁定义“做得好”，grader 具体检查什么？
7. 哪个现实结果会让我承认这套重构不成立？

如果这七个问题只能得到功能列表、宏大趋势和无法证伪的愿景，我不会急着造 Agent。我会回到现场，先手工过一遍任务，找出真正的代价、例外和责任人。

这套框架目前没有偿还的欠账，仍是一个传统行业里的真实结果。我还需要拿它完成一次小额、可撤销的下注，观察谁愿意付出什么、哪个 grader 真能预测结果、失败会从哪里回来。在那之前，它能帮我公开前提和未知项，还不能替我宣布行业终局。

## 常见问题

### 常识和第一性原理有什么区别？

常识是反复经验压缩出的高稳定度判断，描述事情通常怎样发生；第一性原理是在明确系统边界内支撑推导的基石前提。两者都不能免检：常识要说明机制与反例，第一性原理要公开边界与证伪条件。

### 怎样判断一个 AI 行业方案是不是伪需求？

先看它能否说清用户任务、付费者、风险承担者和现有替代方案，再检查 AI 降低了哪种成本、新瓶颈是什么。若答案只有模型功能，或无法写出 grader 与会推翻方案的现实结果，需求仍未得到验证。

### 奈飞案例怎样说明需求与解法应该分开？

DVD、流媒体和原创内容是不同约束下的阶段性解法，更方便地获得满意娱乐则是本文用来解释迁移的上位任务。这个框架不证明奈飞成功的单一原因；Qwikster 还显示，长期方向判断无法替当下用户方案免责。

### 为什么招聘 Agent 不能全自动决定录用？

招聘会影响人的机会，证据又受资源、网络和历史偏差影响。Agent 可以组织材料和提出验证建议，岗位定义、公平监督、申诉处理与最终决定仍需由有权承担后果的人完成。

## 参考资料

- [Leverage Points: Places to Intervene in a System](https://donellameadows.org/archives/leverage-points-places-to-intervene-in-a-system/) — Donella Meadows Project
- [Netflix.com Transforms DVD Business, Eliminating Late Fees and Due Dates](https://about.netflix.com/en/news/netflix-com-transforms-dvd-business-eliminating-late-fees-and-due-dates-from) — Netflix
- [Thanks for Watching](https://about.netflix.com/en/news/thanks-for-watching) — Netflix
- [Netflix 2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1065280/000106528026000034/nflx-20251231.htm) — U.S. Securities and Exchange Commission
- [Netflix Culture Memo](https://jobs.netflix.com/culture) — Netflix
- [Foundation Model for Personalized Recommendation](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39) — Netflix TechBlog
- [Netflix Aborts Plan to Separate DVD, Streaming Services](https://www.foxbusiness.com/features/netflix-aborts-plan-to-separate-dvd-streaming-services) — Fox Business
- [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/) — OpenAI
- [Continually Improving the Agent Harness](https://cursor.com/blog/continually-improving-agent-harness) — Cursor
- [The Agent Development Life Cycle](https://sierra.ai/blog/agent-development-life-cycle) — Sierra
- [Introducing BigLaw Bench](https://www.harvey.ai/blog/introducing-biglaw-bench) — Harvey
- [Greenhouse 2025 Workforce & Hiring Report](https://www.greenhouse.com/blog/greenhouse-2025-workforce-hiring-report) — Greenhouse
- [The Future of Recruiting 2025](https://business.linkedin.com/hire/resources/future-of-recruiting) — LinkedIn
- [Regulation (EU) 2024/1689: Artificial Intelligence Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32024R1689) — EUR-Lex
- [Regulation (EU) 2026/1744](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202601744) — EUR-Lex
- [Automated Employment Decision Tools](https://home4.nyc.gov/site/dca/about/automated-employment-decision-tools.page) — New York City Department of Consumer and Worker Protection
- [Employment Discrimination and AI for Workers](https://www.eeoc.gov/sites/default/files/2024-04/20240429_Employment%20Discrimination%20and%20AI%20for%20Workers.pdf) — U.S. Equal Employment Opportunity Commission
