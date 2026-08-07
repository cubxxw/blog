---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-openmontage
title: Instructions as Code：OpenMontage 如何用工件契约编排视频生产
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:48:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

OpenMontage 把 coding assistant 直接当 orchestrator，用 YAML manifest、Markdown stage skills、tool registry、canonical JSON artifacts、checkpoints 和成本账本组织视频生产。文章要研究：自然语言 instruction 能否承担控制面，同时用工件契约和 validator 保持可恢复性。

## 为什么值得由我写

这个项目能把 Skills 从“提示词技巧”推进到垂直系统设计：领域知识、阶段、工具、工件、人工审批和质量门如何组合。它与传统 Python/图编排形成鲜明对照，也能检验作者已有“给 AI 任务而不是方向”的公开原则。

## 目标读者与阅读场景

读者正在为视频、研究、设计或内容生产搭建垂直 Agent pipeline。读完后能定义 artifact schema、stage contract、checkpoint 和成本边界，并判断哪些规则可以留在 instruction、哪些必须升格成代码 validator。

## 编辑选择

- 文章轨道：`research`
- 已选形态：沿一件 canonical artifact 穿过整条制作链
- 核心张力：prompt 让领域编排可塑，硬状态和恢复语义却不能只靠 prompt
- 这次主动不讲：拍摄剪辑教程、模型生成质量排行、成片营销
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `8` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 仅以 [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) 的当前公开仓库为对象，固定 commit。
- 本轮允许公开的作者要求：重点解释架构、审美、语言/框架选择、生态关联和边界。

### 作者原话与在场片段

- 不声称作者已用它完成商业视频生产。

### 作者观察

- instruction 可以定义“应该怎么做”，但一次阶段是否完成、工件是否符合契约、钱是否已经花掉，需要独立状态和验证。

### 待验证推论

- OpenMontage 代表 `Instructions as Code` 的垂直 Agent 形态；要检查它相对代码 orchestrator 的收益与恢复代价。

## 参考方向

