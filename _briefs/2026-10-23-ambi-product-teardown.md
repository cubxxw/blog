---
schema: blog-brief/v1
id: 2026-10-23-ambi-product-teardown
title: Ambi 产品拆解：记住一件事之后，怎样把它做完
status: published
priority: normal
language: zh-en
section: ai-agent
brief_type: research
dispatched_at: 2026-10-23T00:25:00+08:00
source_refs:
  - brain://research/learning/ambi-product-architecture/index.md
---

# 选题契约

## 唯一命题

以 Mistlabs 的 Ambi 为例，解释持续记忆、主动聆听和任务执行怎样进入一个产品。让正在做个人 Agent 的读者分清数据从哪里来、记忆如何使用、工作如何继续，以及哪些可靠性还需要实际验收。

## 为什么值得由我写

“记得住”与“交付得出”之间有具体的产品与工程问题。本文把公开能力和隐私规则放到同一条工作线上，保留未知，并提供一个自己的最小实现方案。没有批准公开的个人实测，本篇不写作者亲测成功或失败。

## 目标读者与阅读场景

读者已经能做聊天入口，准备加入长期记忆、后台工作或定时任务。读完能定义来源、用户更正和任务产物，设计可撤销的数据入口，并知道首版必须用什么结果来验收。

## 编辑选择

- 文章轨道：research；这一篇聚焦来源、记忆与执行的衔接。
- 已选形态：深度产品拆解，沿具体任务解释界面、信任与实现代价，约 5000–8000 中文字，按证据自然展开。
- 核心张力：保留更多上下文有助于继续工作，也增加授权、更正和删除的责任。
- 这次主动不讲：未经证实的云端框架、模型路由、数据库选型、工具完整能力和可靠性结论。

## 已批准素材包

### 事实与项目证据

产品身份为 Mistlabs 的 https://www.ambi.ai/en ，公开研究入口为 /en/features、/en/trust、/en/privacy 与 /en/terms。必须核对当前政策日期；Listening 与 Recording 的处理规则分别引用，不混为持续录音。官网供应商声明不能用来反推后端框架。

### 作者原话与在场片段

本人要求：“写三篇产品文档，分别是 tana ， doneas 以及 ambi，整个链路，一直到发布，带中英文，图片，去AI味”，并选择“三篇深度产品拆解文章”。这授权本文定稿、完整英文、配图、提交、发布及线上验收。

### 作者观察

没有额外获准公开的个人判断。本文用可复核资料和明确标明的设计分析解释产品，不伪造第一人称经历，不把候选工程方案写成已确认方法。

### 待验证推论

可以提出来源与记忆分离、任务需求版本、暂停恢复、定时触发与交付回执等建议，直说是自己的实现路线，不是 Ambi 后端事实。示例只用合成内容，不读取本机应用与私人工作区。

## 参考方向

首先帮助读者理解一件工作怎样从输入走到可验收结果，再解释所需的授权、记忆更正和状态恢复。信任问题放在相关动作旁边。每个外部事实相邻引用，文末列出实际使用的来源。

## 证据与隐私边界

- 可以公开：本任务要求、本次公开核读资料、无账户内容的官网截图、明确标为建议的原创示意。
- 必须匿名：合成示例不冒充真人资料；官方演示截图注明出处。
- 禁止使用：brain 私有实测与原文、聊天记录、连接账户、音频、令牌、私人应用截图。
- 发布前仍需作者确认：若新增私人素材才询问；本次英文与发布已明确获准。

## 不要写成

全能秘书宣传、对未知后端的确定推断、用官网演示证明实际稳定性的评测。不要凑十二类功能，不套用另两篇结构。完整英文保留事实、限定词和证据。

## 验收标准

