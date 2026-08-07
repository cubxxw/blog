---
schema: blog-brief/v1
id: 2026-08-07-agent-system-design-manus
title: 给 Agent 一台电脑：Manus 如何把任务、沙箱与交付物变成产品
status: ready-to-publish
priority: normal
language: zh
section: ai-agent
brief_type: research
dispatched_at: 2026-08-07T15:44:00+08:00
source_refs:
---

# 选题契约

## 唯一命题

Manus 的产品创新是把 Agent 的“身体”从一组窄工具升级为每任务计算机，并把价值单位从聊天回复改成交付物。文章要研究 task、cloud computer、browser、files、software、artifact 与人工验收怎样组成产品，同时严格限制对闭源内部实现的推断。

## 为什么值得由我写

既有 Harness 文章只把 Manus 当作 context engineering 案例。本篇把它放到产品架构中心，追问“为什么给 Agent 一台电脑”会改变任务范围、用户预期、信任边界和失败恢复，而不是继续复述缓存与 prompt 技巧。

## 目标读者与阅读场景

读者正在决定自己的 Agent 应获得浏览器、几个 API 工具，还是完整 VM；也可能在设计异步任务产品。读完后能选择执行身体，定义任务级隔离、登录态边界、工件检查点和人工验收，而不把 VM 隔离误认为外部副作用可回滚。

## 编辑选择

- 文章轨道：`research`
- 已选形态：从“聊天回复”到“任务拥有一台电脑”的产品设计解剖
- 核心张力：执行身体越通用，任务覆盖越广，信任面和失败后果也越大
- 这次主动不讲：闭源微服务猜测、Manus 成功学、通用 Agent 排名
- 系列元数据：`Agent 系统设计解剖` / `agent-system-design` / order `4` / total `11`
- 执行要求：同时使用 `research-agent-system-case-study`、`write-blog-from-brief` 与 `excalidraw-architecture`

## 已批准素材包

### 事实与项目证据

- 只允许使用 Manus 当前第一方公开资料、可观察产品行为和明确标记的文章推论。
- 本轮允许公开的研究要求：产品、系统、Agent 三层必须区分，尤其强调边界处理和选择理由。

### 作者原话与在场片段

- 不编造作者购买、长期运行或内部接触 Manus 的经历。

### 作者观察

- 当产品承诺“替你完成任务”时，用户验收的对象会从一句回答变成文件、网页修改、研究结果或其他 artifact。

### 待验证推论

- Manus 的审美可概括为“computer as body、artifact first”；应检查这是否覆盖 Cloud Browser、Browser Operator、Wide Research 和持久 Cloud Computer 的真实差异。

## 参考方向

