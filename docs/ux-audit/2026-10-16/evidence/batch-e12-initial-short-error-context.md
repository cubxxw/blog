# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: footnote-preview-contracts.spec.ts >> bounded short-screen footnote >> a long-note fixture scrolls inside the region without moving the article or clipping More
- Location: tests/e2e/footnote-preview-contracts.spec.ts:64:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2367
Received: 2319
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content":
    - /url: "#main-content"
  - banner [ref=e3]:
    - navigation [ref=e4]:
      - link "cubxxw" [ref=e6] [cursor=pointer]:
        - /url: https://cubxxw.com/zh/
      - generic [ref=e7]:
        - button "搜索 (Cmd/Ctrl + K)" [ref=e8] [cursor=pointer]
        - button "Toggle theme" [ref=e13] [cursor=pointer]
        - list "Language" [ref=e14]:
          - listitem [ref=e15]:
            - link "English" [ref=e16] [cursor=pointer]:
              - /url: /ai-agent/posts/context-engineering-the-new-foundation/
              - text: EN
          - listitem [ref=e17]:
            - text: /
            - generic "简体中文" [ref=e18]: 中
      - button "打开导航菜单" [ref=e19] [cursor=pointer]
  - main [ref=e21]:
    - article [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: Xinwei Xiong
          - generic [ref=e27]: ·
          - generic [ref=e28]: 2026 年 6 月 22 日
        - generic [ref=e29]:
          - generic [ref=e30]: 16 分钟 · 7784 字
          - generic [ref=e31]: ·
          - generic [ref=e32]:
            - text: 中 |
            - link "EN" [ref=e33] [cursor=pointer]:
              - /url: https://cubxxw.com/ai-agent/posts/context-engineering-the-new-foundation/
      - generic [ref=e34]:
        - generic [ref=e35]:
          - link "主页" [ref=e36] [cursor=pointer]:
            - /url: https://cubxxw.com/zh/
          - text: »
          - link "AI Agent" [ref=e37] [cursor=pointer]:
            - /url: https://cubxxw.com/zh/ai-agent/
        - heading "Context 不是 Prompt：上下文工程如何成为 AI Agent 的新地基" [level=1] [ref=e38]
        - paragraph [ref=e39]: 本文从 Anthropic 与 Sourcegraph 的代表性框架出发，解释上下文工程与提示词工程的边界，并核对上下文腐烂、检索重排、Claude Code 自动压缩、服务端 compaction 与记忆系统。面向 AI Agent 工程师；核心结论是上下文并非越多越好，关键是让高信号信息在正确时刻进入窗口。
      - complementary "核心要点" [ref=e41]:
        - heading "提要" [level=2] [ref=e42]
        - list [ref=e44]:
          - listitem [ref=e45]: 提示词工程是把一句话写好；上下文工程是在每一次推理时，决定整扇上下文窗口里装什么、按什么顺序、淘汰什么。重心从「措辞」转向了「布线」。
          - listitem [ref=e46]: 上下文是有限资源，存在「上下文腐烂」：token 增多时，模型对其中信息的召回可能变差。工程目标是找到信息量最高的最小充分上下文。
          - listitem [ref=e47]: 两套有代表性的框架提供了互补视角：LangChain 的 Write / Select / Compress / Isolate 描述动作，Sourcegraph 的 Instructions / Retrieval / Memory / Tools 描述对象；它们不是行业标准。
          - listitem [ref=e48]: 记忆与上下文工程紧密相关但需要区分：上下文工程整理当前输入，记忆研究还关心信息如何形成、演化并在跨轮次或跨会话中被取回。
          - listitem [ref=e49]: 我的判断：真正稀缺的从来是「世界线」，而非模型——只有你的上下文能让 AI 知道你是谁、在哪、要什么。这条线值得 local-first 地长在你自己手里。
      - figure [ref=e50]:
        - generic [ref=e51]:
          - img "书桌上的笔记本电脑显示「Context 不是 Prompt」文章与核心要点面板，旁边摊开的笔记写着 Context Engineering 的四支柱与 Worldline"
        - paragraph [ref=e52]: 上下文工程：把模型的房间布置好——Write / Select / Compress / Isolate，和那条 local-first 的世界线。
      - generic [ref=e53]:
        - paragraph [ref=e54]:
          - strong [ref=e55]: 上下文工程（Context Engineering）是在 LLM 每一次推理时，对进入上下文窗口的最优 token 集合——系统提示、检索文档、对话历史、工具定义与记忆——进行筛选、排序与淘汰的一整套工程策略。
          - text: 它与提示词工程的区别一句话讲清：提示词工程优化「一句话的措辞」，上下文工程优化「整扇窗口的布线」。这个定义来自 Anthropic 的工程文章，Karpathy 也公开背书了这次改名。下文把这门正在成形的学科完整拆开。
        - blockquote [ref=e56]:
          - paragraph [ref=e57]: 「与其说我们在写提示词，不如说我们在为模型布置一间房间——决定哪些东西摆进来、摆在哪、什么时候搬走。措辞只是房间里的一张便签，而我们真正在做的，是装修。」
        - paragraph [ref=e58]: 如果你在 2024 年问我「怎么用好 AI」，我大概率会跟你聊提示词：怎么写指令、怎么设定角色、怎么给例子。但如果你今天再问我同一个问题，我的回答会完全不同。
        - paragraph [ref=e59]:
          - text: 因为这一年里，一线工程实践已经悄悄换了一个词——
          - strong [ref=e60]: Context Engineering（上下文工程）
          - text: 。它不是提示词工程换个说法的营销话术——它标志着一次重心的真正迁移：从「怎么把一句话写好」，转向「怎么决定模型在每一次推理时究竟看到什么」。
        - paragraph [ref=e61]:
          - text: 这篇文章想做两件事。第一件，用
          - strong [ref=e62]: 逻辑核
          - text: 把这门正在成形的学科拆开：它到底是什么、和提示词工程的边界在哪、有哪些已经在生产环境跑起来的设计模式。第二件，用
          - strong [ref=e63]: 感性核
          - text: 回到我自己——作为一个把 AI 当成环境而非工具、坚持 local-first 的人，我为什么认为上下文工程的尽头，是一条叫「世界线」的东西。
        - separator [ref=e64]
        - heading "先把边界划清楚：Prompt 与 Context 不是同一件事" [level=2] [ref=e65]:
          - text: 先把边界划清楚：Prompt 与 Context 不是同一件事
          - link [aria-hidden] [ref=e66] [cursor=pointer]:
            - /url: "#先把边界划清楚prompt-与-context-不是同一件事"
            - text: "#"
        - paragraph [ref=e67]: 最容易混淆的，是把上下文工程当成「提示词工程的高级版」。它们确实相关，但不是同一层的东西。
        - paragraph [ref=e68]:
          - text: Anthropic 在它那篇被广泛引用的工程文章里给了一个干净的区分：
          - strong [ref=e69]: 提示词工程是「编写和组织 LLM 指令的方法」；而上下文工程是「在 LLM 推理过程中，对最优 token 集合进行筛选与维护的一整套策略」
          - text: ——这个集合包括系统提示、检索到的文档、对话历史、工具定义、记忆，以及所有可能落进上下文窗口、但不属于「提示词」的信息。
          - superscript [ref=e70]:
            - link "1" [expanded] [ref=e71] [cursor=pointer]:
              - /url: "#fn:1"
        - paragraph [ref=e72]:
          - text: Andrej Karpathy 在 2025 年 6 月那条被反复转发的推文里说得更直白：「+1 支持用『上下文工程』取代『提示词工程』……这是一门精细的艺术与科学：用恰好正确的信息，填满下一步所需的上下文窗口。」
          - superscript [ref=e73]:
            - link "2" [ref=e74] [cursor=pointer]:
              - /url: "#fn:2"
        - paragraph [ref=e75]: 而 Sourcegraph 在 2026 年的实践文章里，给了一个我特别喜欢的、可操作的判据：
        - blockquote [ref=e76]:
          - paragraph [ref=e77]:
            - text: 「如果你在替换名词和形容词，你还在做提示词工程。如果你在改变 agent 检索什么数据、以什么顺序、用什么重排、以及当窗口被填满时淘汰什么——你在做上下文工程。」
            - superscript [ref=e78]:
              - link "3" [ref=e79] [cursor=pointer]:
                - /url: "#fn:3"
        - paragraph [ref=e80]:
          - strong [ref=e81]: 重心从「措辞（wording）」转向了「布线（wiring）」。
          - text: 这一句话，是我读完所有材料后觉得最值得记住的。提示词工程关心的是字面；上下文工程关心的是管道——数据从哪进来、经过哪些处理、在窗口里待多久、什么时候被踢出去。
        - paragraph [ref=e82]: 这不是文字游戏。当你的 agent 只是一个单轮聊天框时，写好一句话几乎就是全部工作。但一旦它有了工具、有了记忆、有了检索层，写提示词就只剩下整个系统里很小的一块；剩下的全是围绕它的上下文工程。
        - separator [ref=e83]
        - heading "为什么是「工程」：上下文是有限资源，而且会腐烂" [level=2] [ref=e84]:
          - text: 为什么是「工程」：上下文是有限资源，而且会腐烂
          - link [aria-hidden] [ref=e85] [cursor=pointer]:
            - /url: "#为什么是工程上下文是有限资源而且会腐烂"
            - text: "#"
        - paragraph [ref=e86]:
          - text: 把它叫「工程」而不是「技巧」，是有硬道理的。因为上下文窗口不是一个越大越好的容器——它是一种
          - strong [ref=e87]: 有限资源，且边际收益递减
          - text: 。
        - paragraph [ref=e88]:
          - text: Anthropic 的原话是：「上下文必须被当作一种有限资源来对待，它的边际收益是递减的。」以及——「好的上下文工程，意味着找到那个信息量最高的、最小的 token 集合，去最大化某个期望结果的可能性。」
          - superscript [ref=e89]:
            - link "1" [ref=e90] [cursor=pointer]:
              - /url: "#fn:1"
        - paragraph [ref=e91]:
          - text: 支撑这个判断的，是一个叫
          - strong [ref=e92]: Context Rot（上下文腐烂）
          - text: 的现象：
          - strong [ref=e93]: 随着上下文窗口里 token 数量增加，模型从中准确召回信息的能力可能下降。
          - superscript [ref=e94]:
            - link "1" [ref=e95] [cursor=pointer]:
              - /url: "#fn:1"
          - text: Anthropic 给出的解释里，Transformer 对 n 个 token 建立 n² 个两两注意力关系，因此上下文越长，捕捉远距离关系越困难；但这只是可能机制之一。训练数据里长序列较少、位置编码、信息所在位置、任务类型和模型差异都会影响表现，不能把「n²」写成唯一因果。Chroma 的长上下文实验给出了跨模型、跨长度的经验观察，但它仍是基准测试，不是对所有真实任务的定律。
          - superscript [ref=e96]:
            - link "4" [ref=e97] [cursor=pointer]:
              - /url: "#fn:4"
        - paragraph [ref=e98]:
          - text: 这里有个反直觉但关键的细节，Anthropic 自己也强调了：
          - strong [ref=e99]: 最小，不一定等于短。
          - text: 你要把上下文砍到「信息密度最高」，而非砍到最短——留下高信号的，扔掉低信号的。
        - paragraph [ref=e100]:
          - text: 对我来说，这一条把「Context is the bottleneck」从一句我一年前在自己笔记里写下的判断，变成了一个有物理基础的结论。瓶颈从来不在模型本身有多聪明，而在于：
          - strong [ref=e101]: 在这一次推理里，它有没有看到那条恰好正确的信息。
          - text: 你给它一百万 token 的噪声，不如给它一千 token 的信号。
        - paragraph [ref=e102]:
          - text: 下面这个小实验只说明容量关系：工具结果变长时，剩余容量如何被挤压、溢出又在哪里出现——它是
          - strong [ref=e103]: 示意模型
          - text: ，不预测回答质量，也不代表真实 token 计数。
        - generic [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]: 交互图解
            - generic [ref=e107]: 上下文预算实验
            - button "重置" [ref=e108] [cursor=pointer]
          - paragraph [ref=e109]: 工具返回的内容变多时，上下文窗口会发生什么变化？
          - group "上下文预算实验" [ref=e111]:
            - button "大量工具结果" [pressed] [ref=e112] [cursor=pointer]
            - button "精简输入" [ref=e113] [cursor=pointer]
            - button "长对话" [ref=e114] [cursor=pointer]
          - region [ref=e115]:
            - paragraph [ref=e116]: 大量工具结果
            - generic [ref=e117]:
              - list [ref=e124]:
                - listitem [ref=e125]:
                  - text: 系统
                  - generic [ref=e127]: "4"
                - listitem [ref=e128]:
                  - text: 历史
                  - generic [ref=e130]: "20"
                - listitem [ref=e131]:
                  - text: 工具
                  - generic [ref=e133]: "32"
                - listitem [ref=e134]:
                  - text: 剩余
                  - generic [ref=e136]: "8"
              - paragraph [ref=e137]: 容量上限 64 k（示意单位）
            - generic [ref=e138]:
              - generic [ref=e139]:
                - term [ref=e140]: 总需求
                - definition [ref=e141]: "56"
              - generic [ref=e142]:
                - term [ref=e143]: 剩余
                - definition [ref=e144]: "8"
              - generic [ref=e145]:
                - term [ref=e146]: 溢出
                - definition [ref=e147]: "0"
            - paragraph [ref=e148]: 剩余空间紧张：需要在历史与工具结果之间重新取舍。
            - generic [ref=e149]:
              - generic [ref=e150]:
                - text: 工具结果长度：
                - status [ref=e151]: "32"
              - slider "工具结果长度：" [ref=e152]: "32"
            - paragraph [ref=e153]
          - group [ref=e154]:
            - generic "查看场景对照表" [ref=e155] [cursor=pointer]
          - paragraph [ref=e156]: 观察：改变这个条件后，哪些信息需要重新取舍？
          - generic [ref=e157]:
            - paragraph [ref=e158]: 只演示容量关系，不预测回答质量，也不代表真实 token 计数；模型本身不执行任何压缩或删除。
            - paragraph [ref=e159]: 示意数据 · 模型假设 · 对应来源
            - list [ref=e160]:
              - listitem [ref=e161]:
                - link "Anthropic — Effective context engineering for AI agents" [ref=e162] [cursor=pointer]:
                  - /url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
        - separator [ref=e163]
        - heading "两套代表性框架：从动作与对象看同一扇窗" [level=2] [ref=e164]:
          - text: 两套代表性框架：从动作与对象看同一扇窗
          - link [aria-hidden] [ref=e165] [cursor=pointer]:
            - /url: "#两套代表性框架从动作与对象看同一扇窗"
            - text: "#"
        - paragraph [ref=e166]:
          - text: 上下文工程仍在快速演化，还没有被某个标准组织定成一张唯一地图。2025 到 2026 年间，有两套
          - strong [ref=e167]: 有代表性、且互补
          - text: 的四分法值得借来思考——注意，它们是作者和公司的实践框架，不等于行业已经收敛出的标准答案。
        - heading "第一套（LangChain / Lance Martin）：Write / Select / Compress / Isolate" [level=3] [ref=e168]:
          - text: 第一套（LangChain / Lance Martin）：Write / Select / Compress / Isolate
          - link [aria-hidden] [ref=e169] [cursor=pointer]:
            - /url: "#第一套langchain--lance-martinwrite--select--compress--isolate"
            - text: "#"
        - paragraph [ref=e170]:
          - text: LangChain 的 Lance Martin（这个分类法的提出者）在 2025 年 6 月把所有做法归成四桶：
          - superscript [ref=e171]:
            - link "5" [ref=e172] [cursor=pointer]:
              - /url: "#fn:5"
          - superscript [ref=e173]:
            - link "6" [ref=e174] [cursor=pointer]:
              - /url: "#fn:6"
        - list [ref=e175]:
          - listitem [ref=e176]:
            - strong [ref=e177]: Write（写出去）
            - text: ：把信息保存到上下文窗口
            - strong [ref=e178]: 之外
            - text: （比如草稿、外部文件、记忆）。
          - listitem [ref=e179]:
            - strong [ref=e180]: Select（选进来）
            - text: ：在需要时把信息
            - strong [ref=e181]: 拉进
            - text: 窗口。
          - listitem [ref=e182]:
            - strong [ref=e183]: Compress（压缩）
            - text: ：只保留完成任务
            - strong [ref=e184]: 所需
            - text: 的 token。
          - listitem [ref=e185]:
            - strong [ref=e186]: Isolate（隔离）
            - text: ：把上下文
            - strong [ref=e187]: 拆开
            - text: （比如多 agent，各自持有自己那一块）。
        - heading "第二套（Sourcegraph）：Instructions / Retrieval / Memory / Tools" [level=3] [ref=e188]:
          - text: 第二套（Sourcegraph）：Instructions / Retrieval / Memory / Tools
          - link [aria-hidden] [ref=e189] [cursor=pointer]:
            - /url: "#第二套sourcegraphinstructions--retrieval--memory--tools"
            - text: "#"
        - paragraph [ref=e190]:
          - text: Sourcegraph 用一个明确的标题「上下文工程的四大支柱」给出了另一个切面：
          - superscript [ref=e191]:
            - link "3" [ref=e192] [cursor=pointer]:
              - /url: "#fn:3"
        - list [ref=e193]:
          - listitem [ref=e194]:
            - strong [ref=e195]: Instructions / 系统提示
            - text: ：身份、规则、约束。
          - listitem [ref=e196]:
            - strong [ref=e197]: Retrieval / 检索
            - text: ：RAG、向量、SQL、文件、即时（just-in-time）检索。
          - listitem [ref=e198]:
            - strong [ref=e199]: Memory / 记忆
            - text: ：短期（对话 + 工具结果）+ 长期（偏好、约定、摘要）。
          - listitem [ref=e200]:
            - strong [ref=e201]: Tools / 工具
            - text: ：agent 能调用的能力。
        - paragraph [ref=e202]:
          - text: 这两套并非竞争关系——它们是从「
          - strong [ref=e203]: 做什么动作
          - text: 」（Write/Select/Compress/Isolate）和「
          - strong [ref=e204]: 管什么对象
          - text: 」（Instructions/Retrieval/Memory/Tools）两个维度切同一块地。把它们交叉起来看——比如「对 Memory 做 Compress」「对 Retrieval 做 Select」——你大致就拿到了上下文工程的整张地图。
        - blockquote [ref=e205]:
          - paragraph [ref=e206]:
            - text: 一个诚实的提醒：这两套是兼容且互相强化的，但
            - strong [ref=e207]: 不是同一组标签
            - text: 。任何把它们硬说成「同一个四支柱」的说法都是偷懒。我更愿意把它们当成两张投影，从不同角度照同一个立体。
        - separator [ref=e208]
        - heading "落到地上：那些已经在跑的设计模式" [level=2] [ref=e209]:
          - text: 落到地上：那些已经在跑的设计模式
          - link [aria-hidden] [ref=e210] [cursor=pointer]:
            - /url: "#落到地上那些已经在跑的设计模式"
            - text: "#"
        - paragraph [ref=e211]:
          - text: 抽象框架之外，真正让我兴奋的是——这一年，上下文工程的设计模式已经从「经验谈」变成了
          - strong [ref=e212]: 第一方 API 原语
          - text: 和
          - strong [ref=e213]: 可复现的工程做法
          - text: 。
        - heading "检索后重排：从 50 → top-5 的经验示意说起" [level=3] [ref=e214]:
          - text: 检索后重排：从 50 → top-5 的经验示意说起
          - link [aria-hidden] [ref=e215] [cursor=pointer]:
            - /url: "#检索后重排从-50--top-5-的经验示意说起"
            - text: "#"
        - paragraph [ref=e216]:
          - text: Sourcegraph 给了一个便于理解的经验示意：先用高召回检索取 50 个候选，再重排到 top-5，往往比把 50 块全部塞进提示词更合适。这里的
          - strong [ref=e217]: 50 → 5 不是通用最优参数，也不是跨数据集基准结论
          - text: ；真实的候选数和 top-k 仍要按召回率、延迟、成本与离线评测来定。它真正说明的是两阶段思路：先尽量别漏，再用 cross-encoder 或更便宜的模型排序，只把当前任务所需的高信号片段送进窗口。
          - superscript [ref=e218]:
            - link "3" [ref=e219] [cursor=pointer]:
              - /url: "#fn:3"
        - paragraph [ref=e220]:
          - text: 这正是 Context Rot 的工程解药：
          - strong [ref=e221]: 宁可少而准，不要多而糊。
        - heading "在进窗口之前就砍，而不是进去之后再后悔" [level=3] [ref=e222]:
          - text: 在进窗口之前就砍，而不是进去之后再后悔
          - link [aria-hidden] [ref=e223] [cursor=pointer]:
            - /url: "#在进窗口之前就砍而不是进去之后再后悔"
            - text: "#"
        - paragraph [ref=e224]:
          - text: Sourcegraph 把 token 预算管理定义为「在低信号内容
          - strong [ref=e225]: 进入
          - text: 上下文窗口之前就把它砍掉的纪律，而不是进去之后」。具体手段包括：截断工具输出、把旧对话压缩成滚动摘要、丢掉相关度低于阈值的块、给重排器设硬上限。
          - superscript [ref=e226]:
            - link "3" [ref=e227] [cursor=pointer]:
              - /url: "#fn:3"
        - heading "压缩式 compaction：Claude Code 在窗口将满时自动收束" [level=3] [ref=e228]:
          - text: 压缩式 compaction：Claude Code 在窗口将满时自动收束
          - link [aria-hidden] [ref=e229] [cursor=pointer]:
            - /url: "#压缩式-compactionclaude-code-在窗口将满时自动收束"
            - text: "#"
        - paragraph [ref=e230]:
          - text: 一个直观例子是 Claude Code 的 auto-compact：它默认开启，在上下文接近上限时把较早的交互轨迹压成摘要。常见版本的默认触发点约在窗口使用量的
          - strong [ref=e231]: 95%
          - text: ，但这不是跨版本不变的常数；模型、上下文窗口和版本都会改变实际边界。Claude Code 也允许用
          - code [ref=e232]: CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
          - text: 把触发比例调低，或用
          - code [ref=e233]: CLAUDE_CODE_AUTO_COMPACT_WINDOW
          - text: 调整用于计算的窗口容量。当前官方文档进一步说明，某些本地模型会在模型上下文上限触发，部分模型与云会话则会主动提前压缩。
          - superscript [ref=e234]:
            - link "7" [ref=e235] [cursor=pointer]:
              - /url: "#fn:7"
        - heading "Anthropic 把上下文管理做进了 API" [level=3] [ref=e236]:
          - text: Anthropic 把上下文管理做进了 API
          - link [aria-hidden] [ref=e237] [cursor=pointer]:
            - /url: "#anthropic-把上下文管理做进了-api"
            - text: "#"
        - paragraph [ref=e238]:
          - text: 这是我觉得最有信号意义的一步——上下文管理不再只是客户端自己手搓的脚本，而是平台级能力。Anthropic 当前把几类不同策略做成了第一方原语：
          - superscript [ref=e239]:
            - link "8" [ref=e240] [cursor=pointer]:
              - /url: "#fn:8"
          - superscript [ref=e241]:
            - link "9" [ref=e242] [cursor=pointer]:
              - /url: "#fn:9"
          - superscript [ref=e243]:
            - link "10" [ref=e244] [cursor=pointer]:
              - /url: "#fn:10"
        - list [ref=e245]:
          - listitem [ref=e246]:
            - strong [ref=e247]:
              - text: Server-side Compaction（
              - code [ref=e248]: compact_20260112
              - text: ）
            - text: ：对话达到可配置 token 阈值时，由服务端生成摘要块；Anthropic 目前把它列为长会话与 agent 工作流的推荐策略。
          - listitem [ref=e249]:
            - strong [ref=e250]:
              - text: Tool-Result Clearing（
              - code [ref=e251]: clear_tool_uses_20250919
              - text: ）
            - text: ：清掉窗口内那些「可以重新取回」的陈旧工具结果。
          - listitem [ref=e252]:
            - strong [ref=e253]:
              - text: Memory tool（
              - code [ref=e254]: memory_20250818
              - text: ）
            - text: ：把信息移到窗口
            - strong [ref=e255]: 之外
            - text: ，让它跨会话存活。
        - paragraph [ref=e256]:
          - text: 其中 Memory tool 的设计哲学很对我的胃口：它是
          - strong [ref=e257]: 客户端实现
          - text: 的——API 只提供协议、并自动注入一段「检查记忆」的系统提示，而
          - strong [ref=e258]: 数据存在哪、怎么存，由你这个客户端决定；模型只决定什么时候存、存什么。
          - text: 这恰好把「存什么」（模型的决策）和「怎么存」（客户端的实现）解耦开了。
          - superscript [ref=e259]:
            - link "8" [ref=e260] [cursor=pointer]:
              - /url: "#fn:8"
        - paragraph [ref=e261]:
          - text: 还要补一条截至本文复核时很容易被旧示例遮住的变化：Python、TypeScript 与 Ruby SDK
          - code [ref=e262]: tool_runner
          - text: 的客户端
          - code [ref=e263]: compaction_control
          - text: 参数已经被标记为弃用，未来会移除。除非确实需要在客户端控制摘要过程，否则官方建议迁移到服务端 compaction；工具结果清理与 thinking block 清理则仍属于服务端 context editing 的细粒度策略。
          - superscript [ref=e264]:
            - link "9" [ref=e265] [cursor=pointer]:
              - /url: "#fn:9"
          - text: 这些带日期的版本标识符会继续演进，别把示例代码当成永恒真理。
        - heading "KV-cache 命中率：生产环境里被低估的那条命脉" [level=3] [ref=e266]:
          - text: KV-cache 命中率：生产环境里被低估的那条命脉
          - link [aria-hidden] [ref=e267] [cursor=pointer]:
            - /url: "#kv-cache-命中率生产环境里被低估的那条命脉"
            - text: "#"
        - paragraph [ref=e268]:
          - text: 如果说前面几条是「装配上下文」的艺术，那 Manus 团队那篇造 agent 的复盘文章，讲的就是上下文工程在
          - strong [ref=e269]: 生产环境
          - text: 里的经济学。联合创始人 Yichao「Peak」Ji 的原话是：
          - strong [ref=e270]: 「KV-cache 命中率是生产阶段 AI agent 最重要的单一指标，它同时直接影响延迟和成本。」
          - superscript [ref=e271]:
            - link "11" [ref=e272] [cursor=pointer]:
              - /url: "#fn:11"
        - paragraph [ref=e273]:
          - text: 为什么重要？因为「哪怕一个 token 的差异，都会让缓存从那个 token 起整段失效」。最经典的反模式：
          - strong [ref=e274]: 在系统提示里放一个时间戳
          - text: ——每秒都在变，缓存永远命不中。
        - paragraph [ref=e275]:
          - text: 由此引出他们那条「Mask, Don’t Remove（要遮蔽，别移除）」的原则：工具定义放在上下文靠前的位置，所以任何对工具列表的动态增删都会让 KV-cache 失效。他们的解法不去中途加减工具，改为
          - strong [ref=e276]: 直接对 token 的 logits 做掩码
          - text: 来约束模型能选哪个动作——既保住缓存，又避免破坏 schema。
          - superscript [ref=e277]:
            - link "11" [ref=e278] [cursor=pointer]:
              - /url: "#fn:11"
        - paragraph [ref=e279]:
          - text: 还有一条我特别喜欢的、近乎哲学的设计：
          - strong [ref=e280]: 把文件系统当作终极上下文
          - text: ——「无限大、天然持久」。压缩策略始终设计成
          - strong [ref=e281]: 可还原
          - text: 的：一个网页的内容可以从上下文里丢掉，
          - strong [ref=e282]: 只要它的 URL 还在
          - text: 。
          - superscript [ref=e283]:
            - link "11" [ref=e284] [cursor=pointer]:
              - /url: "#fn:11"
        - blockquote [ref=e285]:
          - paragraph [ref=e286]:
            - text: 这条「可还原压缩」，我愿意单独拎出来讲。它删掉的只是当下的体积，
            - strong [ref=e287]: 给信息留了一个回家的地址
            - text: 。这和我做笔记的方式是同构的：正文可以折叠、可以摘要，但链接和出处永远留着——任何时候都能顺着线索把全貌取回来。
        - separator [ref=e288]
        - heading "把厂商的动作放进来：当「上下文层」变成产品" [level=2] [ref=e289]:
          - text: 把厂商的动作放进来：当「上下文层」变成产品
          - link [aria-hidden] [ref=e290] [cursor=pointer]:
            - /url: "#把厂商的动作放进来当上下文层变成产品"
            - text: "#"
        - paragraph [ref=e291]:
          - text: 如果说上面是「个人/工程」尺度的上下文工程，那 2026 年还有一条更大的线：
          - strong [ref=e292]: 厂商开始把「上下文层（context layer）」当成独立产品来卖。
        - paragraph [ref=e293]:
          - text: 最有代表性的、也是我手头
          - strong [ref=e294]: 唯一拿到扎实证据
          - text: 的，是 Databricks 的
          - strong [ref=e295]: Genie Ontology
          - text: 。它被定义为一个自动的上下文层：从表、查询、仪表盘、管道和连接的应用里自动
          - strong [ref=e296]: 抽取知识片段
          - text: ，组织成「一张关于公司如何运转、数据到底意味着什么的活图谱」。
          - superscript [ref=e297]:
            - link "12" [ref=e298] [cursor=pointer]:
              - /url: "#fn:12"
        - paragraph [ref=e299]:
          - text: 它的论点，几乎是我那句「context is the bottleneck」的企业版：
          - strong [ref=e300]: 真正的瓶颈是散落各处、无法被访问的业务上下文，而非基座模型。
          - text: Databricks 的原话是——业务上下文「散落在仪表盘、查询、管道、wiki、工单、文档和聊天记录里」；而「当 AI 不容易找到它需要的信息时，它会用推断去填补空白，产出的答案好的时候是泛泛而谈，坏的时候就是错的」。
          - superscript [ref=e301]:
            - link "12" [ref=e302] [cursor=pointer]:
              - /url: "#fn:12"
        - blockquote [ref=e303]:
          - paragraph [ref=e304]:
            - text: ⚠️ 这里我必须对你诚实，也对自己诚实：Databricks 这篇是
            - strong [ref=e305]: 厂商的产品营销
            - text: ，应当当作「Databricks 的立场/定位」来引用，而不是独立证据。它原文里那个 84.5% vs 52.4% 的对比跑分，在我的事实核查里
            - strong [ref=e306]: 被否决了
            - text: ，所以我一个数字都不会引——立场可以引，跑分不行。这也是上下文工程的一种元纪律：
            - strong [ref=e307]: 进入你论证窗口的每一条信息，都要先过一遍「它的来源配得上这个结论吗」。
        - paragraph [ref=e308]:
          - text: 至于研究里反复被提到的 AWS Context 和 Microsoft Fabric IQ——它们确实存在、方向一致（都在做「上下文层」），但我这轮核查里
          - strong [ref=e309]: 没有拿到可独立验证的细节
          - text: ，所以我只点到为止，不展开、不编造。这是一个负责任的作者应该守住的边界。
        - separator [ref=e310]
        - heading "上下文 vs 记忆：一扇窗，和窗外那条河" [level=2] [ref=e311]:
          - text: 上下文 vs 记忆：一扇窗，和窗外那条河
          - link [aria-hidden] [ref=e312] [cursor=pointer]:
            - /url: "#上下文-vs-记忆一扇窗和窗外那条河"
            - text: "#"
        - paragraph [ref=e313]:
          - text: 到这里必须澄清一个常被混为一谈的关系：
          - strong [ref=e314]: 记忆（Memory）和上下文工程紧密相关，但分析时需要区分。
          - text: 它们并非毫无交集的两条平行线：外部记忆通常要经过检索、筛选与压缩才能进入当前上下文；而上下文里的经历，也可能被提炼成新的记忆。
        - paragraph [ref=e315]:
          - text: 一份 2025 年 12 月提交、2026 年 1 月更新的综述《Memory in the Age of AI Agents》（arXiv 2512.13564，47 位作者）在摘要里明确说，它会把 agent memory 与 LLM memory、RAG、context engineering 等相关概念划开，再从
          - strong [ref=e316]: 形式、功能与动态
          - text: 三个维度梳理记忆；论文也把记忆称为未来 agent 智能设计中的「first-class primitive」。
          - superscript [ref=e317]:
            - link "13" [ref=e318] [cursor=pointer]:
              - /url: "#fn:13"
        - paragraph [ref=e319]:
          - text: 更准确地说，这篇综述并没有在摘要里给出「RAG 只访问外部知识、上下文工程只优化当前窗口、记忆负责持续身份」那段常见转述；把它写成论文原话会越界。它真正支持的是：这些概念相关，却不能混用；agent memory 还要讨论信息以 token、参数或潜在状态等形式存在，承担事实、经验或工作记忆等功能，并且如何随时间形成、演化与取回。
          - superscript [ref=e320]:
            - link "13" [ref=e321] [cursor=pointer]:
              - /url: "#fn:13"
        - paragraph [ref=e322]:
          - text: 我愿意把这个区分翻译成一个画面，但先声明这是
          - strong [ref=e323]: 我的比喻
          - text: ：上下文工程更像整理「此刻这一扇窗里装什么」；记忆更像维护「窗外那条会继续流动的河」。窗里的水可能来自河，窗里发生的事也会汇回河里。两者不能合并成一个词，也不该被切成互不相干的两个系统。
        - paragraph [ref=e324]:
          - text: 开源世界里，Mem0（arXiv 2504.19413）是一个具体的对照点：它是一个以记忆为中心的架构，从持续的对话里
          - strong [ref=e325]: 动态地抽取、整合、检索
          - text: 关键信息，正是为了解决「LLM 固定的上下文窗口无法在长期多会话对话里维持一致性」这个根本困难。
          - superscript [ref=e326]:
            - link "14" [ref=e327] [cursor=pointer]:
              - /url: "#fn:14"
          - text: （我刻意没有引用 Mem0 自报的那几个跑分数字——同样的纪律：未独立验证的数字，谨慎对待。）
        - paragraph [ref=e328]:
          - text: 我去年写过一篇
          - link "Mem0 的技术分析" [ref=e329] [cursor=pointer]:
            - /url: /zh/projects/mem0/
          - text: 。今天回头看，那篇写的是「记忆怎么存」；而这篇真正想接上的，是「记忆和上下文，在一个 agent 里到底是什么关系」——答案是：
          - strong [ref=e330]: 上下文工程是空间的艺术，记忆是时间的艺术。
          - text: 一个 agent 要长出连续的「自我」，两者缺一不可。
        - separator [ref=e331]
        - heading "我的判断：上下文的尽头，是一条「世界线」" [level=2] [ref=e332]:
          - text: 我的判断：上下文的尽头，是一条「世界线」
          - link [aria-hidden] [ref=e333] [cursor=pointer]:
            - /url: "#我的判断上下文的尽头是一条世界线"
            - text: "#"
        - paragraph [ref=e334]:
          - text: 前面六节，是逻辑核能验证的部分。这一节，我要切换到
          - strong [ref=e335]: 感性核
          - text: ，讲一些事实核查无法替我背书、但我越来越确信的东西。请把它读作「我的观点」，而不是「已证实的事实」——这个区分，本身就是上下文工程教会我的。
        - paragraph [ref=e336]:
          - text: 我一直说一句话：
          - strong [ref=e337]: AI 不是工具，是环境。
          - text: 工具是你用完放下的东西；环境是你身处其中、它也持续感知你的东西。而决定 AI 是「工具」还是「环境」的，恰恰是上下文——
          - strong [ref=e338]: 它知不知道你的世界线。
        - paragraph [ref=e339]:
          - text: 「世界线」是我借来的词：你是谁、此刻在哪、做过什么、要去哪、在意什么、不能碰什么。今天我们用 AI 的方式，本质上是
          - strong [ref=e340]: 每一次都把世界线压缩成一段 prompt
          - text: ，像调一次 API：把意图、背景、约束、格式手动打包塞进去。这件事极其耗能，而且不可持续——你不可能每次对话都重新做一次自我介绍。
        - paragraph [ref=e341]: 上下文工程这门学科，本质上就是在回答「世界线怎么进来」。而我认为，真正的答案不在云端某个厂商的「上下文层」里，而在一个更靠近你的地方：
        - paragraph [ref=e342]:
          - strong [ref=e343]: 这条线，应该 local-first 地长在你自己手里。
        - paragraph [ref=e344]: 理由有三层，刚好对应我那套双核的判断方式：
        - list [ref=e345]:
          - listitem [ref=e346]:
            - paragraph [ref=e347]:
              - strong [ref=e348]: 逻辑核（经济与控制）
              - text: ：上下文是你最私密的数据——你问过的问题、你面对的难题、你探索的念头。把它默认存在第三方那里，等于把世界线的所有权外包出去。而 Anthropic 那个客户端实现的 Memory tool 恰恰指向另一种可能：
              - strong [ref=e349]: 模型决定存什么，但存在哪、怎么存，由你说了算。
              - text: 这是一个 local-first 味道的原语——它证明了「上下文留在本地」在工程上是成立的。
          - listitem [ref=e350]:
            - paragraph [ref=e351]:
              - strong [ref=e352]: 感性核（信任与亲密）
              - text: ：一条只有你能读懂的、长在本地的 Markdown 记忆，和一条藏在云端、你看不见的隐式记忆，哪一条更值得信任？对我这种在九个国家之间移动、网络不稳、对隐私敏感的人来说，local-first 从来不是技术洁癖，是
              - strong [ref=e353]: 生存方式
              - text: 。我的世界线，不该在我看不见的地方被替我做梦。
          - listitem [ref=e354]:
            - paragraph [ref=e355]:
              - strong [ref=e356]: 张力（控制 vs 生成）
              - text: ：这里有一个我不打算消解的张力。把世界线全部结构化、全部 local 化，会不会又掉进我自己警惕的那个陷阱——
              - strong [ref=e357]: 用系统化去逃避真实体验
              - text: ？会的。所以我站的位置是「
              - strong [ref=e358]: 用秩序保护自由
              - text: 」，而非「全部掌控」：上下文工程负责把高信号的、可复用的那部分布好线；剩下那些无法被系统化的、属于当下的东西，留给它自己发生。
        - paragraph [ref=e359]:
          - text: 最后回到我那个一直在用的分类：
          - strong [ref=e360]: 刺激性欲望
          - text: vs
          - strong [ref=e361]: 生成性欲望
          - text: 。追逐更大的上下文窗口、更长的 token、更多的工具，是刺激性的——永远不够，越喂越饿。而把上下文工程当成一种
          - strong [ref=e362]: 让 AI 真正长进你生活、并随你一起演化
          - text: 的手艺——那是生成性的：每一次你把世界线布置得更准一点，得到的是一个结构性的、会自我强化的内在回报，而非一次性的爽。
        - blockquote [ref=e363]:
          - paragraph [ref=e364]:
            - text: 提示词工程教会我们怎么把一句话说清楚。上下文工程将教会我们一件更难、也更重要的事：
            - strong [ref=e365]: 怎么让一个系统，持续地知道我们是谁。
          - paragraph [ref=e366]: 而这件事的归宿，不该是一个更聪明的模型。它该是一条，长在你自己机器里的、你随时能读懂也随时能取回的——世界线。
        - separator [ref=e367]
        - heading "附：这篇文章的事实纪律" [level=2] [ref=e368]:
          - text: 附：这篇文章的事实纪律
          - link [aria-hidden] [ref=e369] [cursor=pointer]:
            - /url: "#附这篇文章的事实纪律"
            - text: "#"
        - paragraph [ref=e370]:
          - text: 写这篇的时候，我对自己用了一遍上下文工程的纪律：所有技术主张都经过多源对抗式核查（需要多数票通过才保留）。两条
          - strong [ref=e371]: 被否决、因此全文未引用
          - text: 的内容，我也一并写在这里，因为「我没说什么」和「我说了什么」同样重要：
        - list [ref=e372]:
          - listitem [ref=e373]: Databricks「Genie + Ontology 84.5% vs 52.4% vs 25%」的跑分——核查未通过，不引用。
          - listitem [ref=e374]:
            - text: 「多 agent 上下文隔离优于单 agent」——核查未通过，只当作一种
            - strong [ref=e375]: 模式
            - text: ，不当作已证实的胜利。
        - paragraph [ref=e376]:
          - text: 此外，OpenAI 的「Dreaming」、SaliMory 等记忆系统，以及 MCP 作为「上下文协议」的具体争议，在这一轮里没有拿到可独立验证的来源，所以本文
          - strong [ref=e377]: 有意没有展开
          - text: 它们的细节。把这些坦白写出来，是我能给你的、关于「上下文质量」最朴素的示范。
        - separator [ref=e378]
        - generic [ref=e379]:
          - separator [ref=e380]
          - list [ref=e381]:
            - listitem [ref=e382]:
              - paragraph [ref=e383]:
                - text: Anthropic, “Effective context engineering for AI agents.”
                - link "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" [ref=e384] [cursor=pointer]:
                  - /url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
                - link "↩︎" [ref=e385] [cursor=pointer]:
                  - /url: "#fnref:1"
                - link "↩︎" [ref=e386] [cursor=pointer]:
                  - /url: "#fnref1:1"
                - link "↩︎" [ref=e387] [cursor=pointer]:
                  - /url: "#fnref2:1"
              - paragraph [ref=e388]: "Long note fixture 0: reference context remains readable in the bounded preview."
              - paragraph [ref=e389]: "Long note fixture 1: reference context remains readable in the bounded preview."
              - paragraph [ref=e390]: "Long note fixture 2: reference context remains readable in the bounded preview."
              - paragraph [ref=e391]: "Long note fixture 3: reference context remains readable in the bounded preview."
              - paragraph [ref=e392]: "Long note fixture 4: reference context remains readable in the bounded preview."
              - paragraph [ref=e393]: "Long note fixture 5: reference context remains readable in the bounded preview."
              - paragraph [ref=e394]: "Long note fixture 6: reference context remains readable in the bounded preview."
              - paragraph [ref=e395]: "Long note fixture 7: reference context remains readable in the bounded preview."
              - paragraph [ref=e396]: "Long note fixture 8: reference context remains readable in the bounded preview."
              - paragraph [ref=e397]: "Long note fixture 9: reference context remains readable in the bounded preview."
              - paragraph [ref=e398]: "Long note fixture 10: reference context remains readable in the bounded preview."
              - paragraph [ref=e399]: "Long note fixture 11: reference context remains readable in the bounded preview."
              - paragraph [ref=e400]: "Long note fixture 12: reference context remains readable in the bounded preview."
              - paragraph [ref=e401]: "Long note fixture 13: reference context remains readable in the bounded preview."
              - paragraph [ref=e402]: "Long note fixture 14: reference context remains readable in the bounded preview."
              - paragraph [ref=e403]: "Long note fixture 15: reference context remains readable in the bounded preview."
              - paragraph [ref=e404]: "Long note fixture 16: reference context remains readable in the bounded preview."
              - paragraph [ref=e405]: "Long note fixture 17: reference context remains readable in the bounded preview."
              - paragraph [ref=e406]: "Long note fixture 18: reference context remains readable in the bounded preview."
              - paragraph [ref=e407]: "Long note fixture 19: reference context remains readable in the bounded preview."
              - paragraph [ref=e408]: "Long note fixture 20: reference context remains readable in the bounded preview."
              - paragraph [ref=e409]: "Long note fixture 21: reference context remains readable in the bounded preview."
              - paragraph [ref=e410]: "Long note fixture 22: reference context remains readable in the bounded preview."
              - paragraph [ref=e411]: "Long note fixture 23: reference context remains readable in the bounded preview."
            - listitem [ref=e412]:
              - paragraph [ref=e413]:
                - text: Andrej Karpathy, X (Twitter), 2025-06.
                - link "https://x.com/karpathy/status/1937902205765607626" [ref=e414] [cursor=pointer]:
                  - /url: https://x.com/karpathy/status/1937902205765607626
                - link "↩︎" [ref=e415] [cursor=pointer]:
                  - /url: "#fnref:2"
            - listitem [ref=e416]:
              - paragraph [ref=e417]:
                - text: "Sourcegraph, “Context Engineering: A Practical Guide for AI Agents (2026).”"
                - link "https://sourcegraph.com/blog/context-engineering" [ref=e418] [cursor=pointer]:
                  - /url: https://sourcegraph.com/blog/context-engineering
                - link "↩︎" [ref=e419] [cursor=pointer]:
                  - /url: "#fnref:3"
                - link "↩︎" [ref=e420] [cursor=pointer]:
                  - /url: "#fnref1:3"
                - link "↩︎" [ref=e421] [cursor=pointer]:
                  - /url: "#fnref2:3"
                - link "↩︎" [ref=e422] [cursor=pointer]:
                  - /url: "#fnref3:3"
            - listitem [ref=e423]:
              - paragraph [ref=e424]:
                - text: Chroma Research, “Context Rot.”
                - link "https://www.chroma.research/context-rot" [ref=e425] [cursor=pointer]:
                  - /url: https://www.chroma.research/context-rot
                - link "↩︎" [ref=e426] [cursor=pointer]:
                  - /url: "#fnref:4"
            - listitem [ref=e427]:
              - paragraph [ref=e428]:
                - text: LangChain, “Context Engineering for Agents.”
                - link "https://www.langchain.com/blog/context-engineering-for-agents" [ref=e429] [cursor=pointer]:
                  - /url: https://www.langchain.com/blog/context-engineering-for-agents
                - link "↩︎" [ref=e430] [cursor=pointer]:
                  - /url: "#fnref:5"
            - listitem [ref=e431]:
              - paragraph [ref=e432]:
                - text: Lance Martin, “Context Engineering,” 2025-06-23.
                - link "https://rlancemartin.github.io/2025/06/23/context_engineering/" [ref=e433] [cursor=pointer]:
                  - /url: https://rlancemartin.github.io/2025/06/23/context_engineering/
                - link "↩︎" [ref=e434] [cursor=pointer]:
                  - /url: "#fnref:6"
            - listitem [ref=e435]:
              - paragraph [ref=e436]:
                - text: Claude Code Docs, “Environment variables.”
                - link "https://code.claude.com/docs/en/env-vars" [ref=e437] [cursor=pointer]:
                  - /url: https://code.claude.com/docs/en/env-vars
                - link "↩︎" [ref=e438] [cursor=pointer]:
                  - /url: "#fnref:7"
            - listitem [ref=e439]:
              - paragraph [ref=e440]:
                - text: Anthropic Claude Cookbook, “Context engineering with tools.”
                - link "https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools" [ref=e441] [cursor=pointer]:
                  - /url: https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
                - link "↩︎" [ref=e442] [cursor=pointer]:
                  - /url: "#fnref:8"
                - link "↩︎" [ref=e443] [cursor=pointer]:
                  - /url: "#fnref1:8"
            - listitem [ref=e444]:
              - paragraph [ref=e445]:
                - text: Anthropic Docs, “Context editing.”
                - link "https://platform.claude.com/docs/en/build-with-claude/context-editing" [ref=e446] [cursor=pointer]:
                  - /url: https://platform.claude.com/docs/en/build-with-claude/context-editing
                - link "↩︎" [ref=e447] [cursor=pointer]:
                  - /url: "#fnref:9"
                - link "↩︎" [ref=e448] [cursor=pointer]:
                  - /url: "#fnref1:9"
            - listitem [ref=e449]:
              - paragraph [ref=e450]:
                - text: Anthropic Docs, “Compaction.”
                - link "https://platform.claude.com/docs/en/build-with-claude/compaction" [ref=e451] [cursor=pointer]:
                  - /url: https://platform.claude.com/docs/en/build-with-claude/compaction
                - link "↩︎" [ref=e452] [cursor=pointer]:
                  - /url: "#fnref:10"
            - listitem [ref=e453]:
              - paragraph [ref=e454]:
                - text: "Manus, “Context Engineering for AI Agents: Lessons from Building Manus.”"
                - link "https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus" [ref=e455] [cursor=pointer]:
                  - /url: https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
                - link "↩︎" [ref=e456] [cursor=pointer]:
                  - /url: "#fnref:11"
                - link "↩︎" [ref=e457] [cursor=pointer]:
                  - /url: "#fnref1:11"
                - link "↩︎" [ref=e458] [cursor=pointer]:
                  - /url: "#fnref2:11"
            - listitem [ref=e459]:
              - paragraph [ref=e460]:
                - text: Databricks, “Introducing Genie One, Genie Ontology, and Genie Agents.”
                - link "https://www.databricks.com/blog/introducing-genie-one-genie-ontology-and-genie-agents" [ref=e461] [cursor=pointer]:
                  - /url: https://www.databricks.com/blog/introducing-genie-one-genie-ontology-and-genie-agents
                - link "↩︎" [ref=e462] [cursor=pointer]:
                  - /url: "#fnref:12"
                - link "↩︎" [ref=e463] [cursor=pointer]:
                  - /url: "#fnref1:12"
            - listitem [ref=e464]:
              - paragraph [ref=e465]:
                - text: “Memory in the Age of AI Agents,” arXiv:2512.13564.
                - link "https://arxiv.org/pdf/2512.13564" [ref=e466] [cursor=pointer]:
                  - /url: https://arxiv.org/pdf/2512.13564
                - link "↩︎" [ref=e467] [cursor=pointer]:
                  - /url: "#fnref:13"
                - link "↩︎" [ref=e468] [cursor=pointer]:
                  - /url: "#fnref1:13"
            - listitem [ref=e469]:
              - paragraph [ref=e470]:
                - text: "“Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory,” arXiv:2504.19413."
                - link "https://arxiv.org/abs/2504.19413" [ref=e471] [cursor=pointer]:
                  - /url: https://arxiv.org/abs/2504.19413
                - link "↩︎" [ref=e472] [cursor=pointer]:
                  - /url: "#fnref:14"
      - region [ref=e473]:
        - generic [ref=e474]:
          - heading "常见问题" [level=2] [ref=e475]
          - generic [ref=e476]: "04"
        - generic [ref=e477]:
          - group [ref=e478]:
            - generic "上下文工程（Context Engineering）是什么？" [ref=e479] [cursor=pointer]
            - generic [ref=e482]:
              - paragraph [ref=e483]: 上下文工程是在 LLM 每一次推理时，对进入上下文窗口的最优 token 集合——系统提示、检索到的文档、对话历史、工具定义与记忆——进行筛选、排序与维护的一整套工程策略。这一定义来自 Anthropic 的工程实践文章，Karpathy 也公开支持用它取代「提示词工程」作为更准确的说法。
              - button "对这个问题继续追问 AI" [ref=e485] [cursor=pointer]
          - group [ref=e491]:
            - generic "上下文工程和提示词工程有什么区别？" [ref=e492] [cursor=pointer]
          - group [ref=e495]:
            - generic "什么是上下文腐烂（Context Rot）？" [ref=e496] [cursor=pointer]
          - group [ref=e499]:
            - generic "上下文工程有哪些主流方法框架？" [ref=e500] [cursor=pointer]
      - complementary "专栏导航：Agent 工程" [ref=e503]:
        - generic [ref=e505]:
          - generic [ref=e506]: 系列专栏
          - link "Agent 工程" [ref=e507] [cursor=pointer]:
            - /url: /zh/columns/agent-engineering/
          - generic [ref=e508]: 第 7 / 9 篇
        - link "接着读 Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点 08 / 09 · 26 分钟" [ref=e509] [cursor=pointer]:
          - /url: /zh/ai-agent/posts/agent-engineering-the-98-percent-harness/
          - generic [ref=e510]: 接着读
          - generic [ref=e511]: Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点
          - generic [ref=e512]:
            - generic [ref=e513]: 08 / 09
            - generic [ref=e514]: ·
            - generic [ref=e515]: 26 分钟
        - list [ref=e518]:
          - listitem [ref=e519]:
            - generic [aria-hidden] [ref=e520]: "01"
            - link "Claude Tag 深度拆解：Slack 里的共享 AI，正在长成组织级 Agent 运行时" [ref=e521] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/claude-tag-organizational-agent-runtime/
          - listitem [ref=e522]:
            - generic [aria-hidden] [ref=e523]: "02"
            - link "Open Design 0.16.1：给 Coding Agent 一张可复用的设计工作台" [ref=e524] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/open-design/
          - listitem [ref=e525]:
            - generic [aria-hidden] [ref=e526]: "03"
            - link "你的 Mac 上有几套工具在打架？我设计了一个开发机体检 Skill" [ref=e527] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/devbox-doctor-design/
          - listitem [ref=e528]:
            - generic [aria-hidden] [ref=e529]: "04"
            - link "Agent Skill 与 SKILL.md 设计：我拆了一个敢删文件的插件" [ref=e530] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/designing-valuable-agent-skills/
          - listitem [ref=e531]:
            - generic [aria-hidden] [ref=e532]: "05"
            - link "open-lovable 源码拆解：Agentic Search、文本协议与双沙箱" [ref=e533] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/dissecting-open-lovable/
          - listitem [ref=e534]:
            - generic [aria-hidden] [ref=e535]: "06"
            - link "Relay Agent 架构审计：从设计承诺到本地实现" [ref=e536] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/relay-agent-architecture-design/
          - listitem [ref=e537]:
            - generic [aria-hidden] [ref=e538]: "07"
            - generic [ref=e539]:
              - text: Context 不是 Prompt：上下文工程如何成为 AI Agent 的新地基
              - generic [ref=e540]: 本篇
          - listitem [ref=e541]:
            - generic [aria-hidden] [ref=e542]: "08"
            - link "Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点" [ref=e543] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/agent-engineering-the-98-percent-harness/
          - listitem [ref=e544]:
            - generic [aria-hidden] [ref=e545]: "09"
            - link "Agent 的自我：从洛克到 OpenClaw" [ref=e546] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/agent-identity-from-locke-to-openclaw/
      - generic [ref=e547]:
        - list [ref=e548]:
          - listitem [ref=e549]:
            - link "Context Engineering" [ref=e550] [cursor=pointer]:
              - /url: https://cubxxw.com/zh/tags/context-engineering/
          - listitem [ref=e551]:
            - link "AI" [ref=e552] [cursor=pointer]:
              - /url: https://cubxxw.com/zh/tags/ai/
          - listitem [ref=e553]:
            - link "LLM" [ref=e554] [cursor=pointer]:
              - /url: https://cubxxw.com/zh/tags/llm/
          - listitem [ref=e555]:
            - link "Agent" [ref=e556] [cursor=pointer]:
              - /url: https://cubxxw.com/zh/tags/agent/
          - listitem [ref=e557]:
            - link "MCP" [ref=e558] [cursor=pointer]:
              - /url: https://cubxxw.com/zh/tags/mcp/
        - navigation "文章导航" [ref=e559]:
          - link "上一篇 Relay Agent 架构审计：从设计承诺到本地实现" [ref=e560] [cursor=pointer]:
            - /url: https://cubxxw.com/zh/ai-agent/posts/relay-agent-architecture-design/
            - generic [ref=e561]: 上一篇
            - generic [ref=e564]: Relay Agent 架构审计：从设计承诺到本地实现
          - link "下一篇 Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点" [ref=e565] [cursor=pointer]:
            - /url: https://cubxxw.com/zh/ai-agent/posts/agent-engineering-the-98-percent-harness/
            - generic [ref=e566]: 下一篇
            - generic [ref=e569]: Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点
        - generic [ref=e570]:
          - generic [ref=e571]: 分享这篇文章
          - generic [ref=e573]:
            - button "生成文章分享卡" [ref=e574] [cursor=pointer]:
              - generic [ref=e575]: 分享卡片
            - button "复制链接" [ref=e576] [cursor=pointer]
            - button "分享到微信" [ref=e580] [cursor=pointer]
            - link "分享到 X / Twitter" [ref=e583] [cursor=pointer]:
              - /url: https://x.com/intent/tweet/?text=Context+%E4%B8%8D%E6%98%AF+Prompt%EF%BC%9A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E5%A6%82%E4%BD%95%E6%88%90%E4%B8%BA+AI+Agent+%E7%9A%84%E6%96%B0%E5%9C%B0%E5%9F%BA+%E2%80%94+%E6%9C%AC%E6%96%87%E4%BB%8E+Anthropic+%E4%B8%8E+Sourcegraph+%E7%9A%84%E4%BB%A3%E8%A1%A8%E6%80%A7%E6%A1%86%E6%9E%B6%E5%87%BA%E5%8F%91%EF%BC%8C%E8%A7%A3%E9%87%8A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E4%B8%8E%E6%8F%90%E7%A4%BA%E8%AF%8D%E5%B7%A5%E7%A8%8B%E7%9A%84%E8%BE%B9%E7%95%8C%EF%BC%8C%E5%B9%B6%E6%A0%B8%E5%AF%B9%E4%B8%8A%E4%B8%8B%E6%96%87%E8%85%90%E7%83%82%E3%80%81%E6%A3%80%E7%B4%A2%E9%87%8D%E6%8E%92%E3%80%81Claude+Code+%E8%87%AA%E5%8A%A8%E5%8E%8B%E7%BC%A9%E3%80%81%E6%9C%8D%E5%8A%A1%E7%AB%AF+compaction+%E4%B8%8E%E8%AE%B0%E5%BF%86%E7%B3%BB%E7%BB%9F%E3%80%82%E9%9D%A2%E5%90%91+AI+Agent+%E5%B7%A5%E7%A8%8B%E2%80%A6&url=https%3a%2f%2fcubxxw.com%2fzh%2fai-agent%2fposts%2fcontext-engineering-the-new-foundation%2f&hashtags=ContextEngineering%2cAI%2cLLM%2cAgent%2cMCP
            - link "通过邮件分享" [ref=e586] [cursor=pointer]:
              - /url: mailto:?subject=Context+%E4%B8%8D%E6%98%AF+Prompt%EF%BC%9A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E5%A6%82%E4%BD%95%E6%88%90%E4%B8%BA+AI+Agent+%E7%9A%84%E6%96%B0%E5%9C%B0%E5%9F%BA&body=Context+%E4%B8%8D%E6%98%AF+Prompt%EF%BC%9A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E5%A6%82%E4%BD%95%E6%88%90%E4%B8%BA+AI+Agent+%E7%9A%84%E6%96%B0%E5%9C%B0%E5%9F%BA%0A%0A%E6%9C%AC%E6%96%87%E4%BB%8E+Anthropic+%E4%B8%8E+Sourcegraph+%E7%9A%84%E4%BB%A3%E8%A1%A8%E6%80%A7%E6%A1%86%E6%9E%B6%E5%87%BA%E5%8F%91%EF%BC%8C%E8%A7%A3%E9%87%8A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E4%B8%8E%E6%8F%90%E7%A4%BA%E8%AF%8D%E5%B7%A5%E7%A8%8B%E7%9A%84%E8%BE%B9%E7%95%8C%EF%BC%8C%E5%B9%B6%E6%A0%B8%E5%AF%B9%E4%B8%8A%E4%B8%8B%E6%96%87%E8%85%90%E7%83%82%E3%80%81%E6%A3%80%E7%B4%A2%E9%87%8D%E6%8E%92%E3%80%81Claude+Code+%E8%87%AA%E5%8A%A8%E5%8E%8B%E7%BC%A9%E3%80%81%E6%9C%8D%E5%8A%A1%E7%AB%AF+compaction+%E4%B8%8E%E8%AE%B0%E5%BF%86%E7%B3%BB%E7%BB%9F%E3%80%82%E9%9D%A2%E5%90%91+AI+Agent+%E5%B7%A5%E7%A8%8B%E2%80%A6%0A%0Ahttps%3A%2F%2Fcubxxw.com%2Fzh%2Fai-agent%2Fposts%2Fcontext-engineering-the-new-foundation%2F%0A%0ATopics%3A+AI+Agent%0ATags%3A+Context+Engineering%2C+AI%2C+LLM%2C+Agent%2C+MCP
            - link "分享到 LinkedIn" [ref=e590] [cursor=pointer]:
              - /url: https://www.linkedin.com/shareArticle?mini=true&url=https%3a%2f%2fcubxxw.com%2fzh%2fai-agent%2fposts%2fcontext-engineering-the-new-foundation%2f&title=Context+%E4%B8%8D%E6%98%AF+Prompt%EF%BC%9A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E5%A6%82%E4%BD%95%E6%88%90%E4%B8%BA+AI+Agent+%E7%9A%84%E6%96%B0%E5%9C%B0%E5%9F%BA&summary=%E6%9C%AC%E6%96%87%E4%BB%8E+Anthropic+%E4%B8%8E+Sourcegraph+%E7%9A%84%E4%BB%A3%E8%A1%A8%E6%80%A7%E6%A1%86%E6%9E%B6%E5%87%BA%E5%8F%91%EF%BC%8C%E8%A7%A3%E9%87%8A%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B%E4%B8%8E%E6%8F%90%E7%A4%BA%E8%AF%8D%E5%B7%A5%E7%A8%8B%E7%9A%84%E8%BE%B9%E7%95%8C%EF%BC%8C%E5%B9%B6%E6%A0%B8%E5%AF%B9%E4%B8%8A%E4%B8%8B%E6%96%87%E8%85%90%E7%83%82%E3%80%81%E6%A3%80%E7%B4%A2%E9%87%8D%E6%8E%92%E3%80%81Claude+Code+%E8%87%AA%E5%8A%A8%E5%8E%8B%E7%BC%A9%E3%80%81%E6%9C%8D%E5%8A%A1%E7%AB%AF+compaction+%E4%B8%8E%E8%AE%B0%E5%BF%86%E7%B3%BB%E7%BB%9F%E3%80%82%E9%9D%A2%E5%90%91+AI+Agent+%E5%B7%A5%E7%A8%8B%E2%80%A6&source=https%3a%2f%2fcubxxw.com%2fzh%2fai-agent%2fposts%2fcontext-engineering-the-new-foundation%2f
            - button "分享" [ref=e595] [cursor=pointer]
            - button "更多" [ref=e602] [cursor=pointer]
        - dialog [aria-hidden] [ref=e607]:
          - generic [ref=e609]: 分享到
      - region "读者回响" [ref=e610]:
        - generic [ref=e611]:
          - heading "读者回响" [level=3] [ref=e612]
          - generic [ref=e613]:
            - generic [ref=e614]: —
            - generic [ref=e615]: 加入讨论
    - button "目录" [ref=e617] [cursor=pointer]
    - dialog [aria-hidden] [ref=e618]:
      - tablist [ref=e620]:
        - tab [selected] [ref=e621] [cursor=pointer]:
          - generic [ref=e623]: 目录
        - tab [ref=e624] [cursor=pointer]:
          - generic [ref=e629]: AI
        - tab [ref=e630] [cursor=pointer]:
          - generic [ref=e637]: 分享
      - tabpanel [ref=e639]:
        - navigation [ref=e640]:
          - list [ref=e641]:
            - listitem [ref=e642]:
              - link [ref=e643] [cursor=pointer]:
                - /url: "#%e5%85%88%e6%8a%8a%e8%be%b9%e7%95%8c%e5%88%92%e6%b8%85%e6%a5%9aprompt-%e4%b8%8e-context-%e4%b8%8d%e6%98%af%e5%90%8c%e4%b8%80%e4%bb%b6%e4%ba%8b"
                - text: 先把边界划清楚：Prompt 与 Context 不是同一件事
            - listitem [ref=e644]:
              - link [ref=e645] [cursor=pointer]:
                - /url: "#%e4%b8%ba%e4%bb%80%e4%b9%88%e6%98%af%e5%b7%a5%e7%a8%8b%e4%b8%8a%e4%b8%8b%e6%96%87%e6%98%af%e6%9c%89%e9%99%90%e8%b5%84%e6%ba%90%e8%80%8c%e4%b8%94%e4%bc%9a%e8%85%90%e7%83%82"
                - text: 为什么是「工程」：上下文是有限资源，而且会腐烂
            - listitem [ref=e646]:
              - link [ref=e647] [cursor=pointer]:
                - /url: "#%e4%b8%a4%e5%a5%97%e4%bb%a3%e8%a1%a8%e6%80%a7%e6%a1%86%e6%9e%b6%e4%bb%8e%e5%8a%a8%e4%bd%9c%e4%b8%8e%e5%af%b9%e8%b1%a1%e7%9c%8b%e5%90%8c%e4%b8%80%e6%89%87%e7%aa%97"
                - text: 两套代表性框架：从动作与对象看同一扇窗
            - listitem [ref=e648]:
              - link [ref=e649] [cursor=pointer]:
                - /url: "#%e7%ac%ac%e4%b8%80%e5%a5%97langchain--lance-martinwrite--select--compress--isolate"
                - text: 第一套（LangChain / Lance Martin）：Write / Select / Compress / Isolate
            - listitem [ref=e650]:
              - link [ref=e651] [cursor=pointer]:
                - /url: "#%e7%ac%ac%e4%ba%8c%e5%a5%97sourcegraphinstructions--retrieval--memory--tools"
                - text: 第二套（Sourcegraph）：Instructions / Retrieval / Memory / Tools
            - listitem [ref=e652]:
              - link [ref=e653] [cursor=pointer]:
                - /url: "#%e8%90%bd%e5%88%b0%e5%9c%b0%e4%b8%8a%e9%82%a3%e4%ba%9b%e5%b7%b2%e7%bb%8f%e5%9c%a8%e8%b7%91%e7%9a%84%e8%ae%be%e8%ae%a1%e6%a8%a1%e5%bc%8f"
                - text: 落到地上：那些已经在跑的设计模式
            - listitem [ref=e654]:
              - link [ref=e655] [cursor=pointer]:
                - /url: "#%e6%a3%80%e7%b4%a2%e5%90%8e%e9%87%8d%e6%8e%92%e4%bb%8e-50--top-5-%e7%9a%84%e7%bb%8f%e9%aa%8c%e7%a4%ba%e6%84%8f%e8%af%b4%e8%b5%b7"
                - text: 检索后重排：从 50 → top-5 的经验示意说起
            - listitem [ref=e656]:
              - link [ref=e657] [cursor=pointer]:
                - /url: "#%e5%9c%a8%e8%bf%9b%e7%aa%97%e5%8f%a3%e4%b9%8b%e5%89%8d%e5%b0%b1%e7%a0%8d%e8%80%8c%e4%b8%8d%e6%98%af%e8%bf%9b%e5%8e%bb%e4%b9%8b%e5%90%8e%e5%86%8d%e5%90%8e%e6%82%94"
                - text: 在进窗口之前就砍，而不是进去之后再后悔
            - listitem [ref=e658]:
              - link [ref=e659] [cursor=pointer]:
                - /url: "#%e5%8e%8b%e7%bc%a9%e5%bc%8f-compactionclaude-code-%e5%9c%a8%e7%aa%97%e5%8f%a3%e5%b0%86%e6%bb%a1%e6%97%b6%e8%87%aa%e5%8a%a8%e6%94%b6%e6%9d%9f"
                - text: 压缩式 compaction：Claude Code 在窗口将满时自动收束
            - listitem [ref=e660]:
              - link [ref=e661] [cursor=pointer]:
                - /url: "#anthropic-%e6%8a%8a%e4%b8%8a%e4%b8%8b%e6%96%87%e7%ae%a1%e7%90%86%e5%81%9a%e8%bf%9b%e4%ba%86-api"
                - text: Anthropic 把上下文管理做进了 API
            - listitem [ref=e662]:
              - link [ref=e663] [cursor=pointer]:
                - /url: "#kv-cache-%e5%91%bd%e4%b8%ad%e7%8e%87%e7%94%9f%e4%ba%a7%e7%8e%af%e5%a2%83%e9%87%8c%e8%a2%ab%e4%bd%8e%e4%bc%b0%e7%9a%84%e9%82%a3%e6%9d%a1%e5%91%bd%e8%84%89"
                - text: KV-cache 命中率：生产环境里被低估的那条命脉
            - listitem [ref=e664]:
              - link [ref=e665] [cursor=pointer]:
                - /url: "#%e6%8a%8a%e5%8e%82%e5%95%86%e7%9a%84%e5%8a%a8%e4%bd%9c%e6%94%be%e8%bf%9b%e6%9d%a5%e5%bd%93%e4%b8%8a%e4%b8%8b%e6%96%87%e5%b1%82%e5%8f%98%e6%88%90%e4%ba%a7%e5%93%81"
                - text: 把厂商的动作放进来：当「上下文层」变成产品
            - listitem [ref=e666]:
              - link [ref=e667] [cursor=pointer]:
                - /url: "#%e4%b8%8a%e4%b8%8b%e6%96%87-vs-%e8%ae%b0%e5%bf%86%e4%b8%80%e6%89%87%e7%aa%97%e5%92%8c%e7%aa%97%e5%a4%96%e9%82%a3%e6%9d%a1%e6%b2%b3"
                - text: 上下文 vs 记忆：一扇窗，和窗外那条河
            - listitem [ref=e668]:
              - link [ref=e669] [cursor=pointer]:
                - /url: "#%e6%88%91%e7%9a%84%e5%88%a4%e6%96%ad%e4%b8%8a%e4%b8%8b%e6%96%87%e7%9a%84%e5%b0%bd%e5%a4%b4%e6%98%af%e4%b8%80%e6%9d%a1%e4%b8%96%e7%95%8c%e7%ba%bf"
                - text: 我的判断：上下文的尽头，是一条「世界线」
            - listitem [ref=e670]:
              - link [ref=e671] [cursor=pointer]:
                - /url: "#%e9%99%84%e8%bf%99%e7%af%87%e6%96%87%e7%ab%a0%e7%9a%84%e4%ba%8b%e5%ae%9e%e7%ba%aa%e5%be%8b"
                - text: 附：这篇文章的事实纪律
    - generic [ref=e672]:
      - generic [ref=e673]:
        - generic [ref=e674]: 继续阅读
        - heading "相关文章 / Related Posts" [level=3] [ref=e675]
      - generic [ref=e676]:
        - link "AI Agent Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点 2026-06-17 26 min" [ref=e677] [cursor=pointer]:
          - /url: /zh/ai-agent/posts/agent-engineering-the-98-percent-harness/
          - generic [ref=e679]:
            - generic [ref=e680]:
              - generic [ref=e681]: AI
              - generic [ref=e682]: Agent
            - paragraph [ref=e683]: Agent Engineering 全景地图：98.4% 只是 Harness 的叙事锚点
            - generic [ref=e684]:
              - generic [ref=e685]: 2026-06-17
              - generic [aria-hidden] [ref=e686]: ·
              - generic [ref=e687]: 26 min
          - generic [aria-hidden] [ref=e688]: →
        - link "Development AI 一个人如何维护自己的界面：用 Figma、Figwright 与 AI 搭建设计系统 2026-09-26 23 min" [ref=e689] [cursor=pointer]:
          - /url: /zh/engineering/posts/2026-09-26-figma-figwright-personal-design-system/
          - generic [ref=e691]:
            - generic [ref=e692]:
              - generic [ref=e693]: Development
              - generic [ref=e694]: AI
            - paragraph [ref=e695]: 一个人如何维护自己的界面：用 Figma、Figwright 与 AI 搭建设计系统
            - generic [ref=e696]:
              - generic [ref=e697]: 2026-09-26
              - generic [aria-hidden] [ref=e698]: ·
              - generic [ref=e699]: 23 min
          - generic [aria-hidden] [ref=e700]: →
        - link "AI Agent Claude Code 的扩展语法：一条仓库修改怎样逐级获得控制 2026-08-07 13 min" [ref=e701] [cursor=pointer]:
          - /url: /zh/ai-agent/posts/agent-system-design-claude-code/
          - generic [ref=e703]:
            - generic [ref=e704]:
              - generic [ref=e705]: AI
              - generic [ref=e706]: Agent
            - paragraph [ref=e707]: Claude Code 的扩展语法：一条仓库修改怎样逐级获得控制
            - generic [ref=e708]:
              - generic [ref=e709]: 2026-08-07
              - generic [aria-hidden] [ref=e710]: ·
              - generic [ref=e711]: 13 min
          - generic [aria-hidden] [ref=e712]: →
  - region "邮件订阅" [ref=e713]:
    - generic [ref=e716]:
      - generic [ref=e717]:
        - heading "新文章写好，先寄给你" [level=2] [ref=e718]
        - paragraph [ref=e719]: 每有新文章，寄一封信到你的邮箱。双重确认，随时退订。
      - generic [ref=e720]:
        - generic [ref=e721]:
          - generic [ref=e722]: 邮箱地址
          - textbox "邮箱地址" [ref=e723]:
            - /placeholder: you@example.com
        - button "订阅" [ref=e724] [cursor=pointer]
        - textbox [aria-hidden] [ref=e727]
      - paragraph [ref=e728]
      - generic [ref=e729]:
        - generic [ref=e730]: 更喜欢 RSS？
        - link "全部 · RSS" [ref=e731] [cursor=pointer]:
          - /url: /zh/index.xml
        - link "JSON" [ref=e732] [cursor=pointer]:
          - /url: /zh/feed.json
        - link "OPML" [ref=e733] [cursor=pointer]:
          - /url: /zh/subscriptions.opml
        - link "Growth & Life" [ref=e735] [cursor=pointer]:
          - /url: /zh/growth/index.xml
        - link "AI Agent" [ref=e736] [cursor=pointer]:
          - /url: /zh/ai-agent/index.xml
        - link "Engineering" [ref=e737] [cursor=pointer]:
          - /url: /zh/engineering/index.xml
        - link "空间 · CUBXXW OS" [ref=e738] [cursor=pointer]:
          - /url: /zh/projects/index.xml
        - link "所有文章" [ref=e739] [cursor=pointer]:
          - /url: /zh/articles/index.xml
  - contentinfo "站点导航" [ref=e740]:
    - generic [ref=e741]:
      - generic [ref=e742]:
        - paragraph [ref=e743]: 继续读
        - list [ref=e744]:
          - listitem [ref=e745]:
            - link "专栏" [ref=e746] [cursor=pointer]:
              - /url: /zh/columns/
          - listitem [ref=e747]:
            - link "AI Agent" [ref=e748] [cursor=pointer]:
              - /url: /zh/ai-agent/
          - listitem [ref=e749]:
            - link "工程" [ref=e750] [cursor=pointer]:
              - /url: /zh/engineering/
          - listitem [ref=e751]:
            - link "成长" [ref=e752] [cursor=pointer]:
              - /url: /zh/growth/
          - listitem [ref=e753]:
            - link "全部文章" [ref=e754] [cursor=pointer]:
              - /url: /zh/articles/
          - listitem [ref=e755]:
            - link "归档" [ref=e756] [cursor=pointer]:
              - /url: /zh/archives/
          - listitem [ref=e757]:
            - link "旅行" [ref=e758] [cursor=pointer]:
              - /url: /zh/travel/
      - generic [ref=e759]:
        - paragraph [ref=e760]: 产品
        - list [ref=e761]:
          - listitem [ref=e762]:
            - link "Talent Signal" [ref=e763] [cursor=pointer]:
              - /url: /zh/projects/#talent-signal
          - listitem [ref=e764]:
            - link "IMStage" [ref=e765] [cursor=pointer]:
              - /url: /zh/projects/#imstage
          - listitem [ref=e766]:
            - link "Solo Compass" [ref=e767] [cursor=pointer]:
              - /url: /zh/projects/#solo-compass
          - listitem [ref=e768]:
            - link "DayPage" [ref=e769] [cursor=pointer]:
              - /url: /zh/projects/#daypage
          - listitem [ref=e770]:
            - link "Telepace" [ref=e771] [cursor=pointer]:
              - /url: /zh/projects/#telepace
          - listitem [ref=e772]:
            - link "Apply Agent" [ref=e773] [cursor=pointer]:
              - /url: /zh/projects/#apply-agent
          - listitem [ref=e774]:
            - link "Agent Diff Guard" [ref=e775] [cursor=pointer]:
              - /url: /zh/projects/#agent-diff-guard
          - listitem [ref=e776]:
            - link "全部产品 →" [ref=e777] [cursor=pointer]:
              - /url: /zh/projects/#studio-products
      - generic [ref=e778]:
        - paragraph [ref=e779]: 订阅与联系
        - list [ref=e780]:
          - listitem [ref=e781]:
            - link "关于 · 阅读地图" [ref=e782] [cursor=pointer]:
              - /url: /zh/about/
          - listitem [ref=e783]:
            - link "RSS" [ref=e784] [cursor=pointer]:
              - /url: /zh/index.xml
          - listitem [ref=e785]:
            - link "JSON Feed" [ref=e786] [cursor=pointer]:
              - /url: /zh/feed.json
          - listitem [ref=e787]:
            - link "GitHub" [ref=e788] [cursor=pointer]:
              - /url: https://github.com/cubxxw
          - listitem [ref=e789]:
            - link "邮件" [ref=e790] [cursor=pointer]:
              - /url: mailto:3293172751nss@gmail.com
  - contentinfo [ref=e791]:
    - generic [ref=e792]:
      - text: © 2026
      - link "熊鑫伟（cubxxw）· 公开的实践与思想档案" [ref=e793] [cursor=pointer]:
        - /url: https://cubxxw.com/zh/
  - progressbar "Reading progress" [ref=e794]
  - status
  - status
  - region "脚注预览" [ref=e795]:
    - group "脚注内容" [active] [ref=e796]:
      - paragraph [ref=e797]:
        - text: Anthropic, “Effective context engineering for AI agents.”
        - link "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" [ref=e798] [cursor=pointer]:
          - /url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
      - paragraph [ref=e799]: "Long note fixture 0: reference context remains readable in the bounded preview."
      - paragraph [ref=e800]: "Long note fixture 1: reference context remains readable in the bounded preview."
      - paragraph [ref=e801]: "Long note fixture 2: reference context remains readable in the bounded preview."
      - paragraph [ref=e802]: "Long note fixture 3: reference context remains readable in the bounded preview."
      - paragraph [ref=e803]: "Long note fixture 4: reference context remains readable in the bounded preview."
      - paragraph [ref=e804]: "Long note fixture 5: reference context remains readable in the bounded preview."
      - paragraph [ref=e805]: "Long note fixture 6: reference context remains readable in the bounded preview."
      - paragraph [ref=e806]: "Long note fixture 7: reference context remains readable in the bounded preview."
      - paragraph [ref=e807]: "Long note fixture 8: reference context remains readable in the bounded preview."
      - paragraph [ref=e808]: "Long note fixture 9: reference context remains readable in the bounded preview."
      - paragraph [ref=e809]: "Long note fixture 10: reference context remains readable in the bounded preview."
      - paragraph [ref=e810]: "Long note fixture 11: reference context remains readable in the bounded preview."
      - paragraph [ref=e811]: "Long note fixture 12: reference context remains readable in the bounded preview."
      - paragraph [ref=e812]: "Long note fixture 13: reference context remains readable in the bounded preview."
      - paragraph [ref=e813]: "Long note fixture 14: reference context remains readable in the bounded preview."
      - paragraph [ref=e814]: "Long note fixture 15: reference context remains readable in the bounded preview."
      - paragraph [ref=e815]: "Long note fixture 16: reference context remains readable in the bounded preview."
      - paragraph [ref=e816]: "Long note fixture 17: reference context remains readable in the bounded preview."
      - paragraph [ref=e817]: "Long note fixture 18: reference context remains readable in the bounded preview."
      - paragraph [ref=e818]: "Long note fixture 19: reference context remains readable in the bounded preview."
      - paragraph [ref=e819]: "Long note fixture 20: reference context remains readable in the bounded preview."
      - paragraph [ref=e820]: "Long note fixture 21: reference context remains readable in the bounded preview."
      - paragraph [ref=e821]: "Long note fixture 22: reference context remains readable in the bounded preview."
      - paragraph [ref=e822]: "Long note fixture 23: reference context remains readable in the bounded preview."
    - link "查看脚注 ↓" [ref=e823] [cursor=pointer]:
      - /url: "#fn:1"
  - generic [ref=e824]: 按向下方向键进入脚注预览，按回车跳到脚注。
```

# Test source

```ts
  1   | import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
  2   | 
  3   | test.use({channel:'chromium',reducedMotion:'reduce'});
  4   | const article=(locale='zh')=>`${locale==='zh'?'/zh':''}/ai-agent/posts/context-engineering-the-new-foundation/`;
  5   | const marker=(page:Page)=>page.locator('.post-content a.footnote-ref').first();
  6   | const preview=(page:Page)=>page.locator('#fn-preview-popover');
  7   | const more=(page:Page)=>page.locator('.fn-popover__more');
  8   | async function center(ref:Locator){
  9   |   await ref.scrollIntoViewIfNeeded();
  10  |   await ref.evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:scrollY+r.y+r.height/2-innerHeight/2,behavior:'instant'});});
  11  |   await ref.page().evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  12  | }
  13  | async function tap(ref:Locator){
  14  |   const box=(await ref.boundingBox())!;await ref.page().touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  15  | }
  16  | async function actionGeometry(action:Locator){
  17  |   const box=(await action.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  18  |   expect(await action.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  19  |   expect(await action.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);return box;
  20  | }
  21  | async function openPreview(ref:Locator){
  22  |   await tap(ref);await expect(preview(ref.page())).toHaveAttribute('aria-hidden','false');
  23  |   await expect.poll(()=>preview(ref.page()).evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  24  | }
  25  | async function targetFor(ref:Locator){
  26  |   const href=(await ref.getAttribute('href'))!;return {href,target:ref.page().locator(`[id=${JSON.stringify(decodeURIComponent(href.slice(1)))}]`)};
  27  | }
  28  | 
  29  | for(const locale of ['zh','en'])test.describe(`${locale} coarse native footnotes`,()=>{
  30  |   test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:locale==='zh'?'reduce':'no-preference'});
  31  |   test('first tap keeps the reading point; second tap and More retain native history and Back',async({page})=>{
  32  |     await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),locale==='en');
  33  |     await page.goto(article(locale));const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);
  34  |     const before=await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}));
  35  |     await openPreview(ref);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);expect(await page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  36  |     await expect(preview(page)).toHaveAttribute('role','region');await expect(preview(page)).toHaveAttribute('aria-label',locale==='zh'?'脚注预览':'Footnote preview');await expect(preview(page)).not.toHaveAttribute('aria-modal',/./);
  37  |     await expect(more(page)).toHaveAttribute('href',href);await actionGeometry(more(page));expect(await preview(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  38  |     await tap(ref);await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();expect(await page.evaluate(()=>history.length)).toBe(before.history+1);await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  39  |     await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  40  |     await openPreview(ref);const box=await actionGeometry(more(page));await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  41  |     await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  42  |     await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  43  |   });
  44  | });
  45  | 
  46  | for(const locale of ['zh','en'])test.describe(`${locale} fine keyboard footnotes`,()=>{
  47  |   test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  48  |   test('Tab discovers ArrowDown entry; internal citation focus survives and Escape returns without reopening',async({page})=>{
  49  |     await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),locale==='en');await page.goto(article(locale));const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);await page.mouse.move(2,2);
  50  |     // A programmatic preceding-control setup, followed by the actual Tab
  51  |     // into the marker. This is a local keyboard contract, not a whole-page audit.
  52  |     await ref.evaluate(el=>{const nodes=Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,textarea,[tabindex]')).filter(n=>n.tabIndex>=0&&!n.matches(':disabled')&&n.getClientRects().length&&!n.closest('[inert]')&&getComputedStyle(n).visibility!=='hidden');const previous=nodes[nodes.indexOf(el as HTMLElement)-1];if(!previous)throw new Error('No preceding keyboard control');previous.focus({preventScroll:true});});
  53  |     await page.keyboard.press('Tab');await expect(ref).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');await expect(ref).toHaveAttribute('aria-keyshortcuts',/ArrowDown/);await expect(ref).toHaveAttribute('aria-controls',/fn-preview-popover/);await expect(ref).toHaveAttribute('aria-describedby',/fn-preview-keyboard-help/);
  54  |     const y=await page.evaluate(()=>scrollY);await page.keyboard.press('ArrowDown');const body=page.locator('.fn-popover__body');await expect(body).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(y);
  55  |     const citation=body.locator('a[href]').first();const originalCitation=await citation.getAttribute('href');await page.keyboard.press('Tab');await expect(citation).toBeFocused();await page.waitForTimeout(250);await expect(citation).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');expect(await citation.getAttribute('href')).toBe(originalCitation);
  56  |     await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();await actionGeometry(more(page));await page.keyboard.press('Escape');await expect(ref).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(await preview(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);await page.waitForTimeout(250);await expect(preview(page)).toBeHidden();await expect(ref).toBeFocused();
  57  |     await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('.fn-popover'))).toBe(false);
  58  |     await ref.focus();await page.keyboard.press('Enter');await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  59  |   });
  60  | });
  61  | 
  62  | test.describe('bounded short-screen footnote',()=>{
  63  |   test.use({viewport:{width:568,height:224},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  64  |   test('a long-note fixture scrolls inside the region without moving the article or clipping More',async({page})=>{
  65  |     await page.goto(article());const ref=marker(page);
  66  |     // Local long-content fixture only; the public note remains unchanged.
  67  |     await ref.evaluate(el=>{const note=document.getElementById(decodeURIComponent(el.getAttribute('href')!.slice(1)))!;for(let i=0;i<24;i++){const p=document.createElement('p');p.textContent=`Long note fixture ${i}: reference context remains readable in the bounded preview.`;note.appendChild(p);}});
  68  |     await center(ref);const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await openPreview(ref);const pop=preview(page),body=page.locator('.fn-popover__body');const box=(await pop.boundingBox())!;
  69  |     expect(box.x).toBeGreaterThanOrEqual(12);expect(box.y).toBeGreaterThanOrEqual(12);expect(box.x+box.width).toBeLessThanOrEqual(568-12);expect(box.y+box.height).toBeLessThanOrEqual(224-12+.1);await actionGeometry(more(page));
  70  |     expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);const bounds=(await body.boundingBox())!;await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.wheel(0,420);await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(pop).toHaveAttribute('aria-hidden','false');await actionGeometry(more(page));
  71  |     await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).transform)).toBe('none');await actionGeometry(more(page));await body.focus();await page.keyboard.press('End');await expect.poll(()=>body.evaluate(el=>Math.abs(el.scrollHeight-el.clientHeight-el.scrollTop)<2)).toBe(true);
> 72  |     await page.mouse.wheel(0,420);await page.waitForTimeout(100);expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(pop).toHaveAttribute('aria-hidden','false');await actionGeometry(more(page));await page.keyboard.press('Escape');await expect(ref).toBeFocused();await expect(pop).toHaveAttribute('aria-hidden','true');
      |                                                                                                           ^ Error: expect(received).toBe(expected) // Object.is equality
  73  |   });
  74  | });
  75  | 
  76  | test.describe('coarse click intent',()=>{
  77  |   test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  78  |   test('modifiers, non-primary, AT, Space and missing or malformed definitions retain native intent',async({page})=>{
  79  |     const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(article());const ref=marker(page);await center(ref);
  80  |     const decisions=await ref.evaluate(el=>{
  81  |       const recorded:boolean[]=[];const observe=(event:MouseEvent)=>{if(event.target===el){recorded.push(event.defaultPrevented);event.preventDefault();}};document.addEventListener('click',observe);
  82  |       // Record the component's decision before this test alone blocks the
  83  |       // default action, avoiding any navigation/new-tab side effect.
  84  |       for(const flags of [{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{button:1},{detail:0}])el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1,...flags}));
  85  |       const href=el.getAttribute('href')!;for(const value of ['#missing-footnote-fixture','#%E0%A4%A','#empty-footnote-fixture']){if(value==='#empty-footnote-fixture'){const empty=document.createElement('div');empty.id='empty-footnote-fixture';document.body.appendChild(empty);}el.setAttribute('href',value);el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1}));}el.setAttribute('href',href);document.removeEventListener('click',observe);return recorded;
  86  |     });expect(decisions).toEqual(Array(9).fill(false));await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  87  |     await ref.focus();const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(errors).toEqual([]);
  88  |   });
  89  | });
  90  | 
  91  | test.describe('native fallback without JavaScript',()=>{
  92  |   test.use({javaScriptEnabled:false,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  93  |   test('the original marker navigates to the complete note and browser Back restores its reading point',async({page})=>{
  94  |     await page.goto(article());const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await tap(ref);await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveCount(0);
  95  |     const top=await target.evaluate(el=>el.getBoundingClientRect().top),headerBottom=await page.locator('.header').evaluate(el=>el.getBoundingClientRect().bottom);expect(top).toBeGreaterThanOrEqual(headerBottom-1);
  96  |     await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  97  |   });
  98  | });
  99  | 
  100 | test.describe('owned preview timers',()=>{
  101 |   test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  102 |   test('an old hover timer cannot replace a newer focused marker or hide its citation; existing ARIA survives',async({page})=>{
  103 |     await page.addInitScript(()=>{
  104 |       const observer=new MutationObserver(()=>{const ref=document.querySelector('.post-content a.footnote-ref');if(!ref||ref.hasAttribute('data-existing-aria'))return;ref.setAttribute('data-existing-aria','true');ref.setAttribute('aria-describedby','existing-note-description');ref.setAttribute('aria-controls','existing-note-control');ref.setAttribute('aria-keyshortcuts','Alt+N');for(const id of ['existing-note-description','existing-note-control']){const span=document.createElement('span');span.id=id;span.hidden=true;span.textContent='Existing relationship fixture';document.body.appendChild(span);}observer.disconnect();});observer.observe(document,{childList:true,subtree:true});
  105 |     });
  106 |     await page.goto(article());const refs=page.locator('.post-content a.footnote-ref'),a=refs.nth(0),b=refs.nth(1);await center(a);const role=await a.getAttribute('role');await page.mouse.move(2,2);await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  107 |     await a.hover();await b.focus();const href=await b.getAttribute('href');await page.clock.fastForward(120);await expect(more(page)).toHaveAttribute('href',href!);await expect(b).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');
  108 |     await b.press('ArrowDown');const citation=page.locator('.fn-popover__body a[href]').first();await page.keyboard.press('Tab');await expect(citation).toBeFocused();await page.clock.fastForward(250);await expect(citation).toBeFocused();await expect(more(page)).toHaveAttribute('href',href!);
  109 |     await page.locator('[data-search-trigger="nav"]:visible').first().focus();await a.dispatchEvent('mouseleave');await page.clock.fastForward(250);await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(await preview(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await page.evaluate(()=>document.activeElement?.matches('[data-search-trigger="nav"]'))).toBe(true);
  110 |     await expect(a).toHaveAttribute('aria-describedby',/existing-note-description/);await expect(a).toHaveAttribute('aria-describedby',/fn-preview-keyboard-help/);await expect(a).toHaveAttribute('aria-controls',/existing-note-control/);await expect(a).toHaveAttribute('aria-controls',/fn-preview-popover/);await expect(a).toHaveAttribute('aria-keyshortcuts',/Alt\+N/);expect(await a.getAttribute('role')).toBe(role);
  111 |   });
  112 | });
  113 | 
```