- [x] 核对政策与产品现状，官方声明、研究分析、建议实现和未知清楚
- [x] 中文稳定后执行 translate-and-format-blog，完整英文同路径同资源
- [x] 至少两张有解释作用且无私人信息的已检查配图，封面准确
- [x] 先读作者声音，再执行 lieflat-less-ai-tone 白名单检查；正文继续修改要复查
- [x] 引文、参考、标签、元信息、双语、资源及文章级检查通过
- [x] 不 commit、不 push、不发布，由协调者统一审查与执行本次已授权发布

## 执行回执

编辑阶段的检查与交接边界保留为历史记录；本批协调发布的实际时间、部署及验收状态以以下发布字段和收尾记录为准。读者反馈仍待观察，整站回归结果单独记录。

- article: content/zh/ai-agent/posts/ambi-memory-to-work.md
- english_article: content/en/ai-agent/posts/ambi-memory-to-work.md
- public_url: https://cubxxw.com/zh/ai-agent/posts/ambi-memory-to-work/
- public_url_en: https://cubxxw.com/ai-agent/posts/ambi-memory-to-work/
- editorial_verdict: KEEP。以一项合成预算工作贯穿输入、记忆更正和任务交付，解释授权与退出；避免功能大全。中文正文 5,105 汉字，英文正文约 3,378 词（均含图注、不含参考资料）；含参考资料分别为 5,163 汉字和约 3,433 词。执行侧审读通过，不冒充作者新增亲测或人工验收。
- source_trail: 已运行本卡精确 source_refs trace，仓库内只有当前 brief，无旧文沿袭；未解析 brain://。直接复核官网 features、privacy、terms 和 trust；Recap 场景与首页依据本卡公开研究和配图交接。现行隐私政策为 2026-10-21，条款为 2026-10-12。功能页只支持产品声明与官方示意，不能证明后台可靠性；政策支持处理与保留规则，不能证明所有执行路径均已落实。
- checks: 已按仓库写作约束与批准口吻逐段复读；中文稳定后完整读取并执行指定 lieflat-less-ai-tone 白名单，未发现需强行改写的明确命中，结构和限定词保留；检测器单篇扫描 0 错误、0 警告。translate-and-format-blog 完整翻译后对照检查，9 个二级标题对应，26 处外链顺序与两图路径一致，无残留中文。frontmatter:check、tags:check 和 git diff --check 通过；description 中 156 字符、英 150 字符；日期为已到达的 +08:00。两张已目视交接图片均为有效 PNG，尺寸分别为 1440×1000、712×1176，正文注明官方公开页面或 Memory 示意；封面使用首页图。普通 Markdown 未引入 shortcode 或新渲染实现，未运行全站构建及浏览器测试。
  本批编辑复核：仅给英文段内 9 处独立来源链接补句号；段尾引用及正常句内链接保留。三篇定向 flavor 扫描 0 错误、0 警告，frontmatter、tags、diff 检查通过；本次无正文事实或结构改动。
- published_at: 2026-10-23T02:26:13.131+08:00
- deployment_commit: db80e3fbfed57e9f75f15ab83ef8a192a0316059
- deployment_id: 6ada5484e1776686525b58a4
- publication_verification: docs/verification/2026-10-23-product-docs-release.md
- content_receipt: docs/content-receipts/pending/2026-10-23-ambi-product-teardown.json
- whole_site_regression: 未通过；合并版主运行 39830855910 达到既有 2 小时时限结束 cancelled，失败与未完成覆盖见收尾记录，不以 published 代替回归通过。
- reader_feedback: pending；尚未取得读者反馈，保持待观察。
- retro_notes: 本轮未登录、连接账户、录音或执行实际任务；记忆纠错、后台恢复与外部发送的验收题均明确标为尚未执行。实现路线属于设计建议，未推断 Ambi 后端。保留本卡研究附录与原有配图交接；无额外私人素材或待追加授权事项。成稿使用独立 slug `ambi-memory-to-work`，规避现有队列检查对同 slug 双语文章的重复误报；最终 briefs:check 对本卡无报错，全库仍有 pi、n8n、openclaw 三条既有英文重复提示，未修改其他任务或共享脚本。

