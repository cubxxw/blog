---
schema: blog-brief/v1
id: 2026-10-03-personal-agent-product-delegation
title: Personal Agent 产品研究：什么让用户持续委托
status: published
priority: high
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-10-03T00:05:00+08:00
source_refs:
  - brain://topics/personal-agent-product-study.md
---

# 选题契约

## 唯一命题

把 Personal Agent 做成用户愿意反复委托的产品，需要让用户看见事务确实得到处理，并能控制授权、等待与出错后的代价。以 Instinct 为主案例，结合真实用户的正反反馈，研究这些要求怎样改变产品形态。本文的判断属于有来源支持的研究分析，不能冒充已经测量过的产品规律。

## 为什么值得由我写

作者是面向产品和技术同学写作的 AI 从业者，本次明确要求研究 Personal Agent 品类，以 Instinct 为主案例，分别完成产品篇和技术篇。本文的一手增量是独立对照公开访谈、产品文档与用户叙述，推导可用于产品评审的取舍。没有作者亲自使用这些产品的记录可供公开，全文不得制造“我试了”“我的 Agent 替我完成”等个人经历。

## 目标读者与阅读场景

读者正在设计、评审或迭代个人代理产品。他们需要决定第一个任务选什么、入口如何安排、用户什么时候授权、主动工作怎样不添麻烦、完成与失败怎样展示，以及怎样测量真实价值。读完应能用一条具体委托路径审查自己的产品，能发现宣传成功案例隐藏的成本。

## 编辑选择

- 文章轨道：公开研究，产品篇。
- 已选形态：完整的深度博客，证据与具体经历穿插推进，不写产品榜单。由博客侧决定标题和结构；深度依赖案例过程、反证与设计取舍，预计约 7000–10000 个中文字，有必要可调整。
- 核心张力：用户觉得“有人替我操心”，但可能开始监督一个不断出错、持续消耗额度、主动推荐消费的系统。把任务交出去以后，究竟减少了多少注意力和责任？
- 这次主动不讲：技术篇会讲运行时与恢复，权限和 Computer Use，本篇只解释其对产品体验的要求，不重复实现教程。

## 已批准素材包

### 事实与项目证据

以下全部来自独立核读的公开资料，作者明确授权本任务研究、写作、翻译并发布两篇博客。仅允许使用这里的公开事实及博客侧重新核验的公开材料，禁止打开上游私有内容。资料核验日为 2026-10-03（上海时区）。附录保留阅读边界。

### 作者原话与在场片段

作者确认：“Personal Agent 品类，以 Instinct 为主案例”。追加要求为产品篇多调研好的产品形态、评论、真实用户感受和案例；成稿先执行去 AI 味 skill，再通过 Pi Agent 翻译英文、生成封面、提交远程并部署。此授权覆盖这两篇成稿的翻译与发布，无需再次请求同一授权。干净写作 executor 仍只产中文并停在 ready-to-publish，提交和部署由协调方执行。

### 作者观察

本任务目前没有获准公开的作者试用记录。可以写“我更关心第二次委托”“我会怎样设计实验”这样的研究判断，不能把设计示例或来源故事转成作者亲历。用户反馈必须保留“该用户称”“自述”的身份，不用一个帖子替代用户总体。

### 待验证推论

可研究的设计问题包括：低风险任务如何成为授权的起点；短信入口怎样配合任务状态与凭证；持续监控如何少打扰；多人协调怎样尊重不同人的授权；代理收费和商家分成如何影响站在用户一边的承诺。用具体任务说明机制与代价。不得声称这些设计已经改善某个产品的留存。

## 参考方向

沿附录的公开来源继续搜索、打开用户原帖和上下文，补足有用的正面案例与反面案例。至少覆盖 Instinct，以及 Poke、Town、Muse 等不同形态；Today 或记忆型产品只在能解释一个具体问题时进入正文。与技术篇 personal-agent-harness-openclaw 相互链接，系列导航 slug 可用 personal-agent-studies，产品篇 order 1 / total 2；对方不存在时先不加失效 relref。

## 证据与隐私边界

