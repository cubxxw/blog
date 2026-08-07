---
title: 'n8n 的确定性外骨骼：Queue、Worker 与副作用从不承诺 Exactly-Once'
date: 2026-08-07T17:25:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Automation
  - Harness Engineering
  - Monitoring
  - Security
  - Development
description: >
  以 n8n 2.33.6 源码追踪一次执行如何跨主进程、Redis 队列、工作进程与 Postgres 流动，并拆开工作流图与 Agent 节点的控制边界。文章解释等待、重试、崩溃恢复、幂等键和对账各自解决什么，以及 queue mode 为什么只能扩大吞吐，不能承诺 exactly-once 副作用。
tldr:
  - n8n 的 graph 拥有宏观控制流，AI Agent node 只是局部概率岛。模型提出 tool call，workflow engine 执行真实 tool node，再用 EngineResponse 恢复 Agent。
  - queue mode 中 Redis/Bull 负责调度 execution ID 与进度消息，Postgres 保存 workflow、execution state 和结果；Redis 不是长期历史，Postgres 也不是业务事实源。
  - Wait 把长等待卸载到数据库，retry 创建关联的新执行，Error Workflow 启动另一条流程；三者都不构成对原副作用的事务回滚。
  - queue recovery 会对比数据库与 Redis，把失联 execution 收敛为 crashed，而不是盲目重跑。它降低隐式重复，却把幂等与补偿责任交给流程作者。
  - execution success 只证明 n8n 跑完了可见图。外部写入是否只发生一次，需要稳定 operation key、目标 API 幂等键、回执、查询和 reconciliation。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 5
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/05-n8n/n8n-deterministic-spine.svg
  alt: 'n8n 确定性 workflow 主干、受限 Agent 支线、人工与幂等闸门、外部回执对账以及 Redis worker Postgres queue-mode 车场'
---

前一篇 [n8n 入门](/zh/growth/posts/super-individual-growth-os-n8n/) 已经从 `Manual Trigger → Edit Fields → IF` 开始，讲过 Growth OS、受限 Agent、人工审批、operation ledger、结果回流和 alternatives。

这一篇不再搭另一条三节点 workflow。

我们从一条更难看的故障窗口开始：

```text
worker → 外部 API 写入成功
worker → 尚未写回 execution success
worker → 崩溃
```

此时 Redis 里可能没有活动 job，Postgres 里仍是一条 `running` execution，第三方系统却已经收到邮件、创建记录或扣过款。重新执行可以让 n8n 变绿，也可能让外部世界被写第二次。

**系统状态不完整，与业务动作没有发生，是两回事。**

这正是 n8n 作为 Agent 外骨骼最值得研究的地方。可视化 graph 能把节点、分支、等待和失败画出来；queue mode 能把 execution 分发给 worker；Agent node 能在局部使用 model、memory 与 tools。但这些能力都没有自动把跨系统副作用变成 exactly-once transaction。

