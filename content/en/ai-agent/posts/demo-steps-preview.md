---
title: "demo-steps Component Preview (Do Not Publish)"
date: 2026-07-23T18:00:00+08:00
draft: true
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
  An unpublished preview of the blog's interactive shortcodes, using an agent loop to check steps, comparisons, annotations, terminal output, and trace rendering.
cover:
  image: /images/covers/ai-agent/2025/langgraph.jpeg
  alt: "A state graph used as a fixture for the interactive shortcode preview"
---

This is an internal preview page for the `demo-steps` family of interactive
shortcodes. The Agent Loop below is a compact rendering fixture, not a complete
tutorial or a record of a live model run. All dates, weather values, and trace
events are synthetic.

{{< demo-steps title="How an Agent Loop Moves" >}}

{{< demo-step label="User input" >}}
The runtime wraps one user request as the initial message. At this point, the
context contains only the system prompt and this input:

```json
{ "role": "user", "content": "What will the weather be in Beijing tomorrow?" }
```
{{< /demo-step >}}

{{< demo-step label="Model decision" >}}
Instead of answering immediately, the model decides that it needs a tool. The
fixture represents that decision as a structured tool call rather than natural
language:

```json
{ "tool": "get_weather", "args": { "city": "Beijing", "date": "2026-07-24" } }
```
{{< /demo-step >}}

{{< demo-step label="Tool execution" >}}
The runtime catches the tool call and asks a weather service for data. It then
adds the result to the context as a `tool` message. The model does not observe
the service directly; it receives the message produced by the runtime.
{{< /demo-step >}}

{{< demo-step label="Loop or stop" >}}
The model runs again with the tool result. If the information is sufficient, it
returns a final answer; otherwise, it can request another tool. In this minimal
fixture, the loop ends when the model stops requesting tools. A production loop
also needs explicit limits for steps, time, cost, permissions, and failure.
{{< /demo-step >}}

{{< /demo-steps >}}

## demo-compare

{{< demo-compare title="Reworking a Prompt" >}}

{{< demo-case label="Before" >}}
```text
You are an assistant. Help the user check the weather.
```

The model has not been told which tools exist, when to call one, or what shape
the call should have.
{{< /demo-case >}}

{{< demo-case label="After" >}}
```text
You may call get_weather(city, date).
Call it only when the user asks about weather; answer directly otherwise.
Call format: {"tool":"get_weather","args":{...}}
```

The tool boundary, trigger condition, and output shape are now explicit, making
the behavior easier to test.
{{< /demo-case >}}

{{< /demo-compare >}}

## demo-anno

{{< demo-anno src="/images/projects/langgraph-state-machine.svg" alt="LangGraph state-machine diagram" title="LangGraph State Machine" >}}
{{< demo-spot x="18" y="30" label="State (shared data)" >}}
Nodes receive a view of shared state and return updates. State is the contract
that carries information between graph steps.
{{< /demo-spot >}}
{{< demo-spot x="55" y="50" label="Node" >}}
A node is one unit of work. Keeping it small and isolating side effects makes
its updates easier to test and replay.
{{< /demo-spot >}}
{{< demo-spot x="85" y="68" label="Conditional edge" >}}
A routing function reads state and chooses the next node. The loop-or-stop
decision in this fixture lives at that boundary.
{{< /demo-spot >}}
{{< /demo-anno >}}

## demo-terminal

{{< demo-terminal title="Create a New Article" >}}
$ hugo new content/en/ai-agent/posts/my-article.md
Content "content/en/ai-agent/posts/my-article.md" created
$ make netlify-dev
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
{{< /demo-terminal >}}

## demo-agent-trace

The following trace is synthetic component data. It is intentionally concise
and should not be read as hidden model reasoning or a verified forecast.

{{< demo-agent-trace title="A Synthetic Agent Loop" question="What will the weather be in Beijing tomorrow?" >}}
[
  {"type":"think","text":"The request needs current weather data, so the fixture selects the weather tool."},
  {"type":"tool_call","tool":"get_weather","args":"{\"city\":\"Beijing\",\"date\":\"2026-07-24\"}"},
  {"type":"tool_result","text":"{\"temp_high\":\"31°C\",\"cond\":\"sunny then cloudy\",\"wind\":\"level 3\"}"},
  {"type":"think","text":"The fixture now has temperature, conditions, and wind, which is enough to render an answer."},
  {"type":"answer","text":"Tomorrow in Beijing will be sunny, becoming cloudy, with a high of 31°C and level 3 wind. Consider sun protection if you go out."}
]
{{< /demo-agent-trace >}}

Ordinary article content should continue to render normally after the component
preview.
