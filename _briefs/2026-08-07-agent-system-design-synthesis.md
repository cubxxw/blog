---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-synthesis
title: Agent 不是一种产品：十套系统如何重新分配控制权、状态、身份与副作用
status: ready-to-publish
priority: low
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:51:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

Agent 不是单一产品形态。十套系统的差异可以被还原为五个所有权问题：谁控制下一步、状态存在哪里、使用什么执行身体、权限由哪一层强制、用户通过什么产品表面协作。聚合篇要从十篇证据回执中推出设计语法和决策树，而不是做十段摘要。

## 为什么值得由我写

作者已有 Harness 八支柱总纲；该文回答“一个生产 Agent 需要什么”。本篇的新增长是回答“不同系统为什么把这些支柱交给不同所有者”，并由此区分 minimal harness、coding harness、event platform、workflow、gateway/cloud computer 和 vertical system。

## 目标读者与阅读场景

读者正在设计一个新的 Agent 产品，不知道自己需要结构化函数、确定性 workflow、交互式 harness、事件平台、完整计算机、常驻 gateway 还是 multi-agent。读完后应能沿决策树选择最小成立形态，并为副作用、状态、身份和验证安排明确所有者。

## 编辑选择

- 文章轨道：`research`
- 已选形态：从控制权宪法推导 Agent 品类，而非横向功能排行
- 核心张力：自治看似是连续升级，真实设计却是在不同层重新分配责任
- 这次主动不讲：十篇内容摘要、统一总分榜、未来预测清单
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `11` / total `11`
- 执行要求：独立 executor；使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`
- 解除阻塞条件：十篇个案全部达到 `ready-to-publish` 或 `published`，各自 `### 系列研究回执` 完整，并进入同一干净基线

## 已批准素材包

### 事实与项目证据

- 只聚合十篇个案保留的一手来源、固定版本和研究回执；不得把个案文章的修辞直接当事实。
- 可与公开 `agent-engineering-the-98-percent-harness.md` 对照，必须说明本篇的所有权模型是新增量。
- 系列名建议为“Agent 系统设计解剖”，slug `agent-system-design`，顺序共 11 篇。

### 作者原话与在场片段

- 本轮作者明确要求：每个对象独立深研，最后另起一篇聚合链路、推测当前 Agent 形态，并给出设计新 Agent 的深层建议。

### 作者观察

- 好的 Agent 系统只在真正不确定的地方给予模型自由；其他部分应尽量成为可验证、可恢复、可审计、可撤销的结构。

### 待验证推论

- `Agent 形态 = 控制权 × 状态 × 执行身体 × 权限强制层 × 产品表面` 可以成为比“自治程度”更有解释力的分类模型。

## 参考方向

- 先由只读 evidence auditor 对十份回执做版本、来源和概念口径审计；遇到冲突必须回到原始来源。
- 推导至少六类形态：bounded function、deterministic workflow、minimal/coding harness、event platform、gateway/cloud computer、vertical organization。
- 形成选择顺序：能否写成函数 → 能否写成 workflow → 是否需要模型控制 loop → 是否需要 durable event state → 是否需要完整计算机/常驻身份 → 是否存在真实可隔离的多 Agent 子问题。
- 结论必须包含反例、代价和停止条件，不做未来趋势堆砌。

## 图示任务

回答“哪些决定交给模型，哪些必须由代码、策略、人和证据拥有”。画一条“意图 → 不确定性 → effect proposal → policy/approval/idempotency → world mutation → artifact/evidence → memory/eval”的宪法之河，把十个项目作为不同河段的典型停靠点；不得画成熟度阶梯。输出 `11-synthesis/agent-system-constitutional-route` 三种格式。

## 证据与隐私边界

- 可以公开：十篇已核验的一手来源、公开文章、系列比较模型。
- 必须匿名：无需使用私人用户或组织案例。
- 禁止使用：Brain 私有 dossier、未进入个案回执的推论、任何凭据或内部任务内容。
- 发布前仍需作者确认：分类模型、设计建议、所有趋势推论、系列名与专栏入口。

## 不要写成

不要做十篇摘要、产品排行榜或“更自治就更先进”的线性进化史。不要把多个角色数量当成独立判断，也不要让 summary executor从二手文章措辞制造新事实。

## 验收标准

