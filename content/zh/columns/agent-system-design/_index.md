---
title: Agent 系统设计解剖
slug: agent-system-design
subtitle: 十套真实系统，一篇控制权聚合
date: 2026-08-07T19:44:00+08:00
description: >
  从 Claude Code、Pi、Codex、Manus、n8n、OpenClaw、TaxHacker、OpenMontage、TradingAgents 到 OpenHands，逐篇冻结版本、还原 Agent 架构、系统架构和产品架构；最后以控制权、状态、执行身体、权限强制层和产品表面五个问题，推导设计新 Agent 的最小成立形态。
cover:
  image: /images/agent-system-series/11-synthesis/agent-system-constitutional-route.svg
  alt: Agent 系统设计的控制权宪法之河与六种最小成立形态
type: columns
---

Agent 不是一种产品。

同样叫 Agent，有的核心是一条十几行的 model/tool loop，有的是确定性 workflow 中的一小段概率支线；有的把状态放进事件树，有的把身份放进常驻 Gateway；有的给模型一台完整电脑，有的反而通过 schema、表单和人工 commit，拒绝让模型获得不必要的控制权。

这个专栏不做功能排行，也不把“更自治”当作“更先进”。

十篇个案都按同一研究纪律完成：

- 固定 release、commit 或研究日文档边界；
- 分别研究 Agent、系统与产品架构；
- 区分当前事实、推论、未来路线与闭源缺口；
- 追踪状态、权限、身份、恢复、并发和副作用所有者；
- 交付可编辑 Excalidraw、SVG、PNG 与阅读指南；
- 用一个可验证失败路径测试系统边界。

阅读路径从两个 coding harness 的反差开始，经协议控制面、计算机身体、确定性 workflow、身份 Gateway 和窄 AI，进入两种垂直组织，最后落到事件运行时与聚合篇：

1. Claude Code：扩展语义与渐进式控制
2. Pi：最小内核与责任外移
3. Codex：协议化内核与多 Surface 控制面
4. Manus：给 Agent 一台电脑
5. n8n：确定性外骨骼、队列与副作用
6. OpenClaw：常驻身份网关
7. TaxHacker：拒绝成为 Agent 的窄 AI
8. OpenMontage：Instructions as Code 与工件生产线
9. TradingAgents：多 Agent 辩论与相关性风险
10. OpenHands：无状态 Agent 与事件运行时
11. 聚合篇：Agent 如何重新分配控制权、状态、身份与副作用

建议按顺序读。若你正在设计一个新 Agent，也可以直接从第 11 篇的形态决策树进入，再回到对应个案核验证据。
