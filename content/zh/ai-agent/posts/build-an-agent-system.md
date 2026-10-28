---
title: '从 Agent Loop 到领域运行时：如何从零搭建一个可用的 Agent 系统'
date: 2026-08-04T01:46:01+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Harness Engineering
  - Context Engineering
  - MCP
  - Automation
  - Testing
description: >
  面向已经会调用模型 API、正准备搭建第一个垂直 Agent 的开发者：从可编辑视频时间线出发，实现单 Agent、版本化领域对象、窄命令、隔离草稿、Verifier 与 outcome eval，再按真实失败决定何时引入 Harness、Skills、MCP、Workflow 和多 Agent 等扩展。
tldr:
  - 第一个可用版本只需要单 Agent、一个版本化领域对象、少量窄命令、隔离草稿、一次明确提交和一组结果评测。
  - Harness 承接模型循环、上下文、权限、预算、checkpoint 与 trace；垂直产品仍要自己拥有领域状态、约束、提交语义和验收信号。
  - Skill 传递做事方法，MCP 暴露外部能力，Plugin 打包分发扩展，Workflow 持久执行已知路径。它们在不同失败出现后加入。
  - 成功轨迹可以先沉淀为 Skill，再把稳定步骤编译成 workflow，最后作为粗粒度 MCP tool 交回 Agent。
cover:
  image: /images/covers/ai-agent/2026/build-an-agent-system.jpeg
  alt: '俯拍胶片剪辑光台，主时间线旁有独立草稿托盘、检视放大镜和可替换黑色模块'
  caption: '稳定的领域对象与草稿、验证边界，承接可替换的模型循环。'
faq:
  - q: "Agent Loop 和 Agent Harness 有什么区别？"
    a: "Agent Loop 是模型观察结果、决定下一步并调用工具的内循环。Harness 是承载这个循环的运行环境，负责上下文装配、工具暴露、权限、预算、会话、checkpoint、trace、审批与 sandbox 等系统职责。"
  - q: "Agent Skill、MCP、Plugin 和 Workflow 应该怎样分工？"
    a: "Skill 保存可复用的做事方法；MCP 标准化外部工具、资源和提示的发现与调用；Plugin 把 Skills、hooks、agents 或 MCP server 等扩展打包分发；Workflow 把已经稳定的路径变成可恢复、可观察的确定性执行。"
  - q: "第一个垂直 Agent 需要多 Agent 吗？"
    a: "通常不需要。先用单 Agent 加结果校验器完成一次可验证交付；只有出现真实的并行需求、权限隔离、上下文隔离或独立责任边界后，再拆出多个 Agent。"
  - q: "什么时候应该把 Agent 轨迹固化为 n8n 或 durable workflow？"
    a: "当步骤顺序已经稳定、失败恢复有固定规则、需要长时间等待或人工审批，且重复执行的价值高于开放探索时，就适合把这段轨迹固化。仍然未知的判断继续留给 Agent。"
---

Agent SDK 越来越完整，我自己的工程注意力却一路往循环外面移。

过去我会先看模型怎样规划、会调用多少工具。现在我更常追问：切换工具之后，状态留在哪里；下一次运行从哪里继续；错误怎样留下证据；最终是谁把结果判成合格。DayPage、brain、cct、provider abstraction 和 files-as-context 是我围绕同一个问题做的几次实验：

> 围绕一个问题做工程：让上下文在工具切换之间不丢失。

在 brain 里，这个问题落成了一个很小的入口：

```text
hot.md → index.md → 具体卡片
```

`hot.md` 保存当前入口，`index.md` 提供地图，原始材料与编译层分开。它让我看到：上下文必须先有可寻址的外部状态，模型才有机会按需装入。它也留下了一个我还没有答案的问题——材料增长到什么程度，files-as-context 应该从全量 inject 切到编译或 retrieval？我没有一个可以跨项目复用的阈值。

这些实验没有证明我已经跑通一个生产级垂直 Agent。它们改变了我的起手式：先确定系统要持续修改的领域对象、允许执行的命令和可观察的验收信号，再选择 Agent SDK、MCP 或工作流工具。本文给出的是一套经过公开实现碰撞的工程建议，仍要由真实任务与失败样本校准。

