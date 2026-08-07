---
title: '拒绝成为 Agent：TaxHacker 为什么把 LLM 压缩成一个函数'
date: 2026-08-07T17:55:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Document AI
  - Data Processing
  - Security
  - Development
description: >
  以 TaxHacker v0.8.5 为样本，追踪票据如何经过多模态抽取、provider fallback、动态 schema、表单校验、重复检查与人工保存，解释何时应把 LLM 限制成结构化函数。文章区分结构有效、事实正确与会计记录，并揭示 compatible 路径、前四页预览、缓存候选和金融数据的边界。
tldr:
  - TaxHacker 没有 planner、tool loop、长期 memory 或 delegation。应用持有流程，LLM 只把文档预览映射成一个结构化 candidate。
  - OpenAI、Google 与 Mistral 路径使用 structured output；OpenAI-compatible 路径只做 JSON.parse，没有等价的 schema 后验校验。
  - Provider fallback 是按配置顺序故障切换。第一个无 error 的结果立即获胜；格式正确但事实错误时，不会自动让第二个模型复核。
  - AI 输出先写入 File.cachedParseResult 并填入可编辑表单；Zod 校验、重复候选检查和显式 Save as Transaction 之后，才创建 canonical record。
  - Schema、temperature=0、cache 与人工 UI 都只能降低特定风险。原件对照、数据最小化、纠错、导出与保留策略仍由应用和用户承担。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 7
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/07-taxhacker/taxhacker-bounded-ai.svg
  alt: 'TaxHacker 将不可信票据经顺序 provider 抽取、schema 窄腰、原件核对、表单校验与显式保存变成 canonical transaction 的架构图'
---

下面是一段完全合法的模型输出：

```json
{
  "merchant": "ACME",
  "total": "129.90",
  "currencyCode": "EUR",
  "issuedAt": "2026-07-03",
  "items": []
}
```

字段齐全，没有多余属性，金额能转成分，日期也能解析。

但原票据写的是 **12.99 EUR**，日期是 **2026-07-08**。

Schema 没有失败。模型没有报错。provider fallback 不会发生。缓存还会让这份结果下次继续出现。

**结构正确可以让错误更容易进入系统，却不能让错误变成事实。**

TaxHacker 是这套 Agent 系统设计系列里故意放入的反例。前六篇不断讨论 loop、tool、memory、event、queue 与 Gateway，很容易形成一种错觉：任务越复杂，模型就越应该掌握更多控制流。

票据抽取说明了另一条成熟路径：如果最主要的不确定性可以被收缩为 `document → candidate fields`，系统应把模型压缩成一个函数，把状态、保存、纠错和责任继续留给应用。