- [ ] 十篇个案回执齐全后才解除 `blocked`
- [ ] 每个横向结论能回到至少一个一手来源和一个反例
- [ ] 给出可执行的 Agent 形态决策树
- [ ] Harness 总纲与本篇所有权模型的增量明确
- [ ] 聚合 executor 与十篇个案 executor 相互独立
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-synthesis.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 聚合 executor 只读取十份 ready-to-publish 个案回执及其保留的一手来源；三路独立审计分别比较 Agent 控制权、系统状态/副作用和产品形态/采用边界，形成五轴所有权模型、六种形态、五层关闭协议与决策树
- checks: 十篇解锁条件审计、brief schema、AI flavor、front matter、canonical tags、column taxonomy、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: 未做十篇摘要或产品排行；所有横向结论保留支持案例与反例。“Event platform”“控制权宪法”“六种形态”均明确为基于固定样本的分析模型，不冒充项目官方分类或行业统计

### 系列研究回执

- 研究日期：2026-08-07
- 解锁审计：Claude Code、Pi、Codex、Manus、n8n、OpenClaw、TaxHacker、OpenMontage、TradingAgents、OpenHands 十份 brief 均为 `ready-to-publish`，各自包含对象冻结、三路研究、一手来源、最强边界、证据缺口和图示交付；聚合未在此之前启动。
- 聚合证据边界：只使用十篇个案回执保留的一手来源与固定版本；不把个案修辞当事实，不补画 Claude Code/Manus/Cloud 等闭源 scheduler、queue、database 或 production topology。
- 与 Harness 总纲的增量：
  - 既有八支柱回答“生产 Agent 需要哪些能力”。
  - 本篇回答“能力交给谁、状态放哪里、哪一层能强制、谁为副作用和验收负责”。
  - 新基本单元不是第九根组件，而是所有权：下一步、context、tool effect、durable state、delegation、eval、stop 分别由 model、code、runtime、policy、external system 或 human 中谁拥有。
- 三路独立研究：
  - Agent 架构：提出 `proposal → authorization → execution → evidence → closure` 五层行动权；模型可提议，强制权、事实权和业务关闭权必须落到代码、策略、外部系统或人。多角色只有在输入、证据、工具或写集真正独立时才增加判断样本。
  - 系统架构：十案都存在 authoritative bundle、derived projection 与 independently authoritative world state；session/checkpoint/event/queue ID 不能代替外部 idempotency。最关键恢复类型是 `unknown outcome`，必须先对账再 retry。
  - 产品架构：`Agent form = transition ownership × durable state × execution body × enforcement boundary × interaction/identity surface` 比自治程度更能解释产品差异；五轴之后还需 `canonical artifact × external evidence × named error owner` 作为验收收据。
- 五个所有权问题：
  1. 谁控制下一步：code、model 还是 human；
  2. 状态在哪里：record、workflow DB、session/event、workspace 或 external world；
  3. 用什么执行身体：function、node/worker、tool/shell、browser、computer 或 device；
  4. 哪一层能强制：schema、graph、hook/permission、approval/RBAC、sandbox、credential scope、idempotency；
  5. 人从哪里协作：form、canvas、CLI/IDE、API、chat、computer/artifact surface。
- 六种最小成立形态：
  - Bounded function：TaxHacker；一次 typed transform + application/human commit。反例是 schema-valid 仍可语义错误。
  - Deterministic workflow：n8n；代码 graph 拥有主路径，模型只在局部 island 处理不确定性。反例是 graph/queue 不保证第三方副作用确定。
  - Model-led harness：Pi、Claude Code、Codex；下一步依赖 observation。反例是 session tree/checkpoint 不回滚 working tree/API，最小 kernel 也不等于生产完备。
  - Event platform：OpenHands；无状态 step、typed history、lifecycle、分支和 local/remote resume。反例是 event protocol/channel/JSONL 不自动 durable，event replay 也不恢复 workspace/world。
  - Gateway / computer：OpenClaw 解决跨 channel/account/device identity，Manus 提供通用 computer/browser 身体。二者是不同轴；routing identity 不是 tenant authorization，machine persistence 不是 effect rollback。
  - Vertical organization：OpenMontage、TradingAgents；领域 stage/role、artifact 与验收成为主结构。反例是 persona 或 same-agent review 不等于独立证据。
- 决策树：
  1. 能否写成一次 typed transform？能则止于 bounded function。
  2. 全局状态转移能否画成代码 graph？能则用 deterministic workflow，只保留 Agent island。
  3. 下一步是否必须依据 tool observation 动态选择？否则回退普通应用/workflow；是则 model-led harness。
  4. 是否需要跨崩溃/跨小时/fork/resume/multi-surface？是才增加 event-backed runtime。
  5. 连续性来自 channel/account/device 还是 browser/files/process？分别选择 gateway 或 computer runtime。
  6. 子问题是否有可隔离输入、写集、独立 evidence 与明确 join？只有成立才增加 delegation/vertical organization。