- 可以公开：附录公开事实、作者此次明确给出的创作指令、明确标为本文推论的研究判断、明确标为设计示例的流程。
- 必须匿名：无需披露评论者现实身份；可保留公开文章作者姓名以准确归因，不复制其私人账号数据。
- 禁止使用：brain 私有文件、用户私人经历、第三方私聊、密钥与本机路径；禁止把评论里的资金、隐私或安全指控写成已证实事件。
- 发布前仍需作者确认：本任务已授权两篇成稿的英文翻译、封面、远程提交和部署。若产生新的实质性隐私裁决才停止；研究上的不确定性以限定词和证据边界处理。

## 不要写成

不要写成产品功能大全、赛道融资报道、创始人崇拜、抽象“信任飞轮”，也不要连续十几节各抛一个概念。几条真实经历要挖出“委托什么→获得什么→在哪里需要人→这对设计有什么影响”。拒绝假访谈问答，不把未发送的问题写成 Noah 回答。普通 Markdown 优先，图表只在有助理解时使用。

## 验收标准

- [x] 完整中文深度文章，产品同学能据此做具体产品决策；每个关键判断都有过程、机制、反证或验证方法。
- [x] 至少六个有明确来源的具体用户经历或访谈案例，正面与负面都出现，并区分亲历者自述、创始人转述、产品承诺和本文推论。
- [x] 产品比较只比较同一决策维度，不使用凭空评分；至少提出一次会改变当前判断的反证。
- [x] 关键事实有相邻链接，末尾完整去重参考资料；数据不能把 GMV 当收入、把自报留存当同期群、把融资估值当价值验证。
- [x] 开篇执行 craft-article-opening；文章稳定后读取并执行作者指定的 lieflat-less-ai-tone，只做中文可见文案的白名单最小改写，保留结构、事实、限定词和引用，再复核声音与事实。
- [x] 已运行文章级 flavor、frontmatter、tags 和 diff 检查并通过；frontmatter 由协调方补齐依赖后重新运行。白名单收尾后再次逐句复查，没有用检测器代替人工复读。
- [x] 中文 executor 未翻译、提交或部署；协调方生成封面后，博客执行侧已完成无损格式转换与挂载。

## 执行回执

- article: `content/zh/ai-agent/posts/personal-agent-product-delegation.md`
- translated_article: `content/en/ai-agent/posts/personal-agent-product-delegation.md`。由实际 Pi Agent CLI 0.87.1 分节英译并完整合并，随后由协调方逐段对照原文；未用另一模型的译文替代 Pi 结果。
- public_url: `https://cubxxw.com/zh/ai-agent/posts/personal-agent-product-delegation/`；英文：`https://cubxxw.com/ai-agent/posts/personal-agent-product-delegation/`。四个页面及两张封面均已于 2026-10-03 01:32 +08:00 核验上线。
- editorial_verdict: KEEP。研究轨道，标题为「Personal Agent 产品研究：Instinct 怎样让人愿意再次委托」。正文 8640 个汉字，不含 frontmatter 与参考资料；去掉链接地址后的正文约 10674 个可见字符。以第二次委托与用户总投入为中心，六组 Instinct 使用/访谈材料，加 Town、Muse 与 Poke 的不同形态；比较服务于具体决策，不做产品排名。协调方完整复读最终中文稿后通过编辑复核。
- checks: 文章级 flavor 为 0 错误、0 警告；tags 检查为 0 文件待修改；diff 空白检查通过。`npm run frontmatter:check` 初次因工作树缺少 `markdown-it`，在加载检查器依赖阶段失败；协调方随后安装依赖并实际重新运行，exit 0，通过全站 frontmatter 检查。另行解析本篇 YAML 并定向验证：无 draft/categories，时间带 +08:00 且已到，6 个 canonical tags，description 为 160 字符纯文本，series 为 personal-agent-studies/order 1/total 2；封面路径存在，内部文章链接存在，正文与参考资料的 16 个外链来源集合一致。另运行全仓库 briefs 检查，发现 3 个历史任务卡与已有英文文章重复的既有告警（Pi、n8n、OpenClaw），本任务卡没有被报告为错误；未改动历史任务卡。
- published_at: 2026-10-03T01:32:03+08:00（首次成功生产核验时间）。
- retro_notes: 最初稿沿九组公开使用/访谈案例展开；发展编辑保留「首个结果—任务记录—主动工作—逐项授权—多人关系—漏项与接管—四周实验」的论证推进。本文的增量是把监督、追问和善后的注意力纳入委托收益，把按任务与后果分配授权、能关闭的持续工作、带凭证的完成和可接管的失败放回具体事务。四周实验、第二次有效委托与用户总投入均明确标为设计建议，没有产品实测数值。反证包含独立应用入口偏好、现有聊天工具即可满足的用户反馈，以及可靠且边界清楚的事务仍可能没有重复需求。

