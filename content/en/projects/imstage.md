---
title: 'IMStage: Synthetic Conversations for Tests and Evaluation'
date: 2026-09-23T09:00:00+08:00
lastmod: 2026-10-20T00:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - MCP
  - Developer Tools
  - Product Strategy
product: imstage
description: >
  Create synthetic chat scenes for tests, teaching and evaluation. Use templates, export PNG or JSON, and connect via MCP. Non-commercial source-available tool.
---

A chat-screenshot test needs different messages, people and timestamps. IMStage keeps those variations in editable synthetic scenes for software tests, teaching and evaluation datasets. [Current project overview](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

In [IMStage](https://imstage.org/?lang=en), edit messages, people, avatars and device settings directly, or sign in to let the hosted Agent draft and revise a scene. Previews and exports carry an “AI-generated / Fictional” label by default. [Features and usage boundaries](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

{{< figure src="/images/products/imstage-en.jpg" alt="An earlier IMStage English homepage showing a scene prompt and a synthetic chat preview" caption="An earlier interface from September 2026, with fictional people and synthetic photos. Current features and licensing are described below." width="1440" height="900" >}}

## A scene you can keep changing

Rewrite a reply, replace an avatar, or adjust the time and device status without starting over. Export a standard frame, a long PNG, or editable JSON. [Editing and export](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

Local sessions stay in the current browser; the hosted service saves scenes and projects for signed-in accounts. Manual editing and PNG export need no model key. The hosted Agent requires server configuration and sign-in. [Hosting and local use](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

## One premise, different stories

Save a scene as a template and reuse names, images and other content as variables. A project holds shared rules for batch variations, letting one test scene cover different messages and people. [Templates and projects](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

Public real-screenshot reference editing is disabled, and payment, transfer, red-packet and balance messages have been removed. Use fictional or authorised assets; synthetic output must never be presented as evidence of a real conversation. [Current restrictions](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

## Self-host it or connect your AI tools

Account MCP uses OAuth sign-in and shares saved scenes with the Web workspace. Self-hosted instance MCP retains an administrator token and a separate scene store. These connections have different account and storage boundaries. [MCP connections](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

Current versions use a source-available non-commercial license for testing, learning and research. New versions no longer use MIT; earlier MIT releases retain their original terms. [License notes](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md#license-and-commercial-use)

## References

- [IMStage features, connections and licensing (October 18, 2026 revision)](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)