- 从 [Introduction](https://manus.im/docs/introduction/welcome)、[Manus Sandbox](https://manus.im/blog/manus-sandbox)、[Cloud Browser](https://manus.im/docs/features/cloud-browser)、[Browser Operator](https://manus.im/docs/features/browser-operator)、[Wide Research](https://manus.im/docs/features/wide-research) 起步。
- 区分每任务隔离环境、持久 Cloud Computer 与用户本地登录态授权。
- 产品文档能证明能力边界，不能证明未公开的 planner、队列或微服务拓扑。
- 关于语言和框架若无一手证据，明确写“不可验证”，而不是补全一套看似合理的技术栈。

## 图示任务

回答“为什么一台计算机会把回复变成交付物”。用 task envelope 包住独立 VM，内部串联 browser/files/code/artifact，外部标出用户验收和 Browser Operator 登录态边界；Wide Research 只作小型 fan-out/fan-in。输出 `04-manus/manus-computer-to-artifact` 三种格式。

## 证据与隐私边界

- 可以公开：Manus 第一方资料、公开产品界面与本轮设计推论。
- 必须匿名：不使用任何用户任务或登录态案例。
- 禁止使用：私人浏览器数据、账号、密钥、未经证实的内部架构。
- 发布前仍需作者确认：产品审美判断、所有闭源推论和最终采用建议。

## 不要写成

不要把产品文档画成精确内部微服务图。不要暗示 Browser Operator 位于云 sandbox 内，也不要把任务 VM 隔离写成第三方网站写入可以自动撤销。

## 验收标准

- [ ] 闭源事实与架构推论明确分栏
- [ ] 读者能判断 full computer 与 narrow tools 的适用差异
- [ ] 产品承诺、执行身体、登录态和 artifact 验收连成一条线
- [ ] 至少说明一个 VM 无法解决的副作用边界
- [ ] 三个独立研究 subagent 都留下证据账本
- [ ] Excalidraw 源文件、SVG、PNG 均通过校验和目视检查

## 执行回执

- article: content/zh/ai-agent/posts/agent-system-design-manus.md
- public_url:
- editorial_verdict: KEEP
- source_trail: 无 source_refs；三路研究只使用 Manus 第一方 docs、help center、API 与官方技术文章，冻结为 2026-08-07 current production documentation，并把公开产品事实、历史设计说明和架构推论分开
- checks: brief schema、AI flavor、front matter、canonical tags、diff whitespace、Excalidraw 结构校验、SVG/PNG 同源渲染与全尺寸目视检查均通过
- published_at:
- retro_notes: 文章把“computer as body”限制在 effect/working-state 层，拆开临时 Sandbox、Cloud Computer、Cloud Browser 与 Browser Operator，明确 VM 重建不覆盖第三方副作用

### 系列研究回执

- 研究日期：2026-08-07
- 对象冻结：Manus 持续交付 SaaS；无统一可复现 build、commit、生产 runtime manifest 或开源 Agent 仓库。研究以当日可访问第一方资料为版本面，各页面发布日期单独保留。
- 三路独立研究：
  - Agent 架构：第一方技术文章支持 model-driven action→observation loop、stable prefix、append-only context、失败 observation、`todo.md` 与 filesystem externalization；不能据此断言 2026 当前 planner、模型路由、retry 或 stop predicate。
  - 系统架构：默认是高权限、per-task 隔离的临时 VM；Cloud Computer 是长期 Ubuntu VM；Cloud Browser 管云端登录 session，Browser Operator 使用本地浏览器真实身份。四者是不同恢复和信任域。
  - 产品架构：价值单位从 reply 递进为 task、artifact、external change 与 running outcome；Plan、观察、Take Over、授权和 artifact review 是分布式验收点，最终采用与不可逆后果仍由用户承担。
- 保留的一手来源：
  - [Welcome](https://manus.im/docs/introduction/welcome) 与 [Manus API](https://manus.im/docs/integrations/manus-api) → task/work-product 产品承诺；不能证明 planner 实现或结果质量。
  - [Understanding Manus Sandbox](https://manus.im/blog/manus-sandbox) → per-task VM、宽权限、sleep/recycle 与选择性 artifact 恢复；不能证明虚拟化平台、完整磁盘 rollback 或隔离强度。
  - [Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) → loop/context/filesystem 设计说明；不能证明当前全部生产路径仍逐项一致。
  - [Cloud Computer](https://help.manus.im/en/articles/15392111-what-is-the-cloud-computer) 与 [plans/billing](https://help.manus.im/en/articles/15392078-understanding-cloud-computer-plans-and-billing) → persistent FS/process、公网 IP、停付删除与用户备份责任；不能证明自动 snapshot、HA 或 rollback。
  - [Cloud Browser](https://manus.im/docs/features/cloud-browser) → 云端 browser、登录 session、Take Over 与数据中心 IP；不能证明其与 task VM 同进程或 session token 精确数据路径。
  - [Browser Operator](https://manus.im/docs/features/browser-operator) → 本地 login/IP、每 session 授权、专用 tab、接管与关闭停止；不能证明逐动作审批、日志完整性或既有外部写入可撤销。
  - [Wide Research](https://manus.im/docs/features/wide-research) 与 [Help Center](https://help.manus.im/en/articles/11960169-what-is-wide-research) → decomposition、fresh contexts、并行、synthesis 与适用边界；不能统一解释 20 concurrent 与 hundreds/250 items 的口径。
  - [Plan Mode](https://www.manus.im/blog/manus-plan-mode) → 可编辑计划与 Confirm 前不执行；不能证明计划执行一致性或最终工件正确。
- 图示问题：为什么一台计算机会把回复变成交付物。
- 图示交付：
  - `assets/diagrams/agent-system-series/04-manus/manus-computer-to-artifact.excalidraw`
  - `static/images/agent-system-series/04-manus/manus-computer-to-artifact.svg`
  - `static/images/agent-system-series/04-manus/manus-computer-to-artifact.png`
- 最强边界：计算机是可验证的执行与外置 working-state 边界，不是已证实的完整 Agent 内核。VM 重建、tab 关闭和 session 清除都不会自动撤回外部系统已接受的副作用。
- 证据缺口：生产 loop/planner、VM orchestration、browser protocol、session token 数据路径、Wide 调度/重试/取消、统一 evaluator、外部 effect reconciliation 与全局 audit schema均未公开。
- 未决作者判断：“computer as body”“artifact first”的审美评价、最终采用建议、标题和发布决定仍由作者确认。
