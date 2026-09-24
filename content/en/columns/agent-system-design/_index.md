---
title: Agent System Design Anatomy
slug: agent-system-design
subtitle: Control, state, identity, and responsibility in real systems
date: 2026-08-07T19:44:00+08:00
description: >
  Source-grounded studies of Pi, n8n, and OpenClaw: trace who controls the loop, owns persistent state, enforces permissions, and recovers external side effects.
type: columns
---

Systems called “agents” give models very different kinds of control. A coding
kernel, a workflow engine, and a persistent messaging gateway place their state,
permissions, and recovery responsibilities in different layers.

This series studies those boundaries through pinned source versions. Each case
separates observed implementation from interpretation and unknowns, with an
editable architecture diagram and a concrete failure scenario.

The following case studies are available in English:

1. [Pi: the minimal kernel and the responsibilities it leaves to the host](/ai-agent/posts/agent-system-design-pi/).
2. [n8n: workflow control, queues, and external side effects](/ai-agent/posts/agent-system-design-n8n/).
3. [OpenClaw: persistent gateways, session identity, and trust boundaries](/ai-agent/posts/agent-system-design-openclaw/).

The [complete Chinese series](/zh/columns/agent-system-design/) contains eleven
essays. These English editions keep their original part numbers so readers can
move between the two languages without losing their place in the series.