### 英译与双语复核

实际调用 Pi CLI 的无会话本地化执行流程，保持当前模型设置，没有改变全局配置。长文超过单次输出预算，因此在发布目录之外分成 12 个完整片段，核对后再原子合并英文正式文件。英文与中文章节、段落和表格对齐，42 次外部链接的顺序与 URL 完全一致；16 条参考资料保留完整，机器字段、series slug/order/total 与封面资源一致。内部链接只在英文目标已存在时移除 /zh/，没有制造 /en/ 路由。

协调方完整复读英文，对照事实、时序、来源归属和限定词；再由 Pi 做八处最小本地化修正，包括接收委托、可打开链接、旅行报价措辞和 SEO 摘要。英文 description 为 155 字符，中文为 160 字符。正文未删去正反案例或改变设计判断；flavor 复查仍为 0 错误、0 警告。已生成英文配对页导致队列提示同篇双语重复，回执已明确两者关系；不修改队列实现，也不把该提示当成新增选题。

### 作者声音、开篇与白名单收尾

先读取博客当前 CLAUDE.md 的写作约束，并以站内 Agent 成本文章的研究语体作为声音参照。使用 craft-article-opening，从真实压力测试与付款边界进入，第一句直接回答产品命题，不制造作者亲历。随后分别复读作者立场、论证推进与事实安全。

文稿稳定后读取作者指定的 lieflat-less-ai-tone，逐句按白名单处理。仅改动 25 个正文行，主要对应规则 2 的过密并列和规则 10 的前置定语/句首连接词。没有修改 frontmatter、标题层级、段落与列表结构、表格位置或任何引用 URL；对引语、必要完整字段及确需限定讨论范围的表述保留原样。已对比收尾前后版本，标题、链接序列、段落结构和机器字段一致，再次复查事实与所有限定词。

### 公开谱系与站内增量

执行精确 source_refs trace，仓库中只有本任务卡，无可继承的同源公开 brief 或成品；未解析或读取任何 brain:// 目标。站内扫描发现已有个人产品栈、Agent 舰队成本和责任相关内容，本篇新增具体个人事务中的产品设计，不重写模型价格、运行时实现或行业榜单。正文只连接真实存在的 Agent 舰队成本文章；尚未生成的技术篇不建立 relref 或普通链接。

### 九组案例与证据限制

六组 Instinct 材料分别是压力试用与付款保留、WhatsApp 教学草稿与请求回应、已读未回应、短信权限纠正与库存监控、主持人电话体验及截止提醒例子、岗位/活动/商家邮件。另有 Poke 用户独立应用偏好、Berkowitz 的 Town 额度与 routine 体验、Muse 旅行顾问的邮件到表格漏项。正面与负面均保留来源身份，不等同于作者亲历或普遍成功率。

以下保留来源均于 2026-10-03 核读。每项只支持所列范围；中文及后续英文共同控制来源使用量。

