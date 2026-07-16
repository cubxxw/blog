---
title: "AI Agent"
description: "Agent 工程、上下文工程与生成式引擎优化（GEO）——45+ 篇一线构建笔记，来自真实生产系统的架构、踩坑与复盘，持续连载。"
keywords: ["AI Agent", "Agent 工程", "上下文工程", "LLM 应用", "大语言模型", "Context Engineering", "GEO", "生成式引擎优化", "AI 原生", "Agent Engineering"]
faq:
  - q: 什么是 Agent 工程（Agent Engineering）？
    a: Agent 工程是构建生产级 AI Agent 系统的工程学科。模型能力只占很小一部分，绝大多数工程量在 Harness（执行框架）、工具编排、上下文管理、记忆系统与评估体系上。本栏目的《Agent Engineering 全景地图》系统拆解了这些工程层次。
  - q: 上下文工程（Context Engineering）和提示词工程有什么区别？
    a: 提示词工程优化的是单条指令的措辞；上下文工程管理的是模型在整个会话中能看到的全部信息——检索结果、记忆、工具输出、历史压缩。随着 Agent 长时运行成为常态，上下文工程正在取代提示词工程，成为 AI 应用的新地基。
  - q: 什么是 GEO（生成式引擎优化）？
    a: GEO（Generative Engine Optimization）是让内容更容易被 ChatGPT Search、Perplexity 等 AI 搜索引擎检索并引用的优化方法。与追求点击排名的传统 SEO 不同，GEO 优化的是「被 AI 引用的概率」。本栏目有六篇连载，从原理、结构化实战到度量工具完整拆解 GEO。
  - q: 这个栏目的内容基于什么经验？
    a: 全部来自作者熊鑫伟（cubxxw）构建 AI 产品的一线实践——开源项目、Agent 系统的生产落地、本博客自身 GEO 改造的实测数据，而非二手转述。文章按连载系列组织，可从任一系列的第一篇进入。
domains:
  - num: "01"
    name: "Agent 工程"
    kicker: "AGENT ENGINEERING"
    desc: "Harness 设计、工具编排、多智能体系统——模型之外那 98% 的工程量到底在哪里。"
    link: "/columns/agent-engineering/"
    link_text: "Agent 工程专栏"
  - num: "02"
    name: "上下文工程"
    kicker: "CONTEXT ENGINEERING"
    desc: "Context、记忆、RAG 与检索——决定 Agent 智力上限的不是模型，而是它能看到什么。"
    link: "/ai-agent/posts/context-engineering-the-new-foundation/"
    link_text: "从这一篇开始"
  - num: "03"
    name: "生成式引擎优化"
    kicker: "GEO"
    desc: "当搜索从「给链接」变成「给答案」，内容的可见性由被 AI 引用的概率决定。"
    link: "/columns/geo/"
    link_text: "GEO 连载专栏"
cascade:
  - type: "posts"
    showtoc: true
    tocopen: true
---

这里是熊鑫伟（cubxxw）的 AI Agent 一线构建笔记：记录如何把大模型从聊天框带进生产系统。内容围绕三个方向展开——**Agent 工程**、**上下文工程**与**生成式引擎优化（GEO）**，全部来自真实项目的构建、踩坑与复盘。
