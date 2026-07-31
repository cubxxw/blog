---
title: "demo-steps 组件预览（勿发布）"
date: 2026-07-23T18:00:00+08:00
lastmod: 2026-07-31T18:28:21+08:00
showtoc: false
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Blog
  - Automation
  - Open Source
categories:
  - Development
description: >
  这是博客交互式 shortcode 的内部视觉验收页，以合成 Agent Loop 数据检查步骤卡片、前后对比、图片标注、终端输出和执行轨迹的渲染效果。页面不构成完整教程，也不代表真实模型推理或天气预报，仅用于开发期间验证组件在中英文内容中的结构、样式与边界提示，同时确认普通正文能继续正常展示与排版。
cover:
  image: /images/covers/ai-agent/2025/langgraph.jpeg
  alt: "作为交互式 shortcode 预览素材的状态图"
---

这是 `demo-steps` 系列交互组件的内部预览页。下面的 Agent Loop
只是用于检查渲染的紧凑 fixture，不是完整教程，也不是真实模型运行记录。
其中的日期、天气数值和 trace 事件全部是合成数据。

{{< demo-steps title="Agent Loop 是怎么转起来的" >}}

{{< demo-step label="用户输入" >}}
用户的一句话进入系统，被包装成初始消息。此时上下文里只有 system prompt 和这条输入：

```json
{ "role": "user", "content": "帮我查一下明天北京的天气" }
```
{{< /demo-step >}}

{{< demo-step label="LLM 决策" >}}
模型读到消息后不直接回答，而是判断需要调用工具。它输出一个结构化的 tool call，而**不是**自然语言：

```json
{ "tool": "get_weather", "args": { "city": "北京", "date": "2026-07-24" } }
```
{{< /demo-step >}}

{{< demo-step label="工具执行" >}}
运行时捕获 tool call，并向天气服务请求数据；在这个 fixture 中，该步骤只由合成结果模拟。运行时把结果作为 `tool` 角色的消息追加回上下文。模型不会直接观察外部服务，只会收到运行时提供的消息。
{{< /demo-step >}}

{{< demo-step label="循环或终止" >}}
带着工具结果，模型再运行一轮：信息够了就生成最终回答，不够就发起下一个 tool call。在这个最小演示里，模型不再请求工具时循环结束；生产循环还必须设置步数、时间、成本、权限与失败边界。
{{< /demo-step >}}

{{< /demo-steps >}}

## demo-compare

{{< demo-compare title="Prompt 改造" >}}

{{< demo-case label="改造前" >}}
```text
你是一个助手。请帮用户查天气。
```

模型没有得到可用工具、调用时机和调用格式，运行时也就没有可验证的契约。
{{< /demo-case >}}

{{< demo-case label="改造后" >}}
```text
你可以调用 get_weather(city, date)。
仅当用户询问天气时调用；其余情况直接回答。
调用格式：{"tool":"get_weather","args":{...}}
```

工具边界、触发条件和输出格式变得明确，行为因此更容易测试，而不是自动获得可靠性。
{{< /demo-case >}}

{{< /demo-compare >}}

## demo-anno

{{< demo-anno src="/images/projects/langgraph-state-machine.svg" alt="LangGraph 状态机架构图" title="LangGraph 状态机" >}}
{{< demo-spot x="18" y="30" label="State（共享状态）" >}}
节点接收共享状态的视图并返回更新。State 是图步骤之间传递信息的显式契约。
{{< /demo-spot >}}
{{< demo-spot x="55" y="50" label="Node（节点）" >}}
节点是一项工作单元。让节点保持小而清楚，并隔离外部副作用，才更容易测试和重放。
{{< /demo-spot >}}
{{< demo-spot x="85" y="68" label="Conditional Edge（条件边）" >}}
路由函数读取 State 并选择下一跳；这个 fixture 的“循环或终止”决定发生在这条边界上。
{{< /demo-spot >}}
{{< /demo-anno >}}

## demo-terminal

{{< demo-terminal title="创建新文章" >}}
$ hugo new content/zh/ai-agent/posts/my-article.md
Content "content/zh/ai-agent/posts/my-article.md" created
$ make netlify-dev
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
{{< /demo-terminal >}}

## demo-agent-trace

下面的 trace 是合成的组件数据。它既不是隐藏的模型思维过程，也不是经过验证的天气预报。

{{< demo-agent-trace title="一条合成的 Agent Loop" question="帮我查一下明天北京的天气" >}}
[
  {"type":"think","text":"演示请求需要当前天气数据，因此 fixture 选择天气工具。"},
  {"type":"tool_call","tool":"get_weather","args":"{\"city\":\"北京\",\"date\":\"2026-07-24\"}"},
  {"type":"tool_result","text":"{\"temp_high\":\"31°C\",\"cond\":\"晴转多云\",\"wind\":\"3 级\"}"},
  {"type":"think","text":"fixture 已有温度、天气与风力，可以渲染回答。"},
  {"type":"answer","text":"明天北京晴转多云，最高气温 31°C，风力 3 级——适合出门，注意防晒。"}
]
{{< /demo-agent-trace >}}

组件预览之后，普通文章正文应继续正常渲染。