## 本次公开研究附录

以下为本次重新读取公开网页取得的事实包，允许作为写作证据。只选择实际支撑正文的部分；每个事实仍保留相邻来源，不能将资料包全文改写为文章。

# Ambi 公开资料核读证据

核读日期：2026-10-23（Asia/Singapore）。对象：Mistlabs Limited 的 ambi.ai，App Store ID `6787026123`。本文件仅是公开资料研究，不是文章成稿。

范围：只访问无需登录的官网与官网下载所链接的 App Store。未读取 Brain、私人应用或工作区，未登录、连接账户、启动录音或提交表单。以下均为官方自述或公开页面展示；没有本轮真实任务执行证据。

## 先记住的证据边界

- 官网承诺不等于真实任务稳定运行。功能页中的后台研究、持续推进、自动发现下一步，不能据此写成已实测的成功率、时延或可靠性结论。
- 供应商不等于后端框架。公开隐私政策披露模型、语音和云供应商，不能证明其 agent 编排框架、数据库、队列、检索策略、模型路由或客户端技术栈。
- 同名产品很多。应以 `ambi.ai`、Mistlabs Limited 和 App Store ID 三者共同识别；商店“你可能还喜欢”中的其他 Ambi 不是本产品证据。
- 所有日期和价格都应在发布前再看一遍。本次搜索摘要仍见 10 月 12 日隐私政策，但直接打开的正文已经更新至 **2026-10-21**；以下以正文为准。

## 官方来源与可引用事实

### S1 功能页：从输入到持续工作

URL：https://www.ambi.ai/en/features

获取：2026-10-23。页面无单独更新日期。可定位标题：Listening / Routines / Follow-through / Memory / Tasks。

| 编号 | 本次可确认的官方表述 | 不能据此推出 |
| --- | --- | --- |
| F1 | Listening 由用户开关，状态可见。 | 全天候默认监听、无需操作即录音。 |
| F2 | Memory 跨对话积累；官网示意图按 timeline、topics、files、skills 展示。 | 实际记忆结构就是四张表，或支持全部记忆的自助编辑。 |
| F3 | Action Spotter 发现下一步，Tasks 承接单项工作，Routines 推进较长期工作。 | 三者使用何种内部 agent 架构。 |
| F4 | Routine 接收长期 brief，并连接所需应用，持续吸收新上下文。 | 每个 Routine 都有固定时间表，或后台运行永不停止。 |
| F5 | Task 示例是研究、准备、分析；官方画面示例为预算提案。 | 已证实可稳定生成任意格式文件。 |
| F6 | 功能页列有 Gmail、Google Calendar/Drive/Docs/Slides/Sheets、Slack、Lark、Teams、Outlook、Dropbox、Notion、Zoom、GitHub 等连接入口名称。 | 每项在所有平台、地区和套餐均已可用；每项均支持写入。 |

截图入口：同页每个功能标题下均有官方产品示意图。应标为“官网功能示意”，不要写成作者账户中的实际运行结果。

### S2 隐私政策：Memory、声音和删除

URL：https://www.ambi.ai/en/privacy

获取：2026-10-23。正文更新：**2026-10-21**。数据控制方：Mistlabs Limited d/b/a Ambi。

| 编号 | 可引用的具体事实 | 正文定位 |
| --- | --- | --- |
| P1 | Listening 实时声音传给 Soniox；Recording 用于主动保存音频。 | §2，Recordings and user content |
| P2 | Memory 可来自主动保存，也可从录音、对话、任务和交互中抽取或推断。 | §2，Memory and personalization |
| P3 | 未保存的 Listening 原音在结束后即删；Recording 原音保留至用户删除。 | §6，保留表 |
| P4 | 转写、总结、Memory、任务通常随活跃账户保留；180 天规则只指操作日志等。 | §6，保留表 |
| P5 | Google 断连后 30 天内删除既得数据，法律保留除外。 | §2、§6 |
| P6 | Settings 确认删号后立即删除其控制的数据，无恢复期；法律保留及外部副本另计。 | §6 |
| P7 | 主要供应商：OpenAI、Anthropic、Gemini、Soniox、Google Cloud。 | §2 |
| P8 | Memory 可能错误；缺少自助控件时可请求访问、更正、删除。 | §2、§8 |
| P9 | 政策另披露：中国人员可受限访问账户关联标识和使用信息。 | §7 |

