---
title: 'OpenClaw 的常驻网关：连续性不是把所有消息塞进同一会话'
date: 2026-08-07T17:40:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Security
  - Monitoring
  - Automation
  - Development
description: >
  以 OpenClaw v2026.7.1-2 为样本，追踪消息如何经过渠道准入、binding、agent 与 session key，解释跨渠道连续性的身份维度。文章拆开 Gateway、模型、workspace、sandbox 与设备节点，并用跨账户串线反例说明常驻 Agent 的权限、凭据、注入与撤销边界。
tldr:
  - OpenClaw 的核心对象不是跨渠道聊天模型，而是常驻 Gateway。它先接管渠道连接与协议，再把已准入的消息路由到 agent、session 和当次 capability。
  - Binding 只决定消息归属，不代替 DM allowlist、pairing 或 group policy；session key 只选择上下文，也不是租户授权令牌。
  - 连续性来自 session key 少放一些身份维度；隔离来自把 channel、account 和 peer 放回 key。identityLinks 是高风险身份合并，不是自动验证。
  - 每个 agent 可拥有独立 workspace、agentDir、auth 和 session store；但 workspace 只是默认 cwd，同一 Gateway 也不是敌对多租户安全边界。
  - 24/7 在线把网页、邮件、文档、设备和外部工具都变成长期开口。硬边界必须由渠道准入、tool policy、sandbox、配对、幂等键与对账共同承担。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 6
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/06-openclaw/openclaw-persistent-gateway.svg
  alt: 'OpenClaw 从互联网渠道经过常驻 Gateway、确定性 bindings、session key、per-agent enclave 到设备节点与外部副作用的路由图'
---

假设同一家公司有两个 Telegram bot：一个服务欧洲客户，一个服务美国客户。两个 bot 都把消息交给同一个 `support` agent，session 隔离策略写成了 `per-channel-peer`。

某个平台用户 ID 恰好同时出现在两个账号里。

系统会生成同一个 key：

```text
agent:support:telegram:direct:tg:12345
```

欧洲 inbox 的对话就可能出现在美国 inbox 的上下文中。

没有模型越狱，没有数据库损坏，也没有随机路由。系统完全按照配置工作，只是 session key 少了 `accountId` 这一维。

**跨渠道连续性与跨账户串线，常常只差一个身份维度。**

站内已有的[《Agent 的自我：从洛克到 OpenClaw》](/zh/ai-agent/posts/agent-identity-from-locke-to-openclaw/)讨论身份文件、记忆、权限与评测如何构成可观察的连续性。本文不再追问 Agent 是否还是“同一个自我”，只追踪一条消息怎样被常驻 Gateway 变成一次有限能力的 turn。

