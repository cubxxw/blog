---
title: 'IMStage: Editable Chat Scenes'
date: 2026-09-23T09:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - MCP
  - Open Source
  - Product Strategy
categories:
  - Development
product: imstage
description: >
  Create editable chat scenes with IMStage. Generate dialogue and photos, reuse templates, make project variations, and export PNGs with automatic draft saving.
---

The same support demo needs a WeChat version, a WhatsApp version, and different people and photos. The dialogue barely changes, but the image has to be rebuilt. IMStage keeps those changes inside an editable scene for product demos, teaching materials and fictional stories.

Describe a moment in [IMStage](https://imstage.org/?lang=en). AI opens the workspace and generates the dialogue and imagery. You can then edit messages, people, photos and layout directly, or ask for another change in plain language.

{{< figure src="/images/products/imstage-en.jpg" alt="IMStage in English: a scene prompt beside a WhatsApp conversation and generated photo" caption="The English example uses WhatsApp. Characters and photos are fictional, AI-generated material displayed by the actual scene renderer." width="1440" height="900" >}}

## A scene you can keep changing

Rewrite a reply, replace an avatar, or adjust the time and device status without starting over. Preview and export read the same scene. Export a standard screenshot or a long PNG of the full conversation.

Workspace drafts save automatically in the current browser. After sign-in, scenes, people and project settings sync to the server. If syncing fails, the status stays visible and the local draft is retained. The homepage demo resets on reload.

## One premise, different stories

Save a scene as a template and reuse names, images and other content as variables. A project holds the shared premise, so each variation only needs to describe what changes. A series of chats before a meeting can share a plot while using different people, photos and dialogue. Localized support examples work the same way.

An existing screenshot can be a starting point: reconstruct an approximate editable layout, or retain the original image and edit selected regions. This supports further creation without promising pixel-perfect reconstruction of any app.

## Self-host it or connect your AI tools

IMStage is MIT-licensed. The Web workspace and MCP share a scene renderer. For MCP, the calling AI supplies the content to save in batches or render; access uses an administrator-configured instance token and a separate scene store.

Manual local editing and export need no model key. Hosted AI creation requires sign-in, account credits and a model configured on the server. The tool creates demo images; it does not send messages to WeChat or WhatsApp.

[Source code and deployment docs on GitHub](https://github.com/kubbot/imstage).