需要精确写作时回到政策原文。这里尤其不能把“原音删除”写成“转写、总结与记忆全部随之删除”，也不能把“美国存储”写成“所有处理只有美国人员可接触”。

### S3 Trust：面向用户的控制承诺

URL：https://www.ambi.ai/en/trust

获取：2026-10-23。无页面更新日期。

- 用户可在 Settings 移除连接权限；不可撤销的事情等待用户决定。
- 官网称保留数据经过加密并存放在美国服务器。
- “帮助改进”默认关闭。单独开启后，美国一小组人员可审阅 recaps、tasks、memory；转写和聊天不在范围内。
- 官网称不出售数据、不靠广告、不主张用户输入或产物的所有权，也不以用户所说内容训练自己的模型。

这些是公开承诺，不是本次审计结论；不能额外升级为端到端加密、零供应商保留或已通过某项安全认证。音频实际保存差异应引用 S2 的细则。

截图入口：本页 You call the shots / Your data is yours / What we don’t do 三组卡片。适合展示产品怎样把权限与遗忘作为界面承诺。

### S4 Terms：授权与可靠性的边界

URL：https://www.ambi.ai/en/terms

获取：2026-10-23。正文更新：2026-10-12。

- §1 区分 Input、Output、Actions；连接账户或授权读取，本身不构成对某项外部行动的授权。
- §1 规定外部行动须遵守具体指令/确认；不可撤销行动须明确授权。网页、消息、文档内的指令不能扩张权限。
- §1 说明 Memory 可能不完整、过时或错误；关闭录音、断开连接不等于删除全部历史信息。
- §1 要求独立核对产物与行动；额外保护措施不保证执行成功或无误。
- §3 限制私人内容用于训练、优化或开发；为请求进行推理、转写和个性化仍属于服务处理。

写作边界：条款存在并不能证明产品每个执行路径都正确落实了确认。需用真实流程核验发送、修改、删除和取消的界面与结果。

### S5 下载页：可获得的客户端

URL：https://www.ambi.ai/download/

获取：2026-10-23。官网下载按钮直接链接安装包或商店；本次没有下载/运行安装包。

| 平台 | 下载页显示 |
| --- | --- |
| macOS | 仅 Apple silicon，明确不支持 Intel Mac。 |
| Windows | Windows 11，x64。 |
| iOS | 跳转官方 App Store。 |
| Android | Coming soon。 |

官网首页仍主推 waitlist，不能因此断言软件尚未开放：下载页与商店上架页同时存在。`/en/download` 本次无法通过浏览工具访问，应使用上面的 `/download/`。

截图入口：Desktop / Mobile 区块，能清晰说明平台差异；不要把 Android 写成已发布。

### S6 App Store：身份、版本、设备门槛和商店价

URL：https://apps.apple.com/us/app/ambi-ambient-intelligence/id6787026123

来源链：从 S5 官网 iOS 下载按钮进入。获取：2026-10-23，美区商店。

- 名称为 Ambi: Ambient intelligence，开发者与 Seller 均为 Mistlabs Limited。
- 页面列出 iPhone、iPad、Apple Watch；要求 iOS/iPadOS 18.0 及 watchOS 11.0 以上。
- 本次页面显示版本 1.0.2，时间标签为“1d ago”；1.0 条目标为 Oct 13。动态时间应在引用时保留抓取日期，勿机械换算成绝对发布日期。
- 显示简体中文、繁体中文等 10 种语言；这证明商店语言声明，不证明中文识别质量。
- 美区内购列表包括 Plus Monthly $20、Pro Monthly $100、Max Monthly $200；具体购买金额仍以购买界面为准。
- 商店隐私标签明确是开发者申报，Apple 未验证。