本文确认研究对象为 [vas3k/TaxHacker](https://github.com/vas3k/TaxHacker)。源码冻结 **v0.8.5**，commit `8e7194bc0e511b22308dbfee78c5b8ad1ca94597`，发布于 2026-07-20；研究日 `main` 已前进到 `2c6bc02c00a6b7d338189ba769f63abf0ec95847`。所有实现判断以 release tag 为准。[TaxHacker v0.8.5](https://github.com/vas3k/TaxHacker/releases/tag/v0.8.5)

这不是报税、会计或财务建议。本文只研究一个公开软件怎样约束模型，以及这些约束在哪里失效。

## 它到底算不算 Agent

若只看界面中的 “Analyze with AI”、组件目录里的 `agents`，或者项目描述中的 AI accounting，很容易把 TaxHacker 也放进 Agent 工具箱。

这里必须先限制标题的含义。没有第一方证据表明作者原则性反对 Agent；研究日官网甚至把 “AI agents to automate your workflows” 列在 Upcoming Features。[TaxHacker homepage](https://taxhacker.app/)

因此“拒绝成为 Agent”是对 **v0.8.5 当前控制权分配** 的解释，不是 founder manifesto，也不是对未来 roadmap 的预测。

按可验证的运行机制，它更接近 **LLM-assisted document workflow**：

| Agent 构件 | v0.8.5 中实际存在什么 |
|---|---|
| Loop | 一次 LLM request；失败时换下一个 provider，没有 observation-action continuation |
| Context | prompt template、fields/categories/projects 描述、最多四页图像 preview |
| Tools | 无模型可选择的工具集合；汇率转换、拆 items 等由 UI/应用组件触发 |
| Memory | 无 Agent 长期记忆；只有设置、数据库记录与 `cachedParseResult` |
| Delegation | 无 subagent、角色分工或任务转交 |
| Eval | schema/JSON 解析、可编辑表单、Zod 与 duplicate candidate；没有独立事实 evaluator |
| Stop | 第一个无 error provider response、所有 providers 失败或 server action 返回 |

真正拥有控制流的是 Next.js 应用：

```text
用户上传
  → 应用生成 preview
  → 应用构造 prompt + schema
  → LLM 返回 candidate
  → 应用缓存 candidate
  → 用户查看和修改表单
  → 应用校验与查重
  → 用户显式保存
  → Postgres transaction
```

模型没有机会决定“下一步去查汇率”“再调用 OCR”“搜索商户”“自己保存交易”。

这不是能力不足，而是一种有价值的 ownership choice。

## 图解：Schema 窄腰与金融写入边界

![TaxHacker bounded AI 窄腰](/images/agent-system-series/07-taxhacker/taxhacker-bounded-ai.svg)

**阅读指南：** 左侧票据、发票和 PDF 是不可信文档，同时可能包含金融数据和 PII；v0.8.5 只把最多四页 preview 送入模型。中间 providers 按用户配置顺序尝试，第一个成功结果结束 fallback。Schema 把宽泛的视觉理解压成字段窄腰，但 OpenAI-compatible 路径只有 JSON parsing 缺口。右侧原件对照、可编辑表单、Zod 与 duplicate candidate 承担应用核验；只有显式 Save 才创建 Postgres transaction。底部强调 `cachedParseResult` 与 canonical record 是两个状态。

图中没有画 planner，也没有画模型回头修改业务数据库。

因为源码里没有这些对象。

## 一次抽取的真实数据路径

### 1. 上传文件不等于直接送原 PDF

`loadAttachmentsForAI` 先通过 preview pipeline 把文件转成图片，再取前 **4 页**，用 base64 data URL 送进多模态 request。超出四页的内容不会进入这次模型输入。[`attachments.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/attachments.ts)

这个限制减少了 token 与处理成本，也创建了一个明确 failure mode：

- 票据总额在第 1 页，税额细节在第 5 页；
- 模型只看到前四页；
- schema 仍要求填税额字段；
- 模型可能猜测、留空或从错误位置抽取；
- 结构化调用可能返回一份看似完整的 candidate。

因此输入裁剪必须在 review UI 中可见。只显示“分析完成”不够，还应显示“模型看过 1–4 / 7 页”。

### 2. Prompt 与 schema 由用户字段动态生成

`buildLLMPrompt` 把启用了 `llm_prompt` 的 fields、categories 和 projects 描述插入 prompt template。`fieldsToJsonSchema` 再把同一组 fields 变成 object properties，并要求：

- 顶层所有字段必填；
- `items` 必填；
- 每个 item 同样要求所有字段；
- `additionalProperties: false`。

[`prompt.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/prompt.ts) · [`schema.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/schema.ts)

这套动态 schema 很像一个 narrow waist：

```text
任意语言、任意排版、任意视觉噪声
          │
          ▼
  merchant / total / date / items / custom fields
          │
          ▼
统一可编辑表单
```

但 field type 来自数据库字符串，schema 没有统一表达金额范围、货币与商户的业务关系，也没有附带 source span 或 page/box provenance。

输出可以说 “total = 129.90”，却不能指回“第 2 页右下角这组像素支持它”。

### 3. Provider fallback 只处理 error

`requestLLM` 遍历用户配置的 providers：

```text
provider A
  ├─ error → provider B
  └─ no error → return immediately
```

所有 provider 的 `temperature` 都设为 0。OpenAI、Google 与 Mistral 使用 LangChain `withStructuredOutput(schema)`；OpenAI-compatible endpoint 则读取文本、移除 Markdown code fence，再直接 `JSON.parse`。[`llmProvider.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/providers/llmProvider.ts)

这里有三个容易被高估的机制：

1. **temperature=0 不等于事实确定。** 模型、视觉编码、provider 实现和输入本身仍可能产生错误。
2. **fallback 不等于多模型投票。** 第一个结构上成功的 response 立即获胜，后续 provider 不会看到它。
3. **OpenAI-compatible 不具备等价 schema enforcement。** raw JSON 能解析就会作为 output 返回，没有对 `required`、field type 或 `additionalProperties` 做同一层 post-parse validation。

因此 “支持本地 OpenAI-compatible model” 与 “所有 provider 都受 strict schema 约束” 不能同时无条件成立。

最小修复不是增加 Agent，而是在 provider adapter 后增加一个统一、provider-independent validator：

```text
raw provider output
  → parse
  → validate against generated schema
  → normalize
  → reject / surface field errors
```

这仍然只验证结构，不验证事实。

## Candidate cache 不是事实源

`analyzeTransaction` 得到 response 后，把 output 写入 `File.cachedParseResult`。重新打开 unsorted 文件时，前端将非空 cached values 合并进表单初始状态。[`analyze.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/analyze.ts) · [`analyze-form.tsx`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/components/unsorted/analyze-form.tsx)

这是一种有用的工作缓存：

- 页面刷新后不用立刻再调用模型；
- 用户可以继续编辑；
- 失败不会直接污染 transaction table；
- 同一份文件可以保留最近一次 candidate。

它不是一个按文件 hash、prompt version、schema version 和 model version 建立的可审计推理 cache。源码中的 `cachedParseResult` 只保存结果，没有一起保存：

- provider 与 model；
- prompt/schema digest；
- attachment page range；
-原始 response；
- confidence 或 source location；
-谁在何时改过哪些字段。

重新分析还会覆盖旧 candidate。缓存提升体验，也可能让已经过时的结果看起来像“系统记住的事实”。

更稳妥的状态机应明确区分：

```text
UNSORTED
  → CANDIDATE(model + provenance)
  → REVIEWED(user + diff)
  → CANONICAL(transaction)
  → CORRECTED(new revision, old revision retained)
```

TaxHacker 已经用 `cachedParseResult`、`isReviewed` 和 Transaction 分开了部分状态，但还没有公开证据表明它保存完整的字段级 revision/audit trail。

## 人工核验是一道 UI 门，不是事实预言机

模型输出不会直接创建 transaction。

前端把 candidate 填入包含 merchant、total、currency、type、date、category、project、items 与 custom fields 的可编辑表单；用户点击 **Save as Transaction** 后，server action 才执行 `transactionFormSchema.safeParse`、duplicate check 与 `createTransaction`。[`analyze-form.tsx`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/components/unsorted/analyze-form.tsx) · [`unsorted/actions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/app/%28app%29/unsorted/actions.ts)

这条边界比“LLM 直接写数据库”健康得多。

但按钮存在，不代表核验发生。用户可能：

- 没有并排打开原图；
- 只看总额，漏掉日期；
- 误把模型 category 当作建议之外的事实；
- 在批量处理中形成 automation bias；
- 为消除 duplicate warning 直接选择 keep both。

人工 review 要成为真正控制，至少需要：

- 原件与 candidate 同屏；
- 高风险字段突出显示；
- 未被模型看到的页数提示；
- 字段来源或定位证据；
- 变更 diff 与 reviewer identity；
- 保存前的 required acknowledgement；
- 抽样复核和错误率反馈。

其中前两项在现有交互中可以部分观察；后几项属于本文建议，不应冒充 v0.8.5 已实现能力。

## Zod 校验了什么

`transactionFormSchema` 会：

-限制 name、merchant、description 和 currencyCode 长度；
-把金额字符串解析并乘 100 存成整数分；
-检查日期能否被 `Date.parse`；
-解析 items JSON；
-接收动态 custom fields。

[`forms/transactions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/forms/transactions.ts)

它没有统一证明：

-金额与原件一致；
-currencyCode 真是该票据货币；
-日期属于交易日期，而不是打印日期；
-category 符合税务规则；
-负数、极端值或小数精度在业务上合理；
-items 之和等于 total；
-merchant、date、total 的组合在现实中唯一。

这是 “schema-valid → form-valid → factual-valid” 三个层次的差异。

不要用后一层的语言描述前一层的成功。

## Duplicate check 是候选提醒

保存前，TaxHacker 用 `userId + total + merchant + issuedAt + currencyCode` 查询一条已有 transaction。命中后 UI 允许 keep both、replace old 或 cancel；用户也可以 `forceSave` 绕过检查。[`transactions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/models/transactions.ts) · [`duplicate-modal.tsx`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/components/transactions/duplicate-modal.tsx)

这适合作为 accidental duplicate detector，不是会计 reconciliation：

- 同一商户同日同金额的两笔真实交易会被误报；
- 商户拼写差异会漏报；
- 汇率或金额抽取错误会漏报；
- `forceSave` 和 replace 是用户控制，不是数据库唯一约束；
- 删除旧 transaction 再保存新 transaction 不是跨文件与数据库的原子替换保证。

因此图中写的是 **duplicate candidate check**，不是 deduplication guarantee。

## Canonical record 何时诞生

只有 `saveFileAsTransactionAction` 通过 form validation 与 duplicate decision 后，应用才：

1. 创建 user-scoped Transaction；
2. 把原文件移到按 transaction date 组织的位置；
3. 将 File 标成 `isReviewed: true`；
4. 建立 transaction 与 file ID 关联；
5. 刷新 unsorted 与 transactions 页面。

[`unsorted/actions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/app/%28app%29/unsorted/actions.ts)

这里的 Postgres Transaction 是 TaxHacker 内部 canonical record，不等于税务机关、银行或总账的最终事实。

文件移动、数据库 create、File update 与关联 update 也跨越 filesystem 和 Postgres，没有公开的单一事务包住全部步骤。中途崩溃可能产生：

- transaction 已创建，文件尚未移动；
-文件已移动，File path 尚未更新；
-File 已标 reviewed，transaction-file association 尚未写完。

源码有错误返回，却没有在这条路径中展示 compensating rollback 或 reconciliation job。自托管 operator 应把数据库和 uploads volume 视作一个共同备份单元，并定期验证孤儿文件与断裂关联。

## 为什么开放工具会破坏这套边界

假设我们把 TaxHacker “升级”为一个通用财务 Agent：

```text
Goal: process this invoice
Tools:
  OCR
  web search
  exchange-rate lookup
  transaction.create
  file.move
  email.send
```

模型现在可以：

-因为 OCR 不确定而搜索同名商户，却把网页价格当票据事实；
-选择一个更“合理”的汇率覆盖历史交易日；
-在用户看表单前创建 transaction；
-发现 duplicate 后自行 replace old；
-为了完成任务删除或移动原始证据；
-把含 PII 的票据发送给额外 provider。

工具增加没有自动增加正确性，只是把 extraction uncertainty 传播进更多副作用。

若任务的控制流已经清楚，正确设计顺序应是：

```text
先收缩不确定性
  → 再验证 candidate
  → 最后由确定性应用提交副作用
```

只有当下一步无法预先枚举、必须根据 observation 重新规划，并且每个动作仍有权限、预算、验证与补偿边界时，Agent loop 才获得真实价值。

## Function、Workflow 与 Agent 的选择条件

| 条件 | Function | Workflow | Agent |
|---|---|---|---|
| 输入输出 contract | 清楚且稳定 | 清楚，多步可枚举 | 目标清楚，路径不可预先枚举 |
| 不确定性位置 | 一个局部转换 | 少数受限节点 | 多轮 observation 会改变计划 |
| 副作用 | 函数外提交 | 显式节点与 gate | 工具动作，需强 policy |
| 状态 | request/result | execution state | session、plan、memory、tool state |
| 失败恢复 | retry/reject | step retry/compensation | replan + action audit |
| 典型例子 | 票据字段抽取 | 上传→抽取→审核→导出 | 调查未知问题并选择工具 |

TaxHacker 的 AI 部分适合 Function；整个产品适合 Workflow。把它叫 Agent 不会增加解释力，反而会模糊谁拥有保存与纠错。

## 技术系统架构：一个窄 AI 单体

v0.8.5 是 TypeScript/Node.js 单体：

- Next.js 16.2.10 与 React 19.2.7 提供 UI、server actions 和 API；
- Prisma 7.8 + PostgreSQL 保存用户、files、transactions、settings 与 categories；
- LangChain provider adapters 连接 OpenAI、Google、Mistral 与 compatible endpoints；
- Zod 处理保存表单；
- filesystem volume 保存上传文件与 previews；
- Docker Compose 将 app、PostgreSQL 与 persistent volume 组合部署。

[package.json](https://github.com/vas3k/TaxHacker/blob/v0.8.5/package.json) · [Prisma schema](https://github.com/vas3k/TaxHacker/blob/v0.8.5/prisma/schema.prisma) · [README](https://github.com/vas3k/TaxHacker/blob/v0.8.5/README.md)

公开 manifest 能证明共享 TypeScript 类型、一个应用进程和 Postgres/file 双持久层；“选择这套栈是为了端到端类型共享与低运维单体”是合理推论，没有维护者声明可以把它写成唯一动机。

这套架构的主要恢复对象不是 Agent session，而是：

-数据库 migration 与 backup；
-uploads volume 与 preview regeneration；
-LLM/provider 配置；
-candidate cache 与 canonical transaction 的差异；
-跨 filesystem/DB 的断裂关联。

## 金融数据与隐私边界

TaxHacker README 明确把项目标为 early development，并提醒 use at your own risk；它也允许 OpenAI、Google、Mistral 或自托管 compatible model，称用户负责数据质量与隐私。[README](https://github.com/vas3k/TaxHacker/blob/v0.8.5/README.md)

“Self-hosted”只说明应用、Postgres 和 uploads 可以在自己的基础设施运行。

只要选择外部 provider，票据 preview 仍会作为 base64 image 发送给对方。若选择本地 compatible endpoint，数据面可以缩小，却会遇到前文的 schema validation gap。隐私和结构约束不是同一个开关。

Cloud 版 privacy policy 还明确说明上传文件可能包含敏感个人/财务信息，并写明文件与个人数据以未加密形式保存。该政策描述的是官方 cloud service，不应自动套到每个自托管部署。[Privacy Policy](https://taxhacker.app/docs/privacy_policy)

自托管也有一条重要边界：`SELF_HOSTED_MODE=true` 默认假设可信本地网络，并绕过内建登录。官方把公开暴露 workaround 标成有安全影响的 “hack”，建议使用带认证的 reverse proxy 或 cloud version。[Self-hosted public access](https://github.com/vas3k/TaxHacker/blob/v0.8.5/docs/self-hosted-public-access.md)

处理真实金融文档前，operator 至少要回答：

-原件与 preview 是否加密 at rest；
-provider 是否保留 input，在哪个地域处理；
-上传、candidate、transaction、export 和 backup 各保留多久；
-删除 transaction 是否同步删除所有 previews/backups；
-谁可以导出包含附件的 archive；
-LLM key、email credential 和 auth secret 如何轮换；
-错误记录怎样更正并保留 revision；
-数据库与 uploads 如何一致备份和恢复。

这些是数据治理问题，不是 prompt engineering。

## 产品边界：它帮助整理，不替人承担责任

TaxHacker 的用户任务很具体：

-上传 receipt、invoice 或 PDF；
-从文档提取字段与 items；
-组织 categories、projects、currencies 与 custom fields；
-筛选、搜索、导入与导出；
-把材料交给 accountant 或 tax advisor。

它的 canonical artifact 是“可编辑的 transaction database + 原始文件关联”，不是一份模型答案。

官方 Terms 也把产品称为 automated invoice analyzer and expense tracker，并明确不保证适合 accounting、tax filing 或 compliance；它不是按司法辖区执行税则并提交申报表的 tax engine。[Terms of Service](https://taxhacker.app/docs/terms)

最适合采用它的条件是：

-有明确字段 schema；
-文档量足以让预填节省时间；
-人仍能查看原件并纠错；
-容许把模型当 candidate generator；
-愿意维护 Postgres、uploads、backup 与 provider policy。

不适合把它扩成自主 Agent 的条件是：

-每次处理路径都相同；
-错误字段会直接影响财务记录；
-缺少 source provenance；
-外部写入难以撤销；
-合规责任不能委托给模型；
-没有持续 eval 数据证明更大自治提高了净正确率。

## 结论：Anti-Agent 也是一种 Agent 设计能力

TaxHacker 最值得学习的地方，不是它用了多少 AI。

而是它把 AI 放在一条狭窄、可替换、可失败的位置：

```text
多模态文档
  → candidate fields
```

应用继续拥有上传、状态、表单、校验、查重、保存、文件关联和导出。

这套边界还不完美：compatible provider 缺统一 schema validation，candidate 缺少 provenance，人工 review 缺少强制证据，filesystem 与数据库提交也不是一笔事务。但这些缺口恰好说明，增加 planner 和 tools 不会自动修复它们。

**成熟的 Agent 设计不是总让模型做更多，而是能识别哪一段不确定性值得交给模型，并拒绝把它扩散成控制权。**

## 参考资料

- [TaxHacker v0.8.5](https://github.com/vas3k/TaxHacker/releases/tag/v0.8.5)
- [TaxHacker README at v0.8.5](https://github.com/vas3k/TaxHacker/blob/v0.8.5/README.md)
- [`ai/analyze.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/analyze.ts)
- [`ai/attachments.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/attachments.ts)
- [`ai/prompt.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/prompt.ts)
- [`ai/schema.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/schema.ts)
- [`ai/providers/llmProvider.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/ai/providers/llmProvider.ts)
- [`components/unsorted/analyze-form.tsx`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/components/unsorted/analyze-form.tsx)
- [`app/(app)/unsorted/actions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/app/%28app%29/unsorted/actions.ts)
- [`forms/transactions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/forms/transactions.ts)
- [`models/transactions.ts`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/models/transactions.ts)
- [`prisma/schema.prisma`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/prisma/schema.prisma)
- [`package.json`](https://github.com/vas3k/TaxHacker/blob/v0.8.5/package.json)
- [TaxHacker homepage and roadmap](https://taxhacker.app/)
- [AI Use Disclosure](https://taxhacker.app/docs/ai)
- [Terms of Service](https://taxhacker.app/docs/terms)
- [Privacy Policy](https://taxhacker.app/docs/privacy_policy)
- [Self-hosted public access](https://github.com/vas3k/TaxHacker/blob/v0.8.5/docs/self-hosted-public-access.md)