如果你已经会调用模型 API 和 function calling，第一周请先交付下面这个闭环：

```text
用户目标
  ↓
单 Agent 选择领域命令
  ↓
命令只修改隔离草稿
  ↓
确定性约束 + outcome eval
  ↓
人工确认或受控提交
  ↓
版本化领域对象 + 失败证据
```

模型可以替换。这个闭环里真正会积累的，是领域状态、约束、命令语义、评测和失败样本。

## 先选一件会留下状态的工作

“做一个研究 Agent”或“做一个剪辑 Agent”仍然太宽。先找到一次可以验收的交付，以及交付完成后必须留下的对象。

本文用一个视频粗剪 Agent 贯穿示例。用户给它一组素材和一句要求：“删掉明显停顿，生成 60 秒以内的初剪，保留可继续编辑的时间线。”它的交付物不是一句“已完成”，而是：

- 一个带版本号的 timeline；
- 一组可回放的编辑 operations；
- 一份预览文件；
- duration、媒体引用、字幕覆盖等确定性检查结果；
- 一次人工接受、拒绝或继续修改的决定。

这个选择有公开实现作为参照：OpenChatCut 公开了 timeline state、command layer、proposal、manual review 和 atomic undo 的实现边界。[可编辑、可审查的时间线已经是实际产品选择](https://github.com/0xsline/OpenChatCut)，但它并不自动适用于其他领域。

换成客服、法务或数据分析，名词会变，问题不变：

| 你要先写下的东西 | 视频粗剪示例 | 它防住的失败 |
|---|---|---|
| domain object | `TimelineProject` | Agent 每轮都重新解释“当前状态” |
| versioned artifact | timeline v17 + preview | 结果被覆盖，无法比较与回滚 |
| command | `trim_clip`、`move_clip`、`add_caption` | 模型直接操作底层存储，副作用失控 |
| invariant | 媒体引用存在、时间范围合法 | 工具调用成功，项目已经损坏 |
| outcome eval | 时长、指令覆盖、可编辑性 | trace 很漂亮，交付仍不合格 |
| commit rule | 人工批准后原子提交 | 草稿悄悄变成正式结果 |

领域对象是业务真相的载体。Agent 只获得一组窄命令，用命令表达意图；领域层负责检查约束、生成新版本和记录失败。

## 先写领域运行时，再接模型

可以先用普通代码冻结这条边界：

```ts
type EditCommand =
  | { type: "trim_clip"; clipId: string; fromMs: number; toMs: number }
  | { type: "move_clip"; clipId: string; trackId: string; atMs: number }
  | { type: "add_caption"; fromMs: number; toMs: number; text: string };

interface DomainRuntime {
  inspect(projectId: string): Promise<ProjectSnapshot>;
  openDraft(projectId: string, baseVersion: number): Promise<Draft>;
  apply(draftId: string, commands: EditCommand[]): Promise<ApplyReceipt>;
  verify(draftId: string): Promise<VerificationReport>;
  renderPreview(draftId: string): Promise<Artifact>;
  commit(draftId: string, approval: ApprovalToken): Promise<ProjectVersion>;
}
```

这里有三个刻意的限制。

第一，模型看不到 `UPDATE timeline_items ...` 之类的底层写入口。它只能提出领域命令。命令越接近用户语言，trace 越容易审查，评测也越容易定位错误。

第二，`apply` 写入 draft，`commit` 需要独立授权。模型可以大胆探索一个可丢弃空间，正式状态继续由确定性边界保护。OpenAI 在 Agents SDK 的架构说明中也把可信应用运行时与 sandbox compute 分开：应用拥有工具、审批、密钥、guardrails、tracing 和业务系统访问，sandbox 承接受限执行。[这种分离](https://developers.openai.com/cookbook/examples/agents_sdk/migrate-from-claude-agent-sdk/readme)很适合拿来检查自己的责任边界。

第三，`verify` 返回结构化证据，而非一个模糊总分：

```json
{
  "invariants": {
    "all_media_resolved": true,
    "timeline_is_valid": true,
    "preview_rendered": true
  },
  "outcomes": {
    "duration_ms": 57420,
    "requested_max_ms": 60000,
    "caption_coverage": 0.96
  },
  "open_judgments": [
    "节奏是否符合用户偏好仍需人工确认"
  ]
}
```

确定性检查负责能被程序判定的事实；模型或人只处理仍需判断的部分。Anthropic 的 Agent eval 指南把评测拆成任务、环境、轨迹、grader 和最终环境状态，也提醒团队不要只相信 Agent 对“完成”的自述。[结果状态与过程证据要一起保留](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)。

再给它一层最小 runner 和存储即可：

```ts
interface AgentRunner {
  run(input: {
    goal: string;
    objectRef: { id: string; version: number };
    allowedTools: string[];
    budget: { maxTurns: number; timeoutMs: number };
  }): Promise<RunResult>;
}

interface RunStore {
  append(event: RunEvent): Promise<void>;
  saveArtifact(artifact: Artifact): Promise<ArtifactRef>;
  saveFailure(failure: FailureRecord): Promise<void>;
}
```

`AgentRunner` 负责跑循环，`DomainRuntime` 负责业务状态，`RunStore` 留下事件、产物和失败。数据库可以先用 SQLite，对象和 artifact 也可以先落本地文件。第一版只要重启进程后仍能找到 base version、draft、verification report 和失败证据。

## 第一周可以这样写

### 第 1 天：冻结交付

先写领域无关的四行：谁提交目标，系统持续修改什么对象，什么结果可以被外部观察，哪一步产生正式副作用。再给出一个正例和两个失败例。若完成条件仍只能写成“用户满意”或“Agent 判断完成”，先别接模型。

视频示例的第一版只接受一个任务：

```text
把指定素材整理成不超过 60 秒的可编辑粗剪，并生成预览。
```

主动省略选题、脚本生成、素材采购、配乐推荐和发布。

### 第 2 天：写命令与约束

领域无关的产物是一份 command schema、一组 invariant 和一次 draft/commit 状态转换。命令使用业务类型，模型不能接触数据库写接口。

视频 Agent 先实现 `inspect_project`、`open_draft`、`apply_edits`、`verify_draft`、`render_preview`。至少写三条 invariant：

- 引用的媒体与轨道必须存在；
- clip 的入点、出点和位置必须合法；
- commit 的 base version 必须仍是当前版本。

### 第 3 天：接一个模型循环

领域无关的产物是一个受预算约束的 runner 和一份事件日志。让 Agent 只能看到第 2 天的命令，设置最大轮数、总超时和 token 预算。每轮记录目标、对象版本、tool name、参数、回执与停止原因。

最内层 Loop 只有：

```text
observe → decide → act → observe
```

你可以自己写，也可以借 SDK。OpenAI 当前文档把选择说得很清楚：想拥有循环，用 Responses API；希望 SDK 管理重复工具调用、handoff 与暂停恢复，用 Agents SDK。[SDK 提供 Harness 起点](https://developers.openai.com/api/docs/guides/agents)，领域运行时继续定义业务完成。

如果你还没有把验证器、状态和停机条件写成最小 Loop，可以先读[《独立开发者的 Loop Engineering》](/zh/ai-agent/posts/prompt-loop-engineering-practice/)；本文从它的外层继续搭领域边界。

### 第 4 天：建立 outcome eval

领域无关的产物是一组可以反复运行的任务 fixture。先写 10 条，覆盖正常输入、边界输入和明确失败；每条保存目标、base object、预期 invariant、可接受范围和 grader。runner 每次从同一 base version 创建新 draft，结束后只比较 verification report 和产物。

```json
{
  "case_id": "keep-opening-line",
  "goal": "生成 60 秒以内粗剪，保留开场句",
  "base_fixture": "timeline/interview-01.json",
  "assertions": {
    "max_duration_ms": 60000,
    "must_keep_clip_ids": ["opening-01"],
    "timeline_valid": true
  }
}
```

最小指标可以是：

- `valid_timeline_rate`：结果能通过领域约束的比例；
- `instruction_completion_rate`：明确要求被满足的比例；
- `accepted_without_rework_rate`：人工无需返工直接接受的比例；
- `unauthorized_action_count`：越权尝试次数；
- `cost_per_accepted_delivery`：每个被接受结果的总成本。

最后两个指标会阻止你用更多调用掩盖低成功率。trace 指标仍然有用，但 tool call 数量和 token 数不能替代结果质量。

### 第 5 天：加入提交门与失败样本

领域无关的产物是一条从 draft 到 committed 的受控转换，以及一个可检索的 failure record。预览通过后生成 approval request，至少绑定 `draft_id`、`base_version` 和操作摘要。人工批准后，领域运行时再次检查版本与权限，再原子提交。

把失败存成一等对象：

```json
{
  "task_id": "task_042",
  "base_version": 17,
  "failure_type": "instruction_missed",
  "evidence": ["用户要求保留开场句，草稿将其删除"],
  "trace_ref": "trace_9f2",
  "resolution": "pending"
}
```

失败样本会变成下一轮 eval、Skill 或领域约束的输入。它比一段越来越长的 system prompt 更能积累。

### 第 6 天：只修最常见的失败

领域无关的产物是一次由证据触发的架构变化。重复顺序错误，写 Skill；工具接口含糊，重做 schema 与返回值；上下文漏失，增加索引或 artifact 引用；固定步骤频繁重跑，再提取 workflow。

这些名词可以按失败分开：

| 当前失败 | 该加什么 | 新增责任 | 不负责什么 |
|---|---|---|---|
| Agent 反复用错操作顺序 | [Skill](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | 按需装入方法、检查表和示例 | 提供外部访问 |
| 多个客户端要共享领域命令 | [MCP](https://modelcontextprotocol.io/specification/2026-07-28) | 标准化核心 tools、resources、prompts 的交换 | 决定业务编排与最终授权 |
| 扩展要被安装、升级和分发 | [Plugin](https://code.claude.com/docs/en/plugins) | 打包 Skills、agents、hooks、MCP server | 证明内部组件安全有效 |
| 成功路径已经重复稳定 | Workflow | 固化已知步骤与执行入口 | 处理未知判断 |
| 任务会跨小时等待人审 | [durable execution](https://docs.langchain.com/oss/python/langgraph/interrupts) | checkpoint、pause/resume、幂等恢复 | 定义业务成功 |
| 出现并行或强隔离需求 | multi-agent | 隔离上下文、权限或责任 | 自动提高质量 |

n8n 当前以 beta 形式提供相关能力，并把 MCP 的两个方向分得很清楚：instance-level MCP 让外部 Agent 搜索、创建、测试和运行 workflow；MCP Server Trigger 让单个 workflow 成为 MCP server，只暴露设计者接入的工具。[前者让 Agent 进入 workflow 系统，后者把 workflow 交给 Agent 调用](https://docs.n8n.io/build/ways-of-building-workflows/connect-to-n8n-mcp-server/)。这只能证明接口方向，重试、等待、恢复和审批仍要由具体 workflow 或 durable runtime 实现。

MCP 2026-07-28 还定义了可选的 Tasks、Skills over MCP 与 MCP Apps extensions，只有 client 和 server 都显式支持时才启用。Skills over MCP 负责发现和传输结构化工作说明，没有抹平两种责任：Skill 保存程序性方法，MCP 处理跨边界的发现与交换。[这些扩展位于核心协议之外并通过初始化协商](https://modelcontextprotocol.io/specification/2026-07-28)。

若最常见失败落在 Skill 自身的安全模型、后台执行或验收方式，可以继续用[《Agent Skill 与 SKILL.md 设计》](/zh/ai-agent/posts/designing-valuable-agent-skills/)回检。

不要在这一天顺手加长期记忆、十个 MCP server 和五个 Agent。

### 第 7 天：换模型、重放、做去留决定

领域无关的产物是一份同 fixture、同命令、同 grader 的对比报告。先选 3 条核心 eval 用第二个模型重放。若领域命令、约束和 grader 基本不动，说明系统边界开始成立；若每换模型都要重写业务状态与提交逻辑，说明产品仍然把领域责任藏在 prompt 里。

最后只做三个决定：

1. 哪个失败值得下一周解决；
2. 哪条成功轨迹可以沉淀为 Skill；
3. 哪段路径已经稳定到可以编译成 workflow。

## Harness 接住 Loop，Verifier 接住结果

走完前五天，你已经拥有最小 Harness：它装入目标与当前对象，限制工具与预算，记录 trace，把写操作关进 draft，并在提交前等待可信批准。成熟 SDK 可以接管 sessions、tool loop、tracing、guardrails 和暂停恢复；你的领域运行时继续拥有对象、命令、版本、约束与成功定义。

安全边界也要落在可执行系统里。Anthropic 对 claude.ai、Claude Code 与 Cowork 的 containment 复盘把风险半径放在 sandbox、VM、文件边界和 egress control 上处理。[环境约束承接概率性防御漏掉的情况](https://www.anthropic.com/engineering/how-we-contain-claude)。具体产品的威胁模型不同，第一个 MVP 仍可采用两条窄原则：凭据不进入不受信任的执行环境，写权限按对象和动作收窄。

任务开始无人值守后，审批分级、回滚和持续评测会成为下一层问题；[《如何建立对无人值守 AI Agent 的真实信任》](/zh/ai-agent/posts/trusting-unattended-ai-agent/)专门展开这一层。

对第一个垂直 Agent，我会先切成两种责任：

```text
Agent：探索路径、选择命令、处理开放判断
Verifier：检查领域约束、结果状态、权限与停止条件
```

Anthropic 的公开工程建议区分固定代码路径的 workflow 与模型动态决定过程的 agent，并建议从最简单的可行方案开始，只在结果证明需要时增加复杂度。[复杂度要由 outcome 改善来支付](https://www.anthropic.com/engineering/building-effective-agents)。

只有三类证据出现后，我才会拆 multi-agent：两个独立调查形成真实并行瓶颈；某项任务需要不同凭据或 sandbox；一组材料持续污染另一项判断，需要结构化交接。“规划师、执行者、审稿人”三个名字本身无法构成拆分理由。

## 让成功轨迹逐步变硬

一个可积累的演进循环大致如下：

```text
未知任务
  ↓ Agent 探索
成功 trace
  ↓ 去掉偶然步骤与噪声
Skill
  ↓ outcome eval 反复通过
Workflow
  ↓ 收窄成稳定领域动作
粗粒度 MCP tool
  ↓
交回 Agent 处理新的未知任务
```

越靠上，系统保留更多开放判断；越靠下，路径更确定、更便宜、更容易恢复。失败会反向流动：workflow 遇到无法分类的输入，回到 Agent；Skill 在新任务里持续误导，就降级或删除；领域命令暴露了错误抽象，就修改 schema 和 invariant。

我的工程建议是：小团队优先把积累放在领域对象、可执行命令、不可破坏的约束、版本化交付、结果评测和失败样本上，通用 Loop、基础 tracing 和 MCP client 则尽量借用。这仍是一条待验证路线，不能由此推出长期市场优势。

一个可执行的下一步验证是：更换 provider 与上下文装配方式，同时观察领域对象、命令回执和 grader 是否还能原样重放。files-as-context 何时该切到编译或 retrieval，仍然没有统一答案；如果一次替换迫使系统重写状态、约束和验收，说明这些责任还藏在模型上下文里。

那会是一条有用的失败证据。下一次模型替换时，领域状态、命令与 eval 若还能工作，系统才真正拥有了自己的运行时。

## 参考资料

1. [Agents SDK — OpenAI Developer Docs](https://developers.openai.com/api/docs/guides/agents)
2. [Migrate from the Claude Agent SDK to the OpenAI Agents SDK — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/migrate-from-claude-agent-sdk/readme)
3. [Building effective agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
4. [Demystifying evals for AI agents — Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
5. [Agent Skills — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
6. [Create plugins — Claude Code Docs](https://code.claude.com/docs/en/plugins)
7. [Model Context Protocol Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
8. [Build with MCP — n8n Docs](https://docs.n8n.io/build/ways-of-building-workflows/connect-to-n8n-mcp-server/)
9. [Interrupts — LangGraph Docs](https://docs.langchain.com/oss/python/langgraph/interrupts)
10. [How we contain Claude across products — Anthropic](https://www.anthropic.com/engineering/how-we-contain-claude)
11. [OpenChatCut — GitHub](https://github.com/0xsline/OpenChatCut)