不使用评价区的人名或体验作为本文的产品事实。官方商店页的静态产品图可作为补充截图入口。

### S7 定价页：持续工作如何计量

URL：https://www.ambi.ai/pricing/

获取：2026-10-23。公开页面本轮价格数字部分出现破折号；不要用搜索缓存替代结账金额。

| 套餐 | 公开额度 |
| --- | --- |
| Free | 一次 7 天试用，4,000 Credits，3 个活跃 Routines，3 次 full Insights。 |
| Plus | 每 7 天 8,000 Credits，5 个活跃 Routines，每周 5 次 full Insights。 |
| Pro | 每 7 天 45,000 Credits，10 个活跃 Routines，每周 10 次 full Insights，MCP agents。 |
| Max | 每 7 天 100,000 Credits，Routines 与 Insights 不限，MCP agents。 |

Credits 是实时处理、Recaps、额外 Insights、Routines、Chat、Tasks 的共享池。付费用户主动启动 Listening 后的基础录音/转写不扣这一额度。套餐额度每周重置，不能结转；任务小时数只是混合使用估算。

截图入口：计划对比与 Credits FAQ；需现场确认页面是否已加载价格。

### S8 官方概念解释：时间、上下文、所有权

URL：https://www.ambi.ai/blog/se4fjpx7

标题：Ambient intelligence: a plain-language definition。文章日期：2026-10-05。获取：2026-10-23。

官方用 Present、Carried、Owned 三点解释类别：在事情发生时可用、跨工具与日期携带上下文、记忆由用户拥有。它也明确说现有设备上的软件可先成立，硬件只是以后扩展。这是厂商的产品定义，不是行业已有共识，也不是对其他助手产品的客观能力比较。

### S9 官方场景解释：Recap 是后续工作的起点

URL：https://www.ambi.ai/blog/mhk35tx5

标题：What does 'present as life unfolds' mean? 文章日期：2026-09-30。获取：2026-10-23。

文章明确排除持续无限监听；Listening 要由人打开和结束。它将 Listening Recap 描述成可以继续工作的结构化结果，强调减少会后重建背景的步骤。可用于解释设计目标，不能当作转写或执行效果实测。

### S10 官方交付物解释：把下一步放回工作发生处

URL：https://www.ambi.ai/blog/sml29p0o

标题：Is Ambi an AI assistant? 文章日期：2026-10-06。获取：2026-10-23。

官方列出的后续交付物包括 follow-up、draft、reminder；文章写有 October 12 软件发布计划。它用“把下一步交付到工作发生处”阐述定位。文章的 assistant 对比属于厂商立场，不宜照搬成竞品结论。

### S11 硬件：仍为未来承诺

URL：https://www.ambi.ai/en/hardware

获取：2026-10-23。页面称硬件由钢与玻璃构成，计划“early next year”。在本次 2026 年网页上下文中可理解为 2027 年初计划，但最好保留官网相对措辞，并注明日期。没有看到可下单价格、完整规格或已交付证据。

截图入口：硬件局部外观、草图与 Coming early next year 文案；不能配成已到手设备的试用图。

### S12 About：可引用的设计自述

URL：https://www.ambi.ai/en/about

获取：2026-10-23。页面有 Manifesto 与 Mission Book。

官方把记忆的目的表述为推动下一步，而非单纯存档；也把安静、保留人的判断、避免占据注意力作为产品原则。适合解释产品意图，不能从组织宣言推断真实组织实践或实际界面质量。

## 公开截图及素材入口

