---
title: 'Instructions as Code：OpenMontage 如何用工件契约编排视频生产'
date: 2026-08-07T18:20:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Automation
  - Content Strategy
  - Development
  - Open Source
description: >
  以 OpenMontage 固定提交为样本，沿脚本、分镜、素材、剪辑、渲染与导出追踪规范工件，解释 coding assistant 如何用 YAML 和 Skill 驱动生产。文章拆开 tool、checkpoint、validator 与人工门，并以无音轨成片和付费素材崩溃检验恢复、成本、版权及发布边界。
tldr:
  - OpenMontage 没有隐藏的 Python 顶层 orchestrator；外部 coding assistant 读取 YAML manifest 与 Markdown skills，拥有创意编排，Python 只执行工具和一部分硬状态约束。
  - canonical JSON artifacts 是阶段间的窄腰。它们让新会话能从文件重建上下文，却不是带 hash、外部 job ID 和完整版本的可证明 provenance graph。
  - checkpoint 会原子替换当前状态、检查前置 stage 并强制部分人工门；它不与 provider 调用、素材文件、成本账本和渲染输出构成一个事务。
  - 同一 Agent 的 self-review 是收敛协议，不是独立 evaluator。命令退出 0、MP4 存在、schema 合法，仍可能得到没有音轨或不可发布的成片。
  - Instructions as Code 的成熟用法并非把所有规则写进 Markdown：可塑判断留在 instruction，不可妥协的推进条件升格为代码 validator。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 8
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/08-openmontage/openmontage-artifact-production-line.svg
  alt: 'OpenMontage 由 instruction 控制带、canonical artifact 胶片河和工具检查点验证带组成的视频生产架构图'
---

渲染命令退出码是 `0`。

MP4 文件存在，容器可被 `ffprobe` 读取，`render_report` 也符合 JSON Schema。流水线甚至可能给出 `pass`，建议把成片交给用户。

但视频没有音轨。

对一支依赖旁白的 explainer，这不是“有一点瑕疵”，而是不可发布。OpenMontage 固定版本里的终检会记下 `No audio stream in output`，却没有稳定地把这句话提升为 critical failure；只要容器有效，工具层仍可能返回成功。[`video_compose.py`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/video/video_compose.py)

**执行成功、工件合法和作品可发布，是三种不同的成功。**

这个缺口恰好揭示 OpenMontage 最值得研究的地方。它不是又一个“输入提示词、等待生成视频”的模型壳，而是试图把完整制作过程拆成可阅读的 instruction、可调用的 tool、可交接的 artifact、可恢复的 checkpoint、可机械执行的 validator 和不可外包的人工批准。

