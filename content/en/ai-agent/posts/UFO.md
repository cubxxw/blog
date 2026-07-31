---
url: "/projects/UFO/"
title: 'Microsoft UFO³ Explained: From Windows Desktop AgentOS to a Multi-Device Agent Galaxy'
ShowRssButtonInSectionTermList: true
date: 2025-05-09T21:30:15+08:00
lastmod: 2026-07-30T12:00:00+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Automation
  - Development
  - Open Source
  - Windows
categories:
  - Development
description: >
  A practical analysis of Microsoft UFO³, tracing its path from Windows UI automation to Desktop AgentOS and cross-device orchestration, with limits and guidance.
cover:
  image: /images/covers/ai-agent/2025/UFO.png
  alt: "Microsoft UFO desktop agent architecture"
tldr:
  - "UFO began as a two-agent Windows UI system, became the more deeply integrated UFO² Desktop AgentOS, and now sits inside UFO³ as its Windows device agent."
  - "UFO² combines UI Automation, visual parsing, native application APIs, retrieval, and guarded multi-action execution; the point is not human-like clicking, but choosing the strongest available interface."
  - "UFO³ adds Galaxy: a dynamic task graph, asynchronous multi-device scheduling, and a persistent agent protocol. It is an orchestration layer, not a replacement for device-specific execution."
---

## Why UFO matters

Desktop automation has always had an awkward boundary. Scripts are fast and precise when an application exposes the right interface. GUI automation is broad, but a changed label, a delayed window, or a custom-drawn control can break an otherwise sensible workflow. A vision-language model can interpret what it sees, yet perception alone does not make an action reliable.

Microsoft's UFO project is interesting because its evolution follows that boundary instead of pretending it does not exist.

The original **UFO**—short for *UI-Focused agent*—used a pair of agents to understand and operate Windows applications. **UFO²** deepened the idea into a Windows **Desktop AgentOS**, combining GUI perception with operating-system and application APIs. **UFO³** then widened the system boundary again: its Galaxy framework coordinates work across Windows desktops, Linux hosts, mobile devices, and other registered agents.

That history suggests a useful principle:

> A capable computer agent is not defined by how convincingly it imitates a person. It is defined by how carefully it chooses among the interfaces the machine already provides.

This article explains that progression, the architecture behind it, and the limits that still matter. It reflects the official repository, documentation, and papers available through July 2026.

## The three generations at a glance

| Generation | Public milestone | Primary scope | Central idea |
|---|---:|---|---|
| UFO | 2024 | One Windows desktop, multiple applications | A HostAgent selects applications; an AppAgent operates inside them |
| UFO² | 2025 | Windows Desktop AgentOS | Deep OS integration, hybrid GUI/API actions, continuous knowledge, and isolated execution |
| UFO³ | 2025 onward | Multiple heterogeneous devices | Dynamic DAG planning, asynchronous orchestration, and persistent agent communication |

The names can be confusing because UFO³ does not discard UFO². The official project presents **UFO³ as Galaxy plus UFO²**: Galaxy plans and coordinates cross-device work, while UFO² remains the mature Windows executor and can participate as a device agent. For Windows-only automation, the documentation still recommends UFO²; Galaxy is intended for workflows that genuinely cross device or platform boundaries.

