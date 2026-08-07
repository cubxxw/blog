---
title: '给 Agent 一台电脑之后：Manus 如何把回复变成交付物'
date: 2026-08-07T17:15:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Product Strategy
  - Security
  - Automation
  - Cloud
description: >
  基于 Manus 2026-08-07 第一方资料，拆开临时 Sandbox、持久 Cloud Computer、Cloud Browser、Browser Operator 与 Wide Research。文章解释计算机如何把回复升级为可验收工件和持续服务，也说明登录态、外部副作用与恢复责任为何仍在 VM 边界外。
tldr:
  - Manus 可验证的创新不是“模型更会规划”，而是把任务绑定到完整执行环境，并把报告、网站、数据集、代码或持续服务变成用户验收对象。
  - “computer as body”只能作为产品隐喻。公开资料证明 VM 承载副作用和工作状态，不能证明模型、planner、loop 或控制面也运行在同一 VM。
  - 临时 Sandbox、持久 Cloud Computer、Cloud Browser 与本地 Browser Operator 是不同信任域；它们对文件持久性、登录态、IP、运维和错误爆炸半径作出不同选择。
  - artifact 比 intermediate working state 更耐久、更适合分享和检查；但系统宣告 finish 不等于工件正确，更不等于外部网站上的写入可以撤销。
  - VM 重建只能修复 VM 内状态。邮件、CRM、表单、发布、DNS、订单、交易、费用和第三方通知一旦发生，必须依靠目标系统的补偿流程。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 4
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/04-manus/manus-computer-to-artifact.svg
  alt: 'Manus task envelope、临时 Sandbox VM、browser files code software 流水线、artifact 验收、Wide Research 与本地 Browser Operator 边界'
---

聊天产品最容易展示的完成标志，是最后一条 assistant message。

任务产品最危险的完成标志，也是最后一条 assistant message。

因为“已完成”可能只表示 Agent 停止运行。用户真正要验收的，也许是一份引用可靠的报告、一张字段齐全的数据表、一个能打开的网站、一段可以维护的代码，或一个下周仍在运行的 bot。只要价值单位从 reply 变成 work product，完成状态就必须离开聊天气泡，落到 artifact 和外部世界。