本文冻结 **n8n 2.33.6**，tag commit 为 `d353e591a90753348b8f247c66053650cd5d083e`，发布于 2026-08-07 07:56:30 UTC。研究日 `master` 已前进到 `4ae4cc3602d2ea6637c95bb452dbcb146d154d07`；源码结论固定 release tag。[n8n 2.33.6](https://github.com/n8n-io/n8n/releases/tag/n8n%402.33.6)

文档固定到 `n8n-docs@4044d5c51797e063f4ee342db5ec94e4c94e9906`。该文档树已出现标注 “available from 2.34.0” 的内容，本文不会把它提前算进 2.33.6。

## 先纠正“确定性 workflow”这句话

n8n workflow 不是数学意义上的确定性程序。

普通节点也可能读取时间、随机数、HTTP 响应、数据库当前值或第三方服务状态。同样的输入再次执行，结果未必相同。

这里所谓 deterministic spine，准确含义是：

- graph 拓扑显式；
- branch rule 可见；
- expression 和 mapping 可检查；
- node execution 有顺序与 lineage；
- error policy、Wait 与 retry 是产品对象；
- 模型不会默默替整张图选择下一节点。

与它相对的是 **model-selected action island**：在 Agent node 内，模型可以依据语义与 observation 选择哪个 tool，或决定输出 final answer。

因此更严谨的说法是：

> n8n 提供 workflow-controlled spine，把概率性选择限制在显式 Agent island；它控制决策位置，不保证所有外部结果可复现。

## 图解：铁路主干、Agent 支线与运维车场

![n8n 确定性主干与 Agent 支线](/images/agent-system-series/05-n8n/n8n-deterministic-spine.svg)

**阅读指南：** 蓝色主干从 trigger、item normalization、显式规则进入 Agent output，再经过 policy/human gate 和 operation-key lookup 才触发外部写入。紫色 Agent island 只处理需要语义判断的局部；memory 不等于业务事实源。绿色回路把外部 reference 写入 ledger，并在 outcome unknown 时先查询对账。底部车场展示 queue mode：main/webhook process 接收并排队，Redis/Bull 调度，workers 执行，Postgres 保存 workflow 与 execution record。它是吞吐和恢复平面，不是订单、付款或库存的数据模型。

## Graph 怎样拥有宏观控制流

`WorkflowExecute` 根据 workflow connections、start/destination 和 branch order 构造 `nodeExecutionStack`，调度节点并保存 run data、source、execution index；它还处理 waiting、cancel、error 与 partial execution。[workflow-execute.ts](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/core/src/execution-engine/workflow-execute.ts)

n8n 1.0 之后，多分支默认按画布位置依次执行，而不是让模型决定先走哪一条。[Execution order](https://docs.n8n.io/flow-logic/execution-order/)

节点之间的最小交接单位是 item array：

```json
[
  {
    "json": {},
    "binary": {}
  }
]
```

源码中的 `INodeExecutionData` 还可以包含 `error`、`pairedItem`、`metadata`、`evaluationData` 和 redaction 信息。`pairedItem` 保留输出与输入的 lineage，让下游表达式知道一条结果来自哪条上游 item。[Data structure](https://docs.n8n.io/data/data-structure/)

这套 item contract 是 Agent 岛能够回到普通 workflow 的关键。下游 IF、Set、Database 或 HTTP node 不需要理解 LangChain scratchpad，只消费正常 `{ json, pairedItem }`。

## Agent node 不是在图里随便开一个 LangChain loop

2.33.6 的 AI Agent 默认版本是 3.1，统一进入 Tools Agent V3。对每个 input item，它会：

1. 读取 prompt、system message；
2. 接入 chat model 与可选 fallback model；
3. 加载可选 memory；
4. 收集 tools 与 output parser；
5. 从此前 EngineResponse 重建 agent steps；
6. 创建 tool-calling agent；
7. 模型若返回 final values，就格式化为普通 n8n item；
8. 模型若返回 tool calls，就生成 EngineRequest。

最关键的边界不是 “用了 LangChain”，而是 `EngineRequest / EngineResponse`：

```text
Agent node
  model chooses tool + arguments
        │
        ▼
EngineRequest
  actionType: ExecutionNodeAction
  nodeName / input / id / metadata
        │
        ▼
Workflow execution engine
  schedules real tool node
  applies credential / HITL / logs / lineage
        │
        ▼
EngineResponse
  action + ITaskData
        │
        └────────► resume Agent node
```

这些类型定义在 [`interfaces.ts`](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/workflow/src/interfaces.ts)，暂停 Agent、把 tool node 压入 execution stack、等待 actions 完成并恢复 Agent 的逻辑位于 [`requests-response.ts`](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/core/src/execution-engine/requests-response.ts)。

这项设计让两种所有权同时成立：

- 模型拥有“现在调用哪个工具”的概率性选择；
- n8n engine 拥有“用哪个 node、哪个 credential、怎样记录与恢复”的执行控制。

如果 Agent 在内部直接执行所有 tools，实际副作用就会离开 graph run data、HITL、credential 与 lineage 的共同治理。

## Agent island 的边界表

| 能力 | Agent node 拥有什么 | 不能假装拥有什么 |
|---|---|---|
| Input | 当前 item 的 prompt mapping | 完整业务事实 |
| Context | system、input、chat history、prior tool steps | 所有 workflow node 历史 |
| Model | tool call 或 final answer | graph 下一节点 |
| Memory | 可选 chat history load/save | execution database、CRM 状态 |
| Tools | 模型可见工具定义 | 直接绕过 engine 执行副作用 |
| Output parser | 结构解析与格式约束 | 事实正确性 |
| Stop | final、max iterations、cancel、error、denial | 整个业务客观完成 |
| Eval | 可由独立 evaluation workflow 检查 | 每次生产执行的默认质量门 |

V3 默认 `maxIterations` 为 10；达到上限会抛 `NodeOperationError`。这不是模型自律，而是 workflow 给概率 loop 设置预算。[checkMaxIterations.ts](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/%40n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/checkMaxIterations.ts)

官方 node 描述提到 action plan，但源码证明的是 tool-calling loop，没有独立、持久化 plan state。不能因此画出一个并不存在的 Planner Service。

还有一个容易踩中的批量边界：root node 往往逐 item 解析 expression，AI cluster sub-node 的 expression 可能只解析第一 item。批量输入时，不能假设 model/memory/tool sub-node 自动拥有与 root Agent 完全相同的 `$json` 语义。

## Queue mode 的真实数据路径

官方称 queue mode 提供最佳可扩展性。它的主路径不是“Redis 拿到完整 workflow 然后执行”，而是：

```text
main / webhook processor
  1. 创建 execution 与 executionId
  2. 把 job 排进 Redis/Bull
        │
        ▼
worker
  3. dequeue executionId
  4. 从数据库加载 workflow + execution data
  5. 执行 graph
  6. 把状态与结果写回数据库
  7. 经 Bull progress / pubsub 通知 main
```

[Queue mode 文档](https://docs.n8n.io/hosting/scaling/queue-mode/)明确了职责：

- **main**：API、编辑器、timer，默认也接 webhook；
- **webhook processors**：可选，只扩展 webhook ingress；
- **Redis**：message broker 与 pending execution queue；
- **workers**：实际执行 production workflows；
- **database**：workflow 和 execution data 的持久化；
- **shared encryption key**：让各进程读取同一套 credentials。

在 2.33.6 源码中：

- Bull 版本为 4.16.4；
- ioredis 为 5.3.2；
- job data 主要包含 `workflowId`、`executionId` 与 `loadStaticData`；
- worker 按 execution ID 回数据库 rehydrate；
- finished、failed、webhook response 与 streaming chunk 通过 Bull progress 回传；
- completed job 可以从 Redis 删除，main 甚至用内存 `jobResults` 暂存细节。

这些行为都说明：**Redis job 不是长期 execution history。** [`scaling.service.ts`](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/cli/src/scaling/scaling.service.ts)

Postgres 的角色也不能被夸大。它可以是 n8n workflow definition、execution state 和 result 的持久事实源，却不自动成为 CRM、payment、inventory 或 email delivery 的业务事实源。

一条 execution row 写着 success，只证明 worker 完成了它能观察到的路径。

## Webhook Processor 只拆入口，不拆业务语义

高 webhook 流量下，可以把 `/webhook/*` 与 `/webhook-waiting/*` 路由到 webhook processor pool，把 `/webhook-test/*`、内部 API 和 UI 留给 main。官方不建议让 main 同时承受 production webhook pool，以免拖慢编辑器。

但 webhook processor 只负责接收和转交 execution，真正的 graph 仍由 worker 执行。

同步 webhook 又有一条容易忽略的链：

```text
client HTTP connection
  ↔ main / webhook processor
       ↔ Redis progress
            ↔ worker result
```

worker 即使已经完成外部动作，Redis/Bull 通道故障仍可能让入口拿不到及时 response。于是客户端看到 timeout，不等于工作没有发生。

这正是 operation key 必须由业务层定义的另一个理由。

## Wait 是持久暂停，不是事务冻结

Wait node 遇到较长等待时，会把 execution data 卸载到数据库；到指定时间、日期，或收到唯一 resume webhook / form submission 后，再加载并继续。[Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/)

少于 65 秒的 wait 是例外：execution 不卸载，原进程用 timer 等待。

Wait 解决的是资源占用和恢复位置：

```text
before Wait nodes
  → persist state + waitTill
  → release worker/process
  → resume signal
  → reload state
  → continue after Wait
```

它没有冻结外部世界。进入 Wait 前发出的邮件不会暂停，已创建的订单不会因 execution 等待而进入数据库事务，resume webhook 的重复请求是否具备强去重也没有在本轮资料中得到保证。

waiting execution 不被 pruning，是合理的生命周期保护；这仍与 durable business transaction 不同。

## Retry、Error Workflow 与 Recovery 是三件事

### Retry：重新尝试

失败 execution 可以：

- 用当前保存的 workflow 重试；
- 用原始 workflow 重试；
- 使用上次 execution data 作为输入。

源码中的 `retryOf / restartExecutionId` 表明 retry 是一条相关联的新执行路径，而不是原 execution 的透明续跑。[All executions](https://docs.n8n.io/workflows/executions/all-executions/)

### Error Workflow：失败后启动另一条流程

Error Workflow 必须从 Error Trigger 开始，可以发送通知、创建事件、保存诊断或编排人工补偿。它不是数据库 rollback，也不会自动反向执行原 graph。

### Queue / Execution Recovery：让内部记录收敛

2.33.6 的 leader 会定期：

1. 从数据库读取 `new / running` execution IDs；
2. 与 Redis `active / waiting` jobs 对比；
3. 数据库有而 Redis 无的 execution 标成 `crashed`。

它不会自动重跑。这个选择看起来保守，却避免在未知外部副作用已经发生时，后台擅自再执行一次。

另一路 execution recovery 可以根据 event logs 修补 `status`、`stoppedAt` 和部分 node run data；没有日志就标 crashed。源码同时承认 worker 场景的 lifecycle log 可能不完整，所以这是一种 best-effort reconstruction，不是严格 event sourcing。[execution-recovery.service.ts](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/cli/src/executions/execution-recovery.service.ts)

`JobProcessor` 甚至明确处理了一条竞态：Bull implicit retry 可能把已经被 n8n recovery 标成 crashed 的 execution 再次入队；processor 看到 `status === crashed` 会拒绝实际执行，并留下“两套机制需要重做”的源码注释。[job-processor.ts](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/cli/src/scaling/job-processor.ts)

这是一条很强的架构信号：

> n8n recovery 的首要目标，是把内部状态收敛成可解释的失败，而不是自动把所有悬空任务制造成成功。

## exactly-once 为什么不在 queue 里

端到端 exactly-once 至少跨越四个系统：

```text
Postgres execution row
Redis/Bull job
worker process
external API state
```

在外部写入与 DB completion 之间，没有公开的分布式事务：

```text
t0 worker sends POST /payments
t1 payment provider commits
t2 worker dies
t3 n8n marks execution crashed
t4 operator clicks retry
t5 POST /payments happens again
```

Redis persistence、replication 或 Bull lease 可以减少 job 丢失，不能告诉 n8n 付款方在 t1 是否提交成功。execution log 也只能记录 n8n 看见了什么。

所谓 “at-most-once tasks” 在 multi-main 文档中只指 leader 承担的 timer、poller、persistent connection 与 pruning 等 control-plane task，不能推广成所有 workflow execution 的副作用语义。

安全的表述只能是：

- n8n 提供 execution identity；
- 数据库提供执行记录；
- Redis 提供调度；
- recovery 检测内部失联；
- 业务作者提供幂等键、回执、查询和补偿。

## Operation Ledger 怎样补上业务语义

在外部写操作之前生成稳定业务键：

```text
operation_key =
  workflow_business_action
  + target
  + business_entity_id
  + semantic_version
```

一个最小 operation ledger 可以记录：

```json
{
  "operation_key": "invoice:create:customer-42:v3",
  "execution_id": "n8n-execution-id",
  "request_hash": "sha256:...",
  "target": "billing-provider",
  "status": "reserved",
  "external_reference": null,
  "attempts": 1,
  "last_checked_at": null
}
```

写入流程：

1. 查询 operation key；
2. 已有 `confirmed` 就返回旧 external reference；
3. 没有则先 reserve；
4. 目标 API 支持 idempotency key 时传同一个 key；
5. 发出写入；
6. 保存 response 与 external reference；
7. 本地 outcome unknown 时，先用 key/reference 查询目标系统；
8. 只有确认“未发生”后才 retry；
9. 无法查询时进入人工 reconciliation。

这里的关键不是多一张表，而是承认三态：

```text
confirmed success
confirmed failure
unknown
```

把 unknown 直接折叠成 failure，是重复副作用的来源。

## Agent Memory 为什么不能做业务账本

Agent memory 的公开角色是可选 chat history：

- Agent 执行前 load；
- final output 后 save；
- 为后续语言交互提供上下文。

它不拥有：

- operation key 唯一约束；
- payment provider receipt；
- inventory version；
- CRM current record；
- execution lineage；
- 并发 transaction。

模型可以从 memory 里“记得好像发过一封邮件”，这不是可审计的防重证据。

正确分层是：

| 状态 | 所有者 |
|---|---|
| Agent chat history | memory sub-node / memory backend |
| 当前 item | workflow execution |
| 节点输入输出 | execution record |
| job dispatch | Redis/Bull |
| workflow/execution persistence | Postgres |
| binary object | DB / S3 |
| 业务事实 | CRM / payment / inventory / operation ledger |

## Pruning 与 Binary Data 也是正确性边界

execution pruning 默认开启。完成的 execution 可按年龄或数量先 soft-delete，再经过默认约 1 小时 hard-delete buffer 永久删除；`new`、`running`、`waiting` 和 annotated execution 不进入 pruning。[Execution data](https://docs.n8n.io/hosting/scaling/execution-data/)

这意味着 execution history 是运维记录，不应未经额外设计就承担长期审计账本。

binary data 默认放内存，大文件可能压垮进程。queue mode 又不能使用本地 filesystem binary storage，因为消费 job 的 worker、main 与 webhook processor 不共享同一台机器文件路径；2.33.6 应使用 database 或 S3 external storage。[Binary data](https://docs.n8n.io/hosting/scaling/binary-data/)

若切换过 binary storage mode，pruner 只清当前 active mode，旧后端对象可能残留。存储位置改变以后，生命周期、删除和数据驻留责任仍需要运维方核对。

## 与 Temporal 的真正分界

不需要再做一张工具 alternatives 榜。只看正确性语义：

### n8n 擅长

- 连接器密集；
- 业务运营能读懂画布；
- 节点配置频繁变化；
- 人工批准与 debug 重要；
- 外部错误可通过 retry、补偿和人工处理；
- SaaS 集成是主要工作。

### Durable Execution engine 擅长

- 流程必须跨进程故障、部署和长时间等待继续；
- workflow code 需要确定性 replay；
- activity retry、timer、signal 与 versioning 是核心语义；
- 状态恢复是业务正确性，而不是运维便利。

Temporal 也不会替外部 Activity 自动获得幂等；它的文档同样要求 Activity 尽可能 idempotent。[Temporal Activities](https://docs.temporal.io/activities)

合理组合可以是：

```text
n8n
  trigger + SaaS ingress + human approval + visible operations
        │
        ▼
durable engine
  long-lived core business process
        │
        ▼
n8n
  notification + exception inbox + operator actions
```

queue mode 扩大的是吞吐，不是正确性承诺。

## 企业控制面仍有缝

n8n 的企业治理提供：

- instance / project RBAC；
- Admin / Editor / Viewer 等项目角色；
- source-control environments 与 PR；
- protected production instance；
- security audit；
- log streaming；
- community/custom node 管理；
- credential 和 encryption-key 运维。

这些能力让 workflow 成为可审查配置工件，却不能版本化外部系统状态。Git 里有 workflow、tags、variables 与 credential stubs，不代表 secret value、数据库行和第三方副作用与该 commit 原子一致。

变量与 tags 又是 instance-global，不完全落在 project RBAC 边界内。community/custom node 是可执行供应链；连接器越丰富，审查主机权限与凭据访问的责任越大。

产品控制面可见，不等于所有数据面已经被统一治理。

## 一张上线前的责任表

| 问题 | 必须给出答案的人 |
|---|---|
| 哪些 branch 可以是模型选择 | workflow author |
| Agent 最大迭代与输出 schema | Agent/workflow author |
| 哪些 tool 必须审批 | policy owner |
| 审批者看哪些参数与证据 | product owner |
| operation key 怎么生成 | integration developer |
| 目标 API 是否支持 idempotency | target system owner |
| unknown outcome 如何查询 | integration developer |
| 没有查询能力时如何补偿 | business operator |
| Redis/Postgres/S3 如何备份 | platform operator |
| execution 与 binary 保留多久 | compliance / platform owner |
| 哪些节点和 credentials 可进入生产 | instance administrator |

Agent 不会接走这些责任。它只会让遗漏的责任跑得更快。

## 边界清单

### 已确认

- `WorkflowExecute` 拥有 graph node stack、branch、run data 与 lifecycle；
- Agent V3 用 EngineRequest/EngineResponse 把 tool selection 与 tool execution 分开；
- Agent output 回到普通 item contract，并保留 pairedItem；
- queue mode 中 Redis/Bull 调度，worker 执行，database 持久化；
- Wait 可把长等待状态卸载到数据库；
- retry 是相关联的新执行，Error Workflow 是另一条 workflow；
- queue recovery 比对 DB/Redis 并标记 crashed，不自动重跑；
- queue mode 没有公开 exactly-once 外部副作用保证。

### 设计推论

- n8n 适合作为可见、可审批的 workflow-controlled spine；
- Agent 应是有 schema、预算与退出点的局部 island；
- recovery 标 crashed 是面对未知副作用时更保守的选择；
- operation ledger 与 reconciliation 才能把 execution identity 接到业务事实。

### 仍未知

- Redis 部署的统一 RPO/RTO；
- DB row 与 enqueue 之间是否在所有路径具备更强原子性；
- Wait resume webhook 的强去重语义；
- 所有 error workflow 失败边界；
- event-log recovery 在各种 worker crash 下的完整度；
- n8n Cloud 未公开基础设施；
- 每个第三方 node 的 idempotency 与补偿能力。

## 参考资料

- [n8n 2.33.6](https://github.com/n8n-io/n8n/releases/tag/n8n%402.33.6)
- [Queue mode](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [Workflow execution engine](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/core/src/execution-engine/workflow-execute.ts)
- [Engine request/response handling](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/core/src/execution-engine/requests-response.ts)
- [Workflow interfaces](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/workflow/src/interfaces.ts)
- [Tools Agent V3](https://github.com/n8n-io/n8n/tree/n8n%402.33.6/packages/%40n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3)
- [Scaling service](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/cli/src/scaling/scaling.service.ts)
- [Job processor](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/cli/src/scaling/job-processor.ts)
- [Execution recovery](https://github.com/n8n-io/n8n/blob/n8n%402.33.6/packages/cli/src/executions/execution-recovery.service.ts)
- [Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/)
- [All executions](https://docs.n8n.io/workflows/executions/all-executions/)
- [Error handling](https://docs.n8n.io/flow-logic/error-handling/)
- [Execution data](https://docs.n8n.io/hosting/scaling/execution-data/)
- [Binary data](https://docs.n8n.io/hosting/scaling/binary-data/)
- [Human-in-the-loop for AI tools](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/)
- [Security audit](https://docs.n8n.io/hosting/securing/security-audit/)
- [Temporal Activities](https://docs.temporal.io/activities)
