---
title: "demo-steps 组件预览（勿发布）"
date: 2026-07-23T18:00:00+08:00
draft: true
tags: ["AI Agents"]
description: "demo-steps shortcode 的内部预览页。"
---

这是 `demo-steps` 交互组件的预览页，用一个 Agent Loop 教程片段做示例。

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
运行时捕获 tool call，真正去请求天气 API。执行结果作为 `tool` 角色的消息追加回上下文——模型自己看不到外部世界，它只能看到这条结果。
{{< /demo-step >}}

{{< demo-step label="循环或终止" >}}
带着工具结果，模型再推理一轮：信息够了就生成最终回答，不够就发起下一个 tool call。**循环的终止条件是模型不再请求工具**——这就是 Agent Loop 的全部秘密。
{{< /demo-step >}}

{{< /demo-steps >}}

## demo-compare

{{< demo-compare title="Prompt 改造" >}}

{{< demo-case label="改造前" >}}
```text
你是一个助手。请帮用户查天气。
```

模型不知道有什么工具、什么时候该调用、格式长什么样——只能瞎猜。
{{< /demo-case >}}

{{< demo-case label="改造后" >}}
```text
你可以调用 get_weather(city, date)。
仅当用户询问天气时调用；其余情况直接回答。
调用格式：{"tool":"get_weather","args":{...}}
```

工具边界、触发条件、输出格式三件事都写死，行为立刻稳定。
{{< /demo-case >}}

{{< /demo-compare >}}

## demo-anno

{{< demo-anno src="/images/projects/langgraph-state-machine.svg" alt="LangGraph 状态机架构图" title="LangGraph 状态机" >}}
{{< demo-spot x="18" y="30" label="State（共享状态）" >}}
所有节点读写同一份 State——这是 LangGraph 与朴素 chain 的根本区别。
{{< /demo-spot >}}
{{< demo-spot x="55" y="50" label="Node（节点）" >}}
每个节点是一个纯函数：吃进 State，吐出 State 的增量更新。
{{< /demo-spot >}}
{{< demo-spot x="85" y="68" label="Conditional Edge（条件边）" >}}
路由函数看一眼 State 决定下一跳——Agent 的"循环或终止"就在这里发生。
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

## demo-agent-trace（旗舰）

{{< demo-agent-trace title="一个真实的 Agent Loop" question="帮我查一下明天北京的天气" >}}
[
  {"type":"think","text":"用户在问天气。我没有实时数据，需要调用天气工具。"},
  {"type":"tool_call","tool":"get_weather","args":"{\"city\":\"北京\",\"date\":\"2026-07-24\"}"},
  {"type":"tool_result","text":"{\"temp_high\":\"31°C\",\"cond\":\"晴转多云\",\"wind\":\"3 级\"}"},
  {"type":"think","text":"拿到了温度、天气和风力，信息足够，可以组织回答了。"},
  {"type":"answer","text":"明天北京晴转多云，最高气温 31°C，风力 3 级——适合出门，注意防晒。"}
]
{{< /demo-agent-trace >}}

组件之后的正文照常排版。
