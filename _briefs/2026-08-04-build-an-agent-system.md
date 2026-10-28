---
schema: blog-brief/v1
id: 2026-08-04-build-an-agent-system
title: 从 Agent Loop 到领域运行时：如何从零搭建一个可用的 Agent 系统
status: ready-to-publish
priority: high
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-04T01:33:16+08:00
source_refs:
  - brain://identity/thesis.md
  - brain://threads/context-boundary.md
  - brain://swipe/research/2026-07-skills-ecosystem.md
  - brain://swipe/research/frontier-ai-talent-workflows-report-2026.md
---

# 选题契约

## 唯一命题

上手做 Agent 系统，最稳的起点不是先堆多 Agent、MCP 和长期记忆，而是先确定它要持续修改的领域对象、可执行命令和验收信号，再用 Harness 管理模型循环，用 Skills 装入做事方法，用 MCP 连接外部能力，用 n8n 或 durable workflow 承接已经稳定的流程。模型可以替换，领域状态、约束和失败证据才是系统真正需要拥有的部分。

## 为什么值得由我写

作者不是站在框架外做产品盘点。他跨三年的多个项目都在处理同一个工程问题：怎样让人和 Agent 共用的上下文在工具切换后仍然存在。DayPage、brain、cct、provider abstraction、files-as-context 和 `hot.md` 是这条路线的不同实验。

本轮用户已明确要求把现有分析直接写成一篇 Agent 系统教程并沉淀到 blog，这构成对研究、起草和推进到 `ready-to-publish` 的授权，不构成最终发布签字。本文的一手增量限定为上述架构实验与作者原话；不使用尚未由作者复核的规模数字，也不暗示作者已经跑通生产级垂直 Agent。

## 目标读者与阅读场景

读者已经会调用模型 API、function calling，可能也试过 n8n、MCP 或某个 Agent SDK；现在正准备做第一个垂直 Agent，却不知道 Agent Loop、Harness、Skills、MCP、Plugin、Workflow、Memory 和领域业务代码该怎样分层。

读完后，他应该能为一个具体任务画出最小架构，决定哪些能力直接借用，哪些状态必须自己拥有，并实现一个可运行 MVP：单 Agent、少量领域命令、一次可验证交付、明确权限边界和一小组 outcome evals。

## 编辑选择

- 文章轨道：research
- 已选形态：工程搭建指南。沿着一个最小垂直 Agent 从 demo 到可运行系统的演进展开；每新增一层都回答一个真实 failure mode，不写产品百科。
- 核心张力：模型负责开放式判断，但长期状态、权限、提交与验收必须逐步变成确定性系统。
- 这次主动不讲：模型训练、复杂 multi-agent swarm、Agent 市场规模预测、所有框架的 API 逐项教程，以及跨境业务本身。

## 已批准素材包

### 事实与项目证据

- 作者公开原话：“围绕一个问题做工程：让上下文在工具切换之间不丢失。”已使用的手段包括 vault 持久层、files-as-context 和 provider abstraction。
- brain 的上下文入口采用 `hot.md → index.md → 具体卡片`，原始材料与编译层分开；这可以作为 progressive disclosure / context compiler 的真实实例。
- files-as-context 在材料增长后会遇到全量 inject、编译与 retrieval 如何切换的开放问题；文章必须保留“尚无统一阈值与答案”，不得加入未经作者确认的本地规模数字。
- 上述项目事实只用于解释作者为何形成这套架构判断，不能写成行业已经验证的最优解。

### 作者原话与在场片段

> 围绕一个问题做工程：让上下文在工具切换之间不丢失。

可以从一个真实反差进入：Agent SDK 越来越完整，作者自己的工程注意力反而从“再造一个 Loop”转向“让状态、知识和验收跨工具留下来”。不得虚构某次故障、客户案例或商业结果。

### 作者观察

- Agent Loop 只是最内层的 observe / decide / act；Harness 是权限、上下文、工具、会话、预算、checkpoint、trace 与 sandbox 组成的运行环境。
- Skills、MCP、Plugin 和 Workflow 不能混为一层：Skill 传递做法，MCP 暴露能力，Plugin 负责打包分发，Workflow 持久执行已知路径。
- 垂直产品更持久的部分通常是 domain object、command、invariant、versioned artifact、outcome eval 和失败样本，而不是某个模型或 prompt。
- 更有潜力的演进循环是：未知任务由 Agent 探索，成功 trace 沉淀为 Skill，稳定步骤编译为 workflow，再作为粗粒度 MCP tool 交还给 Agent。

### 待验证推论

- “确定性外壳包住概率性智能”可能是当前垂直 Agent 最实用的默认架构，但需要用真实产品与官方文档核验边界。
- 对小团队而言，Agent-native domain runtime 可能比通用 Harness、纯 Skill 包或薄 MCP wrapper 更有长期积累；这是本文要检验并明确标为“工程建议”的推论，不是作者已经验证的市场定律。
- 单 Agent + verifier 应作为默认起点；只有真实的并行、权限或上下文隔离需求出现后才拆 multi-agent。