Manus 的产品主张正好站在这条分界线上。官方 Welcome 不把它描述成更健谈的 chatbot，而是一个有自己计算机、能规划、执行并交付完整工作产品的 Agent。[Welcome](https://manus.im/docs/introduction/welcome)

真正值得研究的问题不是“电脑比工具多”。而是：

> 当每个任务都获得文件系统、浏览器、网络、软件和代码执行以后，哪些状态进入任务，哪些结果成为交付物，哪些身份离开 sandbox，谁又承担不可逆副作用？

本文冻结的是 **2026-08-07 可访问的 Manus 第一方生产文档、帮助中心与官方技术文章**。Manus 是持续交付的闭源 SaaS，没有公开统一 build、commit、runtime manifest 或可审计的生产 Agent 仓库。文中会把产品事实、团队设计说明与本文推论分开；不补全 planner、队列、微服务、虚拟化平台或浏览器自动化框架。

## “一台电脑”先改变了价值单位

传统聊天 API 的基本交易是：

```text
request → text response
```

Manus API 对自己的描述则是：

```text
goal → task
        ├─ plan / search / tools / actions
        └─ report / presentation / website / data analysis
```

这使产品价值形成一条递进阶梯：

1. **Reply**：一段可读文本；
2. **Task**：一个目标与多步骤执行过程；
3. **Artifact**：报告、幻灯片、数据集、网页、代码等可打开、导出、分享的产物；
4. **External state change**：CRM、邮件、社交账号或其他网站里已经发生的动作；
5. **Running outcome**：持续运行的网站、bot、database、API 或定时任务；
6. **Task set**：Wide Research 把一批相似工作拆开并行，再汇总成批量 artifact。

每往下一层，聊天内容占价值的比例越低，验收和运维责任越高。

一份报告至少要查来源；一个网站要查交互和部署；一个 bot 还要查日志、资源、重启、备份和凭证。Agent 说“done”只是控制流事件，不是质量证明。

## 图解：Task Computer 怎样流向 Artifact

![Manus 从计算机到交付物](/images/agent-system-series/04-manus/manus-computer-to-artifact.svg)

**阅读指南：** 蓝色 Task envelope 表示一次任务的公开边界；绿色临时 VM 是执行与 working state 的主要载体，browser、files、code 和 software 可以在其中组合。紫色 artifact tray 把可交付结果从 cache、临时代码和中间文件中筛出来，送到红色人工验收门。右上角 Wide Research 只是适合独立 item 的小型 fan-out/fan-in；右下角 Browser Operator 使用本地登录态和 IP，不在 cloud sandbox 内。底部生命周期说明提醒：临时 VM 可重建、重要 artifact 可恢复，不代表外部动作可以回滚。

图中刻意没有画 “Planner Service”“Memory Service” 或 “Browser Microservice”。这些名称在公开证据中并不存在。

## Temporary Sandbox：高权限，但爆炸半径按任务切开

Manus Sandbox 官方说明把默认环境定义为**每任务一台完全隔离的 cloud VM**。它具备网络、文件系统、浏览器和软件工具，Agent 可以写代码，也可以安装或运行软件；各任务环境互不影响并可并行。[Understanding Manus Sandbox](https://manus.im/blog/manus-sandbox)

这不是 VM 内最小权限模型。

官方明确说明用户与 Manus 可以在 Sandbox 内获得 root、修改系统文件，甚至格式化整块磁盘。产品选择的是：

```text
VM 内：宽权限，减少任务执行阻力
VM 外：按 task 隔离，限制故障传播
```

所以“sandbox”在这里主要表示**隔离域**，不是每个命令都经过细粒度 permission policy。

这台 VM 也不是永久保存。它有一条公开生命周期：

```text
create
  → active
  → sleep
  → awake
  → recycle / recreate
```

sleep 与 awake 之间文件保持不变；长时间休眠后，Free 用户约 7 天、Pro 用户约 21 天的旧 Sandbox 可被 recycle。重新进入任务时，系统创建新 VM，并恢复：

- output artifacts；
- 用户上传附件；
- Slides / WebDev 等重要项目文件。

不会承诺恢复：

- intermediate code；
- temporary files；
- 已安装 package；
- 运行进程；
- 数据库事务；
- 完整磁盘状态。

因此，Welcome 里“persistent filesystem”的表述只能理解为 sleep/awake 与选择性 artifact 层面的持久性，不应写成永久 VM 磁盘。

这套选择很有产品意味：**系统优先保存用户会验收的结果，而不是复刻 Agent 走过的全部环境。**

代价是环境可能不可复现。如果中间代码没有被提升为 artifact，VM recycle 后就可能消失；如果任务依赖一串未记录的 package install，重新创建 VM 也不等于恢复原执行条件。

## Computer as Body：成立到 effect environment 为止

Manus 团队的技术文章公开描述过一个 model-driven action-observation loop：

1. 模型从当前 context 与预定义 action space 中选择 action；
2. action 在 VM sandbox 中执行；
3. observation 回到 context；
4. 下一轮继续，直到任务完成。

同一文章还公开了 stable prompt prefix、append-only context、保留失败 observation、`browser_` / `shell_` 工具前缀、`todo.md` 目标复述，以及把文件系统作为 externalized memory 等做法。[Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)

这些是一手设计说明，但不是当前生产源码。它们能支持：

- VM 是工具副作用发生的主要环境；
- 文件路径与 URL 可以把大内容移出模型 context；
- 错误 observation 可以成为下一轮恢复证据；
- 长任务需要把目标反复拉回近期注意力。

不能支持：

- planner、模型推理、调度器都在 VM 内；
- 当前所有模型路径仍使用完全相同的 masking 或 prompt；
- loop 的具体 retry、timeout、queue 和 stop predicate；
- VM 是完整 Agent 的唯一状态源。

Sandbox 官方反而声明它不能访问 Manus session/account data，这说明服务身份与账户控制面至少部分位于 VM 外。

所以，“computer as body”最准确的解释是：

> 计算机是 Manus 已公开证明的主要执行身体与外置工作状态；决策核心仍在闭源证据边界之外。

## Artifact 不是文件系统里的任意文件

Sandbox 内可能同时存在四类数据：

| 数据 | 例子 | 默认意义 |
|---|---|---|
| Input | 上传附件、任务要求 | Agent 工作材料 |
| Working state | cache、中间脚本、下载页、临时转换文件 | 帮助执行，不一定交付 |
| Configuration | token、API 配置、运行所需设置 | 能力与敏感状态 |
| Artifact | 报告、网站、幻灯片、数据集、代码包 | 用户验收、下载或分享对象 |

Manus 提供 “View all files in this task” 查看 artifact，也允许用户要求把代码打包交付。普通 task sharing 只暴露 conversation 与 output artifacts，不暴露整个 Sandbox；collaboration 则允许参与者通过 Agent 访问或修改 Sandbox，且会禁用 Connectors。[Understanding Manus Sandbox](https://manus.im/blog/manus-sandbox)

这证明 artifact 是一个**被产品挑出来的交付边界**：

- 相对 durable；
- 可见；
- 可下载；
- 可分享；
- 可进入 chat history；
- recycle 后优先恢复。

但 artifact 仍然不是事实真相。它可能格式漂亮却引用错误，代码可下载却无法部署，网站可打开却存在安全漏洞，数据表行数齐全却字段定义错了。

因此，artifact-first 产品还需要 acceptance-first 交互：

```text
打开 → 检查结构 → 核对事实/来源 → 运行或预览
     → 接受 | 要求修订 | 拒绝 | 导出后自行维护
```

没有这道门，“从 reply 到 artifact”只把错误包装成了更容易采用的形式。

## Cloud Computer：持续结果需要另一种状态契约

2026 年新增的 Cloud Computer 不应再与普通 task Sandbox 混用。

官方帮助中心把它定义为独立、持久、always-on 的云 VM：Ubuntu Linux、持久文件系统、长期保留已安装工具和运行进程，可托管 database、bot、周期 scraper 或 24/7 service。默认任务仍使用 temporary sandbox；任务需要持久性时，Manus 可以自动选择 Cloud Computer，用户也可以手动创建。[What is the Cloud Computer?](https://help.manus.im/en/articles/15392111-what-is-the-cloud-computer)

两者的差异不是 TTL 长短，而是产品责任不同：

| | Temporary Sandbox | Cloud Computer |
|---|---|---|
| 单位 | task | 长期用户 VM |
| 文件 | 选择性恢复 | persistent filesystem |
| 进程 | 不保证跨 recycle | 跨 session 运行 |
| IP | 临时执行环境 | dedicated public IP |
| 接入 | Agent 任务内 | Web Terminal / SSH |
| 典型结果 | report、site build、data file | service、DB、bot、scheduler |
| 备份 | artifact 优先 | 用户需备份关键数据 |
| 停付 | task output 留在 history | VM 文件、工具和 DB 会删除 |

Cloud Computer 的 persistence 也不能自动升级成 backup、snapshot、HA 或 rollback。官方 billing 说明提醒，取消后 VM 状态会删除，关键文件和数据库需要用户自行备份。[Cloud Computer plans and billing](https://help.manus.im/en/articles/15392078-understanding-cloud-computer-plans-and-billing)

一旦 Agent 帮你创建长期服务，验收对象就从静态 artifact 变成运行状态：

- endpoint 是否可达；
- process 是否存活；
- log 是否异常；
- CPU / RAM / storage 是否泄漏；
- secret 是否轮换；
- 升级重启后是否恢复；
- backup 是否可恢复。

自然语言隐藏了运维命令，没有消灭运维责任。

## 两种 Browser，是两种身份放置

Cloud Browser 和 Browser Operator 都可以点击网页，但它们不是同一个工具的部署选项。它们把身份放在不同边界。

### Cloud Browser：身份进入云端 browser session

Cloud Browser 使用数据中心 IP，在云端维护独立浏览器环境。用户可以在里面登录账号，Manus 再利用已建立的 authenticated session 读写网页；用户能实时观看，遇到 CAPTCHA、SMS 或 MFA 时进入 Take Over，完成验证后再交回 Agent。[Cloud Browser](https://manus.im/docs/features/cloud-browser)

官方提供的控制包括：

- 每用户隔离的 browser instance；
- encrypted session 的产品承诺；
- 登录账号列表；
- logout / clear sessions；
- browser history；
- Take Over 通知。

但这里有两个不可省略的限制：

1. 数据中心 IP 可能触发 CAPTCHA、异常登录或网站自动化拦截；
2. “不存储密码”不等于系统没有处理 cookie、token 或可用登录态。

公开文档没有证明 Cloud Browser 与 per-task Sandbox 是同一 VM、同一浏览器进程或同一生命周期。登录 session 可以被用户集中管理，本身就说明它不应被简单画成 task VM 里的一个临时窗口。

### Browser Operator：Agent 进入真实用户身份域

Browser Operator 是本地 Chrome / Edge 扩展。它直接使用用户当前浏览器、active tabs、existing login session 与本地 IP；每个 session 需要授权，工作发生在专用 tab 中，用户可以点击接管或关闭 tab 停止后续自动化。[Browser Operator](https://manus.im/docs/features/browser-operator)

它解决的是 Cloud Browser 很难解决的问题：

- premium tool 已登录；
- 企业内网或本地网络；
- residential / trusted IP；
- CAPTCHA 与异常登录；
- 本地 extension 或现有 tab 上下文。

它同时把错误爆炸半径推到更敏感的地方：

- CRM；
- 邮箱；
- 内部系统；
- premium database；
- 金融或支付页面；
- 用户日常登录态。

一次 session 授权不是逐点击批准。“所有动作有日志”“可以关 tab 停止”也不等于已经提交的表单、邮件、订单或 API 调用能撤销。

选择哪个 Browser，本质上是在选择：

```text
Cloud Browser
  隔离、一致、可远程运行
  ↔ 需要云端登录、数据中心 IP、session 托管

Browser Operator
  身份连续、本地 IP、已有工具
  ↔ 真实账号权限、更大外部后果、本机必须在线
```

## Wide Research：只对可分割问题扩展

Wide Research 是 Manus 少数公开描述了 delegation topology 的能力：

```text
main agent
  → decompose independent items
    → dedicated agents with fresh contexts
      → parallel processing
        → main-agent synthesis
          → table / report / dataset
```

当前官方文档称它面向大量相似 item，例如研究 50 家公司、比较 100 个产品或生成 20 份相似内容；每个 subtask 使用独立 context，最后由 main agent 汇总。[Wide Research](https://manus.im/docs/features/wide-research)

这不是“任何复杂任务都多开 Agent”。官方明确列出不适合：

- single deep dive；
- sequential dependency；
- real-time interactive research；
- 少于约 10 个 item 的任务。

Wide Research 更接近 map/reduce：

- map 要求 item 相互独立；
- schema 要在 fan-out 前定义；
- synthesis 需要检查覆盖率、重复、异常值和来源；
- 某个错误 decomposition 可能批量污染几十到数百项。

公开口径对规模也有冲突：feature docs 使用 “hundreds” 并称测试到 250 items，帮助中心则称同时 20 subtasks。它们可能分别指总 item 数与并发宽度，但官方没有给出统一解释，不能合并成一个硬并发指标。

更重要的是，fresh context 证明的是上下文隔离，不证明 subagents 有独立目标、不同证据路线或相关性受控。并行放大吞吐，也会并行放大共同 prompt、相同来源和同一 synthesis rule 的系统性错误。

## Plan Mode 把验收前移，但不是结果验证器

2026-07 的 Plan Mode 提供了一道可选 pre-execution gate：

1. Manus 做 feasibility check；
2. 必要时提出澄清问题；
3. 生成 Markdown plan；
4. 用户可以编辑；
5. Confirm 前不执行；
6. 任务中途也可以暂停并重新规划。

这能减少“方向错了却执行很久”的成本。[Plan Mode](https://www.manus.im/blog/manus-plan-mode)

但 plan approval 只证明用户同意**方法**，不证明：

- 工具会按计划可靠执行；
- 来源真实；
- artifact 达到质量要求；
- 外部操作没有竞态；
- 持续服务可用；
- 法律与版权风险已解决。

Plan Mode 是 intent alignment gate，不是 universal evaluator。它应该与结果验收成对出现：

```text
执行前：review plan
执行中：observe / take over / stop
执行后：inspect artifact / external state / service health
```

## VM 无法回滚的世界

任务 VM 可以格式化并重建，这很容易制造一种错误直觉：出了问题，大不了重来。

重建只覆盖 VM 事务边界。下面这些后果都已经离开它：

- 发出的邮件与消息；
- CRM、Notion、Calendar 或工单系统的修改；
- 表单提交；
- 社交媒体发布；
- 订单、付款与金融操作；
- GitHub issue、PR 或评论；
- DNS、域名、证书与 registrar 记录；
- 已部署网站和 CDN 内容；
- Cloud Computer 向外发出的 webhook；
- 第三方费用、quota 与审计日志；
- 对其他人的通知和业务影响。

关闭 Browser Operator tab 只能阻止后续动作；清空 Cloud Browser session 只能移除将来的登录能力；删除 VM 只能改变 VM 内状态。已被第三方接受的 write 必须由第三方的 undo、delete、refund、compensation 或人工流程处理。

因此，给 Agent 一台电脑以后，系统还需要一张 effect ledger：

| Effect | 目标系统 | 是否可逆 | 补偿动作 | 人工检查点 |
|---|---|---|---|---|
| draft email | mailbox draft | 通常可逆 | delete | 发送前 |
| send email | recipient systems | 不完全可逆 | follow-up / recall if supported | send 前 |
| edit CRM | CRM | 依产品而定 | restore prior value | batch 前后抽样 |
| publish website | host / CDN | 依部署能力 | redeploy / unpublish | production 前 |
| payment | financial system | 受规则约束 | refund / dispute | 必须显式确认 |

VM isolation 管爆炸半径，effect ledger 管现实后果。两者不能互相替代。

## Full Computer 与 Narrow Tools 怎么选

完整计算机并不天然优于窄工具。可以用四个问题选择执行身体。

### 1. 任务是否需要临时创造工具

需要安装 package、写脚本、转换复杂文件、组合浏览器与本地程序时，computer 的可塑性明显更高。

如果只是调用一个稳定业务动作，typed API tool 更容易约束输入、权限、幂等和审计。

### 2. 状态是否必须跨 task 持续

- 一次性分析或建站：temporary VM；
- 24/7 bot、database、scheduler：Cloud Computer；
- 只需要结果：artifact store；
- 只需要复用业务账号：browser session 或 connector。

不要为了“以后可能用到”把所有 task 都放进长期 VM；跨任务污染、secret retention 和不可重复环境会一起积累。

### 3. 身份应该放在哪里

- 公共研究：Cloud Browser；
- 云端单独登录：Cloud Browser；
- 本地已有 session / trusted IP / 内网：Browser Operator；
- 可审计业务 API：connector / narrow tool；
- 高风险金融动作：尽可能保持显式人工批准。

### 4. 失败时依靠回滚还是补偿

如果目标系统支持 transaction、idempotency key、draft、version history 或 reversible API，窄工具可以把可靠性做进协议。

如果只能模拟人在网页点击，系统就更依赖：

- 可见执行；
- pre-flight preview；
- 人工 take over；
- 批量阈值；
- post-action reconciliation；
- 明确 compensation。

完整 computer 扩展“能做什么”，不会自动扩展“能安全撤销什么”。

## 三层架构结论

### Agent 架构

公开资料支持 model-driven action → observation loop、文件系统外置 context、`todo.md` 目标复述、错误 observation 保留、Plan Mode 与 Wide Research。它不支持对当前 planner、模型路由、统一 memory、retry scheduler 或 completion predicate 作源码级断言。

### 系统架构

可验证的系统边界包括：

- per-task temporary VM；
- artifact 与 intermediate state 的不同持久性；
- persistent Cloud Computer；
- Cloud Browser 的云端 session；
- Browser Operator 的本地登录域；
- task API 的 running / waiting / stopped / error；
- browser takeover 与用户 stop。

实现语言、Agent framework、虚拟化平台、浏览器控制协议和内部消息队列不可验证。

### 产品架构

Manus 把产品价值从回答迁移到 task、artifact、external change 与 running outcome；同时提供 Plan、观察、Take Over、授权、日志、分享、下载和持续计算等检查点。

但越接近“替用户完成真实工作”，错误成本越离开模型评分，进入用户账户、第三方系统、服务运维、费用、法律与组织责任。

## 边界清单

### 已确认

- 默认 task 使用隔离 cloud VM，拥有网络、文件、浏览器与软件；
- VM 内权限宽，安全主要来自 task 隔离；
- Sandbox 可 sleep / wake / recycle，只选择性恢复重要文件；
- artifact 与 intermediate working state 的持久性不同；
- Cloud Computer 是独立、持久、always-on 的 Ubuntu VM；
- Cloud Browser 与 Browser Operator 使用不同 IP 和登录态边界；
- Wide Research 使用分解、独立 context、并行处理与汇总；
- Plan Mode 是可选、人工确认的执行前 gate。

### 设计推论

- “computer as body”适用于 effect 与 working-state 层，不覆盖全部 Agent；
- artifact-first 需要 acceptance-first，否则只会提高错误结果的可采用性；
- VM、browser session、deployment 与第三方账号是不同恢复域；
- Manus 的产品架构更接近 task computer，而不是带工具的聊天框。

### 仍未知

- 当前生产 agent loop、planner、模型和 prompt routing；
- VM orchestration、隔离实现、镜像与供应链；
- browser session token 的精确数据路径；
- Wide Research 的真实调度、重试、取消与 partial result；
- 统一 evaluator、外部 effect reconciliation 与全局 audit schema；
- 完成状态与客观任务成功之间的准确率。

## 参考资料

- [Manus Welcome](https://manus.im/docs/introduction/welcome)
- [Manus API](https://manus.im/docs/integrations/manus-api)
- [Understanding Manus Sandbox](https://manus.im/blog/manus-sandbox)
- [Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Cloud Computer](https://help.manus.im/en/articles/15392111-what-is-the-cloud-computer)
- [Cloud Computer setup](https://help.manus.im/en/articles/15392128-how-to-set-up-and-access-your-cloud-computer)
- [Cloud Computer plans and billing](https://help.manus.im/en/articles/15392078-understanding-cloud-computer-plans-and-billing)
- [Cloud Browser](https://manus.im/docs/features/cloud-browser)
- [Browser Operator](https://manus.im/docs/features/browser-operator)
- [Wide Research](https://manus.im/docs/features/wide-research)
- [Wide Research Help Center](https://help.manus.im/en/articles/11960169-what-is-wide-research)
- [Plan Mode](https://www.manus.im/blog/manus-plan-mode)
- [Manus Projects](https://manus.im/docs/features/projects)
- [Introducing Branch](https://manus.im/blog/manus-branch)
- [Verify Before You Act](https://help.manus.im/en/articles/15595028-verify-before-you-act)
