---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-taxhacker
title: 拒绝成为 Agent：TaxHacker 为什么把 LLM 压缩成一个结构化函数
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:47:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

TaxHacker 是系列中的反 Agent 个案：应用控制流程，LLM 只承担多模态结构化抽取，并被 schema、provider fallback、温度、缓存和人工财务核验包围。文章要回答：什么时候成熟的 Agent 设计恰恰意味着不让模型拥有控制流。

## 为什么值得由我写

前面的 Harness 文章容易让读者默认“复杂任务就该加 Agent”。TaxHacker 提供反证：如果不确定性可以收缩成一个输入输出明确的函数，系统应把模型限制在最窄腰部。这个判断能校准整套系列的品类边界。

## 目标读者与阅读场景

读者正在为文档抽取、票据、审核或垂直 SaaS 选择 function、workflow 还是 Agent。读完后能识别可结构化的不确定性，设计“模型候选 → schema → 事实核验 → canonical record”链，并避免格式正确但事实错误的静默污染。

## 编辑选择

- 文章轨道：`research`
- 已选形态：从“它到底算不算 Agent”进入的边界个案
- 核心张力：schema 能约束形状，却不能证明金融事实正确
- 这次主动不讲：报税建议、法律/财务指导、通用 OCR 横评
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `7` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 将用户写的 `TaxHackerhe` 暂按 [vas3k/TaxHacker](https://github.com/vas3k/TaxHacker) 处理；文章开工前再次核对项目身份。
- 允许公开研究其 schema、provider adapter、fallback、cache 与应用栈。

### 作者原话与在场片段

- 不声称作者使用它处理真实税务数据。

### 作者观察

- 模型输出通过 JSON schema，只能证明它长得像业务数据；事实是否属于这张票据仍需要来源对照。

### 待验证推论

- TaxHacker 的审美是“bounded AI / anti-agent”；需要确认当前源码是否仍符合该描述。

## 参考方向

- 从 [官方仓库](https://github.com/vas3k/TaxHacker)、[`ai/schema.ts`](https://github.com/vas3k/TaxHacker/blob/main/ai/schema.ts)、[`ai/providers/llmProvider.ts`](https://github.com/vas3k/TaxHacker/blob/main/ai/providers/llmProvider.ts) 和当前 manifests 起步。
- 固定 commit，核验顺序 fallback 是否只是故障切换而非多模型投票。
- 分析 Next.js/TypeScript/Prisma/Postgres 是否形成单体产品栈；选型理由若无作者说明，只能作为部署和类型共享推论。
- 金融高风险语境中必须强调来源、人工核验、数据保留和错误修正。

## 图示任务

回答“什么时候不该让模型成为 Agent”。使用漏斗与 narrow waist：票据/发票进入多 provider 抽取，穿过 strict schema，再经过事实/人工核验进入 canonical expense record；标出不可信文档和金融写入边界。输出 `07-taxhacker/taxhacker-bounded-ai` 三种格式。

## 证据与隐私边界

- 可以公开：公开源码、架构与工具无关的边界判断。
- 必须匿名：不使用任何真实票据或纳税人数据。
- 禁止使用：财务凭证、个人身份信息、把文章写成税务建议。
- 发布前仍需作者确认：项目身份、anti-agent 判断和所有财务风险表述。

## 不要写成

不要把它包装成拥有 planner/loop 的通用 Agent。不要把 schema-valid、provider fallback 或 cache 分别误写成事实正确、多模型共识或会计事实源。

## 验收标准

- [ ] 项目身份与 commit 已固定
- [ ] function/workflow/Agent 的选择条件具体可用
- [ ] schema validation 与 factual verification 清楚分离
- [ ] 高风险数据、人工责任和纠错路径明确
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-taxhacker.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 三路独立研究固定 vas3k/TaxHacker v0.8.5，核验单次多模态提取、动态 schema、provider 顺序 fallback、candidate cache、可编辑表单、Zod/duplicate gate、Postgres/files 双状态与产品责任边界
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: “拒绝成为 Agent”只作为 v0.8.5 控制权快照的解释；官网把 agents 列为 upcoming，不能把当前非 Agent 写成 founder 的永久设计宣言

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：`vas3k/TaxHacker` `v0.8.5`，commit `8e7194bc0e511b22308dbfee78c5b8ad1ca94597`，发布于 2026-07-20；研究日 main 为 `2c6bc02c00a6b7d338189ba769f63abf0ec95847`。
- 品类校准：当前实现是 bounded AI accounting/document workflow，不是通用 Agent，也不是法定 tax calculation/e-file engine。没有第一方证据表明作者原则性拒绝 Agent；官网反而把 workflow agents 列为未来能力。
- 三路独立研究：
  - Agent 架构：应用持有 prompt/context、顺序、状态与 commit；LLM 只执行一次 `document → structured candidate`。没有 planner、tool loop、memory、delegation 或统一 online evaluator。
  - 系统架构：preview 只取前四页；托管 providers 用 `withStructuredOutput`，compatible 路径只做 `JSON.parse`。candidate 进入 `File.cachedParseResult`，用户显式保存后才创建 Transaction；Postgres 与 filesystem 双写没有统一事务。
  - 产品架构：用户 job 是减少录入、组织与导出，不是税务建议或申报。Cloud/self-host/local model 增加部署选择，也把模型质量、数据处理、备份和访问控制责任交给用户/operator。
- 保留的一手来源：
  - [v0.8.5](https://github.com/vas3k/TaxHacker/releases/tag/v0.8.5)、[README](https://github.com/vas3k/TaxHacker/blob/v0.8.5/README.md) 与 [package.json](https://github.com/vas3k/TaxHacker/blob/v0.8.5/package.json) → 版本、产品范围、MIT、Next/React/Prisma/LangChain/Node；不能证明 production SLA、准确率或框架选型的唯一动机。
  - [`attachments.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/attachments.ts)、[`prompt.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/prompt.ts) 与 [`schema.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/schema.ts) → 前四页、动态 prompt/schema、required 与 no-extra shape；不能证明字段事实、page provenance 或完整长文档覆盖。
  - [`llmProvider.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/providers/llmProvider.ts) → temperature 0、provider 顺序 failover、structured output 与 compatible JSON.parse gap；不能证明多模型互证或所有 provider 同强度 schema enforcement。
  - [`analyze.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/analyze.ts)、[`analyze-form.tsx`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/components/unsorted/analyze-form.tsx) 与 [`unsorted/actions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/app/%28app%29/unsorted/actions.ts) → candidate cache、可编辑表单、显式 save、file move/link/reviewed；不能证明用户逐字段核验或跨 DB/filesystem 原子性。
  - [`forms/transactions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/forms/transactions.ts)、[`models/transactions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/models/transactions.ts) 与 [Prisma schema](https://github.com/vas3k/TaxHacker/blob/v0.8.5/prisma/schema.prisma) → 金额转 cents、基础格式校验、窄 duplicate heuristic、canonical record；不能证明算术/税务语义、immutable audit 或 field-level lineage。
  - [Homepage](https://taxhacker.app/)、[AI Disclosure](https://taxhacker.app/docs/ai)、[Terms](https://taxhacker.app/docs/terms) 与 [Privacy](https://taxhacker.app/docs/privacy_policy) → upcoming agents、概率错误、用户核验责任、非专业意见与 Cloud 数据边界；政策页与 v0.8.5 UI 对 human correction 的描述存在代际冲突。
  - [Self-hosted public access](https://github.com/vas3k/TaxHacker/blob/v0.8.5/docs/self-hosted-public-access.md) → self-host mode 默认可信本地网络/外部认证；不能证明任意公开部署安全。
- 失败模式验证：总额 `1309.00` 被识别成 `13090` 时，JSON shape、Zod number parsing 与 duplicate check 都可能通过；没有 item/tax arithmetic、outlier 或 source-span validator。唯一现有 semantic gate 是用户对照原件后显式保存，但 UI 存在不等于核验一定发生。
- 图示问题：什么时候不该让模型成为 Agent。
- 图示交付：
  - `assets/diagrams/agent-system-series/07-taxhacker/taxhacker-bounded-ai.excalidraw`
  - `static/images/agent-system-series/07-taxhacker/taxhacker-bounded-ai.svg`
  - `static/images/agent-system-series/07-taxhacker/taxhacker-bounded-ai.png`
- 最强边界：schema-valid 只证明 shape；provider fallback 只证明可用性；`cachedParseResult` 只是 candidate；只有应用校验和显式 save 才生成 TaxHacker 内部 canonical Transaction，它仍不是税务机关或会计总账的最终事实。
- 证据缺口：字段级页码/box/provenance、confidence、model/prompt/schema version、reviewer diff、不可变 audit、tax rules、汇率来源持久化、跨 DB/filesystem transaction、备份完整性与抽取准确率没有统一公共契约。
- 未决作者判断：“Anti-Agent”“schema narrow waist”是本文对当前架构的解释；标题、未来 Agent roadmap、财务风险措辞与发布仍需作者确认。