以下来源均是官网已公开的功能示意。引用时加官网来源及 2026-10-23 获取日期，并明确标注“官网示意”，与作者自己运行的结果区分。

| 画面 | 页面位置 | 官方静态素材 URL |
| --- | --- | --- |
| Listening recaps | S1 Listening 段 | https://ambi.cachely.io/images/x14x1n6x/production/f9ef5d22ae6cc81b933a03e64778287ec90674fe-712x1176.png?fit=max&fm=jpg&q=80&w=1200 |
| Routine 建议行动 | S1 Routines 段 | https://ambi.cachely.io/images/x14x1n6x/production/93171bf23ef68e7ed712598647b0574762e8cb71-712x1176.png?fit=max&fm=jpg&q=80&w=1200 |
| Action Spotter 请求确认 | S1 Follow-through 段 | https://ambi.cachely.io/images/x14x1n6x/production/37ddb548a5b1e644550a0787baa4a901291b70c2-712x1176.png?fit=max&fm=jpg&q=80&w=1200 |
| Memory 四种组织入口 | S1 Memory 段 | https://ambi.cachely.io/images/x14x1n6x/production/3eb0bccade48a02239abaee7646a8e517bbf08cd-712x1176.png?fit=max&fm=jpg&q=80&w=1200 |
| Task 预算提案 | S1 Tasks 段 | https://ambi.cachely.io/images/x14x1n6x/production/d2309e1a4ec5ec5148f843d02044b3877405ab8a-712x1176.png?fit=max&fm=jpg&q=80&w=1200 |

素材核验边界：五条 URL 来自功能页实际图片链接；Listening 图片在本轮直接抓取时超时，其他四条可打开，但本研究未用本地图片编辑或重新制作截图。应在最终排版前目视验收清晰度和文案。

## 可用于后续实测的验收题（尚未执行）

| 要解释的能力 | 最小可复现验证 | 应保留的证据 |
| --- | --- | --- |
| Memory 的来源与纠错 | 输入公开虚构资料，跨新对话召回；修改和删除其中一项，再测召回。 | 来源指向、记忆条目、修改前后结果；区别缓存与持久记忆。 |
| Listening/Recording | 用获得同意的测试声音分别启动两种模式，停止后查看可回放音频、转写、recap。 | 开始/停止状态、音频是否保留、生成物和权限提示。 |
| Tasks 的后台交付 | 提交范围明确的公开研究任务，切离页面再返回；检查失败和取消状态。 | 输入、进度、完成时间、产物、引用、可编辑/下载方式。 |
| Routines 的持续性 | 设定有新证据可观察的长期 brief，等待触发后检查增量更新。 | 触发条件、时间、数据来源、更新差异及通知。 |
| 外部行动的授权 | 在专用测试账户准备一项可回滚行动，观察批准与取消路径。 | 预览、收件人/目标、确认、外部实际结果、撤权后行为。 |
| 数据控制 | 只在允许销毁的测试账户中验证连接撤销、内容删除、导出和删号。 | 自助控件、确认界面、实际不可见状态；不要声称由界面证明云端物理擦除。 |

未验证：登录后流程、真实账户记忆、中文长会转写质量、任务稳定性、后台时长、连接器读写范围、MCP 实际连接、全部导出格式、端到端加密、精确模型版本、后端框架。本文不能补写这些结论。


## 配图交接

已在无登录浏览器截取并目视检查官网公开页面。可用资源：

- `/images/product-docs/2026/ambi-home.png`：官网公开页面，2026-10-23 获取。标明是官方演示，不是作者账户实测。

- `/images/product-docs/2026/ambi-features.png`：官网 features 页的 Memory 官方示意原图，2026-10-23 获取。图中有 timeline、topics、files、skills，必须标明是官方示意，不是作者账户实测。原图来源为附录中的 Memory 素材 URL。

图像可作本文封面，完整英文保留相同资源路径。不要再生成无关隐喻图。
