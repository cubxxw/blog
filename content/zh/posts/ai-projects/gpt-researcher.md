---
title: "Gpt Researcher 开源项目深度学习"
date: 2025-04-14T16:17:27+08:00
draft: false
tocopen: true
tags: ["AI开源", "项目学习"]
categories: ["AI Open Source"]
author: ["Xinwei Xiong", "Me"]
description: >
  本项目是一个持续的过程，以日拱一卒的态度去学习 AI 开源项目，并且记录。
---

> 本项目是一个持续的过程，以日拱一卒的态度去学习 AI 开源项目，通过实践真实项目，结合 AI 工具，提升解决复杂问题的能力。并且记录。
> [notion List](https://traveling-thistle-a0c.notion.site/Open-Source-Project-Learn-1d2a444a6c008030a24efaa0e3bf5f5c?pvs=4)


**基本信息**
- 项目名称：gpt_researcher
- GitHub 地址：https://github.com/assafelovic/gpt-researcher/blob/master/README-zh_CN.md


## **1. GPT-Researcher 项目简介**


### **1.1. 项目使命与愿景**

GPT-Researcher 是一个由人工智能驱动的自主代理，旨在执行全面的研究任务。其核心使命是“通过人工智能为个人和组织提供准确、无偏见和基于事实的信息”<sup>1</sup>。这一使命清晰地阐述了项目旨在解决的核心问题，即在信息爆炸的时代，如何高效、可靠地获取和处理信息。

该项目的愿景是利用 AI 的力量，将传统上耗时数周且资源密集的手动研究过程，转变为一个高效、自动化的流程 <sup>1</sup>。它致力于快速提供经过精心策划和聚合的研究结果，从而显著提升信息获取和分析的效率 <sup>2</sup>。


### **1.2. 核心价值主张**

GPT-Researcher 的主要价值在于其能够生成详尽、客观的研究报告。它通过结合大型语言模型（LLM）的强大生成能力与实时的网络信息抓取、多源数据聚合以及本地文档处理能力来实现这一目标 <sup>1</sup>。这种结合旨在克服单独使用 LLM 进行研究所面临的挑战，例如信息过时、潜在偏见和上下文长度限制。

该项目适用于多种研究场景，例如生成公司简报、进行市场分析、发现行业趋势等，能够根据用户的具体目标快速提供准确、可信的结果 <sup>2</sup>。它不仅仅是一个简单的 LLM 封装器，而是作为一个针对研究任务的特定解决方案，旨在解决 LLM 在处理需要最新、广泛且深入信息的任务时所固有的局限性 <sup>1</sup>。通过整合实时数据和结构化处理流程，GPT-Researcher 旨在提供比独立 LLM 更可靠的研究工具。


## **2. 应对现代研究的挑战**


### **2.1. 问题领域**

GPT-Researcher 明确旨在解决当前研究工作流中存在的若干痛点 <sup>1</sup>：



* **耗时的手动研究：** 传统研究方法为了得出客观结论，往往需要投入数周时间及大量人力物力。
* **LLM 的时效性与幻觉：** 基于旧数据训练的 LLM 在处理需要最新信息的任务时，可能产生不准确或“幻觉”内容。
* **LLM 的 Token 限制：** 现有 LLM 的上下文窗口大小限制了其处理大量信息并生成长篇、详尽研究报告的能力。
* **信息来源的局限性与偏见：** 许多自动化服务可能依赖有限的网络来源，导致信息不全面或存在偏见，进而影响研究结果的客观性。

对这些不同问题的明确阐述表明，该项目的设计不仅仅局限于简单的网络信息抓取，而是将数据质量、报告篇幅和信息可靠性作为核心的设计考量 <sup>1</sup>。这种多方面的问题定义直接塑造了项目所需的功能和架构。例如，解决数据过时问题需要实时网络访问；克服 Token 限制需要复杂的文本分块和摘要策略；确保结果无偏见则需要广泛的来源聚合和信息筛选机制。


### **2.2. 项目目标与设计目标**

针对上述问题，GPT-Researcher 设定了清晰的项目目标和设计原则：



* **速度：** 将研究时间从数周缩短至数分钟 <sup>2</sup>。
* **准确性与可靠性：** 通过聚合多个（超过 20 个）信息来源，并结合 LLM 的处理能力，提供基于事实、客观的信息，同时减轻 LLM 固有的局限性 <sup>1</sup>。
* **深度与全面性：** 利用“深度研究”（Deep Research）等高级功能，生成超过 2000 词的详细报告 <sup>1</sup>。
* **灵活性与定制化：** 允许用户根据需求调整研究过程的各个方面，包括选择不同的 LLM、搜索引擎，以及整合本地文档进行混合研究 <sup>2</sup>。

同时追求速度和深度/准确性是一个显著的技术挑战。快速生成报告 <sup>2</sup> 与进行深入、全面、基于多源信息的准确研究 <sup>1</sup> 之间可能存在矛盾。这表明项目的架构必须采用高效的技术策略，例如异步处理、并行化的信息获取、有效的摘要算法，以及可能的分层研究方法（例如，先快速概览，再深入探索特定方面）来平衡这些需求。项目引入的多代理系统 <sup>1</sup> 很可能是应对这一挑战的关键设计决策，允许专门的代理并行或顺序工作，以提高效率和研究深度。


## **3. 系统架构与设计洞察**


### **3.1. 高层架构概览**

根据项目代码库的目录结构 <sup>1</sup>，可以推断出 GPT-Researcher 采用模块化的设计：



* **gpt_researcher:** 核心 Python 包，包含了主要的代理逻辑、信息处理模块、记忆管理、报告生成等功能。这是系统的核心引擎。
* **backend:** 包含 FastAPI 服务器代码 <sup>1</sup>，为核心 gpt_researcher 功能提供 API 接口。这使得 Web 应用或其他服务能够与研究代理进行交互。
* **frontend:** 存放用户界面代码，提供了轻量级（HTML/CSS/JS）和生产级（NextJS + Tailwind）两种选择 <sup>1</sup>。这为用户提供了不同的访问方式。
* **multi_agents:** 实现了高级的多代理研究功能，利用 LangGraph 进行工作流编排 <sup>1</sup>。这表明系统支持更复杂、可能带有状态的研究流程。
* **retrievers (推断位于 gpt_researcher 内部):** 负责获取数据的模块，包括执行网络搜索、网页抓取以及加载本地文件。
* **processors (推断位于 gpt_researcher 内部):** 负责清洗、摘要和过滤检索到的信息。
* **memory (推断位于 gpt_researcher 内部):** 在整个研究过程中维护上下文信息 <sup>1</sup>。
* **report (推断位于 gpt_researcher 内部):** 负责将处理后的信息综合成最终报告，并支持多种导出格式 <sup>1</sup>。

<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="684" height="730" viewBox="0 0 684 730" style="fill:none;stroke:none;fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><style class="text-font-style fontImports" data-font-family="Roboto">@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&amp;display=block');</style><g id="items" style="isolation: isolate"><g id="blend" style="mix-blend-mode: normal"><g id="g-root-ro_1hapqzs1dzzyfc-fill" data-item-order="-28800" transform="translate(242, 317)"><g id="ro_1hapqzs1dzzyfc-fill" stroke="none" fill="#cd6afb"><g><path d="M 34 10L 178 10C 178 10 202 10 202 34L 202 136C 202 136 202 160 178 160L 34 160C 34 160 10 160 10 136L 10 34C 10 34 10 10 34 10"></path></g></g></g><g id="g-root-ro_5vi7c1e05mgy-fill" data-item-order="-9720" transform="translate(394, 122)"><g id="ro_5vi7c1e05mgy-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 178 10C 178 10 190 10 190 22L 190 52C 190 52 190 64 178 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_v8m12g1e09v66-fill" data-item-order="-9072" transform="translate(482, 236)"><g id="ro_v8m12g1e09v66-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 166 10C 166 10 178 10 178 22L 178 52C 178 52 178 64 166 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_vb40ko1dzvrij-fill" data-item-order="-8424" transform="translate(38, 236)"><g id="ro_vb40ko1dzvrij-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 154 10C 154 10 166 10 166 22L 166 52C 166 52 166 64 154 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_qnsq941e0cnbg-fill" data-item-order="-7776" transform="translate(266, 572)"><g id="ro_qnsq941e0cnbg-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 142 10C 142 10 154 10 154 22L 154 52C 154 52 154 64 142 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_18hkq941dzud51-fill" data-item-order="-7776" transform="translate(138, 122)"><g id="ro_18hkq941dzud51-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 142 10C 142 10 154 10 154 22L 154 52C 154 52 154 64 142 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_hs5q081e047b8-fill" data-item-order="-7776" transform="translate(482, 422)"><g id="ro_hs5q081e047b8-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 142 10C 142 10 154 10 154 22L 154 52C 154 52 154 64 142 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_deu7e01dzyl8p-fill" data-item-order="-6480" transform="translate(74, 422)"><g id="ro_deu7e01dzyl8p-fill" stroke="none" fill="#cd6afb"><g><path d="M 22 10L 118 10C 118 10 130 10 130 22L 130 52C 130 52 130 64 118 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-tx_fastapi_91iig81e0e2h7-fill" data-item-order="0" transform="translate(90, 188)"><g id="tx_fastapi_91iig81e0e2h7-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14.73" y="33.5" dominant-baseline="ideographic">FastAPI 服务器</tspan></text></g></g></g><g id="g-root-cu_18itofc1dzyk93-fill" data-item-order="0" transform="translate(240, 176)"></g><g id="g-root-cu_qrjnxk1dzymmf-fill" data-item-order="0" transform="translate(418, 176)"></g><g id="g-root-tx_langgrap_1hgc0rs1e0e2a6-fill" data-item-order="0" transform="translate(442, 188)"><g id="tx_langgrap_1hgc0rs1e0e2a6-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12.99" y="33.5" dominant-baseline="ideographic">LangGraph 工作流</tspan></text></g></g></g><g id="g-root-cu_1hdu7l41dzylu0-fill" data-item-order="0" transform="translate(370, 149)"></g><g id="g-root-tx__1ursj541e0e0p8-fill" data-item-order="0" transform="translate(530, 488)"><g id="tx__1ursj541e0e0p8-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14" y="33.5" dominant-baseline="ideographic">轻量级选择</tspan></text></g></g></g><g id="g-root-tx__hz0xyg1e0e0p3-fill" data-item-order="0" transform="translate(14, 524)"><g id="tx__hz0xyg1e0e0p3-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="16" y="33.5" dominant-baseline="ideographic">多种导出格式</tspan></text></g></g></g><g id="g-root-cu_1cy0pgo1dzymmb-fill" data-item-order="0" transform="translate(194, 263)"></g><g id="g-root-tx__me7yzs1e0e32l-fill" data-item-order="0" transform="translate(314, 638)"><g id="tx__me7yzs1e0e32l-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14" y="33.5" dominant-baseline="ideographic">上下文维护</tspan></text></g></g></g><g id="g-root-cu_1cy0pgo1dzymme-fill" data-item-order="0" transform="translate(434, 263)"></g><g id="g-root-tx__1d0iinc1e0e32f-fill" data-item-order="0" transform="translate(62, 302)"><g id="tx__1d0iinc1e0e32f-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12" y="33.5" dominant-baseline="ideographic">网络搜索</tspan></text></g></g></g><g id="g-root-cu_qrjnxk1dzymmi-fill" data-item-order="0" transform="translate(152, 290)"></g><g id="g-root-cu_mccmw81dzyk91-fill" data-item-order="0" transform="translate(152, 290)"></g><g id="g-root-cu_90w4iw1dzyltz-fill" data-item-order="0" transform="translate(152, 290)"></g><g id="g-root-cu_4l2meg1dzymm9-fill" data-item-order="0" transform="translate(506, 290)"></g><g id="g-root-cu_4l2meg1dzymmc-fill" data-item-order="0" transform="translate(506, 290)"></g><g id="g-root-cu_1ur657s1dzyk26-fill" data-item-order="0" transform="translate(506, 290)"></g><g id="g-root-cu_3dp0o1dzymtm-fill" data-item-order="0" transform="translate(282, 149)"></g><g id="g-root-tx__zpohd41e0e1hm-fill" data-item-order="0" transform="translate(530, 302)"><g id="tx__zpohd41e0e1hm-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12" y="33.5" dominant-baseline="ideographic">数据清洗</tspan></text></g></g></g><g id="g-root-tx__1d0iinc1e0e32g-fill" data-item-order="0" transform="translate(62, 338)"><g id="tx__1d0iinc1e0e32g-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12" y="33.5" dominant-baseline="ideographic">网页抓取</tspan></text></g></g></g><g id="g-root-tx__zpohd41e0e1hn-fill" data-item-order="0" transform="translate(530, 338)"><g id="tx__zpohd41e0e1hn-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12" y="33.5" dominant-baseline="ideographic">摘要生成</tspan></text></g></g></g><g id="g-root-tx__18lbhm01e0e0ox-fill" data-item-order="0" transform="translate(14, 374)"><g id="tx__18lbhm01e0e0ox-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="16" y="33.5" dominant-baseline="ideographic">本地文件加载</tspan></text></g></g></g><g id="g-root-tx__v9uz8o1e0e29w-fill" data-item-order="0" transform="translate(530, 374)"><g id="tx__v9uz8o1e0e29w-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12" y="33.5" dominant-baseline="ideographic">信息过滤</tspan></text></g></g></g><g id="g-root-tx__1qbz10o1e0e1hh-fill" data-item-order="0" transform="translate(530, 524)"><g id="tx__1qbz10o1e0e1hh-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14" y="33.5" dominant-baseline="ideographic">生产级选择</tspan></text></g></g></g><g id="g-root-cu_18itofc1dzyk90-fill" data-item-order="0" transform="translate(194, 417)"></g><g id="g-root-cu_1ltnppk1dzyl1p-fill" data-item-order="0" transform="translate(434, 417)"></g><g id="g-root-tx__1lvj4yw1dzylmw-fill" data-item-order="0" transform="translate(254, 38)"><g id="tx__1lvj4yw1dzylmw-fill" stroke="none" fill="#484848"><g><text style="font: 25px Roboto, sans-serif; white-space: pre;" font-size="25px" font-family="Roboto, sans-serif"><tspan x="13" y="42.5" dominant-baseline="ideographic">研究系统架构</tspan></text></g></g></g><g id="g-root-cu_5vld41dzyk8w-fill" data-item-order="0" transform="translate(290, 626)"></g><g id="g-root-tx__me7yzs1e0e32m-fill" data-item-order="0" transform="translate(62, 488)"><g id="tx__me7yzs1e0e32m-fill" stroke="none" fill="#484848"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12" y="33.5" dominant-baseline="ideographic">报告综合</tspan></text></g></g></g><g id="g-root-cu_1qbcn3c1dzykuj-fill" data-item-order="0" transform="translate(152, 476)"></g><g id="g-root-cu_1qbcn3c1dzykum-fill" data-item-order="0" transform="translate(152, 476)"></g><g id="g-root-cu_18itofc1dzyk8x-fill" data-item-order="0" transform="translate(338, 467)"></g><g id="g-root-cu_v7d6201dzylu2-fill" data-item-order="0" transform="translate(506, 476)"></g><g id="g-root-cu_v7d6201dzylu5-fill" data-item-order="0" transform="translate(506, 476)"></g><g id="g-root-tx_multiage_qs61uw1e05mgw-fill" data-item-order="2000000000" transform="translate(442, 137)"><g id="tx_multiage_qs61uw1e05mgw-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="12.76" y="33.5" dominant-baseline="ideographic">multi_agents</tspan></text></g></g></g><g id="g-root-tx_retrieve_18ly1uw1dzvt3d-fill" data-item-order="2000000000" transform="translate(50, 251)"><g id="tx_retrieve_18ly1uw1dzvt3d-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="16.44" y="33.5" dominant-baseline="ideographic">retrievers</tspan></text></g></g></g><g id="g-root-ic_sign_146r0tk1dzvqpu-fill" data-item-order="2000000000" transform="translate(152, 248)"></g><g id="g-root-ic_sear_14491bc1e09udh-fill" data-item-order="2000000000" transform="translate(494, 248)"></g><g id="g-root-tx_processo_1hfpjoo1e09ssk-fill" data-item-order="2000000000" transform="translate(530, 251)"><g id="tx_processo_1hfpjoo1e09ssk-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14.28" y="33.5" dominant-baseline="ideographic">processors</tspan></text></g></g></g><g id="g-root-ic_sear_8vw8o81dzzymf-fill" data-item-order="2000000000" transform="translate(314, 341)"></g><g id="g-root-tx_gptresea_4o6wo81dzylty-fill" data-item-order="2000000000" transform="translate(266, 395)"><g id="tx_gptresea_4o6wo81dzylty-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="13.12" y="33.5" dominant-baseline="ideographic">gpt_researcher </tspan><tspan x="50.38" y="57.5" dominant-baseline="ideographic">核心库</tspan></text></g></g></g><g id="g-root-ic_robo_dhc0ko1e05kw1-fill" data-item-order="2000000000" transform="translate(406, 134)"></g><g id="g-root-tx_report_v5hqso1dzym1b-fill" data-item-order="2000000000" transform="translate(86, 437)"><g id="tx_report_v5hqso1dzym1b-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="13.18" y="33.5" dominant-baseline="ideographic">report</tspan></text></g></g></g><g id="g-root-ic_1_mah7mw1dzykg0-fill" data-item-order="2000000000" transform="translate(152, 434)"></g><g id="g-root-ic_gate_1cxe8dk1dzuccs-fill" data-item-order="2000000000" transform="translate(240, 134)"></g><g id="g-root-ic_2_v2zrag1e048w3-fill" data-item-order="2000000000" transform="translate(494, 434)"></g><g id="g-root-tx_frontend_1cu9rs81e046iy-fill" data-item-order="2000000000" transform="translate(530, 437)"><g id="tx_frontend_1cu9rs81e046iy-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14.27" y="33.5" dominant-baseline="ideographic">frontend</tspan></text></g></g></g><g id="g-root-tx_backend_1lserjc1dzuepv-fill" data-item-order="2000000000" transform="translate(150, 137)"><g id="tx_backend_1lserjc1dzuepv-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="14.27" y="33.5" dominant-baseline="ideographic">backend</tspan></text></g></g></g><g id="g-root-ic_1_zjfqi01e0cmir-fill" data-item-order="2000000000" transform="translate(278, 584)"></g><g id="g-root-tx_memory_1cu9rs81e0co3m-fill" data-item-order="2000000000" transform="translate(314, 587)"><g id="tx_memory_1cu9rs81e0co3m-fill" stroke="none" fill="#ffffff"><g><text style="font: 20px Roboto, sans-serif; white-space: pre;" font-size="20px" font-family="Roboto, sans-serif"><tspan x="15.25" y="33.5" dominant-baseline="ideographic">memory</tspan></text></g></g></g><g id="g-root-ro_1hapqzs1dzzyfc-stroke" data-item-order="-28800" transform="translate(242, 317)"><g id="ro_1hapqzs1dzzyfc-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 34 10L 178 10C 178 10 202 10 202 34L 202 136C 202 136 202 160 178 160L 34 160C 34 160 10 160 10 136L 10 34C 10 34 10 10 34 10"></path></g></g></g><g id="g-root-ro_5vi7c1e05mgy-stroke" data-item-order="-9720" transform="translate(394, 122)"><g id="ro_5vi7c1e05mgy-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 178 10C 178 10 190 10 190 22L 190 52C 190 52 190 64 178 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_v8m12g1e09v66-stroke" data-item-order="-9072" transform="translate(482, 236)"><g id="ro_v8m12g1e09v66-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 166 10C 166 10 178 10 178 22L 178 52C 178 52 178 64 166 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_vb40ko1dzvrij-stroke" data-item-order="-8424" transform="translate(38, 236)"><g id="ro_vb40ko1dzvrij-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 154 10C 154 10 166 10 166 22L 166 52C 166 52 166 64 154 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_qnsq941e0cnbg-stroke" data-item-order="-7776" transform="translate(266, 572)"><g id="ro_qnsq941e0cnbg-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 142 10C 142 10 154 10 154 22L 154 52C 154 52 154 64 142 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_18hkq941dzud51-stroke" data-item-order="-7776" transform="translate(138, 122)"><g id="ro_18hkq941dzud51-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 142 10C 142 10 154 10 154 22L 154 52C 154 52 154 64 142 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_hs5q081e047b8-stroke" data-item-order="-7776" transform="translate(482, 422)"><g id="ro_hs5q081e047b8-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 142 10C 142 10 154 10 154 22L 154 52C 154 52 154 64 142 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-ro_deu7e01dzyl8p-stroke" data-item-order="-6480" transform="translate(74, 422)"><g id="ro_deu7e01dzyl8p-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 22 10L 118 10C 118 10 130 10 130 22L 130 52C 130 52 130 64 118 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"></path></g></g></g><g id="g-root-tx_fastapi_91iig81e0e2h7-stroke" data-item-order="0" transform="translate(90, 188)"></g><g id="g-root-cu_18itofc1dzyk93-stroke" data-item-order="0" transform="translate(240, 176)"><g id="cu_18itofc1dzyk93-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 28 10L 28 13L 28 22C 27.999999 28.627417 22.627416 34 15.999999 34L 15.9 34L 10 34"></path></g></g></g><g id="g-root-cu_qrjnxk1dzymmf-stroke" data-item-order="0" transform="translate(418, 176)"><g id="cu_qrjnxk1dzymmf-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 13L 10 22C 10 28.627416 15.372583 33.999999 22 33.999999L 22.1 34L 28 34"></path></g></g></g><g id="g-root-tx_langgrap_1hgc0rs1e0e2a6-stroke" data-item-order="0" transform="translate(442, 188)"></g><g id="g-root-cu_1hdu7l41dzylu0-stroke" data-item-order="0" transform="translate(370, 149)"><g id="cu_1hdu7l41dzylu0-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 178L 10 157L 10 30.9C 10 19.357248 19.357248 10 30.899998 10L 31 10L 34 10"></path></g></g></g><g id="g-root-tx__1ursj541e0e0p8-stroke" data-item-order="0" transform="translate(530, 488)"></g><g id="g-root-tx__hz0xyg1e0e0p3-stroke" data-item-order="0" transform="translate(14, 524)"></g><g id="g-root-cu_1cy0pgo1dzymmb-stroke" data-item-order="0" transform="translate(194, 263)"><g id="cu_1cy0pgo1dzymmb-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 58 114L 55 114L 54.9 114C 43.357245 113.999995 33.999997 104.642746 33.999997 93.099996L 34 93L 34 30.9C 33.999998 19.357248 24.64275 10 13.1 10L 13 10L 10 10"></path></g></g></g><g id="g-root-tx__me7yzs1e0e32l-stroke" data-item-order="0" transform="translate(314, 638)"></g><g id="g-root-cu_1cy0pgo1dzymme-stroke" data-item-order="0" transform="translate(434, 263)"><g id="cu_1cy0pgo1dzymme-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 114L 13 114L 13.1 114C 24.642749 114.000006 33.999999 104.642757 33.999998 93.100005L 34 93L 34 30.9C 33.999999 19.357249 43.357248 10.000001 54.899999 10.000002L 55 10L 58 10"></path></g></g></g><g id="g-root-tx__1d0iinc1e0e32f-stroke" data-item-order="0" transform="translate(62, 302)"></g><g id="g-root-cu_qrjnxk1dzymmi-stroke" data-item-order="0" transform="translate(152, 290)"><g id="cu_qrjnxk1dzymmi-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 28 10L 28 22L 28 34L 19 34L 10 34"></path></g></g></g><g id="g-root-cu_mccmw81dzyk91-stroke" data-item-order="0" transform="translate(152, 290)"><g id="cu_mccmw81dzyk91-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 28 10L 28 40L 28 70L 19 70L 10 70"></path></g></g></g><g id="g-root-cu_90w4iw1dzyltz-stroke" data-item-order="0" transform="translate(152, 290)"><g id="cu_90w4iw1dzyltz-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 28 10L 28 22L 28 94C 28.000002 100.627415 22.627419 105.999998 16.000002 105.999998L 15.9 106L 10 106"></path></g></g></g><g id="g-root-cu_4l2meg1dzymm9-stroke" data-item-order="0" transform="translate(506, 290)"><g id="cu_4l2meg1dzymm9-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 22L 10 34L 19 34L 28 34"></path></g></g></g><g id="g-root-cu_4l2meg1dzymmc-stroke" data-item-order="0" transform="translate(506, 290)"><g id="cu_4l2meg1dzymmc-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 40L 10 70L 19 70L 28 70"></path></g></g></g><g id="g-root-cu_1ur657s1dzyk26-stroke" data-item-order="0" transform="translate(506, 290)"><g id="cu_1ur657s1dzyk26-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 22L 10 94C 10.000004 100.627423 15.372587 106.000006 22.000005 106.000005L 22.1 106L 28 106"></path></g></g></g><g id="g-root-cu_3dp0o1dzymtm-stroke" data-item-order="0" transform="translate(282, 149)"><g id="cu_3dp0o1dzymtm-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 34 178L 34 157L 34 30.9C 33.999998 19.357248 24.64275 10 13.1 10L 13 10L 10 10"></path></g></g></g><g id="g-root-tx__zpohd41e0e1hm-stroke" data-item-order="0" transform="translate(530, 302)"></g><g id="g-root-tx__1d0iinc1e0e32g-stroke" data-item-order="0" transform="translate(62, 338)"></g><g id="g-root-tx__zpohd41e0e1hn-stroke" data-item-order="0" transform="translate(530, 338)"></g><g id="g-root-tx__18lbhm01e0e0ox-stroke" data-item-order="0" transform="translate(14, 374)"></g><g id="g-root-tx__v9uz8o1e0e29w-stroke" data-item-order="0" transform="translate(530, 374)"></g><g id="g-root-tx__1qbz10o1e0e1hh-stroke" data-item-order="0" transform="translate(530, 524)"></g><g id="g-root-cu_18itofc1dzyk90-stroke" data-item-order="0" transform="translate(194, 417)"><g id="cu_18itofc1dzyk90-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 58 10L 55 10L 54.9 10C 50.611929 10.004962 45.995266 11.578824 41.700001 14.500001C 39.147207 16.234511 36.356002 20.403194 34.000002 26.000001C 31.644001 31.596807 28.852796 35.76549 26.300001 37.500001C 22.004737 40.421177 17.388073 41.995039 13.100001 42L 13 42L 10 42"></path></g></g></g><g id="g-root-cu_1ltnppk1dzyl1p-stroke" data-item-order="0" transform="translate(434, 417)"><g id="cu_1ltnppk1dzyl1p-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 13 10L 13.1 10C 17.388073 10.00496 22.004736 11.578822 26.300001 14.499999C 28.852796 16.234511 31.644001 20.403194 34.000002 26C 36.356002 31.596807 39.147208 35.76549 41.700003 37.500001C 45.995265 40.421176 50.611928 41.995038 54.900001 41.999998L 55 42L 58 42"></path></g></g></g><g id="g-root-tx__1lvj4yw1dzylmw-stroke" data-item-order="0" transform="translate(254, 38)"></g><g id="g-root-cu_5vld41dzyk8w-stroke" data-item-order="0" transform="translate(290, 626)"><g id="cu_5vld41dzyk8w-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 13L 10 22C 10 28.627416 15.372583 33.999999 22 33.999999L 22.1 34L 28 34"></path></g></g></g><g id="g-root-tx__me7yzs1e0e32m-stroke" data-item-order="0" transform="translate(62, 488)"></g><g id="g-root-cu_1qbcn3c1dzykuj-stroke" data-item-order="0" transform="translate(152, 476)"><g id="cu_1qbcn3c1dzykuj-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 28 10L 28 22L 28 34L 19 34L 10 34"></path></g></g></g><g id="g-root-cu_1qbcn3c1dzykum-stroke" data-item-order="0" transform="translate(152, 476)"><g id="cu_1qbcn3c1dzykum-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 28 10L 28 17.5L 28 58C 27.999999 64.627415 22.627416 69.999998 16 69.999998L 15.9 70L 10 70"></path></g></g></g><g id="g-root-cu_18itofc1dzyk8x-stroke" data-item-order="0" transform="translate(338, 467)"><g id="cu_18itofc1dzyk8x-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 62.5L 10 115"></path></g></g></g><g id="g-root-cu_v7d6201dzylu2-stroke" data-item-order="0" transform="translate(506, 476)"><g id="cu_v7d6201dzylu2-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 22L 10 34L 19 34L 28 34"></path></g></g></g><g id="g-root-cu_v7d6201dzylu5-stroke" data-item-order="0" transform="translate(506, 476)"><g id="cu_v7d6201dzylu5-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0"><g><path d="M 10 10L 10 17.5L 10 58C 10.000002 64.627417 15.372585 70 22.000002 69.999999L 22.1 70L 28 70"></path></g></g></g><g id="g-root-tx_multiage_qs61uw1e05mgw-stroke" data-item-order="2000000000" transform="translate(442, 137)"></g><g id="g-root-tx_retrieve_18ly1uw1dzvt3d-stroke" data-item-order="2000000000" transform="translate(50, 251)"></g><g id="g-root-ic_sign_146r0tk1dzvqpu-stroke" data-item-order="2000000000" transform="translate(152, 248)"><g id="ic_sign_146r0tk1dzvqpu-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 24.41375 39.375L 20.75 34.178749C 20.279526 33.515373 19.51577 33.122307 18.702499 33.125L 14.375 33.125C 12.303932 33.125 10.625 31.446068 10.625 29.375L 10.625 27.5C 10.625 26.464466 11.464466 25.625 12.5 25.625L 14.375 25.625C 15.065356 25.625 15.625 25.065357 15.625 24.375L 15.625 23.125C 15.625 21.744287 16.744287 20.625 18.125 20.625L 23.125 20.625L 23.125 15.967501C 23.125187 15.745843 23.242762 15.540867 23.434 15.428797C 23.625238 15.316728 23.861528 15.314332 24.055 15.4225C 25.5275 16.247499 28.313749 18.46875 29.135 23.717501L 39.375 31.875M 22.359999 36.467499L 32.46125 26.366251M 35.2225 28.56625L 24.41375 39.375M 18.75 24.05875C 18.922588 24.05875 19.0625 24.198662 19.0625 24.37125M 18.4375 24.375C 18.4375 24.202412 18.577412 24.0625 18.75 24.0625M 18.75 24.68375C 18.577412 24.68375 18.4375 24.543839 18.4375 24.37125M 19.0625 24.375C 19.0625 24.547588 18.922588 24.6875 18.75 24.6875M 39.365002 13.14125C 35.402874 9.787119 29.597126 9.787119 25.635 13.14125M 34.963753 19.942499C 33.601563 19.280462 32.030376 19.193975 30.60375 19.702499M 37.195 16.5C 34.614227 14.673689 31.208803 14.508903 28.463751 16.077499"></path></g></g></g><g id="g-root-ic_sear_14491bc1e09udh-stroke" data-item-order="2000000000" transform="translate(494, 248)"><g id="ic_sear_14491bc1e09udh-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 31.97875 31.93125L 39.423748 39.375M 10.625 23.106249C 10.625 30.009808 16.221441 35.606251 23.125 35.606251C 30.028561 35.606251 35.625 30.009808 35.625 23.106251C 35.625 16.20269 30.028561 10.60625 23.125 10.60625C 16.221441 10.60625 10.625 16.20269 10.625 23.106251M 19.42375 18.125L 26.92375 18.125C 26.92375 18.125 28.17375 18.125 28.17375 19.375L 28.17375 26.875C 28.17375 26.875 28.17375 28.125 26.92375 28.125L 19.42375 28.125C 19.42375 28.125 18.17375 28.125 18.17375 26.875L 18.17375 19.375C 18.17375 19.375 18.17375 18.125 19.42375 18.125M 25.67375 28.125L 25.67375 31.25M 25.67375 15L 25.67375 18.125M 20.67375 28.125L 20.67375 31.25M 20.67375 15L 20.67375 18.125M 28.17375 25.625L 31.29875 25.625M 18.17375 20.625L 15.04875 20.625M 31.29875 20.625L 28.17375 20.625M 18.17375 25.625L 15.04875 25.625M 25.67375 25.625L 23.17375 25.625"></path></g></g></g><g id="g-root-tx_processo_1hfpjoo1e09ssk-stroke" data-item-order="2000000000" transform="translate(530, 251)"></g><g id="g-root-ic_sear_8vw8o81dzzymf-stroke" data-item-order="2000000000" transform="translate(314, 341)"><g id="ic_sear_8vw8o81dzzymf-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 11.042 19.001999C 11.042 23.420277 19.54859 27.002001 30.042 27.002001C 40.535408 27.002001 49.042 23.420277 49.042 19.001999C 49.042 14.583722 40.535408 11.002 30.042 11.002C 19.54859 11.002 11.042 14.583722 11.042 19.001999ZM 33.042 34.900002C 32.063999 34.966 31.062 35.001999 30.042 35.001999C 19.549999 35.001999 11.042 31.422001 11.042 27.002001M 30.042 44C 19.549999 44 11.042 40.419998 11.042 36M 30.042 53C 19.549999 53 11.042 49.419998 11.042 45L 11.042 19M 49.042 19.001999L 49.042 30.002001M 35.040001 44.060001C 35.040001 49.062595 39.095406 53.118 44.098 53.118C 49.100594 53.118 53.155998 49.062595 53.155998 44.059998C 53.155998 39.057404 49.100594 35.001999 44.098 35.001999C 39.095406 35.001999 35.040001 39.057404 35.040001 44.059998ZM 57.040001 57.001999L 50.543999 50.506001"></path></g></g></g><g id="g-root-tx_gptresea_4o6wo81dzylty-stroke" data-item-order="2000000000" transform="translate(266, 395)"></g><g id="g-root-ic_robo_dhc0ko1e05kw1-stroke" data-item-order="2000000000" transform="translate(406, 134)"><g id="ic_robo_dhc0ko1e05kw1-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 25.731625 39.169624L 12.896225 39.169624C 11.820325 39.169624 10.878906 38.228249 10.878906 37.152374L 10.878906 12.8474C 10.878906 11.7715 11.820325 10.830077 12.896225 10.830077L 37.104126 10.830077C 38.18 10.830077 39.121376 11.7715 39.121376 12.8474L 39.121376 28.508499M 10.878906 18.388676L 39.121376 18.388676M 25.005749 15.88555C 25.693876 15.88555 26.251751 15.3277 26.251751 14.63955C 26.251751 13.951412 25.693876 13.39355 25.005749 13.39355C 24.317625 13.39355 23.75975 13.951412 23.75975 14.63955C 23.75975 15.3277 24.317625 15.88555 25.005749 15.88555ZM 20.013088 15.88555C 20.701239 15.88555 21.259087 15.3277 21.259087 14.63955C 21.259087 13.951412 20.701239 13.39355 20.013088 13.39355C 19.324938 13.39355 18.767088 13.951412 18.767088 14.63955C 18.767088 15.3277 19.324938 15.88555 20.013088 15.88555ZM 15.02285 15.88555C 15.711 15.88555 16.26885 15.3277 16.26885 14.63955C 16.26885 13.951412 15.711 13.39355 15.02285 13.39355C 14.334713 13.39355 13.77685 13.951412 13.77685 14.63955C 13.77685 15.3277 14.334713 15.88555 15.02285 15.88555ZM 31.138748 31.016251L 36.62125 31.016251C 36.62125 31.016251 39.12125 31.016251 39.12125 33.516251L 39.12125 36.671249C 39.12125 36.671249 39.12125 39.171249 36.62125 39.171249L 31.138748 39.171249C 31.138748 39.171249 28.63875 39.171249 28.63875 36.671249L 28.63875 33.516251C 28.63875 33.516251 28.63875 31.016251 31.138748 31.016251M 10 10M 33.879375 27.799126L 33.879375 31.015625M 10 10M 32.161873 34.368126L 32.161873 35.820251M 10 10M 35.598125 34.368126L 35.598125 35.820251"></path></g></g></g><g id="g-root-tx_report_v5hqso1dzym1b-stroke" data-item-order="2000000000" transform="translate(86, 437)"></g><g id="g-root-ic_1_mah7mw1dzykg0-stroke" data-item-order="2000000000" transform="translate(152, 434)"><g id="ic_1_mah7mw1dzykg0-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 12.67625 30.309999C 12.67625 32.208477 14.215271 33.747501 16.11375 33.747501C 18.01223 33.747501 19.55125 32.208477 19.55125 30.310001C 19.55125 28.411522 18.01223 26.872499 16.11375 26.872499C 14.215271 26.872499 12.67625 28.411522 12.67625 30.310001M 21.588749 39.375C 21.010429 36.816639 18.737286 34.999985 16.114374 34.999985C 13.491464 34.999985 11.218319 36.816639 10.64 39.374996ZM 24.702499 28.125C 25.423939 24.934647 28.199066 22.627167 31.467499 22.499998C 31.65625 22.4925 31.842501 22.4925 32.03125 22.5C 35.510414 22.364153 38.591591 24.729033 39.360001 28.125ZM 27.03125 15.625C 27.03125 18.386423 29.269827 20.625 32.03125 20.625C 34.792675 20.625 37.03125 18.386423 37.03125 15.625C 37.03125 12.863576 34.792675 10.625 32.03125 10.625C 29.269827 10.625 27.03125 12.863576 27.03125 15.625M 36.689999 14.95875C 35.880287 15.404568 34.969288 15.63404 34.045002 15.625001C 31.721123 15.629987 29.59306 14.324129 28.545 12.25M 32.03125 25L 32.03125 26.875M 26.264999 39.375L 28.764999 39.375C 31.526424 39.375 33.764999 37.136425 33.764999 34.375L 33.764999 31.25M 30.639999 34.375L 33.764999 31.25L 36.889999 34.375M 13.14 23.125L 13.14 20.625C 13.14 17.863577 15.378576 15.625 18.139999 15.625L 21.889999 15.625M 18.764999 18.75L 21.889999 15.625L 18.764999 12.5"></path></g></g></g><g id="g-root-ic_gate_1cxe8dk1dzuccs-stroke" data-item-order="2000000000" transform="translate(240, 134)"><g id="ic_gate_1cxe8dk1dzuccs-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 31.5625 36.5625C 31.5625 37.9375 30.4375 39.0625 29.0625 39.0625L 15.3125 39.0625C 13.9375 39.0625 12.8125 37.9375 12.8125 36.5625L 12.8125 13.4375C 12.8125 12.0625 13.9375 10.9375 15.3125 10.9375L 29.0625 10.9375C 30.4375 10.9375 31.5625 12.0625 31.5625 13.4375L 31.5625 21.437489M 10.9375 16.5625L 22.1875 16.5625M 31.5625 16.5625L 39.0625 16.5625M 10 10M 35.3125 12.8125L 39.0625 16.5625L 35.3125 20.3125M 10 10M 35.3125 25L 39.0625 25M 39.0625 32.5L 35.3125 32.5M 10 10M 37.1875 25L 37.1875 32.5M 10 10M 17.937925 32.5L 20.240288 25.592876C 20.358313 25.238874 20.689688 25 21.062925 25L 21.062925 25C 21.436174 25 21.767538 25.238874 21.885574 25.592876L 24.187874 32.5M 18.771263 30L 23.354624 30M 10 10M 27.25 32.5L 27.25 29.375M 27.25 29.375L 27.25 25L 30.375 25C 31.410501 25 32.25 25.8395 32.25 26.875L 32.25 27.5C 32.25 28.5355 31.410501 29.375 30.375 29.375L 27.25 29.375Z"></path></g></g></g><g id="g-root-ic_2_v2zrag1e048w3-stroke" data-item-order="2000000000" transform="translate(494, 434)"><g id="ic_2_v2zrag1e048w3-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 12.142857 14.285714L 37.857143 14.285714C 37.857143 14.285714 38.92857 14.285714 38.92857 15.357142L 38.92857 32.5C 38.92857 32.5 38.92857 33.571426 37.857143 33.571426L 12.142857 33.571426C 12.142857 33.571426 11.071428 33.571426 11.071428 32.5L 11.071428 15.357142C 11.071428 15.357142 11.071428 14.285714 12.142857 14.285714M 22.857143 33.571426L 20.714285 38.92857M 27.142857 33.571426L 29.285713 38.92857M 18.571428 38.92857L 31.42857 38.92857M 26.071428 14.285714L 26.071428 33.571426M 16.428572 20.714285L 20.714285 20.714285M 16.428572 27.142857L 18.571428 27.142857M 26.071428 25L 28.664286 22.857143C 30.249554 21.545429 32.543301 21.545429 34.128571 22.857143L 38.92857 27.142857"></path></g></g></g><g id="g-root-tx_frontend_1cu9rs81e046iy-stroke" data-item-order="2000000000" transform="translate(530, 437)"></g><g id="g-root-tx_backend_1lserjc1dzuepv-stroke" data-item-order="2000000000" transform="translate(150, 137)"></g><g id="g-root-ic_1_zjfqi01e0cmir-stroke" data-item-order="2000000000" transform="translate(278, 584)"><g id="ic_1_zjfqi01e0cmir-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ffffff" stroke-width="2"><g><path d="M 39.453751 18.709999L 18.790001 39.375L 10.70375 31.289999L 19.6875 22.305L 21.035 23.6525C 21.782251 24.380579 22.975971 24.372684 23.713528 23.634785C 24.451084 22.896887 24.458426 21.703163 23.73 20.956249L 22.383749 19.610001L 31.366251 10.625ZM 17.441111 32.635998L 21.03491 29.043829L 23.28035 31.290285L 19.686548 34.882458ZM 29.121876 20.957211L 32.715744 17.363342L 34.961693 19.609289L 31.367825 23.203159ZM 12.97 29.065001L 14.745 30.84M 15.216249 26.817501L 16.991249 28.59375M 17.4625 24.5725L 19.237499 26.3475M 24.62875 17.362499L 26.425001 19.16M 26.875 15.1175L 28.671249 16.91375M 29.12125 12.87125L 30.9175 14.6675"></path></g></g></g><g id="g-root-tx_memory_1cu9rs81e0co3m-stroke" data-item-order="2000000000" transform="translate(314, 587)"></g></g></g><path id="wdcy9601ekemff" d="M65.283 12.757a.35.35 0 0 0 .584.157l5.203-5.141-6.183 3.523.396 1.461zm-2.216-11.7a.35.35 0 0 0-.522.305v3.111l3.276-1.868-2.754-1.548zm3.728 2.105l-4.25 2.421v2.445l6.391-3.644-2.141-1.222zm4.708 3.303a.35.35 0 0 0 0-.609l-1.592-.9-7.365 4.199v1.782a.35.35 0 0 0 .523.305l8.435-4.777z M44.542 2.513c0-.433.355-.783.792-.783s.792.35.792.783-.355.783-.792.783-.792-.35-.792-.783zm59.171 0c0-.433.355-.783.792-.783s.792.35.792.783-.355.783-.792.783-.792-.35-.792-.783zm-85.951 7.636h-1.27v-.487c-.276.201-.864.609-1.881.609-1.202 0-2.274-.794-2.137-2.078.118-1.106 1.153-1.584 1.848-1.727l2.17-.345c0-.539-.29-.956-1.064-1.006s-1.21.305-1.571 1.017l-1.124-.605c1.218-2.631 5.029-1.764 5.029.414v4.207zm-1.27-2.86c.006.396-.062 1.112-.819 1.59-.587.37-1.841.299-1.903-.395-.049-.555.461-.791.906-.898l1.816-.297zm72.662 2.86h-1.27v-.487c-.276.201-.864.609-1.881.609-1.202 0-2.274-.794-2.137-2.078.118-1.106 1.153-1.584 1.848-1.727l2.17-.345c0-.539-.29-.956-1.064-1.006s-1.21.305-1.571 1.017l-1.124-.605c1.218-2.631 5.029-1.764 5.029.414v4.207zm-1.27-2.86c.006.396-.062 1.112-.82 1.59-.587.37-1.841.299-1.903-.395-.049-.555.461-.791.906-.898l1.816-.297zM99.096 10.149H97.85v-8.45h1.246v4.895l2.68-2.559h1.738l-2.633 2.535 2.715 3.578h-1.556l-2.077-2.707-.867.844v1.863zm6.053-6.114h-1.255v6.113h1.255V4.035zm-59.2 0h-1.255v6.113h1.255V4.035zm5.584 6.113V1.697h1.255v2.695c.361-.346 1-.485 1.47-.485 1.452 0 2.477 1.082 2.457 2.448v3.792h-1.27v-3.68c0-.408-.214-1.339-1.315-1.339-.968 0-1.342.756-1.342 1.339v3.681h-1.255zm-4.76-4.894V4.039h.621a.45.45 0 0 0 .45-.45v-.855h1.251v1.305h1.309v1.215h-1.309v3.109c0 .293.105.664.648.664.365 0 .531-.035.736-.07v1.137s-.361.113-.857.113c-1.398 0-1.777-1.051-1.777-1.788V5.254h-1.071zM36.528 4.039h-1.394l2.191 6.106h1.125l1.234-3.918 1.238 3.918h1.129l2.188-6.106h-1.383l-1.359 3.93-1.256-3.93h-1.124l-1.242 3.957-1.348-3.957zM26.212 7.141c-.02 1.566 1.187 3.129 3.223 3.129 1.566 0 2.383-.918 2.734-1.719L31.172 8c-.315.399-.801 1.094-1.738 1.094-1.145 0-1.825-.781-1.891-1.52h4.625c.074-.284.148-.995-.03-1.559-.336-1.064-1.221-2.102-2.839-2.102s-3.088 1.152-3.088 3.227zm1.363-.75h3.348c-.055-.43-.566-1.301-1.623-1.301a1.79 1.79 0 0 0-1.725 1.301zm-8.758.75c.038 1.758 1.277 3.133 3.145 3.133 1.074 0 1.723-.477 1.961-.672v.547h1.242V1.703h-1.258v2.888c-.414-.36-1.062-.68-1.93-.68-1.91 0-3.198 1.473-3.16 3.23zm1.309-.08c0 1.119.723 1.978 1.836 1.978a1.88 1.88 0 0 0 1.94-1.904c0-1.371-1.011-1.99-1.972-1.99s-1.805.798-1.805 1.916zm76.683-.028C96.771 5.275 95.532 3.9 93.664 3.9c-1.074 0-1.723.477-1.961.672v-.547h-1.242v8.22h1.258V9.583c.414.36 1.063.68 1.93.68 1.91 0 3.198-1.473 3.16-3.23zm-1.309.08c0-1.119-.723-1.978-1.836-1.978a1.88 1.88 0 0 0-1.94 1.904c0 1.371 1.011 1.99 1.972 1.99S95.5 8.231 95.5 7.113zM106.441 10.173V4.036h1.254v.382c.361-.346 1-.485 1.47-.485 1.452 0 2.477 1.082 2.457 2.448v3.792h-1.27V6.492c0-.408-.214-1.339-1.315-1.339-.969 0-1.342.756-1.342 1.339v3.681h-1.254zm-30.383-.021V1.824h1.084l4.215 5.777V1.824h1.32v8.328h-1.094l-4.207-5.796v5.796h-1.319zM5.24 10.149H4V2.377h1.014l2.664 3.597 2.654-3.592h1.03v7.766h-1.256V4.762L7.678 8.068 5.24 4.742v5.407z" transform="translate(548, 696)" fill="#80808088" stroke="none"></path></svg>


### **3.2. 核心组件及其职责**



* **Orchestrator (位于 gpt_researcher):** 管理整个研究流程，调用其他组件。很可能是核心的 GPTResearcher 类或类似的管理单元。
* **Search/Scraping Agents:** 通过选定的搜索引擎（如 Google, Bing, Tavily, DuckDuckGo <sup>2</sup>）执行网络搜索，并使用 requests, BeautifulSoup, selenium, playwright 等库抓取网页内容 <sup>1</sup>。能够处理动态 JavaScript 内容 <sup>1</sup>。
* **Data Processing/Filtering:** 清理 HTML，提取相关文本，可能使用 LLM 或其他技术（如 tiktoken <sup>1</sup>）进行信息摘要或分块。筛选相关图片 <sup>1</sup>。
* **Synthesis/Report Generation:** 利用 LLM（通过 openai 库或 langchain 封装 <sup>1</sup>）将处理过的信息综合成连贯的报告，管理上下文并克服 Token 限制 <sup>1</sup>。将报告格式化为 PDF, Word, Markdown 等多种格式 <sup>1</sup>。
* **Multi-Agent Coordinator (位于 multi_agents):** 使用 LangGraph <sup>1</sup> 定义和执行涉及多个专门 AI 代理的复杂工作流，以实现更深入或结构化的研究。


### **3.3. 设计哲学**



* **模块化:** 目录结构 <sup>1</sup> 表明采用了模块化设计，允许方便地替换或扩展组件（如抓取器、LLM 提供商、搜索引擎）。
* **基于代理的方法:** 核心概念围绕一个自主代理执行研究任务。引入 multi_agents <sup>1</sup> 表明向更复杂的、基于 LangGraph 的协作代理系统演进。
* **灵活性与可配置性:** 强调用户可以选择关键组件（如 LLM 和搜索引擎 <sup>2</sup>），表明设计优先考虑适应性。.env.example 文件 <sup>1</sup> 也印证了这一点。
* **混合数据处理:** 明确支持网络资源和本地文档 <sup>1</sup>，表明设计目标是整合不同类型的信息源。
* **可观测性:** 大量 opentelemetry 依赖项的存在 <sup>1</sup> 强烈暗示设计上关注监控和调试，这对于复杂的 AI 系统至关重要。

从单一代理模型演进到使用 LangGraph 的多代理系统 <sup>1</sup>，代表了设计上的一个重要转变。LangGraph 专为创建有状态的多代理应用而设计，允许将工作流定义为图形。这相比简单的单体代理循环，是一种更结构化、有状态、可能更可靠的复杂任务执行方式。这表明设计者认识到单一代理模型在进行深度研究时的局限性，并采用了一个能够更好地进行流程控制、状态管理和代理协作的框架，从而可能实现更鲁棒和可定制的研究策略。


### **3.4. 数据流 (概念性描述)**

一个典型的研究任务流程可能如下：



1. **用户输入:** 通过命令行 (cli.py <sup>1</sup>)、前端 (<sup>1</sup>) 或 API (backend <sup>1</sup>) 接收用户查询和配置。
2. **任务规划:** Orchestrator (或 Planner Agent) 解析查询，生成具体的搜索策略或子问题。
3. **信息获取:** Search/Scraping 组件并行地向选定的搜索引擎 <sup>2</sup> 发起查询，并抓取排名靠前的结果 (可能超过 20 个来源 <sup>1</sup>)。根据需要使用合适的抓取器（静态/动态 <sup>1</sup>）。同时加载指定的本地文件 <sup>1</sup>。
4. **内容处理:** Processing 组件从抓取的 HTML 或文档中提取相关内容，可能使用 LLM 进行相关性评估和噪声过滤。对长文本进行摘要或分块 (tiktoken <sup>1</sup>)。处理和筛选图片 <sup>1</sup>。
5. **上下文维护:** 在 Memory 组件中保存和更新研究过程中的关键信息 <sup>1</sup>。
6. **信息综合:** Synthesis 组件将经过处理和组织的信息（可能按子主题分类）提供给 LLM。
7. **报告生成:** LLM 生成结构化的研究报告，包含引用和来源信息。通过迭代生成或摘要等方式处理潜在的长度限制 <sup>1</sup>。
8. **格式化与导出:** Report 组件将生成的报告转换为用户所需的格式 (PDF, DOCX, MD 等 <sup>1</sup>)。

*注意：在多代理模式下，此流程将由 LangGraph 图进行编排，可能涉及代理之间的循环或基于中间状态的条件转换。*


## **4. 底层技术栈**

GPT-Researcher 建立在一套现代化的技术栈之上，旨在实现其强大的研究自动化能力。


### **4.1. 核心后端与编排**



* **编程语言:** Python (由 .py 文件、.python-version, requirements.txt, pyproject.toml 等文件明确指示 <sup>1</sup>)。
* **API 框架:** FastAPI (出现在 requirements.txt <sup>1</sup> 中，很可能用于 backend 目录 <sup>1</sup>)，通常搭配 Uvicorn 服务器运行 <sup>1</sup>。
* **AI 编排/框架:** LangChain (在依赖项中占据重要位置 <sup>1</sup>) 和 LangGraph (特别提及用于多代理系统 <sup>1</sup>，并存在 langgraph.json 文件 <sup>1</sup>)。这些框架用于构建和管理 AI 代理及工作流。


### **4.2. 数据获取与处理**



* **网络抓取:** 使用 requests 和 beautifulsoup4 处理静态 HTML 内容；使用 selenium 和 playwright 处理需要执行 JavaScript 的动态网页 <sup>1</sup>。aiohttp 的存在表明支持异步抓取 <sup>1</sup>。
* **文档加载:** pypdf, docx2txt, python-pptx, pandas (用于 CSV/Excel) 等库表明支持加载多种本地文件格式 <sup>1</sup>。
* **文本处理:** tiktoken 用于计算和管理 Token 数量，对于与 LLM 交互至关重要 <sup>1</sup>。nltk 可能用于更高级的自然语言处理任务 <sup>1</sup>。Markdown 库用于处理 Markdown 格式内容 <sup>1</sup>。


### **4.3. AI 与外部服务**



* **LLM 集成:** openai 库是核心依赖之一 <sup>1</sup>。官方文档提到支持 Anthropic, Groq, Llama 3, Hugging Face 等多种模型，这通常通过 LangChain 的封装层实现，提供了灵活性 <sup>2</sup>。
* **搜索引擎集成:** tavily-python 被列为依赖 <sup>1</sup>。文档确认支持 Google, Bing, DuckDuckGo 等 <sup>2</sup>，这些集成可能通过 LangChain 或自定义适配器完成。


### **4.4. 前端**



* 提供多种用户界面选项：一个轻量级的 HTML/CSS/JS 版本和一个功能更完善、适合生产环境的 NextJS + Tailwind 版本 <sup>1</sup>。streamlit 和 streamlit-chat 的存在 <sup>1</sup> 暗示可能还存在一个基于 Streamlit 的交互式演示或原型界面。


### **4.5. 依赖与环境管理**



* 项目同时包含 requirements.txt 和 pyproject.toml / poetry.toml <sup>1</sup>，表明可能同时支持使用 pip 和 Poetry 进行依赖管理。
* 提供 Docker 支持 (Dockerfile, docker-compose.yml, .dockerignore <sup>1</sup>)，便于容器化部署和环境一致性。


### **4.6. 可观测性**



* 广泛使用 opentelemetry-* 相关包 <sup>1</sup>，用于对 FastAPI 应用、HTTP 请求、数据库交互等进行埋点和追踪。这对于监控复杂工作流的性能和调试问题非常有价值，是系统迈向生产成熟度的重要标志。

综合来看，GPT-Researcher 的技术选型体现了现代 Python 应用开发的趋势，有效结合了流行的 AI 框架（LangChain, LangGraph）、健壮的网络技术（FastAPI, Selenium/Playwright），并高度重视灵活性（支持多种 LLM 和搜索引擎）和运维成熟度（Docker, OpenTelemetry）。FastAPI 提供了高性能的 API 接口 <sup>1</sup>，LangChain/LangGraph 负责复杂的 AI 逻辑编排 <sup>1</sup>，Selenium/Playwright 保证了对现代网页的抓取能力 <sup>1</sup>，多种前端选项满足不同用户需求 <sup>1</sup>，Docker 简化了部署 <sup>1</sup>，而 OpenTelemetry 则为系统的稳定运行提供了保障 <sup>1</sup>。这些技术的组合表明项目不仅是实验性的，而且考虑到了在实际场景中可靠部署和集成的需求。

**技术栈摘要表**
| **类别**       | **关键技术**                             | **在项目中的作用**                             |
|----------------|------------------------------------------|------------------------------------------------|
| 后端框架       | Python / FastAPI                        | 提供 API 接口，处理请求                        |
| AI 编排        | Python / LangChain / LangGraph         | 管理研究工作流、代理交互、与 LLM/工具集成     |
| 网络抓取       | requests / beautifulsoup4 / selenium / playwright | 从网页提取静态和动态内容                      |
| LLM 接口       | openai / LangChain 封装                | 与大型语言模型（如 OpenAI, Anthropic 等）交互 |
| 搜索接口       | tavily-python / LangChain 封装         | 查询搜索引擎（如 Tavily, Google, Bing 等）    |
| 文档处理       | pypdf / docx2txt / python-pptx / pandas | 加载和解析本地文件（PDF, Word, PPT, CSV, Excel, MD 等） |
| 前端           | HTML/CSS/JS / NextJS+Tailwind / Streamlit | 提供用户交互界面                              |
| 容器化         | Docker                                   | 打包应用及其依赖，简化部署                    |
| 可观测性       | OpenTelemetry                            | 监控应用性能，追踪请求链路，便于调试和运维    |



<svg id="mermaid-svg" width="100%" xmlns="http://www.w3.org/2000/svg" class="flowchart" style="max-width: 400px;" viewBox="0 0 400 740" role="graphics-document document" aria-roledescription="flowchart-v2" xmlns:xlink="http://www.w3.org/1999/xlink"><style xmlns="http://www.w3.org/1999/xhtml">@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css");</style><style>#mermaid-svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#333;}#mermaid-svg .error-icon{fill:#552222;}#mermaid-svg .error-text{fill:#552222;stroke:#552222;}#mermaid-svg .edge-thickness-normal{stroke-width:1px;}#mermaid-svg .edge-thickness-thick{stroke-width:3.5px;}#mermaid-svg .edge-pattern-solid{stroke-dasharray:0;}#mermaid-svg .edge-thickness-invisible{stroke-width:0;fill:none;}#mermaid-svg .edge-pattern-dashed{stroke-dasharray:3;}#mermaid-svg .edge-pattern-dotted{stroke-dasharray:2;}#mermaid-svg .marker{fill:#333333;stroke:#333333;}#mermaid-svg .marker.cross{stroke:#333333;}#mermaid-svg svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;}#mermaid-svg p{margin:0;}#mermaid-svg .label{font-family:"trebuchet ms",verdana,arial,sans-serif;color:#333;}#mermaid-svg .cluster-label text{fill:#333;}#mermaid-svg .cluster-label span{color:#333;}#mermaid-svg .cluster-label span p{background-color:transparent;}#mermaid-svg .label text,#mermaid-svg span{fill:#333;color:#333;}#mermaid-svg .node rect,#mermaid-svg .node circle,#mermaid-svg .node ellipse,#mermaid-svg .node polygon,#mermaid-svg .node path{fill:#ECECFF;stroke:#9370DB;stroke-width:1px;}#mermaid-svg .rough-node .label text,#mermaid-svg .node .label text,#mermaid-svg .image-shape .label,#mermaid-svg .icon-shape .label{text-anchor:middle;}#mermaid-svg .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#mermaid-svg .rough-node .label,#mermaid-svg .node .label,#mermaid-svg .image-shape .label,#mermaid-svg .icon-shape .label{text-align:center;}#mermaid-svg .node.clickable{cursor:pointer;}#mermaid-svg .root .anchor path{fill:#333333!important;stroke-width:0;stroke:#333333;}#mermaid-svg .arrowheadPath{fill:#333333;}#mermaid-svg .edgePath .path{stroke:#333333;stroke-width:2.0px;}#mermaid-svg .flowchart-link{stroke:#333333;fill:none;}#mermaid-svg .edgeLabel{background-color:rgba(232,232,232, 0.8);text-align:center;}#mermaid-svg .edgeLabel p{background-color:rgba(232,232,232, 0.8);}#mermaid-svg .edgeLabel rect{opacity:0.5;background-color:rgba(232,232,232, 0.8);fill:rgba(232,232,232, 0.8);}#mermaid-svg .labelBkg{background-color:rgba(232, 232, 232, 0.5);}#mermaid-svg .cluster rect{fill:#ffffde;stroke:#aaaa33;stroke-width:1px;}#mermaid-svg .cluster text{fill:#333;}#mermaid-svg .cluster span{color:#333;}#mermaid-svg div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:12px;background:hsl(80, 100%, 96.2745098039%);border:1px solid #aaaa33;border-radius:2px;pointer-events:none;z-index:100;}#mermaid-svg .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#333;}#mermaid-svg rect.text{fill:none;stroke-width:0;}#mermaid-svg .icon-shape,#mermaid-svg .image-shape{background-color:rgba(232,232,232, 0.8);text-align:center;}#mermaid-svg .icon-shape p,#mermaid-svg .image-shape p{background-color:rgba(232,232,232, 0.8);padding:2px;}#mermaid-svg .icon-shape rect,#mermaid-svg .image-shape rect{opacity:0.5;background-color:rgba(232,232,232, 0.8);fill:rgba(232,232,232, 0.8);}#mermaid-svg :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}</style><g><marker id="mermaid-svg_flowchart-v2-pointEnd" class="marker flowchart-v2" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="mermaid-svg_flowchart-v2-pointStart" class="marker flowchart-v2" viewBox="0 0 10 10" refX="4.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 5 L 10 10 L 10 0 z" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="mermaid-svg_flowchart-v2-circleEnd" class="marker flowchart-v2" viewBox="0 0 10 10" refX="11" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><circle cx="5" cy="5" r="5" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="mermaid-svg_flowchart-v2-circleStart" class="marker flowchart-v2" viewBox="0 0 10 10" refX="-1" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><circle cx="5" cy="5" r="5" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="mermaid-svg_flowchart-v2-crossEnd" class="marker cross flowchart-v2" viewBox="0 0 11 11" refX="12" refY="5.2" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M 1,1 l 9,9 M 10,1 l -9,9" class="arrowMarkerPath" style="stroke-width: 2; stroke-dasharray: 1, 0;"/></marker><marker id="mermaid-svg_flowchart-v2-crossStart" class="marker cross flowchart-v2" viewBox="0 0 11 11" refX="-1" refY="5.2" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M 1,1 l 9,9 M 10,1 l -9,9" class="arrowMarkerPath" style="stroke-width: 2; stroke-dasharray: 1, 0;"/></marker><g class="root"><g class="clusters"><g class="cluster " id="数据层" data-look="classic"><rect style="" x="8" y="524" width="384" height="208"/><g class="cluster-label " transform="translate(176, 524)"><foreignObject width="48" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>数据层</p></span></div></foreignObject></g></g><g class="cluster " id="业务逻辑层" data-look="classic"><rect style="" x="74.96875" y="266" width="258.0625" height="208"/><g class="cluster-label " transform="translate(164, 266)"><foreignObject width="80" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>业务逻辑层</p></span></div></foreignObject></g></g><g class="cluster " id="接口层" data-look="classic"><rect style="" x="94.546875" y="8" width="218.90625" height="208"/><g class="cluster-label " transform="translate(180, 8)"><foreignObject width="48" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>接口层</p></span></div></foreignObject></g></g></g><g class="edgePaths"><path d="M204,87L204,91.167C204,95.333,204,103.667,204,111.333C204,119,204,126,204,129.5L204,133" id="L_A_B_0" class=" edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-svg_flowchart-v2-pointEnd)"/><path d="M204,191L204,195.167C204,199.333,204,207.667,204,216C204,224.333,204,232.667,204,241C204,249.333,204,257.667,204,265.333C204,273,204,280,204,283.5L204,287" id="L_B_C_1" class=" edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-svg_flowchart-v2-pointEnd)"/><path d="M204,345L204,349.167C204,353.333,204,361.667,204,369.333C204,377,204,384,204,387.5L204,391" id="L_C_D_2" class=" edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-svg_flowchart-v2-pointEnd)"/><path d="M204,449L204,453.167C204,457.333,204,465.667,204,474C204,482.333,204,490.667,204,499C204,507.333,204,515.667,204,523.333C204,531,204,538,204,541.5L204,545" id="L_D_E_3" class=" edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-svg_flowchart-v2-pointEnd)"/><path d="M156.75,603L149.458,607.167C142.167,611.333,127.583,619.667,120.292,627.333C113,635,113,642,113,645.5L113,649" id="L_E_F_4" class=" edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-svg_flowchart-v2-pointEnd)"/><path d="M251.25,603L258.542,607.167C265.833,611.333,280.417,619.667,287.708,627.333C295,635,295,642,295,645.5L295,649" id="L_E_G_5" class=" edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link" style="" marker-end="url(#mermaid-svg_flowchart-v2-pointEnd)"/></g><g class="edgeLabels"><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "></span></div></foreignObject></g></g><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "></span></div></foreignObject></g></g><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "></span></div></foreignObject></g></g><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "></span></div></foreignObject></g></g><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "></span></div></foreignObject></g></g><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="edgeLabel "></span></div></foreignObject></g></g></g><g class="nodes"><g class="node default  " id="flowchart-A-0" transform="translate(204, 60)"><rect class="basic label-container" style="fill:#f9f !important;stroke:#333 !important" x="-74.453125" y="-27" width="148.90625" height="54"/><g class="label" style="" transform="translate(-44.453125, -12)"><rect/><foreignObject width="88.90625" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>FastAPI路由</p></span></div></foreignObject></g></g><g class="node default  " id="flowchart-B-1" transform="translate(204, 164)"><rect class="basic label-container" style="" x="-70" y="-27" width="140" height="54"/><g class="label" style="" transform="translate(-40, -12)"><rect/><foreignObject width="80" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>请求预处理</p></span></div></foreignObject></g></g><g class="node default  " id="flowchart-C-3" transform="translate(204, 318)"><rect class="basic label-container" style="fill:#bbf !important;stroke:#333 !important" x="-94.03125" y="-27" width="188.0625" height="54"/><g class="label" style="" transform="translate(-64.03125, -12)"><rect/><foreignObject width="128.0625" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>LangGraph工作流</p></span></div></foreignObject></g></g><g class="node default  " id="flowchart-D-5" transform="translate(204, 422)"><rect class="basic label-container" style="" x="-86" y="-27" width="172" height="54"/><g class="label" style="" transform="translate(-56, -12)"><rect/><foreignObject width="112" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>智能体协作引擎</p></span></div></foreignObject></g></g><g class="node default  " id="flowchart-E-7" transform="translate(204, 576)"><rect class="basic label-container" style="fill:#9f9 !important;stroke:#333 !important" x="-62" y="-27" width="124" height="54"/><g class="label" style="" transform="translate(-32, -12)"><rect/><foreignObject width="64" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>检索模块</p></span></div></foreignObject></g></g><g class="node default  " id="flowchart-F-9" transform="translate(113, 680)"><rect class="basic label-container" style="" x="-70" y="-27" width="140" height="54"/><g class="label" style="" transform="translate(-40, -12)"><rect/><foreignObject width="80" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>向量数据库</p></span></div></foreignObject></g></g><g class="node default  " id="flowchart-G-11" transform="translate(295, 680)"><rect class="basic label-container" style="" x="-62" y="-27" width="124" height="54"/><g class="label" style="" transform="translate(-32, -12)"><rect/><foreignObject width="64" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><span class="nodeLabel "><p>网络爬虫</p></span></div></foreignObject></g></g></g></g></g></svg>

## **5. 核心功能剖析**


### **5.1. 自主研究工作流**

当用户发起一个研究任务时（例如调用 GPTResearcher.run），系统内部会执行一系列精心编排的步骤：



1. **查询分析与规划:** 首先，利用 LLM 理解用户的自然语言查询，将其分解为具体的、可执行的搜索关键词或子问题。这一步是确保后续信息获取相关性的关键。
2. **并行化信息收集:** 系统会异步地向配置好的一个或多个搜索引擎 <sup>2</sup> 发送查询请求，并抓取返回结果中的多个（可能超过 20 个 <sup>1</sup>）网页链接。根据网页类型（静态或动态），调用相应的抓取工具（如 requests 或 selenium/playwright <sup>1</sup>）获取内容。如果用户指定了本地文件，也会在此时进行加载 <sup>1</sup>。采用并行处理能显著缩短数据收集时间。
3. **内容处理与过滤:** 获取原始数据后，需要进行清洗和提炼。这包括从 HTML 中提取正文、去除广告和无关模板内容。然后，可能再次利用 LLM 或其他算法评估内容与初始查询的相关性，过滤掉低质量或不相关的信息。对于过长的文档，会使用如 tiktoken <sup>1</sup> 辅助进行分块或摘要，以适应 LLM 的上下文窗口限制。同时，系统还会处理和筛选相关的图片信息 <sup>1</sup>。
4. **信息综合:** 将经过筛选、处理和可能已初步组织（例如按子主题分类）的信息片段整合起来，构建成一个或多个适合输入给最终 LLM 的提示（Prompt）。
5. **报告生成:** LLM 基于整合后的信息，按照预设的结构和风格要求，生成最终的研究报告。报告中会包含信息的来源或引用。为了生成超过 LLM 单次输出限制的长报告 <sup>1</sup>，系统可能采用分段生成、层级摘要后整合，或利用具有更大上下文窗口的 LLM 等策略。
6. **格式化与导出:** 最后，将 LLM 生成的文本内容，按照用户要求的格式（如 PDF, DOCX, MD, JSON, CSV <sup>1</sup>），使用相应的库（如 Markdown, pypdf <sup>1</sup>）进行转换和保存。


### **5.2. 多代理系统实现 (LangGraph)**

multi_agents 目录 <sup>1</sup> 和对 LangGraph 的使用 <sup>1</sup> 是 GPT-Researcher 实现更复杂研究策略的关键。LangGraph 允许将研究过程定义为一个由节点（代表不同的 AI 代理或工具）和边（代表控制流或数据流）组成的图。

在这种模式下，可以定义多个具有专门职责的代理，例如：



* **Planner Agent:** 负责理解初始查询，规划研究步骤，并决定调用哪些其他代理。
* **Search Query Generator Agent:** 根据 Planner 的指令生成优化的搜索引擎查询语句。
* **Web Scraper Agent:** 执行网页抓取任务。
* **Local File Agent:** 负责加载和处理本地文档。
* **Data Validation/Critique Agent:** 评估获取信息的质量和相关性，可能触发重新搜索或修正。
* **Summarizer Agent:** 对大量文本进行摘要。
* **Report Writer Agent:** 整合所有处理过的信息，撰写最终报告。

使用 LangGraph 相较于简单的线性脚本，其优势在于能够构建更复杂、有状态且具备自我修正能力的研究流程。它支持在图中定义循环（例如，如果初步搜索结果不佳，可以返回重新生成查询并搜索）和条件分支（例如，根据获取数据的类型或质量，决定下一步调用哪个代理）。这种结构对于需要迭代优化、深度探索和适应性调整的复杂研究任务（如“深度研究”<sup>1</sup>）来说，比固定的顺序执行流程更为强大和灵活。


### **5.3. 报告生成与上下文管理**

生成长篇报告 <sup>1</sup> 是 GPT-Researcher 的一个核心特性，这通常需要克服 LLM 的 Token 限制。可能的实现方式包括：



* **分段生成:** 将报告拆分成多个部分（如引言、章节、结论），逐一生成，最后拼接起来。
* **层级摘要:** 先对每个信息来源或子主题进行摘要，然后基于这些摘要生成更高层级的概述或最终报告。
* **利用大窗口模型:** 如果可用且配置允许，直接使用具有更大上下文窗口的 LLM。

在整个研究过程中，保持上下文信息（例如，用户的原始查询、已发现的关键信息、当前的子目标等）至关重要 <sup>1</sup>。这很可能通过 LangChain 提供的 Memory 模块或项目自定义的内存管理机制来实现，确保代理在多步骤流程中不会“忘记”之前的状态和目标。最终，系统能将生成的报告导出为多种常用格式，方便用户使用 <sup>1</sup>。


### **5.4. 处理多样化的数据源 (网络与本地)**

GPT-Researcher 的一个显著优势是其能够整合来自不同渠道的信息。它不仅能通过多种技术（requests, selenium, playwright <sup>1</sup>）抓取和处理实时网络内容 <sup>1</sup>，还能直接读取和分析用户提供的本地文件。支持的文件类型广泛，包括 PDF, 纯文本, CSV, Excel, Markdown, PowerPoint, Word <sup>1</sup>，这得益于项目中包含的相应解析库，如 pypdf, docx2txt, python-pptx, pandas <sup>1</sup>。

这种整合本地文件的能力 <sup>1</sup> 极大地扩展了工具的应用范围。用户可以将内部的、专有的数据（如公司报告、研究数据表格、项目文档）与公开的网络信息相结合，进行“混合研究”<sup>2</sup>。这对于需要结合内部知识库进行分析的企业或学术研究场景尤其有价值，使 GPT-Researcher 比仅依赖网络信息的工具更加全面和实用。


## **6. 主要特性与能力**


### **6.1. 特性概览**

GPT-Researcher 提供了一系列强大的功能，旨在实现高效、深入的自动化研究 <sup>1</sup>：

**主要特性概览表**

<!-- Start of Selection -->
| **特性**               | **描述**                                               | **益处**                             |
|----------------------|------------------------------------------------------|------------------------------------|
| 自主研究               | 自动执行从信息收集到报告生成的完整研究流程。                     | 大幅节省用户时间和精力。                  |
| 长报告生成             | 能够生成超过 2000 词的详细报告。                             | 克服 LLM 的 Token 限制，提供更全面的分析。   |
| 多源聚合               | 从超过 20 个来源收集信息，以提高客观性和全面性。                 | 减少单一来源偏见，提供更可靠的结论。         |
| 多代理系统 (LangGraph) | 利用 LangGraph 构建复杂的、可协作的代理工作流，支持深度研究。       | 实现更深入、更结构化、适应性更强的研究过程。   |
| 本地文档支持           | 可以读取和分析多种格式的本地文件（PDF, Word, PPT, Excel, CSV, MD 等）。 | 允许进行混合研究，整合内部专有数据。         |
| 灵活的 LLM/搜索       | 支持多种 LLM 提供商（OpenAI, Anthropic 等）和搜索引擎（Tavily, Google 等）。 | 用户可以根据需求和成本选择最合适的工具。     |
| 图像处理               | 能够抓取网页中的图片并筛选相关图片包含在报告中。                   | 丰富报告内容，提供视觉辅助信息。             |
| 多格式导出             | 支持将研究报告导出为 PDF, Word, Markdown, JSON, CSV 等多种格式。   | 方便用户在不同场景下使用和分享研究结果。       |
| JavaScript 抓取       | 能够处理和抓取需要执行 JavaScript 的动态网页。                     | 确保能从现代 Web 应用中获取信息。             |
| 上下文记忆             | 在研究过程中保持对任务目标和已收集信息的记忆。                     | 保证研究过程的连贯性和一致性。               |
| 前端选项               | 提供轻量级和生产级的 Web 用户界面。                             | 满足不同用户的交互需求和部署场景。           |
<!-- End of Selection -->



### **6.2. 优势与潜在局限性**

**优势:**



* **自动化效率:** 显著减少手动研究所需的时间和精力。
* **潜在的深度与客观性:** 通过聚合大量来源 <sup>1</sup> 和采用多代理策略 <sup>1</sup>，有潜力提供比简单 LLM 查询更深入、更少偏见的结果。
* **高度灵活性:** 用户可以配置 LLM、搜索引擎 <sup>2</sup>、研究参数，并能处理网络和本地数据 <sup>1</sup>。
* **现代技术栈:** 使用了健壮的框架和库，并内置了可观测性支持 <sup>1</sup>，有利于可靠性和维护。
* **处理复杂数据源:** 能够处理动态网页 <sup>1</sup> 和多种本地文件格式 <sup>1</sup>。

**潜在局限性 (推断):**



* **复杂性:** 对于初学者来说，理解和配置整个系统，特别是多代理工作流，可能具有一定的学习曲线。
* **成本:** 大量依赖 LLM API 调用（用于规划、处理、摘要、生成等环节）可能导致较高的运行成本，尤其是在进行深度研究时。
* **网络抓取的脆弱性:** 网页抓取逻辑容易因目标网站结构变更或反爬虫措施而失效。依赖 Selenium/Playwright <sup>1</sup> 进行 JS 渲染抓取 <sup>1</sup> 虽然强大，但也更消耗资源且可能不稳定。
* **信息质量依赖:** 最终报告的质量仍然高度依赖于搜索引擎返回结果的质量以及 LLM 的综合与生成能力。尽管努力聚合来源，但仍存在 LLM 产生微妙幻觉或误解的风险。实现真正的“无偏见”<sup>1</sup> 是一个持续的挑战。
* **可扩展性:** 同时运行多个复杂的研究任务，特别是涉及大量动态网页抓取的任务，可能需要大量的计算资源（CPU、内存、网络带宽）。

尽管 GPT-Researcher 功能强大，但其有效性与外部服务（LLM API、搜索引擎 API）的可靠性以及其抓取机制的鲁棒性紧密相关。多代理系统和丰富的配置选项在提供强大能力的同时，也带来了更高的复杂性，需要用户投入更多时间学习和理解。因此，在评估其适用性时，需要平衡其强大的功能与潜在的运维挑战和学习成本。


## **7. GPT-Researcher 系统学习路径**

为了系统地学习和掌握 GPT-Researcher 项目，建议遵循以下逐步深入的路径：



* **阶段 1: 环境搭建与基础运行 (入门)**
    1. **克隆仓库:** 从 GitHub 克隆项目代码库 <sup>1</sup>。
    2. **设置环境:** 使用 requirements.txt 或 Poetry <sup>1</sup> 创建并配置 Python 虚拟环境，安装所有依赖项。
    3. **配置密钥:** 复制 .env.example <sup>1</sup> 为 .env 文件，并填入必要的 API 密钥，至少需要一个 LLM 提供商（如 OpenAI）和一个搜索引擎提供商（如 Tavily 或设置 Google API 密钥）的密钥。
    4. **运行示例:** 尝试使用命令行接口 (cli.py <sup>1</sup>) 或项目根目录下的 main.py <sup>1</sup> 脚本运行一个简单的研究任务。检查输出日志和生成的报告文件，初步了解其工作方式。
* **阶段 2: 代码库高层探索 (熟悉架构)**
    1. **浏览目录结构:** 熟悉主要目录的功能，如 gpt_researcher (核心逻辑), backend (API 服务), frontend (用户界面), multi_agents (多代理实现), tests (测试用例) <sup>1</sup>。
    2. **识别配置文件:** 查找可能存在的配置文件，例如用于定义提示、代理行为或模型参数的文件。
    3. **运行测试:** 进入 tests 目录 <sup>1</sup>，尝试运行测试套件。这不仅能验证环境设置是否正确，还能提供各个模块如何被使用的实例。
* **阶段 3: 理解核心研究循环 (单代理流程)**
    1. **追踪执行流:** 从主要的入口点（如 GPTResearcher.run 或 main.py 中的调用）开始，跟踪代码执行。
    2. **理解数据流:** 重点关注查询如何被处理，搜索查询如何生成，网页如何被抓取和解析 (retrievers)，内容如何被处理和摘要 (processors)，以及最终报告如何被综合生成 (report)。对照第 3.4 节的概念数据流图来理解代码逻辑。
* **阶段 4: 模块深入研究 (组件分析)**
    1. **retrievers:** 研究不同的搜索引擎 <sup>2</sup> 和抓取方法（静态/动态 <sup>1</sup>）是如何实现的。分析本地文件加载 <sup>1</sup> 的逻辑。
    2. **processors:** 学习文本如何被清洗、分块 (tiktoken <sup>1</sup>) 以及进行摘要。
    3. **llm:** 查看项目如何与不同的 LLM <sup>2</sup> 进行交互，很可能是通过 LangChain <sup>1</sup> 的抽象层。
    4. **memory:** 探究上下文信息 <sup>1</sup> 是如何在研究步骤之间传递和维护的。
    5. **report:** 分析最终报告是如何根据不同输出格式 <sup>1</sup> 进行结构化和格式化的。
* **阶段 5: 配置与定制化实验 (实践应用)**
    1. **更换模型/引擎:** 尝试修改 .env 文件或相关配置，切换使用不同的 LLM 提供商 <sup>2</sup> 或搜索引擎 <sup>2</sup>。
    2. **调整提示:** 如果项目允许，尝试修改用于生成或摘要的 LLM 提示，观察对结果的影响。
    3. **本地文件研究:** 运行一个使用本地文档 <sup>1</sup> 作为信息源的研究任务。
    4. **体验 API 和前端:** 启动 FastAPI 后端服务 <sup>1</sup>，使用工具（如 Postman 或 curl）调用 API。部署并试用提供的不同前端界面 <sup>1</sup>。
* **阶段 6: 高级主题探索 (多代理与扩展)**
    1. **深入 multi_agents:** 研究 multi_agents 目录 <sup>1</sup> 下的代码，理解 LangGraph <sup>1</sup> 如何定义和执行研究工作流图（langgraph.json <sup>1</sup> 文件可能包含图结构定义）。
    2. **运行多代理任务:** 尝试运行一个配置为使用多代理模式的研究任务，分析其执行流程和代理间的交互日志。
    3. **尝试扩展:** 考虑对项目进行扩展，例如：添加对新类型文档的支持、集成一个新的向量数据库、实现一个新的抓取器、修改多代理工作流，或改进报告的生成逻辑。查阅 CONTRIBUTING.md <sup>1</sup> 了解贡献指南。


## **8. 社区视角与未来展望**

*(注：本节内容基于对开源项目普遍情况的推断，具体信息需通过访问项目 GitHub 仓库的 Issues、Discussions、Pull Requests 以及外部资源来获取。)*


### **8.1. 社区讨论与用例**

要更全面地了解 GPT-Researcher 的实际应用情况和潜在问题，建议：



* **查阅 GitHub Issues 和 Discussions:** 这里通常汇集了用户报告的 Bug、提出的功能建议、遇到的常见问题以及使用技巧的讨论。可以了解社区关注的焦点和项目维护的活跃度。
* **搜索外部资源:** 查找相关的博客文章、技术教程、演示视频或提及/使用 GPT-Researcher 的学术论文。这些资源可以提供更具体的应用案例、与其他工具的比较以及不同场景下的最佳实践。


### **8.2. 潜在发展轨迹**

项目的未来发展方向可以通过以下途径进行推测：



* **分析提交历史与 Pull Requests:** 查看 GitHub 仓库 (<sup>1</sup> URL) 的近期提交记录和开放的 Pull Requests，可以了解当前正在进行的开发工作和即将合并的新功能或修复。
* **寻找官方路线图:** 检查项目的文档 (<sup>2</sup>) 或仓库中是否包含明确的 Roadmap 或 Milestones 文件，这通常会概述未来的开发计划。
* **结合社区反馈和技术趋势:** 根据社区在 Issues/Discussions 中频繁请求的功能，以及 AI 代理领域的普遍发展趋势（例如，更强的工具使用能力、更复杂的代理协作模式、更好的效果评估框架、更友好的图形用户界面等），可以推断项目可能的演进方向。


## **9. 结论**


### **9.1. 核心发现总结**

GPT-Researcher 是一个雄心勃勃的开源项目，致力于通过 AI 自动化研究过程，提供高效、深入且可靠的信息综合能力。其核心成就体现在构建了一个可扩展的框架，该框架巧妙地结合了大型语言模型（LLM）的推理与生成能力、实时网络数据的抓取能力、本地文档的处理能力以及先进的工作流编排机制（特别是引入了 LangGraph 支持的多代理系统 <sup>1</sup>）。

项目的主要优势在于其显著的自动化效率、通过多源聚合 <sup>1</sup> 和深度研究功能 <sup>1</sup> 追求的客观性与全面性、支持多种 LLM 和搜索引擎 <sup>2</sup> 的高度灵活性、以及处理网络和本地混合数据 <sup>1</sup> 的能力。同时，其现代化的技术栈和对可观测性的重视 <sup>1</sup> 为其可靠性和可维护性奠定了基础。

然而，使用者也应意识到潜在的挑战，包括系统配置和理解（尤其是多代理部分）的复杂性、运行成本（LLM API 调用）、对外部服务和网络抓取稳定性的依赖，以及确保最终信息质量和客观性的持续性难题。


### **9.2. 对学习者的最终建议**

对于希望深入学习 AI 代理、多代理协作（特别是 LangGraph 应用）、实用网络抓取技术以及 LLM 集成模式的技术人员而言，GPT-Researcher 提供了一个极佳的学习和实践平台。其代码库结构清晰 <sup>1</sup>，技术选型具有代表性，并且直面了将 AI 应用于复杂现实世界任务（如研究）所带来的挑战。

建议学习者遵循本文提出的系统学习路径，从基础使用入手，逐步深入理解其架构、核心模块和高级功能。通过动手实践、修改配置、尝试扩展，并积极参与项目社区（查阅 Issues、Discussions，甚至贡献代码），可以获得对该项目乃至整个自主 AI 代理领域更深刻的理解。


#### Obras citadas


1. assafelovic/gpt-researcher: LLM based autonomous agent ... - GitHub, fecha de acceso: abril 14, 2025, [https://github.com/assafelovic/gpt-researcher/](https://github.com/assafelovic/gpt-researcher/)
2. GPT Researcher - Official Page, fecha de acceso: abril 14, 2025, [https://gptr.dev/](https://gptr.dev/)



## 补充相关文章

+ [开源的阶段性成长指南](https://nsddd.top/zh/posts/stage-growth-of-open-source/)
+ [一份完整的开源贡献指南（提供给第一次踏入开源伙伴秘籍）](https://nsddd.top/zh/posts/open-source-contribution-guidelines/)
+ [我的实践总结：开源社区的规范设计思路](https://nsddd.top/zh/posts/advanced-githook-design/)
+ [在开源社区中学会如何提问](https://nsddd.top/zh/posts/the-art-of-asking-questions-in-open-source-communities/)