本文冻结 **OpenClaw v2026.7.1-2**，tag commit 为 `0790d9f593ad30c940ed93b5872a8cf6d6f3cf8c`，发布于 2026-08-04 00:41:26 UTC。研究日 `main` 已前进到 `2dd0e9b950462acc1f24fa9b207e9b7b0b4bd36b`；源码判断以 release tag 为准，当前文档只用于补充仍然公开的运行契约。[v2026.7.1-2 release](https://github.com/openclaw/openclaw/releases/tag/v2026.7.1-2)

## 四道门怎样分开 Gateway 与模型

把 OpenClaw 称作聊天机器人，会漏掉它最重要的所有权。

官方架构把 Gateway 定义为一个长期运行的进程：它维持 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 和 WebChat 等消息面连接；macOS app、CLI、Web UI 与自动化客户端通过 typed WebSocket API 连接；设备节点也连接同一个 WS server，但以 `role: node` 声明能力与命令。[Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)

模型只处理已经准备好的 turn。它不应该自己决定：

1. 陌生发送者能不能进来；
2. 这条消息属于哪个 agent；
3. 应该读哪一段历史；
4. 这一次能看见哪些工具和设备。

这四件事对应四道不同的门：

| 门 | 输入 | 输出 | 最危险的误读 |
|---|---|---|---|
| Channel admission | DM/group policy、pairing、allowlist、mention | 一组已接受的渠道事实 | “有 binding 就有权限” |
| Binding resolution | channel、accountId、peer、guild/team/role | agentId | “选 agent 就选好了 session” |
| Session construction | agentId、dmScope、identityLinks | sessionKey | “session ID 能授权租户” |
| Capability resolution | channel/account 能力、tool policy、sender、sandbox、plugin/runtime | 本 turn 可见能力 | “agent 拥有静态工具全集” |

Binding 只做归属。它既不会让被 channel policy 拒绝的消息获得访问权，也不会把已经准入的内容自动变安全。[Agent bindings](https://docs.openclaw.ai/concepts/agent-bindings)

## 图解：从渠道事实到有限能力

![OpenClaw 常驻 Gateway 路由与信任边界](/images/agent-system-series/06-openclaw/openclaw-persistent-gateway.svg)

**阅读指南：** 左侧是互联网输入，不论发送者是否可信，邮件、网页、附件与文档内容仍可能携带 prompt injection。中间 Gateway 先维护连接，再用确定性 binding 选择 agent；红色 session key 只是上下文坐标，不是授权。右侧两个 agent 分开 workspace、agentDir、auth 与 session store，但仍处于同一宿主和 operator 信任域。底部设备与副作用必须再经过配对、能力、tool/sandbox policy、幂等键和对账。

这张图故意没有画一条“同一个人”自动跨渠道合流的线。

因为 Gateway 能观察到的是 `channel / accountId / peer`，不是哲学或法律意义上的同一身份。把 Telegram 用户和 Slack 用户合并成一个人，仍然需要 operator 做出显式判断。

## 一条消息的精确路由链

固定版本中的 `ResolvedAgentRoute` 不只返回 `agentId`，还返回 `channel`、`accountId`、`dmScope`、`sessionKey`、`mainSessionKey`、`lastRoutePolicy` 与 `matchedBy`。路由结果同时决定 agent、上下文坐标和回复路径，而不只是“选一个角色”。[`resolve-route.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/resolve-route.ts)

完整链条可以写成：

```text
channel plugin receives message
  → admission
      dmPolicy / groupPolicy / pairing / allowlist / mention
  → normalized route facts
      channel / accountId / peer / guild / team / roles
  → binding resolver
      peer
      parent peer
      peer wildcard
      guild + roles
      guild
      team
      account
      channel
      default agent
  → agentId
  → dmScope + identityLinks
  → sessionKey
  → per-agent session store + per-session lane
  → tool / sender / sandbox / plugin / runtime policy
  → model turn
  → Gateway streaming + channel delivery
```

Bindings 按 specificity 匹配，同一层级中配置靠前者获胜；多个 match field 是 `AND` 关系。省略 `accountId` 只匹配 default account，不代表所有账号；匹配整个渠道必须显式写 `accountId: "*"`。[Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)

这是一套确定性代数。好处是事故可以追到某条 route fact 与某条规则；坏处是错误配置同样会被稳定执行。

### 一条宽规则怎样抢走消息

假设团队先写了一条 channel-wide fallback，后面又写 peer-specific binding，却把两者放在同一匹配层或引用了不存在的 agent。消息可能落到 default agent。

真正的防线不是让模型看到内容后“判断自己是不是客服”，而是：

- 启动时检查 binding 引用的 agent 是否存在；
- 把 account/channel wildcard 当作安全敏感配置；
- 用代表性 route facts 做 table-driven test；
- 在日志中保留 `matchedBy`；
- 变更后验证 `agents list --bindings` 与 channel probe；
- 对无法解释的 default fallback 直接失败，而不是静默继续。

OpenClaw 当前提供路由规则与诊断入口，但“生产配置必须 fail closed”是本文给 operator 的设计要求，不应冒充现有默认保证。

## Session key 是连续性开关

固定版本源码把 DM session 的主要形状写得很直接：[`session-key.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/session-key.ts)

```text
main
agent:<agentId>:<mainKey>

per-peer
agent:<agentId>:direct:<peerId>

per-channel-peer
agent:<agentId>:<channel>:direct:<peerId>

per-account-channel-peer
agent:<agentId>:<channel>:<accountId>:direct:<peerId>
```

每增加一维，session 数量会上升，上下文共享会下降，错误合并的概率也会下降。

默认 `main` 适合真正的单用户 personal assistant：所有 DM 共用一段连续历史。只要第二个人可以给它发私信，默认值就不再只是体验选择，而会成为隐私边界。官方 session 文档明确警告：多用户时若不启用 DM isolation，不同用户会共享 conversation context，并推荐 `per-channel-peer`。[Session management at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)

多账号场景还要再进一步。

回到开篇事故，修复不是清空模型记忆，而是：

```json5
{
  session: {
    dmScope: "per-account-channel-peer"
  }
}
```

两个 inbox 此时生成：

```text
agent:support:telegram:supporteu:direct:tg:12345
agent:support:telegram:supportus:direct:tg:12345
```

### identityLinks 是主键合并

同一个人从不同渠道出现时，OpenClaw 支持用 `session.identityLinks` 将多条外部身份映射到一个 canonical peer id。[Session management at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)

它适合被理解为一次主键合并，而不是一个昵称：

```text
telegram:111 ─┐
              ├─> canonical: alice
slack:U222 ───┘
```

如果 `slack:U222` 实际属于 Bob，系统会忠实地把 Alice 与 Bob 的上下文折叠在一起。OpenClaw 提供了 join 机制，没有替 operator 完成跨平台身份验证。

因此 identity link 需要：

- 可追溯的人工确认或上游身份提供方证据；
- preview：展示将被合并的 session 数与时间范围；
- 双向影响说明：读历史与未来写入都会改变；
- 可撤销映射，但不要承诺历史能无损“拆回去”；
- 高风险变更审计与二次确认。

## Per-agent enclave 隔离了什么

OpenClaw 的一个 agent 是完整的 persona scope：

- workspace 与 bootstrap files；
- `agentDir`、model registry 和 auth profiles；
- release tag 中的 `sessions.json` routing/lifecycle index 与 JSONL transcript；
- tool 与 sandbox policy。

release tag 的 session storage 仍由 `sessions.json` 索引与 JSONL transcript 组成；研究日在线文档已经描述迁移后的 agent-scoped SQLite。本文不会用 main 上的新存储实现回填 v2026.7.1-2。[Session at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)

官方文档还明确警告不要在 agents 间复用 `agentDir`，否则会产生 auth/session state collision。插件存储是否分 agent 则取决于插件自己的配置；新增第二个 agent 不会自动拆开所有全局 store。[Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)

这意味着 per-agent enclave 是有价值的状态分区，却不是容器或虚拟机。

尤其要拆开三个词：

| 对象 | 它控制什么 | 它没有自动控制什么 |
|---|---|---|
| Workspace | tools 与 context 的默认 cwd、bootstrap files | 绝对路径、宿主进程权限、网络 |
| Sandbox | tool 在隔离运行环境中的文件与进程边界 | Gateway operator、外部 API 权限 |
| Tool policy / approval | 哪些工具与参数可调用、是否询问 | 所有解释器间接路径、敌对租户隔离 |

官方文档直说：workspace 是默认 cwd，不是 hard sandbox；未启用 sandbox 时，绝对路径仍可能到达其他宿主位置。[Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)

所以“每个 agent 一个 workspace”不能被写成“每个 agent 一台安全计算机”。

## Gateway、Agent runtime 与模型各自拥有哪一段 loop

一次 embedded runtime turn 大致经过：

1. Gateway 接收 `agent` request，解析 session 并返回 run ID；
2. `agentCommand` 解析 model、auth、skills snapshot 与 workspace/sandbox；
3. run 进入 per-session/global lane；
4. runtime 组装 system prompt、bootstrap、history、tool schemas 与 attachment；
5. 模型生成文本或 tool call；
6. runtime 执行 tool continuation、stream event、timeout/abort；
7. Gateway 持久化并投递到原 channel route。

[Agent loop](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-loop.md)说明了 queue、context、model/tool streaming、persistence 与 stop 生命周期。

但 OpenClaw 不只支持自己的 embedded loop。不同 agent runtime 可以把低层 loop 交给外部 harness；例如 Codex app-server 拥有 canonical thread 与 model loop，OpenClaw 仍负责 channel routing、context projection、动态工具桥与 delivery。[Agent runtimes](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-runtimes.md)

因此更准确的所有权划分是：

| 层 | 拥有 |
|---|---|
| Gateway | admission、routing、session identity、capability、delivery、control-plane protocol |
| Agent runtime | prompt assembly 的运行时部分、model/tool continuation、compaction、stop |
| Model | 下一个 token、tool call 或 final response 的概率选择 |

这也解释了 OpenClaw 为什么是一个 Gateway 品类，而不只是又一个模型 wrapper：runtime 和 model 可以替换，渠道连续性与控制面仍然存在。

## 设备节点让“在线”变成现实权限

设备节点以 `role: node` 连接 Gateway，声明 `caps / commands / permissions`。新设备 ID 需要 pairing approval，Gateway 为后续连接签发 device token；改变 role、scope 或 public key 会触发新的配对请求。[Nodes](https://docs.openclaw.ai/nodes)

但 pairing 不是每条命令的审批。

一台已经配对并开放 `camera.*`、`screen.record`、`location.get` 或 `system.run` 的设备，会把 Agent 的影响面从消息窗口扩展到物理世界。设备记录、Gateway command policy 与节点自身 exec approval 是不同的控制层；撤销时也要同时清除配对、token、相关 session 和外部凭据。

常驻系统需要回答：

- 设备离线后，未送达命令会被丢弃、重试还是过期？
- 节点升级期间，Gateway 接受多大的协议版本偏差？
- capability 扩张是否必须重新批准？
- 设备被转让或丢失时，哪一份 durable pairing record 被撤销？
- 操作者能否从审计记录还原“谁批准了哪种能力”？

当前节点文档能证明 pairing、capability 与 revoke contract，也说明 Gateway 对 node protocol 只接受有限版本窗口；它不能证明所有设备副作用都具备 exactly-once delivery。

## 24/7 在线扩大了什么攻击面

把 Agent 变成常驻服务，不只提高可用性，也把短会话风险改成持续暴露。

### Prompt injection 不只来自陌生人

即使 DM 只允许本人发送，Agent 读取的网页、邮件、文档、附件、日志和代码仍然可能携带对抗指令。官方安全文档明确说 system prompt guardrail 不是硬边界；硬约束来自 tool policy、exec approval、sandbox 与 channel allowlist。[Security](https://docs.openclaw.ai/gateway/security)

一个实用分层是：

```text
untrusted inbox / web content
  → read-only reader agent
  → bounded, redacted summary
  → main agent
  → high-risk tool only after policy / approval
```

这不是保证 summary 无毒，而是减少原始内容直接拥有高权限工具的机会。

### 凭据会积累，也会过期

Gateway 可能长期保存 channel tokens、provider auth、agent auth profiles、pairing state、session history 与 transcript。v2026.7.1-2 将这些状态分布在 config、credentials、per-agent auth/session index 与 transcript 中；研究日在线文档已出现 SQLite 迁移后的新布局。无论代际，官方都建议收紧文件权限、启用磁盘加密并使用专用 OS user。[Security at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/gateway/security/index.md)

长期运行必须有一张凭据账本：

| 凭据 | Owner | Scope | Rotation | Revoke 验证 |
|---|---|---|---|---|
| Gateway auth | operator | control plane | 定期与泄漏后 | 旧 token 连接失败 |
| Channel token | channel account | inbound/outbound | 平台支持时 | probe 不再成功 |
| Model/provider auth | agent 或 Gateway | model/API | provider policy | 旧 profile 失效 |
| Device token | paired device | declared role/caps | re-pair/incident | node 断开且无法重连 |
| External tool credential | capability owner | resource/action | 业务周期 | read/write 均按预期失败 |

更新也不是一次 npm command。Gateway 与节点存在协议兼容窗口，正确顺序应是先 Gateway、再 nodes，并在升级前保存 config/state、验证 health 与回滚路径。[Nodes](https://docs.openclaw.ai/nodes)

## Idempotency 到哪里结束

Gateway WebSocket 对 `send`、`agent` 等有副作用的方法要求 idempotency key，并保留短期 dedupe cache，以便客户端安全重试同一请求。[Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)

这只覆盖 Gateway 接收层的一段窗口。

它不能推出：

- 邮件只发送一次；
- 工单只创建一次；
- 日历只写一条事件；
- 设备命令只执行一次；
- 崩溃后外部 API 的 outcome 已知。

对外部副作用，仍要使用稳定 operation key：

```text
operation_key
  = hash(agentId, sessionKey, intent_type, business_object, version)
```

写入前查询 ledger，调用目标 API 时传 idempotency key，保存 external reference；超时后先查目标系统，再决定 retry。若目标系统不支持幂等，就需要 compensating action 或人工 reconciliation。

OpenClaw 的短期 WS dedupe 与业务端幂等不是同一层。

## 崩溃恢复不能只靠重连

Gateway protocol 的 server-push events 不会 replay；客户端发现 sequence gap 后必须重新获取状态。官方建议由 launchd/systemd 监督 Gateway 自动重启，并通过 WS health 检查运行状态。[Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)

这暴露出三种不同恢复：

1. **连接恢复**：client/node 重连、重新握手、重新订阅；
2. **上下文恢复**：按 session key 读取持久 history，恢复下一 turn；
3. **副作用恢复**：根据 operation ledger 与外部 reference 对账。

第一种成功不代表第二种完整，第二种完整也不代表第三种没有重复。

常驻 Agent 的 stop 同样要分层：`agent.wait` 超时只停止等待，不必然停止底层 run；interrupt、runtime timeout、model watchdog、tool error 与 delivery failure 各有不同语义。UI 上的“没有回复”不能被等同为“没有执行工具”。

## 三层架构：同一个 Gateway，三种产品承诺

### Agent 架构

- loop：embedded runtime 或外部 harness 拥有 model/tool continuation；
- context：workspace bootstrap、history、skills、tools 与 attachments 被组装成有限窗口；
- memory：workspace memory、release tag 的 session transcript 与可选 retrieval 不是同一对象；
- delegation：subagent 有独立 session/context，但可能共享 workspace、host 与 operator trust；
- eval：QA/scenario/hook 可以外部检查，普通 turn 没有统一 online evaluator；
- stop：end、error、interrupt、timeout、watchdog 与 delivery stop 需要分别观察。

### 技术系统架构

- runtime：长期 Node.js/TypeScript Gateway 与可替换 agent runtime；
- protocol：typed WS request/response/event、JSON Schema、device handshake；
- state：shared config/state、per-agent `sessions.json`/JSONL、channel credentials；研究日 main 的 SQLite 迁移不回填 release；
- concurrency：per-session lane 与 transcript write/compaction coordination；
- recovery：health、restart supervision、state refresh、credential rotation；
- security：single trusted operator、channel admission、tool/sandbox policy、device pairing。

仓库 manifest 能证明项目主体是 TypeScript/Node.js，也能观察到多种 channel SDK、WebSocket、插件与跨平台客户端。把这一选择解释为“适合长连接、事件 I/O 与插件生态”是合理工程推论，但不是维护者公开发表的唯一语言选型动机。[package.json](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/package.json)

### 产品架构

- 用户任务：让一个助手跨消息入口、Web UI 和设备持续可达；
- 交互：渠道消息、Control UI、CLI、automations、device actions；
- 交付物：回复、文件、通知、外部系统变更、设备动作；
- 控制面：bindings、sessions、agents、tools、nodes、security audit；
- 生态：channels、plugins、skills、models、agent runtimes；
- 采用边界：愿意承担一台长期主机、凭据、更新、审计和事件响应责任。

三层共同说明：产品卖点“随处可达”其实由运维对象 “单一常驻 Gateway” 支撑，又被安全假设 “一个可信 operator boundary” 限定。

## Multi-agent 不是 hostile multi-tenant

OpenClaw 可以在同一个 Gateway 中运行多个拥有独立 workspace、state、auth 与 session 的 agents。这个能力足以分开 home/work persona，或把不可信邮件交给 reader agent。

它不等于让互不信任的组织安全共享一个 Gateway。

官方安全模型明确写明：一个 Gateway 对应一个 trusted operator boundary；authenticated operator 是 control-plane trusted role，`sessionKey` 只是 route selector。敌对或混合信任租户应使用独立 Gateway，最好进一步使用不同 OS user 或 host。[Security](https://docs.openclaw.ai/gateway/security)

当前 Fleet 文档把每个 tenant cell 定义为完整 Gateway、容器、state、credentials、workspace、channel account 与 token，并明确说明 Fleet 不提供共享 channel ingress router。[Multi-tenant hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting)

这给出了清楚的边界：

```text
同一可信 operator 的多个 personas
  → one Gateway, multiple agents

互不信任的 tenants
  → one Gateway cell per tenant
  → stronger OCI / VM / separate host as risk increases
```

不要用更多 session keys 去模拟一个并不存在的 tenant authorization layer。

## 什么时候应该采用 OpenClaw

OpenClaw 适合这些条件同时成立的团队或个人：

- 任务确实跨 Telegram、Slack、Web、CLI 或设备；
- 对话连续性比一次性 prompt 更重要；
- 有一台可以长期监督、更新与备份的运行环境；
- 能为 channel、agent、session 和 capability 写明确路由；
- 愿意把 credential rotation、security audit 与 incident response 当作产品责任；
- 外部副作用有幂等、回执或对账路径。

它不适合：

- 只需要单页面问答或一次性批处理；
- 互不信任的客户必须共享同一个应用进程；
- 没有人负责长期凭据、升级与告警；
- 希望 workspace 目录天然等于 sandbox；
- 希望模型自己推断发送者身份、租户或权限；
- 业务写入无法去重，也没有补偿和人工对账。

## 结论：连续性是一场受控的 join

OpenClaw 的核心不是让一个模型在所有渠道“无处不在”。

它把一条消息拆成一串可配置决策：

```text
谁能进来
  → 归哪个 agent
  → 进入哪段 history
  → 这一 turn 能做什么
  → 结果送回哪里
```

跨渠道连续性来自主动减少 session key 的身份维度；避免串线来自在多用户场景中把 channel、account 和 peer 放回 key。`identityLinks` 则是一场需要证据、预览、审计与撤销设计的身份 join。

Gateway 让这些决定集中、可见、可测试。它没有替 operator 保证 join 一定正确，也没有把 per-agent 状态分离升级成敌对多租户隔离。

**一个常驻 Agent 的可信度，最终不取决于它能记住多少，而取决于每一次“这是同一个人、同一个会话、同一种权限”的合并，能否被解释和撤销。**

## 参考资料

- [OpenClaw v2026.7.1-2 release](https://github.com/openclaw/openclaw/releases/tag/v2026.7.1-2)
- [Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)
- [Gateway protocol](https://docs.openclaw.ai/gateway/protocol)
- [Agent runtime](https://docs.openclaw.ai/concepts/agent)
- [Agent loop at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-loop.md)
- [Agent runtimes at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-runtimes.md)
- [Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)
- [Agent bindings](https://docs.openclaw.ai/concepts/agent-bindings)
- [Session management at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)
- [`resolve-route.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/resolve-route.ts)
- [`session-key.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/session-key.ts)
- [`runtime-capabilities.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/agents/runtime-capabilities.ts)
- [Nodes](https://docs.openclaw.ai/nodes)
- [Security](https://docs.openclaw.ai/gateway/security)
- [Multi-tenant hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting)
- [OpenClaw package manifest](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/package.json)