本文研究对象是 [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage)。研究日仓库没有 tag 或 GitHub Release，因此不虚构语义版本；源码冻结在 2026-08-03 的 commit [`4eab34c5cfcccaa4f1970554928feccce73ee930`](https://github.com/calesthio/OpenMontage/commit/4eab34c5cfcccaa4f1970554928feccce73ee930)。OpenMontage Studio 在官网条款中仍属未普遍开放的开发中产品，本文不从官网界面反推其闭源运行时。[OpenMontage Terms](https://www.openmontage.video/terms)

## 没有 Python orchestrator，不等于没有代码控制

OpenMontage 的公开架构写得很直接：

```text
coding assistant is the orchestrator
Python = tools + persistence
```

Claude Code、Codex、Cursor、Copilot 或 Windsurf 这类宿主负责读 manifest、加载 stage skill、决定下一动作、选择工具、自审和发起人工 gate。OpenMontage 的 Python runtime 不再内嵌一个通用 LLM planner。[`ARCHITECTURE.md`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/docs/ARCHITECTURE.md)

这不是说控制流全部存在于提示词。

固定源码里，程序至少拥有三类局部控制：

- `pipeline_loader.py` 用 schema 校验 YAML manifest 并解析 stage 顺序；
- `checkpoint.py` 计算 next stage、检查所有 predecessor、验证 canonical artifact，并在写入时强制人工批准；
- `video_compose.py` 按已经锁定的 `render_runtime` 路由 Remotion、HyperFrames 或 FFmpeg，失败时不允许静默换引擎。

因此更准确的句子是：

> 模型拥有顶层业务编排；程序拥有局部状态转移、工具执行与不可静默改变的运行边界。

这也是本文使用 **Instructions as Code** 的含义。它是一个架构判断，不是说 Markdown 自动获得了类型系统、事务和并发控制。

## 图解：一条 canonical artifact 胶片河

![OpenMontage instruction、artifact 与 validator 生产线](/images/agent-system-series/08-openmontage/openmontage-artifact-production-line.svg)

**阅读指南：** 上方是 instruction control lane。YAML manifest 定义顺序、门与成功标准，Markdown director skill 提供领域做法，coding assistant 解释两者并调用工具。中间不是聊天消息，而是一条 canonical JSON artifact river；红框是 representative pipeline 中由代码要求人工批准的 stage。下方是工具、外部 provider、checkpoint、成本账本和独立检查。外部素材调用已经产生的费用与文件，不会因为 checkpoint 回滚而消失。

图中没有把 stage skill 画成进程，也没有把 self-review 画成第二位 reviewer。

因为两者都不是。

## 六个对象必须拆开

| 对象 | 它拥有的职责 | 它不能证明什么 |
|---|---|---|
| Stage | 一段生产目标及其输入、输出、gate | 这一段实际上执行正确 |
| Skill | 告诉 Agent 应该怎样研究、写作、剪辑或审查 | 它的指令一定被加载和服从 |
| Tool | 执行文件、API、媒体与渲染副作用，返回 `ToolResult` | 输出的创意、事实或权利正确 |
| Artifact | 用 JSON 固化阶段交付，供下游重新读取 | 字段指向的现实对象一定真实 |
| Checkpoint | 固化 stage 状态、前置关系、批准与部分进度 | 外部副作用 exactly-once |
| Validator | 证明 schema、媒体流、路径或特定规则成立 | 整支视频值得发布 |

[`BaseTool`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/base_tool.py) 将工具接口统一成：

```text
execute(inputs)
  → success
  → data
  → artifacts
  → error
  → cost / duration / seed / model
```

工具还可以声明 dependency、runtime、side effects、retry、resume support、fallback 和 idempotency-key fields。这让 coding assistant 看见一套 capability envelope，而不是凭名字猜工具。

但 `idempotency_key_fields` 目前主要是描述与可计算 metadata。没有全局 operation store 拦截重复调用，也没有 provider job ledger 把同一远端请求去重，所以它不能升级为“系统已经幂等”。

## Artifact 如何成为阶段间的窄腰

以 `animated-explainer` manifest 为例，典型生产链是：[pipeline manifest](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/pipeline_defs/animated-explainer.yaml)

```text
research_brief
  → proposal_packet + decision_log
  → brief + script
  → scene_plan
  → asset_manifest
  → edit_decisions
  → render_report + final_review
  → publish_log
```

每个 stage 都可以换模型、换会话，甚至换 coding-agent host，只要下游重新读取约定的文件。

这是一种比“让 Agent 记住刚才说了什么”更稳的连续性。长期任务的核心状态不依赖对话窗口，而依赖 `projects/<id>/` 中可见、可校验、可版本化的工件。

### 谱系能追到哪里

`scene_plan` 可以把 scene 指回 script section；`asset_manifest` 可以记录 scene、path、source tool，以及可选的 provider、prompt、seed、model、cost、license 和 original URL；`edit_decisions` 可以锁定 renderer 与 cut；`render_report` 可以记录输出路径、格式、分辨率和时长。[Asset manifest schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/artifacts/asset_manifest.schema.json) · [Render report schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/artifacts/render_report.schema.json)

它已经是一条可读的语义谱系，却还不是可证明重放的 provenance graph：

- 跨工件的 `scene_id`、`script_section_id` 和 asset ID 只是字符串，没有普遍外键检查；
- asset 的 license、provider、original URL、prompt 和 seed 不是通用 required 字段；
- render report 不强制记录输入 hash、仓库 commit、renderer、字体、操作系统和完整依赖版本；
- schema 合法只证明 JSON 形状，不证明文件内容、来源权利或叙事语义。

所以“canonical”应理解为 **系统选择的交接格式**，而不是“客观世界中已经证实的事实”。

## Checkpoint 能恢复阶段，不能撤销世界

OpenMontage 的 checkpoint 有真实的代码约束。

状态限定为：

```text
in_progress
awaiting_human
completed
failed
```

后续 stage 要推进，所有 predecessor 必须完成；要求批准的 predecessor 还必须携带 `human_approved=true`。受 gate 保护的 stage 不能直接从未批准状态写成 completed。[`checkpoint.py`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/lib/checkpoint.py)

写当前 checkpoint 时，程序先序列化到 `.tmp`，再用 `os.replace` 原子替换，避免进程中断留下半截 JSON。被覆盖的 completed 或 awaiting checkpoint 会 best-effort 复制到 `history/`；归档失败只记 warning，不阻断当前写入。

这给出了三个有用保证：

1. 当前 checkpoint 不会因中途写失败而截断；
2. stage 顺序和显式批准不能通过正常写入接口跳过；
3. 长 stage 可以把 `completed_scene_ids` 写进 partial progress，重启后跳过已经确认的 item。

它没有把下面四步包进同一个事务：

```text
调用付费 provider
  ┆ 写入素材文件
  ┆ 更新 asset manifest / cost log
  ┆ 原子替换 checkpoint
```

### 一个会重复收费的崩溃

假设 provider 已经生成并收费，`scene_04.mp4` 也落盘了；进程却在更新 manifest 和 checkpoint 前崩溃。

重启后，系统只知道 assets stage 没有完成。它不知道：

- 孤儿文件是否对应刚才那次已收费 job；
- 同 prompt、model、seed 的重试是不是同一个 operation；
- provider 是否仍能查询原 job；
- cost log 里的 reservation 与文件能否一一对应；
- 再调用一次会复用、退款还是重复收费。

安全恢复必须先把 `assets/` 与 manifest 做差集，隔离 orphan file，执行 `ffprobe`，核对 scene、provider、prompt、seed、license 和 cost，再由人选择复用还是重发。

若要把边界提升为可自动 reconciliation，至少需要：

- `run_id / stage_attempt / item_operation_id / provider_job_id`；
- 输入与输出 SHA-256；
- durable reservation → provider call → artifact commit journal；
- project/stage lease 或 compare-and-swap generation；
- renderer、模型、字体、FFmpeg/Remotion 和系统版本；
- 重启后先查询 provider job，再决定 attach、refund 或 retry。

在这些机制出现前，准确说法是 **checkpoint-resumable**，不是 exactly-once，也不是完整可重放。

## 同一 Agent 的 self-review 不是独立验证

OpenMontage 的 reviewer skill 要求每个 stage 在 checkpoint 前做 schema validation、review focus、playbook 检查和 success criteria 评估。发现 critical 问题时返工；最多两轮后仍有 critical，可 `PASS_WITH_WARNINGS` 继续。[Reviewer skill](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/skills/meta/reviewer.md)

它的价值是把模糊的“再看一眼”改成结构化 critique protocol。

它的边界同样明确：

- reviewer 仍是做出原始决策的同一个 Agent；
- checkpoint 的 `review` 字段不是 universally required；
- checkpoint writer 不证明 reviewer 真执行过；
- 两轮上限优先保证任务收敛，而不是保证所有问题消失；
- model、context 和 instruction 相同，错误高度相关。

真正独立的检查是另一类对象：

- JSON Schema：字段和类型；
- 文件存在与 path containment：工件位置；
- `ffprobe`：container、stream、duration、codec；
- HyperFrames lint/validate：特定 runtime 的静态规则；
- frame/audio probe：有限的媒体性质；
- 人播放、听完、核对事实与权利：发布判断。

这几层不能互相冒充。

## 为什么“无音轨”能穿过成功链

开篇反例不是想象出来的边缘情况。

固定源码的 final review 会检测 audio stream，并可能写下 `No audio stream in output`。但自动失败依赖另一组 critical keyword；这条文字不一定命中。render wrapper 只在 final review 明确为 `fail` 时把工具结果变为失败，即使状态是 `revise`，`ToolResult.success` 也可能保持 true。[`video_compose.py`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/video/video_compose.py)

于是会形成：

```text
command exit 0
  → file exists
  → container valid
  → render_report schema-valid
  → automated review non-fail
  → tool success
  → 但 explainer 没有旁白
```

类似地，`unreadable_text` 与 `broken_overlays` 字段存在，不代表代码真的理解了字体可读性和构图；burned-in subtitle 也不能只因 subtitle source 存在就被证明可见。

这说明视频系统真正难处理的是 **semantic success**。结构验证可以淘汰坏 JSON 和坏容器，却无法自动定义“这支片已经完成了承诺”。

## 人工 gate 应该放在哪里

代表性 explainer manifest 对 proposal、script、scene plan、assets 和 publish 设置默认人工批准；edit 与 compose 默认不逐项阻断。[Animated explainer manifest](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/pipeline_defs/animated-explainer.yaml)

这是比“所有创意决定都经用户批准”更准确的实现描述。

Gate 的最佳位置不是平均分布，而是在错误成本发生跳变之前：

| Gate | 此时批准什么 | 若太晚发现的成本 |
|---|---|---|
| Proposal | 方向、受众、预算、风格 | 后续全部返工 |
| Script | 事实、叙事、时长、口吻 | 分镜、配音、素材重做 |
| Scene plan | 镜头与素材需求 | 生成错误资产 |
| Assets | 每个 scene 的可用素材与权利 | 昂贵合成和重渲染 |
| Publish | 播放体验、事实、品牌、权利、分发元数据 | 对外事故 |

人工批准也不是布尔魔法。只有界面同时展示将被批准的 artifact、diff、预算变化、source/license 缺口和成片回放，`human_approved=true` 才代表一次有信息的决定。

Backlot 的价值正在这里：它从 project files、checkpoints、artifact、events 和 render 派生 production board，而不拥有第二套 canonical state。它是只读 projection，不是 orchestrator，也不是 NLE。[Backlot README](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/backlot/README.md)

## 成本、版权和“本地优先”的真实边界

成本账本采用 estimate → reserve → reconcile，并可配置 observe、warn 或 cap；refund 是显式动作，不会仅因某条 tool result 失败就自动证明 provider 已退款。[`cost_tracker.py`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/cost_tracker.py)

因此账本是内部控制，不是第三方账单真相。它至少还需要 provider job ID 和 reconciliation 才能回答“钱到底花没花”。

素材权利也一样：

- OpenMontage 引擎使用 AGPL-3.0，不等于最终 MP4 自动采用 AGPL；
- royalty-free 不等于 public domain；
- stock、音乐、字体、人物肖像、商标和生成输出各自受来源条款约束；
- `asset_manifest` 能记录 license 和 original URL，但通用 schema 不强制它们存在；
- provenance report 不等于权利清算或法律保证。

“本地优先”更不能写成“数据绝不离机”。composition 和 project files 默认在本地，但某些云工具会把本地视频、图片、prompt 或派生数据上传给 provider。工具的 `network_required`、side effects 和用户批准才构成真实的数据出境面。[Provider guide](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/docs/PROVIDERS.md)

当前 publish 工具也只做本地 export bundle：复制成片、写 metadata、chapter、thumbnail 和 `publish_log`，明确声明 `uploads: false`。平台账号、审核和真实发布仍在系统之外。[`export_bundle.py`](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/publishers/export_bundle.py)

## YAML、Markdown、JSON 和 Python 为什么各占一层

OpenMontage 的文件格式选择不是审美拼盘：

| 格式 | 适合承担什么 | 主要风险 |
|---|---|---|
| YAML | stage 图、工具集合、gate、预算和成功标准 | 文本冲突、弱语义、不同规则漂移 |
| Markdown | 领域方法、review protocol、风格知识 | 宿主可能漏读、截断或解释不同 |
| JSON Schema | artifact/checkpoint 的可机械形状 | 跨工件语义、事实和审美仍在外面 |
| Python | 工具副作用、持久化、验证与 runtime adapter | 本地依赖、并发、版本与 provider 差异 |
| TypeScript/React/Remotion | 程序化视觉 composition | 浏览器、字体和 Node 版本影响复现 |
| FFmpeg | 成熟的媒体 probe 与确定性处理入口 | 命令成功不等于观看质量 |

这种分层的收益是可检查、可替换和跨 harness 移植。

代价是双重真实：skill 写“应该怎样做”，代码写“是否允许推进”。固定提交中甚至存在 wall-time、revision rounds 和 stage 数量的文档差异；没有统一 instruction compiler 时，宿主只能自行解决冲突。

一条务实原则是：

> 会影响资金、权限、外部副作用、不可逆发布或 canonical state 的规则，不应只存在于 instruction。

## 给垂直 Agent 写 Artifact Contract

把 OpenMontage 的经验迁移到研究、设计、财务或内容系统时，可以先写下面八项：

```yaml
artifact:
  name: asset_manifest
  schema_version: "1.0"
  produced_by: assets
  consumed_by: edit
  required_fields: [id, scene_id, path, source_tool]
  semantic_checks:
    - referenced scene exists
    - file hash matches
    - license policy satisfied
  side_effect_boundary:
    - provider_job_id
    - reservation_id
  approval:
    required: true
    evidence: filmstrip + cost + provenance gaps
  replay:
    inputs_hash: required
    toolchain_version: required
  reconciliation:
    orphan_policy: quarantine
    retry_policy: query_provider_before_retry
```

真正重要的不是 YAML 长什么样，而是每个字段都回答一个所有权问题：

- 谁产生它；
- 谁消费它；
- 什么是 schema failure；
- 什么是 semantic failure；
- 哪个副作用已经发生；
- 谁能批准；
- 崩溃后什么可以重做；
- 什么必须先对账。

## 适合谁，不适合谁

OpenMontage 更接近 **由 coding agent 驾驶的可编程视频生产 harness**，而不是传统 NLE，也不是自带 durable worker runtime 的确定性 workflow engine。

它适合：

- 已把内容生产放进代码仓库的工程师型创作者；
- 需要复用品牌、预算、风格和批准规则的小型 studio；
- 希望保留脚本、分镜、素材、决策与 composition source 的团队；
- 愿意维护 Python、Node、FFmpeg、API key 和 provider 依赖的人。

它不适合：

- 只想在 Web UI 拖时间线的非技术用户；
- 需要企业 RBAC、跨机 HA、分布式 lease 和灾备保证的生产平台；
- 期待一条 prompt 自动解决版权、事实和发布责任的团队；
- 要求任意 host、模型与操作系统都得到字节级相同成片的流程。

## 结论：Instruction 负责可塑，代码负责不可妥协

OpenMontage 最有价值的设计，不是“终于可以不用写 orchestrator 代码”。

而是它把视频生产控制面拆成了三种不同强度：

1. **Instruction** 保存可塑的领域判断；
2. **Artifact** 保存可交接的阶段状态；
3. **Code validator** 保存不可妥协的推进条件。

这让生产知识可以被阅读、修改和移植，也让长任务可以从文件而不是对话记忆恢复。

它仍然留下了一条清晰边界：checkpoint 不能撤销已经发生的 provider 副作用，schema 不能证明素材权利，self-review 不能变成独立判断，退出码不能证明视频值得发布。

当一条规则触及钱、权限、版权、canonical state 或对外发布时，把它写进 Skill 只是开始。

还要让程序能够拒绝。

## 参考资料

- [OpenMontage fixed commit](https://github.com/calesthio/OpenMontage/commit/4eab34c5cfcccaa4f1970554928feccce73ee930)
- [PROJECT_CONTEXT.md](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/PROJECT_CONTEXT.md)
- [Architecture](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/docs/ARCHITECTURE.md)
- [Agent Guide](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/AGENT_GUIDE.md)
- [Animated explainer pipeline](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/pipeline_defs/animated-explainer.yaml)
- [Checkpoint implementation](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/lib/checkpoint.py)
- [Checkpoint protocol](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/skills/meta/checkpoint-protocol.md)
- [Reviewer skill](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/skills/meta/reviewer.md)
- [Base tool](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/base_tool.py)
- [Asset manifest schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/artifacts/asset_manifest.schema.json)
- [Render report schema](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/schemas/artifacts/render_report.schema.json)
- [Video compose](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/video/video_compose.py)
- [Cost tracker](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/cost_tracker.py)
- [Export bundle](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/tools/publishers/export_bundle.py)
- [Backlot README](https://github.com/calesthio/OpenMontage/blob/4eab34c5cfcccaa4f1970554928feccce73ee930/backlot/README.md)
- [OpenMontage Terms](https://www.openmontage.video/terms)