- 五层关闭协议：
  - Turn stop：模型不再请求 tool；不证明任务正确。
  - Run stop：runtime/graph 不再调用 step/node；`FINISHED`/`END` 不证明业务验收。
  - Commit stop：candidate 成为 canonical record/artifact；shape/checkpoint success 不证明外部事实。
  - Effect closure：provider receipt、target query 或 reconciliation 证明外部 mutation 状态。
  - Value closure：tests/CI/review、领域 validator 与 human acceptance 证明结果可采用。
- 横向主张与反例：
  - 模型只控制不可预写的下一步：Pi model/tool loop 支持；TaxHacker 反证一次抽取无需 loop。
  - 外层 graph 可包住局部 Agent：n8n 支持；开放仓库修改的 Claude Code/Codex 无法预列所有边。
  - Event protocol 不等于 event platform：OpenHands 有 event/base/view/lifecycle；OpenClaw socket events 明示不 replay，Codex channel 未证明 durable。
  - Session 恢复不等于世界恢复：Pi/Claude checkpoint 与 OpenHands orphan Action 支持；n8n DB execution 也不能对账第三方写入。
  - Permission、sandbox、identity、idempotency 保护不同对象：Claude Code/Pi/OpenHands/OpenClaw 共同支持；n8n HITL/RBAC 说明 OS sandbox 不是所有 effect 的唯一强制层。
  - 计算机是身体不是验收器：Manus 支持；OpenMontage exit 0/合法 MP4 仍可能无音轨。
  - 角色数不是独立样本数：TradingAgents shared models/reports 与 OpenMontage same-agent review 是反证。
  - Canonical artifact 决定关闭权：TaxHacker显式 save、OpenMontage artifact/checkpoint、coding diff/CI/PR 支持；task reply、graph END 和 FINISHED 均不充分。
- 公共恢复协议推论：
  1. 停止 dispatch 并 fence execution/session；
  2. 冻结 tenant/account/agent/session/operation identity 与 authoritative state bundle；
  3. 建 operation ledger：proposal、policy、approver、idempotency key、dispatch、provider job ID、receipt、target identity、evidence pointer；
  4. 找出 proposal/approval/dispatch/receipt/commit 之间的不完整边；
  5. 先查询外部世界，区分 `confirmed_not_applied`、`confirmed_applied`、`partially_applied` 与 `unknown`；
  6. 分别恢复 workspace/Git、VM FS、browser session、provider artifact 和 SaaS record；
  7. 从权威状态重建 derived view/context/UI；
  8. 用独立 oracle 验收并追加恢复审计。
- 当前形态推论：基于十个样本，系统更可能收敛为 `deterministic spine + model-controlled uncertainty islands + explicit execution/identity cells + evidence/reconciliation plane`，而不是吞下全部所有权的超级 Agent。此项是架构推论，不是行业统计或未来保证。
- 图示问题：哪些决定交给模型，哪些必须由代码、策略、人和证据拥有。
- 图示交付：
  - `assets/diagrams/agent-system-series/11-synthesis/agent-system-constitutional-route.excalidraw`
  - `static/images/agent-system-series/11-synthesis/agent-system-constitutional-route.svg`
  - `static/images/agent-system-series/11-synthesis/agent-system-constitutional-route.png`
- 专栏交付：
  - `content/zh/columns/agent-system-design/_index.md`
  - 十一篇中文文章均加入 `columns: [agent-system-design]`，系列导航保留 `series.name/slug/order/total`。
- 最强边界：五轴模型与六种形态是责任分配的分析语法，不是互斥 taxonomy、成熟度排行或官方品类。一个系统可同时包含 workflow、harness、event runtime、gateway 或 vertical artifact pipeline。
- 公共证据缺口：通用 effect/idempotency/outbox 协议；Action/dispatch/receipt/target 的标准关联键；跨 state/workspace/artifact/第三方 API 一致性；`unknown outcome` 的统一 UI；端到端身份绑定；多 Agent 有效样本量；可复现 model/prompt/tool/data manifest；semantic evaluator 与恢复故障注入 benchmark；Cloud 租户隔离、审计保留、灾备和 SLO。
- 未决作者判断：五轴模型、六种形态、“控制权宪法之河”、当前形态推论、系列/专栏命名和最终发布仍需作者确认。