Sources: [official UFO repository](https://github.com/microsoft/UFO), [UFO³ documentation](https://microsoft.github.io/UFO/), and the [official FAQ](https://microsoft.github.io/UFO/faq/).

## UFO: separating desktop routing from application control

The first UFO paper framed Windows interaction as a hierarchical problem. A user request such as “summarize these figures in a slide and email it” is not one long click sequence. It contains at least two levels of reasoning:

1. Which application should handle the next part of the request?
2. Within that application, which control or operation should be used?

UFO assigned those responsibilities to two roles.

### HostAgent

The HostAgent interprets the overall request, observes the desktop, selects or launches an application, and delegates an application-specific subtask. When work must continue elsewhere, control returns to the HostAgent.

### AppAgent

The AppAgent focuses on the active application. It observes the screenshot and available control metadata, reasons about the next operation, acts, and repeats until the delegated subtask is complete.

This separation is more important than the names suggest. It prevents every action from carrying the entire cross-application problem. The HostAgent owns coordination; the AppAgent owns local execution. The original paper describes this as a dual-agent framework built around Windows GUI and control information, using multimodal models to operate both within and across applications.

The design was already more structured than a screenshot-only agent, but its practical weaknesses were familiar: incomplete accessibility trees, custom controls, visual ambiguity, repeated model calls, and interference with the user's own mouse and keyboard. UFO² was an answer to those constraints.

Source: [Microsoft Research, “UFO: A UI-Focused Agent for Windows OS Interaction”](https://www.microsoft.com/en-us/research/publication/ufo-a-ui-focused-agent-for-windows-os-interaction/) and the [paper](https://arxiv.org/abs/2402.07939).

## UFO²: turning a GUI agent into a desktop runtime

UFO² retains the HostAgent/AppAgent hierarchy but treats it as part of a larger runtime. The HostAgent decomposes a request into application-level subtasks and coordinates their order. Each AppAgent runs a ReAct-style loop inside one application, using the current UI state, retrieved knowledge, prior execution context, and the actions available for that application.

The useful change is not simply “more agents.” It is the addition of stronger system interfaces around them.

### 1. Hybrid control detection

Windows UI Automation (UIA) exposes structured information such as control names, types, bounds, and hierarchy. When applications implement accessibility semantics well, UIA gives an agent something screenshots cannot: a machine-readable model of the interface.

Not every interface cooperates. Custom-rendered toolbars, icons, canvases, and remote surfaces may be missing from the UIA tree or represented poorly. UFO² therefore combines UIA with vision-based parsing. Structured controls and visually detected controls are merged into a shared action space.

This is not redundancy for its own sake. The two channels fail differently:

- UIA is precise and semantic, but its coverage depends on the application.
- Vision is flexible, but spatial interpretation can be ambiguous.
- Their combination gives the agent a fallback without forcing every interaction through pixels.

The UFO² paper reports that the hybrid pipeline recovered cases that either UIA-only or vision-only detection could not complete. The exact result depends on the benchmark, model, and application set, so it should be read as evidence for the architecture rather than a universal success rate.

### 2. A unified GUI–API action layer

UFO² calls its action orchestrator **Puppeteer**. It offers a common interface over low-level GUI operations and higher-level application-native APIs.

For example, exporting an Excel workbook can be performed by navigating menus and a save dialog. It can also be performed through Excel's COM interface when that operation is registered as an action. The second path is usually shorter and less sensitive to layout changes. When no suitable API exists, the agent can still fall back to mouse and keyboard interaction.

The important hierarchy is:

1. Prefer a native, inspectable operation when one is available.
2. Use structured UI controls when the application exposes them.
3. Use visual interaction for the remainder.

This makes the agent less theatrical and more dependable. A system should not click through five screens merely to prove that it can see them.

Developers can extend the action space by wrapping application-specific functions and registering their metadata. The AppAgent can then select those functions as part of the same reasoning loop used for GUI actions.

Source: [UFO² architecture overview](https://microsoft.github.io/UFO/ufo2/overview/) and [UFO² AppAgent documentation](https://microsoft.github.io/UFO/ufo2/app_agent/overview/).

### 3. Continuous knowledge without retraining

An agent may identify a control correctly and still choose the wrong workflow because it lacks application knowledge. UFO² addresses this with a retrieval layer that can draw from:

- local help documents;
- user-provided demonstrations;
- successful execution traces and summarized experience;
- configured online retrieval sources.

The retrieved material is inserted into the AppAgent's context when relevant. This is closer to maintaining an operational handbook than changing the model itself. It also makes knowledge easier to inspect and replace.

There is an important engineering caution here: retrieval can import stale or untrusted instructions. Documentation should be versioned, demonstrations should be reviewed, and online content should not silently gain the authority of a local tool. “Continuous knowledge” is only an advantage when provenance remains visible.

### 4. Speculative multi-action execution

A naïve computer agent asks the model for one action, executes it, captures the next state, and asks again. That loop is safe but expensive. Some sequences are predictable: selecting a heading and choosing center alignment, for example.

UFO² can propose several consecutive actions in one inference. Each action is still checked against the live interface before execution, and the sequence can stop when the observed state diverges from the prediction. This reduces avoidable reasoning round trips without treating the original plan as infallible.

The distinction matters. **Batching** saves latency; **validation** preserves control. Removing the validation step would turn an optimization into blind macro playback.

### 5. Picture-in-Picture isolation

GUI automation competes with the user when both share one visible desktop. UFO² introduces a Picture-in-Picture design that runs automated interaction in an isolated desktop environment, allowing the user and agent to work concurrently.

Isolation improves usability, but it should not be mistaken for a complete security boundary. An agent may still open files, modify documents, invoke application APIs, or transmit data according to its configuration. Sensitive deployments need separate credentials, narrow filesystem and network access, explicit confirmation for consequential actions, and auditable logs.

### 6. Extensibility and service deployment

The UFO² paper also describes an “Everything-as-an-AppAgent” registry and a client-server mode. Third-party executors can be adapted to the AppAgent contract, while a lightweight client handles local sensing and GUI operations and a server hosts orchestration and model calls.

This is a useful abstraction, but it increases the trust surface. Once orchestration and execution are separated by a network, authentication, transport security, secret handling, session ownership, and trace retention become architectural concerns rather than deployment details.

Source: [“UFO²: The Desktop AgentOS”](https://arxiv.org/abs/2504.14603) and its [Microsoft Research publication page](https://www.microsoft.com/en-us/research/publication/ufo2-the-desktop-agentos/).

## How a UFO² request moves through the system

Consider a request:

> Open the quarterly workbook, create a chart from the revenue table, and place it in the existing PowerPoint report.

A simplified execution path looks like this:

1. The session passes the request and desktop context to the HostAgent.
2. The HostAgent identifies Excel as the first target and delegates a bounded subtask.
3. The Excel AppAgent observes both visual and UIA state, retrieves relevant knowledge, and selects an API or GUI action.
4. The AppAgent reports its result and relevant context to the HostAgent.
5. The HostAgent selects PowerPoint and creates or activates its AppAgent.
6. The PowerPoint AppAgent inserts the chart, verifies the resulting state, and reports completion.
7. The session records the trace and returns the outcome to the user.

The blackboard, memory, prompts, processors, and finite-state transitions in the implementation support this flow. They are mechanisms, not the essence of the design. The essence is that global planning and application-local action have different scopes and should be allowed to fail, retry, and report at those scopes.

## UFO³: from an AgentOS to an agent galaxy

UFO² asks: “How can an agent work reliably across applications on one Windows machine?”

UFO³ asks a wider question: “How can specialized agents on different devices execute one evolving plan without losing dependencies, results, or control?”

Its Galaxy framework introduces three central ideas.

### TaskConstellation: a plan that can change

Galaxy represents a request as a **TaskConstellation**, a directed acyclic graph (DAG):

- a **TaskStar** is an executable subtask;
- a **TaskStarLine** carries a control or data dependency;
- the graph records which work can run now, which work must wait, and which results feed later tasks.

A fixed DAG would still be brittle. Real execution produces new information: a server is unavailable, a file contains unexpected rows, or a device lacks the required capability. The ConstellationAgent can edit the graph in response to results by adding, replacing, or reconnecting tasks. The official paper describes validation and locking rules intended to keep those edits consistent while other tasks are running.

This is a deeper change than adding parallelism. In UFO², the plan primarily evolves through an application-oriented agent loop. In Galaxy, the plan itself is a first-class distributed object.

### Asynchronous, capability-aware orchestration

The TaskOrchestrator schedules ready TaskStars across registered device agents. Assignment can consider platform and advertised capability rather than binding every task to a named machine in advance. Independent work can proceed concurrently; dependent work waits for the required results.

A cross-device request might therefore:

1. retrieve logs from several Linux hosts in parallel;
2. aggregate the results;
3. hand the dataset to a Windows agent;
4. update an Excel workbook;
5. compose a report in a desktop application.

UFO² can act as that Windows agent. Linux and mobile agents expose different tools because the right interface on a server or phone is not the right interface on a Windows desktop.

### AIP: the communication fabric

Galaxy's Agent Interaction Protocol (AIP) uses persistent, bidirectional WebSocket sessions between orchestration components and device agents. The protocol covers registration, capabilities, task dispatch, status events, heartbeats, and recovery from interrupted connections.

This persistent control plane fits long-running, event-driven work better than treating every agent interaction as an isolated request. It also makes identity and authorization more important. A device that can register, receive a task, and return a result is part of the execution fabric; it should be authenticated and granted only the capabilities it needs.

Source: [“UFO³: Weaving the Digital Agent Galaxy”](https://arxiv.org/abs/2511.11332), [Galaxy overview](https://microsoft.github.io/UFO/galaxy/overview/), and [AIP documentation](https://microsoft.github.io/UFO/aip/overview/).

## UFO² and UFO³ are layers, not competitors

| Question | UFO² | UFO³ Galaxy |
|---|---|---|
| Main boundary | One Windows device | A pool of heterogeneous devices |
| Planning unit | Application subtask | TaskStar in a dependency graph |
| Core coordinator | HostAgent | ConstellationAgent and TaskOrchestrator |
| Execution style | Primarily application-oriented agent loops | Asynchronous DAG scheduling |
| Interfaces | Windows UIA, vision, GUI actions, native APIs | AIP plus the tools offered by each device agent |
| Best fit | Windows-only workflows | Cross-device workflows with real dependencies |
| Maturity described by project | Stable/LTS | Active development |

Use UFO² when the work lives on Windows and the extra orchestration layer would add ceremony without value. Use Galaxy when a task actually spans devices, requires concurrent execution, or needs explicit dataflow across specialized agents.

An architecture is mature when it knows where to stop. Not every local task needs a galaxy.

## A practical way to explore the project

UFO is an open-source research system, not a turnkey permission boundary. Test it in a disposable environment before granting it access to meaningful accounts or files.

### Prerequisites and configuration

The current repository documents separate paths for Galaxy and UFO². At a high level:

1. Clone the [official Microsoft UFO repository](https://github.com/microsoft/UFO).
2. Create a dedicated Python environment and install the repository's pinned requirements.
3. Copy the relevant configuration templates under `config/`.
4. Configure a supported model provider through environment-backed secrets where possible.
5. Start with a harmless, observable task on test documents.
6. Inspect the execution trace before expanding permissions or enabling remote device agents.

For Windows-only exploration, begin with the [UFO² quick start](https://microsoft.github.io/UFO/getting_started/quick_start_ufo2/). For cross-device work, follow the [Galaxy quick start](https://microsoft.github.io/UFO/getting_started/quick_start_galaxy/) and register one test device at a time.

Avoid copying API keys into examples, screenshots, or committed configuration. The repository changes over time, so use the commands and filenames in the version of the official documentation that matches your checkout rather than relying on an old blog post.

### A sensible first experiment

A good test is narrow but diagnostic:

- operate on copied documents, not originals;
- require two applications at most;
- include a result that can be checked mechanically;
- record whether the system used UIA, vision, or a native API;
- deliberately change one harmless UI condition and observe recovery;
- repeat the task to see whether retrieved experience helps or merely reinforces an error.

Success should mean more than “the final screen looked right.” Check the output file, the execution trace, the action count, the recovery behavior, and whether any unnecessary data left the machine.

## What the project gets right

### It treats interfaces as a hierarchy

The strongest part of UFO² is its refusal to equate computer use with pixel clicking. Native APIs, structured accessibility data, and vision each have a place. This is an engineering position, not a model trick.

### It gives coordination an explicit shape

HostAgent/AppAgent separation makes cross-application work easier to reason about. UFO³ carries that idea into a dynamic dependency graph, where distributed state and dataflow are visible rather than hidden inside one enormous prompt.

### It acknowledges that execution must coexist with people

Picture-in-Picture isolation and explicit device agents recognize that automation runs in occupied environments. Reliability includes not stealing the user's desktop at the wrong moment.

### It keeps specialization

A Windows desktop agent, a Linux server agent, and a mobile agent should not be forced into one lowest-common-denominator toolset. Galaxy coordinates them while allowing each device agent to retain platform-specific skills.

## What remains difficult

### Verification is still the hard part

An agent can execute every planned action and still produce the wrong business result. Screenshots and action traces are evidence, not proof. High-stakes workflows need domain-specific postconditions: file hashes, schema checks, formulas, approval gates, or independent evaluators.

### Dynamic plans expand the attack surface

When results can cause the task graph to be rewritten, untrusted content can influence not only an action but the future structure of the workflow. Tool outputs, retrieved documents, and device messages must be treated as data with provenance, not automatically as instructions.

### Benchmarks do not collapse into one reliability number

The UFO² and UFO³ papers report encouraging results on selected benchmarks and case studies. Those results establish that the proposed mechanisms can help under the evaluated conditions. They do not guarantee success across arbitrary Windows versions, application releases, languages, accessibility implementations, models, or enterprise policies.

### Cross-device recovery has semantic costs

Retrying a read is usually safe. Retrying “send the email,” “submit the form,” or “transfer the file” may duplicate an irreversible action. Distributed orchestration needs idempotency keys, durable state, and operation-specific recovery rules—not only reconnect logic.

### Human approval must be designed, not appended

A confirmation dialog is useful only if it explains the intended action, target, data, and consequence. Repeated generic prompts train users to approve reflexively. The right approval boundary is semantic: before external publication, deletion, payment, credential use, or the release of sensitive information.

## The larger lesson

UFO's progression—from a dual-agent GUI system, to a Windows AgentOS, to a multi-device execution fabric—looks like a story of increasing scope. The more important story is increasing **structure**:

- perception is paired with machine-readable controls;
- clicking is paired with native APIs;
- application reasoning is separated from desktop coordination;
- local execution is separated from distributed orchestration;
- a linear plan becomes an inspectable graph;
- optimistic execution is paired with live validation.

Each layer adds capability, and each layer also adds a new place where trust can fail. The responsible path is therefore not to maximize autonomy in one step. It is to make every boundary explicit enough to observe, constrain, and replace.

The future desktop agent may feel conversational at the surface. Underneath, the systems that last will probably look less like a single intelligence and more like UFO³: a collection of specialized executors, coordinated through declared dependencies, working through the strongest available interfaces, and leaving enough evidence for a human to understand what happened.

## References

- Microsoft Research, [UFO: A UI-Focused Agent for Windows OS Interaction](https://www.microsoft.com/en-us/research/publication/ufo-a-ui-focused-agent-for-windows-os-interaction/)
- Chaoyun Zhang et al., [UFO: A UI-Focused Agent for Windows OS Interaction](https://arxiv.org/abs/2402.07939)
- Microsoft Research, [UFO²: The Desktop AgentOS](https://www.microsoft.com/en-us/research/publication/ufo2-the-desktop-agentos/)
- Chaoyun Zhang et al., [UFO²: The Desktop AgentOS](https://arxiv.org/abs/2504.14603)
- Chaoyun Zhang et al., [UFO³: Weaving the Digital Agent Galaxy](https://arxiv.org/abs/2511.11332)
- Microsoft, [UFO³ official repository](https://github.com/microsoft/UFO)
- Microsoft, [UFO³ official documentation](https://microsoft.github.io/UFO/)