## 参考方向

- 核验 Anthropic Claude Agent SDK 对 Agent Loop、sessions、permissions、hooks、checkpoint、Skills、Plugins、MCP 与 sandbox 的当前定义；同时使用 Anthropic 的 agent eval、long-running harness 和 containment 一手文章。
- 核验 OpenAI Agents SDK 当前的 Runner、guardrails、handoffs、tracing、sandbox agents、Skills 与 MCP；结合 OpenAI Harness Engineering 对 repository knowledge、mechanical invariants 和 agent legibility 的经验。
- 使用 MCP 最新官方 specification，明确协议只负责 context/tool exchange，不替应用决定编排、记忆和授权。
- 对比 n8n 的 instance-level MCP、MCP Server Trigger 与 AI Agent 节点，解释“外部 Agent 创建 workflow”和“workflow 作为宏工具”是两种方向。
- 以商业 ChatCut 的可编辑 timeline + Agent 入口为产品事实；以 OpenChatCut 的 immutable timeline、command layer、isolated draft、manual review、atomic undo 和 shared EditorCore commands 为可读实现；核验 OpenCut 的 Rust core、Editor API、headless、plugin-first、MCP 仍处在重写目标还是已交付。
- 用 LangGraph / Temporal 官方资料解释何时才需要 durable execution、interrupt、pause/resume、idempotency 和 human approval；可用 Letta 的 context hierarchy 补充 hot / warm / cold，但避免扩大成 memory 产品综述。
- 查询 Cursor 官方 harness / dynamic context 文章，验证“静态全量注入逐渐转向动态发现、lazy Skills 和 tool search”的变化。

## 证据与隐私边界

- 可以公开：本 brief 列出的作者原话、brain 与 DayPage 的架构事实和带边界的数字；公开仓库与官方文档重新核验后的产品事实。
- 必须匿名：本文不需要任何第三方私人故事。
- 禁止使用：brain 私有内容、`soul/raw/`、未批准的个人状态、虚构用户案例、未核验融资/市场数据，以及把目标路线写成已完成能力。
- 发布前仍需作者确认：最终标题与成稿是否准确表达作者原话；文章有没有把研究性架构建议误写成作者已有生产战绩。当前可继续研究、起草并推进到 `ready-to-publish`，这两项只保留为最终发布签字门。

## 不要写成

不要写成“十大 Agent 框架横评”、名词解释大全、架构图堆砌或一篇看完仍不知道第一周该写什么代码的正确废话。不要把所有系统都强行塞进七层对称框架；教程必须让读者看到最小实现、失败信号和何时增加下一层。不要用 Manus、Cursor 或大厂竞争制造焦虑。

## 验收标准

- [x] 读者为什么继续读、读完能做什么已经清楚
- [x] 作者一手增量决定了文章形态
- [x] 没有新增未经作者确认的经历、动机或人格判断
- [x] 关键事实有可访问的公开来源
- [x] 思考型文章已经由本人选择方向

## 执行回执

- article: content/zh/ai-agent/posts/build-an-agent-system.md
- public_url: pending — 未发布，等待作者终审与分支合并
- editorial_verdict: KEEP — 独立发展性审读确认读者契约、作者一手增量与正文推进均已成立；独立事实与隐私审读最终结论为 PASS
- checks: PASS — AI flavor 单篇检查与 changed 检查均为 0E/0W；front matter、标准标签、brief schema、brief 队列、GEO advisory、引用与参考资料对应、内链与封面路径、description 长度、发布时间和 git diff whitespace 检查均通过；封面原图完成视觉复核
- published_at: pending
- retro_notes: 仅使用任务卡已批准素材与平台侧公开研究，未访问 brain 仓库、brain:// 引用目标或其他上游私有文件。成稿以可编辑视频时间线为贯穿案例，把第一周实现顺序收束为单 Agent、版本化领域对象、窄命令、隔离草稿、Verifier 与 outcome eval，再按真实失败决定是否增加 Harness、Skills、MCP、Workflow、持久化运行时或多 Agent。事实审读后删除了缺少相邻来源的商业产品例子，收窄 n8n 能力表述，更新 MCP 规范版本，并把小团队优势明确限定为待验证的工程建议。封面采用“主时间线、独立草稿托盘、检视放大镜与可替换模块”的编辑台隐喻，文件为 static/images/covers/ai-agent/2026/build-an-agent-system.jpeg。仍待作者在发布前确认最终标题，以及全文是否准确表达作者原话并避免把研究性架构建议写成已有生产战绩；这些是最终发布签字门，不阻塞 ready-to-publish。