- 从 [PROJECT_CONTEXT](https://github.com/calesthio/OpenMontage/blob/main/PROJECT_CONTEXT.md)、[ARCHITECTURE](https://github.com/calesthio/OpenMontage/blob/main/docs/ARCHITECTURE.md)、[AGENT_GUIDE](https://github.com/calesthio/OpenMontage/blob/main/AGENT_GUIDE.md) 与 [`pipeline_defs`](https://github.com/calesthio/OpenMontage/tree/main/pipeline_defs) 起步。
- 核验“没有 Python orchestrator、coding assistant 就是 orchestrator”在当前实现中的真实含义。
- 区分 skill 说明、tool execution、canonical artifact、checkpoint、self-review 和外部 validator。
- 分析 YAML/Markdown/Python 的职责划分；只能引用明确设计说明或标注工程推论。

## 图示任务

回答“instruction 如何编排、artifact 如何保住状态”。用电影胶片式 artifact river，stage 上方放 director skill、下方放 tool registry，中间流动 canonical JSON；在人工批准、外部素材和 publish 处设置边界。输出 `08-openmontage/openmontage-artifact-production-line` 三种格式。

## 证据与隐私边界

- 可以公开：公开仓库、设计文档、源码观察和架构推论。
- 必须匿名：不使用第三方未授权素材案例。
- 禁止使用：受版权限制的素材、私有 API key、未公开 pipeline。
- 发布前仍需作者确认：Instructions as Code 品类判断和与代码 orchestrator 的取舍。

## 不要写成

不要写成视频制作教程。不要虚构一个隐藏 orchestrator，也不要把 Skill 写成真正执行工具的进程；同一 Agent 的 self-review 不得包装成独立验证。

## 验收标准

- [ ] stage/skill/tool/artifact/checkpoint/validator 六者职责清楚
- [ ] 明确指出 prompt 控制流的恢复与一致性边界
- [ ] 读者能为自己的垂直流程写出 artifact contract
- [ ] 语言与文件格式选择有证据或明确推论标签
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-openmontage.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 三路独立研究固定 OpenMontage commit 4eab34c，核验 coding-assistant 控制面、YAML/Markdown instruction、Python tool contract、canonical artifact、checkpoint/gate、成本账本、Backlot 观察面、三种渲染路径与本地 export 边界
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: Instructions as Code 是对固定架构的品类判断，不是协议标准；当前源码没有顶层 Python pipeline runner，但局部状态转移和运行时约束已经由代码承担

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：`calesthio/OpenMontage` 研究日没有 tag 或 GitHub Release；固定 `main` commit `4eab34c5cfcccaa4f1970554928feccce73ee930`，提交于 2026-08-03T09:19:08Z。官网 Studio 仍是未普遍开放的开发中产品，不从 UI 反推闭源运行时。
- 三路独立研究：
  - Agent 架构：coding assistant 读取 manifest、stage skill、前序工件和 capability envelope，拥有顶层创意编排；Python 没有通用 LLM runner，但拥有 checkpoint prerequisite、gate、tool 与 render runtime 的局部硬约束。EP/director delegation 是否形成真实 subagent 取决于宿主。
  - 系统架构：plain-file project、JSON Schema 与原子 checkpoint 支持 stage 级恢复；events/history 有 best-effort 部分，provider call、asset、cost 和 checkpoint 没有共同事务，也没有全局 operation ledger、lease 或 exactly-once。
  - 产品架构：用户 job 是把完整视频生产变成可见、可修改、可审批的工件链。Backlot 是文件派生的只读观察面，当前 publish 工具只生成本地 export bundle；采用仍要求 coding-agent host、Python/Node/FFmpeg 与可选 provider。
- 核心对象分工：Stage 定义一段工作；Skill 描述应该怎样做；Tool 执行真实副作用；Artifact 固化阶段交付；Checkpoint 固化状态和批准；Validator 只证明有限的机械性质。same-agent self-review 不是独立 evaluator。
- 保留的一手来源：
  - [fixed commit](https://github.com/calesthio/OpenMontage/commit/4eab34c5cfcccaa4f1970554928feccce73ee930)、[PROJECT_CONTEXT](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/PROJECT_CONTEXT.md) 与 [Architecture](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/docs/ARCHITECTURE.md) → 对象、控制面与层次；不能证明每个 host/model 的服从率或 Studio 内部实现。
  - [Animated explainer manifest](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/pipeline_defs/animated-explainer.yaml) 与 [manifest schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/pipelines/pipeline_manifest.schema.json) → stage、工件、criteria 和人工 gate 声明；不能证明所有 criteria 都被代码逐项执行。
  - [checkpoint implementation](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/lib/checkpoint.py) 与 [protocol](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/skills/meta/checkpoint-protocol.md) → 当前文件原子替换、前置关系、批准和 partial progress；不能证明外部副作用可回滚或跨进程并发安全。
  - [BaseTool](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/base_tool.py)、[asset schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/artifacts/asset_manifest.schema.json) 与 [render schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/artifacts/render_report.schema.json) → tool result 与 artifact shape；不能证明 idempotency、完整版权谱系、事实或观看质量。
  - [reviewer skill](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/skills/meta/reviewer.md) 与 [video compose](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/video/video_compose.py) → 同 Agent 最多两轮自审、media probe 与 runtime route；不能证明独立判断或 semantic success。
  - [cost tracker](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/cost_tracker.py)、[export bundle](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/publishers/export_bundle.py) 与 [Backlot](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/backlot/README.md) → estimate/reserve/reconcile、本地导出与只读 UI；不能证明 provider 已退款、平台已发布或事件日志完整。
- 失败模式验证一：付费 provider 已写入 `scene_04.mp4`，却在 manifest/cost/checkpoint 前崩溃。重启只能确认 stage 未完成，不能证明孤儿文件与收费 job 的一一关系；安全恢复需要差集、隔离、媒体检查、来源/费用核对和人工决定。
- 失败模式验证二：渲染命令退出 0、MP4/stream/schema 均合法，但成片没有 audio stream；固定源码可能记录警告而不把工具结果提升为 fail。执行成功、工件合法与作品可发布必须分层。
- 图示问题：instruction 如何编排，artifact 如何保住状态。
- 图示交付：
  - `assets/diagrams/agent-system-series/08-openmontage/openmontage-artifact-production-line.excalidraw`
  - `static/images/agent-system-series/08-openmontage/openmontage-artifact-production-line.svg`
  - `static/images/agent-system-series/08-openmontage/openmontage-artifact-production-line.png`
- 最强边界：OpenMontage 可称 artifact-first、checkpoint-resumable 的可编程视频生产 harness；不能称 durable distributed workflow engine、完整 provenance system、exactly-once pipeline 或自动版权/发布保证。
- 证据缺口：跨工件外键、input/output hash、provider job ID、统一 operation ledger、跨进程 checkpoint lease、完整工具链版本、版权必填字段、质量 benchmark、生产 SLA、RBAC/HA/灾备和 Studio runtime 均没有固定提交下的统一公共契约。
- 未决作者判断：Instructions as Code 品类、与代码 orchestrator 的取舍、版权与无音轨反例措辞、最终发布仍需作者确认。