| 保留来源 | 支持的内容 | 不能证明的内容 |
| --- | --- | --- |
| [Instinct 官网](https://instinct.com/) | 个人助手定位与熟悉的消息/电话入口 | 所有集成与任务实际有效、留存效果 |
| [Colossus 官方节目页](https://colossus.com/episode/instinct-the-personal-agent/) | EP.493 的日期、嘉宾与公开章节 | 已核对需登录的官方完整逐字稿 |
| [公开机器转录](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493) | 电话体验、理解性、逐步委托、代理协调、广告与交易分成方向的公开访谈片段 | 新采访、内部日志、已实施的完整商业政策；转录有误差与广告时间偏移 |
| [Instinct 原帖及评论](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/) | 压力测试、机票检查、岗位/活动、短信访问纠正、家庭任务核验缺失和使用契合点 | 总体满意度、故障率、所有退款完成、父母散步的传感器/定位机制 |
| [WhatsApp 用户评论](https://www.reddit.com/r/AI_Agents/comments/1wak4is/comment/pc0gjb5/) | 邮件清理、教学草稿自审发与表情回应的个人自述 | 真实日志、清理零错误、全体用户体验 |
| [未回应用户评论](https://www.reddit.com/r/AI_Agents/comments/1wak4is/comment/pau2h0b/) | 已读未回应及不同渠道用户的相反自述 | 渠道根因、宕机范围、普遍可用性 |
| [Poke Recipes](https://poke.com/docs/creating-recipes) | 初次上下文、预填请求、必要集成、安装入口和发布修改范围 | Recipe 的实际成功率、安装即委托完成、无限授权 |
| [Poke 入口偏好原帖](https://www.reddit.com/r/AskVibecoders/comments/1uzxhjg/i_need_an_ai_personal_assistant_what_are_the_best/) | 一位用户希望独立应用的线索 | 账号推广关系、普遍偏好、苹果官方批准；未采用推荐品牌排行 |
| [Town Email](https://www.town.com/docs/using-town/email) | 独立邮箱、抄送协作、外部参与者无需注册及发送身份区分 | 每次协调都成功、所有外发均逐次审批 |
| [Town Routines](https://www.town.com/docs/routines) | 持续任务的定时/事件触发入口 | 净节省时间或当前用户消费效果 |
| [Town Modes & Approvals](https://www.town.com/docs/safety/modes-approvals) | 2026-09-30 当前会话、routine 与 per-tool 控制，会话权限重置 | 过期的「任何消息必须单独审批」概括、独立安全审计 |
| [Berkowitz 的亲历通讯](https://aimarketersguild.com/p/should-you-hire-an-ai-townie) | 2026-08 的额度解释、关闭后台工作、新闻 routine 有用与代写不满 | 当前价格、整体满意度、全部账户的消费模式 |
| [Muse 旅行顾问原帖](https://www.reddit.com/r/MetaAI/comments/1wpdcdd/it_was_great_until_it_wasnt/) | 初期报价研究与后来漏项、重复规则问题的一人自述 | 模型/版本归因、账户封禁责任、普遍故障率；未采纳资金与安全指控 |
| [Muse 官方安全说明](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) | 发布时人工付款确认、限定单次凭证及模型外授权的厂商设计说明 | 独立审计或 Instinct 的架构 |
| [创始人公开发布镜像](https://twiscan.com/en/x/noahrshinn) | Selections 引入厨师、设计师与向导推荐的简述 | 原帖完整媒体上下文、广告性质、佣金排序；原 X 链接本次无法直接打开 |
| [TechCrunch Selections 报道](https://techcrunch.com/2026/09/30/instincts-new-product-recommendations-are-giving-some-users-the-ick/) | 正文一句短转述「用户对未经请求的购物推荐感到不适」 | 已确认广告、佣金歧视或采访日志；严格限制在 25 词预算内，不扩写原报道或复制英文 ew 引语 |

未使用 The Atlantic 的详细试用过程，因为本次没有拿到完整原文。未使用交易量、融资估值或自报留存验证产品价值。Town 文档刷新了继承材料中的授权解释；其他来源主要延续公开研究问题，未补入私人材料。仍开放的问题是四周同类事务是否真的减少用户总投入，以及购买之外的价值是否能支撑持续使用。

### 封面与后续交付

目标任务卡的定向 `briefs:check -- --file` 验证通过：1 brief，0 error，0 legacy。文章与任务卡的行尾空白及最终换行定向验证通过。

封面由协调方使用内置 imagegen 生成，协调方与本执行侧均查看原图。原始 PNG 由协调方保留；本执行侧只作无损格式转换，未改变构图，已输出 `static/images/personal-agent-studies/product-cover.webp`，1672×941，1584508 字节；转换前后 RGB 像素逐字节一致。文章通过 `/images/personal-agent-studies/product-cover.webp` 引用，alt 明确为概念插画。完整生成提示词由协调方补录，正文不声称封面是实际产品截图。

中文原稿已稳定，后续英文由协调方使用实际 Pi CLI 执行。本 executor 未翻译、commit、push 或部署，保持 codex/personal-agent-studies-20261003 分支。后续如再改中文可见文案，须在交付前复查同一白名单 skill；新增技术篇后才加入相互链接，避免断链。

## 公开证据附录

每条来源只支撑注明的范围。非 Reddit 来源避免长引文，单一来源直接引语累计不超过 25 个英文词；来源转述也应克制，把篇幅留给自己的分析，不能改写全文。下列线索不构成作者亲历。

### Instinct 的访谈与体验

1. [Colossus 官方 EP.493](https://colossus.com/episode/instinct-the-personal-agent/)：2026-09-28，主持 Patrick O’Shaughnessy，嘉宾 Noah Shinn。已读节目说明和官方时间章节；官网全文转录需登录。官方章节可定位信任 21:00、理解性 44:43、成本 56:58、主动工作 59:24。不要声称核对了官方完整逐字稿。
2. [公开机器转录](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493)：已核读对应片段，插播广告导致时间偏移。主持人说数月里约收到三次电话，并举接近签署截止的提醒；这是主持人体验加例子，无内部日志。Noah 描述按授权逐渐委托、个人代理相互协调以及不做广告的理念。只用少量关键观点，勿复写完整访谈。年化交易量是公司自报交易规模，不能当收入；如无必要不使用增长/留存数字。
3. [Instinct 压力试用原帖及评论](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)：已读主帖、相关评论与追问。主帖作者称试过零食下单、一天约三次航班价格监控、父母散步相关任务及创业公司研究；认为部分任务有效，但步骤之间慢、部分站点/验证码需人介入，不愿无限制交出信用卡。散步的实际核验机制并未提供，不能补造传感器或定位。
   - 评论者 Appropriate_Peach946 称在 WhatsApp 用几天，清理 Gmail 推广邮件，教学消息由它起草、自己审发，规划旅行；喜欢请求后有表情回应，知道已经开始。这是单人自述。
   - Crafty-Luck9522 称每天 8 点收到岗位列表，按活动历史推荐纽约活动，自己选后再注册与加日历，还处理商家的取件/退款邮件。无交易日志，不能保证所有退款完成。
   - worsterer 先说能处理短信，追问后承认连接的是 Gmail、Calendar、Drive，iPhone 短信仍受限制。该纠正很有价值：会在 iMessage 接收委托，不等于读取用户全部 iMessage。其跨天库存检查、家庭偏好、批准付款的描述仍属于自述。
   - natcaine 称消息已读但不回复；另一评论者使用 WhatsApp 则称没问题。不能由此确定渠道根因、宕机规模或普遍故障率。
   - 支付评论提虚拟卡硬限额，另一人指出限额无法撤销错误，追索与赔付才影响长期信任。后一条是评论者观点，本文可以讨论，但不能把现有赔偿政策编出来。
4. [The Atlantic 记者试用](https://www.theatlantic.com/technology/2026/09/instinct-ai-personal-assistant-credit-card/688607/)：2026-09-13 公开检索返回记者本人体验：限定 25 美元预算给编辑挑书，在本人指示下看既有文章、选书、发送到店取书通知；找椅子被 CAPTCHA 卡住。页面直接打开失败，仅可用于进一步核验，无法取得正文时不要写大段过程。新闻检索全文片段不能冒充实际账户日志。
5. [Instinct Selections 创始人公开发布内容的镜像](https://twiscan.com/en/x/noahrshinn)：已读 2026-09-29 23:33 发布文字，称引入厨师、设计师、当地向导等的推荐。镜像不是原帖完整媒体上下文，优先继续寻找原帖。[9 月 30 日报道](https://techcrunch.com/2026/09/30/instincts-new-product-recommendations-are-giving-some-users-the-ick/)提到有人不欢迎购物推荐。该来源只用一句短转述，不展开其完整报道；不能将此认定为已确认广告或佣金歧视。

### 产品形态的比较

6. [Poke Recipes 官方说明](https://poke.com/docs/creating-recipes)：已读完整页面。Recipe 打包首次上下文、预填第一句和所需集成，发布后分享安装链接；修改已发布配方只影响新加入用户。支撑“把第一条有效委托包装成可安装入口”，不能证明真实成功率。不要把配方等同底层实现或无限授权。
7. [Poke 用户寻替代原帖](https://www.reddit.com/r/AskVibecoders/comments/1uzxhjg/i_need_an_ai_personal_assistant_what_are_the_best/)：已读主帖与相关评论。作者喜欢 iMessage 中主动助手概念，同时希望独立应用；随后转向另一产品，身份/推广关系未核实。仅可作为不同入口偏好的线索，不评选其推荐的产品，也不复用“苹果官方首个批准”这类未核实断言。
8. [Town Email 官方文档](https://www.town.com/docs/using-town/email)：已读功能正文，助手独立 @town.com 地址，可邮件委托或抄送外部联系人，不要求对方加入 Town；另有 web/iOS 任务、历史和配置界面。[Routines](https://www.town.com/docs/routines) 为定时或事件触发任务入口。最新 Modes & Approvals 规则须博客侧重新核验，不可沿用“任何消息都一定单独批准”的过期概括。
9. [David Berkowitz 的 Town 亲历通讯](https://aimarketersguild.com/p/should-you-hire-an-ai-townie)：2026-08-07，已读正文。他用邮件找助手；询问积分用在哪后，发现邮箱阅读、打标签和起草消耗，关闭部分功能与逐会议简报。为自己通讯搜集新闻的 routine 有用，模仿其声音代写失败。不要把他引用的旧价格写成今天定价。支撑“默认忙碌未必有价值，用户需要能解释和关闭的后台成本”。
10. [Muse 旅行顾问原帖](https://www.reddit.com/r/MetaAI/comments/1wpdcdd/it_was_great_until_it_wasnt/)：已读主帖及相关评论。作者称使用约 12 天，初期报价研究有效，后来邮件到表格会漏信息，需要逐条重读，重复索要已知信息且重犯所谓 standing rule；登录与第三方站点限制也麻烦。这是单人未验证描述，无法确定模型、版本、平台责任。可重建“省事变监工”的注意力账本。
11. [Muse 官方安全设计](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)：已核读，单用户隔离环境、把授权从模型中分离、单次付款范围限制等为公司设计说明，非独立安全审计，也非 Instinct 架构。正文只挑影响用户授权体验的少量机制。
12. [Today 官方定位](https://today.ai/articles/blog/meet-today)：已读页面，将 memory、initiative、execution 合并定位。厂商自己的产品叙述，不能用其竞品评论证明真实用户满意度，也不能把功能愿景当已完成效果。
13. [Rosebud 长期记忆说明](https://help.rosebud.app/ai-analysis/long-term-memory)：官方说明记忆更擅长主题与模式，日期/精确时间不及具体用户事实；精度模式仍有代价。[超过 550 天用户离开原帖](https://www.reddit.com/r/digitaljournaling/comments/1vo0zyb/leaving_rosebud_after_over_550_consecutive_days/)可继续核读，若使用须明说这是该用户投诉。记忆型产品仅是对照，不当作执行型 Personal Agent 的直接替代。

### 研究写作的边界

访谈是线索而非新采访；未联系 Noah 或用户。没有试用所有产品，不做胜负排名。现有样本偏早期使用者和主动发帖者，许多评论含邀请推荐，因此不能估算普遍满意度。可提出“连续四周同类任务”的验证方案和“第二次有效委托”的候选指标，必须标为本文设计建议。说清完成凭证、用户接管和补救会带来成本，不靠概念自证。

### 生产发布回执

四篇文章与两张封面以 `2152d93164ccb64e99975a3a72e849265015d35e` 提交并推送远程 main，生产站点已更新。四个页面返回 200，标题、参考资料、系列与封面正确；产品和技术各自的全部外部引用都出现在生产正文，四个页面的双语切换链接均正确。两张线上 WebP 的 SHA-256 与提交文件逐字节一致。原博客工作区的其他修改未带入本次提交。

远程源码质量检查通过，工作流与 SEO 测试通过，273 项测试全部成功，Hugo 与 Netlify 完整构建完成。最后的整站输出检查报告 12 个链接错误，当前 CI 运行 `37040008089` 因此为 failure；该步骤未保留 output-report，当前未将这些错误归因到具体文章，也未声称整个 CI 已通过。生产发布由原有 Git 构建完成；本次文章的线上正文、引用、双语链接与封面已独立核验。全仓库 source 扫描另发现历史中文文章的 flavor 硬门槛，四篇新稿的变更范围源码检查通过。
